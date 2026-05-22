import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000/api';

const VOICE_TEMPLATES = [
  { label: "💧 Water Leakage (Gomti Nagar)", text: "Gomti Nagar ward 4 mein paani ki badi supply line toot gayi hai. Poora paani sadak par beh raha hai aur gharon mein supply band ho gayi hai.", category: "WATER", lat: 26.8467, lng: 80.9762, address: "Vikas Khand, Gomti Nagar, Lucknow", imageType: "water_leak" },
  { label: "🛣️ Major Potholes (Hazratganj)", text: "Hazratganj main chowk ke paas sadak par bohot bade gaddhe ho gaye hain. Kal raat ek motorcycle girte-girte bachi. Kripya jaldi repair karayein.", category: "ROADS", lat: 26.8504, lng: 80.9499, address: "Hazratganj Crossing, Lucknow", imageType: "pothole" },
  { label: "⚡ Sparking Transformer (Aliganj)", text: "Aliganj Sector H mein transformer se chingariyan nikal rahi hain aur kafi tez aag lagne ka khatra hai! Poore mohalle ki bijli kat chuki hai. Emergency hai!", category: "ELEC", lat: 26.8894, lng: 80.9442, address: "Sector H, Aliganj, Lucknow", imageType: "transformer" },
  { label: "🗑️ Garbage Pile (Indiranagar)", text: "Indiranagar main market ke paas kachra jama ho gaya hai aur badboo aa rahi hai. Drain bhi block ho gaya hai. Safai karwaiye.", category: "SAN", lat: 26.8821, lng: 80.9984, address: "Main Market, Indiranagar, Lucknow", imageType: "garbage" },
  { label: "💼 Corruption Case (Ration Office)", text: "Hazratganj food office mein naya ration card banwane ke liye counter officer 1000 rupaye ki rishwat mang raha hai, kehta hai bina ghoos ke kaam nahi hoga.", category: "CORR", lat: 26.8504, lng: 80.9499, address: "District Food Office, Lucknow", imageType: "bribe" },
  { label: "🏗️ Land Encroachment (Aminabad)", text: "Aminabad market ki footpath par dukan walo ne illegal taba aur lohe ka shed laga kar kabza kar liya hai. Logo ko chalne ki jagah nahi hai.", category: "ENC", lat: 26.8402, lng: 80.9238, address: "Aminabad Bazar, Lucknow", imageType: "encroachment" }
];

const IMAGE_TEMPLATES = {
  water_leak: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdmsX8rBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx3Q7vwhP590AAAAASUVORK5CYII=", 
  pothole: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdnWf8jBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx6Y7w61z4l0AAAAASUVORK5CYII=",
  transformer: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdmrf8dBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx7U7v6mN1gIAAAAASUVORK5CYII=",
  garbage: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdnWf8pBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx8w7v+pM0gMAAAAASUVORK5CYII=",
  bribe: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdmvP8jBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx9g7v8pM6wMAAAAASUVORK5CYII=",
  encroachment: "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAS0lEQVR42u3PMQEAAAgEIDdmrf8jBzDwL42CSnIqQsgICRkhYWQEjJCQEBISQkZCwMgIGSEhISQkhIyEgJERMjJCQsbICAkJSfIAx+c7vw3E1gIA"
};

export default function App() {
  const [view, setView] = useState('landing');
  const [role, setRole] = useState('citizen');
  const [complaints, setComplaints] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [landingTerminalLines, setLandingTerminalLines] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(-1);
  const [manualText, setManualText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [logMessages, setLogMessages] = useState([{ time: new Date().toLocaleTimeString(), tag: "System", text: "JanSeva AI Multi-Agent Core loaded." }]);
  const [chatMessages, setChatMessages] = useState([{ sender: "received", text: "Namaste! JanSeva AI is ready. Record your grievance or use a template to begin.", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const terminalEndRef = useRef(null);

  const handleMouseMove = (e) => { if (view === 'landing') setMousePos({ x: e.clientX, y: e.clientY }); };

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
        if (index < messages.length) { setLandingTerminalLines(prev => [...prev, messages[index]]); index++; } 
        else clearInterval(interval);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [view]);

  useEffect(() => {
    if (view === 'landing') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('revealed'); });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }
  }, [view]);

  useEffect(() => { fetchComplaints(); fetchHeatmap(); }, [role]);
  useEffect(() => { if (terminalEndRef.current) terminalEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [logMessages]);

  const addLog = (tag, text) => setLogMessages(prev => [...prev, { time: new Date().toLocaleTimeString(), tag, text }]);

  const fetchComplaints = async () => {
    try {
      const res = await fetch(`${API_BASE}/complaints`);
      if (res.ok) {
        const data = await res.json(); setComplaints(data);
        if (data.length > 0 && !selectedComplaint) setSelectedComplaint(data[0]);
      }
    } catch (err) { console.warn("API Offline, check backend."); }
  };

  const fetchHeatmap = async () => {
    try {
      const res = await fetch(`${API_BASE}/complaints/heatmap`);
      if (res.ok) setHeatmap(await res.json());
    } catch (err) { console.warn(err); }
  };

  const handleTranscribeAudio = async (audioB64) => {
    setIsTranscribing(true); addLog("Intake", "Requesting transcription...");
    try {
      const res = await fetch(`${API_BASE}/complaints/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio_base_64: audioB64 }) });
      if (res.ok) { const data = await res.json(); setManualText(data.transcript || ""); addLog("Classifier", `Transcribed: "${data.transcript}"`); }
    } catch (err) { addLog("Error", "Transcription failed."); }
    finally { setIsTranscribing(false); }
  };

  const startRecording = async () => {
    audioChunksRef.current = []; setAudioBase64(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const reader = new FileReader(); reader.readAsDataURL(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        reader.onloadend = () => { setAudioBase64(reader.result); handleTranscribeAudio(reader.result); };
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start(); setIsRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
      addLog("Intake", "Listening...");
    } catch (err) { addLog("Error", "Mic access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current.stop();
    setIsRecording(false); clearInterval(timerRef.current);
  };

  const cancelRecording = () => { stopRecording(); setAudioBase64(null); setRecordingTime(0); };
  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const handleSubmitGrievance = async () => {
    let text = manualText;
    let template = selectedTemplate >= 0 ? VOICE_TEMPLATES[selectedTemplate] : null;
    if (template) text = template.text;
    if (!text && !audioBase64) return;
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    setChatMessages(p => [...p, { sender: "sent", text: audioBase64 ? "🎙️ Voice Note" : text, time }]);
    setManualText(""); setSelectedTemplate(-1);
    addLog("Intake", "Payload received...");
    try {
      const payload = {
        text_content: audioBase64 ? null : text, audio_base_64: audioBase64 || null, citizen_username: "qambar",
        latitude: template?.lat || 26.8467, longitude: template?.lng || 80.9762,
        address: template?.address || "Lucknow", image_base64: uploadedImageBase64 || (template ? IMAGE_TEMPLATES[template.imageType] : IMAGE_TEMPLATES.pothole)
      };
      const res = await fetch(`${API_BASE}/complaints/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const data = await res.json(); const ticket = data.complaint; setAudioBase64(null); setUploadedImageBase64(null);
        addLog("Routing", `Routed to ${ticket.assigned_department?.name}`);
        setTimeout(() => {
          addLog("SLA", `Deadline: ${new Date(ticket.sla_deadline).toLocaleTimeString()}`);
          const msg = data.notifications[(ticket.detected_language || "english").toLowerCase()] || data.notifications.english;
          setChatMessages(p => [...p, { sender: "received", text: `📱 NOTIFICATION\n${msg}`, time }]);
          fetchComplaints(); fetchHeatmap();
        }, 1500);
      }
    } catch (err) { addLog("Error", "Backend unreachable."); }
  };

  const updateComplaintStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/complaints/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (res.ok) { addLog("Status", `Updated to ${status.toUpperCase()}`); fetchComplaints(); if (selectedComplaint?.id === id) setSelectedComplaint(await res.json()); }
    } catch (err) { addLog("Error", "Update failed."); }
  };

  const handleTriggerSLACheck = async () => {
    addLog("SLA", "Polling...");
    try {
      const res = await fetch(`${API_BASE}/complaints/check-sla`, { method: 'POST' });
      if (res.ok) { const data = await res.json(); addLog("SLA", `Complete. Escalated ${data.escalated_count}`); fetchComplaints(); }
    } catch (err) { console.warn(err); }
  };

  if (view === 'landing') {
    return (
      <div className="landing-wrapper" onMouseMove={handleMouseMove}>
        <div className="landing-spotlight-1" style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px`, transition: 'left 0.3s ease-out, top 0.3s ease-out' }}></div>
        <div className="landing-spotlight-2"></div><div className="noise-overlay"></div>
        <header className="landing-nav">
          <div className="landing-logo-container"><span className="landing-logo">JanSeva AI</span><span className="brand-tag">v2.0</span></div>
          <nav className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a><a href="#workflow" className="landing-nav-link">Workflow</a><a href="#impact" className="landing-nav-link">Impact</a>
            <button className="btn btn-primary" style={{padding: '10px 24px', fontSize: '13px'}} onClick={() => setView('dashboard')}>LAUNCH SIMULATOR</button>
          </nav>
        </header>
        <main className="landing-hero">
          <div className="reveal-on-scroll">
            <div className="landing-badge">Next-Gen Governance</div>
            <h1 className="landing-headline"><span className="hollow">Intelligent Civic</span> <br /><span className="gradient-accent">Infrastructure Suite</span></h1>
            <p className="landing-description">JanSeva AI leverages agentic intelligence to bridge the gap between citizens and administration. Transcribe voice, spatial clusters, and automated SLA escalation for a friction-less city.</p>
            <div className="landing-ctas"><button className="btn-landing-primary" onClick={() => setView('dashboard')}>Launch Simulator <span>→</span></button><a href="#features" className="btn-landing-secondary">View Technology <span>↓</span></a></div>
          </div>
          <div className="hero-visual-container reveal-on-scroll delay-2">
            <div className="hero-dashboard-preview">
              <div className="preview-top-bar"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
              <div className="preview-content">
                <div className="floating-card card-1"><div style={{fontSize: '10px', color: 'var(--color-turf-green)', fontWeight: 800, marginBottom: '8px'}}>NEW COMPLAINT</div><div style={{fontWeight: 700, fontSize: '14px'}}>Water Leakage Detected</div></div>
                <div className="floating-card card-2"><div style={{fontSize: '10px', color: 'var(--color-clay-soil)', fontWeight: 800, marginBottom: '8px'}}>SLA STATUS</div><div style={{fontWeight: 700, fontSize: '14px'}}>Resolution in 3.2 Hours</div></div>
                <div style={{fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--color-soft-blush)', opacity: 0.5}}>JanSeva Dashboard Preview</div>
              </div>
            </div>
          </div>
          <section className="landing-trust-section reveal-on-scroll"><div className="trust-label">Adopted by Civic Departments</div><div className="trust-logos"><div className="trust-logo">Lucknow Jal Sansthan</div><div className="trust-logo">UP Power Corp</div><div className="trust-logo">Nagar Nigam</div><div className="trust-logo">PWD Lucknow</div></div></section>
          <section id="features" className="landing-features-grid reveal-on-scroll" style={{scrollMarginTop: '120px'}}>
            <div className="landing-feature-card delay-1">
              <div className="feature-tag">Cognitive Ingestion</div><div className="landing-feature-icon-wrapper"><div className="landing-feature-icon">🎙️</div><div className="icon-glow"></div></div>
              <h3 className="landing-feature-title">Dialect Mastery</h3><p className="landing-feature-desc">File grievances in Hindi, Awadhi, or 8+ regional dialects. Our LLM pipeline captures semantic intent, ensuring no citizen voice is lost.</p>
              <div className="feature-stats"><div className="f-stat"><span className="f-stat-val">10+</span><span className="f-stat-lbl">Dialects</span></div><div className="f-stat"><span className="f-stat-val">99%</span><span className="f-stat-lbl">Precision</span></div></div>
              <div className="feature-details"><div className="detail-item"><div className="detail-bullet"></div> Whisper-large-v3 core</div><div className="detail-item"><div className="detail-bullet"></div> Context-aware denoising</div></div>
            </div>
            <div className="landing-feature-card delay-2">
              <div className="feature-tag">Agentic Core</div><div className="landing-feature-icon-wrapper"><div className="landing-feature-icon">🤖</div><div className="icon-glow"></div></div>
              <h3 className="landing-feature-title">Intelligent Routing</h3><p className="landing-feature-desc">Autonomous dispatchers route tickets to the correct vibhag (Water, Roads, Power) with industrial-grade reliability.</p>
              <div className="feature-stats"><div className="f-stat"><span className="f-stat-val">&lt; 1s</span><span className="f-stat-lbl">Latency</span></div><div className="f-stat"><span className="f-stat-val">Auto</span><span className="f-stat-lbl">Dispatch</span></div></div>
              <div className="feature-details"><div className="detail-item"><div className="detail-bullet"></div> Multi-agent validation</div><div className="detail-item"><div className="detail-bullet"></div> Vibhag-specific logic</div></div>
            </div>
            <div className="landing-feature-card delay-3">
              <div className="feature-tag">SLA Protocol</div><div className="landing-feature-icon-wrapper"><div className="landing-feature-icon">⚡</div><div className="icon-glow"></div></div>
              <h3 className="landing-feature-title">Auto Escalation</h3><p className="landing-feature-desc">Integrated accountability loop. Unresolved issues trigger a hard-SLA escalator, notifying senior officials automatically.</p>
              <div className="feature-stats"><div className="f-stat"><span className="f-stat-val">24/7</span><span className="f-stat-lbl">Monitoring</span></div><div className="f-stat"><span className="f-stat-val">Zero</span><span className="f-stat-lbl">Stale Task</span></div></div>
              <div className="feature-details"><div className="detail-item"><div className="detail-bullet"></div> Commissioner alerts</div><div className="detail-item"><div className="detail-bullet"></div> Real-time tracking</div></div>
            </div>
            <div className="landing-feature-card delay-4">
              <div className="feature-tag">Spatial Intelligence</div><div className="landing-feature-icon-wrapper"><div className="landing-feature-icon">📍</div><div className="icon-glow"></div></div>
              <h3 className="landing-feature-title">Geospatial Sync</h3><p className="landing-feature-desc">Real-time deduplication groups similar issues in proximity, preventing redundant work and focusing resources.</p>
              <div className="feature-stats"><div className="f-stat"><span className="f-stat-val">10m</span><span className="f-stat-lbl">Precision</span></div><div className="f-stat"><span className="f-stat-val">Heat</span><span className="f-stat-lbl">Mapping</span></div></div>
              <div className="feature-details"><div className="detail-item"><div className="detail-bullet"></div> PostGIS indexing</div><div className="detail-item"><div className="detail-bullet"></div> Duplication guard</div></div>
            </div>
          </section>
          <section id="workflow" className="landing-interactive-section reveal-on-scroll" style={{scrollMarginTop: '120px'}}>
            <div>
              <h2 style={{fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '44px', marginBottom: '16px', color: 'var(--color-clay-soil)', letterSpacing: '-1.5px'}}>The Resolution Cycle</h2>
              <p style={{color: 'var(--text-secondary)', marginBottom: '48px', fontSize: '19px', maxWidth: '520px', lineHeight: 1.6}}>Our multi-agent architecture ensures every grievance follows a path from intake to closure.</p>
              <div className="pipeline-diagram">
                {[ { n: '01', t: 'Ingestion', d: 'Transcribes voice or text using high-fidelity LLMs.' }, { n: '02', t: 'Deduplication', d: 'Checks for overlaps using geospatial indexes.' }, { n: '03', t: 'Classification', d: 'Determines severity and initiates SLA timers.' }, { n: '04', t: 'Verification', d: 'Citizen verifies action and closes ticket.' } ].map((s, i) => (
                  <div key={i} className={`pipeline-stage ${landingTerminalLines.length >= (i+1)*2 ? 'active' : ''}`}><div className="stage-num">{s.n}</div><div className="stage-info"><div className="stage-title">{s.t}</div><div className="stage-desc">{s.d}</div></div></div>
                ))}
              </div>
            </div>
            <div className="landing-terminal">
              <div className="terminal-header">
                <div style={{display: 'flex', gap: '8px'}}><div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56'}}></div><div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e'}}></div><div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f'}}></div></div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><div className="pulse-dot" style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-willow-green)'}}></div><span className="terminal-title">Agentic Console Log</span></div>
                <div style={{width: '40px'}}></div>
              </div>
              <div className="terminal-body">
                {landingTerminalLines.length === 0 ? <div className="terminal-line cmd">Initializing...</div> : landingTerminalLines.map((l, i) => <div key={i} className={`terminal-line ${l.type || ''}`}>{l.type === 'cmd' ? <span style={{color: 'var(--color-willow-green)'}}>$ </span> : ''}{l.text}</div>)}
              </div>
            </div>
          </section>
          <section id="impact" className="landing-stats-row reveal-on-scroll" style={{scrollMarginTop: '120px'}}>
            <div className="landing-stat-card"><div className="landing-stat-val">2.4M</div><div className="landing-stat-lbl">Citizens Served</div></div>
            <div className="landing-stat-card"><div className="landing-stat-val">99.4%</div><div className="landing-stat-lbl">AI Accuracy</div></div>
            <div className="landing-stat-card"><div className="landing-stat-val">4.5h</div><div className="landing-stat-lbl">SLA Benchmark</div></div>
          </section>
          <section className="landing-final-cta reveal-on-scroll" style={{margin: '80px 0', padding: '100px 40px', background: 'white', borderRadius: '48px', border: '1px solid var(--border-color)', boxShadow: '0 40px 100px rgba(51, 115, 87, 0.05)', textAlign: 'center'}}>
            <h2 style={{fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 800, marginBottom: '24px', color: 'var(--color-clay-soil)'}}>Ready to transform governance?</h2>
            <button className="btn-landing-primary" style={{padding: '20px 48px'}} onClick={() => setView('dashboard')}>Start Simulation <span>→</span></button>
          </section>
        </main>
        <footer className="landing-footer" style={{padding: '80px 40px', background: 'rgba(255,255,255,0.3)'}}>
          <div className="footer-content" style={{display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '1280px', margin: '0 auto'}}>
            <div className="footer-info"><div className="landing-logo" style={{fontSize: '24px', marginBottom: '16px'}}>JanSeva AI</div><div className="footer-copy">Empowering citizens through intelligent technology.</div></div>
            <div className="footer-vibhag" style={{textAlign: 'right'}}><div style={{fontWeight: 800, color: 'var(--color-clay-soil)'}}>GOVERNMENT OF INDIA</div><div style={{color: 'var(--color-turf-green)'}}>Uttar Pradesh e-Governance</div></div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container" onMouseMove={handleMouseMove}>
      <div className="landing-spotlight-1" style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px`, transition: 'left 0.3s ease-out, top 0.3s ease-out', opacity: 0.1 }}></div>
      <div className="noise-overlay" style={{opacity: 0.1}}></div>
      <header className="header glass-panel" style={{marginBottom: '24px', padding: '20px 32px'}}>
        <div className="brand-section" onClick={() => setView('landing')} style={{cursor: 'pointer'}}>
          <div className="brand-logo" style={{fontSize: '24px'}}>JanSeva AI</div>
          <div className="brand-tag">Bureaucracy co-pilot</div>
        </div>
        <div className="role-switcher">
          <button className="btn btn-secondary" onClick={() => setView('landing')}>🏠 Home</button>
          <select className="select-input" value={role} onChange={(e) => { setRole(e.target.value); setSelectedComplaint(null); }}>
            <option value="citizen">Citizen Portal (WhatsApp)</option>
            <option value="officer">Department Officer</option>
            <option value="commissioner">Commissioner Dashboard</option>
            <option value="admin">System Admin</option>
          </select>
        </div>
      </header>

      <div className="dashboard-content">
        {role === 'citizen' && (
          <div className="dashboard-grid">
            <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div className="panel-title">Voice Intake Portal</div>
              <select className="select-input" style={{width: '100%'}} value={selectedTemplate} onChange={(e) => { setSelectedTemplate(parseInt(e.target.value)); if (e.target.value >= 0) setManualText(VOICE_TEMPLATES[e.target.value].text); }}>
                <option value="-1">-- Select Template --</option>
                {VOICE_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
              </select>
              <textarea className="form-textarea" rows="4" value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Describe your grievance..."></textarea>
              <div style={{display: 'flex', gap: '12px'}}>
                <button className="btn btn-secondary" onClick={startRecording}>🎙️ Record</button>
                <button className="btn btn-primary" style={{flex: 2, background: 'var(--color-turf-green)'}} onClick={handleSubmitGrievance}>🚀 FILE GRIEVANCE</button>
              </div>
              <div className="phone-mockup">
                <div className="phone-header"><div className="phone-avatar" style={{background: 'var(--color-willow-green)', color: 'var(--color-turf-green)'}}>JS</div><div className="phone-info"><span className="phone-name" style={{color: '#ffffff'}}>JanSeva AI (U.P. Govt)</span><span className="phone-status">Online · Trusted Agent</span></div></div>
                <div className="phone-messages">{chatMessages.map((m, i) => <div key={i} className={`message ${m.sender}`}>{m.text}</div>)}</div>
              </div>
            </div>
            <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
              <div className="panel-title">District Grievance Ledger</div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', height: '640px'}}>
                <div className="complaint-list" style={{maxHeight: '600px'}}>
                  {complaints.map(c => (
                    <div key={c.id} className={`complaint-card ${selectedComplaint?.id === c.id ? 'active' : ''}`} onClick={() => setSelectedComplaint(c)}>
                      <div className="card-header"><span className="card-title">{c.title || "Untitled Issue"}</span><span className={`badge badge-${c.severity?.toLowerCase()}`}>{c.severity}</span></div>
                      <div className="card-meta"><span>📍 {c.category}</span><span>{c.status?.toUpperCase()}</span></div>
                    </div>
                  ))}
                </div>
                <div className="detail-view-sidebar">
                  {selectedComplaint ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                      <h3>{selectedComplaint.title}</h3>
                      <p>"{selectedComplaint.description}"</p>
                      <div className="detail-row" style={{background: 'rgba(51,115,87,0.03)', padding: '20px', borderRadius: '16px'}}>
                        <div><div className="detail-lbl">Status</div><div className={`status-badge status-${selectedComplaint.status}`}>{selectedComplaint.status}</div></div>
                        <div><div className="detail-lbl">SLA</div><div className="detail-val">{selectedComplaint.sla_hours}h</div></div>
                        <div><div className="detail-lbl">Vibhag</div><div className="detail-val">{selectedComplaint.assigned_department?.name || 'In-Routing'}</div></div>
                        <div><div className="detail-lbl">Address</div><div className="detail-val">{selectedComplaint.address}</div></div>
                      </div>
                    </div>
                  ) : <div style={{textAlign: 'center', opacity: 0.5, marginTop: '140px'}}>Select a grievance.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {role === 'officer' && (
          <div className="dashboard-grid">
            <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div className="panel-title" style={{marginBottom: 0}}>Department Active Queue</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(51, 115, 87, 0.08)', padding: '6px 12px', borderRadius: '20px'}}>
                  <div className="pulse-dot" style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-turf-green)'}}></div>
                  <span style={{fontSize: '10px', fontWeight: 800, color: 'var(--color-turf-green)'}}>LIVE STREAM</span>
                </div>
              </div>
              <div className="complaint-list" style={{maxHeight: '600px'}}>
                {complaints.filter(c => c.status !== 'closed' && !c.is_duplicate).map(c => (
                  <div key={c.id} className={`complaint-card ${selectedComplaint?.id === c.id ? 'active' : ''}`} onClick={() => setSelectedComplaint(c)}>
                    <div className="card-header"><span className="card-title">{c.title}</span><span className={`badge badge-${c.severity?.toLowerCase()}`}>{c.severity}</span></div>
                    <div className="card-meta"><span>🕒 {new Date(c.created_at).toLocaleTimeString()}</span><span>{c.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel">
              <div className="panel-title">Officer Workspace</div>
              {selectedComplaint ? (
                <div className="detail-view">
                  <div className="detail-section"><div className="detail-lbl">Description</div><div className="detail-val" style={{background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px'}}>"{selectedComplaint.description}"</div></div>
                  <div className="detail-row"><div><div className="detail-lbl">SLA</div><div className="detail-val" style={{color: 'var(--color-clay-soil)', fontWeight: 800}}>{selectedComplaint.sla_hours}h Left</div></div></div>
                  <div style={{display: 'flex', gap: '16px', marginTop: '32px'}}>
                    <button className="btn btn-primary" style={{flex: 1.5, background: 'var(--color-turf-green)', fontWeight: 800}} onClick={() => updateComplaintStatus(selectedComplaint.id, 'resolved')}>✅ MARK RESOLVED</button>
                    <button className="btn btn-secondary" style={{flex: 1}} onClick={() => updateComplaintStatus(selectedComplaint.id, 'escalated')}>⚠️ ESCALATE</button>
                  </div>
                </div>
              ) : <div style={{textAlign: 'center', opacity: 0.5, marginTop: '140px'}}>Select an incident.</div>}
            </div>
          </div>
        )}

        {role === 'commissioner' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <div className="metrics-row">
              <div className="metric-card"><span className="metric-lbl">📊 Total</span><span className="metric-val">{complaints.length}</span></div>
              <div className="metric-card"><span className="metric-lbl">🚨 Escalated</span><span className="metric-val" style={{color: 'var(--color-clay-soil)'}}>{complaints.filter(c => c.status === 'escalated').length}</span></div>
              <div className="metric-card"><span className="metric-lbl">✅ Resolved</span><span className="metric-val" style={{color: 'var(--color-willow-green)'}}>{complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length}</span></div>
              <div className="metric-card"><span className="metric-lbl">⚡ Avg SLA</span><span className="metric-val">3.4h</span></div>
            </div>
            <div className="glass-panel">
              <div className="panel-title">Strategic Heatmap</div>
              <div className="map-container" style={{height: '480px'}}>
                <svg className="map-svg" viewBox="0 0 400 400"><path d="M50 50 L350 50 L350 350 L50 350 Z" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1" /></svg>
                {complaints.map(c => <div key={c.id} className="map-dot pulse-dot" style={{left: `${(c.lng - 80.9) * 2000}px`, top: `${(26.9 - c.lat) * 2000}px`, backgroundColor: c.status === 'escalated' ? 'var(--color-clay-soil)' : 'var(--color-turf-green)', width: '14px', height: '14px'}} />)}
              </div>
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="glass-panel">
            <div className="panel-title">System Administration</div>
            <div className="metrics-row">
              <div className="metric-card"><span className="metric-lbl">LLM TOKENS</span><span className="metric-val">124k</span></div>
              <div className="metric-card"><span className="metric-lbl">DEDUP SAVINGS</span><span className="metric-val">18%</span></div>
              <div className="metric-card"><span className="metric-lbl">ACTIVE AGENTS</span><span className="metric-val">4</span></div>
            </div>
          </div>
        )}

        <div className="glass-panel" style={{marginTop: '24px', background: 'rgba(10,15,12,0.95)', color: 'var(--color-willow-green)', padding: '24px', borderRadius: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <div className="panel-title" style={{color: '#ffffff', borderLeft: 'none', paddingLeft: 0, marginBottom: 0}}>Real-time Agentic Pipeline Logs</div>
            <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)'}}>KERNEL SECURE · ENCRYPTED</div>
          </div>
          <div className="terminal-log" style={{background: 'transparent', height: '160px', border: 'none', padding: 0}}>
            {logMessages.slice(-10).map((log, i) => (
              <div key={i} className="log-entry" style={{animation: 'typingLine 0.2s ease-out forwards', marginBottom: '4px'}}>
                <span style={{opacity: 0.4, marginRight: '10px'}}>[{log.time}]</span> 
                <span style={{color: '#ffffff', fontWeight: 700, marginRight: '10px'}}>[{log.tag.toUpperCase()}]</span> 
                <span>{log.text}</span>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
