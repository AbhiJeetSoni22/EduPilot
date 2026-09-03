'use client';

import { useEffect, useMemo, useState } from 'react';
import { academicService, Exam } from '@/services/academic.service';

export default function TimetablePage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    academicService.getExams().then((res) => setExams(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => exams.filter((exam) =>
    `${exam.subjectCode} ${exam.title} ${exam.venue} ${exam.examType}`.toLowerCase().includes(search.toLowerCase())
  ), [exams, search]);

  return (
    <main style={{ minHeight: '100vh', padding: '48px 6vw' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <a href="/" style={{ textDecoration: 'none' }}>← Back to EduPilot</a>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', margin: '24px 0 8px' }}>Exam Timetable</h1>
        <p style={{ opacity: 0.7, marginBottom: 28 }}>Browse published examinations, shifts, venues, and instructions.</p>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, exam type, venue..." style={{ width: '100%', maxWidth: 560, padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(127,127,127,.35)', background: 'transparent', color: 'inherit', marginBottom: 28 }} />
        {loading ? <p>Loading timetable…</p> : filtered.length === 0 ? <p>No published exams match your search.</p> : (
          <div style={{ display: 'grid', gap: 14 }}>
            {filtered.map((exam) => (
              <article key={exam._id} style={{ padding: 22, borderRadius: 18, border: '1px solid rgba(127,127,127,.2)', background: 'rgba(127,127,127,.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div><strong style={{ fontSize: 20 }}>{exam.subjectCode} — {exam.title}</strong><div style={{ opacity: .72, marginTop: 6 }}>{exam.examType} · Semester {exam.semester} · {exam.academicYear}</div></div>
                  <strong>{new Date(exam.examDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16, opacity: .85 }}><span>🕒 {exam.startTime} – {exam.endTime}</span><span>📍 {exam.venue}</span><span>💯 {exam.maxMarks} marks</span></div>
                {exam.instructions?.length > 0 && <ul style={{ marginTop: 14 }}>{exam.instructions.map((item, i) => <li key={i}>{item}</li>)}</ul>}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
