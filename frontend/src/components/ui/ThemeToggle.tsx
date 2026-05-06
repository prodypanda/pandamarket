'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

/**
 * Dark mode toggle component.
 *
 * Persists preference to localStorage and applies the `dark` class to <html>.
 * Respects system preference when set to 'system'.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('pd_theme') as Theme | null;
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    } else {
      applyTheme('system');
    }
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else if (t === 'light') {
      root.classList.add('light');
    }
  }

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
    localStorage.setItem('pd_theme', next);
    applyTheme(next);
  }

  if (!mounted) return null;

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/10 transition-colors"
      title={`Theme: ${theme} (click to toggle)`}
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Moon className="h-5 w-5" strokeWidth={1.75} />
      ) : (
        <Sun className="h-5 w-5" strokeWidth={1.75} />
      )}
    </button>
  );
}
