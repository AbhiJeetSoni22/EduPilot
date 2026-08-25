import { getDatabaseStatus } from '../config/db';
import { config } from '../config/env';
import { HealthStatusResponse } from '../types';

export class HealthService {
  public static getHealthStatus(): HealthStatusResponse {
    const dbStatus = getDatabaseStatus();
    const isDegraded = dbStatus.status !== 'connected';

    return {
      status: isDegraded ? 'degraded' : 'ok',
      service: 'Exam & Academic Assistant API',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: config.nodeEnv,
      database: dbStatus,
    };
  }
}
