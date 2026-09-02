import React from 'react';

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  category: string;
  status: string;
  statusType: 'ready' | 'live' | 'future';
  color: string;
}

const features: FeatureItem[] = [
  {
    icon: '📅',
    title: 'Exam Timetables & Shifts',
    description: 'Instant lookup for upcoming mid-terms, end-sems, practical batches, venues, and exam day guidelines.',
    category: 'Schedules',
    status: 'Ready',
    statusType: 'ready',
    color: 'indigo',
  },
  {
    icon: '📚',
    title: 'Syllabus & Course Details',
    description: 'Unit-by-unit curriculum breakdown, course credits, prescribed textbooks, prerequisite maps, and teaching plans.',
    category: 'Curriculum',
    status: 'Ready',
    statusType: 'ready',
    color: 'emerald',
  },
  {
    icon: '⏱️',
    title: 'Attendance Regulations',
    description: 'Minimum eligibility thresholds (75%), condonation criteria, medical leave submission rules, and shortfall alerts.',
    category: 'Compliance',
    status: 'Ready',
    statusType: 'ready',
    color: 'amber',
  },
  {
    icon: '📝',
    title: 'Assignments & Evaluations',
    description: 'Submission deadlines, format guidelines, faculty contacts, and continuous internal assessment (CIA) weightage.',
    category: 'Coursework',
    status: 'Ready',
    statusType: 'ready',
    color: 'cyan',
  },
  {
    icon: '📊',
    title: 'Grading & Passing Criteria',
    description: 'SGPA/CGPA calculation formulas, grade point boundaries, backlog clearing policies, and grace mark rules.',
    category: 'Academic Record',
    status: 'Ready',
    statusType: 'ready',
    color: 'rose',
  },
  {
    icon: '🧠',
    title: 'Academic Knowledge RAG',
    description: 'Semantic vector retrieval across institutional handbooks, university statutes, faculty circulars, and notifications.',
    category: 'Deep Retrieval',
    status: 'Active RAG',
    statusType: 'live',
    color: 'violet',
  },
];

export function FeatureGrid() {
  return (
    <section className="features-section-v2">
      {/* Section Header */}
      <div className="section-header-v2">
        <div className="section-badge">
          <span>⚡ Capabilities & Domain Coverage</span>
        </div>
        <h2 className="section-title-v2">
          Designed for Higher Education Excellence
        </h2>
        <p className="section-subtitle-v2">
          Consolidating fragmented university documentation, academic circulars, and timetables into one conversational assistant.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="feature-cards-grid-v2">
        {features.map((feature, idx) => (
          <div key={idx} className={`feature-card-v2 color-${feature.color}`}>
            <div className="card-top-row">
              <div className="feature-icon-v2">
                <span>{feature.icon}</span>
              </div>
              <span className={`feature-status-pill status-${feature.statusType}`}>
                {feature.status}
              </span>
            </div>

            <div className="card-category-label">{feature.category}</div>
            <h3 className="feature-title-v2">{feature.title}</h3>
            <p className="feature-desc-v2">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Architecture System Pipeline Card */}
      <div className="arch-card-v2">
        <div className="arch-header-v2">
          <div className="arch-tag">
            <span>⚙️ System Pipeline</span>
          </div>
          <h3 className="arch-title">Decoupled AI & Retrieval Architecture</h3>
          <p className="arch-sub">
            Built with separation of concerns: authoritative student data is isolated from generative inference for deterministic accuracy.
          </p>
        </div>

        <div className="arch-flow-v2">
          <div className="arch-step">
            <div className="step-badge">01</div>
            <div className="step-card">
              <div className="step-icon">💻</div>
              <div className="step-name">Next.js UI</div>
              <span className="step-desc">Interactive Chat & Staff Portal</span>
            </div>
          </div>

          <div className="arch-connector">
            <span className="connector-line" />
            <span className="connector-icon">→</span>
          </div>

          <div className="arch-step">
            <div className="step-badge">02</div>
            <div className="step-card">
              <div className="step-icon">🛡️</div>
              <div className="step-name">Node / Express</div>
              <span className="step-desc">JWT, Query Analysis & Logic</span>
            </div>
          </div>

          <div className="arch-connector">
            <span className="connector-line" />
            <span className="connector-icon">→</span>
          </div>

          <div className="arch-step">
            <div className="step-badge">03</div>
            <div className="step-card">
              <div className="step-icon">🧠</div>
              <div className="step-name">Gemini AI</div>
              <span className="step-desc">NLU & Response Synthesis</span>
            </div>
          </div>

          <div className="arch-connector">
            <span className="connector-line" />
            <span className="connector-icon">→</span>
          </div>

          <div className="arch-step">
            <div className="step-badge">04</div>
            <div className="step-card">
              <div className="step-icon">🗄️</div>
              <div className="step-name">MongoDB Atlas</div>
              <span className="step-desc">Deterministic Academic Records</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
