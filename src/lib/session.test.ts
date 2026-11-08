import { describe, expect, it } from 'vitest';
import {
  createPiece,
  createSession,
  endSession,
  pauseRowing,
  resumeRowing,
  sessionTimes,
  splitPiece,
  splitRows,
  stopPiece,
  undoStopPiece,
} from './session';
import { elapsedMs, isRunning } from './time';

const MIN = 60_000;
const START = new Date(2026, 10, 8, 6, 0).getTime();

describe('session clock', () => {
  it('starts rowing straight away', () => {
    const session = createSession('s1', START);
    expect(session.date).toBe('2026-11-08');
    expect(sessionTimes(session, START + 5 * MIN)).toEqual({ totalMs: 5 * MIN, rowingMs: 5 * MIN, breakMs: 0 });
  });

  it('counts a pause as break time', () => {
    let session = createSession('s1', START);
    session = pauseRowing(session, START + 20 * MIN);
    session = resumeRowing(session, START + 25 * MIN);

    expect(sessionTimes(session, START + 40 * MIN)).toEqual({
      totalMs: 40 * MIN,
      rowingMs: 35 * MIN,
      breakMs: 5 * MIN,
    });
  });

  it('break time keeps growing while paused', () => {
    const session = pauseRowing(createSession('s1', START), START + 10 * MIN);
    expect(sessionTimes(session, START + 13 * MIN).breakMs).toBe(3 * MIN);
  });

  it('freezes all times when ended', () => {
    const ended = endSession(createSession('s1', START), START + 60 * MIN);
    expect(ended.endedAt).toBe(START + 60 * MIN);
    expect(isRunning(ended.rowing)).toBe(false);
    expect(sessionTimes(ended, START + 999 * MIN)).toEqual({ totalMs: 60 * MIN, rowingMs: 60 * MIN, breakMs: 0 });
  });

  it('records the time of each change for sync', () => {
    expect(pauseRowing(createSession('s1', START), START + 1000).updatedAt).toBe(START + 1000);
  });
});

describe('piece clock', () => {
  const start = () => createPiece('p1', 's1', { label: '3 × 500m #1', targetSec: 105 }, START);

  it('records splits as elapsed piece time', () => {
    let piece = start();
    piece = splitPiece(piece, START + 52_300);
    piece = splitPiece(piece, START + 105_000);
    expect(piece.splitsMs).toEqual([52_300, 105_000]);
  });

  it('stops, and ignores splits after stopping', () => {
    let piece = stopPiece(start(), START + 110_000);
    expect(piece.stoppedAt).toBe(START + 110_000);
    expect(elapsedMs(piece.clock, START + 999_999)).toBe(110_000);

    piece = splitPiece(piece, START + 120_000);
    expect(piece.splitsMs).toEqual([]);
  });

  it('undo stop carries on as though it was never stopped', () => {
    const stopped = stopPiece(start(), START + 30_000);
    const resumed = undoStopPiece(stopped, START + 33_000);
    expect(resumed.stoppedAt).toBeUndefined();
    expect(elapsedMs(resumed.clock, START + 40_000)).toBe(40_000);
  });

  it('undo stop does nothing to a running piece', () => {
    const running = start();
    expect(undoStopPiece(running, START + 1000)).toBe(running);
  });
});

describe('splitRows', () => {
  it('shows each lap and the running total', () => {
    expect(splitRows([50_000, 102_000])).toEqual([
      { label: '1', lapMs: 50_000, totalMs: 50_000 },
      { label: '2', lapMs: 52_000, totalMs: 102_000 },
    ]);
  });

  it('adds a Finish row from the last split to the stop', () => {
    expect(splitRows([50_000], 103_000)).toEqual([
      { label: '1', lapMs: 50_000, totalMs: 50_000 },
      { label: 'Finish', lapMs: 53_000, totalMs: 103_000 },
    ]);
  });

  it('has no rows for a piece without splits', () => {
    expect(splitRows([], 103_000)).toEqual([]);
  });
});
