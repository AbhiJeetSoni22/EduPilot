import { QueryAnalysis } from '../../../types/query-analysis.types';
import { Regulation } from '../../../models/regulation.model';
import { HandlerResult } from './direct.handler';

export class VectorHandler {
  public async handle(
    userMessage: string,
    analysis: QueryAnalysis
  ): Promise<HandlerResult> {
    const { intent } = analysis;

    let category = 'general';
    if (intent === 'attendance_policy') category = 'attendance';
    if (intent === 'grading_policy') category = 'grading';
    if (intent === 'academic_regulation') category = 'promotion';

    const regs = await Regulation.find({
      $or: [{ category }, { category: 'general' }],
    }).limit(2);

    if (regs.length > 0) {
      const reg = regs[0];
      const rulesText = reg.keyRules
        .slice(0, 3)
        .map((rule, idx) => `• Rule ${idx + 1}: ${rule}`)
        .join('\n');

      return {
        response:
          `⚖️ **Institutional Policy: ${reg.title}**\n\n` +
          `${reg.summary}\n\n` +
          `${rulesText}\n\n` +
          `*Note: Full semantic PDF search with excerpt citations will be enabled in Phase 4 RAG integration.*`,
        data: regs,
      };
    }

    return {
      response:
        `This policy inquiry is designated for document knowledge search.\n\n` +
        `• **Query Goal**: ${intent.replace(/_/g, ' ')}\n` +
        `• **Retrieval Channel**: Knowledge Base / Institutional Circulars\n\n` +
        `*Official policy circulars are accessible via the Academic Portal. Detailed PDF vector chunk retrieval will be active in Phase 4.*`,
    };
  }
}

export const vectorHandler = new VectorHandler();
