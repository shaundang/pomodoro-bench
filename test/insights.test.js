import { describe, it, expect } from 'vitest';
import { mountApp } from './helpers/mountApp.js';
import { KEYS } from './helpers/storage.js';
import { todayKey, daysAgoKey } from './helpers/dates.js';

function seed(list) {
  localStorage.setItem(KEYS.sessions, JSON.stringify(list));
}

function focusSession(overrides) {
  return { id: Math.random().toString(36).slice(2), date: todayKey(), category: 'Work', task: 't', taskId: null, minutes: 30, timestamp: Date.now(), status: 'completed', type: 'focus', intention: null, quality: null, ...overrides };
}

describe('view tabs', () => {
  it('switches between the Timer and Statistics views', async () => {
    const els = await mountApp();
    expect(els.viewTimer.hidden).toBe(false);
    expect(els.viewStats.hidden).toBe(true);

    els.tabStatsBtn.click();
    expect(els.viewTimer.hidden).toBe(true);
    expect(els.viewStats.hidden).toBe(false);
    expect(els.tabStatsBtn.getAttribute('aria-selected')).toBe('true');

    els.tabTimerBtn.click();
    expect(els.viewTimer.hidden).toBe(false);
  });
});

describe('insights: by category', () => {
  it('shows the empty state with no focus sessions', async () => {
    const els = await mountApp();
    expect(els.categoryAllList.textContent).toContain('No focus sessions logged yet.');
  });

  it('breaks down minutes by category as a percentage of the total', async () => {
    seed([focusSession({ category: 'Work', minutes: 60 }), focusSession({ category: 'Learning', minutes: 20 })]);
    const els = await mountApp();

    const rows = [...els.categoryAllList.querySelectorAll('.cat-row-legend')];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Work');
    expect(rows[0].querySelector('.cat-pct').textContent).toBe('75%');
    expect(rows[1].querySelector('.cat-pct').textContent).toBe('25%');
  });

  it('the Day range tab restricts the breakdown to today only', async () => {
    seed([focusSession({ date: todayKey(), category: 'Work', minutes: 30 }), focusSession({ date: daysAgoKey(2), category: 'Learning', minutes: 90 })]);
    const els = await mountApp();

    els.categoryRangeTabs.querySelector('[data-range="day"]').click();
    expect(els.categoryRangeTabs.querySelector('[data-range="day"]').getAttribute('aria-selected')).toBe('true');
    const rows = [...els.categoryAllList.querySelectorAll('.cat-row-legend')];
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Work');
  });
});

describe('insights: by hour of day', () => {
  it('reports "not enough data" when nothing is logged', async () => {
    const els = await mountApp();
    expect(document.getElementById('peakHourNote').textContent).toBe('Not enough data yet to spot a pattern.');
  });

  it('names the peak focus hour once sessions exist', async () => {
    seed([focusSession({ minutes: 30 })]);
    const els = await mountApp();
    expect(document.getElementById('peakHourNote').textContent).toContain('Peak focus hours:');
  });
});

describe('pomodoro heatmap', () => {
  it('shows the current year and disables navigating into the future', async () => {
    const els = await mountApp();
    expect(els.heatmapYear.textContent).toBe(String(new Date().getFullYear()));
    expect(els.heatmapNextYearBtn.disabled).toBe(true);
  });

  it('Previous year steps back and re-enables Next', async () => {
    const els = await mountApp();
    els.heatmapPrevYearBtn.click();
    expect(els.heatmapYear.textContent).toBe(String(new Date().getFullYear() - 1));
    expect(els.heatmapNextYearBtn.disabled).toBe(false);
  });
});
