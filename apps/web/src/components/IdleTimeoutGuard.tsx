import { useAuth } from '../contexts/AuthContext.js';
import { useIdleTimeout } from '../hooks/useIdleTimeout.js';
import { IdleWarningModal } from './IdleWarningModal.js';

export function IdleTimeoutGuard() {
  const { user, logout, refreshUser } = useAuth();
  const { showWarning, secondsLeft, staySignedIn, logoutNow } = useIdleTimeout(
    logout,
    refreshUser,
    !!user && user.status !== 'pending',
  );

  if (!showWarning) return null;

  return (
    <IdleWarningModal
      secondsLeft={secondsLeft}
      onStay={staySignedIn}
      onLogout={logoutNow}
    />
  );
}
