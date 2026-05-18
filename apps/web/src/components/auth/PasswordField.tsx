/**
 * PasswordField — labeled password input.
 * Minimum 8 chars per Clerk's default validation rule.
 */
interface PasswordFieldProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoComplete?: 'current-password' | 'new-password';
}

export function PasswordField({
  value,
  onChange,
  disabled,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  return (
    <label style={styles.label}>
      <span style={styles.labelText}>Password</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        autoComplete={autoComplete}
        required
        minLength={8}
        disabled={disabled}
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
