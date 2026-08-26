import { QueryAnalysis } from '../../../types/query-analysis.types';
import { HandlerResult } from './direct.handler';

export class ClarificationHandler {
  public handle(analysis: QueryAnalysis): HandlerResult {
    const { missingContext, clarificationPrompt, intent } = analysis;

    if (clarificationPrompt) {
      return { response: clarificationPrompt };
    }

    if (intent === 'exam_schedule' || missingContext.includes('department') || missingContext.includes('semester')) {
      return {
        response:
          'To check the correct examination timetable, could you please specify your **department** and **semester** (for example: *CSE, Semester 5*)?',
      };
    }

    if (missingContext.includes('subject')) {
      return {
        response:
          'Which **subject** or **course code** would you like me to look up (for example: *CS501* or *DBMS*)?',
      };
    }

    const missingList = missingContext.join(', ');
    return {
      response: `To provide an accurate answer, could you please clarify your ${missingList}?`,
    };
  }
}

export const clarificationHandler = new ClarificationHandler();
