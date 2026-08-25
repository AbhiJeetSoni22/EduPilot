import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { ApiErrorResponse } from '../types';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
}

export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error(`[${req.method} ${req.url}] - ${message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
    },
  });
}
