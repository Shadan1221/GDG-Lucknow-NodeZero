# JanSeva AI — Jansunwai Grievance Resolution Agent

> **GDG Lucknow Hackathon · Problem Statement PS-07 · Government Track**

---

## The Problem

UP's [Jansunwai portal](https://jansunwai.up.nic.in) receives **over 3 crore complaints** since inception — yet resolution is painfully slow and opaque. Citizens file a grievance and hear nothing for weeks. Departments receive complaints they aren't equipped to handle. Follow-ups are manual. Status updates, if they come at all, arrive in bureaucratic English that most UP residents can't parse.

**The result**: crores of unresolved grievances, eroding public trust in government.

---

## Our Solution

**JanSeva AI** is a fully autonomous, multi-agent system that transforms the Jansunwai pipeline from end to end.

```
Citizen files grievance
        │
        ▼
┌───────────────────┐
│  Classification   │  ← LLM agent classifies complaint type, urgency, jurisdiction
│      Agent        │    (road, water, electricity, encroachment, corruption…)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   Routing Agent   │  ← Maps complaint to the exact department + officer
│                   │    Cross-checks UP government org chart + LNN rules
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   Follow-up Agent │  ← Autonomous escalation: pings dept, logs silence,
│                   │    re-routes if SLA breached, flags chronic non-responders
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Citizen Notifier │  ← WhatsApp / SMS updates in Hindi & Awadhi
│      Agent        │    "Aapki shikayat concerned vibhag ko bhej di gayi hai…"
└───────────────────┘
```

---

## Key Features

| Feature | Detail |
|---|---|
| **Auto-Classification** | Fine-tuned classifier across 40+ complaint categories using historical Jansunwai data |
| **Smart Routing** | Rule-based + LLM hybrid maps each complaint to the right dept/sub-dept at state/district/ward level |
| **Autonomous Follow-up** | Cron-driven agent checks SLA timers; escalates to senior officers after 72h silence |
| **Vernacular Updates** | Status messages generated in Hindi and Awadhi, delivered via WhatsApp Business API |
| **Fraud & Duplicate Detection** | Embeddings-based deduplication prevents spam complaints and gaming the system |
| **Dashboard** | Real-time resolution analytics for department heads and citizens |

---

## Tech Stack

```
Backend         FastAPI · Python 3.12
AI/Agents       Claude claude-sonnet-4-6 (Anthropic) · LangGraph for multi-agent orchestration
Classification  Fine-tuned sentence-transformers on Jansunwai complaint corpus
Database        Supabase (PostgreSQL + pgvector for semantic dedup)
Messaging       WhatsApp Business Cloud API · Twilio SMS fallback
Queue           Redis + Celery for async agent pipelines
Deployment      Docker · Railway / Render
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    JanSeva AI System                     │
│                                                         │
│  ┌──────────┐    ┌──────────────────────────────────┐  │
│  │ WhatsApp │───▶│         Intake API               │  │
│  │  / Web   │    │  (validates, deduplicates,        │  │
│  └──────────┘    │   stores in Supabase)             │  │
│                  └──────────────┬───────────────────┘  │
│                                 │                        │
│                  ┌──────────────▼───────────────────┐  │
│                  │     LangGraph Agent Orchestrator   │  │
│                  │                                    │  │
│                  │  ClassifierAgent → RouterAgent     │  │
│                  │        → FollowUpAgent             │  │
│                  │        → NotifierAgent             │  │
│                  └──────────────┬───────────────────┘  │
│                                 │                        │
│          ┌──────────────────────▼──────────────┐        │
│          │         Supabase (State Store)       │        │
│          │  complaints · routing_log · sla_log  │        │
│          └─────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

---

## Why This Wins

**Impact at scale** — UP has 25 crore citizens. Even a 20% improvement in grievance resolution velocity affects millions of lives directly.

**Technically deep** — Multi-agent orchestration with real state management, SLA timers, escalation trees, and vernacular NLG in a single coherent system. This is not a chatbot; it is an autonomous bureaucratic co-pilot.

**Demo-able in 3 minutes** — File a grievance in Hindi on WhatsApp → watch agents classify, route, and confirm in real-time on screen. Judges see the entire pipeline live.

**Local context nailed** — Built around Lucknow Nagar Nigam's actual department structure and the Jansunwai portal's known pain points.

**Extensible** — The same agent framework can be dropped into any state's grievance system. The real TAM is all of India.

---

## Team

**Team NodeZero** · GDG Lucknow Hackathon 2025

---

## Getting Started

```bash
git clone https://github.com/Shadan1221/GDG-Lucknow-NodeZero
cd GDG-Lucknow-NodeZero
cp .env.example .env        # add your API keys
docker compose up --build
```

Open `http://localhost:8000/docs` for the API playground.

---

## Roadmap

- [ ] Complaint intake API + Supabase schema
- [ ] ClassifierAgent with fine-tuned Hindi NLP model
- [ ] RouterAgent with UP government department graph
- [ ] FollowUpAgent with SLA engine
- [ ] WhatsApp notifier in Hindi + Awadhi
- [ ] Live demo dashboard
- [ ] Integration mock with Jansunwai portal API

---

*Built at GDG Lucknow Hackathon — because every citizen deserves to know their complaint was heard.*
