import { describe, it, expect } from 'vitest';
import { mountApp } from './helpers/mountApp.js';
import { KEYS, sessions } from './helpers/storage.js';
import { todayKey, daysAgoKey } from './helpers/dates.js';

function seedSessions(list) {
  localStorage.setItem(KEYS.sessions, JSON.stringify(list));
}

function session(overrides) {
  return {
    id: overrides.id || Math.random().toString(36).slice(2),
    date: todayKey(),
    category: 'Work',
    task: 'Write report',
    taskId: null,
    minutes: 30,
    timestamp: Date.now(),
    status: 'completed',
    type: 'focus',
    intention: null,
    quality: null,
    ...overrides
  };
}

describe('statistics tiles', () => {
  it('sums today and all-time focus minutes, excluding break entries', async () => {
    seedSessions([
      session({ minutes: 30, timestamp: Date.now() - 1000 }),
      session({ minutes: 45, timestamp: Date.now() }),
      session({ minutes: 10, type: 'break', timestamp: Date.now() }),
      session({ date: daysAgoKey(1), minutes: 60, timestamp: Date.now() - 86400000 })
    ]);
    const els = await mountApp();

    expect(els.todayMinutes.textContent).toBe('1h 15m');
    expect(els.todayPomodoros.textContent).toBe('2 pomodoros');
    expect(els.allTimeTotal.textContent).toBe('2h 15m');
    expect(els.allTimePomodoros.textContent).toBe('3 pomodoros');
  });

  it('counts days practised in the last 28 days and reports the gap since the last session', async () => {
    seedSessions([session({ date: todayKey() }), session({ date: daysAgoKey(1) })]);
    const els = await mountApp();

    expect(els.streakDays.textContent).toBe('2/28');
    expect(els.bestStreak.textContent).toBe('Active today');
  });

  it('reports "no sessions" when there is no history', async () => {
    const els = await mountApp();
    expect(els.streakDays.textContent).toBe('0/28');
    expect(els.bestStreak.textContent).toBe('No focus sessions yet');
  });

  it('fills the daily budget bar against the 240-minute default target', async () => {
    seedSessions([session({ minutes: 75 })]);
    const els = await mountApp();

    expect(els.budgetLabel.textContent).toBe('1h 15m / 4h focused today');
    expect(els.budgetFill.style.width).toBe('31%');
    expect(els.budgetFill.classList.contains('budget-fill-full')).toBe(false);
  });

  it('marks the budget bar full once the target is reached', async () => {
    seedSessions([session({ minutes: 240 })]);
    const els = await mountApp();
    expect(els.budgetFill.classList.contains('budget-fill-full')).toBe(true);
  });

  it('a changed budget target is persisted and re-rendered', async () => {
    seedSessions([session({ minutes: 60 })]);
    const els = await mountApp();
    const input = els.budgetTargetInput;
    input.value = '120';
    input.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(els.budgetFill.style.width).toBe('50%');
  });
});

describe("today's log", () => {
  it('lists today\'s sessions newest first', async () => {
    seedSessions([
      session({ id: 'a', task: 'First', timestamp: Date.now() - 60000 }),
      session({ id: 'b', task: 'Second', timestamp: Date.now() })
    ]);
    const els = await mountApp();
    const rows = els.logList.querySelectorAll('.log-row .log-note');
    expect(rows[0].textContent).toBe('Second');
    expect(rows[1].textContent).toBe('First');
  });

  it('deleting a log entry supports Undo', async () => {
    seedSessions([session({ id: 'a', task: 'First' })]);
    const els = await mountApp();

    els.logList.querySelector('[data-action="delete"]').click();
    expect(sessions()).toHaveLength(0);
    expect(els.undoToast.hidden).toBe(false);

    els.undoBtn.click();
    expect(sessions()).toHaveLength(1);
  });

  it('editing a log entry updates its note and minutes', async () => {
    seedSessions([session({ id: 'a', task: 'First', minutes: 30 })]);
    const els = await mountApp();

    els.logList.querySelector('[data-action="edit"]').click();
    const row = els.logList.querySelector('.log-row-edit');
    row.querySelector('.edit-note').value = 'Updated task';
    row.querySelector('.edit-minutes').value = '45';
    row.querySelector('[data-action="save"]').click();

    const s = sessions()[0];
    expect(s.task).toBe('Updated task');
    expect(s.minutes).toBe(45);
  });

  it('Previous/Today navigation moves the viewed date', async () => {
    seedSessions([session({ date: daysAgoKey(1), task: 'Yesterday task' })]);
    const els = await mountApp();

    expect(els.logList.textContent).toContain('No sessions yet today.');
    els.logPrevBtn.click();
    expect(els.logList.textContent).toContain('Yesterday task');
    els.logTodayBtn.click();
    expect(els.logList.textContent).toContain('No sessions yet today.');
  });
});

describe('reset statistics', () => {
  it('requires the explicit confirmation action to clear focus and break sessions', async () => {
    seedSessions([session({}), session({ type: 'break' })]);
    const els = await mountApp();
    const panel = document.getElementById('resetStatsConfirm');
    const confirm = document.getElementById('resetStatsConfirmBtn');
    confirm.click();
    expect(sessions()).toHaveLength(2);
    els.resetStatsBtn.click();
    expect(panel.hidden).toBe(false);
    expect(document.activeElement.id).toBe('resetStatsCancelBtn');
    els.resetStatsBtn.click();
    expect(sessions()).toHaveLength(2);
    confirm.click();
    expect(sessions()).toHaveLength(0);
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(els.resetStatsBtn);
  });

  it('cancel and Escape preserve history and restore focus', async () => {
    seedSessions([session({})]);
    const els = await mountApp();
    const panel = document.getElementById('resetStatsConfirm');
    els.resetStatsBtn.click();
    document.getElementById('resetStatsCancelBtn').click();
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(els.resetStatsBtn);
    els.resetStatsBtn.click();
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.hidden).toBe(true);
    expect(sessions()).toHaveLength(1);
    expect(document.activeElement).toBe(els.resetStatsBtn);
  });

  it('leaving Statistics dismisses a pending confirmation', async () => {
    seedSessions([session({})]);
    const els = await mountApp();
    els.tabStatsBtn.click();
    els.resetStatsBtn.click();
    els.tabTimerBtn.click();
    els.tabStatsBtn.click();
    expect(document.getElementById('resetStatsConfirm').hidden).toBe(true);
    expect(sessions()).toHaveLength(1);
  });
});

describe('session list disclosure', () => {
  it('shows five recent entries, expands all entries, then collapses without deleting data', async () => {
    seedSessions(Array.from({ length: 12 }, (_, index) => session({ id: 'log-' + index, timestamp: Date.now() - index * 1000 })));
    const els = await mountApp();
    expect(els.logList.querySelectorAll('.log-row')).toHaveLength(5);
    expect(els.logExpandBtn.textContent).toBe('Show all (12)');
    els.logExpandBtn.click();
    expect(els.logList.querySelectorAll('.log-row')).toHaveLength(12);
    expect(els.logExpandBtn.getAttribute('aria-expanded')).toBe('true');
    expect(els.logExpandBtn.textContent).toBe('Show less');
    els.logExpandBtn.click();
    expect(els.logList.querySelectorAll('.log-row')).toHaveLength(5);
    expect(sessions()).toHaveLength(12);
    els.logPrevBtn.click();
    expect(els.logExpandBtn.hidden).toBe(true);
  });
});
