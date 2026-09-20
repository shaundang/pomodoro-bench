import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const app = read('js/app.js');
const sync = read('js/sync.js');
const contract = JSON.parse(read('persistence-contract.json'));

const listed = [
  ...Object.keys(contract.data),
  ...contract.deviceLocal,
  ...contract.cacheOrQueue,
  ...contract.migrationCopies
].filter((key) => !key.includes('*'));

describe('persistence contract', () => {
  it('classifies every localStorage key in the application', () => {
    const keys = [...app.matchAll(/['"](pomodoroBench\.[^'"]+)['"]/g)].map((m) => m[1]);
    const concrete = [...new Set(keys)].filter((key) => !key.includes('${'));
    expect(concrete.filter((key) => !listed.includes(key))).toEqual([]);
  });

  it('gives every product data key a Firestore field in the backup and sync paths', () => {
    const backupStart = app.indexOf('function buildBackupData');
    const backupEnd = app.indexOf('function applyIncomingBackup', backupStart);
    const backup = app.slice(backupStart, backupEnd);
    for (const field of Object.values(contract.data)) {
      expect(backup, `${field} missing from buildBackupData`).toMatch(new RegExp(`\\b${field}\\s*:`));
      expect(sync, `${field} missing from sync.js`).toMatch(new RegExp(`\\b${field}\\s*:`));
    }
  });
});
