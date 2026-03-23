import { useMemo } from 'react';
import { OwlMascot } from './OwlMascot.js';

interface OwlSceneProps {
  size: 'hero' | 'banner';
}

// ── Sky gradient based on EST hour ──
function getESTHour(): number {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return est.getHours() + est.getMinutes() / 60;
}

function getSkyGradient(hour: number): string {
  if (hour >= 5 && hour < 7)   return 'linear-gradient(180deg, #2D1B4E 0%, #E8737A 40%, #F5C06E 80%, #F5E6C8 100%)';  // Dawn
  if (hour >= 7 && hour < 10)  return 'linear-gradient(180deg, #87CEEB 0%, #B5E3F5 60%, #F5E6C8 100%)';               // Morning
  if (hour >= 10 && hour < 16) return 'linear-gradient(180deg, #5BA3D9 0%, #87CEEB 50%, #B5E3F5 100%)';               // Day
  if (hour >= 16 && hour < 19) return 'linear-gradient(180deg, #2D1B4E 0%, #C75B7A 30%, #E8937A 60%, #F5C06E 100%)';  // Dusk
  return 'linear-gradient(180deg, #0A0618 0%, #1A1035 40%, #2D1B4E 100%)';                                             // Night
}

function isNightTime(hour: number): boolean {
  return hour >= 19 || hour < 5;
}

// Sun/Moon progress
function getSunProgress(hour: number): number {
  if (hour >= 6 && hour < 20) return (hour - 6) / 14;
  return -1;
}
function getMoonProgress(hour: number): number {
  if (hour >= 20) return (hour - 20) / 10;
  if (hour < 6) return (hour + 4) / 10;
  return -1;
}

export function OwlScene({ size }: OwlSceneProps) {
  const hour = useMemo(() => getESTHour(), []);
  const skyGradient = useMemo(() => getSkyGradient(hour), [hour]);
  const isNight = useMemo(() => isNightTime(hour), [hour]);
  const sunProgress = useMemo(() => getSunProgress(hour), [hour]);
  const moonProgress = useMemo(() => getMoonProgress(hour), [hour]);

  const isHero = size === 'hero';
  const sceneHeight = isHero ? 'clamp(300px, 55vh, 500px)' : '150px';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: sceneHeight,
      overflow: 'hidden',
      borderRadius: isHero ? undefined : 'var(--radius-lg)',
      background: skyGradient,
      transition: 'background 60s linear',
    }}>

      {/* ── Layer 1: Stars ── */}
      <div className="owl-stars" style={{ opacity: isNight ? 0.9 : 0.15 }}>
        <span className="owl-star owl-star-1" />
        <span className="owl-star owl-star-2" />
        <span className="owl-star owl-star-3" />
        <span className="owl-star owl-star-4" />
        <span className="owl-star owl-star-5" />
        <span className="owl-star owl-star-6" />
        <span className="owl-star owl-star-7" />
        {isHero && <>
          <span className="owl-star" style={{ top: '8%', left: '5%', animationDelay: '1.2s' }} />
          <span className="owl-star" style={{ top: '18%', left: '42%', animationDelay: '2.1s', width: 2, height: 2 }} />
          <span className="owl-star" style={{ top: '6%', left: '68%', animationDelay: '0.3s' }} />
          <span className="owl-star" style={{ top: '22%', left: '92%', animationDelay: '1.8s', width: 2, height: 2 }} />
        </>}
      </div>

      {/* ── Layer 2: Sun / Moon ── */}
      {sunProgress >= 0 && (
        <div className="owl-sun" style={{ '--sky-progress': sunProgress } as React.CSSProperties} />
      )}
      {moonProgress >= 0 && (
        <div className="owl-moon" style={{ '--sky-progress': moonProgress } as React.CSSProperties} />
      )}

      {/* ── Layer 3: City Skyline Silhouette ── */}
      <svg
        viewBox="0 0 1200 200"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: 'absolute',
          bottom: isHero ? '35%' : '40%',
          left: 0,
          width: '100%',
          height: isHero ? '40%' : '50%',
          opacity: 0.6,
        }}
        className="scene-city"
      >
        {/* Regular buildings */}
        <rect x="50" y="120" width="40" height="80" fill="rgba(15,10,26,0.7)" />
        <rect x="100" y="100" width="30" height="100" fill="rgba(15,10,26,0.75)" />
        <rect x="140" y="130" width="50" height="70" fill="rgba(15,10,26,0.65)" />
        <rect x="200" y="90" width="35" height="110" fill="rgba(15,10,26,0.7)" />
        <rect x="245" y="110" width="25" height="90" fill="rgba(15,10,26,0.65)" />

        {/* ── Hospital Building ── */}
        <rect x="300" y="70" width="80" height="130" fill="rgba(15,10,26,0.75)" rx="2" />
        {/* Hospital cross on top */}
        <rect x="332" y="58" width="16" height="6" fill="rgba(200,80,80,0.6)" rx="1" />
        <rect x="337" y="52" width="6" height="18" fill="rgba(200,80,80,0.6)" rx="1" />
        {/* Hospital cross glow */}
        <circle cx="340" cy="61" r="12" fill="rgba(200,80,80,0.08)" />
        {/* Hospital windows grid */}
        <rect x="310" y="80" width="8" height="6" fill="rgba(245,230,200,0.15)" rx="1" />
        <rect x="325" y="80" width="8" height="6" fill="rgba(245,230,200,0.12)" rx="1" />
        <rect x="340" y="80" width="8" height="6" fill="rgba(245,230,200,0.15)" rx="1" />
        <rect x="355" y="80" width="8" height="6" fill="rgba(245,230,200,0.1)" rx="1" />
        <rect x="310" y="95" width="8" height="6" fill="rgba(245,230,200,0.1)" rx="1" />
        <rect x="325" y="95" width="8" height="6" fill="rgba(245,230,200,0.15)" rx="1" />
        <rect x="340" y="95" width="8" height="6" fill="rgba(245,230,200,0.12)" rx="1" />
        <rect x="355" y="95" width="8" height="6" fill="rgba(245,230,200,0.1)" rx="1" />
        <rect x="310" y="110" width="8" height="6" fill="rgba(245,230,200,0.12)" rx="1" />
        <rect x="340" y="110" width="8" height="6" fill="rgba(245,230,200,0.1)" rx="1" />
        {/* Hospital H entrance */}
        <rect x="328" y="170" width="24" height="30" fill="rgba(245,230,200,0.08)" rx="1" />

        {/* More buildings right side */}
        <rect x="410" y="105" width="45" height="95" fill="rgba(15,10,26,0.7)" />
        <rect x="465" y="85" width="30" height="115" fill="rgba(15,10,26,0.75)" />
        <rect x="505" y="120" width="55" height="80" fill="rgba(15,10,26,0.65)" />
        <rect x="570" y="95" width="25" height="105" fill="rgba(15,10,26,0.7)" />
        <rect x="605" y="115" width="40" height="85" fill="rgba(15,10,26,0.65)" />

        {/* Tall tower */}
        <rect x="680" y="60" width="20" height="140" fill="rgba(15,10,26,0.7)" />
        <polygon points="680,60 690,45 700,60" fill="rgba(15,10,26,0.7)" />
        {/* Antenna light */}
        <circle cx="690" cy="45" r="2" fill="rgba(200,80,80,0.4)" className="pulse-subtle" />

        <rect x="720" y="100" width="50" height="100" fill="rgba(15,10,26,0.65)" />
        <rect x="790" y="130" width="35" height="70" fill="rgba(15,10,26,0.7)" />
        <rect x="840" y="90" width="40" height="110" fill="rgba(15,10,26,0.7)" />
        <rect x="900" y="115" width="30" height="85" fill="rgba(15,10,26,0.65)" />
        <rect x="945" y="100" width="50" height="100" fill="rgba(15,10,26,0.7)" />
        <rect x="1010" y="125" width="35" height="75" fill="rgba(15,10,26,0.65)" />
        <rect x="1060" y="105" width="40" height="95" fill="rgba(15,10,26,0.7)" />
        <rect x="1120" y="135" width="50" height="65" fill="rgba(15,10,26,0.65)" />

        {/* Scattered lit windows on some buildings */}
        <rect x="415" y="115" width="5" height="4" fill="rgba(245,230,200,0.12)" />
        <rect x="430" y="130" width="5" height="4" fill="rgba(245,230,200,0.08)" />
        <rect x="475" y="95" width="5" height="4" fill="rgba(245,230,200,0.1)" />
        <rect x="515" y="140" width="5" height="4" fill="rgba(245,230,200,0.12)" />
        <rect x="850" y="100" width="5" height="4" fill="rgba(245,230,200,0.1)" />
        <rect x="955" y="110" width="5" height="4" fill="rgba(245,230,200,0.08)" />
      </svg>

      {/* ── Layer 4: Forest Mid ── */}
      <svg
        viewBox="0 0 1200 200"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: 'absolute',
          bottom: isHero ? '22%' : '25%',
          left: 0,
          width: '100%',
          height: isHero ? '45%' : '55%',
        }}
        className="scene-forest-mid"
      >
        {/* Medium trees — slightly lighter */}
        <polygon points="80,200 110,60 140,200" fill="rgba(20,15,30,0.7)" />
        <polygon points="160,200 185,80 210,200" fill="rgba(20,15,30,0.65)" />
        <polygon points="280,200 310,50 340,200" fill="rgba(20,15,30,0.7)" />
        <polygon points="420,200 445,70 470,200" fill="rgba(20,15,30,0.65)" />
        <polygon points="550,200 580,55 610,200" fill="rgba(20,15,30,0.7)" />
        <polygon points="700,200 725,75 750,200" fill="rgba(20,15,30,0.65)" />
        <polygon points="830,200 860,60 890,200" fill="rgba(20,15,30,0.7)" />
        <polygon points="950,200 975,80 1000,200" fill="rgba(20,15,30,0.65)" />
        <polygon points="1080,200 1110,65 1140,200" fill="rgba(20,15,30,0.7)" />
      </svg>

      {/* ── Layer 5: Forest Foreground ── */}
      <svg
        viewBox="0 0 1200 200"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: 'absolute',
          bottom: isHero ? '12%' : '10%',
          left: 0,
          width: '100%',
          height: isHero ? '55%' : '60%',
        }}
        className="scene-forest-front"
      >
        {/* Tall dark trees — foreground */}
        <polygon points="30,200 60,30 90,200" fill="rgba(10,8,20,0.9)" />
        <polygon points="120,200 155,50 190,200" fill="rgba(10,8,20,0.85)" />
        <polygon points="230,200 260,20 290,200" fill="rgba(10,8,20,0.9)" />
        <polygon points="350,200 380,40 410,200" fill="rgba(10,8,20,0.85)" />
        <polygon points="480,200 510,25 540,200" fill="rgba(10,8,20,0.9)" />
        <polygon points="600,200 630,45 660,200" fill="rgba(10,8,20,0.85)" />
        <polygon points="730,200 760,30 790,200" fill="rgba(10,8,20,0.9)" />
        <polygon points="850,200 880,35 910,200" fill="rgba(10,8,20,0.85)" />
        <polygon points="960,200 990,50 1020,200" fill="rgba(10,8,20,0.9)" />
        <polygon points="1080,200 1110,40 1140,200" fill="rgba(10,8,20,0.85)" />
      </svg>

      {/* ── Layer 6: Fog ── */}
      <div className="owl-fog" style={{ bottom: isHero ? '8%' : '5%' }} />

      {/* ── Layer 7: Owl on Branch ── */}
      <div style={{
        position: 'absolute',
        bottom: isHero ? '5%' : '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: isHero ? 'clamp(300px, 70vw, 500px)' : 'clamp(200px, 50vw, 350px)',
        zIndex: 5,
      }}>
        <OwlMascot embedded={true} showTip={isHero} />
      </div>
    </div>
  );
}
