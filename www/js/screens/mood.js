import State from '../state.js';
import i18n from '../i18n.js';
import { MOODS } from '../constants.js';
import { today, daysAgo, daysBetween, dateStr, dateStrShort, escapeHtml, calculateStreak, weekStart, monthStart, groupBy } from '../helpers.js';

const MOOD_EMOJIS = MOODS.map(m => m.emoji);
const MOOD_SCORES = {};
MOODS.forEach(m => { MOOD_SCORES[m.emoji] = m.score; });

const MOOD_LABELS = {};
MOODS.forEach(m => { MOOD_LABELS[m.emoji] = m.label; });

function computeMoodTrend(s) {
  const entries = [];
  const moodLog = s.mood.emoji && s.mood.date === today() ? [{ date: today(), emoji: s.mood.emoji }] : [];
  const journalMoods = (s.journal || []).filter(j => j.mood && MOOD_EMOJIS.includes(j.mood)).map(j => ({ date: j.date, emoji: j.mood }));
  const combined = [...moodLog, ...journalMoods];
  const byDate = {};
  combined.forEach(c => { byDate[c.date] = c.emoji; });
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    entries.push({ date: d, emoji: byDate[d] || '' });
  }
  return entries;
}

function computeMoodStats(s) {
  const allMoods = [];
  if (s.mood.emoji && s.mood.date === today()) {
    allMoods.push({ emoji: s.mood.emoji, date: s.mood.date });
  }
  (s.journal || []).filter(j => j.mood && MOOD_EMOJIS.includes(j.mood)).forEach(j => {
    allMoods.push({ emoji: j.mood, date: j.date });
  });
  const freq = {};
  allMoods.forEach(m => { freq[m.emoji] = (freq[m.emoji] || 0) + 1; });
  let mostCommon = '';
  let maxCount = 0;
  for (const [emoji, count] of Object.entries(freq)) {
    if (count > maxCount) { mostCommon = emoji; maxCount = count; }
  }
  const uniqueDates = new Set(allMoods.map(m => m.date));
  const streak = calculateStreak(allMoods, 'date');
  const totalDays = uniqueDates.size;
  return { mostCommon, maxCount, streak, totalDays, totalEntries: allMoods.length };
}

function renderMoodPicker(s) {
  const current = s.mood.emoji;
  const currentMood = MOODS.find(m => m.emoji === current);
  return `
    <div class="card" style="padding-bottom:12px">
      <div class="ch">
        <span class="ct">${i18n.t('mood.howAreYou')}</span>
        <span class="ca" id="mood-saved" style="color:var(--tm);font-size:11px;font-weight:400">${current ? `Today: ${current} ${currentMood?.label || ''}` : ''}</span>
      </div>
      <div class="mgrid" id="mood-picker">
        ${MOOD_EMOJIS.map(e => `
          <span class="mem${current === e ? ' sel' : ''}" data-emoji="${e}" onclick="App._setMood('${e}', this)" style="font-size:36px;padding:8px 10px;border-radius:var(--rmd);transition:all .15s">${e}</span>
        `).join('')}
      </div>
      ${current ? `
        <div style="text-align:center;padding:8px 0 2px;font-size:13px;color:var(--ts)">
          ${current} ${currentMood?.label || ''}
          <span style="display:inline-block;margin-left:8px;font-size:10px;color:var(--tm);background:var(--s3);padding:2px 8px;border-radius:var(--rpill)">Logged ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
        </div>
      ` : '<div style="text-align:center;padding:8px 0 2px;font-size:12px;color:var(--tm)">Tap an emoji to log your mood</div>'}
    </div>`;
}

function renderGratitudeSection(s) {
  const gratitudes = s.gratitudes || [];
  const recent = gratitudes.slice(0, 25);
  const grouped = {};
  recent.forEach(g => {
    const key = g.date || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const streak = calculateStreak(gratitudes, 'date');
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">${i18n.t('mood.gratitude')}</span>
        <div style="display:flex;align-items:center;gap:8px">
          ${streak >= 2 ? `<span style="font-size:10px;color:var(--accent);background:var(--adim);padding:2px 8px;border-radius:var(--rpill)">${streak}d streak 🔥</span>` : ''}
          <span class="ca" onclick="App.sheets.gratitude()">${i18n.t('mood.addGratitude')}</span>
        </div>
      </div>
      <div class="dr" id="grat-list">
        ${recent.length === 0 ? `
          <div class="empty" style="text-align:center;padding:18px 4px">
            <div style="font-size:32px;margin-bottom:8px">🙏</div>
            <div style="font-size:13px;color:var(--ts)">No gratitude entries yet.</div>
            <div style="font-size:11px;color:var(--tm);margin-top:4px">Start by writing something you're thankful for today.</div>
          </div>
        ` : sortedDates.map(dateKey => `
          <div style="font-size:10px;color:var(--tm);padding:6px 4px 3px;font-family:var(--mono);letter-spacing:0.3px">${dateKey === today() ? 'Today' : dateKey === daysAgo(1) ? 'Yesterday' : dateStrShort(dateKey)}</div>
          ${grouped[dateKey].map(g => `
            <div class="dri">
              <div class="dri-l">
                <div class="dri-ic" style="background:rgba(245,166,35,.12)">🙏</div>
                <div>
                  <div class="dri-name">${escapeHtml(g.text)}</div>
                  <div class="dri-sub">${dateStrShort(g.date)}</div>
                </div>
              </div>
              <div class="dri-r">
                <span class="del-btn" onclick="App._deleteGratitude('${g.id}')">${i18n.t('common.delete')}</span>
              </div>
            </div>
          `).join('')}
        `).join('')}
      </div>
    </div>`;
}

function renderMoodChart(s) {
  const trend = computeMoodTrend(s);
  const maxScoreIdx = MOODS.length - 1;
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-GB', { weekday: 'short' }));
  }
  const green = (pct) => `rgba(0,229,160,${0.2 + pct * 0.8})`;
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Mood Trend</span>
        <span style="font-size:10px;color:var(--tm)">Last 7 days</span>
      </div>
      <div class="cwrap" style="height:130px;align-items:flex-end;gap:6px">
        ${trend.map((entry, i) => {
          const moodIdx = entry.emoji ? MOOD_EMOJIS.indexOf(entry.emoji) : -1;
          const height = moodIdx >= 0 ? ((moodIdx + 1) / (maxScoreIdx + 1)) * 100 : 4;
          const isToday = entry.date === today();
          return `
            <div class="cbwrap" style="flex:1">
              <div style="font-size:18px;line-height:1;margin-bottom:4px;transition:all .3s">${entry.emoji || '—'}</div>
              <div class="cb" style="height:${height}%;background:${moodIdx >= 0 ? green(moodIdx / maxScoreIdx) : 'var(--s3)'};border-radius:4px 4px 0 0;min-height:4px;width:100%;transition:height 0.6s cubic-bezier(0.4,0,0.2,1)"></div>
              <span class="cday" style="font-size:9px">${labels[i]}</span>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderMoodStats(s) {
  const stats = computeMoodStats(s);
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Mood Statistics</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:4px 0">
        <div style="text-align:center;background:var(--s2);border-radius:var(--rmd);padding:12px 8px">
          <div style="font-size:28px;margin-bottom:4px">${stats.mostCommon || '—'}</div>
          <div style="font-size:10px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Most Common</div>
          ${stats.maxCount > 0 ? `<div style="font-size:10px;color:var(--ts);margin-top:2px">${stats.maxCount}x</div>` : ''}
        </div>
        <div style="text-align:center;background:var(--s2);border-radius:var(--rmd);padding:12px 8px">
          <div style="font-size:24px;font-weight:600;font-family:var(--mono);color:var(--accent)">${stats.streak}</div>
          <div style="font-size:10px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Day Streak</div>
        </div>
        <div style="text-align:center;background:var(--s2);border-radius:var(--rmd);padding:12px 8px">
          <div style="font-size:24px;font-weight:600;font-family:var(--mono);color:var(--ts)">${stats.totalDays}</div>
          <div style="font-size:10px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Days Tracked</div>
        </div>
      </div>
      ${stats.totalEntries > 0 ? `
        <div style="margin-top:8px;padding-top:8px;border-top:0.5px solid var(--border)">
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
            ${MOOD_EMOJIS.map(e => {
              const count = stats.totalEntries > 0 ? Math.round(((s.journal || []).filter(j => j.mood === e).length + (s.mood.emoji === e ? 1 : 0)) / stats.totalEntries * 100) : 0;
              return `<span style="font-size:13px;background:var(--s3);padding:3px 8px;border-radius:var(--rpill)">${e} ${count}%</span>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>`;
}

function renderWellbeingSection(s) {
  const checks = s.wellbeingChecks || [];
  const lastCheck = checks.length > 0 ? checks[0] : null;
  const recentChecks = checks.slice(0, 5);
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Wellbeing Check-in</span>
        <span class="ca" onclick="App.sheets.wellbeing()">+ Check</span>
      </div>
      ${lastCheck ? `
        <div style="display:flex;gap:8px;padding:2px 0 6px">
          <div style="flex:1;text-align:center;background:var(--s2);border-radius:var(--rmd);padding:10px">
            <div style="font-size:24px;font-weight:600;font-family:var(--mono);color:${lastCheck.score >= 7 ? 'var(--accent)' : lastCheck.score >= 4 ? 'var(--warn)' : 'var(--danger)'}">${lastCheck.score}/10</div>
            <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Latest</div>
          </div>
          <div style="flex:1;text-align:center;background:var(--s2);border-radius:var(--rmd);padding:10px">
            <div style="font-size:24px;font-weight:600;font-family:var(--mono);color:var(--ts)">${checks.length}</div>
            <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Total Checks</div>
          </div>
          <div style="flex:1;text-align:center;background:var(--s2);border-radius:var(--rmd);padding:10px">
            <div style="font-size:24px;font-weight:600;font-family:var(--mono);color:var(--ts)">${lastCheck.date === today() ? 'Today' : dateStrShort(lastCheck.date)}</div>
            <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Last Check</div>
          </div>
        </div>
        ${recentChecks.length > 1 ? `
          <div style="border-top:0.5px solid var(--border);padding-top:6px;margin-top:2px">
            <div style="font-size:10px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:4px">Recent</div>
            ${recentChecks.slice(1).map(c => `
              <div class="dri" style="padding:6px 0">
                <div class="dri-l">
                  <div class="dri-ic" style="background:rgba(77,159,255,.12);width:26px;height:26px">🧠</div>
                  <div>
                    <div class="dri-name" style="font-size:12px">Score: ${c.score}/10</div>
                    <div class="dri-sub">${dateStrShort(c.date)}${c.note ? ' · ' + escapeHtml(c.note) : ''}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${lastCheck.note ? `<div style="margin-top:4px;padding:6px 8px;background:var(--s2);border-radius:var(--rsm);font-size:12px;color:var(--ts);line-height:1.5">${escapeHtml(lastCheck.note)}</div>` : ''}
      ` : `
        <div class="empty" style="text-align:center;padding:14px 4px">
          <div style="font-size:28px;margin-bottom:6px">🧠</div>
          <div style="font-size:13px;color:var(--ts)">How are you feeling today?</div>
          <div style="font-size:11px;color:var(--tm);margin-top:2px">Check in to track your mental wellbeing over time.</div>
        </div>
      `}
    </div>`;
}

function renderMeditationSection(s) {
  const focusHistory = s.focusHistory || [];
  const meditationSessions = focusHistory.filter(f => f.type === 'meditation' || f.type === 'pomodoro');
  const totalMeditationMin = meditationSessions.reduce((sum, f) => sum + (f.duration || 0), 0);
  const totalSessions = meditationSessions.length;
  const weekSessions = meditationSessions.filter(f => {
    const fDate = f.date || (f.time ? f.time.slice(0, 10) : '');
    return fDate >= weekStart(today());
  }).length;
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Meditation</span>
        <span class="ca" onclick="App.sheets.meditationLog()">Log</span>
      </div>
      <div style="display:flex;gap:8px;padding:4px 0">
        <button class="tbtn" style="flex:1;text-align:center;padding:10px 8px;font-size:12px" onclick="App.startPomodoro(5)">🧘 5 min</button>
        <button class="tbtn" style="flex:1;text-align:center;padding:10px 8px;font-size:12px" onclick="App.startPomodoro(10)">🧘 10 min</button>
        <button class="tbtn" style="flex:1;text-align:center;padding:10px 8px;font-size:12px" onclick="App.startPomodoro(15)">🧘 15 min</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:6px 0 2px;border-top:0.5px solid var(--border);margin-top:6px">
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:600;font-family:var(--mono);color:var(--accent)">${totalSessions}</div>
          <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Sessions</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:600;font-family:var(--mono);color:var(--ts)">${Math.floor(totalMeditationMin / 60)}h ${totalMeditationMin % 60}m</div>
          <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Total Time</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:600;font-family:var(--mono);color:var(--ts)">${weekSessions}</div>
          <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">This Week</div>
        </div>
      </div>
      ${totalSessions > 0 && totalMeditationMin >= 600 ? '<div style="text-align:center;padding:4px 0 0;font-size:10px;color:var(--accent)">🏆 10+ hours of practice — amazing dedication!</div>' : ''}
    </div>`;
}

function renderQuickReflection(s) {
  const recentLogs = (s.logs || []).filter(l => l.type === 'mood' || l.type === 'journal').slice(0, 5);
  if (recentLogs.length === 0) return '';
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Recent Reflections</span>
      </div>
      <div class="llist">
        ${recentLogs.map(l => `
          <div class="li">
            <div class="lic" style="background:rgba(245,166,35,.12);font-size:16px">${l.emoji || '📝'}</div>
            <div class="linfo">
              <div class="ltit">${escapeHtml(l.title)}</div>
              <div class="lsub">${l.time} · ${l.date}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderFooter() {
  return `
    <div class="footer" style="padding:4px 0 12px">
      <p>Built by <strong>Neura Lumina</strong> · <a href="https://github.com/AmelCMM" target="_blank">@AmelCMM</a></p>
    </div>
    <div style="height:8px"></div>`;
}

export function renderMood(s, app) {
  const scrollEl = document.querySelector('#scr-mood .scroll');
  if (!scrollEl) return;
  scrollEl.innerHTML = `
    ${renderMoodPicker(s)}
    ${renderGratitudeSection(s)}
    ${renderMoodChart(s)}
    ${renderMoodStats(s)}
    ${renderWellbeingSection(s)}
    ${renderMeditationSection(s)}
    ${renderQuickReflection(s)}
    ${renderFooter()}
  `;
}
