# Exam & Academic Assistant (EduPilot)

> An AI-powered university and college academic chatbot built to assist students with examination schedules, syllabus details, attendance policies, assignment deadlines, institutional regulations, and PDF handbook search.

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quickstart & Installation](#quickstart--installation)
- [Environment Configuration](#environment-configuration)
- [Running Locally](#running-locally)
- [Testing & Verification Suites](#testing--verification-suites)
- [Project Documentation Hub](#project-documentation-hub)
- [Engineering Guidelines](#engineering-guidelines)

---

## Overview

The **Exam & Academic Assistant (EduPilot)** is a full-stack, enterprise-grade academic assistant designed to provide students with authoritative, fast answers to routine and critical academic queries. It combines structured databases (MongoDB), conversational intelligence (Google Gemini API), and deep semantic document retrieval (Retrieval-Augmented Generation with MongoDB Atlas Vector Search).

EduPilot operates under a clean, zero-friction access model:
- **Students / Public Users**: Enjoy immediate conversational access without mandatory logins or passwords, using conversational **Query Context** (e.g. department, semester) to disambiguate academic timetables.
- **Institutional Administrators**: Authenticate securely via JWT to manage curriculum, schedule examinations, upload PDF handbooks/circulars, and run bulk CSV/JSON imports.

---

## Key Features

### 🎓 Public Student Conversational Copilot
- **Zero-Barrier Access**: Immediate access to the academic chatbot with zero login or registration friction.
- **Natural Language Query Analysis**: Gemini-powered NLU classifies intent, extracts subject codes and semesters, and determines optimal retrieval strategies (`direct`, `structured`, `vector`, `clarification`).
- **Deterministic Clarification Loops**: When query context is missing (e.g., asking for an exam date without specifying department/semester), the assistant politely prompts for details and seamlessly continues the pending intent.
- **Zero Hallucination Grounding**: Answers are synthesized strictly from verified database records and official document excerpts.

### 📚 Structured Academic Catalog
- **Curriculum & Syllabus Details**: Course credits, prerequisites, unit breakdowns, and recommended textbooks.
- **Exam Timetables & Shifts**: Exam dates, timings, venues, and assessment formats.
- **Assignments & Deadlines**: Homework milestones, submission requirements, and weightage.
- **Academic Calendar**: Semester start/end dates, holidays, convocation schedules, and add/drop deadlines.
- **Institutional Regulations**: Passing rules, attendance thresholds, grading scales (GPA/CGPA), condonation policies, and backlog rules.

### 🔍 Academic RAG & Vector Search (MongoDB Atlas)
- **Automated PDF Ingestion**: Admin upload portal with page-boundary preserving text extraction.
- **Section & Page-Aware Chunking**: Semantic chunking (~800 characters with 120-character overlap) preserving exact page numbers and chunk indexes.
- **Gemini 768-dim Vector Embeddings**: Batch embedding generation using Google Gemini (`gemini-embedding-001`).
- **Atlas Vector Search Stage**: `$vectorSearch` aggregation pipelines with dynamic metadata pre-filtering (Department, Program, Semester, Subject Code, Academic Year).
- **Grounded Synthesis & Page Citations**: Responses synthesized with strict source attribution, complete with clickable/formatted citations (`📖 Sources: • Handbook — Page N`).
- **Robust Deterministic Fallback**: Automatic, deduplicated cross-page synthesis when offline or during upstream LLM latency.

### 🏛️ Administrative Management Portal
- **Role-Based Security**: Secured with bcrypt password hashing and Admin JWT tokens.
- **Academic Data Management**: Full CRUD operations for departments, programs, subjects, exams, assignments, and regulations.
- **Knowledge Base Ingestion**: PDF document upload, status monitoring, chunk inspectability, and file management.
- **Bulk Data Import**: CSV/JSON ingestion pipeline with pre-validation and interactive data preview.

---

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Vanilla CSS Design System with dark/light themes and glassmorphism.
- **Backend**: Node.js, Express.js, TypeScript, Mongoose ODM, Multer, pdf-parse, csv-parse.
- **Database & Storage**: MongoDB (Local or Atlas) for structured entities; MongoDB Atlas Vector Search for semantic chunk embeddings.
- **AI / LLM Layer**: Google Gemini API (`gemini-2.5-flash` / `gemini-3.7-flash` for NLU & synthesis; `gemini-embedding-001` for 768-dim embeddings).
- **Tooling**: npm, Concurrently, tsx, TypeScript 5.7.

---

## Repository Structure

```text
EduPilot/
├── frontend/                # Next.js frontend application
│   ├── app/                 # Next.js App Router (pages, layouts, admin portal)
│   │   ├── admin/           # Admin dashboard & Knowledge Base portal
│   │   ├── login/           # Admin login page
│   │   ├── register/        # Admin registration page
│   │   ├── globals.css      # Master design tokens & styles
│   │   └── page.tsx         # Public landing page with ChatInterface
│   ├── components/          # Reusable UI components (Chat, ThemeToggle, Health)
│   ├── context/             # AuthContext & ThemeContext
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility helpers
│   ├── services/            # Frontend API client services
│   ├── types/               # TypeScript interfaces
│   └── package.json
│
├── backend/                 # Express REST API application
│   ├── src/
│   │   ├── config/          # Environment & Database connections
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Auth & error middleware
│   │   ├── models/          # Mongoose database models (Subjects, Exams, Chunks, etc.)
│   │   ├── routes/          # API route definitions
│   │   ├── scripts/         # Seeding & automated test suites
│   │   ├── services/        # Business logic & AI/RAG services
│   │   │   ├── academic/    # Structured academic services
│   │   │   ├── ai/          # Orchestrator, Analyzer, Handlers, Gemini service
│   │   │   └── ai/rag/      # Ingestion, Chunking, Embeddings, VectorSearch, RAG
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Helper utilities & loggers
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server entry point
│   └── package.json
│
├── docs/                    # Documentation-driven development hub
│   ├── PRD.md               # Product Requirements Document
│   ├── STATUS.md            # Implementation roadmap & milestone tracker
│   ├── ARCHITECTURE.md      # System architecture & data flow
│   ├── API.md               # API endpoint specification
│   ├── AI_RAG.md            # AI, NLU & RAG Vector Search specification
│   ├── DEVELOPMENT_GUIDELINES.md # Core engineering principles
│   └── atlas_vector_search_index.json # MongoDB Atlas Vector Index definition
│
├── .gitignore
├── README.md                # Root project overview
└── package.json             # Root runner scripts
```

---

## Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/exam_academic_assistant`) or MongoDB Atlas URI (required for Vector Search aggregation)
- **Google Gemini API Key**: API key with access to Gemini text and embedding models

---

## Quickstart & Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd EduPilot
   ```

2. **Install all dependencies** (root, backend, and frontend):
   ```bash
   npm run install:all
   ```

3. **Set up environment files**:
   - Backend: Copy `backend/.env.example` to `backend/.env`
   - Frontend: Copy `frontend/.env.example` to `frontend/.env.local`

4. **Seed initial academic curriculum & admin user**:
   ```bash
   npm run seed --prefix backend
   ```

---

## Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/exam_academic_assistant
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSIONS=768
JWT_SECRET=your_jwt_secret_key_here
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Running Locally

### Run both Frontend and Backend concurrently:
```bash
npm run dev
```

### Or run individually:
- **Backend** (`http://localhost:5000`):
  ```bash
  npm run dev:backend
  ```
  Health endpoint: `http://localhost:5000/api/health`

- **Frontend** (`http://localhost:3000`):
  ```bash
  npm run dev:frontend
  ```

---

## Testing & Verification Suites

EduPilot includes comprehensive automated test suites covering all architectural layers:

```bash
# Test database and Gemini API connectivity
npm run test:connections --prefix backend

# Test Gemini AI NLU Query Analysis & Intent Extraction
npm run test:ai --prefix backend

# Test Phase 3 Conversational Integration (16 test scenarios)
npm run test:integration --prefix backend

# Test Phase 4 Document Ingestion, PDF parsing & Chunking
npm run test:rag --prefix backend

# Test Phase 4 End-to-End Vector RAG, Atlas Search, & Synthesis (40 tests)
npm run test:rag-integration --prefix backend

# Test Gemini API reliability and timeout resilience
npm run test:gemini --prefix backend
```

---

## Project Documentation Hub

Detailed specifications and architectural guides are maintained in the [`docs/`](docs/) directory:

- [Product Requirements Document (PRD)](docs/PRD.md) — Vision, user personas, and scope.
- [Development Status & Roadmap](docs/STATUS.md) — Implementation milestones and live status.
- [System Architecture](docs/ARCHITECTURE.md) — Dual-pathway architecture, sequence flows, and components.
- [API Specification](docs/API.md) — Complete REST endpoint documentation and schemas.
- [AI & RAG Architecture](docs/AI_RAG.md) — NLU query analysis, embedding models, and Vector Search.
- [Engineering Guidelines](docs/DEVELOPMENT_GUIDELINES.md) — Code quality standards and security rules.
- [Atlas Vector Search Index](docs/atlas_vector_search_index.json) — MongoDB Atlas Vector index definition.

---

## Engineering Guidelines

1. **Unauthenticated Public Chat**: Student queries never require login or passwords.
2. **Mandatory Admin Protection**: All create/update/delete operations require Admin JWT authentication (`requireRole('admin')`).
3. **Roll Number is Context, NOT Identity**: Roll numbers only filter cohort timetables; private records are never exposed.
4. **Backend-Only AI Operations**: All Gemini calls and prompt logic reside exclusively in the backend.
5. **Zero Hallucination of Institutional Rules**: Every response must be strictly grounded in verified database records or retrieved document chunks.
