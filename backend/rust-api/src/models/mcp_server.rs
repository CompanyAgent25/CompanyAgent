use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct McpServer {
    pub id: Uuid,
    pub team_id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub transport: String,
    pub command: Option<String>,
    pub args: Option<serde_json::Value>,
    pub url: Option<String>,
    pub env_vars: serde_json::Value,
    pub is_active: bool,
    pub health_status: String,
    pub last_health_check: Option<DateTime<Utc>>,
    pub discovered_tools: serde_json::Value,
    pub discovered_resources: serde_json::Value,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateMcpServerRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    #[validate(length(min = 1, max = 100))]
    pub slug: String,
    pub description: Option<String>,
    pub transport: String,
    pub command: Option<String>,
    pub args: Option<serde_json::Value>,
    pub url: Option<String>,
    pub env_vars: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMcpServerRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub command: Option<String>,
    pub args: Option<serde_json::Value>,
    pub url: Option<String>,
    pub env_vars: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}
