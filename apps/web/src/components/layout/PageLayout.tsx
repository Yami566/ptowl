import { useState, useEffect, type ReactNode, type CSSProperties } from 'react';
import { ThemeToggle } from '../common/ThemeToggle.js';

interface PageLayoutProps {
  children: ReactNode;
}

/** Scroll progress indicator for right sidebar */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={scrollStyles.track}>
      <div style={{ ...scrollStyles.fill, height: `${progress}%` }} />
    </div>
  );
}

const scrollStyles: Record<string, CSSProperties> = {
  track: {
    width: '3px',
    height: '120px',
    background: 'var(--gray-mid)',
    borderRadius: '999px',
    overflow: 'hidden',
    opacity: 0.6,
  },
  fill: {
    width: '100%',
    background: 'var(--green-mid)',
    borderRadius: '999px',
    transition: 'height 0.1s',
  },
};

export function PageLayout({ children }: PageLayoutProps) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.shell}>
      {/* Left Sidebar — Decorative */}
      <aside style={styles.sidebar} className="page-sidebar page-sidebar-left" aria-hidden="true">
        <div className="sidebar-decor-left">
          {/* Decorative branch SVG */}
          <svg viewBox="0 0 60 400" style={{ width: '40px', height: '300px', opacity: 0.15 }}>
            <path d="M50,0 Q45,50 48,100 Q52,150 46,200 Q40,250 48,300 Q52,350 45,400"
              fill="none" stroke="var(--gray-text)" strokeWidth="2" />
            <path d="M48,80 Q30,70 20,60" fill="none" stroke="var(--gray-text)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M46,160 Q28,150 15,155" fill="none" stroke="var(--gray-text)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M48,250 Q32,240 22,245" fill="none" stroke="var(--gray-text)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="20" cy="60" r="2" fill="var(--gray-text)" opacity="0.3" />
            <circle cx="15" cy="155" r="2.5" fill="var(--gray-text)" opacity="0.2" />
            <circle cx="22" cy="245" r="2" fill="var(--gray-text)" opacity="0.3" />
          </svg>
        </div>
      </aside>

      {/* Main Content */}
      <div style={styles.content}>
        <div style={styles.themeToggleWrap} className="no-print">
          <ThemeToggle />
        </div>
        {children}
      </div>

      {/* Right Sidebar — Functional */}
      <aside style={styles.sidebar} className="page-sidebar page-sidebar-right" aria-label="Page tools">
        <div className="sidebar-tools-right">
          <ScrollProgress />
          <div style={styles.sidebarTime}>
            <span style={styles.sidebarTimeText}>{time}</span>
            <span style={styles.sidebarTimeLabel}>EST</span>
          </div>
        </div>
      </aside>

      <style>{responsiveCSS}</style>
    </div>
  );
}

const responsiveCSS = `
  .page-sidebar { display: none; }

  @media (min-width: 1200px) {
    .page-sidebar {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 0.75rem;
      position: sticky;
      top: 0;
      height: 100vh;
      justify-content: center;
    }

    .sidebar-decor-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      animation: sidebarFadeIn 1s ease-out 0.5s both;
    }

    .sidebar-tools-right {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      animation: sidebarFadeIn 1s ease-out 0.7s both;
    }
  }

  @keyframes sidebarFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media print {
    .page-sidebar { display: none !important; }
  }
`;

const styles: Record<string, CSSProperties> = {
  shell: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    minHeight: '100vh',
  },
  sidebar: {},
  content: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
  },
  themeToggleWrap: {
    position: 'fixed' as const,
    bottom: '1rem',
    right: '1rem',
    zIndex: 50,
    background: 'var(--white)',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarTime: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.125rem',
  },
  sidebarTimeText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--gray-text)',
    opacity: 0.6,
  },
  sidebarTimeLabel: {
    fontSize: '0.55rem',
    color: 'var(--gray-text)',
    opacity: 0.4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
};
