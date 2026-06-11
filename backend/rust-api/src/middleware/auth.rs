use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use jsonwebtoken::{decode, DecodingKey, Validation};

use crate::errors::AppError;
use crate::models::Claims;
use crate::AppState;

pub struct AuthUser {
    pub claims: Claims,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".to_string()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("Invalid Authorization format".to_string()))?;

        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|e| AppError::Unauthorized(format!("Invalid token: {}", e)))?;

        Ok(AuthUser {
            claims: token_data.claims,
        })
    }
}

pub fn require_role(user: &AuthUser, roles: &[&str]) -> Result<(), AppError> {
    if roles.contains(&user.claims.role.as_str()) {
        Ok(())
    } else {
        Err(AppError::Forbidden(format!(
            "Requires one of roles: {}",
            roles.join(", ")
        )))
    }
}
