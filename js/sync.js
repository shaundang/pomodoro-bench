// Optional multi-device sync via Firestore. Loaded as a module (deferred),
// so it always runs after js/app.js has set up window.PomodoroBench.
//
// Model: one Firestore document per "sync code" at /syncs/{code}, holding
// the same {sessions, tasks, categories} shape as the local export/import
// backup. Security rules make that collection world read/write — the sync
// code itself is the only access control, like a shared password. Do not
// reuse a code you'd consider secret for anything else.
//
// Merge direction is additive-by-id both ways (same rule as file import):
// pulling a remote snapshot never deletes local items, and push always
// sends the full local snapshot. This means a delete on one device can be
// "revived" by an older snapshot from another device that hasn't synced
// that delete yet — acceptable for this app's scale, called out in the UI.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

var firebaseConfig = {
  projectId: "pomodoro-bench",
  appId: "1:923849496666:web:d09fc9caa40ba0ed562063",
  storageBucket: "pomodoro-bench.firebasestorage.app",
  apiKey: "AIzaSyDfEoFF6PM41Y369rquhMRtgF4KY1yD-As",
  authDomain: "pomodoro-bench.firebaseapp.com",
  messagingSenderId: "923849496666",
  measurementId: "G-4F7SYJ0JSM"
};

var STORAGE_SYNC_CODE = 'pomodoroBench.syncCode.v1';
var POLL_MS = 4000; // how often to check local storage for unsynced changes
var PUSH_DEBOUNCE_MS = 1500;

var app = initializeApp(firebaseConfig);
var db = getFirestore(app);

var els = {
  input: document.getElementById('syncCodeInput'),
  connectBtn: document.getElementById('syncConnectBtn'),
  status: document.getElementById('syncStatus')
};

var unsubscribe = null;
var pollHandle = null;
var pushTimeout = null;
var lastPushedFingerprint = null;
var applyingRemote = false; // guards against re-pushing what we just pulled
var connectedCode = null;

function setStatus(text){
  els.status.textContent = text;
}

function fingerprint(data){
  // Cheap change-detector: no crypto needed, just enough to skip redundant
  // writes when nothing changed since the last push.
  return JSON.stringify([data.sessions.length, data.tasks.length, data.categories.length,
    data.sessions.map(function(s){return s.id;}).join(','),
    data.tasks.map(function(t){return t.id + ':' + t.done + ':' + t.completed;}).join(',')]);
}

function pushLocalSnapshot(){
  if(!connectedCode || !window.PomodoroBench) return;
  var data = window.PomodoroBench.buildBackupData();
  var fp = fingerprint(data);
  if(fp === lastPushedFingerprint) return;
  lastPushedFingerprint = fp;
  setDoc(doc(db, 'syncs', connectedCode), {
    sessions: data.sessions,
    tasks: data.tasks,
    categories: data.categories,
    updatedAt: serverTimestamp()
  }).then(function(){
    setStatus('Connected as "' + connectedCode + '" — synced ' + new Date().toLocaleTimeString());
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

function connect(code){
  code = (code || '').trim();
  if(!code){ setStatus('Enter a sync code first.'); return; }
  disconnect();
  connectedCode = code;
  try{ localStorage.setItem(STORAGE_SYNC_CODE, code); }catch(e){}
  setStatus('Connecting…');

  var ref = doc(db, 'syncs', code);
  getDoc(ref).then(function(snap){
    if(snap.exists()){
      applyingRemote = true;
      try{ window.PomodoroBench.applyIncomingBackup(snap.data()); }
      catch(e){ /* remote doc had nothing new/valid — fine */ }
      applyingRemote = false;
    }
    // Push local (now possibly merged with remote) so both sides converge.
    pushLocalSnapshot();

    unsubscribe = onSnapshot(ref, function(docSnap){
      if(!docSnap.exists()) return;
      applyingRemote = true;
      try{ window.PomodoroBench.applyIncomingBackup(docSnap.data()); }
      catch(e){ /* nothing new to merge */ }
      applyingRemote = false;
      // Reflect any newly-merged-in remote items back to the fingerprint
      // baseline so we don't immediately re-push a no-op change.
      lastPushedFingerprint = fingerprint(window.PomodoroBench.buildBackupData());
      setStatus('Connected as "' + code + '" — last update ' + new Date().toLocaleTimeString());
    });

    startPolling();
    els.connectBtn.textContent = 'Disconnect';
    setStatus('Connected as "' + code + '".');
  }).catch(function(err){
    setStatus('Could not connect: ' + (err && err.message ? err.message : err));
    connectedCode = null;
  });
}

function disconnect(){
  if(unsubscribe){ unsubscribe(); unsubscribe = null; }
  stopPolling();
  if(pushTimeout){ clearTimeout(pushTimeout); pushTimeout = null; }
  connectedCode = null;
  lastPushedFingerprint = null;
  els.connectBtn.textContent = 'Connect';
}

els.connectBtn.addEventListener('click', function(){
  if(connectedCode){
    disconnect();
    setStatus('Disconnected — data stays local to this browser.');
  } else {
    connect(els.input.value);
  }
});

// Resume a previously-used sync code on page load.
(function boot(){
  var saved = null;
  try{ saved = localStorage.getItem(STORAGE_SYNC_CODE); }catch(e){}
  if(saved){
    els.input.value = saved;
    connect(saved);
  }
})();
