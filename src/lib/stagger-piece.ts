// Changes to a live staggered piece (SPEC §5c). Pure functions: each takes the
// piece and returns an updated copy (or the same object when nothing changes).
import type { StaggeredPiece, StaggerEntry } from '../db/types';
import type { CrewTime } from './stagger-setup';
import { crewStartAt, type PieceType, type Plan, type PredictionModel, type StaggerMode } from './stagger';

export interface PieceConfig {
  label: string;
  mode: StaggerMode;
  type: PieceType;
  distanceM: number;
  durationSec: number;
  model: PredictionModel;
}

/** The piece as it starts: the master clock starts now, with the first crew. */
export function createStaggeredPiece(
  id: string,
  sessionId: string,
  at: number,
  config: PieceConfig,
  plan: Plan,
  times: CrewTime[],
): StaggeredPiece {
  const entries = plan.entries.map((entry): StaggerEntry => {
    const time = times.find((t) => t.crewId === entry.crewId);
    return {
      crewId: entry.crewId,
      crewName: entry.name,
      prog2kSec: entry.prog2kSec,
      source: time?.source ?? 'custom',
      ...(time?.base.sec != null && { baseProg2kSec: time.base.sec }),
      predictedSec: entry.predictedSec,
      exactOffsetSec: entry.exactOffsetSec,
      offsetSec: entry.offsetSec,
      nudged: entry.nudged,
    };
  });
  return {
    id,
    sessionId,
    kind: 'staggered',
    label: config.label.trim(),
    mode: config.mode,
    type: config.type,
    ...(config.type === 'distance' ? { distanceM: config.distanceM } : { durationSec: config.durationSec }),
    calcDistanceM: plan.calcDistanceM,
    model: config.model,
    startedAt: at,
    entries,
    updatedAt: at,
  };
}

/** A copy without an optional field (so it isn't stored as `undefined`). */
function without<T extends object, K extends keyof T>(record: T, key: K): T {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

function updateEntry(piece: StaggeredPiece, crewId: string, at: number, change: (entry: StaggerEntry) => StaggerEntry | null): StaggeredPiece {
  const entry = piece.entries.find((e) => e.crewId === crewId);
  if (!entry) return piece;
  const next = change(entry);
  if (next === null) return piece;
  return { ...piece, entries: piece.entries.map((e) => (e === entry ? next : e)), updatedAt: at };
}

/** The coach saw the crew go: time it from now, not from its planned start. */
export function markStarted(piece: StaggeredPiece, crewId: string, at: number): StaggeredPiece {
  if (piece.endedAt !== undefined) return piece;
  return updateEntry(piece, crewId, at, (entry) => (entry.finishAt !== undefined ? null : { ...entry, actualStartAt: at }));
}

/** Back to the planned start (undoes a mistaken Started tap). */
export function clearStart(piece: StaggeredPiece, crewId: string, at: number): StaggeredPiece {
  return updateEntry(piece, crewId, at, (entry) => {
    if (entry.actualStartAt === undefined || entry.finishAt !== undefined) return null;
    return without(entry, 'actualStartAt');
  });
}

/** Records a finish. When it is the last crew, the piece ends and the results show. */
export function finishCrew(piece: StaggeredPiece, crewId: string, at: number): StaggeredPiece {
  if (piece.endedAt !== undefined) return piece;
  const next = updateEntry(piece, crewId, at, (entry) =>
    entry.finishAt !== undefined || at <= crewStartAt(entry, piece.startedAt) ? null : { ...entry, finishAt: at },
  );
  const allDone = next.entries.every((entry) => entry.finishAt !== undefined);
  return allDone && next !== piece ? { ...next, endedAt: at } : next;
}

export function undoFinish(piece: StaggeredPiece, crewId: string, at: number): StaggeredPiece {
  const next = updateEntry(piece, crewId, at, (entry) => {
    if (entry.finishAt === undefined) return null;
    return without(entry, 'finishAt');
  });
  return next === piece ? piece : without(next, 'endedAt');
}

/** Ends the piece now: crews not yet finished are left without a time. */
export function endPiece(piece: StaggeredPiece, at: number): StaggeredPiece {
  if (piece.endedAt !== undefined) return piece;
  return { ...piece, endedAt: at, updatedAt: at };
}

/** Back from the results to the live piece (e.g. the last finish was tapped by mistake). */
export function reopenPiece(piece: StaggeredPiece, at: number): StaggeredPiece {
  if (piece.endedAt === undefined) return piece;
  return { ...without(piece, 'endedAt'), updatedAt: at };
}

export function closePiece(piece: StaggeredPiece, at: number): StaggeredPiece {
  return { ...endPiece(piece, at), closedAt: at, updatedAt: at };
}

/** When every crew is predicted to finish, on the master clock (ms). */
export function predictedFinishMs(piece: StaggeredPiece): number {
  return Math.max(...piece.entries.map((entry) => (entry.offsetSec + entry.predictedSec) * 1000));
}

/** The setup to row the same piece again. */
export function configOf(piece: StaggeredPiece): PieceConfig & { crewIds: string[] } {
  return {
    label: piece.label,
    mode: piece.mode,
    type: piece.type,
    distanceM: piece.distanceM ?? 1000,
    durationSec: piece.durationSec ?? 180,
    model: piece.model,
    crewIds: piece.entries.map((entry) => entry.crewId),
  };
}

/** A short description: "1000 m" or "3:00", plus the label if there is one. */
export function describePiece(piece: { label: string; type: PieceType; distanceM?: number; durationSec?: number }): string {
  const what = piece.type === 'distance' ? `${piece.distanceM ?? 0} m` : formatDuration(piece.durationSec ?? 0);
  return piece.label ? `${piece.label} · ${what}` : what;
}

/** `3:00` or `1:30:00` for whole seconds. */
export function formatDuration(sec: number): string {
  const whole = Math.round(sec);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = String(whole % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
