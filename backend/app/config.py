from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    env: str = "development"
    mongo_url: str = "mongodb://localhost:27017/axiom"
    jwt_secret: str = "change_me_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    groq_api_key: str = ""
    frontend_url: str = "http://localhost:5173"

    allowed_origins: str = "http://localhost:5173"

    admin_username: str = ""
    admin_email: str = ""
    admin_password: str = ""

    class Config:
        env_file = ".env"

    @property
    def origins_list(self) -> List[str]:
        """Return parsed list of allowed origins."""
        raw = self.allowed_origins.strip()
        if not raw or raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def credentials_allowed(self) -> bool:
        """allow_credentials must be False when origins is wildcard."""
        return self.origins_list != ["*"]


settings = Settings()