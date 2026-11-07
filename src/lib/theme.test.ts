import { describe, expect, it } from 'vitest';
import { resolveTheme } from './theme';

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
