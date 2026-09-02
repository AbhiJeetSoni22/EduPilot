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
| **Admin Protected** | Operations that create, modify, delete, or bulk-import academic records and upload knowledge base documents. Requires verified Administrator JWT. | `Authorization: Bearer <Admin_JWT>` |

---

## 2. Conversational AI Chat Endpoints

### Send Chat Query
- **Endpoint**: `POST /api/chat`
- **Access Level**: **Public** (No student authentication required)
- **Description**: Submits a natural language query with optional conversation session ID and query context. Runs Gemini Query Analysis, parameter sanitization, deterministic context continuation, and routes to Structured DB or Vector RAG retrieval.
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

- **Response `200 OK` (Answer Ready — Structured Curriculum / Exam)**:
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
    "data": [
      {
        "_id": "67b93a001122334455667788",
        "subjectCode": "CS501",
        "subjectName": "Database Management Systems",
        "examType": "mid_term",
        "examDate": "2025-10-20T04:00:00.000Z",
        "startTime": "09:30",
        "endTime": "12:30",
        "venue": "Hall A-102"
      }
    ]
  },
  "message": "Query processed successfully"
}
```

- **Response `200 OK` (Answer Ready — Vector RAG Document Retrieval)**:
```json
{
  "success": true,
  "data": {
    "status": "answer_ready",
    "conversationId": "conv_4a8b-1234",
    "queryAnalysis": {
      "intent": "attendance_policy",
      "entities": {},
      "requiredContext": [],
      "providedContext": [],
      "missingContext": [],
      "retrievalStrategy": "vector",
      "confidenceScore": 0.92,
      "reasoningSummary": "Student inquiry regarding institutional attendance condonation policies."
    },
    "response": "Students must maintain a minimum of 75% attendance in each registered course to be eligible for end-semester examinations.\n\nStudents with attendance between 65% and 74% due to valid medical reasons or representing the university in recognized events may apply for attendance condonation.\n\n**Application Requirements:**\n• Prescribed application form submitted to Dean of Academics within 7 working days.\n• Non-refundable condonation processing fee of Rs. 500 per course.\n\n📖 **Sources:**\n• **Student Academic Regulations 2025** — Page 6\n• **Student Academic Regulations 2025** — Page 7",
    "data": {
      "strategy": "vector",
      "intent": "attendance_policy",
      "chunksRetrieved": 2,
      "citations": [
        {
          "documentId": "67b93a001122334455667799",
          "title": "Student Academic Regulations 2025",
          "pageNumber": 6,
          "score": 0.884
        },
        {
          "documentId": "67b93a001122334455667799",
          "title": "Student Academic Regulations 2025",
          "pageNumber": 7,
          "score": 0.842
        }
      ]
    }
  },
  "message": "Query processed successfully"
}
```

- **Response `200 OK` (Needs Context / Clarification Prompt)**:
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

### Retrieve Conversation Thread
- **Endpoint**: `GET /api/chat/:id`
- **Access Level**: **Public**
- **Description**: Returns full message history and accumulated `queryContext` for an active session.

---

## 3. System & Health Endpoints

### System Health Check
- **Endpoint**: `GET /api/health`
- **Access Level**: **Public**
- **Description**: Returns server uptime, version, and MongoDB connection status.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "uptime": 3600.24,
  "timestamp": "2026-09-02T12:00:00.000Z",
  "database": "connected",
  "version": "0.1.0"
}
```

---

## 4. Authentication & Admin User Management

### Admin Login
- **Endpoint**: `POST /api/auth/login`
- **Access Level**: **Public**
- **Request Body**:
```json
{
  "email": "admin@university.edu",
  "password": "SecurePassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "67b93a001122334455667700",
      "name": "Academic Administrator",
      "email": "admin@university.edu",
      "role": "admin"
    }
  }
}
```

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
- `GET /api/subjects` — **Public** (Query params: `department`, `program`, `semester`, `code`, `name`)
- `GET /api/subjects/:id` — **Public**
- `POST /api/subjects` — **Admin Protected**
- `PUT /api/subjects/:id` — **Admin Protected**
- `DELETE /api/subjects/:id` — **Admin Protected**

### Scheduled Examinations
- `GET /api/exams` — **Public** (Query params: `department`, `program`, `semester`, `examType`, `date`)
- `GET /api/exams/:id` — **Public**
- `POST /api/exams` — **Admin Protected**
- `PUT /api/exams/:id` — **Admin Protected**
- `DELETE /api/exams/:id` — **Admin Protected**

### Assignments & Deadlines
- `GET /api/assignments` — **Public** (Query params: `department`, `program`, `semester`, `subject`)
- `GET /api/assignments/:id` — **Public**
- `POST /api/assignments` — **Admin Protected**
- `PUT /api/assignments/:id` — **Admin Protected**
- `DELETE /api/assignments/:id` — **Admin Protected**

### Academic Calendar Events
- `GET /api/academic-calendar` — **Public** (Query params: `category`, `semester`, `academicYear`)
- `GET /api/academic-calendar/:id` — **Public**
- `POST /api/academic-calendar` — **Admin Protected**
- `PUT /api/academic-calendar/:id` — **Admin Protected**
- `DELETE /api/academic-calendar/:id` — **Admin Protected**

### Institutional Regulations
- `GET /api/regulations` — **Public** (Query params: `category`, `department`, `program`)
- `GET /api/regulations/:id` — **Public**
- `POST /api/regulations` — **Admin Protected**
- `PUT /api/regulations/:id` — **Admin Protected**
- `DELETE /api/regulations/:id` — **Admin Protected**

---

## 6. Knowledge Base & Document Management Endpoints

### List Ingested Documents
- **Endpoint**: `GET /api/documents`
- **Access Level**: **Public**
- **Query Parameters**: `department`, `program`, `status`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "67b93a001122334455667799",
      "title": "Student Academic Regulations 2025",
      "originalFileName": "student_handbook_2025.pdf",
      "department": { "_id": "67b93a001122334455667701", "name": "Computer Science & Engineering", "code": "CSE" },
      "program": { "_id": "67b93a001122334455667702", "name": "B.Tech Computer Science & Engineering", "code": "BTECH-CSE" },
      "status": "ready",
      "totalPages": 28,
      "totalChunks": 142,
      "uploadedAt": "2026-08-30T10:00:00.000Z",
      "processedAt": "2026-08-30T10:01:15.000Z"
    }
  ]
}
```

### Upload & Ingest PDF Document
- **Endpoint**: `POST /api/documents/upload`
- **Access Level**: **Admin Protected**
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `department` (string ObjectId, required)
  - `program` (string ObjectId, required)
  - `title` (string, optional)
  - `file` (PDF file binary, required, max 50MB)
- **Description**: Saves PDF to disk, creates `AcademicDocument` record, extracts text per page, chunks content, generates 768-dim Gemini embeddings in batch, and stores chunks in MongoDB `knowledge_chunks`.

### Check Ingestion Status
- **Endpoint**: `GET /api/documents/:id/status`
- **Access Level**: **Public**
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "totalPages": 28,
    "totalChunks": 142,
    "processingError": null
  }
}
```

### Download Original PDF File
- **Endpoint**: `GET /api/documents/:id/download`
- **Access Level**: **Public**
- **Description**: Streams the stored PDF binary with proper Content-Disposition headers.

### Delete Ingested Document & Chunks
- **Endpoint**: `DELETE /api/documents/:id`
- **Access Level**: **Admin Protected**
- **Description**: Removes the document record, deletes associated `knowledge_chunks`, and removes the stored file from disk.

---

## 7. Bulk Data Import Endpoints

### Validate Bulk Import Payload
- **Endpoint**: `POST /api/bulk-import/validate`
- **Access Level**: **Admin Protected**
- **Request Body**:
```json
{
  "entityType": "subjects",
  "format": "csv",
  "data": "code,name,credits,semester,departmentCode\nCS501,Database Management Systems,4,5,CSE"
}
```

### Confirm Bulk Import Execution
- **Endpoint**: `POST /api/bulk-import/confirm`
- **Access Level**: **Admin Protected**
