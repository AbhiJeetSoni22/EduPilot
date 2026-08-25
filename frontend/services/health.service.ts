import { HealthData } from '@/types/health.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchBackendHealth(): Promise<HealthData> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
