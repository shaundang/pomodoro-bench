// Optional multi-device sync via Firebase Auth (Google sign-in) + Firestore.
// Loaded as a module (deferred), so it always runs after js/app.js has set
// up window.PomodoroBench.
//
// Model: one Firestore document per signed-in user at /syncs/{uid}, holding
// the same {sessions, tasks, categories, presets} shape as the export/import
// backup. Security rules restrict each doc to only the matching
// request.auth.uid (see firestore.rules) — no shared secret involved.
//
// Merge direction is additive-by-id both ways (same rule as file import):
// pulling a remote snapshot never deletes local items, and push always
// sends the full local snapshot. This means a delete on one device can be
// "revived" by an older snapshot from another device that hasn't synced
// that delete yet — acceptable for this app's scale, called out in the UI.
//
// Tasks are the one exception: an id that exists on both sides is not just
// skipped anymore. Each task carries an `updatedAt` stamp, and whichever
// copy is newer overwrites the other's fields (name, category, completed,
// notes, ...); `done` is settled by its own `doneChangedAt` stamp so a tick
// cannot lose to an unrelated edit — see applyIncomingBackup in js/app.js.
// Otherwise marking a task done on one device would never show up on
// another that already had that task synced.
//
// When a push happens: right after any local save (app.js fires
// 'pomodoroBench:changed'), debounced briefly; immediately when the tab is
// hidden or unloading, so a change made seconds before locking a phone
// still leaves the device; and from a slow poll as a safety net. After a
// pull, local is compared against what the *remote* holds, and pushed if
// it differs — because a merge where local wins (or local has more) leaves
// the remote behind, and a device that assumed "pulled == pushed" used to
// sit on such a change until something else happened to change locally.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

var firebaseConfig = {
  projectId: "pomodoro-bench",
  appId: "1:923849496666:web:d09fc9caa40ba0ed562063",
  storageBucket: "pomodoro-bench.firebasestorage.app",
  apiKey: "AIzaSyDfEoFF6PM41Y369rquhMRtgF4KY1yD-As",
  authDomain: "pomodoro-bench.firebaseapp.com",
  messagingSenderId: "923849496666",
  measurementId: "G-4F7SYJ0JSM"
};

var POLL_MS = 15000; // safety-net poll; real pushes are event-driven (see below)
var PUSH_DEBOUNCE_MS = 1500;

var app = initializeApp(firebaseConfig);
var db = getFirestore(app);
var auth = getAuth(app);
var googleProvider = new GoogleAuthProvider();

var els = {
  signInBtn: document.getElementById('syncSignInBtn'),
  signOutBtn: document.getElementById('syncSignOutBtn'),
  status: document.getElementById('syncStatus')
};

var unsubscribeSnapshot = null;
var pollHandle = null;
var pushTimeout = null;
var lastPushedFingerprint = null;
var applyingRemote = false; // guards against re-pushing what we just pulled
var currentUid = null;

function setStatus(text){
  els.status.textContent = text;
}

function fingerprint(data){
  // Cheap change-detector: no crypto needed, just enough to skip redundant
  // writes when nothing changed since the last push. Also run over raw
  // remote docs, which may lack arrays or stamps — hence the guards.
  var sessions = (data && Array.isArray(data.sessions)) ? data.sessions : [];
  var tasks = (data && Array.isArray(data.tasks)) ? data.tasks : [];
  var categories = (data && Array.isArray(data.categories)) ? data.categories : [];
  var presets = (data && Array.isArray(data.presets)) ? data.presets : [];
  return JSON.stringify([sessions.length, tasks.length, categories.length, presets.length,
    sessions.map(function(s){return s.id;}).join(','),
    // updatedAt covers every editable field (name, category, estimate,
    // notes, session length...) in one stamp — without it, a rename or a
    // note edit changes nothing here and never gets pushed. `done` has its
    // own stamp and is listed too: a merge can flip it without touching
    // updatedAt, and that flip must reach the other side.
    tasks.map(function(t){
      return t.id + ':' + (t.updatedAt || 0) + ':' + (t.done ? 1 : 0) + ':' + (t.doneChangedAt || 0);
    }).join(','),
    presets.map(function(p){return p.id;}).join(',')]);
}

function pushLocalSnapshot(){
  if(!currentUid || !window.PomodoroBench) return;
  var data = window.PomodoroBench.buildBackupData();
  var fp = fingerprint(data);
  if(fp === lastPushedFingerprint) return;
  lastPushedFingerprint = fp;
  setDoc(doc(db, 'syncs', currentUid), {
    sessions: data.sessions,
    tasks: data.tasks,
    categories: data.categories,
    presets: data.presets,
    updatedAt: serverTimestamp()
  }).then(function(){
    setStatus('Signed in as ' + auth.currentUser.email + ' — synced ' + new Date().toLocaleTimeString());
  }).catch(function(err){
    setStatus('Sync error: ' + (err && err.message ? err.message : err));
  });
}

function schedulePush(){
  if(pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(pushLocalSnapshot, PUSH_DEBOUNCE_MS);
}

// Skip the debounce: the page is about to be hidden or torn down, and a
// timer set now may never fire on a backgrounded mobile tab.
function flushPush(){
  if(pushTimeout){ clearTimeout(pushTimeout); pushTimeout = null; }
  pushLocalSnapshot();
}

// app.js fires this from every save of tasks/sessions/categories/presets.
// Saves made *by* a pull are skipped here — the snapshot handler decides
// on its own whether the merged result needs pushing back.
function onLocalChange(){
  if(!currentUid || applyingRemote) return;
  schedulePush();
}
function onVisibilityChange(){
  if(document.visibilityState === 'hidden' && currentUid) flushPush();
}
function onPageHide(){
  if(currentUid) flushPush();
}

// Attached only while signed in, and detached on sign-out, so a signed-out
// page carries no sync listeners at all.
function attachPushTriggers(){
  window.addEventListener('pomodoroBench:changed', onLocalChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
}
function detachPushTriggers(){
  window.removeEventListener('pomodoroBench:changed', onLocalChange);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', onPageHide);
}

function startPolling(){
  stopPolling();
  pollHandle = setInterval(function(){
    if(applyingRemote) return;
    schedulePush();
  }, POLL_MS);
}

function stopPolling(){
  if(pollHandle){ clearInterval(pollHandle); pollHandle = null; }
}

function startSyncingFor(uid){
  stopSyncing();
  currentUid = uid;
  setStatus('Connecting…');

  var ref = doc(db, 'syncs', uid);
  getDoc(ref).then(function(snap){
    if(snap.exists()){
      applyingRemote = true;
      try{ window.PomodoroBench.applyIncomingBackup(snap.data()); }
      catch(e){ /* remote doc had nothing new/valid — fine */ }
      applyingRemote = false;
    }
    // Push local (now possibly merged with remote) so both sides converge.
    pushLocalSnapshot();

    unsubscribeSnapshot = onSnapshot(ref, function(docSnap){
      if(!docSnap.exists()) return;
      var remote = docSnap.data();
      applyingRemote = true;
      try{ window.PomodoroBench.applyIncomingBackup(remote); }
      catch(e){ /* nothing new to merge */ }
      applyingRemote = false;
      // The baseline is what the remote actually holds — not our merged
      // local. If local now differs (local won a conflict, or has items the
      // remote lacks), that difference has to be pushed, or it stays
      // stranded here until some unrelated local change happens to
      // trigger a push. Converges: once local matches the remote, the
      // fingerprints agree and the scheduled push is a no-op.
      lastPushedFingerprint = fingerprint(remote);
      schedulePush();
      setStatus('Signed in as ' + auth.currentUser.email + ' — last update ' + new Date().toLocaleTimeString());
    });

    startPolling();
    attachPushTriggers();
    setStatus('Signed in as ' + auth.currentUser.email + '.');
  }).catch(function(err){
    setStatus('Could not connect: ' + (err && err.message ? err.message : err));
  });
}

function stopSyncing(){
  if(unsubscribeSnapshot){ unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  stopPolling();
  detachPushTriggers();
  if(pushTimeout){ clearTimeout(pushTimeout); pushTimeout = null; }
  currentUid = null;
  lastPushedFingerprint = null;
}

function setSignedInUI(signedIn){
  els.signInBtn.hidden = signedIn;
  els.signOutBtn.hidden = !signedIn;
}

els.signInBtn.addEventListener('click', function(){
  setStatus('Opening Google sign-in…');
  signInWithPopup(auth, googleProvider).catch(function(err){
    setStatus('Sign-in failed: ' + (err && err.message ? err.message : err));
  });
});

els.signOutBtn.addEventListener('click', function(){
  signOut(auth).catch(function(err){
    setStatus('Sign-out failed: ' + (err && err.message ? err.message : err));
  });
});

// Firebase Auth persists the session in this browser by default, so a
// returning visit re-fires this with the same user — no manual re-login.
onAuthStateChanged(auth, function(user){
  if(user){
    setSignedInUI(true);
    startSyncingFor(user.uid);
  } else {
    setSignedInUI(false);
    stopSyncing();
    setStatus('Not signed in — data stays local to this browser.');
  }
});
