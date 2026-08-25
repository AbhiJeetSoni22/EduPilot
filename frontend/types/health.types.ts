export interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  database: {
    status: 'connected' | 'disconnected' | 'connecting' | 'disconnecting' | 'uninitialized';
    host?: string;
    name?: string;
  };
}

export interface HealthState {
  data: HealthData | null;
  loading: boolean;
  error: string | null;
}
