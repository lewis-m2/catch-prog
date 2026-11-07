import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('newId', () => {
  it('returns a v4 UUID', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('still returns a v4 UUID when randomUUID is missing (plain http)', () => {
    vi.stubGlobal('crypto', { getRandomValues: (array: Uint8Array) => webcrypto.getRandomValues(array) });
    const ids = new Set(Array.from({ length: 50 }, newId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
