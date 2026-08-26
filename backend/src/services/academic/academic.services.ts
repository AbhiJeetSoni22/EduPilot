import { Subject, ISubject } from '../../models/subject.model';
import { Exam, IExam } from '../../models/exam.model';
import { Assignment, IAssignment } from '../../models/assignment.model';
import { AcademicCalendar, IAcademicCalendar } from '../../models/academic-calendar.model';
import { Regulation, IRegulation } from '../../models/regulation.model';
import { Department } from '../../models/department.model';
import { Program } from '../../models/program.model';
import { ParameterValidator, SanitizedAcademicQuery } from '../ai/parameter-validator';

export interface RetrievedAcademicData {
  category: 'subject' | 'exam' | 'assignment' | 'calendar' | 'regulation' | 'empty';
  records: Array<unknown>;
  summaryText: string;
  found: boolean;
}

const ACRONYM_MAP: Record<string, string> = {
  dbms: 'Database Management Systems',
  os: 'Operating Systems',
  cn: 'Computer Networks',
  se: 'Software Engineering',
  ai: 'Artificial Intelligence',
  ml: 'Machine Learning',
  toc: 'Theory of Computation',
  cd: 'Compiler Design',
  ds: 'Data Structures',
  daa: 'Design and Analysis of Algorithms',
  oop: 'Object Oriented Programming',
  oops: 'Object Oriented Programming',
  coa: 'Computer Organization',
  dld: 'Digital Logic',
};

export class SubjectService {
  public static async findSubject(query: SanitizedAcademicQuery): Promise<RetrievedAcademicData> {
    const filter: Record<string, unknown> = {};

    if (query.semester) {
      filter.semester = query.semester;
    }

    if (query.subject || query.subjectCode) {
      const rawTerm = query.subjectCode || query.subject || '';
      const lower = rawTerm.toLowerCase().trim();
      const expandedTerm = ACRONYM_MAP[lower] || rawTerm;

      const safeRegex = new RegExp(ParameterValidator.escapeRegex(rawTerm), 'i');
      const expandedRegex = new RegExp(ParameterValidator.escapeRegex(expandedTerm), 'i');

      filter.$or = [
        { code: safeRegex },
        { name: safeRegex },
        { shortName: safeRegex },
        { name: expandedRegex },
      ];
    }

    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .populate('program', 'name code')
      .limit(6);

    if (subjects.length === 0) {
      return {
        category: 'subject',
        records: [],
        summaryText: `No subject records found matching "${query.subject || query.subjectCode || `Semester ${query.semester}`}".`,
        found: false,
      };
    }

    const summaryText = subjects
      .map((s) => {
        return (
          `Subject: ${s.code} - ${s.name}\n` +
          `Credits: ${s.credits} Credits\n` +
          `Type: ${s.type}\n` +
          `Semester: Semester ${s.semester}\n` +
          `Evaluation: Internal ${s.evaluationScheme?.internalMarks || 40} + External ${s.evaluationScheme?.externalMarks || 60} = Total ${s.evaluationScheme?.totalMarks || 100} Marks\n` +
          `Description: ${s.description || 'N/A'}`
        );
      })
      .join('\n---\n');

    return {
      category: 'subject',
      records: subjects,
      summaryText,
      found: true,
    };
  }
}

export class ExamService {
  public static async findExams(query: SanitizedAcademicQuery): Promise<RetrievedAcademicData> {
    const filter: Record<string, unknown> = {};

    if (query.semester) {
      filter.semester = query.semester;
    }

    if (query.examType) {
      filter.examType = query.examType;
    }

    if (query.department) {
      const deptDoc = await Department.findOne({
        $or: [
          { code: new RegExp(`^${ParameterValidator.escapeRegex(query.department)}$`, 'i') },
          { name: new RegExp(ParameterValidator.escapeRegex(query.department), 'i') },
        ],
      });
      if (deptDoc) {
        filter.department = deptDoc._id;
      }
    }

    let exams = await Exam.find(filter)
      .populate('subject', 'name code credits')
      .populate('department', 'name code')
      .sort({ examDate: 1 })
      .limit(10);

    // If subject was also specified, filter by subject in-memory or query
    if (query.subject || query.subjectCode) {
      const term = (query.subjectCode || query.subject || '').toLowerCase();
      const filtered = exams.filter((e) => {
        const subj = e.subject as unknown as ISubject;
        if (!subj) return false;
        return (
          subj.code?.toLowerCase().includes(term) ||
          subj.name?.toLowerCase().includes(term) ||
          e.title?.toLowerCase().includes(term)
        );
      });
      if (filtered.length > 0) {
        exams = filtered;
      }
    }

    if (exams.length === 0) {
      const deptLabel = query.department ? `${query.department} ` : '';
      const semLabel = query.semester ? `Semester ${query.semester}` : '';
      return {
        category: 'exam',
        records: [],
        summaryText: `No scheduled examinations found for ${deptLabel}${semLabel}`.trim() + '.',
        found: false,
      };
    }

    const summaryText = exams
      .map((ex) => {
        const subj = ex.subject as unknown as ISubject;
        const examDate = new Date(ex.examDate).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return (
          `Exam: ${subj?.code || ex.subjectCode} - ${subj?.name || ex.title}\n` +
          `Date: ${examDate}\n` +
          `Time: ${ex.startTime} to ${ex.endTime}\n` +
          `Venue: ${ex.venue}\n` +
          `Type: ${ex.examType}\n` +
          `Instructions: ${(ex.instructions || []).join('; ')}`
        );
      })
      .join('\n---\n');

    return {
      category: 'exam',
      records: exams,
      summaryText,
      found: true,
    };
  }
}

export class AssignmentService {
  public static async findAssignments(query: SanitizedAcademicQuery): Promise<RetrievedAcademicData> {
    const filter: Record<string, unknown> = {};

    if (query.semester) {
      filter.semester = query.semester;
    }

    const assignments = await Assignment.find(filter)
      .populate('subject', 'name code')
      .sort({ dueDate: 1 })
      .limit(6);

    if (assignments.length === 0) {
      return {
        category: 'assignment',
        records: [],
        summaryText: `No active assignments found for ${query.semester ? `Semester ${query.semester}` : 'your courses'}.`,
        found: false,
      };
    }

    const summaryText = assignments
      .map((a) => {
        const subj = a.subject as unknown as ISubject;
        const dueDate = new Date(a.dueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return (
          `Assignment: ${a.title} (${subj?.code || ''} ${subj?.name || ''})\n` +
          `Due Date: ${dueDate}\n` +
          `Total Marks: ${a.totalMarks}\n` +
          `Submission Format: ${a.submissionFormat}\n` +
          `Description: ${a.description || 'N/A'}`
        );
      })
      .join('\n---\n');

    return {
      category: 'assignment',
      records: assignments,
      summaryText,
      found: true,
    };
  }
}

export class AcademicCalendarService {
  public static async findCalendarEvents(query: SanitizedAcademicQuery): Promise<RetrievedAcademicData> {
    const filter: Record<string, unknown> = {};
    if (query.academicYear) {
      filter.academicYear = query.academicYear;
    }

    const events = await AcademicCalendar.find(filter).sort({ startDate: 1 }).limit(8);

    if (events.length === 0) {
      return {
        category: 'calendar',
        records: [],
        summaryText: 'No academic calendar milestones or holidays published.',
        found: false,
      };
    }

    const summaryText = events
      .map((e) => {
        const start = new Date(e.startDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return `Milestone: ${e.title} (${e.eventType}) on ${start}${e.isHoliday ? ' [Holiday]' : ''}`;
      })
      .join('\n');

    return {
      category: 'calendar',
      records: events,
      summaryText,
      found: true,
    };
  }
}

export class RegulationService {
  public static async findRegulations(category: string): Promise<RetrievedAcademicData> {
    let regCategory = 'general';
    if (category.includes('attend')) regCategory = 'attendance';
    else if (category.includes('grad') || category.includes('gpa')) regCategory = 'grading';
    else if (category.includes('promot') || category.includes('backlog')) regCategory = 'promotion';

    const regs = await Regulation.find({
      $or: [{ category: regCategory }, { category: 'general' }],
    }).limit(3);

    if (regs.length === 0) {
      return {
        category: 'regulation',
        records: [],
        summaryText: 'Official regulation records for this category are maintained in the University Handbook.',
        found: false,
      };
    }

    const reg = regs[0];
    const summaryText =
      `Official Policy: ${reg.title} (${reg.regulationCode})\n` +
      `Category: ${reg.category}\n` +
      `Summary: ${reg.summary}\n` +
      `Key Rules:\n${reg.keyRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

    return {
      category: 'regulation',
      records: regs,
      summaryText,
      found: true,
    };
  }
}
