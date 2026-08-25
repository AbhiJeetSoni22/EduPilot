# Exam & Academic Assistant

> An AI-powered university and college academic chatbot built to assist students with examination schedules, syllabus details, attendance policies, assignment deadlines, and institutional regulations.

---

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quickstart & Installation](#quickstart--installation)
- [Environment Configuration](#environment-configuration)
- [Running Locally](#running-locally)
- [Project Documentation](#project-documentation)
- [Development Guidelines](#development-guidelines)

---

## Overview

The **Exam & Academic Assistant** is designed to provide students with authoritative, fast answers to routine and critical academic queries. It combines structured databases (MongoDB), conversational intelligence (Google Gemini API), and planned semantic document retrieval (RAG with MongoDB Atlas Vector Search).

---

## Technology Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Modern Responsive CSS
- **Backend**: Node.js, Express.js, TypeScript, Mongoose
- **Database**: MongoDB (Mongoose ODM)
- **AI / LLM**: Google Gemini API *(Planned)*
- **Vector Search / RAG**: MongoDB Atlas Vector Search *(Planned)*
- **Tooling**: npm, Concurrently, TypeScript

---

## Repository Structure

```text
exam-academic-assistant/
│
├── frontend/                # Next.js frontend application
│   ├── app/                 # Next.js App Router (pages & layouts)
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility helpers
│   ├── services/            # API client services
│   ├── types/               # TypeScript interfaces
│   └── package.json
│
├── backend/                 # Express REST API application
│   ├── src/
│   │   ├── config/          # Environment & Database connections
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Error & request middleware
│   │   ├── models/          # Mongoose database models
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic services
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Helper utilities
│   │   ├── app.ts           # Express app setup
│   │   └── server.ts        # Server entry point
│   └── package.json
│
├── docs/                    # Documentation-driven development hub
│   ├── PRD.md               # Product requirements document
│   ├── STATUS.md            # Progress & roadmap tracker
│   ├── ARCHITECTURE.md      # System architecture & data flow
│   ├── API.md               # API endpoints documentation
│   ├── AI_RAG.md            # AI & RAG architecture specification
│   └── DEVELOPMENT_GUIDELINES.md # Core engineering principles
│
├── .gitignore
├── README.md
└── package.json             # Root runner scripts
```

---

## Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **MongoDB**: Local MongoDB instance (default `mongodb://localhost:27017`) or MongoDB Atlas URI *(optional for initial health check)*

---

## Quickstart & Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd exam-academic-assistant
   ```

2. **Install all dependencies** (root, backend, and frontend):
   ```bash
   npm run install:all
   ```

3. **Set up environment files**:
   - Backend: Copy `backend/.env.example` to `backend/.env`
   - Frontend: Copy `frontend/.env.example` to `frontend/.env.local`

---

## Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/exam_academic_assistant
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_here
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
- **Backend**:
  ```bash
  npm run dev:backend
  ```
  Backend starts on `http://localhost:5000`. Health endpoint: `http://localhost:5000/api/health`.

- **Frontend**:
  ```bash
  npm run dev:frontend
  ```
  Frontend starts on `http://localhost:3000`.

---

## Project Documentation

For in-depth details on the project, please explore the `docs/` directory:

- [Product Requirements Document (PRD)](docs/PRD.md)
- [Development Status & Roadmap](docs/STATUS.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [API Specification](docs/API.md)
- [AI & RAG Architecture](docs/AI_RAG.md)
- [Engineering Guidelines](docs/DEVELOPMENT_GUIDELINES.md)
