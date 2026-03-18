import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// No passwords with phone auth — redirect to landing
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/', { replace: true }); }, [navigate]);
  return null;
}
