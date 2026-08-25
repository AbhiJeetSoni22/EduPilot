# System Architecture — Exam & Academic Assistant

## 1. High-Level Architecture Overview

The **Exam & Academic Assistant** is built around a decoupled full-stack architecture that cleanly separates presentation, business logic orchestration, structured data persistence, and AI-driven retrieval/generation.

```text
+-----------------------------------------------------------+
|                   Next.js Frontend                        |
|   (App Router, Chat Interface, Student Dashboard, UI)     |
+-----------------------------------------------------------+
                             |
                             | HTTPS / REST / JSON
                             v
+-----------------------------------------------------------+
|                Node.js / Express Backend                  |
|    - Request Validation & Authentication                  |
|    - Business Logic & Orchestration                       |
|    - Route Handlers & Centralized Error Middleware        |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|                   Application Services                    |
|   (Auth Service, Academic Service, Chat Routing Service)  |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|                 AI Understanding (Gemini)                 |
|   - Question Analysis & Intent Classification             |
|   - Entity & Parameter Extraction (Course, Date, Subject) |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|                      Retrieval Layer                      |
|  +-----------------------------+-----------------------+  |
|  |    MongoDB Structured Data  |   RAG / Vector Search |  |
|  |    (Exams, Deadlines, GPA)  |   (PDFs, Regulations) |  |
|  +-----------------------------+-----------------------+  |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|               Gemini Response Generation                  |
|   (Context-Grounded, Citations, Concise Academic Tone)    |
+-----------------------------------------------------------+
                             |
                             | Formatted JSON Response
                             v
+-----------------------------------------------------------+
|                   Next.js Client View                     |
+-----------------------------------------------------------+
```

---

## 2. Core Architectural Principles & Component Roles

### A. Next.js Frontend
- **Responsibility**: UI rendering, client-side state, user interactions, chat visualization, and responsive design.
- **Boundaries**: Pure presentation and API consumption. Business logic and private API keys (such as `GEMINI_API_KEY`) **must never** reside in the frontend.

### B. Node.js / Express Backend
- **Responsibility**: Gatekeeper, request validation, authentication, business rules execution, database querying, and AI orchestration.
- **Boundaries**: All AI calls, database operations, and external services are strictly managed through dedicated backend service modules.

### C. MongoDB Database (Mongoose)
- **Responsibility**: Authoritative data store for structured academic entities (users, courses, exam schedules, assignment metadata, chat logs).
- **Future Role**: Storage for vector embeddings and chunk metadata via MongoDB Atlas Vector Search.

### D. Google Gemini AI Layer
- **Responsibility**: Natural-language understanding (NLU), conversational context reasoning, query rewrites, intent classification, and final response synthesis.
- **Authority Rule**: **Gemini must NOT be treated as the authoritative database for institution-specific information.** Instead, the backend retrieves verified facts from MongoDB/RAG and passes them to Gemini as grounding context.

### E. RAG & Vector Search Layer *(Planned)*
- **Responsibility**: Semantic search over unstructured institutional documents (academic rules, student handbooks, syllabi, circulars).
- **Mechanism**: Splits documents into chunks, generates vector embeddings, and performs similarity search to inject top-matching excerpts into the Gemini prompt.

---

## 3. Data Flow Scenario (Future Chat Request)
1. **User Query**: Student submits *"What is the minimum attendance required to appear for the end-semester exam?"*
2. **Backend Processing**: Express endpoint receives request, authenticates user, and forwards prompt to Chat Service.
3. **Intent & Retrieval**:
   - Chat service queries Gemini to determine intent: `query_academic_regulation` with topic `attendance_eligibility`.
   - Backend queries Vector Search index for top regulatory chunks matching "end-semester attendance eligibility".
4. **Grounded Synthesis**: Backend constructs a prompt containing:
   - System instruction (academic policy assistant tone)
   - Retrieved official policy excerpts
   - Student's original question
5. **Response Delivery**: Gemini produces an accurate, policy-grounded response with citations, delivered back through Express to Next.js.
