// Stored records (SPEC §8). Every record has a UUID and `updatedAt` so sync can be added later.
import type { StrokeCount } from '../lib/rate';
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

/**
 * A piece. Phase 2 has simple pieces (one stopwatch with splits); staggered
 * pieces (SPEC §5) add their fields in Phase 4.
 */
export interface Piece {
  id: string;
  sessionId: string;
  kind: 'simple';
  label: string;
  targetSec?: number;
  startedAt: Ms;
  clock: Stopwatch;
  stoppedAt?: Ms;
  /** Elapsed piece time at each split. */
  splitsMs: number[];
  updatedAt: Ms;
}

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
