import { useState, useCallback } from 'react';
import './App.css';
import { PlinkoGame } from './components/PlinkoGame';
import { EntryManager } from './components/EntryManager';
import { CountModal } from './components/CountModal';
import { WinnerModal } from './components/WinnerModal';
import { PhysicsModal, DEFAULT_PHYSICS, type PhysicsSettings } from './components/PhysicsModal';

export interface Entry {
  id: string;
  name: string;
}

// Shuffle array using Fisher-Yates algorithm with crypto randomness
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomValues = crypto.getRandomValues(new Uint32Array(1));
    const j = randomValues[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState<Entry | null>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showPhysicsModal, setShowPhysicsModal] = useState(false);
  const [shuffledEntries, setShuffledEntries] = useState<Entry[]>([]);
  const [physics, setPhysics] = useState<PhysicsSettings>(DEFAULT_PHYSICS);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addEntry = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      setEntries(prev => [...prev, { id: generateId(), name: trimmed }]);
    }
  }, []);

  const addBulkEntries = useCallback((text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const newEntries = lines.map(name => ({
      id: generateId(),
      name: name.trim()
    }));
    setEntries(prev => [...prev, ...newEntries]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const removeAllEntriesOf = useCallback((name: string) => {
    setEntries(prev => prev.filter(entry => entry.name !== name));
  }, []);

  const clearAllEntries = useCallback(() => {
    setEntries([]);
  }, []);

  const startRaffle = useCallback(() => {
    if (entries.length < 2) return;
    
    // Shuffle entries for fair slot distribution - the ball landing determines the winner!
    const shuffled = shuffleArray(entries);
    setShuffledEntries(shuffled);
    
    setWinner(null);
    setIsPlaying(true);
    setShowWinnerModal(false);
  }, [entries]);

  const handleAnimationComplete = useCallback((winningEntry: Entry) => {
    setWinner(winningEntry);
    setIsPlaying(false);
    setShowWinnerModal(true);
  }, []);

  const handleKeepEntry = useCallback(() => {
    setShowWinnerModal(false);
    setWinner(null);
  }, []);

  const handleRemoveOneEntry = useCallback(() => {
    if (winner) {
      removeEntry(winner.id);
    }
    setShowWinnerModal(false);
    setWinner(null);
  }, [winner, removeEntry]);

  const handleRemoveAllEntries = useCallback(() => {
    if (winner) {
      removeAllEntriesOf(winner.name);
    }
    setShowWinnerModal(false);
    setWinner(null);
  }, [winner, removeAllEntriesOf]);

  const getEntryCounts = () => {
    const counts: Record<string, number> = {};
    entries.forEach(entry => {
      counts[entry.name] = (counts[entry.name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎰 RAFFLE ROYALE 🎰</h1>
        <p className="subtitle">Save of the Month Selector</p>
      </header>

      <main className="main-content">
        <div className="left-panel">
          <EntryManager
            entries={entries}
            onAddEntry={addEntry}
            onAddBulkEntries={addBulkEntries}
            onRemoveEntry={removeEntry}
            disabled={isPlaying}
          />
          
          <div className="action-buttons">
            <button 
              className="btn btn-primary btn-large"
              onClick={startRaffle}
              disabled={isPlaying || entries.length < 2}
            >
              {isPlaying ? '🎲 Drawing...' : entries.length < 2 ? '🎯 Need 2+ Entries' : '🎯 DRAW WINNER'}
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => setShowCountModal(true)}
              disabled={entries.length === 0}
            >
              📊 View Counts
            </button>
            
            <button 
              className="btn btn-danger"
              onClick={clearAllEntries}
              disabled={isPlaying || entries.length === 0}
            >
              🗑️ Clear All
            </button>
            
            <button 
              className="btn btn-settings"
              onClick={() => setShowPhysicsModal(true)}
              disabled={isPlaying}
            >
              ⚙️ Physics
            </button>
          </div>
          
          <div className="stats">
            <span className="stat">
              <strong>{entries.length}</strong> total entries
            </span>
            <span className="stat">
              <strong>{new Set(entries.map(e => e.name)).size}</strong> unique people
            </span>
          </div>
        </div>

        <div className="right-panel">
          <PlinkoGame 
            entries={entries}
            shuffledEntries={shuffledEntries}
            isPlaying={isPlaying}
            onComplete={handleAnimationComplete}
            physics={physics}
          />
        </div>
      </main>

      {showCountModal && (
        <CountModal 
          counts={getEntryCounts()}
          totalEntries={entries.length}
          onClose={() => setShowCountModal(false)}
        />
      )}

      {showWinnerModal && winner && (
        <WinnerModal
          winner={winner}
          entryCount={entries.filter(e => e.name === winner.name).length}
          onKeep={handleKeepEntry}
          onRemoveOne={handleRemoveOneEntry}
          onRemoveAll={handleRemoveAllEntries}
        />
      )}

      {showPhysicsModal && (
        <PhysicsModal
          settings={physics}
          onSettingsChange={setPhysics}
          onClose={() => setShowPhysicsModal(false)}
          onReset={() => setPhysics(DEFAULT_PHYSICS)}
        />
      )}
    </div>
  );
}

export default App;
