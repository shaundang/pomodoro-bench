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

  // Fired by every save of something the sync layer carries, so js/sync.js
  // can push right away instead of waiting for its poll to notice — a tick
  // on a phone that is locked two seconds later used to sit there unpushed
  // until the app was next opened.
  function notifyLocalChange(what){
    try{ window.dispatchEvent(new CustomEvent('pomodoroBench:changed', {detail: {what: what}})); }
    catch(e){ /* CustomEvent unavailable — the poll still catches it */ }
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
    notifyLocalChange('presets');
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
      if(t.sessionPresetId === id){ t.sessionPresetId = 'custom'; t.updatedAt = nowMs(); touched = true; }
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
    notifyLocalChange('categories');
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

  // 8 hues (see css/style.css --catclr-0..7: blue, orange, aqua, yellow,
  // magenta, green, violet, red) so categories read as visibly different at
  // a glance rather than a handful of near-duplicates. The set and order
  // are validated per the dataviz skill's color-formula (OKLCH lightness
  // band, chroma floor, CVD-simulated adjacent-pair separation) rather than
  // hand-picked — the previous 6-color set looked like only ~3 colors in
  // practice for two separate reasons, both fixed here: this hash used to
  // be a plain "sum of char codes mod N", which is heavily biased for short
  // lowercase-ish English words (letter codes cluster mod 6), so most
  // category names collapsed onto the same 2-3 buckets even though more
  // colors existed; and, independently, several of those 6 hues (e.g. the
  // teal and the magenta) were too close together to tell apart even with
  // a perfectly fair hash. Multiplying-and-folding each character in (a
  // classic string hash) mixes the bits far better and spreads names evenly
  // across all the buckets.
  var CATEGORY_COLOR_COUNT = 8;
  function categoryColorIndex(name){
    var hash = 0;
    for(var i=0;i<name.length;i++){
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0; // >>>0 keeps it a safe 32-bit uint
    }
    return hash % CATEGORY_COLOR_COUNT;
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
    t.updatedAt = nowMs();
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
  // Where the unreadable contents of the tasks key are parked, so the next
  // saveTasks does not write a fresh list straight over the only copy of what
  // the user had. Written once and then left alone: whoever finds it can
  // recover by hand, and a second corruption never overwrites the first.
  var STORAGE_TASKS_CORRUPT = STORAGE_TASKS + '.corrupt';

  function stashCorruptTasks(raw){
    if(!raw) return;
    try{
      if(localStorage.getItem(STORAGE_TASKS_CORRUPT) == null){
        localStorage.setItem(STORAGE_TASKS_CORRUPT, raw);
      }
    }catch(e){ /* storage unavailable — nothing more we can do */ }
  }

  // Every task operation is load → mutate → save, so whatever this returns is
  // what the next save writes back. Returning [] for a store that merely
  // failed to parse used to mean the following add/edit/delete replaced the
  // user's whole task list with that one change. Now an unreadable store is
  // set aside first, and a list that parses but has junk entries in it is
  // cleaned per entry rather than thrown away wholesale.
  function loadTasks(){
    var raw = null;
    try{ raw = localStorage.getItem(STORAGE_TASKS); }
    catch(e){ return []; }
    if(!raw) return [];

    var arr;
    try{ arr = JSON.parse(raw); }
    catch(e){ stashCorruptTasks(raw); return []; }
    if(!Array.isArray(arr)){ stashCorruptTasks(raw); return []; }

    var migrated = false;
    var cleaned = arr.filter(function(t){ return !!t && typeof t === 'object'; });
    if(cleaned.length !== arr.length){ arr = cleaned; migrated = true; }
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
      // When `done` last flipped, in either direction. Kept apart from
      // updatedAt so a rename or a pomodoro counted on one device cannot
      // outrank a tick made on another — see applyIncomingBackup. A task
      // done before this stamp existed borrows its doneAt; one never ticked
      // sits at 0, which any real tick beats.
      if(typeof t.doneChangedAt !== 'number'){ t.doneChangedAt = (t.done && t.doneAt) ? t.doneAt : 0; migrated = true; }
      // Last-modified stamp used by applyIncomingBackup to decide, per
      // task, which side of a sync pull is newer. Tasks written before
      // this field existed get their creation time as a floor — never 0,
      // or a stale remote copy with no stamp of its own would look newer.
      if(typeof t.updatedAt !== 'number'){ t.updatedAt = t.createdAt || 0; migrated = true; }
    });
    if(migrated) saveTasks(arr);
    return arr;
  }

  function saveTasks(arr){
    try{ localStorage.setItem(STORAGE_TASKS, JSON.stringify(arr)); }catch(e){ /* ignore */ }
    notifyLocalChange('tasks');
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
      doneChangedAt: 0,
      createdAt: nowMs(),
      updatedAt: nowMs(),
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

  // The active task's name and category are copied into timer state so the
  // header and logSession can use them without a lookup. Local edits keep
  // those copies current, but a sync pull rewrites tasks behind the timer's
  // back — so after a merge, re-read the active task and bring the copies
  // back in line, or sessions get logged under a name the task no longer
  // has. A task finished on another device also stops being active here,
  // the same as ticking it off locally would — except while a session is
  // running on it, which finishes under the task it started with.
  function reconcileActiveTask(tasks){
    if(!state.activeTaskId) return;
    var t = tasks.filter(function(x){ return x.id === state.activeTaskId; })[0];
    if(!t) return;
    if(t.done && !state.running){
      clearActiveTask();
      renderTimer();
      return;
    }
    if(t.name !== state.activeTaskName || t.category !== state.activeTaskCategory){
      state.activeTaskName = t.name;
      state.activeTaskCategory = t.category;
      saveTimerState();
      renderTimer();
    }
  }

  function toggleTaskDone(id){
    var tasks = loadTasks();
    var t = tasks.filter(function(x){ return x.id === id; })[0];
    if(!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? nowMs() : null;
    t.doneChangedAt = nowMs();
    t.updatedAt = nowMs();
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
    t.updatedAt = nowMs();
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
    t.updatedAt = nowMs();

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
    t.updatedAt = nowMs();
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
      // Undoing a delete is itself a change worth syncing (the other device
      // never saw the delete, but it also never saw this task come back).
      lastDeleted.data.updatedAt = nowMs();
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
    notifyLocalChange('sessions');
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

  // Which pen a kind is housed in when it is not its own. A barn holds hoofed
  // stock and a coop holds birds, both of which are true of real farms — and the
  // alternative was three more sheds, when the whole point of keeping the pens
  // small was that a row of buildings reads as a warehouse yard.
  var PEN_SHARE = { sheep:'cow', goat:'cow', duck:'chicken' };
  var FAMILY_BY_CAT = {
    flower:'bed', crop:'bed', tree:'bed', special:'bed', fish:'pond'
  };

  function familyOf(meta){
    if(!meta) return null;
    if(meta.cat === 'animal'){
      if(PETS[meta.kind]) return 'pen:pets';
      return 'pen:' + (PEN_SHARE[meta.kind] || meta.kind);
    }
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

    // Livestock and the pond. `value / every` IS the rate an animal pays, so
    // `every` is the number that keeps each of these honest, not the purchase
    // price — the price only decides how long it takes to pay for itself.
    wool:      { label:'Wool',      value:12 },
    cheese:    { label:'Cheese',    value:9 },
    pork:      { label:'Pork',      value:16 },
    snakehead: { label:'Snakehead', value:9 },
    carpfish:  { label:'Carp',      value:8 },
    tilapia:   { label:'Tilapia',   value:6 },
    catfish:   { label:'Catfish',   value:7 },
    lobster:   { label:'Lobster',   value:20 },

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
    { kind:'birch',     name:'Birch',     price:20, species:'birch',     palette:1, grows:true, mature:30, every:32, produce:'bark', cat:'tree' },
    { kind:'maple',     name:'Maple',     price:24, species:'maple',     palette:4, grows:true, mature:34, every:36, produce:'syrup', cat:'tree' },
    { kind:'cypress',   name:'Cypress',   price:28, species:'cypress',   palette:0, grows:true, mature:38, every:40, produce:'cone', cat:'tree' },
    // Companions, deliberately with nothing to harvest. A dog that produced a
    // farm good would be nonsense, and the honest alternative — making them
    // need feeding so there is something to fail at — is the punishment
    // mechanic this card refuses. They are here to move about and be alive.
    // `mature` on livestock is how long it takes to grow up, in pomodoros, and
    // it is the same number the crops use. A small animal grows up fast and a cow
    // takes a while; nothing produces before it is full grown. The long-run rate
    // is untouched, because a perennial goes on yielding — what maturity costs is
    // the first cycle, which is exactly what raising an animal should cost.
    { kind:'cat',       name:'Cat',       price:26, decor:'cat',      grows:false, mature:8,  cat:'animal' },
    { kind:'dog',       name:'Dog',       price:30, decor:'dog',      grows:false, mature:10, cat:'animal' },
    { kind:'chicken',   name:'Chicken',   price:18, decor:'chicken',  grows:false, mature:10, every:18, produce:'egg', cat:'animal' },
    { kind:'cow',       name:'Cow',       price:34, decor:'cow',      grows:false, mature:20, every:30, produce:'milk', cat:'animal' },
    // There is no "pond" to buy. A pond is LAND — you open a parcel and it
    // becomes one the moment a fish goes in it, the same way a parcel becomes a
    // bed or a pen. Selling a pond off a shelf beside the livestock made it a
    // thing rather than a place, and it drew a whole miniature pond inside one
    // plot, which is why every real fish in the water stood in a pale saucer.
    //
    // Anything already planted keeps its data: loadGarden holds on to items
    // whose kind has left the shop rather than deleting them.
    { kind:'duck',      name:'Duck',      price:22, decor:'duck',     grows:false, mature:10, every:16, produce:'egg',   cat:'animal' },
    { kind:'goat',      name:'Goat',      price:36, decor:'goat',     grows:false, mature:14, every:42, produce:'cheese', cat:'animal' },
    { kind:'sheep',     name:'Sheep',     price:40, decor:'sheep',    grows:false, mature:16, every:60, produce:'wool',  cat:'animal' },
    { kind:'pig',       name:'Pig',       price:44, decor:'pig',      grows:false, mature:18, every:80, produce:'pork',  cat:'animal' },

    // Fish. Bought as stock and kept in a pond, which is why none of them is a
    // "pond": the pond is the land, and land is opened rather than bought from a
    // shelf. Every one of them still has to grow before it is worth anything.
    { kind:'tilapia',   name:'Tilapia',   price:20, decor:'tilapia',  grows:false, mature:10, every:30, produce:'tilapia',   cat:'fish' },
    { kind:'catfish',   name:'Catfish',   price:24, decor:'catfish',  grows:false, mature:12, every:36, produce:'catfish',   cat:'fish' },
    { kind:'carp',      name:'Carp',      price:26, decor:'carp',     grows:false, mature:12, every:40, produce:'carpfish',  cat:'fish' },
    { kind:'snakehead', name:'Snakehead', price:30, decor:'snakehead',grows:false, mature:14, every:44, produce:'snakehead', cat:'fish' },
    { kind:'lobster',   name:'Lobster',   price:56, decor:'lobster',  grows:false, mature:20, every:90, produce:'lobster',   cat:'fish' },

    // The farm roster. `mature` is what keeps this honest: a crop that costs
    // more takes proportionally longer to reach harvest, so every row here
    // clears between 0.08 and 0.22 tokens per pomodoro and none of them is the
    // obvious play. An `annual` is lifted with its harvest and has to be bought
    // again; the perennials keep bearing, which is why their rate sits in the
    // lower half of that band.
    { kind:'rice',         name:'Rice',            price:2,  species:'rice',          palette:3, grows:true, mature:12, every:1,  produce:'grain',         cat:'crop', annual:true },
    { kind:'carrot',       name:'Carrot',          price:4,  species:'carrot',        palette:3, grows:true, mature:12, every:1,  produce:'carrot',        cat:'crop', annual:true },
    { kind:'tomato',       name:'Tomato',          price:6,  species:'tomato',        palette:4, grows:true, mature:13, every:1,  produce:'tomato',        cat:'crop', annual:true },
    { kind:'cucumber',     name:'Cucumber',        price:7,  species:'cucumber',      palette:0, grows:true, mature:16, every:1,  produce:'cucumber',      cat:'crop', annual:true },
    { kind:'corn',         name:'Corn',            price:8,  species:'corn',          palette:3, grows:true, mature:16, every:1,  produce:'corn',          cat:'crop', annual:true },
    { kind:'rose',         name:'Rose',            price:9,  species:'rose',          palette:5, grows:true, mature:19, every:1,  produce:'rose',          cat:'flower', annual:true },
    { kind:'tulip',        name:'Tulip',           price:10, species:'tulip',         palette:2, grows:true, mature:19, every:1,  produce:'tulip',         cat:'flower', annual:true },
    { kind:'eggplant',     name:'Aubergine',       price:13, species:'eggplant',      palette:2, grows:true, mature:26, every:1,  produce:'eggplant',      cat:'crop', annual:true },
    { kind:'garlic',       name:'Garlic',          price:14, species:'garlic',        palette:1, grows:true, mature:30, every:1,  produce:'garlic',        cat:'crop', annual:true },
    { kind:'onion',        name:'Onion',           price:16, species:'onion',         palette:2, grows:true, mature:34, every:1,  produce:'onion',         cat:'crop', annual:true },
    { kind:'potato',       name:'Potato',          price:18, species:'potato',        palette:3, grows:true, mature:38, every:1,  produce:'potato',        cat:'crop', annual:true },
    { kind:'watermelon',   name:'Watermelon',      price:20, species:'watermelon',    palette:0, grows:true, mature:42, every:1,  produce:'melon',         cat:'crop', annual:true },
    { kind:'aloevera',     name:'Aloe vera',       price:24, species:'aloevera',      palette:0, grows:true, mature:46, every:1,  produce:'aloe',          cat:'crop', annual:true },
    { kind:'mango',        name:'Mango',           price:26, species:'mango',         palette:3, grows:true, mature:24, every:28, produce:'mango',         cat:'tree' },
    { kind:'pineapple',    name:'Pineapple',       price:30, species:'pineapple',     palette:3, grows:true, mature:20, every:33, produce:'pineapple',     cat:'tree' },
    { kind:'dragonfruit',  name:'Dragon fruit',    price:34, species:'dragonfruit',   palette:5, grows:true, mature:26, every:32, produce:'dragonfruit',   cat:'tree' },
    { kind:'ginseng',      name:'Ginseng',         price:38, species:'ginseng',       palette:4, grows:true, mature:30, every:37, produce:'ginseng',       cat:'special' },
    { kind:'grapes',       name:'Grapes',          price:42, species:'grapes',        palette:2, grows:true, mature:28, every:42, produce:'grapes',        cat:'tree' },
    { kind:'apple',        name:'Apple',           price:46, species:'apple',         palette:4, grows:true, mature:32, every:46, produce:'apple',         cat:'tree' }
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
  // Every species, redrawn. Two things drive all of it:
  //
  // The sun is in the UPPER LEFT, for every leaf, petal, fruit and trunk. Each
  // rounded mass is painted shade-at-full-size, then the body inset away from the
  // sun, then the highlight further along, so the `deep` tone always survives as
  // a rim on the lower right. No part chooses its own tone by hand.
  //
  // And the silhouette has to carry the species on its own. These are read at
  // about 46px wide in a plot, where colour is nearly all that survives of a
  // detail — so the shape is what has to say "tomato" rather than "red bush".
  var SPECIES = {
    oak: {
      trunk: 'M 25.4 96 Q 27.7 78 26.8 60 L 33.2 60 Q 32.3 78 34.6 96 Z',
      trunkShort: 'M 26.6 96 Q 28.3 85 27.4 74 L 32.6 74 Q 31.7 85 33.4 96 Z',
      trunkTone: 'wood',
      blossoms: [[20, 42], [40, 41], [30, 28], [24, 52], [37, 51], [30, 40], [14, 50], [46, 49], [31, 34]],
      parts: [
        { tone: 'wood', d: 'M 26.6 96 Q 28.3 85 27.4 74 L 32.6 74 Q 31.7 85 33.4 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.6 96 Q 31 85 30.3 74 L 32.6 74 Q 31.7 85 33.4 96 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 39.4 70 C 39.4 70.7 40 71.4 40.1 72.2 C 40.2 73 40.5 74.1 40 74.7 C 39.5 75.4 38.2 75.8 37.3 76.1 C 36.4 76.4 35.3 76.3 34.5 76.7 C 33.6 77.1 33.2 77.8 32.3 78.3 C 31.5 78.8 30.4 79.5 29.5 79.5 C 28.6 79.5 27.5 78.8 26.7 78.3 C 25.8 77.8 25.4 77.1 24.6 76.7 C 23.7 76.3 22.6 76.4 21.7 76.1 C 20.8 75.8 19.5 75.4 19 74.7 C 18.5 74.1 18.8 73 18.9 72.2 C 19 71.4 19.6 70.7 19.6 70 C 19.6 69.3 19 68.6 18.9 67.8 C 18.8 67 18.5 65.9 19 65.3 C 19.5 64.6 20.8 64.2 21.7 63.9 C 22.6 63.6 23.7 63.7 24.5 63.3 C 25.4 62.9 25.8 62.2 26.7 61.7 C 27.5 61.2 28.6 60.5 29.5 60.5 C 30.4 60.5 31.5 61.2 32.3 61.7 C 33.2 62.2 33.6 62.9 34.5 63.3 C 35.3 63.7 36.4 63.6 37.3 63.9 C 38.2 64.2 39.5 64.6 40 65.3 C 40.5 65.9 40.2 67 40.1 67.8 C 40 68.6 39.4 69.3 39.4 70 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 36.8 68.7 C 36.8 69.3 37.3 69.9 37.3 70.5 C 37.4 71.2 37.6 72 37.2 72.6 C 36.8 73.1 35.7 73.4 34.9 73.7 C 34.1 74 33.2 73.9 32.5 74.2 C 31.8 74.5 31.4 75.2 30.7 75.5 C 30 75.9 29.1 76.4 28.3 76.4 C 27.5 76.4 26.6 75.9 25.9 75.5 C 25.2 75.2 24.8 74.5 24.1 74.2 C 23.4 73.9 22.5 74 21.7 73.7 C 20.9 73.4 19.8 73.1 19.4 72.6 C 19 72 19.2 71.2 19.3 70.5 C 19.3 69.9 19.8 69.3 19.8 68.7 C 19.8 68.1 19.3 67.5 19.3 66.9 C 19.2 66.2 19 65.4 19.4 64.8 C 19.8 64.3 20.9 64 21.7 63.7 C 22.5 63.4 23.4 63.5 24.1 63.2 C 24.8 62.9 25.2 62.3 25.9 61.9 C 26.6 61.5 27.5 61 28.3 61 C 29.1 61 30 61.5 30.7 61.9 C 31.4 62.3 31.8 62.9 32.5 63.2 C 33.2 63.5 34.1 63.4 34.9 63.7 C 35.7 64 36.8 64.3 37.2 64.8 C 37.6 65.4 37.4 66.2 37.3 66.9 C 37.3 67.5 36.8 68.1 36.8 68.7 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 30.8 66.7 C 30.8 67.2 30.4 67.7 30 68.1 C 29.7 68.5 29.1 68.7 28.7 69.1 C 28.2 69.4 27.9 69.8 27.4 70.1 C 26.9 70.3 26.2 70.7 25.5 70.7 C 24.9 70.7 24.2 70.3 23.7 70.1 C 23.2 69.8 22.9 69.4 22.4 69.1 C 22 68.7 21.4 68.5 21.1 68.1 C 20.7 67.7 20.3 67.2 20.3 66.7 C 20.3 66.3 20.7 65.7 21.1 65.3 C 21.4 65 22 64.7 22.4 64.4 C 22.9 64.1 23.2 63.7 23.7 63.4 C 24.2 63.1 24.9 62.8 25.5 62.8 C 26.2 62.8 26.9 63.1 27.4 63.4 C 27.9 63.7 28.2 64.1 28.7 64.4 C 29.1 64.7 29.7 65 30 65.3 C 30.4 65.7 30.8 66.3 30.8 66.7 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 25.4 96 Q 27.7 78 26.8 60 L 33.2 60 Q 32.3 78 34.6 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.8 96 Q 31.3 78 30.3 60 L 33.2 60 Q 32.3 78 34.6 96 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 44.5 56 C 44.9 56.9 45.7 58 45.5 58.8 C 45.2 59.6 43.9 60.4 43.1 61 C 42.2 61.6 40.9 61.8 40.3 62.5 C 39.6 63.2 39.6 64.2 39 65 C 38.5 65.8 37.9 67 36.9 67.3 C 35.9 67.7 34.4 67.4 33.2 67.2 C 32.1 67.1 31.1 66.4 30 66.4 C 28.9 66.4 27.9 67.1 26.8 67.2 C 25.6 67.4 24.1 67.7 23.1 67.3 C 22.1 67 21.5 65.8 21 65 C 20.4 64.2 20.4 63.2 19.7 62.5 C 19.1 61.8 17.8 61.6 16.9 61 C 16.1 60.4 14.8 59.6 14.5 58.8 C 14.3 58 15.1 56.9 15.5 56 C 15.9 55.1 17 54.5 17.2 53.7 C 17.4 52.9 16.9 51.9 16.9 51 C 17 50.1 16.9 48.8 17.6 48.1 C 18.3 47.5 19.8 47.3 21 47 C 22.1 46.8 23.3 47 24.3 46.6 C 25.3 46.3 25.8 45.3 26.8 44.8 C 27.7 44.3 28.9 43.4 30 43.4 C 31.1 43.4 32.3 44.3 33.2 44.8 C 34.2 45.3 34.7 46.3 35.7 46.6 C 36.7 47 37.9 46.8 39 47 C 40.2 47.3 41.7 47.5 42.4 48.1 C 43.1 48.8 43 50.1 43.1 51 C 43.1 51.9 42.6 52.9 42.8 53.7 C 43 54.5 44.1 55.1 44.5 56 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 40.7 54.3 C 41.1 55 41.7 55.9 41.5 56.6 C 41.3 57.2 40.2 57.9 39.5 58.4 C 38.8 58.9 37.7 59.1 37.2 59.6 C 36.6 60.2 36.6 61 36.1 61.6 C 35.6 62.3 35.1 63.2 34.2 63.5 C 33.4 63.8 32.1 63.6 31.1 63.5 C 30.2 63.4 29.3 62.9 28.4 62.9 C 27.5 62.9 26.6 63.4 25.7 63.5 C 24.7 63.6 23.4 63.8 22.6 63.5 C 21.8 63.2 21.2 62.3 20.7 61.6 C 20.2 61 20.2 60.2 19.6 59.6 C 19.1 59.1 18 58.9 17.3 58.4 C 16.6 57.9 15.5 57.2 15.3 56.6 C 15.1 55.9 15.7 55 16.1 54.3 C 16.4 53.6 17.3 53 17.5 52.4 C 17.7 51.7 17.2 50.9 17.3 50.2 C 17.4 49.4 17.3 48.4 17.9 47.9 C 18.5 47.3 19.8 47.1 20.7 46.9 C 21.7 46.7 22.7 46.8 23.5 46.5 C 24.4 46.2 24.9 45.5 25.7 45.1 C 26.5 44.7 27.5 44 28.4 44 C 29.3 44 30.3 44.7 31.1 45.1 C 32 45.5 32.4 46.2 33.3 46.5 C 34.1 46.8 35.1 46.7 36.1 46.9 C 37 47.1 38.3 47.3 38.9 47.9 C 39.5 48.4 39.4 49.4 39.5 50.2 C 39.6 50.9 39.1 51.7 39.3 52.4 C 39.5 53 40.4 53.6 40.7 54.3 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 31.2 51.6 C 31 52.1 30.5 52.5 30.3 53 C 30.1 53.5 30.2 54 29.9 54.5 C 29.7 54.9 29.4 55.6 28.9 55.9 C 28.3 56.2 27.4 56.2 26.8 56.2 C 26.1 56.3 25.4 56 24.8 56 C 24.1 56 23.5 56.3 22.8 56.2 C 22.1 56.2 21.2 56.2 20.7 55.9 C 20.2 55.6 19.9 54.9 19.6 54.5 C 19.4 54 19.4 53.5 19.2 53 C 19 52.5 18.6 52.1 18.4 51.6 C 18.2 51.1 18 50.5 18.2 50 C 18.4 49.5 19.1 49.1 19.6 48.8 C 20.1 48.5 20.8 48.3 21.4 48.1 C 21.9 47.8 22.2 47.3 22.8 47 C 23.4 46.8 24.1 46.4 24.8 46.4 C 25.4 46.4 26.2 46.8 26.8 47 C 27.3 47.3 27.7 47.8 28.2 48.1 C 28.7 48.3 29.4 48.5 29.9 48.8 C 30.5 49.1 31.2 49.5 31.4 50 C 31.6 50.5 31.3 51.1 31.2 51.6 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 24.6 96 Q 27.3 75 26.4 54 L 33.6 54 Q 32.7 75 35.4 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 31 96 Q 31.5 75 30.4 54 L 33.6 54 Q 32.7 75 35.4 96 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 28.9 59.3 Q 25.7 53.8 20.4 50.7 L 21.6 49.3 Q 27.4 51.8 31.1 56.7 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 29 56.7 Q 33.2 52.8 38.4 50.3 L 39.6 51.7 Q 34.8 54.9 31 59.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 49.1 44 C 49.1 44.9 47.9 45.9 47.2 46.7 C 46.4 47.5 45.1 48 44.7 48.9 C 44.3 49.7 44.8 50.8 44.6 51.8 C 44.3 52.8 44.3 54.1 43.5 54.8 C 42.7 55.4 41 55.5 39.7 55.6 C 38.5 55.8 37.1 55.4 36.1 55.8 C 35 56.1 34.4 57.1 33.4 57.7 C 32.4 58.3 31.1 59.3 30 59.3 C 28.9 59.3 27.6 58.3 26.6 57.7 C 25.6 57.1 25 56.1 23.9 55.8 C 22.9 55.4 21.5 55.8 20.3 55.6 C 19 55.5 17.3 55.4 16.5 54.8 C 15.7 54.1 15.7 52.8 15.4 51.8 C 15.2 50.8 15.7 49.7 15.3 48.9 C 14.9 48 13.6 47.5 12.8 46.7 C 12.1 45.9 10.9 44.9 10.9 44 C 10.9 43.1 12.1 42.1 12.8 41.3 C 13.6 40.5 14.9 40 15.3 39.1 C 15.7 38.3 15.2 37.2 15.4 36.2 C 15.7 35.2 15.7 33.9 16.5 33.2 C 17.3 32.6 19 32.5 20.3 32.4 C 21.5 32.2 22.9 32.6 23.9 32.2 C 25 31.9 25.6 30.9 26.6 30.3 C 27.6 29.7 28.9 28.7 30 28.7 C 31.1 28.7 32.4 29.7 33.4 30.3 C 34.4 30.9 35 31.9 36.1 32.2 C 37.1 32.6 38.5 32.2 39.7 32.4 C 41 32.5 42.7 32.6 43.5 33.2 C 44.3 33.9 44.3 35.2 44.6 36.2 C 44.8 37.2 44.3 38.3 44.7 39.1 C 45.1 40 46.4 40.5 47.2 41.3 C 47.9 42.1 49.1 43.1 49.1 44 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 44.2 41.9 C 44.2 42.6 43.3 43.5 42.7 44.1 C 42.1 44.8 41 45.2 40.6 45.9 C 40.3 46.6 40.6 47.5 40.4 48.3 C 40.3 49.1 40.2 50.2 39.5 50.7 C 38.8 51.2 37.4 51.3 36.3 51.4 C 35.3 51.6 34.2 51.3 33.3 51.6 C 32.4 51.9 31.8 52.7 31 53.2 C 30.1 53.6 29 54.4 28.1 54.4 C 27.1 54.4 26 53.6 25.2 53.2 C 24.3 52.7 23.8 51.9 22.9 51.6 C 22 51.3 20.8 51.6 19.8 51.4 C 18.8 51.3 17.3 51.2 16.7 50.7 C 16 50.2 15.9 49.1 15.7 48.3 C 15.5 47.5 15.9 46.6 15.5 45.9 C 15.1 45.2 14.1 44.8 13.5 44.1 C 12.9 43.5 11.9 42.6 11.9 41.9 C 11.9 41.2 12.9 40.3 13.5 39.7 C 14.1 39 15.1 38.6 15.5 37.9 C 15.9 37.2 15.5 36.3 15.7 35.5 C 15.9 34.7 16 33.6 16.7 33.1 C 17.3 32.6 18.8 32.5 19.8 32.4 C 20.8 32.2 22 32.5 22.9 32.2 C 23.8 31.9 24.3 31.1 25.2 30.6 C 26 30.2 27.1 29.4 28.1 29.4 C 29 29.4 30.1 30.2 31 30.6 C 31.8 31.1 32.4 31.9 33.3 32.2 C 34.2 32.5 35.3 32.2 36.3 32.4 C 37.4 32.5 38.8 32.6 39.5 33.1 C 40.2 33.6 40.3 34.7 40.4 35.5 C 40.6 36.3 40.3 37.2 40.6 37.9 C 41 38.6 42.1 39 42.7 39.7 C 43.3 40.3 44.2 41.2 44.2 41.9 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30.8 38.7 C 30.8 39.2 31.1 39.7 31.1 40.2 C 31.2 40.7 31.2 41.4 30.9 41.9 C 30.6 42.3 29.8 42.6 29.1 42.8 C 28.5 43.1 27.8 43.1 27.2 43.4 C 26.7 43.6 26.3 44.1 25.7 44.4 C 25.1 44.6 24.4 45 23.7 45 C 23 45 22.3 44.6 21.7 44.4 C 21.1 44.1 20.7 43.6 20.2 43.4 C 19.6 43.1 18.9 43.1 18.3 42.8 C 17.6 42.6 16.8 42.3 16.5 41.9 C 16.2 41.4 16.2 40.7 16.3 40.2 C 16.3 39.7 16.6 39.2 16.6 38.7 C 16.6 38.2 16.3 37.7 16.3 37.2 C 16.2 36.6 16.2 35.9 16.5 35.5 C 16.8 35.1 17.6 34.8 18.3 34.5 C 18.9 34.3 19.6 34.3 20.2 34 C 20.7 33.7 21.1 33.3 21.7 33 C 22.3 32.7 23 32.3 23.7 32.3 C 24.4 32.3 25.1 32.7 25.7 33 C 26.3 33.3 26.7 33.7 27.2 34 C 27.8 34.3 28.5 34.3 29.1 34.5 C 29.8 34.8 30.6 35.1 30.9 35.5 C 31.2 35.9 31.2 36.6 31.1 37.2 C 31.1 37.7 30.8 38.2 30.8 38.7 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 24 96 Q 27 73 26 50 L 34 50 Q 33 73 36 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 31.1 96 Q 31.7 73 30.4 50 L 34 50 Q 33 73 36 96 Z', from: 5 },
        { tone: 'wood', d: 'M 28.7 57.4 Q 24.9 50.6 18.3 46.7 L 19.7 45.3 Q 26.9 48.4 31.3 54.6 Z', from: 5 },
        { tone: 'wood', d: 'M 28.8 54.5 Q 33.9 49.5 40.4 46.2 L 41.6 47.8 Q 35.7 51.7 31.2 57.5 Z', from: 5 },
        { tone: 'deep', d: 'M 22 52 C 21.7 52.6 21.1 53 20.9 53.6 C 20.6 54.2 20.9 54.9 20.7 55.5 C 20.5 56.2 20.2 57.1 19.6 57.4 C 19 57.8 17.9 57.7 17.2 57.7 C 16.4 57.7 15.7 57.3 15 57.3 C 14.3 57.3 13.6 57.7 12.8 57.7 C 12.1 57.7 11 57.8 10.4 57.4 C 9.8 57.1 9.5 56.2 9.3 55.5 C 9.1 54.9 9.4 54.2 9.1 53.6 C 8.9 53 8.3 52.6 8 52 C 7.7 51.4 7.3 50.5 7.5 49.9 C 7.8 49.3 8.7 48.8 9.3 48.5 C 10 48.1 10.8 48.1 11.4 47.7 C 12 47.4 12.2 46.7 12.8 46.3 C 13.4 45.9 14.3 45.3 15 45.3 C 15.7 45.3 16.6 45.9 17.2 46.3 C 17.8 46.7 18 47.4 18.6 47.7 C 19.2 48.1 20 48.1 20.7 48.5 C 21.3 48.8 22.2 49.3 22.5 49.9 C 22.7 50.5 22.3 51.4 22 52 Z', from: 5 },
        { tone: 'base', d: 'M 20.2 51.1 C 20 51.6 19.4 52 19.2 52.4 C 19.1 52.9 19.2 53.5 19 54 C 18.9 54.5 18.6 55.2 18.1 55.5 C 17.6 55.8 16.7 55.8 16.1 55.8 C 15.4 55.8 14.8 55.5 14.2 55.5 C 13.6 55.5 13 55.8 12.4 55.8 C 11.7 55.8 10.8 55.8 10.3 55.5 C 9.8 55.2 9.6 54.5 9.4 54 C 9.2 53.5 9.4 52.9 9.2 52.4 C 9 52 8.5 51.6 8.3 51.1 C 8.1 50.6 7.7 49.9 7.9 49.4 C 8.1 48.9 8.9 48.5 9.4 48.2 C 10 47.9 10.6 47.9 11.1 47.6 C 11.6 47.3 11.9 46.7 12.4 46.4 C 12.9 46.1 13.6 45.6 14.2 45.6 C 14.8 45.6 15.6 46.1 16.1 46.4 C 16.6 46.7 16.8 47.3 17.3 47.6 C 17.8 47.9 18.5 47.9 19 48.2 C 19.6 48.5 20.3 48.9 20.5 49.4 C 20.7 49.9 20.4 50.6 20.2 51.1 Z', from: 5 },
        { tone: 'light', d: 'M 15.6 49.7 C 15.7 50.1 15.7 50.8 15.4 51.1 C 15.2 51.5 14.5 51.8 14 51.9 C 13.5 52 13 52 12.5 52 C 12 52 11.4 52 10.9 51.9 C 10.4 51.8 9.8 51.5 9.5 51.1 C 9.3 50.8 9.3 50.1 9.4 49.7 C 9.5 49.3 9.8 49 10.1 48.6 C 10.4 48.2 10.5 47.8 10.9 47.5 C 11.3 47.3 12 46.9 12.5 46.9 C 13 46.9 13.6 47.3 14 47.5 C 14.4 47.8 14.6 48.2 14.9 48.6 C 15.1 49 15.5 49.3 15.6 49.7 Z', from: 5 },
        { tone: 'deep', d: 'M 52.5 50 C 52.2 50.7 51.5 51.1 51.3 51.8 C 51 52.4 51.3 53.1 51.1 53.8 C 50.8 54.5 50.6 55.5 49.9 55.9 C 49.3 56.3 48.1 56.2 47.3 56.2 C 46.5 56.2 45.8 55.7 45 55.7 C 44.2 55.7 43.5 56.2 42.7 56.2 C 41.9 56.2 40.7 56.3 40.1 55.9 C 39.4 55.5 39.2 54.5 38.9 53.8 C 38.7 53.1 39 52.4 38.7 51.8 C 38.5 51.1 37.8 50.7 37.5 50 C 37.2 49.3 36.8 48.4 37 47.8 C 37.2 47.1 38.2 46.6 38.9 46.2 C 39.6 45.8 40.5 45.8 41.1 45.4 C 41.7 45 42 44.3 42.7 43.8 C 43.3 43.4 44.2 42.7 45 42.7 C 45.8 42.7 46.7 43.4 47.3 43.8 C 48 44.3 48.3 45 48.9 45.4 C 49.5 45.8 50.4 45.8 51.1 46.2 C 51.8 46.6 52.8 47.1 53 47.8 C 53.2 48.4 52.8 49.3 52.5 50 Z', from: 5 },
        { tone: 'base', d: 'M 50.6 49 C 50.3 49.6 49.7 50 49.5 50.5 C 49.3 51 49.5 51.6 49.3 52.2 C 49.1 52.7 48.9 53.5 48.3 53.8 C 47.8 54.2 46.8 54.1 46.1 54.1 C 45.4 54.1 44.8 53.7 44.2 53.7 C 43.5 53.7 42.9 54.1 42.2 54.1 C 41.5 54.1 40.5 54.2 40 53.8 C 39.5 53.5 39.2 52.7 39 52.2 C 38.8 51.6 39 51 38.8 50.5 C 38.6 50 38 49.6 37.8 49 C 37.6 48.5 37.2 47.7 37.4 47.2 C 37.6 46.7 38.4 46.2 39 45.9 C 39.6 45.6 40.3 45.5 40.9 45.2 C 41.4 44.9 41.7 44.3 42.2 44 C 42.8 43.6 43.5 43.1 44.2 43.1 C 44.8 43.1 45.6 43.6 46.1 44 C 46.7 44.3 47 44.9 47.5 45.2 C 48 45.5 48.8 45.6 49.3 45.9 C 49.9 46.2 50.7 46.7 50.9 47.2 C 51.1 47.7 50.8 48.5 50.6 49 Z', from: 5 },
        { tone: 'light', d: 'M 45.6 47.5 C 45.7 48 45.7 48.6 45.5 49 C 45.2 49.4 44.5 49.7 43.9 49.9 C 43.4 50 42.8 50 42.3 50 C 41.8 50 41.2 50 40.7 49.9 C 40.1 49.7 39.4 49.4 39.1 49 C 38.9 48.6 38.9 48 39 47.5 C 39.1 47.1 39.5 46.7 39.8 46.3 C 40 45.9 40.2 45.5 40.7 45.2 C 41.1 44.9 41.8 44.5 42.3 44.5 C 42.8 44.5 43.5 44.9 43.9 45.2 C 44.4 45.5 44.6 45.9 44.8 46.3 C 45.1 46.7 45.5 47.1 45.6 47.5 Z', from: 5 },
        { tone: 'deep', d: 'M 50 37 C 49.4 38 48.2 38.7 48 39.6 C 47.8 40.6 48.7 41.6 48.8 42.6 C 48.9 43.7 49.4 45.1 48.8 46 C 48.2 46.8 46.5 47.2 45.3 47.6 C 44.1 48 42.6 48 41.8 48.6 C 40.9 49.2 40.7 50.4 40 51.3 C 39.3 52.2 38.5 53.5 37.4 53.8 C 36.3 54.1 34.7 53.5 33.5 53.2 C 32.2 53 31.2 52.1 30 52.1 C 28.8 52.1 27.8 53 26.5 53.2 C 25.3 53.5 23.7 54.1 22.6 53.8 C 21.5 53.5 20.7 52.2 20 51.3 C 19.3 50.4 19.1 49.2 18.2 48.6 C 17.4 48 15.9 48 14.7 47.6 C 13.5 47.2 11.8 46.8 11.2 46 C 10.6 45.1 11.1 43.7 11.2 42.6 C 11.3 41.6 12.2 40.6 12 39.6 C 11.8 38.7 10.6 38 10 37 C 9.4 36 8.4 34.8 8.6 33.9 C 8.8 33 10.3 32.1 11.2 31.4 C 12.1 30.6 13.6 30.3 14.2 29.5 C 14.7 28.6 14.4 27.4 14.7 26.4 C 15 25.4 15.2 23.9 16.1 23.3 C 16.9 22.7 18.7 22.8 20 22.7 C 21.3 22.6 22.7 23.1 23.7 22.8 C 24.8 22.5 25.5 21.4 26.5 20.8 C 27.6 20.1 28.8 19.1 30 19.1 C 31.2 19.1 32.4 20.1 33.5 20.8 C 34.5 21.4 35.2 22.5 36.3 22.8 C 37.3 23.1 38.7 22.6 40 22.7 C 41.3 22.8 43.1 22.7 43.9 23.3 C 44.8 23.9 45 25.4 45.3 26.4 C 45.6 27.4 45.3 28.6 45.8 29.5 C 46.4 30.3 47.9 30.6 48.8 31.4 C 49.7 32.1 51.2 33 51.4 33.9 C 51.6 34.8 50.6 36 50 37 Z', from: 5 },
        { tone: 'base', d: 'M 44.8 34.5 C 44.3 35.3 43.4 35.9 43.2 36.7 C 43 37.5 43.7 38.3 43.8 39.2 C 43.9 40 44.2 41.2 43.7 41.8 C 43.2 42.5 41.8 42.9 40.8 43.2 C 39.8 43.6 38.6 43.5 37.8 44.1 C 37.1 44.6 36.9 45.5 36.3 46.2 C 35.7 46.9 35 48 34.1 48.3 C 33.2 48.5 31.8 48.1 30.8 47.8 C 29.7 47.6 28.8 47 27.8 47 C 26.8 47 25.9 47.6 24.8 47.8 C 23.8 48.1 22.4 48.5 21.5 48.3 C 20.6 48 19.9 46.9 19.3 46.2 C 18.7 45.5 18.5 44.6 17.8 44.1 C 17 43.5 15.8 43.6 14.8 43.2 C 13.8 42.9 12.4 42.5 11.9 41.8 C 11.4 41.2 11.7 40 11.8 39.2 C 11.9 38.3 12.6 37.5 12.4 36.7 C 12.2 35.9 11.3 35.3 10.8 34.5 C 10.3 33.7 9.5 32.8 9.7 32 C 9.9 31.2 11.1 30.5 11.8 29.9 C 12.6 29.3 13.8 29 14.3 28.3 C 14.8 27.6 14.5 26.7 14.8 25.8 C 15.1 25 15.2 23.8 16 23.3 C 16.7 22.8 18.2 22.9 19.3 22.8 C 20.4 22.7 21.5 23.1 22.5 22.8 C 23.4 22.6 24 21.7 24.8 21.2 C 25.7 20.7 26.8 19.9 27.8 19.9 C 28.8 19.9 29.9 20.7 30.8 21.2 C 31.6 21.7 32.2 22.6 33.1 22.8 C 34.1 23.1 35.2 22.7 36.3 22.8 C 37.4 22.9 38.9 22.8 39.6 23.3 C 40.4 23.8 40.5 25 40.8 25.8 C 41.1 26.7 40.8 27.6 41.3 28.3 C 41.8 29 43 29.3 43.8 29.9 C 44.5 30.5 45.7 31.2 45.9 32 C 46.1 32.8 45.3 33.7 44.8 34.5 Z', from: 5 },
        { tone: 'light', d: 'M 31.6 30.7 C 31.8 31.2 32.2 31.9 32 32.4 C 31.9 32.9 31.2 33.3 30.7 33.7 C 30.2 34.1 29.6 34.3 29.2 34.7 C 28.7 35.1 28.7 35.7 28.3 36.1 C 27.9 36.6 27.5 37.2 26.9 37.5 C 26.3 37.7 25.4 37.5 24.8 37.5 C 24.1 37.4 23.5 37.1 22.8 37.1 C 22.1 37.1 21.5 37.4 20.8 37.5 C 20.2 37.5 19.3 37.7 18.7 37.5 C 18.1 37.2 17.7 36.6 17.3 36.1 C 16.9 35.7 16.9 35.1 16.4 34.7 C 16 34.3 15.4 34.1 14.9 33.7 C 14.4 33.3 13.7 32.9 13.6 32.4 C 13.4 31.9 13.8 31.2 14 30.7 C 14.2 30.2 14.7 29.8 14.9 29.3 C 15 28.8 14.8 28.3 14.9 27.7 C 15 27.2 15 26.5 15.4 26.1 C 15.8 25.7 16.7 25.5 17.3 25.3 C 18 25.1 18.7 25.2 19.3 25 C 19.9 24.7 20.3 24.3 20.8 24 C 21.4 23.7 22.1 23.3 22.8 23.3 C 23.5 23.3 24.2 23.7 24.8 24 C 25.3 24.3 25.7 24.7 26.3 25 C 26.9 25.2 27.6 25.1 28.3 25.3 C 28.9 25.5 29.8 25.7 30.2 26.1 C 30.6 26.5 30.6 27.2 30.7 27.7 C 30.8 28.3 30.6 28.8 30.7 29.3 C 30.9 29.8 31.4 30.2 31.6 30.7 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 18.6 45.6 Q 18.5 47 18.5 48.4 L 17.5 48.4 Q 17.4 47 17.4 45.6 Z', from: 5 },
        { tone: 'seedhead-light', d: 'M 20.8 52.4 C 20.8 52.9 20.6 53.6 20.3 54 C 19.9 54.5 19.4 54.9 18.9 55.1 C 18.3 55.2 17.7 55.2 17.1 55.1 C 16.6 54.9 16.1 54.5 15.7 54 C 15.4 53.6 15.2 52.9 15.2 52.4 C 15.2 51.9 15.4 51.2 15.7 50.8 C 16.1 50.3 16.6 49.9 17.1 49.7 C 17.7 49.6 18.3 49.6 18.9 49.7 C 19.4 49.9 19.9 50.3 20.3 50.8 C 20.6 51.2 20.8 51.9 20.8 52.4 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 19.4 51.9 C 19.4 52.3 19.2 52.8 19 53.1 C 18.8 53.5 18.3 53.8 17.9 53.9 C 17.6 54 17 54 16.7 53.9 C 16.3 53.8 15.8 53.5 15.6 53.1 C 15.4 52.8 15.2 52.3 15.2 51.9 C 15.2 51.5 15.4 51 15.6 50.7 C 15.8 50.3 16.3 50 16.7 49.9 C 17 49.8 17.6 49.8 17.9 49.9 C 18.3 50 18.8 50.3 19 50.7 C 19.2 51 19.4 51.5 19.4 51.9 Z', from: 5 },
        { tone: 'seedhead', d: 'M 15.1 50.6 Q 18 47.2 20.9 50.6 Q 18 52.2 15.1 50.6 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 43.6 44.6 Q 43.5 46 43.5 47.4 L 42.5 47.4 Q 42.4 46 42.4 44.6 Z', from: 5 },
        { tone: 'seedhead-light', d: 'M 45.8 51.4 C 45.8 51.9 45.6 52.6 45.3 53 C 44.9 53.5 44.4 53.9 43.9 54.1 C 43.3 54.2 42.7 54.2 42.1 54.1 C 41.6 53.9 41.1 53.5 40.7 53 C 40.4 52.6 40.2 51.9 40.2 51.4 C 40.2 50.9 40.4 50.2 40.7 49.8 C 41.1 49.3 41.6 48.9 42.1 48.7 C 42.7 48.6 43.3 48.6 43.9 48.7 C 44.4 48.9 44.9 49.3 45.3 49.8 C 45.6 50.2 45.8 50.9 45.8 51.4 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 44.4 50.9 C 44.4 51.3 44.2 51.8 44 52.1 C 43.8 52.5 43.3 52.8 42.9 52.9 C 42.6 53 42 53 41.7 52.9 C 41.3 52.8 40.8 52.5 40.6 52.1 C 40.4 51.8 40.2 51.3 40.2 50.9 C 40.2 50.5 40.4 50 40.6 49.7 C 40.8 49.3 41.3 49 41.7 48.9 C 42 48.8 42.6 48.8 42.9 48.9 C 43.3 49 43.8 49.3 44 49.7 C 44.2 50 44.4 50.5 44.4 50.9 Z', from: 5 },
        { tone: 'seedhead', d: 'M 40.1 49.6 Q 43 46.2 45.9 49.6 Q 43 51.2 40.1 49.6 Z', from: 5 }
      ]
    },
    pine: {
      trunk: 'M 26.6 96 Q 28.3 87 27.6 78 L 32.4 78 Q 31.7 87 33.4 96 Z',
      trunkShort: 'M 27.6 96 Q 28.8 90 28.2 84 L 31.8 84 Q 31.2 90 32.4 96 Z',
      trunkTone: 'wood',
      blossoms: [[24, 72], [36, 71], [26, 59], [34, 58], [30, 45], [22, 85], [38, 84], [30, 33], [30, 66]],
      parts: [
        { tone: 'wood', d: 'M 27.6 96 Q 28.8 90 28.2 84 L 31.8 84 Q 31.2 90 32.4 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.4 96 Q 30.7 90 30.2 84 L 31.8 84 Q 31.2 90 32.4 96 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 30 81 L 39 93 Q 30 91 21 93 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 29.4 82 L 37.6 91.9 Q 30 90 21.5 92.3 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.7 82.7 Q 26.1 85.9 24.4 91.2 Q 28 87 29.7 82.7 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 30 71 L 36.5 82 Q 30 80 23.5 82 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 29.4 71.9 L 35.5 80.9 Q 30 79 23.9 81.3 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.7 72.5 Q 27.1 75.6 26 80.2 Q 28.5 76.3 29.7 72.5 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 27 96 Q 28.5 87 27.8 78 L 32.2 78 Q 31.5 87 33 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.8 87 30.2 78 L 32.2 78 Q 31.5 87 33 96 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 30 76 L 43 91 Q 30 89 17 91 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 29.4 77.2 L 40.9 89.9 Q 30 88 17.8 90.3 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 29.7 78.1 Q 24.5 82.1 21.9 89.2 Q 27.1 83.9 29.7 78.1 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 30 64 L 40.5 78 Q 30 76 19.5 78 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 29.4 65.1 L 38.8 76.9 Q 30 75 20.1 77.3 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 29.7 66 Q 25.5 69.9 23.5 76.2 Q 27.7 71.2 29.7 66 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 30 52 L 37.5 65 Q 30 63 22.5 65 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 29.4 53 L 36.3 63.9 Q 30 62 23 64.3 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 29.7 53.8 Q 26.7 57.7 25.4 63.2 Q 28.3 58.4 29.7 53.8 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 26.6 96 Q 28.3 87 27.6 78 L 32.4 78 Q 31.7 87 33.4 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.6 96 Q 31 87 30.2 78 L 32.4 78 Q 31.7 87 33.4 96 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30 74 L 45 90 Q 30 88 15 90 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 29.4 75.3 L 42.6 88.9 Q 30 87 15.9 89.3 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.7 76.2 Q 23.8 80.4 20.7 88.2 Q 26.6 82.6 29.7 76.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30 62 L 42.5 77 Q 30 75 17.5 77 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 29.4 63.2 L 40.5 75.9 Q 30 74 18.3 76.3 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.7 64.1 Q 24.7 68.2 22.3 75.2 Q 27.2 69.8 29.7 64.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30 50 L 40 64 Q 30 62 20 64 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 29.4 51.1 L 38.4 62.9 Q 30 61 20.6 63.3 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.7 52 Q 25.7 55.9 23.8 62.2 Q 27.8 57.1 29.7 52 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30 38 L 37 51 Q 30 49 23 51 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 29.4 39 L 35.9 49.9 Q 30 48 23.4 50.3 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.7 39.8 Q 26.9 43.7 25.7 49.2 Q 28.4 44.4 29.7 39.8 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 26.2 96 Q 28.1 87 27.4 78 L 32.6 78 Q 31.9 87 33.8 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.7 96 Q 31.1 87 30.3 78 L 32.6 78 Q 31.9 87 33.8 96 Z', from: 5 },
        { tone: 'deep', d: 'M 30 73 L 46 90 Q 30 88 14 90 Z', from: 5 },
        { tone: 'base', d: 'M 29.4 74.4 L 43.4 88.9 Q 30 87 15 89.3 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 75.4 Q 23.4 79.8 20.1 88.2 Q 26.4 82.1 29.7 75.4 Z', from: 5 },
        { tone: 'deep', d: 'M 30 61 L 44 77 Q 30 75 16 77 Z', from: 5 },
        { tone: 'base', d: 'M 29.4 62.3 L 41.8 75.9 Q 30 74 16.8 76.3 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 63.2 Q 24.1 67.5 21.3 75.2 Q 26.9 69.5 29.7 63.2 Z', from: 5 },
        { tone: 'deep', d: 'M 30 49 L 41.5 64 Q 30 62 18.5 64 Z', from: 5 },
        { tone: 'base', d: 'M 29.4 50.2 L 39.7 62.9 Q 30 61 19.2 63.3 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 51.1 Q 25.1 55.3 22.9 62.2 Q 27.4 56.7 29.7 51.1 Z', from: 5 },
        { tone: 'deep', d: 'M 30 37 L 39 51 Q 30 49 21 51 Z', from: 5 },
        { tone: 'base', d: 'M 29.4 38.1 L 37.6 49.9 Q 30 48 21.5 50.3 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 39 Q 26.1 43.1 24.4 49.2 Q 28 44 29.7 39 Z', from: 5 },
        { tone: 'deep', d: 'M 30 25 L 36 38 Q 30 36 24 38 Z', from: 5 },
        { tone: 'base', d: 'M 29.4 26 L 35 36.9 Q 30 35 24.4 37.3 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 26.8 Q 27.3 30.8 26.3 36.2 Q 28.6 31.3 29.7 26.8 Z', from: 5 }
      ]
    },
    sakura: {
      trunk: 'M 26 96 Q 28 80 24.4 64 L 29.6 64 Q 32 80 34 96 Z',
      trunkShort: 'M 27.2 96 Q 28.6 86 26 76 L 30 76 Q 31.4 86 32.8 96 Z',
      trunkTone: 'wood',
      blossoms: [[16, 50], [36, 54], [27, 30], [44, 44], [21, 41], [31, 45], [11, 55], [47, 38], [33, 60]],
      parts: [
        { tone: 'wood', d: 'M 27.2 96 Q 28.6 86 26 76 L 30 76 Q 31.4 86 32.8 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.8 86 28.2 76 L 30 76 Q 31.4 86 32.8 96 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 38 71 C 38.4 71.6 39.2 72.3 39 72.9 C 38.9 73.4 37.7 73.9 37 74.3 C 36.3 74.6 35.3 74.6 34.8 75.1 C 34.3 75.5 34.6 76.3 34.2 76.9 C 33.9 77.5 33.6 78.4 32.9 78.6 C 32.2 78.9 31 78.5 30.2 78.3 C 29.4 78.1 28.7 77.5 28 77.5 C 27.3 77.5 26.6 78.1 25.8 78.3 C 25 78.5 23.8 78.9 23.1 78.6 C 22.4 78.4 22.1 77.5 21.8 76.9 C 21.4 76.3 21.7 75.5 21.2 75.1 C 20.7 74.6 19.7 74.6 19 74.3 C 18.3 73.9 17.1 73.4 17 72.9 C 16.8 72.3 17.6 71.6 18 71 C 18.4 70.4 19.4 70.1 19.5 69.5 C 19.7 69 19 68.4 19 67.7 C 18.9 67.1 18.7 66.2 19.2 65.7 C 19.6 65.3 20.9 65.2 21.8 65.1 C 22.6 65 23.6 65.4 24.2 65.1 C 24.9 64.9 25.1 64.1 25.8 63.7 C 26.4 63.3 27.3 62.5 28 62.5 C 28.7 62.5 29.6 63.3 30.2 63.7 C 30.9 64.1 31.1 64.9 31.8 65.1 C 32.4 65.4 33.4 65 34.2 65.1 C 35.1 65.2 36.4 65.3 36.8 65.7 C 37.3 66.2 37.1 67.1 37 67.7 C 37 68.4 36.3 69 36.5 69.5 C 36.6 70.1 37.6 70.4 38 71 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 35.4 69.9 C 35.7 70.3 36.4 71 36.2 71.4 C 36.1 71.9 35.1 72.2 34.6 72.5 C 34 72.8 33.1 72.9 32.7 73.2 C 32.3 73.6 32.5 74.2 32.2 74.7 C 31.9 75.2 31.6 75.9 31 76.1 C 30.5 76.3 29.5 76 28.8 75.9 C 28.1 75.7 27.5 75.3 26.9 75.3 C 26.3 75.3 25.7 75.7 25 75.9 C 24.3 76 23.3 76.3 22.8 76.1 C 22.2 75.9 21.9 75.2 21.6 74.7 C 21.3 74.2 21.5 73.6 21.1 73.2 C 20.7 72.9 19.8 72.8 19.2 72.5 C 18.7 72.2 17.7 71.9 17.6 71.4 C 17.4 71 18.1 70.3 18.4 69.9 C 18.7 69.4 19.5 69.1 19.6 68.7 C 19.8 68.2 19.3 67.7 19.2 67.2 C 19.2 66.7 19 65.9 19.4 65.6 C 19.8 65.2 20.9 65.2 21.6 65.1 C 22.3 65 23.1 65.2 23.7 65 C 24.2 64.8 24.5 64.2 25 63.9 C 25.5 63.5 26.3 63 26.9 63 C 27.5 63 28.3 63.5 28.8 63.9 C 29.3 64.2 29.6 64.8 30.1 65 C 30.7 65.2 31.5 65 32.2 65.1 C 32.9 65.2 34 65.2 34.4 65.6 C 34.8 65.9 34.6 66.7 34.6 67.2 C 34.5 67.7 34 68.2 34.2 68.7 C 34.3 69.1 35.1 69.4 35.4 69.9 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 28.8 68.2 C 28.6 68.5 28.2 68.7 28.1 69 C 28 69.3 28.1 69.7 28 70 C 27.8 70.3 27.7 70.8 27.3 71 C 26.9 71.2 26.2 71.2 25.8 71.1 C 25.3 71.1 24.9 70.9 24.4 70.9 C 23.9 70.9 23.5 71.1 23 71.1 C 22.6 71.2 21.9 71.2 21.5 71 C 21.1 70.8 21 70.3 20.8 70 C 20.7 69.7 20.8 69.3 20.7 69 C 20.6 68.7 20.2 68.5 20 68.2 C 19.8 67.8 19.6 67.4 19.7 67.1 C 19.9 66.8 20.4 66.5 20.8 66.3 C 21.2 66.1 21.7 66.1 22.1 65.9 C 22.5 65.7 22.7 65.4 23 65.2 C 23.4 64.9 23.9 64.6 24.4 64.6 C 24.9 64.6 25.4 64.9 25.8 65.2 C 26.1 65.4 26.3 65.7 26.7 65.9 C 27.1 66.1 27.6 66.1 28 66.3 C 28.4 66.5 28.9 66.8 29.1 67.1 C 29.2 67.4 29 67.8 28.8 68.2 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 26 96 Q 28 80 24.4 64 L 29.6 64 Q 32 80 34 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.7 96 Q 31.1 80 27.3 64 L 29.6 64 Q 32 80 34 96 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 27.4 67 Q 32.1 63.5 37.6 61.4 L 38.4 62.6 Q 33.1 65.2 28.6 69 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 38 57 C 38.5 57.7 39.4 58.7 39.2 59.4 C 39 60.1 37.7 60.7 36.8 61.1 C 36 61.6 34.7 61.6 34.2 62.2 C 33.6 62.7 33.9 63.7 33.5 64.4 C 33.1 65.2 32.7 66.4 31.9 66.7 C 31.1 67 29.7 66.5 28.7 66.3 C 27.7 66 26.9 65.3 26 65.3 C 25.1 65.3 24.3 66 23.3 66.3 C 22.3 66.5 20.9 67 20.1 66.7 C 19.3 66.4 18.9 65.2 18.5 64.4 C 18.1 63.7 18.4 62.7 17.8 62.2 C 17.3 61.6 16 61.6 15.2 61.1 C 14.3 60.7 13 60.1 12.8 59.4 C 12.6 58.7 13.5 57.7 14 57 C 14.5 56.3 15.6 55.8 15.8 55.2 C 16 54.5 15.3 53.7 15.2 52.9 C 15.1 52.1 14.8 50.9 15.4 50.3 C 16 49.8 17.5 49.7 18.5 49.6 C 19.5 49.4 20.7 49.9 21.5 49.6 C 22.3 49.2 22.6 48.3 23.3 47.7 C 24.1 47.2 25.1 46.3 26 46.3 C 26.9 46.3 27.9 47.2 28.7 47.7 C 29.4 48.3 29.7 49.2 30.5 49.6 C 31.3 49.9 32.5 49.4 33.5 49.6 C 34.5 49.7 36 49.8 36.6 50.3 C 37.2 50.9 36.9 52.1 36.8 52.9 C 36.7 53.7 36 54.5 36.2 55.2 C 36.4 55.8 37.5 56.3 38 57 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 34.9 55.6 C 35.3 56.2 36 57 35.9 57.5 C 35.7 58.1 34.6 58.6 33.9 59 C 33.2 59.3 32.1 59.4 31.7 59.8 C 31.2 60.3 31.4 61.1 31 61.7 C 30.7 62.3 30.3 63.2 29.7 63.5 C 29 63.7 27.8 63.3 26.9 63.2 C 26.1 63 25.4 62.4 24.7 62.4 C 23.9 62.4 23.2 63 22.4 63.2 C 21.6 63.3 20.4 63.7 19.7 63.5 C 19 63.2 18.7 62.3 18.3 61.7 C 18 61.1 18.2 60.3 17.7 59.8 C 17.2 59.4 16.2 59.3 15.5 59 C 14.8 58.6 13.7 58.1 13.5 57.5 C 13.3 57 14.1 56.2 14.5 55.6 C 14.9 55 15.8 54.6 16 54.1 C 16.1 53.5 15.5 52.9 15.5 52.2 C 15.4 51.5 15.2 50.6 15.7 50.1 C 16.2 49.7 17.5 49.6 18.3 49.5 C 19.2 49.4 20.1 49.7 20.8 49.4 C 21.5 49.2 21.8 48.4 22.4 48 C 23.1 47.5 23.9 46.8 24.7 46.8 C 25.4 46.8 26.3 47.5 26.9 48 C 27.6 48.4 27.9 49.2 28.6 49.4 C 29.2 49.7 30.2 49.4 31 49.5 C 31.9 49.6 33.2 49.7 33.6 50.1 C 34.1 50.6 33.9 51.5 33.9 52.2 C 33.8 52.9 33.2 53.5 33.4 54.1 C 33.6 54.6 34.5 55 34.9 55.6 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 27 53.4 C 26.8 53.8 26.3 54.1 26.1 54.5 C 25.9 54.9 26.1 55.3 26 55.7 C 25.8 56.2 25.6 56.8 25.1 57 C 24.7 57.2 23.9 57.2 23.3 57.2 C 22.7 57.2 22.2 56.9 21.7 56.9 C 21.1 56.9 20.6 57.2 20 57.2 C 19.5 57.2 18.7 57.2 18.2 57 C 17.8 56.8 17.6 56.2 17.4 55.7 C 17.2 55.3 17.4 54.9 17.2 54.5 C 17.1 54.1 16.6 53.8 16.4 53.4 C 16.2 53 15.9 52.4 16.1 52 C 16.2 51.6 16.9 51.3 17.4 51 C 17.9 50.8 18.5 50.8 18.9 50.5 C 19.4 50.3 19.6 49.9 20 49.6 C 20.5 49.3 21.1 48.9 21.7 48.9 C 22.2 48.9 22.9 49.3 23.3 49.6 C 23.8 49.9 24 50.3 24.4 50.5 C 24.9 50.8 25.5 50.8 26 51 C 26.4 51.3 27.1 51.6 27.3 52 C 27.5 52.4 27.2 53 27 53.4 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 46 62 C 45.6 62.7 44.8 63.1 44.5 63.7 C 44.3 64.4 44.7 65.1 44.5 65.8 C 44.3 66.5 44 67.6 43.4 68 C 42.7 68.4 41.4 68.2 40.5 68.2 C 39.6 68.1 38.8 67.6 38 67.6 C 37.2 67.6 36.4 68.1 35.5 68.2 C 34.6 68.2 33.3 68.4 32.6 68 C 32 67.6 31.7 66.5 31.5 65.8 C 31.3 65.1 31.7 64.4 31.5 63.7 C 31.2 63.1 30.4 62.7 30 62 C 29.6 61.3 29.1 60.3 29.3 59.7 C 29.6 59.1 30.8 58.6 31.5 58.2 C 32.3 57.8 33.3 57.9 34 57.5 C 34.6 57.1 34.9 56.3 35.5 55.8 C 36.2 55.3 37.2 54.6 38 54.6 C 38.8 54.6 39.8 55.3 40.5 55.8 C 41.1 56.3 41.4 57.1 42 57.5 C 42.7 57.9 43.7 57.8 44.5 58.2 C 45.2 58.6 46.4 59.1 46.7 59.7 C 46.9 60.3 46.4 61.3 46 62 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 43.9 61 C 43.6 61.6 42.9 61.9 42.7 62.5 C 42.5 63 42.8 63.6 42.6 64.2 C 42.4 64.7 42.2 65.6 41.6 65.9 C 41.1 66.2 40 66.1 39.2 66.1 C 38.5 66.1 37.8 65.6 37.1 65.6 C 36.4 65.6 35.8 66.1 35 66.1 C 34.3 66.1 33.2 66.2 32.6 65.9 C 32 65.6 31.8 64.7 31.6 64.2 C 31.4 63.6 31.7 63 31.5 62.5 C 31.3 61.9 30.6 61.6 30.3 61 C 30 60.5 29.6 59.7 29.8 59.2 C 30 58.6 31 58.2 31.6 57.9 C 32.3 57.6 33.1 57.6 33.7 57.3 C 34.2 57 34.4 56.3 35 56 C 35.6 55.6 36.4 55 37.1 55 C 37.8 55 38.6 55.6 39.2 56 C 39.8 56.3 40 57 40.6 57.3 C 41.2 57.6 42 57.6 42.6 57.9 C 43.3 58.2 44.2 58.6 44.4 59.2 C 44.7 59.7 44.2 60.5 43.9 61 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 38.6 59.5 C 38.8 60 38.8 60.7 38.6 61.1 C 38.3 61.5 37.5 61.8 36.9 61.9 C 36.3 62 35.7 61.9 35.1 61.9 C 34.5 61.9 33.9 62 33.4 61.9 C 32.8 61.8 32 61.5 31.7 61.1 C 31.4 60.7 31.5 60 31.6 59.5 C 31.7 59.1 32.2 58.7 32.5 58.3 C 32.7 57.9 32.9 57.5 33.4 57.2 C 33.8 56.9 34.5 56.5 35.1 56.5 C 35.7 56.5 36.4 56.9 36.9 57.2 C 37.3 57.5 37.5 57.9 37.8 58.3 C 38.1 58.7 38.5 59.1 38.6 59.5 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 25.4 96 Q 27.7 77 23.2 58 L 28.8 58 Q 32.3 77 34.6 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.8 96 Q 31.3 77 26.3 58 L 28.8 58 Q 32.3 77 34.6 96 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 26.5 60.8 Q 33.2 57.1 40.7 55.4 L 41.3 56.6 Q 34 58.9 27.5 63.2 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 26.7 63.3 Q 22.1 60.3 16.9 60.7 L 17.1 59.3 Q 22.5 58.4 27.3 60.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 23 58 C 22.7 58.6 21.9 59 21.7 59.6 C 21.5 60.2 21.8 60.9 21.7 61.5 C 21.5 62.2 21.3 63.2 20.7 63.5 C 20.1 63.9 18.9 63.8 18.2 63.7 C 17.4 63.6 16.7 63.2 16 63.2 C 15.3 63.2 14.6 63.6 13.8 63.7 C 13.1 63.8 11.9 63.9 11.3 63.5 C 10.7 63.2 10.5 62.2 10.3 61.5 C 10.2 60.9 10.5 60.2 10.3 59.6 C 10.1 59 9.3 58.6 9 58 C 8.7 57.4 8.2 56.5 8.4 55.9 C 8.6 55.3 9.7 54.8 10.3 54.5 C 11 54.1 11.9 54.2 12.5 53.8 C 13 53.5 13.2 52.7 13.8 52.3 C 14.4 51.8 15.3 51.2 16 51.2 C 16.7 51.2 17.6 51.8 18.2 52.3 C 18.8 52.7 19 53.5 19.5 53.8 C 20.1 54.2 21 54.1 21.7 54.5 C 22.3 54.8 23.4 55.3 23.6 55.9 C 23.8 56.5 23.3 57.4 23 58 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 21.2 57.1 C 20.9 57.6 20.3 57.9 20.1 58.4 C 19.9 58.9 20.2 59.5 20 60 C 19.9 60.5 19.7 61.3 19.2 61.6 C 18.7 61.9 17.7 61.8 17.1 61.8 C 16.4 61.7 15.8 61.4 15.2 61.4 C 14.6 61.4 14.1 61.7 13.4 61.8 C 12.7 61.8 11.8 61.9 11.3 61.6 C 10.8 61.3 10.6 60.5 10.4 60 C 10.3 59.5 10.5 58.9 10.3 58.4 C 10.1 57.9 9.5 57.6 9.3 57.1 C 9 56.6 8.6 55.9 8.8 55.4 C 9 54.9 9.9 54.5 10.4 54.2 C 11 53.9 11.7 53.9 12.2 53.6 C 12.7 53.4 12.9 52.8 13.4 52.4 C 13.9 52.1 14.6 51.5 15.2 51.5 C 15.8 51.5 16.6 52.1 17.1 52.4 C 17.6 52.8 17.8 53.4 18.3 53.6 C 18.8 53.9 19.5 53.9 20 54.2 C 20.6 54.5 21.5 54.9 21.6 55.4 C 21.8 55.9 21.4 56.6 21.2 57.1 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 16.6 55.7 C 16.7 56.1 16.7 56.8 16.5 57.1 C 16.2 57.5 15.5 57.8 15 57.9 C 14.5 58 14 57.9 13.5 57.9 C 13 57.9 12.4 58 11.9 57.9 C 11.4 57.8 10.7 57.5 10.5 57.1 C 10.2 56.8 10.3 56.1 10.4 55.7 C 10.5 55.3 10.9 55 11.1 54.6 C 11.4 54.3 11.6 53.8 11.9 53.5 C 12.3 53.2 13 52.9 13.5 52.9 C 14 52.9 14.6 53.2 15 53.5 C 15.4 53.8 15.6 54.3 15.8 54.6 C 16.1 55 16.4 55.3 16.6 55.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 50.1 53 C 50.1 53.7 51 54.4 51.1 55.2 C 51.3 56 51.7 57.2 51.3 57.8 C 50.8 58.4 49.4 58.7 48.4 59 C 47.5 59.3 46.4 59 45.6 59.4 C 44.8 59.8 44.5 60.7 43.7 61.2 C 43 61.7 41.9 62.6 41 62.6 C 40.1 62.6 39 61.7 38.3 61.2 C 37.5 60.7 37.2 59.8 36.4 59.4 C 35.6 59 34.5 59.3 33.6 59 C 32.6 58.7 31.2 58.4 30.7 57.8 C 30.3 57.2 30.7 56 30.9 55.2 C 31 54.4 31.9 53.7 31.9 53 C 31.9 52.3 31 51.6 30.9 50.8 C 30.7 50 30.3 48.8 30.7 48.2 C 31.2 47.6 32.6 47.3 33.6 47 C 34.5 46.7 35.6 47 36.4 46.6 C 37.2 46.2 37.5 45.3 38.3 44.8 C 39 44.3 40.1 43.4 41 43.4 C 41.9 43.4 43 44.3 43.7 44.8 C 44.5 45.3 44.8 46.2 45.6 46.6 C 46.4 47 47.5 46.7 48.4 47 C 49.4 47.3 50.8 47.6 51.3 48.2 C 51.7 48.8 51.3 50 51.1 50.8 C 51 51.6 50.1 52.3 50.1 53 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 47.7 51.7 C 47.7 52.3 48.3 52.9 48.5 53.5 C 48.6 54.2 48.9 55.1 48.5 55.6 C 48.1 56.2 47 56.4 46.2 56.7 C 45.4 56.9 44.4 56.7 43.8 57 C 43.1 57.3 42.8 58 42.2 58.5 C 41.5 58.9 40.6 59.6 39.8 59.6 C 39.1 59.6 38.2 58.9 37.5 58.5 C 36.9 58 36.6 57.3 35.9 57 C 35.3 56.7 34.3 56.9 33.5 56.7 C 32.7 56.4 31.5 56.2 31.2 55.6 C 30.8 55.1 31.1 54.2 31.2 53.5 C 31.4 52.9 32 52.3 32 51.7 C 32 51.1 31.4 50.6 31.2 49.9 C 31.1 49.3 30.8 48.3 31.2 47.8 C 31.5 47.3 32.7 47 33.5 46.8 C 34.3 46.6 35.3 46.7 35.9 46.4 C 36.6 46.1 36.9 45.4 37.5 45 C 38.2 44.6 39.1 43.9 39.8 43.9 C 40.6 43.9 41.5 44.6 42.2 45 C 42.8 45.4 43.1 46.1 43.8 46.4 C 44.4 46.7 45.4 46.6 46.2 46.8 C 47 47 48.1 47.3 48.5 47.8 C 48.9 48.3 48.6 49.3 48.5 49.9 C 48.3 50.6 47.7 51.1 47.7 51.7 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 42.4 49.8 C 42.4 50.2 41.9 50.8 41.5 51.1 C 41.1 51.5 40.5 51.7 40.1 52 C 39.7 52.3 39.5 52.8 39 53.1 C 38.5 53.4 37.8 53.8 37.2 53.8 C 36.6 53.8 35.9 53.4 35.5 53.1 C 35 52.8 34.8 52.3 34.3 52 C 33.9 51.7 33.3 51.5 33 51.1 C 32.6 50.8 32.1 50.2 32.1 49.8 C 32.1 49.3 32.6 48.8 33 48.4 C 33.3 48 33.9 47.9 34.3 47.5 C 34.8 47.2 35 46.8 35.5 46.5 C 35.9 46.2 36.6 45.8 37.2 45.8 C 37.8 45.8 38.5 46.2 39 46.5 C 39.5 46.8 39.7 47.2 40.1 47.5 C 40.5 47.9 41.1 48 41.5 48.4 C 41.9 48.8 42.4 49.3 42.4 49.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.7 46 C 41.7 46.7 40.4 47.5 39.7 48.1 C 39 48.8 37.7 49 37.4 49.7 C 37 50.4 37.7 51.3 37.6 52.1 C 37.6 52.9 37.7 54.2 37.1 54.7 C 36.4 55.2 34.8 55.1 33.8 55.1 C 32.7 55.2 31.6 54.7 30.7 54.9 C 29.9 55.2 29.5 56.2 28.7 56.8 C 27.9 57.4 26.9 58.3 26 58.3 C 25.1 58.3 24.1 57.4 23.3 56.8 C 22.5 56.2 22.1 55.2 21.3 54.9 C 20.4 54.7 19.3 55.2 18.2 55.1 C 17.2 55.1 15.6 55.2 14.9 54.7 C 14.3 54.2 14.4 52.9 14.4 52.1 C 14.3 51.3 15 50.4 14.6 49.7 C 14.3 49 13 48.8 12.3 48.1 C 11.6 47.5 10.3 46.7 10.3 46 C 10.3 45.3 11.6 44.5 12.3 43.9 C 13 43.2 14.3 43 14.6 42.3 C 15 41.6 14.3 40.7 14.4 39.9 C 14.4 39.1 14.3 37.8 14.9 37.3 C 15.6 36.8 17.2 36.9 18.2 36.9 C 19.3 36.8 20.4 37.3 21.3 37.1 C 22.1 36.8 22.5 35.8 23.3 35.2 C 24.1 34.6 25.1 33.7 26 33.7 C 26.9 33.7 27.9 34.6 28.7 35.2 C 29.5 35.8 29.9 36.8 30.7 37.1 C 31.6 37.3 32.7 36.8 33.8 36.9 C 34.8 36.9 36.4 36.8 37.1 37.3 C 37.7 37.8 37.6 39.1 37.6 39.9 C 37.7 40.7 37 41.6 37.4 42.3 C 37.7 43 39 43.2 39.7 43.9 C 40.4 44.5 41.7 45.3 41.7 46 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 37.7 44.4 C 37.7 44.9 36.7 45.6 36.1 46.1 C 35.5 46.6 34.5 46.9 34.2 47.4 C 33.9 48 34.4 48.7 34.4 49.4 C 34.3 50 34.4 51 33.8 51.5 C 33.3 51.9 32 51.8 31.1 51.8 C 30.2 51.9 29.2 51.5 28.5 51.7 C 27.8 52 27.5 52.8 26.8 53.2 C 26.1 53.6 25.2 54.4 24.5 54.4 C 23.7 54.4 22.8 53.6 22.1 53.2 C 21.5 52.8 21.1 52 20.4 51.7 C 19.7 51.5 18.7 51.9 17.8 51.8 C 17 51.8 15.6 51.9 15.1 51.5 C 14.5 51 14.6 50 14.6 49.4 C 14.5 48.7 15 48 14.7 47.4 C 14.4 46.9 13.4 46.6 12.8 46.1 C 12.2 45.6 11.2 44.9 11.2 44.4 C 11.2 43.8 12.2 43.1 12.8 42.6 C 13.4 42.1 14.4 41.8 14.7 41.3 C 15 40.7 14.5 40 14.6 39.3 C 14.6 38.7 14.5 37.7 15.1 37.2 C 15.6 36.8 17 36.9 17.8 36.9 C 18.7 36.8 19.7 37.2 20.4 37 C 21.1 36.7 21.5 35.9 22.1 35.5 C 22.8 35.1 23.7 34.3 24.5 34.3 C 25.2 34.3 26.1 35.1 26.8 35.5 C 27.5 35.9 27.8 36.7 28.5 37 C 29.2 37.2 30.2 36.8 31.1 36.9 C 32 36.9 33.3 36.8 33.8 37.2 C 34.4 37.7 34.3 38.7 34.4 39.3 C 34.4 40 33.9 40.7 34.2 41.3 C 34.5 41.8 35.5 42.1 36.1 42.6 C 36.7 43.1 37.7 43.8 37.7 44.4 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 26.5 41.8 C 26.5 42.2 26.8 42.6 26.9 43 C 27 43.4 27.1 44 26.9 44.4 C 26.6 44.7 25.8 44.9 25.3 45.1 C 24.8 45.3 24.2 45.2 23.7 45.4 C 23.2 45.6 23 46 22.6 46.3 C 22.1 46.5 21.5 46.9 21 46.9 C 20.4 46.9 19.8 46.5 19.4 46.3 C 18.9 46 18.7 45.6 18.2 45.4 C 17.8 45.2 17.1 45.3 16.6 45.1 C 16.1 44.9 15.3 44.7 15 44.4 C 14.8 44 14.9 43.4 15 43 C 15.1 42.6 15.5 42.2 15.5 41.8 C 15.5 41.4 15.1 41.1 15 40.6 C 14.9 40.2 14.8 39.6 15 39.3 C 15.3 38.9 16.1 38.7 16.6 38.6 C 17.1 38.4 17.8 38.5 18.2 38.3 C 18.7 38.1 18.9 37.6 19.4 37.4 C 19.8 37.1 20.4 36.7 21 36.7 C 21.5 36.7 22.1 37.1 22.6 37.4 C 23 37.6 23.2 38.1 23.7 38.3 C 24.2 38.5 24.8 38.4 25.3 38.6 C 25.8 38.7 26.6 38.9 26.9 39.3 C 27.1 39.6 27 40.2 26.9 40.6 C 26.8 41.1 26.5 41.4 26.5 41.8 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 24.8 96 Q 27.4 75 22 54 L 28 54 Q 32.6 75 35.2 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.9 96 Q 31.5 75 25.3 54 L 28 54 Q 32.6 75 35.2 96 Z', from: 5 },
        { tone: 'wood', d: 'M 25.4 56.7 Q 33.5 51.9 42.7 49.3 L 43.3 50.7 Q 34.4 53.8 26.6 59.3 Z', from: 5 },
        { tone: 'wood', d: 'M 25.5 59.3 Q 20.8 55.2 14.7 54.7 L 15.3 53.3 Q 21.5 53.2 26.5 56.7 Z', from: 5 },
        { tone: 'deep', d: 'M 21.7 52 C 21.7 52.6 22.5 53.2 22.7 53.9 C 22.9 54.7 23.3 55.7 22.9 56.3 C 22.5 56.8 21.2 57.1 20.4 57.3 C 19.5 57.5 18.5 57.3 17.9 57.6 C 17.2 57.9 17 58.8 16.3 59.2 C 15.7 59.7 14.8 60.6 14 60.6 C 13.2 60.6 12.3 59.7 11.7 59.2 C 11 58.8 10.8 57.9 10.1 57.6 C 9.5 57.3 8.5 57.5 7.6 57.3 C 6.8 57.1 5.5 56.8 5.1 56.3 C 4.7 55.7 5.1 54.7 5.3 53.9 C 5.5 53.2 6.3 52.6 6.3 52 C 6.3 51.4 5.5 50.8 5.3 50.1 C 5.1 49.3 4.7 48.3 5.1 47.7 C 5.5 47.2 6.8 46.9 7.6 46.7 C 8.5 46.5 9.5 46.7 10.1 46.4 C 10.8 46.1 11 45.2 11.7 44.8 C 12.3 44.3 13.2 43.5 14 43.5 C 14.8 43.5 15.7 44.3 16.3 44.8 C 17 45.2 17.2 46.1 17.9 46.4 C 18.5 46.7 19.5 46.5 20.4 46.7 C 21.2 46.9 22.5 47.2 22.9 47.7 C 23.3 48.3 22.9 49.3 22.7 50.1 C 22.5 50.8 21.7 51.4 21.7 52 Z', from: 5 },
        { tone: 'base', d: 'M 19.6 50.9 C 19.6 51.4 20.3 51.9 20.4 52.5 C 20.5 53 20.8 53.9 20.5 54.4 C 20.2 54.8 19.1 55 18.4 55.2 C 17.7 55.4 16.9 55.2 16.3 55.5 C 15.8 55.8 15.5 56.4 15 56.8 C 14.4 57.2 13.7 57.8 13 57.8 C 12.4 57.8 11.6 57.2 11 56.8 C 10.5 56.4 10.3 55.8 9.7 55.5 C 9.1 55.2 8.3 55.4 7.6 55.2 C 6.9 55 5.8 54.8 5.5 54.4 C 5.2 53.9 5.5 53 5.6 52.5 C 5.8 51.9 6.4 51.4 6.4 50.9 C 6.4 50.3 5.8 49.9 5.6 49.3 C 5.5 48.7 5.2 47.9 5.5 47.4 C 5.8 46.9 6.9 46.7 7.6 46.5 C 8.3 46.3 9.1 46.5 9.7 46.3 C 10.3 46 10.5 45.3 11 44.9 C 11.6 44.5 12.4 43.9 13 43.9 C 13.7 43.9 14.4 44.5 15 44.9 C 15.5 45.3 15.8 46 16.3 46.3 C 16.9 46.5 17.7 46.3 18.4 46.5 C 19.1 46.7 20.2 46.9 20.5 47.4 C 20.8 47.9 20.5 48.7 20.4 49.3 C 20.3 49.9 19.6 50.3 19.6 50.9 Z', from: 5 },
        { tone: 'light', d: 'M 15.2 49.2 C 15.2 49.6 14.8 50 14.4 50.4 C 14.1 50.7 13.6 50.8 13.2 51.1 C 12.9 51.4 12.7 51.8 12.3 52.1 C 11.9 52.3 11.3 52.7 10.8 52.7 C 10.3 52.7 9.7 52.3 9.2 52.1 C 8.8 51.8 8.7 51.4 8.3 51.1 C 8 50.8 7.4 50.7 7.1 50.4 C 6.8 50 6.3 49.6 6.3 49.2 C 6.3 48.7 6.8 48.3 7.1 47.9 C 7.4 47.6 8 47.5 8.3 47.2 C 8.7 46.9 8.8 46.5 9.2 46.2 C 9.7 46 10.3 45.6 10.8 45.6 C 11.3 45.6 11.9 46 12.3 46.2 C 12.7 46.5 12.9 46.9 13.2 47.2 C 13.6 47.5 14.1 47.6 14.4 47.9 C 14.8 48.3 15.2 48.7 15.2 49.2 Z', from: 5 },
        { tone: 'deep', d: 'M 54 47 C 54.5 47.7 55.3 48.6 55.1 49.3 C 54.9 49.9 53.7 50.5 52.9 50.9 C 52.1 51.3 51 51.4 50.5 51.9 C 50 52.4 50.2 53.3 49.9 54 C 49.5 54.7 49.1 55.9 48.4 56.2 C 47.7 56.5 46.3 56 45.4 55.8 C 44.5 55.6 43.8 54.8 43 54.8 C 42.2 54.8 41.5 55.6 40.6 55.8 C 39.7 56 38.3 56.5 37.6 56.2 C 36.9 55.9 36.5 54.7 36.1 54 C 35.8 53.3 36 52.4 35.5 51.9 C 35 51.4 33.9 51.3 33.1 50.9 C 32.3 50.5 31.1 49.9 30.9 49.3 C 30.7 48.6 31.5 47.7 32 47 C 32.5 46.3 33.5 45.9 33.7 45.3 C 33.9 44.6 33.2 43.9 33.1 43.1 C 33 42.3 32.8 41.2 33.3 40.7 C 33.8 40.1 35.2 40.1 36.1 40 C 37.1 39.8 38.1 40.2 38.8 39.9 C 39.6 39.7 39.9 38.7 40.6 38.2 C 41.2 37.7 42.2 36.8 43 36.8 C 43.8 36.8 44.8 37.7 45.4 38.2 C 46.1 38.7 46.4 39.7 47.2 39.9 C 47.9 40.2 48.9 39.8 49.9 40 C 50.8 40.1 52.2 40.1 52.7 40.7 C 53.2 41.2 53 42.3 52.9 43.1 C 52.8 43.9 52.1 44.6 52.3 45.3 C 52.5 45.9 53.5 46.3 54 47 Z', from: 5 },
        { tone: 'base', d: 'M 51.1 45.7 C 51.5 46.2 52.2 47 52 47.5 C 51.9 48 50.9 48.5 50.2 48.9 C 49.6 49.2 48.6 49.3 48.2 49.7 C 47.8 50.1 47.9 50.8 47.6 51.4 C 47.3 52 47 52.9 46.3 53.1 C 45.7 53.4 44.6 53 43.9 52.8 C 43.1 52.7 42.5 52.1 41.8 52.1 C 41.1 52.1 40.5 52.7 39.7 52.8 C 38.9 53 37.9 53.4 37.2 53.1 C 36.6 52.9 36.3 52 36 51.4 C 35.7 50.8 35.8 50.1 35.4 49.7 C 35 49.3 34 49.2 33.4 48.9 C 32.7 48.5 31.7 48 31.5 47.5 C 31.4 47 32.1 46.2 32.4 45.7 C 32.8 45.1 33.6 44.7 33.8 44.2 C 34 43.7 33.4 43.1 33.4 42.4 C 33.3 41.8 33.1 40.9 33.6 40.5 C 34 40.1 35.2 40 36 39.9 C 36.7 39.8 37.6 40.1 38.2 39.8 C 38.9 39.6 39.1 38.9 39.7 38.5 C 40.3 38 41.1 37.4 41.8 37.4 C 42.5 37.4 43.3 38 43.9 38.5 C 44.5 38.9 44.7 39.6 45.3 39.8 C 46 40.1 46.8 39.8 47.6 39.9 C 48.4 40 49.6 40.1 50 40.5 C 50.4 40.9 50.3 41.8 50.2 42.4 C 50.2 43.1 49.6 43.7 49.8 44.2 C 49.9 44.7 50.8 45.1 51.1 45.7 Z', from: 5 },
        { tone: 'light', d: 'M 43.9 43.6 C 43.7 44 43.3 44.2 43.1 44.6 C 43 45 43.1 45.4 43 45.8 C 42.8 46.2 42.6 46.8 42.2 47 C 41.8 47.2 41.1 47.2 40.5 47.2 C 40 47.2 39.5 46.9 39 46.9 C 38.5 46.9 38.1 47.2 37.5 47.2 C 37 47.2 36.3 47.2 35.9 47 C 35.5 46.8 35.3 46.2 35.1 45.8 C 35 45.4 35.1 45 35 44.6 C 34.8 44.2 34.4 44 34.2 43.6 C 34 43.2 33.7 42.6 33.9 42.3 C 34.1 41.9 34.7 41.6 35.1 41.4 C 35.6 41.1 36.1 41.1 36.5 40.9 C 36.9 40.7 37.1 40.2 37.5 40 C 38 39.7 38.5 39.4 39 39.4 C 39.5 39.4 40.1 39.7 40.5 40 C 41 40.2 41.1 40.7 41.6 40.9 C 42 41.1 42.5 41.1 43 41.4 C 43.4 41.6 44 41.9 44.2 42.3 C 44.3 42.6 44.1 43.2 43.9 43.6 Z', from: 5 },
        { tone: 'deep', d: 'M 44.4 38 C 44.4 38.8 43 39.7 42.2 40.3 C 41.4 41 40 41.3 39.6 42 C 39.2 42.8 39.9 43.8 39.9 44.7 C 39.8 45.6 40 47 39.3 47.5 C 38.6 48.1 36.8 47.9 35.6 48 C 34.4 48 33.2 47.5 32.2 47.8 C 31.3 48.1 30.9 49.2 30 49.8 C 29.2 50.4 28 51.4 27 51.4 C 26 51.4 24.8 50.4 24 49.8 C 23.1 49.2 22.7 48.1 21.8 47.8 C 20.8 47.5 19.6 48 18.4 48 C 17.2 47.9 15.4 48.1 14.7 47.5 C 14 47 14.2 45.6 14.1 44.7 C 14.1 43.8 14.8 42.8 14.4 42 C 14 41.3 12.6 41 11.8 40.3 C 11 39.7 9.6 38.8 9.6 38 C 9.6 37.2 11 36.3 11.8 35.7 C 12.6 35 14 34.7 14.4 34 C 14.8 33.2 14.1 32.2 14.1 31.3 C 14.2 30.4 14 29 14.7 28.5 C 15.4 27.9 17.2 28.1 18.4 28 C 19.6 28 20.8 28.5 21.8 28.2 C 22.7 27.9 23.1 26.8 24 26.2 C 24.8 25.6 26 24.6 27 24.6 C 28 24.6 29.2 25.6 30 26.2 C 30.9 26.8 31.3 27.9 32.2 28.2 C 33.2 28.5 34.4 28 35.6 28 C 36.8 28.1 38.6 27.9 39.3 28.5 C 40 29 39.8 30.4 39.9 31.3 C 39.9 32.2 39.2 33.2 39.6 34 C 40 34.7 41.4 35 42.2 35.7 C 43 36.3 44.4 37.2 44.4 38 Z', from: 5 },
        { tone: 'base', d: 'M 40 36.2 C 40 36.8 38.9 37.6 38.2 38.1 C 37.6 38.7 36.4 38.9 36.1 39.5 C 35.8 40.1 36.3 40.9 36.2 41.7 C 36.2 42.4 36.3 43.5 35.7 44 C 35.1 44.4 33.6 44.3 32.6 44.4 C 31.6 44.4 30.6 44 29.8 44.3 C 29 44.5 28.6 45.4 27.9 45.9 C 27.1 46.3 26.2 47.2 25.3 47.2 C 24.4 47.2 23.5 46.3 22.7 45.9 C 22 45.4 21.6 44.5 20.8 44.3 C 20 44 19 44.4 18 44.4 C 17 44.3 15.5 44.4 14.9 44 C 14.3 43.5 14.4 42.4 14.3 41.7 C 14.3 40.9 14.8 40.1 14.5 39.5 C 14.2 38.9 13 38.7 12.4 38.1 C 11.7 37.6 10.6 36.8 10.6 36.2 C 10.6 35.6 11.7 34.8 12.4 34.3 C 13 33.7 14.2 33.5 14.5 32.9 C 14.8 32.3 14.3 31.5 14.3 30.7 C 14.4 30 14.3 28.9 14.9 28.4 C 15.5 28 17 28.1 18 28 C 19 28 20 28.4 20.8 28.1 C 21.6 27.9 22 27 22.7 26.5 C 23.5 26.1 24.4 25.2 25.3 25.2 C 26.2 25.2 27.1 26.1 27.9 26.5 C 28.6 27 29 27.9 29.8 28.1 C 30.6 28.4 31.6 28 32.6 28 C 33.6 28.1 35.1 28 35.7 28.4 C 36.3 28.9 36.2 30 36.2 30.7 C 36.3 31.5 35.8 32.3 36.1 32.9 C 36.4 33.5 37.6 33.7 38.2 34.3 C 38.9 34.8 40 35.6 40 36.2 Z', from: 5 },
        { tone: 'light', d: 'M 27.5 33.4 C 27.5 33.9 27.9 34.3 28 34.7 C 28.1 35.2 28.3 35.9 28 36.2 C 27.7 36.6 26.8 36.8 26.2 37 C 25.7 37.2 25 37.1 24.5 37.3 C 24 37.6 23.7 38 23.2 38.3 C 22.7 38.6 22 39 21.4 39 C 20.8 39 20.2 38.6 19.7 38.3 C 19.1 38 18.9 37.6 18.4 37.3 C 17.9 37.1 17.2 37.2 16.6 37 C 16 36.8 15.2 36.6 14.9 36.2 C 14.6 35.9 14.8 35.2 14.8 34.7 C 14.9 34.3 15.3 33.9 15.3 33.4 C 15.3 33 14.9 32.6 14.8 32.1 C 14.8 31.7 14.6 31 14.9 30.6 C 15.2 30.3 16 30.1 16.6 29.9 C 17.2 29.7 17.9 29.8 18.4 29.5 C 18.9 29.3 19.1 28.9 19.7 28.6 C 20.2 28.3 20.8 27.9 21.4 27.9 C 22 27.9 22.7 28.3 23.2 28.6 C 23.7 28.9 24 29.3 24.5 29.5 C 25 29.8 25.7 29.7 26.2 29.9 C 26.8 30.1 27.7 30.3 28 30.6 C 28.3 31 28.1 31.7 28 32.1 C 27.9 32.6 27.5 33 27.5 33.4 Z', from: 5 },
        { tone: 'light', c: [13, 78, 1.4], from: 5 },
        { tone: 'light', c: [21, 84, 1.2], from: 5 },
        { tone: 'light', c: [46, 76, 1.3], from: 5 },
        { tone: 'light', c: [39, 86, 1.2], from: 5 },
        { tone: 'light', c: [30, 88, 1.1], from: 5 }
      ]
    },
    maple: {
      trunk: 'M 25.8 96 Q 27.9 80 27.2 64 L 32.8 64 Q 32.1 80 34.2 96 Z',
      trunkShort: 'M 27 96 Q 28.5 86 27.8 76 L 32.2 76 Q 31.5 86 33 96 Z',
      trunkTone: 'wood',
      blossoms: [[18, 44], [42, 43], [30, 25], [23, 53], [38, 52], [12, 50], [48, 49], [30, 38], [30, 60]],
      parts: [
        { tone: 'wood', d: 'M 27 96 Q 28.5 86 27.8 76 L 32.2 76 Q 31.5 86 33 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.8 86 30.2 76 L 32.2 76 Q 31.5 86 33 96 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 39.4 70 C 39.1 70.8 38.3 71.4 38 72.1 C 37.7 72.8 37.9 73.7 37.6 74.4 C 37.3 75.2 36.9 76.2 36.1 76.7 C 35.3 77.1 33.9 77.1 32.9 77.2 C 31.9 77.2 31 76.8 30 76.8 C 29 76.8 28.1 77.2 27.1 77.2 C 26.1 77.1 24.7 77.1 23.9 76.7 C 23.1 76.2 22.7 75.2 22.4 74.4 C 22.1 73.7 22.3 72.8 22 72.1 C 21.7 71.4 20.9 70.8 20.6 70 C 20.3 69.2 19.9 68.2 20.2 67.4 C 20.5 66.7 21.6 66.1 22.4 65.6 C 23.2 65.1 24.2 65 25 64.5 C 25.8 64.1 26.3 63.3 27.1 62.8 C 27.9 62.4 29 61.7 30 61.7 C 31 61.7 32.1 62.4 32.9 62.8 C 33.7 63.3 34.2 64.1 35 64.5 C 35.8 65 36.8 65.1 37.6 65.6 C 38.4 66.1 39.5 66.7 39.8 67.4 C 40.1 68.2 39.7 69.2 39.4 70 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 36 68.7 C 35.8 69.3 35.2 69.7 35 70.3 C 34.7 70.8 34.9 71.4 34.6 72 C 34.4 72.6 34.1 73.4 33.5 73.7 C 32.9 74 31.8 74 31 74 C 30.2 74.1 29.5 73.8 28.8 73.8 C 28.1 73.8 27.4 74.1 26.6 74 C 25.8 74 24.7 74 24.1 73.7 C 23.5 73.4 23.2 72.6 23 72 C 22.7 71.4 22.9 70.8 22.6 70.3 C 22.4 69.7 21.8 69.3 21.6 68.7 C 21.4 68.1 21 67.4 21.3 66.8 C 21.5 66.3 22.4 65.8 23 65.4 C 23.6 65.1 24.4 65 25 64.6 C 25.6 64.3 25.9 63.7 26.6 63.4 C 27.2 63 28.1 62.6 28.8 62.6 C 29.5 62.6 30.4 63 31 63.4 C 31.7 63.7 32 64.3 32.6 64.6 C 33.2 65 34 65.1 34.6 65.4 C 35.2 65.8 36.1 66.3 36.3 66.8 C 36.6 67.4 36.2 68.1 36 68.7 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 21 62.5 C 21.5 62 23.5 62.9 24.2 62.5 C 25 62.2 25.3 60.5 25.7 60.6 C 26.1 60.7 25.9 62.8 26.6 63.3 C 27.3 63.8 29.5 63.1 29.7 63.5 C 30 63.9 28.3 64.9 28.3 65.8 C 28.3 66.6 30 68.2 29.9 68.7 C 29.8 69.2 27.9 68.2 27.5 68.7 C 27 69.2 27.7 71.3 27.2 71.5 C 26.6 71.6 25.1 69.9 24.2 69.8 C 23.4 69.8 22.4 71.6 22 71.3 C 21.6 71 22.2 68.8 21.7 68.1 C 21.2 67.5 19.2 67.6 19.1 67.2 C 18.9 66.9 20.7 66.6 21 65.8 C 21.3 65 20.5 63.1 21 62.5 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 21.2 62.7 C 21.6 62.2 23.1 62.9 23.8 62.7 C 24.4 62.4 24.6 61 25 61.1 C 25.3 61.2 25.1 62.9 25.7 63.3 C 26.2 63.6 28 63.1 28.2 63.4 C 28.5 63.8 27 64.6 27.1 65.3 C 27.1 66 28.5 67.3 28.4 67.7 C 28.3 68 26.8 67.3 26.4 67.7 C 26 68 26.6 69.7 26.1 69.9 C 25.7 70 24.5 68.6 23.8 68.6 C 23.1 68.6 22.3 70 21.9 69.8 C 21.6 69.5 22.1 67.7 21.7 67.2 C 21.4 66.6 19.7 66.8 19.6 66.5 C 19.5 66.2 20.9 65.9 21.2 65.3 C 21.4 64.7 20.7 63.1 21.2 62.7 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 39 62.5 C 39.5 63.1 38.7 65 39 65.8 C 39.3 66.6 41.1 66.9 40.9 67.2 C 40.8 67.6 38.8 67.5 38.3 68.1 C 37.8 68.8 38.4 71 38 71.3 C 37.6 71.6 36.6 69.8 35.8 69.8 C 34.9 69.9 33.3 71.6 32.8 71.5 C 32.4 71.3 33.3 69.5 32.8 69 C 32.4 68.6 30.3 69.2 30.1 68.7 C 29.9 68.2 31.7 66.6 31.7 65.8 C 31.7 64.9 30 63.9 30.3 63.5 C 30.5 63.1 32.7 63.8 33.4 63.3 C 34.1 62.8 33.9 60.7 34.3 60.6 C 34.7 60.5 35 62.2 35.8 62.5 C 36.5 62.9 38.5 62 39 62.5 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 37.6 62.7 C 38.1 63.1 37.4 64.7 37.6 65.3 C 37.9 65.9 39.3 66.2 39.2 66.5 C 39.1 66.8 37.4 66.6 37 67.2 C 36.6 67.7 37.2 69.5 36.8 69.8 C 36.5 70 35.7 68.6 35 68.6 C 34.3 68.6 33 70 32.6 69.9 C 32.2 69.8 33 68.3 32.6 67.9 C 32.3 67.5 30.6 68.1 30.4 67.7 C 30.2 67.2 31.7 66 31.7 65.3 C 31.7 64.6 30.3 63.8 30.5 63.4 C 30.8 63.1 32.5 63.6 33.1 63.3 C 33.6 62.9 33.5 61.2 33.8 61.1 C 34.1 61 34.4 62.4 35 62.7 C 35.6 62.9 37.2 62.2 37.6 62.7 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 39 77.5 C 38.5 78 36.5 77.1 35.8 77.5 C 35 77.8 34.7 79.5 34.3 79.4 C 33.9 79.3 34.1 77.2 33.4 76.7 C 32.7 76.2 30.5 76.9 30.3 76.5 C 30 76.1 31.7 75.1 31.7 74.2 C 31.7 73.4 30 71.8 30.1 71.3 C 30.2 70.8 32.1 71.8 32.5 71.3 C 33 70.8 32.3 68.7 32.8 68.5 C 33.4 68.4 34.9 70.1 35.8 70.2 C 36.6 70.2 37.6 68.4 38 68.7 C 38.4 69 37.8 71.2 38.3 71.9 C 38.8 72.5 40.8 72.4 40.9 72.8 C 41.1 73.1 39.3 73.4 39 74.2 C 38.7 75 39.5 76.9 39 77.5 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 37.6 76 C 37.2 76.5 35.6 75.8 35 76 C 34.4 76.3 34.1 77.7 33.8 77.6 C 33.5 77.5 33.6 75.8 33.1 75.4 C 32.5 75.1 30.8 75.6 30.5 75.3 C 30.3 74.9 31.7 74.1 31.7 73.4 C 31.7 72.7 30.3 71.4 30.4 71 C 30.5 70.7 32 71.4 32.4 71 C 32.7 70.7 32.2 69 32.6 68.8 C 33.1 68.7 34.3 70.1 35 70.1 C 35.7 70.2 36.5 68.7 36.8 68.9 C 37.2 69.2 36.6 71 37 71.5 C 37.4 72.1 39.1 71.9 39.2 72.2 C 39.3 72.5 37.9 72.8 37.6 73.4 C 37.4 74 38.1 75.6 37.6 76 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 21 77.5 C 20.5 76.9 21.3 75 21 74.2 C 20.7 73.4 18.9 73.1 19.1 72.8 C 19.2 72.4 21.2 72.5 21.7 71.9 C 22.2 71.2 21.6 69 22 68.7 C 22.4 68.4 23.4 70.2 24.2 70.2 C 25.1 70.1 26.7 68.4 27.2 68.5 C 27.6 68.7 26.7 70.5 27.2 71 C 27.6 71.4 29.7 70.8 29.9 71.3 C 30.1 71.8 28.3 73.4 28.3 74.2 C 28.3 75.1 30 76.1 29.7 76.5 C 29.5 76.9 27.3 76.2 26.6 76.7 C 25.9 77.2 26.1 79.3 25.7 79.4 C 25.3 79.5 25 77.8 24.2 77.5 C 23.5 77.1 21.5 78 21 77.5 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 21.2 76 C 20.7 75.6 21.4 74 21.2 73.4 C 20.9 72.8 19.5 72.5 19.6 72.2 C 19.7 71.9 21.4 72.1 21.7 71.5 C 22.1 71 21.6 69.2 21.9 68.9 C 22.3 68.7 23.1 70.2 23.8 70.1 C 24.5 70.1 25.8 68.7 26.1 68.8 C 26.5 68.9 25.8 70.4 26.1 70.8 C 26.5 71.2 28.2 70.6 28.4 71 C 28.5 71.5 27.1 72.7 27.1 73.4 C 27 74.1 28.5 74.9 28.2 75.3 C 28 75.6 26.2 75.1 25.7 75.4 C 25.1 75.8 25.3 77.5 25 77.6 C 24.6 77.7 24.4 76.3 23.8 76 C 23.1 75.8 21.6 76.5 21.2 76 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 25.8 96 Q 27.9 80 27.2 64 L 32.8 64 Q 32.1 80 34.2 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.8 96 Q 31.2 80 30.3 64 L 32.8 64 Q 32.1 80 34.2 96 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 42.7 56 C 42.3 57.1 41.3 57.9 40.9 58.9 C 40.5 59.9 40.7 61 40.3 62.1 C 39.8 63.1 39.3 64.6 38.2 65.2 C 37.1 65.8 35.3 65.8 33.9 65.8 C 32.6 65.9 31.3 65.3 30 65.3 C 28.7 65.3 27.4 65.9 26.1 65.8 C 24.7 65.8 22.9 65.8 21.8 65.2 C 20.7 64.6 20.2 63.1 19.7 62.1 C 19.3 61 19.5 59.9 19.1 58.9 C 18.7 57.9 17.7 57.1 17.3 56 C 16.9 54.9 16.3 53.5 16.7 52.5 C 17.1 51.5 18.6 50.6 19.7 49.9 C 20.8 49.3 22.2 49.1 23.3 48.5 C 24.3 47.8 25 46.8 26.1 46.2 C 27.2 45.5 28.7 44.6 30 44.6 C 31.3 44.6 32.8 45.5 33.9 46.2 C 35 46.8 35.7 47.8 36.7 48.5 C 37.8 49.1 39.2 49.3 40.3 49.9 C 41.4 50.6 42.9 51.5 43.3 52.5 C 43.7 53.5 43.1 54.9 42.7 56 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 38.1 54.2 C 37.8 55 37 55.6 36.7 56.4 C 36.4 57.1 36.6 58 36.2 58.8 C 35.9 59.6 35.5 60.6 34.7 61.1 C 33.9 61.6 32.4 61.6 31.4 61.6 C 30.3 61.6 29.4 61.2 28.4 61.2 C 27.4 61.2 26.4 61.6 25.4 61.6 C 24.3 61.6 22.9 61.6 22.1 61.1 C 21.3 60.6 20.9 59.6 20.5 58.8 C 20.2 58 20.4 57.1 20.1 56.4 C 19.8 55.6 19 55 18.7 54.2 C 18.4 53.4 17.9 52.4 18.2 51.6 C 18.5 50.9 19.7 50.2 20.5 49.7 C 21.4 49.2 22.4 49.1 23.2 48.6 C 24 48.2 24.5 47.4 25.4 46.9 C 26.2 46.4 27.4 45.8 28.4 45.8 C 29.4 45.8 30.5 46.4 31.4 46.9 C 32.2 47.4 32.7 48.2 33.5 48.6 C 34.3 49.1 35.4 49.2 36.2 49.7 C 37.1 50.2 38.2 50.9 38.5 51.6 C 38.9 52.4 38.4 53.4 38.1 54.2 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 16.7 48 C 17.2 47.2 19.7 47.9 20.6 47.4 C 21.5 46.8 21.5 44.7 22 44.8 C 22.5 44.8 22.7 47.3 23.6 47.8 C 24.5 48.3 27 47 27.4 47.5 C 27.9 47.9 25.9 49.5 26.1 50.5 C 26.3 51.5 28.7 53.1 28.6 53.7 C 28.6 54.3 26.2 53.5 25.7 54.2 C 25.2 54.8 26.4 57.2 25.8 57.6 C 25.2 57.9 23 56 22 56.2 C 20.9 56.3 20.1 58.6 19.5 58.4 C 19 58.1 19.4 55.3 18.6 54.6 C 17.9 53.9 15.5 54.5 15.2 54 C 15 53.6 17.1 52.9 17.3 51.9 C 17.6 50.9 16.1 48.8 16.7 48 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 17 48 C 17.5 47.4 19.5 47.9 20.2 47.5 C 20.9 47 20.9 45.3 21.3 45.3 C 21.7 45.4 21.9 47.5 22.6 47.8 C 23.3 48.2 25.4 47.2 25.7 47.6 C 26.1 47.9 24.5 49.2 24.7 50 C 24.8 50.9 26.7 52.1 26.7 52.6 C 26.6 53.1 24.7 52.5 24.3 53 C 23.9 53.5 24.9 55.5 24.4 55.7 C 23.9 56 22.2 54.5 21.3 54.6 C 20.5 54.7 19.8 56.6 19.3 56.4 C 18.9 56.2 19.2 53.9 18.6 53.3 C 18 52.8 16 53.2 15.8 52.9 C 15.7 52.5 17.3 52 17.5 51.1 C 17.7 50.3 16.6 48.6 17 48 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 35.1 43 C 36 43.3 36.1 45.9 36.9 46.6 C 37.7 47.2 39.7 46.6 39.8 47.1 C 39.9 47.6 37.5 48.5 37.4 49.5 C 37.2 50.5 39.2 52.6 38.9 53.1 C 38.6 53.6 36.5 52.3 35.6 52.8 C 34.7 53.3 33.9 56 33.3 56.2 C 32.7 56.3 32.7 53.8 32 53.5 C 31.2 53.3 29.3 55.2 28.8 54.7 C 28.3 54.2 29.4 51.6 28.9 50.6 C 28.5 49.7 26 49.6 26.1 49 C 26.2 48.3 28.9 47.8 29.4 46.9 C 29.9 46 28.5 43.9 28.9 43.5 C 29.2 43.2 30.5 44.9 31.6 44.8 C 32.6 44.8 34.2 42.8 35.1 43 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 33.9 43.5 C 34.6 43.7 34.7 45.8 35.4 46.4 C 36 46.9 37.7 46.4 37.8 46.8 C 37.8 47.2 35.9 48 35.8 48.8 C 35.7 49.6 37.2 51.2 37 51.7 C 36.8 52.1 35.1 51 34.3 51.4 C 33.6 51.8 33 54 32.5 54.1 C 32 54.2 32 52.2 31.4 52 C 30.8 51.8 29.2 53.3 28.8 53 C 28.4 52.6 29.3 50.4 28.9 49.7 C 28.6 48.9 26.6 48.8 26.6 48.3 C 26.7 47.8 28.9 47.4 29.3 46.7 C 29.7 45.9 28.6 44.2 28.9 43.9 C 29.2 43.6 30.2 45 31.1 45 C 31.9 44.9 33.2 43.3 33.9 43.5 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 46.4 56 C 46.4 56.9 44 57.8 43.6 58.8 C 43.3 59.8 44.5 61.5 44.1 61.7 C 43.6 62 42 60 41 60.2 C 40 60.4 38.7 62.8 38.1 62.7 C 37.4 62.6 38.1 60.2 37.4 59.5 C 36.6 58.8 33.7 58.9 33.4 58.4 C 33.1 57.8 35.5 57.1 35.5 56.3 C 35.5 55.5 33.1 54.3 33.4 53.6 C 33.7 53 36.6 53.2 37.4 52.5 C 38.1 51.8 37.4 49.4 38.1 49.3 C 38.7 49.2 40 51.6 41 51.8 C 42 52 43.6 50 44.1 50.3 C 44.5 50.5 43.3 52.2 43.6 53.2 C 44 54.2 46.4 55.1 46.4 56 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 44.4 55.2 C 44.4 56 42.4 56.7 42.1 57.5 C 41.8 58.3 42.8 59.7 42.4 59.9 C 42.1 60.1 40.8 58.5 40 58.6 C 39.1 58.7 38.1 60.8 37.6 60.7 C 37.1 60.6 37.6 58.6 37 58 C 36.4 57.5 34.1 57.6 33.8 57.1 C 33.6 56.7 35.5 56.1 35.5 55.4 C 35.5 54.8 33.6 53.8 33.8 53.3 C 34.1 52.8 36.4 53 37 52.4 C 37.6 51.8 37.1 49.9 37.6 49.8 C 38.1 49.7 39.1 51.7 40 51.8 C 40.8 51.9 42.1 50.4 42.4 50.6 C 42.8 50.7 41.8 52.2 42.1 52.9 C 42.4 53.7 44.4 54.4 44.4 55.2 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 35.1 69 C 34.2 69.2 32.6 67.2 31.6 67.2 C 30.5 67.1 29.2 68.8 28.9 68.5 C 28.5 68.1 29.9 66 29.4 65.1 C 28.9 64.2 26.2 63.7 26.1 63 C 26 62.4 28.5 62.3 28.9 61.4 C 29.4 60.4 28.4 57.8 28.8 57.3 C 29.2 56.9 30.7 58.9 31.4 58.7 C 32.2 58.4 32.6 55.7 33.3 55.8 C 34 55.9 34.7 58.7 35.6 59.2 C 36.5 59.7 38.6 58.4 38.9 58.9 C 39.2 59.4 37.2 61.5 37.4 62.5 C 37.5 63.5 39.9 64.4 39.8 64.9 C 39.7 65.4 37.7 64.8 36.9 65.4 C 36.1 66.1 36 68.7 35.1 69 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 33.9 66.9 C 33.2 67.1 31.9 65.5 31.1 65.4 C 30.2 65.4 29.2 66.8 28.9 66.5 C 28.6 66.2 29.7 64.5 29.3 63.7 C 28.9 63 26.7 62.6 26.6 62.1 C 26.6 61.6 28.6 61.5 28.9 60.8 C 29.3 60 28.5 57.8 28.8 57.5 C 29.2 57.1 30.4 58.8 31 58.6 C 31.6 58.4 31.9 56.2 32.5 56.3 C 33.1 56.3 33.6 58.6 34.3 59 C 35.1 59.4 36.8 58.3 37 58.7 C 37.2 59.2 35.7 60.8 35.8 61.6 C 35.9 62.5 37.8 63.2 37.8 63.6 C 37.7 64 36 63.5 35.4 64 C 34.7 64.6 34.6 66.7 33.9 66.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 16.7 64 C 16.1 63.2 17.6 61.1 17.3 60.1 C 17.1 59.1 15 58.4 15.2 58 C 15.5 57.5 17.9 58.1 18.6 57.4 C 19.4 56.7 19 53.9 19.5 53.6 C 20.1 53.4 20.9 55.7 22 55.8 C 23 56 25.3 54.2 25.8 54.4 C 26.4 54.7 24.9 56.7 25.4 57.4 C 25.8 58 28.5 57.6 28.6 58.3 C 28.7 59 26.3 60.5 26.1 61.5 C 25.9 62.5 27.9 64.1 27.4 64.5 C 27 65 24.5 63.7 23.6 64.2 C 22.7 64.7 22.5 67.2 22 67.2 C 21.5 67.3 21.5 65.2 20.6 64.6 C 19.7 64.1 17.2 64.8 16.7 64 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 17 62.4 C 16.6 61.8 17.7 60.1 17.5 59.3 C 17.3 58.4 15.7 57.9 15.8 57.5 C 16 57.2 18 57.7 18.6 57.1 C 19.2 56.5 18.9 54.2 19.3 54 C 19.8 53.8 20.5 55.7 21.3 55.8 C 22.2 55.9 24 54.5 24.4 54.7 C 24.9 54.9 23.7 56.5 24 57 C 24.4 57.6 26.6 57.2 26.7 57.8 C 26.8 58.3 24.8 59.6 24.7 60.4 C 24.5 61.2 26.1 62.5 25.7 62.8 C 25.4 63.2 23.3 62.2 22.6 62.6 C 21.9 63 21.7 65 21.3 65.1 C 20.9 65.1 20.9 63.4 20.2 62.9 C 19.5 62.5 17.5 63 17 62.4 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 25 96 Q 27.5 77 26.8 58 L 33.2 58 Q 32.5 77 35 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.9 96 Q 31.4 77 30.3 58 L 33.2 58 Q 32.5 77 35 96 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 29.1 63.2 Q 25.2 57.7 19.5 54.6 L 20.5 53.4 Q 26.7 55.9 30.9 60.8 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 29.1 60.8 Q 33.9 56.9 39.5 54.3 L 40.5 55.7 Q 35.2 58.7 30.9 63.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 45.5 45 C 45 46.3 43.8 47.3 43.3 48.5 C 42.8 49.8 43.1 51.2 42.5 52.5 C 42 53.8 41.3 55.5 40 56.3 C 38.7 57.1 36.5 57 34.8 57.1 C 33.1 57.1 31.6 56.4 30 56.4 C 28.4 56.4 26.9 57.1 25.2 57.1 C 23.5 57 21.3 57.1 20 56.3 C 18.7 55.5 18 53.8 17.5 52.5 C 16.9 51.2 17.2 49.8 16.7 48.5 C 16.2 47.3 15 46.3 14.5 45 C 14 43.7 13.3 41.9 13.8 40.7 C 14.3 39.4 16.1 38.4 17.5 37.5 C 18.8 36.7 20.5 36.5 21.8 35.8 C 23.1 35 23.8 33.7 25.2 32.9 C 26.6 32.1 28.4 31 30 31 C 31.6 31 33.4 32.1 34.8 32.9 C 36.2 33.7 36.9 35 38.2 35.8 C 39.5 36.5 41.2 36.7 42.5 37.5 C 43.9 38.4 45.7 39.4 46.2 40.7 C 46.7 41.9 46 43.7 45.5 45 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 39.9 42.8 C 39.5 43.8 38.6 44.5 38.2 45.5 C 37.8 46.4 38 47.4 37.6 48.4 C 37.2 49.4 36.7 50.7 35.7 51.2 C 34.7 51.8 33 51.8 31.7 51.8 C 30.4 51.8 29.2 51.3 28 51.3 C 26.8 51.3 25.6 51.8 24.3 51.8 C 23.1 51.8 21.3 51.8 20.3 51.2 C 19.3 50.7 18.8 49.4 18.4 48.4 C 18 47.4 18.2 46.4 17.9 45.5 C 17.5 44.5 16.5 43.8 16.1 42.8 C 15.8 41.9 15.2 40.6 15.6 39.6 C 16 38.7 17.4 37.9 18.4 37.3 C 19.4 36.7 20.7 36.5 21.7 36 C 22.7 35.4 23.3 34.4 24.3 33.9 C 25.4 33.3 26.8 32.4 28 32.4 C 29.2 32.4 30.6 33.3 31.7 33.9 C 32.7 34.4 33.3 35.4 34.3 36 C 35.3 36.5 36.6 36.7 37.6 37.3 C 38.7 37.9 40.1 38.7 40.4 39.6 C 40.8 40.6 40.3 41.9 39.9 42.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 13 36.9 C 13.6 36 16.5 36.5 17.4 35.7 C 18.4 35 18.1 32.5 18.7 32.6 C 19.3 32.6 19.8 35.4 20.9 35.9 C 22 36.3 24.7 34.6 25.3 35 C 25.8 35.5 23.8 37.5 24.1 38.7 C 24.5 39.8 27.4 41.3 27.4 42 C 27.4 42.7 24.5 42.1 24.1 42.9 C 23.6 43.7 25.3 46.3 24.6 46.8 C 24 47.2 21.3 45.4 20.1 45.6 C 18.9 45.9 18.2 48.7 17.5 48.4 C 16.9 48.2 17 45 16 44.2 C 15.1 43.5 12.4 44.5 12.1 44 C 11.8 43.5 14 42.5 14.2 41.3 C 14.4 40.1 12.5 37.8 13 36.9 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 13.5 36.8 C 13.9 36 16.3 36.4 17 35.8 C 17.8 35.2 17.6 33.2 18.1 33.2 C 18.5 33.2 19 35.6 19.9 35.9 C 20.7 36.2 23 34.9 23.4 35.2 C 23.8 35.6 22.2 37.2 22.5 38.2 C 22.8 39.1 25.1 40.3 25.1 40.9 C 25.1 41.5 22.8 41 22.4 41.6 C 22.1 42.3 23.4 44.4 22.9 44.8 C 22.4 45.1 20.2 43.6 19.2 43.8 C 18.2 44.1 17.7 46.3 17.1 46.1 C 16.6 45.9 16.7 43.3 15.9 42.7 C 15.2 42.1 13 42.9 12.7 42.5 C 12.5 42.1 14.3 41.3 14.4 40.3 C 14.6 39.4 13 37.5 13.5 36.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30 28.8 C 31.1 28.8 32.1 31.6 33.2 32 C 34.3 32.5 36.3 31 36.6 31.6 C 36.9 32.1 34.6 33.9 34.8 35.1 C 35 36.3 37.9 37.8 37.7 38.5 C 37.6 39.2 34.9 38.4 34 39.3 C 33.2 40.2 33.4 43.5 32.7 43.8 C 32.1 44.2 31.2 41.4 30.3 41.4 C 29.4 41.4 28 44.2 27.3 43.8 C 26.5 43.5 26.8 40.2 26 39.3 C 25.1 38.4 22.4 39.2 22.3 38.5 C 22.1 37.8 25 36.3 25.2 35.1 C 25.4 33.9 23.1 32.1 23.4 31.6 C 23.7 31 25.7 32.5 26.8 32 C 27.9 31.6 28.9 28.8 30 28.8 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.1 29.4 C 30 29.4 30.9 31.7 31.8 32 C 32.6 32.4 34.3 31.2 34.5 31.6 C 34.7 32.1 32.9 33.6 33.1 34.5 C 33.2 35.5 35.5 36.7 35.4 37.3 C 35.3 37.8 33.1 37.2 32.4 37.9 C 31.7 38.6 31.9 41.3 31.4 41.6 C 30.9 41.9 30.1 39.6 29.4 39.6 C 28.7 39.6 27.5 41.9 26.9 41.6 C 26.3 41.3 26.5 38.6 25.9 37.9 C 25.2 37.2 23 37.8 22.9 37.3 C 22.8 36.7 25.1 35.5 25.2 34.5 C 25.4 33.6 23.6 32.1 23.8 31.6 C 24 31.2 25.6 32.4 26.5 32 C 27.4 31.7 28.3 29.4 29.1 29.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 47 36.9 C 47.5 37.8 45.6 40.1 45.8 41.3 C 46 42.5 48.2 43.5 47.9 44 C 47.6 44.5 44.9 43.5 44 44.2 C 43 45 43.1 48.2 42.5 48.4 C 41.8 48.7 41.1 45.9 39.9 45.6 C 38.7 45.4 36 47.1 35.4 46.8 C 34.8 46.4 36.7 44.3 36.3 43.5 C 35.8 42.7 32.7 42.8 32.6 42 C 32.6 41.2 35.5 39.8 35.9 38.7 C 36.2 37.5 34.2 35.5 34.7 35 C 35.3 34.6 38 36.3 39.1 35.9 C 40.2 35.4 40.7 32.6 41.3 32.6 C 41.9 32.5 41.6 35 42.6 35.7 C 43.5 36.5 46.4 36 47 36.9 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 44.8 36.8 C 45.2 37.5 43.7 39.4 43.8 40.3 C 44 41.3 45.8 42.1 45.6 42.5 C 45.3 42.9 43.1 42.1 42.3 42.7 C 41.6 43.3 41.7 45.9 41.1 46.1 C 40.6 46.3 40 44.1 39.1 43.8 C 38.1 43.6 35.9 45.1 35.4 44.8 C 34.9 44.5 36.5 42.7 36.1 42.1 C 35.7 41.4 33.2 41.6 33.2 40.9 C 33.1 40.3 35.5 39.1 35.8 38.2 C 36.1 37.2 34.4 35.6 34.9 35.2 C 35.3 34.9 37.5 36.2 38.4 35.9 C 39.3 35.6 39.7 33.2 40.2 33.2 C 40.7 33.2 40.5 35.2 41.2 35.8 C 42 36.4 44.4 36 44.8 36.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 47 53.1 C 46.4 54 43.5 53.5 42.6 54.3 C 41.6 55 41.9 57.5 41.3 57.4 C 40.7 57.4 40.2 54.6 39.1 54.1 C 38 53.7 35.3 55.4 34.7 55 C 34.2 54.5 36.2 52.5 35.9 51.3 C 35.5 50.2 32.6 48.7 32.6 48 C 32.6 47.3 35.5 47.9 35.9 47.1 C 36.4 46.3 34.7 43.7 35.4 43.2 C 36 42.8 38.7 44.6 39.9 44.4 C 41.1 44.1 41.8 41.3 42.5 41.6 C 43.1 41.8 43 45 44 45.8 C 44.9 46.5 47.6 45.5 47.9 46 C 48.2 46.5 46 47.5 45.8 48.7 C 45.6 49.9 47.5 52.2 47 53.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 44.8 51.4 C 44.4 52.2 42 51.8 41.2 52.4 C 40.5 53 40.7 55 40.2 54.9 C 39.7 54.9 39.3 52.6 38.4 52.3 C 37.5 51.9 35.3 53.3 34.9 52.9 C 34.4 52.6 36.1 50.9 35.8 50 C 35.5 49.1 33.2 47.8 33.2 47.3 C 33.2 46.7 35.5 47.2 35.8 46.5 C 36.2 45.9 34.8 43.8 35.4 43.4 C 35.9 43 38.1 44.6 39.1 44.3 C 40 44.1 40.6 41.9 41.1 42.1 C 41.7 42.3 41.6 44.9 42.3 45.5 C 43.1 46.1 45.3 45.3 45.6 45.7 C 45.8 46.1 44 46.9 43.8 47.8 C 43.7 48.8 45.2 50.7 44.8 51.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30 61.2 C 28.9 61.2 27.9 58.4 26.8 58 C 25.7 57.5 23.7 59 23.4 58.4 C 23.1 57.9 25.4 56.1 25.2 54.9 C 25 53.7 22.1 52.2 22.3 51.5 C 22.4 50.8 25.1 51.6 26 50.7 C 26.8 49.8 26.6 46.5 27.3 46.2 C 27.9 45.8 28.8 48.6 29.7 48.6 C 30.6 48.6 32 45.8 32.7 46.2 C 33.5 46.5 33.2 49.8 34 50.7 C 34.9 51.6 37.6 50.8 37.7 51.5 C 37.9 52.2 35 53.7 34.8 54.9 C 34.6 56.1 36.9 57.9 36.6 58.4 C 36.3 59 34.3 57.5 33.2 58 C 32.1 58.4 31.1 61.2 30 61.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 29.1 58.7 C 28.3 58.7 27.4 56.5 26.5 56.1 C 25.6 55.8 24 56.9 23.8 56.5 C 23.6 56.1 25.4 54.6 25.2 53.7 C 25.1 52.7 22.8 51.5 22.9 50.9 C 23 50.3 25.2 51 25.9 50.3 C 26.5 49.5 26.4 46.9 26.9 46.6 C 27.4 46.3 28.1 48.6 28.9 48.6 C 29.6 48.6 30.8 46.3 31.4 46.6 C 32 46.9 31.7 49.5 32.4 50.3 C 33.1 51 35.3 50.3 35.4 50.9 C 35.5 51.5 33.2 52.7 33.1 53.7 C 32.9 54.6 34.7 56.1 34.5 56.5 C 34.3 56.9 32.6 55.8 31.8 56.1 C 30.9 56.5 30 58.7 29.1 58.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 13 53.1 C 12.5 52.2 14.4 49.9 14.2 48.7 C 14 47.5 11.8 46.5 12.1 46 C 12.4 45.5 15.1 46.5 16 45.8 C 17 45 16.9 41.8 17.5 41.6 C 18.2 41.3 18.9 44.1 20.1 44.4 C 21.3 44.6 24 42.9 24.6 43.2 C 25.2 43.6 23.3 45.7 23.7 46.5 C 24.2 47.3 27.3 47.2 27.4 48 C 27.4 48.8 24.5 50.2 24.1 51.3 C 23.8 52.5 25.8 54.5 25.3 55 C 24.7 55.4 22 53.7 20.9 54.1 C 19.8 54.6 19.3 57.4 18.7 57.4 C 18.1 57.5 18.4 55 17.4 54.3 C 16.5 53.5 13.6 54 13 53.1 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 13.5 51.4 C 13 50.7 14.6 48.8 14.4 47.8 C 14.3 46.9 12.5 46.1 12.7 45.7 C 13 45.3 15.2 46.1 15.9 45.5 C 16.7 44.9 16.6 42.3 17.1 42.1 C 17.7 41.9 18.2 44.1 19.2 44.3 C 20.2 44.6 22.4 43.1 22.9 43.4 C 23.4 43.7 21.8 45.5 22.2 46.1 C 22.5 46.7 25.1 46.6 25.1 47.3 C 25.2 47.9 22.8 49.1 22.5 50 C 22.2 50.9 23.8 52.6 23.4 52.9 C 23 53.3 20.7 51.9 19.9 52.3 C 19 52.6 18.5 54.9 18.1 54.9 C 17.6 55 17.8 53 17 52.4 C 16.3 51.8 13.9 52.2 13.5 51.4 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 24.4 96 Q 27.2 75 26.6 54 L 33.4 54 Q 32.8 75 35.6 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 31 96 Q 31.6 75 30.3 54 L 33.4 54 Q 32.8 75 35.6 96 Z', from: 5 },
        { tone: 'wood', d: 'M 29 59.4 Q 24.8 53.6 18.5 50.7 L 19.5 49.3 Q 26.3 51.5 31 56.6 Z', from: 5 },
        { tone: 'wood', d: 'M 29.1 56.6 Q 34.3 52.6 40.5 50.2 L 41.5 51.8 Q 35.7 54.8 30.9 59.4 Z', from: 5 },
        { tone: 'deep', d: 'M 47.9 38 C 47.3 39.5 45.9 40.7 45.3 42.2 C 44.7 43.7 45.1 45.3 44.4 46.8 C 43.8 48.4 43 50.5 41.5 51.4 C 40.1 52.3 37.4 52.3 35.5 52.3 C 33.6 52.3 31.8 51.5 30 51.5 C 28.2 51.5 26.4 52.3 24.5 52.3 C 22.6 52.3 19.9 52.3 18.5 51.4 C 17 50.5 16.2 48.4 15.6 46.8 C 14.9 45.3 15.3 43.7 14.7 42.2 C 14.1 40.7 12.7 39.5 12.1 38 C 11.6 36.5 10.7 34.4 11.3 32.9 C 11.9 31.4 14 30.1 15.6 29.2 C 17.1 28.2 19.1 28 20.6 27 C 22 26.1 22.9 24.6 24.5 23.7 C 26.1 22.8 28.2 21.5 30 21.5 C 31.8 21.5 33.9 22.8 35.5 23.7 C 37.1 24.6 38 26.1 39.4 27 C 40.9 28 42.9 28.2 44.4 29.2 C 46 30.1 48.1 31.4 48.7 32.9 C 49.3 34.4 48.4 36.5 47.9 38 Z', from: 5 },
        { tone: 'base', d: 'M 41.4 35.4 C 41 36.6 39.9 37.5 39.4 38.6 C 39 39.7 39.3 40.9 38.8 42 C 38.3 43.2 37.7 44.7 36.6 45.4 C 35.4 46.1 33.4 46.1 31.9 46.1 C 30.5 46.1 29.1 45.5 27.7 45.5 C 26.3 45.5 25 46.1 23.5 46.1 C 22 46.1 20 46.1 18.9 45.4 C 17.7 44.7 17.1 43.2 16.7 42 C 16.2 40.9 16.4 39.7 16 38.6 C 15.6 37.5 14.5 36.6 14 35.4 C 13.6 34.3 13 32.7 13.4 31.6 C 13.8 30.5 15.5 29.6 16.7 28.9 C 17.8 28.1 19.3 28 20.5 27.3 C 21.6 26.6 22.3 25.5 23.5 24.8 C 24.7 24.1 26.3 23.1 27.7 23.1 C 29.1 23.1 30.7 24.1 31.9 24.8 C 33.2 25.5 33.8 26.6 35 27.3 C 36.1 28 37.6 28.1 38.8 28.9 C 40 29.6 41.6 30.5 42 31.6 C 42.5 32.7 41.8 34.3 41.4 35.4 Z', from: 5 },
        { tone: 'deep', d: 'M 9.8 29.9 C 10.3 28.8 13.7 29.1 14.7 28.2 C 15.7 27.3 15.2 24.5 15.8 24.5 C 16.5 24.5 17.3 27.6 18.6 28 C 19.9 28.4 22.8 26.2 23.5 26.7 C 24.1 27.2 22 29.6 22.5 30.9 C 23 32.2 26.4 33.6 26.4 34.4 C 26.5 35.2 23.2 34.8 22.8 35.7 C 22.3 36.6 24.4 39.4 23.7 40 C 23 40.6 19.8 38.7 18.5 39.1 C 17.2 39.5 16.6 42.7 15.9 42.5 C 15.1 42.3 14.9 38.6 13.8 37.9 C 12.8 37.1 9.7 38.5 9.4 37.9 C 9 37.4 11.4 36.1 11.5 34.7 C 11.6 33.4 9.3 31 9.8 29.9 Z', from: 5 },
        { tone: 'light', d: 'M 10.4 29.6 C 10.8 28.7 13.5 28.9 14.3 28.2 C 15.1 27.5 14.7 25.2 15.3 25.2 C 15.8 25.2 16.5 27.8 17.5 28.1 C 18.5 28.4 20.9 26.6 21.5 27 C 22 27.4 20.2 29.4 20.6 30.4 C 21 31.5 23.8 32.6 23.9 33.3 C 23.9 33.9 21.3 33.6 20.9 34.3 C 20.5 35.1 22.3 37.4 21.7 37.8 C 21.1 38.3 18.5 36.7 17.4 37.1 C 16.4 37.4 15.9 40 15.3 39.8 C 14.7 39.7 14.5 36.7 13.7 36.1 C 12.8 35.5 10.3 36.6 10 36.1 C 9.7 35.7 11.7 34.6 11.8 33.5 C 11.8 32.4 10 30.5 10.4 29.6 Z', from: 5 },
        { tone: 'deep', d: 'M 25 19.7 C 26.2 19.5 28 22.2 29.4 22.5 C 30.7 22.7 32.6 20.6 33 21.1 C 33.4 21.6 31.4 24.2 31.9 25.4 C 32.4 26.7 36 27.6 36 28.4 C 36 29.2 32.8 29.1 32.1 30.3 C 31.4 31.4 32.4 35 31.8 35.6 C 31.2 36.1 29.5 33.3 28.5 33.5 C 27.5 33.7 26.7 37.1 25.8 36.9 C 24.9 36.7 24.3 33.1 23.2 32.3 C 22.1 31.5 19.2 33.1 18.9 32.3 C 18.6 31.6 21.3 29.2 21.3 27.9 C 21.2 26.6 18.2 25 18.4 24.4 C 18.6 23.8 21.2 24.9 22.3 24.1 C 23.4 23.3 23.8 20 25 19.7 Z', from: 5 },
        { tone: 'light', d: 'M 24.4 20.4 C 25.4 20.1 26.9 22.4 28 22.6 C 29 22.8 30.5 21.1 30.9 21.5 C 31.2 21.9 29.6 24 30 25 C 30.4 26 33.3 26.8 33.3 27.4 C 33.3 28.1 30.7 28 30.2 28.9 C 29.6 29.9 30.4 32.8 29.9 33.2 C 29.5 33.7 28.1 31.4 27.3 31.5 C 26.5 31.7 25.8 34.5 25 34.3 C 24.3 34.2 23.9 31.2 23 30.6 C 22 29.9 19.7 31.2 19.5 30.6 C 19.2 30 21.4 28 21.4 27 C 21.3 25.9 18.9 24.7 19.1 24.2 C 19.2 23.7 21.3 24.5 22.2 23.9 C 23.1 23.3 23.5 20.6 24.4 20.4 Z', from: 5 },
        { tone: 'deep', d: 'M 44 23.3 C 44.9 24.1 43.9 27.3 44.6 28.5 C 45.2 29.6 48 29.8 47.9 30.4 C 47.8 31.1 44.5 31.2 43.8 32.3 C 43.2 33.5 44.6 36.8 44 37.4 C 43.4 37.9 41.5 35.3 40.2 35.4 C 38.8 35.6 36.6 38.7 35.8 38.5 C 35 38.4 36.2 35.3 35.4 34.7 C 34.6 34 31.4 35.5 31 34.7 C 30.6 33.8 33.1 31.1 33 29.8 C 32.9 28.4 29.9 27.2 30.3 26.4 C 30.7 25.7 34.3 26.4 35.3 25.5 C 36.2 24.6 35.6 21.4 36.2 21.1 C 36.8 20.8 37.6 23.5 38.9 23.9 C 40.1 24.3 43 22.6 44 23.3 Z', from: 5 },
        { tone: 'base', d: 'M 41.9 23.7 C 42.7 24.3 41.9 26.9 42.4 27.8 C 42.9 28.8 45.2 28.9 45.1 29.4 C 45 29.9 42.3 30 41.8 30.9 C 41.3 31.9 42.4 34.6 41.9 35 C 41.5 35.4 39.9 33.3 38.8 33.5 C 37.7 33.6 36 36.1 35.3 36 C 34.7 35.9 35.6 33.4 35 32.9 C 34.3 32.3 31.7 33.5 31.4 32.8 C 31.1 32.2 33.1 30 33 28.9 C 33 27.8 30.5 26.7 30.8 26.2 C 31.1 25.6 34.1 26.1 34.9 25.4 C 35.7 24.7 35.1 22.1 35.6 21.8 C 36.1 21.6 36.7 23.8 37.8 24.1 C 38.8 24.4 41.2 23 41.9 23.7 Z', from: 5 },
        { tone: 'deep', d: 'M 52.4 38 C 52.4 39.2 49.3 40.4 48.8 41.6 C 48.3 42.9 49.9 45.2 49.3 45.5 C 48.7 45.8 46.6 43.3 45.3 43.5 C 44 43.7 42.3 46.9 41.5 46.8 C 40.7 46.6 41.6 43.5 40.6 42.6 C 39.6 41.6 35.9 41.8 35.5 41.1 C 35.1 40.4 38.2 39.4 38.2 38.4 C 38.2 37.3 35.1 35.7 35.5 34.9 C 35.9 34.1 39.6 34.4 40.6 33.4 C 41.6 32.5 40.7 29.4 41.5 29.2 C 42.3 29.1 44 32.3 45.3 32.5 C 46.6 32.7 48.7 30.2 49.3 30.5 C 49.9 30.8 48.3 33.1 48.8 34.4 C 49.3 35.6 52.4 36.8 52.4 38 Z', from: 5 },
        { tone: 'deep', d: 'M 49.7 37 C 49.7 38 47.2 38.9 46.8 39.9 C 46.3 40.9 47.7 42.8 47.2 43 C 46.7 43.3 45 41.2 44 41.4 C 42.9 41.6 41.5 44.2 40.8 44.1 C 40.2 43.9 40.9 41.4 40.1 40.7 C 39.3 39.9 36.3 40 36 39.5 C 35.6 38.9 38.2 38.1 38.2 37.3 C 38.2 36.4 35.6 35.1 36 34.5 C 36.3 33.8 39.3 34 40.1 33.3 C 40.9 32.5 40.2 30 40.8 29.9 C 41.5 29.7 42.9 32.4 44 32.5 C 45 32.7 46.7 30.7 47.2 30.9 C 47.7 31.1 46.3 33 46.8 34 C 47.2 35 49.7 36 49.7 37 Z', from: 5 },
        { tone: 'deep', d: 'M 44 52.7 C 43 53.4 40.1 51.7 38.9 52.1 C 37.6 52.5 36.8 55.2 36.2 54.9 C 35.6 54.6 36.2 51.4 35.3 50.5 C 34.3 49.6 30.7 50.3 30.3 49.6 C 29.9 48.8 32.9 47.6 33 46.2 C 33.1 44.9 30.7 42.1 31 41.3 C 31.3 40.6 34 42.4 34.8 41.8 C 35.6 41.1 34.9 37.7 35.8 37.5 C 36.7 37.3 38.8 40.4 40.2 40.6 C 41.5 40.7 43.4 38.1 44 38.6 C 44.6 39.2 43.2 42.5 43.8 43.7 C 44.5 44.8 47.8 44.9 47.9 45.6 C 48 46.2 45.2 46.4 44.6 47.5 C 43.9 48.7 44.9 51.9 44 52.7 Z', from: 5 },
        { tone: 'deep', d: 'M 41.9 50.3 C 41.2 50.9 38.8 49.5 37.8 49.8 C 36.7 50.1 36.1 52.3 35.6 52.1 C 35.1 51.9 35.7 49.3 34.9 48.5 C 34.1 47.8 31.1 48.3 30.8 47.8 C 30.5 47.2 33 46.2 33 45.1 C 33.1 44 31.1 41.7 31.4 41.1 C 31.6 40.5 33.9 42 34.5 41.4 C 35.2 40.9 34.6 38.1 35.3 38 C 36 37.8 37.7 40.3 38.8 40.5 C 39.9 40.6 41.5 38.5 41.9 38.9 C 42.4 39.3 41.3 42.1 41.8 43 C 42.3 43.9 45 44 45.1 44.5 C 45.2 45.1 42.9 45.2 42.4 46.1 C 41.9 47.1 42.7 49.7 41.9 50.3 Z', from: 5 },
        { tone: 'deep', d: 'M 25 56.3 C 23.8 56 23.4 52.7 22.3 51.9 C 21.2 51.1 18.6 52.2 18.4 51.6 C 18.2 51 21.2 49.4 21.3 48.1 C 21.3 46.8 18.6 44.4 18.9 43.7 C 19.2 42.9 22.1 44.5 23.2 43.7 C 24.3 42.9 25 39.3 25.8 39.1 C 26.5 38.8 26.8 42.1 27.8 42.3 C 28.8 42.6 31.1 39.9 31.8 40.4 C 32.5 41 31.4 44.6 32.1 45.7 C 32.8 46.9 36 46.8 36 47.6 C 36 48.4 32.4 49.3 31.9 50.6 C 31.4 51.8 33.4 54.4 33 54.9 C 32.6 55.4 30.7 53.3 29.4 53.5 C 28 53.8 26.2 56.5 25 56.3 Z', from: 5 },
        { tone: 'deep', d: 'M 24.4 53.6 C 23.5 53.3 23.1 50.7 22.2 50 C 21.3 49.4 19.2 50.3 19.1 49.8 C 18.9 49.3 21.3 48 21.4 47 C 21.4 45.9 19.2 43.9 19.5 43.3 C 19.7 42.7 22 44 23 43.4 C 23.9 42.7 24.4 39.8 25 39.6 C 25.7 39.4 25.9 42.1 26.7 42.3 C 27.5 42.4 29.4 40.3 29.9 40.7 C 30.5 41.2 29.6 44.1 30.2 45 C 30.7 46 33.3 45.8 33.3 46.5 C 33.3 47.1 30.4 47.9 30 48.9 C 29.6 49.9 31.2 52.1 30.9 52.5 C 30.5 52.9 29 51.2 28 51.3 C 26.9 51.5 25.4 53.8 24.4 53.6 Z', from: 5 },
        { tone: 'deep', d: 'M 9.8 46.1 C 9.3 45 11.6 42.6 11.5 41.3 C 11.4 39.9 9 38.6 9.4 38.1 C 9.7 37.5 12.8 38.9 13.8 38.1 C 14.9 37.4 15.1 33.7 15.9 33.5 C 16.6 33.3 17.2 36.5 18.5 36.9 C 19.8 37.3 23.1 35.5 23.7 36 C 24.4 36.4 22 38.7 22.5 39.6 C 22.9 40.6 26.4 40.7 26.4 41.6 C 26.4 42.5 23 43.8 22.5 45.1 C 22 46.4 24.1 48.8 23.5 49.3 C 22.8 49.8 19.9 47.6 18.6 48 C 17.3 48.4 16.5 51.5 15.8 51.5 C 15.2 51.5 15.7 48.7 14.7 47.8 C 13.7 46.9 10.3 47.2 9.8 46.1 Z', from: 5 },
        { tone: 'light', d: 'M 10.4 44.4 C 10 43.5 11.8 41.5 11.8 40.4 C 11.7 39.3 9.7 38.2 10 37.8 C 10.3 37.4 12.8 38.5 13.7 37.9 C 14.5 37.2 14.7 34.3 15.3 34.1 C 15.9 33.9 16.4 36.5 17.4 36.9 C 18.5 37.2 21.1 35.7 21.7 36.1 C 22.2 36.5 20.3 38.3 20.6 39.1 C 21 39.8 23.9 39.9 23.9 40.7 C 23.9 41.4 21 42.5 20.6 43.5 C 20.2 44.6 22 46.5 21.5 46.9 C 20.9 47.3 18.5 45.5 17.5 45.8 C 16.5 46.2 15.8 48.7 15.3 48.7 C 14.7 48.7 15.1 46.5 14.3 45.7 C 13.5 45 10.8 45.2 10.4 44.4 Z', from: 5 }
      ]
    },
    birch: {
      trunk: 'M 27.2 96 Q 28.6 73 28 50 L 32 50 Q 31.4 73 32.8 96 Z',
      trunkShort: 'M 27.8 96 Q 28.9 84 28.2 72 L 31.8 72 Q 31.1 84 32.2 96 Z',
      trunkTone: 'birch',
      blossoms: [[23, 34], [37, 33], [30, 14], [22, 45], [39, 44], [30, 26], [17, 40], [43, 38], [30, 42]],
      parts: [
        { tone: 'birch-shade', d: 'M 30.4 96 Q 30.6 84 30.2 72 L 31.8 72 Q 31.1 84 32.2 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 29.6 88 Q 28.9 87.2 27.9 87.5 Q 28.6 88.3 29.6 88 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.4 80 Q 31.4 80.3 32.1 79.5 Q 31.1 79.2 30.4 80 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 36.9 66 C 36.9 66.6 37.6 67.1 37.7 67.8 C 37.9 68.5 38.2 69.5 37.9 70 C 37.6 70.5 36.4 70.7 35.7 70.9 C 34.9 71.2 34 70.9 33.4 71.2 C 32.8 71.5 32.6 72.3 32.1 72.8 C 31.5 73.2 30.7 74 30 74 C 29.3 74 28.5 73.2 27.9 72.8 C 27.4 72.3 27.2 71.5 26.6 71.2 C 26 70.9 25.1 71.2 24.3 70.9 C 23.6 70.7 22.4 70.5 22.1 70 C 21.8 69.5 22.1 68.5 22.3 67.8 C 22.4 67.1 23.1 66.6 23.1 66 C 23.1 65.4 22.4 64.9 22.3 64.2 C 22.1 63.5 21.8 62.5 22.1 62 C 22.4 61.5 23.6 61.3 24.3 61.1 C 25.1 60.8 26 61.1 26.6 60.8 C 27.2 60.5 27.4 59.7 27.9 59.2 C 28.5 58.8 29.3 58 30 58 C 30.7 58 31.5 58.8 32.1 59.2 C 32.6 59.7 32.8 60.5 33.4 60.8 C 34 61.1 34.9 60.8 35.7 61.1 C 36.4 61.3 37.6 61.5 37.9 62 C 38.2 62.5 37.9 63.5 37.7 64.2 C 37.6 64.9 36.9 65.4 36.9 66 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 35 65 C 35 65.4 35.6 65.9 35.7 66.4 C 35.8 67 36.1 67.8 35.8 68.2 C 35.5 68.6 34.5 68.8 33.9 69 C 33.3 69.2 32.6 69 32.1 69.3 C 31.6 69.5 31.4 70.1 30.9 70.5 C 30.4 70.9 29.7 71.5 29.1 71.5 C 28.5 71.5 27.9 70.9 27.4 70.5 C 26.9 70.1 26.7 69.5 26.2 69.3 C 25.7 69 24.9 69.2 24.3 69 C 23.7 68.8 22.7 68.6 22.4 68.2 C 22.2 67.8 22.4 67 22.6 66.4 C 22.7 65.9 23.2 65.4 23.2 65 C 23.2 64.5 22.7 64 22.6 63.5 C 22.4 62.9 22.2 62.1 22.4 61.7 C 22.7 61.3 23.7 61.1 24.3 60.9 C 24.9 60.7 25.7 60.9 26.2 60.6 C 26.7 60.4 26.9 59.8 27.4 59.4 C 27.9 59 28.5 58.4 29.1 58.4 C 29.7 58.4 30.4 59 30.9 59.4 C 31.4 59.8 31.6 60.4 32.1 60.6 C 32.6 60.9 33.3 60.7 33.9 60.9 C 34.5 61.1 35.5 61.3 35.8 61.7 C 36.1 62.1 35.8 62.9 35.7 63.5 C 35.6 64 35 64.5 35 65 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 31.1 63.3 C 31.1 63.7 30.7 64.2 30.4 64.5 C 30.1 64.8 29.6 64.9 29.3 65.2 C 29 65.4 28.8 65.8 28.5 66.1 C 28.1 66.3 27.6 66.7 27.1 66.7 C 26.7 66.7 26.1 66.3 25.8 66.1 C 25.4 65.8 25.3 65.4 24.9 65.2 C 24.6 64.9 24.2 64.8 23.9 64.5 C 23.6 64.2 23.2 63.7 23.2 63.3 C 23.2 63 23.6 62.5 23.9 62.2 C 24.2 61.9 24.6 61.8 24.9 61.5 C 25.3 61.3 25.4 60.9 25.8 60.6 C 26.1 60.4 26.7 60 27.1 60 C 27.6 60 28.1 60.4 28.5 60.6 C 28.8 60.9 29 61.3 29.3 61.5 C 29.6 61.8 30.1 61.9 30.4 62.2 C 30.7 62.5 31.1 63 31.1 63.3 Z', from: 2, to: 2 },
        { tone: 'birch', d: 'M 27.2 96 Q 28.6 73 28 50 L 32 50 Q 31.4 73 32.8 96 Z', from: 3, to: 3 },
        { tone: 'birch-shade', d: 'M 30.5 96 Q 30.8 73 30.2 50 L 32 50 Q 31.4 73 32.8 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 29.6 88 Q 28.9 87.2 27.9 87.5 Q 28.6 88.3 29.6 88 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.4 80 Q 31.4 80.3 32.1 79.5 Q 31.1 79.2 30.4 80 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 29.6 72 Q 28.9 71.2 27.9 71.5 Q 28.6 72.3 29.6 72 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.4 64 Q 31.4 64.3 32.1 63.5 Q 31.1 63.2 30.4 64 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 39.5 46 C 39.9 46.8 40.6 48 40.5 48.8 C 40.3 49.6 39.2 50.2 38.6 50.8 C 37.9 51.3 36.9 51.3 36.5 52 C 36 52.6 36.2 53.7 35.9 54.6 C 35.6 55.5 35.3 56.8 34.7 57.2 C 34 57.6 32.9 57 32.1 56.7 C 31.3 56.5 30.7 55.6 30 55.6 C 29.3 55.6 28.7 56.5 27.9 56.7 C 27.1 57 26 57.6 25.3 57.2 C 24.7 56.8 24.4 55.5 24.1 54.6 C 23.8 53.7 24 52.6 23.5 52 C 23.1 51.3 22.1 51.3 21.4 50.8 C 20.8 50.2 19.7 49.6 19.5 48.8 C 19.4 48 20.1 46.8 20.5 46 C 20.9 45.2 21.8 44.7 21.9 43.9 C 22.1 43.1 21.5 42.2 21.4 41.2 C 21.4 40.3 21.2 38.9 21.6 38.3 C 22 37.6 23.3 37.5 24.1 37.4 C 24.9 37.3 25.8 37.7 26.4 37.4 C 27 37 27.3 35.9 27.9 35.3 C 28.5 34.6 29.3 33.6 30 33.6 C 30.7 33.6 31.5 34.6 32.1 35.3 C 32.7 35.9 33 37 33.6 37.4 C 34.2 37.7 35.1 37.3 35.9 37.4 C 36.7 37.5 38 37.6 38.4 38.3 C 38.8 38.9 38.6 40.3 38.6 41.2 C 38.5 42.2 37.9 43.1 38.1 43.9 C 38.2 44.7 39.1 45.2 39.5 46 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 37 44.4 C 37.4 45 37.9 46 37.8 46.6 C 37.7 47.3 36.8 47.8 36.2 48.3 C 35.7 48.7 34.9 48.8 34.5 49.3 C 34.1 49.8 34.3 50.7 34 51.4 C 33.7 52.1 33.4 53.2 32.9 53.5 C 32.4 53.8 31.4 53.3 30.8 53.1 C 30.1 52.9 29.6 52.3 29 52.3 C 28.4 52.3 27.8 52.9 27.2 53.1 C 26.5 53.3 25.6 53.8 25 53.5 C 24.5 53.2 24.2 52.1 23.9 51.4 C 23.7 50.7 23.8 49.8 23.4 49.3 C 23 48.8 22.2 48.7 21.7 48.3 C 21.1 47.8 20.2 47.3 20.1 46.6 C 20 46 20.6 45 20.9 44.4 C 21.2 43.7 21.9 43.2 22.1 42.6 C 22.2 41.9 21.7 41.2 21.7 40.4 C 21.6 39.7 21.5 38.6 21.9 38 C 22.2 37.5 23.2 37.4 23.9 37.3 C 24.6 37.2 25.3 37.5 25.9 37.2 C 26.4 36.9 26.6 36.1 27.2 35.6 C 27.7 35.1 28.4 34.2 29 34.2 C 29.6 34.2 30.2 35.1 30.8 35.6 C 31.3 36.1 31.5 36.9 32 37.2 C 32.6 37.5 33.3 37.2 34 37.3 C 34.7 37.4 35.7 37.5 36 38 C 36.4 38.6 36.3 39.7 36.2 40.4 C 36.2 41.2 35.7 41.9 35.9 42.6 C 36 43.2 36.7 43.7 37 44.4 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 30.8 41.8 C 30.6 42.3 30.2 42.6 30.1 43.1 C 30 43.5 30.1 44 30 44.5 C 29.8 45 29.7 45.7 29.3 46 C 29 46.3 28.3 46.2 27.9 46.2 C 27.4 46.2 27 45.9 26.6 45.9 C 26.1 45.9 25.7 46.2 25.3 46.2 C 24.8 46.2 24.2 46.3 23.8 46 C 23.5 45.7 23.3 45 23.2 44.5 C 23.1 44 23.2 43.5 23.1 43.1 C 22.9 42.6 22.6 42.3 22.4 41.8 C 22.2 41.3 22 40.7 22.1 40.2 C 22.3 39.8 22.8 39.4 23.2 39.1 C 23.6 38.8 24.1 38.8 24.4 38.5 C 24.8 38.2 24.9 37.7 25.3 37.4 C 25.6 37.1 26.1 36.7 26.6 36.7 C 27 36.7 27.5 37.1 27.9 37.4 C 28.2 37.7 28.4 38.2 28.7 38.5 C 29.1 38.8 29.6 38.8 30 39.1 C 30.3 39.4 30.9 39.8 31 40.2 C 31.2 40.7 30.9 41.3 30.8 41.8 Z', from: 3, to: 3 },
        { tone: 'birch', d: 'M 27 96 Q 28.5 68 28 40 L 32 40 Q 31.5 68 33 96 Z', from: 4, to: 4 },
        { tone: 'birch-shade', d: 'M 30.5 96 Q 30.8 68 30.2 40 L 32 40 Q 31.5 68 33 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 29.6 88 Q 28.9 87.2 27.9 87.5 Q 28.6 88.3 29.6 88 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.4 80 Q 31.4 80.3 32.1 79.5 Q 31.1 79.2 30.4 80 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 29.6 72 Q 28.9 71.2 27.9 71.5 Q 28.6 72.3 29.6 72 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.4 64 Q 31.4 64.3 32.1 63.5 Q 31.1 63.2 30.4 64 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 29.6 56 Q 28.9 55.2 27.9 55.5 Q 28.6 56.3 29.6 56 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.4 48 Q 31.4 48.3 32.1 47.5 Q 31.1 47.2 30.4 48 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.9 36 C 41.9 36.8 40.9 37.8 40.3 38.5 C 39.7 39.3 38.7 39.5 38.4 40.3 C 38.2 41.1 38.7 42.2 38.7 43.2 C 38.7 44.2 38.9 45.8 38.4 46.4 C 37.9 47 36.6 46.8 35.8 46.8 C 35 46.8 34.1 46.1 33.5 46.4 C 32.9 46.8 32.6 48 32 48.8 C 31.5 49.5 30.7 50.7 30 50.7 C 29.3 50.7 28.5 49.5 28 48.8 C 27.4 48 27.1 46.8 26.5 46.4 C 25.9 46.1 25 46.8 24.2 46.8 C 23.4 46.8 22.1 47 21.6 46.4 C 21.1 45.8 21.3 44.2 21.3 43.2 C 21.3 42.2 21.8 41.1 21.6 40.3 C 21.3 39.5 20.3 39.3 19.7 38.5 C 19.1 37.8 18.1 36.8 18.1 36 C 18.1 35.2 19.1 34.2 19.7 33.5 C 20.3 32.7 21.3 32.5 21.6 31.7 C 21.8 30.9 21.3 29.8 21.3 28.8 C 21.3 27.8 21.1 26.2 21.6 25.6 C 22.1 25 23.4 25.2 24.2 25.2 C 25 25.2 25.9 25.9 26.5 25.6 C 27.1 25.2 27.4 24 28 23.2 C 28.5 22.5 29.3 21.3 30 21.3 C 30.7 21.3 31.5 22.5 32 23.2 C 32.6 24 32.9 25.2 33.5 25.6 C 34.1 25.9 35 25.2 35.8 25.2 C 36.6 25.2 37.9 25 38.4 25.6 C 38.9 26.2 38.7 27.8 38.7 28.8 C 38.7 29.8 38.2 30.9 38.4 31.7 C 38.7 32.5 39.7 32.7 40.3 33.5 C 40.9 34.2 41.9 35.2 41.9 36 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 38.9 34.1 C 38.9 34.7 38.1 35.5 37.6 36.1 C 37.1 36.7 36.3 37 36.1 37.6 C 35.9 38.3 36.3 39.2 36.3 40 C 36.2 40.8 36.3 42 35.9 42.5 C 35.5 43 34.5 42.9 33.8 42.9 C 33.1 42.9 32.4 42.4 31.8 42.7 C 31.3 42.9 31.1 43.9 30.6 44.5 C 30.1 45.1 29.4 46 28.8 46 C 28.3 46 27.6 45.1 27.1 44.5 C 26.6 43.9 26.4 42.9 25.9 42.7 C 25.3 42.4 24.6 42.9 23.9 42.9 C 23.2 42.9 22.2 43 21.8 42.5 C 21.3 42 21.4 40.8 21.4 40 C 21.4 39.2 21.8 38.3 21.6 37.6 C 21.4 37 20.6 36.7 20.1 36.1 C 19.6 35.5 18.8 34.7 18.8 34.1 C 18.8 33.4 19.6 32.6 20.1 32 C 20.6 31.4 21.4 31.1 21.6 30.5 C 21.8 29.8 21.4 28.9 21.4 28.1 C 21.4 27.3 21.3 26.1 21.8 25.6 C 22.2 25.1 23.2 25.2 23.9 25.2 C 24.6 25.2 25.3 25.7 25.9 25.4 C 26.4 25.2 26.6 24.2 27.1 23.6 C 27.6 23 28.3 22.1 28.8 22.1 C 29.4 22.1 30.1 23 30.6 23.6 C 31.1 24.2 31.3 25.2 31.8 25.4 C 32.4 25.7 33.1 25.2 33.8 25.2 C 34.5 25.2 35.5 25.1 35.9 25.6 C 36.3 26.1 36.2 27.3 36.3 28.1 C 36.3 28.9 35.9 29.8 36.1 30.5 C 36.3 31.1 37.1 31.4 37.6 32 C 38.1 32.6 38.9 33.4 38.9 34.1 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30.3 31.1 C 30.3 31.5 30.6 32 30.7 32.5 C 30.7 33 30.9 33.7 30.7 34.1 C 30.5 34.5 29.9 34.7 29.5 34.9 C 29.1 35.1 28.6 35 28.3 35.2 C 27.9 35.5 27.8 36 27.4 36.3 C 27.1 36.7 26.6 37.2 26.2 37.2 C 25.8 37.2 25.4 36.7 25 36.3 C 24.7 36 24.5 35.5 24.2 35.2 C 23.8 35 23.4 35.1 23 34.9 C 22.5 34.7 22 34.5 21.8 34.1 C 21.6 33.7 21.7 33 21.8 32.5 C 21.8 32 22.1 31.5 22.1 31.1 C 22.1 30.6 21.8 30.2 21.8 29.6 C 21.7 29.1 21.6 28.4 21.8 28 C 22 27.6 22.5 27.4 23 27.2 C 23.4 27 23.8 27.1 24.2 26.9 C 24.5 26.6 24.7 26.1 25 25.8 C 25.4 25.5 25.8 25 26.2 25 C 26.6 25 27.1 25.5 27.4 25.8 C 27.8 26.1 27.9 26.6 28.3 26.9 C 28.6 27.1 29.1 27 29.5 27.2 C 29.9 27.4 30.5 27.6 30.7 28 C 30.9 28.4 30.7 29.1 30.7 29.6 C 30.6 30.2 30.3 30.6 30.3 31.1 Z', from: 4, to: 4 },
        { tone: 'birch', d: 'M 26.8 96 Q 28.4 63 28 30 L 32 30 Q 31.6 63 33.2 96 Z', from: 5 },
        { tone: 'birch-shade', d: 'M 30.6 96 Q 30.9 63 30.2 30 L 32 30 Q 31.6 63 33.2 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 29.6 88 Q 28.9 87.2 27.9 87.5 Q 28.6 88.3 29.6 88 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.4 80 Q 31.4 80.3 32.1 79.5 Q 31.1 79.2 30.4 80 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 29.6 72 Q 28.9 71.2 27.9 71.5 Q 28.6 72.3 29.6 72 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.4 64 Q 31.4 64.3 32.1 63.5 Q 31.1 63.2 30.4 64 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 29.6 56 Q 28.9 55.2 27.9 55.5 Q 28.6 56.3 29.6 56 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.4 48 Q 31.4 48.3 32.1 47.5 Q 31.1 47.2 30.4 48 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 29.6 40 Q 28.9 39.2 27.9 39.5 Q 28.6 40.3 29.6 40 Z', from: 5 },
        { tone: 'deep', d: 'M 27 46 C 26.7 46.8 25.9 47.2 25.7 48 C 25.4 48.7 25.8 49.6 25.7 50.4 C 25.5 51.2 25.3 52.5 24.7 53 C 24.1 53.4 23 53.2 22.2 53.1 C 21.4 53 20.7 52.4 20 52.4 C 19.3 52.4 18.6 53 17.8 53.1 C 17 53.2 15.9 53.4 15.3 53 C 14.7 52.5 14.5 51.2 14.3 50.4 C 14.2 49.6 14.6 48.7 14.3 48 C 14.1 47.2 13.3 46.8 13 46 C 12.7 45.2 12.1 44.1 12.3 43.3 C 12.6 42.6 13.6 42 14.3 41.6 C 15 41.2 15.9 41.3 16.5 40.8 C 17.1 40.4 17.3 39.4 17.8 38.9 C 18.4 38.3 19.3 37.4 20 37.4 C 20.7 37.4 21.6 38.3 22.2 38.9 C 22.7 39.4 22.9 40.4 23.5 40.8 C 24.1 41.3 25 41.2 25.7 41.6 C 26.4 42 27.4 42.6 27.7 43.3 C 27.9 44.1 27.3 45.2 27 46 Z', from: 5 },
        { tone: 'base', d: 'M 25.2 44.9 C 24.9 45.5 24.3 45.9 24.1 46.5 C 23.9 47.1 24.2 47.8 24 48.5 C 23.9 49.2 23.7 50.2 23.2 50.6 C 22.7 50.9 21.7 50.8 21.1 50.7 C 20.4 50.7 19.8 50.1 19.2 50.1 C 18.6 50.1 18.1 50.7 17.4 50.7 C 16.7 50.8 15.7 50.9 15.2 50.6 C 14.7 50.2 14.6 49.2 14.4 48.5 C 14.3 47.8 14.6 47.1 14.4 46.5 C 14.2 45.9 13.5 45.5 13.3 44.9 C 13 44.2 12.6 43.3 12.8 42.7 C 13 42.1 13.8 41.6 14.4 41.3 C 15 40.9 15.7 41 16.2 40.6 C 16.7 40.2 16.9 39.5 17.4 39 C 17.9 38.6 18.6 37.8 19.2 37.8 C 19.8 37.8 20.6 38.6 21.1 39 C 21.6 39.5 21.7 40.2 22.2 40.6 C 22.7 41 23.5 40.9 24 41.3 C 24.6 41.6 25.5 42.1 25.7 42.7 C 25.9 43.3 25.4 44.2 25.2 44.9 Z', from: 5 },
        { tone: 'light', d: 'M 20.6 43.2 C 20.7 43.7 20.8 44.5 20.5 44.9 C 20.3 45.4 19.5 45.7 19 45.9 C 18.5 46 18 45.9 17.5 45.9 C 17 45.9 16.4 46 15.9 45.9 C 15.4 45.7 14.7 45.4 14.5 44.9 C 14.2 44.5 14.3 43.7 14.4 43.2 C 14.5 42.6 14.9 42.2 15.2 41.8 C 15.4 41.3 15.6 40.8 15.9 40.4 C 16.3 40.1 17 39.6 17.5 39.6 C 18 39.6 18.6 40.1 19 40.4 C 19.4 40.8 19.5 41.3 19.8 41.8 C 20 42.2 20.4 42.6 20.6 43.2 Z', from: 5 },
        { tone: 'deep', d: 'M 46.5 43 C 46.2 43.7 45.5 44.2 45.3 44.8 C 45 45.5 45.4 46.3 45.3 47.1 C 45.1 47.9 44.9 49.1 44.4 49.5 C 43.9 49.9 42.7 49.8 42 49.7 C 41.3 49.6 40.7 49 40 49 C 39.3 49 38.7 49.6 38 49.7 C 37.3 49.8 36.1 49.9 35.6 49.5 C 35.1 49.1 34.9 47.9 34.7 47.1 C 34.6 46.3 35 45.5 34.7 44.8 C 34.5 44.2 33.8 43.7 33.5 43 C 33.2 42.3 32.7 41.2 32.9 40.5 C 33.1 39.8 34.1 39.3 34.7 38.9 C 35.4 38.5 36.2 38.6 36.8 38.2 C 37.3 37.8 37.5 36.9 38 36.3 C 38.5 35.8 39.3 35 40 35 C 40.7 35 41.5 35.8 42 36.3 C 42.5 36.9 42.7 37.8 43.2 38.2 C 43.8 38.6 44.6 38.5 45.3 38.9 C 45.9 39.3 46.9 39.8 47.1 40.5 C 47.3 41.2 46.8 42.3 46.5 43 Z', from: 5 },
        { tone: 'base', d: 'M 44.8 42 C 44.6 42.5 44 42.9 43.8 43.5 C 43.6 44 43.9 44.7 43.8 45.3 C 43.6 46 43.5 46.9 43 47.3 C 42.5 47.6 41.6 47.5 41 47.4 C 40.4 47.3 39.9 46.9 39.3 46.9 C 38.7 46.9 38.2 47.3 37.6 47.4 C 37 47.5 36 47.6 35.6 47.3 C 35.1 46.9 34.9 46 34.8 45.3 C 34.7 44.7 35 44 34.8 43.5 C 34.6 42.9 34 42.5 33.8 42 C 33.5 41.4 33.1 40.5 33.3 39.9 C 33.5 39.4 34.3 38.9 34.8 38.6 C 35.4 38.3 36 38.3 36.5 38 C 37 37.6 37.1 36.9 37.6 36.5 C 38 36.1 38.7 35.4 39.3 35.4 C 39.9 35.4 40.5 36.1 41 36.5 C 41.5 36.9 41.6 37.6 42.1 38 C 42.5 38.3 43.2 38.3 43.8 38.6 C 44.3 38.9 45.1 39.4 45.3 39.9 C 45.5 40.5 45.1 41.4 44.8 42 Z', from: 5 },
        { tone: 'light', d: 'M 40.5 40.3 C 40.6 40.8 40.7 41.6 40.5 42 C 40.2 42.4 39.6 42.7 39.1 42.9 C 38.6 43 38.1 42.9 37.7 42.9 C 37.2 42.9 36.7 43 36.2 42.9 C 35.8 42.7 35.1 42.4 34.8 42 C 34.6 41.6 34.7 40.8 34.8 40.3 C 34.9 39.9 35.3 39.5 35.5 39.1 C 35.8 38.6 35.9 38.1 36.2 37.8 C 36.6 37.4 37.2 37 37.7 37 C 38.1 37 38.7 37.4 39.1 37.8 C 39.4 38.1 39.6 38.6 39.8 39.1 C 40 39.5 40.4 39.9 40.5 40.3 Z', from: 5 },
        { tone: 'deep', d: 'M 31.5 34 C 31.1 34.8 30.3 35.3 30.1 36.1 C 29.8 36.9 30.2 37.8 30.1 38.7 C 29.9 39.6 29.7 41 29.1 41.4 C 28.4 41.9 27.2 41.7 26.3 41.6 C 25.5 41.5 24.8 40.8 24 40.8 C 23.2 40.8 22.5 41.5 21.7 41.6 C 20.8 41.7 19.6 41.9 18.9 41.4 C 18.3 41 18.1 39.6 17.9 38.7 C 17.8 37.8 18.2 36.9 17.9 36.1 C 17.7 35.3 16.9 34.8 16.5 34 C 16.1 33.2 15.6 31.9 15.8 31.2 C 16 30.4 17.2 29.7 17.9 29.3 C 18.7 28.9 19.6 29 20.3 28.5 C 20.9 28 21.1 27 21.7 26.4 C 22.3 25.8 23.2 24.8 24 24.8 C 24.8 24.8 25.7 25.8 26.3 26.4 C 26.9 27 27.1 28 27.7 28.5 C 28.4 29 29.3 28.9 30.1 29.3 C 30.8 29.7 32 30.4 32.2 31.2 C 32.4 31.9 31.9 33.2 31.5 34 Z', from: 5 },
        { tone: 'base', d: 'M 29.6 32.8 C 29.3 33.5 28.6 33.9 28.4 34.5 C 28.2 35.2 28.5 35.9 28.3 36.7 C 28.2 37.4 28 38.5 27.5 38.9 C 26.9 39.3 25.9 39.1 25.1 39 C 24.4 39 23.8 38.4 23.2 38.4 C 22.5 38.4 21.9 39 21.2 39 C 20.5 39.1 19.4 39.3 18.9 38.9 C 18.4 38.5 18.2 37.4 18 36.7 C 17.9 35.9 18.2 35.2 18 34.5 C 17.8 33.9 17.1 33.5 16.8 32.8 C 16.5 32.1 16 31.1 16.2 30.5 C 16.5 29.8 17.4 29.3 18 28.9 C 18.6 28.6 19.4 28.6 20 28.2 C 20.5 27.9 20.7 27.1 21.2 26.6 C 21.7 26.1 22.5 25.3 23.2 25.3 C 23.8 25.3 24.6 26.1 25.1 26.6 C 25.7 27.1 25.9 27.9 26.4 28.2 C 26.9 28.6 27.7 28.6 28.3 28.9 C 29 29.3 29.9 29.8 30.1 30.5 C 30.3 31.1 29.8 32.1 29.6 32.8 Z', from: 5 },
        { tone: 'light', d: 'M 24.6 31 C 24.7 31.5 24.8 32.4 24.5 32.9 C 24.3 33.4 23.5 33.7 23 33.9 C 22.4 34 21.9 33.9 21.3 33.9 C 20.8 33.9 20.2 34 19.7 33.9 C 19.1 33.7 18.3 33.4 18.1 32.9 C 17.8 32.4 17.9 31.5 18 31 C 18.1 30.4 18.6 30 18.8 29.5 C 19.1 29 19.2 28.4 19.7 28.1 C 20.1 27.7 20.8 27.1 21.3 27.1 C 21.9 27.1 22.5 27.7 23 28.1 C 23.4 28.4 23.5 29 23.8 29.5 C 24 30 24.5 30.4 24.6 31 Z', from: 5 },
        { tone: 'deep', d: 'M 44 31 C 43.7 31.8 42.9 32.2 42.7 33 C 42.4 33.7 42.8 34.6 42.7 35.4 C 42.5 36.2 42.3 37.5 41.7 38 C 41.1 38.4 40 38.2 39.2 38.1 C 38.4 38 37.7 37.4 37 37.4 C 36.3 37.4 35.6 38 34.8 38.1 C 34 38.2 32.9 38.4 32.3 38 C 31.7 37.5 31.5 36.2 31.3 35.4 C 31.2 34.6 31.6 33.7 31.3 33 C 31.1 32.2 30.3 31.8 30 31 C 29.7 30.2 29.1 29.1 29.3 28.3 C 29.6 27.6 30.6 27 31.3 26.6 C 32 26.2 32.9 26.3 33.5 25.8 C 34.1 25.4 34.3 24.4 34.8 23.9 C 35.4 23.3 36.3 22.4 37 22.4 C 37.7 22.4 38.6 23.3 39.2 23.9 C 39.7 24.4 39.9 25.4 40.5 25.8 C 41.1 26.3 42 26.2 42.7 26.6 C 43.4 27 44.4 27.6 44.7 28.3 C 44.9 29.1 44.3 30.2 44 31 Z', from: 5 },
        { tone: 'base', d: 'M 42.2 29.9 C 41.9 30.5 41.3 30.9 41.1 31.5 C 40.9 32.1 41.2 32.8 41 33.5 C 40.9 34.2 40.7 35.2 40.2 35.6 C 39.7 35.9 38.7 35.8 38.1 35.7 C 37.4 35.7 36.8 35.1 36.2 35.1 C 35.6 35.1 35.1 35.7 34.4 35.7 C 33.7 35.8 32.7 35.9 32.2 35.6 C 31.7 35.2 31.6 34.2 31.4 33.5 C 31.3 32.8 31.6 32.1 31.4 31.5 C 31.2 30.9 30.5 30.5 30.3 29.9 C 30 29.2 29.6 28.3 29.8 27.7 C 30 27.1 30.8 26.6 31.4 26.3 C 32 25.9 32.7 26 33.2 25.6 C 33.7 25.2 33.9 24.5 34.4 24 C 34.9 23.6 35.6 22.8 36.2 22.8 C 36.8 22.8 37.6 23.6 38.1 24 C 38.6 24.5 38.7 25.2 39.2 25.6 C 39.7 26 40.5 25.9 41 26.3 C 41.6 26.6 42.5 27.1 42.7 27.7 C 42.9 28.3 42.4 29.2 42.2 29.9 Z', from: 5 },
        { tone: 'light', d: 'M 37.6 28.2 C 37.7 28.7 37.8 29.5 37.5 29.9 C 37.3 30.4 36.5 30.7 36 30.9 C 35.5 31 35 30.9 34.5 30.9 C 34 30.9 33.4 31 32.9 30.9 C 32.4 30.7 31.7 30.4 31.5 29.9 C 31.2 29.5 31.3 28.7 31.4 28.2 C 31.5 27.6 31.9 27.2 32.2 26.8 C 32.4 26.3 32.6 25.8 32.9 25.4 C 33.3 25.1 34 24.6 34.5 24.6 C 35 24.6 35.6 25.1 36 25.4 C 36.4 25.8 36.5 26.3 36.8 26.8 C 37 27.2 37.4 27.6 37.6 28.2 Z', from: 5 },
        { tone: 'deep', d: 'M 41.5 26 C 41 26.9 40.1 27.4 40 28.3 C 39.9 29.1 40.6 30.1 40.8 31.1 C 41 32.1 41.5 33.6 41.2 34.4 C 40.8 35.2 39.6 35.4 38.8 35.6 C 38 35.9 37 35.6 36.5 36.1 C 36 36.7 36.1 38 35.8 39 C 35.4 39.9 35 41.5 34.4 41.8 C 33.8 42.1 32.7 41.2 32 40.8 C 31.3 40.3 30.7 39.2 30 39.2 C 29.3 39.2 28.7 40.3 28 40.8 C 27.3 41.2 26.2 42.1 25.6 41.8 C 25 41.5 24.6 39.9 24.3 39 C 23.9 38 24 36.7 23.5 36.1 C 23 35.6 22 35.9 21.2 35.6 C 20.4 35.4 19.2 35.2 18.8 34.4 C 18.5 33.6 19 32.1 19.2 31.1 C 19.4 30.1 20.1 29.1 20 28.3 C 19.9 27.4 19 26.9 18.5 26 C 18 25.1 17.2 23.9 17.3 23.1 C 17.4 22.2 18.5 21.5 19.2 20.9 C 19.8 20.3 20.9 20.2 21.2 19.4 C 21.6 18.6 21.1 17.4 21.2 16.4 C 21.3 15.3 21.2 13.7 21.7 13.1 C 22.2 12.6 23.4 12.9 24.2 13 C 25.1 13.1 25.9 13.9 26.5 13.6 C 27.2 13.3 27.4 12 28 11.2 C 28.6 10.5 29.3 9.2 30 9.2 C 30.7 9.2 31.4 10.5 32 11.2 C 32.6 12 32.8 13.3 33.5 13.6 C 34.1 13.9 34.9 13.1 35.7 13 C 36.6 12.9 37.8 12.6 38.3 13.1 C 38.8 13.7 38.7 15.3 38.8 16.4 C 38.9 17.4 38.4 18.6 38.8 19.4 C 39.1 20.2 40.2 20.3 40.8 20.9 C 41.5 21.5 42.6 22.2 42.7 23.1 C 42.8 23.9 42 25.1 41.5 26 Z', from: 5 },
        { tone: 'base', d: 'M 38.5 23.8 C 38.1 24.5 37.4 24.9 37.3 25.6 C 37.2 26.3 37.8 27.1 37.9 28 C 38.1 28.8 38.4 30 38.2 30.6 C 37.9 31.2 36.9 31.4 36.2 31.7 C 35.6 31.9 34.7 31.6 34.3 32.1 C 33.9 32.6 33.9 33.6 33.6 34.4 C 33.3 35.2 33 36.4 32.5 36.6 C 31.9 36.9 31.1 36.2 30.4 35.9 C 29.8 35.5 29.3 34.6 28.7 34.6 C 28.2 34.6 27.7 35.5 27 35.9 C 26.4 36.2 25.5 36.9 25 36.6 C 24.5 36.4 24.2 35.2 23.8 34.4 C 23.5 33.6 23.6 32.6 23.2 32.1 C 22.7 31.6 21.9 31.9 21.2 31.7 C 20.6 31.4 19.6 31.2 19.3 30.6 C 19 30 19.4 28.8 19.5 28 C 19.7 27.1 20.3 26.3 20.2 25.6 C 20.1 24.9 19.3 24.5 19 23.8 C 18.6 23 17.9 22.1 18 21.4 C 18.1 20.7 19 20.1 19.5 19.5 C 20.1 19 21 18.9 21.2 18.3 C 21.5 17.7 21.2 16.7 21.2 15.8 C 21.3 15 21.3 13.7 21.7 13.3 C 22.2 12.8 23.2 13.1 23.8 13.1 C 24.5 13.1 25.2 13.8 25.8 13.5 C 26.3 13.3 26.5 12.2 27 11.6 C 27.5 11.1 28.2 10 28.7 10 C 29.3 10 29.9 11.1 30.4 11.6 C 30.9 12.2 31.2 13.3 31.7 13.5 C 32.2 13.8 32.9 13.1 33.6 13.1 C 34.3 13.1 35.3 12.8 35.7 13.3 C 36.2 13.7 36.1 15 36.2 15.8 C 36.3 16.7 36 17.7 36.2 18.3 C 36.5 18.9 37.4 19 37.9 19.5 C 38.5 20.1 39.4 20.7 39.5 21.4 C 39.6 22.1 38.9 23 38.5 23.8 Z', from: 5 },
        { tone: 'light', d: 'M 30.9 20.3 C 31.1 20.8 31.4 21.4 31.3 21.9 C 31.2 22.3 30.7 22.7 30.4 23 C 30.1 23.4 29.6 23.4 29.4 23.8 C 29.2 24.2 29.2 24.8 29 25.2 C 28.8 25.7 28.6 26.4 28.3 26.6 C 28 26.8 27.4 26.6 27 26.4 C 26.6 26.3 26.2 25.9 25.9 25.9 C 25.5 25.9 25.1 26.3 24.7 26.4 C 24.3 26.6 23.8 26.8 23.4 26.6 C 23.1 26.4 22.9 25.7 22.7 25.2 C 22.5 24.8 22.6 24.2 22.3 23.8 C 22.1 23.4 21.6 23.4 21.3 23 C 21 22.7 20.5 22.3 20.4 21.9 C 20.3 21.4 20.6 20.8 20.8 20.3 C 21 19.8 21.4 19.5 21.5 19 C 21.5 18.6 21.3 18.1 21.3 17.6 C 21.3 17 21.2 16.3 21.5 15.9 C 21.7 15.6 22.3 15.5 22.7 15.4 C 23.1 15.3 23.6 15.4 23.9 15.2 C 24.2 15 24.4 14.5 24.7 14.2 C 25.1 13.8 25.5 13.3 25.9 13.3 C 26.2 13.3 26.7 13.8 27 14.2 C 27.3 14.5 27.5 15 27.8 15.2 C 28.2 15.4 28.6 15.3 29 15.4 C 29.4 15.5 30 15.6 30.2 15.9 C 30.5 16.3 30.4 17 30.4 17.6 C 30.4 18.1 30.2 18.6 30.3 19 C 30.3 19.5 30.7 19.8 30.9 20.3 Z', from: 5 }
      ]
    },
    cypress: {
      trunk: 'M 27 96 Q 28.5 91 27.8 86 L 32.2 86 Q 31.5 91 33 96 Z',
      trunkShort: 'M 27.8 96 Q 28.9 90 28.2 84 L 31.8 84 Q 31.1 90 32.2 96 Z',
      trunkTone: 'wood',
      blossoms: [[26, 58], [34, 57], [27, 44], [33, 43], [30, 30], [30, 50], [27, 36], [33, 70], [30, 66]],
      parts: [
        { tone: 'wood', d: 'M 27.8 96 Q 28.9 90 28.2 84 L 31.8 84 Q 31.1 90 32.2 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.4 96 Q 30.6 90 30.2 84 L 31.8 84 Q 31.1 90 32.2 96 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 37.5 84 C 37.1 84.6 36.2 84.9 36 85.4 C 35.8 85.9 36.2 86.6 36.1 87.2 C 35.9 87.8 35.7 88.7 35.1 89.1 C 34.5 89.4 33.2 89.2 32.3 89.1 C 31.5 89 30.8 88.5 30 88.5 C 29.2 88.5 28.5 89 27.7 89.1 C 26.8 89.2 25.5 89.4 24.9 89.1 C 24.3 88.7 24.1 87.8 23.9 87.2 C 23.8 86.6 24.2 85.9 24 85.4 C 23.8 84.9 22.9 84.6 22.5 84 C 22.1 83.4 21.5 82.6 21.7 82.1 C 22 81.5 23.2 81.1 23.9 80.8 C 24.7 80.5 25.7 80.7 26.3 80.3 C 26.9 80 27.1 79.3 27.7 78.9 C 28.3 78.4 29.2 77.7 30 77.7 C 30.8 77.7 31.7 78.4 32.3 78.9 C 32.9 79.3 33.1 80 33.7 80.3 C 34.3 80.7 35.3 80.5 36.1 80.8 C 36.8 81.1 38 81.5 38.3 82.1 C 38.5 82.6 37.9 83.4 37.5 84 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 35 82.9 C 34.6 83.4 33.9 83.6 33.7 84 C 33.6 84.4 33.9 84.9 33.8 85.4 C 33.7 85.9 33.5 86.6 33 86.9 C 32.5 87.1 31.5 87 30.8 86.9 C 30.1 86.9 29.6 86.5 29 86.5 C 28.3 86.5 27.8 86.9 27.1 86.9 C 26.4 87 25.4 87.1 24.9 86.9 C 24.4 86.6 24.2 85.9 24.1 85.4 C 24 84.9 24.3 84.4 24.2 84 C 24 83.6 23.3 83.4 23 82.9 C 22.6 82.5 22.1 81.8 22.3 81.4 C 22.5 81 23.5 80.7 24.1 80.4 C 24.7 80.2 25.5 80.3 26 80.1 C 26.5 79.8 26.6 79.3 27.1 78.9 C 27.6 78.6 28.3 78 29 78 C 29.6 78 30.3 78.6 30.8 78.9 C 31.3 79.3 31.4 79.8 31.9 80.1 C 32.4 80.3 33.2 80.2 33.8 80.4 C 34.4 80.7 35.4 81 35.6 81.4 C 35.8 81.8 35.3 82.5 35 82.9 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.7 82.2 C 29.7 82.4 29.3 82.7 29.1 82.9 C 28.8 83.1 28.4 83.1 28.2 83.3 C 27.9 83.5 27.9 83.8 27.7 84 C 27.4 84.2 27 84.5 26.7 84.5 C 26.4 84.5 26 84.2 25.7 84 C 25.5 83.8 25.5 83.5 25.2 83.3 C 25 83.1 24.6 83.1 24.3 82.9 C 24.1 82.7 23.7 82.4 23.7 82.2 C 23.7 81.9 24.1 81.6 24.3 81.4 C 24.6 81.2 25 81.2 25.2 81 C 25.5 80.9 25.5 80.6 25.7 80.4 C 26 80.2 26.4 79.9 26.7 79.9 C 27 79.9 27.4 80.2 27.7 80.4 C 27.9 80.6 27.9 80.9 28.2 81 C 28.4 81.2 28.8 81.2 29.1 81.4 C 29.3 81.6 29.7 81.9 29.7 82.2 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 36.8 78.7 C 36.5 79.3 35.6 79.6 35.4 80.1 C 35.2 80.7 35.6 81.4 35.5 82 C 35.4 82.6 35.2 83.6 34.6 84 C 34.1 84.3 32.9 84.1 32.1 84.1 C 31.3 84 30.7 83.4 30 83.4 C 29.3 83.4 28.7 84 27.9 84.1 C 27.1 84.1 25.9 84.3 25.4 84 C 24.8 83.6 24.6 82.6 24.5 82 C 24.4 81.4 24.8 80.7 24.6 80.1 C 24.4 79.6 23.5 79.3 23.2 78.7 C 22.9 78.1 22.3 77.2 22.5 76.6 C 22.7 76.1 23.8 75.6 24.5 75.3 C 25.2 75 26.1 75.2 26.6 74.8 C 27.2 74.5 27.3 73.7 27.9 73.3 C 28.5 72.8 29.3 72.1 30 72.1 C 30.7 72.1 31.5 72.8 32.1 73.3 C 32.7 73.7 32.8 74.5 33.4 74.8 C 33.9 75.2 34.8 75 35.5 75.3 C 36.2 75.6 37.3 76.1 37.5 76.6 C 37.7 77.2 37.1 78.1 36.8 78.7 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 34.5 77.5 C 34.2 78 33.6 78.2 33.4 78.7 C 33.2 79.1 33.6 79.6 33.4 80.1 C 33.3 80.6 33.2 81.4 32.8 81.7 C 32.3 81.9 31.3 81.8 30.7 81.7 C 30.1 81.7 29.6 81.2 29 81.2 C 28.5 81.2 28 81.7 27.4 81.7 C 26.7 81.8 25.8 81.9 25.3 81.7 C 24.9 81.4 24.8 80.6 24.6 80.1 C 24.5 79.6 24.9 79.1 24.7 78.7 C 24.5 78.2 23.9 78 23.6 77.5 C 23.3 77.1 22.9 76.4 23 75.9 C 23.2 75.5 24.1 75.2 24.6 74.9 C 25.2 74.7 25.9 74.8 26.4 74.5 C 26.8 74.3 26.9 73.7 27.4 73.3 C 27.8 73 28.5 72.4 29 72.4 C 29.6 72.4 30.3 73 30.7 73.3 C 31.2 73.7 31.3 74.3 31.7 74.5 C 32.2 74.8 32.9 74.7 33.4 74.9 C 34 75.2 34.9 75.5 35 75.9 C 35.2 76.4 34.8 77.1 34.5 77.5 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 36.1 73.3 C 35.8 73.9 35.1 74.3 34.9 74.8 C 34.7 75.4 35.1 76.1 34.9 76.7 C 34.8 77.4 34.7 78.4 34.2 78.8 C 33.7 79.1 32.6 78.9 31.9 78.8 C 31.2 78.7 30.6 78.2 30 78.2 C 29.4 78.2 28.8 78.7 28.1 78.8 C 27.4 78.9 26.3 79.1 25.8 78.8 C 25.3 78.4 25.2 77.4 25.1 76.7 C 24.9 76.1 25.3 75.4 25.1 74.8 C 24.9 74.3 24.2 73.9 23.9 73.3 C 23.6 72.7 23.1 71.8 23.3 71.3 C 23.5 70.7 24.4 70.2 25.1 69.9 C 25.7 69.6 26.5 69.8 27 69.4 C 27.5 69.1 27.6 68.3 28.1 67.8 C 28.6 67.4 29.4 66.6 30 66.6 C 30.6 66.6 31.4 67.4 31.9 67.8 C 32.4 68.3 32.5 69.1 33 69.4 C 33.5 69.8 34.3 69.6 34.9 69.9 C 35.6 70.2 36.5 70.7 36.7 71.3 C 36.9 71.8 36.4 72.7 36.1 73.3 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 34 72.2 C 33.8 72.6 33.2 72.9 33 73.3 C 32.9 73.8 33.2 74.3 33.1 74.8 C 33 75.3 32.9 76.1 32.5 76.4 C 32.1 76.7 31.2 76.5 30.7 76.5 C 30.1 76.4 29.6 76 29.1 76 C 28.6 76 28.2 76.4 27.6 76.5 C 27.1 76.5 26.2 76.7 25.8 76.4 C 25.4 76.1 25.3 75.3 25.2 74.8 C 25.1 74.3 25.4 73.8 25.2 73.3 C 25.1 72.9 24.5 72.6 24.3 72.2 C 24 71.7 23.6 71 23.8 70.6 C 23.9 70.1 24.7 69.8 25.2 69.5 C 25.7 69.3 26.3 69.4 26.7 69.1 C 27.1 68.8 27.2 68.3 27.6 67.9 C 28 67.5 28.6 67 29.1 67 C 29.6 67 30.3 67.5 30.7 67.9 C 31.1 68.3 31.1 68.8 31.6 69.1 C 32 69.4 32.6 69.3 33.1 69.5 C 33.6 69.8 34.4 70.1 34.5 70.6 C 34.7 71 34.3 71.7 34 72.2 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.8 71.4 C 29.8 71.6 29.4 72 29.2 72.2 C 29 72.4 28.7 72.4 28.5 72.6 C 28.3 72.8 28.3 73.1 28.1 73.3 C 27.9 73.5 27.6 73.8 27.3 73.8 C 27.1 73.8 26.7 73.5 26.5 73.3 C 26.3 73.1 26.3 72.8 26.1 72.6 C 25.9 72.4 25.6 72.4 25.4 72.2 C 25.2 72 24.9 71.6 24.9 71.4 C 24.9 71.1 25.2 70.8 25.4 70.6 C 25.6 70.4 25.9 70.4 26.1 70.2 C 26.3 70 26.3 69.7 26.5 69.4 C 26.7 69.2 27.1 68.9 27.3 68.9 C 27.6 68.9 27.9 69.2 28.1 69.4 C 28.3 69.7 28.3 70 28.5 70.2 C 28.7 70.4 29 70.4 29.2 70.6 C 29.4 70.8 29.8 71.1 29.8 71.4 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 35.4 68 C 35.1 68.6 34.5 68.9 34.3 69.5 C 34.1 70 34.5 70.7 34.4 71.4 C 34.3 72 34.1 73 33.7 73.4 C 33.2 73.7 32.3 73.5 31.7 73.4 C 31.1 73.3 30.6 72.8 30 72.8 C 29.4 72.8 28.9 73.3 28.3 73.4 C 27.7 73.5 26.8 73.7 26.3 73.4 C 25.9 73 25.7 72 25.6 71.4 C 25.5 70.7 25.9 70 25.7 69.5 C 25.5 68.9 24.9 68.6 24.6 68 C 24.3 67.4 23.9 66.5 24 65.9 C 24.2 65.4 25.1 64.9 25.6 64.6 C 26.2 64.3 26.9 64.5 27.3 64.1 C 27.8 63.8 27.9 63 28.3 62.6 C 28.8 62.1 29.4 61.4 30 61.4 C 30.6 61.4 31.2 62.1 31.7 62.6 C 32.1 63 32.2 63.8 32.7 64.1 C 33.1 64.5 33.8 64.3 34.4 64.6 C 34.9 64.9 35.8 65.4 36 65.9 C 36.1 66.5 35.7 67.4 35.4 68 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 33.6 66.9 C 33.3 67.3 32.8 67.6 32.7 68 C 32.6 68.5 32.8 69 32.7 69.5 C 32.7 70 32.5 70.8 32.2 71 C 31.8 71.3 31.1 71.2 30.6 71.1 C 30.1 71 29.7 70.6 29.2 70.6 C 28.8 70.6 28.4 71 27.9 71.1 C 27.4 71.2 26.7 71.3 26.3 71 C 25.9 70.8 25.8 70 25.7 69.5 C 25.7 69 25.9 68.5 25.8 68 C 25.7 67.6 25.1 67.3 24.9 66.9 C 24.7 66.4 24.3 65.7 24.5 65.3 C 24.6 64.8 25.3 64.5 25.7 64.2 C 26.2 64 26.8 64.1 27.1 63.8 C 27.5 63.6 27.6 63 27.9 62.6 C 28.3 62.3 28.8 61.7 29.2 61.7 C 29.7 61.7 30.2 62.3 30.6 62.6 C 30.9 63 31 63.6 31.4 63.8 C 31.7 64.1 32.3 64 32.7 64.2 C 33.2 64.5 33.9 64.8 34 65.3 C 34.1 65.7 33.8 66.4 33.6 66.9 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 27.4 96 Q 28.7 91 28 86 L 32 86 Q 31.3 91 32.6 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.7 91 30.2 86 L 32 86 Q 31.3 91 32.6 96 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 38.5 85 C 38.1 85.6 37.1 86 36.8 86.6 C 36.5 87.2 37 87.9 36.9 88.6 C 36.7 89.3 36.5 90.4 35.8 90.7 C 35.1 91.1 33.6 90.9 32.6 90.8 C 31.7 90.7 30.9 90.1 30 90.1 C 29.1 90.1 28.3 90.7 27.4 90.8 C 26.4 90.9 24.9 91.1 24.2 90.7 C 23.5 90.4 23.3 89.3 23.1 88.6 C 23 87.9 23.5 87.2 23.2 86.6 C 22.9 86 21.9 85.6 21.5 85 C 21.1 84.4 20.4 83.4 20.6 82.8 C 20.9 82.2 22.3 81.7 23.1 81.4 C 24 81.1 25.1 81.2 25.8 80.8 C 26.5 80.5 26.7 79.7 27.4 79.2 C 28.1 78.7 29.1 77.9 30 77.9 C 30.9 77.9 31.9 78.7 32.6 79.2 C 33.3 79.7 33.5 80.5 34.2 80.8 C 34.9 81.2 36 81.1 36.9 81.4 C 37.7 81.7 39.1 82.2 39.4 82.8 C 39.6 83.4 38.9 84.4 38.5 85 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 35.6 83.8 C 35.3 84.3 34.5 84.5 34.2 85 C 34 85.5 34.4 86 34.3 86.6 C 34.2 87.1 34 88 33.4 88.3 C 32.9 88.5 31.7 88.4 30.9 88.3 C 30.1 88.2 29.5 87.8 28.8 87.8 C 28.1 87.8 27.5 88.2 26.7 88.3 C 25.9 88.4 24.7 88.5 24.2 88.3 C 23.6 88 23.4 87.1 23.3 86.6 C 23.2 86 23.6 85.5 23.4 85 C 23.2 84.5 22.4 84.3 22 83.8 C 21.7 83.3 21.1 82.5 21.3 82.1 C 21.5 81.6 22.6 81.2 23.3 81 C 24 80.7 24.9 80.8 25.5 80.5 C 26 80.2 26.1 79.6 26.7 79.2 C 27.3 78.9 28.1 78.2 28.8 78.2 C 29.5 78.2 30.4 78.9 30.9 79.2 C 31.5 79.6 31.6 80.2 32.2 80.5 C 32.7 80.8 33.6 80.7 34.3 81 C 35 81.2 36.1 81.6 36.3 82.1 C 36.5 82.5 36 83.3 35.6 83.8 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 29.7 82.9 C 29.7 83.2 29.2 83.5 28.9 83.8 C 28.6 84 28.2 84 27.9 84.2 C 27.7 84.4 27.6 84.7 27.4 85 C 27.1 85.2 26.6 85.5 26.3 85.5 C 25.9 85.5 25.4 85.2 25.2 85 C 24.9 84.7 24.8 84.4 24.6 84.2 C 24.3 84 23.9 84 23.6 83.8 C 23.3 83.5 22.8 83.2 22.8 82.9 C 22.8 82.6 23.3 82.3 23.6 82.1 C 23.9 81.9 24.3 81.8 24.6 81.6 C 24.8 81.4 24.9 81.1 25.2 80.9 C 25.4 80.7 25.9 80.3 26.3 80.3 C 26.6 80.3 27.1 80.7 27.4 80.9 C 27.6 81.1 27.7 81.4 27.9 81.6 C 28.2 81.8 28.6 81.9 28.9 82.1 C 29.2 82.3 29.7 82.6 29.7 82.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 37.9 78.2 C 37.5 78.8 36.6 79.2 36.3 79.8 C 36.1 80.4 36.6 81.1 36.4 81.8 C 36.3 82.5 36.1 83.6 35.4 83.9 C 34.7 84.3 33.3 84.1 32.4 84 C 31.5 83.9 30.8 83.3 30 83.3 C 29.2 83.3 28.5 83.9 27.6 84 C 26.7 84.1 25.3 84.3 24.6 83.9 C 23.9 83.6 23.7 82.5 23.6 81.8 C 23.4 81.1 23.9 80.4 23.7 79.8 C 23.4 79.2 22.5 78.8 22.1 78.2 C 21.7 77.5 21 76.6 21.3 76 C 21.5 75.4 22.8 74.9 23.6 74.6 C 24.4 74.2 25.4 74.4 26.1 74 C 26.8 73.6 26.9 72.8 27.6 72.3 C 28.2 71.8 29.2 71 30 71 C 30.8 71 31.8 71.8 32.4 72.3 C 33.1 72.8 33.2 73.6 33.9 74 C 34.6 74.4 35.6 74.2 36.4 74.6 C 37.2 74.9 38.5 75.4 38.7 76 C 39 76.6 38.3 77.5 37.9 78.2 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 35.2 76.9 C 34.9 77.4 34.2 77.7 34 78.2 C 33.7 78.7 34.1 79.2 34 79.8 C 33.9 80.3 33.7 81.1 33.2 81.4 C 32.7 81.7 31.6 81.6 30.8 81.5 C 30.1 81.4 29.5 81 28.9 81 C 28.2 81 27.7 81.4 26.9 81.5 C 26.2 81.6 25.1 81.7 24.6 81.4 C 24 81.1 23.9 80.3 23.8 79.8 C 23.6 79.2 24 78.7 23.8 78.2 C 23.6 77.7 22.9 77.4 22.6 76.9 C 22.2 76.4 21.7 75.7 21.9 75.2 C 22.1 74.7 23.1 74.4 23.8 74.1 C 24.4 73.9 25.2 74 25.8 73.7 C 26.3 73.4 26.4 72.8 26.9 72.4 C 27.5 72 28.2 71.4 28.9 71.4 C 29.5 71.4 30.3 72 30.8 72.4 C 31.4 72.8 31.5 73.4 32 73.7 C 32.5 74 33.4 73.9 34 74.1 C 34.7 74.4 35.7 74.7 35.9 75.2 C 36.1 75.7 35.5 76.4 35.2 76.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 37.3 71.3 C 37 72 36.1 72.3 35.9 72.9 C 35.6 73.5 36.1 74.2 35.9 74.9 C 35.8 75.6 35.6 76.7 35 77.1 C 34.4 77.4 33.1 77.2 32.3 77.1 C 31.4 77 30.8 76.5 30 76.5 C 29.2 76.5 28.6 77 27.7 77.1 C 26.9 77.2 25.6 77.4 25 77.1 C 24.4 76.7 24.2 75.6 24.1 74.9 C 23.9 74.2 24.4 73.5 24.1 72.9 C 23.9 72.3 23 72 22.7 71.3 C 22.3 70.7 21.7 69.7 21.9 69.1 C 22.1 68.5 23.3 68.1 24.1 67.7 C 24.8 67.4 25.8 67.6 26.4 67.2 C 27 66.8 27.1 66 27.7 65.5 C 28.3 65 29.2 64.2 30 64.2 C 30.8 64.2 31.7 65 32.3 65.5 C 32.9 66 33 66.8 33.6 67.2 C 34.2 67.6 35.2 67.4 35.9 67.7 C 36.7 68.1 37.9 68.5 38.1 69.1 C 38.3 69.7 37.7 70.7 37.3 71.3 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 34.8 70.1 C 34.5 70.6 33.8 70.9 33.7 71.3 C 33.5 71.8 33.8 72.4 33.7 72.9 C 33.6 73.5 33.5 74.3 33 74.6 C 32.5 74.9 31.5 74.7 30.8 74.6 C 30.1 74.6 29.6 74.1 29 74.1 C 28.4 74.1 27.8 74.6 27.2 74.6 C 26.5 74.7 25.5 74.9 25 74.6 C 24.5 74.3 24.3 73.5 24.2 72.9 C 24.1 72.4 24.5 71.8 24.3 71.3 C 24.1 70.9 23.4 70.6 23.1 70.1 C 22.8 69.6 22.3 68.9 22.5 68.4 C 22.7 67.9 23.6 67.6 24.2 67.3 C 24.8 67.1 25.6 67.2 26.1 66.9 C 26.6 66.6 26.7 66 27.2 65.6 C 27.6 65.2 28.4 64.6 29 64.6 C 29.6 64.6 30.3 65.2 30.8 65.6 C 31.3 66 31.4 66.6 31.9 66.9 C 32.4 67.2 33.1 67.1 33.7 67.3 C 34.3 67.6 35.3 67.9 35.4 68.4 C 35.6 68.9 35.1 69.6 34.8 70.1 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 29.7 69.3 C 29.7 69.5 29.3 69.9 29.1 70.1 C 28.8 70.3 28.4 70.3 28.2 70.5 C 28 70.7 28 71.1 27.7 71.3 C 27.5 71.5 27.1 71.9 26.8 71.9 C 26.5 71.9 26.1 71.5 25.8 71.3 C 25.6 71.1 25.6 70.7 25.3 70.5 C 25.1 70.3 24.7 70.3 24.5 70.1 C 24.2 69.9 23.8 69.5 23.8 69.3 C 23.8 69 24.2 68.6 24.5 68.4 C 24.7 68.2 25.1 68.2 25.3 68 C 25.6 67.8 25.6 67.4 25.8 67.2 C 26.1 67 26.5 66.7 26.8 66.7 C 27.1 66.7 27.5 67 27.7 67.2 C 28 67.4 28 67.8 28.2 68 C 28.4 68.2 28.8 68.2 29.1 68.4 C 29.3 68.6 29.7 69 29.7 69.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 36.8 64.5 C 36.4 65.1 35.6 65.5 35.4 66.1 C 35.2 66.6 35.6 67.4 35.5 68 C 35.3 68.7 35.2 69.8 34.6 70.1 C 34 70.5 32.9 70.3 32.1 70.2 C 31.3 70.1 30.7 69.5 30 69.5 C 29.3 69.5 28.7 70.1 27.9 70.2 C 27.1 70.3 26 70.5 25.4 70.1 C 24.8 69.8 24.7 68.7 24.5 68 C 24.4 67.4 24.8 66.6 24.6 66.1 C 24.4 65.5 23.6 65.1 23.3 64.5 C 22.9 63.9 22.3 62.9 22.6 62.3 C 22.8 61.8 23.9 61.3 24.5 61 C 25.2 60.6 26.1 60.8 26.7 60.4 C 27.2 60.1 27.4 59.3 27.9 58.8 C 28.5 58.3 29.3 57.5 30 57.5 C 30.7 57.5 31.5 58.3 32.1 58.8 C 32.6 59.3 32.8 60.1 33.3 60.4 C 33.9 60.8 34.8 60.6 35.5 61 C 36.1 61.3 37.2 61.8 37.4 62.3 C 37.7 62.9 37.1 63.9 36.8 64.5 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 34.5 63.3 C 34.2 63.8 33.5 64.1 33.4 64.5 C 33.2 65 33.5 65.5 33.4 66.1 C 33.3 66.6 33.2 67.4 32.7 67.7 C 32.3 68 31.3 67.8 30.7 67.8 C 30.1 67.7 29.6 67.2 29.1 67.2 C 28.5 67.2 28 67.7 27.4 67.8 C 26.8 67.8 25.8 68 25.4 67.7 C 24.9 67.4 24.8 66.6 24.7 66.1 C 24.6 65.5 24.9 65 24.7 64.5 C 24.6 64.1 23.9 63.8 23.7 63.3 C 23.4 62.8 22.9 62.1 23.1 61.6 C 23.3 61.2 24.1 60.8 24.7 60.5 C 25.2 60.3 25.9 60.4 26.4 60.1 C 26.8 59.8 26.9 59.2 27.4 58.8 C 27.8 58.5 28.5 57.9 29.1 57.9 C 29.6 57.9 30.3 58.5 30.7 58.8 C 31.2 59.2 31.3 59.8 31.7 60.1 C 32.2 60.4 32.9 60.3 33.4 60.5 C 34 60.8 34.8 61.2 35 61.6 C 35.2 62.1 34.7 62.8 34.5 63.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 36.2 57.7 C 35.9 58.3 35.1 58.6 34.9 59.2 C 34.7 59.8 35.1 60.4 35 61.1 C 34.9 61.8 34.7 62.8 34.2 63.1 C 33.7 63.5 32.6 63.3 31.9 63.2 C 31.2 63.1 30.6 62.6 30 62.6 C 29.4 62.6 28.8 63.1 28.1 63.2 C 27.4 63.3 26.3 63.5 25.8 63.1 C 25.3 62.8 25.1 61.8 25 61.1 C 24.9 60.4 25.3 59.8 25.1 59.2 C 24.9 58.6 24.1 58.3 23.8 57.7 C 23.5 57.1 23 56.1 23.2 55.6 C 23.4 55 24.4 54.5 25 54.2 C 25.6 53.9 26.4 54.1 27 53.7 C 27.5 53.3 27.6 52.6 28.1 52.1 C 28.6 51.6 29.4 50.9 30 50.9 C 30.6 50.9 31.4 51.6 31.9 52.1 C 32.4 52.6 32.5 53.3 33 53.7 C 33.6 54.1 34.4 53.9 35 54.2 C 35.6 54.5 36.6 55 36.8 55.6 C 37 56.1 36.5 57.1 36.2 57.7 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 34.1 56.5 C 33.8 57 33.2 57.2 33.1 57.7 C 32.9 58.1 33.2 58.7 33.1 59.2 C 33 59.7 32.9 60.5 32.5 60.8 C 32.1 61 31.2 60.9 30.7 60.8 C 30.1 60.8 29.6 60.3 29.1 60.3 C 28.6 60.3 28.2 60.8 27.6 60.8 C 27.1 60.9 26.2 61 25.8 60.8 C 25.4 60.5 25.2 59.7 25.1 59.2 C 25 58.7 25.4 58.1 25.2 57.7 C 25 57.2 24.5 57 24.2 56.5 C 24 56 23.5 55.3 23.7 54.9 C 23.9 54.4 24.6 54.1 25.1 53.8 C 25.6 53.6 26.3 53.7 26.7 53.4 C 27.1 53.1 27.2 52.5 27.6 52.2 C 28 51.8 28.6 51.2 29.1 51.2 C 29.6 51.2 30.3 51.8 30.7 52.2 C 31.1 52.5 31.2 53.1 31.6 53.4 C 32 53.7 32.6 53.6 33.1 53.8 C 33.6 54.1 34.4 54.4 34.6 54.9 C 34.7 55.3 34.3 56 34.1 56.5 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 29.8 55.7 C 29.8 55.9 29.4 56.3 29.2 56.5 C 29 56.7 28.7 56.7 28.5 56.9 C 28.3 57.1 28.3 57.4 28.1 57.6 C 27.9 57.8 27.6 58.2 27.3 58.2 C 27 58.2 26.7 57.8 26.5 57.6 C 26.3 57.4 26.3 57.1 26.1 56.9 C 25.9 56.7 25.6 56.7 25.3 56.5 C 25.1 56.3 24.8 55.9 24.8 55.7 C 24.8 55.4 25.1 55.1 25.3 54.9 C 25.6 54.7 25.9 54.7 26.1 54.5 C 26.3 54.3 26.3 54 26.5 53.7 C 26.7 53.5 27 53.2 27.3 53.2 C 27.6 53.2 27.9 53.5 28.1 53.7 C 28.3 54 28.3 54.3 28.5 54.5 C 28.7 54.7 29 54.7 29.2 54.9 C 29.4 55.1 29.8 55.4 29.8 55.7 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 35.6 50.8 C 35.3 51.4 34.6 51.7 34.5 52.3 C 34.3 52.8 34.6 53.5 34.5 54.1 C 34.4 54.8 34.3 55.8 33.8 56.1 C 33.3 56.4 32.4 56.3 31.7 56.2 C 31.1 56.1 30.6 55.5 30 55.5 C 29.4 55.5 28.9 56.1 28.3 56.2 C 27.6 56.3 26.7 56.4 26.2 56.1 C 25.7 55.8 25.6 54.8 25.5 54.1 C 25.4 53.5 25.7 52.8 25.5 52.3 C 25.4 51.7 24.7 51.4 24.4 50.8 C 24.1 50.3 23.7 49.4 23.8 48.8 C 24 48.3 24.9 47.8 25.5 47.5 C 26.1 47.2 26.8 47.4 27.2 47 C 27.7 46.7 27.8 46 28.3 45.5 C 28.7 45.1 29.4 44.3 30 44.3 C 30.6 44.3 31.3 45.1 31.7 45.5 C 32.2 46 32.3 46.7 32.8 47 C 33.2 47.4 33.9 47.2 34.5 47.5 C 35.1 47.8 36 48.3 36.2 48.8 C 36.3 49.4 35.9 50.3 35.6 50.8 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 33.7 49.7 C 33.5 50.2 32.9 50.4 32.8 50.8 C 32.6 51.3 32.9 51.8 32.8 52.3 C 32.7 52.8 32.6 53.5 32.3 53.8 C 31.9 54.1 31.1 53.9 30.6 53.9 C 30.1 53.8 29.7 53.4 29.2 53.4 C 28.8 53.4 28.3 53.8 27.8 53.9 C 27.3 53.9 26.5 54.1 26.2 53.8 C 25.8 53.5 25.7 52.8 25.6 52.3 C 25.5 51.8 25.8 51.3 25.6 50.8 C 25.5 50.4 25 50.2 24.8 49.7 C 24.5 49.3 24.1 48.6 24.3 48.1 C 24.4 47.7 25.2 47.4 25.6 47.1 C 26.1 46.9 26.6 47 27 46.7 C 27.4 46.5 27.5 45.9 27.8 45.6 C 28.2 45.2 28.8 44.6 29.2 44.6 C 29.7 44.6 30.2 45.2 30.6 45.6 C 31 45.9 31.1 46.5 31.4 46.7 C 31.8 47 32.4 46.9 32.8 47.1 C 33.3 47.4 34 47.7 34.1 48.1 C 34.3 48.6 33.9 49.3 33.7 49.7 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 35 44 C 34.7 44.5 34.2 44.9 34 45.4 C 33.8 45.9 34.1 46.5 34 47.1 C 33.9 47.7 33.8 48.7 33.4 49 C 33 49.3 32.1 49.1 31.5 49 C 31 49 30.5 48.5 30 48.5 C 29.5 48.5 29 49 28.5 49 C 27.9 49.1 27 49.3 26.6 49 C 26.2 48.7 26.1 47.7 26 47.1 C 25.9 46.5 26.2 45.9 26 45.4 C 25.8 44.9 25.3 44.5 25 44 C 24.7 43.5 24.3 42.6 24.5 42.1 C 24.6 41.6 25.4 41.2 26 40.9 C 26.5 40.6 27.1 40.7 27.5 40.4 C 27.9 40.1 28 39.4 28.5 39 C 28.9 38.5 29.5 37.9 30 37.9 C 30.5 37.9 31.1 38.5 31.5 39 C 32 39.4 32.1 40.1 32.5 40.4 C 32.9 40.7 33.5 40.6 34 40.9 C 34.6 41.2 35.4 41.6 35.5 42.1 C 35.7 42.6 35.3 43.5 35 44 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 33.3 42.9 C 33.1 43.4 32.6 43.6 32.5 44 C 32.4 44.4 32.6 44.9 32.5 45.4 C 32.5 45.8 32.4 46.6 32 46.8 C 31.7 47.1 31 46.9 30.5 46.9 C 30.1 46.8 29.7 46.4 29.3 46.4 C 28.9 46.4 28.5 46.8 28.1 46.9 C 27.6 46.9 26.9 47.1 26.6 46.8 C 26.2 46.6 26.1 45.8 26.1 45.4 C 26 44.9 26.2 44.4 26.1 44 C 26 43.6 25.5 43.4 25.3 42.9 C 25.1 42.5 24.8 41.9 24.9 41.5 C 25 41.1 25.7 40.7 26.1 40.5 C 26.5 40.3 27 40.4 27.3 40.1 C 27.7 39.9 27.7 39.3 28.1 39 C 28.4 38.7 28.9 38.1 29.3 38.1 C 29.7 38.1 30.2 38.7 30.5 39 C 30.9 39.3 30.9 39.9 31.3 40.1 C 31.6 40.4 32.1 40.3 32.5 40.5 C 32.9 40.7 33.6 41.1 33.7 41.5 C 33.8 41.9 33.5 42.5 33.3 42.9 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 29.8 42.2 C 29.8 42.4 29.5 42.7 29.4 42.9 C 29.2 43.1 28.9 43.1 28.8 43.3 C 28.6 43.5 28.6 43.8 28.5 44 C 28.3 44.2 28 44.4 27.8 44.4 C 27.6 44.4 27.3 44.2 27.1 44 C 27 43.8 27 43.5 26.8 43.3 C 26.7 43.1 26.4 43.1 26.2 42.9 C 26.1 42.7 25.8 42.4 25.8 42.2 C 25.8 42 26.1 41.7 26.2 41.5 C 26.4 41.3 26.7 41.3 26.8 41.1 C 27 40.9 27 40.6 27.1 40.4 C 27.3 40.2 27.6 39.9 27.8 39.9 C 28 39.9 28.3 40.2 28.5 40.4 C 28.6 40.6 28.6 40.9 28.8 41.1 C 28.9 41.3 29.2 41.3 29.4 41.5 C 29.5 41.7 29.8 42 29.8 42.2 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 27 96 Q 28.5 91 27.8 86 L 32.2 86 Q 31.5 91 33 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.8 91 30.2 86 L 32.2 86 Q 31.5 91 33 96 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 39.5 85 C 39 85.7 37.9 86.1 37.6 86.8 C 37.3 87.4 37.9 88.2 37.7 89 C 37.5 89.8 37.3 91 36.5 91.4 C 35.7 91.8 34 91.6 32.9 91.5 C 31.9 91.4 31 90.7 30 90.7 C 29 90.7 28.1 91.4 27.1 91.5 C 26 91.6 24.3 91.8 23.5 91.4 C 22.7 91 22.5 89.8 22.3 89 C 22.1 88.2 22.7 87.4 22.4 86.8 C 22.1 86.1 21 85.7 20.5 85 C 20 84.3 19.2 83.2 19.5 82.5 C 19.8 81.9 21.3 81.3 22.3 81 C 23.3 80.6 24.5 80.8 25.3 80.4 C 26.1 79.9 26.3 79 27.1 78.5 C 27.8 77.9 29 77.1 30 77.1 C 31 77.1 32.2 77.9 32.9 78.5 C 33.7 79 33.9 79.9 34.7 80.4 C 35.5 80.8 36.7 80.6 37.7 81 C 38.7 81.3 40.2 81.9 40.5 82.5 C 40.8 83.2 40 84.3 39.5 85 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 36.3 83.6 C 35.9 84.2 35 84.5 34.7 85 C 34.5 85.5 35 86.2 34.8 86.8 C 34.7 87.4 34.5 88.3 33.9 88.6 C 33.2 89 31.9 88.8 31 88.7 C 30.2 88.6 29.5 88.1 28.7 88.1 C 27.9 88.1 27.2 88.6 26.3 88.7 C 25.5 88.8 24.1 89 23.5 88.6 C 22.9 88.3 22.7 87.4 22.5 86.8 C 22.4 86.2 22.8 85.5 22.6 85 C 22.4 84.5 21.5 84.2 21.1 83.6 C 20.7 83.1 20 82.2 20.3 81.7 C 20.5 81.2 21.7 80.8 22.5 80.5 C 23.3 80.2 24.3 80.3 24.9 80 C 25.6 79.7 25.7 79 26.3 78.6 C 26.9 78.1 27.9 77.4 28.7 77.4 C 29.5 77.4 30.4 78.1 31 78.6 C 31.6 79 31.8 79.7 32.4 80 C 33.1 80.3 34 80.2 34.8 80.5 C 35.6 80.8 36.8 81.2 37.1 81.7 C 37.3 82.2 36.7 83.1 36.3 83.6 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.6 82.7 C 29.6 83 29.1 83.4 28.8 83.6 C 28.5 83.9 28 83.9 27.7 84.1 C 27.4 84.3 27.4 84.7 27.1 84.9 C 26.7 85.2 26.2 85.6 25.8 85.6 C 25.4 85.6 24.9 85.2 24.6 84.9 C 24.3 84.7 24.2 84.3 23.9 84.1 C 23.7 83.9 23.2 83.9 22.8 83.6 C 22.5 83.4 22 83 22 82.7 C 22 82.4 22.5 82 22.8 81.7 C 23.2 81.5 23.7 81.5 23.9 81.2 C 24.2 81 24.3 80.6 24.6 80.4 C 24.9 80.2 25.4 79.8 25.8 79.8 C 26.2 79.8 26.7 80.2 27.1 80.4 C 27.4 80.6 27.4 81 27.7 81.2 C 28 81.5 28.5 81.5 28.8 81.7 C 29.1 82 29.6 82.4 29.6 82.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 39 78.7 C 38.5 79.4 37.5 79.8 37.2 80.4 C 36.9 81.1 37.5 81.9 37.3 82.7 C 37.1 83.4 36.9 84.7 36.1 85.1 C 35.4 85.5 33.8 85.3 32.8 85.2 C 31.8 85 30.9 84.4 30 84.4 C 29.1 84.4 28.2 85 27.2 85.2 C 26.2 85.3 24.6 85.5 23.9 85.1 C 23.1 84.7 22.9 83.4 22.7 82.7 C 22.5 81.9 23.1 81.1 22.8 80.4 C 22.5 79.8 21.5 79.4 21 78.7 C 20.5 78 19.8 76.9 20.1 76.2 C 20.4 75.6 21.8 75 22.7 74.7 C 23.6 74.3 24.8 74.4 25.6 74 C 26.3 73.6 26.5 72.7 27.2 72.2 C 28 71.6 29.1 70.8 30 70.8 C 30.9 70.8 32 71.6 32.8 72.2 C 33.5 72.7 33.7 73.6 34.4 74 C 35.2 74.4 36.4 74.3 37.3 74.7 C 38.2 75 39.6 75.6 39.9 76.2 C 40.2 76.9 39.5 78 39 78.7 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 35.9 77.3 C 35.6 77.9 34.7 78.2 34.5 78.7 C 34.3 79.2 34.7 79.8 34.6 80.4 C 34.4 81 34.2 82 33.6 82.3 C 33 82.6 31.8 82.4 31 82.4 C 30.1 82.3 29.5 81.8 28.7 81.8 C 28 81.8 27.3 82.3 26.5 82.4 C 25.7 82.4 24.4 82.6 23.8 82.3 C 23.2 82 23.1 81 22.9 80.4 C 22.8 79.8 23.2 79.2 23 78.7 C 22.8 78.2 21.9 77.9 21.5 77.3 C 21.2 76.8 20.6 75.9 20.8 75.4 C 21 74.9 22.2 74.5 22.9 74.2 C 23.6 73.9 24.6 74 25.2 73.7 C 25.8 73.4 25.9 72.7 26.5 72.2 C 27.1 71.8 28 71.1 28.7 71.1 C 29.5 71.1 30.4 71.8 31 72.2 C 31.6 72.7 31.7 73.4 32.3 73.7 C 32.9 74 33.8 73.9 34.6 74.2 C 35.3 74.5 36.5 74.9 36.7 75.4 C 36.9 75.9 36.3 76.8 35.9 77.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 38.5 72.3 C 38.1 73 37.1 73.4 36.8 74.1 C 36.5 74.8 37 75.5 36.9 76.3 C 36.7 77.1 36.5 78.3 35.8 78.7 C 35.1 79.1 33.6 78.9 32.6 78.8 C 31.7 78.7 30.9 78 30 78 C 29.1 78 28.3 78.7 27.4 78.8 C 26.4 78.9 24.9 79.1 24.2 78.7 C 23.5 78.3 23.3 77.1 23.1 76.3 C 23 75.5 23.5 74.8 23.2 74.1 C 22.9 73.4 21.9 73 21.5 72.3 C 21.1 71.6 20.4 70.6 20.6 69.9 C 20.9 69.2 22.3 68.7 23.1 68.4 C 24 68 25.1 68.1 25.8 67.7 C 26.5 67.3 26.7 66.4 27.4 65.9 C 28.1 65.4 29.1 64.5 30 64.5 C 30.9 64.5 31.9 65.4 32.6 65.9 C 33.3 66.4 33.5 67.3 34.2 67.7 C 34.9 68.1 36 68 36.9 68.4 C 37.7 68.7 39.1 69.2 39.4 69.9 C 39.6 70.6 38.9 71.6 38.5 72.3 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 35.6 71 C 35.3 71.5 34.5 71.8 34.2 72.4 C 34 72.9 34.4 73.5 34.3 74.1 C 34.2 74.7 34 75.6 33.4 75.9 C 32.9 76.3 31.7 76.1 30.9 76 C 30.1 75.9 29.5 75.4 28.8 75.4 C 28.1 75.4 27.5 75.9 26.7 76 C 25.9 76.1 24.7 76.3 24.2 75.9 C 23.6 75.6 23.4 74.7 23.3 74.1 C 23.2 73.5 23.6 72.9 23.4 72.4 C 23.2 71.8 22.4 71.5 22 71 C 21.7 70.4 21.1 69.6 21.3 69.1 C 21.5 68.6 22.6 68.2 23.3 67.9 C 24 67.6 24.9 67.7 25.5 67.4 C 26 67.1 26.1 66.4 26.7 66 C 27.3 65.5 28.1 64.9 28.8 64.9 C 29.5 64.9 30.4 65.5 30.9 66 C 31.5 66.4 31.6 67.1 32.2 67.4 C 32.7 67.7 33.6 67.6 34.3 67.9 C 35 68.2 36.1 68.6 36.3 69.1 C 36.5 69.6 36 70.4 35.6 71 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.7 70 C 29.7 70.3 29.2 70.7 28.9 71 C 28.6 71.2 28.2 71.2 27.9 71.4 C 27.7 71.7 27.6 72 27.4 72.3 C 27.1 72.5 26.6 72.9 26.3 72.9 C 25.9 72.9 25.4 72.5 25.2 72.3 C 24.9 72 24.8 71.7 24.6 71.4 C 24.3 71.2 23.9 71.2 23.6 71 C 23.3 70.7 22.8 70.3 22.8 70 C 22.8 69.7 23.3 69.3 23.6 69.1 C 23.9 68.9 24.3 68.8 24.6 68.6 C 24.8 68.4 24.9 68 25.2 67.8 C 25.4 67.5 25.9 67.2 26.3 67.2 C 26.6 67.2 27.1 67.5 27.4 67.8 C 27.6 68 27.7 68.4 27.9 68.6 C 28.2 68.8 28.6 68.9 28.9 69.1 C 29.2 69.3 29.7 69.7 29.7 70 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 38 66 C 37.6 66.7 36.6 67.1 36.4 67.7 C 36.1 68.4 36.6 69.2 36.5 69.9 C 36.3 70.7 36.1 71.9 35.5 72.3 C 34.8 72.7 33.4 72.4 32.5 72.3 C 31.6 72.2 30.8 71.6 30 71.6 C 29.2 71.6 28.4 72.2 27.5 72.3 C 26.6 72.4 25.2 72.7 24.5 72.3 C 23.9 71.9 23.7 70.7 23.5 69.9 C 23.4 69.2 23.9 68.4 23.6 67.7 C 23.4 67.1 22.4 66.7 22 66 C 21.6 65.3 20.9 64.3 21.2 63.6 C 21.4 63 22.7 62.4 23.5 62.1 C 24.3 61.7 25.4 61.9 26.1 61.5 C 26.7 61.1 26.9 60.2 27.5 59.7 C 28.2 59.1 29.2 58.3 30 58.3 C 30.8 58.3 31.8 59.1 32.5 59.7 C 33.1 60.2 33.3 61.1 33.9 61.5 C 34.6 61.9 35.7 61.7 36.5 62.1 C 37.3 62.4 38.6 63 38.8 63.6 C 39.1 64.3 38.4 65.3 38 66 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 35.3 64.7 C 35 65.2 34.2 65.5 34 66 C 33.8 66.5 34.2 67.1 34.1 67.7 C 33.9 68.3 33.8 69.2 33.2 69.5 C 32.7 69.9 31.6 69.7 30.9 69.6 C 30.1 69.5 29.5 69 28.9 69 C 28.2 69 27.6 69.5 26.9 69.6 C 26.2 69.7 25 69.9 24.5 69.5 C 24 69.2 23.8 68.3 23.7 67.7 C 23.6 67.1 24 66.5 23.8 66 C 23.6 65.5 22.8 65.2 22.5 64.7 C 22.2 64.1 21.6 63.3 21.8 62.8 C 22 62.3 23.1 61.9 23.7 61.6 C 24.4 61.3 25.2 61.4 25.7 61.1 C 26.3 60.8 26.4 60.1 26.9 59.7 C 27.4 59.3 28.2 58.6 28.9 58.6 C 29.5 58.6 30.3 59.3 30.9 59.7 C 31.4 60.1 31.5 60.8 32 61.1 C 32.6 61.4 33.4 61.3 34.1 61.6 C 34.7 61.9 35.7 62.3 35.9 62.8 C 36.1 63.3 35.6 64.1 35.3 64.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 37.5 59.7 C 37.1 60.3 36.2 60.7 36 61.4 C 35.8 62 36.2 62.8 36.1 63.5 C 35.9 64.2 35.7 65.4 35.1 65.8 C 34.5 66.2 33.2 66 32.3 65.9 C 31.5 65.8 30.8 65.2 30 65.2 C 29.2 65.2 28.5 65.8 27.7 65.9 C 26.8 66 25.5 66.2 24.9 65.8 C 24.3 65.4 24.1 64.2 23.9 63.5 C 23.8 62.8 24.2 62 24 61.4 C 23.8 60.7 22.9 60.3 22.5 59.7 C 22.1 59 21.5 58 21.7 57.3 C 22 56.7 23.2 56.2 23.9 55.8 C 24.7 55.5 25.7 55.6 26.3 55.2 C 26.9 54.8 27.1 54 27.7 53.5 C 28.3 52.9 29.2 52.1 30 52.1 C 30.8 52.1 31.7 52.9 32.3 53.5 C 32.9 54 33.1 54.8 33.7 55.2 C 34.3 55.6 35.3 55.5 36.1 55.8 C 36.8 56.2 38 56.7 38.3 57.3 C 38.5 58 37.9 59 37.5 59.7 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 35 58.4 C 34.6 58.9 33.9 59.2 33.7 59.7 C 33.6 60.2 33.9 60.8 33.8 61.4 C 33.7 61.9 33.5 62.8 33 63.1 C 32.5 63.5 31.5 63.3 30.8 63.2 C 30.1 63.1 29.6 62.6 29 62.6 C 28.3 62.6 27.8 63.1 27.1 63.2 C 26.4 63.3 25.4 63.5 24.9 63.1 C 24.4 62.8 24.2 61.9 24.1 61.4 C 24 60.8 24.3 60.2 24.2 59.7 C 24 59.2 23.3 58.9 23 58.4 C 22.6 57.8 22.1 57 22.3 56.5 C 22.5 56 23.5 55.6 24.1 55.4 C 24.7 55.1 25.5 55.2 26 54.9 C 26.5 54.6 26.6 53.9 27.1 53.5 C 27.6 53.1 28.3 52.4 29 52.4 C 29.6 52.4 30.3 53.1 30.8 53.5 C 31.3 53.9 31.4 54.6 31.9 54.9 C 32.4 55.2 33.2 55.1 33.8 55.4 C 34.4 55.6 35.4 56 35.6 56.5 C 35.8 57 35.3 57.8 35 58.4 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.7 57.4 C 29.7 57.7 29.3 58.1 29.1 58.3 C 28.8 58.6 28.4 58.6 28.2 58.8 C 27.9 59 27.9 59.4 27.7 59.6 C 27.4 59.9 27 60.2 26.7 60.2 C 26.4 60.2 26 59.9 25.7 59.6 C 25.5 59.4 25.5 59 25.2 58.8 C 25 58.6 24.6 58.6 24.3 58.3 C 24.1 58.1 23.7 57.7 23.7 57.4 C 23.7 57.1 24.1 56.8 24.3 56.5 C 24.6 56.3 25 56.3 25.2 56.1 C 25.5 55.9 25.5 55.5 25.7 55.3 C 26 55 26.4 54.7 26.7 54.7 C 27 54.7 27.4 55 27.7 55.3 C 27.9 55.5 27.9 55.9 28.2 56.1 C 28.4 56.3 28.8 56.3 29.1 56.5 C 29.3 56.8 29.7 57.1 29.7 57.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 37 53.3 C 36.6 54 35.8 54.4 35.6 55 C 35.4 55.6 35.8 56.4 35.7 57.1 C 35.5 57.8 35.4 58.9 34.8 59.3 C 34.2 59.7 33 59.5 32.2 59.4 C 31.4 59.3 30.7 58.7 30 58.7 C 29.3 58.7 28.6 59.3 27.8 59.4 C 27 59.5 25.8 59.7 25.2 59.3 C 24.6 58.9 24.5 57.8 24.3 57.1 C 24.2 56.4 24.6 55.6 24.4 55 C 24.2 54.4 23.4 54 23 53.3 C 22.6 52.7 22.1 51.7 22.3 51.1 C 22.5 50.4 23.6 49.9 24.3 49.6 C 25 49.3 26 49.4 26.5 49 C 27.1 48.6 27.3 47.8 27.8 47.3 C 28.4 46.8 29.3 46 30 46 C 30.7 46 31.6 46.8 32.2 47.3 C 32.7 47.8 32.9 48.6 33.5 49 C 34 49.4 35 49.3 35.7 49.6 C 36.4 49.9 37.5 50.4 37.7 51.1 C 37.9 51.7 37.4 52.7 37 53.3 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 34.6 52.1 C 34.3 52.6 33.7 52.9 33.5 53.3 C 33.3 53.8 33.7 54.4 33.6 55 C 33.4 55.5 33.3 56.4 32.8 56.7 C 32.4 57 31.4 56.9 30.8 56.8 C 30.1 56.7 29.6 56.2 29 56.2 C 28.4 56.2 27.9 56.7 27.3 56.8 C 26.7 56.9 25.7 57 25.2 56.7 C 24.7 56.4 24.6 55.5 24.5 55 C 24.4 54.4 24.7 53.8 24.5 53.3 C 24.4 52.9 23.7 52.6 23.4 52.1 C 23.1 51.5 22.7 50.8 22.8 50.3 C 23 49.8 23.9 49.4 24.5 49.1 C 25.1 48.9 25.8 49 26.3 48.7 C 26.7 48.4 26.8 47.7 27.3 47.3 C 27.8 46.9 28.4 46.3 29 46.3 C 29.6 46.3 30.3 46.9 30.8 47.3 C 31.2 47.7 31.3 48.4 31.8 48.7 C 32.3 49 33 48.9 33.6 49.1 C 34.1 49.4 35 49.8 35.2 50.3 C 35.4 50.8 34.9 51.5 34.6 52.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 36.5 47 C 36.2 47.6 35.4 48 35.2 48.6 C 35 49.2 35.4 49.9 35.3 50.6 C 35.1 51.3 35 52.4 34.4 52.8 C 33.9 53.1 32.7 53 32 52.9 C 31.3 52.8 30.7 52.2 30 52.2 C 29.3 52.2 28.7 52.8 28 52.9 C 27.3 53 26.1 53.1 25.6 52.8 C 25 52.4 24.9 51.3 24.7 50.6 C 24.6 49.9 25 49.2 24.8 48.6 C 24.6 48 23.8 47.6 23.5 47 C 23.2 46.4 22.6 45.4 22.8 44.8 C 23 44.2 24.1 43.7 24.7 43.4 C 25.4 43.1 26.2 43.2 26.8 42.8 C 27.3 42.4 27.5 41.6 28 41.1 C 28.5 40.7 29.3 39.9 30 39.9 C 30.7 39.9 31.5 40.7 32 41.1 C 32.5 41.6 32.7 42.4 33.2 42.8 C 33.8 43.2 34.6 43.1 35.3 43.4 C 35.9 43.7 37 44.2 37.2 44.8 C 37.4 45.4 36.8 46.4 36.5 47 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 34.3 45.8 C 34 46.3 33.4 46.5 33.2 47 C 33.1 47.5 33.4 48 33.3 48.6 C 33.2 49.1 33.1 50 32.6 50.3 C 32.2 50.6 31.3 50.4 30.7 50.3 C 30.1 50.3 29.6 49.8 29.1 49.8 C 28.6 49.8 28.1 50.3 27.5 50.3 C 26.9 50.4 26 50.6 25.5 50.3 C 25.1 50 25 49.1 24.9 48.6 C 24.8 48 25.1 47.5 24.9 47 C 24.8 46.5 24.2 46.3 23.9 45.8 C 23.6 45.3 23.2 44.5 23.4 44 C 23.5 43.6 24.4 43.2 24.9 42.9 C 25.4 42.7 26.1 42.8 26.5 42.5 C 27 42.2 27.1 41.6 27.5 41.2 C 27.9 40.8 28.6 40.2 29.1 40.2 C 29.6 40.2 30.3 40.8 30.7 41.2 C 31.1 41.6 31.2 42.2 31.7 42.5 C 32.1 42.8 32.8 42.7 33.3 42.9 C 33.8 43.2 34.7 43.6 34.8 44 C 35 44.5 34.6 45.3 34.3 45.8 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.7 44.9 C 29.7 45.2 29.4 45.5 29.2 45.8 C 29 46 28.6 46 28.4 46.2 C 28.2 46.4 28.2 46.7 28 47 C 27.8 47.2 27.4 47.5 27.1 47.5 C 26.9 47.5 26.5 47.2 26.3 47 C 26.1 46.7 26.1 46.4 25.9 46.2 C 25.7 46 25.3 46 25.1 45.8 C 24.9 45.5 24.5 45.2 24.5 44.9 C 24.5 44.6 24.9 44.3 25.1 44.1 C 25.3 43.8 25.7 43.8 25.9 43.6 C 26.1 43.4 26.1 43.1 26.3 42.9 C 26.5 42.6 26.9 42.3 27.1 42.3 C 27.4 42.3 27.8 42.6 28 42.9 C 28.2 43.1 28.2 43.4 28.4 43.6 C 28.6 43.8 29 43.8 29.2 44.1 C 29.4 44.3 29.7 44.6 29.7 44.9 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 36 40.7 C 35.7 41.3 35 41.6 34.8 42.2 C 34.6 42.8 35 43.5 34.9 44.1 C 34.7 44.8 34.6 45.9 34.1 46.2 C 33.6 46.6 32.5 46.4 31.9 46.3 C 31.2 46.2 30.6 45.6 30 45.6 C 29.4 45.6 28.8 46.2 28.1 46.3 C 27.5 46.4 26.4 46.6 25.9 46.2 C 25.4 45.9 25.3 44.8 25.1 44.1 C 25 43.5 25.4 42.8 25.2 42.2 C 25 41.6 24.3 41.3 24 40.7 C 23.7 40.1 23.2 39.1 23.4 38.5 C 23.6 38 24.5 37.5 25.1 37.2 C 25.8 36.9 26.5 37 27 36.7 C 27.5 36.3 27.7 35.5 28.1 35 C 28.6 34.6 29.4 33.8 30 33.8 C 30.6 33.8 31.4 34.6 31.9 35 C 32.3 35.5 32.5 36.3 33 36.7 C 33.5 37 34.2 36.9 34.9 37.2 C 35.5 37.5 36.4 38 36.6 38.5 C 36.8 39.1 36.3 40.1 36 40.7 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 34 39.5 C 33.7 40 33.1 40.2 33 40.7 C 32.8 41.1 33.1 41.7 33 42.2 C 32.9 42.7 32.8 43.5 32.4 43.8 C 32 44.1 31.2 43.9 30.6 43.9 C 30.1 43.8 29.7 43.4 29.2 43.4 C 28.7 43.4 28.2 43.8 27.7 43.9 C 27.1 43.9 26.3 44.1 25.9 43.8 C 25.5 43.5 25.4 42.7 25.3 42.2 C 25.2 41.7 25.5 41.1 25.3 40.7 C 25.2 40.2 24.6 40 24.4 39.5 C 24.1 39 23.7 38.3 23.9 37.8 C 24 37.4 24.8 37 25.3 36.8 C 25.8 36.5 26.4 36.6 26.8 36.4 C 27.2 36.1 27.3 35.5 27.7 35.1 C 28.1 34.7 28.7 34.1 29.2 34.1 C 29.7 34.1 30.2 34.7 30.6 35.1 C 31 35.5 31.1 36.1 31.5 36.4 C 31.9 36.6 32.6 36.5 33 36.8 C 33.5 37 34.3 37.4 34.5 37.8 C 34.6 38.3 34.2 39 34 39.5 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.5 34.3 C 35.2 34.9 34.6 35.2 34.4 35.8 C 34.2 36.3 34.6 37 34.4 37.6 C 34.3 38.3 34.2 39.3 33.8 39.6 C 33.3 39.9 32.3 39.8 31.7 39.7 C 31.1 39.6 30.6 39.1 30 39.1 C 29.4 39.1 28.9 39.6 28.3 39.7 C 27.7 39.8 26.7 39.9 26.2 39.6 C 25.8 39.3 25.7 38.3 25.6 37.6 C 25.4 37 25.8 36.3 25.6 35.8 C 25.4 35.2 24.8 34.9 24.5 34.3 C 24.2 33.8 23.8 32.9 23.9 32.3 C 24.1 31.8 25 31.3 25.6 31 C 26.1 30.7 26.8 30.9 27.3 30.5 C 27.7 30.2 27.8 29.4 28.3 29 C 28.8 28.5 29.4 27.8 30 27.8 C 30.6 27.8 31.2 28.5 31.7 29 C 32.2 29.4 32.3 30.2 32.7 30.5 C 33.2 30.9 33.9 30.7 34.4 31 C 35 31.3 35.9 31.8 36.1 32.3 C 36.2 32.9 35.8 33.8 35.5 34.3 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 33.6 33.2 C 33.4 33.7 32.9 33.9 32.7 34.3 C 32.6 34.8 32.9 35.3 32.8 35.8 C 32.7 36.3 32.6 37.1 32.2 37.3 C 31.9 37.6 31.1 37.5 30.6 37.4 C 30.1 37.3 29.7 36.9 29.2 36.9 C 28.8 36.9 28.4 37.3 27.9 37.4 C 27.4 37.5 26.6 37.6 26.2 37.3 C 25.9 37.1 25.8 36.3 25.7 35.8 C 25.6 35.3 25.9 34.8 25.7 34.3 C 25.6 33.9 25.1 33.7 24.8 33.2 C 24.6 32.8 24.2 32.1 24.4 31.6 C 24.5 31.2 25.2 30.9 25.7 30.6 C 26.1 30.4 26.7 30.5 27.1 30.2 C 27.4 30 27.5 29.4 27.9 29 C 28.2 28.7 28.8 28.1 29.2 28.1 C 29.7 28.1 30.2 28.7 30.6 29 C 31 29.4 31 30 31.4 30.2 C 31.8 30.5 32.3 30.4 32.8 30.6 C 33.2 30.9 33.9 31.2 34.1 31.6 C 34.2 32.1 33.9 32.8 33.6 33.2 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.8 32.4 C 29.8 32.7 29.5 33 29.3 33.2 C 29.1 33.4 28.8 33.4 28.7 33.6 C 28.5 33.8 28.5 34.1 28.3 34.3 C 28.1 34.5 27.8 34.8 27.6 34.8 C 27.3 34.8 27 34.5 26.9 34.3 C 26.7 34.1 26.7 33.8 26.5 33.6 C 26.3 33.4 26 33.4 25.9 33.2 C 25.7 33 25.4 32.7 25.4 32.4 C 25.4 32.2 25.7 31.8 25.9 31.6 C 26 31.5 26.3 31.4 26.5 31.2 C 26.7 31.1 26.7 30.8 26.9 30.6 C 27 30.3 27.3 30 27.6 30 C 27.8 30 28.1 30.3 28.3 30.6 C 28.5 30.8 28.5 31.1 28.7 31.2 C 28.8 31.4 29.1 31.5 29.3 31.6 C 29.5 31.8 29.8 32.2 29.8 32.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 35 28 C 34.7 28.5 34.2 28.9 34 29.4 C 33.8 29.9 34.1 30.5 34 31.1 C 33.9 31.7 33.8 32.7 33.4 33 C 33 33.3 32.1 33.1 31.5 33 C 31 33 30.5 32.5 30 32.5 C 29.5 32.5 29 33 28.5 33 C 27.9 33.1 27 33.3 26.6 33 C 26.2 32.7 26.1 31.7 26 31.1 C 25.9 30.5 26.2 29.9 26 29.4 C 25.8 28.9 25.3 28.5 25 28 C 24.7 27.5 24.3 26.6 24.5 26.1 C 24.6 25.6 25.4 25.2 26 24.9 C 26.5 24.6 27.1 24.7 27.5 24.4 C 27.9 24.1 28 23.4 28.5 23 C 28.9 22.5 29.5 21.9 30 21.9 C 30.5 21.9 31.1 22.5 31.5 23 C 32 23.4 32.1 24.1 32.5 24.4 C 32.9 24.7 33.5 24.6 34 24.9 C 34.6 25.2 35.4 25.6 35.5 26.1 C 35.7 26.6 35.3 27.5 35 28 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 33.3 26.9 C 33.1 27.4 32.6 27.6 32.5 28 C 32.4 28.4 32.6 28.9 32.5 29.4 C 32.5 29.8 32.4 30.6 32 30.8 C 31.7 31.1 31 30.9 30.5 30.9 C 30.1 30.8 29.7 30.4 29.3 30.4 C 28.9 30.4 28.5 30.8 28.1 30.9 C 27.6 30.9 26.9 31.1 26.6 30.8 C 26.2 30.6 26.1 29.8 26.1 29.4 C 26 28.9 26.2 28.4 26.1 28 C 26 27.6 25.5 27.4 25.3 26.9 C 25.1 26.5 24.8 25.9 24.9 25.5 C 25 25.1 25.7 24.7 26.1 24.5 C 26.5 24.3 27 24.4 27.3 24.1 C 27.7 23.9 27.7 23.3 28.1 23 C 28.4 22.7 28.9 22.1 29.3 22.1 C 29.7 22.1 30.2 22.7 30.5 23 C 30.9 23.3 30.9 23.9 31.3 24.1 C 31.6 24.4 32.1 24.3 32.5 24.5 C 32.9 24.7 33.6 25.1 33.7 25.5 C 33.8 25.9 33.5 26.5 33.3 26.9 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 26.6 96 Q 28.3 91 27.6 86 L 32.4 86 Q 31.7 91 33.4 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.6 96 Q 31 91 30.2 86 L 32.4 86 Q 31.7 91 33.4 96 Z', from: 5 },
        { tone: 'deep', d: 'M 40.5 85 C 40 85.8 38.7 86.2 38.4 87 C 38.1 87.7 38.7 88.6 38.5 89.4 C 38.3 90.3 38 91.6 37.2 92.1 C 36.3 92.6 34.4 92.3 33.2 92.2 C 32.1 92.1 31.1 91.4 30 91.4 C 28.9 91.4 27.9 92.1 26.8 92.2 C 25.6 92.3 23.7 92.6 22.8 92.1 C 22 91.6 21.7 90.3 21.5 89.4 C 21.3 88.6 21.9 87.7 21.6 87 C 21.3 86.2 20 85.8 19.5 85 C 19 84.2 18.1 83 18.4 82.3 C 18.8 81.5 20.4 81 21.5 80.6 C 22.6 80.2 23.9 80.3 24.8 79.9 C 25.7 79.4 25.9 78.4 26.8 77.8 C 27.6 77.2 28.9 76.2 30 76.2 C 31.1 76.2 32.4 77.2 33.2 77.8 C 34.1 78.4 34.3 79.4 35.2 79.9 C 36.1 80.3 37.4 80.2 38.5 80.6 C 39.6 81 41.2 81.5 41.6 82.3 C 41.9 83 41 84.2 40.5 85 Z', from: 5 },
        { tone: 'base', d: 'M 36.9 83.5 C 36.5 84.1 35.5 84.4 35.2 85 C 35 85.6 35.5 86.3 35.3 87 C 35.2 87.6 35 88.7 34.3 89 C 33.6 89.4 32.1 89.2 31.1 89.1 C 30.2 89 29.4 88.4 28.5 88.4 C 27.7 88.4 26.9 89 25.9 89.1 C 25 89.2 23.5 89.4 22.8 89 C 22.1 88.7 21.9 87.6 21.7 87 C 21.6 86.3 22.1 85.6 21.8 85 C 21.6 84.4 20.6 84.1 20.1 83.5 C 19.7 82.9 19 82 19.3 81.4 C 19.5 80.8 20.9 80.3 21.7 80 C 22.6 79.7 23.7 79.8 24.4 79.5 C 25.1 79.1 25.2 78.4 25.9 77.9 C 26.6 77.4 27.7 76.6 28.5 76.6 C 29.4 76.6 30.4 77.4 31.1 77.9 C 31.8 78.4 32 79.1 32.7 79.5 C 33.4 79.8 34.5 79.7 35.3 80 C 36.2 80.3 37.5 80.8 37.8 81.4 C 38.1 82 37.4 82.9 36.9 83.5 Z', from: 5 },
        { tone: 'light', d: 'M 29.6 82.4 C 29.6 82.8 29 83.2 28.7 83.5 C 28.3 83.7 27.8 83.8 27.4 84 C 27.1 84.3 27.1 84.7 26.7 84.9 C 26.4 85.2 25.8 85.6 25.4 85.6 C 24.9 85.6 24.4 85.2 24 84.9 C 23.7 84.7 23.6 84.3 23.3 84 C 23 83.8 22.4 83.7 22.1 83.5 C 21.7 83.2 21.2 82.8 21.2 82.4 C 21.2 82.1 21.7 81.7 22.1 81.4 C 22.4 81.1 23 81.1 23.3 80.9 C 23.6 80.6 23.7 80.2 24 79.9 C 24.4 79.6 24.9 79.2 25.4 79.2 C 25.8 79.2 26.4 79.6 26.7 79.9 C 27.1 80.2 27.1 80.6 27.4 80.9 C 27.8 81.1 28.3 81.1 28.7 81.4 C 29 81.7 29.6 82.1 29.6 82.4 Z', from: 5 },
        { tone: 'deep', d: 'M 40 79.3 C 39.5 80 38.3 80.5 38 81.2 C 37.7 81.9 38.3 82.8 38.1 83.7 C 37.9 84.5 37.7 85.8 36.8 86.3 C 36 86.7 34.2 86.5 33.1 86.4 C 32 86.3 31 85.6 30 85.6 C 29 85.6 28 86.3 26.9 86.4 C 25.8 86.5 24 86.7 23.2 86.3 C 22.3 85.8 22.1 84.5 21.9 83.7 C 21.7 82.8 22.3 81.9 22 81.2 C 21.7 80.5 20.5 80 20 79.3 C 19.5 78.5 18.6 77.3 18.9 76.6 C 19.3 75.8 20.9 75.2 21.9 74.8 C 22.9 74.4 24.2 74.6 25.1 74.2 C 25.9 73.7 26.1 72.7 26.9 72.1 C 27.7 71.5 29 70.5 30 70.5 C 31 70.5 32.3 71.5 33.1 72.1 C 33.9 72.7 34.1 73.7 34.9 74.2 C 35.8 74.6 37.1 74.4 38.1 74.8 C 39.1 75.2 40.7 75.8 41.1 76.6 C 41.4 77.3 40.5 78.5 40 79.3 Z', from: 5 },
        { tone: 'base', d: 'M 36.6 77.7 C 36.2 78.4 35.3 78.7 35 79.3 C 34.7 79.8 35.2 80.5 35.1 81.2 C 34.9 81.9 34.7 82.9 34.1 83.2 C 33.4 83.6 32 83.4 31.1 83.3 C 30.2 83.2 29.4 82.7 28.6 82.7 C 27.8 82.7 27 83.2 26.1 83.3 C 25.2 83.4 23.8 83.6 23.1 83.2 C 22.5 82.9 22.3 81.9 22.1 81.2 C 22 80.5 22.4 79.8 22.2 79.3 C 21.9 78.7 21 78.4 20.6 77.7 C 20.2 77.1 19.5 76.2 19.7 75.7 C 20 75.1 21.3 74.6 22.1 74.3 C 22.9 74 24 74.1 24.6 73.8 C 25.3 73.4 25.5 72.7 26.1 72.2 C 26.8 71.7 27.8 71 28.6 71 C 29.4 71 30.4 71.7 31.1 72.2 C 31.7 72.7 31.9 73.4 32.6 73.8 C 33.2 74.1 34.3 74 35.1 74.3 C 35.9 74.6 37.2 75.1 37.4 75.7 C 37.7 76.2 37 77.1 36.6 77.7 Z', from: 5 },
        { tone: 'deep', d: 'M 39.6 73.5 C 39.1 74.3 37.9 74.7 37.6 75.4 C 37.3 76.2 37.9 77 37.7 77.9 C 37.5 78.7 37.3 80 36.5 80.5 C 35.7 80.9 34 80.7 33 80.6 C 31.9 80.4 31 79.7 30 79.7 C 29 79.7 28.1 80.4 27 80.6 C 26 80.7 24.3 80.9 23.5 80.5 C 22.7 80 22.5 78.7 22.3 77.9 C 22.1 77 22.7 76.2 22.4 75.4 C 22.1 74.7 20.9 74.3 20.5 73.5 C 20 72.7 19.2 71.6 19.5 70.8 C 19.8 70.1 21.3 69.5 22.3 69.1 C 23.2 68.7 24.5 68.9 25.3 68.5 C 26.1 68 26.3 67 27 66.4 C 27.8 65.9 29 64.9 30 64.9 C 31 64.9 32.2 65.9 33 66.4 C 33.7 67 33.9 68 34.7 68.5 C 35.5 68.9 36.8 68.7 37.7 69.1 C 38.7 69.5 40.2 70.1 40.5 70.8 C 40.8 71.6 40 72.7 39.6 73.5 Z', from: 5 },
        { tone: 'base', d: 'M 36.3 72 C 35.9 72.6 35 73 34.8 73.5 C 34.5 74.1 35 74.8 34.8 75.4 C 34.7 76.1 34.5 77.1 33.9 77.4 C 33.2 77.8 31.9 77.6 31 77.5 C 30.2 77.4 29.4 76.9 28.7 76.9 C 27.9 76.9 27.2 77.4 26.3 77.5 C 25.4 77.6 24.1 77.8 23.5 77.4 C 22.8 77.1 22.6 76.1 22.5 75.4 C 22.3 74.8 22.8 74.1 22.6 73.5 C 22.3 73 21.4 72.6 21 72 C 20.6 71.4 20 70.5 20.2 69.9 C 20.5 69.4 21.7 68.9 22.5 68.6 C 23.3 68.3 24.3 68.4 24.9 68.1 C 25.5 67.7 25.7 67 26.3 66.5 C 26.9 66.1 27.9 65.3 28.7 65.3 C 29.4 65.3 30.4 66.1 31 66.5 C 31.7 67 31.8 67.7 32.4 68.1 C 33.1 68.4 34.1 68.3 34.8 68.6 C 35.6 68.9 36.8 69.4 37.1 69.9 C 37.3 70.5 36.7 71.4 36.3 72 Z', from: 5 },
        { tone: 'light', d: 'M 29.6 71 C 29.6 71.3 29.1 71.7 28.8 72 C 28.5 72.3 28 72.3 27.7 72.5 C 27.4 72.8 27.4 73.2 27 73.4 C 26.7 73.7 26.2 74.1 25.8 74.1 C 25.4 74.1 24.9 73.7 24.6 73.4 C 24.2 73.2 24.2 72.8 23.9 72.5 C 23.6 72.3 23.1 72.3 22.8 72 C 22.5 71.7 22 71.3 22 71 C 22 70.6 22.5 70.2 22.8 70 C 23.1 69.7 23.6 69.7 23.9 69.4 C 24.2 69.2 24.2 68.8 24.6 68.5 C 24.9 68.2 25.4 67.8 25.8 67.8 C 26.2 67.8 26.7 68.2 27 68.5 C 27.4 68.8 27.4 69.2 27.7 69.4 C 28 69.7 28.5 69.7 28.8 70 C 29.1 70.2 29.6 70.6 29.6 71 Z', from: 5 },
        { tone: 'deep', d: 'M 39.1 67.8 C 38.6 68.5 37.5 68.9 37.2 69.6 C 37 70.4 37.5 71.2 37.3 72 C 37.2 72.9 36.9 74.2 36.2 74.6 C 35.4 75 33.8 74.8 32.8 74.7 C 31.8 74.6 30.9 73.9 30 73.9 C 29.1 73.9 28.2 74.6 27.2 74.7 C 26.2 74.8 24.6 75 23.8 74.6 C 23.1 74.2 22.8 72.9 22.7 72 C 22.5 71.2 23 70.4 22.8 69.6 C 22.5 68.9 21.4 68.5 20.9 67.8 C 20.5 67 19.7 65.8 20 65.1 C 20.3 64.4 21.7 63.8 22.7 63.5 C 23.6 63.1 24.8 63.2 25.5 62.8 C 26.3 62.3 26.4 61.4 27.2 60.8 C 27.9 60.2 29.1 59.3 30 59.3 C 30.9 59.3 32.1 60.2 32.8 60.8 C 33.6 61.4 33.7 62.3 34.5 62.8 C 35.2 63.2 36.4 63.1 37.3 63.5 C 38.3 63.8 39.7 64.4 40 65.1 C 40.3 65.8 39.5 67 39.1 67.8 Z', from: 5 },
        { tone: 'base', d: 'M 36 66.3 C 35.6 66.9 34.8 67.2 34.5 67.8 C 34.3 68.3 34.7 69 34.6 69.6 C 34.5 70.3 34.3 71.3 33.7 71.6 C 33.1 72 31.8 71.8 31 71.7 C 30.1 71.6 29.5 71.1 28.7 71.1 C 28 71.1 27.3 71.6 26.5 71.7 C 25.7 71.8 24.4 72 23.8 71.6 C 23.2 71.3 23 70.3 22.9 69.6 C 22.7 69 23.2 68.3 22.9 67.8 C 22.7 67.2 21.8 66.9 21.5 66.3 C 21.1 65.7 20.5 64.8 20.7 64.2 C 21 63.7 22.1 63.2 22.9 62.9 C 23.6 62.6 24.5 62.8 25.1 62.4 C 25.7 62.1 25.9 61.3 26.5 60.9 C 27.1 60.4 28 59.7 28.7 59.7 C 29.5 59.7 30.4 60.4 31 60.9 C 31.6 61.3 31.7 62.1 32.3 62.4 C 32.9 62.8 33.9 62.6 34.6 62.9 C 35.3 63.2 36.5 63.7 36.7 64.2 C 37 64.8 36.4 65.7 36 66.3 Z', from: 5 },
        { tone: 'deep', d: 'M 38.6 62 C 38.2 62.7 37.1 63.2 36.9 63.9 C 36.6 64.6 37.1 65.4 37 66.2 C 36.8 67 36.6 68.3 35.9 68.7 C 35.1 69.2 33.6 68.9 32.7 68.8 C 31.7 68.7 30.9 68 30 68 C 29.1 68 28.3 68.7 27.3 68.8 C 26.4 68.9 24.9 69.2 24.1 68.7 C 23.4 68.3 23.2 67 23 66.2 C 22.9 65.4 23.4 64.6 23.1 63.9 C 22.9 63.2 21.8 62.7 21.4 62 C 21 61.3 20.2 60.1 20.5 59.4 C 20.8 58.7 22.2 58.2 23 57.8 C 23.9 57.4 25 57.6 25.8 57.1 C 26.5 56.7 26.6 55.8 27.3 55.2 C 28.1 54.6 29.1 53.7 30 53.7 C 30.9 53.7 31.9 54.6 32.7 55.2 C 33.4 55.8 33.5 56.7 34.2 57.1 C 35 57.6 36.1 57.4 37 57.8 C 37.8 58.2 39.2 58.7 39.5 59.4 C 39.8 60.1 39 61.3 38.6 62 Z', from: 5 },
        { tone: 'base', d: 'M 35.7 60.6 C 35.3 61.1 34.5 61.5 34.3 62 C 34.1 62.6 34.5 63.2 34.4 63.9 C 34.2 64.5 34.1 65.5 33.5 65.8 C 32.9 66.2 31.7 66 30.9 65.9 C 30.1 65.8 29.5 65.3 28.8 65.3 C 28.1 65.3 27.5 65.8 26.7 65.9 C 25.9 66 24.7 66.2 24.1 65.8 C 23.5 65.5 23.4 64.5 23.2 63.9 C 23.1 63.2 23.5 62.6 23.3 62 C 23.1 61.5 22.3 61.1 21.9 60.6 C 21.6 60 21 59.1 21.2 58.6 C 21.4 58 22.5 57.6 23.2 57.3 C 23.9 57 24.8 57.1 25.4 56.8 C 26 56.4 26.1 55.7 26.7 55.3 C 27.2 54.8 28.1 54.1 28.8 54.1 C 29.5 54.1 30.4 54.8 30.9 55.3 C 31.5 55.7 31.6 56.4 32.2 56.8 C 32.8 57.1 33.7 57 34.4 57.3 C 35.1 57.6 36.2 58 36.4 58.6 C 36.6 59.1 36 60 35.7 60.6 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 59.6 C 29.7 59.9 29.2 60.3 28.9 60.6 C 28.6 60.8 28.2 60.8 27.9 61.1 C 27.6 61.3 27.6 61.7 27.3 61.9 C 27.1 62.2 26.6 62.6 26.2 62.6 C 25.8 62.6 25.4 62.2 25.1 61.9 C 24.8 61.7 24.8 61.3 24.5 61.1 C 24.3 60.8 23.8 60.8 23.5 60.6 C 23.2 60.3 22.8 59.9 22.8 59.6 C 22.8 59.2 23.2 58.8 23.5 58.6 C 23.8 58.3 24.3 58.3 24.5 58.1 C 24.8 57.8 24.8 57.4 25.1 57.2 C 25.4 56.9 25.8 56.5 26.2 56.5 C 26.6 56.5 27.1 56.9 27.3 57.2 C 27.6 57.4 27.6 57.8 27.9 58.1 C 28.2 58.3 28.6 58.3 28.9 58.6 C 29.2 58.8 29.7 59.2 29.7 59.6 Z', from: 5 },
        { tone: 'deep', d: 'M 38.1 56.3 C 37.7 57 36.7 57.4 36.5 58.1 C 36.2 58.8 36.7 59.6 36.6 60.4 C 36.4 61.2 36.2 62.4 35.5 62.8 C 34.9 63.2 33.4 63 32.5 62.9 C 31.6 62.8 30.8 62.1 30 62.1 C 29.2 62.1 28.4 62.8 27.5 62.9 C 26.6 63 25.1 63.2 24.5 62.8 C 23.8 62.4 23.6 61.2 23.4 60.4 C 23.3 59.6 23.8 58.8 23.5 58.1 C 23.3 57.4 22.3 57 21.9 56.3 C 21.5 55.5 20.8 54.4 21 53.7 C 21.3 53.1 22.6 52.5 23.4 52.1 C 24.3 51.8 25.3 51.9 26 51.5 C 26.7 51.1 26.8 50.2 27.5 49.6 C 28.2 49 29.2 48.1 30 48.1 C 30.8 48.1 31.8 49 32.5 49.6 C 33.2 50.2 33.3 51.1 34 51.5 C 34.7 51.9 35.7 51.8 36.6 52.1 C 37.4 52.5 38.7 53.1 39 53.7 C 39.2 54.4 38.5 55.5 38.1 56.3 Z', from: 5 },
        { tone: 'base', d: 'M 35.4 54.8 C 35 55.4 34.3 55.7 34.1 56.3 C 33.8 56.8 34.2 57.4 34.1 58.1 C 34 58.7 33.8 59.6 33.3 60 C 32.8 60.3 31.6 60.1 30.9 60 C 30.1 60 29.5 59.4 28.9 59.4 C 28.2 59.4 27.6 60 26.9 60 C 26.1 60.1 25 60.3 24.4 60 C 23.9 59.6 23.7 58.7 23.6 58.1 C 23.5 57.4 23.9 56.8 23.7 56.3 C 23.5 55.7 22.7 55.4 22.4 54.8 C 22 54.3 21.5 53.4 21.7 52.9 C 21.9 52.4 22.9 51.9 23.6 51.6 C 24.3 51.3 25.1 51.5 25.7 51.1 C 26.2 50.8 26.3 50.1 26.9 49.7 C 27.4 49.2 28.2 48.5 28.9 48.5 C 29.5 48.5 30.3 49.2 30.9 49.7 C 31.4 50.1 31.5 50.8 32.1 51.1 C 32.6 51.5 33.5 51.3 34.1 51.6 C 34.8 51.9 35.8 52.4 36 52.9 C 36.2 53.4 35.7 54.3 35.4 54.8 Z', from: 5 },
        { tone: 'deep', d: 'M 37.7 50.5 C 37.3 51.2 36.4 51.6 36.1 52.3 C 35.9 52.9 36.3 53.7 36.2 54.5 C 36 55.3 35.9 56.5 35.2 56.9 C 34.6 57.3 33.2 57.1 32.4 57 C 31.5 56.9 30.8 56.2 30 56.2 C 29.2 56.2 28.5 56.9 27.6 57 C 26.8 57.1 25.4 57.3 24.8 56.9 C 24.1 56.5 24 55.3 23.8 54.5 C 23.7 53.7 24.1 52.9 23.9 52.3 C 23.6 51.6 22.7 51.2 22.4 50.5 C 22 49.8 21.3 48.7 21.6 48.1 C 21.8 47.4 23 46.9 23.8 46.5 C 24.6 46.1 25.6 46.3 26.2 45.9 C 26.9 45.5 27 44.6 27.6 44 C 28.3 43.5 29.2 42.6 30 42.6 C 30.8 42.6 31.7 43.5 32.4 44 C 33 44.6 33.1 45.5 33.8 45.9 C 34.4 46.3 35.4 46.1 36.2 46.5 C 37 46.9 38.2 47.4 38.4 48.1 C 38.7 48.7 38 49.8 37.7 50.5 Z', from: 5 },
        { tone: 'base', d: 'M 35 49.1 C 34.7 49.7 34 50 33.8 50.5 C 33.6 51 34 51.7 33.9 52.3 C 33.8 52.9 33.6 53.8 33.1 54.1 C 32.6 54.4 31.5 54.3 30.8 54.2 C 30.1 54.1 29.6 53.6 28.9 53.6 C 28.3 53.6 27.7 54.1 27 54.2 C 26.3 54.3 25.3 54.4 24.8 54.1 C 24.2 53.8 24.1 52.9 24 52.3 C 23.9 51.7 24.2 51 24 50.5 C 23.8 50 23.1 49.7 22.8 49.1 C 22.5 48.6 22 47.8 22.2 47.2 C 22.4 46.7 23.4 46.3 24 46 C 24.6 45.7 25.4 45.9 25.9 45.5 C 26.4 45.2 26.5 44.5 27 44.1 C 27.5 43.7 28.3 43 28.9 43 C 29.6 43 30.3 43.7 30.8 44.1 C 31.3 44.5 31.4 45.2 32 45.5 C 32.5 45.9 33.3 45.7 33.9 46 C 34.5 46.3 35.5 46.7 35.7 47.2 C 35.9 47.8 35.4 48.6 35 49.1 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 48.2 C 29.7 48.5 29.3 48.9 29 49.1 C 28.8 49.4 28.4 49.4 28.1 49.6 C 27.9 49.8 27.9 50.2 27.6 50.4 C 27.4 50.7 27 51.1 26.6 51.1 C 26.3 51.1 25.9 50.7 25.6 50.4 C 25.4 50.2 25.4 49.8 25.1 49.6 C 24.9 49.4 24.5 49.4 24.2 49.1 C 24 48.9 23.6 48.5 23.6 48.2 C 23.6 47.9 24 47.5 24.2 47.2 C 24.5 47 24.9 47 25.1 46.8 C 25.4 46.5 25.4 46.2 25.6 45.9 C 25.9 45.7 26.3 45.3 26.6 45.3 C 27 45.3 27.4 45.7 27.6 45.9 C 27.9 46.2 27.9 46.5 28.1 46.8 C 28.4 47 28.8 47 29 47.2 C 29.3 47.5 29.7 47.9 29.7 48.2 Z', from: 5 },
        { tone: 'deep', d: 'M 37.2 44.8 C 36.8 45.4 36 45.8 35.7 46.5 C 35.5 47.1 35.9 47.9 35.8 48.6 C 35.7 49.4 35.5 50.5 34.9 50.9 C 34.3 51.3 33 51.1 32.2 51 C 31.4 50.9 30.7 50.3 30 50.3 C 29.3 50.3 28.6 50.9 27.8 51 C 27 51.1 25.7 51.3 25.1 50.9 C 24.5 50.5 24.3 49.4 24.2 48.6 C 24.1 47.9 24.5 47.1 24.3 46.5 C 24 45.8 23.2 45.4 22.8 44.8 C 22.5 44.1 21.9 43 22.1 42.4 C 22.3 41.7 23.5 41.2 24.2 40.9 C 24.9 40.5 25.9 40.7 26.5 40.3 C 27.1 39.9 27.2 39 27.8 38.5 C 28.4 38 29.3 37.1 30 37.1 C 30.7 37.1 31.6 38 32.2 38.5 C 32.8 39 32.9 39.9 33.5 40.3 C 34.1 40.7 35.1 40.5 35.8 40.9 C 36.5 41.2 37.7 41.7 37.9 42.4 C 38.1 43 37.5 44.1 37.2 44.8 Z', from: 5 },
        { tone: 'base', d: 'M 34.7 43.4 C 34.4 44 33.8 44.3 33.6 44.8 C 33.4 45.3 33.8 45.9 33.6 46.5 C 33.5 47 33.4 47.9 32.9 48.3 C 32.4 48.6 31.4 48.4 30.8 48.3 C 30.1 48.2 29.6 47.7 29 47.7 C 28.4 47.7 27.9 48.2 27.2 48.3 C 26.6 48.4 25.6 48.6 25.1 48.3 C 24.6 47.9 24.5 47 24.4 46.5 C 24.2 45.9 24.6 45.3 24.4 44.8 C 24.2 44.3 23.5 44 23.3 43.4 C 23 42.9 22.5 42.1 22.7 41.6 C 22.8 41.1 23.8 40.7 24.4 40.4 C 24.9 40.1 25.7 40.3 26.2 39.9 C 26.6 39.6 26.7 39 27.2 38.5 C 27.7 38.1 28.4 37.5 29 37.5 C 29.6 37.5 30.3 38.1 30.8 38.5 C 31.2 39 31.4 39.6 31.8 39.9 C 32.3 40.3 33.1 40.1 33.6 40.4 C 34.2 40.7 35.1 41.1 35.3 41.6 C 35.5 42.1 35 42.9 34.7 43.4 Z', from: 5 },
        { tone: 'deep', d: 'M 36.7 39 C 36.4 39.7 35.6 40 35.4 40.6 C 35.1 41.3 35.6 42 35.4 42.7 C 35.3 43.4 35.1 44.6 34.6 45 C 34 45.3 32.8 45.1 32.1 45 C 31.3 44.9 30.7 44.3 30 44.3 C 29.3 44.3 28.7 44.9 27.9 45 C 27.2 45.1 26 45.3 25.4 45 C 24.9 44.6 24.7 43.4 24.6 42.7 C 24.4 42 24.9 41.3 24.6 40.6 C 24.4 40 23.6 39.7 23.3 39 C 23 38.3 22.4 37.3 22.6 36.7 C 22.8 36.1 23.9 35.6 24.6 35.3 C 25.3 34.9 26.1 35.1 26.7 34.7 C 27.3 34.3 27.4 33.5 27.9 33 C 28.5 32.5 29.3 31.6 30 31.6 C 30.7 31.6 31.5 32.5 32.1 33 C 32.6 33.5 32.7 34.3 33.3 34.7 C 33.9 35.1 34.7 34.9 35.4 35.3 C 36.1 35.6 37.2 36.1 37.4 36.7 C 37.6 37.3 37 38.3 36.7 39 Z', from: 5 },
        { tone: 'base', d: 'M 34.4 37.7 C 34.2 38.2 33.5 38.5 33.3 39 C 33.2 39.5 33.5 40.1 33.4 40.6 C 33.3 41.2 33.2 42.1 32.7 42.4 C 32.3 42.7 31.3 42.5 30.7 42.4 C 30.1 42.4 29.6 41.9 29.1 41.9 C 28.5 41.9 28 42.4 27.4 42.4 C 26.8 42.5 25.9 42.7 25.4 42.4 C 25 42.1 24.8 41.2 24.7 40.6 C 24.6 40.1 25 39.5 24.8 39 C 24.6 38.5 24 38.2 23.7 37.7 C 23.4 37.2 23 36.4 23.1 36 C 23.3 35.5 24.2 35.1 24.7 34.8 C 25.3 34.6 26 34.7 26.4 34.4 C 26.9 34.1 27 33.4 27.4 33 C 27.8 32.6 28.5 32 29.1 32 C 29.6 32 30.3 32.6 30.7 33 C 31.2 33.4 31.3 34.1 31.7 34.4 C 32.2 34.7 32.9 34.6 33.4 34.8 C 33.9 35.1 34.8 35.5 35 36 C 35.1 36.4 34.7 37.2 34.4 37.7 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 36.8 C 29.7 37.1 29.4 37.5 29.2 37.7 C 28.9 37.9 28.6 38 28.4 38.2 C 28.2 38.4 28.1 38.7 27.9 39 C 27.7 39.2 27.3 39.5 27.1 39.5 C 26.8 39.5 26.4 39.2 26.2 39 C 26 38.7 25.9 38.4 25.7 38.2 C 25.5 38 25.2 37.9 24.9 37.7 C 24.7 37.5 24.4 37.1 24.4 36.8 C 24.4 36.6 24.7 36.2 24.9 36 C 25.2 35.7 25.5 35.7 25.7 35.5 C 25.9 35.3 26 35 26.2 34.7 C 26.4 34.5 26.8 34.1 27.1 34.1 C 27.3 34.1 27.7 34.5 27.9 34.7 C 28.1 35 28.2 35.3 28.4 35.5 C 28.6 35.7 28.9 35.7 29.2 36 C 29.4 36.2 29.7 36.6 29.7 36.8 Z', from: 5 },
        { tone: 'deep', d: 'M 36.2 33.3 C 35.9 33.9 35.2 34.2 35 34.8 C 34.8 35.4 35.2 36.1 35 36.8 C 34.9 37.5 34.8 38.6 34.2 38.9 C 33.7 39.3 32.6 39.1 31.9 39 C 31.2 38.9 30.6 38.3 30 38.3 C 29.4 38.3 28.8 38.9 28.1 39 C 27.4 39.1 26.3 39.3 25.8 38.9 C 25.2 38.6 25.1 37.5 25 36.8 C 24.8 36.1 25.2 35.4 25 34.8 C 24.8 34.2 24.1 33.9 23.8 33.3 C 23.5 32.6 22.9 31.7 23.1 31.1 C 23.3 30.5 24.3 30 25 29.7 C 25.6 29.4 26.4 29.5 26.9 29.1 C 27.4 28.8 27.6 28 28.1 27.5 C 28.6 27 29.4 26.2 30 26.2 C 30.6 26.2 31.4 27 31.9 27.5 C 32.4 28 32.6 28.8 33.1 29.1 C 33.6 29.5 34.4 29.4 35 29.7 C 35.7 30 36.7 30.5 36.9 31.1 C 37.1 31.7 36.5 32.6 36.2 33.3 Z', from: 5 },
        { tone: 'base', d: 'M 34.1 32 C 33.9 32.5 33.3 32.8 33.1 33.3 C 32.9 33.7 33.3 34.3 33.2 34.8 C 33.1 35.4 32.9 36.2 32.5 36.5 C 32.1 36.8 31.2 36.6 30.7 36.5 C 30.1 36.5 29.6 36 29.1 36 C 28.6 36 28.2 36.5 27.6 36.5 C 27 36.6 26.1 36.8 25.7 36.5 C 25.3 36.2 25.2 35.4 25.1 34.8 C 25 34.3 25.3 33.7 25.2 33.3 C 25 32.8 24.4 32.5 24.1 32 C 23.9 31.5 23.5 30.8 23.6 30.3 C 23.8 29.9 24.6 29.5 25.1 29.3 C 25.6 29 26.3 29.1 26.7 28.8 C 27.1 28.5 27.2 27.9 27.6 27.5 C 28 27.2 28.6 26.5 29.1 26.5 C 29.6 26.5 30.3 27.2 30.7 27.5 C 31.1 27.9 31.2 28.5 31.6 28.8 C 32 29.1 32.7 29 33.2 29.3 C 33.7 29.5 34.5 29.9 34.6 30.3 C 34.8 30.8 34.4 31.5 34.1 32 Z', from: 5 },
        { tone: 'deep', d: 'M 35.8 27.5 C 35.5 28.1 34.8 28.4 34.6 29 C 34.4 29.6 34.8 30.2 34.7 30.9 C 34.5 31.5 34.4 32.6 33.9 32.9 C 33.4 33.3 32.4 33.1 31.8 33 C 31.1 32.9 30.6 32.3 30 32.3 C 29.4 32.3 28.9 32.9 28.2 33 C 27.6 33.1 26.6 33.3 26.1 32.9 C 25.6 32.6 25.5 31.5 25.3 30.9 C 25.2 30.2 25.6 29.6 25.4 29 C 25.2 28.4 24.5 28.1 24.3 27.5 C 24 26.9 23.5 26 23.7 25.4 C 23.8 24.9 24.8 24.4 25.3 24.1 C 25.9 23.8 26.7 23.9 27.2 23.6 C 27.6 23.2 27.7 22.5 28.2 22 C 28.7 21.6 29.4 20.8 30 20.8 C 30.6 20.8 31.3 21.6 31.8 22 C 32.3 22.5 32.4 23.2 32.8 23.6 C 33.3 23.9 34.1 23.8 34.7 24.1 C 35.2 24.4 36.2 24.9 36.3 25.4 C 36.5 26 36 26.9 35.8 27.5 Z', from: 5 },
        { tone: 'base', d: 'M 33.8 26.3 C 33.6 26.8 33 27.1 32.9 27.5 C 32.7 28 33 28.5 32.9 29 C 32.8 29.5 32.7 30.3 32.3 30.6 C 31.9 30.8 31.1 30.7 30.6 30.6 C 30.1 30.6 29.7 30.1 29.2 30.1 C 28.7 30.1 28.3 30.6 27.8 30.6 C 27.3 30.7 26.4 30.8 26.1 30.6 C 25.7 30.3 25.6 29.5 25.5 29 C 25.4 28.5 25.7 28 25.5 27.5 C 25.4 27.1 24.8 26.8 24.6 26.3 C 24.4 25.9 24 25.2 24.1 24.7 C 24.3 24.3 25 23.9 25.5 23.7 C 25.9 23.5 26.5 23.6 26.9 23.3 C 27.3 23 27.4 22.4 27.8 22.1 C 28.2 21.7 28.7 21.1 29.2 21.1 C 29.7 21.1 30.2 21.7 30.6 22.1 C 31 22.4 31.1 23 31.5 23.3 C 31.8 23.6 32.4 23.5 32.9 23.7 C 33.4 23.9 34.1 24.3 34.3 24.7 C 34.4 25.2 34 25.9 33.8 26.3 Z', from: 5 },
        { tone: 'light', d: 'M 29.8 25.5 C 29.8 25.8 29.5 26.1 29.3 26.3 C 29.1 26.5 28.8 26.6 28.6 26.7 C 28.4 26.9 28.4 27.2 28.2 27.5 C 28 27.7 27.7 28 27.5 28 C 27.2 28 26.9 27.7 26.7 27.5 C 26.5 27.2 26.5 26.9 26.3 26.7 C 26.2 26.6 25.9 26.5 25.7 26.3 C 25.5 26.1 25.2 25.8 25.2 25.5 C 25.2 25.3 25.5 24.9 25.7 24.7 C 25.9 24.5 26.2 24.5 26.3 24.3 C 26.5 24.1 26.5 23.8 26.7 23.6 C 26.9 23.4 27.2 23.1 27.5 23.1 C 27.7 23.1 28 23.4 28.2 23.6 C 28.4 23.8 28.4 24.1 28.6 24.3 C 28.8 24.5 29.1 24.5 29.3 24.7 C 29.5 24.9 29.8 25.3 29.8 25.5 Z', from: 5 },
        { tone: 'deep', d: 'M 35.3 21.8 C 35 22.3 34.4 22.6 34.2 23.2 C 34 23.7 34.4 24.3 34.3 24.9 C 34.2 25.6 34 26.5 33.6 26.9 C 33.2 27.2 32.2 27 31.6 26.9 C 31 26.8 30.5 26.3 30 26.3 C 29.5 26.3 29 26.8 28.4 26.9 C 27.8 27 26.8 27.2 26.4 26.9 C 26 26.5 25.8 25.6 25.7 24.9 C 25.6 24.3 26 23.7 25.8 23.2 C 25.6 22.6 25 22.3 24.7 21.8 C 24.5 21.2 24 20.3 24.2 19.8 C 24.3 19.3 25.2 18.8 25.7 18.6 C 26.3 18.3 27 18.4 27.4 18.1 C 27.8 17.7 27.9 17 28.4 16.6 C 28.8 16.1 29.5 15.4 30 15.4 C 30.5 15.4 31.2 16.1 31.6 16.6 C 32.1 17 32.2 17.7 32.6 18.1 C 33 18.4 33.7 18.3 34.3 18.6 C 34.8 18.8 35.7 19.3 35.8 19.8 C 36 20.3 35.5 21.2 35.3 21.8 Z', from: 5 },
        { tone: 'base', d: 'M 33.5 20.7 C 33.3 21.1 32.8 21.3 32.6 21.8 C 32.5 22.2 32.8 22.7 32.7 23.2 C 32.6 23.6 32.5 24.4 32.1 24.6 C 31.8 24.9 31 24.8 30.6 24.7 C 30.1 24.6 29.7 24.2 29.3 24.2 C 28.8 24.2 28.4 24.6 28 24.7 C 27.5 24.8 26.7 24.9 26.4 24.6 C 26 24.4 25.9 23.6 25.8 23.2 C 25.8 22.7 26 22.2 25.9 21.8 C 25.8 21.3 25.3 21.1 25 20.7 C 24.8 20.2 24.5 19.6 24.6 19.1 C 24.7 18.7 25.4 18.4 25.8 18.2 C 26.3 17.9 26.8 18 27.2 17.8 C 27.5 17.5 27.6 17 28 16.6 C 28.3 16.3 28.8 15.7 29.3 15.7 C 29.7 15.7 30.2 16.3 30.6 16.6 C 30.9 17 31 17.5 31.3 17.8 C 31.7 18 32.2 17.9 32.7 18.2 C 33.1 18.4 33.8 18.7 33.9 19.1 C 34.1 19.6 33.7 20.2 33.5 20.7 Z', from: 5 },
        { tone: 'deep', d: 'M 34.8 16 C 34.6 16.5 34 16.8 33.8 17.3 C 33.7 17.8 34 18.4 33.9 19 C 33.8 19.6 33.7 20.5 33.3 20.8 C 32.9 21.1 32 20.9 31.5 20.8 C 30.9 20.8 30.5 20.3 30 20.3 C 29.5 20.3 29.1 20.8 28.5 20.8 C 28 20.9 27.1 21.1 26.7 20.8 C 26.3 20.5 26.2 19.6 26.1 19 C 26 18.4 26.3 17.8 26.2 17.3 C 26 16.8 25.4 16.5 25.2 16 C 25 15.5 24.6 14.7 24.7 14.2 C 24.9 13.7 25.6 13.3 26.1 13 C 26.6 12.7 27.2 12.9 27.6 12.5 C 28 12.2 28.1 11.6 28.5 11.2 C 28.9 10.8 29.5 10.1 30 10.1 C 30.5 10.1 31.1 10.8 31.5 11.2 C 31.9 11.6 32 12.2 32.4 12.5 C 32.8 12.9 33.4 12.7 33.9 13 C 34.4 13.3 35.1 13.7 35.3 14.2 C 35.4 14.7 35 15.5 34.8 16 Z', from: 5 },
        { tone: 'base', d: 'M 33.2 15 C 33 15.4 32.5 15.6 32.4 16 C 32.3 16.4 32.5 16.9 32.4 17.3 C 32.4 17.8 32.3 18.5 31.9 18.7 C 31.6 18.9 31 18.8 30.5 18.8 C 30.1 18.7 29.7 18.3 29.3 18.3 C 28.9 18.3 28.6 18.7 28.1 18.8 C 27.7 18.8 27 18.9 26.7 18.7 C 26.4 18.5 26.3 17.8 26.2 17.3 C 26.1 16.9 26.4 16.4 26.3 16 C 26.1 15.6 25.7 15.4 25.5 15 C 25.3 14.6 25 13.9 25.1 13.6 C 25.2 13.2 25.8 12.9 26.2 12.6 C 26.6 12.4 27.1 12.5 27.4 12.3 C 27.8 12 27.8 11.5 28.1 11.2 C 28.5 10.9 28.9 10.4 29.3 10.4 C 29.7 10.4 30.2 10.9 30.5 11.2 C 30.8 11.5 30.9 12 31.2 12.3 C 31.5 12.5 32 12.4 32.4 12.6 C 32.8 12.9 33.4 13.2 33.6 13.6 C 33.7 13.9 33.4 14.6 33.2 15 Z', from: 5 },
        { tone: 'light', d: 'M 29.8 14.3 C 29.8 14.5 29.6 14.8 29.4 15 C 29.2 15.1 29 15.2 28.8 15.3 C 28.7 15.5 28.7 15.8 28.5 16 C 28.4 16.1 28.1 16.4 27.9 16.4 C 27.7 16.4 27.4 16.1 27.3 16 C 27.1 15.8 27.1 15.5 26.9 15.3 C 26.8 15.2 26.5 15.1 26.4 15 C 26.2 14.8 26 14.5 26 14.3 C 26 14 26.2 13.7 26.4 13.6 C 26.5 13.4 26.8 13.4 26.9 13.2 C 27.1 13 27.1 12.8 27.3 12.6 C 27.4 12.4 27.7 12.1 27.9 12.1 C 28.1 12.1 28.4 12.4 28.5 12.6 C 28.7 12.8 28.7 13 28.8 13.2 C 29 13.4 29.2 13.4 29.4 13.6 C 29.6 13.7 29.8 14 29.8 14.3 Z', from: 5 }
      ]
    },
    sunflower: {
      trunk: 'M 28 96 Q 29 74 28.6 52 L 31.4 52 Q 31 74 32 96 Z',
      trunkShort: 'M 28.4 96 Q 29.2 85 28.9 74 L 31.1 74 Q 30.8 85 31.6 96 Z',
      trunkTone: 'stem',
      blossoms: [[30, 26], [22, 22], [38, 22], [22, 32], [38, 32], [30, 15], [17, 27], [43, 27], [30, 38]],
      parts: [
        { tone: 'stem', d: 'M 28.4 96 Q 29.2 85 28.9 74 L 31.1 74 Q 30.8 85 31.6 96 Z', from: 2, to: 2 },
        { tone: 'stemdark', d: 'M 30.3 96 Q 30.4 85 30.1 74 L 31.1 74 Q 30.8 85 31.6 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29 84 Q 25.1 77.8 17 76 Q 22.1 82.4 29 84 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 28.7 83.7 Q 24.2 78.1 16.4 75.4 Q 22.2 81.1 28.7 83.7 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 28.3 83.5 Q 23.7 79.9 18.7 77.1 Q 23.2 80.7 28.3 83.5 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 32 72.3 Q 31.9 75 34.6 75.3 Q 34.7 72.5 32 72.3 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 31.6 71.9 Q 31.9 74.3 34.2 74.8 Q 33.9 72.5 31.6 71.9 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 32.9 70.7 Q 34.5 72.9 36.8 71.5 Q 35.3 69.2 32.9 70.7 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 32.6 70.3 Q 34.2 72 36.4 71.1 Q 34.8 69.4 32.6 70.3 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 30.3 73 Q 28.6 75.2 30.7 77 Q 32.4 74.8 30.3 73 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.9 72.6 Q 28.7 74.7 30.2 76.6 Q 31.4 74.5 29.9 72.6 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 32.8 68.8 Q 35.3 69.8 36.4 67.2 Q 33.8 66.3 32.8 68.8 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 32.4 68.4 Q 34.8 68.9 36 66.8 Q 33.6 66.4 32.4 68.4 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 28.5 72.6 Q 25.8 73.3 26.4 76 Q 29.1 75.3 28.5 72.6 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 28.1 72.2 Q 25.9 73.2 26 75.6 Q 28.2 74.6 28.1 72.2 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 31.5 67.4 Q 34.2 66.7 33.6 64 Q 30.9 64.7 31.5 67.4 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 31.2 67.1 Q 33.3 66 33.2 63.6 Q 31 64.6 31.2 67.1 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 27.2 71.2 Q 24.7 70.2 23.6 72.8 Q 26.2 73.7 27.2 71.2 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 26.9 70.8 Q 24.5 70.3 23.2 72.4 Q 25.5 72.9 26.9 70.8 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.7 67 Q 31.4 64.8 29.3 63 Q 27.6 65.2 29.7 67 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.4 66.7 Q 30.5 64.5 28.9 62.6 Q 27.8 64.8 29.4 66.7 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 27.1 69.3 Q 25.5 67.1 23.2 68.5 Q 24.7 70.8 27.1 69.3 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 26.7 69 Q 25 67.2 22.8 68.1 Q 24.4 69.8 26.7 69 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 28 67.7 Q 28.1 65 25.4 64.7 Q 25.3 67.5 28 67.7 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 27.7 67.4 Q 27.3 65 25 64.3 Q 25.3 66.8 27.7 67.4 Z', from: 2, to: 2 },
        { tone: 'seedhead', c: [30, 70, 3], from: 2, to: 2 },
        { tone: 'seedhead-light', c: [29.4, 69.4, 1.9], from: 2, to: 2 },
        { tone: 'seedhead', d: 'M 30.4 69.3 C 30.4 69.4 30.5 69.5 30.5 69.6 C 30.5 69.6 30.4 69.7 30.3 69.7 C 30.2 69.8 30.1 69.8 30 69.8 C 30 69.9 30 70 30 70.1 C 30 70.2 29.9 70.3 29.9 70.3 C 29.8 70.3 29.7 70.3 29.6 70.3 C 29.5 70.2 29.4 70.1 29.4 70.1 C 29.3 70.1 29.2 70.2 29.1 70.3 C 29.1 70.3 28.9 70.3 28.9 70.3 C 28.8 70.3 28.8 70.2 28.7 70.1 C 28.7 70 28.7 69.9 28.7 69.8 C 28.6 69.8 28.5 69.8 28.4 69.7 C 28.4 69.7 28.2 69.6 28.2 69.6 C 28.2 69.5 28.3 69.4 28.3 69.3 C 28.4 69.2 28.5 69.2 28.5 69.1 C 28.5 69.1 28.5 69 28.4 68.9 C 28.4 68.8 28.4 68.7 28.5 68.6 C 28.5 68.6 28.6 68.6 28.7 68.6 C 28.8 68.6 28.9 68.6 29 68.6 C 29.1 68.5 29.1 68.4 29.1 68.4 C 29.2 68.3 29.3 68.2 29.4 68.2 C 29.4 68.2 29.5 68.3 29.6 68.4 C 29.7 68.4 29.7 68.5 29.7 68.6 C 29.8 68.6 29.9 68.6 30 68.6 C 30.1 68.6 30.2 68.6 30.3 68.6 C 30.3 68.7 30.3 68.8 30.3 68.9 C 30.3 69 30.2 69.1 30.2 69.1 C 30.2 69.2 30.3 69.2 30.4 69.3 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 28 96 Q 29 74 28.6 52 L 31.4 52 Q 31 74 32 96 Z', from: 3, to: 3 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.6 74 30.1 52 L 31.4 52 Q 31 74 32 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29 84 Q 24.1 76.4 14 74 Q 20.4 81.9 29 84 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28.6 83.6 Q 23 76.8 13.2 73.2 Q 20.5 80.3 28.6 83.6 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 28.1 83.4 Q 22.4 79 16.1 75.4 Q 21.8 79.8 28.1 83.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31 76 Q 39.4 74.2 45 66 Q 35.8 69.1 31 76 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 30.6 75.6 Q 38.4 72.8 44.3 65.3 Q 35.9 69.5 30.6 75.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31.8 75.4 Q 37.7 71.8 43 67.4 Q 37.1 71 31.8 75.4 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 33.3 51 Q 34 55.1 38.1 55.4 Q 37.4 51.4 33.3 51 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 32.8 50.6 Q 34 54 37.6 54.9 Q 36.4 51.5 32.8 50.6 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 31.3 52.3 Q 30 56.1 33.3 58.5 Q 34.7 54.7 31.3 52.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 30.9 51.8 Q 30.1 55.4 32.8 58 Q 33.5 54.4 30.9 51.8 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 34.4 49 Q 37 52.1 40.7 50.4 Q 38.1 47.3 34.4 49 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 33.9 48.5 Q 36.7 50.9 40.2 49.9 Q 37.4 47.5 33.9 48.5 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 29 52.4 Q 25.9 55 27.6 58.7 Q 30.7 56.1 29 52.4 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 28.6 51.9 Q 26.1 54.7 27.1 58.2 Q 29.5 55.5 28.6 51.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 34.3 46.7 Q 38.1 48 40.5 44.7 Q 36.7 43.3 34.3 46.7 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 33.8 46.2 Q 37.4 46.9 40 44.2 Q 36.4 43.5 33.8 46.2 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 27 51.3 Q 22.9 52 22.6 56.1 Q 26.6 55.4 27 51.3 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 26.5 50.8 Q 23 52 22 55.6 Q 25.5 54.4 26.5 50.8 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 33 44.7 Q 37.1 44 37.4 39.9 Q 33.4 40.6 33 44.7 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 32.6 44.2 Q 36.1 43 36.9 39.4 Q 33.4 40.6 32.6 44.2 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 25.7 49.3 Q 21.9 48 19.5 51.3 Q 23.3 52.7 25.7 49.3 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 25.2 48.9 Q 21.6 48.1 19 50.8 Q 22.6 51.5 25.2 48.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 31 43.6 Q 34.1 41 32.4 37.3 Q 29.3 39.9 31 43.6 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 30.5 43.1 Q 32.9 40.3 31.9 36.7 Q 29.5 39.6 30.5 43.1 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 25.6 47 Q 23 43.9 19.3 45.6 Q 21.9 48.7 25.6 47 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 25.1 46.6 Q 22.3 44.1 18.7 45.1 Q 21.5 47.5 25.1 46.6 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 28.7 43.7 Q 30 39.9 26.7 37.5 Q 25.3 41.3 28.7 43.7 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 28.2 43.2 Q 28.9 39.6 26.2 37 Q 25.5 40.6 28.2 43.2 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 26.7 45 Q 26 40.9 21.9 40.6 Q 22.6 44.6 26.7 45 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 26.2 44.5 Q 25 41 21.4 40 Q 22.6 43.6 26.2 44.5 Z', from: 3, to: 3 },
        { tone: 'seedhead', c: [30, 48, 4.6], from: 3, to: 3 },
        { tone: 'seedhead-light', c: [29.2, 47.1, 2.9], from: 3, to: 3 },
        { tone: 'seedhead', d: 'M 30.6 47 C 30.7 47.1 30.8 47.2 30.8 47.3 C 30.7 47.4 30.5 47.5 30.4 47.6 C 30.3 47.7 30.1 47.7 30.1 47.7 C 30 47.8 30 48 30 48.1 C 30 48.2 29.9 48.4 29.8 48.5 C 29.7 48.5 29.5 48.4 29.4 48.4 C 29.2 48.4 29.1 48.2 29 48.2 C 28.9 48.2 28.8 48.4 28.7 48.4 C 28.5 48.4 28.4 48.5 28.3 48.5 C 28.1 48.4 28.1 48.2 28 48.1 C 28 48 28 47.8 28 47.7 C 27.9 47.7 27.7 47.7 27.6 47.6 C 27.5 47.5 27.3 47.4 27.3 47.3 C 27.3 47.2 27.4 47.1 27.5 47 C 27.5 46.8 27.7 46.8 27.7 46.7 C 27.7 46.6 27.6 46.4 27.6 46.3 C 27.6 46.2 27.6 46 27.6 45.9 C 27.7 45.8 27.9 45.8 28 45.8 C 28.2 45.8 28.3 45.9 28.4 45.8 C 28.5 45.8 28.6 45.6 28.7 45.5 C 28.8 45.4 28.9 45.3 29 45.3 C 29.1 45.3 29.3 45.4 29.4 45.5 C 29.5 45.6 29.5 45.8 29.6 45.8 C 29.7 45.9 29.9 45.8 30 45.8 C 30.1 45.8 30.3 45.8 30.4 45.9 C 30.5 46 30.4 46.2 30.4 46.3 C 30.4 46.4 30.3 46.6 30.3 46.7 C 30.4 46.8 30.5 46.8 30.6 47 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 27.8 96 Q 28.9 68 28.5 40 L 31.5 40 Q 31.1 68 32.2 96 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.6 68 30.2 40 L 31.5 40 Q 31.1 68 32.2 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29 86 Q 23.7 77.1 12 75 Q 19.1 84.2 29 86 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 28.5 85.5 Q 22.2 77.5 11 74 Q 19.2 82.1 28.5 85.5 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 28 85.3 Q 21.6 80.4 14.4 76.5 Q 20.8 81.5 28 85.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31 78 Q 40.9 76.6 47 67 Q 36.3 69.9 31 78 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30.5 77.5 Q 39.5 74.7 46.1 66.1 Q 36.4 70.5 30.5 77.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 32 77.3 Q 38.7 73.5 44.8 68.5 Q 38 72.4 32 77.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29 66 Q 24.3 58.1 14 56 Q 20.2 64.2 29 66 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 28.6 65.6 Q 23 58.5 13.2 55.2 Q 20.4 62.4 28.6 65.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 28.1 65.4 Q 22.4 60.9 16.1 57.4 Q 21.8 61.9 28.1 65.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 34.2 39.6 Q 35.3 44 39.9 44.4 Q 38.8 39.9 34.2 39.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 33.7 39 Q 35.3 42.9 39.3 43.8 Q 37.8 40 33.7 39 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 32.1 41.1 Q 31 45.6 34.9 48.1 Q 36 43.6 32.1 41.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 31.6 40.6 Q 31.1 44.7 34.3 47.5 Q 34.7 43.3 31.6 40.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.4 37.2 Q 38.4 40.6 42.7 38.8 Q 39.6 35.4 35.4 37.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 34.9 36.7 Q 38.1 39.4 42.1 38.3 Q 38.9 35.6 34.9 36.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 29.5 41.5 Q 26.4 44.9 28.7 48.9 Q 31.8 45.5 29.5 41.5 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 28.9 41 Q 26.6 44.5 28.1 48.4 Q 30.4 44.9 28.9 41 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.3 34.6 Q 39.6 36.2 42.6 32.6 Q 38.2 31 35.3 34.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 34.8 34.1 Q 38.9 34.9 42 32 Q 37.9 31.2 34.8 34.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 27 40.6 Q 22.7 42.2 22.8 46.9 Q 27.2 45.2 27 40.6 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 26.5 40.1 Q 22.8 42.1 22.3 46.3 Q 26 44.3 26.5 40.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 34 32.3 Q 38.6 31.7 39.5 27.2 Q 35 27.7 34 32.3 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 33.5 31.8 Q 37.6 30.6 39 26.6 Q 34.9 27.8 33.5 31.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 25.2 38.7 Q 20.6 38.1 18.6 42.3 Q 23.2 42.8 25.2 38.7 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 24.7 38.2 Q 20.5 38.2 18 41.7 Q 22.3 41.6 24.7 38.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 31.8 30.8 Q 35.6 28.2 34.3 23.7 Q 30.6 26.4 31.8 30.8 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 31.3 30.3 Q 34.4 27.4 33.8 23.2 Q 30.7 26.1 31.3 30.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 24.5 36.1 Q 20.7 33.5 17 36.3 Q 20.8 38.9 24.5 36.1 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 24 35.6 Q 20.2 33.7 16.4 35.7 Q 20.2 37.6 24 35.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 29.2 30.6 Q 31.3 26.5 28.2 23.1 Q 26 27.2 29.2 30.6 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 28.7 30 Q 30 26 27.6 22.6 Q 26.2 26.6 28.7 30 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 25.1 33.6 Q 22.9 29.5 18.4 30.2 Q 20.5 34.3 25.1 33.6 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 24.6 33 Q 22 29.6 17.8 29.6 Q 20.3 33.1 24.6 33 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 26.8 31.5 Q 26.8 26.9 22.4 25.5 Q 22.4 30.1 26.8 31.5 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 26.3 31 Q 25.6 26.8 21.8 24.9 Q 22.5 29.1 26.3 31 Z', from: 4, to: 4 },
        { tone: 'seedhead', c: [30, 36, 5.6], from: 4, to: 4 },
        { tone: 'seedhead-light', c: [29, 34.9, 3.5], from: 4, to: 4 },
        { tone: 'seedhead', d: 'M 30.7 34.7 C 30.8 34.9 31 35.1 30.9 35.2 C 30.9 35.3 30.7 35.4 30.5 35.5 C 30.4 35.6 30.2 35.6 30.1 35.7 C 30 35.8 30.1 36 30 36.1 C 29.9 36.3 29.9 36.5 29.8 36.6 C 29.6 36.6 29.4 36.5 29.2 36.5 C 29.1 36.4 29 36.3 28.8 36.3 C 28.7 36.3 28.5 36.4 28.4 36.5 C 28.2 36.5 28 36.6 27.9 36.6 C 27.7 36.5 27.7 36.3 27.6 36.1 C 27.6 36 27.6 35.8 27.5 35.7 C 27.4 35.6 27.2 35.6 27.1 35.5 C 27 35.4 26.7 35.3 26.7 35.2 C 26.7 35.1 26.8 34.9 26.9 34.7 C 27 34.6 27.2 34.5 27.2 34.4 C 27.2 34.3 27.1 34.1 27.1 34 C 27.1 33.8 27 33.6 27.1 33.5 C 27.2 33.4 27.5 33.4 27.6 33.3 C 27.8 33.3 28 33.4 28.1 33.3 C 28.2 33.3 28.3 33.1 28.4 33 C 28.5 32.9 28.7 32.7 28.8 32.7 C 29 32.7 29.1 32.9 29.2 33 C 29.4 33.1 29.4 33.3 29.5 33.3 C 29.6 33.4 29.8 33.3 30 33.3 C 30.2 33.4 30.4 33.4 30.5 33.5 C 30.6 33.6 30.5 33.8 30.5 34 C 30.5 34.1 30.4 34.3 30.4 34.4 C 30.4 34.5 30.6 34.6 30.7 34.7 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 27.6 96 Q 28.8 63 28.4 30 L 31.6 30 Q 31.2 63 32.4 96 Z', from: 5 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.7 63 30.2 30 L 31.6 30 Q 31.2 63 32.4 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29 88 Q 23.4 78.5 11 76 Q 18.5 85.8 29 88 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.5 87.5 Q 21.9 79 10 75 Q 18.6 83.7 28.5 87.5 Z', from: 5 },
        { tone: 'stem', d: 'M 27.9 87.3 Q 21.1 81.9 13.5 77.7 Q 20.3 83.1 27.9 87.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31 80 Q 41.3 78.8 48 69 Q 36.7 71.7 31 80 Z', from: 5 },
        { tone: 'stem', d: 'M 30.5 79.5 Q 39.9 76.9 47 68 Q 36.8 72.3 30.5 79.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 32 79.3 Q 39.2 75.5 45.6 70.5 Q 38.4 74.4 32 79.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29 68 Q 24.2 59.1 13 56 Q 19.5 65.3 29 68 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.6 67.6 Q 22.8 59.5 12.1 55.1 Q 19.7 63.5 28.6 67.6 Z', from: 5 },
        { tone: 'stem', d: 'M 28 67.3 Q 22 62 15.2 57.7 Q 21.3 63 28 67.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31 58 Q 40.1 56.7 46 48 Q 36 50.6 31 58 Z', from: 5 },
        { tone: 'stem', d: 'M 30.6 57.6 Q 38.9 55.1 45.2 47.2 Q 36.1 51.2 30.6 57.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.9 57.4 Q 38.2 53.9 43.9 49.4 Q 37.6 52.9 31.9 57.4 Z', from: 5 },
        { tone: 'deep', d: 'M 35.1 30 Q 36.6 35 41.8 35.3 Q 40.2 30.4 35.1 30 Z', from: 5 },
        { tone: 'deep', d: 'M 34.5 29.5 Q 36.6 33.7 41.1 34.7 Q 39.1 30.4 34.5 29.5 Z', from: 5 },
        { tone: 'deep', d: 'M 32.8 31.8 Q 32.1 36.9 36.6 39.5 Q 37.3 34.4 32.8 31.8 Z', from: 5 },
        { tone: 'deep', d: 'M 32.3 31.3 Q 32.2 36 35.9 38.9 Q 36 34.2 32.3 31.3 Z', from: 5 },
        { tone: 'deep', d: 'M 36.3 27.4 Q 39.9 31.2 44.6 29.3 Q 41.1 25.5 36.3 27.4 Z', from: 5 },
        { tone: 'deep', d: 'M 35.8 26.9 Q 39.5 29.8 44 28.6 Q 40.3 25.7 35.8 26.9 Z', from: 5 },
        { tone: 'deep', d: 'M 30 32.5 Q 27.1 36.8 30.1 41 Q 33 36.7 30 32.5 Z', from: 5 },
        { tone: 'deep', d: 'M 29.5 31.9 Q 27.4 36.2 29.4 40.4 Q 31.5 36.2 29.5 31.9 Z', from: 5 },
        { tone: 'deep', d: 'M 36.3 24.5 Q 41.1 26.4 44.6 22.6 Q 39.8 20.7 36.3 24.5 Z', from: 5 },
        { tone: 'deep', d: 'M 35.8 24 Q 40.4 25 44 22 Q 39.4 21 35.8 24 Z', from: 5 },
        { tone: 'deep', d: 'M 27.2 31.9 Q 22.7 34.5 23.6 39.5 Q 28 37 27.2 31.9 Z', from: 5 },
        { tone: 'base', d: 'M 26.7 31.3 Q 22.9 34.2 22.9 38.9 Q 26.7 36 26.7 31.3 Z', from: 5 },
        { tone: 'deep', d: 'M 35.1 21.9 Q 40.2 21.5 41.7 16.6 Q 36.5 17 35.1 21.9 Z', from: 5 },
        { tone: 'base', d: 'M 34.5 21.4 Q 39.1 20.3 41.1 16 Q 36.5 17.1 34.5 21.4 Z', from: 5 },
        { tone: 'deep', d: 'M 24.9 30.1 Q 19.8 30.5 18.3 35.4 Q 23.5 35 24.9 30.1 Z', from: 5 },
        { tone: 'base', d: 'M 24.4 29.5 Q 19.8 30.5 17.7 34.8 Q 22.3 33.8 24.4 29.5 Z', from: 5 },
        { tone: 'deep', d: 'M 32.8 20.1 Q 37.3 17.5 36.4 12.5 Q 32 15 32.8 20.1 Z', from: 5 },
        { tone: 'light', d: 'M 32.2 19.6 Q 35.9 16.6 35.8 11.8 Q 32.1 14.8 32.2 19.6 Z', from: 5 },
        { tone: 'deep', d: 'M 23.7 27.5 Q 18.9 25.6 15.4 29.4 Q 20.2 31.3 23.7 27.5 Z', from: 5 },
        { tone: 'light', d: 'M 23.1 26.9 Q 18.5 25.8 14.8 28.8 Q 19.4 29.9 23.1 26.9 Z', from: 5 },
        { tone: 'deep', d: 'M 30 19.5 Q 32.9 15.2 29.9 11 Q 27 15.3 30 19.5 Z', from: 5 },
        { tone: 'light', d: 'M 29.4 18.9 Q 31.4 14.6 29.3 10.4 Q 27.3 14.7 29.4 18.9 Z', from: 5 },
        { tone: 'deep', d: 'M 23.7 24.6 Q 20.1 20.8 15.4 22.7 Q 18.9 26.5 23.7 24.6 Z', from: 5 },
        { tone: 'light', d: 'M 23.1 24 Q 19.4 21 14.7 22.1 Q 18.5 25.1 23.1 24 Z', from: 5 },
        { tone: 'deep', d: 'M 27.2 20.2 Q 27.9 15.1 23.4 12.5 Q 22.7 17.6 27.2 20.2 Z', from: 5 },
        { tone: 'light', d: 'M 26.6 19.6 Q 26.6 14.8 22.8 11.9 Q 22.8 16.7 26.6 19.6 Z', from: 5 },
        { tone: 'deep', d: 'M 24.9 22 Q 23.4 17 18.2 16.7 Q 19.8 21.6 24.9 22 Z', from: 5 },
        { tone: 'light', d: 'M 24.3 21.4 Q 22.3 17.1 17.6 16.1 Q 19.7 20.4 24.3 21.4 Z', from: 5 },
        { tone: 'seedhead', c: [30, 26, 6.6], from: 5 },
        { tone: 'seedhead-light', c: [28.8, 24.7, 4.1], from: 5 },
        { tone: 'seedhead', d: 'M 30.8 24.5 C 30.9 24.7 31.1 24.9 31.1 25 C 31.1 25.2 30.8 25.3 30.6 25.4 C 30.5 25.5 30.2 25.5 30.1 25.6 C 30 25.8 30.1 26 30 26.2 C 29.9 26.3 29.9 26.6 29.7 26.7 C 29.6 26.7 29.3 26.6 29.1 26.6 C 28.9 26.5 28.8 26.3 28.6 26.3 C 28.4 26.3 28.3 26.5 28.1 26.6 C 27.9 26.6 27.6 26.7 27.5 26.7 C 27.3 26.6 27.3 26.3 27.2 26.2 C 27.1 26 27.2 25.8 27.1 25.6 C 27 25.5 26.7 25.5 26.6 25.4 C 26.4 25.3 26.1 25.2 26.1 25 C 26.1 24.9 26.3 24.7 26.4 24.5 C 26.5 24.3 26.7 24.3 26.7 24.1 C 26.8 23.9 26.6 23.8 26.6 23.6 C 26.6 23.4 26.5 23.1 26.6 23 C 26.7 22.9 27 22.9 27.2 22.9 C 27.4 22.8 27.6 22.9 27.8 22.9 C 27.9 22.8 28 22.6 28.1 22.4 C 28.2 22.3 28.4 22.1 28.6 22.1 C 28.8 22.1 29 22.3 29.1 22.4 C 29.2 22.6 29.3 22.8 29.4 22.9 C 29.6 22.9 29.8 22.8 30 22.9 C 30.2 22.9 30.5 22.9 30.6 23 C 30.7 23.1 30.6 23.4 30.6 23.6 C 30.6 23.8 30.4 23.9 30.5 24.1 C 30.5 24.3 30.7 24.3 30.8 24.5 Z', from: 5 }
      ]
    },
    aloevera: {
      trunk: 'M 28.2 96 Q 29.1 94 28.6 92 L 31.4 92 Q 30.9 94 31.8 96 Z',
      trunkShort: 'M 28.4 96 Q 29.2 94.8 28.7 93.5 L 31.3 93.5 Q 30.8 94.8 31.6 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[30, 42], [26, 46], [34, 48], [30, 52], [20, 72], [40, 72], [30, 66], [14, 82], [46, 82]],
      parts: [
        { tone: 'deep', d: 'M 31.2 94.6 Q 28.8 84.3 18.3 78 Q 22.6 89.1 31.2 94.6 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 30.3 93.6 Q 26.9 84 17.2 77 Q 22.6 87.3 30.3 93.6 Z', from: 2, to: 2 },
        { tone: 'bloom', d: 'M 28.7 91.3 Q 25.6 86.6 21.8 82.5 Q 24.9 87.2 28.7 91.3 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 25.7 91.7 Q 24.9 90.8 23.6 90.5 Q 24.5 91.5 25.7 91.7 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 22.3 88.4 Q 21.5 87.4 20.2 87.2 Q 21 88.2 22.3 88.4 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 19.6 84.4 Q 18.8 83.5 17.5 83.3 Q 18.4 84.2 19.6 84.4 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 28.7 94.5 Q 37.8 90.2 41.6 79.2 Q 32.1 85.4 28.7 94.5 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 27.8 93.6 Q 36.1 88.5 40.6 78.2 Q 32.1 85.2 27.8 93.6 Z', from: 2, to: 2 },
        { tone: 'bloom', d: 'M 31.3 91.5 Q 35 87.7 38.1 83.3 Q 34.4 87.2 31.3 91.5 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 30.3 88.8 Q 31 87.8 31 86.5 Q 30.2 87.5 30.3 88.8 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 32.7 85 Q 33.5 84 33.4 82.7 Q 32.7 83.7 32.7 85 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 35.8 81.7 Q 36.6 80.7 36.6 79.4 Q 35.8 80.4 35.8 81.7 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 30 95 Q 34 86.7 30 77 Q 26.9 86.7 30 95 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.2 94.2 Q 32.1 85.8 29 76 Q 27.1 85.8 29.2 94.2 Z', from: 2, to: 2 },
        { tone: 'bloom', d: 'M 30 91.5 Q 30.4 86.6 30 81.8 Q 29.6 86.6 30 91.5 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 27.6 90.1 Q 27.6 88.8 26.7 87.9 Q 26.8 89.2 27.6 90.1 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 27.1 86.1 Q 27 84.8 26.2 83.9 Q 26.2 85.2 27.1 86.1 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 27.3 82.1 Q 27.3 80.8 26.4 79.9 Q 26.5 81.2 27.3 82.1 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 31.4 94.4 Q 26.5 81.9 12.6 75 Q 19.8 88.3 31.4 94.4 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 30.3 93.3 Q 24.4 81.7 11.4 73.8 Q 19.7 86.1 30.3 93.3 Z', from: 3, to: 3 },
        { tone: 'bloom', d: 'M 27.6 90.5 Q 23.1 85.1 17.8 80.4 Q 22.3 85.8 27.6 90.5 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 24.2 91.4 Q 23.3 90.6 22 90.5 Q 23 91.3 24.2 91.4 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 19.3 87.5 Q 18.4 86.6 17.1 86.5 Q 18.1 87.4 19.3 87.5 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 15.3 82.7 Q 14.3 81.8 13.1 81.7 Q 14 82.6 15.3 82.7 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 28.6 94.4 Q 40.6 89.7 47.3 76.3 Q 34.5 83.3 28.6 94.4 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 27.5 93.3 Q 38.6 87.6 46.1 75.1 Q 34.3 83.2 27.5 93.3 Z', from: 3, to: 3 },
        { tone: 'bloom', d: 'M 32.4 90.7 Q 37.6 86.4 42.1 81.3 Q 36.9 85.7 32.4 90.7 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 31.5 87.5 Q 32.3 86.5 32.4 85.3 Q 31.6 86.2 31.5 87.5 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 35.3 82.8 Q 36.1 81.9 36.2 80.6 Q 35.4 81.5 35.3 82.8 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 39.8 78.9 Q 40.7 78 40.8 76.7 Q 39.9 77.6 39.8 78.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 30.6 94.9 Q 31.8 82.9 23.2 72.1 Q 23.6 85.6 30.6 94.9 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 29.6 93.9 Q 29.5 82.2 22 70.9 Q 23.8 84.1 29.6 93.9 Z', from: 3, to: 3 },
        { tone: 'bloom', d: 'M 29.1 90.3 Q 27.6 84.2 25.2 78.4 Q 26.7 84.5 29.1 90.3 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 25.9 89.7 Q 25.5 88.5 24.4 87.9 Q 24.9 89.1 25.9 89.7 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 23.6 84.7 Q 23.1 83.5 22 82.9 Q 22.5 84 23.6 84.7 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 22.2 79.3 Q 21.8 78.2 20.7 77.5 Q 21.1 78.7 22.2 79.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 29.3 94.9 Q 37.5 86.8 37.9 73.5 Q 29.9 83.7 29.3 94.9 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 28.3 93.9 Q 35.3 85.3 36.8 72.4 Q 30 83.2 28.3 93.9 Z', from: 3, to: 3 },
        { tone: 'bloom', d: 'M 31 90.6 Q 33.7 85.1 35.5 79.4 Q 32.8 84.8 31 90.6 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 29 88.1 Q 29.4 86.9 29 85.8 Q 28.6 86.9 29 88.1 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 30.4 83 Q 30.8 81.8 30.4 80.6 Q 30 81.8 30.4 83 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 32.7 78.3 Q 33.1 77.1 32.6 75.9 Q 32.2 77.1 32.7 78.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 31.5 94.3 Q 24 80.4 7 73.7 Q 17.3 88.3 31.5 94.3 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30.3 93.1 Q 21.7 80.2 5.6 72.3 Q 17.1 85.7 30.3 93.1 Z', from: 4, to: 4 },
        { tone: 'bloom', d: 'M 26.5 90 Q 20.6 84.3 13.9 79.5 Q 19.8 85.2 26.5 90 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 27.3 86.3 Q 27.1 85 26.2 84.2 Q 26.4 85.4 27.3 86.3 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 22.1 80.8 Q 21.9 79.5 21 78.7 Q 21.2 79.9 22.1 80.8 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 16.1 76.3 Q 15.9 75 15 74.2 Q 15.2 75.4 16.1 76.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 28.4 94.2 Q 43.1 89.9 52.9 75.1 Q 37 82 28.4 94.2 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 27.2 93 Q 41 87.4 51.5 73.8 Q 36.7 82 27.2 93 Z', from: 4, to: 4 },
        { tone: 'bloom', d: 'M 33.5 90.3 Q 40.1 85.8 46 80.5 Q 39.4 85 33.5 90.3 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 32.8 86.6 Q 33.8 85.8 34 84.5 Q 33 85.4 32.8 86.6 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 38 81.5 Q 39 80.7 39.2 79.4 Q 38.2 80.3 38 81.5 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 44 77.4 Q 44.9 76.5 45.2 75.3 Q 44.2 76.1 44 77.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30.8 94.8 Q 30.3 80.4 19 68.3 Q 21.5 84.4 30.8 94.8 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 29.7 93.7 Q 27.8 79.8 17.7 67 Q 21.7 82.5 29.7 93.7 Z', from: 4, to: 4 },
        { tone: 'bloom', d: 'M 28.4 89.4 Q 25.8 82.3 22.3 75.7 Q 24.9 82.8 28.4 89.4 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 24.8 89.1 Q 24.2 88 23.1 87.5 Q 23.6 88.6 24.8 89.1 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 21.3 83.3 Q 20.8 82.2 19.6 81.6 Q 20.2 82.8 21.3 83.3 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 18.9 77 Q 18.4 75.8 17.2 75.3 Q 17.8 76.4 18.9 77 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 29.1 94.8 Q 39.7 85.8 42.2 70 Q 31.5 81.5 29.1 94.8 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 28 93.7 Q 37.3 84 41 68.8 Q 31.6 81 28 93.7 Z', from: 4, to: 4 },
        { tone: 'bloom', d: 'M 31.7 89.7 Q 35.6 83.6 38.5 76.9 Q 34.7 83.1 31.7 89.7 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 29.8 86.8 Q 30.4 85.6 30.1 84.4 Q 29.5 85.6 29.8 86.8 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 32.2 80.7 Q 32.7 79.6 32.4 78.3 Q 31.9 79.5 32.2 80.7 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 35.6 75.1 Q 36.1 74 35.8 72.8 Q 35.3 73.9 35.6 75.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30 95 Q 35 83 30 69 Q 26.1 83 30 95 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 28.9 93.9 Q 32.6 81.9 28.8 67.8 Q 26.4 81.9 28.9 93.9 Z', from: 4, to: 4 },
        { tone: 'bloom', d: 'M 30 89.7 Q 30.5 83 30 76.2 Q 29.5 83 30 89.7 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 27 88.1 Q 27 86.8 26.1 85.9 Q 26.2 87.2 27 88.1 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 26.3 82.1 Q 26.3 80.8 25.4 79.9 Q 25.5 81.2 26.3 82.1 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 26.7 76.1 Q 26.6 74.8 25.8 73.9 Q 25.8 75.2 26.7 76.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 31.6 94.2 Q 22.7 79.4 4 72.7 Q 15.9 88.1 31.6 94.2 Z', from: 5 },
        { tone: 'light', d: 'M 30.3 92.9 Q 20.3 79.3 2.5 71.2 Q 15.6 85.4 30.3 92.9 Z', from: 5 },
        { tone: 'bloom', d: 'M 25.9 89.8 Q 19.2 83.8 11.8 78.8 Q 18.4 84.8 25.9 89.8 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 26.6 85.7 Q 26.4 84.5 25.4 83.6 Q 25.7 84.9 26.6 85.7 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 20.7 79.9 Q 20.5 78.7 19.5 77.9 Q 19.7 79.1 20.7 79.9 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 13.9 75.2 Q 13.7 74 12.7 73.1 Q 12.9 74.4 13.9 75.2 Z', from: 5 },
        { tone: 'deep', d: 'M 28.4 94.2 Q 44.6 89.8 55.9 74.2 Q 38.3 81.2 28.4 94.2 Z', from: 5 },
        { tone: 'light', d: 'M 27.1 92.9 Q 42.3 87.2 54.4 72.7 Q 37.9 81.2 27.1 92.9 Z', from: 5 },
        { tone: 'bloom', d: 'M 34.1 90 Q 41.5 85.4 48.1 79.8 Q 40.7 84.5 34.1 90 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 33.5 86.1 Q 34.5 85.3 34.7 84.1 Q 33.8 84.8 33.5 86.1 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 39.5 80.7 Q 40.4 79.9 40.7 78.6 Q 39.7 79.4 39.5 80.7 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 46.2 76.3 Q 47.2 75.5 47.4 74.3 Q 46.5 75.1 46.2 76.3 Z', from: 5 },
        { tone: 'deep', d: 'M 31 94.7 Q 28.7 79.1 15 67 Q 19.7 84.2 31 94.7 Z', from: 5 },
        { tone: 'light', d: 'M 29.8 93.5 Q 26 78.5 13.6 65.6 Q 19.8 82.1 29.8 93.5 Z', from: 5 },
        { tone: 'bloom', d: 'M 27.7 89 Q 24.1 81.6 19.5 74.8 Q 23.1 82.2 27.7 89 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 23.8 89.2 Q 23.1 88.1 21.9 87.7 Q 22.6 88.8 23.8 89.2 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 19.3 83.1 Q 18.7 82 17.5 81.6 Q 18.2 82.7 19.3 83.1 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 16 76.4 Q 15.3 75.3 14.1 74.9 Q 14.8 76 16 76.4 Z', from: 5 },
        { tone: 'deep', d: 'M 28.9 94.7 Q 41.5 86 46.2 69 Q 33.2 80.4 28.9 94.7 Z', from: 5 },
        { tone: 'light', d: 'M 27.7 93.5 Q 39 83.9 44.9 67.6 Q 33.3 80 27.7 93.5 Z', from: 5 },
        { tone: 'bloom', d: 'M 32.4 89.4 Q 37.4 83.1 41.4 76.2 Q 36.4 82.5 32.4 89.4 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 30.7 86 Q 31.3 85 31.2 83.7 Q 30.5 84.8 30.7 86 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 34.1 79.6 Q 34.7 78.5 34.6 77.3 Q 33.9 78.3 34.1 79.6 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 38.5 73.8 Q 39.1 72.7 38.9 71.5 Q 38.3 72.6 38.5 73.8 Z', from: 5 },
        { tone: 'deep', d: 'M 30.4 95 Q 32.9 80.8 24.4 66.6 Q 23.5 82.8 30.4 95 Z', from: 5 },
        { tone: 'light', d: 'M 29.3 93.8 Q 30.3 79.8 23.1 65.3 Q 23.8 81.3 29.3 93.8 Z', from: 5 },
        { tone: 'bloom', d: 'M 29.2 89.1 Q 28.2 81.7 26.1 74.5 Q 27.1 81.9 29.2 89.1 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 25.7 88.1 Q 25.4 86.9 24.4 86.2 Q 24.7 87.4 25.7 88.1 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 23.5 81.7 Q 23.2 80.5 22.2 79.7 Q 22.5 81 23.5 81.7 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 22.5 75 Q 22.2 73.8 21.2 73 Q 21.5 74.3 22.5 75 Z', from: 5 },
        { tone: 'deep', d: 'M 29.4 94.9 Q 38 84 37.2 68 Q 29.1 81.4 29.4 94.9 Z', from: 5 },
        { tone: 'light', d: 'M 28.3 93.8 Q 35.5 82.4 35.9 66.8 Q 29.3 80.7 28.3 93.8 Z', from: 5 },
        { tone: 'bloom', d: 'M 31 89.4 Q 33.5 82.6 35 75.5 Q 32.5 82.3 31 89.4 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 28.5 87 Q 28.8 85.7 28.3 84.6 Q 28 85.8 28.5 87 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 29.6 80.5 Q 29.9 79.3 29.3 78.1 Q 29.1 79.4 29.6 80.5 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 31.7 74.4 Q 32 73.1 31.5 72 Q 31.2 73.2 31.7 74.4 Z', from: 5 },
        { tone: 'stemdark', d: 'M 29 78 Q 29.6 61 29.9 44 L 31.3 44 Q 31.3 61 31 78 Z', from: 5 },
        { tone: 'root-deep', d: 'M 30 48 Q 27.3 48.2 25.8 50.4 Q 28.5 50.2 30 48 Z', from: 5 },
        { tone: 'root-light', d: 'M 29.7 47.7 Q 27.5 48 26 49.7 Q 28.2 49.4 29.7 47.7 Z', from: 5 },
        { tone: 'root-deep', d: 'M 30 46.7 Q 31.5 48.9 34.2 49.1 Q 32.7 46.9 30 46.7 Z', from: 5 },
        { tone: 'root', d: 'M 29.7 46.4 Q 31.2 48.1 33.4 48.4 Q 31.9 46.7 29.7 46.4 Z', from: 5 },
        { tone: 'root-deep', d: 'M 30 45.3 Q 27.3 45.5 25.8 47.7 Q 28.5 47.5 30 45.3 Z', from: 5 },
        { tone: 'root-light', d: 'M 29.7 45.1 Q 27.5 45.4 26 47.1 Q 28.2 46.7 29.7 45.1 Z', from: 5 },
        { tone: 'root-deep', d: 'M 30 44 Q 31.5 46.2 34.2 46.4 Q 32.7 44.2 30 44 Z', from: 5 },
        { tone: 'root', d: 'M 29.7 43.7 Q 31.2 45.4 33.4 45.7 Q 31.9 44 29.7 43.7 Z', from: 5 },
        { tone: 'root-deep', d: 'M 30 42.7 Q 27.3 42.9 25.8 45.1 Q 28.5 44.9 30 42.7 Z', from: 5 },
        { tone: 'root-light', d: 'M 29.7 42.4 Q 27.5 42.7 26 44.4 Q 28.2 44.1 29.7 42.4 Z', from: 5 },
        { tone: 'root-deep', d: 'M 30 41.3 Q 31.5 43.5 34.2 43.7 Q 32.7 41.5 30 41.3 Z', from: 5 },
        { tone: 'root', d: 'M 29.7 41.1 Q 31.2 42.7 33.4 43.1 Q 31.9 41.4 29.7 41.1 Z', from: 5 }
      ]
    },
    apple: {
      trunk: 'M 25.8 96 Q 27.9 79 27 62 L 33 62 Q 32.1 79 34.2 96 Z',
      trunkShort: 'M 27 96 Q 28.5 86 27.6 76 L 32.4 76 Q 31.5 86 33 96 Z',
      trunkTone: 'wood',
      blossoms: [[19, 53], [40, 54], [29, 59], [24, 44], [37, 43], [30, 31], [14, 44], [46, 45], [30, 48]],
      parts: [
        { tone: 'wood', d: 'M 27 96 Q 28.5 86 27.6 76 L 32.4 76 Q 31.5 86 33 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.8 86 30.2 76 L 32.4 76 Q 31.5 86 33 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 39.5 71 C 39.2 71.8 38.3 72.4 38 73.2 C 37.6 74 37.9 74.9 37.6 75.7 C 37.3 76.5 36.9 77.7 36 78.2 C 35.2 78.7 33.7 78.6 32.6 78.6 C 31.5 78.6 30.5 78.1 29.5 78.1 C 28.5 78.1 27.5 78.6 26.4 78.6 C 25.3 78.6 23.8 78.7 23 78.2 C 22.1 77.7 21.7 76.5 21.4 75.7 C 21.1 74.9 21.4 74 21 73.2 C 20.7 72.4 19.8 71.8 19.5 71 C 19.2 70.2 18.6 69 18.9 68.3 C 19.3 67.5 20.5 66.8 21.4 66.3 C 22.3 65.8 23.4 65.7 24.3 65.2 C 25.1 64.8 25.5 63.9 26.4 63.4 C 27.3 62.9 28.5 62.1 29.5 62.1 C 30.5 62.1 31.7 62.9 32.6 63.4 C 33.5 63.9 33.9 64.8 34.7 65.2 C 35.6 65.7 36.7 65.8 37.6 66.3 C 38.5 66.8 39.7 67.5 40.1 68.3 C 40.4 69 39.8 70.2 39.5 71 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 36.9 69.8 C 36.6 70.5 35.9 71 35.6 71.6 C 35.4 72.3 35.6 73 35.3 73.7 C 35 74.3 34.6 75.3 33.9 75.7 C 33.2 76.1 31.9 76 31 76 C 30.1 76 29.3 75.7 28.4 75.7 C 27.5 75.7 26.7 76 25.8 76 C 24.9 76 23.6 76.1 22.9 75.7 C 22.2 75.3 21.8 74.3 21.5 73.7 C 21.2 73 21.4 72.3 21.2 71.6 C 20.9 71 20.2 70.5 19.9 69.8 C 19.6 69.1 19.2 68.2 19.5 67.6 C 19.7 66.9 20.8 66.4 21.5 65.9 C 22.3 65.5 23.2 65.4 23.9 65 C 24.6 64.7 25 64 25.8 63.6 C 26.5 63.1 27.5 62.6 28.4 62.6 C 29.3 62.6 30.3 63.1 31 63.6 C 31.8 64 32.2 64.7 32.9 65 C 33.6 65.4 34.5 65.5 35.3 65.9 C 36 66.4 37.1 66.9 37.3 67.6 C 37.6 68.2 37.2 69.1 36.9 69.8 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 30.3 68 C 30.4 68.5 30.5 69.3 30.1 69.8 C 29.7 70.3 28.8 70.7 28.1 70.9 C 27.4 71.1 26.6 71 25.9 71 C 25.2 71 24.4 71.1 23.7 70.9 C 23 70.7 22.1 70.3 21.7 69.8 C 21.3 69.3 21.4 68.5 21.5 68 C 21.6 67.4 22.1 66.9 22.5 66.4 C 22.8 66 23.1 65.4 23.7 65.1 C 24.3 64.7 25.2 64.3 25.9 64.3 C 26.6 64.3 27.5 64.7 28.1 65.1 C 28.7 65.4 29 66 29.3 66.4 C 29.7 66.9 30.2 67.4 30.3 68 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 25.8 96 Q 27.9 79 27 62 L 33 62 Q 32.1 79 34.2 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.8 96 Q 31.2 79 30.3 62 L 33 62 Q 32.1 79 34.2 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 42.2 58 C 42.2 58.9 42.9 59.8 43 60.8 C 43.2 61.9 43.4 63.2 42.9 64.1 C 42.3 64.9 40.7 65.4 39.5 65.8 C 38.4 66.2 37.1 66.1 36.1 66.6 C 35.1 67 34.5 68 33.5 68.6 C 32.5 69.2 31.2 70.1 30 70.1 C 28.8 70.1 27.5 69.2 26.5 68.6 C 25.5 68 24.9 67 23.9 66.6 C 22.9 66.1 21.6 66.2 20.5 65.8 C 19.3 65.4 17.7 64.9 17.1 64.1 C 16.6 63.2 16.8 61.9 17 60.8 C 17.1 59.8 17.9 58.9 17.9 58 C 17.9 57.1 17.1 56.2 17 55.2 C 16.8 54.1 16.6 52.8 17.1 52 C 17.7 51.1 19.3 50.6 20.5 50.2 C 21.6 49.8 22.9 49.9 23.9 49.4 C 24.9 49 25.5 48 26.5 47.4 C 27.5 46.8 28.8 45.9 30 45.9 C 31.2 45.9 32.5 46.8 33.5 47.4 C 34.5 48 35.1 49 36.1 49.4 C 37.1 49.9 38.4 49.8 39.5 50.2 C 40.7 50.6 42.3 51.1 42.9 52 C 43.4 52.8 43.2 54.1 43 55.2 C 42.9 56.2 42.2 57.1 42.2 58 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 38.9 56.4 C 38.9 57.1 39.5 57.9 39.6 58.7 C 39.7 59.5 39.9 60.6 39.4 61.3 C 38.9 62 37.6 62.4 36.6 62.7 C 35.7 63.1 34.6 63 33.7 63.4 C 32.9 63.8 32.4 64.6 31.5 65.1 C 30.6 65.5 29.5 66.2 28.5 66.2 C 27.5 66.2 26.4 65.5 25.5 65.1 C 24.7 64.6 24.2 63.8 23.3 63.4 C 22.5 63 21.3 63.1 20.4 62.7 C 19.5 62.4 18.1 62 17.6 61.3 C 17.1 60.6 17.3 59.5 17.4 58.7 C 17.5 57.9 18.1 57.1 18.1 56.4 C 18.1 55.6 17.5 54.8 17.4 54 C 17.3 53.2 17.1 52.1 17.6 51.4 C 18.1 50.7 19.5 50.3 20.4 50 C 21.3 49.6 22.5 49.7 23.3 49.3 C 24.2 48.9 24.7 48.1 25.5 47.6 C 26.4 47.2 27.5 46.5 28.5 46.5 C 29.5 46.5 30.6 47.2 31.5 47.6 C 32.4 48.1 32.9 48.9 33.7 49.3 C 34.6 49.7 35.7 49.6 36.6 50 C 37.6 50.3 38.9 50.7 39.4 51.4 C 39.9 52.1 39.7 53.2 39.6 54 C 39.5 54.8 38.9 55.6 38.9 56.4 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 31.6 53.8 C 31.6 54.4 31.1 55.1 30.6 55.6 C 30.2 56.1 29.5 56.4 29 56.8 C 28.4 57.2 28.1 57.7 27.4 58.1 C 26.8 58.4 25.9 58.9 25.1 58.9 C 24.4 58.9 23.5 58.4 22.9 58.1 C 22.2 57.7 21.9 57.2 21.3 56.8 C 20.8 56.4 20.1 56.1 19.7 55.6 C 19.2 55.1 18.7 54.4 18.7 53.8 C 18.7 53.2 19.2 52.5 19.7 52.1 C 20.1 51.6 20.8 51.3 21.3 50.8 C 21.9 50.4 22.2 49.9 22.9 49.6 C 23.5 49.2 24.4 48.8 25.1 48.8 C 25.9 48.8 26.8 49.2 27.4 49.6 C 28.1 49.9 28.4 50.4 29 50.8 C 29.5 51.3 30.2 51.6 30.6 52.1 C 31.1 52.5 31.6 53.2 31.6 53.8 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 25.2 96 Q 27.6 76 26.8 56 L 33.2 56 Q 32.4 76 34.8 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.9 96 Q 31.3 76 30.3 56 L 33.2 56 Q 32.4 76 34.8 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 46.5 47 C 47 48 48 49.3 47.7 50.3 C 47.4 51.3 45.9 52.1 44.9 52.9 C 43.9 53.6 42.4 53.8 41.6 54.6 C 40.8 55.4 40.9 56.6 40.3 57.6 C 39.7 58.5 39 59.9 37.9 60.4 C 36.8 60.8 35 60.4 33.7 60.2 C 32.4 60 31.2 59.2 30 59.2 C 28.8 59.2 27.6 60 26.3 60.2 C 25 60.4 23.2 60.8 22.1 60.4 C 21 59.9 20.3 58.5 19.7 57.6 C 19.1 56.6 19.2 55.4 18.4 54.6 C 17.6 53.8 16.1 53.6 15.1 52.9 C 14.1 52.1 12.6 51.3 12.3 50.3 C 12 49.3 13 48 13.5 47 C 14 46 15.2 45.3 15.5 44.3 C 15.8 43.3 15.1 42.2 15.1 41.1 C 15.2 40.1 15 38.5 15.8 37.7 C 16.6 37 18.4 36.7 19.7 36.4 C 21 36.2 22.5 36.5 23.6 36.1 C 24.7 35.6 25.3 34.5 26.3 33.8 C 27.4 33.2 28.8 32.2 30 32.2 C 31.2 32.2 32.6 33.2 33.7 33.8 C 34.7 34.5 35.3 35.6 36.4 36.1 C 37.5 36.5 39 36.2 40.3 36.4 C 41.6 36.7 43.4 37 44.2 37.7 C 45 38.5 44.8 40.1 44.9 41.1 C 44.9 42.2 44.2 43.3 44.5 44.3 C 44.8 45.3 46 46 46.5 47 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 42.2 45 C 42.6 45.8 43.4 46.9 43.2 47.7 C 42.9 48.5 41.7 49.2 40.8 49.8 C 40 50.4 38.8 50.6 38.1 51.2 C 37.5 51.9 37.5 52.9 36.9 53.6 C 36.4 54.4 35.8 55.5 34.8 55.9 C 33.9 56.3 32.4 55.9 31.3 55.8 C 30.2 55.6 29.2 55 28.2 55 C 27.1 55 26.2 55.6 25.1 55.8 C 24 55.9 22.5 56.3 21.5 55.9 C 20.6 55.5 20 54.4 19.4 53.6 C 18.9 52.9 18.9 51.9 18.3 51.2 C 17.6 50.6 16.4 50.4 15.5 49.8 C 14.7 49.2 13.4 48.5 13.2 47.7 C 13 46.9 13.7 45.8 14.2 45 C 14.6 44.2 15.6 43.5 15.8 42.7 C 16 41.9 15.5 41.1 15.5 40.2 C 15.6 39.3 15.5 38.1 16.2 37.4 C 16.8 36.8 18.4 36.6 19.4 36.3 C 20.5 36.1 21.7 36.3 22.7 35.9 C 23.6 35.6 24.1 34.7 25.1 34.2 C 26 33.7 27.1 32.9 28.2 32.9 C 29.2 32.9 30.4 33.7 31.3 34.2 C 32.2 34.7 32.8 35.6 33.7 35.9 C 34.6 36.3 35.8 36.1 36.9 36.3 C 38 36.6 39.5 36.8 40.2 37.4 C 40.8 38.1 40.8 39.3 40.8 40.2 C 40.9 41.1 40.3 41.9 40.6 42.7 C 40.8 43.5 41.8 44.2 42.2 45 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.3 41.9 C 31.1 42.5 30.6 42.9 30.3 43.5 C 30.1 44 30.2 44.6 29.9 45.2 C 29.7 45.8 29.3 46.5 28.7 46.9 C 28.1 47.2 27.1 47.2 26.3 47.3 C 25.5 47.3 24.8 47 24.1 47 C 23.3 47 22.6 47.3 21.8 47.3 C 21 47.2 20 47.2 19.4 46.9 C 18.8 46.5 18.5 45.8 18.2 45.2 C 17.9 44.6 18 44 17.8 43.5 C 17.5 42.9 17 42.5 16.8 41.9 C 16.6 41.3 16.3 40.5 16.5 40 C 16.8 39.4 17.6 38.9 18.2 38.5 C 18.8 38.2 19.6 38 20.2 37.7 C 20.8 37.4 21.2 36.8 21.8 36.5 C 22.5 36.1 23.3 35.7 24.1 35.7 C 24.8 35.7 25.7 36.1 26.3 36.5 C 27 36.8 27.3 37.4 27.9 37.7 C 28.5 38 29.3 38.2 29.9 38.5 C 30.5 38.9 31.4 39.4 31.6 40 C 31.8 40.5 31.5 41.3 31.3 41.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 21.3 49.2 Q 21.3 52 21.5 54.9 L 20.5 54.9 Q 20 52.1 19.7 49.3 Z', from: 4, to: 4 },
        { tone: 'deep', c: [21, 57, 4.2], from: 4, to: 4 },
        { tone: 'base', c: [20.7, 56.6, 3.6], from: 4, to: 4 },
        { tone: 'light', c: [19.8, 55.7, 1.1], from: 4, to: 4 },
        { tone: 'deep', d: 'M 17.9 54.5 Q 20.8 55.4 23.4 53.8 Q 20.7 54.1 17.9 54.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 38.3 50.2 Q 38.3 53 38.5 55.9 L 37.5 55.9 Q 37 53.1 36.7 50.3 Z', from: 4, to: 4 },
        { tone: 'deep', c: [38, 58, 4.2], from: 4, to: 4 },
        { tone: 'base', c: [37.7, 57.6, 3.6], from: 4, to: 4 },
        { tone: 'light', c: [36.8, 56.7, 1.1], from: 4, to: 4 },
        { tone: 'deep', d: 'M 34.9 55.5 Q 37.8 56.4 40.4 54.8 Q 37.7 55.1 34.9 55.5 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 24.8 96 Q 27.4 74 26.6 52 L 33.4 52 Q 32.6 74 35.2 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.9 96 Q 31.5 74 30.3 52 L 33.4 52 Q 32.6 74 35.2 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 50.8 40 C 50.8 41 49.5 42.2 48.6 43.1 C 47.8 44 46.4 44.6 45.9 45.5 C 45.4 46.5 46 47.7 45.8 48.9 C 45.6 50 45.6 51.7 44.7 52.4 C 43.8 53.1 41.9 53.1 40.6 53.3 C 39.2 53.5 37.7 53 36.6 53.4 C 35.4 53.8 34.8 55 33.7 55.7 C 32.6 56.4 31.2 57.5 30 57.5 C 28.8 57.5 27.4 56.4 26.3 55.7 C 25.2 55 24.6 53.8 23.4 53.4 C 22.3 53 20.8 53.5 19.4 53.3 C 18.1 53.1 16.2 53.1 15.3 52.4 C 14.4 51.7 14.4 50 14.2 48.9 C 14 47.7 14.6 46.5 14.1 45.5 C 13.6 44.6 12.2 44 11.4 43.1 C 10.5 42.2 9.2 41 9.2 40 C 9.2 39 10.5 37.8 11.4 36.9 C 12.2 36 13.6 35.4 14.1 34.5 C 14.6 33.5 14 32.3 14.2 31.1 C 14.4 30 14.4 28.3 15.3 27.6 C 16.2 26.9 18.1 26.9 19.4 26.7 C 20.8 26.5 22.3 27 23.4 26.6 C 24.6 26.2 25.2 25 26.3 24.3 C 27.4 23.6 28.8 22.5 30 22.5 C 31.2 22.5 32.6 23.6 33.7 24.3 C 34.8 25 35.4 26.2 36.6 26.6 C 37.7 27 39.2 26.5 40.6 26.7 C 41.9 26.9 43.8 26.9 44.7 27.6 C 45.6 28.3 45.6 30 45.8 31.1 C 46 32.3 45.4 33.5 45.9 34.5 C 46.4 35.4 47.8 36 48.6 36.9 C 49.5 37.8 50.8 39 50.8 40 Z', from: 5 },
        { tone: 'stem', d: 'M 45.5 37.6 C 45.5 38.5 44.4 39.4 43.7 40.2 C 43.1 40.9 41.9 41.4 41.5 42.2 C 41.1 43 41.5 44 41.3 44.9 C 41.2 45.8 41.1 47.1 40.4 47.7 C 39.6 48.3 38 48.4 36.9 48.5 C 35.7 48.7 34.5 48.3 33.5 48.6 C 32.6 49 32 49.9 31.1 50.5 C 30.1 51 29 51.9 27.9 51.9 C 26.9 51.9 25.7 51 24.8 50.5 C 23.8 49.9 23.3 49 22.3 48.6 C 21.3 48.3 20.1 48.7 18.9 48.5 C 17.8 48.4 16.2 48.3 15.5 47.7 C 14.7 47.1 14.7 45.8 14.5 44.9 C 14.3 44 14.7 43 14.3 42.2 C 13.9 41.4 12.7 40.9 12.1 40.2 C 11.4 39.4 10.3 38.5 10.3 37.6 C 10.3 36.7 11.4 35.8 12.1 35 C 12.7 34.3 13.9 33.8 14.3 33 C 14.7 32.2 14.3 31.2 14.5 30.3 C 14.7 29.4 14.7 28.1 15.5 27.5 C 16.2 26.9 17.8 26.8 18.9 26.7 C 20.1 26.5 21.3 26.9 22.3 26.6 C 23.3 26.2 23.8 25.3 24.8 24.7 C 25.7 24.2 26.9 23.3 27.9 23.3 C 29 23.3 30.1 24.2 31.1 24.7 C 32 25.3 32.6 26.2 33.5 26.6 C 34.5 26.9 35.7 26.5 36.9 26.7 C 38 26.8 39.6 26.9 40.4 27.5 C 41.1 28.1 41.2 29.4 41.3 30.3 C 41.5 31.2 41.1 32.2 41.5 33 C 41.9 33.8 43.1 34.3 43.7 35 C 44.4 35.8 45.5 36.7 45.5 37.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.8 33.9 C 30.8 34.5 31.2 35.1 31.2 35.7 C 31.3 36.3 31.4 37.1 31 37.6 C 30.7 38.1 29.7 38.4 29.1 38.7 C 28.4 39 27.6 39 27 39.2 C 26.4 39.5 26 40.1 25.3 40.4 C 24.7 40.7 23.9 41.2 23.2 41.2 C 22.4 41.2 21.6 40.7 21 40.4 C 20.4 40.1 20 39.5 19.3 39.2 C 18.7 39 17.9 39 17.2 38.7 C 16.6 38.4 15.7 38.1 15.3 37.6 C 14.9 37.1 15 36.3 15.1 35.7 C 15.1 35.1 15.5 34.5 15.5 33.9 C 15.5 33.3 15.1 32.8 15.1 32.2 C 15 31.6 14.9 30.8 15.3 30.3 C 15.7 29.8 16.6 29.4 17.2 29.2 C 17.9 28.9 18.7 28.9 19.3 28.6 C 20 28.3 20.4 27.8 21 27.4 C 21.6 27.1 22.4 26.6 23.2 26.6 C 23.9 26.6 24.7 27.1 25.3 27.4 C 26 27.8 26.4 28.3 27 28.6 C 27.6 28.9 28.4 28.9 29.1 29.2 C 29.7 29.4 30.7 29.8 31 30.3 C 31.4 30.8 31.3 31.6 31.2 32.2 C 31.2 32.8 30.8 33.3 30.8 33.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 19.3 44.8 Q 19.3 47.8 19.5 50.8 L 18.5 50.8 Q 17.9 47.9 17.7 44.9 Z', from: 5 },
        { tone: 'deep', c: [19, 53, 4.4], from: 5 },
        { tone: 'base', c: [18.7, 52.6, 3.8], from: 5 },
        { tone: 'light', c: [17.7, 51.6, 1.1], from: 5 },
        { tone: 'deep', d: 'M 15.7 50.4 Q 18.8 51.3 21.6 49.7 Q 18.6 49.9 15.7 50.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 40.3 45.8 Q 40.3 48.8 40.5 51.8 L 39.5 51.8 Q 38.9 48.9 38.7 45.9 Z', from: 5 },
        { tone: 'deep', c: [40, 54, 4.4], from: 5 },
        { tone: 'base', c: [39.7, 53.6, 3.8], from: 5 },
        { tone: 'light', c: [38.7, 52.6, 1.1], from: 5 },
        { tone: 'deep', d: 'M 36.7 51.4 Q 39.8 52.3 42.6 50.7 Q 39.6 50.9 36.7 51.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.3 50.8 Q 29.3 53.8 29.5 56.8 L 28.5 56.8 Q 27.9 53.9 27.7 50.9 Z', from: 5 },
        { tone: 'deep', c: [29, 59, 4.4], from: 5 },
        { tone: 'base', c: [28.7, 58.6, 3.8], from: 5 },
        { tone: 'light', c: [27.7, 57.6, 1.1], from: 5 },
        { tone: 'deep', d: 'M 25.7 56.4 Q 28.8 57.3 31.6 55.7 Q 28.6 55.9 25.7 56.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 24.3 35.8 Q 24.3 38.8 24.5 41.8 L 23.5 41.8 Q 22.9 38.9 22.7 35.9 Z', from: 5 },
        { tone: 'deep', c: [24, 44, 4.4], from: 5 },
        { tone: 'base', c: [23.7, 43.6, 3.8], from: 5 },
        { tone: 'light', c: [22.7, 42.6, 1.1], from: 5 },
        { tone: 'deep', d: 'M 20.7 41.4 Q 23.8 42.3 26.6 40.7 Q 23.6 40.9 20.7 41.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 37.3 34.8 Q 37.3 37.8 37.5 40.8 L 36.5 40.8 Q 35.9 37.9 35.7 34.9 Z', from: 5 },
        { tone: 'deep', c: [37, 43, 4.4], from: 5 },
        { tone: 'base', c: [36.7, 42.6, 3.8], from: 5 },
        { tone: 'light', c: [35.7, 41.6, 1.1], from: 5 },
        { tone: 'deep', d: 'M 33.7 40.4 Q 36.8 41.3 39.6 39.7 Q 36.6 39.9 33.7 40.4 Z', from: 5 }
      ]
    },
    carrot: {
      trunk: 'M 28.4 96 Q 29.2 90 28.8 84 L 31.2 84 Q 30.8 90 31.6 96 Z',
      trunkShort: 'M 28.6 96 Q 29.3 93 28.9 90 L 31.1 90 Q 30.7 93 31.4 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[30, 84], [24, 80], [36, 80], [30, 74], [22, 70], [38, 70], [30, 64], [16, 66], [44, 66]],
      parts: [
        { tone: 'soil-deep', d: 'M 20 96 Q 23.8 92 30 92 Q 36.2 92 40 96 Z', from: 2, to: 2 },
        { tone: 'soil', d: 'M 21.2 96 Q 24.8 92.6 29.6 92.6 Q 33 92.9 36 96 Z', from: 2, to: 2 },
        { tone: 'root-deep', d: 'M 26.8 87 Q 28.4 89 30.4 95.4 Q 31.9 90 33.2 87 Q 30 84.8 26.8 87 Z', from: 2, to: 2 },
        { tone: 'root', d: 'M 27.3 87.8 Q 28.7 90 29.9 93.8 Q 31.3 90.4 32.4 87.8 Q 30 86 27.3 87.8 Z', from: 2, to: 2 },
        { tone: 'root-light', d: 'M 27.9 88.2 Q 29 92 29.4 90.4 Q 29.8 91 29.4 87.6 Q 28.6 87.2 27.9 88.2 Z', from: 2, to: 2 },
        { tone: 'root-deep', d: 'M 27.6 88.4 Q 29.8 89.4 32.3 89.6 Q 30 88.6 27.6 88.4 Z', from: 2, to: 2 },
        { tone: 'root-deep', d: 'M 28.1 90.3 Q 29.8 91.3 31.8 91.5 Q 30.1 90.5 28.1 90.3 Z', from: 2, to: 2 },
        { tone: 'root-deep', d: 'M 28.6 92.1 Q 29.8 93.1 31.3 93.3 Q 30.1 92.3 28.6 92.1 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.6 88.3 L 28.9 88.2 L 28.9 87.7 L 28.2 87.7 L 28.4 87.2 L 27.6 87.2 L 27.8 86.6 L 27 86.7 L 27.3 86 L 26.4 86.1 L 26.8 85.4 L 25.9 85.5 L 26.3 84.7 L 25.3 84.9 L 25.8 84.1 L 24.8 84.2 L 25.4 83.5 L 24.4 83.6 L 24.9 82.8 L 23.9 83 L 24.5 82.1 L 23.5 82.3 L 24 81.5 L 23.1 81.6 L 23.6 80.8 L 22.7 80.9 L 23.2 80.1 L 22.3 80.2 L 22.8 79.4 L 21.9 79.5 L 22.5 78.7 L 21.6 78.8 L 22.1 78 L 21.3 78 L 21.8 77.3 L 21 77.3 L 21.4 76.5 L 20.8 76.5 L 21.1 75.8 L 20.6 75.7 L 20.9 75 L 20.5 74.8 L 20.7 74.2 L 21.3 73.8 L 21.9 73.9 L 22 74.3 L 22.7 74.3 L 22.6 74.9 L 23.4 74.8 L 23.1 75.5 L 24 75.4 L 23.7 76.1 L 24.5 76 L 24.2 76.7 L 25.1 76.5 L 24.7 77.3 L 25.6 77.2 L 25.2 77.9 L 26.1 77.8 L 25.6 78.6 L 26.6 78.4 L 26.1 79.2 L 27.1 79 L 26.5 79.9 L 27.5 79.7 L 27 80.5 L 27.9 80.4 L 27.4 81.2 L 28.3 81.1 L 27.8 81.9 L 28.7 81.8 L 28.2 82.6 L 29.1 82.5 L 28.6 83.3 L 29.4 83.2 L 28.9 84 L 29.7 83.9 L 29.3 84.7 L 30 84.7 L 29.6 85.4 L 30.3 85.5 L 29.9 86.2 L 30.5 86.3 L 30.2 86.9 L 30.7 87.1 L 30.4 87.7 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 28.8 87.1 L 28.3 87 L 28.3 86.6 L 27.7 86.5 L 27.8 86.1 L 27.1 86 L 27.3 85.5 L 26.6 85.5 L 26.8 85 L 26.2 85 L 26.4 84.4 L 25.7 84.4 L 26 83.8 L 25.2 83.9 L 25.5 83.2 L 24.8 83.3 L 25.1 82.7 L 24.4 82.7 L 24.7 82.1 L 24 82.1 L 24.3 81.5 L 23.6 81.5 L 24 80.9 L 23.2 80.9 L 23.6 80.3 L 22.8 80.3 L 23.2 79.6 L 22.5 79.7 L 22.9 79 L 22.2 79.1 L 22.5 78.4 L 21.9 78.4 L 22.2 77.8 L 21.6 77.7 L 21.9 77.1 L 21.3 77.1 L 21.6 76.5 L 21 76.4 L 21.3 75.8 L 20.8 75.7 L 21 75.1 L 20.7 74.9 L 20.8 74.4 L 21.3 74.1 L 21.8 74.2 L 21.8 74.6 L 22.4 74.7 L 22.3 75.1 L 22.9 75.2 L 22.8 75.7 L 23.5 75.7 L 23.3 76.2 L 24 76.2 L 23.7 76.8 L 24.4 76.7 L 24.2 77.3 L 24.9 77.3 L 24.6 77.9 L 25.3 77.9 L 25 78.5 L 25.8 78.4 L 25.4 79.1 L 26.2 79 L 25.8 79.7 L 26.6 79.6 L 26.2 80.3 L 27 80.2 L 26.6 80.9 L 27.3 80.8 L 26.9 81.5 L 27.7 81.5 L 27.3 82.1 L 28 82.1 L 27.7 82.7 L 28.3 82.7 L 28 83.4 L 28.6 83.4 L 28.3 84 L 28.9 84 L 28.6 84.6 L 29.2 84.7 L 28.9 85.3 L 29.4 85.4 L 29.2 86 L 29.6 86.2 L 29.5 86.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.5 87.2 Q 26.2 81.4 22.3 76 Q 25.5 81.8 29.5 87.2 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.6 87.7 L 29.4 87.1 L 29.8 87 L 29.6 86.3 L 30.1 86.3 L 29.8 85.6 L 30.5 85.7 L 30.1 84.9 L 30.8 85 L 30.4 84.3 L 31.2 84.4 L 30.7 83.6 L 31.5 83.8 L 31.1 83 L 31.9 83.2 L 31.4 82.4 L 32.3 82.6 L 31.8 81.8 L 32.7 82 L 32.2 81.2 L 33.1 81.4 L 32.7 80.6 L 33.6 80.9 L 33.1 80.1 L 34 80.3 L 33.6 79.5 L 34.5 79.7 L 34 79 L 34.9 79.2 L 34.5 78.5 L 35.4 78.7 L 35.1 78 L 35.9 78.1 L 35.6 77.5 L 36.4 77.6 L 36.2 77 L 36.9 77.1 L 36.8 76.6 L 37.5 76.6 L 37.4 76.1 L 38.1 76.2 L 38.1 75.8 L 38.7 75.8 L 39.3 76.2 L 39.5 76.8 L 39.1 77 L 39.3 77.6 L 38.8 77.6 L 39.1 78.3 L 38.5 78.3 L 38.8 79 L 38.2 78.9 L 38.5 79.7 L 37.8 79.6 L 38.2 80.3 L 37.4 80.2 L 37.9 81 L 37.1 80.8 L 37.5 81.6 L 36.7 81.4 L 37.2 82.2 L 36.3 82 L 36.8 82.8 L 35.9 82.6 L 36.3 83.4 L 35.4 83.1 L 35.9 83.9 L 35 83.7 L 35.5 84.5 L 34.5 84.3 L 35 85 L 34.1 84.8 L 34.5 85.6 L 33.6 85.3 L 34 86.1 L 33.1 85.9 L 33.5 86.6 L 32.6 86.4 L 32.9 87.1 L 32.1 86.9 L 32.3 87.5 L 31.6 87.4 L 31.7 87.9 L 31 87.9 L 31 88.3 L 30.4 88.3 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 29.7 86.8 L 29.6 86.3 L 30 86.1 L 29.8 85.6 L 30.3 85.5 L 30.1 85 L 30.6 85 L 30.3 84.4 L 30.9 84.4 L 30.6 83.8 L 31.2 83.9 L 30.9 83.2 L 31.6 83.3 L 31.3 82.7 L 31.9 82.8 L 31.6 82.1 L 32.3 82.2 L 32 81.6 L 32.7 81.7 L 32.3 81.1 L 33 81.2 L 32.7 80.6 L 33.4 80.7 L 33.1 80 L 33.8 80.2 L 33.5 79.6 L 34.2 79.7 L 33.9 79.1 L 34.6 79.2 L 34.4 78.6 L 35.1 78.7 L 34.8 78.1 L 35.5 78.2 L 35.3 77.7 L 35.9 77.7 L 35.8 77.2 L 36.4 77.3 L 36.3 76.8 L 36.9 76.8 L 36.8 76.4 L 37.4 76.4 L 37.4 76.1 L 37.9 76 L 38.3 76.3 L 38.4 76.8 L 38.1 77 L 38.3 77.5 L 37.8 77.6 L 38 78.1 L 37.5 78.2 L 37.8 78.7 L 37.2 78.7 L 37.5 79.3 L 36.9 79.3 L 37.2 79.9 L 36.6 79.8 L 36.9 80.4 L 36.2 80.4 L 36.5 81 L 35.9 80.9 L 36.2 81.5 L 35.5 81.4 L 35.8 82.1 L 35.1 82 L 35.4 82.6 L 34.7 82.5 L 35 83.1 L 34.3 83 L 34.6 83.6 L 33.9 83.5 L 34.2 84.1 L 33.5 84 L 33.8 84.6 L 33.1 84.5 L 33.4 85.1 L 32.7 84.9 L 32.9 85.5 L 32.2 85.4 L 32.4 86 L 31.8 85.9 L 31.9 86.4 L 31.3 86.3 L 31.4 86.8 L 30.8 86.8 L 30.8 87.2 L 30.3 87.2 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.5 87.3 Q 34.4 82.7 37.7 77.7 Q 33.8 82.3 30.5 87.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.5 88 L 29 87.6 L 29.3 87.2 L 28.7 86.9 L 29.1 86.5 L 28.4 86.1 L 29 85.7 L 28.2 85.3 L 28.9 85 L 28.1 84.6 L 28.8 84.2 L 28 83.8 L 28.7 83.4 L 27.9 83 L 28.7 82.7 L 27.8 82.3 L 28.6 81.9 L 27.7 81.5 L 28.6 81.1 L 27.7 80.8 L 28.6 80.4 L 27.7 80 L 28.6 79.6 L 27.7 79.2 L 28.6 78.9 L 27.8 78.5 L 28.6 78.1 L 27.8 77.7 L 28.7 77.3 L 27.9 77 L 28.7 76.6 L 28 76.2 L 28.8 75.8 L 28.2 75.4 L 28.9 75 L 28.3 74.7 L 29 74.3 L 28.5 73.9 L 29.2 73.5 L 28.8 73.1 L 29.4 72.8 L 29.2 72.4 L 29.6 72 L 30.4 72 L 30.8 72.4 L 30.6 72.8 L 31.2 73.1 L 30.8 73.5 L 31.5 73.9 L 31 74.3 L 31.7 74.7 L 31.1 75 L 31.8 75.4 L 31.2 75.8 L 32 76.2 L 31.3 76.6 L 32.1 77 L 31.3 77.3 L 32.2 77.7 L 31.4 78.1 L 32.2 78.5 L 31.4 78.9 L 32.3 79.2 L 31.4 79.6 L 32.3 80 L 31.4 80.4 L 32.3 80.8 L 31.4 81.1 L 32.3 81.5 L 31.4 81.9 L 32.2 82.3 L 31.3 82.7 L 32.1 83 L 31.3 83.4 L 32 83.8 L 31.2 84.2 L 31.9 84.6 L 31.1 85 L 31.8 85.3 L 31 85.7 L 31.6 86.1 L 30.9 86.5 L 31.3 86.9 L 30.7 87.2 L 31 87.6 L 30.5 88 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29.2 86.8 L 28.8 86.4 L 29 86.1 L 28.6 85.7 L 28.9 85.4 L 28.4 85.1 L 28.8 84.7 L 28.3 84.4 L 28.7 84 L 28.2 83.7 L 28.7 83.3 L 28.1 83 L 28.6 82.7 L 28 82.3 L 28.6 82 L 27.9 81.6 L 28.5 81.3 L 27.9 80.9 L 28.5 80.6 L 27.9 80.3 L 28.5 79.9 L 27.9 79.6 L 28.5 79.2 L 27.9 78.9 L 28.5 78.5 L 27.9 78.2 L 28.6 77.9 L 28 77.5 L 28.6 77.2 L 28 76.8 L 28.6 76.5 L 28.1 76.1 L 28.7 75.8 L 28.2 75.5 L 28.8 75.1 L 28.3 74.8 L 28.9 74.4 L 28.5 74.1 L 29 73.7 L 28.7 73.4 L 29.1 73.1 L 29 72.7 L 29.3 72.4 L 29.8 72.4 L 30.2 72.7 L 30.1 73.1 L 30.5 73.4 L 30.2 73.7 L 30.7 74.1 L 30.3 74.4 L 30.8 74.8 L 30.4 75.1 L 30.9 75.5 L 30.5 75.8 L 31 76.1 L 30.5 76.5 L 31.1 76.8 L 30.6 77.2 L 31.2 77.5 L 30.6 77.9 L 31.2 78.2 L 30.6 78.5 L 31.3 78.9 L 30.6 79.2 L 31.3 79.6 L 30.6 79.9 L 31.3 80.3 L 30.6 80.6 L 31.3 80.9 L 30.6 81.3 L 31.2 81.6 L 30.6 82 L 31.2 82.3 L 30.5 82.7 L 31.1 83 L 30.5 83.3 L 31 83.7 L 30.4 84 L 30.9 84.4 L 30.3 84.7 L 30.7 85.1 L 30.2 85.4 L 30.6 85.7 L 30.1 86.1 L 30.3 86.4 L 29.9 86.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30 87 Q 30.4 80.6 30 74.2 Q 29.6 80.6 30 87 Z', from: 2, to: 2 },
        { tone: 'soil-deep', d: 'M 18 96 Q 22.6 91 30 91 Q 37.4 91 42 96 Z', from: 3, to: 3 },
        { tone: 'soil', d: 'M 19.4 96 Q 23.8 91.8 29.5 91.7 Q 33.6 92.1 37.2 96 Z', from: 3, to: 3 },
        { tone: 'root-deep', d: 'M 25.6 84 Q 27.8 86 30.4 95.4 Q 32.6 87 34.4 84 Q 30 81.8 25.6 84 Z', from: 3, to: 3 },
        { tone: 'root', d: 'M 26.3 84.8 Q 28.2 87 29.9 93.8 Q 31.8 87.4 33.3 84.8 Q 30 83 26.3 84.8 Z', from: 3, to: 3 },
        { tone: 'root-light', d: 'M 27.1 85.2 Q 28.7 89 29.4 90.4 Q 29.7 88 29.1 84.6 Q 28 84.2 27.1 85.2 Z', from: 3, to: 3 },
        { tone: 'root-deep', d: 'M 26.7 86.1 Q 29.8 87.1 33.1 87.3 Q 30 86.3 26.7 86.1 Z', from: 3, to: 3 },
        { tone: 'root-deep', d: 'M 27.4 88.6 Q 29.8 89.6 32.5 89.8 Q 30 88.7 27.4 88.6 Z', from: 3, to: 3 },
        { tone: 'root-deep', d: 'M 28.1 91 Q 29.8 92 31.8 92.2 Q 30.1 91.2 28.1 91 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.5 86.4 L 28.7 86.3 L 28.7 85.7 L 27.8 85.7 L 27.8 84.9 L 26.9 85 L 27 84.2 L 26 84.3 L 26.3 83.4 L 25.2 83.5 L 25.5 82.6 L 24.4 82.8 L 24.8 81.8 L 23.7 82 L 24.1 81 L 23 81.2 L 23.4 80.1 L 22.2 80.3 L 22.7 79.3 L 21.5 79.5 L 22 78.5 L 20.9 78.7 L 21.3 77.6 L 20.2 77.8 L 20.7 76.7 L 19.6 76.9 L 20.1 75.8 L 19 76 L 19.4 75 L 18.4 75.1 L 18.8 74.1 L 17.8 74.1 L 18.2 73.1 L 17.3 73.2 L 17.7 72.2 L 16.8 72.2 L 17.1 71.3 L 16.3 71.2 L 16.6 70.3 L 15.9 70.1 L 16.1 69.3 L 15.6 69 L 15.7 68.3 L 16.3 67.7 L 17.1 67.8 L 17.3 68.4 L 18.1 68.4 L 18.1 69.1 L 19 69.1 L 18.9 69.9 L 19.9 69.8 L 19.7 70.6 L 20.7 70.5 L 20.4 71.4 L 21.5 71.3 L 21.2 72.2 L 22.3 72.1 L 21.9 73 L 23 72.9 L 22.6 73.9 L 23.7 73.7 L 23.3 74.7 L 24.4 74.5 L 24 75.5 L 25.1 75.3 L 24.7 76.4 L 25.8 76.2 L 25.3 77.3 L 26.4 77.1 L 26 78.1 L 27 78 L 26.6 79 L 27.6 78.9 L 27.2 79.9 L 28.2 79.8 L 27.8 80.8 L 28.8 80.8 L 28.4 81.8 L 29.3 81.7 L 29 82.7 L 29.8 82.7 L 29.5 83.6 L 30.2 83.8 L 30 84.6 L 30.6 84.8 L 30.5 85.6 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28.5 84.9 L 27.9 84.8 L 27.8 84.3 L 27.1 84.2 L 27.1 83.6 L 26.3 83.6 L 26.4 82.9 L 25.6 82.9 L 25.7 82.2 L 24.9 82.2 L 25 81.5 L 24.2 81.5 L 24.4 80.7 L 23.5 80.8 L 23.8 80 L 22.9 80.1 L 23.1 79.2 L 22.2 79.3 L 22.5 78.5 L 21.6 78.6 L 21.9 77.7 L 21 77.8 L 21.3 76.9 L 20.4 77 L 20.7 76.2 L 19.8 76.2 L 20.1 75.4 L 19.3 75.4 L 19.6 74.6 L 18.7 74.6 L 19 73.8 L 18.2 73.8 L 18.5 73 L 17.7 72.9 L 17.9 72.1 L 17.2 72.1 L 17.4 71.3 L 16.8 71.2 L 16.9 70.5 L 16.4 70.3 L 16.4 69.6 L 16 69.3 L 16 68.7 L 16.5 68.3 L 17.2 68.4 L 17.3 68.9 L 18 69 L 18 69.6 L 18.8 69.6 L 18.7 70.3 L 19.5 70.3 L 19.4 71 L 20.2 71 L 20.1 71.7 L 20.9 71.7 L 20.7 72.4 L 21.6 72.4 L 21.4 73.2 L 22.3 73.1 L 22 73.9 L 22.9 73.8 L 22.6 74.7 L 23.5 74.6 L 23.3 75.4 L 24.2 75.3 L 23.9 76.2 L 24.7 76.1 L 24.4 77 L 25.3 76.9 L 25 77.8 L 25.9 77.7 L 25.6 78.6 L 26.4 78.5 L 26.2 79.4 L 27 79.3 L 26.7 80.2 L 27.5 80.2 L 27.3 81 L 28 81 L 27.8 81.8 L 28.4 81.9 L 28.3 82.7 L 28.9 82.8 L 28.8 83.5 L 29.3 83.7 L 29.2 84.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.2 84.9 Q 23.9 77.5 18 70.5 Q 23.2 78 29.2 84.9 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.6 85.6 L 29.5 84.9 L 30 84.7 L 29.9 83.9 L 30.6 83.8 L 30.3 82.9 L 31.1 82.9 L 30.8 82 L 31.7 82.1 L 31.4 81.2 L 32.3 81.3 L 31.9 80.3 L 32.9 80.5 L 32.5 79.5 L 33.5 79.7 L 33.1 78.6 L 34.2 78.9 L 33.7 77.8 L 34.8 78.1 L 34.4 77.1 L 35.5 77.3 L 35 76.3 L 36.1 76.6 L 35.7 75.5 L 36.8 75.8 L 36.4 74.8 L 37.5 75.1 L 37.1 74.1 L 38.2 74.3 L 37.9 73.4 L 38.9 73.6 L 38.6 72.7 L 39.7 72.9 L 39.4 72.1 L 40.4 72.2 L 40.2 71.4 L 41.2 71.6 L 41.1 70.8 L 42 70.9 L 42 70.3 L 42.8 70.3 L 43 69.8 L 43.7 69.7 L 44.3 70.3 L 44.4 71 L 43.9 71.2 L 44 72 L 43.4 72.1 L 43.6 73 L 42.8 73 L 43.1 73.9 L 42.3 73.9 L 42.6 74.8 L 41.7 74.7 L 42 75.7 L 41.1 75.5 L 41.4 76.5 L 40.5 76.3 L 40.9 77.3 L 39.8 77.1 L 40.2 78.1 L 39.2 77.9 L 39.6 78.9 L 38.5 78.7 L 39 79.7 L 37.9 79.4 L 38.3 80.5 L 37.2 80.2 L 37.6 81.2 L 36.5 80.9 L 36.9 81.9 L 35.8 81.7 L 36.2 82.6 L 35.1 82.4 L 35.4 83.3 L 34.4 83.1 L 34.6 84 L 33.6 83.8 L 33.8 84.6 L 32.9 84.5 L 33 85.3 L 32.1 85.1 L 32.1 85.8 L 31.3 85.8 L 31.2 86.4 L 30.4 86.4 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 30 84.5 L 29.9 83.9 L 30.4 83.7 L 30.3 83 L 30.9 82.9 L 30.8 82.2 L 31.4 82.2 L 31.3 81.4 L 32 81.4 L 31.8 80.6 L 32.5 80.7 L 32.3 79.9 L 33.1 79.9 L 32.8 79.1 L 33.6 79.2 L 33.4 78.4 L 34.2 78.5 L 34 77.7 L 34.8 77.8 L 34.5 77 L 35.4 77.1 L 35.1 76.3 L 36 76.4 L 35.7 75.6 L 36.6 75.8 L 36.4 75 L 37.2 75.1 L 37 74.3 L 37.8 74.4 L 37.7 73.7 L 38.5 73.8 L 38.3 73.1 L 39.1 73.2 L 39 72.4 L 39.8 72.5 L 39.7 71.9 L 40.5 71.9 L 40.5 71.3 L 41.2 71.3 L 41.2 70.7 L 41.9 70.7 L 42 70.3 L 42.7 70.2 L 43.1 70.6 L 43.1 71.2 L 42.7 71.4 L 42.7 72.1 L 42.2 72.2 L 42.3 72.9 L 41.7 73 L 41.8 73.7 L 41.2 73.7 L 41.3 74.5 L 40.6 74.5 L 40.8 75.2 L 40.1 75.2 L 40.3 76 L 39.5 75.9 L 39.7 76.7 L 38.9 76.6 L 39.2 77.4 L 38.4 77.3 L 38.6 78.1 L 37.8 78 L 38 78.8 L 37.2 78.7 L 37.4 79.5 L 36.6 79.4 L 36.8 80.2 L 36 80.1 L 36.2 80.9 L 35.3 80.7 L 35.5 81.5 L 34.7 81.4 L 34.9 82.1 L 34 82 L 34.2 82.7 L 33.4 82.7 L 33.5 83.3 L 32.7 83.3 L 32.8 83.9 L 32 83.9 L 32 84.5 L 31.3 84.5 L 31.2 85 L 30.6 85.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.8 85 Q 36.8 78.9 42 72.2 Q 36.1 78.4 30.8 85 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.4 86 L 28.9 85.4 L 29.2 84.9 L 28.5 84.3 L 29 83.7 L 28.2 83.1 L 28.8 82.6 L 28 82 L 28.7 81.4 L 27.8 80.9 L 28.6 80.3 L 27.7 79.7 L 28.5 79.1 L 27.6 78.6 L 28.5 78 L 27.5 77.4 L 28.4 76.9 L 27.4 76.3 L 28.4 75.7 L 27.4 75.1 L 28.4 74.6 L 27.4 74 L 28.4 73.4 L 27.4 72.9 L 28.4 72.3 L 27.5 71.7 L 28.4 71.1 L 27.5 70.6 L 28.5 70 L 27.6 69.4 L 28.6 68.9 L 27.8 68.3 L 28.7 67.7 L 27.9 67.1 L 28.8 66.6 L 28.1 66 L 28.9 65.4 L 28.4 64.9 L 29.1 64.3 L 28.6 63.7 L 29.3 63.1 L 29.1 62.6 L 29.6 62 L 30.4 62 L 30.9 62.6 L 30.7 63.1 L 31.4 63.7 L 30.9 64.3 L 31.6 64.9 L 31.1 65.4 L 31.9 66 L 31.2 66.6 L 32.1 67.1 L 31.3 67.7 L 32.2 68.3 L 31.4 68.9 L 32.4 69.4 L 31.5 70 L 32.5 70.6 L 31.6 71.1 L 32.5 71.7 L 31.6 72.3 L 32.6 72.9 L 31.6 73.4 L 32.6 74 L 31.6 74.6 L 32.6 75.1 L 31.6 75.7 L 32.6 76.3 L 31.6 76.9 L 32.5 77.4 L 31.5 78 L 32.4 78.6 L 31.5 79.1 L 32.3 79.7 L 31.4 80.3 L 32.2 80.9 L 31.3 81.4 L 32 82 L 31.2 82.6 L 31.8 83.1 L 31 83.7 L 31.5 84.3 L 30.8 84.9 L 31.1 85.4 L 30.6 86 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.2 84.4 L 28.7 83.9 L 29 83.3 L 28.5 82.8 L 28.8 82.3 L 28.3 81.8 L 28.7 81.3 L 28.1 80.8 L 28.6 80.3 L 28 79.7 L 28.6 79.2 L 27.9 78.7 L 28.5 78.2 L 27.8 77.7 L 28.4 77.2 L 27.7 76.7 L 28.4 76.1 L 27.7 75.6 L 28.4 75.1 L 27.7 74.6 L 28.4 74.1 L 27.7 73.6 L 28.4 73.1 L 27.7 72.5 L 28.4 72 L 27.7 71.5 L 28.4 71 L 27.8 70.5 L 28.5 70 L 27.8 69.5 L 28.5 68.9 L 27.9 68.4 L 28.6 67.9 L 28 67.4 L 28.7 66.9 L 28.2 66.4 L 28.8 65.9 L 28.4 65.3 L 28.9 64.8 L 28.6 64.3 L 29 63.8 L 28.9 63.3 L 29.3 62.8 L 29.9 62.8 L 30.3 63.3 L 30.1 63.8 L 30.6 64.3 L 30.3 64.8 L 30.8 65.3 L 30.4 65.9 L 31 66.4 L 30.5 66.9 L 31.1 67.4 L 30.6 67.9 L 31.2 68.4 L 30.6 68.9 L 31.3 69.5 L 30.7 70 L 31.4 70.5 L 30.7 71 L 31.5 71.5 L 30.8 72 L 31.5 72.5 L 30.8 73.1 L 31.5 73.6 L 30.8 74.1 L 31.5 74.6 L 30.8 75.1 L 31.5 75.6 L 30.7 76.1 L 31.4 76.7 L 30.7 77.2 L 31.4 77.7 L 30.7 78.2 L 31.3 78.7 L 30.6 79.2 L 31.2 79.7 L 30.5 80.3 L 31 80.8 L 30.4 81.3 L 30.9 81.8 L 30.3 82.3 L 30.7 82.8 L 30.2 83.3 L 30.4 83.9 L 30 84.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 84.6 Q 30.4 75 30 65.4 Q 29.6 75 30 84.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.5 86.2 L 28.8 85.8 L 28.9 85.2 L 28.2 84.8 L 28.4 84.2 L 27.6 83.9 L 28 83.2 L 27.1 82.9 L 27.5 82.2 L 26.6 81.9 L 27.1 81.1 L 26.1 80.9 L 26.7 80.1 L 25.7 79.9 L 26.3 79.1 L 25.3 78.8 L 26 78.1 L 24.9 77.8 L 25.6 77 L 24.6 76.8 L 25.2 76 L 24.2 75.7 L 24.9 74.9 L 23.9 74.7 L 24.6 73.9 L 23.6 73.6 L 24.3 72.8 L 23.3 72.5 L 24 71.8 L 23.1 71.5 L 23.7 70.7 L 22.9 70.4 L 23.5 69.6 L 22.7 69.3 L 23.2 68.5 L 22.5 68.2 L 23 67.5 L 22.4 67.1 L 22.8 66.4 L 22.3 65.9 L 22.7 65.3 L 22.3 64.8 L 22.6 64.1 L 23.4 63.9 L 24 64.3 L 24 64.8 L 24.7 65.2 L 24.5 65.8 L 25.3 66.2 L 25 66.8 L 25.8 67.1 L 25.4 67.8 L 26.3 68.1 L 25.8 68.9 L 26.8 69.1 L 26.3 69.9 L 27.2 70.1 L 26.7 70.9 L 27.7 71.2 L 27 71.9 L 28.1 72.2 L 27.4 73 L 28.4 73.2 L 27.7 74 L 28.8 74.3 L 28.1 75.1 L 29.1 75.3 L 28.4 76.1 L 29.4 76.4 L 28.7 77.2 L 29.7 77.4 L 29 78.2 L 30 78.5 L 29.3 79.3 L 30.2 79.6 L 29.6 80.4 L 30.4 80.7 L 29.8 81.4 L 30.6 81.8 L 30 82.5 L 30.7 82.9 L 30.2 83.6 L 30.8 84 L 30.4 84.7 L 30.8 85.2 L 30.5 85.8 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28.9 84.6 L 28.3 84.2 L 28.4 83.7 L 27.8 83.4 L 28 82.8 L 27.3 82.5 L 27.6 81.9 L 26.9 81.6 L 27.2 81 L 26.5 80.7 L 26.8 80 L 26.1 79.8 L 26.5 79.1 L 25.7 78.8 L 26.1 78.2 L 25.3 77.9 L 25.8 77.3 L 25 77 L 25.5 76.3 L 24.7 76.1 L 25.2 75.4 L 24.4 75.1 L 24.9 74.4 L 24.1 74.2 L 24.6 73.5 L 23.8 73.2 L 24.3 72.5 L 23.6 72.3 L 24 71.6 L 23.3 71.3 L 23.8 70.6 L 23.1 70.3 L 23.6 69.7 L 22.9 69.3 L 23.3 68.7 L 22.7 68.4 L 23.1 67.7 L 22.6 67.4 L 22.9 66.8 L 22.5 66.4 L 22.8 65.8 L 22.5 65.3 L 22.7 64.8 L 23.2 64.6 L 23.7 65 L 23.7 65.5 L 24.3 65.8 L 24.1 66.4 L 24.7 66.7 L 24.5 67.3 L 25.2 67.6 L 24.9 68.2 L 25.6 68.5 L 25.3 69.1 L 26 69.4 L 25.7 70 L 26.4 70.3 L 26 71 L 26.8 71.2 L 26.3 71.9 L 27.1 72.2 L 26.7 72.8 L 27.5 73.1 L 27 73.8 L 27.8 74 L 27.3 74.7 L 28.1 75 L 27.6 75.7 L 28.3 75.9 L 27.8 76.6 L 28.6 76.9 L 28.1 77.6 L 28.8 77.8 L 28.4 78.5 L 29.1 78.8 L 28.6 79.5 L 29.3 79.8 L 28.9 80.4 L 29.5 80.8 L 29.1 81.4 L 29.6 81.8 L 29.3 82.4 L 29.7 82.8 L 29.5 83.4 L 29.8 83.8 L 29.6 84.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.6 84.7 Q 27.1 75.8 24 67.1 Q 26.4 76 29.6 84.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.5 85.8 L 29.2 85.1 L 29.7 84.7 L 29.3 84 L 29.9 83.6 L 29.4 82.8 L 30.1 82.5 L 29.6 81.7 L 30.4 81.4 L 29.8 80.6 L 30.7 80.3 L 30.1 79.5 L 31 79.3 L 30.4 78.4 L 31.3 78.2 L 30.7 77.4 L 31.7 77.1 L 31 76.3 L 32 76.1 L 31.4 75.2 L 32.4 75 L 31.7 74.2 L 32.8 74 L 32.1 73.1 L 33.2 72.9 L 32.6 72.1 L 33.6 71.9 L 33 71.1 L 34 70.9 L 33.5 70.1 L 34.5 69.8 L 34 69.1 L 34.9 68.8 L 34.5 68.1 L 35.4 67.8 L 35 67.1 L 35.9 66.8 L 35.6 66.1 L 36.4 65.8 L 36.3 65.1 L 37 64.8 L 37 64.2 L 37.6 63.9 L 38.4 64.1 L 38.6 64.8 L 38.2 65.3 L 38.6 66 L 38.1 66.4 L 38.5 67.1 L 37.8 67.5 L 38.3 68.3 L 37.5 68.6 L 38.1 69.4 L 37.3 69.7 L 37.8 70.5 L 37 70.7 L 37.6 71.6 L 36.6 71.8 L 37.3 72.6 L 36.3 72.9 L 37 73.7 L 35.9 73.9 L 36.6 74.8 L 35.6 75 L 36.3 75.8 L 35.2 76 L 35.9 76.9 L 34.8 77.1 L 35.5 77.9 L 34.4 78.1 L 35 78.9 L 34 79.1 L 34.6 80 L 33.6 80.2 L 34.1 81 L 33.1 81.2 L 33.6 82 L 32.6 82.2 L 33.1 83 L 32.2 83.2 L 32.5 83.9 L 31.6 84.2 L 31.9 84.9 L 31.1 85.2 L 31.2 85.8 L 30.5 86.2 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.6 84.3 L 29.4 83.7 L 29.8 83.3 L 29.5 82.7 L 30 82.4 L 29.7 81.7 L 30.3 81.4 L 29.9 80.7 L 30.5 80.4 L 30.1 79.7 L 30.8 79.4 L 30.4 78.8 L 31.1 78.5 L 30.7 77.8 L 31.4 77.5 L 30.9 76.8 L 31.7 76.6 L 31.2 75.9 L 32 75.6 L 31.6 74.9 L 32.4 74.7 L 31.9 74 L 32.7 73.7 L 32.3 73 L 33.1 72.8 L 32.6 72.1 L 33.4 71.9 L 33 71.2 L 33.8 70.9 L 33.4 70.3 L 34.2 70 L 33.9 69.3 L 34.6 69.1 L 34.3 68.4 L 35 68.2 L 34.8 67.5 L 35.4 67.2 L 35.3 66.6 L 35.9 66.3 L 35.8 65.8 L 36.4 65.4 L 36.4 64.9 L 36.9 64.6 L 37.4 64.8 L 37.6 65.4 L 37.3 65.8 L 37.5 66.4 L 37.1 66.8 L 37.4 67.4 L 36.9 67.8 L 37.2 68.4 L 36.6 68.7 L 37 69.4 L 36.3 69.7 L 36.7 70.4 L 36 70.7 L 36.5 71.4 L 35.7 71.6 L 36.2 72.3 L 35.4 72.6 L 35.9 73.3 L 35.1 73.5 L 35.6 74.2 L 34.8 74.5 L 35.2 75.2 L 34.4 75.4 L 34.9 76.1 L 34.1 76.4 L 34.5 77.1 L 33.7 77.3 L 34.2 78 L 33.4 78.2 L 33.8 78.9 L 33 79.2 L 33.3 79.8 L 32.6 80.1 L 32.9 80.7 L 32.2 81 L 32.4 81.6 L 31.8 81.9 L 32 82.5 L 31.3 82.8 L 31.4 83.4 L 30.8 83.7 L 30.9 84.3 L 30.3 84.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.5 84.7 Q 34 76 36.9 67.1 Q 33.3 75.7 30.5 84.7 Z', from: 3, to: 3 },
        { tone: 'soil-deep', d: 'M 17 96 Q 21.9 90.5 30 90.5 Q 38.1 90.5 43 96 Z', from: 4, to: 4 },
        { tone: 'soil', d: 'M 18.6 96 Q 23.2 91.4 29.5 91.3 Q 33.9 91.7 37.8 96 Z', from: 4, to: 4 },
        { tone: 'root-deep', d: 'M 24.6 81 Q 27.3 83 30.4 95.4 Q 33.2 84 35.4 81 Q 30 78.8 24.6 81 Z', from: 4, to: 4 },
        { tone: 'root', d: 'M 25.5 81.8 Q 27.7 84 29.9 93.8 Q 32.2 84.4 34.1 81.8 Q 30 80 25.5 81.8 Z', from: 4, to: 4 },
        { tone: 'root-light', d: 'M 26.4 82.2 Q 28.4 86 29.4 90.4 Q 29.7 85 28.9 81.6 Q 27.6 81.2 26.4 82.2 Z', from: 4, to: 4 },
        { tone: 'root-deep', d: 'M 25.9 83.7 Q 29.8 84.7 33.8 84.9 Q 29.9 83.9 25.9 83.7 Z', from: 4, to: 4 },
        { tone: 'root-deep', d: 'M 26.8 86.9 Q 29.8 87.9 33 88.1 Q 30 87 26.8 86.9 Z', from: 4, to: 4 },
        { tone: 'root-deep', d: 'M 27.6 90 Q 29.8 91 32.2 91.2 Q 30 90.2 27.6 90 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.5 84.4 L 28.5 84.3 L 28.4 83.6 L 27.4 83.5 L 27.4 82.6 L 26.3 82.7 L 26.4 81.7 L 25.2 81.8 L 25.4 80.7 L 24.2 80.9 L 24.5 79.8 L 23.2 79.9 L 23.5 78.8 L 22.3 79 L 22.6 77.8 L 21.3 78 L 21.7 76.8 L 20.4 77 L 20.9 75.7 L 19.5 75.9 L 20 74.7 L 18.7 74.9 L 19.1 73.7 L 17.8 73.8 L 18.3 72.6 L 17 72.8 L 17.5 71.5 L 16.2 71.7 L 16.7 70.4 L 15.5 70.5 L 15.9 69.3 L 14.7 69.4 L 15.1 68.2 L 14 68.2 L 14.3 67.1 L 13.3 67 L 13.6 65.9 L 12.7 65.8 L 12.9 64.8 L 12.1 64.6 L 12.2 63.6 L 11.6 63.2 L 11.6 62.3 L 12.4 61.7 L 13.3 61.8 L 13.5 62.5 L 14.5 62.6 L 14.6 63.4 L 15.6 63.4 L 15.6 64.3 L 16.7 64.3 L 16.5 65.3 L 17.7 65.2 L 17.5 66.3 L 18.7 66.1 L 18.4 67.2 L 19.7 67.1 L 19.3 68.2 L 20.6 68.1 L 20.2 69.2 L 21.6 69.1 L 21.1 70.3 L 22.4 70.1 L 22 71.3 L 23.3 71.1 L 22.9 72.3 L 24.2 72.2 L 23.7 73.4 L 25 73.2 L 24.5 74.5 L 25.8 74.3 L 25.4 75.6 L 26.6 75.4 L 26.2 76.6 L 27.3 76.6 L 27 77.8 L 28.1 77.7 L 27.7 78.9 L 28.8 78.9 L 28.5 80 L 29.4 80.1 L 29.2 81.2 L 30 81.3 L 29.9 82.3 L 30.6 82.6 L 30.5 83.6 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 28.3 82.8 L 27.5 82.6 L 27.4 82 L 26.5 81.9 L 26.5 81.1 L 25.6 81.1 L 25.6 80.3 L 24.7 80.2 L 24.7 79.4 L 23.8 79.4 L 23.9 78.5 L 22.9 78.5 L 23.1 77.6 L 22.1 77.7 L 22.3 76.7 L 21.2 76.8 L 21.5 75.8 L 20.4 75.8 L 20.7 74.9 L 19.6 74.9 L 19.9 73.9 L 18.9 74 L 19.1 73 L 18.1 73 L 18.4 72 L 17.4 72.1 L 17.6 71.1 L 16.6 71.1 L 16.9 70.1 L 15.9 70.1 L 16.2 69.1 L 15.2 69.1 L 15.4 68.1 L 14.6 68 L 14.7 67.1 L 13.9 67 L 14.1 66.1 L 13.3 65.9 L 13.4 65.1 L 12.7 64.8 L 12.8 64 L 12.2 63.7 L 12.2 62.9 L 12.7 62.5 L 13.5 62.6 L 13.7 63.2 L 14.5 63.4 L 14.6 64.1 L 15.5 64.1 L 15.5 64.9 L 16.4 65 L 16.4 65.8 L 17.3 65.8 L 17.2 66.7 L 18.2 66.7 L 18 67.6 L 19.1 67.5 L 18.9 68.5 L 19.9 68.4 L 19.7 69.4 L 20.7 69.3 L 20.5 70.3 L 21.5 70.2 L 21.3 71.2 L 22.3 71.2 L 22 72.2 L 23.1 72.1 L 22.8 73.1 L 23.8 73.1 L 23.5 74.1 L 24.5 74.1 L 24.3 75.1 L 25.3 75 L 25 76 L 26 76 L 25.7 77 L 26.6 77.1 L 26.4 78 L 27.3 78.1 L 27.1 79 L 27.9 79.2 L 27.8 80 L 28.5 80.3 L 28.5 81.1 L 29 81.4 L 29.1 82.2 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 28.9 82.7 Q 22.1 73.6 14.5 65.1 Q 21.3 74.2 28.9 82.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.5 83.6 L 29.5 82.7 L 30.2 82.4 L 30 81.5 L 30.9 81.3 L 30.7 80.3 L 31.6 80.3 L 31.4 79.2 L 32.4 79.2 L 32.1 78.1 L 33.1 78.2 L 32.8 77 L 33.9 77.2 L 33.6 76 L 34.7 76.2 L 34.4 75 L 35.6 75.2 L 35.2 74 L 36.4 74.2 L 36 73 L 37.2 73.3 L 36.8 72.1 L 38.1 72.3 L 37.7 71.1 L 39 71.4 L 38.6 70.2 L 39.9 70.5 L 39.5 69.3 L 40.8 69.5 L 40.5 68.4 L 41.7 68.6 L 41.4 67.6 L 42.6 67.8 L 42.4 66.7 L 43.5 66.9 L 43.4 65.9 L 44.5 66 L 44.5 65.1 L 45.5 65.2 L 45.6 64.4 L 46.5 64.4 L 46.8 63.8 L 47.7 63.7 L 48.3 64.3 L 48.4 65.2 L 47.7 65.5 L 47.8 66.4 L 47.1 66.6 L 47.2 67.6 L 46.3 67.7 L 46.6 68.7 L 45.6 68.7 L 45.9 69.8 L 44.8 69.8 L 45.1 70.9 L 44 70.8 L 44.4 72 L 43.2 71.8 L 43.6 73 L 42.4 72.8 L 42.8 74 L 41.6 73.8 L 42 75 L 40.8 74.7 L 41.2 75.9 L 39.9 75.7 L 40.3 76.9 L 39 76.6 L 39.4 77.8 L 38.2 77.6 L 38.5 78.7 L 37.3 78.5 L 37.6 79.6 L 36.4 79.4 L 36.6 80.5 L 35.4 80.3 L 35.6 81.3 L 34.5 81.1 L 34.6 82.1 L 33.5 82 L 33.6 82.9 L 32.6 82.9 L 32.5 83.7 L 31.5 83.7 L 31.4 84.4 L 30.5 84.4 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30.1 82.3 L 30.2 81.5 L 30.7 81.3 L 30.7 80.5 L 31.4 80.3 L 31.3 79.5 L 32.1 79.4 L 32 78.5 L 32.8 78.4 L 32.6 77.5 L 33.5 77.5 L 33.3 76.6 L 34.2 76.6 L 34 75.7 L 34.9 75.7 L 34.7 74.8 L 35.7 74.9 L 35.5 73.9 L 36.4 74 L 36.2 73 L 37.2 73.1 L 37 72.1 L 38 72.3 L 37.8 71.3 L 38.8 71.4 L 38.6 70.5 L 39.6 70.6 L 39.4 69.6 L 40.4 69.7 L 40.2 68.8 L 41.2 68.9 L 41.1 68.1 L 42 68.1 L 41.9 67.3 L 42.8 67.3 L 42.8 66.5 L 43.7 66.5 L 43.7 65.8 L 44.6 65.8 L 44.7 65.1 L 45.5 65 L 45.7 64.5 L 46.4 64.4 L 46.9 64.8 L 46.9 65.5 L 46.3 65.8 L 46.3 66.6 L 45.7 66.8 L 45.8 67.6 L 45 67.8 L 45.1 68.6 L 44.3 68.7 L 44.5 69.6 L 43.6 69.6 L 43.8 70.5 L 42.9 70.5 L 43.1 71.5 L 42.2 71.4 L 42.4 72.4 L 41.5 72.3 L 41.7 73.3 L 40.7 73.2 L 40.9 74.1 L 39.9 74 L 40.2 75 L 39.2 74.9 L 39.4 75.9 L 38.4 75.7 L 38.6 76.7 L 37.6 76.6 L 37.8 77.5 L 36.8 77.4 L 37 78.3 L 36 78.2 L 36.1 79.1 L 35.2 79.1 L 35.3 79.9 L 34.3 79.9 L 34.4 80.7 L 33.5 80.6 L 33.5 81.4 L 32.6 81.4 L 32.5 82.1 L 31.8 82.2 L 31.6 82.8 L 30.8 82.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.1 82.8 Q 38.6 75.1 45.5 66.8 Q 37.9 74.5 31.1 82.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.4 84 L 28.7 83.3 L 29.1 82.6 L 28.3 81.9 L 28.9 81.1 L 28 80.4 L 28.7 79.7 L 27.8 79 L 28.6 78.3 L 27.6 77.6 L 28.5 76.9 L 27.4 76.1 L 28.4 75.4 L 27.3 74.7 L 28.3 74 L 27.2 73.3 L 28.2 72.6 L 27.1 71.9 L 28.2 71.1 L 27.1 70.4 L 28.2 69.7 L 27.1 69 L 28.2 68.3 L 27.1 67.6 L 28.2 66.9 L 27.2 66.1 L 28.3 65.4 L 27.3 64.7 L 28.3 64 L 27.4 63.3 L 28.4 62.6 L 27.5 61.9 L 28.5 61.1 L 27.7 60.4 L 28.6 59.7 L 27.9 59 L 28.8 58.3 L 28.2 57.6 L 29 56.9 L 28.5 56.1 L 29.2 55.4 L 28.9 54.7 L 29.5 54 L 30.5 54 L 31.1 54.7 L 30.8 55.4 L 31.5 56.1 L 31 56.9 L 31.8 57.6 L 31.2 58.3 L 32.1 59 L 31.4 59.7 L 32.3 60.4 L 31.5 61.1 L 32.5 61.9 L 31.6 62.6 L 32.6 63.3 L 31.7 64 L 32.7 64.7 L 31.7 65.4 L 32.8 66.1 L 31.8 66.9 L 32.9 67.6 L 31.8 68.3 L 32.9 69 L 31.8 69.7 L 32.9 70.4 L 31.8 71.1 L 32.9 71.9 L 31.8 72.6 L 32.8 73.3 L 31.7 74 L 32.7 74.7 L 31.6 75.4 L 32.6 76.1 L 31.5 76.9 L 32.4 77.6 L 31.4 78.3 L 32.2 79 L 31.3 79.7 L 32 80.4 L 31.1 81.1 L 31.7 81.9 L 30.9 82.6 L 31.3 83.3 L 30.6 84 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.1 82.1 L 28.6 81.4 L 28.9 80.8 L 28.3 80.1 L 28.7 79.5 L 28.1 78.9 L 28.6 78.2 L 27.9 77.6 L 28.5 76.9 L 27.8 76.3 L 28.4 75.6 L 27.7 75 L 28.4 74.4 L 27.6 73.7 L 28.3 73.1 L 27.5 72.4 L 28.3 71.8 L 27.5 71.1 L 28.3 70.5 L 27.4 69.9 L 28.2 69.2 L 27.4 68.6 L 28.2 67.9 L 27.4 67.3 L 28.3 66.6 L 27.5 66 L 28.3 65.4 L 27.5 64.7 L 28.3 64.1 L 27.6 63.4 L 28.4 62.8 L 27.7 62.1 L 28.5 61.5 L 27.9 60.9 L 28.6 60.2 L 28 59.6 L 28.7 58.9 L 28.2 58.3 L 28.8 57.6 L 28.5 57 L 29 56.4 L 28.8 55.7 L 29.2 55.1 L 29.9 55.1 L 30.4 55.7 L 30.2 56.4 L 30.7 57 L 30.3 57.6 L 30.9 58.3 L 30.5 58.9 L 31.1 59.6 L 30.6 60.2 L 31.3 60.9 L 30.7 61.5 L 31.4 62.1 L 30.8 62.8 L 31.5 63.4 L 30.8 64.1 L 31.6 64.7 L 30.9 65.4 L 31.7 66 L 30.9 66.6 L 31.7 67.3 L 30.9 67.9 L 31.7 68.6 L 30.9 69.2 L 31.7 69.9 L 30.9 70.5 L 31.7 71.1 L 30.9 71.8 L 31.6 72.4 L 30.8 73.1 L 31.6 73.7 L 30.8 74.4 L 31.5 75 L 30.7 75.6 L 31.4 76.3 L 30.6 76.9 L 31.2 77.6 L 30.5 78.2 L 31 78.9 L 30.4 79.5 L 30.8 80.1 L 30.3 80.8 L 30.5 81.4 L 30 82.1 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 82.2 Q 30.5 70.2 30 58.2 Q 29.5 70.2 30 82.2 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.4 84.2 L 28.6 83.8 L 28.7 83 L 27.8 82.6 L 28 81.7 L 27 81.3 L 27.3 80.4 L 26.3 80.1 L 26.7 79.2 L 25.6 78.8 L 26 77.9 L 24.9 77.5 L 25.4 76.6 L 24.3 76.3 L 24.9 75.2 L 23.7 74.9 L 24.3 73.9 L 23.1 73.6 L 23.7 72.6 L 22.5 72.3 L 23.2 71.3 L 22 71 L 22.7 69.9 L 21.5 69.6 L 22.2 68.6 L 21 68.3 L 21.7 67.3 L 20.5 66.9 L 21.2 65.9 L 20.1 65.6 L 20.8 64.5 L 19.7 64.2 L 20.3 63.2 L 19.3 62.8 L 19.9 61.8 L 19 61.4 L 19.5 60.4 L 18.7 60 L 19.1 59 L 18.5 58.5 L 18.8 57.6 L 18.3 57 L 18.6 56.2 L 19.4 55.8 L 20.2 56.3 L 20.2 57.1 L 21.1 57.5 L 21 58.3 L 21.9 58.7 L 21.6 59.6 L 22.7 59.9 L 22.3 60.9 L 23.4 61.2 L 22.9 62.2 L 24 62.5 L 23.5 63.5 L 24.7 63.8 L 24.1 64.8 L 25.3 65.1 L 24.7 66.1 L 25.9 66.4 L 25.2 67.4 L 26.5 67.7 L 25.8 68.7 L 27 69 L 26.3 70.1 L 27.5 70.3 L 26.8 71.4 L 28 71.7 L 27.3 72.7 L 28.5 73.1 L 27.8 74.1 L 28.9 74.4 L 28.3 75.4 L 29.3 75.8 L 28.7 76.8 L 29.7 77.2 L 29.1 78.2 L 30.1 78.6 L 29.6 79.6 L 30.4 80 L 29.9 80.9 L 30.7 81.4 L 30.3 82.4 L 30.8 82.9 L 30.6 83.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 28.6 82.3 L 28 81.9 L 28 81.2 L 27.2 80.8 L 27.4 80.1 L 26.6 79.7 L 26.8 78.9 L 26 78.5 L 26.2 77.7 L 25.4 77.4 L 25.7 76.6 L 24.8 76.2 L 25.2 75.4 L 24.2 75.1 L 24.6 74.2 L 23.7 73.9 L 24.1 73 L 23.2 72.7 L 23.6 71.8 L 22.7 71.5 L 23.2 70.6 L 22.2 70.3 L 22.7 69.4 L 21.8 69.1 L 22.2 68.2 L 21.3 67.9 L 21.8 67 L 20.9 66.7 L 21.4 65.8 L 20.5 65.4 L 20.9 64.6 L 20.1 64.2 L 20.5 63.4 L 19.8 63 L 20.1 62.1 L 19.4 61.7 L 19.8 60.9 L 19.1 60.4 L 19.4 59.6 L 18.9 59.2 L 19.1 58.4 L 18.7 57.8 L 18.8 57.1 L 19.4 56.9 L 20 57.3 L 20.1 58 L 20.8 58.4 L 20.7 59.1 L 21.5 59.5 L 21.3 60.3 L 22.1 60.6 L 21.9 61.4 L 22.7 61.8 L 22.4 62.6 L 23.3 62.9 L 23 63.8 L 23.9 64.1 L 23.5 65 L 24.4 65.3 L 24 66.1 L 24.9 66.5 L 24.5 67.3 L 25.5 67.7 L 25 68.5 L 25.9 68.8 L 25.5 69.7 L 26.4 70 L 25.9 70.9 L 26.8 71.3 L 26.4 72.1 L 27.3 72.5 L 26.8 73.3 L 27.7 73.7 L 27.2 74.6 L 28.1 74.9 L 27.7 75.8 L 28.4 76.2 L 28.1 77 L 28.8 77.4 L 28.4 78.2 L 29.1 78.7 L 28.8 79.5 L 29.4 80 L 29.1 80.7 L 29.6 81.3 L 29.4 82 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.3 82.3 Q 25.3 71 20.5 59.9 Q 24.5 71.3 29.3 82.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.4 83.8 L 29.2 82.9 L 29.7 82.4 L 29.3 81.4 L 30.1 80.9 L 29.6 80 L 30.4 79.6 L 29.9 78.6 L 30.9 78.2 L 30.3 77.2 L 31.3 76.8 L 30.7 75.8 L 31.7 75.4 L 31.1 74.4 L 32.2 74.1 L 31.5 73.1 L 32.7 72.7 L 32 71.7 L 33.2 71.4 L 32.5 70.3 L 33.7 70.1 L 33 69 L 34.2 68.7 L 33.5 67.7 L 34.8 67.4 L 34.1 66.4 L 35.3 66.1 L 34.7 65.1 L 35.9 64.8 L 35.3 63.8 L 36.5 63.5 L 36 62.5 L 37.1 62.2 L 36.6 61.2 L 37.7 60.9 L 37.3 59.9 L 38.4 59.6 L 38.1 58.7 L 39 58.3 L 38.9 57.5 L 39.8 57.1 L 39.8 56.3 L 40.6 55.8 L 41.4 56.2 L 41.7 57 L 41.2 57.6 L 41.5 58.5 L 40.9 59 L 41.3 60 L 40.5 60.4 L 41 61.4 L 40.1 61.8 L 40.7 62.8 L 39.7 63.2 L 40.3 64.2 L 39.2 64.5 L 39.9 65.6 L 38.8 65.9 L 39.5 66.9 L 38.3 67.3 L 39 68.3 L 37.8 68.6 L 38.5 69.6 L 37.3 69.9 L 38 71 L 36.8 71.3 L 37.5 72.3 L 36.3 72.6 L 36.9 73.6 L 35.7 73.9 L 36.3 74.9 L 35.1 75.2 L 35.7 76.3 L 34.6 76.6 L 35.1 77.5 L 34 77.9 L 34.4 78.8 L 33.3 79.2 L 33.7 80.1 L 32.7 80.4 L 33 81.3 L 32 81.7 L 32.2 82.6 L 31.3 83 L 31.4 83.8 L 30.6 84.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.7 82 L 29.5 81.3 L 30 80.7 L 29.8 80 L 30.3 79.5 L 30 78.7 L 30.7 78.2 L 30.4 77.4 L 31.1 77 L 30.7 76.2 L 31.5 75.8 L 31.1 74.9 L 31.9 74.6 L 31.5 73.7 L 32.3 73.3 L 31.9 72.5 L 32.8 72.1 L 32.3 71.3 L 33.2 70.9 L 32.8 70 L 33.7 69.7 L 33.2 68.8 L 34.2 68.5 L 33.7 67.7 L 34.6 67.3 L 34.2 66.5 L 35.1 66.1 L 34.7 65.3 L 35.7 65 L 35.3 64.1 L 36.2 63.8 L 35.8 62.9 L 36.7 62.6 L 36.4 61.8 L 37.3 61.4 L 37 60.6 L 37.8 60.3 L 37.7 59.5 L 38.4 59.1 L 38.4 58.4 L 39 58 L 39.1 57.3 L 39.7 56.9 L 40.3 57.1 L 40.5 57.8 L 40.1 58.4 L 40.3 59.2 L 39.8 59.6 L 40 60.4 L 39.4 60.9 L 39.7 61.7 L 39 62.1 L 39.4 63 L 38.6 63.4 L 39 64.2 L 38.2 64.6 L 38.7 65.4 L 37.8 65.8 L 38.3 66.7 L 37.4 67 L 37.8 67.9 L 36.9 68.2 L 37.4 69.1 L 36.5 69.4 L 36.9 70.3 L 36 70.6 L 36.5 71.5 L 35.5 71.8 L 36 72.7 L 35 73 L 35.4 73.9 L 34.5 74.2 L 34.9 75.1 L 34 75.4 L 34.4 76.2 L 33.5 76.6 L 33.8 77.4 L 32.9 77.7 L 33.2 78.5 L 32.4 78.9 L 32.6 79.7 L 31.8 80.1 L 31.9 80.8 L 31.2 81.2 L 31.2 81.9 L 30.5 82.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.7 82.3 Q 35.5 71.3 39.5 59.9 Q 34.7 71 30.7 82.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.5 84.2 L 28.9 84 L 29 83.5 L 28.3 83.3 L 28.6 82.8 L 27.8 82.7 L 28.1 82.1 L 27.3 82 L 27.7 81.4 L 26.9 81.3 L 27.4 80.6 L 26.4 80.6 L 27 79.9 L 26.1 79.8 L 26.7 79.2 L 25.7 79.1 L 26.4 78.4 L 25.4 78.4 L 26 77.7 L 25 77.6 L 25.8 76.9 L 24.8 76.8 L 25.5 76.1 L 24.5 76.1 L 25.2 75.4 L 24.2 75.3 L 24.9 74.6 L 24 74.5 L 24.7 73.8 L 23.8 73.7 L 24.5 73 L 23.6 72.9 L 24.3 72.2 L 23.5 72.1 L 24.1 71.4 L 23.4 71.3 L 23.9 70.6 L 23.3 70.4 L 23.8 69.8 L 23.3 69.6 L 23.7 69 L 23.3 68.7 L 23.7 68.1 L 24.3 67.9 L 25 68.1 L 24.9 68.5 L 25.6 68.7 L 25.4 69.2 L 26.1 69.4 L 25.8 69.9 L 26.6 70.1 L 26.2 70.6 L 27.1 70.8 L 26.6 71.4 L 27.5 71.5 L 27 72.1 L 27.9 72.2 L 27.3 72.8 L 28.3 72.9 L 27.6 73.6 L 28.6 73.7 L 27.9 74.3 L 28.9 74.4 L 28.2 75.1 L 29.2 75.2 L 28.5 75.9 L 29.5 75.9 L 28.8 76.6 L 29.8 76.7 L 29.1 77.4 L 30 77.5 L 29.3 78.2 L 30.2 78.3 L 29.6 79 L 30.4 79.1 L 29.8 79.7 L 30.6 79.9 L 30 80.5 L 30.7 80.7 L 30.1 81.3 L 30.8 81.5 L 30.3 82.1 L 30.9 82.4 L 30.4 83 L 30.8 83.2 L 30.5 83.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 28.9 82.9 L 28.4 82.7 L 28.5 82.3 L 27.9 82.1 L 28.1 81.6 L 27.5 81.5 L 27.8 81 L 27.1 80.9 L 27.4 80.3 L 26.7 80.2 L 27.1 79.7 L 26.4 79.6 L 26.8 79 L 26.1 78.9 L 26.5 78.3 L 25.7 78.2 L 26.2 77.7 L 25.5 77.6 L 25.9 77 L 25.2 76.9 L 25.7 76.3 L 24.9 76.2 L 25.4 75.6 L 24.7 75.5 L 25.2 74.9 L 24.4 74.8 L 24.9 74.2 L 24.2 74.1 L 24.7 73.5 L 24 73.4 L 24.5 72.8 L 23.9 72.7 L 24.3 72.1 L 23.7 72 L 24.1 71.4 L 23.6 71.2 L 23.9 70.7 L 23.5 70.5 L 23.8 70 L 23.4 69.7 L 23.7 69.2 L 23.4 68.9 L 23.6 68.5 L 24.1 68.3 L 24.6 68.5 L 24.6 68.9 L 25.1 69.1 L 25 69.5 L 25.6 69.7 L 25.4 70.2 L 26 70.3 L 25.7 70.8 L 26.4 71 L 26 71.5 L 26.7 71.6 L 26.3 72.1 L 27.1 72.3 L 26.6 72.8 L 27.4 72.9 L 26.9 73.5 L 27.7 73.6 L 27.2 74.2 L 28 74.3 L 27.5 74.8 L 28.2 75 L 27.7 75.5 L 28.5 75.6 L 28 76.2 L 28.7 76.3 L 28.2 76.9 L 28.9 77 L 28.5 77.6 L 29.1 77.7 L 28.7 78.3 L 29.3 78.5 L 28.9 79 L 29.5 79.2 L 29.1 79.7 L 29.6 79.9 L 29.2 80.4 L 29.8 80.6 L 29.4 81.2 L 29.8 81.4 L 29.5 81.9 L 29.9 82.2 L 29.6 82.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.6 83 Q 27.6 76.5 24.8 70.2 Q 26.9 76.8 29.6 83 Z', from: 4, to: 4 },
        { tone: 'soil-deep', d: 'M 16 96 Q 21.3 90 30 90 Q 38.7 90 44 96 Z', from: 5 },
        { tone: 'soil', d: 'M 17.7 96 Q 22.7 91 29.4 90.8 Q 34.2 91.3 38.4 96 Z', from: 5 },
        { tone: 'root-deep', d: 'M 23.6 78 Q 26.8 80 30.4 95.4 Q 33.8 81 36.4 78 Q 30 75.8 23.6 78 Z', from: 5 },
        { tone: 'root', d: 'M 24.6 78.8 Q 27.3 81 29.9 93.8 Q 32.6 81.4 34.9 78.8 Q 30 77 24.6 78.8 Z', from: 5 },
        { tone: 'root-light', d: 'M 25.8 79.2 Q 28.1 83 29.4 90.4 Q 29.6 82 28.7 78.6 Q 27.1 78.2 25.8 79.2 Z', from: 5 },
        { tone: 'root-deep', d: 'M 25.1 81.4 Q 29.8 82.4 34.5 82.6 Q 29.9 81.6 25.1 81.4 Z', from: 5 },
        { tone: 'root-deep', d: 'M 26.2 85.2 Q 29.8 86.2 33.6 86.4 Q 29.9 85.4 26.2 85.2 Z', from: 5 },
        { tone: 'root-deep', d: 'M 27.2 88.9 Q 29.8 90 32.6 90.1 Q 30 89.1 27.2 88.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.5 82.4 L 28.4 82.3 L 28.3 81.5 L 27.2 81.5 L 27.1 80.5 L 26 80.5 L 26 79.5 L 24.8 79.6 L 25 78.4 L 23.7 78.6 L 23.9 77.4 L 22.6 77.5 L 22.9 76.3 L 21.5 76.5 L 21.9 75.2 L 20.5 75.4 L 20.9 74.1 L 19.5 74.3 L 19.9 73 L 18.5 73.2 L 19 71.8 L 17.5 72 L 18 70.7 L 16.6 70.9 L 17.1 69.5 L 15.7 69.7 L 16.2 68.4 L 14.8 68.5 L 15.2 67.2 L 14 67.3 L 14.4 66 L 13.1 66.1 L 13.5 64.8 L 12.3 64.8 L 12.6 63.5 L 11.5 63.5 L 11.8 62.3 L 10.8 62.2 L 11 61 L 10.2 60.8 L 10.3 59.7 L 9.6 59.3 L 9.6 58.3 L 10.4 57.7 L 11.4 57.8 L 11.6 58.6 L 12.7 58.6 L 12.8 59.5 L 13.9 59.6 L 13.9 60.6 L 15.1 60.5 L 15 61.6 L 16.3 61.5 L 16 62.7 L 17.4 62.5 L 17.1 63.7 L 18.4 63.6 L 18.1 64.8 L 19.5 64.6 L 19.1 65.9 L 20.5 65.7 L 20.1 67 L 21.5 66.8 L 21 68.2 L 22.5 68 L 22 69.3 L 23.4 69.1 L 22.9 70.5 L 24.3 70.3 L 23.9 71.6 L 25.2 71.5 L 24.8 72.8 L 26.1 72.7 L 25.7 74 L 26.9 73.9 L 26.5 75.2 L 27.8 75.2 L 27.4 76.4 L 28.5 76.4 L 28.2 77.7 L 29.3 77.8 L 29.1 78.9 L 30 79.1 L 29.8 80.2 L 30.6 80.5 L 30.5 81.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.2 80.7 L 27.3 80.5 L 27.1 79.8 L 26.2 79.7 L 26.2 78.9 L 25.2 78.8 L 25.2 78 L 24.2 77.9 L 24.2 77 L 23.2 77 L 23.3 76 L 22.3 76.1 L 22.4 75.1 L 21.3 75.1 L 21.5 74.1 L 20.4 74.1 L 20.6 73.1 L 19.5 73.1 L 19.7 72.1 L 18.6 72.1 L 18.9 71 L 17.8 71.1 L 18 70 L 16.9 70.1 L 17.2 69 L 16.1 69 L 16.3 67.9 L 15.3 67.9 L 15.5 66.9 L 14.5 66.8 L 14.7 65.8 L 13.7 65.7 L 13.9 64.7 L 13 64.6 L 13.1 63.6 L 12.3 63.5 L 12.4 62.5 L 11.6 62.3 L 11.6 61.4 L 10.9 61.1 L 10.9 60.2 L 10.3 59.8 L 10.3 59 L 10.9 58.5 L 11.7 58.7 L 11.9 59.4 L 12.8 59.5 L 12.9 60.3 L 13.9 60.4 L 13.9 61.2 L 14.9 61.3 L 14.9 62.2 L 15.9 62.2 L 15.8 63.1 L 16.9 63.1 L 16.7 64.1 L 17.8 64.1 L 17.6 65.1 L 18.7 65.1 L 18.5 66.1 L 19.6 66 L 19.4 67.1 L 20.5 67 L 20.3 68.1 L 21.4 68.1 L 21.1 69.2 L 22.2 69.1 L 22 70.2 L 23.1 70.1 L 22.8 71.2 L 23.9 71.2 L 23.6 72.3 L 24.7 72.3 L 24.5 73.4 L 25.5 73.4 L 25.3 74.4 L 26.2 74.5 L 26 75.5 L 27 75.6 L 26.8 76.6 L 27.7 76.8 L 27.6 77.7 L 28.3 78 L 28.3 78.9 L 28.9 79.2 L 29 80 Z', from: 5 },
        { tone: 'stemshade', d: 'M 28.8 80.6 Q 21.2 70.6 12.8 61.4 Q 20.4 71.3 28.8 80.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.5 81.5 L 29.5 80.6 L 30.2 80.3 L 30.1 79.2 L 31 79.1 L 30.8 78 L 31.8 77.9 L 31.6 76.7 L 32.7 76.8 L 32.4 75.6 L 33.5 75.7 L 33.2 74.4 L 34.4 74.5 L 34.1 73.3 L 35.3 73.4 L 34.9 72.1 L 36.2 72.4 L 35.8 71 L 37.2 71.3 L 36.8 70 L 38.1 70.2 L 37.7 68.9 L 39.1 69.2 L 38.7 67.9 L 40 68.2 L 39.7 66.9 L 41 67.1 L 40.7 65.9 L 42 66.1 L 41.7 64.9 L 43 65.1 L 42.8 64 L 44.1 64.2 L 43.9 63 L 45.1 63.2 L 45 62.2 L 46.2 62.3 L 46.2 61.3 L 47.3 61.3 L 47.4 60.5 L 48.4 60.5 L 48.7 59.8 L 49.6 59.7 L 50.4 60.3 L 50.4 61.3 L 49.7 61.6 L 49.8 62.7 L 48.9 62.8 L 49.1 63.9 L 48.1 64 L 48.3 65.2 L 47.3 65.2 L 47.6 66.4 L 46.4 66.3 L 46.7 67.6 L 45.5 67.4 L 45.9 68.7 L 44.7 68.5 L 45 69.8 L 43.8 69.6 L 44.1 70.9 L 42.8 70.7 L 43.2 72 L 41.9 71.8 L 42.3 73.1 L 40.9 72.8 L 41.3 74.1 L 40 73.9 L 40.4 75.1 L 39 74.9 L 39.3 76.1 L 38 75.9 L 38.3 77.1 L 37 76.9 L 37.3 78.1 L 36 77.9 L 36.2 79 L 34.9 78.8 L 35.1 79.9 L 33.9 79.8 L 33.9 80.8 L 32.8 80.7 L 32.7 81.6 L 31.7 81.6 L 31.5 82.4 L 30.5 82.5 Z', from: 5 },
        { tone: 'stem', d: 'M 30.2 80.1 L 30.3 79.3 L 30.9 79 L 30.9 78.2 L 31.6 78 L 31.6 77.1 L 32.4 77 L 32.3 76 L 33.2 75.9 L 33 75 L 34 74.9 L 33.8 73.9 L 34.8 73.9 L 34.6 72.9 L 35.6 73 L 35.4 71.9 L 36.4 72 L 36.2 70.9 L 37.2 71 L 37 70 L 38.1 70.1 L 37.9 69 L 39 69.2 L 38.7 68.1 L 39.8 68.2 L 39.6 67.2 L 40.7 67.3 L 40.5 66.3 L 41.6 66.4 L 41.5 65.4 L 42.5 65.5 L 42.4 64.5 L 43.4 64.6 L 43.4 63.7 L 44.3 63.7 L 44.3 62.9 L 45.3 62.9 L 45.4 62.1 L 46.3 62 L 46.4 61.3 L 47.2 61.2 L 47.5 60.6 L 48.3 60.4 L 48.8 60.9 L 48.8 61.7 L 48.2 62 L 48.2 62.9 L 47.5 63.1 L 47.5 64 L 46.7 64.2 L 46.8 65.1 L 46 65.2 L 46.1 66.2 L 45.2 66.2 L 45.3 67.2 L 44.4 67.2 L 44.5 68.2 L 43.6 68.2 L 43.8 69.2 L 42.7 69.1 L 42.9 70.2 L 41.9 70.1 L 42.1 71.2 L 41.1 71.1 L 41.3 72.1 L 40.2 72 L 40.4 73.1 L 39.3 72.9 L 39.5 74 L 38.5 73.9 L 38.6 74.9 L 37.6 74.8 L 37.7 75.8 L 36.7 75.7 L 36.8 76.7 L 35.8 76.6 L 35.8 77.5 L 34.8 77.5 L 34.9 78.4 L 33.9 78.3 L 33.9 79.2 L 33 79.2 L 32.8 79.9 L 32 80 L 31.8 80.7 L 30.9 80.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.2 80.7 Q 39.6 72.2 47.2 63.1 Q 38.8 71.5 31.2 80.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.3 82 L 28.6 81.2 L 29 80.4 L 28.2 79.6 L 28.8 78.8 L 27.9 78 L 28.6 77.1 L 27.6 76.3 L 28.5 75.5 L 27.4 74.7 L 28.3 73.9 L 27.3 73.1 L 28.3 72.3 L 27.1 71.5 L 28.2 70.7 L 27 69.9 L 28.1 69 L 26.9 68.2 L 28.1 67.4 L 26.9 66.6 L 28.1 65.8 L 26.9 65 L 28.1 64.2 L 26.9 63.4 L 28.1 62.6 L 27 61.8 L 28.1 61 L 27.1 60.1 L 28.2 59.3 L 27.2 58.5 L 28.3 57.7 L 27.3 56.9 L 28.4 56.1 L 27.5 55.3 L 28.5 54.5 L 27.7 53.7 L 28.7 52.9 L 28 52 L 28.9 51.2 L 28.4 50.4 L 29.1 49.6 L 28.9 48.8 L 29.5 48 L 30.5 48 L 31.1 48.8 L 30.9 49.6 L 31.6 50.4 L 31.1 51.2 L 32 52 L 31.3 52.9 L 32.3 53.7 L 31.5 54.5 L 32.5 55.3 L 31.6 56.1 L 32.7 56.9 L 31.7 57.7 L 32.8 58.5 L 31.8 59.3 L 32.9 60.1 L 31.9 61 L 33 61.8 L 31.9 62.6 L 33.1 63.4 L 31.9 64.2 L 33.1 65 L 31.9 65.8 L 33.1 66.6 L 31.9 67.4 L 33.1 68.2 L 31.9 69 L 33 69.9 L 31.8 70.7 L 32.9 71.5 L 31.7 72.3 L 32.7 73.1 L 31.7 73.9 L 32.6 74.7 L 31.5 75.5 L 32.4 76.3 L 31.4 77.1 L 32.1 78 L 31.2 78.8 L 31.8 79.6 L 31 80.4 L 31.4 81.2 L 30.7 82 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.1 79.9 L 28.6 79.1 L 28.8 78.4 L 28.3 77.7 L 28.7 77 L 28 76.2 L 28.5 75.5 L 27.8 74.8 L 28.4 74 L 27.7 73.3 L 28.4 72.6 L 27.5 71.9 L 28.3 71.1 L 27.4 70.4 L 28.2 69.7 L 27.4 68.9 L 28.2 68.2 L 27.3 67.5 L 28.2 66.8 L 27.3 66 L 28.2 65.3 L 27.3 64.6 L 28.2 63.8 L 27.3 63.1 L 28.2 62.4 L 27.3 61.7 L 28.2 60.9 L 27.4 60.2 L 28.3 59.5 L 27.5 58.7 L 28.3 58 L 27.6 57.3 L 28.4 56.6 L 27.7 55.8 L 28.5 55.1 L 27.9 54.4 L 28.6 53.6 L 28.1 52.9 L 28.7 52.2 L 28.4 51.5 L 28.9 50.7 L 28.7 50 L 29.2 49.3 L 29.9 49.3 L 30.4 50 L 30.2 50.7 L 30.8 51.5 L 30.4 52.2 L 31 52.9 L 30.5 53.6 L 31.2 54.4 L 30.7 55.1 L 31.4 55.8 L 30.8 56.6 L 31.6 57.3 L 30.8 58 L 31.7 58.7 L 30.9 59.5 L 31.8 60.2 L 30.9 60.9 L 31.8 61.7 L 31 62.4 L 31.9 63.1 L 31 63.8 L 31.9 64.6 L 31 65.3 L 31.9 66 L 31 66.8 L 31.8 67.5 L 31 68.2 L 31.8 68.9 L 30.9 69.7 L 31.7 70.4 L 30.9 71.1 L 31.6 71.9 L 30.8 72.6 L 31.5 73.3 L 30.7 74 L 31.3 74.8 L 30.6 75.5 L 31.1 76.2 L 30.5 77 L 30.9 77.7 L 30.3 78.4 L 30.6 79.1 L 30.1 79.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 80 Q 30.5 66.4 30 52.8 Q 29.5 66.4 30 80 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.4 82.2 L 28.5 81.7 L 28.5 80.8 L 27.5 80.3 L 27.7 79.4 L 26.6 78.9 L 26.9 77.9 L 25.8 77.5 L 26.2 76.4 L 25 76 L 25.5 75 L 24.2 74.6 L 24.8 73.5 L 23.5 73.1 L 24.1 72 L 22.8 71.6 L 23.4 70.5 L 22.1 70.1 L 22.8 69 L 21.4 68.6 L 22.1 67.4 L 20.8 67.1 L 21.5 65.9 L 20.2 65.6 L 20.9 64.4 L 19.6 64 L 20.3 62.8 L 19.1 62.5 L 19.8 61.3 L 18.6 60.9 L 19.2 59.7 L 18.1 59.3 L 18.7 58.2 L 17.6 57.7 L 18.2 56.6 L 17.2 56.1 L 17.7 55 L 16.8 54.5 L 17.3 53.4 L 16.5 52.9 L 16.9 51.8 L 16.3 51.2 L 16.6 50.2 L 17.4 49.8 L 18.3 50.4 L 18.4 51.2 L 19.3 51.7 L 19.2 52.7 L 20.3 53.1 L 20 54.1 L 21.1 54.5 L 20.8 55.6 L 21.9 56 L 21.5 57.1 L 22.7 57.4 L 22.2 58.5 L 23.5 58.9 L 22.9 60 L 24.2 60.4 L 23.6 61.5 L 24.9 61.9 L 24.2 63 L 25.5 63.4 L 24.9 64.6 L 26.2 64.9 L 25.5 66.1 L 26.8 66.4 L 26.1 67.6 L 27.4 68 L 26.7 69.2 L 27.9 69.5 L 27.2 70.7 L 28.5 71.1 L 27.8 72.2 L 29 72.7 L 28.3 73.8 L 29.4 74.2 L 28.9 75.4 L 29.9 75.8 L 29.3 76.9 L 30.3 77.5 L 29.8 78.5 L 30.6 79.1 L 30.2 80.1 L 30.9 80.8 L 30.6 81.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.5 80.2 L 27.8 79.6 L 27.7 78.9 L 26.9 78.4 L 27 77.5 L 26.2 77.1 L 26.4 76.2 L 25.5 75.8 L 25.7 74.9 L 24.8 74.5 L 25.1 73.5 L 24.1 73.1 L 24.5 72.2 L 23.5 71.8 L 23.9 70.8 L 22.8 70.5 L 23.3 69.5 L 22.2 69.1 L 22.7 68.1 L 21.7 67.8 L 22.1 66.8 L 21.1 66.4 L 21.6 65.4 L 20.5 65 L 21 64 L 20 63.6 L 20.5 62.6 L 19.5 62.2 L 20 61.2 L 19 60.8 L 19.5 59.8 L 18.6 59.4 L 19 58.4 L 18.1 58 L 18.5 57 L 17.7 56.6 L 18.1 55.6 L 17.4 55.1 L 17.6 54.2 L 17 53.7 L 17.2 52.8 L 16.8 52.2 L 16.9 51.3 L 17.5 51.1 L 18.2 51.6 L 18.3 52.3 L 19.1 52.8 L 19.1 53.6 L 19.9 54.1 L 19.7 54.9 L 20.6 55.4 L 20.4 56.3 L 21.3 56.7 L 21 57.6 L 22 58 L 21.7 59 L 22.7 59.4 L 22.3 60.3 L 23.3 60.7 L 22.9 61.7 L 23.9 62 L 23.5 63 L 24.5 63.4 L 24 64.4 L 25.1 64.8 L 24.6 65.8 L 25.6 66.1 L 25.1 67.1 L 26.1 67.5 L 25.7 68.5 L 26.7 68.9 L 26.2 69.9 L 27.2 70.3 L 26.7 71.3 L 27.6 71.7 L 27.2 72.7 L 28.1 73.1 L 27.7 74.1 L 28.5 74.6 L 28.1 75.5 L 28.9 76 L 28.6 76.9 L 29.2 77.5 L 29 78.3 L 29.5 78.9 L 29.4 79.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.2 80.1 Q 24.4 67.1 18.8 54.5 Q 23.6 67.5 29.2 80.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.4 81.8 L 29.1 80.8 L 29.8 80.1 L 29.4 79.1 L 30.2 78.5 L 29.7 77.5 L 30.7 76.9 L 30.1 75.8 L 31.1 75.4 L 30.6 74.2 L 31.7 73.8 L 31 72.7 L 32.2 72.2 L 31.5 71.1 L 32.8 70.7 L 32.1 69.5 L 33.3 69.2 L 32.6 68 L 33.9 67.6 L 33.2 66.4 L 34.5 66.1 L 33.8 64.9 L 35.1 64.6 L 34.5 63.4 L 35.8 63 L 35.1 61.9 L 36.4 61.5 L 35.8 60.4 L 37.1 60 L 36.5 58.9 L 37.8 58.5 L 37.3 57.4 L 38.5 57.1 L 38.1 56 L 39.2 55.6 L 38.9 54.5 L 40 54.1 L 39.7 53.1 L 40.8 52.7 L 40.7 51.7 L 41.6 51.2 L 41.7 50.4 L 42.6 49.8 L 43.4 50.2 L 43.7 51.2 L 43.1 51.8 L 43.5 52.9 L 42.7 53.4 L 43.2 54.5 L 42.3 55 L 42.8 56.1 L 41.8 56.6 L 42.4 57.7 L 41.3 58.2 L 41.9 59.3 L 40.8 59.7 L 41.4 60.9 L 40.2 61.3 L 40.9 62.5 L 39.7 62.8 L 40.4 64 L 39.1 64.4 L 39.8 65.6 L 38.5 65.9 L 39.2 67.1 L 37.9 67.4 L 38.6 68.6 L 37.2 69 L 37.9 70.1 L 36.6 70.5 L 37.2 71.6 L 35.9 72 L 36.5 73.1 L 35.2 73.5 L 35.8 74.6 L 34.5 75 L 35 76 L 33.8 76.4 L 34.2 77.5 L 33.1 77.9 L 33.4 78.9 L 32.3 79.4 L 32.5 80.3 L 31.5 80.8 L 31.5 81.7 L 30.6 82.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.8 79.8 L 29.6 78.9 L 30.2 78.3 L 29.9 77.5 L 30.6 76.9 L 30.3 76 L 31 75.5 L 30.7 74.6 L 31.5 74.1 L 31.1 73.1 L 32 72.7 L 31.5 71.7 L 32.4 71.3 L 32 70.3 L 33 69.9 L 32.5 68.9 L 33.5 68.5 L 33 67.5 L 34 67.1 L 33.5 66.1 L 34.6 65.8 L 34.1 64.8 L 35.1 64.4 L 34.7 63.4 L 35.7 63 L 35.3 62 L 36.3 61.7 L 35.9 60.7 L 36.9 60.3 L 36.5 59.4 L 37.5 59 L 37.1 58 L 38.1 57.6 L 37.8 56.7 L 38.8 56.3 L 38.5 55.4 L 39.4 54.9 L 39.3 54.1 L 40.1 53.6 L 40.1 52.8 L 40.8 52.3 L 40.9 51.6 L 41.6 51.1 L 42.2 51.3 L 42.4 52.2 L 41.9 52.8 L 42.1 53.7 L 41.5 54.2 L 41.8 55.1 L 41.1 55.6 L 41.4 56.6 L 40.6 57 L 41 58 L 40.2 58.4 L 40.6 59.4 L 39.7 59.8 L 40.1 60.8 L 39.2 61.2 L 39.6 62.2 L 38.7 62.6 L 39.1 63.6 L 38.1 64 L 38.6 65 L 37.6 65.4 L 38.1 66.4 L 37 66.8 L 37.5 67.8 L 36.5 68.1 L 36.9 69.1 L 35.9 69.5 L 36.3 70.5 L 35.3 70.8 L 35.7 71.8 L 34.7 72.2 L 35 73.1 L 34.1 73.5 L 34.4 74.5 L 33.4 74.9 L 33.7 75.8 L 32.8 76.2 L 33 77.1 L 32.1 77.5 L 32.2 78.4 L 31.4 78.9 L 31.4 79.6 L 30.7 80.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.8 80.1 Q 36.4 67.5 41.2 54.5 Q 35.6 67.1 30.8 80.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.5 82.2 L 28.8 82 L 28.9 81.5 L 28.1 81.3 L 28.3 80.7 L 27.4 80.6 L 27.8 79.9 L 26.9 79.8 L 27.3 79.1 L 26.3 79 L 26.8 78.3 L 25.8 78.2 L 26.4 77.5 L 25.3 77.4 L 25.9 76.6 L 24.9 76.6 L 25.5 75.8 L 24.4 75.8 L 25.1 74.9 L 24 74.9 L 24.7 74.1 L 23.6 74.1 L 24.3 73.2 L 23.3 73.2 L 24 72.4 L 22.9 72.3 L 23.6 71.5 L 22.6 71.4 L 23.3 70.6 L 22.3 70.5 L 23 69.7 L 22 69.6 L 22.7 68.8 L 21.8 68.7 L 22.4 67.9 L 21.6 67.8 L 22.1 67 L 21.4 66.8 L 21.9 66.1 L 21.3 65.8 L 21.7 65.2 L 21.3 64.8 L 21.6 64.2 L 22.4 63.8 L 23.1 64 L 23 64.6 L 23.8 64.7 L 23.6 65.3 L 24.5 65.5 L 24.1 66.1 L 25.1 66.2 L 24.7 66.9 L 25.6 67 L 25.1 67.7 L 26.1 67.8 L 25.6 68.6 L 26.6 68.6 L 26 69.4 L 27.1 69.4 L 26.5 70.2 L 27.6 70.3 L 26.9 71.1 L 28 71.1 L 27.3 71.9 L 28.4 71.9 L 27.7 72.8 L 28.7 72.8 L 28 73.6 L 29.1 73.7 L 28.4 74.5 L 29.4 74.6 L 28.7 75.4 L 29.7 75.4 L 29.1 76.3 L 30 76.4 L 29.4 77.2 L 30.3 77.3 L 29.7 78 L 30.5 78.2 L 29.9 79 L 30.7 79.1 L 30.2 79.9 L 30.8 80.1 L 30.4 80.8 L 30.9 81.1 L 30.5 81.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.8 80.8 L 28.2 80.6 L 28.3 80.2 L 27.7 80 L 27.8 79.4 L 27.1 79.3 L 27.4 78.7 L 26.6 78.6 L 26.9 78 L 26.2 77.9 L 26.5 77.2 L 25.7 77.1 L 26.1 76.5 L 25.3 76.4 L 25.7 75.7 L 24.9 75.6 L 25.4 75 L 24.5 74.9 L 25 74.2 L 24.2 74.1 L 24.7 73.4 L 23.8 73.4 L 24.3 72.7 L 23.5 72.6 L 24 71.9 L 23.2 71.8 L 23.7 71.1 L 22.9 71 L 23.4 70.3 L 22.6 70.2 L 23.1 69.5 L 22.3 69.4 L 22.8 68.7 L 22.1 68.6 L 22.5 67.9 L 21.9 67.7 L 22.3 67.1 L 21.7 66.9 L 22 66.3 L 21.6 66 L 21.8 65.5 L 21.5 65.1 L 21.7 64.6 L 22.2 64.4 L 22.8 64.6 L 22.8 65 L 23.4 65.2 L 23.3 65.7 L 23.9 65.9 L 23.7 66.5 L 24.5 66.6 L 24.2 67.2 L 24.9 67.3 L 24.6 67.9 L 25.4 68 L 25 68.7 L 25.8 68.8 L 25.4 69.4 L 26.2 69.5 L 25.8 70.2 L 26.6 70.3 L 26.1 70.9 L 27 71 L 26.5 71.7 L 27.3 71.8 L 26.8 72.5 L 27.7 72.6 L 27.2 73.3 L 28 73.3 L 27.5 74 L 28.3 74.1 L 27.8 74.8 L 28.6 74.9 L 28.1 75.6 L 28.8 75.7 L 28.4 76.4 L 29.1 76.6 L 28.7 77.2 L 29.3 77.4 L 28.9 78 L 29.5 78.2 L 29.2 78.8 L 29.7 79.1 L 29.4 79.7 L 29.8 79.9 L 29.6 80.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.5 80.9 Q 26.7 73.6 23.1 66.5 Q 25.9 73.9 29.5 80.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.5 81.7 L 29.2 81.1 L 29.7 80.8 L 29.3 80 L 30 79.8 L 29.5 79.1 L 30.2 78.9 L 29.7 78.1 L 30.6 78 L 30 77.2 L 30.9 77.1 L 30.3 76.3 L 31.3 76.2 L 30.6 75.3 L 31.6 75.3 L 31 74.5 L 32 74.4 L 31.4 73.6 L 32.4 73.6 L 31.8 72.7 L 32.8 72.7 L 32.2 71.8 L 33.3 71.9 L 32.6 71 L 33.7 71 L 33.1 70.2 L 34.2 70.2 L 33.6 69.3 L 34.7 69.3 L 34.1 68.5 L 35.1 68.5 L 34.6 67.7 L 35.7 67.7 L 35.2 66.9 L 36.2 66.9 L 35.8 66.2 L 36.7 66.1 L 36.5 65.4 L 37.3 65.3 L 37.1 64.7 L 37.9 64.5 L 37.9 64 L 38.6 63.8 L 39.4 64.2 L 39.6 64.9 L 39.2 65.2 L 39.6 65.9 L 39 66.1 L 39.4 66.9 L 38.7 67.1 L 39.2 67.8 L 38.4 68 L 38.9 68.8 L 38.1 68.9 L 38.6 69.7 L 37.7 69.8 L 38.3 70.6 L 37.3 70.7 L 38 71.5 L 37 71.6 L 37.6 72.4 L 36.6 72.4 L 37.2 73.3 L 36.2 73.3 L 36.8 74.2 L 35.7 74.1 L 36.4 75 L 35.3 75 L 35.9 75.9 L 34.8 75.8 L 35.5 76.7 L 34.4 76.7 L 34.9 77.5 L 33.9 77.5 L 34.4 78.3 L 33.4 78.3 L 33.9 79.1 L 32.9 79.1 L 33.3 79.9 L 32.3 79.9 L 32.6 80.6 L 31.8 80.7 L 32 81.4 L 31.2 81.5 L 31.2 82.1 L 30.5 82.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.6 80.5 L 29.5 79.9 L 29.9 79.6 L 29.6 79 L 30.1 78.8 L 29.8 78.2 L 30.4 78 L 30.1 77.3 L 30.7 77.2 L 30.3 76.5 L 31 76.4 L 30.6 75.7 L 31.4 75.6 L 30.9 74.9 L 31.7 74.8 L 31.3 74.1 L 32.1 74 L 31.6 73.3 L 32.4 73.2 L 32 72.5 L 32.8 72.4 L 32.4 71.7 L 33.2 71.7 L 32.8 71 L 33.6 70.9 L 33.2 70.2 L 34 70.1 L 33.6 69.4 L 34.4 69.4 L 34.1 68.7 L 34.9 68.6 L 34.5 68 L 35.3 67.9 L 35 67.3 L 35.8 67.2 L 35.5 66.6 L 36.2 66.4 L 36.1 65.9 L 36.7 65.7 L 36.7 65.2 L 37.3 65 L 37.3 64.5 L 37.9 64.3 L 38.4 64.6 L 38.6 65.2 L 38.2 65.5 L 38.4 66.1 L 38 66.3 L 38.3 67 L 37.7 67.2 L 38 67.8 L 37.4 68 L 37.8 68.6 L 37.1 68.8 L 37.5 69.5 L 36.8 69.6 L 37.2 70.3 L 36.4 70.4 L 36.9 71.1 L 36.1 71.2 L 36.5 71.9 L 35.7 71.9 L 36.2 72.7 L 35.3 72.7 L 35.8 73.4 L 34.9 73.5 L 35.4 74.2 L 34.6 74.3 L 35 75 L 34.2 75 L 34.6 75.7 L 33.7 75.8 L 34.1 76.5 L 33.3 76.5 L 33.7 77.2 L 32.9 77.3 L 33.2 77.9 L 32.4 78 L 32.7 78.6 L 32 78.7 L 32.2 79.3 L 31.5 79.5 L 31.6 80 L 31 80.2 L 31 80.7 L 30.4 80.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.5 80.9 Q 34.5 73.9 37.7 66.5 Q 33.8 73.5 30.5 80.9 Z', from: 5 }
      ]
    },
    corn: {
      trunk: 'M 27.6 96 Q 28.8 71 28.2 46 L 31.8 46 Q 31.2 71 32.4 96 Z',
      trunkShort: 'M 28 96 Q 29 84 28.4 72 L 31.6 72 Q 31 84 32 96 Z',
      trunkTone: 'stem',
      blossoms: [[37, 66], [40, 58], [34, 74], [30, 46], [24, 62], [44, 50], [30, 34], [30, 82], [18, 70]],
      parts: [
        { tone: 'stem', d: 'M 28 96 Q 29 84 28.4 72 L 31.6 72 Q 31 84 32 96 Z', from: 2, to: 2 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.6 84 30.2 72 L 31.6 72 Q 31 84 32 96 Z', from: 2, to: 2 },
        { tone: 'stemdark', d: 'M 27.6 82 Q 30.1 82.5 32.4 81.6 Q 29.9 81.1 27.6 82 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 31.5 81.8 C 30.1 81.1 25.7 77.4 23.1 77.6 C 20.5 77.7 16.9 81.7 15.6 82.5 L 16.4 83.8 C 17.5 83.4 20.9 80.5 22.9 80.9 C 24.9 81.3 27.6 85.3 28.5 86.2 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 30.4 82 C 29.1 81.2 25 77.2 22.5 77.1 C 19.9 77.1 16.3 80.9 15.1 81.7 L 15.6 82.6 C 16.7 82 20.1 78.9 22.3 79.3 C 24.4 79.7 27.3 83.8 28.4 84.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.2 83.7 C 29 82.9 25.4 79.1 23 79 C 20.6 78.9 17.1 82.4 15.9 83.1 L 16.1 83.3 C 17.2 82.6 20.7 79.3 23 79.5 C 25.3 79.7 28.6 83.5 29.8 84.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 31.5 82.2 C 32.3 81.3 34.7 77.6 36.6 77.3 C 38.5 76.9 41.6 79.5 42.6 79.9 L 43.4 78.5 C 42.2 77.8 38.9 74 36.4 73.9 C 33.9 73.8 29.8 77.2 28.5 77.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.4 80.7 C 31.3 79.9 34 76 36 75.6 C 37.9 75.3 41.1 78.1 42.1 78.6 L 42.6 77.7 C 41.5 77 38.1 73.4 35.8 73.4 C 33.4 73.5 29.6 77.2 28.4 78 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.2 80.3 C 31.3 79.6 34.4 76 36.5 75.8 C 38.6 75.7 41.9 78.7 42.9 79.3 L 43.1 79.1 C 42 78.5 38.7 75.2 36.5 75.3 C 34.3 75.4 30.9 78.9 29.8 79.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 31.5 71.8 C 30.3 71.3 26.7 68.4 24.6 68.6 C 22.5 68.7 19.6 72 18.6 72.7 L 19.4 74 C 20.2 73.7 22.9 71.6 24.4 71.9 C 25.9 72.3 27.8 75.4 28.5 76.2 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 30.4 72 C 29.3 71.4 26 68.1 24 68.1 C 21.9 68.1 19.1 71.2 18.1 71.9 L 18.6 72.7 C 19.5 72.3 22.1 70 23.8 70.3 C 25.4 70.7 27.6 74 28.3 74.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.2 73.7 C 29.3 73.1 26.4 70.1 24.5 70 C 22.6 69.9 19.9 72.7 18.9 73.2 L 19.1 73.4 C 20 73 22.7 70.4 24.5 70.5 C 26.3 70.7 28.9 73.7 29.8 74.3 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 27.6 96 Q 28.8 71 28.2 46 L 31.8 46 Q 31.2 71 32.4 96 Z', from: 3, to: 3 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.7 71 30.2 46 L 31.8 46 Q 31.2 71 32.4 96 Z', from: 3, to: 3 },
        { tone: 'stemdark', d: 'M 27.6 84 Q 30.1 84.5 32.4 83.6 Q 29.9 83.1 27.6 84 Z', from: 3, to: 3 },
        { tone: 'stemdark', d: 'M 27.6 70 Q 30.1 70.5 32.4 69.6 Q 29.9 69.1 27.6 70 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31.5 83.8 C 29.8 83 24.7 78.5 21.6 78.5 C 18.5 78.6 14.1 83.3 12.6 84.3 L 13.4 85.7 C 14.7 85 18.9 81.5 21.4 81.9 C 23.9 82.3 27.3 87.1 28.5 88.2 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30.4 84 C 28.8 83 24 78.2 21 78.1 C 17.9 78 13.6 82.6 12.1 83.5 L 12.6 84.4 C 14 83.7 18.1 79.9 20.8 80.3 C 23.4 80.7 27.1 85.7 28.4 86.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 85.7 C 28.8 84.7 24.4 80.1 21.5 80 C 18.6 79.8 14.4 84.1 12.9 84.9 L 13.1 85.1 C 14.5 84.3 18.7 80.3 21.5 80.5 C 24.3 80.7 28.4 85.4 29.8 86.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31.5 82.2 C 32.6 81.2 35.7 76.7 38.1 76.2 C 40.5 75.8 44.4 79.1 45.6 79.7 L 46.4 78.4 C 45 77.4 40.9 73 37.9 72.9 C 34.9 72.8 30.1 77 28.5 77.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.4 80.7 C 31.5 79.7 35 75 37.5 74.6 C 39.9 74.2 43.8 77.8 45.1 78.4 L 45.6 77.6 C 44.2 76.7 40.1 72.4 37.3 72.4 C 34.4 72.5 29.8 77.1 28.4 78 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 80.3 C 31.5 79.4 35.4 75 38 74.8 C 40.6 74.6 44.6 78.4 45.9 79.1 L 46.1 78.9 C 44.7 78.2 40.7 74.2 38 74.3 C 35.3 74.4 31.1 78.8 29.8 79.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31.5 67.8 C 30 67.1 25.4 63.1 22.6 63.2 C 19.8 63.3 15.9 67.6 14.6 68.4 L 15.4 69.8 C 16.6 69.2 20.2 66.2 22.4 66.6 C 24.6 67 27.5 71.2 28.5 72.2 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30.4 68 C 29 67.1 24.7 62.8 22 62.8 C 19.2 62.7 15.4 66.8 14.1 67.6 L 14.6 68.5 C 15.8 67.9 19.5 64.6 21.8 65 C 24.1 65.3 27.3 69.8 28.4 70.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 69.7 C 28.9 68.8 25.1 64.8 22.5 64.6 C 20 64.5 16.2 68.3 14.9 69 L 15.1 69.2 C 16.3 68.5 20 65 22.5 65.2 C 24.9 65.3 28.6 69.5 29.8 70.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31.5 62.2 C 32.4 61.3 35.1 57.3 37.1 56.9 C 39.1 56.5 42.5 59.4 43.6 59.8 L 44.4 58.5 C 43.1 57.7 39.5 53.7 36.9 53.6 C 34.3 53.4 29.9 57.1 28.5 57.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.4 60.7 C 31.4 59.8 34.3 55.7 36.5 55.3 C 38.6 54.9 42 58 43.1 58.6 L 43.6 57.7 C 42.4 56.9 38.8 53.1 36.3 53.1 C 33.7 53.2 29.7 57.2 28.4 58 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 60.3 C 31.4 59.5 34.7 55.7 37 55.5 C 39.3 55.3 42.8 58.6 43.9 59.3 L 44.1 59.1 C 42.9 58.4 39.4 54.9 37 55 C 34.6 55.1 31 58.9 29.8 59.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31.5 47.8 C 30.2 47.2 26.4 44.1 24.1 44.2 C 21.8 44.4 18.7 47.9 17.6 48.6 L 18.4 50 C 19.3 49.6 22.2 47.2 23.9 47.6 C 25.6 48 27.8 51.4 28.5 52.2 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30.4 48 C 29.2 47.3 25.7 43.8 23.5 43.8 C 21.3 43.7 18.2 47.1 17.1 47.8 L 17.6 48.7 C 18.6 48.2 21.5 45.6 23.3 46 C 25 46.3 27.5 49.9 28.3 50.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 49.7 C 29.2 49 26.1 45.7 24 45.7 C 22 45.6 19 48.6 17.9 49.2 L 18.1 49.4 C 19 48.9 22 46 24 46.2 C 25.9 46.3 28.8 49.6 29.8 50.3 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 27.4 96 Q 28.7 63 28.1 30 L 31.9 30 Q 31.3 63 32.6 96 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 30.5 96 Q 30.7 63 30.2 30 L 31.9 30 Q 31.3 63 32.6 96 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 27.6 86 Q 30.1 86.5 32.4 85.6 Q 29.9 85.1 27.6 86 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 27.6 72 Q 30.1 72.5 32.4 71.6 Q 29.9 71.1 27.6 72 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 27.6 56 Q 30.1 56.5 32.4 55.6 Q 29.9 55.1 27.6 56 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.5 85.8 C 29.7 84.9 24.4 80.1 21.1 80.2 C 17.8 80.3 13.2 85.2 11.6 86.2 L 12.4 87.6 C 13.8 86.9 18.2 83.1 20.9 83.6 C 23.6 84 27.3 89.1 28.5 90.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.4 86 C 28.7 84.9 23.7 79.8 20.5 79.7 C 17.2 79.7 12.7 84.5 11.1 85.4 L 11.6 86.3 C 13.1 85.6 17.5 81.5 20.3 81.9 C 23.1 82.3 27 87.6 28.4 88.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 87.7 C 28.7 86.7 24.1 81.8 21 81.6 C 18 81.5 13.5 85.9 11.9 86.8 L 12.1 87 C 13.5 86.2 18 81.9 21 82.1 C 23.9 82.4 28.3 87.3 29.8 88.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.5 84.2 C 32.7 83.1 36.1 78.3 38.6 77.9 C 41.1 77.5 45.3 81 46.6 81.7 L 47.4 80.3 C 45.9 79.3 41.5 74.6 38.4 74.5 C 35.3 74.5 30.2 79 28.5 79.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 82.7 C 31.6 81.7 35.3 76.7 38 76.3 C 40.6 75.9 44.8 79.7 46.1 80.4 L 46.6 79.5 C 45.1 78.6 40.8 74 37.8 74.1 C 34.7 74.2 29.9 79 28.4 80 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 82.3 C 31.6 81.4 35.7 76.7 38.5 76.5 C 41.3 76.3 45.5 80.3 46.9 81.1 L 47.1 80.9 C 45.6 80.1 41.4 75.8 38.5 76 C 35.6 76.1 31.2 80.7 29.8 81.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.5 69.8 C 29.9 69 25.1 64.8 22.1 64.9 C 19.1 65 15 69.4 13.6 70.4 L 14.4 71.7 C 15.6 71.1 19.5 67.8 21.9 68.2 C 24.3 68.7 27.4 73.2 28.5 74.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.4 70 C 28.9 69.1 24.3 64.5 21.5 64.4 C 18.6 64.4 14.5 68.7 13.1 69.6 L 13.6 70.4 C 14.9 69.8 18.8 66.2 21.3 66.6 C 23.7 67 27.2 71.7 28.4 72.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 71.7 C 28.9 70.8 24.7 66.4 22 66.3 C 19.3 66.2 15.3 70.2 13.9 70.9 L 14.1 71.1 C 15.4 70.4 19.4 66.6 22 66.8 C 24.6 67 28.5 71.4 29.8 72.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.5 64.2 C 32.5 63.2 35.4 59 37.6 58.6 C 39.8 58.2 43.4 61.2 44.6 61.8 L 45.4 60.4 C 44.1 59.6 40.2 55.3 37.4 55.2 C 34.6 55.1 30 59.1 28.5 59.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 62.7 C 31.5 61.8 34.7 57.3 37 57 C 39.2 56.6 42.9 59.9 44.1 60.5 L 44.6 59.6 C 43.3 58.8 39.5 54.7 36.8 54.8 C 34.1 54.8 29.8 59.1 28.4 60 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 62.3 C 31.4 61.5 35.1 57.3 37.5 57.2 C 40 57 43.7 60.5 44.9 61.2 L 45.1 61 C 43.8 60.3 40 56.5 37.5 56.6 C 34.9 56.8 31.1 60.8 29.8 61.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.5 47.8 C 30.1 47.1 25.7 43.4 23.1 43.6 C 20.5 43.7 16.9 47.7 15.6 48.5 L 16.4 49.8 C 17.5 49.4 20.9 46.5 22.9 46.9 C 24.9 47.3 27.6 51.3 28.5 52.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.4 48 C 29.1 47.2 25 43.2 22.5 43.1 C 19.9 43.1 16.3 46.9 15.1 47.7 L 15.6 48.6 C 16.7 48 20.1 44.9 22.3 45.3 C 24.4 45.7 27.3 49.8 28.4 50.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 49.7 C 29 48.9 25.4 45.1 23 45 C 20.6 44.9 17.1 48.4 15.9 49.1 L 16.1 49.3 C 17.2 48.6 20.7 45.3 23 45.5 C 25.3 45.7 28.6 49.5 29.8 50.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.5 42.2 C 32.2 41.4 34.4 38 36.1 37.6 C 37.8 37.2 40.7 39.6 41.6 40 L 42.4 38.6 C 41.3 37.9 38.2 34.4 35.9 34.2 C 33.6 34.1 29.8 37.2 28.5 37.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 40.7 C 31.2 39.9 33.7 36.3 35.5 36 C 37.3 35.6 40.2 38.2 41.1 38.7 L 41.6 37.8 C 40.6 37.1 37.5 33.7 35.3 33.8 C 33 33.8 29.5 37.3 28.3 38 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 40.3 C 31.2 39.6 34.1 36.3 36 36.2 C 38 36 41 38.9 41.9 39.4 L 42.1 39.2 C 41 38.6 38 35.6 36 35.7 C 33.9 35.7 30.8 39 29.8 39.7 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30.7 38.5 C 30 37.5 27.7 33.7 26.4 32.6 C 25 31.5 23.2 31.9 22.6 31.8 L 22.4 32.2 C 23 32.4 24.5 32.2 25.6 33.4 C 26.8 34.6 28.7 38.5 29.3 39.5 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30.8 38.7 C 30.4 37.7 29.2 34.2 28.5 32.8 C 27.8 31.4 26.8 30.8 26.5 30.4 L 26 30.6 C 26.3 31.1 27 31.8 27.5 33.2 C 28 34.7 28.9 38.3 29.2 39.3 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 30.9 39 C 30.8 38 30.7 34.7 30.6 33 C 30.5 31.3 30.3 29.7 30.3 29 L 29.7 29 C 29.7 29.7 29.5 31.3 29.4 33 C 29.3 34.7 29.2 38 29.2 39 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 30.8 39.3 C 31.1 38.3 32 34.7 32.5 33.2 C 33 31.8 33.7 31.1 34 30.6 L 33.5 30.4 C 33.2 30.8 32.2 31.4 31.5 32.8 C 30.8 34.2 29.6 37.7 29.2 38.7 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 30.7 39.5 C 31.3 38.5 33.2 34.6 34.4 33.4 C 35.5 32.2 37 32.4 37.6 32.2 L 37.4 31.8 C 36.8 31.9 35 31.5 33.6 32.6 C 32.3 33.7 30 37.5 29.3 38.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 39 77.5 Q 43.2 69.7 38 62.5 Q 33.8 70.3 39 77.5 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 39 76 Q 42.5 69.7 38.4 63.7 Q 34.9 70 39 76 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 38.2 75.4 Q 40.9 69.5 37.6 64 Q 34.9 69.9 38.2 75.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.8 65.2 Q 38.7 65.3 41.7 64.8 Q 38.7 64.7 35.8 65.2 Z', from: 4, to: 4 },
        { tone: 'light', c: [37.7, 64.4, 0.8], from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.8 67.6 Q 38.7 67.7 41.7 67.2 Q 38.7 67.1 35.8 67.6 Z', from: 4, to: 4 },
        { tone: 'light', c: [37.7, 66.8, 0.8], from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.8 70 Q 38.7 70.1 41.7 69.6 Q 38.7 69.5 35.8 70 Z', from: 4, to: 4 },
        { tone: 'light', c: [37.7, 69.2, 0.8], from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.8 72.4 Q 38.7 72.5 41.7 72 Q 38.7 71.9 35.8 72.4 Z', from: 4, to: 4 },
        { tone: 'light', c: [37.7, 71.6, 0.8], from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.8 74.8 Q 38.7 74.9 41.7 74.4 Q 38.7 74.3 35.8 74.8 Z', from: 4, to: 4 },
        { tone: 'light', c: [37.7, 74, 0.8], from: 4, to: 4 },
        { tone: 'stem', d: 'M 41.3 77.5 Q 38.5 70.5 30.6 67 Q 35.6 73.5 41.3 77.5 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 40.5 76.9 Q 38.1 71.5 32.5 67.6 Q 36.4 73 40.5 76.9 Z', from: 4, to: 4 },
        { tone: 'seedhead-light', d: 'M 38.8 63.1 C 39.2 62.8 40.3 61.2 41 61.2 C 41.7 61.1 42.9 62.4 43.3 62.7 L 43.5 62.3 C 43.1 62 41.9 60.3 41 60.2 C 40.1 60.2 38.5 61.6 38 61.9 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 27.2 96 Q 28.6 58 28 20 L 32 20 Q 31.4 58 32.8 96 Z', from: 5 },
        { tone: 'stemdark', d: 'M 30.5 96 Q 30.8 58 30.2 20 L 32 20 Q 31.4 58 32.8 96 Z', from: 5 },
        { tone: 'stemdark', d: 'M 27.6 88 Q 30.1 88.5 32.4 87.6 Q 29.9 87.1 27.6 88 Z', from: 5 },
        { tone: 'stemdark', d: 'M 27.6 74 Q 30.1 74.5 32.4 73.6 Q 29.9 73.1 27.6 74 Z', from: 5 },
        { tone: 'stemdark', d: 'M 27.6 58 Q 30.1 58.5 32.4 57.6 Q 29.9 57.1 27.6 58 Z', from: 5 },
        { tone: 'stemdark', d: 'M 27.6 42 Q 30.1 42.5 32.4 41.6 Q 29.9 41.1 27.6 42 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.5 87.8 C 29.7 86.9 24.1 81.8 20.6 81.9 C 17.1 81.9 12.3 87.1 10.6 88.2 L 11.4 89.5 C 12.9 88.8 17.5 84.8 20.4 85.2 C 23.3 85.7 27.2 91 28.5 92.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.4 88 C 28.6 86.9 23.3 81.5 20 81.4 C 16.6 81.3 11.8 86.4 10.1 87.4 L 10.6 88.3 C 12.1 87.5 16.8 83.2 19.8 83.6 C 22.7 84 26.9 89.6 28.4 90.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 89.7 C 28.6 88.6 23.7 83.4 20.5 83.3 C 17.3 83.1 12.5 87.8 10.9 88.8 L 11.1 89 C 12.6 88.1 17.4 83.6 20.5 83.8 C 23.6 84 28.2 89.2 29.8 90.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.5 86.2 C 32.7 85.1 36.4 80 39.1 79.6 C 41.8 79.1 46.2 82.9 47.6 83.6 L 48.4 82.2 C 46.8 81.2 42.2 76.3 38.9 76.2 C 35.6 76.1 30.3 80.9 28.5 81.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 84.7 C 31.7 83.6 35.7 78.3 38.5 77.9 C 41.2 77.5 45.7 81.6 47.1 82.3 L 47.6 81.4 C 46.1 80.5 41.5 75.7 38.3 75.7 C 35.1 75.8 30 80.9 28.4 82 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 84.3 C 31.7 83.3 36.1 78.4 39 78.1 C 42 77.9 46.5 82.2 47.9 83 L 48.1 82.8 C 46.5 81.9 42 77.5 39 77.6 C 35.9 77.8 31.3 82.7 29.8 83.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.5 71.8 C 29.8 71 24.7 66.5 21.6 66.5 C 18.5 66.6 14.1 71.3 12.6 72.3 L 13.4 73.7 C 14.7 73 18.9 69.5 21.4 69.9 C 23.9 70.3 27.3 75.1 28.5 76.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.4 72 C 28.8 71 24 66.2 21 66.1 C 17.9 66 13.6 70.6 12.1 71.5 L 12.6 72.4 C 14 71.7 18.1 67.9 20.8 68.3 C 23.4 68.7 27.1 73.7 28.4 74.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 73.7 C 28.8 72.7 24.4 68.1 21.5 68 C 18.6 67.8 14.4 72.1 12.9 72.9 L 13.1 73.1 C 14.5 72.3 18.7 68.3 21.5 68.5 C 24.3 68.7 28.4 73.4 29.8 74.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.5 66.2 C 32.6 65.2 35.7 60.7 38.1 60.2 C 40.5 59.8 44.4 63.1 45.6 63.7 L 46.4 62.4 C 45 61.4 40.9 57 37.9 56.9 C 34.9 56.8 30.1 61 28.5 61.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 64.7 C 31.5 63.7 35 59 37.5 58.6 C 39.9 58.2 43.8 61.8 45.1 62.4 L 45.6 61.6 C 44.2 60.7 40.1 56.4 37.3 56.4 C 34.4 56.5 29.8 61.1 28.4 62 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 64.3 C 31.5 63.4 35.4 59 38 58.8 C 40.6 58.6 44.6 62.4 45.9 63.1 L 46.1 62.9 C 44.7 62.2 40.7 58.2 38 58.3 C 35.3 58.4 31.1 62.8 29.8 63.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.5 49.8 C 30 49.1 25.4 45.1 22.6 45.2 C 19.8 45.3 15.9 49.6 14.6 50.4 L 15.4 51.8 C 16.6 51.2 20.2 48.2 22.4 48.6 C 24.6 49 27.5 53.2 28.5 54.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.4 50 C 29 49.1 24.7 44.8 22 44.8 C 19.2 44.7 15.4 48.8 14.1 49.6 L 14.6 50.5 C 15.8 49.9 19.5 46.6 21.8 47 C 24.1 47.3 27.3 51.8 28.4 52.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 51.7 C 28.9 50.8 25.1 46.8 22.5 46.6 C 20 46.5 16.2 50.3 14.9 51 L 15.1 51.2 C 16.3 50.5 20 47 22.5 47.2 C 24.9 47.3 28.6 51.5 29.8 52.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.5 44.2 C 32.4 43.3 35.1 39.3 37.1 38.9 C 39.1 38.5 42.5 41.4 43.6 41.8 L 44.4 40.5 C 43.1 39.7 39.5 35.7 36.9 35.6 C 34.3 35.4 29.9 39.1 28.5 39.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 42.7 C 31.4 41.8 34.3 37.7 36.5 37.3 C 38.6 36.9 42 40 43.1 40.6 L 43.6 39.7 C 42.4 38.9 38.8 35.1 36.3 35.1 C 33.7 35.2 29.7 39.2 28.4 40 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 42.3 C 31.4 41.5 34.7 37.7 37 37.5 C 39.3 37.3 42.8 40.6 43.9 41.3 L 44.1 41.1 C 42.9 40.4 39.4 36.9 37 37 C 34.6 37.1 31 40.9 29.8 41.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.5 29.8 C 30.2 29.2 26.4 26.1 24.1 26.2 C 21.8 26.4 18.7 29.9 17.6 30.6 L 18.4 32 C 19.3 31.6 22.2 29.2 23.9 29.6 C 25.6 30 27.8 33.4 28.5 34.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.4 30 C 29.2 29.3 25.7 25.8 23.5 25.8 C 21.3 25.7 18.2 29.1 17.1 29.8 L 17.6 30.7 C 18.6 30.2 21.5 27.6 23.3 28 C 25 28.3 27.5 31.9 28.3 32.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 31.7 C 29.2 31 26.1 27.7 24 27.7 C 22 27.6 19 30.6 17.9 31.2 L 18.1 31.4 C 19 30.9 22 28 24 28.2 C 25.9 28.3 28.8 31.6 29.8 32.3 Z', from: 5 },
        { tone: 'light', d: 'M 30.7 28.5 C 30 27.5 27.7 23.7 26.4 22.6 C 25 21.5 23.2 21.9 22.6 21.8 L 22.4 22.2 C 23 22.4 24.5 22.2 25.6 23.4 C 26.8 24.6 28.7 28.5 29.3 29.5 Z', from: 5 },
        { tone: 'light', d: 'M 30.8 28.7 C 30.3 27.7 28.7 24 27.8 22.7 C 26.9 21.4 25.6 21.1 25.2 20.8 L 24.8 21.2 C 25.2 21.5 26.1 21.9 26.9 23.3 C 27.6 24.7 28.8 28.3 29.2 29.3 Z', from: 5 },
        { tone: 'light', d: 'M 30.8 28.8 C 30.6 27.8 29.7 24.3 29.2 22.9 C 28.7 21.4 28 20.4 27.7 19.9 L 27.3 20.1 C 27.4 20.6 27.8 21.6 28.1 23.1 C 28.5 24.7 29 28.2 29.2 29.2 Z', from: 5 },
        { tone: 'base', d: 'M 30.9 29 C 30.8 28 30.7 24.7 30.6 23 C 30.5 21.3 30.3 19.7 30.3 19 L 29.7 19 C 29.7 19.7 29.5 21.3 29.4 23 C 29.3 24.7 29.2 28 29.2 29 Z', from: 5 },
        { tone: 'base', d: 'M 30.8 29.2 C 31 28.2 31.5 24.7 31.9 23.1 C 32.2 21.6 32.6 20.6 32.7 20.1 L 32.3 19.9 C 32 20.4 31.3 21.4 30.8 22.9 C 30.3 24.3 29.4 27.8 29.2 28.8 Z', from: 5 },
        { tone: 'base', d: 'M 30.8 29.3 C 31.2 28.3 32.4 24.7 33.1 23.3 C 33.9 21.9 34.8 21.5 35.2 21.2 L 34.8 20.8 C 34.4 21.1 33.1 21.4 32.2 22.7 C 31.3 24 29.7 27.7 29.2 28.7 Z', from: 5 },
        { tone: 'base', d: 'M 30.7 29.5 C 31.3 28.5 33.2 24.6 34.4 23.4 C 35.5 22.2 37 22.4 37.6 22.2 L 37.4 21.8 C 36.8 21.9 35 21.5 33.6 22.6 C 32.3 23.7 30 27.5 29.3 28.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 40 74.5 Q 44.7 65.7 39 57.5 Q 34.3 66.3 40 74.5 Z', from: 5 },
        { tone: 'deep', d: 'M 40 72.8 Q 43.9 65.6 39.4 58.9 Q 35.5 66 40 72.8 Z', from: 5 },
        { tone: 'base', d: 'M 39.1 72.1 Q 42.1 65.5 38.5 59.2 Q 35.5 65.8 39.1 72.1 Z', from: 5 },
        { tone: 'deep', d: 'M 36.4 60.6 Q 39.7 60.7 42.9 60.2 Q 39.7 60 36.4 60.6 Z', from: 5 },
        { tone: 'light', c: [38.6, 59.8, 0.8], from: 5 },
        { tone: 'deep', d: 'M 36.4 63.3 Q 39.7 63.4 42.9 62.9 Q 39.7 62.7 36.4 63.3 Z', from: 5 },
        { tone: 'light', c: [38.6, 62.5, 0.8], from: 5 },
        { tone: 'deep', d: 'M 36.4 66 Q 39.7 66.1 42.9 65.6 Q 39.7 65.5 36.4 66 Z', from: 5 },
        { tone: 'light', c: [38.6, 65.2, 0.8], from: 5 },
        { tone: 'deep', d: 'M 36.4 68.7 Q 39.7 68.9 42.9 68.3 Q 39.7 68.2 36.4 68.7 Z', from: 5 },
        { tone: 'light', c: [38.6, 67.9, 0.8], from: 5 },
        { tone: 'deep', d: 'M 36.4 71.4 Q 39.7 71.6 42.9 71 Q 39.7 70.9 36.4 71.4 Z', from: 5 },
        { tone: 'light', c: [38.6, 70.6, 0.8], from: 5 },
        { tone: 'stem', d: 'M 42.5 74.5 Q 39.5 66.7 30.8 62.6 Q 36.2 69.9 42.5 74.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 41.7 73.8 Q 39 67.8 32.9 63.3 Q 37.1 69.4 41.7 73.8 Z', from: 5 },
        { tone: 'seedhead-light', d: 'M 39.8 58.1 C 40.2 57.7 41.3 56 42 55.9 C 42.7 55.8 43.9 57.4 44.3 57.7 L 44.5 57.3 C 44.1 57 42.9 55.1 42 55 C 41.1 54.9 39.5 56.6 39 56.9 Z', from: 5 }
      ]
    },
    cucumber: {
      trunk: 'M 28 96 Q 29 83 28.5 70 L 31.5 70 Q 31 83 32 96 Z',
      trunkShort: 'M 28.3 96 Q 29.2 90 28.7 84 L 31.3 84 Q 30.9 90 31.7 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[40, 82], [20, 78], [30, 60], [16, 66], [44, 68], [30, 70], [24, 50], [38, 48], [30, 44]],
      parts: [
        { tone: 'wood-light', d: 'M 23.4 95 L 24.6 95 L 26.6 80 L 25.8 80 Z M 35.4 95 L 36.6 95 L 34.2 80 L 33.4 80 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 28.3 96 Q 29.2 90 28.7 84 L 31.3 84 Q 30.9 90 31.7 96 Z', from: 2, to: 2 },
        { tone: 'stemdark', d: 'M 30.3 96 Q 30.5 90 30.1 84 L 31.3 84 Q 30.9 90 31.7 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 16 81.4 C 16.3 80.6 17.9 80.2 18.4 79.5 C 18.9 78.8 18.4 77.6 18.9 77.2 C 19.4 76.9 20.7 77.6 21.5 77.6 C 22.4 77.5 23.2 76.7 24 76.9 C 24.8 77 25.8 77.8 26.3 78.3 C 26.9 78.9 26.8 79.4 27.3 80 C 27.9 80.6 29.3 81.3 29.5 81.9 C 29.7 82.5 28.7 83.1 28.7 83.7 C 28.7 84.3 29.6 85 29.4 85.4 C 29.1 85.7 27.5 85.3 27.4 85.6 C 27.3 85.9 28.8 86.7 28.8 87.1 C 28.7 87.4 27.5 87.5 27.2 87.9 C 26.8 88.4 27.2 89.5 26.6 89.8 C 26.1 90.1 24.5 89.7 23.7 89.9 C 23 90 22.7 90.4 21.9 90.5 C 21.2 90.5 19.9 90.5 19.2 90.1 C 18.5 89.7 18.3 88.6 17.7 88 C 17.1 87.4 15.7 87.1 15.5 86.5 C 15.3 86 16.5 85.4 16.6 84.5 C 16.7 83.7 15.6 82.3 16 81.4 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 16.3 81 C 16.6 80.3 18 80 18.4 79.4 C 18.8 78.8 18.4 77.8 18.8 77.5 C 19.3 77.3 20.3 77.8 21 77.8 C 21.7 77.7 22.4 77.1 23.1 77.2 C 23.8 77.3 24.6 78 25.1 78.5 C 25.5 78.9 25.5 79.3 25.9 79.8 C 26.3 80.3 27.5 80.9 27.7 81.4 C 27.9 82 27.1 82.5 27 82.9 C 27 83.4 27.8 84.1 27.6 84.3 C 27.4 84.6 26 84.3 25.9 84.5 C 25.8 84.8 27.1 85.4 27.1 85.8 C 27.1 86.1 26.1 86.1 25.8 86.5 C 25.5 86.9 25.8 87.8 25.3 88.1 C 24.8 88.3 23.5 88 22.9 88.1 C 22.2 88.2 22 88.6 21.4 88.6 C 20.7 88.7 19.6 88.7 19 88.3 C 18.5 88 18.3 87.1 17.8 86.6 C 17.3 86.1 16.1 85.8 16 85.3 C 15.8 84.9 16.8 84.4 16.9 83.7 C 16.9 82.9 16.1 81.8 16.3 81 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.3 86.3 Q 26.8 84.8 23.9 84.3 Q 26.4 85.8 29.3 86.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 43.6 79.6 C 43.9 80.4 42.9 81.7 43 82.5 C 43.1 83.3 44.2 83.8 44 84.4 C 43.8 84.9 42.5 85.2 41.9 85.7 C 41.4 86.3 41.2 87.3 40.6 87.7 C 39.9 88.1 38.7 88.1 38 88 C 37.3 88 37 87.6 36.3 87.5 C 35.6 87.4 34.1 87.7 33.6 87.4 C 33.1 87.1 33.4 86.1 33.1 85.6 C 32.8 85.2 31.7 85.2 31.6 84.8 C 31.6 84.5 33 83.7 32.9 83.5 C 32.8 83.2 31.3 83.6 31.1 83.3 C 30.8 83 31.7 82.2 31.7 81.7 C 31.7 81.2 30.7 80.6 30.9 80 C 31.1 79.5 32.5 78.8 33 78.3 C 33.5 77.7 33.4 77.2 33.9 76.7 C 34.4 76.2 35.3 75.5 36.1 75.3 C 36.8 75.2 37.6 75.9 38.4 76 C 39.2 76 40.3 75.4 40.8 75.7 C 41.3 76 40.8 77.1 41.3 77.8 C 41.7 78.4 43.3 78.8 43.6 79.6 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 41.8 79.2 C 42.1 79.9 41.3 81 41.3 81.7 C 41.4 82.3 42.3 82.8 42.2 83.3 C 42 83.7 40.9 83.9 40.4 84.4 C 40 84.8 39.9 85.7 39.3 86 C 38.8 86.4 37.7 86.4 37.2 86.3 C 36.6 86.3 36.3 85.9 35.7 85.8 C 35.1 85.8 33.9 86.1 33.5 85.8 C 33 85.5 33.3 84.7 33 84.3 C 32.8 84 31.8 84 31.8 83.7 C 31.8 83.3 33 82.7 32.9 82.5 C 32.8 82.3 31.5 82.6 31.3 82.3 C 31.1 82.1 31.9 81.5 31.8 81 C 31.8 80.6 31 80.1 31.2 79.6 C 31.4 79.1 32.5 78.6 32.9 78.1 C 33.3 77.6 33.3 77.2 33.7 76.8 C 34.1 76.4 34.9 75.8 35.5 75.7 C 36.2 75.6 36.8 76.2 37.5 76.2 C 38.1 76.3 39.1 75.7 39.5 76 C 39.9 76.2 39.5 77.2 39.9 77.7 C 40.3 78.2 41.6 78.6 41.8 79.2 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 31.1 84.1 Q 33.8 83.7 36.1 82.3 Q 33.5 82.8 31.1 84.1 Z', from: 2, to: 2 },
        { tone: 'wood-light', d: 'M 23.4 95 L 24.6 95 L 26.6 64 L 25.8 64 Z M 35.4 95 L 36.6 95 L 34.2 64 L 33.4 64 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 28 96 Q 29 83 28.5 70 L 31.5 70 Q 31 83 32 96 Z', from: 3, to: 3 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.6 83 30.2 70 L 31.5 70 Q 31 83 32 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 13 79.1 C 13.4 78.1 15.3 77.6 15.8 76.9 C 16.4 76.1 15.8 74.7 16.4 74.3 C 17 74 18.4 74.8 19.3 74.7 C 20.3 74.6 21.2 73.8 22.1 73.9 C 23 74.1 24.1 75 24.8 75.6 C 25.4 76.2 25.3 76.8 25.9 77.5 C 26.5 78.1 28.1 78.9 28.4 79.6 C 28.6 80.3 27.5 81 27.5 81.6 C 27.4 82.3 28.5 83.2 28.2 83.5 C 28 83.9 26.1 83.5 26 83.8 C 25.8 84.1 27.6 85 27.5 85.5 C 27.5 85.9 26.1 85.9 25.7 86.4 C 25.3 86.9 25.8 88.2 25.1 88.6 C 24.5 88.9 22.7 88.5 21.8 88.6 C 20.9 88.8 20.6 89.3 19.8 89.3 C 18.9 89.4 17.5 89.4 16.7 88.9 C 15.9 88.5 15.7 87.2 15 86.5 C 14.3 85.8 12.7 85.5 12.5 84.9 C 12.3 84.2 13.6 83.6 13.7 82.6 C 13.8 81.6 12.7 80.1 13 79.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 13.4 78.7 C 13.7 77.9 15.3 77.4 15.8 76.8 C 16.3 76.1 15.8 75 16.3 74.7 C 16.8 74.4 17.9 75 18.7 75 C 19.6 74.9 20.3 74.2 21.1 74.3 C 21.9 74.4 22.8 75.2 23.3 75.7 C 23.9 76.2 23.8 76.7 24.3 77.3 C 24.8 77.8 26.1 78.5 26.4 79.1 C 26.6 79.7 25.6 80.2 25.6 80.8 C 25.6 81.3 26.4 82.1 26.2 82.4 C 26 82.7 24.4 82.3 24.3 82.6 C 24.2 82.9 25.7 83.6 25.6 84 C 25.6 84.4 24.5 84.4 24.1 84.8 C 23.8 85.3 24.2 86.3 23.6 86.6 C 23.1 86.9 21.6 86.6 20.9 86.7 C 20.1 86.8 19.9 87.2 19.1 87.3 C 18.4 87.3 17.2 87.3 16.5 86.9 C 15.9 86.5 15.7 85.5 15.1 84.9 C 14.6 84.3 13.2 84.1 13 83.5 C 12.9 83 14 82.4 14 81.6 C 14.1 80.8 13.2 79.5 13.4 78.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 28.1 84.6 Q 25.3 82.9 22.1 82.4 Q 24.9 84.1 28.1 84.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 46.5 75.3 C 46.8 76.2 45.8 77.7 45.8 78.6 C 45.9 79.5 47.2 80.1 47 80.7 C 46.8 81.3 45.3 81.6 44.6 82.2 C 44 82.9 43.8 84.1 43.1 84.5 C 42.3 85 41 84.9 40.2 84.9 C 39.3 84.9 39 84.4 38.2 84.2 C 37.4 84.1 35.7 84.5 35.1 84.2 C 34.5 83.8 34.9 82.7 34.6 82.2 C 34.2 81.7 32.9 81.7 32.9 81.3 C 32.8 80.8 34.4 80 34.3 79.7 C 34.2 79.4 32.4 79.8 32.2 79.5 C 32 79.1 32.9 78.3 32.9 77.7 C 32.9 77 31.8 76.4 32.1 75.8 C 32.3 75.1 33.8 74.4 34.4 73.7 C 34.9 73.1 34.9 72.5 35.4 72 C 36 71.4 37.1 70.5 37.9 70.4 C 38.8 70.2 39.7 71.1 40.6 71.1 C 41.5 71.2 42.8 70.5 43.4 70.8 C 43.9 71.1 43.4 72.4 43.9 73.2 C 44.4 73.9 46.2 74.4 46.5 75.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 44.5 74.9 C 44.8 75.6 43.9 76.9 44 77.6 C 44 78.4 45.1 78.9 44.9 79.4 C 44.7 79.9 43.5 80.2 42.9 80.7 C 42.4 81.3 42.3 82.3 41.6 82.6 C 41 83 39.9 83 39.2 82.9 C 38.5 82.9 38.2 82.5 37.5 82.4 C 36.8 82.3 35.5 82.6 34.9 82.3 C 34.4 82.1 34.8 81.1 34.5 80.7 C 34.2 80.2 33.1 80.2 33.1 79.9 C 33 79.5 34.4 78.8 34.3 78.6 C 34.2 78.3 32.7 78.7 32.5 78.4 C 32.3 78.1 33.1 77.4 33.1 76.9 C 33.1 76.3 32.2 75.8 32.4 75.3 C 32.6 74.7 33.9 74.1 34.3 73.6 C 34.8 73 34.7 72.6 35.2 72.1 C 35.7 71.6 36.6 70.9 37.3 70.8 C 38 70.6 38.8 71.3 39.5 71.4 C 40.3 71.4 41.4 70.8 41.9 71.1 C 42.3 71.4 41.9 72.5 42.3 73.1 C 42.7 73.7 44.2 74.1 44.5 74.9 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 32.3 80.4 Q 35.3 79.9 38 78.4 Q 35 78.9 32.3 80.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 15.9 67.4 C 16.2 66.5 17.9 66.1 18.4 65.4 C 18.9 64.7 18.3 63.5 18.9 63.2 C 19.4 62.8 20.6 63.5 21.5 63.5 C 22.4 63.4 23.2 62.6 24 62.8 C 24.8 62.9 25.8 63.7 26.4 64.3 C 26.9 64.8 26.9 65.3 27.4 65.9 C 27.9 66.5 29.4 67.2 29.6 67.9 C 29.8 68.5 28.8 69.1 28.8 69.7 C 28.8 70.3 29.7 71.1 29.5 71.4 C 29.2 71.7 27.5 71.3 27.4 71.6 C 27.3 71.9 28.9 72.7 28.8 73.1 C 28.8 73.5 27.6 73.5 27.2 74 C 26.9 74.4 27.3 75.5 26.7 75.9 C 26.1 76.2 24.5 75.8 23.8 75.9 C 23 76 22.7 76.5 21.9 76.6 C 21.1 76.6 19.8 76.6 19.1 76.2 C 18.4 75.8 18.3 74.6 17.6 74 C 17 73.4 15.6 73.2 15.4 72.6 C 15.2 72 16.4 71.4 16.5 70.5 C 16.6 69.7 15.5 68.3 15.9 67.4 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 16.2 67 C 16.5 66.3 17.9 65.9 18.4 65.3 C 18.8 64.7 18.3 63.7 18.8 63.4 C 19.2 63.2 20.3 63.8 21 63.7 C 21.7 63.7 22.4 63 23.1 63.1 C 23.8 63.2 24.6 63.9 25.1 64.4 C 25.6 64.8 25.5 65.3 25.9 65.8 C 26.4 66.3 27.6 66.9 27.8 67.4 C 28 67.9 27.1 68.4 27.1 68.9 C 27.1 69.4 27.9 70.1 27.7 70.4 C 27.5 70.6 26.1 70.3 26 70.5 C 25.9 70.8 27.2 71.5 27.1 71.8 C 27.1 72.1 26.1 72.1 25.8 72.5 C 25.5 72.9 25.8 73.8 25.3 74.1 C 24.9 74.4 23.5 74.1 22.9 74.2 C 22.2 74.3 22 74.7 21.3 74.7 C 20.7 74.7 19.6 74.7 19 74.4 C 18.4 74 18.3 73.1 17.8 72.6 C 17.2 72.1 16 71.9 15.9 71.4 C 15.7 70.9 16.7 70.4 16.8 69.7 C 16.8 68.9 16 67.7 16.2 67 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.4 72.3 Q 26.8 70.8 23.9 70.3 Q 26.5 71.8 29.4 72.3 Z', from: 3, to: 3 },
        { tone: 'stemdark', d: 'M 39.8 80.1 C 40.2 80.1 41.5 80.2 42.2 79.9 C 42.9 79.6 43.7 79.1 44.2 78.5 C 44.6 77.9 44.9 77.1 44.9 76.4 C 44.9 75.8 44.7 75 44.3 74.5 C 43.9 73.9 43.3 73.5 42.7 73.3 C 42.1 73 41.4 73 40.8 73.1 C 40.2 73.2 39.6 73.5 39.2 73.8 C 38.8 74.2 38.6 74.7 38.5 75.2 C 38.4 75.6 38.4 76.2 38.6 76.6 C 38.8 77 39.2 77.3 39.5 77.5 C 39.9 77.7 40.3 77.8 40.7 77.8 C 41.1 77.8 41.5 77.6 41.7 77.4 C 42 77.2 42.2 76.9 42.2 76.7 C 42.3 76.5 42.2 76.1 42.2 76 L 41.8 76 C 41.8 76.1 41.8 76.4 41.8 76.5 C 41.7 76.7 41.6 76.8 41.4 76.9 C 41.2 77.1 41 77.1 40.7 77.1 C 40.5 77.1 40.1 77.1 39.9 76.9 C 39.7 76.8 39.4 76.5 39.3 76.3 C 39.2 76 39.2 75.7 39.3 75.4 C 39.4 75.1 39.5 74.7 39.8 74.5 C 40.1 74.3 40.5 74.1 41 74 C 41.4 74 41.9 74 42.3 74.2 C 42.7 74.4 43.1 74.7 43.4 75.1 C 43.6 75.4 43.8 75.9 43.7 76.4 C 43.7 76.8 43.5 77.3 43.2 77.7 C 42.9 78.1 42.4 78.5 41.8 78.7 C 41.2 78.8 40.1 78.7 39.7 78.7 Z', from: 3, to: 3 },
        { tone: 'wood-light', d: 'M 23.4 95 L 24.6 95 L 26.6 54 L 25.8 54 Z M 35.4 95 L 36.6 95 L 34.2 54 L 33.4 54 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 27.9 96 Q 29 77 28.4 58 L 31.6 58 Q 31.1 77 32.1 96 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.6 77 30.2 58 L 31.6 58 Q 31.1 77 32.1 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 11.5 76.9 C 11.9 75.9 13.9 75.4 14.5 74.6 C 15.1 73.7 14.5 72.3 15.1 71.9 C 15.7 71.5 17.2 72.3 18.2 72.3 C 19.2 72.2 20.2 71.3 21.2 71.4 C 22.2 71.6 23.3 72.6 24 73.2 C 24.7 73.8 24.6 74.5 25.2 75.2 C 25.8 75.9 27.5 76.7 27.8 77.5 C 28.1 78.2 26.9 78.9 26.8 79.6 C 26.8 80.3 27.9 81.3 27.6 81.6 C 27.4 82 25.4 81.6 25.2 81.9 C 25.1 82.2 26.9 83.2 26.9 83.7 C 26.9 84.1 25.4 84.1 25 84.7 C 24.6 85.2 25 86.6 24.4 87 C 23.7 87.3 21.8 86.9 20.9 87 C 19.9 87.2 19.6 87.7 18.7 87.8 C 17.8 87.8 16.3 87.8 15.4 87.3 C 14.6 86.8 14.4 85.5 13.7 84.8 C 12.9 84.1 11.3 83.7 11 83.1 C 10.8 82.4 12.2 81.7 12.3 80.6 C 12.4 79.6 11.2 77.9 11.5 76.9 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 12 76.5 C 12.3 75.6 14 75.2 14.5 74.5 C 15 73.8 14.5 72.6 15 72.2 C 15.5 71.9 16.8 72.6 17.6 72.5 C 18.5 72.5 19.3 71.7 20.1 71.9 C 20.9 72 21.9 72.8 22.5 73.3 C 23 73.9 22.9 74.4 23.5 75 C 24 75.6 25.4 76.3 25.7 76.9 C 25.9 77.5 24.9 78.1 24.9 78.7 C 24.8 79.3 25.8 80.1 25.5 80.4 C 25.3 80.7 23.6 80.4 23.5 80.6 C 23.4 80.9 24.9 81.7 24.9 82.1 C 24.9 82.5 23.7 82.5 23.3 83 C 23 83.4 23.4 84.6 22.8 84.9 C 22.2 85.2 20.6 84.8 19.9 84.9 C 19.1 85.1 18.8 85.5 18 85.6 C 17.3 85.6 16 85.6 15.3 85.2 C 14.6 84.8 14.4 83.7 13.8 83.1 C 13.2 82.5 11.8 82.2 11.6 81.6 C 11.4 81 12.6 80.4 12.6 79.6 C 12.7 78.7 11.7 77.3 12 76.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 27.6 82.7 Q 24.6 81 21.1 80.4 Q 24.1 82.2 27.6 82.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 48.1 73.1 C 48.4 74 47.3 75.6 47.4 76.6 C 47.4 77.6 48.8 78.3 48.6 78.9 C 48.4 79.6 46.8 79.9 46.1 80.6 C 45.4 81.2 45.2 82.5 44.4 83 C 43.6 83.5 42.1 83.5 41.2 83.4 C 40.4 83.4 40.1 82.8 39.1 82.7 C 38.2 82.6 36.5 83 35.8 82.6 C 35.2 82.3 35.6 81 35.2 80.5 C 34.8 80 33.4 79.9 33.4 79.5 C 33.4 79.1 35.1 78.1 35 77.8 C 34.9 77.5 33 77.9 32.7 77.6 C 32.4 77.2 33.5 76.3 33.5 75.6 C 33.4 75 32.3 74.3 32.5 73.6 C 32.8 72.9 34.4 72.1 35 71.4 C 35.6 70.7 35.5 70.1 36.2 69.5 C 36.8 68.9 37.9 68 38.9 67.8 C 39.8 67.7 40.7 68.5 41.7 68.6 C 42.7 68.7 44.1 67.9 44.7 68.3 C 45.3 68.6 44.7 70 45.2 70.8 C 45.8 71.6 47.7 72.1 48.1 73.1 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 45.9 72.6 C 46.2 73.4 45.3 74.8 45.3 75.6 C 45.4 76.4 46.5 77 46.3 77.5 C 46.2 78.1 44.8 78.4 44.2 78.9 C 43.6 79.5 43.5 80.6 42.8 81 C 42.2 81.4 40.9 81.4 40.2 81.3 C 39.5 81.3 39.2 80.8 38.4 80.7 C 37.7 80.6 36.2 81 35.6 80.7 C 35.1 80.4 35.5 79.3 35.1 78.9 C 34.8 78.4 33.6 78.4 33.6 78 C 33.6 77.7 35 76.9 34.9 76.6 C 34.8 76.3 33.2 76.7 33 76.4 C 32.8 76.1 33.7 75.3 33.7 74.8 C 33.6 74.2 32.7 73.7 32.9 73.1 C 33.1 72.5 34.5 71.8 35 71.2 C 35.5 70.7 35.4 70.1 35.9 69.6 C 36.5 69.1 37.4 68.3 38.2 68.2 C 39 68.1 39.8 68.8 40.6 68.9 C 41.4 68.9 42.6 68.3 43.1 68.6 C 43.6 68.9 43.1 70 43.6 70.7 C 44 71.4 45.6 71.8 45.9 72.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 32.8 78.6 Q 36.1 78.1 38.9 76.4 Q 35.6 76.9 32.8 78.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 13.3 63.2 C 13.6 62.3 15.5 61.8 16 61 C 16.5 60.3 16 59 16.5 58.6 C 17.1 58.3 18.4 59 19.4 59 C 20.3 58.9 21.2 58.1 22.1 58.2 C 23 58.3 24 59.3 24.6 59.8 C 25.3 60.4 25.2 61 25.7 61.6 C 26.3 62.3 27.9 63 28.1 63.7 C 28.4 64.4 27.3 65 27.2 65.7 C 27.2 66.3 28.2 67.1 28 67.5 C 27.7 67.8 25.9 67.4 25.8 67.7 C 25.7 68 27.3 68.9 27.3 69.3 C 27.3 69.8 25.9 69.8 25.6 70.3 C 25.2 70.8 25.6 72 25 72.3 C 24.4 72.7 22.7 72.3 21.8 72.4 C 21 72.5 20.7 73 19.8 73.1 C 19 73.1 17.6 73.1 16.8 72.7 C 16.1 72.2 15.9 71 15.2 70.4 C 14.6 69.7 13 69.4 12.8 68.8 C 12.6 68.2 13.9 67.5 14 66.6 C 14.1 65.7 13 64.1 13.3 63.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 13.7 62.8 C 14 62 15.5 61.6 16 61 C 16.4 60.3 16 59.2 16.4 58.9 C 16.9 58.6 18 59.3 18.8 59.2 C 19.6 59.2 20.4 58.5 21.1 58.6 C 21.8 58.7 22.7 59.5 23.2 59.9 C 23.8 60.4 23.7 60.9 24.2 61.4 C 24.7 62 26 62.6 26.2 63.2 C 26.4 63.8 25.4 64.3 25.4 64.8 C 25.4 65.4 26.2 66.1 26 66.4 C 25.8 66.7 24.3 66.3 24.2 66.6 C 24.1 66.8 25.5 67.6 25.5 67.9 C 25.4 68.3 24.3 68.3 24 68.7 C 23.7 69.1 24.1 70.2 23.5 70.5 C 23 70.7 21.6 70.4 20.9 70.5 C 20.1 70.6 19.9 71 19.2 71.1 C 18.5 71.1 17.3 71.1 16.7 70.7 C 16 70.4 15.9 69.3 15.3 68.8 C 14.8 68.2 13.5 68 13.3 67.5 C 13.2 66.9 14.2 66.4 14.3 65.6 C 14.4 64.8 13.4 63.6 13.7 62.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 27.9 68.5 Q 25.1 66.9 22 66.4 Q 24.8 68 27.9 68.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 46.3 57.3 C 46.6 58.2 45.6 59.7 45.7 60.6 C 45.8 61.4 47 62.1 46.8 62.6 C 46.6 63.2 45.1 63.5 44.5 64.1 C 43.9 64.8 43.7 65.9 43 66.4 C 42.2 66.8 40.9 66.8 40.1 66.7 C 39.3 66.7 39 66.2 38.2 66.1 C 37.4 66 35.8 66.4 35.2 66 C 34.6 65.7 35 64.5 34.7 64.1 C 34.3 63.6 33.1 63.6 33 63.2 C 33 62.8 34.6 61.9 34.5 61.7 C 34.3 61.4 32.6 61.7 32.4 61.4 C 32.1 61.1 33.1 60.3 33.1 59.7 C 33 59.1 32 58.5 32.2 57.8 C 32.5 57.2 33.9 56.4 34.5 55.8 C 35 55.2 35 54.7 35.5 54.1 C 36.1 53.6 37.1 52.7 38 52.6 C 38.8 52.4 39.7 53.2 40.5 53.3 C 41.4 53.4 42.7 52.6 43.2 53 C 43.8 53.3 43.2 54.6 43.8 55.3 C 44.3 56 46 56.5 46.3 57.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 44.4 56.9 C 44.7 57.7 43.8 58.9 43.8 59.6 C 43.9 60.4 44.9 60.9 44.8 61.4 C 44.6 61.9 43.4 62.1 42.8 62.7 C 42.3 63.2 42.2 64.1 41.6 64.5 C 41 64.9 39.8 64.9 39.2 64.8 C 38.5 64.8 38.3 64.4 37.6 64.3 C 36.9 64.2 35.5 64.5 35 64.2 C 34.6 64 34.9 63 34.6 62.6 C 34.3 62.2 33.2 62.2 33.2 61.8 C 33.2 61.5 34.5 60.8 34.4 60.6 C 34.3 60.3 32.9 60.6 32.7 60.4 C 32.5 60.1 33.3 59.4 33.2 58.9 C 33.2 58.4 32.3 57.9 32.5 57.3 C 32.7 56.8 34 56.2 34.4 55.7 C 34.9 55.2 34.8 54.7 35.3 54.2 C 35.8 53.8 36.7 53.1 37.4 52.9 C 38.1 52.8 38.8 53.5 39.5 53.5 C 40.3 53.6 41.3 53 41.8 53.3 C 42.2 53.5 41.8 54.6 42.2 55.2 C 42.7 55.8 44.1 56.2 44.4 56.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 32.5 62.4 Q 35.4 61.9 38 60.4 Q 35.1 60.9 32.5 62.4 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 42.7 74.5 C 43.1 74.4 44.5 74.5 45.3 74.2 C 46.1 74 47 73.4 47.4 72.7 C 47.9 72.1 48.2 71.2 48.3 70.5 C 48.3 69.7 48 68.9 47.6 68.3 C 47.2 67.8 46.5 67.3 45.9 67 C 45.2 66.8 44.4 66.7 43.8 66.8 C 43.2 66.9 42.5 67.3 42.1 67.7 C 41.7 68 41.3 68.6 41.2 69.1 C 41.1 69.6 41.2 70.2 41.4 70.6 C 41.6 71 42 71.4 42.4 71.6 C 42.8 71.8 43.3 71.9 43.7 71.9 C 44.1 71.9 44.5 71.7 44.8 71.5 C 45 71.3 45.3 71 45.3 70.7 C 45.4 70.5 45.3 70.1 45.3 70 L 44.9 70 C 44.9 70.1 45 70.4 44.9 70.6 C 44.8 70.8 44.7 70.9 44.5 71.1 C 44.3 71.2 44 71.3 43.7 71.3 C 43.4 71.3 43 71.2 42.8 71 C 42.5 70.9 42.2 70.6 42.1 70.3 C 42 70 42 69.6 42.1 69.3 C 42.1 69 42.4 68.6 42.7 68.3 C 43 68.1 43.5 67.9 43.9 67.8 C 44.4 67.7 45 67.8 45.5 68 C 45.9 68.2 46.4 68.6 46.7 69 C 46.9 69.4 47.1 69.9 47.1 70.4 C 47 70.9 46.8 71.5 46.5 71.9 C 46.1 72.4 45.5 72.8 44.9 73 C 44.3 73.2 43 73.1 42.6 73.1 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 14.6 58.9 C 15 58.9 16.3 58.8 16.9 59 C 17.5 59.2 18.1 59.6 18.5 60.1 C 18.8 60.5 19 61.1 19.1 61.6 C 19.1 62.1 18.9 62.6 18.7 63 C 18.4 63.4 17.9 63.8 17.5 64 C 17 64.2 16.4 64.3 15.9 64.2 C 15.5 64.1 15 63.9 14.7 63.7 C 14.4 63.4 14.1 63 14.1 62.7 C 14 62.4 14 62 14.1 61.7 C 14.2 61.4 14.5 61.1 14.8 61 C 15 60.8 15.4 60.7 15.7 60.7 C 16 60.7 16.3 60.8 16.5 60.9 C 16.7 61.1 16.8 61.2 16.9 61.4 C 17 61.6 16.9 61.9 16.9 62 L 17.3 62 C 17.3 61.9 17.4 61.5 17.3 61.3 C 17.3 61 17 60.7 16.8 60.5 C 16.5 60.3 16.1 60.1 15.7 60.1 C 15.3 60.1 14.8 60.2 14.4 60.4 C 14 60.6 13.6 61 13.4 61.4 C 13.2 61.8 13.1 62.4 13.2 62.9 C 13.3 63.4 13.7 64 14.1 64.3 C 14.5 64.7 15.2 65.1 15.8 65.2 C 16.4 65.3 17.2 65.2 17.9 65 C 18.5 64.7 19.2 64.2 19.6 63.7 C 20 63.1 20.3 62.3 20.3 61.5 C 20.2 60.8 19.9 59.9 19.4 59.3 C 19 58.6 18.1 58 17.3 57.8 C 16.5 57.5 15.1 57.6 14.7 57.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34.5 68.8 Q 35 70.2 35.6 71.6 L 34.3 72.1 Q 33.5 70.9 32.9 69.5 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 43.4 90.8 C 43 91 42.3 90.7 41.7 90.3 C 41.1 89.9 40.4 89.2 39.7 88.5 C 39.1 87.7 38.4 86.9 37.7 85.9 C 37 84.9 36.3 83.7 35.8 82.4 C 35.2 81.2 34.8 79.8 34.5 78.7 C 34.2 77.5 34 76.4 33.9 75.4 C 33.8 74.5 33.8 73.5 33.9 72.8 C 34 72.1 34.2 71.4 34.6 71.2 C 35 71 35.7 71.3 36.3 71.7 C 36.9 72.1 37.6 72.8 38.3 73.5 C 38.9 74.3 39.6 75.1 40.3 76.1 C 41 77.1 41.7 78.3 42.2 79.6 C 42.8 80.8 43.2 82.2 43.5 83.3 C 43.8 84.5 44 85.6 44.1 86.6 C 44.2 87.5 44.2 88.5 44.1 89.2 C 44 89.9 43.8 90.6 43.4 90.8 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 42.3 89.3 C 42 89.4 41.5 89.1 40.9 88.8 C 40.4 88.4 39.8 87.8 39.2 87.1 C 38.7 86.4 38.1 85.7 37.5 84.8 C 36.9 83.8 36.2 82.7 35.7 81.6 C 35.2 80.5 34.8 79.2 34.5 78.2 C 34.2 77.1 34.1 76.2 34 75.3 C 33.9 74.4 33.8 73.5 33.9 72.9 C 34 72.3 34.1 71.7 34.5 71.6 C 34.8 71.4 35.4 71.7 35.9 72 C 36.4 72.4 37 73.1 37.6 73.7 C 38.1 74.4 38.8 75.1 39.3 76 C 39.9 77 40.6 78.1 41.1 79.2 C 41.6 80.3 42 81.6 42.3 82.6 C 42.6 83.7 42.7 84.6 42.8 85.5 C 42.9 86.4 43 87.3 42.9 87.9 C 42.9 88.5 42.7 89.1 42.3 89.3 Z', from: 4, to: 4 },
        { tone: 'bloom', d: 'M 40.5 85.9 C 40.4 85.9 40.1 85.6 39.9 85.3 C 39.6 84.9 39.3 84.4 39 83.9 C 38.7 83.4 38.4 82.9 38.1 82.3 C 37.7 81.6 37.3 80.8 37 80.1 C 36.6 79.3 36.3 78.5 36.1 77.8 C 35.8 77.1 35.7 76.6 35.5 76 C 35.3 75.5 35.1 74.9 35 74.4 C 35 74 34.9 73.6 35 73.6 C 35.1 73.5 35.4 73.9 35.6 74.2 C 35.8 74.5 36.2 75.1 36.5 75.6 C 36.8 76.1 37.1 76.6 37.4 77.2 C 37.7 77.8 38.1 78.6 38.5 79.4 C 38.8 80.1 39.1 81 39.4 81.7 C 39.6 82.3 39.8 82.9 40 83.4 C 40.1 84 40.3 84.6 40.4 85 C 40.5 85.4 40.6 85.8 40.5 85.9 Z', from: 4, to: 4 },
        { tone: 'bloom', d: 'M 37.4 73.4 Q 40.1 80.7 43.8 87.6 Q 41.1 80.3 37.4 73.4 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 35.8 74.1 Q 38.5 81.5 42.1 88.4 Q 39.4 81 35.8 74.1 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 34 74.9 Q 36.7 82.2 40.3 89.2 Q 37.6 81.8 34 74.9 Z', from: 4, to: 4 },
        { tone: 'wood-light', d: 'M 23.4 95 L 24.6 95 L 26.6 46 L 25.8 46 Z M 35.4 95 L 36.6 95 L 34.2 46 L 33.4 46 Z', from: 5 },
        { tone: 'stem', d: 'M 27.8 96 Q 28.9 73 28.3 50 L 31.7 50 Q 31.1 73 32.2 96 Z', from: 5 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.6 73 30.2 50 L 31.7 50 Q 31.1 73 32.2 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 10.2 74.8 C 10.6 73.7 12.6 73.2 13.3 72.3 C 13.9 71.4 13.2 69.9 13.9 69.5 C 14.5 69.1 16.1 70 17.1 69.9 C 18.2 69.8 19.2 68.9 20.3 69.1 C 21.3 69.2 22.5 70.3 23.2 70.9 C 23.9 71.6 23.8 72.2 24.4 73 C 25.1 73.7 26.9 74.6 27.2 75.4 C 27.4 76.1 26.2 76.9 26.1 77.6 C 26.1 78.3 27.3 79.3 27 79.7 C 26.7 80.1 24.6 79.6 24.5 80 C 24.3 80.3 26.3 81.3 26.2 81.8 C 26.2 82.3 24.7 82.3 24.2 82.9 C 23.8 83.5 24.3 84.9 23.6 85.3 C 22.8 85.7 20.9 85.2 19.9 85.3 C 18.9 85.5 18.6 86.1 17.6 86.1 C 16.7 86.2 15.1 86.2 14.2 85.7 C 13.3 85.1 13.1 83.7 12.4 83 C 11.6 82.2 9.9 81.9 9.6 81.2 C 9.4 80.5 10.9 79.7 11 78.7 C 11 77.6 9.8 75.8 10.2 74.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 10.6 74.3 C 11 73.4 12.7 73 13.3 72.2 C 13.8 71.5 13.2 70.2 13.8 69.9 C 14.3 69.6 15.6 70.3 16.5 70.2 C 17.4 70.1 18.3 69.3 19.1 69.5 C 20 69.6 21 70.5 21.6 71.1 C 22.2 71.6 22.1 72.2 22.6 72.8 C 23.2 73.4 24.7 74.1 24.9 74.8 C 25.2 75.4 24.1 76.1 24.1 76.7 C 24 77.3 25 78.1 24.8 78.4 C 24.5 78.8 22.8 78.4 22.7 78.7 C 22.6 79 24.2 79.8 24.1 80.2 C 24.1 80.6 22.8 80.6 22.5 81.1 C 22.1 81.6 22.5 82.8 21.9 83.1 C 21.3 83.4 19.7 83.1 18.9 83.2 C 18 83.3 17.7 83.8 16.9 83.8 C 16.1 83.9 14.8 83.9 14 83.4 C 13.3 83 13.2 81.8 12.5 81.2 C 11.9 80.6 10.4 80.3 10.2 79.7 C 10 79.1 11.2 78.5 11.3 77.6 C 11.4 76.7 10.3 75.2 10.6 74.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 26.9 80.9 Q 23.8 79 20.2 78.4 Q 23.3 80.3 26.9 80.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 49.5 70.9 C 49.8 71.9 48.6 73.6 48.7 74.6 C 48.8 75.7 50.2 76.4 50 77.1 C 49.7 77.7 48.1 78.1 47.3 78.8 C 46.6 79.5 46.4 80.8 45.6 81.3 C 44.7 81.8 43.2 81.8 42.3 81.8 C 41.4 81.7 41.1 81.2 40.1 81 C 39.2 80.9 37.3 81.3 36.6 81 C 36 80.6 36.4 79.2 36 78.7 C 35.6 78.1 34.1 78.1 34.1 77.7 C 34.1 77.2 35.9 76.2 35.8 75.9 C 35.6 75.6 33.6 76 33.4 75.6 C 33.1 75.3 34.2 74.3 34.2 73.6 C 34.1 72.9 32.9 72.2 33.2 71.5 C 33.5 70.7 35.2 69.9 35.8 69.2 C 36.4 68.5 36.3 67.8 37 67.2 C 37.7 66.6 38.8 65.6 39.8 65.4 C 40.8 65.3 41.8 66.2 42.8 66.3 C 43.8 66.3 45.3 65.5 45.9 65.9 C 46.5 66.3 45.9 67.7 46.5 68.6 C 47.1 69.4 49.1 69.9 49.5 70.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 47.2 70.5 C 47.5 71.3 46.5 72.7 46.6 73.6 C 46.7 74.4 47.8 75 47.6 75.6 C 47.4 76.2 46 76.5 45.4 77.1 C 44.8 77.7 44.7 78.8 44 79.2 C 43.3 79.6 42 79.6 41.2 79.6 C 40.4 79.5 40.2 79.1 39.4 78.9 C 38.6 78.8 37 79.2 36.4 78.9 C 35.9 78.6 36.3 77.4 35.9 77 C 35.6 76.5 34.3 76.5 34.3 76.1 C 34.3 75.7 35.8 74.9 35.7 74.6 C 35.6 74.4 33.9 74.7 33.7 74.4 C 33.5 74.1 34.4 73.3 34.4 72.7 C 34.3 72.1 33.3 71.5 33.5 70.9 C 33.8 70.3 35.2 69.6 35.7 69 C 36.3 68.4 36.2 67.9 36.7 67.3 C 37.3 66.8 38.3 66 39.1 65.9 C 39.9 65.7 40.8 66.5 41.6 66.5 C 42.5 66.6 43.7 65.9 44.2 66.2 C 44.7 66.6 44.2 67.8 44.7 68.5 C 45.2 69.2 46.9 69.6 47.2 70.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33.4 76.7 Q 36.9 76.2 39.9 74.4 Q 36.4 75 33.4 76.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 11.9 61.1 C 12.3 60.1 14.2 59.6 14.8 58.8 C 15.3 58 14.7 56.6 15.3 56.3 C 15.9 55.9 17.3 56.7 18.3 56.6 C 19.3 56.5 20.2 55.7 21.1 55.8 C 22.1 56 23.2 56.9 23.8 57.5 C 24.5 58.1 24.4 58.7 25 59.4 C 25.6 60.1 27.2 60.9 27.5 61.6 C 27.7 62.3 26.6 63 26.5 63.6 C 26.5 64.3 27.6 65.2 27.3 65.6 C 27 65.9 25.1 65.5 25 65.8 C 24.9 66.1 26.6 67.1 26.6 67.5 C 26.6 67.9 25.2 68 24.8 68.5 C 24.4 69 24.8 70.3 24.2 70.6 C 23.5 71 21.8 70.6 20.9 70.7 C 19.9 70.8 19.6 71.4 18.8 71.4 C 17.9 71.5 16.4 71.5 15.6 71 C 14.8 70.5 14.6 69.2 13.9 68.6 C 13.2 67.9 11.6 67.6 11.4 66.9 C 11.2 66.3 12.6 65.6 12.6 64.6 C 12.7 63.6 11.6 62 11.9 61.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 12.4 60.6 C 12.7 59.8 14.3 59.4 14.7 58.7 C 15.2 58 14.7 56.9 15.2 56.6 C 15.7 56.3 16.9 56.9 17.7 56.9 C 18.5 56.8 19.3 56.1 20.1 56.2 C 20.9 56.3 21.8 57.1 22.4 57.6 C 22.9 58.1 22.8 58.7 23.3 59.2 C 23.8 59.8 25.2 60.5 25.4 61.1 C 25.6 61.7 24.7 62.2 24.6 62.8 C 24.6 63.3 25.5 64.1 25.3 64.4 C 25.1 64.7 23.5 64.3 23.4 64.6 C 23.3 64.9 24.7 65.7 24.7 66 C 24.7 66.4 23.5 66.4 23.2 66.9 C 22.8 67.3 23.2 68.4 22.7 68.7 C 22.1 69 20.6 68.6 19.9 68.7 C 19.1 68.8 18.8 69.3 18.1 69.3 C 17.4 69.4 16.1 69.4 15.5 69 C 14.8 68.6 14.6 67.5 14.1 66.9 C 13.5 66.4 12.1 66.1 12 65.5 C 11.8 65 12.9 64.4 13 63.6 C 13 62.8 12.1 61.4 12.4 60.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 27.2 66.6 Q 24.4 64.9 21.1 64.4 Q 23.9 66.1 27.2 66.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 47.7 55.2 C 48 56.1 46.9 57.7 47 58.6 C 47.1 59.5 48.4 60.2 48.2 60.8 C 48 61.4 46.4 61.7 45.8 62.4 C 45.1 63 44.9 64.2 44.2 64.7 C 43.4 65.1 42 65.1 41.2 65.1 C 40.3 65 40 64.5 39.2 64.4 C 38.3 64.3 36.6 64.7 36 64.3 C 35.4 64 35.8 62.8 35.4 62.3 C 35.1 61.8 33.7 61.8 33.7 61.3 C 33.7 60.9 35.3 60 35.2 59.7 C 35.1 59.4 33.3 59.8 33 59.5 C 32.8 59.1 33.8 58.3 33.8 57.7 C 33.7 57 32.6 56.4 32.9 55.7 C 33.1 55 34.7 54.3 35.3 53.6 C 35.8 53 35.7 52.4 36.4 51.8 C 37 51.3 38 50.3 38.9 50.2 C 39.8 50.1 40.7 50.9 41.6 51 C 42.6 51 43.9 50.3 44.5 50.6 C 45 51 44.5 52.3 45 53 C 45.5 53.8 47.4 54.3 47.7 55.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 45.7 54.8 C 45.9 55.6 45 56.8 45.1 57.6 C 45.1 58.4 46.2 58.9 46.1 59.5 C 45.9 60 44.6 60.2 44 60.8 C 43.5 61.3 43.3 62.4 42.7 62.7 C 42.1 63.1 40.9 63.1 40.2 63.1 C 39.5 63 39.2 62.6 38.5 62.5 C 37.8 62.4 36.4 62.7 35.8 62.5 C 35.3 62.2 35.7 61.1 35.4 60.7 C 35 60.3 33.9 60.3 33.9 59.9 C 33.9 59.6 35.3 58.8 35.2 58.6 C 35.1 58.3 33.5 58.7 33.3 58.4 C 33.1 58.1 34 57.4 34 56.8 C 33.9 56.3 33 55.8 33.2 55.2 C 33.4 54.6 34.7 54 35.2 53.4 C 35.7 52.9 35.6 52.4 36.1 51.9 C 36.6 51.5 37.5 50.7 38.3 50.6 C 39 50.5 39.8 51.2 40.6 51.2 C 41.3 51.3 42.5 50.6 42.9 50.9 C 43.4 51.2 42.9 52.3 43.4 53 C 43.8 53.6 45.4 54 45.7 54.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33.1 60.5 Q 36.2 60 39 58.4 Q 35.9 58.9 33.1 60.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 21.3 42.7 C 22.2 42.4 23.7 43.4 24.6 43.3 C 25.4 43.2 26.1 42 26.6 42.2 C 27.2 42.4 27.5 43.9 28.1 44.5 C 28.8 45.1 29.9 45.3 30.4 46 C 30.8 46.8 30.8 48.1 30.7 48.9 C 30.7 49.7 30.2 50 30.1 50.8 C 30 51.6 30.4 53.2 30 53.8 C 29.7 54.4 28.5 54 28.1 54.3 C 27.6 54.7 27.6 55.9 27.2 56 C 26.8 56 25.9 54.4 25.7 54.5 C 25.4 54.7 25.7 56.4 25.4 56.6 C 25.1 56.9 24.3 55.9 23.7 55.9 C 23.1 56 22.5 57 21.8 56.8 C 21.2 56.5 20.4 55.1 19.8 54.5 C 19.2 54 18.7 54 18.1 53.5 C 17.6 52.9 16.7 51.9 16.6 51 C 16.4 50.2 17.2 49.3 17.3 48.5 C 17.4 47.6 16.6 46.3 17 45.8 C 17.3 45.2 18.6 45.8 19.3 45.2 C 20 44.7 20.5 43 21.3 42.7 Z', from: 5 },
        { tone: 'stemlight', d: 'M 21 43 C 21.7 42.7 23 43.6 23.7 43.6 C 24.4 43.5 25 42.5 25.5 42.6 C 26 42.8 26.2 44 26.7 44.6 C 27.2 45.1 28.2 45.2 28.6 45.8 C 28.9 46.4 28.9 47.6 28.9 48.2 C 28.8 48.9 28.4 49.1 28.3 49.8 C 28.2 50.5 28.6 51.9 28.3 52.4 C 28 52.8 27 52.5 26.6 52.8 C 26.2 53.1 26.2 54.2 25.9 54.2 C 25.6 54.2 24.9 52.9 24.6 53 C 24.4 53.1 24.7 54.5 24.4 54.7 C 24.1 54.9 23.5 54.1 22.9 54.2 C 22.4 54.2 21.9 55.1 21.4 54.9 C 20.9 54.7 20.2 53.4 19.7 53 C 19.2 52.5 18.7 52.6 18.3 52.1 C 17.8 51.6 17.1 50.7 17 50 C 16.9 49.3 17.5 48.6 17.6 47.9 C 17.7 47.1 17 46.1 17.3 45.6 C 17.6 45.2 18.7 45.6 19.3 45.2 C 19.9 44.7 20.2 43.3 21 43 Z', from: 5 },
        { tone: 'stemshade', d: 'M 26.4 56.5 Q 25.9 53.6 24.4 51 Q 24.9 53.9 26.4 56.5 Z', from: 5 },
        { tone: 'stemdark', d: 'M 43.6 66.6 C 44.1 66.6 45.5 66.7 46.4 66.4 C 47.2 66.1 48.1 65.5 48.6 64.8 C 49.1 64.2 49.4 63.3 49.4 62.5 C 49.4 61.7 49.1 60.9 48.7 60.3 C 48.3 59.7 47.6 59.2 46.9 58.9 C 46.3 58.7 45.4 58.6 44.8 58.7 C 44.1 58.8 43.5 59.2 43 59.6 C 42.6 60 42.2 60.6 42.1 61.1 C 42 61.6 42.1 62.2 42.3 62.6 C 42.5 63.1 43 63.5 43.3 63.7 C 43.7 63.9 44.3 64 44.7 64 C 45.1 64 45.5 63.8 45.8 63.6 C 46.1 63.4 46.3 63 46.4 62.8 C 46.5 62.5 46.4 62.1 46.4 62 L 45.9 62 C 45.9 62.1 46 62.4 45.9 62.6 C 45.9 62.8 45.7 63 45.5 63.1 C 45.3 63.3 45 63.4 44.7 63.4 C 44.4 63.4 44 63.3 43.7 63.1 C 43.4 62.9 43.2 62.6 43 62.3 C 42.9 62 42.9 61.6 42.9 61.3 C 43 60.9 43.3 60.5 43.6 60.3 C 43.9 60 44.4 59.7 44.9 59.7 C 45.4 59.6 46.1 59.7 46.5 59.9 C 47 60.1 47.5 60.5 47.8 60.9 C 48.1 61.3 48.3 61.9 48.2 62.4 C 48.2 63 48 63.6 47.6 64 C 47.2 64.5 46.6 64.9 45.9 65.1 C 45.3 65.3 43.9 65.2 43.5 65.2 Z', from: 5 },
        { tone: 'stemdark', d: 'M 13.5 50.8 C 13.9 50.8 15.3 50.7 15.9 50.9 C 16.6 51.1 17.2 51.5 17.6 52 C 18 52.4 18.2 53 18.2 53.6 C 18.3 54.1 18.1 54.7 17.8 55.1 C 17.5 55.5 17 55.9 16.5 56.1 C 16.1 56.3 15.4 56.4 14.9 56.3 C 14.4 56.3 13.9 56 13.6 55.7 C 13.3 55.5 13 55.1 12.9 54.7 C 12.9 54.4 12.9 54 13 53.7 C 13.2 53.4 13.4 53.1 13.7 52.9 C 14 52.7 14.4 52.6 14.7 52.6 C 15 52.6 15.3 52.7 15.5 52.9 C 15.7 53 15.9 53.2 15.9 53.4 C 16 53.6 15.9 53.9 15.9 54 L 16.4 54 C 16.4 53.9 16.5 53.5 16.4 53.2 C 16.3 53 16.1 52.6 15.8 52.4 C 15.5 52.2 15.1 52 14.7 52 C 14.3 52 13.7 52.1 13.3 52.3 C 13 52.5 12.5 52.9 12.3 53.4 C 12.1 53.8 12 54.4 12.1 54.9 C 12.2 55.4 12.6 56 13 56.4 C 13.5 56.8 14.1 57.2 14.8 57.3 C 15.4 57.4 16.3 57.3 16.9 57.1 C 17.6 56.8 18.3 56.3 18.7 55.7 C 19.1 55.1 19.4 54.3 19.4 53.5 C 19.4 52.7 19.1 51.8 18.6 51.2 C 18.1 50.5 17.2 49.9 16.4 49.6 C 15.5 49.3 14.1 49.4 13.6 49.4 Z', from: 5 },
        { tone: 'stemdark', d: 'M 39.8 50.1 C 40.2 50.1 41.5 50.2 42.2 49.9 C 42.9 49.6 43.7 49.1 44.2 48.5 C 44.6 47.9 44.9 47.1 44.9 46.4 C 44.9 45.8 44.7 45 44.3 44.5 C 43.9 43.9 43.3 43.5 42.7 43.3 C 42.1 43 41.4 43 40.8 43.1 C 40.2 43.2 39.6 43.5 39.2 43.8 C 38.8 44.2 38.6 44.7 38.5 45.2 C 38.4 45.6 38.4 46.2 38.6 46.6 C 38.8 47 39.2 47.3 39.5 47.5 C 39.9 47.7 40.3 47.8 40.7 47.8 C 41.1 47.8 41.5 47.6 41.7 47.4 C 42 47.2 42.2 46.9 42.2 46.7 C 42.3 46.5 42.2 46.1 42.2 46 L 41.8 46 C 41.8 46.1 41.8 46.4 41.8 46.5 C 41.7 46.7 41.6 46.8 41.4 46.9 C 41.2 47.1 41 47.1 40.7 47.1 C 40.5 47.1 40.1 47.1 39.9 46.9 C 39.7 46.8 39.4 46.5 39.3 46.3 C 39.2 46 39.2 45.7 39.3 45.4 C 39.4 45.1 39.5 44.7 39.8 44.5 C 40.1 44.3 40.5 44.1 41 44 C 41.4 44 41.9 44 42.3 44.2 C 42.7 44.4 43.1 44.7 43.4 45.1 C 43.6 45.4 43.8 45.9 43.7 46.4 C 43.7 46.8 43.5 47.3 43.2 47.7 C 42.9 48.1 42.4 48.5 41.8 48.7 C 41.2 48.8 40.1 48.7 39.7 48.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 35.7 66 Q 36.1 67.5 36.8 68.8 L 35.5 69.4 Q 34.7 68.2 34.1 66.8 Z', from: 5 },
        { tone: 'deep', d: 'M 46.2 89.6 C 45.7 89.8 45 89.5 44.4 89.1 C 43.7 88.7 42.9 87.9 42.2 87.2 C 41.4 86.4 40.6 85.5 39.9 84.4 C 39.1 83.3 38.2 82 37.6 80.7 C 37 79.3 36.4 77.8 36 76.6 C 35.6 75.3 35.4 74.1 35.3 73.1 C 35.1 72 35 70.9 35.1 70.1 C 35.2 69.3 35.4 68.6 35.8 68.4 C 36.3 68.2 37 68.5 37.6 68.9 C 38.3 69.3 39.1 70.1 39.8 70.8 C 40.6 71.6 41.4 72.5 42.1 73.6 C 42.9 74.7 43.8 76 44.4 77.3 C 45 78.7 45.6 80.2 46 81.4 C 46.4 82.7 46.6 83.9 46.7 84.9 C 46.9 86 47 87.1 46.9 87.9 C 46.8 88.7 46.6 89.4 46.2 89.6 Z', from: 5 },
        { tone: 'light', d: 'M 45 87.9 C 44.7 88.1 44.1 87.8 43.5 87.5 C 42.9 87.1 42.3 86.4 41.6 85.7 C 40.9 84.9 40.3 84.1 39.6 83.2 C 38.9 82.2 38.1 80.9 37.6 79.7 C 37 78.6 36.5 77.2 36.1 76 C 35.7 74.9 35.5 73.9 35.4 72.9 C 35.2 71.9 35.1 71 35.1 70.3 C 35.2 69.6 35.3 69 35.7 68.8 C 36 68.6 36.7 68.9 37.2 69.3 C 37.8 69.7 38.5 70.4 39.1 71.1 C 39.8 71.8 40.5 72.6 41.2 73.6 C 41.8 74.6 42.6 75.8 43.2 77 C 43.8 78.2 44.3 79.6 44.6 80.7 C 45 81.8 45.2 82.9 45.3 83.8 C 45.5 84.8 45.7 85.8 45.6 86.4 C 45.5 87.1 45.4 87.8 45 87.9 Z', from: 5 },
        { tone: 'bloom', d: 'M 42.9 84.3 C 42.8 84.3 42.5 84 42.2 83.6 C 41.9 83.3 41.6 82.7 41.2 82.1 C 40.9 81.6 40.5 81.1 40.1 80.4 C 39.7 79.7 39.3 78.8 38.9 78 C 38.5 77.2 38.1 76.3 37.8 75.6 C 37.5 74.8 37.3 74.2 37.1 73.6 C 36.9 73 36.6 72.4 36.5 71.9 C 36.4 71.5 36.3 71 36.4 71 C 36.5 71 36.8 71.3 37.1 71.7 C 37.4 72 37.7 72.6 38.1 73.1 C 38.4 73.7 38.8 74.2 39.2 74.9 C 39.5 75.6 40 76.5 40.4 77.3 C 40.8 78.1 41.2 79 41.5 79.7 C 41.8 80.5 42 81 42.2 81.6 C 42.4 82.3 42.7 82.9 42.8 83.3 C 42.9 83.8 43 84.2 42.9 84.3 Z', from: 5 },
        { tone: 'bloom', d: 'M 38.9 70.7 Q 42.2 78.7 46.4 86.1 Q 43.2 78.2 38.9 70.7 Z', from: 5 },
        { tone: 'base', d: 'M 37.2 71.6 Q 40.5 79.5 44.7 87 Q 41.4 79 37.2 71.6 Z', from: 5 },
        { tone: 'base', d: 'M 35.3 72.5 Q 38.6 80.4 42.8 87.9 Q 39.6 79.9 35.3 72.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 25.1 65.5 Q 24.3 66.8 23.7 68.1 L 22.4 67.6 Q 22.9 66.1 23.5 64.8 Z', from: 5 },
        { tone: 'deep', d: 'M 14.6 86.8 C 14.2 86.6 14 85.9 13.9 85.2 C 13.8 84.5 13.8 83.5 13.9 82.6 C 14 81.6 14.2 80.5 14.5 79.3 C 14.8 78.2 15.2 76.8 15.8 75.6 C 16.3 74.3 17 73.1 17.7 72.1 C 18.4 71.1 19.1 70.3 19.7 69.5 C 20.4 68.8 21.1 68.1 21.7 67.7 C 22.3 67.3 23 67 23.4 67.2 C 23.8 67.4 24 68.1 24.1 68.8 C 24.2 69.5 24.2 70.5 24.1 71.4 C 24 72.4 23.8 73.5 23.5 74.7 C 23.2 75.8 22.8 77.2 22.2 78.4 C 21.7 79.7 21 80.9 20.3 81.9 C 19.6 82.9 18.9 83.7 18.3 84.5 C 17.6 85.2 16.9 85.9 16.3 86.3 C 15.7 86.7 15 87 14.6 86.8 Z', from: 5 },
        { tone: 'light', d: 'M 14.5 85.3 C 14.1 85.1 14 84.5 13.9 83.9 C 13.8 83.3 13.9 82.4 14 81.5 C 14.1 80.6 14.2 79.7 14.5 78.6 C 14.8 77.6 15.2 76.3 15.7 75.2 C 16.2 74.1 16.9 73 17.5 72 C 18.1 71.1 18.7 70.4 19.2 69.7 C 19.8 69.1 20.4 68.4 20.9 68 C 21.5 67.7 22 67.4 22.3 67.6 C 22.7 67.7 22.9 68.3 22.9 68.9 C 23 69.5 22.9 70.4 22.8 71.3 C 22.7 72.2 22.6 73.1 22.3 74.2 C 22 75.2 21.6 76.5 21.1 77.6 C 20.6 78.7 19.9 79.8 19.3 80.8 C 18.8 81.7 18.1 82.4 17.6 83.1 C 17 83.8 16.4 84.4 15.9 84.8 C 15.4 85.1 14.8 85.4 14.5 85.3 Z', from: 5 },
        { tone: 'bloom', d: 'M 15 81.9 C 14.9 81.8 15 81.4 15 81 C 15.1 80.6 15.3 80 15.5 79.4 C 15.7 78.9 15.8 78.3 16.1 77.7 C 16.3 77 16.6 76.1 17 75.4 C 17.3 74.6 17.7 73.8 18.1 73.2 C 18.4 72.6 18.7 72.1 19 71.6 C 19.3 71.1 19.6 70.5 19.9 70.2 C 20.1 69.9 20.4 69.5 20.5 69.6 C 20.6 69.6 20.5 70 20.4 70.4 C 20.3 70.9 20.1 71.5 20 72 C 19.8 72.6 19.6 73.1 19.4 73.8 C 19.1 74.5 18.8 75.3 18.5 76.1 C 18.1 76.8 17.7 77.6 17.4 78.3 C 17.1 78.9 16.8 79.4 16.5 79.9 C 16.2 80.4 15.8 80.9 15.6 81.3 C 15.4 81.6 15.1 81.9 15 81.9 Z', from: 5 },
        { tone: 'bloom', d: 'M 23.6 70.7 Q 20 77.6 17.3 85 Q 20.9 78.1 23.6 70.7 Z', from: 5 },
        { tone: 'base', d: 'M 22 70 Q 18.3 76.9 15.6 84.2 Q 19.2 77.3 22 70 Z', from: 5 },
        { tone: 'base', d: 'M 20.2 69.2 Q 16.5 76.1 13.8 83.5 Q 17.5 76.5 20.2 69.2 Z', from: 5 }
      ]
    },
    dragonfruit: {
      trunk: 'M 27.4 96 Q 28.7 74 27.8 52 L 32.2 52 Q 31.3 74 32.6 96 Z',
      trunkShort: 'M 27.6 96 Q 28.8 85 28 74 L 32 74 Q 31.2 85 32.4 96 Z',
      trunkTone: 'wood',
      blossoms: [[18, 64], [42, 68], [30, 52], [22, 78], [38, 78], [30, 62], [14, 74], [46, 74], [30, 44]],
      parts: [
        { tone: 'wood', d: 'M 27.6 96 Q 28.8 85 28 74 L 32 74 Q 31.2 85 32.4 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.4 96 Q 30.7 85 30.2 74 L 32 74 Q 31.2 85 32.4 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 32.2 77.7 Q 25.5 82 22.6 89.2 L 19.4 86.8 Q 21.7 79.1 27.8 74.3 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 31.2 77.2 Q 24.7 81.6 21.8 88.8 L 19.5 87.2 Q 22 79.6 28.1 74.8 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 28.9 76.3 Q 22.6 81 19.7 88.3 L 19 87.7 Q 21.8 80.5 28 75.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.8 76.2 Q 24.7 81 21.9 88.2 L 21.4 87.8 Q 24.2 80.6 30.3 75.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 32 74.2 Q 37.4 78.4 40.4 84.7 L 37.6 87.3 Q 34 81.5 28 77.8 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 31.1 74.7 Q 36.6 78.8 39.6 85.1 L 37.6 86.9 Q 34.2 80.9 28.2 77.3 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 28.9 75.6 Q 34.7 79.4 37.7 85.7 L 37.1 86.3 Q 34 80 28.1 76.4 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.8 75.8 Q 36.8 79.5 39.8 85.8 L 39.4 86.2 Q 36.3 79.9 30.3 76.2 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 27.4 96 Q 28.7 74 27.8 52 L 32.2 52 Q 31.3 74 32.6 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.7 74 30.2 52 L 32.2 52 Q 31.3 74 32.6 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 32.9 55.3 Q 21.9 68.3 19.1 84.9 L 14.9 83.1 Q 16.9 66.1 27.1 52.7 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 31.7 54.9 Q 20.9 68 18.1 84.6 L 15.2 83.4 Q 17.4 66.5 27.6 53.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28.8 54.3 Q 18.4 67.6 15.5 84.2 L 14.6 83.8 Q 17.4 67.1 27.6 53.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31 54.2 Q 20.8 67.5 18.1 84.1 L 17.5 83.9 Q 20.2 67.3 30.3 53.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 32.8 52.7 Q 42.2 65.4 45 81.1 L 41 82.9 Q 37.3 67.6 27.2 55.3 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 31.6 53.1 Q 41.2 65.7 44.1 81.3 L 41.2 82.7 Q 37.8 67.2 27.7 54.9 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28.8 53.7 Q 38.8 66.1 41.6 81.8 L 40.7 82.2 Q 37.8 66.6 27.7 54.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31 53.8 Q 41.1 66.2 44 81.9 L 43.5 82.1 Q 40.5 66.5 30.3 54.2 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 32.7 54 Q 31.9 66 31.9 78 L 28.1 78 Q 27.3 66 27.3 54 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 31.5 54 Q 31 66 31 78 L 28.3 78 Q 27.8 66 27.8 54 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29 54 Q 28.8 66 28.8 78 L 28 78 Q 27.9 66 27.9 54 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.9 54 Q 30.9 66 30.9 78 L 30.4 78 Q 30.3 66 30.2 54 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 27.2 96 Q 28.6 70 27.8 44 L 32.2 44 Q 31.4 70 32.8 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.8 70 30.2 44 L 32.2 44 Q 31.4 70 32.8 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33.3 47.3 Q 20.2 64.1 17.3 84.9 L 12.7 83.1 Q 14.6 61.9 26.7 44.7 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 31.9 46.9 Q 19.1 63.8 16.3 84.6 L 13 83.4 Q 15.2 62.3 27.4 45.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 28.7 46.3 Q 16.3 63.3 13.4 84.2 L 12.4 83.8 Q 15.2 62.9 27.4 45.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.1 46.2 Q 18.9 63.3 16.2 84.1 L 15.5 83.9 Q 18.2 63 30.3 45.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33.1 44.7 Q 44.4 61.1 47.3 81.1 L 42.7 82.9 Q 39 63.4 26.9 47.3 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 31.8 45.1 Q 43.3 61.4 46.2 81.3 L 43.1 82.7 Q 39.6 63 27.4 46.9 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 28.7 45.7 Q 40.6 61.9 43.4 81.8 L 42.5 82.2 Q 39.5 62.4 27.5 46.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.1 45.8 Q 43.2 61.9 46.1 81.9 L 45.5 82.1 Q 42.5 62.2 30.3 46.2 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 32.9 46 Q 32.1 61 32.1 76 L 27.9 76 Q 27.1 61 27.1 46 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 31.7 46 Q 31.1 61 31.1 76 L 28.2 76 Q 27.6 61 27.6 46 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29 46 Q 28.8 61 28.7 76 L 27.8 76 Q 27.7 61 27.8 46 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.9 46 Q 30.9 61 31 76 L 30.4 76 Q 30.3 61 30.2 46 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 26.1 68 C 26.1 69 25.8 70.1 25.4 71 C 25 71.9 24.5 72.5 23.9 73.3 C 23.4 74 22.9 74.7 22.2 75.2 C 21.6 75.7 20.7 76.2 20 76.2 C 19.3 76.2 18.4 75.7 17.8 75.2 C 17.1 74.7 16.6 74 16.1 73.3 C 15.5 72.5 15 71.9 14.6 71 C 14.2 70.1 13.9 69 13.9 68 C 13.9 67 14.2 65.9 14.6 65 C 15 64.1 15.5 63.5 16.1 62.7 C 16.6 62 17.1 61.3 17.8 60.8 C 18.4 60.3 19.3 59.8 20 59.8 C 20.7 59.8 21.6 60.3 22.2 60.8 C 22.9 61.3 23.4 62 23.9 62.7 C 24.5 63.5 25 64.1 25.4 65 C 25.8 65.9 26.1 67 26.1 68 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 24.3 67.2 C 24.3 68.1 24 69 23.7 69.7 C 23.4 70.5 23 71 22.5 71.6 C 22.1 72.2 21.7 72.9 21.1 73.3 C 20.6 73.7 19.9 74.1 19.3 74.1 C 18.7 74.1 18 73.7 17.5 73.3 C 17 72.9 16.6 72.2 16.1 71.6 C 15.7 71 15.2 70.5 14.9 69.7 C 14.6 69 14.3 68.1 14.3 67.2 C 14.3 66.4 14.6 65.5 14.9 64.7 C 15.2 64 15.7 63.4 16.1 62.8 C 16.6 62.3 17 61.6 17.5 61.2 C 18 60.8 18.7 60.4 19.3 60.4 C 19.9 60.4 20.6 60.8 21.1 61.2 C 21.7 61.6 22.1 62.3 22.5 62.8 C 23 63.4 23.4 64 23.7 64.7 C 24 65.5 24.3 66.4 24.3 67.2 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 20 65.8 C 20 66.1 19.9 66.4 19.7 66.7 C 19.6 66.9 19.4 67.1 19.2 67.3 C 19.1 67.5 18.9 67.8 18.7 67.9 C 18.5 68.1 18.2 68.2 18 68.2 C 17.7 68.2 17.5 68.1 17.3 67.9 C 17 67.8 16.9 67.5 16.7 67.3 C 16.5 67.1 16.3 66.9 16.2 66.7 C 16.1 66.4 16 66.1 16 65.8 C 16 65.5 16.1 65.2 16.2 64.9 C 16.3 64.6 16.5 64.5 16.7 64.3 C 16.9 64 17 63.8 17.3 63.7 C 17.5 63.5 17.7 63.3 18 63.3 C 18.2 63.3 18.5 63.5 18.7 63.7 C 18.9 63.8 19.1 64 19.2 64.3 C 19.4 64.5 19.6 64.6 19.7 64.9 C 19.9 65.2 20 65.5 20 65.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 16.1 64.6 Q 12.6 64.6 10.5 67.8 Q 14 66.9 16.1 64.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 15.8 64.3 Q 13.1 64.6 11.1 67 Q 13.9 66.1 15.8 64.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 16.4 69.4 Q 13.8 67.1 10 68.2 Q 13.3 69.8 16.4 69.4 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 16.1 69.1 Q 13.9 67.5 10.8 68.1 Q 13.6 69.2 16.1 69.1 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 23.8 65.1 Q 25.5 68.2 29.4 68.4 Q 26.9 65.8 23.8 65.1 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 23.5 64.9 Q 25.1 67.1 28.2 67.6 Q 26 65.6 23.5 64.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 23.6 70 Q 26.8 71.3 30 68.9 Q 26.4 68.6 23.6 70 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 23.3 69.8 Q 26 70.5 28.7 68.8 Q 25.7 68.7 23.3 69.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 18.6 61.9 Q 16.7 58.6 12.5 57.8 Q 15.3 60.7 18.6 61.9 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 21.4 61.9 Q 24.6 60.9 26.1 57.5 Q 23 59.2 21.4 61.9 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 20 61.2 Q 21.4 59 20 56.4 Q 18.6 59 20 61.2 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 27 96 Q 28.5 67 27.8 38 L 32.2 38 Q 31.5 67 33 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.8 67 30.2 38 L 32.2 38 Q 31.5 67 33 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33.5 41.3 Q 18.9 60.9 16.5 84.9 L 11.5 83.1 Q 12.9 58.7 26.5 38.7 Z', from: 5 },
        { tone: 'stem', d: 'M 32.1 40.9 Q 17.7 60.6 15.4 84.6 L 11.9 83.4 Q 13.6 59.1 27.2 39.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.6 40.3 Q 14.7 60.1 12.3 84.2 L 11.3 83.8 Q 13.5 59.7 27.2 39.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.2 40.2 Q 17.5 60.1 15.2 84.1 L 14.5 83.9 Q 16.8 59.8 30.3 39.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33.4 38.7 Q 46 57.9 48.4 81.1 L 43.6 82.9 Q 40.2 60.1 26.6 41.3 Z', from: 5 },
        { tone: 'stem', d: 'M 32 39.1 Q 44.9 58.2 47.3 81.4 L 44 82.6 Q 40.9 59.8 27.3 40.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.7 39.7 Q 42 58.7 44.3 81.8 L 43.3 82.2 Q 40.9 59.1 27.3 40.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.1 39.8 Q 44.7 58.7 47.2 81.9 L 46.5 82.1 Q 44 59 30.3 40.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33 40 Q 32.2 57 32.2 74 L 27.8 74 Q 27 57 27 40 Z', from: 5 },
        { tone: 'stem', d: 'M 31.7 40 Q 31.1 57 31.1 74 L 28.1 74 Q 27.5 57 27.5 40 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.9 40 Q 28.7 57 28.6 74 L 27.8 74 Q 27.7 57 27.7 40 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31 40 Q 31 57 31 74 L 30.4 74 Q 30.3 57 30.2 40 Z', from: 5 },
        { tone: 'deep', d: 'M 24.7 62 C 24.7 63.1 24.3 64.3 23.9 65.3 C 23.5 66.2 22.8 66.9 22.3 67.7 C 21.7 68.5 21.1 69.3 20.4 69.9 C 19.7 70.4 18.8 70.9 18 70.9 C 17.2 70.9 16.3 70.4 15.6 69.9 C 14.9 69.3 14.3 68.5 13.7 67.7 C 13.2 66.9 12.5 66.2 12.1 65.3 C 11.7 64.3 11.3 63.1 11.3 62 C 11.3 60.9 11.7 59.7 12.1 58.7 C 12.5 57.8 13.2 57.1 13.7 56.3 C 14.3 55.5 14.9 54.7 15.6 54.1 C 16.3 53.6 17.2 53.1 18 53.1 C 18.8 53.1 19.7 53.6 20.4 54.1 C 21.1 54.7 21.7 55.5 22.3 56.3 C 22.8 57.1 23.5 57.8 23.9 58.7 C 24.3 59.7 24.7 60.9 24.7 62 Z', from: 5 },
        { tone: 'base', d: 'M 22.7 61.2 C 22.7 62.1 22.4 63.1 22.1 63.9 C 21.7 64.7 21.2 65.3 20.7 65.9 C 20.3 66.6 19.8 67.3 19.2 67.7 C 18.7 68.2 17.9 68.6 17.3 68.6 C 16.6 68.6 15.9 68.2 15.3 67.7 C 14.7 67.3 14.3 66.6 13.8 65.9 C 13.3 65.3 12.8 64.7 12.5 63.9 C 12.2 63.1 11.8 62.1 11.8 61.2 C 11.8 60.3 12.2 59.2 12.5 58.4 C 12.8 57.6 13.3 57 13.8 56.4 C 14.3 55.7 14.7 55 15.3 54.6 C 15.9 54.2 16.6 53.7 17.3 53.7 C 17.9 53.7 18.7 54.2 19.2 54.6 C 19.8 55 20.3 55.7 20.7 56.4 C 21.2 57 21.7 57.6 22.1 58.4 C 22.4 59.2 22.7 60.3 22.7 61.2 Z', from: 5 },
        { tone: 'light', d: 'M 18 59.6 C 18 59.9 17.9 60.3 17.7 60.6 C 17.6 60.8 17.4 61 17.2 61.3 C 17 61.5 16.8 61.8 16.6 61.9 C 16.4 62.1 16.1 62.3 15.8 62.3 C 15.5 62.3 15.2 62.1 15 61.9 C 14.8 61.8 14.6 61.5 14.4 61.3 C 14.2 61 14 60.8 13.9 60.6 C 13.8 60.3 13.6 59.9 13.6 59.6 C 13.6 59.3 13.8 58.9 13.9 58.6 C 14 58.4 14.2 58.1 14.4 57.9 C 14.6 57.7 14.8 57.4 15 57.3 C 15.2 57.1 15.5 56.9 15.8 56.9 C 16.1 56.9 16.4 57.1 16.6 57.3 C 16.8 57.4 17 57.7 17.2 57.9 C 17.4 58.1 17.6 58.4 17.7 58.6 C 17.9 58.9 18 59.3 18 59.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 13.7 58.3 Q 10 58.3 7.6 61.8 Q 11.5 60.8 13.7 58.3 Z', from: 5 },
        { tone: 'stem', d: 'M 13.5 58 Q 10.5 58.3 8.3 61 Q 11.4 60 13.5 58 Z', from: 5 },
        { tone: 'stemshade', d: 'M 14.1 63.5 Q 11.2 61 7.2 62.3 Q 10.7 63.9 14.1 63.5 Z', from: 5 },
        { tone: 'stem', d: 'M 13.8 63.2 Q 11.3 61.5 8 62.2 Q 11 63.4 13.8 63.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 22.1 58.9 Q 24 62.2 28.2 62.4 Q 25.5 59.6 22.1 58.9 Z', from: 5 },
        { tone: 'stem', d: 'M 21.9 58.6 Q 23.6 61.1 27 61.6 Q 24.6 59.4 21.9 58.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 21.9 64.2 Q 25.4 65.6 28.8 63 Q 24.9 62.6 21.9 64.2 Z', from: 5 },
        { tone: 'stem', d: 'M 21.6 63.9 Q 24.5 64.7 27.5 62.9 Q 24.2 62.8 21.6 63.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 16.5 55.3 Q 14.4 51.8 9.9 50.9 Q 12.9 54.1 16.5 55.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 19.5 55.3 Q 23 54.3 24.7 50.5 Q 21.3 52.5 19.5 55.3 Z', from: 5 },
        { tone: 'stem', d: 'M 18 54.6 Q 19.5 52.2 18 49.4 Q 16.5 52.2 18 54.6 Z', from: 5 },
        { tone: 'deep', d: 'M 49.3 68 C 49.3 69 48.9 70.2 48.6 71.1 C 48.2 72 47.6 72.7 47 73.4 C 46.5 74.1 46 74.9 45.3 75.4 C 44.6 75.9 43.8 76.5 43 76.5 C 42.2 76.5 41.4 75.9 40.7 75.4 C 40 74.9 39.5 74.1 39 73.4 C 38.4 72.7 37.8 72 37.4 71.1 C 37.1 70.2 36.7 69 36.7 68 C 36.7 67 37.1 65.8 37.4 64.9 C 37.8 64 38.4 63.3 39 62.6 C 39.5 61.9 40 61.1 40.7 60.6 C 41.4 60.1 42.2 59.5 43 59.5 C 43.8 59.5 44.6 60.1 45.3 60.6 C 46 61.1 46.5 61.9 47 62.6 C 47.6 63.3 48.2 64 48.6 64.9 C 48.9 65.8 49.3 67 49.3 68 Z', from: 5 },
        { tone: 'base', d: 'M 47.5 67.2 C 47.5 68.1 47.1 69 46.8 69.8 C 46.5 70.5 46 71.1 45.6 71.7 C 45.2 72.3 44.7 73 44.2 73.4 C 43.6 73.8 42.9 74.3 42.3 74.3 C 41.7 74.3 41 73.8 40.4 73.4 C 39.9 73 39.5 72.3 39 71.7 C 38.6 71.1 38.1 70.5 37.8 69.8 C 37.5 69 37.2 68.1 37.2 67.2 C 37.2 66.4 37.5 65.4 37.8 64.6 C 38.1 63.9 38.6 63.3 39 62.7 C 39.5 62.1 39.9 61.4 40.4 61 C 41 60.6 41.7 60.2 42.3 60.2 C 42.9 60.2 43.6 60.6 44.2 61 C 44.7 61.4 45.2 62.1 45.6 62.7 C 46 63.3 46.5 63.9 46.8 64.6 C 47.1 65.4 47.5 66.4 47.5 67.2 Z', from: 5 },
        { tone: 'light', d: 'M 43 65.7 C 43 66 42.9 66.4 42.7 66.6 C 42.6 66.9 42.4 67.1 42.2 67.3 C 42 67.5 41.9 67.8 41.7 67.9 C 41.5 68.1 41.2 68.2 40.9 68.2 C 40.7 68.2 40.4 68.1 40.2 67.9 C 40 67.8 39.8 67.5 39.6 67.3 C 39.4 67.1 39.2 66.9 39.1 66.6 C 39 66.4 38.8 66 38.8 65.7 C 38.8 65.4 39 65.1 39.1 64.8 C 39.2 64.5 39.4 64.4 39.6 64.1 C 39.8 63.9 40 63.7 40.2 63.5 C 40.4 63.4 40.7 63.2 40.9 63.2 C 41.2 63.2 41.5 63.4 41.7 63.5 C 41.9 63.7 42 63.9 42.2 64.1 C 42.4 64.4 42.6 64.5 42.7 64.8 C 42.9 65.1 43 65.4 43 65.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 39 64.5 Q 35.4 64.5 33.2 67.8 Q 36.8 66.9 39 64.5 Z', from: 5 },
        { tone: 'stem', d: 'M 38.7 64.2 Q 35.9 64.5 33.8 67 Q 36.8 66.1 38.7 64.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 39.3 69.4 Q 36.6 67.1 32.8 68.2 Q 36.1 69.8 39.3 69.4 Z', from: 5 },
        { tone: 'stem', d: 'M 39 69.1 Q 36.7 67.5 33.5 68.1 Q 36.4 69.3 39 69.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 46.9 65.1 Q 48.7 68.2 52.7 68.4 Q 50.1 65.7 46.9 65.1 Z', from: 5 },
        { tone: 'stem', d: 'M 46.6 64.8 Q 48.3 67.1 51.5 67.6 Q 49.2 65.5 46.6 64.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 46.7 70.1 Q 50 71.4 53.2 68.9 Q 49.5 68.6 46.7 70.1 Z', from: 5 },
        { tone: 'stem', d: 'M 46.4 69.8 Q 49.2 70.5 51.9 68.8 Q 48.8 68.7 46.4 69.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 41.6 61.7 Q 39.6 58.4 35.3 57.5 Q 38.2 60.5 41.6 61.7 Z', from: 5 },
        { tone: 'stemlight', d: 'M 44.4 61.7 Q 47.7 60.7 49.3 57.2 Q 46.1 59 44.4 61.7 Z', from: 5 },
        { tone: 'stem', d: 'M 43 61 Q 44.4 58.7 43 56.1 Q 41.6 58.7 43 61 Z', from: 5 }
      ]
    },
    eggplant: {
      trunk: 'M 27.6 96 Q 28.8 81 28.2 66 L 31.8 66 Q 31.2 81 32.4 96 Z',
      trunkShort: 'M 28 96 Q 29 88 28.5 80 L 31.5 80 Q 31 88 32 96 Z',
      trunkTone: 'stem',
      blossoms: [[19, 78], [41, 74], [30, 60], [24, 66], [37, 62], [30, 48], [12, 70], [48, 66], [30, 84]],
      parts: [
        { tone: 'stem', d: 'M 28 96 Q 29 88 28.5 80 L 31.5 80 Q 31 88 32 96 Z', from: 2, to: 2 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.6 88 30.2 80 L 31.5 80 Q 31 88 32 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 16.6 85.1 C 16.7 84.6 18 84.4 18.8 84.3 C 19.5 84.2 20.5 84.6 21.2 84.4 C 21.9 84.3 22.1 83.7 22.8 83.5 C 23.5 83.4 24.7 83.1 25.5 83.4 C 26.3 83.7 27 84.6 27.5 85.2 C 27.9 85.8 27.7 86.4 28.1 87 C 28.5 87.5 29.5 87.8 30 88.4 C 30.6 89 31.4 90 31.2 90.4 C 31.1 90.9 29.8 91.1 29 91.2 C 28.3 91.3 27.3 91 26.6 91.1 C 25.9 91.2 25.7 91.8 25 92 C 24.3 92.2 23.1 92.5 22.3 92.2 C 21.5 91.9 20.8 90.9 20.3 90.3 C 19.9 89.7 20.1 89.1 19.7 88.6 C 19.3 88.1 18.3 87.7 17.7 87.1 C 17.2 86.5 16.4 85.6 16.6 85.1 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 17 84.7 C 17.1 84.4 18.2 84.2 18.8 84.1 C 19.4 84.1 20.3 84.4 20.8 84.3 C 21.4 84.2 21.5 83.8 22.1 83.6 C 22.7 83.5 23.7 83.3 24.4 83.6 C 25 83.8 25.7 84.6 26.1 85.1 C 26.4 85.5 26.3 86 26.6 86.4 C 27 86.8 27.8 87.1 28.3 87.6 C 28.7 88.1 29.4 88.8 29.3 89.2 C 29.2 89.5 28.1 89.7 27.5 89.8 C 26.9 89.8 26 89.5 25.5 89.6 C 24.9 89.7 24.8 90.1 24.2 90.3 C 23.6 90.4 22.6 90.6 21.9 90.3 C 21.3 90.1 20.6 89.3 20.2 88.8 C 19.9 88.4 20 87.9 19.7 87.5 C 19.3 87.1 18.5 86.8 18 86.3 C 17.6 85.8 16.9 85.1 17 84.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.3 89.7 Q 24.6 87.4 19.5 86.2 Q 24.2 88.5 29.3 89.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 42.4 81.5 C 42.6 81.9 41.8 82.8 41.3 83.3 C 40.8 83.9 39.9 84.2 39.5 84.7 C 39.1 85.2 39.3 85.7 38.9 86.3 C 38.5 86.8 37.8 87.7 37.1 88 C 36.4 88.3 35.3 88 34.6 87.9 C 34 87.7 33.8 87.1 33.1 87 C 32.5 86.9 31.6 87.2 30.9 87.1 C 30.2 87 29 86.8 28.9 86.4 C 28.7 86 29.5 85.1 30 84.5 C 30.4 84 31.4 83.7 31.8 83.2 C 32.1 82.7 31.9 82.2 32.3 81.6 C 32.7 81.1 33.4 80.2 34.2 79.9 C 34.9 79.6 36 79.9 36.7 80 C 37.3 80.2 37.5 80.8 38.1 80.9 C 38.8 81 39.7 80.7 40.4 80.8 C 41.1 80.9 42.2 81.1 42.4 81.5 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 40.6 81.1 C 40.8 81.4 40.1 82.2 39.7 82.6 C 39.3 83 38.5 83.3 38.2 83.7 C 37.8 84.1 38 84.5 37.6 84.9 C 37.3 85.4 36.7 86.1 36.1 86.3 C 35.5 86.5 34.6 86.4 34 86.2 C 33.5 86.1 33.3 85.7 32.8 85.6 C 32.3 85.5 31.5 85.8 30.9 85.8 C 30.4 85.7 29.4 85.6 29.3 85.3 C 29.2 84.9 29.8 84.2 30.2 83.8 C 30.6 83.4 31.4 83.1 31.7 82.7 C 32.1 82.3 31.9 81.9 32.3 81.4 C 32.6 81 33.2 80.3 33.8 80.1 C 34.4 79.9 35.4 80 35.9 80.1 C 36.4 80.2 36.6 80.7 37.1 80.7 C 37.6 80.8 38.4 80.5 39 80.6 C 39.6 80.7 40.5 80.8 40.6 81.1 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.7 85.8 Q 35.4 84.6 39.7 82.5 Q 35 83.6 30.7 85.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 25.9 70.6 C 26.3 70.5 27.1 71.2 27.6 71.6 C 28.1 72.1 28.4 72.9 28.8 73.3 C 29.3 73.6 29.8 73.4 30.3 73.8 C 30.8 74.2 31.6 74.8 31.8 75.5 C 32.1 76.1 31.9 77.2 31.7 77.8 C 31.6 78.4 31 78.5 30.9 79.1 C 30.8 79.7 31.1 80.5 31 81.2 C 31 81.8 30.8 82.9 30.4 83 C 30 83.2 29.2 82.5 28.7 82 C 28.2 81.6 27.9 80.8 27.4 80.4 C 27 80 26.5 80.2 26 79.9 C 25.5 79.5 24.6 78.8 24.4 78.2 C 24.2 77.5 24.4 76.5 24.5 75.9 C 24.7 75.3 25.2 75.1 25.3 74.5 C 25.4 74 25.1 73.1 25.2 72.5 C 25.3 71.8 25.5 70.8 25.9 70.6 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 25.6 70.9 C 25.9 70.8 26.6 71.4 26.9 71.8 C 27.3 72.2 27.6 72.9 27.9 73.2 C 28.3 73.5 28.7 73.4 29.1 73.7 C 29.5 74 30.1 74.5 30.3 75.1 C 30.6 75.6 30.4 76.5 30.3 77 C 30.2 77.5 29.8 77.6 29.7 78.1 C 29.7 78.6 29.9 79.3 29.9 79.8 C 29.8 80.4 29.7 81.2 29.4 81.3 C 29.1 81.5 28.4 80.9 28 80.5 C 27.7 80.1 27.4 79.4 27 79.1 C 26.7 78.8 26.3 78.9 25.9 78.6 C 25.5 78.3 24.8 77.7 24.6 77.2 C 24.4 76.6 24.6 75.8 24.7 75.3 C 24.8 74.8 25.2 74.6 25.3 74.2 C 25.3 73.7 25.1 73 25.1 72.5 C 25.2 71.9 25.3 71 25.6 70.9 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.8 81.4 Q 28.8 77.1 26.8 73.1 Q 27.8 77.4 29.8 81.4 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 27.6 96 Q 28.8 81 28.2 66 L 31.8 66 Q 31.2 81 32.4 96 Z', from: 3, to: 3 },
        { tone: 'stemdark', d: 'M 30.4 96 Q 30.7 81 30.2 66 L 31.8 66 Q 31.2 81 32.4 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 14.7 83.8 C 14.9 83.3 16.4 83.1 17.3 83 C 18.2 82.9 19.3 83.4 20.1 83.2 C 20.8 83.1 21.1 82.4 21.9 82.3 C 22.8 82.1 24.2 81.8 25.1 82.2 C 26 82.5 26.8 83.7 27.3 84.4 C 27.7 85.1 27.5 85.8 27.9 86.4 C 28.4 87 29.5 87.5 30.1 88.2 C 30.7 88.9 31.6 90 31.4 90.6 C 31.2 91.1 29.7 91.3 28.8 91.4 C 27.9 91.5 26.8 91 26 91.1 C 25.2 91.3 25 91.9 24.1 92.1 C 23.3 92.3 21.9 92.6 21 92.2 C 20.1 91.8 19.3 90.7 18.8 90 C 18.4 89.3 18.6 88.6 18.2 88 C 17.7 87.3 16.6 86.9 16 86.2 C 15.4 85.5 14.5 84.4 14.7 83.8 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 15.2 83.4 C 15.4 83 16.6 82.9 17.3 82.8 C 18 82.8 19 83.2 19.6 83.1 C 20.3 83 20.5 82.5 21.2 82.4 C 21.8 82.3 23 82.1 23.7 82.4 C 24.5 82.7 25.2 83.6 25.6 84.2 C 26 84.7 25.8 85.3 26.2 85.8 C 26.6 86.3 27.6 86.6 28.1 87.2 C 28.6 87.7 29.4 88.7 29.2 89.1 C 29 89.5 27.8 89.6 27.1 89.6 C 26.4 89.7 25.4 89.3 24.8 89.4 C 24.1 89.5 23.9 90 23.2 90.1 C 22.6 90.2 21.4 90.4 20.6 90.1 C 19.9 89.8 19.2 88.8 18.8 88.3 C 18.4 87.7 18.6 87.2 18.2 86.7 C 17.8 86.2 16.8 85.8 16.3 85.3 C 15.8 84.7 15 83.8 15.2 83.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.2 89.7 Q 23.8 86.9 18 85.2 Q 23.4 87.9 29.2 89.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 44.5 78.7 C 44.7 79.2 43.8 80.3 43.2 80.9 C 42.6 81.5 41.6 81.9 41.1 82.5 C 40.6 83.1 40.9 83.7 40.4 84.3 C 40 85 39.1 86 38.3 86.3 C 37.5 86.6 36.2 86.4 35.4 86.2 C 34.6 86 34.4 85.3 33.7 85.2 C 32.9 85.1 31.9 85.4 31.1 85.3 C 30.2 85.2 28.9 85 28.7 84.5 C 28.5 84 29.4 82.9 30 82.3 C 30.5 81.7 31.6 81.3 32 80.7 C 32.5 80.2 32.3 79.5 32.7 78.9 C 33.2 78.2 34 77.2 34.9 76.9 C 35.7 76.6 37 76.9 37.8 77 C 38.5 77.2 38.8 77.9 39.5 78 C 40.2 78.2 41.3 77.8 42.1 77.9 C 42.9 78 44.3 78.2 44.5 78.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 42.4 78.3 C 42.6 78.7 41.8 79.5 41.3 80 C 40.8 80.5 39.9 80.8 39.5 81.3 C 39.1 81.7 39.3 82.2 38.9 82.7 C 38.5 83.3 37.8 84.1 37.1 84.3 C 36.4 84.6 35.3 84.4 34.7 84.3 C 34.1 84.1 33.9 83.7 33.3 83.6 C 32.7 83.5 31.8 83.8 31.1 83.7 C 30.4 83.7 29.3 83.5 29.2 83.1 C 29 82.7 29.8 81.9 30.3 81.4 C 30.7 80.9 31.6 80.6 32 80.1 C 32.4 79.7 32.2 79.2 32.7 78.7 C 33.1 78.2 33.8 77.3 34.5 77.1 C 35.2 76.8 36.2 77 36.9 77.1 C 37.5 77.3 37.7 77.8 38.3 77.9 C 38.9 78 39.8 77.6 40.5 77.7 C 41.2 77.8 42.3 77.9 42.4 78.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.8 83.7 Q 36.2 82.3 41.3 79.9 Q 35.9 81.3 30.8 83.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 16.3 72.1 C 16.4 71.6 17.6 71.3 18.4 71.1 C 19.2 71 20.2 71.3 20.8 71.1 C 21.5 70.9 21.7 70.3 22.4 70.1 C 23.1 69.8 24.2 69.5 25 69.7 C 25.8 69.9 26.7 70.9 27.1 71.4 C 27.6 72 27.4 72.6 27.9 73.1 C 28.4 73.6 29.4 73.9 29.9 74.4 C 30.5 75 31.4 75.9 31.2 76.4 C 31.1 76.8 29.9 77.1 29.1 77.3 C 28.4 77.5 27.3 77.2 26.7 77.3 C 26 77.5 25.9 78.1 25.1 78.4 C 24.4 78.6 23.3 78.9 22.5 78.7 C 21.7 78.5 20.8 77.6 20.4 77 C 19.9 76.4 20.1 75.8 19.6 75.3 C 19.1 74.8 18.1 74.5 17.6 74 C 17 73.4 16.1 72.5 16.3 72.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 16.7 71.6 C 16.8 71.2 17.9 71 18.5 70.9 C 19.1 70.8 20 71 20.5 70.9 C 21.1 70.8 21.2 70.3 21.8 70.1 C 22.4 70 23.3 69.7 24 69.9 C 24.7 70.1 25.4 70.9 25.8 71.3 C 26.2 71.7 26.1 72.2 26.5 72.6 C 26.9 73 27.7 73.2 28.2 73.7 C 28.7 74.1 29.4 74.8 29.3 75.2 C 29.2 75.6 28.2 75.8 27.5 75.9 C 26.9 76 26.1 75.7 25.5 75.9 C 25 76 24.8 76.5 24.3 76.6 C 23.7 76.8 22.7 77 22 76.8 C 21.4 76.6 20.7 75.9 20.2 75.5 C 19.8 75 20 74.6 19.6 74.2 C 19.2 73.8 18.3 73.5 17.9 73.1 C 17.4 72.7 16.6 71.9 16.7 71.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.3 75.8 Q 24.4 73.8 19.3 72.9 Q 24.1 74.9 29.3 75.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 42.7 66.4 C 42.8 66.8 42 67.6 41.5 68.1 C 41 68.6 40 68.9 39.6 69.4 C 39.2 69.8 39.3 70.4 38.9 70.9 C 38.5 71.4 37.7 72.3 37 72.5 C 36.2 72.7 35.1 72.4 34.5 72.2 C 33.8 72 33.7 71.4 33.1 71.2 C 32.5 71.1 31.5 71.3 30.8 71.2 C 30.1 71 29 70.8 28.8 70.3 C 28.7 69.9 29.5 69.1 30.1 68.5 C 30.6 68 31.5 67.8 31.9 67.3 C 32.4 66.9 32.2 66.3 32.6 65.8 C 33.1 65.3 33.8 64.4 34.6 64.2 C 35.3 64 36.4 64.3 37.1 64.5 C 37.7 64.7 37.9 65.3 38.5 65.5 C 39.1 65.6 40 65.3 40.7 65.5 C 41.4 65.6 42.6 65.9 42.7 66.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 40.9 65.9 C 41 66.3 40.3 66.9 39.9 67.3 C 39.4 67.7 38.6 67.9 38.3 68.3 C 37.9 68.7 38 69.1 37.6 69.5 C 37.3 69.9 36.6 70.6 36 70.8 C 35.4 70.9 34.5 70.7 33.9 70.6 C 33.4 70.4 33.3 70 32.8 69.9 C 32.3 69.8 31.5 70 30.9 69.9 C 30.3 69.8 29.4 69.6 29.3 69.2 C 29.2 68.9 29.9 68.2 30.3 67.9 C 30.8 67.5 31.5 67.2 31.9 66.9 C 32.3 66.5 32.2 66.1 32.5 65.7 C 32.9 65.3 33.6 64.6 34.2 64.4 C 34.8 64.2 35.7 64.5 36.2 64.6 C 36.8 64.7 36.9 65.2 37.4 65.3 C 37.9 65.4 38.7 65.2 39.3 65.3 C 39.9 65.4 40.8 65.6 40.9 65.9 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.7 69.8 Q 35.5 69 39.9 67.2 Q 35.2 67.9 30.7 69.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 28.3 54 C 28.7 54 29.4 54.8 29.8 55.3 C 30.2 55.9 30.3 56.8 30.7 57.2 C 31 57.7 31.5 57.6 32 58 C 32.4 58.5 33.1 59.3 33.2 60 C 33.3 60.7 32.8 61.7 32.5 62.2 C 32.3 62.8 31.7 62.8 31.5 63.4 C 31.3 63.9 31.4 64.8 31.2 65.4 C 31 66 30.6 67 30.2 67.1 C 29.7 67.1 29.1 66.3 28.7 65.8 C 28.3 65.2 28.2 64.3 27.8 63.9 C 27.5 63.4 26.9 63.5 26.5 63.1 C 26.1 62.6 25.4 61.8 25.3 61.1 C 25.2 60.4 25.6 59.5 25.9 58.9 C 26.2 58.3 26.7 58.3 27 57.7 C 27.2 57.2 27 56.3 27.3 55.7 C 27.5 55.1 27.9 54.1 28.3 54 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 27.8 54.4 C 28.2 54.3 28.7 55 29 55.5 C 29.3 55.9 29.4 56.7 29.7 57.1 C 29.9 57.4 30.4 57.4 30.7 57.8 C 31 58.2 31.5 58.8 31.6 59.4 C 31.7 60 31.4 60.8 31.2 61.3 C 31 61.7 30.6 61.8 30.4 62.2 C 30.2 62.7 30.3 63.4 30.2 63.9 C 30 64.5 29.7 65.3 29.4 65.3 C 29.1 65.4 28.6 64.7 28.2 64.2 C 27.9 63.8 27.8 63 27.6 62.6 C 27.3 62.3 26.9 62.3 26.5 61.9 C 26.2 61.5 25.7 60.9 25.6 60.3 C 25.5 59.7 25.8 58.9 26.1 58.4 C 26.3 58 26.7 57.9 26.8 57.5 C 27 57 26.9 56.3 27.1 55.8 C 27.2 55.2 27.5 54.4 27.8 54.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.9 65.3 Q 29.8 60.9 28.7 56.6 Q 28.8 61.1 29.9 65.3 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 27.4 96 Q 28.7 77 28.1 58 L 31.9 58 Q 31.3 77 32.6 96 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 30.5 96 Q 30.7 77 30.2 58 L 31.9 58 Q 31.3 77 32.6 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 13.9 82.8 C 14.2 82.3 15.7 82.1 16.7 82.1 C 17.6 82 18.8 82.5 19.7 82.4 C 20.5 82.3 20.8 81.6 21.7 81.4 C 22.6 81.3 24.1 81.1 25 81.5 C 26 81.9 26.8 83.2 27.3 83.9 C 27.8 84.7 27.4 85.4 27.9 86.1 C 28.4 86.8 29.6 87.3 30.2 88.1 C 30.8 88.8 31.7 90.1 31.5 90.7 C 31.2 91.2 29.7 91.4 28.7 91.4 C 27.7 91.5 26.6 91 25.7 91.1 C 24.9 91.2 24.6 91.9 23.7 92 C 22.8 92.2 21.3 92.4 20.3 92 C 19.4 91.6 18.6 90.3 18.1 89.6 C 17.6 88.8 17.9 88.1 17.5 87.4 C 17 86.7 15.8 86.2 15.2 85.4 C 14.6 84.7 13.7 83.4 13.9 82.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 14.4 82.4 C 14.6 82 15.9 81.9 16.7 81.9 C 17.5 81.9 18.5 82.3 19.2 82.3 C 19.8 82.2 20.1 81.7 20.8 81.6 C 21.6 81.5 22.8 81.3 23.6 81.7 C 24.4 82 25.1 83.1 25.5 83.7 C 25.9 84.3 25.7 84.8 26.1 85.4 C 26.5 85.9 27.5 86.4 28 87 C 28.5 87.6 29.3 88.6 29.2 89 C 29 89.4 27.7 89.5 26.9 89.5 C 26.1 89.6 25.1 89.1 24.4 89.2 C 23.7 89.2 23.5 89.8 22.8 89.9 C 22 90 20.8 90.1 20 89.8 C 19.2 89.4 18.5 88.4 18.1 87.8 C 17.6 87.2 17.9 86.6 17.5 86.1 C 17 85.5 16 85.1 15.5 84.5 C 15 83.9 14.2 82.9 14.4 82.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.1 89.6 Q 23.5 86.5 17.4 84.4 Q 23.1 87.5 29.1 89.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 45.5 76.4 C 45.7 76.9 44.7 78 44.1 78.7 C 43.5 79.4 42.4 79.8 41.9 80.4 C 41.4 81 41.7 81.7 41.2 82.4 C 40.7 83 39.8 84.2 38.9 84.5 C 38 84.8 36.6 84.5 35.8 84.3 C 34.9 84.1 34.7 83.4 33.9 83.3 C 33.2 83.1 32 83.6 31.1 83.4 C 30.2 83.3 28.8 83.1 28.6 82.5 C 28.4 82 29.3 80.9 29.9 80.2 C 30.5 79.5 31.7 79.1 32.2 78.5 C 32.7 77.9 32.4 77.2 32.9 76.5 C 33.4 75.8 34.3 74.7 35.2 74.4 C 36.1 74 37.5 74.3 38.3 74.5 C 39.1 74.8 39.4 75.4 40.2 75.6 C 40.9 75.7 42.1 75.3 43 75.4 C 43.9 75.6 45.3 75.8 45.5 76.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 43.3 75.9 C 43.5 76.3 42.6 77.2 42.1 77.7 C 41.6 78.3 40.6 78.6 40.2 79.1 C 39.8 79.6 40 80.1 39.6 80.7 C 39.1 81.2 38.4 82.1 37.6 82.4 C 36.9 82.6 35.7 82.4 35 82.3 C 34.3 82.2 34.2 81.6 33.5 81.5 C 32.9 81.4 31.9 81.8 31.2 81.7 C 30.4 81.6 29.2 81.5 29.1 81.1 C 28.9 80.7 29.8 79.8 30.3 79.2 C 30.8 78.7 31.8 78.4 32.2 77.9 C 32.6 77.4 32.4 76.9 32.8 76.3 C 33.3 75.8 34 74.9 34.8 74.6 C 35.5 74.3 36.7 74.5 37.4 74.7 C 38.1 74.8 38.2 75.3 38.9 75.4 C 39.5 75.5 40.5 75.2 41.2 75.2 C 42 75.3 43.2 75.5 43.3 75.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.8 81.7 Q 36.7 80.2 42.1 77.6 Q 36.3 79.1 30.8 81.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 15.1 70.3 C 15.2 69.8 16.5 69.4 17.3 69.2 C 18.1 69 19.2 69.3 19.9 69 C 20.6 68.8 20.8 68.2 21.5 67.9 C 22.3 67.6 23.6 67.2 24.4 67.4 C 25.3 67.6 26.2 68.6 26.7 69.2 C 27.3 69.8 27.1 70.4 27.6 71 C 28.1 71.5 29.2 71.7 29.9 72.3 C 30.5 72.9 31.5 73.8 31.4 74.3 C 31.2 74.9 29.9 75.2 29.1 75.4 C 28.3 75.6 27.2 75.4 26.5 75.6 C 25.8 75.8 25.6 76.4 24.9 76.7 C 24.1 77 22.9 77.4 22 77.2 C 21.1 77 20.2 76 19.7 75.4 C 19.1 74.8 19.3 74.2 18.8 73.7 C 18.3 73.1 17.2 72.9 16.5 72.3 C 15.9 71.7 14.9 70.8 15.1 70.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 15.6 69.7 C 15.7 69.3 16.8 69 17.4 68.9 C 18.1 68.8 19 69 19.6 68.8 C 20.2 68.7 20.3 68.2 21 68 C 21.6 67.8 22.6 67.5 23.4 67.7 C 24.1 67.8 24.9 68.6 25.3 69.1 C 25.8 69.5 25.6 70 26.1 70.5 C 26.5 70.9 27.5 71.1 28 71.5 C 28.5 72 29.4 72.7 29.3 73.1 C 29.2 73.5 28.1 73.8 27.4 73.9 C 26.7 74.1 25.8 73.8 25.2 74 C 24.6 74.1 24.5 74.7 23.9 74.8 C 23.3 75 22.2 75.3 21.5 75.2 C 20.8 75 20 74.2 19.5 73.8 C 19.1 73.3 19.2 72.8 18.7 72.4 C 18.3 72 17.4 71.7 16.8 71.3 C 16.3 70.9 15.5 70.1 15.6 69.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.2 73.8 Q 23.9 71.9 18.3 71.1 Q 23.6 73 29.2 73.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 43.9 62.5 C 44 63 43.1 63.9 42.5 64.4 C 41.9 64.9 40.9 65.2 40.4 65.7 C 39.9 66.2 40.1 66.8 39.6 67.3 C 39.1 67.9 38.2 68.8 37.4 69 C 36.6 69.2 35.5 68.8 34.8 68.5 C 34.1 68.3 33.9 67.7 33.3 67.5 C 32.6 67.3 31.6 67.5 30.8 67.3 C 30.1 67.1 28.9 66.8 28.7 66.3 C 28.6 65.8 29.5 65 30.1 64.4 C 30.7 63.9 31.7 63.7 32.2 63.2 C 32.7 62.7 32.5 62.1 33 61.5 C 33.5 61 34.4 60.1 35.2 59.9 C 36 59.7 37.2 60.1 37.8 60.3 C 38.5 60.6 38.7 61.2 39.3 61.4 C 40 61.6 41 61.3 41.8 61.5 C 42.5 61.7 43.8 62.1 43.9 62.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 41.9 62 C 42 62.4 41.2 63.1 40.7 63.5 C 40.3 63.9 39.4 64.1 39 64.5 C 38.6 64.9 38.7 65.3 38.3 65.8 C 37.8 66.2 37.1 66.9 36.4 67.1 C 35.8 67.3 34.8 67 34.2 66.8 C 33.6 66.6 33.5 66.1 33 66 C 32.4 65.8 31.6 66.1 31 65.9 C 30.3 65.8 29.3 65.6 29.2 65.2 C 29.1 64.8 29.9 64.1 30.4 63.7 C 30.9 63.3 31.8 63.1 32.2 62.7 C 32.6 62.3 32.5 61.9 32.9 61.4 C 33.3 61 34 60.3 34.7 60.1 C 35.4 60 36.4 60.2 36.9 60.4 C 37.5 60.6 37.6 61.1 38.2 61.2 C 38.7 61.4 39.6 61.1 40.2 61.3 C 40.8 61.4 41.8 61.6 41.9 62 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.8 65.8 Q 35.9 65.1 40.8 63.3 Q 35.7 64 30.8 65.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 27.7 47 C 28.2 46.9 28.9 47.8 29.4 48.4 C 29.8 49 30 49.9 30.4 50.4 C 30.8 50.9 31.4 50.8 31.8 51.3 C 32.3 51.7 33.1 52.6 33.2 53.3 C 33.3 54.1 32.9 55.2 32.6 55.8 C 32.4 56.4 31.8 56.5 31.6 57.1 C 31.3 57.7 31.5 58.6 31.3 59.3 C 31.1 60 30.7 61.1 30.2 61.2 C 29.8 61.3 29 60.4 28.6 59.8 C 28.1 59.2 28 58.3 27.5 57.8 C 27.1 57.3 26.6 57.4 26.1 56.9 C 25.6 56.4 24.8 55.6 24.7 54.8 C 24.6 54.1 25 53 25.3 52.4 C 25.6 51.8 26.1 51.7 26.4 51.1 C 26.6 50.5 26.4 49.6 26.6 48.9 C 26.9 48.2 27.3 47.1 27.7 47 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 27.2 47.4 C 27.6 47.3 28.2 48.1 28.5 48.6 C 28.9 49 29 49.8 29.3 50.2 C 29.6 50.7 30.1 50.6 30.5 51 C 30.8 51.4 31.4 52.1 31.5 52.8 C 31.7 53.4 31.3 54.3 31.1 54.8 C 30.9 55.3 30.5 55.4 30.3 55.9 C 30.1 56.4 30.3 57.2 30.1 57.7 C 30 58.3 29.7 59.2 29.3 59.3 C 29 59.3 28.4 58.6 28 58.1 C 27.7 57.6 27.6 56.8 27.2 56.4 C 26.9 56 26.5 56.1 26.1 55.7 C 25.7 55.3 25.1 54.5 25 53.9 C 24.9 53.3 25.2 52.4 25.4 51.9 C 25.6 51.4 26.1 51.3 26.2 50.8 C 26.4 50.3 26.3 49.5 26.4 48.9 C 26.6 48.4 26.9 47.4 27.2 47.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.9 59.3 Q 29.6 54.5 28.2 49.8 Q 28.5 54.7 29.9 59.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33.1 46.3 C 33.5 46.4 33.8 47.5 34 48.1 C 34.1 48.7 33.9 49.6 34 50.2 C 34.2 50.7 34.7 50.9 34.9 51.4 C 35.1 52 35.4 53 35.2 53.7 C 35.1 54.4 34.3 55.1 33.8 55.5 C 33.4 55.9 32.8 55.8 32.4 56.2 C 32 56.6 31.8 57.4 31.3 57.9 C 30.9 58.4 30.1 59.2 29.7 59.1 C 29.3 59 29 57.9 28.9 57.3 C 28.7 56.6 29 55.8 28.8 55.2 C 28.7 54.7 28.1 54.5 27.9 53.9 C 27.7 53.3 27.4 52.3 27.6 51.7 C 27.8 51 28.6 50.3 29 49.9 C 29.5 49.5 30 49.6 30.4 49.2 C 30.8 48.8 31.1 47.9 31.5 47.5 C 32 47 32.7 46.2 33.1 46.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 32.2 46.6 C 32.5 46.7 32.7 47.6 32.8 48.1 C 32.9 48.6 32.7 49.4 32.9 49.8 C 33 50.3 33.4 50.4 33.5 50.9 C 33.7 51.4 33.9 52.2 33.7 52.8 C 33.6 53.3 33 53.9 32.6 54.3 C 32.2 54.7 31.8 54.5 31.5 54.9 C 31.2 55.2 31 56 30.6 56.4 C 30.3 56.8 29.7 57.4 29.4 57.3 C 29.1 57.3 28.9 56.4 28.8 55.9 C 28.7 55.3 28.9 54.6 28.7 54.1 C 28.6 53.7 28.2 53.6 28.1 53.1 C 27.9 52.6 27.7 51.8 27.9 51.2 C 28 50.6 28.6 50 29 49.7 C 29.4 49.3 29.8 49.4 30.1 49.1 C 30.4 48.7 30.6 48 31 47.6 C 31.3 47.2 31.9 46.5 32.2 46.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 57.4 Q 31.8 53.3 32.4 48.9 Q 30.8 53 30.2 57.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 19.9 72.1 C 21.2 71.9 22.8 72.2 24 72.9 C 25.3 73.7 26.7 75.3 27.5 76.7 C 28.3 78.1 28.9 79.8 28.8 81.3 C 28.7 82.9 27.8 85 26.7 86.1 C 25.6 87.2 23.7 87.7 22.1 87.9 C 20.5 88.1 18.6 88.2 17.2 87.5 C 15.8 86.7 14.4 84.9 13.9 83.4 C 13.3 81.9 13.5 80.1 13.9 78.6 C 14.2 77 15.1 75.1 16.1 74.1 C 17.1 73 18.6 72.3 19.9 72.1 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 19.3 72.4 C 20.4 72.3 21.7 72.5 22.8 73.2 C 23.8 73.8 25 75.1 25.7 76.3 C 26.3 77.5 26.9 78.9 26.7 80.2 C 26.6 81.5 25.9 83.3 25 84.3 C 24.1 85.2 22.5 85.6 21.1 85.7 C 19.8 85.9 18.2 86 17 85.4 C 15.9 84.7 14.7 83.2 14.2 82 C 13.8 80.7 13.9 79.2 14.2 77.9 C 14.5 76.6 15.3 75 16.1 74.1 C 17 73.2 18.2 72.6 19.3 72.4 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 16.2 76 Q 14.8 81.6 17.8 84.8 Q 17.6 80.4 18.6 75.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 21 67.8 L 22.2 70.9 L 25.6 71.2 L 23 73.3 L 23.8 76.5 L 21 74.8 L 18.2 76.5 L 19 73.3 L 16.4 71.2 L 19.8 70.9 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 20.4 68.6 L 21.3 70.8 L 23.6 71 L 21.8 72.5 L 22.4 74.7 L 20.4 73.5 L 18.5 74.7 L 19 72.5 L 17.2 71 L 19.6 70.8 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 21.2 65.4 Q 21.3 69 21.6 72.6 L 20.4 72.7 Q 19.9 69.1 19.6 65.5 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 27.2 96 Q 28.6 73 28 50 L 32 50 Q 31.4 73 32.8 96 Z', from: 5 },
        { tone: 'stemdark', d: 'M 30.5 96 Q 30.8 73 30.2 50 L 32 50 Q 31.4 73 32.8 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 13.2 81.8 C 13.5 81.2 15.1 81.1 16.2 81.1 C 17.2 81 18.4 81.7 19.3 81.6 C 20.2 81.5 20.5 80.7 21.5 80.6 C 22.5 80.5 24.1 80.3 25 80.8 C 26 81.2 26.9 82.6 27.3 83.5 C 27.8 84.3 27.5 85 27.9 85.8 C 28.4 86.5 29.7 87.1 30.3 88 C 30.9 88.8 31.8 90.2 31.5 90.7 C 31.2 91.3 29.6 91.4 28.6 91.5 C 27.5 91.5 26.3 90.9 25.4 91 C 24.5 91.1 24.2 91.8 23.2 91.9 C 22.3 92.1 20.7 92.2 19.7 91.8 C 18.7 91.3 17.9 89.9 17.4 89.1 C 16.9 88.2 17.3 87.5 16.8 86.8 C 16.3 86 15 85.4 14.4 84.6 C 13.8 83.8 12.9 82.4 13.2 81.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 13.7 81.4 C 13.9 81 15.3 81 16.1 81 C 17 81 18 81.5 18.7 81.4 C 19.5 81.4 19.7 80.8 20.5 80.7 C 21.3 80.7 22.6 80.6 23.5 81 C 24.3 81.4 25 82.5 25.4 83.1 C 25.9 83.8 25.6 84.4 26 85 C 26.4 85.6 27.5 86.1 28 86.7 C 28.5 87.4 29.3 88.5 29.1 88.9 C 28.9 89.4 27.5 89.4 26.7 89.4 C 25.8 89.4 24.8 88.9 24.1 89 C 23.3 89 23.1 89.6 22.3 89.6 C 21.5 89.7 20.2 89.8 19.3 89.4 C 18.5 89 17.8 87.9 17.4 87.2 C 16.9 86.6 17.2 86 16.8 85.4 C 16.4 84.8 15.3 84.3 14.8 83.6 C 14.3 83 13.5 81.9 13.7 81.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.1 89.6 Q 23.2 86.1 16.9 83.6 Q 22.7 87.1 29.1 89.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 46.5 74 C 46.7 74.6 45.7 75.7 45.1 76.5 C 44.5 77.2 43.2 77.6 42.7 78.3 C 42.2 78.9 42.4 79.6 41.9 80.4 C 41.4 81.1 40.4 82.3 39.5 82.7 C 38.5 83 37 82.7 36.2 82.5 C 35.3 82.3 35 81.5 34.2 81.4 C 33.4 81.2 32.2 81.7 31.2 81.5 C 30.3 81.4 28.7 81.1 28.5 80.5 C 28.3 80 29.3 78.8 29.9 78.1 C 30.6 77.4 31.8 76.9 32.3 76.3 C 32.9 75.6 32.6 74.9 33.1 74.1 C 33.7 73.4 34.6 72.2 35.5 71.9 C 36.5 71.5 38 71.8 38.9 72 C 39.8 72.3 40 73 40.8 73.2 C 41.7 73.3 42.9 72.9 43.8 73 C 44.8 73.1 46.3 73.4 46.5 74 Z', from: 5 },
        { tone: 'stemshade', d: 'M 44.2 73.5 C 44.4 73.9 43.5 74.9 42.9 75.4 C 42.4 76 41.4 76.4 40.9 76.9 C 40.4 77.4 40.7 78 40.2 78.6 C 39.7 79.1 38.9 80.1 38.1 80.4 C 37.3 80.7 36.1 80.5 35.4 80.3 C 34.6 80.2 34.4 79.6 33.8 79.5 C 33.1 79.4 32 79.8 31.3 79.7 C 30.5 79.6 29.2 79.4 29 79 C 28.9 78.6 29.7 77.6 30.3 77 C 30.8 76.5 31.9 76.1 32.3 75.6 C 32.8 75.1 32.6 74.5 33 73.9 C 33.5 73.3 34.3 72.4 35.1 72.1 C 35.9 71.8 37.1 72 37.9 72.2 C 38.6 72.3 38.8 72.9 39.5 73 C 40.2 73.1 41.2 72.7 42 72.8 C 42.8 72.9 44 73 44.2 73.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.9 79.7 Q 37.1 78 42.9 75.3 Q 36.7 77 30.9 79.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 13.9 68.6 C 14 68 15.4 67.6 16.2 67.3 C 17.1 67.1 18.3 67.3 19 67.1 C 19.8 66.8 19.9 66.1 20.7 65.8 C 21.5 65.5 22.9 65 23.8 65.2 C 24.7 65.4 25.7 66.4 26.3 67 C 26.9 67.6 26.8 68.3 27.3 68.8 C 27.9 69.4 29.1 69.6 29.8 70.2 C 30.5 70.8 31.6 71.8 31.5 72.3 C 31.3 72.9 29.9 73.3 29.1 73.6 C 28.2 73.8 27 73.6 26.3 73.8 C 25.5 74.1 25.4 74.8 24.6 75.1 C 23.8 75.4 22.5 75.9 21.5 75.7 C 20.6 75.5 19.6 74.5 19 73.9 C 18.4 73.3 18.6 72.6 18 72 C 17.4 71.5 16.2 71.3 15.5 70.7 C 14.8 70.1 13.7 69.1 13.9 68.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 14.4 67.9 C 14.5 67.5 15.7 67.2 16.4 67 C 17.1 66.8 18.1 67 18.7 66.8 C 19.4 66.6 19.5 66.1 20.1 65.9 C 20.8 65.6 21.9 65.3 22.7 65.4 C 23.5 65.6 24.3 66.4 24.8 66.9 C 25.3 67.3 25.2 67.9 25.7 68.3 C 26.2 68.7 27.2 68.9 27.8 69.4 C 28.4 69.9 29.3 70.6 29.2 71.1 C 29.1 71.5 28 71.8 27.2 72 C 26.5 72.2 25.5 71.9 24.9 72.1 C 24.3 72.3 24.2 72.9 23.5 73.1 C 22.9 73.3 21.7 73.7 21 73.5 C 20.2 73.4 19.3 72.6 18.8 72.1 C 18.3 71.6 18.4 71.1 17.9 70.7 C 17.4 70.2 16.4 70 15.8 69.6 C 15.3 69.1 14.3 68.3 14.4 67.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.1 71.8 Q 23.4 70 17.4 69.3 Q 23.1 71.1 29.1 71.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 45.1 60.8 C 45.2 61.3 44.1 62.2 43.5 62.8 C 42.9 63.3 41.8 63.5 41.2 64 C 40.7 64.5 40.8 65.2 40.3 65.8 C 39.7 66.4 38.8 67.3 37.9 67.5 C 37 67.7 35.8 67.2 35 66.9 C 34.3 66.6 34.2 65.9 33.5 65.7 C 32.8 65.5 31.7 65.7 30.9 65.5 C 30 65.2 28.7 64.8 28.6 64.3 C 28.5 63.8 29.5 62.9 30.2 62.3 C 30.8 61.8 31.9 61.5 32.5 61 C 33 60.5 32.9 59.9 33.4 59.3 C 34 58.7 34.9 57.8 35.8 57.6 C 36.7 57.4 37.9 57.9 38.7 58.2 C 39.4 58.5 39.5 59.2 40.2 59.4 C 40.9 59.6 42 59.4 42.8 59.6 C 43.6 59.9 45 60.3 45.1 60.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 43 60.2 C 43 60.6 42.2 61.3 41.6 61.7 C 41.1 62.2 40.1 62.3 39.7 62.7 C 39.2 63.1 39.3 63.6 38.9 64.1 C 38.4 64.5 37.6 65.3 36.9 65.4 C 36.1 65.6 35.1 65.2 34.5 65 C 33.9 64.8 33.8 64.3 33.2 64.1 C 32.6 64 31.7 64.2 31 64 C 30.3 63.8 29.2 63.5 29.2 63.1 C 29.1 62.7 29.9 62 30.5 61.6 C 31 61.2 32 61 32.4 60.6 C 32.9 60.2 32.8 59.7 33.2 59.2 C 33.7 58.8 34.5 58 35.3 57.9 C 36 57.7 37 58.1 37.6 58.3 C 38.3 58.5 38.4 59 38.9 59.2 C 39.5 59.4 40.4 59.2 41.1 59.3 C 41.8 59.5 42.9 59.8 43 60.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.8 63.8 Q 36.4 63.2 41.8 61.5 Q 36.2 62.1 30.8 63.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 27 42 C 27.5 41.9 28.4 42.9 28.9 43.5 C 29.4 44.1 29.6 45.1 30 45.6 C 30.5 46.1 31.1 45.9 31.7 46.5 C 32.2 47 33.1 47.9 33.2 48.7 C 33.4 49.5 33 50.6 32.7 51.3 C 32.4 52 31.8 52.1 31.6 52.8 C 31.3 53.4 31.6 54.5 31.4 55.2 C 31.1 56 30.8 57.2 30.3 57.3 C 29.8 57.4 28.9 56.4 28.4 55.8 C 27.9 55.2 27.7 54.2 27.3 53.7 C 26.8 53.2 26.2 53.3 25.6 52.8 C 25.1 52.3 24.2 51.4 24.1 50.6 C 23.9 49.8 24.3 48.6 24.6 48 C 24.9 47.3 25.5 47.2 25.7 46.5 C 25.9 45.9 25.7 44.8 25.9 44.1 C 26.2 43.3 26.5 42.1 27 42 Z', from: 5 },
        { tone: 'stemlight', d: 'M 26.6 42.4 C 26.9 42.3 27.6 43.1 28 43.6 C 28.4 44.1 28.6 45 28.9 45.4 C 29.3 45.9 29.8 45.8 30.2 46.2 C 30.6 46.6 31.3 47.4 31.4 48.1 C 31.6 48.8 31.3 49.7 31 50.3 C 30.8 50.9 30.4 50.9 30.2 51.5 C 30 52 30.2 52.9 30.1 53.5 C 29.9 54.1 29.6 55.1 29.3 55.2 C 28.9 55.3 28.2 54.5 27.8 54 C 27.4 53.5 27.3 52.6 26.9 52.2 C 26.5 51.8 26.1 51.9 25.6 51.4 C 25.2 51 24.5 50.2 24.4 49.6 C 24.3 48.9 24.6 47.9 24.8 47.3 C 25 46.8 25.5 46.7 25.6 46.1 C 25.8 45.6 25.6 44.7 25.7 44.1 C 25.9 43.5 26.2 42.5 26.6 42.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.8 55.2 Q 29.3 50 27.7 45.1 Q 28.2 50.3 29.8 55.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 34.1 39.4 C 34.5 39.6 34.8 40.7 34.9 41.4 C 35 42.2 34.7 43.1 34.8 43.7 C 35 44.3 35.5 44.5 35.7 45.1 C 35.9 45.8 36.2 46.9 36 47.6 C 35.7 48.4 34.8 49.1 34.3 49.5 C 33.8 49.9 33.2 49.7 32.7 50.2 C 32.3 50.6 32 51.5 31.5 52 C 30.9 52.5 30.1 53.3 29.6 53.1 C 29.2 53 29 51.8 28.8 51.1 C 28.7 50.4 29 49.5 28.9 48.9 C 28.7 48.3 28.2 48.1 28 47.4 C 27.8 46.8 27.5 45.7 27.7 45 C 28 44.2 28.9 43.5 29.4 43.1 C 29.9 42.7 30.5 42.9 31 42.4 C 31.4 42 31.7 41.1 32.3 40.6 C 32.8 40.1 33.6 39.3 34.1 39.4 Z', from: 5 },
        { tone: 'stemlight', d: 'M 33 39.8 C 33.4 39.9 33.5 40.8 33.6 41.4 C 33.7 42 33.4 42.8 33.5 43.3 C 33.6 43.8 34.1 43.9 34.2 44.5 C 34.3 45 34.5 45.9 34.3 46.6 C 34.1 47.2 33.4 47.8 33 48.2 C 32.6 48.5 32.2 48.4 31.8 48.7 C 31.4 49.1 31.2 49.9 30.7 50.3 C 30.3 50.7 29.6 51.4 29.3 51.3 C 29 51.2 28.8 50.2 28.7 49.6 C 28.6 49 28.9 48.3 28.8 47.8 C 28.7 47.2 28.3 47.1 28.2 46.6 C 28 46 27.8 45.1 28 44.5 C 28.2 43.9 28.9 43.3 29.3 42.9 C 29.8 42.5 30.2 42.7 30.6 42.3 C 30.9 42 31.2 41.2 31.6 40.8 C 32 40.3 32.7 39.7 33 39.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 51.3 Q 32.2 46.9 33.2 42.2 Q 31.2 46.6 30.2 51.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 22.2 40.7 C 22.5 40.5 23.6 40.8 24.2 41.1 C 24.8 41.3 25.3 42 25.9 42.2 C 26.4 42.4 26.8 42 27.4 42.2 C 28 42.4 29 42.7 29.5 43.2 C 29.9 43.8 30.1 44.8 30.2 45.4 C 30.2 46.1 29.8 46.4 29.9 47 C 30 47.5 30.6 48.2 30.7 48.9 C 30.8 49.5 31 50.6 30.7 50.8 C 30.4 51.1 29.4 50.7 28.8 50.5 C 28.2 50.2 27.6 49.6 27 49.4 C 26.5 49.2 26.1 49.5 25.5 49.4 C 24.9 49.2 23.9 48.9 23.4 48.3 C 23 47.8 22.8 46.8 22.8 46.1 C 22.7 45.5 23.1 45.2 23 44.6 C 22.9 44 22.4 43.4 22.2 42.7 C 22.1 42.1 21.9 41 22.2 40.7 Z', from: 5 },
        { tone: 'stemlight', d: 'M 22.3 40.8 C 22.5 40.6 23.3 41 23.8 41.2 C 24.3 41.4 24.8 42 25.3 42.2 C 25.7 42.3 26 42.1 26.5 42.2 C 27 42.4 27.8 42.7 28.2 43.1 C 28.5 43.6 28.7 44.4 28.8 44.9 C 28.8 45.4 28.5 45.7 28.6 46.2 C 28.7 46.6 29.2 47.2 29.3 47.7 C 29.5 48.3 29.7 49.1 29.4 49.3 C 29.2 49.5 28.3 49.2 27.8 49 C 27.3 48.8 26.9 48.2 26.4 48 C 26 47.8 25.7 48.1 25.2 47.9 C 24.7 47.8 23.9 47.5 23.5 47 C 23.1 46.6 23 45.7 22.9 45.2 C 22.8 44.7 23.2 44.5 23.1 44 C 23 43.5 22.5 43 22.4 42.4 C 22.2 41.9 22 41 22.3 40.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.6 49.5 Q 27.2 45.8 23.9 42.8 Q 26.3 46.5 29.6 49.5 Z', from: 5 },
        { tone: 'deep', d: 'M 17.6 69.1 C 19.1 68.9 20.9 69.2 22.3 70 C 23.7 70.8 25.3 72.6 26.2 74.1 C 27.1 75.7 27.9 77.6 27.8 79.3 C 27.7 81.1 26.8 83.5 25.5 84.8 C 24.3 86.1 22.2 86.6 20.4 86.9 C 18.6 87.2 16.4 87.3 14.9 86.5 C 13.3 85.7 11.7 83.6 11.1 82 C 10.4 80.3 10.5 78.3 10.9 76.5 C 11.3 74.8 12.3 72.7 13.4 71.4 C 14.5 70.2 16.1 69.3 17.6 69.1 Z', from: 5 },
        { tone: 'base', d: 'M 16.9 69.5 C 18.2 69.3 19.7 69.6 20.9 70.3 C 22.1 71 23.4 72.4 24.2 73.7 C 24.9 75 25.6 76.6 25.5 78.1 C 25.4 79.6 24.6 81.6 23.6 82.7 C 22.6 83.8 20.8 84.2 19.3 84.4 C 17.8 84.7 16 84.8 14.6 84.1 C 13.3 83.4 12 81.7 11.4 80.3 C 10.9 78.9 11 77.2 11.3 75.8 C 11.7 74.3 12.5 72.5 13.4 71.5 C 14.3 70.4 15.7 69.7 16.9 69.5 Z', from: 5 },
        { tone: 'light', d: 'M 13.6 73.5 Q 12 79.8 15.4 83.4 Q 15.2 78.5 16.3 73.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 19 64.3 L 20.4 67.8 L 24.1 68.1 L 21.3 70.5 L 22.2 74.1 L 19 72.1 L 15.8 74.1 L 16.7 70.5 L 13.9 68.1 L 17.6 67.8 Z', from: 5 },
        { tone: 'stem', d: 'M 18.4 65.2 L 19.3 67.7 L 22 67.8 L 19.9 69.5 L 20.6 72.1 L 18.4 70.7 L 16.1 72.1 L 16.8 69.5 L 14.8 67.8 L 17.4 67.7 Z', from: 5 },
        { tone: 'stemdark', d: 'M 19.2 61.6 Q 19.3 65.6 19.6 69.7 L 18.4 69.8 Q 17.9 65.7 17.6 61.7 Z', from: 5 },
        { tone: 'deep', d: 'M 42.2 65.7 C 43.6 65.9 45.1 66.6 46.1 67.8 C 47.2 68.9 48.1 70.9 48.5 72.5 C 48.9 74.1 49.1 76 48.5 77.6 C 47.9 79.2 46.4 81.1 45 81.9 C 43.5 82.6 41.5 82.6 39.8 82.3 C 38.2 82.1 36.2 81.6 35 80.5 C 33.8 79.3 33 77.1 32.8 75.4 C 32.7 73.7 33.4 72 34.2 70.5 C 35 69 36.5 67.4 37.8 66.6 C 39.1 65.8 40.8 65.5 42.2 65.7 Z', from: 5 },
        { tone: 'base', d: 'M 41.2 66.1 C 42.3 66.2 43.6 66.9 44.5 67.8 C 45.4 68.8 46.1 70.4 46.5 71.8 C 46.8 73.2 46.9 74.8 46.4 76.1 C 45.9 77.4 44.7 79 43.5 79.6 C 42.3 80.3 40.6 80.2 39.2 80 C 37.8 79.8 36.1 79.4 35.1 78.5 C 34.2 77.5 33.4 75.6 33.3 74.2 C 33.2 72.8 33.8 71.3 34.5 70.1 C 35.1 68.9 36.4 67.5 37.5 66.8 C 38.6 66.2 40 65.9 41.2 66.1 Z', from: 5 },
        { tone: 'light', d: 'M 36 69.8 Q 34.4 75.7 37.6 79 Q 37.5 74.4 38.5 69.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 41 61.2 L 42.3 64.5 L 45.8 64.7 L 43.1 67 L 44 70.3 L 41 68.5 L 38 70.3 L 38.9 67 L 36.2 64.7 L 39.7 64.5 Z', from: 5 },
        { tone: 'stem', d: 'M 40.4 62.1 L 41.3 64.3 L 43.8 64.5 L 41.9 66.1 L 42.5 68.5 L 40.4 67.2 L 38.3 68.5 L 38.9 66.1 L 37.1 64.5 L 39.5 64.3 Z', from: 5 },
        { tone: 'stemdark', d: 'M 41.2 58.6 Q 41.3 62.4 41.6 66.2 L 40.4 66.3 Q 39.9 62.6 39.6 58.8 Z', from: 5 }
      ]
    },
    garlic: {
      trunk: 'M 28.4 96 Q 29.2 92 28.7 88 L 31.3 88 Q 30.8 92 31.6 96 Z',
      trunkShort: 'M 28.6 96 Q 29.3 93.5 28.8 91 L 31.2 91 Q 30.7 93.5 31.4 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[30, 84], [24, 86], [36, 86], [30, 74], [22, 76], [38, 78], [30, 62], [16, 68], [44, 70]],
      parts: [
        { tone: 'soil-deep', d: 'M 21 96 Q 24.4 92.5 30 92.5 Q 35.6 92.5 39 96 Z', from: 2, to: 2 },
        { tone: 'soil', d: 'M 22.1 96 Q 25.3 93.1 29.6 93 Q 32.7 93.3 35.4 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 28 95 Q 26.7 86.1 20 78 Q 22.6 88 28 95 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 27.6 94.4 Q 25.3 85.9 19.4 77.4 Q 22.8 87 27.6 94.4 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 32 95 Q 37.8 89.2 40 80 Q 34.2 87.3 32 95 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 31.6 94.4 Q 36.5 88.2 39.4 79.4 Q 34.3 87 31.6 94.4 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 26 88 Q 25.9 92.3 30 93 Q 34.1 92.3 34 88 Q 32 84.4 30 83.7 Q 28 84.4 26 88 Z', from: 2, to: 2 },
        { tone: 'bulb', d: 'M 26.6 88 Q 26.5 91.7 29.6 92.3 Q 33.3 91.5 33.2 87.7 Q 31.6 84.6 29.7 84.1 Q 28.1 84.7 26.6 88 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 27.3 87.5 Q 27.1 90.5 28.3 91.7 Q 28.8 89 29 85 Q 28 85.5 27.3 87.5 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 29.2 84.7 Q 27.5 88.2 27.2 92 Q 28.8 88.5 29.2 84.7 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 30 84.7 Q 29.3 88.4 30 92 Q 30.7 88.4 30 84.7 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 30.8 84.7 Q 31.2 88.5 32.8 92 Q 32.5 88.2 30.8 84.7 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 29.3 83.7 Q 29.6 82.6 29.6 81.5 L 30.4 81.5 Q 30.7 82.6 30.7 83.7 Z', from: 2, to: 2 },
        { tone: 'soil-deep', d: 'M 19 96 Q 23.2 91.5 30 91.5 Q 36.8 91.5 41 96 Z', from: 3, to: 3 },
        { tone: 'soil', d: 'M 20.3 96 Q 24.3 92.2 29.6 92.1 Q 33.3 92.5 36.6 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 27 95 Q 24.7 82.3 16 70 Q 20 84.4 27 95 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 26.6 94.4 Q 23.1 82.1 15.4 69.4 Q 20.3 83.4 26.6 94.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 33 95 Q 40.5 86.6 44 74 Q 36.3 84.4 33 95 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 32.6 94.4 Q 39.1 85.5 43.4 73.4 Q 36.5 84.2 32.6 94.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 95 Q 32.6 81.7 30 66 Q 28.1 81.7 30 95 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.6 94.4 Q 31.1 81 29.4 65.4 Q 28.4 81.1 29.6 94.4 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 24.6 85 Q 24.5 90.7 30 91.6 Q 35.5 90.7 35.4 85 Q 32.7 80.2 30 79.3 Q 27.3 80.2 24.6 85 Z', from: 3, to: 3 },
        { tone: 'bulb', d: 'M 25.4 85 Q 25.2 89.9 29.6 90.7 Q 34.4 89.6 34.3 84.6 Q 32.2 80.5 29.7 79.9 Q 27.4 80.6 25.4 85 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 26.3 84.3 Q 26.1 88.3 27.7 89.9 Q 28.4 86.3 28.6 81 Q 27.3 81.7 26.3 84.3 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 28.9 80.6 Q 26.9 85.3 26.2 90.3 Q 28.2 85.6 28.9 80.6 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 30 80.6 Q 29.3 85.5 30 90.3 Q 30.7 85.5 30 80.6 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 31.1 80.6 Q 31.8 85.6 33.8 90.3 Q 33.1 85.3 31.1 80.6 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 29 79.3 Q 29.4 77.9 29.4 76.4 L 30.6 76.4 Q 31 77.9 31 79.3 Z', from: 3, to: 3 },
        { tone: 'soil-deep', d: 'M 18 96 Q 22.6 91 30 91 Q 37.4 91 42 96 Z', from: 4, to: 4 },
        { tone: 'soil', d: 'M 19.4 96 Q 23.8 91.8 29.5 91.7 Q 33.6 92.1 37.2 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 27 95 Q 23.5 78.6 13 62 Q 18.4 80.7 27 95 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 26.6 94.4 Q 21.9 78.4 12.4 61.4 Q 18.8 79.7 26.6 94.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33 95 Q 42.1 83 47 66 Q 37.5 80.7 33 95 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 32.6 94.4 Q 40.6 81.8 46.4 65.4 Q 37.8 80.5 32.6 94.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 95 Q 30.9 76.8 26 56 Q 26.2 77.3 30 95 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.6 94.4 Q 29.4 76.3 25.4 55.4 Q 26.5 76.6 29.6 94.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31 95 Q 36.3 78.4 37 58 Q 31.9 77.7 31 95 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.6 94.4 Q 34.8 77.6 36.4 57.4 Q 32.2 77.2 30.6 94.4 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 23.4 82 Q 23.3 88.9 30 90 Q 36.7 88.9 36.6 82 Q 33.3 76.2 30 75.1 Q 26.7 76.2 23.4 82 Z', from: 4, to: 4 },
        { tone: 'bulb', d: 'M 24.3 82 Q 24.2 87.9 29.6 88.9 Q 35.4 87.6 35.3 81.5 Q 32.6 76.6 29.7 75.8 Q 26.8 76.7 24.3 82 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 25.5 81.2 Q 25.2 86 27.2 87.9 Q 28 83.6 28.3 77.2 Q 26.7 78 25.5 81.2 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 28.6 76.7 Q 26.3 82.4 25.3 88.4 Q 27.6 82.7 28.6 76.7 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 30 76.7 Q 29.3 82.6 30 88.4 Q 30.7 82.6 30 76.7 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 31.4 76.7 Q 32.4 82.7 34.7 88.4 Q 33.7 82.4 31.4 76.7 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 28.8 75.1 Q 29.3 73.4 29.3 71.6 L 30.7 71.6 Q 31.2 73.4 31.2 75.1 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.8 73.1 C 29.7 72.4 24.5 70.2 24.6 68.5 C 24.8 66.8 29.4 63 31.4 62.8 C 33.5 62.7 37 66.2 37.2 67.8 C 37.3 69.4 33.3 71.6 32.6 72.4 L 33 72.8 C 33.9 72 38.5 69.5 38.2 67.6 C 38 65.7 33.9 61.2 31.4 61.4 C 28.8 61.5 23.1 66 22.8 68.3 C 22.4 70.5 28.2 73.8 29.2 74.9 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30 73.3 C 28.9 72.4 23.6 70 23.8 68.1 C 23.9 66.2 28.8 62.2 31.1 62.1 C 33.3 62 36.9 65.7 37.1 67.4 C 37.3 69.1 33.1 71.3 32.3 72.1 L 32.6 72.4 C 33.4 71.5 37.8 69.1 37.6 67.3 C 37.3 65.5 33.5 61.3 31 61.4 C 28.6 61.5 23.2 65.9 22.9 68 C 22.7 70.1 28.3 73 29.3 74 Z', from: 4, to: 4 },
        { tone: 'bulb', d: 'M 34.9 72.6 C 34.9 72.9 34.7 73.3 34.6 73.6 C 34.4 73.9 34.2 74 34 74.3 C 33.8 74.5 33.7 74.8 33.5 75 C 33.3 75.2 33 75.5 32.8 75.5 C 32.6 75.5 32.3 75.2 32.1 75 C 31.9 74.8 31.8 74.5 31.6 74.3 C 31.4 74 31.2 73.9 31 73.6 C 30.9 73.3 30.7 72.9 30.7 72.6 C 30.7 72.3 30.9 71.9 31 71.6 C 31.2 71.3 31.4 71.2 31.6 70.9 C 31.8 70.7 31.9 70.4 32.1 70.2 C 32.3 70 32.6 69.7 32.8 69.7 C 33 69.7 33.3 70 33.5 70.2 C 33.7 70.4 33.8 70.7 34 70.9 C 34.2 71.2 34.4 71.3 34.6 71.6 C 34.7 71.9 34.9 72.3 34.9 72.6 Z', from: 4, to: 4 },
        { tone: 'soil-deep', d: 'M 17 96 Q 21.9 90.5 30 90.5 Q 38.1 90.5 43 96 Z', from: 5 },
        { tone: 'soil', d: 'M 18.6 96 Q 23.2 91.4 29.5 91.3 Q 33.9 91.7 37.8 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 27 95 Q 22.8 75.8 11 56 Q 17.4 78 27 95 Z', from: 5 },
        { tone: 'stemlight', d: 'M 26.6 94.4 Q 21.1 75.6 10.4 55.4 Q 17.8 77 26.6 94.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33 95 Q 43.3 80.2 49 60 Q 38.3 77.9 33 95 Z', from: 5 },
        { tone: 'stemlight', d: 'M 32.6 94.4 Q 41.6 79.1 48.4 59.4 Q 38.6 77.7 32.6 94.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 95 Q 29.7 72.9 23 48 Q 24.6 73.7 30 95 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.6 94.4 Q 28.1 72.5 22.4 47.4 Q 25 73 29.6 94.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31 95 Q 37.4 74.8 39 50 Q 32.7 73.9 31 95 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.6 94.4 Q 35.9 74 38.4 49.4 Q 33 73.5 30.6 94.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29 95 Q 32.1 71.6 30 44 Q 27.6 71.5 29 95 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.6 94.4 Q 30.5 70.9 29.4 43.4 Q 27.8 70.9 28.6 94.4 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 22.4 80 Q 22.2 87.9 30 89.2 Q 37.8 87.9 37.6 80 Q 33.8 73.4 30 72.1 Q 26.2 73.4 22.4 80 Z', from: 5 },
        { tone: 'bulb', d: 'M 23.5 80 Q 23.3 86.8 29.6 87.9 Q 36.2 86.4 36.1 79.4 Q 33 73.7 29.7 72.8 Q 26.4 73.9 23.5 80 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 24.8 79.1 Q 24.5 84.6 26.8 86.8 Q 27.7 81.8 28 74.5 Q 26.2 75.4 24.8 79.1 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 28.4 73.9 Q 25.9 80.5 24.6 87.4 Q 27.1 80.8 28.4 73.9 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 30 73.9 Q 29.3 80.6 30 87.4 Q 30.7 80.6 30 73.9 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 31.6 73.9 Q 32.9 80.8 35.4 87.4 Q 34.1 80.5 31.6 73.9 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 28.6 72.1 Q 29.2 70.1 29.2 68 L 30.8 68 Q 31.4 70.1 31.4 72.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.8 67.1 C 29.5 66.2 23.1 63.5 23.3 61.3 C 23.5 59.2 29.2 54.4 31.7 54.3 C 34.3 54.1 38.6 58.5 38.8 60.4 C 39 62.4 34.1 65.1 33.2 66.1 L 33.6 66.5 C 34.7 65.5 40.2 62.6 39.9 60.3 C 39.6 58 34.7 52.7 31.7 52.8 C 28.6 52.9 21.8 58.4 21.4 61.1 C 21 63.8 27.9 67.6 29.2 68.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30 67.3 C 28.7 66.2 22.2 63.2 22.4 60.9 C 22.6 58.6 28.6 53.7 31.4 53.5 C 34.1 53.4 38.5 58 38.8 60 C 39 62.1 33.9 64.9 32.9 65.8 L 33.2 66.1 C 34.2 65 39.5 62.2 39.2 60 C 38.9 57.8 34.3 52.7 31.3 52.9 C 28.4 53 21.9 58.3 21.6 60.8 C 21.3 63.3 28 66.8 29.3 68 Z', from: 5 },
        { tone: 'bulb', d: 'M 35.5 66.3 C 35.5 66.6 35.3 67 35.2 67.3 C 35 67.6 34.8 67.7 34.6 68 C 34.4 68.2 34.3 68.5 34.1 68.7 C 33.9 68.9 33.6 69.2 33.4 69.2 C 33.2 69.2 32.9 68.9 32.7 68.7 C 32.5 68.5 32.4 68.2 32.2 68 C 32 67.7 31.8 67.6 31.6 67.3 C 31.5 67 31.3 66.6 31.3 66.3 C 31.3 66 31.5 65.6 31.6 65.3 C 31.8 65 32 64.9 32.2 64.6 C 32.4 64.4 32.5 64.1 32.7 63.9 C 32.9 63.7 33.2 63.4 33.4 63.4 C 33.6 63.4 33.9 63.7 34.1 63.9 C 34.3 64.1 34.4 64.4 34.6 64.6 C 34.8 64.9 35 65 35.2 65.3 C 35.3 65.6 35.5 66 35.5 66.3 Z', from: 5 }
      ]
    },
    ginseng: {
      trunk: 'M 28.2 96 Q 29.1 86 28.7 76 L 31.3 76 Q 30.9 86 31.8 96 Z',
      trunkShort: 'M 28.5 96 Q 29.3 92 28.8 88 L 31.2 88 Q 30.8 92 31.5 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[30, 56], [25, 58], [35, 58], [30, 50], [26, 52], [34, 52], [22, 62], [38, 62], [30, 64]],
      parts: [
        { tone: 'soil-deep', d: 'M 19 96 Q 23.2 91 30 91 Q 36.8 91 41 96 Z', from: 2, to: 2 },
        { tone: 'soil', d: 'M 20.3 96 Q 24.3 91.8 29.6 91.7 Q 33.3 92.1 36.6 96 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 31.6 88 Q 30.6 91.5 30.6 95 L 29.4 95 Q 28.4 91.5 28.4 88 Z', from: 2, to: 2 },
        { tone: 'bulb', d: 'M 30.6 88.6 Q 29.8 91.6 29.8 94.6 L 29 94.6 Q 28.2 91.6 28.2 88.6 Z', from: 2, to: 2 },
        { tone: 'bulb-light', d: 'M 29.2 89 Q 29.1 91.3 29.2 93.6 L 28.9 93.6 Q 28.6 91.3 28.5 89 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 27.3 89.6 Q 29.8 90.3 32.4 90.2 Q 29.9 89.5 27.3 89.6 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 27.3 91.2 Q 29.8 91.9 32.4 91.8 Q 29.9 91.1 27.3 91.2 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 27.3 92.8 Q 29.8 93.5 32.4 93.4 Q 29.9 92.7 27.3 92.8 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 30 88 Q 26.5 84.9 21.3 86.2 Q 25.6 89 30 88 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 29.5 87.9 Q 26.1 86.9 22.5 86.5 Q 25.9 87.5 29.5 87.9 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 30 88 Q 32.3 84.7 30 80.8 Q 28.1 84.7 30 88 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 30 87.6 Q 30.3 84.7 30 81.8 Q 29.7 84.7 30 87.6 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30 88 Q 34.5 89.5 38.7 86.2 Q 33.6 85.3 30 88 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.5 87.9 Q 34.1 87.5 37.5 86.5 Q 33.9 86.9 30.5 87.9 Z', from: 2, to: 2 },
        { tone: 'soil-deep', d: 'M 17 96 Q 21.9 90 30 90 Q 38.1 90 43 96 Z', from: 3, to: 3 },
        { tone: 'soil', d: 'M 18.6 96 Q 23.2 91 29.5 90.8 Q 33.9 91.3 37.8 96 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 32 86 Q 30.7 90.5 30.7 95 L 29.3 95 Q 28 90.5 28 86 Z', from: 3, to: 3 },
        { tone: 'bulb', d: 'M 30.9 86.6 Q 29.9 90.5 29.9 94.5 L 28.9 94.5 Q 27.9 90.5 27.9 86.6 Z', from: 3, to: 3 },
        { tone: 'bulb-light', d: 'M 29 87 Q 28.9 90.1 29 93.2 L 28.6 93.2 Q 28.3 90.1 28.2 87 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 30.6 90.3 Q 28.6 92.3 25.8 93.2 L 25.4 92.8 Q 27.9 91.4 29.4 88.9 Z', from: 3, to: 3 },
        { tone: 'bulb', d: 'M 30.4 89.7 Q 28.7 91.7 26.1 92.5 L 25.9 92.3 Q 28.2 91.1 29.6 88.7 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 30.5 88.9 Q 32.3 92.2 35.5 93.3 L 35.3 93.7 Q 31.6 93.1 29.5 90.3 Z', from: 3, to: 3 },
        { tone: 'bulb', d: 'M 30.4 88.7 Q 32 91.7 35.1 92.8 L 34.9 93 Q 31.5 92.3 29.6 89.7 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 26.6 88 Q 29.8 88.7 33 88.6 Q 29.8 87.9 26.6 88 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 26.6 90.1 Q 29.8 90.8 33 90.7 Q 29.8 90 26.6 90.1 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 26.6 92.1 Q 29.8 92.8 33 92.7 Q 29.8 92 26.6 92.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30 84 Q 24.9 79.5 17.4 81.4 Q 23.7 85.5 30 84 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.2 83.8 Q 24.3 82.3 19.2 81.8 Q 24.1 83.3 29.2 83.8 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30 84 Q 28.8 77.9 22 75.8 Q 24.4 82.1 30 84 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.5 83.5 Q 26.7 79.9 23.1 76.9 Q 26 80.5 29.5 83.5 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30 84 Q 33.4 79.2 30 73.6 Q 27.3 79.2 30 84 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 30 83.4 Q 30.5 79.2 30 75.1 Q 29.5 79.2 30 83.4 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 30 84 Q 36.1 82.6 38 75.8 Q 31.7 78.3 30 84 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.5 83.5 Q 34 80.5 36.9 76.9 Q 33.3 79.9 30.5 83.5 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 84 Q 36.5 86.1 42.6 81.4 Q 35.2 80.2 30 84 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.8 83.8 Q 35.9 83.3 40.8 81.8 Q 35.7 82.3 30.8 83.8 Z', from: 3, to: 3 },
        { tone: 'soil-deep', d: 'M 16 96 Q 21.3 89.5 30 89.5 Q 38.7 89.5 44 96 Z', from: 4, to: 4 },
        { tone: 'soil', d: 'M 17.7 96 Q 22.7 90.5 29.4 90.4 Q 34.2 90.9 38.4 96 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 32.4 84 Q 30.8 89.5 30.8 95 L 29.2 95 Q 27.6 89.5 27.6 84 Z', from: 4, to: 4 },
        { tone: 'bulb', d: 'M 31.2 84.6 Q 30 89.5 30 94.3 L 28.8 94.3 Q 27.6 89.5 27.6 84.6 Z', from: 4, to: 4 },
        { tone: 'bulb-light', d: 'M 28.8 85 Q 28.7 88.9 28.8 92.8 L 28.3 92.8 Q 27.9 88.9 27.8 85 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 30.7 89.3 Q 28.6 91.1 25.8 92 L 25.4 91.6 Q 27.8 90 29.3 87.5 Z', from: 4, to: 4 },
        { tone: 'bulb', d: 'M 30.4 88.6 Q 28.8 90.5 26.1 91.4 L 25.9 91 Q 28.2 89.8 29.6 87.4 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 30.6 87.5 Q 32.3 90.9 35.6 92.1 L 35.2 92.5 Q 31.5 92 29.4 89.3 Z', from: 4, to: 4 },
        { tone: 'bulb', d: 'M 30.4 87.4 Q 32 90.5 35.1 91.5 L 34.9 91.9 Q 31.5 91.2 29.6 88.6 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 25.9 86.5 Q 29.7 87.2 33.6 87.1 Q 29.8 86.4 25.9 86.5 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 25.9 89 Q 29.7 89.7 33.6 89.6 Q 29.8 88.9 25.9 89 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 25.9 91.5 Q 29.7 92.2 33.6 92.1 Q 29.8 91.4 25.9 91.5 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30 80 Q 23.7 74.5 14.5 76.8 Q 22.2 81.8 30 80 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.1 79.8 Q 23 78 16.7 77.3 Q 22.8 79.1 29.1 79.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30 80 Q 27.3 72.6 18.6 71 Q 22.7 78.5 30 80 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.3 79.5 Q 25.1 75.4 20.2 72.3 Q 24.4 76.3 29.3 79.5 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30 80 Q 32 73 25.8 67.6 Q 24.9 75.4 30 80 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.7 79.3 Q 28.6 74.1 26.4 69.4 Q 27.5 74.5 29.7 79.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30 80 Q 35.9 75.6 34.2 67.6 Q 28.8 73.3 30 80 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30.3 79.3 Q 32.5 74.5 33.6 69.4 Q 31.4 74.1 30.3 79.3 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30 80 Q 37.8 79.1 41.4 71 Q 33.2 73.3 30 80 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.7 79.5 Q 35.6 76.3 39.8 72.3 Q 34.9 75.4 30.7 79.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 80 Q 38 82.6 45.5 76.8 Q 36.5 75.3 30 80 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.9 79.8 Q 37.2 79.1 43.3 77.3 Q 37 78 30.9 79.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.3 74 Q 29.5 70.5 29.5 67 L 30.5 67 Q 30.7 70.5 30.7 74 Z', from: 4, to: 4 },
        { tone: 'deep', c: [33, 67.3, 1.8], from: 4, to: 4 },
        { tone: 'base', c: [32.8, 67.1, 1.4], from: 4, to: 4 },
        { tone: 'light', c: [32.4, 66.7, 0.5], from: 4, to: 4 },
        { tone: 'deep', c: [29.7, 67.5, 1.8], from: 4, to: 4 },
        { tone: 'base', c: [29.5, 67.3, 1.4], from: 4, to: 4 },
        { tone: 'light', c: [29.1, 66.9, 0.5], from: 4, to: 4 },
        { tone: 'deep', c: [26.6, 66.3, 1.8], from: 4, to: 4 },
        { tone: 'base', c: [26.5, 66.1, 1.4], from: 4, to: 4 },
        { tone: 'light', c: [26.1, 65.8, 0.5], from: 4, to: 4 },
        { tone: 'deep', c: [29.2, 64.6, 1.8], from: 4, to: 4 },
        { tone: 'base', c: [29, 64.4, 1.4], from: 4, to: 4 },
        { tone: 'light', c: [28.6, 64.1, 0.5], from: 4, to: 4 },
        { tone: 'deep', c: [32.5, 64.1, 1.8], from: 4, to: 4 },
        { tone: 'base', c: [32.3, 63.9, 1.4], from: 4, to: 4 },
        { tone: 'light', c: [31.9, 63.6, 0.5], from: 4, to: 4 },
        { tone: 'soil-deep', d: 'M 15 96 Q 20.7 89 30 89 Q 39.3 89 45 96 Z', from: 5 },
        { tone: 'soil', d: 'M 16.8 96 Q 22.2 90.1 29.4 90 Q 34.5 90.5 39 96 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 33.2 82 Q 31.1 88.5 31.1 95 L 28.9 95 Q 26.8 88.5 26.8 82 Z', from: 5 },
        { tone: 'bulb', d: 'M 31.8 82.6 Q 30.2 88.4 30.2 94.2 L 28.6 94.2 Q 27 88.4 27 82.6 Z', from: 5 },
        { tone: 'bulb-light', d: 'M 28.4 83 Q 28.2 87.7 28.4 92.4 L 27.8 92.4 Q 27.2 87.7 27.1 83 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 30.9 88.3 Q 28.7 90 25.8 90.9 L 25.4 90.3 Q 27.5 88.6 29.1 86.1 Z', from: 5 },
        { tone: 'bulb', d: 'M 30.6 87.5 Q 28.8 89.4 26.2 90.2 L 25.8 89.8 Q 28 88.4 29.4 86.1 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 30.8 86 Q 32.3 89.6 35.6 90.8 L 35.2 91.4 Q 31.3 91.1 29.2 88.4 Z', from: 5 },
        { tone: 'bulb', d: 'M 30.6 86 Q 32.1 89.2 35.2 90.3 L 34.8 90.7 Q 31.3 90.2 29.4 87.6 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 24.6 85 Q 29.7 85.7 34.8 85.6 Q 29.7 84.9 24.6 85 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 24.6 87.9 Q 29.7 88.6 34.8 88.5 Q 29.7 87.8 24.6 87.9 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 24.6 90.9 Q 29.7 91.6 34.8 91.5 Q 29.7 90.8 24.6 90.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30 76 Q 22.5 69.4 11.6 72.2 Q 20.7 78.1 30 76 Z', from: 5 },
        { tone: 'stem', d: 'M 28.9 75.8 Q 21.7 73.6 14.2 72.7 Q 21.4 74.9 28.9 75.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30 76 Q 26 67.4 15.4 66.3 Q 21.1 74.8 30 76 Z', from: 5 },
        { tone: 'stem', d: 'M 29.1 75.4 Q 23.6 71 17.4 67.7 Q 22.9 72.1 29.1 75.4 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30 76 Q 30.5 67.2 21.9 62.2 Q 22.9 71.7 30 76 Z', from: 5 },
        { tone: 'stem', d: 'M 29.5 75.2 Q 26.9 69.3 23 64.2 Q 25.7 70 29.5 75.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30 76 Q 34.9 69 30 60.8 Q 26 69 30 76 Z', from: 5 },
        { tone: 'stem', d: 'M 30 75.1 Q 30.7 69 30 62.9 Q 29.3 69 30 75.1 Z', from: 5 },
        { tone: 'stem', d: 'M 30 76 Q 38 72.2 38.1 62.2 Q 30.3 67.7 30 76 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.5 75.2 Q 34.3 70 37 64.2 Q 33.1 69.3 30.5 75.2 Z', from: 5 },
        { tone: 'stem', d: 'M 30 76 Q 39.5 75.7 44.6 66.3 Q 34.6 68.2 30 76 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.9 75.4 Q 37.1 72.1 42.6 67.7 Q 36.4 71 30.9 75.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 76 Q 39.5 79.1 48.4 72.2 Q 37.7 70.4 30 76 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.1 75.8 Q 38.6 74.9 45.8 72.7 Q 38.3 73.6 31.1 75.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.3 64 Q 29.5 60.5 29.5 57 L 30.5 57 Q 30.7 60.5 30.7 64 Z', from: 5 },
        { tone: 'deep', c: [33.9, 57.7, 2.3], from: 5 },
        { tone: 'base', c: [33.6, 57.4, 1.8], from: 5 },
        { tone: 'light', c: [33.1, 56.9, 0.7], from: 5 },
        { tone: 'deep', c: [30.4, 57.9, 2.3], from: 5 },
        { tone: 'base', c: [30.2, 57.6, 1.8], from: 5 },
        { tone: 'light', c: [29.7, 57.2, 0.7], from: 5 },
        { tone: 'deep', c: [27.1, 58.6, 2.3], from: 5 },
        { tone: 'base', c: [26.9, 58.4, 1.8], from: 5 },
        { tone: 'light', c: [26.4, 57.9, 0.7], from: 5 },
        { tone: 'deep', c: [27.6, 55.9, 2.3], from: 5 },
        { tone: 'base', c: [27.4, 55.6, 1.8], from: 5 },
        { tone: 'light', c: [26.9, 55.2, 0.7], from: 5 },
        { tone: 'deep', c: [27.4, 53.1, 2.3], from: 5 },
        { tone: 'base', c: [27.2, 52.9, 1.8], from: 5 },
        { tone: 'light', c: [26.7, 52.4, 0.7], from: 5 },
        { tone: 'deep', c: [30.7, 54.1, 2.3], from: 5 },
        { tone: 'base', c: [30.4, 53.9, 1.8], from: 5 },
        { tone: 'light', c: [29.9, 53.4, 0.7], from: 5 },
        { tone: 'deep', c: [34.1, 54.6, 2.3], from: 5 },
        { tone: 'base', c: [33.8, 54.4, 1.8], from: 5 },
        { tone: 'light', c: [33.3, 53.9, 0.7], from: 5 }
      ]
    },
    grapes: {
      trunk: 'M 16.8 96 Q 17.9 79 17.2 62 L 20.8 62 Q 20.1 79 21.2 96 Z',
      trunkShort: 'M 16.8 96 Q 17.9 86 17.2 76 L 20.8 76 Q 20.1 86 21.2 96 Z',
      trunkTone: 'wood',
      blossoms: [[20, 58], [40, 56], [30, 66], [24, 50], [36, 49], [14, 62], [46, 60], [30, 42], [30, 76]],
      parts: [
        { tone: 'wood', d: 'M 16.8 96 Q 17.9 86 17.2 76 L 20.8 76 Q 20.1 86 21.2 96 Z M 38.8 96 Q 39.9 86 39.2 76 L 42.8 76 Q 42.1 86 43.2 96 Z M 15 78 L 45 78 L 45 80.4 L 15 80.4 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 19.4 96 Q 19.6 86 19.2 76 L 20.8 76 Q 20.1 86 21.2 96 Z M 41.4 96 Q 41.6 86 41.2 76 L 42.8 76 Q 42.1 86 43.2 96 Z M 15 79.5 L 45 79.5 L 45 80.4 L 15 80.4 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 18.2 96 Q 20 87.5 18.4 79 L 19.6 79 Q 21.4 87.5 19.8 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 14.3 68.8 C 14.9 68.6 15.8 69.3 16.4 69.2 C 16.9 69.2 17.3 68.4 17.7 68.5 C 18.1 68.6 18.3 69.6 18.7 70 C 19.1 70.4 19.8 70.5 20.1 71 C 20.4 71.4 20.3 72.3 20.3 72.8 C 20.3 73.3 20 73.5 19.9 74 C 19.8 74.5 20.1 75.5 19.9 75.9 C 19.6 76.3 18.9 76 18.6 76.3 C 18.3 76.5 18.3 77.3 18 77.3 C 17.8 77.4 17.2 76.3 17.1 76.4 C 16.9 76.5 17.1 77.6 16.9 77.7 C 16.7 77.9 16.2 77.3 15.8 77.3 C 15.4 77.3 15 78 14.6 77.8 C 14.2 77.7 13.7 76.7 13.3 76.4 C 12.9 76 12.6 76.1 12.2 75.7 C 11.9 75.4 11.3 74.7 11.2 74.2 C 11.2 73.6 11.7 73.1 11.7 72.5 C 11.7 71.9 11.3 71.1 11.5 70.8 C 11.7 70.4 12.5 70.8 13 70.5 C 13.4 70.1 13.7 69 14.3 68.8 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 14.1 69 C 14.5 68.9 15.3 69.4 15.8 69.4 C 16.3 69.3 16.6 68.7 16.9 68.8 C 17.3 68.9 17.4 69.7 17.7 70 C 18.1 70.4 18.7 70.4 18.9 70.8 C 19.2 71.2 19.2 71.9 19.1 72.4 C 19.1 72.8 18.8 72.9 18.8 73.4 C 18.7 73.8 18.9 74.7 18.7 75 C 18.6 75.3 18 75.1 17.7 75.3 C 17.4 75.5 17.4 76.2 17.2 76.2 C 17 76.2 16.6 75.4 16.4 75.4 C 16.2 75.5 16.4 76.4 16.3 76.5 C 16.1 76.7 15.6 76.2 15.3 76.2 C 15 76.2 14.7 76.7 14.3 76.6 C 14 76.5 13.6 75.7 13.3 75.4 C 12.9 75.1 12.6 75.1 12.3 74.8 C 12 74.5 11.6 74 11.5 73.5 C 11.4 73.1 11.9 72.6 11.9 72.1 C 11.9 71.7 11.5 71 11.7 70.7 C 11.9 70.4 12.6 70.7 13 70.4 C 13.4 70.1 13.6 69.2 14.1 69 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 17.5 77.7 Q 17.2 75.8 16.2 74.1 Q 16.5 76 17.5 77.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 45.7 68.8 C 46.3 69 46.6 70.1 47 70.5 C 47.5 70.8 48.3 70.4 48.5 70.8 C 48.7 71.1 48.3 71.9 48.3 72.5 C 48.3 73.1 48.8 73.6 48.8 74.2 C 48.7 74.7 48.1 75.4 47.8 75.7 C 47.4 76.1 47.1 76 46.7 76.4 C 46.3 76.7 45.8 77.7 45.4 77.8 C 45 78 44.6 77.3 44.2 77.3 C 43.8 77.3 43.3 77.9 43.1 77.7 C 42.9 77.6 43.1 76.5 42.9 76.4 C 42.8 76.3 42.2 77.4 42 77.3 C 41.7 77.3 41.7 76.5 41.4 76.3 C 41.1 76 40.4 76.3 40.1 75.9 C 39.9 75.5 40.2 74.5 40.1 74 C 40 73.5 39.7 73.3 39.7 72.8 C 39.7 72.3 39.6 71.4 39.9 71 C 40.2 70.5 40.9 70.4 41.3 70 C 41.7 69.6 41.9 68.6 42.3 68.5 C 42.7 68.4 43.1 69.2 43.6 69.2 C 44.2 69.3 45.1 68.6 45.7 68.8 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 44.9 69 C 45.4 69.2 45.7 70.1 46 70.4 C 46.4 70.7 47.1 70.4 47.3 70.7 C 47.5 71 47.1 71.7 47.1 72.1 C 47.2 72.6 47.6 73.1 47.5 73.5 C 47.4 74 47 74.5 46.7 74.8 C 46.4 75.1 46.1 75.1 45.8 75.4 C 45.4 75.7 45 76.5 44.7 76.6 C 44.3 76.7 44 76.2 43.7 76.2 C 43.4 76.2 42.9 76.7 42.7 76.5 C 42.6 76.4 42.8 75.5 42.6 75.4 C 42.5 75.4 42 76.2 41.8 76.2 C 41.6 76.2 41.6 75.5 41.3 75.3 C 41.1 75.1 40.4 75.3 40.3 75 C 40.1 74.7 40.3 73.8 40.2 73.4 C 40.2 72.9 39.9 72.8 39.9 72.4 C 39.9 71.9 39.9 71.2 40.1 70.8 C 40.3 70.4 40.9 70.4 41.3 70 C 41.6 69.7 41.8 68.9 42.1 68.8 C 42.4 68.7 42.7 69.3 43.2 69.4 C 43.7 69.4 44.5 68.9 44.9 69 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 42.5 77.7 Q 43.5 76 43.8 74.1 Q 42.8 75.8 42.5 77.7 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 16.8 96 Q 17.9 79 17.2 62 L 20.8 62 Q 20.1 79 21.2 96 Z M 38.8 96 Q 39.9 79 39.2 62 L 42.8 62 Q 42.1 79 43.2 96 Z M 15 64 L 45 64 L 45 66.4 L 15 66.4 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 19.4 96 Q 19.6 79 19.2 62 L 20.8 62 Q 20.1 79 21.2 96 Z M 41.4 96 Q 41.6 79 41.2 62 L 42.8 62 Q 42.1 79 43.2 96 Z M 15 65.5 L 45 65.5 L 45 66.4 L 15 66.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 18.2 96 Q 20 80.5 18.4 65 L 19.6 65 Q 21.4 80.5 19.8 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 14.1 53.8 C 14.7 53.6 15.8 54.3 16.4 54.3 C 17 54.2 17.5 53.4 17.9 53.5 C 18.3 53.6 18.5 54.7 19 55.1 C 19.4 55.6 20.3 55.7 20.6 56.2 C 20.9 56.8 20.9 57.7 20.8 58.3 C 20.8 58.8 20.5 59 20.4 59.6 C 20.3 60.2 20.6 61.4 20.3 61.8 C 20.1 62.2 19.3 61.9 18.9 62.2 C 18.6 62.5 18.6 63.4 18.3 63.4 C 18 63.4 17.4 62.3 17.2 62.3 C 17 62.4 17.3 63.7 17 63.8 C 16.8 64 16.2 63.3 15.8 63.3 C 15.3 63.4 14.9 64.1 14.4 63.9 C 14 63.8 13.4 62.7 13 62.3 C 12.6 61.9 12.2 62 11.8 61.6 C 11.4 61.2 10.8 60.4 10.7 59.8 C 10.6 59.2 11.1 58.6 11.2 58 C 11.2 57.3 10.7 56.4 11 56 C 11.2 55.6 12.1 56 12.6 55.7 C 13.1 55.3 13.5 54 14.1 53.8 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 13.8 54.1 C 14.4 53.9 15.2 54.5 15.8 54.5 C 16.3 54.4 16.7 53.7 17 53.8 C 17.4 53.9 17.6 54.8 17.9 55.2 C 18.3 55.6 19 55.7 19.3 56.1 C 19.5 56.5 19.5 57.3 19.5 57.8 C 19.5 58.3 19.2 58.5 19.1 59 C 19 59.4 19.3 60.4 19.1 60.8 C 18.9 61.1 18.2 60.9 17.9 61.1 C 17.6 61.3 17.6 62.1 17.4 62.1 C 17.1 62.1 16.6 61.2 16.4 61.2 C 16.3 61.3 16.5 62.3 16.3 62.5 C 16.1 62.6 15.6 62 15.2 62.1 C 14.9 62.1 14.5 62.7 14.1 62.6 C 13.7 62.4 13.3 61.5 12.9 61.2 C 12.6 60.9 12.2 60.9 11.9 60.6 C 11.6 60.2 11.1 59.6 11 59.1 C 10.9 58.6 11.4 58.1 11.4 57.6 C 11.4 57 11 56.2 11.2 55.9 C 11.4 55.6 12.2 55.9 12.6 55.6 C 13 55.3 13.3 54.3 13.8 54.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 17.7 63.8 Q 17.4 61.6 16.3 59.8 Q 16.6 61.9 17.7 63.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 50.5 C 30.7 50.5 31.4 51.5 32 51.7 C 32.6 51.9 33.3 51.2 33.7 51.5 C 34.1 51.8 33.9 52.8 34.1 53.4 C 34.4 54 35.2 54.4 35.3 55 C 35.4 55.6 35 56.5 34.8 57 C 34.6 57.5 34.2 57.6 33.9 58.1 C 33.6 58.6 33.5 59.8 33.1 60.1 C 32.8 60.4 32.1 59.9 31.7 60 C 31.3 60.1 31 61 30.7 60.9 C 30.4 60.8 30.2 59.6 30 59.6 C 29.8 59.6 29.6 60.8 29.3 60.9 C 29 61 28.7 60.1 28.3 60 C 27.9 59.9 27.2 60.4 26.9 60.1 C 26.5 59.8 26.4 58.6 26.1 58.1 C 25.8 57.6 25.4 57.5 25.2 57 C 25 56.5 24.6 55.6 24.7 55 C 24.8 54.4 25.6 54 25.9 53.4 C 26.1 52.8 25.9 51.8 26.3 51.5 C 26.7 51.2 27.4 51.9 28 51.7 C 28.6 51.5 29.3 50.5 30 50.5 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.4 50.8 C 30 50.8 30.6 51.7 31.1 51.8 C 31.7 52 32.3 51.4 32.6 51.6 C 32.8 51.9 32.7 52.7 32.9 53.2 C 33.1 53.7 33.8 54 33.9 54.5 C 34 55 33.7 55.8 33.5 56.2 C 33.3 56.7 33 56.7 32.7 57.2 C 32.5 57.6 32.4 58.6 32.1 58.9 C 31.8 59.1 31.2 58.7 30.9 58.8 C 30.5 58.9 30.2 59.6 30 59.5 C 29.8 59.5 29.6 58.4 29.4 58.4 C 29.3 58.4 29.1 59.5 28.9 59.5 C 28.6 59.6 28.4 58.9 28 58.8 C 27.7 58.7 27.1 59.1 26.8 58.9 C 26.5 58.6 26.4 57.6 26.2 57.2 C 25.9 56.7 25.6 56.7 25.4 56.2 C 25.2 55.8 24.9 55 25 54.5 C 25.1 54 25.7 53.7 26 53.2 C 26.2 52.7 26 51.9 26.3 51.6 C 26.6 51.4 27.2 52 27.8 51.8 C 28.3 51.7 28.9 50.8 29.4 50.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 61.1 Q 30.4 59 30 56.8 Q 29.6 59 30 61.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 45.9 53.8 C 46.5 54 46.9 55.3 47.4 55.7 C 47.9 56 48.8 55.6 49 56 C 49.3 56.4 48.8 57.3 48.8 58 C 48.9 58.6 49.4 59.2 49.3 59.8 C 49.2 60.4 48.6 61.2 48.2 61.6 C 47.8 62 47.4 61.9 47 62.3 C 46.6 62.7 46 63.8 45.6 63.9 C 45.1 64.1 44.7 63.4 44.2 63.3 C 43.8 63.3 43.2 64 43 63.8 C 42.7 63.7 43 62.4 42.8 62.3 C 42.6 62.3 42 63.4 41.7 63.4 C 41.4 63.4 41.4 62.5 41.1 62.2 C 40.7 61.9 39.9 62.2 39.7 61.8 C 39.4 61.4 39.7 60.2 39.6 59.6 C 39.5 59 39.2 58.8 39.2 58.3 C 39.1 57.7 39.1 56.8 39.4 56.2 C 39.7 55.7 40.6 55.6 41 55.1 C 41.5 54.7 41.7 53.6 42.1 53.5 C 42.5 53.4 43 54.2 43.6 54.3 C 44.2 54.3 45.3 53.6 45.9 53.8 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 45.1 54.1 C 45.6 54.3 45.9 55.3 46.3 55.6 C 46.7 55.9 47.5 55.6 47.7 55.9 C 47.9 56.2 47.4 57 47.5 57.6 C 47.5 58.1 48 58.6 47.9 59.1 C 47.8 59.6 47.3 60.2 47 60.6 C 46.7 60.9 46.3 60.9 46 61.2 C 45.6 61.5 45.1 62.4 44.8 62.6 C 44.4 62.7 44 62.1 43.6 62.1 C 43.3 62 42.8 62.6 42.6 62.5 C 42.4 62.3 42.6 61.3 42.4 61.2 C 42.3 61.2 41.8 62.1 41.5 62.1 C 41.3 62.1 41.3 61.3 41 61.1 C 40.7 60.9 40 61.1 39.8 60.8 C 39.6 60.4 39.8 59.4 39.8 59 C 39.7 58.5 39.4 58.3 39.4 57.8 C 39.4 57.3 39.4 56.5 39.6 56.1 C 39.9 55.7 40.6 55.6 40.9 55.2 C 41.3 54.8 41.5 53.9 41.8 53.8 C 42.2 53.7 42.6 54.4 43.1 54.5 C 43.6 54.5 44.5 53.9 45.1 54.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 42.3 63.8 Q 43.4 61.9 43.7 59.8 Q 42.6 61.6 42.3 63.8 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 34.4 72 C 34.4 72.6 34.8 73.2 34.8 73.8 C 34.9 74.5 35.1 75.4 34.8 75.9 C 34.6 76.4 34 76.7 33.5 76.9 C 33.1 77.2 32.6 77 32.2 77.3 C 31.8 77.6 31.7 78.3 31.3 78.8 C 30.9 79.2 30.4 79.8 30 79.8 C 29.6 79.8 29.1 79.2 28.7 78.8 C 28.3 78.3 28.2 77.6 27.8 77.3 C 27.4 77 26.9 77.2 26.5 76.9 C 26 76.7 25.4 76.4 25.2 75.9 C 24.9 75.4 25.1 74.5 25.2 73.8 C 25.2 73.2 25.6 72.6 25.6 72 C 25.6 71.4 25.2 70.8 25.2 70.2 C 25.1 69.5 24.9 68.6 25.2 68.1 C 25.4 67.6 26 67.3 26.5 67.1 C 26.9 66.8 27.4 67 27.8 66.7 C 28.2 66.4 28.3 65.7 28.7 65.2 C 29.1 64.8 29.6 64.2 30 64.2 C 30.4 64.2 30.9 64.8 31.3 65.2 C 31.7 65.7 31.8 66.4 32.2 66.7 C 32.6 67 33.1 66.8 33.5 67.1 C 34 67.3 34.6 67.6 34.8 68.1 C 35.1 68.6 34.9 69.5 34.8 70.2 C 34.8 70.8 34.4 71.4 34.4 72 Z', from: 3, to: 3 },
        { tone: 'base', c: [30, 67.8, 1.5], from: 3, to: 3 },
        { tone: 'light', c: [29.6, 67.4, 0.6], from: 3, to: 3 },
        { tone: 'base', c: [31.4, 70.9, 1.5], from: 3, to: 3 },
        { tone: 'light', c: [31.1, 70.5, 0.6], from: 3, to: 3 },
        { tone: 'base', c: [34.3, 70.9, 1.5], from: 3, to: 3 },
        { tone: 'light', c: [33.9, 70.5, 0.6], from: 3, to: 3 },
        { tone: 'base', c: [30, 74, 1.5], from: 3, to: 3 },
        { tone: 'light', c: [29.6, 73.5, 0.6], from: 3, to: 3 },
        { tone: 'base', c: [32.2, 74, 1.5], from: 3, to: 3 },
        { tone: 'light', c: [31.8, 73.5, 0.6], from: 3, to: 3 },
        { tone: 'base', c: [34.3, 74, 1.5], from: 3, to: 3 },
        { tone: 'light', c: [33.9, 73.5, 0.6], from: 3, to: 3 },
        { tone: 'wood', d: 'M 16.8 96 Q 17.9 74 17.2 52 L 20.8 52 Q 20.1 74 21.2 96 Z M 38.8 96 Q 39.9 74 39.2 52 L 42.8 52 Q 42.1 74 43.2 96 Z M 15 54 L 45 54 L 45 56.4 L 15 56.4 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 19.4 96 Q 19.6 74 19.2 52 L 20.8 52 Q 20.1 74 21.2 96 Z M 41.4 96 Q 41.6 74 41.2 52 L 42.8 52 Q 42.1 74 43.2 96 Z M 15 55.5 L 45 55.5 L 45 56.4 L 15 56.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 18.2 96 Q 20 75.5 18.4 55 L 19.6 55 Q 21.4 75.5 19.8 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 13.9 43.2 C 14.6 42.9 15.7 43.7 16.4 43.7 C 17.1 43.6 17.6 42.7 18 42.8 C 18.5 43 18.7 44.1 19.2 44.6 C 19.7 45.1 20.6 45.2 20.9 45.7 C 21.2 46.3 21.2 47.3 21.2 47.9 C 21.1 48.5 20.8 48.8 20.7 49.4 C 20.6 50 20.9 51.3 20.6 51.7 C 20.4 52.2 19.5 51.8 19.1 52.1 C 18.8 52.4 18.8 53.4 18.4 53.4 C 18.1 53.4 17.5 52.2 17.3 52.3 C 17 52.4 17.3 53.7 17.1 53.9 C 16.8 54.1 16.2 53.3 15.7 53.4 C 15.3 53.4 14.8 54.2 14.3 54 C 13.8 53.8 13.3 52.7 12.8 52.3 C 12.3 51.8 11.9 51.9 11.5 51.5 C 11.1 51 10.4 50.2 10.3 49.6 C 10.2 49 10.8 48.3 10.8 47.6 C 10.9 46.9 10.3 45.9 10.6 45.5 C 10.9 45.1 11.8 45.5 12.4 45.1 C 12.9 44.7 13.3 43.4 13.9 43.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 13.7 43.4 C 14.3 43.2 15.2 43.9 15.8 43.8 C 16.3 43.8 16.7 43 17.1 43.1 C 17.5 43.3 17.7 44.2 18.1 44.6 C 18.5 45 19.2 45.1 19.5 45.6 C 19.8 46.1 19.8 46.9 19.8 47.4 C 19.7 47.9 19.4 48.1 19.3 48.7 C 19.3 49.2 19.5 50.2 19.3 50.6 C 19.1 51 18.3 50.7 18 51 C 17.7 51.2 17.7 52 17.5 52 C 17.2 52.1 16.7 51 16.5 51.1 C 16.3 51.2 16.5 52.3 16.3 52.4 C 16.1 52.6 15.6 52 15.2 52 C 14.8 52 14.4 52.7 14 52.5 C 13.6 52.4 13.1 51.4 12.7 51.1 C 12.3 50.7 12 50.8 11.6 50.4 C 11.3 50 10.7 49.4 10.6 48.8 C 10.5 48.3 11 47.7 11.1 47.2 C 11.1 46.6 10.7 45.8 10.9 45.4 C 11.1 45.1 11.9 45.4 12.4 45.1 C 12.8 44.8 13.1 43.6 13.7 43.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 17.8 53.8 Q 17.4 51.5 16.3 49.5 Q 16.7 51.8 17.8 53.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 24.6 40.2 C 25.4 40.2 26.3 41.2 26.9 41.3 C 27.6 41.4 28.3 40.6 28.7 40.9 C 29.1 41.1 29.1 42.2 29.4 42.8 C 29.8 43.4 30.6 43.7 30.8 44.4 C 31 45 30.7 46 30.6 46.6 C 30.4 47.1 30 47.3 29.8 47.9 C 29.5 48.5 29.5 49.7 29.2 50.1 C 28.8 50.5 28 50 27.6 50.2 C 27.2 50.4 27 51.3 26.6 51.2 C 26.3 51.2 26 49.9 25.8 49.9 C 25.5 49.9 25.5 51.3 25.2 51.4 C 24.9 51.5 24.5 50.7 24 50.6 C 23.6 50.5 22.9 51.2 22.5 50.9 C 22.1 50.6 21.8 49.4 21.4 48.8 C 21 48.3 20.6 48.3 20.3 47.8 C 20 47.2 19.5 46.3 19.6 45.7 C 19.6 45 20.4 44.5 20.6 43.9 C 20.8 43.2 20.5 42.1 20.8 41.8 C 21.2 41.4 22 42.1 22.6 41.8 C 23.3 41.5 23.9 40.3 24.6 40.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 24.2 40.6 C 24.8 40.5 25.5 41.4 26.1 41.5 C 26.7 41.5 27.2 40.9 27.6 41.1 C 27.9 41.3 27.9 42.2 28.2 42.7 C 28.5 43.2 29.2 43.5 29.3 44 C 29.5 44.5 29.3 45.4 29.1 45.9 C 29 46.4 28.6 46.5 28.5 47 C 28.3 47.5 28.3 48.5 28 48.8 C 27.7 49.2 27 48.7 26.7 48.9 C 26.3 49.1 26.1 49.8 25.8 49.8 C 25.6 49.8 25.3 48.6 25.1 48.7 C 24.9 48.7 24.9 49.8 24.6 49.9 C 24.4 50 24 49.3 23.6 49.2 C 23.3 49.2 22.7 49.7 22.4 49.5 C 22 49.3 21.8 48.2 21.4 47.8 C 21.1 47.3 20.8 47.3 20.5 46.9 C 20.3 46.4 19.9 45.7 19.9 45.1 C 20 44.6 20.6 44.1 20.8 43.6 C 20.9 43.1 20.7 42.1 21 41.8 C 21.2 41.6 21.9 42.1 22.5 41.9 C 23 41.7 23.6 40.6 24.2 40.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 26 51.5 Q 26.1 49.2 25.4 47 Q 25.3 49.3 26 51.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 35.4 40.2 C 36.1 40.3 36.7 41.5 37.4 41.8 C 38 42.1 38.8 41.4 39.2 41.8 C 39.5 42.1 39.2 43.2 39.4 43.9 C 39.6 44.5 40.4 45 40.4 45.7 C 40.5 46.3 40 47.2 39.7 47.8 C 39.4 48.3 39 48.3 38.6 48.8 C 38.2 49.4 37.9 50.6 37.5 50.9 C 37.1 51.2 36.4 50.5 36 50.6 C 35.5 50.7 35.1 51.5 34.8 51.4 C 34.5 51.3 34.5 49.9 34.2 49.9 C 34 49.9 33.7 51.2 33.4 51.2 C 33 51.3 32.8 50.4 32.4 50.2 C 32 50 31.2 50.5 30.8 50.1 C 30.5 49.7 30.5 48.5 30.2 47.9 C 30 47.3 29.6 47.1 29.4 46.6 C 29.3 46 29 45 29.2 44.4 C 29.4 43.7 30.2 43.4 30.6 42.8 C 30.9 42.2 30.9 41.1 31.3 40.9 C 31.7 40.6 32.4 41.4 33.1 41.3 C 33.7 41.2 34.6 40.2 35.4 40.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 34.7 40.6 C 35.3 40.6 35.8 41.7 36.3 41.9 C 36.9 42.1 37.6 41.6 37.9 41.8 C 38.1 42.1 37.9 43.1 38.1 43.6 C 38.2 44.1 38.9 44.6 38.9 45.1 C 38.9 45.7 38.5 46.4 38.3 46.9 C 38 47.3 37.7 47.3 37.4 47.8 C 37.1 48.2 36.8 49.3 36.5 49.5 C 36.1 49.7 35.5 49.2 35.2 49.2 C 34.8 49.3 34.4 50 34.2 49.9 C 33.9 49.8 33.9 48.7 33.7 48.7 C 33.5 48.6 33.2 49.8 33 49.8 C 32.7 49.8 32.5 49.1 32.2 48.9 C 31.8 48.7 31.1 49.2 30.8 48.8 C 30.5 48.5 30.6 47.5 30.4 47 C 30.2 46.5 29.8 46.4 29.7 45.9 C 29.5 45.4 29.3 44.5 29.5 44 C 29.6 43.5 30.4 43.2 30.6 42.7 C 30.9 42.2 30.9 41.3 31.2 41.1 C 31.6 40.9 32.2 41.5 32.7 41.5 C 33.3 41.4 34.1 40.5 34.7 40.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34 51.5 Q 34.7 49.3 34.6 47 Q 33.9 49.2 34 51.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 46.1 43.2 C 46.7 43.4 47.1 44.7 47.6 45.1 C 48.2 45.5 49.1 45.1 49.4 45.5 C 49.7 45.9 49.1 46.9 49.2 47.6 C 49.2 48.3 49.8 49 49.7 49.6 C 49.6 50.2 48.9 51 48.5 51.5 C 48.1 51.9 47.7 51.8 47.2 52.3 C 46.7 52.7 46.2 53.8 45.7 54 C 45.2 54.2 44.7 53.4 44.3 53.4 C 43.8 53.3 43.2 54.1 42.9 53.9 C 42.7 53.7 43 52.4 42.7 52.3 C 42.5 52.2 41.9 53.4 41.6 53.4 C 41.2 53.4 41.2 52.4 40.9 52.1 C 40.5 51.8 39.6 52.2 39.4 51.7 C 39.1 51.3 39.4 50 39.3 49.4 C 39.2 48.8 38.9 48.5 38.8 47.9 C 38.8 47.3 38.8 46.3 39.1 45.7 C 39.4 45.2 40.3 45.1 40.8 44.6 C 41.3 44.1 41.5 43 42 42.8 C 42.4 42.7 42.9 43.6 43.6 43.7 C 44.3 43.7 45.4 42.9 46.1 43.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 45.1 43.4 C 45.7 43.6 46 44.8 46.5 45.1 C 46.9 45.4 47.7 45.1 47.9 45.4 C 48.2 45.8 47.7 46.6 47.7 47.2 C 47.8 47.7 48.3 48.3 48.2 48.8 C 48.1 49.4 47.6 50 47.2 50.4 C 46.9 50.8 46.5 50.7 46.1 51.1 C 45.7 51.4 45.2 52.4 44.8 52.5 C 44.4 52.7 44 52 43.6 52 C 43.2 52 42.7 52.6 42.5 52.4 C 42.3 52.3 42.5 51.2 42.3 51.1 C 42.1 51 41.6 52.1 41.4 52 C 41.1 52 41.1 51.2 40.8 51 C 40.5 50.7 39.7 51 39.5 50.6 C 39.3 50.2 39.5 49.2 39.5 48.7 C 39.4 48.1 39.1 47.9 39.1 47.4 C 39 46.9 39 46.1 39.3 45.6 C 39.6 45.1 40.3 45 40.7 44.6 C 41.1 44.2 41.3 43.3 41.7 43.1 C 42.1 43 42.5 43.8 43 43.8 C 43.6 43.9 44.6 43.2 45.1 43.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 42.2 53.8 Q 43.3 51.8 43.7 49.5 Q 42.6 51.5 42.2 53.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 27.3 64 C 27.3 64.8 27.7 65.5 27.8 66.3 C 27.9 67.2 28.1 68.4 27.8 69 C 27.6 69.7 26.8 70.1 26.2 70.4 C 25.7 70.7 25.1 70.5 24.6 70.9 C 24.2 71.2 24 72.2 23.6 72.7 C 23.1 73.2 22.5 74.1 22 74.1 C 21.5 74.1 20.9 73.2 20.4 72.7 C 20 72.2 19.8 71.2 19.4 70.9 C 18.9 70.5 18.3 70.7 17.8 70.4 C 17.2 70.1 16.4 69.7 16.2 69 C 15.9 68.4 16.1 67.2 16.2 66.3 C 16.3 65.5 16.7 64.8 16.7 64 C 16.7 63.2 16.3 62.5 16.2 61.7 C 16.1 60.8 15.9 59.6 16.2 59 C 16.4 58.3 17.2 57.9 17.8 57.6 C 18.3 57.3 18.9 57.5 19.4 57.1 C 19.8 56.8 20 55.8 20.4 55.3 C 20.9 54.8 21.5 53.9 22 53.9 C 22.5 53.9 23.1 54.8 23.6 55.3 C 24 55.8 24.2 56.8 24.6 57.1 C 25.1 57.5 25.7 57.3 26.2 57.6 C 26.8 57.9 27.6 58.3 27.8 59 C 28.1 59.6 27.9 60.8 27.8 61.7 C 27.7 62.5 27.3 63.2 27.3 64 Z', from: 4, to: 4 },
        { tone: 'base', c: [22, 58.6, 1.8], from: 4, to: 4 },
        { tone: 'light', c: [21.5, 58.1, 0.7], from: 4, to: 4 },
        { tone: 'base', c: [23.7, 62.6, 1.8], from: 4, to: 4 },
        { tone: 'light', c: [23.3, 62.1, 0.7], from: 4, to: 4 },
        { tone: 'base', c: [27.2, 62.6, 1.8], from: 4, to: 4 },
        { tone: 'light', c: [26.7, 62.1, 0.7], from: 4, to: 4 },
        { tone: 'base', c: [22, 66.5, 1.8], from: 4, to: 4 },
        { tone: 'light', c: [21.5, 66, 0.7], from: 4, to: 4 },
        { tone: 'base', c: [24.6, 66.5, 1.8], from: 4, to: 4 },
        { tone: 'light', c: [24.1, 66, 0.7], from: 4, to: 4 },
        { tone: 'base', c: [27.2, 66.5, 1.8], from: 4, to: 4 },
        { tone: 'light', c: [26.7, 66, 0.7], from: 4, to: 4 },
        { tone: 'base', c: [21.1, 70.5, 1.8], from: 4, to: 4 },
        { tone: 'light', c: [20.7, 70, 0.7], from: 4, to: 4 },
        { tone: 'base', c: [22.9, 70.5, 1.8], from: 4, to: 4 },
        { tone: 'light', c: [22.4, 70, 0.7], from: 4, to: 4 },
        { tone: 'deep', d: 'M 43.8 62 C 43.8 62.7 44.1 63.3 44.2 64.1 C 44.3 64.8 44.5 65.9 44.2 66.5 C 44 67.1 43.3 67.4 42.8 67.7 C 42.3 67.9 41.8 67.8 41.4 68.1 C 41 68.4 40.8 69.3 40.4 69.7 C 40 70.2 39.5 71 39 71 C 38.5 71 38 70.2 37.6 69.7 C 37.2 69.3 37 68.4 36.6 68.1 C 36.2 67.8 35.7 67.9 35.2 67.7 C 34.7 67.4 34 67.1 33.8 66.5 C 33.5 65.9 33.7 64.8 33.8 64.1 C 33.9 63.3 34.2 62.7 34.2 62 C 34.2 61.3 33.9 60.7 33.8 59.9 C 33.7 59.2 33.5 58.1 33.8 57.5 C 34 56.9 34.7 56.6 35.2 56.3 C 35.7 56.1 36.2 56.2 36.6 55.9 C 37 55.6 37.2 54.7 37.6 54.3 C 38 53.8 38.5 53 39 53 C 39.5 53 40 53.8 40.4 54.3 C 40.8 54.7 41 55.6 41.4 55.9 C 41.8 56.2 42.3 56.1 42.8 56.3 C 43.3 56.6 44 56.9 44.2 57.5 C 44.5 58.1 44.3 59.2 44.2 59.9 C 44.1 60.7 43.8 61.3 43.8 62 Z', from: 4, to: 4 },
        { tone: 'base', c: [39, 57.2, 1.6], from: 4, to: 4 },
        { tone: 'light', c: [38.6, 56.7, 0.6], from: 4, to: 4 },
        { tone: 'base', c: [40.6, 60.7, 1.6], from: 4, to: 4 },
        { tone: 'light', c: [40.1, 60.3, 0.6], from: 4, to: 4 },
        { tone: 'base', c: [43.7, 60.7, 1.6], from: 4, to: 4 },
        { tone: 'light', c: [43.2, 60.3, 0.6], from: 4, to: 4 },
        { tone: 'base', c: [39, 64.2, 1.6], from: 4, to: 4 },
        { tone: 'light', c: [38.6, 63.8, 0.6], from: 4, to: 4 },
        { tone: 'base', c: [41.3, 64.2, 1.6], from: 4, to: 4 },
        { tone: 'light', c: [40.9, 63.8, 0.6], from: 4, to: 4 },
        { tone: 'base', c: [43.7, 64.2, 1.6], from: 4, to: 4 },
        { tone: 'light', c: [43.2, 63.8, 0.6], from: 4, to: 4 },
        { tone: 'base', c: [38.2, 67.8, 1.6], from: 4, to: 4 },
        { tone: 'light', c: [37.8, 67.3, 0.6], from: 4, to: 4 },
        { tone: 'wood', d: 'M 16.8 96 Q 17.9 70 17.2 44 L 20.8 44 Q 20.1 70 21.2 96 Z M 38.8 96 Q 39.9 70 39.2 44 L 42.8 44 Q 42.1 70 43.2 96 Z M 15 46 L 45 46 L 45 48.4 L 15 48.4 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 19.4 96 Q 19.6 70 19.2 44 L 20.8 44 Q 20.1 70 21.2 96 Z M 41.4 96 Q 41.6 70 41.2 44 L 42.8 44 Q 42.1 70 43.2 96 Z M 15 47.5 L 45 47.5 L 45 48.4 L 15 48.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 18.2 96 Q 20 71.5 18.4 47 L 19.6 47 Q 21.4 71.5 19.8 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 13.8 34.5 C 14.5 34.2 15.7 35.1 16.5 35 C 17.2 35 17.7 34 18.2 34.1 C 18.7 34.3 18.9 35.5 19.4 36 C 19.9 36.5 20.9 36.7 21.2 37.3 C 21.6 37.9 21.6 39 21.5 39.6 C 21.5 40.2 21.1 40.5 21 41.2 C 20.9 41.8 21.2 43.1 20.9 43.6 C 20.7 44.1 19.7 43.8 19.3 44.1 C 18.9 44.4 18.9 45.4 18.6 45.4 C 18.3 45.5 17.6 44.2 17.4 44.2 C 17.1 44.3 17.4 45.8 17.2 46 C 16.9 46.1 16.2 45.4 15.7 45.4 C 15.2 45.4 14.7 46.3 14.2 46.1 C 13.7 45.9 13.1 44.7 12.6 44.2 C 12.1 43.8 11.6 43.8 11.2 43.4 C 10.7 42.9 10 42.1 9.9 41.4 C 9.8 40.7 10.4 40 10.5 39.3 C 10.6 38.5 10 37.5 10.2 37 C 10.5 36.6 11.5 37 12.1 36.6 C 12.7 36.2 13.1 34.8 13.8 34.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 13.5 34.8 C 14.1 34.6 15.1 35.3 15.8 35.2 C 16.4 35.2 16.8 34.3 17.2 34.5 C 17.6 34.6 17.8 35.6 18.2 36.1 C 18.6 36.5 19.5 36.6 19.7 37.1 C 20 37.6 20 38.5 20 39.1 C 20 39.6 19.6 39.8 19.6 40.4 C 19.5 40.9 19.8 42 19.5 42.4 C 19.3 42.9 18.5 42.6 18.2 42.8 C 17.8 43.1 17.8 43.9 17.6 44 C 17.3 44 16.7 42.9 16.5 43 C 16.3 43 16.6 44.2 16.3 44.4 C 16.1 44.6 15.6 43.9 15.1 43.9 C 14.7 43.9 14.3 44.7 13.9 44.5 C 13.4 44.3 12.9 43.3 12.5 42.9 C 12.1 42.6 11.7 42.6 11.3 42.2 C 10.9 41.8 10.3 41.1 10.3 40.6 C 10.2 40 10.7 39.4 10.7 38.8 C 10.8 38.2 10.3 37.3 10.5 36.9 C 10.8 36.5 11.6 36.9 12.1 36.6 C 12.6 36.2 12.9 35 13.5 34.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 18 45.9 Q 17.5 43.5 16.3 41.3 Q 16.7 43.8 18 45.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 21.9 32.1 C 22.6 32 23.7 33 24.4 33.1 C 25.1 33.1 25.8 32.3 26.2 32.5 C 26.7 32.7 26.7 34 27.1 34.6 C 27.5 35.2 28.5 35.4 28.7 36.1 C 28.9 36.7 28.7 37.8 28.6 38.5 C 28.4 39.1 28 39.2 27.8 39.9 C 27.6 40.5 27.7 41.9 27.3 42.3 C 27 42.7 26.1 42.2 25.7 42.5 C 25.2 42.7 25 43.7 24.7 43.7 C 24.4 43.7 23.9 42.3 23.7 42.3 C 23.4 42.4 23.5 43.8 23.2 44 C 22.9 44.1 22.4 43.2 21.9 43.1 C 21.4 43.1 20.8 43.8 20.3 43.6 C 19.8 43.3 19.4 42 19 41.4 C 18.6 40.9 18.1 40.9 17.8 40.4 C 17.4 39.8 16.8 38.9 16.9 38.2 C 16.9 37.5 17.6 36.9 17.8 36.2 C 18 35.5 17.6 34.3 17.9 34 C 18.3 33.6 19.2 34.2 19.9 33.9 C 20.5 33.6 21.1 32.2 21.9 32.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 21.4 32.4 C 22.1 32.3 22.9 33.2 23.5 33.3 C 24.2 33.3 24.7 32.6 25.1 32.8 C 25.5 33 25.5 34 25.8 34.5 C 26.2 35 27 35.2 27.2 35.8 C 27.4 36.3 27.2 37.2 27.1 37.8 C 26.9 38.3 26.6 38.4 26.4 39 C 26.2 39.5 26.3 40.6 26 41 C 25.7 41.4 25 41 24.6 41.1 C 24.2 41.3 24.1 42.2 23.8 42.2 C 23.5 42.1 23.2 41 22.9 41 C 22.7 41 22.8 42.3 22.5 42.4 C 22.3 42.5 21.8 41.8 21.4 41.7 C 21 41.7 20.5 42.3 20.1 42.1 C 19.7 41.8 19.3 40.7 19 40.3 C 18.6 39.8 18.3 39.8 18 39.4 C 17.7 38.9 17.2 38.1 17.2 37.5 C 17.2 37 17.8 36.5 18 35.9 C 18.2 35.3 17.8 34.3 18.1 34 C 18.4 33.7 19.2 34.2 19.7 33.9 C 20.3 33.7 20.8 32.5 21.4 32.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 24 44 Q 24 41.6 23.1 39.2 Q 23.1 41.7 24 44 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 31.1 C 30.8 31.1 31.6 32.3 32.3 32.5 C 33 32.7 33.8 32 34.2 32.3 C 34.6 32.6 34.4 33.8 34.7 34.4 C 35 35.1 35.9 35.6 36 36.2 C 36.1 36.9 35.8 37.9 35.5 38.5 C 35.2 39.1 34.8 39.2 34.5 39.8 C 34.2 40.4 34 41.8 33.6 42.1 C 33.2 42.5 32.4 41.9 31.9 42 C 31.5 42.1 31.1 43.1 30.8 43 C 30.4 42.9 30.3 41.5 30 41.5 C 29.7 41.5 29.6 42.9 29.2 43 C 28.9 43.1 28.5 42.1 28.1 42 C 27.6 41.9 26.8 42.5 26.4 42.1 C 26 41.8 25.8 40.4 25.5 39.8 C 25.2 39.2 24.8 39.1 24.5 38.5 C 24.2 37.9 23.9 36.9 24 36.2 C 24.1 35.6 25 35.1 25.3 34.4 C 25.6 33.8 25.4 32.6 25.8 32.3 C 26.2 32 27 32.7 27.7 32.5 C 28.4 32.3 29.2 31.1 30 31.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.4 31.5 C 30 31.5 30.7 32.5 31.3 32.6 C 31.9 32.8 32.6 32.2 32.9 32.4 C 33.3 32.7 33.1 33.7 33.3 34.3 C 33.6 34.8 34.3 35.2 34.4 35.8 C 34.5 36.3 34.2 37.2 34 37.7 C 33.8 38.2 33.4 38.3 33.1 38.8 C 32.9 39.3 32.7 40.4 32.4 40.7 C 32 41 31.4 40.5 31 40.6 C 30.6 40.7 30.3 41.5 30 41.5 C 29.7 41.4 29.6 40.2 29.4 40.2 C 29.2 40.2 29 41.4 28.7 41.5 C 28.5 41.5 28.1 40.7 27.8 40.6 C 27.4 40.5 26.7 41 26.4 40.7 C 26 40.4 25.9 39.3 25.6 38.8 C 25.3 38.3 25 38.2 24.7 37.7 C 24.5 37.2 24.2 36.3 24.3 35.8 C 24.4 35.2 25.1 34.8 25.4 34.3 C 25.6 33.7 25.5 32.7 25.8 32.4 C 26.2 32.2 26.8 32.8 27.4 32.6 C 28 32.5 28.7 31.5 29.4 31.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 43.2 Q 30.4 40.8 30 38.4 Q 29.6 40.8 30 43.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 38.1 32.1 C 38.9 32.2 39.5 33.6 40.1 33.9 C 40.8 34.2 41.7 33.6 42.1 34 C 42.4 34.3 42 35.5 42.2 36.2 C 42.4 36.9 43.1 37.5 43.1 38.2 C 43.2 38.9 42.6 39.8 42.2 40.4 C 41.9 40.9 41.4 40.9 41 41.4 C 40.6 42 40.2 43.3 39.7 43.6 C 39.2 43.8 38.6 43.1 38.1 43.1 C 37.6 43.2 37.1 44.1 36.8 44 C 36.5 43.8 36.6 42.4 36.3 42.3 C 36.1 42.3 35.6 43.7 35.3 43.7 C 35 43.7 34.8 42.7 34.3 42.5 C 33.9 42.2 33 42.7 32.7 42.3 C 32.3 41.9 32.4 40.5 32.2 39.9 C 32 39.2 31.6 39.1 31.4 38.5 C 31.3 37.8 31.1 36.7 31.3 36.1 C 31.5 35.4 32.5 35.2 32.9 34.6 C 33.3 34 33.3 32.7 33.8 32.5 C 34.2 32.3 34.9 33.1 35.6 33.1 C 36.3 33 37.4 32 38.1 32.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 37.3 32.4 C 37.9 32.5 38.4 33.7 39 33.9 C 39.6 34.2 40.3 33.7 40.6 34 C 40.9 34.3 40.6 35.3 40.7 35.9 C 40.9 36.5 41.5 37 41.5 37.5 C 41.5 38.1 41.1 38.9 40.8 39.4 C 40.5 39.8 40.1 39.8 39.7 40.3 C 39.4 40.7 39.1 41.8 38.7 42.1 C 38.3 42.3 37.7 41.7 37.3 41.7 C 36.9 41.8 36.5 42.5 36.2 42.4 C 35.9 42.3 36 41 35.8 41 C 35.6 41 35.2 42.1 34.9 42.2 C 34.7 42.2 34.5 41.3 34.1 41.1 C 33.8 41 33 41.4 32.7 41 C 32.4 40.6 32.5 39.5 32.3 39 C 32.1 38.4 31.8 38.3 31.7 37.8 C 31.5 37.2 31.4 36.3 31.6 35.8 C 31.8 35.2 32.6 35 32.9 34.5 C 33.2 34 33.3 33 33.6 32.8 C 34 32.6 34.6 33.3 35.2 33.3 C 35.8 33.2 36.7 32.3 37.3 32.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 36 44 Q 36.9 41.7 36.9 39.2 Q 36 41.6 36 44 Z', from: 5 },
        { tone: 'stemshade', d: 'M 46.2 34.5 C 46.9 34.8 47.3 36.2 47.9 36.6 C 48.5 37 49.5 36.6 49.8 37 C 50 37.5 49.4 38.5 49.5 39.3 C 49.6 40 50.2 40.7 50.1 41.4 C 50 42.1 49.3 42.9 48.8 43.4 C 48.4 43.8 47.9 43.8 47.4 44.2 C 46.9 44.7 46.3 45.9 45.8 46.1 C 45.3 46.3 44.8 45.4 44.3 45.4 C 43.8 45.4 43.1 46.1 42.8 46 C 42.6 45.8 42.9 44.3 42.6 44.2 C 42.4 44.2 41.7 45.5 41.4 45.4 C 41.1 45.4 41.1 44.4 40.7 44.1 C 40.3 43.8 39.3 44.1 39.1 43.6 C 38.8 43.1 39.1 41.8 39 41.2 C 38.9 40.5 38.5 40.2 38.5 39.6 C 38.4 39 38.4 37.9 38.8 37.3 C 39.1 36.7 40.1 36.5 40.6 36 C 41.1 35.5 41.3 34.3 41.8 34.1 C 42.3 34 42.8 35 43.5 35 C 44.3 35.1 45.5 34.2 46.2 34.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 45.2 34.8 C 45.8 35 46.1 36.2 46.6 36.6 C 47.1 36.9 48 36.5 48.2 36.9 C 48.4 37.3 47.9 38.2 48 38.8 C 48 39.4 48.6 40 48.5 40.6 C 48.4 41.1 47.8 41.8 47.4 42.2 C 47 42.6 46.7 42.6 46.2 42.9 C 45.8 43.3 45.3 44.3 44.9 44.5 C 44.4 44.7 44 43.9 43.6 43.9 C 43.2 43.9 42.6 44.6 42.4 44.4 C 42.2 44.2 42.4 43 42.2 43 C 42 42.9 41.5 44 41.2 44 C 40.9 43.9 40.9 43.1 40.6 42.8 C 40.2 42.6 39.4 42.9 39.2 42.4 C 39 42 39.2 40.9 39.2 40.4 C 39.1 39.8 38.8 39.6 38.7 39.1 C 38.7 38.5 38.7 37.6 39 37.1 C 39.3 36.6 40.1 36.5 40.5 36.1 C 40.9 35.6 41.1 34.6 41.5 34.5 C 42 34.3 42.4 35.2 43 35.2 C 43.6 35.3 44.6 34.6 45.2 34.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 42 45.9 Q 43.3 43.8 43.7 41.3 Q 42.5 43.5 42 45.9 Z', from: 5 },
        { tone: 'deep', d: 'M 26.2 58 C 26.2 58.9 26.7 59.8 26.8 60.8 C 26.9 61.9 27.1 63.3 26.8 64.2 C 26.5 65 25.6 65.4 24.9 65.8 C 24.3 66.1 23.6 65.9 23.1 66.4 C 22.6 66.9 22.3 68 21.8 68.6 C 21.3 69.3 20.6 70.3 20 70.3 C 19.4 70.3 18.7 69.3 18.2 68.6 C 17.7 68 17.4 66.9 16.9 66.4 C 16.4 65.9 15.7 66.1 15.1 65.8 C 14.4 65.4 13.5 65 13.2 64.2 C 12.9 63.3 13.1 61.9 13.2 60.8 C 13.3 59.8 13.8 58.9 13.8 58 C 13.8 57.1 13.3 56.2 13.2 55.2 C 13.1 54.1 12.9 52.7 13.2 51.8 C 13.5 51 14.4 50.6 15.1 50.2 C 15.7 49.9 16.4 50.1 16.9 49.6 C 17.4 49.1 17.7 48 18.2 47.4 C 18.7 46.7 19.4 45.7 20 45.7 C 20.6 45.7 21.3 46.7 21.8 47.4 C 22.3 48 22.6 49.1 23.1 49.6 C 23.6 50.1 24.3 49.9 24.9 50.2 C 25.6 50.6 26.5 51 26.8 51.8 C 27.1 52.7 26.9 54.1 26.8 55.2 C 26.7 56.2 26.2 57.1 26.2 58 Z', from: 5 },
        { tone: 'base', c: [20, 51.4, 2.1], from: 5 },
        { tone: 'light', c: [19.5, 50.8, 0.8], from: 5 },
        { tone: 'base', c: [22, 56.2, 2.1], from: 5 },
        { tone: 'light', c: [21.5, 55.6, 0.8], from: 5 },
        { tone: 'base', c: [26, 56.2, 2.1], from: 5 },
        { tone: 'light', c: [25.5, 55.6, 0.8], from: 5 },
        { tone: 'base', c: [20, 61.1, 2.1], from: 5 },
        { tone: 'light', c: [19.5, 60.5, 0.8], from: 5 },
        { tone: 'base', c: [23, 61.1, 2.1], from: 5 },
        { tone: 'light', c: [22.5, 60.5, 0.8], from: 5 },
        { tone: 'base', c: [26, 61.1, 2.1], from: 5 },
        { tone: 'light', c: [25.5, 60.5, 0.8], from: 5 },
        { tone: 'base', c: [19, 65.9, 2.1], from: 5 },
        { tone: 'light', c: [18.4, 65.3, 0.8], from: 5 },
        { tone: 'base', c: [21, 65.9, 2.1], from: 5 },
        { tone: 'light', c: [20.5, 65.3, 0.8], from: 5 },
        { tone: 'base', c: [23, 65.9, 2.1], from: 5 },
        { tone: 'light', c: [22.5, 65.3, 0.8], from: 5 },
        { tone: 'base', c: [25, 65.9, 2.1], from: 5 },
        { tone: 'light', c: [24.5, 65.3, 0.8], from: 5 },
        { tone: 'deep', d: 'M 45.6 56 C 45.6 56.9 46.1 57.7 46.2 58.6 C 46.3 59.5 46.5 60.9 46.2 61.6 C 45.9 62.3 45.1 62.7 44.5 63.1 C 44 63.4 43.3 63.2 42.8 63.6 C 42.3 64.1 42.1 65.1 41.7 65.7 C 41.2 66.3 40.6 67.2 40 67.2 C 39.4 67.2 38.8 66.3 38.3 65.7 C 37.9 65.1 37.7 64.1 37.2 63.6 C 36.7 63.2 36 63.4 35.5 63.1 C 34.9 62.7 34.1 62.3 33.8 61.6 C 33.5 60.9 33.7 59.5 33.8 58.6 C 33.9 57.7 34.4 56.9 34.4 56 C 34.4 55.1 33.9 54.3 33.8 53.4 C 33.7 52.5 33.5 51.1 33.8 50.4 C 34.1 49.7 34.9 49.3 35.5 48.9 C 36 48.6 36.7 48.8 37.2 48.4 C 37.7 47.9 37.9 46.9 38.3 46.3 C 38.8 45.7 39.4 44.8 40 44.8 C 40.6 44.8 41.2 45.7 41.7 46.3 C 42.1 46.9 42.3 47.9 42.8 48.4 C 43.3 48.8 44 48.6 44.5 48.9 C 45.1 49.3 45.9 49.7 46.2 50.4 C 46.5 51.1 46.3 52.5 46.2 53.4 C 46.1 54.3 45.6 55.1 45.6 56 Z', from: 5 },
        { tone: 'base', c: [40, 50, 1.9], from: 5 },
        { tone: 'light', c: [39.5, 49.5, 0.7], from: 5 },
        { tone: 'base', c: [41.8, 54.4, 1.9], from: 5 },
        { tone: 'light', c: [41.3, 53.9, 0.7], from: 5 },
        { tone: 'base', c: [45.5, 54.4, 1.9], from: 5 },
        { tone: 'light', c: [45, 53.9, 0.7], from: 5 },
        { tone: 'base', c: [40, 58.8, 1.9], from: 5 },
        { tone: 'light', c: [39.5, 58.3, 0.7], from: 5 },
        { tone: 'base', c: [42.8, 58.8, 1.9], from: 5 },
        { tone: 'light', c: [42.3, 58.3, 0.7], from: 5 },
        { tone: 'base', c: [45.5, 58.8, 1.9], from: 5 },
        { tone: 'light', c: [45, 58.3, 0.7], from: 5 },
        { tone: 'base', c: [39.1, 63.2, 1.9], from: 5 },
        { tone: 'light', c: [38.6, 62.7, 0.7], from: 5 },
        { tone: 'base', c: [40.9, 63.2, 1.9], from: 5 },
        { tone: 'light', c: [40.4, 62.7, 0.7], from: 5 },
        { tone: 'base', c: [42.8, 63.2, 1.9], from: 5 },
        { tone: 'light', c: [42.3, 62.7, 0.7], from: 5 },
        { tone: 'deep', d: 'M 34.9 66 C 34.9 66.7 35.3 67.3 35.4 68.1 C 35.5 68.8 35.7 69.9 35.4 70.5 C 35.2 71.1 34.5 71.4 34 71.7 C 33.5 71.9 32.9 71.8 32.5 72.1 C 32 72.4 31.9 73.3 31.4 73.7 C 31 74.2 30.5 75 30 75 C 29.5 75 29 74.2 28.6 73.7 C 28.1 73.3 28 72.4 27.5 72.1 C 27.1 71.8 26.5 71.9 26 71.7 C 25.5 71.4 24.8 71.1 24.6 70.5 C 24.3 69.9 24.5 68.8 24.6 68.1 C 24.7 67.3 25.1 66.7 25.1 66 C 25.1 65.3 24.7 64.7 24.6 63.9 C 24.5 63.2 24.3 62.1 24.6 61.5 C 24.8 60.9 25.5 60.6 26 60.3 C 26.5 60.1 27.1 60.2 27.5 59.9 C 28 59.6 28.1 58.7 28.6 58.3 C 29 57.8 29.5 57 30 57 C 30.5 57 31 57.8 31.4 58.3 C 31.9 58.7 32 59.6 32.5 59.9 C 32.9 60.2 33.5 60.1 34 60.3 C 34.5 60.6 35.2 60.9 35.4 61.5 C 35.7 62.1 35.5 63.2 35.4 63.9 C 35.3 64.7 34.9 65.3 34.9 66 Z', from: 5 },
        { tone: 'base', c: [30, 61.2, 1.7], from: 5 },
        { tone: 'light', c: [29.6, 60.7, 0.6], from: 5 },
        { tone: 'base', c: [31.6, 64.7, 1.7], from: 5 },
        { tone: 'light', c: [31.2, 64.2, 0.6], from: 5 },
        { tone: 'base', c: [34.8, 64.7, 1.7], from: 5 },
        { tone: 'light', c: [34.4, 64.2, 0.6], from: 5 },
        { tone: 'base', c: [30, 68.2, 1.7], from: 5 },
        { tone: 'light', c: [29.6, 67.8, 0.6], from: 5 },
        { tone: 'base', c: [32.4, 68.2, 1.7], from: 5 },
        { tone: 'light', c: [32, 67.8, 0.6], from: 5 },
        { tone: 'base', c: [34.8, 68.2, 1.7], from: 5 },
        { tone: 'light', c: [34.4, 67.8, 0.6], from: 5 },
        { tone: 'base', c: [29.2, 71.8, 1.7], from: 5 },
        { tone: 'light', c: [28.8, 71.3, 0.6], from: 5 }
      ]
    },
    mango: {
      trunk: 'M 26 96 Q 28 80 27.2 64 L 32.8 64 Q 32 80 34 96 Z',
      trunkShort: 'M 27 96 Q 28.5 86 27.6 76 L 32.4 76 Q 31.5 86 33 96 Z',
      trunkTone: 'wood',
      blossoms: [[19, 60], [41, 61], [30, 66], [24, 48], [37, 47], [30, 34], [14, 50], [46, 50], [30, 54]],
      parts: [
        { tone: 'wood', d: 'M 27 96 Q 28.5 86 27.6 76 L 32.4 76 Q 31.5 86 33 96 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 30.5 96 Q 30.8 86 30.2 76 L 32.4 76 Q 31.5 86 33 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 39 72 C 39.3 72.6 39.8 73.4 39.7 74 C 39.5 74.5 38.6 75 38.1 75.5 C 37.5 75.9 36.6 76 36.2 76.5 C 35.7 77 35.8 77.7 35.4 78.3 C 35.1 78.8 34.7 79.7 34 79.9 C 33.4 80.2 32.4 79.9 31.6 79.8 C 30.9 79.7 30.2 79.2 29.5 79.2 C 28.8 79.2 28.1 79.7 27.4 79.8 C 26.6 79.9 25.6 80.2 25 79.9 C 24.3 79.7 23.9 78.8 23.6 78.3 C 23.2 77.7 23.3 77 22.8 76.5 C 22.4 76 21.5 75.9 20.9 75.5 C 20.4 75 19.5 74.5 19.3 74 C 19.2 73.4 19.7 72.6 20 72 C 20.3 71.4 21 71 21.2 70.4 C 21.3 69.8 20.9 69.2 20.9 68.5 C 21 67.9 20.9 67 21.3 66.5 C 21.8 66 22.8 65.9 23.6 65.7 C 24.3 65.6 25.2 65.8 25.8 65.5 C 26.4 65.3 26.8 64.6 27.4 64.2 C 28 63.8 28.8 63.2 29.5 63.2 C 30.2 63.2 31 63.8 31.6 64.2 C 32.2 64.6 32.6 65.3 33.2 65.5 C 33.8 65.8 34.7 65.6 35.4 65.7 C 36.2 65.9 37.2 66 37.7 66.5 C 38.1 67 38 67.9 38.1 68.5 C 38.1 69.2 37.7 69.8 37.8 70.4 C 38 71 38.7 71.4 39 72 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 36.5 70.8 C 36.8 71.3 37.2 71.9 37.1 72.4 C 36.9 72.9 36.2 73.3 35.7 73.6 C 35.2 74 34.5 74.1 34.2 74.5 C 33.8 74.9 33.8 75.5 33.5 75.9 C 33.2 76.4 32.8 77.1 32.3 77.3 C 31.8 77.5 30.9 77.3 30.3 77.2 C 29.6 77.1 29.1 76.7 28.5 76.7 C 27.9 76.7 27.3 77.1 26.7 77.2 C 26 77.3 25.2 77.5 24.6 77.3 C 24.1 77.1 23.7 76.4 23.4 75.9 C 23.1 75.5 23.1 74.9 22.7 74.5 C 22.4 74.1 21.7 74 21.2 73.6 C 20.7 73.3 20 72.9 19.8 72.4 C 19.7 71.9 20.1 71.3 20.4 70.8 C 20.6 70.3 21.2 70 21.3 69.5 C 21.5 69 21.1 68.5 21.2 68 C 21.2 67.4 21.2 66.7 21.5 66.3 C 21.9 65.9 22.8 65.8 23.4 65.7 C 24 65.5 24.7 65.7 25.3 65.5 C 25.8 65.2 26.1 64.7 26.7 64.4 C 27.2 64.1 27.9 63.6 28.5 63.6 C 29.1 63.6 29.7 64.1 30.3 64.4 C 30.8 64.7 31.1 65.2 31.6 65.5 C 32.2 65.7 32.9 65.5 33.5 65.7 C 34.1 65.8 35 65.9 35.4 66.3 C 35.7 66.7 35.7 67.4 35.7 68 C 35.8 68.5 35.4 69 35.6 69.5 C 35.7 70 36.3 70.3 36.5 70.8 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 30.3 69 C 30.1 69.3 29.8 69.6 29.7 69.9 C 29.6 70.2 29.6 70.6 29.5 70.9 C 29.3 71.3 29.1 71.7 28.8 71.9 C 28.4 72.1 27.8 72.1 27.4 72.2 C 26.9 72.2 26.5 72 26.1 72 C 25.6 72 25.2 72.2 24.8 72.2 C 24.3 72.1 23.8 72.1 23.4 71.9 C 23.1 71.7 22.9 71.3 22.7 70.9 C 22.5 70.6 22.6 70.2 22.5 69.9 C 22.3 69.6 22 69.3 21.9 69 C 21.8 68.6 21.6 68.2 21.7 67.8 C 21.9 67.5 22.3 67.2 22.7 67 C 23 66.8 23.5 66.7 23.8 66.5 C 24.2 66.3 24.4 66 24.8 65.8 C 25.2 65.6 25.6 65.3 26.1 65.3 C 26.5 65.3 27 65.6 27.4 65.8 C 27.7 66 28 66.3 28.3 66.5 C 28.7 66.7 29.1 66.8 29.5 67 C 29.8 67.2 30.3 67.5 30.4 67.8 C 30.5 68.2 30.4 68.6 30.3 69 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 24.8 72.5 Q 20.4 72.8 18.2 77.2 Q 22.8 76.1 24.8 72.5 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 24.4 72.8 Q 21.6 74.4 19.1 76.5 Q 21.9 74.9 24.4 72.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 27.3 75.5 Q 23.7 79.2 24.2 85.1 Q 27.6 80.5 27.3 75.5 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 27.1 76.1 Q 25.6 79.9 24.7 83.8 Q 26.2 80 27.1 76.1 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 31.7 75.5 Q 30.9 80.7 34.8 85.1 Q 34.9 79.4 31.7 75.5 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 31.9 76.1 Q 32.8 80 34.3 83.8 Q 33.4 79.9 31.9 76.1 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 34.2 72.5 Q 35.9 76.5 40.8 77.2 Q 38.3 73.1 34.2 72.5 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 34.6 72.8 Q 37.1 74.9 39.9 76.5 Q 37.4 74.4 34.6 72.8 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 26 96 Q 28 80 27.2 64 L 32.8 64 Q 32 80 34 96 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 30.7 96 Q 31.1 80 30.3 64 L 32.8 64 Q 32 80 34 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 44.3 58 C 44.3 58.7 43.3 59.5 42.8 60.1 C 42.2 60.8 41.1 61.1 40.8 61.8 C 40.5 62.4 40.9 63.3 40.8 64.1 C 40.7 64.9 40.7 66.1 40.1 66.6 C 39.5 67.1 38.2 67 37.2 67.1 C 36.3 67.2 35.3 66.9 34.5 67.1 C 33.7 67.4 33.3 68.3 32.5 68.8 C 31.8 69.3 30.8 70.1 30 70.1 C 29.2 70.1 28.2 69.3 27.5 68.8 C 26.7 68.3 26.3 67.4 25.5 67.1 C 24.7 66.9 23.7 67.2 22.8 67.1 C 21.8 67 20.5 67.1 19.9 66.6 C 19.3 66.1 19.3 64.9 19.2 64.1 C 19.1 63.3 19.5 62.4 19.2 61.8 C 18.9 61.1 17.8 60.8 17.2 60.1 C 16.7 59.5 15.7 58.7 15.7 58 C 15.7 57.3 16.7 56.5 17.2 55.9 C 17.8 55.2 18.9 54.9 19.2 54.2 C 19.5 53.6 19.1 52.7 19.2 51.9 C 19.3 51.1 19.3 49.9 19.9 49.4 C 20.5 48.9 21.8 49 22.8 48.9 C 23.7 48.8 24.7 49.1 25.5 48.9 C 26.3 48.6 26.7 47.7 27.5 47.2 C 28.2 46.7 29.2 45.9 30 45.9 C 30.8 45.9 31.8 46.7 32.5 47.2 C 33.3 47.7 33.7 48.6 34.5 48.9 C 35.3 49.1 36.3 48.8 37.2 48.9 C 38.2 49 39.5 48.9 40.1 49.4 C 40.7 49.9 40.7 51.1 40.8 51.9 C 40.9 52.7 40.5 53.6 40.8 54.2 C 41.1 54.9 42.2 55.2 42.8 55.9 C 43.3 56.5 44.3 57.3 44.3 58 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 40.7 56.4 C 40.7 56.9 39.9 57.6 39.4 58.1 C 38.9 58.6 38.1 58.9 37.8 59.5 C 37.5 60 37.9 60.7 37.8 61.4 C 37.6 62 37.6 62.9 37.1 63.3 C 36.6 63.7 35.5 63.8 34.7 63.8 C 33.9 63.9 33.1 63.7 32.4 63.9 C 31.7 64.1 31.4 64.8 30.7 65.2 C 30.1 65.6 29.3 66.2 28.6 66.2 C 27.9 66.2 27.1 65.6 26.4 65.2 C 25.8 64.8 25.4 64.1 24.7 63.9 C 24.1 63.7 23.2 63.9 22.4 63.8 C 21.6 63.8 20.5 63.7 20 63.3 C 19.5 62.9 19.5 62 19.4 61.4 C 19.3 60.7 19.6 60 19.3 59.5 C 19.1 58.9 18.2 58.6 17.7 58.1 C 17.3 57.6 16.5 56.9 16.5 56.4 C 16.5 55.8 17.3 55.1 17.7 54.6 C 18.2 54.1 19.1 53.8 19.3 53.2 C 19.6 52.7 19.3 52 19.4 51.3 C 19.5 50.7 19.5 49.8 20 49.4 C 20.5 49 21.6 48.9 22.4 48.9 C 23.2 48.8 24.1 49 24.7 48.8 C 25.4 48.6 25.8 47.9 26.4 47.5 C 27.1 47.1 27.9 46.5 28.6 46.5 C 29.3 46.5 30.1 47.1 30.7 47.5 C 31.4 47.9 31.7 48.6 32.4 48.8 C 33.1 49 33.9 48.8 34.7 48.9 C 35.5 48.9 36.6 49 37.1 49.4 C 37.6 49.8 37.6 50.7 37.8 51.3 C 37.9 52 37.5 52.7 37.8 53.2 C 38.1 53.8 38.9 54.1 39.4 54.6 C 39.9 55.1 40.7 55.8 40.7 56.4 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30.5 53.8 C 30.5 54.2 30.8 54.6 30.8 55 C 30.9 55.4 31 56 30.7 56.3 C 30.5 56.7 29.8 56.9 29.4 57.1 C 28.9 57.3 28.3 57.3 27.9 57.5 C 27.5 57.7 27.2 58.1 26.8 58.3 C 26.4 58.5 25.8 58.9 25.3 58.9 C 24.8 58.9 24.3 58.5 23.8 58.3 C 23.4 58.1 23.1 57.7 22.7 57.5 C 22.3 57.3 21.7 57.3 21.3 57.1 C 20.8 56.9 20.2 56.7 19.9 56.3 C 19.7 56 19.8 55.4 19.8 55 C 19.8 54.6 20.1 54.2 20.1 53.8 C 20.1 53.4 19.8 53 19.8 52.6 C 19.8 52.2 19.7 51.6 19.9 51.3 C 20.2 51 20.8 50.7 21.3 50.6 C 21.7 50.4 22.3 50.4 22.7 50.2 C 23.1 50 23.4 49.6 23.8 49.4 C 24.3 49.1 24.8 48.8 25.3 48.8 C 25.8 48.8 26.4 49.1 26.8 49.4 C 27.2 49.6 27.5 50 27.9 50.2 C 28.3 50.4 28.9 50.4 29.4 50.6 C 29.8 50.7 30.5 51 30.7 51.3 C 31 51.6 30.9 52.2 30.8 52.6 C 30.8 53 30.5 53.4 30.5 53.8 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 23.6 58.7 Q 17.9 59.9 14.1 65.5 Q 20.3 63.3 23.6 58.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 23 59.1 Q 19 61.5 15.4 64.5 Q 19.4 62.1 23 59.1 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 25 61.6 Q 19.7 65.7 17.8 73.2 Q 23.3 67.9 25 61.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 24.6 62.3 Q 21.4 66.7 18.8 71.6 Q 22 67.1 24.6 62.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 28.1 63.3 Q 24.6 69.5 25.4 77.8 Q 28.7 70.3 28.1 63.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 28 64.1 Q 26.6 69.9 25.8 75.8 Q 27.2 70 28 64.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31.9 63.3 Q 30.8 70.4 34.6 77.8 Q 34.9 69.6 31.9 63.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 32 64.1 Q 32.8 70 34.2 75.8 Q 33.4 69.9 32 64.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 35 61.6 Q 36.4 68.1 42.2 73.2 Q 39.9 65.9 35 61.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 35.4 62.3 Q 38 67.1 41.2 71.6 Q 38.6 66.7 35.4 62.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 36.4 58.7 Q 39.5 63.7 45.9 65.5 Q 41.9 60.3 36.4 58.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 37 59.1 Q 40.6 62.1 44.6 64.5 Q 41 61.5 37 59.1 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 25.4 96 Q 27.7 77 27 58 L 33 58 Q 32.3 77 34.6 96 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 30.8 96 Q 31.3 77 30.3 58 L 33 58 Q 32.3 77 34.6 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 47.1 48 C 47.1 48.8 45.9 49.8 45.2 50.5 C 44.5 51.3 43.3 51.7 42.9 52.5 C 42.5 53.3 43 54.3 42.9 55.2 C 42.7 56.2 42.8 57.5 42.1 58.1 C 41.3 58.7 39.7 58.7 38.6 58.8 C 37.5 58.9 36.3 58.5 35.3 58.8 C 34.4 59.1 33.9 60.2 33 60.8 C 32.1 61.3 31 62.3 30 62.3 C 29 62.3 27.9 61.3 27 60.8 C 26.1 60.2 25.6 59.1 24.7 58.8 C 23.7 58.5 22.5 58.9 21.4 58.8 C 20.3 58.7 18.7 58.7 17.9 58.1 C 17.2 57.5 17.3 56.2 17.1 55.2 C 17 54.3 17.5 53.3 17.1 52.5 C 16.7 51.7 15.5 51.3 14.8 50.5 C 14.1 49.8 13 48.8 13 48 C 13 47.2 14.1 46.2 14.8 45.5 C 15.5 44.7 16.7 44.3 17.1 43.5 C 17.5 42.7 17 41.7 17.1 40.8 C 17.3 39.8 17.2 38.5 17.9 37.9 C 18.7 37.3 20.3 37.3 21.4 37.2 C 22.5 37.1 23.7 37.5 24.7 37.2 C 25.6 36.9 26.1 35.8 27 35.2 C 27.9 34.7 29 33.7 30 33.7 C 31 33.7 32.1 34.7 33 35.2 C 33.9 35.8 34.4 36.9 35.3 37.2 C 36.3 37.5 37.5 37.1 38.6 37.2 C 39.7 37.3 41.3 37.3 42.1 37.9 C 42.8 38.5 42.7 39.8 42.9 40.8 C 43 41.7 42.5 42.7 42.9 43.5 C 43.3 44.3 44.5 44.7 45.2 45.5 C 45.9 46.2 47.1 47.2 47.1 48 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 42.7 46.1 C 42.7 46.7 41.8 47.5 41.2 48.1 C 40.6 48.7 39.6 49.1 39.3 49.7 C 39 50.4 39.4 51.2 39.2 52 C 39.1 52.7 39.1 53.8 38.5 54.3 C 37.9 54.8 36.6 54.8 35.6 54.9 C 34.7 55 33.6 54.7 32.9 55 C 32.1 55.2 31.6 56 30.9 56.5 C 30.1 57 29.2 57.7 28.3 57.7 C 27.4 57.7 26.5 57 25.7 56.5 C 25 56 24.5 55.2 23.7 55 C 22.9 54.7 21.9 55 21 54.9 C 20 54.8 18.7 54.8 18.1 54.3 C 17.5 53.8 17.5 52.7 17.3 52 C 17.2 51.2 17.6 50.4 17.3 49.7 C 17 49.1 15.9 48.7 15.4 48.1 C 14.8 47.5 13.9 46.7 13.9 46.1 C 13.9 45.4 14.8 44.6 15.4 44 C 15.9 43.4 17 43 17.3 42.4 C 17.6 41.7 17.2 40.9 17.3 40.1 C 17.5 39.4 17.5 38.3 18.1 37.8 C 18.7 37.3 20 37.3 21 37.2 C 21.9 37.1 22.9 37.4 23.7 37.1 C 24.5 36.9 25 36.1 25.7 35.6 C 26.5 35.1 27.4 34.4 28.3 34.4 C 29.2 34.4 30.1 35.1 30.9 35.6 C 31.6 36.1 32.1 36.9 32.9 37.1 C 33.6 37.4 34.7 37.1 35.6 37.2 C 36.6 37.3 37.9 37.3 38.5 37.8 C 39.1 38.3 39.1 39.4 39.2 40.1 C 39.4 40.9 39 41.7 39.3 42.4 C 39.6 43 40.6 43.4 41.2 44 C 41.8 44.6 42.7 45.4 42.7 46.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.6 43.1 C 30.6 43.5 31 44 31 44.5 C 31 45 31.2 45.6 30.9 46 C 30.6 46.4 29.8 46.7 29.2 46.9 C 28.7 47.1 28 47.1 27.5 47.4 C 27 47.6 26.7 48.1 26.2 48.3 C 25.7 48.6 25 49 24.4 49 C 23.8 49 23.2 48.6 22.7 48.3 C 22.1 48.1 21.8 47.6 21.3 47.4 C 20.8 47.1 20.2 47.1 19.6 46.9 C 19 46.7 18.3 46.4 18 46 C 17.7 45.6 17.8 45 17.8 44.5 C 17.9 44 18.2 43.5 18.2 43.1 C 18.2 42.6 17.9 42.1 17.8 41.6 C 17.8 41.2 17.7 40.5 18 40.1 C 18.3 39.7 19 39.4 19.6 39.2 C 20.2 39 20.8 39 21.3 38.8 C 21.8 38.5 22.1 38.1 22.7 37.8 C 23.2 37.5 23.8 37.1 24.4 37.1 C 25 37.1 25.7 37.5 26.2 37.8 C 26.7 38.1 27 38.5 27.5 38.8 C 28 39 28.7 39 29.2 39.2 C 29.8 39.4 30.6 39.7 30.9 40.1 C 31.2 40.5 31 41.2 31 41.6 C 31 42.1 30.6 42.6 30.6 43.1 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 22.3 48.8 Q 16 50.4 11.5 56.4 Q 18.4 53.8 22.3 48.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 21.7 49.3 Q 17.2 52.1 13 55.4 Q 17.5 52.6 21.7 49.3 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 23.6 51.7 Q 17.7 56 14.7 64 Q 21 58.5 23.6 51.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 23.1 52.4 Q 19.3 57.2 16 62.3 Q 19.8 57.6 23.1 52.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 26.4 53.8 Q 21.9 60.3 21.4 69.4 Q 25.8 61.5 26.4 53.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 26.1 54.7 Q 23.8 60.9 22.1 67.2 Q 24.4 61.1 26.1 54.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 54.5 Q 27.7 62.3 30 71.4 Q 31.8 62.3 30 54.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 55.5 Q 29.7 62.3 30 69 Q 30.3 62.3 30 55.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33.6 53.8 Q 33.7 61.7 38.6 69.4 Q 37.7 60.4 33.6 53.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33.9 54.7 Q 35.6 61.1 37.9 67.2 Q 36.2 60.9 33.9 54.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 36.4 51.7 Q 38.6 58.7 45.3 64 Q 42 56.3 36.4 51.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 36.9 52.4 Q 40.2 57.6 44 62.3 Q 40.7 57.2 36.9 52.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 37.7 48.8 Q 41.3 54.2 48.5 56.4 Q 43.7 50.8 37.7 48.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 38.3 49.3 Q 42.5 52.6 47 55.4 Q 42.8 52.1 38.3 49.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 24.1 56.3 C 25.1 56.7 25.4 57.9 25.7 59 C 25.9 60 25.8 61.3 25.4 62.5 C 25 63.7 24.2 65.2 23.3 66.1 C 22.4 67 21 68 20 68.2 C 19.1 68.4 18.2 68 17.6 67.3 C 17 66.6 16.4 65.3 16.4 64.1 C 16.4 62.8 16.8 61.1 17.4 59.8 C 18 58.5 18.8 57 19.9 56.4 C 21.1 55.9 23.2 55.9 24.1 56.3 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 23.1 56.6 C 23.9 57 24.2 58 24.4 58.9 C 24.6 59.8 24.5 60.9 24.2 61.9 C 23.9 62.9 23.2 64.1 22.4 64.9 C 21.7 65.7 20.5 66.5 19.7 66.6 C 18.9 66.8 18.1 66.5 17.6 65.9 C 17.1 65.3 16.7 64.2 16.6 63.2 C 16.6 62.1 17 60.6 17.5 59.6 C 17.9 58.5 18.7 57.2 19.6 56.8 C 20.5 56.3 22.3 56.3 23.1 56.6 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 20.7 60.2 C 20.7 60.5 20.6 60.8 20.4 61 C 20.3 61.2 20 61.4 19.8 61.5 C 19.6 61.6 19.2 61.6 19 61.5 C 18.8 61.4 18.5 61.2 18.3 61 C 18.2 60.8 18.1 60.5 18.1 60.2 C 18.1 60 18.2 59.7 18.3 59.5 C 18.5 59.3 18.8 59.1 19 59 C 19.2 58.9 19.6 58.9 19.8 59 C 20 59.1 20.3 59.3 20.4 59.5 C 20.6 59.7 20.7 60 20.7 60.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 37.4 57 C 38.3 56.6 39.4 57.2 40.2 57.8 C 41 58.4 41.9 59.4 42.4 60.4 C 42.9 61.5 43.3 63 43.3 64.3 C 43.4 65.5 43 67.2 42.5 67.9 C 41.9 68.7 41.1 69.1 40.2 69 C 39.3 68.9 38.1 68.4 37.2 67.5 C 36.4 66.7 35.5 65.2 35 63.9 C 34.6 62.6 34.1 61 34.5 59.9 C 34.9 58.7 36.4 57.3 37.4 57 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 37.1 57.4 C 37.9 57.1 38.8 57.6 39.5 58.1 C 40.2 58.6 40.9 59.4 41.4 60.3 C 41.8 61.2 42.2 62.5 42.2 63.5 C 42.2 64.6 41.9 65.9 41.4 66.6 C 41 67.3 40.3 67.5 39.5 67.5 C 38.8 67.4 37.7 67 37 66.2 C 36.3 65.5 35.5 64.3 35.2 63.2 C 34.8 62.1 34.4 60.8 34.8 59.8 C 35.1 58.8 36.3 57.7 37.1 57.4 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 38.7 61.3 C 38.7 61.6 38.6 61.8 38.5 62 C 38.3 62.2 38.1 62.4 37.8 62.5 C 37.6 62.6 37.3 62.6 37.1 62.5 C 36.8 62.4 36.6 62.2 36.4 62 C 36.3 61.8 36.2 61.6 36.2 61.3 C 36.2 61.1 36.3 60.8 36.4 60.6 C 36.6 60.4 36.8 60.2 37.1 60.1 C 37.3 60 37.6 60 37.8 60.1 C 38.1 60.2 38.3 60.4 38.5 60.6 C 38.6 60.8 38.7 61.1 38.7 61.3 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 25 96 Q 27.5 75 26.8 54 L 33.2 54 Q 32.5 75 35 96 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 30.9 96 Q 31.4 75 30.3 54 L 33.2 54 Q 32.5 75 35 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 47.5 42 C 47 42.9 45.8 43.5 45.6 44.4 C 45.4 45.2 46.3 46.2 46.4 47.1 C 46.6 48.1 47.1 49.5 46.6 50.2 C 46.1 51 44.5 51.3 43.4 51.6 C 42.3 52 41 51.8 40.2 52.4 C 39.4 53 39.4 54.2 38.8 55 C 38.1 55.8 37.5 57.1 36.6 57.4 C 35.6 57.7 34.1 57.1 33 56.8 C 31.9 56.5 31 55.6 30 55.6 C 29 55.6 28.1 56.5 27 56.8 C 25.9 57.1 24.4 57.7 23.4 57.4 C 22.5 57.1 21.9 55.8 21.3 55 C 20.6 54.2 20.6 53 19.8 52.4 C 19 51.8 17.7 52 16.6 51.6 C 15.5 51.3 13.9 51 13.4 50.2 C 12.9 49.5 13.4 48.1 13.6 47.1 C 13.7 46.2 14.6 45.2 14.4 44.4 C 14.2 43.5 13 42.9 12.5 42 C 12 41.1 11 40 11.1 39.1 C 11.3 38.3 12.7 37.5 13.6 36.9 C 14.4 36.2 15.8 36 16.3 35.2 C 16.8 34.5 16.4 33.3 16.6 32.4 C 16.8 31.4 16.9 30 17.7 29.4 C 18.5 28.9 20.1 29 21.2 29 C 22.4 29 23.6 29.5 24.6 29.2 C 25.5 28.9 26.1 27.8 27 27.2 C 27.9 26.6 29 25.6 30 25.6 C 31 25.6 32.1 26.6 33 27.2 C 33.9 27.8 34.5 28.9 35.4 29.2 C 36.4 29.5 37.6 29 38.7 29 C 39.9 29 41.5 28.9 42.3 29.4 C 43.1 30 43.2 31.4 43.4 32.4 C 43.6 33.3 43.2 34.5 43.7 35.2 C 44.2 36 45.6 36.2 46.4 36.9 C 47.3 37.5 48.7 38.3 48.9 39.1 C 49 40 48 41.1 47.5 42 Z', from: 5 },
        { tone: 'stem', d: 'M 43 39.8 C 42.5 40.5 41.6 41 41.4 41.7 C 41.3 42.4 41.9 43.2 42.1 44 C 42.2 44.8 42.6 45.8 42.1 46.5 C 41.7 47.1 40.4 47.3 39.5 47.7 C 38.6 48 37.4 47.9 36.8 48.3 C 36.1 48.8 36 49.7 35.5 50.4 C 35 51.1 34.4 52.1 33.6 52.4 C 32.8 52.6 31.6 52.1 30.7 51.9 C 29.7 51.6 28.9 50.9 28.1 50.9 C 27.2 50.9 26.4 51.6 25.5 51.9 C 24.6 52.1 23.3 52.6 22.5 52.4 C 21.7 52.1 21.2 51.1 20.6 50.4 C 20.1 49.7 20 48.8 19.4 48.3 C 18.7 47.9 17.6 48 16.7 47.7 C 15.8 47.3 14.5 47.1 14 46.5 C 13.6 45.8 14 44.8 14.1 44 C 14.2 43.2 14.9 42.4 14.7 41.7 C 14.6 41 13.6 40.5 13.2 39.8 C 12.8 39 12 38.1 12.1 37.4 C 12.3 36.7 13.4 36.1 14.1 35.5 C 14.8 35 15.9 34.8 16.4 34.2 C 16.8 33.5 16.5 32.6 16.7 31.8 C 16.9 31.1 17 29.9 17.7 29.5 C 18.3 29 19.7 29.1 20.6 29.1 C 21.6 29.1 22.6 29.5 23.4 29.2 C 24.3 29 24.7 28.1 25.5 27.6 C 26.3 27.2 27.2 26.3 28.1 26.3 C 28.9 26.3 29.9 27.2 30.7 27.6 C 31.4 28.1 31.9 29 32.7 29.2 C 33.5 29.5 34.5 29.1 35.5 29.1 C 36.5 29.1 37.8 29 38.5 29.5 C 39.2 29.9 39.3 31.1 39.5 31.8 C 39.7 32.6 39.4 33.5 39.8 34.2 C 40.2 34.8 41.3 35 42.1 35.5 C 42.8 36.1 43.9 36.7 44 37.4 C 44.2 38.1 43.4 39 43 39.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.4 36.3 C 31.6 36.8 32 37.4 31.8 37.8 C 31.7 38.3 31.1 38.7 30.6 39 C 30.2 39.4 29.6 39.5 29.2 39.9 C 28.8 40.3 28.8 40.8 28.5 41.2 C 28.2 41.7 27.8 42.3 27.3 42.5 C 26.8 42.7 26 42.5 25.4 42.4 C 24.8 42.4 24.3 42.1 23.7 42.1 C 23.1 42.1 22.6 42.4 22 42.4 C 21.4 42.5 20.6 42.7 20.1 42.5 C 19.6 42.3 19.2 41.7 18.9 41.2 C 18.6 40.8 18.6 40.3 18.2 39.9 C 17.8 39.5 17.2 39.4 16.8 39 C 16.3 38.7 15.7 38.3 15.6 37.8 C 15.4 37.4 15.8 36.8 16 36.3 C 16.2 35.8 16.7 35.5 16.8 35 C 17 34.6 16.7 34.1 16.8 33.6 C 16.8 33.1 16.8 32.4 17.2 32 C 17.5 31.7 18.3 31.5 18.9 31.4 C 19.5 31.2 20.1 31.3 20.6 31.1 C 21.2 30.9 21.5 30.4 22 30.2 C 22.5 29.9 23.1 29.5 23.7 29.5 C 24.3 29.5 24.9 29.9 25.4 30.2 C 25.9 30.4 26.2 30.9 26.8 31.1 C 27.3 31.3 27.9 31.2 28.5 31.4 C 29.1 31.5 29.9 31.7 30.2 32 C 30.6 32.4 30.6 33.1 30.6 33.6 C 30.7 34.1 30.4 34.6 30.6 35 C 30.7 35.5 31.2 35.8 31.4 36.3 Z', from: 5 },
        { tone: 'stem', d: 'M 21.3 42.9 Q 14.5 45 9.3 51.4 Q 16.9 48.3 21.3 42.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 20.6 43.4 Q 15.6 46.6 11 50.2 Q 16 47.1 20.6 43.4 Z', from: 5 },
        { tone: 'stem', d: 'M 22.3 45.5 Q 15.6 49.8 11.6 58 Q 18.7 52.5 22.3 45.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 21.6 46.3 Q 17.1 51.1 13.1 56.3 Q 17.6 51.5 21.6 46.3 Z', from: 5 },
        { tone: 'stem', d: 'M 24.2 47.6 Q 18.5 53.9 16.2 63.5 Q 22.2 55.7 24.2 47.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 23.7 48.6 Q 20.2 54.8 17.3 61.3 Q 20.8 55.1 23.7 48.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 26.9 49 Q 22.7 56.8 22.6 67.1 Q 26.7 57.7 26.9 49 Z', from: 5 },
        { tone: 'stemshade', d: 'M 26.7 50.1 Q 24.6 57.2 23.2 64.5 Q 25.3 57.4 26.7 50.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 49.5 Q 27.7 58.1 30 68.3 Q 31.8 58.1 30 49.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 50.6 Q 29.7 58.1 30 65.7 Q 30.3 58.1 30 50.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33.1 49 Q 32.8 57.8 37.4 67.1 Q 36.9 56.9 33.1 49 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33.3 50.1 Q 34.7 57.4 36.8 64.5 Q 35.4 57.2 33.3 50.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 35.8 47.6 Q 37.4 56 43.8 63.5 Q 41.1 54.1 35.8 47.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 36.3 48.6 Q 39.2 55.1 42.7 61.3 Q 39.8 54.8 36.3 48.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 37.7 45.5 Q 40.9 52.8 48.4 58 Q 44.1 50.1 37.7 45.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 38.4 46.3 Q 42.4 51.5 46.9 56.3 Q 42.9 51.1 38.4 46.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 38.7 42.9 Q 42.9 48.7 50.7 51.4 Q 45.3 45.3 38.7 42.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 39.4 43.4 Q 44 47.1 49 50.2 Q 44.4 46.6 39.4 43.4 Z', from: 5 },
        { tone: 'deep', d: 'M 22.6 54 C 23.6 54.5 23.9 55.8 24.1 56.9 C 24.3 58.1 24.1 59.5 23.7 60.7 C 23.2 62 22.3 63.5 21.3 64.5 C 20.3 65.5 18.8 66.4 17.7 66.6 C 16.7 66.8 15.7 66.3 15.1 65.6 C 14.5 64.8 14 63.4 14 62.1 C 14 60.7 14.5 58.8 15.2 57.5 C 15.9 56.1 16.8 54.6 18.1 54 C 19.3 53.4 21.6 53.5 22.6 54 Z', from: 5 },
        { tone: 'base', d: 'M 21.5 54.3 C 22.3 54.8 22.6 55.9 22.8 56.8 C 22.9 57.8 22.8 58.9 22.4 60 C 22 61.1 21.3 62.3 20.4 63.2 C 19.6 64 18.3 64.8 17.4 64.9 C 16.5 65.1 15.7 64.7 15.2 64.1 C 14.7 63.4 14.2 62.3 14.3 61.1 C 14.3 60 14.7 58.4 15.3 57.3 C 15.8 56.1 16.6 54.8 17.7 54.3 C 18.7 53.8 20.6 53.9 21.5 54.3 Z', from: 5 },
        { tone: 'light', d: 'M 18.7 58.1 C 18.7 58.4 18.6 58.7 18.4 58.9 C 18.2 59.2 18 59.4 17.7 59.4 C 17.4 59.5 17.1 59.5 16.8 59.4 C 16.6 59.4 16.3 59.2 16.2 58.9 C 16 58.7 15.9 58.4 15.9 58.1 C 15.9 57.8 16 57.5 16.2 57.3 C 16.3 57.1 16.6 56.9 16.8 56.8 C 17.1 56.7 17.4 56.7 17.7 56.8 C 18 56.9 18.2 57.1 18.4 57.3 C 18.6 57.5 18.7 57.8 18.7 58.1 Z', from: 5 },
        { tone: 'deep', d: 'M 39 54.6 C 40 54.2 41.2 54.8 42.1 55.4 C 43 56 43.9 57 44.5 58.1 C 45.2 59.3 45.7 60.9 45.7 62.2 C 45.8 63.6 45.4 65.3 44.9 66.2 C 44.4 67 43.4 67.4 42.5 67.4 C 41.6 67.4 40.2 66.8 39.2 65.9 C 38.3 65.1 37.3 63.5 36.7 62.1 C 36.2 60.8 35.7 59.1 36.1 57.8 C 36.5 56.5 38 55 39 54.6 Z', from: 5 },
        { tone: 'base', d: 'M 38.8 55 C 39.7 54.7 40.6 55.2 41.4 55.7 C 42.2 56.2 43 57 43.5 58 C 44 58.9 44.4 60.3 44.5 61.4 C 44.5 62.6 44.2 64 43.8 64.8 C 43.3 65.5 42.5 65.8 41.7 65.8 C 41 65.7 39.8 65.3 39 64.6 C 38.2 63.8 37.4 62.5 36.9 61.3 C 36.5 60.2 36 58.8 36.4 57.7 C 36.7 56.7 38 55.3 38.8 55 Z', from: 5 },
        { tone: 'light', d: 'M 40.7 59.2 C 40.7 59.4 40.6 59.8 40.4 60 C 40.3 60.2 40 60.4 39.8 60.5 C 39.5 60.5 39.2 60.5 38.9 60.5 C 38.7 60.4 38.4 60.2 38.2 60 C 38.1 59.8 38 59.4 38 59.2 C 38 58.9 38.1 58.6 38.2 58.4 C 38.4 58.2 38.7 58 38.9 57.9 C 39.2 57.8 39.5 57.8 39.8 57.9 C 40 58 40.3 58.2 40.4 58.4 C 40.6 58.6 40.7 58.9 40.7 59.2 Z', from: 5 },
        { tone: 'deep', d: 'M 31.4 59.7 C 32.5 59.8 33.2 60.9 33.6 61.8 C 34.1 62.8 34.4 64.1 34.4 65.3 C 34.3 66.6 34 68.2 33.4 69.3 C 32.8 70.5 31.6 71.8 30.8 72.2 C 29.9 72.7 28.9 72.6 28.2 72.1 C 27.4 71.6 26.5 70.5 26.2 69.3 C 25.8 68.1 25.7 66.3 25.9 64.9 C 26.1 63.5 26.5 61.8 27.4 61 C 28.4 60.1 30.4 59.5 31.4 59.7 Z', from: 5 },
        { tone: 'base', d: 'M 30.7 60.1 C 31.6 60.2 32.2 61.1 32.6 61.9 C 33 62.7 33.2 63.8 33.2 64.8 C 33.1 65.9 32.8 67.2 32.3 68.2 C 31.8 69.2 30.9 70.3 30.1 70.6 C 29.4 71 28.6 70.9 28 70.5 C 27.3 70.1 26.6 69.2 26.3 68.2 C 26 67.2 25.9 65.7 26.1 64.5 C 26.2 63.3 26.6 61.9 27.4 61.2 C 28.1 60.5 29.8 60 30.7 60.1 Z', from: 5 },
        { tone: 'light', d: 'M 29.7 64.2 C 29.7 64.5 29.6 64.8 29.4 65 C 29.3 65.2 29 65.4 28.8 65.5 C 28.6 65.6 28.2 65.6 28 65.5 C 27.8 65.4 27.5 65.2 27.3 65 C 27.2 64.8 27.1 64.5 27.1 64.2 C 27.1 64 27.2 63.7 27.3 63.5 C 27.5 63.3 27.8 63.1 28 63 C 28.2 62.9 28.6 62.9 28.8 63 C 29 63.1 29.3 63.3 29.4 63.5 C 29.6 63.7 29.7 64 29.7 64.2 Z', from: 5 }
      ]
    },
    onion: {
      trunk: 'M 28.4 96 Q 29.2 93 28.7 90 L 31.3 90 Q 30.8 93 31.6 96 Z',
      trunkShort: 'M 28.6 96 Q 29.3 94 28.8 92 L 31.2 92 Q 30.7 94 31.4 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[30, 80], [23, 82], [37, 82], [30, 70], [21, 72], [39, 74], [30, 58], [15, 62], [45, 64]],
      parts: [
        { tone: 'soil-deep', d: 'M 21 96 Q 24.4 92.5 30 92.5 Q 35.6 92.5 39 96 Z', from: 2, to: 2 },
        { tone: 'soil', d: 'M 22.1 96 Q 25.3 93.1 29.6 93 Q 32.7 93.3 35.4 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.9 92.9 C 29 91.6 26 87.9 24.5 85.4 C 22.9 82.8 21.3 79 20.6 77.8 L 19.4 78.2 C 19.8 79.6 20.8 83.8 21.9 86.6 C 23 89.5 25.4 93.7 26.1 95.1 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 28.6 92.8 C 27.8 91.5 24.9 87.6 23.5 85.1 C 22 82.5 20.5 78.6 19.9 77.3 L 19.1 77.6 C 19.6 79 20.7 83.1 21.9 85.9 C 23.1 88.6 25.6 92.8 26.3 94.2 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 27.5 93.3 C 26.6 92 23.9 88.1 22.5 85.4 C 21.2 82.8 19.8 78.8 19.2 77.5 L 19 77.6 C 19.5 79 20.7 83 22 85.7 C 23.3 88.4 25.9 92.4 26.7 93.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 33.6 95.1 C 34.4 93.9 36.8 90.1 37.9 87.6 C 39.1 85.2 40.1 81.5 40.5 80.2 L 39.5 79.8 C 38.8 80.9 37.2 84.2 35.7 86.4 C 34.2 88.5 31.2 91.8 30.4 92.9 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 32.5 94.2 C 33.3 93 35.8 89.3 37 86.9 C 38.2 84.5 39.4 80.9 39.9 79.7 L 39.2 79.4 C 38.6 80.5 37.1 83.9 35.6 86.1 C 34.2 88.4 31.4 91.7 30.5 92.8 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 31.5 93.8 C 32.3 92.6 34.9 89.1 36.2 86.7 C 37.5 84.4 38.8 80.8 39.3 79.6 L 39.1 79.6 C 38.5 80.7 37.1 84.2 35.7 86.5 C 34.4 88.8 31.6 92.2 30.8 93.4 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 34.4 88 C 34.4 88.4 34.2 88.8 34 89.1 C 33.9 89.5 33.8 89.9 33.6 90.2 C 33.3 90.6 33 91 32.7 91.2 C 32.3 91.4 31.8 91.5 31.4 91.6 C 30.9 91.7 30.5 91.7 30 91.7 C 29.5 91.7 29.1 91.7 28.6 91.6 C 28.2 91.5 27.7 91.4 27.3 91.2 C 27 91 26.7 90.6 26.4 90.2 C 26.2 89.9 26.1 89.5 26 89.1 C 25.8 88.8 25.6 88.4 25.6 88 C 25.6 87.6 25.5 87.2 25.7 86.8 C 25.8 86.4 26.1 86.1 26.4 85.8 C 26.7 85.5 27.1 85.3 27.5 85 C 27.9 84.8 28.2 84.5 28.6 84.4 C 29.1 84.2 29.5 84.1 30 84.1 C 30.5 84.1 30.9 84.2 31.4 84.4 C 31.8 84.5 32.1 84.8 32.5 85 C 32.9 85.3 33.3 85.5 33.6 85.8 C 33.9 86.1 34.2 86.4 34.3 86.8 C 34.5 87.2 34.4 87.6 34.4 88 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 33.3 87.5 C 33.2 87.8 33.1 88.1 32.9 88.4 C 32.8 88.8 32.7 89.1 32.5 89.4 C 32.3 89.6 32.1 90 31.8 90.1 C 31.5 90.3 31.1 90.4 30.7 90.5 C 30.3 90.6 29.9 90.5 29.5 90.5 C 29.1 90.5 28.7 90.6 28.4 90.5 C 28 90.4 27.6 90.3 27.2 90.1 C 26.9 90 26.7 89.6 26.5 89.4 C 26.3 89.1 26.2 88.8 26.1 88.4 C 26 88.1 25.8 87.8 25.8 87.5 C 25.7 87.2 25.7 86.8 25.8 86.5 C 26 86.2 26.2 85.9 26.5 85.7 C 26.8 85.4 27.1 85.2 27.4 85 C 27.7 84.9 28 84.6 28.4 84.5 C 28.7 84.4 29.1 84.2 29.5 84.2 C 29.9 84.2 30.3 84.4 30.7 84.5 C 31 84.6 31.3 84.9 31.6 85 C 31.9 85.2 32.3 85.4 32.5 85.7 C 32.8 85.9 33.1 86.2 33.2 86.5 C 33.3 86.8 33.3 87.2 33.3 87.5 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 26.8 87.2 Q 26.5 89.5 28.2 90.7 Q 28.4 88.4 28.7 85.6 Q 27.5 86 26.8 87.2 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 28.1 84.6 Q 26.6 87.2 26 90.1 Q 27.5 87.5 28.1 84.6 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.4 84.6 Q 28.6 87.3 28.7 90.1 Q 29.6 87.4 29.4 84.6 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 30.7 84.6 Q 30.6 87.4 31.5 90.1 Q 31.6 87.3 30.7 84.6 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 32 84.6 Q 32.6 87.5 34.1 90.1 Q 33.5 87.2 32 84.6 Z', from: 2, to: 2 },
        { tone: 'bulb-deep', d: 'M 30.4 91.1 Q 30.9 91.6 31.1 92.1 L 29.7 92.6 Q 29.8 92 29.6 91.4 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.3 84.2 Q 29.5 83.6 29.5 82.9 L 30.5 82.9 Q 30.7 83.6 30.7 84.2 Z', from: 2, to: 2 },
        { tone: 'soil-deep', d: 'M 19 96 Q 23.2 91.5 30 91.5 Q 36.8 91.5 41 96 Z', from: 3, to: 3 },
        { tone: 'soil', d: 'M 20.3 96 Q 24.3 92.2 29.6 92.1 Q 33.3 92.5 36.6 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.2 92.8 C 28 90.9 24 85.2 21.9 81.3 C 19.8 77.5 17.6 71.7 16.7 69.7 L 15.3 70.3 C 15.9 72.3 17.3 78.5 18.9 82.7 C 20.5 86.8 23.8 93.1 24.8 95.2 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 27.8 92.7 C 26.6 90.7 22.7 84.9 20.7 81 C 18.7 77.1 16.6 71.2 15.8 69.2 L 15 69.6 C 15.6 71.6 17.2 77.7 18.9 81.8 C 20.6 85.9 24 92.1 25 94.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 26.4 93.3 C 25.3 91.3 21.5 85.3 19.6 81.4 C 17.8 77.4 15.8 71.4 15.1 69.4 L 14.8 69.6 C 15.5 71.6 17.3 77.6 19.1 81.6 C 20.8 85.7 24.4 91.7 25.5 93.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 34.9 95.3 C 35.9 93.5 39.3 88.2 40.9 84.7 C 42.5 81.2 44 76 44.6 74.3 L 43.4 73.7 C 42.5 75.3 40.3 80.1 38.3 83.3 C 36.2 86.4 32.3 91.2 31.1 92.7 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 33.6 94.2 C 34.7 92.5 38.2 87.3 39.9 83.9 C 41.6 80.5 43.2 75.3 43.8 73.6 L 43.1 73.3 C 42.3 74.9 40.2 79.8 38.2 83 C 36.3 86.2 32.4 91.1 31.3 92.7 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 32.4 93.8 C 33.5 92.1 37.1 87.1 38.9 83.7 C 40.7 80.3 42.4 75.3 43.2 73.6 L 42.9 73.5 C 42.2 75.1 40.2 80.1 38.4 83.4 C 36.5 86.7 32.8 91.6 31.7 93.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 32.1 94 C 32 91.5 31.6 84 31.4 79 C 31.1 74 30.8 66.5 30.6 64 L 29.4 64 C 29.2 66.5 28.9 74 28.6 79 C 28.4 84 28 91.5 27.9 94 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30.8 93.5 C 30.7 91 30.5 83.5 30.3 78.5 C 30.2 73.5 30 66 29.9 63.5 L 29.1 63.5 C 29 66 28.8 73.5 28.6 78.5 C 28.5 83.5 28.3 91 28.2 93.5 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.5 93.6 C 29.5 91.1 29.4 83.6 29.4 78.6 C 29.3 73.6 29.3 66.1 29.2 63.6 L 29 63.6 C 29 66.1 28.9 73.6 28.8 78.6 C 28.8 83.6 28.7 91.1 28.7 93.6 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 36 85 C 35.9 85.5 35.7 86 35.5 86.6 C 35.3 87.1 35.2 87.6 34.9 88.1 C 34.5 88.5 34.2 89 33.7 89.4 C 33.2 89.7 32.5 89.8 31.9 89.9 C 31.2 90.1 30.6 90 30 90 C 29.4 90 28.8 90.1 28.1 89.9 C 27.5 89.8 26.8 89.7 26.3 89.4 C 25.8 89 25.5 88.5 25.1 88.1 C 24.8 87.6 24.7 87.1 24.5 86.6 C 24.3 86 24.1 85.5 24 85 C 23.9 84.5 23.9 83.8 24.1 83.3 C 24.3 82.8 24.7 82.3 25.1 81.9 C 25.6 81.5 26.1 81.3 26.6 80.9 C 27.1 80.6 27.6 80.3 28.1 80.1 C 28.7 79.8 29.4 79.6 30 79.6 C 30.6 79.6 31.3 79.8 31.9 80.1 C 32.4 80.3 32.9 80.6 33.4 80.9 C 33.9 81.3 34.4 81.5 34.9 81.9 C 35.3 82.3 35.7 82.8 35.9 83.3 C 36.1 83.8 36.1 84.5 36 85 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 34.4 84.3 C 34.4 84.8 34.2 85.2 34 85.6 C 33.9 86 33.7 86.5 33.5 86.9 C 33.2 87.2 32.9 87.7 32.4 87.9 C 32 88.2 31.4 88.3 30.9 88.4 C 30.4 88.5 29.9 88.5 29.3 88.5 C 28.8 88.5 28.3 88.5 27.8 88.4 C 27.2 88.3 26.7 88.2 26.2 87.9 C 25.8 87.7 25.5 87.2 25.2 86.9 C 25 86.5 24.8 86 24.7 85.6 C 24.5 85.2 24.3 84.8 24.2 84.3 C 24.2 83.9 24.2 83.4 24.3 82.9 C 24.5 82.5 24.9 82.1 25.2 81.8 C 25.6 81.5 26 81.2 26.4 81 C 26.9 80.7 27.3 80.4 27.8 80.2 C 28.2 80 28.8 79.9 29.3 79.9 C 29.9 79.9 30.4 80 30.9 80.2 C 31.4 80.4 31.8 80.7 32.2 81 C 32.7 81.2 33.1 81.5 33.5 81.8 C 33.8 82.1 34.2 82.5 34.4 82.9 C 34.5 83.4 34.5 83.9 34.4 84.3 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 25.7 84 Q 25.2 87.1 27.5 88.7 Q 27.8 85.5 28.2 81.8 Q 26.6 82.3 25.7 84 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 27.4 80.3 Q 25.5 83.9 24.6 87.9 Q 26.5 84.3 27.4 80.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 29.2 80.3 Q 28.2 84 28.3 87.9 Q 29.2 84.1 29.2 80.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 31 80.3 Q 31.1 84.2 32.1 87.9 Q 32 84 31 80.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 32.7 80.3 Q 33.7 84.3 35.6 87.9 Q 34.6 83.9 32.7 80.3 Z', from: 3, to: 3 },
        { tone: 'bulb-deep', d: 'M 30.6 89.3 Q 31.2 90 31.4 90.7 L 29.4 91.2 Q 29.6 90.4 29.4 89.6 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 29.1 79.8 Q 29.3 78.9 29.3 78 L 30.7 78 Q 30.9 78.9 30.9 79.8 Z', from: 3, to: 3 },
        { tone: 'soil-deep', d: 'M 17.5 96 Q 22.3 91 30 91 Q 37.8 91 42.5 96 Z', from: 4, to: 4 },
        { tone: 'soil', d: 'M 19 96 Q 23.5 91.8 29.5 91.7 Q 33.8 92.1 37.5 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.4 92.7 C 27.9 90.2 22.8 82.5 20.2 77.3 C 17.6 72.1 14.8 64.3 13.8 61.7 L 12.2 62.3 C 13 65 14.9 73.2 17 78.7 C 19.1 84.2 23.3 92.5 24.6 95.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 27.8 92.6 C 26.4 90 21.4 82.1 18.9 76.9 C 16.4 71.7 13.8 63.8 12.8 61.2 L 11.9 61.5 C 12.7 64.2 14.8 72.4 17 77.8 C 19.1 83.2 23.5 91.4 24.9 94.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 26.3 93.2 C 24.9 90.6 20.2 82.6 17.8 77.3 C 15.4 72 13 64.1 12 61.4 L 11.7 61.5 C 12.6 64.2 14.9 72.2 17.1 77.6 C 19.4 83 24 91 25.4 93.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 35.1 95.3 C 36.4 92.9 40.8 85.6 42.9 80.7 C 44.9 75.9 46.9 68.7 47.7 66.3 L 46.3 65.7 C 45.2 68 42.5 74.8 39.9 79.3 C 37.4 83.8 32.4 90.5 30.9 92.7 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 33.7 94.2 C 35.1 91.8 39.5 84.6 41.7 79.8 C 43.9 75.1 46 68 46.8 65.6 L 46 65.2 C 45 67.5 42.4 74.4 39.9 78.9 C 37.4 83.5 32.5 90.3 31.1 92.6 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 32.4 93.8 C 33.8 91.4 38.4 84.3 40.6 79.6 C 42.9 74.9 45.2 67.9 46.1 65.6 L 45.8 65.4 C 44.9 67.8 42.4 74.7 40.1 79.4 C 37.7 84 32.9 90.9 31.5 93.2 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 32.3 93.7 C 31.6 90.4 29.6 80.4 28.5 73.8 C 27.4 67.2 26.2 57.2 25.7 53.9 L 24.3 54.1 C 24.5 57.4 24.9 67.5 25.5 74.2 C 26.1 80.9 27.4 91 27.7 94.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.9 93.2 C 30.3 89.9 28.4 80 27.4 73.3 C 26.4 66.7 25.3 56.7 24.9 53.4 L 24 53.5 C 24.3 56.8 24.9 66.9 25.5 73.6 C 26.2 80.3 27.6 90.3 28 93.7 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.5 93.5 C 29 90.1 27.2 80.2 26.3 73.5 C 25.4 66.8 24.5 56.9 24.2 53.5 L 23.9 53.6 C 24.2 56.9 25 66.9 25.7 73.6 C 26.5 80.3 28.1 90.3 28.6 93.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33.1 94.5 C 33.6 91.3 35.6 81.6 36.5 75.2 C 37.5 68.9 38.3 59.3 38.6 56.1 L 37.4 55.9 C 36.8 59 35.3 68.5 33.9 74.8 C 32.5 81 29.8 90.4 28.9 93.5 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.8 93.8 C 32.4 90.6 34.5 81 35.5 74.6 C 36.5 68.3 37.5 58.7 37.9 55.6 L 37.1 55.4 C 36.6 58.6 35.2 68 33.9 74.3 C 32.5 80.6 30 90.1 29.2 93.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.5 93.7 C 31.2 90.5 33.5 81 34.6 74.6 C 35.7 68.3 36.8 58.8 37.2 55.6 L 37 55.6 C 36.5 58.7 35.3 68.2 34 74.5 C 32.8 80.9 30.4 90.3 29.7 93.5 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 37.6 82 C 37.5 82.7 37.2 83.3 37 84 C 36.7 84.6 36.5 85.3 36.1 85.9 C 35.8 86.5 35.3 87.1 34.6 87.5 C 34 87.9 33.1 88.1 32.3 88.3 C 31.6 88.4 30.8 88.4 30 88.4 C 29.2 88.4 28.4 88.4 27.7 88.3 C 26.9 88.1 26 87.9 25.4 87.5 C 24.7 87.1 24.2 86.5 23.9 85.9 C 23.5 85.3 23.3 84.6 23 84 C 22.8 83.3 22.5 82.7 22.4 82 C 22.3 81.3 22.3 80.5 22.5 79.9 C 22.8 79.2 23.3 78.6 23.9 78.1 C 24.4 77.6 25.1 77.2 25.7 76.8 C 26.3 76.4 26.9 76 27.7 75.7 C 28.4 75.4 29.2 75.2 30 75.2 C 30.8 75.2 31.6 75.4 32.3 75.7 C 33.1 76 33.7 76.4 34.3 76.8 C 34.9 77.2 35.6 77.6 36.1 78.1 C 36.7 78.6 37.2 79.2 37.5 79.9 C 37.7 80.5 37.7 81.3 37.6 82 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 35.6 81.1 C 35.6 81.7 35.3 82.2 35.1 82.8 C 34.9 83.3 34.7 83.9 34.4 84.4 C 34.1 84.9 33.6 85.4 33.1 85.7 C 32.6 86.1 31.8 86.2 31.2 86.4 C 30.5 86.5 29.8 86.4 29.2 86.4 C 28.5 86.4 27.8 86.5 27.2 86.4 C 26.5 86.2 25.8 86.1 25.2 85.7 C 24.7 85.4 24.3 84.9 23.9 84.4 C 23.6 83.9 23.4 83.3 23.2 82.8 C 23 82.2 22.8 81.7 22.7 81.1 C 22.6 80.6 22.6 79.9 22.8 79.4 C 23 78.9 23.5 78.3 23.9 77.9 C 24.4 77.5 25 77.2 25.5 76.9 C 26 76.5 26.6 76.2 27.2 75.9 C 27.8 75.7 28.5 75.5 29.2 75.5 C 29.8 75.5 30.5 75.7 31.2 75.9 C 31.8 76.2 32.3 76.5 32.8 76.9 C 33.4 77.2 33.9 77.5 34.4 77.9 C 34.8 78.3 35.3 78.9 35.5 79.4 C 35.7 79.9 35.7 80.6 35.6 81.1 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 24.5 80.7 Q 23.9 84.6 26.8 86.8 Q 27.3 82.7 27.7 77.9 Q 25.7 78.6 24.5 80.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 26.7 76.1 Q 24.5 80.7 23.2 85.6 Q 25.4 81 26.7 76.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 28.9 76.1 Q 27.9 80.8 27.8 85.6 Q 28.9 80.9 28.9 76.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 31.3 76.1 Q 31.5 80.9 32.6 85.6 Q 32.5 80.8 31.3 76.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 33.4 76.1 Q 34.8 81 37.1 85.6 Q 35.7 80.7 33.4 76.1 Z', from: 4, to: 4 },
        { tone: 'bulb-deep', d: 'M 30.7 87.5 Q 31.5 88.4 31.7 89.3 L 29.1 89.9 Q 29.5 88.8 29.3 87.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 28.9 75.4 Q 29.1 74.3 29.1 73.2 L 30.9 73.2 Q 31.1 74.3 31.1 75.4 Z', from: 4, to: 4 },
        { tone: 'soil-deep', d: 'M 16 96 Q 21.3 90.5 30 90.5 Q 38.7 90.5 44 96 Z', from: 5 },
        { tone: 'soil', d: 'M 17.7 96 Q 22.7 91.4 29.4 91.3 Q 34.2 91.7 38.4 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.6 92.7 C 27.9 89.5 22.1 79.8 19.2 73.3 C 16.2 66.8 13 57 11.8 53.7 L 10.2 54.3 C 11.1 57.7 13.3 67.9 15.6 74.7 C 18 81.5 22.9 91.8 24.4 95.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 27.9 92.5 C 26.2 89.2 20.6 79.4 17.8 72.9 C 14.9 66.3 12 56.4 10.8 53.1 L 9.8 53.5 C 10.8 56.8 13.1 67 15.6 73.7 C 18.1 80.5 23.2 90.7 24.7 94.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 26.3 93.2 C 24.7 89.9 19.3 79.9 16.5 73.3 C 13.8 66.6 11 56.7 9.9 53.4 L 9.6 53.5 C 10.7 56.8 13.2 66.9 15.8 73.6 C 18.4 80.3 23.7 90.3 25.3 93.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 35.4 95.3 C 36.9 92.2 41.8 82.9 44.2 76.7 C 46.6 70.5 48.8 61.3 49.8 58.3 L 48.2 57.7 C 47 60.7 43.9 69.5 41 75.3 C 38.1 81.1 32.3 89.8 30.6 92.7 Z', from: 5 },
        { tone: 'stemlight', d: 'M 33.8 94.1 C 35.3 91.1 40.4 81.9 42.9 75.8 C 45.4 69.7 47.8 60.6 48.8 57.5 L 47.9 57.2 C 46.7 60.1 43.8 69 41 74.9 C 38.1 80.8 32.6 89.6 30.9 92.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 32.3 93.7 C 33.9 90.7 39.2 81.6 41.8 75.6 C 44.4 69.6 47 60.5 48 57.5 L 47.7 57.4 C 46.6 60.4 43.9 69.4 41.1 75.3 C 38.4 81.3 33 90.2 31.4 93.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 32.5 93.5 C 31.5 89.5 28.4 77.7 26.8 69.7 C 25.2 61.8 23.4 49.9 22.7 45.9 L 21.3 46.1 C 21.6 50.1 22.5 62.2 23.6 70.3 C 24.6 78.3 26.9 90.5 27.5 94.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.9 93.1 C 30 89.1 27.1 77.2 25.6 69.2 C 24.1 61.3 22.5 49.3 21.9 45.3 L 20.9 45.5 C 21.4 49.5 22.4 61.5 23.6 69.6 C 24.8 77.6 27.2 89.7 27.9 93.7 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.4 93.4 C 28.6 89.4 25.9 77.4 24.5 69.4 C 23.1 61.5 21.7 49.5 21.1 45.5 L 20.8 45.5 C 21.3 49.5 22.6 61.5 23.8 69.6 C 25.1 77.6 27.7 89.6 28.5 93.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33.2 94.5 C 34 90.7 36.6 79 37.9 71.3 C 39.1 63.6 40.2 52 40.7 48.1 L 39.3 47.9 C 38.6 51.7 36.7 63.1 34.9 70.7 C 33.2 78.3 29.8 89.7 28.8 93.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.8 93.8 C 32.7 89.9 35.4 78.3 36.8 70.6 C 38.1 62.9 39.4 51.4 39.9 47.5 L 39 47.4 C 38.3 51.2 36.6 62.6 34.9 70.3 C 33.3 77.9 30 89.3 29.1 93.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.5 93.6 C 31.4 89.8 34.3 78.3 35.7 70.6 C 37.2 62.9 38.6 51.4 39.2 47.6 L 38.9 47.5 C 38.3 51.3 36.7 62.8 35.1 70.5 C 33.6 78.1 30.5 89.6 29.6 93.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.1 94 C 31.1 89.7 31 76.7 31 68 C 30.9 59.4 30.7 46.3 30.6 42 L 29.4 42 C 29.2 46.3 28.6 59.3 28.2 68 C 27.8 76.6 27.1 89.6 26.9 94 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.8 93.5 C 29.8 89.2 29.9 76.2 29.9 67.5 C 30 58.8 29.9 45.8 29.9 41.5 L 29.1 41.5 C 29 45.8 28.6 58.8 28.2 67.5 C 27.9 76.1 27.4 89.1 27.2 93.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.5 93.6 C 28.6 89.3 28.9 76.3 29 67.6 C 29.1 58.9 29.2 45.9 29.2 41.6 L 29 41.6 C 28.9 45.9 28.7 58.9 28.4 67.6 C 28.2 76.2 27.8 89.2 27.7 93.6 Z', from: 5 },
        { tone: 'deep', d: 'M 39 80 C 38.9 80.8 38.5 81.6 38.3 82.3 C 38 83.1 37.7 83.9 37.3 84.6 C 36.8 85.3 36.2 86.1 35.5 86.5 C 34.7 87 33.7 87.3 32.8 87.4 C 31.9 87.6 30.9 87.5 30 87.5 C 29.1 87.5 28.1 87.6 27.2 87.4 C 26.3 87.3 25.3 87 24.5 86.5 C 23.8 86.1 23.2 85.3 22.7 84.6 C 22.3 83.9 22 83.1 21.7 82.3 C 21.5 81.6 21.1 80.8 21 80 C 20.9 79.2 20.9 78.3 21.1 77.5 C 21.4 76.7 22.1 76 22.7 75.4 C 23.3 74.8 24.1 74.4 24.9 73.9 C 25.6 73.4 26.4 72.9 27.2 72.6 C 28.1 72.3 29.1 71.9 30 71.9 C 30.9 71.9 31.9 72.3 32.8 72.6 C 33.6 72.9 34.4 73.4 35.1 73.9 C 35.9 74.4 36.7 74.8 37.3 75.4 C 37.9 76 38.6 76.7 38.9 77.5 C 39.1 78.3 39.1 79.2 39 80 Z', from: 5 },
        { tone: 'base', d: 'M 36.7 79 C 36.6 79.7 36.3 80.3 36 80.9 C 35.8 81.6 35.6 82.2 35.2 82.8 C 34.8 83.4 34.3 84 33.7 84.4 C 33 84.8 32.1 85 31.4 85.1 C 30.6 85.3 29.8 85.2 29 85.2 C 28.2 85.2 27.4 85.3 26.6 85.1 C 25.9 85 25 84.8 24.4 84.4 C 23.7 84 23.2 83.4 22.8 82.8 C 22.4 82.2 22.2 81.6 22 80.9 C 21.7 80.3 21.4 79.7 21.4 79 C 21.3 78.3 21.2 77.5 21.5 76.9 C 21.7 76.3 22.3 75.7 22.8 75.2 C 23.4 74.7 24 74.3 24.7 73.9 C 25.3 73.5 25.9 73.1 26.6 72.8 C 27.4 72.6 28.2 72.3 29 72.3 C 29.8 72.3 30.7 72.6 31.4 72.8 C 32.1 73.1 32.7 73.5 33.3 73.9 C 34 74.3 34.7 74.7 35.2 75.2 C 35.7 75.7 36.3 76.3 36.5 76.9 C 36.8 77.5 36.7 78.3 36.7 79 Z', from: 5 },
        { tone: 'light', d: 'M 23.5 78.4 Q 22.8 83.1 26.2 85.6 Q 26.8 80.8 27.3 75.2 Q 25 75.9 23.5 78.4 Z', from: 5 },
        { tone: 'deep', d: 'M 26.1 73 Q 23.5 78.5 21.9 84.3 Q 24.5 78.8 26.1 73 Z', from: 5 },
        { tone: 'deep', d: 'M 28.7 73 Q 27.6 78.6 27.4 84.3 Q 28.6 78.7 28.7 73 Z', from: 5 },
        { tone: 'deep', d: 'M 31.5 73 Q 31.8 78.7 33.1 84.3 Q 32.8 78.6 31.5 73 Z', from: 5 },
        { tone: 'deep', d: 'M 34 73 Q 35.7 78.8 38.4 84.3 Q 36.7 78.5 34 73 Z', from: 5 },
        { tone: 'bulb-deep', d: 'M 30.9 86.6 Q 31.7 87.6 31.9 88.7 L 28.9 89.2 Q 29.3 88 29.1 86.9 Z', from: 5 },
        { tone: 'deep', d: 'M 28.7 72.2 Q 28.9 70.9 28.9 69.5 L 31.1 69.5 Q 31.4 70.9 31.4 72.2 Z', from: 5 }
      ]
    },
    pineapple: {
      trunk: 'M 28.4 96 Q 29.2 94 28.7 92 L 31.3 92 Q 30.8 94 31.6 96 Z',
      trunkShort: 'M 28.7 96 Q 29.4 94.8 28.9 93.5 L 31.1 93.5 Q 30.7 94.8 31.3 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[30, 60], [24, 66], [36, 66], [30, 72], [23, 76], [37, 76], [30, 80], [16, 84], [44, 84]],
      parts: [
        { tone: 'stemshade', d: 'M 30.1 93.6 L 29 92.4 L 27.8 92.1 L 26.7 90.9 L 25.4 91.1 L 24.4 90 L 23 90.5 L 21.9 89.6 L 20.5 90.3 L 19.4 89.8 L 18 90.5 L 16.7 90.5 L 15.3 91.4 L 15.3 91.4 L 16.3 92.8 L 17.5 93.2 L 18.5 94.4 L 19.8 94.2 L 20.9 95.4 L 22.3 94.9 L 23.3 95.9 L 24.7 95.1 L 25.9 95.8 L 27.3 95 L 28.5 95.2 L 29.9 94.4 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29.6 93.3 L 28.5 92.5 L 27.3 92.2 L 26.1 91.4 L 24.8 91.4 L 23.7 90.6 L 22.4 90.8 L 21.2 90.2 L 19.8 90.5 L 18.6 90 L 17.3 90.4 L 16 90.3 L 14.6 90.8 L 14.6 90.8 L 15.7 91.7 L 17 92.1 L 18.1 92.9 L 19.4 92.9 L 20.5 93.7 L 21.9 93.5 L 23 94.2 L 24.4 93.9 L 25.6 94.4 L 26.9 94 L 28.2 94.2 L 29.5 93.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.3 93.7 L 30.3 92.2 L 29.5 91.2 L 29.5 89.7 L 28.3 89.1 L 28.2 87.6 L 26.9 87.2 L 26.6 85.8 L 25.1 85.6 L 24.6 84.5 L 23 84.3 L 22.1 83.5 L 20.4 83.4 L 20.4 83.4 L 20.4 85 L 21 86 L 21.1 87.6 L 22.2 88.2 L 22.2 89.8 L 23.6 90.2 L 23.8 91.6 L 25.3 91.8 L 25.8 93 L 27.3 93.2 L 28.1 94.1 L 29.7 94.3 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29.8 93.4 L 29.4 92.1 L 28.6 91.2 L 28.3 89.8 L 27.3 89.1 L 26.9 87.8 L 25.7 87.2 L 25.2 86 L 24 85.5 L 23.3 84.5 L 22 84 L 21.1 83.2 L 19.8 82.7 L 19.8 82.7 L 20.1 84.1 L 20.8 85.1 L 21.2 86.4 L 22.2 87.2 L 22.5 88.5 L 23.7 89.1 L 24.1 90.3 L 25.4 90.8 L 26 91.9 L 27.3 92.4 L 28.1 93.3 L 29.4 93.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.4 94 L 31.4 92.9 L 31.5 91.7 L 32.5 90.6 L 32 89.4 L 33 88.3 L 32.2 87.1 L 32.9 86 L 32 84.8 L 32.3 83.7 L 31.3 82.5 L 31.2 81.4 L 30 80.2 L 30 80.2 L 28.8 81.4 L 28.7 82.5 L 27.7 83.7 L 28 84.8 L 27.1 86 L 27.8 87.1 L 27 88.3 L 28 89.4 L 27.5 90.6 L 28.5 91.7 L 28.6 92.9 L 29.6 94 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29.8 93.6 L 30.4 92.4 L 30.5 91.2 L 31.1 90 L 30.8 88.9 L 31.3 87.7 L 30.8 86.5 L 31.3 85.4 L 30.7 84.2 L 30.9 83 L 30.2 81.9 L 30.1 80.7 L 29.4 79.6 L 29.4 79.6 L 28.7 80.7 L 28.6 81.9 L 28 83.1 L 28.2 84.3 L 27.6 85.4 L 28.1 86.6 L 27.6 87.8 L 28.2 88.9 L 28 90.1 L 28.6 91.3 L 28.7 92.4 L 29.3 93.6 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.3 94.3 L 31.9 94.1 L 32.7 93.2 L 34.2 93 L 34.7 91.8 L 36.2 91.6 L 36.4 90.2 L 37.8 89.8 L 37.8 88.2 L 38.9 87.6 L 39 86 L 39.6 85 L 39.6 83.4 L 39.6 83.4 L 37.9 83.5 L 37 84.3 L 35.4 84.5 L 34.9 85.6 L 33.4 85.8 L 33.1 87.2 L 31.8 87.6 L 31.7 89.1 L 30.5 89.7 L 30.5 91.2 L 29.7 92.2 L 29.7 93.7 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 29.8 93.7 L 31 93.3 L 31.8 92.4 L 33.1 91.9 L 33.6 90.8 L 34.9 90.3 L 35.3 89 L 36.4 88.4 L 36.7 87.1 L 37.7 86.4 L 38 85.1 L 38.7 84.1 L 38.9 82.7 L 38.9 82.7 L 37.6 83.2 L 36.7 84 L 35.5 84.5 L 34.9 85.6 L 33.6 86.1 L 33.2 87.3 L 32.1 87.8 L 31.7 89.1 L 30.7 89.9 L 30.4 91.2 L 29.7 92.1 L 29.4 93.4 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.1 94.4 L 31.5 95.2 L 32.7 95 L 34.1 95.8 L 35.3 95.1 L 36.7 95.9 L 37.7 94.9 L 39.1 95.4 L 40.2 94.2 L 41.5 94.4 L 42.5 93.2 L 43.7 92.8 L 44.7 91.4 L 44.7 91.4 L 43.3 90.5 L 42 90.5 L 40.6 89.8 L 39.5 90.3 L 38.1 89.6 L 37 90.5 L 35.6 90 L 34.6 91.1 L 33.3 90.9 L 32.2 92.1 L 31 92.4 L 29.9 93.6 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.6 93.8 L 31 94.2 L 32.2 94 L 33.5 94.4 L 34.7 93.9 L 36 94.2 L 37.1 93.5 L 38.4 93.7 L 39.5 92.9 L 40.7 92.9 L 41.8 92.1 L 43 91.7 L 44.1 90.8 L 44.1 90.8 L 42.8 90.3 L 41.5 90.4 L 40.2 90.1 L 39 90.5 L 37.7 90.2 L 36.6 90.8 L 35.3 90.6 L 34.2 91.4 L 32.9 91.4 L 31.8 92.2 L 30.6 92.5 L 29.5 93.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.1 93.5 L 28.6 92.2 L 26.8 91.8 L 25.3 90.4 L 23.5 90.6 L 22 89.3 L 20.1 89.8 L 18.5 88.7 L 16.6 89.5 L 15 88.8 L 13.1 89.6 L 11.3 89.4 L 9.4 90.4 L 9.4 90.4 L 10.9 91.9 L 12.6 92.4 L 14.1 93.8 L 15.9 93.7 L 17.4 95 L 19.3 94.6 L 20.8 95.7 L 22.7 95 L 24.4 95.8 L 26.3 95 L 28 95.2 L 29.9 94.5 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.6 93.3 L 28 92.3 L 26.3 92 L 24.7 91 L 22.9 90.9 L 21.3 90 L 19.4 90.2 L 17.8 89.4 L 15.9 89.7 L 14.2 89.1 L 12.4 89.5 L 10.6 89.3 L 8.7 89.7 L 8.7 89.7 L 10.3 90.8 L 12 91.3 L 13.7 92.3 L 15.4 92.3 L 17.1 93.3 L 18.9 93.1 L 20.5 94 L 22.4 93.7 L 24.1 94.3 L 25.9 93.9 L 27.7 94.2 L 29.5 93.9 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 93.6 L 29.3 91.8 L 27.9 90.8 L 27 89 L 25.3 88.6 L 24.4 86.8 L 22.5 86.6 L 21.4 85.1 L 19.4 85.1 L 18.2 83.8 L 16.1 83.9 L 14.6 83.2 L 12.5 83.4 L 12.5 83.4 L 13.3 85.3 L 14.6 86.4 L 15.5 88.2 L 17.2 88.7 L 18.1 90.5 L 20 90.7 L 21 92.4 L 23 92.4 L 24.2 93.7 L 26.2 93.6 L 27.7 94.4 L 29.8 94.4 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.7 93.3 L 28.6 91.8 L 27.1 90.9 L 26 89.4 L 24.4 88.8 L 23.2 87.3 L 21.5 86.9 L 20.3 85.5 L 18.4 85.2 L 17.1 84.1 L 15.3 83.8 L 13.7 83 L 11.8 82.7 L 11.8 82.7 L 12.9 84.3 L 14.3 85.3 L 15.4 86.8 L 17.1 87.5 L 18.2 88.9 L 19.9 89.4 L 21.1 90.8 L 22.9 91.1 L 24.3 92.3 L 26.1 92.6 L 27.6 93.5 L 29.4 93.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.4 93.7 L 30.3 91.7 L 29.3 90.4 L 29.3 88.4 L 27.9 87.3 L 27.7 85.4 L 26.1 84.6 L 25.7 82.8 L 23.9 82.1 L 23.3 80.5 L 21.4 79.8 L 20.3 78.6 L 18.3 78 L 18.3 78 L 18.2 80.1 L 19.1 81.5 L 19.1 83.5 L 20.5 84.6 L 20.6 86.5 L 22.2 87.4 L 22.5 89.2 L 24.3 90 L 24.9 91.6 L 26.7 92.3 L 27.8 93.6 L 29.6 94.3 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.8 93.4 L 29.4 91.6 L 28.4 90.3 L 28 88.5 L 26.7 87.3 L 26.2 85.6 L 24.8 84.6 L 24.2 82.9 L 22.7 82 L 21.9 80.5 L 20.4 79.5 L 19.3 78.2 L 17.6 77.3 L 17.6 77.3 L 18 79.2 L 18.9 80.6 L 19.3 82.3 L 20.5 83.5 L 21 85.3 L 22.4 86.3 L 23 88 L 24.5 89 L 25.2 90.5 L 26.8 91.5 L 27.8 92.8 L 29.3 93.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.4 93.9 L 31.2 92.1 L 30.9 90.5 L 31.6 88.7 L 30.8 87.2 L 31.5 85.4 L 30.3 84 L 30.7 82.3 L 29.3 80.9 L 29.4 79.2 L 28 77.9 L 27.5 76.4 L 25.9 75.1 L 25.9 75.1 L 25 76.9 L 25.2 78.5 L 24.4 80.3 L 25.2 81.8 L 24.5 83.6 L 25.6 85 L 25.1 86.8 L 26.5 88.2 L 26.3 89.8 L 27.7 91.2 L 28.1 92.8 L 29.6 94.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.9 93.5 L 30.2 91.8 L 29.8 90.2 L 30.1 88.4 L 29.5 86.9 L 29.7 85.1 L 28.9 83.7 L 29 82 L 28 80.5 L 27.9 78.9 L 26.8 77.4 L 26.4 75.8 L 25.2 74.4 L 25.2 74.4 L 24.8 76.2 L 25.1 77.8 L 24.8 79.6 L 25.4 81.1 L 25.1 82.8 L 26 84.3 L 25.8 86 L 26.8 87.5 L 26.8 89.2 L 27.9 90.6 L 28.3 92.2 L 29.3 93.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.4 94.1 L 31.9 92.8 L 32.3 91.2 L 33.7 89.8 L 33.5 88.2 L 34.9 86.8 L 34.4 85 L 35.5 83.6 L 34.8 81.8 L 35.6 80.3 L 34.8 78.5 L 35 76.9 L 34.1 75.1 L 34.1 75.1 L 32.5 76.4 L 32 77.9 L 30.6 79.2 L 30.7 80.9 L 29.3 82.3 L 29.7 84 L 28.5 85.4 L 29.2 87.2 L 28.4 88.7 L 29.1 90.5 L 28.8 92.1 L 29.6 93.9 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.9 93.6 L 30.8 92.2 L 31.2 90.6 L 32.2 89.1 L 32.2 87.5 L 33.2 86 L 33 84.3 L 33.8 82.8 L 33.5 81.1 L 34.1 79.5 L 33.7 77.8 L 33.9 76.2 L 33.5 74.4 L 33.5 74.4 L 32.4 75.9 L 32 77.4 L 31 78.9 L 30.9 80.5 L 29.9 82 L 30.1 83.7 L 29.2 85.2 L 29.5 86.9 L 28.9 88.4 L 29.2 90.2 L 29 91.8 L 29.3 93.5 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.4 94.3 L 32.2 93.6 L 33.3 92.3 L 35.1 91.6 L 35.7 90 L 37.5 89.2 L 37.8 87.4 L 39.4 86.5 L 39.5 84.6 L 40.9 83.5 L 40.9 81.5 L 41.8 80.1 L 41.7 78 L 41.7 78 L 39.7 78.6 L 38.6 79.8 L 36.7 80.5 L 36.1 82.1 L 34.3 82.8 L 33.9 84.6 L 32.3 85.4 L 32.1 87.3 L 30.7 88.4 L 30.7 90.4 L 29.7 91.7 L 29.6 93.7 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.8 93.7 L 31.3 92.8 L 32.3 91.4 L 33.8 90.5 L 34.5 89 L 36 88 L 36.5 86.3 L 37.9 85.3 L 38.3 83.5 L 39.5 82.3 L 39.9 80.6 L 40.8 79.1 L 41.1 77.3 L 41.1 77.3 L 39.5 78.2 L 38.4 79.5 L 36.9 80.5 L 36.2 82 L 34.7 83 L 34.1 84.6 L 32.7 85.6 L 32.3 87.4 L 31.1 88.5 L 30.7 90.3 L 29.7 91.7 L 29.3 93.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 94.4 L 32.3 94.4 L 33.8 93.6 L 35.8 93.7 L 37 92.4 L 39 92.4 L 40 90.7 L 41.9 90.5 L 42.8 88.7 L 44.5 88.2 L 45.4 86.4 L 46.7 85.3 L 47.5 83.4 L 47.5 83.4 L 45.4 83.2 L 43.9 83.9 L 41.8 83.8 L 40.6 85.1 L 38.6 85.1 L 37.5 86.6 L 35.6 86.8 L 34.7 88.6 L 33 89 L 32.1 90.8 L 30.7 91.8 L 29.8 93.6 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.7 93.8 L 31.5 93.5 L 33 92.6 L 34.8 92.3 L 36.1 91.1 L 37.9 90.8 L 39 89.4 L 40.7 88.9 L 41.8 87.5 L 43.4 86.8 L 44.5 85.3 L 45.9 84.3 L 46.9 82.7 L 46.9 82.7 L 45 83 L 43.5 83.8 L 41.7 84.1 L 40.4 85.2 L 38.6 85.6 L 37.4 86.9 L 35.7 87.3 L 34.6 88.8 L 33 89.4 L 31.9 90.9 L 30.5 91.9 L 29.4 93.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.1 94.5 L 32 95.2 L 33.7 95 L 35.6 95.8 L 37.3 95 L 39.2 95.7 L 40.7 94.6 L 42.6 95 L 44.1 93.7 L 45.9 93.8 L 47.4 92.4 L 49.1 91.9 L 50.6 90.4 L 50.6 90.4 L 48.7 89.4 L 46.9 89.6 L 45 88.8 L 43.4 89.5 L 41.5 88.7 L 39.9 89.8 L 38 89.3 L 36.5 90.6 L 34.7 90.4 L 33.2 91.8 L 31.4 92.2 L 29.9 93.5 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.6 93.9 L 31.5 94.2 L 33.2 93.9 L 35 94.3 L 36.6 93.7 L 38.5 94 L 40.1 93.1 L 41.9 93.3 L 43.4 92.3 L 45.2 92.3 L 46.8 91.3 L 48.4 90.8 L 50 89.7 L 50 89.7 L 48.1 89.3 L 46.4 89.5 L 44.6 89.1 L 42.9 89.7 L 41.1 89.4 L 39.5 90.2 L 37.7 90 L 36.1 90.9 L 34.4 91 L 32.8 92 L 31.1 92.3 L 29.5 93.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.1 93.5 L 28.2 92 L 26 91.5 L 24.1 90 L 21.9 90.1 L 20 88.7 L 17.7 89.2 L 15.7 88 L 13.4 88.7 L 11.3 87.9 L 9 88.7 L 6.8 88.5 L 4.5 89.5 L 4.5 89.5 L 6.4 91.2 L 8.4 91.8 L 10.4 93.4 L 12.6 93.3 L 14.5 94.8 L 16.8 94.3 L 18.7 95.6 L 21.1 94.9 L 23.1 95.8 L 25.4 95 L 27.6 95.3 L 29.9 94.5 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.6 93.3 L 27.6 92.2 L 25.5 91.7 L 23.5 90.6 L 21.3 90.5 L 19.2 89.5 L 17 89.6 L 14.9 88.7 L 12.7 89 L 10.6 88.4 L 8.3 88.7 L 6.1 88.4 L 3.8 88.9 L 3.8 88.9 L 5.8 90.1 L 7.9 90.6 L 10 91.7 L 12.2 91.9 L 14.2 93 L 16.4 92.8 L 18.5 93.8 L 20.7 93.5 L 22.8 94.2 L 25.1 93.9 L 27.2 94.2 L 29.5 93.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 93.6 L 28.8 91.5 L 27 90.5 L 25.6 88.5 L 23.4 88.1 L 22 86.1 L 19.7 86 L 18.2 84.3 L 15.8 84.3 L 14.1 83 L 11.6 83.1 L 9.6 82.3 L 7.1 82.6 L 7.1 82.6 L 8.4 84.8 L 10.2 85.9 L 11.6 87.9 L 13.7 88.5 L 15.1 90.5 L 17.4 90.6 L 18.9 92.4 L 21.3 92.4 L 23 93.8 L 25.4 93.7 L 27.3 94.6 L 29.8 94.4 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.7 93.3 L 28.1 91.7 L 26.2 90.7 L 24.6 89 L 22.6 88.4 L 20.9 86.8 L 18.8 86.3 L 17.1 84.9 L 14.8 84.6 L 13 83.4 L 10.8 83 L 8.8 82.2 L 6.5 82 L 6.5 82 L 8 83.7 L 9.9 84.8 L 11.5 86.4 L 13.5 87.1 L 15.1 88.7 L 17.3 89.2 L 19 90.7 L 21.2 91 L 23 92.3 L 25.2 92.6 L 27.2 93.5 L 29.4 93.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.3 93.6 L 29.7 91.3 L 28.2 89.9 L 27.5 87.6 L 25.6 86.5 L 24.9 84.3 L 22.8 83.5 L 21.9 81.4 L 19.6 80.8 L 18.4 79.1 L 16 78.5 L 14.4 77.2 L 11.9 76.8 L 11.9 76.8 L 12.5 79.2 L 13.9 80.8 L 14.5 83.1 L 16.4 84.2 L 17.1 86.5 L 19.2 87.3 L 20 89.4 L 22.3 90 L 23.5 91.8 L 25.8 92.4 L 27.3 93.8 L 29.7 94.4 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.8 93.4 L 28.8 91.4 L 27.3 89.9 L 26.3 87.9 L 24.5 86.7 L 23.5 84.7 L 21.6 83.7 L 20.4 81.9 L 18.4 80.9 L 17.1 79.3 L 15 78.4 L 13.4 77 L 11.3 76.2 L 11.3 76.2 L 12.2 78.2 L 13.7 79.8 L 14.7 81.8 L 16.4 83 L 17.4 85 L 19.3 86 L 20.4 87.9 L 22.5 88.8 L 23.7 90.5 L 25.8 91.5 L 27.3 92.9 L 29.4 93.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 93.8 L 30.5 91.4 L 29.6 89.6 L 29.7 87.2 L 28.3 85.7 L 28.3 83.4 L 26.5 82.1 L 26.3 79.9 L 24.3 78.6 L 23.8 76.6 L 21.7 75.4 L 20.6 73.7 L 18.4 72.6 L 18.4 72.6 L 18.2 75 L 19 76.9 L 18.9 79.2 L 20.3 80.8 L 20.2 83.2 L 21.9 84.5 L 22.1 86.8 L 24 88 L 24.5 90 L 26.5 91.3 L 27.5 93 L 29.6 94.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.8 93.4 L 29.5 91.3 L 28.6 89.5 L 28.2 87.3 L 27 85.6 L 26.6 83.5 L 25.1 82 L 24.6 79.9 L 23 78.5 L 22.3 76.5 L 20.6 75.1 L 19.5 73.3 L 17.8 71.9 L 17.8 71.9 L 18 74.1 L 18.9 76 L 19.2 78.2 L 20.5 79.8 L 20.8 82 L 22.3 83.5 L 22.7 85.6 L 24.3 87.1 L 25 89 L 26.7 90.5 L 27.7 92.3 L 29.3 93.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.5 93.9 L 31.3 91.7 L 31.1 89.8 L 31.9 87.6 L 31 85.7 L 31.8 83.6 L 30.6 81.7 L 31.1 79.6 L 29.6 77.9 L 29.7 75.8 L 28.2 74 L 27.7 72.1 L 26 70.4 L 26 70.4 L 25 72.6 L 25.1 74.6 L 24.3 76.7 L 25.1 78.6 L 24.3 80.8 L 25.4 82.6 L 24.9 84.7 L 26.3 86.5 L 26.1 88.6 L 27.6 90.4 L 28 92.3 L 29.5 94.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.9 93.5 L 30.3 91.4 L 29.9 89.4 L 30.3 87.3 L 29.6 85.4 L 30 83.3 L 29.1 81.4 L 29.3 79.3 L 28.2 77.4 L 28.1 75.4 L 27 73.5 L 26.6 71.6 L 25.4 69.7 L 25.4 69.7 L 24.9 71.9 L 25.1 73.9 L 24.7 76 L 25.4 77.9 L 25 80 L 25.9 81.9 L 25.7 84 L 26.7 85.9 L 26.7 87.9 L 27.8 89.8 L 28.2 91.8 L 29.3 93.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.5 94.1 L 32 92.3 L 32.4 90.4 L 33.9 88.6 L 33.7 86.5 L 35.1 84.7 L 34.6 82.6 L 35.7 80.8 L 34.9 78.6 L 35.7 76.7 L 34.9 74.6 L 35 72.6 L 34 70.4 L 34 70.4 L 32.3 72.1 L 31.8 74 L 30.3 75.8 L 30.4 77.9 L 28.9 79.6 L 29.4 81.7 L 28.2 83.6 L 29 85.7 L 28.1 87.6 L 28.9 89.8 L 28.7 91.7 L 29.5 93.9 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.9 93.6 L 30.9 91.8 L 31.3 89.8 L 32.3 87.9 L 32.3 85.9 L 33.3 84 L 33 81.9 L 33.9 80 L 33.5 77.9 L 34.1 76 L 33.7 73.9 L 33.9 71.8 L 33.3 69.7 L 33.3 69.7 L 32.2 71.6 L 31.8 73.5 L 30.7 75.4 L 30.7 77.5 L 29.6 79.3 L 29.9 81.4 L 29 83.3 L 29.4 85.4 L 28.7 87.3 L 29.1 89.4 L 28.9 91.4 L 29.3 93.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 94.2 L 32.5 93 L 33.5 91.3 L 35.5 90 L 36 88 L 37.9 86.8 L 38.1 84.5 L 39.8 83.2 L 39.7 80.8 L 41.1 79.2 L 41 76.9 L 41.8 75 L 41.6 72.6 L 41.6 72.6 L 39.4 73.7 L 38.3 75.4 L 36.2 76.6 L 35.7 78.6 L 33.7 79.9 L 33.5 82.1 L 31.7 83.4 L 31.7 85.7 L 30.3 87.2 L 30.4 89.6 L 29.5 91.4 L 29.6 93.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.8 93.7 L 31.4 92.3 L 32.4 90.5 L 34 89 L 34.7 87.1 L 36.2 85.6 L 36.7 83.5 L 38.1 82 L 38.4 79.8 L 39.6 78.1 L 39.9 76 L 40.7 74.1 L 40.9 71.9 L 40.9 71.9 L 39.2 73.3 L 38.2 75.1 L 36.6 76.6 L 35.9 78.5 L 34.3 80 L 33.8 82 L 32.4 83.5 L 32 85.7 L 30.8 87.3 L 30.5 89.5 L 29.6 91.3 L 29.3 93.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.3 94.4 L 32.7 93.8 L 34.2 92.4 L 36.5 91.8 L 37.7 90 L 40 89.4 L 40.8 87.3 L 42.9 86.5 L 43.6 84.2 L 45.5 83.1 L 46.1 80.8 L 47.5 79.2 L 48.1 76.8 L 48.1 76.8 L 45.6 77.2 L 44 78.5 L 41.6 79.1 L 40.4 80.8 L 38.1 81.4 L 37.2 83.5 L 35.1 84.3 L 34.4 86.5 L 32.5 87.6 L 31.8 89.9 L 30.3 91.3 L 29.7 93.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.8 93.8 L 31.8 92.9 L 33.3 91.4 L 35.3 90.5 L 36.6 88.8 L 38.5 87.9 L 39.6 86 L 41.5 85 L 42.5 83 L 44.2 81.7 L 45.1 79.8 L 46.5 78.2 L 47.4 76.2 L 47.4 76.2 L 45.3 77 L 43.8 78.4 L 41.8 79.3 L 40.5 80.9 L 38.5 81.9 L 37.4 83.7 L 35.5 84.7 L 34.5 86.7 L 32.8 87.9 L 31.8 89.9 L 30.3 91.4 L 29.4 93.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 94.4 L 32.7 94.6 L 34.6 93.7 L 37 93.8 L 38.7 92.4 L 41.1 92.4 L 42.6 90.6 L 44.9 90.5 L 46.3 88.5 L 48.4 87.9 L 49.8 85.9 L 51.6 84.8 L 52.9 82.6 L 52.9 82.6 L 50.4 82.3 L 48.4 83.1 L 45.9 83 L 44.2 84.3 L 41.8 84.3 L 40.3 86 L 38 86.1 L 36.6 88.1 L 34.4 88.5 L 33 90.5 L 31.2 91.5 L 29.8 93.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.7 93.9 L 31.9 93.5 L 33.8 92.6 L 36.1 92.3 L 37.8 91 L 40 90.7 L 41.6 89.2 L 43.8 88.7 L 45.3 87.1 L 47.4 86.4 L 48.9 84.8 L 50.7 83.7 L 52.2 82 L 52.2 82 L 50 82.2 L 48 83.1 L 45.8 83.4 L 44 84.6 L 41.8 84.9 L 40.2 86.3 L 38 86.8 L 36.4 88.4 L 34.4 89.1 L 32.9 90.7 L 31 91.7 L 29.4 93.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.1 94.5 L 32.4 95.3 L 34.6 95 L 36.9 95.8 L 38.9 94.9 L 41.3 95.6 L 43.2 94.3 L 45.5 94.8 L 47.4 93.3 L 49.6 93.4 L 51.6 91.8 L 53.6 91.2 L 55.5 89.5 L 55.5 89.5 L 53.2 88.5 L 51 88.7 L 48.7 87.9 L 46.6 88.7 L 44.3 88 L 42.3 89.2 L 40 88.7 L 38.1 90.1 L 35.9 90 L 34 91.5 L 31.8 92 L 29.9 93.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.6 93.9 L 31.9 94.2 L 34 93.9 L 36.2 94.2 L 38.3 93.5 L 40.5 93.8 L 42.5 92.8 L 44.7 93 L 46.7 91.9 L 48.9 91.7 L 50.9 90.6 L 52.9 90.1 L 54.9 88.9 L 54.9 88.9 L 52.6 88.4 L 50.5 88.7 L 48.3 88.4 L 46.2 89 L 44 88.7 L 41.9 89.6 L 39.7 89.5 L 37.7 90.5 L 35.6 90.6 L 33.6 91.7 L 31.5 92.2 L 29.5 93.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 37.5 76 C 37.5 76.6 37.3 77.2 37.1 77.8 C 36.9 78.3 36.5 78.7 36.4 79.3 C 36.2 79.8 36.2 80.4 36 81 C 35.8 81.6 35.7 82.2 35.3 82.7 C 35 83.1 34.4 83.3 34 83.5 C 33.6 83.7 33.1 83.7 32.6 83.9 C 32.2 84.2 31.8 84.6 31.4 84.8 C 31 85.1 30.5 85.4 30 85.4 C 29.5 85.4 29 85.1 28.6 84.8 C 28.2 84.6 27.8 84.2 27.4 83.9 C 26.9 83.7 26.4 83.7 26 83.5 C 25.6 83.3 25 83.1 24.7 82.7 C 24.3 82.2 24.2 81.6 24 81 C 23.8 80.4 23.8 79.8 23.6 79.3 C 23.5 78.7 23.1 78.3 22.9 77.8 C 22.7 77.2 22.5 76.6 22.5 76 C 22.5 75.4 22.7 74.8 22.9 74.2 C 23.1 73.7 23.5 73.3 23.6 72.7 C 23.8 72.2 23.8 71.6 24 71 C 24.2 70.4 24.3 69.8 24.7 69.3 C 25 68.9 25.6 68.7 26 68.5 C 26.4 68.3 26.9 68.3 27.4 68.1 C 27.8 67.8 28.2 67.4 28.6 67.2 C 29 66.9 29.5 66.6 30 66.6 C 30.5 66.6 31 66.9 31.4 67.2 C 31.8 67.4 32.2 67.8 32.6 68.1 C 33.1 68.3 33.6 68.3 34 68.5 C 34.4 68.7 35 68.9 35.3 69.3 C 35.7 69.8 35.8 70.4 36 71 C 36.2 71.6 36.2 72.2 36.4 72.7 C 36.5 73.3 36.9 73.7 37.1 74.2 C 37.3 74.8 37.5 75.4 37.5 76 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 35.8 74.9 C 35.8 75.4 35.5 75.9 35.4 76.4 C 35.2 76.9 34.9 77.2 34.7 77.7 C 34.6 78.1 34.6 78.6 34.4 79.1 C 34.3 79.6 34.1 80.2 33.9 80.5 C 33.6 80.9 33.1 81 32.7 81.2 C 32.3 81.4 31.9 81.4 31.5 81.6 C 31.2 81.8 30.9 82.1 30.5 82.3 C 30.1 82.5 29.7 82.8 29.3 82.8 C 28.9 82.8 28.4 82.5 28.1 82.3 C 27.7 82.1 27.4 81.8 27 81.6 C 26.6 81.4 26.2 81.4 25.8 81.2 C 25.5 81 25 80.9 24.7 80.5 C 24.4 80.2 24.3 79.6 24.1 79.1 C 24 78.6 24 78.1 23.8 77.7 C 23.7 77.2 23.4 76.9 23.2 76.4 C 23 75.9 22.8 75.4 22.8 74.9 C 22.8 74.4 23 73.9 23.2 73.4 C 23.4 73 23.7 72.6 23.8 72.2 C 24 71.7 24 71.2 24.1 70.7 C 24.3 70.2 24.4 69.7 24.7 69.3 C 25 69 25.5 68.8 25.8 68.6 C 26.2 68.5 26.6 68.4 27 68.2 C 27.4 68.1 27.7 67.7 28.1 67.5 C 28.4 67.3 28.9 67 29.3 67 C 29.7 67 30.1 67.3 30.5 67.5 C 30.9 67.7 31.2 68.1 31.5 68.2 C 31.9 68.4 32.3 68.5 32.7 68.6 C 33.1 68.8 33.6 69 33.9 69.3 C 34.1 69.7 34.3 70.2 34.4 70.7 C 34.6 71.2 34.6 71.7 34.7 72.2 C 34.9 72.6 35.2 73 35.4 73.4 C 35.5 73.9 35.8 74.4 35.8 74.9 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30 72.6 C 30 72.9 30.1 73.1 30 73.4 C 30 73.7 30 74 29.9 74.3 C 29.8 74.5 29.5 74.7 29.3 74.9 C 29.1 75 28.8 75.1 28.6 75.2 C 28.4 75.4 28.2 75.6 28 75.7 C 27.8 75.8 27.5 76 27.3 76 C 27 76 26.7 75.8 26.5 75.7 C 26.3 75.6 26.1 75.4 25.9 75.2 C 25.7 75.1 25.4 75 25.2 74.9 C 25 74.7 24.8 74.5 24.6 74.3 C 24.5 74 24.5 73.7 24.5 73.4 C 24.5 73.1 24.5 72.9 24.5 72.6 C 24.5 72.3 24.5 72 24.5 71.7 C 24.5 71.5 24.5 71.1 24.6 70.9 C 24.8 70.6 25 70.4 25.2 70.3 C 25.4 70.1 25.7 70.1 25.9 69.9 C 26.1 69.8 26.3 69.6 26.5 69.5 C 26.7 69.3 27 69.2 27.3 69.2 C 27.5 69.2 27.8 69.3 28 69.5 C 28.2 69.6 28.4 69.8 28.6 69.9 C 28.8 70.1 29.1 70.1 29.3 70.3 C 29.5 70.4 29.8 70.6 29.9 70.9 C 30 71.1 30 71.5 30 71.7 C 30.1 72 30 72.3 30 72.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 67.7 Q 29.5 70.6 36.5 72.6 Q 29.8 69.7 22.8 67.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 72.6 Q 29.8 70.6 36.5 67.7 Q 29.5 69.7 22.8 72.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 71 Q 29.5 73.9 36.5 75.8 Q 29.8 72.9 22.8 71 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 75.8 Q 29.8 73.9 36.5 71 Q 29.5 72.9 22.8 75.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 74.2 Q 29.5 77.1 36.5 79.1 Q 29.8 76.2 22.8 74.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 79.1 Q 29.8 77.1 36.5 74.2 Q 29.5 76.2 22.8 79.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 77.4 Q 29.5 80.3 36.5 82.3 Q 29.8 79.4 22.8 77.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 82.3 Q 29.8 80.3 36.5 77.4 Q 29.5 79.4 22.8 82.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 80.7 Q 29.5 83.6 36.5 85.5 Q 29.8 82.6 22.8 80.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 22.8 85.5 Q 29.8 83.6 36.5 80.7 Q 29.5 82.6 22.8 85.5 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.2 68.6 L 30.2 67.6 L 29.6 67 L 29.5 66 L 28.7 65.7 L 28.4 64.9 L 27.4 64.7 L 26.8 64.2 L 25.7 64.2 L 25.7 64.2 L 25.6 65.4 L 26.1 66 L 26.2 67 L 27 67.3 L 27.2 68.2 L 28.2 68.3 L 28.8 68.9 L 29.8 69 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.2 68.7 L 30.6 67.7 L 30.3 67 L 30.6 66 L 29.9 65.4 L 30 64.6 L 29.1 64.1 L 28.7 63.4 L 27.7 62.9 L 27.7 62.9 L 27.2 64 L 27.4 64.8 L 27.1 65.7 L 27.7 66.3 L 27.6 67.2 L 28.5 67.7 L 28.8 68.4 L 29.8 68.9 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30.2 68.8 L 31 68 L 31 67.2 L 31.6 66.4 L 31.2 65.7 L 31.5 64.9 L 30.9 64.1 L 30.8 63.3 L 30 62.5 L 30 62.5 L 29.2 63.3 L 29.1 64.1 L 28.5 64.9 L 28.8 65.7 L 28.4 66.4 L 29 67.2 L 29 68 L 29.8 68.8 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30.2 68.9 L 31.2 68.4 L 31.5 67.7 L 32.4 67.2 L 32.3 66.3 L 32.9 65.7 L 32.6 64.8 L 32.8 64 L 32.3 62.9 L 32.3 62.9 L 31.3 63.4 L 30.9 64.1 L 30 64.6 L 30.1 65.4 L 29.4 66 L 29.7 67 L 29.4 67.7 L 29.8 68.7 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30.2 69 L 31.2 68.9 L 31.8 68.3 L 32.8 68.2 L 33 67.3 L 33.8 67 L 33.9 66 L 34.4 65.4 L 34.3 64.2 L 34.3 64.2 L 33.2 64.2 L 32.6 64.7 L 31.6 64.9 L 31.3 65.7 L 30.5 66 L 30.4 67 L 29.8 67.6 L 29.8 68.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.1 93.5 L 27.9 91.8 L 25.6 91.3 L 23.4 89.6 L 21 89.8 L 18.8 88.2 L 16.2 88.7 L 14 87.4 L 11.4 88.2 L 9.2 87.3 L 6.6 88.2 L 4.1 88 L 1.5 89 L 1.5 89 L 3.6 90.9 L 6 91.5 L 8.1 93.2 L 10.6 93.1 L 12.7 94.8 L 15.3 94.3 L 17.5 95.7 L 20.1 94.9 L 22.3 95.9 L 24.9 95 L 27.3 95.4 L 29.9 94.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.6 93.2 L 27.4 92 L 25 91.6 L 22.8 90.3 L 20.3 90.3 L 18 89.1 L 15.5 89.3 L 13.2 88.3 L 10.7 88.6 L 8.4 87.8 L 5.8 88.2 L 3.4 87.9 L 0.9 88.4 L 0.9 88.4 L 3.1 89.7 L 5.5 90.3 L 7.7 91.5 L 10.2 91.6 L 12.4 92.8 L 14.9 92.7 L 17.2 93.7 L 19.7 93.4 L 22 94.2 L 24.6 93.9 L 27 94.3 L 29.5 93.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 93.5 L 28.5 91.4 L 26.4 90.4 L 24.7 88.2 L 22.3 87.8 L 20.6 85.8 L 18 85.8 L 16.2 83.9 L 13.5 84.1 L 11.5 82.7 L 8.8 83 L 6.5 82.2 L 3.8 82.6 L 3.8 82.6 L 5.4 84.9 L 7.5 86.1 L 9.1 88.2 L 11.5 88.7 L 13.2 90.8 L 15.8 90.9 L 17.6 92.8 L 20.2 92.6 L 22.2 94.1 L 24.9 93.8 L 27.1 94.7 L 29.8 94.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.7 93.3 L 27.8 91.6 L 25.6 90.6 L 23.8 88.9 L 21.4 88.2 L 19.5 86.6 L 17 86.2 L 15.1 84.7 L 12.6 84.4 L 10.5 83.2 L 8 83 L 5.7 82.1 L 3.1 82 L 3.1 82 L 5 83.8 L 7.1 84.9 L 9 86.6 L 11.3 87.3 L 13.2 89 L 15.7 89.4 L 17.6 90.9 L 20.1 91.2 L 22.2 92.5 L 24.7 92.7 L 26.9 93.6 L 29.4 93.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 93.6 L 29.2 91.1 L 27.4 89.7 L 26.3 87.2 L 24.1 86.3 L 23 83.9 L 20.5 83.3 L 19.2 81.1 L 16.6 80.7 L 15 78.9 L 12.4 78.5 L 10.4 77.2 L 7.7 77 L 7.7 77 L 8.6 79.6 L 10.4 81.2 L 11.4 83.6 L 13.6 84.7 L 14.7 87.1 L 17.1 87.7 L 18.4 89.9 L 21 90.4 L 22.5 92.3 L 25.1 92.7 L 27 94 L 29.7 94.4 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.8 93.3 L 28.4 91.2 L 26.5 89.8 L 25.1 87.7 L 23 86.6 L 21.6 84.5 L 19.3 83.6 L 17.8 81.7 L 15.5 80.9 L 13.8 79.2 L 11.4 78.4 L 9.5 77.1 L 7 76.4 L 7 76.4 L 8.3 78.5 L 10.1 80.1 L 11.5 82.1 L 13.6 83.3 L 15 85.4 L 17.2 86.3 L 18.7 88.3 L 21.1 89.1 L 22.7 90.8 L 25.1 91.6 L 27 93 L 29.4 93.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 93.7 L 30 91.1 L 28.6 89.2 L 28.2 86.6 L 26.4 85.2 L 25.9 82.6 L 23.7 81.5 L 23 79.1 L 20.6 78.1 L 19.6 76 L 17.1 75 L 15.5 73.3 L 13 72.4 L 13 72.4 L 13.2 75.1 L 14.5 77.1 L 14.9 79.7 L 16.7 81.2 L 17.1 83.7 L 19.3 84.9 L 19.9 87.4 L 22.3 88.4 L 23.2 90.6 L 25.7 91.6 L 27.2 93.3 L 29.6 94.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.8 93.4 L 29 91.1 L 27.6 89.2 L 26.8 86.9 L 25.1 85.3 L 24.2 83 L 22.3 81.6 L 21.3 79.4 L 19.3 78.1 L 18.1 76.1 L 16 74.8 L 14.5 73 L 12.3 71.8 L 12.3 71.8 L 13 74.2 L 14.4 76.1 L 15.2 78.4 L 16.9 80 L 17.7 82.3 L 19.6 83.8 L 20.5 86 L 22.6 87.3 L 23.7 89.3 L 25.8 90.7 L 27.3 92.5 L 29.3 93.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.5 93.8 L 30.8 91.2 L 29.9 89.1 L 30.2 86.5 L 28.8 84.7 L 29 82.2 L 27.2 80.5 L 27.2 78.1 L 25.2 76.5 L 24.7 74.2 L 22.7 72.7 L 21.6 70.7 L 19.3 69.2 L 19.3 69.2 L 18.9 71.8 L 19.6 74 L 19.3 76.6 L 20.6 78.5 L 20.3 81 L 22.1 82.7 L 22.1 85.2 L 24.1 86.8 L 24.4 89.1 L 26.5 90.6 L 27.4 92.7 L 29.5 94.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.9 93.4 L 29.7 91 L 28.8 88.9 L 28.7 86.5 L 27.4 84.6 L 27.2 82.2 L 25.7 80.4 L 25.4 78.1 L 23.7 76.3 L 23.1 74.1 L 21.5 72.3 L 20.4 70.3 L 18.7 68.6 L 18.7 68.6 L 18.8 71 L 19.5 73.1 L 19.7 75.5 L 20.9 77.5 L 21.1 79.9 L 22.5 81.8 L 22.9 84.1 L 24.5 85.9 L 25 88.1 L 26.7 89.9 L 27.6 91.9 L 29.3 93.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.5 93.9 L 31.5 91.5 L 31.3 89.3 L 32.2 87 L 31.4 84.8 L 32.3 82.5 L 31 80.4 L 31.6 78.1 L 30.1 76 L 30.2 73.7 L 28.6 71.7 L 28.1 69.5 L 26.4 67.5 L 26.4 67.5 L 25.2 69.9 L 25.3 72.2 L 24.3 74.6 L 25.1 76.7 L 24.2 79.1 L 25.4 81.1 L 24.7 83.5 L 26.2 85.5 L 25.9 87.8 L 27.5 89.8 L 27.9 92 L 29.5 94.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.9 93.5 L 30.4 91.2 L 30.1 89 L 30.6 86.6 L 29.9 84.5 L 30.3 82.1 L 29.4 80 L 29.6 77.7 L 28.5 75.6 L 28.5 73.3 L 27.4 71.2 L 27 69 L 25.7 66.9 L 25.7 66.9 L 25.1 69.2 L 25.3 71.5 L 24.9 73.8 L 25.5 76 L 25 78.3 L 25.9 80.5 L 25.6 82.8 L 26.7 84.9 L 26.7 87.2 L 27.8 89.3 L 28.1 91.5 L 29.2 93.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.5 94.1 L 32.1 92 L 32.5 89.8 L 34.1 87.8 L 33.8 85.5 L 35.3 83.5 L 34.6 81.1 L 35.8 79.1 L 34.9 76.7 L 35.7 74.6 L 34.7 72.2 L 34.8 69.9 L 33.6 67.5 L 33.6 67.5 L 31.9 69.5 L 31.4 71.7 L 29.8 73.7 L 29.9 76 L 28.4 78.1 L 29 80.4 L 27.7 82.5 L 28.6 84.8 L 27.8 87 L 28.7 89.3 L 28.5 91.5 L 29.5 93.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.9 93.6 L 31 91.5 L 31.3 89.3 L 32.4 87.2 L 32.3 84.9 L 33.3 82.8 L 33 80.5 L 33.9 78.3 L 33.4 76 L 34 73.8 L 33.5 71.5 L 33.6 69.2 L 33 66.9 L 33 66.9 L 31.8 69 L 31.4 71.2 L 30.3 73.3 L 30.3 75.6 L 29.3 77.7 L 29.6 80 L 28.7 82.2 L 29.1 84.5 L 28.5 86.7 L 29 89 L 28.7 91.2 L 29.2 93.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.5 94.2 L 32.6 92.7 L 33.5 90.6 L 35.6 89.1 L 35.9 86.8 L 37.9 85.2 L 37.9 82.7 L 39.7 81 L 39.4 78.5 L 40.7 76.6 L 40.4 74 L 41.1 71.8 L 40.7 69.2 L 40.7 69.2 L 38.4 70.7 L 37.3 72.7 L 35.3 74.2 L 34.8 76.5 L 32.8 78.1 L 32.8 80.5 L 31 82.2 L 31.2 84.7 L 29.8 86.5 L 30.1 89.1 L 29.2 91.2 L 29.5 93.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.9 93.7 L 31.5 91.9 L 32.4 89.9 L 34 88.1 L 34.5 85.9 L 36.1 84.1 L 36.4 81.7 L 37.8 79.9 L 38 77.5 L 39.1 75.5 L 39.3 73.1 L 40 71 L 40 68.6 L 40 68.6 L 38.3 70.3 L 37.3 72.3 L 35.7 74.1 L 35.1 76.3 L 33.5 78.1 L 33.2 80.4 L 31.8 82.2 L 31.6 84.6 L 30.4 86.6 L 30.2 89 L 29.4 91.1 L 29.3 93.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 94.3 L 32.8 93.3 L 34.3 91.6 L 36.8 90.6 L 37.7 88.4 L 40.1 87.4 L 40.7 84.9 L 42.9 83.7 L 43.3 81.2 L 45.1 79.7 L 45.5 77.1 L 46.8 75.1 L 47 72.4 L 47 72.4 L 44.5 73.3 L 42.9 75 L 40.4 76 L 39.4 78.1 L 37 79.1 L 36.3 81.5 L 34.1 82.6 L 33.6 85.2 L 31.8 86.6 L 31.4 89.2 L 30 91.1 L 29.6 93.7 Z', from: 5 },
        { tone: 'stem', d: 'M 29.8 93.8 L 31.9 92.4 L 33.3 90.7 L 35.3 89.3 L 36.5 87.3 L 38.5 85.9 L 39.4 83.7 L 41.2 82.3 L 42 80 L 43.7 78.4 L 44.4 76.1 L 45.7 74.2 L 46.4 71.8 L 46.4 71.8 L 44.3 73 L 42.8 74.8 L 40.7 76.1 L 39.6 78.1 L 37.6 79.4 L 36.6 81.6 L 34.7 83.1 L 33.9 85.3 L 32.2 86.9 L 31.5 89.2 L 30.1 91.1 L 29.3 93.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 94.4 L 33 94 L 34.9 92.7 L 37.5 92.3 L 39 90.4 L 41.6 89.9 L 42.9 87.7 L 45.3 87.1 L 46.4 84.7 L 48.6 83.6 L 49.6 81.2 L 51.4 79.6 L 52.3 77 L 52.3 77 L 49.6 77.2 L 47.6 78.5 L 45 78.9 L 43.4 80.7 L 40.8 81.1 L 39.5 83.3 L 37 83.9 L 35.9 86.3 L 33.7 87.2 L 32.6 89.7 L 30.8 91.1 L 29.7 93.6 Z', from: 5 },
        { tone: 'stem', d: 'M 29.8 93.8 L 32.1 93 L 34 91.6 L 36.3 90.8 L 37.9 89.1 L 40.2 88.3 L 41.7 86.3 L 43.9 85.4 L 45.3 83.3 L 47.3 82.1 L 48.7 80.1 L 50.4 78.5 L 51.7 76.4 L 51.7 76.4 L 49.3 77.1 L 47.4 78.4 L 45 79.2 L 43.4 80.9 L 41.1 81.7 L 39.6 83.6 L 37.3 84.5 L 36 86.6 L 33.9 87.7 L 32.5 89.8 L 30.7 91.3 L 29.4 93.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 94.5 L 32.9 94.7 L 35.1 93.8 L 37.8 94.1 L 39.8 92.6 L 42.4 92.8 L 44.2 90.9 L 46.8 90.8 L 48.5 88.7 L 50.9 88.2 L 52.5 86.1 L 54.6 84.9 L 56.2 82.6 L 56.2 82.6 L 53.5 82.2 L 51.2 83 L 48.5 82.7 L 46.5 84.1 L 43.8 83.9 L 42 85.8 L 39.4 85.8 L 37.7 87.8 L 35.3 88.2 L 33.6 90.4 L 31.5 91.4 L 29.8 93.5 Z', from: 5 },
        { tone: 'stem', d: 'M 29.7 93.9 L 32.2 93.6 L 34.4 92.7 L 36.9 92.5 L 38.9 91.2 L 41.4 90.9 L 43.3 89.4 L 45.7 88.9 L 47.6 87.3 L 49.8 86.6 L 51.7 84.9 L 53.8 83.8 L 55.6 82 L 55.6 82 L 53.1 82.1 L 50.8 83 L 48.3 83.2 L 46.3 84.4 L 43.8 84.7 L 41.9 86.2 L 39.5 86.6 L 37.6 88.2 L 35.3 88.9 L 33.4 90.6 L 31.3 91.6 L 29.4 93.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.1 94.5 L 32.7 95.4 L 35.1 95 L 37.7 95.9 L 39.9 94.9 L 42.5 95.7 L 44.7 94.3 L 47.3 94.8 L 49.4 93.1 L 51.9 93.2 L 54 91.5 L 56.4 90.9 L 58.5 89 L 58.5 89 L 55.9 88 L 53.4 88.2 L 50.8 87.3 L 48.6 88.2 L 46 87.4 L 43.8 88.7 L 41.2 88.2 L 39 89.8 L 36.6 89.6 L 34.4 91.3 L 32.1 91.8 L 29.9 93.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.6 93.9 L 32.1 94.3 L 34.5 93.9 L 37 94.2 L 39.3 93.4 L 41.8 93.7 L 44 92.7 L 46.5 92.8 L 48.7 91.6 L 51.1 91.5 L 53.3 90.3 L 55.7 89.7 L 57.8 88.4 L 57.8 88.4 L 55.3 87.9 L 52.9 88.2 L 50.4 87.8 L 48.1 88.6 L 45.6 88.3 L 43.4 89.3 L 40.9 89.1 L 38.7 90.3 L 36.3 90.3 L 34.1 91.6 L 31.7 92 L 29.5 93.2 Z', from: 5 },
        { tone: 'deep', d: 'M 39 68 C 39 68.7 38.7 69.5 38.4 70.1 C 38.2 70.8 37.8 71.4 37.6 72 C 37.4 72.7 37.4 73.4 37.2 74.1 C 36.9 74.8 36.8 75.6 36.4 76.1 C 36 76.6 35.3 76.9 34.8 77.1 C 34.2 77.4 33.7 77.4 33.1 77.7 C 32.6 78 32.2 78.5 31.7 78.8 C 31.2 79.1 30.6 79.5 30 79.5 C 29.4 79.5 28.8 79.1 28.3 78.8 C 27.8 78.5 27.4 78 26.9 77.7 C 26.3 77.4 25.8 77.4 25.2 77.1 C 24.7 76.9 24 76.6 23.6 76.1 C 23.2 75.6 23.1 74.8 22.8 74.1 C 22.6 73.4 22.6 72.7 22.4 72 C 22.2 71.4 21.8 70.8 21.6 70.1 C 21.3 69.5 21 68.7 21 68 C 21 67.3 21.3 66.5 21.6 65.9 C 21.8 65.2 22.2 64.6 22.4 64 C 22.6 63.3 22.6 62.6 22.8 61.9 C 23.1 61.2 23.2 60.4 23.6 59.9 C 24 59.4 24.7 59.1 25.2 58.9 C 25.8 58.6 26.3 58.6 26.9 58.3 C 27.4 58 27.8 57.5 28.3 57.2 C 28.8 56.9 29.4 56.5 30 56.5 C 30.6 56.5 31.2 56.9 31.7 57.2 C 32.2 57.5 32.6 58 33.1 58.3 C 33.7 58.6 34.2 58.6 34.8 58.9 C 35.3 59.1 36 59.4 36.4 59.9 C 36.8 60.4 36.9 61.2 37.2 61.9 C 37.4 62.6 37.4 63.3 37.6 64 C 37.8 64.6 38.2 65.2 38.4 65.9 C 38.7 66.5 39 67.3 39 68 Z', from: 5 },
        { tone: 'base', d: 'M 36.9 66.7 C 36.9 67.3 36.6 67.9 36.4 68.5 C 36.2 69 35.8 69.5 35.7 70.1 C 35.5 70.6 35.5 71.2 35.3 71.8 C 35.1 72.4 34.9 73.1 34.6 73.5 C 34.3 73.9 33.7 74.1 33.2 74.4 C 32.8 74.6 32.3 74.6 31.8 74.8 C 31.4 75.1 31 75.5 30.6 75.7 C 30.1 76 29.6 76.3 29.1 76.3 C 28.7 76.3 28.1 76 27.7 75.7 C 27.2 75.5 26.9 75.1 26.4 74.8 C 26 74.6 25.5 74.6 25 74.4 C 24.6 74.1 24 73.9 23.7 73.5 C 23.3 73.1 23.2 72.4 23 71.8 C 22.8 71.2 22.8 70.6 22.6 70.1 C 22.4 69.5 22.1 69 21.9 68.5 C 21.7 67.9 21.4 67.3 21.4 66.7 C 21.4 66.1 21.7 65.4 21.9 64.9 C 22.1 64.3 22.4 63.9 22.6 63.3 C 22.8 62.7 22.8 62.1 23 61.5 C 23.2 61 23.3 60.3 23.7 59.9 C 24 59.4 24.6 59.2 25 59 C 25.5 58.8 26 58.8 26.4 58.5 C 26.9 58.3 27.2 57.9 27.7 57.6 C 28.1 57.4 28.7 57 29.1 57 C 29.6 57 30.1 57.4 30.6 57.6 C 31 57.9 31.4 58.3 31.8 58.5 C 32.3 58.8 32.8 58.8 33.2 59 C 33.7 59.2 34.3 59.4 34.6 59.9 C 34.9 60.3 35.1 61 35.3 61.5 C 35.5 62.1 35.5 62.7 35.7 63.3 C 35.8 63.9 36.2 64.3 36.4 64.9 C 36.6 65.4 36.9 66.1 36.9 66.7 Z', from: 5 },
        { tone: 'light', d: 'M 30 63.8 C 30 64.2 30.1 64.5 30.1 64.8 C 30 65.2 30 65.6 29.9 65.9 C 29.7 66.2 29.4 66.4 29.2 66.6 C 28.9 66.8 28.6 66.9 28.4 67.1 C 28.1 67.2 27.9 67.5 27.6 67.6 C 27.4 67.8 27 68 26.7 68 C 26.4 68 26.1 67.8 25.8 67.6 C 25.6 67.5 25.4 67.2 25.1 67.1 C 24.8 66.9 24.5 66.8 24.3 66.6 C 24.1 66.4 23.8 66.2 23.6 65.9 C 23.5 65.6 23.4 65.2 23.4 64.8 C 23.4 64.5 23.5 64.2 23.5 63.8 C 23.5 63.5 23.4 63.1 23.4 62.8 C 23.4 62.4 23.5 62 23.6 61.7 C 23.8 61.4 24.1 61.2 24.3 61 C 24.5 60.8 24.8 60.7 25.1 60.6 C 25.4 60.4 25.6 60.1 25.8 60 C 26.1 59.8 26.4 59.7 26.7 59.7 C 27 59.7 27.4 59.8 27.6 60 C 27.9 60.1 28.1 60.4 28.4 60.6 C 28.6 60.7 28.9 60.8 29.2 61 C 29.4 61.2 29.7 61.4 29.9 61.7 C 30 62 30 62.4 30.1 62.8 C 30.1 63.1 30 63.5 30 63.8 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 57.9 Q 29.4 61.3 37.7 63.8 Q 29.7 60.4 21.4 57.9 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 63.8 Q 29.7 61.3 37.7 57.9 Q 29.4 60.4 21.4 63.8 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 61.8 Q 29.4 65.3 37.7 67.8 Q 29.7 64.3 21.4 61.8 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 67.8 Q 29.7 65.3 37.7 61.8 Q 29.4 64.3 21.4 67.8 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 65.8 Q 29.4 69.2 37.7 71.7 Q 29.7 68.3 21.4 65.8 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 71.7 Q 29.7 69.2 37.7 65.8 Q 29.4 68.3 21.4 71.7 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 69.8 Q 29.4 73.2 37.7 75.7 Q 29.7 72.3 21.4 69.8 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 75.7 Q 29.7 73.2 37.7 69.8 Q 29.4 72.3 21.4 75.7 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 73.7 Q 29.4 77.2 37.7 79.7 Q 29.7 76.2 21.4 73.7 Z', from: 5 },
        { tone: 'deep', d: 'M 21.4 79.7 Q 29.7 77.2 37.7 73.7 Q 29.4 76.2 21.4 79.7 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.2 59 L 30 57.8 L 29.4 57.1 L 29.2 56 L 28.2 55.6 L 27.8 54.6 L 26.7 54.4 L 26 53.7 L 24.7 53.6 L 24.7 53.6 L 24.8 54.9 L 25.4 55.7 L 25.6 56.8 L 26.5 57.2 L 26.9 58.2 L 28 58.5 L 28.6 59.2 L 29.8 59.4 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.2 59.1 L 30.5 58 L 30.2 57 L 30.4 55.9 L 29.7 55.2 L 29.7 54.2 L 28.7 53.5 L 28.3 52.6 L 27.1 52 L 27.1 52 L 26.7 53.3 L 27 54.2 L 26.8 55.3 L 27.5 56.1 L 27.5 57.1 L 28.4 57.8 L 28.8 58.7 L 29.8 59.3 Z', from: 5 },
        { tone: 'stem', d: 'M 30.2 59.2 L 31 58.2 L 31 57.3 L 31.6 56.3 L 31.2 55.4 L 31.5 54.4 L 30.9 53.4 L 30.8 52.5 L 30 51.5 L 30 51.5 L 29.2 52.5 L 29.1 53.4 L 28.5 54.4 L 28.8 55.4 L 28.4 56.3 L 29 57.3 L 29 58.2 L 29.8 59.2 Z', from: 5 },
        { tone: 'stem', d: 'M 30.2 59.3 L 31.2 58.7 L 31.6 57.8 L 32.5 57.1 L 32.5 56.1 L 33.2 55.3 L 33 54.2 L 33.3 53.3 L 32.9 52 L 32.9 52 L 31.7 52.6 L 31.3 53.5 L 30.3 54.2 L 30.3 55.2 L 29.6 55.9 L 29.8 57 L 29.5 58 L 29.8 59.1 Z', from: 5 },
        { tone: 'stem', d: 'M 30.2 59.4 L 31.4 59.2 L 32 58.5 L 33.1 58.2 L 33.5 57.2 L 34.4 56.8 L 34.6 55.7 L 35.2 54.9 L 35.3 53.6 L 35.3 53.6 L 34 53.7 L 33.3 54.4 L 32.2 54.6 L 31.8 55.6 L 30.8 56 L 30.6 57.1 L 30 57.8 L 29.8 59 Z', from: 5 }
      ]
    },
    potato: {
      trunk: 'M 28.2 96 Q 29.1 90 28.6 84 L 31.4 84 Q 30.9 90 31.8 96 Z',
      trunkShort: 'M 28.4 96 Q 29.2 92.5 28.7 89 L 31.3 89 Q 30.8 92.5 31.6 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[18, 90], [41, 91], [30, 92], [24, 84], [37, 84], [30, 78], [14, 82], [46, 82], [30, 70]],
      parts: [
        { tone: 'soil-deep', d: 'M 19 96 Q 23.2 92 30 92 Q 36.8 92 41 96 Z', from: 2, to: 2 },
        { tone: 'soil', d: 'M 20.3 96 Q 24.3 92.6 29.6 92.6 Q 33.3 92.9 36.6 96 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 29.1 89.6 Q 22.5 85.9 15.5 83.2 Q 22.1 86.9 29.1 89.6 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 25.7 88 Q 27.6 85.4 25.4 82.5 Q 24.1 85.6 25.7 88 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 25.7 88 Q 22.5 87.9 21.3 91.2 Q 24.6 90.7 25.7 88 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 21.5 86 Q 23.1 83.7 21.2 81.3 Q 20.1 83.9 21.5 86 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 21.5 86 Q 18.7 85.9 17.6 88.8 Q 20.4 88.3 21.5 86 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 17.2 84 Q 18.6 82.1 16.9 80 Q 16 82.3 17.2 84 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 17.2 84 Q 14.8 83.9 14 86.4 Q 16.3 86 17.2 84 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 17.8 84.3 Q 16.3 81.3 12.6 81.9 Q 14.7 84.7 17.8 84.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.8 87.6 Q 37.4 85.1 43.6 81.7 Q 37 84.1 30.8 87.6 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 34 86.1 Q 34.8 89.1 38.1 89.2 Q 36.7 86.4 34 86.1 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 34 86.1 Q 36 83.9 34.3 81 Q 32.8 83.7 34 86.1 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 38 84.3 Q 38.7 86.8 41.6 86.9 Q 40.3 84.5 38 84.3 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 38 84.3 Q 39.8 82.3 38.3 79.8 Q 37 82.2 38 84.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 42 82.4 Q 42.6 84.5 45 84.6 Q 44 82.6 42 82.4 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 42 82.4 Q 43.5 80.8 42.2 78.6 Q 41.1 80.6 42 82.4 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 41.4 82.7 Q 44.5 83.4 46.3 80.4 Q 43 80.3 41.4 82.7 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 27.5 92.7 C 27.4 93 27.1 93.3 26.9 93.6 C 26.6 93.8 26.3 94 25.9 94.2 C 25.6 94.3 25.2 94.5 24.8 94.6 C 24.4 94.7 23.9 94.7 23.5 94.6 C 23 94.5 22.6 94.3 22.3 94.1 C 21.9 93.9 21.6 93.5 21.4 93.3 C 21.1 93 20.9 92.7 20.7 92.3 C 20.6 92 20.5 91.6 20.5 91.3 C 20.6 91 20.9 90.7 21.1 90.4 C 21.4 90.2 21.7 90 22.1 89.8 C 22.4 89.7 22.8 89.5 23.2 89.4 C 23.6 89.3 24.1 89.3 24.5 89.4 C 25 89.5 25.4 89.7 25.7 89.9 C 26.1 90.1 26.4 90.5 26.6 90.7 C 26.9 91 27.1 91.3 27.3 91.7 C 27.4 92 27.5 92.4 27.5 92.7 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 26.6 92.3 C 26.6 92.5 26.4 92.8 26.1 93 C 25.9 93.2 25.6 93.3 25.3 93.5 C 25 93.6 24.7 93.7 24.4 93.8 C 24 93.9 23.6 93.9 23.3 93.8 C 22.9 93.7 22.5 93.5 22.2 93.4 C 21.9 93.2 21.7 92.9 21.5 92.7 C 21.3 92.4 21 92.2 20.9 91.9 C 20.8 91.7 20.7 91.3 20.7 91.1 C 20.8 90.8 21 90.5 21.2 90.3 C 21.4 90.1 21.8 90 22 89.9 C 22.3 89.7 22.6 89.6 23 89.5 C 23.3 89.5 23.8 89.4 24.1 89.5 C 24.5 89.6 24.9 89.8 25.2 90 C 25.5 90.2 25.7 90.4 25.9 90.7 C 26.1 90.9 26.3 91.1 26.5 91.4 C 26.6 91.7 26.7 92 26.6 92.3 Z', from: 2, to: 2 },
        { tone: 'wood-light', d: 'M 24.2 91.2 C 24.2 91.3 24.1 91.4 24 91.5 C 23.9 91.6 23.8 91.6 23.7 91.7 C 23.6 91.7 23.5 91.8 23.3 91.8 C 23.2 91.8 23 91.9 22.9 91.8 C 22.7 91.8 22.6 91.7 22.5 91.6 C 22.3 91.6 22.3 91.5 22.2 91.4 C 22.1 91.3 22 91.2 21.9 91.1 C 21.9 91 21.8 90.9 21.8 90.7 C 21.9 90.6 22 90.5 22.1 90.5 C 22.1 90.4 22.3 90.4 22.4 90.3 C 22.5 90.2 22.6 90.2 22.8 90.2 C 22.9 90.1 23.1 90.1 23.2 90.2 C 23.4 90.2 23.5 90.3 23.6 90.3 C 23.7 90.4 23.8 90.5 23.9 90.6 C 24 90.7 24.1 90.8 24.1 90.9 C 24.2 91 24.2 91.1 24.2 91.2 Z', from: 2, to: 2 },
        { tone: 'wood-dark', c: [25, 91.7, 0.4], from: 2, to: 2 },
        { tone: 'wood-dark', c: [23.2, 92.9, 0.3], from: 2, to: 2 },
        { tone: 'soil-deep', d: 'M 16 96 Q 21.3 91 30 91 Q 38.7 91 44 96 Z', from: 3, to: 3 },
        { tone: 'soil', d: 'M 17.7 96 Q 22.7 91.8 29.4 91.7 Q 34.2 92.1 38.4 96 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 28.9 89.4 Q 20.9 84.5 12.3 80.6 Q 20.4 85.5 28.9 89.4 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 24.8 87.2 Q 27.3 84.1 24.7 80.4 Q 23 84.1 24.8 87.2 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 24.8 87.2 Q 20.8 86.9 19.1 91 Q 23.2 90.5 24.8 87.2 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 19.6 84.5 Q 21.8 81.7 19.5 78.5 Q 18 81.8 19.6 84.5 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 19.6 84.5 Q 16.1 84.1 14.6 87.7 Q 18.2 87.3 19.6 84.5 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 14.4 81.7 Q 16.2 79.4 14.3 76.7 Q 13.1 79.4 14.4 81.7 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 14.4 81.7 Q 11.5 81.4 10.2 84.5 Q 13.2 84.1 14.4 81.7 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 15.2 82.1 Q 13.5 78.3 8.8 78.7 Q 11.3 82.3 15.2 82.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31 87.5 Q 39.1 83.8 46.8 79.1 Q 38.6 82.8 31 87.5 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 34.9 85.4 Q 36.1 89 40.4 88.9 Q 38.4 85.6 34.9 85.4 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 34.9 85.4 Q 37.4 82.4 35 78.9 Q 33.3 82.4 34.9 85.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 39.9 82.8 Q 40.9 85.9 44.6 85.8 Q 42.8 82.9 39.9 82.8 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 39.9 82.8 Q 42 80.2 39.9 77.1 Q 38.4 80.1 39.9 82.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 44.8 80.1 Q 45.7 82.8 48.8 82.7 Q 47.3 80.3 44.8 80.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 44.8 80.1 Q 46.6 78 44.9 75.4 Q 43.6 77.9 44.8 80.1 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 44.1 80.5 Q 48 81.2 50.1 77.3 Q 46 77.4 44.1 80.5 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 29.9 83 Q 29.8 75 28.5 67.1 Q 28.7 75.1 29.9 83 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.6 79 Q 33 79.3 34.4 75.8 Q 30.9 76.3 29.6 79 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.6 79 Q 28 76 24.2 76.7 Q 26.5 79.3 29.6 79 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.1 74 Q 32.1 74.3 33.3 71.2 Q 30.3 71.6 29.1 74 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.1 74 Q 27.8 71.4 24.5 72 Q 26.5 74.3 29.1 74 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 28.7 69.1 Q 31.2 69.3 32.2 66.7 Q 29.7 67 28.7 69.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28.7 69.1 Q 27.5 66.8 24.8 67.3 Q 26.4 69.3 28.7 69.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28.8 69.8 Q 30.7 66.8 28.2 63.7 Q 26.8 67.1 28.8 69.8 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 26.3 91.9 C 26.2 92.3 25.9 92.7 25.6 93 C 25.2 93.3 24.8 93.5 24.4 93.7 C 23.9 93.9 23.5 94.1 23 94.2 C 22.5 94.3 21.9 94.4 21.3 94.3 C 20.8 94.1 20.3 93.9 19.8 93.6 C 19.4 93.3 19.1 92.9 18.8 92.6 C 18.5 92.2 18.1 91.8 18 91.4 C 17.8 91 17.6 90.5 17.7 90.1 C 17.8 89.7 18.1 89.3 18.4 89 C 18.8 88.7 19.2 88.5 19.6 88.3 C 20.1 88.1 20.5 87.9 21 87.8 C 21.5 87.7 22.1 87.6 22.7 87.7 C 23.2 87.9 23.7 88.1 24.2 88.4 C 24.6 88.7 24.9 89.1 25.2 89.4 C 25.5 89.8 25.9 90.2 26 90.6 C 26.2 91 26.4 91.5 26.3 91.9 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 25.3 91.3 C 25.2 91.6 24.9 92 24.6 92.2 C 24.4 92.5 24 92.6 23.6 92.8 C 23.3 93 22.9 93.1 22.5 93.2 C 22 93.3 21.5 93.3 21.1 93.2 C 20.6 93.1 20.2 92.9 19.8 92.7 C 19.4 92.4 19.2 92.1 18.9 91.8 C 18.6 91.5 18.3 91.2 18.2 90.9 C 18 90.6 17.9 90.2 18 89.8 C 18 89.5 18.3 89.2 18.6 89 C 18.8 88.7 19.2 88.5 19.6 88.4 C 20 88.2 20.3 88 20.8 88 C 21.2 87.9 21.7 87.8 22.2 87.9 C 22.6 88 23.1 88.3 23.4 88.5 C 23.8 88.7 24.1 89 24.3 89.3 C 24.6 89.6 24.9 89.9 25 90.3 C 25.2 90.6 25.3 91 25.3 91.3 Z', from: 3, to: 3 },
        { tone: 'wood-light', d: 'M 22.3 90.1 C 22.3 90.2 22.1 90.3 22 90.4 C 21.9 90.5 21.8 90.5 21.6 90.6 C 21.5 90.7 21.3 90.7 21.2 90.8 C 21 90.8 20.8 90.8 20.6 90.8 C 20.4 90.8 20.2 90.7 20.1 90.6 C 19.9 90.5 19.8 90.3 19.7 90.2 C 19.6 90.1 19.5 90 19.4 89.9 C 19.4 89.7 19.3 89.6 19.3 89.5 C 19.4 89.3 19.5 89.2 19.6 89.1 C 19.7 89 19.9 89 20 88.9 C 20.2 88.8 20.3 88.8 20.5 88.7 C 20.6 88.7 20.8 88.7 21 88.7 C 21.2 88.8 21.4 88.9 21.5 88.9 C 21.7 89 21.8 89.2 21.9 89.3 C 22 89.4 22.1 89.5 22.2 89.6 C 22.2 89.8 22.3 89.9 22.3 90.1 Z', from: 3, to: 3 },
        { tone: 'wood-dark', c: [23.2, 90.6, 0.5], from: 3, to: 3 },
        { tone: 'wood-dark', c: [21, 92.1, 0.4], from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 41.8 90.8 C 41.9 91.2 41.8 91.6 41.7 92 C 41.6 92.4 41.3 92.8 41 93.1 C 40.8 93.5 40.5 93.8 40.2 94.1 C 39.8 94.4 39.4 94.7 38.9 94.9 C 38.4 95 37.9 95 37.4 95 C 36.9 94.9 36.5 94.8 36.1 94.6 C 35.7 94.5 35.3 94.3 35 94.1 C 34.7 93.8 34.3 93.5 34.2 93.2 C 34.1 92.8 34.2 92.4 34.3 92 C 34.4 91.6 34.7 91.2 35 90.9 C 35.2 90.5 35.5 90.2 35.8 89.9 C 36.2 89.6 36.6 89.3 37.1 89.1 C 37.6 89 38.1 89 38.6 89 C 39.1 89.1 39.5 89.2 39.9 89.4 C 40.3 89.5 40.7 89.7 41 89.9 C 41.3 90.2 41.7 90.5 41.8 90.8 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 40.9 90.6 C 40.9 90.9 40.9 91.3 40.8 91.6 C 40.7 91.9 40.4 92.2 40.2 92.5 C 40 92.8 39.8 93.1 39.5 93.3 C 39.2 93.6 38.8 93.8 38.4 94 C 38 94.1 37.5 94.1 37.1 94.1 C 36.7 94 36.4 93.9 36 93.8 C 35.7 93.7 35.3 93.6 35.1 93.4 C 34.8 93.2 34.5 92.9 34.4 92.6 C 34.4 92.3 34.4 92 34.5 91.6 C 34.6 91.3 34.9 91 35.1 90.7 C 35.3 90.5 35.5 90.2 35.8 89.9 C 36.1 89.7 36.5 89.4 36.9 89.3 C 37.3 89.2 37.8 89.2 38.2 89.2 C 38.6 89.2 38.9 89.3 39.3 89.4 C 39.6 89.6 40 89.7 40.2 89.9 C 40.5 90.1 40.8 90.3 40.9 90.6 Z', from: 3, to: 3 },
        { tone: 'wood-light', d: 'M 38.2 90.5 C 38.3 90.6 38.2 90.7 38.2 90.9 C 38.1 91 38 91.1 37.9 91.2 C 37.8 91.3 37.8 91.4 37.6 91.5 C 37.5 91.6 37.4 91.7 37.2 91.8 C 37.1 91.8 36.9 91.8 36.7 91.8 C 36.5 91.8 36.4 91.8 36.3 91.7 C 36.1 91.7 36 91.6 35.9 91.6 C 35.8 91.5 35.7 91.4 35.6 91.3 C 35.6 91.2 35.6 91 35.7 90.9 C 35.7 90.8 35.8 90.7 35.9 90.5 C 36 90.4 36.1 90.3 36.2 90.2 C 36.3 90.1 36.5 90 36.6 90 C 36.8 89.9 37 89.9 37.1 89.9 C 37.3 89.9 37.4 90 37.6 90 C 37.7 90.1 37.9 90.1 38 90.2 C 38.1 90.3 38.2 90.4 38.2 90.5 Z', from: 3, to: 3 },
        { tone: 'wood-dark', c: [39.1, 91.6, 0.5], from: 3, to: 3 },
        { tone: 'wood-dark', c: [37.1, 93, 0.4], from: 3, to: 3 },
        { tone: 'soil-deep', d: 'M 14 96 Q 20.1 90 30 90 Q 39.9 90 46 96 Z', from: 4, to: 4 },
        { tone: 'soil', d: 'M 15.9 96 Q 21.7 91 29.4 90.8 Q 34.8 91.3 39.6 96 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 28.8 89.3 Q 20 83.1 10.5 77.8 Q 19.4 84 28.8 89.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 25.6 87.2 Q 28.8 83.7 26 79.1 Q 23.6 83.4 25.6 87.2 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 25.6 87.2 Q 20.9 86.4 18.5 91.2 Q 23.3 90.9 25.6 87.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 21.1 84.5 Q 24 81.3 21.5 77.2 Q 19.4 81 21.1 84.5 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 21.1 84.5 Q 16.9 83.8 14.8 88 Q 19.1 87.8 21.1 84.5 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 16.7 81.7 Q 19.3 78.8 17.1 75.2 Q 15.2 78.6 16.7 81.7 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 16.7 81.7 Q 12.9 81.1 11 84.9 Q 14.9 84.6 16.7 81.7 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 12.3 78.9 Q 14.5 76.4 12.6 73.2 Q 10.9 76.2 12.3 78.9 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 12.3 78.9 Q 9 78.4 7.3 81.7 Q 10.7 81.5 12.3 78.9 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 13.6 79.8 Q 12 75.2 6.6 75.4 Q 9.2 79.7 13.6 79.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.1 87.3 Q 40.2 82.3 48.7 76.3 Q 39.6 81.4 31.1 87.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34.2 85.4 Q 36 89.6 41 89.1 Q 38.4 85.3 34.2 85.4 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 34.2 85.4 Q 36.9 81.6 33.8 77.6 Q 32 81.9 34.2 85.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 38.5 82.7 Q 40 86.5 44.6 86.1 Q 42.2 82.7 38.5 82.7 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 38.5 82.7 Q 40.9 79.3 38.1 75.7 Q 36.5 79.6 38.5 82.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 42.7 80.1 Q 44.1 83.4 48.1 83.1 Q 46 80 42.7 80.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 42.7 80.1 Q 44.8 77.1 42.4 73.9 Q 40.9 77.3 42.7 80.1 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 47 77.4 Q 48.2 80.4 51.7 80.1 Q 49.8 77.4 47 77.4 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 47 77.4 Q 48.8 74.8 46.7 72 Q 45.4 75 47 77.4 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 45.7 78.2 Q 50.3 78.7 52.4 74 Q 47.6 74.4 45.7 78.2 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 29.8 80.8 Q 28.3 71.5 25.8 62.4 Q 27.3 71.7 29.8 80.8 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.1 77.6 Q 33.2 77.4 34.4 72.9 Q 30.3 74 29.1 77.6 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.1 77.6 Q 26.7 74.1 22.3 75.5 Q 25.4 78.4 29.1 77.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 28.1 73.1 Q 31.8 73 32.9 69 Q 29.2 69.9 28.1 73.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 28.1 73.1 Q 26 70 22 71.3 Q 24.8 73.9 28.1 73.1 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 27.2 68.7 Q 30.5 68.5 31.4 65 Q 28.2 65.8 27.2 68.7 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 27.2 68.7 Q 25.3 65.9 21.8 67 Q 24.3 69.3 27.2 68.7 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 26.2 64.2 Q 29.1 64.1 30 61 Q 27.1 61.7 26.2 64.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 26.2 64.2 Q 24.6 61.8 21.5 62.8 Q 23.7 64.8 26.2 64.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 26.5 65.6 Q 28.4 61.8 25 58.5 Q 23.9 62.7 26.5 65.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 78.9 Q 34.3 70.9 37.1 62.4 Q 33.3 70.5 30.4 78.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.6 76 Q 35 78.1 38.3 75.2 Q 34.5 73.9 31.6 76 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.6 76 Q 31.6 72 27.4 70.8 Q 28.3 74.7 31.6 76 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33.2 72 Q 36.3 73.9 39.2 71.3 Q 35.8 70.1 33.2 72 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 33.2 72 Q 33.2 68.4 29.4 67.3 Q 30.3 70.8 33.2 72 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34.9 68 Q 37.5 69.7 40.2 67.4 Q 37.1 66.3 34.9 68 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 34.9 68 Q 34.8 64.8 31.5 63.8 Q 32.2 67 34.9 68 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 36.5 64 Q 38.8 65.4 41.1 63.4 Q 38.5 62.5 36.5 64 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 36.5 64 Q 36.4 61.2 33.5 60.3 Q 34.2 63.1 36.5 64 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 36 65.2 Q 39.4 63.2 38.5 58.9 Q 35.4 61.6 36 65.2 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 24.9 91 C 24.8 91.4 24.4 91.9 24.1 92.2 C 23.7 92.6 23.2 92.8 22.7 93.1 C 22.2 93.3 21.7 93.6 21.1 93.7 C 20.6 93.8 19.8 93.8 19.2 93.7 C 18.6 93.6 18 93.3 17.5 92.9 C 17 92.6 16.7 92.2 16.3 91.8 C 16 91.4 15.6 90.9 15.4 90.5 C 15.2 90 15 89.5 15.1 89 C 15.2 88.6 15.6 88.1 15.9 87.8 C 16.3 87.4 16.8 87.2 17.3 86.9 C 17.8 86.7 18.3 86.4 18.9 86.3 C 19.4 86.2 20.2 86.2 20.8 86.3 C 21.4 86.4 22 86.7 22.5 87.1 C 23 87.4 23.3 87.8 23.7 88.2 C 24 88.6 24.4 89.1 24.6 89.5 C 24.8 90 25 90.5 24.9 91 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 23.7 90.4 C 23.6 90.7 23.3 91.1 23 91.4 C 22.7 91.7 22.3 91.9 21.9 92.1 C 21.5 92.2 21 92.4 20.5 92.5 C 20.1 92.6 19.5 92.7 18.9 92.6 C 18.4 92.5 17.9 92.2 17.5 91.9 C 17.1 91.6 16.8 91.3 16.4 91 C 16.1 90.6 15.8 90.3 15.6 89.9 C 15.5 89.5 15.3 89.1 15.4 88.7 C 15.5 88.3 15.8 87.9 16.1 87.7 C 16.4 87.4 16.8 87.2 17.2 87 C 17.7 86.8 18.1 86.6 18.6 86.5 C 19.1 86.4 19.7 86.4 20.2 86.5 C 20.7 86.6 21.2 86.9 21.6 87.1 C 22.1 87.4 22.4 87.8 22.7 88.1 C 23 88.4 23.3 88.8 23.5 89.2 C 23.7 89.5 23.8 90 23.7 90.4 Z', from: 4, to: 4 },
        { tone: 'wood-light', d: 'M 20.3 88.9 C 20.3 89.1 20.2 89.2 20 89.3 C 19.9 89.4 19.7 89.5 19.6 89.6 C 19.4 89.6 19.2 89.7 19 89.7 C 18.8 89.8 18.6 89.8 18.4 89.8 C 18.2 89.7 18 89.6 17.8 89.5 C 17.7 89.4 17.5 89.2 17.4 89.1 C 17.3 89 17.2 88.9 17.1 88.7 C 17 88.6 16.9 88.4 17 88.2 C 17 88.1 17.1 87.9 17.3 87.8 C 17.4 87.7 17.6 87.7 17.7 87.6 C 17.9 87.5 18 87.4 18.2 87.4 C 18.4 87.4 18.7 87.3 18.9 87.4 C 19.1 87.4 19.3 87.5 19.5 87.7 C 19.6 87.8 19.7 87.9 19.9 88 C 20 88.2 20.1 88.3 20.2 88.4 C 20.3 88.6 20.4 88.8 20.3 88.9 Z', from: 4, to: 4 },
        { tone: 'wood-dark', c: [21.3, 89.5, 0.6], from: 4, to: 4 },
        { tone: 'wood-dark', c: [18.8, 91.2, 0.5], from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 43.4 89.6 C 43.5 90.1 43.4 90.6 43.3 91 C 43.1 91.5 42.8 91.9 42.5 92.3 C 42.2 92.7 41.9 93.1 41.5 93.5 C 41.1 93.8 40.6 94.2 40 94.3 C 39.5 94.5 38.8 94.5 38.3 94.4 C 37.8 94.4 37.3 94.2 36.8 94.1 C 36.3 93.9 35.9 93.7 35.5 93.4 C 35.1 93.1 34.8 92.8 34.6 92.4 C 34.5 91.9 34.6 91.4 34.7 91 C 34.9 90.5 35.2 90.1 35.5 89.7 C 35.8 89.3 36.1 88.9 36.5 88.5 C 36.9 88.2 37.4 87.8 38 87.7 C 38.5 87.5 39.2 87.5 39.7 87.6 C 40.2 87.6 40.7 87.8 41.2 87.9 C 41.7 88.1 42.1 88.3 42.5 88.6 C 42.9 88.9 43.2 89.2 43.4 89.6 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 42.3 89.4 C 42.4 89.7 42.3 90.2 42.2 90.5 C 42.1 90.9 41.8 91.2 41.6 91.6 C 41.3 91.9 41.1 92.3 40.7 92.5 C 40.4 92.8 39.9 93.1 39.4 93.3 C 39 93.4 38.4 93.4 38 93.4 C 37.5 93.4 37.1 93.2 36.7 93.1 C 36.3 92.9 35.9 92.8 35.6 92.6 C 35.3 92.4 35 92 34.9 91.7 C 34.8 91.4 34.9 90.9 35 90.6 C 35.1 90.2 35.4 89.9 35.6 89.5 C 35.9 89.2 36.1 88.9 36.5 88.6 C 36.8 88.3 37.3 88 37.8 87.9 C 38.2 87.7 38.8 87.7 39.2 87.7 C 39.7 87.8 40.1 87.9 40.5 88 C 40.9 88.2 41.3 88.3 41.6 88.5 C 41.9 88.8 42.2 89.1 42.3 89.4 Z', from: 4, to: 4 },
        { tone: 'wood-light', d: 'M 39.3 89.2 C 39.3 89.4 39.3 89.5 39.2 89.7 C 39.1 89.8 39 89.9 38.9 90.1 C 38.8 90.2 38.7 90.3 38.6 90.5 C 38.5 90.6 38.3 90.7 38.1 90.8 C 37.9 90.8 37.7 90.8 37.5 90.8 C 37.3 90.8 37.2 90.7 37 90.7 C 36.8 90.6 36.7 90.6 36.6 90.5 C 36.4 90.4 36.3 90.3 36.3 90.2 C 36.2 90 36.3 89.9 36.3 89.7 C 36.4 89.6 36.5 89.4 36.6 89.3 C 36.7 89.2 36.8 89 36.9 88.9 C 37.1 88.8 37.2 88.7 37.4 88.6 C 37.6 88.6 37.8 88.6 38 88.6 C 38.2 88.6 38.3 88.7 38.5 88.7 C 38.7 88.8 38.8 88.8 39 88.9 C 39.1 89 39.2 89.1 39.3 89.2 Z', from: 4, to: 4 },
        { tone: 'wood-dark', c: [40.2, 90.6, 0.5], from: 4, to: 4 },
        { tone: 'wood-dark', c: [37.9, 92.1, 0.4], from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 34.1 93 C 34.1 93.4 33.8 93.8 33.6 94.1 C 33.3 94.4 32.9 94.7 32.5 94.9 C 32.1 95.2 31.7 95.4 31.2 95.5 C 30.8 95.7 30.2 95.8 29.7 95.7 C 29.2 95.7 28.6 95.5 28.2 95.2 C 27.8 95 27.4 94.7 27.1 94.4 C 26.8 94.1 26.4 93.8 26.2 93.4 C 26 93 25.8 92.6 25.9 92.2 C 25.9 91.8 26.2 91.4 26.4 91.1 C 26.7 90.8 27.1 90.5 27.5 90.3 C 27.9 90 28.3 89.8 28.8 89.7 C 29.2 89.5 29.8 89.4 30.3 89.5 C 30.8 89.5 31.4 89.7 31.8 90 C 32.2 90.2 32.6 90.5 32.9 90.8 C 33.2 91.1 33.6 91.4 33.8 91.8 C 34 92.2 34.2 92.6 34.1 93 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 33.2 92.6 C 33.1 92.9 32.9 93.2 32.7 93.5 C 32.4 93.7 32.1 93.9 31.8 94.1 C 31.4 94.3 31.1 94.5 30.7 94.6 C 30.3 94.7 29.8 94.8 29.4 94.8 C 28.9 94.7 28.5 94.5 28.1 94.4 C 27.7 94.2 27.5 93.9 27.2 93.6 C 26.9 93.4 26.6 93.1 26.4 92.8 C 26.2 92.5 26.1 92.2 26.1 91.9 C 26.1 91.5 26.4 91.2 26.6 90.9 C 26.8 90.7 27.2 90.5 27.5 90.3 C 27.8 90.1 28.2 89.9 28.6 89.8 C 29 89.7 29.5 89.6 29.9 89.6 C 30.3 89.7 30.8 89.9 31.2 90.1 C 31.5 90.2 31.8 90.5 32.1 90.8 C 32.4 91 32.7 91.3 32.9 91.6 C 33 91.9 33.2 92.2 33.2 92.6 Z', from: 4, to: 4 },
        { tone: 'wood-light', d: 'M 30.3 91.6 C 30.3 91.7 30.2 91.8 30.1 91.9 C 30 92 29.8 92.1 29.7 92.1 C 29.6 92.2 29.5 92.3 29.3 92.3 C 29.1 92.4 28.9 92.4 28.8 92.4 C 28.6 92.4 28.4 92.3 28.3 92.2 C 28.1 92.2 28 92.1 27.9 92 C 27.8 91.9 27.7 91.8 27.6 91.7 C 27.5 91.5 27.4 91.4 27.4 91.3 C 27.5 91.1 27.6 91 27.7 90.9 C 27.8 90.8 27.9 90.8 28 90.7 C 28.2 90.6 28.3 90.5 28.4 90.5 C 28.6 90.4 28.8 90.4 29 90.4 C 29.1 90.4 29.3 90.5 29.5 90.6 C 29.6 90.7 29.7 90.8 29.8 90.9 C 30 91 30.1 91.1 30.2 91.2 C 30.2 91.3 30.3 91.4 30.3 91.6 Z', from: 4, to: 4 },
        { tone: 'wood-dark', c: [31.1, 92.2, 0.5], from: 4, to: 4 },
        { tone: 'wood-dark', c: [29, 93.6, 0.4], from: 4, to: 4 },
        { tone: 'soil-deep', d: 'M 12 96 Q 18.8 89.5 30 89.5 Q 41.2 89.5 48 96 Z', from: 5 },
        { tone: 'soil', d: 'M 14.2 96 Q 20.6 90.5 29.3 90.4 Q 35.4 90.9 40.8 96 Z', from: 5 },
        { tone: 'stemshade', d: 'M 28.8 89.2 Q 19.3 82.1 9.3 76 Q 18.7 83 28.8 89.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 25.3 86.8 Q 28.9 83.1 26.1 78 Q 23.3 82.6 25.3 86.8 Z', from: 5 },
        { tone: 'stem', d: 'M 25.3 86.8 Q 20.2 85.8 17.4 90.9 Q 22.7 90.7 25.3 86.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 20.6 83.6 Q 23.8 80.3 21.3 75.7 Q 18.8 79.8 20.6 83.6 Z', from: 5 },
        { tone: 'stem', d: 'M 20.6 83.6 Q 16 82.7 13.5 87.3 Q 18.3 87.2 20.6 83.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 15.9 80.5 Q 18.7 77.5 16.5 73.4 Q 14.3 77.1 15.9 80.5 Z', from: 5 },
        { tone: 'stem', d: 'M 15.9 80.5 Q 11.8 79.6 9.6 83.7 Q 13.8 83.6 15.9 80.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 11.2 77.3 Q 13.7 74.7 11.7 71.1 Q 9.8 74.3 11.2 77.3 Z', from: 5 },
        { tone: 'stem', d: 'M 11.2 77.3 Q 7.6 76.6 5.7 80.1 Q 9.4 80 11.2 77.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 12.6 78.3 Q 11 73.2 5.1 73.2 Q 7.8 78 12.6 78.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31.2 87.2 Q 40.9 81.3 49.9 74.6 Q 40.2 80.4 31.2 87.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 34.5 84.9 Q 36.6 89.5 42.1 88.8 Q 39 84.7 34.5 84.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 34.5 84.9 Q 37.3 80.8 33.8 76.5 Q 32 81.3 34.5 84.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 39 81.9 Q 40.9 86 45.8 85.4 Q 43.1 81.7 39 81.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 39 81.9 Q 41.5 78.2 38.4 74.3 Q 36.7 78.6 39 81.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 43.6 78.8 Q 45.2 82.5 49.6 81.9 Q 47.2 78.7 43.6 78.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 43.6 78.8 Q 45.8 75.5 43 72.1 Q 41.5 75.9 43.6 78.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 48.1 75.8 Q 49.5 79 53.4 78.5 Q 51.2 75.7 48.1 75.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 48.1 75.8 Q 50 72.9 47.6 69.9 Q 46.3 73.2 48.1 75.8 Z', from: 5 },
        { tone: 'stem', d: 'M 46.7 76.7 Q 51.8 77.1 53.9 71.9 Q 48.7 72.5 46.7 76.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 29.6 78.7 Q 27.3 68.6 23.9 58.9 Q 26.3 68.9 29.6 78.7 Z', from: 5 },
        { tone: 'stem', d: 'M 28.2 73.8 Q 32.6 73.3 33.6 68.5 Q 29.3 69.9 28.2 73.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 28.2 73.8 Q 25.5 70.3 20.9 72.1 Q 24.4 74.9 28.2 73.8 Z', from: 5 },
        { tone: 'stem', d: 'M 26.4 67.6 Q 30.3 67.1 31.1 63 Q 27.4 64.2 26.4 67.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 26.4 67.6 Q 24 64.6 20.1 66.1 Q 23.1 68.6 26.4 67.6 Z', from: 5 },
        { tone: 'stem', d: 'M 24.6 61.3 Q 27.9 61 28.6 57.4 Q 25.4 58.5 24.6 61.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 24.6 61.3 Q 22.6 58.8 19.3 60.1 Q 21.8 62.2 24.6 61.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 24.9 62.2 Q 26.7 57.9 22.7 54.6 Q 21.8 59.3 24.9 62.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.6 76.9 Q 35.4 68.2 39.2 59.1 Q 34.4 67.8 30.6 76.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 32.7 72.4 Q 36.1 74.9 39.9 72.1 Q 35.9 70.4 32.7 72.4 Z', from: 5 },
        { tone: 'stemlight', d: 'M 32.7 72.4 Q 33 68.2 28.6 66.6 Q 29.3 70.8 32.7 72.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 35.4 66.9 Q 38.4 69 41.6 66.6 Q 38.2 65.1 35.4 66.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 35.4 66.9 Q 35.6 63.2 31.8 61.8 Q 32.4 65.5 35.4 66.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 38.1 61.3 Q 40.6 63.2 43.4 61.1 Q 40.5 59.8 38.1 61.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 38.1 61.3 Q 38.3 58.2 35.1 57 Q 35.6 60.2 38.1 61.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 37.7 62.1 Q 41.7 60.2 41 55.4 Q 37.4 58.1 37.7 62.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 70.9 Q 30.9 62 30.7 53 Q 29.8 61.9 30 70.9 Z', from: 5 },
        { tone: 'stem', d: 'M 30.2 66.4 Q 33.9 67.2 36 63.5 Q 32.1 63.5 30.2 66.4 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.2 66.4 Q 28.9 62.8 24.6 63.1 Q 26.7 66.4 30.2 66.4 Z', from: 5 },
        { tone: 'stem', d: 'M 30.4 60.8 Q 33.6 61.5 35.4 58.3 Q 32 58.3 30.4 60.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.4 60.8 Q 29.2 57.7 25.5 57.9 Q 27.4 60.8 30.4 60.8 Z', from: 5 },
        { tone: 'stem', d: 'M 30.6 55.2 Q 33.3 55.8 34.8 53.1 Q 32 53.1 30.6 55.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.6 55.2 Q 29.6 52.6 26.5 52.8 Q 28.1 55.2 30.6 55.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 30.6 56 Q 33.1 53 30.8 49.2 Q 28.8 52.8 30.6 56 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 23.3 91.1 C 23.2 91.6 22.8 92.1 22.4 92.4 C 22 92.8 21.5 93.1 20.9 93.3 C 20.4 93.6 19.8 93.9 19.2 94 C 18.6 94.1 17.8 94.2 17.2 94 C 16.5 93.9 15.9 93.5 15.3 93.2 C 14.8 92.8 14.4 92.4 14 91.9 C 13.6 91.5 13.2 91 13 90.5 C 12.8 90 12.6 89.4 12.7 88.9 C 12.8 88.4 13.2 87.9 13.6 87.6 C 14 87.2 14.5 86.9 15.1 86.7 C 15.6 86.4 16.2 86.1 16.8 86 C 17.4 85.9 18.2 85.8 18.8 86 C 19.5 86.1 20.1 86.5 20.7 86.8 C 21.2 87.2 21.6 87.6 22 88.1 C 22.4 88.5 22.8 89 23 89.5 C 23.2 90 23.4 90.6 23.3 91.1 Z', from: 5 },
        { tone: 'wood', d: 'M 22 90.4 C 21.9 90.8 21.6 91.2 21.3 91.5 C 20.9 91.8 20.5 92 20 92.2 C 19.6 92.4 19.1 92.6 18.6 92.7 C 18.1 92.8 17.4 92.9 16.9 92.8 C 16.3 92.7 15.7 92.4 15.3 92.1 C 14.8 91.8 14.5 91.4 14.1 91 C 13.8 90.7 13.5 90.3 13.3 89.9 C 13.1 89.5 12.9 89 13 88.6 C 13.1 88.2 13.4 87.8 13.8 87.5 C 14.1 87.2 14.6 87 15 86.7 C 15.5 86.5 15.9 86.3 16.5 86.2 C 17 86.1 17.6 86.1 18.2 86.2 C 18.7 86.3 19.3 86.6 19.8 86.9 C 20.2 87.2 20.6 87.6 20.9 87.9 C 21.2 88.3 21.6 88.7 21.8 89.1 C 22 89.5 22.1 90 22 90.4 Z', from: 5 },
        { tone: 'wood-light', d: 'M 18.3 88.8 C 18.3 89 18.2 89.1 18 89.2 C 17.9 89.4 17.7 89.4 17.5 89.5 C 17.3 89.6 17.2 89.7 17 89.7 C 16.8 89.8 16.5 89.8 16.3 89.7 C 16 89.7 15.8 89.6 15.6 89.5 C 15.5 89.3 15.3 89.2 15.2 89 C 15.1 88.9 14.9 88.8 14.8 88.6 C 14.8 88.4 14.7 88.2 14.7 88.1 C 14.7 87.9 14.9 87.8 15 87.7 C 15.2 87.5 15.4 87.5 15.5 87.4 C 15.7 87.3 15.9 87.2 16.1 87.2 C 16.3 87.2 16.6 87.1 16.8 87.2 C 17 87.2 17.2 87.3 17.4 87.5 C 17.6 87.6 17.7 87.7 17.9 87.9 C 18 88 18.1 88.2 18.2 88.3 C 18.3 88.5 18.4 88.7 18.3 88.8 Z', from: 5 },
        { tone: 'wood-dark', c: [19.5, 89.5, 0.6], from: 5 },
        { tone: 'wood-dark', c: [16.8, 91.4, 0.5], from: 5 },
        { tone: 'wood-dark', d: 'M 45.8 89.5 C 45.9 90 45.8 90.5 45.6 91 C 45.5 91.5 45.2 92 44.8 92.4 C 44.5 92.8 44.2 93.3 43.8 93.7 C 43.3 94 42.7 94.4 42.1 94.6 C 41.5 94.8 40.8 94.8 40.2 94.8 C 39.7 94.7 39.1 94.5 38.6 94.3 C 38.1 94.1 37.6 94 37.2 93.6 C 36.8 93.3 36.4 92.9 36.2 92.5 C 36.1 92 36.2 91.5 36.4 91 C 36.5 90.5 36.8 90 37.2 89.6 C 37.5 89.2 37.8 88.7 38.2 88.3 C 38.7 88 39.3 87.6 39.9 87.4 C 40.5 87.2 41.2 87.2 41.8 87.2 C 42.3 87.3 42.9 87.5 43.4 87.7 C 43.9 87.9 44.4 88 44.8 88.4 C 45.2 88.7 45.6 89.1 45.8 89.5 Z', from: 5 },
        { tone: 'wood', d: 'M 44.6 89.3 C 44.7 89.6 44.6 90.1 44.5 90.5 C 44.4 90.9 44.1 91.3 43.8 91.6 C 43.5 92 43.3 92.4 42.9 92.7 C 42.5 93 42 93.3 41.5 93.5 C 41 93.6 40.4 93.6 39.9 93.6 C 39.4 93.6 38.9 93.4 38.5 93.3 C 38.1 93.1 37.6 93 37.3 92.7 C 37 92.5 36.6 92.1 36.5 91.8 C 36.4 91.4 36.5 90.9 36.6 90.6 C 36.8 90.2 37 89.8 37.3 89.4 C 37.6 89 37.9 88.7 38.3 88.4 C 38.6 88.1 39.1 87.7 39.6 87.6 C 40.1 87.4 40.7 87.4 41.2 87.4 C 41.7 87.5 42.2 87.6 42.6 87.8 C 43 87.9 43.5 88.1 43.8 88.3 C 44.2 88.6 44.5 88.9 44.6 89.3 Z', from: 5 },
        { tone: 'wood-light', d: 'M 41.3 89.1 C 41.3 89.2 41.3 89.4 41.2 89.6 C 41.2 89.7 41 89.8 40.9 90 C 40.8 90.1 40.7 90.3 40.6 90.4 C 40.4 90.5 40.2 90.7 40 90.7 C 39.8 90.8 39.6 90.8 39.4 90.8 C 39.2 90.8 39 90.7 38.8 90.6 C 38.7 90.6 38.5 90.5 38.3 90.4 C 38.2 90.3 38 90.2 38 90.1 C 38 89.9 38 89.8 38.1 89.6 C 38.1 89.4 38.3 89.3 38.4 89.2 C 38.5 89 38.6 88.9 38.7 88.7 C 38.9 88.6 39.1 88.5 39.3 88.4 C 39.5 88.4 39.7 88.4 39.9 88.4 C 40.1 88.4 40.3 88.5 40.5 88.5 C 40.6 88.6 40.8 88.6 41 88.7 C 41.1 88.8 41.2 88.9 41.3 89.1 Z', from: 5 },
        { tone: 'wood-dark', c: [42.3, 90.5, 0.6], from: 5 },
        { tone: 'wood-dark', c: [39.8, 92.2, 0.5], from: 5 },
        { tone: 'wood-dark', d: 'M 34.6 92.9 C 34.5 93.3 34.2 93.7 33.9 94.1 C 33.6 94.4 33.2 94.7 32.7 95 C 32.3 95.2 31.9 95.5 31.4 95.6 C 30.9 95.8 30.2 95.9 29.7 95.9 C 29.1 95.8 28.5 95.6 28 95.3 C 27.5 95.1 27.2 94.7 26.8 94.4 C 26.4 94 26.1 93.7 25.8 93.3 C 25.6 92.9 25.4 92.4 25.4 91.9 C 25.5 91.5 25.8 91.1 26.1 90.7 C 26.4 90.4 26.8 90.1 27.3 89.8 C 27.7 89.6 28.1 89.3 28.6 89.2 C 29.1 89 29.8 88.9 30.3 88.9 C 30.9 89 31.5 89.2 32 89.5 C 32.5 89.7 32.8 90.1 33.2 90.4 C 33.6 90.8 33.9 91.1 34.2 91.5 C 34.4 91.9 34.6 92.4 34.6 92.9 Z', from: 5 },
        { tone: 'wood', d: 'M 33.5 92.4 C 33.4 92.7 33.2 93.1 32.9 93.3 C 32.7 93.6 32.3 93.8 31.9 94.1 C 31.6 94.3 31.2 94.5 30.8 94.6 C 30.3 94.7 29.8 94.8 29.3 94.8 C 28.8 94.7 28.3 94.5 27.9 94.3 C 27.5 94.1 27.2 93.8 26.9 93.6 C 26.6 93.3 26.2 93 26.1 92.7 C 25.9 92.3 25.7 91.9 25.7 91.6 C 25.8 91.2 26 90.9 26.3 90.6 C 26.5 90.3 26.9 90.1 27.3 89.9 C 27.6 89.7 28 89.4 28.4 89.3 C 28.9 89.2 29.4 89.1 29.9 89.1 C 30.4 89.2 30.9 89.4 31.3 89.6 C 31.7 89.8 32 90.1 32.3 90.4 C 32.6 90.7 32.9 90.9 33.1 91.3 C 33.3 91.6 33.5 92 33.5 92.4 Z', from: 5 },
        { tone: 'wood-light', d: 'M 30.3 91.3 C 30.3 91.4 30.2 91.5 30.1 91.6 C 30 91.7 29.8 91.8 29.7 91.9 C 29.5 92 29.4 92.1 29.2 92.1 C 29.1 92.2 28.8 92.2 28.6 92.2 C 28.5 92.2 28.2 92.1 28.1 92 C 27.9 91.9 27.8 91.8 27.7 91.7 C 27.6 91.6 27.4 91.5 27.3 91.4 C 27.3 91.2 27.2 91.1 27.2 90.9 C 27.2 90.8 27.3 90.7 27.4 90.6 C 27.5 90.4 27.7 90.4 27.8 90.3 C 28 90.2 28.1 90.1 28.3 90.1 C 28.5 90 28.7 90 28.9 90 C 29.1 90 29.3 90.1 29.4 90.2 C 29.6 90.3 29.7 90.4 29.8 90.5 C 30 90.6 30.1 90.7 30.2 90.8 C 30.3 91 30.3 91.1 30.3 91.3 Z', from: 5 },
        { tone: 'wood-dark', c: [31.2, 92, 0.5], from: 5 },
        { tone: 'wood-dark', c: [28.9, 93.5, 0.4], from: 5 }
      ]
    },
    rice: {
      trunk: 'M 28.5 96 Q 29.3 94 28.8 92 L 31.2 92 Q 30.8 94 31.5 96 Z',
      trunkShort: 'M 28.7 96 Q 29.4 94.8 28.9 93.5 L 31.1 93.5 Q 30.7 94.8 31.3 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[42, 48], [19, 52], [35, 36], [25, 40], [30, 50], [46, 44], [16, 48], [30, 62], [30, 32]],
      parts: [
        { tone: 'stemlight', d: 'M 30.8 92.7 C 29.7 92.1 26.4 89.6 24.1 89 C 21.8 88.5 18.3 89.3 17.1 89.3 L 17.1 90.2 C 18.2 90.3 21.5 90.1 23.5 90.9 C 25.5 91.7 28.2 94.5 29.2 95.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.2 93.7 C 29.1 93 26 90.4 23.9 89.7 C 21.7 89.1 18.2 89.7 17.1 89.7 L 17.1 89.9 C 18.2 89.9 21.6 89.5 23.7 90.2 C 25.8 90.9 28.8 93.6 29.8 94.3 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 31.3 93.3 C 30.4 91.9 27.9 86.7 26.1 84.7 C 24.3 82.7 21.4 81.9 20.5 81.3 L 20 82.1 C 20.8 82.7 23.1 83.8 24.5 85.9 C 26 88 28 93.3 28.7 94.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.3 93.8 C 29.5 92.4 27.2 87.2 25.5 85.2 C 23.8 83.1 21.2 82.2 20.3 81.6 L 20.2 81.8 C 21 82.4 23.5 83.4 25.1 85.5 C 26.7 87.5 28.9 92.7 29.7 94.2 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 31.5 94 C 31.4 92.2 31.2 85.8 31 83.1 C 30.8 80.4 30.5 78.7 30.5 77.8 L 29.6 77.8 C 29.5 78.7 29.2 80.4 29 83.1 C 28.9 85.8 28.6 92.2 28.5 94 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.4 94 C 30.3 92.2 30.3 85.8 30.2 83.1 C 30.2 80.4 30.1 78.7 30.1 77.8 L 29.9 77.8 C 29.9 78.7 29.8 80.4 29.8 83.1 C 29.7 85.8 29.7 92.2 29.6 94 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 31.3 94.7 C 32 93.3 34 88 35.5 85.9 C 36.9 83.8 39.2 82.7 40 82.1 L 39.5 81.3 C 38.6 81.9 35.7 82.7 33.9 84.7 C 32.1 86.7 29.6 91.9 28.7 93.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.3 94.2 C 31.1 92.7 33.3 87.5 34.9 85.5 C 36.5 83.4 39 82.4 39.8 81.8 L 39.7 81.6 C 38.8 82.2 36.2 83.1 34.5 85.2 C 32.8 87.2 30.5 92.4 29.7 93.8 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 30.8 95.3 C 31.8 94.5 34.5 91.7 36.5 90.9 C 38.5 90.1 41.8 90.3 42.9 90.2 L 42.9 89.3 C 41.7 89.3 38.2 88.5 35.9 89 C 33.6 89.6 30.3 92.1 29.2 92.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.2 94.3 C 31.2 93.6 34.2 90.9 36.3 90.2 C 38.4 89.5 41.8 89.9 42.9 89.9 L 42.9 89.7 C 41.8 89.7 38.3 89.1 36.1 89.7 C 34 90.4 30.9 93 29.8 93.7 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 30.8 92.7 C 29.3 91.9 25 88.8 22 88 C 19 87.2 14.4 87.9 12.8 87.9 L 12.8 88.8 C 14.2 89 18.7 88.8 21.4 89.9 C 24.2 91 27.9 94.4 29.2 95.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 93.7 C 28.8 92.9 24.7 89.6 21.8 88.7 C 18.9 87.8 14.3 88.3 12.8 88.3 L 12.8 88.5 C 14.3 88.6 18.8 88.2 21.6 89.2 C 24.5 90.1 28.5 93.5 29.8 94.3 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 31.1 93 C 29.7 91.6 25.7 86.4 22.8 84.5 C 20 82.6 15.6 82.1 14.1 81.6 L 13.8 82.5 C 15.1 83.1 19.2 84 21.7 86.1 C 24.2 88.2 27.7 93.5 28.9 95 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.3 93.8 C 29 92.3 25.1 87.1 22.4 85.1 C 19.7 83.2 15.4 82.5 14 82 L 13.9 82.2 C 15.3 82.7 19.5 83.5 22.1 85.5 C 24.8 87.5 28.5 92.8 29.7 94.2 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 31.4 93.4 C 30.3 91.4 27.4 84.4 25.3 81.5 C 23.2 78.6 19.8 76.9 18.8 76 L 18.1 76.6 C 19.1 77.6 21.9 79.6 23.6 82.6 C 25.4 85.6 27.8 92.6 28.6 94.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.3 93.8 C 29.4 91.9 26.6 84.8 24.6 81.9 C 22.7 79 19.5 77.2 18.5 76.2 L 18.4 76.4 C 19.4 77.4 22.4 79.2 24.2 82.2 C 26.1 85.1 28.8 92.2 29.7 94.2 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 31.5 93.8 C 31.1 91.5 29.8 83.4 28.9 79.9 C 28 76.4 26.7 73.9 26.2 72.7 L 25.4 73 C 25.6 74.2 26.5 76.7 27 80.3 C 27.5 83.8 28.3 91.9 28.5 94.2 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.4 93.9 C 30 91.6 28.9 83.5 28.2 80 C 27.5 76.5 26.3 74 25.9 72.8 L 25.7 72.9 C 26 74.1 27.1 76.6 27.7 80.1 C 28.4 83.6 29.3 91.7 29.6 94.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 31.5 94.2 C 31.7 91.9 32.5 83.8 33 80.3 C 33.5 76.7 34.4 74.2 34.6 73 L 33.8 72.7 C 33.3 73.9 32 76.4 31.1 79.9 C 30.2 83.4 28.9 91.5 28.5 93.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.4 94.1 C 30.7 91.7 31.6 83.6 32.3 80.1 C 32.9 76.6 34 74.1 34.3 72.9 L 34.1 72.8 C 33.7 74 32.5 76.5 31.8 80 C 31.1 83.5 30 91.6 29.6 93.9 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 31.4 94.6 C 32.2 92.6 34.6 85.6 36.4 82.6 C 38.1 79.6 40.9 77.6 41.9 76.6 L 41.2 76 C 40.2 76.9 36.8 78.6 34.7 81.5 C 32.6 84.4 29.7 91.4 28.6 93.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.3 94.2 C 31.2 92.2 33.9 85.1 35.8 82.2 C 37.6 79.2 40.6 77.4 41.6 76.4 L 41.5 76.2 C 40.5 77.2 37.3 79 35.4 81.9 C 33.4 84.8 30.6 91.9 29.7 93.8 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 31.1 95 C 32.3 93.5 35.8 88.2 38.3 86.1 C 40.8 84 44.9 83.1 46.2 82.5 L 45.9 81.6 C 44.4 82.1 40 82.6 37.2 84.5 C 34.3 86.4 30.3 91.6 28.9 93 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.3 94.2 C 31.5 92.8 35.2 87.5 37.9 85.5 C 40.5 83.5 44.7 82.7 46.1 82.2 L 46 82 C 44.6 82.5 40.3 83.2 37.6 85.1 C 34.9 87.1 31 92.3 29.7 93.8 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 30.8 95.3 C 32.1 94.4 35.8 91 38.6 89.9 C 41.3 88.8 45.8 89 47.2 88.8 L 47.2 87.9 C 45.6 87.9 41 87.2 38 88 C 35 88.8 30.7 91.9 29.2 92.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.2 94.3 C 31.5 93.5 35.5 90.1 38.4 89.2 C 41.2 88.2 45.7 88.6 47.2 88.5 L 47.2 88.3 C 45.7 88.3 41.1 87.8 38.2 88.7 C 35.3 89.6 31.2 92.9 29.8 93.7 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 30.8 92.7 C 29 91.8 23.6 88 19.9 87 C 16.2 86 10.4 86.6 8.5 86.5 L 8.5 87.4 C 10.3 87.7 15.9 87.6 19.3 88.9 C 22.8 90.2 27.6 94.2 29.2 95.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 93.7 C 28.4 92.7 23.3 88.9 19.7 87.7 C 16.1 86.6 10.4 87 8.5 86.9 L 8.5 87.1 C 10.3 87.3 16 87 19.6 88.2 C 23.1 89.4 28.1 93.3 29.8 94.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31 92.9 C 29.2 91.4 24.1 85.9 20.4 83.9 C 16.8 82 11.1 81.5 9.2 81 L 8.9 81.9 C 10.7 82.5 16.1 83.4 19.4 85.6 C 22.8 87.8 27.4 93.5 29 95.1 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 93.7 C 28.5 92.2 23.6 86.6 20 84.6 C 16.5 82.5 10.9 81.9 9.1 81.4 L 9 81.6 C 10.8 82.1 16.3 82.9 19.8 85 C 23.2 87.1 28.1 92.7 29.8 94.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.2 93.1 C 29.7 91.1 25.1 83.9 21.9 80.9 C 18.6 78 13.6 76.5 11.9 75.6 L 11.4 76.4 C 13 77.4 17.6 79.3 20.5 82.3 C 23.4 85.4 27.4 92.8 28.8 94.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.3 93.8 C 28.8 91.7 24.4 84.5 21.3 81.5 C 18.2 78.5 13.3 76.8 11.7 75.9 L 11.6 76.1 C 13.2 77 18 78.8 21 81.8 C 24 84.8 28.3 92.1 29.7 94.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.4 93.4 C 30.2 90.9 26.7 82.2 24.3 78.5 C 21.8 74.7 17.9 72.2 16.7 71 L 16 71.6 C 17.1 72.9 20.5 75.6 22.6 79.5 C 24.7 83.3 27.6 92.1 28.6 94.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.3 93.9 C 29.2 91.4 25.9 82.6 23.6 78.8 C 21.3 75.1 17.6 72.5 16.4 71.2 L 16.3 71.4 C 17.4 72.7 21 75.3 23.2 79.1 C 25.5 82.9 28.6 91.6 29.7 94.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.5 93.7 C 30.8 90.9 28.8 81.2 27.4 76.9 C 26 72.6 23.8 69.4 23.1 67.9 L 22.3 68.3 C 22.8 69.8 24.5 73.1 25.5 77.4 C 26.6 81.7 28 91.5 28.5 94.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 93.9 C 29.7 91.1 28 81.4 26.7 77.1 C 25.4 72.8 23.5 69.6 22.8 68.1 L 22.6 68.2 C 23.2 69.7 25.1 72.9 26.3 77.2 C 27.4 81.5 29.1 91.3 29.6 94.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.5 94 C 31.4 91.1 31.2 81 31 76.5 C 30.8 72 30.5 68.6 30.5 67 L 29.6 67 C 29.5 68.6 29.2 72 29 76.5 C 28.9 81 28.6 91.1 28.5 94 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 94 C 30.3 91.1 30.3 81 30.2 76.5 C 30.2 72 30.1 68.6 30.1 67 L 29.9 67 C 29.9 68.6 29.8 72 29.8 76.5 C 29.7 81 29.7 91.1 29.6 94 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.5 94.3 C 32 91.5 33.4 81.7 34.5 77.4 C 35.5 73.1 37.2 69.8 37.7 68.3 L 36.9 67.9 C 36.2 69.4 34 72.6 32.6 76.9 C 31.2 81.2 29.2 90.9 28.5 93.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.4 94.1 C 30.9 91.3 32.6 81.5 33.7 77.2 C 34.9 72.9 36.8 69.7 37.4 68.2 L 37.2 68.1 C 36.5 69.6 34.6 72.8 33.3 77.1 C 32 81.4 30.3 91.1 29.6 93.9 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 31.4 94.6 C 32.4 92.1 35.3 83.3 37.4 79.5 C 39.5 75.6 42.9 72.9 44 71.6 L 43.3 71 C 42.1 72.2 38.2 74.7 35.7 78.5 C 33.3 82.2 29.8 90.9 28.6 93.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.3 94.1 C 31.4 91.6 34.5 82.9 36.8 79.1 C 39 75.3 42.6 72.7 43.7 71.4 L 43.6 71.2 C 42.4 72.5 38.7 75.1 36.4 78.8 C 34.1 82.6 30.8 91.4 29.7 93.9 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 31.2 94.9 C 32.6 92.8 36.6 85.4 39.5 82.3 C 42.4 79.3 47 77.4 48.6 76.4 L 48.1 75.6 C 46.4 76.5 41.4 78 38.1 80.9 C 34.9 83.9 30.3 91.1 28.8 93.1 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.3 94.2 C 31.7 92.1 36 84.8 39 81.8 C 42 78.8 46.8 77 48.4 76.1 L 48.3 75.9 C 46.7 76.8 41.8 78.5 38.7 81.5 C 35.6 84.5 31.2 91.7 29.7 93.8 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 31 95.1 C 32.6 93.5 37.2 87.8 40.6 85.6 C 43.9 83.4 49.3 82.5 51.1 81.9 L 50.8 81 C 48.9 81.5 43.2 82 39.6 83.9 C 35.9 85.9 30.8 91.4 29 92.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 94.3 C 31.9 92.7 36.8 87.1 40.2 85 C 43.7 82.9 49.2 82.1 51 81.6 L 50.9 81.4 C 49.1 81.9 43.5 82.5 40 84.6 C 36.4 86.6 31.5 92.2 29.8 93.7 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30.8 95.3 C 32.4 94.2 37.2 90.2 40.7 88.9 C 44.1 87.6 49.7 87.7 51.5 87.4 L 51.5 86.5 C 49.6 86.6 43.8 86 40.1 87 C 36.4 88 31 91.8 29.2 92.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.2 94.3 C 31.9 93.3 36.9 89.4 40.4 88.2 C 44 87 49.7 87.3 51.5 87.1 L 51.5 86.9 C 49.6 87 43.9 86.6 40.3 87.7 C 36.7 88.9 31.6 92.7 29.8 93.7 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 31 74.4 C 32 71.9 35.1 63.1 37.1 59.4 C 39.2 55.7 42.2 53.4 43.2 52.2 L 42.8 51.8 C 41.6 52.9 38.2 55 35.9 58.6 C 33.6 62.3 30.1 71.1 29 73.6 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 33.5 67 Q 32.7 67.4 32 67.9 L 31.6 67.4 Q 32.4 66.9 33.1 66.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 33.3 68.6 C 33.4 68.9 33.4 69.2 33.4 69.5 C 33.4 69.8 33.3 70 33.2 70.3 C 33.2 70.5 33.1 70.7 33 70.9 C 32.9 71.1 32.7 71.3 32.5 71.3 C 32.3 71.4 32.1 71.3 31.9 71.3 C 31.7 71.2 31.5 71 31.3 70.9 C 31.1 70.7 30.9 70.5 30.7 70.3 C 30.6 70.1 30.4 69.8 30.3 69.5 C 30.2 69.2 30.2 68.9 30.2 68.6 C 30.2 68.4 30.3 68.1 30.4 67.9 C 30.4 67.6 30.5 67.4 30.6 67.2 C 30.8 67 30.9 66.8 31.1 66.8 C 31.3 66.7 31.5 66.8 31.7 66.9 C 31.9 66.9 32.1 67.1 32.3 67.3 C 32.5 67.4 32.7 67.6 32.9 67.8 C 33 68 33.2 68.3 33.3 68.6 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 32.8 68.4 C 32.8 68.7 32.8 68.9 32.8 69.2 C 32.8 69.4 32.8 69.6 32.7 69.8 C 32.7 70 32.6 70.2 32.5 70.3 C 32.4 70.5 32.3 70.6 32.1 70.7 C 32 70.7 31.8 70.7 31.6 70.6 C 31.5 70.5 31.3 70.4 31.2 70.3 C 31 70.1 30.9 70 30.7 69.8 C 30.6 69.6 30.4 69.4 30.4 69.2 C 30.3 68.9 30.3 68.7 30.3 68.4 C 30.3 68.2 30.4 68 30.4 67.8 C 30.5 67.6 30.5 67.4 30.6 67.3 C 30.7 67.1 30.8 66.9 31 66.9 C 31.1 66.9 31.3 66.9 31.5 67 C 31.6 67 31.8 67.2 32 67.3 C 32.1 67.5 32.3 67.6 32.4 67.8 C 32.5 68 32.7 68.2 32.8 68.4 Z', from: 4, to: 4 },
        { tone: 'light', c: [31.4, 68.5, 0.6], from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 36.4 60.4 Q 37.1 61 37.9 61.5 L 37.5 62 Q 36.8 61.5 36 61 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 39.2 63.6 C 39.1 63.9 38.9 64.1 38.8 64.4 C 38.6 64.6 38.4 64.7 38.2 64.9 C 38 65.1 37.8 65.2 37.6 65.3 C 37.4 65.4 37.2 65.5 37 65.4 C 36.8 65.3 36.6 65.2 36.5 65 C 36.4 64.8 36.3 64.5 36.3 64.3 C 36.2 64.1 36.1 63.8 36.1 63.5 C 36.1 63.3 36.1 62.9 36.2 62.7 C 36.3 62.4 36.5 62.1 36.6 61.9 C 36.8 61.6 37 61.5 37.2 61.3 C 37.4 61.2 37.6 61 37.8 60.9 C 38 60.8 38.2 60.8 38.4 60.8 C 38.6 60.9 38.8 61.1 38.9 61.3 C 39 61.4 39.1 61.7 39.1 61.9 C 39.2 62.2 39.3 62.4 39.3 62.7 C 39.3 63 39.3 63.3 39.2 63.6 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 38.7 63.2 C 38.6 63.4 38.4 63.7 38.3 63.9 C 38.2 64.1 38 64.2 37.9 64.3 C 37.7 64.5 37.5 64.6 37.4 64.7 C 37.2 64.7 37 64.8 36.9 64.7 C 36.7 64.7 36.6 64.5 36.5 64.4 C 36.4 64.2 36.4 64 36.3 63.8 C 36.2 63.6 36.2 63.4 36.2 63.2 C 36.2 63 36.2 62.7 36.3 62.5 C 36.3 62.2 36.5 62 36.6 61.8 C 36.7 61.6 36.9 61.5 37.1 61.4 C 37.2 61.2 37.4 61.1 37.5 61 C 37.7 61 37.9 60.9 38 61 C 38.2 61 38.3 61.2 38.4 61.3 C 38.5 61.5 38.6 61.7 38.6 61.9 C 38.7 62.1 38.7 62.3 38.7 62.5 C 38.7 62.7 38.7 63 38.7 63.2 Z', from: 4, to: 4 },
        { tone: 'light', c: [37.3, 62.5, 0.6], from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 38.9 56.7 Q 38.1 57.1 37.4 57.6 L 37 57.1 Q 37.8 56.6 38.5 56.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 38.7 58.3 C 38.8 58.6 38.8 59 38.8 59.2 C 38.8 59.5 38.7 59.7 38.6 60 C 38.6 60.2 38.5 60.5 38.4 60.7 C 38.3 60.8 38.1 61 37.9 61.1 C 37.7 61.1 37.5 61.1 37.3 61 C 37.1 60.9 36.9 60.7 36.7 60.6 C 36.5 60.4 36.3 60.3 36.1 60 C 36 59.8 35.8 59.5 35.7 59.3 C 35.6 59 35.6 58.6 35.6 58.4 C 35.6 58.1 35.7 57.8 35.8 57.6 C 35.8 57.4 35.9 57.1 36 56.9 C 36.1 56.8 36.3 56.6 36.5 56.5 C 36.7 56.5 36.9 56.5 37.1 56.6 C 37.3 56.7 37.5 56.8 37.7 57 C 37.9 57.2 38.1 57.3 38.3 57.5 C 38.4 57.8 38.6 58.1 38.7 58.3 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 38.2 58.2 C 38.2 58.4 38.2 58.7 38.2 58.9 C 38.2 59.1 38.2 59.3 38.1 59.5 C 38.1 59.7 38 59.9 37.9 60.1 C 37.8 60.2 37.7 60.4 37.5 60.4 C 37.4 60.5 37.2 60.4 37 60.3 C 36.9 60.3 36.7 60.1 36.6 60 C 36.4 59.9 36.3 59.7 36.1 59.6 C 36 59.4 35.8 59.1 35.8 58.9 C 35.7 58.7 35.7 58.4 35.7 58.2 C 35.7 57.9 35.7 57.7 35.8 57.5 C 35.9 57.3 35.9 57.1 36 57 C 36.1 56.8 36.2 56.7 36.4 56.6 C 36.5 56.6 36.7 56.6 36.9 56.7 C 37 56.8 37.2 56.9 37.4 57.1 C 37.5 57.2 37.7 57.3 37.8 57.5 C 37.9 57.7 38.1 57.9 38.2 58.2 Z', from: 4, to: 4 },
        { tone: 'light', c: [36.8, 58.2, 0.6], from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 41 53.5 Q 41.7 54 42.5 54.5 L 42.1 55 Q 41.4 54.5 40.6 54 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 43.8 56.6 C 43.7 56.9 43.5 57.2 43.4 57.4 C 43.2 57.6 43 57.8 42.8 57.9 C 42.6 58.1 42.4 58.3 42.2 58.4 C 42 58.4 41.8 58.5 41.6 58.4 C 41.4 58.4 41.2 58.2 41.1 58 C 41 57.8 40.9 57.6 40.9 57.3 C 40.8 57.1 40.7 56.9 40.7 56.6 C 40.7 56.3 40.7 56 40.8 55.7 C 40.9 55.4 41.1 55.1 41.2 54.9 C 41.4 54.7 41.6 54.5 41.8 54.4 C 42 54.2 42.2 54 42.4 54 C 42.6 53.9 42.8 53.8 43 53.9 C 43.2 53.9 43.4 54.1 43.5 54.3 C 43.6 54.5 43.7 54.7 43.7 55 C 43.8 55.2 43.9 55.4 43.9 55.7 C 43.9 56 43.9 56.3 43.8 56.6 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 43.3 56.3 C 43.2 56.5 43 56.7 42.9 56.9 C 42.8 57.1 42.6 57.2 42.5 57.4 C 42.3 57.5 42.1 57.6 42 57.7 C 41.8 57.8 41.6 57.8 41.5 57.8 C 41.3 57.7 41.2 57.6 41.1 57.4 C 41 57.3 41 57.1 40.9 56.9 C 40.9 56.7 40.8 56.5 40.8 56.3 C 40.8 56 40.8 55.7 40.9 55.5 C 40.9 55.3 41.1 55 41.2 54.9 C 41.4 54.7 41.5 54.5 41.7 54.4 C 41.8 54.3 42 54.1 42.1 54.1 C 42.3 54 42.5 54 42.6 54 C 42.8 54 42.9 54.2 43 54.3 C 43.1 54.5 43.2 54.7 43.2 54.9 C 43.3 55.1 43.3 55.3 43.3 55.5 C 43.3 55.7 43.3 56 43.3 56.3 Z', from: 4, to: 4 },
        { tone: 'light', c: [41.9, 55.6, 0.6], from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 31 75.6 C 29.9 73.2 26.7 64.9 24.6 61.6 C 22.5 58.3 19.3 56.7 18.2 55.8 L 17.8 56.2 C 18.7 57.3 21.5 59 23.4 62.4 C 25.3 65.7 28.1 74.1 29 76.4 Z', from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 28.5 69.4 Q 27.7 69.8 27 70.3 L 26.6 69.8 Q 27.4 69.3 28.1 68.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 28.3 71 C 28.4 71.3 28.4 71.6 28.4 71.9 C 28.4 72.2 28.3 72.4 28.2 72.7 C 28.2 72.9 28.1 73.1 28 73.3 C 27.9 73.5 27.7 73.7 27.5 73.7 C 27.3 73.8 27.1 73.7 26.9 73.7 C 26.7 73.6 26.5 73.4 26.3 73.3 C 26.1 73.1 25.9 72.9 25.7 72.7 C 25.6 72.5 25.4 72.2 25.3 71.9 C 25.2 71.6 25.2 71.3 25.2 71 C 25.2 70.8 25.3 70.5 25.4 70.3 C 25.4 70 25.5 69.8 25.6 69.6 C 25.8 69.4 25.9 69.2 26.1 69.2 C 26.3 69.1 26.5 69.2 26.7 69.3 C 26.9 69.3 27.1 69.5 27.3 69.7 C 27.5 69.8 27.7 70 27.9 70.2 C 28 70.4 28.2 70.7 28.3 71 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 27.8 70.8 C 27.8 71.1 27.8 71.3 27.8 71.6 C 27.8 71.8 27.8 72 27.7 72.2 C 27.7 72.4 27.6 72.6 27.5 72.7 C 27.4 72.9 27.3 73 27.1 73.1 C 27 73.1 26.8 73.1 26.6 73 C 26.5 72.9 26.3 72.8 26.2 72.7 C 26 72.5 25.9 72.4 25.7 72.2 C 25.6 72 25.4 71.8 25.4 71.6 C 25.3 71.3 25.3 71.1 25.3 70.8 C 25.3 70.6 25.4 70.4 25.4 70.2 C 25.5 70 25.5 69.8 25.6 69.7 C 25.7 69.5 25.8 69.3 26 69.3 C 26.1 69.3 26.3 69.3 26.5 69.4 C 26.6 69.4 26.8 69.6 27 69.7 C 27.1 69.9 27.3 70 27.4 70.2 C 27.5 70.4 27.7 70.6 27.8 70.8 Z', from: 4, to: 4 },
        { tone: 'light', c: [26.4, 70.9, 0.6], from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 26.6 63.2 Q 27.4 63.7 28.1 64.2 L 27.8 64.7 Q 27 64.3 26.3 63.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 29.4 66.4 C 29.4 66.6 29.2 66.9 29 67.1 C 28.8 67.4 28.7 67.5 28.5 67.7 C 28.3 67.8 28.1 68 27.9 68.1 C 27.7 68.2 27.4 68.2 27.2 68.2 C 27.1 68.1 26.9 67.9 26.8 67.8 C 26.7 67.6 26.6 67.3 26.5 67.1 C 26.4 66.8 26.4 66.6 26.4 66.3 C 26.4 66.1 26.4 65.7 26.5 65.4 C 26.5 65.2 26.7 64.9 26.9 64.6 C 27 64.4 27.2 64.3 27.4 64.1 C 27.6 63.9 27.8 63.8 28 63.7 C 28.2 63.6 28.5 63.6 28.7 63.6 C 28.8 63.7 29 63.9 29.1 64 C 29.2 64.2 29.3 64.5 29.4 64.7 C 29.5 64.9 29.5 65.2 29.5 65.5 C 29.5 65.7 29.5 66.1 29.4 66.4 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 28.9 66 C 28.8 66.2 28.7 66.5 28.6 66.6 C 28.4 66.8 28.3 67 28.1 67.1 C 28 67.2 27.8 67.4 27.6 67.4 C 27.5 67.5 27.3 67.6 27.1 67.5 C 27 67.5 26.8 67.3 26.8 67.2 C 26.7 67 26.6 66.8 26.5 66.6 C 26.5 66.4 26.4 66.2 26.4 66 C 26.4 65.8 26.4 65.5 26.5 65.3 C 26.6 65 26.7 64.8 26.9 64.6 C 27 64.4 27.2 64.3 27.3 64.2 C 27.5 64 27.6 63.9 27.8 63.8 C 28 63.7 28.1 63.7 28.3 63.7 C 28.4 63.8 28.6 63.9 28.7 64.1 C 28.8 64.2 28.8 64.4 28.9 64.6 C 28.9 64.8 29 65 29 65.3 C 29 65.5 29 65.8 28.9 66 Z', from: 4, to: 4 },
        { tone: 'light', c: [27.5, 65.3, 0.6], from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 24.4 59.8 Q 23.6 60.3 22.9 60.8 L 22.5 60.3 Q 23.3 59.8 24 59.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 24.2 61.5 C 24.3 61.8 24.3 62.1 24.3 62.4 C 24.3 62.7 24.2 62.9 24.1 63.1 C 24.1 63.4 24 63.6 23.9 63.8 C 23.8 64 23.6 64.2 23.4 64.2 C 23.2 64.3 23 64.2 22.8 64.2 C 22.6 64.1 22.4 63.9 22.2 63.7 C 22 63.6 21.8 63.4 21.6 63.2 C 21.5 63 21.3 62.7 21.2 62.4 C 21.1 62.1 21.1 61.8 21.1 61.5 C 21.1 61.3 21.2 61 21.3 60.8 C 21.3 60.5 21.4 60.3 21.5 60.1 C 21.6 59.9 21.8 59.7 22 59.7 C 22.2 59.6 22.4 59.7 22.6 59.8 C 22.8 59.8 23 60 23.2 60.2 C 23.4 60.3 23.6 60.5 23.8 60.7 C 23.9 60.9 24.1 61.2 24.2 61.5 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 23.7 61.3 C 23.7 61.6 23.7 61.8 23.7 62.1 C 23.7 62.3 23.7 62.5 23.6 62.7 C 23.6 62.9 23.5 63.1 23.4 63.2 C 23.3 63.4 23.2 63.5 23 63.6 C 22.9 63.6 22.7 63.6 22.5 63.5 C 22.4 63.4 22.2 63.3 22.1 63.2 C 21.9 63 21.8 62.9 21.6 62.7 C 21.5 62.5 21.3 62.3 21.3 62.1 C 21.2 61.8 21.2 61.5 21.2 61.3 C 21.2 61.1 21.2 60.9 21.3 60.7 C 21.4 60.5 21.4 60.3 21.5 60.1 C 21.6 60 21.7 59.8 21.9 59.8 C 22 59.8 22.2 59.8 22.4 59.9 C 22.5 59.9 22.7 60.1 22.9 60.2 C 23 60.3 23.2 60.5 23.3 60.7 C 23.4 60.9 23.6 61.1 23.7 61.3 Z', from: 4, to: 4 },
        { tone: 'light', c: [22.3, 61.4, 0.6], from: 4, to: 4 },
        { tone: 'stemdark', d: 'M 21.7 57 Q 22.5 57.5 23.2 58 L 22.9 58.5 Q 22.1 58.1 21.4 57.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 24.5 60.2 C 24.5 60.4 24.3 60.7 24.1 60.9 C 24 61.2 23.8 61.3 23.6 61.5 C 23.4 61.6 23.2 61.8 23 61.9 C 22.8 62 22.5 62 22.3 62 C 22.2 61.9 22 61.7 21.9 61.6 C 21.8 61.4 21.7 61.1 21.6 60.9 C 21.6 60.6 21.5 60.4 21.5 60.1 C 21.5 59.8 21.5 59.5 21.6 59.2 C 21.6 59 21.8 58.7 22 58.4 C 22.2 58.2 22.4 58.1 22.5 57.9 C 22.7 57.7 22.9 57.6 23.1 57.5 C 23.3 57.4 23.6 57.4 23.8 57.4 C 23.9 57.5 24.1 57.7 24.2 57.8 C 24.4 58 24.4 58.3 24.5 58.5 C 24.6 58.7 24.6 59 24.6 59.3 C 24.6 59.5 24.6 59.9 24.5 60.2 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 24 59.8 C 23.9 60 23.8 60.3 23.7 60.4 C 23.5 60.6 23.4 60.8 23.2 60.9 C 23.1 61 22.9 61.2 22.7 61.2 C 22.6 61.3 22.4 61.4 22.2 61.3 C 22.1 61.3 22 61.1 21.9 61 C 21.8 60.8 21.7 60.6 21.7 60.4 C 21.6 60.2 21.5 60 21.5 59.8 C 21.5 59.6 21.5 59.3 21.6 59.1 C 21.7 58.8 21.8 58.6 22 58.4 C 22.1 58.2 22.3 58.1 22.4 58 C 22.6 57.8 22.7 57.7 22.9 57.6 C 23.1 57.5 23.3 57.5 23.4 57.5 C 23.5 57.6 23.7 57.7 23.8 57.9 C 23.9 58 23.9 58.2 24 58.4 C 24 58.6 24.1 58.8 24.1 59.1 C 24.1 59.3 24.1 59.6 24 59.8 Z', from: 4, to: 4 },
        { tone: 'light', c: [22.6, 59.1, 0.6], from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 30.7 92.7 C 28.7 91.6 22.7 87.5 18.6 86.3 C 14.4 85.2 7.8 85.7 5.7 85.6 L 5.6 86.5 C 7.7 86.8 14 86.7 18 88.2 C 21.9 89.7 27.4 94.1 29.3 95.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 93.7 C 28.2 92.6 22.4 88.3 18.3 87 C 14.2 85.7 7.8 86.1 5.6 85.9 L 5.6 86.1 C 7.7 86.4 14.2 86.1 18.2 87.5 C 22.2 88.9 27.9 93.2 29.8 94.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31 92.9 C 29 91.3 23.1 85.5 18.9 83.4 C 14.8 81.4 8.3 80.9 6.1 80.4 L 5.9 81.3 C 7.9 81.9 14.1 82.8 18 85.1 C 21.8 87.5 27.2 93.5 29 95.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 93.7 C 28.3 92.1 22.6 86.2 18.6 84.1 C 14.5 81.9 8.1 81.3 6.1 80.8 L 6 81 C 8.1 81.6 14.4 82.3 18.3 84.5 C 22.3 86.7 27.9 92.6 29.8 94.3 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.2 93 C 29.3 91 23.8 83.5 20 80.5 C 16.2 77.6 10.2 76.1 8.2 75.2 L 7.8 76 C 9.6 77 15.3 78.9 18.8 82 C 22.3 85.2 27.2 92.8 28.8 95 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 93.8 C 28.5 91.7 23.2 84.1 19.5 81.1 C 15.8 78.1 9.9 76.4 8 75.5 L 7.9 75.7 C 9.8 76.7 15.6 78.4 19.2 81.5 C 22.9 84.5 28 92.1 29.7 94.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.3 93.3 C 29.7 90.7 25.1 81.7 21.9 77.9 C 18.7 74.1 13.6 71.7 11.9 70.4 L 11.3 71.1 C 12.8 72.4 17.5 75.2 20.4 79.1 C 23.3 83 27.3 92.1 28.7 94.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 93.8 C 28.8 91.2 24.4 82.2 21.3 78.4 C 18.2 74.5 13.3 72 11.7 70.7 L 11.5 70.9 C 13.1 72.2 17.9 74.8 21 78.7 C 24 82.5 28.2 91.6 29.7 94.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.4 93.5 C 30.3 90.5 26.9 80.3 24.5 75.8 C 22.1 71.4 18.3 68.1 17.1 66.6 L 16.4 67.1 C 17.4 68.7 20.7 72.1 22.7 76.7 C 24.8 81.3 27.6 91.5 28.6 94.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 93.9 C 29.3 90.9 26.1 80.7 23.8 76.2 C 21.6 71.6 18 68.3 16.8 66.8 L 16.7 66.9 C 17.8 68.5 21.2 71.8 23.4 76.4 C 25.6 80.9 28.6 91.2 29.7 94.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.5 93.7 C 30.8 90.5 28.9 79.5 27.6 74.6 C 26.3 69.7 24.2 65.9 23.5 64.1 L 22.6 64.4 C 23.1 66.2 24.7 70.1 25.7 75 C 26.7 80 28.1 91.1 28.5 94.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 93.9 C 29.8 90.7 28.1 79.7 26.9 74.8 C 25.7 69.8 23.8 66 23.2 64.3 L 23 64.3 C 23.5 66.1 25.3 69.9 26.4 74.9 C 27.5 79.8 29.1 90.9 29.6 94.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.5 94 C 31.4 90.7 31.2 79.4 31 74.3 C 30.8 69.2 30.5 65.2 30.5 63.4 L 29.6 63.4 C 29.5 65.2 29.2 69.2 29 74.3 C 28.9 79.4 28.6 90.7 28.5 94 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 94 C 30.3 90.7 30.3 79.4 30.2 74.3 C 30.2 69.2 30.1 65.2 30.1 63.4 L 29.9 63.4 C 29.9 65.2 29.8 69.2 29.8 74.3 C 29.7 79.4 29.7 90.7 29.6 94 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.5 94.3 C 31.9 91.1 33.3 80 34.3 75 C 35.3 70.1 36.9 66.2 37.4 64.4 L 36.5 64.1 C 35.8 65.9 33.7 69.7 32.4 74.6 C 31.1 79.5 29.2 90.5 28.5 93.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 94.1 C 30.9 90.9 32.5 79.8 33.6 74.9 C 34.7 69.9 36.5 66.1 37 64.3 L 36.8 64.3 C 36.2 66 34.3 69.8 33.1 74.8 C 31.9 79.7 30.2 90.7 29.6 93.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 31.4 94.5 C 32.4 91.5 35.2 81.3 37.3 76.7 C 39.3 72.1 42.6 68.7 43.6 67.1 L 42.9 66.6 C 41.7 68.1 37.9 71.4 35.5 75.8 C 33.1 80.3 29.7 90.5 28.6 93.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 94.1 C 31.4 91.2 34.4 80.9 36.6 76.4 C 38.8 71.8 42.2 68.5 43.3 66.9 L 43.2 66.8 C 42 68.3 38.4 71.6 36.2 76.2 C 33.9 80.7 30.7 90.9 29.7 93.9 Z', from: 5 },
        { tone: 'stem', d: 'M 31.3 94.7 C 32.7 92.1 36.7 83 39.6 79.1 C 42.5 75.2 47.2 72.4 48.7 71.1 L 48.1 70.4 C 46.4 71.7 41.3 74.1 38.1 77.9 C 34.9 81.7 30.3 90.7 28.7 93.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 94.2 C 31.8 91.6 36 82.5 39 78.7 C 42.1 74.8 46.9 72.2 48.5 70.9 L 48.3 70.7 C 46.7 72 41.8 74.5 38.7 78.4 C 35.6 82.2 31.2 91.2 29.7 93.8 Z', from: 5 },
        { tone: 'stem', d: 'M 31.2 95 C 32.8 92.8 37.7 85.2 41.2 82 C 44.7 78.9 50.4 77 52.2 76 L 51.8 75.2 C 49.8 76.1 43.8 77.6 40 80.5 C 36.2 83.5 30.7 91 28.8 93 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 94.2 C 32 92.1 37.1 84.5 40.8 81.5 C 44.4 78.4 50.2 76.7 52.1 75.7 L 52 75.5 C 50.1 76.4 44.2 78.1 40.5 81.1 C 36.8 84.1 31.5 91.7 29.7 93.8 Z', from: 5 },
        { tone: 'stem', d: 'M 31 95.1 C 32.8 93.5 38.2 87.5 42 85.1 C 45.9 82.8 52.1 81.9 54.1 81.3 L 53.9 80.4 C 51.7 80.9 45.2 81.4 41.1 83.4 C 36.9 85.5 31 91.3 29 92.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 94.3 C 32.1 92.6 37.7 86.7 41.7 84.5 C 45.6 82.3 51.9 81.6 54 81 L 53.9 80.8 C 51.9 81.3 45.5 81.9 41.4 84.1 C 37.4 86.2 31.7 92.1 29.8 93.7 Z', from: 5 },
        { tone: 'stem', d: 'M 30.7 95.3 C 32.6 94.1 38.1 89.7 42 88.2 C 46 86.7 52.3 86.8 54.4 86.5 L 54.3 85.6 C 52.2 85.7 45.6 85.2 41.4 86.3 C 37.3 87.5 31.3 91.6 29.3 92.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.2 94.3 C 32.1 93.2 37.8 88.9 41.8 87.5 C 45.8 86.1 52.3 86.4 54.4 86.1 L 54.4 85.9 C 52.2 86.1 45.8 85.7 41.7 87 C 37.6 88.3 31.8 92.6 29.8 93.7 Z', from: 5 },
        { tone: 'stemdark', d: 'M 31 72.5 C 32.3 69.6 36.1 59.7 38.6 55.4 C 41.2 51 45 47.7 46.2 46.2 L 45.8 45.8 C 44.4 47.3 40.2 50.3 37.4 54.6 C 34.6 58.9 30.4 68.7 29 71.5 Z', from: 5 },
        { tone: 'stemdark', d: 'M 34.1 64.2 Q 33.3 64.6 32.6 65.1 L 32.2 64.6 Q 33 64.1 33.7 63.6 Z', from: 5 },
        { tone: 'deep', d: 'M 33.9 65.8 C 34 66.1 34 66.4 34 66.7 C 34 67 33.9 67.2 33.8 67.5 C 33.8 67.7 33.7 67.9 33.6 68.1 C 33.5 68.3 33.3 68.5 33.1 68.5 C 32.9 68.6 32.7 68.5 32.5 68.5 C 32.3 68.4 32.1 68.2 31.9 68.1 C 31.7 67.9 31.5 67.7 31.3 67.5 C 31.2 67.3 31 67 30.9 66.7 C 30.8 66.4 30.8 66.1 30.8 65.8 C 30.8 65.6 30.9 65.3 31 65.1 C 31 64.8 31.1 64.6 31.2 64.4 C 31.4 64.2 31.5 64 31.7 64 C 31.9 63.9 32.1 64 32.3 64.1 C 32.5 64.1 32.7 64.3 32.9 64.5 C 33.1 64.6 33.3 64.8 33.5 65 C 33.6 65.2 33.8 65.5 33.9 65.8 Z', from: 5 },
        { tone: 'base', d: 'M 33.4 65.6 C 33.4 65.9 33.4 66.1 33.4 66.4 C 33.4 66.6 33.4 66.8 33.3 67 C 33.3 67.2 33.2 67.4 33.1 67.5 C 33 67.7 32.9 67.8 32.7 67.9 C 32.6 67.9 32.4 67.9 32.2 67.8 C 32.1 67.7 31.9 67.6 31.8 67.5 C 31.6 67.3 31.5 67.2 31.3 67 C 31.2 66.8 31 66.6 31 66.4 C 30.9 66.1 30.9 65.9 30.9 65.6 C 30.9 65.4 31 65.2 31 65 C 31.1 64.8 31.1 64.6 31.2 64.5 C 31.3 64.3 31.4 64.1 31.6 64.1 C 31.7 64.1 31.9 64.1 32.1 64.2 C 32.2 64.2 32.4 64.4 32.6 64.5 C 32.7 64.7 32.9 64.8 33 65 C 33.1 65.2 33.3 65.4 33.4 65.6 Z', from: 5 },
        { tone: 'light', c: [32, 65.7, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 36.9 58.1 Q 37.6 58.6 38.4 59.1 L 38 59.6 Q 37.3 59.2 36.5 58.7 Z', from: 5 },
        { tone: 'deep', d: 'M 39.7 61.2 C 39.6 61.5 39.4 61.8 39.3 62 C 39.1 62.3 38.9 62.4 38.7 62.6 C 38.5 62.7 38.3 62.9 38.1 63 C 37.9 63.1 37.7 63.1 37.5 63.1 C 37.3 63 37.1 62.8 37 62.6 C 36.9 62.5 36.8 62.2 36.8 62 C 36.7 61.7 36.6 61.5 36.6 61.2 C 36.6 60.9 36.6 60.6 36.7 60.3 C 36.8 60 37 59.8 37.1 59.5 C 37.3 59.3 37.5 59.1 37.7 59 C 37.9 58.8 38.1 58.7 38.3 58.6 C 38.5 58.5 38.7 58.4 38.9 58.5 C 39.1 58.6 39.3 58.7 39.4 58.9 C 39.5 59.1 39.6 59.3 39.6 59.6 C 39.7 59.8 39.8 60.1 39.8 60.3 C 39.8 60.6 39.8 61 39.7 61.2 Z', from: 5 },
        { tone: 'base', d: 'M 39.2 60.9 C 39.1 61.1 38.9 61.3 38.8 61.5 C 38.7 61.7 38.5 61.9 38.4 62 C 38.2 62.1 38 62.3 37.9 62.3 C 37.7 62.4 37.5 62.4 37.4 62.4 C 37.2 62.4 37.1 62.2 37 62.1 C 36.9 61.9 36.9 61.7 36.8 61.5 C 36.8 61.3 36.7 61.1 36.7 60.9 C 36.7 60.7 36.7 60.4 36.8 60.1 C 36.8 59.9 37 59.7 37.1 59.5 C 37.3 59.3 37.4 59.2 37.6 59 C 37.7 58.9 37.9 58.8 38 58.7 C 38.2 58.6 38.4 58.6 38.5 58.6 C 38.7 58.7 38.8 58.8 38.9 59 C 39 59.1 39.1 59.3 39.1 59.5 C 39.2 59.7 39.2 59.9 39.2 60.1 C 39.2 60.4 39.2 60.6 39.2 60.9 Z', from: 5 },
        { tone: 'light', c: [37.8, 60.2, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 39.5 54.2 Q 38.7 54.6 37.9 55.1 L 37.6 54.6 Q 38.3 54.1 39.1 53.6 Z', from: 5 },
        { tone: 'deep', d: 'M 39.3 55.8 C 39.3 56.1 39.4 56.5 39.3 56.7 C 39.3 57 39.3 57.2 39.2 57.5 C 39.1 57.7 39.1 58 38.9 58.2 C 38.8 58.3 38.7 58.5 38.5 58.6 C 38.3 58.6 38 58.6 37.8 58.5 C 37.6 58.4 37.4 58.2 37.3 58.1 C 37.1 57.9 36.9 57.8 36.7 57.5 C 36.5 57.3 36.4 57 36.3 56.8 C 36.2 56.5 36.2 56.1 36.2 55.9 C 36.2 55.6 36.3 55.3 36.3 55.1 C 36.4 54.9 36.5 54.6 36.6 54.4 C 36.7 54.3 36.9 54.1 37.1 54 C 37.2 54 37.5 54 37.7 54.1 C 37.9 54.2 38.1 54.3 38.3 54.5 C 38.5 54.7 38.7 54.8 38.8 55 C 39 55.3 39.2 55.6 39.3 55.8 Z', from: 5 },
        { tone: 'base', d: 'M 38.7 55.7 C 38.8 55.9 38.8 56.2 38.8 56.4 C 38.8 56.6 38.7 56.8 38.7 57 C 38.6 57.2 38.6 57.4 38.5 57.6 C 38.4 57.7 38.3 57.9 38.1 57.9 C 38 58 37.8 57.9 37.6 57.8 C 37.4 57.8 37.3 57.6 37.1 57.5 C 37 57.4 36.8 57.2 36.7 57 C 36.5 56.9 36.4 56.6 36.3 56.4 C 36.3 56.2 36.2 55.9 36.2 55.7 C 36.3 55.4 36.3 55.2 36.4 55 C 36.4 54.8 36.5 54.6 36.6 54.5 C 36.7 54.3 36.8 54.2 36.9 54.1 C 37.1 54.1 37.3 54.1 37.4 54.2 C 37.6 54.3 37.8 54.4 37.9 54.6 C 38.1 54.7 38.2 54.8 38.4 55 C 38.5 55.2 38.6 55.4 38.7 55.7 Z', from: 5 },
        { tone: 'light', c: [37.3, 55.7, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 41.7 50.2 Q 42.5 50.8 43.2 51.3 L 42.9 51.8 Q 42.1 51.3 41.4 50.8 Z', from: 5 },
        { tone: 'deep', d: 'M 44.5 53.4 C 44.5 53.7 44.3 54 44.1 54.2 C 44 54.4 43.8 54.6 43.6 54.7 C 43.4 54.9 43.2 55.1 43 55.1 C 42.8 55.2 42.5 55.3 42.3 55.2 C 42.2 55.2 42 55 41.9 54.8 C 41.8 54.6 41.7 54.4 41.6 54.1 C 41.6 53.9 41.5 53.6 41.5 53.4 C 41.5 53.1 41.5 52.8 41.6 52.5 C 41.7 52.2 41.8 51.9 42 51.7 C 42.2 51.5 42.4 51.3 42.5 51.1 C 42.7 51 42.9 50.8 43.1 50.7 C 43.3 50.7 43.6 50.6 43.8 50.6 C 43.9 50.7 44.1 50.9 44.2 51.1 C 44.4 51.3 44.4 51.5 44.5 51.7 C 44.6 52 44.6 52.2 44.6 52.5 C 44.6 52.8 44.6 53.1 44.5 53.4 Z', from: 5 },
        { tone: 'base', d: 'M 44 53 C 43.9 53.3 43.8 53.5 43.7 53.7 C 43.5 53.9 43.4 54 43.2 54.1 C 43.1 54.3 42.9 54.4 42.7 54.5 C 42.6 54.5 42.4 54.6 42.2 54.6 C 42.1 54.5 42 54.4 41.9 54.2 C 41.8 54.1 41.7 53.9 41.7 53.7 C 41.6 53.5 41.5 53.3 41.5 53 C 41.5 52.8 41.6 52.5 41.6 52.3 C 41.7 52.1 41.8 51.8 42 51.6 C 42.1 51.5 42.3 51.3 42.4 51.2 C 42.6 51.1 42.7 50.9 42.9 50.9 C 43.1 50.8 43.3 50.7 43.4 50.8 C 43.5 50.8 43.7 51 43.8 51.1 C 43.9 51.3 43.9 51.5 44 51.7 C 44 51.9 44.1 52.1 44.1 52.3 C 44.1 52.5 44.1 52.8 44 53 Z', from: 5 },
        { tone: 'light', c: [42.6, 52.4, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 43.8 48.4 Q 43 48.9 42.3 49.4 L 41.9 48.9 Q 42.7 48.4 43.4 47.9 Z', from: 5 },
        { tone: 'deep', d: 'M 43.6 50.1 C 43.7 50.4 43.7 50.7 43.7 51 C 43.7 51.3 43.6 51.5 43.5 51.7 C 43.5 52 43.4 52.2 43.3 52.4 C 43.2 52.6 43 52.8 42.8 52.8 C 42.6 52.9 42.4 52.8 42.2 52.8 C 42 52.7 41.8 52.5 41.6 52.3 C 41.4 52.2 41.2 52 41 51.8 C 40.9 51.6 40.7 51.3 40.6 51 C 40.5 50.7 40.5 50.4 40.5 50.1 C 40.5 49.8 40.6 49.6 40.7 49.4 C 40.7 49.1 40.8 48.9 40.9 48.7 C 41.1 48.5 41.2 48.3 41.4 48.3 C 41.6 48.2 41.8 48.3 42 48.4 C 42.2 48.4 42.4 48.6 42.6 48.8 C 42.8 48.9 43 49.1 43.2 49.3 C 43.3 49.5 43.5 49.8 43.6 50.1 Z', from: 5 },
        { tone: 'base', d: 'M 43.1 49.9 C 43.1 50.1 43.1 50.4 43.1 50.7 C 43.1 50.9 43.1 51.1 43 51.3 C 43 51.5 42.9 51.7 42.8 51.8 C 42.7 52 42.6 52.1 42.5 52.2 C 42.3 52.2 42.1 52.2 41.9 52.1 C 41.8 52 41.6 51.9 41.5 51.8 C 41.3 51.6 41.2 51.5 41 51.3 C 40.9 51.1 40.7 50.9 40.7 50.7 C 40.6 50.4 40.6 50.1 40.6 49.9 C 40.6 49.7 40.7 49.5 40.7 49.3 C 40.8 49.1 40.8 48.9 40.9 48.7 C 41 48.6 41.1 48.4 41.3 48.4 C 41.4 48.4 41.6 48.4 41.8 48.5 C 42 48.5 42.1 48.7 42.3 48.8 C 42.4 48.9 42.6 49.1 42.7 49.3 C 42.8 49.4 43 49.7 43.1 49.9 Z', from: 5 },
        { tone: 'light', c: [41.7, 50, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 31 73.5 C 29.7 70.9 25.7 61.6 23.1 57.6 C 20.5 53.7 16.6 51.1 15.2 49.8 L 14.8 50.2 C 15.9 51.6 19.5 54.3 21.9 58.4 C 24.3 62.4 27.8 71.8 29 74.5 Z', from: 5 },
        { tone: 'stemdark', d: 'M 27.9 66.6 Q 27.1 67 26.4 67.5 L 26 67 Q 26.8 66.5 27.5 66 Z', from: 5 },
        { tone: 'deep', d: 'M 27.7 68.2 C 27.8 68.5 27.8 68.8 27.8 69.1 C 27.8 69.4 27.7 69.6 27.6 69.9 C 27.6 70.1 27.5 70.3 27.4 70.5 C 27.3 70.7 27.1 70.9 26.9 70.9 C 26.7 71 26.5 70.9 26.3 70.9 C 26.1 70.8 25.9 70.6 25.7 70.5 C 25.5 70.3 25.3 70.1 25.1 69.9 C 25 69.7 24.8 69.4 24.7 69.1 C 24.6 68.8 24.6 68.5 24.6 68.2 C 24.6 68 24.7 67.7 24.8 67.5 C 24.8 67.2 24.9 67 25 66.8 C 25.2 66.6 25.3 66.4 25.5 66.4 C 25.7 66.3 25.9 66.4 26.1 66.5 C 26.3 66.5 26.5 66.7 26.7 66.9 C 26.9 67 27.1 67.2 27.3 67.4 C 27.4 67.6 27.6 67.9 27.7 68.2 Z', from: 5 },
        { tone: 'base', d: 'M 27.2 68 C 27.2 68.3 27.2 68.5 27.2 68.8 C 27.2 69 27.2 69.2 27.1 69.4 C 27.1 69.6 27 69.8 26.9 69.9 C 26.8 70.1 26.7 70.2 26.5 70.3 C 26.4 70.3 26.2 70.3 26 70.2 C 25.9 70.1 25.7 70 25.6 69.9 C 25.4 69.7 25.3 69.6 25.1 69.4 C 25 69.2 24.8 69 24.8 68.8 C 24.7 68.5 24.7 68.3 24.7 68 C 24.7 67.8 24.8 67.6 24.8 67.4 C 24.9 67.2 24.9 67 25 66.9 C 25.1 66.7 25.2 66.5 25.4 66.5 C 25.5 66.5 25.7 66.5 25.9 66.6 C 26 66.6 26.2 66.8 26.4 66.9 C 26.5 67.1 26.7 67.2 26.8 67.4 C 26.9 67.6 27.1 67.8 27.2 68 Z', from: 5 },
        { tone: 'light', c: [25.8, 68.1, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 26 60.8 Q 26.7 61.3 27.5 61.8 L 27.1 62.3 Q 26.3 61.9 25.6 61.4 Z', from: 5 },
        { tone: 'deep', d: 'M 28.8 63.9 C 28.7 64.2 28.5 64.5 28.4 64.7 C 28.2 65 28 65.1 27.8 65.3 C 27.6 65.4 27.4 65.6 27.2 65.7 C 27 65.8 26.8 65.8 26.6 65.8 C 26.4 65.7 26.2 65.5 26.1 65.3 C 26 65.2 25.9 64.9 25.9 64.7 C 25.8 64.4 25.7 64.2 25.7 63.9 C 25.7 63.6 25.7 63.3 25.8 63 C 25.9 62.7 26.1 62.5 26.2 62.2 C 26.4 62 26.6 61.8 26.8 61.7 C 27 61.5 27.2 61.4 27.4 61.3 C 27.6 61.2 27.8 61.1 28 61.2 C 28.2 61.3 28.3 61.4 28.5 61.6 C 28.6 61.8 28.7 62.1 28.7 62.3 C 28.8 62.5 28.9 62.8 28.9 63.1 C 28.9 63.3 28.9 63.7 28.8 63.9 Z', from: 5 },
        { tone: 'base', d: 'M 28.2 63.6 C 28.2 63.8 28 64.1 27.9 64.2 C 27.8 64.4 27.6 64.6 27.4 64.7 C 27.3 64.8 27.1 65 27 65 C 26.8 65.1 26.6 65.1 26.5 65.1 C 26.3 65.1 26.2 64.9 26.1 64.8 C 26 64.6 25.9 64.4 25.9 64.2 C 25.8 64 25.8 63.8 25.8 63.6 C 25.8 63.4 25.8 63.1 25.9 62.8 C 25.9 62.6 26.1 62.4 26.2 62.2 C 26.3 62 26.5 61.9 26.7 61.7 C 26.8 61.6 27 61.5 27.1 61.4 C 27.3 61.3 27.5 61.3 27.6 61.3 C 27.8 61.4 27.9 61.5 28 61.7 C 28.1 61.8 28.2 62 28.2 62.2 C 28.3 62.4 28.3 62.6 28.3 62.8 C 28.3 63.1 28.3 63.4 28.2 63.6 Z', from: 5 },
        { tone: 'light', c: [26.9, 62.9, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 23.8 57.2 Q 23.1 57.7 22.3 58.2 L 22 57.7 Q 22.7 57.1 23.4 56.6 Z', from: 5 },
        { tone: 'deep', d: 'M 23.6 58.8 C 23.7 59.1 23.7 59.5 23.7 59.7 C 23.7 60 23.6 60.3 23.6 60.5 C 23.5 60.7 23.4 61 23.3 61.2 C 23.2 61.3 23 61.5 22.8 61.6 C 22.7 61.6 22.4 61.6 22.2 61.5 C 22 61.4 21.8 61.3 21.6 61.1 C 21.4 60.9 21.2 60.8 21.1 60.6 C 20.9 60.3 20.7 60 20.6 59.8 C 20.6 59.5 20.5 59.1 20.6 58.9 C 20.6 58.6 20.6 58.4 20.7 58.1 C 20.8 57.9 20.8 57.6 21 57.4 C 21.1 57.3 21.3 57.1 21.4 57 C 21.6 57 21.9 57 22.1 57.1 C 22.3 57.2 22.5 57.4 22.7 57.5 C 22.8 57.7 23 57.8 23.2 58.1 C 23.4 58.3 23.5 58.6 23.6 58.8 Z', from: 5 },
        { tone: 'base', d: 'M 23.1 58.7 C 23.2 58.9 23.2 59.2 23.2 59.4 C 23.2 59.6 23.1 59.8 23.1 60 C 23 60.2 23 60.4 22.9 60.6 C 22.8 60.7 22.6 60.9 22.5 60.9 C 22.3 61 22.1 60.9 22 60.8 C 21.8 60.8 21.7 60.6 21.5 60.5 C 21.3 60.4 21.2 60.2 21.1 60.1 C 20.9 59.9 20.8 59.6 20.7 59.4 C 20.6 59.2 20.6 58.9 20.6 58.7 C 20.6 58.4 20.7 58.2 20.7 58 C 20.8 57.8 20.8 57.6 20.9 57.5 C 21 57.3 21.2 57.2 21.3 57.1 C 21.5 57.1 21.7 57.2 21.8 57.2 C 22 57.3 22.1 57.4 22.3 57.6 C 22.5 57.7 22.6 57.8 22.7 58 C 22.9 58.2 23 58.4 23.1 58.7 Z', from: 5 },
        { tone: 'light', c: [21.7, 58.7, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 21.4 53.6 Q 22.1 54.1 22.9 54.6 L 22.6 55.1 Q 21.8 54.6 21 54.1 Z', from: 5 },
        { tone: 'deep', d: 'M 24.2 56.7 C 24.1 57 23.9 57.3 23.8 57.5 C 23.6 57.7 23.4 57.9 23.2 58 C 23 58.2 22.8 58.4 22.6 58.4 C 22.4 58.5 22.2 58.6 22 58.5 C 21.8 58.5 21.7 58.3 21.5 58.1 C 21.4 57.9 21.4 57.7 21.3 57.4 C 21.2 57.2 21.1 57 21.1 56.7 C 21.1 56.4 21.1 56.1 21.2 55.8 C 21.3 55.5 21.5 55.2 21.7 55 C 21.8 54.8 22 54.6 22.2 54.5 C 22.4 54.3 22.6 54.1 22.8 54 C 23 54 23.2 53.9 23.4 54 C 23.6 54 23.8 54.2 23.9 54.4 C 24 54.6 24.1 54.8 24.2 55.1 C 24.2 55.3 24.3 55.5 24.3 55.8 C 24.3 56.1 24.3 56.4 24.2 56.7 Z', from: 5 },
        { tone: 'base', d: 'M 23.7 56.3 C 23.6 56.6 23.5 56.8 23.3 57 C 23.2 57.2 23 57.3 22.9 57.4 C 22.7 57.6 22.6 57.7 22.4 57.8 C 22.2 57.9 22 57.9 21.9 57.9 C 21.7 57.8 21.6 57.7 21.5 57.5 C 21.4 57.4 21.4 57.2 21.3 57 C 21.3 56.8 21.2 56.6 21.2 56.3 C 21.2 56.1 21.2 55.8 21.3 55.6 C 21.4 55.4 21.5 55.1 21.6 55 C 21.8 54.8 21.9 54.6 22.1 54.5 C 22.2 54.4 22.4 54.2 22.6 54.2 C 22.7 54.1 22.9 54 23.1 54.1 C 23.2 54.1 23.3 54.3 23.4 54.4 C 23.5 54.6 23.6 54.8 23.6 55 C 23.7 55.2 23.7 55.4 23.8 55.6 C 23.8 55.8 23.7 56.1 23.7 56.3 Z', from: 5 },
        { tone: 'light', c: [22.3, 55.7, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 18.8 52.1 Q 18 52.5 17.2 53 L 16.9 52.5 Q 17.6 52 18.4 51.5 Z', from: 5 },
        { tone: 'deep', d: 'M 18.6 53.7 C 18.6 54 18.7 54.3 18.6 54.6 C 18.6 54.9 18.6 55.1 18.5 55.4 C 18.4 55.6 18.4 55.8 18.2 56 C 18.1 56.2 18 56.4 17.8 56.5 C 17.6 56.5 17.3 56.5 17.1 56.4 C 16.9 56.3 16.7 56.1 16.5 56 C 16.4 55.8 16.2 55.6 16 55.4 C 15.8 55.2 15.7 54.9 15.6 54.6 C 15.5 54.4 15.5 54 15.5 53.7 C 15.5 53.5 15.6 53.2 15.6 53 C 15.7 52.7 15.8 52.5 15.9 52.3 C 16 52.1 16.2 51.9 16.4 51.9 C 16.5 51.8 16.8 51.9 17 52 C 17.2 52.1 17.4 52.2 17.6 52.4 C 17.8 52.5 18 52.7 18.1 52.9 C 18.3 53.1 18.5 53.4 18.6 53.7 Z', from: 5 },
        { tone: 'base', d: 'M 18 53.5 C 18.1 53.8 18.1 54 18.1 54.3 C 18.1 54.5 18 54.7 18 54.9 C 17.9 55.1 17.9 55.3 17.8 55.4 C 17.7 55.6 17.6 55.7 17.4 55.8 C 17.3 55.8 17.1 55.8 16.9 55.7 C 16.7 55.6 16.6 55.5 16.4 55.4 C 16.3 55.2 16.1 55.1 16 54.9 C 15.8 54.7 15.7 54.5 15.6 54.3 C 15.6 54 15.5 53.8 15.5 53.5 C 15.6 53.3 15.6 53.1 15.7 52.9 C 15.7 52.7 15.8 52.5 15.9 52.4 C 16 52.2 16.1 52.1 16.2 52 C 16.4 52 16.6 52 16.7 52.1 C 16.9 52.2 17.1 52.3 17.2 52.4 C 17.4 52.6 17.5 52.7 17.7 52.9 C 17.8 53.1 17.9 53.3 18 53.5 Z', from: 5 },
        { tone: 'light', c: [16.6, 53.6, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 31.1 68.2 C 31.6 65 33.2 54.2 34.2 49.2 C 35.2 44.1 36.8 39.9 37.3 38.1 L 36.7 37.9 C 36 39.7 34.1 43.9 32.8 48.8 C 31.5 53.8 29.6 64.6 28.9 67.8 Z', from: 5 },
        { tone: 'stemdark', d: 'M 32.3 59.4 Q 31.5 59.8 30.8 60.3 L 30.4 59.8 Q 31.2 59.3 31.9 58.8 Z', from: 5 },
        { tone: 'deep', d: 'M 32.1 61 C 32.2 61.3 32.2 61.6 32.2 61.9 C 32.2 62.2 32.1 62.4 32 62.7 C 32 62.9 31.9 63.1 31.8 63.3 C 31.7 63.5 31.5 63.7 31.3 63.7 C 31.1 63.8 30.9 63.7 30.7 63.7 C 30.5 63.6 30.3 63.4 30.1 63.3 C 29.9 63.1 29.7 62.9 29.5 62.7 C 29.4 62.5 29.2 62.2 29.1 61.9 C 29 61.6 29 61.3 29 61 C 29 60.8 29.1 60.5 29.2 60.3 C 29.2 60 29.3 59.8 29.4 59.6 C 29.6 59.4 29.7 59.2 29.9 59.2 C 30.1 59.1 30.3 59.2 30.5 59.3 C 30.7 59.3 30.9 59.5 31.1 59.7 C 31.3 59.8 31.5 60 31.7 60.2 C 31.8 60.4 32 60.7 32.1 61 Z', from: 5 },
        { tone: 'base', d: 'M 31.6 60.8 C 31.6 61.1 31.6 61.3 31.6 61.6 C 31.6 61.8 31.6 62 31.5 62.2 C 31.5 62.4 31.4 62.6 31.3 62.7 C 31.2 62.9 31.1 63 30.9 63.1 C 30.8 63.1 30.6 63.1 30.4 63 C 30.3 62.9 30.1 62.8 30 62.7 C 29.8 62.5 29.7 62.4 29.5 62.2 C 29.4 62 29.2 61.8 29.2 61.6 C 29.1 61.3 29.1 61.1 29.1 60.8 C 29.1 60.6 29.2 60.4 29.2 60.2 C 29.3 60 29.3 59.8 29.4 59.7 C 29.5 59.5 29.6 59.3 29.8 59.3 C 29.9 59.3 30.1 59.3 30.3 59.4 C 30.4 59.4 30.6 59.6 30.8 59.7 C 30.9 59.9 31.1 60 31.2 60.2 C 31.3 60.4 31.5 60.6 31.6 60.8 Z', from: 5 },
        { tone: 'light', c: [30.2, 60.9, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 34.1 51.3 Q 34.8 51.8 35.5 52.3 L 35.2 52.8 Q 34.4 52.4 33.7 51.9 Z', from: 5 },
        { tone: 'deep', d: 'M 36.8 54.5 C 36.8 54.7 36.6 55 36.4 55.2 C 36.3 55.5 36.1 55.6 35.9 55.8 C 35.7 55.9 35.5 56.1 35.3 56.2 C 35.1 56.3 34.8 56.3 34.7 56.3 C 34.5 56.2 34.3 56 34.2 55.9 C 34.1 55.7 34 55.4 33.9 55.2 C 33.9 54.9 33.8 54.7 33.8 54.4 C 33.8 54.2 33.8 53.8 33.9 53.5 C 34 53.3 34.1 53 34.3 52.7 C 34.5 52.5 34.7 52.4 34.8 52.2 C 35 52 35.2 51.9 35.4 51.8 C 35.6 51.7 35.9 51.7 36.1 51.7 C 36.2 51.8 36.4 52 36.5 52.1 C 36.7 52.3 36.7 52.6 36.8 52.8 C 36.9 53 36.9 53.3 36.9 53.6 C 37 53.8 36.9 54.2 36.8 54.5 Z', from: 5 },
        { tone: 'base', d: 'M 36.3 54.1 C 36.2 54.3 36.1 54.6 36 54.7 C 35.8 54.9 35.7 55.1 35.5 55.2 C 35.4 55.3 35.2 55.5 35 55.5 C 34.9 55.6 34.7 55.7 34.5 55.6 C 34.4 55.6 34.3 55.4 34.2 55.3 C 34.1 55.1 34 54.9 34 54.7 C 33.9 54.5 33.9 54.3 33.8 54.1 C 33.8 53.9 33.9 53.6 33.9 53.4 C 34 53.1 34.1 52.9 34.3 52.7 C 34.4 52.5 34.6 52.4 34.7 52.3 C 34.9 52.1 35 52 35.2 51.9 C 35.4 51.8 35.6 51.8 35.7 51.8 C 35.8 51.9 36 52 36.1 52.2 C 36.2 52.3 36.2 52.5 36.3 52.7 C 36.3 52.9 36.4 53.1 36.4 53.4 C 36.4 53.6 36.4 53.9 36.3 54.1 Z', from: 5 },
        { tone: 'light', c: [34.9, 53.4, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 35.4 46 Q 34.6 46.5 33.9 47 L 33.6 46.5 Q 34.3 46 35 45.5 Z', from: 5 },
        { tone: 'deep', d: 'M 35.2 47.7 C 35.3 48 35.3 48.3 35.3 48.6 C 35.3 48.9 35.2 49.1 35.2 49.3 C 35.1 49.6 35 49.8 34.9 50 C 34.8 50.2 34.6 50.4 34.4 50.4 C 34.2 50.5 34 50.4 33.8 50.4 C 33.6 50.3 33.4 50.1 33.2 49.9 C 33 49.8 32.8 49.6 32.7 49.4 C 32.5 49.2 32.3 48.9 32.2 48.6 C 32.1 48.3 32.1 48 32.1 47.7 C 32.1 47.5 32.2 47.2 32.3 47 C 32.4 46.7 32.4 46.5 32.5 46.3 C 32.7 46.1 32.8 45.9 33 45.9 C 33.2 45.8 33.4 45.9 33.6 46 C 33.8 46 34 46.2 34.2 46.4 C 34.4 46.5 34.6 46.7 34.8 46.9 C 34.9 47.1 35.1 47.4 35.2 47.7 Z', from: 5 },
        { tone: 'base', d: 'M 34.7 47.5 C 34.7 47.8 34.8 48 34.8 48.3 C 34.8 48.5 34.7 48.7 34.6 48.9 C 34.6 49.1 34.5 49.3 34.4 49.4 C 34.3 49.6 34.2 49.7 34.1 49.8 C 33.9 49.8 33.7 49.8 33.6 49.7 C 33.4 49.6 33.2 49.5 33.1 49.4 C 32.9 49.2 32.8 49.1 32.6 48.9 C 32.5 48.7 32.4 48.5 32.3 48.3 C 32.2 48 32.2 47.7 32.2 47.5 C 32.2 47.3 32.3 47.1 32.3 46.9 C 32.4 46.7 32.4 46.5 32.5 46.3 C 32.6 46.2 32.8 46 32.9 46 C 33 46 33.2 46 33.4 46.1 C 33.6 46.1 33.7 46.3 33.9 46.4 C 34 46.5 34.2 46.7 34.3 46.9 C 34.5 47.1 34.6 47.3 34.7 47.5 Z', from: 5 },
        { tone: 'light', c: [33.3, 47.6, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 36.4 41.3 Q 37.1 41.8 37.8 42.3 L 37.5 42.8 Q 36.7 42.4 36 41.9 Z', from: 5 },
        { tone: 'deep', d: 'M 39.2 44.5 C 39.1 44.7 38.9 45 38.7 45.2 C 38.6 45.5 38.4 45.6 38.2 45.8 C 38 45.9 37.8 46.1 37.6 46.2 C 37.4 46.3 37.2 46.3 37 46.3 C 36.8 46.2 36.6 46 36.5 45.9 C 36.4 45.7 36.3 45.4 36.2 45.2 C 36.2 44.9 36.1 44.7 36.1 44.4 C 36.1 44.1 36.1 43.8 36.2 43.5 C 36.3 43.3 36.5 43 36.6 42.7 C 36.8 42.5 37 42.4 37.2 42.2 C 37.4 42 37.6 41.9 37.8 41.8 C 38 41.7 38.2 41.7 38.4 41.7 C 38.6 41.8 38.7 42 38.9 42.1 C 39 42.3 39 42.6 39.1 42.8 C 39.2 43 39.3 43.3 39.3 43.6 C 39.3 43.8 39.3 44.2 39.2 44.5 Z', from: 5 },
        { tone: 'base', d: 'M 38.6 44.1 C 38.6 44.3 38.4 44.6 38.3 44.7 C 38.2 44.9 38 45.1 37.8 45.2 C 37.7 45.3 37.5 45.5 37.4 45.5 C 37.2 45.6 37 45.7 36.9 45.6 C 36.7 45.6 36.6 45.4 36.5 45.3 C 36.4 45.1 36.3 44.9 36.3 44.7 C 36.2 44.5 36.2 44.3 36.2 44.1 C 36.2 43.9 36.2 43.6 36.3 43.4 C 36.3 43.1 36.5 42.9 36.6 42.7 C 36.7 42.5 36.9 42.4 37 42.3 C 37.2 42.1 37.4 42 37.5 41.9 C 37.7 41.8 37.9 41.8 38 41.8 C 38.2 41.9 38.3 42 38.4 42.2 C 38.5 42.3 38.5 42.5 38.6 42.7 C 38.7 42.9 38.7 43.1 38.7 43.4 C 38.7 43.6 38.7 43.9 38.6 44.1 Z', from: 5 },
        { tone: 'light', c: [37.3, 43.4, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 31.1 69.8 C 30.4 66.6 28.5 55.8 27.2 50.8 C 25.9 45.9 24 41.7 23.3 39.9 L 22.7 40.1 C 23.2 41.9 24.8 46.1 25.8 51.2 C 26.8 56.2 28.4 67 28.9 70.2 Z', from: 5 },
        { tone: 'stemdark', d: 'M 29.5 61.4 Q 28.7 61.8 28 62.3 L 27.6 61.8 Q 28.4 61.3 29.1 60.8 Z', from: 5 },
        { tone: 'deep', d: 'M 29.3 63 C 29.4 63.3 29.4 63.6 29.4 63.9 C 29.4 64.2 29.3 64.4 29.2 64.7 C 29.2 64.9 29.1 65.1 29 65.3 C 28.9 65.5 28.7 65.7 28.5 65.7 C 28.3 65.8 28.1 65.7 27.9 65.7 C 27.7 65.6 27.5 65.4 27.3 65.3 C 27.1 65.1 26.9 64.9 26.7 64.7 C 26.6 64.5 26.4 64.2 26.3 63.9 C 26.2 63.6 26.2 63.3 26.2 63 C 26.2 62.8 26.3 62.5 26.4 62.3 C 26.4 62 26.5 61.8 26.6 61.6 C 26.8 61.4 26.9 61.2 27.1 61.2 C 27.3 61.1 27.5 61.2 27.7 61.3 C 27.9 61.3 28.1 61.5 28.3 61.7 C 28.5 61.8 28.7 62 28.9 62.2 C 29 62.4 29.2 62.7 29.3 63 Z', from: 5 },
        { tone: 'base', d: 'M 28.8 62.8 C 28.8 63.1 28.8 63.3 28.8 63.6 C 28.8 63.8 28.8 64 28.7 64.2 C 28.7 64.4 28.6 64.6 28.5 64.7 C 28.4 64.9 28.3 65 28.1 65.1 C 28 65.1 27.8 65.1 27.6 65 C 27.5 64.9 27.3 64.8 27.2 64.7 C 27 64.5 26.9 64.4 26.7 64.2 C 26.6 64 26.4 63.8 26.4 63.6 C 26.3 63.3 26.3 63.1 26.3 62.8 C 26.3 62.6 26.4 62.4 26.4 62.2 C 26.5 62 26.5 61.8 26.6 61.7 C 26.7 61.5 26.8 61.3 27 61.3 C 27.1 61.3 27.3 61.3 27.5 61.4 C 27.6 61.4 27.8 61.6 28 61.7 C 28.1 61.9 28.3 62 28.4 62.2 C 28.5 62.4 28.7 62.6 28.8 62.8 Z', from: 5 },
        { tone: 'light', c: [27.4, 62.9, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 28.6 53.3 Q 29.3 53.8 30.1 54.3 L 29.7 54.8 Q 29 54.4 28.2 53.9 Z', from: 5 },
        { tone: 'deep', d: 'M 31.4 56.5 C 31.3 56.7 31.1 57 31 57.2 C 30.8 57.5 30.6 57.6 30.4 57.8 C 30.2 57.9 30 58.1 29.8 58.2 C 29.6 58.3 29.4 58.3 29.2 58.3 C 29 58.2 28.8 58 28.7 57.9 C 28.6 57.7 28.5 57.4 28.5 57.2 C 28.4 56.9 28.3 56.7 28.3 56.4 C 28.3 56.2 28.3 55.8 28.4 55.5 C 28.5 55.3 28.7 55 28.8 54.7 C 29 54.5 29.2 54.4 29.4 54.2 C 29.6 54 29.8 53.9 30 53.8 C 30.2 53.7 30.4 53.7 30.6 53.7 C 30.8 53.8 31 54 31.1 54.1 C 31.2 54.3 31.3 54.6 31.3 54.8 C 31.4 55 31.5 55.3 31.5 55.6 C 31.5 55.8 31.5 56.2 31.4 56.5 Z', from: 5 },
        { tone: 'base', d: 'M 30.9 56.1 C 30.8 56.3 30.6 56.6 30.5 56.7 C 30.4 56.9 30.2 57.1 30.1 57.2 C 29.9 57.3 29.7 57.5 29.6 57.5 C 29.4 57.6 29.2 57.7 29.1 57.6 C 28.9 57.6 28.8 57.4 28.7 57.3 C 28.6 57.1 28.6 56.9 28.5 56.7 C 28.4 56.5 28.4 56.3 28.4 56.1 C 28.4 55.9 28.4 55.6 28.5 55.4 C 28.5 55.1 28.7 54.9 28.8 54.7 C 28.9 54.5 29.1 54.4 29.3 54.3 C 29.4 54.1 29.6 54 29.7 53.9 C 29.9 53.8 30.1 53.8 30.2 53.8 C 30.4 53.9 30.5 54 30.6 54.2 C 30.7 54.3 30.8 54.5 30.8 54.7 C 30.9 54.9 30.9 55.1 30.9 55.4 C 30.9 55.6 30.9 55.9 30.9 56.1 Z', from: 5 },
        { tone: 'light', c: [29.5, 55.4, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 27.3 48 Q 26.5 48.5 25.8 49 L 25.4 48.5 Q 26.2 48 26.9 47.5 Z', from: 5 },
        { tone: 'deep', d: 'M 27.1 49.7 C 27.2 50 27.2 50.3 27.2 50.6 C 27.2 50.9 27.1 51.1 27 51.3 C 27 51.6 26.9 51.8 26.8 52 C 26.7 52.2 26.5 52.4 26.3 52.4 C 26.1 52.5 25.9 52.4 25.7 52.4 C 25.5 52.3 25.3 52.1 25.1 51.9 C 24.9 51.8 24.7 51.6 24.5 51.4 C 24.4 51.2 24.2 50.9 24.1 50.6 C 24 50.3 24 50 24 49.7 C 24 49.5 24.1 49.2 24.2 49 C 24.2 48.7 24.3 48.5 24.4 48.3 C 24.5 48.1 24.7 47.9 24.9 47.9 C 25.1 47.8 25.3 47.9 25.5 48 C 25.7 48 25.9 48.2 26.1 48.4 C 26.3 48.5 26.5 48.7 26.7 48.9 C 26.8 49.1 27 49.4 27.1 49.7 Z', from: 5 },
        { tone: 'base', d: 'M 26.6 49.5 C 26.6 49.8 26.6 50 26.6 50.3 C 26.6 50.5 26.6 50.7 26.5 50.9 C 26.5 51.1 26.4 51.3 26.3 51.4 C 26.2 51.6 26.1 51.7 25.9 51.8 C 25.8 51.8 25.6 51.8 25.4 51.7 C 25.3 51.6 25.1 51.5 25 51.4 C 24.8 51.2 24.7 51.1 24.5 50.9 C 24.4 50.7 24.2 50.5 24.2 50.3 C 24.1 50 24.1 49.7 24.1 49.5 C 24.1 49.3 24.1 49.1 24.2 48.9 C 24.3 48.7 24.3 48.5 24.4 48.3 C 24.5 48.2 24.6 48 24.8 48 C 24.9 48 25.1 48 25.3 48.1 C 25.4 48.1 25.6 48.3 25.8 48.4 C 25.9 48.5 26.1 48.7 26.2 48.9 C 26.3 49.1 26.5 49.3 26.6 49.5 Z', from: 5 },
        { tone: 'light', c: [25.2, 49.6, 0.6], from: 5 },
        { tone: 'stemdark', d: 'M 25.6 43.3 Q 26.3 43.8 27.1 44.3 L 26.7 44.8 Q 26 44.4 25.2 43.9 Z', from: 5 },
        { tone: 'deep', d: 'M 28.4 46.5 C 28.3 46.7 28.1 47 28 47.2 C 27.8 47.5 27.6 47.6 27.4 47.8 C 27.2 47.9 27 48.1 26.8 48.2 C 26.6 48.3 26.4 48.3 26.2 48.3 C 26 48.2 25.8 48 25.7 47.9 C 25.6 47.7 25.5 47.4 25.5 47.2 C 25.4 46.9 25.3 46.7 25.3 46.4 C 25.3 46.1 25.3 45.8 25.4 45.5 C 25.5 45.3 25.7 45 25.8 44.7 C 26 44.5 26.2 44.4 26.4 44.2 C 26.6 44 26.8 43.9 27 43.8 C 27.2 43.7 27.4 43.7 27.6 43.7 C 27.8 43.8 28 44 28.1 44.1 C 28.2 44.3 28.3 44.6 28.3 44.8 C 28.4 45 28.5 45.3 28.5 45.6 C 28.5 45.8 28.5 46.2 28.4 46.5 Z', from: 5 },
        { tone: 'base', d: 'M 27.9 46.1 C 27.8 46.3 27.6 46.6 27.5 46.7 C 27.4 46.9 27.2 47.1 27.1 47.2 C 26.9 47.3 26.7 47.5 26.6 47.5 C 26.4 47.6 26.2 47.7 26.1 47.6 C 25.9 47.6 25.8 47.4 25.7 47.3 C 25.6 47.1 25.6 46.9 25.5 46.7 C 25.5 46.5 25.4 46.3 25.4 46.1 C 25.4 45.9 25.4 45.6 25.5 45.4 C 25.5 45.1 25.7 44.9 25.8 44.7 C 26 44.5 26.1 44.4 26.3 44.3 C 26.4 44.1 26.6 44 26.7 43.9 C 26.9 43.8 27.1 43.8 27.2 43.8 C 27.4 43.9 27.5 44 27.6 44.2 C 27.7 44.3 27.8 44.5 27.8 44.7 C 27.9 44.9 27.9 45.1 27.9 45.4 C 27.9 45.6 27.9 45.9 27.9 46.1 Z', from: 5 },
        { tone: 'light', c: [26.5, 45.4, 0.6], from: 5 }
      ]
    },
    rose: {
      trunk: 'M 28.2 96 Q 29.1 90 28.6 84 L 31.4 84 Q 30.9 90 31.8 96 Z',
      trunkShort: 'M 28.4 96 Q 29.2 93 28.7 90 L 31.3 90 Q 30.8 93 31.6 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[23, 40], [41, 52], [31, 47], [27, 56], [36, 44], [30, 33], [16, 48], [48, 46], [30, 60]],
      parts: [
        { tone: 'stemshade', d: 'M 28.9 94 Q 29.2 84 29.2 74 L 30.8 74 Q 31.1 84 31.1 94 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 29.1 94 Q 29.3 84 29.3 74 L 30 74 Q 30.2 84 30.2 94 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30 89 Q 30.6 89.5 32.1 89 Q 30.6 88.5 30 89 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30 84 Q 29.4 83.5 27.9 84 Q 29.4 84.5 30 84 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30 79 Q 30.6 79.5 32.1 79 Q 30.6 78.5 30 79 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29 84 Q 25.3 83 22.3 86.2 Q 26.5 86.6 29 84 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 28.6 84.1 Q 25.8 84.7 23.3 85.9 Q 26 85.3 28.6 84.1 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29 84 Q 26.7 80.9 22.4 81.6 Q 25.4 84.5 29 84 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 28.6 83.9 Q 26.1 82.6 23.3 81.9 Q 25.9 83.2 28.6 83.9 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29 84 Q 29.1 80.2 25.3 78.1 Q 25.9 82.2 29 84 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 28.8 83.6 Q 27.5 81.1 25.8 78.9 Q 27 81.4 28.8 83.6 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 30.3 70.1 Q 30.7 74.3 34.5 72.4 Q 34 68.2 30.3 70.1 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.6 69.5 Q 30.5 72.8 33.7 71.7 Q 32.8 68.4 29.6 69.5 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.9 70.3 Q 26.1 72 29.1 75 Q 32.9 73.3 29.9 70.3 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.3 69.6 Q 26.4 71.4 28.3 74.3 Q 31.2 72.5 29.3 69.6 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 30.2 69.8 Q 34.3 70.7 33.7 66.5 Q 29.6 65.6 30.2 69.8 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 29.6 69.1 Q 33 69.2 33 65.8 Q 29.5 65.7 29.6 69.1 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.7 70 Q 26.9 66.9 24.9 70.7 Q 27.8 73.8 29.7 70 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29 69.4 Q 26.4 67.2 24.2 69.9 Q 26.9 72.1 29 69.4 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.9 69.7 Q 32 66.1 27.8 65.4 Q 25.7 69 29.9 69.7 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.2 69.1 Q 30.4 65.8 27.1 64.6 Q 25.9 67.9 29.2 69.1 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.7 69.8 Q 28.7 71.5 30.6 72.1 Q 31.6 70.3 29.7 69.8 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 29.8 69.5 Q 31.6 70.4 32.1 68.4 Q 30.3 67.5 29.8 69.5 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.4 69.7 Q 27.6 68.6 26.9 70.6 Q 28.7 71.6 29.4 69.7 Z', from: 2, to: 2 },
        { tone: 'light', d: 'M 29.5 69.4 Q 30.4 67.5 28.4 66.9 Q 27.5 68.8 29.5 69.4 Z', from: 2, to: 2 },
        { tone: 'deep', c: [30, 70, 1.2], from: 2, to: 2 },
        { tone: 'light', c: [29.7, 69.6, 0.7], from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 28.7 94.2 Q 25.4 78.3 23.1 62.2 L 24.9 61.8 Q 27.6 77.9 31.3 93.8 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29 94.1 Q 25.6 78.2 23.3 62.1 L 24 61.9 Q 26.6 78 30.3 93.9 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 28.5 86 Q 29.2 86.4 30.6 85.6 Q 29 85.4 28.5 86 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 27 78 Q 26.3 77.6 24.9 78.4 Q 26.5 78.6 27 78 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 25.5 70 Q 26.2 70.4 27.6 69.6 Q 26 69.4 25.5 70 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 28.9 93.6 Q 34.7 82.1 38.2 69.7 L 39.8 70.3 Q 36.6 82.8 31.1 94.4 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.1 93.8 Q 34.8 82.3 38.3 69.9 L 39 70.1 Q 35.7 82.6 30.2 94.2 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 32.3 88 Q 32.7 88.7 34.2 88.7 Q 33 87.8 32.3 88 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 34.5 82 Q 34.1 81.3 32.5 81.3 Q 33.7 82.2 34.5 82 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 36.8 76 Q 37.2 76.7 38.7 76.7 Q 37.5 75.8 36.8 76 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28 82 Q 23.8 80.7 20.3 84.2 Q 25 84.9 28 82 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 27.5 82.1 Q 24.4 82.7 21.4 83.9 Q 24.6 83.3 27.5 82.1 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28 82 Q 25.5 78.4 20.6 79 Q 23.9 82.4 28 82 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 27.6 81.8 Q 24.7 80.3 21.6 79.4 Q 24.5 80.9 27.6 81.8 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 28 82 Q 28.2 77.6 24 75.1 Q 24.5 79.8 28 82 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 27.8 81.6 Q 26.5 78.6 24.6 76 Q 25.9 79 27.8 81.6 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 33 78 Q 36.7 76.3 37 71.6 Q 33.3 74.1 33 78 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 33.2 77.6 Q 35.1 75.2 36.4 72.5 Q 34.6 74.9 33.2 77.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 33 78 Q 37 78.9 40 75.4 Q 35.6 75.1 33 78 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 33.4 77.8 Q 36.3 77.1 39.1 75.8 Q 36.1 76.5 33.4 77.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 33 78 Q 35.6 81.2 40.1 80.3 Q 36.8 77.4 33 78 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 33.4 78.1 Q 36.2 79.4 39.1 80 Q 36.4 78.8 33.4 78.1 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 24.3 58.2 Q 24.8 63.2 29.4 60.9 Q 28.8 55.9 24.3 58.2 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 23.5 57.4 Q 24.6 61.3 28.5 60 Q 27.4 56.1 23.5 57.4 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 23.9 58.4 Q 19.3 60.4 22.9 64 Q 27.5 62 23.9 58.4 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 23.1 57.6 Q 19.6 59.7 22 63.1 Q 25.5 61 23.1 57.6 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 24.3 57.8 Q 29.2 58.8 28.5 53.8 Q 23.5 52.7 24.3 57.8 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 23.5 57 Q 27.6 57 27.6 52.9 Q 23.4 52.8 23.5 57 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 23.6 58 Q 20.3 54.3 17.9 58.8 Q 21.3 62.5 23.6 58 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 22.9 57.3 Q 19.6 54.6 17 57.9 Q 20.3 60.5 22.9 57.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 23.8 57.7 Q 26.4 53.3 21.4 52.5 Q 18.8 56.9 23.8 57.7 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 23.1 56.9 Q 24.4 52.9 20.5 51.6 Q 19.1 55.5 23.1 56.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 23.6 57.7 Q 22.4 59.8 24.7 60.5 Q 25.9 58.4 23.6 57.7 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 23.7 57.4 Q 25.9 58.5 26.5 56.1 Q 24.3 55 23.7 57.4 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 23.3 57.6 Q 21.1 56.4 20.3 58.7 Q 22.5 59.9 23.3 57.6 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 23.4 57.3 Q 24.5 55 22.1 54.3 Q 21 56.6 23.4 57.3 Z', from: 3, to: 3 },
        { tone: 'deep', c: [24, 58, 1.4], from: 3, to: 3 },
        { tone: 'light', c: [23.6, 57.6, 0.8], from: 3, to: 3 },
        { tone: 'deep', d: 'M 40.3 66.1 Q 40.7 70.5 44.7 68.5 Q 44.2 64.2 40.3 66.1 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 39.6 65.5 Q 40.5 68.9 43.9 67.8 Q 43 64.3 39.6 65.5 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 39.9 66.3 Q 35.9 68.1 39 71.2 Q 43 69.4 39.9 66.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 39.3 65.6 Q 36.2 67.5 38.2 70.4 Q 41.3 68.6 39.3 65.6 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 40.2 65.8 Q 44.5 66.7 43.9 62.4 Q 39.6 61.4 40.2 65.8 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 39.5 65.1 Q 43.1 65.2 43.1 61.6 Q 39.5 61.5 39.5 65.1 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 39.7 66 Q 36.8 62.8 34.7 66.7 Q 37.7 69.9 39.7 66 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 39 65.4 Q 36.2 63.1 34 65.9 Q 36.8 68.2 39 65.4 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 39.9 65.7 Q 42.1 61.9 37.7 61.2 Q 35.5 65 39.9 65.7 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 39.2 65 Q 40.4 61.6 37 60.4 Q 35.7 63.9 39.2 65 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 39.6 65.8 Q 38.6 67.6 40.6 68.2 Q 41.7 66.3 39.6 65.8 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 39.8 65.5 Q 41.7 66.4 42.2 64.4 Q 40.3 63.4 39.8 65.5 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 39.4 65.6 Q 37.5 64.6 36.8 66.6 Q 38.7 67.7 39.4 65.6 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 39.5 65.4 Q 40.4 63.4 38.4 62.8 Q 37.4 64.8 39.5 65.4 Z', from: 3, to: 3 },
        { tone: 'deep', c: [40, 66, 1.2], from: 3, to: 3 },
        { tone: 'light', c: [39.7, 65.6, 0.7], from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 28.5 94.2 Q 25.2 73.3 23 52.1 L 25 51.9 Q 27.8 72.9 31.5 93.8 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 28.9 94.1 Q 25.5 73.2 23.2 52.1 L 24.1 51.9 Q 26.7 73 30.4 93.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 28.5 83.5 Q 29.2 83.9 30.6 83.2 Q 29.1 82.9 28.5 83.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 27 73 Q 26.3 72.6 24.9 73.3 Q 26.4 73.6 27 73 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 25.5 62.5 Q 26.2 62.9 27.6 62.2 Q 26.1 61.9 25.5 62.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 28.7 93.5 Q 35.8 78.1 40.1 61.7 L 41.9 62.3 Q 38.1 78.9 31.3 94.5 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29 93.8 Q 36 78.3 40.2 61.9 L 41 62.1 Q 37.1 78.7 30.3 94.2 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 32.8 86 Q 33.2 86.7 34.7 86.7 Q 33.5 85.7 32.8 86 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 35.5 78 Q 35.1 77.3 33.5 77.3 Q 34.7 78.3 35.5 78 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 38.3 70 Q 38.7 70.7 40.2 70.7 Q 39 69.7 38.3 70 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 28.7 94 Q 29.7 77 30.1 60 L 31.9 60 Q 31.9 77 31.3 94 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29 94 Q 29.9 77 30.3 60 L 31 60 Q 30.9 77 30.3 94 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.3 85.5 Q 30.9 86 32.3 85.6 Q 30.9 85 30.3 85.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.5 77 Q 29.9 76.5 28.4 76.9 Q 29.9 77.5 30.5 77 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.8 68.5 Q 31.4 69 32.8 68.6 Q 31.4 68 30.8 68.5 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 27 80 Q 22.3 78.4 18.3 82.2 Q 23.5 83.1 27 80 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 26.5 80.1 Q 22.9 80.6 19.5 81.9 Q 23.1 81.4 26.5 80.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 27 80 Q 24.3 75.8 18.8 76.3 Q 22.3 80.3 27 80 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 26.5 79.8 Q 23.4 78 19.9 76.9 Q 23.1 78.7 26.5 79.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 27 80 Q 27.4 75.1 22.8 72.1 Q 23.1 77.4 27 80 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 26.7 79.5 Q 25.4 76.2 23.4 73.2 Q 24.7 76.5 26.7 79.5 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 34 76 Q 38.2 74 38.5 68.8 Q 34.3 71.6 34 76 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34.3 75.6 Q 36.4 72.9 37.9 69.8 Q 35.8 72.5 34.3 75.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34 76 Q 38.5 77.1 42 73.1 Q 37 72.7 34 76 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34.5 75.8 Q 37.8 75 40.9 73.5 Q 37.6 74.3 34.5 75.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34 76 Q 36.9 79.6 42.1 78.6 Q 38.3 75.3 34 76 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 34.5 76.2 Q 37.6 77.5 41 78.3 Q 37.8 76.9 34.5 76.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 26 66 Q 21.8 64.9 18.4 68.5 Q 23.1 69 26 66 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 25.5 66.1 Q 22.4 66.8 19.5 68.1 Q 22.6 67.5 25.5 66.1 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 26 66 Q 23.4 62.5 18.5 63.3 Q 21.9 66.5 26 66 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 25.5 65.8 Q 22.7 64.4 19.5 63.6 Q 22.4 65.1 25.5 65.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 26 66 Q 26.1 61.6 21.8 59.2 Q 22.4 63.9 26 66 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 25.7 65.6 Q 24.3 62.7 22.4 60.2 Q 23.8 63.1 25.7 65.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 24.3 48.2 Q 24.9 53.7 29.9 51.2 Q 29.3 45.7 24.3 48.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 23.5 47.3 Q 24.7 51.7 28.9 50.2 Q 27.7 45.9 23.5 47.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 23.9 48.4 Q 18.8 50.7 22.8 54.6 Q 27.8 52.3 23.9 48.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 23.1 47.5 Q 19.2 49.9 21.8 53.6 Q 25.6 51.3 23.1 47.5 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 24.3 47.7 Q 29.7 48.9 28.9 43.4 Q 23.4 42.2 24.3 47.7 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 23.4 46.9 Q 28 46.9 27.9 42.4 Q 23.4 42.3 23.4 46.9 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 23.6 48.1 Q 19.9 43.9 17.3 48.9 Q 21.1 53 23.6 48.1 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 22.7 47.2 Q 19.2 44.3 16.3 47.9 Q 19.9 50.8 22.7 47.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 23.8 47.6 Q 26.6 42.8 21.1 41.9 Q 18.3 46.7 23.8 47.6 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 23 46.8 Q 24.5 42.4 20.1 40.9 Q 18.6 45.3 23 46.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 23.5 47.7 Q 22.2 50 24.8 50.8 Q 26.1 48.4 23.5 47.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 23.7 47.3 Q 26.1 48.6 26.8 45.9 Q 24.3 44.7 23.7 47.3 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 23.2 47.5 Q 20.8 46.2 20 48.8 Q 22.3 50.1 23.2 47.5 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 23.3 47.2 Q 24.6 44.7 21.9 44 Q 20.7 46.4 23.3 47.2 Z', from: 4, to: 4 },
        { tone: 'deep', c: [24, 48, 1.6], from: 4, to: 4 },
        { tone: 'light', c: [23.6, 47.5, 0.9], from: 4, to: 4 },
        { tone: 'deep', d: 'M 42.3 58.2 Q 42.8 63 47.2 60.8 Q 46.7 56 42.3 58.2 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.5 57.4 Q 42.6 61.2 46.3 60 Q 45.3 56.2 41.5 57.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.9 58.3 Q 37.5 60.3 40.9 63.8 Q 45.4 61.8 41.9 58.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.2 57.6 Q 37.8 59.7 40 62.9 Q 43.4 60.9 41.2 57.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 42.3 57.8 Q 47 58.8 46.3 53.9 Q 41.5 52.9 42.3 57.8 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 41.5 57 Q 45.5 57.1 45.4 53.1 Q 41.4 53 41.5 57 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.7 58 Q 38.4 54.4 36.1 58.8 Q 39.4 62.4 41.7 58 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 40.9 57.3 Q 37.8 54.7 35.3 57.9 Q 38.4 60.4 40.9 57.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.9 57.7 Q 44.3 53.4 39.5 52.7 Q 37 56.9 41.9 57.7 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 41.1 56.9 Q 42.4 53.1 38.6 51.8 Q 37.3 55.6 41.1 56.9 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.6 57.7 Q 40.4 59.8 42.7 60.4 Q 43.9 58.4 41.6 57.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 41.7 57.4 Q 43.8 58.5 44.4 56.2 Q 42.3 55.1 41.7 57.4 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 41.3 57.6 Q 39.2 56.4 38.5 58.7 Q 40.5 59.9 41.3 57.6 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 41.4 57.3 Q 42.5 55.1 40.2 54.5 Q 39.1 56.6 41.4 57.3 Z', from: 4, to: 4 },
        { tone: 'deep', c: [42, 58, 1.4], from: 4, to: 4 },
        { tone: 'light', c: [41.6, 57.6, 0.8], from: 4, to: 4 },
        { tone: 'deep', d: 'M 31.3 56.1 Q 31.7 60.5 35.7 58.5 Q 35.2 54.2 31.3 56.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30.6 55.5 Q 31.5 58.9 34.9 57.8 Q 34 54.3 30.6 55.5 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30.9 56.3 Q 26.9 58.1 30 61.2 Q 34 59.4 30.9 56.3 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30.3 55.6 Q 27.2 57.5 29.2 60.4 Q 32.3 58.6 30.3 55.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 31.2 55.8 Q 35.5 56.7 34.9 52.4 Q 30.6 51.4 31.2 55.8 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 30.5 55.1 Q 34.1 55.2 34.1 51.6 Q 30.5 51.5 30.5 55.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30.7 56 Q 27.8 52.8 25.7 56.7 Q 28.7 59.9 30.7 56 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30 55.4 Q 27.2 53.1 25 55.9 Q 27.8 58.2 30 55.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30.9 55.7 Q 33.1 51.9 28.7 51.2 Q 26.5 55 30.9 55.7 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30.2 55 Q 31.4 51.6 28 50.4 Q 26.7 53.9 30.2 55 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30.6 55.8 Q 29.6 57.6 31.6 58.2 Q 32.7 56.3 30.6 55.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 30.8 55.5 Q 32.7 56.4 33.2 54.4 Q 31.3 53.4 30.8 55.5 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30.4 55.6 Q 28.5 54.6 27.8 56.6 Q 29.7 57.7 30.4 55.6 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 30.5 55.4 Q 31.4 53.4 29.4 52.8 Q 28.4 54.8 30.5 55.4 Z', from: 4, to: 4 },
        { tone: 'deep', c: [31, 56, 1.2], from: 4, to: 4 },
        { tone: 'light', c: [30.7, 55.6, 0.7], from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 28.4 94.2 Q 24.6 69.3 21.9 44.2 L 24.1 43.8 Q 27.3 68.9 31.6 93.8 Z', from: 5 },
        { tone: 'stem', d: 'M 28.9 94.1 Q 24.8 69.2 22.2 44.1 L 23.1 43.9 Q 26.1 69 30.4 93.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 28.3 81.5 Q 28.9 81.9 30.3 81.2 Q 28.8 80.9 28.3 81.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 26.5 69 Q 25.8 68.6 24.4 69.3 Q 25.9 69.6 26.5 69 Z', from: 5 },
        { tone: 'stemshade', d: 'M 24.8 56.5 Q 25.4 56.9 26.8 56.2 Q 25.3 55.9 24.8 56.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 28.6 93.6 Q 35.8 75.1 40 55.7 L 42 56.3 Q 38.2 75.8 31.4 94.4 Z', from: 5 },
        { tone: 'stem', d: 'M 28.9 93.8 Q 36 75.2 40.2 55.9 L 41.1 56.1 Q 37.1 75.6 30.4 94.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 32.8 84.5 Q 33.2 85.2 34.8 85.1 Q 33.5 84.2 32.8 84.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 35.5 75 Q 35 74.3 33.5 74.4 Q 34.8 75.3 35.5 75 Z', from: 5 },
        { tone: 'stemshade', d: 'M 38.3 65.5 Q 38.7 66.2 40.3 66.1 Q 39 65.2 38.3 65.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 28.6 94 Q 29.6 73 30 52 L 32 52 Q 32 73 31.4 94 Z', from: 5 },
        { tone: 'stem', d: 'M 28.9 94 Q 29.8 73 30.2 52 L 31.1 52 Q 31 73 30.3 94 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.3 83.5 Q 30.9 84 32.3 83.5 Q 30.9 83 30.3 83.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.5 73 Q 29.9 72.5 28.4 73 Q 29.9 73.5 30.5 73 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.8 62.5 Q 31.4 63 32.8 62.5 Q 31.4 62 30.8 62.5 Z', from: 5 },
        { tone: 'stemlight', d: 'M 27 82 Q 22.1 80.2 17.7 84.1 Q 23.3 85.2 27 82 Z', from: 5 },
        { tone: 'stem', d: 'M 26.4 82.1 Q 22.7 82.6 19 83.8 Q 22.8 83.4 26.4 82.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 27 82 Q 24.2 77.6 18.4 78 Q 22.1 82.2 27 82 Z', from: 5 },
        { tone: 'stem', d: 'M 26.5 81.8 Q 23.2 79.8 19.6 78.5 Q 22.9 80.5 26.5 81.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 27 82 Q 27.6 76.8 22.7 73.5 Q 23 79.1 27 82 Z', from: 5 },
        { tone: 'stem', d: 'M 26.7 81.5 Q 25.4 77.9 23.3 74.7 Q 24.7 78.3 26.7 81.5 Z', from: 5 },
        { tone: 'stem', d: 'M 34 78 Q 38.4 75.8 38.5 70.2 Q 34.2 73.3 34 78 Z', from: 5 },
        { tone: 'stemshade', d: 'M 34.3 77.5 Q 36.4 74.6 37.9 71.3 Q 35.7 74.2 34.3 77.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 34 78 Q 38.8 79 42.3 74.6 Q 37 74.4 34 78 Z', from: 5 },
        { tone: 'stemshade', d: 'M 34.5 77.8 Q 38 76.8 41.2 75.1 Q 37.7 76.1 34.5 77.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 34 78 Q 37.2 81.7 42.7 80.5 Q 38.6 77.1 34 78 Z', from: 5 },
        { tone: 'stemshade', d: 'M 34.5 78.1 Q 37.9 79.5 41.4 80.1 Q 38.1 78.8 34.5 78.1 Z', from: 5 },
        { tone: 'stemlight', d: 'M 25 66 Q 20.5 64.8 16.9 68.6 Q 21.9 69.1 25 66 Z', from: 5 },
        { tone: 'stem', d: 'M 24.5 66.2 Q 21.2 66.9 18 68.3 Q 21.4 67.5 24.5 66.2 Z', from: 5 },
        { tone: 'stemlight', d: 'M 25 66 Q 22.2 62.3 17 63.1 Q 20.6 66.6 25 66 Z', from: 5 },
        { tone: 'stem', d: 'M 24.5 65.8 Q 21.4 64.3 18.1 63.5 Q 21.2 65 24.5 65.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 25 66 Q 25.1 61.3 20.5 58.8 Q 21.2 63.8 25 66 Z', from: 5 },
        { tone: 'stem', d: 'M 24.7 65.6 Q 23.2 62.5 21.1 59.8 Q 22.6 62.9 24.7 65.6 Z', from: 5 },
        { tone: 'stem', d: 'M 36 64 Q 40 62.3 40.5 57.4 Q 36.5 59.9 36 64 Z', from: 5 },
        { tone: 'stemshade', d: 'M 36.3 63.6 Q 38.3 61.1 39.8 58.3 Q 37.8 60.8 36.3 63.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 36 64 Q 40.2 65.1 43.6 61.5 Q 38.9 61 36 64 Z', from: 5 },
        { tone: 'stemshade', d: 'M 36.5 63.9 Q 39.6 63.2 42.5 61.9 Q 39.4 62.5 36.5 63.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 36 64 Q 38.6 67.5 43.5 66.7 Q 40.1 63.5 36 64 Z', from: 5 },
        { tone: 'stemshade', d: 'M 36.5 64.2 Q 39.3 65.6 42.5 66.4 Q 39.6 64.9 36.5 64.2 Z', from: 5 },
        { tone: 'deep', d: 'M 23.4 40.2 Q 24 46.3 29.4 43.5 Q 28.8 37.5 23.4 40.2 Z', from: 5 },
        { tone: 'deep', d: 'M 22.4 39.3 Q 23.7 44 28.4 42.4 Q 27.1 37.7 22.4 39.3 Z', from: 5 },
        { tone: 'deep', d: 'M 22.9 40.4 Q 17.4 42.9 21.6 47.2 Q 27.2 44.7 22.9 40.4 Z', from: 5 },
        { tone: 'deep', d: 'M 22 39.5 Q 17.8 42.1 20.6 46.1 Q 24.8 43.5 22 39.5 Z', from: 5 },
        { tone: 'deep', d: 'M 23.3 39.7 Q 29.3 41 28.3 35 Q 22.4 33.7 23.3 39.7 Z', from: 5 },
        { tone: 'base', d: 'M 22.4 38.8 Q 27.3 38.9 27.3 33.9 Q 22.3 33.8 22.4 38.8 Z', from: 5 },
        { tone: 'deep', d: 'M 22.6 40.1 Q 18.5 35.5 15.7 40.9 Q 19.8 45.5 22.6 40.1 Z', from: 5 },
        { tone: 'light', d: 'M 21.6 39.1 Q 17.7 35.9 14.6 39.9 Q 18.5 43 21.6 39.1 Z', from: 5 },
        { tone: 'deep', d: 'M 22.8 39.6 Q 25.9 34.3 19.9 33.4 Q 16.8 38.6 22.8 39.6 Z', from: 5 },
        { tone: 'light', d: 'M 21.9 38.7 Q 23.5 33.9 18.8 32.3 Q 17.1 37 21.9 38.7 Z', from: 5 },
        { tone: 'deep', d: 'M 22.5 39.7 Q 21.1 42.2 23.9 43 Q 25.3 40.5 22.5 39.7 Z', from: 5 },
        { tone: 'deep', d: 'M 22.7 39.3 Q 25.3 40.6 26 37.7 Q 23.4 36.4 22.7 39.3 Z', from: 5 },
        { tone: 'light', d: 'M 22.1 39.5 Q 19.5 38 18.6 40.9 Q 21.2 42.3 22.1 39.5 Z', from: 5 },
        { tone: 'light', d: 'M 22.3 39.1 Q 23.6 36.4 20.7 35.6 Q 19.4 38.3 22.3 39.1 Z', from: 5 },
        { tone: 'deep', c: [23, 40, 1.7], from: 5 },
        { tone: 'light', c: [22.5, 39.5, 0.9], from: 5 },
        { tone: 'deep', d: 'M 41.3 52.2 Q 41.9 57.4 46.5 55 Q 46 49.8 41.3 52.2 Z', from: 5 },
        { tone: 'deep', d: 'M 40.5 51.4 Q 41.6 55.4 45.6 54.1 Q 44.5 50 40.5 51.4 Z', from: 5 },
        { tone: 'deep', d: 'M 40.9 52.4 Q 36.2 54.5 39.8 58.2 Q 44.6 56.1 40.9 52.4 Z', from: 5 },
        { tone: 'deep', d: 'M 40.1 51.6 Q 36.5 53.8 38.9 57.3 Q 42.5 55.1 40.1 51.6 Z', from: 5 },
        { tone: 'deep', d: 'M 41.3 51.7 Q 46.4 52.8 45.6 47.7 Q 40.5 46.6 41.3 51.7 Z', from: 5 },
        { tone: 'base', d: 'M 40.5 50.9 Q 44.7 51 44.7 46.7 Q 40.4 46.7 40.5 50.9 Z', from: 5 },
        { tone: 'deep', d: 'M 40.6 52 Q 37.1 48.2 34.7 52.8 Q 38.2 56.7 40.6 52 Z', from: 5 },
        { tone: 'light', d: 'M 39.8 51.2 Q 36.5 48.5 33.8 51.9 Q 37.1 54.6 39.8 51.2 Z', from: 5 },
        { tone: 'deep', d: 'M 40.8 51.7 Q 43.5 47.1 38.3 46.3 Q 35.7 50.8 40.8 51.7 Z', from: 5 },
        { tone: 'light', d: 'M 40 50.8 Q 41.5 46.8 37.4 45.4 Q 35.9 49.4 40 50.8 Z', from: 5 },
        { tone: 'deep', d: 'M 40.6 51.7 Q 39.3 53.9 41.8 54.6 Q 43 52.4 40.6 51.7 Z', from: 5 },
        { tone: 'deep', d: 'M 40.7 51.4 Q 43 52.5 43.6 50.1 Q 41.3 48.9 40.7 51.4 Z', from: 5 },
        { tone: 'light', d: 'M 40.2 51.6 Q 38 50.3 37.2 52.8 Q 39.4 54 40.2 51.6 Z', from: 5 },
        { tone: 'light', d: 'M 40.4 51.2 Q 41.5 48.9 39.1 48.2 Q 37.9 50.5 40.4 51.2 Z', from: 5 },
        { tone: 'deep', c: [41, 52, 1.5], from: 5 },
        { tone: 'light', c: [40.6, 51.6, 0.8], from: 5 },
        { tone: 'deep', d: 'M 31.3 47.2 Q 31.8 52 36.2 49.8 Q 35.7 45 31.3 47.2 Z', from: 5 },
        { tone: 'deep', d: 'M 30.5 46.4 Q 31.6 50.2 35.3 49 Q 34.3 45.2 30.5 46.4 Z', from: 5 },
        { tone: 'deep', d: 'M 30.9 47.3 Q 26.5 49.3 29.9 52.8 Q 34.4 50.8 30.9 47.3 Z', from: 5 },
        { tone: 'deep', d: 'M 30.2 46.6 Q 26.8 48.7 29 51.9 Q 32.4 49.9 30.2 46.6 Z', from: 5 },
        { tone: 'deep', d: 'M 31.3 46.8 Q 36 47.8 35.3 42.9 Q 30.5 41.9 31.3 46.8 Z', from: 5 },
        { tone: 'base', d: 'M 30.5 46 Q 34.5 46.1 34.4 42.1 Q 30.4 42 30.5 46 Z', from: 5 },
        { tone: 'deep', d: 'M 30.7 47 Q 27.4 43.4 25.1 47.8 Q 28.4 51.4 30.7 47 Z', from: 5 },
        { tone: 'light', d: 'M 29.9 46.3 Q 26.8 43.7 24.3 46.9 Q 27.4 49.4 29.9 46.3 Z', from: 5 },
        { tone: 'deep', d: 'M 30.9 46.7 Q 33.3 42.4 28.5 41.7 Q 26 45.9 30.9 46.7 Z', from: 5 },
        { tone: 'light', d: 'M 30.1 45.9 Q 31.4 42.1 27.6 40.8 Q 26.3 44.6 30.1 45.9 Z', from: 5 },
        { tone: 'deep', d: 'M 30.6 46.7 Q 29.4 48.8 31.7 49.4 Q 32.9 47.4 30.6 46.7 Z', from: 5 },
        { tone: 'deep', d: 'M 30.7 46.4 Q 32.8 47.5 33.4 45.2 Q 31.3 44.1 30.7 46.4 Z', from: 5 },
        { tone: 'light', d: 'M 30.3 46.6 Q 28.2 45.4 27.5 47.7 Q 29.5 48.9 30.3 46.6 Z', from: 5 },
        { tone: 'light', d: 'M 30.4 46.3 Q 31.5 44.1 29.2 43.5 Q 28.1 45.6 30.4 46.3 Z', from: 5 },
        { tone: 'deep', c: [31, 47, 1.4], from: 5 },
        { tone: 'light', c: [30.6, 46.6, 0.8], from: 5 }
      ]
    },
    tomato: {
      trunk: 'M 28.1 96 Q 29.1 81 28.6 66 L 31.4 66 Q 31 81 31.9 96 Z',
      trunkShort: 'M 28.3 96 Q 29.2 89 28.7 82 L 31.3 82 Q 30.9 89 31.7 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[19, 74], [41, 72], [25, 62], [37, 60], [30, 50], [13, 66], [47, 64], [30, 68], [30, 42]],
      parts: [
        { tone: 'wood', d: 'M 34 95 Q 34.8 86.5 34.3 78 L 36.7 78 Q 36.3 86.5 37 95 Z', from: 2, to: 2 },
        { tone: 'wood-dark', d: 'M 35.8 95 Q 35.9 86.5 35.6 78 L 36.7 78 Q 36.3 86.5 37 95 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 33 87 Q 35.6 87.1 38 86 Q 35.4 85.9 33 87 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30 92 Q 27.8 85 20 82 Q 23.4 89.4 30 92 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29.6 91.6 Q 26.6 85.2 19.3 81.3 Q 23.7 88.1 29.6 91.6 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 29.4 91.4 Q 25.8 87 21.4 83.4 Q 25 87.8 29.4 91.4 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30 90 Q 36.3 88.7 39 82 Q 32.4 84.3 30 90 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 29.7 89.7 Q 35.2 87.4 38.3 81.3 Q 32.5 84.7 29.7 89.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.5 89.5 Q 34.5 86.7 37.7 83.1 Q 33.8 86 30.5 89.5 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30 88 Q 33 83.4 30 78 Q 27.5 83.4 30 88 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 29.7 87.7 Q 31.6 82.9 29.4 77.4 Q 28 83 29.7 87.7 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 30 87.4 Q 30.5 83.4 30 79.4 Q 29.6 83.4 30 87.4 Z', from: 2, to: 2 },
        { tone: 'wood', d: 'M 34 95 Q 34.8 79.5 34.3 64 L 36.7 64 Q 36.3 79.5 37 95 Z', from: 3, to: 3 },
        { tone: 'wood-dark', d: 'M 35.8 95 Q 35.9 79.5 35.6 64 L 36.7 64 Q 36.3 79.5 37 95 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 33 73 Q 35.6 73.1 38 72 Q 35.4 71.9 33 73 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 92 Q 26 83.6 16 80 Q 21.5 88.9 30 92 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.6 91.6 Q 24.7 83.9 15.2 79.2 Q 21.7 87.3 29.6 91.6 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.2 91.3 Q 23.9 86 18 81.7 Q 23.2 86.9 29.2 91.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 90 Q 38.2 88.3 43 80 Q 34.1 83 30 90 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.6 89.6 Q 37 86.8 42.2 79.2 Q 34.3 83.5 29.6 89.6 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.8 89.4 Q 36.3 85.8 41.2 81.4 Q 35.7 85 30.8 89.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 84 Q 27.6 75.5 19 70 Q 22.7 79.3 30 84 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.6 83.6 Q 26.3 75.6 18.3 69.3 Q 23.1 78.1 29.6 83.6 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.3 83.2 Q 25.3 77.2 20.5 72 Q 24.5 77.9 29.3 83.2 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 82 Q 37.4 78.6 41 70 Q 33.1 74.7 30 82 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.7 81.7 Q 36.3 77.4 40.3 69.3 Q 33.4 74.9 29.7 81.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.7 81.3 Q 35.4 76.8 39.5 71.7 Q 34.7 76.2 30.7 81.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 78 Q 33 72.5 30 66 Q 27.5 72.5 30 78 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29.7 77.7 Q 31.6 72 29.4 65.4 Q 28 72.1 29.7 77.7 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 30 77.3 Q 30.5 72.5 30 67.7 Q 29.6 72.5 30 77.3 Z', from: 3, to: 3 },
        { tone: 'wood', d: 'M 34 95 Q 34.8 73.5 34.3 52 L 36.7 52 Q 36.3 73.5 37 95 Z', from: 4, to: 4 },
        { tone: 'wood-dark', d: 'M 35.8 95 Q 35.9 73.5 35.6 52 L 36.7 52 Q 36.3 73.5 37 95 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 33 61 Q 35.6 61.1 38 60 Q 35.4 59.9 33 61 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 92 Q 25 83.3 14 80 Q 20.6 89.2 30 92 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.6 91.6 Q 23.7 83.6 13.2 79.2 Q 20.8 87.5 29.6 91.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29 91.3 Q 23 86 16.2 81.7 Q 22.3 87 29 91.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 90 Q 39 88.6 45 80 Q 35.1 82.7 30 90 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.6 89.6 Q 37.9 87 44.2 79.2 Q 35.2 83.3 29.6 89.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.9 89.4 Q 37.2 85.9 42.9 81.4 Q 36.6 84.9 30.9 89.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 82 Q 26.1 73 16 68 Q 21.4 77.7 30 82 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.6 81.6 Q 24.8 73.2 15.2 67.2 Q 21.7 76.3 29.6 81.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.2 81.2 Q 23.9 75.2 18 70 Q 23.2 75.9 29.2 81.2 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 80 Q 38.7 77.1 44 68 Q 34.6 72.3 30 80 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.6 79.6 Q 37.5 75.7 43.3 67.3 Q 34.8 72.7 29.6 79.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.8 79.3 Q 36.8 74.9 42 69.7 Q 36.1 74.1 30.8 79.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 72 Q 27.9 64.4 20 60 Q 23.3 68.2 30 72 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.7 71.7 Q 26.6 64.5 19.3 59.3 Q 23.7 67 29.7 71.7 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.4 71.3 Q 25.8 66.2 21.4 61.7 Q 25 66.8 29.4 71.3 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 70 Q 36.7 67.5 40 60 Q 32.8 63.6 30 70 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.7 69.7 Q 35.7 66.4 39.4 59.4 Q 33 63.9 29.7 69.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.6 69.4 Q 34.9 65.7 38.6 61.4 Q 34.3 65.1 30.6 69.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 66 Q 32.8 61.4 30 56 Q 27.6 61.4 30 66 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.7 65.7 Q 31.5 60.9 29.4 55.4 Q 28.2 61 29.7 65.7 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30 65.4 Q 30.4 61.4 30 57.4 Q 29.6 61.4 30 65.4 Z', from: 4, to: 4 },
        { tone: 'deep', c: [21, 76, 4.2], from: 4, to: 4 },
        { tone: 'base', c: [20.7, 75.6, 3.6], from: 4, to: 4 },
        { tone: 'light', c: [19.8, 74.7, 1.1], from: 4, to: 4 },
        { tone: 'deep', d: 'M 17.9 73.5 Q 20.8 74.4 23.4 72.8 Q 20.7 73.1 17.9 73.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 21 69.3 L 21.7 71.6 L 24.1 71.5 L 22.1 72.9 L 22.9 75.2 L 21 73.7 L 19.1 75.2 L 19.9 72.9 L 17.9 71.5 L 20.3 71.6 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 20.6 70.1 L 21 71.6 L 22.6 71.6 L 21.3 72.5 L 21.8 73.9 L 20.6 73 L 19.3 73.9 L 19.9 72.5 L 18.6 71.6 L 20.1 71.6 Z', from: 4, to: 4 },
        { tone: 'deep', c: [39, 74, 4], from: 4, to: 4 },
        { tone: 'base', c: [38.7, 73.6, 3.4], from: 4, to: 4 },
        { tone: 'light', c: [37.8, 72.8, 1], from: 4, to: 4 },
        { tone: 'deep', d: 'M 36 71.6 Q 38.8 72.5 41.3 71 Q 38.7 71.2 36 71.6 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 39 67.6 L 39.7 69.8 L 42 69.8 L 40.1 71.1 L 40.8 73.2 L 39 71.8 L 37.2 73.2 L 37.9 71.1 L 36 69.8 L 38.3 69.8 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 38.6 68.4 L 39 69.8 L 40.5 69.8 L 39.3 70.6 L 39.8 72 L 38.6 71.1 L 37.4 72 L 37.9 70.6 L 36.7 69.8 L 38.2 69.8 Z', from: 4, to: 4 },
        { tone: 'wood', d: 'M 34 95 Q 34.8 69.5 34.3 44 L 36.7 44 Q 36.3 69.5 37 95 Z', from: 5 },
        { tone: 'wood-dark', d: 'M 35.8 95 Q 35.9 69.5 35.6 44 L 36.7 44 Q 36.3 69.5 37 95 Z', from: 5 },
        { tone: 'stemshade', d: 'M 33 53 Q 35.6 53.1 38 52 Q 35.4 51.9 33 53 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 92 Q 24 83 12 80 Q 19.8 89.4 30 92 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.6 91.6 Q 22.7 83.4 11.1 79.1 Q 19.9 87.6 29.6 91.6 Z', from: 5 },
        { tone: 'stem', d: 'M 28.9 91.3 Q 22.1 86 14.5 81.7 Q 21.4 87 28.9 91.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 90 Q 39.8 88.8 47 80 Q 36.1 82.5 30 90 Z', from: 5 },
        { tone: 'stem', d: 'M 29.6 89.6 Q 38.7 87.2 46.2 79.2 Q 36.1 83.1 29.6 89.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31 89.4 Q 38.1 85.9 44.6 81.4 Q 37.5 84.9 31 89.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 82 Q 25.3 72 14 66 Q 20.4 76.9 30 82 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.6 81.6 Q 23.9 72.2 13.2 65.2 Q 20.7 75.4 29.6 81.6 Z', from: 5 },
        { tone: 'stem', d: 'M 29 81 Q 23 74.2 16.2 68.2 Q 22.2 75 29 81 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 80 Q 39.7 76.3 46 66 Q 35.4 71.3 30 80 Z', from: 5 },
        { tone: 'stem', d: 'M 29.6 79.6 Q 38.5 74.9 45.2 65.2 Q 35.6 71.7 29.6 79.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31 79.2 Q 37.7 74 43.8 68 Q 37 73.2 31 79.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 70 Q 27.1 61.3 18 56 Q 22.3 65.4 30 70 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.6 69.6 Q 25.8 61.5 17.3 55.3 Q 22.7 64.1 29.6 69.6 Z', from: 5 },
        { tone: 'stem', d: 'M 29.3 69.2 Q 24.9 63.2 19.7 58 Q 24.1 63.9 29.3 69.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 68 Q 37.8 64.7 42 56 Q 33.6 60.6 30 68 Z', from: 5 },
        { tone: 'stem', d: 'M 29.7 67.7 Q 36.7 63.5 41.3 55.3 Q 33.9 60.9 29.7 67.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.7 67.3 Q 35.9 62.8 40.3 57.7 Q 35.2 62.1 30.7 67.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 60 Q 29.9 53.1 24 48 Q 25 55.6 30 60 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.7 59.7 Q 28.6 53.1 23.4 47.4 Q 25.4 54.7 29.7 59.7 Z', from: 5 },
        { tone: 'stem', d: 'M 29.6 59.3 Q 27.6 54.3 24.8 49.7 Q 26.8 54.7 29.6 59.3 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 58 Q 35.5 55 37 48 Q 31.3 52.1 30 58 Z', from: 5 },
        { tone: 'stem', d: 'M 29.7 57.7 Q 34.4 54 36.4 47.4 Q 31.6 52.2 29.7 57.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.4 57.4 Q 33.6 53.6 36 49.4 Q 32.9 53.2 30.4 57.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 54 Q 32.6 49.4 30 44 Q 27.8 49.4 30 54 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.7 53.7 Q 31.4 48.9 29.4 43.4 Q 28.3 49 29.7 53.7 Z', from: 5 },
        { tone: 'stem', d: 'M 30 53.4 Q 30.4 49.4 30 45.4 Q 29.6 49.4 30 53.4 Z', from: 5 },
        { tone: 'deep', c: [19, 74, 4.4], from: 5 },
        { tone: 'base', c: [18.7, 73.6, 3.8], from: 5 },
        { tone: 'light', c: [17.7, 72.6, 1.1], from: 5 },
        { tone: 'deep', d: 'M 15.7 71.4 Q 18.8 72.3 21.6 70.7 Q 18.6 70.9 15.7 71.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 19 67 L 19.7 69.4 L 22.3 69.3 L 20.2 70.8 L 21 73.2 L 19 71.6 L 17 73.2 L 17.8 70.8 L 15.7 69.3 L 18.3 69.4 Z', from: 5 },
        { tone: 'stemlight', d: 'M 18.6 67.8 L 19 69.4 L 20.7 69.4 L 19.3 70.3 L 19.9 71.8 L 18.6 70.8 L 17.3 71.8 L 17.8 70.3 L 16.5 69.4 L 18.1 69.4 Z', from: 5 },
        { tone: 'deep', c: [41, 72, 4.2], from: 5 },
        { tone: 'base', c: [40.7, 71.6, 3.6], from: 5 },
        { tone: 'light', c: [39.8, 70.7, 1.1], from: 5 },
        { tone: 'deep', d: 'M 37.9 69.5 Q 40.8 70.4 43.4 68.8 Q 40.7 69.1 37.9 69.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 41 65.3 L 41.7 67.6 L 44.1 67.5 L 42.1 68.9 L 42.9 71.2 L 41 69.7 L 39.1 71.2 L 39.9 68.9 L 37.9 67.5 L 40.3 67.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 40.6 66.1 L 41 67.6 L 42.6 67.6 L 41.3 68.5 L 41.8 69.9 L 40.6 69 L 39.3 69.9 L 39.9 68.5 L 38.6 67.6 L 40.1 67.6 Z', from: 5 },
        { tone: 'deep', c: [25, 62, 4.2], from: 5 },
        { tone: 'base', c: [24.7, 61.6, 3.6], from: 5 },
        { tone: 'light', c: [23.8, 60.7, 1.1], from: 5 },
        { tone: 'deep', d: 'M 21.9 59.5 Q 24.8 60.4 27.4 58.8 Q 24.7 59.1 21.9 59.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 25 55.3 L 25.7 57.6 L 28.1 57.5 L 26.1 58.9 L 26.9 61.2 L 25 59.7 L 23.1 61.2 L 23.9 58.9 L 21.9 57.5 L 24.3 57.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 24.6 56.1 L 25 57.6 L 26.6 57.6 L 25.3 58.5 L 25.8 59.9 L 24.6 59 L 23.3 59.9 L 23.9 58.5 L 22.6 57.6 L 24.1 57.6 Z', from: 5 },
        { tone: 'deep', c: [37, 60, 4], from: 5 },
        { tone: 'base', c: [36.7, 59.6, 3.4], from: 5 },
        { tone: 'light', c: [35.8, 58.8, 1], from: 5 },
        { tone: 'deep', d: 'M 34 57.6 Q 36.8 58.5 39.3 57 Q 36.7 57.2 34 57.6 Z', from: 5 },
        { tone: 'stemshade', d: 'M 37 53.6 L 37.7 55.8 L 40 55.8 L 38.1 57.1 L 38.8 59.2 L 37 57.8 L 35.2 59.2 L 35.9 57.1 L 34 55.8 L 36.3 55.8 Z', from: 5 },
        { tone: 'stemlight', d: 'M 36.6 54.4 L 37 55.8 L 38.5 55.8 L 37.3 56.6 L 37.8 58 L 36.6 57.1 L 35.4 58 L 35.9 56.6 L 34.7 55.8 L 36.2 55.8 Z', from: 5 }
      ]
    },
    tulip: {
      trunk: 'M 28.3 96 Q 29.2 93 28.6 90 L 31.4 90 Q 30.9 93 31.7 96 Z',
      trunkShort: 'M 28.4 96 Q 29.2 94 28.7 92 L 31.3 92 Q 30.8 94 31.6 96 Z',
      trunkTone: 'stem',
      blossoms: [[19, 35], [41, 43], [30, 27], [24, 46], [36, 52], [30, 18], [14, 44], [46, 52], [30, 40]],
      parts: [
        { tone: 'stemshade', d: 'M 27 93.6 Q 25.4 83 17 74 Q 20.3 85.7 27 93.6 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 26.5 93 Q 23.8 82.9 16.3 73.3 Q 20.5 84.6 26.5 93 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 33 93.6 Q 39.9 88 42 78 Q 35.2 85.3 33 93.6 Z', from: 2, to: 2 },
        { tone: 'stem', d: 'M 32.5 93 Q 38.4 86.8 41.3 77.3 Q 35.3 85.1 32.5 93 Z', from: 2, to: 2 },
        { tone: 'deep', d: 'M 33 72 C 33.1 72.9 33.1 74.1 32.8 74.9 C 32.6 75.7 32 76.3 31.5 76.7 C 31 77 30.5 77 30 77 C 29.5 77 29 77 28.5 76.7 C 28 76.3 27.4 75.7 27.2 74.9 C 26.9 74.1 26.9 72.9 27 72 C 27.1 71.1 27.4 70.3 27.6 69.5 C 27.9 68.7 28.1 67.9 28.5 67.3 C 28.9 66.8 29.5 66.2 30 66.2 C 30.5 66.2 31.1 66.8 31.5 67.3 C 31.9 67.9 32.1 68.7 32.4 69.5 C 32.6 70.3 32.9 71.1 33 72 Z', from: 2, to: 2 },
        { tone: 'base', d: 'M 31.9 71.3 C 32 72.1 32 73.1 31.8 73.8 C 31.6 74.4 31.1 75 30.7 75.2 C 30.4 75.5 30 75.5 29.6 75.5 C 29.2 75.5 28.8 75.5 28.4 75.2 C 28 75 27.6 74.4 27.4 73.8 C 27.2 73.1 27.2 72.1 27.2 71.3 C 27.3 70.6 27.5 69.9 27.7 69.2 C 27.9 68.6 28.1 67.9 28.4 67.4 C 28.7 66.9 29.2 66.4 29.6 66.4 C 30 66.4 30.4 66.9 30.7 67.4 C 31.1 67.9 31.2 68.6 31.4 69.2 C 31.6 69.9 31.9 70.6 31.9 71.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 26 93.6 Q 24 79.4 14 66 Q 18 82 26 93.6 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 25.5 93 Q 22.2 79.2 13.3 65.3 Q 18.4 80.9 25.5 93 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 34 93.6 Q 42.3 85.3 45 72 Q 36.8 82.5 34 93.6 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 33.5 93 Q 40.6 84.1 44.3 71.3 Q 37 82.3 33.5 93 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.1 95.6 Q 27.4 77.6 23.3 60.1 L 24.7 59.9 Q 29.1 77.3 30.9 95.2 Z', from: 3, to: 3 },
        { tone: 'stem', d: 'M 29.1 95.2 Q 31.7 80.3 36.3 65.8 L 37.7 66.2 Q 33.2 80.6 30.9 95.6 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 19 49.8 C 18.8 50.5 19.5 54.5 20 56.1 C 20.6 57.7 21.5 58.7 22.2 59.3 C 23 59.9 23.8 59.7 24.5 59.6 C 25.2 59.5 26 59.6 26.6 58.8 C 27.2 58.1 27.9 56.9 28.1 55.2 C 28.3 53.6 28.2 49.5 27.8 48.9 C 27.4 48.3 26.6 51.4 25.8 51.5 C 25.1 51.6 24.1 49.3 23.4 49.4 C 22.7 49.4 22.2 51.9 21.5 51.9 C 20.7 52 19.3 49.1 19 49.8 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 19.3 49.8 C 19.1 50.4 19.8 53.8 20.2 55.2 C 20.6 56.5 21.4 57.4 22 57.9 C 22.6 58.4 23.3 58.3 23.9 58.2 C 24.5 58.1 25.1 58.2 25.6 57.6 C 26.1 56.9 26.6 55.9 26.8 54.5 C 27 53 26.8 49.6 26.5 49 C 26.2 48.5 25.5 51.2 24.9 51.2 C 24.3 51.3 23.5 49.3 22.9 49.4 C 22.3 49.5 21.9 51.6 21.3 51.6 C 20.8 51.7 19.5 49.2 19.3 49.8 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 20.6 50.1 C 20.5 50.5 20.9 52.9 21.1 53.9 C 21.3 54.8 21.7 55.5 22 55.8 C 22.2 56.2 22.5 56.1 22.7 56.1 C 23 56.1 23.3 56.1 23.4 55.7 C 23.6 55.3 23.8 54.6 23.9 53.6 C 23.9 52.6 23.7 50.2 23.6 49.8 C 23.4 49.4 23.2 51.2 23 51.3 C 22.7 51.3 22.3 49.9 22.1 49.9 C 21.8 50 21.7 51.4 21.5 51.4 C 21.2 51.5 20.7 49.7 20.6 50.1 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 21.8 50.5 Q 22.7 54.7 24.9 58.3 Q 24 54.1 21.8 50.5 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 33.6 55.5 C 33.2 56 33.1 59.7 33.3 61.2 C 33.5 62.7 34.1 63.8 34.6 64.5 C 35.2 65.2 35.9 65.1 36.6 65.2 C 37.2 65.2 37.9 65.4 38.6 64.9 C 39.3 64.4 40.1 63.4 40.6 62 C 41.1 60.5 41.7 56.9 41.5 56.3 C 41.3 55.7 40 58.3 39.3 58.2 C 38.6 58.2 38.2 55.9 37.5 55.9 C 36.9 55.8 36 57.9 35.3 57.8 C 34.7 57.7 33.9 54.9 33.6 55.5 Z', from: 3, to: 3 },
        { tone: 'base', d: 'M 33.7 55.6 C 33.4 56.1 33.3 59.2 33.4 60.5 C 33.6 61.8 34.1 62.8 34.5 63.3 C 35 63.9 35.6 63.9 36.1 63.9 C 36.7 64 37.2 64.1 37.8 63.7 C 38.3 63.2 39 62.4 39.4 61.1 C 39.8 59.9 40.4 56.8 40.2 56.3 C 40 55.7 38.9 58 38.4 57.9 C 37.8 57.9 37.5 56 37 55.9 C 36.4 55.9 35.7 57.6 35.1 57.6 C 34.6 57.5 34 55.1 33.7 55.6 Z', from: 3, to: 3 },
        { tone: 'light', d: 'M 34.6 56.3 C 34.4 56.6 34.3 58.8 34.3 59.7 C 34.3 60.6 34.5 61.2 34.7 61.6 C 34.8 62 35.1 62 35.3 62 C 35.5 62 35.8 62.1 36 61.8 C 36.3 61.4 36.6 60.8 36.8 60 C 37 59.1 37.3 56.9 37.3 56.5 C 37.2 56.2 36.7 57.8 36.5 57.8 C 36.2 57.7 36.1 56.4 35.9 56.4 C 35.7 56.4 35.3 57.6 35.1 57.6 C 34.9 57.6 34.7 55.9 34.6 56.3 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 35 56.9 Q 35.8 60.7 37.8 64 Q 37 60.2 35 56.9 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 25 93.6 Q 22.8 76.7 12 60 Q 16.4 79.2 25 93.6 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 24.5 93 Q 20.9 76.5 11.3 59.3 Q 16.8 78.1 24.5 93 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 35 93.6 Q 44 82.4 47 66 Q 38.1 79.8 35 93.6 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 34.5 93 Q 42.2 81.2 46.3 65.3 Q 38.4 79.6 34.5 93 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31 93.6 Q 37.9 88 40 78 Q 33.2 85.3 31 93.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 30.5 93 Q 36.4 86.8 39.3 77.3 Q 33.3 85.1 30.5 93 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29 95.6 Q 26.1 72.6 20.2 50.2 L 21.8 49.8 Q 27.9 72.2 31 95.2 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29.1 95.2 Q 32.4 76.2 38.3 57.8 L 39.7 58.2 Q 34.1 76.6 30.9 95.6 Z', from: 4, to: 4 },
        { tone: 'stem', d: 'M 29 95.4 Q 29.2 69.7 29.2 44 L 30.8 44 Q 31 69.7 31 95.4 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 15.4 38.5 C 15.2 39.3 16.1 43.6 16.7 45.3 C 17.4 47 18.4 48.1 19.2 48.8 C 20.1 49.4 20.9 49.1 21.7 49 C 22.5 48.9 23.4 48.9 24 48.1 C 24.6 47.3 25.3 45.9 25.5 44.1 C 25.6 42.3 25.3 37.9 24.9 37.2 C 24.5 36.5 23.7 40 22.9 40.1 C 22.1 40.2 20.9 37.8 20.1 37.9 C 19.3 38 18.9 40.7 18.1 40.8 C 17.3 40.9 15.6 37.8 15.4 38.5 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 15.8 38.5 C 15.6 39.1 16.4 42.8 16.9 44.3 C 17.4 45.8 18.3 46.7 19 47.3 C 19.7 47.8 20.3 47.6 21 47.5 C 21.6 47.4 22.4 47.4 22.9 46.7 C 23.4 46 23.9 44.9 24.1 43.3 C 24.2 41.7 23.9 37.9 23.5 37.4 C 23.2 36.8 22.6 39.8 21.9 39.8 C 21.3 39.9 20.3 37.8 19.6 37.9 C 19 38 18.7 40.3 18 40.4 C 17.4 40.5 15.9 37.8 15.8 38.5 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 17.2 38.7 C 17.1 39.2 17.6 41.8 17.9 42.8 C 18.2 43.8 18.6 44.5 18.9 44.9 C 19.2 45.3 19.5 45.2 19.7 45.2 C 20 45.1 20.3 45.2 20.5 44.7 C 20.7 44.2 20.9 43.5 20.8 42.4 C 20.8 41.3 20.6 38.7 20.4 38.3 C 20.2 37.8 20.1 39.9 19.8 39.9 C 19.5 40 19.1 38.5 18.8 38.5 C 18.5 38.5 18.5 40.1 18.2 40.1 C 17.9 40.2 17.2 38.3 17.2 38.7 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 18.6 39.1 Q 19.6 43.6 22 47.6 Q 21 43.1 18.6 39.1 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 35.6 46 C 35.2 46.6 35 50.5 35.1 52.1 C 35.2 53.7 35.8 54.9 36.4 55.6 C 36.9 56.4 37.7 56.3 38.4 56.4 C 39.1 56.5 39.8 56.8 40.5 56.2 C 41.3 55.7 42.2 54.7 42.7 53.2 C 43.3 51.7 44.1 47.8 43.9 47.1 C 43.7 46.5 42.2 49.2 41.5 49.1 C 40.8 49 40.5 46.6 39.8 46.5 C 39.1 46.5 38.1 48.6 37.4 48.5 C 36.7 48.4 36 45.4 35.6 46 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 35.7 46.1 C 35.4 46.6 35.2 50 35.3 51.4 C 35.3 52.8 35.8 53.8 36.3 54.4 C 36.7 55 37.4 55 37.9 55.1 C 38.5 55.2 39.1 55.4 39.7 54.9 C 40.3 54.4 41.1 53.6 41.5 52.3 C 42 51 42.7 47.6 42.5 47.1 C 42.4 46.5 41.1 48.9 40.6 48.8 C 40 48.7 39.7 46.7 39.1 46.6 C 38.6 46.5 37.7 48.4 37.1 48.3 C 36.6 48.2 36 45.6 35.7 46.1 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 36.6 46.9 C 36.4 47.3 36.2 49.6 36.2 50.6 C 36.1 51.5 36.3 52.2 36.5 52.6 C 36.6 53 36.9 53 37.1 53 C 37.4 53.1 37.6 53.2 37.9 52.8 C 38.2 52.5 38.5 51.9 38.8 50.9 C 39 50 39.4 47.7 39.4 47.3 C 39.3 46.9 38.7 48.6 38.5 48.6 C 38.3 48.5 38.2 47.1 38 47.1 C 37.7 47.1 37.3 48.4 37.1 48.4 C 36.8 48.3 36.7 46.5 36.6 46.9 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 36.9 47.6 Q 37.7 51.7 39.8 55.2 Q 39 51.2 36.9 47.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 25.6 32.2 C 25.3 32.8 25.6 37 26 38.7 C 26.3 40.4 27.1 41.5 27.8 42.2 C 28.5 42.9 29.3 42.8 30 42.8 C 30.7 42.8 31.5 42.9 32.2 42.2 C 32.9 41.5 33.7 40.4 34 38.7 C 34.4 37 34.7 32.8 34.4 32.2 C 34.1 31.5 32.9 34.6 32.2 34.6 C 31.5 34.6 30.7 32.2 30 32.2 C 29.3 32.2 28.5 34.6 27.8 34.6 C 27.1 34.6 25.9 31.5 25.6 32.2 Z', from: 4, to: 4 },
        { tone: 'base', d: 'M 25.8 32.2 C 25.6 32.8 25.8 36.4 26.1 37.8 C 26.4 39.3 27.1 40.3 27.6 40.9 C 28.2 41.4 28.8 41.3 29.4 41.3 C 30 41.3 30.7 41.4 31.2 40.9 C 31.8 40.3 32.5 39.3 32.8 37.8 C 33.1 36.4 33.3 32.8 33 32.2 C 32.8 31.6 31.8 34.3 31.2 34.3 C 30.6 34.3 30 32.2 29.4 32.2 C 28.8 32.2 28.2 34.3 27.6 34.3 C 27 34.3 26.1 31.6 25.8 32.2 Z', from: 4, to: 4 },
        { tone: 'light', d: 'M 26.9 32.8 C 26.8 33.2 26.9 35.7 27.1 36.7 C 27.2 37.7 27.5 38.4 27.7 38.8 C 27.9 39.2 28.2 39.1 28.4 39.1 C 28.7 39.1 29 39.2 29.2 38.8 C 29.4 38.4 29.7 37.7 29.8 36.7 C 29.9 35.7 30 33.2 29.9 32.8 C 29.8 32.4 29.4 34.2 29.2 34.2 C 28.9 34.2 28.7 32.8 28.4 32.8 C 28.2 32.8 27.9 34.2 27.7 34.2 C 27.4 34.2 27.1 32.4 26.9 32.8 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 27.8 33.4 Q 28.7 37.6 30.9 41.4 Q 30 37.1 27.8 33.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 25 93.6 Q 22 73.9 10 54 Q 15.4 76.4 25 93.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 24.5 93 Q 20.1 73.7 9.3 53.3 Q 15.8 75.4 24.5 93 Z', from: 5 },
        { tone: 'stemshade', d: 'M 35 93.6 Q 45.1 79.7 49 60 Q 38.9 77.1 35 93.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 34.5 93 Q 43.3 78.5 48.3 59.3 Q 39.2 76.8 34.5 93 Z', from: 5 },
        { tone: 'stemshade', d: 'M 31 93.6 Q 39 86.2 42 74 Q 34 83.4 31 93.6 Z', from: 5 },
        { tone: 'stem', d: 'M 30.5 93 Q 37.4 85 41.3 73.3 Q 34.2 83.2 30.5 93 Z', from: 5 },
        { tone: 'stemshade', d: 'M 28 93.6 Q 27.2 85 20 78 Q 22.3 87.4 28 93.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 27.5 93 Q 25.6 84.8 19.3 77.3 Q 22.5 86.4 27.5 93 Z', from: 5 },
        { tone: 'stem', d: 'M 28.9 95.6 Q 25.2 68.5 18.2 42.2 L 19.8 41.8 Q 27.1 68.2 31.1 95.2 Z', from: 5 },
        { tone: 'stem', d: 'M 29 95.2 Q 33.2 72.1 40.2 49.8 L 41.8 50.2 Q 35 72.6 31 95.6 Z', from: 5 },
        { tone: 'stem', d: 'M 28.9 95.4 Q 29.2 64.7 29.2 34 L 30.9 34 Q 31.1 64.7 31.1 95.4 Z', from: 5 },
        { tone: 'deep', d: 'M 12.8 29 C 12.6 29.9 13.7 34.7 14.4 36.5 C 15.1 38.4 16.3 39.6 17.2 40.3 C 18.1 41 19 40.7 19.9 40.5 C 20.7 40.4 21.7 40.4 22.3 39.5 C 23 38.6 23.7 37.1 23.9 35 C 24 33 23.5 28.1 23.1 27.4 C 22.6 26.7 21.8 30.5 20.9 30.6 C 20.1 30.8 18.8 28.1 17.9 28.2 C 17.1 28.3 16.7 31.3 15.8 31.5 C 15 31.6 13 28.2 12.8 29 Z', from: 5 },
        { tone: 'base', d: 'M 13.2 28.9 C 13 29.6 14 33.8 14.6 35.4 C 15.2 37 16.1 38.1 16.9 38.6 C 17.7 39.2 18.4 39 19.1 38.9 C 19.8 38.7 20.6 38.8 21.1 38 C 21.6 37.2 22.2 35.9 22.3 34.2 C 22.4 32.4 22 28.2 21.6 27.6 C 21.2 27 20.6 30.3 19.9 30.4 C 19.2 30.5 18.1 28.1 17.4 28.3 C 16.7 28.4 16.4 30.9 15.7 31 C 15 31.1 13.4 28.2 13.2 28.9 Z', from: 5 },
        { tone: 'light', d: 'M 14.8 29.2 C 14.7 29.7 15.3 32.5 15.6 33.7 C 16 34.8 16.4 35.6 16.8 36 C 17.1 36.5 17.4 36.3 17.7 36.3 C 18 36.2 18.3 36.3 18.5 35.8 C 18.7 35.2 18.9 34.4 18.8 33.2 C 18.8 32 18.5 29.1 18.3 28.6 C 18.1 28.2 18 30.4 17.7 30.5 C 17.4 30.5 16.8 28.8 16.5 28.9 C 16.2 28.9 16.2 30.7 15.9 30.7 C 15.6 30.8 14.8 28.7 14.8 29.2 Z', from: 5 },
        { tone: 'deep', d: 'M 16.4 29.6 Q 17.4 34.6 20 39 Q 19 34 16.4 29.6 Z', from: 5 },
        { tone: 'deep', d: 'M 37.4 36.3 C 37 37 36.6 41.3 36.7 43 C 36.8 44.8 37.5 46.1 38 46.9 C 38.6 47.7 39.5 47.7 40.2 47.8 C 41 48 41.8 48.2 42.6 47.6 C 43.4 47.1 44.4 46 45.1 44.4 C 45.7 42.7 46.7 38.5 46.5 37.8 C 46.3 37 44.6 40 43.8 39.9 C 43.1 39.8 42.7 37.2 41.9 37.1 C 41.2 36.9 40 39.3 39.3 39.2 C 38.5 39.1 37.8 35.7 37.4 36.3 Z', from: 5 },
        { tone: 'base', d: 'M 37.5 36.5 C 37.1 37.1 36.8 40.7 36.9 42.3 C 37 43.8 37.5 44.9 38 45.6 C 38.4 46.3 39.1 46.3 39.8 46.4 C 40.4 46.5 41 46.7 41.7 46.2 C 42.4 45.7 43.2 44.8 43.7 43.3 C 44.3 41.9 45.1 38.3 44.9 37.7 C 44.8 37 43.4 39.6 42.7 39.5 C 42.1 39.4 41.8 37.2 41.2 37.1 C 40.6 37 39.6 39 39 38.9 C 38.4 38.8 37.9 36 37.5 36.5 Z', from: 5 },
        { tone: 'light', d: 'M 38.4 37.4 C 38.2 37.8 37.9 40.4 37.9 41.4 C 37.9 42.5 38 43.2 38.2 43.7 C 38.4 44.1 38.7 44.1 38.9 44.1 C 39.2 44.2 39.4 44.3 39.7 43.9 C 40 43.5 40.4 42.9 40.7 41.9 C 41 40.9 41.5 38.3 41.5 37.9 C 41.4 37.5 40.7 39.3 40.5 39.3 C 40.2 39.2 40.2 37.7 39.9 37.7 C 39.7 37.6 39.2 39.1 38.9 39 C 38.7 39 38.6 37 38.4 37.4 Z', from: 5 },
        { tone: 'deep', d: 'M 38.7 38.2 Q 39.6 42.6 41.9 46.5 Q 41 42.1 38.7 38.2 Z', from: 5 },
        { tone: 'deep', d: 'M 25.2 20.5 C 24.9 21.2 25.2 25.9 25.6 27.8 C 26 29.6 26.9 31 27.6 31.7 C 28.3 32.5 29.2 32.3 30 32.3 C 30.8 32.3 31.7 32.5 32.4 31.7 C 33.1 31 34 29.6 34.4 27.8 C 34.8 25.9 35.1 21.2 34.8 20.5 C 34.5 19.7 33.2 23.2 32.4 23.2 C 31.6 23.2 30.8 20.5 30 20.5 C 29.2 20.5 28.4 23.2 27.6 23.2 C 26.8 23.2 25.5 19.7 25.2 20.5 Z', from: 5 },
        { tone: 'base', d: 'M 25.5 20.5 C 25.2 21.2 25.4 25.2 25.8 26.8 C 26.1 28.4 26.8 29.5 27.4 30.2 C 28 30.8 28.7 30.7 29.4 30.7 C 30 30.7 30.8 30.8 31.4 30.2 C 32 29.5 32.7 28.4 33 26.8 C 33.3 25.2 33.6 21.2 33.3 20.5 C 33 19.9 32 22.9 31.4 22.9 C 30.7 22.9 30 20.5 29.4 20.5 C 28.7 20.5 28.1 22.9 27.4 22.9 C 26.8 22.9 25.7 19.9 25.5 20.5 Z', from: 5 },
        { tone: 'light', d: 'M 26.7 21.1 C 26.6 21.6 26.7 24.4 26.8 25.5 C 26.9 26.6 27.2 27.4 27.5 27.9 C 27.7 28.3 28 28.3 28.3 28.3 C 28.6 28.3 28.9 28.3 29.1 27.9 C 29.4 27.4 29.7 26.6 29.8 25.5 C 29.9 24.4 30 21.6 29.9 21.1 C 29.8 20.7 29.4 22.8 29.1 22.8 C 28.8 22.8 28.6 21.1 28.3 21.1 C 28 21.1 27.8 22.8 27.5 22.8 C 27.2 22.8 26.8 20.7 26.7 21.1 Z', from: 5 },
        { tone: 'deep', d: 'M 27.6 21.8 Q 28.6 26.6 31 30.8 Q 30 26 27.6 21.8 Z', from: 5 }
      ]
    },
    watermelon: {
      trunk: 'M 28.4 96 Q 29.2 94 28.7 92 L 31.3 92 Q 30.8 94 31.6 96 Z',
      trunkShort: 'M 28.6 96 Q 29.3 94.8 28.8 93.5 L 31.2 93.5 Q 30.7 94.8 31.4 96 Z',
      trunkTone: 'stemdark',
      blossoms: [[28, 80], [45, 86], [30, 68], [19, 72], [42, 74], [22, 88], [38, 90], [30, 60], [12, 80]],
      parts: [
        { tone: 'stemshade', d: 'M 30.6 92.8 C 29.5 92.4 26.4 91.1 24.4 90.2 C 22.3 89.4 19.2 88.1 18.2 87.7 L 17.8 88.3 C 18.8 88.9 21.7 90.6 23.6 91.8 C 25.6 92.9 28.5 94.6 29.4 95.2 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.2 95.3 C 31.2 95 34.3 94.6 36.3 93.8 C 38.3 93 41.2 90.9 42.2 90.3 L 41.8 89.7 C 40.8 90.1 37.7 91.7 35.7 92.2 C 33.7 92.7 30.8 92.6 29.8 92.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 6.7 82.2 C 6.9 80.9 9.1 79.9 9.6 78.9 C 10.1 77.8 9.1 76.2 9.7 75.7 C 10.4 75.1 12.2 75.8 13.4 75.5 C 14.5 75.2 15.5 73.9 16.6 73.9 C 17.8 73.9 19.3 74.8 20.2 75.4 C 21.1 76 21.1 76.7 22 77.4 C 22.9 78.1 25 78.7 25.5 79.5 C 25.9 80.3 24.7 81.4 24.8 82.2 C 24.9 83 26.3 83.8 26.1 84.3 C 25.9 84.8 23.5 84.7 23.4 85.1 C 23.3 85.5 25.6 86.3 25.7 86.8 C 25.7 87.4 24.1 87.7 23.7 88.4 C 23.3 89.1 24.1 90.5 23.4 91.1 C 22.7 91.7 20.5 91.5 19.4 91.9 C 18.4 92.2 18.1 92.9 17.1 93.2 C 16 93.4 14.3 93.8 13.2 93.4 C 12.2 93 11.7 91.4 10.7 90.8 C 9.7 90.1 7.7 90.1 7.3 89.3 C 6.9 88.6 8.4 87.5 8.3 86.3 C 8.2 85.1 6.4 83.4 6.7 82.2 Z', from: 2, to: 2 },
        { tone: 'stemlight', d: 'M 7.3 81.4 C 7.5 80.3 9.3 79.5 9.7 78.6 C 10.2 77.7 9.3 76.4 9.8 75.9 C 10.4 75.4 12 76 12.9 75.7 C 13.9 75.5 14.7 74.4 15.7 74.4 C 16.6 74.4 17.9 75.2 18.7 75.7 C 19.4 76.2 19.4 76.8 20.2 77.4 C 20.9 77.9 22.7 78.5 23.1 79.1 C 23.5 79.8 22.4 80.7 22.5 81.4 C 22.6 82 23.8 82.7 23.6 83.2 C 23.4 83.6 21.4 83.5 21.3 83.8 C 21.3 84.2 23.2 84.8 23.2 85.2 C 23.3 85.7 21.9 86 21.6 86.6 C 21.3 87.2 22 88.4 21.4 88.9 C 20.8 89.3 18.9 89.2 18 89.5 C 17.1 89.8 16.9 90.4 16 90.6 C 15.2 90.8 13.7 91.1 12.8 90.7 C 11.9 90.4 11.5 89.1 10.7 88.6 C 9.8 88 8.2 88 7.8 87.4 C 7.5 86.7 8.7 85.8 8.6 84.8 C 8.5 83.8 7.1 82.4 7.3 81.4 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 26.2 85.6 Q 22.4 84.2 18.4 84.2 Q 22.2 85.7 26.2 85.6 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 27.4 85.8 Q 23.1 84.6 18.6 84.3 Q 22.9 85.5 27.4 85.8 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 52.7 83.3 C 52.9 84.5 51.2 86 51.1 87.1 C 51 88.3 52.4 89.3 52 90 C 51.7 90.7 49.8 90.7 48.9 91.3 C 48 92 47.5 93.4 46.5 93.7 C 45.5 94.1 43.9 93.8 42.9 93.6 C 42 93.3 41.7 92.7 40.7 92.4 C 39.7 92 37.7 92.2 37 91.6 C 36.3 91.1 37.1 89.8 36.8 89.1 C 36.4 88.4 34.9 88.1 34.9 87.6 C 34.9 87.1 37.1 86.4 37 86.1 C 36.9 85.7 34.7 85.8 34.5 85.3 C 34.3 84.8 35.6 84 35.7 83.3 C 35.8 82.5 34.7 81.6 35.1 80.8 C 35.5 80.1 37.5 79.5 38.3 78.9 C 39.2 78.2 39.2 77.5 40 77 C 40.8 76.4 42.3 75.6 43.3 75.6 C 44.4 75.6 45.3 76.8 46.4 77 C 47.4 77.3 49.2 76.7 49.8 77.2 C 50.4 77.8 49.4 79.2 49.9 80.2 C 50.4 81.2 52.4 82.1 52.7 83.3 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 50.1 82.5 C 50.3 83.5 49 84.8 48.9 85.8 C 48.8 86.7 49.9 87.6 49.6 88.1 C 49.3 88.7 47.8 88.7 47 89.3 C 46.2 89.8 45.8 91 45 91.3 C 44.2 91.6 42.8 91.4 42 91.2 C 41.1 91 40.9 90.4 40.1 90.2 C 39.3 89.9 37.5 90 37 89.5 C 36.4 89.1 37.1 88 36.8 87.4 C 36.5 86.8 35.2 86.6 35.2 86.2 C 35.3 85.7 37.1 85.2 37 84.8 C 36.9 84.5 35.1 84.6 34.9 84.2 C 34.7 83.8 35.8 83.2 35.9 82.5 C 36 81.9 35 81.1 35.4 80.4 C 35.8 79.8 37.4 79.3 38.1 78.8 C 38.8 78.3 38.8 77.7 39.5 77.2 C 40.2 76.8 41.4 76 42.3 76.1 C 43.2 76.1 44 77 44.9 77.3 C 45.8 77.5 47.2 77 47.7 77.4 C 48.2 77.9 47.4 79.1 47.8 79.9 C 48.2 80.8 50 81.6 50.1 82.5 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 34.4 86.5 Q 38.2 86.5 41.7 85.2 Q 37.9 85.2 34.4 86.5 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 33.3 86.7 Q 37.5 86.5 41.6 85.3 Q 37.3 85.5 33.3 86.7 Z', from: 2, to: 2 },
        { tone: 'stemshade', d: 'M 30.9 93 C 29.5 91.9 25.2 87.8 22.4 86.3 C 19.7 84.7 15.5 84.1 14.1 83.6 L 13.9 84.4 C 15.1 84.9 19 85.9 21.6 87.7 C 24.1 89.5 27.9 93.8 29.1 95 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30.5 95.2 C 31.8 94.6 35.7 92.9 38.3 91.8 C 40.9 90.6 44.8 88.9 46.1 88.4 L 45.9 87.6 C 44.5 88.1 40.4 89.4 37.7 90.2 C 35 91.1 30.9 92.4 29.5 92.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 1.5 77.9 C 1.9 76.5 4.5 75.6 5.1 74.5 C 5.8 73.3 4.8 71.5 5.6 70.9 C 6.4 70.3 8.4 71.2 9.8 71 C 11.1 70.8 12.3 69.5 13.6 69.6 C 14.9 69.7 16.5 70.9 17.5 71.6 C 18.4 72.4 18.4 73.2 19.3 74.1 C 20.2 74.9 22.6 75.8 23 76.8 C 23.4 77.7 21.9 78.8 22 79.7 C 22 80.6 23.6 81.7 23.3 82.3 C 22.9 82.8 20.2 82.4 20.1 82.9 C 20 83.4 22.5 84.4 22.5 85 C 22.5 85.6 20.6 85.8 20.1 86.6 C 19.6 87.4 20.4 89.1 19.6 89.7 C 18.7 90.2 16.2 89.9 15 90.2 C 13.8 90.4 13.4 91.2 12.2 91.4 C 11 91.6 9 91.7 7.8 91.2 C 6.6 90.6 6.2 88.9 5.2 88 C 4.2 87.2 1.9 86.9 1.5 86.1 C 1.2 85.2 2.9 84.1 2.9 82.7 C 2.9 81.4 1.1 79.3 1.5 77.9 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 2.2 77.2 C 2.5 76 4.6 75.2 5.2 74.2 C 5.8 73.3 5 71.7 5.6 71.2 C 6.3 70.8 8 71.5 9.1 71.4 C 10.2 71.2 11.2 70.1 12.3 70.1 C 13.4 70.2 14.8 71.2 15.6 71.8 C 16.4 72.5 16.3 73.2 17.1 73.9 C 17.9 74.6 19.8 75.4 20.2 76.2 C 20.6 77 19.3 77.9 19.4 78.7 C 19.4 79.4 20.7 80.4 20.4 80.8 C 20.2 81.3 17.9 81 17.8 81.3 C 17.7 81.7 19.8 82.6 19.8 83.1 C 19.8 83.6 18.2 83.8 17.8 84.4 C 17.4 85.1 18 86.5 17.3 87 C 16.6 87.5 14.5 87.2 13.5 87.4 C 12.5 87.7 12.1 88.3 11.1 88.5 C 10.1 88.6 8.4 88.8 7.5 88.3 C 6.5 87.8 6.1 86.4 5.3 85.6 C 4.4 84.9 2.5 84.7 2.2 84 C 1.9 83.2 3.4 82.3 3.4 81.2 C 3.4 80.1 1.9 78.3 2.2 77.2 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 23.3 83.8 Q 19.1 81.8 14.5 81.4 Q 18.7 83.4 23.3 83.8 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 24.6 84.1 Q 19.8 82.3 14.7 81.5 Q 19.5 83.3 24.6 84.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 58 82.7 C 58.2 84 56.5 85.9 56.4 87.1 C 56.3 88.4 57.9 89.5 57.5 90.3 C 57.1 91.1 55 91.2 54 92 C 53 92.7 52.5 94.4 51.4 94.8 C 50.3 95.3 48.4 95 47.2 94.8 C 46.1 94.6 45.8 93.8 44.7 93.5 C 43.5 93.2 41.2 93.4 40.4 92.8 C 39.6 92.2 40.5 90.7 40 89.9 C 39.6 89.2 37.8 88.9 37.9 88.3 C 37.9 87.7 40.3 86.9 40.2 86.4 C 40.1 86 37.6 86.2 37.3 85.7 C 37 85.2 38.5 84.2 38.6 83.3 C 38.7 82.5 37.3 81.4 37.8 80.5 C 38.3 79.7 40.5 78.9 41.4 78.2 C 42.3 77.4 42.3 76.6 43.2 76 C 44.2 75.3 45.8 74.3 47 74.2 C 48.2 74.2 49.3 75.5 50.5 75.8 C 51.8 76 53.8 75.3 54.4 75.9 C 55.1 76.4 54.1 78.1 54.7 79.2 C 55.3 80.4 57.7 81.4 58 82.7 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 55.1 81.9 C 55.3 83 53.8 84.5 53.8 85.6 C 53.7 86.7 55.1 87.6 54.7 88.3 C 54.4 89 52.6 89.1 51.8 89.7 C 50.9 90.3 50.5 91.7 49.6 92.1 C 48.6 92.5 47 92.2 46.1 92 C 45.2 91.9 44.9 91.2 43.9 91 C 43 90.7 41 90.9 40.4 90.4 C 39.7 89.9 40.4 88.6 40 87.9 C 39.7 87.3 38.2 87.1 38.2 86.6 C 38.2 86.1 40.3 85.4 40.2 85 C 40.1 84.7 38 84.8 37.7 84.4 C 37.5 84 38.8 83.1 38.9 82.4 C 38.9 81.7 37.8 80.8 38.2 80.1 C 38.6 79.3 40.4 78.7 41.2 78.1 C 42 77.4 42 76.8 42.7 76.2 C 43.5 75.7 44.9 74.8 45.9 74.8 C 46.9 74.7 47.8 75.8 48.9 76.1 C 49.9 76.3 51.6 75.6 52.1 76.1 C 52.7 76.6 51.9 78 52.4 79 C 52.9 79.9 54.9 80.8 55.1 81.9 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 37.2 87.1 Q 41.5 87 45.5 85.3 Q 41.2 85.4 37.2 87.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 36 87.3 Q 40.8 86.8 45.4 85.3 Q 40.6 85.9 36 87.3 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 63.5 C 31.3 63.5 32.6 65.5 33.8 65.8 C 34.9 66.1 36.3 64.9 36.9 65.4 C 37.6 65.9 37.3 67.9 37.8 69 C 38.3 70 39.7 70.8 39.9 71.9 C 40.1 73 39.5 74.7 39 75.7 C 38.6 76.7 37.9 76.8 37.4 77.8 C 36.8 78.8 36.6 81 35.9 81.6 C 35.2 82.2 33.9 81.1 33.2 81.4 C 32.4 81.6 31.8 83.2 31.3 83 C 30.7 82.9 30.4 80.5 30 80.5 C 29.6 80.5 29.3 82.9 28.7 83 C 28.2 83.2 27.6 81.6 26.9 81.4 C 26.1 81.1 24.8 82.2 24.1 81.6 C 23.4 81 23.2 78.8 22.7 77.8 C 22.1 76.8 21.4 76.7 21 75.7 C 20.5 74.7 19.9 73 20.1 71.9 C 20.3 70.8 21.7 70 22.2 69 C 22.7 67.9 22.4 65.9 23.1 65.4 C 23.7 64.9 25.1 66.1 26.2 65.8 C 27.4 65.5 28.7 63.5 30 63.5 Z', from: 3, to: 3 },
        { tone: 'stemlight', d: 'M 29 64.1 C 30 64.1 31.2 65.7 32.1 66 C 33.1 66.3 34.2 65.2 34.8 65.7 C 35.3 66.1 35.1 67.7 35.5 68.7 C 35.9 69.6 37.1 70.2 37.3 71.1 C 37.4 72.1 36.9 73.5 36.5 74.3 C 36.2 75.1 35.6 75.2 35.1 76.1 C 34.7 76.9 34.5 78.7 33.9 79.2 C 33.3 79.7 32.3 78.9 31.6 79.1 C 31 79.3 30.5 80.6 30 80.5 C 29.6 80.4 29.3 78.4 29 78.4 C 28.6 78.4 28.3 80.4 27.9 80.5 C 27.5 80.6 27 79.3 26.3 79.1 C 25.7 78.9 24.6 79.7 24 79.2 C 23.4 78.7 23.2 76.9 22.8 76.1 C 22.3 75.2 21.7 75.1 21.4 74.3 C 21 73.5 20.5 72.1 20.7 71.1 C 20.8 70.2 22 69.6 22.4 68.7 C 22.8 67.7 22.6 66.1 23.1 65.7 C 23.7 65.2 24.8 66.3 25.8 66 C 26.8 65.7 27.9 64.1 29 64.1 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 83.4 Q 30.7 79.4 30 75.4 Q 29.3 79.4 30 83.4 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 30 84.6 Q 30.5 80.1 30 75.6 Q 29.5 80.1 30 84.6 Z', from: 3, to: 3 },
        { tone: 'deep', c: [30, 87, 7], from: 3, to: 3 },
        { tone: 'base', c: [29.5, 86.4, 6], from: 3, to: 3 },
        { tone: 'light', c: [27.9, 84.8, 1.8], from: 3, to: 3 },
        { tone: 'deep', d: 'M 24.6 82.2 Q 26.5 87 24.8 91.8 L 25.6 91.8 Q 27.7 87 25.8 82.2 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 26.7 80.9 Q 27.7 87 27 93.1 L 28 93.1 Q 29.2 87 28.2 80.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 29.1 80.4 Q 29.1 87 29.4 93.6 L 30.6 93.6 Q 30.9 87 30.9 80.4 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 31.8 80.9 Q 30.8 87 32 93.1 L 33 93.1 Q 32.3 87 33.3 80.9 Z', from: 3, to: 3 },
        { tone: 'deep', d: 'M 34.2 82.2 Q 32.3 87 34.4 91.8 L 35.2 91.8 Q 33.5 87 35.4 82.2 Z', from: 3, to: 3 },
        { tone: 'light', c: [27.8, 84.7, 1.2], from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 32.2 79.6 Q 31.6 80.5 31.3 81.5 L 30.1 81.1 Q 30.3 80 30.6 79 Z', from: 3, to: 3 },
        { tone: 'stemshade', d: 'M 31 93.2 C 29.4 91.4 24.7 84.6 21.5 82.3 C 18.4 80.1 13.7 80.1 12.1 79.6 L 11.9 80.4 C 13.3 80.9 17.6 81.3 20.5 83.7 C 23.3 86.1 27.6 93 29 94.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30.6 95.1 C 32.1 94.2 36.4 91.2 39.3 89.8 C 42.3 88.3 46.7 86.9 48.1 86.4 L 47.9 85.6 C 46.3 86.1 41.7 87 38.7 88.2 C 35.6 89.4 30.9 92.1 29.4 92.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 2.3 75.2 C 2.7 74.1 4.7 73.6 5.3 72.7 C 5.8 71.8 5.1 70.4 5.8 70 C 6.4 69.6 7.9 70.4 8.9 70.2 C 10 70.1 10.9 69.2 11.9 69.3 C 12.9 69.4 14.1 70.4 14.8 71 C 15.5 71.6 15.4 72.3 16.1 73 C 16.8 73.6 18.5 74.4 18.8 75.2 C 19.1 75.9 17.9 76.7 17.9 77.4 C 17.9 78.1 19 79 18.8 79.4 C 18.5 79.8 16.5 79.4 16.4 79.7 C 16.3 80.1 18.1 81 18.1 81.5 C 18.1 81.9 16.6 82 16.2 82.6 C 15.8 83.1 16.3 84.5 15.7 84.9 C 15 85.3 13.1 84.9 12.1 85.1 C 11.2 85.2 10.9 85.8 10 85.9 C 9 86 7.5 86 6.6 85.6 C 5.8 85.1 5.5 83.7 4.8 83.1 C 4 82.4 2.3 82.1 2 81.4 C 1.8 80.7 3.2 80 3.2 78.9 C 3.3 77.9 2 76.2 2.3 75.2 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 2.8 74.7 C 3.1 73.8 4.8 73.3 5.3 72.6 C 5.8 71.8 5.2 70.6 5.7 70.3 C 6.2 70 7.5 70.6 8.4 70.5 C 9.2 70.4 10 69.6 10.9 69.7 C 11.7 69.8 12.7 70.6 13.3 71.2 C 13.9 71.7 13.8 72.2 14.4 72.8 C 14.9 73.4 16.4 74 16.7 74.7 C 16.9 75.3 15.9 75.9 15.9 76.5 C 15.9 77.1 16.8 77.9 16.6 78.2 C 16.4 78.5 14.7 78.2 14.6 78.5 C 14.5 78.8 16.1 79.5 16.1 79.9 C 16 80.3 14.8 80.4 14.5 80.9 C 14.1 81.3 14.6 82.5 14 82.8 C 13.4 83.2 11.9 82.8 11.1 83 C 10.3 83.1 10 83.6 9.2 83.7 C 8.5 83.7 7.2 83.8 6.4 83.4 C 5.7 83 5.5 81.9 4.9 81.3 C 4.2 80.7 2.8 80.5 2.6 79.9 C 2.4 79.3 3.5 78.7 3.6 77.8 C 3.6 76.9 2.5 75.5 2.8 74.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 18.7 80.5 Q 15.6 78.8 12.2 78.4 Q 15.2 80 18.7 80.5 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 19.7 80.8 Q 16.2 79.2 12.3 78.4 Q 15.9 80.1 19.7 80.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 57.2 82 C 57.4 82.9 56.1 84.4 56.1 85.3 C 56.1 86.3 57.3 87.1 57 87.7 C 56.7 88.3 55.2 88.5 54.4 89.1 C 53.7 89.6 53.4 90.9 52.5 91.3 C 51.7 91.6 50.3 91.5 49.4 91.3 C 48.6 91.2 48.4 90.7 47.5 90.4 C 46.6 90.2 44.9 90.5 44.3 90 C 43.7 89.6 44.2 88.4 43.9 87.9 C 43.6 87.3 42.2 87.2 42.2 86.7 C 42.2 86.3 44 85.6 43.9 85.3 C 43.9 84.9 42 85.2 41.7 84.8 C 41.5 84.4 42.6 83.6 42.7 83 C 42.7 82.3 41.7 81.6 42 80.9 C 42.3 80.2 44 79.6 44.6 79 C 45.3 78.4 45.3 77.8 45.9 77.3 C 46.6 76.8 47.8 76 48.7 75.9 C 49.6 75.9 50.5 76.8 51.4 77 C 52.3 77.2 53.8 76.5 54.3 77 C 54.9 77.4 54.2 78.6 54.6 79.5 C 55.1 80.3 56.9 81 57.2 82 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 55 81.4 C 55.2 82.2 54.1 83.4 54.1 84.2 C 54.1 85 55.1 85.7 54.9 86.2 C 54.7 86.7 53.3 86.9 52.7 87.4 C 52.1 87.9 51.8 88.9 51.1 89.2 C 50.4 89.5 49.2 89.4 48.5 89.3 C 47.8 89.2 47.6 88.7 46.9 88.5 C 46.2 88.3 44.7 88.5 44.2 88.2 C 43.7 87.8 44.2 86.8 43.9 86.4 C 43.6 85.9 42.5 85.8 42.5 85.4 C 42.5 85 44 84.4 43.9 84.2 C 43.9 83.9 42.3 84.1 42.1 83.8 C 41.9 83.4 42.8 82.8 42.9 82.3 C 42.9 81.7 42 81.1 42.3 80.5 C 42.6 80 44 79.4 44.5 78.9 C 45.1 78.4 45 77.9 45.6 77.5 C 46.2 77.1 47.2 76.4 47.9 76.3 C 48.7 76.3 49.4 77.1 50.2 77.2 C 51 77.4 52.2 76.8 52.7 77.2 C 53.1 77.5 52.5 78.6 52.9 79.3 C 53.3 80 54.8 80.6 55 81.4 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 41.7 85.8 Q 45 85.6 47.9 84.3 Q 44.7 84.5 41.7 85.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 40.8 86 Q 44.4 85.7 47.8 84.3 Q 44.2 84.7 40.8 86 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 62.3 C 30.9 62.3 31.9 63.8 32.8 64 C 33.6 64.2 34.6 63.3 35.1 63.7 C 35.6 64.1 35.3 65.5 35.7 66.3 C 36.1 67.1 37.1 67.6 37.2 68.5 C 37.4 69.3 36.9 70.5 36.6 71.2 C 36.3 72 35.8 72.1 35.4 72.8 C 35 73.5 34.8 75.1 34.3 75.5 C 33.8 76 32.9 75.2 32.3 75.4 C 31.7 75.6 31.3 76.7 30.9 76.6 C 30.5 76.5 30.3 74.8 30 74.8 C 29.7 74.8 29.5 76.5 29.1 76.6 C 28.7 76.7 28.3 75.6 27.7 75.4 C 27.1 75.2 26.2 76 25.7 75.5 C 25.2 75.1 25 73.5 24.6 72.8 C 24.2 72.1 23.7 72 23.4 71.2 C 23.1 70.5 22.6 69.3 22.8 68.5 C 22.9 67.6 23.9 67.1 24.3 66.3 C 24.7 65.5 24.4 64.1 24.9 63.7 C 25.4 63.3 26.4 64.2 27.2 64 C 28.1 63.8 29.1 62.3 30 62.3 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 29.2 62.7 C 30 62.7 30.9 63.9 31.6 64.1 C 32.3 64.3 33.1 63.6 33.5 63.9 C 33.9 64.2 33.7 65.4 34 66.1 C 34.3 66.7 35.2 67.2 35.3 67.9 C 35.4 68.6 35.1 69.6 34.8 70.2 C 34.5 70.8 34.1 70.9 33.8 71.5 C 33.4 72.1 33.3 73.5 32.9 73.8 C 32.4 74.2 31.7 73.6 31.2 73.7 C 30.7 73.9 30.3 74.8 30 74.7 C 29.7 74.7 29.5 73.2 29.2 73.2 C 29 73.2 28.8 74.7 28.5 74.7 C 28.1 74.8 27.8 73.9 27.3 73.7 C 26.8 73.6 26 74.2 25.6 73.8 C 25.2 73.5 25 72.1 24.7 71.5 C 24.4 70.9 23.9 70.8 23.7 70.2 C 23.4 69.6 23 68.6 23.2 67.9 C 23.3 67.2 24.1 66.7 24.5 66.1 C 24.8 65.4 24.6 64.2 25 63.9 C 25.4 63.6 26.2 64.3 26.9 64.1 C 27.6 63.9 28.5 62.7 29.2 62.7 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 76.9 Q 30.5 74 30 71 Q 29.5 74 30 76.9 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 30 77.8 Q 30.5 74.5 30 71.2 Q 29.5 74.5 30 77.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 12.5 60.6 C 13.1 60.1 14.7 60.5 15.4 60.2 C 16.1 59.9 16.3 58.7 16.8 58.6 C 17.4 58.6 18.1 59.8 18.8 60.1 C 19.5 60.4 20.6 60.2 21.1 60.7 C 21.7 61.2 22.1 62.3 22.3 63 C 22.5 63.7 22.2 64.1 22.4 64.8 C 22.5 65.5 23.3 66.7 23.2 67.3 C 23.1 67.9 22 67.9 21.8 68.4 C 21.5 68.9 21.8 69.9 21.5 70.1 C 21.2 70.2 20 69.1 19.8 69.3 C 19.6 69.5 20.4 70.9 20.2 71.2 C 20 71.4 19 70.9 18.5 71.1 C 18 71.3 17.8 72.4 17.2 72.4 C 16.6 72.4 15.6 71.4 14.9 71.1 C 14.2 70.8 13.7 71 13.1 70.7 C 12.5 70.4 11.4 69.8 11.1 69.2 C 10.7 68.5 11.1 67.5 10.9 66.8 C 10.7 66 9.7 65.1 9.8 64.6 C 9.9 64 11.1 64.1 11.6 63.4 C 12 62.8 11.9 61.2 12.5 60.6 Z', from: 4, to: 4 },
        { tone: 'stemlight', d: 'M 12.5 60.8 C 13.1 60.3 14.4 60.7 15 60.4 C 15.6 60.1 15.7 59.1 16.2 59.1 C 16.7 59.1 17.2 60 17.8 60.3 C 18.4 60.6 19.3 60.4 19.8 60.8 C 20.3 61.2 20.6 62.2 20.8 62.7 C 21 63.3 20.7 63.6 20.8 64.2 C 20.9 64.8 21.6 65.9 21.6 66.4 C 21.5 66.9 20.5 66.9 20.3 67.3 C 20.1 67.7 20.4 68.5 20.1 68.7 C 19.8 68.8 18.8 67.9 18.7 68.1 C 18.5 68.2 19.2 69.3 19 69.6 C 18.8 69.8 18 69.4 17.6 69.5 C 17.2 69.7 17 70.6 16.5 70.6 C 16 70.6 15.1 69.8 14.5 69.5 C 13.9 69.3 13.6 69.5 13 69.2 C 12.5 69 11.6 68.5 11.3 67.9 C 11 67.4 11.3 66.5 11.2 65.9 C 11 65.3 10.1 64.5 10.2 64.1 C 10.3 63.6 11.4 63.7 11.7 63.1 C 12.1 62.6 12 61.2 12.5 60.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 21 70.8 Q 19.7 68.4 17.6 66.7 Q 18.9 69.1 21 70.8 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 21.5 71.4 Q 20 68.8 17.7 66.8 Q 19.2 69.4 21.5 71.4 Z', from: 4, to: 4 },
        { tone: 'deep', c: [29, 83, 9.6], from: 4, to: 4 },
        { tone: 'base', c: [28.3, 82.1, 8.3], from: 4, to: 4 },
        { tone: 'light', c: [26.1, 80, 2.5], from: 4, to: 4 },
        { tone: 'deep', d: 'M 21.6 76.5 Q 24.2 83 21.8 89.5 L 23 89.5 Q 25.9 83 23.2 76.5 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 24.5 74.6 Q 25.9 83 24.8 91.4 L 26.3 91.4 Q 28 83 26.6 74.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 27.8 74 Q 27.8 83 28.1 92 L 29.9 92 Q 30.2 83 30.2 74 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 31.4 74.6 Q 30 83 31.7 91.4 L 33.2 91.4 Q 32.1 83 33.5 74.6 Z', from: 4, to: 4 },
        { tone: 'deep', d: 'M 34.8 76.5 Q 32.1 83 35 89.5 L 36.2 89.5 Q 33.8 83 36.4 76.5 Z', from: 4, to: 4 },
        { tone: 'light', c: [26, 79.9, 1.6], from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.7 72.7 Q 31 74 30.5 75.3 L 29.4 74.9 Q 29.7 73.5 30.2 72.2 Z', from: 4, to: 4 },
        { tone: 'stemshade', d: 'M 31.1 93.3 C 29.4 90.8 24.4 81.3 21.1 78.4 C 17.8 75.4 12.8 76.1 11.1 75.6 L 10.9 76.4 C 12.4 76.9 16.9 76.6 19.9 79.6 C 22.9 82.7 27.4 92.2 28.9 94.7 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30.8 95 C 32.3 93.8 36.8 89.5 39.9 87.7 C 43 86 47.6 84.9 49.1 84.4 L 48.9 83.6 C 47.3 84.1 42.4 84.7 39.1 86.3 C 35.8 87.8 30.9 91.8 29.2 93 Z', from: 5 },
        { tone: 'stemshade', d: 'M 1.8 70.6 C 2.2 69.5 4.4 69 5 68.1 C 5.7 67.2 5 65.6 5.7 65.2 C 6.3 64.8 8 65.7 9.1 65.6 C 10.2 65.5 11.3 64.5 12.3 64.7 C 13.4 64.8 14.6 65.9 15.4 66.6 C 16.1 67.3 16 68 16.7 68.8 C 17.4 69.5 19.2 70.5 19.5 71.3 C 19.8 72.1 18.5 72.8 18.5 73.6 C 18.4 74.3 19.6 75.4 19.3 75.8 C 19 76.2 16.8 75.7 16.7 76.1 C 16.6 76.4 18.6 77.5 18.5 78 C 18.5 78.5 16.9 78.5 16.4 79.1 C 16 79.7 16.5 81.1 15.8 81.6 C 15 82 13 81.5 12 81.7 C 10.9 81.8 10.6 82.4 9.6 82.5 C 8.6 82.5 6.9 82.5 6 82 C 5.1 81.4 4.9 80 4.1 79.2 C 3.3 78.4 1.5 78.1 1.2 77.3 C 1 76.6 2.5 75.8 2.6 74.7 C 2.7 73.6 1.4 71.8 1.8 70.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 2.3 70.1 C 2.6 69.2 4.5 68.7 5 68 C 5.6 67.2 5 65.9 5.5 65.5 C 6.1 65.2 7.5 66 8.4 65.9 C 9.3 65.8 10.2 65 11.1 65.1 C 12 65.3 13.1 66.2 13.7 66.8 C 14.3 67.3 14.2 67.9 14.8 68.6 C 15.4 69.2 16.9 70 17.2 70.7 C 17.4 71.3 16.3 72 16.3 72.6 C 16.3 73.2 17.3 74.1 17 74.5 C 16.8 74.8 14.9 74.4 14.8 74.7 C 14.7 75 16.4 75.9 16.3 76.3 C 16.3 76.7 15 76.8 14.6 77.3 C 14.2 77.8 14.6 79 14 79.3 C 13.4 79.7 11.7 79.3 10.8 79.4 C 10 79.5 9.7 80 8.8 80.1 C 8 80.1 6.6 80.1 5.8 79.7 C 5.1 79.2 4.9 78 4.2 77.3 C 3.6 76.7 2 76.4 1.8 75.8 C 1.6 75.1 2.9 74.5 3 73.5 C 3.1 72.6 2 71.1 2.3 70.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 19.2 77 Q 16 75.1 12.2 74.4 Q 15.5 76.4 19.2 77 Z', from: 5 },
        { tone: 'stemshade', d: 'M 20.3 77.4 Q 16.5 75.5 12.4 74.5 Q 16.2 76.4 20.3 77.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 58.2 79.5 C 58.5 80.5 57.2 82.2 57.2 83.2 C 57.2 84.2 58.6 85 58.3 85.7 C 58 86.4 56.3 86.6 55.6 87.3 C 54.8 87.9 54.5 89.3 53.6 89.7 C 52.7 90.2 51.2 90 50.3 89.9 C 49.3 89.8 49 89.2 48.1 89 C 47.2 88.8 45.3 89.1 44.6 88.7 C 43.9 88.3 44.5 87 44.1 86.4 C 43.7 85.8 42.3 85.7 42.3 85.2 C 42.3 84.7 44.2 83.9 44.1 83.6 C 44 83.2 41.9 83.5 41.7 83.1 C 41.4 82.7 42.6 81.8 42.6 81.1 C 42.6 80.4 41.5 79.6 41.8 78.9 C 42.1 78.2 43.9 77.5 44.6 76.8 C 45.3 76.1 45.2 75.5 45.9 74.9 C 46.7 74.3 47.9 73.4 48.9 73.3 C 49.9 73.2 50.8 74.2 51.8 74.3 C 52.9 74.5 54.4 73.7 55 74.2 C 55.6 74.6 54.9 76 55.4 76.9 C 56 77.8 57.9 78.4 58.2 79.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 55.9 78.9 C 56.2 79.8 55.1 81.2 55.1 82 C 55.1 82.9 56.2 83.6 56 84.2 C 55.8 84.7 54.3 84.9 53.7 85.5 C 53 86 52.8 87.1 52 87.5 C 51.3 87.9 50 87.8 49.2 87.7 C 48.5 87.6 48.2 87.1 47.4 86.9 C 46.6 86.8 45 87 44.5 86.7 C 43.9 86.3 44.4 85.2 44.1 84.7 C 43.8 84.2 42.5 84.1 42.5 83.7 C 42.5 83.3 44.1 82.6 44 82.3 C 44 82 42.2 82.3 42 82 C 41.8 81.6 42.8 80.9 42.8 80.3 C 42.8 79.7 41.9 79 42.1 78.4 C 42.4 77.8 43.9 77.2 44.5 76.6 C 45.1 76.1 45 75.5 45.6 75.1 C 46.2 74.6 47.3 73.8 48.1 73.7 C 48.9 73.6 49.7 74.5 50.6 74.6 C 51.4 74.7 52.7 74.1 53.2 74.5 C 53.7 74.8 53.1 76 53.6 76.7 C 54 77.5 55.7 78 55.9 78.9 Z', from: 5 },
        { tone: 'stemshade', d: 'M 41.7 84.2 Q 45.2 83.9 48.3 82.3 Q 44.8 82.7 41.7 84.2 Z', from: 5 },
        { tone: 'stemshade', d: 'M 40.7 84.5 Q 44.6 83.9 48.2 82.4 Q 44.3 83 40.7 84.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 55.6 C 31 55.6 32.1 57.2 33 57.4 C 33.9 57.7 35 56.7 35.5 57.1 C 36.1 57.5 35.8 59.1 36.2 60 C 36.6 60.8 37.7 61.4 37.9 62.3 C 38.1 63.2 37.6 64.6 37.2 65.3 C 36.9 66.1 36.3 66.2 35.9 67 C 35.5 67.8 35.3 69.6 34.7 70 C 34.1 70.5 33.1 69.7 32.5 69.9 C 31.9 70.1 31.4 71.3 31 71.2 C 30.6 71.1 30.3 69.2 30 69.2 C 29.7 69.2 29.4 71.1 29 71.2 C 28.6 71.3 28.1 70.1 27.5 69.9 C 26.9 69.7 25.9 70.5 25.3 70 C 24.7 69.6 24.5 67.8 24.1 67 C 23.7 66.2 23.1 66.1 22.8 65.3 C 22.4 64.6 21.9 63.2 22.1 62.3 C 22.3 61.4 23.4 60.8 23.8 60 C 24.2 59.1 23.9 57.5 24.5 57.1 C 25 56.7 26.1 57.7 27 57.4 C 27.9 57.2 29 55.6 30 55.6 Z', from: 5 },
        { tone: 'stemlight', d: 'M 29.2 56.1 C 30 56.1 30.9 57.4 31.7 57.6 C 32.5 57.8 33.4 57 33.8 57.3 C 34.3 57.7 34.1 59 34.4 59.7 C 34.7 60.5 35.7 60.9 35.8 61.7 C 35.9 62.5 35.5 63.6 35.2 64.2 C 35 64.9 34.5 65 34.1 65.6 C 33.8 66.3 33.6 67.8 33.1 68.2 C 32.6 68.6 31.8 67.9 31.3 68 C 30.8 68.2 30.4 69.3 30 69.2 C 29.7 69.1 29.5 67.5 29.2 67.5 C 28.9 67.5 28.7 69.1 28.3 69.2 C 28 69.3 27.6 68.2 27.1 68 C 26.5 67.9 25.7 68.6 25.2 68.2 C 24.7 67.8 24.6 66.3 24.2 65.6 C 23.9 65 23.4 64.9 23.1 64.2 C 22.8 63.6 22.4 62.5 22.5 61.7 C 22.7 60.9 23.6 60.5 23.9 59.7 C 24.3 59 24.1 57.7 24.5 57.3 C 25 57 25.9 57.8 26.6 57.6 C 27.4 57.4 28.3 56.1 29.2 56.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 71.5 Q 30.6 68.3 30 65.1 Q 29.4 68.3 30 71.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 30 72.5 Q 30.5 68.9 30 65.3 Q 29.5 68.9 30 72.5 Z', from: 5 },
        { tone: 'stemshade', d: 'M 11.3 53.9 C 12 53.4 13.7 53.9 14.5 53.6 C 15.3 53.2 15.5 51.9 16.1 51.9 C 16.7 51.9 17.4 53.2 18.2 53.6 C 19 54 20.1 53.8 20.8 54.3 C 21.4 54.9 21.8 56.1 22 56.9 C 22.2 57.6 21.8 58.1 22 58.9 C 22.1 59.7 22.9 61.1 22.8 61.7 C 22.7 62.4 21.5 62.3 21.1 62.8 C 20.8 63.3 21.2 64.5 20.8 64.6 C 20.4 64.8 19.2 63.6 18.9 63.8 C 18.7 64 19.6 65.5 19.3 65.8 C 19.1 66.1 18.1 65.5 17.5 65.7 C 16.9 65.9 16.7 67.1 16 67 C 15.3 67 14.2 65.8 13.5 65.5 C 12.7 65.2 12.2 65.4 11.5 65 C 10.9 64.7 9.7 64 9.3 63.2 C 9 62.5 9.4 61.4 9.2 60.6 C 9 59.7 8 58.8 8.1 58.2 C 8.3 57.5 9.6 57.7 10.1 57 C 10.6 56.3 10.5 54.5 11.3 53.9 Z', from: 5 },
        { tone: 'stemlight', d: 'M 11.3 54.1 C 11.9 53.6 13.3 54.1 14 53.8 C 14.6 53.5 14.8 52.4 15.3 52.4 C 15.9 52.4 16.4 53.4 17.1 53.8 C 17.7 54.1 18.7 54 19.2 54.4 C 19.8 54.9 20.1 55.9 20.3 56.6 C 20.4 57.2 20.1 57.6 20.2 58.2 C 20.4 58.9 21.1 60.1 21 60.6 C 20.8 61.2 19.8 61.1 19.6 61.6 C 19.3 62 19.6 63 19.3 63.1 C 19 63.2 17.9 62.2 17.7 62.3 C 17.5 62.5 18.3 63.8 18.1 64 C 17.8 64.3 17 63.8 16.5 63.9 C 16 64.1 15.8 65.1 15.3 65.1 C 14.7 65.1 13.7 64.1 13.1 63.8 C 12.5 63.5 12.1 63.7 11.5 63.4 C 10.9 63.1 10 62.5 9.7 61.9 C 9.3 61.3 9.7 60.4 9.6 59.7 C 9.4 59 8.5 58.1 8.6 57.6 C 8.7 57.1 9.9 57.2 10.3 56.6 C 10.7 56.1 10.6 54.6 11.3 54.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 20.2 65.4 Q 18.9 62.8 16.6 60.8 Q 18 63.4 20.2 65.4 Z', from: 5 },
        { tone: 'stemshade', d: 'M 20.8 66.1 Q 19.1 63.2 16.7 60.9 Q 18.3 63.8 20.8 66.1 Z', from: 5 },
        { tone: 'stemshade', d: 'M 48.5 56.6 C 49.1 57.2 49 58.8 49.4 59.4 C 49.9 60.1 51.1 60 51.2 60.6 C 51.3 61.1 50.3 62 50.1 62.8 C 49.9 63.5 50.3 64.5 49.9 65.2 C 49.6 65.8 48.5 66.4 47.9 66.7 C 47.3 67 46.8 66.8 46.1 67.1 C 45.4 67.4 44.4 68.4 43.8 68.4 C 43.2 68.4 43 67.3 42.5 67.1 C 42 66.9 41 67.4 40.8 67.2 C 40.6 66.9 41.4 65.5 41.2 65.3 C 41 65.1 39.8 66.2 39.5 66.1 C 39.2 65.9 39.5 64.9 39.2 64.4 C 39 63.9 37.9 63.9 37.8 63.3 C 37.7 62.7 38.5 61.5 38.6 60.8 C 38.8 60.1 38.5 59.7 38.7 59 C 38.9 58.3 39.3 57.2 39.9 56.7 C 40.4 56.2 41.5 56.4 42.2 56.1 C 42.9 55.8 43.6 54.6 44.2 54.6 C 44.7 54.7 44.9 55.9 45.6 56.2 C 46.3 56.5 47.9 56.1 48.5 56.6 Z', from: 5 },
        { tone: 'stem', d: 'M 47.1 56.8 C 47.6 57.2 47.5 58.6 47.9 59.1 C 48.3 59.7 49.3 59.6 49.4 60.1 C 49.5 60.5 48.6 61.3 48.5 61.9 C 48.3 62.5 48.6 63.4 48.3 63.9 C 48 64.5 47.1 65 46.6 65.2 C 46 65.5 45.7 65.3 45.1 65.5 C 44.5 65.8 43.6 66.6 43.1 66.6 C 42.6 66.6 42.4 65.7 42 65.5 C 41.6 65.4 40.8 65.8 40.6 65.6 C 40.4 65.3 41.1 64.2 41 64.1 C 40.8 63.9 39.8 64.8 39.5 64.7 C 39.2 64.5 39.6 63.7 39.3 63.3 C 39.1 62.9 38.1 62.9 38.1 62.4 C 38 61.9 38.7 60.8 38.8 60.2 C 38.9 59.6 38.7 59.3 38.8 58.7 C 39 58.2 39.3 57.2 39.8 56.8 C 40.3 56.4 41.2 56.6 41.8 56.3 C 42.4 56 43 55.1 43.4 55.1 C 43.9 55.1 44 56.1 44.6 56.4 C 45.2 56.7 46.5 56.3 47.1 56.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 40 66.8 Q 42.1 65.1 43.4 62.7 Q 41.3 64.4 40 66.8 Z', from: 5 },
        { tone: 'stemshade', d: 'M 39.5 67.4 Q 41.8 65.4 43.3 62.8 Q 41 64.8 39.5 67.4 Z', from: 5 },
        { tone: 'deep', c: [27, 79, 11.6], from: 5 },
        { tone: 'base', c: [26.1, 77.9, 10], from: 5 },
        { tone: 'light', c: [23.6, 75.4, 3], from: 5 },
        { tone: 'deep', d: 'M 18 71.1 Q 21.2 79 18.3 86.9 L 19.7 86.9 Q 23.2 79 20 71.1 Z', from: 5 },
        { tone: 'deep', d: 'M 21.6 68.8 Q 23.2 79 22 89.2 L 23.7 89.2 Q 25.7 79 24.1 68.8 Z', from: 5 },
        { tone: 'deep', d: 'M 25.5 68.1 Q 25.5 79 25.9 89.9 L 28.1 89.9 Q 28.5 79 28.5 68.1 Z', from: 5 },
        { tone: 'deep', d: 'M 29.9 68.8 Q 28.3 79 30.3 89.2 L 32 89.2 Q 30.8 79 32.4 68.8 Z', from: 5 },
        { tone: 'deep', d: 'M 34 71.1 Q 30.8 79 34.3 86.9 L 35.7 86.9 Q 32.8 79 36 71.1 Z', from: 5 },
        { tone: 'light', c: [23.4, 75.2, 2], from: 5 },
        { tone: 'stemshade', d: 'M 30.1 66.5 Q 29.3 68.1 28.7 69.7 L 27.6 69.3 Q 28 67.6 28.6 66 Z', from: 5 },
        { tone: 'deep', d: 'M 38 90 Q 46 76.8 54 90 Q 46 93.2 38 90 Z', from: 5 },
        { tone: 'light', d: 'M 39.4 89.5 Q 46 79.1 52.6 89.5 Q 46 91.9 39.4 89.5 Z', from: 5 },
        { tone: 'melon', d: 'M 40.7 89.2 Q 46 81 51.3 89.2 Q 46 91 40.7 89.2 Z', from: 5 },
        { tone: 'melon-light', d: 'M 42 87.8 Q 45 82.6 45.7 88.4 Q 43.6 88.9 42 87.8 Z', from: 5 },
        { tone: 'deep', c: [44.1, 87.3, 0.8], from: 5 },
        { tone: 'deep', c: [48.1, 87.6, 0.8], from: 5 },
        { tone: 'deep', c: [46.2, 84.9, 0.8], from: 5 }
      ]
    }
  };

  // Ornaments are single drawings — they never grow, which is exactly their job.
  // Animals, fish and the two pets, each with a JUVENILE and an ADULT drawing.
  // Two drawings rather than one scaled down, because a piglet is not a small
  // pig: the head is proportionally larger, the legs shorter, the tusks absent.
  // Scale alone gives a squashed adult.
  //
  // Every land animal and every fish faces RIGHT and is centred on x = 30, so
  // the movement code can mirror with scaleX(-1) without the body jumping
  // sideways. The contact shadow is deliberately offset right of that centre and
  // must not be counted as part of the silhouette.
  var DECOR = {
    duck: {
      young: [
        { raw: '<g transform="translate(-0.9 0)"><ellipse class="t-s-shade s-soft" cx="31.7" cy="94.9" rx="8" ry="1.88"/><ellipse class="t-s-shade s-soft" cx="32.18" cy="95.1" rx="4.96" ry="1.24"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-beak-deep" d="M27 91.6 H28.8 V96 H27 Z"/><path class="t-s-beak-deep" d="M24.6 96 H31 L28.8 93.8 H27 Z"/></g><g class="stock-tail"><path class="t-s-cream-lit" d="M21.4 84.6 Q18 83.4 16.6 86.4 Q19.4 87.8 22 86.6 Z"/></g><ellipse class="t-s-cream-lit" cx="28.8" cy="87.6" rx="7.6" ry="6.6"/><path class="t-s-cream-lit s-soft" d="M21.27 86.68C21.36 86.42 21.53 85.6 21.77 85.1C22 84.6 22.32 84.11 22.69 83.67C23.06 83.24 23.51 82.83 23.99 82.49C24.47 82.15 25.02 81.85 25.59 81.62C26.15 81.39 26.77 81.22 27.38 81.12C28 81.01 28.64 80.98 29.26 81.01C29.89 81.05 30.52 81.15 31.12 81.31C31.71 81.48 32.54 81.89 32.83 82L31.66 83.87C31.46 83.79 30.87 83.52 30.45 83.41C30.02 83.3 29.57 83.23 29.13 83.21C28.69 83.19 28.23 83.21 27.79 83.28C27.36 83.34 26.92 83.46 26.52 83.61C26.12 83.76 25.73 83.96 25.38 84.19C25.04 84.42 24.72 84.69 24.46 84.98C24.2 85.27 23.97 85.6 23.8 85.93C23.63 86.27 23.51 86.81 23.45 86.99Z"/><path class="t-s-cream s-soft" d="M36.03 89.64C35.92 89.85 35.65 90.49 35.4 90.88C35.14 91.26 34.83 91.64 34.49 91.97C34.15 92.31 33.76 92.62 33.35 92.89C32.93 93.16 32.48 93.39 32.01 93.58C31.54 93.77 31.04 93.92 30.54 94.02C30.04 94.13 29.51 94.19 29 94.2C28.48 94.21 27.96 94.17 27.45 94.09C26.94 94.01 26.2 93.78 25.95 93.72L26.85 91.49C27.02 91.53 27.53 91.68 27.87 91.73C28.22 91.78 28.58 91.81 28.94 91.8C29.29 91.79 29.65 91.75 29.99 91.69C30.34 91.62 30.68 91.53 31 91.41C31.32 91.29 31.63 91.14 31.91 90.97C32.19 90.79 32.46 90.6 32.69 90.38C32.93 90.17 33.14 89.93 33.31 89.68C33.49 89.44 33.67 89.03 33.75 88.9Z"/><g class="stock-head"><ellipse class="t-s-cream-lit" cx="35.6" cy="80.4" rx="6" ry="6"/><path class="t-s-cream-lit s-soft" d="M29.61 79.98C29.66 79.74 29.75 78.99 29.9 78.52C30.06 78.05 30.28 77.59 30.54 77.18C30.8 76.76 31.13 76.37 31.49 76.03C31.85 75.69 32.26 75.39 32.69 75.15C33.12 74.91 33.6 74.72 34.07 74.6C34.55 74.47 35.06 74.4 35.55 74.4C36.04 74.4 36.55 74.45 37.03 74.57C37.5 74.69 38.19 75.01 38.42 75.1L37.38 77.04C37.24 76.99 36.81 76.78 36.5 76.71C36.2 76.63 35.88 76.6 35.57 76.6C35.26 76.6 34.93 76.65 34.63 76.73C34.33 76.8 34.03 76.93 33.76 77.08C33.49 77.23 33.22 77.42 33 77.63C32.77 77.85 32.56 78.1 32.4 78.36C32.23 78.62 32.09 78.91 31.99 79.21C31.89 79.51 31.84 79.98 31.81 80.13Z"/><path class="t-s-cream s-soft" d="M40.99 83.03C40.91 83.17 40.68 83.62 40.48 83.88C40.29 84.15 40.08 84.41 39.84 84.64C39.61 84.88 39.35 85.09 39.08 85.28C38.82 85.48 38.53 85.65 38.23 85.79C37.93 85.94 37.62 86.06 37.3 86.15C36.99 86.25 36.66 86.32 36.33 86.36C36 86.4 35.67 86.41 35.34 86.39C35.01 86.38 34.52 86.29 34.35 86.27L34.83 84.02C34.93 84.03 35.24 84.09 35.44 84.1C35.64 84.11 35.85 84.1 36.05 84.07C36.25 84.05 36.46 84.01 36.65 83.95C36.85 83.89 37.04 83.81 37.22 83.73C37.4 83.64 37.58 83.53 37.75 83.41C37.91 83.29 38.07 83.16 38.22 83.02C38.36 82.87 38.49 82.71 38.61 82.55C38.73 82.38 38.87 82.11 38.93 82.02Z"/><path class="t-s-cream-lit" d="M33 74.8 Q34 71.4 35.6 74 Q37.2 71.4 38.2 74.8 Q35.6 73.6 33 74.8 Z"/><path class="t-s-beak" d="M40.6 78.6 Q44.6 78.2 45.2 80.4 Q44.6 82.6 40.6 82.2 Z"/><path class="t-s-beak-lit s-soft" d="M40.8 79 Q44 78.6 44.8 80 Q42.4 79.6 40.8 80.2 Z"/><ellipse class="t-s-eye s-soft" cx="38.6" cy="80.2" rx="1.7" ry="1.7"/><ellipse class="t-s-eye-hi s-soft" cx="38.02" cy="79.55" rx="0.71" ry="0.71"/><ellipse class="t-s-blush s-soft" cx="34.4" cy="83.6" rx="2" ry="1.32"/></g><g class="a-leg-b"><path class="t-s-beak" d="M31.2 91.6 H33 V96 H31.2 Z"/><path class="t-s-beak" d="M28.8 96 H35.2 L33 93.8 H31.2 Z"/></g></g></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(-2.9 0)"><ellipse class="t-s-shade s-soft" cx="35.3" cy="94.9" rx="12" ry="2.82"/><ellipse class="t-s-shade s-soft" cx="36.02" cy="95.1" rx="7.44" ry="1.86"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-beak-deep" d="M27.4 89.4 H29.6 V96 H27.4 Z"/><path class="t-s-beak-deep" d="M24.4 96 H31.8 L29.6 92.6 H27.4 Z"/></g><g class="stock-tail"><path class="t-s-cream" d="M20.6 82.4 Q15.6 79.6 14.2 75.4 Q19.4 77.4 22.4 80.6 Z"/><path class="t-s-cream-lit s-soft" d="M19.6 80.2 Q16.6 78.2 15.2 75.8 Q19 77.8 21.4 80 Z"/></g><path class="t-s-white" d="M18.6 83.4 Q19.4 76 28.4 74.6 Q38 73.6 41.6 79.4 Q44.4 84.6 40.6 89.4 Q34.4 93.4 26.6 92.6 Q19 91.6 18.6 83.4 Z"/><path class="t-s-white-lit s-soft" d="M19.6 81C20.1 80.33 21.13 77.93 22.6 77C24.07 76.07 26.4 75.67 28.4 75.4C30.4 75.13 32.7 74.87 34.6 75.4C36.5 75.93 38.93 78.07 39.8 78.6L39.8 82C38.93 81.47 36.5 79.33 34.6 78.8C32.7 78.27 30.4 78.53 28.4 78.8C26.4 79.07 24.07 79.47 22.6 80.4C21.13 81.33 20.1 83.73 19.6 84.4Z"/><path class="t-s-white-deep s-soft" d="M26.4 92.4C27.5 92.4 30.97 92.8 33 92.4C35.03 92 37.07 91.13 38.6 90C40.13 88.87 41.6 86.33 42.2 85.6L42.2 81.8C41.6 82.53 40.13 85.07 38.6 86.2C37.07 87.33 35.03 88.2 33 88.6C30.97 89 27.5 88.6 26.4 88.6Z"/><path class="t-s-cream-deep" d="M22.4 81.8 Q28 79.4 33.4 82.2 Q30.8 87.6 25.6 87.2 Q21.8 85.8 22.4 81.8 Z"/><path class="t-s-cream s-soft" d="M23 81.8C23.63 81.53 25.53 80.37 26.8 80.2C28.07 80.03 29.57 80.47 30.6 80.8C31.63 81.13 32.6 81.97 33 82.2L33 84.2C32.6 83.97 31.63 83.13 30.6 82.8C29.57 82.47 28.07 82.03 26.8 82.2C25.53 82.37 23.63 83.53 23 83.8Z"/><g class="stock-head"><path class="t-s-green" d="M35.4 79.6 Q36.6 72.6 40.4 69.6 L44.4 72.4 Q41 75 40.4 81.4 Z"/><ellipse class="t-s-green" cx="42.4" cy="70.4" rx="5.2" ry="5.2"/><path class="t-s-green-lit s-soft" d="M37.22 70.85C37.23 70.62 37.2 69.9 37.29 69.44C37.38 68.98 37.53 68.52 37.74 68.1C37.94 67.68 38.22 67.28 38.53 66.93C38.84 66.58 39.21 66.27 39.61 66.01C40 65.76 40.44 65.56 40.89 65.42C41.34 65.29 41.82 65.21 42.29 65.2C42.75 65.19 43.24 65.25 43.69 65.36C44.14 65.48 44.78 65.81 45 65.9L44 67.63C43.87 67.57 43.47 67.37 43.19 67.3C42.92 67.23 42.62 67.19 42.33 67.2C42.04 67.21 41.75 67.25 41.47 67.34C41.2 67.42 40.92 67.55 40.68 67.7C40.44 67.86 40.21 68.05 40.02 68.26C39.83 68.48 39.66 68.73 39.53 68.98C39.4 69.24 39.31 69.53 39.25 69.81C39.2 70.09 39.22 70.53 39.21 70.68Z"/><path class="t-s-green-deep s-soft" d="M47.29 72.18C47.21 72.33 47.02 72.81 46.85 73.1C46.67 73.39 46.46 73.66 46.23 73.91C46.01 74.16 45.75 74.39 45.47 74.59C45.2 74.79 44.9 74.97 44.6 75.11C44.29 75.26 43.96 75.37 43.64 75.45C43.31 75.53 42.96 75.58 42.63 75.6C42.29 75.61 41.94 75.59 41.61 75.54C41.27 75.49 40.79 75.33 40.62 75.29L41.34 73.31C41.44 73.34 41.73 73.43 41.93 73.46C42.13 73.49 42.33 73.51 42.54 73.5C42.74 73.49 42.94 73.46 43.14 73.41C43.33 73.36 43.53 73.29 43.71 73.21C43.89 73.12 44.07 73.02 44.23 72.9C44.4 72.78 44.55 72.64 44.69 72.49C44.82 72.35 44.95 72.18 45.05 72.01C45.15 71.84 45.27 71.55 45.31 71.46Z"/><path class="t-s-white" d="M35.2 79.4 Q38.6 75.4 42.6 77 L41.4 80.4 Q38.6 78.6 36.4 81.4 Z"/><path class="t-s-beak" d="M45 68.4 Q50.8 67.8 51.6 70.4 Q50.8 73 45 72.6 Z"/><path class="t-s-beak-lit s-soft" d="M45.4 68.8 Q50.2 68.4 51.2 70 Q48 69.4 45.4 70 Z"/><path class="t-s-beak-deep s-soft" d="M45.2 71.6 Q49 71.6 51.2 70.8 Q50.2 72.6 45.4 72.2 Z"/><ellipse class="t-s-eye s-soft" cx="43.4" cy="69.2" rx="1.35" ry="1.35"/><ellipse class="t-s-eye-hi s-soft" cx="42.94" cy="68.69" rx="0.57" ry="0.57"/><ellipse class="t-s-blush s-soft" cx="40.2" cy="73" rx="1.9" ry="1.25"/></g><g class="a-leg-b"><path class="t-s-beak" d="M33.2 89.4 H35.4 V96 H33.2 Z"/><path class="t-s-beak" d="M30.4 96 H37.8 L35.4 92.6 H33.2 Z"/><path class="t-s-beak-lit s-soft" d="M33.2 89.4 H34.1 V95 H33.2 Z"/></g></g></g></g>' }
      ]
    },
    pig: {
      young: [
        { raw: '<g transform="translate(-2 0)"><ellipse class="t-s-shade s-soft" cx="33.32" cy="94.9" rx="9.6" ry="2.26"/><ellipse class="t-s-shade s-soft" cx="33.9" cy="95.1" rx="5.95" ry="1.49"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-pink-deep" d="M20.6 91.6 H23.6 V96 H20.6 Z"/><path class="t-s-pink-deep" d="M29.6 91.6 H32.6 V96 H29.6 Z"/></g><g class="stock-tail"><path class="t-s-pink-lit" d="M17.8 84.6 Q14.6 84.2 14.2 88.6 Q16.6 88.8 18.4 87 Z"/></g><ellipse class="t-s-pink-lit" cx="26.6" cy="88.4" rx="8.8" ry="6.2"/><path class="t-s-pink-lit s-soft" d="M17.85 87.75C17.93 87.5 18.09 86.73 18.34 86.25C18.59 85.78 18.94 85.31 19.35 84.89C19.76 84.47 20.25 84.07 20.8 83.74C21.34 83.4 21.96 83.11 22.6 82.88C23.25 82.64 23.95 82.47 24.66 82.35C25.36 82.24 26.11 82.19 26.83 82.2C27.55 82.22 28.29 82.29 28.99 82.43C29.68 82.57 30.66 82.93 31 83.03L29.8 85.11C29.56 85.05 28.84 84.83 28.34 84.74C27.83 84.66 27.29 84.61 26.77 84.6C26.24 84.59 25.7 84.62 25.19 84.69C24.68 84.76 24.16 84.87 23.69 85.01C23.23 85.16 22.77 85.34 22.38 85.54C21.99 85.75 21.62 85.99 21.33 86.25C21.03 86.5 20.78 86.79 20.6 87.08C20.41 87.38 20.3 87.85 20.24 88Z"/><path class="t-s-pink s-soft" d="M34.87 90.52C34.74 90.7 34.42 91.27 34.12 91.62C33.83 91.96 33.47 92.29 33.09 92.59C32.7 92.89 32.27 93.16 31.8 93.4C31.34 93.64 30.84 93.85 30.32 94.02C29.8 94.19 29.25 94.33 28.69 94.42C28.14 94.52 27.56 94.58 26.98 94.59C26.41 94.61 25.83 94.59 25.26 94.53C24.7 94.47 23.87 94.28 23.59 94.23L24.48 91.78C24.68 91.81 25.26 91.92 25.66 91.96C26.06 91.99 26.47 92.01 26.87 92C27.27 91.99 27.68 91.95 28.07 91.9C28.47 91.84 28.85 91.76 29.22 91.66C29.59 91.56 29.94 91.44 30.27 91.3C30.59 91.16 30.9 91 31.17 90.83C31.44 90.66 31.69 90.47 31.9 90.27C32.11 90.07 32.34 89.74 32.43 89.63Z"/><g class="stock-head"><ellipse class="t-s-pink-lit" cx="39.2" cy="81.2" rx="6.9" ry="6.9"/><path class="t-s-pink-lit s-soft" d="M32.3 80.96C32.35 80.68 32.42 79.81 32.58 79.27C32.73 78.73 32.97 78.19 33.25 77.7C33.54 77.21 33.9 76.74 34.3 76.34C34.7 75.94 35.16 75.58 35.65 75.29C36.13 74.99 36.67 74.76 37.21 74.59C37.75 74.43 38.33 74.33 38.9 74.31C39.46 74.28 40.05 74.33 40.61 74.44C41.16 74.56 41.95 74.91 42.22 75L41.08 77.34C40.92 77.28 40.42 77.06 40.08 76.99C39.73 76.92 39.36 76.89 39.01 76.9C38.66 76.92 38.3 76.98 37.96 77.08C37.62 77.18 37.29 77.33 36.99 77.51C36.68 77.7 36.39 77.92 36.15 78.17C35.9 78.42 35.67 78.71 35.49 79.02C35.32 79.32 35.17 79.66 35.07 80C34.97 80.34 34.93 80.87 34.9 81.05Z"/><path class="t-s-pink s-soft" d="M45.5 84.01C45.41 84.18 45.14 84.73 44.92 85.06C44.7 85.39 44.44 85.71 44.16 85.99C43.89 86.28 43.58 86.55 43.26 86.78C42.93 87.02 42.58 87.23 42.22 87.4C41.87 87.58 41.49 87.72 41.1 87.83C40.72 87.94 40.32 88.02 39.92 88.06C39.52 88.1 39.12 88.11 38.72 88.08C38.32 88.06 37.73 87.93 37.53 87.9L38.18 85.28C38.3 85.29 38.66 85.37 38.91 85.39C39.15 85.41 39.4 85.4 39.64 85.38C39.88 85.35 40.12 85.3 40.36 85.24C40.59 85.17 40.82 85.08 41.04 84.97C41.26 84.87 41.47 84.74 41.67 84.6C41.87 84.45 42.05 84.29 42.22 84.12C42.39 83.94 42.55 83.75 42.68 83.55C42.82 83.35 42.98 83.02 43.04 82.91Z"/><path class="t-s-pink" d="M36.6 73.4 Q40 70 42 74.2 Q38.6 76.4 35.8 75.4 Z"/><ellipse class="t-s-pink" cx="45.2" cy="81.6" rx="3.1" ry="2.8"/><ellipse class="t-s-pink-lit s-soft" cx="44.2" cy="80.6" rx="1.6" ry="1.1" transform="rotate(-20 44.2 80.6)"/><ellipse class="t-s-eye s-soft" cx="45.9" cy="80.6" rx="0.55" ry="0.55"/><ellipse class="t-s-eye s-soft" cx="45.9" cy="82.6" rx="0.55" ry="0.55"/><ellipse class="t-s-eye s-soft" cx="42.4" cy="81.4" rx="1.8" ry="1.8"/><ellipse class="t-s-eye-hi s-soft" cx="41.79" cy="80.72" rx="0.76" ry="0.76"/><ellipse class="t-s-blush s-soft" cx="38.2" cy="85" rx="2.2" ry="1.45"/></g><g class="a-leg-b"><path class="t-s-pink" d="M24.2 91.6 H27.2 V96 H24.2 Z"/><path class="t-s-pink" d="M32.8 91.6 H35.8 V96 H32.8 Z"/></g></g></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(-2.6 0)"><ellipse class="t-s-shade s-soft" cx="35.2" cy="94.9" rx="13" ry="3.06"/><ellipse class="t-s-shade s-soft" cx="35.98" cy="95.1" rx="8.06" ry="2.02"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-pink-deep" d="M21.4 86.6 H24.8 V96 H21.4 Z"/><path class="t-s-pink-deep" d="M35.4 86.6 H38.8 V96 H35.4 Z"/><path class="t-s-black" d="M21.4 93.6 H24.8 V96 H21.4 Z"/><path class="t-s-black" d="M35.4 93.6 H38.8 V96 H35.4 Z"/></g><g class="stock-tail"><path class="t-s-pink" d="M18.4 79.6 Q13.6 78.4 13.4 74.6 Q13.6 71.4 16.6 71.6 Q19 72 18.4 74.6 Q17.8 76.2 16 75.6 Q17 77.4 19.6 78.2 Z"/></g><path class="t-s-pink" d="M17.4 80.4 Q18.6 72.4 28 71.6 Q37 71 40.6 74 Q45.4 74.6 47.6 78.6 Q49 82.4 46.4 86 Q42.6 88.6 39.4 87.4 Q31 89.4 24 88.6 Q17.6 87.4 17.4 80.4 Z"/><path class="t-s-pink-lit s-soft" d="M18.4 78.6C19 77.77 20.3 74.63 22 73.6C23.7 72.57 26.33 72.67 28.6 72.4C30.87 72.13 33.63 71.63 35.6 72C37.57 72.37 39.6 74.17 40.4 74.6L40.4 78.2C39.6 77.77 37.57 75.97 35.6 75.6C33.63 75.23 30.87 75.73 28.6 76C26.33 76.27 23.7 76.17 22 77.2C20.3 78.23 19 81.37 18.4 82.2Z"/><path class="t-s-pink-deep s-soft" d="M19.4 84.8C20.5 85.43 23.63 87.97 26 88.6C28.37 89.23 31.33 88.97 33.6 88.6C35.87 88.23 38.6 86.77 39.6 86.4L39.6 82.4C38.6 82.77 35.87 84.23 33.6 84.6C31.33 84.97 28.37 85.23 26 84.6C23.63 83.97 20.5 81.43 19.4 80.8Z"/><g class="stock-head"><path class="t-s-pink-deep" d="M38.4 73.4 Q42.8 70.2 44.8 74.6 Q41.6 77.8 38 76.6 Z"/><path class="t-s-pink s-soft" d="M39 73.8 Q42.4 71.4 44 74.2 Q41.4 74.4 39.4 75.6 Z"/><ellipse class="t-s-pink-deep" cx="47" cy="81.6" rx="3.6" ry="3.4"/><ellipse class="t-s-pink-lit s-soft" cx="45.8" cy="80.2" rx="1.9" ry="1.4" transform="rotate(-20 45.8 80.2)"/><ellipse class="t-s-eye s-soft" cx="47.8" cy="80.4" rx="0.62" ry="0.62"/><ellipse class="t-s-eye s-soft" cx="47.8" cy="83" rx="0.62" ry="0.62"/><ellipse class="t-s-eye s-soft" cx="43.4" cy="77.4" rx="1.25" ry="1.25"/><ellipse class="t-s-eye-hi s-soft" cx="42.98" cy="76.93" rx="0.53" ry="0.53"/><ellipse class="t-s-blush s-soft" cx="41" cy="80.6" rx="2.1" ry="1.39"/></g><g class="a-leg-b"><path class="t-s-pink" d="M26 86.6 H29.4 V96 H26 Z"/><path class="t-s-pink" d="M40 86.6 H43.4 V96 H40 Z"/><path class="t-s-pink-lit s-soft" d="M26 86.6 H27.1 V94 H26 Z"/><path class="t-s-pink-lit s-soft" d="M40 86.6 H41.1 V94 H40 Z"/><path class="t-s-black" d="M26 93.6 H29.4 V96 H26 Z"/><path class="t-s-black" d="M40 93.6 H43.4 V96 H40 Z"/></g></g></g></g>' }
      ]
    },
    sheep: {
      young: [
        { raw: '<g transform="translate(0.2 0)"><ellipse class="t-s-shade s-soft" cx="31.08" cy="94.9" rx="9.4" ry="2.21"/><ellipse class="t-s-shade s-soft" cx="31.64" cy="95.1" rx="5.83" ry="1.46"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-black-lit" d="M21.4 90 H23.8 V96 H21.4 Z"/><path class="t-s-black-lit" d="M30 90 H32.4 V96 H30 Z"/></g><g class="stock-head"><ellipse class="t-s-black-lit" cx="39.6" cy="80.4" rx="6.4" ry="6.4"/><path class="t-s-black s-soft" d="M45.53 82.8C45.45 82.97 45.22 83.49 45.01 83.82C44.81 84.14 44.58 84.44 44.32 84.72C44.06 85 43.78 85.26 43.47 85.49C43.17 85.72 42.84 85.93 42.51 86.1C42.17 86.27 41.81 86.42 41.44 86.53C41.08 86.64 40.7 86.72 40.32 86.76C39.95 86.8 39.56 86.81 39.18 86.79C38.8 86.76 38.24 86.64 38.05 86.61L38.63 84.28C38.75 84.3 39.1 84.38 39.34 84.39C39.58 84.41 39.82 84.4 40.05 84.37C40.29 84.35 40.53 84.3 40.75 84.23C40.98 84.16 41.2 84.07 41.42 83.96C41.63 83.86 41.83 83.73 42.02 83.58C42.21 83.44 42.39 83.28 42.55 83.1C42.71 82.93 42.86 82.74 42.98 82.53C43.11 82.33 43.25 82 43.31 81.9Z"/><path class="t-s-black-lit" d="M34.6 74.6 Q31 73 31 77 Q34 78.4 36 77 Z"/><path class="t-s-cream-deep" d="M42.6 82.4 Q46.4 82.8 45.6 85.8 Q42.4 87 41 84.8 Z"/><ellipse class="t-s-eye s-soft" cx="42.4" cy="79.8" rx="1.8" ry="1.8"/><ellipse class="t-s-eye-hi s-soft" cx="41.79" cy="79.12" rx="0.76" ry="0.76"/><ellipse class="t-s-blush s-soft" cx="38.6" cy="84.4" rx="2.2" ry="1.45"/></g><path class="t-s-cream-lit" d="M34.84 87.85Q35.81 92.42 30.37 91.25Q27.65 95.72 23.85 91.83Q18.72 94.1 18.34 89.3Q13.19 88.31 16.41 84.85Q13.66 81.07 18.97 80.57Q19.9 75.76 24.82 78.45Q29 74.87 31.22 79.49Q36.69 78.81 35.18 83.2Q39.38 85.74 34.84 87.85Z"/><path class="t-s-cream s-soft" d="M17 88.6C17.83 89.23 19.83 91.73 22 92.4C24.17 93.07 27.9 93.07 30 92.6C32.1 92.13 33.83 90.1 34.6 89.6L34.6 86.6C33.83 87.1 32.1 89.13 30 89.6C27.9 90.07 24.17 90.07 22 89.4C19.83 88.73 17.83 86.23 17 85.6Z"/><path class="t-s-cream-lit" d="M34.4 75.6 Q38 72.6 41.4 76 Q37.6 77.8 34.4 78 Z"/><g class="a-leg-b"><path class="t-s-black-lit" d="M25 90 H27.4 V96 H25 Z"/><path class="t-s-black-lit" d="M33.4 90 H35.8 V96 H33.4 Z"/></g></g></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(0.2 0)"><ellipse class="t-s-shade s-soft" cx="31.48" cy="94.9" rx="12.4" ry="2.91"/><ellipse class="t-s-shade s-soft" cx="32.22" cy="95.1" rx="7.69" ry="1.92"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-black" d="M21.6 83 H24.2 V96 H21.6 Z"/><path class="t-s-black" d="M33.4 83 H36 V96 H33.4 Z"/></g><g class="stock-head"><path class="t-s-black" d="M39.6 74.4 Q45.6 72.6 48.2 77.4 Q50 82.6 46.6 86.6 Q42 88.6 39.8 84 Q38.2 78.8 39.6 74.4 Z"/><path class="t-s-black-lit s-soft" d="M40.2 76.4 Q43.6 73.4 47 76.4 Q43.4 76.6 41.2 79.4 Z"/><path class="t-s-cream-deep" d="M45.2 83.2 Q49.6 83.6 48.8 86.9 Q45.2 88.4 43.4 85.8 Z"/><path class="t-s-black" d="M39.4 76.4 Q34.6 74 33.4 77.6 Q36.6 80 39.4 79.6 Z"/><ellipse class="t-s-eye s-soft" cx="44" cy="78.4" rx="1.2" ry="1.2"/><ellipse class="t-s-eye-hi s-soft" cx="43.59" cy="77.94" rx="0.5" ry="0.5"/></g><path class="t-s-cream" d="M38.8 81.62Q40.24 86.36 34.38 85.89Q32.52 90.92 27.43 87.77Q22.86 91.51 20.16 86.68Q14.32 87.94 14.86 82.96Q9.62 81.34 13.23 77.8Q10.24 73.81 15.78 72.82Q16 67.73 21.7 69.62Q25.05 65.04 29.12 69.2Q34.54 66.59 35.67 71.71Q41.44 71.9 39.28 76.34Q43.56 79.26 38.8 81.62Z"/><path class="t-s-cream-lit s-soft" d="M19.25 82.42Q13.52 83.22 14.62 78.62Q10.2 76.14 14.66 73.7Q13.62 69.08 19.35 69.94Q22.18 65.36 26.5 69.12Q31.87 66.7 32.76 71.6Q38.16 72.5 35.2 76.24Q38.1 80.02 32.68 80.86Q31.73 85.76 26.38 83.3Q22.02 87.02 19.25 82.42Z"/><path class="t-s-cream-deep s-soft" d="M17.2 82.6C18.17 83.43 20.7 86.7 23 87.6C25.3 88.5 28.67 88.5 31 88C33.33 87.5 36 85.17 37 84.6L37 80.4C36 80.97 33.33 83.3 31 83.8C28.67 84.3 25.3 84.3 23 83.4C20.7 82.5 18.17 79.23 17.2 78.4Z"/><path class="t-s-cream-lit" d="M38.4 73.6 Q42.8 69.8 46.6 74 Q42.6 76.2 38.4 76.8 Z"/><g class="a-leg-b"><path class="t-s-black-lit" d="M26.6 83 H29.2 V96 H26.6 Z"/><path class="t-s-black-lit" d="M38 83 H40.6 V96 H38 Z"/></g></g></g></g>' }
      ]
    },
    goat: {
      young: [
        { raw: '<g transform="translate(-2 0)"><ellipse class="t-s-shade s-soft" cx="33.32" cy="94.9" rx="9.6" ry="2.26"/><ellipse class="t-s-shade s-soft" cx="33.9" cy="95.1" rx="5.95" ry="1.49"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-brown-deep" d="M20.6 91.6 H23.6 V96 H20.6 Z"/><path class="t-s-brown-deep" d="M29.6 91.6 H32.6 V96 H29.6 Z"/></g><g class="stock-tail"><path class="t-s-tan-lit" d="M17.8 84.6 Q14.6 84.2 14.2 88.6 Q16.6 88.8 18.4 87 Z"/></g><ellipse class="t-s-tan-lit" cx="26.6" cy="88.4" rx="8.8" ry="6.2"/><path class="t-s-tan-lit s-soft" d="M17.85 87.75C17.93 87.5 18.09 86.73 18.34 86.25C18.59 85.78 18.94 85.31 19.35 84.89C19.76 84.47 20.25 84.07 20.8 83.74C21.34 83.4 21.96 83.11 22.6 82.88C23.25 82.64 23.95 82.47 24.66 82.35C25.36 82.24 26.11 82.19 26.83 82.2C27.55 82.22 28.29 82.29 28.99 82.43C29.68 82.57 30.66 82.93 31 83.03L29.8 85.11C29.56 85.05 28.84 84.83 28.34 84.74C27.83 84.66 27.29 84.61 26.77 84.6C26.24 84.59 25.7 84.62 25.19 84.69C24.68 84.76 24.16 84.87 23.69 85.01C23.23 85.16 22.77 85.34 22.38 85.54C21.99 85.75 21.62 85.99 21.33 86.25C21.03 86.5 20.78 86.79 20.6 87.08C20.41 87.38 20.3 87.85 20.24 88Z"/><path class="t-s-tan s-soft" d="M34.87 90.52C34.74 90.7 34.42 91.27 34.12 91.62C33.83 91.96 33.47 92.29 33.09 92.59C32.7 92.89 32.27 93.16 31.8 93.4C31.34 93.64 30.84 93.85 30.32 94.02C29.8 94.19 29.25 94.33 28.69 94.42C28.14 94.52 27.56 94.58 26.98 94.59C26.41 94.61 25.83 94.59 25.26 94.53C24.7 94.47 23.87 94.28 23.59 94.23L24.48 91.78C24.68 91.81 25.26 91.92 25.66 91.96C26.06 91.99 26.47 92.01 26.87 92C27.27 91.99 27.68 91.95 28.07 91.9C28.47 91.84 28.85 91.76 29.22 91.66C29.59 91.56 29.94 91.44 30.27 91.3C30.59 91.16 30.9 91 31.17 90.83C31.44 90.66 31.69 90.47 31.9 90.27C32.11 90.07 32.34 89.74 32.43 89.63Z"/><g class="stock-head"><ellipse class="t-s-tan-lit" cx="39.2" cy="81.2" rx="6.9" ry="6.9"/><path class="t-s-tan-lit s-soft" d="M32.3 80.96C32.35 80.68 32.42 79.81 32.58 79.27C32.73 78.73 32.97 78.19 33.25 77.7C33.54 77.21 33.9 76.74 34.3 76.34C34.7 75.94 35.16 75.58 35.65 75.29C36.13 74.99 36.67 74.76 37.21 74.59C37.75 74.43 38.33 74.33 38.9 74.31C39.46 74.28 40.05 74.33 40.61 74.44C41.16 74.56 41.95 74.91 42.22 75L41.08 77.34C40.92 77.28 40.42 77.06 40.08 76.99C39.73 76.92 39.36 76.89 39.01 76.9C38.66 76.92 38.3 76.98 37.96 77.08C37.62 77.18 37.29 77.33 36.99 77.51C36.68 77.7 36.39 77.92 36.15 78.17C35.9 78.42 35.67 78.71 35.49 79.02C35.32 79.32 35.17 79.66 35.07 80C34.97 80.34 34.93 80.87 34.9 81.05Z"/><path class="t-s-tan s-soft" d="M45.5 84.01C45.41 84.18 45.14 84.73 44.92 85.06C44.7 85.39 44.44 85.71 44.16 85.99C43.89 86.28 43.58 86.55 43.26 86.78C42.93 87.02 42.58 87.23 42.22 87.4C41.87 87.58 41.49 87.72 41.1 87.83C40.72 87.94 40.32 88.02 39.92 88.06C39.52 88.1 39.12 88.11 38.72 88.08C38.32 88.06 37.73 87.93 37.53 87.9L38.18 85.28C38.3 85.29 38.66 85.37 38.91 85.39C39.15 85.41 39.4 85.4 39.64 85.38C39.88 85.35 40.12 85.3 40.36 85.24C40.59 85.17 40.82 85.08 41.04 84.97C41.26 84.87 41.47 84.74 41.67 84.6C41.87 84.45 42.05 84.29 42.22 84.12C42.39 83.94 42.55 83.75 42.68 83.55C42.82 83.35 42.98 83.02 43.04 82.91Z"/><path class="t-s-brown" d="M34.6 73.4 Q30.6 71.4 30.6 75.6 Q33.6 77 35.6 75.6 Z"/><path class="t-s-brown-deep" d="M36.6 72.6 Q36.2 69.4 38 69.6 Q38.4 71.6 38.2 73.4 Z"/><path class="t-s-brown-deep" d="M41.4 72.4 Q41.4 69.2 43.2 69.6 Q43.2 71.4 42.8 73.2 Z"/><path class="t-s-brown" d="M42.4 76.4 Q47.2 75.4 47 79.6 Q46 83.4 42.6 82.6 Q40.4 79.6 42.4 76.4 Z"/><path class="t-s-brown-lit s-soft" d="M42.8 77.6 Q45.6 75.8 46.6 78.4 Q44 78.4 43 80.4 Z"/><path class="t-s-cream-deep" d="M45.4 79.6 Q48.4 79.6 47.8 82.4 Q45.4 83.4 44.2 81.4 Z"/><ellipse class="t-s-eye s-soft" cx="42.4" cy="81.4" rx="1.8" ry="1.8"/><ellipse class="t-s-eye-hi s-soft" cx="41.79" cy="80.72" rx="0.76" ry="0.76"/><ellipse class="t-s-blush s-soft" cx="38.2" cy="85" rx="2.2" ry="1.45"/></g><g class="a-leg-b"><path class="t-s-brown" d="M24.2 91.6 H27.2 V96 H24.2 Z"/><path class="t-s-brown" d="M32.8 91.6 H35.8 V96 H32.8 Z"/></g></g></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(-3.6 0)"><ellipse class="t-s-shade s-soft" cx="35" cy="94.9" rx="12" ry="2.82"/><ellipse class="t-s-shade s-soft" cx="35.72" cy="95.1" rx="7.44" ry="1.86"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-brown-deep" d="M22 84.6 H24.6 V96 H22 Z"/><path class="t-s-brown-deep" d="M34.6 84.6 H37.2 V96 H34.6 Z"/></g><g class="stock-tail"><path class="t-s-brown" d="M19.4 78.4 Q17.4 73 18.8 70.2 Q21.8 73 21.8 78.6 Z"/></g><path class="t-s-tan" d="M19.4 79.6 Q21 74.4 29.4 73.8 Q37.6 73.4 41.2 76.8 Q43.8 80.4 42.2 85.6 Q37.6 88.6 30 88.4 Q21.2 88 19.4 84.4 Z"/><path class="t-s-tan-lit s-soft" d="M20.2 78.6C20.83 78 22.37 75.73 24 75C25.63 74.27 27.9 74.3 30 74.2C32.1 74.1 34.8 73.97 36.6 74.4C38.4 74.83 40.1 76.4 40.8 76.8L40.8 80.2C40.1 79.8 38.4 78.23 36.6 77.8C34.8 77.37 32.1 77.5 30 77.6C27.9 77.7 25.63 77.67 24 78.4C22.37 79.13 20.83 81.4 20.2 82Z"/><path class="t-s-tan-deep s-soft" d="M20.6 84.6C21.67 85.17 24.7 87.47 27 88C29.3 88.53 32 88.3 34.4 87.8C36.8 87.3 40.23 85.47 41.4 85L41.4 81.2C40.23 81.67 36.8 83.5 34.4 84C32 84.5 29.3 84.73 27 84.2C24.7 83.67 21.67 81.37 20.6 80.8Z"/><g class="stock-head"><path class="t-s-tan" d="M37.6 78.6 Q39.6 72.6 43 70.4 L46 73.4 Q42.6 75.4 41.6 80.2 Z"/><path class="t-s-brown" d="M41 67.8 Q46.2 66.6 49 70.4 Q50.4 74.2 46.8 76.8 Q42.2 77.4 40.4 73 Z"/><path class="t-s-brown-lit s-soft" d="M41.6 69.4 Q45 66.8 48.2 70 Q44.4 70 42.2 72.2 Z"/><path class="t-s-cream-deep" d="M46.4 72.2 Q50 72.2 49.4 75.4 Q46.8 76.6 45.2 74.4 Z"/><path class="t-s-horn-deep" d="M42 68 Q40.6 61.6 36.2 56.6 Q39.8 58.6 41.6 62 Q43 64.8 43.8 67.6 Z"/><path class="t-s-horn" d="M45 67.8 Q44.4 61.4 40.6 55.8 Q43.6 58.6 45 62 Q46.2 64.6 46.8 67.4 Z"/><path class="t-s-brown" d="M41 69.6 Q36.6 67.2 35.6 70.6 Q38.4 72.6 41 72.4 Z"/><path class="t-s-brown-deep" d="M43.6 76 Q45.8 81.6 42.8 84.8 Q41.2 80 41.8 75.8 Z"/><ellipse class="t-s-eye s-soft" cx="44.6" cy="71.2" rx="1.2" ry="1.2"/><ellipse class="t-s-eye-hi s-soft" cx="44.19" cy="70.74" rx="0.5" ry="0.5"/></g><g class="a-leg-b"><path class="t-s-brown" d="M27 84.6 H29.6 V96 H27 Z"/><path class="t-s-brown" d="M39.6 84.6 H42.2 V96 H39.6 Z"/><path class="t-s-brown-lit s-soft" d="M27 84.6 H27.9 V94.4 H27 Z"/><path class="t-s-brown-lit s-soft" d="M39.6 84.6 H40.5 V94.4 H39.6 Z"/></g></g></g></g>' }
      ]
    },
    cow: {
      young: [
        { raw: '<g transform="translate(-2 0)"><ellipse class="t-s-shade s-soft" cx="33.32" cy="94.9" rx="9.6" ry="2.26"/><ellipse class="t-s-shade s-soft" cx="33.9" cy="95.1" rx="5.95" ry="1.49"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-white-deep" d="M20.6 91.6 H23.6 V96 H20.6 Z"/><path class="t-s-white-deep" d="M29.6 91.6 H32.6 V96 H29.6 Z"/></g><g class="stock-tail"><path class="t-s-white-lit" d="M17.8 84.6 Q14.6 84.2 14.2 88.6 Q16.6 88.8 18.4 87 Z"/></g><ellipse class="t-s-white-lit" cx="26.6" cy="88.4" rx="8.8" ry="6.2"/><path class="t-s-white-lit s-soft" d="M17.85 87.75C17.93 87.5 18.09 86.73 18.34 86.25C18.59 85.78 18.94 85.31 19.35 84.89C19.76 84.47 20.25 84.07 20.8 83.74C21.34 83.4 21.96 83.11 22.6 82.88C23.25 82.64 23.95 82.47 24.66 82.35C25.36 82.24 26.11 82.19 26.83 82.2C27.55 82.22 28.29 82.29 28.99 82.43C29.68 82.57 30.66 82.93 31 83.03L29.8 85.11C29.56 85.05 28.84 84.83 28.34 84.74C27.83 84.66 27.29 84.61 26.77 84.6C26.24 84.59 25.7 84.62 25.19 84.69C24.68 84.76 24.16 84.87 23.69 85.01C23.23 85.16 22.77 85.34 22.38 85.54C21.99 85.75 21.62 85.99 21.33 86.25C21.03 86.5 20.78 86.79 20.6 87.08C20.41 87.38 20.3 87.85 20.24 88Z"/><path class="t-s-white s-soft" d="M34.87 90.52C34.74 90.7 34.42 91.27 34.12 91.62C33.83 91.96 33.47 92.29 33.09 92.59C32.7 92.89 32.27 93.16 31.8 93.4C31.34 93.64 30.84 93.85 30.32 94.02C29.8 94.19 29.25 94.33 28.69 94.42C28.14 94.52 27.56 94.58 26.98 94.59C26.41 94.61 25.83 94.59 25.26 94.53C24.7 94.47 23.87 94.28 23.59 94.23L24.48 91.78C24.68 91.81 25.26 91.92 25.66 91.96C26.06 91.99 26.47 92.01 26.87 92C27.27 91.99 27.68 91.95 28.07 91.9C28.47 91.84 28.85 91.76 29.22 91.66C29.59 91.56 29.94 91.44 30.27 91.3C30.59 91.16 30.9 91 31.17 90.83C31.44 90.66 31.69 90.47 31.9 90.27C32.11 90.07 32.34 89.74 32.43 89.63Z"/><path class="t-s-black-lit s-soft" d="M21 82.6 Q26 80.6 27 85.4 Q25.6 90.4 21.4 89.4 Q18.4 87 21 82.6 Z"/><g class="stock-head"><ellipse class="t-s-white-lit" cx="39.2" cy="81.2" rx="6.9" ry="6.9"/><path class="t-s-white-lit s-soft" d="M32.3 80.96C32.35 80.68 32.42 79.81 32.58 79.27C32.73 78.73 32.97 78.19 33.25 77.7C33.54 77.21 33.9 76.74 34.3 76.34C34.7 75.94 35.16 75.58 35.65 75.29C36.13 74.99 36.67 74.76 37.21 74.59C37.75 74.43 38.33 74.33 38.9 74.31C39.46 74.28 40.05 74.33 40.61 74.44C41.16 74.56 41.95 74.91 42.22 75L41.08 77.34C40.92 77.28 40.42 77.06 40.08 76.99C39.73 76.92 39.36 76.89 39.01 76.9C38.66 76.92 38.3 76.98 37.96 77.08C37.62 77.18 37.29 77.33 36.99 77.51C36.68 77.7 36.39 77.92 36.15 78.17C35.9 78.42 35.67 78.71 35.49 79.02C35.32 79.32 35.17 79.66 35.07 80C34.97 80.34 34.93 80.87 34.9 81.05Z"/><path class="t-s-white s-soft" d="M45.5 84.01C45.41 84.18 45.14 84.73 44.92 85.06C44.7 85.39 44.44 85.71 44.16 85.99C43.89 86.28 43.58 86.55 43.26 86.78C42.93 87.02 42.58 87.23 42.22 87.4C41.87 87.58 41.49 87.72 41.1 87.83C40.72 87.94 40.32 88.02 39.92 88.06C39.52 88.1 39.12 88.11 38.72 88.08C38.32 88.06 37.73 87.93 37.53 87.9L38.18 85.28C38.3 85.29 38.66 85.37 38.91 85.39C39.15 85.41 39.4 85.4 39.64 85.38C39.88 85.35 40.12 85.3 40.36 85.24C40.59 85.17 40.82 85.08 41.04 84.97C41.26 84.87 41.47 84.74 41.67 84.6C41.87 84.45 42.05 84.29 42.22 84.12C42.39 83.94 42.55 83.75 42.68 83.55C42.82 83.35 42.98 83.02 43.04 82.91Z"/><path class="t-s-white-deep" d="M35.4 73.2 Q31.6 71.4 31.6 75.4 Q34.4 76.8 36.4 75.4 Z"/><path class="t-s-white" d="M42.6 72.6 Q46.6 70.6 46.8 74.6 Q43.8 76.4 41.6 75 Z"/><ellipse class="t-s-pink" cx="45" cy="81.8" rx="3.2" ry="2.7"/><ellipse class="t-s-pink-lit s-soft" cx="44" cy="80.8" rx="1.6" ry="1" transform="rotate(-20 44 80.8)"/><ellipse class="t-s-eye s-soft" cx="45.8" cy="80.9" rx="0.55" ry="0.55"/><ellipse class="t-s-eye s-soft" cx="45.8" cy="82.8" rx="0.55" ry="0.55"/><ellipse class="t-s-eye s-soft" cx="42.4" cy="81.4" rx="1.8" ry="1.8"/><ellipse class="t-s-eye-hi s-soft" cx="41.79" cy="80.72" rx="0.76" ry="0.76"/><ellipse class="t-s-blush s-soft" cx="38.2" cy="85" rx="2.2" ry="1.45"/></g><g class="a-leg-b"><path class="t-s-white" d="M24.2 91.6 H27.2 V96 H24.2 Z"/><path class="t-s-white" d="M32.8 91.6 H35.8 V96 H32.8 Z"/></g></g></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(-3.4 0)"><ellipse class="t-s-shade s-soft" cx="35.8" cy="94.9" rx="14" ry="3.29"/><ellipse class="t-s-shade s-soft" cx="36.64" cy="95.1" rx="8.68" ry="2.17"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-white-deep" d="M20.4 84 H23.6 V96 H20.4 Z"/><path class="t-s-white-deep" d="M34.4 84 H37.6 V96 H34.4 Z"/><path class="t-s-black" d="M20.4 92.6 H23.6 V96 H20.4 Z"/><path class="t-s-black" d="M34.4 92.6 H37.6 V96 H34.4 Z"/></g><g class="stock-tail"><path class="t-s-white-deep" d="M17.6 80.6 Q13.4 78.4 12.6 71.4 Q16.4 74.4 17.4 79 Z"/><path class="t-s-black" d="M12.9 72.6 Q15.4 74.6 16.4 77.4 Q13.8 76.4 12.9 72.6 Z"/></g><ellipse class="t-s-pink s-soft" cx="31.4" cy="87.4" rx="2.9" ry="2.5"/><path class="t-s-white" d="M17.6 78 Q18.6 71 27 70 Q36.6 69.4 41.4 72.6 Q45 75.4 43.6 82 Q42.4 86.6 34.6 86.4 L24.6 86.4 Q18 86 17.6 78 Z"/><path class="t-s-white-lit s-soft" d="M18.4 76.6C19 75.8 20.33 72.83 22 71.8C23.67 70.77 26.13 70.63 28.4 70.4C30.67 70.17 33.5 70.03 35.6 70.4C37.7 70.77 40.1 72.23 41 72.6L41 76.2C40.1 75.83 37.7 74.37 35.6 74C33.5 73.63 30.67 73.77 28.4 74C26.13 74.23 23.67 74.37 22 75.4C20.33 76.43 19 79.4 18.4 80.2Z"/><path class="t-s-white-deep s-soft" d="M19.4 83.4C20.43 83.83 23.17 85.57 25.6 86C28.03 86.43 31.17 86.23 34 86C36.83 85.77 41.17 84.83 42.6 84.6L42.6 81C41.17 81.23 36.83 82.17 34 82.4C31.17 82.63 28.03 82.83 25.6 82.4C23.17 81.97 20.43 80.23 19.4 79.8Z"/><path class="t-s-black s-soft" d="M22.6 72.6 Q29 70.6 30.6 76.4 Q29.4 82.6 23.4 81.6 Q19 79 22.6 72.6 Z"/><path class="t-s-black-lit s-soft" d="M23.2 73.4 Q27.8 71.6 29.6 74.6 Q25.6 74.4 23.4 77.6 Z"/><path class="t-s-black s-soft" d="M35.4 78.6 Q41.6 77.4 42.6 82.4 Q39.4 86 35 84.4 Q32.6 81.4 35.4 78.6 Z"/><g class="stock-head"><path class="t-s-white" d="M39.6 73.6 Q42 67.6 45.6 65.4 L48.6 69 Q44.6 71 43.6 76.6 Z"/><path class="t-s-white" d="M42.6 63.4 Q47.6 62.4 49.6 66.6 Q50.8 71.6 47 74.8 Q42.6 76.2 41.4 71.4 Q40.8 66.4 42.6 63.4 Z"/><path class="t-s-black s-soft" d="M42.6 63.4 Q47 62.4 49.2 66 Q45.6 67.4 41.8 66.6 Z"/><path class="t-s-white-lit s-soft" d="M42.2 67.6 Q45.4 68.2 49.2 67 Q48.6 69 45.4 69.4 Q43 69.2 42.2 67.6 Z"/><path class="t-s-horn-deep" d="M43.6 62.6 Q41 58.6 38.4 57.6 Q41.4 60 42.2 63.4 Z"/><path class="t-s-horn" d="M48.4 63 Q50.2 59.4 52.2 58.6 Q49.8 60.6 49.2 64 Z"/><path class="t-s-white-deep" d="M42.2 65.6 Q38 63.6 37.2 66.8 Q40 68.6 42.4 68.4 Z"/><ellipse class="t-s-pink" cx="47.4" cy="73.4" rx="3.6" ry="3"/><ellipse class="t-s-pink-lit s-soft" cx="46.2" cy="72.2" rx="1.9" ry="1.2" transform="rotate(-20 46.2 72.2)"/><ellipse class="t-s-eye s-soft" cx="48.4" cy="72.6" rx="0.6" ry="0.6"/><ellipse class="t-s-eye s-soft" cx="48.4" cy="74.8" rx="0.6" ry="0.6"/><ellipse class="t-s-eye s-soft" cx="45.2" cy="68.6" rx="1.3" ry="1.3"/><ellipse class="t-s-eye-hi s-soft" cx="44.76" cy="68.11" rx="0.55" ry="0.55"/><ellipse class="t-s-blush s-soft" cx="43.2" cy="71.8" rx="2" ry="1.32"/></g><g class="a-leg-b"><path class="t-s-white" d="M25.4 84 H28.6 V96 H25.4 Z"/><path class="t-s-white" d="M39.4 84 H42.6 V96 H39.4 Z"/><path class="t-s-white-lit s-soft" d="M25.4 84 H26.5 V93 H25.4 Z"/><path class="t-s-white-lit s-soft" d="M39.4 84 H40.5 V93 H39.4 Z"/><path class="t-s-black" d="M25.4 92.6 H28.6 V96 H25.4 Z"/><path class="t-s-black" d="M39.4 92.6 H42.6 V96 H39.4 Z"/></g></g></g></g>' }
      ]
    },
    chicken: {
      young: [
        { raw: '<g transform="translate(-0.9 0)"><ellipse class="t-s-shade s-soft" cx="31.7" cy="94.9" rx="8" ry="1.88"/><ellipse class="t-s-shade s-soft" cx="32.18" cy="95.1" rx="4.96" ry="1.24"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-beak-deep" d="M27 91.6 H28.8 V96 H27 Z"/><path class="t-s-beak-deep" d="M24.6 96 H31 L28.8 93.8 H27 Z"/></g><g class="stock-tail"><path class="t-s-cream-lit" d="M21.4 84.6 Q18 83.4 16.6 86.4 Q19.4 87.8 22 86.6 Z"/></g><ellipse class="t-s-cream-lit" cx="28.8" cy="87.6" rx="7.6" ry="6.6"/><path class="t-s-cream-lit s-soft" d="M21.27 86.68C21.36 86.42 21.53 85.6 21.77 85.1C22 84.6 22.32 84.11 22.69 83.67C23.06 83.24 23.51 82.83 23.99 82.49C24.47 82.15 25.02 81.85 25.59 81.62C26.15 81.39 26.77 81.22 27.38 81.12C28 81.01 28.64 80.98 29.26 81.01C29.89 81.05 30.52 81.15 31.12 81.31C31.71 81.48 32.54 81.89 32.83 82L31.66 83.87C31.46 83.79 30.87 83.52 30.45 83.41C30.02 83.3 29.57 83.23 29.13 83.21C28.69 83.19 28.23 83.21 27.79 83.28C27.36 83.34 26.92 83.46 26.52 83.61C26.12 83.76 25.73 83.96 25.38 84.19C25.04 84.42 24.72 84.69 24.46 84.98C24.2 85.27 23.97 85.6 23.8 85.93C23.63 86.27 23.51 86.81 23.45 86.99Z"/><path class="t-s-cream s-soft" d="M36.03 89.64C35.92 89.85 35.65 90.49 35.4 90.88C35.14 91.26 34.83 91.64 34.49 91.97C34.15 92.31 33.76 92.62 33.35 92.89C32.93 93.16 32.48 93.39 32.01 93.58C31.54 93.77 31.04 93.92 30.54 94.02C30.04 94.13 29.51 94.19 29 94.2C28.48 94.21 27.96 94.17 27.45 94.09C26.94 94.01 26.2 93.78 25.95 93.72L26.85 91.49C27.02 91.53 27.53 91.68 27.87 91.73C28.22 91.78 28.58 91.81 28.94 91.8C29.29 91.79 29.65 91.75 29.99 91.69C30.34 91.62 30.68 91.53 31 91.41C31.32 91.29 31.63 91.14 31.91 90.97C32.19 90.79 32.46 90.6 32.69 90.38C32.93 90.17 33.14 89.93 33.31 89.68C33.49 89.44 33.67 89.03 33.75 88.9Z"/><g class="stock-head"><ellipse class="t-s-cream-lit" cx="35.6" cy="80.4" rx="6" ry="6"/><path class="t-s-cream-lit s-soft" d="M29.61 79.98C29.66 79.74 29.75 78.99 29.9 78.52C30.06 78.05 30.28 77.59 30.54 77.18C30.8 76.76 31.13 76.37 31.49 76.03C31.85 75.69 32.26 75.39 32.69 75.15C33.12 74.91 33.6 74.72 34.07 74.6C34.55 74.47 35.06 74.4 35.55 74.4C36.04 74.4 36.55 74.45 37.03 74.57C37.5 74.69 38.19 75.01 38.42 75.1L37.38 77.04C37.24 76.99 36.81 76.78 36.5 76.71C36.2 76.63 35.88 76.6 35.57 76.6C35.26 76.6 34.93 76.65 34.63 76.73C34.33 76.8 34.03 76.93 33.76 77.08C33.49 77.23 33.22 77.42 33 77.63C32.77 77.85 32.56 78.1 32.4 78.36C32.23 78.62 32.09 78.91 31.99 79.21C31.89 79.51 31.84 79.98 31.81 80.13Z"/><path class="t-s-cream s-soft" d="M40.99 83.03C40.91 83.17 40.68 83.62 40.48 83.88C40.29 84.15 40.08 84.41 39.84 84.64C39.61 84.88 39.35 85.09 39.08 85.28C38.82 85.48 38.53 85.65 38.23 85.79C37.93 85.94 37.62 86.06 37.3 86.15C36.99 86.25 36.66 86.32 36.33 86.36C36 86.4 35.67 86.41 35.34 86.39C35.01 86.38 34.52 86.29 34.35 86.27L34.83 84.02C34.93 84.03 35.24 84.09 35.44 84.1C35.64 84.11 35.85 84.1 36.05 84.07C36.25 84.05 36.46 84.01 36.65 83.95C36.85 83.89 37.04 83.81 37.22 83.73C37.4 83.64 37.58 83.53 37.75 83.41C37.91 83.29 38.07 83.16 38.22 83.02C38.36 82.87 38.49 82.71 38.61 82.55C38.73 82.38 38.87 82.11 38.93 82.02Z"/><path class="t-s-cream-lit" d="M33 74.8 Q34 71.4 35.6 74 Q37.2 71.4 38.2 74.8 Q35.6 73.6 33 74.8 Z"/><path class="t-s-beak" d="M39.8 79 L43.6 80.4 L39.8 81.8 Z"/><path class="t-s-beak-lit s-soft" d="M39.8 79 L42.8 80.1 L39.8 80.4 Z"/><ellipse class="t-s-eye s-soft" cx="38.6" cy="80.2" rx="1.7" ry="1.7"/><ellipse class="t-s-eye-hi s-soft" cx="38.02" cy="79.55" rx="0.71" ry="0.71"/><ellipse class="t-s-blush s-soft" cx="34.4" cy="83.6" rx="2" ry="1.32"/></g><g class="a-leg-b"><path class="t-s-beak" d="M31.2 91.6 H33 V96 H31.2 Z"/><path class="t-s-beak" d="M28.8 96 H35.2 L33 93.8 H31.2 Z"/></g></g></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(-0.4 0)"><ellipse class="t-s-shade s-soft" cx="32.32" cy="94.9" rx="9.6" ry="2.26"/><ellipse class="t-s-shade s-soft" cx="32.9" cy="95.1" rx="5.95" ry="1.49"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-beak-deep" d="M27.4 88.4 H29.4 V96 H27.4 Z"/><path class="t-s-beak-deep" d="M24.4 96 H32.2 L29.4 93.2 H27.4 Z"/></g><g class="stock-tail"><path class="t-s-cream-deep" d="M22.6 83.8 Q17.4 79.6 15.4 73.6 Q20.4 77 23.8 81.4 Z"/><path class="t-s-cream" d="M23.4 85.4 Q19.4 82 17.4 76.6 Q21.6 79.6 24.6 83.4 Z"/><path class="t-s-cream-lit s-soft" d="M22.4 81.6 Q19.6 78.6 18 75.4 Q21 78.4 23.2 81.6 Z"/></g><path class="t-s-cream" d="M21.4 82.4 Q22 75.4 29.4 74.4 Q36.6 74 38.4 80.4 Q39.4 87.4 33.4 90 Q26.4 91.4 22.6 88.4 Q21 86 21.4 82.4 Z"/><path class="t-s-cream-lit s-soft" d="M22 81C22.4 80.27 23.17 77.57 24.4 76.6C25.63 75.63 27.63 75.37 29.4 75.2C31.17 75.03 33.6 75.03 35 75.6C36.4 76.17 37.33 78.1 37.8 78.6L37.8 81.8C37.33 81.3 36.4 79.37 35 78.8C33.6 78.23 31.17 78.23 29.4 78.4C27.63 78.57 25.63 78.83 24.4 79.8C23.17 80.77 22.4 83.47 22 84.2Z"/><path class="t-s-cream-deep s-soft" d="M23.4 88.6C24.23 88.93 26.7 90.47 28.4 90.6C30.1 90.73 32.03 90.27 33.6 89.4C35.17 88.53 37.1 86.07 37.8 85.4L37.8 81.8C37.1 82.47 35.17 84.93 33.6 85.8C32.03 86.67 30.1 87.13 28.4 87C26.7 86.87 24.23 85.33 23.4 85Z"/><path class="t-s-cream-deep" d="M23.6 80.6 Q29.4 77.8 34.8 81 Q32.4 87.6 26.6 87.2 Q22.8 85.6 23.6 80.6 Z"/><path class="t-s-cream s-soft" d="M24.2 80.8C24.9 80.53 26.93 79.33 28.4 79.2C29.87 79.07 32 79.63 33 80C34 80.37 34.17 81.17 34.4 81.4L34.4 83.5C34.17 83.27 34 82.47 33 82.1C32 81.73 29.87 81.17 28.4 81.3C26.93 81.43 24.9 82.63 24.2 82.9Z"/><g class="stock-head"><path class="t-s-cream" d="M33.4 78.4 Q34.4 73 37.4 70.6 L40.6 73.4 Q38 75.4 37.2 79.6 Z"/><ellipse class="t-s-cream" cx="38.4" cy="71.4" rx="4.6" ry="4.6"/><path class="t-s-cream-lit s-soft" d="M33.8 71.4C33.83 71.19 33.86 70.56 33.97 70.16C34.08 69.76 34.25 69.37 34.47 69.01C34.68 68.66 34.95 68.32 35.26 68.04C35.56 67.76 35.91 67.51 36.28 67.32C36.64 67.13 37.05 66.98 37.45 66.9C37.86 66.81 38.29 66.78 38.7 66.81C39.11 66.84 39.54 66.92 39.93 67.06C40.32 67.2 40.85 67.54 41.04 67.63L39.95 69.19C39.84 69.13 39.52 68.93 39.3 68.85C39.07 68.77 38.82 68.72 38.58 68.71C38.33 68.69 38.08 68.71 37.84 68.76C37.61 68.81 37.37 68.89 37.15 69.01C36.94 69.12 36.73 69.26 36.55 69.43C36.38 69.6 36.22 69.79 36.09 70C35.97 70.21 35.87 70.44 35.8 70.67C35.73 70.91 35.72 71.28 35.7 71.4Z"/><path class="t-s-cream-deep s-soft" d="M42.57 73.34C42.5 73.46 42.32 73.82 42.17 74.04C42.02 74.26 41.84 74.46 41.65 74.65C41.46 74.84 41.26 75.02 41.04 75.17C40.82 75.32 40.59 75.46 40.34 75.57C40.1 75.68 39.85 75.77 39.59 75.84C39.33 75.91 39.07 75.96 38.8 75.98C38.54 76.01 38.26 76.01 38 75.98C37.73 75.96 37.34 75.87 37.21 75.84L37.7 74.01C37.78 74.02 38.01 74.08 38.16 74.09C38.32 74.1 38.48 74.1 38.64 74.09C38.79 74.08 38.95 74.05 39.1 74.01C39.25 73.97 39.4 73.91 39.54 73.85C39.68 73.78 39.82 73.7 39.95 73.61C40.08 73.52 40.2 73.42 40.31 73.31C40.42 73.2 40.52 73.08 40.61 72.95C40.7 72.82 40.81 72.61 40.85 72.54Z"/><path class="t-s-comb" d="M35.4 67.8 Q36.4 63.6 38.2 66.6 Q39.4 63.2 40.6 66.2 Q41.8 64.6 42.2 68.4 Q38.6 66.4 35.4 67.8 Z"/><path class="t-s-comb-lit s-soft" d="M36.2 66.6 Q37 64.8 38 66.4 Q37 67 36.4 67.6 Z"/><path class="t-s-comb" d="M39.4 74.6 Q41.6 77.8 39 79 Q37.6 76.8 37.8 74.4 Z"/><path class="t-s-beak" d="M42 70.4 L46.8 71.9 L42 73.4 Z"/><path class="t-s-beak-lit s-soft" d="M42 70.4 L46 71.6 L42 71.9 Z"/><ellipse class="t-s-eye s-soft" cx="40" cy="70.4" rx="1.25" ry="1.25"/><ellipse class="t-s-eye-hi s-soft" cx="39.58" cy="69.93" rx="0.53" ry="0.53"/><ellipse class="t-s-blush s-soft" cx="37.2" cy="73.6" rx="1.6" ry="1.06"/></g><g class="a-leg-b"><path class="t-s-beak" d="M32.6 88.4 H34.6 V96 H32.6 Z"/><path class="t-s-beak" d="M29.8 96 H37.6 L34.6 93.2 H32.6 Z"/><path class="t-s-beak-lit s-soft" d="M32.6 88.4 H33.4 V94.6 H32.6 Z"/></g></g></g></g>' }
      ]
    },
    dog: {
      young: [
        { raw: '<g transform="translate(-2 0)"><ellipse class="t-s-shade s-soft" cx="33.32" cy="94.9" rx="9.6" ry="2.26"/><ellipse class="t-s-shade s-soft" cx="33.9" cy="95.1" rx="5.95" ry="1.49"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-tan-deep" d="M20.6 91.6 H23.6 V96 H20.6 Z"/><path class="t-s-tan-deep" d="M29.6 91.6 H32.6 V96 H29.6 Z"/></g><g class="stock-tail"><path class="t-s-tan-lit" d="M17.8 84.6 Q14.6 84.2 14.2 88.6 Q16.6 88.8 18.4 87 Z"/></g><ellipse class="t-s-tan-lit" cx="26.6" cy="88.4" rx="8.8" ry="6.2"/><path class="t-s-tan-lit s-soft" d="M17.85 87.75C17.93 87.5 18.09 86.73 18.34 86.25C18.59 85.78 18.94 85.31 19.35 84.89C19.76 84.47 20.25 84.07 20.8 83.74C21.34 83.4 21.96 83.11 22.6 82.88C23.25 82.64 23.95 82.47 24.66 82.35C25.36 82.24 26.11 82.19 26.83 82.2C27.55 82.22 28.29 82.29 28.99 82.43C29.68 82.57 30.66 82.93 31 83.03L29.8 85.11C29.56 85.05 28.84 84.83 28.34 84.74C27.83 84.66 27.29 84.61 26.77 84.6C26.24 84.59 25.7 84.62 25.19 84.69C24.68 84.76 24.16 84.87 23.69 85.01C23.23 85.16 22.77 85.34 22.38 85.54C21.99 85.75 21.62 85.99 21.33 86.25C21.03 86.5 20.78 86.79 20.6 87.08C20.41 87.38 20.3 87.85 20.24 88Z"/><path class="t-s-tan s-soft" d="M34.87 90.52C34.74 90.7 34.42 91.27 34.12 91.62C33.83 91.96 33.47 92.29 33.09 92.59C32.7 92.89 32.27 93.16 31.8 93.4C31.34 93.64 30.84 93.85 30.32 94.02C29.8 94.19 29.25 94.33 28.69 94.42C28.14 94.52 27.56 94.58 26.98 94.59C26.41 94.61 25.83 94.59 25.26 94.53C24.7 94.47 23.87 94.28 23.59 94.23L24.48 91.78C24.68 91.81 25.26 91.92 25.66 91.96C26.06 91.99 26.47 92.01 26.87 92C27.27 91.99 27.68 91.95 28.07 91.9C28.47 91.84 28.85 91.76 29.22 91.66C29.59 91.56 29.94 91.44 30.27 91.3C30.59 91.16 30.9 91 31.17 90.83C31.44 90.66 31.69 90.47 31.9 90.27C32.11 90.07 32.34 89.74 32.43 89.63Z"/><g class="stock-head"><ellipse class="t-s-tan-lit" cx="39.2" cy="81.2" rx="6.9" ry="6.9"/><path class="t-s-tan-lit s-soft" d="M32.3 80.96C32.35 80.68 32.42 79.81 32.58 79.27C32.73 78.73 32.97 78.19 33.25 77.7C33.54 77.21 33.9 76.74 34.3 76.34C34.7 75.94 35.16 75.58 35.65 75.29C36.13 74.99 36.67 74.76 37.21 74.59C37.75 74.43 38.33 74.33 38.9 74.31C39.46 74.28 40.05 74.33 40.61 74.44C41.16 74.56 41.95 74.91 42.22 75L41.08 77.34C40.92 77.28 40.42 77.06 40.08 76.99C39.73 76.92 39.36 76.89 39.01 76.9C38.66 76.92 38.3 76.98 37.96 77.08C37.62 77.18 37.29 77.33 36.99 77.51C36.68 77.7 36.39 77.92 36.15 78.17C35.9 78.42 35.67 78.71 35.49 79.02C35.32 79.32 35.17 79.66 35.07 80C34.97 80.34 34.93 80.87 34.9 81.05Z"/><path class="t-s-tan s-soft" d="M45.5 84.01C45.41 84.18 45.14 84.73 44.92 85.06C44.7 85.39 44.44 85.71 44.16 85.99C43.89 86.28 43.58 86.55 43.26 86.78C42.93 87.02 42.58 87.23 42.22 87.4C41.87 87.58 41.49 87.72 41.1 87.83C40.72 87.94 40.32 88.02 39.92 88.06C39.52 88.1 39.12 88.11 38.72 88.08C38.32 88.06 37.73 87.93 37.53 87.9L38.18 85.28C38.3 85.29 38.66 85.37 38.91 85.39C39.15 85.41 39.4 85.4 39.64 85.38C39.88 85.35 40.12 85.3 40.36 85.24C40.59 85.17 40.82 85.08 41.04 84.97C41.26 84.87 41.47 84.74 41.67 84.6C41.87 84.45 42.05 84.29 42.22 84.12C42.39 83.94 42.55 83.75 42.68 83.55C42.82 83.35 42.98 83.02 43.04 82.91Z"/><path class="t-s-tan" d="M34 74 Q30.4 74.6 30.8 80.4 Q33.8 81.4 35.4 77.6 Z"/><path class="t-s-tan-deep" d="M43.6 73.6 Q47.6 74.4 47.4 80.4 Q44.4 81.4 42.8 77.6 Z"/><path class="t-s-cream-lit" d="M44.4 79.2 Q48.6 78.8 49 81.8 Q48.6 84.4 44.2 83.8 Z"/><ellipse class="t-s-nose" cx="48.4" cy="81.2" rx="1.5" ry="1.3"/><ellipse class="t-s-eye-hi s-soft" cx="47.9" cy="80.6" rx="0.5" ry="0.42"/><ellipse class="t-s-eye s-soft" cx="42.4" cy="81.4" rx="1.8" ry="1.8"/><ellipse class="t-s-eye-hi s-soft" cx="41.79" cy="80.72" rx="0.76" ry="0.76"/><ellipse class="t-s-blush s-soft" cx="38.2" cy="85" rx="2.2" ry="1.45"/></g><g class="a-leg-b"><path class="t-s-tan" d="M24.2 91.6 H27.2 V96 H24.2 Z"/><path class="t-s-tan" d="M32.8 91.6 H35.8 V96 H32.8 Z"/></g></g></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(-4.1 0)"><ellipse class="t-s-shade s-soft" cx="36.62" cy="94.9" rx="12.6" ry="2.96"/><ellipse class="t-s-shade s-soft" cx="37.38" cy="95.1" rx="7.81" ry="1.95"/><g class="stock-bob"><g class="stock-ink"><g class="a-leg-a"><path class="t-s-tan-deep" d="M18.6 84 H21.8 V93.4 H23.4 V96 H18.6 Z"/><path class="t-s-tan-deep" d="M34.6 84 H37.8 V93.4 H39.4 V96 H34.6 Z"/></g><g class="stock-tail"><path class="t-s-tan" d="M19.6 79.4 Q13.4 76 12.4 65.4 Q16.4 67.4 17.2 73 Q18 78 21.6 79.6 Z"/><path class="t-s-tan-lit s-soft" d="M18.6 77.4 Q14.4 73.4 13.6 67.4 Q16.2 70.6 16.6 74 Q17.2 76.4 19.4 78.2 Z"/></g><path class="t-s-tan" d="M18.6 80.6 Q17.4 73.4 24 71.6 Q32 70 38.6 72.6 Q43.4 74.6 42.6 82.6 Q41.4 87.4 34.6 86.6 L24.6 86.6 Q19.4 86.4 18.6 80.6 Z"/><path class="t-s-tan-lit s-soft" d="M19.4 79C19.9 78.1 20.8 74.83 22.4 73.6C24 72.37 26.73 71.83 29 71.6C31.27 71.37 33.93 71.63 36 72.2C38.07 72.77 40.5 74.53 41.4 75L41.4 78.2C40.5 77.73 38.07 75.97 36 75.4C33.93 74.83 31.27 74.57 29 74.8C26.73 75.03 24 75.57 22.4 76.8C20.8 78.03 19.9 81.3 19.4 82.2Z"/><path class="t-s-tan-deep s-soft" d="M20.4 84.6C21.43 85 24.27 86.57 26.6 87C28.93 87.43 31.83 87.6 34.4 87.2C36.97 86.8 40.73 85.03 42 84.6L42 81.2C40.73 81.63 36.97 83.4 34.4 83.8C31.83 84.2 28.93 84.03 26.6 83.6C24.27 83.17 21.43 81.6 20.4 81.2Z"/><g class="stock-head"><path class="t-s-tan" d="M37.4 77.4 Q39.4 69.4 44.6 68 L47 74 Q42 76.4 40.6 80 Z"/><ellipse class="t-s-tan" cx="45.8" cy="67.4" rx="6" ry="6"/><path class="t-s-tan-lit s-soft" d="M39.8 67.61C39.83 67.35 39.84 66.54 39.96 66.02C40.08 65.51 40.28 65 40.53 64.54C40.78 64.07 41.1 63.63 41.47 63.25C41.83 62.87 42.26 62.53 42.71 62.26C43.16 61.99 43.67 61.77 44.17 61.63C44.68 61.48 45.22 61.4 45.75 61.4C46.27 61.4 46.82 61.46 47.33 61.6C47.84 61.73 48.55 62.1 48.8 62.2L47.65 64.2C47.5 64.13 47.06 63.9 46.74 63.82C46.43 63.74 46.09 63.7 45.77 63.7C45.44 63.7 45.11 63.75 44.8 63.84C44.48 63.93 44.17 64.06 43.89 64.23C43.62 64.4 43.35 64.61 43.13 64.84C42.9 65.08 42.7 65.35 42.55 65.63C42.39 65.92 42.27 66.24 42.2 66.55C42.12 66.87 42.12 67.37 42.1 67.53Z"/><path class="t-s-tan-deep s-soft" d="M51.24 69.94C51.16 70.08 50.94 70.52 50.75 70.79C50.57 71.06 50.36 71.31 50.13 71.55C49.91 71.78 49.66 72 49.4 72.2C49.14 72.4 48.86 72.57 48.57 72.72C48.28 72.87 47.98 73 47.67 73.1C47.36 73.2 47.03 73.28 46.71 73.33C46.39 73.38 46.06 73.4 45.73 73.4C45.41 73.4 44.92 73.32 44.76 73.31L45.14 71.14C45.24 71.15 45.55 71.2 45.76 71.2C45.96 71.2 46.17 71.19 46.38 71.16C46.58 71.12 46.79 71.08 46.98 71.01C47.18 70.95 47.37 70.87 47.55 70.77C47.74 70.68 47.92 70.56 48.08 70.44C48.25 70.32 48.4 70.18 48.54 70.03C48.69 69.88 48.82 69.72 48.94 69.55C49.05 69.38 49.19 69.1 49.24 69.01Z"/><path class="t-s-cream" d="M48.4 66.2 Q54 65.8 54.6 69.2 Q54.2 72.4 48.2 71.6 Z"/><ellipse class="t-s-cream-lit s-soft" cx="50.4" cy="67.2" rx="2.4" ry="1.1" transform="rotate(-8 50.4 67.2)"/><ellipse class="t-s-nose" cx="54" cy="68.4" rx="1.8" ry="1.6"/><ellipse class="t-s-eye-hi s-soft" cx="53.4" cy="67.6" rx="0.6" ry="0.5"/><path class="t-s-tan-deep" d="M43 61.6 Q39 62.6 39 70 Q41.2 73 43.2 69 Q42 64.6 44.6 62.6 Z"/><ellipse class="t-s-eye s-soft" cx="47.6" cy="65.8" rx="1.35" ry="1.35"/><ellipse class="t-s-eye-hi s-soft" cx="47.14" cy="65.29" rx="0.57" ry="0.57"/><ellipse class="t-s-blush s-soft" cx="44.6" cy="70.6" rx="1.9" ry="1.25"/></g><g class="a-leg-b"><path class="t-s-tan" d="M24 84 H27.2 V93.4 H28.8 V96 H24 Z"/><path class="t-s-tan" d="M40 84 H43.2 V93.4 H44.8 V96 H40 Z"/><path class="t-s-tan-lit s-soft" d="M24 84 H25 V92.6 H24 Z"/><path class="t-s-tan-lit s-soft" d="M40 84 H41 V92.6 H40 Z"/></g></g></g></g>' }
      ]
    },
    cat: {
      young: [
        { raw: '<g transform="translate(-2.4 0)"><ellipse class="t-s-shade s-soft" cx="33.88" cy="94.9" rx="7.4" ry="1.74"/><ellipse class="t-s-shade s-soft" cx="34.32" cy="95.1" rx="4.59" ry="1.15"/><g class="stock-bob"><g class="stock-ink"><g class="stock-tail"><path class="t-s-grey-lit" d="M34.6 95.4 Q41.4 94.6 42.2 88.6 Q39 89.6 38 92.6 Q36.6 93.8 34.6 93.6 Z"/></g><path class="t-s-grey-lit" d="M26.2 96 Q25.2 90 30 87.6 Q34.8 90 33.8 96 Z"/><path class="t-s-grey s-soft" d="M33.6 96 Q34.4 90.4 30.8 88.1 Q32.4 90.4 32.4 92.6 Q32.4 94.6 32.2 96 Z"/><path class="t-s-cream-lit s-soft" d="M28 95.6 Q27.6 91 30 88.8 Q32.4 91 32 95.6 Z"/><g class="stock-head"><ellipse class="t-s-grey-lit" cx="30" cy="83" rx="6.4" ry="6.2"/><path class="t-s-grey-lit s-soft" d="M23.6 83.22C23.63 82.96 23.63 82.18 23.75 81.68C23.86 81.19 24.04 80.69 24.27 80.23C24.51 79.78 24.81 79.34 25.15 78.95C25.49 78.57 25.9 78.21 26.33 77.92C26.76 77.63 27.24 77.38 27.73 77.2C28.22 77.02 28.75 76.9 29.28 76.84C29.8 76.78 30.34 76.79 30.86 76.86C31.38 76.93 32.14 77.19 32.4 77.25L31.5 79.48C31.34 79.44 30.86 79.28 30.54 79.23C30.21 79.19 29.87 79.19 29.55 79.22C29.22 79.26 28.89 79.34 28.58 79.45C28.28 79.56 27.97 79.71 27.71 79.89C27.44 80.07 27.18 80.28 26.97 80.52C26.76 80.76 26.57 81.03 26.42 81.3C26.27 81.58 26.16 81.89 26.09 82.19C26.02 82.5 26.02 82.98 26 83.13Z"/><path class="t-s-grey s-soft" d="M35.43 86.29C35.33 86.41 35.07 86.79 34.87 87.03C34.66 87.26 34.44 87.48 34.2 87.68C33.96 87.88 33.7 88.06 33.44 88.23C33.17 88.39 32.89 88.54 32.6 88.66C32.32 88.79 32.01 88.89 31.71 88.97C31.41 89.06 31.09 89.12 30.78 89.15C30.47 89.19 30.15 89.21 29.83 89.2C29.52 89.19 29.05 89.12 28.89 89.11L29.29 86.84C29.39 86.85 29.69 86.89 29.89 86.9C30.09 86.9 30.3 86.89 30.5 86.87C30.7 86.85 30.9 86.81 31.1 86.76C31.29 86.71 31.48 86.64 31.67 86.56C31.85 86.48 32.03 86.39 32.2 86.29C32.37 86.19 32.54 86.07 32.69 85.94C32.84 85.82 32.99 85.68 33.12 85.53C33.25 85.39 33.42 85.14 33.48 85.07Z"/><path class="t-s-grey-lit" d="M25 78.8 L23.2 72 L28.8 76.2 Z"/><path class="t-s-grey-lit" d="M35 78.8 L36.8 72 L31.2 76.2 Z"/><path class="t-s-pink s-soft" d="M25.6 77.8 L24.8 73.8 L27.9 76.6 Z"/><path class="t-s-pink s-soft" d="M34.4 77.8 L35.2 73.8 L32.1 76.6 Z"/><ellipse class="t-s-cream-lit s-soft" cx="30" cy="85.4" rx="4" ry="2.8"/><ellipse class="t-s-eye s-soft" cx="27" cy="82.6" rx="1.8" ry="1.8"/><ellipse class="t-s-eye-hi s-soft" cx="26.39" cy="81.92" rx="0.76" ry="0.76"/><ellipse class="t-s-eye s-soft" cx="33" cy="82.6" rx="1.8" ry="1.8"/><ellipse class="t-s-eye-hi s-soft" cx="32.39" cy="81.92" rx="0.76" ry="0.76"/><ellipse class="t-s-nose s-soft" cx="30" cy="84.8" rx="0.9" ry="0.7"/><ellipse class="t-s-blush s-soft" cx="25.2" cy="84.8" rx="1.8" ry="1.19"/><ellipse class="t-s-blush s-soft" cx="34.8" cy="84.8" rx="1.8" ry="1.19"/></g></g></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(-5.7 0)"><ellipse class="t-s-shade s-soft" cx="37.58" cy="94.9" rx="9.4" ry="2.21"/><ellipse class="t-s-shade s-soft" cx="38.14" cy="95.1" rx="5.83" ry="1.46"/><g class="stock-bob"><g class="stock-ink"><g class="stock-tail"><path class="t-s-grey" d="M38.6 94 Q47.8 93 48.8 84.4 Q45 85.6 43.4 90 Q41.6 91.6 38.6 91.4 Z"/><path class="t-s-grey-lit s-soft" d="M40.4 92.8 Q46.2 91.4 47.4 86.2 Q45.6 89.4 43.4 90.8 Q42 91.8 40.2 92 Z"/></g><path class="t-s-grey" d="M24.6 96 Q22.6 84 30 79.6 Q37.4 84 35.4 96 Z"/><path class="t-s-grey-lit s-soft" d="M25 95.4 Q23.6 85 29.2 80.6 Q26.6 84.6 26.4 89 Q26.2 92.4 26.6 95.4 Z"/><path class="t-s-grey-deep s-soft" d="M35 96 Q36.6 85.6 31.2 80.8 Q33.8 84.6 33.6 89.2 Q33.6 92.6 33.2 96 Z"/><path class="t-s-cream s-soft" d="M27.4 95.6 Q26.6 86.6 30 82.6 Q33.4 86.6 32.6 95.6 Z"/><g class="stock-head"><ellipse class="t-s-grey" cx="30" cy="76.6" rx="7" ry="7"/><path class="t-s-grey-lit s-soft" d="M23.02 77.09C23.03 76.79 23.01 75.9 23.12 75.32C23.22 74.75 23.41 74.17 23.66 73.64C23.9 73.11 24.23 72.6 24.6 72.15C24.97 71.7 25.41 71.28 25.89 70.94C26.36 70.59 26.89 70.3 27.43 70.09C27.98 69.87 28.57 69.72 29.15 69.65C29.73 69.58 30.33 69.58 30.91 69.66C31.49 69.74 32.34 70.03 32.62 70.11L31.69 72.43C31.5 72.38 30.96 72.19 30.59 72.14C30.22 72.09 29.82 72.09 29.45 72.13C29.08 72.18 28.7 72.28 28.35 72.41C28 72.55 27.66 72.74 27.35 72.96C27.05 73.18 26.77 73.45 26.53 73.74C26.29 74.03 26.08 74.36 25.92 74.7C25.76 75.04 25.64 75.41 25.58 75.78C25.51 76.15 25.52 76.72 25.51 76.91Z"/><path class="t-s-grey-deep s-soft" d="M36.06 80.1C35.96 80.25 35.68 80.7 35.46 80.98C35.24 81.26 34.99 81.52 34.73 81.76C34.47 82 34.18 82.22 33.89 82.42C33.59 82.62 33.28 82.79 32.96 82.94C32.64 83.09 32.3 83.22 31.96 83.32C31.62 83.42 31.27 83.49 30.91 83.54C30.56 83.59 30.2 83.61 29.85 83.6C29.49 83.59 28.96 83.51 28.78 83.49L29.2 81.13C29.32 81.14 29.67 81.19 29.9 81.2C30.13 81.2 30.37 81.19 30.6 81.16C30.83 81.13 31.06 81.08 31.29 81.02C31.51 80.95 31.73 80.87 31.94 80.77C32.16 80.67 32.36 80.55 32.56 80.42C32.75 80.3 32.94 80.15 33.11 79.99C33.28 79.83 33.44 79.66 33.59 79.48C33.73 79.3 33.92 79 33.98 78.9Z"/><path class="t-s-grey" d="M24.6 72.6 L23.4 65.2 L28.8 69.6 Z"/><path class="t-s-grey" d="M35.4 72.6 L36.6 65.2 L31.2 69.6 Z"/><path class="t-s-pink s-soft" d="M25.2 71.6 L24.6 67.6 L27.8 70.2 Z"/><path class="t-s-pink s-soft" d="M34.8 71.6 L35.4 67.6 L32.2 70.2 Z"/><ellipse class="t-s-cream s-soft" cx="30" cy="79.4" rx="4.4" ry="3.1"/><ellipse class="t-s-eye s-soft" cx="27.2" cy="76" rx="1.35" ry="1.35"/><ellipse class="t-s-eye-hi s-soft" cx="26.74" cy="75.49" rx="0.57" ry="0.57"/><ellipse class="t-s-eye s-soft" cx="32.8" cy="76" rx="1.35" ry="1.35"/><ellipse class="t-s-eye-hi s-soft" cx="32.34" cy="75.49" rx="0.57" ry="0.57"/><ellipse class="t-s-nose s-soft" cx="30" cy="78.6" rx="1" ry="0.8"/><ellipse class="t-s-blush s-soft" cx="25.2" cy="78.4" rx="1.8" ry="1.19"/><ellipse class="t-s-blush s-soft" cx="34.8" cy="78.4" rx="1.8" ry="1.19"/></g></g></g></g>' }
      ]
    },
    snakehead: {
      young: [
        { raw: '<g transform="translate(0 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="34.4" cy="78.4" rx="7.6" ry="2.8"/><g class="stock-tail"><path class="t-s-olive s-soft" d="M27.8 63.4 Q22.6 60.4 21.6 62.6 Q22.8 66 21.6 69.4 Q22.6 71.6 27.8 68.6 Z"/><path class="t-s-fin s-soft" d="M27.2 64.2 Q23.6 62 22.6 63.4 Q23.6 66 22.6 68.6 Q23.6 70 27.2 67.8 Z"/></g><path class="t-s-olive-lit s-soft" d="M40.5 66C40.37 65.64 40 64.47 39.7 63.87C39.4 63.27 39.23 62.56 38.7 62.39C38.17 62.23 37.25 62.82 36.5 62.88C35.75 62.95 35.03 62.75 34.2 62.8C33.37 62.86 32.37 63.02 31.5 63.21C30.63 63.4 29.72 63.7 29 63.95C28.28 64.2 27.5 64.57 27.2 64.69L27.2 67.31C27.5 67.44 28.28 67.8 29 68.05C29.72 68.3 30.63 68.6 31.5 68.79C32.37 68.98 33.37 69.14 34.2 69.2C35.03 69.25 35.75 69.05 36.5 69.12C37.25 69.18 38.17 69.77 38.7 69.61C39.23 69.44 39.4 68.73 39.7 68.13C40 67.53 40.37 66.36 40.5 66Z"/><path class="t-s-olive s-soft" d="M38.9 65.2 C34.5 64.6 25.2 64.8 27.6 65.4 L27.6 66.6 C25.2 67.2 34.5 67.4 38.9 66.8 Z"/><path class="t-s-wet s-soft" d="M40.5 66C40.37 65.64 40 64.47 39.7 63.87C39.4 63.27 39.23 62.56 38.7 62.39C38.17 62.23 37.25 62.82 36.5 62.88C35.75 62.95 35.03 62.75 34.2 62.8C33.37 62.86 32.37 63.02 31.5 63.21C30.63 63.4 29.72 63.7 29 63.95C28.28 64.2 27.5 64.57 27.2 64.69L27.2 67.31C27.5 67.44 28.28 67.8 29 68.05C29.72 68.3 30.63 68.6 31.5 68.79C32.37 68.98 33.37 69.14 34.2 69.2C35.03 69.25 35.75 69.05 36.5 69.12C37.25 69.18 38.17 69.77 38.7 69.61C39.23 69.44 39.4 68.73 39.7 68.13C40 67.53 40.37 66.36 40.5 66Z"/><path class="t-s-wet-rim s-soft" d="M38.7 62.39C38.33 62.47 37.25 62.82 36.5 62.88C35.75 62.95 35.03 62.75 34.2 62.8C33.37 62.86 32.37 63.02 31.5 63.21C30.63 63.4 29.42 63.83 29 63.95L29 65.45C29.42 65.33 30.63 64.9 31.5 64.71C32.37 64.52 33.37 64.36 34.2 64.3C35.03 64.25 35.75 64.45 36.5 64.38C37.25 64.32 38.33 63.97 38.7 63.89Z"/><ellipse class="t-s-white-lit s-soft" cx="38.7" cy="63.8" rx="1.6" ry="1.6"/><ellipse class="t-s-eye s-soft" cx="38.7" cy="63.8" rx="0.9" ry="0.9"/><ellipse class="t-s-eye-hi s-soft" cx="39.02" cy="63.42" rx="0.32" ry="0.32"/><ellipse class="t-s-white-lit s-soft" cx="38.7" cy="68.2" rx="1.6" ry="1.6"/><ellipse class="t-s-eye s-soft" cx="38.7" cy="68.2" rx="0.9" ry="0.9"/><ellipse class="t-s-eye-hi s-soft" cx="39.02" cy="67.82" rx="0.32" ry="0.32"/></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(0 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="33.4" cy="78.4" rx="12.4" ry="3.4"/><path class="t-s-olive-deep s-soft" d="M44.4 61.6C43.67 61.7 41.5 62.12 40 62.2C38.5 62.28 37.07 62.03 35.4 62.1C33.73 62.17 31.73 62.37 30 62.6C28.27 62.83 26.43 63.2 25 63.5C23.57 63.8 22 64.25 21.4 64.4L21.4 62.5C22 62.35 23.57 61.9 25 61.6C26.43 61.3 28.27 60.93 30 60.7C31.73 60.47 33.73 60.27 35.4 60.2C37.07 60.13 38.5 60.38 40 60.3C41.5 60.22 43.67 59.8 44.4 59.7Z"/><path class="t-s-olive-deep s-soft" d="M44.4 70.4C43.67 70.3 41.5 69.88 40 69.8C38.5 69.72 37.07 69.97 35.4 69.9C33.73 69.83 31.73 69.63 30 69.4C28.27 69.17 26.43 68.8 25 68.5C23.57 68.2 22 67.75 21.4 67.6L21.4 69.5C22 69.65 23.57 70.1 25 70.4C26.43 70.7 28.27 71.07 30 71.3C31.73 71.53 33.73 71.73 35.4 71.8C37.07 71.87 38.5 71.62 40 71.7C41.5 71.78 43.67 72.2 44.4 72.3Z"/><g class="stock-tail"><path class="t-s-olive-deep s-soft" d="M21.6 63.6 Q15.4 58.4 12.2 60.4 Q14.8 66 12.2 71.6 Q15.4 73.6 21.6 68.4 Z"/><path class="t-s-fin s-soft" d="M20.4 64.2 Q16 60.6 13.4 61.6 Q15.4 65.4 13.6 69.8 Q16.2 70.8 20.4 67.8 Z"/></g><path class="t-s-olive s-soft" d="M48 66C47.73 65.57 47 64.13 46.4 63.4C45.8 62.67 45.47 61.8 44.4 61.6C43.33 61.4 41.5 62.12 40 62.2C38.5 62.28 37.07 62.03 35.4 62.1C33.73 62.17 31.73 62.37 30 62.6C28.27 62.83 26.43 63.2 25 63.5C23.57 63.8 22 64.25 21.4 64.4L21.4 67.6C22 67.75 23.57 68.2 25 68.5C26.43 68.8 28.27 69.17 30 69.4C31.73 69.63 33.73 69.83 35.4 69.9C37.07 69.97 38.5 69.72 40 69.8C41.5 69.88 43.33 70.6 44.4 70.4C45.47 70.2 45.8 69.33 46.4 68.6C47 67.87 47.73 66.43 48 66Z"/><path class="t-s-olive-deep s-soft" d="M44 65.2 C36 64.2 27 64.4 21.8 65.2 L21.8 66.8 C27 67.6 36 67.8 44 66.8 Z"/><ellipse class="t-s-olive-lit s-soft" cx="40.4" cy="63.7" rx="2.2" ry="1.1"/><ellipse class="t-s-olive-lit s-soft" cx="34.6" cy="68.3" rx="2.4" ry="1.2"/><ellipse class="t-s-olive-lit s-soft" cx="29.4" cy="63.8" rx="2.2" ry="1.1"/><ellipse class="t-s-olive-lit s-soft" cx="24.6" cy="67.5" rx="1.6" ry="0.8"/><path class="t-s-olive-deep s-soft" d="M48 66 Q45.6 62.4 43.8 62.6 Q44.8 66 43.8 69.4 Q45.6 69.6 48 66 Z"/><path class="t-s-wet s-soft" d="M48 66C47.73 65.57 47 64.13 46.4 63.4C45.8 62.67 45.47 61.8 44.4 61.6C43.33 61.4 41.5 62.12 40 62.2C38.5 62.28 37.07 62.03 35.4 62.1C33.73 62.17 31.73 62.37 30 62.6C28.27 62.83 26.43 63.2 25 63.5C23.57 63.8 22 64.25 21.4 64.4L21.4 67.6C22 67.75 23.57 68.2 25 68.5C26.43 68.8 28.27 69.17 30 69.4C31.73 69.63 33.73 69.83 35.4 69.9C37.07 69.97 38.5 69.72 40 69.8C41.5 69.88 43.33 70.6 44.4 70.4C45.47 70.2 45.8 69.33 46.4 68.6C47 67.87 47.73 66.43 48 66Z"/><path class="t-s-wet-rim s-soft" d="M44.4 61.6C43.67 61.7 41.5 62.12 40 62.2C38.5 62.28 37.07 62.03 35.4 62.1C33.73 62.17 31.73 62.37 30 62.6C28.27 62.83 25.83 63.35 25 63.5L25 65C25.83 64.85 28.27 64.33 30 64.1C31.73 63.87 33.73 63.67 35.4 63.6C37.07 63.53 38.5 63.78 40 63.7C41.5 63.62 43.67 63.2 44.4 63.1Z"/><ellipse class="t-s-cream s-soft" cx="44.6" cy="63.3" rx="1" ry="1"/><ellipse class="t-s-eye s-soft" cx="44.6" cy="63.3" rx="0.56" ry="0.56"/><ellipse class="t-s-eye-hi s-soft" cx="44.8" cy="63.06" rx="0.2" ry="0.2"/><ellipse class="t-s-cream s-soft" cx="44.6" cy="68.7" rx="1" ry="1"/><ellipse class="t-s-eye s-soft" cx="44.6" cy="68.7" rx="0.56" ry="0.56"/><ellipse class="t-s-eye-hi s-soft" cx="44.8" cy="68.46" rx="0.2" ry="0.2"/></g></g>' }
      ]
    },
    carp: {
      young: [
        { raw: '<g transform="translate(0 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="34.4" cy="78.4" rx="7.6" ry="2.8"/><g class="stock-tail"><path class="t-s-gold s-soft" d="M26.32 63.4 Q21.12 60.4 20.12 62.6 Q21.32 66 20.12 69.4 Q21.12 71.6 26.32 68.6 Z"/><path class="t-s-fin s-soft" d="M25.72 64.2 Q22.12 62 21.12 63.4 Q22.12 66 21.12 68.6 Q22.12 70 25.72 67.8 Z"/></g><path class="t-s-gold-lit s-soft" d="M40.62 66C40.41 65.43 39.91 63.49 39.38 62.56C38.86 61.63 38.17 60.97 37.48 60.42C36.79 59.88 35.99 59.49 35.24 59.28C34.49 59.06 33.84 59.03 33 59.11C32.16 59.19 31.1 59.39 30.2 59.77C29.3 60.15 28.37 60.83 27.62 61.41C26.88 61.98 26.04 62.91 25.72 63.21L25.72 68.79C26.04 69.09 26.88 70.02 27.62 70.59C28.37 71.17 29.3 71.85 30.2 72.23C31.1 72.61 32.16 72.81 33 72.89C33.84 72.97 34.49 72.94 35.24 72.72C35.99 72.51 36.79 72.12 37.48 71.58C38.17 71.03 38.86 70.37 39.38 69.44C39.91 68.51 40.41 66.57 40.62 66Z"/><path class="t-s-gold s-soft" d="M39.02 65.2 C34.62 64.6 23.72 64.8 26.12 65.4 L26.12 66.6 C23.72 67.2 34.62 67.4 39.02 66.8 Z"/><path class="t-s-wet s-soft" d="M40.62 66C40.41 65.43 39.91 63.49 39.38 62.56C38.86 61.63 38.17 60.97 37.48 60.42C36.79 59.88 35.99 59.49 35.24 59.28C34.49 59.06 33.84 59.03 33 59.11C32.16 59.19 31.1 59.39 30.2 59.77C29.3 60.15 28.37 60.83 27.62 61.41C26.88 61.98 26.04 62.91 25.72 63.21L25.72 68.79C26.04 69.09 26.88 70.02 27.62 70.59C28.37 71.17 29.3 71.85 30.2 72.23C31.1 72.61 32.16 72.81 33 72.89C33.84 72.97 34.49 72.94 35.24 72.72C35.99 72.51 36.79 72.12 37.48 71.58C38.17 71.03 38.86 70.37 39.38 69.44C39.91 68.51 40.41 66.57 40.62 66Z"/><path class="t-s-wet-rim s-soft" d="M39.38 62.56C39.07 62.2 38.17 60.97 37.48 60.42C36.79 59.88 35.99 59.49 35.24 59.28C34.49 59.06 33.84 59.03 33 59.11C32.16 59.19 31.1 59.39 30.2 59.77C29.3 60.15 28.05 61.13 27.62 61.41L27.62 62.91C28.05 62.63 29.3 61.65 30.2 61.27C31.1 60.89 32.16 60.69 33 60.61C33.84 60.53 34.49 60.56 35.24 60.78C35.99 60.99 36.79 61.38 37.48 61.92C38.17 62.47 39.07 63.7 39.38 64.06Z"/><ellipse class="t-s-white-lit s-soft" cx="38.82" cy="63.8" rx="1.6" ry="1.6"/><ellipse class="t-s-eye s-soft" cx="38.82" cy="63.8" rx="0.9" ry="0.9"/><ellipse class="t-s-eye-hi s-soft" cx="39.14" cy="63.42" rx="0.32" ry="0.32"/><ellipse class="t-s-white-lit s-soft" cx="38.82" cy="68.2" rx="1.6" ry="1.6"/><ellipse class="t-s-eye s-soft" cx="38.82" cy="68.2" rx="0.9" ry="0.9"/><ellipse class="t-s-eye-hi s-soft" cx="39.14" cy="67.82" rx="0.32" ry="0.32"/></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(0 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="34.4" cy="78.4" rx="12.6" ry="4.6"/><g class="stock-tail"><path class="t-s-gold-deep s-soft" d="M20.4 62.8 Q13.6 57.6 12.4 60.2 Q16.4 64 17.2 66 Q16.4 68 12.4 71.8 Q13.6 74.4 20.4 69.2 Z"/><path class="t-s-fin s-soft" d="M19.6 63.8 Q14.8 59.6 13.6 61.4 Q17 64.4 17.8 66 Q17 67.6 13.6 70.6 Q14.8 72.4 19.6 68.2 Z"/></g><path class="t-s-gold-deep s-soft" d="M37.4 58.4 Q36.4 53 32 51 Q34.6 55 34.8 58.8 Z"/><path class="t-s-gold-deep s-soft" d="M37.4 73.6 Q36.4 79 32 81 Q34.6 77 34.8 73.2 Z"/><path class="t-s-fin s-soft" d="M36.8 58.6 Q36 54.4 33.2 52.6 Q35 55.6 35.2 58.8 Z"/><path class="t-s-fin s-soft" d="M36.8 73.4 Q36 77.6 33.2 79.4 Q35 76.4 35.2 73.2 Z"/><path class="t-s-gold s-soft" d="M46.6 66C46.23 65.3 45.33 62.93 44.4 61.8C43.47 60.67 42.23 59.87 41 59.2C39.77 58.53 38.33 58.07 37 57.8C35.67 57.53 34.5 57.5 33 57.6C31.5 57.7 29.6 57.93 28 58.4C26.4 58.87 24.73 59.7 23.4 60.4C22.07 61.1 20.57 62.23 20 62.6L20 69.4C20.57 69.77 22.07 70.9 23.4 71.6C24.73 72.3 26.4 73.13 28 73.6C29.6 74.07 31.5 74.3 33 74.4C34.5 74.5 35.67 74.47 37 74.2C38.33 73.93 39.77 73.47 41 72.8C42.23 72.13 43.47 71.33 44.4 70.2C45.33 69.07 46.23 66.7 46.6 66Z"/><path class="t-s-gold-deep s-soft" d="M43.4 64.6 C35 63.4 26 63.6 20.6 64.4 L20.6 67.6 C26 68.4 35 68.6 43.4 67.4 Z"/><path class="t-s-gold-deep s-soft" d="M25 59.1Q30 61.9 25 64.7Q26.75 61.9 25 59.1Z"/><path class="t-s-gold-deep s-soft" d="M30 59.1Q35 61.9 30 64.7Q31.75 61.9 30 59.1Z"/><path class="t-s-gold-deep s-soft" d="M35 59.1Q40 61.9 35 64.7Q36.75 61.9 35 59.1Z"/><path class="t-s-gold-deep s-soft" d="M39.4 59.1Q44.4 61.9 39.4 64.7Q41.15 61.9 39.4 59.1Z"/><path class="t-s-gold-deep s-soft" d="M27.4 67.3Q32.4 70.1 27.4 72.9Q29.15 70.1 27.4 67.3Z"/><path class="t-s-gold-deep s-soft" d="M32.4 67.3Q37.4 70.1 32.4 72.9Q34.15 70.1 32.4 67.3Z"/><path class="t-s-gold-deep s-soft" d="M37.2 67.3Q42.2 70.1 37.2 72.9Q38.95 70.1 37.2 67.3Z"/><path class="t-s-gold-lit s-soft" d="M42.4 60.6 Q40.4 66 42.4 71.4 Q41 69 40.6 66 Q41 63 42.4 60.6 Z"/><path class="t-s-wet s-soft" d="M46.6 66C46.23 65.3 45.33 62.93 44.4 61.8C43.47 60.67 42.23 59.87 41 59.2C39.77 58.53 38.33 58.07 37 57.8C35.67 57.53 34.5 57.5 33 57.6C31.5 57.7 29.6 57.93 28 58.4C26.4 58.87 24.73 59.7 23.4 60.4C22.07 61.1 20.57 62.23 20 62.6L20 69.4C20.57 69.77 22.07 70.9 23.4 71.6C24.73 72.3 26.4 73.13 28 73.6C29.6 74.07 31.5 74.3 33 74.4C34.5 74.5 35.67 74.47 37 74.2C38.33 73.93 39.77 73.47 41 72.8C42.23 72.13 43.47 71.33 44.4 70.2C45.33 69.07 46.23 66.7 46.6 66Z"/><path class="t-s-wet-rim s-soft" d="M44.4 61.8C43.83 61.37 42.23 59.87 41 59.2C39.77 58.53 38.33 58.07 37 57.8C35.67 57.53 34.5 57.5 33 57.6C31.5 57.7 29.6 57.93 28 58.4C26.4 58.87 24.17 60.07 23.4 60.4L23.4 61.9C24.17 61.57 26.4 60.37 28 59.9C29.6 59.43 31.5 59.2 33 59.1C34.5 59 35.67 59.03 37 59.3C38.33 59.57 39.77 60.03 41 60.7C42.23 61.37 43.83 62.87 44.4 63.3Z"/><ellipse class="t-s-cream s-soft" cx="43.6" cy="62.7" rx="1.2" ry="1.2"/><ellipse class="t-s-eye s-soft" cx="43.6" cy="62.7" rx="0.67" ry="0.67"/><ellipse class="t-s-eye-hi s-soft" cx="43.84" cy="62.41" rx="0.24" ry="0.24"/><ellipse class="t-s-cream s-soft" cx="43.6" cy="69.3" rx="1.2" ry="1.2"/><ellipse class="t-s-eye s-soft" cx="43.6" cy="69.3" rx="0.67" ry="0.67"/><ellipse class="t-s-eye-hi s-soft" cx="43.84" cy="69.01" rx="0.24" ry="0.24"/></g></g>' }
      ]
    },
    tilapia: {
      young: [
        { raw: '<g transform="translate(0 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="34.4" cy="78.4" rx="7.6" ry="2.8"/><g class="stock-tail"><path class="t-s-grey s-soft" d="M26.64 63.4 Q21.44 60.4 20.44 62.6 Q21.64 66 20.44 69.4 Q21.44 71.6 26.64 68.6 Z"/><path class="t-s-fin s-soft" d="M26.04 64.2 Q22.44 62 21.44 63.4 Q22.44 66 21.44 68.6 Q22.44 70 26.04 67.8 Z"/></g><path class="t-s-grey-lit s-soft" d="M39.6 66C39.4 65.37 38.9 63.29 38.4 62.23C37.9 61.16 37.3 60.26 36.6 59.6C35.9 58.95 35 58.54 34.2 58.29C33.4 58.05 32.6 58.07 31.8 58.13C31 58.18 30.14 58.26 29.4 58.62C28.66 58.98 27.92 59.66 27.36 60.26C26.8 60.86 26.26 61.9 26.04 62.23L26.04 69.77C26.26 70.1 26.8 71.14 27.36 71.74C27.92 72.34 28.66 73.02 29.4 73.38C30.14 73.74 31 73.82 31.8 73.87C32.6 73.93 33.4 73.95 34.2 73.71C35 73.46 35.9 73.05 36.6 72.4C37.3 71.74 37.9 70.84 38.4 69.77C38.9 68.71 39.4 66.63 39.6 66Z"/><path class="t-s-grey s-soft" d="M38 65.2 C33.6 64.6 24.04 64.8 26.44 65.4 L26.44 66.6 C24.04 67.2 33.6 67.4 38 66.8 Z"/><path class="t-s-wet s-soft" d="M39.6 66C39.4 65.37 38.9 63.29 38.4 62.23C37.9 61.16 37.3 60.26 36.6 59.6C35.9 58.95 35 58.54 34.2 58.29C33.4 58.05 32.6 58.07 31.8 58.13C31 58.18 30.14 58.26 29.4 58.62C28.66 58.98 27.92 59.66 27.36 60.26C26.8 60.86 26.26 61.9 26.04 62.23L26.04 69.77C26.26 70.1 26.8 71.14 27.36 71.74C27.92 72.34 28.66 73.02 29.4 73.38C30.14 73.74 31 73.82 31.8 73.87C32.6 73.93 33.4 73.95 34.2 73.71C35 73.46 35.9 73.05 36.6 72.4C37.3 71.74 37.9 70.84 38.4 69.77C38.9 68.71 39.4 66.63 39.6 66Z"/><path class="t-s-wet-rim s-soft" d="M38.4 62.23C38.1 61.79 37.3 60.26 36.6 59.6C35.9 58.95 35 58.54 34.2 58.29C33.4 58.05 32.6 58.07 31.8 58.13C31 58.18 30.14 58.26 29.4 58.62C28.66 58.98 27.7 59.99 27.36 60.26L27.36 61.76C27.7 61.49 28.66 60.48 29.4 60.12C30.14 59.76 31 59.68 31.8 59.63C32.6 59.57 33.4 59.55 34.2 59.79C35 60.04 35.9 60.45 36.6 61.1C37.3 61.76 38.1 63.29 38.4 63.73Z"/><ellipse class="t-s-white-lit s-soft" cx="37.8" cy="63.8" rx="1.6" ry="1.6"/><ellipse class="t-s-eye s-soft" cx="37.8" cy="63.8" rx="0.9" ry="0.9"/><ellipse class="t-s-eye-hi s-soft" cx="38.12" cy="63.42" rx="0.32" ry="0.32"/><ellipse class="t-s-white-lit s-soft" cx="37.8" cy="68.2" rx="1.6" ry="1.6"/><ellipse class="t-s-eye s-soft" cx="37.8" cy="68.2" rx="0.9" ry="0.9"/><ellipse class="t-s-eye-hi s-soft" cx="38.12" cy="67.82" rx="0.32" ry="0.32"/></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(1.5 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="34.4" cy="78.4" rx="12" ry="5.2"/><g class="stock-tail"><path class="t-s-grey s-soft" d="M23.6 61.6 Q16.6 58.4 14.8 60.4 L14.8 71.6 Q16.6 73.6 23.6 70.4 Z"/><path class="t-s-fin s-soft" d="M23 62.6 Q17.4 60 15.8 61.4 L15.8 70.6 Q17.4 72 23 69.4 Z"/><path class="t-s-comb s-soft" d="M14.8 60.6 L14.8 71.4 Q13.6 70.8 13.5 66 Q13.6 61.2 14.8 60.6 Z"/></g><path class="t-s-grey-deep s-soft" d="M23.4 57.2L24.62 52.65L25.83 56.9L27.05 52.61L28.27 56.6L29.48 52.56L30.7 56.3L31.92 52.52L33.13 56L34.35 52.48L35.57 55.7L36.78 52.43L38 55.4L38 56.81L35.57 57.11L33.13 57.41L30.7 57.71L28.27 58.01L25.83 58.31L23.4 58.61Z"/><path class="t-s-grey-deep s-soft" d="M35 75.4C34.33 75.43 32.33 75.67 31 75.6C29.67 75.53 28.23 75.43 27 75C25.77 74.57 24.17 73.33 23.6 73L23.6 74.7C24.17 75.03 25.77 76.27 27 76.7C28.23 77.13 29.67 77.23 31 77.3C32.33 77.37 34.33 77.13 35 77.1Z"/><path class="t-s-grey s-soft" d="M44 66C43.67 65.23 42.83 62.7 42 61.4C41.17 60.1 40.17 59 39 58.2C37.83 57.4 36.33 56.9 35 56.6C33.67 56.3 32.33 56.33 31 56.4C29.67 56.47 28.23 56.57 27 57C25.77 57.43 24.53 58.27 23.6 59C22.67 59.73 21.77 61 21.4 61.4L21.4 70.6C21.77 71 22.67 72.27 23.6 73C24.53 73.73 25.77 74.57 27 75C28.23 75.43 29.67 75.53 31 75.6C32.33 75.67 33.67 75.7 35 75.4C36.33 75.1 37.83 74.6 39 73.8C40.17 73 41.17 71.9 42 70.6C42.83 69.3 43.67 66.77 44 66Z"/><path class="t-s-grey-deep s-soft" d="M41.4 62.8 C35 61.4 28 61.8 22.6 63.4 L22.6 68.6 C28 70.2 35 70.6 41.4 69.2 Z"/><path class="t-s-grey-deep s-soft" d="M39.6 59.8 Q37.4 66 39.6 72.2 Q38.4 69.6 38.2 66 Q38.4 62.4 39.6 59.8 Z"/><path class="t-s-wet s-soft" d="M44 66C43.67 65.23 42.83 62.7 42 61.4C41.17 60.1 40.17 59 39 58.2C37.83 57.4 36.33 56.9 35 56.6C33.67 56.3 32.33 56.33 31 56.4C29.67 56.47 28.23 56.57 27 57C25.77 57.43 24.53 58.27 23.6 59C22.67 59.73 21.77 61 21.4 61.4L21.4 70.6C21.77 71 22.67 72.27 23.6 73C24.53 73.73 25.77 74.57 27 75C28.23 75.43 29.67 75.53 31 75.6C32.33 75.67 33.67 75.7 35 75.4C36.33 75.1 37.83 74.6 39 73.8C40.17 73 41.17 71.9 42 70.6C42.83 69.3 43.67 66.77 44 66Z"/><path class="t-s-wet-rim s-soft" d="M42 61.4C41.5 60.87 40.17 59 39 58.2C37.83 57.4 36.33 56.9 35 56.6C33.67 56.3 32.33 56.33 31 56.4C29.67 56.47 28.23 56.57 27 57C25.77 57.43 24.17 58.67 23.6 59L23.6 60.5C24.17 60.17 25.77 58.93 27 58.5C28.23 58.07 29.67 57.97 31 57.9C32.33 57.83 33.67 57.8 35 58.1C36.33 58.4 37.83 58.9 39 59.7C40.17 60.5 41.5 62.37 42 62.9Z"/><ellipse class="t-s-cream s-soft" cx="41.4" cy="62.7" rx="1.1" ry="1.1"/><ellipse class="t-s-eye s-soft" cx="41.4" cy="62.7" rx="0.62" ry="0.62"/><ellipse class="t-s-eye-hi s-soft" cx="41.62" cy="62.44" rx="0.22" ry="0.22"/><ellipse class="t-s-cream s-soft" cx="41.4" cy="69.3" rx="1.1" ry="1.1"/><ellipse class="t-s-eye s-soft" cx="41.4" cy="69.3" rx="0.62" ry="0.62"/><ellipse class="t-s-eye-hi s-soft" cx="41.62" cy="69.04" rx="0.22" ry="0.22"/></g></g>' }
      ]
    },
    catfish: {
      young: [
        { raw: '<g transform="translate(0 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="34.4" cy="78.4" rx="7.6" ry="2.8"/><g class="stock-tail"><path class="t-s-slate s-soft" d="M25.2 63.4 Q20 60.4 19 62.6 Q20.2 66 19 69.4 Q20 71.6 25.2 68.6 Z"/><path class="t-s-fin s-soft" d="M24.6 64.2 Q21 62 20 63.4 Q21 66 20 68.6 Q21 70 24.6 67.8 Z"/></g><path class="t-s-slate-lit s-soft" d="M39.38 64.52C39.29 63.87 39.1 61.49 38.82 60.59C38.54 59.69 38.21 59.36 37.7 59.11C37.2 58.87 36.49 59 35.8 59.11C35.11 59.22 34.49 59.52 33.56 59.77C32.63 60.01 31.28 60.21 30.2 60.59C29.12 60.97 28 61.63 27.06 62.06C26.13 62.5 25.01 63.02 24.6 63.21L24.6 68.79C25.01 68.98 26.13 69.5 27.06 69.94C28 70.37 29.12 71.03 30.2 71.41C31.28 71.79 32.63 71.99 33.56 72.23C34.49 72.48 35.11 72.78 35.8 72.89C36.49 73 37.2 73.13 37.7 72.89C38.21 72.64 38.54 72.31 38.82 71.41C39.1 70.51 39.29 68.13 39.38 67.48Z"/><path class="t-s-slate s-soft" d="M37.78 65.2 C33.38 64.6 22.6 64.8 25 65.4 L25 66.6 C22.6 67.2 33.38 67.4 37.78 66.8 Z"/><path class="t-s-wet s-soft" d="M39.38 64.52C39.29 63.87 39.1 61.49 38.82 60.59C38.54 59.69 38.21 59.36 37.7 59.11C37.2 58.87 36.49 59 35.8 59.11C35.11 59.22 34.49 59.52 33.56 59.77C32.63 60.01 31.28 60.21 30.2 60.59C29.12 60.97 28 61.63 27.06 62.06C26.13 62.5 25.01 63.02 24.6 63.21L24.6 68.79C25.01 68.98 26.13 69.5 27.06 69.94C28 70.37 29.12 71.03 30.2 71.41C31.28 71.79 32.63 71.99 33.56 72.23C34.49 72.48 35.11 72.78 35.8 72.89C36.49 73 37.2 73.13 37.7 72.89C38.21 72.64 38.54 72.31 38.82 71.41C39.1 70.51 39.29 68.13 39.38 67.48Z"/><path class="t-s-wet-rim s-soft" d="M37.7 59.11C37.39 59.11 36.49 59 35.8 59.11C35.11 59.22 34.49 59.52 33.56 59.77C32.63 60.01 31.28 60.21 30.2 60.59C29.12 60.97 27.59 61.82 27.06 62.06L27.06 63.56C27.59 63.32 29.12 62.47 30.2 62.09C31.28 61.71 32.63 61.51 33.56 61.27C34.49 61.02 35.11 60.72 35.8 60.61C36.49 60.5 37.39 60.61 37.7 60.61Z"/><ellipse class="t-s-white-lit s-soft" cx="37.58" cy="63.8" rx="1.6" ry="1.6"/><ellipse class="t-s-eye s-soft" cx="37.58" cy="63.8" rx="0.9" ry="0.9"/><ellipse class="t-s-eye-hi s-soft" cx="37.9" cy="63.42" rx="0.32" ry="0.32"/><ellipse class="t-s-white-lit s-soft" cx="37.58" cy="68.2" rx="1.6" ry="1.6"/><ellipse class="t-s-eye s-soft" cx="37.58" cy="68.2" rx="0.9" ry="0.9"/><ellipse class="t-s-eye-hi s-soft" cx="37.9" cy="67.82" rx="0.32" ry="0.32"/></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(0 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="33.4" cy="78.4" rx="12.4" ry="4.4"/><g class="stock-tail"><path class="t-s-slate-deep s-soft" d="M18.4 62.8 Q13 59.2 12.2 61.4 Q15.4 64.4 16 66 Q15.4 67.6 12.2 70.6 Q13 72.8 18.4 69.2 Z"/><path class="t-s-fin s-soft" d="M17.8 63.8 Q13.8 61 13.2 62.6 Q16 65 16.6 66 Q16 67 13.2 69.4 Q13.8 71 17.8 68.2 Z"/></g><path class="t-s-slate-deep s-soft" d="M43.4 60.8 Q39.6 55 33 51.4 Q38.4 55.8 42 61.8 Z"/><path class="t-s-slate-deep s-soft" d="M43.4 71.2 Q39.6 77 33 80.6 Q38.4 76.2 42 70.2 Z"/><path class="t-s-slate-deep s-soft" d="M44.4 63 Q47.4 60.4 48.4 57.2 Q46.4 61 44.4 64 Z"/><path class="t-s-slate-deep s-soft" d="M44.4 69 Q47.4 71.6 48.4 74.8 Q46.4 71 44.4 68 Z"/><path class="t-s-slate-deep s-soft" d="M34.6 58.8 Q32.6 54 28.4 52 Q31.4 55.6 32 59.2 Z"/><path class="t-s-slate-deep s-soft" d="M34.6 73.2 Q32.6 78 28.4 80 Q31.4 76.4 32 72.8 Z"/><path class="t-s-fin s-soft" d="M34.2 59 Q32.4 55.2 29.6 53.4 Q31.8 56 32.4 59.2 Z"/><path class="t-s-fin s-soft" d="M34.2 73 Q32.4 76.8 29.6 78.6 Q31.8 76 32.4 72.8 Z"/><path class="t-s-slate s-soft" d="M44.4 64.2C44.23 63.4 43.9 60.5 43.4 59.4C42.9 58.3 42.3 57.9 41.4 57.6C40.5 57.3 39.23 57.47 38 57.6C36.77 57.73 35.67 58.1 34 58.4C32.33 58.7 29.93 58.93 28 59.4C26.07 59.87 24.07 60.67 22.4 61.2C20.73 61.73 18.73 62.37 18 62.6L18 69.4C18.73 69.63 20.73 70.27 22.4 70.8C24.07 71.33 26.07 72.13 28 72.6C29.93 73.07 32.33 73.3 34 73.6C35.67 73.9 36.77 74.27 38 74.4C39.23 74.53 40.5 74.7 41.4 74.4C42.3 74.1 42.9 73.7 43.4 72.6C43.9 71.5 44.23 68.6 44.4 67.8Z"/><path class="t-s-slate-deep s-soft" d="M44.4 64.2C44.23 63.47 43.9 60.8 43.4 59.8C42.9 58.8 42.2 58.4 41.4 58.2C40.6 58 39.43 58.23 38.6 58.6C37.77 58.97 37.07 59.53 36.4 60.4C35.73 61.27 34.9 63.23 34.6 63.8L34.6 68.2C34.9 68.77 35.73 70.73 36.4 71.6C37.07 72.47 37.77 73.03 38.6 73.4C39.43 73.77 40.6 74 41.4 73.8C42.2 73.6 42.9 73.2 43.4 72.2C43.9 71.2 44.23 68.53 44.4 67.8Z"/><path class="t-s-slate-lit s-soft" d="M43.8 61.4 Q41.6 66 43.8 70.6 Q42.4 68.4 42.2 66 Q42.4 63.6 43.8 61.4 Z"/><path class="t-s-slate-lit s-soft" d="M35.4 64.6 C30 64.2 24 64.8 19 65.4 L19 66.6 C24 67.2 30 67.8 35.4 67.4 Z"/><path class="t-s-wet s-soft" d="M44.4 64.2C44.23 63.4 43.9 60.5 43.4 59.4C42.9 58.3 42.3 57.9 41.4 57.6C40.5 57.3 39.23 57.47 38 57.6C36.77 57.73 35.67 58.1 34 58.4C32.33 58.7 29.93 58.93 28 59.4C26.07 59.87 24.07 60.67 22.4 61.2C20.73 61.73 18.73 62.37 18 62.6L18 69.4C18.73 69.63 20.73 70.27 22.4 70.8C24.07 71.33 26.07 72.13 28 72.6C29.93 73.07 32.33 73.3 34 73.6C35.67 73.9 36.77 74.27 38 74.4C39.23 74.53 40.5 74.7 41.4 74.4C42.3 74.1 42.9 73.7 43.4 72.6C43.9 71.5 44.23 68.6 44.4 67.8Z"/><path class="t-s-wet-rim s-soft" d="M43.4 59.4C43.07 59.1 42.3 57.9 41.4 57.6C40.5 57.3 39.23 57.47 38 57.6C36.77 57.73 35.67 58.1 34 58.4C32.33 58.7 29.93 58.93 28 59.4C26.07 59.87 23.33 60.9 22.4 61.2L22.4 62.7C23.33 62.4 26.07 61.37 28 60.9C29.93 60.43 32.33 60.2 34 59.9C35.67 59.6 36.77 59.23 38 59.1C39.23 58.97 40.5 58.8 41.4 59.1C42.3 59.4 43.07 60.6 43.4 60.9Z"/><ellipse class="t-s-cream s-soft" cx="40.8" cy="61.5" rx="1.1" ry="1.1"/><ellipse class="t-s-eye s-soft" cx="40.8" cy="61.5" rx="0.62" ry="0.62"/><ellipse class="t-s-eye-hi s-soft" cx="41.02" cy="61.24" rx="0.22" ry="0.22"/><ellipse class="t-s-cream s-soft" cx="40.8" cy="70.5" rx="1.1" ry="1.1"/><ellipse class="t-s-eye s-soft" cx="40.8" cy="70.5" rx="0.62" ry="0.62"/><ellipse class="t-s-eye-hi s-soft" cx="41.02" cy="70.24" rx="0.22" ry="0.22"/></g></g>' }
      ]
    },
    lobster: {
      young: [
        { raw: '<g transform="translate(-1.3 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="33.4" cy="78.4" rx="8.4" ry="3.2"/><path class="t-s-shell-lit s-soft" d="M40.4 63.6 Q42.4 60.6 43.8 58.4 Q42.8 61.4 41.4 64 Z"/><path class="t-s-shell-lit s-soft" d="M40.4 68.4 Q42.4 71.4 43.8 73.6 Q42.8 70.6 41.4 68 Z"/><g class="stock-tail"><path class="t-s-shell-lit s-soft" d="M22.6 63.4 Q18.4 60 17.6 62.4 Q19.6 64.4 20.2 66 Q19.6 67.6 17.6 69.6 Q18.4 72 22.6 68.6 Z"/></g><path class="t-s-shell-lit s-soft" d="M22.6 63.6 L30.4 61.8 L30.4 70.2 L22.6 68.4 Z"/><path class="t-s-shell s-soft" d="M24.6 62.9 L25.1 62.8 L25.1 69.2 L24.6 69.1 Z"/><path class="t-s-shell s-soft" d="M27.2 62.4 L27.7 62.3 L27.7 69.7 L27.2 69.6 Z"/><path class="t-s-shell s-soft" d="M32.6 62.4 Q31.8 58.6 29.6 56.4 Q31.2 59.4 31.6 62.6 Z"/><path class="t-s-shell s-soft" d="M36.2 62.2 Q35.8 58.6 34 56.4 Q35.4 59.4 35.2 62.4 Z"/><path class="t-s-shell s-soft" d="M32.6 71.6 Q31.8 75.4 29.6 77.6 Q31.2 74.6 31.6 71.4 Z"/><path class="t-s-shell s-soft" d="M36.2 71.8 Q35.8 75.4 34 77.6 Q35.4 74.6 35.2 71.6 Z"/><path class="t-s-shell-lit s-soft" d="M30 61.4 Q34 60 38.4 60.6 Q40.8 61.2 41.4 63.6 L42.2 66 L41.4 68.4 Q40.8 70.8 38.4 71.4 Q34 72 30 70.6 Z"/><path class="t-s-shell s-soft" d="M30 65.4 Q36 64.6 41.6 65.4 L41.6 66.6 Q36 67.4 30 66.6 Z"/><path class="t-s-shell-lit s-soft" d="M37.4 61 Q40 59 41.8 57.6 L43 59.4 Q40.8 60.4 38.8 62.4 Z"/><ellipse class="t-s-shell-lit s-soft" cx="42.6" cy="58.4" rx="2.4" ry="2" transform="rotate(-32 42.6 58.4)"/><path class="t-s-shell-lit s-soft" d="M37.4 71 Q40 73 41.8 74.4 L43 72.6 Q40.8 71.6 38.8 69.6 Z"/><ellipse class="t-s-shell-lit s-soft" cx="42.6" cy="73.6" rx="2.4" ry="2" transform="rotate(32 42.6 73.6)"/><ellipse class="t-s-white-lit s-soft" cx="41" cy="64" rx="1.4" ry="1.4"/><ellipse class="t-s-eye s-soft" cx="41" cy="64" rx="0.78" ry="0.78"/><ellipse class="t-s-eye-hi s-soft" cx="41.28" cy="63.66" rx="0.28" ry="0.28"/><ellipse class="t-s-white-lit s-soft" cx="41" cy="68" rx="1.4" ry="1.4"/><ellipse class="t-s-eye s-soft" cx="41" cy="68" rx="0.78" ry="0.78"/><ellipse class="t-s-eye-hi s-soft" cx="41.28" cy="67.66" rx="0.28" ry="0.28"/></g></g>' }
      ],
      adult: [
        { raw: '<g transform="translate(0 0)"><g class="stock-swim"><ellipse class="t-s-shade-wet s-soft" cx="33.4" cy="78.4" rx="13" ry="5"/><path class="t-s-shell-deep s-soft" d="M42.4 63 Q45.4 57.4 47.8 53.4 Q45.8 58.6 43.4 63.6 Z"/><path class="t-s-shell-deep s-soft" d="M42.4 69 Q45.4 74.6 47.8 78.6 Q45.8 73.4 43.4 68.4 Z"/><g class="stock-tail"><path class="t-s-shell s-soft" d="M18.6 62.4 Q13 57.4 12 60.4 Q14.6 63.4 15.4 66 Q14.6 68.6 12 71.6 Q13 74.6 18.6 69.6 Z"/><path class="t-s-shell-deep s-soft" d="M18.4 63.6 Q14.6 61 13 58.8 Q14.4 62 15 64 Z"/><path class="t-s-shell-deep s-soft" d="M18.4 68.4 Q14.6 71 13 73.2 Q14.4 70 15 68 Z"/></g><path class="t-s-shell s-soft" d="M18.6 62.6 L29.4 60.4 L29.4 71.6 L18.6 69.4 Z"/><path class="t-s-shell-lit s-soft" d="M18.8 63 L29.2 60.9 L29.2 63.2 L18.9 64.8 Z"/><path class="t-s-shell-deep s-soft" d="M21 61.8 L21.6 61.7 L21.6 70.3 L21 70.2 Z"/><path class="t-s-shell-deep s-soft" d="M23.6 61.3 L24.2 61.2 L24.2 70.8 L23.6 70.7 Z"/><path class="t-s-shell-deep s-soft" d="M26.2 60.8 L26.8 60.7 L26.8 71.3 L26.2 71.2 Z"/><path class="t-s-shell-deep s-soft" d="M33.4 60.6 Q32.4 55.4 29.4 52.4 Q31.6 56.4 32.2 60.8 Z"/><path class="t-s-shell-deep s-soft" d="M36.4 60.2 Q36 55 33.6 51.6 Q35.4 56 35.2 60.4 Z"/><path class="t-s-shell-deep s-soft" d="M39.2 60.4 Q39.4 55.6 37.6 52.4 Q38.4 56.4 38 60.6 Z"/><path class="t-s-shell-deep s-soft" d="M33.4 71.4 Q32.4 76.6 29.4 79.6 Q31.6 75.6 32.2 71.2 Z"/><path class="t-s-shell-deep s-soft" d="M36.4 71.8 Q36 77 33.6 80.4 Q35.4 76 35.2 71.6 Z"/><path class="t-s-shell-deep s-soft" d="M39.2 71.6 Q39.4 76.4 37.6 79.6 Q38.4 75.6 38 71.4 Z"/><path class="t-s-shell s-soft" d="M29 60 Q34 58 39.4 58.8 Q42.6 59.6 43.4 63 L44.4 66 L43.4 69 Q42.6 72.4 39.4 73.2 Q34 74 29 72 Z"/><path class="t-s-shell-lit s-soft" d="M30.4 61.4 Q35 59.8 39.2 60.4 Q41.4 61 42 63.4 Q38.6 62 34 62.4 Q31.6 62.6 30.4 63 Z"/><path class="t-s-shell-deep s-soft" d="M29.6 65.4 Q36.4 64.4 43.6 65.4 L43.6 66.6 Q36.4 67.6 29.6 66.6 Z"/><path class="t-s-shell s-soft" d="M38.4 59.4 Q42 56.4 44.6 54.2 L46.4 57 Q43.4 58.4 40.4 61.4 Z"/><ellipse class="t-s-shell s-soft" cx="45.2" cy="55.6" rx="3.6" ry="3" transform="rotate(-32 45.2 55.6)"/><ellipse class="t-s-shell-lit s-soft" cx="44.4" cy="54.4" rx="1.9" ry="1.1" transform="rotate(-32 44.4 54.4)"/><path class="t-s-shell s-soft" d="M45.6 52.8 Q47.6 49.4 48.4 50.4 Q47.6 53 46.8 54.4 Z"/><path class="t-s-shell s-soft" d="M47.8 54.6 Q48.6 52.2 47.4 56 Q46.6 57 45.8 56.6 Z"/><path class="t-s-shell-deep s-soft" d="M43.4 54.6 Q45.6 53.4 47.4 54 Q45.4 54.6 43.8 55.6 Z"/><path class="t-s-shell s-soft" d="M38.4 72.6 Q42 75.6 44.6 77.8 L46.4 75 Q43.4 73.6 40.4 70.6 Z"/><ellipse class="t-s-shell s-soft" cx="45.2" cy="76.4" rx="3.6" ry="3" transform="rotate(32 45.2 76.4)"/><ellipse class="t-s-shell-lit s-soft" cx="44.4" cy="75.2" rx="1.9" ry="1.1" transform="rotate(32 44.4 75.2)"/><path class="t-s-shell s-soft" d="M45.6 79.2 Q47.6 82.6 48.4 81.6 Q47.6 79 46.8 77.6 Z"/><path class="t-s-shell s-soft" d="M47.8 77.4 Q48.6 79.8 47.4 76 Q46.6 75 45.8 75.4 Z"/><path class="t-s-shell-deep s-soft" d="M43.4 77.4 Q45.6 78.6 47.4 78 Q45.4 77.4 43.8 76.4 Z"/><ellipse class="t-s-shell-lit s-soft" cx="43" cy="63.7" rx="1" ry="1"/><ellipse class="t-s-eye s-soft" cx="43" cy="63.7" rx="0.56" ry="0.56"/><ellipse class="t-s-eye-hi s-soft" cx="43.2" cy="63.46" rx="0.2" ry="0.2"/><ellipse class="t-s-shell-lit s-soft" cx="43" cy="68.3" rx="1" ry="1"/><ellipse class="t-s-eye s-soft" cx="43" cy="68.3" rx="0.56" ry="0.56"/><ellipse class="t-s-eye-hi s-soft" cx="43.2" cy="68.06" rx="0.2" ry="0.2"/></g></g>' }
      ]
    },
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
    ]
  };;

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

  // Where a producing animal shows what is waiting to be collected. Two tidy
  // RANKS above the animal rather than a scatter, and ordered from the CENTRE
  // OUTWARD: at plot size nine loose dots read as insects circling the animal.
  // With one unit waiting the marker sits over the animal and with two they
  // straddle it; filling left to right instead put a pair off to one side, where
  // two pale discs side by side read as a pair of eyes floating above it.
  var DECOR_YIELD_SPOTS = [[30,57],[24,57],[36,57],[18,57],[42,57],
                           [27,48],[33,48],[21,48],[39,48]];
  // A fish needs its own list. A hen tops out around y=63 and the list above
  // clears it; a fish hangs on y=66 and reaches up to about y=51, so the lower
  // rank landed ON the dorsal edge and read as a rash.
  var DECOR_FISH_YIELD_SPOTS = [[30,41],[24,41],[36,41],[18,41],[42,41],
                                [27,32],[33,32],[21,32],[39,32]];
  var DECOR_IS_FISH = { snakehead:1, carp:1, tilapia:1, catfish:1, lobster:1, pond:1 };

  // One marker: a produce nugget with a catchlight on its upper left, so it is
  // lit from the same direction as everything else on the farm, sitting on a soft
  // warm glow. It replaces a bare 2.2-unit orange circle, which at plot size was
  // a dot — and a scatter of dots above an animal reads as flies, not a harvest.
  // The glow is deliberately faint: at a high alpha a pale disc with a warm dot
  // in the middle of it is an eyeball, and two of those are a face.
  function yieldMark(x, y){
    return '<circle class="t-s-badge" cx="' + x + '" cy="' + y + '" r="4"/>' +
      '<path class="t-yield" d="M' + x + ' ' + (y - 3.5) + ' q2.6 1.95 2.6 4.15 ' +
        'q0 2.6 -2.6 2.6 q-2.6 0 -2.6 -2.6 q0 -2.2 2.6 -4.15 Z"/>' +
      '<ellipse class="t-s-badge-hi" cx="' + (x - 0.8) + '" cy="' + (y - 0.9) +
        '" rx="0.62" ry="1.05" transform="rotate(-24 ' + (x - 0.8) + ' ' +
        (y - 0.9) + ')"/>';
  }

  // Two drawings per species where there are two: the juvenile and the adult.
  // A flat array is a species that only has the one, and it grows by size alone
  // until its young drawing exists.
  //
  // The reason for a second drawing rather than just a smaller one: a piglet is
  // not a pig scaled down. The head is proportionally larger, the legs are
  // shorter, there are no tusks. Scale alone produces a squashed adult, which is
  // exactly what looked wrong.
  function decorParts(decorKey, stage){
    var d = DECOR[decorKey];
    if(!d) return [];
    if(Array.isArray(d)) return d;
    if(stage <= 3) return d.young || d.adult || [];
    return d.adult || d.young || [];
  }

  // Full size at stage 5. Deliberately not linear: most of the change lands in
  // the first two steps, because that is where growing up is visible. The last
  // step is small so a nearly grown animal does not visibly pop.
  //
  // Indexed from 2, not from 0. Stage 1 for a plant is bare soil with nothing
  // showing yet, which is right for a seed and meaningless for an animal: money
  // was spent on a creature, so there has to be a creature standing there. Every
  // animal therefore starts at stage 2, and this table has no entry below it.
  var STOCK_SCALE = { 2: 0.56, 3: 0.72, 4: 0.88, 5: 1 };

  // The one place an animal decides how grown up it is, so the drawing, the
  // wording and the maturity gate cannot disagree with each other.
  function stockStageOf(meta, item, earned){
    if(!meta || !meta.mature) return 5;
    return Math.max(2, plantStageForAge(plantAgeIn(item, earned), matureOf(meta)));
  }

  // Where a producing animal shows what is waiting. Kept off the body for a
  // young one: there is nothing to collect from it, so it never gets markers.
  function drawDecor(decorKey, fruit, stage){
    if(stage == null) stage = 5;
    var parts = decorParts(decorKey, stage);
    var body = '';
    for(var i = 0; i < parts.length; i++) body += svgPart(parts[i]);
    var spots = DECOR_IS_FISH[decorKey] ? DECOR_FISH_YIELD_SPOTS : DECOR_YIELD_SPOTS;
    for(var f = 0; f < (fruit || 0) && f < spots.length; f++){
      body += yieldMark(spots[f][0], spots[f][1]);
    }
    // Not `STOCK_SCALE[stage] || 1`: the table used to run from index 0, so a
    // stage whose entry was 0 fell through the `||` and drew at FULL SIZE. A
    // newborn animal came out the size of an adult, which is the whole thing
    // this stage ramp exists to prevent.
    var k = STOCK_SCALE[stage];
    if(!(k > 0)) k = 1;
    return wrapSvg(body, 13 * k, '0', k, k);
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
    // Keyed on `mature` rather than on `grows`, so it covers livestock as well.
    // It used to read `meta.grows`, which meant only plants had to grow up and
    // an animal produced from the moment it was bought — a calf giving milk is a
    // calf that was never raised, and it was also the cheapest rate on the farm.
    if(meta.mature && plantStageForAge(plantAgeIn(item, earned), matureOf(meta)) < 5){
      return false;
    }
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
  // Said of an animal, not of a plant. "A seedling cow" is the sort of thing
  // that happens when one list is made to serve two kinds of living thing.
  var STOCK_WORDS = ['', '', 'newborn', 'growing', 'nearly grown', 'full grown'];

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
      // Livestock has stages as well now. `plant-growing` is deliberately NOT
      // applied: that class sways the sprite, and a swaying cow is a cow in a
      // gale. Growing up here is size and shape, not motion — the animal has its
      // own walk for that.
      var stockStage = stockStageOf(meta, item, earned);
      el.setAttribute('data-stage', String(stockStage));
      if(stockStage < 5) el.className += ' stock-young';
      el.innerHTML = drawDecor(meta.decor,
        ripe ? ripeFruitCount(item, meta, earned) : 0, stockStage);
      el.title = meta.name +
        (stockStage < 5 ? ' · ' + STOCK_WORDS[stockStage] : '') +
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
          '<span class="shop-price">' + coin(item.price) + '</span>' +
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
      art: '<ellipse class="t-s-shade s-soft" cx="24.74" cy="50.6" rx="17" ry="3.23"/><ellipse class="t-s-shade s-soft" cx="26.1" cy="51" rx="10.2" ry="2.21"/><g class="stock-ink"><path class="t-s-plank-deep s-soft" d="M32 33 L45 33 L45 41 L32 41 Z"/><path class="t-s-beam s-soft" d="M30 32 L38.5 26 L47 32 Z"/><path class="t-s-plank s-soft" d="M6 30 L34 30 L34 46 L6 46 Z"/><path class="t-s-plank-lit s-soft" d="M6 30 L20 30 L20 46 L6 46 Z"/><path class="t-s-plank-deep s-soft" d="M6 44.4 L34 44.4 L34 46 L6 46 Z"/><path class="t-s-plank-deep s-soft" d="M19.2 30 L20.8 30 L20.8 46 L19.2 46 Z"/><path class="t-s-roof s-soft" d="M2 31 L20 18 L38 31 Z"/><path class="t-s-roof-lit s-soft" d="M2 31 L20 18 L20 31 Z"/><path class="t-s-roof-deep s-soft" d="M2 31 L38 31 L38 33.4 L2 33.4 Z"/><path class="t-s-beam s-soft" d="M14 36 L24 36 L24 44.4 L14 44.4 Z"/><path class="t-s-ink-soft s-soft" d="M15.4 37.4 L22.6 37.4 L22.6 44.4 L15.4 44.4 Z"/><path class="t-s-plank s-soft" d="M15 46 L27 46 L31 51 L19 51 Z"/><path class="t-s-plank-lit s-soft" d="M15 46 L21 46 L25 51 L19 51 Z"/></g><ellipse class="t-s-comb s-soft" cx="19" cy="25.6" rx="1.8" ry="1.8"/><ellipse class="t-s-comb-lit s-soft" cx="18.4" cy="25" rx="0.8" ry="0.8"/>'
    },
    cow: {
      label: 'Cow barn',
      // The biggest building of the set, because a barn that is not obviously the
      // biggest reads as another shed. Big double door, hayloft opening above it.
      art: '<ellipse class="t-s-shade s-soft" cx="28.84" cy="50.6" rx="22" ry="4.18"/><ellipse class="t-s-shade s-soft" cx="30.6" cy="51" rx="13.2" ry="2.86"/><g class="stock-ink"><path class="t-s-plank s-soft" d="M2 26 L46 26 L46 50.6 L2 50.6 Z"/><path class="t-s-plank-lit s-soft" d="M2 26 L23 26 L23 50.6 L2 50.6 Z"/><path class="t-s-plank-deep s-soft" d="M2 49 L46 49 L46 50.6 L2 50.6 Z"/><path class="t-s-roof s-soft" d="M0 27 L24 10 L48 27 Z"/><path class="t-s-roof-lit s-soft" d="M0 27 L24 10 L24 27 Z"/><path class="t-s-roof-deep s-soft" d="M0 27 L48 27 L48 29.6 L0 29.6 Z"/><path class="t-s-beam s-soft" d="M15 33 L33 33 L33 50.6 L15 50.6 Z"/><path class="t-s-plank-deep s-soft" d="M16.6 34.6 L23 34.6 L23 50.6 L16.6 50.6 Z"/><path class="t-s-plank-deep s-soft" d="M25 34.6 L31.4 34.6 L31.4 50.6 L25 50.6 Z"/><path class="t-s-plank s-soft" d="M16.6 34.6 L18 34.6 L18 50.6 L16.6 50.6 Z"/><path class="t-s-beam s-soft" d="M19.6 19 L28.4 19 L28.4 27 L19.6 27 Z"/><path class="t-s-cream-deep s-soft" d="M21 20.6 L27 20.6 L27 26.4 L21 26.4 Z"/><path class="t-s-cream s-soft" d="M21 20.6 L24 20.6 L24 26.4 L21 26.4 Z"/></g>'
    },
    pig: {
      label: 'Pig sty',
      // Low, wide, half-open: a sty is a shelter with a fenced wallow beside it,
      // never a closed building. The mud is what names it.
      art: '<ellipse class="t-s-shade s-soft" cx="21.3" cy="50.6" rx="15" ry="2.85"/><ellipse class="t-s-shade s-soft" cx="22.5" cy="51" rx="9" ry="1.95"/><g class="stock-ink"><path class="t-s-plank s-soft" d="M4 34 L28 34 L28 49 L4 49 Z"/><path class="t-s-plank-lit s-soft" d="M4 34 L15 34 L15 49 L4 49 Z"/><path class="t-s-plank-deep s-soft" d="M4 47.6 L28 47.6 L28 49 L4 49 Z"/><path class="t-s-roof s-soft" d="M1 35 L16 24 L31 35 Z"/><path class="t-s-roof-lit s-soft" d="M1 35 L16 24 L16 35 Z"/><path class="t-s-roof-deep s-soft" d="M1 35 L31 35 L31 37.2 L1 37.2 Z"/><path class="t-s-beam s-soft" d="M11.6 39 L21 39 L21 49 L11.6 49 Z"/><path class="t-s-ink-soft s-soft" d="M13 40.4 L19.6 40.4 L19.6 49 L13 49 Z"/><path class="t-s-mud s-soft" d="M27 45 Q37.6 42.4 46 46.4 Q37.6 51.4 27 49 Z"/><path class="t-s-mud-lit s-soft" d="M28 45.6 Q37 43.2 44.6 46.4 Q37 45 28 46.6 Z"/><path class="t-s-plank s-soft" d="M30.6 35.6 L32.4 35.6 L32.4 47.6 L30.6 47.6 Z"/><path class="t-s-plank s-soft" d="M39.6 35.6 L41.4 35.6 L41.4 47.6 L39.6 47.6 Z"/><path class="t-s-plank-deep s-soft" d="M29.6 38.6 L43 38.6 L43 40.4 L29.6 40.4 Z"/><path class="t-s-plank-deep s-soft" d="M29.6 43 L43 43 L43 44.6 L29.6 44.6 Z"/></g>'
    },
    pets: {
      label: 'Kennel and cat house',
      // Both buildings, because both animals live here: the kennel everybody
      // recognises by its round doorway, and beside it the smaller raised box
      // with a scratching post — that pairing is what says cat rather than
      // second dog. Drawn as one piece of scenery so the pen has one building
      // group rather than two things competing at its corner.
      art: '<ellipse class="t-s-shade s-soft" cx="18.08" cy="50.6" rx="14" ry="2.66"/><ellipse class="t-s-shade s-soft" cx="19.2" cy="51" rx="8.4" ry="1.82"/><ellipse class="t-s-shade s-soft" cx="40.98" cy="50.6" rx="9" ry="1.71"/><ellipse class="t-s-shade s-soft" cx="41.7" cy="51" rx="5.4" ry="1.17"/><g class="stock-ink"><path class="t-s-plank s-soft" d="M2 30 L28 30 L28 50.6 L2 50.6 Z"/><path class="t-s-plank-lit s-soft" d="M2 30 L14 30 L14 50.6 L2 50.6 Z"/><path class="t-s-plank-deep s-soft" d="M2 49 L28 49 L28 50.6 L2 50.6 Z"/><path class="t-s-roof s-soft" d="M0 31 L15 16 L30 31 Z"/><path class="t-s-roof-lit s-soft" d="M0 31 L15 16 L15 31 Z"/><path class="t-s-roof-deep s-soft" d="M0 31 L30 31 L30 33.4 L0 33.4 Z"/><path class="t-s-beam s-soft" d="M15 34 Q22.4 34 22.4 42.4 L22.4 50.6 L7.6 50.6 L7.6 42.4 Q7.6 34 15 34 Z"/><path class="t-s-ink-soft s-soft" d="M15 35.6 Q20.8 35.6 20.8 42.6 L20.8 50.6 L9.2 50.6 L9.2 42.6 Q9.2 35.6 15 35.6 Z"/><path class="t-s-beam s-soft" d="M13 22 L17 22 L17 29 L13 29 Z"/><path class="t-s-plank s-soft" d="M31 37.6 L47 37.6 L47 47.6 L31 47.6 Z"/><path class="t-s-plank-lit s-soft" d="M31 37.6 L38.6 37.6 L38.6 47.6 L31 47.6 Z"/><path class="t-s-roof s-soft" d="M29 38.6 L39 30 L49 38.6 Z"/><path class="t-s-roof-lit s-soft" d="M29 38.6 L39 30 L39 38.6 Z"/><path class="t-s-roof-deep s-soft" d="M29 38.6 L49 38.6 L49 40.4 L29 40.4 Z"/><ellipse class="t-s-beam s-soft" cx="39" cy="43" rx="3.4" ry="3.4"/><path class="t-s-plank-deep s-soft" d="M32.6 47.6 L34.4 47.6 L34.4 50.6 L32.6 50.6 Z"/><path class="t-s-plank-deep s-soft" d="M43.6 47.6 L45.4 47.6 L45.4 50.6 L43.6 50.6 Z"/></g>'
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

  // ---- the coin -----------------------------------------------------------
  // A bare number does not say money. This does, without anyone having to read
  // the word next to it — which is the whole point, because the number appears
  // in six places and the word will not fit in most of them.
  //
  // Lit from the upper left like everything else on the farm: the sheen sits
  // across the top-left of the face and the contact shadow falls to the lower
  // right. A coin lit from nowhere looks like a sticker.
  //
  // The ring is two filled circles rather than a stroke, because a 0.5px stroke
  // at this size lands differently on every device pixel ratio and the ring
  // came and went as the page zoomed.
  var COIN_ART =
    '<circle class="c-cast" cx="8.5" cy="9.1" r="6.9"/>' +
    '<circle class="c-rim" cx="8" cy="8" r="6.9"/>' +
    '<circle class="c-face" cx="8" cy="8" r="5.7"/>' +
    '<circle class="c-ring" cx="8" cy="8" r="4.3"/>' +
    '<circle class="c-face" cx="8" cy="8" r="3.4"/>' +
    '<ellipse class="c-lit" cx="6.1" cy="5.9" rx="4.3" ry="2.5" ' +
      'transform="rotate(-38 6.1 5.9)"/>' +
    '<path class="c-glint" d="M4.7 5.9 Q5.9 4.2 7.7 3.8 Q6.1 4.9 5.4 6.5 Z"/>'
  ;

  // `size` is a class suffix rather than a width, so the coin scales with the
  // text it sits beside instead of being pinned to a pixel count that goes wrong
  // the moment somebody changes the browser font size.
  function coin(n, size){
    return '<span class="coin-amt' + (size ? ' coin-' + size : '') + '">' +
      '<svg class="coin" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
        COIN_ART +
      '</svg>' +
      '<span class="coin-n">' + n + '</span>' +
      '</span>';
  }

  // ---- the two buildings on the farm ----
  // One shop, one store, standing on the yard at the near end of the farm. They
  // are the way in to the two panels; the HUD button stays as well, because a
  // building is a mouse target and a button is a keyboard one.
  var BUILDINGS = [
    {
      key: 'shop',
      name: 'Shop',
      // A market stall seen from the front left: open counter, striped awning,
      // produce out on display, and a sign on a bracket arm. It has to read as
      // somewhere you BUY, which a plain house does not.
      viewBox: '0 0 108 92',
      art:
        '<ellipse class="b-shadow" cx="60" cy="85" rx="46" ry="5.6"/><path class="b-roof-dark" d="M76 36 L84 14.6 L90 26.4 Z"/><path class="b-wall-shade" d="M70 84 L70 34 L78 13.5 L86 25 L86 75 Z"/><path class="b-wall" d="M8 34 L70 34 L70 84 L8 84 Z"/><path class="b-wall-lit" d="M8 34 L11.5 34 L11.5 84 L8 84 Z"/><path class="b-shade-soft" d="M65 34 L70 34 L70 84 L65 84 Z"/><path class="b-stone" d="M8 78 L70 78 L70 84 L8 84 Z"/><path class="b-stone-shade" d="M70 78 L86 69 L86 75 L70 84 Z"/><path class="b-stone-line" d="M22 78 L23 78 L23 84 L22 84 Z"/><path class="b-stone-line" d="M38 78 L39 78 L39 84 L38 84 Z"/><path class="b-stone-line" d="M54 78 L55 78 L55 84 L54 84 Z"/><path class="b-stone-line" d="M8 80.6 L70 80.6 L70 81.4 L8 81.4 Z"/><path class="b-inside" d="M15 45 L62 45 L62 78 L15 78 Z"/><path class="b-glow-soft" d="M17 46 L60 46 L60 64 L17 64 Z"/><path class="b-glow-soft" d="M23 46 L54 46 L54 53 L23 53 Z"/><path class="b-counter-top" d="M17 63 L60 63 L63 67 L14 67 Z"/><path class="b-counter" d="M14 67 L63 67 L63 78 L14 78 Z"/><path class="b-shade-soft" d="M14 67 L63 67 L63 69 L14 69 Z"/><path class="b-wall-line" d="M23 69 L23.9 69 L23.9 78 L23 78 Z"/><path class="b-wall-line" d="M33 69 L33.9 69 L33.9 78 L33 78 Z"/><path class="b-wall-line" d="M43 69 L43.9 69 L43.9 78 L43 78 Z"/><path class="b-wall-line" d="M53 69 L53.9 69 L53.9 78 L53 78 Z"/><path class="b-counter-top" d="M14 74.2 L63 74.2 L63 75.4 L14 75.4 Z"/><ellipse class="b-shade-soft" cx="24" cy="63.6" rx="8" ry="1.6"/><ellipse class="b-shade-soft" cx="37.5" cy="63.6" rx="6" ry="1.6"/><ellipse class="b-shade-soft" cx="53" cy="63.6" rx="8" ry="1.6"/><path class="b-crate-top" d="M18 58 L31 58 L33.5 55.4 L20.5 55.4 Z"/><path class="b-crate" d="M18 58 L31 58 L31 64 L18 64 Z"/><path class="b-crate-dark" d="M18 58 L20.2 58 L20.2 64 L18 64 Z"/><path class="b-crate-dark" d="M28.8 58 L31 58 L31 64 L28.8 64 Z"/><path class="b-crate-dark" d="M20.2 60.6 L28.8 60.6 L28.8 61.8 L20.2 61.8 Z"/><ellipse class="b-shade-soft" cx="25.6" cy="56.2" rx="6.4" ry="1.3"/><circle class="b-fruit-a" cx="22" cy="54" r="2.4"/><circle class="b-fruit-b" cx="26.4" cy="53.2" r="2.6"/><circle class="b-fruit-c" cx="30.6" cy="54" r="2.4"/><path class="b-sack" d="M32.6 64 Q31.4 57.6 35.6 55 Q37.2 53.6 39.2 55 Q43.4 57.2 42.2 64 Z"/><path class="b-sack-shade" d="M39.2 64 Q40.8 58 39.2 55 Q41.2 55 42.2 57.4 Q43.4 60.4 42.2 64 Z"/><path class="b-sack-shade" d="M35.8 53.4 L39.4 53.4 L39.4 55.2 L35.8 55.2 Z"/><path class="b-sack" d="M35.8 53.4 L34 51.4 L36.4 52.4 Z"/><path class="b-sack" d="M39.4 53.4 L41.4 51.6 L40 52.6 Z"/><circle class="b-fruit-a" cx="48" cy="61" r="2.6"/><circle class="b-fruit-b" cx="53" cy="61" r="2.6"/><circle class="b-fruit-a" cx="58" cy="61" r="2.6"/><circle class="b-fruit-c" cx="50.5" cy="56.6" r="2.6"/><circle class="b-fruit-a" cx="55.5" cy="56.6" r="2.6"/><path class="b-awning-shade" d="M70 39 L86 30 L80 37 L64 46 Z"/><path class="b-awning-stripe" d="M10 39 L17.5 39 L11.5 46 Q7.75 48.6 4 46 Z"/><path class="b-awning" d="M17.5 39 L25 39 L19 46 Q15.25 48.6 11.5 46 Z"/><path class="b-awning-stripe" d="M25 39 L32.5 39 L26.5 46 Q22.75 48.6 19 46 Z"/><path class="b-awning" d="M32.5 39 L40 39 L34 46 Q30.25 48.6 26.5 46 Z"/><path class="b-awning-stripe" d="M40 39 L47.5 39 L41.5 46 Q37.75 48.6 34 46 Z"/><path class="b-awning" d="M47.5 39 L55 39 L49 46 Q45.25 48.6 41.5 46 Z"/><path class="b-awning-stripe" d="M55 39 L62.5 39 L56.5 46 Q52.75 48.6 49 46 Z"/><path class="b-awning" d="M62.5 39 L70 39 L64 46 Q60.25 48.6 56.5 46 Z"/><path class="b-awning-fold" d="M17.5 39 L18.3 39 L12.3 46 L11.5 46 Z"/><path class="b-awning-fold" d="M32.5 39 L33.3 39 L27.3 46 L26.5 46 Z"/><path class="b-awning-fold" d="M47.5 39 L48.3 39 L42.3 46 L41.5 46 Z"/><path class="b-awning-fold" d="M62.5 39 L63.3 39 L57.3 46 L56.5 46 Z"/><path class="b-sign-frame" d="M73 47 L83 41.4 L83 57.4 L73 63 Z"/><path class="b-glow" d="M74.3 48.3 L81.7 44.1 L81.7 56.1 L74.3 60.3 Z"/><path class="b-bar" d="M77.4 46.5 L78.6 45.8 L78.6 58.2 L77.4 58.9 Z"/><path class="b-bar" d="M74.3 53.5 L81.7 49.3 L81.7 50.5 L74.3 54.7 Z"/><path class="b-metal" d="M82 30 L104 30 L104 32 L82 32 Z"/><path class="b-metal" d="M83 36.6 L94 31.3 L94.8 32.7 L83.8 38 Z"/><circle class="b-metal" cx="103" cy="31" r="1.8"/><path class="b-metal-hi" d="M88 32 L89.2 32 L89.2 35.8 L88 35.8 Z"/><path class="b-metal-hi" d="M99.8 32 L101 32 L101 35.8 L99.8 35.8 Z"/><path class="b-sign-frame" d="M87 35.6 Q86 35.6 86 36.6 L86 48.4 Q86 49.4 87 49.4 L103 49.4 Q104 49.4 104 48.4 L104 36.6 Q104 35.6 103 35.6 Z"/><path class="b-sign" d="M87.6 37.2 L102.4 37.2 L102.4 47.8 L87.6 47.8 Z"/><circle class="b-coin-dark" cx="95" cy="42.5" r="4.4"/><circle class="b-coin" cx="95" cy="42.5" r="3.1"/><circle class="b-glow" cx="93.6" cy="41.1" r="1"/><path class="b-barrel" d="M2.6 68 Q1 76 2.6 84 L10.4 84 Q12 76 10.4 68 Z"/><ellipse class="b-barrel-hi" cx="6.5" cy="68" rx="3.9" ry="1.6"/><path class="b-metal" d="M2 71.4 L11 71.4 L11 72.9 L2 72.9 Z"/><path class="b-metal" d="M1.7 78 L11.3 78 L11.3 79.5 L1.7 79.5 Z"/><circle class="b-fruit-b" cx="4.4" cy="65.6" r="2"/><circle class="b-fruit-a" cx="8.4" cy="65.2" r="2.1"/><path class="b-metal" d="M26 8 L31 8 L31 16 L26 16 Z"/><path class="b-metal-hi" d="M24.5 6.6 L32.5 6.6 L32.5 8.6 L24.5 8.6 Z"/><path class="b-roof" d="M2 36 L76 36 L84 13.5 L10 13.5 Z"/><path class="b-roof-line" d="M3.28 32.4 L77.28 32.4 L77.28 33.6 L3.28 33.6 Z"/><path class="b-roof-line" d="M4.64 28.58 L78.64 28.58 L78.64 29.7 L4.64 29.7 Z"/><path class="b-roof-line" d="M5.92 24.98 L79.92 24.98 L79.92 26.06 L5.92 26.06 Z"/><path class="b-roof-line" d="M6.96 22.05 L80.96 22.05 L80.96 23.05 L6.96 23.05 Z"/><path class="b-roof-line" d="M7.84 19.58 L81.84 19.58 L81.84 20.5 L7.84 20.5 Z"/><path class="b-roof-line" d="M8.56 17.55 L82.56 17.55 L82.56 18.4 L8.56 18.4 Z"/><path class="b-roof-hi" d="M10 13.5 L84 13.5 L84 16 L10 16 Z"/><path class="b-roof-dark" d="M2 36 L76 36 L76 38 Q71.38 41.2 66.75 38 Q62.13 41.2 57.5 38 Q52.88 41.2 48.25 38 Q43.63 41.2 39 38 Q34.38 41.2 29.75 38 Q25.13 41.2 20.5 38 Q15.88 41.2 11.25 38 Q6.63 41.2 2 38 Z"/><circle class="b-smoke" cx="33" cy="5" r="2.2"/><circle class="b-smoke" cx="36.6" cy="3" r="1.6"/><circle class="b-smoke" cx="39.2" cy="1.8" r="1.1"/>'
    },
    {
      key: 'store',
      name: 'Store',
      // A barn with its doors braced shut and a hayloft over them. Closed doors
      // against the open counter of the shop is the whole distinction: one is
      // open for business, one holds what you have put away.
      viewBox: '0 0 108 92',
      art:
        '<ellipse class="b-shadow" cx="58" cy="86" rx="48" ry="5.8"/><path class="b-barn-shade" d="M64 34 L80 26 L80 76 L64 84 Z"/><path class="b-wall-line" d="M70 30.9 L70.9 30.5 L70.9 80.5 L70 80.9 Z"/><path class="b-wall-line" d="M76 27.9 L76.9 27.5 L76.9 77.5 L76 77.9 Z"/><path class="b-sign-frame" d="M68 48 L76 44 L76 58 L68 62 Z"/><path class="b-glow" d="M69.2 48.9 L74.8 46.1 L74.8 56.9 L69.2 59.7 Z"/><path class="b-bar" d="M71.4 46.9 L72.6 46.3 L72.6 59.1 L71.4 59.7 Z"/><path class="b-bar" d="M69.2 53.2 L74.8 50.4 L74.8 51.6 L69.2 54.4 Z"/><path class="b-barn" d="M8 84 L8 34 L14 26 L36 15 L58 26 L64 34 L64 84 Z"/><path class="b-barn-lit" d="M8 34 L11.5 34 L11.5 84 L8 84 Z"/><path class="b-barn-lit" d="M14 26 L36 15 L36 17.6 L15.7 27.7 Z"/><path class="b-shade-soft" d="M58 26 L64 34 L64 84 L58 84 Z"/><path class="b-wall-line" d="M16 30 L17 30 L17 74 L16 74 Z"/><path class="b-wall-line" d="M24 27 L25 27 L25 74 L24 74 Z"/><path class="b-wall-line" d="M32 22 L33 22 L33 74 L32 74 Z"/><path class="b-wall-line" d="M40 22 L41 22 L41 74 L40 74 Z"/><path class="b-wall-line" d="M48 27 L49 27 L49 74 L48 74 Z"/><path class="b-wall-line" d="M56 30 L57 30 L57 74 L56 74 Z"/><path class="b-stone" d="M8 74 L64 74 L64 84 L8 84 Z"/><path class="b-stone-shade" d="M64 74 L80 66 L80 76 L64 84 Z"/><path class="b-stone-line" d="M8 78.4 L64 78.4 L64 79.3 L8 79.3 Z"/><path class="b-stone-line" d="M20 74 L21 74 L21 78.4 L20 78.4 Z"/><path class="b-stone-line" d="M34 74 L35 74 L35 78.4 L34 78.4 Z"/><path class="b-stone-line" d="M48 74 L49 74 L49 78.4 L48 78.4 Z"/><path class="b-stone-line" d="M14 79.3 L15 79.3 L15 84 L14 84 Z"/><path class="b-stone-line" d="M28 79.3 L29 79.3 L29 84 L28 84 Z"/><path class="b-stone-line" d="M42 79.3 L43 79.3 L43 84 L42 84 Z"/><path class="b-stone-line" d="M56 79.3 L57 79.3 L57 84 L56 84 Z"/><path class="b-door-shade" d="M21 43 L53 43 L53 74 L21 74 Z"/><path class="b-door-lit" d="M23 45.5 L36.2 45.5 L36.2 74 L23 74 Z"/><path class="b-door" d="M37.8 45.5 L51 45.5 L51 74 L37.8 74 Z"/><path class="b-door-plank" d="M23.5 46.5 L26.2 46.5 L35.7 72.8 L33 72.8 Z"/><path class="b-door-plank" d="M33 46.5 L35.7 46.5 L26.2 72.8 L23.5 72.8 Z"/><path class="b-door-plank" d="M23 45.5 L36.2 45.5 L36.2 48 L23 48 Z"/><path class="b-door-plank" d="M23 71.5 L36.2 71.5 L36.2 74 L23 74 Z"/><path class="b-door-plank" d="M38.3 46.5 L41 46.5 L50.5 72.8 L47.8 72.8 Z"/><path class="b-door-plank" d="M47.8 46.5 L50.5 46.5 L41 72.8 L38.3 72.8 Z"/><path class="b-door-plank" d="M37.8 45.5 L51 45.5 L51 48 L37.8 48 Z"/><path class="b-door-plank" d="M37.8 71.5 L51 71.5 L51 74 L37.8 74 Z"/><path class="b-loft-inside" d="M36.4 45 L37.6 45 L37.6 74 L36.4 74 Z"/><path class="b-metal" d="M35.2 56 L38.8 56 L38.8 63.2 L35.2 63.2 Z"/><circle class="b-metal-hi" cx="37" cy="59.6" r="1.2"/><path class="b-metal" d="M23 50 L26 50 L26 52 L23 52 Z"/><path class="b-metal" d="M23 67 L26 67 L26 69 L23 69 Z"/><path class="b-metal" d="M48 50 L51 50 L51 52 L48 52 Z"/><path class="b-metal" d="M48 67 L51 67 L51 69 L48 69 Z"/><path class="b-barn-trim" d="M29 21 L47 21 L47 35 L29 35 Z"/><path class="b-loft-inside" d="M30.6 22.6 L45.4 22.6 L45.4 35 L30.6 35 Z"/><circle class="b-glow-soft" cx="37" cy="26" r="2.7"/><circle class="b-glow" cx="37" cy="26" r="1.3"/><path class="b-hay" d="M30.6 31.4 Q33 28.6 36 31.2 Q38.6 28.2 41.4 31.4 Q43.6 29 45.4 31.6 L45.4 35 L30.6 35 Z"/><path class="b-hay-dark" d="M32.4 31.8 L33.2 31.8 L33.2 35 L32.4 35 Z"/><path class="b-hay-dark" d="M39 31.6 L39.8 31.6 L39.8 35 L39 35 Z"/><path class="b-hay" d="M42.6 30 L46.6 27.6 L47.2 28.6 L43.2 31 Z"/><path class="b-door-plank" d="M33 17 L39 17 L30.4 21 L24.4 21 Z"/><path class="b-door-shade" d="M39 17 L39 18.8 L30.4 22.8 L30.4 21 Z"/><path class="b-door" d="M24.4 21 L30.4 21 L30.4 22.8 L24.4 22.8 Z"/><path class="b-metal" d="M26.8 22.8 L28 22.8 L28 24 L26.8 24 Z"/><circle class="b-metal" cx="27.4" cy="25.2" r="1.8"/><circle class="b-loft-inside" cx="27.4" cy="25.2" r="0.8"/><path class="b-rope" d="M26.8 26.8 L28 26.8 L28 38 L26.8 38 Z"/><path class="b-metal" d="M26.1 38 L28.7 38 L28.7 39.6 L26.1 39.6 Z"/><path class="b-trim-shade" d="M48 3 L51 1.4 L51 10.4 L48 12 Z"/><path class="b-barn-trim" d="M42 3 L48 3 L48 12 L42 12 Z"/><path class="b-loft-inside" d="M43.2 4.6 L46.8 4.6 L46.8 9.6 L43.2 9.6 Z"/><path class="b-barn-trim" d="M43.2 5.6 L46.8 5.6 L46.8 6.4 L43.2 6.4 Z"/><path class="b-barn-trim" d="M43.2 7.4 L46.8 7.4 L46.8 8.2 L43.2 8.2 Z"/><path class="b-barn-roof-hi" d="M40.4 3 L49.2 3 L52.2 1.4 L43.4 1.4 Z"/><path class="b-barn-roof" d="M68 37.5 L59.5 24.5 L75.5 16.5 L84 29.5 Z"/><path class="b-barn-roof-line" d="M65.9 34.3 L81.9 26.3 L81.3 25.4 L65.3 33.4 Z"/><path class="b-barn-roof-line" d="M63.8 31 L79.8 23 L79.2 22.1 L63.2 30.1 Z"/><path class="b-barn-roof-line" d="M61.9 28.2 L77.9 20.2 L77.3 19.3 L61.3 27.3 Z"/><path class="b-barn-roof-line" d="M60.4 25.8 L76.4 17.8 L75.8 16.9 L59.8 24.9 Z"/><path class="b-barn-roof-hi" d="M59.5 24.5 L36 12 L52 4 L75.5 16.5 Z"/><path class="b-barn-roof-line" d="M54.3 21.7 L70.3 13.7 L69.4 13.2 L53.4 21.2 Z"/><path class="b-barn-roof-line" d="M49.2 19 L65.2 11 L64.3 10.5 L48.3 18.5 Z"/><path class="b-barn-roof-line" d="M44.7 16.6 L60.7 8.6 L59.8 8.1 L43.8 16.1 Z"/><path class="b-barn-roof-line" d="M40.9 14.6 L56.9 6.6 L56 6.1 L40 14.1 Z"/><path class="b-barn-roof-line" d="M37.9 13 L53.9 5 L53 4.5 L37 12.5 Z"/><path class="b-barn-ridge" d="M36 12 L52 4 L52 6.4 L36 14.4 Z"/><path class="b-barn-trim" d="M4 37.5 L12.5 24.5 L36 12 L59.5 24.5 L68 37.5 L64 34 L58 26 L36 15 L14 26 L8 34 Z"/><path class="b-barn-roof-dark" d="M4 37.5 L8 34 L8 36.4 L4 39.9 Z"/><path class="b-barn-roof-dark" d="M64 34 L68 37.5 L68 39.9 L64 36.4 Z"/><path class="b-hay-hi" d="M1 73 L15 73 L18.2 70.4 L4.2 70.4 Z"/><path class="b-hay" d="M1 73 L15 73 L15 83 L1 83 Z"/><path class="b-hay-dark" d="M15 73 L18.2 70.4 L18.2 80.4 L15 83 Z"/><path class="b-hay-dark" d="M1 75.6 L15 75.6 L15 77 L1 77 Z"/><path class="b-hay-dark" d="M1 80 L15 80 L15 81.4 L1 81.4 Z"/><path class="b-hay-hi" d="M3 63 L16 63 L19.2 60.4 L6.2 60.4 Z"/><path class="b-hay" d="M3 63 L16 63 L16 73 L3 73 Z"/><path class="b-hay-dark" d="M16 63 L19.2 60.4 L19.2 70.4 L16 73 Z"/><path class="b-hay-dark" d="M3 65.6 L16 65.6 L16 67 L3 67 Z"/><path class="b-hay-dark" d="M3 70 L16 70 L16 71.4 L3 71.4 Z"/><path class="b-barrel-hi" d="M52.4 76 L61.6 76 L61.6 78.2 L52.4 78.2 Z"/><path class="b-barrel" d="M53.4 78.2 L60.6 78.2 L59.4 85 L54.6 85 Z"/><path class="b-leaf" d="M57 76 Q52.6 74 52 68.6 Q56.6 70 57 76 Z"/><path class="b-leaf" d="M57 76 Q61.4 74.4 62.4 69.4 Q57.6 70.6 57 76 Z"/><path class="b-leaf" d="M57 76 Q56.2 70.6 58.4 66.4 Q60.4 71 57 76 Z"/>'
    }
  ];

  function renderBuildings(){
    if(!els.gardenYard || els.gardenYard.childElementCount) return;
    var html = '';
    for(var i = 0; i < BUILDINGS.length; i++){
      var b = BUILDINGS[i];
      html += '<button type="button" class="farm-building building-' + b.key +
        '" data-building="' + b.key + '">' +
        '<svg class="building-svg" viewBox="' + b.viewBox + '" ' +
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
  var FARMER_ART = '<svg class="farmer-svg" viewBox="0 0 42 60" width="42" height="60" aria-hidden="true"><ellipse class="f-shadow" cx="21.4" cy="57.5" rx="12.4" ry="2.6"/><ellipse class="f-shadow" cx="21.8" cy="57.8" rx="7.6" ry="1.7"/><g class="farmer-bob"><g class="f-leg f-leg-a"><path class="f-leg-dark" d="M21.6 33.4 H27.2 L26.8 51 H22 Z"/><path class="f-boot-dark" d="M21.75 42.4 H27.05 V44 H21.7 Z"/><path class="f-boot-dark" d="M21.2 50 H27.2 V56.2 H21.2 Z"/><path class="f-boot-dark" d="M27.2 52.6 H28.5 Q29.3 52.6 29.3 54.2 V56.2 H27.2 Z"/><path class="f-boot-dark" d="M20.7 56 H29.3 Q29.8 56 29.8 56.9 V58 H20.7 Z"/></g><g class="f-arm f-arm-a"><path class="f-arm-dark" d="M28.4 20.8 L29 21.6 L31.8 30.4 L28.8 31 Z"/><path class="f-glove" d="M27.9 30 h4.2 v3.6 q0 1 -2.1 1 q-2.1 0 -2.1 -1 Z"/></g><path class="f-shirt" d="M13.4 21.4 Q21 17.8 28.6 21.4 L29.8 35.8 Q21 37.6 12.2 35.8 Z"/><path class="f-shirt-lit" d="M13.4 21.6 Q14.6 21 16.4 20.6 L15.4 36.6 L12.4 35.8 Z"/><path class="f-arm-dark" d="M28.6 21.6 Q27.4 21 25.6 20.6 L26.6 36.6 L29.6 35.8 Z"/><path class="f-arm-dark" d="M20 22.6 Q21.4 29 19.4 36.4 L21.2 36.6 Q23 29 21.6 22.6 Z"/><path class="f-arm-dark" d="M17.4 19.4 Q21 22.4 24.6 19.4 Q21 18 17.4 19.4 Z"/><path class="f-belt" d="M12.4 33.4 H29.6 V36.4 H12.4 Z"/><path class="f-buckle" d="M19.4 33.8 H22.6 V36 H19.4 Z"/><g class="f-leg f-leg-b"><path class="f-leg" d="M14.8 33.4 H20.4 L20 51 H15.2 Z"/><path class="f-leg-dark" d="M14.95 42.4 H20.25 V44 H14.9 Z"/><path class="f-boot" d="M14.4 50 H20.4 V56.2 H14.4 Z"/><path class="f-boot" d="M20.4 52.6 H21.7 Q22.5 52.6 22.5 54.2 V56.2 H20.4 Z"/><path class="f-boot-dark" d="M13.9 56 H22.5 Q23 56 23 56.9 V58 H13.9 Z"/></g><g class="f-arm f-arm-b"><path class="f-arm-lit" d="M13.6 20.8 L13 21.6 L10.2 30.4 L13.2 31 Z"/><path class="f-glove" d="M9.9 30 h4.2 v3.6 q0 1 -2.1 1 q-2.1 0 -2.1 -1 Z"/></g><path class="f-skin-deep" d="M18.6 17.6 H23.4 V21.6 H18.6 Z"/><ellipse class="f-skin" cx="21" cy="15.4" rx="4.5" ry="4.9"/><path class="f-skin-deep" d="M16.51 15.06C16.57 14.79 16.67 13.97 16.86 13.48C17.05 12.98 17.34 12.5 17.67 12.11C18 11.71 18.41 11.36 18.84 11.1C19.27 10.84 19.77 10.66 20.25 10.57C20.74 10.48 21.26 10.48 21.75 10.57C22.23 10.66 22.73 10.84 23.16 11.1C23.59 11.36 24 11.71 24.33 12.11C24.66 12.5 24.95 12.98 25.14 13.48C25.33 13.97 25.43 14.79 25.49 15.06L23.49 15.2C23.46 15.04 23.41 14.55 23.3 14.26C23.19 13.97 23.03 13.69 22.85 13.45C22.67 13.22 22.44 13.01 22.2 12.86C21.96 12.7 21.68 12.59 21.42 12.54C21.15 12.49 20.85 12.49 20.58 12.54C20.32 12.59 20.04 12.7 19.8 12.86C19.56 13.01 19.33 13.22 19.15 13.45C18.97 13.69 18.81 13.97 18.7 14.26C18.59 14.55 18.54 15.04 18.51 15.2Z"/><ellipse class="f-hat" cx="21" cy="13.6" rx="11.2" ry="3.5"/><path class="f-hat-lit" d="M9.81 13.48C9.86 13.35 9.95 12.98 10.14 12.74C10.34 12.5 10.62 12.26 10.97 12.04C11.32 11.82 11.76 11.61 12.26 11.41C12.75 11.22 13.32 11.04 13.93 10.88C14.55 10.73 15.23 10.59 15.93 10.48C16.64 10.37 17.4 10.28 18.16 10.21C18.93 10.15 19.73 10.11 20.52 10.1C21.31 10.09 22.12 10.11 22.9 10.15C23.68 10.19 24.81 10.32 25.2 10.35L24.67 11.65C24.34 11.63 23.35 11.56 22.66 11.53C21.98 11.51 21.27 11.5 20.58 11.5C19.89 11.51 19.19 11.53 18.52 11.57C17.85 11.61 17.18 11.66 16.57 11.73C15.95 11.79 15.35 11.88 14.82 11.97C14.28 12.06 13.78 12.17 13.35 12.29C12.92 12.4 12.53 12.53 12.23 12.66C11.92 12.8 11.67 12.94 11.5 13.08C11.33 13.23 11.26 13.45 11.21 13.53Z"/><path class="f-hat-dark" d="M32.09 14.09C31.92 14.26 31.56 14.82 31.05 15.15C30.53 15.47 29.81 15.79 29 16.05C28.18 16.31 27.18 16.54 26.14 16.71C25.11 16.88 23.93 17 22.77 17.06C21.62 17.11 20.38 17.11 19.23 17.06C18.07 17 16.89 16.88 15.86 16.71C14.82 16.54 13.82 16.31 13 16.05C12.19 15.79 11.47 15.47 10.95 15.15C10.44 14.82 10.08 14.26 9.91 14.09L11.2 13.91C11.35 14.02 11.66 14.37 12.12 14.57C12.57 14.78 13.21 14.98 13.93 15.14C14.65 15.3 15.54 15.45 16.45 15.55C17.37 15.66 18.41 15.74 19.43 15.77C20.45 15.81 21.55 15.81 22.57 15.77C23.59 15.74 24.63 15.66 25.55 15.55C26.46 15.45 27.35 15.3 28.07 15.14C28.79 14.98 29.43 14.78 29.88 14.57C30.34 14.37 30.65 14.02 30.8 13.91Z"/><path class="f-hat" d="M14.8 13.4 Q15.4 4.6 21 4.6 Q26.6 4.6 27.2 13.4 Z"/><path class="f-hat-lit" d="M14.8 13.4 Q15.4 5.4 19.2 4.8 Q17 7.4 16.9 13.4 Z"/><path class="f-hat-dark" d="M27.2 13.4 Q26.6 5.4 22.8 4.8 Q25 7.4 25.1 13.4 Z"/><path class="f-band" d="M14.9 10.8 Q21 9.4 27.1 10.8 L27.2 12.8 Q21 11.4 14.8 12.8 Z"/></g></svg>';

  // World coordinates, in pixels, inside #gardenWorld. Null until the farm has
  // been laid out once and there is somewhere to stand.
  var farmer = null;      // { x, y, tx, ty, facing }
  var camera = { x: 0, y: 0 };
  var farmFrame = 0;
  // About 150px a second, which crosses one parcel in roughly three seconds:
  // fast enough not to be a chore, slow enough to read as somebody walking
  // rather than a cursor being dragged.
  // Pixels per SECOND, not per frame. The old step was per frame, so the same
  // code walked at 150px/s on a 60Hz screen and 300px/s on a 120Hz one — the
  // pace the user actually approved was the 60Hz one, so this keeps that and
  // fixes every other refresh rate.
  var FARMER_SPEED = 150;
  var FARMER_EASE = 26;    // distance over which the last stride slows down
  var farmLast = 0;

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

  // One frame loop for everything that moves on the farm, because two loops
  // would drift apart and each would pay for its own layout read.
  function farmTick(ts){
    farmFrame = 0;
    if(typeof ts !== 'number') ts = 0;
    // Clamped: coming back to a backgrounded tab hands you one enormous delta,
    // and an animal should not teleport across its pen to catch up on the time
    // it spent not being looked at.
    var dt = farmLast ? Math.min(50, ts - farmLast) : 16.7;
    if(dt < 0) dt = 16.7;
    farmLast = ts;
    var live = stepFarmer(dt);
    if(stepRoamers(dt)) live = true;
    if(live) farmFrame = requestAnimationFrame(farmTick);
    else farmLast = 0;
  }

  function stepFarmer(dt){
    if(!farmer) return false;
    var dx = farmer.tx - farmer.x;
    var dy = farmer.ty - farmer.y;
    var far = Math.sqrt(dx * dx + dy * dy);
    if(far < 1.2){
      farmer.x = farmer.tx;
      farmer.y = farmer.ty;
      if(els.gardenFarmer) els.gardenFarmer.classList.remove('farmer-walking');
      farmCameraApply();
      return false;
    }
    // A walking pace, and the same one whatever the distance. The old step was a
    // fraction of the remaining distance, which meant the farmer SPRINTED at the
    // start of a long walk and crept at the end — the opposite of how walking
    // works. Constant speed, easing off only over the last stride or so, so the
    // arrival is not a dead stop.
    var step = FARMER_SPEED * dt / 1000;
    if(far < FARMER_EASE) step = Math.max(0.7, step * (far / FARMER_EASE));
    step = Math.min(far, step);
    farmer.x += (dx / far) * step;
    farmer.y += (dy / far) * step;
    if(Math.abs(dx) > 2) farmer.facing = dx < 0 ? -1 : 1;
    if(els.gardenFarmer) els.gardenFarmer.classList.add('farmer-walking');
    farmCameraApply();
    return true;
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
    if(!farmFrame) farmFrame = requestAnimationFrame(farmTick);
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
    window.addEventListener('resize', function(){
      farmCameraApply();
      roamRelayout();
      roamKick();
    });
  }

  // ---- animals wander their own parcel ----
  //
  // Driven a frame at a time from here rather than by a CSS keyframe track,
  // because a fixed track cannot do any of the three things that make this read
  // as an animal instead of a sliding counter:
  //
  //   * Stay inside the fence. How much room an animal has depends on WHICH
  //     plot of the parcel it is anchored to — one on the outside column can
  //     only go inwards. The old track handed every animal the same +-1.9 plots
  //     and walked the edge ones straight through the fence.
  //   * Face where it is going. A track sets the flip at fixed percentages while
  //     the direction comes from a hash, so an animal spent most of its time
  //     walking backwards.
  //   * Stop. Animals graze, look up, then move off. One eased track never comes
  //     to rest, and it snapped from scaleX(-1) straight back to scaleX(1) at the
  //     loop boundary.

  // Animals and fish move about; plants and buildings do not.
  function roams(meta){
    return !!meta && (meta.cat === 'animal' || meta.cat === 'fish');
  }

  var roamers = [];
  // Position survives a redraw, keyed by the item id. Harvesting rebuilds the
  // plot, and an animal that jumps back to the middle of its pen every time you
  // collect an egg reads as a different animal, not as the same one moving.
  var roamState = {};
  var ROAM_TURN_MS = 340;    // spent turning on the spot, walking nowhere

  // Everything a species needs to move differently. A cow does not scurry and a
  // fish does not stand still, and one set of numbers for both is what made the
  // pen look choreographed.
  //
  // These were all roughly half as lively to begin with, and the pen read as
  // frozen: measured in a real browser, thirteen animals managed four moves
  // between them in three and a half seconds. Long pauses are believable when
  // you watch a field for a minute and wrong when somebody glances at a card for
  // five seconds, and the card is what this is.
  //
  // `reach` is the fraction of the enclosure a single walk has to cover. Without
  // it, a uniformly random destination averages a third of the pen and throws up
  // a lot of two-pixel shuffles, which read as a stutter rather than as walking.
  var ROAM_GAITS = {
    fish:  { speed: 20, vary: 0.45, pause: [80, 420],   turn: 560, pad: 0.14, reach: 0.42 },
    bird:  { speed: 36, vary: 0.40, pause: [260, 1100], turn: 200, pad: 0.22, reach: 0.34 },
    small: { speed: 31, vary: 0.35, pause: [340, 1500], turn: 280, pad: 0.20, reach: 0.36 },
    large: { speed: 23, vary: 0.25, pause: [600, 2400], turn: 420, pad: 0.26, reach: 0.40 }
  };
  // Body mass, roughly. A duck and a chicken potter; a cow ambles and stands
  // about for a long time; a fish never really stops.
  var ROAM_GAIT_BY_KIND = { duck:'bird', chicken:'bird', cat:'small', dog:'small',
    goat:'small', sheep:'small', pig:'large', cow:'large' };

  function roamGait(meta){
    if(!meta) return ROAM_GAITS.small;
    if(meta.cat === 'fish') return ROAM_GAITS.fish;
    return ROAM_GAITS[ROAM_GAIT_BY_KIND[meta.kind]] || ROAM_GAITS.small;
  }

  // Called once per rendered animal. The element carrying the transform is the
  // sprite, never the plot: the plot has to stay where it is to remain a click
  // target, and because it does not clip, pressing the animal where it actually
  // stands still works.
  function addRoamer(el, slot, id, meta){
    if(farmReduceMotion()) return;
    var prev = roamState[id];
    var gait = roamGait(meta);
    var h = mix32(hashString(id));
    var r = prev || {
      x: 0, y: 0,
      face: (h & 1) ? -1 : 1,
      want: (h & 1) ? -1 : 1,
      from: 1,
      state: 'idle',
      // Staggered, but only over about a second: any longer and the first thing
      // you see on opening the card is a field of statues.
      t: (h >>> 8 & 1023) / 1023 * 900,
      seed: h,
      tx: 0, ty: 0
    };
    r.el = el;
    r.slot = slot;
    r.gait = gait;
    // Each animal a little faster or slower than its kind, from its own id, so
    // a pen of six chickens does not move as one body.
    r.speed = gait.speed * (1 + ((h >>> 20 & 255) / 255 - 0.5) * gait.vary);
    r.ready = false;
    roamState[id] = r;
    roamers.push(r);
    roamApply(r);
  }

  // The fence, in pixels, relative to where this sprite sits when untransformed.
  // Measured off the real boxes rather than computed from the column index,
  // because the grid has gaps and padding and an animal that trusts arithmetic
  // about a layout it cannot see ends up standing in the path.
  function roamMeasure(r){
    var grid = r.slot.parentNode;
    if(!grid) return false;
    var sb = r.slot.getBoundingClientRect();
    var gb = grid.getBoundingClientRect();
    if(!sb.width || !gb.width) return false;   // not laid out yet; try next frame
    // The drawing is wider than the plot it is anchored to, so the sprite has to
    // stop short of the rail by a fraction of its own body.
    var padX = sb.width * r.gait.pad;
    var padY = sb.height * r.gait.pad * 0.5;
    // sb already includes the transform currently applied, so r.x/r.y go back in
    // to get bounds relative to the untransformed home position.
    r.minX = (gb.left - sb.left) + r.x + padX;
    r.maxX = (gb.right - sb.right) + r.x - padX;
    r.minY = (gb.top - sb.top) + r.y + padY;
    r.maxY = (gb.bottom - sb.bottom) + r.y - padY;
    // A parcel narrower than one padded sprite: pin it to the middle rather than
    // let the bounds invert and fling it out of the pen.
    if(r.minX > r.maxX){ r.minX = r.maxX = (r.minX + r.maxX) / 2; }
    if(r.minY > r.maxY){ r.minY = r.maxY = (r.minY + r.maxY) / 2; }
    // Whatever it inherited from a previous layout, it is inside the fence now.
    r.x = Math.min(r.maxX, Math.max(r.minX, r.x));
    r.y = Math.min(r.maxY, Math.max(r.minY, r.y));
    r.tx = Math.min(r.maxX, Math.max(r.minX, r.tx));
    r.ty = Math.min(r.maxY, Math.max(r.minY, r.ty));
    r.ready = true;
    return true;
  }

  function roamRand(r){
    // The walk still comes out of the id, so the same animal takes the same walk
    // every time — just advanced a step at a time instead of laid out in advance.
    r.seed = mix32(r.seed + 0x9E3779B9);
    return (r.seed >>> 8 & 65535) / 65535;
  }

  function roamPick(r){
    var w = r.maxX - r.minX, hgt = r.maxY - r.minY;
    // A walk has to be worth taking. Resampled rather than nudged, because
    // pushing a too-close target outwards piles destinations up on the fence.
    var want = Math.max(w, hgt) * r.gait.reach;
    for(var tries = 0; tries < 6; tries++){
      r.tx = r.minX + w * roamRand(r);
      r.ty = r.minY + hgt * roamRand(r);
      var ax = r.tx - r.x, ay = r.ty - r.y;
      if(Math.sqrt(ax * ax + ay * ay) >= want) break;
    }
    var dx = r.tx - r.x;
    // A deadzone, because an animal setting off almost straight up should not
    // turn round for a two-pixel sideways component.
    var want = Math.abs(dx) < 6 ? r.want : (dx < 0 ? -1 : 1);
    if(want !== r.want){
      r.from = r.face;
      r.want = want;
      r.state = 'turn';
      r.t = r.gait.turn;
    } else {
      r.state = 'walk';
    }
  }

  function roamRest(r){
    r.state = 'idle';
    var p = r.gait.pause;
    r.t = p[0] + (p[1] - p[0]) * roamRand(r);
  }

  function roamApply(r){
    r.el.style.transform = 'translate(' + r.x.toFixed(1) + 'px,' + r.y.toFixed(1) +
      'px) scaleX(' + r.face.toFixed(3) + ')';
    var walking = r.state === 'walk';
    if(walking !== r.walkClass){
      r.walkClass = walking;
      r.el.classList.toggle('stock-walking', walking);
    }
  }

  function stepRoamers(dt){
    if(!roamers.length) return false;
    // Nothing to do while the Garden tab is not the one being looked at, and
    // measuring boxes that have no layout is the expensive way to learn that.
    if(els.gardenScene && els.gardenScene.offsetParent === null) return false;
    var live = false;
    for(var i = 0; i < roamers.length; i++){
      var r = roamers[i];
      if(!r.el || !r.el.parentNode){ roamers.splice(i--, 1); continue; }
      if(!r.ready && !roamMeasure(r)) continue;
      live = true;
      if(r.state === 'idle'){
        r.t -= dt;
        if(r.t <= 0) roamPick(r);
      } else if(r.state === 'turn'){
        r.t -= dt;
        var p = Math.min(1, Math.max(0, 1 - r.t / r.gait.turn));
        // Interpolated THROUGH zero, so the body foreshortens as it comes side
        // on and opens out again facing the other way. Kept off zero by a sliver
        // because a sprite scaled to exactly nothing vanishes for a frame.
        var f = r.from + (r.want - r.from) * p;
        r.face = Math.abs(f) < 0.12 ? (r.want < 0 ? -0.12 : 0.12) : f;
        if(r.t <= 0){ r.face = r.want; r.state = 'walk'; }
      } else {
        var dx = r.tx - r.x, dy = r.ty - r.y;
        var far = Math.sqrt(dx * dx + dy * dy);
        var step = r.speed * dt / 1000;
        if(far <= step || far < 0.4){
          r.x = r.tx; r.y = r.ty;
          roamRest(r);
        } else {
          r.x += dx / far * step;
          r.y += dy / far * step;
        }
      }
      roamApply(r);
    }
    return live;
  }

  // Re-measured rather than kept: a resize moves every fence.
  function roamRelayout(){
    for(var i = 0; i < roamers.length; i++) roamers[i].ready = false;
  }

  function roamKick(){
    if(!farmFrame && roamers.length) farmFrame = requestAnimationFrame(farmTick);
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
    // The elements are about to be thrown away; the positions they were at are
    // kept in roamState and picked up again by the sprites that replace them.
    roamers.length = 0;

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
          '<span class="parcel-buy-price">' + coin(price, 'lg') + '</span>';
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
          var sprite = buildGardenItem(it, totals.earned);
          slot.appendChild(sprite);
          slot.setAttribute('aria-label', sprite.title);
          if(roams(shopItem(it.kind))) addRoamer(sprite, slot, it.id, shopItem(it.kind));
        } else {
          slot.setAttribute('aria-label',
            'Empty plot, land ' + (p + 1) + ' plot ' + (n + 1));
        }
        // Staggered so the whole farm does not breathe in lockstep.
        slot.style.setProperty('--sway-delay', (-((p * PARCEL_SLOTS + n) % 7) * 0.9) + 's');
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
      els.gardenShopTokens.innerHTML = coin(totals.available, 'lg');
      els.gardenShopTokens.setAttribute('aria-label', totals.available +
        (totals.available === 1 ? ' token' : ' tokens'));
    }
    // The balance and nothing else. What used to sit beside it — how much is
    // already in the ground — moved into the store panel: a coin can only say
    // "this is money" if it is not competing with a second number for the same
    // glance. The coin carries the meaning and the label carries the
    // accessibility, because a drawing cannot be read out loud.
    els.gardenCount.innerHTML = coin(totals.available, 'lg');
    els.gardenCount.setAttribute('aria-label',
      totals.available + (totals.available === 1 ? ' token' : ' tokens') + ' available');
    renderShop(totals);
    renderPlot(totals);
    renderBasket(totals);
    renderGardenHint(totals);
    roamKick();
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

  // What is already planted, in tokens. It reads as an asset rather than a loss
  // — which is the whole reason it is worth showing at all — and the store is
  // where somebody goes to look at what they hold, so it belongs here rather
  // than beside the balance in the HUD.
  function sownLine(totals){
    if(!(totals.spent > 0)) return '';
    return '<p class="store-sown">' + coin(totals.spent) +
      '<span class="store-sown-word">in the ground</span></p>';
  }

  function renderBasket(totals){
    if(!els.gardenBasket) return;
    var basket = totals.garden.basket;
    var kinds = Object.keys(basket).filter(function(k){ return basket[k] > 0 && PRODUCE[k]; });
    if(kinds.length === 0){
      // An empty store says so, rather than vanishing: the building is still
      // there, and "nothing in it yet" is a different thing from "no store".
      els.gardenBasket.innerHTML = '<p class="basket-empty">Nothing harvested yet. ' +
        'Press anything that is ready and it lands here.</p>' + sownLine(totals);
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
        PRODUCE[k].label + ' <span class="basket-worth">' +
        coin(basket[k] * PRODUCE[k].value) + '</span></span>';
    }
    html += '</span><button type="button" class="btn btn-sm basket-sell" id="gardenSellBtn">' +
      'Sell all ' + coin(basketValue(basket)) + '</button>';
    els.gardenBasket.innerHTML = html + sownLine(totals);
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
      version: 6,
      exportedAt: nowMs(),
      sessions: loadSessions(),
      tasks: loadTasks(),
      categories: loadCategories(),
      presets: loadCustomPresets(),
      // The farm, which used to be the one thing a backup left behind. It is
      // months of work made visible — land bought, animals raised from newborn,
      // a basket half full — and it lived in localStorage only, so switching
      // device or restoring a backup wiped it while every session survived.
      garden: loadGarden()
    };
  }

  // The stamp `done` is settled by. A copy from before the stamp existed
  // borrows its doneAt when finished, and counts as 0 (never ticked) when
  // not — so a real tick on any device beats a legacy not-done.
  function doneStampOf(t){
    if(typeof t.doneChangedAt === 'number') return t.doneChangedAt;
    return (t.done && typeof t.doneAt === 'number') ? t.doneAt : 0;
  }

  // Merges an incoming backup object (from a file import or a remote sync
  // pull) into local storage — never deletes anything locally. Sessions,
  // categories and presets are additive by id only (an id already present
  // locally is left untouched). Tasks are additive-by-id *plus*
  // last-write-wins on a shared id: whichever side's `updatedAt` is newer
  // overwrites the other's fields, so a rename/edit made on one device
  // reaches another that already has that same task. `done` is settled
  // separately by its own stamp (doneChangedAt), so a tick is never lost to
  // an unrelated edit — see the task loop below. Returns how much was
  // newly added (and, for tasks, updated), or throws on an unrecognized
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
    var taskById = {};
    currentTasks.forEach(function(t){ taskById[t.id] = t; });
    var addedTasks = 0, updatedTasks = 0;
    incomingTasks.forEach(function(t){
      if(!t || !t.name) return;
      var id = t.id || generateId();
      // Older backups/remote docs predate this stamp — fall back to
      // createdAt so an old snapshot never outranks a real edit made since.
      var incomingUpdatedAt = typeof t.updatedAt === 'number' ? t.updatedAt : (t.createdAt || 0);
      var incomingDoneChangedAt = doneStampOf(t);
      var existing = taskById[id];
      if(existing){
        var changed = false;
        // Ids are shared by both sides, so this is the same task edited on
        // two devices — take whichever copy changed more recently instead
        // of always keeping local (which used to mean a rename/etc. made
        // elsewhere would never show up here). Ties keep the local copy:
        // nothing to gain by overwriting with an identical stamp.
        if(incomingUpdatedAt > (existing.updatedAt || 0)){
          existing.name = t.name;
          existing.category = t.category || 'Uncategorized';
          existing.estimate = typeof t.estimate === 'number' ? t.estimate : existing.estimate;
          existing.completed = typeof t.completed === 'number' ? t.completed : existing.completed;
          existing.sessionPresetId = t.sessionPresetId || existing.sessionPresetId;
          existing.workMin = typeof t.workMin === 'number' ? t.workMin : existing.workMin;
          existing.breakMin = typeof t.breakMin === 'number' ? t.breakMin : existing.breakMin;
          existing.notes = Array.isArray(t.notes) ? t.notes : existing.notes;
          existing.updatedAt = incomingUpdatedAt;
          changed = true;
        }
        // `done` rides on its own stamp, not on updatedAt. Before this,
        // one pomodoro counted here (which bumps updatedAt) was enough to
        // make this copy "newer", so a tick made on the other device never
        // arrived — and worse, this copy's push then un-ticked it there.
        // Now only a later flip of `done` itself can beat an earlier one.
        // The tie case is the one-time bridge for tasks ticked before the
        // stamp existed: both sides sit at the same value, so a done at a
        // tie is adopted, but a not-done never un-finishes anything.
        var existingDoneChangedAt = doneStampOf(existing);
        var doneWins = incomingDoneChangedAt > existingDoneChangedAt ||
          (incomingDoneChangedAt === existingDoneChangedAt && !!t.done && !existing.done);
        if(doneWins && (!!t.done !== existing.done || incomingDoneChangedAt !== existingDoneChangedAt)){
          existing.done = !!t.done;
          existing.doneAt = typeof t.doneAt === 'number' ? t.doneAt : (t.done ? nowMs() : null);
          existing.doneChangedAt = incomingDoneChangedAt;
          changed = true;
        }
        if(changed) updatedTasks += 1;
        return;
      }
      var created = {
        id: id,
        name: t.name,
        category: t.category || 'Uncategorized',
        estimate: typeof t.estimate === 'number' ? t.estimate : 1,
        completed: typeof t.completed === 'number' ? t.completed : 0,
        done: !!t.done,
        doneAt: typeof t.doneAt === 'number' ? t.doneAt : (t.done ? 0 : null),
        doneChangedAt: incomingDoneChangedAt,
        createdAt: t.createdAt || nowMs(),
        updatedAt: incomingUpdatedAt || nowMs(),
        sessionPresetId: t.sessionPresetId || 'deep',
        workMin: typeof t.workMin === 'number' ? t.workMin : 50,
        breakMin: typeof t.breakMin === 'number' ? t.breakMin : 10,
        notes: Array.isArray(t.notes) ? t.notes : []
      };
      currentTasks.push(created);
      taskById[id] = created;
      addedTasks += 1;
    });
    saveTasks(currentTasks);
    reconcileActiveTask(currentTasks);

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

    mergeIncomingGarden(data && data.garden);

    renderTasks();
    // Also redraws the garden: renderGarden runs from refreshStats.
    refreshStats();

    return {addedSessions: addedSessions, addedTasks: addedTasks, updatedTasks: updatedTasks, addedCategories: addedCategories};
  }

  // Folds an incoming garden into the local one. Every rule here is chosen to
  // be IDEMPOTENT, because a sync pull runs again and again over the same
  // remote copy: anything summed would grow on every pull, so counters take
  // the larger of the two rather than the total.
  //
  // Nothing local is ever removed or moved, which is the same promise the rest
  // of the importer makes.
  function mergeIncomingGarden(incoming){
    if(!incoming || typeof incoming !== 'object') return 0;
    var g = loadGarden();

    // A plot can hold one thing. Where both sides planted on the same square
    // the local plant stays and the incoming one is dropped rather than shoved
    // to a free plot: a farm is arranged on purpose, and silently rearranging
    // it is a worse surprise than one missing plant.
    var taken = {}, ids = {};
    g.items.forEach(function(it){ taken[it.row + ':' + it.col] = true; ids[it.id] = true; });

    var added = 0, addedCost = 0;
    var items = Array.isArray(incoming.items) ? incoming.items : [];
    items.forEach(function(it){
      if(!it || typeof it.kind !== 'string') return;
      if(!(it.col >= 0 && it.col < GARDEN_COLS && it.row >= 0 && it.row < GARDEN_MAX_ROWS)) return;
      if(it.id && ids[it.id]) return;
      var at = it.row + ':' + it.col;
      if(taken[at]) return;
      var meta = shopItem(it.kind);
      g.items.push({
        id: it.id || generateId(),
        kind: it.kind,
        col: Math.floor(it.col),
        row: Math.floor(it.row),
        plantedAt: typeof it.plantedAt === 'number' ? it.plantedAt : nowMs(),
        // Age is measured in pomodoros, not in time, so this number is what
        // decides whether the plant arrives grown or as a seedling. Missing it
        // would restart every imported plant from bare soil.
        plantedSeeds: typeof it.plantedSeeds === 'number' ? Math.max(0, Math.floor(it.plantedSeeds)) : 0
      });
      ids[g.items[g.items.length - 1].id] = true;
      taken[at] = true;
      added += 1;
      if(meta) addedCost += meta.price;
    });

    // What the imported plants cost, charged once — an item is only ever added
    // once, so this stays idempotent. Without it the balance is
    // `earned + income - spent` over a farm somebody else paid for, which
    // hands out free tokens for every plant that arrives.
    g.spent += addedCost;
    if(typeof incoming.income === 'number' && incoming.income > g.income) g.income = Math.floor(incoming.income);
    if(typeof incoming.parcels === 'number' && incoming.parcels > (g.parcels || 0)) g.parcels = Math.floor(incoming.parcels);

    if(incoming.basket && typeof incoming.basket === 'object'){
      Object.keys(incoming.basket).forEach(function(k){
        var n = incoming.basket[k];
        if(!PRODUCE[k] || typeof n !== 'number' || n <= 0) return;
        n = Math.floor(n);
        if(!(g.basket[k] > n)) g.basket[k] = n;
      });
    }

    saveGarden(g);
    return added;
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
  // into any other internals of this closure. categoryColorIndex/Class are
  // exposed too, purely so tests can assert on the hash's distribution
  // directly instead of rendering N tasks and scraping class names.
  window.PomodoroBench = {
    STORAGE_SESSIONS: STORAGE_SESSIONS,
    STORAGE_TASKS: STORAGE_TASKS,
    STORAGE_CATEGORIES: STORAGE_CATEGORIES,
    buildBackupData: buildBackupData,
    applyIncomingBackup: applyIncomingBackup,
    categoryColorIndex: categoryColorIndex,
    categoryColorClass: categoryColorClass,
    CATEGORY_COLOR_COUNT: CATEGORY_COLOR_COUNT
  };

})();
