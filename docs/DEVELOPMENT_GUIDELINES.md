# Engineering & Development Guidelines — Exam & Academic Assistant

To maintain high code quality, security, and maintainability across the lifecycle of **Exam & Academic Assistant**, all contributors must adhere to the following principles:

---

## 1. Architectural Boundaries & Separation
1. **Frontend / Backend Decoupling**: Keep frontend (`frontend/`) and backend (`backend/`) responsibilities strictly isolated. The frontend is a consumer of the backend REST API.
2. **No Business Logic in UI Components**: UI components must focus exclusively on presentation and user interactions. Business logic, data transformations, and API communications belong in dedicated service/helper layers (`services/`, `lib/`, `hooks/`).
3. **No Database Access from Frontend**: Frontend code must never access the database directly. All data access occurs via authenticated backend API endpoints.

---

## 2. AI & Security Guidelines
4. **Backend-Only AI Operations**: All Gemini API calls must reside inside backend AI and service modules.
5. **Never Expose Secrets**: The `GEMINI_API_KEY`, `JWT_SECRET`, and `MONGODB_URI` must never be sent to or exposed in the frontend. Never hardcode credentials in source files or commits.
6. **Grounding Policy**: Ground AI responses in authoritative database records and RAG document chunks to eliminate hallucinations.

---

## 3. Code Quality & Modularity
7. **Single Responsibility**: Each module, service, controller, and component should have a single, well-defined responsibility.
8. **Centralized Error Handling**: Use structured Express error middleware and unified JSON response formats. Avoid unhandled promise rejections.
9. **Avoid Overengineering**: Prefer simple, readable, and robust solutions over premature abstractions and unnecessary external dependencies.
10. **Preserve Existing Functionality**: Do not break or modify unrelated modules when implementing a specific feature.

---

## 4. Documentation & Process
11. **Documentation-Driven Development**:
    - Update `docs/STATUS.md` whenever a feature is completed.
    - Update `docs/API.md` when endpoints are added or modified.
    - Update `docs/ARCHITECTURE.md` and `docs/AI_RAG.md` if architectural decisions evolve.
12. **Incremental Implementation**: Do not build unrequested future features ahead of time. Build strictly according to approved roadmaps.
13. **Dependency Discipline**: Before adding an npm dependency, verify that it is essential and does not introduce security vulnerabilities or bloat.
