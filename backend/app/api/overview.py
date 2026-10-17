from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/overview", tags=["Overview"])

@router.get("/summary")
def get_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    product: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return AnalyticsService.get_overview_summary(db, start_date, end_date, product)

@router.get("/trends")
def get_trends(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    product: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return AnalyticsService.get_monthly_trends(db, start_date, end_date, product)

@router.get("/categories")
def get_categories(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    return AnalyticsService.get_category_breakdowns(db, start_date, end_date)
