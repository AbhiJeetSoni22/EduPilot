import { QueryContext } from '../../types/query-context';
import {
  QueryAnalysis,
  ChatResponseStatus,
} from '../../types/query-analysis.types';
import { queryAnalyzerService } from './query-analyzer.service';
import { directHandler } from './handlers/direct.handler';
import { clarificationHandler } from './handlers/clarification.handler';
import { vectorHandler } from './handlers/vector.handler';
import { ParameterValidator } from './parameter-validator';
import {
  SubjectService,
  ExamService,
  AssignmentService,
  AcademicCalendarService,
  RegulationService,
  RetrievedAcademicData,
} from '../academic/academic.services';
import { responseGeneratorService } from './response-generator.service';

export interface OrchestratorOutput {
  status: ChatResponseStatus | 'retrieval_unavailable';
  queryAnalysis: QueryAnalysis;
  response: string;
  data?: Record<string, unknown> | Array<unknown>;
  missingContext?: string[];
}

export class OrchestratorService {
  public async orchestrate(
    message: string,
    existingContext: QueryContext = {},
    lastPendingAnalysis?: QueryAnalysis
  ): Promise<OrchestratorOutput> {
    // 1. Analyze user's incoming message against existingContext
    let analysis = await queryAnalyzerService.analyzeQuery(
      message,
      existingContext
    );

    // 2. Deterministic Clarification Continuation:
    // If previous turn requested clarification, preserve original pending intent and merge new entities
    if (
      lastPendingAnalysis &&
      lastPendingAnalysis.retrievalStrategy === 'clarification' &&
      (analysis.intent === 'context_response' ||
        analysis.intent === 'general_inquiry' ||
        analysis.intent === 'unknown' ||
        analysis.retrievalStrategy === 'clarification')
    ) {
      // Deterministically merge newly extracted entities over pending analysis entities & existingContext
      const mergedEntities = {
        ...lastPendingAnalysis.entities,
        ...(analysis.entities.department ? { department: analysis.entities.department } : {}),
        ...(analysis.entities.semester !== undefined && analysis.entities.semester !== null ? { semester: analysis.entities.semester } : {}),
        ...(analysis.entities.subject ? { subject: analysis.entities.subject } : {}),
        ...(analysis.entities.subjectCode ? { subjectCode: analysis.entities.subjectCode } : {}),
        ...(analysis.entities.program ? { program: analysis.entities.program } : {}),
        ...(analysis.entities.academicYear ? { academicYear: analysis.entities.academicYear } : {}),
      };

      // Recalculate provided context
      const provided = new Set<string>();
      if (mergedEntities.department || existingContext.department) provided.add('department');
      if (mergedEntities.semester !== undefined || existingContext.semester !== undefined) provided.add('semester');
      if (mergedEntities.subject || existingContext.subject) provided.add('subject');
      if (mergedEntities.subjectCode) provided.add('subject');

      // Check required context from the original pending analysis
      const required = lastPendingAnalysis.requiredContext || ['department', 'semester'];
      const missing = required.filter((req) => !provided.has(req.toLowerCase()));

      analysis = {
        ...lastPendingAnalysis,
        entities: mergedEntities,
        providedContext: Array.from(provided),
        missingContext: missing,
        retrievalStrategy: missing.length === 0 ? 'structured' : 'clarification',
        confidenceScore: 0.95,
        reasoningSummary: `Preserved pending intent "${lastPendingAnalysis.intent}" with updated cohort context.`,
      };
    }

    const { retrievalStrategy, missingContext, intent, entities } = analysis;

    // 2. Strategy: Clarification
    if (retrievalStrategy === 'clarification' && missingContext.length > 0) {
      const result = clarificationHandler.handle(analysis);
      return {
        status: 'needs_context',
        queryAnalysis: analysis,
        response: result.response,
        missingContext,
      };
    }

    // 3. Strategy: Direct (Concepts, Greetings, Platform Help)
    if (retrievalStrategy === 'direct') {
      const result = await directHandler.handle(message, analysis);
      return {
        status: 'answer_ready',
        queryAnalysis: analysis,
        response: result.response,
        data: result.data,
      };
    }

    // 4. Strategy: Structured (MongoDB Curriculum, Exams, Deadlines)
    if (retrievalStrategy === 'structured') {
      const sanitized = ParameterValidator.sanitize(entities, existingContext);
      let retrieved: RetrievedAcademicData;

      switch (intent) {
        case 'subject_credits':
        case 'syllabus_breakdown':
          retrieved = await SubjectService.findSubject(sanitized);
          break;

        case 'exam_schedule':
          retrieved = await ExamService.findExams(sanitized);
          break;

        case 'assignment_deadlines':
          retrieved = await AssignmentService.findAssignments(sanitized);
          break;

        case 'academic_calendar':
          retrieved = await AcademicCalendarService.findCalendarEvents(sanitized);
          break;

        case 'attendance_policy':
        case 'grading_policy':
        case 'academic_regulation':
          retrieved = await RegulationService.findRegulations(intent);
          break;

        default:
          // Default to subject or exam check
          if (sanitized.subject || sanitized.semester) {
            retrieved = await SubjectService.findSubject(sanitized);
          } else {
            retrieved = {
              category: 'empty',
              records: [],
              summaryText: 'No matching academic category identified.',
              found: false,
            };
          }
          break;
      }

      // Generate grounded response from verified retrieved data
      const groundedResponse = await responseGeneratorService.generateGroundedResponse(
        message,
        analysis,
        retrieved
      );

      return {
        status: 'answer_ready',
        queryAnalysis: analysis,
        response: groundedResponse,
        data: retrieved.records,
      };
    }

    // 5. Strategy: Vector (Phase 4 Semantic Document Search)
    if (retrievalStrategy === 'vector') {
      const result = await vectorHandler.handle(message, analysis);
      return {
        status: 'retrieval_unavailable',
        queryAnalysis: analysis,
        response: result.response,
        data: result.data,
      };
    }

    // 6. Strategy: Hybrid (Phase 4 Combined Pipeline)
    if (retrievalStrategy === 'hybrid') {
      const sanitized = ParameterValidator.sanitize(entities, existingContext);
      const structData = await SubjectService.findSubject(sanitized);

      const combinedResponse =
        (structData.found ? structData.summaryText + '\n\n' : '') +
        `📖 *Detailed syllabus topic excerpts and handbook search will be available in Phase 4 (Academic RAG & Vector Search).*`;

      return {
        status: 'retrieval_unavailable',
        queryAnalysis: analysis,
        response: combinedResponse,
        data: structData.records,
      };
    }

    // Default Fallback
    return {
      status: 'answer_ready',
      queryAnalysis: analysis,
      response: 'I processed your request. How can I assist you further with your academic curriculum or exams?',
    };
  }
}

export const orchestratorService = new OrchestratorService();
