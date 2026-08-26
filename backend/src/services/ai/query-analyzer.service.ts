import { QueryAnalysis, AcademicIntent, RetrievalStrategy } from '../../types/query-analysis.types';
import { QueryContext } from '../../types/query-context';
import { geminiService } from './gemini.service';
import {
  QUERY_ANALYSIS_SYSTEM_INSTRUCTION,
  buildQueryAnalysisUserPrompt,
} from './prompts/query-analysis.prompt';
import { validateAndNormalizeQueryAnalysis } from './query-analysis.schema';

export class QueryAnalyzerService {
  /**
   * Primary entry point: Analyzes user query against conversation context.
   */
  public async analyzeQuery(
    message: string,
    existingContext: QueryContext = {}
  ): Promise<QueryAnalysis> {
    const trimmedMessage = message.trim();

    // 1. If Gemini is configured, run AI Query Analysis
    if (geminiService.isConfigured()) {
      try {
        const userPrompt = buildQueryAnalysisUserPrompt(trimmedMessage, existingContext);
        const rawJsonText = await geminiService.generateContent(userPrompt, {
          systemInstruction: QUERY_ANALYSIS_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.05,
        });

        // Strip any accidental markdown fences
        const cleanedJson = rawJsonText
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed = JSON.parse(cleanedJson);
        const validation = validateAndNormalizeQueryAnalysis(parsed);

        if (validation.isValid && validation.data) {
          return this.reconcileContextAndStrategy(validation.data, existingContext, trimmedMessage);
        }
      } catch (err: unknown) {
        console.warn(
          '[QueryAnalyzer] AI API unavailable or timed out, executing deterministic fallback analysis:',
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // 2. Deterministic Fallback Analyzer (for local testing, offline dev, or rate-limit failover)
    return this.deterministicFallbackAnalyze(trimmedMessage, existingContext);
  }

  /**
   * Reconciles detected context against existing context and guarantees correct strategy transition.
   */
  private reconcileContextAndStrategy(
    analysis: QueryAnalysis,
    existingContext: QueryContext,
    message: string
  ): QueryAnalysis {
    const activeDept = analysis.entities.department || existingContext.department;
    const activeSem = analysis.entities.semester || existingContext.semester;
    const activeSubj = analysis.entities.subject || analysis.entities.subjectCode || existingContext.subject;
    const activeRoll = analysis.entities.subject ? undefined : existingContext.rollNumber;

    const provided = new Set<string>(analysis.providedContext);
    if (activeDept) provided.add('department');
    if (activeSem) provided.add('semester');
    if (activeSubj) provided.add('subject');
    if (activeRoll) provided.add('rollnumber');

    analysis.providedContext = Array.from(provided);

    // Context resolution for exam schedules
    if (analysis.intent === 'exam_schedule') {
      const needsContext = !activeSubj && (!activeDept || !activeSem);
      if (needsContext) {
        const missing: string[] = [];
        if (!activeDept) missing.push('department');
        if (!activeSem) missing.push('semester');

        analysis.requiredContext = ['department', 'semester'];
        analysis.missingContext = missing;
        analysis.retrievalStrategy = 'clarification';
        if (!analysis.clarificationPrompt) {
          analysis.clarificationPrompt = 'Please specify your department and semester (e.g. CSE semester 5) to view upcoming exam schedules.';
        }
      } else {
        analysis.missingContext = [];
        analysis.retrievalStrategy = 'structured';
      }
    }

    // Context resolution for concept explanation (should always be direct without requiring student context)
    if (analysis.intent === 'concept_explanation') {
      analysis.requiredContext = [];
      analysis.missingContext = [];
      analysis.retrievalStrategy = 'direct';
    }

    // Context resolution for subject credits
    if (analysis.intent === 'subject_credits' || analysis.intent === 'syllabus_breakdown') {
      analysis.requiredContext = ['subject'];
      if (activeSubj) {
        analysis.missingContext = [];
        analysis.retrievalStrategy = 'structured';
      } else {
        analysis.missingContext = ['subject'];
        analysis.retrievalStrategy = 'clarification';
        analysis.clarificationPrompt = 'Which subject or course code are you inquiring about?';
      }
    }

    return analysis;
  }

  /**
   * Deterministic rule-based analyzer ensuring guaranteed execution even if external AI is unreachable.
   */
  public deterministicFallbackAnalyze(
    message: string,
    existingContext: QueryContext = {}
  ): QueryAnalysis {
    const lower = message.toLowerCase();

    // 1. Concept / Definition Questions
    if (/^(what is|explain|define|tell me about|how does)\s+(dbms|dijkstra|sql|os|data structure|tcp|udp|oop)/i.test(lower)) {
      const match = lower.match(/(dbms|dijkstra|sql|os|data structure|tcp|udp|oop)/i);
      return {
        intent: 'concept_explanation',
        entities: { subject: match ? match[0].toUpperCase() : undefined },
        requiredContext: [],
        providedContext: [],
        missingContext: [],
        retrievalStrategy: 'direct',
        confidenceScore: 0.98,
        reasoningSummary: 'General academic/technical concept explanation requiring no institutional database lookup.',
      };
    }

    // 2. Greetings & General Inquiry
    if (/^(hi|hello|hey|greetings|who are you|what can you do|help)\b/i.test(lower)) {
      return {
        intent: 'general_inquiry',
        entities: {},
        requiredContext: [],
        providedContext: [],
        missingContext: [],
        retrievalStrategy: 'direct',
        confidenceScore: 0.99,
        reasoningSummary: 'Conversational greeting or capability inquiry.',
      };
    }

    // 3. Subject Credits Queries
    if (/credits?|credit value|how many credits/i.test(lower)) {
      const subjectMatch = lower.match(/(dbms|cs501|operating systems|computer networks|software engineering)/i);
      const subject = subjectMatch ? subjectMatch[0].toUpperCase() : existingContext.subject;

      if (subject) {
        return {
          intent: 'subject_credits',
          entities: { subject, subjectCode: subject.startsWith('CS') ? subject : undefined },
          requiredContext: ['subject'],
          providedContext: ['subject'],
          missingContext: [],
          retrievalStrategy: 'structured',
          confidenceScore: 0.95,
          reasoningSummary: 'Subject credits lookup from structured MongoDB curriculum.',
        };
      }
      return {
        intent: 'subject_credits',
        entities: {},
        requiredContext: ['subject'],
        providedContext: [],
        missingContext: ['subject'],
        retrievalStrategy: 'clarification',
        clarificationPrompt: 'Which subject or course code would you like to know the credits for?',
        confidenceScore: 0.9,
      };
    }

    // 4. Hybrid Queries (Exam + Syllabus / Topics)
    if (/exam.*(?:topics?|syllabus|included)|syllabus.*(?:exam|timetable)/i.test(lower)) {
      const subjectMatch = lower.match(/(dbms|cs501|operating systems|computer networks)/i);
      return {
        intent: 'hybrid_curriculum_policy',
        entities: { subject: subjectMatch ? subjectMatch[0].toUpperCase() : existingContext.subject },
        requiredContext: ['subject'],
        providedContext: subjectMatch ? ['subject'] : [],
        missingContext: [],
        retrievalStrategy: 'hybrid',
        confidenceScore: 0.92,
        reasoningSummary: 'Combined inquiry requiring structured exam schedule and RAG document syllabus topics.',
      };
    }

    // 5. Policy & Regulations (Attendance, Grading, Promotion)
    if (/attendance|condonation|minimum attendance|75%|medical leave/i.test(lower)) {
      return {
        intent: 'attendance_policy',
        entities: {},
        requiredContext: [],
        providedContext: [],
        missingContext: [],
        retrievalStrategy: 'vector',
        confidenceScore: 0.95,
        reasoningSummary: 'Institutional attendance regulation inquiry targeted for policy document search.',
      };
    }

    if (/grading|gpa|cgpa|passing marks|pass criteria|grade point/i.test(lower)) {
      return {
        intent: 'grading_policy',
        entities: {},
        requiredContext: [],
        providedContext: [],
        missingContext: [],
        retrievalStrategy: 'vector',
        confidenceScore: 0.95,
        reasoningSummary: 'Academic grading formula & passing criteria policy query.',
      };
    }

    // 6. Exam Schedules
    if (/exam|timetable|test|mid-term|end-term|schedule/i.test(lower)) {
      const deptMatch = lower.match(/(cse|computer science|ece|me|ee|civil)/i);
      const semMatch = lower.match(/sem(?:ester)?\s*(\d+)/i) || lower.match(/(\d+)(?:th|st|nd|rd)?\s*sem/i);
      const subjMatch = lower.match(/(dbms|cs501|operating systems|computer networks)/i);

      const dept = deptMatch ? deptMatch[0].toUpperCase() : existingContext.department;
      const sem = semMatch ? parseInt(semMatch[1], 10) : existingContext.semester;
      const subj = subjMatch ? subjMatch[0].toUpperCase() : undefined;

      const hasSufficientContext = Boolean(subj || (dept && sem));

      if (hasSufficientContext) {
        return {
          intent: 'exam_schedule',
          entities: {
            department: dept,
            semester: sem,
            subject: subj,
          },
          requiredContext: ['department', 'semester'],
          providedContext: [
            ...(dept ? ['department'] : []),
            ...(sem ? ['semester'] : []),
            ...(subj ? ['subject'] : []),
          ],
          missingContext: [],
          retrievalStrategy: 'structured',
          confidenceScore: 0.95,
          reasoningSummary: 'Exam schedule query with complete cohort context.',
        };
      }

      const missing: string[] = [];
      if (!dept) missing.push('department');
      if (!sem) missing.push('semester');

      return {
        intent: 'exam_schedule',
        entities: {
          department: dept,
          semester: sem,
        },
        requiredContext: ['department', 'semester'],
        providedContext: [
          ...(dept ? ['department'] : []),
          ...(sem ? ['semester'] : []),
        ],
        missingContext: missing,
        retrievalStrategy: 'clarification',
        clarificationPrompt: 'Please provide your department and semester (e.g. CSE semester 5) to check your exam schedule.',
        confidenceScore: 0.92,
        reasoningSummary: 'Exam schedule query missing department/semester context.',
      };
    }

    // 7. Context Response (Student answering with "CSE semester 5" or "Roll 101")
    const deptMatch = lower.match(/(cse|computer science|ece|me|ee|civil)/i);
    const semMatch = lower.match(/sem(?:ester)?\s*(\d+)/i) || lower.match(/(\d+)(?:th|st|nd|rd)?\s*sem/i);
    if (deptMatch || semMatch) {
      return {
        intent: 'context_response',
        entities: {
          department: deptMatch ? deptMatch[0].toUpperCase() : existingContext.department,
          semester: semMatch ? parseInt(semMatch[1], 10) : existingContext.semester,
        },
        requiredContext: [],
        providedContext: [
          ...(deptMatch ? ['department'] : []),
          ...(semMatch ? ['semester'] : []),
        ],
        missingContext: [],
        retrievalStrategy: 'structured',
        confidenceScore: 0.95,
        reasoningSummary: 'Context update provided by student.',
      };
    }

    // Default Fallback
    return {
      intent: 'general_inquiry',
      entities: {},
      requiredContext: [],
      providedContext: [],
      missingContext: [],
      retrievalStrategy: 'direct',
      confidenceScore: 0.8,
      reasoningSummary: 'Unclassified general inquiry.',
    };
  }
}

export const queryAnalyzerService = new QueryAnalyzerService();
