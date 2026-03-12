/**
 * PTOWL Hourglass Loading Overlay
 *
 * Full-screen dimmed overlay with the PTOWL "O" as an hourglass.
 * Sand particles trickle through the O's center (bottleneck).
 * The hourglass flips every 5 seconds. Sand resets and flows again.
 *
 * Usage:
 *   <LoadingOverlay />
 *   <LoadingOverlay message="Generating schedule..." />
 */

import { useMemo } from 'react';

interface LoadingOverlayProps {
  message?: string;
}

/** Generate deterministic sand particle configs */
function createParticles(count: number) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    // Spread particles across different start/end x positions
    // They converge at center (bottleneck) then diverge
    const angle = (i / count) * Math.PI * 2;
    const xStart = Math.sin(angle) * 18;
    const xEnd = Math.cos(angle + 1) * 16;
    const delay = (i / count) * 2.5; // stagger across 2.5s cycle
    const size = 3 + (i % 3); // 3-5px

    particles.push({ xStart, xEnd, delay, size });
  }
  return particles;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  const particles = useMemo(() => createParticles(12), []);

  return (
    <div className="ptowl-loading-overlay" role="alert" aria-live="polite" aria-label={message}>
      <div className="ptowl-hourglass-wrapper">
        {/* Hourglass — flips every 5s */}
        <div className="ptowl-hourglass">
          {/* Sand particles trickling through */}
          {particles.map((p, i) => (
            <span
              key={i}
              className="ptowl-sand"
              style={{
                '--sand-delay': `${p.delay}s`,
                '--sand-x-start': `${p.xStart}px`,
                '--sand-x-end': `${p.xEnd}px`,
                '--sand-size': `${p.size}px`,
              } as React.CSSProperties}
            />
          ))}

          {/* The O — the hourglass itself */}
          <span className="ptowl-hourglass-o" aria-hidden="true">O</span>

          {/* Sand pile at bottom — grows and shrinks */}
          <div className="ptowl-sand-pile" />
        </div>

        {/* Loading text */}
        <p className="ptowl-loading-text">{message}</p>
      </div>
    </div>
  );
}
