'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  academicService,
  Department,
  Program,
  AcademicDocumentItem,
} from '@/services/academic.service';

export default function KnowledgeBaseAdminPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [documents, setDocuments] = useState<AcademicDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [deptRes, progRes, docRes] = await Promise.all([
          academicService.getDepartments(),
          academicService.getPrograms(),
          academicService.getDocuments(),
        ]);
        if (deptRes.data) setDepartments(deptRes.data);
        if (progRes.data) setPrograms(progRes.data);
        if (docRes.data) setDocuments(docRes.data);
      } catch (err) {
        console.error('Error loading knowledge base admin data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter programs based on selected department
  const filteredPrograms = selectedDepartment
    ? programs.filter((p) => {
        const deptId = typeof p.department === 'string' ? p.department : p.department?._id;
        return deptId === selectedDepartment;
      })
    : programs;

  // Polling for processing documents
  useEffect(() => {
    const hasProcessingDocs = documents.some(
      (d) => d.status === 'processing' || d.status === 'uploaded'
    );
    if (!hasProcessingDocs) return;

    const interval = setInterval(async () => {
      try {
        const docRes = await academicService.getDocuments();
        if (docRes.data) {
          setDocuments(docRes.data);
        }
      } catch (err) {
        console.error('Error polling document status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setUploadMessage({ type: 'error', text: 'Only PDF documents (.pdf) are supported.' });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadMessage(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) {
      setUploadMessage({ type: 'error', text: 'Please select a Department.' });
      return;
    }
    if (!selectedProgram) {
      setUploadMessage({ type: 'error', text: 'Please select an Academic Program.' });
      return;
    }
    if (!selectedFile) {
      setUploadMessage({ type: 'error', text: 'Please select a PDF handbook or syllabus file to upload.' });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('department', selectedDepartment);
    formData.append('program', selectedProgram);
    formData.append('file', selectedFile);

    try {
      const res = await academicService.uploadDocument(formData);
      if (res.success) {
        setUploadMessage({
          type: 'success',
          text: `Document "${selectedFile.name}" uploaded and indexed successfully!`,
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Refresh documents list
        const updated = await academicService.getDocuments();
        if (updated.data) setDocuments(updated.data);
      } else {
        setUploadMessage({
          type: 'error',
          text: res.error?.message || 'Failed to upload and process document.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed due to a server error.';
      setUploadMessage({ type: 'error', text: msg });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" and all its vector knowledge chunks?`)) {
      return;
    }
    try {
      const res = await academicService.deleteDocument(docId);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d._id !== docId));
      } else {
        alert(res.error?.message || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete document from server.');
    }
  };

  const renderStatusBadge = (doc: AcademicDocumentItem) => {
    switch (doc.status) {
      case 'ready':
      case 'processed':
        return (
          <span className="kb-badge kb-badge-ready" title="Indexed in Atlas Vector Search">
            ✓ Ready ({doc.totalChunks || 0} chunks)
          </span>
        );
      case 'processing':
        return (
          <span className="kb-badge kb-badge-processing">
            <span className="kb-spinner-dot"></span> Processing...
          </span>
        );
      case 'uploaded':
        return (
          <span className="kb-badge kb-badge-uploaded">
            <span className="kb-spinner-dot"></span> Uploading...
          </span>
        );
      case 'failed':
        return (
          <span className="kb-badge kb-badge-failed" title={doc.processingError || 'Processing failed'}>
            ✕ Processing failed
          </span>
        );
      default:
        return <span className="kb-badge kb-badge-archived">{doc.status}</span>;
    }
  };

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="portal-header-row">
        <div>
          <h1 className="portal-page-title">Knowledge Base & PDF Vector Ingestion</h1>
          <p className="portal-page-subtitle">
            Upload institutional PDF handbooks, syllabi, and regulations. Academic metadata, chunking,
            and 768-dimensional Gemini embeddings are automatically extracted and indexed into Atlas Vector Search.
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="portal-banner-card">
        <div className="banner-badge">RAG Knowledge Ingestion Pipeline</div>
        <h2 className="banner-title" style={{ marginBottom: '0.75rem' }}>
          Upload Knowledge Document
        </h2>
        <p className="layer-desc" style={{ marginBottom: '1.25rem' }}>
          Provide the <strong>Department</strong>, <strong>Program</strong>, and <strong>PDF</strong>.
          Semester, subject codes, credits, and section titles are automatically parsed from the PDF text.
        </p>

        {uploadMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: uploadMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${uploadMessage.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              color: uploadMessage.type === 'success' ? '#10b981' : '#ef4444',
            }}
          >
            {uploadMessage.type === 'success' ? '✓ ' : '⚠️ '}
            {uploadMessage.text}
          </div>
        )}

        <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
          {/* Department */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Department <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedProgram('');
              }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
              required
            >
              <option value="">Select Department...</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Program */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Program <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              disabled={!selectedDepartment}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                opacity: selectedDepartment ? 1 : 0.6,
              }}
              required
            >
              <option value="">Select Program...</option>
              {filteredPrograms.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* PDF File */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              PDF Document <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '0.5rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
              }}
              required
            />
          </div>

          {/* Upload Button */}
          <div>
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !selectedDepartment || !selectedProgram}
              className="btn-primary"
              style={{
                width: '100%',
                height: '42px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                opacity: isUploading || !selectedFile ? 0.7 : 1,
                cursor: isUploading ? 'not-allowed' : 'pointer',
              }}
            >
              {isUploading ? (
                <>
                  <span className="kb-spinner-dot"></span> Ingesting & Embedding...
                </>
              ) : (
                <>📁 Upload & Ingest PDF</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Documents List Section */}
      <div className="portal-banner-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="banner-title" style={{ margin: 0 }}>
              Ingested Knowledge Documents ({documents.length})
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Source-of-truth PDF documents indexed for semantic vector search
            </span>
          </div>
          <button
            onClick={async () => {
              setIsLoading(true);
              const res = await academicService.getDocuments();
              if (res.data) setDocuments(res.data);
              setIsLoading(false);
            }}
            className="btn-secondary"
            style={{ fontSize: '0.775rem', padding: '0.4rem 0.8rem' }}
          >
            ↻ Refresh
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading Knowledge Base documents...
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📄</span>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No Knowledge Documents Uploaded</p>
            <p style={{ fontSize: '0.85rem' }}>Upload your first syllabus or academic handbook PDF using the form above.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Document Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Program</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pages / Chunks</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Uploaded</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.originalFileName}</div>
                      {doc.processingError && (
                        <div style={{ fontSize: '0.725rem', color: '#ef4444', marginTop: '0.25rem' }}>
                          ⚠️ Error: {doc.processingError}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                      {doc.department?.name || doc.department?.code || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                      {doc.program?.name || doc.program?.code || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {renderStatusBadge(doc)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      {doc.totalPages ? `${doc.totalPages} pages` : '—'} /{' '}
                      <strong>{doc.totalChunks !== undefined ? `${doc.totalChunks} chunks` : '—'}</strong>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                      {new Date(doc.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <a
                          href={academicService.getDocumentDownloadUrl(doc._id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          title="View / Download PDF"
                        >
                          ⬇ PDF
                        </a>
                        <button
                          onClick={() => handleDelete(doc._id, doc.title)}
                          className="btn-secondary"
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                          }}
                          title="Delete Document & Chunks"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Style Helpers */}
      <style jsx>{`
        .kb-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.65rem;
          border-radius: 9999px;
        }
        .kb-badge-ready {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .kb-badge-processing {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .kb-badge-uploaded {
          background: rgba(99, 102, 241, 0.12);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .kb-badge-failed {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .kb-badge-archived {
          background: rgba(148, 163, 184, 0.12);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        .kb-spinner-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 1s infinite alternate;
        }
        @keyframes pulse {
          0% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
