use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{CreateTaskRequest, Task, TaskListQuery};
use crate::{AppState, Result};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/tasks", get(list_tasks).post(create_task))
        .route("/api/v1/tasks/:id", get(get_task))
        .route("/api/v1/tasks/:id/cancel", post(cancel_task))
}

async fn list_tasks(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(query): Query<TaskListQuery>,
) -> Result<Json<Vec<Task>>> {
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);

    let tasks = match (query.status, query.agent_id) {
        (Some(status), Some(agent_id)) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE team_id = $1 AND status = $2 AND agent_id = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
            )
            .bind(auth.claims.team_id)
            .bind(&status)
            .bind(agent_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?
        }
        (Some(status), None) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE team_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(auth.claims.team_id)
            .bind(&status)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?
        }
        (None, Some(agent_id)) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE team_id = $1 AND agent_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
            )
            .bind(auth.claims.team_id)
            .bind(agent_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?
        }
        (None, None) => {
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
            )
            .bind(auth.claims.team_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?
        }
    };

    Ok(Json(tasks))
}

async fn get_task(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Task>> {
    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = $1 AND team_id = $2")
        .bind(id)
        .bind(auth.claims.team_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    Ok(Json(task))
}

async fn create_task(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<CreateTaskRequest>,
) -> Result<Json<Task>> {
    // Verify agent belongs to team
    let agent_exists =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM agents WHERE id = $1 AND team_id = $2")
            .bind(req.agent_id)
            .bind(auth.claims.team_id)
            .fetch_one(&state.db)
            .await?;

    if agent_exists == 0 {
        return Err(AppError::NotFound("Agent not found".to_string()));
    }

    let task = sqlx::query_as::<_, Task>(
        "INSERT INTO tasks (team_id, agent_id, conversation_id, skill_id, input)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *",
    )
    .bind(auth.claims.team_id)
    .bind(req.agent_id)
    .bind(req.conversation_id)
    .bind(req.skill_id)
    .bind(&req.input)
    .fetch_one(&state.db)
    .await?;

    // Dispatch task to Python service asynchronously
    let python_url = state.config.python_service_url.clone();
    let task_id = task.id;
    let db = state.db.clone();

    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let result = client
            .post(format!("{}/api/v1/execute-task", python_url))
            .json(&serde_json::json!({ "task_id": task_id }))
            .send()
            .await;

        if let Err(e) = result {
            tracing::error!("Failed to dispatch task {}: {}", task_id, e);
            let _ = sqlx::query("UPDATE tasks SET status = 'failed', error = $1 WHERE id = $2")
                .bind(format!("Dispatch failed: {}", e))
                .bind(task_id)
                .execute(&db)
                .await;
        }
    });

    Ok(Json(task))
}

async fn cancel_task(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Task>> {
    let task = sqlx::query_as::<_, Task>(
        "UPDATE tasks SET status = 'cancelled' WHERE id = $1 AND team_id = $2 AND status IN ('pending', 'running') RETURNING *"
    )
    .bind(id)
    .bind(auth.claims.team_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Task not found or not cancellable".to_string()))?;

    Ok(Json(task))
}
