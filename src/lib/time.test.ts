import { describe, expect, it } from 'vitest';
import {
  continueFrom,
  elapsedMs,
  formatClock,
  formatSigned,
  localDateString,
  newStopwatch,
  parseDuration,
  startStopwatch,
  stopStopwatch,
  tapTime,
} from './time';

describe('stopwatch', () => {
  it('counts from when it was started', () => {
    const running = startStopwatch(newStopwatch(), 1000);
    expect(elapsedMs(running, 1000)).toBe(0);
    expect(elapsedMs(running, 4500)).toBe(3500);
  });

  it('keeps its time while stopped and adds to it when restarted', () => {
    let stopwatch = startStopwatch(newStopwatch(), 0);
    stopwatch = stopStopwatch(stopwatch, 10_000);
    expect(elapsedMs(stopwatch, 50_000)).toBe(10_000); // stopped: no change

    stopwatch = startStopwatch(stopwatch, 60_000);
    expect(elapsedMs(stopwatch, 65_000)).toBe(15_000);
  });

  it('ignores start while running and stop while stopped', () => {
    const running = startStopwatch(newStopwatch(), 1000);
    expect(startStopwatch(running, 5000)).toBe(running);
    const stopped = stopStopwatch(running, 2000);
    expect(stopStopwatch(stopped, 9000)).toBe(stopped);
  });

  it('survives a reload: elapsed is worked out from the stored record', () => {
    const stored = JSON.parse(JSON.stringify(startStopwatch(newStopwatch(), 1000)));
    expect(elapsedMs(stored, 61_000)).toBe(60_000);
  });

  it('never goes negative if the clock is behind the start time', () => {
    expect(elapsedMs(startStopwatch(newStopwatch(), 5000), 4000)).toBe(0);
  });

  it('continueFrom carries on as though it had never stopped', () => {
    const stopped = stopStopwatch(startStopwatch(newStopwatch(), 0), 30_000);
    const resumed = continueFrom(stopped, 30_000);
    expect(elapsedMs(resumed, 45_000)).toBe(45_000);
  });
});

describe('tapTime', () => {
  it('subtracts the delay since the event from the wall clock', () => {
    expect(tapTime(1000, 1030, 5_000_000)).toBe(4_999_970);
  });

  it('never puts the tap in the future', () => {
    expect(tapTime(1050, 1030, 5_000_000)).toBe(5_000_000);
  });
});

describe('formatClock', () => {
  it('shows m:ss.s', () => {
    expect(formatClock(0)).toBe('0:00.0');
    expect(formatClock(83_456)).toBe('1:23.4');
    expect(formatClock(599_999)).toBe('9:59.9'); // rounds down
  });

  it('can leave off tenths', () => {
    expect(formatClock(83_456, { tenths: false })).toBe('1:23');
  });

  it('shows h:mm:ss from an hour', () => {
    expect(formatClock(3_600_000)).toBe('1:00:00');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });

  it('shows negative times as zero', () => {
    expect(formatClock(-500)).toBe('0:00.0');
  });
});

describe('formatSigned', () => {
  it('shows + for over and − for under', () => {
    expect(formatSigned(3200)).toBe('+0:03.2');
    expect(formatSigned(-5000)).toBe('−0:05.0');
    expect(formatSigned(0)).toBe('+0:00.0');
  });
});

describe('parseDuration', () => {
  it('reads m:ss and m:ss.s', () => {
    expect(parseDuration('1:45')).toBe(105_000);
    expect(parseDuration('1:45.5')).toBe(105_500);
    expect(parseDuration(' 7:00 ')).toBe(420_000);
  });

  it('reads plain seconds', () => {
    expect(parseDuration('45')).toBe(45_000);
    expect(parseDuration('90.5')).toBe(90_500);
  });

  it('rejects anything else', () => {
    for (const text of ['', 'abc', '1:75', '1:2:3', '-1:00', '0', '1:', ':30']) {
      expect(parseDuration(text), text).toBeNull();
    }
  });
});

describe('localDateString', () => {
  it('is YYYY-MM-DD in local time', () => {
    expect(localDateString(new Date(2026, 10, 5, 6, 30).getTime())).toBe('2026-11-05');
    expect(localDateString(new Date(2026, 0, 9, 23, 59).getTime())).toBe('2026-01-09');
  });
});
