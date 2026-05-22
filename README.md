# JanSeva AI — Jansunwai Grievance Resolution Agent

> **GDG Lucknow Hackathon · Problem Statement PS-07 · Government Track**
> 
> *An AI-powered autonomous grievance management platform for UP Jansunwai that enables voice-first complaint filing, vernacular accessibility, autonomous department coordination, predictive governance analytics, and intelligent escalation workflows.*

---

## 1. The Problem
UP's [Jansunwai portal](https://jansunwai.up.nic.in) receives **over 3 crore complaints** since inception—yet resolution is painfully slow, manual, and opaque:
- **Manual Routing & Delay:** Complaints are manually routed across bureaucratic layers, leading to heavy delays.
- **Duplicate Overload:** Citizens file the same grievance multiple times, overloading department officers.
- **Accessibility Barriers:** Semi-literate or rural citizens find text-only forms hard to navigate.
- **Lack of Follow-up:** SLA monitoring is manual, with no proactive alerts when deadlocks occur.
- **Opaque Updates:** Status messages, if sent, are in complex bureaucratic English/Hindi that citizens can't understand.

---

## 2. Core Objectives
- **Voice-First Filing:** Enable citizens to file grievances naturally in Hindi or Awadhi via voice notes.
- **Autonomous Classification & Routing:** Classify complaint urgency/category and route immediately to the correct officer.
- **Semantic Deduplication:** Cluster duplicate complaints using semantic similarity models to prevent system gaming.
- **Proactive SLA & Escalation:** Auto-track deadlines and autonomously escalate tickets up the hierarchy on breach.
- **Vernacular Communication:** Provide updates in regional dialects (Hindi/Awadhi) via WhatsApp/SMS.
- **Predictive Hotspot Mapping:** Empower municipal authorities with heatmaps and predictive analytics for seasonal issues.

---

## 3. System Architecture

```
                       ┌────────────────────────────────┐
                       │      Citizen Intake Layer      │
                       │    (WhatsApp Voice / Web UI)   │
                       └───────────────┬────────────────┘
                                       │
                                       ▼
                       ┌────────────────────────────────┐
                       │          FastAPI App           │
                       │      (Intake & Ingestion)      │
                       └───────────────┬────────────────┘
                                       │
                                       ▼
                       ┌────────────────────────────────┐
                       │   LangGraph Agent Orchestrator  │
                       │                                │
                       │   ┌────────────────────────┐   │
                       │   │   Intake & OCR Agent   │   │
                       │   └───────────┬────────────┘   │
                       │               │                │
                       │   ┌───────────▼────────────┐   │
                       │   │  Classification Agent  │   │
                       │   └───────────┬────────────┘   │
                       │               │                │
                       │   ┌───────────▼────────────┐   │
                       │   │     Routing Agent      │   │
                       │   └───────────┬────────────┘   │
                       │               │                │
                       │   ┌───────────▼────────────┐   │
                       │   │  Fraud/Duplicate Agent │   │
                       │   └───────────┬────────────┘   │
                       │               │                │
                       │   ┌───────────▼────────────┐   │
                       │   │  SLA Monitoring Agent  │   │
                       │   └───────────┬────────────┘   │
                       │               │                │
                       │   ┌───────────▼────────────┐   │
                       │   │  Notification Agent    │   │
                       │   └────────────────────────┘   │
                       └───────────────┬────────────────┘
                                       │
                                       ▼
                       ┌────────────────────────────────┐
                       │   Database & State Store       │
                       │ (PostgreSQL + Qdrant Vector DB)│
                       └────────────────────────────────┘
```

---

## 4. Multi-Agent System Design

The core of JanSeva AI is a multi-agent system orchestrating the lifecycle of a grievance:

1. **Intake Agent:** Handles intake via voice (using transcription tools like Whisper), text, and images (OCR/Vision analysis to extract GPS coordinates and evaluate damage severity).
2. **Classification Agent:** Classifies complaint category (Roads, Encroachment, Waste, Electricity, Corruption, etc.) and sets severity/priority scores.
3. **Routing Agent:** Maps complaints directly to the ward-level, district-level, or department-level officer using the UP Government org chart.
4. **SLA Monitoring Agent:** Tracks deadlines, sends auto-reminders to officers, and escalates to supervisors if resolution SLAs are breached.
5. **Citizen Communication Agent:** Formulates personalized status updates in local dialects (Hindi/Awadhi) and pushes them via WhatsApp/SMS.
6. **Analytics Agent:** Generates real-time geospatial heatmaps, seasonal trend analysis, and officer performance rankings.
7. **Fraud Detection Agent:** Detects bot-generated, spam, or fake complaints using behavioral and validation rules.

---

## 5. Key Features

- **Voice-First Filing:** Transcribe Awadhi/Hindi audio and extract structured data automatically.
- **Image Evidence Processing:** Extract GPS metadata from uploaded photos and score structural damage using vision models.
- **Duplicate Ticket Clustering:** Semantic similarity detection groups redundant complaints into "Master Tickets."
- **Emergency Bypass:** Fast-tracks life-threatening or hazard complaints (e.g. fire, medical, collapsing structures) directly to critical responders.
- **Digital Evidence Vault:** Secure and immutable storage for complaints, photos, and compliance history.
- **Accountability Intelligence:** Detects suspicious closing patterns (e.g., officers closing tickets without physical inspection).
- **Offline Filing Support:** Fallback SMS service for rural regions with low data connectivity.

---

## 6. Recommended Tech Stack

- **Frontend:** Next.js (React) / Vite SPA, TailwindCSS, Framer Motion
- **Backend:** FastAPI, Python 3.12, Celery & Redis
- **AI/ML:** Gemini (for reasoning, classification, and vision processing), Whisper API (speech-to-text)
- **Agent Orchestration:** LangGraph / CrewAI
- **Database:** PostgreSQL (structured logs/complaints), Qdrant / ChromaDB (for vector semantic search/deduplication)
- **Messaging:** WhatsApp Business Cloud API / Twilio SMS

---

## 7. Database Entities
- **Users:** Credentials and roles (Citizen, Department Officer, Supervisor, State Authority).
- **Complaints:** Intake details, status, transcript, category, priority, and assigned department/officer.
- **Departments:** Organization hierarchy, department rules, and officer mapping.
- **Escalation Logs:** SLA records, deadline timer history, and officer warnings.
- **Satisfaction Reports:** Sentiment scores and feedback gathered after closure.
- **Evidence Files:** Safe links to images/audio and extracted metadata.
- **Officer Performance Records:** Metrics on response times and resolution speed benchmarks.

---

## 8. Development Roadmap

- [ ] **Phase 1: Project Setup & DB Schema**
  - Initialize FastAPI backend & Vite React frontend workspace.
  - Setup PostgreSQL schemas (SQLAlchemy) and vector database connections.
- [ ] **Phase 2: Intake & Classification Engine**
  - Implement Whisper-based transcription pipeline.
  - Integrate Gemini for complaint classification, extraction, and vision severity assessment.
- [ ] **Phase 3: Routing & SLA Escalation Daemon**
  - Build municipal org graph and routing agent.
  - Setup Celery/scheduler jobs for SLA monitoring and ticket escalation.
- [ ] **Phase 4: Deduplication & Fraud Detection**
  - Implement semantic embeddings for duplicate clustering.
  - Add fraud detection algorithms (geo-fencing and spam scoring).
- [ ] **Phase 5: Dashboards & WhatsApp Simulator**
  - Create Citizen WhatsApp Simulator UI.
  - Develop Officer and Admin analytics dashboards with heatmaps.

---

## 9. Setup Instructions (Development)

To get started with the project locally:

### Prerequisites
- Python 3.11+
- Node.js 18+
- SQLite/PostgreSQL
- Gemini API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure your environment:
   ```bash
   cp .env.example .env
   # Populate GEMINI_API_KEY, Database URL, etc.
   ```
4. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

*Built by Team NodeZero for GDG Lucknow Agentic Premier League Hackathon.*
