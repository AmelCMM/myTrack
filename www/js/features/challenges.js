import State from '../state.js';
import { uid, today, daysAgo, daysFromNow, dateStr, truncate, escapeHtml } from '../helpers.js';
import { CHALLENGE_DIFFICULTY, HABIT_TEMPLATES } from '../constants.js';

export const PRESET_CHALLENGES = [
  {
    title: '7-Day Meditation',
    difficulty: 'easy',
    habitType: 'meditation',
    description: 'Meditate for at least 10 minutes every day for 7 days',
    icon: '🧘',
    tips: ['Start with 5 minutes if 10 feels too long', 'Use a guided meditation app', 'Find a quiet comfortable spot'],
  },
  {
    title: '30-Day Fitness',
    difficulty: 'hard',
    habitType: 'exercise',
    description: 'Exercise for at least 30 minutes every day for 30 days',
    icon: '💪',
    tips: ['Mix cardio and strength training', 'Rest is part of fitness — active recovery counts', 'Track your workouts'],
  },
  {
    title: 'Sugar Free Week',
    difficulty: 'easy',
    habitType: 'nutrition',
    description: 'Cut out added sugar for 7 full days',
    icon: '🌿',
    tips: ['Check food labels carefully', 'Fruit can satisfy sweet cravings', 'Stay hydrated to reduce cravings'],
  },
  {
    title: 'Read Every Day',
    difficulty: 'medium',
    habitType: 'reading',
    description: 'Read for at least 20 minutes every day for 14 days',
    icon: '📚',
    tips: ['Keep a book on your nightstand', 'Use commute time to read', 'Try audiobooks if you prefer'],
  },
  {
    title: 'Early Riser',
    difficulty: 'medium',
    habitType: 'sleep',
    description: 'Wake up before 6:30 AM for 14 consecutive days',
    icon: '🌅',
    tips: ['Go to bed 15 minutes earlier each night', 'Place your alarm across the room', 'Get sunlight immediately after waking'],
  },
  {
    title: 'Gratitude Journal',
    difficulty: 'easy',
    habitType: 'journaling',
    description: 'Write 3 things you are grateful for every day for 7 days',
    icon: '🙏',
    tips: ['Write in the morning or before bed', 'Be specific about what you are grateful for', 'Include small everyday joys'],
  },
  {
    title: 'Digital Detox',
    difficulty: 'hard',
    habitType: 'focus',
    description: 'No social media or entertainment apps for 30 days',
    icon: '📵',
    tips: ['Use app blockers', 'Replace scrolling with hobbies', 'Inform friends and family'],
  },
  {
    title: 'Water Champion',
    difficulty: 'easy',
    habitType: 'water',
    description: 'Drink at least 8 glasses of water every day for 7 days',
    icon: '💧',
    tips: ['Keep a water bottle on your desk', 'Set hourly reminders', 'Add lemon or cucumber for flavor'],
  },
  {
    title: 'Mood Tracker',
    difficulty: 'medium',
    habitType: 'mood',
    description: 'Log your mood every day for 14 days',
    icon: '📊',
    tips: ['Log at the same time each day', 'Note what influenced your mood', 'Look for patterns after 7 days'],
  },
  {
    title: 'Focus Master',
    difficulty: 'hard',
    habitType: 'focus',
    description: 'Complete 2 hours of deep focused work daily for 30 days',
    icon: '⏱️',
    tips: ['Use the Pomodoro technique', 'Eliminate distractions before starting', 'Track your focus sessions'],
  },
  {
    title: 'No Procrastination',
    difficulty: 'extreme',
    habitType: 'productivity',
    description: 'Complete your most important task first every day for 60 days',
    icon: '⚡',
    tips: ['Plan your top priority the night before', 'Break large tasks into smaller steps', 'Use the 5-second rule to start'],
  },
  {
    title: 'Sleep Optimizer',
    difficulty: 'medium',
    habitType: 'sleep',
    description: 'Get 7-9 hours of sleep every night for 14 days',
    icon: '😴',
    tips: ['Maintain a consistent bedtime', 'No screens 1 hour before bed', 'Keep your bedroom cool and dark'],
  },
  {
    title: 'Step Up',
    difficulty: 'easy',
    habitType: 'exercise',
    description: 'Walk 10,000 steps every day for 7 days',
    icon: '🚶',
    tips: ['Take the stairs instead of elevator', 'Park farther away', 'Go for a walk during lunch break'],
  },
  {
    title: 'Clean Eating',
    difficulty: 'hard',
    habitType: 'nutrition',
    description: 'Eat only whole unprocessed foods for 30 days',
    icon: '🥗',
    tips: ['Meal prep on Sundays', 'Read ingredient lists', 'Cook at home as much as possible'],
  },
];

export function createChallenge(title, difficulty, habitType, startDate) {
  const s = State.get();
  const diffInfo = CHALLENGE_DIFFICULTY.find(d => d.id === difficulty) || CHALLENGE_DIFFICULTY[1];
  const preset = PRESET_CHALLENGES.find(p => p.title === title);
  const challenge = {
    id: uid(),
    title: title.trim(),
    difficulty: difficulty || 'medium',
    habitType: habitType || 'custom',
    days: diffInfo.days,
    xpReward: diffInfo.xp,
    progress: 0,
    started: startDate || today(),
    completed: false,
    completedDate: null,
    failed: false,
    failedDate: null,
    dailyLog: [],
    streak: 0,
    longestStreak: 0,
    icon: preset ? preset.icon : '🏆',
    description: preset ? preset.description : `${diffInfo.label} challenge: ${title}`,
    tips: preset ? preset.tips : [],
    milestones: [],
  };
  s.challenges.push(challenge);
  State.addLog(`Challenge started: ${challenge.title}`, challenge.icon, 'challenge');
  State.addXP(10);
  State.save();
  State.notify();
  return challenge;
}

export function logChallengeDay(id, note) {
  const s = State.get();
  const c = s.challenges.find(c => c.id === id);
  if (!c || c.completed || c.failed) return null;
  const alreadyLogged = c.dailyLog.some(d => d.date === today());
  if (alreadyLogged) {
    const existing = c.dailyLog.find(d => d.date === today());
    if (note) existing.note = note;
    c.streak = calculateChallengeStreak(c);
    State.save();
    State.notify();
    return c;
  }
  c.dailyLog.push({ date: today(), note: note || '', timestamp: new Date().toISOString() });
  c.progress = c.dailyLog.length;
  c.streak = calculateChallengeStreak(c);
  if (c.streak > c.longestStreak) c.longestStreak = c.streak;
  if (c.progress >= c.days) {
    c.completed = true;
    c.completedDate = today();
    c.streak = c.days;
    State.addLog(`Challenge complete: ${c.title}`, '🏆', 'challenge');
    State.addXP(c.xpReward || 100);
  }
  State.addLog(`Challenge day logged: ${c.title} (${c.progress}/${c.days})`, c.icon, 'challenge');
  State.addXP(5);
  State.save();
  State.notify();
  return c;
}

function calculateChallengeStreak(c) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < c.days; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    if (c.dailyLog.some(l => l.date === dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function failChallenge(id) {
  const s = State.get();
  const c = s.challenges.find(c => c.id === id);
  if (!c || c.completed) return null;
  c.failed = true;
  c.failedDate = today();
  State.save();
  State.notify();
  return c;
}

export function deleteChallenge(id) {
  const s = State.get();
  s.challenges = s.challenges.filter(c => c.id !== id);
  State.save();
  State.notify();
}

export function getChallenge(id) {
  const s = State.get();
  return s.challenges.find(c => c.id === id) || null;
}

export function getActiveChallenges() {
  const s = State.get();
  return s.challenges.filter(c => !c.completed && !c.failed);
}

export function getCompletedChallenges() {
  const s = State.get();
  return s.challenges.filter(c => c.completed).sort((a, b) => {
    return (b.completedDate || '').localeCompare(a.completedDate || '');
  });
}

export function getFailedChallenges() {
  const s = State.get();
  return s.challenges.filter(c => c.failed);
}

export function getChallengeProgress(id) {
  const s = State.get();
  const c = s.challenges.find(c => c.id === id);
  if (!c) return null;
  const daysDone = c.progress;
  const totalDays = c.days;
  const pct = totalDays > 0 ? Math.round((daysDone / totalDays) * 100) : 0;
  const daysRemaining = Math.max(0, totalDays - daysDone);
  const streak = c.streak;
  return { daysDone, totalDays, pct, daysRemaining, streak, longestStreak: c.longestStreak };
}

export function getChallengesByDifficulty(difficulty) {
  const s = State.get();
  return s.challenges.filter(c => c.difficulty === difficulty);
}

export function getChallengesByHabitType(habitType) {
  const s = State.get();
  return s.challenges.filter(c => c.habitType === habitType);
}

export function getChallengeStats() {
  const s = State.get();
  const total = s.challenges.length;
  const completed = s.challenges.filter(c => c.completed).length;
  const active = s.challenges.filter(c => !c.completed && !c.failed).length;
  const failed = s.challenges.filter(c => c.failed).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalDaysLogged = s.challenges.reduce((sum, c) => sum + c.dailyLog.length, 0);
  const avgProgress = s.challenges.reduce((sum, c) => {
    return sum + (c.days > 0 ? c.progress / c.days * 100 : 0);
  }, 0) / (total || 1);
  return { total, completed, active, failed, completionRate, totalDaysLogged, avgProgress: Math.round(avgProgress) };
}

export function suggestChallenges() {
  const s = State.get();
  const suggestions = [];
  const activeTitles = new Set(s.challenges.map(c => c.title.toLowerCase()));
  const available = PRESET_CHALLENGES.filter(p => !activeTitles.has(p.title.toLowerCase()));
  const habitsDone = s.habits.filter(h => h.done).length;
  const habitsTotal = s.habits.length;
  const habitRatio = habitsTotal > 0 ? habitsDone / habitsTotal : 0;

  if (habitRatio < 0.3) {
    const easyChallenges = available.filter(p => p.difficulty === 'easy' && p.habitType !== 'exercise');
    suggestions.push(...easyChallenges.slice(0, 2));
  }
  if (s.water && s.water.count < s.water.goal) {
    const waterChallenge = available.find(p => p.habitType === 'water');
    if (waterChallenge) suggestions.push(waterChallenge);
  }
  if (s.sleep && s.sleep.hours < 7) {
    const sleepChallenges = available.filter(p => p.habitType === 'sleep');
    suggestions.push(...sleepChallenges.slice(0, 1));
  }
  const exerciseCount = s.exercise ? s.exercise.filter(e => {
    const d = new Date(e.date);
    const w = new Date();
    return d >= new Date(w.getTime() - 7 * 86400000);
  }).length : 0;
  if (exerciseCount < 2) {
    const exerciseChallenges = available.filter(p => p.habitType === 'exercise' && p.difficulty === 'easy');
    suggestions.push(...exerciseChallenges.slice(0, 1));
  }
  const journalCount = s.journal.length;
  if (journalCount < 5) {
    const journalChallenge = available.find(p => p.habitType === 'journaling');
    if (journalChallenge) suggestions.push(journalChallenge);
  }
  if (s.focusHistory) {
    const focusHours = s.focusHistory.reduce((sum, f) => sum + f.duration, 0) / 60;
    if (focusHours < 5) {
      const focusChallenges = available.filter(p => p.habitType === 'focus');
      suggestions.push(...focusChallenges.slice(0, 1));
    }
  }
  const recentMoodDays = s.journal.filter(j => j.mood).length;
  if (recentMoodDays < 7) {
    const moodChallenge = available.find(p => p.habitType === 'mood');
    if (moodChallenge) suggestions.push(moodChallenge);
  }
  const alreadySuggested = new Set(suggestions.map(s => s.title));
  const otherAvailable = available.filter(p => !alreadySuggested.has(p.title));
  if (suggestions.length < 3) {
    suggestions.push(...otherAvailable.slice(0, 3 - suggestions.length));
  }
  if (suggestions.length === 0) {
    suggestions.push(PRESET_CHALLENGES[Math.floor(Math.random() * PRESET_CHALLENGES.length)]);
  }
  return suggestions.slice(0, 5);
}

export function getChallengeHistory(id) {
  const s = State.get();
  const c = s.challenges.find(c => c.id === id);
  if (!c) return [];
  return [...c.dailyLog].sort((a, b) => b.date.localeCompare(a.date));
}

export function batchLogChallenges(note) {
  const s = State.get();
  const active = getActiveChallenges();
  return active.map(c => logChallengeDay(c.id, note));
}

export function extendChallenge(id, extraDays) {
  const s = State.get();
  const c = s.challenges.find(c => c.id === id);
  if (!c || c.completed) return null;
  c.days += extraDays || 7;
  State.save();
  State.notify();
  return c;
}

export function getPresetChallengesByDifficulty(difficulty) {
  return PRESET_CHALLENGES.filter(p => p.difficulty === difficulty);
}

export function searchChallenges(query) {
  const s = State.get();
  const q = query.toLowerCase();
  return s.challenges.filter(c => {
    return c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.habitType.toLowerCase().includes(q);
  });
}

export function renderChallengeCard(challenge) {
  const card = document.createElement('div');
  card.className = 'challenge-card';
  card.dataset.id = challenge.id;
  const diffInfo = CHALLENGE_DIFFICULTY.find(d => d.id === challenge.difficulty) || CHALLENGE_DIFFICULTY[1];
  const progress = challenge.days > 0 ? Math.round((challenge.progress / challenge.days) * 100) : 0;
  const daysLeft = challenge.days - challenge.progress;
  const status = challenge.completed ? 'completed' : challenge.failed ? 'failed' : 'active';
  const todayLogged = challenge.dailyLog.some(d => d.date === today());
  card.innerHTML = `
    <div class="challenge-header">
      <span class="challenge-icon">${challenge.icon || '🏆'}</span>
      <span class="challenge-diff ${challenge.difficulty}">${diffInfo.label}</span>
      <span class="challenge-status ${status}">${status}</span>
    </div>
    <div class="challenge-body">
      <h3 class="challenge-title">${escapeHtml(truncate(challenge.title, 35))}</h3>
      <p class="challenge-desc">${escapeHtml(truncate(challenge.description, 70))}</p>
      <div class="challenge-progress">
        <div class="challenge-progress-bar">
          <div class="challenge-progress-fill ${status}" style="width:${progress}%"></div>
        </div>
        <div class="challenge-progress-text">
          <span>Day ${challenge.progress} / ${challenge.days}</span>
          <span>${progress}%</span>
        </div>
      </div>
      ${!challenge.completed && !challenge.failed ? `
        <div class="challenge-days-left ${daysLeft <= 3 ? 'urgent' : ''}">
          ${daysLeft > 0 ? `${daysLeft} days remaining` : 'Final day!'}
        </div>
      ` : ''}
      ${challenge.streak > 1 ? `<div class="challenge-streak">🔥 ${challenge.streak}-day streak</div>` : ''}
      ${challenge.tips && challenge.tips.length > 0 && !challenge.completed ? `
        <div class="challenge-tips">
          ${challenge.tips.slice(0, 2).map(t => `<span class="challenge-tip">💡 ${escapeHtml(t)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
    <div class="challenge-actions">
      ${!challenge.completed && !challenge.failed ? `
        <button class="challenge-btn log-day" data-id="${challenge.id}" ${todayLogged ? 'disabled' : ''}>
          ${todayLogged ? '✅ Logged Today' : '📝 Log Today'}
        </button>
      ` : ''}
      <button class="challenge-btn view-history" data-id="${challenge.id}">History</button>
      <button class="challenge-btn delete-challenge danger" data-id="${challenge.id}">Delete</button>
    </div>
  `;
  return card;
}

export function renderChallengeListView(challenges) {
  const container = document.createElement('div');
  container.className = 'challenge-list';
  if (!challenges.length) {
    container.innerHTML = '<div class="empty-state">No challenges yet. Start one to push yourself!</div>';
    return container;
  }
  challenges.forEach(c => container.appendChild(renderChallengeCard(c)));
  return container;
}

export function renderPresetChallengeCard(preset) {
  const card = document.createElement('div');
  card.className = 'preset-challenge-card';
  card.dataset.title = preset.title;
  const diffInfo = CHALLENGE_DIFFICULTY.find(d => d.id === preset.difficulty) || CHALLENGE_DIFFICULTY[1];
  card.innerHTML = `
    <div class="preset-header">
      <span class="preset-icon">${preset.icon || '🏆'}</span>
      <span class="challenge-diff ${preset.difficulty}">${diffInfo.label} · ${diffInfo.days} days</span>
    </div>
    <h4 class="preset-title">${escapeHtml(preset.title)}</h4>
    <p class="preset-desc">${escapeHtml(preset.description)}</p>
    ${preset.tips && preset.tips.length > 0 ? `
      <div class="preset-tips">
        ${preset.tips.map(t => `<span class="preset-tip">💡 ${escapeHtml(t)}</span>`).join('')}
      </div>
    ` : ''}
    <button class="start-preset-challenge" data-title="${preset.title}" data-difficulty="${preset.difficulty}" data-type="${preset.habitType}">
      Start Challenge
    </button>
  `;
  return card;
}

const Challenges = {
  createChallenge,
  logChallengeDay,
  failChallenge,
  deleteChallenge,
  getChallenge,
  getActiveChallenges,
  getCompletedChallenges,
  getFailedChallenges,
  getChallengeProgress,
  getChallengesByDifficulty,
  getChallengesByHabitType,
  getChallengeStats,
  suggestChallenges,
  getChallengeHistory,
  batchLogChallenges,
  extendChallenge,
  getPresetChallengesByDifficulty,
  searchChallenges,
  renderChallengeCard,
  renderChallengeListView,
  renderPresetChallengeCard,
  PRESET_CHALLENGES,
};

export default Challenges;
