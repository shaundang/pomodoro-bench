// jsdom implements no Notification API, so notifyPhaseEnd (js/app.js:755-768)
// returns on its first line in every other test file and the whole desktop-
// notification path is invisible to the suite. These tests install a stub so
// it is covered at all.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountApp, addTaskViaForm, setValue } from './helpers/mountApp.js';
import { timerState } from './helpers/storage.js';

let constructed;
let permissionState;
let requestCalls;

function installNotificationStub(permission) {
  constructed = [];
  requestCalls = 0;
  permissionState = permission;

  function FakeNotification(title, opts) {
    constructed.push({ title, opts });
    this.close = () => {};
  }
  Object.defineProperty(FakeNotification, 'permission', {
    get: () => permissionState,
    configurable: true
  });
  FakeNotification.requestPermission = () => {
    requestCalls += 1;
    return Promise.resolve(permissionState);
  };
  window.Notification = FakeNotification;
}

function activateFirstTask(els) {
  els.taskList.querySelector('[data-action="activate"]').click();
}

function actionButton(els, label) {
  return [...els.intentActions.querySelectorAll('button')].find((b) => b.textContent === label);
}

function startTimer(els) {
  els.startPauseBtn.click();
  if (!els.intentCard.hidden) actionButton(els, 'Skip').click();
}

async function readyOneMinuteSession() {
  const els = await mountApp();
  addTaskViaForm(els, 'Write report', 'Work', 2);
  activateFirstTask(els);
  setValue(els.workInput, 1);
  setValue(els.breakInput, 1);
  return els;
}

describe('desktop notifications', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); delete window.Notification; });

  it('fires when a focus phase runs to term', async () => {
    installNotificationStub('granted');
    const els = await readyOneMinuteSession();

    startTimer(els);
    vi.advanceTimersByTime(60 * 1000 + 500);

    expect(constructed).toHaveLength(1);
    expect(constructed[0].title).toContain('Focus session done');
  });

  it('fires again when the break ends', async () => {
    installNotificationStub('granted');
    const els = await readyOneMinuteSession();

    startTimer(els);
    vi.advanceTimersByTime(60 * 1000 + 500);
    actionButton(els, 'Dismiss').click();

    startTimer(els); // the break
    vi.advanceTimersByTime(60 * 1000 + 500);

    expect(constructed).toHaveLength(2);
    expect(constructed[1].title).toContain('Break');
  });

  // The regression this file was written for. Every phase reuses one tag so
  // notifications replace rather than stack, and replacement is silent unless
  // renotify is set — so without it the app went quiet after the first one
  // until the OS tray was cleared.
  it('asks to alert again on replacement, not just update in place', async () => {
    installNotificationStub('granted');
    const els = await readyOneMinuteSession();

    startTimer(els);
    vi.advanceTimersByTime(60 * 1000 + 500);

    expect(constructed[0].opts.tag).toBe('pomodoro-bench-phase');
    expect(constructed[0].opts.renotify).toBe(true);
  });

  it('stays silent when permission was never granted', async () => {
    installNotificationStub('default');
    const els = await readyOneMinuteSession();

    startTimer(els);
    vi.advanceTimersByTime(60 * 1000 + 500);

    expect(constructed).toHaveLength(0);
  });

  it('stays silent when permission was denied', async () => {
    installNotificationStub('denied');
    const els = await readyOneMinuteSession();

    startTimer(els);
    vi.advanceTimersByTime(60 * 1000 + 500);

    expect(constructed).toHaveLength(0);
  });

  // Documents intended behaviour rather than a defect: Skip is a deliberate
  // click, so the user is already looking at the screen. Worth pinning because
  // "I skipped and got no notification" reads as a bug.
  it('does not fire when the user skips a phase', async () => {
    installNotificationStub('granted');
    const els = await readyOneMinuteSession();

    startTimer(els);
    vi.advanceTimersByTime(20 * 1000);
    els.skipBtn.click();

    expect(timerState().mode).toBe('break');
    expect(constructed).toHaveLength(0);
  });

  // Permission is requested from the click that starts the timer, because
  // browsers refuse the prompt outside a user gesture. The intention gate
  // returns early on the first start of the day (js/app.js:718-721), which
  // moves the request to the click that dismisses the card — it must still
  // happen, or a fresh origin never gets asked at all.
  it('requests permission across the intention gate on the first start of the day', async () => {
    installNotificationStub('default');
    const els = await mountApp();
    addTaskViaForm(els, 'Write report', 'Work', 2);
    activateFirstTask(els);

    els.startPauseBtn.click();
    expect(els.intentCard.hidden).toBe(false);
    expect(requestCalls).toBe(0);

    actionButton(els, 'Skip').click();
    expect(timerState().running).toBe(true);
    expect(requestCalls).toBe(1);
  });
});
