import React from 'react';
import { HealthCheckWidget } from '@/components/HealthCheckWidget';
import { FeatureGrid } from '@/components/FeatureGrid';
import { ChatInterface } from '@/components/ChatInterface';

export default function HomePage() {
  return (
    <div className="container">
      <section className="hero-split-section">
        {/* Left Column: Heading, Subtitle & Status */}
        <div className="hero-left-column">
          <div className="hero-pill">
            <span>✨</span>
            <span>Next-Generation Academic Intelligence</span>
          </div>
          <h1 className="hero-title">
            Exam & <span className="hero-gradient-text">Academic Assistant</span>
          </h1>
          <p className="hero-subtitle">
            An AI-powered academic companion designed for university and college students.
            Simplifying exam timetables, syllabus queries, attendance policies, and academic regulations.
          </p>

          <div className="hero-highlights">
            <div className="highlight-pill">⚡ Instant Curriculum Lookup</div>
            <div className="highlight-pill">📅 Exam Timetables & Shifts</div>
            <div className="highlight-pill">⚖️ University Regulations</div>
          </div>

          {/* Live Health Status Component */}
          <div className="hero-health-wrapper">
            <HealthCheckWidget />
          </div>
        </div>

        {/* Right Column: Interactive Chatbot */}
        <div className="hero-right-column">
          <ChatInterface />
        </div>
      </section>

      {/* Feature Domains */}
      <FeatureGrid />
    </div>
  );
}
