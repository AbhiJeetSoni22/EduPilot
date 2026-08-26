'use client';

import React from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="container auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <div className="auth-icon-badge">✨</div>
          <h1 className="auth-title">No Registration Required</h1>
          <p className="auth-subtitle">Open Academic Intelligence for Students</p>
        </div>

        <div style={{ margin: '1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '1rem' }}>
            EduPilot does not require student accounts or passwords. You can directly ask questions
            about syllabus, exam schedules, grading systems, and attendance regulations.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Administrative accounts are provisioned directly by institution administrators.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
          <Link href="/" className="btn-primary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
            <span>Go to Academic Assistant →</span>
          </Link>
          <Link href="/login" className="btn-secondary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
            <span>Admin Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

