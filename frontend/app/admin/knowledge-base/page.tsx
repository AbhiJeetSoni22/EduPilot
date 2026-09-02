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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form & Dropzone State
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const handleFileValidation = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadMessage({ type: 'error', text: 'Only PDF documents (.pdf) are supported for RAG ingestion.' });
      setSelectedFile(null);
      return false;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadMessage({ type: 'error', text: 'File size exceeds maximum 25MB limit.' });
      setSelectedFile(null);
      return false;
    }
    setSelectedFile(file);
    setUploadMessage(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileValidation(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) {
      setUploadMessage({ type: 'error', text: 'Please select an academic Department.' });
      return;
    }
    if (!selectedProgram) {
      setUploadMessage({ type: 'error', text: 'Please select an Academic Program.' });
      return;
    }
    if (!selectedFile) {
      setUploadMessage({ type: 'error', text: 'Please choose or drop a valid PDF handbook or syllabus file.' });
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
          text: `Document "${selectedFile.name}" uploaded and indexed into Vector Search successfully!`,
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
    if (!window.confirm(`Are you sure you want to permanently delete "${title}" and all its associated 768-dim vector embeddings?`)) {
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

  // Aggregated Stats
  const totalDocs = documents.length;
  const readyDocs = documents.filter((d) => d.status === 'ready' || d.status === 'processed').length;
  const totalChunksCount = documents.reduce((acc, d) => acc + (d.totalChunks || 0), 0);
  const totalPagesCount = documents.reduce((acc, d) => acc + (d.totalPages || 0), 0);

  // Filtered documents table
  const filteredDocuments = documents.filter((doc) => {
    const matchesQuery =
      searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.department?.name && doc.department.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.program?.name && doc.program.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ready' && (doc.status === 'ready' || doc.status === 'processed')) ||
      (statusFilter === 'processing' && (doc.status === 'processing' || doc.status === 'uploaded')) ||
      (statusFilter === 'failed' && doc.status === 'failed');

    return matchesQuery && matchesStatus;
  });

  const renderStatusBadge = (doc: AcademicDocumentItem) => {
    switch (doc.status) {
      case 'ready':
      case 'processed':
        return (
          <span className="kb-v2-badge kb-v2-badge-ready" title="Indexed in MongoDB Atlas Vector Search">
            <span className="kb-pulse-dot online"></span>
            Vector Indexed ({doc.totalChunks || 0} chunks)
          </span>
        );
      case 'processing':
        return (
          <span className="kb-v2-badge kb-v2-badge-processing">
            <span className="kb-spinner-dot"></span>
            Chunking & Embedding...
          </span>
        );
      case 'uploaded':
        return (
          <span className="kb-v2-badge kb-v2-badge-uploaded">
            <span className="kb-spinner-dot"></span>
            Parsing PDF...
          </span>
        );
      case 'failed':
        return (
          <span className="kb-v2-badge kb-v2-badge-failed" title={doc.processingError || 'Processing failed'}>
            ⚠️ Processing Failed
          </span>
        );
      default:
        return <span className="kb-v2-badge kb-v2-badge-archived">{doc.status}</span>;
    }
  };

  return (
    <div className="kb-admin-portal-wrapper">
      {/* Top Header Banner */}
      <div className="kb-top-hero">
        <div className="kb-hero-content">
          <div className="kb-hero-pill">
            <span className="kb-pill-sparkle">✨</span>
            <span>Phase 4 RAG Grounding Core</span>
            <span className="kb-pill-dot"></span>
            <span>768-Dim Gemini Embeddings</span>
          </div>
          <h1 className="kb-hero-title">Knowledge Base & PDF Vector Ingestion</h1>
          <p className="kb-hero-description">
            Upload authoritative university handbooks, course syllabi, and academic regulations. Our automated RAG pipeline extracts text, cleans metadata, splits into structured chunks, and computes embeddings stored in MongoDB Atlas for zero-hallucination semantic retrieval.
          </p>
        </div>

        {/* Live Vector Engine Metrics */}
        <div className="kb-metrics-grid">
          <div className="kb-metric-tile">
            <div className="kb-metric-top">
              <span className="kb-metric-label">Indexed Documents</span>
              <span className="kb-metric-icon">📄</span>
            </div>
            <div className="kb-metric-value">{readyDocs} <span className="kb-metric-sub">/ {totalDocs}</span></div>
            <div className="kb-metric-status text-emerald">● 100% Vector Synced</div>
          </div>

          <div className="kb-metric-tile">
            <div className="kb-metric-top">
              <span className="kb-metric-label">Knowledge Chunks</span>
              <span className="kb-metric-icon">🧩</span>
            </div>
            <div className="kb-metric-value">{totalChunksCount.toLocaleString()}</div>
            <div className="kb-metric-status text-primary">● 768-dim Embeddings</div>
          </div>

          <div className="kb-metric-tile">
            <div className="kb-metric-top">
              <span className="kb-metric-label">Grounding Pages</span>
              <span className="kb-metric-icon">📑</span>
            </div>
            <div className="kb-metric-value">{totalPagesCount}</div>
            <div className="kb-metric-status text-cyan">● Source-Grounded Citations</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Ingestion Studio */}
      <div className="kb-studio-card">
        <div className="kb-card-header">
          <div className="kb-header-left">
            <div className="kb-studio-icon">⚡</div>
            <div>
              <h2 className="kb-studio-title">Ingestion Studio</h2>
              <p className="kb-studio-subtitle">Attach academic cohort tags and submit institutional PDF documents</p>
            </div>
          </div>
          <div className="kb-pipeline-tags">
            <span className="kb-pipeline-tag">PDF Text Parsing</span>
            <span className="kb-pipeline-arrow">→</span>
            <span className="kb-pipeline-tag">Semantic Chunking</span>
            <span className="kb-pipeline-arrow">→</span>
            <span className="kb-pipeline-tag">Atlas Vector Search</span>
          </div>
        </div>

        {uploadMessage && (
          <div className={`kb-alert-box ${uploadMessage.type}`}>
            <span className="kb-alert-icon">{uploadMessage.type === 'success' ? '✅' : '⚠️'}</span>
            <div className="kb-alert-content">
              <strong>{uploadMessage.type === 'success' ? 'Ingestion Completed' : 'Upload Notice'}</strong>
              <p>{uploadMessage.text}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUpload} className="kb-ingest-form">
          <div className="kb-form-row">
            {/* Department Select */}
            <div className="kb-field-group">
              <label className="kb-field-label">
                Department <span className="req-star">*</span>
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedProgram('');
                }}
                className="kb-select-input"
                required
              >
                <option value="">Choose Department...</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Program Select */}
            <div className="kb-field-group">
              <label className="kb-field-label">
                Program / Degree <span className="req-star">*</span>
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                disabled={!selectedDepartment}
                className="kb-select-input"
                required
              >
                <option value="">{selectedDepartment ? 'Choose Program...' : 'Select Department First...'}</option>
                {filteredPrograms.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Drag and Drop Upload Zone */}
          <div
            className={`kb-dropzone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {selectedFile ? (
              <div className="kb-file-selected-box">
                <div className="kb-pdf-icon-badge">📄</div>
                <div className="kb-file-details">
                  <span className="kb-file-name">{selectedFile.name}</span>
                  <span className="kb-file-size">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                  </span>
                </div>
                <button
                  type="button"
                  className="kb-file-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  title="Remove selected file"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="kb-dropzone-inner">
                <div className="kb-upload-cloud-icon">☁️</div>
                <div className="kb-drop-title">
                  <strong>Click to upload</strong> or drag & drop academic PDF
                </div>
                <p className="kb-drop-hint">
                  Supports institutional syllabi, exam rules, and attendance handbooks (PDF up to 25MB)
                </p>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="kb-action-row">
            <div className="kb-action-notice">
              <span className="kb-sparkle-dot"></span>
              <span>Embeddings are generated with <strong>gemini-embedding-001</strong> and cached locally</span>
            </div>
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !selectedDepartment || !selectedProgram}
              className="kb-submit-btn"
            >
              {isUploading ? (
                <>
                  <span className="kb-btn-spinner"></span>
                  <span>Ingesting & Generating Chunks...</span>
                </>
              ) : (
                <>
                  <span>🚀 Upload & Index PDF Knowledge</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Documents Registry Table Section */}
      <div className="kb-registry-card">
        <div className="kb-registry-header">
          <div>
            <h2 className="kb-registry-title">Ingested Document Repository</h2>
            <p className="kb-registry-sub">Verified source-of-truth documents accessible by the Gemini RAG orchestrator</p>
          </div>

          <div className="kb-table-controls">
            {/* Search Input */}
            <div className="kb-search-box">
              <span className="kb-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search documents, titles, departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="kb-search-input"
              />
              {searchQuery && (
                <button className="kb-search-clear" onClick={() => setSearchQuery('')}>
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="kb-filter-select"
            >
              <option value="all">All Statuses ({documents.length})</option>
              <option value="ready">Indexed / Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={async () => {
                setIsLoading(true);
                const res = await academicService.getDocuments();
                if (res.data) setDocuments(res.data);
                setIsLoading(false);
              }}
              className="kb-refresh-btn"
              title="Refresh Repository"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="kb-loading-state">
            <div className="kb-pulse-loader"></div>
            <span>Loading Knowledge Base repository...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="kb-empty-state">
            <div className="kb-empty-icon">📚</div>
            <h3 className="kb-empty-title">
              {searchQuery || statusFilter !== 'all' ? 'No matching documents found' : 'No Knowledge Documents Ingested'}
            </h3>
            <p className="kb-empty-desc">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search terms or status filter.'
                : 'Upload your first syllabus or university handbook PDF above to enable AI-grounded retrieval.'}
            </p>
          </div>
        ) : (
          <div className="kb-table-container">
            <table className="kb-data-table">
              <thead>
                <tr>
                  <th>Document Title & File</th>
                  <th>Cohort / Target</th>
                  <th>Status & Chunks</th>
                  <th>Pages / Size</th>
                  <th>Ingested Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc._id}>
                    <td>
                      <div className="kb-doc-title-cell">
                        <div className="kb-doc-icon">📑</div>
                        <div>
                          <span className="kb-doc-title">{doc.title}</span>
                          <span className="kb-doc-filename">{doc.originalFileName}</span>
                          {doc.processingError && (
                            <div className="kb-doc-error-tag">
                              <span>⚠️ {doc.processingError}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="kb-cohort-tags">
                        <span className="kb-dept-pill">
                          {doc.department?.code || doc.department?.name || 'All Departments'}
                        </span>
                        <span className="kb-prog-pill">
                          {doc.program?.code || doc.program?.name || 'All Programs'}
                        </span>
                      </div>
                    </td>

                    <td>{renderStatusBadge(doc)}</td>

                    <td>
                      <div className="kb-volume-cell">
                        <span className="kb-pages-count">
                          <strong>{doc.totalPages || 1}</strong> pages
                        </span>
                        <span className="kb-chunks-count">
                          <strong>{doc.totalChunks || 0}</strong> chunks
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="kb-date-cell">
                        {new Date(doc.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="kb-actions-cell">
                        <a
                          href={academicService.getDocumentDownloadUrl(doc._id)}
                          target="_blank"
                          rel="noreferrer"
                          className="kb-action-btn view"
                          title="View / Download Source PDF"
                        >
                          <span>⬇ View PDF</span>
                        </a>
                        <button
                          onClick={() => handleDelete(doc._id, doc.title)}
                          className="kb-action-btn delete"
                          title="Delete Document and Chunks"
                        >
                          <span>🗑 Delete</span>
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

      {/* Styled JSX Stylesheet for Knowledge Base UI */}
      <style jsx>{`
        .kb-admin-portal-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          width: 100%;
          max-width: 1300px;
          margin: 0 auto;
        }

        /* Top Hero Section */
        .kb-top-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .kb-hero-content {
          flex: 1;
          min-width: 320px;
        }

        .kb-hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.85rem;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
          border-radius: 9999px;
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--accent-primary);
          margin-bottom: 0.75rem;
          letter-spacing: 0.02em;
        }

        .kb-pill-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent-primary);
          opacity: 0.6;
        }

        .kb-hero-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.025em;
          margin-bottom: 0.5rem;
        }

        .kb-hero-description {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 680px;
        }

        /* Metrics Grid */
        .kb-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          min-width: 420px;
        }

        @media (max-width: 990px) {
          .kb-metrics-grid {
            width: 100%;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          }
        }

        .kb-metric-tile {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem 1.15rem;
          box-shadow: var(--card-shadow);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          transition: all 0.2s ease;
        }

        .kb-metric-tile:hover {
          transform: translateY(-2px);
          border-color: var(--border-highlight);
          box-shadow: var(--card-shadow-hover);
        }

        .kb-metric-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kb-metric-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .kb-metric-icon {
          font-size: 1.1rem;
        }

        .kb-metric-value {
          font-size: 1.65rem;
          font-weight: 800;
          color: var(--text-primary);
          font-family: var(--font-mono);
        }

        .kb-metric-sub {
          font-size: 0.95rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .kb-metric-status {
          font-size: 0.72rem;
          font-weight: 600;
        }

        .text-emerald { color: var(--accent-emerald); }
        .text-primary { color: var(--accent-primary); }
        .text-cyan { color: var(--accent-cyan); }

        /* Ingestion Studio Card */
        .kb-studio-card, .kb-registry-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 2rem;
          box-shadow: var(--card-shadow);
          backdrop-filter: blur(12px);
        }

        .kb-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
        }

        .kb-header-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .kb-studio-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: var(--accent-primary);
        }

        .kb-studio-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .kb-studio-subtitle {
          font-size: 0.84rem;
          color: var(--text-secondary);
        }

        .kb-pipeline-tags {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: var(--bg-stat);
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid var(--border-color);
        }

        .kb-pipeline-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .kb-pipeline-arrow {
          font-size: 0.75rem;
          color: var(--accent-primary);
        }

        /* Alert Box */
        .kb-alert-box {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.95rem 1.25rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          font-size: 0.88rem;
        }

        .kb-alert-box.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .kb-alert-box.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .kb-alert-content strong {
          display: block;
          font-weight: 700;
          margin-bottom: 0.15rem;
        }

        .kb-alert-content p {
          margin: 0;
          opacity: 0.9;
        }

        /* Ingest Form */
        .kb-ingest-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .kb-form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        @media (max-width: 640px) {
          .kb-form-row {
            grid-template-columns: 1fr;
          }
        }

        .kb-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .kb-field-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .req-star {
          color: #ef4444;
        }

        .kb-select-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-stat);
          color: var(--text-primary);
          font-size: 0.88rem;
          font-weight: 500;
          outline: none;
          transition: all 0.2s ease;
        }

        .kb-select-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        /* Drag & Drop Zone */
        .kb-dropzone {
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-lg);
          padding: 2.25rem 1.5rem;
          text-align: center;
          background: var(--bg-stat);
          cursor: pointer;
          transition: all 0.22s ease;
        }

        .kb-dropzone:hover, .kb-dropzone.dragging {
          border-color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.05);
          transform: scale(1.005);
        }

        .kb-dropzone.has-file {
          border-style: solid;
          border-color: rgba(16, 185, 129, 0.4);
          background: rgba(16, 185, 129, 0.04);
          padding: 1.25rem 1.5rem;
        }

        .kb-dropzone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.45rem;
        }

        .kb-upload-cloud-icon {
          font-size: 2.4rem;
          margin-bottom: 0.25rem;
        }

        .kb-drop-title {
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .kb-drop-title strong {
          color: var(--accent-primary);
        }

        .kb-drop-hint {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        /* Selected File Box */
        .kb-file-selected-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .kb-pdf-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          flex-shrink: 0;
        }

        .kb-file-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .kb-file-name {
          font-size: 0.94rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .kb-file-size {
          font-size: 0.78rem;
          color: #10b981;
          font-weight: 600;
        }

        .kb-file-remove-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .kb-file-remove-btn:hover {
          color: #ef4444;
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        /* Action Row */
        .kb-action-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding-top: 0.5rem;
          flex-wrap: wrap;
        }

        .kb-action-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .kb-sparkle-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-primary);
        }

        .kb-submit-btn {
          padding: 0.85rem 1.75rem;
          border-radius: var(--radius-sm);
          background: var(--gradient-primary);
          border: none;
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .kb-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(99, 102, 241, 0.5);
          filter: brightness(1.08);
        }

        .kb-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .kb-btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Registry Table Section */
        .kb-registry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .kb-registry-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .kb-registry-sub {
          font-size: 0.84rem;
          color: var(--text-secondary);
        }

        .kb-table-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .kb-search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .kb-search-icon {
          position: absolute;
          left: 0.75rem;
          font-size: 0.85rem;
          opacity: 0.6;
          pointer-events: none;
        }

        .kb-search-input {
          padding: 0.55rem 2rem 0.55rem 2.25rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-stat);
          color: var(--text-primary);
          font-size: 0.84rem;
          outline: none;
          min-width: 240px;
          transition: all 0.2s ease;
        }

        .kb-search-input:focus {
          border-color: var(--accent-primary);
          background: var(--bg-card);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .kb-search-clear {
          position: absolute;
          right: 0.65rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.75rem;
        }

        .kb-filter-select {
          padding: 0.55rem 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-stat);
          color: var(--text-primary);
          font-size: 0.84rem;
          font-weight: 600;
          outline: none;
        }

        .kb-refresh-btn {
          padding: 0.55rem 0.95rem;
          border-radius: var(--radius-sm);
          background: var(--btn-control-bg);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .kb-refresh-btn:hover {
          background: var(--btn-control-bg-hover);
          border-color: var(--border-highlight);
        }

        /* Table Design */
        .kb-table-container {
          overflow-x: auto;
        }

        .kb-data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .kb-data-table thead tr {
          border-bottom: 1px solid var(--border-color);
        }

        .kb-data-table th {
          padding: 0.85rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-secondary);
        }

        .kb-data-table tbody tr {
          border-bottom: 1px solid var(--border-color);
          transition: background 0.15s ease;
        }

        .kb-data-table tbody tr:hover {
          background: var(--bg-card-hover);
        }

        .kb-data-table td {
          padding: 1rem 1rem;
          vertical-align: middle;
        }

        .kb-doc-title-cell {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .kb-doc-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .kb-doc-title {
          display: block;
          font-weight: 700;
          color: var(--text-primary);
          font-size: 0.92rem;
        }

        .kb-doc-filename {
          display: block;
          font-size: 0.76rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-top: 0.1rem;
        }

        .kb-doc-error-tag {
          font-size: 0.72rem;
          color: #ef4444;
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .kb-cohort-tags {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .kb-dept-pill {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .kb-prog-pill {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        .kb-volume-cell {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .kb-pages-count {
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        .kb-chunks-count {
          font-size: 0.82rem;
          color: var(--accent-primary);
        }

        .kb-date-cell {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .kb-actions-cell {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .kb-action-btn {
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid var(--border-color);
          background: var(--bg-stat);
          color: var(--text-primary);
          transition: all 0.2s ease;
        }

        .kb-action-btn.view:hover {
          background: rgba(99, 102, 241, 0.12);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .kb-action-btn.delete {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.25);
        }

        .kb-action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.12);
          border-color: #ef4444;
        }

        /* Status Badges */
        .kb-v2-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.3rem 0.75rem;
          border-radius: 9999px;
          letter-spacing: 0.02em;
        }

        .kb-v2-badge-ready {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .kb-v2-badge-processing {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .kb-v2-badge-uploaded {
          background: rgba(99, 102, 241, 0.12);
          color: #6366f1;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .kb-v2-badge-failed {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .kb-v2-badge-archived {
          background: rgba(148, 163, 184, 0.12);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .kb-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .kb-spinner-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 1s infinite alternate;
        }

        @keyframes pulse {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.1); }
        }

        /* Empty & Loading States */
        .kb-loading-state, .kb-empty-state {
          padding: 3.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .kb-pulse-loader {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(99, 102, 241, 0.2);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .kb-empty-icon {
          font-size: 2.8rem;
          margin-bottom: 0.25rem;
        }

        .kb-empty-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .kb-empty-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          max-width: 400px;
        }
      `}</style>
    </div>
  );
}
