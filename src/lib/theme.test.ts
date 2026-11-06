import { describe, expect, it } from 'vitest';
import { parseThemeSetting, resolveTheme } from './theme';

describe('parseThemeSetting', () => {
  it('keeps valid values', () => {
    expect(parseThemeSetting('sun')).toBe('sun');
    expect(parseThemeSetting('dawn')).toBe('dawn');
    expect(parseThemeSetting('auto')).toBe('auto');
  });

  it('defaults to sun for missing or unknown values', () => {
    expect(parseThemeSetting(null)).toBe('sun');
    expect(parseThemeSetting('neon')).toBe('sun');
  });
});

describe('resolveTheme', () => {
  it('uses an explicit choice whatever the phone prefers', () => {
    expect(resolveTheme('sun', true)).toBe('sun');
    expect(resolveTheme('dawn', false)).toBe('dawn');
  });

  it('follows the phone in auto', () => {
    expect(resolveTheme('auto', true)).toBe('dawn');
    expect(resolveTheme('auto', false)).toBe('sun');
  });
});
