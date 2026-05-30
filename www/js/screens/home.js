import State from '../state.js';
import Bridge from '../bridge.js';
import {
  MOODS, WEEKDAYS_SHORT, ACCENTS, XP_LEVELS, DEFAULT_WATER_GOAL,
  APP_NAME, APP_VERSION, APP_AUTHOR, APP_GITHUB
} from '../constants.js';
import {
  today, yesterday, daysAgo, timeStr, dateStr, escapeHtml, truncate, formatTime,
  sumBy, avgBy, groupBy, getGreeting, animateNumber, showToast, hapticLight, hapticSuccess
} from '../helpers.js';

const C = 408;
const RING_RADIUS = 65;

const DOMAINS = [
  { id: 'health', label: 'Health', color: '#ff4d6a', css: 'o-h',
    path: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
  { id: 'study', label: 'Study', color: '#4d9fff', css: 'o-s',
    path: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  { id: 'work', label: 'Work', color: '#00e5a0', css: 'o-w',
    path: 'M2 7h20v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2' },
  { id: 'mood', label: 'Mood', color: '#f5a623', css: 'o-m',
    path: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01' },
  { id: 'finance', label: 'Finance', color: '#aa64ff', css: 'o-f',
    path: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
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
  s.setAttribute('width', '100%');
  s.setAttribute('height', '100%');
  return s;
}

function makePath(d) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  return p;
}

function makePolyline(points) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  p.setAttribute('points', points);
  return p;
}

function makeLine(x1, y1, x2, y2) {
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l.setAttribute('x1', String(x1)); l.setAttribute('y1', String(y1));
  l.setAttribute('x2', String(x2)); l.setAttribute('y2', String(y2));
  return l;
}

function makeCircle(cx, cy, r) {
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', String(r));
  return c;
}

function makeRect(x, y, w, h, rx) {
  const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
  r.setAttribute('width', String(w)); r.setAttribute('height', String(h));
  if (rx != null) r.setAttribute('rx', String(rx));
  return r;
}

function svgCheck() {
  const s = makeSvg('0 0 24 24');
  s.appendChild(makePolyline('20 6 9 17 4 12'));
  return s;
}

function svgHeart() {
  const s = makeSvg('0 0 24 24');
  s.appendChild(makePath('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'));
  return s;
}

function verdict(score) {
  if (score >= 90) return 'Exceptional — you are in peak flow';
  if (score >= 80) return 'Excellent — strong momentum across domains';
  if (score >= 70) return 'Great — solid rhythm, keep it up';
  if (score >= 60) return 'Good — steady with room to grow';
  if (score >= 45) return 'Fair — small adjustments will compound';
  if (score >= 30) return 'Uneven — consider a reset or rest day';
  if (score >= 15) return 'Low — be kind to yourself, start small';
  return 'Rest needed — take care of yourself first';
}

function getLevelInfo(xp) {
  let level = 0;
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i]) { level = i; break; }
  }
  const currentXp = xp - (XP_LEVELS[level] || 0);
  const nextXp = XP_LEVELS[level + 1] ? XP_LEVELS[level + 1] - XP_LEVELS[level] : 1;
  const progress = Math.min(1, Math.max(0, nextXp > 0 ? currentXp / nextXp : 0));
  return { level, xp: currentXp, nextXp, progress };
}

function formatXp(xp) {
  if (xp >= 1000) return (xp / 1000).toFixed(1) + 'k';
  return String(xp);
}

export function renderHome() {
  const s = State.get();
  const t = today();
  const greeting = getGreeting();
  const name = s.settings?.name || 'tracker';

  const greetEl = document.getElementById('greet');
  if (greetEl) greetEl.textContent = greeting + ', ' + name;

  renderBalanceRing(s);

  renderDomainOrbs(s);

  renderStatsRow(s, t);

  renderWaterCard(s, t);

  renderHabitsCard(s);

  renderRecentLogsCard(s);

  renderStreakSection(s);

  renderPrivacyBadge();

  renderFooterSection();

  const score = State.pushBalance();
  State.save();
}

function renderBalanceRing(s) {
  const score = State.computeBalanceScore();

  const pscore = document.getElementById('pscore');
  if (pscore) {
    pscore.textContent = '0';
    animateNumber(pscore, score, 1200);
  }

  const pring = document.getElementById('pring');
  if (pring) {
    const offset = C * (1 - score / 100);
    pring.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
    pring.style.strokeDashoffset = String(offset);
  }

  const pverdict = document.getElementById('pverdict');
  if (pverdict) pverdict.textContent = verdict(score);

  const levelInfo = getLevelInfo(s.xp || 0);
  const xpLabel = document.getElementById('xp-label');
  if (xpLabel) {
    const pct = Math.round(levelInfo.progress * 100);
    xpLabel.textContent = 'Lv.' + levelInfo.level + ' · ' + formatXp(s.xp || 0) + ' XP (' + pct + '%)';
  }
  const xpBar = document.getElementById('xp-bar');
  if (xpBar) {
    const pct = (levelInfo.progress * 100).toFixed(1);
    xpBar.style.width = pct + '%';
    xpBar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  }

  const xpNext = document.getElementById('xp-next');
  if (xpNext) {
    const remaining = levelInfo.nextXp - levelInfo.xp;
    xpNext.textContent = formatXp(remaining) + ' XP to Lv.' + (levelInfo.level + 1);
  }
}

function renderDomainOrbs(s) {
  const container = document.querySelector('.orbs');
  if (!container) return;
  container.innerHTML = '';

  const active = s.settings?.domainToggles || {};

  DOMAINS.forEach(d => {
    if (active[d.id] === false) return;

    const orb = makeEl('div', 'orb ' + d.css);
    orb.setAttribute('data-domain', d.id);
    orb.addEventListener('click', () => {
      if (window.App && window.App.nav) {
        window.App.nav(d.id);
        hapticLight();
      }
    });

    const od = makeEl('div', 'od');
    const svg = makeSvg('0 0 24 24');
    svg.appendChild(makePath(d.path));
    od.appendChild(svg);

    const ol = makeEl('span', 'ol', d.label);

    orb.appendChild(od);
    orb.appendChild(ol);
    container.appendChild(orb);
  });
}

function renderStatsRow(s, t) {
  const sleepH = s.sleep?.date === t ? (s.sleep.hours || 0) : 0;
  const sleepGoal = s.settings?.sleepGoal || 8;
  const stSleep = document.getElementById('st-sleep');
  if (stSleep) {
    if (sleepH > 0) {
      const pct = Math.min(100, Math.round(sleepH / sleepGoal * 100));
      stSleep.textContent = sleepH.toFixed(1) + 'h';
      stSleep.title = pct + '% of ' + sleepGoal + 'h goal';
      stSleep.style.color = pct >= 85 ? 'var(--accent)' : pct >= 60 ? 'var(--warn)' : 'var(--ts)';
    } else {
      stSleep.textContent = '--';
      stSleep.title = 'Log sleep in Health to track';
      stSleep.style.color = 'var(--tm)';
    }
  }

  const wCount = s.water?.date === t ? (s.water.count || 0) : 0;
  const wGoal = s.water?.goal || DEFAULT_WATER_GOAL;
  const stWater = document.getElementById('st-water');
  if (stWater) {
    stWater.textContent = wCount + '/' + wGoal;
    const pct = wGoal > 0 ? Math.round(wCount / wGoal * 100) : 0;
    stWater.title = pct + '% hydrated';
    stWater.style.color = pct >= 100 ? 'var(--accent)' : pct >= 50 ? 'var(--warn)' : 'var(--ts)';
  }

  const habitsDone = s.habits.filter(h => h.done).length;
  const totalHabits = s.habits.length;
  const stHabits = document.getElementById('st-habits');
  if (stHabits) {
    stHabits.textContent = habitsDone + '/' + totalHabits;
    const pct = totalHabits > 0 ? Math.round(habitsDone / totalHabits * 100) : 0;
    stHabits.title = pct + '% of habits complete';
    stHabits.style.color = pct >= 80 ? 'var(--accent)' : pct >= 40 ? 'var(--warn)' : 'var(--ts)';
  }
}

function renderWaterCard(s, t) {
  const container = document.getElementById('wglasses');
  if (!container) return;
  container.innerHTML = '';

  const goal = s.water?.goal || DEFAULT_WATER_GOAL;
  const count = s.water?.date === t ? (s.water.count || 0) : 0;

  for (let i = 0; i < goal; i++) {
    const div = makeEl('div', 'wg' + (i < count ? ' fill' : ''));
    div.setAttribute('data-idx', String(i));
    div.addEventListener('click', () => handleWaterClick(i, count, goal));
    container.appendChild(div);
  }

  const waterCard = container.closest('.card');
  if (waterCard) {
    const existingProgress = waterCard.querySelector('.water-progress');
    if (existingProgress) existingProgress.remove();

    const pct = goal > 0 ? count / goal : 0;
    const progress = makeEl('div', 'pb water-progress');
    const fill = makeEl('div', 'pbf');
    fill.style.width = '0%';
    progress.appendChild(fill);
    waterCard.appendChild(progress);

    requestAnimationFrame(() => {
      fill.style.width = (pct * 100).toFixed(1) + '%';
    });
  }
}

function handleWaterClick(idx, currentCount, goal) {
  if (idx < currentCount) {
    State.setWater(idx);
    showToast('Glass removed');
  } else if (idx === currentCount && currentCount < goal) {
    State.setWater(idx + 1);
    showToast('+1 glass 💧');
    hapticLight();
    if (idx + 1 >= goal) {
      hapticSuccess();
      showToast('Hydration goal reached! 🎉');
    }
  }
  renderHome();
}

function renderHabitsCard(s) {
  const container = document.getElementById('hgrid');
  if (!container) return;
  container.innerHTML = '';

  if (!s.habits.length) {
    const emptyEl = makeEl('div', 'empty');
    emptyEl.style.cssText = 'grid-column:1/-1;text-align:center;padding:16px 4px;color:var(--tm);font-size:13px;line-height:1.6';
    emptyEl.textContent = 'No habits yet. Tap + Add to create your first habit.';
    container.appendChild(emptyEl);

    const suggestions = [
      ['🧘', 'Meditate'], ['💧', 'Hydrate'], ['📚', 'Read'],
      ['🏃', 'Exercise'], ['🌿', 'No sugar'], ['🤸', 'Stretch'],
    ];
    const suggestionRow = makeEl('div', '');
    suggestionRow.style.cssText = 'grid-column:1/-1;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding-top:6px';
    suggestions.forEach(([emoji, name]) => {
      const chip = makeEl('span', 'ptag', emoji + ' ' + name);
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', () => {
        State.createHabit({ name, emoji });
        hapticSuccess();
        renderHome();
      });
      suggestionRow.appendChild(chip);
    });
    container.appendChild(suggestionRow);
    return;
  }

  s.habits.forEach(h => {
    const item = makeEl('div', 'hi' + (h.done ? ' done' : ''));
    item.addEventListener('click', () => {
      State.toggleHabit(h.id);
      hapticLight();
      renderHome();
    });

    const left = makeEl('div', 'hl');
    const emojiSpan = makeEl('span', 'hem', h.emoji || '⭐');
    const info = makeEl('div', '');
    const nameEl = makeEl('div', 'hn', truncate(h.name, 16));
    info.appendChild(nameEl);

    const streakVal = h.streak || 0;
    const streakLabel = streakVal === 1 ? 'day' : 'days';
    const streakRow = makeEl('div', 'hstr');
    if (h.done && h.lastDate === today()) {
      streakRow.textContent = '🔥 ' + streakVal + ' ' + streakLabel + ' · done ✅';
      streakRow.style.color = 'var(--accent)';
    } else if (h.lastDate === today()) {
      streakRow.textContent = '🔥 ' + streakVal + ' ' + streakLabel;
    } else if (h.lastDate === yesterday()) {
      streakRow.textContent = '🔥 ' + streakVal + ' ' + streakLabel + ' · due today';
      streakRow.style.opacity = '0.7';
    } else if (h.streak > 0) {
      streakRow.textContent = '🔥 ' + streakVal + ' ' + streakLabel + ' · streak broken';
      streakRow.style.opacity = '0.45';
    } else {
      streakRow.textContent = 'Start your streak';
      streakRow.style.opacity = '0.4';
    }
    info.appendChild(streakRow);

    left.appendChild(emojiSpan);
    left.appendChild(info);

    const chk = makeEl('div', 'hchk');
    chk.appendChild(svgCheck());

    item.appendChild(left);
    item.appendChild(chk);

    const delBtn = makeEl('span', 'hi-del', '✕');
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (window.confirm && !window.confirm('Delete "' + h.name + '" habit?')) return;
      State.deleteHabit(h.id);
      hapticLight();
      renderHome();
    });
    item.appendChild(delBtn);

    container.appendChild(item);
  });
}

function renderRecentLogsCard(s) {
  const container = document.getElementById('recent-logs');
  if (!container) return;
  container.innerHTML = '';

  const logs = s.logs.filter(l => l.date === today()).slice(0, 5);

  if (!logs.length) {
    const emptyEl = makeEl('div', 'empty');
    emptyEl.style.cssText = 'text-align:center;padding:14px 4px;color:var(--tm);font-size:13px;line-height:1.6';
    emptyEl.textContent = 'No activity logged today. Tap + to log something.';
    container.appendChild(emptyEl);
    return;
  }

  logs.forEach(log => {
    const item = makeEl('div', 'li');

    const icon = makeEl('div', 'lic');
    const tc = TYPE_COLORS[log.type] || 'var(--ts)';
    icon.style.background = tc + '1f';
    icon.style.color = tc;
    icon.textContent = log.emoji || TYPE_ICONS[log.type] || '📝';

    const info = makeEl('div', 'linfo');
    info.appendChild(makeEl('div', 'ltit', log.title || ''));

    const subParts = [];
    if (log.time) subParts.push(log.time);
    if (log.type && log.type !== 'general') {
      subParts.push(log.type.charAt(0).toUpperCase() + log.type.slice(1));
    }
    if (subParts.length) {
      const subEl = makeEl('div', 'lsub', subParts.join(' · '));
      info.appendChild(subEl);
    }

    const del = makeEl('span', 'ldel', '✕');
    del.addEventListener('click', e => {
      e.stopPropagation();
      State.deleteLog(log.id);
      renderHome();
    });

    item.appendChild(icon);
    item.appendChild(info);
    item.appendChild(del);
    container.appendChild(item);
  });
}

function renderStreakSection(s) {
  const container = document.getElementById('streak-stats');
  if (!container) return;
  container.innerHTML = '';

  const bestStreak = Math.max(...s.habits.map(h => h.streak || 0), 0);
  const habitsDone = s.habits.filter(h => h.done).length;
  const totalLogs = s.logs.length;
  const stats = State.getStats();

  const cards = [
    { val: bestStreak, lbl: 'Best streak', icon: '🔥' },
    { val: habitsDone + '/' + s.habits.length, lbl: 'Done today', icon: '✅' },
    { val: totalLogs, lbl: 'Total logs', icon: '📝' },
  ];

  cards.forEach(c => {
    const card = makeEl('div', 'sti');
    card.style.transition = 'transform 0.15s';
    const icon = makeEl('div', '', c.icon);
    icon.style.cssText = 'font-size:16px;margin-bottom:2px';
    const val = makeEl('div', 'stn', String(c.val));
    const lbl = makeEl('div', 'stl', c.lbl);
    card.appendChild(icon);
    card.appendChild(val);
    card.appendChild(lbl);
    container.appendChild(card);
  });

  const levelInfo = getLevelInfo(s.xp || 0);
  const levelNote = makeEl('div', '');
  levelNote.style.cssText = 'padding:6px 16px 0;font-size:11px;color:var(--tm);display:flex;align-items:center;justify-content:center;gap:8px';
  levelNote.textContent = 'Lv.' + levelInfo.level + ' · ' + formatXp(s.xp || 0) + ' XP · ' + stats.achievementsUnlocked + ' achievements';
  container.appendChild(levelNote);
}

function renderPrivacyBadge() {
  const badges = document.querySelectorAll('.priv');
  badges.forEach(badge => {
    badge.innerHTML = '<div class="pdot"></div>All data stored locally · AES-GCM encrypted';
  });
}

function renderFooterSection() {
  const footers = document.querySelectorAll('.footer');
  footers.forEach(footer => {
    footer.innerHTML = '<p>Built by <strong>' + escapeHtml(APP_AUTHOR) + '</strong> · <a href="' + escapeHtml(APP_GITHUB) + '" target="_blank">@AmelCMM</a></p>';
  });
}

export function renderHomeStreaks() {
  renderStreakSection(State.get());
}

export default renderHome;
