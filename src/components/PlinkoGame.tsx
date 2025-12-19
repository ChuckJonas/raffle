import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { Entry } from "../App";
import type { PhysicsSettings } from "./PhysicsModal";
import "./PlinkoGame.css";

interface PlinkoGameProps {
  entries: Entry[];
  shuffledEntries: Entry[];
  isPlaying: boolean;
  onComplete: (winner: Entry) => void;
  physics: PhysicsSettings;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Peg {
  x: number;
  y: number;
}

export function PlinkoGame({
  entries,
  shuffledEntries,
  isPlaying,
  onComplete,
  physics,
}: PlinkoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball | null>(null);
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const shuffledEntriesRef = useRef(shuffledEntries);
  const physicsRef = useRef(physics);
  const drawFrameRef = useRef<
    ((ctx: CanvasRenderingContext2D, ball: Ball | null) => void) | null
  >(null);
  const checkPegCollisionRef = useRef<((ball: Ball) => Ball) | null>(null);
  const checkDividerCollisionRef = useRef<((ball: Ball) => Ball) | null>(null);
  const runAnimationRef = useRef<(() => void) | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [landedSlot, setLandedSlot] = useState<number | null>(null);
  const winnerRef = useRef<Entry | null>(null);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    shuffledEntriesRef.current = shuffledEntries;
  }, [shuffledEntries]);

  useEffect(() => {
    physicsRef.current = physics;
  }, [physics]);

  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 700;
  const PEG_RADIUS = 6;
  const ROWS = 12;

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
  }, []);

  const pegs = generatePegs();

  // Use shuffled entries from props, or entries for display when not playing
  const displayEntries = shuffledEntries.length > 0 ? shuffledEntries : entries;

  // Calculate number of slots - each entry gets its own slot (max 12 for display)
  // This ensures each entry (including duplicates) is shown
  const numSlots = Math.min(Math.max(displayEntries.length, 2), 12);
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
  }, []);

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
      pegs.forEach((peg) => {
        // Glow
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, PEG_RADIUS + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 214, 0, 0.2)";
        ctx.fill();

        // Peg
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
        const pegGradient = ctx.createRadialGradient(
          peg.x - 2,
          peg.y - 2,
          0,
          peg.x,
          peg.y,
          PEG_RADIUS
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
        const isLandedSlot = landedSlot === i;

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
    [pegs, numSlots, slotWidth, slotAssignments, landedSlot]
  );

  const checkPegCollision = useCallback(
    (ball: Ball): Ball => {
      const p = physicsRef.current;
      for (const peg of pegs) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = p.ballRadius + PEG_RADIUS;

        if (distance < minDist) {
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
        }
      }
      return ball;
    },
    [pegs]
  );

  // Check collision with bin dividers
  const checkDividerCollision = useCallback(
    (ball: Ball): Ball => {
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

    // Wall collisions
    if (ball.x < p.ballRadius) {
      ball.x = p.ballRadius;
      ball.vx *= -p.bounce;
    }
    if (ball.x > CANVAS_WIDTH - p.ballRadius) {
      ball.x = CANVAS_WIDTH - p.ballRadius;
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
      const currentNumSlots = Math.min(Math.max(shuffled.length, 2), 12);
      const currentSlotWidth = CANVAS_WIDTH / currentNumSlots;
      const slotIndex = Math.max(
        0,
        Math.min(Math.floor(ball.x / currentSlotWidth), currentNumSlots - 1)
      );

      // Light up the slot
      setLandedSlot(slotIndex);

      // The winner is whoever is in the slot the ball landed in!
      const landedEntry = shuffled[slotIndex];
      if (landedEntry) {
        winnerRef.current = landedEntry;
        setDisplayName(landedEntry.name);
      }

      // Small bounce at bottom then stop
      if (Math.abs(ball.vy) > 1) {
        ball.vy *= -0.3;
        animationRef.current = requestAnimationFrame(animateFn);
      } else {
        // Animation complete - pass the actual winner!
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

  // Keep runAnimation ref updated
  useEffect(() => {
    runAnimationRef.current = runAnimation;
  }, [runAnimation]);

  // Function to start the animation - called from effect
  const startAnimation = useCallback(() => {
    // Check we have enough entries
    const shuffled = shuffledEntriesRef.current;
    if (shuffled.length < 2) return;

    // Random start position - no bias! The physics determine the winner
    const startX = calculateStartX();

    const p = physicsRef.current;
    ballRef.current = {
      x: startX,
      y: 55, // Start high above the first row of pegs
      vx: (Math.random() - 0.5) * p.initialVelocity, // Random initial horizontal
      vy: 0.5, // Gentle initial drop
    };
    setDisplayName("");
    setLandedSlot(null); // Reset landed slot
    winnerRef.current = null; // Reset winner
    isAnimatingRef.current = true;

    // Start the animation loop
    const animateFn = runAnimationRef.current;
    if (animateFn) {
      animateFn();
    }
  }, [calculateStartX]);

  // Start animation when isPlaying becomes true
  useEffect(() => {
    if (isPlaying && !isAnimatingRef.current) {
      // Use setTimeout to avoid setState-in-effect warning
      setTimeout(() => startAnimation(), 0);
    }

    // Stop animation when isPlaying becomes false
    if (!isPlaying && isAnimatingRef.current) {
      isAnimatingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [isPlaying, startAnimation]);

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
      {displayName && !isPlaying && (
        <div className="winner-display">🏆 {displayName} 🏆</div>
      )}
      {entries.length < 2 && (
        <div className="empty-state">
          Add at least 2 entries to start the raffle!
        </div>
      )}
    </div>
  );
}
