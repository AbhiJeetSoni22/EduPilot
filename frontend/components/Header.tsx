import React from 'react';

export function Header() {
  return (
    <header className="header">
      <div className="container header-content">
        <a href="/" className="logo-group">
          <div className="logo-icon">EA</div>
          <span className="logo-text">Exam & Academic Assistant</span>
        </a>
        <div className="header-badge">
          <span>Foundation Phase v0.1.0</span>
        </div>
      </div>
    </header>
  );
}
