/**
 * EmailField — labeled email input with native browser validation.
 * Standard controlled-input pattern.
 */
interface EmailFieldProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function EmailField({ value, onChange, disabled, autoFocus }: EmailFieldProps) {
  return (
    <label style={styles.label}>
      <span style={styles.labelText}>Email</span>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@clinic.com"
        autoComplete="email"
        required
        disabled={disabled}
        autoFocus={autoFocus}
        style={styles.input}
      />
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.375rem',
  },
  labelText: {
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    fontWeight: 500,
  },
  input: {
    padding: '0.625rem 0.875rem',
    fontSize: '1rem',
    background: 'var(--off-white)',
    border: '1px solid var(--gray-light)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--dark)',
    fontFamily: 'inherit',
    outline: 'none',
  },
};
