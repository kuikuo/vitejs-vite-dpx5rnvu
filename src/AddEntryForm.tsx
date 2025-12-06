import { useState } from 'react';
import { apiService, type IngestNote, type IngestPayload } from './api';
import './InputForm.css';

// Extend note locally to hold a raw tagsText while editing
type EditableNote = IngestNote & { tagsText?: string; __invalid?: boolean };

export default function AddEntryForm() {
    const [title, setTitle] = useState('');
    const [problem, setProblem] = useState('');
    const [solution, setSolution] = useState('');
    const [iocType, setIocType] = useState('url');
    const [threatLevel, setThreatLevel] = useState('high');
    const [incidentType, setIncidentType] = useState('malware');
    const [codeSnippet, setCodeSnippet] = useState('');
    const [notes, setNotes] = useState<EditableNote[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const addNote = () => {
        setNotes(prev => [...prev, { title: '', content: '', kind: 'ADR', tags: [], tagsText: '' }]);
    };

    const updateNote = (idx: number, patch: Partial<EditableNote>) => {
        setNotes(prev => prev.map((n, i) => (i === idx ? { ...n, ...patch } : n)));
    };

    const removeNote = (idx: number) => {
        setNotes(prev => prev.filter((_, i) => i !== idx));
    };

    const handleTagsChange = (idx: number, raw: string) => {
        // Keep raw text so typing commas is possible
        updateNote(idx, { tagsText: raw });
    };

    const handleTagsBlur = (idx: number) => {
        // Parse raw text into tags when leaving the field
        setNotes(prev => prev.map((n, i) => {
            if (i !== idx) return n;
            const parsed = (n.tagsText ?? '')
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);
            return { ...n, tags: parsed };
        }));
    };

    const toPayloadNotes = (ns: EditableNote[]): IngestNote[] =>
        ns.map(n => ({
            title: n.title.trim(),
            content: n.content.trim(),
            kind: n.kind.trim(),
            tags: (n.tags.length ? n.tags : (n.tagsText ?? '')
                .split(',')
                .map(t => t.trim())
                .filter(Boolean))
        }));

    const validateNotes = (ns: EditableNote[]) => {
        const normalized = ns.map(n => {
            const title = n.title.trim();
            const content = n.content.trim();
            const tags = (n.tags.length ? n.tags : (n.tagsText ?? '')
                .split(',')
                .map(t => t.trim())
                .filter(Boolean));
            const invalid = !title || !content || tags.length === 0;
            return { ...n, __invalid: invalid };
        });
        setNotes(normalized);
        const anyInvalid = normalized.some(n => n.__invalid);
        return !anyInvalid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);

        // Validate notes before building payload
        if (!validateNotes(notes)) {
            setStatus('❌ Please complete all notes: Title, Content, and at least one Tag.');
            setSubmitting(false);
            return;
        }

        const payload: IngestPayload = {
            title: title.trim(),
            problem: problem.trim(),
            solution: solution.trim(),
            source: 'entry',
            ioc_type: iocType.trim().toLowerCase(),
            threat_level: threatLevel.trim().toLowerCase(),
            incident_type: incidentType.trim().toLowerCase(),
            code_snippet: codeSnippet,
            notes: toPayloadNotes(notes)
        };

        try {
            const res = await apiService.addEntry(payload);
            setStatus(res.ok ? '✅ New Entry Added.' : `❌ Failed (${res.status}).`);
            if (res.ok) {
                setTitle(''); setProblem(''); setSolution('');
                setIocType('url'); setThreatLevel('high'); setIncidentType('malware');
                setCodeSnippet(''); setNotes([]);
            }
        } catch {
            setStatus('❌ Request error.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="input-form" style={{ marginTop: '1rem' }}>

            <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            <div className="form-group">
                <label className="form-label">Problem *</label>
                <textarea className="form-textarea" rows={3} value={problem} onChange={e => setProblem(e.target.value)} required />
            </div>

            <div className="form-group">
                <label className="form-label">Solution *</label>
                <textarea className="form-textarea" rows={3} value={solution} onChange={e => setSolution(e.target.value)} required />
            </div>

            <div className="form-group">
                <label className="form-label">Code Snippet</label>
                <textarea className="form-textarea" rows={4} value={codeSnippet} onChange={e => setCodeSnippet(e.target.value)} />
            </div>

            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div>
                    <label className="form-label">IOC Type *</label>
                    <select className="form-input" value={iocType} onChange={e => setIocType(e.target.value)} required>
                        <option value="url">URL</option>
                        <option value="ip">IP</option>
                        <option value="domain">Domain</option>
                        <option value="hash">Hash</option>
                        <option value="registry">Registry</option>
                        <option value="filename">Filename</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Threat Level *</label>
                    <select className="form-input" value={threatLevel} onChange={e => setThreatLevel(e.target.value)} required>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Incident Type *</label>
                    <select className="form-input" value={incidentType} onChange={e => setIncidentType(e.target.value)} required>
                        <option value="malware">Malware</option>
                        <option value="phishing">Phishing</option>
                        <option value="misconfiguration">Misconfiguration</option>
                        <option value="vulnerability">Vulnerability</option>
                        <option value="unauthorized-access">Unauthorized Access</option>
                    </select>
                </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Notes</label>
                    <button type="button" className="action-btn secondary small" onClick={addNote}>+ Add Note</button>
                </div>
                {notes.map((note, idx) => (
                    <div
                        key={idx}
                        style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            padding: '0.75rem',
                            marginTop: '0.5rem',
                            background: note.__invalid ? '#fff1f2' : '#f8fafc' // red-ish for invalid
                        }}
                    >
                        {/* Inline hint for invalid note */}
                        {note.__invalid && (
                            <div
                                style={{
                                    background: '#fee2e2',
                                    border: '1px solid #fecaca',
                                    color: '#b91c1c',
                                    borderRadius: 6,
                                    padding: '0.25rem 0.5rem',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Please fill Title, Content, and Tags.
                            </div>
                        )}

                        <input
                            className="form-input"
                            placeholder="Note title"
                            value={note.title}
                            onChange={e => updateNote(idx, { title: e.target.value, __invalid: false })}
                        />

                        {/* note_kind dropdown */}
                        <div style={{ marginTop: '0.5rem' }}>
                            <label className="form-label" style={{ marginBottom: '0.25rem' }}>Note Kind</label>
                            <select
                                className="form-input"
                                value={note.kind}
                                onChange={e => updateNote(idx, { kind: e.target.value })}
                            >
                                <option value="ADR">ADR (Architecture Decision Record)</option>
                                <option value="lesson">Lesson</option>
                                <option value="context">Context</option>
                                <option value="ioc">IOC</option>
                                <option value="procedure">Procedure</option>
                                <option value="analysis">Analysis</option>
                                <option value="hypothesis">Hypothesis</option>
                                <option value="reference">Reference</option>
                                <option value="incident">Incident</option>
                            </select>
                        </div>

                        <textarea
                            className="form-textarea"
                            rows={3}
                            placeholder="Note content"
                            value={note.content}
                            onChange={e => updateNote(idx, { content: e.target.value, __invalid: false })}
                            style={{ marginTop: '0.5rem' }}
                        />

                        <input
                            className="form-input"
                            placeholder="Tags (comma-separated)"
                            value={note.tagsText ?? note.tags.join(', ')}
                            onChange={e => handleTagsChange(idx, e.target.value)}
                            onBlur={() => {
                                handleTagsBlur(idx);
                                updateNote(idx, { __invalid: false });
                            }}
                            style={{ marginTop: '0.5rem' }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="button" className="action-btn secondary small" onClick={() => removeNote(idx)}>Remove</button>
                        </div>
                    </div>
                ))}
            </div>

            {status && (
                <div className="alert" style={{ background: '#f1f5f9', border: '1px solid #e5e7eb', color: '#334155', marginTop: '0.75rem' }}>
                    {status}
                </div>
            )}

            <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit'}
                </button>
                <button
                    type="button"
                    className="clear-btn"
                    onClick={() => {
                        setTitle(''); setProblem(''); setSolution('');
                        setIocType('url'); setThreatLevel('high'); setIncidentType('malware');
                        setCodeSnippet(''); setNotes([]); setStatus(null);
                    }}
                    disabled={submitting}
                >
                    Clear
                </button>
            </div>
        </form>
    );
}
