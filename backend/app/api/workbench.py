from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.workbench_service import WorkbenchService

router = APIRouter(prefix="/workbench", tags=["SQL Workbench"])

class QueryExecutionRequest(BaseModel):
    sql: str
    row_limit: int = 500

@router.get("/schema")
def get_workbench_schema():
    """Returns database schema metadata, documentation, and preloaded sample queries."""
    return WorkbenchService.get_schema_metadata()

@router.post("/execute")
def execute_sql(req: QueryExecutionRequest, db: Session = Depends(get_db)):
    """Executes a validated read-only SELECT query within a controlled environment."""
    try:
        return WorkbenchService.execute_query(db, req.sql, req.row_limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database execution error: {str(e)}")
