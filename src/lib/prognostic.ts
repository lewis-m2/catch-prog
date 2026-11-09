// Prognostic tables (SPEC §4a): CSV import/export, the coach's edits on top of
// the built-in defaults, and which 2k time a crew uses. Pure functions.

import {
  BOAT_CLASSES,
  GRADES,
  normaliseBoatClass,
  normaliseGender,
  normaliseGrade,
  normaliseProgram,
  PROGRAMS,
  type Gender,
  type Program,
} from './programme';
import { parseDuration } from './time';

/** One row of a table: which event it is, and its 2k time in seconds. */
export interface ProgEntry {
  program: Program;
  boatClass: string;
  gender: Gender;
  grade: string;
  prog2kSec: number;
}

export type ProgEvent = Omit<ProgEntry, 'prog2kSec'>;

/** A row as shown in the app: the time in use, and the built-in time if the coach changed it. */
export interface PrognosticRow extends ProgEntry {
  key: string;
  /** The built-in time. Undefined for rows the coach added (by CSV import). */
  defaultProg2kSec?: number;
  /** True when the coach's edit is in use instead of the built-in time. */
  isOverride: boolean;
}

/** Times outside this are almost certainly typos (2k in under 4 or over 15 minutes). */
export const MIN_PROG_SEC = 4 * 60;
export const MAX_PROG_SEC = 15 * 60;

export const CSV_HEADER = 'program,boatClass,gender,grade,prognostic2k';

/** Identifies an event across the defaults, the coach's edits and imports. */
export function progKey(event: ProgEvent): string {
  return `${event.program}|${event.boatClass}|${event.gender}|${event.grade}`;
}

/** Times are kept to a tenth of a second. */
export function roundProg(sec: number): number {
  return Math.round(sec * 10) / 10;
}

export function sameProg(a: number, b: number): boolean {
  return Math.round(a * 10) === Math.round(b * 10);
}

/** `m:ss.s`, rounded to the nearest tenth (a prognostic time, not a stopwatch). */
export function formatProg(sec: number): string {
  const tenths = Math.round(sec * 10);
  const minutes = Math.floor(tenths / 600);
  const seconds = ((tenths % 600) / 10).toFixed(1).padStart(4, '0');
  return `${minutes}:${seconds}`;
}

/** Parses a typed 2k time. Null if it isn't a time or is outside the plausible range. */
export function parseProg(text: string): number | null {
  const ms = parseDuration(text);
  if (ms === null) return null;
  const sec = roundProg(ms / 1000);
  return sec >= MIN_PROG_SEC && sec <= MAX_PROG_SEC ? sec : null;
}

export interface CsvError {
  line: number;
  text: string;
  message: string;
}

/**
 * Parses `program,boatClass,gender,grade,prognostic2k` lines. Tabs work too, so
 * columns pasted straight from a spreadsheet are fine. Blank lines, `#` comments
 * and the header are skipped. If an event appears twice, the later line wins.
 */
export function parsePrognosticCsv(text: string): { rows: ProgEntry[]; errors: CsvError[] } {
  const byKey = new Map<string, ProgEntry>();
  const errors: CsvError[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || /^program\b/i.test(line)) return;
    const error = (message: string) => errors.push({ line: index + 1, text: line, message });

    const cells = line.split(/[,\t]/).map((cell) => cell.trim().replace(/^"(.*)"$/, '$1'));
    if (cells.length !== 5) return error(`Needs 5 columns: ${CSV_HEADER}`);
    const [programText, boatText, genderText, gradeText, timeText] = cells as [string, string, string, string, string];

    const program = normaliseProgram(programText);
    if (!program) return error(`Programme must be school or club, not "${programText}"`);
    const boatClass = normaliseBoatClass(boatText);
    if (!boatClass) return error(`Unknown boat class "${boatText}" (use ${BOAT_CLASSES.join(' ')})`);
    const gender = normaliseGender(genderText);
    if (!gender) return error(`Gender must be W or M, not "${genderText}"`);
    const grade = normaliseGrade(program, gradeText);
    if (!grade) return error(`"${gradeText}" isn't a ${program} grade (${GRADES[program].join(', ')})`);
    const prog2kSec = parseProg(timeText);
    if (prog2kSec === null) return error(`"${timeText}" isn't a 2k time between 4:00 and 15:00 (use m:ss.s)`);

    const entry = { program, boatClass, gender, grade, prog2kSec };
    byKey.set(progKey(entry), entry);
  });

  return { rows: [...byKey.values()], errors };
}

export function toPrognosticCsv(rows: ProgEntry[]): string {
  const lines = rows.map((row) => [row.program, row.boatClass, row.gender, row.grade, formatProg(row.prog2kSec)].join(','));
  return [CSV_HEADER, ...lines].join('\n') + '\n';
}

/** The table in use: built-in rows, with the coach's edits applied, plus any rows the coach added. */
export function mergeTable(defaults: ProgEntry[], overrides: ProgEntry[]): PrognosticRow[] {
  const edits = new Map(overrides.map((entry) => [progKey(entry), entry]));
  const rows: PrognosticRow[] = defaults.map((entry) => {
    const key = progKey(entry);
    const edit = edits.get(key);
    edits.delete(key);
    return edit
      ? { ...entry, key, prog2kSec: edit.prog2kSec, defaultProg2kSec: entry.prog2kSec, isOverride: true }
      : { ...entry, key, defaultProg2kSec: entry.prog2kSec, isOverride: false };
  });
  for (const [key, entry] of edits) rows.push({ ...entry, key, isOverride: true });
  return sortTable(rows);
}

/** Programme, then grade (slowest first), then women before men, then small boats up to big (1x … 8+). */
export function sortTable<T extends ProgEvent>(rows: T[]): T[] {
  const rank = (row: T) => [
    PROGRAMS.indexOf(row.program),
    GRADES[row.program].indexOf(row.grade),
    row.gender === 'W' ? 0 : 1,
    // BOAT_CLASSES runs big to small, so a higher index is a smaller boat and comes first.
    -(BOAT_CLASSES as readonly string[]).indexOf(row.boatClass),
  ];
  return [...rows].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i]! - rb[i]!;
    return 0;
  });
}

export function findRow(table: PrognosticRow[], event: ProgEvent): PrognosticRow | undefined {
  const key = progKey(event);
  return table.find((row) => row.key === key);
}

export type ProgSource = 'session' | 'crew' | 'table' | 'none';

export const PROG_SOURCE_LABEL: Record<ProgSource, string> = {
  session: 'session',
  crew: 'crew override',
  table: 'table',
  none: 'no prognostic',
};

export interface CrewProgInput extends ProgEvent {
  overrideProg2kSec?: number;
}

export interface WorkingProg {
  /** Null when there is no adjustment, no crew override and no table row. */
  sec: number | null;
  source: ProgSource;
}

/**
 * The 2k time a crew rows to, in order of precedence (SPEC §8):
 * this session's adjustment → the crew's own override → the table row for its event.
 */
export function workingProg(
  crew: CrewProgInput,
  table: PrognosticRow[],
  sessionAdjustment?: { prog2kSec: number },
): WorkingProg {
  if (sessionAdjustment) return { sec: sessionAdjustment.prog2kSec, source: 'session' };
  return baseProg(crew, table);
}

/** The crew's time without any session adjustment: its override, or the table row. */
export function baseProg(crew: CrewProgInput, table: PrognosticRow[]): WorkingProg {
  if (crew.overrideProg2kSec !== undefined) return { sec: crew.overrideProg2kSec, source: 'crew' };
  const row = findRow(table, crew);
  return row ? { sec: row.prog2kSec, source: 'table' } : { sec: null, source: 'none' };
}

export type ImportMode = 'merge' | 'replace';

export interface ImportPlan {
  /** Edits to save (rows that differ from the built-in time, or have none). */
  put: ProgEntry[];
  /** Keys of edits to remove (the row goes back to its built-in time). */
  removeKeys: string[];
  /** In replace mode: remove every existing edit first. */
  clearAll: boolean;
  added: number;
  changed: number;
  unchanged: number;
  /** Replace only: the coach's edits not in the file, which go back to the built-in time (or are removed). */
  reverted: number;
}

/**
 * Works out what an import does. Merge updates the rows in the file and keeps
 * the coach's other edits; replace clears every edit first. A row that matches
 * its built-in time is stored as "no edit", so exporting and re-importing the
 * table doesn't mark every row as edited.
 */
export function planImport(
  defaults: ProgEntry[],
  overrides: ProgEntry[],
  rows: ProgEntry[],
  mode: ImportMode,
): ImportPlan {
  const current = mergeTable(defaults, mode === 'replace' ? [] : overrides);
  const before = mergeTable(defaults, overrides);
  const plan: ImportPlan = { put: [], removeKeys: [], clearAll: mode === 'replace', added: 0, changed: 0, unchanged: 0, reverted: 0 };

  for (const row of rows) {
    const key = progKey(row);
    const existing = current.find((r) => r.key === key);
    const shown = before.find((r) => r.key === key);

    if (existing?.defaultProg2kSec !== undefined && sameProg(existing.defaultProg2kSec, row.prog2kSec)) {
      if (existing.isOverride) plan.removeKeys.push(key);
    } else if (!existing || !sameProg(existing.prog2kSec, row.prog2kSec)) {
      plan.put.push(row);
    }

    if (!shown) plan.added++;
    else if (sameProg(shown.prog2kSec, row.prog2kSec)) plan.unchanged++;
    else plan.changed++;
  }

  if (mode === 'replace') {
    const inFile = new Set(rows.map(progKey));
    plan.reverted = overrides.filter((entry) => !inFile.has(progKey(entry))).length;
  }
  return plan;
}
