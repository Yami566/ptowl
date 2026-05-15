import type { ReactNode } from 'react';

/**
 * SubmitButton — full-width orange CTA matching the betraiders pattern.
 * Disabled + loading-text swap while in-flight.
 */
interface SubmitButtonProps {
  children: ReactNode;
  isSubmitting?: boolean;
  loadingText?: string;
  disabled?: boolean;
}

export function SubmitButton({
  children,
  isSubmitting,
  loadingText = 'Working…',
  disabled,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isSubmitting}
      style={{
        ...styles.btn,
        ...(disabled || isSubmitting ? styles.btnDisabled : {}),
      }}
    >
      {isSubmitting ? loadingText : children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    padding: '0.875rem 1.5rem',
    background: 'var(--orange-mid)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
    minHeight: '44px',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
