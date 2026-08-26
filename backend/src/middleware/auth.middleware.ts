import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { sendError } from '../utils/response';
import { User, IUser } from '../models/user.model';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'student' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'student' | 'admin';
    name?: string;
  };
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
  });
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication token is required', 401, 'UNAUTHORIZED');
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Invalid token format', 401, 'UNAUTHORIZED');
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch (err: unknown) {
      if (err instanceof jwt.TokenExpiredError) {
        sendError(res, 'Session token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
        return;
      }
      sendError(res, 'Invalid or malformed authentication token', 401, 'INVALID_TOKEN');
      return;
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      sendError(res, 'User account not found or inactive', 401, 'ACCOUNT_INACTIVE');
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    sendError(res, 'Authentication failure', 500, 'AUTH_ERROR');
  }
}

export function requireRole(...allowedRoles: Array<'student' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
      return;
    }

    next();
  };
}
