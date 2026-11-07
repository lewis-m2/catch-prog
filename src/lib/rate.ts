// Stroke-rate maths (SPEC §2). Pure functions: no React, no browser APIs.

export type StrokeCount = 1 | 2 | 3;
export const STROKE_COUNTS: StrokeCount[] = [1, 2, 3];

/** Results outside this range are treated as a missed or double tap. */
export const MIN_SPM = 10;
export const MAX_SPM = 60;

/** Changes smaller than this between readings count as steady. */
export const STEADY_BAND_SPM = 0.5;

export interface RateOptions {
  strokes: StrokeCount;
  /** When on, the tap that completes a reading also starts the next one. */
  continuous: boolean;
  /** A first tap older than this is discarded. */
  autoResetMs: number;
}

export type TapOutcome =
  | { kind: 'started' }
  | { kind: 'reading'; spm: number }
  | { kind: 'missed'; spm: number };

/** Rate = 60 × strokes ÷ seconds. */
export function strokeRate(strokes: StrokeCount, elapsedMs: number): number {
  return (60_000 * strokes) / elapsedMs;
}

export function isPlausibleRate(spm: number): boolean {
  return spm >= MIN_SPM && spm <= MAX_SPM;
}

/** True when a first tap has been waiting longer than the auto-reset time. */
export function isExpired(startedAt: number | null, now: number, options: RateOptions): boolean {
  return startedAt !== null && now - startedAt > options.autoResetMs;
}

/**
 * Applies one tap.
 *
 * `startedAt` is the time of the tap that began the current measurement, or
 * null when waiting for a first tap. Returns the new `startedAt` and what the
 * tap produced. A rate outside the sanity range is reported as missed and the
 * tap becomes a fresh first tap, so the coach can simply keep tapping.
 */
export function tap(
  startedAt: number | null,
  at: number,
  options: RateOptions,
): { startedAt: number | null; outcome: TapOutcome } {
  if (startedAt === null || isExpired(startedAt, at, options) || at <= startedAt) {
    return { startedAt: at, outcome: { kind: 'started' } };
  }

  const spm = strokeRate(options.strokes, at - startedAt);
  if (!isPlausibleRate(spm)) {
    return { startedAt: at, outcome: { kind: 'missed', spm } };
  }
  return { startedAt: options.continuous ? at : null, outcome: { kind: 'reading', spm } };
}

export type Trend = 'up' | 'down' | 'steady';

export function trend(previous: number, latest: number): Trend {
  const change = latest - previous;
  if (change >= STEADY_BAND_SPM) return 'up';
  if (change <= -STEADY_BAND_SPM) return 'down';
  return 'steady';
}

/** One decimal place, as shown on screen. */
export function formatSpm(spm: number): string {
  return spm.toFixed(1);
}
