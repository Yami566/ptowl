import { useEffect } from 'react';
import useLocalStorageState from 'use-local-storage-state';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useLocalStorageState<Theme>('ptowl-theme', {
    defaultValue: 'light',
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, setTheme } as const;
}
