import { useState } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

interface DistributionTestProps {
  numSlots: number;
  slotNames: string[];
  onClose: () => void;
  onStartTest: (ballCount: number) => void;
  testResults: number[] | null;
  isRunning: boolean;
}

export function DistributionTest({
  numSlots,
  slotNames,
  onClose,
  onStartTest,
  testResults,
  isRunning,
}: DistributionTestProps) {
  const [ballCount, setBallCount] = useState(100);
  
  const maxCount = testResults ? Math.max(...testResults) : 0;
  const totalBalls = testResults ? testResults.reduce((a, b) => a + b, 0) : 0;
  
  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content distribution-modal">
        <div className="modal-header">
          <h2>📊 Distribution Test</h2>
          <button className="modal-close" onClick={onClose} disabled={isRunning}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="distribution-controls">
            <label>
              Number of balls:
              <input
                type="number"
                min="10"
                max="500"
                value={ballCount}
                onChange={(e) => setBallCount(Math.max(10, Math.min(500, parseInt(e.target.value) || 100)))}
                disabled={isRunning}
              />
            </label>
            <button
              className="btn btn-primary"
              onClick={() => onStartTest(ballCount)}
              disabled={isRunning}
            >
              {isRunning ? "🎲 Dropping..." : "🎯 Drop Balls!"}
            </button>
          </div>
          
          {testResults && (
            <div className="distribution-results">
              <h3>Results ({totalBalls} balls)</h3>
              <div className="distribution-chart">
                {testResults.map((count, index) => {
                  const percentage = totalBalls > 0 ? (count / totalBalls) * 100 : 0;
                  const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const expectedPercentage = 100 / numSlots;
                  const deviation = percentage - expectedPercentage;
                  
                  return (
                    <div key={index} className="chart-bar-container">
                      <div className="chart-bar-wrapper">
                        <div
                          className="chart-bar"
                          style={{ height: `${barHeight}%` }}
                          title={`${slotNames[index] || `Slot ${index + 1}`}: ${count} (${percentage.toFixed(1)}%)`}
                        />
                      </div>
                      <div className="chart-label">
                        <span className="chart-name" title={slotNames[index] || `Slot ${index + 1}`}>
                          {(slotNames[index] || `${index + 1}`).substring(0, 4)}
                        </span>
                        <span className="chart-count">{count}</span>
                        <span className="chart-percent">{percentage.toFixed(1)}%</span>
                        <span className={`chart-deviation ${deviation > 0 ? 'positive' : 'negative'}`}>
                          {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="distribution-stats">
                <p>
                  <strong>Expected per slot:</strong> {(100 / numSlots).toFixed(1)}%
                </p>
                <p>
                  <strong>Standard deviation:</strong> {calculateStdDev(testResults, totalBalls / numSlots).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function calculateStdDev(counts: number[], expected: number): number {
  const squaredDiffs = counts.map(count => Math.pow(count - expected, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / counts.length;
  return Math.sqrt(avgSquaredDiff);
}
