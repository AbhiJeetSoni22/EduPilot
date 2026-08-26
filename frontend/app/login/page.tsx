'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success) {
      router.push(redirect);
    } else {
      setError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setIsSubmitting(true);

    const res = await login(demoEmail, demoPass);
    setIsSubmitting(false);

    if (res.success) {
      router.push(demoEmail.includes('admin') ? '/admin' : '/');
    } else {
      setError(res.error || 'Quick login failed.');
    }
  };

  return (
    <div className="container auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-badge">🔐</div>
          <h1 className="auth-title">Welcome to EduPilot</h1>
          <p className="auth-subtitle">Sign in to access the Academic Management Portal</p>
        </div>

        {/* Quick Demo Credentials for Fast Evaluation */}
        <div className="demo-credentials-card">
          <div className="demo-header-row">
            <span className="demo-sparkle">⚡</span>
            <span className="demo-title">Quick Demo Login</span>
          </div>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="btn-demo admin-demo"
              onClick={() => handleQuickLogin('admin@edupilot.edu', 'Admin@123456')}
              disabled={isSubmitting}
            >
              <div className="demo-role-badge">Admin</div>
              <div className="demo-subtext">Dean Academic Affairs</div>
            </button>

            <button
              type="button"
              className="btn-demo student-demo"
              onClick={() => handleQuickLogin('student@edupilot.edu', 'Student@123456')}
              disabled={isSubmitting}
            >
              <div className="demo-role-badge">Student</div>
              <div className="demo-subtext">Semester 5 Student</div>
            </button>
          </div>
        </div>

        <div className="auth-divider">
          <span>or continue with credentials</span>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="e.g. admin@edupilot.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-spinner-text">Authenticating...</span>
            ) : (
              <span>Sign In to Portal →</span>
            )}
          </button>
        </form>

        <div className="auth-footer-links">
          <span>Need a new account?</span>
          <Link href="/register" className="auth-link">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
