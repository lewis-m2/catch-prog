import { DEFAULT_PROGNOSTICS } from '../data/prognostics';
import { newId } from '../lib/id';
import { progKey, roundProg, sameProg, type ImportPlan, type ProgEntry } from '../lib/prognostic';
import type { Program } from '../lib/programme';
import { db } from './db';
import type { PrognosticOverride } from './types';

export function toEntry({ program, boatClass, gender, grade, prog2kSec }: PrognosticOverride): ProgEntry {
  return { program, boatClass, gender, grade, prog2kSec };
}

async function putEdit(entry: ProgEntry, at: number): Promise<void> {
  const key = progKey(entry);
  const existing = await db.prognosticOverrides.where('key').equals(key).first();
  await db.prognosticOverrides.put({ id: existing?.id ?? newId(), key, ...entry, prog2kSec: roundProg(entry.prog2kSec), updatedAt: at });
}

/** Sets a row's time. Setting it back to the built-in time removes the edit. */
export async function saveProgTime(entry: ProgEntry): Promise<void> {
  const builtIn = DEFAULT_PROGNOSTICS.find((row) => progKey(row) === progKey(entry));
  await db.transaction('rw', db.prognosticOverrides, async () => {
    if (builtIn && sameProg(builtIn.prog2kSec, entry.prog2kSec)) await resetRow(progKey(entry));
    else await putEdit(entry, Date.now());
  });
}

/** Back to the built-in time (or, for a row the coach added, removes it). */
export async function resetRow(key: string): Promise<void> {
  await db.prognosticOverrides.where('key').equals(key).delete();
}

export async function resetProgram(program: Program): Promise<void> {
  await db.prognosticOverrides.where('program').equals(program).delete();
}

export async function applyImport(plan: ImportPlan): Promise<void> {
  const at = Date.now();
  await db.transaction('rw', db.prognosticOverrides, async () => {
    if (plan.clearAll) await db.prognosticOverrides.clear();
    if (plan.removeKeys.length > 0) await db.prognosticOverrides.where('key').anyOf(plan.removeKeys).delete();
    for (const entry of plan.put) await putEdit(entry, at);
  });
}
