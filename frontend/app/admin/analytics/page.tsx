'use client';

import { useEffect, useState } from 'react';
import { academicService, QueryAnalytics } from '@/services/academic.service';

export default function AnalyticsPage() {
  const [data, setData] = useState<QueryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { academicService.getQueryAnalytics().then((res) => setData(res.data || null)).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="portal-page"><h1 className="portal-page-title">Query Analytics</h1><p>Loading analytics…</p></div>;
  if (!data) return <div className="portal-page"><h1 className="portal-page-title">Query Analytics</h1><p>Analytics are unavailable. Make sure the backend is running.</p></div>;

  return <div className="portal-page">
    <div className="portal-header-row"><div><h1 className="portal-page-title">Query Analytics</h1><p className="portal-page-subtitle">Understand what students ask, where clarification is needed, and which inquiries remain unanswered.</p></div></div>
    <div className="portal-stats-grid">
      {[['Total Queries', data.totalQueries], ['Answered', data.answeredQueries], ['Answer Rate', `${data.answerRate}%`], ['Clarifications', data.clarificationQueries], ['Unanswered', data.unansweredCount]].map(([label, value]) => <div className="portal-stat-card indigo" key={String(label)}><div className="stat-card-body"><span className="stat-card-value">{value}</span><span className="stat-card-title">{label}</span></div></div>)}
    </div>
    <div className="dual-layer-grid" style={{ marginTop: 24 }}>
      <section className="layer-column"><h2 className="section-heading">Top Intents</h2>{data.topIntents.length ? data.topIntents.map((item) => <div key={item.intent} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(127,127,127,.16)' }}><span>{item.intent}</span><strong>{item.count}</strong></div>) : <p>No query data yet.</p>}</section>
      <section className="layer-column"><h2 className="section-heading">Retrieval Strategies</h2>{Object.entries(data.strategyCounts).map(([strategy, count]) => <div key={strategy} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(127,127,127,.16)' }}><span>{strategy}</span><strong>{count}</strong></div>)}</section>
    </div>
    <section className="portal-banner-card" style={{ marginTop: 24 }}><div className="banner-badge">Knowledge Base Opportunities</div><h2 className="banner-title">Unanswered inquiries</h2>{data.unanswered.length ? <div style={{ display: 'grid', gap: 10 }}>{data.unanswered.map((item, i) => <div key={`${item.conversationId}-${i}`} style={{ padding: 14, borderRadius: 12, background: 'rgba(127,127,127,.08)' }}><strong>{item.question}</strong><div style={{ opacity: .65, marginTop: 5 }}>{item.intent} · {new Date(item.timestamp).toLocaleString()}</div></div>)}</div> : <p>No unanswered non-clarification inquiries detected.</p>}</section>
  </div>;
}
