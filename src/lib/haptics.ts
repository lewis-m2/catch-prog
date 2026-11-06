export const HAPTIC_TAP: VibratePattern = 15;
export const HAPTIC_GO: VibratePattern = [200, 100, 200];

/** Vibrates if the device can. iOS has no vibration API, so this does nothing there. */
export function vibrate(pattern: VibratePattern): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  return navigator.vibrate(pattern);
}
