import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../db/db';
import type { StaggeredPiece } from '../db/types';
import { newId } from '../lib/id';
import type { CrewAdjustment } from '../lib/session';
import type { PieceType, Plan, PredictionModel, StaggerMode } from '../lib/stagger';
import {
  clearStart,
  closePiece,
  configOf,
  createStaggeredPiece,
  endPiece,
  finishCrew,
  markStarted,
  reopenPiece,
  undoFinish,
} from '../lib/stagger-piece';
import type { CrewTime } from '../lib/stagger-setup';
import { useTimers } from './timers';

// Staggered pieces (SPEC §5).
// - The setup ("draft") is kept in localStorage, so it is still there after a
//   reload and the next piece starts from the last one.
// - The live piece is a record in IndexedDB, saved on every tap like the other
//   clocks, and loaded again on startup.

export interface StaggerDraft {
  /** Setup, or Ready: the start list with the big START button. */
  stage: 'setup' | 'ready';
  mode: StaggerMode;
  crewIds: string[];
  type: PieceType;
  distanceM: number;
  durationSec: number;
  model: PredictionModel;
  label: string;
  /** Custom mode: the coach's times for this setup, by crew id. */
  custom: Record<string, number>;
  /** Start times set by hand (seconds after the first crew), by crew id. */
  nudges: Record<string, number>;
  /** Adjustments made with no session running. They join the session at START. */
  pendingAdjustments: Record<string, CrewAdjustment>;
}

export const DEFAULT_DRAFT: StaggerDraft = {
  stage: 'setup',
  mode: 'prog',
  crewIds: [],
  type: 'distance',
  distanceM: 1000,
  durationSec: 180,
  model: 'linear',
  label: '',
  custom: {},
  nudges: {},
  pendingAdjustments: {},
};

interface StaggerState extends StaggerDraft {
  /** The piece started with START, until the coach leaves its results. */
  piece: StaggeredPiece | null;

  setDraft: (patch: Partial<StaggerDraft>) => void;
  toggleCrew: (crewId: string) => void;
  setCustom: (crewId: string, sec: number | null) => void;
  setNudge: (crewId: string, sec: number | null) => void;
  /** The session adjustment (or the pending one when no session is running); null removes it. */
  setAdjustment: (crewId: string, adjustment: CrewAdjustment | null) => void;

  load: () => Promise<void>;
  start: (at: number, plan: Plan, times: CrewTime[]) => void;
  markStarted: (crewId: string, at: number) => void;
  clearStart: (crewId: string) => void;
  finish: (crewId: string, at: number) => void;
  undoFinish: (crewId: string) => void;
  endPiece: (at: number) => void;
  reopen: () => void;
  /** Cancel a live piece: it is deleted, and the setup is kept. */
  cancel: () => void;
  /** Leave the results for a new setup (the piece stays saved). */
  newPiece: () => void;
  /** Same crews and piece again, with the times as they are now. */
  repeat: () => void;
}

function savePiece(piece: StaggeredPiece) {
  db.pieces.put(piece).catch((error: unknown) => console.error('Could not save the piece', error));
}

const without = <T>(record: Record<string, T>, key: string) => {
  const copy = { ...record };
  delete copy[key];
  return copy;
};

export const useStagger = create<StaggerState>()(
  persist(
    (set, get) => {
      const updatePiece = (change: (piece: StaggeredPiece) => StaggeredPiece) => {
        const { piece } = get();
        if (!piece) return;
        const next = change(piece);
        if (next === piece) return;
        set({ piece: next });
        savePiece(next);
      };

      return {
        ...DEFAULT_DRAFT,
        piece: null,

        setDraft: (patch) => set(patch),

        toggleCrew: (crewId) => {
          const { crewIds, nudges } = get();
          const chosen = crewIds.includes(crewId);
          set({ crewIds: chosen ? crewIds.filter((id) => id !== crewId) : [...crewIds, crewId], nudges: without(nudges, crewId) });
        },

        setCustom: (crewId, sec) => {
          const { custom } = get();
          set({ custom: sec === null ? without(custom, crewId) : { ...custom, [crewId]: sec } });
        },

        setNudge: (crewId, sec) => {
          const { nudges } = get();
          set({ nudges: sec === null ? without(nudges, crewId) : { ...nudges, [crewId]: sec } });
        },

        setAdjustment: (crewId, adjustment) => {
          if (useTimers.getState().session) {
            useTimers.getState().setAdjustment(crewId, adjustment);
            return;
          }
          const { pendingAdjustments } = get();
          set({ pendingAdjustments: adjustment ? { ...pendingAdjustments, [crewId]: adjustment } : without(pendingAdjustments, crewId) });
        },

        load: async () => {
          const session = useTimers.getState().session;
          if (!session) {
            set({ piece: null });
            return;
          }
          const pieces = await db.pieces.where('sessionId').equals(session.id).toArray();
          const open = pieces
            .filter((piece): piece is StaggeredPiece => piece.kind === 'staggered' && piece.closedAt === undefined)
            .sort((a, b) => a.startedAt - b.startedAt)
            .pop();
          set({ piece: open ?? null });
        },

        start: (at, plan, times) => {
          const draft = get();
          const session = useTimers.getState().ensureRowing(at, draft.pendingAdjustments);
          const piece = createStaggeredPiece(newId(), session.id, at, draft, plan, times);
          set({ piece, pendingAdjustments: {}, stage: 'setup' });
          savePiece(piece);
        },

        markStarted: (crewId, at) => updatePiece((piece) => markStarted(piece, crewId, at)),
        clearStart: (crewId) => updatePiece((piece) => clearStart(piece, crewId, Date.now())),
        finish: (crewId, at) => updatePiece((piece) => finishCrew(piece, crewId, at)),
        undoFinish: (crewId) => updatePiece((piece) => undoFinish(piece, crewId, Date.now())),
        endPiece: (at) => updatePiece((piece) => endPiece(piece, at)),
        reopen: () => updatePiece((piece) => reopenPiece(piece, Date.now())),

        cancel: () => {
          const { piece } = get();
          if (!piece) return;
          set({ piece: null, stage: 'ready' });
          db.pieces.delete(piece.id).catch((error: unknown) => console.error('Could not delete the piece', error));
        },

        newPiece: () => {
          const { piece } = get();
          if (piece) savePiece(closePiece(piece, Date.now()));
          set({ piece: null, stage: 'setup' });
        },

        repeat: () => {
          const { piece } = get();
          if (!piece) return;
          savePiece(closePiece(piece, Date.now()));
          // Nudged starts are dropped: the point of a repeat is the updated times.
          set({ ...configOf(piece), piece: null, nudges: {}, stage: 'ready' });
        },
      };
    },
    {
      name: 'launch.stagger',
      partialize: (state): StaggerDraft => ({
        stage: state.stage,
        mode: state.mode,
        crewIds: state.crewIds,
        type: state.type,
        distanceM: state.distanceM,
        durationSec: state.durationSec,
        model: state.model,
        label: state.label,
        custom: state.custom,
        nudges: state.nudges,
        pendingAdjustments: state.pendingAdjustments,
      }),
      merge: (saved, current) => ({ ...current, ...DEFAULT_DRAFT, ...(saved as Partial<StaggerDraft>) }),
    },
  ),
);

// When the session ends, a piece still on screen is ended and put away with it.
useTimers.subscribe((state, previous) => {
  if (previous.session && !state.session) {
    const { piece } = useStagger.getState();
    if (piece) {
      savePiece(closePiece(piece, Date.now()));
      useStagger.setState({ piece: null, stage: 'setup' });
    }
  }
});
