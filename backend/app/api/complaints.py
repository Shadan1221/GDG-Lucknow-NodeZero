from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import Complaint, User, Department, SatisfactionReport, EscalationLog
from app.schemas.schemas import (
    ComplaintResponse, 
    IngestVoiceRequest, 
    ComplaintUpdate, 
    SatisfactionReportBase, 
    SatisfactionReportResponse,
    TranscribeRequest
)
from app.agents.orchestrator import run_agentic_pipeline, generate_vernacular_notifications, run_sla_check
from app.services.gemini_service import analyze_feedback_sentiment, transcribe_audio

router = APIRouter(prefix="/complaints", tags=["Complaints & Routing"])

@router.post("/ingest", response_model=dict)
def ingest_complaint(payload: IngestVoiceRequest, db: Session = Depends(get_db)):
    """
    Ingests audio, text, or image evidence, executes the multi-agent logic,
    and returns the processed ticket along with vernacular notification updates.
    """
    try:
        complaint = run_agentic_pipeline(
            db=db,
            audio_base64=payload.audio_base64,
            text_content=payload.text_content,
            image_base64=payload.image_base64,
            latitude=payload.latitude,
            longitude=payload.longitude,
            address=payload.address,
            citizen_username=payload.citizen_username
        )
        
        # Load user and department names
        citizen = db.query(User).filter(User.id == complaint.citizen_id).first()
        dept = db.query(Department).filter(Department.id == complaint.assigned_department_id).first()
        
        citizen_name = citizen.username if citizen else payload.citizen_username
        dept_name = dept.name if dept else "General Administration"
        
        notifications = generate_vernacular_notifications(complaint, citizen_name, dept_name)
        
        # Reload complaint with relationships
        full_complaint = db.query(Complaint).options(
            joinedload(Complaint.assigned_department),
            joinedload(Complaint.assigned_officer)
        ).filter(Complaint.id == complaint.id).first()
        
        return {
            "success": True,
            "complaint": ComplaintResponse.model_validate(full_complaint),
            "notifications": notifications
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline processing failed: {str(e)}"
        )

@router.post("/transcribe", response_model=dict)
def transcribe_audio_endpoint(payload: TranscribeRequest):
    """
    Standalone transcription endpoint to transcribe base64 voice recording 
    and return the text.
    """
    try:
        text = transcribe_audio(payload.audio_base64)
        return {"success": True, "transcript": text}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )

@router.get("", response_model=List[ComplaintResponse])
def get_complaints(
    status: Optional[str] = None,
    category: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    citizen_username: Optional[str] = None,
    officer_username: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetches list of complaints with filtering options."""
    query = db.query(Complaint).options(
        joinedload(Complaint.assigned_department),
        joinedload(Complaint.assigned_officer)
    )
    
    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Complaint.category == category)
    if is_duplicate is not None:
        query = query.filter(Complaint.is_duplicate == is_duplicate)
        
    if citizen_username:
        query = query.join(Complaint.citizen).filter(User.username == citizen_username)
    if officer_username:
        query = query.join(Complaint.assigned_officer).filter(User.username == officer_username)
        
    # Order by newest first
    return query.order_by(Complaint.created_at.desc()).all()

@router.get("/heatmap", response_model=List[dict])
def get_heatmap_data(db: Session = Depends(get_db)):
    """Returns coordinates and categories for heatmaps, filtering out duplicates."""
    complaints = db.query(Complaint).filter(
        Complaint.latitude.isnot(None),
        Complaint.longitude.isnot(None),
        Complaint.is_duplicate == False
    ).all()
    
    return [
        {
            "id": c.id,
            "tracking_id": c.tracking_id,
            "title": c.title,
            "category": c.category,
            "severity": c.severity,
            "status": c.status,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "address": c.address
        }
        for c in complaints
    ]

@router.get("/{id}", response_model=ComplaintResponse)
def get_complaint_by_id(id: int, db: Session = Depends(get_db)):
    """Fetches a specific complaint details."""
    complaint = db.query(Complaint).options(
        joinedload(Complaint.assigned_department),
        joinedload(Complaint.assigned_officer)
    ).filter(Complaint.id == id).first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@router.patch("/{id}", response_model=ComplaintResponse)
def update_complaint_status(id: int, updates: ComplaintUpdate, db: Session = Depends(get_db)):
    """Updates complaint status, categories, or assignments manually (Officer/Admin controls)."""
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(complaint, key, value)
        
    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)
    
    # Reload relationships
    full_complaint = db.query(Complaint).options(
        joinedload(Complaint.assigned_department),
        joinedload(Complaint.assigned_officer)
    ).filter(Complaint.id == id).first()
    
    return full_complaint

@router.post("/{id}/resolve", response_model=ComplaintResponse)
def resolve_complaint(id: int, db: Session = Depends(get_db)):
    """Marks a complaint resolved."""
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    complaint.status = "resolved"
    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)
    
    full_complaint = db.query(Complaint).options(
        joinedload(Complaint.assigned_department),
        joinedload(Complaint.assigned_officer)
    ).filter(Complaint.id == id).first()
    
    return full_complaint

@router.post("/{id}/feedback", response_model=SatisfactionReportResponse)
def submit_feedback(id: int, payload: SatisfactionReportBase, db: Session = Depends(get_db)):
    """Submits feedback, automatically computes a sentiment score, and closes ticket."""
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    try:
        sentiment = analyze_feedback_sentiment(payload.feedback, payload.citizen_rating)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Sentiment analysis failed: {str(e)}"
        )
        
    report = SatisfactionReport(
        complaint_id=id,
        citizen_rating=payload.citizen_rating,
        feedback=payload.feedback,
        sentiment_score=sentiment
    )
    db.add(report)
    
    # Close complaint ticket
    complaint.status = "closed"
    complaint.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(report)
    return report

@router.post("/check-sla", response_model=dict)
def trigger_sla_check(db: Session = Depends(get_db)):
    """Manually checks and executes SLA escalations for complaints past deadlines."""
    escalated = run_sla_check(db)
    return {
        "checked": True,
        "escalated_count": len(escalated),
        "escalated_tracking_ids": [c.tracking_id for c in escalated]
    }
