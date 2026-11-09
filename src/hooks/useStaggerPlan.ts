import { useMemo } from 'react';
import { db } from '../db/db';
import type { Crew } from '../db/types';
import { MAX_DISTANCE_M, MAX_DURATION_SEC, MIN_DISTANCE_M, MIN_DURATION_SEC, planStagger, type Plan } from '../lib/stagger';
import { crewTime, lastUsedTimes, type CrewTime } from '../lib/stagger-setup';
import { useSettings } from '../state/settings';
import { useStagger } from '../state/stagger';
import { useTimers } from '../state/timers';
import { useCrews, useProgTable } from './useData';
import { useLiveQuery } from './useLiveQuery';

export interface StaggerPlanState {
  loading: boolean;
  allCrews: Crew[];
  /** The chosen crews that still exist, in the order chosen. */
  chosen: Crew[];
  times: CrewTime[];
  /** Chosen crews with no time: they need one before the piece can start. */
  missing: CrewTime[];
  /** Null until there is at least one crew with a time and a valid distance or duration. */
  plan: Plan | null;
  pieceValid: boolean;
}

/** The start list for the current setup, worked out again whenever anything it depends on changes. */
export function useStaggerPlan(): StaggerPlanState {
  const allCrews = useCrews();
  const table = useProgTable();
  const pieces = useLiveQuery(() => db.pieces.where('kind').equals('staggered').toArray(), []);
  const session = useTimers((state) => state.session);
  const rounding = useSettings((state) => state.gapRounding);
  const { mode, crewIds, type, distanceM, durationSec, model, custom, nudges, pendingAdjustments } = useStagger();

  return useMemo(() => {
    const crews = allCrews ?? [];
    const byId = new Map(crews.map((crew) => [crew.id, crew]));
    const chosen = crewIds.map((id) => byId.get(id)).filter((crew): crew is Crew => crew !== undefined);
    const adjustments = session ? session.crewAdjustments : pendingAdjustments;
    const lastUsed = lastUsedTimes(pieces ?? []);
    const times = table ? chosen.map((crew) => crewTime(crew, table, mode, adjustments, custom, lastUsed)) : [];
    const ready = times.filter((time) => time.sec !== null);
    const pieceValid =
      type === 'distance'
        ? distanceM >= MIN_DISTANCE_M && distanceM <= MAX_DISTANCE_M
        : durationSec >= MIN_DURATION_SEC && durationSec <= MAX_DURATION_SEC;
    const plan = pieceValid
      ? planStagger({
          crews: ready.map((time) => ({ crewId: time.crewId, name: time.name, prog2kSec: time.sec! })),
          type,
          distanceM,
          durationSec,
          model,
          rounding,
          nudges,
        })
      : null;
    return {
      loading: allCrews === undefined || table === undefined,
      allCrews: crews,
      chosen,
      times,
      missing: times.filter((time) => time.sec === null),
      plan,
      pieceValid,
    };
  }, [allCrews, table, pieces, session, rounding, mode, crewIds, type, distanceM, durationSec, model, custom, nudges, pendingAdjustments]);
}
