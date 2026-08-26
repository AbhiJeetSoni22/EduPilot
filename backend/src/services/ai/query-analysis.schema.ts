import {
  QueryAnalysis,
  AcademicIntent,
  RetrievalStrategy,
  ExtractedEntities,
} from '../../types/query-analysis.types';

const ALLOWED_INTENTS: AcademicIntent[] = [
  'concept_explanation',
  'subject_credits',
  'syllabus_breakdown',
  'exam_schedule',
  'assignment_deadlines',
  'academic_calendar',
  'attendance_policy',
  'grading_policy',
  'academic_regulation',
  'hybrid_curriculum_policy',
  'general_inquiry',
  'context_response',
  'ambiguous',
  'unknown',
];

const ALLOWED_STRATEGIES: RetrievalStrategy[] = [
  'direct',
  'structured',
  'vector',
  'hybrid',
  'clarification',
];

export interface ValidationResult {
  isValid: boolean;
  data?: QueryAnalysis;
  error?: string;
}

export function validateAndNormalizeQueryAnalysis(
  rawInput: unknown
): ValidationResult {
  if (!rawInput || typeof rawInput !== 'object') {
    return {
      isValid: false,
      error: 'Query analysis payload is not a valid object',
    };
  }

  const raw = rawInput as Record<string, unknown>;

  // 1. Validate Intent
  let intent: AcademicIntent = 'unknown';
  if (typeof raw.intent === 'string' && ALLOWED_INTENTS.includes(raw.intent as AcademicIntent)) {
    intent = raw.intent as AcademicIntent;
  } else if (typeof raw.intent === 'string') {
    const matched = ALLOWED_INTENTS.find((i) => i.toLowerCase() === (raw.intent as string).toLowerCase());
    if (matched) intent = matched;
  }

  // 2. Validate Retrieval Strategy
  let retrievalStrategy: RetrievalStrategy = 'direct';
  if (
    typeof raw.retrievalStrategy === 'string' &&
    ALLOWED_STRATEGIES.includes(raw.retrievalStrategy as RetrievalStrategy)
  ) {
    retrievalStrategy = raw.retrievalStrategy as RetrievalStrategy;
  }

  // 3. Normalize Entities
  const entities: ExtractedEntities = {};
  if (raw.entities && typeof raw.entities === 'object') {
    const rawEnt = raw.entities as Record<string, unknown>;
    if (typeof rawEnt.subject === 'string' && rawEnt.subject.trim()) {
      entities.subject = rawEnt.subject.trim();
    }
    if (typeof rawEnt.subjectCode === 'string' && rawEnt.subjectCode.trim()) {
      entities.subjectCode = rawEnt.subjectCode.trim().toUpperCase();
    }
    if (typeof rawEnt.department === 'string' && rawEnt.department.trim()) {
      entities.department = rawEnt.department.trim();
    }
    if (typeof rawEnt.program === 'string' && rawEnt.program.trim()) {
      entities.program = rawEnt.program.trim();
    }
    if (rawEnt.semester !== undefined && rawEnt.semester !== null && !isNaN(Number(rawEnt.semester))) {
      entities.semester = Number(rawEnt.semester);
    }
    if (typeof rawEnt.academicYear === 'string' && rawEnt.academicYear.trim()) {
      entities.academicYear = rawEnt.academicYear.trim();
    }
    if (typeof rawEnt.examType === 'string' && rawEnt.examType.trim()) {
      entities.examType = rawEnt.examType.trim();
    }
    if (typeof rawEnt.date === 'string' && rawEnt.date.trim()) {
      entities.date = rawEnt.date.trim();
    }
    if (rawEnt.dateRange && typeof rawEnt.dateRange === 'object') {
      const dr = rawEnt.dateRange as Record<string, unknown>;
      entities.dateRange = {
        start: typeof dr.start === 'string' ? dr.start : undefined,
        end: typeof dr.end === 'string' ? dr.end : undefined,
      };
    }
  }

  // 4. Normalize Context Arrays
  const requiredContext = Array.isArray(raw.requiredContext)
    ? raw.requiredContext.filter((c): c is string => typeof c === 'string').map((s) => s.trim().toLowerCase())
    : [];

  const providedContext = Array.isArray(raw.providedContext)
    ? raw.providedContext.filter((c): c is string => typeof c === 'string').map((s) => s.trim().toLowerCase())
    : [];

  const missingContext = Array.isArray(raw.missingContext)
    ? raw.missingContext.filter((c): c is string => typeof c === 'string').map((s) => s.trim().toLowerCase())
    : [];

  const confidenceScore =
    typeof raw.confidenceScore === 'number' && !isNaN(raw.confidenceScore)
      ? Math.max(0, Math.min(1, raw.confidenceScore))
      : 0.95;

  const clarificationPrompt =
    typeof raw.clarificationPrompt === 'string' ? raw.clarificationPrompt.trim() : undefined;

  const reasoningSummary =
    typeof raw.reasoningSummary === 'string' ? raw.reasoningSummary.trim() : undefined;

  const normalized: QueryAnalysis = {
    intent,
    entities,
    requiredContext,
    providedContext,
    missingContext,
    retrievalStrategy,
    confidenceScore,
    clarificationPrompt,
    reasoningSummary,
  };

  return {
    isValid: true,
    data: normalized,
  };
}
