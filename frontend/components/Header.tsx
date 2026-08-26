'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="header">
      <div className="container header-content">
        <Link href="/" className="logo-group">
          <div className="logo-icon">EP</div>
          <span className="logo-text">EduPilot</span>
        </Link>
        <div className="header-actions">
          <Link
            href="/"
            className={`header-nav-link ${pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          
          {isAuthenticated && isAdmin && (
            <Link href="/admin" className="header-portal-btn">
              <span className="portal-icon">🏛️</span>
              <span>Academic Portal</span>
            </Link>
          )}

          {isAuthenticated ? (
            <div className="user-profile-pill">
              <div className="user-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
              <div className="user-info-text">
                <span className="user-display-name">{user?.name}</span>
                <span className={`user-role-tag ${user?.role}`}>{user?.role}</span>
              </div>
              <button onClick={logout} className="btn-logout" title="Sign Out">
                ✕
              </button>
            </div>
          ) : (
            <div className="auth-action-buttons">
              <Link href="/admin" className="header-portal-btn">
                <span className="portal-icon">🏛️</span>
                <span>Academic Portal</span>
              </Link>
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
