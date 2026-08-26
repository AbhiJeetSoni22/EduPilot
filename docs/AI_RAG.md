# AI & RAG Architecture Specification — Exam & Academic Assistant (EduPilot)

This document outlines the planned design for the **AI Understanding**, **Query Context Processing**, and **Retrieval-Augmented Generation (RAG)** pipeline.

---

## 1. Overview & Dual-Layer Retrieval Pipeline

```text
Student Natural Language Query
       │
       ▼
[Backend Node.js Orchestrator]
       │
       ├─► 1. Intent Detection & Entity Extraction (Gemini)
       │       - Identify Intent (e.g. `exam_schedule`, `syllabus_breakdown`, `attendance_policy`)
       │       - Extract Entities (Subject: `CS501`, Term: `End-Sem`)
       │
       ├─► 2. Missing Context Evaluation (Query Context)
       │       - Check if required context is missing (e.g. needs `department` + `semester`)
       │       - If missing: Return prompt asking user conversationally
       │       - If present: Assemble QueryContext filter
       │
       ├─► 3. Context Retrieval Layer:
       │       ├── Structured DB Query (MongoDB: exact dates, subjects, credits)
       │       └── Semantic Vector Search (Atlas Vector Search: regulations, handbooks)
       │
       ├─► 4. Grounded Synthesis Prompt Assembly
       │       - Inject verified facts & exact citations
       │       - Enforce anti-hallucination constraints
       │
       └─► 5. Final Response Generation (Gemini)
               │
               ▼
       Formatted Grounded Response Delivered to Student
```

---

## 2. The Query Context Architecture

### A. Concept & Purpose
Students interact with the chatbot without authentication. However, some academic questions require specific context to retrieve accurate information.

We define **Query Context** as an optional set of conversational parameters:

```typescript
export interface QueryContext {
  rollNumber?: string;
  department?: string;
  program?: string;
  semester?: number;
  academicYear?: string;
  subject?: string;
}
```

### B. Conversational Context Resolution Examples

| Student Question | Intent | Required Context | Action Taken |
| :--- | :--- | :--- | :--- |
| *"What is DBMS?"* | `concept_explanation` | None | Direct academic explanation |
| *"What is the DBMS syllabus?"* | `syllabus_query` | Subject (`DBMS` / `CS501`) | Query subject collection directly |
| *"When is my next exam?"* | `exam_schedule` | `department` + `semester` | Assistant asks: *"Please provide your department and semester."* |
| *"CSE semester 5"* *(Follow-up)* | `context_response` | Received: `CSE`, `Sem 5` | Backend queries MongoDB for upcoming CSE Sem 5 exams and responds |

> [!IMPORTANT]
> **Query Context != Identity Verification**:
> A roll number or department provided in conversation is strictly used to query public academic timetables. It is never treated as a secret token or proof of identity, and private student records are never exposed.

---

## 3. Separation of Responsibilities

### A. Google Gemini AI Layer (Phase 3 & Phase 4)
- **Natural Language Understanding (NLU)**: Parse student queries across informal phrasing, abbreviations, and course codes.
- **Intent & Missing Context Detection**: Classify query goals and detect missing required context.
- **Response Synthesis**: Synthesize retrieved structured database facts and RAG PDF excerpts into clear, bulleted answers.
- **Tone & Citations**: Authoritative, concise academic assistant tone with official circular and handbook citations.

### B. Backend Node.js / Express Orchestrator
- **Request Validation**: Sanitizes payloads and ensures safe query execution.
- **API Key Isolation**: Server-side storage for `GEMINI_API_KEY`; never exposed to the client.
- **Query Routing**: Directs queries to MongoDB structured collections vs RAG vector search indices.
- **Prompt Templating**: Assembles grounded system instructions containing official data.

### C. Academic RAG & Vector Search Layer (Phase 4)
- **Document Ingestion**: Parsing official PDFs (handbooks, exam rules, syllabus books).
- **Semantic Chunking**: Partitioning documents with token overlap.
- **Embeddings Generation**: Transforming chunks into vector embeddings via Gemini embedding models (`text-embedding-004`).
- **Vector Search**: Cosine similarity matching in MongoDB Atlas Vector Search.

---

## 4. Grounding Policy & Strict Anti-Hallucination Boundaries

1. **Zero Guessing on Institutional Facts**: Gemini must never fabricate exam dates, pass marks, or attendance criteria.
2. **Graceful Fallback**: When relevant information does not exist in MongoDB or indexed PDFs, the assistant explicitly states:
   > *"I could not find official information regarding this in the published academic regulations. Please consult your departmental academic advisor or the examination cell."*
