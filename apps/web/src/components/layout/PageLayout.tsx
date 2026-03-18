import type { ReactNode, CSSProperties } from 'react';

/**
 * PageLayout — responsive wrapper that adds ad sidebar zones on wide screens.
 *
 * On screens < 1200px: content fills the viewport as before.
 * On screens >= 1200px: 3-column grid with ad sidebars flanking the content.
 *
 * Usage:
 *   <PageLayout>
 *     <header>...</header>
 *     <main>...</main>
 *   </PageLayout>
 */

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div style={styles.shell}>
      <aside style={styles.adSidebar} className="ad-sidebar ad-sidebar-left" aria-label="Advertisement">
        <div style={styles.adSlot} className="ad-slot" data-ad-position="left-top" />
        <div style={styles.adSlot} className="ad-slot" data-ad-position="left-bottom" />
      </aside>

      <div style={styles.content}>
        {children}
      </div>

      <aside style={styles.adSidebar} className="ad-sidebar ad-sidebar-right" aria-label="Advertisement">
        <div style={styles.adSlot} className="ad-slot" data-ad-position="right-top" />
        <div style={styles.adSlot} className="ad-slot" data-ad-position="right-bottom" />
      </aside>

      <style>{responsiveCSS}</style>
    </div>
  );
}

const responsiveCSS = `
  /* Default: single-column, sidebars hidden */
  .ad-sidebar {
    display: none;
  }

  /* Wide screens: show 3-column grid with ad sidebars */
  @media (min-width: 1200px) {
    .ad-sidebar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 0.5rem;
      align-items: center;
    }

    .ad-slot {
      width: 160px;
      min-height: 600px;
      background: var(--gray-light);
      border: 1px dashed var(--gray-mid);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ad-slot::after {
      content: 'Ad Space';
      color: var(--gray-text);
      font-size: 0.75rem;
      font-weight: 500;
      opacity: 0.5;
    }
  }

  /* Extra-wide screens: wider ad slots */
  @media (min-width: 1600px) {
    .ad-slot {
      width: 300px;
    }
  }

  @media print {
    .ad-sidebar {
      display: none !important;
    }
  }
`;

const styles: Record<string, CSSProperties> = {
  shell: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    minHeight: '100vh',
  },
  adSidebar: {
    // Managed by CSS media queries above
  },
  content: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  adSlot: {
    // Managed by CSS media queries above
  },
};
