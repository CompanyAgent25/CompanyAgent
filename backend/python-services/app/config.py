from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgres://companyagent:companyagent@db:5432/companyagent"
    redis_url: str = "redis://redis:6379"
    anthropic_api_key: str = ""
    llm_provider: str = "anthropic"
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = "claude-sonnet-4-20250514"
    llm_max_tokens: int = 4096
    llm_timeout_seconds: int = 60
    llm_enable_tools: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    rust_api_url: str = "http://rust-api:8080"

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
