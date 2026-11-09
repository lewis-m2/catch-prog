// Staggered-start pieces (SPEC §5): predicted times, start offsets and results.
// Pure functions, no React. All times here are in seconds unless the name says Ms.
import { MAX_PROG_SEC, MIN_PROG_SEC, roundProg } from './prognostic';

export type PieceType = 'distance' | 'time';
export type PredictionModel = 'linear' | 'paul';
/** Prog: times from the table, crew overrides and session adjustments. Custom: the coach's own times for this piece. */
export type StaggerMode = 'prog' | 'custom';

export const MODEL_LABEL: Record<PredictionModel, string> = { linear: 'Linear', paul: "Paul's law" };

export const MIN_DISTANCE_M = 100;
export const MAX_DISTANCE_M = 10000;
export const MIN_DURATION_SEC = 30;
export const MAX_DURATION_SEC = 60 * 60;

// ---------- predictions (SPEC §5b) ----------

/**
 * Predicted time for `distanceM` from a 2k time.
 * Linear: the same average speed as the 2k.
 * Paul's law: the 500 m split gets 5 s slower for each doubling of distance (faster when shorter).
 */
export function predictSec(prog2kSec: number, distanceM: number, model: PredictionModel): number {
  if (model === 'linear') return (prog2kSec * distanceM) / 2000;
  const split = prog2kSec / 4 + 5 * Math.log2(distanceM / 2000);
  return (split * distanceM) / 500;
}

/** The 2k time that predicts `actualSec` over `distanceM`: `predictSec` backwards. Used by "Use actual time". */
export function progFromActual(actualSec: number, distanceM: number, model: PredictionModel): number {
  if (model === 'linear') return (actualSec * 2000) / distanceM;
  return 4 * ((actualSec * 500) / distanceM - 5 * Math.log2(distanceM / 2000));
}

/**
 * A time piece is planned as a distance: the distance the fastest crew covers in
 * the time at its 2k pace. The fastest crew rows the stated time; slower crews
 * start earlier and row a little longer, so everyone finishes together.
 */
export function equivalentDistanceM(durationSec: number, fastestProg2kSec: number): number {
  return (2000 * durationSec) / fastestProg2kSec;
}

/** Rounds to the nearest `step` seconds (0.5 or 1). */
export function roundTo(sec: number, step: number): number {
  return Math.round(sec / step) * step;
}

// ---------- the plan ----------

export interface PlanCrew {
  crewId: string;
  name: string;
  /** The 2k time the crew rows to in this piece. */
  prog2kSec: number;
}

export interface PlanInput {
  crews: PlanCrew[];
  type: PieceType;
  distanceM: number;
  durationSec: number;
  model: PredictionModel;
  /** Start times are rounded to this: 0.5 or 1 s. */
  rounding: number;
  /** Start times the coach set by hand (seconds after the first crew), by crew id. */
  nudges?: Record<string, number>;
}

export interface PlanEntry extends PlanCrew {
  predictedSec: number;
  /** Exact start time after the first crew, before rounding. */
  exactOffsetSec: number;
  /** When the crew is sent: rounded, or the coach's nudged time. */
  offsetSec: number;
  nudged: boolean;
}

export interface Plan {
  /** In start order: slowest first. */
  entries: PlanEntry[];
  /** Distance the predictions use (for a time piece, the equivalent distance). */
  calcDistanceM: number;
  /** When everyone is predicted to finish, on the master clock (from the exact offsets). */
  finishSec: number;
  /**
   * How far every start was moved so the first crew is at 0 (only when a nudge left nobody there).
   * A start shown as `x` is stored as the nudge `x + shiftSec`.
   */
  shiftSec: number;
}

/**
 * Start order and offsets (SPEC §5b). The slowest crew starts at 0 and each
 * other crew starts `T_slowest − T_crew` later. Exact values are kept; the
 * start the coach uses is rounded. Nudged starts are used as given, and if a
 * nudge leaves nobody at 0, every start moves so the first crew is at 0.
 */
export function planStagger(input: PlanInput): Plan | null {
  if (input.crews.length === 0) return null;
  const fastest = Math.min(...input.crews.map((crew) => crew.prog2kSec));
  const calcDistanceM = input.type === 'time' ? equivalentDistanceM(input.durationSec, fastest) : input.distanceM;

  const predicted = input.crews.map((crew) => ({ ...crew, predictedSec: predictSec(crew.prog2kSec, calcDistanceM, input.model) }));
  const slowest = Math.max(...predicted.map((crew) => crew.predictedSec));

  const entries = predicted.map((crew): PlanEntry => {
    const exactOffsetSec = slowest - crew.predictedSec;
    const nudge = input.nudges?.[crew.crewId];
    return {
      ...crew,
      exactOffsetSec,
      offsetSec: nudge ?? roundTo(exactOffsetSec, input.rounding),
      nudged: nudge !== undefined,
    };
  });

  const first = Math.min(...entries.map((entry) => entry.offsetSec));
  for (const entry of entries) entry.offsetSec -= first;
  entries.sort((a, b) => a.offsetSec - b.offsetSec || b.predictedSec - a.predictedSec || a.name.localeCompare(b.name));

  return { entries, calcDistanceM, finishSec: slowest - first, shiftSec: first };
}

// ---------- live ----------

export interface LiveEntry {
  offsetSec: number;
  predictedSec: number;
  /** When the crew actually went, if the coach tapped Started. */
  actualStartAt?: number;
  finishAt?: number;
}

/** When the crew started (or will start): the coach's tap, or the planned time. */
export function crewStartAt(entry: LiveEntry, masterStartAt: number): number {
  return entry.actualStartAt ?? masterStartAt + entry.offsetSec * 1000;
}

/** How long a just-started crew shows GO!. */
export const GO_FLASH_MS = 2500;
/** The countdown on the next crew's row starts this many seconds before it goes. */
export const COUNTDOWN_SEC = 5;

export type CrewStatus =
  | { kind: 'waiting'; toGoMs: number }
  | { kind: 'go'; elapsedMs: number }
  | { kind: 'rowing'; elapsedMs: number }
  | { kind: 'finished'; timeMs: number };

export function crewStatus(entry: LiveEntry, masterStartAt: number, now: number): CrewStatus {
  const startAt = crewStartAt(entry, masterStartAt);
  if (entry.finishAt !== undefined) return { kind: 'finished', timeMs: entry.finishAt - startAt };
  if (now < startAt) return { kind: 'waiting', toGoMs: startAt - now };
  const elapsedMs = now - startAt;
  return elapsedMs < GO_FLASH_MS ? { kind: 'go', elapsedMs } : { kind: 'rowing', elapsedMs };
}

/** Seconds left to show on a waiting crew's countdown (5…1), or null when it is further off. */
export function countdownNumber(toGoMs: number): number | null {
  const seconds = Math.ceil(toGoMs / 1000);
  return seconds >= 1 && seconds <= COUNTDOWN_SEC ? seconds : null;
}

// ---------- results ----------

export interface ResultInput extends LiveEntry {
  /** The crew's 2k time before any session adjustment (table or crew override), if it has one. */
  baseProg2kSec?: number;
}

export interface CrewResult {
  actualSec: number;
  /** Actual − predicted. Negative = faster than planned. */
  diffSec: number;
  /**
   * Speed as a percentage of prognostic speed (100 = on prog, over 100 = faster).
   * Against the crew's own prognostic, not the adjusted time; null without one.
   */
  pctOfProg: number | null;
}

export function crewResult(entry: ResultInput, masterStartAt: number, calcDistanceM: number, model: PredictionModel): CrewResult | null {
  if (entry.finishAt === undefined) return null;
  const actualSec = (entry.finishAt - crewStartAt(entry, masterStartAt)) / 1000;
  if (actualSec <= 0) return null;
  const progSec = entry.baseProg2kSec !== undefined ? predictSec(entry.baseProg2kSec, calcDistanceM, model) : null;
  return {
    actualSec,
    diffSec: actualSec - entry.predictedSec,
    pctOfProg: progSec !== null ? (100 * progSec) / actualSec : null,
  };
}

/**
 * The 2k time to use next so the crew's prediction equals what it just did:
 * rounded to tenths and kept within the allowed range.
 */
export function nextProgFromActual(actualSec: number, calcDistanceM: number, model: PredictionModel): number {
  const sec = roundProg(progFromActual(actualSec, calcDistanceM, model));
  return Math.min(MAX_PROG_SEC, Math.max(MIN_PROG_SEC, sec));
}

/** `+2.4 s` / `−1.0 s` (real minus sign), to tenths. */
export function formatDiff(sec: number): string {
  const tenths = Math.round(sec * 10) / 10;
  return `${tenths < 0 ? '−' : '+'}${Math.abs(tenths).toFixed(1)} s`;
}

// ---------- percent of prog (for the adjust sheet) ----------

/** The time for a percentage of prognostic speed: 97% → 3% slower than the base. */
export function timeFromPercent(baseSec: number, pct: number): number {
  return (baseSec * 100) / pct;
}

export function percentFromTime(baseSec: number, sec: number): number {
  return (baseSec * 100) / sec;
}
