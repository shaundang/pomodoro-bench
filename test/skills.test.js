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
    seed([focusSession('Work', 600)]);
    const els = await mountApp();
    const row = els.skillsList.querySelector('.skill-row');
    expect(row.querySelector('.cat-bar-fill').style.width).toBe('20%');
    expect(row.querySelector('.skill-mark-btn').textContent).toBe('Set goal');
    expect(row.querySelector('.skill-target').textContent).toBe('Next milestone: 50h');
  });

  it('setting a goal switches the bar to measure against it directly', async () => {
    seed([focusSession('Work', 600)]);
    const els = await mountApp();

    els.skillsList.querySelector('.skill-mark-btn').click();
    const input = els.skillsList.querySelector('.skill-mark-input');
    input.value = '50';
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(skillMarks()).toMatchObject({ Work: 50 });
    const row = els.skillsList.querySelector('.skill-row');
    expect(row.querySelector('.cat-bar-fill').style.width).toBe('20%');
    expect(row.querySelector('.skill-mark-btn').textContent).toBe('Edit goal');
    expect(row.querySelector('.skill-target').textContent).toBe('Goal: 50h');
  });

  it('a chosen goal is measured linearly even when rungs lie below it', async () => {
    localStorage.setItem(KEYS.skillMarks, JSON.stringify({ Work: 300 }));
    seed([focusSession('Work', 600)]);
    const els = await mountApp();
    const row = els.skillsList.querySelector('.skill-row');
    expect(row.querySelector('.cat-bar-fill').style.width).toBe('3%');
    expect(row.querySelector('.skill-target').textContent).toBe('Goal: 300h');
  });

  it('clearing a milestone rung is not reaching the default goal', async () => {
    seed([focusSession('Work', 36000)]);
    const els = await mountApp();
    const row = els.skillsList.querySelector('.skill-row');
    const fill = row.querySelector('.cat-bar-fill');
    expect(fill.style.width).toBe('60%');
    expect(fill.classList.contains('cat-bar-reached')).toBe(false);
    expect(row.querySelector('.skill-target').textContent).toBe('Next milestone: 1000h');
  });

  it('marks a chosen goal as reached once the hours are in', async () => {
    localStorage.setItem(KEYS.skillMarks, JSON.stringify({ Work: 10 }));
    seed([focusSession('Work', 600)]);
    const els = await mountApp();
    const row = els.skillsList.querySelector('.skill-row');
    const fill = row.querySelector('.cat-bar-fill');
    expect(fill.style.width).toBe('100%');
    expect(fill.classList.contains('cat-bar-reached')).toBe(true);
    expect(row.querySelector('.skill-target').textContent).toBe('Goal: 10h ✓');
  });
});
