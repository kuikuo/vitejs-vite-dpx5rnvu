import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import DataTable from './DataTable';
import InputForm from './InputForm';
import { apiService } from './api';

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
}

function App() {
  const [entries, setEntries] = useState<TableEntry[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    apiService.searchDetailed("")
      .then((data) => {
        const tableEntries = (data.hits ?? []).map(hit => {
          const { titleFromText, problem, solution } = extractFieldsFromText(hit.text);
          return {
            id: hit.id,
            title: hit.metadata?.title ?? titleFromText ?? 'Untitled',
            text: hit.text,
            problem,
            solution,
            metadata: hit.metadata // include metadata for modal
          };
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

  const handleAddEntry = (newEntry: Omit<TableEntry, 'problem' | 'solution'>) => {
    const { titleFromText, problem, solution } = extractFieldsFromText(newEntry.text);
    const entryWithDerived = {
      ...newEntry,
      title: newEntry.title || titleFromText || 'Untitled',
      problem,
      solution
    };
    setEntries(prev => [entryWithDerived, ...prev]);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await apiService.searchDetailed("");
      const tableEntries = (data.hits ?? []).map(hit => {
        const { titleFromText, problem, solution } = extractFieldsFromText(hit.text);
        return {
          id: hit.id,
          title: hit.metadata?.title ?? titleFromText ?? 'Untitled',
          text: hit.text,
          problem,
          solution,
          metadata: hit.metadata // include metadata
        };
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
    setEntries([]);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>BrainCache</h1>
        <p>Create, manage, and display previous problems & their solutions</p>
        <div className="header-controls">
          <button onClick={handleRefresh} disabled={loading} className="control-btn secondary">
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
          <button onClick={handleClearAll} className="control-btn danger">
            🗑️ Clear All
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
                    <strong>Pro tip:</strong> Try searching with typos (e.g., "reacct")
                    or partial words (e.g., "script" for "TypeScript").
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
              <InputForm onAddEntry={handleAddEntry} />

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
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Built with React + Vite + TypeScript • {entries.length} entries stored •
          {searchQuery ? ` Searching for "${searchQuery}"` : ' All entries visible'}
        </p>
      </footer>
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