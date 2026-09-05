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

describe('insights: Week range tab', () => {
  it('restricts the breakdown to the current Monday–Sunday week', async () => {
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7; // days since Monday
    seed([
      focusSession({ date: todayKey(), category: 'Work', minutes: 30 }),
      focusSession({ date: daysAgoKey(mondayOffset + 1), category: 'Learning', minutes: 90 }) // the Sunday before this week
    ]);
    const els = await mountApp();
    els.categoryRangeTabs.querySelector('[data-range="week"]').click();
    expect(els.categoryRangeTabs.querySelector('[data-range="week"]').getAttribute('aria-selected')).toBe('true');
    const rows = [...els.categoryAllList.querySelectorAll('.cat-row-legend')];
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Work');
  });
});

describe('insights: focus by category over time', () => {
  const legendItems = () => [...document.querySelectorAll('#trendLegend .trend-legend-item[data-category]')];

  it('shows an empty note and no legend when nothing is logged', async () => {
    await mountApp();
    expect(document.getElementById('trendNote').textContent).toBe('No focus sessions in this period.');
    expect(legendItems()).toHaveLength(0);
  });

  it('lists one legend chip per category, biggest first, plus the average', async () => {
    seed([focusSession({ category: 'English', minutes: 20 }), focusSession({ category: 'Learning', minutes: 60 })]);
    await mountApp();
    const names = legendItems().map((el) => el.dataset.category);
    expect(names).toEqual(['Learning', 'English']);
    expect(document.querySelector('#trendLegend .trend-legend-avg').textContent).toContain('Average, all categories');
    expect(document.getElementById('trendTitle').textContent).toContain('per month');
  });

  it('names the axis unit after the selected range', async () => {
    seed([focusSession({ minutes: 30 })]);
    const els = await mountApp();
    els.categoryRangeTabs.querySelector('[data-range="week"]').click();
    expect(document.getElementById('trendTitle').textContent).toContain('per day');
    els.categoryRangeTabs.querySelector('[data-range="year"]').click();
    expect(document.getElementById('trendTitle').textContent).toContain('per month');
  });

  it('clicking a legend chip isolates that category; clicking again releases it', async () => {
    seed([focusSession({ category: 'English', minutes: 20 }), focusSession({ category: 'Learning', minutes: 60 })]);
    await mountApp();
    legendItems()[1].click(); // English
    let items = legendItems();
    expect(items[1].getAttribute('aria-pressed')).toBe('true');
    expect(items[0].classList.contains('is-dim')).toBe(true);
    expect(document.querySelector('#trendLegend .trend-legend-avg').textContent).toContain('English average');
    expect(document.getElementById('trendNote').textContent).toContain('English: 20m');

    legendItems()[1].click();
    items = legendItems();
    expect(items.every((el) => el.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(items.some((el) => el.classList.contains('is-dim'))).toBe(false);
  });

  it('summarises the peak bucket and the leading category', async () => {
    seed([focusSession({ category: 'Work', minutes: 60 }), focusSession({ category: 'Learning', minutes: 20 })]);
    await mountApp();
    const note = document.getElementById('trendNote').textContent;
    expect(note).toContain('Peak:');
    expect(note).toContain('Work leads this period at 75% of focus time');
  });
});

describe("insights: today's timeline (Day range)", () => {
  const legendItems = () => [...document.querySelectorAll('#trendLegend .trend-legend-item[data-category]')];

  it('swaps the trend chart for a timeline and summarises the day', async () => {
    const end = new Date(); end.setHours(14, 30, 0, 0);
    seed([
      focusSession({ category: 'Learning', minutes: 25, timestamp: end.getTime() }),
      focusSession({ category: 'Learning', minutes: 25, timestamp: end.getTime() + 3600000 }),
      focusSession({ category: 'English', minutes: 50, timestamp: end.getTime() + 7200000 })
    ]);
    const els = await mountApp();
    els.categoryRangeTabs.querySelector('[data-range="day"]').click();
    expect(document.getElementById('trendTitle').textContent).toBe("Focus by category · today's timeline");
    expect(legendItems().map((el) => el.dataset.category)).toEqual(['Learning', 'English']);
    expect(document.querySelector('#trendLegend .trend-legend-avg')).toBeNull();
    const note = document.getElementById('trendNote').textContent;
    expect(note).toContain('3 sessions today, 1h 40m in total, from 14:05 to 16:30.');
  });

  it('shows an empty note when nothing was logged today', async () => {
    const els = await mountApp();
    els.categoryRangeTabs.querySelector('[data-range="day"]').click();
    expect(document.getElementById('trendNote').textContent).toBe('No focus sessions logged today.');
  });

  it('selecting a category narrows the summary to it', async () => {
    const end = new Date(); end.setHours(9, 25, 0, 0);
    seed([
      focusSession({ category: 'Learning', minutes: 25, timestamp: end.getTime() }),
      focusSession({ category: 'English', minutes: 25, timestamp: end.getTime() + 1800000 })
    ]);
    const els = await mountApp();
    els.categoryRangeTabs.querySelector('[data-range="day"]').click();
    legendItems()[1].click(); // English
    expect(document.getElementById('trendNote').textContent).toContain('English: 1 session today, 25m, from 09:30 to 09:55.');
    expect(legendItems()[0].classList.contains('is-dim')).toBe(true);
  });
});

describe('insights: many categories in the trend chart', () => {
  const chips = () => [...document.querySelectorAll('#trendLegend .trend-legend-item[data-category]')];
  const seedEight = () => seed(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((name, i) => focusSession({ category: name, minutes: 80 - i * 5 })));

  it('shows chips for the five biggest and folds the rest behind "+N more"', async () => {
    seedEight();
    await mountApp();
    expect(chips().map((el) => el.dataset.category)).toEqual(['A', 'B', 'C', 'D', 'E']);
    const more = document.querySelector('#trendLegend .trend-legend-more');
    expect(more.textContent).toBe('+3 more');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('trendNote').textContent).toContain('The top 5 categories are in colour');
  });

  it('unfolds the grey categories and lets one be selected', async () => {
    seedEight();
    await mountApp();
    document.querySelector('#trendLegend .trend-legend-more').click();
    expect(document.querySelector('#trendLegend .trend-legend-more').textContent).toBe('Show fewer');
    const unfolded = [...document.querySelectorAll('#trendLegend .trend-legend-list .trend-legend-item')].map((el) => el.dataset.category);
    expect(unfolded).toEqual(['F', 'G', 'H']);

    document.querySelector('#trendLegend .trend-legend-list [data-category="G"]').click();
    const selected = document.querySelector('#trendLegend .trend-legend-item.is-selected');
    expect(selected.dataset.category).toBe('G');
    expect(document.querySelector('#trendLegend .trend-legend-avg').textContent).toContain('G average');
    // The selected grey category moves up into the main row of chips.
    expect(chips().slice(0, 6).map((el) => el.dataset.category)).toContain('G');
  });
});
