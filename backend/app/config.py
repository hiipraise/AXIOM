import secrets
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List


class Settings(BaseSettings):
    env: str = "development"
    mongo_url: str = "mongodb://localhost:27017/axiom"

    # Generates a secure random secret if none is provided.
    # In production, JWT_SECRET must always be set explicitly via env —
    # the generated fallback is ephemeral (lost on restart, breaking all sessions).
    jwt_secret: str = Field(default_factory=lambda: secrets.token_hex(32))

    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    groq_api_key: str = ""
    groq_model: str
    frontend_url: str = "http://localhost:5173"
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    rapidapi_key: str = ""
    rapidapi_host: str = ""
    axiom_auto_approve_recruiters: bool = True
    jitsi_domain: str = "meet.jit.si"

    allowed_origins: str = "http://localhost:5173"

    admin_username: str = ""
    admin_email: str = ""
    admin_password: str = ""

    class Config:
        env_file = ".env"

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"

    @property
    def origins_list(self) -> List[str]:
        raw = self.allowed_origins.strip()
        if not raw or raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def credentials_allowed(self) -> bool:
        return self.origins_list != ["*"]


settings = Settings()