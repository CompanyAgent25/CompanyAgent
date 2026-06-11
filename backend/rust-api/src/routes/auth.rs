use axum::{extract::State, routing::post, Json, Router};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
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
    let team_slug = slug::slugify(&req.team_name);

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
