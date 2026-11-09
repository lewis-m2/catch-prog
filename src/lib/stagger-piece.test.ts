import { describe, expect, it } from 'vitest';
import { mergeTable } from './prognostic';
import { planStagger } from './stagger';
import { crewTime } from './stagger-setup';
import {
  clearStart,
  closePiece,
  configOf,
  createStaggeredPiece,
  describePiece,
  endPiece,
  finishCrew,
  formatDuration,
  markStarted,
  predictedFinishMs,
  reopenPiece,
  undoFinish,
} from './stagger-piece';

const table = mergeTable([], []);
const crews = [
  { id: 'a', name: 'A', program: 'school' as const, boatClass: '8+', gender: 'W' as const, grade: 'U17', overrideProg2kSec: 360 },
  { id: 'c', name: 'C', program: 'school' as const, boatClass: '8+', gender: 'W' as const, grade: 'U17', overrideProg2kSec: 420 },
];
const times = crews.map((crew) => crewTime(crew, table, 'prog', crew.id === 'a' ? { a: { prog2kSec: 365, source: 'manual' } } : {}));
const config = { label: ' 2 × 1k ', mode: 'prog' as const, type: 'distance' as const, distanceM: 1000, durationSec: 0, model: 'linear' as const };
const plan = planStagger({
  crews: times.map((t) => ({ crewId: t.crewId, name: t.name, prog2kSec: t.sec! })),
  type: 'distance',
  distanceM: 1000,
  durationSec: 0,
  model: 'linear',
  rounding: 0.5,
})!;
const T0 = 1_000_000;
const piece = createStaggeredPiece('p1', 's1', T0, config, plan, times);

describe('createStaggeredPiece', () => {
  it('copies the plan in start order, with where each time came from', () => {
    expect(piece).toMatchObject({ kind: 'staggered', label: '2 × 1k', distanceM: 1000, calcDistanceM: 1000, startedAt: T0 });
    expect(piece.durationSec).toBeUndefined();
    expect(piece.entries.map((e) => [e.crewId, e.offsetSec, e.source, e.baseProg2kSec])).toEqual([
      ['c', 0, 'crew', 420],
      ['a', 27.5, 'session', 360],
    ]);
  });
});

describe('live changes', () => {
  it('Started records the actual start; it can be undone', () => {
    const started = markStarted(piece, 'a', T0 + 29_000);
    expect(started.entries[1]!.actualStartAt).toBe(T0 + 29_000);
    expect(clearStart(started, 'a', T0 + 30_000).entries[1]!.actualStartAt).toBeUndefined();
  });

  it("can't finish a crew before it started", () => {
    expect(finishCrew(piece, 'a', T0 + 10_000)).toBe(piece);
  });

  it('ends the piece when the last crew finishes; undo reopens it', () => {
    const one = finishCrew(piece, 'c', T0 + 210_000);
    expect(one.endedAt).toBeUndefined();
    expect(finishCrew(one, 'c', T0 + 211_000)).toBe(one); // a second tap doesn't move the finish
    const both = finishCrew(one, 'a', T0 + 211_000);
    expect(both.endedAt).toBe(T0 + 211_000);
    const undone = undoFinish(both, 'a', T0 + 212_000);
    expect(undone.endedAt).toBeUndefined();
    expect(undone.entries[1]!.finishAt).toBeUndefined();
  });

  it('a finished crew keeps its start', () => {
    const done = finishCrew(piece, 'c', T0 + 210_000);
    expect(markStarted(done, 'c', T0 + 220_000)).toBe(done);
  });

  it('End piece / reopen / close', () => {
    const ended = endPiece(piece, T0 + 300_000);
    expect(ended.endedAt).toBe(T0 + 300_000);
    expect(finishCrew(ended, 'c', T0 + 301_000)).toBe(ended);
    expect(reopenPiece(ended, T0 + 302_000).endedAt).toBeUndefined();
    expect(closePiece(piece, T0 + 5).closedAt).toBe(T0 + 5);
    expect(closePiece(piece, T0 + 5).endedAt).toBe(T0 + 5);
  });

  it('predicts the common finish on the master clock', () => {
    // C (7:00) rows 210 s from 0; A rows 182.5 s on 6:05 from 27.5 s.
    expect(predictedFinishMs(piece)).toBe(210_000);
  });

  it('Repeat uses the same crews and piece', () => {
    expect(configOf(piece)).toMatchObject({ crewIds: ['c', 'a'], type: 'distance', distanceM: 1000, model: 'linear', mode: 'prog' });
  });
});

describe('describe', () => {
  it('distance or time, with the label', () => {
    expect(describePiece({ label: '', type: 'distance', distanceM: 1000 })).toBe('1000 m');
    expect(describePiece({ label: 'Race pace', type: 'time', durationSec: 180 })).toBe('Race pace · 3:00');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
