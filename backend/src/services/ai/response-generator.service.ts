import { QueryAnalysis } from '../../types/query-analysis.types';
import { RetrievedAcademicData } from '../academic/academic.services';
import { geminiService } from './gemini.service';

export class ResponseGeneratorService {
  /**
   * Generates a strictly grounded natural-language response based on verified academic data.
   */
  public async generateGroundedResponse(
    userMessage: string,
    analysis: QueryAnalysis,
    retrievedData: RetrievedAcademicData
  ): Promise<string> {
    // 1. If no matching records exist, guarantee zero hallucination
    if (!retrievedData.found || retrievedData.records.length === 0) {
      return this.formatEmptyResponse(userMessage, analysis, retrievedData);
    }

    // 2. If Gemini is available, synthesize a grounded natural-language answer
    if (geminiService.isConfigured()) {
      try {
        const systemTone =
          'You are the official EduPilot Academic Assistant. Answer clearly, concisely, and authoritatively based STRICTLY on the provided verified institutional data. NEVER invent or assume any unverified dates, venues, credits, or policies. If an item is not explicitly in the data, do not state it.';

        const prompt = `VERIFIED INSTITUTIONAL DATA:\n${retrievedData.summaryText}\n\nSTUDENT QUESTION:\n${userMessage}\n\nProvide a helpful, well-structured, bulleted answer using ONLY the verified facts above.`;

        const aiResponse = await geminiService.generateContent(prompt, {
          systemInstruction: systemTone,
          responseMimeType: 'text/plain',
          temperature: 0.1,
          maxOutputTokens: 1024,
        });

        if (aiResponse && aiResponse.trim()) {
          return aiResponse.trim();
        }
      } catch (err) {
        console.warn('[ResponseGenerator] Gemini generation failed, using deterministic format:', err);
      }
    }

    // 3. Deterministic Grounded Markdown Formatter
    return this.formatDeterministicResponse(analysis, retrievedData);
  }

  /**
   * Deterministic formatter when Gemini is offline or for guaranteed structured output.
   */
  private formatDeterministicResponse(
    analysis: QueryAnalysis,
    retrievedData: RetrievedAcademicData
  ): string {
    const { category, records } = retrievedData;

    if (category === 'subject') {
      return (
        `📚 **Curriculum Information**\n\n` +
        records
          .map((r: any) => {
            return (
              `• **${r.code}: ${r.name}**\n` +
              `  📊 Credits: **${r.credits}** | Type: ${r.type} | Semester: Sem ${r.semester}\n` +
              `  ⚖️ Evaluation: Internal ${r.evaluationScheme?.internalMarks || 40} + External ${r.evaluationScheme?.externalMarks || 60} = ${r.evaluationScheme?.totalMarks || 100} Marks\n` +
              `  📝 *${r.description || 'Core departmental curriculum module.'}*`
            );
          })
          .join('\n\n')
      );
    }

    if (category === 'exam') {
      return (
        `📝 **Scheduled Examination Timetable**\n\n` +
        records
          .map((r: any) => {
            const s = r.subject;
            const examDate = new Date(r.examDate).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            return (
              `• **${s?.code || r.subjectCode || 'EXAM'}: ${s?.name || r.title}**\n` +
              `  📅 Date: **${examDate}**\n` +
              `  ⏰ Time: ${r.startTime} – ${r.endTime}\n` +
              `  📍 Venue: ${r.venue} | Type: ${r.examType}`
            );
          })
          .join('\n\n')
      );
    }

    if (category === 'assignment') {
      return (
        `📋 **Active Assignments**\n\n` +
        records
          .map((r: any) => {
            const s = r.subject;
            const due = new Date(r.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            return (
              `• **${r.title}** (${s?.code || ''} ${s?.name || ''})\n` +
              `  ⏳ Due Date: **${due}** | 📊 Total Marks: ${r.totalMarks}\n` +
              `  📄 Format: ${r.submissionFormat}\n` +
              `  ${r.description || ''}`
            );
          })
          .join('\n\n')
      );
    }

    if (category === 'calendar') {
      return (
        `🗓️ **Academic Calendar Milestones**\n\n` +
        records
          .map((r: any) => {
            const start = new Date(r.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            return `• **${r.title}** (${r.eventType})\n  📅 Date: ${start}${r.isHoliday ? ' 🏖️ (Holiday)' : ''}`;
          })
          .join('\n\n')
      );
    }

    if (category === 'regulation') {
      const reg = records[0] as any;
      return (
        `⚖️ **Official Institutional Policy: ${reg.title}**\n\n` +
        `${reg.summary}\n\n` +
        `**Key Rules:**\n` +
        reg.keyRules.map((k: string, i: number) => `• Rule ${i + 1}: ${k}`).join('\n') +
        `\n\n*Source: Regulation Code ${reg.regulationCode} (${reg.academicYear})*`
      );
    }

    return retrievedData.summaryText;
  }

  /**
   * Anti-hallucination empty response generator.
   */
  private formatEmptyResponse(
    userMessage: string,
    analysis: QueryAnalysis,
    retrievedData: RetrievedAcademicData
  ): string {
    const { entities, intent } = analysis;
    const term = entities.subject || entities.subjectCode || (entities.semester ? `Semester ${entities.semester}` : '');

    if (intent === 'exam_schedule') {
      return `I checked the examination database, but could not find any scheduled exams matching **${term || 'your inquiry'}**. Please verify if the exam cell has published the timetable for this term.`;
    }

    if (intent === 'subject_credits' || intent === 'syllabus_breakdown') {
      return `I searched the academic curriculum catalog, but found no subject matching **${term || userMessage}**. Please verify the course code (e.g. CS501) or title.`;
    }

    if (intent === 'assignment_deadlines') {
      return `There are currently no active assignments or submissions listed for **${term || 'your current courses'}**.`;
    }

    return retrievedData.summaryText || `No official institutional records were found matching "${userMessage}".`;
  }
}

export const responseGeneratorService = new ResponseGeneratorService();
