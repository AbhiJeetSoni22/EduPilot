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

## 3. AI & Security Guidelines

10. **Backend-Only AI Operations**: All Gemini API calls and prompt assembly must reside inside backend AI services.
11. **Never Expose Secrets**: The `GEMINI_API_KEY`, `JWT_SECRET`, and `MONGODB_URI` must never be sent to or exposed in the frontend. Never hardcode credentials in source files or commits.
12. **Grounded Anti-Hallucination Policy**: Ground AI responses in authoritative MongoDB records and indexed PDF chunks with explicit citations.

---

## 4. Code Quality & Modularity

13. **Single Responsibility**: Each module, controller, and component should have a single, well-defined responsibility.
14. **Centralized Error Handling**: Use structured Express error middleware and unified JSON response formats.
15. **Avoid Overengineering**: Prefer simple, readable, and robust TypeScript code over premature abstractions.
16. **Documentation-Driven Development**:
    - Update `docs/STATUS.md` whenever a feature is completed.
    - Update `docs/API.md` when endpoints are added or modified.
    - Update `docs/ARCHITECTURE.md` and `docs/AI_RAG.md` if architectural decisions evolve.
