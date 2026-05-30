import State from '../state.js';
import Bridge from '../bridge.js';
import { MOODS, APP_AUTHOR, APP_GITHUB } from '../constants.js';
import {
  today, yesterday, daysAgo, dateStr, escapeHtml, truncate, formatTime,
  sumBy, avgBy, groupBy, getGreeting, animateNumber, showToast, hapticLight, hapticSuccess,
  daysBetween
} from '../helpers.js';

let _searchTerm = '';
let _filterTag = '';
let _entryLimit = 50;

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

function makePolyline(points) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  p.setAttribute('points', points);
  return p;
}

function formatEntryDate(dateStrVal) {
  if (!dateStrVal) return 'Unknown date';
  if (dateStrVal === today()) return 'Today';
  if (dateStrVal === yesterday()) return 'Yesterday';
  const daysDiff = daysBetween(today(), dateStrVal);
  if (daysDiff <= 7) {
    const d = new Date(dateStrVal + 'T12:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()] + ' (' + daysDiff + 'd ago)';
  }
  return dateStr(dateStrVal);
}

function getAllTags(s) {
  const tags = new Set();
  s.journal.forEach(entry => {
    if (entry.tags && entry.tags.length) {
      entry.tags.forEach(tag => tags.add(tag));
    }
  });
  return [...tags].sort();
}

function getMoodEmoji(mood) {
  if (!mood) return '';
  const found = MOODS.find(m => m.emoji === mood || m.label === mood);
  return found ? found.emoji : mood;
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getEntryPreview(text, maxLen = 120) {
  if (!text) return '';
  const cleaned = text.replace(/\n/g, ' ');
  if (cleaned.length <= maxLen) return cleaned;
  return truncate(cleaned, maxLen);
}

export function renderJournal() {
  const s = State.get();

  const container = document.getElementById('jlist');
  if (!container) return;
  container.innerHTML = '';

  renderJournalSearch(container);

  renderJournalTagFilter(container, s);

  renderEntryCount(container, s);

  renderJournalEntries(container, s);

  if (s.journal.length > _entryLimit) {
    renderLoadMore(container, s);
  }

  renderWriteEntryCard(container);

  renderJournalFooter(container);
}

function renderJournalSearch(container) {
  const searchBar = makeEl('div', 'sbar');
  const svg = makeSvg('0 0 24 24');
  svg.appendChild(makeCircle(11, 11, 8));
  svg.appendChild(makeLine(21, 21, 16.65, 16.65));
  searchBar.appendChild(svg);

  const input = makeEl('input', '');
  input.type = 'text';
  input.placeholder = 'Search entries…';
  input.setAttribute('aria-label', 'Search journal entries');
  input.value = _searchTerm;

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      _searchTerm = input.value.toLowerCase();
      renderJournal();
    }, 200);
  });

  if (_searchTerm) {
    const clearBtn = makeEl('span', '');
    clearBtn.textContent = '✕';
    clearBtn.style.cssText = 'font-size:13px;color:var(--tm);cursor:pointer;padding:2px 6px;border-radius:50%';
    clearBtn.addEventListener('click', () => {
      _searchTerm = '';
      renderJournal();
    });
    searchBar.appendChild(clearBtn);
  }

  container.appendChild(searchBar);
}

function renderJournalTagFilter(container, s) {
  const allTags = getAllTags(s);
  if (!allTags.length) return;

  const tagRow = makeEl('div', '');
  tagRow.style.cssText = 'display:flex;gap:5px;padding:2px 16px 8px;overflow-x:auto;flex-wrap:wrap;-webkit-overflow-scrolling:touch';

  const allChip = makeEl('span', 'ptag', 'All');
  if (!_filterTag) {
    allChip.style.cssText = 'background:var(--accent);color:#000;border-color:transparent;font-weight:600';
  } else {
    allChip.style.cursor = 'pointer';
    allChip.style.transition = 'background 0.15s';
  }
  allChip.addEventListener('click', () => {
    _filterTag = '';
    _entryLimit = 50;
    renderJournal();
  });
  tagRow.appendChild(allChip);

  allTags.forEach(tag => {
    const chip = makeEl('span', 'ptag', tag);
    if (_filterTag === tag) {
      chip.style.cssText = 'background:var(--accent);color:#000;border-color:transparent;font-weight:600';
    } else {
      chip.style.cursor = 'pointer';
      chip.style.transition = 'background 0.15s';
    }
    chip.addEventListener('click', () => {
      _filterTag = _filterTag === tag ? '' : tag;
      _entryLimit = 50;
      renderJournal();
    });
    tagRow.appendChild(chip);
  });

  container.appendChild(tagRow);
}

function renderEntryCount(container, s) {
  const filtered = getFilteredEntries(s);

  const countBadge = makeEl('div', '');
  countBadge.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:2px 20px 8px;font-size:11px;color:var(--tm)';

  const left = makeEl('span', '');
  const totalText = s.journal.length + ' entr' + (s.journal.length !== 1 ? 'ies' : '');
  if (_searchTerm || _filterTag) {
    left.textContent = filtered.length + ' of ' + totalText;
  } else {
    left.textContent = totalText + ' total';
  }
  countBadge.appendChild(left);

  if (s.journal.length > 0) {
    const totalWords = sumBy(s.journal, e => countWords(e.text));
    const avgWords = s.journal.length > 0 ? Math.round(totalWords / s.journal.length) : 0;
    const right = makeEl('span', '');
    right.textContent = '~' + avgWords + ' words/entry';
    right.style.cssText = 'font-size:10px;color:var(--tm)';
    countBadge.appendChild(right);
  }

  container.appendChild(countBadge);
}

function getFilteredEntries(s) {
  let entries = [...s.journal];

  if (_searchTerm) {
    const term = _searchTerm.toLowerCase();
    entries = entries.filter(e =>
      (e.text && e.text.toLowerCase().includes(term)) ||
      (e.mood && e.mood.toLowerCase().includes(term)) ||
      (e.tags && e.tags.some(t => t.toLowerCase().includes(term)))
    );
  }

  if (_filterTag) {
    entries = entries.filter(e => e.tags && e.tags.includes(_filterTag));
  }

  entries.sort((a, b) => {
    const dateCmp = (b.date || '').localeCompare(a.date || '');
    if (dateCmp !== 0) return dateCmp;
    const bId = b.id || '';
    const aId = a.id || '';
    return bId.localeCompare(aId);
  });

  return entries.slice(0, _entryLimit);
}

function renderJournalEntries(container, s) {
  const entries = getFilteredEntries(s);

  if (!entries.length) {
    const emptyState = makeEl('div', 'card');
    emptyState.style.cssText = 'text-align:center;padding:32px 16px;margin:0 16px 12px';

    const icon = makeEl('div', '', s.journal.length === 0 ? '📖' : '🔍');
    icon.style.cssText = 'font-size:38px;margin-bottom:12px';

    const msg = makeEl('div', '');
    if (s.journal.length === 0) {
      msg.textContent = 'Your journal is empty. Start writing to track your thoughts, feelings, and daily experiences.';
    } else {
      msg.textContent = 'No entries match your search or filter. Try different keywords.';
    }
    msg.style.cssText = 'font-size:14px;color:var(--ts);line-height:1.6;max-width:280px;margin:0 auto';

    emptyState.appendChild(icon);
    emptyState.appendChild(msg);

    if (s.journal.length > 0) {
      const resetBtn = makeEl('span', 'ptag', 'Clear filters');
      resetBtn.style.cssText = 'cursor:pointer;margin-top:12px;display:inline-block;background:var(--adim);color:var(--accent);border-color:transparent';
      resetBtn.addEventListener('click', () => {
        _searchTerm = '';
        _filterTag = '';
        renderJournal();
      });
      emptyState.appendChild(resetBtn);
    }

    container.appendChild(emptyState);
    return;
  }

  entries.forEach(entry => {
    const je = makeEl('div', 'je');
    je.style.opacity = '0';
    je.style.transition = 'opacity 0.3s ease';
    requestAnimationFrame(() => { je.style.opacity = '1'; });

    const dateRow = makeEl('div', '');
    dateRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between';

    const dateEl = makeEl('div', 'jd', formatEntryDate(entry.date));
    dateRow.appendChild(dateEl);

    const delBtn = makeEl('span', 'j-del', '✕');
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (window.confirm) {
        if (!window.confirm('Delete this entry?')) return;
      }
      State.deleteJournalEntry(entry.id);
      hapticLight();
      showToast('Entry deleted');
      renderJournal();
    });
    dateRow.appendChild(delBtn);

    je.appendChild(dateRow);

    const textContainer = makeEl('div', 'jt');

    if (entry.text) {
      const paragraphs = entry.text.split('\n');
      paragraphs.forEach((para, pi) => {
        if (pi > 0) {
          const br = makeEl('br', '');
          textContainer.appendChild(br);
        }
        const textNode = makeEl('span', '');
        if (_searchTerm && para.toLowerCase().includes(_searchTerm)) {
          const lower = para.toLowerCase();
          const idx = lower.indexOf(_searchTerm);
          if (idx !== -1) {
            const before = document.createTextNode(para.slice(0, idx));
            const mark = makeEl('mark', '');
            mark.textContent = para.slice(idx, idx + _searchTerm.length);
            mark.style.cssText = 'background:var(--adim);color:var(--accent);border-radius:2px;padding:0 2px';
            const after = document.createTextNode(para.slice(idx + _searchTerm.length));
            textContainer.appendChild(before);
            textContainer.appendChild(mark);
            textContainer.appendChild(after);
          } else {
            textContainer.appendChild(document.createTextNode(para));
          }
        } else {
          textContainer.appendChild(document.createTextNode(para));
        }
      });
    }

    je.appendChild(textContainer);

    const metaRow = makeEl('div', '');
    metaRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:8px;clear:both';

    const wordCount = countWords(entry.text);
    const wordEl = makeEl('span', '');
    wordEl.textContent = wordCount + ' word' + (wordCount !== 1 ? 's' : '');
    wordEl.style.cssText = 'font-size:10px;color:var(--tm)';

    const leftMeta = makeEl('div', '');
    leftMeta.style.cssText = 'display:flex;align-items:center;gap:6px';

    if (entry.mood) {
      const moodEl = makeEl('span', 'jm', getMoodEmoji(entry.mood) + ' ' + entry.mood);
      leftMeta.appendChild(moodEl);
    }

    leftMeta.appendChild(wordEl);
    metaRow.appendChild(leftMeta);

    je.appendChild(metaRow);

    if (entry.tags && entry.tags.length) {
      const tagRow = makeEl('div', '');
      tagRow.style.cssText = 'display:flex;gap:4px;margin-top:8px;flex-wrap:wrap';
      entry.tags.forEach(tag => {
        const chip = makeEl('span', 'ptag', tag);
        chip.style.cursor = 'pointer';
        chip.addEventListener('click', () => {
          _filterTag = _filterTag === tag ? '' : tag;
          _entryLimit = 50;
          renderJournal();
        });
        tagRow.appendChild(chip);
      });
      je.appendChild(tagRow);
    }

    container.appendChild(je);
  });
}

function renderLoadMore(container, s) {
  const remaining = s.journal.length - _entryLimit;
  if (remaining <= 0) return;

  const loadRow = makeEl('div', '');
  loadRow.style.cssText = 'text-align:center;padding:8px 0 4px';

  const loadBtn = makeEl('span', 'ptag', 'Show ' + Math.min(remaining, 50) + ' more (' + remaining + ' remaining)');
  loadBtn.style.cssText = 'cursor:pointer;background:var(--s3);padding:6px 14px';
  loadBtn.addEventListener('click', () => {
    _entryLimit += 50;
    renderJournal();
  });
  loadRow.appendChild(loadBtn);
  container.appendChild(loadRow);
}

function renderWriteEntryCard(container) {
  const ctaCard = makeEl('div', 'card');
  ctaCard.style.cssText = 'border:1px dashed var(--bmd);background:transparent;cursor:pointer;text-align:center;padding:18px 16px;margin:8px 16px 12px;transition:background 0.15s';

  const icon = makeEl('span', '', '✍️');
  icon.style.cssText = 'font-size:24px;display:block;margin-bottom:6px';

  const label = makeEl('span', '', 'Write a new entry');
  label.style.cssText = 'font-size:13px;color:var(--ts);font-weight:500';

  const sublabel = makeEl('div', '');
  sublabel.textContent = 'Capture your thoughts, feelings, and daily experiences';
  sublabel.style.cssText = 'font-size:11px;color:var(--tm);margin-top:4px';

  ctaCard.appendChild(icon);
  ctaCard.appendChild(label);
  ctaCard.appendChild(sublabel);

  ctaCard.addEventListener('click', () => {
    openJournalSheet();
  });

  container.appendChild(ctaCard);
}

function openJournalSheet() {
  const moodsHtml = MOODS.map(m =>
    '<span class="mem" id="jm_' + m.emoji + '" onclick="App._selectJMood(\'' + m.emoji + '\')" style="font-size:26px;padding:5px">' + m.emoji + '</span>'
  ).join('');

  const allTags = getAllTags(State.get());
  const tagOptions = allTags.length
    ? allTags.map(t => '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>').join('')
    : '';

  const tagField = allTags.length
    ? '<div class="form-field"><label>Tag</label><select id="jtag-select"><option value="">None</option>' + tagOptions + '</select></div>'
    : '<div class="form-field"><label>Tags (comma separated)</label><input id="jtags" placeholder="gratitude, health, work"></div>';

  const sheetHtml = [
    '<div class="shtt">Journal Entry</div>',
    '<div class="form-field"><label>Today\'s entry</label><textarea id="jtext" placeholder="What happened today? How did you feel?" rows="5" style="min-height:100px"></textarea></div>',
    '<div class="form-field"><label>Mood</label><div class="mgrid" style="justify-content:flex-start;">',
    moodsHtml,
    '</div></div>',
    tagField,
    '<button class="form-submit" onclick="App._saveJournal()">Save Entry</button>',
  ].join('');

  if (window.App && window.App.openSheet) {
    window.App.openSheet(sheetHtml);
  }
}

function renderJournalFooter(container) {
  const footer = makeEl('div', 'footer');
  footer.style.cssText = 'padding:20px 0 12px';
  const p = makeEl('p', '');
  p.innerHTML = 'Built by <strong>' + escapeHtml(APP_AUTHOR) + '</strong> · <a href="' + escapeHtml(APP_GITHUB) + '" target="_blank">@AmelCMM</a>';
  footer.appendChild(p);
  container.appendChild(footer);
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
  try {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 2000);
      return;
    }
  } catch (e) {}
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

export default renderJournal;
