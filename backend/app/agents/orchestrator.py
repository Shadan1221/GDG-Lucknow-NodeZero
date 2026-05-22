from datetime import datetime, timedelta
import random
import string
import logging
from sqlalchemy.orm import Session
from app.models.models import Complaint, User, Department, EscalationLog
from app.services.gemini_service import process_complaint_text, transcribe_audio, analyze_evidence_image

logger = logging.getLogger(__name__)

def generate_tracking_id() -> str:
    """Generates a tracking ID like UP-2026-AB123"""
    chars = "".join(random.choices(string.ascii_uppercase, k=2))
    nums = "".join(random.choices(string.digits, k=3))
    return f"UP-2026-{chars}{nums}"

def calculate_similarity(text1: str, text2: str) -> float:
    """
    Computes simple keyword Jaccard overlap similarity for complaint text.
    In a full production build, this would call Gemini Embeddings and store in Qdrant.
    This works reliably and quickly for a local database.
    """
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    if not union:
        return 0.0
    return len(intersection) / len(union)

def run_agentic_pipeline(
    db: Session,
    audio_base64: str = None,
    text_content: str = None,
    image_base64: str = None,
    latitude: float = None,
    longitude: float = None,
    address: str = None,
    citizen_username: str = "qambar"
) -> Complaint:
    """
    Runs the multi-agent grievance resolution pipeline:
    1. INTAKE AGENT: Resolves transcription and image evidence.
    2. CLASSIFICATION AGENT: Categories, translates, assigns priority.
    3. DEDUPLICATION AGENT: Scans database for matching locations and text.
    4. ROUTING AGENT: Allocates target department, assigns officer, sets SLA.
    5. CITIZEN NOTIFIER AGENT: Returns localized greetings.
    """
    logger.info("Starting agentic pipeline processing...")
    
    # 1. Intake Agent
    raw_text = text_content or ""
    if audio_base64 and not raw_text:
        logger.info("Transcribing audio payload...")
        raw_text = transcribe_audio(audio_base64)
        
    if not raw_text:
        raw_text = "No description provided."
        
    severity_score = 0.0
    damage_desc = ""
    if image_base64:
        logger.info("Analyzing image evidence...")
        img_analysis = analyze_evidence_image(image_base64)
        severity_score = img_analysis.get("severity_score", 0.5)
        damage_desc = img_analysis.get("damage_description", "")
        
    # 2. Classification Agent
    logger.info("Classifying complaint...")
    ai_info = process_complaint_text(raw_text)
    
    # Merge vision severity
    if severity_score > 0.8:
        ai_info["severity"] = "High"
        if severity_score > 0.95:
            ai_info["severity"] = "Emergency"
            ai_info["is_emergency"] = True

    # 3. Deduplication Agent
    logger.info("Running duplicate check...")
    is_duplicate = False
    master_ticket_id = None
    
    # Fetch recent complaints (last 30 days) to compare
    recent_complaints = db.query(Complaint).filter(
        Complaint.is_duplicate == False,
        Complaint.category == ai_info["category"]
    ).all()
    
    for old_comp in recent_complaints:
        # Check text similarity
        txt_sim = calculate_similarity(raw_text, old_comp.description)
        
        # Check location proximity (if both have GPS coords)
        loc_match = False
        if latitude and longitude and old_comp.latitude and old_comp.longitude:
            dist = ((latitude - old_comp.latitude)**2 + (longitude - old_comp.longitude)**2)**0.5
            if dist < 0.005:  # ~500 meters
                loc_match = True
                
        # If highly similar text, or medium similar + exact same location: mark duplicate
        if txt_sim > 0.65 or (txt_sim > 0.35 and loc_match):
            is_duplicate = True
            master_ticket_id = old_comp.id
            break

    # Resolve Citizen User
    citizen = db.query(User).filter(User.username == citizen_username).first()
    citizen_id = citizen.id if citizen else None

    # 4. Routing Agent
    logger.info("Routing to department and officer...")
    dept = db.query(Department).filter(Department.code == ai_info["category"]).first()
    
    assigned_officer_id = None
    assigned_department_id = None
    
    if dept:
        assigned_department_id = dept.id
        # Find first officer in this department
        officer = db.query(User).filter(
            User.role == "officer",
            User.department_id == dept.id
        ).first()
        if officer:
            assigned_officer_id = officer.id
            
    # Calculate SLA deadline
    sla_hours = 72
    if ai_info["severity"] == "Emergency":
        sla_hours = 4
    elif ai_info["severity"] == "High":
        sla_hours = 24
    elif ai_info["severity"] == "Low":
        sla_hours = 120
        
    deadline = datetime.utcnow() + timedelta(hours=sla_hours)

    # 5. Create Complaint Ticket
    tracking_id = generate_tracking_id()
    
    complaint = Complaint(
        tracking_id=tracking_id,
        citizen_id=citizen_id,
        title=ai_info["title"],
        description=raw_text,
        category=ai_info["category"],
        severity=ai_info["severity"],
        status="routed" if assigned_officer_id else "submitted",
        latitude=latitude,
        longitude=longitude,
        address=address,
        audio_url=None, # In simulation, we store raw or mock URL
        image_url=damage_desc if damage_desc else None, # Store visual assessment notes in image_url for mock
        assigned_officer_id=assigned_officer_id,
        assigned_department_id=assigned_department_id,
        is_duplicate=is_duplicate,
        master_ticket_id=master_ticket_id,
        fraud_score=0.0,
        is_emergency=ai_info["is_emergency"],
        detected_language=ai_info.get("detected_language", "English"),
        sla_hours=sla_hours,
        sla_deadline=deadline
    )
    
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    
    logger.info(f"Complaint {tracking_id} successfully created and processed.")
    return complaint

def generate_vernacular_notifications(complaint: Complaint, username: str, dept_name: str) -> dict:
    """Generates localized updates for WhatsApp alerts in 10 major Indian languages"""
    tracking_id = complaint.tracking_id
    sla_hours = complaint.sla_hours
    
    hindi_msg = (
        f"à¤¨à¤®à¤¸à¥à¤¤à¥‡ {username}! à¤†à¤ªà¤•à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ Awaaz-e-Awadh à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¦à¤°à¥à¤œ à¤•à¤° à¤²à¥€ à¤—à¤ˆ à¤¹à¥ˆà¥¤\n"
        f"ðŸ“ à¤Ÿà¥à¤°à¥ˆà¤•à¤¿à¤‚à¤— à¤†à¤ˆà¤¡à¥€: {tracking_id}\n"
        f"ðŸ¢ à¤µà¤¿à¤­à¤¾à¤—: {dept_name}\n"
        f"ðŸ•’ à¤¸à¤®à¤¾à¤§à¤¾à¤¨ à¤¸à¥€à¤®à¤¾ (SLA): {sla_hours} à¤˜à¤‚à¤Ÿà¥‡\n"
        f"à¤¶à¥€à¤˜à¥à¤° à¤¹à¥€ à¤†à¤ªà¤•à¥‹ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤­à¥‡à¤œà¤¾ à¤œà¤¾à¤à¤—à¤¾à¥¤"
    )
    
    awadhi_msg = (
        f"à¤°à¤¾à¤® à¤°à¤¾à¤® {username}! à¤¤à¥‹à¤¹à¤¾à¤° à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ Awaaz-e-Awadh à¤®à¤¾ à¤¦à¤°à¥à¤œ à¤¹à¥‹à¤‡ à¤—à¤‡ à¤¹à¥ˆà¥¤\n"
        f"ðŸ“ à¤°à¤¸à¥€à¤¦ à¤¨à¤‚à¤¬à¤° (ID): {tracking_id}\n"
        f"ðŸ¢ à¤µà¤¿à¤­à¤¾à¤—: {dept_name}\n"
        f"ðŸ•’ à¤¸à¤®à¤¯ à¤¸à¥€à¤®à¤¾: {sla_hours} à¤˜à¤‚à¤Ÿà¤¾ à¤®à¤¾ à¤¨à¤¿à¤µà¤¾à¤°à¤£ à¤¹à¥‹à¤‡\n"
        f"à¤ªà¤°à¥‡à¤¶à¤¾à¤¨ à¤¨ à¤¹à¥‹, à¤•à¤¾à¤® à¤œà¤²à¥à¤¦à¥€ à¤¶à¥à¤°à¥‚ à¤¹à¥‹à¤‡à¥¤"
    )
    
    tamil_msg = (
        f"à®µà®£à®•à¯à®•à®®à¯ {username}! à®‰à®™à¯à®•à®³à¯ à®ªà¯à®•à®¾à®°à¯ Awaaz-e-Awadh à®®à¯‚à®²à®®à¯ à®µà¯†à®±à¯à®±à®¿à®•à®°à®®à®¾à®• à®ªà®¤à®¿à®µà¯ à®šà¯†à®¯à¯à®¯à®ªà¯à®ªà®Ÿà¯à®Ÿà¯à®³à¯à®³à®¤à¯.\n"
        f"ðŸ“ à®•à®£à¯à®•à®¾à®£à®¿à®ªà¯à®ªà¯ à®à®Ÿà®¿: {tracking_id}\n"
        f"ðŸ¢ à®¤à¯à®±à¯ˆ: {dept_name}\n"
        f"ðŸ•’ à®¤à¯€à®°à¯à®µà¯ à®¨à¯‡à®°à®®à¯ (SLA): {sla_hours} à®®à®£à®¿à®¨à¯‡à®°à®®à¯\n"
        f"à®µà®¿à®°à¯ˆà®µà®¿à®²à¯ à®¨à®Ÿà®µà®Ÿà®¿à®•à¯à®•à¯ˆ à®Žà®Ÿà¯à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®®à¯."
    )
    
    telugu_msg = (
        f"à°¨à°®à°¸à±à°•à°¾à°°à°‚ {username}! à°®à±€ à°«à°¿à°°à±à°¯à°¾à°¦à± Awaaz-e-Awadh à°¦à±à°µà°¾à°°à°¾ à°µà°¿à°œà°¯à°µà°‚à°¤à°‚à°—à°¾ à°¨à°®à±‹à°¦à± à°šà±‡à°¯à°¬à°¡à°¿à°‚à°¦à°¿.\n"
        f"ðŸ“ à°Ÿà±à°°à°¾à°•à°¿à°‚à°—à± à°à°¡à°¿: {tracking_id}\n"
        f"ðŸ¢ à°µà°¿à°­à°¾à°—à°‚: {dept_name}\n"
        f"ðŸ•’ à°—à°¡à±à°µà± à°¸à°®à°¯à°‚ (SLA): {sla_hours} à°—à°‚à°Ÿà°²à±\n"
        f"à°¤à±à°µà°°à°²à±‹à°¨à±‡ à°¤à°¦à±à°ªà°°à°¿ à°…à°ªà±â€Œà°¡à±‡à°Ÿà± à°…à°‚à°¦à±à°¤à±à°‚à°¦à°¿."
    )
    
    kannada_msg = (
        f"à²¨à²®à²¸à³à²•à²¾à²° {username}! à²¨à²¿à²®à³à²® à²¦à³‚à²°à²¨à³à²¨à³ Awaaz-e-Awadh à²®à³‚à²²à²• à²¦à²¾à²–à²²à²¿à²¸à²²à²¾à²—à²¿à²¦à³†.\n"
        f"ðŸ“ à²Ÿà³à²°à³à²¯à²¾à²•à²¿à²‚à²—à³ à²à²¡à²¿: {tracking_id}\n"
        f"ðŸ¢ à²‡à²²à²¾à²–à³†: {dept_name}\n"
        f"ðŸ•’ à²ªà²°à²¿à²¹à²¾à²° à²…à²µà²§à²¿ (SLA): {sla_hours} à²—à²‚à²Ÿà³†à²—à²³à³\n"
        f"à²¶à³€à²˜à³à²°à²¦à²²à³à²²à³‡ à²•à³à²°à²® à²•à³ˆà²—à³Šà²³à³à²³à²²à²¾à²—à³à²µà³à²¦à³."
    )
    
    marathi_msg = (
        f"à¤¨à¤®à¤¸à¥à¤•à¤¾à¤° {username}! à¤¤à¥à¤®à¤šà¥€ à¤¤à¤•à¥à¤°à¤¾à¤° Awaaz-e-Awadh à¤¦à¥à¤µà¤¾à¤°à¥‡ à¤¨à¥‹à¤‚à¤¦à¤µà¤²à¥€ à¤—à¥‡à¤²à¥€ à¤†à¤¹à¥‡.\n"
        f"ðŸ“ à¤Ÿà¥à¤°à¥…à¤•à¤¿à¤‚à¤— à¤†à¤¯à¤¡à¥€: {tracking_id}\n"
        f"ðŸ¢ à¤µà¤¿à¤­à¤¾à¤—: {dept_name}\n"
        f"ðŸ•’ à¤¨à¤¿à¤µà¤¾à¤°à¤£ à¤µà¥‡à¤³ (SLA): {sla_hours} à¤¤à¤¾à¤¸\n"
        f"à¤²à¤µà¤•à¤°à¤š à¤ªà¥à¤¢à¥€à¤² à¤®à¤¾à¤¹à¤¿à¤¤à¥€ à¤ªà¤¾à¤ à¤µà¤²à¥€ à¤œà¤¾à¤ˆà¤²."
    )
    
    gujarati_msg = (
        f"àª¨àª®àª¸à«àª¤à«‡ {username}! àª¤àª®àª¾àª°à«€ àª«àª°àª¿àª¯àª¾àª¦ Awaaz-e-Awadh àª¦à«àªµàª¾àª°àª¾ àª¨à«‹àª‚àª§àªµàª¾àª®àª¾àª‚ àª†àªµà«€ àª›à«‡.\n"
        f"ðŸ“ àªŸà«àª°à«‡àª•àª¿àª‚àª— àª†àªˆàª¡à«€: {tracking_id}\n"
        f"ðŸ¢ àªµàª¿àª­àª¾àª—: {dept_name}\n"
        f"ðŸ•’ àª¨àª¿àª°àª¾àª•àª°àª£ àª¸àª®àª¯ (SLA): {sla_hours} àª•àª²àª¾àª•\n"
        f"àªŸà«‚àª‚àª• àª¸àª®àª¯àª®àª¾àª‚ àª¤àª®àª¨à«‡ àª…àªªàª¡à«‡àªŸ àª®àª³àª¶à«‡."
    )
    
    bengali_msg = (
        f"à¦¨à¦®à¦¸à§à¦•à¦¾à¦° {username}! à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦­à¦¿à¦¯à§‹à¦—à¦Ÿà¦¿ Awaaz-e-Awadh à¦¦à§à¦¬à¦¾à¦°à¦¾ à¦¨à¦¥à¦¿à¦­à§à¦•à§à¦¤ à¦•à¦°à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤\n"
        f"ðŸ“ à¦Ÿà§à¦°à§à¦¯à¦¾à¦•à¦¿à¦‚ à¦†à¦‡à¦¡à¦¿: {tracking_id}\n"
        f"ðŸ¢ à¦¬à¦¿à¦­à¦¾à¦—: {dept_name}\n"
        f"ðŸ•’ à¦¸à¦®à¦¾à¦§à¦¾à¦¨à§‡à¦° à¦¸à¦®à§Ÿà¦¸à§€à¦®à¦¾ (SLA): {sla_hours} à¦˜à¦£à§à¦Ÿà¦¾\n"
        f"à¦¶à§€à¦˜à§à¦°à¦‡ à¦¬à§à¦¯à¦¬à¦¸à§à¦¥à¦¾ à¦¨à§‡à¦“à§Ÿà¦¾ à¦¹à¦¬à§‡à¥¤"
    )
    
    punjabi_msg = (
        f"à¨¸à¨¤à¨¿ à¨¸à©à¨°à©€ à¨…à¨•à¨¾à¨² {username}! à¨¤à©à¨¹à¨¾à¨¡à©€ à¨¸à¨¼à¨¿à¨•à¨¾à¨‡à¨¤ Awaaz-e-Awadh à¨¦à©à¨†à¨°à¨¾ à¨¦à¨°à¨œ à¨•à¨° à¨²à¨ˆ à¨—à¨ˆ à¨¹à©ˆà¥¤\n"
        f"ðŸ“ à¨Ÿà©à¨°à©ˆà¨•à¨¿à©°à¨— à¨†à¨ˆà¨¡à©€: {tracking_id}\n"
        f"ðŸ¢ à¨µà¨¿à¨­à¨¾à¨—: {dept_name}\n"
        f"ðŸ•’ à¨¹à©±ll à¨•à¨°à¨¨ à¨¦à¨¾ à¨¸à¨®à¨¾à¨‚ (SLA): {sla_hours} à¨˜à©°à¨Ÿà©‡\n"
        f"à¨œà¨²à¨¦à©€ à¨¹à©€ à¨•à¨¾à¨°à¨µà¨¾à¨ˆ à¨•à©€à¨¤à©€ à¨œà¨¾à¨µà©‡à¨—à©€à¥¤"
    )
    
    malayalam_msg = (
        f"à´¨à´®à´¸àµà´•à´¾à´°à´‚ {username}! à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´ªà´°à´¾à´¤à´¿ Awaaz-e-Awadh à´µà´¿à´œà´¯à´•à´°à´®à´¾à´¯à´¿ à´°à´œà´¿à´¸àµà´±àµà´±àµ¼ à´šàµ†à´¯àµà´¤à´¿à´Ÿàµà´Ÿàµà´£àµà´Ÿàµ.\n"
        f"ðŸ“ à´Ÿàµà´°à´¾à´•àµà´•à´¿à´‚à´—àµ à´à´¡à´¿: {tracking_id}\n"
        f"ðŸ¢ à´µà´•àµà´ªàµà´ªàµ: {dept_name}\n"
        f"ðŸ•’ à´¸à´®à´¯à´ªà´°à´¿à´§à´¿ (SLA): {sla_hours} à´®à´£à´¿à´•àµà´•àµ‚àµ¼\n"
        f"à´µà´¿à´µà´°à´™àµà´™àµ¾ à´‰à´Ÿàµ» à´…à´±à´¿à´¯à´¿à´•àµà´•àµà´¨àµà´¨à´¤à´¾à´£àµ."
    )
    
    english_msg = (
        f"Hello {username}! Your complaint has been successfully registered by Awaaz-e-Awadh.\n"
        f"ðŸ“ Tracking ID: {tracking_id}\n"
        f"ðŸ¢ Department: {dept_name}\n"
        f"ðŸ•’ Resolution SLA: {sla_hours} hours\n"
        f"You will receive an update shortly."
    )
    
    return {
        "hindi": hindi_msg,
        "awadhi": awadhi_msg,
        "tamil": tamil_msg,
        "telugu": telugu_msg,
        "kannada": kannada_msg,
        "marathi": marathi_msg,
        "gujarati": gujarati_msg,
        "bengali": bengali_msg,
        "punjabi": punjabi_msg,
        "malayalam": malayalam_msg,
        "english": english_msg
    }

def run_sla_check(db: Session) -> list:
    """
    Checks all complaints that are active and have breached their deadline.
    Escalates to Supervisor (Commissioner) on level 0 breach,
    or to State Authority on level 1 breach.
    """
    now = datetime.utcnow()
    breached_complaints = db.query(Complaint).filter(
        Complaint.status.in_(["submitted", "routed", "in_progress"]),
        Complaint.sla_deadline < now,
        Complaint.is_duplicate == False
    ).all()
    
    escalated_tickets = []
    
    for comp in breached_complaints:
        # Find Commissioner
        commissioner = db.query(User).filter(User.role == "supervisor").first()
        if not commissioner:
            continue
            
        old_officer_id = comp.assigned_officer_id
        
        # Determine escalation logic
        if comp.escalation_level == 0:
            comp.escalation_level = 1
            comp.assigned_officer_id = commissioner.id
            comp.status = "escalated"
            
            # Reset SLA deadline with a shorter grace period (e.g. 24 hours)
            comp.sla_deadline = now + timedelta(hours=24)
            
            # Log escalation
            log = EscalationLog(
                complaint_id=comp.id,
                previous_officer_id=old_officer_id,
                escalated_to_officer_id=commissioner.id,
                reason="SLA Breached. Automatically escalated to Municipal Commissioner."
            )
            db.add(log)
            db.commit()
            escalated_tickets.append(comp)
            
        elif comp.escalation_level == 1:
            # Escalated to State Governance / Admin
            admin = db.query(User).filter(User.role == "admin").first()
            if admin:
                comp.escalation_level = 2
                comp.assigned_officer_id = admin.id
                comp.status = "escalated"
                comp.sla_deadline = now + timedelta(hours=12)
                
                log = EscalationLog(
                    complaint_id=comp.id,
                    previous_officer_id=old_officer_id,
                    escalated_to_officer_id=admin.id,
                    reason="SLA level 1 Breached. Escalated to State Governance Directorate."
                )
                db.add(log)
                db.commit()
                escalated_tickets.append(comp)
                
    return escalated_tickets

