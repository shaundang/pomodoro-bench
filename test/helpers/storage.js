// Mirrors the storage keys app.js uses internally (js/app.js:24-29). Reading
// localStorage directly like this is how these black-box tests inspect
// internal state (timer phase, sessions, tasks, ...) that app.js never
// exposes through an API of its own.
export const KEYS = {
  sessions: 'pomodoroBench.sessions.v1',
  tasks: 'pomodoroBench.tasks.v1',
  categories: 'pomodoroBench.categories.v1',
  timer: 'pomodoroBench.timer.v1',
  presets: 'pomodoroBench.customPresets.v1',
  skillMarks: 'pomodoroBench.skillMarks.v1'
};

export function readJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export const timerState = () => readJSON(KEYS.timer, null);
export const sessions = () => readJSON(KEYS.sessions, []);
export const tasks = () => readJSON(KEYS.tasks, []);
export const categories = () => readJSON(KEYS.categories, []);
export const customPresets = () => readJSON(KEYS.presets, []);
export const skillMarks = () => readJSON(KEYS.skillMarks, {});
