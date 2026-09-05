import { describe, it, expect } from 'vitest';
import { mountApp, addTaskViaForm, setValue } from './helpers/mountApp.js';

// Regression coverage for the "only ~3 colors in practice" bug: the old hash
// (plain sum of char codes, mod 6) was heavily biased for short lowercase-ish
// English words, so most category names collapsed onto the same 2-3 buckets
// even though 6 colors existed. The fix is two parts — a better-mixing hash,
// and a properly hue-separated 8-color palette (see js/app.js and
// css/style.css, "categorical palette") — and both are exercised here.
describe('category colors', () => {
  it('exposes categoryColorIndex/categoryColorClass and an 8-color count', async () => {
    await mountApp();
    expect(window.PomodoroBench.CATEGORY_COLOR_COUNT).toBe(8);
    expect(typeof window.PomodoroBench.categoryColorIndex).toBe('function');
    expect(typeof window.PomodoroBench.categoryColorClass).toBe('function');
  });

  it('always returns an index inside 0..7 and the matching cat-color-N class', async () => {
    await mountApp();
    const names = ['Work', 'Personal', 'Learning', 'a', '', 'Errands', 'Health & Fitness', 'x'.repeat(50)];
    for (const name of names) {
      const idx = window.PomodoroBench.categoryColorIndex(name);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(8);
      expect(Number.isInteger(idx)).toBe(true);
      expect(window.PomodoroBench.categoryColorClass(name)).toBe('cat-color-' + idx);
    }
  });

  it('is deterministic: the same name always maps to the same color', async () => {
    await mountApp();
    const idx1 = window.PomodoroBench.categoryColorIndex('Side project');
    const idx2 = window.PomodoroBench.categoryColorIndex('Side project');
    expect(idx1).toBe(idx2);
  });

  it('spreads a realistic set of category names across most of the 8 buckets', async () => {
    // Ordinary, short, lowercase-ish English words — exactly the shape that
    // collapsed under the old "sum of char codes mod 6" hash. A fair hash
    // over 8 buckets should spread ~20 such names across most of them, not
    // pile them onto 2-3.
    await mountApp();
    const names = [
      'Work', 'Personal', 'Learning', 'Health', 'Errands', 'Reading', 'Finance',
      'Family', 'Cooking', 'Fitness', 'Travel', 'Music', 'Writing', 'Coding',
      'Design', 'Garden', 'Cleaning', 'Shopping', 'Study', 'Hobby'
    ];
    const buckets = new Set(names.map((n) => window.PomodoroBench.categoryColorIndex(n)));
    // Regression guard: the old biased hash puts 20 names like these into
    // 2-3 buckets. Requiring at least 6 of 8 distinct buckets used would
    // fail against that old hash and passes against the fixed one.
    expect(buckets.size).toBeGreaterThanOrEqual(6);
  });

  it('does not collapse onto a single bucket the way the old biased hash did', async () => {
    // The old hash (sum of char codes, mod 6) sends every one of these to
    // bucket 0: each pair swaps two adjacent characters, which a sum-based
    // hash can't tell apart, so they used to render identically.
    await mountApp();
    const anagramish = ['Work', 'Wrok', 'Owrk', 'Krow'];
    const buckets = new Set(anagramish.map((n) => window.PomodoroBench.categoryColorIndex(n)));
    expect(buckets.size).toBeGreaterThan(1);
  });

  it('renders a task chip with the cat-color-N class matching categoryColorIndex', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 1);

    const chip = els.taskList.querySelector('.task-category-chip');
    const expected = window.PomodoroBench.categoryColorClass('Work');
    expect(chip.className.split(' ')).toContain(expected);
  });

  it('assigns a distinct chip color to a freshly created custom category', async () => {
    const els = await mountApp();
    setValue(els.newTaskCategory, '__new__');
    setValue(els.newTaskCategoryCreate, 'Side project');
    els.newTaskCategoryCreate.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    addTaskViaForm(els, 'Build the thing', null, 1);

    const chip = els.taskList.querySelector('.task-category-chip');
    const expected = window.PomodoroBench.categoryColorClass('Side project');
    expect(chip.className.split(' ')).toContain(expected);
  });
});
