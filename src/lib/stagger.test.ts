import { describe, expect, it } from 'vitest';
import {
  countdownNumber,
  crewResult,
  crewStartAt,
  crewStatus,
  equivalentDistanceM,
  formatDiff,
  nextProgFromActual,
  percentFromTime,
  planStagger,
  predictSec,
  progFromActual,
  roundTo,
  timeFromPercent,
  type PlanInput,
} from './stagger';

const CREWS = [
  { crewId: 'a', name: 'A', prog2kSec: 360 }, // 6:00
  { crewId: 'b', name: 'B', prog2kSec: 390 }, // 6:30
  { crewId: 'c', name: 'C', prog2kSec: 420 }, // 7:00
];

const input = (change: Partial<PlanInput> = {}): PlanInput => ({
  crews: CREWS,
  type: 'distance',
  distanceM: 1000,
  durationSec: 0,
  model: 'linear',
  rounding: 0.5,
  ...change,
});

describe('predictions', () => {
  it('linear: P × D / 2000', () => {
    expect(predictSec(420, 1000, 'linear')).toBe(210);
    expect(predictSec(400, 500, 'linear')).toBe(100);
  });

  it("Paul's law: the same as the 2k at 2000 m", () => {
    expect(predictSec(400, 2000, 'paul')).toBeCloseTo(400);
  });

  it("Paul's law: 5 s per 500 m faster for each halving of distance", () => {
    // 6:40 2k → 1:40 split; 1000 m → 1:35 split → 190 s; 500 m → 1:30 → 90 s.
    expect(predictSec(400, 1000, 'paul')).toBeCloseTo(190);
    expect(predictSec(400, 500, 'paul')).toBeCloseTo(90);
    // 4000 m → 1:45 split → 840 s.
    expect(predictSec(400, 4000, 'paul')).toBeCloseTo(840);
  });

  it('progFromActual undoes predictSec for both models', () => {
    for (const model of ['linear', 'paul'] as const) {
      for (const distance of [250, 1000, 1750, 5000]) {
        expect(progFromActual(predictSec(412.3, distance, model), distance, model)).toBeCloseTo(412.3);
      }
    }
  });

  it('rounds to the step', () => {
    expect(roundTo(14.74, 0.5)).toBe(14.5);
    expect(roundTo(14.76, 0.5)).toBe(15);
    expect(roundTo(14.4, 1)).toBe(14);
  });
});

describe('planStagger', () => {
  it('SPEC §5b worked example: A 6:00 / B 6:30 / C 7:00, 1000 m → C at 0, B +15 s, A +30 s', () => {
    const plan = planStagger(input())!;
    expect(plan.entries.map((e) => [e.name, e.offsetSec])).toEqual([
      ['C', 0],
      ['B', 15],
      ['A', 30],
    ]);
    expect(plan.entries.map((e) => e.predictedSec)).toEqual([210, 195, 180]);
    // All predicted to finish at master 3:30.
    expect(plan.finishSec).toBe(210);
    for (const e of plan.entries) expect(e.offsetSec + e.predictedSec).toBe(210);
  });

  it('keeps exact offsets and rounds the start to the setting', () => {
    const crews = [
      { crewId: 'x', name: 'X', prog2kSec: 400 },
      { crewId: 'y', name: 'Y', prog2kSec: 412.3 },
    ];
    const half = planStagger(input({ crews, distanceM: 1000 }))!;
    const x = half.entries.find((e) => e.crewId === 'x')!;
    expect(x.exactOffsetSec).toBeCloseTo(6.15);
    expect(x.offsetSec).toBe(6);
    const whole = planStagger(input({ crews, distanceM: 2000, rounding: 1 }))!;
    expect(whole.entries.find((e) => e.crewId === 'x')!.offsetSec).toBe(12);
  });

  it('time piece: plans the distance the fastest crew covers, so it rows the stated time', () => {
    const plan = planStagger(input({ type: 'time', durationSec: 180 }))!;
    expect(plan.calcDistanceM).toBeCloseTo(equivalentDistanceM(180, 360));
    expect(plan.calcDistanceM).toBeCloseTo(1000);
    const a = plan.entries.find((e) => e.crewId === 'a')!;
    expect(a.predictedSec).toBeCloseTo(180);
    // Same offsets as the 1000 m example.
    expect(plan.entries.map((e) => e.offsetSec)).toEqual([0, 15, 30]);
  });

  it("time piece with Paul's law converts linearly, then applies Paul's law", () => {
    const plan = planStagger(input({ type: 'time', durationSec: 180, model: 'paul' }))!;
    expect(plan.calcDistanceM).toBeCloseTo(1000);
    const c = plan.entries.find((e) => e.crewId === 'c')!;
    expect(c.predictedSec).toBeCloseTo(predictSec(420, 1000, 'paul'));
  });

  it('uses a nudged start as given and marks it', () => {
    const plan = planStagger(input({ nudges: { b: 17 } }))!;
    const b = plan.entries.find((e) => e.crewId === 'b')!;
    expect(b.offsetSec).toBe(17);
    expect(b.nudged).toBe(true);
    expect(b.exactOffsetSec).toBe(15);
  });

  it('moves every start so the first crew is at 0 when a nudge leaves nobody there', () => {
    // C (normally first, at 0) is set to +4 s. Nobody is at 0 now, so every start moves 4 s earlier.
    const plan = planStagger(input({ nudges: { c: 4 } }))!;
    expect(plan.entries.map((e) => [e.name, e.offsetSec])).toEqual([
      ['C', 0],
      ['B', 11],
      ['A', 26],
    ]);
    expect(plan.shiftSec).toBe(4);
    expect(plan.finishSec).toBe(206);
  });

  it('nothing to plan without crews', () => {
    expect(planStagger(input({ crews: [] }))).toBeNull();
  });

  it('one crew starts at 0', () => {
    expect(planStagger(input({ crews: [CREWS[0]!] }))!.entries[0]!.offsetSec).toBe(0);
  });
});

describe('live', () => {
  const master = 1_000_000;
  const entry = { offsetSec: 15, predictedSec: 195 };

  it('a crew starts at its offset unless the coach tapped Started', () => {
    expect(crewStartAt(entry, master)).toBe(master + 15_000);
    expect(crewStartAt({ ...entry, actualStartAt: master + 17_200 }, master)).toBe(master + 17_200);
  });

  it('goes waiting → GO! → rowing → finished', () => {
    expect(crewStatus(entry, master, master + 3_000)).toEqual({ kind: 'waiting', toGoMs: 12_000 });
    expect(crewStatus(entry, master, master + 15_500)).toEqual({ kind: 'go', elapsedMs: 500 });
    expect(crewStatus(entry, master, master + 25_000)).toEqual({ kind: 'rowing', elapsedMs: 10_000 });
    expect(crewStatus({ ...entry, finishAt: master + 210_000 }, master, master + 300_000)).toEqual({ kind: 'finished', timeMs: 195_000 });
  });

  it('a late start is timed from the tap', () => {
    const late = { ...entry, actualStartAt: master + 18_000 };
    expect(crewStatus(late, master, master + 28_000)).toEqual({ kind: 'rowing', elapsedMs: 10_000 });
  });

  it('counts down the last 5 seconds', () => {
    expect(countdownNumber(5_000)).toBe(5);
    expect(countdownNumber(4_200)).toBe(5);
    expect(countdownNumber(800)).toBe(1);
    expect(countdownNumber(5_100)).toBeNull();
    expect(countdownNumber(0)).toBeNull();
  });
});

describe('results', () => {
  const master = 1_000_000;

  it('actual vs predicted, and % of prognostic speed', () => {
    const result = crewResult({ offsetSec: 15, predictedSec: 195, baseProg2kSec: 390, finishAt: master + 15_000 + 192_600 }, master, 1000, 'linear')!;
    expect(result.actualSec).toBeCloseTo(192.6);
    expect(result.diffSec).toBeCloseTo(-2.4);
    expect(result.pctOfProg).toBeCloseTo((100 * 195) / 192.6);
  });

  it('% of prog uses the crew’s prognostic, not the adjusted time', () => {
    // Planned on an adjusted 6:40 but the crew's prog is 6:30.
    const result = crewResult({ offsetSec: 0, predictedSec: 200, baseProg2kSec: 390, finishAt: master + 200_000 }, master, 1000, 'linear')!;
    expect(result.diffSec).toBeCloseTo(0);
    expect(result.pctOfProg).toBeCloseTo(97.5);
  });

  it('no % without a prognostic, and no result before the finish', () => {
    expect(crewResult({ offsetSec: 0, predictedSec: 200, finishAt: master + 200_000 }, master, 1000, 'linear')!.pctOfProg).toBeNull();
    expect(crewResult({ offsetSec: 0, predictedSec: 200 }, master, 1000, 'linear')).toBeNull();
  });

  it('Use actual time: the next prediction equals what the crew did', () => {
    const prog = nextProgFromActual(199.2, 1000, 'linear');
    expect(prog).toBe(398.4);
    expect(predictSec(prog, 1000, 'linear')).toBeCloseTo(199.2);
    const paul = nextProgFromActual(190, 1000, 'paul');
    expect(paul).toBeCloseTo(400);
  });

  it('formats differences with a sign', () => {
    expect(formatDiff(-2.44)).toBe('−2.4 s');
    expect(formatDiff(3)).toBe('+3.0 s');
  });
});

describe('percent of prog', () => {
  it('97% is 3% slower in speed', () => {
    expect(timeFromPercent(400, 100)).toBe(400);
    expect(timeFromPercent(388, 97)).toBeCloseTo(400);
    expect(percentFromTime(388, 400)).toBeCloseTo(97);
  });
});
