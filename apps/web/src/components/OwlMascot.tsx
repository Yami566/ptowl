import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ── Daily Color Rotation ──
const DAILY_PALETTES = [
  { body: '#5C3566', chest: '#7E5A8E', pupil: '#3A1F4A' },  // Sun — Plum
  { body: '#4A3B6B', chest: '#6B5B95', pupil: '#2D1B4E' },  // Mon — Purple
  { body: '#2B4570', chest: '#4A6B95', pupil: '#1B2D4E' },  // Tue — Midnight Blue
  { body: '#2A5B5B', chest: '#4A8080', pupil: '#1B3D3D' },  // Wed — Teal
  { body: '#5B2A3D', chest: '#8A4A60', pupil: '#3D1B28' },  // Thu — Burgundy
  { body: '#3D3535', chest: '#5C5050', pupil: '#2A2222' },  // Fri — Charcoal
  { body: '#2D4A3B', chest: '#4A7060', pupil: '#1B3028' },  // Sat — Forest
];

// ── Seasonal Fruits (Farmer's Almanac, East Coast US) ──
const SEASONAL_FRUITS: Record<number, { emoji: string; name: string }> = {
  0:  { emoji: '🍊', name: 'Winter citrus' },       // Jan
  1:  { emoji: '🍊', name: 'Florida oranges' },      // Feb
  2:  { emoji: '🍓', name: 'Carolina strawberries' }, // Mar
  3:  { emoji: '🍒', name: 'Cherry season' },         // Apr
  4:  { emoji: '🍒', name: 'Sweet cherries' },        // May
  5:  { emoji: '🫐', name: 'Blueberry season' },      // Jun
  6:  { emoji: '🍑', name: 'Georgia peaches' },       // Jul
  7:  { emoji: '🍉', name: 'Watermelon season' },     // Aug
  8:  { emoji: '🍎', name: 'Apple harvest' },         // Sep
  9:  { emoji: '🎃', name: 'Pumpkin season' },        // Oct
  10: { emoji: '🍐', name: 'Pear harvest' },          // Nov
  11: { emoji: '🍊', name: 'Holiday citrus' },        // Dec
};

function getSeasonalFruit() {
  return SEASONAL_FRUITS[new Date().getMonth()]!;
}

// ── Owl state ──
type OwlState = 'sleeping' | 'sleepy' | 'awake' | 'alert';

function getOwlState(): OwlState {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = est.getHours();
  if (hour >= 8 && hour < 17) return 'sleeping';
  if (hour >= 17 && hour < 20) return 'sleepy';
  if (hour >= 20 || hour < 5) return 'awake';
  return 'sleepy';
}

// ── Daily PT Tips ──
const PT_TIPS = [
  { tip: "Hold stretches for 30 seconds, not 10.", search: "physical therapy stretching duration" },
  { tip: "Ice first 48 hours, then heat for chronic pain.", search: "ice vs heat therapy" },
  { tip: "Balance exercises reduce fall risk by 23%.", search: "balance exercises fall prevention" },
  { tip: "Foam rolling increases range of motion by 10%.", search: "foam rolling benefits" },
  { tip: "Walking backwards strengthens knees.", search: "retro walking knee rehabilitation" },
  { tip: "Grip strength predicts overall health.", search: "grip strength health predictor" },
  { tip: "Diaphragmatic breathing calms the nervous system.", search: "diaphragmatic breathing benefits" },
  { tip: "Your spine has 33 vertebrae, only 24 move.", search: "spine vertebrae anatomy" },
  { tip: "Hip flexor tightness causes lower back pain.", search: "hip flexor lower back pain" },
  { tip: "The WHO recommends 150 min exercise per week.", search: "WHO exercise recommendations" },
];

function getDailyTip() {
  const day = Math.floor(Date.now() / 86400000);
  return PT_TIPS[day % PT_TIPS.length]!;
}

// ── Owl hoot ──
function playHoot() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.type = 'sine';
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.setValueAtTime(500, ctx.currentTime);
      o2.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.35);
      g2.gain.setValueAtTime(0.12, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      o2.type = 'sine';
      o2.start(ctx.currentTime);
      o2.stop(ctx.currentTime + 0.45);
    }, 350);
  } catch { /* no audio */ }
}

// ── Fruit drop state ──
interface FallingFruit {
  id: number;
  emoji: string;
  left: number; // percentage
}

export function OwlMascot() {
  const owlState = useMemo(() => getOwlState(), []);
  const palette = useMemo(() => DAILY_PALETTES[new Date().getDay()]!, []);
  const seasonalFruit = useMemo(() => getSeasonalFruit(), []);
  const dailyTip = useMemo(() => getDailyTip(), []);
  const [disturbed, setDisturbed] = useState(false);
  const [eyeState, setEyeState] = useState<'closed' | 'opening' | 'open' | 'angry'>(
    owlState === 'sleeping' ? 'closed' : owlState === 'sleepy' ? 'opening' : 'open'
  );
  const [fruits, setFruits] = useState<FallingFruit[]>([]);
  const fruitId = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fruit drop interval — every 5-10 seconds
  useEffect(() => {
    const dropFruit = () => {
      const id = fruitId.current++;
      const left = 25 + Math.random() * 50; // drop from 25%-75% of tree width
      setFruits(prev => [...prev, { id, emoji: seasonalFruit.emoji, left }]);
      // Remove after animation completes (2.5s)
      setTimeout(() => {
        setFruits(prev => prev.filter(f => f.id !== id));
      }, 2500);
    };

    const scheduleNext = () => {
      const delay = 5000 + Math.random() * 5000; // 5-10 seconds
      return setTimeout(() => {
        dropFruit();
        timeout.current = scheduleNext();
      }, delay);
    };

    // First drop after 2 seconds
    timeout.current = setTimeout(() => {
      dropFruit();
      timeout.current = scheduleNext();
    }, 2000);

    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [seasonalFruit.emoji]);

  const handleClick = useCallback(() => {
    playHoot();
    setDisturbed(true);
    setEyeState(owlState === 'sleeping' ? 'angry' : 'open');
    setTimeout(() => {
      setDisturbed(false);
      setEyeState(owlState === 'sleeping' ? 'closed' : 'open');
    }, 2500);
  }, [owlState]);

  return (
    <div style={styles.container}>
      {/* Willow Tree + Owl Scene */}
      <div style={styles.scene}>
        {/* Willow tree trunk */}
        <div style={styles.trunk} />

        {/* Drooping willow branches */}
        <div className="willow-branch willow-branch-1" />
        <div className="willow-branch willow-branch-2" />
        <div className="willow-branch willow-branch-3" />
        <div className="willow-branch willow-branch-4" />

        {/* Falling fruits */}
        {fruits.map(f => (
          <span key={f.id} className="fruit-drop" style={{ left: `${f.left}%`, top: '25%' }}>
            {f.emoji}
          </span>
        ))}

        {/* Owl */}
        <div
          style={styles.owl}
          className={`owl-mascot owl-breathe ${disturbed ? 'owl-disturbed' : ''} ${owlState === 'sleeping' ? 'owl-sleeping' : ''}`}
          onClick={handleClick}
          role="button"
          aria-label={`Click the owl! Today's fruit: ${seasonalFruit.name}`}
          tabIndex={0}
        >
          <svg viewBox="0 0 80 95" style={{ width: '100%', height: '100%' }}>
            {/* Body */}
            <ellipse cx="40" cy="48" rx="22" ry="26" fill={palette.body} />
            {/* Chest */}
            <ellipse cx="40" cy="55" rx="13" ry="16" fill={palette.chest} opacity="0.35" />
            {/* Wing lines */}
            <path d="M22,38 Q19,50 24,62" fill="none" stroke={palette.chest} strokeWidth="1.2" opacity="0.3" />
            <path d="M58,38 Q61,50 56,62" fill="none" stroke={palette.chest} strokeWidth="1.2" opacity="0.3" />
            {/* Ears */}
            <polygon points="25,26 28,14 33,28" fill={palette.body} />
            <polygon points="55,26 52,14 47,28" fill={palette.body} />

            {/* Eyes */}
            {eyeState === 'closed' ? (
              <>
                <path d="M30,38 Q35,41 40,38" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M40,38 Q45,41 50,38" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <text x="54" y="22" fontSize="8" fill="white" opacity="0.5" fontWeight="bold" className="owl-zzz">z</text>
                <text x="59" y="17" fontSize="6" fill="white" opacity="0.3" fontWeight="bold" className="owl-zzz-2">z</text>
              </>
            ) : eyeState === 'angry' ? (
              <>
                <circle cx="33" cy="36" r="8" fill="white" />
                <circle cx="47" cy="36" r="8" fill="white" />
                <circle cx="34" cy="35" r="5" fill={palette.pupil} />
                <circle cx="48" cy="35" r="5" fill={palette.pupil} />
                <circle cx="35" cy="34" r="1.5" fill="white" />
                <circle cx="49" cy="34" r="1.5" fill="white" />
                <line x1="26" y1="29" x2="37" y2="31" stroke={palette.pupil} strokeWidth="2" strokeLinecap="round" />
                <line x1="54" y1="29" x2="43" y2="31" stroke={palette.pupil} strokeWidth="2" strokeLinecap="round" />
              </>
            ) : eyeState === 'opening' ? (
              <>
                <ellipse cx="33" cy="36" rx="8" ry="5" fill="white" />
                <ellipse cx="47" cy="36" rx="8" ry="5" fill="white" />
                <circle cx="33" cy="37" r="3.5" fill={palette.pupil} />
                <circle cx="47" cy="37" r="3.5" fill={palette.pupil} />
              </>
            ) : (
              <>
                <circle cx="33" cy="36" r="8" fill="white" stroke={palette.pupil} strokeWidth="1" />
                <circle cx="47" cy="36" r="8" fill="white" stroke={palette.pupil} strokeWidth="1" />
                <circle cx="34" cy="35" r="5" fill={palette.pupil} />
                <circle cx="48" cy="35" r="5" fill={palette.pupil} />
                <circle cx="35.5" cy="33.5" r="2" fill="white" />
                <circle cx="49.5" cy="33.5" r="2" fill="white" />
              </>
            )}

            {/* Beak */}
            <polygon points="40,43 37,49 43,49" fill="#C9A96E" />

            {/* Feet */}
            <path d="M34,73 Q32,78 28,79" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" />
            <path d="M36,73 Q36,78 36,80" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" />
            <path d="M38,73 Q40,78 44,79" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" />
            <path d="M44,73 Q42,78 38,79" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" />
            <path d="M46,73 Q46,78 46,80" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" />
            <path d="M48,73 Q50,78 54,79" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Season label */}
        <div style={styles.seasonLabel}>
          {seasonalFruit.emoji} {seasonalFruit.name}
        </div>
      </div>

      {/* Daily PT Tip */}
      <div style={styles.tipWrap} className="owl-tip-enter">
        <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>📜</div>
        <div style={styles.tipContent}>
          <span style={styles.tipLabel}>The owl delivers...</span>
          <p style={styles.tipText}>{dailyTip.tip}</p>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(dailyTip.search)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.tipLink}
          >
            Learn more →
          </a>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  scene: {
    position: 'relative' as const,
    width: 'clamp(200px, 50vw, 300px)',
    height: '200px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    background: 'var(--green-bg)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    padding: '0.5rem',
  },
  trunk: {
    position: 'absolute' as const,
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '6px',
    height: '100px',
    background: 'var(--gray-text)',
    opacity: 0.3,
    borderRadius: '3px',
  },
  owl: {
    position: 'absolute' as const,
    bottom: '55px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '65px',
    height: '75px',
    cursor: 'pointer',
    zIndex: 5,
  },
  seasonLabel: {
    position: 'absolute' as const,
    bottom: '6px',
    fontSize: '0.6rem',
    color: 'var(--gray-text)',
    opacity: 0.7,
  },
  tipWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--gray-mid)',
    maxWidth: 'clamp(260px, 80vw, 420px)',
    width: '100%',
  },
  tipContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.2rem',
  },
  tipLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  tipText: {
    fontSize: '0.8rem',
    color: 'var(--dark)',
    lineHeight: 1.4,
  },
  tipLink: {
    fontSize: '0.7rem',
    color: 'var(--green-mid)',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
