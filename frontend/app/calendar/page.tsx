'use client';

import { useEffect, useMemo, useState } from 'react';
import { academicService, AcademicCalendarEvent } from '@/services/academic.service';
import styles from './calendar.module.css';

const FILTERS = ['All', 'Academic', 'Examination', 'Holiday', 'Registration', 'Deadline', 'Event'] as const;

type Filter = (typeof FILTERS)[number];

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString(undefined, options);
}

export default function CalendarPage() {
  const [events, setEvents] = useState<AcademicCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [type, setType] = useState<Filter>('All');

  useEffect(() => {
    let active = true;
    academicService
      .getCalendarEvents()
      .then((res) => {
        if (active) setEvents(res.data || []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return [...events]
      .filter((event) => type === 'All' || event.eventType === type)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events, type]);

  const stats = useMemo(() => {
    const upcoming = events.filter((event) => new Date(event.endDate).getTime() >= Date.now());
    const holidays = events.filter((event) => event.isHoliday);
    const deadlines = events.filter((event) => event.eventType === 'Deadline');
    return { upcoming: upcoming.length, holidays: holidays.length, deadlines: deadlines.length };
  }, [events]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <a className={styles.back} href="/">← Back to EduPilot</a>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>Academic planning</span>
          <h1 className={styles.title}>Academic Calendar</h1>
          <p className={styles.subtitle}>
            Keep track of academic milestones, examinations, registrations, holidays, deadlines, and important campus events in one place.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.upcoming}</span>
              <span className={styles.statLabel}>Upcoming events</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.deadlines}</span>
              <span className={styles.statLabel}>Deadlines</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.holidays}</span>
              <span className={styles.statLabel}>Holidays</span>
            </div>
          </div>
        </section>

        <div className={styles.controls}>
          <div className={styles.filters} aria-label="Calendar filters">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.filter} ${type === item ? styles.filterActive : ''}`}
                onClick={() => setType(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {!loading && <span className={styles.count}>{filtered.length} event{filtered.length === 1 ? '' : 's'}</span>}
        </div>

        {loading ? (
          <section className={styles.panel}>
            <div className={styles.loading}>Loading your academic calendar…</div>
          </section>
        ) : error ? (
          <section className={styles.panel}>
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⚠️</div>
              <h2 className={styles.emptyTitle}>Calendar unavailable</h2>
              <p className={styles.emptyText}>We could not load calendar data right now. Please make sure the backend is running and try again.</p>
            </div>
          </section>
        ) : (
          <div className={styles.contentGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Timeline</h2>
                  <p className={styles.panelSubtitle}>Events are ordered by their start date.</p>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>🗓️</div>
                  <h2 className={styles.emptyTitle}>No events found</h2>
                  <p className={styles.emptyText}>There are no calendar events matching the selected category.</p>
                </div>
              ) : (
                <div className={styles.timeline}>
                  {filtered.map((event) => (
                    <article className={styles.event} key={event._id}>
                      <div className={styles.date}>
                        <span className={styles.day}>{formatDate(event.startDate, { day: '2-digit' })}</span>
                        <span className={styles.month}>{formatDate(event.startDate, { month: 'short', year: 'numeric' })}</span>
                      </div>
                      <span className={`${styles.dot} ${event.isHoliday ? styles.legendDotHoliday : ''}`} aria-hidden="true" />
                      <div className={styles.eventBody}>
                        <div className={styles.eventTop}>
                          <h3 className={styles.eventTitle}>{event.title}</h3>
                          <span className={styles.badge}>{event.eventType}</span>
                        </div>
                        <div className={styles.meta}>
                          {formatDate(event.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                          {event.endDate !== event.startDate && ` – ${formatDate(event.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                          {' · '}{event.semester} semester · {event.targetAudience}
                          {event.isHoliday ? ' · Holiday' : ''}
                        </div>
                        {event.description && <p className={styles.description}>{event.description}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className={styles.side}>
              <section className={`${styles.panel} ${styles.sideCard}`}>
                <h2 className={styles.sideTitle}>Plan your semester</h2>
                <p className={styles.sideText}>Use the calendar to keep registrations, examinations, deadlines, and holidays visible before they arrive.</p>
                <div className={styles.legend}>
                  <div className={styles.legendItem}><span className={styles.legendDot} /> Academic / general event</div>
                  <div className={styles.legendItem}><span className={styles.legendDotExam} /> Examination</div>
                  <div className={styles.legendItem}><span className={styles.legendDotDeadline} /> Deadline</div>
                  <div className={styles.legendItem}><span className={styles.legendDotHoliday} /> Holiday</div>
                </div>
              </section>

              <section className={`${styles.panel} ${styles.sideCard}`}>
                <h2 className={styles.sideTitle}>Quick navigation</h2>
                <p className={styles.sideText}>Need exam dates instead? Open the dedicated timetable for subject-wise exam details and venues.</p>
                <a className={styles.back} href="/timetable" style={{ marginTop: '.8rem' }}>View exam timetable →</a>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
