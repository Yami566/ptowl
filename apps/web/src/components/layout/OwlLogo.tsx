/**
 * PTowl logo — text wordmark "PTOWL" with subtitle "Patience Trainer".
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
 *
 * Brand: PT in PTowl stands for "Patience Trainer". The owl is the mascot.
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
  const fontSize =
    size === 'sm'
      ? 'clamp(0.9rem, 2.5vw, 1.1rem)'
      : size === 'lg'
        ? 'clamp(2rem, 5vw, 3.2rem)'
        : 'clamp(1.1rem, 3vw, 1.5rem)';
  const oSize =
    size === 'sm'
      ? 'clamp(1rem, 3vw, 1.3rem)'
      : size === 'lg'
        ? 'clamp(2.4rem, 6vw, 3.8rem)'
        : 'clamp(1.3rem, 3.5vw, 1.8rem)';
  const gap = size === 'sm' ? '0.02em' : size === 'lg' ? '0.04em' : '0.03em';
  const wordGap = size === 'sm' ? '0.25em' : size === 'lg' ? '0.35em' : '0.3em';
  const subtitleSize =
    size === 'sm'
      ? 'clamp(0.4rem, 1.5vw, 0.5rem)'
      : size === 'lg'
        ? 'clamp(0.55rem, 1.5vw, 0.75rem)'
        : 'clamp(0.45rem, 1.5vw, 0.6rem)';

  // Easter eggs can override the O color
  const oColor =
    easterEgg === 'halloween'
      ? '#8B0000'
      : easterEgg === 'christmas'
        ? '#DC2626'
        : easterEgg === 'red-eyes'
          ? '#DC2626'
          : 'var(--orange-mid)';

  const oShadow =
    easterEgg === 'halloween'
      ? '0 0 12px rgba(139, 0, 0, 0.5)'
      : easterEgg === 'red-eyes'
        ? '0 0 20px rgba(220, 38, 38, 0.6)'
        : '0 0 8px rgba(255, 112, 67, 0.25)';

  const logoWithSubtitle = (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <span
        className="ptowl-logo"
        style={{ display: 'inline-flex', alignItems: 'baseline', letterSpacing: gap }}
        aria-label="PTOwl"
      >
        {/* P — orange */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize,
            fontWeight: 700,
            color: 'var(--orange-mid)',
          }}
        >
          P
        </span>

        {/* T — green */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize,
            fontWeight: 700,
            color: 'var(--green-dark)',
          }}
        >
          T
        </span>

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
        >
          O
        </span>

        {/* wl — green, lowercase to render the mark as "PTOwl" */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize,
            fontWeight: 700,
            color: 'var(--green-dark)',
          }}
        >
          wl
        </span>

        {/* Classic owl mascot — to the right of PTOWL */}
        <img
          src="/logo-120.svg"
          alt=""
          className="owl-on-L"
          onClick={handleOwlClick}
          role="button"
          aria-label="Click the owl for a surprise!"
          tabIndex={0}
          style={{
            width: size === 'lg' ? '80px' : size === 'sm' ? '40px' : '55px',
            height: 'auto',
            marginLeft: size === 'lg' ? '0.5em' : '0.3em',
            cursor: 'pointer',
            verticalAlign: 'middle',
          }}
        />
      </span>

      {/* Subtitle */}
      <span
        style={{
          display: 'block',
          fontSize: subtitleSize,
          fontWeight: 500,
          color: 'var(--gray-text)',
          letterSpacing: '0.06em',
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          marginTop: '-0.1em',
        }}
      >
        Patience Trainer Tool — Designed to help save time
      </span>
    </span>
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        style={{ textDecoration: 'none', cursor: 'pointer' }}
        aria-label="Go to PTowl home"
      >
        {logoWithSubtitle}
      </Link>
    );
  }

  return logoWithSubtitle;
}
