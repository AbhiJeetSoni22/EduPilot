import { apiClient, ApiResponse } from './api.client';

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  _id: string;
  name: string;
  code: string;
  department: Department | string;
  degreeType: 'Undergraduate' | 'Postgraduate' | 'Diploma' | 'Doctorate';
  durationYears: number;
  totalSemesters: number;
  academicYear: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface SyllabusUnit {
  unitNumber: number;
  title: string;
  topics: string[];
  hours?: number;
}

export interface EvaluationScheme {
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  passingMarks: number;
}

export interface Subject {
  _id: string;
  name: string;
  code: string;
  department: Department;
  program: Program;
  semester: number;
  credits: number;
  type: 'Theory' | 'Practical' | 'Theory + Practical' | 'Elective';
  academicYear: string;
  description?: string;
  syllabusUnits: SyllabusUnit[];
  evaluationScheme: EvaluationScheme;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  _id: string;
  title: string;
  subject: Subject;
  subjectCode: string;
  department: Department;
  program: Program;
  semester: number;
  academicYear: string;
  examType: 'Mid-Semester' | 'End-Semester' | 'Quiz' | 'Practical' | 'Supplementary';
  examDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  maxMarks: number;
  instructions: string[];
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  _id: string;
  title: string;
  subject: Subject;
  subjectCode: string;
  department: Department;
  program: Program;
  semester: number;
  academicYear: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  weightage?: number;
  submissionFormat: 'PDF' | 'ZIP' | 'Code Repository' | 'Hard Copy' | 'Online Form';
  instructions: string[];
  status: 'active' | 'closed' | 'draft';
  createdAt: string;
  updatedAt: string;
}

export interface AcademicCalendarEvent {
  _id: string;
  title: string;
  academicYear: string;
  semester: 'Odd' | 'Even' | 'Annual' | 'All';
  eventType: 'Academic' | 'Examination' | 'Holiday' | 'Registration' | 'Event' | 'Deadline';
  startDate: string;
  endDate: string;
  description?: string;
  isHoliday: boolean;
  targetAudience: 'All' | 'Students' | 'Faculty' | 'Staff';
  department?: Department;
  createdAt: string;
  updatedAt: string;
}

export interface Regulation {
  _id: string;
  regulationCode: string;
  title: string;
  category: 'attendance' | 'grading' | 'promotion' | 'examination' | 'disciplinary' | 'general';
  academicYear: string;
  summary: string;
  content: string;
  keyRules: string[];
  status: 'active' | 'superseded' | 'draft';
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicDocumentItem {
  _id: string;
  title: string;
  documentType:
    | 'academic_regulations'
    | 'examination_rules'
    | 'attendance_policy'
    | 'grading_policy'
    | 'syllabus'
    | 'student_handbook'
    | 'academic_circular';
  department?: Department;
  program?: Program;
  semester?: number;
  academicYear: string;
  version: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'archived';
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storageReference: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  tags: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  department?: Department;
  program?: Program;
  semester?: number;
  academicYear?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface BulkImportValidationResult {
  entityType: string;
  totalCount: number;
  validCount: number;
  invalidCount: number;
  validRecords: Record<string, unknown>[];
  invalidRecords: Array<{
    row: number;
    data: Record<string, unknown>;
    errors: string[];
  }>;
}

export const academicService = {
  // Departments
  getDepartments: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<Department[]>(`/departments${qs}`);
  },
  getDepartmentById: (id: string) => apiClient<Department>(`/departments/${id}`),
  createDepartment: (data: Partial<Department>) =>
    apiClient<Department>('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: Partial<Department>) =>
    apiClient<Department>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id: string) =>
    apiClient<{ id: string }>(`/departments/${id}`, { method: 'DELETE' }),

  // Programs
  getPrograms: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<Program[]>(`/programs${qs}`);
  },
  getProgramById: (id: string) => apiClient<Program>(`/programs/${id}`),
  createProgram: (data: Partial<Program>) =>
    apiClient<Program>('/programs', { method: 'POST', body: JSON.stringify(data) }),
  updateProgram: (id: string, data: Partial<Program>) =>
    apiClient<Program>(`/programs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProgram: (id: string) =>
    apiClient<{ id: string }>(`/programs/${id}`, { method: 'DELETE' }),

  // Subjects
  getSubjects: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<Subject[]>(`/subjects${qs}`);
  },
  getSubjectById: (id: string) => apiClient<Subject>(`/subjects/${id}`),
  createSubject: (data: Partial<Subject>) =>
    apiClient<Subject>('/subjects', { method: 'POST', body: JSON.stringify(data) }),
  updateSubject: (id: string, data: Partial<Subject>) =>
    apiClient<Subject>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubject: (id: string) =>
    apiClient<{ id: string }>(`/subjects/${id}`, { method: 'DELETE' }),

  // Exams
  getExams: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<Exam[]>(`/exams${qs}`);
  },
  getExamById: (id: string) => apiClient<Exam>(`/exams/${id}`),
  createExam: (data: Partial<Exam>) =>
    apiClient<Exam>('/exams', { method: 'POST', body: JSON.stringify(data) }),
  updateExam: (id: string, data: Partial<Exam>) =>
    apiClient<Exam>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExam: (id: string) => apiClient<{ id: string }>(`/exams/${id}`, { method: 'DELETE' }),

  // Assignments
  getAssignments: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<Assignment[]>(`/assignments${qs}`);
  },
  getAssignmentById: (id: string) => apiClient<Assignment>(`/assignments/${id}`),
  createAssignment: (data: Partial<Assignment>) =>
    apiClient<Assignment>('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignment: (id: string, data: Partial<Assignment>) =>
    apiClient<Assignment>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssignment: (id: string) =>
    apiClient<{ id: string }>(`/assignments/${id}`, { method: 'DELETE' }),

  // Academic Calendar
  getCalendarEvents: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<AcademicCalendarEvent[]>(`/academic-calendar${qs}`);
  },
  getCalendarEventById: (id: string) =>
    apiClient<AcademicCalendarEvent>(`/academic-calendar/${id}`),
  createCalendarEvent: (data: Partial<AcademicCalendarEvent>) =>
    apiClient<AcademicCalendarEvent>('/academic-calendar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCalendarEvent: (id: string, data: Partial<AcademicCalendarEvent>) =>
    apiClient<AcademicCalendarEvent>(`/academic-calendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCalendarEvent: (id: string) =>
    apiClient<{ id: string }>(`/academic-calendar/${id}`, { method: 'DELETE' }),

  // Regulations
  getRegulations: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<Regulation[]>(`/regulations${qs}`);
  },
  getRegulationById: (id: string) => apiClient<Regulation>(`/regulations/${id}`),
  createRegulation: (data: Partial<Regulation>) =>
    apiClient<Regulation>('/regulations', { method: 'POST', body: JSON.stringify(data) }),
  updateRegulation: (id: string, data: Partial<Regulation>) =>
    apiClient<Regulation>(`/regulations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRegulation: (id: string) =>
    apiClient<{ id: string }>(`/regulations/${id}`, { method: 'DELETE' }),

  // Knowledge Base Documents
  getDocuments: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<AcademicDocumentItem[]>(`/documents${qs}`);
  },
  getDocumentById: (id: string) => apiClient<AcademicDocumentItem>(`/documents/${id}`),
  uploadDocument: (formData: FormData) =>
    apiClient<AcademicDocumentItem>('/documents/upload', {
      method: 'POST',
      body: formData,
    }),
  deleteDocument: (id: string) =>
    apiClient<{ id: string }>(`/documents/${id}`, { method: 'DELETE' }),
  getDocumentDownloadUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/documents/${id}/download`,

  // Bulk Import
  validateBulkImport: (formData: FormData) =>
    apiClient<BulkImportValidationResult>('/bulk-import/validate', {
      method: 'POST',
      body: formData,
    }),
  confirmBulkImport: (entityType: string, records: Record<string, unknown>[]) =>
    apiClient<{ entityType: string; insertedCount: number; insertedIds: string[] }>(
      '/bulk-import/confirm',
      {
        method: 'POST',
        body: JSON.stringify({ entityType, records }),
      }
    ),

  // Users
  getUsers: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<UserProfile[]>(`/users${qs}`);
  },
  getUserById: (id: string) => apiClient<UserProfile>(`/users/${id}`),
  updateUser: (id: string, data: Partial<UserProfile>) =>
    apiClient<UserProfile>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => apiClient<{ id: string }>(`/users/${id}`, { method: 'DELETE' }),
};
