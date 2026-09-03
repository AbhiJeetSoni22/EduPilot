'use client';

import React, { useEffect, useState } from 'react';
import { academicService, Exam } from '@/services/academic.service';

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Exam Form State
  const [formData, setFormData] = useState({
    title: '',
    subjectCode: '',
    examType: 'Mid-Semester' as Exam['examType'],
    examDate: '',
    startTime: '09:30',
    endTime: '12:30',
    venue: '',
    maxMarks: 100,
    academicYear: '2025-26',
    semester: 1,
    instructions: '',
  });

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const res = await academicService.getExams();
      setExams(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch exams:', err);
      setError(err.message || 'Failed to load examination records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      const instructionsArr = formData.instructions
        ? formData.instructions.split('\n').map((s) => s.trim()).filter(Boolean)
        : ['Carry university identity card', 'Arrive 15 minutes before exam start time'];

      await academicService.createExam({
        title: formData.title,
        subjectCode: formData.subjectCode.toUpperCase(),
        examType: formData.examType,
        examDate: formData.examDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.venue,
        maxMarks: Number(formData.maxMarks),
        academicYear: formData.academicYear,
        semester: Number(formData.semester),
        instructions: instructionsArr,
        status: 'scheduled',
      });

      setIsModalOpen(false);
      setFormData({
        title: '',
        subjectCode: '',
        examType: 'Mid-Semester',
        examDate: '',
        startTime: '09:30',
        endTime: '12:30',
        venue: '',
        maxMarks: 100,
        academicYear: '2025-26',
        semester: 1,
        instructions: '',
      });
      await fetchExams();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this examination schedule?')) return;
    try {
      await academicService.deleteExam(id);
      setExams(exams.filter((ex) => ex._id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete exam');
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || exam.examType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="portal-page">
      <div className="portal-header-row">
        <div>
          <h1 className="portal-page-title">Examination Management</h1>
          <p className="portal-page-subtitle">
            Schedule and manage university examinations, venues, time slots, and marking criteria.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <span>+ Schedule Exam</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="portal-toolbar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by title, subject code, or venue..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="portal-search-input"
          style={{
            flex: '1',
            minWidth: '240px',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-sm, 8px)',
            border: '1px solid var(--border-color, #334155)',
            background: 'var(--bg-secondary, #1e293b)',
            color: 'var(--text-primary, #f8fafc)',
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-sm, 8px)',
            border: '1px solid var(--border-color, #334155)',
            background: 'var(--bg-secondary, #1e293b)',
            color: 'var(--text-primary, #f8fafc)',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Exam Types</option>
          <option value="Mid-Semester">Mid-Semester</option>
          <option value="End-Semester">End-Semester</option>
          <option value="Quiz">Quiz</option>
          <option value="Practical">Practical</option>
          <option value="Supplementary">Supplementary</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Exams Grid/List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #94a3b8)' }}>
          Loading examination schedules...
        </div>
      ) : filteredExams.length === 0 ? (
        <div style={{ textAlig: 'center', padding: '3rem', background: 'var(--bg-secondary, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.25rem' }}>No Examinations Scheduled</h3>
          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem' }}>
            {searchQuery || typeFilter !== 'all' ? 'No exams match your search filters.' : 'Click "+ Schedule Exam" to add a new examination timetable.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredExams.map((exam) => (
            <div
              key={exam._id}
              style={{
                background: 'var(--bg-secondary, #1e293b)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: exam.examType === 'End-Semester' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                      color: exam.examType === 'End-Semester' ? '#fca5a5' : '#a5b4fc',
                      border: exam.examType === 'End-Semester' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                    }}
                  >
                    {exam.examType}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: exam.status === 'scheduled' ? '#34d399' : '#94a3b8',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    ● {exam.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem' }}>
                  {exam.title}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                  <div>📚 <strong>Subject Code:</strong> <span style={{ color: 'var(--text-primary, #f8fafc)' }}>{exam.subjectCode}</span></div>
                  <div>📅 <strong>Date:</strong> <span style={{ color: 'var(--text-primary, #f8fafc)' }}>{exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'N/A'}</span></div>
                  <div>⏰ <strong>Time:</strong> <span style={{ color: 'var(--text-primary, #f8fafc)' }}>{exam.startTime} - {exam.endTime}</span></div>
                  <div>🏛️ <strong>Venue:</strong> <span style={{ color: 'var(--text-primary, #f8fafc)' }}>{exam.venue || 'TBA'}</span></div>
                  <div>🎯 <strong>Max Marks:</strong> <span style={{ color: 'var(--text-primary, #f8fafc)' }}>{exam.maxMarks}</span></div>
                </div>
              </div>

              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color, #334155)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleDeleteExam(exam._id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Delete Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Exam Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '16px',
              padding: '1.75rem',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                Schedule New Examination
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                  Exam Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End-Term Computer Science Exam"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)',
                    background: 'var(--bg-stat, #0f172a)',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS101"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                      background: 'var(--bg-stat, #0f172a)',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                    Exam Type
                  </label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                      background: 'var(--bg-stat, #0f172a)',
                      color: '#fff',
                    }}
                  >
                    <option value="Mid-Semester">Mid-Semester</option>
                    <option value="End-Semester">End-Semester</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Practical">Practical</option>
                    <option value="Supplementary">Supplementary</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.examDate}
                    onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                      background: 'var(--bg-stat, #0f172a)',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                      background: 'var(--bg-stat, #0f172a)',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                      background: 'var(--bg-stat, #0f172a)',
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                    Venue / Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium Hall A"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                      background: 'var(--bg-stat, #0f172a)',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                    Maximum Marks
                  </label>
                  <input
                    type="number"
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                      background: 'var(--bg-stat, #0f172a)',
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.35rem' }}>
                  Instructions (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Bring university ID&#10;No calculators allowed"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)',
                    background: 'var(--bg-stat, #0f172a)',
                    color: '#fff',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Scheduling...' : 'Save Exam Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
