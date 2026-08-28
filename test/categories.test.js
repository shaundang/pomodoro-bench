import { describe, it, expect } from 'vitest';
import { mountApp, setValue, submitForm } from './helpers/mountApp.js';
import { categories, tasks } from './helpers/storage.js';

describe('categories', () => {
  it('boots with the three default categories', async () => {
    await mountApp();
    expect(categories()).toEqual(['Learning', 'Work', 'Personal']);
  });

  it('creating a category from the add-task form assigns it to the new task', async () => {
    const els = await mountApp();
    setValue(els.newTaskCategory, '__new__');
    expect(els.newTaskCategoryCreate.hidden).toBe(false);

    setValue(els.newTaskCategoryCreate, 'Side project');
    els.newTaskCategoryCreate.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(categories()).toContain('Side project');

    setValue(els.newTaskName, 'Build the thing');
    submitForm(els.taskForm);
    expect(tasks()[0].category).toBe('Side project');
  });

  it('changing a task\'s category inline updates it in place', async () => {
    const els = await mountApp();
    setValue(els.newTaskName, 'Write report');
    setValue(els.newTaskCategory, 'Work');
    submitForm(els.taskForm);

    els.taskList.querySelector('[data-action="edit-category"]').click();
    const select = els.taskList.querySelector('.cat-inline-select');
    setValue(select, 'Personal');

    expect(tasks()[0].category).toBe('Personal');
  });
});
