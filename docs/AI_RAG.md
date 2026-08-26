# AI & RAG Architecture Specification — Exam & Academic Assistant (EduPilot)

This document details the implemented **AI Query Analysis** pipeline (Phase 3) and the planned **Retrieval-Augmented Generation (RAG)** pipeline (Phase 4).

---

## 1. AI Query Analysis Architecture (Phase 3 Implemented)

```text
Student Natural Language Query + Active Context
       │
       ▼
[Backend Node.js Orchestrator]
       │
       ├─► 1. Query Analyzer (Gemini NLU / Deterministic Engine)
       │       - Intent Classification (e.g. `exam_schedule`, `subject_credits`)
       │       - Entity Extraction (Subject: `CS501`, Dept: `CSE`, Sem: `5`)
       │       - Context Resolution (Required vs Provided vs Missing)
       │       - Retrieval Strategy Assignment
       │
       ├─► 2. Schema Validation & Normalization (`validateAndNormalizeQueryAnalysis`)
       │
       ├─► 3. Strategy Routing:
       │       ├── 'clarification' ──► Prompt for missing context (e.g. "Which semester?")
       │       ├── 'direct'        ──► Concept definition or greeting
       │       ├── 'structured'    ──► Query MongoDB (Subjects, Exams, Deadlines)
       │       ├── 'vector'        ──► Policy intent recognition (Phase 4 RAG)
       │       └── 'hybrid'        ──► Combined structured + RAG pipeline
       │
       └─► 4. Grounded Synthesis & Response Assembly
               │
               ▼
       Formatted Grounded Response Delivered to Student
```

---

## 2. QueryAnalysis Schema & Contract

The backend uses a strict, strongly typed schema for all query analysis operations:

```typescript
export type RetrievalStrategy =
  | 'direct'
  | 'structured'
  | 'vector'
  | 'hybrid'
  | 'clarification';

export type AcademicIntent =
  | 'concept_explanation'
  | 'subject_credits'
  | 'syllabus_breakdown'
  | 'exam_schedule'
  | 'assignment_deadlines'
  | 'academic_calendar'
  | 'attendance_policy'
  | 'grading_policy'
  | 'academic_regulation'
  | 'hybrid_curriculum_policy'
  | 'general_inquiry'
  | 'context_response'
  | 'ambiguous'
  | 'unknown';

export interface ExtractedEntities {
  subject?: string;
  subjectCode?: string;
  department?: string;
  program?: string;
  semester?: number;
  academicYear?: string;
  examType?: string;
  date?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface QueryAnalysis {
  intent: AcademicIntent;
  entities: ExtractedEntities;
  requiredContext: string[];
  providedContext: string[];
  missingContext: string[];
  retrievalStrategy: RetrievalStrategy;
  confidenceScore?: number;
  clarificationPrompt?: string;
  reasoningSummary?: string;
}
```

---

## 3. Retrieval Strategy Taxonomies & Behaviors

| Strategy | When Used | Example Query | Action Taken |
| :--- | :--- | :--- | :--- |
| **`direct`** | General concepts, greetings, platform help where database search is unnecessary. | *"What is DBMS?"*, *"Hello"* | Directly explains concept; zero institutional facts fabricated. |
| **`structured`** | Facts residing in MongoDB structured collections (credits, exam timetables, assignment deadlines, calendar milestones). | *"How many credits does DBMS have?"*, *"When is the CSE Sem 5 exam?"* | Node.js executes Mongoose queries; Gemini synthesizes grounded facts. |
| **`vector`** | Institutional policies, regulations, circulars, handbooks intended for semantic document retrieval. | *"What is the attendance condonation policy?"* | Recognizes policy intent; baseline regulation summary; full PDF search in Phase 4. |
| **`hybrid`** | Combined inquiries requiring both structured dates/credits AND syllabus/handbook document chapters. | *"When is the DBMS exam and what topics are covered?"* | Coordinates structured query with document knowledge note. |
| **`clarification`** | Critical required parameters are missing to answer the query accurately. | *"When is my exam?"* (no context) | Returns `needs_context` status with polite prompt asking for department/semester. |

---

## 4. Context Resolution Rules

1. **Minimal Intrusion Principle**: The system **never** asks for student context if the query does not genuinely require it (e.g. asking *"What is DBMS?"* never prompts for department or roll number).
2. **Context Reuse Across Turns**: If a student states *"I am in CSE semester 5"*, that context is saved to the session. Subsequent queries like *"What exams do I have?"* resolve immediately to `structured` without re-prompting.
3. **Roll Number is NOT Authentication**: A roll number is treated as an optional cohort filter, never as an identity verification token.

---

## 5. Division of Responsibilities

### Gemini AI Layer (Server-Side)
- **Natural Language Understanding**: Deciphers abbreviations, course codes, and informal student phrasing.
- **Intent & Entity Extraction**: Identifies query goals and extracts parameters.
- **Grounded Response Synthesis**: Synthesizes verified database records into concise, clear bulleted responses.
- **Strict Constraint**: **Gemini NEVER generates raw MongoDB queries or executes database operations.**

### Node.js Backend Orchestrator
- **Schema Validation & Normalization**: Guarantees pure, valid JSON conforming to `QueryAnalysis`.
- **Context Resolution & State**: Manages multi-turn conversation sessions and merges query context.
- **Query Execution**: Executes parameterized, safe Mongoose queries using extracted entities.
- **Security & Secret Isolation**: Keeps `GEMINI_API_KEY` securely isolated on the server.

---

## 6. Academic RAG & Vector Search Pipeline (Phase 4 Planned)

> [!NOTE]
> The RAG pipeline below is scheduled for **Phase 4** and is NOT implemented in Phase 3.

- **Document Ingestion**: Parsing official PDFs (handbooks, exam rules, syllabus books).
- **Semantic Chunking**: Partitioning documents with token overlap.
- **Embeddings Generation**: Transforming chunks into vector embeddings via Gemini embedding models (`text-embedding-004`).
- **Vector Indexing**: MongoDB Atlas Vector Search indices for cosine similarity search.
- **Attribution**: Grounded responses with official document name and page number citations.
