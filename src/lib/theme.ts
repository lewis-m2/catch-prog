export type ThemeSetting = 'sun' | 'dawn' | 'auto';
export type ResolvedTheme = 'sun' | 'dawn';

/** Reads a stored value; anything unrecognised falls back to the default, Sun. */
export function parseThemeSetting(raw: string | null): ThemeSetting {
  return raw === 'dawn' || raw === 'auto' || raw === 'sun' ? raw : 'sun';
}

/** 'auto' follows the phone's dark-mode setting. */
export function resolveTheme(setting: ThemeSetting, phonePrefersDark: boolean): ResolvedTheme {
  if (setting === 'auto') return phonePrefersDark ? 'dawn' : 'sun';
  return setting;
}
