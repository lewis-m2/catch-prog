import { describe, expect, it } from 'vitest';
import { formatSpm, isPlausibleRate, strokeRate, tap, trend, type RateOptions } from './rate';

const options: RateOptions = { strokes: 2, continuous: true, autoResetMs: 10_000 };

describe('strokeRate', () => {
  it('is 60 × strokes ÷ seconds', () => {
    expect(strokeRate(2, 4000)).toBe(30);
    expect(strokeRate(1, 2000)).toBe(30);
    expect(strokeRate(3, 5000)).toBe(36);
  });
});

describe('isPlausibleRate', () => {
  it('accepts 10 to 60 spm inclusive', () => {
    expect(isPlausibleRate(10)).toBe(true);
    expect(isPlausibleRate(60)).toBe(true);
    expect(isPlausibleRate(9.9)).toBe(false);
    expect(isPlausibleRate(60.1)).toBe(false);
  });
});

describe('tap', () => {
  it('starts timing on the first tap', () => {
    expect(tap(null, 1000, options)).toEqual({ startedAt: 1000, outcome: { kind: 'started' } });
  });

  it('gives a reading on the second tap', () => {
    // 2 strokes in 4.2 s = 28.57 spm
    const result = tap(1000, 5200, options);
    expect(result.outcome.kind).toBe('reading');
    expect(result.outcome.kind === 'reading' && formatSpm(result.outcome.spm)).toBe('28.6');
  });

  it('in continuous mode, the second tap also starts the next measurement', () => {
    const second = tap(1000, 5000, options);
    expect(second.startedAt).toBe(5000);

    const third = tap(second.startedAt, 9000, options);
    expect(third.outcome).toEqual({ kind: 'reading', spm: 30 });
  });

  it('without continuous mode, waits for a fresh first tap after a reading', () => {
    const single = { ...options, continuous: false };
    const second = tap(1000, 5000, single);
    expect(second).toEqual({ startedAt: null, outcome: { kind: 'reading', spm: 30 } });

    expect(tap(second.startedAt, 9000, single).outcome).toEqual({ kind: 'started' });
  });

  it('discards a first tap more than 10 s old and starts again', () => {
    expect(tap(1000, 11_001, options)).toEqual({ startedAt: 11_001, outcome: { kind: 'started' } });
  });

  it('still counts a tap exactly 10 s later', () => {
    // 3 strokes in 10 s = 18 spm
    const result = tap(1000, 11_000, { ...options, strokes: 3 });
    expect(result.outcome).toEqual({ kind: 'reading', spm: 18 });
  });

  it('reports a double tap as missed and restarts from it', () => {
    // 2 strokes in 0.15 s = 800 spm
    const result = tap(1000, 1150, options);
    expect(result.outcome.kind).toBe('missed');
    expect(result.startedAt).toBe(1150);
  });

  it('reports a too-slow rate as missed', () => {
    // 1 stroke in 8 s = 7.5 spm
    const result = tap(1000, 9000, { ...options, strokes: 1 });
    expect(result.outcome).toEqual({ kind: 'missed', spm: 7.5 });
  });

  it('treats a tap at or before the first one as a new start', () => {
    expect(tap(1000, 1000, options).outcome).toEqual({ kind: 'started' });
  });
});

describe('trend', () => {
  it('is up or down for changes of 0.5 spm or more', () => {
    expect(trend(28, 28.5)).toBe('up');
    expect(trend(28, 27.5)).toBe('down');
  });

  it('is steady for smaller changes', () => {
    expect(trend(28, 28.4)).toBe('steady');
    expect(trend(28, 27.6)).toBe('steady');
  });
});

describe('formatSpm', () => {
  it('shows one decimal place', () => {
    expect(formatSpm(28)).toBe('28.0');
    expect(formatSpm(28.46)).toBe('28.5');
  });
});
