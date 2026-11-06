import { HAPTIC_GO, HAPTIC_TAP, vibrate } from '../lib/haptics';

const haptics = {
  tap: () => vibrate(HAPTIC_TAP),
  go: () => vibrate(HAPTIC_GO),
};

/** The on/off setting from SPEC §7d will be checked here when Settings arrives in Phase 3. */
export function useHaptics() {
  return haptics;
}
