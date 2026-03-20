import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface ProgressBarProps {
  completed: number;
  total: number;
  showMilestones?: boolean;
  compact?: boolean;
}

const MILESTONES = [25, 50, 75, 100];

export function ProgressBar({ completed, total, showMilestones = false, compact = false }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const prevPct = useRef(pct);

  // Milestone celebration
  useEffect(() => {
    if (prevPct.current === pct) return;
    const prev = prevPct.current;
    prevPct.current = pct;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (const milestone of MILESTONES) {
      if (prev < milestone && pct >= milestone) {
        if (!prefersReducedMotion) {
          confetti({ particleCount: 40, spread: 40, origin: { y: 0.7 } });
        }
        const msg = milestone === 100
          ? `All ${total} sessions complete!`
          : milestone === 50
            ? `Halfway there! ${completed} of ${total} sessions`
            : `${milestone}% done — ${completed} of ${total} sessions`;
        toast.success(msg);
        break;
      }
    }
  }, [pct, completed, total]);

  const height = compact ? '6px' : '10px';

  return (
    <div>
      <div style={{ ...styles.track, height }}>
        <div
          style={{
            ...styles.fill,
            width: `${pct}%`,
            height,
          }}
        />
        {showMilestones && MILESTONES.slice(0, 3).map((m) => (
          <div
            key={m}
            style={{
              ...styles.dot,
              left: `${m}%`,
              background: pct >= m ? 'var(--green-dark)' : 'var(--gray-text)',
            }}
          />
        ))}
      </div>
      {!compact && (
        <p style={styles.text}>
          {completed} of {total} sessions ({pct}%)
        </p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  track: {
    position: 'relative',
    background: 'var(--gray-mid)',
    borderRadius: '999px',
    overflow: 'visible',
  },
  fill: {
    borderRadius: '999px',
    background: 'linear-gradient(90deg, var(--green-mid), var(--green-dark))',
    transition: 'width 0.5s ease',
  },
  dot: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    border: '2px solid var(--white)',
    transition: 'background 0.3s',
  },
  text: {
    fontSize: '0.8125rem',
    color: 'var(--gray-text)',
    fontWeight: 500,
    marginTop: '0.5rem',
  },
};
