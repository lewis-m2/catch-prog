import { useEffect, useState } from 'react';
import { keepAwake, type WakeLockEnv, type WakeLockStatus } from '../lib/wake-lock';

const browserEnv: WakeLockEnv = {
  // Undefined when unsupported, or on plain http (the API needs HTTPS or localhost).
  get wakeLock() {
    return navigator.wakeLock;
  },
  isVisible: () => document.visibilityState === 'visible',
  onVisibilityChange: (listener) => {
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  },
};

/** Holds a screen wake lock for as long as `active` is true. */
export function useWakeLock(active: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>('off');

  useEffect(() => {
    if (!active) return;
    return keepAwake(browserEnv, setStatus);
  }, [active]);

  return status;
}
