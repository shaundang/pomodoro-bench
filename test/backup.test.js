import { describe, it, expect } from 'vitest';
import { mountApp, addTaskViaForm } from './helpers/mountApp.js';
import { tasks, sessions, categories, garden, timerState, KEYS } from './helpers/storage.js';

describe('backup export/import (window.PomodoroBench)', () => {
  it('buildBackupData snapshots sessions, tasks, categories and custom presets', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 1);

    const data = window.PomodoroBench.buildBackupData();
    expect(data.app).toBe('pomodoro-bench');
    expect(data.version).toBe(6);
    expect(data.tasks).toHaveLength(1);
    expect(data.categories).toEqual(['Learning', 'Work', 'Personal']);
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(Array.isArray(data.presets)).toBe(true);
    // The farm has to travel too, or restoring a backup keeps every session
    // and quietly throws the whole garden away.
    expect(data.garden).toMatchObject({ spent: expect.any(Number), income: expect.any(Number) });
    expect(Array.isArray(data.garden.items)).toBe(true);
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

  describe('a task shared by two devices', () => {
    // Reproduces the reported bug: mark a task done on device A, pull that
    // same task (same id, already present locally) on device B — it must
    // show up done there too, not linger forever as unfinished.
    it('applies a done/completed update from a newer remote copy of the same task id', async () => {
      await mountApp();
      // Seed the local task the way device B would already have it: done:false.
      localStorage.setItem('pomodoroBench.tasks.v1', JSON.stringify([
        { id: 't1', name: 'Write report', category: 'Work', estimate: 1, completed: 0, done: false, doneAt: null, createdAt: 1, updatedAt: 1, sessionPresetId: 'deep', workMin: 50, breakMin: 10, notes: [] }
      ]));

      // Device A marked it done later and pushed a newer updatedAt.
      const result = window.PomodoroBench.applyIncomingBackup({
        sessions: [],
        tasks: [{ id: 't1', name: 'Write report', category: 'Work', estimate: 1, completed: 0, done: true, doneAt: 500, updatedAt: 500 }]
      });

      const t = tasks().find((x) => x.id === 't1');
      expect(t.done).toBe(true);
      expect(t.doneAt).toBe(500);
      expect(result.updatedTasks).toBe(1);
      expect(result.addedTasks).toBe(0);
    });

    it('ignores a remote copy that is not newer than the local one', async () => {
      await mountApp();
      localStorage.setItem('pomodoroBench.tasks.v1', JSON.stringify([
        { id: 't1', name: 'Write report', category: 'Work', estimate: 1, completed: 3, done: true, doneAt: 900, createdAt: 1, updatedAt: 900, sessionPresetId: 'deep', workMin: 50, breakMin: 10, notes: [] }
      ]));

      // A stale snapshot from before the local edit (older/equal updatedAt).
      const result = window.PomodoroBench.applyIncomingBackup({
        sessions: [],
        tasks: [{ id: 't1', name: 'Write report', category: 'Work', estimate: 1, completed: 0, done: false, doneAt: null, updatedAt: 100 }]
      });

      const t = tasks().find((x) => x.id === 't1');
      expect(t.done).toBe(true);
      expect(t.completed).toBe(3);
      expect(result.updatedTasks).toBe(0);
    });

    // A task marked done on a device that predates the updatedAt stamp never
    // got one bumped — both sides backfill it to the same createdAt, so the
    // "strictly newer wins" rule above sees a tie and does nothing, and the
    // done never crosses over. This is the one-time bridge for exactly that.
    it('adopts a done from a tied remote copy (pre-updatedAt client) instead of leaving it stuck unfinished', async () => {
      await mountApp();
      localStorage.setItem('pomodoroBench.tasks.v1', JSON.stringify([
        { id: 't1', name: 'Write report', category: 'Work', estimate: 1, completed: 0, done: false, doneAt: null, createdAt: 1, updatedAt: 1, sessionPresetId: 'deep', workMin: 50, breakMin: 10, notes: [] }
      ]));

      const result = window.PomodoroBench.applyIncomingBackup({
        sessions: [],
        tasks: [{ id: 't1', name: 'Write report', category: 'Work', estimate: 1, completed: 0, done: true, doneAt: 42, createdAt: 1, updatedAt: 1 }]
      });

      const t = tasks().find((x) => x.id === 't1');
      expect(t.done).toBe(true);
      expect(t.doneAt).toBe(42);
      expect(result.updatedTasks).toBe(1);
    });

    it('does not un-finish an already-done task from a tied remote copy that is still unfinished', async () => {
      await mountApp();
      localStorage.setItem('pomodoroBench.tasks.v1', JSON.stringify([
        { id: 't1', name: 'Write report', category: 'Work', estimate: 1, completed: 0, done: true, doneAt: 42, createdAt: 1, updatedAt: 1, sessionPresetId: 'deep', workMin: 50, breakMin: 10, notes: [] }
      ]));

      const result = window.PomodoroBench.applyIncomingBackup({
        sessions: [],
        tasks: [{ id: 't1', name: 'Write report', category: 'Work', estimate: 1, completed: 0, done: false, doneAt: null, createdAt: 1, updatedAt: 1 }]
      });

      const t = tasks().find((x) => x.id === 't1');
      expect(t.done).toBe(true);
      expect(t.doneAt).toBe(42);
      expect(result.updatedTasks).toBe(0);
    });
  });

  // A farm is the one thing in here you cannot get back by working again: the
  // land was paid for and the animals were raised over weeks.
  describe('the garden', () => {
    const seed = (g) => localStorage.setItem(KEYS.garden, JSON.stringify(g));
    const remote = (over) => ({
      sessions: [{ id: 'r1', date: '2024-01-01', category: 'Work', task: 'R', minutes: 25, timestamp: 1, status: 'completed', type: 'focus' }],
      tasks: [],
      garden: Object.assign({ spent: 0, income: 0, parcels: 0, basket: {}, items: [] }, over)
    });

    it('brings in plants from another device without moving the ones already there', async () => {
      seed({ spent: 12, income: 0, parcels: 4, basket: {}, items: [
        { id: 'local-1', kind: 'carrot', col: 0, row: 0, plantedAt: 1, plantedSeeds: 3 }
      ] });
      await mountApp();

      window.PomodoroBench.applyIncomingBackup(remote({ items: [
        { id: 'remote-1', kind: 'tomato', col: 1, row: 0, plantedAt: 1, plantedSeeds: 40 }
      ] }));

      const g = garden();
      expect(g.items.map((i) => i.id).sort()).toEqual(['local-1', 'remote-1']);
      const local = g.items.find((i) => i.id === 'local-1');
      expect(local).toMatchObject({ kind: 'carrot', col: 0, row: 0, plantedSeeds: 3 });
      // Age carries over, or an imported grown plant restarts as bare soil.
      expect(g.items.find((i) => i.id === 'remote-1').plantedSeeds).toBe(40);
    });

    it('charges for what it imports, so a merge cannot hand out free tokens', async () => {
      seed({ spent: 12, income: 0, parcels: 4, basket: {}, items: [] });
      await mountApp();

      window.PomodoroBench.applyIncomingBackup(remote({ spent: 500, items: [
        { id: 'remote-1', kind: 'carrot', col: 3, row: 1, plantedAt: 1, plantedSeeds: 2 }
      ] }));

      const g = garden();
      expect(g.spent).toBeGreaterThan(12);
      // What arrived, not what the other device had spent in total: the remote
      // 500 covers plants that were sold off there and are not in this farm.
      expect(g.spent).toBeLessThan(500);
    });

    it('keeps the local plant when both devices used the same plot', async () => {
      seed({ spent: 0, income: 0, parcels: 4, basket: {}, items: [
        { id: 'local-1', kind: 'carrot', col: 2, row: 1, plantedAt: 1, plantedSeeds: 9 }
      ] });
      await mountApp();

      window.PomodoroBench.applyIncomingBackup(remote({ items: [
        { id: 'remote-1', kind: 'cow', col: 2, row: 1, plantedAt: 1, plantedSeeds: 9 }
      ] }));

      const g = garden();
      expect(g.items).toHaveLength(1);
      expect(g.items[0]).toMatchObject({ id: 'local-1', kind: 'carrot' });
    });

    it('takes the larger count rather than the sum, so pulling twice changes nothing', async () => {
      seed({ spent: 0, income: 30, parcels: 5, basket: { egg: 2 }, items: [] });
      await mountApp();

      const incoming = remote({ income: 80, parcels: 7, basket: { egg: 5, mango: 1 }, items: [
        { id: 'remote-1', kind: 'carrot', col: 4, row: 1, plantedAt: 1, plantedSeeds: 2 }
      ] });
      window.PomodoroBench.applyIncomingBackup(incoming);
      const once = garden();
      window.PomodoroBench.applyIncomingBackup(incoming);
      const twice = garden();

      expect(once).toMatchObject({ income: 80, parcels: 7, basket: { egg: 5, mango: 1 } });
      // A sync pull runs over the same remote copy again and again: anything
      // summed here would grow on every pull.
      expect(twice).toEqual(once);
    });

    it('leaves the farm alone when a backup carries no garden at all', async () => {
      seed({ spent: 12, income: 4, parcels: 6, basket: { egg: 1 }, items: [
        { id: 'local-1', kind: 'carrot', col: 0, row: 0, plantedAt: 1, plantedSeeds: 3 }
      ] });
      await mountApp();

      const before = garden();
      window.PomodoroBench.applyIncomingBackup({ sessions: [{ id: 'r1', date: '2024-01-01', category: 'Work', task: 'R', minutes: 25, timestamp: 1, status: 'completed', type: 'focus' }], tasks: [] });
      expect(garden()).toEqual(before);
    });
  });
  it('a remote rename of the active task updates the timer header and timer state', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Old name', 'Work', 1);
    els.taskList.querySelector('[data-action="activate"]').click();
    const id = tasks()[0].id;
    expect(els.categoryLabel.textContent).toBe('Old name — Work');

    window.PomodoroBench.applyIncomingBackup({
      sessions: [],
      tasks: [{ id, name: 'New name', category: 'Learning', updatedAt: Date.now() + 60_000 }]
    });

    expect(els.categoryLabel.textContent).toBe('New name — Learning');
    expect(timerState()).toMatchObject({ activeTaskId: id, activeTaskName: 'New name', activeTaskCategory: 'Learning' });
  });

  it('a remote done on the active task clears it, like ticking it off locally', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Finish elsewhere', 'Work', 1);
    els.taskList.querySelector('[data-action="activate"]').click();
    const id = tasks()[0].id;
    expect(els.startPauseBtn.disabled).toBe(false);

    window.PomodoroBench.applyIncomingBackup({
      sessions: [],
      tasks: [{ id, name: 'Finish elsewhere', category: 'Work', done: true, doneAt: Date.now(), updatedAt: Date.now() + 60_000 }]
    });

    expect(tasks()[0].done).toBe(true);
    expect(timerState().activeTaskId).toBeNull();
    expect(els.startPauseBtn.disabled).toBe(true);
    expect(els.categoryLabel.textContent).toBe('No task selected');
  });

  it('a remote done on the active task leaves a running session on it alone', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Mid-session', 'Work', 1);
    els.taskList.querySelector('[data-action="activate"]').click();
    const id = tasks()[0].id;
    els.startPauseBtn.click();
    // First start of the day goes through the intention prompt.
    Array.from(els.intentActions.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Skip').click();
    expect(timerState().running).toBe(true);

    window.PomodoroBench.applyIncomingBackup({
      sessions: [],
      tasks: [{ id, name: 'Mid-session', category: 'Work', done: true, doneAt: Date.now(), updatedAt: Date.now() + 60_000 }]
    });

    expect(tasks()[0].done).toBe(true);
    expect(timerState().activeTaskId).toBe(id);
    els.startPauseBtn.click(); // pause, so no interval outlives the test
  });

  it('a merge that does not touch the active task leaves timer state untouched', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Stay put', 'Work', 1);
    els.taskList.querySelector('[data-action="activate"]').click();
    const before = timerState();

    window.PomodoroBench.applyIncomingBackup({
      sessions: [],
      tasks: [{ id: 'other', name: 'Unrelated', category: 'Work' }]
    });

    expect(timerState()).toEqual(before);
  });
});
