interface IdleWarningModalProps {
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

export function IdleWarningModal({ secondsLeft, onStay, onLogout }: IdleWarningModalProps) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div style={styles.overlay} role="alertdialog" aria-label="Idle timeout warning">
      <div style={styles.modal}>
        <span style={styles.owl} className="owl-blink" aria-hidden="true">O</span>
        <h2 style={styles.title}>The owl is getting sleepy...</h2>
        <p style={styles.subtitle}>Are you still there?</p>
        <p style={styles.text}>
          You'll be logged out in <strong style={styles.time}>{timeStr}</strong>
        </p>
        <button onClick={onStay} style={styles.stayBtn}>
          Stay signed in
        </button>
        <button onClick={onLogout} style={styles.logoutLink}>
          Log out now
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem',
    maxWidth: '380px',
    width: '90vw',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  owl: {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: '4rem',
    fontWeight: 800,
    color: 'var(--orange-mid)',
    marginBottom: '0.25rem',
    textShadow: '0 0 20px rgba(255, 112, 67, 0.4)',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.125rem',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--gray-text)',
    marginBottom: '0.25rem',
  },
  text: {
    fontSize: '0.9375rem',
    color: 'var(--dark-alt)',
    marginBottom: '1.5rem',
    lineHeight: 1.5,
  },
  time: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1rem',
    color: 'var(--orange-mid)',
  },
  stayBtn: {
    display: 'block',
    width: '100%',
    padding: '0.75rem 1.5rem',
    background: 'var(--green-mid)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '0.75rem',
  },
  logoutLink: {
    background: 'none',
    border: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '0.25rem',
  },
};
