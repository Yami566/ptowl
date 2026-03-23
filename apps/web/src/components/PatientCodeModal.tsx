import { useState } from 'react';
import { apiRequest } from '../api/client.js';

interface PatientCodeModalProps {
  onClose: () => void;
  onLinked: () => void;
  initialCode?: string;
}

export function PatientCodeModal({ onClose, onLinked, initialCode }: PatientCodeModalProps) {
  const [code, setCode] = useState(initialCode?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (code.replace(/[^A-Z0-9]/gi, '').length < 4) {
      setError('Enter a valid code');
      return;
    }
    setLoading(true);
    setError('');

    const result = await apiRequest<{ id: string }>('/patient/link', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });

    if (result.ok) {
      onLinked();
    } else {
      const msg = result.error?.code === 'ALREADY_LINKED'
        ? 'This schedule is already linked to your account'
        : result.error?.code === 'CODE_EXPIRED'
          ? 'This code has expired'
          : result.error?.message || 'Invalid code';
      setError(msg);
    }
    setLoading(false);
  };

  const formatCode = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 4) return clean;
    return clean.slice(0, 4);
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal} role="dialog" aria-label="Enter patient code">
        <h2 style={styles.title}>Enter your schedule code</h2>
        <p style={styles.subtitle}>
          Your provider will give you a code like <strong>PTOWL-XXXX</strong>
        </p>

        <div style={styles.inputRow}>
          <span style={styles.prefix}>PTOWL-</span>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(formatCode(e.target.value)); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="XXXX"
            style={styles.input}
            maxLength={4}
            autoFocus
            autoComplete="off"
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Linking...' : 'Link Schedule'}
        </button>

        <button onClick={onClose} style={styles.cancelBtn}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
  modal: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    maxWidth: '360px',
    width: '90vw',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.8125rem',
    color: 'var(--gray-text)',
    marginBottom: '1.5rem',
    lineHeight: 1.4,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    marginBottom: '1rem',
  },
  prefix: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
  },
  input: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.25rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textAlign: 'center',
    width: '6rem',
    padding: '0.5rem',
    border: '2px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    outline: 'none',
    textTransform: 'uppercase' as const,
  },
  error: {
    fontSize: '0.8125rem',
    color: '#D32F2F',
    marginBottom: '0.75rem',
  },
  submitBtn: {
    display: 'block',
    width: '100%',
    padding: '0.75rem',
    background: 'var(--green-mid)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '0.5rem',
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '0.25rem',
  },
};
