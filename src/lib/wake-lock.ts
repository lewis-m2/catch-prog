export type WakeLockStatus = 'off' | 'on' | 'unsupported' | 'failed';

interface Sentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

/** The parts of the browser this needs. Passed in so tests can fake them. */
export interface WakeLockEnv {
  wakeLock?: { request(type: 'screen'): Promise<Sentinel> };
  isVisible(): boolean;
  onVisibilityChange(listener: () => void): () => void;
}

/**
 * Keeps the screen awake until the returned stop function is called.
 *
 * The browser drops the lock whenever the app is hidden (screen lock, app
 * switch), so it is requested again each time the app becomes visible. Any
 * failure, such as low battery mode, is reported as a status and never thrown.
 */
export function keepAwake(env: WakeLockEnv, onStatus: (status: WakeLockStatus) => void): () => void {
  const { wakeLock } = env;
  if (!wakeLock) {
    onStatus('unsupported');
    return () => {};
  }

  let stopped = false;
  let requesting = false;
  let sentinel: Sentinel | null = null;

  const release = (lock: Sentinel) => {
    lock.release().catch(() => {});
  };

  const acquire = async () => {
    if (stopped || requesting || sentinel || !env.isVisible()) return;
    requesting = true;
    try {
      const lock = await wakeLock.request('screen');
      if (stopped) {
        // stop() was called while the request was in flight.
        release(lock);
        return;
      }
      sentinel = lock;
      lock.addEventListener('release', () => {
        sentinel = null;
        if (!stopped) onStatus('off');
      });
      onStatus('on');
    } catch {
      if (!stopped) onStatus('failed');
    } finally {
      requesting = false;
    }
  };

  const removeListener = env.onVisibilityChange(() => void acquire());
  void acquire();

  return () => {
    stopped = true;
    removeListener();
    if (sentinel) release(sentinel);
    sentinel = null;
    onStatus('off');
  };
}
