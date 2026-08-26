import { Request, Response } from 'express';
import { Exam } from '../models/exam.model';
import { Subject } from '../models/subject.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getExams(req: Request, res: Response): Promise<void> {
  try {
    const { department, program, semester, academicYear, examType, status, subject, search } =
      req.query;
    const filter: Record<string, unknown> = {};

    if (department) filter.department = department;
    if (program) filter.program = program;
    if (semester) filter.semester = Number(semester);
    if (academicYear) filter.academicYear = academicYear;
    if (examType) filter.examType = examType;
    if (status) filter.status = status;
    if (subject) filter.subject = subject;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subjectCode: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
      ];
    }

    const exams = await Exam.find(filter)
      .populate('subject', 'name code credits type')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType')
      .sort({ examDate: 1, startTime: 1 });

    sendSuccess(res, exams, 'Exams retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch exams';
    sendError(res, errMessage, 500);
  }
}

export async function getExamById(req: Request, res: Response): Promise<void> {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subject', 'name code credits type syllabusUnits evaluationScheme')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    if (!exam) {
      sendError(res, 'Exam not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, exam);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch exam';
    sendError(res, errMessage, 500);
  }
}

export async function createExam(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      subject,
      subjectCode,
      department,
      program,
      semester,
      academicYear,
      examType,
      examDate,
      startTime,
      endTime,
      venue,
      maxMarks,
      instructions,
      status,
    } = req.body;

    if (
      !title ||
      !subject ||
      !department ||
      !program ||
      !semester ||
      !examType ||
      !examDate ||
      !startTime ||
      !endTime ||
      !venue
    ) {
      sendError(res, 'Missing required fields for exam creation', 400, 'VALIDATION_ERROR');
      return;
    }

    // Auto-fetch subject code if missing
    let code = subjectCode;
    if (!code) {
      const subDoc = await Subject.findById(subject);
      code = subDoc ? subDoc.code : 'UNKNOWN';
    }

    const exam = new Exam({
      title: title.trim(),
      subject,
      subjectCode: code.toUpperCase().trim(),
      department,
      program,
      semester: Number(semester),
      academicYear: academicYear || '2025-26',
      examType,
      examDate: new Date(examDate),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      venue: venue.trim(),
      maxMarks: maxMarks ? Number(maxMarks) : 100,
      instructions: instructions || [],
      status: status || 'scheduled',
    });

    await exam.save();
    const populated = await Exam.findById(exam._id)
      .populate('subject', 'name code credits type')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    sendSuccess(res, populated, 'Exam scheduled successfully', 201);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create exam';
    sendError(res, errMessage, 500);
  }
}

export async function updateExam(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      subject,
      subjectCode,
      department,
      program,
      semester,
      academicYear,
      examType,
      examDate,
      startTime,
      endTime,
      venue,
      maxMarks,
      instructions,
      status,
    } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      sendError(res, 'Exam not found', 404, 'NOT_FOUND');
      return;
    }

    if (title) exam.title = title.trim();
    if (subject) exam.subject = subject;
    if (subjectCode) exam.subjectCode = subjectCode.toUpperCase().trim();
    if (department) exam.department = department;
    if (program) exam.program = program;
    if (semester !== undefined) exam.semester = Number(semester);
    if (academicYear) exam.academicYear = academicYear;
    if (examType) exam.examType = examType;
    if (examDate) exam.examDate = new Date(examDate);
    if (startTime) exam.startTime = startTime.trim();
    if (endTime) exam.endTime = endTime.trim();
    if (venue) exam.venue = venue.trim();
    if (maxMarks !== undefined) exam.maxMarks = Number(maxMarks);
    if (instructions) exam.instructions = instructions;
    if (status) exam.status = status;

    await exam.save();
    const populated = await Exam.findById(exam._id)
      .populate('subject', 'name code credits type')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    sendSuccess(res, populated, 'Exam updated successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update exam';
    sendError(res, errMessage, 500);
  }
}

export async function deleteExam(req: Request, res: Response): Promise<void> {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
      sendError(res, 'Exam not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { id: req.params.id }, 'Exam deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete exam';
    sendError(res, errMessage, 500);
  }
}
