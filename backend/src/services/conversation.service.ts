import mongoose from 'mongoose';
import { Conversation, IConversation, IMessage } from '../models/conversation.model';
import { QueryContext } from '../types/query-context';
import { QueryAnalysis } from '../types/query-analysis.types';
import crypto from 'crypto';

export class ConversationService {
  private inMemoryStore: Map<string, IConversation> = new Map();

  /**
   * Retrieves an existing conversation or creates a fresh session if not found.
   */
  public async getOrCreateConversation(
    conversationId?: string,
    initialContext?: QueryContext
  ): Promise<IConversation> {
    const id = conversationId || `conv_${crypto.randomUUID()}`;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        let conversation = await Conversation.findOne({ conversationId: id });
        if (!conversation) {
          conversation = new Conversation({
            conversationId: id,
            messages: [],
            queryContext: initialContext || {},
            lastActiveAt: new Date(),
          });
          await conversation.save();
        } else if (initialContext && Object.keys(initialContext).length > 0) {
          conversation.queryContext = this.mergeContext(conversation.queryContext, initialContext);
          conversation.lastActiveAt = new Date();
          await conversation.save();
        }
        return conversation;
      } catch (err) {
        console.warn('[ConversationService] Database query failed, using in-memory store:', err);
      }
    }

    // In-memory fallback
    let conv = this.inMemoryStore.get(id);
    if (!conv) {
      conv = {
        conversationId: id,
        messages: [],
        queryContext: initialContext || {},
        lastActiveAt: new Date(),
        createdAt: new Date(),
        save: async () => conv!,
      } as unknown as IConversation;
      this.inMemoryStore.set(id, conv);
    } else if (initialContext && Object.keys(initialContext).length > 0) {
      conv.queryContext = this.mergeContext(conv.queryContext, initialContext);
      conv.lastActiveAt = new Date();
    }

    return conv;
  }

  /**
   * Appends user and assistant messages along with updated query context.
   */
  public async recordTurn(
    conversation: IConversation,
    userMessage: string,
    assistantResponse: string,
    analysis: QueryAnalysis,
    updatedContext?: QueryContext
  ): Promise<IConversation> {
    const now = new Date();

    const userEntry: IMessage = {
      role: 'user',
      content: userMessage,
      timestamp: now,
    };

    const assistantEntry: IMessage = {
      role: 'assistant',
      content: assistantResponse,
      queryAnalysis: analysis,
      timestamp: now,
    };

    conversation.messages.push(userEntry, assistantEntry);

    if (updatedContext) {
      conversation.queryContext = this.mergeContext(conversation.queryContext, updatedContext);
    }

    // Merge any extracted entities into the conversation query context
    if (analysis.entities) {
      const entityContext: QueryContext = {};
      if (analysis.entities.department) entityContext.department = analysis.entities.department;
      if (analysis.entities.program) entityContext.program = analysis.entities.program;
      if (analysis.entities.semester) entityContext.semester = analysis.entities.semester;
      if (analysis.entities.academicYear) entityContext.academicYear = analysis.entities.academicYear;
      if (analysis.entities.subject) entityContext.subject = analysis.entities.subject;

      conversation.queryContext = this.mergeContext(conversation.queryContext, entityContext);
    }

    conversation.lastActiveAt = now;

    if (mongoose.connection.readyState === 1 && typeof (conversation as any).save === 'function') {
      try {
        await conversation.save();
      } catch (err) {
        console.warn('[ConversationService] Failed to persist conversation turn to DB:', err);
      }
    } else {
      this.inMemoryStore.set(conversation.conversationId, conversation);
    }

    return conversation;
  }

  /**
   * Safe merge of new context values over existing context without overwriting valid data with null/undefined.
   */
  public mergeContext(base: QueryContext = {}, incoming: QueryContext = {}): QueryContext {
    return {
      rollNumber: incoming.rollNumber || base.rollNumber,
      department: incoming.department || base.department,
      program: incoming.program || base.program,
      semester: incoming.semester !== undefined && incoming.semester !== null ? incoming.semester : base.semester,
      academicYear: incoming.academicYear || base.academicYear,
      subject: incoming.subject || base.subject,
    };
  }
}

export const conversationService = new ConversationService();
