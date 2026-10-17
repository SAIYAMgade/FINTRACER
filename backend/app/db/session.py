from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

Base = declarative_base()

def create_app_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False})

    connect_args = {}
    if "postgresql" in db_url:
        connect_args["connect_timeout"] = 3

    try:
        eng = create_engine(
            db_url,
            connect_args=connect_args,
            pool_pre_ping=True,
            echo=False
        )
        # Eagerly test connectivity to catch unreachable hosts (e.g. localhost on Render)
        with eng.connect() as conn:
            logger.info("Successfully connected to primary database.")
        return eng
    except Exception as e:
        logger.warning(
            f"Could not connect to database ({e}). "
            f"Falling back to local SQLite database (sqlite:///./fintracer.db)."
        )
        return create_engine("sqlite:///./fintracer.db", connect_args={"check_same_thread": False})

engine = create_app_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
