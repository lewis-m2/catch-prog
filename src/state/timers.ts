import { create } from 'zustand';
import { loadActiveSession, saveTimerRecords } from '../db/sessions';
import type { Piece, Session } from '../db/types';
import { newId } from '../lib/id';
import {
  createPiece,
  createSession,
  endSession,
  pauseRowing,
  resumeRowing,
  splitPiece,
  stopPiece,
  undoStopPiece,
  type PieceDetails,
} from '../lib/session';
import { isRunning } from '../lib/time';

// The active session and piece clock. Every change is saved to IndexedDB
// straight away; on startup `load()` restores them, so a reload mid-piece
// carries on exactly where it was.

interface TimersState {
  session: Session | null;
  /** The piece on the piece clock (running, or stopped until reset). */
  piece: Piece | null;
  /** Label for the next piece, kept after a reset for repeats. */
  details: PieceDetails;

  load: () => Promise<void>;
  /** Starts a new session, or resumes rowing after a break. */
  startSession: (at: number) => void;
  pauseSession: (at: number) => void;
  endSession: (at: number) => void;
  /** Also starts the session (or ends a break): a piece is always rowed in a session. */
  startPiece: (at: number) => void;
  splitPiece: (at: number) => void;
  stopPiece: (at: number) => void;
  undoStopPiece: () => void;
  resetPiece: () => void;
  setDetails: (details: Partial<PieceDetails>) => void;
}

function save(records: { session?: Session; piece?: Piece }) {
  saveTimerRecords(records).catch((error: unknown) => console.error('Could not save timers', error));
}

export const useTimers = create<TimersState>()((set, get) => {
  /** Applies a change to the current piece and saves it. */
  const updatePiece = (change: (piece: Piece) => Piece) => {
    const { piece } = get();
    if (!piece) return;
    const next = change(piece);
    if (next === piece) return;
    set({ piece: next });
    save({ piece: next });
  };

  return {
    session: null,
    piece: null,
    details: { label: '' },

    load: async () => {
      const { session, piece } = await loadActiveSession();
      set({ session, piece, ...(piece && { details: { label: piece.label } }) });
    },

    startSession: (at) => {
      const { session } = get();
      const next = session ? resumeRowing(session, at) : createSession(newId(), at);
      set({ session: next });
      save({ session: next });
    },

    pauseSession: (at) => {
      const { session } = get();
      if (!session) return;
      const next = pauseRowing(session, at);
      set({ session: next });
      save({ session: next });
    },

    endSession: (at) => {
      const { session, piece } = get();
      if (!session) return;
      save({
        session: endSession(session, at),
        // A piece still running is stopped and saved with the session.
        piece: piece && isRunning(piece.clock) ? stopPiece(piece, at) : undefined,
      });
      set({ session: null, piece: null });
    },

    startPiece: (at) => {
      const { session: current, details } = get();
      const session = current ? resumeRowing(current, at) : createSession(newId(), at);
      const piece = createPiece(newId(), session.id, details, at);
      const withPiece = { ...session, currentPieceId: piece.id, updatedAt: at };
      set({ session: withPiece, piece });
      save({ session: withPiece, piece });
    },

    splitPiece: (at) => updatePiece((piece) => splitPiece(piece, at)),
    stopPiece: (at) => updatePiece((piece) => stopPiece(piece, at)),
    undoStopPiece: () => updatePiece((piece) => undoStopPiece(piece, Date.now())),

    resetPiece: () => {
      const { session } = get();
      if (!session) {
        set({ piece: null });
        return;
      }
      // The piece itself is already saved; this just clears the clock.
      const next = { ...session, currentPieceId: undefined, updatedAt: Date.now() };
      set({ session: next, piece: null });
      save({ session: next });
    },

    setDetails: (change) => {
      set({ details: { ...get().details, ...change } });
      updatePiece((piece) => ({ ...piece, ...change, updatedAt: Date.now() }));
    },
  };
});
