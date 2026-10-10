import { describe, it, expect } from 'vitest';
import { mountApp } from './helpers/mountApp.js';
import { KEYS } from './helpers/storage.js';

function session(id, daysAgo, hour, minutes, status, type, category) {
  const end = new Date();
  end.setDate(end.getDate() - daysAgo);
  end.setHours(hour, 0, 0, 0);
  const date = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');
  return {
    id,
    date,
    category: category || 'Work',
    task: 'Preview task',
    taskId: null,
    minutes,
    timestamp: end.getTime(),
    status: status || 'completed',
    type: type || 'focus',
    intention: null,
    quality: null
  };
}

describe('recommendation preview', () => {
  it('turns session history into a compact plan, forecast, and pattern view', async () => {
    localStorage.setItem(KEYS.sessions, JSON.stringify([
      session('one', 21, 9, 45),
      session('two', 13, 9, 45),
      session('three', 6, 10, 50, 'completed', 'focus', 'Learning'),
      session('four', 1, 14, 60, 'skipped'),
      session('break', 1, 15, 10, 'completed', 'break')
    ]));

    const els = await mountApp();

    expect(document.getElementById('nextSessionCard')).toBeNull();
    const recommendation = document.getElementById('recommendationPreset');
    const recommendationToggle = document.getElementById('recommendationToggleBtn');
    expect(recommendation.textContent).toContain('Recommendation');
    expect(recommendation.textContent).toContain('Work');
    expect(recommendation.classList.contains('is-enabled')).toBe(false);
    expect(recommendationToggle.textContent).toBe('+');
    recommendationToggle.click();
    expect(document.getElementById('recommendationPreset').classList.contains('is-enabled')).toBe(true);
    expect(els.workInput.value).toBe('45');
    expect(els.breakInput.value).toBe('10');
    expect(document.getElementById('coachFocusTarget').textContent).not.toBe('—');
    expect(document.querySelectorAll('#coachSlotList .coach-slot')).toHaveLength(2);
    expect(document.getElementById('coachSlotList').textContent).toContain('Learning');
    expect(document.getElementById('coachSlotList').textContent).toContain('Best');
    expect(document.getElementById('coachSlotList').textContent).not.toContain('Thu');
    expect(document.getElementById('coachSessionTarget').textContent).toContain('session');
    expect(document.getElementById('coachCompletion').textContent).toBe('75%');
    expect(document.getElementById('coachBestBreak').textContent).toBe('10 min');

    document.getElementById('coachForecastTab').click();
    expect(document.getElementById('coachPlanPanel').hidden).toBe(true);
    expect(document.getElementById('coachForecastPanel').hidden).toBe(false);
    expect(document.querySelectorAll('#coachForecastList .coach-forecast-row')).toHaveLength(4);

    els.tabStatsBtn.click();
    document.getElementById('applyCoachPlanBtn').click();
    expect(els.viewTimer.hidden).toBe(false);
    expect(els.workInput.value).toBe('45');
  });

  it('shows a neutral state until enough sessions exist', async () => {
    localStorage.setItem(KEYS.sessions, JSON.stringify([session('one', 0, 9, 25)]));

    await mountApp();

    expect(document.getElementById('recommendationPreset').classList.contains('is-ready')).toBe(false);
    expect(document.getElementById('recommendationToggleBtn').disabled).toBe(true);
    expect(document.getElementById('coachFocusTarget').textContent).toBe('—');
  });

  it('prefers a forecast published by the weekly Python run', async () => {
    localStorage.setItem(KEYS.sessions, JSON.stringify([
      session('one', 3, 9, 25), session('two', 2, 10, 25), session('three', 1, 11, 25)
    ]));
    await mountApp();

    const events = [];
    window.addEventListener('pomodoroBench:recommendation', (event) => events.push(event.detail));
    window.PomodoroBench.applyMlForecast({
      status: 'ready',
      runId: 'run-1',
      modelVersion: 'weekly-v3',
      recommendation: { focusMinutes: 55, breakMinutes: 15, category: 'Learning', expectedFocusMinutes: 45 },
      plan: { focusMinutes: 330, sessions: 6, slots: [{ category: 'Learning', day: 2, hour: 19, focusMinutes: 55, weeklySessions: 3 }] },
      weeks: [{ label: 'Oct 12', focusMinutes: 330, sessions: 6 }],
      patterns: { bestHour: 19, bestDay: 2, bestDurationMinutes: 55, bestBreakMinutes: 15, weeklySessions: 6, completionRate: 0.82 }
    });

    expect(document.getElementById('recommendationPreset').textContent).toContain('Learning');
    expect(document.getElementById('recommendationPreset').textContent).toContain('55 / 15 min');
    expect(document.getElementById('coachFocusTarget').textContent).toBe('5h 30m');
    expect(document.getElementById('coachSessionTarget').textContent).toBe('6 sessions');
    expect(document.getElementById('coachSlotList').textContent).toContain('Learning');
    expect(document.getElementById('coachSlotList').textContent).toContain('3 sessions');
    expect(document.getElementById('coachSlotList').textContent).toContain('Best 19:00 · 55 min');
    expect(document.getElementById('coachCompletion').textContent).toBe('82%');
    expect(document.querySelectorAll('#coachForecastList .coach-forecast-row')).toHaveLength(1);
    expect(events.map((event) => event.type)).toEqual(['shown']);
    document.getElementById('recommendationToggleBtn').click();
    expect(events.map((event) => event.type)).toEqual(['shown', 'enabled', 'applied']);
    expect(events[2]).toMatchObject({ runId: 'run-1', modelVersion: 'weekly-v3', category: 'Learning' });
  });
});
