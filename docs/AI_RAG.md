# AI & RAG Architecture Specification — Exam & Academic Assistant (EduPilot)

This document details the completed **AI Query Analysis & Orchestration** pipeline (Phase 3) and the **RAG Knowledge Base & Vector Search Foundation** (Phase 4).

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
       │       ├── 'vector'        ──► Phase 4 RAG Vector Search
       │       └── 'hybrid'        ──► Phase 4 Hybrid Orchestration
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

## 3. Academic RAG Knowledge Base & Vector Search (Phase 4 Foundation Implemented)

### High-Level Ingestion & Retrieval Flow

```text
Admin Upload (Department + Program + PDF)
       │
       ▼
[AcademicDocument Record Created (status: 'uploaded')]
       │
       ▼
[PdfExtractorService] ──► Extracts text per page preserving page boundaries (pageNumber: 1, 2, ...)
       │
       ▼
[MetadataExtractorService] ──► Parses semester, subjectCode, subjectName, academicYear, documentType
       │                      (Immutable: Department & Program are attached from Admin context)
       ▼
[ChunkingService] ──► Section- & page-aware chunking (~800 chars, ~120 overlap)
       │
       ▼
[GeminiEmbeddingProvider] ──► Generates 768-dim embeddings in batch via batchEmbedContents
       │
       ▼
[KnowledgeChunk MongoDB Storage] ──► Persists chunks in `knowledge_chunks` with 768-dim validation
       │
       ▼
[AcademicDocument Record Updated] ──► status: 'ready', totalPages, totalChunks, processedAt
```

---

## 4. RAG Knowledge Data Models

### Document Record (`documents` collection)
- `_id`: ObjectId
- `title`: string
- `originalFileName`: string
- `department`: ObjectId (ref: `Department`)
- `program`: ObjectId (ref: `Program`)
- `status`: `'uploaded' | 'processing' | 'ready' | 'failed' | 'archived'`
- `totalPages`: number
- `totalChunks`: number
- `processingError`: string (safe error message, no internal stack traces)
- `version`: string (e.g. `'1.0'`)
- `isActive`: boolean
- `uploadedAt`: Date
- `processedAt`: Date

### Knowledge Chunk Record (`knowledge_chunks` collection)
- `_id`: ObjectId
- `documentId`: ObjectId (ref: `AcademicDocument`)
- `text`: string (chunk content)
- `embedding`: number[] (exactly 768 float dimensions)
- `chunkIndex`: number
- `pageNumber`: number (where available)
- `metadata`:
  - `department`: ObjectId (ref: `Department`)
  - `program`: ObjectId (ref: `Program`)
  - `semester`: number (optional)
  - `subjectCode`: string (optional)
  - `subjectName`: string (optional)
  - `academicYear`: string (optional)
  - `documentType`: string (optional)
  - `sectionTitle`: string (optional)
  - `unitNumber`: number (optional)

---

## 5. Gemini Embedding Specification

- **Provider Abstraction**: `EmbeddingProvider` interface implemented by `GeminiEmbeddingProvider`.
- **Model**: `gemini-embedding-001` (configurable via `GEMINI_EMBEDDING_MODEL`).
- **Dimensions**: `768` (configurable via `GEMINI_EMBEDDING_DIMENSIONS`).
- **Similarity Metric**: `cosine`.
- **Batch Processing**: Groups chunks into batches of up to 50 items using Gemini `batchEmbedContents` endpoint.
- **Strict Dimension Validation**: Any vector that does not match exactly 768 dimensions causes a safe, graceful rejection.

---

## 6. MongoDB Atlas Vector Search Index Specification

The vector search index is defined on MongoDB Atlas for the `knowledge_chunks` collection.

**Index Configuration (`docs/atlas_vector_search_index.json`):**
```json
{
  "name": "knowledge_chunks_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 768,
        "similarity": "cosine"
      },
      {
        "type": "filter",
        "path": "metadata.department"
      },
      {
        "type": "filter",
        "path": "metadata.program"
      },
      {
        "type": "filter",
        "path": "metadata.semester"
      },
      {
        "type": "filter",
        "path": "metadata.subjectCode"
      },
      {
        "type": "filter",
        "path": "metadata.academicYear"
      },
      {
        "type": "filter",
        "path": "metadata.documentType"
      }
    ]
  }
}
```

> [!NOTE]
> The Atlas Vector Search index is configured via MongoDB Atlas / Atlas CLI and is NOT created automatically on application startup.

---

## 7. Vector Search Service & Metadata Pre-filtering

The `VectorSearchService` executes semantic similarity queries against the `knowledge_chunks` collection using MongoDB's `$vectorSearch` pipeline stage:

```typescript
const vectorSearchStage = {
  $vectorSearch: {
    index: 'knowledge_chunks_vector_index',
    path: 'embedding',
    queryVector: queryVector, // 768-dim number[]
    numCandidates: 50,
    limit: 5,
    filter: {
      'metadata.department': departmentId,
      'metadata.program': programId,
      'metadata.semester': 5
    }
  }
};
```

**Pre-filtering Rules:**
1. Filters are only applied when fields are explicitly provided in the query context.
2. If `subjectCode` or `semester` is unknown, it is not forced into the filter.
3. Department and Program scoping prevents cross-department retrieval leakage.
