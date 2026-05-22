from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "citizen"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    department_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class DepartmentResponse(DepartmentBase):
    id: int

    class Config:
        from_attributes = True

# Complaint Schemas
class ComplaintBase(BaseModel):
    title: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    citizen_username: Optional[str] = None  # To map to user or defaults

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    assigned_department_id: Optional[int] = None
    is_duplicate: Optional[bool] = None
    master_ticket_id: Optional[int] = None

class EscalationLogResponse(BaseModel):
    id: int
    complaint_id: int
    previous_officer_id: Optional[int] = None
    escalated_to_officer_id: int
    reason: str
    escalated_at: datetime

    class Config:
        from_attributes = True

class SatisfactionReportBase(BaseModel):
    complaint_id: int
    citizen_rating: int
    feedback: Optional[str] = None

class SatisfactionReportResponse(SatisfactionReportBase):
    id: int
    sentiment_score: Optional[float] = None
    analyzed_at: datetime

    class Config:
        from_attributes = True

class ComplaintResponse(ComplaintBase):
    id: int
    tracking_id: str
    citizen_id: Optional[int] = None
    category: Optional[str] = None
    severity: str
    status: str
    assigned_officer_id: Optional[int] = None
    assigned_department_id: Optional[int] = None
    is_duplicate: bool
    master_ticket_id: Optional[int] = None
    fraud_score: float
    is_emergency: bool
    detected_language: Optional[str] = "English"
    sla_hours: int
    sla_deadline: Optional[datetime] = None
    escalation_level: int
    created_at: datetime
    updated_at: datetime
    
    # Nested relationships if loaded
    assigned_department: Optional[DepartmentResponse] = None
    assigned_officer: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# Simulation voice/text payload
class IngestVoiceRequest(BaseModel):
    audio_base64: Optional[str] = None  # Base64 string for voice file
    text_content: Optional[str] = None  # Text if typed
    citizen_username: str = "qambar"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    image_base64: Optional[str] = None  # Evidence image

class TranscribeRequest(BaseModel):
    audio_base64: str
