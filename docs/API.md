# API Specification — Exam & Academic Assistant (EduPilot)

This document provides the complete specification of endpoints available on the backend Express server, classified by access level.

## Base URL
```text
http://localhost:5000/api
```

---

## 1. Access Classification Summary

| Access Level | Description | Header Required |
| :--- | :--- | :--- |
| **Public** | Read-only endpoints for curriculum, exam schedules, regulations, and system health. Open to students and all clients. | None |
| **Admin Protected** | Operations that create, modify, delete, or bulk-import academic records and documents. Requires verified Administrator JWT. | `Authorization: Bearer <Admin_JWT>` |
| **Future / Internal** | AI orchestration, conversational routing, and vector search endpoints (Phase 3 & Phase 4). | Internal backend invocation |

---

## 2. System & Health Endpoints

### System Health Check
- **Endpoint**: `GET /api/health`
- **Access Level**: **Public**
- **Description**: Returns server uptime, version, and MongoDB connection status.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "Exam & Academic Assistant API",
  "version": "0.1.0",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "uptime": 124.5,
  "environment": "development",
  "database": {
    "status": "connected",
    "host": "cluster0.mongodb.net",
    "name": "exam_academic_assistant"
  }
}
```

---

## 3. Authentication & User Management Endpoints

### Admin Login
- **Endpoint**: `POST /api/auth/login`
- **Access Level**: **Public**
- **Description**: Authenticates administrator credentials and returns an Admin JWT session token.
- **Request Body**:
```json
{
  "email": "admin@edupilot.edu",
  "password": "Admin@123456"
}
```
- **Response `200 OK`**: Returns user profile and `token`.

### Get Current Admin Profile
- **Endpoint**: `GET /api/auth/me`
- **Access Level**: **Admin Protected**
- **Description**: Returns profile details for the currently authenticated administrator.

### Admin User Management
- `GET /api/users` — **Admin Protected** (List staff/admin accounts with optional role filter)
- `GET /api/users/:id` — **Admin Protected** (Get specific user details)
- `PUT /api/users/:id` — **Admin Protected** (Update user role/status)
- `DELETE /api/users/:id` — **Admin Protected** (Deactivate/delete user)

---

## 4. Academic Catalog & Structured Endpoints

### Departments
- `GET /api/departments` — **Public** (List academic departments)
- `GET /api/departments/:id` — **Public** (Get single department details)
- `POST /api/departments` — **Admin Protected** (Create department)
- `PUT /api/departments/:id` — **Admin Protected** (Update department)
- `DELETE /api/departments/:id` — **Admin Protected** (Delete department)

### Academic Programs
- `GET /api/programs` — **Public** (List programs, filterable by `?department=`)
- `GET /api/programs/:id` — **Public** (Get single program details)
- `POST /api/programs` — **Admin Protected** (Create program)
- `PUT /api/programs/:id` — **Admin Protected** (Update program)
- `DELETE /api/programs/:id` — **Admin Protected** (Delete program)

### Subjects & Courses
- `GET /api/subjects` — **Public** (List subjects, filterable by `?department=`, `?program=`, `?semester=`, `?code=`)
- `GET /api/subjects/:id` — **Public** (Get subject details, syllabus units, textbooks, evaluation schema)
- `POST /api/subjects` — **Admin Protected** (Create subject)
- `PUT /api/subjects/:id` — **Admin Protected** (Update subject)
- `DELETE /api/subjects/:id` — **Admin Protected** (Delete subject)

### Scheduled Examinations
- `GET /api/exams` — **Public** (List exams, filterable by `?department=`, `?program=`, `?semester=`, `?subject=`, `?examType=`)
- `GET /api/exams/:id` — **Public** (Get examination details, date, shift, venue, instructions)
- `POST /api/exams` — **Admin Protected** (Schedule exam)
- `PUT /api/exams/:id` — **Admin Protected** (Update exam schedule)
- `DELETE /api/exams/:id` — **Admin Protected** (Cancel/delete exam)

### Assignments & Deadlines
- `GET /api/assignments` — **Public** (List assignments, filterable by `?subject=`, `?semester=`, `?status=`)
- `GET /api/assignments/:id` — **Public** (Get assignment guidelines, rubric, deadline)
- `POST /api/assignments` — **Admin Protected** (Create assignment)
- `PUT /api/assignments/:id` — **Admin Protected** (Update assignment)
- `DELETE /api/assignments/:id` — **Admin Protected** (Delete assignment)

### Academic Calendar Events
- `GET /api/academic-calendar` — **Public** (List calendar milestones, holidays, term dates)
- `GET /api/academic-calendar/:id` — **Public** (Get calendar event details)
- `POST /api/academic-calendar` — **Admin Protected** (Create calendar milestone)
- `PUT /api/academic-calendar/:id` — **Admin Protected** (Update calendar event)
- `DELETE /api/academic-calendar/:id` — **Admin Protected** (Delete calendar event)

### Institutional Regulations
- `GET /api/regulations` — **Public** (List academic regulations, filterable by `?category=`)
- `GET /api/regulations/:id` — **Public** (Get regulation clauses, attendance rules, GPA formulas)
- `POST /api/regulations` — **Admin Protected** (Publish regulation)
- `PUT /api/regulations/:id` — **Admin Protected** (Update regulation)
- `DELETE /api/regulations/:id` — **Admin Protected** (Archive regulation)

---

## 5. Knowledge Base & Batch Operations

### Document Management (Knowledge Base)
- `GET /api/documents` — **Public** (List available institutional PDFs, circulars, handbooks)
- `GET /api/documents/:id` — **Public** (Get document metadata and indexing status)
- `GET /api/documents/:id/download` — **Public** (Download official academic PDF file)
- `POST /api/documents/upload` — **Admin Protected** (Upload PDF document with category & metadata)
- `DELETE /api/documents/:id` — **Admin Protected** (Remove document from Knowledge Base)

### Bulk Data Import
- `POST /api/bulk-import/validate` — **Admin Protected** (Upload CSV/JSON file to parse and validate rows without persisting)
- `POST /api/bulk-import/confirm` — **Admin Protected** (Commit validated batch records into MongoDB)

---

## 6. Planned AI & Chatbot Endpoints *(Phase 3 & Phase 4)*

> [!NOTE]
> The endpoints below represent the planned conversational interface for Phase 3.

- `POST /api/chat/query` — **Public** (Send natural language query + optional `QueryContext` payload, execute Gemini intent routing, retrieve grounded DB/RAG records, and return AI response)
- `GET /api/chat/session/:id` — **Public / Session-Based** (Retrieve recent multi-turn messages for an active browser session)
- `POST /api/chat/feedback` — **Public** (Submit helpful/unhelpful rating on assistant answers)
