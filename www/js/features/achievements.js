import State from '../state.js';
import { uid, today } from '../helpers.js';
import { ACHIEVEMENTS, XP_LEVELS } from '../constants.js';

const ACHIEVEMENT_DEFINITIONS = [
  ...ACHIEVEMENTS,
  { id: 'water_30', title: 'Aqua Master', desc: 'Hit water goal 30 days straight', icon: '💧', xp: 150 },
  { id: 'mood_90', title: 'Emotional Intelligence', desc: 'Log mood for 90 days', icon: '📊', xp: 300 },
  { id: 'exercise_30', title: 'Athlete', desc: 'Complete 30 exercise sessions', icon: '🏃', xp: 200 },
  { id: 'streak_100', title: 'Unstoppable', desc: 'Reach a 100-day streak on any habit', icon: '🔥', xp: 500 },
  { id: 'challenge_5', title: 'Challenge Addict', desc: 'Complete 5 challenges', icon: '🏆', xp: 300 },
  { id: 'medication_30', title: 'Health Manager', desc: 'Log medication 30 times', icon: '💊', xp: 100 },
  { id: 'step_million', title: 'Million Steps', desc: 'Walk 1,000,000 total steps', icon: '👣', xp: 400 },
  { id: 'sleep_90', title: 'Sleep Champion', desc: 'Log sleep for 90 nights', icon: '🌙', xp: 200 },
  { id: 'goal_10', title: 'Goal Crusher', desc: 'Complete 10 goals', icon: '🎯', xp: 250 },
  { id: 'task_100', title: 'Task Terminator', desc: 'Complete 100 tasks', icon: '✅', xp: 200 },
  { id: 'project_5', title: 'Project Master', desc: 'Complete 5 projects', icon: '📋', xp: 300 },
  { id: 'vital_30', title: 'Body Tracker', desc: 'Log 30 vital readings', icon: '📊', xp: 100 },
  { id: 'symptom_20', title: 'Symptom Detective', desc: 'Log 20 symptom entries', icon: '🩺', xp: 100 },
  { id: 'gratitude_30', title: 'Grateful Heart', desc: 'Write 30 gratitude entries', icon: '🙏', xp: 150 },
  { id: 'focus_50h', title: 'Focus Legend', desc: 'Accumulate 50 hours of focus', icon: '⏱️', xp: 500 },
  { id: 'study_50', title: 'Scholar', desc: 'Log 50 study sessions', icon: '📖', xp: 300 },
  { id: 'streak_7_all', title: 'Full House', desc: 'Complete all habits for 7 days straight', icon: '🌟', xp: 200 },
  { id: 'transaction_50', title: 'Treasurer', desc: 'Log 50 transactions', icon: '💰', xp: 150 },
  { id: 'journal_100', title: 'Author', desc: 'Write 100 journal entries', icon: '📚', xp: 500 },
  { id: 'balance_100', title: 'Perfect Balance', desc: 'Reach a perfect 100 balance score', icon: '💎', xp: 500 },
  { id: 'first_challenge', title: 'First Challenge', desc: 'Start your first challenge', icon: '🏁', xp: 20 },
  { id: 'early_adopter', title: 'Early Adopter', desc: 'Use the app for 30 consecutive days', icon: '📱', xp: 100 },
];

const EXTRA_ACHIEVEMENTS = ACHIEVEMENT_DEFINITIONS.filter(
  a => !ACHIEVEMENTS.find(e => e.id === a.id)
);

export function checkAndUnlock() {
  const s = State.get();
  const unlocked = new Set(s.achievements.map(a => a.id));
  const toUnlock = [];

  if (s.habits.filter(h => h.done).length >= 1 && !unlocked.has('first_habit')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'first_habit'));
  }
  if (s.habits.some(h => h.streak >= 7) && !unlocked.has('week_streak')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'week_streak'));
  }
  if (s.habits.some(h => h.streak >= 30) && !unlocked.has('month_streak')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'month_streak'));
  }
  if (s.habits.some(h => h.streak >= 100) && !unlocked.has('streak_100')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'streak_100'));
  }
  if (s.journal.length >= 10 && !unlocked.has('journal_10')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'journal_10'));
  }
  if (s.journal.length >= 50 && !unlocked.has('journal_50')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'journal_50'));
  }
  if (s.journal.length >= 100 && !unlocked.has('journal_100')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'journal_100'));
  }
  const uniqueMoodDays = new Set(s.journal.filter(j => j.mood).map(j => j.date));
  if (uniqueMoodDays.size >= 30 && !unlocked.has('mood_30')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'mood_30'));
  }
  if (uniqueMoodDays.size >= 90 && !unlocked.has('mood_90')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'mood_90'));
  }
  if (s.water && s.water.count >= s.water.goal) {
    if (!unlocked.has('water_7')) {
      const waterStreak = calculateWaterStreak(s);
      if (waterStreak >= 7) toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'water_7'));
      if (waterStreak >= 30 && !unlocked.has('water_30')) {
        toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'water_30'));
      }
    }
  }
  if (s.transactions && s.transactions.length >= 1 && !unlocked.has('finance_first')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'finance_first'));
  }
  if (s.transactions && s.transactions.length >= 50 && !unlocked.has('transaction_50')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'transaction_50'));
  }
  if (s.challenges && s.challenges.some(c => c.completed) && !unlocked.has('challenge_done')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'challenge_done'));
  }
  if (s.challenges && s.challenges.filter(c => c.completed).length >= 5 && !unlocked.has('challenge_5')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'challenge_5'));
  }
  const totalHabitDone = s.habits.reduce((sum, h) => sum + (h.done ? 1 : 0), 0);
  if (totalHabitDone >= 100 && !unlocked.has('habit_100')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'habit_100'));
  }
  if (s.balanceHistory && s.balanceHistory.some(b => b.score >= 90) && !unlocked.has('balance_90')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'balance_90'));
  }
  if (s.balanceHistory && s.balanceHistory.some(b => b.score >= 100) && !unlocked.has('balance_100')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'balance_100'));
  }
  const totalFocusMin = s.focusHistory ? s.focusHistory.reduce((sum, f) => sum + f.duration, 0) : 0;
  if (totalFocusMin >= 600 && !unlocked.has('focus_10h')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'focus_10h'));
  }
  if (totalFocusMin >= 3000 && !unlocked.has('focus_50h')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'focus_50h'));
  }
  if (s.challenges && s.challenges.length >= 1 && !unlocked.has('first_challenge')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'first_challenge'));
  }
  if (s.exercise && s.exercise.length >= 30 && !unlocked.has('exercise_30')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'exercise_30'));
  }
  if (s.medications) {
    const medicationLogs = s.logs.filter(l => l.type === 'medication').length;
    if (medicationLogs >= 30 && !unlocked.has('medication_30')) {
      toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'medication_30'));
    }
  }
  if (s.steps && s.steps.count > 0) {
    const totalSteps = s.logs.filter(l => l.type === 'health' && l.title.includes('Steps'))
      .reduce((sum, l) => {
        const match = l.title.match(/(\d+)/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);
    if (totalSteps >= 1000000 && !unlocked.has('step_million')) {
      toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'step_million'));
    }
  }
  if (s.sleep && s.sleep.hours > 0) {
    const sleepLogs = s.logs.filter(l => l.type === 'health' && l.title.includes('Sleep')).length;
    if (sleepLogs >= 90 && !unlocked.has('sleep_90')) {
      toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'sleep_90'));
    }
  }
  if (s.goals && s.goals.filter(g => g.completed).length >= 10 && !unlocked.has('goal_10')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'goal_10'));
  }
  if (s.tasks && s.tasks.filter(t => t.done).length >= 100 && !unlocked.has('task_100')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'task_100'));
  }
  if (s.vitals && s.vitals.length >= 30 && !unlocked.has('vital_30')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'vital_30'));
  }
  if (s.symptoms && s.symptoms.length >= 20 && !unlocked.has('symptom_20')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'symptom_20'));
  }
  if (s.gratitudes && s.gratitudes.length >= 30 && !unlocked.has('gratitude_30')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'gratitude_30'));
  }
  if (s.journal && s.journal.filter(j => j.mood).length >= 90 && !unlocked.has('mood_90')) {
  }
  const allHabitsDone = s.habits.every(h => h.done);
  if (allHabitsDone && s.habits.length > 0) {
    let fullHouseStreak = 0;
    const d = new Date();
    for (let i = 0; i < 100; i++) {
      const ds = d.toISOString().slice(0, 10);
      const logsOnDay = s.logs.filter(l => l.date === ds && l.type === 'habit');
      const habitsOnDay = s.habits.filter(h => logsOnDay.some(l => l.title.includes(h.name)));
      if (habitsOnDay.length === s.habits.length) {
        fullHouseStreak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    if (fullHouseStreak >= 7 && !unlocked.has('streak_7_all')) {
      toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'streak_7_all'));
    }
  }
  if (s.studySessions && s.studySessions.length >= 50 && !unlocked.has('study_50')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'study_50'));
  }
  if (s.projects && s.projects.filter(p => {
    const tasks = s.tasks.filter(t => t.projectId === p.id);
    return tasks.length > 0 && tasks.every(t => t.done);
  }).length >= 5 && !unlocked.has('project_5')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'project_5'));
  }
  const daysSinceFirstLog = s.logs.length > 0 ? (() => {
    const first = s.logs[s.logs.length - 1];
    if (!first) return 0;
    return Math.floor((Date.now() - new Date(first.timestamp).getTime()) / 86400000);
  })() : 0;
  if (daysSinceFirstLog >= 30 && !unlocked.has('early_adopter')) {
    toUnlock.push(ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'early_adopter'));
  }

  for (const ach of toUnlock) {
    if (ach) {
      s.achievements.push({
        id: ach.id,
        title: ach.title,
        icon: ach.icon,
        desc: ach.desc,
        unlockedAt: new Date().toISOString(),
        xp: ach.xp,
      });
      State.addXP(ach.xp);
      State.addLog(`Achievement: ${ach.title}`, ach.icon, 'achievement');
    }
  }
  if (toUnlock.length > 0) {
    State.save();
    State.notify();
  }
  return toUnlock.filter(Boolean).map(a => ({ id: a.id, title: a.title, icon: a.icon }));
}

function calculateWaterStreak(s) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    const log = s.logs.find(l => l.date === dateStr && l.type === 'water');
    if (!log) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getAchievements() {
  const s = State.get();
  const unlockedIds = new Set(s.achievements.map(a => a.id));
  return ACHIEVEMENT_DEFINITIONS.map(def => {
    const unlocked = s.achievements.find(a => a.id === def.id);
    return {
      ...def,
      unlocked: !!unlocked,
      unlockedAt: unlocked ? unlocked.unlockedAt : null,
      xp: def.xp,
    };
  });
}

export function getRecentAchievements(limit = 5) {
  const s = State.get();
  return [...s.achievements]
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, limit);
}

export function getUnlockedCount() {
  const s = State.get();
  return s.achievements.length;
}

export function getLockedCount() {
  return ACHIEVEMENT_DEFINITIONS.length - getUnlockedCount();
}

export function calculateLevel(xp) {
  const levels = XP_LEVELS;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) return i;
  }
  return 0;
}

export function getNextLevelXP(xp) {
  const levels = XP_LEVELS;
  const current = calculateLevel(xp);
  const next = current + 1;
  if (next >= levels.length) return Infinity;
  return levels[next] - xp;
}

export function getLevelProgress(xp) {
  const levels = XP_LEVELS;
  const current = calculateLevel(xp);
  const currentLevelXP = levels[current];
  const nextLevelXP = current + 1 < levels.length ? levels[current + 1] : currentLevelXP + 1000;
  const earned = xp - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  return needed > 0 ? Math.min(100, Math.round((earned / needed) * 100)) : 100;
}

export function calculateTotalXP() {
  const s = State.get();
  let total = 0;
  total += s.achievements.reduce((sum, a) => sum + (a.xp || 0), 0);
  total += s.habits.filter(h => h.done).length * 5;
  total += s.journal.length * 10;
  total += s.logs.filter(l => l.type === 'mood').length * 3;
  total += s.logs.filter(l => l.type === 'health' && l.title.includes('Exercise')).length * 5;
  total += s.logs.filter(l => l.type === 'challenge').length * 5;
  total += s.logs.filter(l => l.type === 'goal').length * 50;
  total += s.logs.filter(l => l.type === 'gratitude').length * 3;
  total += s.tasks ? s.tasks.filter(t => t.done).length * 5 : 0;
  if (s.focusHistory) {
    total += s.focusHistory.reduce((sum, f) => sum + f.duration, 0);
  }
  total += s.transactions ? s.transactions.length * 2 : 0;
  return total;
}

export function getAchievementsByCategory() {
  const achievements = getAchievements();
  const early = achievements.filter(a => a.xp <= 50);
  const mid = achievements.filter(a => a.xp > 50 && a.xp <= 200);
  const late = achievements.filter(a => a.xp > 200);
  return { early, mid, late };
}

export function getLatestUnlocked() {
  const s = State.get();
  if (!s.achievements.length) return null;
  return s.achievements.reduce((latest, a) => {
    return a.unlockedAt > latest.unlockedAt ? a : latest;
  }, s.achievements[0]);
}

export function getNextAchievements(limit = 3) {
  const achievements = getAchievements();
  const locked = achievements.filter(a => !a.unlocked);
  const xp = State.get().xp || 0;
  const difficulty = (a) => {
    if (a.xp <= 50) return 0;
    if (a.xp <= 200) return 1;
    return 2;
  };
  return locked.sort((a, b) => difficulty(a) - difficulty(b) || a.xp - b.xp).slice(0, limit);
}

export function renderAchievementList() {
  const container = document.createElement('div');
  container.className = 'achievement-grid';
  const achievements = getAchievements();
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const header = document.createElement('div');
  header.className = 'achievement-header';
  header.innerHTML = `
    <div class="achievement-summary">
      <span class="achievement-count">${unlockedCount}/${totalCount}</span>
      <span class="achievement-label">unlocked</span>
    </div>
    <div class="achievement-progress-bar">
      <div class="achievement-progress-fill" style="width:${totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%"></div>
    </div>
  `;
  container.appendChild(header);
  achievements.forEach(ach => {
    const card = document.createElement('div');
    card.className = `achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `
      <div class="achievement-icon">${ach.unlocked ? ach.icon : '🔒'}</div>
      <div class="achievement-info">
        <div class="achievement-title">${ach.title}</div>
        <div class="achievement-desc">${ach.desc}</div>
        <div class="achievement-xp">+${ach.xp} XP</div>
      </div>
      ${ach.unlocked && ach.unlockedAt ? `
        <div class="achievement-date">${new Date(ach.unlockedAt).toLocaleDateString()}</div>
      ` : ''}
    `;
    container.appendChild(card);
  });
  return container;
}

export function renderAchievementNotification(achievement) {
  const el = document.createElement('div');
  el.className = 'achievement-notification';
  el.innerHTML = `
    <div class="achievement-notif-icon">${achievement.icon}</div>
    <div class="achievement-notif-body">
      <div class="achievement-notif-title">Achievement Unlocked!</div>
      <div class="achievement-notif-name">${achievement.title}</div>
    </div>
  `;
  return el;
}

const Achievements = {
  checkAndUnlock,
  getAchievements,
  getRecentAchievements,
  getUnlockedCount,
  getLockedCount,
  calculateLevel,
  getNextLevelXP,
  getLevelProgress,
  calculateTotalXP,
  getAchievementsByCategory,
  getLatestUnlocked,
  getNextAchievements,
  renderAchievementList,
  renderAchievementNotification,
  ACHIEVEMENT_DEFINITIONS,
  EXTRA_ACHIEVEMENTS,
};

export default Achievements;
