use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::auth::{require_role, AuthUser};
use crate::models::{CreateMcpServerRequest, McpServer, UpdateMcpServerRequest};
use crate::{AppState, Result};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/mcp-servers", get(list_servers).post(create_server))
        .route(
            "/api/v1/mcp-servers/:id",
            get(get_server).put(update_server).delete(delete_server),
        )
        .route("/api/v1/mcp-servers/:id/health", post(check_health))
        .route("/api/v1/mcp-servers/:id/discover", post(discover_tools))
}

async fn list_servers(
    auth: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Vec<McpServer>>> {
    let servers = sqlx::query_as::<_, McpServer>(
        "SELECT * FROM mcp_servers WHERE team_id = $1 ORDER BY name",
    )
    .bind(auth.claims.team_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(servers))
}

async fn get_server(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<McpServer>> {
    let server =
        sqlx::query_as::<_, McpServer>("SELECT * FROM mcp_servers WHERE id = $1 AND team_id = $2")
            .bind(id)
            .bind(auth.claims.team_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("MCP Server not found".to_string()))?;

    Ok(Json(server))
}

async fn create_server(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<CreateMcpServerRequest>,
) -> Result<Json<McpServer>> {
    require_role(&auth, &["owner", "admin"])?;

    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    if !["stdio", "sse"].contains(&req.transport.as_str()) {
        return Err(AppError::BadRequest(
            "transport must be 'stdio' or 'sse'".to_string(),
        ));
    }

    match req.transport.as_str() {
        "stdio" if req.command.is_none() => {
            return Err(AppError::BadRequest(
                "command is required for stdio transport".to_string(),
            ));
        }
        "sse" if req.url.is_none() => {
            return Err(AppError::BadRequest(
                "url is required for sse transport".to_string(),
            ));
        }
        _ => {}
    }

    let env_vars = req.env_vars.unwrap_or_else(|| serde_json::json!({}));

    let server = sqlx::query_as::<_, McpServer>(
        "INSERT INTO mcp_servers (team_id, name, slug, description, transport, command, args, url, env_vars, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *"
    )
    .bind(auth.claims.team_id)
    .bind(&req.name)
    .bind(&req.slug)
    .bind(&req.description)
    .bind(&req.transport)
    .bind(&req.command)
    .bind(&req.args)
    .bind(&req.url)
    .bind(&env_vars)
    .bind(auth.claims.sub)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(server))
}

async fn update_server(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMcpServerRequest>,
) -> Result<Json<McpServer>> {
    require_role(&auth, &["owner", "admin"])?;

    let existing =
        sqlx::query_as::<_, McpServer>("SELECT * FROM mcp_servers WHERE id = $1 AND team_id = $2")
            .bind(id)
            .bind(auth.claims.team_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("MCP Server not found".to_string()))?;

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let command = req.command.or(existing.command);
    let args = req.args.or(existing.args);
    let url = req.url.or(existing.url);
    let env_vars = req.env_vars.unwrap_or(existing.env_vars);
    let is_active = req.is_active.unwrap_or(existing.is_active);

    let server = sqlx::query_as::<_, McpServer>(
        "UPDATE mcp_servers SET name=$1, description=$2, command=$3, args=$4, url=$5, env_vars=$6, is_active=$7
         WHERE id = $8 RETURNING *"
    )
    .bind(&name)
    .bind(&description)
    .bind(&command)
    .bind(&args)
    .bind(&url)
    .bind(&env_vars)
    .bind(is_active)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(server))
}

async fn delete_server(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    require_role(&auth, &["owner", "admin"])?;

    let result = sqlx::query("DELETE FROM mcp_servers WHERE id = $1 AND team_id = $2")
        .bind(id)
        .bind(auth.claims.team_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("MCP Server not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}

async fn check_health(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let server =
        sqlx::query_as::<_, McpServer>("SELECT * FROM mcp_servers WHERE id = $1 AND team_id = $2")
            .bind(id)
            .bind(auth.claims.team_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("MCP Server not found".to_string()))?;

    // Forward health check to Python service
    let client = reqwest::Client::new();
    let resp = client
        .post(format!(
            "{}/api/v1/mcp/health-check",
            state.config.python_service_url
        ))
        .json(&serde_json::json!({
            "server_id": server.id,
            "transport": server.transport,
            "command": server.command,
            "args": server.args,
            "url": server.url,
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Health check failed: {}", e)))?;

    let health_status = if resp.status().is_success() {
        "healthy"
    } else {
        "unhealthy"
    };

    sqlx::query(
        "UPDATE mcp_servers SET health_status = $1, last_health_check = NOW() WHERE id = $2",
    )
    .bind(health_status)
    .bind(id)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({ "status": health_status })))
}

async fn discover_tools(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let server =
        sqlx::query_as::<_, McpServer>("SELECT * FROM mcp_servers WHERE id = $1 AND team_id = $2")
            .bind(id)
            .bind(auth.claims.team_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("MCP Server not found".to_string()))?;

    let client = reqwest::Client::new();
    let resp = client
        .post(format!(
            "{}/api/v1/mcp/discover",
            state.config.python_service_url
        ))
        .json(&serde_json::json!({
            "server_id": server.id,
            "transport": server.transport,
            "command": server.command,
            "args": server.args,
            "url": server.url,
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Discovery failed: {}", e)))?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Parse error: {}", e)))?;

    let tools = body
        .get("tools")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));
    let resources = body
        .get("resources")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));

    sqlx::query(
        "UPDATE mcp_servers SET discovered_tools = $1, discovered_resources = $2 WHERE id = $3",
    )
    .bind(&tools)
    .bind(&resources)
    .bind(id)
    .execute(&state.db)
    .await?;

    Ok(Json(
        serde_json::json!({ "tools": tools, "resources": resources }),
    ))
}
