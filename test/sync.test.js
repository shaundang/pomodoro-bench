// sync.js talks to real Firebase Auth/Firestore over the network, so these
// tests replace those modules with in-memory fakes and drive sync.js
// through the same window.PomodoroBench hooks app.js exposes for it
// (js/app.js:2962-2972) plus its own DOM elements in the backup menu.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountApp } from './helpers/mountApp.js';

const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
const FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const AUTH_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

let firestoreDocs;
let authCallback;
let authCallbacks = []; // every instance ever imported, so afterEach can sign them all out
let currentUserEmail;
let snapshotCallbacks;

// vi.mock's first argument must be a literal (the call is hoisted above
// these module-level consts), so the URLs are spelled out again here even
// though FIREBASE_APP_URL/FIRESTORE_URL/AUTH_URL exist for the dynamic
// import() calls further down.
vi.mock('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js', () => ({ initializeApp: vi.fn(() => ({})) }));

vi.mock('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((db, collection, id) => ({ id })),
  getDoc: vi.fn(async (ref) => ({
    exists: () => firestoreDocs.has(ref.id),
    data: () => firestoreDocs.get(ref.id)
  })),
  setDoc: vi.fn(async (ref, data) => {
    firestoreDocs.set(ref.id, data);
  }),
  onSnapshot: vi.fn((ref, cb) => {
    snapshotCallbacks.set(ref.id, cb);
    return () => {};
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
  const mod = await import('../js/sync.js');
  return { els, mod };
}

beforeEach(() => {
  firestoreDocs = new Map();
  snapshotCallbacks = new Map();
  authCallback = null;
  currentUserEmail = 'user@example.com';
  vi.clearAllMocks();
});

// vi.resetModules() gives every test a fresh sync.js, but the previous
// instances live on with their window/document listeners and signed-in
// state. Sign each of them out so only the instance under test reacts.
afterEach(() => {
  authCallbacks.forEach((cb) => cb(null));
  authCallbacks = [];
  vi.useRealTimers();
});

describe('sync.js', () => {
  it('reports "not signed in" when auth resolves with no user', async () => {
    await mountAppAndSync();
    authCallback(null);

    expect(document.getElementById('syncStatus').textContent).toBe('Not signed in — data stays local to this browser.');
    expect(document.getElementById('syncSignInBtn').hidden).toBe(false);
    expect(document.getElementById('syncSignOutBtn').hidden).toBe(true);
  });

  it('clicking "Sign in with Google" calls signInWithPopup', async () => {
    await mountAppAndSync();
    const { signInWithPopup } = await import(AUTH_URL);
    document.getElementById('syncSignInBtn').click();
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
  });

  it('signing in with no existing remote doc pushes the local snapshot', async () => {
    const { els } = await mountAppAndSync();
    const { addTaskViaForm } = await import('./helpers/mountApp.js');
    addTaskViaForm(els, 'Write report', 'Work', 1);

    await authCallback({ uid: 'user-1' });
    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById('syncSignOutBtn').hidden).toBe(false);
    const pushed = firestoreDocs.get('user-1');
    expect(pushed).toBeDefined();
    expect(pushed.tasks).toHaveLength(1);
    expect(document.getElementById('syncStatus').textContent).toContain('Signed in as user@example.com');
  });

  it('signing in with an existing remote doc merges it into local storage', async () => {
    firestoreDocs.set('user-1', {
      sessions: [],
      tasks: [{ id: 'remote-t1', name: 'Remote task' }],
      categories: [],
      presets: []
    });
    await mountAppAndSync();

    await authCallback({ uid: 'user-1' });
    await Promise.resolve();
    await Promise.resolve();

    const tasks = JSON.parse(localStorage.getItem('pomodoroBench.tasks.v1'));
    expect(tasks.some((t) => t.id === 'remote-t1')).toBe(true);
  });

  it('signing out calls signOut and returns the UI to "not signed in"', async () => {
    await mountAppAndSync();
    const { signOut } = await import(AUTH_URL);
    await authCallback({ uid: 'user-1' });
    await Promise.resolve();

    document.getElementById('syncSignOutBtn').click();
    expect(signOut).toHaveBeenCalledTimes(1);

    authCallback(null);
    expect(document.getElementById('syncStatus').textContent).toBe('Not signed in — data stays local to this browser.');
  });

  // Signs in against an empty remote and lets the initial push settle, so
  // the tests below start from "local == remote".
  async function signIn(els) {
    await authCallback({ uid: 'user-1' });
    await Promise.resolve();
    await Promise.resolve();
    return firestoreDocs.get('user-1');
  }

  it('a local save pushes after the short debounce, without waiting for the poll', async () => {
    vi.useFakeTimers();
    const { els } = await mountAppAndSync();
    const { addTaskViaForm } = await import('./helpers/mountApp.js');
    await signIn(els);
    expect(firestoreDocs.get('user-1').tasks).toHaveLength(0);

    addTaskViaForm(els, 'Ticked on the phone', 'Work', 1);
    await vi.advanceTimersByTimeAsync(2000); // well under the 15s poll
    expect(firestoreDocs.get('user-1').tasks.map((t) => t.name)).toEqual(['Ticked on the phone']);
  });

  it('hiding the tab flushes a pending push immediately', async () => {
    vi.useFakeTimers();
    const { els } = await mountAppAndSync();
    const { addTaskViaForm } = await import('./helpers/mountApp.js');
    await signIn(els);

    addTaskViaForm(els, 'Lock the phone now', 'Work', 1);
    expect(firestoreDocs.get('user-1').tasks).toHaveLength(0); // still debouncing

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new window.Event('visibilitychange'));
    expect(firestoreDocs.get('user-1').tasks.map((t) => t.name)).toEqual(['Lock the phone now']);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('after a pull where the local copy wins, the merged local is pushed back rather than left stranded', async () => {
    vi.useFakeTimers();
    const { els } = await mountAppAndSync();
    const { addTaskViaForm } = await import('./helpers/mountApp.js');
    addTaskViaForm(els, 'Ticked here', 'Work', 1);
    els.taskList.querySelector('[data-action="toggle-done"]').click();
    const id = JSON.parse(localStorage.getItem('pomodoroBench.tasks.v1'))[0].id;
    await signIn(els);
    expect(firestoreDocs.get('user-1').tasks[0].done).toBe(true);

    // Another device overwrote the doc with a stale not-done copy plus a task of its own.
    const stale = {
      sessions: [],
      tasks: [
        { id, name: 'Ticked here', category: 'Work', estimate: 1, completed: 0, done: false, doneAt: null, doneChangedAt: 0, createdAt: 1, updatedAt: 1 },
        { id: 'from-other', name: 'Their task', category: 'Work', estimate: 1, completed: 0, done: false, createdAt: 1, updatedAt: 1 }
      ],
      categories: [], presets: []
    };
    firestoreDocs.set('user-1', stale);
    snapshotCallbacks.get('user-1')({ exists: () => true, data: () => stale });

    const local = JSON.parse(localStorage.getItem('pomodoroBench.tasks.v1'));
    expect(local.find((t) => t.id === id).done).toBe(true); // local tick survived the merge
    expect(local.some((t) => t.id === 'from-other')).toBe(true);

    await vi.advanceTimersByTimeAsync(2000);
    const pushed = firestoreDocs.get('user-1');
    expect(pushed.tasks.find((t) => t.id === id).done).toBe(true); // ...and went back out
    expect(pushed.tasks.some((t) => t.id === 'from-other')).toBe(true);
  });

  it('a pull that leaves local identical to the remote does not push again', async () => {
    vi.useFakeTimers();
    const { els } = await mountAppAndSync();
    const { setDoc } = await import(FIRESTORE_URL);
    const { addTaskViaForm } = await import('./helpers/mountApp.js');
    addTaskViaForm(els, 'Same everywhere', 'Work', 1);
    await signIn(els);
    const pushes = setDoc.mock.calls.length;

    const remote = firestoreDocs.get('user-1');
    snapshotCallbacks.get('user-1')({ exists: () => true, data: () => remote });
    await vi.advanceTimersByTimeAsync(20000);
    expect(setDoc.mock.calls.length).toBe(pushes);
  });
});
