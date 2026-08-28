// Mirrors app.js's todayKey() (js/app.js:1289-1295) so seed data lines up
// with what the app itself considers "today"/"yesterday" regardless of
// which timezone or date the test happens to run on.
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayKey = () => dateKey(new Date());
export const daysAgoKey = (n) => dateKey(new Date(Date.now() - n * 86400000));
