import { Request, Response } from 'express';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Department } from '../models/department.model';
import { Program } from '../models/program.model';
import { Subject } from '../models/subject.model';
import { Exam } from '../models/exam.model';
import { Assignment } from '../models/assignment.model';
import { AcademicCalendar } from '../models/academic-calendar.model';
import { Regulation } from '../models/regulation.model';
import { sendSuccess, sendError } from '../utils/response';

export type EntityType =
  | 'departments'
  | 'programs'
  | 'subjects'
  | 'exams'
  | 'assignments'
  | 'academic-calendar'
  | 'regulations';

interface InvalidRecord {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
}

export async function validateImport(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    const { entityType } = req.body;
    let rawRecords: Record<string, unknown>[] = [];

    if (!entityType) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      sendError(res, 'entityType is required (departments, programs, subjects, exams, assignments, academic-calendar, regulations)', 400, 'VALIDATION_ERROR');
      return;
    }

    if (file) {
      const fileContent = fs.readFileSync(file.path, 'utf8');
      if (file.originalname.endsWith('.json') || file.mimetype === 'application/json') {
        try {
          const parsed = JSON.parse(fileContent);
          rawRecords = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          sendError(res, 'Invalid JSON format in uploaded file', 400, 'PARSE_ERROR');
          return;
        }
      } else {
        // CSV parse
        try {
          rawRecords = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });
        } catch {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          sendError(res, 'Failed to parse CSV file. Ensure valid headers and formatting.', 400, 'CSV_PARSE_ERROR');
          return;
        }
      }
      // Remove temp file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } else if (req.body.records) {
      rawRecords = Array.isArray(req.body.records)
        ? req.body.records
        : JSON.parse(req.body.records);
    } else {
      sendError(res, 'File or records payload is required', 400, 'DATA_REQUIRED');
      return;
    }

    if (rawRecords.length === 0) {
      sendError(res, 'No records found in import data', 400, 'EMPTY_DATA');
      return;
    }

    // Cache existing lookup data for reference validation
    const [departments, programs, subjects] = await Promise.all([
      Department.find(),
      Program.find(),
      Subject.find(),
    ]);

    const deptByCode = new Map(departments.map((d) => [d.code.toUpperCase(), d]));
    const deptById = new Map(departments.map((d) => [d._id.toString(), d]));
    const progByCode = new Map(programs.map((p) => [p.code.toUpperCase(), p]));
    const progById = new Map(programs.map((p) => [p._id.toString(), p]));
    const subjByCode = new Map(subjects.map((s) => [s.code.toUpperCase(), s]));
    const subjById = new Map(subjects.map((s) => [s._id.toString(), s]));

    const validRecords: Record<string, unknown>[] = [];
    const invalidRecords: InvalidRecord[] = [];

    rawRecords.forEach((record, index) => {
      const rowNum = index + 1;
      const errors: string[] = [];
      const transformed: Record<string, unknown> = { ...record };

      switch (entityType as EntityType) {
        case 'departments': {
          if (!record.name) errors.push('Missing department name');
          if (!record.code) errors.push('Missing department code');
          if (errors.length === 0) {
            transformed.name = String(record.name).trim();
            transformed.code = String(record.code).toUpperCase().trim();
            transformed.description = record.description ? String(record.description).trim() : '';
            transformed.status = record.status || 'active';
          }
          break;
        }

        case 'programs': {
          if (!record.name) errors.push('Missing program name');
          if (!record.code) errors.push('Missing program code');
          const deptRef = record.department || record.departmentCode;
          if (!deptRef) {
            errors.push('Missing department reference');
          } else {
            const dept = deptById.get(String(deptRef)) || deptByCode.get(String(deptRef).toUpperCase());
            if (!dept) {
              errors.push(`Department '${deptRef}' not found`);
            } else {
              transformed.department = dept._id;
            }
          }
          if (errors.length === 0) {
            transformed.name = String(record.name).trim();
            transformed.code = String(record.code).toUpperCase().trim();
            transformed.degreeType = record.degreeType || 'Undergraduate';
            transformed.durationYears = record.durationYears ? Number(record.durationYears) : 4;
            transformed.totalSemesters = record.totalSemesters ? Number(record.totalSemesters) : 8;
            transformed.academicYear = record.academicYear || '2025-26';
            transformed.status = record.status || 'active';
          }
          break;
        }

        case 'subjects': {
          if (!record.name) errors.push('Missing subject name');
          if (!record.code) errors.push('Missing subject code');
          if (record.semester === undefined) errors.push('Missing semester');
          if (record.credits === undefined) errors.push('Missing credits');

          const deptRef = record.department || record.departmentCode;
          if (!deptRef) {
            errors.push('Missing department reference');
          } else {
            const dept = deptById.get(String(deptRef)) || deptByCode.get(String(deptRef).toUpperCase());
            if (!dept) errors.push(`Department '${deptRef}' not found`);
            else transformed.department = dept._id;
          }

          const progRef = record.program || record.programCode;
          if (!progRef) {
            errors.push('Missing program reference');
          } else {
            const prog = progById.get(String(progRef)) || progByCode.get(String(progRef).toUpperCase());
            if (!prog) errors.push(`Program '${progRef}' not found`);
            else transformed.program = prog._id;
          }

          if (errors.length === 0) {
            transformed.name = String(record.name).trim();
            transformed.code = String(record.code).toUpperCase().trim();
            transformed.semester = Number(record.semester);
            transformed.credits = Number(record.credits);
            transformed.type = record.type || 'Theory';
            transformed.academicYear = record.academicYear || '2025-26';
            transformed.description = record.description ? String(record.description).trim() : '';
            transformed.status = record.status || 'active';
          }
          break;
        }

        case 'exams': {
          if (!record.title) errors.push('Missing exam title');
          if (!record.examType) errors.push('Missing exam type');
          if (!record.examDate) errors.push('Missing exam date');
          if (!record.startTime) errors.push('Missing start time');
          if (!record.endTime) errors.push('Missing end time');
          if (!record.venue) errors.push('Missing venue');

          const subjRef = record.subject || record.subjectCode;
          if (!subjRef) {
            errors.push('Missing subject reference');
          } else {
            const subj = subjById.get(String(subjRef)) || subjByCode.get(String(subjRef).toUpperCase());
            if (!subj) errors.push(`Subject '${subjRef}' not found`);
            else {
              transformed.subject = subj._id;
              transformed.subjectCode = subj.code;
              transformed.department = subj.department;
              transformed.program = subj.program;
              transformed.semester = subj.semester;
            }
          }

          if (errors.length === 0) {
            transformed.title = String(record.title).trim();
            transformed.examType = record.examType;
            transformed.examDate = new Date(String(record.examDate));
            transformed.startTime = String(record.startTime).trim();
            transformed.endTime = String(record.endTime).trim();
            transformed.venue = String(record.venue).trim();
            transformed.maxMarks = record.maxMarks ? Number(record.maxMarks) : 100;
            transformed.academicYear = record.academicYear || '2025-26';
            transformed.status = record.status || 'scheduled';
          }
          break;
        }

        case 'assignments': {
          if (!record.title) errors.push('Missing assignment title');
          if (!record.dueDate) errors.push('Missing due date');
          if (!record.description) errors.push('Missing description');

          const subjRef = record.subject || record.subjectCode;
          if (!subjRef) {
            errors.push('Missing subject reference');
          } else {
            const subj = subjById.get(String(subjRef)) || subjByCode.get(String(subjRef).toUpperCase());
            if (!subj) errors.push(`Subject '${subjRef}' not found`);
            else {
              transformed.subject = subj._id;
              transformed.subjectCode = subj.code;
              transformed.department = subj.department;
              transformed.program = subj.program;
              transformed.semester = subj.semester;
            }
          }

          if (errors.length === 0) {
            transformed.title = String(record.title).trim();
            transformed.description = String(record.description).trim();
            transformed.dueDate = new Date(String(record.dueDate));
            transformed.totalMarks = record.totalMarks ? Number(record.totalMarks) : 20;
            transformed.weightage = record.weightage ? Number(record.weightage) : 10;
            transformed.submissionFormat = record.submissionFormat || 'PDF';
            transformed.academicYear = record.academicYear || '2025-26';
            transformed.status = record.status || 'active';
          }
          break;
        }

        case 'academic-calendar': {
          if (!record.title) errors.push('Missing calendar event title');
          if (!record.eventType) errors.push('Missing event type');
          if (!record.startDate) errors.push('Missing start date');
          if (!record.endDate) errors.push('Missing end date');

          if (errors.length === 0) {
            transformed.title = String(record.title).trim();
            transformed.eventType = record.eventType;
            transformed.startDate = new Date(String(record.startDate));
            transformed.endDate = new Date(String(record.endDate));
            transformed.academicYear = record.academicYear || '2025-26';
            transformed.semester = record.semester || 'All';
            transformed.description = record.description ? String(record.description).trim() : '';
            transformed.isHoliday = record.isHoliday === true || record.isHoliday === 'true';
            transformed.targetAudience = record.targetAudience || 'All';
          }
          break;
        }

        case 'regulations': {
          if (!record.regulationCode) errors.push('Missing regulation code');
          if (!record.title) errors.push('Missing regulation title');
          if (!record.category) errors.push('Missing category');
          if (!record.summary) errors.push('Missing summary');
          if (!record.content) errors.push('Missing content');

          if (errors.length === 0) {
            transformed.regulationCode = String(record.regulationCode).toUpperCase().trim();
            transformed.title = String(record.title).trim();
            transformed.category = record.category;
            transformed.summary = String(record.summary).trim();
            transformed.content = String(record.content).trim();
            transformed.academicYear = record.academicYear || '2025-26';
            transformed.version = record.version || '1.0';
            transformed.status = record.status || 'active';
          }
          break;
        }

        default:
          errors.push(`Unsupported entityType: ${entityType}`);
      }

      if (errors.length > 0) {
        invalidRecords.push({ row: rowNum, data: record, errors });
      } else {
        validRecords.push(transformed);
      }
    });

    sendSuccess(
      res,
      {
        entityType,
        totalCount: rawRecords.length,
        validCount: validRecords.length,
        invalidCount: invalidRecords.length,
        validRecords,
        invalidRecords,
      },
      `Validation complete. ${validRecords.length} valid, ${invalidRecords.length} invalid.`
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Bulk import validation failed';
    sendError(res, errMessage, 500);
  }
}

export async function confirmImport(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, records } = req.body;

    if (!entityType || !records || !Array.isArray(records) || records.length === 0) {
      sendError(res, 'entityType and non-empty records array are required', 400, 'VALIDATION_ERROR');
      return;
    }

    let insertedCount = 0;
    const insertedIds: string[] = [];

    switch (entityType as EntityType) {
      case 'departments': {
        for (const rec of records) {
          const doc = await Department.findOneAndUpdate(
            { code: rec.code },
            { $set: rec },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          insertedCount++;
          insertedIds.push(doc._id.toString());
        }
        break;
      }

      case 'programs': {
        for (const rec of records) {
          const doc = await Program.findOneAndUpdate(
            { code: rec.code },
            { $set: rec },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          insertedCount++;
          insertedIds.push(doc._id.toString());
        }
        break;
      }

      case 'subjects': {
        for (const rec of records) {
          const doc = await Subject.findOneAndUpdate(
            { code: rec.code, program: rec.program, academicYear: rec.academicYear },
            { $set: rec },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          insertedCount++;
          insertedIds.push(doc._id.toString());
        }
        break;
      }

      case 'exams': {
        const docs = await Exam.insertMany(records);
        insertedCount = docs.length;
        insertedIds.push(...docs.map((d) => d._id.toString()));
        break;
      }

      case 'assignments': {
        const docs = await Assignment.insertMany(records);
        insertedCount = docs.length;
        insertedIds.push(...docs.map((d) => d._id.toString()));
        break;
      }

      case 'academic-calendar': {
        const docs = await AcademicCalendar.insertMany(records);
        insertedCount = docs.length;
        insertedIds.push(...docs.map((d) => d._id.toString()));
        break;
      }

      case 'regulations': {
        for (const rec of records) {
          const doc = await Regulation.findOneAndUpdate(
            { regulationCode: rec.regulationCode },
            { $set: rec },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          insertedCount++;
          insertedIds.push(doc._id.toString());
        }
        break;
      }

      default:
        sendError(res, `Unsupported entityType: ${entityType}`, 400);
        return;
    }

    sendSuccess(
      res,
      {
        entityType,
        insertedCount,
        insertedIds,
      },
      `Successfully imported ${insertedCount} ${entityType} records into MongoDB.`
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Bulk import execution failed';
    sendError(res, errMessage, 500);
  }
}
