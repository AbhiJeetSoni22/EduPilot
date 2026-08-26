import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { role, department, isActive, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType')
      .sort({ createdAt: -1 });

    sendSuccess(res, users, 'Users retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch users';
    sendError(res, errMessage, 500);
  }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, user);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch user';
    sendError(res, errMessage, 500);
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, role, department, program, semester, academicYear, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }

    if (name) user.name = name.trim();
    if (role) user.role = role;
    if (department !== undefined) user.department = department || null;
    if (program !== undefined) user.program = program || null;
    if (semester !== undefined) user.semester = semester ? Number(semester) : undefined;
    if (academicYear) user.academicYear = academicYear;
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    await user.save();

    const populated = await User.findById(user._id)
      .select('-password')
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    sendSuccess(res, populated, 'User updated successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update user';
    sendError(res, errMessage, 500);
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { id: req.params.id }, 'User deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete user';
    sendError(res, errMessage, 500);
  }
}
