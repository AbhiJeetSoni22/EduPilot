import { QueryContext } from './query-context';

export type RetrievalStrategy =
  | 'direct'
  | 'structured'
  | 'vector'
  | 'hybrid'
  | 'clarification';

export type AcademicIntent =
  | 'concept_explanation'
  | 'subject_credits'
  | 'syllabus_breakdown'
  | 'exam_schedule'
  | 'assignment_deadlines'
  | 'academic_calendar'
  | 'attendance_policy'
  | 'grading_policy'
  | 'academic_regulation'
  | 'hybrid_curriculum_policy'
  | 'general_inquiry'
  | 'context_response'
  | 'ambiguous'
  | 'unknown';

export interface ExtractedEntities {
  subject?: string;
  subjectCode?: string;
  department?: string;
  program?: string;
  semester?: number;
  academicYear?: string;
  examType?: string;
  date?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface QueryAnalysis {
  intent: AcademicIntent;
  entities: ExtractedEntities;
  requiredContext: string[];
  providedContext: string[];
  missingContext: string[];
  retrievalStrategy: RetrievalStrategy;
  confidenceScore?: number;
  clarificationPrompt?: string;
  reasoningSummary?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  queryAnalysis?: QueryAnalysis;
  timestamp: Date;
}

export interface ChatRequestPayload {
  message: string;
  conversationId?: string;
  queryContext?: QueryContext;
}

export type ChatResponseStatus =
  | 'answer_ready'
  | 'needs_context'
  | 'retrieval_required'
  | 'error';

export interface ChatResponsePayload {
  status: ChatResponseStatus;
  conversationId: string;
  queryAnalysis: QueryAnalysis;
  response?: string;
  data?: Record<string, unknown> | Array<unknown>;
  missingContext?: string[];
  message?: string;
}
