import { useEffect } from 'react';
import { appearanceVars } from '../lib/appearance';
import { resolveTheme, type ThemeSetting } from '../lib/theme';
import { useSettings, type SettingsData } from '../state/settings';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

/** The phone's status bar matches the app background. */
function themeColour(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
}

export function applyTheme(setting: ThemeSetting): void {
  document.documentElement.dataset.theme = resolveTheme(setting, darkQuery().matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColour());
}

/** Sets the theme, the coach's colours and the text size as CSS variables on <html>. */
export function applyAppearance(settings: SettingsData): void {
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(appearanceVars(settings))) {
    if (value === null) style.removeProperty(name);
    else style.setProperty(name, value);
  }
  applyTheme(settings.theme);
}

/** Keeps the page in step with the appearance settings, and with the phone when the theme is 'auto'. */
export function useApplyTheme(): void {
  const theme = useSettings((state) => state.theme);
  const accent = useSettings((state) => state.accent);
  const goColor = useSettings((state) => state.goColor);
  const stopColor = useSettings((state) => state.stopColor);
  const textScale = useSettings((state) => state.textScale);

  useEffect(() => {
    applyAppearance(useSettings.getState());
  }, [theme, accent, goColor, stopColor, textScale]);

  useEffect(() => {
    if (theme !== 'auto') return;
    const query = darkQuery();
    const onChange = () => applyTheme('auto');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);
}
