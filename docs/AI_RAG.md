# AI & RAG Architecture Specification — Exam & Academic Assistant

This document outlines the planned design for the **AI Understanding** and **Retrieval-Augmented Generation (RAG)** pipeline.

---

## 1. Overview & Separation of Concerns

```text
Student Question
       │
       ▼
[Backend Node.js Orchestrator]
       │
       ├─► 1. Intent Detection & Extraction (Gemini)
       │
       ├─► 2. Context Retrieval:
       │       ├── Structured DB Query (MongoDB)
       │       └── Semantic Vector Search (Atlas Vector Search / Embeddings)
       │
       ├─► 3. Grounded Synthesis Prompt Assembly
       │
       └─► 4. Final Response Generation (Gemini)
               │
               ▼
       Formatted Response to Student
```

---

## 2. Responsibilities Breakdown

### A. AI Responsibilities (Google Gemini API)
- **Natural Language Understanding (NLU)**: Decipher ambiguous student questions, slang, and academic phrasing.
- **Intent Classification**: Identify whether the student is asking about exam dates, syllabus content, attendance regulations, grade formulas, or assignment deadlines.
- **Entity Extraction**: Identify parameters such as course code (`CS101`), semester (`Sem 4`), or date ranges.
- **Response Synthesis**: Synthesize retrieved official data and document excerpts into friendly, concise, bulleted explanations with source citations.
- **Tone & Safety Constraints**: Maintain an authoritative academic tone and explicitly state when an official document does not contain an answer rather than guessing.

### B. Backend Responsibilities (Node.js / Express)
- **Request Validation & Security**: Validate incoming payloads, sanitize inputs, and verify user permissions.
- **API Key Protection**: Store `GEMINI_API_KEY` securely on the server and never expose it to client code.
- **Conversation State Management**: Persist multi-turn conversation context in MongoDB.
- **Orchestration & Routing**: Decide whether to fulfill queries via structured MongoDB collections or via the RAG vector search pipeline.
- **Prompt Templating**: Inject retrieved context into system prompts with strict grounding instructions.
- **Error Handling & Fallbacks**: Provide graceful fallback messages in case of AI rate limits or network issues.

### C. RAG Responsibilities *(Future Phase)*
- **Document Ingestion**: Read raw academic PDFs (Student Handbooks, Exam Regulations, Syllabi).
- **Text Chunking**: Segment documents into semantic chunks (e.g. 500-1000 tokens with 100-token overlap).
- **Embedding Generation**: Convert text chunks into vector embeddings via Gemini embedding models (e.g. `text-embedding-004`).
- **Vector Indexing & Storage**: Store vector embeddings alongside chunk metadata in MongoDB Atlas Vector Search.
- **Semantic Retrieval**: Execute cosine/dot-product similarity searches to find top $k$ relevant excerpts for a student query.
- **Attribution**: Return source document names and page numbers for transparent citations.

---

## 3. Grounding Rule & Anti-Hallucination Policy
To ensure high academic reliability:
1. **Never use AI as an ungrounded oracle**: Gemini must not invent exam dates, passing marks, or attendance criteria.
2. **Context-Driven Answers**: If relevant context cannot be found in MongoDB or the vector store, the system must answer:
   > *"I could not find official information regarding this in the current academic regulations. Please consult your academic advisor or departmental examination cell."*
