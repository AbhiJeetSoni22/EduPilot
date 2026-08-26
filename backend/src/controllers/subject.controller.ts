import { Request, Response } from 'express';
import { Subject } from '../models/subject.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getSubjects(req: Request, res: Response): Promise<void> {
  try {
    const { department, program, semester, academicYear, type, status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (department) filter.department = department;
    if (program) filter.program = program;
    if (semester) filter.semester = Number(semester);
    if (academicYear) filter.academicYear = academicYear;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const subjects = await Subject.find(filter)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType')
      .sort({ semester: 1, code: 1 });

    sendSuccess(res, subjects, 'Subjects retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch subjects';
    sendError(res, errMessage, 500);
  }
}

export async function getSubjectById(req: Request, res: Response): Promise<void> {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    if (!subject) {
      sendError(res, 'Subject not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, subject);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch subject';
    sendError(res, errMessage, 500);
  }
}

export async function createSubject(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      code,
      department,
      program,
      semester,
      credits,
      type,
      academicYear,
      description,
      syllabusUnits,
      evaluationScheme,
      status,
    } = req.body;

    if (!name || !code || !department || !program || !semester || credits === undefined) {
      sendError(
        res,
        'Name, code, department, program, semester, and credits are required',
        400,
        'VALIDATION_ERROR'
      );
      return;
    }

    const existing = await Subject.findOne({
      code: code.toUpperCase().trim(),
      academicYear: academicYear || '2025-26',
      program,
    });

    if (existing) {
      sendError(
        res,
        `Subject with code ${code.toUpperCase().trim()} already exists for this program and academic year`,
        409,
        'DUPLICATE_SUBJECT'
      );
      return;
    }

    const subject = new Subject({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      department,
      program,
      semester: Number(semester),
      credits: Number(credits),
      type: type || 'Theory',
      academicYear: academicYear || '2025-26',
      description: description?.trim() || '',
      syllabusUnits: syllabusUnits || [],
      evaluationScheme: evaluationScheme || {
        internalMarks: 40,
        externalMarks: 60,
        totalMarks: 100,
        passingMarks: 40,
      },
      status: status || 'active',
    });

    await subject.save();
    const populated = await Subject.findById(subject._id)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    sendSuccess(res, populated, 'Subject created successfully', 201);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create subject';
    sendError(res, errMessage, 500);
  }
}

export async function updateSubject(req: Request, res: Response): Promise<void> {
  try {
    const {
      name,
      code,
      department,
      program,
      semester,
      credits,
      type,
      academicYear,
      description,
      syllabusUnits,
      evaluationScheme,
      status,
    } = req.body;

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      sendError(res, 'Subject not found', 404, 'NOT_FOUND');
      return;
    }

    if (name) subject.name = name.trim();
    if (code) subject.code = code.toUpperCase().trim();
    if (department) subject.department = department;
    if (program) subject.program = program;
    if (semester !== undefined) subject.semester = Number(semester);
    if (credits !== undefined) subject.credits = Number(credits);
    if (type) subject.type = type;
    if (academicYear) subject.academicYear = academicYear;
    if (description !== undefined) subject.description = description.trim();
    if (syllabusUnits) subject.syllabusUnits = syllabusUnits;
    if (evaluationScheme) subject.evaluationScheme = evaluationScheme;
    if (status) subject.status = status;

    await subject.save();
    const populated = await Subject.findById(subject._id)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    sendSuccess(res, populated, 'Subject updated successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update subject';
    sendError(res, errMessage, 500);
  }
}

export async function deleteSubject(req: Request, res: Response): Promise<void> {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      sendError(res, 'Subject not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { id: req.params.id }, 'Subject deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete subject';
    sendError(res, errMessage, 500);
  }
}
