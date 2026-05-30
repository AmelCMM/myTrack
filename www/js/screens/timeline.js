import State from '../state.js';
import Bridge from '../bridge.js';
import { MOODS, APP_AUTHOR, APP_GITHUB } from '../constants.js';
import {
  today, yesterday, daysAgo, dateStr, escapeHtml, truncate, debounce, timeSince, daysBetween
} from '../helpers.js';

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'health', label: 'Health' },
  { id: 'study', label: 'Study' },
  { id: 'work', label: 'Work' },
  { id: 'mood', label: 'Mood' },
  { id: 'finance', label: 'Finance' },
  { id: 'journal', label: 'Journal' },
  { id: 'habit', label: 'Habits' },
  { id: 'achievement', label: 'Achievements' },
  { id: 'water', label: 'Water' },
  { id: 'focus', label: 'Focus' },
];

const TYPE_COLORS = {
  health: '#ff4d6a', study: '#4d9fff', work: '#00e5a0', mood: '#f5a623',
  finance: '#aa64ff', habit: '#00e5a0', water: '#4d9fff', journal: '#b599ff',
  achievement: '#f5c842', task: '#f5a623', vital: '#ff6b9d', symptom: '#ff4d6a',
  medication: '#6bc5ff', focus: '#4d9fff', goal: '#00e5a0', challenge: '#aa64ff',
  nutrition: '#ff9a56', general: 'var(--ts)',
};

const TYPE_ICONS = {
  habit: '🎯', water: '💧', mood: '😊', journal: '✍️', health: '❤️',
  study: '📚', work: '💼', finance: '💰', achievement: '🏆', task: '✅',
  vital: '📊', symptom: '🩺', medication: '💊', focus: '⏱️', goal: '🎯',
  challenge: '🏅', nutrition: '🍽️', general: '📝',
};

let _activeFilter = 'all';
let _searchTerm = '';

function makeEl(tag, cls, children) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (children != null) {
    if (typeof children === 'string') e.textContent = children;
    else if (Array.isArray(children)) children.forEach(c => { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    else e.appendChild(children);
  }
  return e;
}

function makeSvg(viewBox) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', viewBox || '0 0 24 24');
  return s;
}

function makeCircle(cx, cy, r) {
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', String(r));
  return c;
}

function makeLine(x1, y1, x2, y2) {
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l.setAttribute('x1', String(x1)); l.setAttribute('y1', String(y1));
  l.setAttribute('x2', String(x2)); l.setAttribute('y2', String(y2));
  return l;
}

function searchIcon() {
  const s = makeSvg('0 0 24 24');
  s.appendChild(makeCircle(11, 11, 8));
  s.appendChild(makeLine(21, 21, 16.65, 16.65));
  return s;
}

function formatDateGroup(dateStrVal) {
  if (!dateStrVal) return '';
  if (dateStrVal === today()) return 'Today';
  if (dateStrVal === yesterday()) return 'Yesterday';
  const d = new Date(dateStrVal + 'T12:00:00');
  const daysDiff = daysBetween(today(), dateStrVal);
  if (daysDiff <= 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()] + ' ' + (daysDiff > 0 ? '(' + daysDiff + 'd ago)' : '');
  }
  return dateStr(dateStrVal);
}

export function renderTimeline() {
  const s = State.get();

  const tlDate = document.getElementById('tl-date');
  if (tlDate) tlDate.textContent = dateStr(today());

  const container = document.getElementById('tl-container');
  if (!container) return;
  container.innerHTML = '';

  renderSearchBar(container);
  renderFilterChips(container, s);

  const wrapper = makeEl('div', '');
  wrapper.style.padding = '4px 0';

  const filtered = filterLogs(s);

  if (!filtered.length) {
    let emptyMsg = 'No log entries yet.';
    if (_activeFilter !== 'all') emptyMsg = 'No logs match the "' + _activeFilter + '" filter.';
    if (_searchTerm) emptyMsg = 'No logs match "' + _searchTerm + '".';
    const emptyEl = makeEl('div', 'empty', emptyMsg);
    emptyEl.style.cssText = 'text-align:center;padding:24px 16px;color:var(--tm);font-size:14px;line-height:1.6';
    wrapper.appendChild(emptyEl);
    container.appendChild(wrapper);
    renderFooter(container);
    return;
  }

  let currentDateGroup = null;

  filtered.forEach((log, i) => {
    if (log.date !== currentDateGroup) {
      currentDateGroup = log.date;
      const dateHeader = makeEl('div', 'slbl', formatDateGroup(log.date));
      dateHeader.style.paddingTop = i > 0 ? '16px' : '4px';
      wrapper.appendChild(dateHeader);
    }

    const ti = makeEl('div', 'ti');
    ti.style.opacity = '0';
    ti.style.transition = 'opacity 0.3s ease';
    requestAnimationFrame(() => { ti.style.opacity = '1'; });

    const tlcol = makeEl('div', 'tlcol');
    const dot = makeEl('div', 'tdot on');
    const tc = TYPE_COLORS[log.type] || 'var(--accent)';
    dot.style.background = tc;
    dot.style.borderColor = tc;
    tlcol.appendChild(dot);

    if (i < filtered.length - 1 && filtered[i + 1].date === log.date) {
      const vline = makeEl('div', 'tvline');
      tlcol.appendChild(vline);
    } else {
      const vline = makeEl('div', 'tvline');
      vline.style.background = 'transparent';
      tlcol.appendChild(vline);
    }

    const tbody = makeEl('div', 'tbody');
    const timeEl = makeEl('div', 'ttime', log.time || '');

    const emojiStr = log.emoji ? log.emoji + ' ' : '';
    const titleEl = makeEl('div', 'ttit', emojiStr + (log.title || ''));
    if (_searchTerm) {
      const lower = titleEl.textContent.toLowerCase();
      const idx = lower.indexOf(_searchTerm);
      if (idx !== -1) {
        titleEl.innerHTML = escapeHtml(titleEl.textContent.slice(0, idx)) +
          '<mark style="background:var(--adim);color:var(--accent);border-radius:2px;padding:0 2px">' +
          escapeHtml(titleEl.textContent.slice(idx, idx + _searchTerm.length)) +
          '</mark>' +
          escapeHtml(titleEl.textContent.slice(idx + _searchTerm.length));
      }
    }

    const typeLabel = log.type ? log.type.charAt(0).toUpperCase() + log.type.slice(1) + ' · ' + (log.time || '') : '';
    const descEl = makeEl('div', 'tdesc', typeLabel);

    tbody.appendChild(timeEl);
    tbody.appendChild(titleEl);
    tbody.appendChild(descEl);

    const delBtn = makeEl('span', 'del-btn', 'Delete');
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      const id = log.id;
      showDeleteConfirm(id);
    });

    const rowFlex = makeEl('div', '');
    rowFlex.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;flex:1';
    tbody.style.flex = '1';
    rowFlex.appendChild(tbody);
    rowFlex.appendChild(delBtn);

    ti.appendChild(tlcol);
    ti.appendChild(rowFlex);
    wrapper.appendChild(ti);
  });

  const totalCount = filtered.length;
  const countNote = makeEl('div', '');
  countNote.style.cssText = 'text-align:center;padding:12px 16px 4px;font-size:11px;color:var(--tm)';
  countNote.textContent = totalCount + ' entr' + (totalCount !== 1 ? 'ies' : 'y');
  wrapper.appendChild(countNote);

  container.appendChild(wrapper);
  renderFooter(container);
}

function renderSearchBar(container) {
  const existingSearch = container.querySelector('.sbar');
  if (existingSearch) {
    const input = existingSearch.querySelector('input');
    if (input) {
      if (!input._listenerAttached) {
        input._listenerAttached = true;
        input.addEventListener('input', debounce(e => {
          _searchTerm = e.target.value.toLowerCase().trim();
          renderTimeline();
        }, 200));
      }
      if (input.value !== _searchTerm) {
        input.value = _searchTerm;
      }
    }
    return;
  }

  const searchBar = makeEl('div', 'sbar');
  searchBar.appendChild(searchIcon());

  const input = makeEl('input', '');
  input.id = 'tl-search';
  input.type = 'text';
  input.placeholder = 'Search logs…';
  input.setAttribute('aria-label', 'Search timeline entries');
  input.value = _searchTerm;
  input._listenerAttached = true;
  input.addEventListener('input', debounce(e => {
    _searchTerm = e.target.value.toLowerCase().trim();
    renderTimeline();
  }, 200));

  searchBar.appendChild(input);

  if (_searchTerm) {
    const clearBtn = makeEl('span', '');
    clearBtn.textContent = '✕';
    clearBtn.style.cssText = 'font-size:13px;color:var(--tm);cursor:pointer;padding:2px 6px;border-radius:50%';
    clearBtn.addEventListener('click', () => {
      _searchTerm = '';
      renderTimeline();
    });
    searchBar.appendChild(clearBtn);
  }

  container.appendChild(searchBar);
}

function renderFilterChips(container, s) {
  const existing = container.querySelector('.filter-chip-row');
  if (existing) existing.remove();

  const chipRow = makeEl('div', 'filter-chip-row');
  chipRow.style.cssText = 'display:flex;gap:6px;padding:4px 20px 10px;overflow-x:auto;flex-shrink:0;-webkit-overflow-scrolling:touch';
  chipRow.style.scrollbarWidth = 'none';

  const logTypeCounts = {};
  s.logs.forEach(l => {
    logTypeCounts[l.type] = (logTypeCounts[l.type] || 0) + 1;
  });

  FILTER_TYPES.forEach(ft => {
    const count = ft.id === 'all' ? s.logs.length : (logTypeCounts[ft.id] || 0);

    const chip = makeEl('span', 'ptag');
    if (ft.id === _activeFilter) {
      chip.style.background = 'var(--accent)';
      chip.style.color = '#000';
      chip.style.borderColor = 'transparent';
      chip.style.fontWeight = '600';
    } else {
      chip.style.cursor = 'pointer';
      chip.style.transition = 'background 0.15s';
    }
    chip.textContent = ft.label + ' (' + count + ')';
    chip.addEventListener('click', () => {
      if (_activeFilter !== ft.id) {
        _activeFilter = ft.id;
        renderTimeline();
        hapticLight();
      }
    });
    chipRow.appendChild(chip);
  });

  container.appendChild(chipRow);
}

function filterLogs(s) {
  let logs = [...s.logs];

  if (_activeFilter !== 'all') {
    logs = logs.filter(l => l.type === _activeFilter);
  }

  if (_searchTerm) {
    const term = _searchTerm.toLowerCase();
    logs = logs.filter(l =>
      (l.title && l.title.toLowerCase().includes(term)) ||
      (l.emoji && l.emoji.includes(term)) ||
      (l.type && l.type.toLowerCase().includes(term))
    );
  }

  logs.sort((a, b) => {
    const dateCmp = (b.date || '').localeCompare(a.date || '');
    if (dateCmp !== 0) return dateCmp;
    return (b.time || '').localeCompare(a.time || '');
  });

  return logs;
}

function showDeleteConfirm(logId) {
  if (typeof confirmDialog !== 'undefined') {
    confirmDialog('Delete this log entry?').then(confirmed => {
      if (confirmed) {
        State.deleteLog(logId);
        hapticDelete();
        showToast('Log deleted');
        renderTimeline();
      }
    });
  } else if (window.confirm('Delete this log entry?')) {
    State.deleteLog(logId);
    hapticDelete();
    renderTimeline();
  }
}

function renderFooter(container) {
  const footer = makeEl('div', 'footer');
  footer.style.padding = '14px 0 8px';
  const p = makeEl('p', '');
  p.innerHTML = 'Built by <strong>' + escapeHtml(APP_AUTHOR) + '</strong> · <a href="' + escapeHtml(APP_GITHUB) + '" target="_blank">@AmelCMM</a>';
  footer.appendChild(p);
  container.appendChild(footer);
}

function hapticDelete() {
  try {
    if (typeof Bridge !== 'undefined' && Bridge.Haptics) {
      Bridge.Haptics.warning();
    } else if (navigator.vibrate) {
      navigator.vibrate([12, 30, 12]);
    }
  } catch (e) {}
}

function hapticLight() {
  try {
    if (typeof Bridge !== 'undefined' && Bridge.Haptics) {
      Bridge.Haptics.tick();
    } else if (navigator.vibrate) {
      navigator.vibrate(8);
    }
  } catch (e) {}
}

function showToast(msg) {
  if (typeof showToast !== 'undefined') {
    try { showToast(msg, 2000); } catch (e) {}
    return;
  }
  const existing = document.querySelector('.toast-el');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast-el';
  el.textContent = msg;
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
  }, 2000);
}

export default renderTimeline;
