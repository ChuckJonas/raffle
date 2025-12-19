import { useState, useCallback } from 'react';
import './App.css';
import { PlinkoGame } from './components/PlinkoGame';
import { EntryManager } from './components/EntryManager';
import { CountModal } from './components/CountModal';
import { WinnerModal } from './components/WinnerModal';
import { PhysicsModal, DEFAULT_PHYSICS, type PhysicsSettings } from './components/PhysicsModal';
import { DistributionTest } from './components/DistributionTest';

export interface Entry {
  id: string;
  name: string;
}

interface WinnerLog {
  name: string;
  timestamp: Date;
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
  const [showDistributionTest, setShowDistributionTest] = useState(false);
  const [shuffledEntries, setShuffledEntries] = useState<Entry[]>([]);
  const [physics, setPhysics] = useState<PhysicsSettings>(DEFAULT_PHYSICS);
  const [winnersLog, setWinnersLog] = useState<WinnerLog[]>([]);
  const [displayedWinner, setDisplayedWinner] = useState<string>("");
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testBallCount, setTestBallCount] = useState(100);
  const [testResults, setTestResults] = useState<number[] | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addEntry = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      setEntries(prev => {
        const newEntries = [...prev, { id: generateId(), name: trimmed }];
        // Shuffle immediately so people can see their position
        setShuffledEntries(shuffleArray(newEntries));
        return newEntries;
      });
    }
  }, []);

  const addBulkEntries = useCallback((text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const newEntries = lines.map(name => ({
      id: generateId(),
      name: name.trim()
    }));
    setEntries(prev => {
      const allEntries = [...prev, ...newEntries];
      // Shuffle immediately so people can see their position
      setShuffledEntries(shuffleArray(allEntries));
      return allEntries;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => {
      const remaining = prev.filter(entry => entry.id !== id);
      // Reshuffle when removing an entry
      if (remaining.length >= 2) {
        setShuffledEntries(shuffleArray(remaining));
      } else {
        setShuffledEntries(remaining);
      }
      return remaining;
    });
  }, []);

  const clearAllEntries = useCallback(() => {
    setEntries([]);
    setShuffledEntries([]);
  }, []);

  const startRaffle = useCallback(() => {
    if (entries.length < 2) return;
    
    // Don't shuffle here - entries are already shuffled when added/imported
    // This lets people see their position before drawing
    setWinner(null);
    setIsPlaying(true);
    setShowWinnerModal(false);
  }, [entries]);

  const handleAnimationComplete = useCallback((winningEntry: Entry) => {
    setWinner(winningEntry);
    setIsPlaying(false);
    setShowWinnerModal(true);
    // Add to winners log
    setWinnersLog(prev => [{ name: winningEntry.name, timestamp: new Date() }, ...prev]);
  }, []);

  const handleTestComplete = useCallback((results: number[]) => {
    setIsPlaying(false);
    setIsTestMode(false);
    setTestResults(results);
    // Reopen the modal to show results
    setShowDistributionTest(true);
  }, []);

  const startTest = useCallback((ballCount: number) => {
    setTestBallCount(ballCount);
    setIsTestMode(true);
    setTestResults(null);
    // Hide the modal so user can see the balls drop
    setShowDistributionTest(false);
    setIsPlaying(true);
  }, []);

  // Helper to clear board and reshuffle after winner selection
  const clearAndReshuffle = useCallback((updatedEntries: Entry[]) => {
    setShowWinnerModal(false);
    setWinner(null);
    // Clear the winner display and highlighted slot
    setDisplayedWinner("");
    setHighlightedSlot(null);
    // Reshuffle so people can see their new positions
    if (updatedEntries.length >= 2) {
      setShuffledEntries(shuffleArray(updatedEntries));
    } else {
      setShuffledEntries([]);
    }
  }, []);

  const handleKeepEntry = useCallback(() => {
    clearAndReshuffle(entries);
  }, [entries, clearAndReshuffle]);

  const handleRemoveOneEntry = useCallback(() => {
    if (winner) {
      const updatedEntries = entries.filter(entry => entry.id !== winner.id);
      setEntries(updatedEntries);
      clearAndReshuffle(updatedEntries);
    } else {
      clearAndReshuffle(entries);
    }
  }, [winner, entries, clearAndReshuffle]);

  const handleRemoveAllEntries = useCallback(() => {
    if (winner) {
      const updatedEntries = entries.filter(entry => entry.name !== winner.name);
      setEntries(updatedEntries);
      clearAndReshuffle(updatedEntries);
    } else {
      clearAndReshuffle(entries);
    }
  }, [winner, entries, clearAndReshuffle]);

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

      <main className={`main-content ${entries.length > 10 ? 'wide-mode' : ''}`}>
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
            
            <button 
              className="btn btn-test"
              onClick={() => setShowDistributionTest(true)}
              disabled={isPlaying || entries.length < 2}
            >
              📊 Test Distribution
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
          <button 
            className="btn btn-primary btn-large draw-button"
            onClick={startRaffle}
            disabled={isPlaying || entries.length < 2}
          >
            {isPlaying ? '🎲 Drawing...' : entries.length < 2 ? '🎯 Need 2+ Entries' : '🎯 DRAW WINNER'}
          </button>
          
          <PlinkoGame 
            entries={entries}
            shuffledEntries={shuffledEntries}
            isPlaying={isPlaying}
            onComplete={handleAnimationComplete}
            physics={physics}
            displayedWinner={displayedWinner}
            onDisplayedWinnerChange={setDisplayedWinner}
            highlightedSlot={highlightedSlot}
            onHighlightedSlotChange={setHighlightedSlot}
            testMode={isTestMode}
            testBallCount={testBallCount}
            onTestComplete={handleTestComplete}
          />
          
          {winnersLog.length > 0 && (
            <div className="winners-log">
              <div className="winners-log-header">
                <h3>🏆 Winners Log</h3>
                <button 
                  className="btn-clear-log"
                  onClick={() => setWinnersLog([])}
                  title="Clear log"
                >
                  ✕
                </button>
              </div>
              <ul className="winners-list">
                {winnersLog.map((win, index) => (
                  <li key={index} className="winner-item">
                    <span className="winner-position">#{index + 1}</span>
                    <span className="winner-name">{win.name}</span>
                    <span className="winner-time">
                      {win.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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

      {showDistributionTest && (
        <DistributionTest
          numSlots={Math.min(Math.max(shuffledEntries.length || entries.length, 2), 30)}
          slotNames={(shuffledEntries.length > 0 ? shuffledEntries : entries).slice(0, 30).map(e => e.name)}
          onClose={() => {
            setShowDistributionTest(false);
            setTestResults(null);
          }}
          onStartTest={startTest}
          testResults={testResults}
          isRunning={isPlaying && isTestMode}
        />
      )}
    </div>
  );
}

export default App;
