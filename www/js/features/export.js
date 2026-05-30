import State from '../state.js';
import { today, daysAgo, dateStr, formatCurrency, escapeHtml, toCSV, safeJSONparse } from '../helpers.js';
import { APP_NAME, APP_VERSION } from '../constants.js';
import Storage from '../storage.js';

const EXPORTABLE_DOMAINS = [
  { id: 'all', label: 'Everything', icon: '📦', keys: ['settings', 'habits', 'water', 'mood', 'journal', 'logs', 'balanceHistory', 'vitals', 'symptoms', 'medications', 'courses', 'assignments', 'studySessions', 'projects', 'tasks', 'accounts', 'transactions', 'budgets', 'gratitudes', 'sleep', 'exercise', 'nutrition', 'steps', 'goals', 'challenges', 'achievements', 'focusHistory', 'tags', 'readingList', 'reminders', 'customFields', 'wellbeingChecks', 'locationLogs'] },
  { id: 'habits', label: 'Habits', icon: '⭐', keys: ['habits', 'water', 'mood'] },
  { id: 'journal', label: 'Journal', icon: '📝', keys: ['journal', 'gratitudes'] },
  { id: 'health', label: 'Health', icon: '❤️', keys: ['vitals', 'symptoms', 'medications', 'sleep', 'exercise', 'nutrition', 'steps', 'wellbeingChecks'] },
  { id: 'study', label: 'Study', icon: '📖', keys: ['courses', 'assignments', 'studySessions'] },
  { id: 'projects', label: 'Projects', icon: '📋', keys: ['projects', 'tasks'] },
  { id: 'finance', label: 'Finance', icon: '💰', keys: ['accounts', 'transactions', 'budgets'] },
  { id: 'goals', label: 'Goals', icon: '🎯', keys: ['goals', 'challenges', 'achievements'] },
  { id: 'focus', label: 'Focus', icon: '⏱️', keys: ['focusHistory'] },
  { id: 'logs', label: 'Activity Log', icon: '📋', keys: ['logs', 'balanceHistory'] },
  { id: 'reading', label: 'Reading List', icon: '📚', keys: ['readingList'] },
  { id: 'settings', label: 'Settings', icon: '⚙️', keys: ['settings', 'tags', 'customFields'] },
  { id: 'reminders', label: 'Reminders', icon: '🔔', keys: ['reminders'] },
];

function collectDomainData(domainId) {
  const s = State.get();
  const domain = EXPORTABLE_DOMAINS.find(d => d.id === domainId);
  if (!domain) return {};
  if (domainId === 'all') {
    const all = { version: APP_VERSION, exportedAt: new Date().toISOString(), appName: APP_NAME };
    domain.keys.forEach(key => { all[key] = s[key]; });
    return all;
  }
  const data = { version: APP_VERSION, exportedAt: new Date().toISOString(), appName: APP_NAME, domain: domainId };
  domain.keys.forEach(key => { data[key] = s[key]; });
  return data;
}

export function exportAll() {
  return exportDomain('all');
}

export function exportDomain(domain) {
  const data = collectDomainData(domain);
  const json = JSON.stringify(data, null, 2);
  const filename = `mytrack_${domain}_${today()}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  const size = json.length;
  State.addLog(`Exported: ${domain} (${formatSize(size)})`, '📤', 'backup');
  return { success: true, domain, filename, size, format: 'json' };
}

export function exportDateRange(from, to) {
  const s = State.get();
  const fromDate = from || daysAgo(30);
  const toDate = to || today();
  const filtered = {};
  Object.entries(s).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      const inRange = val.filter(item => {
        const d = item.date || item.created || item.timestamp?.slice(0, 10) || '';
        return d >= fromDate && d <= toDate;
      });
      if (inRange.length > 0) filtered[key] = inRange;
    } else if (key === 'settings' || key === 'water' || key === 'mood' || key === 'sleep' || key === 'nutrition' || key === 'steps') {
      filtered[key] = val;
    }
  });
  filtered.version = APP_VERSION;
  filtered.exportedAt = new Date().toISOString();
  filtered.appName = APP_NAME;
  filtered.dateRange = { from: fromDate, to: toDate };
  const json = JSON.stringify(filtered, null, 2);
  const filename = `mytrack_${fromDate}_to_${toDate}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  State.addLog(`Exported date range: ${fromDate} to ${toDate}`, '📤', 'backup');
  return { success: true, fromDate, toDate, filename, size: json.length };
}

export function importAll(jsonString) {
  const data = safeJSONparse(jsonString);
  if (!data) return { success: false, error: 'Invalid JSON' };
  if (typeof data !== 'object' || Array.isArray(data)) return { success: false, error: 'Expected a JSON object' };
  const valid = validateImport(jsonString);
  if (!valid.valid) return { success: false, error: valid.error };
  try {
    State.importBackup(jsonString);
    State.addLog('Full import completed', '📥', 'backup');
    return { success: true, message: 'Data imported successfully' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function importDomain(jsonString, domain) {
  try {
    const data = JSON.parse(jsonString);
    const s = State.get();
    const domainDef = EXPORTABLE_DOMAINS.find(d => d.id === domain);
    if (!domainDef) return { success: false, error: `Unknown domain: ${domain}` };
    domainDef.keys.forEach(key => {
      if (data[key] !== undefined) {
        if (Array.isArray(data[key])) {
          if (!Array.isArray(s[key])) s[key] = [];
          const existingIds = new Set(s[key].map(item => item.id));
          data[key].forEach(item => {
            if (!existingIds.has(item.id)) {
              s[key].push(item);
              existingIds.add(item.id);
            }
          });
        } else if (typeof data[key] === 'object') {
          s[key] = { ...s[key], ...data[key] };
        } else {
          s[key] = data[key];
        }
      }
    });
    State.save();
    State.notify();
    State.addLog(`Imported domain: ${domain}`, '📥', 'backup');
    return { success: true, domain };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function mergeImport(jsonString, strategy) {
  const mergeStrategy = strategy || 'skip';
  if (!['overwrite', 'append', 'skip'].includes(mergeStrategy)) return { success: false, error: `Unknown strategy: ${strategy}` };
  try {
    const data = JSON.parse(jsonString);
    const s = State.get();
    const mergeableKeys = ['habits', 'journal', 'logs', 'transactions', 'vitals', 'symptoms', 'medications',
      'courses', 'assignments', 'tasks', 'projects', 'goals', 'challenges', 'gratitudes',
      'exercise', 'focusHistory', 'readingList', 'balanceHistory', 'bleReadings',
      'reminders', 'accounts', 'budgets', 'studySessions', 'wellbeingChecks', 'locationLogs'];
    mergeableKeys.forEach(key => {
      if (!data[key] || !Array.isArray(data[key])) return;
      if (!s[key]) s[key] = [];
      if (mergeStrategy === 'overwrite') {
        s[key] = data[key];
      } else if (mergeStrategy === 'append') {
        s[key].push(...data[key]);
      } else if (mergeStrategy === 'skip') {
        const existingIds = new Set(s[key].map(item => item.id));
        data[key].forEach(item => {
          if (!existingIds.has(item.id)) s[key].push(item);
        });
      }
    });
    if (data.settings && mergeStrategy !== 'skip') {
      Object.assign(s.settings, data.settings);
    }
    State.save();
    State.notify();
    State.addLog(`Import merged (strategy: ${mergeStrategy})`, '🔄', 'backup');
    return { success: true, strategy: mergeStrategy };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function generateHTMLReport(data) {
  const title = data.appName || APP_NAME;
  const exportedAt = data.exportedAt || new Date().toISOString();
  let sections = '';
  Object.entries(data).forEach(([key, val]) => {
    if (key === 'version' || key === 'exportedAt' || key === 'appName' || key === 'domain') return;
    if (Array.isArray(val)) {
      if (val.length === 0) return;
      sections += `<div class="report-section"><h2>${key}</h2><table><thead><tr>`;
      const sampleKeys = Object.keys(val[0] || {});
      sampleKeys.forEach(k => { sections += `<th>${escapeHtml(k)}</th>`; });
      sections += `</tr></thead><tbody>`;
      val.forEach(item => {
        sections += '<tr>';
        sampleKeys.forEach(k => {
          const v = item[k];
          sections += `<td>${v !== null && v !== undefined ? escapeHtml(String(v)) : ''}</td>`;
        });
        sections += '</tr>';
      });
      sections += `</tbody></table><p class="count">${val.length} entries</p></div>`;
    } else if (typeof val === 'object') {
      sections += `<div class="report-section"><h2>${key}</h2><div class="kv-grid">`;
      Object.entries(val).forEach(([k, v]) => {
        if (typeof v !== 'object') sections += `<div class="kv-item"><span class="kv-key">${escapeHtml(k)}</span><span class="kv-val">${escapeHtml(String(v))}</span></div>`;
      });
      sections += `</div></div>`;
    }
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} Report</title>
    <style>body{font-family:-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:20px;color:#333;font-size:13px}
    h1{font-size:20px}h2{font-size:15px;margin:0 0 8px}
    .report-section{background:#f5f5f5;border-radius:6px;padding:12px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #ddd;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis}
    th{font-weight:600;color:#555}
    .count{font-size:11px;color:#888;margin:4px 0 0}
    .kv-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
    .kv-item{display:flex;justify-content:space-between;padding:2px 4px}
    .kv-key{color:#666}.subtitle{color:#888;font-size:12px}
  </style></head><body>
    <h1>${escapeHtml(title)} — Data Report</h1>
    <p class="subtitle">Exported ${new Date(exportedAt).toLocaleString()}</p>
    ${sections}
  </body></html>`;
}

export function generateCSV(data, fields) {
  const rows = [];
  const flattenObject = (obj, prefix = '') => {
    const result = {};
    Object.entries(obj).forEach(([key, val]) => {
      const k = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(result, flattenObject(val, k));
      } else {
        result[k] = val;
      }
    });
    return result;
  };
  Object.entries(data).forEach(([key, val]) => {
    if (Array.isArray(val) && val.length > 0) {
      val.forEach(item => {
        if (typeof item === 'object') rows.push(flattenObject(item, key));
        else rows.push({ [key]: item });
      });
    }
  });
  if (rows.length === 0) return null;
  const headers = fields || [...new Set(rows.flatMap(Object.keys))];
  const csvLines = [headers.join(',')];
  rows.forEach(row => {
    csvLines.push(headers.map(h => {
      const v = String(row[h] ?? '').replace(/"/g, '""');
      return v.includes(',') || v.includes('"') ? `"${v}"` : v;
    }).join(','));
  });
  return csvLines.join('\n');
}

export function shareExport(data, title) {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = `mytrack_export_${today()}.json`;
  if (navigator.share && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
    navigator.share({
      files: [new File([blob], filename, { type: 'application/json' })],
      title: title || 'myTrack Export',
    }).catch(() => {});
    return { success: true, method: 'share' };
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: 'download' };
}

export function getExportSize(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json).length;
  return { bytes, kb: Math.round(bytes / 10.24) / 100, mb: Math.round(bytes / 10485.76) / 100, readable: formatSize(bytes) };
}

export function validateImport(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, error: 'Root must be a JSON object' };
    if (!data.habits && !data.logs && !data.settings) {
      return { valid: false, error: 'Missing required data (habits, logs, or settings)' };
    }
    if (data.habits && !Array.isArray(data.habits)) return { valid: false, error: 'habits must be an array' };
    if (data.logs && !Array.isArray(data.logs)) return { valid: false, error: 'logs must be an array' };
    if (data.journal && !Array.isArray(data.journal)) return { valid: false, error: 'journal must be an array' };
    if (data.settings && typeof data.settings !== 'object') return { valid: false, error: 'settings must be an object' };
    if (data.habits && data.habits.length > 0) {
      const validHabits = data.habits.every(h => h.name && h.id);
      if (!validHabits) return { valid: false, error: 'Each habit must have name and id' };
    }
    return { valid: true, domains: Object.keys(data).filter(k => Array.isArray(data[k])), entries: Object.values(data).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0) };
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${e.message}` };
  }
}

export function listAvailableExports() {
  const s = State.get();
  return EXPORTABLE_DOMAINS.map(d => {
    const count = d.keys.reduce((sum, key) => {
      const val = s[key];
      return sum + (Array.isArray(val) ? val.length : (val && typeof val === 'object' ? 1 : 0));
    }, 0);
    return { ...d, entryCount: count, hasData: count > 0 };
  }).filter(d => d.hasData || d.id === 'all');
}

export function exportAsCSV(domain) {
  const data = collectDomainData(domain);
  const csv = generateCSV(data);
  if (!csv) return { success: false, error: 'No data to export' };
  const filename = `mytrack_${domain}_${today()}.csv`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, filename, format: 'csv' };
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const Exporter = {
  exportAll,
  exportDomain,
  exportDateRange,
  importAll,
  importDomain,
  mergeImport,
  generateHTMLReport,
  generateCSV,
  shareExport,
  getExportSize,
  validateImport,
  listAvailableExports,
  exportAsCSV,
  EXPORTABLE_DOMAINS,
};

export default Exporter;
