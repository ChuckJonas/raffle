import { useState } from 'react';
import type { Entry } from '../App';
import './EntryManager.css';

interface EntryManagerProps {
  entries: Entry[];
  onAddEntry: (name: string) => void;
  onAddBulkEntries: (text: string) => void;
  onRemoveEntry: (id: string) => void;
  disabled: boolean;
}

export function EntryManager({ 
  entries, 
  onAddEntry, 
  onAddBulkEntries, 
  onRemoveEntry,
  disabled 
}: EntryManagerProps) {
  const [singleEntry, setSingleEntry] = useState('');
  const [bulkEntry, setBulkEntry] = useState('');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (singleEntry.trim()) {
      onAddEntry(singleEntry);
      setSingleEntry('');
    }
  };

  const handleAddBulk = () => {
    if (bulkEntry.trim()) {
      onAddBulkEntries(bulkEntry);
      setBulkEntry('');
    }
  };

  return (
    <div className="entry-manager">
      <div className="mode-toggle">
        <button 
          className={`toggle-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => setMode('single')}
          disabled={disabled}
        >
          ➕ Add One
        </button>
        <button 
          className={`toggle-btn ${mode === 'bulk' ? 'active' : ''}`}
          onClick={() => setMode('bulk')}
          disabled={disabled}
        >
          📋 Bulk Import
        </button>
      </div>

      {mode === 'single' ? (
        <form onSubmit={handleAddSingle} className="single-form">
          <input
            type="text"
            value={singleEntry}
            onChange={(e) => setSingleEntry(e.target.value)}
            placeholder="Enter a name..."
            disabled={disabled}
            className="entry-input"
          />
          <button 
            type="submit" 
            disabled={disabled || !singleEntry.trim()}
            className="btn btn-add"
          >
            Add
          </button>
        </form>
      ) : (
        <div className="bulk-form">
          <textarea
            value={bulkEntry}
            onChange={(e) => setBulkEntry(e.target.value)}
            placeholder="Paste names here (one per line)..."
            disabled={disabled}
            className="bulk-textarea"
            rows={6}
          />
          <button 
            onClick={handleAddBulk}
            disabled={disabled || !bulkEntry.trim()}
            className="btn btn-add"
          >
            Import All
          </button>
        </div>
      )}

      <div className="entries-list">
        <h3>📝 Current Entries ({entries.length})</h3>
        {entries.length === 0 ? (
          <p className="no-entries">No entries yet. Add some names above!</p>
        ) : (
          <ul className="entry-items">
            {entries.map((entry) => (
              <li key={entry.id} className="entry-item">
                <span className="entry-name">{entry.name}</span>
                <button 
                  onClick={() => onRemoveEntry(entry.id)}
                  disabled={disabled}
                  className="remove-btn"
                  title="Remove this entry"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

