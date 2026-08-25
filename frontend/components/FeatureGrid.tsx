import React from 'react';

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  status: string;
}

const features: FeatureItem[] = [
  {
    icon: '📅',
    title: 'Exam Schedules & Shifts',
    description: 'Instant lookup for upcoming mid-term and end-semester timetables, venues, and hall guidelines.',
    status: 'Planned',
  },
  {
    icon: '📚',
    title: 'Syllabus & Course Details',
    description: 'Unit-by-unit curriculum breakdown, prescribed textbooks, course credits, and prerequisite mapping.',
    status: 'Planned',
  },
  {
    icon: '⏱️',
    title: 'Attendance Policies',
    description: 'Minimum eligibility thresholds, condonation rules, medical certificate guidelines, and shortfall alerts.',
    status: 'Planned',
  },
  {
    icon: '📝',
    title: 'Assignments & Deadlines',
    description: 'Track ongoing submission deadlines, format specifications, and continuous evaluation marks.',
    status: 'Planned',
  },
  {
    icon: '📊',
    title: 'Grading & Evaluation',
    description: 'GPA/CGPA formulas, grade point boundaries, passing criteria, and grace mark policies.',
    status: 'Planned',
  },
  {
    icon: '📖',
    title: 'Academic Regulations (RAG)',
    description: 'Semantic vector search across institutional handbooks, circulars, and university statutes.',
    status: 'Future Phase',
  },
];

export function FeatureGrid() {
  return (
    <section className="features-section">
      <div className="section-header">
        <div className="section-tag">Capabilities & Scope</div>
        <h2 className="section-title">Designed for Higher Education</h2>
      </div>

      <div className="feature-cards-grid">
        {features.map((feature, idx) => (
          <div key={idx} className="feature-card">
            <div className="feature-icon-wrapper">{feature.icon}</div>
            <h3 className="feature-card-title">{feature.title}</h3>
            <p className="feature-card-desc">{feature.description}</p>
            <span className="feature-card-status">
              ● {feature.status}
            </span>
          </div>
        ))}
      </div>

      <div className="arch-preview">
        <div className="section-tag" style={{ textAlign: 'center' }}>System Pipeline</div>
        <h3 style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Decoupled AI & Data Flow</h3>
        <div className="arch-flow">
          <div className="arch-node">
            Next.js UI
            <span>Client Interface</span>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-node">
            Node.js / Express
            <span>API & Validation</span>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-node">
            Gemini AI
            <span>NLU & Synthesis</span>
          </div>
          <div className="arch-arrow">→</div>
          <div className="arch-node">
            MongoDB / RAG
            <span>Authoritative Truth</span>
          </div>
        </div>
      </div>
    </section>
  );
}
