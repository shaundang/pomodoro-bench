import { describe, it, expect } from 'vitest';
import { mountApp, addTaskViaForm } from './helpers/mountApp.js';
import { tasks, sessions, categories } from './helpers/storage.js';

describe('backup export/import (window.PomodoroBench)', () => {
  it('buildBackupData snapshots sessions, tasks, categories and custom presets', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 1);

    const data = window.PomodoroBench.buildBackupData();
    expect(data.app).toBe('pomodoro-bench');
    expect(data.version).toBe(5);
    expect(data.tasks).toHaveLength(1);
    expect(data.categories).toEqual(['Learning', 'Work', 'Personal']);
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(Array.isArray(data.presets)).toBe(true);
  });

  it('merges an incoming backup additively, without touching existing local items', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Local task', 'Work', 1);
    const localTaskId = tasks()[0].id;

    const result = window.PomodoroBench.applyIncomingBackup({
      sessions: [{ id: 'remote-s1', date: '2024-01-01', category: 'Learning', task: 'Remote session', minutes: 25, timestamp: 1, status: 'completed', type: 'focus' }],
      tasks: [{ id: 'remote-t1', name: 'Remote task', category: 'Learning', estimate: 2 }],
      categories: ['Remote category']
    });

    expect(result).toMatchObject({ addedSessions: 1, addedTasks: 1, addedCategories: 1 });
    expect(tasks().map((t) => t.id)).toEqual(expect.arrayContaining([localTaskId, 'remote-t1']));
    expect(sessions().map((s) => s.id)).toContain('remote-s1');
    expect(categories()).toContain('Remote category');
  });

  it('skips remote items whose id already exists locally', async () => {
    await mountApp();
    window.PomodoroBench.applyIncomingBackup({
      sessions: [{ id: 's1', date: '2024-01-01', category: 'Work', task: 'A', minutes: 10, timestamp: 1, status: 'completed', type: 'focus' }],
      tasks: []
    });
    const result = window.PomodoroBench.applyIncomingBackup({
      sessions: [{ id: 's1', date: '2024-01-01', category: 'Work', task: 'A duplicate', minutes: 999, timestamp: 2, status: 'completed', type: 'focus' }],
      tasks: []
    });

    expect(result.addedSessions).toBe(0);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0].minutes).toBe(10); // untouched by the duplicate
  });

  it('rejects a backup with no sessions and no tasks', async () => {
    await mountApp();
    expect(() => window.PomodoroBench.applyIncomingBackup({ sessions: [], tasks: [] })).toThrow('invalid backup format');
  });
});
