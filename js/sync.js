// Optional multi-device sync via Firebase Auth (Google sign-in) + Firestore.
// Loaded as a module (deferred), so it always runs after js/app.js has set
// up window.PomodoroBench.
//
// TASKS — Firestore is the source of truth, one document per task:
//
//   /syncs/{uid}/tasks/{taskId}
//
// While signed in, every change the user makes to a task becomes one small
// write to that task's own document (setDoc / updateDoc / deleteDoc / an
// atomic increment for `completed`) — see forwardTaskOp in js/app.js. The
// local task cache in localStorage is a mirror: a collection listener
// rewrites it from every snapshot, deletions included, and app.js redraws
// from the cache. No device ever overwrites another device's task, because
// no device ever writes a task it did not itself change. Firestore's
// persistent local cache queues writes made offline and replays them.
//
// SESSIONS / CATEGORIES / PRESETS — still one document per user:
//
//   /syncs/{uid}   {sessions, categories, presets, tasksMigratedAt, updatedAt}
//
// merged additively by id both ways (a pull never deletes anything local).
// That document also used to carry `tasks` as one array that every push
// overwrote wholesale — which is how a tick made on one device got wiped by
// the other's push. The array is left in place untouched as a frozen copy;
// this file writes the document with merge:true and never sends `tasks`.
//
// MIGRATION (once per user, first sign-in on this code): when the tasks
// collection is empty and the user document has no `tasksMigratedAt`, the
// collection is seeded from the union of the old array and this device's
// cache, merged with the same done-stamp-aware rules the pull always used.
// Nothing is deleted from anywhere; a dated copy of the cache is also kept
// in localStorage. Only after every seed write succeeds is the marker set.
//
// WHEN A PUSH OF THE USER DOCUMENT HAPPENS: right after any local save of
// sessions/categories/presets (app.js fires 'pomodoroBench:changed'),
// debounced briefly; immediately when the tab is hidden or unloading; and
// from a slow poll as a safety net. After a pull, local is compared against
// what the remote holds and pushed if it differs.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, getDocFromServer, getDocsFromServer, setDoc, updateDoc, deleteDoc, writeBatch,
  onSnapshot, serverTimestamp, increment
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

var POLL_MS = 15000; // safety-net poll for the user document; real pushes are event-driven
var PUSH_DEBOUNCE_MS = 1500;
var SEED_BATCH_SIZE = 400; // Firestore caps a batch at 500 writes

var app = initializeApp(firebaseConfig);
var db;
try{
  // Persistent cache: writes made offline are queued and replayed, and
  // snapshots keep working from cache, across reloads and across tabs.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}catch(e){
  db = getFirestore(app);
}
var auth = getAuth(app);
var googleProvider = new GoogleAuthProvider();

var els = {
  signInBtn: document.getElementById('syncSignInBtn'),
  signOutBtn: document.getElementById('syncSignOutBtn'),
  status: document.getElementById('syncStatus')
};

var unsubscribeUserDoc = null;
var unsubscribeTasks = null;
var pollHandle = null;
var pushTimeout = null;
var lastPushedFingerprint = null;
var applyingRemote = false; // guards against re-pushing what we just pulled
var currentUid = null;

function setStatus(text){
  els.status.textContent = text;
}

// Set once when this sign-in moved tasks into the collection; shown for the
// rest of the session so the one-time migration is visible, not silent.
var migrationNote = '';

function signedInLabel(){
  var email = auth.currentUser && auth.currentUser.email;
  return 'Signed in as ' + (email || 'you') + migrationNote;
}

function PB(){ return window.PomodoroBench; }

// Firestore rejects `undefined` field values; a JSON round-trip drops them
// and leaves everything else (numbers, strings, arrays, null) intact.
function plain(obj){
  return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------- tasks

function taskRef(id){
  return doc(db, 'syncs', currentUid, 'tasks', String(id));
}

function reportError(prefix){
  return function(err){
    setStatus(prefix + ': ' + (err && err.message ? err.message : err));
  };
}

// A patch to a task this device believes exists but the store does not
// (deleted elsewhere while we were offline) is rejected by the server. The
// user did just edit it, so it exists as far as they are concerned: write
// the whole cached copy back.
function fallbackSetFromCache(id){
  var t = PB().getTasks().filter(function(x){ return x.id === id; })[0];
  if(!t) return Promise.resolve();
  return setDoc(taskRef(id), plain(t));
}

var firestoreTaskBackend = {
  apply: function(op){
    if(!currentUid || !op || !op.id) return;
    var p;
    if(op.type === 'set'){
      p = setDoc(taskRef(op.id), plain(op.task));
    } else if(op.type === 'delete'){
      p = deleteDoc(taskRef(op.id));
    } else if(op.type === 'update'){
      p = updateDoc(taskRef(op.id), plain(op.fields || {})).catch(function(){ return fallbackSetFromCache(op.id); });
    } else if(op.type === 'increment'){
      var fields = plain(op.fields || {});
      fields[op.field] = increment(op.by || 1);
      p = updateDoc(taskRef(op.id), fields).catch(function(){ return fallbackSetFromCache(op.id); });
    } else {
      return;
    }
    p.catch(reportError('Sync error'));
  }
};

// Seeds the (empty) tasks collection from the given tasks, in batches. All
// batches must succeed before the caller marks the migration done.
function seedTasks(tasks){
  var chunks = [];
  for(var i = 0; i < tasks.length; i += SEED_BATCH_SIZE) chunks.push(tasks.slice(i, i + SEED_BATCH_SIZE));
  return chunks.reduce(function(prev, chunk){
    return prev.then(function(){
      var batch = writeBatch(db);
      chunk.forEach(function(t){ batch.set(taskRef(t.id), plain(t)); });
      return batch.commit();
    });
  }, Promise.resolve());
}

// Tasks changed on this device while signed out: upload exactly those.
function uploadPendingTaskOps(){
  var pending = PB().takePendingTaskOps();
  var byId = {};
  PB().getTasks().forEach(function(t){ byId[t.id] = t; });
  var writes = [];
  pending.upserts.forEach(function(id){
    if(byId[id]) writes.push(setDoc(taskRef(id), plain(byId[id])));
  });
  pending.deletes.forEach(function(id){
    writes.push(deleteDoc(taskRef(id)));
  });
  return Promise.all(writes);
}

// Runs applyIncomingBackup without letting the tasks it adds/changes be
// recorded as pending ops or forwarded anywhere — used for the one-time
// merge of the old task array into the cache right before seeding, when
// the cache as a whole is about to be uploaded anyway.
function mergeIntoCacheSilently(data){
  var noop = { apply: function(){} };
  PB().setTaskBackend(noop);
  applyingRemote = true;
  try{ PB().applyIncomingBackup(data); }
  catch(e){ /* nothing valid to merge */ }
  applyingRemote = false;
  PB().setTaskBackend(null);
}

function withoutTasks(userDoc){
  var copy = {};
  Object.keys(userDoc || {}).forEach(function(k){ if(k !== 'tasks') copy[k] = userDoc[k]; });
  copy.tasks = [];
  return copy;
}

// ---------------------------------------------------------------- user document

function fingerprint(data){
  // Cheap change-detector for the user document: sessions, categories and
  // presets only — tasks live in their own documents now. Also run over raw
  // remote docs, which may lack arrays — hence the guards.
  var sessions = (data && Array.isArray(data.sessions)) ? data.sessions : [];
  var categories = (data && Array.isArray(data.categories)) ? data.categories : [];
  var presets = (data && Array.isArray(data.presets)) ? data.presets : [];
  return JSON.stringify([sessions.length, categories.length, presets.length,
    sessions.map(function(s){return s.id;}).join(','),
    presets.map(function(p){return p.id;}).join(',')]);
}

function pushLocalSnapshot(){
  if(!currentUid || !PB()) return;
  var data = PB().buildBackupData();
  var fp = fingerprint(data);
  if(fp === lastPushedFingerprint) return;
  lastPushedFingerprint = fp;
  // merge:true — this never touches fields it does not send, so the old
  // `tasks` array and `tasksMigratedAt` stay exactly as they are.
  setDoc(doc(db, 'syncs', currentUid), {
    sessions: data.sessions,
    categories: data.categories,
    presets: data.presets,
    updatedAt: serverTimestamp()
  }, { merge: true }).then(function(){
    setStatus(signedInLabel() + ' — synced ' + new Date().toLocaleTimeString());
  }).catch(reportError('Sync error'));
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
// Task saves are irrelevant to the user document (the fingerprint ignores
// them); saves made *by* a pull are skipped — the snapshot handler decides
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

// ---------------------------------------------------------------- lifecycle

function startSyncingFor(uid){
  stopSyncing();
  currentUid = uid;
  setStatus('Connecting…');

  var userRef = doc(db, 'syncs', uid);
  var tasksCol = collection(db, 'syncs', uid, 'tasks');

  // Both reads go to the server on purpose. With the persistent cache, an
  // offline getDocs answers from cache — and an empty cached collection
  // would look exactly like "never migrated", seeding the store from this
  // device's stale copy and overwriting everyone else's once back online.
  // Offline, this rejects instead: nothing is installed, the app runs on
  // its local cache, and the next online sign-in does the right thing.
  Promise.all([getDocFromServer(userRef), getDocsFromServer(tasksCol)]).then(function(results){
    if(currentUid !== uid) return; // signed out (or switched) while connecting
    var userSnap = results[0], tasksSnap = results[1];
    var userDoc = userSnap.exists() ? userSnap.data() : null;

    // 1. Sessions / categories / presets: additive merge from the user doc.
    if(userDoc){
      applyingRemote = true;
      try{ PB().applyIncomingBackup(withoutTasks(userDoc)); }
      catch(e){ /* remote doc had nothing new/valid — fine */ }
      applyingRemote = false;
    }

    // 2. Tasks: seed the collection once, or upload what changed here
    //    while signed out. Never delete anything in either branch.
    var migrated = !!(userDoc && userDoc.tasksMigratedAt);
    var step;
    if(!migrated && tasksSnap.empty){
      PB().backupTasksCache('preMigration');
      var oldArray = (userDoc && Array.isArray(userDoc.tasks)) ? userDoc.tasks : [];
      if(oldArray.length) mergeIntoCacheSilently({ sessions: [], tasks: oldArray });
      PB().takePendingTaskOps(); // the whole cache is about to go up anyway
      var seed = PB().getTasks();
      step = seedTasks(seed).then(function(){
        return setDoc(userRef, { tasksMigratedAt: serverTimestamp() }, { merge: true });
      }).then(function(){
        migrationNote = ' · moved ' + seed.length + ' task(s) into the cloud';
      });
    } else {
      step = uploadPendingTaskOps();
    }

    return step.then(function(){
      if(currentUid !== uid) return;

      // 3. From here on the collection is the store: install the backend
      //    and mirror every snapshot into the cache.
      PB().setTaskBackend(firestoreTaskBackend);
      unsubscribeTasks = onSnapshot(tasksCol, function(snap){
        if(currentUid !== uid) return;
        applyingRemote = true;
        try{ PB().replaceTasksFromRemote(snap.docs.map(function(d){ return d.data(); })); }
        catch(e){ /* keep the cache we have */ }
        applyingRemote = false;
      }, reportError('Sync error (tasks)'));

      // 4. The user document for everything else.
      pushLocalSnapshot();
      unsubscribeUserDoc = onSnapshot(userRef, function(docSnap){
        if(currentUid !== uid || !docSnap.exists()) return;
        var remote = withoutTasks(docSnap.data());
        applyingRemote = true;
        try{ PB().applyIncomingBackup(remote); }
        catch(e){ /* nothing new to merge */ }
        applyingRemote = false;
        // The baseline is what the remote actually holds — not our merged
        // local. If local now differs (local has items the remote lacks),
        // that difference has to be pushed, or it stays stranded here.
        lastPushedFingerprint = fingerprint(remote);
        schedulePush();
        setStatus(signedInLabel() + ' — last update ' + new Date().toLocaleTimeString());
      }, reportError('Sync error'));

      startPolling();
      attachPushTriggers();
      setStatus(signedInLabel() + '.');
    });
  }).catch(function(err){
    // Nothing was installed: the app keeps running on its local cache, and
    // nothing local was replaced or deleted.
    setStatus('Could not connect: ' + (err && err.message ? err.message : err));
  });
}

function stopSyncing(){
  if(unsubscribeUserDoc){ unsubscribeUserDoc(); unsubscribeUserDoc = null; }
  if(unsubscribeTasks){ unsubscribeTasks(); unsubscribeTasks = null; }
  stopPolling();
  detachPushTriggers();
  if(pushTimeout){ clearTimeout(pushTimeout); pushTimeout = null; }
  if(PB()) PB().setTaskBackend(null);
  currentUid = null;
  lastPushedFingerprint = null;
  migrationNote = '';
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
