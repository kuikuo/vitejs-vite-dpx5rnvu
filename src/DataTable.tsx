import { useState } from 'react';
import './DataTable.css';
import { apiService } from './api';

type EntryMetadata = {
  abuseipdb_ip_score?: string;
  code_snippet?: string;
  incident_type?: string;
  ioc_type?: string;
  problem?: string; // duplicate, will be excluded
  source?: string;  // excluded
  threat_level?: string;
  title?: string;   // duplicate, will be excluded
  vt_hash_reputation?: string;
};

interface DataTableProps {
  data: Array<{
    id: string;
    title: string;
    text: string;
    problem: string;
    solution: string;
    metadata?: EntryMetadata;
    notes?: Array<{ title: string; content: string; kind?: string; tags?: string[] }>; // removed created_at
  }>;
  onDelete: (id: string) => void; // was: (id: string) => null
}

export default function DataTable({ data, onDelete }: DataTableProps) {
  const [selected, setSelected] = useState<null | DataTableProps['data'][number]>(null);

  const closeModal = () => setSelected(null);

  const formatLabel = (key: string) =>
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

  const orderedKeys = [
    'threat_level',
    'incident_type',
    'ioc_type',
    'abuseipdb_ip_score',
    'vt_hash_reputation',
    'code_snippet',
  ];

  const toBulletItems = (value: unknown) =>
    String(value)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.replace(/\b\w/g, c => c.toUpperCase())); // capitalize words

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📄</div>
        <h3 className="empty-title">No entries yet</h3>
        <p className="empty-text">
          Start by adding entries using the form above or load sample data from the API.
        </p>
      </div>
    );
  }

  return (
    <div className="table-container-wrapper">
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Your Entries</h2>
          <div className="table-summary">
            <span className="count-badge">{data.length}</span>
            <span>entr{data.length === 1 ? 'y' : 'ies'} in table</span>
          </div>
        </div>

        {/* Scrollable table area */}
        <div className="table-scroll-area">
          <table className="data-table">
            <thead>
              <tr>
                <th className="column-title">Title</th>
                <th className="column-content">Problem</th>
                <th className="column-content">Solution</th>
                <th className="column-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr
                  key={entry.id}
                  className="table-row"
                  onClick={() => setSelected(entry)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="cell-title">
                    <div className="title-content">{entry.title}</div>
                  </td>
                  <td className="cell-content">
                    <div className="content-text">{entry.problem || '—'}</div>
                  </td>
                  <td className="cell-content">
                    <div className="content-text">{entry.solution || '—'}</div>
                  </td>
                  <td className="cell-actions">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await apiService.deleteEntry(entry.id);
                        if (res.ok) {
                          onDelete(entry.id);
                        } else {
                          // optional minimal feedback
                          console.error('Delete failed', res.status);
                          alert('Failed to delete entry.');
                        }
                      }}
                      className="delete-btn"
                      title="Delete this entry"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div
            role="dialog"
            aria-modal="true"
            className="modal-overlay"
            onClick={closeModal}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: 16,
                maxWidth: 900,
                width: '92%',
                padding: '1.5rem',
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <h2 className="table-title" style={{ margin: 0 }}>{selected.title}</h2>
                <button
                  onClick={closeModal}
                  aria-label="Close"
                  className="action-btn secondary small"
                  style={{ border: 'none' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Problem</h4>
                  <p className="content-text" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {selected.problem || '—'}
                  </p>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Solution</h4>
                  <p className="content-text" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {selected.solution || '—'}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              {selected.metadata && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#334155' }}>Metadata</h4>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '0.75rem'
                    }}
                  >
                    {orderedKeys
                      .filter(k => selected.metadata && k in selected.metadata!)
                      .map((key) => {
                        const value = (selected.metadata as Record<string, unknown>)[key];
                        if (!value) return null;

                        if (key === 'code_snippet') {
                          return (
                            <div key={key} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 10 }}>
                              <strong style={{ color: '#334155' }}>{formatLabel(key)}:</strong>
                              <pre
                                style={{
                                  margin: '0.5rem 0 0',
                                  background: '#fff',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 8,
                                  padding: '0.75rem',
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                  fontSize: '0.9rem',
                                  lineHeight: 1.5,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',   // break long tokens like registry paths/URLs
                                  overflowX: 'auto',         // allow horizontal scroll if still too long
                                  maxWidth: '100%'           // constrain to container width
                                }}
                              >
                                {String(value)}
                              </pre>
                            </div>
                          );
                        }

                        if (key === 'abuseipdb_ip_score' || key === 'vt_hash_reputation') {
                          const items = toBulletItems(value);
                          return (
                            <div key={key} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 10 }}>
                              <strong style={{ color: '#334155' }}>{formatLabel(key)}:</strong>
                              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', color: '#475569' }}>
                                {items.map((item, idx) => (
                                  <li key={idx} style={{ whiteSpace: 'pre-wrap' }}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        }

                        return (
                          <div key={key} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 10 }}>
                            <strong style={{ color: '#334155' }}>{formatLabel(key)}:</strong>{' '}
                            <span style={{ color: '#475569', whiteSpace: 'pre-wrap' }}>{String(value)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              {selected.notes && selected.notes.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#334155' }}>Notes</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                    {selected.notes.map((note, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e5e7eb',
                          borderRadius: 10,
                          padding: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <strong style={{ color: '#334155' }}>{note.title || 'Untitled Note'}</strong>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {note.kind && (
                              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{note.kind}</span>
                            )}
                          </div>
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                            {note.tags.map((t, i) => (
                              <span
                                key={i}
                                style={{
                                  background: '#eef2ff',
                                  color: '#4f46e5',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 999,
                                  padding: '0.125rem 0.5rem',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <p
                          className="content-text"
                          style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}
                        >
                          {note.content || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={closeModal} className="action-btn secondary small">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}