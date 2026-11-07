export type ThemeSetting = 'sun' | 'dawn' | 'auto';
export type ResolvedTheme = 'sun' | 'dawn';

/** 'auto' follows the phone's dark-mode setting. */
export function resolveTheme(setting: ThemeSetting, phonePrefersDark: boolean): ResolvedTheme {
  if (setting === 'auto') return phonePrefersDark ? 'dawn' : 'sun';
  return setting;
}
