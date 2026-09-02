'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: string;
  missingContext?: string[];
  timestamp: Date;
}

interface QueryContext {
  department?: string;
  semester?: number;
  subject?: string;
  rollNumber?: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to **EduPilot**! I am your AI academic companion. You can ask me about course credits, syllabus details, upcoming exams, assignment deadlines, or university regulations.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [queryContext, setQueryContext] = useState<QueryContext>({});
  const [error, setError] = useState<string | null>(null);

  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Scroll only the internal message container, never the entire page/window
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setError(null);

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        message: messageText,
        conversationId: conversationId || undefined,
        queryContext: Object.keys(queryContext).length > 0 ? queryContext : undefined,
      };

      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to get response from server');
      }

      const { data } = json;
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Update local query context if entities were extracted
      if (data.queryAnalysis?.entities) {
        const ent = data.queryAnalysis.entities;
        setQueryContext((prev) => ({
          ...prev,
          department: ent.department || prev.department,
          semester: ent.semester !== undefined ? ent.semester : prev.semester,
          subject: ent.subject || prev.subject,
        }));
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.response || 'I processed your request.',
        status: data.status,
        missingContext: data.missingContext,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : 'Network error';
      setError(errStr);
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Sorry, I encountered an issue: ${errStr}. Please ensure the backend server is running.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestionPrompts = [
    'What is DBMS?',
    'How many credits does DBMS have?',
    'When is the DBMS exam for CSE semester 5?',
    'When is my next exam?',
  ];

  return (
    <div className="chat-container card">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-bot-avatar">🤖</div>
          <div className="chat-header-text">
            <span className="chat-title">EduPilot Assistant</span>
            <div className="chat-online-badge">
              <span className="chat-status-dot online"></span>
              <span className="chat-status-label">Active • Ready for Queries</span>
            </div>
          </div>
        </div>
        {queryContext.department && (
          <div className="chat-context-badge">
            Cohort: {queryContext.department} {queryContext.semester ? `Sem ${queryContext.semester}` : ''}
          </div>
        )}
      </div>

      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? '🤖' : '🎓'}
            </div>
            <div className="message-bubble">
              <div className="message-content" style={{ whiteSpace: 'pre-line' }}>
                {msg.content}
              </div>
              {msg.status === 'needs_context' && (
                <div className="message-clarification-tag">
                  ℹ️ Additional cohort information needed
                </div>
              )}
              {msg.status === 'retrieval_unavailable' && (
                <div className="message-future-tag">
                  📚 Knowledge Search Triggered
                </div>
              )}
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-bubble loading">
              <span className="loading-dots">Synthesizing authoritative response...</span>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 2 && (
        <div className="chat-suggestions">
          <span className="suggestions-label">⚡ Frequently Asked by Students:</span>
          <div className="suggestions-list">
            {suggestionPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
              >
                <span>{prompt}</span>
                <span className="chip-arrow">↗</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="chat-error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="chat-input-row">
        <input
          type="text"
          className="form-input chat-input"
          placeholder="Ask about DBMS syllabus, exam shifts, attendance rules..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="btn-primary chat-send-btn"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          title="Send Query"
        >
          {isLoading ? (
            <span className="send-spinner" />
          ) : (
            <span>Send →</span>
          )}
        </button>
      </div>
    </div>
  );
}
