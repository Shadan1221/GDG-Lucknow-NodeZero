import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000/api';

// Pre-defined templates for simulation
const VOICE_TEMPLATES = [
  {
    label: "💧 Water Leakage (Gomti Nagar)",
    text: "Gomti Nagar ward 4 mein paani ki badi supply line toot gayi hai. Poora paani sadak par beh raha hai aur gharon mein supply band ho gayi hai.",
    category: "WATER",
    lat: 26.8467,
    lng: 80.9762,
    address: "Vikas Khand, Gomti Nagar, Lucknow",
    imageType: "water_leak"
  },
  {
    label: "🛣️ Major Potholes (Hazratganj)",
    text: "Hazratganj main chowk ke paas sadak par bohot bade gaddhe ho gaye hain. Kal raat ek motorcycle girte-girte bachi. Kripya jaldi repair karayein.",
    category: "ROADS",
    lat: 26.8504,
    lng: 80.9499,
    address: "Hazratganj Crossing, Lucknow",
    imageType: "pothole"
  },
  {
    label: "⚡ Sparking Transformer (Aliganj)",
    text: "Aliganj Sector H mein transformer se chingariyan nikal rahi hain aur kafi tez aag lagne ka khatra hai! Poore mohalle ki bijli kat chuki hai. Emergency hai!",
    category: "ELEC",
    lat: 26.8894,
    lng: 80.9442,
    address: "Sector H, Aliganj, Lucknow",
    imageType: "transformer"
  },
  {
    label: "🗑️ Garbage Pile (Indiranagar)",
    text: "Indiranagar main market ke paas kachra jama ho gaya hai aur badboo aa rahi hai. Drain bhi block ho gaya hai. Safai karwaiye.",
    category: "SAN",
    lat: 26.8821,
    lng: 80.9984,
    address: "Main Market, Indiranagar, Lucknow",
    imageType: "garbage"
  },
  {
    label: "💼 Corruption Case (Ration Office)",
    text: "Hazratganj food office mein naya ration card banwane ke liye counter officer 1000 rupaye ki rishwat mang raha hai, kehta hai bina ghoos ke kaam nahi hoga.",
    category: "CORR",
    lat: 26.8504,
    lng: 80.9499,
    address: "District Food Office, Lucknow",
    imageType: "bribe"
  },
  {
    label: "🏗️ Land Encroachment (Aminabad)",
    text: "Aminabad market ki footpath par dukan walo ne illegal taba aur lohe ka shed laga kar kabza kar liya hai. Logo ko chalne ki jagah nahi hai.",
    category: "ENC",
    lat: 26.8402,
    lng: 80.9238,
    address: "Aminabad Bazar, Lucknow",
    imageType: "encroachment"
  },
  {
    label: "Tamil: 🛣️ Road Pothole (சென்னை / Chennai)",
    text: "ரோடு மீது பெரிய பள்ளம் விழுந்துள்ளது. வண்டிகள் போவதற்கு மிகவும் கஷ்டமாக இருக்கிறது. தயவுசெய்து சரிசெய்யவும்.",
    category: "ROADS",
    lat: 13.0827,
    lng: 80.2707,
    address: "Anna Salai, Chennai",
    imageType: "pothole"
  },
  {
    label: "Telugu: 💧 Water Supply (హైదరాబాద్ / Hyderabad)",
    text: "మా వీధిలో నీటి సరఫరా నిలిచిపోయింది. గత నాలుగు రోజులుగా తాగే నీరు రావడం లేదు.",
    category: "WATER",
    lat: 17.3850,
    lng: 78.4867,
    address: "Banjara Hills, Hyderabad",
    imageType: "water_leak"
  },
  {
    label: "Kannada: 🛣️ Potholes (ಬೆಂಗಳೂರು / Bengaluru)",
    text: "ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿಗಳು ಜಾಸ್ತಿ ಆಗಿವೆ. ಇದರಿಂದ ಸಂಚಾರಕ್ಕೆ ತೊಂದರೆ ಆಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ರಸ್ತೆ ರಿಪೇರಿ ಮಾಡಿ.",
    category: "ROADS",
    lat: 12.9716,
    lng: 77.5946,
    address: "Indiranagar, Bengaluru",
    imageType: "pothole"
  },
  {
    label: "Marathi: 🗑️ Garbage Pile (मुंबई / Mumbai)",
    text: "कचरा साचला आहे आणि परिसरात खूप दुर्गंधी पसरली आहे. महानगरपालिकेने त्वरित कचरा उचलावा.",
    category: "SAN",
    lat: 19.0760,
    lng: 72.8777,
    address: "Dadar West, Mumbai",
    imageType: "garbage"
  },
  {
    label: "Bengali: 💧 Water Pipe Leak (কলকাতা / Kolkata)",
    text: "জল আসছে না এবং জলের পাইপ ফেটে রাস্তা জলমগ্ন হয়ে গেছে। দয়া করে পাইপটি মেরামত করুন।",
    category: "WATER",
    lat: 22.5726,
    lng: 88.3639,
    address: "Salt Lake Sector 5, Kolkata",
    imageType: "water_leak"
  },
  {
    label: "Gujarati: ⚡ Power Cut (અમદાવાદ / Ahmedabad)",
    text: "અમારા વિસ્તારમાં વીજળીનો ટ્રાન્સફોર્મર બગડી ગયો છે અને સવારથી લાઈટ નથી.",
    category: "ELEC",
    lat: 23.0225,
    lng: 72.5714,
    address: "Satellite Area, Ahmedabad",
    imageType: "transformer"
  },
  {
    label: "Punjabi: 🛣️ Broken Road (ਅੰਮ੍ਰਿਤਸਰ / Amritsar)",
    text: "ਸੜਕ ਤੇ ਟੋਏ ਹਨ ਅਤੇ ਲੰਘਣ ਵਾਲੇ ਵਾਹਨਾਂ ਨੂੰ ਮੁਸ਼ਕਲ ਆ ਰਹੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਜਲਦੀ ਸੜਕ ਠੀਕ ਕਰਵਾਈ ਜਾਵੇ।",
    category: "ROADS",
    lat: 31.6340,
    lng: 74.8723,
    address: "Ranjit Avenue, Amritsar",
    imageType: "pothole"
  },
  {
    label: "Malayalam: 💧 No Water Supply (തിരുവനന്തപുരം / Trivandrum)",
    text: "കുടിക്കാൻ വെള്ളം വരുന്നില്ല. പൈപ്പ് ലൈൻ തകരാറിലാണ്. ദയവായി എത്രയും വേഗം പരിഹാരം കാണുക.",
    category: "WATER",
    lat: 8.5241,
    lng: 76.9366,
    address: "East Fort, Trivandrum",
    imageType: "water_leak"
  }
];

const IMAGE_TEMPLATES = {
  water_leak: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdmsX8rBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx3Q7vwhP590AAAAASUVORK5CYII=", // Mock green
  pothole: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdnWf8jBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx6Y7w61z4l0AAAAASUVORK5CYII=", // Mock gray
  transformer: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdmrf8dBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx7U7v6mN1gIAAAAASUVORK5CYII=", // Mock red
  garbage: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdnWf8pBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx8w7v+pM0gMAAAAASUVORK5CYII=", // Mock yellow
  bribe: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdmvP8jBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx9g7v8pM6wMAAAAASUVORK5CYII=", // Mock orange
  encroachment: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdmrf8jBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx+c7vw3E1gIA" // Mock blue
};

export default function App() {
  const [view, setView] = useState('landing'); // landing, dashboard
  const [role, setRole] = useState('citizen'); // citizen, officer, commissioner
  const [complaints, setComplaints] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [landingTerminalLines, setLandingTerminalLines] = useState([]);
  useEffect(() => {
    if (view === 'landing') {
      const messages = [
        { type: 'cmd', text: 'systemctl start janseva-ai.service' },
        { type: 'info', text: 'Initializing Central Intake Ingestion daemon...' },
        { type: 'success', text: '✓ Intake core loaded. Listening on 10 regional Indian dialects.' },
        { type: 'info', text: 'Syncing SLA monitoring agents with departments...' },
        { type: 'success', text: '✓ SLA Escalator linked to District Commissioner Registry.' },
        { type: 'info', text: 'Loading spatial coordinates overlap database (Lucknow)...' },
        { type: 'success', text: '✓ Deduplication Index online. Gomti Nagar, Aliganj active.' },
        { type: 'cmd', text: 'janseva-ai --status' },
        { type: 'success', text: 'STATUS: ACTIVE | AGENTS: 4 ONLINE | LATENCY: 34ms' },
        { type: 'success', text: 'Awaiting voice intake triggers on WhatsApp API gateway...' }
      ];
      setLandingTerminalLines([]);
      
      let index = 0;
      const interval = setInterval(() => {
        if (index < messages.length) {
          const currentMsg = messages[index];
          if (currentMsg) {
            setLandingTerminalLines(prev => [...prev, currentMsg]);
          }
          index++;
        } else {
          clearInterval(interval);
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [view]);
  
  // Intake Inputs
  const [selectedTemplate, setSelectedTemplate] = useState(-1);
  const [manualText, setManualText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const [logMessages, setLogMessages] = useState([
    { time: new Date().toLocaleTimeString(), tag: "System", text: "JanSeva AI Multi-Agent Core loaded." }
  ]);
  const [chatMessages, setChatMessages] = useState([
    { sender: "received", text: "राम राम भैया! जनसेवा AI मा तोहार स्वागत है। आपन शिकायत बोले या लिख के भेजिए। (You can record or type your complaint here!)", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);

  // Real microphone recording logic
  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioBase64(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioBase64(reader.result);
          addLog("Intake", "Audio recording completed and encoded to base64 successfully.");
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      addLog("Intake", "Microphone listening... Speak now.");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      addLog("Error", "Microphone access denied or not supported in this browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    audioChunksRef.current = [];
    setAudioBase64(null);
    setRecordingTime(0);
    addLog("Intake", "Audio recording cancelled.");
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const [activeTab, setActiveTab] = useState("all");
  
  // Feedback popup state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");

  const terminalEndRef = useRef(null);

  // Load complaints and heatmaps on mount/role change
  useEffect(() => {
    fetchComplaints();
    fetchHeatmap();
  }, [role]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logMessages]);

  const addLog = (tag, text) => {
    setLogMessages(prev => [...prev, { time: new Date().toLocaleTimeString(), tag, text }]);
  };

  const fetchComplaints = async () => {
    try {
      let url = `${API_BASE}/complaints`;
      if (role === 'officer') {
        // Mocking assignments or listing in dev
        url += `?officer_username=officer_water`; // default viewing as water officer
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
        if (data.length > 0 && !selectedComplaint) {
          setSelectedComplaint(data[0]);
        }
      }
    } catch (err) {
      console.warn("Failed fetching from backend, running simulation fallback", err);
    }
  };

  const fetchHeatmap = async () => {
    try {
      const res = await fetch(`${API_BASE}/complaints/heatmap`);
      if (res.ok) {
        const data = await res.json();
        setHeatmap(data);
      }
    } catch (err) {
      console.warn("Failed fetching heatmap data", err);
    }
  };

  // Submit Complaint
  const handleSubmitGrievance = async () => {
    let complaintText = manualText;
    let template = null;
    if (selectedTemplate >= 0) {
      template = VOICE_TEMPLATES[selectedTemplate];
      complaintText = template.text;
    }

    if (!complaintText && !audioBase64) return;

    // Add sent message to chat mockup
    const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let messageText = "";
    if (template) {
      messageText = `🎙️ Voice Note: "${complaintText}"`;
    } else if (audioBase64) {
      messageText = `🎙️ Real Voice Note (Recorded Audio)`;
    } else {
      messageText = complaintText;
    }

    setChatMessages(prev => [...prev, { sender: "sent", text: messageText, time: timeStr }]);
    
    // Clear inputs
    setManualText("");
    setSelectedTemplate(-1);

    // Simulate Agent Logs step-by-step
    addLog("Intake", "Received voice/text payload in Central Intake...");
    
    setTimeout(() => {
      addLog("Intake", audioBase64 ? "Processing and decoding base64 audio payload..." : "Extracting text grievance...");
    }, 400);

    setTimeout(() => {
      addLog("Classifier", `Parsing keywords & script matching...`);
    }, 1000);

    setTimeout(() => {
      addLog("Deduplication", "Comparing spatial coordinates & semantic overlaps across database...");
    }, 1600);

    // Make API request
    try {
      const payload = {
        text_content: audioBase64 ? null : complaintText,
        audio_base64: audioBase64 || null,
        citizen_username: "qambar",
        latitude: template ? template.lat : 26.8467,
        longitude: template ? template.lng : 80.9762,
        address: template ? template.address : "Lucknow Central, UP",
        image_base64: template ? IMAGE_TEMPLATES[template.imageType] : IMAGE_TEMPLATES.pothole
      };

      const res = await fetch(`${API_BASE}/complaints/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const ticket = data.complaint;
        
        // Clear recorded audio state
        setAudioBase64(null);
        
        // If we sent raw audio, update the chat log message with the actual transcribed description
        if (payload.audio_base64) {
          setChatMessages(prev => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].sender === "sent" && updated[i].text === "🎙️ Real Voice Note (Recorded Audio)") {
                updated[i].text = `🎙️ Transcribed Audio: "${ticket.description}"`;
                break;
              }
            }
            return updated;
          });
        }

        setTimeout(() => {
          addLog("Routing", `Successfully routed to Department: ${ticket.assigned_department?.name || 'General'}. Assignee: ${ticket.assigned_officer?.username || 'None'}`);
        }, 2200);

        setTimeout(() => {
          addLog("SLA Daemon", `SLA countdown initialized: ${ticket.sla_hours} hours. Target Deadline: ${new Date(ticket.sla_deadline).toLocaleString()}`);
          addLog("Notifier", "Dispatched WhatsApp notifications to citizen...");
          
          // Match vernacular messages
          const detectedLang = (ticket.detected_language || "english").toLowerCase();
          const nativeNotification = data.notifications[detectedLang] || data.notifications.hindi;
          const englishNotification = data.notifications.english;

          const replies = [];
          replies.push({ 
            sender: "received", 
            text: `📱 *${(ticket.detected_language || "Hindi").toUpperCase()} NOTIFICATION*\n${nativeNotification}`, 
            time: timeStr 
          });
          
          if (detectedLang !== "english" && detectedLang !== "hindi") {
            replies.push({
              sender: "received",
              text: `📱 *ENGLISH TRANSLATION*\n${englishNotification}`,
              time: timeStr
            });
          }

          setChatMessages(prev => [...prev, ...replies]);

          fetchComplaints();
          fetchHeatmap();
        }, 2800);
      } else {
        const errData = await res.json();
        addLog("Error", `Backend rejected ingestion: ${errData.detail}`);
        setAudioBase64(null);
      }
    } catch (err) {
      addLog("Error", "Could not reach backend API server. Make sure FastAPI is running on port 8000.");
      setAudioBase64(null);
    }
  };

  // Resolve Ticket
  const handleResolveTicket = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE}/complaints/${ticketId}/resolve`, { method: 'POST' });
      if (res.ok) {
        addLog("Officer", `Marked Ticket ${selectedComplaint.tracking_id} as RESOLVED.`);
        fetchComplaints();
      }
    } catch (err) {
      console.warn("Failed resolving ticket", err);
    }
  };

  // Trigger SLA Check Daemon (Escalates expired tickets)
  const handleTriggerSLACheck = async () => {
    addLog("SLA Daemon", "Manually polling active complaints SLA limits...");
    try {
      const res = await fetch(`${API_BASE}/complaints/check-sla`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        addLog("SLA Daemon", `SLA poll complete. Escalated ${data.escalated_count} tickets.`);
        if (data.escalated_count > 0) {
          addLog("SLA Daemon", `Escalated IDs: ${data.escalated_tracking_ids.join(', ')}`);
        }
        fetchComplaints();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Submit Feedback Rating
  const handleSubmitFeedback = async () => {
    if (!selectedComplaint) return;
    try {
      const res = await fetch(`${API_BASE}/complaints/${selectedComplaint.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          citizen_rating: feedbackRating,
          feedback: feedbackText
        })
      });
      if (res.ok) {
        addLog("Citizen Notifier", `Feedback submitted for ${selectedComplaint.tracking_id}. Rating: ${feedbackRating} stars. Sentiment analyzed.`);
        setFeedbackText("");
        fetchComplaints();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Filter complaints based on status tab
  const getFilteredComplaints = () => {
    if (activeTab === "all") return complaints;
    if (activeTab === "escalated") return complaints.filter(c => c.status === 'escalated');
    if (activeTab === "duplicates") return complaints.filter(c => c.is_duplicate);
    if (activeTab === "resolved") return complaints.filter(c => c.status === 'resolved' || c.status === 'closed');
    return complaints;
  };

  if (view === 'landing') {
    return (
      <div className="landing-wrapper">
        <div className="landing-spotlight-1"></div>
        <div className="landing-spotlight-2"></div>

        {/* Navbar */}
        <header className="landing-nav">
          <div className="landing-logo-container">
            <span className="landing-logo">JanSeva AI</span>
            <span className="brand-tag">v2.0</span>
          </div>
          <nav className="landing-nav-links">
            <a href="#features" className="landing-nav-link">FEATURES</a>
            <a href="#workflow" className="landing-nav-link">WORKFLOW</a>
            <a href="#impact" className="landing-nav-link">IMPACT</a>
            <button className="btn btn-primary" style={{padding: '8px 16px', fontSize: '12px'}} onClick={() => setView('dashboard')}>
              LAUNCH SIMULATOR
            </button>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="landing-hero">
          <div className="landing-badge">Autonomous Civic Infrastructure</div>
          <h1 className="landing-headline">
            <span className="hollow">Democratizing Civic</span> <br />
            <span className="gradient-accent">Grievance Resolution</span>
          </h1>
          <p className="landing-description">
            JanSeva AI is an agentic, multi-vibhag civic resolution suite. Transcribe vernacular audio, group duplicates spatially, assign routing, and run auto-escalating SLA monitors dynamically.
          </p>

          <div className="landing-ctas">
            <button className="btn-landing-primary" onClick={() => setView('dashboard')}>
              Enter Sandbox Simulator <span>→</span>
            </button>
            <a href="#features" className="btn-landing-secondary">
              Explore Tech Stack <span>↓</span>
            </a>
          </div>

          {/* Feature Grid */}
          <section id="features" className="landing-features-grid" style={{scrollMarginTop: '100px'}}>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🎙️</div>
              <h3 className="landing-feature-title">Multilingual Voice</h3>
              <p className="landing-feature-desc">
                File complaints in Hindi, Awadhi, Tamil, Telugu, and 6+ other dialects. High-fidelity audio translation maps dialects into clean records.
              </p>
            </div>
            
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🌿</div>
              <h3 className="landing-feature-title">Agentic Routing</h3>
              <p className="landing-feature-desc">
                Multi-agent pipeline categorizes, prioritizes, and routes complaints to respective department queues (Water, Roads, Power) instantly.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">⚡</div>
              <h3 className="landing-feature-title">SLA Escalator</h3>
              <p className="landing-feature-desc">
                Autonomous daemon monitors deadlines. Unresolved tickets blink red and automatically escalate directly to the Commissioner.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">👥</div>
              <h3 className="landing-feature-title">Deduplication</h3>
              <p className="landing-feature-desc">
                Spatial clusters group duplicate complaints within meters. Intercepts redundant filings and alerts officers in real-time.
              </p>
            </div>
          </section>

          {/* Interactive Pipeline & Terminal */}
          <section id="workflow" className="landing-interactive-section" style={{scrollMarginTop: '100px'}}>
            <div>
              <h2 className="brand-logo" style={{fontSize: '32px', marginBottom: '16px', WebkitTextFillColor: 'initial', color: 'var(--text-primary)'}}>
                Agentic Pipeline Flow
              </h2>
              <p style={{color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px'}}>
                See how JanSeva AI processes citizen grievances from initial ingestion to final resolution.
              </p>
              
              <div className="pipeline-diagram">
                <div className={`pipeline-stage ${landingTerminalLines.length >= 3 ? 'active' : ''}`}>
                  <div className="stage-num">01</div>
                  <div className="stage-info">
                    <div className="stage-title">Ingestion & Audio Transcription</div>
                    <div className="stage-desc">Transcribes voice note or text. Extracts GPS coordinates and addresses.</div>
                  </div>
                </div>

                <div className={`pipeline-stage ${landingTerminalLines.length >= 6 ? 'active' : ''}`}>
                  <div className="stage-num">02</div>
                  <div className="stage-info">
                    <div className="stage-title">Deduplication & Mapping</div>
                    <div className="stage-desc">Checks if the incident overlaps with existing issues using spatial indexes.</div>
                  </div>
                </div>

                <div className={`pipeline-stage ${landingTerminalLines.length >= 8 ? 'active' : ''}`}>
                  <div className="stage-num">03</div>
                  <div className="stage-info">
                    <div className="stage-title">Classification & SLA Initialization</div>
                    <div className="stage-desc">Classifies department, determines severity, and initiates the SLA timer.</div>
                  </div>
                </div>

                <div className={`pipeline-stage ${landingTerminalLines.length >= 10 ? 'active' : ''}`}>
                  <div className="stage-num">04</div>
                  <div className="stage-info">
                    <div className="stage-title">Verification & Satisfaction Closure</div>
                    <div className="stage-desc">Citizen verifies department action, completes rating, and closes ticket.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal console */}
            <div className="landing-terminal">
              <div className="terminal-header">
                <div className="terminal-buttons">
                  <div className="terminal-btn red"></div>
                  <div className="terminal-btn yellow"></div>
                  <div className="terminal-btn green"></div>
                </div>
                <span className="terminal-title">Console Log</span>
              </div>
              <div className="terminal-body">
                {landingTerminalLines.length === 0 ? (
                  <div className="terminal-line cmd">Loading system logs...</div>
                ) : (
                  landingTerminalLines.map((line, idx) => {
                    if (!line) return null;
                    return (
                      <div key={idx} className={`terminal-line ${line.type || ''}`}>
                        {line.type === 'cmd' ? '> ' : ''}{line.text}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Stats section */}
          <section id="impact" className="landing-stats-row" style={{scrollMarginTop: '100px'}}>
            <div className="landing-stat-card">
              <div className="landing-stat-val">2.4m</div>
              <div className="landing-stat-lbl">Processed Annually</div>
            </div>
            <div className="landing-stat-card">
              <div className="landing-stat-val">99.4%</div>
              <div className="landing-stat-lbl">Accurate Transcription</div>
            </div>
            <div className="landing-stat-card">
              <div className="landing-stat-val">4.5h</div>
              <div className="landing-stat-lbl">Average Resolution SLA</div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-copy">
            &copy; 2026 JanSeva AI Suite. All rights reserved.
          </div>
          <div className="footer-vibhag">
            Uttar Pradesh e-Governance Division
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header Section */}
      <div className="header glass-panel">
        <div className="brand-section" style={{cursor: 'pointer'}} onClick={() => setView('landing')} title="Go to landing page">
          <div className="brand-logo">JanSeva AI</div>
          <div className="brand-tag">Bureaucracy co-pilot</div>
        </div>
        <div className="role-switcher">
          <button 
            className="btn btn-secondary" 
            style={{padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}
            onClick={() => setView('landing')}
          >
            🏠 Home
          </button>
          <span className="form-label" style={{marginBottom: 0}}>Control View:</span>
          <select 
            className="select-input" 
            value={role} 
            onChange={(e) => {
              setRole(e.target.value);
              setSelectedComplaint(null);
            }}
          >
            <option value="citizen">Citizen Portal (WhatsApp Simulator)</option>
            <option value="officer">Department Officer (Water Dept View)</option>
            <option value="commissioner">Municipal Commissioner Dashboard</option>
          </select>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="dashboard-grid">
        
        {/* Left Hand: Intake / Simulator */}
        <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div className="panel-title">Citizen Voice Intake</div>
          
          <div className="form-group">
            <label className="form-label">Pre-Recorded Hindi/Awadhi Audio Templates</label>
            <select 
              className="select-input"
              value={selectedTemplate}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSelectedTemplate(val);
                if (val >= 0) {
                  setManualText(VOICE_TEMPLATES[val].text);
                } else {
                  setManualText("");
                }
              }}
            >
              <option value="-1">-- Record Custom or Select Templates --</option>
              {VOICE_TEMPLATES.map((tmpl, idx) => (
                <option key={idx} value={idx}>{tmpl.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Voice / Text Grievance Description</label>
            <textarea 
              rows="3"
              className="form-textarea"
              placeholder="Explain your problem (Hindi, English or Awadhi)..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {!isRecording && !audioBase64 && (
              <button 
                className="btn btn-secondary" 
                style={{width: '100%', borderColor: '#10b981', color: '#10b981', background: 'rgba(16,185,129,0.05)'}}
                onClick={startRecording}
              >
                🎙️ Start Real Microphone Recording
              </button>
            )}

            {isRecording && (
              <div style={{display: 'flex', gap: '8px', width: '100%'}}>
                <button 
                  className="btn btn-secondary" 
                  style={{flex: 2, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: '#ef4444'}}
                  onClick={stopRecording}
                >
                  🔴 Stop Recording ({formatTime(recordingTime)})
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{flex: 1}}
                  onClick={cancelRecording}
                >
                  Discard
                </button>
              </div>
            )}

            {audioBase64 && (
              <div style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{color: '#10b981', fontSize: '13px', fontWeight: '500'}}>
                  ✓ Voice Note Recorded & Encoded
                </span>
                <button 
                  className="btn btn-secondary" 
                  style={{padding: '4px 8px', fontSize: '11px', background: 'transparent'}}
                  onClick={() => setAudioBase64(null)}
                >
                  Discard
                </button>
              </div>
            )}
            
            <div style={{display: 'flex', gap: '8px'}}>
              <button 
                className="btn btn-secondary" 
                style={{flex: 1}}
                onClick={() => {
                  const rnd = Math.floor(Math.random() * VOICE_TEMPLATES.length);
                  setSelectedTemplate(rnd);
                  setManualText(VOICE_TEMPLATES[rnd].text);
                  setAudioBase64(null);
                  addLog("Simulator", `Selected template: ${VOICE_TEMPLATES[rnd].label}`);
                }}
              >
                🤖 Sim Voice
              </button>
              <button className="btn btn-primary" style={{flex: 1}} onClick={handleSubmitGrievance}>
                🚀 File Grievance
              </button>
            </div>
          </div>

          {isRecording && (
            <div className="waveform-container">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="wave-bar active" style={{ animationDelay: `${i * 0.08}s` }}></div>
              ))}
            </div>
          )}

          {/* WhatsApp Sandbox Mockup */}
          <div className="phone-mockup">
            <div className="phone-header">
              <div className="phone-avatar">JS</div>
              <div className="phone-info">
                <span className="phone-name">JanSeva AI (U.P. Govt)</span>
                <span className="phone-status">Online · Verification Shield</span>
              </div>
            </div>
            <div className="phone-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.sender}`}>
                  <div style={{whiteSpace: 'pre-wrap'}}>{msg.text}</div>
                  <div className="message-time">{msg.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Hand: Dashboard Views */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
          
          {/* Real-time Agent Log (Always Visible at bottom of right hand or top) */}
          <div className="glass-panel">
            <div className="panel-title">Multi-Agent Core Pipeline Logs</div>
            <div className="terminal-log">
              {logMessages.map((log, idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-time">[{log.time}]</span>
                  <span className="log-tag">[{log.tag.toUpperCase()}]</span>
                  <span className="log-txt">{log.text}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Role specific components */}
          {role === 'citizen' && (
            <div className="glass-panel">
              <div className="panel-title">Active Lucknow Grievance Ledger</div>
              <div style={{display: 'flex', gap: '16px', height: '520px'}}>
                
                {/* Scrollable list */}
                <div style={{flex: 1.2, display: 'flex', flexDirection: 'column'}}>
                  <div className="complaint-list">
                    {complaints.length === 0 ? (
                      <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-secondary)'}}>
                        No active complaints reported in database. File one!
                      </div>
                    ) : (
                      complaints.map(c => (
                        <div 
                          key={c.id} 
                          className={`complaint-card ${selectedComplaint?.id === c.id ? 'active' : ''}`}
                          onClick={() => setSelectedComplaint(c)}
                        >
                          <div className="card-header">
                            <span className="card-title">{c.title}</span>
                            <span className={`badge badge-${c.severity.toLowerCase()}`}>{c.severity}</span>
                          </div>
                          <div className="card-meta">
                            <span>ID: {c.tracking_id}</span>
                            <span className={`status-badge status-${c.status}`}>{c.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ticket Details & Action Panel */}
                <div style={{flex: 1.8, borderLeft: '1px solid var(--border-color)', paddingLeft: '24px'}} className="detail-view">
                  {selectedComplaint ? (
                    <>
                      <div className="detail-section">
                        <h3 className="brand-logo" style={{fontSize: '20px', WebkitTextFillColor: 'initial', color: 'var(--text-primary)'}}>
                          {selectedComplaint.title}
                        </h3>
                        <p style={{marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)'}}>
                          "{selectedComplaint.description}"
                        </p>
                      </div>

                      <div className="detail-row">
                        <div>
                          <div className="detail-lbl">Status</div>
                          <div className={`status-badge status-${selectedComplaint.status}`} style={{display: 'inline-block', marginTop: '4px'}}>
                            {selectedComplaint.status.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="detail-lbl">SLA Status</div>
                          <div className="detail-val">{selectedComplaint.sla_hours}h limits</div>
                        </div>
                        <div>
                          <div className="detail-lbl">Assigned Vibhag</div>
                          <div className="detail-val">{selectedComplaint.assigned_department?.name || 'Unassigned'}</div>
                        </div>
                        <div>
                          <div className="detail-lbl">Address</div>
                          <div className="detail-val">{selectedComplaint.address || 'Unknown'}</div>
                        </div>
                      </div>

                      {/* Citizen Feedback box if resolved */}
                      {selectedComplaint.status === 'resolved' && (
                        <div className="glass-panel" style={{marginTop: '20px', background: 'rgba(0, 240, 255, 0.05)'}}>
                          <div className="panel-title" style={{fontSize: '14px', marginBottom: '8px'}}>Citizen Satisfaction Rating</div>
                          <div className="form-group">
                            <label className="form-label">Rating (1-5 stars)</label>
                            <input 
                              type="number" 
                              min="1" max="5" 
                              className="form-input" 
                              value={feedbackRating}
                              onChange={(e) => setFeedbackRating(parseInt(e.target.value))}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Feedback</label>
                            <input 
                              type="text" 
                              className="form-input"
                              placeholder="Review the department performance..."
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                            />
                          </div>
                          <button className="btn btn-primary" style={{width: '100%'}} onClick={handleSubmitFeedback}>
                            Submit Rating & Close Ticket
                          </button>
                        </div>
                      )}

                      {selectedComplaint.status === 'closed' && (
                        <div className="glass-panel" style={{marginTop: '20px', background: 'rgba(0,255,170,0.05)'}}>
                          <div style={{color: 'var(--color-low)', fontSize: '13px', fontWeight: 'bold'}}>
                            ✓ Grievance resolved and closed by citizen satisfaction loop.
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{textAlign: 'center', marginTop: '100px', color: 'var(--text-secondary)'}}>
                      Select a grievance card to inspect routing maps and SLA records.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {role === 'officer' && (
            <div className="glass-panel">
              <div className="panel-title">Officer Working Desk (Department Queue)</div>
              
              <div style={{display: 'flex', gap: '16px', height: '520px'}}>
                
                {/* Scrollable list */}
                <div style={{flex: 1.2}}>
                  <div className="complaint-list">
                    {complaints.filter(c => c.status !== 'closed' && !c.is_duplicate).map(c => (
                      <div 
                        key={c.id} 
                        className={`complaint-card ${selectedComplaint?.id === c.id ? 'active' : ''}`}
                        onClick={() => setSelectedComplaint(c)}
                      >
                        <div className="card-header">
                          <span className="card-title">{c.title}</span>
                          <span className={`badge badge-${c.severity.toLowerCase()}`}>{c.severity}</span>
                        </div>
                        <div className="card-meta">
                          <span>ID: {c.tracking_id}</span>
                          <span className={`status-badge status-${c.status}`}>{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inspect and Action */}
                <div style={{flex: 1.8, borderLeft: '1px solid var(--border-color)', paddingLeft: '24px'}} className="detail-view">
                  {selectedComplaint ? (
                    <>
                      <div className="detail-section">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <h3 style={{fontSize: '18px'}}>{selectedComplaint.title}</h3>
                          <span className={`badge badge-${selectedComplaint.severity.toLowerCase()}`}>{selectedComplaint.severity}</span>
                        </div>
                        <p style={{marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)'}}>
                          "{selectedComplaint.description}"
                        </p>
                      </div>

                      <div className="detail-row">
                        <div>
                          <div className="detail-lbl">Officer ID</div>
                          <div className="detail-val">water_officer_lucknow</div>
                        </div>
                        <div>
                          <div className="detail-lbl">SLA Deadline</div>
                          <div className="detail-val" style={{color: selectedComplaint.status === 'escalated' ? 'var(--color-emergency)' : 'var(--text-primary)'}}>
                            {new Date(selectedComplaint.sla_deadline).toLocaleTimeString()}
                          </div>
                        </div>
                        <div>
                          <div className="detail-lbl">Evidence Vision Assessment</div>
                          <div className="detail-val" style={{fontSize: '12px', color: 'var(--primary-cyan)'}}>
                            {selectedComplaint.image_url || 'No visual damage notes extracted.'}
                          </div>
                        </div>
                        <div>
                          <div className="detail-lbl">Address</div>
                          <div className="detail-val">{selectedComplaint.address}</div>
                        </div>
                      </div>

                      <div style={{marginTop: 'auto', display: 'flex', gap: '8px'}}>
                        <button 
                          className="btn btn-primary" 
                          style={{flex: 1}}
                          onClick={() => handleResolveTicket(selectedComplaint.id)}
                          disabled={selectedComplaint.status === 'resolved'}
                        >
                          Mark Resolved (Send Citizen Verification Code)
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{textAlign: 'center', marginTop: '100px', color: 'var(--text-secondary)'}}>
                      Select a grievance from your department ticket queue.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {role === 'commissioner' && (
            <>
              {/* Statistic row */}
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-lbl">Total Incidents</div>
                  <div className="metric-val">{complaints.length}</div>
                </div>
                <div className="metric-card" style={{borderColor: 'var(--color-emergency)'}}>
                  <div className="metric-lbl">SLA Escalated</div>
                  <div className="metric-val" style={{color: 'var(--color-emergency)'}}>{complaints.filter(c => c.status === 'escalated').length}</div>
                </div>
                <div className="metric-card" style={{borderColor: 'var(--color-medium)'}}>
                  <div className="metric-lbl">Duplicates Intercepted</div>
                  <div className="metric-val" style={{color: 'var(--color-medium)'}}>{complaints.filter(c => c.is_duplicate).length}</div>
                </div>
                <div className="metric-card" style={{borderColor: 'var(--color-low)'}}>
                  <div className="metric-lbl">Resolved Rate</div>
                  <div className="metric-val" style={{color: 'var(--color-low)'}}>
                    {complaints.length > 0 
                      ? Math.round((complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length / complaints.length) * 100) 
                      : 0}%
                  </div>
                </div>
              </div>

              {/* Main Admin Dashboard split */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                
                {/* SVG Heatmap Panel */}
                <div className="glass-panel">
                  <div className="panel-title">Lucknow Incident Hotspot Map</div>
                  
                  <div className="map-container">
                    {/* Simulated SVG street network of Lucknow */}
                    <svg className="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="10" y1="20" x2="90" y2="20" stroke="#1e293b" strokeWidth="0.5" />
                      <line x1="10" y1="50" x2="90" y2="50" stroke="#1e293b" strokeWidth="0.8" />
                      <line x1="10" y1="80" x2="90" y2="80" stroke="#1e293b" strokeWidth="0.5" />
                      
                      <line x1="30" y1="10" x2="30" y2="90" stroke="#1e293b" strokeWidth="0.8" />
                      <line x1="60" y1="10" x2="60" y2="90" stroke="#1e293b" strokeWidth="0.5" />
                      
                      {/* Gomti River flow representation */}
                      <path d="M 10 90 Q 40 40 90 10" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeOpacity="0.3" />
                    </svg>

                    {/* Plots dots based on category and severity */}
                    {heatmap.map(dot => {
                      // Map GPS coordinates roughly inside SVG viewport 10-90
                      // Lucknow: Lat 26.84-26.89, Lng 80.92-80.99
                      const x = 10 + ((dot.longitude - 80.92) / (80.99 - 80.92)) * 80;
                      const y = 90 - ((dot.latitude - 26.84) / (26.89 - 26.84)) * 80;
                      
                      let color = 'var(--color-low)';
                      if (dot.severity === 'Emergency') color = 'var(--color-emergency)';
                      else if (dot.severity === 'High') color = 'var(--color-high)';
                      else if (dot.severity === 'Medium') color = 'var(--color-medium)';

                      return (
                        <div 
                          key={dot.id} 
                          className="map-dot" 
                          style={{
                            left: `${x}%`, 
                            top: `${y}%`,
                            color: color,
                            backgroundColor: color
                          }}
                          title={`${dot.tracking_id}: ${dot.title}`}
                          onClick={() => {
                            const found = complaints.find(c => c.id === dot.id);
                            if (found) setSelectedComplaint(found);
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  <div style={{marginTop: '12px', display: 'flex', justifyContent: 'space-between', gap: '8px'}}>
                    <button className="btn btn-primary" style={{width: '100%', fontSize: '13px'}} onClick={handleTriggerSLACheck}>
                      ⚡ Run SLA Check Daemon (Force Escalations)
                    </button>
                  </div>
                </div>

                {/* Tickets list with custom tabs */}
                <div className="glass-panel">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <div className="panel-title" style={{margin: 0}}>Ledger Queue</div>
                    <div style={{display: 'flex', gap: '4px'}}>
                      <button className={`btn btn-secondary ${activeTab === 'all' ? 'btn-primary' : ''}`} style={{padding: '4px 8px', fontSize: '11px'}} onClick={() => setActiveTab('all')}>All</button>
                      <button className={`btn btn-secondary ${activeTab === 'escalated' ? 'btn-primary' : ''}`} style={{padding: '4px 8px', fontSize: '11px'}} onClick={() => setActiveTab('escalated')}>Escalated</button>
                      <button className={`btn btn-secondary ${activeTab === 'duplicates' ? 'btn-primary' : ''}`} style={{padding: '4px 8px', fontSize: '11px'}} onClick={() => setActiveTab('duplicates')}>Duplicates</button>
                    </div>
                  </div>

                  <div className="complaint-list" style={{maxHeight: '260px'}}>
                    {getFilteredComplaints().map(c => (
                      <div 
                        key={c.id} 
                        className={`complaint-card ${selectedComplaint?.id === c.id ? 'active' : ''}`}
                        onClick={() => setSelectedComplaint(c)}
                      >
                        <div className="card-header">
                          <span className="card-title" style={{fontSize: '13px'}}>{c.title}</span>
                          {c.is_duplicate && <span className="badge badge-low" style={{fontSize: '9px', background: 'rgba(255,170,0,0.1)'}}>DUPLICATE</span>}
                        </div>
                        <div className="card-meta">
                          <span>ID: {c.tracking_id}</span>
                          <span className={`status-badge status-${c.status}`}>{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
