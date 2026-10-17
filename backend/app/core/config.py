import os
from pydantic import BaseModel

def get_database_url() -> str:
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres@localhost:5432/resolvex"
    )
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

class Settings(BaseModel):
    APP_NAME: str = "FINTRACER"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = get_database_url()
    SQL_QUERY_TIMEOUT_SECONDS: int = 5
    SQL_MAX_ROWS: int = 500
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

settings = Settings()
