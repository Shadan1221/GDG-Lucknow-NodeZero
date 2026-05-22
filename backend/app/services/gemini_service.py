import google.generativeai as genai
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    # Use gemini-1.5-flash or gemini-2.0-flash-exp
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None
    logger.warning("GEMINI_API_KEY not configured. Running in Mock/Simulation Mode.")

def detect_language_by_script(text: str) -> str:
    """
    Detects language based on Unicode characters for regional Indian scripts,
    falling back to transliterated word checks.
    """
    for char in text:
        cp = ord(char)
        if 0x0B80 <= cp <= 0x0BFF:
            return "Tamil"
        elif 0x0C00 <= cp <= 0x0C7F:
            return "Telugu"
        elif 0x0C80 <= cp <= 0x0CFF:
            return "Kannada"
        elif 0x0D00 <= cp <= 0x0D7F:
            return "Malayalam"
        elif 0x0980 <= cp <= 0x09FF:
            return "Bengali"
        elif 0x0A80 <= cp <= 0x0AFF:
            return "Gujarati"
        elif 0x0A00 <= cp <= 0x0A7F:
            return "Punjabi"
        elif 0x0900 <= cp <= 0x097F:
            # Devnagari shares Hindi, Awadhi, Marathi. Distinguish with typical words.
            text_lower = text.lower()
            if any(w in text_lower for w in ["तोहार", "मोरे", "होइगई", "भैया", "राम राम", "दीन", "जल्दी"]):
                return "Awadhi"
            if any(w in text_lower for w in ["आहे", "नाही", "करून", "झाले", "तक्रार", "कृपया"]):
                return "Marathi"
            return "Hindi"

    # Transliterated / Latin alphabet checks
    text_lower = text.lower()
    if any(w in text_lower for w in ["paani", "sadak", "bijli", "gaddhe", "bhaisaab", "krpya", "gaddha"]):
        return "Hindi"
    if any(w in text_lower for w in ["tohar", "hoigai", "mor", "bhaiya"]):
        return "Awadhi"
    if any(w in text_lower for w in ["ahe", "nahi", "zale", "mazya", "karava"]):
        return "Marathi"
    if any(w in text_lower for w in ["thanni", "kuppai", "valhi", "irukku", "pannunga"]):
        return "Tamil"
    if any(w in text_lower for w in ["neeru", "dhaari", "kuppa", "idhe", "cheyandi"]):
        return "Telugu"
    if any(w in text_lower for w in ["neeru", "rasthe", "kasa", "ide", "madi"]):
        return "Kannada"
    if any(w in text_lower for w in ["jol", "rasta", "nongra", "ache", "karun"]):
        return "Bengali"
    if any(w in text_lower for w in ["paani", "sadak", "bijli"]):
        return "Hindi"
    
    return "English"

def process_complaint_text(text: str) -> dict:
    """
    Processes the raw grievance text (either entered or transcribed) to extract:
    - title (English summarizing title)
    - category (WATER, ROADS, SAN, ELEC, CORR, ENC)
    - severity (Low, Medium, High, Emergency)
    - is_emergency (boolean)
    - translated_text (English translation of description)
    - detected_language (e.g. Hindi, Awadhi, Tamil, Telugu, Kannada, Marathi, Gujarati, Bengali, Punjabi, Malayalam, English)
    - key_keywords (list of strings)
    """
    # If Gemini is configured, use it
    if model:
        try:
            prompt = f"""
            Analyze the following Indian public grievance text (which could be in any major Indian language like Hindi, Awadhi, Tamil, Telugu, Kannada, Marathi, Gujarati, Bengali, Punjabi, Malayalam, etc. or English).
            Extract the following structured details in valid JSON format. Do not return any other text, just JSON.
            
            Fields required:
            1. "title": A short 5-8 word descriptive English title.
            2. "category": Strictly one of these codes: "WATER" (water/sewage/drainage), "ROADS" (roads/civil/streetlights), "SAN" (sanitation/garbage/cleaning), "ELEC" (electricity/meter/transformer), "CORR" (corruption/bribe/officer misconduct), "ENC" (illegal construction/encroachment/land dispute).
            3. "severity": One of: "Low", "Medium", "High", "Emergency".
            4. "is_emergency": Boolean (true if there's active danger to life, fire, live wire hazards, toxic leaks, etc.)
            5. "translated_text": A clear English translation of the complaint description.
            6. "detected_language": The name of the detected language (e.g., "Hindi", "Awadhi", "Tamil", "Telugu", "Kannada", "Marathi", "Gujarati", "Bengali", "Punjabi", "Malayalam", "English").
            7. "key_keywords": List of 3-5 key search keywords.

            Grievance Text: "{text}"
            
            JSON Output:
            """
            
            response = model.generate_content(prompt)
            # Try parsing the JSON
            cleaned_response = response.text.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response.split("```")[1].split("```")[0].strip()
                
            data = json.loads(cleaned_response)
            return data
        except Exception as e:
            logger.error(f"Gemini processing error: {e}. Falling back to Rule-based Classifier.")

    # Rule-Based / Keyword Fallback Engine (Robust Simulation)
    text_lower = text.lower()
    detected_lang = detect_language_by_script(text)
    
    # Default outputs
    category = "ROADS"
    severity = "Medium"
    is_emergency = False
    title = "Public Infrastructure Grievance"
    translated_text = text  # fallback to same
    
    # Category detection
    if any(k in text_lower for k in ["paani", "water", "leak", "sewage", "drain", "nal", "pipe", "nadi", "shauchalay", "toilet", "neeru", "thanni", "jol"]):
        category = "WATER"
        title = "Water Supply / Sewage Grievance"
    elif any(k in text_lower for k in ["sadak", "road", "pothole", "gaddha", "street light", "streetlight", "pavement", "pathway", "rasthe", "roadu", "rasta"]):
        category = "ROADS"
        title = "Road Quality / Light Grievance"
    elif any(k in text_lower for k in ["kachra", "garbage", "clean", "safai", "kuda", "sweep", "nadi safai", "dustbin", "kuppai", "kasa", "nongra"]):
        category = "SAN"
        title = "Sanitation & Garbage Cleaning Request"
    elif any(k in text_lower for k in ["bijli", "electricity", "power", "light cut", "meter", "wire", "transformer", "voltage"]):
        category = "ELEC"
        title = "Electricity Power Issues"
    elif any(k in text_lower for k in ["bribe", "rishwat", "corruption", "officer", "money", "vibhag", "corruption", "ghoos"]):
        category = "CORR"
        title = "Corruption & Official Misconduct Complaint"
    elif any(k in text_lower for k in ["encroachment", "kabza", "illegal", "shop", "footpath", "park kabza"]):
        category = "ENC"
        title = "Public Land Encroachment"

    # Emergency Detection
    if any(k in text_lower for k in ["emergency", "fire", "aag", "accident", "current", "jan khatra", "falling", "collapse", "hazard", "current wire"]):
        severity = "Emergency"
        is_emergency = True
        title = "EMERGENCY: " + title

    # High severity indicators
    elif any(k in text_lower for k in ["urgent", "jaldi", "bad", "dangerous", "flooding", "powerless", "darkness", "illness", "disease"]):
        severity = "High"
    elif any(k in text_lower for k in ["delay", "broken", "complaint", "dirt", "smell"]):
        severity = "Medium"
    else:
        severity = "Low"

    # Simulated English Translation for major languages
    translations = {
        # Hindi/Awadhi
        "paani nahi aa raha": "Water is not coming to our ward.",
        "sadak par gaddhe hai": "There are deep potholes on the main road.",
        "bijli ka transformer kharab hai": "The electricity transformer is broken and sparking.",
        "safai nahi ho rahi hai": "No waste cleaning is happening in our colony.",
        "rashan ke liye rishwat mang rahe": "Ration officers are demanding bribes.",
        "sadak par dukan walo ne kabza kiya": "Shopkeepers have illegally encroached on the footpath.",
        # Tamil
        "தண்ணீர் குழாய் உடைந்து": "The water supply pipe is broken.",
        "ரோடு மீது பெரிய பள்ளம்": "There is a very large pothole on the road.",
        "மின்சாரம் துண்டிக்கப்பட்டுள்ளது": "The electricity power supply is disconnected.",
        "குப்பை கொட்டப்பட்டுள்ளது": "Garbage has been dumped in our locality.",
        # Telugu
        "నీటి సరఫరా నిలిచిపోయింది": "Drinking water supply has been stopped.",
        "రోడ్డు బాగోలేదు": "Road condition is extremely poor.",
        "విద్యుత్ సరఫరా లేదు": "There is no electricity power supply.",
        # Kannada
        "ನೀರು ಬರ್ತಿಲ್ಲ": "Water supply is not coming.",
        "ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿಗಳು": "There are major potholes on the road.",
        # Marathi
        "पाणी येत नाही": "Drinking water is not coming.",
        "रस्त्यावर खड्डे आहेत": "There are deep potholes on the road.",
        "कचरा साचला आहे": "Garbage pile has accumulated on the street.",
        # Bengali
        "জল আসছে না": "Water is not coming.",
        "রাস্তায় গর্ত": "There are potholes on the road.",
        "আবর্জনা জমে রয়েছে": "Garbage has accumulated in the street."
    }
    
    for key, val in translations.items():
        if key in text:
            translated_text = val
            break
            
    keywords = [k for k in ["water", "road", "garbage", "electricity", "corruption", "encroachment"] if k in title.lower()]
    if not keywords:
        keywords = ["grievance", "lucknow"]

    return {
        "title": title,
        "category": category,
        "severity": severity,
        "is_emergency": is_emergency,
        "translated_text": translated_text,
        "detected_language": detected_lang,
        "key_keywords": keywords
    }

def transcribe_audio(audio_base64: str) -> str:
    """
    Transcribes audio using Gemini 1.5/2.0 voice capability if configured,
    or falls back to size-based mock outputs.
    """
    if model:
        try:
            import base64
            audio_bytes = base64.b64decode(audio_base64)
            mime_type = "audio/webm"  # default standard browser audio recording mime type
            
            # Check if it starts with data URL scheme
            if audio_base64.startswith("data:"):
                try:
                    header, base64_data = audio_base64.split(",", 1)
                    mime_type = header.split(";")[0].split(":")[1]
                    audio_bytes = base64.b64decode(base64_data)
                except Exception:
                    pass
                    
            contents = [
                {
                    "mime_type": mime_type,
                    "data": audio_bytes
                },
                "Please transcribe this spoken Indian voice recording. The speaker might be speaking in Hindi, Awadhi, Tamil, Telugu, Marathi, Gujarati, Bengali, Punjabi, Malayalam, or English. "
                "Output only the original transcript in the spoken language. Do not translate it. Keep the words and script exactly as spoken. "
                "Return only the transcript text and nothing else."
            ]
            response = model.generate_content(contents)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini voice transcription error: {e}. Falling back to mock transcription.")

    # Local fallback based on size
    size = len(audio_base64)
    if size % 4 == 0:
        return "Humare mohalle mein pichle teen din se bijli ka transformer phuka hua hai aur bijli nahi aa rahi hai."
    elif size % 4 == 1:
        return "Sadak par bade gaddhe ho gaye hain, jiske wajah se pichle hafte ek accident bhi hua tha."
    elif size % 4 == 2:
        return "Sarkari office mein ration card banwane ke liye officer 500 rupaye ki rishwat mang raha hai."
    else:
        return "Pani ki line toot gayi hai aur poora paani sadak par beh raha hai, paani ki supply band hai."

def analyze_evidence_image(image_base64: str) -> dict:
    """
    Analyzes visual evidence of complaint.
    Returns:
    - severity_score (0.0 to 1.0)
    - damage_description (str)
    """
    if model:
        try:
            # Prepare image data
            import base64
            image_data = base64.b64decode(image_base64)
            contents = [
                {
                    "mime_type": "image/jpeg",
                    "data": image_data
                },
                "Analyze this image of public infrastructure damage. Output a JSON containing: "
                "'severity_score' (float from 0.0 representing no damage to 1.0 representing complete collapse/extreme emergency), "
                "and 'damage_description' (short English explanation of what is damaged)."
            ]
            response = model.generate_content(contents)
            cleaned_response = response.text.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response.split("```")[1].split("```")[0].strip()
            return json.loads(cleaned_response)
        except Exception as e:
            logger.error(f"Gemini image analysis error: {e}")
            
    # Mock fallback based on string length
    score = 0.5
    size = len(image_base64)
    if size % 3 == 0:
        score = 0.85
        desc = "Severe structural damage visible: deep road depression or sparking grid transformer."
    elif size % 3 == 1:
        score = 0.4
        desc = "Moderate accumulation of municipal solid waste blocking public pathway."
    else:
        score = 0.6
        desc = "Water leakage visible resulting in localized street flooding."
        
    return {
        "severity_score": score,
        "damage_description": desc
    }
