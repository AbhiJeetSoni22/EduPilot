import { QueryAnalysis } from '../../../types/query-analysis.types';
import { HandlerResult } from './direct.handler';

export class VectorHandler {
  public async handle(
    userMessage: string,
    analysis: QueryAnalysis
  ): Promise<HandlerResult> {
    const { intent } = analysis;

    return {
      response:
        `This policy query (${intent.replace(/_/g, ' ')}) requires deep semantic searching across official institutional PDF circulars and student handbooks.\n\n` +
        `ℹ️ *Vector-based knowledge retrieval and citation extraction will be available in Phase 4 (Academic RAG & Vector Search).*`,
      data: {
        phase: 'Phase 4 (Planned)',
        strategy: 'vector',
        intent,
      },
    };
  }
}

export const vectorHandler = new VectorHandler();
