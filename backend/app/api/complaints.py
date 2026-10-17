from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.db.session import get_db
from app.models.entities import Complaint, ComplaintNarrative

router = APIRouter(prefix="/complaints", tags=["Complaints Explorer"])

@router.get("")
def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    product: Optional[str] = Query(None),
    issue: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    has_narrative: Optional[bool] = Query(None),
    sort_by: str = Query("date_received"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Complaint)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Complaint.complaint_id.ilike(search_fmt),
                Complaint.company.ilike(search_fmt),
                Complaint.product.ilike(search_fmt),
                Complaint.issue.ilike(search_fmt),
            )
        )

    if product:
        query = query.filter(Complaint.product == product)
    if issue:
        query = query.filter(Complaint.issue == issue)
    if company:
        query = query.filter(Complaint.company == company)
    if state:
        query = query.filter(Complaint.state == state)
    if has_narrative is not None:
        query = query.filter(Complaint.has_narrative == has_narrative)

    total = query.count()

    # Sorting
    sort_col = getattr(Complaint, sort_by, Complaint.date_received)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    records = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in records:
        items.append({
            "id": r.id,
            "complaint_id": r.complaint_id,
            "date_received": r.date_received.isoformat() if r.date_received else None,
            "product": r.product,
            "sub_product": r.sub_product,
            "issue": r.issue,
            "sub_issue": r.sub_issue,
            "company": r.company,
            "state": r.state,
            "zip_code": r.zip_code,
            "submitted_via": r.submitted_via,
            "company_response_to_consumer": r.company_response_to_consumer,
            "timely_response": r.timely_response,
            "consumer_disputed": r.consumer_disputed,
            "has_narrative": r.has_narrative,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        "items": items,
    }

@router.get("/filters")
def get_filter_options(db: Session = Depends(get_db)):
    products = [p[0] for p in db.query(Complaint.product).distinct().order_by(Complaint.product).all() if p[0]]
    companies = [c[0] for c in db.query(Complaint.company).distinct().order_by(Complaint.company).limit(30).all() if c[0]]
    issues = [i[0] for i in db.query(Complaint.issue).distinct().order_by(Complaint.issue).limit(30).all() if i[0]]
    states = [s[0] for s in db.query(Complaint.state).distinct().order_by(Complaint.state).all() if s[0]]

    return {
        "products": products,
        "companies": companies,
        "issues": issues,
        "states": states,
    }

@router.get("/{complaint_id}")
def get_complaint_detail(complaint_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Look up matched narrative
    narrative = db.query(ComplaintNarrative).filter(
        ComplaintNarrative.complaint_source_id == complaint_id
    ).first()

    return {
        "complaint": {
            "id": c.id,
            "complaint_id": c.complaint_id,
            "date_received": c.date_received.isoformat() if c.date_received else None,
            "product": c.product,
            "sub_product": c.sub_product,
            "issue": c.issue,
            "sub_issue": c.sub_issue,
            "company": c.company,
            "state": c.state,
            "zip_code": c.zip_code,
            "submitted_via": c.submitted_via,
            "date_sent_to_company": c.date_sent_to_company.isoformat() if c.date_sent_to_company else None,
            "company_response_to_consumer": c.company_response_to_consumer,
            "timely_response": c.timely_response,
            "consumer_disputed": c.consumer_disputed,
            "tags": c.tags,
            "has_narrative": c.has_narrative,
        },
        "narrative": {
            "available": narrative is not None,
            "text": narrative.narrative_text if narrative else None,
            "word_count": narrative.word_count if narrative else None,
            "text_hash": narrative.text_hash if narrative else None,
            "message": "Matched historical narrative retrieved." if narrative else "No matching narrative available in the imported archive."
        }
    }
