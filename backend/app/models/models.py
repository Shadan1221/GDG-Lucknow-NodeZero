from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="citizen")  # citizen, officer, supervisor, counsellor, admin, state_authority
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    department = relationship("Department", foreign_keys=[department_id], back_populates="officers")
    complaints_filed = relationship("Complaint", foreign_keys="Complaint.citizen_id", back_populates="citizen")
    complaints_assigned = relationship("Complaint", foreign_keys="Complaint.assigned_officer_id", back_populates="assigned_officer")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., "Roads & Highways", "Water Supply"
    code = Column(String, unique=True, nullable=False)  # e.g., "ROADS", "WATER"
    description = Column(String, nullable=True)
    
    # Relationships
    officers = relationship("User", foreign_keys=[User.department_id], back_populates="department")
    complaints = relationship("Complaint", back_populates="assigned_department")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String, unique=True, index=True, nullable=False)  # e.g., UP-2026-XXXXX
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=True)  # Roads, Water, Electricity, Waste, Health, Corruption, Encroachment, etc.
    severity = Column(String, default="Medium")  # Low, Medium, High, Emergency
    status = Column(String, default="submitted")  # submitted, routed, in_progress, resolved, closed, escalated
    
    # Geo Data
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    
    # Media
    audio_url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    
    # Assignment
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # AI Rules / Deduplication
    is_duplicate = Column(Boolean, default=False)
    master_ticket_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    fraud_score = Column(Float, default=0.0)  # 0.0 to 1.0 (suspect bot / spam)
    is_emergency = Column(Boolean, default=False)
    detected_language = Column(String, default="English", nullable=True)
    
    # SLA Trackers
    sla_hours = Column(Integer, default=72)
    sla_deadline = Column(DateTime, nullable=True)
    escalation_level = Column(Integer, default=0) # 0 = normal officer, 1 = supervisor, 2 = state authority
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    citizen = relationship("User", foreign_keys=[citizen_id], back_populates="complaints_filed")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id], back_populates="complaints_assigned")
    assigned_department = relationship("Department", foreign_keys=[assigned_department_id], back_populates="complaints")
    
    escalation_logs = relationship("EscalationLog", back_populates="complaint")
    satisfaction_reports = relationship("SatisfactionReport", back_populates="complaint")

class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    previous_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    escalated_to_officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String, nullable=False)
    escalated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="escalation_logs")

class SatisfactionReport(Base):
    __tablename__ = "satisfaction_reports"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    citizen_rating = Column(Integer, nullable=False)  # 1 to 5 stars
    feedback = Column(Text, nullable=True)
    sentiment_score = Column(Float, nullable=True)  # -1.0 to 1.0
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="satisfaction_reports")
