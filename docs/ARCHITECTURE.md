# System Architecture — Exam & Academic Assistant (EduPilot)

## 1. High-Level Architecture Overview

The **Exam & Academic Assistant (EduPilot)** is structured around two distinct operational pathways:
1. **Public Student & General User Query Pathway** (Unauthenticated, powered by conversational Query Context and AI retrieval)
2. **Administrative Management Pathway** (Authenticated & Authorized, governing official academic source-of-truth records)

```text
========================================================================================
1. CONVERSATIONAL AI & CHATBOT PATHWAY (Phase 3 Completed Architecture)
========================================================================================

   Student / Public User
            │
            ▼
     EduPilot Chat UI (components/ChatInterface.tsx)
            │
            │ POST /api/chat { message, conversationId?, queryContext? }
            ▼
  [Backend Node.js Orchestrator]
            │
            ├─► 1. Session & Context Resolution (ConversationService)
            │       - Retrieve active session by conversationId
            │       - Merge existing session context with incoming queryContext
            │       - Identify pending intents for multi-turn follow-ups
            │
            ├─► 2. AI Query Analyzer (QueryAnalyzerService)
            │       - System Instruction & Few-Shot Prompts
            │       - Gemini structured JSON output (temperature=0.05)
            │       - Schema Validation & Normalization (validateAndNormalizeQueryAnalysis)
            │       - Output: Strongly typed QueryAnalysis
            │
            ├─► 3. Strategy Routing & Execution (OrchestratorService)
            │       ├── [ClarificationHandler]  ──► Returns status: "needs_context" + missingContext
            │       ├── [DirectHandler]         ──► Returns concept explanation / greeting
            │       ├── [StructuredHandler]     ──► ParameterValidator (Sanitization)
            │       │                                 ├── SubjectService          ──► MongoDB
            │       │                                 ├── ExamService             ──► MongoDB
            │       │                                 ├── AssignmentService       ──► MongoDB
            │       │                                 ├── AcademicCalendarService ──► MongoDB
            │       │                                 └── RegulationService       ──► MongoDB
            │       │                                      │
            │       │                                      ▼
            │       │                           [ResponseGeneratorService]
            │       │                           (Zero-hallucination grounded answer)
            │       │
            │       ├── [VectorHandler]         ──► Returns status: "retrieval_unavailable" (Phase 4)
            │       └── [HybridHandler]         ──► Returns status: "retrieval_unavailable" (Phase 4)
            │
            └─► 4. Turn Persistence & Response
                    - Appends turn to Conversation collection
                    - Delivers structured ChatResponsePayload to Student

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

## 3. Query Analysis & Execution Contract

```text
Student Message + Existing Context
              │
              ▼
   [QueryAnalyzerService]
              │
              ▼
  ┌────────────────────────────────────────────────────────┐
  │ QueryAnalysis Schema                                   │
  │ • intent: AcademicIntent                               │
  │ • entities: ExtractedEntities                          │
  │ • requiredContext: string[]                            │
  │ • providedContext: string[]                            │
  │ • missingContext: string[]                             │
  │ • retrievalStrategy: 'direct' | 'structured' |         │
  │                      'vector' | 'hybrid' |             │
  │                      'clarification'                   │
  │ • confidenceScore: number                              │
  │ • clarificationPrompt?: string                         │
  │ • reasoningSummary?: string                            │
  └────────────────────────────────────────────────────────┘
              │
              ▼
   [ParameterValidator Sanitization]
              │
              ▼
   [Academic Service Query Execution]
   (SubjectService, ExamService, AssignmentService, etc.)
              │
              ▼
   [ResponseGeneratorService]
   (Zero-hallucination grounded answer synthesis)
```

---

## 4. Phase 3 Implemented vs Phase 4 Planned Components

### Implemented in Phase 3
- **Gemini Service**: Isolated backend caller with structured JSON generation and timeout handling (`config.geminiModel`).
- **Query Analyzer Service**: Real-time NLU classification, entity parsing, context resolution, and strategy assignment.
- **Academic Query Services**: Dedicated `SubjectService`, `ExamService`, `AssignmentService`, `AcademicCalendarService`, and `RegulationService`.
- **Parameter Validation & Sanitization**: `ParameterValidator` preventing query injection and regex attacks.
- **Zero-Hallucination Response Generator**: `ResponseGeneratorService` grounding responses strictly in verified MongoDB records.
- **Multi-Turn Context Clarification**: Context merging and pending intent re-evaluation.
- **Conversation State**: Mongoose `Conversation` model with message histories and accumulated `queryContext`.
- **Public Chat API & UI**: `POST /api/chat`, `GET /api/chat/:id`, and interactive `ChatInterface.tsx` frontend component.

### Scheduled for Phase 4 (Academic RAG & Vector Search)
- PDF document parsing, text extraction, and chunking with token overlap.
- Vector embedding generation via Gemini embedding models (`text-embedding-004`).
- MongoDB Atlas Vector Search index integration and semantic retrieval.
- Exact excerpt citations and source page attribution.
