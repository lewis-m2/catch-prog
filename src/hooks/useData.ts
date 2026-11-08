import { useMemo } from 'react';
import { DEFAULT_PROGNOSTICS } from '../data/prognostics';
import { db } from '../db/db';
import { toEntry } from '../db/prognostics';
import type { Crew } from '../db/types';
import { sortByName } from '../lib/crews';
import { mergeTable, type PrognosticRow } from '../lib/prognostic';
import { useLiveQuery } from './useLiveQuery';

/** The prognostic table in use: built-in rows with the coach's edits. Undefined while loading. */
export function useProgTable(): PrognosticRow[] | undefined {
  const overrides = useLiveQuery(() => db.prognosticOverrides.toArray(), []);
  return useMemo(() => (overrides ? mergeTable(DEFAULT_PROGNOSTICS, overrides.map(toEntry)) : undefined), [overrides]);
}

/** All crews, sorted by name. Undefined while loading. */
export function useCrews(): Crew[] | undefined {
  return useLiveQuery(async () => sortByName(await db.crews.toArray()), []);
}

export function useCrew(id: string | undefined): Crew | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.crews.get(id)) ?? null) : null), [id]);
}
