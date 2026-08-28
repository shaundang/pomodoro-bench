// Loads index.html's markup into jsdom's document and then executes
// js/app.js against it, mirroring how the real page boots. app.js is a
// plain IIFE with no exports (except window.PomodoroBench), so this
// black-box mount is how its behavior gets exercised: through the same
// DOM elements and events a real user/browser would drive.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
const bodyMatch = indexHtml.match(/<body>([\s\S]*)<\/body>/);
if (!bodyMatch) throw new Error('Could not find <body> in index.html');
// Strip the <script> tags — app.js is imported explicitly below instead of
// being re-parsed as a <script> (jsdom does not execute injected scripts).
const bodyHtml = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/g, '');

// Mounts a fresh copy of the app: fresh DOM, fresh module instance (so its
// closures re-query the new elements), fresh localStorage.
export async function mountApp() {
  document.title = '';
  document.body.innerHTML = bodyHtml;
  delete window.PomodoroBench;
  vi.resetModules();
  await import('../../js/app.js');
  return getEls();
}

// Convenience accessor mirroring the internal `els` map in app.js, so tests
// can read/drive the same elements by their ids without hardcoding lookups
// everywhere.
export function getEls() {
  const byId = (id) => document.getElementById(id);
  return {
    presetGrid: byId('presetGrid'),
    presetNote: byId('presetNote'),
    presetAddBtn: byId('presetAddBtn'),
    presetAddForm: byId('presetAddForm'),
    presetNewName: byId('presetNewName'),
    presetNewWork: byId('presetNewWork'),
    presetNewBreak: byId('presetNewBreak'),
    presetSaveBtn: byId('presetSaveBtn'),
    presetCancelBtn: byId('presetCancelBtn'),
    taskForm: byId('taskForm'),
    newTaskName: byId('newTaskName'),
    newTaskCategory: byId('newTaskCategory'),
    newTaskCategoryCreate: byId('newTaskCategoryCreate'),
    newTaskEstimate: byId('newTaskEstimate'),
    noCategoryHint: byId('noCategoryHint'),
    taskList: byId('taskList'),
    workInput: byId('workInput'),
    breakInput: byId('breakInput'),
    modeLabel: byId('modeLabel'),
    timeReadout: byId('timeReadout'),
    categoryLabel: byId('categoryLabel'),
    cycleDots: byId('cycleDots'),
    startPauseBtn: byId('startPauseBtn'),
    resetBtn: byId('resetBtn'),
    skipBtn: byId('skipBtn'),
    noTaskHint: byId('noTaskHint'),
    intentCard: byId('intentCard'),
    intentTitle: byId('intentTitle'),
    intentInput: byId('intentInput'),
    intentActions: byId('intentActions'),
    scaleBreakInput: byId('scaleBreakInput'),
    scaleBreakNote: byId('scaleBreakNote'),
    budgetTargetInput: byId('budgetTargetInput'),
    budgetFill: byId('budgetFill'),
    budgetLabel: byId('budgetLabel'),
    banner: byId('banner'),
    bannerText: byId('bannerText'),
    bannerAction: byId('bannerAction'),
    todayMinutes: byId('todayMinutes'),
    todayPomodoros: byId('todayPomodoros'),
    streakDays: byId('streakDays'),
    bestStreak: byId('bestStreak'),
    allTimeTotal: byId('allTimeTotal'),
    allTimePomodoros: byId('allTimePomodoros'),
    logTitle: byId('logTitle'),
    logList: byId('logList'),
    logPrevBtn: byId('logPrevBtn'),
    logNextBtn: byId('logNextBtn'),
    logTodayBtn: byId('logTodayBtn'),
    logExpandBtn: byId('logExpandBtn'),
    undoToast: byId('undoToast'),
    undoText: byId('undoText'),
    undoBtn: byId('undoBtn'),
    skillsList: byId('skillsList'),
    categoryAllList: byId('categoryAllList'),
    categoryRangeTabs: byId('categoryRangeTabs'),
    resetStatsBtn: byId('resetStatsBtn'),
    tabTimerBtn: byId('tabTimerBtn'),
    tabStatsBtn: byId('tabStatsBtn'),
    viewTimer: byId('viewTimer'),
    viewStats: byId('viewStats'),
    heatmapYear: byId('heatmapYear'),
    heatmapPrevYearBtn: byId('heatmapPrevYearBtn'),
    heatmapNextYearBtn: byId('heatmapNextYearBtn'),
    heatmapYearTotal: byId('heatmapYearTotal')
  };
}

// ---- small DOM interaction helpers used across the suite ----

export function setValue(input, value) {
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
}

export function submitForm(form) {
  const evt = new window.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(evt);
}

export function addTaskViaForm(els, name, category, estimate) {
  setValue(els.newTaskName, name);
  if (category) setValue(els.newTaskCategory, category);
  if (estimate != null) setValue(els.newTaskEstimate, estimate);
  submitForm(els.taskForm);
}
