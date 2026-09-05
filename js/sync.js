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
// copy is newer overwrites the other's fields (done, name, category,
// completed, notes, ...) — see applyIncomingBackup in js/app.js. Otherwise
// marking a task done on one device would never show up on another that
// already had that task synced.

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

var POLL_MS = 4000; // how often to check local storage for unsynced changes
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
  // writes when nothing changed since the last push.
  return JSON.stringify([data.sessions.length, data.tasks.length, data.categories.length,
    (data.presets || []).length,
    data.sessions.map(function(s){return s.id;}).join(','),
    // updatedAt covers every editable field (name, category, estimate,
    // notes, session length...) in one stamp — without it, a rename or a
    // note edit changes nothing here and never gets pushed, even though
    // done/completed did trigger a push before this field existed.
    data.tasks.map(function(t){return t.id + ':' + t.updatedAt;}).join(','),
    (data.presets || []).map(function(p){return p.id;}).join(',')]);
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
      applyingRemote = true;
      try{ window.PomodoroBench.applyIncomingBackup(docSnap.data()); }
      catch(e){ /* nothing new to merge */ }
      applyingRemote = false;
      // Reflect any newly-merged-in remote items back to the fingerprint
      // baseline so we don't immediately re-push a no-op change.
      lastPushedFingerprint = fingerprint(window.PomodoroBench.buildBackupData());
      setStatus('Signed in as ' + auth.currentUser.email + ' — last update ' + new Date().toLocaleTimeString());
    });

    startPolling();
    setStatus('Signed in as ' + auth.currentUser.email + '.');
  }).catch(function(err){
    setStatus('Could not connect: ' + (err && err.message ? err.message : err));
  });
}

function stopSyncing(){
  if(unsubscribeSnapshot){ unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  stopPolling();
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
