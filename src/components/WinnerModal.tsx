import { useMemo } from 'react';
import type { Entry } from '../App';
import './Modal.css';

interface WinnerModalProps {
  winner: Entry;
  entryCount: number;
  onKeep: () => void;
  onRemoveOne: () => void;
  onRemoveAll: () => void;
}

// Generate confetti pieces
function generateConfetti(count: number) {
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ff8c00', '#da70d6', '#00ff88'];
  const confetti = [];
  
  for (let i = 0; i < count; i++) {
    confetti.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      size: 8 + Math.random() * 8,
      type: Math.random() > 0.5 ? 'square' : 'circle',
    });
  }
  return confetti;
}

export function WinnerModal({ 
  winner, 
  entryCount, 
  onKeep, 
  onRemoveOne, 
  onRemoveAll 
}: WinnerModalProps) {
  const confetti = useMemo(() => generateConfetti(50), []);

  return (
    <div className="modal-overlay winner-celebration">
      {/* Confetti */}
      <div className="confetti-container">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className={`confetti-piece confetti-${piece.type}`}
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              backgroundColor: piece.color,
              width: piece.size,
              height: piece.type === 'square' ? piece.size : piece.size,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
      </div>
      
      {/* Disco lights */}
      <div className="disco-lights">
        <div className="disco-light disco-light-1"></div>
        <div className="disco-light disco-light-2"></div>
        <div className="disco-light disco-light-3"></div>
      </div>

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
          
          {entryCount > 1 && (
            <button className="btn btn-remove-all" onClick={onRemoveAll}>
              🗑️ Remove All Entries
              <span className="btn-hint">Remove all {entryCount} entries for {winner.name}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

