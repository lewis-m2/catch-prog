import type { CrewDraft } from '../lib/crews';
import { newId } from '../lib/id';
import { db } from './db';
import type { Crew } from './types';

export function newCrew(draft: CrewDraft, at = Date.now()): Crew {
  return { id: newId(), ...draft, createdAt: at, updatedAt: at };
}

export async function saveCrew(crew: Crew): Promise<void> {
  await db.crews.put({ ...crew, updatedAt: Date.now() });
}

export async function addCrews(drafts: CrewDraft[]): Promise<void> {
  const at = Date.now();
  await db.crews.bulkAdd(drafts.map((draft) => newCrew(draft, at)));
}

export async function deleteCrew(id: string): Promise<void> {
  await db.crews.delete(id);
}
