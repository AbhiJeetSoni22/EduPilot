'use client';

import { useEffect, useMemo, useState } from 'react';
import { academicService, Exam } from '@/services/academic.service';
import styles from './timetable.module.css';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TimetablePage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    academicService
      .getExams()
      .then((res) => active && setExams(res.data || []))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...exams]
      .filter((exam) => !query || `${exam.subjectCode} ${exam.title} ${exam.venue} ${exam.examType} ${exam.academicYear}`.toLowerCase().includes(query))
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  }, [exams, search]);

  const upcoming = exams.filter((exam) => new Date(exam.examDate).getTime() >= Date.now()).length;
  const endSemester = exams.filter((exam) => exam.examType === 'End-Semester').length;
  const venues = new Set(exams.map((exam) => exam.venue).filter(Boolean)).size;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <a className={styles.back} href="/">← Back to EduPilot</a>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>Exam planning</span>
          <h1 className={styles.title}>Exam Timetable</h1>
          <p className={styles.subtitle}>View published examinations, dates, shifts, venues, marks, and important instructions in one organized schedule.</p>
          <div className={styles.stats}>
            <div className={styles.stat}><span className={styles.statValue}>{upcoming}</span><span className={styles.statLabel}>Upcoming exams</span></div>
            <div className={styles.stat}><span className={styles.statValue}>{endSemester}</span><span className={styles.statLabel}>End-semester exams</span></div>
            <div className={styles.stat}><span className={styles.statValue}>{venues}</span><span className={styles.statLabel}>Exam venues</span></div>
          </div>
        </section>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <input className={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, code, exam type, or venue…" aria-label="Search exams" />
          </div>
          {!loading && <span className={styles.count}>{filtered.length} exam{filtered.length === 1 ? '' : 's'}</span>}
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Published schedule</h2>
            <p className={styles.panelSubtitle}>Sorted chronologically by examination date.</p>
          </div>
          {loading ? <div className={styles.loading}>Loading examination schedule…</div> : error ? (
            <div className={styles.empty}><div className={styles.emptyIcon}>⚠️</div><h2 className={styles.emptyTitle}>Timetable unavailable</h2><p className={styles.emptyText}>We could not load exam data. Please make sure the backend is running and try again.</p></div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}><div className={styles.emptyIcon}>📅</div><h2 className={styles.emptyTitle}>No exams found</h2><p className={styles.emptyText}>{search ? 'Try a different search term.' : 'No published examinations are available yet.'}</p></div>
          ) : (
            <div className={styles.list}>
              {filtered.map((exam) => (
                <article className={styles.card} key={exam._id}>
                  <div className={styles.cardTop}>
                    <div>
                      <h3 className={styles.subject}>{exam.subjectCode} — {exam.title}</h3>
                      <p className={styles.meta}>{exam.examType} · Semester {exam.semester} · {exam.academicYear}</p>
                    </div>
                    <time className={styles.date} dateTime={exam.examDate}>{formatDate(exam.examDate)}</time>
                  </div>
                  <div className={styles.details}>
                    <div className={styles.detail}><span className={styles.detailLabel}>Time</span><span className={styles.detailValue}>{exam.startTime} – {exam.endTime}</span></div>
                    <div className={styles.detail}><span className={styles.detailLabel}>Venue</span><span className={styles.detailValue}>{exam.venue}</span></div>
                    <div className={styles.detail}><span className={styles.detailLabel}>Maximum marks</span><span className={styles.detailValue}>{exam.maxMarks}</span></div>
                  </div>
                  <span className={styles.status}>{exam.status}</span>
                  {exam.instructions?.length > 0 && <ul className={styles.instructions}>{exam.instructions.map((item, index) => <li key={`${exam._id}-${index}`}>{item}</li>)}</ul>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
