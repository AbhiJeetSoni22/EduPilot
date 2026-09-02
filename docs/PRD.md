# Product Requirements Document (PRD) — Exam & Academic Assistant (EduPilot)

## 1. Project Overview
**Exam & Academic Assistant (EduPilot)** is an AI-powered academic companion designed for university and college students. It provides fast, conversational, and authoritative answers to questions regarding examinations, academic calendars, syllabus details, grading policies, attendance regulations, assignment requirements, and PDF institutional handbooks.

---

## 2. Problem Statement
In higher education institutions, vital academic information is often fragmented across multiple PDF handbooks, disparate institutional portals, departmental notice boards, and syllabus sheets. Consequently:
- Students experience anxiety and confusion regarding examination timetables, evaluation criteria, and attendance thresholds.
- Faculty and administrative staff spend substantial time repeatedly answering routine academic policy and scheduling questions.
- Changes or nuances in academic regulations are often missed by students.

---

## 3. Target Users & Access Model

### A. Student / Public Experience (Unauthenticated)
- **Zero-Barrier Access**: Students can open EduPilot and interact with the academic chatbot immediately without registration, login, password, or student JWTs.
- **Open Academic Inquiries**: General academic questions (e.g. *"What is the DBMS syllabus?"*, *"How many credits is CS501?"*, *"What are the semester 5 attendance rules?"*, *"Explain the grading scale"*, *"What is the condonation fee?"*) are publicly accessible.
- **Query Context (Not Authentication)**: If a specific query requires additional context (e.g., department, program, semester, or roll number), the assistant prompts for that context conversationally. Query context is strictly used as a query filter, never as an identity verification token.
- **Privacy & Security Boundary**: Private student records (e.g., individual marks, personal attendance percentages, disciplinary files) are strictly outside the current MVP and will never be exposed via roll number.

### B. Administrator Experience (Authenticated)
- **Institutional Authority**: Deans, department heads, and academic staff manage the official source-of-truth.
- **Protected Access**: All data mutations (creating/editing/deleting subjects, scheduling exams, configuring regulations, uploading knowledge base documents, and bulk importing data) require verified Admin JWT authentication and authorization (`requireRole('admin')`).

---

## 4. Main Objective
Provide a unified, conversational natural-language assistant backed by Google's **Gemini API**, structured MongoDB databases, and an end-to-end **RAG (Retrieval-Augmented Generation)** pipeline to deliver accurate, institution-verified answers with zero hallucination on official policies.

---

## 5. Core Capabilities

### Academic Information Retrieval (Public Chatbot)
- **Exam Schedules & Information**: Exam dates, shifts, venues, hall ticket regulations, and re-evaluation procedures.
- **Syllabus & Course Information**: Unit-wise breakdown, textbook references, prerequisites, and credit allocations.
- **Attendance Rules & Requirements**: Minimum attendance criteria, condonation policies, medical leave protocols, and processing fees.
- **Assignment & Project Tracking**: Submission deadlines, format guidelines, and internal assessment weightage.
- **Grading & Evaluation Policies**: GPA/CGPA calculation schemas, passing criteria, grace marks, and backlog policies.
- **Academic Regulations & PDF Handbooks**: Deep semantic search across institutional regulations, student handbooks, and policy circulars with page-level citations.

### Academic Management Portal (Protected Admin)
- **Curriculum Management**: Department, Program, and Subject definitions with credit breakdowns.
- **Exam & Calendar Scheduling**: Assessment timelines, exam shifts, and academic milestones.
- **Knowledge Base Management**: PDF handbook uploads, text extraction, section chunking, 768-dim vector embeddings, and chunk inspection.
- **Batch Data Operations**: Bulk CSV/JSON imports with pre-validation and interactive preview.

---

## 6. Project Scope & Phased Roadmap

### Phase 1: MVP Foundation *(Complete & Verified)*
- Clean full-stack separation (Next.js frontend, Express backend, MongoDB database).
- Operational health monitoring (`/api/health`).
- Project documentation and master design tokens.

### Phase 2: Structured Academic Data & Administration *(Complete & Verified)*
- MongoDB Mongoose schemas for Departments, Programs, Subjects, Exams, Assignments, Calendar Events, Regulations, and Documents.
- Authoritative RESTful APIs: Public read endpoints for curriculum/exam info, Admin-protected mutation endpoints.
- Administrator authentication and JWT session verification for Academic Management Portal.
- Bulk CSV/JSON import with validation pipeline.
- Seed data scripts for initial institutional setup.
- Unauthenticated public student access model established with Query Context architecture.

### Phase 3: Conversational AI & Gemini Integration *(Complete & Verified)*
- Gemini API integration with prompt orchestration, structured JSON analysis, and strict schema validation (`validateAndNormalizeQueryAnalysis`).
- Dedicated academic query routing (`SubjectService`, `ExamService`, `AssignmentService`, `AcademicCalendarService`, `RegulationService`).
- Parameter sanitization (`ParameterValidator`) preventing query injection and regex tampering.
- Zero-hallucination grounded answer generation (`ResponseGeneratorService`) using verified database records as sole truth.
- Multi-turn conversational clarification loop with pending intent re-evaluation.
- Public `/api/chat` conversational endpoint with multi-turn session persistence and `ChatInterface.tsx` frontend component.
- Comprehensive 16-case end-to-end integration test suite (`test:integration`).

### Phase 4: Academic RAG & Vector Search *(Complete & Verified)*
- Document ingestion pipeline for academic PDFs with page boundary preservation (`PdfExtractorService`, `ChunkingService`).
- Gemini 768-dimensional vector embedding generation (`GeminiEmbeddingProvider`).
- MongoDB Atlas Vector Search integration with dynamic metadata pre-filtering (`VectorSearchService`).
- Grounded RAG answer synthesis service (`RagResponseService`) with page-level citations (`formatCitationBlock`).
- Robust deterministic cross-page synthesis fallback when offline or during API latency.
- Full 40-case automated test suite (`test:rag`, `test:rag-integration`).

### Phase 5: Administration & Analytics *(In Progress)*
- Admin Knowledge Base portal (`/admin/knowledge-base`) with upload, status polling, and chunk inspection.
- Interactive student timetable and academic calendar viewers.
- Query trend analytics, unanswered question logging, and knowledge base coverage insights.

---

## 7. Technology Stack Summary
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript | Responsive user interface, Public Chatbot UI & Admin Portal |
| **Styling** | Vanilla CSS Design System | Responsive layout, dark/light theme, glassmorphism |
| **Backend** | Node.js, Express.js, TypeScript | REST API, validation, admin authentication, AI orchestration |
| **Database** | MongoDB, Mongoose | Structured storage for academic entities and document metadata |
| **AI Layer** | Google Gemini API (`gemini-2.5-flash` / `gemini-3.7-flash`) | Natural language understanding, intent classification, grounded synthesis |
| **Vector / RAG** | MongoDB Atlas Vector Search & `gemini-embedding-001` | 768-dim semantic document retrieval from institutional PDFs |
| **Orchestration**| npm scripts, Concurrently, tsx | Coordinated full-stack local development and automated testing |
