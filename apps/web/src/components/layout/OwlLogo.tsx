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

import { Link } from 'react-router-dom';
import { useOwlVariant } from '../../hooks/useOwlVariant.js';

interface OwlLogoProps {
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
}

export function OwlLogo({ size = 'md', linkTo }: OwlLogoProps) {
  const { className, easterEgg } = useOwlVariant();

  const fontSize = size === 'sm' ? '1.1rem' : size === 'lg' ? '2.4rem' : '1.5rem';
  const oSize = size === 'sm' ? '1.3rem' : size === 'lg' ? '2.9rem' : '1.8rem';
  const gap = size === 'sm' ? '0.02em' : size === 'lg' ? '0.04em' : '0.03em';
  const wordGap = size === 'sm' ? '0.25em' : size === 'lg' ? '0.35em' : '0.3em';
  const subtitleSize = size === 'sm' ? '0.5rem' : size === 'lg' ? '0.75rem' : '0.6rem';

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

        {/* WL — green, uppercase */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize,
          fontWeight: 700,
          color: 'var(--green-dark)',
        }}>WL</span>
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
