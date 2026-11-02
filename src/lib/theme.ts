import { useCallback, useEffect, useState } from 'react';
import { getTheme, write, type Theme } from './storage';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches;
}

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

/** Tema persistido em `qcc:theme`; `system` acompanha o `prefers-color-scheme`. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    write('qcc:theme', t);
    setThemeState(t);
  }, []);

  return [theme, setTheme];
}
