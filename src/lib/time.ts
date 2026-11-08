// Stopwatch maths and time formatting. Pure functions: no React.
//
// A stopwatch is never a ticking counter. It stores when it was last started
// and how much time it had counted before that, and elapsed time is worked out
// from the clock. So a reload, screen lock or crash loses nothing.

export interface Stopwatch {
  /** Epoch ms when last started, or null when stopped. */
  startedAt: number | null;
  /** Time counted before `startedAt`. */
  accumulatedMs: number;
}

export function newStopwatch(): Stopwatch {
  return { startedAt: null, accumulatedMs: 0 };
}

export function isRunning(stopwatch: Stopwatch): boolean {
  return stopwatch.startedAt !== null;
}

export function elapsedMs(stopwatch: Stopwatch, now: number): number {
  const running = stopwatch.startedAt !== null ? Math.max(0, now - stopwatch.startedAt) : 0;
  return stopwatch.accumulatedMs + running;
}

export function startStopwatch(stopwatch: Stopwatch, at: number): Stopwatch {
  if (isRunning(stopwatch)) return stopwatch;
  return { startedAt: at, accumulatedMs: stopwatch.accumulatedMs };
}

export function stopStopwatch(stopwatch: Stopwatch, at: number): Stopwatch {
  if (!isRunning(stopwatch)) return stopwatch;
  return { startedAt: null, accumulatedMs: elapsedMs(stopwatch, at) };
}

/** Restarts a stopwatch stopped at `stoppedAt` as though it had never stopped. */
export function continueFrom(stopwatch: Stopwatch, stoppedAt: number): Stopwatch {
  return { startedAt: stoppedAt, accumulatedMs: stopwatch.accumulatedMs };
}

/**
 * The wall-clock time (epoch ms) at which an input event happened.
 *
 * `eventTimeStamp` is on the page's performance clock, which can fall behind
 * the wall clock after the phone sleeps. So only the short delay between the
 * touch and now is taken from it, and subtracted from `Date.now()`.
 */
export function tapTime(eventTimeStamp: number, perfNow = performance.now(), wallNow = Date.now()): number {
  return Math.round(wallNow - Math.max(0, perfNow - eventTimeStamp));
}

/**
 * `m:ss.s` (or `m:ss` without tenths). From an hour up: `h:mm:ss`.
 * Rounds down, as stopwatches do.
 */
export function formatClock(ms: number, { tenths = true } = {}): string {
  const totalTenths = Math.floor(Math.max(0, ms) / 100);
  const totalSeconds = Math.floor(totalTenths / 10);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  return tenths ? `${minutes}:${seconds}.${totalTenths % 10}` : `${minutes}:${seconds}`;
}

/** `+0:03.2` or `−0:05.0` (a real minus sign, so it's as wide as the plus). */
export function formatSigned(ms: number): string {
  return `${ms < 0 ? '−' : '+'}${formatClock(Math.abs(ms))}`;
}

/** Parses `m:ss`, `m:ss.s` or plain seconds (`45`, `45.5`) to ms. Null if not a valid time. */
export function parseDuration(text: string): number | null {
  const match = /^\s*(?:(\d+):)?(\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!match) return null;
  const [, minutesText, secondsText] = match;
  const seconds = Number(secondsText);
  if (minutesText !== undefined && seconds >= 60) return null;
  const ms = Math.round((Number(minutesText ?? 0) * 60 + seconds) * 1000);
  return ms > 0 ? ms : null;
}

/** `YYYY-MM-DD` in the phone's time zone. */
export function localDateString(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
