/**
 * ClinicNameField — text input for the clinic / practice name used on signup.
 * Maps to Clerk's firstName field (we leave lastName empty). Surfaces in the
 * dashboard as user.display_name. PTOwl-specific copy ("Clinic name") since
 * the audience is therapy clinics, not individual users.
 */
interface ClinicNameFieldProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function ClinicNameField({ value, onChange, disabled, autoFocus }: ClinicNameFieldProps) {
  return (
    <label style={styles.label}>
      <span style={styles.labelText}>Clinic name</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Hooville Physical Therapy"
        autoComplete="organization"
        required
        maxLength={120}
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
