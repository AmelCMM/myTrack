export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function timeStr() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dateStr(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function dateStrShort(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  });
}

export function isToday(date) {
  return date === today();
}

export function isYesterday(date) {
  return date === yesterday();
}

export function sameDay(d1, d2) {
  return d1 === d2;
}

export function daysBetween(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return Math.round((a - b) / 86400000);
}

export function weekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function monthStart(date) {
  return date.slice(0, 7) + '-01';
}

export function monthName(date) {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function pluralize(n, singular, plural) {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural || singular + 's'}`;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms = 200) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function truncate(str, len = 50) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

export function sumBy(arr, fn) {
  return arr.reduce((s, item) => s + (fn(item) || 0), 0);
}

export function avgBy(arr, fn) {
  if (!arr.length) return 0;
  return sumBy(arr, fn) / arr.length;
}

export function sortBy(arr, fn, desc = false) {
  return [...arr].sort((a, b) => {
    const va = fn(a), vb = fn(b);
    return desc ? vb - va : va - vb;
  });
}

export function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    const k = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function weekNumber(date) {
  const d = new Date(date + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export function calculateStreak(logs, dateKey = 'date') {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 1000; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    if (logs.some(l => l[dateKey] === dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function mergeDeep(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function colorWithOpacity(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export function getMetaThemeColor(accent, lightMode) {
  return lightMode ? '#fbfbf9' : '#000000';
}

export function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function timeSince(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

export function toCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const lines = data.map(row => headers.map(h => String(row[h] ?? '').replace(/,/g, ' ')).join(','));
  return [headers.join(','), ...lines].join('\n');
}

export function safeJSONparse(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}

export function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function hapticLight() {
  if (window.CapacitorHaptics) {
    window.CapacitorHaptics.impact({ style: 'LIGHT' });
  } else if (navigator.vibrate) {
    navigator.vibrate(8);
  }
}

export function hapticSuccess() {
  if (window.CapacitorHaptics) {
    window.CapacitorHaptics.notification({ type: 'SUCCESS' });
  } else if (navigator.vibrate) {
    navigator.vibrate([6, 50, 12]);
  }
}

export function hapticWarning() {
  if (window.CapacitorHaptics) {
    window.CapacitorHaptics.notification({ type: 'WARNING' });
  } else if (navigator.vibrate) {
    navigator.vibrate([12, 30, 12, 30, 18]);
  }
}

export function showToast(message, duration = 2500) {
  const existing = document.querySelector('.toast-el');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast-el';
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
    background: 'var(--s2)', color: 'var(--tp)', padding: '10px 20px',
    borderRadius: 'var(--rpill)', fontSize: '13px', zIndex: '9999',
    border: '0.5px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,.5)',
    opacity: '0', transition: 'opacity .25s',
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export function confirmDialog(msg) {
  return new Promise(resolve => {
    const sov = document.createElement('div');
    sov.className = 'sov';
    sov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s';
    sov.innerHTML = `<div style="background:var(--s1);border-radius:var(--rlg);padding:24px;max-width:300px;text-align:center;border:.5px solid var(--border)">
      <p style="font-size:14px;color:var(--tp);margin-bottom:16px;line-height:1.5">${msg}</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="confirm-yes" style="background:var(--accent);color:#000;border:none;padding:9px 24px;border-radius:var(--rpill);font-weight:600;font-size:13px;cursor:pointer">Yes</button>
        <button id="confirm-no" style="background:var(--s3);color:var(--tp);border:none;padding:9px 24px;border-radius:var(--rpill);font-size:13px;cursor:pointer">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(sov);
    requestAnimationFrame(() => { sov.style.opacity = '1'; sov.style.pointerEvents = 'all'; });
    sov.querySelector('#confirm-yes').onclick = () => { sov.remove(); resolve(true); };
    sov.querySelector('#confirm-no').onclick = () => { sov.remove(); resolve(false); };
  });
}

export function promptDialog(msg, defaultValue = '') {
  return new Promise(resolve => {
    const sov = document.createElement('div');
    sov.className = 'sov';
    sov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s';
    sov.innerHTML = `<div style="background:var(--s1);border-radius:var(--rlg);padding:24px;max-width:300px;text-align:center;border:.5px solid var(--border)">
      <p style="font-size:14px;color:var(--tp);margin-bottom:12px">${msg}</p>
      <input id="prompt-input" value="${defaultValue}" style="background:var(--s2);border:.5px solid var(--bmd);border-radius:var(--rsm);padding:9px 12px;font-size:13px;color:var(--tp);width:100%;outline:none;margin-bottom:12px;font-family:var(--font)">
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="prompt-ok" style="background:var(--accent);color:#000;border:none;padding:9px 24px;border-radius:var(--rpill);font-weight:600;font-size:13px;cursor:pointer">OK</button>
        <button id="prompt-cancel" style="background:var(--s3);color:var(--tp);border:none;padding:9px 24px;border-radius:var(--rpill);font-size:13px;cursor:pointer">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(sov);
    requestAnimationFrame(() => { sov.style.opacity = '1'; sov.style.pointerEvents = 'all'; });
    const input = sov.querySelector('#prompt-input');
    setTimeout(() => input.focus(), 100);
    sov.querySelector('#prompt-ok').onclick = () => { sov.remove(); resolve(input.value); };
    sov.querySelector('#prompt-cancel').onclick = () => { sov.remove(); resolve(null); };
    input.onkeydown = e => { if (e.key === 'Enter') { sov.remove(); resolve(input.value); } };
  });
}

export function animateNumber(el, target, duration = 800) {
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  const startTime = performance.now();
  function step(now) {
    const pct = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - pct, 3);
    el.textContent = Math.round(start + diff * eased);
    if (pct < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function generateId() {
  return uid();
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

export function isValidPin(pin) {
  return /^\d{4}$/.test(pin);
}

export function extractTags(text) {
  const matches = text.match(/#[\w-]+/g);
  return matches ? matches.map(t => t.slice(1).toLowerCase()) : [];
}

export function extractMentions(text) {
  const matches = text.match(/@[\w.-]+/g);
  return matches ? matches.map(m => m.slice(1)) : [];
}

export function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function readingTime(text) {
  const wc = wordCount(text);
  return Math.max(1, Math.ceil(wc / 200));
}

export function similarity(a, b) {
  a = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  b = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const pairs = new Set();
  for (let i = 0; i < a.length - 1; i++) pairs.add(a.slice(i, i + 2));
  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    if (pairs.has(b.slice(i, i + 2))) matches++;
  }
  const total = a.length + b.length - 2;
  return total ? matches / total : 0;
}

export function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(/\s+/g, '');
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi >= q.length;
}

export function highlightMatches(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark style="background:var(--adim);color:var(--accent);border-radius:2px;padding:0 2px">$1</mark>');
}

export function getInitials(name) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function avatarColor(name) {
  const colors = ['#00e5a0', '#6bc5ff', '#ff6b9d', '#f5c842', '#b599ff', '#ff7f6b', '#4cd9b0', '#ff9a56'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function timeAgo(dateStr) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function relativeDate(dateStr) {
  const t = dateStr.slice(0, 10);
  if (t === today()) return 'Today';
  if (t === yesterday()) return 'Yesterday';
  const diff = (new Date(today()) - new Date(t)) / 86400000;
  if (diff < 7) return `${diff}d ago`;
  return dateStrShort(dateStr);
}

export function dateRangeLabel(from, to) {
  if (from === to) return dateStr(from);
  return `${dateStrShort(from)} – ${dateStrShort(to)}`;
}

export function isDateInRange(date, from, to) {
  return date >= from && date <= to;
}

export function getDateRange(days = 7) {
  const to = today();
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  return { from: d.toISOString().slice(0, 10), to };
}

export function getMonthRange(monthsBack = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatCalories(cal) {
  return cal.toLocaleString() + ' cal';
}

export function formatPercentage(val, decimals = 0) {
  return val.toFixed(decimals) + '%';
}

export function progressPercentage(current, goal) {
  return goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
}

export function clampToRange(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function mapRange(val, inMin, inMax, outMin, outMax) {
  return ((val - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function roundTo(val, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mode(arr) {
  const freq = {};
  let maxFreq = 0, modeVal = null;
  arr.forEach(v => {
    freq[v] = (freq[v] || 0) + 1;
    if (freq[v] > maxFreq) { maxFreq = freq[v]; modeVal = v; }
  });
  return modeVal;
}

export function standardDeviation(arr) {
  if (arr.length < 2) return 0;
  const avg = avgBy(arr, v => v);
  const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function normalizeArray(arr) {
  const max = Math.max(...arr, 1);
  const min = Math.min(...arr, 0);
  const range = max - min || 1;
  return arr.map(v => (v - min) / range);
}

export function movingAverage(arr, window = 3) {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1);
    return avgBy(slice, v => v);
  });
}

export function calcTrendline(values) {
  const n = values.length;
  if (n < 2) return 0;
  const indices = values.map((_, i) => i);
  const avgX = avgBy(indices, v => v);
  const avgY = avgBy(values, v => v);
  const num = indices.reduce((s, x, i) => s + (x - avgX) * (values[i] - avgY), 0);
  const den = indices.reduce((s, x) => s + (x - avgX) ** 2, 0);
  return den ? num / den : 0;
}

export function calcGrowthRate(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function interpolateColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export function randomHexColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry(fn, maxAttempts = 3, delay = 1000) {
  return async (...args) => {
    let lastError;
    for (let i = 0; i < maxAttempts; i++) {
      try { return await fn(...args); }
      catch (e) { lastError = e; await sleep(delay * (i + 1)); }
    }
    throw lastError;
  };
}

export function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

export function once(fn) {
  let called = false, result;
  return (...args) => {
    if (!called) { called = true; result = fn(...args); }
    return result;
  };
}

export function pipe(...fns) {
  return x => fns.reduce((v, fn) => fn(v), x);
}

export function compose(...fns) {
  return x => fns.reduceRight((v, fn) => fn(v), x);
}

export function curry(fn, arity = fn.length) {
  return function curried(...args) {
    return args.length >= arity ? fn(...args) : (...more) => curried(...args, ...more);
  };
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const clone = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}

export function deepEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a), keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => keysB.includes(k) && deepEqual(a[k], b[k]));
}

export function pick(obj, keys) {
  const result = {};
  keys.forEach(k => { if (k in obj) result[k] = obj[k]; });
  return result;
}

export function omit(obj, keys) {
  const keySet = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keySet.has(k)));
}

export function partition(arr, predicate) {
  return arr.reduce(([pass, fail], item) => predicate(item) ? [[...pass, item], fail] : [pass, [...fail, item]], [[], []]);
}

export function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

export function uniq(arr) {
  return [...new Set(arr)];
}

export function uniqBy(arr, fn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = fn(item);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function flatten(arr) {
  return arr.reduce((flat, item) => flat.concat(Array.isArray(item) ? flatten(item) : item), []);
}

export function difference(arr1, arr2) {
  const set2 = new Set(arr2);
  return arr1.filter(x => !set2.has(x));
}

export function intersection(arr1, arr2) {
  const set2 = new Set(arr2);
  return arr1.filter(x => set2.has(x));
}

export function union(arr1, arr2) {
  return [...new Set([...arr1, ...arr2])];
}

export function sample(arr, n = 1) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return n === 1 ? shuffled[0] : shuffled.slice(0, n);
}

export function weightedRandom(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function formatNumber(n, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function abbreviateNumber(n) {
  if (n < 1000) return n.toString();
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function toRoman(n) {
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  for (const [val, sym] of map) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

export function toSlug(str) {
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
}

export function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function toCamelCase(str) {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
}

export function truncateMiddle(str, maxLen = 50) {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return str.slice(0, half) + '…' + str.slice(str.length - half);
}

export function padNumber(n, width = 2) {
  return n.toString().padStart(width, '0');
}

export function pluralizeCustom(count, singular, plural) {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural || singular + 's'}`;
}

export function listItems(items, conjunction = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

export function pluralizeWithCount(count, singular) {
  return `${count} ${count === 1 ? singular : singular + 's'}`;
}

export function getDayName(date, short = true) {
  const days = short ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date + 'T12:00:00').getDay()];
}

export function getMonthName(date, short = true) {
  const months = short
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[new Date(date + 'T12:00:00').getMonth()];
}

export function formatDateCustom(date, format = 'YYYY-MM-DD') {
  const d = new Date(date + 'T12:00:00');
  const map = {
    YYYY: d.getFullYear().toString(),
    MM: padNumber(d.getMonth() + 1),
    DD: padNumber(d.getDate()),
    HH: padNumber(d.getHours()),
    mm: padNumber(d.getMinutes()),
    ss: padNumber(d.getSeconds()),
  };
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => map[match]);
}

export function getWeekDates(startDate) {
  const dates = [];
  const d = new Date(startDate + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function getMonthDates(year, month) {
  const dates = [];
  const days = getDaysInMonth(year, month);
  for (let i = 1; i <= days; i++) {
    dates.push(`${year}-${padNumber(month + 1)}-${padNumber(i)}`);
  }
  return dates;
}

export function dateComparator(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function versionCompare(v1, v2) {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0, n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

export function deviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio,
    touch: 'ontouchstart' in window,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
  };
}

export function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  return browser;
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function canShare() {
  return !!navigator.share;
}

export function canVibrate() {
  return !!navigator.vibrate;
}

export function canUseNotifications() {
  return 'Notification' in window;
}

export function canUseGeolocation() {
  return 'geolocation' in navigator;
}

export function canUseLocalStorage() {
  try { localStorage.setItem('_test', '1'); localStorage.removeItem('_test'); return true; }
  catch { return false; }
}

export function canUseIndexedDB() {
  return !!window.indexedDB;
}

export function canUseWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch { return false; }
}

export function measurePerformance(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

export function safeStringify(obj, spaces = 2) {
  try { return JSON.stringify(obj, null, spaces); }
  catch { return String(obj); }
}

export function safeParse(str, fallback = null) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}

export function createDebouncedListener(element, event, handler, delay = 200) {
  const debounced = debounce(handler, delay);
  element.addEventListener(event, debounced);
  return () => element.removeEventListener(event, debounced);
}

export function createThrottledListener(element, event, handler, delay = 200) {
  const throttled = throttle(handler, delay);
  element.addEventListener(event, throttled);
  return () => element.removeEventListener(event, throttled);
}

export function whenVisible(element, callback) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { callback(); observer.disconnect(); }
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  } else {
    callback();
    return () => {};
  }
}

export function animateCSS(element, animation, duration = 300) {
  return new Promise(resolve => {
    element.style.animation = `${animation} ${duration}ms ease`;
    setTimeout(() => { element.style.animation = ''; resolve(); }, duration);
  });
}

export function springValue(target, current = 0, stiffness = 0.1, damping = 0.8) {
  const velocity = (target - current) * stiffness;
  return current + velocity * damping;
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeIn(t) {
  return t * t * t;
}

export function linear(t) {
  return t;
}

export function scaleBetween(t, from, to) {
  return from + (to - from) * t;
}

export function oscillation(t, amplitude = 1, frequency = 1, phase = 0) {
  return amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
}

export function smoothStep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function imageFromFile(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        c.width = img.width * scale;
        c.height = img.height * scale;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function getBase64FromBlob(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(blob);
  });
}

export function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bytes = atob(parts[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function copyToClipboard(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

export function detectColorScheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getContrastColor(hex) {
  return isLight(hex) ? '#000000' : '#ffffff';
}

export function blendColors(c1, c2, t) {
  return interpolateColor(c1, c2, t);
}
