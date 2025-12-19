import "./Modal.css";

export interface PhysicsSettings {
  gravity: number;
  bounce: number;
  friction: number;
  ballRadius: number;
  pegRadius: number;
  pegRandomness: number;
  initialVelocity: number;
  obstacleWidth: number;
  obstacleSpeed: number;
}

export const DEFAULT_PHYSICS: PhysicsSettings = {
  gravity: 0.12,
  bounce: 0.85,
  friction: 0.998,
  ballRadius: 6,
  pegRadius: 6,
  pegRandomness: 2,
  initialVelocity: 3,
  obstacleWidth: 60,
  obstacleSpeed: 3,
};

interface PhysicsModalProps {
  settings: PhysicsSettings;
  onSettingsChange: (settings: PhysicsSettings) => void;
  onClose: () => void;
  onReset: () => void;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateRandomPhysics(): PhysicsSettings {
  return {
    gravity: randomInRange(0.05, 0.4),
    bounce: randomInRange(0.5, 0.95),
    friction: randomInRange(0.985, 0.998),
    ballRadius: Math.round(randomInRange(4, 8)),
    pegRadius: Math.round(randomInRange(3, 8)),
    pegRandomness: randomInRange(0.5, 4),
    initialVelocity: randomInRange(1, 5),
    obstacleWidth: Math.round(randomInRange(40, 200)),
    obstacleSpeed: randomInRange(1, 6),
  };
}

export function PhysicsModal({
  settings,
  onSettingsChange,
  onClose,
  onReset,
}: PhysicsModalProps) {
  const handleChange = (key: keyof PhysicsSettings, value: number) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content physics-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>⚙️ Physics Settings</h2>
        <p className="modal-subtitle">
          Tweak the ball physics for different effects
        </p>

        <div className="physics-sliders">
          <div className="slider-group">
            <label>
              <span className="slider-label">Gravity</span>
              <span className="slider-value">
                {settings.gravity.toFixed(2)}
              </span>
            </label>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.01"
              value={settings.gravity}
              onChange={(e) =>
                handleChange("gravity", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Floaty</span>
              <span>Heavy</span>
            </div>
          </div>

          <div className="slider-group">
            <label>
              <span className="slider-label">Bounciness</span>
              <span className="slider-value">{settings.bounce.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.01"
              value={settings.bounce}
              onChange={(e) =>
                handleChange("bounce", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Dull</span>
              <span>Super Bouncy</span>
            </div>
          </div>

          <div className="slider-group">
            <label>
              <span className="slider-label">Air Friction</span>
              <span className="slider-value">
                {settings.friction.toFixed(3)}
              </span>
            </label>
            <input
              type="range"
              min="0.98"
              max="1"
              step="0.001"
              value={settings.friction}
              onChange={(e) =>
                handleChange("friction", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Sticky Air</span>
              <span>Frictionless</span>
            </div>
          </div>

          <div className="slider-group">
            <label>
              <span className="slider-label">Ball Size</span>
              <span className="slider-value">
                {settings.ballRadius.toFixed(0)}px
              </span>
            </label>
            <input
              type="range"
              min="4"
              max="8"
              step="1"
              value={settings.ballRadius}
              onChange={(e) =>
                handleChange("ballRadius", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Tiny</span>
              <span>Large</span>
            </div>
          </div>

          <div className="slider-group">
            <label>
              <span className="slider-label">Peg Size</span>
              <span className="slider-value">
                {settings.pegRadius.toFixed(0)}px
              </span>
            </label>
            <input
              type="range"
              min="3"
              max="8"
              step="1"
              value={settings.pegRadius}
              onChange={(e) =>
                handleChange("pegRadius", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          <div className="slider-group">
            <label>
              <span className="slider-label">Peg Chaos</span>
              <span className="slider-value">
                {settings.pegRandomness.toFixed(1)}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={settings.pegRandomness}
              onChange={(e) =>
                handleChange("pegRandomness", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Predictable</span>
              <span>Chaotic</span>
            </div>
          </div>

          <div className="slider-group">
            <label>
              <span className="slider-label">Initial Speed</span>
              <span className="slider-value">
                {settings.initialVelocity.toFixed(1)}
              </span>
            </label>
            <input
              type="range"
              min="0.5"
              max="6"
              step="0.1"
              value={settings.initialVelocity}
              onChange={(e) =>
                handleChange("initialVelocity", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Gentle</span>
              <span>Fast</span>
            </div>
          </div>

          <div className="slider-divider">
            <span>🏓 Paddle</span>
          </div>

          <div className="slider-group">
            <label>
              <span className="slider-label">Paddle Size</span>
              <span className="slider-value">
                {settings.obstacleWidth === 0
                  ? "Off"
                  : `${settings.obstacleWidth.toFixed(0)}px`}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="250"
              step="5"
              value={settings.obstacleWidth}
              onChange={(e) =>
                handleChange("obstacleWidth", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Off</span>
              <span>Huge</span>
            </div>
          </div>

          <div className="slider-group">
            <label>
              <span className="slider-label">Paddle Speed</span>
              <span className="slider-value">
                {settings.obstacleSpeed.toFixed(1)}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="8"
              step="0.5"
              value={settings.obstacleSpeed}
              onChange={(e) =>
                handleChange("obstacleSpeed", parseFloat(e.target.value))
              }
            />
            <div className="slider-hints">
              <span>Still</span>
              <span>Zooming</span>
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn btn-secondary" onClick={onReset}>
            🔄 Reset
          </button>
          <button
            className="btn btn-randomize"
            onClick={() => onSettingsChange(generateRandomPhysics())}
          >
            🎲 Randomize
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  );
}
