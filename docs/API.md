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
| **Public** | Read-only endpoints for curriculum, exam schedules, regulations, system health, and student conversational chat. Open to all clients without authentication. | None |
| **Admin Protected** | Operations that create, modify, delete, or bulk-import academic records and documents. Requires verified Administrator JWT. | `Authorization: Bearer <Admin_JWT>` |
| **Future / Internal** | Semantic PDF chunking and vector index operations (Phase 4). | Internal backend invocation |

---

## 2. Conversational AI Chat Endpoints (Phase 3 Implemented & Active)

### Send Chat Query
- **Endpoint**: `POST /api/chat`
- **Access Level**: **Public** (No student authentication required)
- **Description**: Submits a natural language query with optional conversation session ID and query context. Runs Gemini Query Analysis, parameter sanitization, context resolution, controlled academic service execution, and returns a grounded response.
- **Request Body**:
```json
{
  "message": "When is the DBMS exam for CSE semester 5?",
  "conversationId": "conv_4a8b-1234",
  "queryContext": {
    "department": "CSE",
    "semester": 5
  }
}
```

- **Response `200 OK` (Answer Ready — Structured / Direct)**:
```json
{
  "success": true,
  "data": {
    "status": "answer_ready",
    "conversationId": "conv_4a8b-1234",
    "queryAnalysis": {
      "intent": "exam_schedule",
      "entities": {
        "subject": "DBMS",
        "department": "CSE",
        "semester": 5
      },
      "requiredContext": ["department", "semester"],
      "providedContext": ["department", "semester"],
      "missingContext": [],
      "retrievalStrategy": "structured",
      "confidenceScore": 0.95,
      "reasoningSummary": "Exam schedule query with complete cohort context."
    },
    "response": "📝 **Scheduled Examination Timetable**\n\n• **CS501: Database Management Systems**\n  📅 Date: **Mon, Oct 20, 2025**\n  ⏰ Time: 09:30 AM – 12:30 PM\n  📍 Venue: Hall A-102 | Type: Mid-Semester",
    "data": [...]
  },
  "message": "Query processed successfully"
}
```

- **Response `200 OK` (Needs Context / Clarification)**:
```json
{
  "success": true,
  "data": {
    "status": "needs_context",
    "conversationId": "conv_4a8b-1234",
    "queryAnalysis": {
      "intent": "exam_schedule",
      "entities": {},
      "requiredContext": ["department", "semester"],
      "providedContext": [],
      "missingContext": ["department", "semester"],
      "retrievalStrategy": "clarification",
      "clarificationPrompt": "Please provide your department and semester (e.g. CSE semester 5) to check your exam schedule."
    },
    "response": "To check the correct examination timetable, could you please specify your **department** and **semester** (for example: *CSE, Semester 5*)?",
    "missingContext": ["department", "semester"]
  },
  "message": "Query processed successfully"
}
```

- **Response `200 OK` (Phase 4 Retrieval Boundary)**:
```json
{
  "success": true,
  "data": {
    "status": "retrieval_unavailable",
    "conversationId": "conv_4a8b-1234",
    "queryAnalysis": {
      "intent": "attendance_policy",
      "entities": {},
      "requiredContext": [],
      "providedContext": [],
      "missingContext": [],
      "retrievalStrategy": "vector"
    },
    "response": "This policy query (attendance policy) requires deep semantic searching across official institutional PDF circulars and student handbooks.\n\nℹ️ *Vector-based knowledge retrieval and citation extraction will be available in Phase 4 (Academic RAG & Vector Search).*"
  },
  "message": "Query processed successfully"
}
```

### Retrieve Conversation Thread
- **Endpoint**: `GET /api/chat/:id`
- **Access Level**: **Public**
- **Description**: Returns message history and accumulated `queryContext` for an active session.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_4a8b-1234",
    "messages": [
      {
        "role": "user",
        "content": "When is my next exam?",
        "timestamp": "2026-08-26T12:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Please specify your department and semester (e.g. CSE semester 5).",
        "queryAnalysis": { ... },
        "timestamp": "2026-08-26T12:00:01.000Z"
      }
    ],
    "queryContext": {
      "department": "CSE",
      "semester": 5
    },
    "lastActiveAt": "2026-08-26T12:00:01.000Z"
  }
}
```

---

## 3. System & Health Endpoints

### System Health Check
- **Endpoint**: `GET /api/health`
- **Access Level**: **Public**
- **Description**: Returns server uptime, version, and MongoDB connection status.

---

## 4. Authentication & Admin User Management

### Admin Login
- **Endpoint**: `POST /api/auth/login`
- **Access Level**: **Public**
- **Description**: Authenticates administrator credentials and returns an Admin JWT session token.

### Get Current Admin Profile
- **Endpoint**: `GET /api/auth/me`
- **Access Level**: **Admin Protected**

### Admin User Management
- `GET /api/users` — **Admin Protected**
- `GET /api/users/:id` — **Admin Protected**
- `PUT /api/users/:id` — **Admin Protected**
- `DELETE /api/users/:id` — **Admin Protected**

---

## 5. Academic Catalog & Structured Endpoints

### Departments
- `GET /api/departments` — **Public**
- `GET /api/departments/:id` — **Public**
- `POST /api/departments` — **Admin Protected**
- `PUT /api/departments/:id` — **Admin Protected**
- `DELETE /api/departments/:id` — **Admin Protected**

### Academic Programs
- `GET /api/programs` — **Public**
- `GET /api/programs/:id` — **Public**
- `POST /api/programs` — **Admin Protected**
- `PUT /api/programs/:id` — **Admin Protected**
- `DELETE /api/programs/:id` — **Admin Protected**

### Subjects & Courses
- `GET /api/subjects` — **Public**
- `GET /api/subjects/:id` — **Public**
- `POST /api/subjects` — **Admin Protected**
- `PUT /api/subjects/:id` — **Admin Protected**
- `DELETE /api/subjects/:id` — **Admin Protected**

### Scheduled Examinations
- `GET /api/exams` — **Public**
- `GET /api/exams/:id` — **Public**
- `POST /api/exams` — **Admin Protected**
- `PUT /api/exams/:id` — **Admin Protected**
- `DELETE /api/exams/:id` — **Admin Protected**

### Assignments & Deadlines
- `GET /api/assignments` — **Public**
- `GET /api/assignments/:id` — **Public**
- `POST /api/assignments` — **Admin Protected**
- `PUT /api/assignments/:id` — **Admin Protected**
- `DELETE /api/assignments/:id` — **Admin Protected**

### Academic Calendar Events
- `GET /api/academic-calendar` — **Public**
- `GET /api/academic-calendar/:id` — **Public**
- `POST /api/academic-calendar` — **Admin Protected**
- `PUT /api/academic-calendar/:id` — **Admin Protected**
- `DELETE /api/academic-calendar/:id` — **Admin Protected**

### Institutional Regulations
- `GET /api/regulations` — **Public**
- `GET /api/regulations/:id` — **Public**
- `POST /api/regulations` — **Admin Protected**
- `PUT /api/regulations/:id` — **Admin Protected**
- `DELETE /api/regulations/:id` — **Admin Protected**

---

## 6. Knowledge Base & Batch Operations

### Document Management (Knowledge Base)
- `GET /api/documents` — **Public**
- `GET /api/documents/:id` — **Public**
- `GET /api/documents/:id/download` — **Public**
- `POST /api/documents/upload` — **Admin Protected**
- `DELETE /api/documents/:id` — **Admin Protected**

### Bulk Data Import
- `POST /api/bulk-import/validate` — **Admin Protected**
- `POST /api/bulk-import/confirm` — **Admin Protected**
