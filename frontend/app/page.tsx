import React from 'react';
import { HealthCheckWidget } from '@/components/HealthCheckWidget';
import { FeatureGrid } from '@/components/FeatureGrid';

export default function HomePage() {
  return (
    <div className="container">
      <section className="hero">
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

        {/* Live Health Status Component */}
        <HealthCheckWidget />
      </section>

      {/* Planned Feature Domains */}
      <FeatureGrid />
    </div>
  );
}
