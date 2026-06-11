use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{
    Agent, AgentWithRelations, CreateAgentRequest, McpServer, Skill, UpdateAgentRequest,
};
use crate::{AppState, Result};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/agents", get(list_agents).post(create_agent))
        .route(
            "/api/v1/agents/:id",
            get(get_agent).put(update_agent).delete(delete_agent),
        )
}

#[derive(Debug, Deserialize)]
struct ListQuery {
    is_active: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
}

async fn list_agents(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<Agent>>> {
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);

    let agents = if let Some(active) = query.is_active {
        sqlx::query_as::<_, Agent>(
            "SELECT * FROM agents WHERE team_id = $1 AND is_active = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        )
        .bind(auth.claims.team_id)
        .bind(active)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?
    } else {
        sqlx::query_as::<_, Agent>(
            "SELECT * FROM agents WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(auth.claims.team_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?
    };

    Ok(Json(agents))
}

async fn get_agent(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<AgentWithRelations>> {
    let agent = sqlx::query_as::<_, Agent>("SELECT * FROM agents WHERE id = $1 AND team_id = $2")
        .bind(id)
        .bind(auth.claims.team_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Agent not found".to_string()))?;

    let skills = sqlx::query_as::<_, Skill>(
        "SELECT s.* FROM skills s JOIN agent_skills as2 ON s.id = as2.skill_id WHERE as2.agent_id = $1 ORDER BY as2.priority"
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let mcp_servers = sqlx::query_as::<_, McpServer>(
        "SELECT m.* FROM mcp_servers m JOIN agent_mcp_servers ams ON m.id = ams.mcp_server_id WHERE ams.agent_id = $1"
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(AgentWithRelations {
        agent,
        skills,
        mcp_servers,
    }))
}

async fn create_agent(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<CreateAgentRequest>,
) -> Result<Json<Agent>> {
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Check for duplicate slug
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM agents WHERE team_id = $1 AND slug = $2",
    )
    .bind(auth.claims.team_id)
    .bind(&req.slug)
    .fetch_one(&state.db)
    .await?;

    if existing > 0 {
        return Err(AppError::Conflict(
            "Agent with this slug already exists".to_string(),
        ));
    }

    let model = req
        .model
        .unwrap_or_else(|| "claude-sonnet-4-20250514".to_string());
    let temperature = req.temperature.unwrap_or(0.7);
    let max_tokens = req.max_tokens.unwrap_or(4096);
    let execution_mode = req.execution_mode.unwrap_or_else(|| "chat".to_string());

    if !["chat", "autonomous"].contains(&execution_mode.as_str()) {
        return Err(AppError::BadRequest(
            "execution_mode must be 'chat' or 'autonomous'".to_string(),
        ));
    }

    if !(0.0..=2.0).contains(&temperature) {
        return Err(AppError::BadRequest(
            "temperature must be between 0.0 and 2.0".to_string(),
        ));
    }

    let mut tx = state.db.begin().await?;

    let agent = sqlx::query_as::<_, Agent>(
        "INSERT INTO agents (team_id, name, slug, description, system_prompt, model, temperature, max_tokens, execution_mode, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *"
    )
    .bind(auth.claims.team_id)
    .bind(&req.name)
    .bind(&req.slug)
    .bind(&req.description)
    .bind(&req.system_prompt)
    .bind(&model)
    .bind(temperature)
    .bind(max_tokens)
    .bind(&execution_mode)
    .bind(auth.claims.sub)
    .fetch_one(&mut *tx)
    .await?;

    // Assign skills if provided
    if let Some(skill_ids) = &req.skill_ids {
        for (i, skill_id) in skill_ids.iter().enumerate() {
            sqlx::query(
                "INSERT INTO agent_skills (agent_id, skill_id, priority) VALUES ($1, $2, $3)",
            )
            .bind(agent.id)
            .bind(skill_id)
            .bind(i as i32)
            .execute(&mut *tx)
            .await?;
        }
    }

    // Assign MCP servers if provided
    if let Some(mcp_ids) = &req.mcp_server_ids {
        for mcp_id in mcp_ids {
            sqlx::query("INSERT INTO agent_mcp_servers (agent_id, mcp_server_id) VALUES ($1, $2)")
                .bind(agent.id)
                .bind(mcp_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    tx.commit().await?;

    Ok(Json(agent))
}

async fn update_agent(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAgentRequest>,
) -> Result<Json<Agent>> {
    // Verify agent belongs to team
    let existing =
        sqlx::query_as::<_, Agent>("SELECT * FROM agents WHERE id = $1 AND team_id = $2")
            .bind(id)
            .bind(auth.claims.team_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Agent not found".to_string()))?;

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let system_prompt = req.system_prompt.unwrap_or(existing.system_prompt);
    let model = req.model.unwrap_or(existing.model);
    let temperature = req.temperature.unwrap_or(existing.temperature);
    let max_tokens = req.max_tokens.unwrap_or(existing.max_tokens);
    let is_active = req.is_active.unwrap_or(existing.is_active);
    let execution_mode = req.execution_mode.unwrap_or(existing.execution_mode);

    let mut tx = state.db.begin().await?;

    let agent = sqlx::query_as::<_, Agent>(
        "UPDATE agents SET name=$1, description=$2, system_prompt=$3, model=$4, temperature=$5, max_tokens=$6, is_active=$7, execution_mode=$8
         WHERE id = $9 RETURNING *"
    )
    .bind(&name)
    .bind(&description)
    .bind(&system_prompt)
    .bind(&model)
    .bind(temperature)
    .bind(max_tokens)
    .bind(is_active)
    .bind(&execution_mode)
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;

    // Update skill assignments if provided
    if let Some(skill_ids) = req.skill_ids {
        sqlx::query("DELETE FROM agent_skills WHERE agent_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        for (i, skill_id) in skill_ids.iter().enumerate() {
            sqlx::query(
                "INSERT INTO agent_skills (agent_id, skill_id, priority) VALUES ($1, $2, $3)",
            )
            .bind(id)
            .bind(skill_id)
            .bind(i as i32)
            .execute(&mut *tx)
            .await?;
        }
    }

    // Update MCP server assignments if provided
    if let Some(mcp_ids) = req.mcp_server_ids {
        sqlx::query("DELETE FROM agent_mcp_servers WHERE agent_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        for mcp_id in mcp_ids {
            sqlx::query("INSERT INTO agent_mcp_servers (agent_id, mcp_server_id) VALUES ($1, $2)")
                .bind(id)
                .bind(mcp_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    tx.commit().await?;

    Ok(Json(agent))
}

async fn delete_agent(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query("DELETE FROM agents WHERE id = $1 AND team_id = $2")
        .bind(id)
        .bind(auth.claims.team_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Agent not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}
