use axum::{extract::State, routing::post, Json, Router};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use serde_json::json;
use sqlx::{Postgres, Transaction};
use uuid::Uuid;
use validator::Validate;

use crate::errors::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::{AuthResponse, Claims, LoginRequest, RegisterRequest, UserPublic};
use crate::{AppState, Result};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/auth/register", post(register))
        .route("/api/v1/auth/login", post(login))
        .route("/api/v1/auth/me", post(me))
}

async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>> {
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    // Check if email exists
    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE email = $1")
        .bind(&req.email)
        .fetch_one(&state.db)
        .await?;

    if existing > 0 {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    let password_hash = bcrypt::hash(&req.password, state.config.bcrypt_cost)
        .map_err(|e| AppError::Internal(format!("Hash error: {}", e)))?;

    let team_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let base_slug = match slug::slugify(&req.team_name) {
        value if value.is_empty() => "workspace".to_string(),
        value => value,
    };
    let slug_seed = Uuid::new_v4().to_string();
    let team_slug = format!("{}-{}", base_slug, &slug_seed[..8]);

    let mut tx = state.db.begin().await?;

    sqlx::query("INSERT INTO teams (id, name, slug) VALUES ($1, $2, $3)")
        .bind(team_id)
        .bind(&req.team_name)
        .bind(&team_slug)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "INSERT INTO users (id, team_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5, 'owner')"
    )
        .bind(user_id)
        .bind(team_id)
        .bind(&req.email)
        .bind(&password_hash)
        .bind(&req.name)
        .execute(&mut *tx)
        .await?;

    seed_starter_workspace(&mut tx, team_id, user_id).await?;

    tx.commit().await?;

    let token = generate_token(&state, user_id, team_id, "owner")?;

    Ok(Json(AuthResponse {
        token,
        user: UserPublic {
            id: user_id,
            team_id,
            email: req.email,
            name: req.name,
            role: "owner".to_string(),
            avatar_url: None,
        },
    }))
}

async fn seed_starter_workspace(
    tx: &mut Transaction<'_, Postgres>,
    team_id: Uuid,
    user_id: Uuid,
) -> Result<()> {
    let research_agent_id = Uuid::new_v4();
    let code_agent_id = Uuid::new_v4();
    let operator_agent_id = Uuid::new_v4();
    let web_skill_id = Uuid::new_v4();
    let sql_skill_id = Uuid::new_v4();
    let file_skill_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO agents (id, team_id, name, slug, description, system_prompt, model, execution_mode, created_by)
         VALUES
         ($1, $2, 'Research Assistant', 'research-assistant',
          'Summarizes information, compares sources, and prepares decision-ready briefs.',
          'You are a research assistant. Give clear, sourced, uncertainty-aware answers. If a fact is unknown, say what is missing before suggesting next steps.',
          'provider-default', 'chat', $3),
         ($4, $2, 'Code Reviewer', 'code-reviewer',
          'Reviews code for correctness, security, maintainability, and release risk.',
          'You are a senior code reviewer. Prioritize concrete bugs, security issues, regressions, and missing tests. Be direct and actionable.',
          'provider-default', 'chat', $3),
         ($5, $2, 'Workflow Operator', 'workflow-operator',
          'Plans and executes structured multi-step business or engineering workflows.',
          'You are a workflow operator. Break work into clear steps, validate assumptions, and report progress with concise status updates.',
          'provider-default', 'autonomous', $3)",
    )
    .bind(research_agent_id)
    .bind(team_id)
    .bind(user_id)
    .bind(code_agent_id)
    .bind(operator_agent_id)
    .execute(&mut **tx)
    .await?;

    sqlx::query(
        "INSERT INTO skills (id, team_id, name, slug, description, input_schema, output_schema, handler_type, handler_config, is_active, created_by)
         VALUES
         ($1, $2, 'Web Search Template', 'web-search',
          'Template for connecting a controlled web search provider.',
          $3, $4, 'http', $5, false, $6),
         ($7, $2, 'SQL Query Template', 'sql-query',
          'Template for connecting approved read-only database queries.',
          $8, $9, 'http', $10, false, $6),
         ($11, $2, 'File Reader Template', 'file-reader',
          'Template for connecting a controlled document reader.',
          $12, $13, 'http', $14, false, $6)",
    )
    .bind(web_skill_id)
    .bind(team_id)
    .bind(json!({
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "max_results": {"type": "integer", "default": 5}
        },
        "required": ["query"]
    }))
    .bind(json!({
        "type": "object",
        "properties": {
            "results": {"type": "array"}
        }
    }))
    .bind(json!({
        "method": "POST",
        "url": "https://replace-with-search-endpoint.example.com/search"
    }))
    .bind(user_id)
    .bind(sql_skill_id)
    .bind(json!({
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "database": {"type": "string"}
        },
        "required": ["query", "database"]
    }))
    .bind(json!({
        "type": "object",
        "properties": {
            "columns": {"type": "array"},
            "rows": {"type": "array"},
            "row_count": {"type": "integer"}
        }
    }))
    .bind(json!({
        "method": "POST",
        "url": "https://replace-with-sql-gateway.example.com/query"
    }))
    .bind(file_skill_id)
    .bind(json!({
        "type": "object",
        "properties": {
            "path": {"type": "string"},
            "format": {"type": "string", "enum": ["auto", "pdf", "docx", "csv", "json", "text"]}
        },
        "required": ["path"]
    }))
    .bind(json!({
        "type": "object",
        "properties": {
            "content": {"type": "string"},
            "metadata": {"type": "object"}
        }
    }))
    .bind(json!({
        "method": "POST",
        "url": "https://replace-with-file-reader.example.com/read"
    }))
    .execute(&mut **tx)
    .await?;

    sqlx::query(
        "INSERT INTO agent_skills (agent_id, skill_id, priority)
         VALUES
         ($1, $2, 1),
         ($1, $3, 2),
         ($4, $3, 1),
         ($5, $2, 1),
         ($5, $6, 2),
         ($5, $3, 3)",
    )
    .bind(research_agent_id)
    .bind(web_skill_id)
    .bind(file_skill_id)
    .bind(code_agent_id)
    .bind(operator_agent_id)
    .bind(sql_skill_id)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>> {
    req.validate()
        .map_err(|e| AppError::BadRequest(format!("Validation error: {}", e)))?;

    let user = sqlx::query_as::<_, crate::models::User>(
        "SELECT * FROM users WHERE email = $1 AND is_active = true",
    )
    .bind(&req.email)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?;

    let valid = bcrypt::verify(&req.password, &user.password_hash)
        .map_err(|e| AppError::Internal(format!("Verify error: {}", e)))?;

    if !valid {
        return Err(AppError::Unauthorized(
            "Invalid email or password".to_string(),
        ));
    }

    // Update last login
    sqlx::query("UPDATE users SET last_login_at = NOW() WHERE id = $1")
        .bind(user.id)
        .execute(&state.db)
        .await?;

    let token = generate_token(&state, user.id, user.team_id, &user.role)?;

    Ok(Json(AuthResponse {
        token,
        user: UserPublic::from(user),
    }))
}

async fn me(auth: AuthUser, State(state): State<AppState>) -> Result<Json<UserPublic>> {
    let user = sqlx::query_as::<_, crate::models::User>("SELECT * FROM users WHERE id = $1")
        .bind(auth.claims.sub)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(Json(UserPublic::from(user)))
}

fn generate_token(state: &AppState, user_id: Uuid, team_id: Uuid, role: &str) -> Result<String> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        team_id,
        role: role.to_string(),
        iat: now.timestamp(),
        exp: (now + chrono::Duration::hours(state.config.jwt_expiration_hours)).timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Token generation failed: {}", e)))
}
