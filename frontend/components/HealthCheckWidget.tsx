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
          <span className="health-pulse-indicator" />
          <span>System & Engine Status</span>
          {health && (
            <span
              className={`status-pill ${health.status === 'ok' ? 'ok' : health.status === 'degraded' ? 'degraded' : 'error'}`}
            >
              {health.status === 'ok' ? 'All Systems Operational' : health.status === 'degraded' ? 'Degraded (Atlas Offline)' : 'Offline'}
            </span>
          )}
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="refresh-btn"
          title="Re-fetch backend health"
        >
          {loading ? (
            <span className="btn-refresh-loading">Pinging...</span>
          ) : (
            <span>🔄 Ping</span>
          )}
        </button>
      </div>

      <div className="health-grid">
        <div className="health-stat">
          <div className="health-stat-label">API Gateway</div>
          <div className="health-stat-value">
            <span className={`status-dot ${error ? 'error' : 'ok'}`} />
            <span>{error ? 'Unreachable' : health?.status?.toUpperCase() || 'ONLINE'}</span>
          </div>
        </div>

        <div className="health-stat">
          <div className="health-stat-label">Database (Atlas)</div>
          <div className="health-stat-value">
            <span className={`status-dot ${health?.database?.status === 'connected' ? 'ok' : health?.database?.status === 'connecting' ? 'degraded' : 'error'}`} />
            <span>{health?.database?.status ? health.database.status : error ? 'Offline' : 'Connected'}</span>
          </div>
        </div>

        <div className="health-stat">
          <div className="health-stat-label">Server Uptime</div>
          <div className="health-stat-value uptime-mono">
            {health ? formatUptime(health.uptime) : '--'}
          </div>
        </div>

        <div className="health-stat">
          <div className="health-stat-label">Telemetry Synced</div>
          <div className="health-stat-value sync-time">
            {lastChecked || '--'}
          </div>
        </div>
      </div>

      {error && (
        <div className="health-error-box">
          <span>⚠️ {error}</span>
          <span className="health-port-tip">Confirm backend running at http://localhost:5000</span>
        </div>
      )}
    </div>
  );
}
