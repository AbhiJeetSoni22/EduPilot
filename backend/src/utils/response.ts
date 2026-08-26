import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200,
  pagination?: ApiResponse<T>['pagination']
): Response {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(pagination && { pagination }),
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message = 'An unexpected error occurred',
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: unknown
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  return res.status(statusCode).json(response);
}
