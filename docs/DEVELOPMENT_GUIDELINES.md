# Engineering & Development Guidelines — Exam & Academic Assistant (EduPilot)

To maintain high code quality, security, and architectural integrity across **EduPilot**, all contributors must adhere to the following principles:

---

## 1. Access Model & Query Context Rules

1. **Unauthenticated Student Chatbot Access**: Student chatbot access must **not** require authentication, login, passwords, or student JWTs in the current MVP. General academic queries must remain openly accessible.
2. **Mandatory Admin Protection**: All administrative management operations (creating, updating, deleting academic entities, uploading documents, and bulk importing data) must **always** be protected with verified Admin JWT authentication and authorization (`requireRole('admin')`).
3. **Roll Number is Query Context, NOT Authentication**: A roll number or department provided in conversation is purely a conversational filter for public academic timetables, **never** a secret identity verification mechanism.
4. **No Exposure of Private Student Records**: Do **not** expose private student data (e.g. personal marks, individual attendance records, grade sheets, or disciplinary records) using a roll number alone.
5. **Minimal & Purpose-Specific Query Context**: Query context collection should remain minimal and purpose-specific. Only request parameters (like department or semester) when essential to disambiguate a public query.
6. **No Unnecessary Personal Information**: Do **not** collect unnecessary personal or sensitive information during chatbot conversations.

---

## 2. Architectural Boundaries & Decoupling

7. **Frontend / Backend Decoupling**: Keep frontend (`frontend/`) and backend (`backend/`) strictly isolated. The frontend is a consumer of the backend REST API.
8. **No Business Logic in UI Components**: UI components must focus exclusively on presentation and user interactions. Business logic and API communications belong in dedicated service modules (`services/`, `lib/`, `hooks/`).
9. **No Database Access from Frontend**: Frontend code must never access MongoDB directly. All data operations occur through validated backend API endpoints.

---

## 3. AI, RAG & Security Guidelines

10. **Backend-Only AI Operations**: All Gemini API calls, embedding generations, and prompt assembly must reside inside backend AI services.
11. **Never Expose Secrets**: The `GEMINI_API_KEY`, `JWT_SECRET`, and `MONGODB_URI` must never be sent to or exposed in the frontend. Never hardcode credentials in source files or commits.
12. **Structured QueryAnalysis Validation**: Always validate and normalize raw LLM outputs through `validateAndNormalizeQueryAnalysis` before acting on them.
13. **Dedicated Service Query Routing**: Gemini must **never** generate raw database queries (`$where`, SQL, or unrestricted Mongoose query objects). Route all structured lookups strictly through dedicated, strongly typed backend services (`SubjectService`, `ExamService`, `AssignmentService`, `AcademicCalendarService`, `RegulationService`).
14. **Mandatory Parameter Sanitization**: Sanitize all entity inputs using `ParameterValidator` before passing parameters into database query filters.
15. **Zero Hallucination of Institutional Facts**: Responses must be grounded strictly in verified database records or retrieved document chunks. If records are unavailable, explicitly inform the user that no matching data was found. Never invent exam dates, venues, credit counts, fees, or university policies.
16. **Deterministic Clarification Continuation**: When a query requires clarification, preserve the original pending intent and merge newly supplied entities deterministically across conversation turns without synthetic queries.
17. **Vector Embedding Dimension Invariant**: Vector embeddings must always conform strictly to 768 floating point dimensions (`gemini-embedding-001`). Schema validation and aggregation pipelines must enforce this invariant.
18. **Page-Level Grounded Citations**: All RAG answers must provide explicit source citations formatted via `formatCitationBlock` with verified document titles and page numbers.
19. **Deterministic Fallback on LLM Failure**: Always provide a deterministic synthesis fallback in `RagResponseService` so that timeouts or API outages never result in dropped or empty responses.
20. **Clean Production Configuration**: Application code must never modify system DNS configurations (e.g. `dns.setServers`). Environment-specific workarounds must remain isolated in test runners.
21. **Deterministic Mocking in Tests**: Test suites must support deterministic query analysis and response formatting without mandatory dependence on live third-party network quotas.

---

## 4. Code Quality & Modularity

22. **Single Responsibility**: Each module, controller, and component should have a single, well-defined responsibility.
23. **Centralized Error Handling**: Use structured Express error middleware and unified JSON response formats.
24. **Avoid Overengineering**: Prefer simple, readable, and robust TypeScript code over premature abstractions.
25. **Documentation-Driven Development**:
    - Update `docs/STATUS.md` whenever a feature is completed.
    - Update `docs/API.md` when endpoints are added or modified.
    - Update `docs/ARCHITECTURE.md` and `docs/AI_RAG.md` if architectural decisions evolve.
    - Update `README.md` to keep onboarding and project capabilities accurate.
