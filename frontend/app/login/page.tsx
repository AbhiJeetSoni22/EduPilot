'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
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

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-wrapper">
      {/* Dynamic Ambient Background Glows */}
      <div className="auth-bg-glow glow-1" aria-hidden="true" />
      <div className="auth-bg-glow glow-2" aria-hidden="true" />

      <div className="auth-card-v2">
        {/* Header Section */}
        <div className="auth-header-v2">
          <div className="auth-badge-icon">
            <span className="auth-shield-icon">🛡️</span>
            <div className="auth-icon-pulse" />
          </div>
          <div className="auth-portal-pill">
            <span className="portal-pill-dot" />
            <span>EduPilot Administration</span>
          </div>
          <h1 className="auth-title-v2">Staff Portal Login</h1>
          <p className="auth-subtitle-v2">
            Secure administrative access for Deans, HODs, & Course Coordinators
          </p>
        </div>

        {/* Quick Demo Credentials Box */}
        <div className="auth-demo-card">
          <div className="auth-demo-top">
            <div className="demo-badge">
              <span className="demo-sparkle">⚡</span>
              <span>Fast Demo Evaluation</span>
            </div>
            <span className="demo-hint">1-Click Auto Fill</span>
          </div>
          <button
            type="button"
            className="auth-demo-action-btn"
            onClick={() => handleQuickLogin('admin@edupilot.edu', 'Admin@123456')}
            disabled={isSubmitting}
          >
            <div className="demo-btn-left">
              <div className="demo-avatar">🎓</div>
              <div className="demo-btn-info">
                <div className="demo-name-role">
                  <span className="demo-name">Dr. Eleanor Vance</span>
                  <span className="demo-role-tag">Dean & Admin</span>
                </div>
                <span className="demo-email-display">admin@edupilot.edu</span>
              </div>
            </div>
            <span className="demo-arrow">→</span>
          </button>
        </div>

        {/* Divider */}
        <div className="auth-divider-v2">
          <span className="divider-line" />
          <span className="divider-text">or sign in with credentials</span>
          <span className="divider-line" />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>Authentication Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form-v2">
          <div className="form-field">
            <label className="form-field-label" htmlFor="email">
              Admin Email
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                className="form-input-v2"
                placeholder="admin@edupilot.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-field">
            <div className="form-field-header">
              <label className="form-field-label" htmlFor="password">
                Password
              </label>
            </div>
            <div className="input-icon-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input-v2 has-toggle"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="btn-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn-v2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-loading-content">
                <span className="loading-spinner" />
                <span>Verifying credentials...</span>
              </span>
            ) : (
              <span className="btn-normal-content">
                <span>Sign In to Admin Portal</span>
                <span className="btn-arrow-icon">→</span>
              </span>
            )}
          </button>
        </form>

        {/* Card Footer Info */}
        <div className="auth-footer-v2">
          <div className="footer-notice-box">
            <span className="notice-icon">ℹ️</span>
            <div className="notice-text">
              <strong>Looking for student portal?</strong>
              <p>
                Students do not need an account. Public course info & AI assistant
                are available on the{' '}
                <Link href="/" className="auth-inline-link">
                  Home Portal
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
