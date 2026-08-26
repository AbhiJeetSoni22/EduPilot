# AI & RAG Architecture Specification — Exam & Academic Assistant (EduPilot)

This document details the completed **AI Query Analysis & Orchestration** pipeline (Phase 3) and the planned **Retrieval-Augmented Generation (RAG)** pipeline (Phase 4).

---

## 1. AI Query Analysis & Orchestration Architecture (Phase 3 Completed)

```text
Student Natural Language Query + Active Context
       │
       ▼
[Backend Node.js Orchestrator]
       │
       ├─► 1. Query Analyzer (Gemini NLU / Deterministic Engine)
       │       - Intent Classification (e.g. `exam_schedule`, `subject_credits`, `assignment_deadlines`)
       │       - Entity Extraction (Subject: `CS501`, Dept: `CSE`, Sem: `5`)
       │       - Context Resolution (Required vs Provided vs Missing)
       │       - Deterministic pending intent preservation (no synthetic queries)
       │       - Retrieval Strategy Assignment
       │
       ├─► 2. Schema Validation & Parameter Sanitization
       │       - `validateAndNormalizeQueryAnalysis`
       │       - `ParameterValidator.sanitize(entities, queryContext)`
       │
       ├─► 3. Strategy Routing:
       │       ├── 'clarification' ──► Prompt for missing context (status: "needs_context")
       │       ├── 'direct'        ──► Concept definition or greeting (status: "answer_ready")
       │       ├── 'structured'    ──► Query Academic Services (Subject, Exam, Assignment, etc.)
       │       │                         │
       │       │                         ▼
       │       │                   [ResponseGeneratorService]
       │       │                   (Zero-hallucination grounded answer synthesis)
       │       │
       │       ├── 'vector'        ──► Phase 4 boundary (status: "retrieval_unavailable")
       │       └── 'hybrid'        ──► Phase 4 boundary (status: "retrieval_unavailable")
       │
       └─► 4. Turn Persistence & Response Delivery
               │
               ▼
       Delivered to Student Chat Interface (`ChatInterface.tsx`)
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
| **`direct`** | General academic concepts, greetings, platform help where database search is unnecessary. | *"What is DBMS?"*, *"Hello"* | Directly explains concept; zero institutional facts fabricated. Status: `answer_ready`. |
| **`structured`** | Facts residing in MongoDB structured collections (credits, subjects offered, exam timetables, assignment deadlines, calendar milestones). | *"How many credits does DBMS have?"*, *"When is the CSE Sem 5 exam?"* | Node.js sanitizes parameters and executes Mongoose service queries; `ResponseGeneratorService` synthesizes grounded answer. Status: `answer_ready`. |
| **`clarification`** | Critical required parameters are missing to answer the query accurately. | *"When is my exam?"* (no context) | Returns `status: "needs_context"` with targeted prompt asking for department/semester. |
| **`vector`** | Institutional policies, regulations, circulars, handbooks intended for semantic document retrieval. | *"What is the attendance condonation policy?"* | Explicitly recognized as Phase 4 capability. Returns `status: "retrieval_unavailable"`. No fake search. |
| **`hybrid`** | Combined inquiries requiring both structured dates/credits AND syllabus/handbook document chapters. | *"When is the DBMS exam and what topics are covered?"* | Returns structured baseline + Phase 4 document notice. Status: `retrieval_unavailable`. |

---

## 4. Context Resolution & Multi-Turn Continuation Loop

1. **Minimal Intrusion Principle**: The system **never** asks for student context if the query does not genuinely require it (e.g. asking *"What is DBMS?"* never prompts for department or roll number).
2. **Context Retention & Reuse**: If a student states *"I am in CSE semester 5"*, that context is saved to the session. Subsequent queries like *"What exams do I have?"* or *"What assignments do I have?"* resolve immediately to `structured` without re-prompting.
3. **Deterministic Clarification Continuation**:
   - Turn 1: User asks *"When is my next exam?"* -> System detects `intent: exam_schedule`, `missingContext: ['department', 'semester']`, `status: needs_context`.
   - Turn 2: User replies *"CSE semester 5"* in the same conversation -> Backend preserves the pending `exam_schedule` intent, merges newly supplied entities, recalculates `missingContext: []`, transitions to `structured`, executes `ExamService.findExams`, and delivers the timetable without requiring the student to repeat the question or executing synthetic queries.
4. **Context Updates**: If a student states *"Actually I am in semester 6"*, `semester` updates to `6` while preserving existing `department` context without overwriting fields with undefined.
5. **Roll Number is NOT Authentication**: A roll number is treated as an optional cohort filter, never as an identity verification token.

---

## 5. Division of Responsibilities & Zero-Hallucination Policy

### Gemini AI Layer (Server-Side)
- **Natural Language Understanding**: Deciphers abbreviations, course codes, and informal student phrasing.
- **Intent & Entity Extraction**: Identifies query goals and extracts parameters.
- **Strict Constraint**: **Gemini NEVER generates raw MongoDB queries or executes database operations.**

### Node.js Backend Orchestrator & Services
- **Schema Validation & Normalization**: Guarantees pure, valid JSON conforming to `QueryAnalysis`.
- **Parameter Sanitization**: `ParameterValidator` cleans all inputs before Mongoose calls.
- **Controlled Query Execution**: Parameterized calls via `SubjectService`, `ExamService`, `AssignmentService`, `AcademicCalendarService`, `RegulationService`.
- **Response Generation**: `ResponseGeneratorService` synthesizes grounded answers strictly referencing verified MongoDB data.
- **Zero-Hallucination Rule**: If MongoDB has no matching record, the system explicitly reports that no matching data was found (e.g. *"I checked the examination schedule, but could not find any exam matching CS999"*).

---

## 6. Academic RAG & Vector Search Pipeline (Phase 4 Planned)

> [!NOTE]
> The RAG pipeline below is scheduled for **Phase 4** and is NOT implemented in Phase 3.

- **Document Ingestion**: Parsing official PDFs (handbooks, exam rules, syllabus books).
- **Semantic Chunking**: Partitioning documents with token overlap.
- **Embeddings Generation**: Transforming chunks into vector embeddings via Gemini embedding models (`text-embedding-004`).
- **Vector Indexing**: MongoDB Atlas Vector Search indices for cosine similarity search.
- **Attribution**: Grounded responses with official document name and page number citations.
