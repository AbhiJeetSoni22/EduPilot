import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer-v2">
      <div className="container footer-container-v2">
        <div className="footer-top-grid">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <div className="footer-logo-badge">EP</div>
              <span className="footer-logo-text">EduPilot AI</span>
            </div>
            <p className="footer-tagline">
              Decoupled intelligent academic copilot designed for university curriculum,
              exam timetables, attendance thresholds, and institutional policy navigation.
            </p>
            <div className="footer-status-indicator">
              <span className="footer-status-dot" />
              <span>Institutional Knowledge Engine Online</span>
            </div>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-col-title">Campus Hub</h4>
            <ul className="footer-nav-list">
              <li>
                <Link href="/" className="footer-nav-item">Assistant Home</Link>
              </li>
              <li>
                <Link href="/login" className="footer-nav-item">Staff Portal Login</Link>
              </li>
              <li>
                <Link href="/admin/knowledge-base" className="footer-nav-item">Knowledge Base</Link>
              </li>
              <li>
                <Link href="/admin/exams" className="footer-nav-item">Exam Timetables</Link>
              </li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-col-title">Architecture Stack</h4>
            <div className="footer-tech-stack">
              <span className="tech-badge">Next.js 14 App Router</span>
              <span className="tech-badge">Node.js Express API</span>
              <span className="tech-badge">Google Gemini 2.5 NLU</span>
              <span className="tech-badge">MongoDB Atlas RAG</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <p className="footer-copyright">
            © {new Date().getFullYear()} EduPilot. Open Academic Intelligence System. All rights reserved.
          </p>
          <div className="footer-legal-links">
            <span className="legal-pill">FERPA & Student Privacy Compliant</span>
            <span className="legal-pill">Zero Student Credential Storage</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
