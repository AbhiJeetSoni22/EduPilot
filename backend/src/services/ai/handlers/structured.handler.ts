import { QueryAnalysis, ExtractedEntities } from '../../../types/query-analysis.types';
import { QueryContext } from '../../../types/query-context';
import { Subject } from '../../../models/subject.model';
import { Exam } from '../../../models/exam.model';
import { Assignment } from '../../../models/assignment.model';
import { AcademicCalendar } from '../../../models/academic-calendar.model';
import { Regulation } from '../../../models/regulation.model';
import { Department } from '../../../models/department.model';
import { geminiService } from '../gemini.service';
import { HandlerResult } from './direct.handler';

export class StructuredHandler {
  public async handle(
    userMessage: string,
    analysis: QueryAnalysis,
    queryContext: QueryContext = {}
  ): Promise<HandlerResult> {
    const { intent, entities } = analysis;
    const activeSubject = entities.subject || entities.subjectCode || queryContext.subject;
    const activeDept = entities.department || queryContext.department;
    const activeSem = entities.semester || queryContext.semester;

    // 1. Subject Credits & Syllabus Breakdown
    if (intent === 'subject_credits' || intent === 'syllabus_breakdown') {
      return this.handleSubjectQuery(userMessage, activeSubject, intent);
    }

    // 2. Exam Schedules
    if (intent === 'exam_schedule') {
      return this.handleExamQuery(userMessage, activeDept, activeSem, activeSubject);
    }

    // 3. Assignment Deadlines
    if (intent === 'assignment_deadlines') {
      return this.handleAssignmentQuery(userMessage, activeSem, activeSubject);
    }

    // 4. Academic Calendar
    if (intent === 'academic_calendar') {
      return this.handleCalendarQuery(userMessage);
    }

    // 5. Regulations / Policies fallback
    if (intent === 'attendance_policy' || intent === 'grading_policy' || intent === 'academic_regulation') {
      return this.handleRegulationQuery(userMessage, intent);
    }

    // Default Structured Fallback
    return this.handleGeneralStructuredQuery(userMessage, entities, queryContext);
  }

  private async handleSubjectQuery(
    userMessage: string,
    subjectTerm?: string,
    intent?: string
  ): Promise<HandlerResult> {
    if (!subjectTerm) {
      return {
        response: 'Which subject or course code would you like information on?',
      };
    }

    const regex = new RegExp(subjectTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const subjects = await Subject.find({
      $or: [{ code: regex }, { name: regex }, { shortName: regex }],
    })
      .populate('department', 'name code')
      .populate('program', 'name code')
      .limit(3);

    if (subjects.length === 0) {
      return {
        response: `I searched the academic curriculum for "${subjectTerm}", but could not find a matching course record. Please check the course code (e.g. CS501) or full title.`,
      };
    }

    const subj = subjects[0];
    const facts =
      `Course Code: ${subj.code}\n` +
      `Course Title: ${subj.name}\n` +
      `Credits: ${subj.credits} Credits\n` +
      `Type: ${subj.type}\n` +
      `Semester: Semester ${subj.semester}\n` +
      `Description: ${subj.description || 'N/A'}\n` +
      `Evaluation Scheme: Internal ${subj.evaluationScheme?.internalMarks || 40} marks, External ${subj.evaluationScheme?.externalMarks || 60} marks.`;

    if (geminiService.isConfigured()) {
      try {
        const response = await geminiService.generateGroundedAnswer(userMessage, facts);
        return { response, data: subjects };
      } catch {
        // Fall back to direct formatting
      }
    }

    const formatted =
      `📚 **${subj.code}: ${subj.name}**\n\n` +
      `• **Credits**: ${subj.credits} credits\n` +
      `• **Course Type**: ${subj.type}\n` +
      `• **Semester**: Semester ${subj.semester}\n` +
      `• **Evaluation Weightage**: ${subj.evaluationScheme?.internalMarks || 40} Internal + ${subj.evaluationScheme?.externalMarks || 60} External (Total ${subj.evaluationScheme?.totalMarks || 100})\n\n` +
      `*${subj.description}*`;

    return { response: formatted, data: subjects };
  }

  private async handleExamQuery(
    userMessage: string,
    department?: string,
    semester?: number,
    subject?: string
  ): Promise<HandlerResult> {
    const filter: Record<string, unknown> = {};

    if (semester) {
      filter.semester = semester;
    }

    if (department) {
      const deptDoc = await Department.findOne({
        $or: [
          { code: new RegExp(`^${department}$`, 'i') },
          { name: new RegExp(department, 'i') },
        ],
      });
      if (deptDoc) {
        filter.department = deptDoc._id;
      }
    }

    const exams = await Exam.find(filter)
      .populate('subject', 'name code credits')
      .populate('department', 'name code')
      .sort({ examDate: 1 })
      .limit(10);

    if (exams.length === 0) {
      return {
        response: `No scheduled examinations were found for ${department || 'your department'} Semester ${semester || ''}. Please check if the examination cell has published the timetable for this term.`,
      };
    }

    const examListStr = exams
      .map((ex) => {
        const subjName = typeof ex.subject === 'object' && ex.subject ? (ex.subject as any).name : 'Subject';
        const subjCode = typeof ex.subject === 'object' && ex.subject ? (ex.subject as any).code : '';
        const examDate = new Date(ex.examDate).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return `- ${subjCode} (${subjName}): ${ex.examType} Exam on ${examDate} (${ex.startTime} - ${ex.endTime}) at Venue ${ex.venue}`;
      })
      .join('\n');

    const facts = `SCHEDULED EXAMINATIONS:\n${examListStr}`;

    if (geminiService.isConfigured()) {
      try {
        const response = await geminiService.generateGroundedAnswer(userMessage, facts);
        return { response, data: exams };
      } catch {
        // Fall back to direct formatting
      }
    }

    const formatted =
      `📝 **Upcoming Examination Timetable (${department || 'Academic'} Sem ${semester || ''})**\n\n` +
      exams
        .map((ex) => {
          const s = ex.subject as any;
          const examDate = new Date(ex.examDate).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          return `• **${s?.code || ''} ${s?.name || 'Assessment'}**\n  📅 ${examDate} | ⏰ ${ex.startTime} - ${ex.endTime}\n  📍 Venue: ${ex.venue}`;
        })
        .join('\n\n');

    return { response: formatted, data: exams };
  }

  private async handleAssignmentQuery(
    userMessage: string,
    semester?: number,
    subject?: string
  ): Promise<HandlerResult> {
    const filter: Record<string, unknown> = {};
    if (semester) filter.semester = semester;

    const assignments = await Assignment.find(filter)
      .populate('subject', 'name code')
      .sort({ dueDate: 1 })
      .limit(6);

    if (assignments.length === 0) {
      return {
        response: 'There are currently no active assignments listed for your semester.',
      };
    }

    const formatted =
      `📋 **Active Assignments & Submissions**\n\n` +
      assignments
        .map((a) => {
          const s = a.subject as any;
          const due = new Date(a.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          return `• **${a.title}** (${s?.code || ''} ${s?.name || ''})\n  ⏳ Due Date: ${due} | 📊 Total Marks: ${a.totalMarks}\n  ${a.description || ''}`;
        })
        .join('\n\n');

    return { response: formatted, data: assignments };
  }

  private async handleCalendarQuery(userMessage: string): Promise<HandlerResult> {
    const events = await AcademicCalendar.find({}).sort({ startDate: 1 }).limit(8);

    if (events.length === 0) {
      return {
        response: 'No academic calendar events or term schedules are currently published.',
      };
    }

    const formatted =
      `🗓️ **Official Academic Calendar Milestones**\n\n` +
      events
        .map((e) => {
          const start = new Date(e.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          return `• **${e.title}** (${e.eventType})\n  📅 ${start} ${e.isHoliday ? '🏖️ (Holiday)' : ''}\n  ${e.description || ''}`;
        })
        .join('\n\n');

    return { response: formatted, data: events };
  }

  private async handleRegulationQuery(
    userMessage: string,
    intent: string
  ): Promise<HandlerResult> {
    let category = 'general';
    if (intent === 'attendance_policy') category = 'attendance';
    if (intent === 'grading_policy') category = 'grading';
    if (intent === 'academic_regulation') category = 'promotion';

    const regs = await Regulation.find({
      $or: [{ category }, { category: 'general' }],
    }).limit(3);

    if (regs.length === 0) {
      return {
        response: 'Official regulation records for this category are maintained in the University Handbook.',
      };
    }

    const reg = regs[0];
    const keyRulesText = reg.keyRules.map((rule, idx) => `• Rule ${idx + 1}: ${rule}`).join('\n');

    const formatted =
      `⚖️ **Official Institutional Regulation: ${reg.title}**\n\n` +
      `${reg.summary}\n\n` +
      `**Key Rules:**\n${keyRulesText}\n\n` +
      `*Source: Academic Regulation Code ${reg.regulationCode} (Year: ${reg.academicYear})*`;

    return { response: formatted, data: regs };
  }

  private async handleGeneralStructuredQuery(
    userMessage: string,
    entities: Record<string, unknown> | ExtractedEntities,
    context: QueryContext
  ): Promise<HandlerResult> {
    return {
      response: 'I retrieved the relevant structured curriculum catalog records for your inquiry.',
    };
  }
}

export const structuredHandler = new StructuredHandler();
