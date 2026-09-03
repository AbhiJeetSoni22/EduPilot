'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { academicService } from '@/services/academic.service';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    exams: 0,
    documents: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [examRes, docRes] = await Promise.all([
          academicService.getExams(),
          academicService.getDocuments(),
        ]);

        setStats({
          exams: examRes.data?.length || 0,
          documents: docRes.data?.length || 0,
        });
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  const statCards = [
    { title: 'Scheduled Exams', count: stats.exams, icon: '📝', link: '/admin/exams', color: 'rose' },
    { title: 'Knowledge Base Docs', count: stats.documents, icon: '📁', link: '/admin/knowledge-base', color: 'violet', badge: 'RAG Foundation' },
  ];

  return (
    <div className="portal-page">
      <div className="portal-header-row">
        <div>
          <h1 className="portal-page-title">Academic Management Overview</h1>
          <p className="portal-page-subtitle">
            Authoritative source-of-truth hub for university examinations and knowledge base documents.
          </p>
        </div>
        <div className="header-actions-group">
          <Link href="/admin/exams" className="btn-secondary">
            <span>📝 Schedule Exam</span>
          </Link>
          <Link href="/admin/knowledge-base" className="btn-primary">
            <span>+ Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="portal-stats-grid">
        {statCards.map((card) => (
          <Link key={card.title} href={card.link} className={`portal-stat-card ${card.color}`}>
            <div className="stat-card-header">
              <span className="stat-card-icon">{card.icon}</span>
              {card.badge && <span className="stat-badge">{card.badge}</span>}
            </div>
            <div className="stat-card-body">
              <span className="stat-card-value">
                {isLoading ? '...' : card.count}
              </span>
              <span className="stat-card-title">{card.title}</span>
            </div>
            <div className="stat-card-footer">
              <span>Manage records →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Architecture & AI Grounding Notice */}
      <div className="portal-banner-card">
        <div className="banner-badge">Phase 2 Architecture Ready</div>
        <h2 className="banner-title">Dual-Layer Academic Knowledge System</h2>
        <div className="dual-layer-grid">
          <div className="layer-column">
            <div className="layer-header">
              <span className="layer-icon">🗄️</span>
              <div>
                <h3 className="layer-name">1. Structured Examination Data</h3>
                <span className="layer-type">Direct MongoDB Queries</span>
              </div>
            </div>
            <p className="layer-desc">
              Exam schedules, shift timings, venues, and assessment guidelines are managed with precise relational schemas. Future Gemini queries will retrieve these via structured database lookups.
            </p>
            <div className="layer-tags">
              <span className="layer-tag">Exams</span>
              <span className="layer-tag">Schedules</span>
              <span className="layer-tag">Venues</span>
              <span className="layer-tag">Timetables</span>
            </div>
          </div>

          <div className="layer-column">
            <div className="layer-header">
              <span className="layer-icon">📄</span>
              <div>
                <h3 className="layer-name">2. Knowledge Base Foundation</h3>
                <span className="layer-type">Future RAG Vector Pipeline</span>
              </div>
            </div>
            <p className="layer-desc">
              Institutional PDF documents, regulation circulars, and student handbooks stored in the Knowledge Base provide the exact document repository for future Phase 4 text extraction, chunking, and MongoDB Vector Search.
            </p>
            <div className="layer-tags">
              <span className="layer-tag">Handbooks</span>
              <span className="layer-tag">Regulations</span>
              <span className="layer-tag">Circulars</span>
              <span className="layer-tag">Syllabus PDFs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="portal-quick-actions-section">
        <h2 className="section-heading">Quick Actions & Workflows</h2>
        <div className="quick-actions-grid">
          <Link href="/admin/exams" className="quick-action-card">
            <div className="qa-icon">📝</div>
            <div className="qa-info">
              <h3 className="qa-title">Schedule Examinations</h3>
              <p className="qa-desc">Define dates, venues, shifts, and instructions for mid-term and end-term assessments.</p>
            </div>
          </Link>

          <Link href="/admin/knowledge-base" className="quick-action-card">
            <div className="qa-icon">📁</div>
            <div className="qa-info">
              <h3 className="qa-title">Upload Knowledge Documents</h3>
              <p className="qa-desc">Register institutional PDFs and policy guidelines for the upcoming RAG pipeline.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

