import { describe, it, expect } from 'vitest';
import { mountApp } from './helpers/mountApp.js';
import { KEYS, skillMarks } from './helpers/storage.js';
import { todayKey } from './helpers/dates.js';

function seed(sessionsList) {
  localStorage.setItem(KEYS.sessions, JSON.stringify(sessionsList));
}

function focusSession(category, minutes) {
  return { id: Math.random().toString(36).slice(2), date: todayKey(), category, task: 't', taskId: null, minutes, timestamp: Date.now(), status: 'completed', type: 'focus', intention: null, quality: null };
}

describe('hours logged per skill', () => {
  it('shows nothing logged as an empty state', async () => {
    const els = await mountApp();
    expect(els.skillsList.textContent).toContain('Nothing logged yet.');
  });

  it('lists categories sorted by minutes logged, descending', async () => {
    seed([focusSession('Learning', 30), focusSession('Work', 600)]);
    const els = await mountApp();
    const names = [...els.skillsList.querySelectorAll('.cat-name')].map((n) => n.textContent);
    expect(names).toEqual(['Work', 'Learning']);
  });

  it('with no goal set, the bar targets the next milestone above the hours logged', async () => {
    seed([focusSession('Work', 600)]); // 10 hours
    const els = await mountApp();
    const row = els.skillsList.querySelector('.skill-row');
    // nextMilestone(10, 10000) === 50 -> 10/50 = 20%
    expect(row.querySelector('.cat-bar-fill').style.width).toBe('20%');
    expect(row.querySelector('.skill-mark-btn').textContent).toBe('goal 10000h');
  });

  it('setting a goal switches the bar to measure against it directly', async () => {
    seed([focusSession('Work', 600)]); // 10 hours
    const els = await mountApp();

    els.skillsList.querySelector('.skill-mark-btn').click();
    const input = els.skillsList.querySelector('.skill-mark-input');
    input.value = '50';
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(skillMarks()).toMatchObject({ Work: 50 });
    const row = els.skillsList.querySelector('.skill-row');
    expect(row.querySelector('.cat-bar-fill').style.width).toBe('20%'); // 10/50
    expect(row.querySelector('.skill-mark-btn').textContent).toBe('goal 50h');
  });

  // The case above cannot tell the two modes apart: nextMilestone(10, 50) is
  // 50 as well, so a chosen goal that still went through the ladder would also
  // read 20%. A goal set well above the next rung is the discriminating case.
  it('a chosen goal is measured linearly even when rungs lie below it', async () => {
    localStorage.setItem(KEYS.skillMarks, JSON.stringify({ Work: 300 }));
    seed([focusSession('Work', 600)]); // 10 hours
    const els = await mountApp();
    const row = els.skillsList.querySelector('.skill-row');
    // 10/300 = 3%. Going through the ladder would give nextMilestone(10,300)
    // = 50 and so 20% — the bug this replaced.
    expect(row.querySelector('.cat-bar-fill').style.width).toBe('3%');
    expect(row.querySelector('.skill-mark-btn').textContent).toBe('goal 300h');
  });

  // Colour and the tick track the goal, never a rung, so "reached" keeps one
  // meaning in the mode where the bar is measured against something else.
  it('clearing a milestone rung is not reaching the default goal', async () => {
    seed([focusSession('Work', 36000)]); // 600 hours — past the 500h rung
    const els = await mountApp();
    const row = els.skillsList.querySelector('.skill-row');
    const fill = row.querySelector('.cat-bar-fill');
    expect(fill.style.width).toBe('60%'); // 600/1000, the next rung up
    expect(fill.classList.contains('cat-bar-reached')).toBe(false);
    expect(row.querySelector('.skill-mark-btn').textContent).toBe('goal 10000h');
  });

  it('marks a chosen goal as reached once the hours are in', async () => {
    localStorage.setItem(KEYS.skillMarks, JSON.stringify({ Work: 10 }));
    seed([focusSession('Work', 600)]); // 10 hours
    const els = await mountApp();
    const row = els.skillsList.querySelector('.skill-row');
    const fill = row.querySelector('.cat-bar-fill');
    expect(fill.style.width).toBe('100%');
    expect(fill.classList.contains('cat-bar-reached')).toBe(true);
    expect(row.querySelector('.skill-mark-btn').textContent).toBe('goal 10h ✓');
  });
});
