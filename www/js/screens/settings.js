import State from '../state.js';
import Storage from '../storage.js';
import Themes from '../themes.js';
import Bridge from '../bridge.js';
import { ACCENTS, APP_VERSION, APP_GITHUB, APP_AUTHOR, APP_NAME } from '../constants.js';
import { today, dateStr, escapeHtml, truncate, hapticLight, hapticSuccess, showToast, confirmDialog, promptDialog, formatTime } from '../helpers.js';

let _container = null;
let _bleConnected = false;
let _bleDeviceName = '';
let _bleBpm = '--';
let _bleSub = null;

export function renderSettings(containerId = 'app') {
  _container = document.getElementById(containerId);
  if (!_container) return;
  State.dayReset();
  _container.innerHTML = '';
  _container.appendChild(createHTML());
  attachListeners();
}

function createHTML() {
  const s = State.get();
  const settings = s.settings;
  const currentAccent = ACCENTS[settings.accentIdx] || ACCENTS[0];
  const stats = State.getStats();

  const sec = (...children) => children.join('');
  const section = (title, id, content) => `
    <div class="sc" data-section="${id}">
      <div class="sct">${title}</div>
      ${content}
    </div>`;

  const profile = section('Profile', 'profile', `
    <div class="s-row" style="padding:16px;gap:16px;align-items:center">
      <div class="av" style="width:56px;height:56px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#000;flex-shrink:0">${getInitials(s.settings.profileName || 'User')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:17px;font-weight:600;color:var(--tp)">${escapeHtml(s.settings.profileName || 'User')}</div>
        <div style="font-size:12px;color:var(--ts);margin-top:2px">Tracking since ${s.settings.createdDate ? dateStr(s.settings.createdDate) : today()}</div>
      </div>
      <button class="sm-btn" data-edit-profile style="flex-shrink:0">Edit</button>
    </div>`);

  const statsRow = section('Stats', 'stats', `
    <div class="g2" style="padding:12px">
      <div class="st-box"><span class="st-v">${stats.bestStreak}</span><span class="st-l">Best Streak</span></div>
      <div class="st-box"><span class="st-v">${stats.habitsDone}</span><span class="st-l">Done Today</span></div>
      <div class="st-box"><span class="st-v">${stats.totalLogs}</span><span class="st-l">Total Logs</span></div>
      <div class="st-box"><span class="st-v">${stats.journalCount}</span><span class="st-l">Journal</span></div>
      <div class="st-box"><span class="st-v">${stats.level}</span><span class="st-l">Level</span></div>
      <div class="st-box"><span class="st-v">${stats.totalXP}</span><span class="st-l">XP</span></div>
    </div>`);

  const accentRow = `
    <div class="s-row" data-accent-cycle>
      <span>Accent Colour</span>
      <div style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${currentAccent.c};border:1.5px solid var(--border)"></span>
        <span style="font-size:13px;color:var(--ts)">${currentAccent.name}</span>
        <span style="font-size:11px;color:var(--tm)">Tap to cycle</span>
      </div>
    </div>`;

  const lightRow = `
    <div class="s-row">
      <span>Light Mode</span>
      <label class="tg">
        <input type="checkbox" ${settings.lightMode ? 'checked' : ''} data-light-toggle>
        <span class="tg-sl"></span>
      </label>
    </div>`;

  const variants = Themes.getVariants ? Themes.getVariants() : ['default', 'amoled', 'sepia', 'midnight', 'forest', 'ocean'];
  const currentVariant = settings.themeVariant || 'default';
  const variantBtns = variants.map(v => `
    <button class="chip ${v === currentVariant ? 'chip-a' : ''}" data-theme-variant="${v}">${v}</button>`).join('');

  const themeRow = `
    <div class="s-row" style="flex-wrap:wrap;gap:6px">
      <span style="width:100%;margin-bottom:2px">Theme Variant</span>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${variantBtns}</div>
    </div>`;

  const fontRow = `
    <div class="s-row">
      <span>Font Size</span>
      <div style="display:flex;align-items:center;gap:10px;flex:1;max-width:200px">
        <span style="font-size:12px;color:var(--ts)">A</span>
        <input type="range" min="0.8" max="1.2" step="0.05" value="${settings.fontScale || 1}" data-font-slider style="flex:1">
        <span style="font-size:16px;color:var(--ts)">A</span>
      </div>
    </div>`;

  const appearance = section('Appearance', 'appearance', `${accentRow}${lightRow}${themeRow}${fontRow}`);

  const bleStatus = _bleConnected
    ? `<span style="color:var(--accent);font-size:12px">Connected</span>`
    : `<span style="color:var(--ts);font-size:12px">Disconnected</span>`;

  const bleRow = `
    <div class="s-row">
      <span>Bluetooth LE</span>
      <button class="sm-btn ${_bleConnected ? 'sm-btn-d' : ''}" data-ble-toggle>${_bleConnected ? 'Disconnect' : 'Connect'}</button>
    </div>
    <div class="s-row" style="border-top:none;padding-top:0">
      <span style="font-size:12px;color:var(--ts)">Device</span>
      <span style="font-size:13px;color:var(--tp)">${_bleDeviceName || 'Not connected'}</span>
    </div>
    <div class="s-row" style="border-top:none;padding-top:0">
      <span style="font-size:12px;color:var(--ts)">Status</span>
      ${bleStatus}
    </div>
    <div class="s-row" style="border-top:none;padding-top:0">
      <span style="font-size:12px;color:var(--ts)">Heart Rate</span>
      <span style="font-size:20px;font-weight:700;color:var(--danger)">${_bleBpm} <span style="font-size:12px;font-weight:400;color:var(--ts)">bpm</span></span>
    </div>`;

  const bleSection = section('Bluetooth Sensors', 'ble', bleRow);

  const goalsLink = `
    <div class="s-row" data-nav="goals" style="cursor:pointer">
      <span>Goals</span>
      <span style="font-size:12px;color:var(--ts)">${s.goals.length} active →</span>
    </div>`;
  const challengesLink = `
    <div class="s-row" data-nav="challenges" style="cursor:pointer">
      <span>Challenges</span>
      <span style="font-size:12px;color:var(--ts)">${s.challenges.filter(c => !c.completed).length} active →</span>
    </div>`;
  const achRow = `
    <div class="s-row" data-nav="achievements" style="cursor:pointer">
      <span>Achievements</span>
      <span style="font-size:12px;color:var(--ts)">${stats.achievementsUnlocked} unlocked →</span>
    </div>`;
  const readRow = `
    <div class="s-row" data-nav="reading" style="cursor:pointer">
      <span>Reading List</span>
      <span style="font-size:12px;color:var(--ts)">${s.readingList.length} items →</span>
    </div>`;

  const features = section('Features', 'features', `${goalsLink}${challengesLink}${achRow}${readRow}`);

  const totalFocusMin = s.focusHistory.reduce((sum, f) => sum + f.duration, 0);
  const pomoSessions = s.focusHistory.filter(f => f.type === 'pomodoro').length;
  const focusRow = `
    <div class="s-row">
      <span>Total Focus Time</span>
      <span style="font-size:13px;color:var(--tp)">${formatTime(totalFocusMin)}</span>
    </div>
    <div class="s-row" style="border-top:none;padding-top:0">
      <span>Pomodoro Sessions</span>
      <span style="font-size:13px;color:var(--tp)">${pomoSessions}</span>
    </div>`;

  const focusSection = section('Focus & Productivity', 'focus', focusRow);

  const pinStatus = settings.pin ? 'Change PIN' : 'Set PIN';
  const encRow = `
    <div class="s-row" style="cursor:pointer" data-set-pin>
      <span>Encryption PIN</span>
      <span style="font-size:12px;color:${settings.pin ? 'var(--accent)' : 'var(--ts)'}">${pinStatus} →</span>
    </div>
    <div class="s-row" style="cursor:pointer" data-export-backup>
      <span>Export Backup</span>
      <span style="font-size:12px;color:var(--ts)">Download JSON</span>
    </div>
    <div class="s-row" style="cursor:pointer" data-import-backup>
      <span>Import Backup</span>
      <span style="font-size:12px;color:var(--ts)">Restore from file</span>
    </div>
    <div class="s-row" style="cursor:pointer;opacity:0.5" data-cloud-backup>
      <span>Cloud Backup</span>
      <span style="font-size:12px;color:var(--ts)">Coming soon</span>
    </div>
    <div class="s-row" style="cursor:pointer" data-clear-data>
      <span style="color:var(--danger)">Clear All Data</span>
      <span style="font-size:12px;color:var(--ts)">Destructive</span>
    </div>`;

  const privacySection = section('Privacy & Data', 'privacy', encRow);

  const storagePromise = Storage.getStorageStats();
  const storageInfo = { keys: '...', size: '...', encrypted: false };
  storagePromise.then(st => {
    const el = _container?.querySelector('[data-storage-keys]');
    if (el) el.textContent = st.keys;
    const sizeEl = _container?.querySelector('[data-storage-size]');
    if (sizeEl) sizeEl.textContent = formatBytes(st.sizeBytes);
    const encEl = _container?.querySelector('[data-storage-enc]');
    if (encEl) encEl.textContent = st.encrypted ? 'Active' : 'Off';
  }).catch(() => {});

  const aboutRow = `
    <div class="s-row">
      <span>App Version</span>
      <span style="font-size:13px;color:var(--ts)">${APP_NAME} v${APP_VERSION}</span>
    </div>
    <div class="s-row" style="cursor:pointer" data-github-link>
      <span>GitHub</span>
      <span style="font-size:12px;color:var(--ts)">${APP_GITHUB}</span>
    </div>
    <div class="s-row">
      <span>Credits</span>
      <span style="font-size:12px;color:var(--ts)">${APP_AUTHOR}</span>
    </div>
    <div class="s-row">
      <span>Storage Keys</span>
      <span style="font-size:13px;color:var(--tp)" data-storage-keys>${storageInfo.keys}</span>
    </div>
    <div class="s-row" style="border-top:none;padding-top:0">
      <span>Storage Size</span>
      <span style="font-size:13px;color:var(--tp)" data-storage-size>${storageInfo.size}</span>
    </div>
    <div class="s-row" style="border-top:none;padding-top:0">
      <span>Encryption</span>
      <span style="font-size:13px;color:var(--tp)" data-storage-enc>${storageInfo.encrypted ? 'Active' : 'Off'}</span>
    </div>`;

  const aboutSection = section('About', 'about', aboutRow);

  return createFragment(`
    <div class="scrl">
      ${profile}${statsRow}${appearance}${bleSection}${features}${focusSection}${privacySection}${aboutSection}
      <div style="height:80px"></div>
    </div>`);
}

function attachListeners() {
  const c = _container;

  c.querySelector('[data-edit-profile]')?.addEventListener('click', async () => {
    const s = State.get();
    const name = await promptDialog('Enter your name', s.settings.profileName || '');
    if (name !== null) {
      State.updateSettings({ profileName: name.trim() });
      hapticSuccess();
      renderSettings();
    }
  });

  c.querySelector('[data-accent-cycle]')?.addEventListener('click', () => {
    const s = State.get();
    const next = (s.settings.accentIdx + 1) % ACCENTS.length;
    State.updateSettings({ accentIdx: next });
    Themes.setAccent(next);
    renderSettings();
  });

  c.querySelector('[data-light-toggle]')?.addEventListener('change', e => {
    State.updateSettings({ lightMode: e.target.checked });
    Themes.setLightMode(e.target.checked);
  });

  c.querySelectorAll('[data-theme-variant]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.themeVariant;
      State.updateSettings({ themeVariant: v });
      Themes.setThemeVariant(v);
      renderSettings();
    });
  });

  c.querySelector('[data-font-slider]')?.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    State.updateSettings({ fontScale: val });
    Themes.setFontSize(val);
  });

  c.querySelector('[data-ble-toggle]')?.addEventListener('click', async () => {
    if (_bleConnected) {
      await Bridge.Bluetooth.disconnect();
      if (_bleSub) { _bleSub(); _bleSub = null; }
      _bleConnected = false;
      _bleDeviceName = '';
      _bleBpm = '--';
      showToast('Bluetooth disconnected');
      renderSettings();
      return;
    }
    try {
      const device = await Bridge.Bluetooth.requestDevice();
      _bleConnected = true;
      _bleDeviceName = device.name || 'Unknown Device';
      hapticSuccess();
      showToast(`Connected to ${_bleDeviceName}`);
      Bridge.Bluetooth.subscribeHeartRate(bpm => {
        _bleBpm = bpm;
        const bpmEl = _container?.querySelector('[data-heart-rate]');
        if (bpmEl) bpmEl.textContent = bpm;
      });
      renderSettings();
    } catch (err) {
      showToast('Bluetooth connection failed');
      _bleConnected = false;
    }
  });

  c.querySelector('[data-nav="goals"]')?.addEventListener('click', () => navigateTo('goals'));
  c.querySelector('[data-nav="challenges"]')?.addEventListener('click', () => navigateTo('challenges'));
  c.querySelector('[data-nav="achievements"]')?.addEventListener('click', () => navigateTo('achievements'));
  c.querySelector('[data-nav="reading"]')?.addEventListener('click', () => navigateTo('reading'));

  c.querySelector('[data-set-pin]')?.addEventListener('click', async () => {
    const s = State.get();
    const msg = s.settings.pin ? 'Enter new 4-6 digit PIN' : 'Set a 4-6 digit PIN for encryption';
    const pin = await promptDialog(msg, '');
    if (pin && pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin)) {
      State.updateSettings({ pin });
      try {
        await Storage.init(pin);
        showToast('PIN set successfully');
        hapticSuccess();
        renderSettings();
      } catch (e) {
        showToast('Failed to set encryption key');
      }
    } else if (pin !== null) {
      showToast('PIN must be 4-6 digits');
    }
  });

  c.querySelector('[data-export-backup]')?.addEventListener('click', async () => {
    try {
      const backup = State.exportBackup();
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mytrack_backup_${today()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup exported');
      hapticSuccess();
    } catch (e) {
      showToast('Export failed');
    }
  });

  c.querySelector('[data-import-backup]')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog('Import backup? This will replace all current data.');
    if (!confirmed) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        await State.importBackup(text);
        await State.save();
        State.notify();
        showToast('Backup restored successfully');
        hapticSuccess();
        renderSettings();
      } catch (err) {
        showToast('Invalid backup file');
      }
    };
    input.click();
  });

  c.querySelector('[data-cloud-backup]')?.addEventListener('click', () => {
    showToast('Cloud backup coming in a future update');
  });

  c.querySelector('[data-clear-data]')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog('Are you sure? This will delete ALL your data permanently!');
    if (!confirmed) return;
    const again = await confirmDialog('This is irreversible. Type "yes" to confirm.');
    if (!again) return;
    await State.hardReset();
    showToast('All data cleared');
    renderSettings();
  });

  c.querySelector('[data-github-link]')?.addEventListener('click', () => {
    window.open(APP_GITHUB, '_blank');
  });

  updateStorageStats();
}

function updateStorageStats() {
  Storage.getStorageStats().then(st => {
    const c = _container;
    if (!c) return;
    const keysEl = c.querySelector('[data-storage-keys]');
    const sizeEl = c.querySelector('[data-storage-size]');
    const encEl = c.querySelector('[data-storage-enc]');
    if (keysEl) keysEl.textContent = st.keys;
    if (sizeEl) sizeEl.textContent = formatBytes(st.sizeBytes);
    if (encEl) encEl.textContent = st.encrypted ? 'Active' : 'Off';
  }).catch(() => {});
}

function getInitials(name) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function createFragment(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content;
}

function navigateTo(screen) {
  const event = new CustomEvent('navigate', { detail: { screen }, bubbles: true });
  _container?.dispatchEvent(event);
}
