# System Architecture — Exam & Academic Assistant (EduPilot)

## 1. High-Level Architecture Overview

The **Exam & Academic Assistant (EduPilot)** is structured around two distinct operational pathways:
1. **Public Student & General User Query Pathway** (Unauthenticated, powered by conversational Query Context and AI retrieval)
2. **Administrative Management Pathway** (Authenticated & Authorized, governing official academic source-of-truth records)

```text
========================================================================================
1. PUBLIC STUDENT / USER PATHWAY (Zero Authentication, Open Academic Discovery)
========================================================================================

   Student / Public User
            │
            ▼
     EduPilot Chat UI (No login / registration required)
            │
            │ HTTPS (Natural Language Query + Optional QueryContext)
            ▼
  [Backend Node.js Orchestrator]
            │
            ▼
  [Gemini Question Understanding]
     - Intent Classification
     - Entity Extraction (Subject, Date, Exam)
     - Missing Context Detection
            │
            ├─► If Context Missing: Prompt User Conversationally (e.g. "Which semester?")
            │
            ▼
     Optional Query Context ({ department?, program?, semester?, academicYear? })
            │
            ▼
     [Retrieval Layer]
     ├── MongoDB Structured Data (Exams, Subjects, Timetables, Deadlines)
     └── RAG / Vector Search (Institutional Regulations, Circulars, Handbooks)
            │
            ▼
  [Gemini Response Generation]
     - Grounded synthesis, exact policy citations, zero hallucination
            │
            ▼
     Authoritative Conversational Response delivered to Student

========================================================================================
2. ADMINISTRATIVE MANAGEMENT PATHWAY (Protected Authority & Ingestion)
========================================================================================

   Institutional Administrator (Dean, Exam Cell, Department Head)
            │
            ▼
      Admin Login (/login)
            │
            ▼
   Backend Authentication (/api/auth/login)
      - Verifies bcrypt hashed credentials
      - Issues Admin JWT Session Token
            │
            ▼
   Admin Authorization Middleware (requireRole('admin'))
            │
            ▼
   Academic Management Portal (/admin)
      - Curriculum & Subject Configuration
      - Exam Timetable & Assignment Scheduling
      - PDF Document Ingestion (Knowledge Base)
      - Bulk CSV/JSON Data Import & Validation
            │
            ▼
   Protected Management APIs (POST, PUT, DELETE /api/*)
            │
            ▼
   MongoDB Database & Knowledge Base Storage
```

---

## 2. Core Architectural Distinction: Authentication vs Query Context

| Aspect | Authentication (Admin) | Query Context (Student / Public) |
| :--- | :--- | :--- |
| **Purpose** | Identity verification & privileged mutation authorization | Conversational query filtering & domain disambiguation |
| **Target User** | University Administrators & Staff | Students & General Campus Community |
| **Credentials Required** | Email & Password | None (Natural conversation responses) |
| **Mechanisms** | JWT Token (`Authorization: Bearer <token>`) | Parameters (`{ department, semester, subject, rollNumber }`) |
| **Access Rights** | Write, Update, Delete, Upload, Import | Read-only public curriculum, schedules, regulations |
| **Private Data Access** | Full management access | **None** (Private personal student records are never exposed) |

> [!IMPORTANT]
> **Roll Number is Query Context, NOT Identity Proof:**
> A roll number entered during conversation is used solely to disambiguate cohort/batch schedules. It does NOT grant access to private personal data (such as grades, individual attendance percentages, or disciplinary records).

---

## 3. Component Responsibilities

### A. Next.js Frontend
- **Public Chatbot & Home**: Direct access with zero authentication barriers or redirects.
- **Admin Portal (`/admin/*`)**: Guarded by `AdminGuard` component requiring valid Admin JWT session.
- **Client Separation**: Pure presentation layer consuming REST APIs. Never stores backend secrets.

### B. Node.js / Express Backend
- **Gatekeeper & Security**: Validates incoming payloads, protects mutation endpoints with `authenticateToken` and `requireRole('admin')`.
- **Public Endpoints**: Safe, read-only academic catalog endpoints with filter support.
- **AI Orchestration**: Houses `GEMINI_API_KEY` securely to execute prompt assembly, vector searches, and grounded responses.

### C. MongoDB Database & Atlas Vector Search
- **Structured Storage**: Mongoose models for Departments, Programs, Subjects, Exams, Assignments, Calendar Events, Regulations, Documents, and Admin Users.
- **Vector Search (Phase 4)**: Vector embeddings generated from institutional PDF chunks for semantic retrieval.

### D. Google Gemini AI Layer (Phase 3 & Phase 4)
- **Natural Language Understanding (NLU)**: Disambiguates informal student queries, extracts query context, identifies missing parameters, and synthesizes policy answers with citations.
- **Strict Anti-Hallucination Policy**: Gemini operates strictly as an orchestrator and synthesizer grounded by database and vector search records, never as an ungrounded oracle.
