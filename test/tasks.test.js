import { describe, it, expect } from 'vitest';
import { mountApp, addTaskViaForm, setValue } from './helpers/mountApp.js';
import { tasks, KEYS } from './helpers/storage.js';

describe('task list', () => {
  it('adds a task through the form and clears the inputs afterwards', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 3);

    const stored = tasks();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'Write report', category: 'Work', estimate: 3, completed: 0, done: false });
    expect(els.newTaskName.value).toBe('');
    expect(els.newTaskEstimate.value).toBe('1');
    expect(els.taskList.querySelector('.task-name').textContent).toBe('Write report');
  });

  it('ignores submission with an empty name', async () => {
    const els = await mountApp();
    addTaskViaForm(els, '   ', 'Work', 1);
    expect(tasks()).toHaveLength(0);
  });

  it('toggling done hides the task once the day rolls over, but not today', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 1);
    const id = tasks()[0].id;

    els.taskList.querySelector('[data-action="toggle-done"]').click();
    expect(tasks()[0].done).toBe(true);
    // Done today: still shown, struck through.
    expect(els.taskList.querySelector('.task-card-done')).not.toBeNull();

    // Backdate completion to yesterday, then force a re-render the same way
    // any other task-list action would (js/app.js:1063-1071).
    const stamped = tasks();
    stamped[0].doneAt = Date.now() - 24 * 60 * 60 * 1000;
    localStorage.setItem('pomodoroBench.tasks.v1', JSON.stringify(stamped));
    addTaskViaForm(els, 'Second task', 'Work', 1);

    expect(els.taskList.querySelectorAll('.task-card')).toHaveLength(1);
    expect(els.taskList.querySelector('.task-name').textContent).toBe('Second task');
    expect(tasks().find((t) => t.id === id).done).toBe(true); // still done, just hidden
  });

  it('deleting a task removes it and Undo restores it', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 1);

    els.taskList.querySelector('[data-action="delete-task"]').click();
    expect(tasks()).toHaveLength(0);
    expect(els.undoToast.hidden).toBe(false);

    els.undoBtn.click();
    expect(tasks()).toHaveLength(1);
    expect(tasks()[0].name).toBe('Write report');
    expect(els.undoToast.hidden).toBe(true);
  });

  it('editing a task updates its name, category and estimate', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 1);

    els.taskList.querySelector('[data-action="edit-task"]').click();
    const card = els.taskList.querySelector('.task-card-edit');
    setValue(card.querySelector('.edit-task-name'), 'Write the report');
    setValue(card.querySelector('.edit-task-estimate'), 5);
    card.querySelector('[data-action="save-task"]').click();

    const t = tasks()[0];
    expect(t.name).toBe('Write the report');
    expect(t.estimate).toBe(5);
  });

  it('clearing the active task when it is marked done', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 1);
    els.taskList.querySelector('[data-action="activate"]').click();
    expect(els.startPauseBtn.disabled).toBe(false);

    els.taskList.querySelector('[data-action="toggle-done"]').click();
    expect(els.startPauseBtn.disabled).toBe(true);
    expect(els.categoryLabel.textContent).toBe('No task selected');
  });
  it('sets aside an unreadable tasks store instead of letting the next save overwrite it', async () => {
    const corrupt = '{"this is not": json';
    localStorage.setItem(KEYS.tasks, corrupt);
    const els = await mountApp();
    addTaskViaForm(els, 'Fresh start', 'Work', 1);

    // The new task went in, and the broken original is still recoverable.
    expect(tasks().map((t) => t.name)).toEqual(['Fresh start']);
    expect(localStorage.getItem(KEYS.tasks + '.corrupt')).toBe(corrupt);
  });

  it('keeps the first stashed copy when the store is found corrupt again later', async () => {
    localStorage.setItem(KEYS.tasks, 'first bad');
    await mountApp();
    localStorage.setItem(KEYS.tasks, 'second bad');
    const els = await mountApp();
    addTaskViaForm(els, 'X', 'Work', 1);
    expect(localStorage.getItem(KEYS.tasks + '.corrupt')).toBe('first bad');
  });

  it('drops junk entries from the tasks store without discarding the real ones', async () => {
    localStorage.setItem(KEYS.tasks, JSON.stringify([
      null,
      'not a task',
      { id: 'keep-me', name: 'Survivor', category: 'Work', estimate: 2, completed: 1, done: false, createdAt: 1 }
    ]));
    const els = await mountApp();
    addTaskViaForm(els, 'New one', 'Work', 1);

    const names = tasks().map((t) => t.name);
    expect(names).toEqual(['Survivor', 'New one']);
    expect(localStorage.getItem(KEYS.tasks + '.corrupt')).toBeNull();
  });

  it('treats a tasks store that is not an array as corrupt', async () => {
    localStorage.setItem(KEYS.tasks, '{"id":"x","name":"lonely object"}');
    const els = await mountApp();
    addTaskViaForm(els, 'New one', 'Work', 1);
    expect(tasks()).toHaveLength(1);
    expect(localStorage.getItem(KEYS.tasks + '.corrupt')).toBe('{"id":"x","name":"lonely object"}');
  });
  // The store hook js/sync.js plugs into: every user-made change is also
  // handed over as one small per-task op, and while nothing is plugged in
  // the ids that changed are remembered for the next sign-in.
  describe('task store hook', () => {
    it('hands each change to the backend as a per-task op', async () => {
      const els = await mountApp();
      localStorage.removeItem(KEYS.tasks + '.pending'); // earlier tests in this file ran with no backend
      const ops = [];
      window.PomodoroBench.setTaskBackend({ apply: (op) => ops.push(op) });

      addTaskViaForm(els, 'Hooked', 'Work', 2);
      const id = tasks()[0].id;
      expect(ops.at(-1)).toMatchObject({ type: 'set', id, task: { name: 'Hooked', estimate: 2 } });

      els.taskList.querySelector('[data-action="toggle-done"]').click();
      expect(ops.at(-1)).toMatchObject({ type: 'update', id, fields: { done: true } });
      expect(Object.keys(ops.at(-1).fields).sort()).toEqual(['done', 'doneAt', 'doneChangedAt', 'updatedAt']);

      els.taskList.querySelector('[data-action="delete-task"]').click();
      expect(ops.at(-1)).toEqual({ type: 'delete', id });

      els.undoBtn.click();
      expect(ops.at(-1)).toMatchObject({ type: 'set', id, task: { name: 'Hooked' } });
      expect(localStorage.getItem(KEYS.tasks + '.pending')).toBeNull();
    });

    it('with no backend, remembers which ids changed so a later sign-in uploads exactly those', async () => {
      const els = await mountApp();
      addTaskViaForm(els, 'A', 'Work', 1);
      addTaskViaForm(els, 'B', 'Work', 1);
      const [a, b] = tasks();
      els.taskList.querySelector(`[data-action="toggle-done"][data-id="${a.id}"]`).click();
      els.taskList.querySelector(`[data-action="delete-task"][data-id="${b.id}"]`).click();

      const pending = window.PomodoroBench.takePendingTaskOps();
      expect(pending.upserts).toEqual([a.id]); // A: created then ticked → one upsert
      expect(pending.deletes).toEqual([b.id]); // B: created then deleted → a delete, not an upsert
      expect(window.PomodoroBench.takePendingTaskOps()).toEqual({ upserts: [], deletes: [] });
    });

    it('replaceTasksFromRemote swaps the cache wholesale and drops what hangs off vanished ids', async () => {
      const els = await mountApp();
      addTaskViaForm(els, 'Gone', 'Work', 1);
      addTaskViaForm(els, 'Kept', 'Work', 1);
      const [gone, kept] = tasks();
      els.taskList.querySelector(`[data-action="activate"][data-id="${gone.id}"]`).click();
      els.taskList.querySelector(`[data-action="edit-task"][data-id="${gone.id}"]`).click();
      expect(els.taskList.querySelector('.edit-task-name')).not.toBeNull();

      window.PomodoroBench.takePendingTaskOps(); // the adds above were user changes; clear them so the next check isolates the mirror write
      window.PomodoroBench.replaceTasksFromRemote([{ ...kept, name: 'Kept (renamed)' }, { id: 'new', name: 'From the store', createdAt: 1 }]);

      expect(tasks().map((t) => t.name)).toEqual(['Kept (renamed)', 'From the store']);
      expect(tasks().find((t) => t.id === 'new')).toMatchObject({ estimate: 1, completed: 0, done: false, notes: [] }); // normalized
      expect(els.taskList.querySelector('.edit-task-name')).toBeNull(); // the edit card for the vanished task is gone
      expect(els.categoryLabel.textContent).toBe('No task selected');
      expect(localStorage.getItem(KEYS.tasks + '.pending')).toBeNull(); // a mirror write is not a user change
    });
  });
  // The card's pomodoro count and the session log are two records of the
  // same fact. The log always synced fully; the counter did not. The card
  // now shows whichever is higher, and the counter is raised to match once.
  describe('completed count vs. the session log', () => {
    const seedTask = (over) => localStorage.setItem(KEYS.tasks, JSON.stringify([
      Object.assign({ id: 'T', name: 'Fix bug cronjob', category: 'Learning', estimate: 1, completed: 0, done: false, doneAt: null, doneChangedAt: 0, createdAt: 1, updatedAt: 1, sessionPresetId: 'study', workMin: 25, breakMin: 5, notes: [] }, over)
    ]));
    const session = (over) => Object.assign({ id: 's' + Math.random(), date: '2026-09-04', category: 'Learning', task: 'Fix bug cronjob', taskId: 'T', minutes: 25, timestamp: 1, status: 'completed', type: 'focus' }, over);

    it('shows the pomodoros the log proves, even when the stored counter says 0, and repairs the counter', async () => {
      seedTask();
      localStorage.setItem(KEYS.sessions, JSON.stringify([session(), session({ type: 'break', minutes: 5 })]));
      const els = await mountApp();
      expect(els.taskList.querySelector('.task-progress-text').textContent).toBe('1/1 🍅');
      expect(tasks()[0].completed).toBe(1); // raised in the cache at boot
      expect(localStorage.getItem(KEYS.tasks + '.pending')).toBeNull(); // no pending op: the signed-in repair runs against the store's copy
    });

    it('does not count skipped sessions, sessions without a taskId, or other tasks', async () => {
      seedTask();
      localStorage.setItem(KEYS.sessions, JSON.stringify([
        session({ status: 'skipped' }),
        session({ taskId: null }),
        session({ taskId: 'someone-else' })
      ]));
      const els = await mountApp();
      expect(els.taskList.querySelector('.task-progress-text').textContent).toBe('0/1 🍅');
      expect(tasks()[0].completed).toBe(0);
    });

    it('never lowers a stored counter that is higher than the log (old sessions had no taskId)', async () => {
      seedTask({ completed: 3, estimate: 4 });
      localStorage.setItem(KEYS.sessions, JSON.stringify([session()]));
      const els = await mountApp();
      expect(els.taskList.querySelector('.task-progress-text').textContent).toBe('3/4 🍅');
      expect(tasks()[0].completed).toBe(3);
    });

    it('repairCompletedCounts with forward writes the raised counter as an absolute value, once', async () => {
      seedTask();
      localStorage.setItem(KEYS.sessions, JSON.stringify([session(), session()]));
      await mountApp(); // boot repair already raised the cache to 2
      const ops = [];
      window.PomodoroBench.setTaskBackend({ apply: (op) => ops.push(op) });
      expect(window.PomodoroBench.repairCompletedCounts({ forward: true })).toBe(0); // nothing left to raise

      localStorage.setItem(KEYS.sessions, JSON.stringify([session(), session(), session()]));
      expect(window.PomodoroBench.repairCompletedCounts({ forward: true })).toBe(1);
      expect(ops).toHaveLength(1);
      expect(ops[0]).toMatchObject({ type: 'update', id: 'T', fields: { completed: 3 } });
      expect(tasks()[0].completed).toBe(3);
    });
  });
});
