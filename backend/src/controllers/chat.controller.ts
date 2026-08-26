import { Request, Response } from 'express';
import { conversationService } from '../services/conversation.service';
import { orchestratorService } from '../services/ai/orchestrator.service';
import { sendSuccess, sendError } from '../utils/response';
import { ChatResponsePayload } from '../types/query-analysis.types';
import { Conversation } from '../models/conversation.model';

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { message, conversationId, queryContext } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      sendError(res, 'A non-empty "message" string is required', 400, 'VALIDATION_ERROR');
      return;
    }

    // 1. Get or create conversation session
    const conversation = await conversationService.getOrCreateConversation(
      conversationId,
      queryContext
    );

    // 2. Find last assistant query analysis if previous turn requested clarification
    const lastAssistantMessage = [...conversation.messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.queryAnalysis);
    const lastPendingAnalysis = lastAssistantMessage?.queryAnalysis;

    // 3. Run master orchestration pipeline
    const output = await orchestratorService.orchestrate(
      message.trim(),
      conversation.queryContext,
      lastPendingAnalysis
    );

    // 3. Persist conversation turn
    await conversationService.recordTurn(
      conversation,
      message.trim(),
      output.response,
      output.queryAnalysis
    );

    // 4. Return structured response payload
    const responsePayload: ChatResponsePayload = {
      status: output.status,
      conversationId: conversation.conversationId,
      queryAnalysis: output.queryAnalysis,
      response: output.response,
      data: output.data,
      missingContext: output.missingContext,
    };

    sendSuccess(res, responsePayload, 'Query processed successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Chat processing failed';
    console.error('Chat controller error:', error);
    sendError(res, errMessage, 500, 'CHAT_ERROR');
  }
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findOne({ conversationId: id });
    if (!conversation) {
      sendError(res, 'Conversation session not found', 404, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, {
      conversationId: conversation.conversationId,
      messages: conversation.messages,
      queryContext: conversation.queryContext,
      lastActiveAt: conversation.lastActiveAt,
      createdAt: conversation.createdAt,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch conversation';
    sendError(res, errMessage, 500);
  }
}
