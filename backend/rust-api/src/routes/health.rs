use axum::{extract::State, routing::get, Json, Router};
use serde_json::{json, Value};

use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health", get(health_detailed))
}

async fn health_check() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn health_detailed(State(state): State<AppState>) -> Json<Value> {
    let db_ok = sqlx::query("SELECT 1").execute(&state.db).await.is_ok();

    let redis_ok = redis::cmd("PING")
        .query_async::<String>(&mut state.redis.clone())
        .await
        .is_ok();

    let status = if db_ok && redis_ok {
        "healthy"
    } else {
        "degraded"
    };

    Json(json!({
        "status": status,
        "services": {
            "database": if db_ok { "up" } else { "down" },
            "redis": if redis_ok { "up" } else { "down" }
        },
        "version": env!("CARGO_PKG_VERSION")
    }))
}
