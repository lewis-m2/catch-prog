import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGNOSTICS } from '../data/prognostics';
import defaultCsv from '../data/prognostics-default.csv?raw';
import {
  baseProg,
  formatProg,
  mergeTable,
  parseProg,
  parsePrognosticCsv,
  planImport,
  progKey,
  toPrognosticCsv,
  workingProg,
  type ProgEntry,
} from './prognostic';
import { GRADES } from './programme';

const W17_8: ProgEntry = { program: 'school', boatClass: '8+', gender: 'W', grade: 'U17', prog2kSec: 405 };
const M17_8: ProgEntry = { program: 'school', boatClass: '8+', gender: 'M', grade: 'U17', prog2kSec: 365 };
const DEFAULTS = [W17_8, M17_8];

describe('built-in tables', () => {
  it('parse with no errors', () => {
    const { rows, errors } = parsePrognosticCsv(defaultCsv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(110);
  });

  it('cover every grade of both programmes', () => {
    for (const program of ['school', 'club'] as const) {
      for (const grade of GRADES[program]) {
        expect(DEFAULT_PROGNOSTICS.some((r) => r.program === program && r.grade === grade), `${program} ${grade}`).toBe(true);
      }
    }
  });

  it('keep the spreadsheet times to the tenth', () => {
    const row = DEFAULT_PROGNOSTICS.find((r) => progKey(r) === 'school|8+|W|U17');
    expect(row?.prog2kSec).toBe(402.4);
    expect(formatProg(row!.prog2kSec)).toBe('6:42.4');
  });
});

describe('formatProg / parseProg', () => {
  it('round-trip tenths without floating-point slips', () => {
    for (const text of ['7:55.1', '6:00.0', '5:59.9', '10:03.6']) expect(formatProg(parseProg(text)!)).toBe(text);
  });

  it('rounds to the nearest tenth', () => {
    expect(formatProg(359.96)).toBe('6:00.0');
    expect(formatProg(402.44)).toBe('6:42.4');
  });

  it('rejects implausible 2k times', () => {
    expect(parseProg('3:59.9')).toBeNull();
    expect(parseProg('15:00.1')).toBeNull();
    expect(parseProg('abc')).toBeNull();
    expect(parseProg('6:45')).toBe(405);
  });
});

describe('parsePrognosticCsv', () => {
  it('reads the SPEC example and normalises spelling', () => {
    const { rows, errors } = parsePrognosticCsv('school,8+,W,U17,6:45.0\nCLUB, 4X+ ,m,premier,5:50');
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      W17_8,
      { program: 'club', boatClass: '4x+', gender: 'M', grade: 'Premier', prog2kSec: 350 },
    ]);
  });

  it('accepts tab-separated columns pasted from a spreadsheet, and skips header, comments and blanks', () => {
    const { rows, errors } = parsePrognosticCsv('# note\nprogram\tboatClass\tgender\tgrade\tprognostic2k\n\nschool\t8+\tW\tU17\t6:45.0\n');
    expect(errors).toEqual([]);
    expect(rows).toEqual([W17_8]);
  });

  it('reports each bad line with its number and a reason', () => {
    const { rows, errors } = parsePrognosticCsv(
      ['school,8+,W,U17,6:45.0', 'school,9+,W,U17,6:45', 'school,8+,X,U17,6:45', 'school,8+,W,Senior,6:45', 'school,8+,W,U17,2:00', 'a,b'].join('\n'),
    );
    expect(rows).toHaveLength(1);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5, 6]);
    expect(errors[2]!.message).toContain("isn't a school grade");
  });

  it('lets a later line for the same event win', () => {
    expect(parsePrognosticCsv('school,8+,W,U17,6:45.0\nschool,8+,W,U17,6:40.0').rows).toEqual([{ ...W17_8, prog2kSec: 400 }]);
  });

  it('round-trips through export', () => {
    expect(parsePrognosticCsv(toPrognosticCsv(DEFAULT_PROGNOSTICS)).rows).toEqual(DEFAULT_PROGNOSTICS);
  });
});

describe('mergeTable', () => {
  it("applies the coach's edits on top of the defaults and keeps the built-in time", () => {
    const table = mergeTable(DEFAULTS, [{ ...W17_8, prog2kSec: 410 }]);
    const row = table.find((r) => r.key === progKey(W17_8))!;
    expect(row).toMatchObject({ prog2kSec: 410, defaultProg2kSec: 405, isOverride: true });
    expect(table.find((r) => r.key === progKey(M17_8))).toMatchObject({ prog2kSec: 365, isOverride: false });
  });

  it('adds rows that are only in the edits, with no built-in time', () => {
    const extra: ProgEntry = { program: 'school', boatClass: '2-', gender: 'W', grade: 'U16', prog2kSec: 480 };
    const row = mergeTable(DEFAULTS, [extra]).find((r) => r.key === progKey(extra))!;
    expect(row.isOverride).toBe(true);
    expect(row.defaultProg2kSec).toBeUndefined();
  });

  it('a new set of defaults keeps the edits (an app update must not wipe them)', () => {
    const edits = [{ ...W17_8, prog2kSec: 410 }];
    const newDefaults = [{ ...W17_8, prog2kSec: 400 }, M17_8];
    expect(mergeTable(newDefaults, edits).find((r) => r.key === progKey(W17_8))).toMatchObject({
      prog2kSec: 410,
      defaultProg2kSec: 400,
    });
  });

  it('sorts by programme, grade (slowest first), women before men, then small boats up to big', () => {
    const table = mergeTable(DEFAULT_PROGNOSTICS, []);
    expect(table[0]).toMatchObject({ program: 'school', grade: 'Novice', gender: 'W' });
    expect(table.at(-1)).toMatchObject({ program: 'club', grade: 'Premier', boatClass: '8+', gender: 'M' });

    const u17 = table.filter((row) => row.program === 'school' && row.grade === 'U17');
    const genders = u17.map((row) => row.gender);
    expect(genders.indexOf('M')).toBeGreaterThan(genders.lastIndexOf('W'));
    const womenBoats = u17.filter((row) => row.gender === 'W').map((row) => row.boatClass);
    const order = ['1x', '2x', '2-', '4x', '4x+', '4-', '4+', '8+'];
    expect(womenBoats).toEqual([...womenBoats].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    expect(womenBoats.at(-1)).toBe('8+');
  });
});

describe('working 2k time precedence: session adjustment → crew override → table row', () => {
  const table = mergeTable(DEFAULTS, []);
  const crew = { program: 'school' as const, boatClass: '8+', gender: 'W' as const, grade: 'U17' };

  it('uses the table row by default', () => {
    expect(workingProg(crew, table)).toEqual({ sec: 405, source: 'table' });
  });

  it("uses the crew's override over the table", () => {
    expect(workingProg({ ...crew, overrideProg2kSec: 400 }, table)).toEqual({ sec: 400, source: 'crew' });
  });

  it("uses the session adjustment over the crew's override and the table", () => {
    expect(workingProg({ ...crew, overrideProg2kSec: 400 }, table, { prog2kSec: 395 })).toEqual({ sec: 395, source: 'session' });
    expect(workingProg(crew, table, { prog2kSec: 395 })).toEqual({ sec: 395, source: 'session' });
  });

  it('uses the edited table time when the coach changed the row', () => {
    expect(workingProg(crew, mergeTable(DEFAULTS, [{ ...W17_8, prog2kSec: 412 }]))).toEqual({ sec: 412, source: 'table' });
  });

  it('says so when there is nothing to go on', () => {
    expect(baseProg({ ...crew, boatClass: '1x' }, table)).toEqual({ sec: null, source: 'none' });
  });
});

describe('planImport', () => {
  const edit = { ...W17_8, prog2kSec: 410 };

  it('merge: saves changed rows and counts what changes', () => {
    const plan = planImport(DEFAULTS, [], [{ ...M17_8, prog2kSec: 360 }, W17_8], 'merge');
    expect(plan.put).toEqual([{ ...M17_8, prog2kSec: 360 }]);
    expect(plan).toMatchObject({ removeKeys: [], clearAll: false, changed: 1, unchanged: 1, added: 0 });
  });

  it('merge: a row back at its built-in time removes the edit instead of saving one', () => {
    const plan = planImport(DEFAULTS, [edit], [W17_8], 'merge');
    expect(plan.put).toEqual([]);
    expect(plan.removeKeys).toEqual([progKey(W17_8)]);
    expect(plan.changed).toBe(1);
  });

  it('merge: re-importing an export changes nothing', () => {
    const exported = parsePrognosticCsv(toPrognosticCsv(mergeTable(DEFAULTS, [edit]))).rows;
    const plan = planImport(DEFAULTS, [edit], exported, 'merge');
    expect(plan).toMatchObject({ put: [], removeKeys: [], changed: 0, added: 0, unchanged: 2 });
  });

  it('counts rows that are not in the table as added', () => {
    const extra: ProgEntry = { program: 'club', boatClass: '2-', gender: 'W', grade: 'Senior', prog2kSec: 470 };
    expect(planImport(DEFAULTS, [], [extra], 'merge')).toMatchObject({ put: [extra], added: 1 });
  });

  it('replace: clears every edit first, then saves the file', () => {
    const otherEdit = { ...M17_8, prog2kSec: 370 };
    const plan = planImport(DEFAULTS, [edit, otherEdit], [edit], 'replace');
    expect(plan.clearAll).toBe(true);
    expect(plan.put).toEqual([edit]);
    expect(plan.reverted).toBe(1);
  });
});
