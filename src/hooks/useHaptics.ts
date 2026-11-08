import { HAPTIC_GO, HAPTIC_TAP, vibrate } from '../lib/haptics';
import { useSettings } from '../state/settings';

// Checks the on/off setting at the moment of the tap, so it applies at once.
const whenOn = (pattern: VibratePattern) => () => {
  if (useSettings.getState().haptics) vibrate(pattern);
};

const haptics = {
  tap: whenOn(HAPTIC_TAP),
  go: whenOn(HAPTIC_GO),
};

export function useHaptics() {
  return haptics;
}
