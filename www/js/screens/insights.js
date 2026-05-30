import State from '../state.js';
import Bridge from '../bridge.js';
import { MOODS, WEEKDAYS_SHORT, ACCENTS, XP_LEVELS, MONTHS_SHORT, APP_AUTHOR, APP_GITHUB, DEFAULT_WATER_GOAL } from '../constants.js';
import {
  today, yesterday, daysAgo, dateStr, escapeHtml, truncate, formatTime,
  sumBy, avgBy, groupBy, getGreeting, animateNumber, showToast, hapticLight, hapticSuccess,
  daysBetween, weekStart, monthStart
} from '../helpers.js';

const HEATMAP_WEEKS = 26;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7;
const CHART_DAYS = 7;

const CORRELATIONS = [
  { label: 'Sleep → Mood', pct: 72, color: '#6bc5ff', coeff: '+0.72', desc: 'Better sleep correlates with improved mood scores' },
  { label: 'Water → Energy', pct: 58, color: '#4d9fff', coeff: '+0.58', desc: 'Hydration shows moderate positive impact on energy' },
  { label: 'Habits → Productivity', pct: 81, color: '#00e5a0', coeff: '+0.81', desc: 'Strong correlation between habit completion and productivity' },
  { label: 'Exercise → Mood', pct: 65, color: '#ff6b9d', coeff: '+0.65', desc: 'Physical activity consistently boosts mood' },
];

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

function makeRect(x, y, w, h, rx) {
  const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
  r.setAttribute('width', String(w)); r.setAttribute('height', String(h));
  if (rx != null) r.setAttribute('rx', String(rx));
  return r;
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

function makePath(d) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  return p;
}

export function renderInsights() {
  const s = State.get();

  renderBalanceChart(s);

  renderActivityHeatmap(s);

  renderCorrelationPanel(s);

  renderGlobe(s);

  renderSummaryStats(s);

  renderHabitBreakdown(s);

  renderWeeklyComparison(s);

  renderMoodDistribution(s);

  const footer = document.querySelector('#scr-insights .footer');
  if (footer) {
    footer.innerHTML = '<p>Built by <strong>' + escapeHtml(APP_AUTHOR) + '</strong> · <a href="' + escapeHtml(APP_GITHUB) + '" target="_blank">@AmelCMM</a></p>';
  }
}

function renderBalanceChart(s) {
  const container = document.getElementById('bal-chart');
  if (!container) return;
  container.innerHTML = '';

  const scores = [];
  const rawValues = [];
  const labels = [];
  const todayDate = today();
  const todayParsed = new Date(todayDate + 'T12:00:00');
  const todayDow = todayParsed.getDay();

  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const bh = s.balanceHistory.find(b => b.date === d);
    const score = bh ? bh.score : 0;
    scores.push(score);
    rawValues.push(score);
    const dow = (todayDow - i + 7) % 7;
    labels.push(WEEKDAYS_SHORT[dow]);
  }

  const maxVal = Math.max(...scores, 1);
  const chartHeight = 100;
  const avgScore = scores.length > 0 ? Math.round(sumBy(scores, s => s) / scores.length) : 0;

  const avgLine = makeEl('div', '');
  avgLine.style.cssText = 'position:absolute;left:0;right:0;top:' + (chartHeight - (avgScore / maxVal) * chartHeight) + 'px;border-top:1px dashed var(--tm);opacity:0.3;pointer-events:none';
  const avgLabel = makeEl('span', '', 'avg ' + avgScore);
  avgLabel.style.cssText = 'position:absolute;right:2px;top:' + (chartHeight - (avgScore / maxVal) * chartHeight - 12) + 'px;font-size:8px;color:var(--tm);opacity:0.4';
  container.style.position = 'relative';
  container.appendChild(avgLine);
  container.appendChild(avgLabel);

  scores.forEach((score, i) => {
    const wrap = makeEl('div', 'cbwrap');

    const scoreLabel = makeEl('span', '');
    scoreLabel.textContent = String(score);
    scoreLabel.style.cssText = 'font-size:9px;color:var(--ts);font-family:var(--mono);line-height:1';

    const bar = makeEl('div', 'cb');
    const pct = maxVal > 0 ? (score / maxVal) : 0;
    const h = Math.max(3, pct * chartHeight);

    const isToday = i === scores.length - 1;
    if (isToday) {
      bar.style.background = 'var(--accent)';
    } else if (score > 0) {
      bar.style.background = 'var(--ts)';
      bar.style.opacity = '' + Math.max(0.15, score / maxVal);
    }

    bar.style.height = '0px';
    bar.style.borderRadius = '4px 4px 0 0';

    setTimeout(() => {
      bar.style.height = h.toFixed(1) + 'px';
    }, i * 60);

    const dayLabel = makeEl('span', 'cday', labels[i]);
    if (isToday) {
      dayLabel.style.color = 'var(--accent)';
      dayLabel.style.fontWeight = '600';
    }

    wrap.appendChild(scoreLabel);
    wrap.appendChild(bar);
    wrap.appendChild(dayLabel);
    container.appendChild(wrap);
  });
}

function renderActivityHeatmap(s) {
  const monthsContainer = document.getElementById('hm-months');
  const gridContainer = document.getElementById('hm-grid');
  if (!monthsContainer || !gridContainer) return;
  monthsContainer.innerHTML = '';
  gridContainer.innerHTML = '';

  const todayDate = today();
  const todayParsed = new Date(todayDate + 'T12:00:00');

  const balanceMap = {};
  s.balanceHistory.forEach(b => { balanceMap[b.date] = b.score; });

  const logCountMap = {};
  s.logs.forEach(l => {
    logCountMap[l.date] = (logCountMap[l.date] || 0) + 1;
  });

  const days = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(todayParsed);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const monthLabels = [];
  let prevMonth = -1;
  days.forEach((dateStr, idx) => {
    const month = new Date(dateStr + 'T12:00:00').getMonth();
    if (month !== prevMonth) {
      monthLabels.push({ index: idx, label: MONTHS_SHORT[month] });
      prevMonth = month;
    }
  });

  monthLabels.forEach((m, mi) => {
    const span = makeEl('span', 'hmm', m.label);
    if (mi < monthLabels.length - 1) {
      const nextIdx = monthLabels[mi + 1].index;
      const spaceForNext = nextIdx - m.index;
      span.style.minWidth = Math.max(20, spaceForNext * 14) + 'px';
    }
    monthsContainer.appendChild(span);
  });

  let cellIndex = 0;
  for (let week = 0; week < HEATMAP_WEEKS; week++) {
    const row = makeEl('div', 'hmrow');
    for (let d = 0; d < 7; d++) {
      const dateStr = days[cellIndex];
      const cell = makeEl('div', 'hmc');
      cell.style.cursor = 'pointer';

      if (dateStr) {
        const bal = balanceMap[dateStr];
        const logCount = logCountMap[dateStr] || 0;
        const activityLevel = bal != null ? bal : (logCount > 0 ? Math.min(logCount * 25, 100) : 0);
        const level = activityLevel > 75 ? 4 : activityLevel > 50 ? 3 : activityLevel > 25 ? 2 : activityLevel > 0 ? 1 : 0;
        if (level > 0) cell.classList.add('l' + level);

        const parts = [dateStr];
        if (bal != null) parts.push('Score: ' + bal);
        if (logCount > 0) parts.push(logCount + ' log' + (logCount !== 1 ? 's' : ''));
        if (parts.length === 1) parts.push('No data');
        cell.title = parts.join(' · ');
      } else {
        cell.title = 'No data';
      }

      cell.addEventListener('mouseenter', () => { cell.style.transform = 'scale(1.4)'; });
      cell.addEventListener('mouseleave', () => { cell.style.transform = ''; });

      row.appendChild(cell);
      cellIndex++;
    }
    gridContainer.appendChild(row);
  }

  const legendRow = makeEl('div', '');
  legendRow.style.cssText = 'display:flex;align-items:center;gap:5px;padding-top:10px;justify-content:flex-end';

  const lessLabel = makeEl('span', '', 'Less');
  lessLabel.style.cssText = 'font-size:10px;color:var(--tm);margin-right:2px';
  legendRow.appendChild(lessLabel);

  const levels = [0, 1, 2, 3, 4];
  levels.forEach(l => {
    const dot = makeEl('div', 'hmc' + (l > 0 ? ' l' + l : ''));
    dot.style.cursor = 'default';
    dot.style.width = '10px';
    dot.style.height = '10px';
    legendRow.appendChild(dot);
  });

  const moreLabel = makeEl('span', '', 'More');
  moreLabel.style.cssText = 'font-size:10px;color:var(--tm);margin-left:2px';
  legendRow.appendChild(moreLabel);

  gridContainer.appendChild(legendRow);
}

function renderCorrelationPanel(s) {
  const container = document.getElementById('corr-panel');
  if (!container) return;
  container.innerHTML = '';

  CORRELATIONS.forEach(corr => {
    const row = makeEl('div', 'corrrow');

    const leftCol = makeEl('div', '');
    leftCol.style.cssText = 'flex:1;min-width:0';

    const labelEl = makeEl('span', 'corr-l', corr.label);

    const descEl = makeEl('div', '');
    descEl.textContent = corr.desc;
    descEl.style.cssText = 'font-size:10px;color:var(--tm);margin-top:2px;line-height:1.4';

    leftCol.appendChild(labelEl);
    leftCol.appendChild(descEl);

    const rightCol = makeEl('div', 'corr-r');

    const barWrap = makeEl('div', 'corrbar');
    const fill = makeEl('div', 'corrfill');
    fill.style.width = '0%';
    fill.style.background = corr.color;
    fill.style.transition = 'width 1s ease 0.3s';
    barWrap.appendChild(fill);

    setTimeout(() => {
      fill.style.width = corr.pct + '%';
    }, 400);

    const coeffEl = makeEl('span', '');
    coeffEl.textContent = corr.coeff;
    coeffEl.style.cssText = 'font-size:12px;font-family:var(--mono);color:var(--ts);min-width:44px;text-align:right;font-weight:500';

    rightCol.appendChild(barWrap);
    rightCol.appendChild(coeffEl);

    row.appendChild(leftCol);
    row.appendChild(rightCol);
    container.appendChild(row);
  });
}

function renderGlobe(s) {
  const wrap = document.getElementById('globe-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const dataPoints = s.balanceHistory.slice(-30).map(b => ({
    date: b.date,
    score: b.score,
    value: b.score,
  }));

  if (dataPoints.length < 2) {
    const note = makeEl('div', 'globe-note');
    note.innerHTML = '🌍<br><br>Not enough data to display the Life Atlas.<br>Keep tracking daily to populate your globe.';
    wrap.appendChild(note);
    return;
  }

  try {
    Bridge.Globe.show('globe-wrap', dataPoints);
  } catch (e) {
    const fallback = makeEl('div', 'globe-note');
    fallback.innerHTML = '🌍<br><br>3D Life Atlas<br><em style="font-size:10px;opacity:.55">Install @neura-lumina/capacitor-globe<br>for Metal / Vulkan native rendering</em>';
    wrap.appendChild(fallback);
  }
}

function renderSummaryStats(s) {
  const container = document.querySelector('#scr-insights .stcard');
  if (!container) return;
  container.innerHTML = '';

  const stats = State.getStats();
  const activeDays = new Set(s.logs.map(l => l.date)).size;
  const uniqueDates = new Set(s.balanceHistory.map(b => b.date));
  const trackedDays = uniqueDates.size;

  const avgScore = s.balanceHistory.length
    ? Math.round(sumBy(s.balanceHistory, b => b.score) / s.balanceHistory.length)
    : 0;

  const items = [
    { val: stats.totalLogs, lbl: 'Total logs' },
    { val: activeDays, lbl: 'Active days' },
    { val: stats.bestStreak, lbl: 'Best streak' },
    { val: avgScore, lbl: 'Avg score' },
  ];

  items.forEach(item => {
    const card = makeEl('div', 'sti');
    card.appendChild(makeEl('div', 'stn', String(item.val)));
    card.appendChild(makeEl('div', 'stl', item.lbl));
    container.appendChild(card);
  });

  const existingNote = container.parentNode.querySelector('.insight-stats-note');
  if (existingNote) existingNote.remove();

  const insightNote = makeEl('div', 'insight-stats-note');
  insightNote.style.cssText = 'padding:8px 20px 0;font-size:11px;color:var(--tm);line-height:1.5';
  insightNote.textContent = 'Tracked ' + trackedDays + ' day' + (trackedDays !== 1 ? 's' : '') +
    ' with balance scores · Lv.' + (stats.level || 0) + ' · ' + (stats.totalXP || 0) + ' total XP · ' +
    (stats.achievementsUnlocked || 0) + '/' + ' achievements';
  container.parentNode.insertBefore(insightNote, container.nextSibling);
}

function renderHabitBreakdown(s) {
  const insightsScroll = document.querySelector('#scr-insights .scroll');
  if (!insightsScroll) return;

  let habitSection = document.querySelector('#habit-breakdown-card');
  const needsCreate = !habitSection;

  if (!needsCreate) {
    habitSection.innerHTML = '';
  } else {
    habitSection = makeEl('div', 'card');
    habitSection.id = 'habit-breakdown-card';
  }

  const ch = makeEl('div', 'ch');
  ch.appendChild(makeEl('span', 'ct', 'Habit Completion'));

  const totalDone = s.habits.filter(h => h.done).length;
  const total = s.habits.length;
  const pct = total > 0 ? Math.round(totalDone / total * 100) : 0;
  const badge = makeEl('div', 'ptag', pct + '% today');
  ch.appendChild(badge);
  habitSection.appendChild(ch);

  if (!s.habits.length) {
    habitSection.appendChild(makeEl('div', 'empty', 'No habits defined yet. Create habits in the home screen.'));
    if (needsCreate) {
      const cards = insightsScroll.querySelectorAll('.card');
      const lastCard = cards[cards.length - 1];
      if (lastCard) lastCard.parentNode.insertBefore(habitSection, lastCard.nextSibling);
    }
    return;
  }

  const maxStreak = Math.max(...s.habits.map(h => h.streak || 0), 0);
  const allTimeTotal = sumBy(s.logs, l => l.type === 'habit' ? 1 : 0);

  const streakNote = makeEl('div', '');
  streakNote.style.cssText = 'font-size:10px;color:var(--tm);padding:0 0 8px;line-height:1.4';
  streakNote.textContent = 'Best streak: ' + maxStreak + ' day' + (maxStreak !== 1 ? 's' : '') +
    ' · ' + allTimeTotal + ' total habit log' + (allTimeTotal !== 1 ? 's' : '');
  habitSection.appendChild(streakNote);

  const barContainer = makeEl('div', '');
  barContainer.style.cssText = 'margin-top:2px';

  s.habits.forEach(h => {
    const row = makeEl('div', '');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0';

    const emoji = makeEl('span', '', h.emoji || '⭐');
    emoji.style.cssText = 'font-size:15px;width:22px;text-align:center;flex-shrink:0';

    const name = makeEl('span', '');
    name.textContent = h.name;
    name.style.cssText = 'font-size:12px;color:var(--tp);min-width:68px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0';

    const barOuter = makeEl('div', '');
    barOuter.style.cssText = 'flex:1;height:6px;background:var(--s3);border-radius:var(--rpill);overflow:hidden';

    const barInner = makeEl('div', '');
    const barPct = h.done ? 100 : 0;
    barInner.style.cssText = 'height:100%;background:var(--accent);border-radius:var(--rpill);transition:width 0.5s ease';
    barInner.style.width = '0%';

    barOuter.appendChild(barInner);

    setTimeout(() => {
      barInner.style.width = barPct + '%';
    }, 100);

    const status = makeEl('span', '');
    status.textContent = h.done ? '✅' : '○';
    status.style.cssText = 'font-size:12px;flex-shrink:0;opacity:' + (h.done ? '1' : '0.4');

    const streakEl = makeEl('span', '');
    streakEl.textContent = '🔥' + (h.streak || 0);
    streakEl.style.cssText = 'font-size:10px;color:var(--tm);min-width:26px;text-align:right;flex-shrink:0';

    row.appendChild(emoji);
    row.appendChild(name);
    row.appendChild(barOuter);
    row.appendChild(status);
    row.appendChild(streakEl);
    barContainer.appendChild(row);
  });

  habitSection.appendChild(barContainer);

  if (needsCreate) {
    const cards = insightsScroll.querySelectorAll('.card');
    const lastCard = cards[cards.length - 1];
    if (lastCard) lastCard.parentNode.insertBefore(habitSection, lastCard.nextSibling);
  }
}

function renderWeeklyComparison(s) {
  const insightsScroll = document.querySelector('#scr-insights .scroll');
  if (!insightsScroll) return;

  let compSection = document.querySelector('#weekly-comp-card');
  const needsCreate = !compSection;

  if (!needsCreate) {
    compSection.innerHTML = '';
  } else {
    compSection = makeEl('div', 'card');
    compSection.id = 'weekly-comp-card';
  }

  const ch = makeEl('div', 'ch');
  ch.appendChild(makeEl('span', 'ct', 'Weekly Comparison'));

  function getWeekScore(offsetWeeks) {
    let total = 0;
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = daysAgo(offsetWeeks * 7 + i);
      const bh = s.balanceHistory.find(b => b.date === d);
      if (bh) {
        total += bh.score;
        count++;
      }
    }
    return count > 0 ? Math.round(total / count) : 0;
  }

  const thisWeek = getWeekScore(0);
  const lastWeek = getWeekScore(1);

  const diff = thisWeek - lastWeek;

  function getTrendText(d) {
    if (d >= 15) return 'Major improvement';
    if (d >= 5) return 'Slight improvement';
    if (d > -5) return 'Holding steady';
    if (d > -15) return 'Slight decline';
    return 'Significant decline';
  }

  const trendText = getTrendText(diff);
  const diffStr = diff >= 0 ? '+' + diff : String(diff);
  const diffColor = diff >= 0 ? 'var(--accent)' : 'var(--danger)';
  const diffArrow = diff >= 0 ? '↑' : '↓';

  const badge = makeEl('div', 'ptag', diffArrow + ' ' + diffStr);
  badge.style.cssText = 'color:#000;background:' + (diff >= 0 ? 'rgba(0,229,160,0.2)' : 'rgba(255,77,106,0.2)') + ';border-color:transparent;font-weight:600';
  ch.appendChild(badge);
  compSection.appendChild(ch);

  const row = makeEl('div', '');
  row.style.cssText = 'display:flex;gap:12px;padding-top:8px';

  const thisCard = makeEl('div', '');
  thisCard.style.cssText = 'flex:1;background:var(--s2);border-radius:var(--rmd);padding:12px;text-align:center';
  const thisLabel = makeEl('div', '', 'This week');
  thisLabel.style.cssText = 'font-size:10px;color:var(--tm);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px';
  const thisVal = makeEl('div', '');
  thisVal.textContent = String(thisWeek);
  thisVal.style.cssText = 'font-size:26px;font-family:var(--mono);color:var(--tp);font-weight:500';
  thisCard.appendChild(thisLabel);
  thisCard.appendChild(thisVal);

  const lastCard = makeEl('div', '');
  lastCard.style.cssText = 'flex:1;background:var(--s2);border-radius:var(--rmd);padding:12px;text-align:center';
  const lastLabel = makeEl('div', '', 'Last week');
  lastLabel.style.cssText = 'font-size:10px;color:var(--tm);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px';
  const lastVal = makeEl('div', '');
  lastVal.textContent = String(lastWeek);
  lastVal.style.cssText = 'font-size:26px;font-family:var(--mono);color:var(--ts);font-weight:500';
  lastCard.appendChild(lastLabel);
  lastCard.appendChild(lastVal);

  row.appendChild(thisCard);
  row.appendChild(lastCard);

  compSection.appendChild(row);

  const trendLine = makeEl('div', '');
  trendLine.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;padding-top:10px;font-size:12px;color:' + diffColor + ';font-weight:500';
  trendLine.textContent = diffArrow + ' ' + diffStr + ' points · ' + trendText;
  compSection.appendChild(trendLine);

  const sparkline = makeEl('div', '');
  sparkline.style.cssText = 'display:flex;align-items:flex-end;gap:2px;padding-top:10px;height:32px';

  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    const bh = s.balanceHistory.find(b => b.date === d);
    const sc = bh ? bh.score : 0;
    const barH = Math.max(2, sc / 100 * 24);
    const seg = makeEl('div', '');
    const isThisWeek = i < 7;
    seg.style.cssText = 'flex:1;border-radius:2px 2px 0 0;transition:height 0.3s ease';
    seg.style.height = barH.toFixed(0) + 'px';
    seg.style.background = isThisWeek ? 'var(--accent)' : 'var(--s4)';
    seg.style.opacity = isThisWeek ? '0.8' : '0.4';
    seg.title = d + ': ' + sc;
    sparkline.appendChild(seg);
  }
  compSection.appendChild(sparkline);

  if (needsCreate) {
    const cards = insightsScroll.querySelectorAll('.card');
    const lastCard = cards[cards.length - 1];
    if (lastCard) lastCard.parentNode.insertBefore(compSection, lastCard.nextSibling);
  }
}

function renderMoodDistribution(s) {
  const insightsScroll = document.querySelector('#scr-insights .scroll');
  if (!insightsScroll) return;

  let moodSection = document.querySelector('#mood-dist-card');
  const needsCreate = !moodSection;

  if (!needsCreate) {
    moodSection.innerHTML = '';
  } else {
    moodSection = makeEl('div', 'card');
    moodSection.id = 'mood-dist-card';
  }

  const ch = makeEl('div', 'ch');
  ch.appendChild(makeEl('span', 'ct', 'Mood Distribution'));

  const moodLogs = s.logs.filter(l => l.type === 'mood');
  const uniqueMoodDays = new Set(s.journal.filter(j => j.mood).map(j => j.date));

  const badge = makeEl('div', 'ptag', (uniqueMoodDays.size || moodLogs.length) + ' check-ins');
  ch.appendChild(badge);
  moodSection.appendChild(ch);

  if (!moodLogs.length && !s.journal.filter(j => j.mood).length) {
    moodSection.appendChild(makeEl('div', 'empty', 'No mood data yet. Log your mood to see distribution.'));
    if (needsCreate) {
      const cards = insightsScroll.querySelectorAll('.card');
      const lastCard = cards[cards.length - 1];
      if (lastCard) lastCard.parentNode.insertBefore(moodSection, lastCard.nextSibling);
    }
    return;
  }

  const moodCounts = {};
  MOODS.forEach(m => { moodCounts[m.emoji] = 0; });

  moodLogs.forEach(l => {
    if (l.emoji && moodCounts[l.emoji] != null) moodCounts[l.emoji]++;
  });
  s.journal.forEach(j => {
    if (j.mood && moodCounts[j.mood] != null) moodCounts[j.mood]++;
  });

  const totalMoods = sumBy(Object.values(moodCounts), v => v);
  const sortedMoods = [...MOODS].reverse();

  const barContainer = makeEl('div', '');
  barContainer.style.cssText = 'margin-top:6px';

  sortedMoods.forEach(m => {
    const count = moodCounts[m.emoji] || 0;
    const pct = totalMoods > 0 ? Math.round(count / totalMoods * 100) : 0;
    if (count === 0) return;

    const row = makeEl('div', '');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0';

    const emoji = makeEl('span', '', m.emoji);
    emoji.style.cssText = 'font-size:16px;width:26px;text-align:center;flex-shrink:0';

    const barOuter = makeEl('div', '');
    barOuter.style.cssText = 'flex:1;height:8px;background:var(--s3);border-radius:var(--rpill);overflow:hidden';

    const barInner = makeEl('div', '');
    barInner.style.cssText = 'height:100%;background:var(--accent);border-radius:var(--rpill);transition:width 0.6s ease';
    barInner.style.width = '0%';
    barOuter.appendChild(barInner);

    setTimeout(() => {
      barInner.style.width = pct + '%';
    }, 200);

    const label = makeEl('span', '');
    label.textContent = count + ' (' + pct + '%)';
    label.style.cssText = 'font-size:10px;color:var(--ts);font-family:var(--mono);min-width:50px;text-align:right;flex-shrink:0';

    row.appendChild(emoji);
    row.appendChild(barOuter);
    row.appendChild(label);
    barContainer.appendChild(row);
  });

  moodSection.appendChild(barContainer);

  if (needsCreate) {
    const cards = insightsScroll.querySelectorAll('.card');
    const lastCard = cards[cards.length - 1];
    if (lastCard) lastCard.parentNode.insertBefore(moodSection, lastCard.nextSibling);
  }
}

export default renderInsights;
