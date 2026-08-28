import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountApp, addTaskViaForm, setValue } from './helpers/mountApp.js';
import { timerState, sessions } from './helpers/storage.js';

function activateFirstTask(els) {
  els.taskList.querySelector('[data-action="activate"]').click();
}

function actionButton(els, label) {
  return [...els.intentActions.querySelectorAll('button')].find((b) => b.textContent === label);
}

// Starts the timer; the very first start of the day goes through the
// intention prompt (js/app.js:712-721), every start after that does not.
function startTimer(els) {
  els.startPauseBtn.click();
  if (!els.intentCard.hidden) {
    actionButton(els, 'Skip').click();
  }
}

describe('timer boot state', () => {
  it('defaults to the Deep work preset with Start disabled until a task is chosen', async () => {
    const els = await mountApp();
    expect(els.workInput.value).toBe('50');
    expect(els.breakInput.value).toBe('10');
    expect(els.timeReadout.textContent).toBe('50:00');
    expect(els.modeLabel.textContent).toBe('Focus');
    expect(els.startPauseBtn.disabled).toBe(true);
    expect(els.noTaskHint.hidden).toBe(false);
  });

  it('enables Start once a task is activated', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 2);
    activateFirstTask(els);
    expect(els.startPauseBtn.disabled).toBe(false);
    expect(els.categoryLabel.textContent).toBe('Write report — Work');
  });
});

describe('running a focus session', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('gates the first start of the day behind the intention prompt', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 2);
    activateFirstTask(els);

    els.startPauseBtn.click();
    expect(els.intentCard.hidden).toBe(false);
    expect(timerState().running).toBeFalsy();

    actionButton(els, 'Skip').click();
    expect(els.intentCard.hidden).toBe(true);
    expect(timerState().running).toBe(true);
  });

  it('completing a full session logs it, starts a break, and asks for a rating', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 2);
    activateFirstTask(els);
    setValue(els.workInput, 1); // keep the test fast: 1 real minute instead of 50
    setValue(els.breakInput, 1);

    startTimer(els);
    vi.advanceTimersByTime(60 * 1000 + 500);

    const logged = sessions();
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ minutes: 1, status: 'completed', type: 'focus', category: 'Work', task: 'Write report' });
    expect(timerState().mode).toBe('break');
    expect(timerState().completedInCycle).toBe(1);
    expect(els.timeReadout.textContent).toBe('01:00'); // break length, unscaled

    // completePhase() opens the session-review card
    expect(els.intentCard.hidden).toBe(false);
    actionButton(els, 'Deep').click();
    expect(sessions()[0].quality).toBe('deep');
  });

  it('every 4th break is a long break', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Deep work block', 'Work', 10);
    activateFirstTask(els);
    setValue(els.workInput, 1);
    setValue(els.breakInput, 1);

    for (let cycle = 1; cycle <= 4; cycle++) {
      startTimer(els);
      vi.advanceTimersByTime(60 * 1000 + 500);
      actionButton(els, 'Dismiss').click(); // close the per-session rating card
      if (cycle < 4) {
        expect(timerState().mode).toBe('break');
        els.skipBtn.click(); // fast-forward through the short break
      }
    }

    expect(timerState().completedInCycle).toBe(4);
    expect(timerState().mode).toBe('longbreak');
    expect(els.modeLabel.textContent).toBe('Long break');
  });

  it('skipping a session early logs only the elapsed minutes', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 2);
    activateFirstTask(els);
    setValue(els.workInput, 10);
    setValue(els.breakInput, 2);

    startTimer(els);
    vi.advanceTimersByTime(4 * 60 * 1000); // 4 of 10 minutes in

    els.skipBtn.click();
    const logged = sessions();
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ minutes: 4, status: 'skipped', type: 'focus' });
    expect(timerState().mode).toBe('break');
  });

  it('scales the break to time actually focused when enabled', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 2);
    activateFirstTask(els);
    setValue(els.workInput, 50);
    setValue(els.breakInput, 10); // ratio 1:5
    els.scaleBreakInput.checked = true;
    els.scaleBreakInput.dispatchEvent(new window.Event('change', { bubbles: true }));

    startTimer(els);
    vi.advanceTimersByTime(20 * 60 * 1000); // cut short at 20 of 50 minutes

    els.skipBtn.click();
    // round(20 * 10/50) = 4 minutes
    expect(timerState().lastFocusMin).toBe(20);
    expect(els.timeReadout.textContent).toBe('04:00');
  });

  it('pausing keeps the remaining time and Resume continues it', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 2);
    activateFirstTask(els);
    setValue(els.workInput, 10);

    startTimer(els);
    vi.advanceTimersByTime(3 * 60 * 1000);
    els.startPauseBtn.click(); // pause

    expect(timerState().running).toBe(false);
    expect(els.startPauseBtn.textContent).toBe('Resume');
    expect(els.timeReadout.textContent).toBe('07:00');

    els.startPauseBtn.click(); // resume
    expect(timerState().running).toBe(true);
    expect(els.startPauseBtn.textContent).toBe('Pause');
  });

  it('Reset returns the phase to its full length without logging anything', async () => {
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 2);
    activateFirstTask(els);
    setValue(els.workInput, 10);

    startTimer(els);
    vi.advanceTimersByTime(3 * 60 * 1000);
    els.resetBtn.click();

    expect(timerState().running).toBe(false);
    expect(els.timeReadout.textContent).toBe('10:00');
    expect(sessions()).toHaveLength(0);
  });
});
