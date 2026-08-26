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
    // 1. Check if user is answering a previous clarification prompt
    let analysis = await queryAnalyzerService.analyzeQuery(
      message,
      existingContext
    );

    // If student sent a brief context response ("CSE semester 5") and there was a pending intent
    if (
      (analysis.intent === 'context_response' || analysis.intent === 'unknown' || analysis.retrievalStrategy === 'clarification') &&
      lastPendingAnalysis &&
      lastPendingAnalysis.intent !== 'general_inquiry'
    ) {
      // Re-evaluate with the merged context for the pending intent
      const mergedQueryContext: QueryContext = {
        ...existingContext,
        department: analysis.entities.department || existingContext.department,
        semester: analysis.entities.semester || existingContext.semester,
        subject: analysis.entities.subject || existingContext.subject,
      };

      // Construct simulated query for the pending intent with the updated context
      const reAnalysis = await queryAnalyzerService.analyzeQuery(
        `Check ${lastPendingAnalysis.intent.replace(/_/g, ' ')}`,
        mergedQueryContext
      );
      // Inherit original pending intent if re-analysis produced generic
      if (reAnalysis.intent === 'general_inquiry' || reAnalysis.intent === 'unknown') {
        reAnalysis.intent = lastPendingAnalysis.intent;
        reAnalysis.requiredContext = lastPendingAnalysis.requiredContext;
      }
      analysis = reAnalysis;
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
