// sync.js talks to real Firebase Auth/Firestore over the network, so these
// tests replace those modules with in-memory fakes and drive sync.js
// through the same window.PomodoroBench hooks app.js exposes for it
// (js/app.js:2962-2972) plus its own DOM elements in the backup menu.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountApp } from './helpers/mountApp.js';

const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
const FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const AUTH_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

let firestoreDocs;
let authCallback;
let currentUserEmail;

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
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => 'SERVER_TS')
}));

vi.mock('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js', () => ({
  getAuth: vi.fn(() => ({ get currentUser() { return { email: currentUserEmail }; } })),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  onAuthStateChanged: vi.fn((auth, cb) => {
    authCallback = cb;
  })
}));

async function mountAppAndSync() {
  const els = await mountApp();
  const mod = await import('../js/sync.js');
  return { els, mod };
}

beforeEach(() => {
  firestoreDocs = new Map();
  authCallback = null;
  currentUserEmail = 'user@example.com';
  vi.clearAllMocks();
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
});
