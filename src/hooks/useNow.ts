import { useEffect, useState } from 'react';

const FRAME_INTERVAL_MS = 100; // about 10 updates a second is plenty for tenths

/**
 * The current time (epoch ms), re-rendering about 10 times a second while
 * `active`. This only drives the display: times themselves are always worked
 * out from stored timestamps, never by counting ticks.
 */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = -Infinity;
    const tick = (frameTime: number) => {
      if (frameTime - last >= FRAME_INTERVAL_MS) {
        last = frameTime;
        setNow(Date.now());
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return now;
}
