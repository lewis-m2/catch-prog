import { useEffect } from 'react';
import { resolveTheme, type ThemeSetting } from '../lib/theme';
import { useSettings } from '../state/settings';

const THEME_COLOR = { sun: '#FFFFFF', dawn: '#0B0F12' };

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(setting: ThemeSetting): void {
  const theme = resolveTheme(setting, darkQuery().matches);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

/** Keeps the page's theme in step with the setting, and with the phone when it is 'auto'. */
export function useApplyTheme(): void {
  const setting = useSettings((state) => state.theme);

  useEffect(() => {
    applyTheme(setting);
    if (setting !== 'auto') return;
    const query = darkQuery();
    const onChange = () => applyTheme('auto');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [setting]);
}
