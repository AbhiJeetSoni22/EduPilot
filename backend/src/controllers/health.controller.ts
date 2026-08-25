import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service';

export function getHealth(req: Request, res: Response, next: NextFunction): void {
  try {
    const health = HealthService.getHealthStatus();
    res.status(200).json(health);
  } catch (error) {
    next(error);
  }
}
