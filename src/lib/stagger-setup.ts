// Which 2k time each crew rows to in a staggered piece (SPEC §5a). Pure functions.
import { baseProg, workingProg, type CrewProgInput, type PrognosticRow, type ProgSource, type WorkingProg } from './prognostic';
import type { StaggerMode } from './stagger';

export type SessionAdjustments = Record<string, { prog2kSec: number; source: 'manual' | 'actual' }>;

export interface SetupCrew extends CrewProgInput {
  id: string;
  name: string;
}

/** Where a crew's time in the piece came from. */
export type TimeSource = ProgSource | 'custom' | 'last';

export const TIME_SOURCE_LABEL: Record<TimeSource, string> = {
  session: 'session adjustment',
  crew: 'crew override',
  table: 'table',
  none: 'no prognostic',
  custom: 'custom',
  last: 'last piece',
};

export interface CrewTime {
  crewId: string;
  name: string;
  /** The time used for the piece. Null when the crew has none: it can't be planned until one is set. */
  sec: number | null;
  source: TimeSource;
  /** The crew's own time without session adjustments (crew override or table). */
  base: WorkingProg;
  /** Session adjustment, if any (also shown in Custom mode). */
  adjustment?: { prog2kSec: number; source: 'manual' | 'actual' };
}

/**
 * Prog mode: session adjustment → crew override → table row.
 * Custom mode: the coach's time for this setup → the time the crew used in its last
 * staggered piece → the Prog-mode time.
 */
export function crewTime(
  crew: SetupCrew,
  table: PrognosticRow[],
  mode: StaggerMode,
  adjustments: SessionAdjustments,
  custom: Record<string, number> = {},
  lastUsed: Record<string, number> = {},
): CrewTime {
  const adjustment = adjustments[crew.id];
  const working = workingProg(crew, table, adjustment);
  const base = baseProg(crew, table);
  const common = { crewId: crew.id, name: crew.name, base, ...(adjustment && { adjustment }) };

  if (mode === 'custom') {
    const own = custom[crew.id];
    if (own !== undefined) return { ...common, sec: own, source: 'custom' };
    const last = lastUsed[crew.id];
    if (last !== undefined) return { ...common, sec: last, source: 'last' };
  }
  return { ...common, sec: working.sec, source: working.source };
}

interface PastPiece {
  kind: string;
  startedAt?: number;
  entries?: { crewId: string; prog2kSec: number }[];
}

/** Each crew's time in the most recent staggered piece it was in. */
export function lastUsedTimes(pieces: PastPiece[]): Record<string, number> {
  const times: Record<string, number> = {};
  const staggered = pieces
    .filter((piece) => piece.kind === 'staggered' && piece.startedAt !== undefined)
    .sort((a, b) => a.startedAt! - b.startedAt!);
  for (const piece of staggered) for (const entry of piece.entries ?? []) times[entry.crewId] = entry.prog2kSec;
  return times;
}
