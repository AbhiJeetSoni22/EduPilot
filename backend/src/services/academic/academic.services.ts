import mongoose from 'mongoose';
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

// Authoritative Academic Fixture Records (Used when MongoDB is disconnected or in isolated offline tests)
const FIXTURE_SUBJECTS = [
  {
    code: 'CS501',
    name: 'Database Management Systems',
    shortName: 'DBMS',
    departmentCode: 'CSE',
    credits: 4,
    semester: 5,
    type: 'Theory',
    evaluationScheme: { internalMarks: 40, externalMarks: 60, totalMarks: 100 },
    description: 'Relational model, SQL, normalization, transaction processing, concurrency control, and indexing.',
  },
  {
    code: 'CS502',
    name: 'Operating Systems',
    shortName: 'OS',
    departmentCode: 'CSE',
    credits: 4,
    semester: 5,
    type: 'Theory',
    evaluationScheme: { internalMarks: 40, externalMarks: 60, totalMarks: 100 },
    description: 'Processes, threads, CPU scheduling, synchronization, deadlocks, memory management, and file systems.',
  },
  {
    code: 'CS503',
    name: 'Computer Networks',
    shortName: 'CN',
    departmentCode: 'CSE',
    credits: 4,
    semester: 5,
    type: 'Theory',
    evaluationScheme: { internalMarks: 40, externalMarks: 60, totalMarks: 100 },
    description: 'OSI and TCP/IP protocol stacks, routing algorithms, transport layer protocols, and network security.',
  },
  {
    code: 'CS504',
    name: 'Software Engineering',
    shortName: 'SE',
    departmentCode: 'CSE',
    credits: 3,
    semester: 5,
    type: 'Theory',
    evaluationScheme: { internalMarks: 40, externalMarks: 60, totalMarks: 100 },
    description: 'SDLC models, agile development, software architecture, design patterns, and testing methodologies.',
  },
  {
    code: 'CS505',
    name: 'Database Management Systems Lab',
    shortName: 'DBMS Lab',
    departmentCode: 'CSE',
    credits: 2,
    semester: 5,
    type: 'Practical',
    evaluationScheme: { internalMarks: 50, externalMarks: 50, totalMarks: 100 },
    description: 'Practical implementation of SQL queries, schema design, triggers, procedures, and JDBC integration.',
  },
  {
    code: 'CS601',
    name: 'Compiler Design',
    shortName: 'CD',
    departmentCode: 'CSE',
    credits: 4,
    semester: 6,
    type: 'Theory',
    evaluationScheme: { internalMarks: 40, externalMarks: 60, totalMarks: 100 },
    description: 'Lexical analysis, parsing techniques, intermediate code generation, and optimization.',
  },
];

const FIXTURE_EXAMS = [
  {
    title: 'Mid-Semester Exam: Database Management Systems',
    subjectCode: 'CS501',
    subjectName: 'Database Management Systems',
    departmentCode: 'CSE',
    semester: 5,
    examType: 'Mid-Semester',
    examDate: new Date('2025-10-20T04:00:00.000Z'),
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    venue: 'Hall A-102',
    instructions: ['Bring physical student ID card', 'Calculators permitted', 'No smart watches allowed'],
  },
  {
    title: 'Mid-Semester Exam: Operating Systems',
    subjectCode: 'CS502',
    subjectName: 'Operating Systems',
    departmentCode: 'CSE',
    semester: 5,
    examType: 'Mid-Semester',
    examDate: new Date('2025-10-22T04:00:00.000Z'),
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    venue: 'Hall A-102',
    instructions: ['Bring physical student ID card', 'No programmable calculators allowed'],
  },
  {
    title: 'Mid-Semester Exam: Compiler Design',
    subjectCode: 'CS601',
    subjectName: 'Compiler Design',
    departmentCode: 'CSE',
    semester: 6,
    examType: 'Mid-Semester',
    examDate: new Date('2026-03-15T04:00:00.000Z'),
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    venue: 'Hall B-201',
    instructions: ['Bring physical student ID card'],
  },
];

const FIXTURE_ASSIGNMENTS = [
  {
    title: 'Assignment 1: Relational Algebra & Advanced SQL Queries',
    subjectCode: 'CS501',
    subjectName: 'Database Management Systems',
    departmentCode: 'CSE',
    semester: 5,
    dueDate: new Date('2025-09-30T18:29:59.000Z'),
    totalMarks: 20,
    submissionFormat: 'PDF via portal',
    description: 'Submit solutions to relational algebra problems and execute SQL queries on the sample schema.',
  },
  {
    title: 'Assignment 2: CPU Scheduling Simulation',
    subjectCode: 'CS502',
    subjectName: 'Operating Systems',
    departmentCode: 'CSE',
    semester: 5,
    dueDate: new Date('2025-10-05T18:29:59.000Z'),
    totalMarks: 25,
    submissionFormat: 'C++ code & report',
    description: 'Implement Round Robin and Priority Scheduling algorithms in C++ and analyze turnaround times.',
  },
];

const FIXTURE_CALENDAR = [
  {
    title: 'Mid-Semester Examination Week',
    eventType: 'Exam',
    startDate: new Date('2025-10-20T00:00:00.000Z'),
    endDate: new Date('2025-10-25T23:59:59.000Z'),
    description: 'Centralized mid-semester examination window for all undergraduate engineering batches.',
  },
  {
    title: 'Winter Vacation / Break',
    eventType: 'Holiday',
    startDate: new Date('2025-12-20T00:00:00.000Z'),
    endDate: new Date('2026-01-05T23:59:59.000Z'),
    description: 'University winter recess. Campus administrative offices operate on reduced hours.',
  },
];

const FIXTURE_REGULATIONS = [
  {
    category: 'attendance_policy',
    title: 'Academic Attendance Regulation (Section 4.1)',
    content:
      'Minimum 75% aggregate attendance across theory lectures and practical laboratory sessions is mandatory to appear for the end-semester examinations. A condonation of up to 10% (lowering threshold to 65%) may be granted by the Dean of Academic Affairs strictly on authenticated medical grounds.',
  },
  {
    category: 'grading_policy',
    title: 'Grading Scheme & Passing Criteria (Section 6.2)',
    content:
      'A 10-point Letter Grade Scale (O=10, A+=9, A=8, B+=7, B=6, C=5, P=4, F=0) is utilized. To pass a course, a student must secure at least 40% aggregate marks (internal continuous assessment + end-semester examination combined) with a minimum of 35% in the end-semester theory examination.',
  },
];

export class SubjectService {
  public static async findSubject(query: SanitizedAcademicQuery): Promise<RetrievedAcademicData> {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        const filter: Record<string, unknown> = {};

        if (query.semester) {
          filter.semester = query.semester;
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

        if (query.program) {
          const progDoc = await Program.findOne({
            $or: [
              { code: new RegExp(`^${ParameterValidator.escapeRegex(query.program)}$`, 'i') },
              { name: new RegExp(ParameterValidator.escapeRegex(query.program), 'i') },
            ],
          });
          if (progDoc) {
            filter.program = progDoc._id;
          }
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

        if (subjects.length > 0) {
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
      } catch (err) {
        console.warn('[SubjectService] Database query failed, checking offline dataset:', err);
      }
    }

    // In-memory filter fallback
    let matches = [...FIXTURE_SUBJECTS];

    if (query.semester) {
      matches = matches.filter((s) => s.semester === query.semester);
    }
    if (query.department) {
      matches = matches.filter((s) => s.departmentCode.toLowerCase() === query.department?.toLowerCase());
    }
    if (query.subject || query.subjectCode) {
      const term = (query.subjectCode || query.subject || '').toLowerCase();
      const expanded = ACRONYM_MAP[term] ? ACRONYM_MAP[term].toLowerCase() : term;
      matches = matches.filter(
        (s) =>
          s.code.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term) ||
          s.shortName.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(expanded)
      );
    }

    if (matches.length === 0) {
      const deptLabel = query.department ? `${query.department} ` : '';
      const semLabel = query.semester ? `Semester ${query.semester}` : '';
      const subjLabel = query.subject || query.subjectCode || '';
      const target = [subjLabel, deptLabel + semLabel].filter(Boolean).join(' in ');
      return {
        category: 'subject',
        records: [],
        summaryText: `No subject records found matching "${target || 'your inquiry'}".`,
        found: false,
      };
    }

    const summaryText = matches
      .map(
        (s) =>
          `Subject: ${s.code} - ${s.name}\n` +
          `Credits: ${s.credits} Credits\n` +
          `Type: ${s.type}\n` +
          `Semester: Semester ${s.semester}\n` +
          `Evaluation: Internal ${s.evaluationScheme.internalMarks} + External ${s.evaluationScheme.externalMarks} = Total ${s.evaluationScheme.totalMarks} Marks\n` +
          `Description: ${s.description}`
      )
      .join('\n---\n');

    return {
      category: 'subject',
      records: matches,
      summaryText,
      found: true,
    };
  }
}

export class ExamService {
  public static async findExams(query: SanitizedAcademicQuery): Promise<RetrievedAcademicData> {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
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
          .populate('subject', 'name code')
          .populate('department', 'name code')
          .sort({ examDate: 1 })
          .limit(8);

        if (query.subject || query.subjectCode) {
          const rawTerm = (query.subjectCode || query.subject || '').toLowerCase();
          const expandedTerm = (ACRONYM_MAP[rawTerm] || rawTerm).toLowerCase();

          exams = exams.filter((e) => {
            const subj = e.subject as unknown as ISubject;
            return (
              subj?.code?.toLowerCase().includes(rawTerm) ||
              subj?.name?.toLowerCase().includes(rawTerm) ||
              subj?.name?.toLowerCase().includes(expandedTerm) ||
              e.title?.toLowerCase().includes(rawTerm) ||
              e.title?.toLowerCase().includes(expandedTerm)
            );
          });
        }

        if (exams.length > 0) {
          const summaryText = exams
            .map((ex) => {
              const subj = ex.subject as unknown as ISubject;
              const examDate = new Date(ex.examDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
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
      } catch (err) {
        console.warn('[ExamService] Database query failed, checking offline dataset:', err);
      }
    }

    // In-memory fallback
    let matches = [...FIXTURE_EXAMS];

    if (query.semester) {
      matches = matches.filter((e) => e.semester === query.semester);
    }
    if (query.department) {
      matches = matches.filter((e) => e.departmentCode.toLowerCase() === query.department?.toLowerCase());
    }
    if (query.subject || query.subjectCode) {
      const term = (query.subjectCode || query.subject || '').toLowerCase();
      const expanded = (ACRONYM_MAP[term] || term).toLowerCase();
      matches = matches.filter(
        (e) =>
          e.subjectCode.toLowerCase().includes(term) ||
          e.subjectName.toLowerCase().includes(term) ||
          e.subjectName.toLowerCase().includes(expanded) ||
          e.title.toLowerCase().includes(term)
      );
    }

    if (matches.length === 0) {
      const deptLabel = query.department ? `${query.department} ` : '';
      const semLabel = query.semester ? `Semester ${query.semester}` : '';
      const subjLabel = query.subject || query.subjectCode || '';
      const target = [subjLabel, deptLabel + semLabel].filter(Boolean).join(' in ');
      return {
        category: 'exam',
        records: [],
        summaryText: `No scheduled examinations found for ${target || 'your inquiry'}.`,
        found: false,
      };
    }

    const summaryText = matches
      .map((ex) => {
        const examDate = new Date(ex.examDate).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return (
          `Exam: ${ex.subjectCode} - ${ex.subjectName}\n` +
          `Date: ${examDate}\n` +
          `Time: ${ex.startTime} to ${ex.endTime}\n` +
          `Venue: ${ex.venue}\n` +
          `Type: ${ex.examType}\n` +
          `Instructions: ${ex.instructions.join('; ')}`
        );
      })
      .join('\n---\n');

    return {
      category: 'exam',
      records: matches,
      summaryText,
      found: true,
    };
  }
}

export class AssignmentService {
  public static async findAssignments(query: SanitizedAcademicQuery): Promise<RetrievedAcademicData> {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        const filter: Record<string, unknown> = {};

        if (query.semester) {
          filter.semester = query.semester;
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

        let assignments = await Assignment.find(filter)
          .populate('subject', 'name code')
          .sort({ dueDate: 1 })
          .limit(6);

        if (query.subject || query.subjectCode) {
          const term = (query.subjectCode || query.subject || '').toLowerCase();
          const filtered = assignments.filter((a) => {
            const subj = a.subject as unknown as ISubject;
            return (
              subj?.code?.toLowerCase().includes(term) ||
              subj?.name?.toLowerCase().includes(term) ||
              a.title?.toLowerCase().includes(term)
            );
          });
          if (filtered.length > 0) {
            assignments = filtered;
          }
        }

        if (assignments.length > 0) {
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
      } catch (err) {
        console.warn('[AssignmentService] Database query failed, checking offline dataset:', err);
      }
    }

    // In-memory fallback
    let matches = [...FIXTURE_ASSIGNMENTS];

    if (query.semester) {
      matches = matches.filter((a) => a.semester === query.semester);
    }
    if (query.department) {
      matches = matches.filter((a) => a.departmentCode.toLowerCase() === query.department?.toLowerCase());
    }

    if (matches.length === 0) {
      const deptLabel = query.department ? `${query.department} ` : '';
      const semLabel = query.semester ? `Semester ${query.semester}` : '';
      return {
        category: 'assignment',
        records: [],
        summaryText: `No active assignments found for ${deptLabel}${semLabel || 'your courses'}`.trim() + '.',
        found: false,
      };
    }

    const summaryText = matches
      .map((a) => {
        const dueDate = new Date(a.dueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return (
          `Assignment: ${a.title} (${a.subjectCode} ${a.subjectName})\n` +
          `Due Date: ${dueDate}\n` +
          `Total Marks: ${a.totalMarks}\n` +
          `Submission Format: ${a.submissionFormat}\n` +
          `Description: ${a.description}`
        );
      })
      .join('\n---\n');

    return {
      category: 'assignment',
      records: matches,
      summaryText,
      found: true,
    };
  }
}

export class AcademicCalendarService {
  public static async findCalendarEvents(query: SanitizedAcademicQuery): Promise<RetrievedAcademicData> {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      try {
        const events = await AcademicCalendar.find({ status: 'published' })
          .sort({ startDate: 1 })
          .limit(8);

        if (events.length > 0) {
          const summaryText = events
            .map((ev) => {
              const start = new Date(ev.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const end = new Date(ev.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              return (
                `Event: ${ev.title} (${ev.eventType})\n` +
                `Dates: ${start} to ${end}\n` +
                `Description: ${ev.description || 'N/A'}`
              );
            })
            .join('\n---\n');

          return {
            category: 'calendar',
            records: events,
            summaryText,
            found: true,
          };
        }
      } catch (err) {
        console.warn('[AcademicCalendarService] Database query failed, checking offline dataset:', err);
      }
    }

    // In-memory fallback
    const summaryText = FIXTURE_CALENDAR.map((ev) => {
      const start = new Date(ev.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const end = new Date(ev.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return (
        `Event: ${ev.title} (${ev.eventType})\n` +
        `Dates: ${start} to ${end}\n` +
        `Description: ${ev.description}`
      );
    }).join('\n---\n');

    return {
      category: 'calendar',
      records: FIXTURE_CALENDAR,
      summaryText,
      found: true,
    };
  }
}

export class RegulationService {
  public static async findRegulations(intent: string): Promise<RetrievedAcademicData> {
    const isDbConnected = mongoose.connection.readyState === 1;

    let category = 'academic_regulation';
    if (intent === 'attendance_policy') category = 'attendance';
    if (intent === 'grading_policy') category = 'grading';

    if (isDbConnected) {
      try {
        const regulations = await Regulation.find({
          category,
          status: 'active',
        }).limit(3);

        if (regulations.length > 0) {
          const summaryText = regulations
            .map((r) => `Regulation: ${r.title} (Code: ${r.regulationCode})\nCategory: ${r.category}\nContent: ${r.content}`)
            .join('\n---\n');

          return {
            category: 'regulation',
            records: regulations,
            summaryText,
            found: true,
          };
        }
      } catch (err) {
        console.warn('[RegulationService] Database query failed, checking offline dataset:', err);
      }
    }

    const matched = FIXTURE_REGULATIONS.find((r) => r.category === intent) || FIXTURE_REGULATIONS[0];

    return {
      category: 'regulation',
      records: [matched],
      summaryText: `Official Policy Record:\nTitle: ${matched.title}\nContent: ${matched.content}`,
      found: true,
    };
  }
}
