import { Request, Response } from 'express';
import { Department } from '../models/department.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getDepartments(req: Request, res: Response): Promise<void> {
  try {
    const { status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const departments = await Department.find(filter).sort({ name: 1 });
    sendSuccess(res, departments, 'Departments retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch departments';
    sendError(res, errMessage, 500);
  }
}

export async function getDepartmentById(req: Request, res: Response): Promise<void> {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      sendError(res, 'Department not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, department);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch department';
    sendError(res, errMessage, 500);
  }
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { name, code, description, status } = req.body;

    if (!name || !code) {
      sendError(res, 'Department name and code are required', 400, 'VALIDATION_ERROR');
      return;
    }

    const existingCode = await Department.findOne({ code: code.toUpperCase().trim() });
    if (existingCode) {
      sendError(res, 'A department with this code already exists', 409, 'DUPLICATE_CODE');
      return;
    }

    const department = new Department({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || '',
      status: status || 'active',
    });

    await department.save();
    sendSuccess(res, department, 'Department created successfully', 201);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create department';
    sendError(res, errMessage, 500);
  }
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { name, code, description, status } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      sendError(res, 'Department not found', 404, 'NOT_FOUND');
      return;
    }

    if (code && code.toUpperCase().trim() !== department.code) {
      const existing = await Department.findOne({
        code: code.toUpperCase().trim(),
        _id: { $ne: department._id },
      });
      if (existing) {
        sendError(res, 'A department with this code already exists', 409, 'DUPLICATE_CODE');
        return;
      }
      department.code = code.toUpperCase().trim();
    }

    if (name) department.name = name.trim();
    if (description !== undefined) department.description = description.trim();
    if (status) department.status = status;

    await department.save();
    sendSuccess(res, department, 'Department updated successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update department';
    sendError(res, errMessage, 500);
  }
}

export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      sendError(res, 'Department not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { id: req.params.id }, 'Department deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete department';
    sendError(res, errMessage, 500);
  }
}
