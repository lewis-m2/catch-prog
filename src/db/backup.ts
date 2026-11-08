import { BACKUP_APP, BACKUP_VERSION, type Backup } from '../lib/backup';
import { db } from './db';

/** Every table, so tables added in later phases are backed up without changes here. */
export function tableNames(): string[] {
  return db.tables.map((table) => table.name);
}

export async function createBackup(settings: unknown): Promise<Backup> {
  const tables: Backup['tables'] = {};
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) tables[table.name] = await table.toArray();
  });
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: Date.now(), settings, tables };
}

/** Replaces all data with the backup's. All or nothing: if anything fails, nothing changes. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
      await table.bulkPut(backup.tables[table.name] ?? []);
    }
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
}
