import React from 'react';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-content">
        <p>© {new Date().getFullYear()} Exam & Academic Assistant. Clean decoupled architecture.</p>
        <div className="footer-links">
          <span className="footer-link">Next.js</span>
          <span className="footer-link">Express</span>
          <span className="footer-link">MongoDB</span>
          <span className="footer-link">Gemini AI</span>
        </div>
      </div>
    </footer>
  );
}
