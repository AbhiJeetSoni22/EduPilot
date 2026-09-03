import React from 'react';
import Link from 'next/link';
import { HealthCheckWidget } from '@/components/HealthCheckWidget';
import { FeatureGrid } from '@/components/FeatureGrid';
import { ChatInterface } from '@/components/ChatInterface';

export default function HomePage() {
  return (
    <div className="home-wrapper">
      <div className="mesh-gradient mesh-1" aria-hidden="true" /><div className="mesh-gradient mesh-2" aria-hidden="true" /><div className="mesh-gradient mesh-3" aria-hidden="true" />
      <div className="container home-content">
        <section className="hero-section-v2">
          <div className="hero-col-left">
            <div className="hero-top-badge"><span className="badge-sparkle">✨</span><span className="badge-text">Next-Gen Academic AI Companion</span><span className="badge-pill-live">Live</span></div>
            <h1 className="hero-main-title">Intelligent Campus <br /><span className="hero-gradient-highlight">Academic Copilot</span></h1>
            <p className="hero-description">Instant syllabus navigation, real-time exam schedules, attendance thresholds, and official university regulations — powered by retrieval-augmented AI for higher education.</p>
            <div className="hero-feature-tags"><div className="tag-item"><span className="tag-icon">⚡</span><span>Instant Syllabus Breakdown</span></div><div className="tag-item"><span className="tag-icon">📅</span><span>Exam Shifts & Venues</span></div><div className="tag-item"><span className="tag-icon">⚖️</span><span>Grading & Regulations</span></div><div className="tag-item"><span className="tag-icon">🔒</span><span>No Student Login Required</span></div></div>
            <div className="hero-cta-group"><Link href="/login" className="btn-hero-admin"><span className="admin-btn-icon">🏛️</span><div className="admin-btn-text"><span className="admin-btn-title">Staff Portal</span><span className="admin-btn-sub">Deans & Faculty Access →</span></div></Link></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}><Link href="/timetable" className="btn-secondary">📅 View Exam Timetable</Link><Link href="/calendar" className="btn-secondary">🗓️ Academic Calendar</Link></div>
            <div className="hero-telemetry-box"><HealthCheckWidget /></div>
          </div>
          <div className="hero-col-right"><div className="chat-window-wrapper"><div className="chat-window-glow" /><ChatInterface /></div></div>
        </section>
        <FeatureGrid />
      </div>
    </div>
  );
}
