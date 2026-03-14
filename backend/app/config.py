from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    mongo_url: str = "mongodb://localhost:27017/axiom"
    jwt_secret: str = "change_me_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    anthropic_api_key: str = ""
    frontend_url: str = "http://localhost:5173"
    admin_username: str = "hiipraise"
    admin_email: str = "info.praisechined@gmail.com"
    admin_password: str = "password123"

    class Config:
        env_file = ".env"


settings = Settings()
