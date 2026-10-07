from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Postgres
    database_url: str = "postgresql+asyncpg://chat:chat@localhost:5432/chat"

    # Redis - used for cross-instance pub/sub and ephemeral presence state
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # WebSocket
    ws_message_rate_limit: int = 30 # max messages per rate_limit_window per connection
    ws_rate_limit_window_seconds: int = 5

    # CORS - the Next.js dev server runs on a different origin, so it needs
    # to be explicitly allowed to call this API from the browser.
    cors_allowed_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
