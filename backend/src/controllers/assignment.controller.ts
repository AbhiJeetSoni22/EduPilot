import { Request, Response } from 'express';
import { Assignment } from '../models/assignment.model';
import { Subject } from '../models/subject.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getAssignments(req: Request, res: Response): Promise<void> {
  try {
    const { department, program, semester, academicYear, status, subject, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (department) filter.department = department;
    if (program) filter.program = program;
    if (semester) filter.semester = Number(semester);
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.status = status;
    if (subject) filter.subject = subject;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subjectCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const assignments = await Assignment.find(filter)
      .populate('subject', 'name code')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType')
      .sort({ dueDate: 1 });

    sendSuccess(res, assignments, 'Assignments retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch assignments';
    sendError(res, errMessage, 500);
  }
}

export async function getAssignmentById(req: Request, res: Response): Promise<void> {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('subject', 'name code credits type syllabusUnits evaluationScheme')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    if (!assignment) {
      sendError(res, 'Assignment not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, assignment);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch assignment';
    sendError(res, errMessage, 500);
  }
}

export async function createAssignment(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      subject,
      subjectCode,
      department,
      program,
      semester,
      academicYear,
      description,
      dueDate,
      totalMarks,
      weightage,
      submissionFormat,
      instructions,
      status,
    } = req.body;

    if (!title || !subject || !department || !program || !semester || !dueDate || !description) {
      sendError(res, 'Missing required fields for assignment creation', 400, 'VALIDATION_ERROR');
      return;
    }

    let code = subjectCode;
    if (!code) {
      const subDoc = await Subject.findById(subject);
      code = subDoc ? subDoc.code : 'UNKNOWN';
    }

    const assignment = new Assignment({
      title: title.trim(),
      subject,
      subjectCode: code.toUpperCase().trim(),
      department,
      program,
      semester: Number(semester),
      academicYear: academicYear || '2025-26',
      description: description.trim(),
      dueDate: new Date(dueDate),
      totalMarks: totalMarks ? Number(totalMarks) : 20,
      weightage: weightage ? Number(weightage) : 10,
      submissionFormat: submissionFormat || 'PDF',
      instructions: instructions || [],
      status: status || 'active',
    });

    await assignment.save();
    const populated = await Assignment.findById(assignment._id)
      .populate('subject', 'name code')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    sendSuccess(res, populated, 'Assignment created successfully', 201);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create assignment';
    sendError(res, errMessage, 500);
  }
}

export async function updateAssignment(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      subject,
      subjectCode,
      department,
      program,
      semester,
      academicYear,
      description,
      dueDate,
      totalMarks,
      weightage,
      submissionFormat,
      instructions,
      status,
    } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      sendError(res, 'Assignment not found', 404, 'NOT_FOUND');
      return;
    }

    if (title) assignment.title = title.trim();
    if (subject) assignment.subject = subject;
    if (subjectCode) assignment.subjectCode = subjectCode.toUpperCase().trim();
    if (department) assignment.department = department;
    if (program) assignment.program = program;
    if (semester !== undefined) assignment.semester = Number(semester);
    if (academicYear) assignment.academicYear = academicYear;
    if (description) assignment.description = description.trim();
    if (dueDate) assignment.dueDate = new Date(dueDate);
    if (totalMarks !== undefined) assignment.totalMarks = Number(totalMarks);
    if (weightage !== undefined) assignment.weightage = Number(weightage);
    if (submissionFormat) assignment.submissionFormat = submissionFormat;
    if (instructions) assignment.instructions = instructions;
    if (status) assignment.status = status;

    await assignment.save();
    const populated = await Assignment.findById(assignment._id)
      .populate('subject', 'name code')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    sendSuccess(res, populated, 'Assignment updated successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update assignment';
    sendError(res, errMessage, 500);
  }
}

export async function deleteAssignment(req: Request, res: Response): Promise<void> {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      sendError(res, 'Assignment not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { id: req.params.id }, 'Assignment deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete assignment';
    sendError(res, errMessage, 500);
  }
}
