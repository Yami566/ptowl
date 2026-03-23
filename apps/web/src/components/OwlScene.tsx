import { useMemo } from 'react';
import { OwlMascot } from './OwlMascot.js';

interface OwlSceneProps {
  size: 'hero' | 'banner';
}

function getESTHour(): number {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return est.getHours() + est.getMinutes() / 60;
}

function getSkyGradient(hour: number): string {
  if (hour >= 5 && hour < 7)   return 'linear-gradient(180deg, #1a1035 0%, #c75b7a 35%, #f5c06e 70%, #f5e6c8 100%)';
  if (hour >= 7 && hour < 10)  return 'linear-gradient(180deg, #6ba3d4 0%, #a5d3f0 50%, #f5e6c8 100%)';
  if (hour >= 10 && hour < 16) return 'linear-gradient(180deg, #4a8ec7 0%, #7bc0e8 45%, #b5e3f5 100%)';
  if (hour >= 16 && hour < 19) return 'linear-gradient(180deg, #1a1035 0%, #9b4d6e 25%, #d4836a 55%, #f5c06e 100%)';
  return 'linear-gradient(180deg, #06020f 0%, #0f0a1a 30%, #1a1035 60%, #2d1b4e 100%)';
}

function isNightTime(hour: number): boolean {
  return hour >= 19 || hour < 5;
}

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
  const sceneHeight = isHero ? 'clamp(350px, 55vh, 550px)' : '160px';

  return (
    <div className="owl-scene" style={{
      position: 'relative',
      width: '100%',
      height: sceneHeight,
      overflow: 'hidden',
      background: skyGradient,
    }}>

      {/* Stars */}
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
        </>}
      </div>

      {/* Sun */}
      {sunProgress >= 0 && (
        <div className="owl-sun" style={{ '--sky-progress': sunProgress } as React.CSSProperties} />
      )}

      {/* Moon */}
      {moonProgress >= 0 && (
        <div className="owl-moon" style={{ '--sky-progress': moonProgress } as React.CSSProperties} />
      )}

      {/* ── City Skyline — CSS box-shadow technique (no SVG shapes) ── */}
      <div className="scene-skyline" style={{
        position: 'absolute',
        bottom: isHero ? '32%' : '35%',
        left: 0,
        right: 0,
        height: '1px',
      }} />

      {/* ── City window lights — tiny glowing dots ── */}
      {isNight && isHero && <div className="scene-windows" />}

      {/* ── Car traffic lights — flowing red/white streaks ── */}
      {isHero && (
        <div className="scene-traffic" style={{
          position: 'absolute',
          bottom: isHero ? '30%' : '33%',
          left: 0,
          right: 0,
          height: '3px',
        }}>
          <span className="traffic-light traffic-red traffic-red-1" />
          <span className="traffic-light traffic-red traffic-red-2" />
          <span className="traffic-light traffic-red traffic-red-3" />
          <span className="traffic-light traffic-white traffic-white-1" />
          <span className="traffic-light traffic-white traffic-white-2" />
          <span className="traffic-light traffic-white traffic-white-3" />
        </div>
      )}

      {/* ── Hilltop — organic CSS shape ── */}
      <div className="scene-hill" style={{
        position: 'absolute',
        bottom: 0,
        left: '-5%',
        right: '-5%',
        height: isHero ? '45%' : '50%',
      }} />

      {/* ── Tree silhouette — CSS organic shape ── */}
      {isHero && (
        <div className="scene-tree" style={{
          position: 'absolute',
          bottom: isHero ? '25%' : '20%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
          {/* Trunk */}
          <div className="scene-tree-trunk" />
          {/* Canopy */}
          <div className="scene-tree-canopy" />
        </div>
      )}

      {/* ── Owl ── */}
      <div style={{
        position: 'absolute',
        bottom: isHero ? '28%' : '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: isHero ? 'clamp(280px, 60vw, 450px)' : 'clamp(180px, 40vw, 300px)',
        zIndex: 5,
      }}>
        <OwlMascot embedded={true} showTip={isHero} />
      </div>
    </div>
  );
}
