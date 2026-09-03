'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { name: 'Overview', path: '/admin', icon: '📊' },
  { name: 'Subjects', path: '/admin/subjects', icon: '📚' },
  { name: 'Exams', path: '/admin/exams', icon: '📝' },
  { name: 'Assignments', path: '/admin/assignments', icon: '📋' },
  { name: 'Academic Calendar', path: '/admin/academic-calendar', icon: '🗓️' },
  { name: 'Regulations', path: '/admin/regulations', icon: '⚖️' },
  { name: 'Knowledge Base', path: '/admin/knowledge-base', icon: '📁', badge: 'RAG Ready' },
  { name: 'Query Analytics', path: '/admin/analytics', icon: '📈', badge: 'Insights' },
  { name: 'Bulk Import', path: '/admin/bulk-import', icon: '⚡' },
  { name: 'User Management', path: '/admin/users', icon: '👥' },
];

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return <AdminGuard><div className="portal-layout">
    <button className="portal-mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle navigation menu">{isSidebarOpen ? '✕' : '☰'} Menu</button>
    <aside className={`portal-sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className="portal-brand"><div className="portal-logo-badge">🏛️</div><div className="portal-brand-text"><span className="portal-brand-title">Academic Management</span><span className="portal-brand-subtitle">Institution Control Portal</span></div></div>
      <div className="portal-admin-card"><div className="admin-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</div><div className="admin-meta"><span className="admin-name">{user?.name || 'Administrator'}</span><span className="admin-role-badge">Dean / Admin</span></div></div>
      <nav className="portal-nav"><div className="nav-section-label">Academic Management</div>{NAV_ITEMS.map((item) => { const isActive = item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path); return <Link key={item.path} href={item.path} onClick={() => setIsSidebarOpen(false)} className={`portal-nav-item ${isActive ? 'active' : ''}`}><span className="nav-item-icon">{item.icon}</span><span className="nav-item-label">{item.name}</span>{item.badge && <span className="nav-item-badge">{item.badge}</span>}</Link>; })}</nav>
      <div className="portal-sidebar-footer"><Link href="/" className="sidebar-footer-link"><span>←</span><span>Back to Home</span></Link><button onClick={logout} className="sidebar-logout-btn"><span>Sign Out</span><span>🚪</span></button></div>
    </aside>
    <main className="portal-main-content"><div className="portal-top-bar"><div className="top-bar-left"><div className="live-indicator"><span className="pulsing-dot"></span><span className="live-text">Academic Source-of-Truth Active</span></div></div><div className="top-bar-right"><span className="top-bar-academic-year">Academic Year: 2025-26</span><Link href="/admin/bulk-import" className="btn-quick-import"><span>⚡</span><span>Bulk Import</span></Link></div></div><div className="portal-page-body">{children}</div></main>
  </div></AdminGuard>;
}
