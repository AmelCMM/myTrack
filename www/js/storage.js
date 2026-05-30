import { STORAGE_KEY, SALT_KEY, PIN_HASH_KEY } from './constants.js';

const Storage = (() => {
  let _cryptoKey = null;
  let _pin = '';

  function isNative() {
    return typeof window !== 'undefined' && !!window.CapacitorSecureStorage;
  }

  function buf2hex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function hex2buf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return bytes.buffer;
  }

  function getSalt() {
    let hex = localStorage.getItem(SALT_KEY);
    if (!hex) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      hex = buf2hex(salt);
      localStorage.setItem(SALT_KEY, hex);
    }
    return hex2buf(hex);
  }

  async function deriveKey(pin) {
    const enc = new TextEncoder();
    const raw = enc.encode(pin);
    const salt = getSalt();
    const base = await crypto.subtle.importKey('raw', raw, { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-512' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encrypt(plaintext) {
    if (!_cryptoKey) return plaintext;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, _cryptoKey, enc.encode(plaintext)
    );
    return buf2hex(iv) + ':' + buf2hex(ct);
  }

  async function decrypt(stored) {
    if (!_cryptoKey) return stored;
    if (!stored || !stored.includes(':')) return stored;
    const [ivHex, ctHex] = stored.split(':');
    const iv = hex2buf(ivHex);
    const ct = hex2buf(ctHex);
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, _cryptoKey, ct);
      return new TextDecoder().decode(plain);
    } catch {
      throw new Error('DECRYPTION_FAILED');
    }
  }

  async function rawSet(key, value) {
    if (isNative()) {
      await window.CapacitorSecureStorage.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  }

  async function rawGet(key) {
    if (isNative()) {
      const r = await window.CapacitorSecureStorage.get({ key });
      return r?.value ?? null;
    } else {
      return localStorage.getItem(key);
    }
  }

  async function rawRemove(key) {
    if (isNative()) {
      await window.CapacitorSecureStorage.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  }

  async function init(pin) {
    _pin = pin || '';
    if (_pin) {
      try {
        _cryptoKey = await deriveKey(_pin);
      } catch (e) {
        console.error('Key derivation failed:', e);
        _cryptoKey = null;
        throw e;
      }
    } else {
      _cryptoKey = null;
    }
  }

  async function save(key, value) {
    try {
      const json = JSON.stringify(value);
      const encrypted = await encrypt(json);
      await rawSet(key, encrypted);
      return true;
    } catch (e) {
      console.error('Storage save error:', e);
      return false;
    }
  }

  async function load(key, defaultValue = null) {
    try {
      const raw = await rawGet(key);
      if (raw === null || raw === undefined) return defaultValue;
      const decrypted = await decrypt(raw);
      return JSON.parse(decrypted);
    } catch (e) {
      if (e.message === 'DECRYPTION_FAILED') throw e;
      console.error('Storage load error:', e);
      return defaultValue;
    }
  }

  async function remove(key) {
    await rawRemove(key);
  }

  async function clear() {
    if (isNative()) {
      await window.CapacitorSecureStorage.clear();
    } else {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('mt_') || k.startsWith('mytrack_'))) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  }

  function exportJSON(stateObj) {
    return JSON.stringify(stateObj, null, 2);
  }

  function importJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') throw new Error('Invalid backup format');
    return data;
  }

  async function getStorageStats() {
    let totalKeys = 0;
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('mt_') || k.startsWith('mytrack_') || k.startsWith('__mt'))) {
        totalKeys++;
        totalSize += localStorage.getItem(k).length * 2;
      }
    }
    return { keys: totalKeys, sizeBytes: totalSize, encrypted: !!_cryptoKey };
  }

  async function migrate(oldKey, newKey) {
    const data = await load(oldKey, null);
    if (data !== null) {
      await save(newKey, data);
      await remove(oldKey);
      return true;
    }
    return false;
  }

  async function backupToCloud(provider = 'google') {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { success: false, error: 'No data to backup' };
    const blob = new Blob([data], { type: 'application/json' });
    const ts = new Date().toISOString().slice(0, 10);
    const filename = `mytrack_backup_${ts}.json`;
    if (navigator.share && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
      await navigator.share({ files: [new File([blob], filename, { type: 'application/json' })], title: 'myTrack Backup' });
      return { success: true, method: 'share' };
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return { success: true, method: 'download' };
  }

  async function restoreFromCloud() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return resolve({ success: false, error: 'No file selected' });
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          resolve({ success: true, data });
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      };
      input.click();
    });
  }

  async function compressAndSave(key, value) {
    const json = JSON.stringify(value);
    const compressed = await compress(json);
    await rawSet(key + '_compressed', compressed);
  }

  async function compress(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(data);
    writer.close();
    const reader = cs.readable.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return btoa(String.fromCharCode(...result));
  }

  async function decompressAndLoad(key, defaultValue = null) {
    try {
      const raw = await rawGet(key + '_compressed');
      if (!raw) return defaultValue;
      const decoded = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(decoded);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return JSON.parse(new TextDecoder().decode(result));
    } catch {
      return defaultValue;
    }
  }

  async function isStoredDataEncrypted() {
    const raw = await rawGet(STORAGE_KEY);
    if (!raw) return false;
    try { JSON.parse(raw); return false; } catch { return true; }
  }

  async function setPinHash(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hex = buf2hex(hash);
    await rawSet(PIN_HASH_KEY, hex);
  }

  async function checkPinHash(pin) {
    const stored = await rawGet(PIN_HASH_KEY);
    if (!stored) return false;
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hex = buf2hex(hash);
    return hex === stored;
  }

  async function clearPinHash() {
    await rawRemove(PIN_HASH_KEY);
  }

  return {
    init, save, load, remove, clear,
    exportJSON, importJSON,
    getStorageStats, migrate,
    backupToCloud, restoreFromCloud,
    compressAndSave, decompressAndLoad,
    isNative: () => isNative(),
    isEncrypted: () => !!_cryptoKey,
    getPin: () => _pin,
    isStoredDataEncrypted, setPinHash, checkPinHash, clearPinHash,
  };
})();

export default Storage;
