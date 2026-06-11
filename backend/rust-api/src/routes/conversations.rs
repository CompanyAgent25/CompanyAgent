use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{
    Conversation, ConversationListQuery, ConversationWithMessages, CreateConversationRequest,
    Message, SendMessageRequest,
};
use crate::{AppState, Result};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/v1/conversations",
            get(list_conversations).post(create_conversation),
        )
        .route(
            "/api/v1/conversations/:id",
            get(get_conversation).delete(archive_conversation),
        )
        .route(
            "/api/v1/conversations/:id/messages",
            get(get_messages).post(send_message),
        )
}

async fn list_conversations(
    auth: AuthUser,
    State(state): State<AppState>,
    Query(query): Query<ConversationListQuery>,
) -> Result<Json<Vec<Conversation>>> {
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);

    let conversations = sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations WHERE team_id = $1 AND user_id = $2 AND status != 'deleted'
         ORDER BY updated_at DESC LIMIT $3 OFFSET $4",
    )
    .bind(auth.claims.team_id)
    .bind(auth.claims.sub)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(conversations))
}

async fn get_conversation(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ConversationWithMessages>> {
    let conversation = sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations WHERE id = $1 AND team_id = $2 AND user_id = $3",
    )
    .bind(id)
    .bind(auth.claims.team_id)
    .bind(auth.claims.sub)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    let messages = sqlx::query_as::<_, Message>(
        "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(ConversationWithMessages {
        conversation,
        messages,
    }))
}

async fn create_conversation(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<CreateConversationRequest>,
) -> Result<Json<Conversation>> {
    // Verify agent belongs to team
    let agent_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM agents WHERE id = $1 AND team_id = $2 AND is_active = true",
    )
    .bind(req.agent_id)
    .bind(auth.claims.team_id)
    .fetch_one(&state.db)
    .await?;

    if agent_exists == 0 {
        return Err(AppError::NotFound(
            "Agent not found or inactive".to_string(),
        ));
    }

    let conversation = sqlx::query_as::<_, Conversation>(
        "INSERT INTO conversations (team_id, user_id, agent_id, title)
         VALUES ($1, $2, $3, $4)
         RETURNING *",
    )
    .bind(auth.claims.team_id)
    .bind(auth.claims.sub)
    .bind(req.agent_id)
    .bind(&req.title)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(conversation))
}

async fn send_message(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<SendMessageRequest>,
) -> Result<Json<Message>> {
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Verify conversation belongs to user
    let conversation = sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations WHERE id = $1 AND team_id = $2 AND user_id = $3",
    )
    .bind(id)
    .bind(auth.claims.team_id)
    .bind(auth.claims.sub)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    // Save user message
    let user_message = sqlx::query_as::<_, Message>(
        "INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2) RETURNING *",
    )
    .bind(id)
    .bind(&req.content)
    .fetch_one(&state.db)
    .await?;

    // Forward to Python service for LLM processing
    let python_url = state.config.python_service_url.clone();
    let conv_id = id;
    let agent_id = conversation.agent_id;
    let db = state.db.clone();

    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let result = client
            .post(format!("{}/api/v1/chat", python_url))
            .json(&serde_json::json!({
                "conversation_id": conv_id,
                "agent_id": agent_id,
                "message": req.content
            }))
            .send()
            .await;

        match result {
            Ok(resp) => {
                if let Ok(body) = resp.json::<serde_json::Value>().await {
                    if let Some(reply) = body.get("reply").and_then(|r| r.as_str()) {
                        let token_count = body
                            .get("token_count")
                            .and_then(|t| t.as_i64())
                            .map(|t| t as i32);
                        let model_used =
                            body.get("model").and_then(|m| m.as_str()).map(String::from);
                        let _ = sqlx::query(
                            "INSERT INTO messages (conversation_id, role, content, token_count, model_used) VALUES ($1, 'assistant', $2, $3, $4)"
                        )
                        .bind(conv_id)
                        .bind(reply)
                        .bind(token_count)
                        .bind(model_used)
                        .execute(&db)
                        .await;
                    }
                }
            }
            Err(e) => {
                tracing::error!(
                    "Failed to get LLM response for conversation {}: {}",
                    conv_id,
                    e
                );
                let _ = sqlx::query(
                    "INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'system', $2)"
                )
                .bind(conv_id)
                .bind(format!("Error: Failed to process message — {}", e))
                .execute(&db)
                .await;
            }
        }
    });

    Ok(Json(user_message))
}

async fn get_messages(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<Message>>> {
    // Verify access
    let conversation_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM conversations WHERE id = $1 AND team_id = $2 AND user_id = $3",
    )
    .bind(id)
    .bind(auth.claims.team_id)
    .bind(auth.claims.sub)
    .fetch_one(&state.db)
    .await?;

    if conversation_exists == 0 {
        return Err(AppError::NotFound("Conversation not found".to_string()));
    }

    let messages = sqlx::query_as::<_, Message>(
        "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(messages))
}

async fn archive_conversation(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(
        "UPDATE conversations SET status = 'archived' WHERE id = $1 AND team_id = $2 AND user_id = $3"
    )
    .bind(id)
    .bind(auth.claims.team_id)
    .bind(auth.claims.sub)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Conversation not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "archived": true })))
}
