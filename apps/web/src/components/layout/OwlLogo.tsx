/**
 * PTOWL logo — text only: "PT Owl"
 *
 * - "P" in orange (static)
 * - "T" in green (static)
 * - Space
 * - "O" in orange (animated — 15 variants, easter eggs)
 * - "WL" in green (static)
 *
 * The O is the only interactive/animated element.
 * 15 animation variants that rotate daily.
 * Easter eggs: red-eyes (Report Bug), halloween, christmas.
 * 5-second animation loop on desktop, single play on mobile.
 */

import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useOwlVariant } from '../../hooks/useOwlVariant.js';

interface OwlLogoProps {
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
}

export function OwlLogo({ size = 'md', linkTo }: OwlLogoProps) {
  const { className, easterEgg } = useOwlVariant();

  // Feather burst when owl is clicked
  const handleOwlClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    // canvas-confetti supports emoji shapes
    confetti({
      particleCount: 8,
      spread: 50,
      origin: { x, y },
      gravity: 0.8,
      ticks: 80,
      shapes: ['circle'],
      colors: ['#8B4513', '#A0522D', '#D2B48C', '#C9A96E', '#6B5B95'],
      scalar: 0.8,
    });
  }, []);

  // Responsive: use clamp() so logo scales between mobile and desktop
  const fontSize = size === 'sm' ? 'clamp(0.9rem, 2.5vw, 1.1rem)' : size === 'lg' ? 'clamp(1.5rem, 4vw, 2.4rem)' : 'clamp(1.1rem, 3vw, 1.5rem)';
  const oSize = size === 'sm' ? 'clamp(1rem, 3vw, 1.3rem)' : size === 'lg' ? 'clamp(1.8rem, 5vw, 2.9rem)' : 'clamp(1.3rem, 3.5vw, 1.8rem)';
  const gap = size === 'sm' ? '0.02em' : size === 'lg' ? '0.04em' : '0.03em';
  const wordGap = size === 'sm' ? '0.25em' : size === 'lg' ? '0.35em' : '0.3em';
  const subtitleSize = size === 'sm' ? 'clamp(0.4rem, 1.5vw, 0.5rem)' : size === 'lg' ? 'clamp(0.55rem, 1.5vw, 0.75rem)' : 'clamp(0.45rem, 1.5vw, 0.6rem)';

  // Easter eggs can override the O color
  const oColor = easterEgg === 'halloween'
    ? '#8B0000'
    : easterEgg === 'christmas'
      ? '#DC2626'
      : easterEgg === 'red-eyes'
        ? '#DC2626'
        : 'var(--orange-mid)';

  const oShadow = easterEgg === 'halloween'
    ? '0 0 12px rgba(139, 0, 0, 0.5)'
    : easterEgg === 'red-eyes'
      ? '0 0 20px rgba(220, 38, 38, 0.6)'
      : '0 0 8px rgba(255, 112, 67, 0.25)';

  const logoWithSubtitle = (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <span
        className="ptowl-logo"
        style={{ display: 'inline-flex', alignItems: 'baseline', letterSpacing: gap }}
        aria-label="PT OWL"
      >
        {/* P — orange */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize,
          fontWeight: 700,
          color: 'var(--orange-mid)',
        }}>P</span>

        {/* T — green */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize,
          fontWeight: 700,
          color: 'var(--green-dark)',
        }}>T</span>

        {/* Space between PT and Owl */}
        <span style={{ width: wordGap, display: 'inline-block' }} />

        {/* O — orange, animated (the owl head) */}
        <span
          className={className}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: oSize,
            fontWeight: 800,
            color: oColor,
            display: 'inline-block',
            lineHeight: 1,
            position: 'relative',
            top: size === 'lg' ? '-1px' : '0px',
            textShadow: oShadow,
          }}
        >O</span>

        {/* W — green */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize,
          fontWeight: 700,
          color: 'var(--green-dark)',
        }}>W</span>

        {/* L — with owl perched on horizontal bar */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize,
          fontWeight: 700,
          color: 'var(--green-dark)',
          position: 'relative' as const,
          display: 'inline-block',
        }}>
          L
          {/* Owl character (no circle) perched centered on L bar */}
          <span
            className="owl-on-L"
            onClick={handleOwlClick}
            role="button"
            aria-label="Click the owl for a surprise!"
            tabIndex={0}
            style={{
              position: 'absolute' as const,
              left: '50%',
              bottom: '80%',
              transform: 'translateX(-50%)',
              cursor: 'pointer',
              display: 'inline-block',
              lineHeight: 0,
            }}
          >
            <svg viewBox="0 0 60 58" style={{ height: '1em', width: 'auto' }}>
              {/* Owl body */}
              <ellipse cx="30" cy="28" rx="18" ry="20" fill="#E8F5E9" opacity="0.95" />
              {/* Ear tufts */}
              <polygon points="15,12 18,2 23,14" fill="#E8F5E9" opacity="0.9" />
              <polygon points="45,12 42,2 37,14" fill="#E8F5E9" opacity="0.9" />
              {/* Left eye */}
              <circle cx="23" cy="22" r="7" fill="white" stroke="#1B5E20" strokeWidth="1.2" />
              <circle cx="24" cy="21" r="4" fill="#1B5E20" />
              <circle cx="25.5" cy="19.5" r="1.5" fill="white" />
              {/* Right eye */}
              <circle cx="37" cy="22" r="7" fill="white" stroke="#1B5E20" strokeWidth="1.2" />
              <circle cx="38" cy="21" r="4" fill="#1B5E20" />
              <circle cx="39.5" cy="19.5" r="1.5" fill="white" />
              {/* Beak */}
              <polygon points="30,27 27,33 33,33" fill="#FF7043" />
              {/* Chest */}
              <ellipse cx="30" cy="38" rx="10" ry="8" fill="#C8E6C9" opacity="0.5" />
              {/* Feet gripping the L bar */}
              <path d="M24,47 Q21,52 18,53" fill="none" stroke="#FF7043" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M26,47 Q26,52 26,54" fill="none" stroke="#FF7043" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M28,47 Q31,52 34,53" fill="none" stroke="#FF7043" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M34,47 Q31,52 28,53" fill="none" stroke="#FF7043" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M36,47 Q36,52 36,54" fill="none" stroke="#FF7043" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M38,47 Q41,52 44,53" fill="none" stroke="#FF7043" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        </span>
      </span>

      {/* Subtitle */}
      <span style={{
        display: 'block',
        fontSize: subtitleSize,
        fontWeight: 500,
        color: 'var(--gray-text)',
        letterSpacing: '0.06em',
        textAlign: 'center',
        fontFamily: 'var(--font-body)',
        marginTop: '-0.1em',
      }}>Patient Owl</span>
    </span>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} style={{ textDecoration: 'none', cursor: 'pointer' }} aria-label="Go to PT Owl">
        {logoWithSubtitle}
      </Link>
    );
  }

  return logoWithSubtitle;
}
