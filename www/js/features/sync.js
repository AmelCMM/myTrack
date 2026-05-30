import State from '../state.js';
import { uid, today, dateStr, daysAgo, safeJSONparse } from '../helpers.js';
import { STORAGE_KEY, APP_NAME } from '../constants.js';
import Storage from '../storage.js';

let _autoBackupInterval = null;
let _syncProvider = null;
let _syncListeners = [];

function notifyListeners(event, data) {
  _syncListeners.forEach(fn => { try { fn(event, data); } catch (e) { console.error('Sync listener error:', e); } });
}

export function onSyncEvent(callback) {
  _syncListeners.push(callback);
  return () => {
    const idx = _syncListeners.indexOf(callback);
    if (idx >= 0) _syncListeners.splice(idx, 1);
  };
}

export function enableSync(provider) {
  const s = State.get();
  if (s.syncEnabled) return { success: false, error: 'Sync already enabled' };
  const validProviders = ['google', 'icloud', 'custom'];
  if (provider && !validProviders.includes(provider)) {
    return { success: false, error: `Unknown provider: ${provider}` };
  }
  _syncProvider = provider || 'google';
  s.syncEnabled = true;
  s.syncProvider = _syncProvider;
  s.lastSync = null;
  s.syncConfig = {
    autoBackup: false,
    autoBackupInterval: 24,
    lastAutoBackup: null,
    provider: _syncProvider,
  };
  State.save();
  State.notify();
  State.addLog(`Cloud sync enabled (${_syncProvider})`, '☁️', 'settings');
  notifyListeners('sync-enabled', { provider: _syncProvider });
  return { success: true, provider: _syncProvider };
}

export function disableSync() {
  const s = State.get();
  if (!s.syncEnabled) return { success: false, error: 'Sync not enabled' };
  s.syncEnabled = false;
  s.syncProvider = null;
  s.syncConfig = null;
  if (_autoBackupInterval) {
    clearInterval(_autoBackupInterval);
    _autoBackupInterval = null;
  }
  _syncProvider = null;
  State.save();
  State.notify();
  State.addLog('Cloud sync disabled', '☁️', 'settings');
  notifyListeners('sync-disabled', {});
  return { success: true };
}

export async function backupToCloud() {
  const s = State.get();
  if (!s.syncEnabled) return { success: false, error: 'Sync not enabled' };
  try {
    const data = Storage.exportJSON(s);
    const blob = new Blob([data], { type: 'application/json' });
    const filename = `mytrack_backup_${today()}.json`;
    if (navigator.share && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
      await navigator.share({
        files: [new File([blob], filename, { type: 'application/json' })],
        title: `${APP_NAME} Backup`,
      });
    } else {
      const formData = new FormData();
      formData.append('backup', blob, filename);
      formData.append('provider', _syncProvider || 'local');
      formData.append('timestamp', new Date().toISOString());
      try {
        const response = await fetch('/api/backup', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Backup API returned ' + response.status);
      } catch (e) {
        if (e.message.includes('Backup API') || e.message.includes('Failed to fetch')) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
        } else {
          throw e;
        }
      }
    }
    const backupInfo = {
      date: today(),
      timestamp: new Date().toISOString(),
      size: data.length,
      version: '2.0.0',
      provider: _syncProvider,
    };
    s.lastBackup = backupInfo;
    s.lastSync = new Date().toISOString();
    if (s.syncConfig) s.syncConfig.lastAutoBackup = new Date().toISOString();
    State.save();
    State.notify();
    State.addLog('Cloud backup completed', '☁️', 'backup');
    notifyListeners('backup-completed', backupInfo);
    return { success: true, backup: backupInfo };
  } catch (e) {
    console.error('Backup failed:', e);
    return { success: false, error: e.message };
  }
}

export async function restoreFromCloud() {
  const s = State.get();
  if (!s.syncEnabled) return { success: false, error: 'Sync not enabled' };
  try {
    if (navigator.share && window.showOpenFilePicker) {
      const [handle] = await window.showOpenFilePicker({ types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }] });
      const file = await handle.getFile();
      const text = await file.text();
      const data = safeJSONparse(text);
      if (!data) return { success: false, error: 'Invalid backup file' };
      const valid = validateBackup(text);
      if (!valid.valid) return { success: false, error: valid.error };
      await State.importBackup(text);
      s.lastSync = new Date().toISOString();
      State.save();
      State.notify();
      State.addLog('Cloud restore completed', '☁️', 'backup');
      notifyListeners('restore-completed', { date: today() });
      return { success: true, message: 'Data restored from backup' };
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    return new Promise(resolve => {
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return resolve({ success: false, error: 'No file selected' });
        try {
          const text = await file.text();
          const valid = validateBackup(text);
          if (!valid.valid) return resolve({ success: false, error: valid.error });
          await State.importBackup(text);
          s.lastSync = new Date().toISOString();
          State.save();
          State.notify();
          State.addLog('Restore completed from file', '☁️', 'backup');
          notifyListeners('restore-completed', { date: today() });
          resolve({ success: true, message: 'Data restored from backup' });
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };
      input.click();
    });
  } catch (e) {
    console.error('Restore failed:', e);
    return { success: false, error: e.message };
  }
}

export function backupToFile() {
  const s = State.get();
  const json = Storage.exportJSON(s);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = `mytrack_backup_${today()}.json`;
  const backupInfo = {
    date: today(),
    timestamp: new Date().toISOString(),
    size: json.length,
    version: '2.0.0',
    filename,
  };
  if (navigator.share && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
    navigator.share({
      files: [new File([blob], filename, { type: 'application/json' })],
      title: `${APP_NAME} Backup`,
    }).catch(() => {});
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  s.lastBackup = backupInfo;
  State.save();
  State.notify();
  State.addLog('File backup created', '💾', 'backup');
  notifyListeners('backup-file', backupInfo);
  return { success: true, backup: backupInfo };
}

export function restoreFromFile() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return resolve({ success: false, error: 'No file selected' });
      try {
        const text = await file.text();
        const valid = validateBackup(text);
        if (!valid.valid) return resolve({ success: false, error: valid.error });
        await State.importBackup(text);
        State.addLog('Data restored from file', '💾', 'backup');
        notifyListeners('restore-file', { date: today(), filename: file.name });
        resolve({ success: true, message: 'Data restored successfully', filename: file.name });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    };
    input.click();
  });
}

export function getLastBackupDate() {
  const s = State.get();
  if (!s.lastBackup) return null;
  return s.lastBackup;
}

export function getSyncStatus() {
  const s = State.get();
  return {
    enabled: !!s.syncEnabled,
    provider: s.syncProvider || null,
    lastSync: s.lastSync || null,
    lastBackup: s.lastBackup || null,
    autoBackup: s.syncConfig?.autoBackup || false,
    autoBackupInterval: s.syncConfig?.autoBackupInterval || null,
    lastAutoBackup: s.syncConfig?.lastAutoBackup || null,
  };
}

export function autoBackup(intervalHours) {
  const s = State.get();
  if (!s.syncEnabled) return { success: false, error: 'Sync not enabled' };
  if (_autoBackupInterval) clearInterval(_autoBackupInterval);
  const interval = intervalHours || 24;
  if (!s.syncConfig) s.syncConfig = {};
  s.syncConfig.autoBackup = true;
  s.syncConfig.autoBackupInterval = interval;
  State.save();
  State.notify();
  _autoBackupInterval = setInterval(() => {
    backupToCloud().catch(console.error);
  }, interval * 3600000);
  State.addLog(`Auto-backup set to every ${interval}h`, '🔄', 'backup');
  notifyListeners('auto-backup-started', { interval });
  return { success: true, interval };
}

export function disableAutoBackup() {
  if (_autoBackupInterval) {
    clearInterval(_autoBackupInterval);
    _autoBackupInterval = null;
  }
  const s = State.get();
  if (s.syncConfig) {
    s.syncConfig.autoBackup = false;
    State.save();
    State.notify();
  }
  State.addLog('Auto-backup disabled', '🔄', 'backup');
  notifyListeners('auto-backup-stopped', {});
  return { success: true };
}

export function calculateBackupSize() {
  const s = State.get();
  try {
    const json = Storage.exportJSON(s);
    const bytes = new TextEncoder().encode(json).length;
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return {
      bytes,
      kb: Math.round(kb * 100) / 100,
      mb: Math.round(mb * 100) / 100,
      readable: mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(1)} KB`,
    };
  } catch (e) {
    return { bytes: 0, kb: 0, mb: 0, readable: 'Unknown' };
  }
}

export function generateBackupReport() {
  const s = State.get();
  const domains = {
    settings: ['settings', 'tags', 'customFields'],
    habits: ['habits', 'water', 'mood', 'exercise', 'sleep', 'nutrition', 'steps'],
    journal: ['journal', 'gratitudes'],
    health: ['vitals', 'symptoms', 'medications', 'wellbeingChecks'],
    study: ['courses', 'assignments', 'studySessions'],
    projects: ['projects', 'tasks'],
    finance: ['accounts', 'transactions', 'budgets'],
    goals: ['goals'],
    challenges: ['challenges'],
    achievements: ['achievements'],
    focus: ['focusHistory'],
    reading: ['readingList'],
    logs: ['logs', 'balanceHistory'],
    ble: ['bleReadings'],
    location: ['locationLogs'],
    reminders: ['reminders'],
  };
  const contents = {};
  let totalEntries = 0;
  Object.entries(domains).forEach(([domain, keys]) => {
    const domainData = {};
    keys.forEach(key => {
      const val = s[key];
      if (val !== undefined) {
        const count = Array.isArray(val) ? val.length : 1;
        domainData[key] = { present: true, count };
        totalEntries += count;
      }
    });
    contents[domain] = domainData;
  });
  const size = calculateBackupSize();
  return {
    generatedAt: new Date().toISOString(),
    appVersion: '2.0.0',
    totalEntries,
    backupSize: size,
    contents,
    domains: Object.keys(domains),
    hasEncryption: Storage.isEncrypted(),
    lastBackup: s.lastBackup,
    includedDomains: Object.keys(contents).filter(d => Object.values(contents[d]).some(v => v.present)),
  };
}

export function validateBackup(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') return { valid: false, error: 'Backup must be a JSON object' };
    const requiredTopKeys = ['settings', 'habits', 'logs'];
    for (const key of requiredTopKeys) {
      if (!(key in data)) return { valid: false, error: `Missing required key: ${key}` };
    }
    if (!Array.isArray(data.habits)) return { valid: false, error: 'habits must be an array' };
    if (!Array.isArray(data.logs)) return { valid: false, error: 'logs must be an array' };
    if (data.journal && !Array.isArray(data.journal)) return { valid: false, error: 'journal must be an array' };
    if (data.transactions && !Array.isArray(data.transactions)) return { valid: false, error: 'transactions must be an array' };
    if (data.goals && !Array.isArray(data.goals)) return { valid: false, error: 'goals must be an array' };
    if (data.settings && typeof data.settings !== 'object') return { valid: false, error: 'settings must be an object' };
    const version = data.version || 'unknown';
    return { valid: true, version, entries: data.logs.length, date: today(), data };
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${e.message}` };
  }
}

export function mergeWithExisting(backupData, strategy) {
  const s = State.get();
  const mergeStrategy = strategy || 'overwrite';
  const mergeableKeys = ['habits', 'journal', 'logs', 'transactions', 'vitals', 'symptoms', 'medications',
    'courses', 'assignments', 'tasks', 'projects', 'goals', 'challenges', 'gratitudes',
    'exercise', 'focusHistory', 'readingList', 'balanceHistory', 'bleReadings',
    'reminders', 'accounts', 'budgets', 'studySessions', 'wellbeingChecks', 'locationLogs'];
  mergeableKeys.forEach(key => {
    if (!backupData[key] || !Array.isArray(backupData[key])) return;
    if (!s[key]) s[key] = [];
    if (mergeStrategy === 'overwrite') {
      s[key] = backupData[key];
    } else if (mergeStrategy === 'append') {
      const existingIds = new Set((s[key] || []).map(item => item.id));
      const newItems = backupData[key].filter(item => !existingIds.has(item.id));
      s[key].push(...newItems);
    } else if (mergeStrategy === 'skip') {
      const existingIds = new Set((s[key] || []).map(item => item.id));
      backupData[key].forEach(item => {
        if (!existingIds.has(item.id)) s[key].push(item);
      });
    }
  });
  if (backupData.settings && mergeStrategy !== 'skip') {
    Object.assign(s.settings, backupData.settings);
  }
  if (backupData.water) s.water = { ...s.water, ...backupData.water };
  if (backupData.mood) s.mood = { ...s.mood, ...backupData.mood };
  if (backupData.sleep) s.sleep = { ...s.sleep, ...backupData.sleep };
  if (backupData.nutrition) s.nutrition = { ...s.nutrition, ...backupData.nutrition };
  if (backupData.steps) s.steps = { ...s.steps, ...backupData.steps };
  if (backupData.tags) s.tags = [...new Set([...s.tags, ...backupData.tags])];
  State.save();
  State.notify();
  State.addLog(`Data merged (${mergeStrategy})`, '🔄', 'backup');
  return { success: true, strategy: mergeStrategy };
}

export function getBackupHistory() {
  const s = State.get();
  const history = [];
  if (s.lastBackup) history.push(s.lastBackup);
  const backupLogs = s.logs.filter(l => l.type === 'backup');
  backupLogs.forEach(l => {
    history.push({
      date: l.date,
      timestamp: l.timestamp,
      title: l.title,
      meta: l.meta || {},
    });
  });
  return history.sort((a, b) => {
    const ta = a.timestamp || a.date;
    const tb = b.timestamp || b.date;
    return tb.localeCompare(ta);
  });
}

export function scheduleBackup(cronExpression) {
  const s = State.get();
  if (!s.syncEnabled) return { success: false, error: 'Sync not enabled' };
  if (_autoBackupInterval) clearInterval(_autoBackupInterval);
  let intervalMs = 86400000;
  if (cronExpression) {
    const match = cronExpression.match(/^\d+\s+(h|hours?|d|days?)$/i);
    if (match) {
      const val = parseInt(match[1]);
      if (match[2].toLowerCase().startsWith('h')) intervalMs = val * 3600000;
      else intervalMs = val * 86400000;
    }
  }
  _autoBackupInterval = setInterval(() => {
    backupToCloud().catch(console.error);
  }, intervalMs);
  s.syncConfig = s.syncConfig || {};
  s.syncConfig.autoBackup = true;
  s.syncConfig.autoBackupInterval = Math.round(intervalMs / 3600000);
  State.save();
  State.notify();
  return { success: true, interval: intervalMs };
}

const Sync = {
  enableSync,
  disableSync,
  backupToCloud,
  restoreFromCloud,
  backupToFile,
  restoreFromFile,
  getLastBackupDate,
  getSyncStatus,
  autoBackup,
  disableAutoBackup,
  calculateBackupSize,
  generateBackupReport,
  validateBackup,
  mergeWithExisting,
  getBackupHistory,
  scheduleBackup,
  onSyncEvent,
};

export default Sync;
