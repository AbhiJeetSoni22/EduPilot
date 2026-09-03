import { Request, Response } from 'express';
import { Conversation } from '../models/conversation.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getQueryAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const conversations = await Conversation.find({}).select('conversationId messages').lean();
    const intentCounts: Record<string, number> = {};
    const strategyCounts: Record<string, number> = {};
    const unanswered: Array<{ conversationId: string; question: string; intent: string; timestamp: Date }> = [];
    let totalQueries = 0;
    let answeredQueries = 0;
    let clarificationQueries = 0;

    for (const conversation of conversations) {
      const messages = conversation.messages || [];
      for (let i = 0; i < messages.length; i += 1) {
        const assistant = messages[i];
        if (assistant.role !== 'assistant' || !assistant.queryAnalysis) continue;
        const userMessage = messages[i - 1];
        if (!userMessage || userMessage.role !== 'user') continue;

        totalQueries += 1;
        const analysis = assistant.queryAnalysis as { intent?: string; retrievalStrategy?: string };
        const intent = analysis.intent || 'unknown';
        const strategy = analysis.retrievalStrategy || 'unknown';
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;

        const answer = assistant.content || '';
        const isClarification = strategy === 'clarification' || intent === 'ambiguous' || intent === 'unknown';
        const isUnanswered = !answer || /couldn't find|not found|unable to find|don't have enough information|no verified/i.test(answer);
        if (isClarification) clarificationQueries += 1;
        if (!isUnanswered) answeredQueries += 1;
        if (isUnanswered && !isClarification && unanswered.length < 50) {
          unanswered.push({
            conversationId: conversation.conversationId,
            question: userMessage.content,
            intent,
            timestamp: userMessage.timestamp,
          });
        }
      }
    }

    const topIntents = Object.entries(intentCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([intent, count]) => ({ intent, count }));
    sendSuccess(res, {
      totalQueries,
      answeredQueries,
      unansweredCount: unanswered.length,
      clarificationQueries,
      answerRate: totalQueries ? Math.round((answeredQueries / totalQueries) * 100) : 0,
      intentCounts,
      strategyCounts,
      topIntents,
      unanswered,
      generatedAt: new Date().toISOString(),
    }, 'Query analytics retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load query analytics';
    sendError(res, message, 500);
  }
}
