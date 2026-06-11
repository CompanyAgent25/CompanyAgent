use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Agent {
    pub id: Uuid,
    pub team_id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub system_prompt: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: i32,
    pub is_active: bool,
    pub execution_mode: String,
    pub metadata: serde_json::Value,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateAgentRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    #[validate(length(min = 1, max = 100))]
    pub slug: String,
    pub description: Option<String>,
    #[validate(length(min = 1))]
    pub system_prompt: String,
    pub model: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<i32>,
    pub execution_mode: Option<String>,
    pub skill_ids: Option<Vec<Uuid>>,
    pub mcp_server_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateAgentRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: Option<String>,
    pub description: Option<String>,
    pub system_prompt: Option<String>,
    pub model: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<i32>,
    pub is_active: Option<bool>,
    pub execution_mode: Option<String>,
    pub skill_ids: Option<Vec<Uuid>>,
    pub mcp_server_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Serialize)]
pub struct AgentWithRelations {
    #[serde(flatten)]
    pub agent: Agent,
    pub skills: Vec<super::Skill>,
    pub mcp_servers: Vec<super::McpServer>,
}
