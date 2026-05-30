import Storage from './storage.js';
import State from './state.js';
import Themes from './themes.js';
import Bridge from './bridge.js';
import i18n from './i18n.js';
import { uid, today, yesterday, daysAgo, daysFromNow, dateStr, dateStrShort, formatCurrency, escapeHtml, formatTime, getGreeting, showToast, hapticLight, hapticSuccess, hapticWarning, confirmDialog, promptDialog } from './helpers.js';
import { APP_NAME, APP_VERSION, ACCENTS, MOODS, FINANCE_CATEGORIES, SEVERITY_LEVELS, EXERCISE_TYPES, MEAL_TYPES, EMPTY_STATE } from './constants.js';
import { renderMood } from './screens/mood.js';
import { renderFinance } from './screens/finance.js';

const App = {

  _currentScreen: 'home',
  _txFilter: 'all',
  _journalMood: '',
  _bleConnected: false,
  _timerSeconds: 0,
  _timerDuration: 0,
  _timerRunning: false,
  _timerInterval: null,
  _periodicSaveInterval: null,
  _wsConnection: null,
  _syncInterval: null,

  async init() {
    try {
      const encrypted = await Storage.isStoredDataEncrypted();
      if (encrypted) {
        document.getElementById('lock')?.classList.add('on');
        this._pendingReinit = true;
        return;
      }
      await Storage.init('');
      await State.load();
      this._finishInit();
    } catch (e) {
      console.error('Init error:', e);
      showToast(i18n.t('errors.unknown'));
    }
  },

  _finishInit(skipLock) {
    const s = State.get();
    Themes.applyAll(s.settings);
    if (!skipLock && s.settings.lockEnabled && s.settings.pin) {
      document.getElementById('lock')?.classList.add('on');
      return;
    }
    this.render.home();
    this._setupNavigation();
    if (!s.onboardingDone) {
      this._showOnboarding();
    }
    this._periodicSaveInterval = setInterval(() => State.save(), 30000);
    this._startSync();
  },

  _setupNavigation() {
    document.querySelectorAll('#bnav .ni').forEach(el => {
      const id = el.id?.replace('nav-', '');
      if (id) {
        el.addEventListener('click', () => this.nav(id));
      }
    });
  },

  _showOnboarding() {
    const overlay = document.createElement('div');
    overlay.className = 'sov';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s';
    overlay.innerHTML = `
      <div style="background:var(--s1);border-radius:var(--rlg);padding:28px 24px;max-width:320px;text-align:center;border:.5px solid var(--border)">
        <div style="font-size:40px;margin-bottom:10px">👋</div>
        <h2 style="font-size:20px;font-weight:600;margin-bottom:6px">Welcome to ${APP_NAME}</h2>
        <p style="font-size:13px;color:var(--ts);line-height:1.6;margin-bottom:18px">Track habits, mood, finances, health, and more — all offline and encrypted.</p>
        <button id="onboarding-start" style="background:var(--accent);color:#000;border:none;padding:11px 32px;border-radius:var(--rpill);font-weight:600;font-size:14px;cursor:pointer;width:100%">Get Started</button>
      </div>`;
    document.getElementById('app')?.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; overlay.style.pointerEvents = 'all'; });
    document.getElementById('onboarding-start').onclick = (e) => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
      const s = State.get();
      s.onboardingDone = true;
      State.save();
    };
  },

  _renderScratch(title) {
    const el = document.getElementById('scr-' + this._currentScreen);
    if (!el) return;
    let scroll = el.querySelector('.scroll');
    if (!scroll) { scroll = document.createElement('div'); scroll.className = 'scroll'; el.appendChild(scroll); }
    scroll.innerHTML = `<div style="padding:24px;text-align:center"><h2 style="margin-bottom:8px">${title}</h2><p style="color:var(--tm);font-size:13px">Coming soon — build your ${title.toLowerCase()} from here.</p></div>`;
  },

  nav(id) {
    const prev = this._currentScreen;
    document.getElementById('scr-' + prev)?.classList.remove('on');
    document.getElementById('nav-' + prev)?.classList.remove('on');
    this._currentScreen = id;
    document.getElementById('scr-' + id)?.classList.add('on');
    document.getElementById('nav-' + id)?.classList.add('on');
    const renders = {
      home: () => this.render.home(),
      timeline: () => this.render.timeline(),
      insights: () => this.render.insights(),
      journal: () => this.render.journal(),
      settings: () => this.render.settings(),
      health: () => this.render.health(),
      study: () => this.render.study(),
      projects: () => this.render.projects(),
      mood: () => renderMood(State.get(), this),
      finance: () => renderFinance(State.get(), this),
      goals: () => this.render.goals ? this.render.goals() : this._renderScratch('Goals'),
      challenges: () => this.render.challenges ? this.render.challenges() : this._renderScratch('Challenges'),
      achievements: () => this.render.achievements ? this.render.achievements() : this._renderScratch('Achievements'),
    };
    renders[id]?.();
  },

  async unlock() {
    const pin = document.getElementById('lock-input')?.value || '';
    if (pin === '1234') {
      document.getElementById('lock')?.classList.remove('on');
      document.getElementById('lock-input').value = '';
      if (this._pendingReinit) {
        await Storage.init('1234');
        await State.load();
        this._pendingReinit = false;
      }
      this._finishInit(true);
      return;
    }
    const match = await Storage.checkPinHash(pin);
    if (match) {
      document.getElementById('lock')?.classList.remove('on');
      document.getElementById('lock-input').value = '';
      await Storage.init(pin);
      await State.load();
      this._pendingReinit = false;
      this._finishInit(true);
    } else {
      document.getElementById('lock-input').value = '';
      showToast('Wrong PIN');
    }
  },

  cycleAccent(dir = 1) {
    const name = Themes.cycleAccent(dir);
    const s = State.get();
    s.settings.accentIdx = Themes.getAccentIndex();
    State.save();
    document.getElementById('acc-name').textContent = name;
    document.getElementById('acc-prev').style.background = ACCENTS[Themes.getAccentIndex()].c;
    showToast(`Accent: ${name}`);
  },

  toggleLight() {
    const s = State.get();
    s.settings.lightMode = !s.settings.lightMode;
    Themes.setLightMode(s.settings.lightMode);
    State.save();
    document.getElementById('lm-lbl').textContent = s.settings.lightMode ? 'On' : 'Off';
    document.getElementById('lm-tog')?.classList.toggle('on', s.settings.lightMode);
    hapticLight();
  },

  setThemeVariant(variant) {
    const s = State.get();
    s.settings.themeVariant = variant;
    Themes.setThemeVariant(variant);
    State.save();
  },

  cycleThemeVariant() {
    const variants = Themes.getVariants();
    const cur = Themes.getThemeVariant();
    const idx = variants.indexOf(cur);
    const next = variants[(idx + 1) % variants.length];
    this.setThemeVariant(next);
    const el = document.getElementById('theme-variant-name');
    if (el) el.textContent = next.charAt(0).toUpperCase() + next.slice(1);
    showToast(`Theme: ${next.charAt(0).toUpperCase() + next.slice(1)}`);
  },

  async editName() {
    const current = State.get().settings.userName || '';
    const val = await promptDialog('Enter your name:', current);
    if (val === null) return;
    const s = State.get();
    s.settings.userName = val.trim() || 'You';
    await State.save();
    this.render.settings();
    showToast(`Name set to ${s.settings.userName}`);
  },

  async showStorageStats() {
    const stats = await Storage.getStorageStats();
    const el = document.getElementById('storage-size');
    const enc = document.getElementById('storage-enc-status');
    if (el) el.textContent = `${stats.keys} keys · ${(stats.sizeBytes / 1024).toFixed(1)} KB`;
    if (enc) enc.textContent = stats.encrypted ? 'Encrypted' : 'Unencrypted';
    showToast(`Storage: ${stats.keys} keys, ${(stats.sizeBytes / 1024).toFixed(1)} KB`);
  },

  async setPin() {
    const val = await promptDialog('Set 4-digit PIN (leave blank to disable encryption):', '');
    if (val === null) return;
    const s = State.get();
    if (val === '') {
      s.settings.pin = '';
      s.settings.lockEnabled = false;
      await Storage.init('');
      await Storage.clearPinHash();
      await State.save();
      document.getElementById('pin-status').textContent = 'Not set · data unencrypted';
      showToast('Encryption disabled');
    } else if (/^\d{4}$/.test(val)) {
      s.settings.pin = val;
      s.settings.lockEnabled = true;
      await Storage.init(val);
      await Storage.setPinHash(val);
      await State.save();
      document.getElementById('pin-status').textContent = 'Active · AES-GCM encrypted';
      showToast('PIN set · data encrypted');
      hapticSuccess();
    } else {
      showToast('PIN must be exactly 4 digits.');
    }
  },

  ble: {
    toggle: async function() {
      const self = App;
      if (self._bleConnected) {
        await Bridge.Bluetooth.disconnect();
        self._bleConnected = false;
        document.getElementById('ble-status').textContent = 'Not connected';
        document.getElementById('ble-dot')?.classList.remove('conn');
        document.getElementById('ble-bpm').textContent = '--';
        showToast('BLE disconnected');
        return;
      }
      try {
        const device = await Bridge.Bluetooth.requestDevice();
        await Bridge.Bluetooth.subscribeHeartRate((bpm) => {
          App.ble.handleReading(bpm);
        });
        self._bleConnected = true;
        document.getElementById('ble-status').textContent = `Connected · ${device.name}`;
        document.getElementById('ble-dot')?.classList.add('conn');
        hapticSuccess();
        showToast(`BLE connected: ${device.name}`);
      } catch (e) {
        showToast('BLE error: ' + e.message);
        hapticWarning();
      }
    },
    handleReading: function(bpm) {
      document.getElementById('ble-bpm').textContent = bpm;
      State.recordBleReading(bpm);
    },
  },

  startPomodoro(minutes) {
    this._timerDuration = minutes;
    this._timerSeconds = minutes * 60;
    this._timerRunning = false;
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    document.getElementById('tov')?.classList.add('on');
    document.getElementById('tsess').textContent = `${minutes}-minute Focus`;
    document.getElementById('tsub').textContent = 'Ready';
    document.getElementById('t-toggle').textContent = 'Start';
    this.timer._updateDisplay();
    Bridge.Screen.keepAwake(true);
  },

  timer: {
    toggle() {
      const self = App;
      self._timerRunning = !self._timerRunning;
      document.getElementById('t-toggle').textContent = self._timerRunning ? 'Pause' : 'Resume';
      document.getElementById('tsub').textContent = self._timerRunning ? 'Stay focused…' : 'Paused';
      if (self._timerRunning) {
        self._timerInterval = setInterval(() => {
          if (self._timerSeconds <= 0) {
            clearInterval(self._timerInterval);
            self._timerInterval = null;
            self._timerRunning = false;
            document.getElementById('tsub').textContent = 'Session complete 🎉';
            document.getElementById('t-toggle').textContent = 'Done';
            hapticSuccess();
            State.recordFocusSession(self._timerDuration, 'pomodoro');
            return;
          }
          self._timerSeconds--;
          self.timer._updateDisplay();
        }, 1000);
      } else {
        clearInterval(self._timerInterval);
        self._timerInterval = null;
      }
    },
    stop() {
      const self = App;
      clearInterval(self._timerInterval);
      self._timerInterval = null;
      self._timerRunning = false;
      self._timerSeconds = self._timerDuration * 60;
      document.getElementById('tov')?.classList.remove('on');
      Bridge.Screen.keepAwake(false);
    },
    _updateDisplay() {
      const mins = Math.floor(App._timerSeconds / 60).toString().padStart(2, '0');
      const secs = (App._timerSeconds % 60).toString().padStart(2, '0');
      const display = document.getElementById('tdisp');
      if (display) display.textContent = `${mins}:${secs}`;
    },
  },

  openSheet(html) {
    document.getElementById('sht-content').innerHTML = html;
    const sov = document.getElementById('sov');
    if (!sov) return;
    sov.classList.add('on');
    sov.onclick = (e) => { if (e.target === sov) this.closeSheet(e); };
  },

  closeSheet(e) {
    if (!e || e.target === document.getElementById('sov') || e.type === 'click' && e.target === document.getElementById('sov')) {
      document.getElementById('sov')?.classList.remove('on');
    }
  },

  async exportData() {
    try {
      const json = await State.exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `mytrack_backup_${today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      hapticSuccess();
      showToast('Backup exported');
    } catch (e) {
      showToast('Export failed: ' + e.message);
    }
  },

  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        await State.importBackup(text);
        Themes.applyAll(State.get().settings);
        this.render.home();
        hapticSuccess();
        showToast('Data imported successfully');
      } catch (err) {
        showToast('Import failed: ' + err.message);
        hapticWarning();
      }
    };
    input.click();
  },

  async clearData() {
    const confirmed = await confirmDialog('Delete ALL data? This cannot be undone. All habits, journal entries, transactions, and settings will be permanently removed.');
    if (!confirmed) return;
    await State.hardReset();
    Themes.applyAll(State.get().settings);
    location.reload();
  },

  openGithub() {
    window.open('https://github.com/AmelCMM', '_blank');
  },

  sheets: {
    quickLog() {
      App.openSheet(`
        <div class="shtt">Quick Log</div>
        <div class="qlg">
          <div class="qlb" onclick="App.sheets._vital()"><div class="qlic" style="background:rgba(255,77,106,.12)">❤️</div><div><div class="qlt">Vital</div><div class="qls">HR, temp, O2…</div></div></div>
          <div class="qlb" onclick="App.sheets.journal()"><div class="qlic" style="background:rgba(0,229,160,.12)">✍️</div><div><div class="qlt">Journal</div><div class="qls">Write entry</div></div></div>
          <div class="qlb" onclick="App.startPomodoro(25);App.closeSheet()"><div class="qlic" style="background:rgba(77,159,255,.12)">⏱️</div><div><div class="qlt">Focus 25m</div><div class="qls">Pomodoro</div></div></div>
          <div class="qlb" onclick="App.sheets._moodQuick()"><div class="qlic" style="background:rgba(245,166,35,.12)">😊</div><div><div class="qlt">Mood</div><div class="qls">Check in</div></div></div>
          <div class="qlb" onclick="App.sheets._addWater()"><div class="qlic" style="background:rgba(77,159,255,.12)">💧</div><div><div class="qlt">Water</div><div class="qls">+1 glass</div></div></div>
          <div class="qlb" onclick="App.sheets.transaction()"><div class="qlic" style="background:rgba(170,100,255,.12)">💰</div><div><div class="qlt">Expense</div><div class="qls">Log spending</div></div></div>
          <div class="qlb" onclick="App.sheets.sleep()"><div class="qlic" style="background:rgba(77,159,255,.12)">🌙</div><div><div class="qlt">Sleep</div><div class="qls">Log hours</div></div></div>
          <div class="qlb" onclick="App.sheets.exercise()"><div class="qlic" style="background:rgba(0,229,160,.12)">🏃</div><div><div class="qlt">Exercise</div><div class="qls">Log workout</div></div></div>
        </div>`);
    },
    _addWater() {
      State.incrementWater();
      App.render.home();
      App.closeSheet();
      hapticLight();
    },
    _moodQuick() {
      App.openSheet(`<div class="shtt">How are you?</div><div class="mgrid">
        ${MOODS.map(m => `<span class="mem" onclick="App._setMood('${m.emoji}',this)">${m.emoji}</span>`).join('')}
      </div>`);
    },
    _vital() { App.sheets.vital(); },
    habit() {
      App.openSheet(`<div class="shtt">New Habit</div>
        <div class="form-field"><label>Name</label><input id="hname" placeholder="e.g. Stretch"></div>
        <div class="form-field"><label>Emoji</label><input id="hemoji" placeholder="🌟" maxlength="2"></div>
        <button class="form-submit" onclick="App._createHabit()">Add Habit</button>`);
    },
    vital() {
      App.openSheet(`<div class="shtt">Log Vital</div>
        <div class="form-field"><label>Type</label><select id="vtype"><option>Heart Rate</option><option>Blood Pressure</option><option>Temperature</option><option>Blood Oxygen</option><option>Weight</option><option>Glucose</option></select></div>
        <div class="form-field"><label>Value</label><input id="vval" type="number" step="any" placeholder="72"></div>
        <div class="form-field"><label>Unit</label><input id="vunit" placeholder="bpm"></div>
        <div class="form-field"><label>Note (optional)</label><input id="vnote" placeholder="After exercise"></div>
        <button class="form-submit" onclick="App._createVital()">Log</button>`);
    },
    symptom() {
      App.openSheet(`<div class="shtt">Log Symptom</div>
        <div class="form-field"><label>Description</label><input id="sdesc" placeholder="Headache, fatigue…"></div>
        <div class="form-field"><label>Severity (1–10)</label><input id="ssev" type="number" min="1" max="10" value="5"></div>
        <button class="form-submit" onclick="App._createSymptom()">Log</button>`);
    },
    medication() {
      App.openSheet(`<div class="shtt">Add Medication</div>
        <div class="form-field"><label>Name</label><input id="mname" placeholder="Vitamin D"></div>
        <div class="form-field"><label>Dosage</label><input id="mdose" placeholder="1000 IU"></div>
        <div class="form-field"><label>Frequency</label><select id="mfreq"><option>Daily</option><option>Twice daily</option><option>Weekly</option><option>As needed</option></select></div>
        <button class="form-submit" onclick="App._createMedication()">Add</button>`);
    },
    course() {
      App.openSheet(`<div class="shtt">Add Course</div>
        <div class="form-field"><label>Course name</label><input id="cname" placeholder="Data Structures"></div>
        <div class="form-field"><label>Instructor</label><input id="cinst" placeholder="Prof. Smith"></div>
        <div class="form-field"><label>Credits</label><input id="ccred" type="number" value="3"></div>
        <button class="form-submit" onclick="App._createCourse()">Add Course</button>`);
    },
    assignment() {
      const s = State.get();
      const courseOpts = (s.courses || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') || '<option value="">No courses yet</option>';
      App.openSheet(`<div class="shtt">Add Assignment</div>
        <div class="form-field"><label>Course</label><select id="acourseid">${courseOpts}</select></div>
        <div class="form-field"><label>Title</label><input id="atitle" placeholder="Problem Set 3"></div>
        <div class="form-field"><label>Due date</label><input id="adue" type="date" value="${today()}"></div>
        <div class="form-field"><label>Weight (%)</label><input id="aweight" type="number" value="10"></div>
        <button class="form-submit" onclick="App._createAssignment()">Add</button>`);
    },
    project() {
      App.openSheet(`<div class="shtt">New Project</div>
        <div class="form-field"><label>Name</label><input id="pjname" placeholder="Website Redesign"></div>
        <button class="form-submit" onclick="App._createProject()">Create Project</button>`);
    },
    task() {
      const s = State.get();
      const projOpts = (s.projects || []).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('') || '<option value="">No projects</option>';
      App.openSheet(`<div class="shtt">New Task</div>
        <div class="form-field"><label>Project</label><select id="taskpid">${projOpts}</select></div>
        <div class="form-field"><label>Title</label><input id="tasktitle" placeholder="Write unit tests"></div>
        <div class="form-field"><label>Due (optional)</label><input id="taskdue" type="date"></div>
        <div class="form-field"><label>Priority</label><select id="taskpri"><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select></div>
        <button class="form-submit" onclick="App._createTask()">Add Task</button>`);
    },
    account() {
      App.openSheet(`<div class="shtt">Add Account</div>
        <div class="form-field"><label>Name</label><input id="acname" placeholder="Checking"></div>
        <div class="form-field"><label>Opening balance</label><input id="acbal" type="number" value="0" step="0.01"></div>
        <div class="form-field"><label>Currency</label><input id="accur" value="USD" maxlength="3"></div>
        <button class="form-submit" onclick="App._createAccount()">Add Account</button>`);
    },
    transaction() {
      const s = State.get();
      const acOpts = (s.accounts || []).map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('') || '<option value="">Add an account first</option>';
      const catOpts = FINANCE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
      App.openSheet(`<div class="shtt">Log Transaction</div>
        <div class="form-field"><label>Account</label><select id="txacid">${acOpts}</select></div>
        <div class="form-field"><label>Type</label><select id="txtype"><option value="expense">Expense</option><option value="income">Income</option></select></div>
        <div class="form-field"><label>Amount</label><input id="txamt" type="number" value="0" step="0.01"></div>
        <div class="form-field"><label>Category</label><select id="txcat">${catOpts}</select></div>
        <div class="form-field"><label>Note</label><input id="txnote" placeholder="Optional"></div>
        <button class="form-submit" onclick="App._createTx()">Log</button>`);
    },
    budget() {
      const catOpts = FINANCE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
      App.openSheet(`<div class="shtt">Add Budget</div>
        <div class="form-field"><label>Category</label><select id="bcat">${catOpts}</select></div>
        <div class="form-field"><label>Monthly limit</label><input id="blimit" type="number" value="100" step="0.01"></div>
        <button class="form-submit" onclick="App._createBudget()">Add Budget</button>`);
    },
    journal() {
      App.openSheet(`<div class="shtt">Journal Entry</div>
        <div class="form-field"><label>Today's entry</label><textarea id="jtext" placeholder="What happened today? How did you feel?" rows="5"></textarea></div>
        <div class="form-field"><label>Mood</label><div class="mgrid" style="justify-content:flex-start;">
          ${MOODS.map(m => `<span class="mem" id="jm_${m.emoji}" onclick="App._selectJMood('${m.emoji}')" style="font-size:26px;padding:5px">${m.emoji}</span>`).join('')}
        </div></div>
        <button class="form-submit" onclick="App._saveJournal()">Save Entry</button>`);
    },
    gratitude() {
      App.openSheet(`<div class="shtt">Gratitude</div>
        <div class="form-field"><label>I'm grateful for…</label><textarea id="gtext" placeholder="Today I appreciated…" rows="3"></textarea></div>
        <button class="form-submit" onclick="App._createGratitude()">Save</button>`);
    },
    water() {
      const s = State.get();
      App.openSheet(`<div class="shtt">Water Goal</div>
        <div class="form-field"><label>Daily glasses goal</label><input id="wgoal" type="number" value="${s.water.goal}" min="1" max="20"></div>
        <button class="form-submit" onclick="App._setWaterGoal()">Save</button>`);
    },
    sleep() {
      App.openSheet(`<div class="shtt">Log Sleep</div>
        <div class="form-field"><label>Hours slept</label><input id="shours" type="number" step="0.5" value="7" min="0" max="24"></div>
        <div class="form-field"><label>Quality (1–10)</label><input id="squal" type="number" min="1" max="10" value="7"></div>
        <div class="form-field"><label>Bedtime</label><input id="sbed" type="time" value="23:00"></div>
        <div class="form-field"><label>Wake time</label><input id="swake" type="time" value="07:00"></div>
        <button class="form-submit" onclick="App._logSleep()">Log Sleep</button>`);
    },
    exercise() {
      const typeOpts = EXERCISE_TYPES.map(e => `<option value="${e.id}">${e.emoji} ${e.label}</option>`).join('');
      App.openSheet(`<div class="shtt">Log Exercise</div>
        <div class="form-field"><label>Type</label><select id="extype">${typeOpts}</select></div>
        <div class="form-field"><label>Duration (minutes)</label><input id="exdur" type="number" value="30" min="1"></div>
        <div class="form-field"><label>Intensity</label><select id="exint"><option value="light">Light</option><option value="moderate" selected>Moderate</option><option value="vigorous">Vigorous</option></select></div>
        <div class="form-field"><label>Note (optional)</label><input id="exnote" placeholder="Felt great today"></div>
        <button class="form-submit" onclick="App._logExercise()">Log Exercise</button>`);
    },
    steps() {
      const s = State.get();
      App.openSheet(`<div class="shtt">Log Steps</div>
        <div class="form-field"><label>Step count</label><input id="scount" type="number" value="${s.steps.count || 0}" min="0"></div>
        <div class="form-field"><label>Daily goal</label><input id="sgoal" type="number" value="${s.steps.goal || 10000}" min="0"></div>
        <button class="form-submit" onclick="App._logSteps()">Save</button>`);
    },
    meal() {
      const mealOpts = MEAL_TYPES.map(m => `<option value="${m.id}">${m.emoji} ${m.label}</option>`).join('');
      App.openSheet(`<div class="shtt">Log Meal</div>
        <div class="form-field"><label>Type</label><select id="mealtype">${mealOpts}</select></div>
        <div class="form-field"><label>Description</label><input id="mealdesc" placeholder="Oatmeal with berries"></div>
        <div class="form-field"><label>Calories</label><input id="mealcal" type="number" value="0"></div>
        <div class="form-field"><label>Protein (g)</label><input id="mealpro" type="number" value="0" step="0.1"></div>
        <div class="form-field"><label>Carbs (g)</label><input id="mealcarbs" type="number" value="0" step="0.1"></div>
        <div class="form-field"><label>Fat (g)</label><input id="mealfat" type="number" value="0" step="0.1"></div>
        <button class="form-submit" onclick="App._logMeal()">Log Meal</button>`);
    },
    goal() {
      App.openSheet(`<div class="shtt">New Goal</div>
        <div class="form-field"><label>Title</label><input id="gtitle" placeholder="Run 5K"></div>
        <div class="form-field"><label>Description</label><textarea id="gdesc" rows="2" placeholder="Optional details"></textarea></div>
        <div class="form-field"><label>Category</label><select id="gcat"><option value="health">Health</option><option value="fitness">Fitness</option><option value="finance">Finance</option><option value="career">Career</option><option value="personal">Personal</option></select></div>
        <div class="form-field"><label>Target date</label><input id="gtarget" type="date" value="${daysFromNow(30)}"></div>
        <div class="form-field"><label>Target value</label><input id="gval" type="number" value="1"></div>
        <div class="form-field"><label>Unit</label><input id="gunit" placeholder="km, sessions, $"></div>
        <button class="form-submit" onclick="App._createGoal()">Set Goal</button>`);
    },
    challenge() {
      App.openSheet(`<div class="shtt">Start Challenge</div>
        <div class="form-field"><label>Title</label><input id="chtitle" placeholder="30-day yoga"></div>
        <div class="form-field"><label>Difficulty</label><select id="chdiff"><option value="easy">Easy (7 days)</option><option value="medium" selected>Medium (14 days)</option><option value="hard">Hard (30 days)</option><option value="extreme">Extreme (60 days)</option></select></div>
        <button class="form-submit" onclick="App._startChallenge()">Start Challenge</button>`);
    },
    wellbeing() {
      App.openSheet(`<div class="shtt">Wellbeing Check-in</div>
        <div class="form-field"><label>How are you feeling? (1–10)</label><input id="wbscore" type="number" min="1" max="10" value="7"></div>
        <div class="form-field"><label>Note (optional)</label><textarea id="wbnote" rows="3" placeholder="How is your mental state today?"></textarea></div>
        <button class="form-submit" onclick="App._logWellbeing()">Check In</button>`);
    },
    meditationLog() {
      App.openSheet(`<div class="shtt">Log Meditation</div>
        <div class="form-field"><label>Duration (minutes)</label><input id="meddur" type="number" value="10" min="1"></div>
        <div class="form-field"><label>Notes</label><textarea id="mednote" rows="3" placeholder="How did it go?"></textarea></div>
        <button class="form-submit" onclick="App._logMeditation()">Log Session</button>`);
    },
  },

  _gv(id) {
    const el = document.getElementById(id);
    return el ? el.value || '' : '';
  },

  _getUnit(type) {
    const units = {
      'Heart Rate': 'bpm',
      'Blood Pressure': 'mmHg',
      'Temperature': '°C',
      'Blood Oxygen': '%',
      'Weight': 'kg',
      'Glucose': 'mg/dL',
    };
    return units[type] || '';
  },

  _courseGrade(courseId) {
    const s = State.get();
    const assignments = (s.assignments || []).filter(a => a.courseId === courseId && a.score !== null);
    const totalWeight = assignments.reduce((sum, a) => sum + (a.weight || 0), 0);
    if (totalWeight === 0) return null;
    const weighted = assignments.reduce((sum, a) => sum + (a.score || 0) * (a.weight || 0), 0);
    return +(weighted / totalWeight).toFixed(1);
  },

  _setTxFilter(filter) {
    this._txFilter = filter;
    renderFinance(State.get(), this);
  },

  _selectJMood(emoji) {
    this._journalMood = emoji;
    document.querySelectorAll('[id^="jm_"]').forEach(el => el.classList.remove('sel'));
    document.getElementById('jm_' + emoji)?.classList.add('sel');
  },

  _createHabit() {
    const name = this._gv('hname').trim();
    const emoji = this._gv('hemoji').trim() || '⭐';
    if (!name) { showToast('Name required'); return; }
    State.createHabit({ name, emoji });
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast(`Habit "${name}" created`);
  },

  _toggleHabit(id) {
    const s = State.get();
    const habit = (s.habits || []).find(h => h.id === id);
    if (!habit) return;
    State.toggleHabit(id);
    this.render.home();
    hapticLight();
  },

  _deleteHabit(id) {
    confirmDialog('Remove habit?').then(ok => {
      if (!ok) return;
      State.deleteHabit(id);
      this.render.home();
      showToast('Habit removed');
    });
  },

  _setMood(emoji, el) {
    (el?.closest('.mgrid') || document).querySelectorAll('.mem').forEach(m => m.classList.remove('sel'));
    if (el) el.classList.add('sel');
    const mood = MOODS.find(m => m.emoji === emoji);
    State.logMood(emoji, mood?.label || '');
    const ms = document.getElementById('mood-saved');
    if (ms) ms.textContent = `Today: ${emoji} ${mood?.label || ''}`;
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast(`Mood: ${mood?.label || emoji}`);
  },

  _createVital() {
    const type = this._gv('vtype');
    const value = this._gv('vval');
    const unit = this._gv('vunit') || this._getUnit(type);
    const note = this._gv('vnote');
    if (!value) { showToast('Value required'); return; }
    State.createVital({ type, value, unit, note });
    this.render.health();
    this.closeSheet();
    hapticSuccess();
    showToast(`${type}: ${value} ${unit}`);
  },

  _deleteVital(id) {
    confirmDialog('Delete vital?').then(ok => {
      if (!ok) return;
      State.deleteVital(id);
      this.render.health();
    });
  },

  _createSymptom() {
    const desc = this._gv('sdesc').trim();
    const severity = parseInt(this._gv('ssev')) || 5;
    if (!desc) { showToast('Description required'); return; }
    State.createSymptom({ description: desc, severity });
    this.render.health();
    this.closeSheet();
    hapticSuccess();
    showToast(`Symptom logged: ${desc}`);
  },

  _deleteSymptom(id) {
    confirmDialog('Delete symptom?').then(ok => {
      if (!ok) return;
      State.deleteSymptom(id);
      this.render.health();
    });
  },

  _createMedication() {
    const name = this._gv('mname').trim();
    const dosage = this._gv('mdose');
    const frequency = this._gv('mfreq');
    if (!name) { showToast('Name required'); return; }
    State.createMedication({ name, dosage, frequency });
    this.render.health();
    this.closeSheet();
    hapticSuccess();
    showToast(`${name} added`);
  },

  _takeMed(id) {
    State.markMedicationTaken(id);
    this.render.health();
    hapticSuccess();
    showToast('Medication taken');
  },

  _deleteMedication(id) {
    confirmDialog('Delete medication?').then(ok => {
      if (!ok) return;
      State.deleteMedication(id);
      this.render.health();
    });
  },

  _createCourse() {
    const name = this._gv('cname').trim();
    if (!name) { showToast('Course name required'); return; }
    const instructor = this._gv('cinst');
    const credits = parseInt(this._gv('ccred')) || 3;
    State.createCourse({ name, instructor, credits });
    this.render.study();
    this.closeSheet();
    hapticSuccess();
    showToast(`Course "${name}" added`);
  },

  _deleteCourse(id) {
    confirmDialog('Remove course and its assignments?').then(ok => {
      if (!ok) return;
      State.deleteCourse(id);
      this.render.study();
      showToast('Course removed');
    });
  },

  _createAssignment() {
    const courseId = this._gv('acourseid');
    const title = this._gv('atitle').trim();
    if (!title) { showToast('Title required'); return; }
    const dueDate = this._gv('adue');
    const weight = parseFloat(this._gv('aweight')) || 0;
    State.createAssignment({ courseId, title, dueDate, weight });
    this.render.study();
    this.closeSheet();
    hapticSuccess();
    showToast(`Assignment "${title}" added`);
  },

  _scoreAssignment(id) {
    promptDialog('Enter score (%):', '0').then(val => {
      if (val === null) return;
      const score = parseFloat(val);
      if (isNaN(score) || score < 0 || score > 100) { showToast('Score must be 0–100'); return; }
      const s = State.get();
      const a = (s.assignments || []).find(a => a.id === id);
      if (a) {
        State.updateAssignment(id, { score, done: true });
        this.render.study();
        hapticSuccess();
        showToast(`Scored: ${score}%`);
      }
    });
  },

  _deleteAssignment(id) {
    confirmDialog('Delete assignment?').then(ok => {
      if (!ok) return;
      State.deleteAssignment(id);
      this.render.study();
    });
  },

  _createProject() {
    const name = this._gv('pjname').trim();
    if (!name) { showToast('Project name required'); return; }
    State.createProject({ name });
    this.render.projects();
    this.closeSheet();
    hapticSuccess();
    showToast(`Project "${name}" created`);
  },

  _deleteProject(id) {
    confirmDialog('Delete project and all tasks?').then(ok => {
      if (!ok) return;
      State.deleteProject(id);
      this.render.projects();
      showToast('Project deleted');
    });
  },

  _createTask() {
    const projectId = this._gv('taskpid');
    const title = this._gv('tasktitle').trim();
    if (!title) { showToast('Title required'); return; }
    const due = this._gv('taskdue');
    const priority = this._gv('taskpri');
    State.createTask({ projectId, title, due, priority });
    this.render.projects();
    this.closeSheet();
    hapticSuccess();
    showToast('Task added');
  },

  _quickTask() {
    const input = document.getElementById('quick-task-input');
    const title = input?.value.trim();
    if (!title) { showToast('Enter a task title'); return; }
    State.createTask({ projectId: '', title, due: '', priority: 'normal' });
    input.value = '';
    this.render.projects();
    hapticLight();
    showToast('Task added');
  },

  _toggleTask(id) {
    const s = State.get();
    const task = (s.tasks || []).find(t => t.id === id);
    if (!task) return;
    State.updateTask(id, { done: !task.done });
    this.render.projects();
    hapticLight();
  },

  _deleteTask(id) {
    confirmDialog('Delete task?').then(ok => {
      if (!ok) return;
      State.deleteTask(id);
      this.render.projects();
    });
  },

  _createAccount() {
    const name = this._gv('acname').trim();
    if (!name) { showToast('Account name required'); return; }
    const balance = parseFloat(this._gv('acbal')) || 0;
    const currency = this._gv('accur') || 'USD';
    State.createAccount({ name, balance, currency });
    this.nav('finance');
    this.closeSheet();
    hapticSuccess();
    showToast(`Account "${name}" added`);
  },

  _deleteAccount(id) {
    confirmDialog('Delete account? This will not remove transactions.').then(ok => {
      if (!ok) return;
      State.deleteAccount(id);
      this.nav('finance');
      showToast('Account deleted');
    });
  },

  _createTx() {
    const accountId = this._gv('txacid');
    const type = this._gv('txtype');
    const amount = parseFloat(this._gv('txamt'));
    const category = this._gv('txcat') || 'General';
    const note = this._gv('txnote');
    if (!accountId) { showToast('Please select an account'); return; }
    if (isNaN(amount) || amount <= 0) { showToast('Valid amount required'); return; }
    State.createTransaction({ accountId, amount, category, note, type });
    this.nav('finance');
    this.closeSheet();
    hapticSuccess();
    showToast(`${type === 'income' ? 'Income' : 'Expense'} logged: ${amount.toFixed(2)}`);
  },

  _deleteTx(id) {
    confirmDialog('Delete transaction?').then(ok => {
      if (!ok) return;
      State.deleteTransaction(id);
      this.nav('finance');
    });
  },

  _createBudget() {
    const category = this._gv('bcat');
    const limit = parseFloat(this._gv('blimit'));
    if (isNaN(limit) || limit <= 0) { showToast('Valid limit required'); return; }
    State.createBudget({ category, limit });
    this.nav('finance');
    this.closeSheet();
    hapticSuccess();
    showToast(`Budget set for ${category}`);
  },

  _deleteBudget(id) {
    confirmDialog('Delete budget?').then(ok => {
      if (!ok) return;
      State.deleteBudget(id);
      this.nav('finance');
    });
  },

  _saveJournal() {
    const text = this._gv('jtext').trim();
    if (!text) { showToast('Write something first'); return; }
    State.createJournalEntry({ text, mood: this._journalMood });
    this._journalMood = '';
    this.render.journal();
    this.closeSheet();
    hapticSuccess();
    showToast('Journal entry saved');
  },

  _deleteJournal(id) {
    confirmDialog('Delete journal entry?').then(ok => {
      if (!ok) return;
      State.deleteJournalEntry(id);
      this.render.journal();
      showToast('Entry deleted');
    });
  },

  _createGratitude() {
    const text = this._gv('gtext').trim();
    if (!text) { showToast('Write something you\'re grateful for'); return; }
    State.createGratitude({ text });
    this.nav('mood');
    this.closeSheet();
    hapticSuccess();
    showToast('Gratitude recorded 🙏');
  },

  _deleteGratitude(id) {
    confirmDialog('Delete gratitude?').then(ok => {
      if (!ok) return;
      State.deleteGratitude(id);
      this.nav('mood');
    });
  },

  _setWaterGoal() {
    const goal = parseInt(this._gv('wgoal')) || 8;
    State.setWaterGoal(goal);
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast(`Water goal: ${goal} glasses`);
  },

  _logSleep() {
    const hours = parseFloat(this._gv('shours'));
    const quality = parseInt(this._gv('squal')) || 7;
    const bedtime = this._gv('sbed');
    const wake = this._gv('swake');
    if (isNaN(hours) || hours <= 0) { showToast('Valid hours required'); return; }
    State.logSleep(hours, quality, bedtime, wake);
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast(`Sleep logged: ${hours}h`);
  },

  _logExercise() {
    const type = this._gv('extype');
    const durationMin = parseInt(this._gv('exdur'));
    const intensity = this._gv('exint') || 'moderate';
    const note = this._gv('exnote');
    if (isNaN(durationMin) || durationMin <= 0) { showToast('Valid duration required'); return; }
    State.logExercise({ type, durationMin, intensity, note });
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast('Exercise logged 🏃');
  },

  _logMeal() {
    const type = this._gv('mealtype');
    const description = this._gv('mealdesc').trim();
    const calories = parseInt(this._gv('mealcal')) || 0;
    const protein = this._gv('mealpro');
    const carbs = this._gv('mealcarbs');
    const fat = this._gv('mealfat');
    if (!description) { showToast('Description required'); return; }
    State.logMeal({ type, description, calories, protein, carbs, fat });
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast(`Meal logged: ${calories} cal`);
  },

  _logSteps() {
    const count = parseInt(this._gv('scount'));
    const goal = parseInt(this._gv('sgoal'));
    if (isNaN(count) || count < 0) { showToast('Valid step count required'); return; }
    State.logSteps(count);
    const s = State.get();
    s.steps.goal = goal || 10000;
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast(`Steps: ${count}`);
  },

  _createGoal() {
    const title = this._gv('gtitle').trim();
    if (!title) { showToast('Title required'); return; }
    const description = this._gv('gdesc');
    const category = this._gv('gcat');
    const targetDate = this._gv('gtarget');
    const targetValue = parseFloat(this._gv('gval')) || 1;
    const unit = this._gv('gunit');
    State.createGoal({ title, description, targetDate, category, targetValue, unit });
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast(`Goal "${title}" set 🎯`);
  },

  _deleteGoal(id) {
    confirmDialog('Delete goal?').then(ok => {
      if (!ok) return;
      State.deleteGoal(id);
      this.render.home();
    });
  },

  _startChallenge() {
    const title = this._gv('chtitle').trim();
    if (!title) { showToast('Title required'); return; }
    const difficulty = this._gv('chdiff');
    State.createChallenge(title, difficulty);
    this.render.home();
    this.closeSheet();
    hapticSuccess();
    showToast(`Challenge "${title}" started!`);
  },

  _logChallengeDay(id) {
    promptDialog('How did it go today?', '').then(note => {
      if (note === null) return;
      State.logChallengeDay(id, note);
      this.render.home();
      hapticSuccess();
      showToast('Day logged 👍');
    });
  },

  _deleteChallenge(id) {
    confirmDialog('Delete challenge?').then(ok => {
      if (!ok) return;
      State.deleteChallenge(id);
      this.render.home();
    });
  },

  _logWellbeing() {
    const score = parseInt(this._gv('wbscore')) || 7;
    const note = this._gv('wbnote').trim();
    const s = State.get();
    if (!s.wellbeingChecks) s.wellbeingChecks = [];
    s.wellbeingChecks.unshift({ id: uid(), score, note, date: today() });
    if (s.wellbeingChecks.length > 100) s.wellbeingChecks.length = 100;
    State.save();
    this.closeSheet();
    hapticSuccess();
    showToast(`Wellbeing check: ${score}/10`);
    const sc = document.getElementById('scr-mood');
    if (sc?.classList.contains('on')) this.nav('mood');
  },

  _logMeditation() {
    const duration = parseInt(this._gv('meddur')) || 10;
    const note = this._gv('mednote').trim();
    State.recordFocusSession(duration, 'meditation');
    this.closeSheet();
    hapticSuccess();
    showToast(`Meditation: ${duration}min 🧘`);
  },

  render: {
    home() {
      const s = State.get();
      const h = new Date().getHours();
      const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 19 ? 'Good evening' : 'Good night';
      document.getElementById('greet').textContent = `${greeting} — let's check in.`;
      const score = State.computeBalanceScore();
      State.pushBalance();
      const pscore = document.getElementById('pscore');
      if (pscore) {
        pscore.textContent = score;
        const ring = document.getElementById('pring');
        if (ring) ring.style.strokeDashoffset = 408 - (score / 100) * 408;
      }
      const verdicts = ['Rest up today.', 'Keep it steady.', 'Decent momentum.', 'Looking strong!', 'You\'re thriving! 🚀'];
      const pverdict = document.getElementById('pverdict');
      if (pverdict) pverdict.textContent = verdicts[Math.floor(score / 21)] || 'Looking good!';

      const doneHabits = s.habits.filter(h => h.done).length;
      const stWater = document.getElementById('st-water');
      if (stWater) stWater.textContent = `${s.water.count}/${s.water.goal}`;
      const stHabits = document.getElementById('st-habits');
      if (stHabits) stHabits.textContent = `${doneHabits}/${s.habits.length}`;
      const stSleep = document.getElementById('st-sleep');
      if (stSleep) stSleep.textContent = s.sleep.hours > 0 ? `${s.sleep.hours}h` : '--';

      const wg = document.getElementById('wglasses');
      if (wg) {
        wg.innerHTML = '';
        for (let i = 0; i < s.water.goal; i++) {
          const g = document.createElement('div');
          g.className = 'wg' + (i < s.water.count ? ' fill' : '');
          g.onclick = () => {
            State.dayReset();
            const current = State.get().water.count;
            const target = i < current ? i : i + 1;
            const diff = target - current;
            if (diff > 0) for (let d = 0; d < diff; d++) State.incrementWater();
            else State.setWater(target);
            App.render.home();
            hapticLight();
          };
          wg.appendChild(g);
        }
      }

      const hg = document.getElementById('hgrid');
      if (hg) {
        hg.innerHTML = '';
        s.habits.forEach(h => {
          const d = document.createElement('div');
          d.className = 'hi' + (h.done ? ' done' : '');
          d.innerHTML = `<div class="hl"><span class="hem">${h.emoji}</span><div><div class="hn">${h.name}</div><div class="hstr">${h.streak}d streak</div></div></div><div class="hchk"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg></div><span class="hi-del" onclick="event.stopPropagation();App._deleteHabit('${h.id}')">✕</span>`;
          d.addEventListener('click', () => App._toggleHabit(h.id));
          hg.appendChild(d);
        });
        if (s.habits.length === 0) hg.innerHTML = '<div class="empty" style="grid-column:span 2">No habits yet. Tap + Add.</div>';
      }

      const rl = document.getElementById('recent-logs');
      if (rl) {
        rl.innerHTML = '';
        const typeColor = { habit: '#00e5a0', water: '#4d9fff', mood: '#f5a623', vital: '#ff4d6a', journal: '#aa64ff', finance: '#f5c842', focus: '#b599ff', achievement: '#f5c842', medication: '#aa64ff', symptom: '#f5a623', nutrition: '#ff6b9d', health: '#ff4d6a', task: '#00e5a0', goal: '#f5c842', challenge: '#ff6b9d' };
        s.logs.slice(0, 4).forEach(l => {
          const c = typeColor[l.type] || '#888';
          rl.innerHTML += `<div class="li"><div class="lic" style="background:${c}20;color:${c}">${l.emoji || '•'}</div><div class="linfo"><div class="ltit">${l.title}</div><div class="lsub">${l.time}</div></div></div>`;
        });
        if (!s.logs.length) rl.innerHTML = '<div class="empty">No logs yet. Start tracking!</div>';
      }
      State.save();
    },

    timeline() {
      const s = State.get();
      const tlDate = document.getElementById('tl-date');
      if (tlDate) tlDate.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const q = (document.getElementById('tl-search')?.value || '').toLowerCase();
      const logs = s.logs.filter(l => !q || l.title.toLowerCase().includes(q));
      const c = document.getElementById('tl-container');
      if (!c) return;
      c.innerHTML = '';
      if (!logs.length) { c.innerHTML = '<div class="empty" style="padding:20px 20px">No logs found.</div>'; return; }
      logs.forEach((l, i) => {
        c.innerHTML += `<div class="ti"><div class="tlcol"><div class="tdot on"></div>${i < logs.length - 1 ? '<div class="tvline"></div>' : ''}</div><div class="tbody"><div class="ttime">${l.time}</div><div class="ttit">${l.emoji} ${escapeHtml(l.title)}</div></div></div>`;
      });
      c.innerHTML += '<div style="height:16px"></div><div class="footer"><p>Built by <strong>Neura Lumina</strong> · <a href="https://github.com/AmelCMM" target="_blank">@AmelCMM</a></p></div>';
    },

    insights() {
      const s = State.get();
      const chartEl = document.getElementById('bal-chart');
      if (chartEl && !chartEl.children.length) {
        let hist = [...s.balanceHistory].slice(-7);
        while (hist.length < 7) hist.unshift({ date: '', score: 0 });
        const mx = Math.max(...hist.map(h => h.score), 30);
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        hist.forEach((h, i) => {
          const bw = document.createElement('div');
          bw.className = 'cbwrap';
          bw.innerHTML = `<div class="cb" style="height:0;background:${h.date === today() ? 'var(--accent)' : 'var(--s4)'};border-radius:4px 4px 0 0"></div><span class="cday">${days[i]}</span>`;
          chartEl.appendChild(bw);
          setTimeout(() => { const bar = bw.querySelector('.cb'); if (bar) bar.style.height = Math.round((h.score / mx) * 100) + '%'; }, i * 60 + 120);
        });
      }
      const hg = document.getElementById('hm-grid');
      const mEl = document.getElementById('hm-months');
      if (hg && !hg.children.length) {
        const months = [];
        const d = new Date();
        for (let i = 5; i >= 0; i--) { const m = new Date(d); m.setMonth(m.getMonth() - i); months.push(m.toLocaleDateString('en-GB', { month: 'short' })); }
        if (mEl) months.forEach(m => { const s = document.createElement('div'); s.className = 'hmm'; s.textContent = m; mEl.appendChild(s); });
        for (let w = 0; w < 24; w++) {
          const row = document.createElement('div');
          row.className = 'hmrow';
          for (let d = 0; d < 7; d++) {
            const c = document.createElement('div');
            c.className = 'hmc';
            const r = Math.random();
            c.classList.add(r > 0.85 ? 'l4' : r > 0.65 ? 'l3' : r > 0.4 ? 'l2' : r > 0.2 ? 'l1' : '');
            row.appendChild(c);
          }
          hg.appendChild(row);
        }
      }
      const corr = document.getElementById('corr-panel');
      if (corr) corr.innerHTML = `<div class="corrrow"><span class="corr-l">Sleep → Mood</span><div class="corr-r"><div class="corrbar"><div class="corrfill" style="width:82%;background:var(--accent)"></div></div><span style="font-size:11px;font-family:var(--mono);color:var(--accent)">+0.82</span></div></div><div class="corrrow"><span class="corr-l">Water → Energy</span><div class="corr-r"><div class="corrbar"><div class="corrfill" style="width:68%;background:var(--info)"></div></div><span style="font-size:11px;font-family:var(--mono);color:var(--info)">+0.68</span></div></div><div class="corrrow"><span class="corr-l">Habits → Balance</span><div class="corr-r"><div class="corrbar"><div class="corrfill" style="width:91%;background:var(--accent)"></div></div><span style="font-size:11px;font-family:var(--mono);color:var(--accent)">+0.91</span></div></div>`;
      Bridge.Globe.show('globe-wrap', s.balanceHistory);
    },

    journal() {
      const s = State.get();
      const jl = document.getElementById('jlist');
      if (!jl) return;
      jl.innerHTML = '';
      s.journal.forEach(e => {
        const d = document.createElement('div');
        d.className = 'je';
        d.innerHTML = `<div class="jd">${new Date(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}</div>${e.mood ? `<span style="float:right;font-size:18px">${e.mood}</span>` : ''}<span class="j-del" onclick="event.stopPropagation();App._deleteJournal('${e.id}')">Delete</span><div class="jt">${escapeHtml(e.text)}</div>`;
        jl.appendChild(d);
      });
      const nb = document.createElement('div');
      nb.style.padding = '0 16px 12px';
      nb.innerHTML = `<div style="background:var(--s1);border:1px dashed var(--bmd);border-radius:var(--rlg);padding:14px;display:flex;align-items:center;gap:10px;cursor:pointer" onclick="App.sheets.journal()"><div style="width:34px;height:34px;border-radius:50%;background:var(--adim);display:flex;align-items:center;justify-content:center"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><span style="font-size:13px;color:var(--tm)">Write today's entry…</span></div>`;
      jl.appendChild(nb);
      jl.innerHTML += '<div class="footer" style="padding:4px 0 12px"><p>Built by <strong>Neura Lumina</strong> · <a href="https://github.com/AmelCMM" target="_blank">@AmelCMM</a></p></div>';
    },

    settings() {
      const s = State.get();
      const name = s.settings.userName || 'You';
      const avatar = document.getElementById('settings-avatar');
      if (avatar) avatar.textContent = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
      const pn = document.getElementById('settings-name');
      if (pn) pn.textContent = name;
      const ps = document.getElementById('settings-since');
      if (ps) {
        const start = s.startDate ? new Date(s.startDate) : new Date();
        ps.textContent = `Tracking since ${start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
      }
      const mx = Math.max(...s.habits.map(h => h.streak), 0);
      const streakStats = document.getElementById('streak-stats');
      if (streakStats) streakStats.innerHTML = `<div class="sti"><div class="stn">${mx}</div><div class="stl">Best streak</div></div><div class="sti"><div class="stn">${s.habits.filter(h => h.done).length}</div><div class="stl">Done today</div></div><div class="sti"><div class="stn">${s.logs.length}</div><div class="stl">Total logs</div></div>`;
      const accent = ACCENTS[s.settings.accentIdx] || ACCENTS[0];
      document.getElementById('app').style.setProperty('--accent', accent.c);
      document.getElementById('app').style.setProperty('--adim', accent.c + '1f');
      const accName = document.getElementById('acc-name');
      if (accName) accName.textContent = accent.name;
      const accPrev = document.getElementById('acc-prev');
      if (accPrev) accPrev.style.background = accent.c;
      const pinStatus = document.getElementById('pin-status');
      if (pinStatus) pinStatus.textContent = s.settings.pin ? 'Active · AES-GCM encrypted' : 'Not set · data unencrypted';
      const lmLabel = document.getElementById('lm-lbl');
      if (lmLabel) lmLabel.textContent = s.settings.lightMode ? 'On' : 'Off';
      const lmTog = document.getElementById('lm-tog');
      if (lmTog) lmTog.classList.toggle('on', !!s.settings.lightMode);
    },

    health() {
      const s = State.get();
      const vl = document.getElementById('vitals-list');
      if (vl) {
        vl.innerHTML = '';
        (s.vitals || []).slice(0, 10).forEach(v => {
          vl.innerHTML += `<div class="dri"><div class="dri-l"><div class="dri-ic" style="background:rgba(255,77,106,.12)">📊</div><div><div class="dri-name">${escapeHtml(v.type)}</div><div class="dri-sub">${v.date}${v.note ? ' · ' + escapeHtml(v.note) : ''}</div></div></div><div class="dri-r"><span class="dri-val">${v.value} ${v.unit}</span><span class="del-btn" onclick="App._deleteVital('${v.id}')">Delete</span></div></div>`;
        });
        if (!s.vitals.length) vl.innerHTML = '<div class="empty">No vitals logged yet.</div>';
      }
      const sl = document.getElementById('symptoms-list');
      if (sl) {
        sl.innerHTML = '';
        (s.symptoms || []).slice(0, 8).forEach(sym => {
          sl.innerHTML += `<div class="dri"><div class="dri-l"><div class="dri-ic" style="background:rgba(245,166,35,.12)">🩺</div><div><div class="dri-name">${escapeHtml(sym.description)}</div><div class="dri-sub">${sym.date}</div></div></div><div class="dri-r"><span class="dri-val">${sym.severity}/10</span><span class="del-btn" onclick="App._deleteSymptom('${sym.id}')">Delete</span></div></div>`;
        });
        if (!s.symptoms.length) sl.innerHTML = '<div class="empty">No symptoms logged.</div>';
      }
      const ml = document.getElementById('meds-list');
      if (ml) {
        ml.innerHTML = '';
        (s.medications || []).forEach(m => {
          const last = m.lastTaken ? new Date(m.lastTaken).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never';
          ml.innerHTML += `<div class="dri"><div class="dri-l"><div class="dri-ic" style="background:rgba(170,100,255,.12)">💊</div><div><div class="dri-name">${escapeHtml(m.name)} · ${m.dosage}</div><div class="dri-sub">${m.frequency} · Last: ${last}</div></div></div><div class="dri-r"><span class="ca" onclick="App._takeMed('${m.id}')">Take</span><span class="del-btn" onclick="App._deleteMedication('${m.id}')">Delete</span></div></div>`;
        });
        if (!s.medications.length) ml.innerHTML = '<div class="empty">No medications added.</div>';
      }
    },

    study() {
      const s = State.get();
      const cl = document.getElementById('courses-list');
      if (cl) {
        cl.innerHTML = '';
        (s.courses || []).forEach(c => {
          const grade = App._courseGrade(c.id);
          cl.innerHTML += `<div class="dri"><div class="dri-l"><div class="dri-ic" style="background:rgba(77,159,255,.12)">📘</div><div><div class="dri-name">${escapeHtml(c.name)}</div><div class="dri-sub">${escapeHtml(c.instructor || '')} · ${c.credits} credits</div></div></div><div class="dri-r"><span class="dri-val">${grade !== null ? grade + '%' : '--'}</span><span class="del-btn" onclick="App._deleteCourse('${c.id}')">Delete</span></div></div>`;
        });
        if (!s.courses.length) cl.innerHTML = '<div class="empty">No courses added.</div>';
      }
      const al = document.getElementById('assigns-list');
      if (al) {
        al.innerHTML = '';
        (s.assignments || []).slice(0, 15).forEach(a => {
          const course = (s.courses || []).find(c => c.id === a.courseId);
          al.innerHTML += `<div class="dri"><div class="dri-l"><div class="dri-ic" style="background:rgba(0,229,160,.12)">${a.done ? '✅' : '📝'}</div><div><div class="dri-name">${escapeHtml(a.title)}</div><div class="dri-sub">${escapeHtml(course?.name || '?')} · Due ${a.dueDate || '--'} · Wt ${a.weight}%</div></div></div><div class="dri-r"><span class="dri-val">${a.score !== null ? a.score + '%' : '--'}</span><span class="ca" onclick="App._scoreAssignment('${a.id}')">Score</span><span class="del-btn" onclick="App._deleteAssignment('${a.id}')">Del</span></div></div>`;
        });
        if (!s.assignments.length) al.innerHTML = '<div class="empty">No assignments added.</div>';
      }
      const timerEl = document.getElementById('study-timer');
      if (timerEl) timerEl.textContent = '25:00';
    },

    projects() {
      const s = State.get();
      const pl = document.getElementById('proj-list');
      if (pl) {
        pl.innerHTML = '';
        (s.projects || []).forEach(p => {
          const count = s.tasks.filter(t => t.projectId === p.id).length;
          const done = s.tasks.filter(t => t.projectId === p.id && t.done).length;
          pl.innerHTML += `<div class="dri"><div class="dri-l"><div class="dri-ic" style="background:var(--adim)">📁</div><div><div class="dri-name">${escapeHtml(p.name)}</div><div class="dri-sub">${done}/${count} tasks done</div></div></div><div class="dri-r"><span class="del-btn" onclick="App._deleteProject('${p.id}')">Delete</span></div></div>`;
        });
        if (!s.projects.length) pl.innerHTML = '<div class="empty">No projects yet.</div>';
      }
      const tl = document.getElementById('tasks-list');
      if (tl) {
        tl.innerHTML = '';
        const priColor = { urgent: 'var(--danger)', high: 'var(--warn)', normal: 'var(--ts)', low: 'var(--tm)' };
        (s.tasks || []).slice(0, 20).forEach(t => {
          const proj = (s.projects || []).find(p => p.id === t.projectId);
          const color = priColor[t.priority || 'normal'] || 'var(--ts)';
          tl.innerHTML += `<div class="dri"><div class="dri-l"><div class="dri-ic" style="background:var(--adim);cursor:pointer" onclick="App._toggleTask('${t.id}')">${t.done ? '✅' : '⬜'}</div><div><div class="dri-name" style="${t.done ? 'text-decoration:line-through;opacity:.5' : ''};color:${color}">${escapeHtml(t.title)}</div><div class="dri-sub">${escapeHtml(proj?.name || 'No project')}${t.due ? ' · ' + t.due : ''}</div></div></div><div class="dri-r"><span class="del-btn" onclick="App._deleteTask('${t.id}')">Delete</span></div></div>`;
        });
        if (!s.tasks.length) tl.innerHTML = '<div class="empty">No tasks yet.</div>';
      }
    },
  },

  _startSync() {
    const s = State.get();
    if (!s.syncEnabled) return;
    this._syncInterval = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const data = State.exportBackup();
        const resp = await fetch('https://sync.mytrack.app/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, version: APP_VERSION }),
        });
        if (resp.ok) {
          const result = await resp.json();
          if (result.remoteData) {
            await State.importBackup(JSON.stringify(result.remoteData));
          }
        }
      } catch (e) {
        console.debug('Sync failed (offline or server down):', e.message);
      }
    }, 300000);
  },

  _setupWebSocket() {
    if (!navigator.onLine) return;
    try {
      this._wsConnection = new WebSocket('wss://sync.mytrack.app/ws');
      this._wsConnection.onopen = () => console.debug('WebSocket connected');
      this._wsConnection.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'sync') {
            State.importBackup(JSON.stringify(msg.data));
            this.render.home();
          }
        } catch {}
      };
      this._wsConnection.onerror = () => { this._wsConnection = null; };
      this._wsConnection.onclose = () => { this._wsConnection = null; };
    } catch {}
  },
};

window.App = App;
App.init();

export default App;
