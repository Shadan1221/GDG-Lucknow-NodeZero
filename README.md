# Awaaz-e-Awadh — Autonomous Grievance Resolution Agent

> **GDG Lucknow Hackathon · Problem Statement PS-07 · Government Track**
>
> *An AI-powered autonomous grievance management platform that enables voice-first complaint filing, vernacular accessibility, autonomous department coordination, predictive governance analytics, and intelligent escalation workflows — built for the citizens of Uttar Pradesh.*

---

## 1. The Problem

UP's [Jansunwai portal](https://jansunwai.up.nic.in) receives **over 3 crore complaints** since inception — yet resolution is painfully slow, manual, and opaque:

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
                       │   LangGraph Agent Orchestrator │
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
                       │        (SQLite via SQLAlchemy) │
                       └────────────────────────────────┘
```

---

## 4. Multi-Agent System Design

The core of Awaaz-e-Awadh is a multi-agent system orchestrating the lifecycle of a grievance:

1. **Intake Agent:** Handles intake via voice (Gemini transcription), text, and images (Vision analysis to extract GPS coordinates and evaluate damage severity).
2. **Classification Agent:** Classifies complaint category (Roads, Encroachment, Waste, Electricity, Corruption, etc.) and sets severity/priority scores.
3. **Routing Agent:** Maps complaints directly to the ward-level, district-level, or department-level officer using the UP Government org chart.
4. **SLA Monitoring Agent:** Tracks deadlines, sends auto-reminders to officers, and escalates to supervisors if resolution SLAs are breached.
5. **Citizen Communication Agent:** Formulates personalized status updates in 10 local dialects (Hindi, Awadhi, Tamil, Telugu, Kannada, Marathi, Gujarati, Bengali, Punjabi, Malayalam) via WhatsApp/SMS.
6. **Analytics Agent:** Generates real-time geospatial heatmaps, seasonal trend analysis, and officer performance rankings.
7. **Fraud Detection Agent:** Detects bot-generated, spam, or fake complaints using behavioral and validation rules.

---

## 5. Key Features

- **Voice-First Filing:** Transcribe Awadhi/Hindi audio and extract structured data automatically using Gemini 2.5 Flash.
- **Image Evidence Processing:** Upload photos as supporting evidence — vision models score severity and extract context.
- **Duplicate Ticket Clustering:** Semantic similarity detection groups redundant complaints into "Master Tickets."
- **Emergency Bypass:** Fast-tracks life-threatening or hazard complaints (e.g. fire, medical, collapsing structures) directly to critical responders.
- **Digital Evidence Vault:** Secure storage for complaints, photos, and compliance history in SQLite.
- **Accountability Intelligence:** Detects suspicious closing patterns (e.g., officers closing tickets without physical inspection).
- **Government Admin Panel:** Dashboard for officials to view, filter, and update complaint statuses in real-time.
- **Vernacular WhatsApp Simulator:** Shows citizens multilingual confirmation messages in their native language.

---

## 6. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, Vanilla CSS, Leaflet.js (maps) |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy ORM |
| **AI / ML** | Google Gemini 2.5 Flash (transcription, classification, vision) |
| **Agent Orchestration** | Custom multi-agent pipeline (orchestrator.py) |
| **Database** | SQLite (dev) — PostgreSQL-compatible via SQLAlchemy |
| **Auth** | JWT (python-jose) |

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

- [x] **Phase 1: Project Setup & DB Schema**
  - FastAPI backend & Vite React frontend workspace initialized.
  - SQLite schemas (SQLAlchemy) with auto-seeding of roles and departments.
- [x] **Phase 2: Intake & Classification Engine**
  - Gemini 2.5 Flash transcription pipeline with keyword fallback.
  - Complaint classification, extraction, and vision severity assessment.
- [x] **Phase 3: Routing & SLA Escalation**
  - Municipal department routing agent.
  - SLA monitoring and auto-escalation on deadline breach.
- [x] **Phase 4: Deduplication & Fraud Detection**
  - Duplicate detection using complaint similarity scoring.
  - Fraud/spam complaint flagging.
- [x] **Phase 5: Dashboards & WhatsApp Simulator**
  - Citizen WhatsApp Simulator UI with 10-language support.
  - Government Admin Panel with complaint management and heatmaps.
  - Citizen filing portal with voice recording, image upload, and live tracking.

---

## 9. Setup Instructions (Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Gemini API Key (set in `.env`)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your GEMINI_API_KEY to .env
uvicorn app.main:app --port 8000
```

The server starts at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

---

## 10. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/complaints/ingest` | Submit a new complaint (voice/text/image) |
| `GET` | `/api/complaints` | List all complaints (filterable by status/category) |
| `GET` | `/api/complaints/heatmap` | Geo-coordinates for map visualization |
| `GET` | `/api/complaints/{id}` | Get a specific complaint |
| `PATCH` | `/api/complaints/{id}` | Update complaint status (Admin/Officer) |
| `POST` | `/api/complaints/{id}/resolve` | Mark complaint as resolved |
| `POST` | `/api/complaints/{id}/feedback` | Submit citizen satisfaction feedback |
| `POST` | `/api/complaints/check-sla` | Trigger SLA escalation check |
| `POST` | `/api/complaints/transcribe` | Standalone audio transcription |

---

## 11. Team Members

| Name | Role |
|---|---|
| **Mohammad Qambar Syed** | AI/ML Engineer & Backend Developer |
| **Ahmad Shadan Taiyabi** | Frontend Developer & UI/UX Designer |

---

*Built by Team NodeZero for GDG Lucknow Agentic Premier League Hackathon.*
