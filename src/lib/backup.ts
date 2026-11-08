// The JSON backup format (SPEC §7d). Pure functions; reading and writing the
// database is in src/db/backup.ts.

export const BACKUP_APP = 'launch';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  settings: unknown;
  /** Table name → records. */
  tables: Record<string, Record<string, unknown>[]>;
}

export function backupFileName(at: number): string {
  const date = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `launch-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/**
 * Checks a backup file before anything is replaced. Returns the backup, or a
 * message saying what's wrong. Tables the app doesn't know are ignored.
 */
export function parseBackup(text: string, tableNames: string[]): Backup | string {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return "This isn't a backup file (it isn't JSON).";
  }
  if (!isObject(data) || data.app !== BACKUP_APP || !isObject(data.tables)) return "This isn't a Launch backup file.";
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return 'This backup is from a newer version of the app. Update the app first.';
  }

  const tables: Backup['tables'] = {};
  for (const name of tableNames) {
    const records = data.tables[name] ?? [];
    if (!Array.isArray(records) || !records.every((r) => isObject(r) && typeof r.id === 'string')) {
      return `The backup's "${name}" data is damaged.`;
    }
    tables[name] = records as Record<string, unknown>[];
  }
  return {
    app: BACKUP_APP,
    version: data.version,
    exportedAt: typeof data.exportedAt === 'number' ? data.exportedAt : 0,
    settings: data.settings,
    tables,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
