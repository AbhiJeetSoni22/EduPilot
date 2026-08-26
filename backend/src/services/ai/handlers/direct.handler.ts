import { QueryAnalysis } from '../../../types/query-analysis.types';
import { geminiService } from '../gemini.service';

export interface HandlerResult {
  response: string;
  data?: Record<string, unknown> | Array<unknown>;
}

export class DirectHandler {
  public async handle(
    userMessage: string,
    analysis: QueryAnalysis
  ): Promise<HandlerResult> {
    const lower = userMessage.toLowerCase();

    // 1. Common Greetings
    if (/^(hi|hello|hey|greetings)\b/i.test(lower)) {
      return {
        response:
          'Hello! 👋 I am EduPilot, your AI academic assistant. You can ask me questions about syllabus details, exam schedules, credit requirements, assignment deadlines, and university academic policies.',
      };
    }

    // 2. Platform Capabilities
    if (/who are you|what can you do|help/i.test(lower)) {
      return {
        response:
          'I am EduPilot, designed to assist university students with:\n' +
          '• **Exam Schedules**: Timetables, shifts, and venues\n' +
          '• **Syllabus & Credits**: Course unit breakdowns and textbook references\n' +
          '• **Assignments**: Upcoming deadlines and submission guidelines\n' +
          '• **Academic Policies**: Attendance criteria, grading formulas, and regulations\n\n' +
          'How can I help you today?',
      };
    }

    // 3. Concept Explanations (Use Gemini if configured for concise definitions)
    if (geminiService.isConfigured()) {
      try {
        const aiAnswer = await geminiService.generateContent(
          `Provide a clear, authoritative, and concise 2-3 paragraph academic explanation for the following student question:\n"${userMessage}"`,
          {
            systemInstruction:
              'You are EduPilot, an educational AI companion. Explain standard academic computer science/engineering concepts clearly and concisely with key bullet points. Do not invent any university-specific exam dates or administrative policies.',
            responseMimeType: 'text/plain',
            temperature: 0.2,
          }
        );
        return { response: aiAnswer };
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback definition for DBMS/Standard concepts
    if (/dbms/i.test(lower)) {
      return {
        response:
          '**Database Management Systems (DBMS)** is software designed to store, retrieve, define, and manage structured data in a database.\n\n' +
          '• **Key Functions**: Data storage, indexing, concurrency control, transaction integrity (ACID properties), and backup/recovery.\n' +
          '• **Common Examples**: PostgreSQL, MySQL, MongoDB, Oracle DB.\n\n' +
          'Would you like to know the course credits, syllabus, or exam dates for DBMS in your curriculum?',
      };
    }

    return {
      response: `I understand you are asking about "${userMessage}". How can I provide further detail on this topic or your curriculum?`,
    };
  }
}

export const directHandler = new DirectHandler();
