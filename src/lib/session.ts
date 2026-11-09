// Session and piece-clock changes (SPEC §3). Pure functions: each takes a
// record and returns the updated copy; saving is done by the caller.
import type { Piece, Session } from '../db/types';
import {
  continueFrom,
  elapsedMs,
  isRunning,
  localDateString,
  newStopwatch,
  startStopwatch,
  stopStopwatch,
} from './time';

// ---------- session ----------

/** A new session, with the rowing clock running. */
export function createSession(id: string, at: number): Session {
  return {
    id,
    date: localDateString(at),
    startedAt: at,
    rowing: startStopwatch(newStopwatch(), at),
    crewAdjustments: {},
    updatedAt: at,
  };
}

export function resumeRowing(session: Session, at: number): Session {
  return { ...session, rowing: startStopwatch(session.rowing, at), updatedAt: at };
}

/** Starts a break. */
export function pauseRowing(session: Session, at: number): Session {
  return { ...session, rowing: stopStopwatch(session.rowing, at), updatedAt: at };
}

export function endSession(session: Session, at: number): Session {
  return {
    ...session,
    rowing: stopStopwatch(session.rowing, at),
    endedAt: at,
    currentPieceId: undefined,
    updatedAt: at,
  };
}

export type CrewAdjustment = Session['crewAdjustments'][string];

/** Sets (or with null, removes) a crew's time for the rest of the session (SPEC §5a). */
export function setCrewAdjustment(session: Session, crewId: string, adjustment: CrewAdjustment | null, at: number): Session {
  const crewAdjustments = { ...session.crewAdjustments };
  if (adjustment) crewAdjustments[crewId] = adjustment;
  else delete crewAdjustments[crewId];
  return { ...session, crewAdjustments, updatedAt: at };
}

export function sessionTimes(session: Session, now: number) {
  const end = session.endedAt ?? now;
  const totalMs = Math.max(0, end - session.startedAt);
  const rowingMs = elapsedMs(session.rowing, end);
  return { totalMs, rowingMs, breakMs: Math.max(0, totalMs - rowingMs) };
}

// ---------- piece clock ----------

export interface PieceDetails {
  label: string;
}

/** A new piece, with its clock running. */
export function createPiece(id: string, sessionId: string, details: PieceDetails, at: number): Piece {
  return {
    id,
    sessionId,
    kind: 'simple',
    label: details.label,
    startedAt: at,
    clock: startStopwatch(newStopwatch(), at),
    splitsMs: [],
    updatedAt: at,
  };
}

export function splitPiece(piece: Piece, at: number): Piece {
  if (!isRunning(piece.clock)) return piece;
  return { ...piece, splitsMs: [...piece.splitsMs, elapsedMs(piece.clock, at)], updatedAt: at };
}

export function stopPiece(piece: Piece, at: number): Piece {
  if (!isRunning(piece.clock)) return piece;
  return { ...piece, clock: stopStopwatch(piece.clock, at), stoppedAt: at, updatedAt: at };
}

/** Undoes an accidental stop: the clock carries on as though it was never stopped. */
export function undoStopPiece(piece: Piece, now: number): Piece {
  if (piece.stoppedAt === undefined) return piece;
  return { ...piece, clock: continueFrom(piece.clock, piece.stoppedAt), stoppedAt: undefined, updatedAt: now };
}

export interface SplitRow {
  label: string;
  /** Time since the previous split. */
  lapMs: number;
  /** Time since the piece started. */
  totalMs: number;
}

/** One row per split, plus a Finish row (stop time) once a piece with splits has stopped. */
export function splitRows(splitsMs: number[], finishMs?: number): SplitRow[] {
  const rows = splitsMs.map((totalMs, index) => ({
    label: String(index + 1),
    lapMs: totalMs - (splitsMs[index - 1] ?? 0),
    totalMs,
  }));
  const lastSplit = splitsMs[splitsMs.length - 1];
  if (finishMs !== undefined && lastSplit !== undefined) {
    rows.push({ label: 'Finish', lapMs: finishMs - lastSplit, totalMs: finishMs });
  }
  return rows;
}
