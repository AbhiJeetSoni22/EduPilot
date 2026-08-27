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
            │       - Preserve pending intent during clarification without synthetic queries
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
            │       │                                 ├── SubjectService          ──► MongoDB (Dept/Sem/Subj)
            │       │                                 ├── ExamService             ──► MongoDB (Dept/Sem/Subj)
            │       │                                 ├── AssignmentService       ──► MongoDB (Dept/Sem/Subj)
            │       │                                 ├── AcademicCalendarService ──► MongoDB (Events)
            │       │                                 └── RegulationService       ──► MongoDB (Rules)
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
- **Academic Query Services**: Dedicated `SubjectService`, `ExamService`, `AssignmentService`, `AcademicCalendarService`, and `RegulationService` with departmental and program filtering.
- **Parameter Validation & Sanitization**: `ParameterValidator` preventing query injection and regex attacks.
- **Zero-Hallucination Response Generator**: `ResponseGeneratorService` grounding responses strictly in verified MongoDB records.
- **Deterministic Multi-Turn Context Continuation**: Preserves pending `queryAnalysis` intent across clarification turns without synthetic query strings.
- **Conversation State**: Mongoose `Conversation` model with message histories and accumulated `queryContext`.
- **Public Chat API & UI**: `POST /api/chat`, `GET /api/chat/:id`, and interactive `ChatInterface.tsx` frontend component with 2-column home page layout.

### Implemented in Phase 4 (Knowledge Base & Vector Search Foundation)
- **PDF Text Extraction**: Page-boundary preserving extraction via `PdfExtractorService`.
- **Structure & Metadata Understanding**: Heuristic academic entity extraction via `MetadataExtractorService` with immutable admin context attachment.
- **Section-Aware Chunking**: `ChunkingService` with configurable window sizes (~800 chars) and overlap (~120 chars).
- **Gemini Embedding Provider**: `GeminiEmbeddingProvider` producing 768-dimensional vectors with batch processing support.
- **Knowledge Chunk Storage**: `KnowledgeChunk` model mapping to `knowledge_chunks` collection with strict 768-dimension schema validation.
- **MongoDB Atlas Vector Search Service**: `VectorSearchService` building `$vectorSearch` aggregation pipelines with dynamic metadata pre-filtering.
- **Admin Ingestion Interface**: Minimal Department + Program + PDF upload flow in Admin Knowledge Base portal.

### Planned for Phase 4 (Next Steps)
- Complete RAG response orchestration & prompt grounding with retrieved chunks.
- Structured DB to Vector Search fallback mechanisms.
- Grounded citations and exact source attribution (Document title + page number).
- Answerability evaluation and hybrid retrieval scoring.

---

## 5. Knowledge Base PDF Ingestion Architecture

```text
Admin Upload Portal (/admin/knowledge-base)
  Inputs: [Department ID, Program ID, PDF File]
             │
             │ POST /api/documents/upload (Admin JWT Auth)
             ▼
  [AcademicDocument Mongoose Record Created]
  (status: 'uploaded', department, program, storageReference)
             │
             ▼
  [DocumentIngestionService.processDocument]
             │
             ├─► 1. File Storage Read & Validation
             │       - Reads PDF from local storage filesystem
             │       - Sets document status = 'processing'
             │
             ├─► 2. PDF Page Extraction (PdfExtractorService)
             │       - Extracts text array: Array<{ pageNumber, text }>
             │       - Tracks total page count
             │
             ├─► 3. Academic Metadata Analysis (MetadataExtractorService)
             │       - Extracts optional: semester, subjectCode, subjectName, year, docType
             │       - Strictly binds immutable Admin Department + Program
             │
             ├─► 4. Semantic & Section Chunking (ChunkingService)
             │       - Splits page text into ~800-character chunks with 120-char overlap
             │       - Preserves pageNumber and chunkIndex
             │
             ├─► 5. Gemini 768-dim Embeddings (GeminiEmbeddingProvider)
             │       - Calls Gemini batchEmbedContents in batches of up to 50 items
             │       - Validates exactly 768 floating point dimensions per chunk
             │
             ├─► 6. MongoDB Knowledge Chunk Storage
             │       - Bulk inserts records into `knowledge_chunks` collection
             │       - Creates compound metadata pre-filter indexes
             │
             └─► 7. Document Status Finalization
                     - Sets status = 'ready', totalPages, totalChunks, processedAt
                     - In case of failure: status = 'failed' with safe human-readable error
```

