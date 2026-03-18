import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Login is now handled inline on the landing page via phone auth
export function LoginPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/', { replace: true }); }, [navigate]);
  return null;
}
