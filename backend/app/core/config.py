import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "RESOLVEX"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    # Use postgresql+psycopg2 for PostgreSQL 18
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://postgres@localhost:5432/resolvex"
    )
    SQL_QUERY_TIMEOUT_SECONDS: int = 5
    SQL_MAX_ROWS: int = 500
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

settings = Settings()
