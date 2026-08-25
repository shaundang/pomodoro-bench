(function(){
  "use strict";

  var PRESETS = [
    {id:'deep', label:'Deep work / coding', work:50, brk:10, note:'Long enough to reach flow, short enough to avoid burnout.'},
    {id:'writing', label:'Writing', work:45, brk:15, note:'Sustained focus with a longer reset before the next pass.'},
    {id:'study', label:'Study & practice', work:25, brk:5, note:'The classic split — matches a typical attention span for review and drills.'},
    {id:'reading', label:'Reading', work:30, brk:5, note:'Enough to finish a chapter or paper section before pausing.'},
    {id:'admin', label:'Admin & email', work:15, brk:3, note:'Short bursts suited to shallow, high-switching tasks.'},
    {id:'planning', label:'Planning & meetings', work:20, brk:5, note:'Short enough to stay sharp while scoping the next step.'},
    {id:'custom', label:'Custom', work:25, brk:5, note:'Set your own lengths below.'}
  ];

  var STORAGE_SESSIONS = 'pomodoroBench.sessions.v1';
  var STORAGE_TASKS = 'pomodoroBench.tasks.v1';
  var STORAGE_CATEGORIES = 'pomodoroBench.categories.v1';
  var STORAGE_TIMER = 'pomodoroBench.timer.v1';
  var DEFAULT_CATEGORIES = ['Learning', 'Work', 'Personal'];

  var els = {
    presetGrid: document.getElementById('presetGrid'),
    presetNote: document.getElementById('presetNote'),
    taskForm: document.getElementById('taskForm'),
    newTaskName: document.getElementById('newTaskName'),
    newTaskCategory: document.getElementById('newTaskCategory'),
    newTaskCategoryCreate: document.getElementById('newTaskCategoryCreate'),
    newTaskEstimate: document.getElementById('newTaskEstimate'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    noCategoryHint: document.getElementById('noCategoryHint'),
    taskList: document.getElementById('taskList'),
    workInput: document.getElementById('workInput'),
    breakInput: document.getElementById('breakInput'),
    ringWrap: document.getElementById('ringWrap'),
    ringProgress: document.getElementById('ringProgress'),
    modeLabel: document.getElementById('modeLabel'),
    timeReadout: document.getElementById('timeReadout'),
    categoryLabel: document.getElementById('categoryLabel'),
    cycleDots: document.getElementById('cycleDots'),
    startPauseBtn: document.getElementById('startPauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    skipBtn: document.getElementById('skipBtn'),
    noTaskHint: document.getElementById('noTaskHint'),
    banner: document.getElementById('banner'),
    bannerText: document.getElementById('bannerText'),
    bannerAction: document.getElementById('bannerAction'),
    todayMinutes: document.getElementById('todayMinutes'),
    todayPomodoros: document.getElementById('todayPomodoros'),
    todayCompare: document.getElementById('todayCompare'),
    streakDays: document.getElementById('streakDays'),
    bestStreak: document.getElementById('bestStreak'),
    allTimeTotal: document.getElementById('allTimeTotal'),
    allTimePomodoros: document.getElementById('allTimePomodoros'),
    logTitle: document.getElementById('logTitle'),
    logPrevBtn: document.getElementById('logPrevBtn'),
    logNextBtn: document.getElementById('logNextBtn'),
    logDatePicker: document.getElementById('logDatePicker'),
    logTodayBtn: document.getElementById('logTodayBtn'),
    logExpandBtn: document.getElementById('logExpandBtn'),
    logCountNote: document.getElementById('logCountNote'),
    logList: document.getElementById('logList'),
    undoToast: document.getElementById('undoToast'),
    undoText: document.getElementById('undoText'),
    undoBtn: document.getElementById('undoBtn'),
    hourChart: document.getElementById('hourChart'),
    hourChartTooltip: document.getElementById('hourChartTooltip'),
    peakHourNote: document.getElementById('peakHourNote'),
    categoryAllList: document.getElementById('categoryAllList'),
    categoryRangeTabs: document.getElementById('categoryRangeTabs'),
    customRangePicker: document.getElementById('customRangePicker'),
    customRangeFromPicker: document.getElementById('customRangeFromPicker'),
    customRangeToPicker: document.getElementById('customRangeToPicker'),
    resetStatsBtn: document.getElementById('resetStatsBtn'),
    tabTimerBtn: document.getElementById('tabTimerBtn'),
    tabStatsBtn: document.getElementById('tabStatsBtn'),
    viewTimer: document.getElementById('viewTimer'),
    viewStats: document.getElementById('viewStats'),
    heatmapYear: document.getElementById('heatmapYear'),
    heatmapPrevYearBtn: document.getElementById('heatmapPrevYearBtn'),
    heatmapNextYearBtn: document.getElementById('heatmapNextYearBtn'),
    heatmapYearTotal: document.getElementById('heatmapYearTotal'),
    heatmapMonths: document.getElementById('heatmapMonths'),
    heatmapGrid: document.getElementById('heatmapGrid'),
    categoryPieChart: document.getElementById('categoryPieChart'),
    backupMenuBtn: document.getElementById('backupMenuBtn'),
    backupMenuPanel: document.getElementById('backupMenuPanel')
  };

  var RING_R = 52;
  var RING_C = 2 * Math.PI * RING_R;
  els.ringProgress.style.strokeDasharray = RING_C.toFixed(2);

  // ---------- state ----------
  var state = {
    presetId: 'deep',
    workMin: 50,
    breakMin: 10,
    mode: 'focus', // 'focus' | 'break' | 'longbreak'
    totalMs: 50 * 60 * 1000,
    remainingMs: 50 * 60 * 1000,
    running: false,
    endAt: null,
    completedInCycle: 0,
    activeTaskId: null,
    activeTaskName: '',
    activeTaskCategory: ''
  };

  // UI-only state, not persisted
  var logViewDate = todayKey();
  var editingLogId = null;
  var editingTaskId = null;
  var editingCategoryTaskId = null;
  var editingTaskNotesDraft = null; // [{id, pomodoroNumber, description}], only while editingTaskId is set
  var lastDeleted = null; // {type:'session'|'task', data}
  var undoTimeout = null;
  var STORAGE_CATEGORY_RANGE = 'pomodoroBench.categoryRange.v1';
  var categoryRange = 'all'; // 'day' | 'month' | 'year' | 'all' | 'custom' — which period the Insights charts show
  var STORAGE_CUSTOM_RANGE = 'pomodoroBench.customRange.v1';
  var customRangeFrom = ''; // 'YYYY-MM-DD', only meaningful when categoryRange === 'custom'
  var customRangeTo = '';
  var openDatePicker = null; // the one open <calendar popover> instance, so opening another closes it
  var heatmapViewYear = new Date().getFullYear(); // which year the heatmap is currently showing
  var STORAGE_LOG_EXPANDED = 'pomodoroBench.logExpanded.v1';
  var logExpanded = false; // whether Today's log is showing its taller, non-scrolling view

  function loadTimerState(){
    try{
      var raw = localStorage.getItem(STORAGE_TIMER);
      if(!raw) return;
      var saved = JSON.parse(raw);
      if(!saved || typeof saved !== 'object') return;
      Object.assign(state, saved);
      if(state.running && state.endAt){
        var remaining = state.endAt - nowMs();
        if(remaining <= 0){
          // completed while away: snap to 0, let boot logic handle completion
          state.remainingMs = 0;
        } else {
          state.remainingMs = remaining;
        }
      }
    }catch(e){ /* ignore corrupt storage */ }
  }

  function saveTimerState(){
    try{
      localStorage.setItem(STORAGE_TIMER, JSON.stringify(state));
    }catch(e){ /* storage unavailable */ }
  }

  function nowMs(){ return new Date().getTime(); }

  function generateId(){
    return 'id_' + nowMs().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ---------- session-length presets ----------
  // Each session-length preset gets its own light color (fixed by position in
  // PRESETS, not hashed) so the same preset always reads as the same color
  // both here and on the task card's session chip.
  function presetColorClass(id){
    var idx = PRESETS.map(function(p){ return p.id; }).indexOf(id);
    if(idx < 0) idx = PRESETS.length - 1;
    return 'session-color-' + (idx % 7);
  }

  function renderPresets(){
    els.presetGrid.innerHTML = '';
    PRESETS.forEach(function(p){
      var btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.type = 'button';
      btn.setAttribute('role','listitem');
      btn.setAttribute('aria-pressed', String(p.id === state.presetId));
      btn.innerHTML = '<span class="p-name"><span class="preset-dot ' + presetColorClass(p.id) + '" aria-hidden="true"></span>' + p.label + '</span>' +
        '<span class="p-len">' + p.work + ' / ' + p.brk + ' min</span>';
      btn.addEventListener('click', function(){ applyPreset(p.id); });
      els.presetGrid.appendChild(btn);
    });
    var current = PRESETS.filter(function(p){return p.id === state.presetId;})[0];
    els.presetNote.textContent = current ? current.note : '';
  }

  // ---------- categories ----------
  // No standalone management screen — categories are created and assigned
  // right where they're used: the "+ New category…" option in any category
  // picker (the add-task row, or a task card's category chip).
  function loadCategories(){
    try{
      var raw = localStorage.getItem(STORAGE_CATEGORIES);
      if(raw === null){
        saveCategories(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES.slice();
      }
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }catch(e){ return []; }
  }

  function saveCategories(arr){
    try{ localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(arr)); }catch(e){ /* ignore */ }
  }

  function addCategory(name){
    name = name.trim();
    if(!name) return;
    var categories = loadCategories();
    var exists = categories.some(function(c){ return c.toLowerCase() === name.toLowerCase(); });
    if(!exists){
      categories.push(name);
      saveCategories(categories);
    }
  }

  function categoryColorIndex(name){
    var hash = 0;
    for(var i=0;i<name.length;i++){ hash = (hash + name.charCodeAt(i)) % 6; }
    return hash;
  }

  function categoryColorClass(name){
    return 'cat-color-' + categoryColorIndex(name);
  }

  var NEW_CATEGORY_VALUE = '__new__';

  function fillCategorySelectWithNew(selectEl, categories, currentValue){
    var list = categories.slice();
    if(currentValue && list.indexOf(currentValue) === -1){
      list.push(currentValue);
    }
    selectEl.innerHTML = '';
    list.forEach(function(name){
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      selectEl.appendChild(opt);
    });
    var newOpt = document.createElement('option');
    newOpt.value = NEW_CATEGORY_VALUE;
    newOpt.textContent = '+ New category…';
    selectEl.appendChild(newOpt);
    if(currentValue) selectEl.value = currentValue;
  }

  // Wires a select + hidden "create new" text input into one picker:
  // choosing "+ New category…" reveals the input; Enter/blur commits it
  // (creates the category and calls onCommit), Escape cancels back to the
  // previously selected value. Picking an existing option commits directly.
  function wireCategoryPicker(selectEl, createInputEl, initialValue, onCommit){
    var lastValue = initialValue;

    function commitCreate(){
      var name = createInputEl.value.trim();
      createInputEl.hidden = true;
      if(!name){
        fillCategorySelectWithNew(selectEl, loadCategories(), lastValue);
        return;
      }
      addCategory(name);
      lastValue = name;
      fillCategorySelectWithNew(selectEl, loadCategories(), name);
      onCommit(name);
    }

    selectEl.addEventListener('change', function(){
      if(selectEl.value === NEW_CATEGORY_VALUE){
        createInputEl.hidden = false;
        createInputEl.value = '';
        createInputEl.focus();
      } else {
        lastValue = selectEl.value;
        onCommit(selectEl.value);
      }
    });

    selectEl.addEventListener('blur', function(){
      if(!createInputEl.hidden) return;
      if(selectEl.value === NEW_CATEGORY_VALUE){
        fillCategorySelectWithNew(selectEl, loadCategories(), lastValue);
      }
    });

    createInputEl.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); commitCreate(); }
      else if(e.key === 'Escape'){
        createInputEl.hidden = true;
        fillCategorySelectWithNew(selectEl, loadCategories(), lastValue);
      }
    });
    createInputEl.addEventListener('blur', commitCreate);
  }

  function updateCategoryFormAvailability(){
    var hasCategories = loadCategories().length > 0;
    els.noCategoryHint.hidden = hasCategories;
  }

  function applyPreset(id){
    var p = PRESETS.filter(function(x){return x.id === id;})[0];
    if(!p) return;
    state.presetId = id;
    state.workMin = p.work;
    state.breakMin = p.brk;
    els.workInput.value = p.work;
    els.breakInput.value = p.brk;
    if(!state.running){
      resetPhase();
    }
    renderPresets();
    saveTimerState();
    syncActiveTaskSessionLength();
  }

  function presetLabelFor(id){
    var p = PRESETS.filter(function(x){return x.id === id;})[0];
    return p ? p.label : 'Custom';
  }

  function fillPresetSelect(selectEl, currentId){
    selectEl.innerHTML = '';
    PRESETS.forEach(function(p){
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label + ' (' + p.work + '/' + p.brk + ')';
      selectEl.appendChild(opt);
    });
    selectEl.value = currentId;
  }

  // Keeps the currently active task's stored session length (preset + exact
  // minutes) up to date whenever the top "Session length" controls change,
  // so reactivating that task later restores the same duration.
  function syncActiveTaskSessionLength(){
    if(!state.activeTaskId) return;
    var tasks = loadTasks();
    var t = tasks.filter(function(x){ return x.id === state.activeTaskId; })[0];
    if(!t) return;
    t.sessionPresetId = state.presetId;
    t.workMin = state.workMin;
    t.breakMin = state.breakMin;
    saveTasks(tasks);
    renderTasks();
  }

  // ---------- timer core ----------
  function phaseMinutes(){
    if(state.mode === 'focus') return state.workMin;
    if(state.mode === 'longbreak') return Math.max(15, state.breakMin * 3);
    return state.breakMin;
  }

  function resetPhase(){
    state.totalMs = phaseMinutes() * 60 * 1000;
    state.remainingMs = state.totalMs;
    state.running = false;
    state.endAt = null;
    renderTimer();
    saveTimerState();
  }

  function formatTime(ms){
    var totalSec = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function renderTimer(){
    els.timeReadout.textContent = formatTime(state.remainingMs);
    var modeName = state.mode === 'focus' ? 'Focus' : (state.mode === 'longbreak' ? 'Long break' : 'Short break');
    els.modeLabel.textContent = modeName;

    if(state.mode === 'focus'){
      els.categoryLabel.textContent = state.activeTaskId
        ? state.activeTaskName + (state.activeTaskCategory ? ' — ' + state.activeTaskCategory : '')
        : 'No task selected';
    } else {
      els.categoryLabel.textContent = 'Recharge';
    }

    var frac = state.totalMs > 0 ? (state.remainingMs / state.totalMs) : 0;
    frac = Math.min(1, Math.max(0, frac));
    var offset = RING_C * (1 - frac);
    els.ringProgress.style.strokeDashoffset = offset.toFixed(2);
    els.ringProgress.classList.toggle('mode-break', state.mode !== 'focus');
    els.ringWrap.classList.toggle('ring-wrap-running', state.running);

    els.startPauseBtn.textContent = state.running ? 'Pause' : (state.remainingMs === state.totalMs ? 'Start' : 'Resume');

    renderDots();
    updateStartAvailability();

    var titleTask = state.mode === 'focus' && state.activeTaskName ? state.activeTaskName + ' · ' : '';
    document.title = (state.running ? formatTime(state.remainingMs) + ' · ' + titleTask : '') + 'Pomodoro Bench';
  }

  function updateStartAvailability(){
    var needsTask = state.mode === 'focus' && !state.activeTaskId;
    els.startPauseBtn.disabled = needsTask && !state.running;
    els.noTaskHint.hidden = !needsTask;
  }

  function renderDots(){
    els.cycleDots.innerHTML = '';
    for(var i=0;i<4;i++){
      var d = document.createElement('span');
      d.className = 'dot' + (i < (state.completedInCycle % 4) ? ' filled' : '');
      els.cycleDots.appendChild(d);
    }
  }

  var tickHandle = null;
  function startTicking(){
    if(tickHandle) return;
    tickHandle = setInterval(tick, 250);
  }
  function stopTicking(){
    if(tickHandle){ clearInterval(tickHandle); tickHandle = null; }
  }

  function tick(){
    if(!state.running) return;
    var remaining = state.endAt - nowMs();
    if(remaining <= 0){
      state.remainingMs = 0;
      renderTimer();
      completePhase();
      return;
    }
    state.remainingMs = remaining;
    renderTimer();
  }

  function startPause(){
    if(state.mode === 'focus' && !state.activeTaskId && !state.running) return;
    if(state.running){
      // pause
      state.running = false;
      state.remainingMs = Math.max(0, state.endAt - nowMs());
      state.endAt = null;
      stopTicking();
      renderTimer();
      saveTimerState();
    } else {
      if(state.remainingMs <= 0){ resetPhase(); }
      state.running = true;
      state.endAt = nowMs() + state.remainingMs;
      startTicking();
      renderTimer();
      saveTimerState();
      renderTasks();
      playChime(0.5);
      requestNotificationPermission();
    }
  }

  // Ask once, and only in response to the user's own click (browsers refuse
  // silent/auto permission prompts). Safe to call repeatedly — a no-op once
  // permission has already been granted or denied.
  function requestNotificationPermission(){
    if(!('Notification' in window)) return;
    if(Notification.permission === 'default'){
      Notification.requestPermission();
    }
  }

  // Desktop popup for phase completion, in addition to the audio chime.
  // Falls back silently if the API is unavailable or permission was denied.
  function notifyPhaseEnd(title, body){
    try{
      if(!('Notification' in window)) return;
      if(Notification.permission !== 'granted') return;
      var n = new Notification(title, {
        body: body,
        tag: 'pomodoro-bench-phase'
      });
      n.onclick = function(){
        window.focus();
        n.close();
      };
    }catch(e){ /* notifications unavailable, stay silent */ }
  }

  function completePhase(){
    state.running = false;
    state.endAt = null;
    stopTicking();
    playChime(1);

    if(state.mode === 'focus'){
      logSession(state.workMin, 'completed', 'focus');
      incrementTaskCompleted(state.activeTaskId);
      state.completedInCycle += 1;
      var goingLong = state.completedInCycle % 4 === 0;
      state.mode = goingLong ? 'longbreak' : 'break';
      showBanner('Focus session done. Nice work — take a break.', 'Start break');
      notifyPhaseEnd('Focus session done 🍅', 'Nice work — take a break.');
    } else {
      // state.totalMs is this break's own duration (short or long), set when it started.
      logSession(Math.round(state.totalMs / 60000), 'completed', 'break');
      state.mode = 'focus';
      showBanner('Break’s over. Ready when you are.', 'Start focus');
      notifyPhaseEnd('Break’s over', 'Ready when you are.');
    }
    state.totalMs = phaseMinutes() * 60 * 1000;
    state.remainingMs = state.totalMs;
    renderTimer();
    saveTimerState();
    refreshStats();
  }

  function showBanner(text, actionLabel){
    els.bannerText.textContent = text;
    els.bannerAction.textContent = actionLabel;
    els.banner.hidden = false;
  }

  els.bannerAction.addEventListener('click', function(){
    els.banner.hidden = true;
    startPause();
  });

  // gentle two-tone chime via WebAudio, no external asset
  var audioCtx = null;
  function playChime(strength){
    try{
      if(!audioCtx){
        var AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return;
        audioCtx = new AC();
      }
      if(audioCtx.state === 'suspended'){ audioCtx.resume(); }
      var t0 = audioCtx.currentTime;
      [880, 1108].forEach(function(freq, i){
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        var start = t0 + i * 0.14;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12 * strength, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.34);
      });
    }catch(e){ /* audio unavailable, stay silent */ }
  }

  function resetTimer(){
    state.running = false;
    state.endAt = null;
    stopTicking();
    resetPhase();
    renderTasks();
  }

  function skipPhase(){
    state.running = false;
    stopTicking();

    var elapsedMs = state.totalMs - Math.max(0, state.remainingMs);
    var elapsedMin = Math.round(elapsedMs / 60000);
    if(elapsedMin >= 1){
      logSession(elapsedMin, 'skipped', state.mode === 'focus' ? 'focus' : 'break');
    }
    refreshStats();

    state.endAt = null;
    if(state.mode === 'focus'){
      state.mode = state.completedInCycle > 0 && (state.completedInCycle % 4 === 3) ? 'longbreak' : 'break';
    } else {
      state.mode = 'focus';
    }
    resetPhase();
    renderTasks();
    els.banner.hidden = true;
  }

  // ---------- tasks ----------
  function loadTasks(){
    try{
      var raw = localStorage.getItem(STORAGE_TASKS);
      var arr = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(arr)) arr = [];
      var migrated = false;
      arr.forEach(function(t){
        if(!t.id){ t.id = generateId(); migrated = true; }
        if(typeof t.completed !== 'number'){ t.completed = 0; migrated = true; }
        if(typeof t.estimate !== 'number' || t.estimate < 1){ t.estimate = 1; migrated = true; }
        if(typeof t.done !== 'boolean'){ t.done = false; migrated = true; }
        if(!t.category){ t.category = 'Uncategorized'; migrated = true; }
        if(!t.sessionPresetId){ t.sessionPresetId = 'deep'; migrated = true; }
        if(typeof t.workMin !== 'number'){ t.workMin = 50; migrated = true; }
        if(typeof t.breakMin !== 'number'){ t.breakMin = 10; migrated = true; }
        if(!Array.isArray(t.notes)){ t.notes = []; migrated = true; }
        // Tasks finished before this field existed have no way to know when
        // that happened — treat them as done "in the past" so they hide
        // immediately rather than lingering on the list forever.
        if(t.done && typeof t.doneAt !== 'number'){ t.doneAt = 0; migrated = true; }
        if(!t.done && t.doneAt){ t.doneAt = null; migrated = true; }
      });
      if(migrated) saveTasks(arr);
      return arr;
    }catch(e){ return []; }
  }

  function saveTasks(arr){
    try{ localStorage.setItem(STORAGE_TASKS, JSON.stringify(arr)); }catch(e){ /* ignore */ }
  }

  function findTask(id){
    return loadTasks().filter(function(t){ return t.id === id; })[0];
  }

  function addTask(name, category, estimate){
    var tasks = loadTasks();
    tasks.push({
      id: generateId(),
      name: name.trim(),
      category: (category || '').trim() || 'Uncategorized',
      estimate: Math.max(1, Math.min(20, estimate || 1)),
      completed: 0,
      done: false,
      doneAt: null,
      createdAt: nowMs(),
      sessionPresetId: state.presetId,
      workMin: state.workMin,
      breakMin: state.breakMin,
      notes: []
    });
    saveTasks(tasks);
    renderTasks();
  }

  function setActiveTask(id){
    var t = findTask(id);
    if(!t || t.done) return;
    state.activeTaskId = t.id;
    state.activeTaskName = t.name;
    state.activeTaskCategory = t.category;
    state.presetId = t.sessionPresetId;
    state.workMin = t.workMin;
    state.breakMin = t.breakMin;
    els.workInput.value = t.workMin;
    els.breakInput.value = t.breakMin;
    renderPresets();
    resetPhase();
    saveTimerState();
    renderTasks();
    renderTimer();
  }

  function clearActiveTask(){
    state.activeTaskId = null;
    state.activeTaskName = '';
    state.activeTaskCategory = '';
    saveTimerState();
  }

  function toggleTaskDone(id){
    var tasks = loadTasks();
    var t = tasks.filter(function(x){ return x.id === id; })[0];
    if(!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? nowMs() : null;
    saveTasks(tasks);
    if(t.done && state.activeTaskId === id){ clearActiveTask(); }
    renderTasks();
    renderTimer();
  }

  function deleteTask(id){
    var tasks = loadTasks();
    var idx = tasks.findIndex(function(t){ return t.id === id; });
    if(idx === -1) return;
    lastDeleted = {type:'task', data: tasks[idx]};
    tasks.splice(idx, 1);
    saveTasks(tasks);
    if(state.activeTaskId === id) clearActiveTask();
    if(editingTaskId === id){ editingTaskId = null; editingTaskNotesDraft = null; }
    if(editingCategoryTaskId === id) editingCategoryTaskId = null;
    renderTasks();
    renderTimer();
    showUndo('Task deleted.');
  }

  function updateTaskCategory(id, name){
    var tasks = loadTasks();
    var t = tasks.filter(function(x){ return x.id === id; })[0];
    if(!t) return;
    t.category = name;
    saveTasks(tasks);
    if(state.activeTaskId === id){
      state.activeTaskCategory = name;
      saveTimerState();
      renderTimer();
    }
    editingCategoryTaskId = null;
    renderTasks();
  }

  function saveEditedTask(id, cardEl){
    var tasks = loadTasks();
    var t = tasks.filter(function(x){ return x.id === id; })[0];
    if(!t) return;
    var nameInput = cardEl.querySelector('.edit-task-name');
    var sessionInput = cardEl.querySelector('.edit-task-session');
    var catInput = cardEl.querySelector('.edit-task-category');
    var estInput = cardEl.querySelector('.edit-task-estimate');
    var name = nameInput.value.trim();
    t.name = name || t.name;
    t.category = catInput.value.trim() || 'Uncategorized';
    t.estimate = Math.max(1, Math.min(20, parseInt(estInput.value, 10) || t.estimate));

    var chosenPreset = PRESETS.filter(function(p){ return p.id === sessionInput.value; })[0];
    // Only a genuine session-length change should touch the running/paused
    // phase — editing the name, category or notes on the active task must
    // never wipe out time already spent on a paused session.
    var presetChanged = !!chosenPreset && chosenPreset.id !== t.sessionPresetId;
    if(chosenPreset){
      t.sessionPresetId = chosenPreset.id;
      t.workMin = chosenPreset.work;
      t.breakMin = chosenPreset.brk;
    }

    syncNotesDraftFromDom(cardEl);
    t.notes = (editingTaskNotesDraft || []).slice();

    saveTasks(tasks);
    if(state.activeTaskId === id){
      state.activeTaskName = t.name;
      state.activeTaskCategory = t.category;
      if(!state.running && presetChanged){
        state.presetId = t.sessionPresetId;
        state.workMin = t.workMin;
        state.breakMin = t.breakMin;
        els.workInput.value = t.workMin;
        els.breakInput.value = t.breakMin;
        renderPresets();
        resetPhase();
      }
      saveTimerState();
    }
    editingTaskId = null;
    editingTaskNotesDraft = null;
    renderTasks();
    renderTimer();
  }

  function incrementTaskCompleted(id){
    if(!id) return;
    var tasks = loadTasks();
    var t = tasks.filter(function(x){ return x.id === id; })[0];
    if(!t) return;
    t.completed += 1;
    saveTasks(tasks);
    renderTasks();
  }

  function renderTasks(){
    var allTasks = loadTasks();
    // Unfinished tasks always stay put; a finished one only stays visible
    // through the rest of the day it was checked off, then drops out of the
    // list on its own from the next day — no manual "clear completed" needed.
    var today = todayKey();
    var tasks = allTasks.filter(function(t){
      return !t.done || todayKey(new Date(t.doneAt || 0)) === today;
    });
    els.taskList.innerHTML = '';
    els.taskList.classList.toggle('task-list-locked', state.running);
    if(tasks.length === 0){
      var empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = allTasks.length === 0
        ? 'No tasks yet — add one above to get started.'
        : 'All done for today 🎉 — add a new task above.';
      els.taskList.appendChild(empty);
      return;
    }
    var categories = loadCategories();
    tasks.forEach(function(t){
      if(t.id === editingTaskId){
        var editLi = buildTaskEditCard(t);
        els.taskList.appendChild(editLi);
        var sessionSelect = editLi.querySelector('.edit-task-session');
        fillPresetSelect(sessionSelect, t.sessionPresetId);
        var catSelect = editLi.querySelector('.edit-task-category');
        var catCreate = editLi.querySelector('.edit-task-category-create');
        fillCategorySelectWithNew(catSelect, categories, t.category);
        wireCategoryPicker(catSelect, catCreate, t.category, function(){ /* Save button reads the value directly */ });
        renderNoteRows(editLi.querySelector('.note-rows'));
      } else {
        var li = buildTaskCard(t);
        els.taskList.appendChild(li);
        if(t.id === editingCategoryTaskId){
          var chipSelect = li.querySelector('.cat-inline-select');
          var chipCreate = li.querySelector('.cat-inline-create');
          fillCategorySelectWithNew(chipSelect, categories, t.category);
          wireCategoryPicker(chipSelect, chipCreate, t.category, function(name){ updateTaskCategory(t.id, name); });
          chipSelect.addEventListener('blur', function(){
            if(chipCreate.hidden && editingCategoryTaskId === t.id){
              editingCategoryTaskId = null;
              renderTasks();
            }
          });
          chipSelect.focus();
        }
      }
    });
  }

  function buildTaskCard(t){
    var li = document.createElement('li');
    li.className = 'task-card' +
      (t.id === state.activeTaskId ? ' task-card-active' : '') +
      (t.done ? ' task-card-done' : '');
    var pct = t.estimate > 0 ? Math.min(100, Math.round((t.completed / t.estimate) * 100)) : 0;
    var categoryCell = t.id === editingCategoryTaskId
      ? '<span class="task-category-inline">' +
          '<select class="cat-inline-select"></select>' +
          '<input type="text" class="cat-inline-create new-category-input" placeholder="New category" maxlength="40" hidden>' +
        '</span>'
      : '<button type="button" class="task-category-chip cat-pill ' + categoryColorClass(t.category) + '" data-action="edit-category" data-id="' + t.id + '">' + escapeHtml(t.category) + '</button>';
    var notesCell = (t.notes && t.notes.length > 0)
      ? '<span class="task-notes-count" title="' + t.notes.length + ' note(s)">📝 ' + t.notes.length + '</span>'
      : '';
    li.innerHTML =
      '<button class="task-check' + (t.done ? ' checked' : '') + '" data-action="toggle-done" data-id="' + t.id + '" aria-label="' + (t.done ? 'Mark as not done' : 'Mark as done') + '">' + (t.done ? '✓' : '') + '</button>' +
      '<div class="task-main" data-action="activate" data-id="' + t.id + '">' +
        '<span class="task-name">' + escapeHtml(t.name) + '</span>' +
        '<span class="task-meta">' +
          '<span class="task-session-chip ' + presetColorClass(t.sessionPresetId) + '">' + escapeHtml(presetLabelFor(t.sessionPresetId)) + '</span>' +
          categoryCell +
          '<span class="task-progress-text">' + t.completed + '/' + t.estimate + ' 🍅</span>' +
          notesCell +
        '</span>' +
        '<div class="task-progress-bar"><div class="task-progress-fill" style="width:' + pct + '%"></div></div>' +
      '</div>' +
      '<div class="task-actions">' +
        '<button class="icon-btn" data-action="edit-task" data-id="' + t.id + '" aria-label="Edit task" title="Edit">✎</button>' +
        '<button class="icon-btn" data-action="delete-task" data-id="' + t.id + '" aria-label="Delete task" title="Delete">✕</button>' +
      '</div>';
    return li;
  }

  function buildTaskEditCard(t){
    var li = document.createElement('li');
    li.className = 'task-card task-card-edit';
    li.innerHTML =
      '<div class="task-edit-grid">' +
        '<input type="text" class="inline-edit-input edit-task-name" value="' + escapeAttr(t.name) + '" maxlength="140" placeholder="Task name">' +
        '<select class="inline-edit-input edit-task-session"></select>' +
        '<select class="inline-edit-input edit-task-category"></select>' +
        '<input type="text" class="inline-edit-input edit-task-category-create new-category-input" placeholder="New category name" maxlength="40" hidden>' +
        '<input type="number" class="inline-edit-input edit-task-estimate" value="' + t.estimate + '" min="1" max="20">' +
        '<div class="task-notes-block">' +
          '<div class="task-notes-label">Notes</div>' +
          '<div class="note-rows"></div>' +
          '<button type="button" class="btn btn-sm" data-action="add-note-row">+ Add note</button>' +
        '</div>' +
        '<div class="edit-actions">' +
          '<button class="btn btn-sm" data-action="cancel-task">Cancel</button>' +
          '<button class="btn btn-primary btn-sm" data-action="save-task" data-id="' + t.id + '">Save</button>' +
        '</div>' +
      '</div>';
    return li;
  }

  function buildNoteRowEl(entry){
    var div = document.createElement('div');
    div.className = 'note-row';
    div.dataset.noteId = entry.id;
    div.innerHTML =
      '<input type="number" class="inline-edit-input note-pomodoro" min="1" max="99" value="' + entry.pomodoroNumber + '" title="Pomodoro #">' +
      '<input type="text" class="inline-edit-input note-description" placeholder="What happened this pomodoro?" maxlength="200" value="' + escapeAttr(entry.description) + '">' +
      '<button type="button" class="icon-btn" data-action="remove-note-row" data-note-id="' + entry.id + '" aria-label="Remove note">✕</button>';
    return div;
  }

  function renderNoteRows(containerEl){
    containerEl.innerHTML = '';
    (editingTaskNotesDraft || []).forEach(function(entry){
      containerEl.appendChild(buildNoteRowEl(entry));
    });
  }

  // Reads the current DOM values of every note row back into the in-memory
  // draft, so adding/removing a row (which re-renders) doesn't drop
  // whatever the other rows already had typed into them.
  function syncNotesDraftFromDom(cardEl){
    if(!editingTaskNotesDraft) return;
    cardEl.querySelectorAll('.note-row').forEach(function(rowEl){
      var entry = editingTaskNotesDraft.filter(function(n){ return n.id === rowEl.dataset.noteId; })[0];
      if(!entry) return;
      entry.pomodoroNumber = parseInt(rowEl.querySelector('.note-pomodoro').value, 10) || entry.pomodoroNumber;
      entry.description = rowEl.querySelector('.note-description').value;
    });
  }

  els.taskList.addEventListener('click', function(e){
    var btn = e.target.closest('[data-action]');
    if(!btn) return;
    var action = btn.dataset.action;
    var id = btn.dataset.id;
    if(action === 'toggle-done'){
      toggleTaskDone(id);
    } else if(action === 'activate'){
      if(state.running) return;
      setActiveTask(id);
    } else if(action === 'edit-task'){
      editingTaskId = id;
      editingCategoryTaskId = null;
      var editedTask = findTask(id);
      editingTaskNotesDraft = (editedTask && editedTask.notes && editedTask.notes.length > 0)
        ? editedTask.notes.map(function(n){ return {id: n.id, pomodoroNumber: n.pomodoroNumber, description: n.description}; })
        : [{id: generateId(), pomodoroNumber: 1, description: ''}];
      renderTasks();
    } else if(action === 'cancel-task'){
      editingTaskId = null;
      editingTaskNotesDraft = null;
      renderTasks();
    } else if(action === 'delete-task'){
      deleteTask(id);
    } else if(action === 'save-task'){
      saveEditedTask(id, btn.closest('.task-card-edit'));
    } else if(action === 'edit-category'){
      editingCategoryTaskId = id;
      editingTaskId = null;
      renderTasks();
    } else if(action === 'add-note-row'){
      var addCardEl = btn.closest('.task-card-edit');
      syncNotesDraftFromDom(addCardEl);
      editingTaskNotesDraft.push({id: generateId(), pomodoroNumber: editingTaskNotesDraft.length + 1, description: ''});
      renderTasks();
    } else if(action === 'remove-note-row'){
      var removeCardEl = btn.closest('.task-card-edit');
      syncNotesDraftFromDom(removeCardEl);
      editingTaskNotesDraft = editingTaskNotesDraft.filter(function(n){ return n.id !== btn.dataset.noteId; });
      renderTasks();
    }
  });

  els.taskForm.addEventListener('submit', function(e){
    e.preventDefault();
    var name = els.newTaskName.value.trim();
    if(!name) return;
    var category = els.newTaskCategory.value;
    if(!category || category === NEW_CATEGORY_VALUE) return;
    var estimate = parseInt(els.newTaskEstimate.value, 10) || 1;
    addTask(name, category, estimate);
    els.newTaskName.value = '';
    els.newTaskEstimate.value = 1;
    els.newTaskName.focus();
  });

  // ---------- generic undo (sessions + tasks) ----------
  function showUndo(text){
    els.undoText.textContent = text;
    els.undoToast.hidden = false;
    if(undoTimeout) clearTimeout(undoTimeout);
    undoTimeout = setTimeout(function(){
      els.undoToast.hidden = true;
      lastDeleted = null;
    }, 6000);
  }

  els.undoBtn.addEventListener('click', function(){
    if(!lastDeleted) return;
    if(lastDeleted.type === 'session'){
      var sessions = loadSessions();
      sessions.push(lastDeleted.data);
      saveSessions(sessions);
      refreshStats();
    } else if(lastDeleted.type === 'task'){
      var tasks = loadTasks();
      tasks.push(lastDeleted.data);
      saveTasks(tasks);
      renderTasks();
    }
    lastDeleted = null;
    els.undoToast.hidden = true;
    if(undoTimeout) clearTimeout(undoTimeout);
  });

  // ---------- sessions / stats ----------
  function todayKey(d){
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth()+1).padStart(2,'0');
    var day = String(d.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + day;
  }

  function loadSessions(){
    try{
      var raw = localStorage.getItem(STORAGE_SESSIONS);
      var arr = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(arr)) arr = [];
      var migrated = false;
      arr.forEach(function(s){
        if(!s.id){ s.id = generateId(); migrated = true; }
        if(!s.status){ s.status = 'completed'; migrated = true; }
        if(!s.task){ s.task = s.note || 'Untitled task'; migrated = true; }
        // Older entries predate break tracking — they're all focus sessions.
        if(!s.type){ s.type = 'focus'; migrated = true; }
      });
      if(migrated) saveSessions(arr);
      return arr;
    }catch(e){ return []; }
  }

  function saveSessions(arr){
    try{ localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(arr)); }catch(e){ /* ignore */ }
  }

  function logSession(minutes, status, type){
    var sessions = loadSessions();
    var ts = nowMs();
    sessions.push({
      id: generateId(),
      date: todayKey(new Date(ts)),
      category: state.activeTaskCategory || 'Uncategorized',
      task: state.activeTaskName || 'Untitled task',
      taskId: state.activeTaskId || null,
      minutes: minutes,
      timestamp: ts,
      status: status || 'completed',
      type: type || 'focus'
    });
    saveSessions(sessions);
  }

  function refreshStats(){
    var sessions = loadSessions();
    // The featured tiles, streaks and heatmap are all about focus work —
    // break entries exist for the hour-of-day chart and the daily log, but
    // must not inflate "minutes worked" or "pomodoros completed".
    var focusSessions = sessions.filter(function(s){ return s.type !== 'break'; });
    var today = todayKey();

    var todayMin = 0, todayCount = 0;
    var daysWithSessions = {};
    var allTimeMin = 0, allTimePomodoros = 0;
    focusSessions.forEach(function(s){
      allTimeMin += s.minutes;
      daysWithSessions[s.date] = true;
      if(s.status === 'completed') allTimePomodoros += 1;
      if(s.date === today){
        todayMin += s.minutes;
        if(s.status === 'completed') todayCount += 1;
      }
    });
    els.todayMinutes.textContent = formatDuration(todayMin);
    els.todayPomodoros.textContent = todayCount + (todayCount === 1 ? ' pomodoro' : ' pomodoros');
    els.allTimeTotal.textContent = formatDuration(allTimeMin);
    els.allTimePomodoros.textContent = allTimePomodoros + (allTimePomodoros === 1 ? ' pomodoro' : ' pomodoros');

    // "Today" vs the daily average over every other day that has sessions —
    // gives the featured tile a comparison instead of a bare absolute number.
    var daysLogged = Object.keys(daysWithSessions).length;
    var loggedToday = todayMin > 0 || todayCount > 0;
    var otherDaysLogged = daysLogged - (loggedToday ? 1 : 0);
    if(otherDaysLogged > 0){
      var avgMin = (allTimeMin - todayMin) / otherDaysLogged;
      if(avgMin > 0){
        var diffPct = Math.round(((todayMin - avgMin) / avgMin) * 100);
        els.todayCompare.hidden = false;
        els.todayCompare.className = 'tile-compare ' + (diffPct >= 0 ? 'tile-compare-up' : 'tile-compare-down');
        els.todayCompare.textContent = (diffPct >= 0 ? '▲ ' : '▼ ') + Math.abs(diffPct) + '% vs daily average';
      } else {
        els.todayCompare.hidden = true;
      }
    } else {
      els.todayCompare.hidden = true;
    }

    // current streak: consecutive days ending today (or yesterday if nothing logged today yet)
    var streak = 0;
    var cursor = new Date();
    if(!daysWithSessions[todayKey(cursor)]){
      cursor.setDate(cursor.getDate() - 1);
    }
    while(daysWithSessions[todayKey(cursor)]){
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    var best = Math.max(streak, longestStreak(daysWithSessions));
    els.streakDays.textContent = String(streak);
    els.bestStreak.textContent = 'Best ' + best + (best === 1 ? ' day' : ' days');

    renderLogForDate(sessions);
    renderInsights(sessions);
    renderYearHeatmap(focusSessions);
  }

  // ---------- yearly pomodoro heatmap (Jan 1 - Dec 31, current year) ----------
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Fixed thresholds so the color scale stays comparable across the year,
  // rather than rescaling to whatever the busiest day happened to be.
  function heatColorClass(count){
    if(count <= 0) return 'heat-0';
    if(count <= 2) return 'heat-1';
    if(count <= 4) return 'heat-2';
    if(count <= 6) return 'heat-3';
    return 'heat-4';
  }

  function renderYearHeatmap(sessions){
    var year = heatmapViewYear;
    var counts = {}; // dateKey -> completed pomodoro count
    var yearTotal = 0;
    sessions.forEach(function(s){
      if(s.status === 'completed'){
        counts[s.date] = (counts[s.date] || 0) + 1;
        if(s.date.slice(0, 4) === String(year)) yearTotal += 1;
      }
    });

    var jan1 = new Date(year, 0, 1);
    var dec31 = new Date(year, 11, 31);
    var gridStart = new Date(jan1);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // back up to the Sunday on/before Jan 1

    var totalDays = Math.round((dec31 - gridStart) / 86400000) + 1;
    var totalWeeks = Math.ceil(totalDays / 7);

    els.heatmapYear.textContent = String(year);
    els.heatmapYearTotal.textContent = yearTotal + (yearTotal === 1 ? ' pomodoro in ' : ' pomodoros in ') + year + '.';
    els.heatmapNextYearBtn.disabled = year >= new Date().getFullYear();
    els.heatmapMonths.innerHTML = '';
    els.heatmapGrid.innerHTML = '';

    var lastMonthLabeled = -1;
    var cursor = new Date(gridStart);
    for(var i = 0; i < totalWeeks * 7; i++){
      var col = Math.floor(i / 7) + 1;
      var row = (i % 7) + 1;
      var inYear = cursor.getFullYear() === year;

      if(inYear && cursor.getDate() === 1 && cursor.getMonth() !== lastMonthLabeled){
        lastMonthLabeled = cursor.getMonth();
        var label = document.createElement('div');
        label.className = 'heatmap-month-label';
        label.style.gridColumn = String(col);
        label.textContent = MONTH_NAMES[cursor.getMonth()];
        els.heatmapMonths.appendChild(label);
      }

      var cell = document.createElement('div');
      cell.style.gridColumn = String(col);
      cell.style.gridRow = String(row);
      if(inYear){
        var key = todayKey(cursor);
        var count = counts[key] || 0;
        cell.className = 'heat-cell ' + heatColorClass(count);
        var dateLabel = cursor.getDate() + ' ' + MONTH_NAMES[cursor.getMonth()] + ' ' + year;
        cell.title = dateLabel + ' — ' + count + (count === 1 ? ' pomodoro' : ' pomodoros');
      } else {
        cell.className = 'heat-cell heat-empty';
      }
      els.heatmapGrid.appendChild(cell);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  function longestStreak(daysWithSessions){
    var dates = Object.keys(daysWithSessions).sort();
    var longest = 0, current = 0, prevDate = null;
    dates.forEach(function(ds){
      var d = new Date(ds + 'T00:00:00');
      if(prevDate){
        var diffDays = Math.round((d - prevDate) / 86400000);
        current = diffDays === 1 ? current + 1 : 1;
      } else {
        current = 1;
      }
      longest = Math.max(longest, current);
      prevDate = d;
    });
    return longest;
  }

  function formatDuration(totalMinutes){
    if(totalMinutes < 60) return totalMinutes + 'm';
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    return h + 'h' + (m > 0 ? ' ' + m + 'm' : '');
  }

  // ---------- custom calendar date picker ----------
  // Small Google-Calendar-style month popover, used in place of the native
  // <input type="date"> (which renders inconsistently across browsers/OSes
  // and can't be styled to match the rest of the app).
  function createDatePicker(rootEl, opts){
    opts = opts || {};
    var value = opts.value || ''; // 'YYYY-MM-DD', '' = no selection
    var min = opts.min || '';
    var max = opts.max || '';
    var onChange = opts.onChange || function(){};

    rootEl.innerHTML =
      '<button type="button" class="date-picker-trigger" aria-haspopup="dialog" aria-expanded="false">' +
        '<span class="date-picker-trigger-text"></span>' +
        '<span class="date-picker-trigger-icon" aria-hidden="true">📅</span>' +
      '</button>' +
      '<div class="date-picker-panel" hidden role="dialog" aria-label="' + escapeAttr(opts.ariaLabel || 'Choose date') + '">' +
        '<div class="date-picker-header">' +
          '<button type="button" class="icon-btn date-picker-prev" aria-label="Previous month">‹</button>' +
          '<span class="date-picker-month-label"></span>' +
          '<button type="button" class="icon-btn date-picker-next" aria-label="Next month">›</button>' +
        '</div>' +
        '<div class="date-picker-weekdays">' +
          ['Mo','Tu','We','Th','Fr','Sa','Su'].map(function(w){ return '<span>' + w + '</span>'; }).join('') +
        '</div>' +
        '<div class="date-picker-grid"></div>' +
        '<button type="button" class="btn-link date-picker-today">Today</button>' +
      '</div>';

    var trigger = rootEl.querySelector('.date-picker-trigger');
    var triggerText = rootEl.querySelector('.date-picker-trigger-text');
    var panel = rootEl.querySelector('.date-picker-panel');
    var monthLabel = rootEl.querySelector('.date-picker-month-label');
    var grid = rootEl.querySelector('.date-picker-grid');
    var prevBtn = rootEl.querySelector('.date-picker-prev');
    var nextBtn = rootEl.querySelector('.date-picker-next');
    var todayBtn = rootEl.querySelector('.date-picker-today');
    var viewYear, viewMonth; // 0-indexed month currently shown in the panel

    function pad2(n){ return n < 10 ? '0' + n : String(n); }
    function keyFor(y, m, day){ return y + '-' + pad2(m + 1) + '-' + pad2(day); }

    function fmtDisplay(v){
      if(!v) return opts.placeholder || 'Select date';
      var d = new Date(v + 'T00:00:00');
      return MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function setTriggerText(){ triggerText.textContent = fmtDisplay(value); }

    function renderGrid(){
      monthLabel.textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;
      var firstIdx = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
      var daysThisMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var daysPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
      var totalCells = Math.ceil((firstIdx + daysThisMonth) / 7) * 7;
      var todayStr = todayKey();
      var html = '';
      for(var i = 0; i < totalCells; i++){
        var dayNum, cellYear = viewYear, cellMonth = viewMonth, outside = false;
        if(i < firstIdx){
          dayNum = daysPrevMonth - firstIdx + 1 + i;
          cellMonth = viewMonth - 1;
          outside = true;
        } else if(i >= firstIdx + daysThisMonth){
          dayNum = i - firstIdx - daysThisMonth + 1;
          cellMonth = viewMonth + 1;
          outside = true;
        } else {
          dayNum = i - firstIdx + 1;
        }
        if(cellMonth < 0){ cellMonth = 11; cellYear -= 1; }
        if(cellMonth > 11){ cellMonth = 0; cellYear += 1; }
        var dateStr = keyFor(cellYear, cellMonth, dayNum);
        var disabled = (min && dateStr < min) || (max && dateStr > max);
        var classes = 'date-picker-day';
        if(outside) classes += ' date-picker-day-outside';
        if(dateStr === value) classes += ' date-picker-day-selected';
        if(dateStr === todayStr) classes += ' date-picker-day-today';
        html += '<button type="button" class="' + classes + '" data-date="' + dateStr + '"' + (disabled ? ' disabled' : '') + '>' + dayNum + '</button>';
      }
      grid.innerHTML = html;
    }

    var hostCard = rootEl.closest('.card');

    function openPanel(){
      if(openDatePicker && openDatePicker !== api) openDatePicker.close();
      var base = value || max || todayKey();
      var d = new Date(base + 'T00:00:00');
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
      renderGrid();
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      // Lift this popover's card above its siblings — see .card-picker-active.
      if(hostCard) hostCard.classList.add('card-picker-active');
      openDatePicker = api;
    }

    function closePanel(){
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if(hostCard) hostCard.classList.remove('card-picker-active');
      if(openDatePicker === api) openDatePicker = null;
    }

    function pick(dateStr){
      value = dateStr;
      setTriggerText();
      closePanel();
      onChange(value);
    }

    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      if(panel.hidden) openPanel(); else closePanel();
    });
    panel.addEventListener('click', function(e){ e.stopPropagation(); });
    grid.addEventListener('click', function(e){
      var btn = e.target.closest('.date-picker-day');
      if(!btn || btn.disabled) return;
      pick(btn.dataset.date);
    });
    prevBtn.addEventListener('click', function(){
      viewMonth -= 1;
      if(viewMonth < 0){ viewMonth = 11; viewYear -= 1; }
      renderGrid();
    });
    nextBtn.addEventListener('click', function(){
      viewMonth += 1;
      if(viewMonth > 11){ viewMonth = 0; viewYear += 1; }
      renderGrid();
    });
    todayBtn.addEventListener('click', function(){
      var t = todayKey();
      if(max && t > max) t = max;
      if(min && t < min) t = min;
      pick(t);
    });

    var api = {
      getValue: function(){ return value; },
      setValue: function(v){ value = v || ''; setTriggerText(); if(!panel.hidden) renderGrid(); },
      setMax: function(v){ max = v || ''; },
      setMin: function(v){ min = v || ''; },
      close: closePanel
    };

    setTriggerText();
    return api;
  }

  // Closes whichever date picker popover is open on any click/Escape that
  // isn't handled by the picker itself (its own listeners stopPropagation).
  document.addEventListener('click', function(){
    if(openDatePicker) openDatePicker.close();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && openDatePicker) openDatePicker.close();
  });

  // ---------- today's log (browsable by date, editable, deletable) ----------
  function shiftLogView(deltaDays){
    var d = new Date(logViewDate + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    var next = todayKey(d);
    if(next > todayKey()) return; // no browsing into the future
    logViewDate = next;
    editingLogId = null;
    refreshStats();
  }

  function jumpLogToToday(){
    logViewDate = todayKey();
    editingLogId = null;
    refreshStats();
  }

  function formatDateLabel(dateKey){
    var d = new Date(dateKey + 'T00:00:00');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  function renderLogForDate(sessions){
    var isToday = logViewDate === todayKey();
    els.logTitle.textContent = isToday ? "Today's log" : formatDateLabel(logViewDate);
    els.logNextBtn.disabled = isToday;
    logDatePicker.setMax(todayKey());
    logDatePicker.setValue(logViewDate);

    var entries = sessions.filter(function(s){ return s.date === logViewDate; });
    entries.sort(function(a,b){ return (b.timestamp||0) - (a.timestamp||0); });

    els.logList.innerHTML = '';
    if(entries.length === 0){
      var empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = isToday ? 'No sessions logged yet today.' : 'No sessions logged this day.';
      els.logList.appendChild(empty);
      els.logCountNote.hidden = true;
      return;
    }
    // Past a handful of entries the compact list starts scrolling — surface
    // the total + an expand hint instead of leaving it to look truncated.
    var LOG_COMPACT_THRESHOLD = 5;
    if(entries.length > LOG_COMPACT_THRESHOLD){
      els.logCountNote.hidden = false;
      els.logCountNote.textContent = entries.length + ' sessions logged' + (logExpanded ? '' : ' — expand (⤢) to see them all at once');
    } else {
      els.logCountNote.hidden = true;
    }
    var categories = loadCategories();
    entries.forEach(function(s){
      if(s.id === editingLogId){
        var editLi = buildEditRow(s);
        els.logList.appendChild(editLi);
        var catSelect = editLi.querySelector('.edit-category');
        var catCreate = editLi.querySelector('.edit-category-create');
        fillCategorySelectWithNew(catSelect, categories, s.category);
        wireCategoryPicker(catSelect, catCreate, s.category, function(){ /* Save button reads the value directly */ });
      } else {
        els.logList.appendChild(buildLogRow(s));
      }
    });
  }

  function buildLogRow(s){
    var li = document.createElement('li');
    li.className = 'log-row';
    var time = s.timestamp ? new Date(s.timestamp) : null;
    var timeStr = time ? String(time.getHours()).padStart(2,'0') + ':' + String(time.getMinutes()).padStart(2,'0') : '—';
    var taskStr = s.task ? s.task : '—';
    var statusTag = s.status === 'skipped' ? ' <span class="log-status-tag">· cut short</span>' : '';
    var typeTag = s.type === 'break' ? ' <span class="log-status-tag">· break</span>' : '';
    li.innerHTML =
      '<span class="log-time">' + timeStr + '</span>' +
      '<span class="log-detail">' +
        '<span class="log-category">' +
          '<span class="cat-pill ' + categoryColorClass(s.category) + '">' + escapeHtml(s.category) + '</span>' + statusTag + typeTag +
        '</span>' +
        '<span class="log-note" title="' + escapeAttr(taskStr) + '">' + escapeHtml(taskStr) + '</span>' +
      '</span>' +
      '<span class="log-minutes">' + s.minutes + 'm</span>' +
      '<span class="log-actions">' +
        '<button class="icon-btn" data-action="edit" data-id="' + s.id + '" aria-label="Edit entry" title="Edit">✎</button>' +
        '<button class="icon-btn" data-action="delete" data-id="' + s.id + '" aria-label="Delete entry" title="Delete">✕</button>' +
      '</span>';
    return li;
  }

  function buildEditRow(s){
    var li = document.createElement('li');
    li.className = 'log-row log-row-edit';
    li.innerHTML =
      '<div class="log-edit-grid">' +
        '<input type="text" class="inline-edit-input edit-note" value="' + escapeAttr(s.task || '') + '" placeholder="Task" maxlength="140">' +
        '<select class="inline-edit-input edit-category"></select>' +
        '<input type="text" class="inline-edit-input edit-category-create new-category-input" placeholder="New category name" maxlength="40" hidden>' +
        '<input type="number" class="inline-edit-input edit-minutes" value="' + s.minutes + '" min="1" max="300">' +
        '<div class="edit-actions">' +
          '<button class="btn btn-sm" data-action="cancel">Cancel</button>' +
          '<button class="btn btn-primary btn-sm" data-action="save" data-id="' + s.id + '">Save</button>' +
        '</div>' +
      '</div>';
    return li;
  }

  els.logList.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-action]');
    if(!btn) return;
    var action = btn.dataset.action;
    if(action === 'edit'){
      editingLogId = btn.dataset.id;
      refreshStats();
    } else if(action === 'cancel'){
      editingLogId = null;
      refreshStats();
    } else if(action === 'delete'){
      deleteSession(btn.dataset.id);
    } else if(action === 'save'){
      var row = btn.closest('.log-row-edit');
      saveEditedSession(btn.dataset.id, row);
    }
  });

  function deleteSession(id){
    var sessions = loadSessions();
    var idx = sessions.findIndex(function(s){ return s.id === id; });
    if(idx === -1) return;
    lastDeleted = {type:'session', data: sessions[idx]};
    sessions.splice(idx, 1);
    saveSessions(sessions);
    if(editingLogId === id) editingLogId = null;
    refreshStats();
    showUndo('Entry deleted.');
  }

  function saveEditedSession(id, rowEl){
    var sessions = loadSessions();
    var s = sessions.filter(function(x){ return x.id === id; })[0];
    if(!s) return;
    var noteInput = rowEl.querySelector('.edit-note');
    var catInput = rowEl.querySelector('.edit-category');
    var minInput = rowEl.querySelector('.edit-minutes');
    s.task = noteInput.value.trim() || s.task;
    s.category = catInput.value.trim() || s.category;
    s.minutes = Math.max(1, Math.min(300, parseInt(minInput.value, 10) || s.minutes));
    saveSessions(sessions);
    editingLogId = null;
    refreshStats();
  }

  function roundRectTop(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  // Runs onFrame(progress) from 0 to 1 over durationMs via requestAnimationFrame
  // (skips straight to onFrame(1) under prefers-reduced-motion or a 0 duration).
  // Used to draw canvas charts in with a brief "growing in" motion rather than
  // popping in fully-drawn on every re-render.
  function animateProgress(durationMs, onFrame, onDone){
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduceMotion || durationMs <= 0){
      onFrame(1);
      if(onDone) onDone();
      return;
    }
    var start = null;
    function step(ts){
      if(start === null) start = ts;
      var p = Math.min(1, (ts - start) / durationMs);
      onFrame(p);
      if(p < 1){ requestAnimationFrame(step); }
      else if(onDone){ onDone(); }
    }
    requestAnimationFrame(step);
  }

  // Stacked bar chart of minutes by hour-of-day (0-23) for the selected range:
  // focus minutes stacked with break minutes in the same bar, so it's obvious
  // both when in the day attention actually happens AND whether rest is
  // actually being taken in proportion to it — a different question than the
  // heatmap (which day) or the category pie (what). With the "Day" range this
  // also doubles as a rough within-hour timeline: a 3:00-3:25 pomodoro
  // followed by a 3:25-3:30 break both land in the "03" bar, so the sliver of
  // break color on top of it shows the split at a glance.
  var hourAnimToken = 0;
  // Geometry + per-hour totals from the most recent render, read by the
  // hover tooltip so it doesn't have to redo the bucketing on every
  // mousemove. Null whenever there's nothing drawn to hover over.
  var hourChartGeom = null;

  function renderHourChart(sessions){
    var canvas = els.hourChart;
    var focusBuckets = new Array(24).fill(0);
    var breakBuckets = new Array(24).fill(0);
    sessions.forEach(function(s){
      if(!s.timestamp) return;
      var h = new Date(s.timestamp).getHours();
      if(s.type === 'break') breakBuckets[h] += s.minutes;
      else focusBuckets[h] += s.minutes;
    });
    var totals = focusBuckets.map(function(f, i){ return f + breakBuckets[i]; });
    var max = Math.max.apply(null, totals);

    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || 320;
    var cssH = 140;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    hourAnimToken++;
    var myToken = hourAnimToken;

    if(max <= 0){
      els.peakHourNote.textContent = 'Not enough data yet to spot a pattern.';
      hourChartGeom = null;
      hideHourChartTooltip();
      return;
    }

    var lineColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim();
    var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    var breakColor = getComputedStyle(document.documentElement).getPropertyValue('--good').trim();
    var inkSoft = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim();

    var padBottom = 16, padTop = 4;
    var chartH = cssH - padBottom - padTop;
    var n = 24;
    var gap = 2;
    var barW = (cssW - gap * (n + 1)) / n;

    var maxIdx = 0;
    for(var i = 1; i < 24; i++){ if(focusBuckets[i] > focusBuckets[maxIdx]) maxIdx = i; }

    hourChartGeom = {
      focusBuckets: focusBuckets,
      breakBuckets: breakBuckets,
      cssW: cssW,
      padBottom: padBottom,
      gap: gap,
      barW: barW,
      n: n
    };

    function draw(progress){
      ctx.clearRect(0, 0, cssW, cssH);

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cssH - padBottom + 0.5);
      ctx.lineTo(cssW, cssH - padBottom + 0.5);
      ctx.stroke();

      var r = Math.min(3, barW / 2);
      for(var j = 0; j < n; j++){
        var x = gap + j * (barW + gap);
        var hasData = totals[j] > 0;
        var isPeak = j === maxIdx;
        var alpha = isPeak ? 1 : (hasData ? 0.5 : 0.12);

        var focusH = (focusBuckets[j] / max) * chartH * progress;
        var breakH = (breakBuckets[j] / max) * chartH * progress;
        var focusTopY = cssH - padBottom - focusH;
        var stackTopY = focusTopY - breakH;

        ctx.globalAlpha = alpha;
        if(focusBuckets[j] > 0 || !hasData){
          // Flat top when a break segment sits above it, rounded when it's alone.
          ctx.fillStyle = accent;
          var focusRadius = breakBuckets[j] > 0 ? 0 : r;
          roundRectTop(ctx, x, focusTopY, barW, Math.max(focusH, 2), focusRadius);
          ctx.fill();
        }
        if(breakBuckets[j] > 0){
          ctx.fillStyle = breakColor;
          roundRectTop(ctx, x, stackTopY, barW, Math.max(breakH, 2), r);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        if(j % 4 === 0){
          ctx.fillStyle = inkSoft;
          ctx.font = '9px "Work Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(j).padStart(2, '0'), x + barW / 2, cssH - 4);
        }
      }
    }

    animateProgress(450, function(p){
      if(myToken !== hourAnimToken) return; // a newer render superseded this one
      draw(p);
    });

    function fmt(h){ return String(h).padStart(2, '0') + ':00'; }
    var breakTotal = breakBuckets.reduce(function(a, b){ return a + b; }, 0);
    els.peakHourNote.textContent = 'Peak focus hours: ' + fmt(maxIdx) + '–' + fmt((maxIdx + 1) % 24) +
      '. Rest logged: ' + breakTotal + ' min in this period.';
  }

  function hideHourChartTooltip(){
    if(els.hourChartTooltip) els.hourChartTooltip.hidden = true;
  }

  // Hovering a bar shows exactly how many focus/break minutes it holds —
  // the bar height alone only gives a rough sense of that.
  function handleHourChartHover(evt){
    if(!hourChartGeom){ hideHourChartTooltip(); return; }
    var g = hourChartGeom;
    var x = evt.offsetX;
    var idx = Math.floor((x - g.gap) / (g.barW + g.gap));
    if(idx < 0 || idx >= g.n){ hideHourChartTooltip(); return; }

    var focusMin = g.focusBuckets[idx];
    var breakMin = g.breakBuckets[idx];
    if(focusMin <= 0 && breakMin <= 0){ hideHourChartTooltip(); return; }

    function fmtH(h){ return String(h).padStart(2, '0') + ':00'; }
    var tip = els.hourChartTooltip;
    tip.innerHTML =
      '<strong>' + fmtH(idx) + '–' + fmtH((idx + 1) % 24) + '</strong><br>' +
      '<span class="tt-focus">Focus: ' + focusMin + ' min</span><br>' +
      '<span class="tt-break">Break: ' + breakMin + ' min</span>';
    tip.style.left = (g.gap + idx * (g.barW + g.gap) + g.barW / 2) + 'px';
    tip.hidden = false;
  }

  var hourChartHoverWired = false;
  function wireHourChartHover(){
    if(hourChartHoverWired || !els.hourChart) return;
    hourChartHoverWired = true;
    els.hourChart.addEventListener('mousemove', handleHourChartHover);
    els.hourChart.addEventListener('mouseleave', hideHourChartTooltip);
  }

  // Filters sessions down to the period the "By category" chart's tabs ask
  // for. 'day' = today, 'month' = this calendar month, 'year' = this calendar
  // year, 'all' = everything ever logged.
  function sessionsInRange(sessions, range){
    if(range === 'day'){
      var todayD = todayKey();
      return sessions.filter(function(s){ return s.date === todayD; });
    }
    if(range === 'month'){
      var ym = todayKey().slice(0, 7);
      return sessions.filter(function(s){ return s.date.slice(0, 7) === ym; });
    }
    if(range === 'year'){
      var y = todayKey().slice(0, 4);
      return sessions.filter(function(s){ return s.date.slice(0, 4) === y; });
    }
    if(range === 'custom'){
      // An empty bound is unset, so treat it as open-ended on that side
      // rather than excluding everything.
      var from = customRangeFrom || '0000-00-00';
      var to = customRangeTo || '9999-99-99';
      return sessions.filter(function(s){ return s.date >= from && s.date <= to; });
    }
    return sessions;
  }

  // Both charts read the same range-filtered slice, so "By category" and
  // "By hour of day" always agree on what period they're describing.
  function renderInsights(sessions){
    var filtered = sessionsInRange(sessions, categoryRange);
    // Category breakdown is about focus work only; the hour-of-day chart
    // wants both focus and break minutes to show the split.
    renderCategoryPie(filtered.filter(function(s){ return s.type !== 'break'; }));
    renderHourChart(filtered);
  }

  // Donut chart of focus minutes by category for the selected range, so it's
  // obvious at a glance where attention has actually gone. Wedge colors reuse
  // the same category hash as the chip color everywhere else in the app.
  var pieAnimToken = 0;

  function renderCategoryPie(sessions){
    var canvas = els.categoryPieChart;
    var listEl = els.categoryAllList;

    var byCat = {};
    var total = 0;
    sessions.forEach(function(s){
      byCat[s.category] = (byCat[s.category] || 0) + s.minutes;
      total += s.minutes;
    });
    var rows = Object.keys(byCat).map(function(k){ return {name:k, minutes:byCat[k]}; });
    rows.sort(function(a,b){ return b.minutes - a.minutes; });

    var dpr = window.devicePixelRatio || 1;
    var cssSize = canvas.clientWidth || 150;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssSize, cssSize);

    listEl.innerHTML = '';

    var lineColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim();
    var cx = cssSize / 2, cy = cssSize / 2;
    var rOuter = cssSize / 2 - 4;

    pieAnimToken++;
    var myToken = pieAnimToken;

    if(rows.length === 0 || total <= 0){
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
      ctx.stroke();
      var empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = 'No focus sessions logged yet.';
      listEl.appendChild(empty);
      return;
    }

    var rInner = rOuter * 0.55;
    var paperRaised = getComputedStyle(document.documentElement).getPropertyValue('--paper-raised').trim();
    var ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    var inkSoft = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim();
    var wedgeColors = rows.map(function(r){
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--catclr-' + categoryColorIndex(r.name) + '-fg').trim();
    });

    // Sweeps the whole donut clockwise from 12 o'clock as progress goes
    // 0 -> 1, instead of popping in fully drawn on every render.
    function draw(progress){
      ctx.clearRect(0, 0, cssSize, cssSize);
      var start = -Math.PI / 2;
      var sweepTotal = progress * Math.PI * 2;
      var covered = 0;
      rows.forEach(function(r, i){
        var fullSweep = (r.minutes / total) * Math.PI * 2;
        var wedgeSweep = Math.min(fullSweep, Math.max(0, sweepTotal - covered));
        if(wedgeSweep > 0){
          var end = start + wedgeSweep;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, rOuter, start, end);
          ctx.closePath();
          ctx.fillStyle = wedgeColors[i];
          ctx.fill();
          start = end;
        }
        covered += fullSweep;
      });

      // punch the donut hole
      ctx.fillStyle = paperRaised;
      ctx.beginPath();
      ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.fillStyle = ink;
      ctx.font = '600 15px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(formatDuration(total), cx, cy - 2);
      ctx.fillStyle = inkSoft;
      ctx.font = '500 9px "Work Sans", sans-serif';
      ctx.fillText('total', cx, cy + 13);
    }

    animateProgress(450, function(p){
      if(myToken !== pieAnimToken) return; // a newer render superseded this one
      draw(p);
    });

    rows.forEach(function(r){
      var pct = Math.round((r.minutes / total) * 100);
      var li = document.createElement('li');
      li.className = 'cat-row cat-row-legend';
      li.innerHTML =
        '<span class="cat-name"><span class="cat-pill ' + categoryColorClass(r.name) + '">' + escapeHtml(r.name) + '</span></span>' +
        '<span class="cat-pct">' + pct + '%</span>' +
        '<span class="cat-minutes">' + formatDuration(r.minutes) + '</span>';
      listEl.appendChild(li);
    });
  }

  function escapeHtml(str){
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str){
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ---------- backup: export / import ----------
  function buildBackupData(){
    return {
      app: 'pomodoro-bench',
      version: 4,
      exportedAt: nowMs(),
      sessions: loadSessions(),
      tasks: loadTasks(),
      categories: loadCategories()
    };
  }

  // Merges an incoming backup object (from a file import or a remote sync
  // pull) into local storage, additively by id — never deletes anything
  // locally. Returns how much was newly added, or throws on an unrecognized
  // shape. Shared by the file-import handler and js/sync.js.
  function applyIncomingBackup(data){
    var incomingSessions = Array.isArray(data) ? data : (data && Array.isArray(data.sessions) ? data.sessions : []);
    var incomingTasks = (data && Array.isArray(data.tasks)) ? data.tasks : [];
    if(incomingSessions.length === 0 && incomingTasks.length === 0) throw new Error('invalid backup format');

    var currentSessions = loadSessions();
    var sessionIds = {};
    currentSessions.forEach(function(s){ sessionIds[s.id] = true; });
    var addedSessions = 0;
    incomingSessions.forEach(function(s){
      if(!s || typeof s.minutes !== 'number' || !s.date) return;
      var id = s.id || generateId();
      if(sessionIds[id]) return;
      currentSessions.push({
        id: id,
        date: s.date,
        category: s.category || 'Uncategorized',
        task: s.task || s.note || 'Untitled task',
        taskId: s.taskId || null,
        minutes: s.minutes,
        timestamp: s.timestamp || nowMs(),
        status: s.status === 'skipped' ? 'skipped' : 'completed',
        type: s.type === 'break' ? 'break' : 'focus'
      });
      sessionIds[id] = true;
      addedSessions += 1;
    });
    saveSessions(currentSessions);

    var currentTasks = loadTasks();
    var taskIds = {};
    currentTasks.forEach(function(t){ taskIds[t.id] = true; });
    var addedTasks = 0;
    incomingTasks.forEach(function(t){
      if(!t || !t.name) return;
      var id = t.id || generateId();
      if(taskIds[id]) return;
      currentTasks.push({
        id: id,
        name: t.name,
        category: t.category || 'Uncategorized',
        estimate: typeof t.estimate === 'number' ? t.estimate : 1,
        completed: typeof t.completed === 'number' ? t.completed : 0,
        done: !!t.done,
        doneAt: typeof t.doneAt === 'number' ? t.doneAt : (t.done ? 0 : null),
        createdAt: t.createdAt || nowMs(),
        sessionPresetId: t.sessionPresetId || 'deep',
        workMin: typeof t.workMin === 'number' ? t.workMin : 50,
        breakMin: typeof t.breakMin === 'number' ? t.breakMin : 10,
        notes: Array.isArray(t.notes) ? t.notes : []
      });
      taskIds[id] = true;
      addedTasks += 1;
    });
    saveTasks(currentTasks);

    var incomingCategories = (data && Array.isArray(data.categories)) ? data.categories : [];
    var currentCategories = loadCategories();
    var addedCategories = 0;
    incomingCategories.forEach(function(name){
      if(typeof name !== 'string' || !name.trim()) return;
      var exists = currentCategories.some(function(c){ return c.toLowerCase() === name.toLowerCase(); });
      if(!exists){ currentCategories.push(name.trim()); addedCategories += 1; }
    });
    saveCategories(currentCategories);
    fillCategorySelectWithNew(els.newTaskCategory, currentCategories, els.newTaskCategory.value);
    updateCategoryFormAvailability();

    renderTasks();
    refreshStats();

    return {addedSessions: addedSessions, addedTasks: addedTasks, addedCategories: addedCategories};
  }

  // ---------- reset statistics (two-step confirm, no native dialogs) ----------
  var resetArmed = false;
  var resetArmTimeout = null;
  els.resetStatsBtn.addEventListener('click', function(){
    if(!resetArmed){
      resetArmed = true;
      els.resetStatsBtn.textContent = 'Click again to confirm';
      resetArmTimeout = setTimeout(function(){
        resetArmed = false;
        els.resetStatsBtn.textContent = 'Reset statistics';
      }, 3500);
    } else {
      clearTimeout(resetArmTimeout);
      resetArmed = false;
      els.resetStatsBtn.textContent = 'Reset statistics';
      saveSessions([]);
      logViewDate = todayKey();
      editingLogId = null;
      refreshStats();
    }
  });

  // ---------- log navigation ----------
  els.logPrevBtn.addEventListener('click', function(){ shiftLogView(-1); });
  els.logNextBtn.addEventListener('click', function(){ shiftLogView(1); });
  els.logTodayBtn.addEventListener('click', jumpLogToToday);
  var logDatePicker = createDatePicker(els.logDatePicker, {
    value: logViewDate,
    max: todayKey(),
    ariaLabel: 'Jump to date',
    onChange: function(v){
      logViewDate = v;
      editingLogId = null;
      refreshStats();
    }
  });

  // ---------- wire up controls ----------
  els.startPauseBtn.addEventListener('click', startPause);
  els.resetBtn.addEventListener('click', resetTimer);
  els.skipBtn.addEventListener('click', skipPhase);

  els.workInput.addEventListener('change', function(){
    var v = Math.max(1, Math.min(180, parseInt(els.workInput.value,10) || 25));
    els.workInput.value = v;
    state.workMin = v;
    if(!state.running && state.mode === 'focus'){ resetPhase(); }
    saveTimerState();
  });
  els.breakInput.addEventListener('change', function(){
    var v = Math.max(1, Math.min(60, parseInt(els.breakInput.value,10) || 5));
    els.breakInput.value = v;
    state.breakMin = v;
    if(!state.running && state.mode !== 'focus'){ resetPhase(); }
    saveTimerState();
  });

  window.addEventListener('resize', function(){ refreshStats(); });

  // ---------- view tabs (Timer / Statistics) ----------
  var STORAGE_VIEW = 'pomodoroBench.activeView.v1';

  function setActiveView(view){
    var isStats = view === 'stats';
    els.viewTimer.hidden = isStats;
    els.viewStats.hidden = !isStats;
    els.tabTimerBtn.setAttribute('aria-selected', String(!isStats));
    els.tabStatsBtn.setAttribute('aria-selected', String(isStats));
    try{ localStorage.setItem(STORAGE_VIEW, view); }catch(e){}
    if(isStats){ refreshStats(); }
  }

  els.tabTimerBtn.addEventListener('click', function(){ setActiveView('timer'); });
  els.tabStatsBtn.addEventListener('click', function(){ setActiveView('stats'); });

  // ---------- Insights time-range tabs (Day / Month / Year / All time) ----------
  // Drives both "By category" and "By hour of day" together so the page
  // never shows two charts implicitly describing two different periods.
  function setCategoryRange(range){
    categoryRange = range;
    var buttons = els.categoryRangeTabs.querySelectorAll('.range-tab-btn');
    for(var i=0;i<buttons.length;i++){
      buttons[i].setAttribute('aria-selected', String(buttons[i].dataset.range === range));
    }
    els.customRangePicker.hidden = range !== 'custom';
    try{ localStorage.setItem(STORAGE_CATEGORY_RANGE, range); }catch(e){}
    renderInsights(loadSessions());
  }

  els.categoryRangeTabs.addEventListener('click', function(e){
    var btn = e.target.closest('.range-tab-btn');
    if(!btn) return;
    setCategoryRange(btn.dataset.range);
  });

  // ---------- Insights custom date range (From / To) ----------
  function saveCustomRange(){
    try{
      localStorage.setItem(STORAGE_CUSTOM_RANGE, JSON.stringify({from: customRangeFrom, to: customRangeTo}));
    }catch(e){}
  }

  var customRangeFromPicker = createDatePicker(els.customRangeFromPicker, {
    value: customRangeFrom,
    max: todayKey(),
    ariaLabel: 'Custom range start',
    placeholder: 'Start date',
    onChange: function(v){
      customRangeFrom = v;
      // Keep the range sane: "To" can't be before the new "From".
      if(customRangeTo && customRangeTo < customRangeFrom){
        customRangeTo = customRangeFrom;
        customRangeToPicker.setValue(customRangeTo);
      }
      saveCustomRange();
      renderInsights(loadSessions());
    }
  });

  var customRangeToPicker = createDatePicker(els.customRangeToPicker, {
    value: customRangeTo,
    max: todayKey(),
    ariaLabel: 'Custom range end',
    placeholder: 'End date',
    onChange: function(v){
      customRangeTo = v;
      if(customRangeFrom && customRangeTo < customRangeFrom){
        customRangeFrom = customRangeTo;
        customRangeFromPicker.setValue(customRangeFrom);
      }
      saveCustomRange();
      renderInsights(loadSessions());
    }
  });

  // ---------- heatmap year navigation ----------
  els.heatmapPrevYearBtn.addEventListener('click', function(){
    heatmapViewYear -= 1;
    renderYearHeatmap(loadSessions());
  });
  els.heatmapNextYearBtn.addEventListener('click', function(){
    if(heatmapViewYear >= new Date().getFullYear()) return;
    heatmapViewYear += 1;
    renderYearHeatmap(loadSessions());
  });

  // ---------- Today's log expand/collapse ----------
  function setLogExpanded(v){
    logExpanded = v;
    els.logList.classList.toggle('log-list-expanded', v);
    els.logExpandBtn.setAttribute('aria-pressed', String(v));
    els.logExpandBtn.textContent = v ? '⤡' : '⤢';
    els.logExpandBtn.title = v ? 'Collapse log' : 'Expand log';
    els.logExpandBtn.setAttribute('aria-label', els.logExpandBtn.title);
    try{ localStorage.setItem(STORAGE_LOG_EXPANDED, v ? '1' : '0'); }catch(e){}
    renderLogForDate(loadSessions());
  }

  els.logExpandBtn.addEventListener('click', function(){ setLogExpanded(!logExpanded); });

  // ---------- backup menu (top-right dropdown) ----------
  function setBackupMenuOpen(open){
    els.backupMenuPanel.hidden = !open;
    els.backupMenuBtn.setAttribute('aria-expanded', String(open));
  }

  els.backupMenuBtn.addEventListener('click', function(e){
    e.stopPropagation();
    setBackupMenuOpen(els.backupMenuPanel.hidden);
  });
  document.addEventListener('click', function(e){
    if(els.backupMenuPanel.hidden) return;
    if(els.backupMenuPanel.contains(e.target) || e.target === els.backupMenuBtn) return;
    setBackupMenuOpen(false);
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && !els.backupMenuPanel.hidden){ setBackupMenuOpen(false); }
  });

  // ---------- boot ----------
  var savedView = 'timer';
  try{ savedView = localStorage.getItem(STORAGE_VIEW) || 'timer'; }catch(e){}
  setActiveView(savedView);
  try{ categoryRange = localStorage.getItem(STORAGE_CATEGORY_RANGE) || 'all'; }catch(e){}
  try{
    var savedCustomRange = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_RANGE) || 'null');
    if(savedCustomRange){
      customRangeFrom = savedCustomRange.from || '';
      customRangeTo = savedCustomRange.to || '';
    }
  }catch(e){}
  customRangeFromPicker.setValue(customRangeFrom);
  customRangeToPicker.setValue(customRangeTo);
  els.customRangePicker.hidden = categoryRange !== 'custom';
  (function(){
    var buttons = els.categoryRangeTabs.querySelectorAll('.range-tab-btn');
    for(var i=0;i<buttons.length;i++){
      buttons[i].setAttribute('aria-selected', String(buttons[i].dataset.range === categoryRange));
    }
  })();
  try{ logExpanded = localStorage.getItem(STORAGE_LOG_EXPANDED) === '1'; }catch(e){}
  els.logList.classList.toggle('log-list-expanded', logExpanded);
  els.logExpandBtn.setAttribute('aria-pressed', String(logExpanded));
  els.logExpandBtn.textContent = logExpanded ? '⤡' : '⤢';
  els.logExpandBtn.title = logExpanded ? 'Collapse log' : 'Expand log';
  els.logExpandBtn.setAttribute('aria-label', els.logExpandBtn.title);
  loadTimerState();
  els.workInput.value = state.workMin;
  els.breakInput.value = state.breakMin;
  renderPresets();
  fillCategorySelectWithNew(els.newTaskCategory, loadCategories(), '');
  wireCategoryPicker(els.newTaskCategory, els.newTaskCategoryCreate, '', function(){ updateCategoryFormAvailability(); });
  updateCategoryFormAvailability();
  renderTasks();

  if(state.running && state.remainingMs > 0){
    startTicking();
  } else if(state.running && state.remainingMs <= 0){
    // completed while the page was closed
    state.remainingMs = 0;
    completePhase();
  }
  renderTimer();
  refreshStats();
  wireHourChartHover();

  // ---------- external integration hook (used by js/sync.js) ----------
  // Exposes just enough for the optional multi-device sync module to read/
  // merge data the same way file import already does, without reaching
  // into any other internals of this closure.
  window.PomodoroBench = {
    STORAGE_SESSIONS: STORAGE_SESSIONS,
    STORAGE_TASKS: STORAGE_TASKS,
    STORAGE_CATEGORIES: STORAGE_CATEGORIES,
    buildBackupData: buildBackupData,
    applyIncomingBackup: applyIncomingBackup
  };

})();
