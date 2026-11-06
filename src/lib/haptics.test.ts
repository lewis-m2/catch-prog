import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAPTIC_GO, vibrate } from './haptics';

afterEach(() => vi.unstubAllGlobals());

describe('vibrate', () => {
  it('passes the pattern to the device', () => {
    const deviceVibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate: deviceVibrate });

    expect(vibrate(HAPTIC_GO)).toBe(true);
    expect(deviceVibrate).toHaveBeenCalledWith(HAPTIC_GO);
  });

  it('does nothing when unsupported (iOS)', () => {
    vi.stubGlobal('navigator', {});
    expect(vibrate(HAPTIC_GO)).toBe(false);
  });
});
