'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'admin',
    academicYear: '2025-26',
    semester: 1,
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const res = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      academicYear: formData.academicYear,
      semester: formData.role === 'student' ? Number(formData.semester) : undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      router.push(formData.role === 'admin' ? '/admin' : '/');
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="container auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-badge">🎓</div>
          <h1 className="auth-title">Create EduPilot Account</h1>
          <p className="auth-subtitle">Register to access institutional academic intelligence</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. Dr. Eleanor Vance or Aarav Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Institutional Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@university.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="role">
                Account Role
              </label>
              <select
                id="role"
                className="form-input"
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as 'student' | 'admin',
                  })
                }
              >
                <option value="student">Student</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="academicYear">
                Academic Year
              </label>
              <input
                id="academicYear"
                type="text"
                className="form-input"
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData({ ...formData, academicYear: e.target.value })
                }
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-spinner-text">Registering...</span>
            ) : (
              <span>Create Account →</span>
            )}
          </button>
        </form>

        <div className="auth-footer-links">
          <span>Already have an account?</span>
          <Link href="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
