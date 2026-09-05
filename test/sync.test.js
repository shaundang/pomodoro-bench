// sync.js talks to real Firebase Auth/Firestore over the network, so these
// tests replace those modules with an in-memory Firestore fake (documents
// keyed by path, collection + document listeners fired on every write, the
// way latency compensation does) and drive sync.js through the same
// window.PomodoroBench hooks app.js exposes for it plus its own DOM
// elements in the backup menu.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountApp, addTaskViaForm, setValue } from './helpers/mountApp.js';
import { tasks, timerState, KEYS } from './helpers/storage.js';

const FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const AUTH_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

// ---- in-memory Firestore ----
let store;      // Map<path, data>
let listeners;  // [{ ref, cb }]
let failGetDocs; // Error to throw from getDocs, to simulate denied rules
let authCallback;
let authCallbacks = [];
let currentUserEmail;

const pathOf = (segs) => segs.map(String).join('/');
const lastSeg = (path) => path.split('/').pop();
const isDirectChild = (colPath, docPath) =>
  docPath.startsWith(colPath + '/') && docPath.split('/').length === colPath.split('/').length + 1;

function docSnap(path) {
  return { id: lastSeg(path), exists: () => store.has(path), data: () => store.get(path) };
}
function colSnap(colPath) {
  const docs = [...store.entries()]
    .filter(([p]) => isDirectChild(colPath, p))
    .map(([p, d]) => ({ id: lastSeg(p), data: () => d }));
  return { docs, empty: docs.length === 0, size: docs.length };
}
function notify(path) {
  listeners.slice().forEach(({ ref, cb }) => {
    if (ref.kind === 'doc' && ref.path === path) cb(docSnap(path));
    if (ref.kind === 'collection' && isDirectChild(ref.path, path)) cb(colSnap(ref.path));
  });
}
async function fakeSetDoc(ref, data, opts) {
  const prev = store.get(ref.path);
  store.set(ref.path, opts && opts.merge ? { ...(prev || {}), ...data } : { ...data });
  notify(ref.path);
}

vi.mock('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js', () => ({ initializeApp: vi.fn(() => ({})) }));

vi.mock('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js', () => ({
  getFirestore: vi.fn(() => ({})),
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  persistentMultipleTabManager: vi.fn(() => ({})),
  doc: vi.fn((db, ...segs) => ({ kind: 'doc', path: pathOf(segs), id: String(segs[segs.length - 1]) })),
  collection: vi.fn((db, ...segs) => ({ kind: 'collection', path: pathOf(segs) })),
  getDoc: vi.fn(async (ref) => docSnap(ref.path)),
  getDocs: vi.fn(async (ref) => colSnap(ref.path)),
  // sync.js reads with the *FromServer variants so an offline cache can never masquerade as "no tasks yet".
  getDocFromServer: vi.fn(async (ref) => docSnap(ref.path)),
  getDocsFromServer: vi.fn(async (ref) => { if (failGetDocs) throw failGetDocs; return colSnap(ref.path); }),
  setDoc: vi.fn(fakeSetDoc),
  updateDoc: vi.fn(async (ref, fields) => {
    if (!store.has(ref.path)) throw new Error('not-found');
    const cur = store.get(ref.path);
    const next = { ...cur };
    Object.entries(fields).forEach(([k, v]) => {
      next[k] = (v && typeof v === 'object' && '__increment' in v) ? (cur[k] || 0) + v.__increment : v;
    });
    store.set(ref.path, next);
    notify(ref.path);
  }),
  deleteDoc: vi.fn(async (ref) => { store.delete(ref.path); notify(ref.path); }),
  increment: vi.fn((n) => ({ __increment: n })),
  writeBatch: vi.fn(() => {
    const ops = [];
    return {
      set(ref, data) { ops.push(() => fakeSetDoc(ref, data)); },
      async commit() { for (const op of ops) await op(); }
    };
  }),
  onSnapshot: vi.fn((ref, cb) => {
    const entry = { ref, cb };
    listeners.push(entry);
    // Firestore delivers the current state first, asynchronously.
    Promise.resolve().then(() => {
      if (!listeners.includes(entry)) return;
      cb(ref.kind === 'doc' ? docSnap(ref.path) : colSnap(ref.path));
    });
    return () => { listeners = listeners.filter((l) => l !== entry); };
  }),
  serverTimestamp: vi.fn(() => 'SERVER_TS')
}));

vi.mock('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js', () => ({
  getAuth: vi.fn(() => ({ get currentUser() { return { email: currentUserEmail }; } })),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  onAuthStateChanged: vi.fn((auth, cb) => {
    authCallback = cb;
    authCallbacks.push(cb);
  })
}));

async function mountAppAndSync() {
  const els = await mountApp();
  await import('../js/sync.js');
  return els;
}

// Lets every queued promise in the sign-in chain settle.
async function settle(rounds = 12) {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}
async function signIn(uid = 'user-1') {
  await authCallback({ uid });
  await settle();
}

const USER = 'syncs/user-1';
const TASKS = 'syncs/user-1/tasks';
const taskDoc = (id) => store.get(`${TASKS}/${id}`);
const taskDocs = () => [...store.keys()].filter((p) => isDirectChild(TASKS, p)).map(lastSeg);
const status = () => document.getElementById('syncStatus').textContent;

beforeEach(() => {
  store = new Map();
  listeners = [];
  failGetDocs = null;
  authCallback = null;
  currentUserEmail = 'user@example.com';
  vi.clearAllMocks();
});

// vi.resetModules() gives every test a fresh sync.js, but the previous
// instances live on with their listeners and signed-in state. Sign each of
// them out so only the instance under test reacts.
afterEach(() => {
  authCallbacks.forEach((cb) => cb(null));
  authCallbacks = [];
  vi.useRealTimers();
});

describe('sync.js — auth UI', () => {
  it('reports "not signed in" when auth resolves with no user', async () => {
    await mountAppAndSync();
    authCallback(null);
    expect(status()).toBe('Not signed in — data stays local to this browser.');
    expect(document.getElementById('syncSignInBtn').hidden).toBe(false);
  });

  it('clicking "Sign in with Google" calls signInWithPopup', async () => {
    await mountAppAndSync();
    const { signInWithPopup } = await import(AUTH_URL);
    document.getElementById('syncSignInBtn').click();
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
  });

  it('signing out returns the UI to "not signed in" and stops writing tasks to the store', async () => {
    const els = await mountAppAndSync();
    const { signOut } = await import(AUTH_URL);
    addTaskViaForm(els, 'A', 'Work', 1);
    await signIn();
    expect(taskDocs()).toHaveLength(1);

    document.getElementById('syncSignOutBtn').click();
    expect(signOut).toHaveBeenCalledTimes(1);
    authCallback(null);
    expect(status()).toBe('Not signed in — data stays local to this browser.');

    els.taskList.querySelector('[data-action="toggle-done"]').click();
    expect(tasks()[0].done).toBe(true);           // local cache changed…
    expect(taskDoc(tasks()[0].id).done).toBe(false); // …the store did not
  });
});

describe('sync.js — moving tasks into the store (first sign-in)', () => {
  it('seeds the empty collection from local tasks, marks the user doc, and keeps a local copy', async () => {
    const els = await mountAppAndSync();
    addTaskViaForm(els, 'Local one', 'Work', 1);
    addTaskViaForm(els, 'Local two', 'Learning', 2);
    const before = tasks();

    await signIn();

    expect(taskDocs().sort()).toEqual(before.map((t) => t.id).sort());
    expect(taskDoc(before[0].id)).toMatchObject({ name: 'Local one', category: 'Work' });
    expect(store.get(USER).tasksMigratedAt).toBe('SERVER_TS');
    expect(status()).toContain('Signed in as user@example.com · moved 2 task(s) into the cloud');
    // the cache is untouched, and a dated copy of it was kept
    expect(tasks().map((t) => t.name)).toEqual(['Local one', 'Local two']);
    const copies = Object.keys(localStorage).filter((k) => k.startsWith(KEYS.tasks + '.preMigration.'));
    expect(copies).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(copies[0]))).toHaveLength(2);
  });

  it('seeds from the union of the old task array and the local cache, done-stamp aware, and leaves the old array in place', async () => {
    // The old model: one array in the user doc, written by the phone with a tick (no stamps).
    store.set(USER, {
      sessions: [], categories: ['Work'], presets: [],
      tasks: [
        { id: 'X', name: 'Anki', category: 'English', estimate: 4, completed: 2, done: true, doneAt: 500, createdAt: 1 },
        { id: 'P', name: 'Phone only', category: 'Work', estimate: 1, completed: 0, done: false, createdAt: 1 }
      ]
    });
    // This laptop: X not done but with a newer updatedAt (it counted a pomodoro), plus a local-only task.
    localStorage.setItem(KEYS.tasks, JSON.stringify([
      { id: 'X', name: 'Anki', category: 'English', estimate: 4, completed: 3, done: false, doneAt: null, doneChangedAt: 0, createdAt: 1, updatedAt: 900, sessionPresetId: 'study', workMin: 25, breakMin: 5, notes: [] },
      { id: 'L', name: 'Laptop only', category: 'Work', estimate: 1, completed: 0, done: false, doneAt: null, doneChangedAt: 0, createdAt: 2, updatedAt: 2, sessionPresetId: 'deep', workMin: 50, breakMin: 10, notes: [] }
    ]));
    await mountAppAndSync();

    await signIn();

    expect(taskDocs().sort()).toEqual(['L', 'P', 'X']);
    expect(taskDoc('X')).toMatchObject({ done: true, doneAt: 500, completed: 3 }); // tick from the phone, count from the laptop
    expect(taskDoc('P').name).toBe('Phone only');
    expect(taskDoc('L').name).toBe('Laptop only');
    // Nothing deleted: the old array survives the merge:true push, plus the marker.
    expect(store.get(USER).tasks).toHaveLength(2);
    expect(store.get(USER).tasksMigratedAt).toBe('SERVER_TS');
    expect(store.get(USER).categories).toContain('Work');
    // and the cache now mirrors the collection
    expect(tasks().map((t) => t.id).sort()).toEqual(['L', 'P', 'X']);
    expect(tasks().find((t) => t.id === 'X').done).toBe(true);
  });

  it('once migrated, the collection is the source: stale local extras are dropped, not uploaded', async () => {
    store.set(USER, { sessions: [], categories: [], presets: [], tasksMigratedAt: 'SERVER_TS', tasks: [{ id: 'Z', name: 'Old array copy' }] });
    store.set(`${TASKS}/A`, { id: 'A', name: 'In the store', category: 'Work', estimate: 1, completed: 4, done: false, doneAt: null, doneChangedAt: 0, createdAt: 1, updatedAt: 5, sessionPresetId: 'deep', workMin: 50, breakMin: 10, notes: [] });
    localStorage.setItem(KEYS.tasks, JSON.stringify([
      { id: 'A', name: 'Stale local name', done: false, completed: 1, createdAt: 1, updatedAt: 1 },
      { id: 'Z', name: 'Deleted elsewhere long ago', done: false, createdAt: 1, updatedAt: 1 }
    ]));
    const els = await mountAppAndSync();

    await signIn();

    expect(taskDocs()).toEqual(['A']);
    expect(tasks().map((t) => t.id)).toEqual(['A']);
    expect(tasks()[0]).toMatchObject({ name: 'In the store', completed: 4 }); // the store's copy, not ours
    expect(els.taskList.querySelectorAll('.task-card')).toHaveLength(1);
    expect(els.taskList.querySelector('.task-name').textContent).toBe('In the store');
  });

  it('reads the migration state from the server, never from the offline cache', async () => {
    const { getDocsFromServer, getDocFromServer, getDocs, getDoc } = await import(FIRESTORE_URL);
    const els = await mountAppAndSync();
    addTaskViaForm(els, 'T', 'Work', 1);
    await signIn();
    expect(getDocsFromServer).toHaveBeenCalledTimes(1);
    expect(getDocFromServer).toHaveBeenCalledTimes(1);
    expect(getDocs).not.toHaveBeenCalled();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('a denied, offline or failed collection read installs nothing and touches nothing local', async () => {
    failGetDocs = new Error('Missing or insufficient permissions.');
    const els = await mountAppAndSync();
    addTaskViaForm(els, 'Stays local', 'Work', 1);

    await signIn();

    expect(status()).toContain('Could not connect: Missing or insufficient permissions.');
    expect(tasks().map((t) => t.name)).toEqual(['Stays local']);
    expect(taskDocs()).toEqual([]);
    els.taskList.querySelector('[data-action="toggle-done"]').click();
    expect(taskDocs()).toEqual([]); // no backend was installed
  });
});

describe('sync.js — signed in, one document per task', () => {
  async function signedInWith(...names) {
    const els = await mountAppAndSync();
    names.forEach((n) => addTaskViaForm(els, n, 'Work', 2));
    await signIn();
    return els;
  }

  it('a tick becomes a patch to that task document only', async () => {
    const { updateDoc, setDoc } = await import(FIRESTORE_URL);
    const els = await signedInWith('One', 'Two');
    const [one] = tasks();
    const setCallsBefore = setDoc.mock.calls.length;

    els.taskList.querySelector(`[data-action="toggle-done"][data-id="${one.id}"]`).click();

    expect(taskDoc(one.id)).toMatchObject({ done: true, doneChangedAt: expect.any(Number) });
    expect(taskDoc(one.id).doneAt).toBeGreaterThan(0);
    const patch = updateDoc.mock.calls.find((c) => c[0].path === `${TASKS}/${one.id}`);
    expect(Object.keys(patch[1]).sort()).toEqual(['done', 'doneAt', 'doneChangedAt', 'updatedAt']);
    expect(setDoc.mock.calls.length).toBe(setCallsBefore); // no whole-list, no whole-task write
  });

  it('adding creates a document, deleting removes it, undo brings it back', async () => {
    const els = await signedInWith('Keep');
    addTaskViaForm(els, 'New one', 'Learning', 1);
    const added = tasks().find((t) => t.name === 'New one');
    expect(taskDoc(added.id)).toMatchObject({ name: 'New one', category: 'Learning' });

    els.taskList.querySelector(`[data-action="delete-task"][data-id="${added.id}"]`).click();
    expect(taskDoc(added.id)).toBeUndefined();
    expect(tasks().map((t) => t.name)).toEqual(['Keep']);

    els.undoBtn.click();
    expect(taskDoc(added.id)).toMatchObject({ name: 'New one' });
  });

  it('a finished pomodoro is an atomic increment, not an overwrite', async () => {
    vi.useFakeTimers();
    const els = await signedInWith('Deep');
    const { updateDoc } = await import(FIRESTORE_URL);
    const t = tasks()[0];
    // Pretend another device already counted one that this device has not seen.
    store.set(`${TASKS}/${t.id}`, { ...taskDoc(t.id), completed: 1 });

    els.taskList.querySelector('[data-action="activate"]').click();
    setValue(els.workInput, 1);
    setValue(els.breakInput, 1);
    els.startPauseBtn.click();
    if (!els.intentCard.hidden) [...els.intentActions.querySelectorAll('button')].find((b) => b.textContent === 'Skip').click();
    vi.advanceTimersByTime(60 * 1000 + 500);

    const inc = updateDoc.mock.calls.find((c) => c[0].path === `${TASKS}/${t.id}` && c[1].completed);
    expect(inc[1].completed).toEqual({ __increment: 1 });
    expect(taskDoc(t.id).completed).toBe(2); // 1 from elsewhere + 1 here
  });

  it('a change made on another device shows up here without this device re-writing it', async () => {
    const { setDoc, updateDoc } = await import(FIRESTORE_URL);
    const els = await signedInWith('Shared');
    const t = tasks()[0];
    const writesBefore = setDoc.mock.calls.length + updateDoc.mock.calls.length;

    const now = Date.now();
    await fakeSetDoc({ path: `${TASKS}/${t.id}` }, { ...taskDoc(t.id), name: 'Renamed elsewhere', done: true, doneAt: now, doneChangedAt: now, updatedAt: now });

    expect(tasks()[0]).toMatchObject({ name: 'Renamed elsewhere', done: true, doneAt: now });
    expect(els.taskList.querySelector('.task-name').textContent).toBe('Renamed elsewhere');
    expect(els.taskList.querySelector('.task-check').classList.contains('checked')).toBe(true);
    await settle();
    expect(setDoc.mock.calls.length + updateDoc.mock.calls.length).toBe(writesBefore);
  });

  it('a task deleted on another device disappears here and is never revived', async () => {
    const { deleteDoc } = await import(FIRESTORE_URL);
    const els = await signedInWith('Doomed', 'Survivor');
    const doomed = tasks().find((t) => t.name === 'Doomed');
    els.taskList.querySelector(`[data-action="activate"][data-id="${doomed.id}"]`).click();
    expect(timerState().activeTaskId).toBe(doomed.id);

    store.delete(`${TASKS}/${doomed.id}`);
    notify(`${TASKS}/${doomed.id}`);

    expect(tasks().map((t) => t.name)).toEqual(['Survivor']);
    expect(els.taskList.querySelectorAll('.task-card')).toHaveLength(1);
    expect(timerState().activeTaskId).toBeNull();
    await settle();
    expect(taskDocs()).toHaveLength(1);
    expect(deleteDoc).not.toHaveBeenCalled(); // this device did not do the deleting
  });

  it('the user document is pushed without tasks and with merge, so the old array is never overwritten', async () => {
    vi.useFakeTimers();
    store.set(USER, { sessions: [], categories: [], presets: [], tasksMigratedAt: 'SERVER_TS', tasks: [{ id: 'frozen', name: 'Old copy' }] });
    const { setDoc } = await import(FIRESTORE_URL);
    const els = await signedInWith('T');

    const userWrites = setDoc.mock.calls.filter((c) => c[0].path === USER);
    expect(userWrites.length).toBeGreaterThan(0);
    userWrites.forEach((c) => {
      expect(c[1]).not.toHaveProperty('tasks');
      expect(c[2]).toEqual({ merge: true });
    });
    expect(store.get(USER).tasks).toEqual([{ id: 'frozen', name: 'Old copy' }]);
    expect(store.get(USER).tasksMigratedAt).toBe('SERVER_TS');

    // a session logged locally still travels through the user document
    els.taskList.querySelector('[data-action="activate"]').click();
    setValue(els.workInput, 1);
    setValue(els.breakInput, 1);
    els.startPauseBtn.click();
    if (!els.intentCard.hidden) [...els.intentActions.querySelectorAll('button')].find((b) => b.textContent === 'Skip').click();
    vi.advanceTimersByTime(60 * 1000 + 500);
    await vi.advanceTimersByTimeAsync(2000);
    expect(store.get(USER).sessions).toHaveLength(1);
  });

  it('edits made while signed out are uploaded on the next sign-in, and only those', async () => {
    const { setDoc } = await import(FIRESTORE_URL);
    const els = await signedInWith('Edited offline', 'Untouched');
    const [edited, untouched] = tasks();

    authCallback(null); // sign out; local becomes the store again
    els.taskList.querySelector(`[data-action="toggle-done"][data-id="${edited.id}"]`).click();
    expect(taskDoc(edited.id).done).toBe(false);
    // meanwhile another device changed the untouched one in the store
    store.set(`${TASKS}/${untouched.id}`, { ...taskDoc(untouched.id), name: 'Renamed elsewhere' });

    const before = setDoc.mock.calls.length;
    await signIn();

    expect(taskDoc(edited.id).done).toBe(true);
    expect(taskDoc(untouched.id).name).toBe('Renamed elsewhere'); // not clobbered by our stale copy
    const uploaded = setDoc.mock.calls.slice(before).filter((c) => c[0].path.startsWith(TASKS + '/'));
    expect(uploaded.map((c) => c[0].id)).toEqual([edited.id]);
    expect(tasks().find((t) => t.id === untouched.id).name).toBe('Renamed elsewhere');
    expect(localStorage.getItem(KEYS.tasks + '.pending')).toBeNull();
  });
});
