import { Link } from 'react-router-dom';

/**
 * AuthFooterLink — small "New here? Sign Up" or "Already have an account?
 * Log In" pattern used below the form on every auth page.
 */
interface AuthFooterLinkProps {
  prefix: string;
  linkText: string;
  to: string;
}

export function AuthFooterLink({ prefix, linkText, to }: AuthFooterLinkProps) {
  return (
    <p style={styles.line}>
      {prefix}{' '}
      <Link to={to} style={styles.link}>
        {linkText}
      </Link>
    </p>
  );
}

const styles: Record<string, React.CSSProperties> = {
  line: {
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    textAlign: 'center' as const,
    margin: 0,
  },
  link: {
    color: 'var(--orange-mid)',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
