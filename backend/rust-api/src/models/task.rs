use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Task {
    pub id: Uuid,
    pub team_id: Uuid,
    pub conversation_id: Option<Uuid>,
    pub agent_id: Uuid,
    pub skill_id: Option<Uuid>,
    pub status: String,
    pub input: serde_json::Value,
    pub output: Option<serde_json::Value>,
    pub error: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskRequest {
    pub agent_id: Uuid,
    pub conversation_id: Option<Uuid>,
    pub skill_id: Option<Uuid>,
    pub input: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct TaskListQuery {
    pub status: Option<String>,
    pub agent_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
