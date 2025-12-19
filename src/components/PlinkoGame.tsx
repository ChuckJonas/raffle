import { useEffect, useRef, useCallback, useMemo } from "react";
import type { Entry } from "../App";
import type { PhysicsSettings } from "./PhysicsModal";
import "./PlinkoGame.css";

interface PlinkoGameProps {
  entries: Entry[];
  shuffledEntries: Entry[];
  isPlaying: boolean;
  onComplete: (winner: Entry) => void;
  physics: PhysicsSettings;
  displayedWinner: string;
  onDisplayedWinnerChange: (name: string) => void;
  highlightedSlot: number | null;
  onHighlightedSlotChange: (slot: number | null) => void;
  testMode?: boolean;
  testBallCount?: number;
  onTestComplete?: (results: number[]) => void;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id?: number;
  landed?: boolean;
  landedSlot?: number;
}

interface Peg {
  x: number;
  y: number;
}

// Sound utility for bounce effects
const createBounceSound = (audioContext: AudioContext, velocity: number) => {
  // Map velocity to frequency (higher velocity = higher pitch)
  // Velocity typically ranges from 0-15, map to 200-800 Hz
  const baseFreq = 300;
  const freqRange = 500;
  const normalizedVelocity = Math.min(velocity / 12, 1);
  const frequency = baseFreq + normalizedVelocity * freqRange;

  // Create oscillator
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Use triangle wave for a softer, more pleasant sound
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  // Quick decay envelope - louder for faster impacts
  const volume = 0.08 + normalizedVelocity * 0.12;
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.1
  );

  // Connect and play
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};

const createWinSound = (audioContext: AudioContext) => {
  // Play a cheerful winning jingle
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

    const startTime = audioContext.currentTime + i * 0.1;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.3);
  });
};

export function PlinkoGame({
  entries,
  shuffledEntries,
  isPlaying,
  onComplete,
  physics,
  displayedWinner,
  onDisplayedWinnerChange,
  highlightedSlot,
  onHighlightedSlotChange,
  testMode = false,
  testBallCount = 100,
  onTestComplete,
}: PlinkoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball | null>(null);
  const ballsRef = useRef<Ball[]>([]); // For test mode - multiple balls
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onTestCompleteRef = useRef(onTestComplete);
  const shuffledEntriesRef = useRef(shuffledEntries);
  const physicsRef = useRef(physics);
  const canvasWidthRef = useRef(750); // Will be updated when CANVAS_WIDTH changes
  const audioContextRef = useRef<AudioContext | null>(null);
  const testModeRef = useRef(testMode);
  const testBallCountRef = useRef(testBallCount);
  const drawFrameRef = useRef<
    ((ctx: CanvasRenderingContext2D, ball: Ball | null) => void) | null
  >(null);
  const drawFrameMultiRef = useRef<
    ((ctx: CanvasRenderingContext2D, balls: Ball[]) => void) | null
  >(null);
  const checkPegCollisionRef = useRef<
    ((ball: Ball, playSound?: boolean) => Ball) | null
  >(null);
  const checkDividerCollisionRef = useRef<
    ((ball: Ball, playSound?: boolean) => Ball) | null
  >(null);
  const runAnimationRef = useRef<(() => void) | null>(null);
  const runTestAnimationRef = useRef<(() => void) | null>(null);
  const onDisplayedWinnerChangeRef = useRef(onDisplayedWinnerChange);
  const onHighlightedSlotChangeRef = useRef(onHighlightedSlotChange);
  const winnerRef = useRef<Entry | null>(null);

  // Initialize audio context on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onTestCompleteRef.current = onTestComplete;
  }, [onTestComplete]);

  useEffect(() => {
    testModeRef.current = testMode;
  }, [testMode]);

  useEffect(() => {
    testBallCountRef.current = testBallCount;
  }, [testBallCount]);

  useEffect(() => {
    onDisplayedWinnerChangeRef.current = onDisplayedWinnerChange;
  }, [onDisplayedWinnerChange]);

  useEffect(() => {
    onHighlightedSlotChangeRef.current = onHighlightedSlotChange;
  }, [onHighlightedSlotChange]);

  useEffect(() => {
    shuffledEntriesRef.current = shuffledEntries;
  }, [shuffledEntries]);

  useEffect(() => {
    physicsRef.current = physics;
  }, [physics]);

  // Use shuffled entries from props, or entries for display when not playing
  const displayEntries = shuffledEntries.length > 0 ? shuffledEntries : entries;

  // Dynamic width based on entry count - go wide when > 10 entries
  const isWideMode = displayEntries.length > 10;
  const CANVAS_WIDTH = isWideMode ? 1200 : 750;
  const CANVAS_HEIGHT = 800;
  const ROWS = 15;

  // Keep canvas width ref updated for animation loop
  useEffect(() => {
    canvasWidthRef.current = CANVAS_WIDTH;
  }, [CANVAS_WIDTH]);

  // Generate pegs in classic Plinko staggered pattern
  const generatePegs = useCallback((): Peg[] => {
    const pegs: Peg[] = [];
    const firstRowY = 120; // More space above for ball drop
    const rowSpacing = 38;
    const pegSpacing = 40;

    // Calculate how many pegs fit in even rows (more pegs)
    const evenRowPegs = Math.floor((CANVAS_WIDTH - 60) / pegSpacing) + 1;

    for (let row = 0; row < ROWS; row++) {
      const isOddRow = row % 2 === 1;
      // Odd rows have one fewer peg and are offset by half spacing
      const rowPegs = isOddRow ? evenRowPegs - 1 : evenRowPegs;

      // Center the row, with odd rows offset by half a peg spacing
      const totalRowWidth = (rowPegs - 1) * pegSpacing;
      const startX = (CANVAS_WIDTH - totalRowWidth) / 2;

      for (let col = 0; col < rowPegs; col++) {
        pegs.push({
          x: startX + col * pegSpacing,
          y: firstRowY + row * rowSpacing,
        });
      }
    }
    return pegs;
  }, [CANVAS_WIDTH]);

  const pegs = generatePegs();

  // Calculate number of slots - each entry gets its own slot (max 30 for display)
  // This ensures each entry (including duplicates) is shown
  const numSlots = Math.min(Math.max(displayEntries.length, 2), 30);
  const slotWidth = CANVAS_WIDTH / numSlots;

  // Create slot assignments - show entries directly (first N entries)
  // If more entries than slots, we truncate display but selection is still fair
  const slotAssignments = useMemo(() => {
    if (displayEntries.length === 0) return [];
    // Show first numSlots entries (already shuffled for fairness)
    return displayEntries.slice(0, numSlots);
  }, [displayEntries, numSlots]);

  // Calculate random starting position - no bias, pure physics determines winner!
  const calculateStartX = useCallback(() => {
    const centerX = CANVAS_WIDTH / 2;
    // Random start position near center with some variation
    const randomOffset = (Math.random() - 0.5) * 100;
    return Math.max(50, Math.min(CANVAS_WIDTH - 50, centerX + randomOffset));
  }, [CANVAS_WIDTH]);

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, ball: Ball | null) => {
      // Clear canvas
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw pegs with glow
      const pegR = physicsRef.current.pegRadius;
      pegs.forEach((peg) => {
        // Glow
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, pegR + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 214, 0, 0.2)";
        ctx.fill();

        // Peg
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, pegR, 0, Math.PI * 2);
        const pegGradient = ctx.createRadialGradient(
          peg.x - 2,
          peg.y - 2,
          0,
          peg.x,
          peg.y,
          pegR
        );
        pegGradient.addColorStop(0, "#ffd700");
        pegGradient.addColorStop(1, "#b8860b");
        ctx.fillStyle = pegGradient;
        ctx.fill();
      });

      // Draw slots/bins at bottom
      const binHeight = 50;
      const dividerExtension = 20; // How far dividers extend above the bin
      const slotY = CANVAS_HEIGHT - binHeight;
      const dividerWidth = 3;

      for (let i = 0; i < numSlots; i++) {
        const x = i * slotWidth;
        const isLandedSlot = highlightedSlot === i;

        // Slot background - lights up when ball lands
        if (isLandedSlot) {
          // Glowing background for winning slot
          const glowGradient = ctx.createRadialGradient(
            x + slotWidth / 2,
            slotY + binHeight / 2,
            0,
            x + slotWidth / 2,
            slotY + binHeight / 2,
            slotWidth
          );
          glowGradient.addColorStop(0, "rgba(0, 255, 100, 0.5)");
          glowGradient.addColorStop(0.5, "rgba(0, 255, 100, 0.25)");
          glowGradient.addColorStop(1, "rgba(0, 255, 100, 0.05)");
          ctx.fillStyle = glowGradient;
          ctx.fillRect(
            x + dividerWidth,
            slotY,
            slotWidth - dividerWidth,
            binHeight
          );
        } else {
          ctx.fillStyle =
            i % 2 === 0 ? "rgba(255, 214, 0, 0.1)" : "rgba(255, 214, 0, 0.05)";
          ctx.fillRect(
            x + dividerWidth,
            slotY,
            slotWidth - dividerWidth,
            binHeight
          );
        }

        // Left divider wall - extends up slightly to catch the ball
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(
          x,
          slotY - dividerExtension,
          dividerWidth,
          binHeight + dividerExtension
        );

        // Slot label - show entry name
        const slotEntry = slotAssignments[i];
        if (slotEntry) {
          ctx.fillStyle = isLandedSlot ? "#00ff64" : "#fff";
          ctx.font = isLandedSlot
            ? 'bold 11px "Space Mono", monospace'
            : 'bold 10px "Space Mono", monospace';
          ctx.textAlign = "center";
          const maxChars = Math.max(4, Math.floor(slotWidth / 8));
          const displayText =
            slotEntry.name.length > maxChars
              ? slotEntry.name.substring(0, maxChars - 1) + "…"
              : slotEntry.name;
          ctx.fillText(displayText, x + slotWidth / 2, slotY + 30);
        }
      }

      // Last divider on the right
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(
        CANVAS_WIDTH - dividerWidth,
        slotY - dividerExtension,
        dividerWidth,
        binHeight + dividerExtension
      );

      // Draw ball with glow and trail
      if (ball) {
        const ballR = physicsRef.current.ballRadius;
        // Glow effect
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballR + 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 99, 71, 0.4)";
        ctx.fill();

        // Ball gradient
        const ballGradient = ctx.createRadialGradient(
          ball.x - 2,
          ball.y - 2,
          0,
          ball.x,
          ball.y,
          ballR
        );
        ballGradient.addColorStop(0, "#ff6b6b");
        ballGradient.addColorStop(0.7, "#ee4444");
        ballGradient.addColorStop(1, "#cc2222");

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2);
        ctx.fillStyle = ballGradient;
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fill();
      }

      // Draw title area
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, 50);
      ctx.fillStyle = "#ffd700";
      ctx.font = 'bold 20px "Fredoka", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("🎱 PLINKO DROP 🎱", CANVAS_WIDTH / 2, 32);
    },
    [pegs, numSlots, slotWidth, slotAssignments, highlightedSlot, CANVAS_WIDTH]
  );

  // Draw frame with multiple balls for test mode
  const drawFrameMulti = useCallback(
    (ctx: CanvasRenderingContext2D, balls: Ball[]) => {
      const p = physicsRef.current;
      // Clear canvas
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw pegs with glow
      pegs.forEach((peg) => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, p.pegRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 214, 0, 0.2)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(peg.x, peg.y, p.pegRadius, 0, Math.PI * 2);
        const pegGradient = ctx.createRadialGradient(
          peg.x - 2,
          peg.y - 2,
          0,
          peg.x,
          peg.y,
          p.pegRadius
        );
        pegGradient.addColorStop(0, "#ffd700");
        pegGradient.addColorStop(1, "#b8860b");
        ctx.fillStyle = pegGradient;
        ctx.fill();
      });

      // Count landed balls per slot for display
      const slotCounts: number[] = new Array(numSlots).fill(0);
      balls.forEach((ball) => {
        if (ball.landed && ball.landedSlot !== undefined) {
          slotCounts[ball.landedSlot]++;
        }
      });

      // Draw slots/bins at bottom with counts
      const binHeight = 50;
      const dividerExtension = 20;
      const slotY = CANVAS_HEIGHT - binHeight;
      const dividerWidth = 3;

      for (let i = 0; i < numSlots; i++) {
        const x = i * slotWidth;
        const count = slotCounts[i];

        // Color intensity based on count
        const intensity = Math.min(count / 20, 1);
        ctx.fillStyle = `rgba(255, 214, 0, ${0.05 + intensity * 0.3})`;
        ctx.fillRect(
          x + dividerWidth,
          slotY,
          slotWidth - dividerWidth,
          binHeight
        );

        // Left divider wall
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(
          x,
          slotY - dividerExtension,
          dividerWidth,
          binHeight + dividerExtension
        );

        // Count display
        if (count > 0) {
          ctx.fillStyle = "#fff";
          ctx.font = 'bold 14px "Space Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillText(count.toString(), x + slotWidth / 2, slotY + 35);
        }
      }

      // Last divider on the right
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(
        CANVAS_WIDTH - dividerWidth,
        slotY - dividerExtension,
        dividerWidth,
        binHeight + dividerExtension
      );

      // Draw all balls
      balls.forEach((ball) => {
        if (!ball.landed) {
          // Active ball - red
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, p.ballRadius + 3, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 99, 71, 0.3)";
          ctx.fill();

          const ballGradient = ctx.createRadialGradient(
            ball.x - 1,
            ball.y - 1,
            0,
            ball.x,
            ball.y,
            p.ballRadius
          );
          ballGradient.addColorStop(0, "#ff6b6b");
          ballGradient.addColorStop(0.7, "#ee4444");
          ballGradient.addColorStop(1, "#cc2222");

          ctx.beginPath();
          ctx.arc(ball.x, ball.y, p.ballRadius, 0, Math.PI * 2);
          ctx.fillStyle = ballGradient;
          ctx.fill();
        }
      });

      // Draw title area with ball count
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, 50);
      ctx.fillStyle = "#ffd700";
      ctx.font = 'bold 20px "Fredoka", sans-serif';
      ctx.textAlign = "center";
      const landedBalls = balls.filter((b) => b.landed).length;
      ctx.fillText(
        `🎱 TEST MODE: ${landedBalls}/${balls.length} landed 🎱`,
        CANVAS_WIDTH / 2,
        32
      );
    },
    [pegs, numSlots, slotWidth, CANVAS_WIDTH]
  );

  const checkPegCollision = useCallback(
    (ball: Ball, playSound: boolean = true): Ball => {
      const p = physicsRef.current;
      for (const peg of pegs) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = p.ballRadius + p.pegRadius;

        if (distance < minDist) {
          // Calculate impact velocity before collision for sound
          const impactVelocity = Math.sqrt(
            ball.vx * ball.vx + ball.vy * ball.vy
          );

          // Normalize collision vector
          const nx = dx / distance;
          const ny = dy / distance;

          // Reflect velocity
          const dotProduct = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dotProduct * nx) * p.bounce;
          ball.vy = (ball.vy - 2 * dotProduct * ny) * p.bounce;

          // Separate ball from peg
          const overlap = minDist - distance;
          ball.x += nx * overlap;
          ball.y += ny * overlap;

          // Add slight randomness to make it more interesting
          ball.vx += (Math.random() - 0.5) * p.pegRandomness;

          // Play bounce sound based on impact velocity (throttled in test mode)
          if (playSound && audioContextRef.current && impactVelocity > 1) {
            createBounceSound(audioContextRef.current, impactVelocity);
          }
        }
      }
      return ball;
    },
    [pegs]
  );

  // Check collision with bin dividers
  const checkDividerCollision = useCallback(
    (ball: Ball, playSound: boolean = true): Ball => {
      const p = physicsRef.current;
      const binHeight = 50;
      const dividerExtension = 20;
      const slotY = CANVAS_HEIGHT - binHeight;
      const dividerWidth = 3;

      // Only check divider collisions when ball is near the bins
      if (ball.y < slotY - dividerExtension - p.ballRadius) return ball;

      // Check each divider
      for (let i = 0; i <= numSlots; i++) {
        const dividerX = i * slotWidth;
        const dividerLeft = dividerX;
        const dividerRight = dividerX + dividerWidth;
        const dividerTop = slotY - dividerExtension;

        // Check if ball is colliding with this divider
        const closestX = Math.max(dividerLeft, Math.min(ball.x, dividerRight));
        const closestY = Math.max(dividerTop, Math.min(ball.y, CANVAS_HEIGHT));

        const dx = ball.x - closestX;
        const dy = ball.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < p.ballRadius) {
          // Calculate impact velocity for sound
          const impactVelocity = Math.sqrt(
            ball.vx * ball.vx + ball.vy * ball.vy
          );

          // Collision! Push ball out and bounce
          if (distance > 0) {
            const nx = dx / distance;
            const ny = dy / distance;

            // Push ball out
            ball.x = closestX + nx * p.ballRadius;
            ball.y = closestY + ny * p.ballRadius;

            // Bounce horizontally off the divider
            if (Math.abs(nx) > Math.abs(ny)) {
              ball.vx *= -p.bounce;
            } else {
              ball.vy *= -p.bounce * 0.5;
            }
          } else {
            // Ball center is inside divider, push out horizontally
            const centerX = dividerLeft + dividerWidth / 2;
            if (ball.x < centerX) {
              ball.x = dividerLeft - p.ballRadius;
            } else {
              ball.x = dividerRight + p.ballRadius;
            }
            ball.vx *= -p.bounce;
          }

          // Play a lower-pitched sound for divider hits
          if (playSound && audioContextRef.current && impactVelocity > 1) {
            createBounceSound(audioContextRef.current, impactVelocity * 0.5);
          }
        }
      }
      return ball;
    },
    [numSlots, slotWidth]
  );

  // Keep function refs updated
  useEffect(() => {
    drawFrameRef.current = drawFrame;
  }, [drawFrame]);

  useEffect(() => {
    drawFrameMultiRef.current = drawFrameMulti;
  }, [drawFrameMulti]);

  useEffect(() => {
    checkPegCollisionRef.current = checkPegCollision;
  }, [checkPegCollision]);

  useEffect(() => {
    checkDividerCollisionRef.current = checkDividerCollision;
  }, [checkDividerCollision]);

  // Animation loop - uses refs to avoid dependency issues and prevent restarts
  const runAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const drawFn = drawFrameRef.current;
    const checkCollisionFn = checkPegCollisionRef.current;
    const checkDividerFn = checkDividerCollisionRef.current;
    const animateFn = runAnimationRef.current;

    if (
      !canvas ||
      !ctx ||
      !ballRef.current ||
      !isAnimatingRef.current ||
      !drawFn ||
      !checkCollisionFn ||
      !checkDividerFn ||
      !animateFn
    )
      return;

    const ball = ballRef.current;
    const p = physicsRef.current;

    // Apply physics from settings
    ball.vy += p.gravity;
    ball.vx *= p.friction;
    ball.vy *= p.friction;

    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collisions - use ref for canvas width
    const canvasW = canvasWidthRef.current;
    if (ball.x < p.ballRadius) {
      ball.x = p.ballRadius;
      ball.vx *= -p.bounce;
    }
    if (ball.x > canvasW - p.ballRadius) {
      ball.x = canvasW - p.ballRadius;
      ball.vx *= -p.bounce;
    }

    // Check peg collisions using ref
    checkCollisionFn(ball);

    // Check divider collisions
    checkDividerFn(ball);

    // Draw the frame using ref
    drawFn(ctx, ball);

    // Check if ball reached bottom of bin
    const binFloor = CANVAS_HEIGHT - 50 + 30; // Inside the bin
    if (ball.y >= binFloor - p.ballRadius) {
      ball.y = binFloor - p.ballRadius;

      // Calculate which slot the ball is in - THIS DETERMINES THE WINNER!
      const shuffled = shuffledEntriesRef.current;
      const currentNumSlots = Math.min(Math.max(shuffled.length, 2), 30);
      const currentCanvasWidth = shuffled.length > 10 ? 1200 : 750;
      const currentSlotWidth = currentCanvasWidth / currentNumSlots;
      const slotIndex = Math.max(
        0,
        Math.min(Math.floor(ball.x / currentSlotWidth), currentNumSlots - 1)
      );

      // Light up the slot
      onHighlightedSlotChangeRef.current(slotIndex);

      // The winner is whoever is in the slot the ball landed in!
      const landedEntry = shuffled[slotIndex];
      if (landedEntry) {
        winnerRef.current = landedEntry;
        onDisplayedWinnerChangeRef.current(landedEntry.name);
      }

      // Small bounce at bottom then stop
      if (Math.abs(ball.vy) > 1) {
        ball.vy *= -0.3;
        // Play a soft thud for bottom bounces
        if (audioContextRef.current) {
          createBounceSound(audioContextRef.current, 3);
        }
        animationRef.current = requestAnimationFrame(animateFn);
      } else {
        // Animation complete - play win sound and pass the actual winner!
        if (audioContextRef.current) {
          createWinSound(audioContextRef.current);
        }
        isAnimatingRef.current = false;
        const winner = winnerRef.current;
        setTimeout(() => {
          if (winner) {
            onCompleteRef.current(winner);
          }
        }, 500);
      }
      return;
    }

    animationRef.current = requestAnimationFrame(animateFn);
  }, []); // No dependencies - uses refs for everything

  // Test mode animation loop - handles multiple balls
  const runTestAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const drawFn = drawFrameMultiRef.current;
    const checkCollisionFn = checkPegCollisionRef.current;
    const checkDividerFn = checkDividerCollisionRef.current;
    const animateFn = runTestAnimationRef.current;

    if (
      !canvas ||
      !ctx ||
      !isAnimatingRef.current ||
      !drawFn ||
      !checkCollisionFn ||
      !checkDividerFn ||
      !animateFn
    )
      return;

    const balls = ballsRef.current;
    const p = physicsRef.current;
    const canvasW = canvasWidthRef.current;

    // Sound throttle - only play occasional sounds in test mode
    const soundThrottle = Math.random() < 0.02; // 2% chance

    // Update each ball
    balls.forEach((ball) => {
      if (ball.landed) return;

      // Apply physics
      ball.vy += p.gravity;
      ball.vx *= p.friction;
      ball.vy *= p.friction;

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collisions
      if (ball.x < p.ballRadius) {
        ball.x = p.ballRadius;
        ball.vx *= -p.bounce;
      }
      if (ball.x > canvasW - p.ballRadius) {
        ball.x = canvasW - p.ballRadius;
        ball.vx *= -p.bounce;
      }

      // Check collisions (with throttled sound)
      checkCollisionFn(ball, soundThrottle);
      checkDividerFn(ball, soundThrottle);

      // Check if ball reached bottom
      const binFloor = CANVAS_HEIGHT - 50 + 30;
      if (ball.y >= binFloor - p.ballRadius && !ball.landed) {
        ball.y = binFloor - p.ballRadius;

        // Small bounce at bottom
        if (Math.abs(ball.vy) > 1) {
          ball.vy *= -0.3;
        } else {
          // Ball has landed - use the numSlots from entries, not ball count
          const currentSlotWidth = canvasW / numSlots;
          const slotIndex = Math.max(
            0,
            Math.min(Math.floor(ball.x / currentSlotWidth), numSlots - 1)
          );
          ball.landed = true;
          ball.landedSlot = slotIndex;
        }
      }
    });

    // Draw all balls
    drawFn(ctx, balls);

    // Check if all balls have landed
    const allLanded = balls.every((b) => b.landed);
    if (allLanded) {
      isAnimatingRef.current = false;

      // Calculate results
      const results: number[] = new Array(numSlots).fill(0);
      balls.forEach((ball) => {
        if (ball.landedSlot !== undefined && ball.landedSlot < numSlots) {
          results[ball.landedSlot]++;
        }
      });

      // Play completion sound
      if (audioContextRef.current) {
        createWinSound(audioContextRef.current);
      }

      // Call completion callback
      if (onTestCompleteRef.current) {
        setTimeout(() => {
          onTestCompleteRef.current?.(results);
        }, 500);
      }
      return;
    }

    animationRef.current = requestAnimationFrame(animateFn);
  }, [numSlots]); // Minimal dependencies

  // Keep runAnimation ref updated
  useEffect(() => {
    runAnimationRef.current = runAnimation;
  }, [runAnimation]);

  // Keep runTestAnimation ref updated
  useEffect(() => {
    runTestAnimationRef.current = runTestAnimation;
  }, [runTestAnimation]);

  // Function to start the animation - called from effect
  const startAnimation = useCallback(() => {
    // Check we have enough entries
    const shuffled = shuffledEntriesRef.current;
    if (shuffled.length < 2) return;

    // Initialize audio context (must be done after user interaction)
    getAudioContext();

    // Random start position - no bias! The physics determine the winner
    const startX = calculateStartX();

    const p = physicsRef.current;
    ballRef.current = {
      x: startX,
      y: 55, // Start high above the first row of pegs
      vx: (Math.random() - 0.5) * p.initialVelocity, // Random initial horizontal
      vy: 0.5, // Gentle initial drop
    };
    onDisplayedWinnerChangeRef.current("");
    onHighlightedSlotChangeRef.current(null); // Reset landed slot
    winnerRef.current = null; // Reset winner
    isAnimatingRef.current = true;

    // Start the animation loop
    const animateFn = runAnimationRef.current;
    if (animateFn) {
      animateFn();
    }
  }, [calculateStartX, getAudioContext]);

  // Function to start test animation with multiple balls
  const startTestAnimation = useCallback(() => {
    // Initialize audio context
    getAudioContext();

    const p = physicsRef.current;
    const ballCount = testBallCountRef.current;
    const canvasW = canvasWidthRef.current;

    // Create all balls with positions spread across the board for fair distribution
    const balls: Ball[] = [];
    // Leave 12% margin on each side to avoid balls falling straight down edges
    const marginPercent = 0.12;
    const minX = canvasW * marginPercent;
    const maxX = canvasW * (1 - marginPercent);
    const dropRange = maxX - minX;

    for (let i = 0; i < ballCount; i++) {
      // Distribute starting positions uniformly across the valid range
      // Add some randomness but ensure coverage of the full width
      const baseX = minX + (i / ballCount) * dropRange; // Spread evenly
      const randomOffset = (Math.random() - 0.5) * (dropRange / ballCount) * 2; // Small random offset
      const startX = Math.max(minX, Math.min(maxX, baseX + randomOffset));

      // Stagger the drop timing by varying starting Y position
      const startY = 55 - Math.random() * 250; // Start above the canvas

      // Random initial velocity - can push ball left or right
      const vx = (Math.random() - 0.5) * p.initialVelocity * 1.5;

      balls.push({
        id: i,
        x: startX,
        y: startY,
        vx: vx,
        vy: 0.3 + Math.random() * 0.5, // Always falling down
        landed: false,
      });
    }

    // Shuffle the balls array so they don't drop in order from left to right
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }

    ballsRef.current = balls;
    isAnimatingRef.current = true;

    // Start the test animation loop
    const animateFn = runTestAnimationRef.current;
    if (animateFn) {
      animateFn();
    }
  }, [getAudioContext]);

  // Start animation when isPlaying becomes true
  useEffect(() => {
    if (isPlaying && !isAnimatingRef.current) {
      if (testModeRef.current) {
        // Test mode - drop multiple balls
        setTimeout(() => startTestAnimation(), 0);
      } else {
        // Normal mode - single ball
        setTimeout(() => startAnimation(), 0);
      }
    }

    // Stop animation when isPlaying becomes false
    if (!isPlaying && isAnimatingRef.current) {
      isAnimatingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Clear test balls
      ballsRef.current = [];
    }
  }, [isPlaying, startAnimation, startTestAnimation]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      isAnimatingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx && !isPlaying) {
      drawFrame(ctx, null);
    }
  }, [drawFrame, isPlaying, displayEntries]);

  return (
    <div className="plinko-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="plinko-canvas"
      />
      {displayedWinner && !isPlaying && (
        <div className="winner-display">🏆 {displayedWinner} 🏆</div>
      )}
      {entries.length < 2 && (
        <div className="empty-state">
          Add at least 2 entries to start the raffle!
        </div>
      )}
    </div>
  );
}
