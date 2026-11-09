// Stored records (SPEC §8). Every record has a UUID and `updatedAt` so sync can be added later.
import type { Gender, Program } from '../lib/programme';
import type { StrokeCount } from '../lib/rate';
import type { TimeSource } from '../lib/stagger-setup';
import type { PieceType, PredictionModel, StaggerMode } from '../lib/stagger';
import type { Stopwatch } from '../lib/time';

/** Epoch milliseconds. */
export type Ms = number;

export interface Session {
  id: string;
  /** `YYYY-MM-DD`, local time, of the start. */
  date: string;
  /** Rowing time. Paused = on a break. */
  rowing: Stopwatch;
  startedAt: Ms;
  endedAt?: Ms;
  crewAdjustments: Record<string, { prog2kSec: number; source: 'manual' | 'actual' }>;
  /** The piece shown on the piece clock, until it is reset. */
  currentPieceId?: string;
  updatedAt: Ms;
}

/** A simple piece on the piece clock: one stopwatch with splits (SPEC §3b). */
export interface Piece {
  id: string;
  sessionId: string;
  kind: 'simple';
  label: string;
  startedAt: Ms;
  clock: Stopwatch;
  stoppedAt?: Ms;
  /** Elapsed piece time at each split. */
  splitsMs: number[];
  updatedAt: Ms;
}

/** One crew in a staggered piece. Times are copied in, so later edits to the crew don't change history. */
export interface StaggerEntry {
  crewId: string;
  crewName: string;
  /** The 2k time the crew rowed to in this piece. */
  prog2kSec: number;
  source: TimeSource;
  /** The crew's own 2k (crew override or table) for "% of prog". Missing if it has none. */
  baseProg2kSec?: number;
  predictedSec: number;
  /** Start after the first crew: exact, and as used (rounded or nudged). */
  exactOffsetSec: number;
  offsetSec: number;
  nudged: boolean;
  /** Set when the coach tapped Started (a late or early start). Otherwise the planned time is used. */
  actualStartAt?: Ms;
  finishAt?: Ms;
}

/** A staggered-start piece (SPEC §5). Created when the coach taps START. */
export interface StaggeredPiece {
  id: string;
  sessionId: string;
  kind: 'staggered';
  label: string;
  mode: StaggerMode;
  type: PieceType;
  distanceM?: number;
  durationSec?: number;
  /** The distance the predictions use; for a time piece, the equivalent distance. */
  calcDistanceM: number;
  model: PredictionModel;
  /** Master clock start: the first crew's start. */
  startedAt: Ms;
  /** When every crew finished, or the coach ended the piece. Results show from then. */
  endedAt?: Ms;
  /** The coach left the results (New piece / Repeat). The piece stays in the session. */
  closedAt?: Ms;
  /** In start order. */
  entries: StaggerEntry[];
  updatedAt: Ms;
}

export type AnyPiece = Piece | StaggeredPiece;

export interface RateReading {
  id: string;
  sessionId?: string;
  at: Ms;
  spm: number;
  strokes: StrokeCount;
  crewId?: string;
  pieceId?: string;
  updatedAt: Ms;
}

export interface Athlete {
  seat: string;
  name: string;
}

export interface Crew {
  id: string;
  name: string;
  /** Stored on the crew, so changing the programme setting never breaks it. */
  program: Program;
  boatClass: string;
  gender: Gender;
  grade: string;
  /** For a crew faster or slower than its grade. Used instead of the table. */
  overrideProg2kSec?: number;
  athletes?: Athlete[];
  archived?: boolean;
  createdAt: Ms;
  updatedAt: Ms;
}

/** The coach's edit to one row of a built-in table, or a row they added. */
export interface PrognosticOverride {
  id: string;
  /** `program|boatClass|gender|grade`, from `progKey`. One edit per event. */
  key: string;
  program: Program;
  boatClass: string;
  gender: Gender;
  grade: string;
  prog2kSec: number;
  updatedAt: Ms;
}
