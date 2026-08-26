import { ExtractedEntities } from '../../types/query-analysis.types';
import { QueryContext } from '../../types/query-context';

export interface SanitizedAcademicQuery {
  subject?: string;
  subjectCode?: string;
  department?: string;
  program?: string;
  semester?: number;
  academicYear?: string;
  examType?: string;
  searchKeywords?: string[];
}

export class ParameterValidator {
  /**
   * Cleans and sanitizes raw extracted entities and query context into safe query parameters.
   */
  public static sanitize(
    entities: ExtractedEntities = {},
    context: QueryContext = {}
  ): SanitizedAcademicQuery {
    const rawSubject = entities.subject || entities.subjectCode || context.subject;
    const rawDept = entities.department || context.department;
    const rawSem = entities.semester !== undefined && entities.semester !== null ? entities.semester : context.semester;
    const rawProg = entities.program || context.program;
    const rawYear = entities.academicYear || context.academicYear;
    const rawExamType = entities.examType;

    const result: SanitizedAcademicQuery = {};

    // 1. Sanitize Subject
    if (typeof rawSubject === 'string' && rawSubject.trim()) {
      const cleanSubj = rawSubject.replace(/[^\w\s\-+]/gi, '').trim();
      if (cleanSubj.length > 0 && cleanSubj.length <= 100) {
        result.subject = cleanSubj;
        if (/^[A-Z]{2,4}\s*\d{3,4}$/i.test(cleanSubj)) {
          result.subjectCode = cleanSubj.replace(/\s+/g, '').toUpperCase();
        }
      }
    }

    // 2. Sanitize Department
    if (typeof rawDept === 'string' && rawDept.trim()) {
      const cleanDept = rawDept.replace(/[^\w\s]/gi, '').trim();
      if (cleanDept.length > 0 && cleanDept.length <= 80) {
        result.department = cleanDept.toUpperCase();
      }
    }

    // 3. Sanitize Program
    if (typeof rawProg === 'string' && rawProg.trim()) {
      const cleanProg = rawProg.replace(/[^\w\s\-]/gi, '').trim();
      if (cleanProg.length > 0 && cleanProg.length <= 80) {
        result.program = cleanProg;
      }
    }

    // 4. Sanitize Semester (must be integer between 1 and 12)
    if (rawSem !== undefined && rawSem !== null) {
      const num = parseInt(String(rawSem), 10);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        result.semester = num;
      }
    }

    // 5. Sanitize Academic Year (e.g. 2025-26)
    if (typeof rawYear === 'string' && /^\d{4}-\d{2,4}$/.test(rawYear.trim())) {
      result.academicYear = rawYear.trim();
    }

    // 6. Sanitize Exam Type
    if (typeof rawExamType === 'string') {
      const lower = rawExamType.toLowerCase();
      if (lower.includes('mid')) result.examType = 'Mid-Semester';
      else if (lower.includes('end')) result.examType = 'End-Semester';
      else if (lower.includes('quiz')) result.examType = 'Quiz';
      else if (lower.includes('prac')) result.examType = 'Practical';
      else if (lower.includes('supp')) result.examType = 'Supplementary';
    }

    return result;
  }

  /**
   * Escape special characters for safe regular expression generation.
   */
  public static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
