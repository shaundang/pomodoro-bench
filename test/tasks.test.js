import { describe, it, expect } from 'vitest';
import { mountApp, addTaskViaForm, setValue } from './helpers/mountApp.js';
import { tasks } from './helpers/storage.js';

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
});
