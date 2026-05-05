import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? '' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const helpHref =
        'mailto:nurelimusabay@gmail.com?subject=' +
        encodeURIComponent('Something broke in PTowl') +
        '&body=' +
        encodeURIComponent(
          'I hit an unexpected error in PTowl. Details follow:\n\n' +
            (this.state.errorMessage || '(no message)') +
            '\n\nWhat I was doing when it happened: ',
        );

      return (
        <main style={styles.page}>
          <div style={styles.center}>
            <div style={styles.brand} aria-hidden="true">
              🦉
            </div>
            <div style={styles.card}>
              <h1 style={styles.title}>The owl flew off course.</h1>
              <p style={styles.message}>
                Something broke. The error has been logged and the page should recover with a
                refresh. If it keeps happening, let us know and we&apos;ll fix it.
              </p>
              <div style={styles.buttonRow}>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={styles.button}
                >
                  Refresh page
                </button>
                <a href="/" style={styles.buttonSecondary}>
                  Home
                </a>
                <a href={helpHref} style={styles.buttonTertiary}>
                  Send help request
                </a>
              </div>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--off-white)',
    padding: '1rem',
  },
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '100%',
    maxWidth: '480px',
  },
  brand: {
    fontSize: '3.5rem',
    marginBottom: '1.5rem',
    lineHeight: 1,
  },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem',
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.75rem',
  },
  message: {
    color: 'var(--gray-text)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    marginBottom: '1.75rem',
  },
  buttonRow: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  button: {
    padding: '0.75rem 1.25rem',
    background: 'var(--green-mid)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonSecondary: {
    display: 'inline-block',
    padding: '0.75rem 1.25rem',
    background: 'var(--white)',
    color: 'var(--green-dark)',
    border: '1px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.95rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  buttonTertiary: {
    display: 'inline-block',
    padding: '0.75rem 1.25rem',
    background: 'transparent',
    color: 'var(--gray-text)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.95rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
};
