'use client';

import React, { useEffect, useState } from 'react';
import { fetchBackendHealth } from '@/services/health.service';
import { HealthData } from '@/types/health.types';
import { formatUptime, formatTimestamp } from '@/lib/utils';

export function HealthCheckWidget() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBackendHealth();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to connect to backend server';
      setError(message);
      setHealth(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="health-card">
      <div className="health-card-header">
        <div className="health-card-title">
          <span>Backend System Status</span>
          {health && (
            <span
              className={`status-dot ${health.status === 'ok' ? 'ok' : health.status === 'degraded' ? 'degraded' : 'error'}`}
            />
          )}
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="refresh-btn"
          title="Re-fetch backend health"
        >
          {loading ? 'Checking...' : 'Ping Backend'}
        </button>
      </div>

      <div className="health-grid">
        <div className="health-stat">
          <div className="health-stat-label">API Service</div>
          <div className="health-stat-value">
            {error ? 'Unreachable' : health?.status?.toUpperCase() || '...'}
          </div>
        </div>

        <div className="health-stat">
          <div className="health-stat-label">Database</div>
          <div className="health-stat-value">
            {health?.database?.status ? health.database.status : error ? 'Offline' : '...'}
          </div>
        </div>

        <div className="health-stat">
          <div className="health-stat-label">Uptime</div>
          <div className="health-stat-value">
            {health ? formatUptime(health.uptime) : '--'}
          </div>
        </div>

        <div className="health-stat">
          <div className="health-stat-label">Last Ping</div>
          <div className="health-stat-value">
            {lastChecked || '--'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
          {error} (Make sure backend is running on port 5000)
        </div>
      )}
    </div>
  );
}
