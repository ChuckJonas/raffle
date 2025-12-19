import type { Entry } from '../App';
import './Modal.css';

interface WinnerModalProps {
  winner: Entry;
  entryCount: number;
  onKeep: () => void;
  onRemoveOne: () => void;
  onRemoveAll: () => void;
}

export function WinnerModal({ 
  winner, 
  entryCount, 
  onKeep, 
  onRemoveOne, 
  onRemoveAll 
}: WinnerModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content winner-modal">
        <div className="winner-header">
          <div className="trophy-icon">🏆</div>
          <h2>WE HAVE A WINNER!</h2>
        </div>
        
        <div className="winner-name-display">
          {winner.name}
        </div>
        
        <p className="entry-info">
          This person had <strong>{entryCount}</strong> {entryCount === 1 ? 'entry' : 'entries'}
        </p>
        
        <div className="winner-actions">
          <button className="btn btn-keep" onClick={onKeep}>
            ✅ Keep Entry
            <span className="btn-hint">Leave all entries intact</span>
          </button>
          
          <button className="btn btn-remove-one" onClick={onRemoveOne}>
            ➖ Remove This Entry
            <span className="btn-hint">Remove just the winning entry</span>
          </button>
          
          <button className="btn btn-remove-all" onClick={onRemoveAll}>
            🗑️ Remove All Entries
            <span className="btn-hint">Remove all {entryCount} entries for {winner.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

