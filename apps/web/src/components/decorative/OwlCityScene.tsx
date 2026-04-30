/**
 * OwlCityScene — purely decorative SVG hero illustration.
 *
 * An owl perched on a branch in front of an animated nighttime city
 * skyline. Twinkling stars, drifting clouds, flickering windows, a
 * slowly rotating moon, and the owl's eyes blinking on a 5-second
 * cadence. All animations are SMIL (<animate>) so no JS runs.
 *
 * Safety boundary
 * ───────────────
 * This component lives under `components/decorative/` and intentionally
 * imports NOTHING from:
 *   - contexts/ (no auth, no user state)
 *   - api/ (no network calls)
 *   - hooks/ (no Firebase, no localStorage)
 *
 * It only takes a `size` prop and emits inert SVG. Even if the SVG
 * somehow rendered malformed it cannot read or mutate user data,
 * cookies, localStorage, IndexedDB, or anything backend-adjacent.
 * Drop-in replaceable with a static PNG if anything ever breaks.
 *
 * Original artwork (paths drawn in code) — does not reproduce any
 * existing logo, character, or specific real-world skyline.
 */

interface OwlCitySceneProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_PX: Record<NonNullable<OwlCitySceneProps['size']>, number> = {
  sm: 120,
  md: 220,
  lg: 320,
};

export function OwlCityScene({ size = 'md', className }: OwlCitySceneProps) {
  const w = SIZE_PX[size];

  return (
    <svg
      width={w}
      height={Math.round(w * 0.65)}
      viewBox="0 0 320 208"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="An owl perched on a branch in front of a nighttime city skyline"
      className={className}
      style={{ display: 'block', maxWidth: '100%' }}
    >
      {/* ── definitions ────────────────────────────────────────────── */}
      <defs>
        {/* dusk-to-night sky gradient */}
        <linearGradient id="ocs-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0F2027" />
          <stop offset="55%" stopColor="#203A43" />
          <stop offset="100%" stopColor="#2C5364" />
        </linearGradient>

        {/* moonlight glow */}
        <radialGradient id="ocs-moonglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF8E1" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFF8E1" stopOpacity="0" />
        </radialGradient>

        {/* warm window glow */}
        <radialGradient id="ocs-windowglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD54F" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFD54F" stopOpacity="0" />
        </radialGradient>

        {/* drifting cloud */}
        <symbol id="ocs-cloud" viewBox="0 0 60 18" overflow="visible">
          <ellipse cx="14" cy="10" rx="14" ry="6" fill="#3E5C70" opacity="0.55" />
          <ellipse cx="32" cy="8" rx="18" ry="8" fill="#3E5C70" opacity="0.55" />
          <ellipse cx="50" cy="11" rx="10" ry="5" fill="#3E5C70" opacity="0.55" />
        </symbol>
      </defs>

      {/* ── sky ─────────────────────────────────────────────────────── */}
      <rect width="320" height="208" fill="url(#ocs-sky)" />

      {/* ── moon (slowly rotates its inner crater) ──────────────────── */}
      <circle cx="262" cy="34" r="32" fill="url(#ocs-moonglow)" />
      <circle cx="262" cy="34" r="18" fill="#FFF8E1" />
      <g opacity="0.35">
        <circle cx="256" cy="29" r="2" fill="#C5A572" />
        <circle cx="268" cy="36" r="1.6" fill="#C5A572" />
        <circle cx="260" cy="40" r="1.2" fill="#C5A572" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 262 34"
          to="360 262 34"
          dur="120s"
          repeatCount="indefinite"
        />
      </g>

      {/* ── twinkling stars ─────────────────────────────────────────── */}
      {[
        { x: 22, y: 18, r: 1.2, dur: 3.1 },
        { x: 60, y: 12, r: 0.9, dur: 4.4 },
        { x: 96, y: 24, r: 1.4, dur: 2.7 },
        { x: 132, y: 8, r: 0.8, dur: 5.0 },
        { x: 168, y: 22, r: 1.0, dur: 3.8 },
        { x: 210, y: 14, r: 1.3, dur: 2.4 },
        { x: 296, y: 56, r: 1.0, dur: 3.4 },
        { x: 308, y: 20, r: 0.7, dur: 4.6 },
        { x: 12, y: 56, r: 0.8, dur: 3.6 },
        { x: 78, y: 46, r: 1.1, dur: 4.0 },
      ].map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF">
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur={`${s.dur}s`}
            repeatCount="indefinite"
            begin={`${(i * 0.3) % 2}s`}
          />
        </circle>
      ))}

      {/* ── drifting clouds (left to right) ─────────────────────────── */}
      <g opacity="0.7">
        <use href="#ocs-cloud" x="-60" y="42" width="60" height="18">
          <animate attributeName="x" from="-60" to="380" dur="55s" repeatCount="indefinite" />
        </use>
        <use href="#ocs-cloud" x="-140" y="74" width="80" height="22">
          <animate
            attributeName="x"
            from="-140"
            to="400"
            dur="80s"
            repeatCount="indefinite"
            begin="-30s"
          />
        </use>
      </g>

      {/* ── city silhouette (back layer) ────────────────────────────── */}
      <g fill="#16242F">
        <rect x="0" y="124" width="36" height="48" />
        <rect x="32" y="106" width="28" height="66" />
        <rect x="58" y="118" width="22" height="54" />
        <rect x="78" y="98" width="34" height="74" />
        <rect x="110" y="112" width="20" height="60" />
        <rect x="128" y="100" width="42" height="72" />
        <rect x="168" y="116" width="24" height="56" />
        <rect x="190" y="92" width="32" height="80" />
        <rect x="220" y="118" width="20" height="54" />
        <rect x="238" y="108" width="26" height="64" />
        <rect x="262" y="124" width="20" height="48" />
        <rect x="280" y="100" width="40" height="72" />
        {/* a couple of antennae for variety */}
        <rect x="94" y="86" width="2" height="14" />
        <rect x="204" y="80" width="2" height="14" />
        <rect x="294" y="88" width="2" height="14" />
      </g>

      {/* ── flickering windows (front layer) ────────────────────────── */}
      <g>
        {[
          { x: 8, y: 134, dur: 2.3 },
          { x: 18, y: 134, dur: 3.1 },
          { x: 8, y: 148, dur: 4.0 },
          { x: 38, y: 116, dur: 2.7 },
          { x: 48, y: 116, dur: 3.5 },
          { x: 38, y: 130, dur: 4.2 },
          { x: 48, y: 130, dur: 2.9 },
          { x: 84, y: 108, dur: 3.3 },
          { x: 94, y: 108, dur: 4.4 },
          { x: 84, y: 124, dur: 2.5 },
          { x: 94, y: 124, dur: 3.7 },
          { x: 134, y: 110, dur: 4.1 },
          { x: 144, y: 110, dur: 2.6 },
          { x: 154, y: 110, dur: 3.4 },
          { x: 134, y: 126, dur: 4.5 },
          { x: 154, y: 126, dur: 2.8 },
          { x: 196, y: 102, dur: 3.0 },
          { x: 206, y: 102, dur: 4.3 },
          { x: 196, y: 116, dur: 2.4 },
          { x: 206, y: 116, dur: 3.6 },
          { x: 196, y: 130, dur: 4.0 },
          { x: 244, y: 118, dur: 2.7 },
          { x: 254, y: 118, dur: 3.5 },
          { x: 286, y: 108, dur: 4.2 },
          { x: 296, y: 108, dur: 2.9 },
          { x: 306, y: 108, dur: 3.3 },
          { x: 286, y: 124, dur: 4.4 },
          { x: 306, y: 124, dur: 2.5 },
        ].map((win, i) => (
          <g key={i}>
            <circle
              cx={win.x + 1.5}
              cy={win.y + 1.5}
              r="3.5"
              fill="url(#ocs-windowglow)"
              opacity="0.6"
            />
            <rect x={win.x} y={win.y} width="3" height="3" fill="#FFD54F">
              <animate
                attributeName="opacity"
                values="1;0.25;1;0.6;1"
                dur={`${win.dur}s`}
                repeatCount="indefinite"
                begin={`${(i * 0.17) % 3}s`}
              />
            </rect>
          </g>
        ))}
      </g>

      {/* ── branch ──────────────────────────────────────────────────── */}
      <g>
        <path
          d="M-10 168 C 60 158, 140 168, 230 162 L 330 158"
          stroke="#3E2723"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        {/* small twigs */}
        <path
          d="M120 162 q 6 -10 14 -8"
          stroke="#3E2723"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M200 160 q 8 -6 16 -2"
          stroke="#3E2723"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* a couple of leaves rustling */}
        <ellipse cx="138" cy="152" rx="3.5" ry="2" fill="#1B5E20" transform="rotate(-30 138 152)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-35 138 152;-25 138 152;-35 138 152"
            dur="3.5s"
            repeatCount="indefinite"
          />
        </ellipse>
        <ellipse cx="220" cy="155" rx="3" ry="1.8" fill="#1B5E20" transform="rotate(20 220 155)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="15 220 155;28 220 155;15 220 155"
            dur="4.2s"
            repeatCount="indefinite"
            begin="-1s"
          />
        </ellipse>
      </g>

      {/* ── owl perched on the branch ───────────────────────────────── */}
      <g transform="translate(150 100)">
        {/* gentle body sway */}
        <animateTransform
          attributeName="transform"
          type="translate"
          values="150 100;150 99;150 100;150 101;150 100"
          dur="6s"
          repeatCount="indefinite"
          additive="replace"
        />

        {/* tail */}
        <ellipse cx="0" cy="55" rx="14" ry="8" fill="#5D4037" />

        {/* body */}
        <ellipse cx="0" cy="40" rx="22" ry="28" fill="#6D4C41" />
        <ellipse cx="0" cy="46" rx="14" ry="20" fill="#A1887F" />
        {/* belly speckles */}
        <circle cx="-6" cy="40" r="1" fill="#5D4037" />
        <circle cx="4" cy="44" r="1" fill="#5D4037" />
        <circle cx="-2" cy="50" r="1" fill="#5D4037" />
        <circle cx="6" cy="54" r="1" fill="#5D4037" />
        <circle cx="-7" cy="56" r="1" fill="#5D4037" />

        {/* wings folded */}
        <path d="M -22 30 Q -28 50 -16 64 L -8 50 Z" fill="#4E342E" />
        <path d="M 22 30 Q 28 50 16 64 L 8 50 Z" fill="#4E342E" />

        {/* head — turns gently every 8s */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 0 18; 8 0 18; 0 0 18; -8 0 18; 0 0 18"
            dur="8s"
            repeatCount="indefinite"
          />
          {/* head ball */}
          <circle cx="0" cy="14" r="20" fill="#6D4C41" />
          {/* tufts */}
          <path d="M -16 -2 L -12 -10 L -8 -2 Z" fill="#5D4037" />
          <path d="M 16 -2 L 12 -10 L 8 -2 Z" fill="#5D4037" />
          {/* face disc */}
          <ellipse cx="0" cy="16" rx="14" ry="12" fill="#A1887F" />
          {/* eyes — yellow with black pupils that blink */}
          <circle cx="-6" cy="14" r="5" fill="#FFEB3B" />
          <circle cx="6" cy="14" r="5" fill="#FFEB3B" />
          <ellipse cx="-6" cy="14" rx="2.4" ry="2.4" fill="#1B1B1B">
            <animate
              attributeName="ry"
              values="2.4;2.4;2.4;0.2;2.4"
              keyTimes="0;0.7;0.85;0.9;1"
              dur="5s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse cx="6" cy="14" rx="2.4" ry="2.4" fill="#1B1B1B">
            <animate
              attributeName="ry"
              values="2.4;2.4;2.4;0.2;2.4"
              keyTimes="0;0.7;0.85;0.9;1"
              dur="5s"
              repeatCount="indefinite"
            />
          </ellipse>
          {/* eye highlights */}
          <circle cx="-5.2" cy="13" r="0.7" fill="#FFFFFF" opacity="0.9" />
          <circle cx="6.8" cy="13" r="0.7" fill="#FFFFFF" opacity="0.9" />
          {/* beak */}
          <polygon points="0,18 -3,24 3,24" fill="#FF7043" />
        </g>

        {/* talons gripping branch */}
        <g stroke="#3E2723" strokeWidth="1.5" fill="#3E2723" strokeLinecap="round">
          <line x1="-8" y1="62" x2="-10" y2="68" />
          <line x1="-4" y1="62" x2="-4" y2="68" />
          <line x1="0" y1="62" x2="0" y2="68" />
          <line x1="4" y1="62" x2="4" y2="68" />
          <line x1="8" y1="62" x2="10" y2="68" />
        </g>
      </g>

      {/* ── soft city haze at horizon ───────────────────────────────── */}
      <rect x="0" y="92" width="320" height="14" fill="#0F2027" opacity="0.35" />
    </svg>
  );
}
