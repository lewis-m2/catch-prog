import { describe, expect, it } from 'vitest';
import { mergeTable } from './prognostic';
import { crewTime, lastUsedTimes } from './stagger-setup';

const table = mergeTable([{ program: 'school', boatClass: '8+', gender: 'W', grade: 'U17', prog2kSec: 405 }], []);
const crew = { id: 'c1', name: 'Girls U17 8+', program: 'school' as const, boatClass: '8+', gender: 'W' as const, grade: 'U17' };

describe('working time precedence in a piece: session adjustment → crew override → table row', () => {
  it('table row', () => {
    expect(crewTime(crew, table, 'prog', {})).toMatchObject({ sec: 405, source: 'table' });
  });

  it('crew override beats the table', () => {
    expect(crewTime({ ...crew, overrideProg2kSec: 400 }, table, 'prog', {})).toMatchObject({ sec: 400, source: 'crew' });
  });

  it('session adjustment beats both, and the base is still the crew override', () => {
    const time = crewTime({ ...crew, overrideProg2kSec: 400 }, table, 'prog', { c1: { prog2kSec: 395, source: 'manual' } });
    expect(time).toMatchObject({ sec: 395, source: 'session', base: { sec: 400, source: 'crew' } });
  });

  it('no time when the crew has no row and no override', () => {
    expect(crewTime({ ...crew, grade: 'U15' }, table, 'prog', {})).toMatchObject({ sec: null, source: 'none' });
  });
});

describe('Custom mode', () => {
  it("the coach's custom time first", () => {
    expect(crewTime(crew, table, 'custom', {}, { c1: 410 }, { c1: 399 })).toMatchObject({ sec: 410, source: 'custom' });
  });

  it("then the crew's time in its last piece", () => {
    expect(crewTime(crew, table, 'custom', {}, {}, { c1: 399 })).toMatchObject({ sec: 399, source: 'last' });
  });

  it('then the Prog-mode time', () => {
    expect(crewTime(crew, table, 'custom', { c1: { prog2kSec: 395, source: 'actual' } })).toMatchObject({ sec: 395, source: 'session' });
  });

  it('Prog mode ignores custom times', () => {
    expect(crewTime(crew, table, 'prog', {}, { c1: 410 })).toMatchObject({ sec: 405, source: 'table' });
  });
});

describe('lastUsedTimes', () => {
  it('takes the most recent started staggered piece for each crew', () => {
    const times = lastUsedTimes([
      { kind: 'staggered', startedAt: 2, entries: [{ crewId: 'a', prog2kSec: 400 }] },
      { kind: 'staggered', startedAt: 1, entries: [{ crewId: 'a', prog2kSec: 390 }, { crewId: 'b', prog2kSec: 420 }] },
      { kind: 'simple', startedAt: 3 },
      { kind: 'staggered', entries: [{ crewId: 'a', prog2kSec: 1 }] },
    ]);
    expect(times).toEqual({ a: 400, b: 420 });
  });
});
