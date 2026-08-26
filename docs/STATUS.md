# Development Status Tracker — Exam & Academic Assistant (EduPilot)

This tracker reflects the current implementation milestones and roadmap for the **Exam & Academic Assistant (EduPilot)** project.

---

## Current Roadmap & Status

### Phase 1: Project Initialization & Foundation
- [x] Repository structure created
- [x] Frontend initialized (Next.js 15, React 19, TypeScript)
- [x] Backend initialized (Express.js, TypeScript)
- [x] MongoDB configuration prepared (Mongoose connection lifecycle)
- [x] Environment configuration prepared
- [x] Documentation structure created

---

### Phase 2: Structured Academic Data & Administration
- [x] Academic data models (Departments, Programs, Subjects, Exams, Assignments, Calendar Events, Regulations, Documents)
- [x] Public read-only REST APIs for curriculum, exam schedules, and policy data
- [x] Admin authentication & session management (JWT / bcrypt)
- [x] Admin authorization (`requireRole('admin')`)
- [x] Protected management operations (CRUD mutations, Document uploads, Bulk import)
- [x] Bulk CSV/JSON data import with validation pipeline and preview
- [x] Database seeding scripts with comprehensive sample academic curriculum
- [x] Public student/chat access (Zero login/registration barriers for general academic queries)
- [x] Student authentication removed from MVP
- [x] Query-Context approach defined and documented

---

### Phase 3: Conversational AI & Gemini Integration *(Next Up)*
- [ ] Gemini API service integration
- [ ] Intent detection & prompt engineering pipeline
- [ ] Conversational Query Context extraction (identifying missing parameters like department/semester)
- [ ] Dynamic query routing (Structured MongoDB queries vs open academic synthesis)
- [ ] Chat conversation models & session persistence
- [ ] Chat REST endpoints & real-time streaming support
- [ ] Conversational fallback & safe response boundaries

---

### Phase 4: Academic RAG & Vector Search *(Planned)*
- [ ] Document ingestion pipeline (PDF parsing & text extraction)
- [ ] Document chunking & embedding generation (Gemini embeddings)
- [ ] MongoDB Atlas Vector Search index integration
- [ ] Hybrid context retrieval (structured DB + vector embeddings)
- [ ] Citation & source document attribution in responses

---

### Phase 5: Student & Admin Interfaces *(Planned)*
- [ ] Public conversational chat interface with markdown & rich message rendering
- [ ] Conversational context prompt widgets
- [ ] Academic calendar & schedule viewer for students
- [ ] Enhanced Admin panel (document chunk inspector, query analytics)

---

### Phase 6: Quality Assurance & Deployment *(Planned)*
- [ ] Backend unit & integration testing
- [ ] Frontend end-to-end testing
- [ ] API rate limiting & security hardening
- [ ] CI/CD pipeline configuration
- [ ] Production deployment & monitoring setup
