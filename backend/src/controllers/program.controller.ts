import { Request, Response } from 'express';
import { Program } from '../models/program.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getPrograms(req: Request, res: Response): Promise<void> {
  try {
    const { department, degreeType, academicYear, status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (department) filter.department = department;
    if (degreeType) filter.degreeType = degreeType;
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const programs = await Program.find(filter)
      .populate('department', 'name code')
      .sort({ name: 1 });

    sendSuccess(res, programs, 'Programs retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch programs';
    sendError(res, errMessage, 500);
  }
}

export async function getProgramById(req: Request, res: Response): Promise<void> {
  try {
    const program = await Program.findById(req.params.id).populate('department', 'name code');
    if (!program) {
      sendError(res, 'Program not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, program);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch program';
    sendError(res, errMessage, 500);
  }
}

export async function createProgram(req: Request, res: Response): Promise<void> {
  try {
    const { name, code, department, degreeType, durationYears, totalSemesters, academicYear, status } =
      req.body;

    if (!name || !code || !department) {
      sendError(res, 'Name, code, and department are required', 400, 'VALIDATION_ERROR');
      return;
    }

    const existingCode = await Program.findOne({ code: code.toUpperCase().trim() });
    if (existingCode) {
      sendError(res, 'A program with this code already exists', 409, 'DUPLICATE_CODE');
      return;
    }

    const program = new Program({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      department,
      degreeType: degreeType || 'Undergraduate',
      durationYears: durationYears ? Number(durationYears) : 4,
      totalSemesters: totalSemesters ? Number(totalSemesters) : 8,
      academicYear: academicYear || '2025-26',
      status: status || 'active',
    });

    await program.save();
    const populated = await Program.findById(program._id).populate('department', 'name code');
    sendSuccess(res, populated, 'Program created successfully', 201);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create program';
    sendError(res, errMessage, 500);
  }
}

export async function updateProgram(req: Request, res: Response): Promise<void> {
  try {
    const { name, code, department, degreeType, durationYears, totalSemesters, academicYear, status } =
      req.body;

    const program = await Program.findById(req.params.id);
    if (!program) {
      sendError(res, 'Program not found', 404, 'NOT_FOUND');
      return;
    }

    if (code && code.toUpperCase().trim() !== program.code) {
      const existing = await Program.findOne({
        code: code.toUpperCase().trim(),
        _id: { $ne: program._id },
      });
      if (existing) {
        sendError(res, 'A program with this code already exists', 409, 'DUPLICATE_CODE');
        return;
      }
      program.code = code.toUpperCase().trim();
    }

    if (name) program.name = name.trim();
    if (department) program.department = department;
    if (degreeType) program.degreeType = degreeType;
    if (durationYears !== undefined) program.durationYears = Number(durationYears);
    if (totalSemesters !== undefined) program.totalSemesters = Number(totalSemesters);
    if (academicYear) program.academicYear = academicYear;
    if (status) program.status = status;

    await program.save();
    const populated = await Program.findById(program._id).populate('department', 'name code');
    sendSuccess(res, populated, 'Program updated successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update program';
    sendError(res, errMessage, 500);
  }
}

export async function deleteProgram(req: Request, res: Response): Promise<void> {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);
    if (!program) {
      sendError(res, 'Program not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { id: req.params.id }, 'Program deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete program';
    sendError(res, errMessage, 500);
  }
}
