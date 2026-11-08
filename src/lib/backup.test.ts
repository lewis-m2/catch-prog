import { describe, expect, it } from 'vitest';
import { backupFileName, parseBackup } from './backup';

const TABLES = ['crews', 'sessions'];

describe('parseBackup', () => {
  it('accepts a backup and fills in missing tables as empty', () => {
    const text = JSON.stringify({ app: 'launch', version: 1, exportedAt: 5, settings: { theme: 'dawn' }, tables: { crews: [{ id: 'a' }] } });
    expect(parseBackup(text, TABLES)).toEqual({
      app: 'launch',
      version: 1,
      exportedAt: 5,
      settings: { theme: 'dawn' },
      tables: { crews: [{ id: 'a' }], sessions: [] },
    });
  });

  it('rejects files that are not a Launch backup', () => {
    expect(parseBackup('not json', TABLES)).toContain("isn't JSON");
    expect(parseBackup('{"app":"other","tables":{}}', TABLES)).toContain("isn't a Launch backup");
  });

  it('rejects a backup from a newer app version', () => {
    expect(parseBackup('{"app":"launch","version":2,"tables":{}}', TABLES)).toContain('newer version');
  });

  it('rejects records without an id', () => {
    expect(parseBackup('{"app":"launch","version":1,"tables":{"crews":[{"name":"x"}]}}', TABLES)).toContain('"crews"');
  });
});

it('names the file by local date', () => {
  expect(backupFileName(new Date(2026, 10, 5, 9).getTime())).toBe('launch-backup-2026-11-05.json');
});
