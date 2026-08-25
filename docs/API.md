# API Specification — Exam & Academic Assistant

This document outlines the API endpoints provided by the backend Express server.

---

## Base URL
```text
http://localhost:5000/api
```

---

## 1. Active Endpoints

### Health Check
Returns the operational status of the backend service and database connection state.

- **Endpoint**: `GET /api/health`
- **Authentication**: None
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "Exam & Academic Assistant API",
  "timestamp": "2026-08-25T14:54:00.000Z",
  "uptime": 42.15,
  "environment": "development",
  "database": {
    "status": "connected"
  }
}
```

---

## 2. Planned Endpoints *(Future Phases)*

> [!NOTE]
> The endpoints below are planned and will be implemented incrementally in subsequent development phases.

### A. Authentication (`/api/auth`) — *Planned*
- `POST /api/auth/register` — Register a new student/user account.
- `POST /api/auth/login` — Authenticate and receive JWT session token.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `POST /api/auth/logout` — Invalidate user session.

### B. Chat & Conversational Assistant (`/api/chat`) — *Planned*
- `POST /api/chat/message` — Send a student query, execute intent routing, and return AI response.
- `GET /api/chat/sessions` — List conversation history for authenticated student.
- `GET /api/chat/sessions/:sessionId` — Retrieve message thread for a specific session.
- `DELETE /api/chat/sessions/:sessionId` — Clear conversation session.

### C. Examinations (`/api/exams`) — *Planned*
- `GET /api/exams/schedule` — Fetch upcoming examination timetables by department/semester.
- `GET /api/exams/:examId` — Detailed information for a specific examination (venue, shift, syllabus).
- `GET /api/exams/guidelines` — General exam hall guidelines and rules.

### D. Subjects & Courses (`/api/subjects`) — *Planned*
- `GET /api/subjects` — List all courses/subjects enrolled or offered.
- `GET /api/subjects/:code/syllabus` — Fetch unit-wise syllabus and recommended textbooks.
- `GET /api/subjects/:code/evaluation` — Fetch internal vs external grading breakdown.

### E. Assignments & Deadlines (`/api/assignments`) — *Planned*
- `GET /api/assignments` — Retrieve pending and completed academic assignments.
- `GET /api/assignments/:id` — Detailed assignment requirements, format rules, and rubric.

### F. Academic Regulations & Policies (`/api/regulations`) — *Planned*
- `GET /api/regulations/attendance` — Fetch official attendance percentage criteria & policies.
- `GET /api/regulations/grading` — Fetch GPA/CGPA computation formulas and grade point table.
- `GET /api/regulations/promotion` — Semester progression and backlog criteria.

### G. Document Management & Ingestion (`/api/documents`) — *Planned (Admin)*
- `POST /api/documents/upload` — Upload academic PDFs (handbooks, regulations).
- `GET /api/documents/status/:jobId` — Check status of PDF chunking and embedding generation.
- `GET /api/documents` — List indexed academic documents.
