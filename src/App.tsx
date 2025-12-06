import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AddEntryForm from './AddEntryForm';
import { apiService } from './api';
import './App.css';
import DataTable from './DataTable';

interface TableEntry {
  id: string;
  title: string;
  text: string;
  problem: string;
  solution: string;
  metadata?: {
    abuseipdb_ip_score?: string;
    code_snippet?: string;
    incident_type?: string;
    ioc_type?: string;
    problem?: string;
    source?: string;
    threat_level?: string;
    title?: string;
    vt_hash_reputation?: string;
  };
  notes?: Array<{ title: string; content: string; kind?: string; tags?: string[] }>;
}

function App() {
  const [entries, setEntries] = useState<TableEntry[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  // Insight modal state
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [insightProblem, setInsightProblem] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightAnswer, setInsightAnswer] = useState<string | null>(null);
  const [insightHitsCount, setInsightHitsCount] = useState<number>(0);

  useEffect(() => {
    setLoading(true);
    apiService.searchDetailed("")
      .then((data) => {
        const hits = data.hits ?? [];
        const tableEntries = hits
          .filter(hit => hit.metadata?.source === 'entry')
          .map(hit => {
            const { titleFromText, problem, solution } = extractFieldsFromText(hit.text);
            const relatedNotes = (hit.metadata as any)?.related_notes ?? [];
            const notes = Array.isArray(relatedNotes)
              ? relatedNotes.map((n: any) => ({
                title: n?.title ?? 'Note',
                content: n?.text ?? '',            // include note text as content
                kind: n?.kind,
                tags: Array.isArray(n?.tags) ? n.tags : [],
                created_at: n?.created_at
              }))
              : [];
            return {
              id: hit.id,
              title: hit.metadata?.title ?? titleFromText ?? 'Untitled',
              text: hit.text,
              problem,
              solution,
              metadata: hit.metadata,
              notes
            } as TableEntry;
          });
        setEntries(tableEntries);
        setLoading(false);
      })
      .catch(error => {
        setError((error?.message ?? 'Failed to load data'));
        setLoading(false);
      });
  }, []);

  // Fuse.js configuration for fuzzy search
  const fuse = useMemo(() => {
    const options = {
      keys: ['title', 'text'],
      threshold: 0.4,
      minMatchCharLength: 2,
      includeScore: true,
    };
    return new Fuse(entries, options);
  }, [entries]);

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries;
    }
    const searchResult = fuse.search(searchQuery);
    return searchResult.map(result => result.item);
  }, [entries, fuse, searchQuery]);

  // Check if search has no results
  const hasNoSearchResults = searchQuery.trim() !== '' && filteredEntries.length === 0;

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await apiService.searchDetailed("");
      const hits = data.hits ?? [];
      const tableEntries = hits
        .filter(hit => hit.metadata?.source === 'entry')
        .map(hit => {
          const { titleFromText, problem, solution } = extractFieldsFromText(hit.text);
          const relatedNotes = (hit.metadata as any)?.related_notes ?? [];
          const notes = Array.isArray(relatedNotes)
            ? relatedNotes.map((n: any) => ({
              title: n?.title ?? 'Note',
              content: n?.text ?? '',
              kind: n?.kind,
              tags: Array.isArray(n?.tags) ? n.tags : [],
              created_at: n?.created_at
            }))
            : [];
          return {
            id: hit.id,
            title: hit.metadata?.title ?? titleFromText ?? 'Untitled',
            text: hit.text,
            problem,
            solution,
            metadata: hit.metadata,
            notes
          } as TableEntry;
        });
      setEntries(tableEntries);
      setError(null);
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    apiService.clearEntries().then(() => {
      setEntries([]);
      setError(null);
    })
  };

  const handleInsight = () => {
    setInsightAnswer(null);
    setInsightProblem('');
    setShowInsightModal(true);
  };

  const submitInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    setInsightLoading(true);
    try {
      const res = await apiService.generateInsight(insightProblem.trim());
      setInsightAnswer(res.answer ?? null);
      setInsightHitsCount(res.hitsCount ?? 0);
    } catch {
      setInsightAnswer('No answer available.');
      setInsightHitsCount(0);
    } finally {
      setInsightLoading(false);
    }
  };

  // Improved formatting: cards, bullets, and code blocks
  const renderInsightSections = (answer?: string | null) => {
    if (!answer) return null;
    const lines = answer.split('\n').map(l => l.trim());
    const labels = new Set([
      'Problem Addressed',
      'Code Snippet',
      'Cybersecurity Context',
      'Tradeoffs',
      'Other Considerations',
      'General References'
    ]);
    const sections: Array<{ label: string; content: string[] }> = [];
    let current: { label: string; content: string[] } | null = null;

    for (const line of lines) {
      if (!line) continue;
      const normalized = line.replace(/:$/, '');
      if (labels.has(normalized)) {
        if (current) sections.push(current);
        current = { label: normalized, content: [] };
      } else if (current) {
        current.content.push(line);
      }
    }
    if (current) sections.push(current);

    const renderContent = (content: string[], label: string) => {
      const isCode = /code snippet/i.test(label);
      const hasBullets = content.some(c => c.startsWith('- '));

      if (isCode) {
        return (
          <pre style={{
            margin: '0.5rem 0 0',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '0.75rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }}>
            {content.join('\n')}
          </pre>
        );
      }

      if (hasBullets) {
        const items = content
          .flatMap(line => line.startsWith('- ') ? [line.slice(2)] : [line])
          .filter(Boolean);
        return (
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', color: '#475569' }}>
            {items.map((item, idx) => (
              <li key={idx} style={{ whiteSpace: 'pre-wrap' }}>{item}</li>
            ))}
          </ul>
        );
      }

      return (
        <div style={{ marginTop: '0.5rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
          {content.join('\n')}
        </div>
      );
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
        {sections.map((sec, idx) => (
          <div
            key={idx}
            style={{
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '0.875rem 1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ color: '#334155', fontSize: '1rem' }}>{sec.label}</strong>
            </div>
            {renderContent(sec.content, sec.label)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>BrainCache</h1>
        <p>Transform experiences into productivity</p>
        <div className="header-controls">
          <button onClick={handleRefresh} disabled={loading} className="control-btn secondary">
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
          <button onClick={handleClearAll} className="control-btn danger">
            🗑️ Clear All
          </button>
          <button onClick={handleInsight} className="control-btn">
            🧠 Generate Insight
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {error && (
            <div className="alert error">
              {error}
              <button onClick={() => setError(null)} className="alert-close">×</button>
            </div>
          )}

          <div className="main-content">
            {/* Left column: Search and Results */}
            <div className="left-column">
              <div className="search-section">
                <div className="search-header">
                  <h2>Search Entries</h2>
                  <p className="search-subtitle">
                    Fuzzy search across all titles and content
                  </p>
                </div>

                <div className="search-container">
                  <div className="search-icon">
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Type to search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="search-clear"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="search-info">
                  <p>
                    <strong>Pro tip:</strong> Try searching with typos (e.g., "trafffic")
                    or partial words (e.g., "out" for "outbound").
                  </p>
                </div>

                {/* Search Results Section */}
                <div className="search-results-section">
                  <div className="results-header">
                    <h3>
                      {searchQuery ? (
                        <>
                          Search Results <span className="results-count">({filteredEntries.length} found)</span>
                        </>
                      ) : (
                        "All Entries"
                      )}
                    </h3>
                  </div>

                  {hasNoSearchResults ? (
                    <div className="no-results-message">
                      <div className="no-results-icon">🔍</div>
                      <h4>No entries found</h4>
                      <p>Try a different query or add a new entry</p>
                    </div>
                  ) : (
                    <DataTable data={filteredEntries} onDelete={handleDeleteEntry} />
                  )}
                </div>
              </div>
            </div>

            {/* Right column: Add New Entry Form */}
            <div className="right-column">
              {/* Trigger button for AddEntryForm modal */}
              <div className="stats-section">
                <h3>📊 Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{entries.length}</div>
                    <div className="stat-label">Total Entries</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{filteredEntries.length}</div>
                    <div className="stat-label">Showing</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {searchQuery ? "🔍" : "✅"}
                    </div>
                    <div className="stat-label">
                      {searchQuery ? "Searching" : "All Visible"}
                    </div>
                  </div>
                </div>

                <div className="quick-actions" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="action-btn secondary"
                    onClick={() => setShowAddModal(true)}
                    aria-label="Open add entry form"
                  >
                    + Add Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AddEntryForm Modal */}
        {showAddModal && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setShowAddModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              overflow: 'auto' // allow overlay to scroll if content exceeds viewport
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: 16,
                maxWidth: 900,
                width: '92%',
                maxHeight: '90vh',     // constrain dialog height
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  flexShrink: 0
                }}
              >
                <h2 className="table-title" style={{ margin: 0 }}>Create New Experience</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  aria-label="Close"
                  className="action-btn secondary small"
                  style={{ border: 'none' }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  padding: '1.5rem',
                  overflowY: 'auto',   // scroll inside the dialog
                  minHeight: 0         // allow flexbox to size correctly
                }}
              >
                {/* Render the ingest form */}
                <AddEntryForm />
              </div>
            </div>
          </div>
        )}

        {/* Insight Modal */}
        {showInsightModal && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setShowInsightModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              overflow: 'auto'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: 16,
                maxWidth: 900,
                width: '92%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  flexShrink: 0
                }}
              >
                <h2 className="table-title" style={{ margin: 0 }}>Generate Insight</h2>
                <button
                  onClick={() => setShowInsightModal(false)}
                  aria-label="Close"
                  className="action-btn secondary small"
                  style={{ border: 'none' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '1.5rem', overflowY: 'auto', minHeight: 0 }}>
                {!insightAnswer && (
                  <form onSubmit={submitInsight} className="input-form" style={{ marginTop: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Describe the problem *</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        value={insightProblem}
                        onChange={e => setInsightProblem(e.target.value)}
                        required
                        placeholder="e.g., Firewall logs show repeated connections to known bad IP and domain..."
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="submit-btn" disabled={insightLoading}>
                        {insightLoading ? 'Generating…' : 'Generate'}
                      </button>
                      <button
                        type="button"
                        className="clear-btn"
                        onClick={() => { setInsightProblem(''); setInsightAnswer(null); }}
                        disabled={insightLoading}
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                )}

                {insightAnswer && (
                  <>
                    {/* Small statistic for related problems */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ background: '#f1f5f9', border: '1px solid #e5e7eb', borderRadius: 20, padding: '0.25rem 0.75rem', color: '#475569', fontSize: '0.9rem' }}>
                        Related problems: <strong>{insightHitsCount}</strong>
                      </span>
                    </div>

                    {/* No results view when no related hits */}
                    {insightHitsCount === 0 ? (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          background: '#f8fafc',
                          border: '1px solid #e5e7eb',
                          borderRadius: 12,
                          padding: '1rem',
                          textAlign: 'center',
                          color: '#475569'
                        }}
                      >
                        <div style={{ fontSize: '2rem' }}>🔍</div>
                        <h4 style={{ margin: '0.5rem 0 0', color: '#334155' }}>No related problems found</h4>
                        <p style={{ margin: '0.25rem 0 0' }}>
                          Try rephrasing the problem or providing more detail.
                        </p>
                      </div>
                    ) : (
                      <div style={{ marginTop: '0.5rem' }}>
                        {renderInsightSections(insightAnswer)}
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="action-btn secondary small"
                        onClick={() => { setInsightAnswer(null); setInsightProblem(''); setInsightHitsCount(0); }}
                      >
                        New Insight
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function extractFieldsFromText(text: string) {
  const src = text.replace(/\r/g, ''); // normalize CRLF
  const lower = src.toLowerCase();

  const idxTitle = lower.indexOf('title:');
  const idxProblem = lower.indexOf('problem:');
  const idxSolution = lower.indexOf('solution:');
  const idxCode = lower.indexOf('code:'); // optional trailing section

  const endFor = (startIdx: number) => {
    const candidates = [idxTitle, idxProblem, idxSolution, idxCode]
      .filter(i => i !== -1 && i > startIdx);
    return candidates.length ? Math.min(...candidates) : src.length;
  };

  const sliceAfterLabel = (startIdx: number, label: string) => {
    if (startIdx === -1) return '';
    // position right after "Label:"
    const contentStart = startIdx + label.length + 1; // +1 for colon
    const raw = src.slice(contentStart, endFor(startIdx));
    return raw
      .replace(/^\s+|\s+$/g, '')        // trim
      .replace(/\n{2,}/g, '\n')         // collapse blank lines
      .replace(/^\-\s*$/gm, '')         // drop lone dashes
      .trim();
  };

  const titleFromText = sliceAfterLabel(idxTitle, 'Title');
  const problem = sliceAfterLabel(idxProblem, 'Problem');
  const solution = sliceAfterLabel(idxSolution, 'Solution');

  return {
    titleFromText: titleFromText || undefined,
    problem,
    solution
  };
}

export default App;