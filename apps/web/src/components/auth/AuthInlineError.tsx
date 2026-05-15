/**
 * AuthInlineError — red text used below the form to surface auth failures.
 * Renders null when empty so the form layout stays steady.
 */
interface AuthInlineErrorProps {
  message: string | null;
}

export function AuthInlineError({ message }: AuthInlineErrorProps) {
  if (!message) return null;
  return (
    <div role="alert" style={styles.box}>
      {message}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    padding: '0.625rem 0.75rem',
    background: 'rgba(229, 57, 53, 0.08)',
    border: '1px solid rgba(229, 57, 53, 0.3)',
    color: '#e53935',
    fontSize: '0.875rem',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center' as const,
  },
};
