use anyhow::Context;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub host: String,
    pub port: u16,
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
    pub bcrypt_cost: u32,
    pub python_service_url: String,
    pub rate_limit_rpm: u64,
    pub rate_limit_burst: u32,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?,
            redis_url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
            host: std::env::var("RUST_API_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: std::env::var("RUST_API_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .context("RUST_API_PORT must be a valid port number")?,
            jwt_secret: std::env::var("JWT_SECRET").context("JWT_SECRET must be set")?,
            jwt_expiration_hours: std::env::var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .context("JWT_EXPIRATION_HOURS must be a valid integer")?,
            bcrypt_cost: std::env::var("BCRYPT_COST")
                .unwrap_or_else(|_| "12".to_string())
                .parse()
                .context("BCRYPT_COST must be a valid integer")?,
            python_service_url: std::env::var("PYTHON_SERVICE_URL")
                .unwrap_or_else(|_| "http://python-services:8000".to_string()),
            rate_limit_rpm: std::env::var("RATE_LIMIT_REQUESTS_PER_MINUTE")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .context("RATE_LIMIT_REQUESTS_PER_MINUTE must be valid")?,
            rate_limit_burst: std::env::var("RATE_LIMIT_BURST")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .context("RATE_LIMIT_BURST must be valid")?,
        })
    }
}
