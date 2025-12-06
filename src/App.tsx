import { useState, useEffect, useMemo } from 'react';
import InputForm from './InputForm';
import DataTable from './DataTable';
import { apiService } from './api';
import type { ApiEntry } from './api';
import Fuse from 'fuse.js';
import './App.css';
import { Search } from 'lucide-react';

interface TableEntry {
  id: number;
  title: string;
  text: string;
  date: string;
}

function App() {
  const [entries, setEntries] = useState<TableEntry[]>([
    {
      id: 1,
      title: "React Introduction",
      text: "React is a declarative, efficient, and flexible JavaScript library for building user interfaces.",
      date: "Jan 15, 2024"
    },
    {
      id: 2,
      title: "Vite Overview",
      text: "Vite is a build tool that provides a faster and leaner development experience for modern web projects.",
      date: "Jan 20, 2024"
    },
    {
      id: 3,
      title: "TypeScript Benefits",
      text: "TypeScript adds static typing to JavaScript, which helps catch errors early and improves code quality.",
      date: "Jan 25, 2024"
    },
    {
      id: 4,
      title: "CSS Flexbox Guide",
      text: "Flexbox is a CSS layout module that makes it easier to design flexible and responsive layouts.",
      date: "Feb 1, 2024"
    },
    {
      id: 5,
      title: "JavaScript ES6 Features",
      text: "ES6 introduced many new features like arrow functions, template literals, and destructuring.",
      date: "Feb 5, 2024"
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleAddEntry = (newEntry: Omit<TableEntry, 'date'>) => {
    const entryWithDate = {
      ...newEntry,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    };
    setEntries(prev => [entryWithDate, ...prev]);
  };

  const handleDeleteEntry = (id: number) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleAddRandom = async () => {
    try {
      const randomEntry = await apiService.getRandomEntry();
      const newEntry = {
        id: Date.now(),
        title: randomEntry.title,
        text: randomEntry.content,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      };
      setEntries(prev => [newEntry, ...prev]);
    } catch (error) {
      setError('Failed to add random entry');
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const apiData = await apiService.getEntries();
      const tableEntries = apiData.map(apiEntry => ({
        id: apiEntry.id,
        title: apiEntry.title,
        text: apiEntry.content,
        date: new Date(apiEntry.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      }));
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
        <h1>📝 Text & Title Table Manager</h1>
        <p>Create, manage, and display text entries in a beautiful table</p>
        <div className="header-controls">
          <button onClick={handleAddRandom} className="control-btn primary">
            ➕ Add Random Entry
          </button>
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
                
                <div className="quick-actions">
                  <h4>Quick Actions</h4>
                  <button 
                    onClick={handleAddRandom}
                    className="action-btn small"
                  >
                    ➕ Add Random
                  </button>
                  <button 
                    onClick={handleRefresh}
                    disabled={loading}
                    className="action-btn small secondary"
                  >
                    {loading ? '⏳' : '🔄'} Refresh
                  </button>
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

export default App;