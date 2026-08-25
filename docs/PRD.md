# Product Requirements Document (PRD) — Exam & Academic Assistant

## 1. Project Overview
**Exam & Academic Assistant** is an AI-powered academic support chatbot designed for university and college students. It provides fast, conversational, and authoritative answers to students' questions regarding examinations, academic calendars, syllabus details, grading policies, attendance regulations, and assignment requirements.

---

## 2. Problem Statement
In higher education institutions, vital academic information is often fragmented across multiple PDF handbooks, disparate institutional portals, departmental notice boards, and syllabus sheets. Consequently:
- Students experience anxiety and confusion regarding examination timetables, evaluation criteria, and attendance thresholds.
- Faculty and administrative staff spend substantial time repeatedly answering routine academic policy and scheduling questions.
- Changes or nuances in academic regulations are often missed by students.

---

## 3. Target Users
1. **Undergraduate & Postgraduate Students**: Seeking quick, reliable, and contextual answers about courses, exams, assignments, and policies.
2. **Faculty / Academic Advisors** *(Planned)*: Referring students to standardized academic regulations and managing course-specific data.
3. **University Administrators** *(Planned)*: Uploading academic documents, managing course metadata, updating exam schedules, and monitoring query trends.

---

## 4. Main Objective
Provide a unified, conversational natural-language assistant backed by Google's **Gemini API**, structured MongoDB databases, and a future **RAG (Retrieval-Augmented Generation)** pipeline to deliver accurate, institution-verified answers with zero hallucination on official policies.

---

## 5. Core Chatbot Capabilities (Target Experience)
- **Exam Schedules & Information**: Exam dates, shifts, venues, hall ticket regulations, and re-evaluation procedures.
- **Syllabus & Course Information**: Unit-wise breakdown, textbook references, prerequisites, and credit allocations.
- **Attendance Rules & Requirements**: Minimum attendance criteria, condonation policies, and medical leave protocols.
- **Assignment & Project Tracking**: Submission deadlines, format guidelines, and internal assessment weightage.
- **Grading & Evaluation Policies**: GPA/CGPA calculation schemas, passing criteria, grace marks, and backlog policies.
- **Academic Regulations**: Degree completion guidelines, semester promotion rules, and disciplinary procedures.

---

## 6. Project Scope

### Phase 1: MVP Scope
- **Scaffold & Architecture**: Clean separation between Next.js frontend, Express backend, and MongoDB database.
- **System Health & Monitoring**: Operational `/api/health` checking server uptime and database connectivity.
- **Documentation System**: Comprehensive PRD, Architecture, AI/RAG specs, API specs, and development guidelines.
- **UI Foundation**: Modern, responsive placeholder layout highlighting upcoming capabilities with backend health status connectivity.

### Phase 2: Structured Academic Data & Auth *(Planned)*
- User authentication & role management (Student, Admin).
- MongoDB Mongoose schemas for Exams, Courses/Subjects, Schedules, Assignments, and Regulations.
- RESTful CRUD APIs for academic entities.
- Student dashboard for viewing upcoming exams and assignment timelines.

### Phase 3: Conversational AI & Gemini Integration *(Planned)*
- Gemini API integration with prompt orchestration and intent classification.
- Dynamic query routing: resolving structured database queries vs open-domain academic questions.
- Chat session persistence and multi-turn context retention.

### Phase 4: Academic RAG & Vector Search *(Planned)*
- Document ingestion pipeline for academic PDFs (student handbooks, syllabi, exam circulars).
- Text extraction, chunking, and embedding generation via Gemini / text-embedding models.
- MongoDB Atlas Vector Search integration for semantic context retrieval.
- Grounded response generation with source citations.

### Phase 5: Administration & Analytics *(To Be Discussed)*
- Admin dashboard for PDF uploads and chunk inspection.
- Unanswered query analytics and student sentiment metrics.
- Multi-department / multi-program segregation.

---

## 7. Technology Stack Summary
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), React, TypeScript | Responsive user interface & client-side state |
| **Styling** | Modern CSS / CSS Modules | Premium design system, responsive layouts, glassmorphism |
| **Backend** | Node.js, Express.js, TypeScript | REST API, validation, orchestration, business logic |
| **Database** | MongoDB, Mongoose | Structured storage for users, courses, exams, chat histories |
| **AI Layer** | Google Gemini API *(Planned)* | Natural language understanding, intent recognition, text synthesis |
| **Vector / RAG** | MongoDB Atlas Vector Search *(Planned)* | Semantic document retrieval from institutional PDFs |
| **Orchestration**| npm scripts, Concurrently | Coordinated full-stack local development |
