'use client';

import { useEffect, useMemo, useState } from 'react';
import { academicService, AcademicCalendarEvent } from '@/services/academic.service';

export default function CalendarPage() {
  const [events, setEvents] = useState<AcademicCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('All');

  useEffect(() => {
    academicService.getCalendarEvents().then((res) => setEvents(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => events.filter((event) => type === 'All' || event.eventType === type).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [events, type]);

  return (
    <main style={{ minHeight: '100vh', padding: '48px 6vw' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/" style={{ textDecoration: 'none' }}>← Back to EduPilot</a>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', margin: '24px 0 8px' }}>Academic Calendar</h1>
        <p style={{ opacity: .7, marginBottom: 24 }}>Important academic milestones, registrations, holidays, deadlines, and events.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>{['All', 'Academic', 'Examination', 'Holiday', 'Registration', 'Deadline', 'Event'].map((item) => <button key={item} onClick={() => setType(item)} style={{ padding: '9px 14px', borderRadius: 999, border: '1px solid rgba(127,127,127,.3)', background: type === item ? 'rgba(127,127,127,.18)' : 'transparent', color: 'inherit', cursor: 'pointer' }}>{item}</button>)}</div>
        {loading ? <p>Loading calendar…</p> : filtered.length === 0 ? <p>No calendar events found.</p> : (
          <div style={{ display: 'grid', gap: 12 }}>{filtered.map((event) => <article key={event._id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 18, padding: 20, borderRadius: 16, border: '1px solid rgba(127,127,127,.2)', background: event.isHoliday ? 'rgba(127,127,127,.1)' : 'transparent' }}><div><strong>{new Date(event.startDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</strong><div style={{ opacity: .6 }}>{new Date(event.endDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div></div><div><strong style={{ fontSize: 18 }}>{event.title}</strong><div style={{ marginTop: 5, opacity: .7 }}>{event.eventType} · {event.semester} · {event.targetAudience}{event.isHoliday ? ' · Holiday' : ''}</div>{event.description && <p style={{ margin: '8px 0 0', opacity: .78 }}>{event.description}</p>}</div></article>)}</div>
        )}
      </div>
    </main>
  );
}
