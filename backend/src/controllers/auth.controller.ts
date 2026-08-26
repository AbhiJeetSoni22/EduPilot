import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { generateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role, department, program, semester, academicYear } = req.body;

    if (!name || !email || !password) {
      sendError(res, 'Name, email, and password are required', 400, 'VALIDATION_ERROR');
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      sendError(res, 'An account with this email already exists', 409, 'EMAIL_EXISTS');
      return;
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role === 'admin' ? 'admin' : 'student',
      department: department || null,
      program: program || null,
      semester: semester ? Number(semester) : null,
      academicYear: academicYear || '2025-26',
    });

    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    sendSuccess(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          program: user.program,
          semester: user.semester,
          academicYear: user.academicYear,
        },
        token,
      },
      'User registered successfully',
      201
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Registration failed';
    sendError(res, errMessage, 500, 'REGISTRATION_ERROR');
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      return;
    }

    if (!user.isActive) {
      sendError(res, 'This account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
      return;
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    sendSuccess(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          program: user.program,
          semester: user.semester,
          academicYear: user.academicYear,
        },
        token,
      },
      'Login successful'
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Login failed';
    sendError(res, errMessage, 500, 'LOGIN_ERROR');
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const user = await User.findById(req.user.id)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType');

    if (!user) {
      sendError(res, 'User not found', 404, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      program: user.program,
      semester: user.semester,
      academicYear: user.academicYear,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch current user';
    sendError(res, errMessage, 500, 'SERVER_ERROR');
  }
}
