(function(){
  "use strict";

  // No study compares session lengths across activity types, so these
  // numbers are reasoned from mechanism (switching cost, recovery time,
  // batching) rather than measured — they are a sane starting point to
  // calibrate away from, not an optimum. What the evidence does support:
  // break length should scale with the work that preceded it, so every
  // pair here keeps at least a 1:5 work-to-break ratio.
  //
  // Before changing any number here, read docs/session-length-evidence.md —
  // it records what is actually supported, which widely-repeated figures
  // trace to no study, and why each of these values is what it is.
  var PRESETS = [
    {id:'deep', label:'Deep work / coding', work:50, brk:10, note:'Long blocks earn their keep by avoiding task-switching cost — not by "reaching flow".'},
    {id:'writing', label:'Writing', work:45, brk:15, note:'A generous 1:3 reset. Writing a little every day beats occasional marathons.'},
    {id:'study', label:'Study & practice', work:25, brk:5, note:'Returning on later days matters more than block length — spacing is the well-evidenced part.'},
    {id:'reading', label:'Reading', work:30, brk:8, note:'Five minutes was too short a reset for a 30-minute block; this holds the 1:5 floor.'},
    {id:'admin', label:'Admin & email', work:25, brk:5, note:'Batched on purpose — fewer email checks a day lowers stress; short bursts invite switching.'},
    {id:'planning', label:'Planning & meetings', work:30, brk:10, note:'The one kind of work where breaks measurably improve the output. Ideally take it as a walk.'},
    {id:'custom', label:'Custom', work:25, brk:5, note:'Set your own lengths below.'}
  ];

  var STORAGE_SESSIONS = 'pomodoroBench.sessions.v1';
  var STORAGE_TASKS = 'pomodoroBench.tasks.v1';
  var STORAGE_CATEGORIES = 'pomodoroBench.categories.v1';
  var STORAGE_TIMER = 'pomodoroBench.timer.v1';
  var STORAGE_PRESETS = 'pomodoroBench.customPresets.v1';
  var STORAGE_SKILL_MARKS = 'pomodoroBench.skillMarks.v1';
  // Applied to any skill with no goal of its own. One number to change here.
  var DEFAULT_SKILL_GOAL_HOURS = 10000;
  // Rungs the bar fills toward on its way to the goal. Without them a 10,000h
  // goal leaves the bar at 1% for years, which is no use to anyone — least of
  // all someone who cannot estimate the total a skill needs and just wants to
  // see the next step. Motivation also rises as a goal comes into reach, so a
  // near rung is worth more than a distant one.
  var SKILL_MILESTONES = [10, 50, 100, 500, 1000, 2500, 5000, 10000];
  var DEFAULT_CATEGORIES = ['Learning', 'Work', 'Personal'];

  var els = {
    presetGrid: document.getElementById('presetGrid'),
    presetNote: document.getElementById('presetNote'),
    presetAddBtn: document.getElementById('presetAddBtn'),
    presetAddForm: document.getElementById('presetAddForm'),
    presetNewName: document.getElementById('presetNewName'),
    presetNewWork: document.getElementById('presetNewWork'),
    presetNewBreak: document.getElementById('presetNewBreak'),
    presetCancelBtn: document.getElementById('presetCancelBtn'),
    presetSaveBtn: document.getElementById('presetSaveBtn'),
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
    comeback: document.getElementById('comeback'),
    intentCard: document.getElementById('intentCard'),
    intentTitle: document.getElementById('intentTitle'),
    intentPrompt: document.getElementById('intentPrompt'),
    intentInput: document.getElementById('intentInput'),
    intentActions: document.getElementById('intentActions'),
    intentFoot: document.getElementById('intentFoot'),
    skillsList: document.getElementById('skillsList'),
    scaleBreakInput: document.getElementById('scaleBreakInput'),
    scaleBreakNote: document.getElementById('scaleBreakNote'),
    budgetLabel: document.getElementById('budgetLabel'),
    budgetTargetInput: document.getElementById('budgetTargetInput'),
    budgetFill: document.getElementById('budgetFill'),
    budgetNote: document.getElementById('budgetNote'),
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
    customRangeCalendar: document.getElementById('customRangeCalendar'),
    resetStatsBtn: document.getElementById('resetStatsBtn'),
    tabTimerBtn: document.getElementById('tabTimerBtn'),
    tabStatsBtn: document.getElementById('tabStatsBtn'),
    viewTimer: document.getElementById('viewTimer'),
    viewStats: document.getElementById('viewStats'),
    viewGarden: document.getElementById('viewGarden'),
    tabGardenBtn: document.getElementById('tabGardenBtn'),
    heatmapYear: document.getElementById('heatmapYear'),
    heatmapPrevYearBtn: document.getElementById('heatmapPrevYearBtn'),
    heatmapNextYearBtn: document.getElementById('heatmapNextYearBtn'),
    heatmapYearTotal: document.getElementById('heatmapYearTotal'),
    gardenCount: document.getElementById('gardenCount'),
    gardenShop: document.getElementById('gardenShop'),
    gardenPlot: document.getElementById('gardenPlot'),
    gardenScene: document.getElementById('gardenScene'),
    gardenWorld: document.getElementById('gardenWorld'),
    gardenYard: document.getElementById('gardenYard'),
    gardenStorePanel: document.getElementById('gardenStorePanel'),
    gardenStoreClose: document.getElementById('gardenStoreClose'),
    gardenStage: document.getElementById('gardenStage'),
    gardenHint: document.getElementById('gardenHint'),
    gardenBasket: document.getElementById('gardenBasket'),
    gardenShopPanel: document.getElementById('gardenShopPanel'),
    gardenShopToggle: document.getElementById('gardenShopToggle'),
    gardenShopClose: document.getElementById('gardenShopClose'),
    gardenShopTokens: document.getElementById('gardenShopTokens'),
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
    activeTaskCategory: '',
    proportionalBreak: false,
    // One if-then intention per day, stamped with the day it belongs to so it
    // expires on its own rather than lingering into tomorrow.
    dayIntention: '',
    dayIntentionDate: null,
    // Minutes of focused work targeted per day. Four hours is where the
    // deliberate-practice evidence puts the point of diminishing returns.
    dailyBudgetMin: 240,
    // Minutes actually focused in the phase just finished — the basis for a
    // scaled break. Null until a focus phase has ended at least once.
    lastFocusMin: null
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
  // The seven built-ins above are fixed; anything the user adds lives in its
  // own storage key and is appended to them. Every read of the preset list
  // goes through allPresets() so a custom type behaves like a built-in
  // everywhere — the timer, the task cards, the task-edit dropdown.
  function loadCustomPresets(){
    try{
      var raw = localStorage.getItem(STORAGE_PRESETS);
      var arr = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(arr)) arr = [];
      return arr.filter(function(p){
        return p && p.id && p.label && typeof p.work === 'number' && typeof p.brk === 'number';
      });
    }catch(e){ return []; }
  }

  function saveCustomPresets(arr){
    try{ localStorage.setItem(STORAGE_PRESETS, JSON.stringify(arr)); }catch(e){ /* ignore */ }
  }

  function allPresets(){
    return PRESETS.concat(loadCustomPresets());
  }

  function findPreset(id){
    return allPresets().filter(function(p){ return p.id === id; })[0];
  }

  // Built-ins keep a colour fixed by position, so they never shift when the
  // user adds a type. Custom ones hash into the same seven-colour pool —
  // collisions with a built-in are possible and harmless, since there are
  // only seven session colours defined in CSS.
  function presetColorClass(id){
    var idx = PRESETS.map(function(p){ return p.id; }).indexOf(id);
    if(idx >= 0) return 'session-color-' + (idx % 7);
    var hash = 0;
    for(var i=0;i<id.length;i++){ hash = (hash + id.charCodeAt(i)) % 7; }
    return 'session-color-' + hash;
  }

  function renderPresets(){
    els.presetGrid.innerHTML = '';
    var builtInIds = PRESETS.map(function(p){ return p.id; });
    allPresets().forEach(function(p){
      var btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.type = 'button';
      btn.setAttribute('role','listitem');
      btn.setAttribute('aria-pressed', String(p.id === state.presetId));
      btn.innerHTML = '<span class="p-name"><span class="preset-dot ' + presetColorClass(p.id) + '" aria-hidden="true"></span>' + escapeHtml(p.label) + '</span>' +
        '<span class="p-len">' + p.work + ' / ' + p.brk + ' min</span>';
      btn.addEventListener('click', function(){ applyPreset(p.id); });

      if(builtInIds.indexOf(p.id) >= 0){
        els.presetGrid.appendChild(btn);
        return;
      }
      // A delete control cannot sit inside the preset button (nested buttons
      // are invalid), so custom rows wrap the pair side by side.
      var row = document.createElement('div');
      row.className = 'preset-row';
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn preset-del';
      del.textContent = '✕';
      del.title = 'Delete "' + p.label + '"';
      del.setAttribute('aria-label', del.title);
      del.addEventListener('click', function(){ deleteCustomPreset(p.id); });
      row.appendChild(btn);
      row.appendChild(del);
      els.presetGrid.appendChild(row);
    });
    var current = findPreset(state.presetId);
    els.presetNote.textContent = current ? (current.note || '') : '';
  }

  function addCustomPreset(label, work, brk){
    var name = (label || '').trim();
    if(!name) return;
    var arr = loadCustomPresets();
    arr.push({
      id: generateId(),
      label: name,
      work: Math.max(1, Math.min(180, work || 30)),
      brk: Math.max(1, Math.min(60, brk || 6)),
      note: 'Your own session type.'
    });
    saveCustomPresets(arr);
    renderPresets();
  }

  // Tasks store their own workMin/breakMin, so pointing a stranded task at
  // the built-in 'custom' keeps its actual timings intact — only the label
  // it displays changes.
  function deleteCustomPreset(id){
    var arr = loadCustomPresets().filter(function(p){ return p.id !== id; });
    saveCustomPresets(arr);

    var tasks = loadTasks();
    var touched = false;
    tasks.forEach(function(t){
      if(t.sessionPresetId === id){ t.sessionPresetId = 'custom'; touched = true; }
    });
    if(touched) saveTasks(tasks);

    if(state.presetId === id){
      state.presetId = 'custom';
      saveTimerState();
    }
    renderPresets();
    renderTasks();
    renderTimer();
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
    var p = findPreset(id);
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
    var p = findPreset(id);
    return p ? p.label : 'Custom';
  }

  function fillPresetSelect(selectEl, currentId){
    selectEl.innerHTML = '';
    allPresets().forEach(function(p){
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
  // The preset's own work/break pair already expresses a ratio (deep is
  // 1:5, writing 1:3), so scaling a break needs no extra setting — it just
  // applies that same ratio to the time actually focused. Cut a 50-minute
  // block short at 10 minutes and the break follows it down to 2, instead
  // of handing out the full 10 for a fifth of the work.
  function breakRatio(){
    return state.workMin > 0 ? (state.breakMin / state.workMin) : 0.2;
  }

  function proportionalBreakMinutes(focusedMin){
    return Math.max(1, Math.round(focusedMin * breakRatio()));
  }

  function phaseMinutes(){
    if(state.mode === 'focus') return state.workMin;
    if(state.mode === 'longbreak') return Math.max(20, state.breakMin * 3);
    if(state.proportionalBreak && typeof state.lastFocusMin === 'number'){
      return proportionalBreakMinutes(state.lastFocusMin);
    }
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
    renderScaleBreak();

    var titleTask = state.mode === 'focus' && state.activeTaskName ? state.activeTaskName + ' · ' : '';
    document.title = (state.running ? formatTime(state.remainingMs) + ' · ' + titleTask : '') + 'Pomodoro Bench';
  }

  // Spells out the ratio in the user's own numbers, so the effect is legible
  // before a break ever starts — and greys the fixed Break box when the
  // scaled value is what will actually be used.
  function renderScaleBreak(){
    if(!els.scaleBreakInput) return;
    els.scaleBreakInput.checked = !!state.proportionalBreak;
    els.breakInput.classList.toggle('duration-input-derived', !!state.proportionalBreak);
    if(!state.proportionalBreak){
      els.scaleBreakNote.textContent = '';
      return;
    }
    var ratio = breakRatio();
    var oneIn = ratio > 0 ? Math.round(1 / ratio) : 0;
    var parts = ['1:' + oneIn + ' of focused time'];
    if(typeof state.lastFocusMin === 'number'){
      parts.push('last session ' + state.lastFocusMin + ' min → ' + proportionalBreakMinutes(state.lastFocusMin) + ' min break');
    }
    els.scaleBreakNote.textContent = parts.join(' · ');
  }

  // Today's logged focus minutes against the daily target. Held in a module
  // var because refreshStats() is what computes it, while the target input
  // can re-render the bar on its own without recounting sessions.
  var lastTodayFocusMin = 0;

  function renderBudget(todayMin){
    if(!els.budgetFill) return;
    if(typeof todayMin === 'number') lastTodayFocusMin = todayMin;
    var target = state.dailyBudgetMin || 240;
    var pct = Math.min(100, Math.round((lastTodayFocusMin / target) * 100));
    els.budgetTargetInput.value = target;
    els.budgetFill.style.width = pct + '%';
    els.budgetFill.classList.toggle('budget-fill-full', lastTodayFocusMin >= target);
    els.budgetLabel.textContent = formatDuration(lastTodayFocusMin) + ' / ' + formatDuration(target) + ' focused today';
    els.budgetNote.textContent = lastTodayFocusMin >= target
      ? 'At your daily budget — past roughly four hours, more focused work buys little.'
      : '';
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

  // ---------- session intention & review ----------
  // The only pair of features that moves this app from what the expertise
  // literature calls "naive practice" (merely putting in time) toward
  // "purposeful practice" (a specific improvement goal plus feedback on how
  // it went). A timer can never reach "deliberate practice" — that needs a
  // qualified teacher giving immediate feedback — so this is the honest
  // ceiling. See docs/motivation-evidence.md.
  var pendingReviewSessionId = null;

  function needsDayIntention(){
    return state.dayIntentionDate !== todayKey();
  }

  function renderIntentActions(actions){
    els.intentActions.innerHTML = '';
    actions.forEach(function(a){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm' + (a.primary ? ' btn-primary' : '');
      btn.textContent = a.label;
      btn.addEventListener('click', a.onClick);
      els.intentActions.appendChild(btn);
    });
  }

  function closeIntentCard(){
    els.intentCard.hidden = true;
    pendingReviewSessionId = null;
  }

  function openIntentionPrompt(){
    els.intentTitle.textContent = 'Before your first session today';
    els.intentPrompt.textContent = 'Finish this out loud, in one sentence: "When I sit down, I will …". Saying it over to yourself is the part that works — the field evidence finds if-then phrasing and rehearsal help, while writing it down slightly weakens the effect. So the box is optional.';
    els.intentInput.hidden = false;
    els.intentInput.value = state.dayIntention || '';
    els.intentFoot.textContent = 'Asked once a day, not once a session.';
    renderIntentActions([
      {label:'Start focus', primary:true, onClick: function(){ commitIntention(true); }},
      {label:'Skip', onClick: function(){ commitIntention(false); }}
    ]);
    els.intentCard.hidden = false;
    els.intentInput.focus();
  }

  function commitIntention(keepText){
    state.dayIntention = keepText ? els.intentInput.value.trim() : '';
    state.dayIntentionDate = todayKey();
    saveTimerState();
    closeIntentCard();
    startPause(); // needsDayIntention() is now false, so this starts the timer
  }

  // Informational feedback raises intrinsic motivation; tangible rewards for
  // finishing lower it. So this asks how the session went and says nothing
  // about whether that was good enough — no score, no target to fall short of.
  function openSessionReview(sessionId){
    pendingReviewSessionId = sessionId;
    els.intentTitle.textContent = 'How did that session go?';
    els.intentPrompt.textContent = state.dayIntention
      ? 'Today’s intention: "' + state.dayIntention + '"'
      : 'One tap, for your own record.';
    els.intentInput.hidden = true;
    els.intentFoot.textContent = 'Shows up in the log so you can see which sessions actually landed.';
    renderIntentActions([
      {label:'Scattered', onClick: function(){ commitReview('scattered'); }},
      {label:'Steady', onClick: function(){ commitReview('steady'); }},
      {label:'Deep', primary:true, onClick: function(){ commitReview('deep'); }},
      {label:'Dismiss', onClick: closeIntentCard}
    ]);
    els.intentCard.hidden = false;
  }

  function commitReview(quality){
    var id = pendingReviewSessionId;
    if(id){
      var sessions = loadSessions();
      var s = sessions.filter(function(x){ return x.id === id; })[0];
      if(s){ s.quality = quality; saveSessions(sessions); }
    }
    closeIntentCard();
    refreshStats();
  }

  function startPause(){
    if(state.mode === 'focus' && !state.activeTaskId && !state.running) return;
    // Gate only the first focus session of the day, not every one: the
    // implementation-intention evidence finds one or two plans outperform
    // three to five, and a prompt on every start is friction that gets the
    // whole tool abandoned. Returns here and re-enters via the card's button.
    if(!state.running && state.mode === 'focus' && needsDayIntention()){
      openIntentionPrompt();
      return;
    }
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
        // One tag so a new phase replaces the previous notification rather
        // than stacking up. But replacing is silent by default: an unread
        // notification sitting in the OS tray would be updated in place with
        // no banner and no sound, so after the first one the app appeared to
        // stop notifying entirely until the tray was cleared. renotify says
        // alert again on replacement, which is the whole point here.
        tag: 'pomodoro-bench-phase',
        renotify: true
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
      var loggedId = logSession(state.workMin, 'completed', 'focus');
      incrementTaskCompleted(state.activeTaskId);
      state.lastFocusMin = state.workMin; // ran to term, so the full length
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
    // After refreshStats(), which re-renders the log the rating will land in.
    if(loggedId) openSessionReview(loggedId);
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
      // Mirror completePhase()'s bookkeeping exactly: advance the cycle
      // counter here too, otherwise skipping a focus session leaves it one
      // behind and the long-break condition re-fires on the next real
      // completion (e.g. skip → long break → skip that too → finish the
      // next focus session and it's long break again instead of short).
      state.completedInCycle += 1;
      // Only what was actually focused, so a scaled break shrinks to match
      // a session cut short rather than paying out the full rest.
      state.lastFocusMin = elapsedMin;
      var goingLong = state.completedInCycle % 4 === 0;
      state.mode = goingLong ? 'longbreak' : 'break';
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
    // A task can point at a custom type this device no longer has — deleted
    // here, or never synced in. Fall back to 'custom' so the preset grid
    // still shows a selection; the task's own workMin/breakMin still apply.
    state.presetId = findPreset(t.sessionPresetId) ? t.sessionPresetId : 'custom';
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

    var chosenPreset = findPreset(sessionInput.value);
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
    var id = generateId();
    sessions.push({
      id: id,
      date: todayKey(new Date(ts)),
      category: state.activeTaskCategory || 'Uncategorized',
      task: state.activeTaskName || 'Untitled task',
      taskId: state.activeTaskId || null,
      minutes: minutes,
      timestamp: ts,
      status: status || 'completed',
      type: type || 'focus',
      intention: state.dayIntentionDate === todayKey() && state.dayIntention ? state.dayIntention : null,
      quality: null
    });
    saveSessions(sessions);
    return id;
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
    renderBudget(todayMin);

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

    // Days practised in a rolling 28-day window, deliberately NOT a
    // consecutive-day streak. A streak that resets to zero punishes a single
    // missed day, and the habit evidence says one miss costs almost nothing —
    // while a broken streak hurts roughly four times as much as an intact one
    // helps, and reliably drives people to abandon the tool outright.
    // See docs/motivation-evidence.md.
    var WINDOW_DAYS = 28;
    var practisedInWindow = 0;
    var windowCursor = new Date();
    for(var w = 0; w < WINDOW_DAYS; w++){
      if(daysWithSessions[todayKey(windowCursor)]) practisedInWindow += 1;
      windowCursor.setDate(windowCursor.getDate() - 1);
    }
    els.streakDays.textContent = practisedInWindow + '/' + WINDOW_DAYS;
    els.bestStreak.textContent = describeGap(daysWithSessions);

    renderComeback(daysWithSessions);
    renderSkills(focusSessions);
    renderLogForDate(sessions);
    renderInsights(sessions);
    renderYearHeatmap(focusSessions);
    renderGarden(focusSessions);
  }

  // ---------- hours logged per skill ----------
  // Deliberately a ledger, not a progress-to-mastery bar. The marker is
  // whatever the user typed, described as "your marker" rather than a
  // threshold, and a session short of it is never rendered as a shortfall:
  // rewards scaled to how far you fell short are the most demotivating
  // arrangement in the whole reward literature, while a plain binary "reached"
  // is close to harmless. See docs/motivation-evidence.md.
  // Which skill's marker is open for editing — click-to-edit, the same idiom
  // the task category chip and the log row already use, rather than parking a
  // permanent number input on every row.
  var editingSkillName = null;

  function loadSkillMarks(){
    try{
      var raw = localStorage.getItem(STORAGE_SKILL_MARKS);
      var obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    }catch(e){ return {}; }
  }

  function saveSkillMarks(obj){
    try{ localStorage.setItem(STORAGE_SKILL_MARKS, JSON.stringify(obj)); }catch(e){ /* ignore */ }
  }

  // The lowest rung still ahead of you, never past the goal. Once every rung
  // below the goal is behind you the goal itself becomes the target, so the
  // ladder adapts to a goal of 600h as readily as one of 10,000h.
  //
  // Only ever consulted for a skill still on the default goal — see
  // skillBarTarget below.
  function nextMilestone(hours, goal){
    for(var i = 0; i < SKILL_MILESTONES.length; i++){
      if(SKILL_MILESTONES[i] >= goal) break;
      if(hours < SKILL_MILESTONES[i]) return SKILL_MILESTONES[i];
    }
    return goal;
  }

  // What the bar is measured against, which depends on whether the goal is
  // one the user chose. The two cases answer genuinely different questions:
  //
  //   default goal   10,000h is the app's placeholder, not a target anybody
  //                  picked, so measuring against it says nothing. The ladder
  //                  supplies a near target instead and the bar always moves.
  //                  Crossing a rung raises the denominator and the bar drops
  //                  back — the ordinary level-up pattern.
  //
  //   chosen goal    Setting a number is itself the statement "this is my
  //                  target", so the bar reports position against it, plainly
  //                  and linearly. 10h of 300h is 3%.
  //
  // Two rejected alternatives, both of which broke one case to serve the other:
  // measuring against the rung in *both* cases made the bar ignore the chosen
  // goal entirely (45h read 90% whether the goal was 50h or 10,000h, so
  // re-setting it appeared to do nothing); and a log scale, which responds to
  // the goal but inflates early progress against a chosen one — 10h of 300h
  // showed 42%, which is simply not where you are.
  function skillBarTarget(hours, goal, usingDefault){
    return usingDefault ? nextMilestone(hours, goal) : goal;
  }

  function skillBarPct(hours, target){
    if(hours <= 0 || target <= 0) return 0;
    if(hours >= target) return 100;
    // Floor of 1 so any logged time shows a sliver rather than an empty track.
    return Math.min(100, Math.max(1, Math.round((hours / target) * 100)));
  }

  function renderSkills(focusSessions){
    if(!els.skillsList) return;
    var byCategory = {};
    focusSessions.forEach(function(s){
      var key = s.category || 'Uncategorized';
      byCategory[key] = (byCategory[key] || 0) + s.minutes;
    });
    var marks = loadSkillMarks();
    var rows = Object.keys(byCategory).map(function(name){
      return {name: name, minutes: byCategory[name], mark: marks[name] || null};
    }).sort(function(a, b){ return b.minutes - a.minutes; });

    els.skillsList.innerHTML = '';
    if(rows.length === 0){
      var empty = document.createElement('li');
      empty.className = 'empty-note';
      empty.textContent = 'Nothing logged yet.';
      els.skillsList.appendChild(empty);
      return;
    }

    // The bar fills toward the row's own goal (or, on the default goal, toward
    // the next rung — see skillBarTarget). It used to be sized against the
    // largest skill, which meant the biggest one was permanently full and
    // changing its goal did nothing — while the colour still flipped on
    // reaching the goal, so length and colour meant two different things.
    // Avoiding a goal-shaped bar was over-applying the reward research: the
    // demotivating pattern there is a *reward* scaled to how far short you
    // fell, not a self-set goal with nothing riding on it. Plain progress
    // monitoring is the best-evidenced mechanism in that whole review.
    rows.forEach(function(r){
      // A skill with no goal of its own falls back to the default, shown
      // faint so it reads as a suggestion rather than something you chose.
      var usingDefault = !r.mark;
      var goal = r.mark || DEFAULT_SKILL_GOAL_HOURS;
      var hours = r.minutes / 60;
      var reached = hours >= goal;
      var target = skillBarTarget(hours, goal, usingDefault);
      var pct = skillBarPct(hours, target);
      // The rung is only worth naming while it differs from the goal, which is
      // exactly the default case; otherwise "next 300h · goal 300h" twice over.
      var barTitle = formatDuration(r.minutes) +
        (reached ? ' — goal reached' : (usingDefault ? ' · next ' + target + 'h' : '')) +
        ' · goal ' + goal + 'h' + (usingDefault ? ' (default)' : '');
      var li = document.createElement('li');
      // Reuses the category-legend row: same pill-inside-.cat-name structure,
      // same bar, same mono figures, so this card reads as part of the app.
      li.className = 'cat-row skill-row';

      // "goal" rather than "marker", and prefixed when set: two bare figures
      // side by side gave no clue which was hours logged and which was the
      // number being aimed at.
      var markCell = r.name === editingSkillName
        ? '<input type="number" class="inline-edit-input skill-mark-input" min="1" max="50000" ' +
            'value="' + goal + '" placeholder="h" ' +
            'aria-label="Hour goal for ' + escapeAttr(r.name) + '">'
        : '<button type="button" class="skill-mark-btn' + (usingDefault ? ' skill-mark-empty' : '') + '" ' +
            'title="' + (usingDefault ? 'Default goal — click to set your own' : 'Change your hour goal') + '">' +
            'goal ' + goal + 'h' + (reached ? ' ✓' : '') +
          '</button>';

      li.innerHTML =
        // title so a name clipped by the fixed-width column is still readable.
        '<span class="cat-name"><span class="cat-pill ' + categoryColorClass(r.name) + '" title="' + escapeAttr(r.name) + '">' + escapeHtml(r.name) + '</span></span>' +
        // div, not span: width and height do not apply to inline elements, so
        // a span fill renders as a zero-size box and only the track shows.
        '<div class="cat-bar-track" title="' + escapeAttr(barTitle) + '"><div class="cat-bar-fill ' + categoryColorClass(r.name) + (reached ? ' cat-bar-reached' : '') + '" style="width:' +
          pct + '%"></div></div>' +
        '<span class="cat-minutes">' + formatDuration(r.minutes) + '</span>' +
        '<span class="skill-mark-cell">' + markCell + '</span>';

      li.dataset.name = r.name;
      els.skillsList.appendChild(li);
    });

    if(editingSkillName){
      var open = els.skillsList.querySelector('.skill-mark-input');
      if(open) open.focus();
    }
  }

  function commitSkillMark(name, raw){
    var marks = loadSkillMarks();
    var v = parseInt(raw, 10);
    if(!v || v < 1){ delete marks[name]; } else { marks[name] = Math.min(50000, v); }
    saveSkillMarks(marks);
    editingSkillName = null;
    refreshStats();
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

  // ---------- garden ----------
  // A place you build, not a log you scroll.
  //
  // The version this replaced grew one plant per day worked and stacked the
  // days into rows forever. It failed for a reason worth writing down: the
  // content ceiling was reached in about six weeks (five stages times six
  // species is thirty drawings) while the quantity grew without limit, so a
  // year of use meant 365 plants over 37 rows in which row 12 and row 31 were
  // indistinguishable. Quantity without novelty is wallpaper.
  //
  // So the loop now is: finishing a pomodoro earns a token, tokens buy plants and
  // ornaments from a shop, and you choose where each one goes on a fixed plot.
  // The plot is bounded, so a year fills a garden rather than extending a list,
  // and what you get out of a long streak is a place that looks like yours.
  //
  // Three rules held over from docs/motivation-evidence.md, and one new one:
  //
  //  - Tokens never expire, never decay, and nothing charges upkeep. Every token
  //    you earn stays earned.
  //  - Nothing wilts and nothing dies from neglect. A plant with no work behind
  //    it simply waits at the stage it reached.
  //  - The shop shows prices, never a shortfall: an item you cannot afford yet
  //    is dimmed and priced, and no text anywhere says how far short you are.
  //    A reward rendered as the gap you failed to close is the worst design in
  //    the reward literature (free-choice d=-0.80 to -0.88); a price you can
  //    save toward is a menu, which is a different thing.
  //  - The seed count lives here in Statistics and never appears beside the
  //    timer. Visual prominence alone flips a reward signal's sign (salient
  //    d=-0.78 vs non-salient d=+0.24).
  var STORAGE_GARDEN = 'pomodoroBench.garden.v1';
  var GARDEN_COLS = 10;
  // Tiers climb, they do not run out. The garden always keeps empty tiers above
  // Land is sold by the PARCEL, not by the plot: one parcel is ten plots, five
  // across and two deep, and parcels sit apart with a path between them. That
  // spacing is the point — an unbroken sea of identical plots reads as shelving,
  // while parcels separated by paths read as a farm.
  //
  // The first four parcels are free, which is the same forty plots the version
  // before this gave away: shrinking that would take land off people already
  // using the app, and grandfathering only rescues plots with something PLANTED
  // on them, not the empty ones somebody was keeping for later.
  //
  // Land exists as a purchase because tokens had exactly one sink — the shop —
  // and one of everything costs a few hundred. After that there was nothing left
  // to aim for. Land never runs out of things to want.
  var PARCEL_COLS = 5;
  var PARCEL_ROWS = 2;
  var PARCEL_SLOTS = PARCEL_COLS * PARCEL_ROWS;
  var PARCELS_ACROSS = GARDEN_COLS / PARCEL_COLS;
  var PARCELS_FREE = 4;
  var PARCELS_MAX = 40;
  var GARDEN_MAX_ROWS = (PARCELS_MAX / PARCELS_ACROSS) * PARCEL_ROWS;

  function parcelOf(row, col){
    return Math.floor(row / PARCEL_ROWS) * PARCELS_ACROSS + Math.floor(col / PARCEL_COLS);
  }

  function parcelOrigin(index){
    return {
      row: Math.floor(index / PARCELS_ACROSS) * PARCEL_ROWS,
      col: (index % PARCELS_ACROSS) * PARCEL_COLS
    };
  }

  // Linear rather than exponential: the farm should keep growing all year
  // instead of stalling at the sixth parcel.
  function parcelPrice(index){
    if(index < PARCELS_FREE) return 0;
    return 24 + 16 * (index - PARCELS_FREE + 1);
  }

  // How many parcels are owned. Stored, but a garden saved before land could be
  // bought has no such number — so anything already planted is GRANDFATHERED in.
  // Charging retroactively for land somebody already used, or hiding their plants
  // behind land they now have to buy, would both be theft.
  function parcelsOwned(g){
    var least = PARCELS_FREE;
    for(var i = 0; i < g.items.length; i++){
      var at = parcelOf(g.items[i].row, g.items[i].col) + 1;
      if(at > least) least = at;
    }
    var stored = typeof g.parcels === 'number' && g.parcels > 0 ? Math.floor(g.parcels) : 0;
    // Gardens saved by the short-lived version that sold single plots carry a
    // `plots` count instead. Round UP, so nobody loses part of a parcel.
    if(!stored && typeof g.plots === 'number' && g.plots > 0){
      stored = Math.ceil(g.plots / PARCEL_SLOTS);
    }
    return Math.min(PARCELS_MAX, Math.max(least, stored));
  }

  // Parcels to draw: every owned one, plus the next one up for sale, so the edge
  // of the farm is always visible and there is always somewhere to grow.
  function parcelCount(owned){
    return Math.min(PARCELS_MAX, owned + 1);
  }

  // What a parcel is FOR follows what is in it, so there is no extra choice to
  // make and no extra field to store. Ornaments belong anywhere, which is why
  // they claim nothing.
  //
  // Livestock commits a parcel to its own kind, because each kind is housed
  // differently: chickens get a coop, pigs a sty, cows a barn. One shed that has
  // to serve a cow and a chicken at once is a shed that reads as neither.
  //
  // Two exceptions, both because of what the place actually looks like. Pets —
  // the dog and the cat — share a yard, since a kennel and a cat house stand in
  // the same corner of a real garden. And a pond holds a mixed shoal, which is
  // what a pond looks like.
  var PETS = { dog:1, cat:1 };
  var FAMILY_BY_CAT = {
    flower:'bed', crop:'bed', tree:'bed', special:'bed', fish:'pond'
  };

  function familyOf(meta){
    if(!meta) return null;
    if(meta.cat === 'animal') return PETS[meta.kind] ? 'pen:pets' : 'pen:' + meta.kind;
    return FAMILY_BY_CAT[meta.cat] || null;
  }

  // The family a parcel has already committed to, or null while it is empty. A
  // pond full of fish, a coop full of chickens and a bed full of grapes are what
  // the game should look like; a cow standing among the tomatoes is not.
  function parcelFamily(items, index){
    for(var i = 0; i < items.length; i++){
      if(parcelOf(items[i].row, items[i].col) !== index) continue;
      var fam = familyOf(shopItem(items[i].kind));
      if(fam) return fam;
    }
    return null;
  }

  // Plants grow with the work done since they were planted, not with wall-clock
  // time. Waiting never advances a plant, and a plant never falls behind for
  // time off — it just holds where it is until the next session.
  // Read these as fractions of the way to full growth rather than as pomodoro
  // counts: every shop item carries its own `mature`, and the steps are
  // stretched to fit it. One shared schedule would mean the dearest crop ripens
  // as fast as the cheapest, which is exactly the runaway income this table
  // exists to prevent.
  var GROWTH_STEPS = [0, 2, 4, 7, 12];   // stage 1..5, against MATURE_DEFAULT
  var MATURE_DEFAULT = 12;

  function plantStageForAge(age, mature){
    var scale = (mature || MATURE_DEFAULT) / MATURE_DEFAULT;
    var stage = 1;
    for(var i = 1; i < GROWTH_STEPS.length; i++){
      if(age >= GROWTH_STEPS[i] * scale) stage = i + 1;
    }
    return stage;
  }

  // Pomodoros from planting to the last stage — and, for an annual, to harvest.
  function matureOf(meta){ return (meta && meta.mature) || MATURE_DEFAULT; }

  function hashString(s){
    var h = 2166136261;
    for(var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  }

  // The murmur3 finaliser. FNV on its own leaves the low bits badly clustered,
  // so anything that takes `hash % n` off it lands on a handful of values — that
  // is how three of six foliage palettes ended up never being drawn. Running the
  // result through this first spreads it, and it costs four instructions.
  function mix32(h){
    h ^= h >>> 16;
    h = (Math.imul(h, 2246822507)) >>> 0;
    h ^= h >>> 13;
    h = (Math.imul(h, 3266489909)) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }

  // ---- the shop ----
  // Prices climb with how much drawing a species has in it, so the things that
  // look most like a reward take the longest to reach. Ornaments do not grow,
  // which is the point of them: they are the part of the garden that is purely
  // yours to arrange.
  // What a harvest is worth, and why ripening is counted in pomodoros rather
  // than in hours.
  //
  // Ripening on wall-clock time would mean the app pays you for leaving it
  // open, which severs the one link that makes this whole tab legitimate:
  // a token is a finished pomodoro. Counted in pomodoros instead, a plant is a
  // MULTIPLIER on work rather than a way around it — an expensive tree makes
  // each session worth more, and a garden nobody works in produces nothing at
  // all. Same reason nothing here decays: an idle garden should be still, not
  // punished.
  var PRODUCE = {
    petal:  { label:'Petals',      value:5 },
    cherry: { label:'Cherries',    value:3 },
    acorn:  { label:'Acorns',      value:4 },
    resin:  { label:'Resin',       value:5 },
    bark:   { label:'Birch bark',  value:6 },
    syrup:  { label:'Maple syrup', value:7 },
    cone:   { label:'Cones',       value:8 },
    egg:    { label:'Eggs',        value:3 },
    milk:   { label:'Milk',        value:6 },
    fish:   { label:'Fish',        value:7 },

    // Farm produce. `value` is the sale price; for an annual it is set so one
    // harvest returns about 1.4x what the seed cost, and that premium is the
    // whole return on the pomodoros spent waiting.
    grain:        { label:'Rice',           value:3 },
    carrot:       { label:'Carrots',        value:6 },
    tomato:       { label:'Tomatoes',       value:8 },
    cucumber:     { label:'Cucumbers',      value:10 },
    corn:         { label:'Corn',           value:11 },
    rose:         { label:'Roses',          value:13 },
    tulip:        { label:'Tulips',         value:14 },
    eggplant:     { label:'Aubergines',     value:18 },
    garlic:       { label:'Garlic',         value:20 },
    onion:        { label:'Onions',         value:22 },
    potato:       { label:'Potatoes',       value:25 },
    melon:        { label:'Watermelons',    value:28 },
    aloe:         { label:'Aloe leaves',    value:34 },
    mango:        { label:'Mangoes',        value:5 },
    pineapple:    { label:'Pineapples',     value:6 },
    dragonfruit:  { label:'Dragon fruit',   value:6 },
    ginseng:      { label:'Ginseng root',   value:7 },
    grapes:       { label:'Grapes',         value:8 },
    apple:        { label:'Apples',         value:9 }
  };

  // price = what it costs · every = pomodoros between harvests · produce = what
  // it drops. Payback sits between roughly 12 and 60 pomodoros across the
  // range, and the cheap end pays back fastest, so the first thing a new garden
  // can afford is also the thing that gets it moving.
  var SHOP_ITEMS = [
    { kind:'sunflower', name:'Sunflower', price:3,  species:'sunflower', palette:3, grows:true, every:1, produce:'petal', cat:'flower', annual:true },
    { kind:'sakura',    name:'Cherry',    price:8,  species:'sakura',    palette:5, grows:true, mature:18, every:20, produce:'cherry', cat:'tree' },
    { kind:'oak',       name:'Oak',       price:12, species:'oak',       palette:1, grows:true, mature:22, every:24, produce:'acorn', cat:'tree' },
    { kind:'pine',      name:'Pine',      price:16, species:'pine',      palette:0, grows:true, mature:26, every:28, produce:'resin', cat:'tree' },
    { kind:'birch',     name:'Birch',     price:20, species:'birch',     palette:4, grows:true, mature:30, every:32, produce:'bark', cat:'tree' },
    { kind:'maple',     name:'Maple',     price:24, species:'maple',     palette:2, grows:true, mature:34, every:36, produce:'syrup', cat:'tree' },
    { kind:'cypress',   name:'Cypress',   price:28, species:'cypress',   palette:0, grows:true, mature:38, every:40, produce:'cone', cat:'tree' },
    // Companions, deliberately with nothing to harvest. A dog that produced a
    // farm good would be nonsense, and the honest alternative — making them
    // need feeding so there is something to fail at — is the punishment
    // mechanic this card refuses. They are here to move about and be alive.
    { kind:'cat',       name:'Cat',       price:26, decor:'cat',      grows:false, cat:'animal' },
    { kind:'dog',       name:'Dog',       price:30, decor:'dog',      grows:false, cat:'animal' },
    { kind:'chicken',   name:'Chicken',   price:18, decor:'chicken',  grows:false, every:18, produce:'egg', cat:'animal' },
    { kind:'cow',       name:'Cow',       price:34, decor:'cow',      grows:false, every:30, produce:'milk', cat:'animal' },
    { kind:'pond',      name:'Fish pond', price:36, decor:'pond',     grows:false, every:32, produce:'fish', cat:'fish' },

    // The farm roster. `mature` is what keeps this honest: a crop that costs
    // more takes proportionally longer to reach harvest, so every row here
    // clears between 0.08 and 0.22 tokens per pomodoro and none of them is the
    // obvious play. An `annual` is lifted with its harvest and has to be bought
    // again; the perennials keep bearing, which is why their rate sits in the
    // lower half of that band.
    { kind:'rice',         name:'Rice',            price:2,  species:'rice',          palette:3, grows:true, mature:12, every:1,  produce:'grain',         cat:'crop', annual:true },
    { kind:'carrot',       name:'Carrot',          price:4,  species:'carrot',        palette:3, grows:true, mature:12, every:1,  produce:'carrot',        cat:'crop', annual:true },
    { kind:'tomato',       name:'Tomato',          price:6,  species:'tomato',        palette:5, grows:true, mature:13, every:1,  produce:'tomato',        cat:'crop', annual:true },
    { kind:'cucumber',     name:'Cucumber',        price:7,  species:'cucumber',      palette:0, grows:true, mature:16, every:1,  produce:'cucumber',      cat:'crop', annual:true },
    { kind:'corn',         name:'Corn',            price:8,  species:'corn',          palette:3, grows:true, mature:16, every:1,  produce:'corn',          cat:'crop', annual:true },
    { kind:'rose',         name:'Rose',            price:9,  species:'rose',          palette:5, grows:true, mature:19, every:1,  produce:'rose',          cat:'flower', annual:true },
    { kind:'tulip',        name:'Tulip',           price:10, species:'tulip',         palette:2, grows:true, mature:19, every:1,  produce:'tulip',         cat:'flower', annual:true },
    { kind:'eggplant',     name:'Aubergine',       price:13, species:'eggplant',      palette:2, grows:true, mature:26, every:1,  produce:'eggplant',      cat:'crop', annual:true },
    { kind:'garlic',       name:'Garlic',          price:14, species:'garlic',        palette:4, grows:true, mature:30, every:1,  produce:'garlic',        cat:'crop', annual:true },
    { kind:'onion',        name:'Onion',           price:16, species:'onion',         palette:2, grows:true, mature:34, every:1,  produce:'onion',         cat:'crop', annual:true },
    { kind:'potato',       name:'Potato',          price:18, species:'potato',        palette:3, grows:true, mature:38, every:1,  produce:'potato',        cat:'crop', annual:true },
    { kind:'watermelon',   name:'Watermelon',      price:20, species:'watermelon',    palette:0, grows:true, mature:42, every:1,  produce:'melon',         cat:'crop', annual:true },
    { kind:'aloevera',     name:'Aloe vera',       price:24, species:'aloevera',      palette:0, grows:true, mature:46, every:1,  produce:'aloe',          cat:'crop', annual:true },
    { kind:'mango',        name:'Mango',           price:26, species:'mango',         palette:3, grows:true, mature:24, every:28, produce:'mango',         cat:'tree' },
    { kind:'pineapple',    name:'Pineapple',       price:30, species:'pineapple',     palette:3, grows:true, mature:20, every:33, produce:'pineapple',     cat:'tree' },
    { kind:'dragonfruit',  name:'Dragon fruit',    price:34, species:'dragonfruit',   palette:5, grows:true, mature:26, every:32, produce:'dragonfruit',   cat:'tree' },
    { kind:'ginseng',      name:'Ginseng',         price:38, species:'ginseng',       palette:5, grows:true, mature:30, every:37, produce:'ginseng',       cat:'special' },
    { kind:'grapes',       name:'Grapes',          price:42, species:'grapes',        palette:2, grows:true, mature:28, every:42, produce:'grapes',        cat:'tree' },
    { kind:'apple',        name:'Apple',           price:46, species:'apple',         palette:5, grows:true, mature:32, every:46, produce:'apple',         cat:'tree' }
  ];

  // What the plot under a thing is made of. Soil is for anything that grows in
  // it; everything else was standing on a vegetable bed, which is why a cow read
  // as livestock loose in the crops and the fish pond read as a puddle in a
  // flowerbed. The grid, the click and the save format are unchanged — only the
  // ground stops lying about what is on it.
  var GROUND_BY_CAT = {
    animal: 'yard',    // trodden grass, the corner of a garden animals are kept in
    fish:   'water',   // the pond is the plot, not something sitting on top of one
    decor:  'path'     // a bench belongs on paving, not on a seed bed
  };

  function groundFor(meta){
    return (meta && GROUND_BY_CAT[meta.cat || 'decor']) || 'soil';
  }

  function shopItem(kind){
    for(var i = 0; i < SHOP_ITEMS.length; i++){
      if(SHOP_ITEMS[i].kind === kind) return SHOP_ITEMS[i];
    }
    return null;
  }

  // ---- storage ----
  function loadGarden(){
    var g = { spent: 0, income: 0, basket: {}, items: [], parcels: 0 };
    try{
      var raw = localStorage.getItem(STORAGE_GARDEN);
      if(raw){
        var saved = JSON.parse(raw);
        if(saved && typeof saved === 'object'){
          if(typeof saved.spent === 'number' && saved.spent >= 0) g.spent = saved.spent;
          // Seeds earned by selling produce. Kept separately from `spent` so the
          // balance stays a plain sum and can never be reconstructed wrongly.
          if(typeof saved.income === 'number' && saved.income >= 0) g.income = saved.income;
          // Parcels bought. Zero means "not recorded", not "no land":
          // parcelsOwned() floors it at the free parcels and at whatever is
          // already planted, and migrates the older per-plot count.
          if(typeof saved.parcels === 'number' && saved.parcels > 0) g.parcels = Math.floor(saved.parcels);
          if(typeof saved.plots === 'number' && saved.plots > 0) g.plots = Math.floor(saved.plots);
          if(saved.basket && typeof saved.basket === 'object'){
            Object.keys(saved.basket).forEach(function(k){
              var n = saved.basket[k];
              if(PRODUCE[k] && typeof n === 'number' && n > 0) g.basket[k] = Math.floor(n);
            });
          }
          if(Array.isArray(saved.items)){
            // Position is validated, but an unrecognised `kind` is KEPT. Dropping
            // it here would mean that commenting one row out of SHOP_ITEMS
            // silently erases every planted copy from every saved garden — an
            // edit to a price table must never destroy what someone built.
            // Anything unknown is simply not drawn; see renderPlot.
            g.items = saved.items.filter(function(it){
              return it && typeof it.kind === 'string' &&
                it.col >= 0 && it.col < GARDEN_COLS && it.row >= 0 && it.row < GARDEN_MAX_ROWS;
            });
          }
        }
      }
    }catch(e){ /* ignore corrupt storage */ }
    return g;
  }

  function saveGarden(g){
    try{ localStorage.setItem(STORAGE_GARDEN, JSON.stringify(g)); }catch(e){ /* storage unavailable */ }
  }

  // ---- drawing ----
  var PLANT_BASE_X = 30, PLANT_BASE_Y = 96;

  var SPROUT_PARTS = [
    { d:'M28.8 96 L28.8 78 Q30 74.5 31.2 78 L31.2 96 Z', tone:'stem' },
    { d:'M30 79.5 Q18.5 78.5 15.2 68.5 Q26.8 68 30 77.2 Z', tone:'deep' },
    { d:'M30 75 Q41.5 73 44.8 63 Q33.2 63.5 30 72.8 Z', tone:'light' }
  ];

  // Parts paint in array order (back to front); each appears from a given stage
  // onward, and `to` lets a stage replace a shape rather than accumulate over
  // it. Stage 2 is never simply the mature drawing shrunk: a scaled-down tree
  // keeps its trunk-to-crown ratio, which is the lollipop this card started out
  // looking like, so every species has a stage-2 crown that sits low and wide
  // over a short trunk — the shape a young plant actually has.
  var SPECIES = {
    oak:{
      trunk:'M26.6 96 Q28.7 76 27.9 59 L32.1 59 Q31.3 76 33.4 96 Z',
      trunkShort:'M27 96 Q28.8 85 28.3 72 L31.7 72 Q31.2 85 33 96 Z',
      parts:[
        { c:[30,63,13], tone:'deep', from:2, to:2 },
        { c:[26.2,57.6,7.6], tone:'base', from:2, to:2 },
        { c:[27.4,56,4.6], tone:'light', from:2, to:2 },
        { c:[30,53,11.6], tone:'deep', from:3 },
        { c:[20.2,46,9.8], tone:'deep', from:3 },
        { c:[39.8,46.6,9.4], tone:'base', from:3 },
        { c:[30,37,12.2], tone:'base', from:4 },
        { c:[36.8,41.4,5.6], tone:'light', from:3 },
        { c:[25.6,32.6,7.2], tone:'light', from:4 }
      ],
      blossoms:[[21.4,43],[38.6,42],[30,29.6],[24.6,52],[37,51],[30,44],[17.4,48],[43,49],[32,34]]
    },
    pine:{
      trunk:'M28.2 96 L28.2 60 L31.8 60 L31.8 96 Z',
      trunkShort:'M28.6 96 L28.6 74 L31.4 74 L31.4 96 Z',
      parts:[
        { d:'M30 55 L44.5 78 Q30 74 15.5 78 Z', tone:'deep', from:2, to:2 },
        { d:'M30 55 L37 70.5 Q30 68.5 23 70.5 Z', tone:'light', from:2, to:2 },
        { d:'M30 41 L46.5 75 Q30 70.5 13.5 75 Z', tone:'deep', from:3 },
        { d:'M30 26.5 L43.5 58.5 Q30 54.5 16.5 58.5 Z', tone:'base', from:3 },
        { d:'M30 41 L38 62 Q30 59.6 22 62 Z', tone:'light', from:3, to:3 },
        { d:'M30 14 L40 43 Q30 39.6 20 43 Z', tone:'base', from:4 },
        { d:'M30 26.5 L36.4 45 Q30 43 23.6 45 Z', tone:'light', from:4 },
        { d:'M30 5.5 L36.8 26 Q30 23.4 23.2 26 Z', tone:'light', from:5 }
      ],
      blossoms:[[22.6,66],[37.4,66],[24.4,51],[35.6,51],[30,36],[26,60],[34,60],[30,22],[30,47]]
    },
    sakura:{
      trunk:'M26.4 96 Q30.6 78 24.4 66 Q22.6 62.6 27.6 60.4 L30.4 63.6 Q26.8 65.6 28.4 68.4 Q34 79 29.8 96 Z',
      trunkShort:'M27 96 Q30.4 84 26 74.4 Q24.6 71.6 28.4 70.2 L30.6 72.6 Q28.2 73.8 29.2 76.2 Q33.2 85 30.2 96 Z',
      parts:[
        { c:[27,65,12], tone:'deep', from:2, to:2 },
        { c:[23.4,59.6,7], tone:'base', from:2, to:2 },
        { c:[24.4,58.4,4.2], tone:'light', from:2, to:2 },
        { c:[26.4,55,10.6], tone:'deep', from:3 },
        { c:[15.6,48.6,8.8], tone:'deep', from:3 },
        { c:[37,50.6,10.2], tone:'base', from:3 },
        { c:[27,40.4,11], tone:'base', from:4 },
        { c:[16.6,44.6,4.8], tone:'light', from:3 },
        { c:[33.6,44,6.2], tone:'light', from:4 },
        { c:[42.4,42.4,7], tone:'base', from:5 }
      ],
      blossoms:[[17,53],[35.6,55],[27,33.4],[41,47],[22,43],[30.6,47],[12.4,48],[44.6,40],[33,58]]
    },
    maple:{
      trunk:'M24.6 96 Q28.2 78 27.2 65 L32.8 65 Q31.8 78 35.4 96 Z',
      trunkShort:'M25.4 96 Q28.4 85 27.6 74 L32.4 74 Q31.6 85 34.6 96 Z',
      parts:[
        { c:[30,66,13.6], tone:'deep', from:2, to:2 },
        { c:[25.6,60.4,7.8], tone:'base', from:2, to:2 },
        { c:[27,58.6,4.4], tone:'light', from:2, to:2 },
        { c:[30,57.4,13], tone:'deep', from:3 },
        { c:[16.6,51.4,9.2], tone:'deep', from:3 },
        { c:[43.4,51.4,9.2], tone:'base', from:3 },
        { c:[30,43,11.4], tone:'base', from:4 },
        { c:[26.4,52.4,7.6], tone:'light', from:3, to:3 },
        { c:[34.6,46.4,5.6], tone:'light', from:4 },
        { c:[21.4,41.6,7.4], tone:'base', from:5 },
        { c:[38.6,41.6,7.4], tone:'light', from:5 }
      ],
      blossoms:[[18,55],[42,55],[30,36.6],[23.4,46],[37,46],[13.4,52],[46.6,52],[30,50],[30,62]]
    },
    birch:{
      trunk:'M28.4 96 L28.4 44 L31.6 44 L31.6 96 Z',
      trunkShort:'M28.8 96 L28.8 68 L31.2 68 L31.2 96 Z',
      trunkTone:'birch',
      parts:[
        { c:[30,67,9.6], tone:'deep', from:2, to:2 },
        { c:[27.4,63.4,5.6], tone:'light', from:2, to:2 },
        { c:[30,55,8.4], tone:'deep', from:3 },
        { c:[30,42,9.2], tone:'base', from:3 },
        { c:[33,38.6,5.4], tone:'light', from:3 },
        { c:[30,30.4,8], tone:'base', from:4 },
        { c:[27.6,27,4.6], tone:'light', from:4 },
        { c:[30,20,6.2], tone:'light', from:5 }
      ],
      blossoms:[[24.4,57],[35.6,57],[24,44],[36,44],[30,26],[30,49],[26,35],[34,32],[30,60]]
    },
    cypress:{
      trunk:'M28.6 96 L28.6 70 L31.4 70 L31.4 96 Z',
      trunkShort:'M28.8 96 L28.8 80 L31.2 80 L31.2 96 Z',
      parts:[
        { d:'M30 80 Q21.4 64 30 47 Q38.6 64 30 80 Z', tone:'deep', from:2, to:2 },
        { d:'M30 76 Q25.6 64 30 50 Q34.4 64 30 76 Z', tone:'light', from:2, to:2 },
        { d:'M30 72 Q19.6 47 30 21 Q40.4 47 30 72 Z', tone:'deep', from:3, to:3 },
        { d:'M30 67 Q24.4 45 30 25 Q35.6 45 30 67 Z', tone:'light', from:3, to:3 },
        { d:'M30 74 Q17.6 42 30 6 Q42.4 42 30 74 Z', tone:'deep', from:4 },
        { d:'M30 68 Q23.4 40 30 12 Q36.6 40 30 68 Z', tone:'light', from:4 }
      ],
      blossoms:[[26,58],[34,58],[26.6,44],[33.4,44],[30,30],[30,50],[27.4,36],[32.6,36],[30,64]]
    },
    // The one flower in the shop, and the cheapest thing in it: stem and leaves
    // stay green whatever the palette, only the head takes the item colour.
    sunflower:{
      trunk:'M28.7 96 L28.7 50 Q30 46.4 31.3 50 L31.3 96 Z',
      trunkShort:'M28.9 96 L28.9 70 Q30 67 31.1 70 L31.1 96 Z',
      trunkTone:'stem',
      parts:[
        { d:'M29.4 76 Q20 74.6 16.6 66 Q26 65.4 29.4 73.4 Z', tone:'stem', from:2, to:2 },
        { petals:[30,62,10,3.4,6.6,6.4], tone:'base', from:2, to:2 },
        { c:[30,62,4.6], tone:'seedhead', from:2, to:2 },
        { d:'M29.4 72 Q18 70.4 14 60 Q25.4 59.6 29.4 69 Z', tone:'stem', from:3 },
        { d:'M30.6 62 Q42 60.4 46 50 Q34.6 49.6 30.6 59 Z', tone:'stemdark', from:4 },
        { petals:[30,42,12,4.4,9.6,10.6], tone:'base', from:3 },
        { petals:[30,42,12,3.4,7.4,9.6], tone:'light', from:4 },
        { c:[30,42,7.4], tone:'seedhead', from:3 },
        { c:[28.6,40.6,4.4], tone:'seedhead-light', from:4 }
      ],
      blossoms:[[24,50],[36,50],[22.6,38],[37.4,38],[30,30],[30,54],[18.6,44],[41.4,44],[30,46]]
    },

    // ---- farm crops and fruit ----
    // Same 60x96 box and the same part vocabulary as the trees above. Two
    // conventions run through all of them, because a plant has exactly one
    // item-tinted ramp: anything leafy takes `stem`/`stemdark` so a crop stays
    // green whatever palette it carries, and the HARVEST takes
    // `deep`/`base`/`light`, so the item colour is the thing you grew.
    aloevera:{
      trunk: 'M29.2 96 L29.2 91 L30.8 91 L30.8 96 Z',
      trunkShort: 'M29.4 96 L29.4 93.4 L30.6 93.4 L30.6 96 Z',
      trunkTone: 'stemdark',
      parts: [
        { d:'M29.4 94 Q24.6 86 19.4 76.6 L21 78 L20.4 75.4 L22.4 76.6 L22.4 74 L24.4 75.6 Q27 82.6 30.4 92 Z', tone:'deep', from:2, to:2 },
        { d:'M30.6 94 Q35.4 86 40.6 76.6 L39 78 L39.6 75.4 L37.6 76.6 L37.6 74 L35.6 75.6 Q33 82.6 29.6 92 Z', tone:'deep', from:2, to:2 },
        { d:'M29.4 92 Q28.4 82 28.4 72 L29.6 74 L29.6 71 L30.4 71 L30.4 74 L31.6 72 Q31.6 82 30.6 92 Z', tone:'base', from:2, to:2 },

        { d:'M29.4 94.6 Q22.6 86 14.6 74 L16.6 75.4 L15.6 72.4 L18.4 74 L18.2 70.6 L21 72.6 Q25 80.6 30.6 92.6 Z', tone:'deep', from:3 },
        { d:'M30.6 94.6 Q37.4 86 45.4 74 L43.4 75.4 L44.4 72.4 L41.6 74 L41.8 70.6 L39 72.6 Q35 80.6 29.4 92.6 Z', tone:'deep', from:3 },
        { d:'M29.4 93 Q25 82 22 66.6 L24 68.6 L23.6 65 L26 67.4 L26.2 63.6 L28.2 66.6 Q29 78 30.6 91.4 Z', tone:'base', from:3 },
        { d:'M30.6 93 Q35 82 38 66.6 L36 68.6 L36.4 65 L34 67.4 L33.8 63.6 L31.8 66.6 Q31 78 29.4 91.4 Z', tone:'base', from:3 },
        { d:'M29.4 91 Q29 78 29.2 62.6 L30 65 L30.8 62.6 Q31 78 30.6 91 Z', tone:'light', from:3 },

        { d:'M29.4 95 Q20.6 87 11.4 76.6 L13.6 77.4 L12.4 74.6 L15.4 75.6 L15 72.4 L18 74.6 Q23.4 82 30.6 93 Z', tone:'deep', from:4 },
        { d:'M30.6 95 Q39.4 87 48.6 76.6 L46.4 77.4 L47.6 74.6 L44.6 75.6 L45 72.4 L42 74.6 Q36.6 82 29.4 93 Z', tone:'deep', from:4 },
        { d:'M29.4 93.4 Q23.4 80 19.6 58.6 L21.6 61 L21.4 57 L24 59.6 L24.4 55.6 L26.6 59 Q28 74 30.6 92 Z', tone:'base', from:4 },
        { d:'M30.6 93.4 Q36.6 80 40.4 58.6 L38.4 61 L38.6 57 L36 59.6 L35.6 55.6 L33.4 59 Q32 74 29.4 92 Z', tone:'base', from:4 },
        { d:'M29.4 91.4 Q28.6 76 28.8 54 L29.8 56.6 L30.8 54 Q31.4 76 30.6 91.4 Z', tone:'light', from:4 },

        { d:'M29.4 93.6 Q22 78 17.4 50.6 L19.4 53.4 L19.4 49 L22 52 L22.6 47.6 L25 51.4 Q27.4 70 30.6 92.4 Z', tone:'base', from:5 },
        { d:'M30.6 93.6 Q38 78 42.6 50.6 L40.6 53.4 L40.6 49 L38 52 L37.4 47.6 L35 51.4 Q32.6 70 29.4 92.4 Z', tone:'base', from:5 },
        { d:'M29.4 91.6 Q28.4 72 28.4 44 L29.6 47 L30.4 47 L31.6 44 Q31.6 72 30.6 91.6 Z', tone:'light', from:5 },
        { d:'M25.4 90 Q19.6 78 15 62 L17 64.4 L16.6 60.6 L19.4 63 Q22 76 26.6 89 Z', tone:'deep', from:5 },
        { d:'M34.6 90 Q40.4 78 45 62 L43 64.4 L43.4 60.6 L40.6 63 Q38 76 33.4 89 Z', tone:'deep', from:5 },
        { d:'M28.8 44 L28.8 24 L31.2 24 L31.2 44 Z', tone:'stemdark', from:5 },
        { c:[30,21.6,3.4], tone:'light', from:5 },
        { c:[26.4,27,2.8], tone:'base', from:5 },
        { c:[33.6,28.6,2.8], tone:'base', from:5 }
      ],
      blossoms: [[30,21.6],[26.4,27],[33.6,28.6],[24,66],[36,66],[30,58],[20,76],[40,76],[30,48]]
    },

    apple:{
      trunk: 'M26.6 96 Q28.6 76 28 56 L32 56 Q31.4 76 33.4 96 Z',
      trunkShort: 'M27.4 96 Q28.8 86 28.4 72 L31.6 72 Q31.2 86 32.6 96 Z',
      parts: [
        { c:[30,66,12.6], tone:'stemdark', from:2, to:2 },
        { c:[24.6,62,7.4], tone:'stem', from:2, to:2 },
        { c:[35,63.4,6], tone:'stem', from:2, to:2 },

        { c:[30,56,13.4], tone:'stemdark', from:3 },
        { c:[18.6,58.6,8.6], tone:'stemdark', from:3 },
        { c:[41.4,58.6,8.6], tone:'stemdark', from:3 },
        { c:[24.6,50.6,8], tone:'stem', from:3 },
        { c:[36,52,7], tone:'stem', from:3 },

        { c:[30,46,13.6], tone:'stemdark', from:4 },
        { c:[15.4,54,9], tone:'stemdark', from:4 },
        { c:[44.6,54,9], tone:'stemdark', from:4 },
        { c:[22.6,42,8.4], tone:'stem', from:4 },
        { c:[37.4,42.6,8], tone:'stem', from:4 },
        { c:[30,38,7.4], tone:'stem', from:4 },

        { c:[30,38,13.6], tone:'stemdark', from:5 },
        { c:[13.4,50,8.4], tone:'stemdark', from:5 },
        { c:[46.6,50,8.4], tone:'stemdark', from:5 },
        { c:[21.4,34,8.4], tone:'stem', from:5 },
        { c:[38.6,34,8.4], tone:'stem', from:5 },
        { c:[30,28,7.6], tone:'stem', from:5 },

        { d:'M23.4 64 L23 60.6 L24.6 60.6 L25 64 Z', tone:'stemdark', from:4 },
        { c:[24,67,3.4], tone:'base', from:4 },
        { c:[22.8,65.8,1.4], tone:'light', from:4 },
        { d:'M36.4 62 L36 58.6 L37.6 58.6 L38 62 Z', tone:'stemdark', from:4 },
        { c:[37,65,3.2], tone:'base', from:4 },
        { c:[35.8,63.8,1.3], tone:'light', from:4 },
        { c:[30,60,3], tone:'base', from:4 },
        { c:[29,59,1.2], tone:'light', from:4 },

        { c:[17.4,60,3], tone:'base', from:5 },
        { c:[16.4,59,1.2], tone:'light', from:5 },
        { c:[43,60,3.2], tone:'base', from:5 },
        { c:[42,59,1.3], tone:'light', from:5 },
        { c:[27,50,3], tone:'base', from:5 },
        { c:[26,49,1.2], tone:'light', from:5 },
        { c:[34.6,48.6,3.2], tone:'base', from:5 },
        { c:[33.6,47.6,1.3], tone:'light', from:5 },
        { c:[21,48,2.8], tone:'base', from:5 },
        { c:[40,46.6,2.8], tone:'base', from:5 }
      ],
      blossoms: [[24,67],[37,65],[30,60],[17.4,60],[43,60],[27,50],[34.6,48.6],[21,48],[40,46.6]]
    },

    carrot:{
      trunk:'M28.4 96 Q28.8 90 30 87.4 Q31.2 90 31.6 96 Z',
      trunkShort:'M28.8 96 Q29.2 93 30 91.4 Q30.8 93 31.2 96 Z',
      trunkTone:'stemdark',
      parts:[
        { raw:'<g><path class="t-stemdark" d="M28.4 81.0 L30.9 85.5 L30.3 86.7 L31.1 88.7 L30.0 90.0 L28.2 85.5 L29.2 86.7 L28.8 88.7 Z" transform="rotate(-52 30 91.6) translate(0 1.60)"/><path class="t-stemdark" d="M28.4 81.0 L30.9 85.5 L30.3 86.7 L31.1 88.7 L30.0 90.0 L28.2 85.5 L29.2 86.7 L28.8 88.7 Z" transform="rotate(-28 30 91.6) translate(0 1.60)"/><path class="t-stemdark" d="M31.6 81.0 L31.8 85.5 L30.8 86.7 L31.2 88.7 L30.0 90.0 L29.1 85.5 L29.7 86.7 L28.9 88.7 Z" transform="rotate(30 30 91.6) translate(0 1.60)"/><path class="t-stemdark" d="M31.6 81.0 L31.8 85.5 L30.8 86.7 L31.2 88.7 L30.0 90.0 L29.1 85.5 L29.7 86.7 L28.9 88.7 Z" transform="rotate(54 30 91.6) translate(0 1.60)"/></g>', from:2, to:2 },
        { raw:'<g><path class="t-stem" d="M28.4 81.0 L30.9 85.5 L30.3 86.7 L31.1 88.7 L30.0 90.0 L28.2 85.5 L29.2 86.7 L28.8 88.7 Z" transform="rotate(-12 30 91.6) translate(0 0.10)"/><path class="t-stem" d="M31.6 81.0 L31.8 85.5 L30.8 86.7 L31.2 88.7 L30.0 90.0 L29.1 85.5 L29.7 86.7 L28.9 88.7 Z" transform="rotate(10 30 91.6) translate(0 0.10)"/></g>', from:2, to:2 },
        { raw:'<g><path class="t-stem" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-2 30 91.6) translate(0 1.60)"/></g>', from:2, to:2 },
        { raw:'<g><path class="t-stemdark" d="M28.4 81.0 L30.9 85.5 L30.3 86.7 L31.1 88.7 L30.0 90.0 L28.2 85.5 L29.2 86.7 L28.8 88.7 Z" transform="rotate(-58 30 88.6) translate(0 -1.40)"/><path class="t-stemdark" d="M31.6 81.0 L31.8 85.5 L30.8 86.7 L31.2 88.7 L30.0 90.0 L29.1 85.5 L29.7 86.7 L28.9 88.7 Z" transform="rotate(56 30 88.6) translate(0 -1.40)"/></g>', from:3, to:3 },
        { raw:'<g><path class="t-stemdark" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-46 30 88.6) translate(0 -1.40)"/><path class="t-stemdark" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-26 30 88.6) translate(0 -1.40)"/><path class="t-stemdark" d="M32.5 76.0 L32.5 80.7 L31.4 81.9 L32.1 85.3 L30.9 86.5 L31.3 88.6 L30.0 90.0 L28.6 85.3 L29.5 86.5 L29.9 80.7 L30.4 81.9 L28.8 88.6 Z" transform="rotate(24 30 88.6) translate(0 -1.40)"/><path class="t-stemdark" d="M32.5 76.0 L32.5 80.7 L31.4 81.9 L32.1 85.3 L30.9 86.5 L31.3 88.6 L30.0 90.0 L28.6 85.3 L29.5 86.5 L29.9 80.7 L30.4 81.9 L28.8 88.6 Z" transform="rotate(44 30 88.6) translate(0 -1.40)"/></g>', from:3, to:3 },
        { raw:'<g><path class="t-stem" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-34 30 88.6) translate(0 -3.40)"/><path class="t-stem" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-12 30 88.6) translate(0 -3.40)"/><path class="t-stem" d="M32.5 76.0 L32.5 80.7 L31.4 81.9 L32.1 85.3 L30.9 86.5 L31.3 88.6 L30.0 90.0 L28.6 85.3 L29.5 86.5 L29.9 80.7 L30.4 81.9 L28.8 88.6 Z" transform="rotate(8 30 88.6) translate(0 -3.40)"/><path class="t-stem" d="M32.5 76.0 L32.5 80.7 L31.4 81.9 L32.1 85.3 L30.9 86.5 L31.3 88.6 L30.0 90.0 L28.6 85.3 L29.5 86.5 L29.9 80.7 L30.4 81.9 L28.8 88.6 Z" transform="rotate(30 30 88.6) translate(0 -3.40)"/></g>', from:3, to:3 },
        { raw:'<g><path class="t-stem" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-6 30 88.6) translate(0 -2.40)"/><path class="t-stem" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(10 30 88.6) translate(0 -2.40)"/></g>', from:3, to:3 },
        { raw:'<g><path class="t-stemdark" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-56 30 85) translate(0 -5.00)"/><path class="t-stemdark" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-34 30 85) translate(0 -5.00)"/><path class="t-stemdark" d="M32.5 76.0 L32.5 80.7 L31.4 81.9 L32.1 85.3 L30.9 86.5 L31.3 88.6 L30.0 90.0 L28.6 85.3 L29.5 86.5 L29.9 80.7 L30.4 81.9 L28.8 88.6 Z" transform="rotate(36 30 85) translate(0 -5.00)"/><path class="t-stemdark" d="M32.5 76.0 L32.5 80.7 L31.4 81.9 L32.1 85.3 L30.9 86.5 L31.3 88.6 L30.0 90.0 L28.6 85.3 L29.5 86.5 L29.9 80.7 L30.4 81.9 L28.8 88.6 Z" transform="rotate(54 30 85) translate(0 -5.00)"/></g>', from:4, to:4 },
        { raw:'<g><path class="t-stemdark" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-44 30 85) translate(0 -5.00)"/><path class="t-stemdark" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-20 30 85) translate(0 -5.00)"/><path class="t-stemdark" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(16 30 85) translate(0 -5.00)"/><path class="t-stemdark" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(42 30 85) translate(0 -5.00)"/></g>', from:4, to:4 },
        { raw:'<g><path class="t-stem" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-30 30 85) translate(0 -7.00)"/><path class="t-stem" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-8 30 85) translate(0 -7.00)"/><path class="t-stem" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(6 30 85) translate(0 -7.00)"/><path class="t-stem" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(26 30 85) translate(0 -7.00)"/></g>', from:4, to:4 },
        { raw:'<g><path class="t-stem" d="M25.6 65.0 L28.5 70.0 L28.0 71.3 L30.0 75.0 L29.2 76.3 L31.2 80.0 L30.2 81.3 L32.1 85.0 L30.8 86.3 L31.6 88.5 L30.0 90.0 L27.4 85.0 L28.9 86.3 L27.1 80.0 L28.5 81.3 L26.5 75.0 L27.8 76.3 L25.6 70.0 L26.8 71.3 L28.4 88.5 Z" transform="rotate(-14 30 85) translate(0 -6.00)"/><path class="t-stem" d="M34.4 65.0 L34.4 70.0 L33.2 71.3 L33.5 75.0 L32.2 76.3 L32.9 80.0 L31.5 81.3 L32.6 85.0 L31.1 86.3 L31.6 88.5 L30.0 90.0 L27.9 85.0 L29.2 86.3 L28.8 80.0 L29.8 81.3 L30.0 75.0 L30.8 76.3 L31.5 70.0 L32.0 71.3 L28.4 88.5 Z" transform="rotate(10 30 85) translate(0 -6.00)"/></g>', from:4, to:4 },
        { raw:'<g><path class="t-stemdark" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-58 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M27.5 76.0 L30.1 80.7 L29.6 81.9 L31.4 85.3 L30.5 86.5 L31.2 88.6 L30.0 90.0 L27.9 85.3 L29.1 86.5 L27.5 80.7 L28.6 81.9 L28.7 88.6 Z" transform="rotate(-42 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M32.5 76.0 L32.5 80.7 L31.4 81.9 L32.1 85.3 L30.9 86.5 L31.3 88.6 L30.0 90.0 L28.6 85.3 L29.5 86.5 L29.9 80.7 L30.4 81.9 L28.8 88.6 Z" transform="rotate(44 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M32.5 76.0 L32.5 80.7 L31.4 81.9 L32.1 85.3 L30.9 86.5 L31.3 88.6 L30.0 90.0 L28.6 85.3 L29.5 86.5 L29.9 80.7 L30.4 81.9 L28.8 88.6 Z" transform="rotate(58 30 82) translate(0 -8.00)"/></g>', from:5 },
        { raw:'<g><path class="t-stemdark" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-46 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-30 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-14 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(12 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(28 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(46 30 82) translate(0 -8.00)"/></g>', from:5 },
        { raw:'<g><path class="t-stemdark" d="M25.6 65.0 L28.5 70.0 L28.0 71.3 L30.0 75.0 L29.2 76.3 L31.2 80.0 L30.2 81.3 L32.1 85.0 L30.8 86.3 L31.6 88.5 L30.0 90.0 L27.4 85.0 L28.9 86.3 L27.1 80.0 L28.5 81.3 L26.5 75.0 L27.8 76.3 L25.6 70.0 L26.8 71.3 L28.4 88.5 Z" transform="rotate(-22 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M34.4 65.0 L34.4 70.0 L33.2 71.3 L33.5 75.0 L32.2 76.3 L32.9 80.0 L31.5 81.3 L32.6 85.0 L31.1 86.3 L31.6 88.5 L30.0 90.0 L27.9 85.0 L29.2 86.3 L28.8 80.0 L29.8 81.3 L30.0 75.0 L30.8 76.3 L31.5 70.0 L32.0 71.3 L28.4 88.5 Z" transform="rotate(0 30 82) translate(0 -8.00)"/><path class="t-stemdark" d="M34.4 65.0 L34.4 70.0 L33.2 71.3 L33.5 75.0 L32.2 76.3 L32.9 80.0 L31.5 81.3 L32.6 85.0 L31.1 86.3 L31.6 88.5 L30.0 90.0 L27.9 85.0 L29.2 86.3 L28.8 80.0 L29.8 81.3 L30.0 75.0 L30.8 76.3 L31.5 70.0 L32.0 71.3 L28.4 88.5 Z" transform="rotate(20 30 82) translate(0 -8.00)"/></g>', from:5 },
        { raw:'<g><path class="t-stem" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-38 30 82) translate(0 -10.00)"/><path class="t-stem" d="M26.5 70.0 L29.3 75.0 L28.8 76.3 L30.7 80.0 L29.9 81.3 L31.8 85.0 L30.7 86.3 L31.4 88.5 L30.0 90.0 L27.6 85.0 L29.0 86.3 L27.3 80.0 L28.5 81.3 L26.5 75.0 L27.7 76.3 L28.5 88.5 Z" transform="rotate(-20 30 82) translate(0 -10.00)"/><path class="t-stem" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(16 30 82) translate(0 -10.00)"/><path class="t-stem" d="M33.5 70.0 L33.5 75.0 L32.3 76.3 L32.7 80.0 L31.5 81.3 L32.4 85.0 L31.0 86.3 L31.5 88.5 L30.0 90.0 L28.2 85.0 L29.3 86.3 L29.3 80.0 L30.1 81.3 L30.7 75.0 L31.2 76.3 L28.6 88.5 Z" transform="rotate(34 30 82) translate(0 -10.00)"/></g>', from:5 },
        { raw:'<g><path class="t-stem" d="M25.6 65.0 L28.5 70.0 L28.0 71.3 L30.0 75.0 L29.2 76.3 L31.2 80.0 L30.2 81.3 L32.1 85.0 L30.8 86.3 L31.6 88.5 L30.0 90.0 L27.4 85.0 L28.9 86.3 L27.1 80.0 L28.5 81.3 L26.5 75.0 L27.8 76.3 L25.6 70.0 L26.8 71.3 L28.4 88.5 Z" transform="rotate(-12 30 82) translate(0 -12.00)"/><path class="t-stem" d="M34.4 65.0 L34.4 70.0 L33.2 71.3 L33.5 75.0 L32.2 76.3 L32.9 80.0 L31.5 81.3 L32.6 85.0 L31.1 86.3 L31.6 88.5 L30.0 90.0 L27.9 85.0 L29.2 86.3 L28.8 80.0 L29.8 81.3 L30.0 75.0 L30.8 76.3 L31.5 70.0 L32.0 71.3 L28.4 88.5 Z" transform="rotate(8 30 82) translate(0 -12.00)"/></g>', from:5 },
        { d:'M30 90.4 C31.6 90.6 32.5 91.4 32.6 92.6 C32.7 94 31.6 94.8 31 96 L29 96 C28.4 94.8 27.3 94 27.4 92.6 C27.5 91.4 28.4 90.6 30 90.4 Z', tone:'base', from:2, to:2 },
        { d:'M30 87 C32.6 87.3 34 88.6 34.1 90.4 C34.2 92.6 32.6 94.2 31.2 96 L28.8 96 C27.4 94.2 25.8 92.6 25.9 90.4 C26 88.6 27.4 87.3 30 87 Z', tone:'base', from:3, to:3 },
        { d:'M29.4 87.4 C27.8 88 27.2 89.2 27.3 90.6 C27.4 92.6 28.4 94.2 28.8 96 L27.9 96 C26.7 94 25.9 92.4 25.9 90.4 C26 88.7 27.3 87.6 29.4 87.4 Z', tone:'light', from:3, to:3 },
        { d:'M30 83.4 C33.6 83.8 35.9 85.8 36.1 88.4 C36.3 91.6 33.9 94 31.6 96 L28.4 96 C26.1 94 23.7 91.6 23.9 88.4 C24.1 85.8 26.4 83.8 30 83.4 Z', tone:'base', from:4, to:4 },
        { d:'M29 83.8 C26.2 84.4 24.2 86.2 24 88.4 C23.8 91.4 26 94 27.6 96 L28.8 96 C27.2 93.8 25.6 91.2 25.8 88.6 C26 86.4 27.4 84.8 29 83.8 Z', tone:'light', from:4, to:4 },
        { d:'M33 85.6 C35 86.6 36 87.2 36.1 88.4 C36.3 91.6 33.9 94 31.6 96 L30.8 96 C32.8 94 34.4 91.6 34.2 88.8 C34.1 87.6 33.6 86.4 33 85.6 Z', tone:'clay', from:4, to:4 },
        { d:'M25.8 86.4 Q30 88.8 34.2 86.4 Q30 87.6 25.8 86.4 Z', tone:'deep', from:4, to:4 },
        { d:'M30 79 C34.4 79.4 37.2 81.8 37.4 85 C37.6 89 34.6 92 31.6 96 L28.4 96 C25.4 92 22.4 89 22.6 85 C22.8 81.8 25.6 79.4 30 79 Z', tone:'base', from:5 },
        { d:'M28.8 79.4 C25.6 80 23.4 82 22.8 85 C22.6 88.8 25.4 92 27.4 96 L28.8 96 C26.6 92 24.2 88.6 24.4 85.2 C24.6 82.6 26.4 80.6 28.8 79.4 Z', tone:'light', from:5 },
        { d:'M33.4 81.6 C35.8 82.6 37.2 83.6 37.4 85 C37.6 89 34.6 92 31.6 96 L30.8 96 C33 92.4 35.4 89 35.2 85.6 C35.1 84 34.4 82.6 33.4 81.6 Z', tone:'clay', from:5 },
        { d:'M23.8 84.4 Q30 87.4 36.2 84.4 Q30 85.8 23.8 84.4 Z', tone:'deep', from:5 }
      ],
      blossoms:[[30,77.4],[26,79.6],[34,79.6],[22.6,79],[37.4,79],[27,74],[33,74],[30,70],[30,84]]
    },

    corn:{
      trunk: 'M28.5 96 L28.5 46 L31.5 46 L31.5 96 Z',
      trunkShort: 'M28.7 96 L28.7 72 L31.3 72 L31.3 96 Z',
      trunkTone: 'stem',
      parts: [
        { d:'M29.4 90 Q19 86.6 13.4 76 Q22.6 80.6 30.4 87.4 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.6 85 Q40.6 81.6 46 71.4 Q37 76 29.6 82.4 Z', tone:'stem', from:2, to:2 },
        { d:'M30 76 Q24.6 71.4 23 62.6 Q28.6 68.6 30.6 74.6 Z', tone:'stem', from:2, to:2 },

        { d:'M29.4 89 Q16 85 9.6 71.4 Q20 77.4 30.6 86.4 Z', tone:'stemdark', from:3 },
        { d:'M30.6 82 Q44 78 50.4 64.6 Q40 70.6 29.4 79.4 Z', tone:'stemdark', from:3 },
        { d:'M29.4 72 Q17.6 68 12 55.4 Q22 61.4 30.6 69.4 Z', tone:'stem', from:3 },
        { d:'M30.6 64 Q42.4 60.6 48 49 Q38 54.6 29.4 61.4 Z', tone:'stem', from:3 },

        { d:'M28.7 50 L28.7 30 L31.3 30 L31.3 50 Z', tone:'stem', from:4 },
        { d:'M29.4 56 Q19.6 52.6 14.6 42 Q23.4 48 30.6 53.4 Z', tone:'stem', from:4 },
        { d:'M30.6 48 Q40.4 44.6 45.4 34.6 Q36.6 40.6 29.4 45.4 Z', tone:'stem', from:4 },

        { d:'M28.8 34 L28.8 16 L31.2 16 L31.2 34 Z', tone:'stem', from:5 },
        { d:'M29.4 40 Q21 36.6 17 28 Q24.6 33 30.6 37.4 Z', tone:'stem', from:5 },
        { d:'M30.6 32 Q39 28.6 43 20 Q35.4 25 29.4 29.4 Z', tone:'stemdark', from:5 },

        { d:'M31.4 70 Q37.4 67.4 40.4 57 Q35.6 52.6 31.6 60.6 Z', tone:'stemdark', from:4 },
        { d:'M33.4 63 Q37.4 58.6 40.4 48.6 Q42.6 43.6 38.4 45 Q34.4 50.6 31.8 60 Z', tone:'base', from:4 },
        { d:'M35.4 59.4 Q38 55 40 48 Q41.4 45 39 46.4 Q36.4 51 34.4 58 Z', tone:'light', from:4 },
        { d:'M39.4 45.4 Q42.6 41 46 39.4 Q43 43.6 40.6 46.6 Z', tone:'seedhead-light', from:4 },

        { d:'M28.6 78 Q22.6 76 19.6 66 Q24.4 61.6 28.4 69.6 Z', tone:'stemdark', from:5 },
        { d:'M26.6 71 Q22.6 66.6 19.6 57 Q17.4 52.6 21.6 54 Q25.6 59.4 28.2 68.6 Z', tone:'base', from:5 },
        { d:'M24.6 67.4 Q22 63 20 56 Q18.6 53 21 54.4 Q23.6 59 25.6 66 Z', tone:'light', from:5 },

        { d:'M30 32 Q26.6 25.4 25.4 18 Q29.4 24.6 30.6 30.6 Z', tone:'seedhead-light', from:4, to:4 },
        { d:'M30 32 Q33.4 25.4 34.6 18 Q30.6 24.6 29.4 30.6 Z', tone:'seedhead', from:4, to:4 },
        { d:'M30 18 Q26 10.6 24.6 3.4 Q29 10 30.6 16.6 Z', tone:'seedhead-light', from:5 },
        { d:'M30 18 Q34 10.6 35.4 3.4 Q31 10 29.4 16.6 Z', tone:'seedhead', from:5 },
        { d:'M29.4 20 Q29.4 11 30 3.6 Q30.6 11 30.6 20 Z', tone:'seedhead-light', from:5 }
      ],
      blossoms: [[35.4,58],[38.6,50],[24.6,68],[22,60],[30,44],[41,46],[27,75],[30,36],[30,26]]
    },

    cucumber:{
      trunk: 'M19 95.6 Q27 92 29.2 64 L30.8 64 Q33 92 41 95.6 Q32.6 90.6 30 74 Q27.4 90.6 19 95.6 Z',
      trunkShort: 'M23 95.8 Q28.6 93 29.4 80 L30.6 80 Q31.4 93 37 95.8 Q31.4 91.4 30 84 Q28.6 91.4 23 95.8 Z',
      trunkTone: 'stemdark',
      parts: [
        { d:'M29.6 86 Q22.6 85.4 19 79.6 Q20.4 74.6 25 76 Q27.4 73.6 30.4 78.6 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.4 80 Q37.4 79.4 41 73.6 Q39.6 68.6 35 70 Q32.6 67.6 29.6 72.6 Z', tone:'stem', from:2, to:2 },
        { d:'M29.6 74 Q24.6 73.4 22 68.6 Q23.4 64.6 27 66 Q28.6 64 30.4 67.6 Z', tone:'stem', from:2, to:2 },

        { d:'M29.6 88 Q20.6 87.4 16 80.6 Q17.6 74 23.4 76 Q26.6 72.6 30.4 79.4 Z', tone:'stemdark', from:3 },
        { d:'M30.4 82 Q39.4 81.4 44 74.6 Q42.4 68 36.6 70 Q33.4 66.6 29.6 73.4 Z', tone:'stemdark', from:3 },
        { d:'M29.6 74 Q22.6 73.4 19 67 Q20.6 61.4 25.4 63.4 Q28 60.6 30.4 66 Z', tone:'stem', from:3 },
        { d:'M45 78.6 Q50.6 76 48.6 70 Q47.6 74.6 44 76.4 Z', tone:'stem', from:3 },

        { d:'M29.6 78 Q18 77.4 12.6 68.6 Q14.6 60.6 21.6 63.4 Q25.4 59 30.4 68 Z', tone:'stem', from:4 },
        { d:'M30.4 70 Q42 69.4 47.4 60.6 Q45.4 52.6 38.4 55.4 Q34.6 51 29.6 60 Z', tone:'stem', from:4 },
        { d:'M29.4 64 L29.4 54 L30.6 54 L30.6 64 Z', tone:'stemdark', from:4 },
        { d:'M29.6 60 Q23.4 59.4 19.6 53 Q21.4 47 26.6 49.4 Q29 46 30.4 52 Z', tone:'stem', from:4 },

        { d:'M30.4 60 Q40.4 59.4 45.4 52 Q43.6 45 37.4 47.4 Q34 43.6 29.6 51 Z', tone:'stemdark', from:5 },
        { d:'M29.4 54 L29.4 42 L30.6 42 L30.6 54 Z', tone:'stemdark', from:5 },
        { d:'M29.6 48 Q21.6 47.4 17 40 Q18.8 33.4 24.6 36 Q27.6 32.6 30.4 39.4 Z', tone:'stem', from:5 },
        { d:'M30.4 42 Q38.4 41.4 43 34.6 Q41.2 28 35.4 30.6 Q32.4 27 29.6 33.4 Z', tone:'stem', from:5 },
        { d:'M13.6 66 Q8 63.4 10 57.4 Q11 62 14.6 63.6 Z', tone:'stem', from:5 },

        // A long fat cylinder with rounded ends, hanging clear of the leaves:
        // the shape is the whole difference between this and the watermelon.
        { d:'M36 74.6 C39.4 73.4 41.4 75.4 40.6 79.4 C39.8 83.4 38.6 87.4 37.4 90.6 C36.6 93.4 33.6 93 33.8 90 C34.2 85.4 34.6 79.4 34.6 77 C34.6 75.4 35 74.8 36 74.6 Z', tone:'deep', from:3, to:3 },
        { d:'M37 77 C38.6 76.6 39.2 77.6 38.8 80 C38.2 83.4 37.2 86.6 36.4 89 C36 90.6 35.4 89.8 35.6 87.6 C35.8 83.4 36.4 78.6 36.6 77.6 Z', tone:'base', from:3, to:3 },
        { d:'M35.6 75 L35 71.4 L38 71 L38.2 74.6 Z', tone:'stemdark', from:3, to:3 },

        { d:'M36.6 68.6 C40.6 67 43.4 69.4 42.4 74 C41.4 79.4 39.6 86.6 38 91.4 C37 94.6 33.4 94 33.6 90.6 C34 85 34.6 77.4 34.6 72 C34.6 69.6 35 69 36.6 68.6 Z', tone:'deep', from:4 },
        { d:'M37.8 71.4 C39.8 70.8 40.6 72 40 75 C39 80 37.6 85.6 36.6 89.6 C36 91.6 35.4 90.6 35.6 88 C36 82.6 36.8 75.4 37 72.6 Z', tone:'base', from:4 },
        { d:'M39 74.6 Q41.4 75.4 40.6 78.6 Q39.4 76.6 38.4 76 Z', tone:'light', from:4 },
        { d:'M37.8 82.6 Q40.2 83.4 39.4 86.6 Q38.2 84.6 37.2 84 Z', tone:'light', from:4 },
        { d:'M36 69 L35.4 65.4 L38.4 65 L38.6 68.6 Z', tone:'stemdark', from:4 },

        { d:'M23.4 68.6 C19.4 67 16.6 69.4 17.6 74 C18.6 79.4 20.4 86.6 22 91.4 C23 94.6 26.6 94 26.4 90.6 C26 85 25.4 77.4 25.4 72 C25.4 69.6 25 69 23.4 68.6 Z', tone:'deep', from:5 },
        { d:'M22.2 71.4 C20.2 70.8 19.4 72 20 75 C21 80 22.4 85.6 23.4 89.6 C24 91.6 24.6 90.6 24.4 88 C24 82.6 23.2 75.4 23 72.6 Z', tone:'base', from:5 },
        { d:'M21 74.6 Q18.6 75.4 19.4 78.6 Q20.6 76.6 21.6 76 Z', tone:'light', from:5 },
        { d:'M22.2 82.6 Q19.8 83.4 20.6 86.6 Q21.8 84.6 22.8 84 Z', tone:'light', from:5 },
        { d:'M24 69 L24.6 65.4 L21.6 65 L21.4 68.6 Z', tone:'stemdark', from:5 }
      ],
      blossoms: [[38,80],[22,80],[30,58],[16.6,68],[44,62],[30,68],[20,42],[40,36],[30,46]]
    },

    dragonfruit:{
      trunk: 'M27.4 96 L27.4 46 L32.6 46 L32.6 96 Z',
      trunkShort: 'M27.8 96 L27.8 70 L32.2 70 L32.2 96 Z',
      trunkTone: 'wood',
      parts: [
        { d:'M29 70 Q23.4 72.6 21.4 80 Q20.4 84.6 24 84.6 Q26 82.6 25 78 Q26 74 30 72.6 Z', tone:'stemdark', from:2, to:2 },
        { d:'M31 70 Q36.6 72.6 38.6 80 Q39.6 84.6 36 84.6 Q34 82.6 35 78 Q34 74 30 72.6 Z', tone:'stem', from:2, to:2 },
        { d:'M28.4 71 Q28 76 29.4 80 L30.6 80 Q31.4 76 31.6 71 Z', tone:'stem', from:2, to:2 },

        { d:'M28.6 46 Q21.4 49.4 18.6 60 Q16.6 68.6 21 70.6 Q24.6 69 23 60.6 Q24.4 53.4 30 50.6 Z', tone:'stemdark', from:3 },
        { d:'M31.4 46 Q38.6 49.4 41.4 60 Q43.4 68.6 39 70.6 Q35.4 69 37 60.6 Q35.6 53.4 30 50.6 Z', tone:'stemdark', from:3 },
        { d:'M28.4 47 Q27.4 56 28.6 64 L31.4 64 Q32.6 56 31.6 47 Z', tone:'stem', from:3 },
        { d:'M21.4 58 L18.6 56.6 L21 55 Z', tone:'stem', from:3 },
        { d:'M38.6 58 L41.4 56.6 L39 55 Z', tone:'stem', from:3 },

        { d:'M28.6 46 Q19.4 51 15.6 64 Q12.6 76.6 17.4 79.4 Q21.6 78 19.4 66 Q21.4 56 29.4 51.4 Z', tone:'stem', from:4 },
        { d:'M31.4 46 Q40.6 51 44.4 64 Q47.4 76.6 42.6 79.4 Q38.4 78 40.6 66 Q38.6 56 30.6 51.4 Z', tone:'stem', from:4 },
        { d:'M18 62 L14.6 60.6 L17.4 58.6 Z', tone:'stemdark', from:4 },
        { d:'M42 62 L45.4 60.6 L42.6 58.6 Z', tone:'stemdark', from:4 },
        { d:'M17 71 L13.4 70 L16.6 67.4 Z', tone:'stemdark', from:4 },
        { d:'M43 71 L46.6 70 L43.4 67.4 Z', tone:'stemdark', from:4 },

        { d:'M28.6 47 Q17.4 54 13 70 Q9.6 84.6 14.6 88 Q19.6 86.6 17 71.4 Q19.4 58 29.4 52.6 Z', tone:'stemdark', from:5 },
        { d:'M31.4 47 Q42.6 54 47 70 Q50.4 84.6 45.4 88 Q40.4 86.6 43 71.4 Q40.6 58 30.6 52.6 Z', tone:'stemdark', from:5 },
        { d:'M28.4 48 Q26.6 60 28.6 72 L31.4 72 Q33.4 60 31.6 48 Z', tone:'stem', from:5 },
        { d:'M14.6 79 L11 78.4 L14 75.4 Z', tone:'stem', from:5 },
        { d:'M45.4 79 L49 78.4 L46 75.4 Z', tone:'stem', from:5 },

        { d:'M36.6 82 Q31.6 78.6 32.4 71 Q34 64.6 37.6 65.4 Q41.4 66.6 41.4 73 Q41.4 79.4 36.6 82 Z', tone:'base', from:4 },
        { d:'M34.6 77.4 Q33.6 72 35.4 68 Q36.6 66.6 37.4 69 Q35.6 72.6 35.6 77.6 Z', tone:'light', from:4 },
        { d:'M40.4 68 L44 65.4 L42.6 69.6 Z', tone:'stemdark', from:4 },
        { d:'M41.4 74.6 L45.4 73 L43.4 77 Z', tone:'stemdark', from:4 },
        { d:'M33.4 66.6 L34.6 62.6 L36.6 66 Z', tone:'stemdark', from:4 },

        { d:'M23 90 Q18 86.6 18.6 79.4 Q20.4 73 24 73.8 Q27.6 75 27.6 81.4 Q27.6 87.4 23 90 Z', tone:'base', from:5 },
        { d:'M21 85.4 Q20 80.4 21.6 76.4 Q22.8 75 23.6 77.4 Q21.8 80.6 21.8 85.6 Z', tone:'light', from:5 },
        { d:'M18.8 76.6 L15.4 74 L17 78.4 Z', tone:'stemdark', from:5 },
        { d:'M18 83 L14 81.6 L16 85.6 Z', tone:'stemdark', from:5 },
        { d:'M25.6 75 L24.6 71 L22.4 74.4 Z', tone:'stemdark', from:5 }
      ],
      blossoms: [[36.6,74],[23,82],[30,60],[19.4,66],[40.6,66],[16.6,78],[43.4,78],[30,50],[30,68]]
    },

    eggplant:{
      trunk: 'M28.4 96 L28.4 54 L31.6 54 L31.6 96 Z',
      trunkShort: 'M28.8 96 L28.8 76 L31.2 76 L31.2 96 Z',
      trunkTone: 'stem',
      parts: [
        { d:'M29.4 88 Q19.4 86 15 76.6 Q20.6 70.6 26.6 75.4 Q29.4 78.6 30.4 84.6 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.6 84 Q40.6 82 45 72.6 Q39.4 66.6 33.4 71.4 Q30.6 74.6 29.6 80.6 Z', tone:'stem', from:2, to:2 },
        { d:'M29.6 78 Q22 76.4 19.4 69 Q23.4 64.6 28 68 Q29.6 70.6 30.4 75 Z', tone:'stem', from:2, to:2 },

        { d:'M29.4 89 Q17.4 87 12.6 76 Q19 69 26 74.6 Q29.4 78.4 30.6 85.4 Z', tone:'stemdark', from:3 },
        { d:'M30.6 84 Q42.6 82 47.4 71 Q41 64 34 69.6 Q30.6 73.4 29.4 80.4 Z', tone:'stemdark', from:3 },
        { d:'M29.4 74 Q18.6 72 14.6 62 Q20.6 55.4 27 60.6 Q29.6 64 30.6 70.4 Z', tone:'stem', from:3 },
        { d:'M30.6 68 Q41.4 66 45.4 56 Q39.4 49.4 33 54.6 Q30.4 58 29.4 64.4 Z', tone:'stem', from:3 },

        { d:'M29.4 60 Q19.6 58 16 48.6 Q21.6 42.6 27.4 47.4 Q29.6 50.6 30.6 56.6 Z', tone:'stem', from:4 },
        { d:'M30.6 55 Q40.4 53 44 43.6 Q38.4 37.6 32.6 42.4 Q30.4 45.6 29.4 51.6 Z', tone:'stem', from:4 },

        { d:'M28.8 58 L28.8 40 L31.2 40 L31.2 58 Z', tone:'stem', from:5 },
        { d:'M29.4 46 Q20.6 44 17.4 35.4 Q22.6 30 27.6 34.4 Q29.6 37.4 30.6 42.6 Z', tone:'stem', from:5 },
        { d:'M30.6 40 Q39.4 38 42.6 29.4 Q37.4 24 32.4 28.4 Q30.4 31.4 29.4 36.6 Z', tone:'stemdark', from:5 },

        // the fruit hangs clear of the leaf mass, out to the side and low, so it
        // is never something you have to look for
        { d:'M20 72 L17.4 66 L23.6 65.4 L23 71.4 Z', tone:'stemdark', from:4 },
        { d:'M20.4 92 Q13 87 14 74.6 Q16.4 65 21.4 66 Q26.4 67.4 25.6 76.4 Q26.4 87.4 20.4 92 Z', tone:'base', from:4 },
        { d:'M17.6 85.4 Q15.6 77.4 18.4 70 Q20.4 67 21.4 71.4 Q18.4 78 18.6 85.6 Z', tone:'light', from:4 },
        { d:'M24 88.6 Q25.4 80 23.6 71.4 Q25.4 69 25.8 76.6 Q26 83.4 24 88.6 Z', tone:'deep', from:4 },

        { d:'M40 66 L37.4 60 L43.6 59.4 L43 65.4 Z', tone:'stemdark', from:5 },
        { d:'M40.4 86 Q33.6 81 34.6 69 Q37 60 41.4 60.6 Q46 62 45.4 70.6 Q46 81.4 40.4 86 Z', tone:'base', from:5 },
        { d:'M37.6 79.4 Q35.6 72 38.4 64.6 Q40.4 61.6 41.4 66 Q38.4 72.6 38.6 79.6 Z', tone:'light', from:5 }
      ],
      blossoms: [[20.4,80],[40.4,74],[30,64],[26,74],[30,54],[24.6,56],[35.4,48],[30,44],[13.6,78]]
    },

    garlic:{
      trunk:'M24.4 96 C22.6 88 25.4 81.4 30 79.4 C34.6 81.4 37.4 88 35.6 96 Z',
      trunkShort:'M26.4 96 C25.4 90.6 27.6 86.4 30 85.4 C32.4 86.4 34.6 90.6 33.6 96 Z',
      trunkTone:'chick',
      parts:[
        { d:'M28.2 89.6 Q23.4 83.4 19.6 74.6 Q25 80.6 27.6 84.4 Q29 86.6 30.6 88.4 Z', tone:'deep', from:2, to:2 },
        { d:'M31.8 89.6 Q36.6 83.4 40.4 74.6 Q35 80.6 32.4 84.4 Q31 86.6 29.4 88.4 Z', tone:'deep', from:2, to:2 },
        { d:'M28.2 88.4 Q27.4 80.6 29 73 L31.4 73.4 Q32.6 80.6 31.8 88.4 Z', tone:'base', from:2, to:2 },
        { d:'M28.4 80 Q22.6 73.4 15.4 68.6 Q19.4 72.6 23.4 77 Q26 80.6 29.4 82.6 Z', tone:'deep', from:3 },
        { d:'M31.6 80 Q37.4 73.4 44.6 68.6 Q40.6 72.6 36.6 77 Q34 80.6 30.6 82.6 Z', tone:'deep', from:3 },
        { d:'M28.8 78.6 Q26.6 69 27 59.4 Q28.4 65.4 29 72 Q29.2 76 29.8 80 Z', tone:'base', from:3 },
        { d:'M31.2 78.6 Q33.4 69 33 59.4 Q31.6 65.4 31 72 Q30.8 76 30.2 80 Z', tone:'base', from:3 },
        { d:'M28 77.4 Q20 67 12.4 60.6 Q17 66 21.4 71.6 Q24.6 77 29 80 Z', tone:'deep', from:4 },
        { d:'M32 77.4 Q40 67 47.6 60.6 Q43 66 38.6 71.6 Q35.4 77 31 80 Z', tone:'deep', from:4 },
        { d:'M28.9 76.4 Q26 62.6 27.4 48.6 Q28.6 57.4 29.2 66.6 Q29.4 73 29.9 78 Z', tone:'base', from:4 },
        { d:'M31.1 76.4 Q34 62.6 32.6 48.6 Q31.4 57.4 30.8 66.6 Q30.6 73 30.1 78 Z', tone:'light', from:5 },
        { d:'M28.4 75.4 Q22.6 60.6 16.6 50.6 Q21 60.6 25.4 68 Q27.4 73.4 29.4 77 Z', tone:'base', from:5 },
        { d:'M31.6 75.4 Q37.4 60.6 43.4 50.6 Q39 60.6 34.6 68 Q32.6 73.4 30.6 77 Z', tone:'base', from:5 },
        { d:'M30.2 74 Q33.4 64 32.4 57 Q31.4 49.4 36.4 47.4 Q40 46 38.6 50.4 Q35 51.4 35 57 Q36 64.6 31.4 75 Z', tone:'deep', from:5 },
        { d:'M38.4 51.4 Q36 50.6 36.6 47.4 Q37.4 42.6 39.6 46.6 Q40.2 49.4 39.6 51 Z', tone:'chick-light', from:5 },
        { d:'M22.6 96 C20.6 86 24 80 27.4 77.6 C29 76.6 29.6 75.4 30 73.4 C30.4 75.4 31 76.6 32.6 77.6 C36 80 39.4 86 37.4 96 Z', tone:'chick', from:4 },
        { d:'M20.4 96 C18 84.6 22.6 77.6 26.6 74.6 C28.6 73.4 29.4 71.6 30 69 C30.6 71.6 31.4 73.4 33.4 74.6 C37.4 77.6 42 84.6 39.6 96 Z', tone:'chick', from:5 },
        { d:'M23.4 96 C21.6 86.6 24.4 80 28.4 75.4 C25.4 81.4 24 88.6 24.8 96 Z', tone:'chick-light', from:4 },
        { d:'M28.6 96 C27.8 87 28.6 79.4 29.7 74.6 C29.5 80.6 29.4 89 29.6 96 Z', tone:'chick-deep', from:4 },
        { d:'M31.4 96 C32.2 87 31.4 79.4 30.3 74.6 C30.5 80.6 30.6 89 30.4 96 Z', tone:'chick-deep', from:4 },
        { d:'M36.6 96 C38.4 86.6 35.6 80 31.6 75.4 C34.6 81.4 36 88.6 35.2 96 Z', tone:'chick-deep', from:5 },
        { d:'M26 96 C25 87 26.6 80.6 29 76.6 C27 82.6 26.6 90 27.2 96 Z', tone:'chick-light', from:5 },
        { d:'M33.4 96 C34.4 88 33.4 81.4 31.6 78 C32.8 83 33.4 90 33 96 Z', tone:'chick-deep', from:5 }
      ],
      blossoms:[[30,80],[25.6,88],[34.4,88],[30,86],[23.6,92],[36.4,92],[30,92],[30,74],[38.6,48]]
    },

    ginseng:{
      trunk: 'M29.4 96 L29.4 76 L30.6 76 L30.6 96 Z',
      trunkShort: 'M29.5 96 L29.5 87 L30.5 87 L30.5 96 Z',
      trunkTone: 'stem',
      parts: [
        // the root is the harvest, so it is drawn big, brown and unmistakably
        // forked, sitting half out of the soil
        { d:'M27.6 89 Q25.4 92 24 96 L26.6 96 Q28 92.6 29.2 90.6 L29.2 96 L30.8 96 L30.8 91 Q32.2 93.4 33.4 96 L35.6 96 Q33.6 92 32.4 89 Z', tone:'seedhead-light', from:2, to:2 },

        { d:'M26 84 Q23 89 21 96 L24.6 96 Q26.6 90.6 29.2 86.6 L29.2 96 L30.8 96 L30.8 86.6 Q33.4 90.6 35.4 96 L39 96 Q37 89 34 84 Z', tone:'seedhead-light', from:3 },
        { d:'M25.6 86.6 Q24 91 23 95.4 Q25.4 90 27.4 87.4 Z', tone:'seedhead', from:3 },
        { d:'M34.4 86.6 Q36 91 37 95.4 Q34.6 90 32.6 87.4 Z', tone:'seedhead', from:3 },
        { d:'M29.4 84 Q29 90 29.6 96 L30.4 96 Q31 90 30.6 84 Z', tone:'seedhead', from:3 },

        { d:'M23.6 79 Q20.6 86.6 18.4 96 L22.6 96 Q25 89 29.2 84 L29.2 96 L30.8 96 L30.8 84 Q35 89 37.4 96 L41.6 96 Q39.4 86.6 36.4 79 Z', tone:'seedhead-light', from:5 },
        { d:'M21.4 88 Q18 89.6 15.6 93.4 Q19.4 90.6 23 89.6 Z', tone:'seedhead-light', from:5 },
        { d:'M38.6 88 Q42 89.6 44.4 93.4 Q40.6 90.6 37 89.6 Z', tone:'seedhead-light', from:5 },
        { d:'M24.6 82 Q22.6 88.6 21.4 95 Q24 88.6 26.6 84 Z', tone:'seedhead', from:5 },
        { d:'M35.4 82 Q37.4 88.6 38.6 95 Q36 88.6 33.4 84 Z', tone:'seedhead', from:5 },

        { petals:[30,84,3,2.8,4.6,5], tone:'stemdark', from:2, to:2 },
        { c:[30,84,2], tone:'stem', from:2, to:2 },

        { petals:[30,76,5,3.6,6.4,7], tone:'stemdark', from:3 },
        { petals:[30,76,5,2.4,4.2,4.4], tone:'stem', from:3 },

        { d:'M29.4 80 L29.4 66 L30.6 66 L30.6 80 Z', tone:'stem', from:4 },
        { petals:[30,66,5,4,7.4,8], tone:'stemdark', from:4 },
        { petals:[30,66,5,2.6,4.8,5], tone:'stem', from:4 },
        { c:[30,65.6,2.6], tone:'base', from:4 },
        { c:[29,64.6,1.2], tone:'light', from:4 },

        { d:'M29.4 70 L29.4 56 L30.6 56 L30.6 70 Z', tone:'stem', from:5 },
        { petals:[30,56,5,4.4,8,9], tone:'stemdark', from:5 },
        { petals:[30,56,5,2.8,5.4,5.6], tone:'stem', from:5 },
        { c:[27.8,55.4,2.6], tone:'base', from:5 },
        { c:[32.2,55.4,2.6], tone:'base', from:5 },
        { c:[30,51.8,2.6], tone:'base', from:5 },
        { c:[30,58,2.6], tone:'deep', from:5 },
        { c:[26.8,54.2,1.2], tone:'light', from:5 }
      ],
      blossoms: [[27.8,55.4],[32.2,55.4],[30,51.8],[30,58],[30,66],[23.6,62],[36.4,62],[25.4,72],[34.6,72]]
    },

    grapes:{
      trunk: 'M28.4 96 Q29.8 80 29.2 60 L30.8 60 Q30.2 80 31.6 96 Z',
      trunkShort: 'M28.8 96 Q29.9 88 29.4 78 L30.6 78 Q30.1 88 31.2 96 Z',
      parts: [
        { d:'M20.6 96 H23 V80 H20.6 Z', tone:'wood', from:2, to:2 },
        { d:'M37 96 H39.4 V80 H37 Z', tone:'wood', from:2, to:2 },
        { d:'M19.4 78 H40.6 V81.4 H19.4 Z', tone:'wood-light', from:2, to:2 },
        { d:'M29.4 82 Q23.4 80.6 21 74.6 Q23.4 71.4 26.6 73.4 Q28 70.6 30.4 74.6 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.6 82 Q36.6 80.6 39 74.6 Q36.6 71.4 33.4 73.4 Q32 70.6 29.6 74.6 Z', tone:'stem', from:2, to:2 },

        { d:'M14.6 96 H17.4 V56 H14.6 Z', tone:'wood', from:3 },
        { d:'M42.6 96 H45.4 V56 H42.6 Z', tone:'wood', from:3 },
        { d:'M13 55 H47 V58.6 H13 Z', tone:'wood-light', from:3 },
        { d:'M28.6 76 Q29.4 68 29 58 L31 58 Q30.6 68 31.4 76 Z', tone:'stemdark', from:3 },
        { d:'M29.4 62 Q22.6 60.6 19.6 54 Q22.4 50 26 52.6 Q27.4 48.6 30.4 53.4 Z', tone:'stemdark', from:3 },
        { d:'M30.6 62 Q37.4 60.6 40.4 54 Q37.6 50 34 52.6 Q32.6 48.6 29.6 53.4 Z', tone:'stemdark', from:3 },
        { d:'M22.6 58 Q16.6 56.6 14 50.6 Q16.6 46.6 20 49 Q21.4 45 24 49.6 Z', tone:'stem', from:3 },
        { d:'M37.4 58 Q43.4 56.6 46 50.6 Q43.4 46.6 40 49 Q38.6 45 36 49.6 Z', tone:'stem', from:3 },

        { d:'M30 54 Q23.4 52.6 20.6 46 Q23.4 42 27 44.6 Q28.4 40.6 31.4 45.4 Z', tone:'stem', from:4 },
        { d:'M30 48 Q36.6 46.6 39.4 40 Q36.6 36 33 38.6 Q31.6 34.6 28.6 39.4 Z', tone:'stem', from:4 },
        { d:'M17.4 50 Q11.6 48.6 9 42.6 Q11.6 38.6 15 41 Q16.4 37 19 41.6 Z', tone:'stemdark', from:4 },
        { d:'M42.6 50 Q48.4 48.6 51 42.6 Q48.4 38.6 45 41 Q43.6 37 41 41.6 Z', tone:'stemdark', from:4 },

        { d:'M29.4 58 L29.4 34 L30.6 34 L30.6 58 Z', tone:'stem', from:5 },
        { d:'M30 40 Q23.4 38.6 20.6 32 Q23.4 28 27 30.6 Q28.4 26.6 31.4 31.4 Z', tone:'stem', from:5 },
        { d:'M30 34 Q36.6 32.6 39.4 26 Q36.6 22 33 24.6 Q31.6 20.6 28.6 25.4 Z', tone:'stem', from:5 },
        { d:'M13.4 40 Q8 38.6 5.6 33 Q8 29.4 11.4 31.6 Q12.6 28 15 32.4 Z', tone:'stemdark', from:5 },
        { d:'M46.6 40 Q52 38.6 54.4 33 Q52 29.4 48.6 31.6 Q47.4 28 45 32.4 Z', tone:'stemdark', from:5 },

        { c:[24,64,2.8], tone:'deep', from:4 },
        { c:[29,64,2.8], tone:'base', from:4 },
        { c:[26.4,68.6,2.8], tone:'deep', from:4 },
        { c:[31.4,68.4,2.8], tone:'base', from:4 },
        { c:[28.6,73,2.8], tone:'deep', from:4 },
        { c:[26.6,77,2.6], tone:'base', from:4 },
        { c:[25,62.6,1.2], tone:'light', from:4 },

        { c:[38,64,2.6], tone:'deep', from:5 },
        { c:[42.6,64,2.6], tone:'base', from:5 },
        { c:[40,68,2.6], tone:'deep', from:5 },
        { c:[44,68.4,2.6], tone:'base', from:5 },
        { c:[41.6,72.6,2.6], tone:'deep', from:5 },
        { c:[38.8,62.6,1.1], tone:'light', from:5 },
        { c:[17,66,2.6], tone:'deep', from:5 },
        { c:[21.4,66,2.6], tone:'base', from:5 },
        { c:[19,70,2.6], tone:'deep', from:5 },
        { c:[22.6,70.4,2.6], tone:'base', from:5 },
        { c:[20.6,74.6,2.6], tone:'deep', from:5 },
        { c:[17.8,64.6,1.1], tone:'light', from:5 }
      ],
      blossoms: [[27,70],[41,68],[20,70],[30,50],[22.6,46],[38,44],[12.6,44],[47.4,44],[30,36]]
    },

    mango:{
      trunk: 'M26.4 96 Q28.6 78 27.8 58 L32.2 58 Q31.4 78 33.6 96 Z',
      trunkShort: 'M27.4 96 Q28.8 86 28.4 74 L31.6 74 Q31.2 86 32.6 96 Z',
      parts: [
        { c:[30,68,10.6], tone:'stemdark', from:2, to:2 },
        { c:[25.4,64.6,6], tone:'stem', from:2, to:2 },
        { c:[34.6,65.4,5], tone:'stem', from:2, to:2 },
        { d:'M27.6 74 Q21.4 76 17.6 84 Q24 79.6 29 76 Z', tone:'stemdark', from:2, to:2 },
        { d:'M32.4 74 Q38.6 76 42.4 84 Q36 79.6 31 76 Z', tone:'stem', from:2, to:2 },

        // narrower and taller than the apple, with drooping lance leaves out of
        // the crown edge so the outline is shaggy rather than a clean dome
        { c:[30,56,11.6], tone:'stemdark', from:3 },
        { c:[21.4,60,6.6], tone:'stemdark', from:3 },
        { c:[38.6,60,6.6], tone:'stemdark', from:3 },
        { c:[25.4,50.6,6.6], tone:'stem', from:3 },
        { c:[35,52,5.6], tone:'stem', from:3 },
        { d:'M25 64 Q17.4 68 13.4 78 Q20.6 71.4 27 66 Z', tone:'stemdark', from:3 },
        { d:'M35 64 Q42.6 68 46.6 78 Q39.4 71.4 33 66 Z', tone:'stemdark', from:3 },

        { c:[30,44,11.6], tone:'stemdark', from:4 },
        { c:[20.6,50,7], tone:'stemdark', from:4 },
        { c:[39.4,50,7], tone:'stemdark', from:4 },
        { c:[25,38.6,7], tone:'stem', from:4 },
        { c:[35.4,40,6], tone:'stem', from:4 },
        { d:'M24 54 Q15.4 58.6 11.4 70 Q19.4 62.6 26.4 56.6 Z', tone:'stemdark', from:4 },
        { d:'M36 54 Q44.6 58.6 48.6 70 Q40.6 62.6 33.6 56.6 Z', tone:'stemdark', from:4 },
        { d:'M29.4 34 Q25.4 38 24 46 Q28 41 30.4 36 Z', tone:'stem', from:4 },

        { c:[30,32,11.4], tone:'stemdark', from:5 },
        { c:[20.6,38,6.6], tone:'stemdark', from:5 },
        { c:[39.4,38,6.6], tone:'stemdark', from:5 },
        { c:[25,26.6,6.6], tone:'stem', from:5 },
        { c:[35.4,28,5.6], tone:'stem', from:5 },
        { d:'M23.4 42 Q14.6 47.4 10.6 60 Q19 51.4 26 44.6 Z', tone:'stem', from:5 },
        { d:'M36.6 42 Q45.4 47.4 49.4 60 Q41 51.4 34 44.6 Z', tone:'stem', from:5 },
        { d:'M29.4 22 Q25.4 26 23.6 34 Q27.6 29 30.4 24 Z', tone:'stem', from:5 },
        { d:'M30.6 22 Q34.6 26 36.4 34 Q32.4 29 29.6 24 Z', tone:'stem', from:5 },

        // two or three big ovals hanging clear below the crown
        { d:'M19.4 68 L18.4 62.6 L22 62 L22.4 67.4 Z', tone:'stemdark', from:4 },
        { d:'M14.4 73 C14.4 68.2 17.2 64.4 20 64.4 C22.8 64.4 25.6 68.2 25.6 73 C25.6 77.8 22.8 81.6 20 81.6 C17.2 81.6 14.4 77.8 14.4 73 Z', tone:'base', from:4 },
        { c:[17.8,69.6,2.4], tone:'light', from:4 },
        { d:'M23.2 79.6 C24.8 77.4 25.6 74.6 25.6 72.6 C25.6 70 25 68 24.2 66.8 C25.4 68.6 26 70.6 26 73 C26 75.6 24.8 78.2 23.2 79.6 Z', tone:'deep', from:4 },

        { d:'M40.6 66 L39.6 60.6 L43.2 60 L43.6 65.4 Z', tone:'stemdark', from:5 },
        { d:'M35.6 71 C35.6 66.4 38.2 62.8 41 62.8 C43.8 62.8 46.4 66.4 46.4 71 C46.4 75.6 43.8 79.2 41 79.2 C38.2 79.2 35.6 75.6 35.6 71 Z', tone:'base', from:5 },
        { c:[38.8,67.8,2.2], tone:'light', from:5 },
        { d:'M30.6 60 L29.6 55 L33 54.4 L33.4 59.6 Z', tone:'stemdark', from:5 },
        { d:'M26 64 C26 59.8 28.2 56.4 31 56.4 C33.8 56.4 36 59.8 36 64 C36 68.2 33.8 71.6 31 71.6 C28.2 71.6 26 68.2 26 64 Z', tone:'base', from:5 },
        { c:[29,61,2], tone:'light', from:5 }
      ],
      blossoms: [[20,73],[41,71],[31,64],[13.6,64],[46.6,62],[30,48],[22,34],[38,34],[30,24]]
    },

    onion:{
      // A round dome (cubic, so the sides bulge): the flat-sided version read as
      // a pot rather than a bulb.
      trunk: 'M24 96 C22 87 25.6 81.4 30 81.4 C34.4 81.4 38 87 36 96 Z',
      trunkShort: 'M27 96 C26 90.6 27.6 87.6 30 87.6 C32.4 87.6 34 90.6 33 96 Z',
      trunkTone: 'base',
      parts: [
        { d:'M21 96 C18.6 85 23.4 77.4 30 77.4 C36.6 77.4 41.4 85 39 96 Z', tone:'base', from:4 },
        { d:'M18 96 C15 82.6 21.6 73.4 30 73.4 C38.4 73.4 45 82.6 42 96 Z', tone:'base', from:5 },
        { d:'M22 95 C20 84.6 24 78 27.6 78 C25.6 82 23.6 88 24 95 Z', tone:'light', from:4 },
        { d:'M38 95 C40 84.6 36 78 32.4 78 C34.4 82 36.4 88 36 95 Z', tone:'deep', from:4 },
        { d:'M28.6 74 L28.6 69.4 L31.4 69.4 L31.4 74 Z', tone:'stemdark', from:5 },

        { d:'M27.6 87 Q25 78.6 24.4 70 Q26.4 67.4 28 70 Q28.6 79 29.4 87 Z', tone:'stemdark', from:2, to:2 },
        { d:'M32.4 87 Q35 78.6 35.6 70 Q33.6 67.4 32 70 Q31.4 79 30.6 87 Z', tone:'stemdark', from:2, to:2 },
        { d:'M29 87 Q28.6 78 29 69 Q30 66.6 31 69 Q31.4 78 31 87 Z', tone:'stem', from:2, to:2 },
        { d:'M29.6 85 Q29.4 77 29.6 70.6 L30.4 70.6 Q30.4 77 30.4 85 Z', tone:'light', from:2, to:2 },

        { d:'M27 82 Q22.6 69 20.6 54.6 Q22 51.4 24.4 54.6 Q26 68 28.6 82 Z', tone:'stemdark', from:3 },
        { d:'M33 82 Q37.4 69 39.4 54.6 Q38 51.4 35.6 54.6 Q34 68 31.4 82 Z', tone:'stemdark', from:3 },
        { d:'M28.4 82 Q27 67 27 52 Q28.4 49 30 52 Q30 67 30.2 82 Z', tone:'stem', from:3 },
        { d:'M31.6 82 Q33 67 33 52 Q31.6 49 30 52 Q30 67 29.8 82 Z', tone:'stem', from:3 },
        { d:'M28.8 80 Q28 66 28.4 55 L29.2 55 Q29 66 29.6 80 Z', tone:'light', from:3 },

        { d:'M26 78 Q20.6 60 17.6 42.6 Q19.4 39.4 22 42.6 Q24.6 60 27.6 78 Z', tone:'stem', from:4 },
        { d:'M34 78 Q39.4 60 42.4 42.6 Q40.6 39.4 38 42.6 Q35.4 60 32.4 78 Z', tone:'stem', from:4 },
        { d:'M27.4 77 Q23.4 60 21 45 L22 44.6 Q24.6 60 28.4 77 Z', tone:'light', from:4 },

        { d:'M29 74 Q28.4 56 28.6 40 Q29.4 36.6 30.4 40 Q30.2 56 30.4 74 Z', tone:'stem', from:5 },
        { d:'M31.4 74 Q33.4 56 35.4 40 Q34.4 36.6 32.4 40 Q31 56 30.4 74 Z', tone:'stemdark', from:5 },
        { d:'M27.6 74 Q24.6 56 22.6 37.6 Q23.6 34.6 25.6 37.6 Q27.4 56 29 74 Z', tone:'stemdark', from:5 },
        { petals:[30,30,9,2.6,3.6,3.4], tone:'light', from:5 },
        { c:[30,30,3.2], tone:'base', from:5 },
        { d:'M29.4 40 L29.4 32 L30.6 32 L30.6 40 Z', tone:'stem', from:5 }
      ],
      blossoms: [[26,90],[34,90],[30,86],[22.6,92],[37.4,92],[30,92],[30,30],[26,34],[34,34]]
    },

    pineapple:{
      trunk: 'M29.2 96 L29.2 90 L30.8 90 L30.8 96 Z',
      trunkShort: 'M29.4 96 L29.4 93 L30.6 93 L30.6 96 Z',
      trunkTone: 'stemdark',
      parts: [
        { d:'M29.4 94 Q22.6 89 16.6 80.6 Q24 85 30.4 92.4 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.6 94 Q37.4 89 43.4 80.6 Q36 85 29.6 92.4 Z', tone:'stemdark', from:2, to:2 },
        { d:'M29.4 92.6 Q26 85 24.4 76.6 Q29 83.4 30.4 91 Z', tone:'stem', from:2, to:2 },
        { d:'M30.6 92.6 Q34 85 35.6 76.6 Q31 83.4 29.6 91 Z', tone:'stem', from:2, to:2 },
        { d:'M29.5 92 Q29.4 84 29.6 76 L30.4 76 Q30.6 84 30.5 92 Z', tone:'stem', from:2, to:2 },

        // the rosette stays low and wide on purpose: past stage 3 the fruit is
        // the tallest thing in the drawing, which is what makes it a pineapple
        { d:'M29.4 95 Q19.4 90.6 10.6 83.4 Q20.6 87.4 30.6 93.4 Z', tone:'stemdark', from:3 },
        { d:'M30.6 95 Q40.6 90.6 49.4 83.4 Q39.4 87.4 29.4 93.4 Z', tone:'stemdark', from:3 },
        { d:'M29.4 94 Q22.6 88 17 76.6 Q25.4 83.4 30.6 92 Z', tone:'stemdark', from:3 },
        { d:'M30.6 94 Q37.4 88 43 76.6 Q34.6 83.4 29.4 92 Z', tone:'stemdark', from:3 },
        { d:'M29.4 93 Q26.6 84 25.4 71.4 Q29.4 81.4 30.6 91.4 Z', tone:'stem', from:3 },
        { d:'M30.6 93 Q33.4 84 34.6 71.4 Q30.6 81.4 29.4 91.4 Z', tone:'stem', from:3 },
        { d:'M29.5 92 Q29.2 82 29.6 68.6 L30.4 68.6 Q30.8 82 30.5 92 Z', tone:'stem', from:3 },

        { d:'M29.4 95.4 Q18 91 7.6 85.4 Q19 89 30.6 94 Z', tone:'stemdark', from:4 },
        { d:'M30.6 95.4 Q42 91 52.4 85.4 Q41 89 29.4 94 Z', tone:'stemdark', from:4 },
        { d:'M29.4 94.4 Q20.6 87 14 74.6 Q24 82.6 30.6 92.6 Z', tone:'stem', from:4 },
        { d:'M30.6 94.4 Q39.4 87 46 74.6 Q36 82.6 29.4 92.6 Z', tone:'stem', from:4 },
        { d:'M29.4 93 Q25.4 82 23.4 66 Q28.6 78.6 30.6 91.4 Z', tone:'stem', from:4 },
        { d:'M30.6 93 Q34.6 82 36.6 66 Q31.4 78.6 29.4 91.4 Z', tone:'stem', from:4 },

        { d:'M29.4 94.6 Q17.4 88 8.6 76.6 Q21 84 30.6 92.6 Z', tone:'stemdark', from:5 },
        { d:'M30.6 94.6 Q42.6 88 51.4 76.6 Q39 84 29.4 92.6 Z', tone:'stemdark', from:5 },
        { d:'M29.4 93.4 Q22.6 82 18.6 62.6 Q27 76.6 30.6 92 Z', tone:'stem', from:5 },
        { d:'M30.6 93.4 Q37.4 82 41.4 62.6 Q33 76.6 29.4 92 Z', tone:'stem', from:5 },
        { d:'M29.4 94 Q13.4 90 4.6 82.6 Q17.4 88 30.4 93 Z', tone:'stem', from:5 },
        { d:'M30.6 94 Q46.6 90 55.4 82.6 Q42.6 88 29.6 93 Z', tone:'stem', from:5 },

        { d:'M30 91.4 Q22.4 87.4 23 75.4 Q24 67 30 66.4 Q36 67 37 75.4 Q37.6 87.4 30 91.4 Z', tone:'base', from:4, to:4 },
        { d:'M24.4 78 Q30 74.6 35.6 78 Q30 81.4 24.4 78 Z', tone:'deep', from:4, to:4 },
        { d:'M24.6 85 Q30 82 35.4 85 Q30 88 24.6 85 Z', tone:'deep', from:4, to:4 },
        { d:'M24.6 71.4 Q30 68.6 35.4 71.4 Q30 74.2 24.6 71.4 Z', tone:'deep', from:4, to:4 },
        { d:'M25.6 68.6 Q26.6 78 25.8 89.6 Q23.6 78 24.6 69 Z', tone:'deep', from:4, to:4 },
        { d:'M34.4 68.6 Q33.4 78 34.2 89.6 Q36.4 78 35.4 69 Z', tone:'deep', from:4, to:4 },
        { c:[26.6,72.6,2.2], tone:'light', from:4, to:4 },
        { d:'M27.4 66.6 Q25.6 58 26 51.4 Q28.4 58.6 28.6 65.4 Z', tone:'stemdark', from:4, to:4 },
        { d:'M32.6 66.6 Q34.4 58 34 51.4 Q31.6 58.6 31.4 65.4 Z', tone:'stemdark', from:4, to:4 },
        { d:'M29.4 65.4 Q28.6 56 29.4 49 L30.6 49 Q31.4 56 30.6 65.4 Z', tone:'stem', from:4, to:4 },

        { d:'M30 92.4 Q19.4 87.4 20 71.4 Q21 60.6 30 59.6 Q39 60.6 40 71.4 Q40.6 87.4 30 92.4 Z', tone:'base', from:5 },
        { d:'M21.4 77 Q30 73.4 38.6 77 Q30 80.6 21.4 77 Z', tone:'deep', from:5 },
        { d:'M22 85 Q30 81.6 38 85 Q30 88.4 22 85 Z', tone:'deep', from:5 },
        { d:'M21.4 69.4 Q30 65.6 38.6 69.4 Q30 73.2 21.4 69.4 Z', tone:'deep', from:5 },
        { d:'M22.6 63.4 Q30 60.4 37.4 63.4 Q30 66.4 22.6 63.4 Z', tone:'deep', from:5 },
        { d:'M23.4 62 Q24.4 76 23.6 90.6 Q20.6 76 22.4 62.6 Z', tone:'deep', from:5 },
        { d:'M36.6 62 Q35.6 76 36.4 90.6 Q39.4 76 37.6 62.6 Z', tone:'deep', from:5 },
        { c:[25,67.6,2.6], tone:'light', from:5 },
        { d:'M26.6 58 Q23.4 46 24 37.4 Q27.4 47.4 28.4 56.4 Z', tone:'stemdark', from:5 },
        { d:'M33.4 58 Q36.6 46 36 37.4 Q32.6 47.4 31.6 56.4 Z', tone:'stemdark', from:5 },
        { d:'M28.6 57 Q27.6 44 28.6 34 L31.4 34 Q32.4 44 31.4 57 Z', tone:'stem', from:5 },
        { d:'M28 57.4 Q25 48 25.6 41 Q28 49 29 56.4 Z', tone:'stem', from:5 },
        { d:'M32 57.4 Q35 48 34.4 41 Q32 49 31 56.4 Z', tone:'stem', from:5 }
      ],
      blossoms: [[30,76],[25.4,84],[34.6,84],[30,66],[24.4,72],[35.6,72],[30,88],[26.6,60],[33.4,60]]
    },

    potato:{
      trunk: 'M28.4 96 Q29.6 80 29 66 L31 66 Q30.4 80 31.6 96 Z',
      trunkShort: 'M28.8 96 Q29.8 88 29.4 80 L30.6 80 Q31 88 31.2 96 Z',
      trunkTone: 'stem',
      parts: [
        { c:[22.6,82,5], tone:'stemdark', from:2, to:2 },
        { c:[37.4,82,5], tone:'stemdark', from:2, to:2 },
        { c:[30,77.6,5.6], tone:'stem', from:2, to:2 },
        { c:[26.6,84.6,3.6], tone:'stem', from:2, to:2 },

        { c:[18.6,80,6], tone:'stemdark', from:3 },
        { c:[41.4,80,6], tone:'stemdark', from:3 },
        { c:[24.6,72,6.4], tone:'stemdark', from:3 },
        { c:[35.4,72,6.4], tone:'stem', from:3 },
        { c:[30,66,6], tone:'stem', from:3 },

        { c:[14.6,76,5.4], tone:'stemdark', from:4 },
        { c:[45.4,76,5.4], tone:'stem', from:4 },
        { c:[20.6,62.6,6], tone:'stem', from:4 },
        { c:[39.4,62.6,6], tone:'stem', from:4 },
        { c:[30,56.6,6.4], tone:'stem', from:4 },

        { c:[24.6,50.6,5.6], tone:'stem', from:5 },
        { c:[35.4,50.6,5.6], tone:'stemdark', from:5 },
        { c:[30,44.6,5.4], tone:'stem', from:5 },
        { c:[17.6,66,4.6], tone:'stemdark', from:5 },
        { c:[42.4,66,4.6], tone:'stemdark', from:5 },

        { d:'M13.4 96 Q11.6 88.6 18.6 87.4 Q24 88.6 23 96 Z', tone:'base', from:3 },
        { d:'M15.6 94 Q15 89.4 18.6 89 Q21 89.6 20.6 94 Z', tone:'light', from:3 },
        { d:'M37 96 Q35.4 88 42.6 86.6 Q48.4 88 47 96 Z', tone:'base', from:4 },
        { d:'M39.4 94 Q38.6 89 42.6 88.4 Q45.4 89 45 94 Z', tone:'light', from:4 },
        { d:'M26.4 96 Q25 89.4 30 88.6 Q35 89.4 33.6 96 Z', tone:'base', from:5 },
        { d:'M28 94.6 Q27.4 90.6 30 90.4 Q32.4 90.6 32 94.6 Z', tone:'light', from:5 }
      ],
      blossoms: [[24.6,68],[35.4,68],[30,61],[19.6,74],[40.4,74],[30,71],[25.4,47],[34.6,47],[30,41]]
    },

    rice:{
      trunk: 'M29.1 96 L29.1 54 Q30 50.4 30.9 54 L30.9 96 Z',
      trunkShort: 'M29.3 96 L29.3 76 Q30 73 30.7 76 L30.7 96 Z',
      trunkTone: 'stem',
      parts: [
        { d:'M29.2 94 Q21 86.6 15.4 75 Q23 82.6 30.4 92.4 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.8 94 Q39 86.6 44.6 75 Q37 82.6 29.6 92.4 Z', tone:'stemdark', from:2, to:2 },
        { d:'M29.4 94 Q25.4 84 24 71 Q28.6 82 30.6 92.4 Z', tone:'stem', from:2, to:2 },
        { d:'M30.6 94 Q34.6 84 36 71 Q31.4 82 29.4 92.4 Z', tone:'stem', from:2, to:2 },

        { d:'M29.2 95 Q18 82 11.6 62 Q21 76.6 30.4 93.4 Z', tone:'stemdark', from:3 },
        { d:'M30.8 95 Q42 82 48.4 62 Q39 76.6 29.6 93.4 Z', tone:'stemdark', from:3 },
        { d:'M29.3 95 Q23 78 20 56 Q27 72.6 30.5 93.4 Z', tone:'stem', from:3 },
        { d:'M30.7 95 Q37 78 40 56 Q33 72.6 29.5 93.4 Z', tone:'stem', from:3 },

        { d:'M29.4 94.6 Q25.6 72 25 44 Q29.2 68 30.5 93 Z', tone:'stem', from:4 },
        { d:'M30.6 94.6 Q34.4 72 35 44 Q30.8 68 29.5 93 Z', tone:'stem', from:4 },

        { d:'M29.4 54 L29.4 40 Q30 37.4 30.6 40 L30.6 54 Z', tone:'stem', from:5 },
        { d:'M29.5 94.6 Q22.6 68 18.6 40 Q27 66 30.4 93 Z', tone:'stemdark', from:5 },
        { d:'M30.5 94.6 Q37.4 68 41.4 40 Q33 66 29.6 93 Z', tone:'stemdark', from:5 },

        { d:'M25 45 Q19.4 47.4 17.6 56 Q23 52.6 26.4 46.4 Z', tone:'base', from:4 },
        { d:'M35 45 Q40.6 47.4 42.4 56 Q37 52.6 33.6 46.4 Z', tone:'light', from:4 },
        { d:'M30 51 Q26 52.6 24.6 59.4 Q29 56.6 31.4 52 Z', tone:'base', from:4 },
        { d:'M18.6 41 Q13.4 44 12 52.6 Q17 48.6 20 42.4 Z', tone:'base', from:5 },
        { d:'M41.4 41 Q46.6 44 48 52.6 Q43 48.6 40 42.4 Z', tone:'light', from:5 },
        { d:'M30 40 Q34.6 42.6 35.6 50 Q31.4 46.6 28.6 41.4 Z', tone:'light', from:5 }
      ],
      blossoms: [[22.6,50],[37.4,50],[30,46],[16,51],[44,51],[27,55],[33,55],[30,38],[30,58]]
    },

    rose:{
      trunk: 'M28.6 96 Q29.8 78 29.2 56 L30.8 56 Q30.2 78 31.4 96 Z',
      trunkShort: 'M29 96 Q29.9 87 29.4 76 L30.6 76 Q30.1 87 31 96 Z',
      trunkTone: 'stemdark',
      parts: [
        { d:'M29.4 89 Q22.6 87.4 19.6 79.4 Q25.4 78.6 30.4 86.4 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.6 84 Q37.4 82.4 40.4 74.4 Q34.6 73.6 29.6 81.4 Z', tone:'stem', from:2, to:2 },
        { d:'M29.6 80 Q24.6 78.6 22.4 71.4 Q27.6 71 30.4 78 Z', tone:'stem', from:2, to:2 },
        { petals:[30,70,7,2.6,3.8,3.2], tone:'deep', from:2, to:2 },
        { c:[30,70,2.6], tone:'base', from:2, to:2 },

        { d:'M29.4 90 Q21 88.4 17.4 79 Q24.4 78 30.6 87.4 Z', tone:'stemdark', from:3 },
        { d:'M30.6 84 Q39 82.4 42.6 73 Q35.6 72 29.4 81.4 Z', tone:'stemdark', from:3 },
        { d:'M29.4 76 Q22 74.4 18.6 66 Q25 65.4 30.6 73.4 Z', tone:'stem', from:3 },
        { d:'M30.6 70 Q38 68.4 41.4 60 Q35 59.4 29.4 67.4 Z', tone:'stem', from:3 },
        { petals:[30,50,8,3.2,4.8,4.4], tone:'deep', from:3 },
        { petals:[30,50,8,2.4,3.4,2.6], tone:'base', from:3 },
        { c:[30,50,1.9], tone:'light', from:3 },

        { d:'M29.4 68 Q24 60 20.4 46 L22.6 45.4 Q26 59.6 30.6 67 Z', tone:'stemdark', from:4 },
        { d:'M30.6 64 Q36 56 39.6 43 L41.6 43.6 Q38 56 29.4 63 Z', tone:'stemdark', from:4 },
        { d:'M29.4 62 Q23 60.4 20 52.6 Q26 51.6 30.6 59.4 Z', tone:'stem', from:4 },
        { petals:[21,42,8,3,4.4,4], tone:'deep', from:4 },
        { petals:[21,42,8,2.2,3.2,2.4], tone:'base', from:4 },
        { c:[21,42,1.8], tone:'light', from:4 },
        { petals:[40.6,40,8,2.8,4.2,3.8], tone:'deep', from:4 },
        { petals:[40.6,40,8,2,3,2.2], tone:'base', from:4 },
        { c:[40.6,40,1.7], tone:'light', from:4 },

        { d:'M29.3 58 L29.3 32 L30.7 32 L30.7 58 Z', tone:'stem', from:5 },
        { d:'M29.4 48 Q23.4 46.4 20.6 39 Q26.6 38.4 30.6 45.4 Z', tone:'stem', from:5 },
        { d:'M30.6 42 Q36.6 40.4 39.4 33 Q33.4 32.4 29.4 39.4 Z', tone:'stem', from:5 },
        { petals:[30,28,9,3.6,5.4,5], tone:'deep', from:5 },
        { petals:[30,28,9,2.6,3.8,3], tone:'base', from:5 },
        { c:[30,28,2.2], tone:'light', from:5 }
      ],
      blossoms: [[30,50],[21,42],[40.6,40],[30,28],[24.6,56],[36,54],[30,38],[16.6,46],[45,44]]
    },

    tomato:{
      trunk: 'M28.8 96 L28.8 46 L31.2 46 L31.2 96 Z',
      trunkShort: 'M29 96 L29 72 L31 72 L31 96 Z',
      trunkTone: 'stem',
      parts: [
        { d:'M29.4 85 Q20 83 15.6 73.4 Q24 72.6 30.4 82 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.6 79 Q40 77 44.4 67.4 Q36 66.6 29.6 76 Z', tone:'stem', from:2, to:2 },
        { d:'M29.6 74 Q23.4 72 20 64.6 Q26.6 64 30.4 71.6 Z', tone:'stem', from:2, to:2 },

        { d:'M29.4 85 Q18 83 12.6 71.4 Q22 70.6 30.6 82 Z', tone:'stemdark', from:3 },
        { d:'M30.6 79 Q42 77 47.4 65.4 Q38 64.6 29.4 76 Z', tone:'stemdark', from:3 },
        { d:'M29.4 69 Q19 67 14.6 56.6 Q23 56 30.6 66 Z', tone:'stem', from:3 },
        { d:'M30.6 63 Q41 61 45.4 50.6 Q37 50 29.4 60 Z', tone:'stem', from:3 },

        { d:'M29.4 55 Q20 53 16.6 44 Q24 43.4 30.6 52 Z', tone:'stem', from:4 },
        { d:'M30.6 51 Q40 49 43.4 40 Q36 39.4 29.4 48 Z', tone:'stem', from:4 },

        { d:'M29 48 L29 30 L31 30 L31 48 Z', tone:'stem', from:5 },
        { d:'M29.4 43 Q21 41 17.6 32.6 Q25 32 30.6 40 Z', tone:'stem', from:5 },
        { d:'M30.6 38 Q39 36 42.4 27.6 Q35 27 29.4 35 Z', tone:'stem', from:5 },

        { c:[23.4,71,3.6], tone:'deep', from:3, to:3 },
        { c:[36.6,66,3], tone:'deep', from:3, to:3 },

        { c:[22.4,65.6,6], tone:'base', from:4 },
        { c:[22.4,67.4,4.2], tone:'deep', from:4 },
        { c:[20.4,63,2.4], tone:'light', from:4 },
        { c:[37,58.6,5.6], tone:'base', from:4 },
        { c:[37,60.4,3.8], tone:'deep', from:4 },
        { c:[35.2,56.2,2.2], tone:'light', from:4 },
        { d:'M22.4 60.6 L19.4 57.4 L25.4 57.4 Z', tone:'stemdark', from:4 },
        { d:'M37 54 L34.2 51 L39.8 51 Z', tone:'stemdark', from:4 },

        { c:[25.6,50.6,5.6], tone:'base', from:5 },
        { c:[25.6,52.4,3.8], tone:'deep', from:5 },
        { c:[23.6,48.2,2.2], tone:'light', from:5 },
        { c:[35.4,44,5], tone:'base', from:5 },
        { c:[35.4,45.6,3.4], tone:'deep', from:5 },
        { c:[33.8,41.8,2], tone:'light', from:5 },
        { c:[18.6,71.6,4.6], tone:'base', from:5 },
        { c:[17,69.6,1.9], tone:'light', from:5 }
      ],
      blossoms: [[22.4,65.6],[37,58.6],[25.6,50.6],[35.4,44],[18.6,71.6],[30,56],[41,50],[30,68],[30,38]]
    },

    tulip:{
      trunk: 'M29.3 96 L29.3 52 L30.7 52 L30.7 96 Z',
      trunkShort: 'M29.4 96 L29.4 74 L30.6 74 L30.6 96 Z',
      trunkTone: 'stem',
      parts: [
        { d:'M29.4 94.6 Q20.6 87 19 73.4 Q24.4 77.4 27 85 Q28.6 90 30.4 93.4 Z', tone:'stemdark', from:2, to:2 },
        { d:'M30.6 94.6 Q39.4 87 41 73.4 Q35.6 77.4 33 85 Q31.4 90 29.6 93.4 Z', tone:'stem', from:2, to:2 },
        { d:'M27.4 72 Q26 66.6 27.6 63 Q28.6 66.6 29 63.6 Q30 67 31 63.6 Q31.4 66.6 32.4 63 Q34 66.6 32.6 72 Q30 74.4 27.4 72 Z', tone:'base', from:2, to:2 },
        { d:'M29 71.4 Q28.4 66.6 29.4 63.6 Q30 66.6 30.2 71.6 Z', tone:'light', from:2, to:2 },

        { d:'M29.4 95 Q18.6 86 16.6 69.4 Q23 74.6 26.6 84 Q28.4 90 30.4 93.6 Z', tone:'stemdark', from:3 },
        { d:'M30.6 95 Q41.4 86 43.4 69.4 Q37 74.6 33.4 84 Q31.6 90 29.6 93.6 Z', tone:'stemdark', from:3 },
        { d:'M29.5 94 Q23.4 82.6 23 66 Q27 73.4 29 82.6 Q29.6 88.6 30.5 92.6 Z', tone:'stem', from:3 },
        { d:'M26.4 50 Q24.6 43 26.6 38.6 Q28 43 28.6 39.4 Q30 43.6 31.4 39.4 Q32 43 33.4 38.6 Q35.4 43 33.6 50 Q30 53 26.4 50 Z', tone:'base', from:3, to:4 },
        { d:'M28.4 49.4 Q27.6 43.6 28.8 39.6 Q29.6 43.6 29.8 49.6 Z', tone:'light', from:3, to:4 },

        { d:'M22.6 92 Q21 72 21.6 52 L23.4 52 Q23.4 72 24.6 92 Z', tone:'stem', from:4 },
        { d:'M18.6 48.6 Q17 42.6 18.6 38.6 Q19.8 42.6 20.4 39.4 Q21.6 43 22.6 39.4 Q23.2 42.6 24.4 38.6 Q26 42.6 24.4 48.6 Q21.4 51.4 18.6 48.6 Z', tone:'base', from:4 },
        { d:'M20.4 48 Q19.6 42.6 20.8 39.4 Q21.6 42.6 21.8 48.2 Z', tone:'light', from:4 },
        { d:'M29.6 90 Q26.6 76 27 60 L28.6 60 Q28.4 76 30.4 89 Z', tone:'stem', from:4 },

        { d:'M29.3 56 L29.3 34 L30.7 34 L30.7 56 Z', tone:'stem', from:5 },
        { d:'M26.4 32.6 Q24.4 25 26.6 20 Q28 25 28.6 21 Q30 25.6 31.4 21 Q32 25 34 20 Q35.6 25 33.6 32.6 Q30 36 26.4 32.6 Z', tone:'base', from:5 },
        { d:'M28.4 32 Q27.4 25.4 28.8 21 Q29.6 25.4 29.8 32.2 Z', tone:'light', from:5 },
        { d:'M37.4 92 Q39.4 72 38.6 54 L40.4 54 Q41.4 72 39.4 92 Z', tone:'stem', from:5 },
        { d:'M35.6 50.6 Q34 44.6 35.6 40.6 Q36.8 44.6 37.4 41.4 Q38.6 45 39.6 41.4 Q40.2 44.6 41.4 40.6 Q43 44.6 41.4 50.6 Q38.4 53.4 35.6 50.6 Z', tone:'base', from:5 },
        { d:'M37.4 50 Q36.6 44.6 37.8 41.4 Q38.6 44.6 38.8 50.2 Z', tone:'light', from:5 }
      ],
      blossoms: [[30,44],[21.4,44],[30,26],[38.4,46],[24.6,66],[35.4,66],[30,60],[18.6,58],[41.4,58]]
    },

    watermelon:{
      trunk: 'M11.4 95.4 Q30 86.6 48.6 95.4 Q30 90.6 11.4 95.4 Z',
      trunkShort: 'M21.4 95.6 Q30 91 38.6 95.6 Q30 93.4 21.4 95.6 Z',
      trunkTone: 'stemdark',
      parts: [
        { d:'M24.6 91.4 Q18.4 89.6 17.4 83 Q21.4 78.6 25.4 81.6 Q28 78.6 28.6 84.4 Q27.4 89.6 24.6 91.4 Z', tone:'stemdark', from:2, to:2 },
        { d:'M35.4 91.4 Q41.6 89.6 42.6 83 Q38.6 78.6 34.6 81.6 Q32 78.6 31.4 84.4 Q32.6 89.6 35.4 91.4 Z', tone:'stem', from:2, to:2 },
        { d:'M30 84 Q26 82.6 25.4 77.4 Q28 74.6 30.4 77 Q32.6 74.6 34.4 77.6 Q34 82.6 30 84 Z', tone:'stem', from:2, to:2 },

        { d:'M20.6 92.6 Q11.6 90 10 80 Q16 73.4 22 78 Q26 73.4 27.4 82 Q25.4 89.6 20.6 92.6 Z', tone:'stemdark', from:3 },
        { d:'M39.4 92.6 Q48.4 90 50 80 Q44 73.4 38 78 Q34 73.4 32.6 82 Q34.6 89.6 39.4 92.6 Z', tone:'stemdark', from:3 },
        { d:'M30 85 Q23.4 83 22 74.6 Q26.6 69 31 73 Q35 69 38 74.6 Q36.6 83 30 85 Z', tone:'stem', from:3 },
        { d:'M47.4 84.6 Q52.6 82.6 51.4 76.6 Q50 80.6 46.6 82.4 Z', tone:'stem', from:3 },
        { c:[42,90.6,5], tone:'deep', from:3, to:3 },
        { c:[40.4,88.6,1.9], tone:'light', from:3, to:3 },

        { d:'M15.4 88.6 Q7.4 85.4 7 76.6 Q12.6 70.6 18 75.4 Q22 71 23.4 79.4 Q21.4 86.6 15.4 88.6 Z', tone:'stem', from:4 },
        { d:'M25 82 Q19 80 17.6 72.6 Q22 67.4 26 71 Q30 67.4 32.6 72.6 Q31.4 80 25 82 Z', tone:'stem', from:4 },

        { d:'M44.6 88 Q52.6 85 53 76.6 Q47.4 70.6 42 75.4 Q38 71 36.6 79.4 Q38.6 86 44.6 88 Z', tone:'stemdark', from:5 },
        { d:'M36 80 Q30 78 28.6 70.6 Q33 65.4 37 69 Q41 65.4 43.6 70.6 Q42.4 78 36 80 Z', tone:'stem', from:5 },

        // a smooth oblong lying on the soil, striped dark on light: a cubic
        // ellipse rather than four quads, which came out boxy
        { d:'M29 85 C29 80.25 33.92 76.4 40 76.4 C46.08 76.4 51 80.25 51 85 C51 89.75 46.08 93.6 40 93.6 C33.92 93.6 29 89.75 29 85 Z', tone:'light', from:4, to:4 },
        { d:'M40 76.6 Q38.4 85 40 93.4 Q41.6 85 40 76.6 Z', tone:'deep', from:4, to:4 },
        { d:'M35.4 77.6 Q33.2 85 35.2 92.6 Q36.8 85 36.8 78 Z', tone:'deep', from:4, to:4 },
        { d:'M44.6 77.6 Q46.8 85 44.8 92.6 Q43.2 85 43.2 78 Z', tone:'deep', from:4, to:4 },
        { d:'M31.6 80.6 Q29.8 85 31.4 89.6 Q32.8 85 32.8 81 Z', tone:'deep', from:4, to:4 },
        { d:'M48.4 80.6 Q50.2 85 48.6 89.6 Q47.2 85 47.2 81 Z', tone:'deep', from:4, to:4 },
        { d:'M33.4 79.6 Q31.4 82.6 32 85.6 Q33.6 82.6 35 80.6 Z', tone:'base', from:4, to:4 },

        { d:'M25 84 C25 78.26 30.82 73.6 38 73.6 C45.18 73.6 51 78.26 51 84 C51 89.74 45.18 94.4 38 94.4 C30.82 94.4 25 89.74 25 84 Z', tone:'light', from:5 },
        { d:'M38 73.8 Q36.2 84 38 94.2 Q39.8 84 38 73.8 Z', tone:'deep', from:5 },
        { d:'M32.6 75 Q30 84 32.4 93 Q34.2 84 34.2 75.4 Z', tone:'deep', from:5 },
        { d:'M43.4 75 Q46 84 43.6 93 Q41.8 84 41.8 75.4 Z', tone:'deep', from:5 },
        { d:'M28.4 78 Q26.2 84 28.2 90 Q29.8 84 29.8 78.6 Z', tone:'deep', from:5 },
        { d:'M47.6 78 Q49.8 84 47.8 90 Q46.2 84 46.2 78.6 Z', tone:'deep', from:5 },
        { d:'M30.6 77.6 Q28.2 81 29 84.6 Q30.8 81 32.6 78.6 Z', tone:'base', from:5 }
      ],
      blossoms: [[24,74],[36,70],[14,80],[47.4,74],[30,80],[19.4,86],[51,82],[30,72],[42,72]]
    }
  };

  // Ornaments are single drawings — they never grow, which is exactly their job.
  var DECOR = {
    pot:[
      { d:'M21 96 L23.4 79 L36.6 79 L39 96 Z', tone:'clay' },
      { d:'M19.4 79 H40.6 V73.6 H19.4 Z', tone:'clay-light' },
      { d:'M30 73.6 Q23 71 21.4 63.4 Q28.6 63 30 70.6 Z', tone:'stem' },
      { d:'M30 73.6 Q37.4 70.6 39 62.6 Q31.4 62.6 30 70.6 Z', tone:'stemdark' }
    ],
    fence:[
      { d:'M13 96 H16.6 V70 H13 Z', tone:'wood' },
      { d:'M28.2 96 H31.8 V68 H28.2 Z', tone:'wood' },
      { d:'M43.4 96 H47 V70 H43.4 Z', tone:'wood' },
      { d:'M11.4 76 H48.6 V79.6 H11.4 Z', tone:'wood-light' },
      { d:'M11.4 86 H48.6 V89.6 H11.4 Z', tone:'wood-light' }
    ],
    lantern:[
      { d:'M21.6 96 H38.4 L36 91.4 H24 Z', tone:'wood-dark' },
      { d:'M23.6 91.4 H36.4 V89.6 H23.6 Z', tone:'wood-light' },
      { d:'M27.4 89.6 H32.6 V62 H27.4 Z', tone:'wood' },
      { d:'M27.4 89.6 H29.2 V62 H27.4 Z', tone:'wood-light' },
      { d:'M22.6 62.6 H37.4 V58.6 H22.6 Z', tone:'wood-dark' },
      { d:'M22.6 58.6 H37.4 V57 H22.6 Z', tone:'wood-light' },
      { d:'M20.6 58.6 H39.4 V40.6 H20.6 Z', tone:'wood-dark' },
      { d:'M23 56.4 H37 V43 H23 Z', tone:'lamp' },
      { d:'M29.2 56.4 H30.8 V43 H29.2 Z', tone:'wood-dark' },
      { d:'M23 50.4 H37 V48.8 H23 Z', tone:'wood-dark' },
      { d:'M18.4 40.6 H41.6 L30 31.6 Z', tone:'wood-dark' },
      { d:'M18.4 40.6 H41.6 V38.4 H18.4 Z', tone:'wood-light' },
      { c:[30,30.4,1.8], tone:'wood-light' },
      { c:[30,49.6,9.4], tone:'lamp-halo' }
    ],
    bench:[
      { d:'M16 96 H19.6 V80 H16 Z', tone:'wood-dark' },
      { d:'M40.4 96 H44 V80 H40.4 Z', tone:'wood-dark' },
      { d:'M13.4 76 H46.6 V81 H13.4 Z', tone:'wood-light' },
      { d:'M16.6 62 H19 V76 H16.6 Z', tone:'wood-dark' },
      { d:'M41 62 H43.4 V76 H41 Z', tone:'wood-dark' },
      { d:'M14.6 64 H45.4 V68 H14.6 Z', tone:'wood' },
      { d:'M14.6 70.4 H45.4 V74.4 H14.6 Z', tone:'wood' }
    ],
    // The pond comes with its fish. Making fish a separate purchase would need a
    // placement rule ("only next to water") and a way to fail at it, and this
    // card has no failure states — so the water and what lives in it are one
    // thing you buy once.
    pond:[
      { raw:'<ellipse class="t-stone" cx="30" cy="85" rx="23" ry="10.5"/>' },
      { raw:'<ellipse class="t-water" cx="30" cy="85.4" rx="19.5" ry="8"/>' },
      { raw:'<ellipse class="t-water-light" cx="24" cy="82.6" rx="7" ry="2.1"/>' },
      { raw:'<g class="pond-fish pond-fish-a">' +
            '<ellipse class="t-fish-a" cx="25" cy="86" rx="4.2" ry="2.1"/>' +
            '<path class="t-fish-a" d="M20.6 86 L17.4 83.6 L17.4 88.4 Z"/></g>' },
      { raw:'<g class="pond-fish pond-fish-b">' +
            '<ellipse class="t-fish-b" cx="37" cy="88.4" rx="3.4" ry="1.7"/>' +
            '<path class="t-fish-b" d="M40.4 88.4 L43.2 86.4 L43.2 90.4 Z"/></g>' }
    ],
    // Side-on, and small: a dog is not the size of a tree. Legs and tail sit in
    // their own groups so it can walk without the body sliding.
    dog:[
      { raw:'<g transform="translate(-2.4 0)"><g class="pet-walk"><path class="t-dog-deep" d="M18.6 84 H21.8 V93.4 H23.4 V96 H18.6 Z"/><path class="t-dog-deep" d="M34.6 84 H37.8 V93.4 H39.4 V96 H34.6 Z"/><path class="t-dog" d="M24 84 H27.2 V93.4 H28.8 V96 H24 Z"/><path class="t-dog" d="M40 84 H43.2 V93.4 H44.8 V96 H40 Z"/><g class="pet-tail"><path class="t-dog" d="M19.6 79.4 Q13.4 76 12.4 65.4 Q16.4 67.4 17.2 73 Q18 78 21.6 79.6 Z"/></g><path class="t-dog" d="M18.6 80.6 Q17.4 73.4 24 71.6 Q32 70 38.6 72.6 Q43.4 74.6 42.6 82.6 Q41.4 87.4 34.6 86.6 L24.6 86.6 Q19.4 86.4 18.6 80.6 Z"/><path class="t-dog-light" d="M25 85.4 Q33 87.4 41 84.6 Q40.6 87.4 34 87.4 L26.6 87.4 Q25.2 87 25 85.4 Z"/><path class="t-dog" d="M37.4 77.4 Q39.4 69.4 44.6 68 L47 74 Q42 76.4 40.6 80 Z"/><circle class="t-dog" cx="45.8" cy="67.4" r="6"/><path class="t-dog-light" d="M48.6 66.4 Q55 66 55.6 69.4 Q55.2 72.6 48.4 71.8 Z"/><circle class="t-nose" cx="54.8" cy="68.4" r="1.7"/><path class="t-dog-deep" d="M43 61.6 Q39 62.6 39 70 Q41.2 73 43.2 69 Q42 64.6 44.6 62.6 Z"/><circle class="t-eye" cx="47.6" cy="65.8" r="1.2"/></g></g>' }
    ],
    // Sitting, tail curled and flicking. Nothing about a pet in this card ever
    // needs feeding: an animal that gets hungry and sad is the punishment
    // mechanic docs/motivation-evidence.md rules out, dressed up as cuteness.
    chicken:[
      { raw:'<g class="pet-peck">' +
            '<path class="t-chick-foot" d="M27.4 96 V91 H29 V96 Z"/>' +
            '<path class="t-chick-foot" d="M31.4 96 V91 H33 V96 Z"/>' +
            '<g class="pet-tail"><path class="t-chick-deep" d="M22.4 86 Q16.6 82.6 15.6 75.6 Q20.6 78 23.6 83 Z"/></g>' +
            '<ellipse class="t-chick" cx="30.4" cy="86" rx="8.6" ry="6.4"/>' +
            '<circle class="t-chick" cx="37.4" cy="79.4" r="4.6"/>' +
            '<path class="t-chick-comb" d="M35.4 75.4 Q36.4 71.6 38.4 74 Q40 71.6 40.6 75.4 Z"/>' +
            '<path class="t-chick-comb" d="M40.6 80.6 L44 79.4 L40.6 82.4 Z"/>' +
            '<ellipse class="t-chick-light" cx="29.4" cy="87.4" rx="5.4" ry="3.4"/>' +
            '<circle class="t-eye" cx="38.6" cy="78.4" r="1"/>' +
            '</g>' }
    ],
    cow:[
      { raw:'<g class="pet-graze">' +
            '<path class="t-cow-deep" d="M19 96 V88 H21.6 V96 Z"/>' +
            '<path class="t-cow-deep" d="M24.6 96 V88 H27.2 V96 Z"/>' +
            '<path class="t-cow-deep" d="M35 96 V88 H37.6 V96 Z"/>' +
            '<path class="t-cow-deep" d="M40 96 V88 H42.6 V96 Z"/>' +
            '<g class="pet-tail"><path class="t-cow-deep" d="M17.6 82 Q13.4 80.6 12.6 73.6 Q16.4 76 17.4 80.4 Z"/></g>' +
            '<ellipse class="t-cow" cx="30" cy="81.4" rx="13.4" ry="8.4"/>' +
            '<ellipse class="t-cow-spot" cx="25" cy="79" rx="4.4" ry="3.4"/>' +
            '<ellipse class="t-cow-spot" cx="34.4" cy="83.4" rx="3.4" ry="2.6"/>' +
            '<circle class="t-cow" cx="43.4" cy="76.6" r="6"/>' +
            '<path class="t-cow-deep" d="M39.4 72.4 Q38.4 67.6 42 69.6 Q42.6 71 42 73.4 Z"/>' +
            '<path class="t-horn" d="M45.6 71.4 Q48.6 68.6 49.6 71.6 Q47.4 72.4 46.4 73.6 Z"/>' +
            '<ellipse class="t-cow-muzzle" cx="46.4" cy="79.4" rx="4.2" ry="3.2"/>' +
            '<circle class="t-eye" cx="44.4" cy="75" r="1.1"/>' +
            '</g>' }
    ],
    cat:[
      { raw:'<g class="pet-sit">' +
            '<g class="pet-tail"><path class="t-cat" d="M38.6 94 Q47.6 93 48.6 84.6 Q45 85.6 43.4 90 Q41.6 91.6 38.6 91.4 Z"/></g>' +
            '<path class="t-cat" d="M24.6 96 Q22.6 84 30 79.6 Q37.4 84 35.4 96 Z"/>' +
            '<circle class="t-cat" cx="30" cy="76.6" r="7"/>' +
            '<path class="t-cat-deep" d="M24.6 72.6 L23.6 65.6 L28.6 69.6 Z"/>' +
            '<path class="t-cat-deep" d="M35.4 72.6 L36.4 65.6 L31.4 69.6 Z"/>' +
            '<ellipse class="t-cat-light" cx="30" cy="79.6" rx="4.2" ry="3"/>' +
            '<circle class="t-eye" cx="27.4" cy="76" r="1.1"/>' +
            '<circle class="t-eye" cx="32.6" cy="76" r="1.1"/>' +
            '<circle class="t-nose" cx="30" cy="78.6" r="0.9"/>' +
            '</g>' }
    ]
  };

  var STAGE_SCALE = [0, 1, 0.92, 0.84, 1, 1];
  var STAGE_SHADOW_RX = [0, 7, 10, 11.5, 13, 13];

  // A ring of petals, generated rather than written out: twelve hand-authored
  // ellipse elements per flower per stage would be unmaintainable.
  function petalRing(spec, tone){
    var cx = spec[0], cy = spec[1], n = spec[2], rx = spec[3], ry = spec[4], dist = spec[5];
    var out = '';
    for(var i = 0; i < n; i++){
      var deg = (360 / n) * i;
      out += '<ellipse class="t-' + tone + '" cx="' + cx + '" cy="' + (cy - dist).toFixed(2) +
        '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + deg.toFixed(1) + ' ' + cx + ' ' + cy + ')"/>';
    }
    return out;
  }

  function svgPart(part){
    // A raw fragment, for the few things that need their own group so CSS can
    // animate a part independently of the rest of the drawing — a fish inside a
    // pond, a dog's legs, a cat's tail.
    if(part.raw) return part.raw;
    if(part.petals) return petalRing(part.petals, part.tone);
    if(part.c){
      return '<circle class="t-' + part.tone + '" cx="' + part.c[0] + '" cy="' + part.c[1] +
        '" r="' + part.c[2] + '"/>';
    }
    return '<path class="t-' + part.tone + '" d="' + part.d + '"/>';
  }

  function drawPlant(speciesKey, stage, blossoms, seed, flat){
    var spec = SPECIES[speciesKey] || SPECIES.oak;
    var h = hashString(seed);
    // `flat` is for the shop, where items side by side have to be comparable —
    // the wobble that makes a real bed look natural would read there as the
    // drawings being inconsistent.
    var rot = flat ? '0' : (((h % 11) - 5) * 0.5).toFixed(2);
    var wobble = flat ? 1 : 1 + ((((h >> 4) % 9) - 4) * 0.014);
    var flip = (!flat && ((h >> 9) % 2)) ? -1 : 1;
    var scale = STAGE_SCALE[stage] * wobble;

    var body = '', i;
    if(stage === 1){
      for(i = 0; i < SPROUT_PARTS.length; i++) body += svgPart(SPROUT_PARTS[i]);
    } else {
      var trunkD = (stage === 2 && spec.trunkShort) ? spec.trunkShort : spec.trunk;
      body += '<path class="t-' + (spec.trunkTone || 'bark') + '" d="' + trunkD + '"/>';
      for(i = 0; i < spec.parts.length; i++){
        var p = spec.parts[i];
        if(stage < p.from) continue;
        if(p.to && stage > p.to) continue;
        body += svgPart(p);
      }
      for(var b = 0; b < blossoms && b < spec.blossoms.length; b++){
        body += '<circle class="t-bloom" cx="' + spec.blossoms[b][0] + '" cy="' +
          spec.blossoms[b][1] + '" r="1.9"/>';
      }
    }
    return wrapSvg(body, STAGE_SHADOW_RX[stage], rot, scale * flip, scale);
  }

  // Where a producing animal shows what is waiting to be collected. The markers
  // sit above it rather than on it, so a cow does not sprout eggs.
  var DECOR_YIELD_SPOTS = [[22,60],[30,56],[38,60],[26,52],[34,52],[18,54],[42,54],[30,48],[24,46]];

  function drawDecor(decorKey, fruit){
    var parts = DECOR[decorKey] || [];
    var body = '';
    for(var i = 0; i < parts.length; i++) body += svgPart(parts[i]);
    for(var f = 0; f < (fruit || 0) && f < DECOR_YIELD_SPOTS.length; f++){
      body += '<circle class="t-yield" cx="' + DECOR_YIELD_SPOTS[f][0] + '" cy="' +
        DECOR_YIELD_SPOTS[f][1] + '" r="2.2"/>';
    }
    return wrapSvg(body, 13, '0', 1, 1);
  }

  // The drawings only span about 57% of the 60-unit box (roughly x 13..47), so at
  // the size the bed gives them they came out visibly smaller than the plot they
  // stand in. This scales every drawing up about its base so it fills the tile
  // properly, without changing the footprint a slot reserves — the svg is
  // overflow:visible, so a full-grown cypress simply leans a little into the
  // sky above its own tier.
  var ART_SCALE = 1.34;

  function wrapSvg(body, shadowRx, rot, scaleX, scaleY){
    scaleX = scaleX * ART_SCALE;
    scaleY = scaleY * ART_SCALE;
    shadowRx = shadowRx * ART_SCALE;
    return '<svg class="plant-svg" viewBox="0 0 60 96" width="46" height="74" aria-hidden="true" focusable="false">' +
      '<ellipse class="t-shadow" cx="' + PLANT_BASE_X + '" cy="94.6" rx="' + shadowRx + '" ry="2.4"/>' +
      // Two nested groups on purpose. The sway animation sets a CSS `transform`,
      // and a CSS transform REPLACES the SVG transform attribute outright rather
      // than composing with it — animating the inner group directly silently
      // threw away its stage scale, so a swaying plant drew at full size
      // whatever stage it was on. The outer group exists for the animation.
      '<g class="plant-sway">' +
        '<g class="plant-body" transform="translate(' + PLANT_BASE_X + ' ' + PLANT_BASE_Y +
          ') rotate(' + rot + ') scale(' + scaleX.toFixed(3) + ' ' + scaleY.toFixed(3) +
          ') translate(' + (-PLANT_BASE_X) + ' ' + (-PLANT_BASE_Y) + ')">' + body + '</g>' +
      '</g>' +
      '</svg>';
  }

  function drawShopIcon(item){
    return item.grows ? drawPlant(item.species, 4, 0, 'shop-' + item.kind, true)
                      : drawDecor(item.decor, 0);
  }

  // ---- state the view needs ----
  // What the pointer is currently holding: a bought item waiting for a slot, or
  // a planted item picked up to be moved. Not persisted — an armed cursor is
  // not something to restore a day later.
  var gardenHeld = null;   // {type:'buy', kind} | {type:'move', id}

  // The stored fields are still named plantedSeeds / harvestedSeeds. The
  // currency was renamed to "token" in the interface only; renaming the
  // persisted keys would need a migration for every garden already saved and
  // buys nothing.
  function gardenSeedTotals(focusSessions){
    var earned = 0;
    focusSessions.forEach(function(s){ if(s.status === 'completed') earned += 1; });
    var g = loadGarden();
    // Clamped: resetting statistics drops the earned total, and a negative
    // balance must never appear.
    return {
      earned: earned,
      spent: g.spent,
      income: g.income,
      available: Math.max(0, earned + g.income - g.spent),
      garden: g
    };
  }

  function plantAgeIn(item, earned){
    return Math.max(0, earned - (item.plantedSeeds || 0));
  }

  // Ripeness is counted from the last harvest, in pomodoros. A grower has to be
  // fully grown first; an animal produces from the day it arrives.
  function itemRipe(item, meta, earned){
    if(!meta.every || !meta.produce) return false;
    if(meta.grows && plantStageForAge(plantAgeIn(item, earned), matureOf(meta)) < 5) return false;
    var since = earned - (item.harvestedSeeds == null ? (item.plantedSeeds || 0) : item.harvestedSeeds);
    return since >= meta.every;
  }

  // How much fruit a ripe thing is carrying — and it is exactly what
  // harvesting will credit, so the drawing never promises more than it gives.
  // One unit per full cycle waited, capped: leaving something unpicked banks up
  // to nine cycles and no further, which is what stops the plot being a place
  // to hoard rather than tend. It is never a fraction of a target: unripe
  // simply draws none.
  function ripeFruitCount(item, meta, earned){
    if(!itemRipe(item, meta, earned)) return 0;
    // An annual is harvested once and taken with the crop, so it carries a
    // single unit however long it stands.
    if(meta.annual) return 1;
    var since = earned - (item.harvestedSeeds == null ? (item.plantedSeeds || 0) : item.harvestedSeeds);
    return Math.max(1, Math.min(9, Math.floor(since / meta.every)));
  }

  var STAGE_WORDS = ['', 'a seedling', 'a sapling', 'a young plant', 'a full plant', 'in bloom'];

  function buildGardenItem(item, earned){
    var meta = shopItem(item.kind);
    var el = document.createElement('span');
    var ripe = itemRipe(item, meta, earned);
    el.className = 'plant pl-' + (meta.palette == null ? 'decor' : meta.palette) + (ripe ? ' plant-ripe' : '');
    el.setAttribute('data-kind', item.kind);
    if(ripe) el.setAttribute('data-ripe', '1');
    var produce = meta.produce ? PRODUCE[meta.produce] : null;
    if(meta.grows){
      var age = plantAgeIn(item, earned);
      var stage = plantStageForAge(age, matureOf(meta));
      el.setAttribute('data-stage', String(stage));
      // Anything not yet at its last stage is still visibly on its way, so it is
      // the thing that moves. Nothing here is ever the plant that failed.
      if(stage < 5) el.className += ' plant-growing';
      el.innerHTML = drawPlant(meta.species, stage, ripeFruitCount(item, meta, earned), item.id);
      el.title = meta.name + ' · ' + STAGE_WORDS[stage] + ' · ' +
        age + (age === 1 ? ' pomodoro' : ' pomodoros') + ' since planting' +
        (ripe ? ' · ' + produce.label.toLowerCase() + ' ready — press to harvest' : '');
    } else {
      el.innerHTML = drawDecor(meta.decor, ripe ? ripeFruitCount(item, meta, earned) : 0);
      el.title = meta.name +
        (ripe ? ' · ' + produce.label.toLowerCase() + ' ready — press to harvest' : '');
    }
    return el;
  }

  // The shop is grouped, not a flat strip: with crops, fruit trees, flowers,
  // livestock, fish and ornaments all on one shelf, a single row stops being
  // browsable. Cheapest groups come first, so what a new garden can actually
  // reach is what it meets first.
  // Ornaments (a pot, a fence, a lantern, a bench) are deliberately absent for
  // now: land is divided into working parcels — beds, pens and ponds — and an
  // ornament taking up a plot in a bed is a plot that grows nothing. They come
  // back when there is somewhere for them to stand. Anything already planted
  // stays in storage untouched; see the note in loadGarden.
  var SHOP_CATS = [
    { key:'flower',  label:'Flowers' },
    { key:'crop',    label:'Vegetables & spices' },
    { key:'tree',    label:'Fruit & trees' },
    { key:'special', label:'Special' },
    { key:'animal',  label:'Livestock' },
    { key:'fish',    label:'Fish' }
  ];

  function renderShop(totals){
    if(!els.gardenShop) return;
    var held = gardenHeld && gardenHeld.type === 'buy' ? gardenHeld.kind : null;
    var html = '';
    for(var c = 0; c < SHOP_CATS.length; c++){
      var group = SHOP_ITEMS.filter(function(it){ return (it.cat || 'decor') === SHOP_CATS[c].key; });
      // A category whose art does not exist yet simply does not appear.
      if(group.length === 0) continue;
      html += '<div class="shop-group"><h3 class="shop-group-label">' + SHOP_CATS[c].label +
        '</h3><div class="shop-group-items">';
      for(var i = 0; i < group.length; i++){
        var item = group[i];
        var affordable = totals.available >= item.price;
        // Unaffordable items are dimmed and still priced. What is deliberately
        // absent is any "you need N more" — see the note at the top of this
        // section on why a shortfall is never rendered anywhere in this card.
        html += '<button type="button" class="shop-item' +
          (held === item.kind ? ' shop-item-held' : '') +
          (affordable ? '' : ' shop-item-locked') +
          '" data-shop="' + item.kind + '"' +
          (held === item.kind ? ' aria-pressed="true"' : ' aria-pressed="false"') +
          ' title="' + item.name + ' · ' + item.price + ' tokens' +
          (item.produce ? ' · gives ' + PRODUCE[item.produce].label.toLowerCase() : '') + '">' +
          '<span class="shop-art pl-' + (item.palette == null ? 'decor' : item.palette) + '">' +
            drawShopIcon(item) + '</span>' +
          '<span class="shop-name">' + item.name + '</span>' +
          '<span class="shop-price">' + item.price + '</span>' +
          '</button>';
      }
      html += '</div></div>';
    }
    els.gardenShop.innerHTML = html;
  }

  // One building per pen, standing at its edge the way a coop or a barn sits at
  // the edge of a yard. These are drawn from a wider, shallower box than a plant
  // (a building is wide and low, a plant is narrow and tall) and they are scenery
  // rather than stock: nothing is bought, harvested or grown here.
  var HOUSES = {
    chicken: {
      label: 'Chicken coop',
      // A coop reads by the pitched roof over a small square box with a pop-hole
      // and a ramp. Nesting-box lid on the side is what stops it being a shed.
      art:
        '<path class="t-wood-dark" d="M6 30 L34 30 L34 46 L6 46 Z"/>' +
        '<path class="t-wood" d="M8 32 L32 32 L32 44 L8 44 Z"/>' +
        '<path class="t-bark" d="M2 31 L20 18 L38 31 Z"/>' +
        '<path class="t-wood-dark" d="M14 36 L24 36 L24 44 L14 44 Z"/>' +
        '<path class="t-wood" d="M15 46 L27 46 L31 52 L19 52 Z"/>' +
        '<path class="t-bark" d="M32 34 L44 34 L44 40 L32 40 Z"/>' +
        '<circle class="t-lamp" cx="19" cy="26" r="1.6"/>'
    },
    cow: {
      label: 'Cow barn',
      // The biggest building of the set, because a barn that is not obviously the
      // biggest reads as another shed. Big double door, hayloft opening above it.
      art:
        '<path class="t-wood-dark" d="M2 26 L46 26 L46 52 L2 52 Z"/>' +
        '<path class="t-clay" d="M4 28 L44 28 L44 50 L4 50 Z"/>' +
        '<path class="t-bark" d="M0 27 L24 10 L48 27 Z"/>' +
        '<path class="t-wood-dark" d="M16 34 L32 34 L32 52 L16 52 Z"/>' +
        '<path class="t-wood" d="M17.5 36 L23 36 L23 52 L17.5 52 Z"/>' +
        '<path class="t-wood" d="M25 36 L30.5 36 L30.5 52 L25 52 Z"/>' +
        '<path class="t-wood-dark" d="M20 20 L28 20 L28 28 L20 28 Z"/>' +
        '<path class="t-seedhead" d="M21 22 L27 22 L27 27 L21 27 Z"/>'
    },
    pig: {
      label: 'Pig sty',
      // Low, wide, half-open: a sty is a shelter with a fenced wallow beside it,
      // never a closed building. The mud is what names it.
      art:
        '<path class="t-wood-dark" d="M4 34 L28 34 L28 50 L4 50 Z"/>' +
        '<path class="t-wood" d="M6 36 L26 36 L26 48 L6 48 Z"/>' +
        '<path class="t-bark" d="M1 35 L16 24 L31 35 Z"/>' +
        '<path class="t-wood-dark" d="M12 40 L21 40 L21 50 L12 50 Z"/>' +
        '<path class="t-clay-deep" d="M28 46 Q38 43 46 47 Q38 53 28 50 Z"/>' +
        '<path class="t-wood" d="M31 36 L32.6 36 L32.6 48 L31 48 Z"/>' +
        '<path class="t-wood" d="M40 36 L41.6 36 L41.6 48 L40 48 Z"/>' +
        '<path class="t-wood-dark" d="M30 39 L43 39 L43 40.6 L30 40.6 Z"/>'
    },
    pets: {
      label: 'Kennel and cat house',
      // Both buildings, because both animals live here: the kennel everybody
      // recognises by its round doorway, and beside it the smaller raised box
      // with a scratching post — that pairing is what says cat rather than
      // second dog. Drawn as one piece of scenery so the pen has one building
      // group rather than two things competing at its corner.
      art:
        // the kennel
        '<path class="t-wood-dark" d="M2 30 L28 30 L28 52 L2 52 Z"/>' +
        '<path class="t-clay" d="M4 32 L26 32 L26 50 L4 50 Z"/>' +
        '<path class="t-bark" d="M0 31 L15 16 L30 31 Z"/>' +
        '<path class="t-wood-dark" d="M15 35 Q22 35 22 43 L22 52 L8 52 L8 43 Q8 35 15 35 Z"/>' +
        '<path class="t-bark" d="M13 23 L17 23 L17 29 L13 29 Z"/>' +
        // the cat house, smaller and up on legs
        '<path class="t-wood-dark" d="M31 38 L47 38 L47 48 L31 48 Z"/>' +
        '<path class="t-clay" d="M32.5 39.5 L45.5 39.5 L45.5 46.5 L32.5 46.5 Z"/>' +
        '<path class="t-bark" d="M29 39 L39 30 L49 39 Z"/>' +
        '<circle class="t-wood-dark" cx="39" cy="43" r="3.4"/>' +
        '<path class="t-wood" d="M33 48 L34.6 48 L34.6 52 L33 52 Z"/>' +
        '<path class="t-wood" d="M43.4 48 L45 48 L45 52 L43.4 52 Z"/>'
    }
  };

  // A pond needs no building: the water IS the thing, which is why `pond` is a
  // kind of land here and the fish in it are the stock.
  // Deliberately small. Full-size sheds in every pen made the screen look like a
  // row of warehouses, which is the job of the one Store building and nothing
  // else. A coop is a coop-sized thing at the corner of a yard.
  function houseFor(family){
    if(!family || family.indexOf('pen:') !== 0) return '';
    var house = HOUSES[family.slice(4)];
    if(!house) return '';
    return '<svg class="house-svg" viewBox="0 0 48 52" width="48" height="52" ' +
      'role="img" aria-label="' + house.label + '">' + house.art + '</svg>';
  }

  // ---- the two buildings on the farm ----
  // One shop, one store, standing on the yard at the near end of the farm. They
  // are the way in to the two panels; the HUD button stays as well, because a
  // building is a mouse target and a button is a keyboard one.
  var BUILDINGS = [
    {
      key: 'shop',
      name: 'Shop',
      // A market stall: open front, striped awning, goods on the counter. It has
      // to read as somewhere you BUY, which a plain house does not.
      art:
        '<path class="b-wall-dark" d="M4 34 L60 34 L60 64 L4 64 Z"/>' +
        '<path class="b-wall" d="M7 37 L57 37 L57 62 L7 62 Z"/>' +
        '<path class="b-roof" d="M0 35 L32 12 L64 35 Z"/>' +
        '<path class="b-roof-dark" d="M0 35 L64 35 L64 39 L0 39 Z"/>' +
        '<path class="b-counter" d="M11 50 L53 50 L53 62 L11 62 Z"/>' +
        '<path class="b-awning" d="M9 44 L55 44 L55 50 L9 50 Z"/>' +
        '<path class="b-awning-stripe" d="M15 44 L21 44 L21 50 L15 50 Z"/>' +
        '<path class="b-awning-stripe" d="M29 44 L35 44 L35 50 L29 50 Z"/>' +
        '<path class="b-awning-stripe" d="M43 44 L49 44 L49 50 L43 50 Z"/>' +
        '<circle class="b-goods" cx="19" cy="55" r="2.6"/>' +
        '<circle class="b-goods-b" cx="27" cy="55" r="2.6"/>' +
        '<circle class="b-goods" cx="35" cy="55" r="2.6"/>' +
        '<circle class="b-goods-b" cx="43" cy="55" r="2.6"/>' +
        '<path class="b-sign" d="M22 20 L42 20 L42 30 L22 30 Z"/>'
    },
    {
      key: 'store',
      name: 'Store',
      // A barn with its doors shut and a hayloft over them. Closed doors are the
      // whole difference from the shop: one is open for business, one holds what
      // you have put away.
      art:
        '<path class="b-wall-dark" d="M2 30 L58 30 L58 64 L2 64 Z"/>' +
        '<path class="b-wall" d="M5 33 L55 33 L55 62 L5 62 Z"/>' +
        '<path class="b-roof" d="M0 31 L30 8 L60 31 Z"/>' +
        '<path class="b-roof-dark" d="M0 31 L60 31 L60 35 L0 35 Z"/>' +
        '<path class="b-door" d="M18 42 L42 42 L42 62 L18 62 Z"/>' +
        '<path class="b-door-panel" d="M20 44 L29 44 L29 62 L20 62 Z"/>' +
        '<path class="b-door-panel" d="M31 44 L40 44 L40 62 L31 62 Z"/>' +
        '<path class="b-hay" d="M24 20 L36 20 L36 30 L24 30 Z"/>' +
        '<path class="b-hay-dark" d="M25.5 22 L34.5 22 L34.5 29 L25.5 29 Z"/>'
    }
  ];

  function renderBuildings(){
    if(!els.gardenYard || els.gardenYard.childElementCount) return;
    var html = '';
    for(var i = 0; i < BUILDINGS.length; i++){
      var b = BUILDINGS[i];
      html += '<button type="button" class="farm-building building-' + b.key +
        '" data-building="' + b.key + '">' +
        '<svg class="building-svg" viewBox="0 0 64 64" width="64" height="64" ' +
          'aria-hidden="true">' + b.art + '</svg>' +
        '<span class="building-name">' + b.name + '</span>' +
        '</button>';
    }
    els.gardenYard.innerHTML = html;
  }

  // ---- the farmer, and the camera that follows them ----
  // Deliberately a few shapes and no face: at the size this is drawn, a face
  // becomes two smudges, and a character with a bad face reads worse than one
  // with none. Straw hat, shirt, two legs — that is enough to be somebody.
  var FARMER_ART =
    '<svg class="farmer-svg" viewBox="0 0 28 40" width="28" height="40" aria-hidden="true">' +
      '<ellipse class="f-shadow" cx="14" cy="38.5" rx="7" ry="1.8"/>' +
      '<g class="farmer-bob">' +
        '<path class="f-leg f-leg-a" d="M11 27 L13.4 27 L13.4 37 L11 37 Z"/>' +
        '<path class="f-leg f-leg-b" d="M14.6 27 L17 27 L17 37 L14.6 37 Z"/>' +
        '<path class="f-boot" d="M10.2 36 L14.2 36 L14.2 38.4 L10.2 38.4 Z"/>' +
        '<path class="f-boot" d="M13.8 36 L17.8 36 L17.8 38.4 L13.8 38.4 Z"/>' +
        '<path class="f-shirt" d="M9.4 15 Q14 13.4 18.6 15 L19.4 27.4 Q14 28.6 8.6 27.4 Z"/>' +
        '<path class="f-arm" d="M8.6 16 L10.4 16 L9.6 25 L7.8 25 Z"/>' +
        '<path class="f-arm" d="M17.6 16 L19.4 16 L20.2 25 L18.4 25 Z"/>' +
        '<circle class="f-skin" cx="14" cy="10.4" r="4.4"/>' +
        '<path class="f-hat" d="M5.6 10 Q14 7.4 22.4 10 Q14 12.4 5.6 10 Z"/>' +
        '<path class="f-hat-crown" d="M10.4 10 Q10.8 4.6 14 4.6 Q17.2 4.6 17.6 10 Z"/>' +
        '<path class="f-band" d="M10.4 8.6 Q14 7.8 17.6 8.6 L17.6 9.8 Q14 9 10.4 9.8 Z"/>' +
      '</g>' +
    '</svg>'
  ;

  // World coordinates, in pixels, inside #gardenWorld. Null until the farm has
  // been laid out once and there is somewhere to stand.
  var farmer = null;      // { x, y, tx, ty, facing }
  var camera = { x: 0, y: 0 };
  var farmFrame = 0;
  // Pixels per frame at 60fps: about 150px a second, which crosses one parcel in
  // roughly three seconds. Fast enough not to be a chore, slow enough to read as
  // somebody walking rather than a cursor being dragged.
  var FARMER_SPEED = 2.5;
  var FARMER_EASE = 26;    // distance over which the last stride slows down

  function farmReduceMotion(){
    try{
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }catch(e){ return false; }
  }

  // The camera keeps the farmer in the middle, but never past the edge of the
  // world — panning into empty space off the side of the farm would read as the
  // view being broken.
  function farmCameraApply(){
    if(!els.gardenWorld || !els.gardenScene || !farmer) return;
    var vw = els.gardenScene.clientWidth;
    var vh = els.gardenScene.clientHeight;
    var ww = els.gardenWorld.offsetWidth;
    var wh = els.gardenWorld.offsetHeight;
    var maxX = Math.max(0, ww - vw);
    var maxY = Math.max(0, wh - vh);
    camera.x = Math.min(maxX, Math.max(0, farmer.x - vw / 2));
    camera.y = Math.min(maxY, Math.max(0, farmer.y - vh / 2));
    els.gardenWorld.style.transform = 'translate(' + (-Math.round(camera.x)) + 'px,' +
      (-Math.round(camera.y)) + 'px)';
    if(els.gardenFarmer){
      els.gardenFarmer.style.transform = 'translate(' + Math.round(farmer.x) + 'px,' +
        Math.round(farmer.y) + 'px) scaleX(' + farmer.facing + ')';
    }
  }

  function farmStep(){
    farmFrame = 0;
    if(!farmer) return;
    var dx = farmer.tx - farmer.x;
    var dy = farmer.ty - farmer.y;
    var far = Math.sqrt(dx * dx + dy * dy);
    if(far < 1.2){
      farmer.x = farmer.tx;
      farmer.y = farmer.ty;
      if(els.gardenFarmer) els.gardenFarmer.classList.remove('farmer-walking');
      farmCameraApply();
      return;
    }
    // A walking pace, and the same one whatever the distance. The old step was a
    // fraction of the remaining distance, which meant the farmer SPRINTED at the
    // start of a long walk and crept at the end — the opposite of how walking
    // works. Constant speed, easing off only over the last stride or so, so the
    // arrival is not a dead stop.
    var step = FARMER_SPEED;
    if(far < FARMER_EASE) step = Math.max(0.7, FARMER_SPEED * (far / FARMER_EASE));
    step = Math.min(far, step);
    farmer.x += (dx / far) * step;
    farmer.y += (dy / far) * step;
    if(Math.abs(dx) > 2) farmer.facing = dx < 0 ? -1 : 1;
    if(els.gardenFarmer) els.gardenFarmer.classList.add('farmer-walking');
    farmCameraApply();
    farmFrame = requestAnimationFrame(farmStep);
  }

  function farmWalkTo(x, y){
    if(!farmer) return;
    farmer.tx = x;
    farmer.ty = y;
    if(farmReduceMotion()){
      // No frame-by-frame chase: the view simply is where it needs to be.
      farmer.x = x;
      farmer.y = y;
      farmCameraApply();
      return;
    }
    if(!farmFrame) farmFrame = requestAnimationFrame(farmStep);
  }

  // A right-click is the whole movement control, the way it is in a MOBA: press
  // where you want to stand and the farmer walks there. Left-click is left alone
  // for the plots, so working the farm and walking about never compete for the
  // same gesture.
  //
  // A destination marker is drawn where the press landed, because without one a
  // click that misses the walkable area looks like the game ignored you.
  function farmMark(x, y){
    if(!els.gardenWorld) return;
    var mark = els.gardenWorld.querySelector('.farm-mark');
    if(!mark){
      mark = document.createElement('span');
      mark.className = 'farm-mark';
      mark.setAttribute('aria-hidden', 'true');
      els.gardenWorld.appendChild(mark);
    }
    mark.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    // Restart the animation on every press: the same element re-triggered, so a
    // rapid series of clicks does not leave a stale marker sitting there.
    mark.classList.remove('farm-mark-ping');
    void mark.offsetWidth;
    mark.classList.add('farm-mark-ping');
  }

  function bindFarmer(){
    if(!els.gardenScene || !els.gardenWorld) return;

    els.gardenFarmer = document.createElement('div');
    els.gardenFarmer.className = 'farmer';
    els.gardenFarmer.setAttribute('aria-hidden', 'true');
    els.gardenFarmer.innerHTML = FARMER_ART;
    els.gardenWorld.appendChild(els.gardenFarmer);

    // Standing on the path between the first two parcels, not pinned to a corner:
    // the opening shot should be of the farm, not of the fence.
    farmer = { x: 640, y: 300, tx: 640, ty: 300, facing: 1 };
    farmCameraApply();

    // World point under the pointer = pointer in the viewport + camera offset.
    // Bound once; the world only ever moves by transform, so no rebuild of the
    // parcels invalidates this.
    function pointIn(e){
      var box = els.gardenScene.getBoundingClientRect();
      return { x: e.clientX - box.left + camera.x, y: e.clientY - box.top + camera.y };
    }

    els.gardenScene.addEventListener('contextmenu', function(e){
      // Only inside the scene. The browser keeps its menu everywhere else.
      e.preventDefault();
      var at = pointIn(e);
      farmMark(at.x, at.y);
      farmWalkTo(at.x, at.y);
    });

    // Touch has no right button and no hover. A long press is the closest thing
    // the platform offers, and browsers already raise `contextmenu` for it — so
    // touch is handled by the line above and needs nothing of its own. A plain
    // tap therefore keeps working as a tap on whatever is under it.
    window.addEventListener('resize', farmCameraApply);
  }

  // Animals and fish move about; plants and buildings do not.
  function roams(meta){
    return !!meta && (meta.cat === 'animal' || meta.cat === 'fish');
  }

  // Four waypoints inside the parcel, in units of the plot the animal is
  // anchored to. A parcel is five plots across and two deep, so a range of
  // roughly +-2 plots sideways and +-0.6 down covers the whole enclosure while
  // keeping every animal inside its own fence.
  function setRoam(slot, id){
    var h = mix32(hashString(id));
    function pick(shift, span){
      // Two bytes out of the hash per waypoint, mapped to -span..+span.
      return (((h >>> shift) & 255) / 255 * 2 - 1) * span;
    }
    slot.style.setProperty('--roam-x1', pick(0, 190).toFixed(1) + '%');
    slot.style.setProperty('--roam-y1', pick(4, 42).toFixed(1) + '%');
    slot.style.setProperty('--roam-x2', pick(8, 190).toFixed(1) + '%');
    slot.style.setProperty('--roam-y2', pick(12, 42).toFixed(1) + '%');
    slot.style.setProperty('--roam-x3', pick(16, 190).toFixed(1) + '%');
    slot.style.setProperty('--roam-y3', pick(20, 42).toFixed(1) + '%');
    // Between 16 and 32 seconds for a full round, so no two animals fall into
    // step and the pen never looks choreographed.
    slot.style.setProperty('--roam-dur', (16 + ((h >>> 24) & 255) / 255 * 16).toFixed(1) + 's');
    slot.style.setProperty('--roam-delay', (-((h >>> 26) & 31)).toFixed(1) + 's');
  }

  function renderPlot(totals){
    if(!els.gardenPlot) return;
    renderBuildings();
    var items = totals.garden.items;
    var occupied = {};
    items.forEach(function(it){ occupied[it.row + ':' + it.col] = it; });


    var owned = parcelsOwned(totals.garden);
    var shown = parcelCount(owned);
    var heldFamily = gardenHeld && gardenHeld.type === 'buy'
      ? familyOf(shopItem(gardenHeld.kind)) : null;

    els.gardenPlot.className = 'garden-plot plot-field';
    els.gardenPlot.innerHTML = '';

    for(var p = 0; p < shown; p++){
      var parcel = document.createElement('div');
      parcel.className = 'parcel';
      parcel.setAttribute('data-parcel', String(p));

      if(p >= owned){
        // Unopened land, with a sign on it and a price. Dimmed and still priced
        // when it is out of reach — never "you need N more", the same rule the
        // shop follows, for the same reason.
        var price = parcelPrice(p);
        parcel.className += ' parcel-locked';
        var buy = document.createElement('button');
        buy.type = 'button';
        buy.className = 'parcel-buy' + (totals.available < price ? ' parcel-buy-costly' : '');
        buy.setAttribute('data-buy-parcel', String(p));
        buy.innerHTML = '<span class="parcel-buy-word">Open land</span>' +
          '<span class="parcel-buy-price">' + price + '</span>';
        buy.setAttribute('aria-label', 'Open new land for ' + price + ' tokens');
        buy.title = 'Open this land — ' + price + ' tokens';
        parcel.appendChild(buy);
        els.gardenPlot.appendChild(parcel);
        continue;
      }

      var family = parcelFamily(items, p);
      // A pen carries two classes: the generic one so every pen shares its
      // grass and fence, and the kind so it gets its own building.
      if(family && family.indexOf('pen:') === 0){
        parcel.className += ' parcel-pen parcel-pen-' + family.slice(4);
      } else {
        parcel.className += ' parcel-' + (family || 'meadow');
      }
      // The building stands at the edge of the parcel, the way a coop or a barn
      // sits at the edge of a yard — drawn once for the parcel, not once per
      // animal, because it houses all of them.
      var house = houseFor(family);
      if(house){
        var houseEl = document.createElement('span');
        houseEl.className = 'parcel-house';
        houseEl.setAttribute('aria-hidden', 'true');
        houseEl.innerHTML = house;
        parcel.appendChild(houseEl);
      }
      // Marked when what is in hand cannot go here at all, so the whole parcel
      // reads as not-this-one rather than each plot in it refusing separately.
      if(heldFamily && family && heldFamily !== family){
        parcel.className += ' parcel-wrong';
      }

      var origin = parcelOrigin(p);
      var grid = document.createElement('div');
      grid.className = 'parcel-grid';
      for(var n = 0; n < PARCEL_SLOTS; n++){
        var row = origin.row + Math.floor(n / PARCEL_COLS);
        var col = origin.col + (n % PARCEL_COLS);
        var slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'plot-slot';
        slot.setAttribute('data-row', String(row));
        slot.setAttribute('data-col', String(col));
        var it = occupied[row + ':' + col];
        // An item whose kind is no longer in the shop stays in storage but has
        // nothing to draw with, so the plot reads as empty for now.
        if(it && !shopItem(it.kind)) it = null;
        if(it){
          slot.classList.add('plot-slot-filled');
          slot.classList.add('plot-ground-' + groundFor(shopItem(it.kind)));
          if(gardenHeld && gardenHeld.type === 'move' && gardenHeld.id === it.id){
            slot.classList.add('plot-slot-lifted');
          }
          slot.appendChild(buildGardenItem(it, totals.earned));
          slot.setAttribute('aria-label', slot.firstChild.title);
        } else {
          slot.setAttribute('aria-label',
            'Empty plot, land ' + (p + 1) + ' plot ' + (n + 1));
        }
        // Staggered so the whole farm does not breathe in lockstep.
        slot.style.setProperty('--sway-delay', (-((p * PARCEL_SLOTS + n) % 7) * 0.9) + 's');
        // An animal wanders its whole parcel rather than standing on its plot.
        // The route is derived from the animal's own id, so every one of them
        // takes a different path and takes the SAME path every time the farm is
        // redrawn — an animal that jumps somewhere else on every click reads as a
        // different animal, not as the same one moving.
        if(it && roams(shopItem(it.kind))) setRoam(slot, it.id);
        grid.appendChild(slot);
      }
      parcel.appendChild(grid);
      els.gardenPlot.appendChild(parcel);
    }
    els.gardenPlot.classList.toggle('plot-armed', !!gardenHeld);

    // The view is a camera on the farmer, not a scrollbar, so rebuilding the
    // farm never moves it: whatever was on screen stays on screen.
    farmCameraApply();
  }

  // The line on the stage says what you are DOING, and nothing else. The
  // instructions for how buying works moved into the shop itself — onboarding
  // text standing permanently over the garden was the thing that made the
  // screen hard to read, and it is only relevant while the shop is open.
  function renderGardenHint(totals){
    if(!els.gardenHint) return;
    if(gardenHeld && gardenHeld.type === 'buy'){
      var item = shopItem(gardenHeld.kind);
      // No article: "a oak" is wrong and "an oak" needs a rule this string does
      // not deserve, so the item name stands on its own.
      els.gardenHint.textContent = 'Holding ' + item.name +
        ' — pick an empty spot to plant it, or press it again to put it back.';
    } else if(gardenHeld && gardenHeld.type === 'move'){
      els.gardenHint.textContent = 'Moving — pick an empty spot to put it down, or press it again to leave it.';
    } else {
      els.gardenHint.textContent = '';
    }
  }

  function renderGarden(focusSessions){
    if(!els.gardenPlot) return;
    var totals = gardenSeedTotals(focusSessions);
    // The panel covers the whole stage, so the balance has to be legible from
    // inside it too — otherwise you are shopping blind.
    if(els.gardenShopTokens){
      els.gardenShopTokens.textContent = totals.available +
        (totals.available === 1 ? ' token' : ' tokens');
    }
    els.gardenCount.textContent = totals.available + (totals.available === 1 ? ' token' : ' tokens') +
      // "N planted" would read as N plants; this number is seeds, and the
      // phrasing avoids "spent" because nothing here is lost — it is in the soil.
      (totals.spent > 0 ? ' · ' + totals.spent + ' in the ground' : '');
    renderShop(totals);
    renderPlot(totals);
    renderBasket(totals);
    renderGardenHint(totals);
  }

  // ---- interaction ----
  function gardenTotalsNow(){
    return gardenSeedTotals(loadSessions().filter(function(s){ return s.type !== 'break'; }));
  }

  function holdShopItem(kind){
    if(gardenHeld && gardenHeld.type === 'buy' && gardenHeld.kind === kind){
      gardenHeld = null;   // pressing the held item again puts it back
    } else {
      var item = shopItem(kind);
      if(!item) return;
      if(gardenTotalsNow().available < item.price) return;   // silently ignored, never scolded
      gardenHeld = { type:'buy', kind: kind };
      setShopOpen(false);
    }
    refreshStats();
  }

  // Land is opened one parcel at a time, in order. Out of order would leave
  // holes in the farm and stop `parcels` being a single number.
  function buyParcel(index){
    var totals = gardenTotalsNow();
    var g = totals.garden;
    var owned = parcelsOwned(g);
    if(index !== owned || index >= PARCELS_MAX){ refreshStats(); return; }
    var price = parcelPrice(index);
    // Not enough yet: ignored in silence. Nothing here to have failed at.
    if(totals.available < price){ refreshStats(); return; }
    g.spent += price;
    g.parcels = owned + 1;
    saveGarden(g);
    refreshStats();
  }

  function useSlot(row, col){
    var totals = gardenTotalsNow();
    var g = totals.garden;

    // Nothing happens on land that has not been opened. Land is bought from its
    // own sign, not by pressing a plot, so there is exactly one way to do it.
    var parcel = parcelOf(row, col);
    if(parcel >= parcelsOwned(g)){ refreshStats(); return; }

    var existing = null;
    for(var i = 0; i < g.items.length; i++){
      if(g.items[i].row === row && g.items[i].col === col){ existing = g.items[i]; break; }
    }

    if(gardenHeld && gardenHeld.type === 'buy' && !existing){
      var item = shopItem(gardenHeld.kind);
      if(totals.available < item.price){ gardenHeld = null; refreshStats(); return; }
      // A parcel commits to one family the moment the first thing goes in it, so
      // a pond fills with fish and a bed fills with crops. Refused in silence,
      // still holding the item, because a wrong parcel is a miss and not a fault.
      var want = familyOf(item);
      var has = parcelFamily(g.items, parcel);
      if(want && has && want !== has){ refreshStats(); return; }
      g.items.push({
        id: generateId(),
        kind: item.kind,
        col: col,
        row: row,
        plantedAt: nowMs(),
        // Growth is measured against the work done since this moment, so the
        // number stored is the pomodoro count at planting, not a timestamp.
        plantedSeeds: totals.earned
      });
      g.spent += item.price;
      saveGarden(g);
      gardenHeld = null;
    } else if(gardenHeld && gardenHeld.type === 'move' && !existing){
      var moving = null;
      for(var m = 0; m < g.items.length; m++){
        if(g.items[m].id === gardenHeld.id){ moving = g.items[m]; break; }
      }
      if(!moving){ gardenHeld = null; refreshStats(); return; }
      // The same family rule as planting: a cow cannot be walked into the beds.
      // Judged against the parcel WITHOUT this item in it, so shuffling the last
      // fish around its own pond is never blocked by itself.
      var others = g.items.filter(function(it){ return it.id !== moving.id; });
      var wantMove = familyOf(shopItem(moving.kind));
      var hasMove = parcelFamily(others, parcel);
      if(wantMove && hasMove && wantMove !== hasMove){ refreshStats(); return; }
      for(var j = 0; j < g.items.length; j++){
        if(g.items[j].id === gardenHeld.id){ g.items[j].row = row; g.items[j].col = col; break; }
      }
      saveGarden(g);
      gardenHeld = null;
    } else if(existing && !gardenHeld && itemRipe(existing, shopItem(existing.kind), totals.earned)){
      // A ripe thing is harvested by pressing it — the same gesture a farm game
      // uses, and it needs no extra control. Nothing is consumed: the plant
      // stays exactly as it is and only its ripening clock restarts.
      var meta = shopItem(existing.kind);
      g.basket[meta.produce] = (g.basket[meta.produce] || 0) +
        ripeFruitCount(existing, meta, totals.earned);
      if(meta.annual){
        // An annual is lifted with its crop, the way picking a lettuce works.
        // This is not the garden taking something away: it happens only because
        // you pressed it, and the produce is always worth more than the item
        // cost, so a mis-press can never leave you poorer. Nothing is ever
        // removed by neglect or by time passing.
        g.items = g.items.filter(function(it){ return it.id !== existing.id; });
      } else {
        existing.harvestedSeeds = totals.earned;
      }
      saveGarden(g);
    } else if(existing){
      // Pressing an unripe planted thing picks it up to move; pressing it again
      // leaves it where it is. Nothing is ever removed or refunded here.
      gardenHeld = (gardenHeld && gardenHeld.type === 'move' && gardenHeld.id === existing.id)
        ? null : { type:'move', id: existing.id };
    } else {
      gardenHeld = null;
    }
    refreshStats();
  }

  function basketValue(basket){
    var total = 0;
    Object.keys(basket).forEach(function(k){
      if(PRODUCE[k]) total += basket[k] * PRODUCE[k].value;
    });
    return total;
  }

  function sellBasket(){
    var totals = gardenTotalsNow();
    var g = totals.garden;
    var gain = basketValue(g.basket);
    if(gain <= 0) return;
    g.income += gain;
    g.basket = {};
    saveGarden(g);
    refreshStats();
  }

  function renderBasket(totals){
    if(!els.gardenBasket) return;
    var basket = totals.garden.basket;
    var kinds = Object.keys(basket).filter(function(k){ return basket[k] > 0 && PRODUCE[k]; });
    if(kinds.length === 0){
      // An empty store says so, rather than vanishing: the building is still
      // there, and "nothing in it yet" is a different thing from "no store".
      els.gardenBasket.innerHTML = '<p class="basket-empty">Nothing harvested yet. ' +
        'Press anything that is ready and it lands here.</p>';
      return;
    }
    // Sorted by what the row is worth, so the reason to sell reads top down.
    kinds.sort(function(a, b){
      return (basket[b] * PRODUCE[b].value) - (basket[a] * PRODUCE[a].value);
    });
    var html = '<span class="basket-label">Basket</span><span class="basket-rows">';
    for(var i = 0; i < kinds.length; i++){
      var k = kinds[i];
      html += '<span class="basket-row"><span class="basket-count">' + basket[k] + '×</span> ' +
        PRODUCE[k].label + ' <span class="basket-worth">' + (basket[k] * PRODUCE[k].value) + '</span></span>';
    }
    html += '</span><button type="button" class="btn btn-sm basket-sell" id="gardenSellBtn">Sell all · ' +
      basketValue(basket) + '</button>';
    els.gardenBasket.innerHTML = html;
  }

  // The shop lives inside the scene rather than above it, so it opens and closes
  // like a panel in a game rather than taking up the page permanently. Picking
  // something up closes it, because the next thing you do is choose a spot.
  function setShopOpen(open){
    if(!els.gardenShopPanel) return;
    els.gardenShopPanel.hidden = !open;
    if(els.gardenShopToggle) els.gardenShopToggle.setAttribute('aria-expanded', String(open));
    if(els.gardenStage) els.gardenStage.classList.toggle('stage-shopping', open);
    // It covers the stage, so it behaves like a dialog: focus moves in on open
    // and back to the button that opened it on close.
    if(open){
      var first = els.gardenShop && els.gardenShop.querySelector('.shop-item');
      if(first) first.focus();
    } else if(els.gardenShopToggle && document.activeElement &&
              els.gardenShopPanel.contains(document.activeElement)){
      els.gardenShopToggle.focus();
    }
  }

  // The store is the same kind of panel as the shop, for the same reason: it
  // covers the farm while you are looking at it and gets out of the way after.
  // The basket used to be a strip pinned across the bottom of the scene, which
  // meant a bar permanently covering the thing you were building.
  function setStoreOpen(open){
    if(!els.gardenStorePanel) return;
    els.gardenStorePanel.hidden = !open;
    if(els.gardenStage) els.gardenStage.classList.toggle('stage-storing', open);
    if(open){
      var sell = document.getElementById('gardenSellBtn');
      (sell || els.gardenStoreClose).focus();
    }
  }

  function wireGarden(){
    if(els.gardenStoreClose){
      els.gardenStoreClose.addEventListener('click', function(){ setStoreOpen(false); });
    }
    if(els.gardenStorePanel){
      els.gardenStorePanel.addEventListener('keydown', function(e){
        if(e.key === 'Escape'){ e.stopPropagation(); setStoreOpen(false); }
      });
    }
    if(els.gardenShopToggle){
      els.gardenShopToggle.addEventListener('click', function(){
        setShopOpen(els.gardenShopPanel.hidden);
      });
    }
    if(els.gardenShopClose){
      els.gardenShopClose.addEventListener('click', function(){ setShopOpen(false); });
    }
    if(els.gardenShopPanel){
      els.gardenShopPanel.addEventListener('keydown', function(e){
        if(e.key === 'Escape'){ e.stopPropagation(); setShopOpen(false); }
      });
    }
    if(els.gardenShop){
      els.gardenShop.addEventListener('click', function(e){
        var btn = e.target.closest('[data-shop]');
        if(btn) holdShopItem(btn.getAttribute('data-shop'));
      });
    }
    if(els.gardenBasket){
      els.gardenBasket.addEventListener('click', function(e){
        if(e.target.closest('#gardenSellBtn')) sellBasket();
      });
    }
    // Bound on the WORLD, not on the plot: the two buildings sit in their own
    // yard element beside the parcels, so a listener on the plot never sees them.
    // Pressing a building did nothing at all until this moved up a level.
    if(els.gardenWorld){
      els.gardenWorld.addEventListener('click', function(e){
        var building = e.target.closest('[data-building]');
        if(building){
          if(building.getAttribute('data-building') === 'shop') setShopOpen(true);
          else setStoreOpen(true);
          return;
        }
        var buy = e.target.closest('[data-buy-parcel]');
        if(buy){ buyParcel(Number(buy.getAttribute('data-buy-parcel'))); return; }
        var slot = e.target.closest('.plot-slot');
        if(slot) useSlot(Number(slot.getAttribute('data-row')), Number(slot.getAttribute('data-col')));
      });
    }
    bindFarmer();
  }

  // Days since the last logged day. -1 when there is no history at all.
  function daysSinceLastPractised(daysWithSessions){
    var dates = Object.keys(daysWithSessions).sort();
    if(dates.length === 0) return -1;
    var last = new Date(dates[dates.length - 1] + 'T00:00:00');
    var today = new Date(todayKey() + 'T00:00:00');
    return Math.round((today - last) / 86400000);
  }

  // Purely factual, never a verdict — no "best streak" to fall short of.
  function describeGap(daysWithSessions){
    var gap = daysSinceLastPractised(daysWithSessions);
    if(gap < 0) return 'No sessions logged yet';
    if(gap === 0) return 'Practised today';
    if(gap === 1) return 'Last session yesterday';
    return 'Last session ' + gap + ' days ago';
  }

  // The comeback nudge: rewarding the *return* after a lapse was the single
  // best-performing arm of 54 in the largest habit field experiment run
  // (+27%), and arms rewarding rigid consistency beat none of the others.
  // So this speaks up exactly at the moment people usually quit, and frames
  // the gap as spent rather than owed. Kept visually quiet on purpose:
  // making a reward signal visually salient flips its effect negative.
  function renderComeback(daysWithSessions){
    if(!els.comeback) return;
    // Once today's first session is logged the message has done its job.
    if(daysWithSessions[todayKey()]){ els.comeback.hidden = true; return; }

    var gap = daysSinceLastPractised(daysWithSessions);
    if(gap < 2){ els.comeback.hidden = true; return; }

    var now = new Date();
    var freshStart = now.getDay() === 1 ? 'a new week' : (now.getDate() === 1 ? 'a new month' : '');
    els.comeback.textContent = freshStart
      ? 'Welcome back — ' + freshStart + ', clean slate. The ' + gap + ' days away do not carry over.'
      : 'Welcome back — first session in ' + gap + ' days. Starting again is the part that counts.';
    els.comeback.hidden = false;
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

  // Inline range calendar for Insights' "Custom" tab. Always visible (no
  // trigger button): first click sets the start date; while picking the
  // second, hovering previews the span as a soft band; second click
  // confirms it. Clicking again after a range is confirmed starts a new one.
  function createRangeDatePicker(rootEl, opts){
    opts = opts || {};
    var from = opts.from || '';
    var to = opts.to || '';
    var max = opts.max || '';
    var onChange = opts.onChange || function(){};
    var selecting = false; // true once the start date is picked, before the end date is confirmed
    var hoverDate = null;

    rootEl.innerHTML =
      '<p class="range-picker-summary"></p>' +
      '<div class="date-picker-header">' +
        '<button type="button" class="icon-btn range-picker-prev" aria-label="Previous month">‹</button>' +
        '<span class="date-picker-month-label"></span>' +
        '<button type="button" class="icon-btn range-picker-next" aria-label="Next month">›</button>' +
      '</div>' +
      '<div class="date-picker-weekdays">' +
        ['Mo','Tu','We','Th','Fr','Sa','Su'].map(function(w){ return '<span>' + w + '</span>'; }).join('') +
      '</div>' +
      '<div class="date-picker-grid range-picker-grid"></div>';

    var summary = rootEl.querySelector('.range-picker-summary');
    var monthLabel = rootEl.querySelector('.date-picker-month-label');
    var grid = rootEl.querySelector('.range-picker-grid');
    var prevBtn = rootEl.querySelector('.range-picker-prev');
    var nextBtn = rootEl.querySelector('.range-picker-next');
    var viewYear, viewMonth;

    function pad2(n){ return n < 10 ? '0' + n : String(n); }
    function keyFor(y, m, day){ return y + '-' + pad2(m + 1) + '-' + pad2(day); }
    function fmtShort(v){
      var d = new Date(v + 'T00:00:00');
      return MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function setViewFrom(dateStr){
      var d = new Date((dateStr || todayKey()) + 'T00:00:00');
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
    }

    function renderSummary(){
      if(selecting){
        summary.innerHTML = '<strong>' + fmtShort(from) + '</strong> — pick an end date';
      } else if(from && to){
        summary.innerHTML = '<strong>' + fmtShort(from) + '</strong> to <strong>' + fmtShort(to) + '</strong>';
      } else {
        summary.textContent = 'Pick a start date';
      }
    }

    function renderGrid(){
      monthLabel.textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;
      var firstIdx = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
      var daysThisMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var daysPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
      var totalCells = Math.ceil((firstIdx + daysThisMonth) / 7) * 7;
      var todayStr = todayKey();

      // The live end of the span: the confirmed "to" once picked, otherwise
      // whatever day is currently hovered (falling back to "from" itself,
      // i.e. a single-day span, until the pointer has moved).
      var liveTo = selecting ? (hoverDate || from) : to;
      var rangeStart = '', rangeEnd = '';
      if(from && liveTo){
        rangeStart = from < liveTo ? from : liveTo;
        rangeEnd = from < liveTo ? liveTo : from;
      }

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
        var disabled = max && dateStr > max;
        var classes = 'date-picker-day';
        if(outside) classes += ' date-picker-day-outside';
        if(dateStr === todayStr) classes += ' date-picker-day-today';
        if(rangeStart && dateStr >= rangeStart && dateStr <= rangeEnd){
          if(rangeStart === rangeEnd) classes += ' range-day-single';
          else if(dateStr === rangeStart) classes += ' range-day-start';
          else if(dateStr === rangeEnd) classes += ' range-day-end';
          else classes += ' range-day-in';
        }
        html += '<button type="button" class="' + classes + '" data-date="' + dateStr + '"' + (disabled ? ' disabled' : '') + '>' + dayNum + '</button>';
      }
      grid.innerHTML = html;
      renderSummary();
    }

    function pick(dateStr){
      if(!selecting){
        from = dateStr;
        to = '';
        selecting = true;
        hoverDate = null;
      } else {
        if(dateStr < from){ to = from; from = dateStr; } else { to = dateStr; }
        selecting = false;
        hoverDate = null;
        onChange(from, to);
      }
      renderGrid();
    }

    grid.addEventListener('click', function(e){
      var btn = e.target.closest('.date-picker-day');
      if(!btn || btn.disabled) return;
      pick(btn.dataset.date);
    });
    grid.addEventListener('mouseover', function(e){
      if(!selecting) return;
      var btn = e.target.closest('.date-picker-day');
      if(!btn || btn.disabled) return;
      if(hoverDate !== btn.dataset.date){ hoverDate = btn.dataset.date; renderGrid(); }
    });
    grid.addEventListener('mouseleave', function(){
      if(!selecting || !hoverDate) return;
      hoverDate = null;
      renderGrid();
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

    setViewFrom(from);
    renderGrid();

    return {
      getFrom: function(){ return from; },
      getTo: function(){ return to; },
      setRange: function(f, t){
        from = f || ''; to = t || ''; selecting = false; hoverDate = null;
        setViewFrom(from);
        renderGrid();
      },
      setMax: function(v){ max = v || ''; renderGrid(); }
    };
  }

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
    var qualityTag = s.quality ? ' <span class="log-quality log-quality-' + s.quality + '">' + s.quality + '</span>' : '';
    var noteTitle = s.intention ? taskStr + ' — intention: ' + s.intention : taskStr;
    li.innerHTML =
      '<span class="log-time">' + timeStr + '</span>' +
      '<span class="log-detail">' +
        '<span class="log-category">' +
          '<span class="cat-pill ' + categoryColorClass(s.category) + '">' + escapeHtml(s.category) + '</span>' + statusTag + typeTag + qualityTag +
        '</span>' +
        '<span class="log-note" title="' + escapeAttr(noteTitle) + '">' + escapeHtml(taskStr) + '</span>' +
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
      version: 5,
      exportedAt: nowMs(),
      sessions: loadSessions(),
      tasks: loadTasks(),
      categories: loadCategories(),
      presets: loadCustomPresets()
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
        type: s.type === 'break' ? 'break' : 'focus',
        // This whitelist drops anything not named here, so new session fields
        // have to be added or they vanish on the next sync or import.
        intention: typeof s.intention === 'string' ? s.intention : null,
        quality: typeof s.quality === 'string' ? s.quality : null
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

    // Custom session types, merged by id like everything else. Built-in ids
    // are skipped so an older backup can never shadow a built-in preset.
    var incomingPresets = (data && Array.isArray(data.presets)) ? data.presets : [];
    var currentPresets = loadCustomPresets();
    var presetIds = {};
    PRESETS.forEach(function(p){ presetIds[p.id] = true; });
    currentPresets.forEach(function(p){ presetIds[p.id] = true; });
    var addedPresets = 0;
    incomingPresets.forEach(function(p){
      if(!p || !p.id || !p.label) return;
      if(typeof p.work !== 'number' || typeof p.brk !== 'number') return;
      if(presetIds[p.id]) return;
      currentPresets.push({
        id: p.id,
        label: String(p.label).slice(0, 40),
        work: Math.max(1, Math.min(180, p.work)),
        brk: Math.max(1, Math.min(60, p.brk)),
        note: typeof p.note === 'string' ? p.note : 'Your own session type.'
      });
      presetIds[p.id] = true;
      addedPresets += 1;
    });
    if(addedPresets > 0){
      saveCustomPresets(currentPresets);
      renderPresets();
    }

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
    // Either box changes the ratio, and resetPhase() (which re-renders) only
    // runs for the box matching the current phase — so refresh explicitly.
    renderScaleBreak();
  });
  els.breakInput.addEventListener('change', function(){
    var v = Math.max(1, Math.min(60, parseInt(els.breakInput.value,10) || 5));
    els.breakInput.value = v;
    state.breakMin = v;
    if(!state.running && state.mode !== 'focus'){ resetPhase(); }
    saveTimerState();
    renderScaleBreak();
  });
  function setPresetFormOpen(open){
    els.presetAddForm.hidden = !open;
    els.presetAddBtn.hidden = open;
    if(open){
      els.presetNewName.value = '';
      els.presetNewWork.value = 30;
      els.presetNewBreak.value = 6;
      els.presetNewName.focus();
    }
  }

  els.presetAddBtn.addEventListener('click', function(){ setPresetFormOpen(true); });
  els.presetCancelBtn.addEventListener('click', function(){ setPresetFormOpen(false); });
  els.presetSaveBtn.addEventListener('click', function(){
    var name = els.presetNewName.value.trim();
    if(!name){ els.presetNewName.focus(); return; }
    addCustomPreset(name, parseInt(els.presetNewWork.value, 10), parseInt(els.presetNewBreak.value, 10));
    setPresetFormOpen(false);
  });
  els.presetNewName.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); els.presetSaveBtn.click(); }
    else if(e.key === 'Escape'){ setPresetFormOpen(false); }
  });

  els.skillsList.addEventListener('click', function(e){
    var btn = e.target.closest('.skill-mark-btn');
    if(!btn) return;
    var row = btn.closest('.skill-row');
    editingSkillName = row ? row.dataset.name : null;
    renderSkills(loadSessions().filter(function(s){ return s.type !== 'break'; }));
  });

  els.skillsList.addEventListener('keydown', function(e){
    var input = e.target.closest('.skill-mark-input');
    if(!input) return;
    var row = input.closest('.skill-row');
    if(e.key === 'Enter'){
      e.preventDefault();
      commitSkillMark(row.dataset.name, input.value);
    } else if(e.key === 'Escape'){
      editingSkillName = null;
      refreshStats();
    }
  });

  // Committing on blur too, so clicking away saves rather than silently
  // discarding what was typed.
  els.skillsList.addEventListener('blur', function(e){
    var input = e.target.closest && e.target.closest('.skill-mark-input');
    if(!input || editingSkillName === null) return;
    var row = input.closest('.skill-row');
    commitSkillMark(row.dataset.name, input.value);
  }, true);

  els.budgetTargetInput.addEventListener('change', function(){
    var v = Math.max(30, Math.min(720, parseInt(els.budgetTargetInput.value, 10) || 240));
    els.budgetTargetInput.value = v;
    state.dailyBudgetMin = v;
    saveTimerState();
    renderBudget();
  });
  els.scaleBreakInput.addEventListener('change', function(){
    state.proportionalBreak = els.scaleBreakInput.checked;
    // Re-length a break that is sitting idle, but never yank the clock out
    // from under a break already counting down.
    if(!state.running && state.mode !== 'focus'){ resetPhase(); }
    saveTimerState();
    renderScaleBreak();
  });

  window.addEventListener('resize', function(){ refreshStats(); });

  // ---------- view tabs (Timer / Statistics / Garden) ----------
  var STORAGE_VIEW = 'pomodoroBench.activeView.v1';
  var VIEWS = ['timer', 'stats', 'garden'];

  function setActiveView(view){
    if(VIEWS.indexOf(view) < 0) view = 'timer';
    els.viewTimer.hidden = view !== 'timer';
    els.viewStats.hidden = view !== 'stats';
    els.viewGarden.hidden = view !== 'garden';
    els.tabTimerBtn.setAttribute('aria-selected', String(view === 'timer'));
    els.tabStatsBtn.setAttribute('aria-selected', String(view === 'stats'));
    els.tabGardenBtn.setAttribute('aria-selected', String(view === 'garden'));
    try{ localStorage.setItem(STORAGE_VIEW, view); }catch(e){}
    // Both of these read from the session log, so they are rebuilt on the way in
    // rather than kept warm while hidden.
    if(view === 'stats' || view === 'garden'){ refreshStats(); }
  }

  els.tabTimerBtn.addEventListener('click', function(){ setActiveView('timer'); });
  els.tabStatsBtn.addEventListener('click', function(){ setActiveView('stats'); });
  els.tabGardenBtn.addEventListener('click', function(){ setActiveView('garden'); });

  // ---------- Insights time-range tabs (Day / Month / Year / All time) ----------
  // Drives both "By category" and "By hour of day" together so the page
  // never shows two charts implicitly describing two different periods.
  function setCategoryRange(range){
    categoryRange = range;
    var buttons = els.categoryRangeTabs.querySelectorAll('.range-tab-btn');
    for(var i=0;i<buttons.length;i++){
      buttons[i].setAttribute('aria-selected', String(buttons[i].dataset.range === range));
    }
    if(range === 'custom'){ openCustomRangePopover(); } else { closeCustomRangePopover(); }
    try{ localStorage.setItem(STORAGE_CATEGORY_RANGE, range); }catch(e){}
    renderInsights(loadSessions());
  }

  els.categoryRangeTabs.addEventListener('click', function(e){
    var btn = e.target.closest('.range-tab-btn');
    if(!btn) return;
    e.stopPropagation(); // don't let the document-level listener close the popover we may have just opened
    var range = btn.dataset.range;
    if(range === 'custom' && categoryRange === 'custom'){
      // Already on Custom — clicking it again just reopens the popover to
      // adjust the dates (it auto-closes once a range is confirmed).
      if(els.customRangePicker.hidden) openCustomRangePopover(); else closeCustomRangePopover();
      return;
    }
    setCategoryRange(range);
  });

  // ---------- Insights custom date range popover ----------
  // Anchored under the tab row instead of the single-picker's own trigger
  // button, since "Custom" is a tab, not a field with its own affordance.
  var customRangeHostCard = els.customRangePicker.closest('.card');

  function openCustomRangePopover(){
    if(openDatePicker && openDatePicker !== customRangePopover) openDatePicker.close();
    els.customRangePicker.hidden = false;
    // Lift the Insights card above its siblings — see .card-picker-active.
    if(customRangeHostCard) customRangeHostCard.classList.add('card-picker-active');
    openDatePicker = customRangePopover;
  }

  function closeCustomRangePopover(){
    els.customRangePicker.hidden = true;
    if(customRangeHostCard) customRangeHostCard.classList.remove('card-picker-active');
    if(openDatePicker === customRangePopover) openDatePicker = null;
  }

  var customRangePopover = { close: closeCustomRangePopover };

  els.customRangePicker.addEventListener('click', function(e){ e.stopPropagation(); });

  function saveCustomRange(){
    try{
      localStorage.setItem(STORAGE_CUSTOM_RANGE, JSON.stringify({from: customRangeFrom, to: customRangeTo}));
    }catch(e){}
  }

  // With the picker tucked away in a popover, the "Custom" tab's own label
  // is the only place left to see which range is active — show it there
  // once both ends are picked, e.g. "Aug 3–13" or "Aug 28 – Sep 2".
  var customTabBtn = els.categoryRangeTabs.querySelector('[data-range="custom"]');
  function updateCustomTabLabel(){
    if(!customRangeFrom || !customRangeTo){ customTabBtn.textContent = 'Custom'; return; }
    var f = new Date(customRangeFrom + 'T00:00:00');
    var t = new Date(customRangeTo + 'T00:00:00');
    var sameMonth = f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth();
    customTabBtn.textContent = sameMonth
      ? MONTH_NAMES[f.getMonth()] + ' ' + f.getDate() + '–' + t.getDate()
      : MONTH_NAMES[f.getMonth()] + ' ' + f.getDate() + ' – ' + MONTH_NAMES[t.getMonth()] + ' ' + t.getDate();
  }

  var customRangeCalendar = createRangeDatePicker(els.customRangeCalendar, {
    from: customRangeFrom,
    to: customRangeTo,
    max: todayKey(),
    onChange: function(from, to){
      customRangeFrom = from;
      customRangeTo = to;
      saveCustomRange();
      updateCustomTabLabel();
      renderInsights(loadSessions());
      closeCustomRangePopover();
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
  customRangeCalendar.setRange(customRangeFrom, customRangeTo);
  updateCustomTabLabel();
  els.customRangePicker.hidden = true; // the popover itself never auto-opens on load, even if Custom was last selected
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
  wireGarden();

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
