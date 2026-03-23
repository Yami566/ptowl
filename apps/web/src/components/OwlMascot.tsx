import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ── Coraline Color Palette ──
const OWL = {
  body: '#4A3B6B',        // deep purple
  chest: '#6B5B95',       // muted lavender
  pupil: '#2D1B4E',       // dark purple
  pupilGlow: '#FFD700',   // golden glow (awake)
  beak: '#C9A96E',        // muted gold/bronze
  feet: '#C9A96E',
  branch: '#2A1B3D',      // dark purple-brown
  branchLight: '#3D2B55', // lighter branch accent
  twig: '#3D2B55',
  fog: 'rgba(107, 91, 149, 0.15)',
  star: '#E8D5B7',        // warm cream star
  moon: '#F5E6C8',        // pale moonlight
  moonGlow: 'rgba(245, 230, 200, 0.2)',
};

// ── Time-of-day states (EST) ──
type OwlState = 'sleeping' | 'sleepy' | 'awake' | 'alert';

function getOwlState(): { state: OwlState; hour: number } {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = est.getHours();
  if (hour >= 8 && hour < 17) return { state: 'sleeping', hour };
  if (hour >= 17 && hour < 20) return { state: 'sleepy', hour };
  if (hour >= 20 || hour < 5) return { state: 'awake', hour };
  return { state: 'sleepy', hour };
}

function getTimeString(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' EST';
}

// ── Daily PT Tips ──
const PT_TIPS = [
  { tip: "Hold stretches for 30 seconds, not 10 — your muscles need time to relax.", search: "physical therapy stretching duration" },
  { tip: "Ice for the first 48 hours, then switch to heat for chronic pain.", search: "ice vs heat therapy" },
  { tip: "The average person takes 6,000 steps per day. PT patients should aim for 8,000.", search: "daily step count health benefits" },
  { tip: "Your posture affects your breathing. Sit tall, breathe deep.", search: "posture and breathing connection" },
  { tip: "Balance exercises reduce fall risk by 23% in older adults.", search: "balance exercises fall prevention" },
  { tip: "Foam rolling before exercise increases range of motion by up to 10%.", search: "foam rolling benefits physical therapy" },
  { tip: "The rotator cuff has 4 muscles. Most people only know about one.", search: "rotator cuff muscles anatomy" },
  { tip: "Walking backwards strengthens your knees more than walking forwards.", search: "retro walking knee rehabilitation" },
  { tip: "Your fascia is one continuous sheet from head to toe.", search: "fascia anatomy physical therapy" },
  { tip: "Eccentric exercises heal tendons faster than concentric ones.", search: "eccentric exercise tendon healing" },
  { tip: "Grip strength is one of the best predictors of overall health.", search: "grip strength health predictor" },
  { tip: "The meniscus has limited blood supply — only the outer 1/3 heals well.", search: "meniscus blood supply healing" },
  { tip: "Aquatic therapy reduces joint stress by up to 90%.", search: "aquatic therapy benefits" },
  { tip: "Nerve gliding exercises can relieve carpal tunnel symptoms.", search: "nerve gliding exercises carpal tunnel" },
  { tip: "Your ACL takes 6-9 months to fully heal after reconstruction.", search: "ACL reconstruction recovery timeline" },
  { tip: "Diaphragmatic breathing activates the parasympathetic nervous system.", search: "diaphragmatic breathing benefits" },
  { tip: "Proprioception training prevents ankle sprains by 50%.", search: "proprioception training ankle sprain prevention" },
  { tip: "The IT band isn't a muscle — it's a thick band of fascia.", search: "IT band anatomy" },
  { tip: "Dry needling triggers a local twitch response in muscle knots.", search: "dry needling trigger points" },
  { tip: "Your spine has 33 vertebrae but only 24 are movable.", search: "spine vertebrae anatomy" },
  { tip: "Scapular stability is the foundation of shoulder health.", search: "scapular stabilization exercises" },
  { tip: "Hip flexor tightness is linked to lower back pain.", search: "hip flexor lower back pain connection" },
  { tip: "The gluteus maximus is the largest muscle in the human body.", search: "gluteus maximus anatomy" },
  { tip: "Plyometric exercises improve power output by 20-30%.", search: "plyometric exercises benefits" },
  { tip: "Cryotherapy sessions last 2-3 minutes at -200°F.", search: "cryotherapy physical therapy" },
  { tip: "The average physical therapist sees 12-16 patients per day.", search: "physical therapist daily patient load" },
  { tip: "Isometric exercises build strength without joint movement.", search: "isometric exercises benefits" },
  { tip: "Your Achilles tendon can withstand 1,000 pounds of force.", search: "Achilles tendon strength" },
  { tip: "Kinesiology tape lifts skin to improve lymphatic drainage.", search: "kinesiology tape mechanism" },
  { tip: "The WHO recommends 150 minutes of moderate exercise per week.", search: "WHO exercise recommendations" },
  { tip: "Cervical retraction exercises help reverse 'tech neck'.", search: "cervical retraction tech neck exercises" },
];

function getDailyTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return PT_TIPS[dayOfYear % PT_TIPS.length]!;
}

// ── PT Exercise names for the owl ──
const PT_EXERCISES = [
  'wing-stretch',      // wings extend out
  'head-rotation',     // 180° head turn
  'shoulder-shrug',    // body lifts up
  'side-bend',         // lean left then right
  'deep-breath',       // body expands (scale)
  'neck-retract',      // head pulls back
] as const;

// ── Owl hoot sound via Web Audio API ──
function playHoot() {
  try {
    const audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.type = 'sine';
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.setValueAtTime(500, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(250, audioCtx.currentTime + 0.35);
      gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
      osc2.type = 'sine';
      osc2.start(audioCtx.currentTime);
      osc2.stop(audioCtx.currentTime + 0.45);
    }, 350);
  } catch { /* Audio not supported */ }
}

export function OwlMascot() {
  const { state: owlState, hour } = useMemo(() => getOwlState(), []);
  const [time, setTime] = useState(getTimeString);
  const [disturbed, setDisturbed] = useState(false);
  const [eyeState, setEyeState] = useState<'closed' | 'opening' | 'open' | 'angry' | 'alert'>('closed');
  const [exercise, setExercise] = useState<typeof PT_EXERCISES[number] | null>(null);
  const disturbedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dailyTip = useMemo(() => getDailyTip(), []);
  const isNight = hour >= 20 || hour < 6;

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeString()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Set initial eye state
  useEffect(() => {
    if (owlState === 'awake' || owlState === 'alert') setEyeState('open');
    else if (owlState === 'sleepy') setEyeState('opening');
    else setEyeState('closed');
  }, [owlState]);

  // PT exercise loop — cycle through exercises
  useEffect(() => {
    if (owlState === 'sleeping') return; // Don't exercise while sleeping
    let idx = 0;
    const interval = setInterval(() => {
      setExercise(PT_EXERCISES[idx % PT_EXERCISES.length]!);
      // Clear exercise after animation completes
      setTimeout(() => setExercise(null), 3000);
      idx++;
    }, 8000); // New exercise every 8 seconds
    return () => clearInterval(interval);
  }, [owlState]);

  const handleOwlClick = useCallback(() => {
    if (owlState === 'sleeping' || owlState === 'sleepy') {
      setDisturbed(true);
      setEyeState('angry');
      playHoot();
      if (disturbedTimeout.current) clearTimeout(disturbedTimeout.current);
      disturbedTimeout.current = setTimeout(() => {
        setDisturbed(false);
        setEyeState(owlState === 'sleeping' ? 'closed' : 'opening');
      }, 3000);
    } else {
      playHoot();
      setDisturbed(true);
      setEyeState('alert');
      if (disturbedTimeout.current) clearTimeout(disturbedTimeout.current);
      disturbedTimeout.current = setTimeout(() => {
        setDisturbed(false);
        setEyeState('open');
      }, 2000);
    }
  }, [owlState]);

  const exerciseClass = exercise ? `owl-exercise-${exercise}` : '';

  return (
    <div style={styles.container}>
      {/* Scene with moon, stars, fog */}
      <div style={{ ...styles.scene, background: isNight ? 'radial-gradient(ellipse at 70% 20%, rgba(245,230,200,0.08) 0%, transparent 60%)' : undefined }}>

        {/* Stars (visible in both modes, brighter at night) */}
        <div className="owl-stars" style={{ opacity: isNight ? 0.9 : 0.3 }}>
          <span className="owl-star owl-star-1" />
          <span className="owl-star owl-star-2" />
          <span className="owl-star owl-star-3" />
          <span className="owl-star owl-star-4" />
          <span className="owl-star owl-star-5" />
          <span className="owl-star owl-star-6" />
          <span className="owl-star owl-star-7" />
        </div>

        {/* Moon */}
        {isNight && <div className="owl-moon" />}

        {/* Fog layer */}
        <div className="owl-fog" />

        {/* Branch + Owl */}
        <div style={styles.branchWrap} className="owl-branch-enter">
          <svg viewBox="0 0 300 50" style={styles.branch} className="owl-branch-sway">
            {/* Gnarled main branch — Coraline twisted style */}
            <path
              d="M-30,30 C20,28 40,35 80,30 S130,22 160,28 S210,35 240,26 S270,22 300,28"
              fill="none" stroke={OWL.branch} strokeWidth="9" strokeLinecap="round"
            />
            {/* Branch texture — knots and bark */}
            <path
              d="M-30,30 C20,32 40,27 80,32 S130,26 160,30"
              fill="none" stroke={OWL.branchLight} strokeWidth="3" strokeLinecap="round" opacity="0.4"
            />
            {/* Twisted twigs — bare, no leaves (Coraline) */}
            <path d="M60,30 Q55,15 65,8 Q70,5 68,2" fill="none" stroke={OWL.twig} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M100,28 Q110,18 105,10" fill="none" stroke={OWL.twig} strokeWidth="2" strokeLinecap="round" />
            <path d="M200,26 Q215,14 210,6" fill="none" stroke={OWL.twig} strokeWidth="2" strokeLinecap="round" />
            <path d="M240,28 Q248,20 252,18 Q256,22 254,28" fill="none" stroke={OWL.twig} strokeWidth="1.5" strokeLinecap="round" />
            {/* Purple wisps on branch tips */}
            <circle cx="68" cy="2" r="3" fill={OWL.fog} className="owl-wisp-1" />
            <circle cx="105" cy="10" r="2.5" fill={OWL.fog} className="owl-wisp-2" />
            <circle cx="210" cy="6" r="3" fill={OWL.fog} className="owl-wisp-3" />
          </svg>

          {/* The Owl */}
          <div
            style={styles.owl}
            className={`owl-mascot owl-breathe ${disturbed ? 'owl-disturbed' : ''} ${owlState === 'sleeping' ? 'owl-sleeping' : ''} ${exerciseClass}`}
            onClick={handleOwlClick}
            role="button"
            aria-label="Click the owl — it does PT exercises!"
            tabIndex={0}
          >
            <svg viewBox="0 0 120 130" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Wing left (extends for wing-stretch exercise) */}
              <ellipse cx="18" cy="65" rx="12" ry="22" fill={OWL.body} opacity="0.85"
                className="owl-wing-left" transform="rotate(15 18 65)" />
              {/* Wing right */}
              <ellipse cx="102" cy="65" rx="12" ry="22" fill={OWL.body} opacity="0.85"
                className="owl-wing-right" transform="rotate(-15 102 65)" />

              {/* Body */}
              <ellipse cx="60" cy="70" rx="30" ry="35" fill={OWL.body} />
              {/* Chest feather pattern */}
              <ellipse cx="60" cy="80" rx="18" ry="22" fill={OWL.chest} opacity="0.4" />
              {/* Chest V-pattern (Victorian detail) */}
              <path d="M48,65 L60,85 L72,65" fill="none" stroke={OWL.chest} strokeWidth="1" opacity="0.3" />
              <path d="M50,70 L60,88 L70,70" fill="none" stroke={OWL.chest} strokeWidth="0.8" opacity="0.2" />

              {/* Ear tufts */}
              <polygon points="35,38 40,20 48,40" fill={OWL.body} className="owl-ear-left" />
              <polygon points="85,38 80,20 72,40" fill={OWL.body} className="owl-ear-right" />

              {/* Eye area — head group for rotation exercise */}
              <g className="owl-head">
                {/* Eye circles background (slight glow for awake) */}
                {(eyeState === 'open' || eyeState === 'alert') && isNight && (
                  <>
                    <circle cx="45" cy="52" r="14" fill={OWL.moonGlow} />
                    <circle cx="75" cy="52" r="14" fill={OWL.moonGlow} />
                  </>
                )}

                {eyeState === 'closed' ? (
                  <>
                    <path d="M36,52 Q45,57 54,52" fill="none" stroke={OWL.star} strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M66,52 Q75,57 84,52" fill="none" stroke={OWL.star} strokeWidth="2.5" strokeLinecap="round" />
                    <text x="82" y="35" fontSize="11" fill={OWL.star} opacity="0.6" fontWeight="bold" className="owl-zzz">z</text>
                    <text x="90" y="28" fontSize="9" fill={OWL.star} opacity="0.4" fontWeight="bold" className="owl-zzz-2">z</text>
                  </>
                ) : eyeState === 'angry' ? (
                  <>
                    <circle cx="45" cy="52" r="12" fill="white" />
                    <circle cx="75" cy="52" r="12" fill="white" />
                    <circle cx="46" cy="51" r="7" fill={OWL.pupil} />
                    <circle cx="76" cy="51" r="7" fill={OWL.pupil} />
                    <circle cx="47" cy="50" r="2.5" fill="white" />
                    <circle cx="77" cy="50" r="2.5" fill="white" />
                    <line x1="34" y1="40" x2="50" y2="44" stroke={OWL.pupil} strokeWidth="3" strokeLinecap="round" />
                    <line x1="86" y1="40" x2="70" y2="44" stroke={OWL.pupil} strokeWidth="3" strokeLinecap="round" />
                    <text x="86" y="32" fontSize="16" fill={OWL.beak} fontWeight="bold">!</text>
                  </>
                ) : eyeState === 'opening' ? (
                  <>
                    <ellipse cx="45" cy="52" rx="11" ry="7" fill="white" />
                    <ellipse cx="75" cy="52" rx="11" ry="7" fill="white" />
                    <circle cx="45" cy="53" r="5" fill={OWL.pupil} />
                    <circle cx="75" cy="53" r="5" fill={OWL.pupil} />
                  </>
                ) : (
                  <>
                    <circle cx="45" cy="52" r="12" fill="white" stroke={OWL.pupil} strokeWidth="1.5" />
                    <circle cx="75" cy="52" r="12" fill="white" stroke={OWL.pupil} strokeWidth="1.5" />
                    <circle cx="46" cy="51" r={eyeState === 'alert' ? 8 : 7} fill={isNight ? OWL.pupilGlow : OWL.pupil} />
                    <circle cx="76" cy="51" r={eyeState === 'alert' ? 8 : 7} fill={isNight ? OWL.pupilGlow : OWL.pupil} />
                    <circle cx="48" cy="49" r="3" fill="white" />
                    <circle cx="78" cy="49" r="3" fill="white" />
                  </>
                )}

                {/* Beak */}
                <polygon points="60,62 55,70 65,70" fill={OWL.beak} />
              </g>

              {/* Feet */}
              <path d="M48,103 Q45,110 40,112" fill="none" stroke={OWL.feet} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M50,103 Q50,110 50,113" fill="none" stroke={OWL.feet} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M52,103 Q55,110 60,112" fill="none" stroke={OWL.feet} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M68,103 Q65,110 60,112" fill="none" stroke={OWL.feet} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M70,103 Q70,110 70,113" fill="none" stroke={OWL.feet} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M72,103 Q75,110 80,112" fill="none" stroke={OWL.feet} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Time display */}
        <div style={styles.timeWrap}>
          <span style={styles.timeText}>{time}</span>
          <span style={styles.timeState}>
            {exercise && !disturbed && '(stretching...)'}
            {!exercise && owlState === 'sleeping' && '(the owl is napping)'}
            {!exercise && owlState === 'sleepy' && '(the owl is drowsy)'}
            {!exercise && owlState === 'awake' && !disturbed && '(the owl is wide awake)'}
            {disturbed && owlState === 'sleeping' && '(hey! I was sleeping!)'}
            {disturbed && owlState === 'awake' && '(hoo hoo!)'}
          </span>
        </div>
      </div>

      {/* Daily PT Tip — Owl Messenger */}
      <div style={styles.tipWrap} className="owl-tip-enter">
        <div style={styles.tipEnvelope}>&#128220;</div>
        <div style={styles.tipContent}>
          <span style={styles.tipLabel}>The owl delivers...</span>
          <p style={styles.tipText}>{dailyTip.tip}</p>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(dailyTip.search)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.tipLink}
          >
            Learn more &rarr;
          </a>
        </div>
      </div>

      {isNight && (
        <div style={styles.nightBadge}>
          <span>&#127769;</span> Night mode
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  scene: {
    position: 'relative' as const,
    width: 'clamp(300px, 70vw, 500px)',
    height: '200px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  branchWrap: {
    position: 'relative' as const,
    width: '100%',
    height: '150px',
  },
  branch: {
    position: 'absolute' as const,
    bottom: '0',
    left: '-10%',
    width: '120%',
    height: '50px',
  },
  owl: {
    position: 'absolute' as const,
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'clamp(80px, 18vw, 120px)',
    height: 'clamp(90px, 20vw, 130px)',
    cursor: 'pointer',
    zIndex: 2,
  },
  timeWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.125rem',
    marginTop: '0.25rem',
  },
  timeText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: OWL.chest,
    letterSpacing: '0.02em',
  },
  timeState: {
    fontSize: '0.65rem',
    color: 'var(--gray-text)',
    fontStyle: 'italic',
  },
  tipWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.875rem 1.25rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    border: `1px solid ${OWL.chest}33`,
    boxShadow: `0 2px 16px ${OWL.body}15`,
    maxWidth: 'clamp(280px, 80vw, 480px)',
    width: '100%',
  },
  tipEnvelope: {
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  tipContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  tipLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: OWL.body,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  tipText: {
    fontSize: '0.85rem',
    color: 'var(--dark)',
    lineHeight: 1.5,
  },
  tipLink: {
    fontSize: '0.75rem',
    color: OWL.chest,
    fontWeight: 600,
    textDecoration: 'none',
  },
  nightBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    background: OWL.body,
    color: OWL.moon,
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
};
