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
        f"नमस्ते {username}! आपकी शिकायत JanSeva AI द्वारा दर्ज कर ली गई है।\n"
        f"📍 ट्रैकिंग आईडी: {tracking_id}\n"
        f"🏢 विभाग: {dept_name}\n"
        f"🕒 समाधान सीमा (SLA): {sla_hours} घंटे\n"
        f"शीघ्र ही आपको अपडेट भेजा जाएगा।"
    )
    
    awadhi_msg = (
        f"राम राम {username}! तोहार शिकायत JanSeva AI मा दर्ज होइ गइ है।\n"
        f"📍 रसीद नंबर (ID): {tracking_id}\n"
        f"🏢 विभाग: {dept_name}\n"
        f"🕒 समय सीमा: {sla_hours} घंटा मा निवारण होइ\n"
        f"परेशान न हो, काम जल्दी शुरू होइ।"
    )
    
    tamil_msg = (
        f"வணக்கம் {username}! உங்கள் புகார் JanSeva AI மூலம் வெற்றிகரமாக பதிவு செய்யப்பட்டுள்ளது.\n"
        f"📍 கண்காணிப்பு ஐடி: {tracking_id}\n"
        f"🏢 துறை: {dept_name}\n"
        f"🕒 தீர்வு நேரம் (SLA): {sla_hours} மணிநேரம்\n"
        f"விரைவில் நடவடிக்கை எடுக்கப்படும்."
    )
    
    telugu_msg = (
        f"నమస్కారం {username}! మీ ఫిర్యాదు JanSeva AI ద్వారా విజయవంతంగా నమోదు చేయబడింది.\n"
        f"📍 ట్రాకింగ్ ఐడి: {tracking_id}\n"
        f"🏢 విభాగం: {dept_name}\n"
        f"🕒 గడువు సమయం (SLA): {sla_hours} గంటలు\n"
        f"త్వరలోనే తదుపరి అప్‌డేట్ అందుతుంది."
    )
    
    kannada_msg = (
        f"ನಮಸ್ಕಾರ {username}! ನಿಮ್ಮ ದೂರನ್ನು JanSeva AI ಮೂಲಕ ದಾಖಲಿಸಲಾಗಿದೆ.\n"
        f"📍 ಟ್ರ್ಯಾಕಿಂಗ್ ಐಡಿ: {tracking_id}\n"
        f"🏢 ಇಲಾಖೆ: {dept_name}\n"
        f"🕒 ಪರಿಹಾರ ಅವಧಿ (SLA): {sla_hours} ಗಂಟೆಗಳು\n"
        f"ಶೀಘ್ರದಲ್ಲೇ ಕ್ರಮ ಕೈಗೊಳ್ಳಲಾಗುವುದು."
    )
    
    marathi_msg = (
        f"नमस्कार {username}! तुमची तक्रार JanSeva AI द्वारे नोंदवली गेली आहे.\n"
        f"📍 ट्रॅकिंग आयडी: {tracking_id}\n"
        f"🏢 विभाग: {dept_name}\n"
        f"🕒 निवारण वेळ (SLA): {sla_hours} तास\n"
        f"लवकरच पुढील माहिती पाठवली जाईल."
    )
    
    gujarati_msg = (
        f"નમસ્તે {username}! તમારી ફરિયાદ JanSeva AI દ્વારા નોંધવામાં આવી છે.\n"
        f"📍 ટ્રેકિંગ આઈડી: {tracking_id}\n"
        f"🏢 વિભાગ: {dept_name}\n"
        f"🕒 નિરાકરણ સમય (SLA): {sla_hours} કલાક\n"
        f"ટૂંક સમયમાં તમને અપડેટ મળશે."
    )
    
    bengali_msg = (
        f"নমস্কার {username}! আপনার অভিযোগটি JanSeva AI দ্বারা নথিভুক্ত করা হয়েছে।\n"
        f"📍 ট্র্যাকিং আইডি: {tracking_id}\n"
        f"🏢 বিভাগ: {dept_name}\n"
        f"🕒 সমাধানের সময়সীমা (SLA): {sla_hours} ঘণ্টা\n"
        f"শীঘ্রই ব্যবস্থা নেওয়া হবে।"
    )
    
    punjabi_msg = (
        f"ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {username}! ਤੁਹਾਡੀ ਸ਼ਿਕਾਇਤ JanSeva AI ਦੁਆਰਾ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ।\n"
        f"📍 ਟ੍ਰੈਕਿੰਗ ਆਈਡੀ: {tracking_id}\n"
        f"🏢 ਵਿਭਾਗ: {dept_name}\n"
        f"🕒 ਹੱll ਕਰਨ ਦਾ ਸਮਾਂ (SLA): {sla_hours} ਘੰਟੇ\n"
        f"ਜਲਦੀ ਹੀ ਕਾਰਵਾਈ ਕੀਤੀ ਜਾਵੇਗੀ।"
    )
    
    malayalam_msg = (
        f"നമസ്കാരം {username}! നിങ്ങളുടെ പരാതി JanSeva AI വിജയകരമായി രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട്.\n"
        f"📍 ട്രാക്കിംഗ് ഐഡി: {tracking_id}\n"
        f"🏢 വകുപ്പ്: {dept_name}\n"
        f"🕒 സമയപരിധി (SLA): {sla_hours} മണിക്കൂർ\n"
        f"വിവരങ്ങൾ ഉടൻ അറിയിക്കുന്നതാണ്."
    )
    
    english_msg = (
        f"Hello {username}! Your complaint has been successfully registered by JanSeva AI.\n"
        f"📍 Tracking ID: {tracking_id}\n"
        f"🏢 Department: {dept_name}\n"
        f"🕒 Resolution SLA: {sla_hours} hours\n"
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
