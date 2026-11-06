import { useEffect, useState } from 'react';
import { parseThemeSetting, resolveTheme, type ThemeSetting } from '../lib/theme';

// localStorage rather than IndexedDB: it can be read synchronously, so the
// correct theme is on screen from the first paint.
const STORAGE_KEY = 'launch.theme';
const THEME_COLOR = { sun: '#FFFFFF', dawn: '#0B0F12' };

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function loadThemeSetting(): ThemeSetting {
  try {
    return parseThemeSetting(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'sun'; // storage can be blocked; the app still has to work
  }
}

export function applyTheme(setting: ThemeSetting): void {
  const theme = resolveTheme(setting, darkQuery().matches);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

export function useTheme(): [ThemeSetting, (setting: ThemeSetting) => void] {
  const [setting, setSetting] = useState(loadThemeSetting);

  useEffect(() => {
    applyTheme(setting);
    try {
      localStorage.setItem(STORAGE_KEY, setting);
    } catch {
      // Not saved, but the theme still applies until the app is closed.
    }

    if (setting !== 'auto') return;
    const query = darkQuery();
    const onChange = () => applyTheme('auto');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [setting]);

  return [setting, setSetting];
}
