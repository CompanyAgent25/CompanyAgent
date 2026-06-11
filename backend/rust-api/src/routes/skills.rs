use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{CreateSkillRequest, Skill, UpdateSkillRequest};
use crate::{AppState, Result};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/skills", get(list_skills).post(create_skill))
        .route(
            "/api/v1/skills/:id",
            get(get_skill).put(update_skill).delete(delete_skill),
        )
}

async fn list_skills(auth: AuthUser, State(state): State<AppState>) -> Result<Json<Vec<Skill>>> {
    let skills =
        sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE team_id = $1 ORDER BY name")
            .bind(auth.claims.team_id)
            .fetch_all(&state.db)
            .await?;

    Ok(Json(skills))
}

async fn get_skill(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Skill>> {
    let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1 AND team_id = $2")
        .bind(id)
        .bind(auth.claims.team_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    Ok(Json(skill))
}

async fn create_skill(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<CreateSkillRequest>,
) -> Result<Json<Skill>> {
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    if !["python", "http", "mcp_tool"].contains(&req.handler_type.as_str()) {
        return Err(AppError::BadRequest(
            "handler_type must be 'python', 'http', or 'mcp_tool'".to_string(),
        ));
    }

    let version = req.version.unwrap_or_else(|| "1.0.0".to_string());
    let output_schema = req.output_schema.unwrap_or_else(|| serde_json::json!({}));

    let skill = sqlx::query_as::<_, Skill>(
        "INSERT INTO skills (team_id, name, slug, description, version, input_schema, output_schema, handler_type, handler_config, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *"
    )
    .bind(auth.claims.team_id)
    .bind(&req.name)
    .bind(&req.slug)
    .bind(&req.description)
    .bind(&version)
    .bind(&req.input_schema)
    .bind(&output_schema)
    .bind(&req.handler_type)
    .bind(&req.handler_config)
    .bind(auth.claims.sub)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(skill))
}

async fn update_skill(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSkillRequest>,
) -> Result<Json<Skill>> {
    let existing =
        sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1 AND team_id = $2")
            .bind(id)
            .bind(auth.claims.team_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let input_schema = req.input_schema.unwrap_or(existing.input_schema);
    let output_schema = req.output_schema.unwrap_or(existing.output_schema);
    let handler_config = req.handler_config.unwrap_or(existing.handler_config);
    let is_active = req.is_active.unwrap_or(existing.is_active);

    let skill = sqlx::query_as::<_, Skill>(
        "UPDATE skills SET name=$1, description=$2, input_schema=$3, output_schema=$4, handler_config=$5, is_active=$6
         WHERE id = $7 RETURNING *"
    )
    .bind(&name)
    .bind(&description)
    .bind(&input_schema)
    .bind(&output_schema)
    .bind(&handler_config)
    .bind(is_active)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(skill))
}

async fn delete_skill(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query("DELETE FROM skills WHERE id = $1 AND team_id = $2")
        .bind(id)
        .bind(auth.claims.team_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Skill not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}
