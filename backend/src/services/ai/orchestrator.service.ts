import { QueryContext } from '../../types/query-context';
import {
  QueryAnalysis,
  ChatResponseStatus,
} from '../../types/query-analysis.types';
import { queryAnalyzerService } from './query-analyzer.service';
import { directHandler } from './handlers/direct.handler';
import { structuredHandler } from './handlers/structured.handler';
import { clarificationHandler } from './handlers/clarification.handler';
import { vectorHandler } from './handlers/vector.handler';

export interface OrchestratorOutput {
  status: ChatResponseStatus;
  queryAnalysis: QueryAnalysis;
  response: string;
  data?: Record<string, unknown> | Array<unknown>;
  missingContext?: string[];
}

export class OrchestratorService {
  public async orchestrate(
    message: string,
    existingContext: QueryContext = {}
  ): Promise<OrchestratorOutput> {
    // 1. Analyze query via Gemini Query Analyzer
    const queryAnalysis = await queryAnalyzerService.analyzeQuery(
      message,
      existingContext
    );

    const { retrievalStrategy, missingContext } = queryAnalysis;

    // 2. Route to appropriate strategy handler
    switch (retrievalStrategy) {
      case 'clarification': {
        const result = clarificationHandler.handle(queryAnalysis);
        return {
          status: 'needs_context',
          queryAnalysis,
          response: result.response,
          missingContext,
        };
      }

      case 'direct': {
        const result = await directHandler.handle(message, queryAnalysis);
        return {
          status: 'answer_ready',
          queryAnalysis,
          response: result.response,
          data: result.data,
        };
      }

      case 'structured': {
        const result = await structuredHandler.handle(
          message,
          queryAnalysis,
          existingContext
        );
        return {
          status: 'answer_ready',
          queryAnalysis,
          response: result.response,
          data: result.data,
        };
      }

      case 'vector': {
        const result = await vectorHandler.handle(message, queryAnalysis);
        return {
          status: 'answer_ready',
          queryAnalysis,
          response: result.response,
          data: result.data,
        };
      }

      case 'hybrid': {
        const structResult = await structuredHandler.handle(
          message,
          queryAnalysis,
          existingContext
        );
        const combinedResponse =
          `${structResult.response}\n\n` +
          `📖 *Detailed syllabus topics and handbook chapters will be provided by the Phase 4 RAG knowledge pipeline.*`;
        return {
          status: 'answer_ready',
          queryAnalysis,
          response: combinedResponse,
          data: structResult.data,
        };
      }

      default: {
        return {
          status: 'answer_ready',
          queryAnalysis,
          response: 'I processed your query. How can I assist you further?',
        };
      }
    }
  }
}

export const orchestratorService = new OrchestratorService();
