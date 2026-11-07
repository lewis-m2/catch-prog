// Stored records (SPEC §8). Every record has a UUID and `updatedAt` so sync can be added later.
import type { StrokeCount } from '../lib/rate';

/** Epoch milliseconds. */
export type Ms = number;

export interface RateReading {
  id: string;
  /** Optional until sessions exist (Phase 2). */
  sessionId?: string;
  at: Ms;
  spm: number;
  strokes: StrokeCount;
  crewId?: string;
  pieceId?: string;
  updatedAt: Ms;
}
