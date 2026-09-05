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
});
