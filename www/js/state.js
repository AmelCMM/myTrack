import Storage from './storage.js';
import { EMPTY_STATE, ACHIEVEMENTS, XP_LEVELS, MOODS, STORAGE_KEY } from './constants.js';
import { uid, today, yesterday, daysAgo, calculateStreak, mergeDeep } from './helpers.js';

const _listeners = [];
let _state = EMPTY_STATE();
let _loaded = false;

function get() { return _state; }

function subscribe(fn) {
  _listeners.push(fn);
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); };
}

function notify() {
  const s = _state;
  _listeners.forEach(fn => { try { fn(s); } catch (e) { console.error('State listener error', e); } });
}

async function save() {
  await Storage.save(STORAGE_KEY, _state);
}

async function load() {
  try {
    const stored = await Storage.load(STORAGE_KEY, null);
    if (stored) {
      _state = mergeDeep(EMPTY_STATE(), stored);
      _state.settings = { ...EMPTY_STATE().settings, ...(stored.settings || {}) };
      _state.water = { ...EMPTY_STATE().water, ...(stored.water || {}) };
      _state.mood = { ...EMPTY_STATE().mood, ...(stored.mood || {}) };
      _state.sleep = { ...EMPTY_STATE().sleep, ...(stored.sleep || {}) };
      _state.nutrition = { ...EMPTY_STATE().nutrition, ...(stored.nutrition || {}) };
      _state.steps = { ...EMPTY_STATE().steps, ...(stored.steps || {}) };
    }
    dayReset();
    _loaded = true;
  } catch (e) {
    if (e.message === 'DECRYPTION_FAILED') throw e;
    _state = EMPTY_STATE();
    _loaded = true;
  }
}

async function hardReset() {
  _state = EMPTY_STATE();
  await Storage.clear();
  await save();
  notify();
}

function isLoaded() { return _loaded; }

function dayReset() {
  const t = today();
  if (_state.water.date !== t) { _state.water.date = t; _state.water.count = 0; }
  if (_state.mood.date !== t) { _state.mood.date = t; _state.mood.emoji = ''; _state.mood.label = ''; }
  if (_state.sleep.date !== t) { _state.sleep.date = t; _state.sleep.hours = 0; _state.sleep.quality = 0; }
  if (_state.nutrition.date !== t) { _state.nutrition.date = t; _state.nutrition.meals = []; _state.nutrition.calories = 0; }
  if (_state.steps.date !== t) { _state.steps.date = t; _state.steps.count = 0; }
}

function addLog(title, emoji = '', type = 'general', meta = {}) {
  _state.logs.unshift({
    id: uid(), timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: today(), title, emoji, type, meta,
  });
  if (_state.logs.length > 1000) _state.logs.length = 1000;
}

function deleteLog(id) {
  _state.logs = _state.logs.filter(l => l.id !== id);
  save(); notify();
}

function addXP(amount) {
  _state.xp = (_state.xp || 0) + amount;
  const levels = XP_LEVELS;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (_state.xp >= levels[i]) {
      if (i !== _state.level) {
        _state.level = i;
        addLog(`Level up! Reached level ${i}`, '⭐', 'achievement');
      }
      break;
    }
  }
  checkAchievements();
  save();
  notify();
}

function checkAchievements() {
  const unlocked = new Set(_state.achievements.map(a => a.id));
  const toUnlock = [];

  if (_state.habits.filter(h => h.done).length >= 1 && !unlocked.has('first_habit')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'first_habit'));
  }
  if (_state.habits.some(h => h.streak >= 7) && !unlocked.has('week_streak')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'week_streak'));
  }
  if (_state.habits.some(h => h.streak >= 30) && !unlocked.has('month_streak')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'month_streak'));
  }
  if (_state.journal.length >= 10 && !unlocked.has('journal_10')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'journal_10'));
  }
  if (_state.journal.length >= 50 && !unlocked.has('journal_50')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'journal_50'));
  }
  const uniqueMoodDays = new Set(_state.journal.filter(j => j.mood).map(j => j.date));
  if (uniqueMoodDays.size >= 30 && !unlocked.has('mood_30')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'mood_30'));
  }
  if (_state.transactions.length >= 1 && !unlocked.has('finance_first')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'finance_first'));
  }
  if (_state.challenges && _state.challenges.some(c => c.completed) && !unlocked.has('challenge_done')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'challenge_done'));
  }
  const totalHabitDone = _state.habits.reduce((s, h) => s + (h.done ? 1 : 0), 0);
  if (totalHabitDone >= 100 && !unlocked.has('habit_100')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'habit_100'));
  }
  const uniqueBalanceDays = new Set(_state.balanceHistory.filter(b => b.score >= 90).map(b => b.date));
  if (uniqueBalanceDays.size >= 1 && !unlocked.has('balance_90')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'balance_90'));
  }
  const totalFocusMin = _state.focusHistory.reduce((s, f) => s + f.duration, 0);
  if (totalFocusMin >= 600 && !unlocked.has('focus_10h')) {
    toUnlock.push(ACHIEVEMENTS.find(a => a.id === 'focus_10h'));
  }

  for (const ach of toUnlock) {
    if (ach) {
      _state.achievements.push({
        id: ach.id, title: ach.title, icon: ach.icon,
        unlockedAt: new Date().toISOString(), xp: ach.xp,
      });
      addXP(ach.xp);
      addLog(`Achievement: ${ach.title}`, ach.icon, 'achievement');
    }
  }
}

function computeBalanceScore() {
  const habitsDone = _state.habits.filter(h => h.done).length;
  const total = _state.habits.length || 1;
  const waterPct = _state.water.count / (_state.water.goal || 8);
  const moodMap = {};
  MOODS.forEach(m => { moodMap[m.emoji] = m.score; });
  const moodPct = moodMap[_state.mood.emoji] ?? 0;
  const sleepScore = _state.sleep.hours > 0 ? Math.min(_state.sleep.hours / 8, 1) * 10 : 0;
  const score = Math.round(habitsDone / total * 30 + waterPct * 25 + moodPct * 20 + sleepScore + 15);
  return Math.min(100, Math.max(0, score));
}

function pushBalance() {
  const t = today();
  const score = computeBalanceScore();
  const existing = _state.balanceHistory.find(b => b.date === t);
  if (existing) existing.score = score;
  else _state.balanceHistory.push({ date: t, score });
  if (_state.balanceHistory.length > 730) {
    _state.balanceHistory = _state.balanceHistory.slice(-730);
  }
  return score;
}

function createHabit({ name, emoji }) {
  const habit = { id: uid(), name, emoji: emoji || '⭐', done: false, streak: 0, lastDate: '', created: today() };
  _state.habits.push(habit);
  save(); notify();
  return habit;
}

function updateHabit(id, changes) {
  const h = _state.habits.find(h => h.id === id);
  if (!h) return;
  Object.assign(h, changes);
  save(); notify();
}

function deleteHabit(id) {
  _state.habits = _state.habits.filter(h => h.id !== id);
  save(); notify();
}

function toggleHabit(id) {
  const h = _state.habits.find(h => h.id === id);
  if (!h) return;
  h.done = !h.done;
  if (h.done) {
    if (h.lastDate === yesterday()) h.streak++;
    else if (h.lastDate !== today()) h.streak = 1;
    h.lastDate = today();
    addLog(`${h.name} completed`, h.emoji, 'habit');
    addXP(5);
  }
  pushBalance();
  save(); notify();
}

function reorderHabits(fromIndex, toIndex) {
  const item = _state.habits.splice(fromIndex, 1)[0];
  _state.habits.splice(toIndex, 0, item);
  save(); notify();
}

function setWater(count) {
  dayReset();
  _state.water.count = Math.max(0, Math.min(_state.water.goal, count));
  if (count > 0) addLog(`Water: ${_state.water.count}/${_state.water.goal}`, '💧', 'water');
  pushBalance();
  save(); notify();
}

function setWaterGoal(goal) {
  _state.water.goal = Math.max(1, goal);
  save(); notify();
}

function incrementWater() {
  dayReset();
  if (_state.water.count < _state.water.goal) {
    _state.water.count++;
    addLog(`Water: ${_state.water.count}/${_state.water.goal}`, '💧', 'water');
    pushBalance();
    save(); notify();
  }
}

function logMood(emoji, label = '') {
  dayReset();
  _state.mood = { date: today(), emoji, label };
  addLog(`Mood: ${emoji} ${label}`.trim(), emoji, 'mood');
  pushBalance();
  addXP(3);
  save(); notify();
}

function createJournalEntry({ text, mood = '', tags = [] }) {
  const entry = { id: uid(), date: today(), text, mood, tags };
  _state.journal.unshift(entry);
  addLog('Journal entry written', '✍️', 'journal');
  addXP(10);
  save(); notify();
  return entry;
}

function updateJournalEntry(id, changes) {
  const e = _state.journal.find(j => j.id === id);
  if (!e) return;
  Object.assign(e, changes);
  save(); notify();
}

function deleteJournalEntry(id) {
  _state.journal = _state.journal.filter(j => j.id !== id);
  save(); notify();
}

function createVital({ type, value, unit, note = '' }) {
  const v = { id: uid(), type, value: parseFloat(value), unit, note, date: today() };
  _state.vitals.unshift(v);
  addLog(`${type}: ${value} ${unit}`, '📊', 'vital');
  save(); notify();
  return v;
}

function deleteVital(id) {
  _state.vitals = _state.vitals.filter(v => v.id !== id);
  save(); notify();
}

function createSymptom({ description, severity = 5 }) {
  const s = { id: uid(), description, severity: parseInt(severity), date: today() };
  _state.symptoms.unshift(s);
  addLog(`Symptom: ${description} (${severity}/10)`, '🩺', 'symptom');
  save(); notify();
  return s;
}

function deleteSymptom(id) {
  _state.symptoms = _state.symptoms.filter(s => s.id !== id);
  save(); notify();
}

function createMedication({ name, dosage, frequency = 'Daily' }) {
  const m = { id: uid(), name, dosage, frequency, lastTaken: '', date: today() };
  _state.medications.push(m);
  save(); notify();
  return m;
}

function deleteMedication(id) {
  _state.medications = _state.medications.filter(m => m.id !== id);
  save(); notify();
}

function markMedicationTaken(id) {
  const m = _state.medications.find(m => m.id === id);
  if (m) {
    m.lastTaken = new Date().toISOString();
    addLog(`Took ${m.name} ${m.dosage}`, '💊', 'medication');
    save(); notify();
  }
}

function createCourse({ name, instructor = '', credits = 3, colour = '#4d9fff' }) {
  const c = { id: uid(), name, instructor, credits: parseInt(credits), colour, grade: null };
  _state.courses.push(c);
  save(); notify();
  return c;
}

function deleteCourse(id) {
  _state.courses = _state.courses.filter(c => c.id !== id);
  _state.assignments = _state.assignments.filter(a => a.courseId !== id);
  save(); notify();
}

function createAssignment({ courseId, title, dueDate, weight = 0 }) {
  const a = { id: uid(), courseId, title, dueDate, weight: parseFloat(weight), score: null, done: false };
  _state.assignments.push(a);
  addLog(`Assignment: ${title}`, '📝', 'study');
  save(); notify();
  return a;
}

function updateAssignment(id, changes) {
  const a = _state.assignments.find(a => a.id === id);
  if (a) { Object.assign(a, changes); save(); notify(); }
}

function deleteAssignment(id) {
  _state.assignments = _state.assignments.filter(a => a.id !== id);
  save(); notify();
}

function createProject({ name, colour = '#00e5a0' }) {
  const p = { id: uid(), name, colour };
  _state.projects.push(p);
  save(); notify();
  return p;
}

function deleteProject(id) {
  _state.projects = _state.projects.filter(p => p.id !== id);
  _state.tasks = _state.tasks.filter(t => t.projectId !== id);
  save(); notify();
}

function createTask({ projectId = null, title, due = '', priority = 'normal' }) {
  const t = { id: uid(), projectId, title, due, priority, done: false };
  _state.tasks.unshift(t);
  save(); notify();
  return t;
}

function updateTask(id, changes) {
  const t = _state.tasks.find(t => t.id === id);
  if (t) {
    Object.assign(t, changes);
    if (changes.done) { addLog(`Task done: ${t.title}`, '✅', 'task'); addXP(5); }
    save(); notify();
  }
}

function deleteTask(id) {
  _state.tasks = _state.tasks.filter(t => t.id !== id);
  save(); notify();
}

function createAccount({ name, balance = 0, currency = 'USD' }) {
  const a = { id: uid(), name, balance: parseFloat(balance), currency };
  _state.accounts.push(a);
  save(); notify();
  return a;
}

function deleteAccount(id) {
  _state.accounts = _state.accounts.filter(a => a.id !== id);
  save(); notify();
}

function createTransaction({ accountId, amount, category = 'General', note = '', type = 'expense' }) {
  const signedAmount = type === 'income' ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount));
  const tx = { id: uid(), accountId, amount: signedAmount, category, note, type, date: today() };
  _state.transactions.unshift(tx);
  const acc = _state.accounts.find(a => a.id === accountId);
  if (acc) acc.balance = +(acc.balance + signedAmount).toFixed(2);
  addLog(`${type === 'income' ? '+' : '-'}$${Math.abs(signedAmount).toFixed(2)} · ${category}`, '💰', 'finance');
  addXP(2);
  save(); notify();
  return tx;
}

function deleteTransaction(id) {
  const tx = _state.transactions.find(t => t.id === id);
  if (tx) {
    const acc = _state.accounts.find(a => a.id === tx.accountId);
    if (acc) acc.balance = +(acc.balance - tx.amount).toFixed(2);
  }
  _state.transactions = _state.transactions.filter(t => t.id !== id);
  save(); notify();
}

function createBudget({ category, limit, period = 'monthly' }) {
  const b = { id: uid(), category, limit: parseFloat(limit), period };
  _state.budgets.push(b);
  save(); notify();
  return b;
}

function deleteBudget(id) {
  _state.budgets = _state.budgets.filter(b => b.id !== id);
  save(); notify();
}

function getSpendingByCategory(period = 'month') {
  const now = new Date();
  const from = new Date(now.getFullYear(), period === 'month' ? now.getMonth() : 0, 1)
    .toISOString().slice(0, 10);
  const relevant = _state.transactions.filter(t => t.type === 'expense' && t.date >= from);
  const result = {};
  relevant.forEach(t => {
    result[t.category] = (result[t.category] || 0) + Math.abs(t.amount);
  });
  return result;
}

function createGratitude({ text }) {
  const g = { id: uid(), text, date: today() };
  _state.gratitudes.unshift(g);
  addLog('Gratitude recorded', '🙏', 'mood');
  addXP(3);
  save(); notify();
  return g;
}

function deleteGratitude(id) {
  _state.gratitudes = _state.gratitudes.filter(g => g.id !== id);
  save(); notify();
}

function recordBleReading(bpm) {
  _state.bleReadings.unshift({ bpm, timestamp: new Date().toISOString() });
  if (_state.bleReadings.length > 500) _state.bleReadings.length = 500;
  createVital({ type: 'Heart Rate', value: bpm, unit: 'bpm' });
}

function logSleep(hours, quality, bedtime, wake) {
  dayReset();
  _state.sleep = { date: today(), hours: parseFloat(hours), quality: parseInt(quality), bedtime, wake };
  addLog(`Sleep: ${hours}h (quality ${quality}/10)`, '🌙', 'health');
  pushBalance();
  save(); notify();
}

function logExercise({ type, durationMin, intensity = 'moderate', note = '' }) {
  dayReset();
  const entry = { id: uid(), type, durationMin: parseInt(durationMin), intensity, note, date: today() };
  _state.exercise.unshift(entry);
  addLog(`Exercise: ${type} ${durationMin}min`, '🏃', 'health');
  addXP(5);
  save(); notify();
}

function logMeal({ type, description, calories, protein, carbs, fat }) {
  dayReset();
  const meal = { id: uid(), type, description, calories: parseInt(calories), protein, carbs, fat, date: today() };
  _state.nutrition.meals.push(meal);
  _state.nutrition.calories = (_state.nutrition.calories || 0) + parseInt(calories);
  addLog(`Meal: ${description} (${calories} cal)`, '🍽️', 'nutrition');
  save(); notify();
}

function logSteps(count) {
  dayReset();
  _state.steps.count = Math.max(0, parseInt(count));
  save(); notify();
}

function updateSettings(changes) {
  Object.assign(_state.settings, changes);
  save(); notify();
}

function createGoal({ title, description, targetDate, category, targetValue, unit }) {
  const g = { id: uid(), title, description, targetDate, category, targetValue, unit, progress: 0, created: today(), completed: false };
  _state.goals.push(g);
  save(); notify();
  return g;
}

function updateGoalProgress(id, progress) {
  const g = _state.goals.find(g => g.id === id);
  if (g) {
    g.progress = Math.min(g.targetValue, Math.max(0, progress));
    if (g.progress >= g.targetValue && !g.completed) {
      g.completed = true;
      g.completedDate = today();
      addLog(`Goal completed: ${g.title}`, '🎯', 'goal');
      addXP(50);
    }
    save(); notify();
  }
}

function deleteGoal(id) {
  _state.goals = _state.goals.filter(g => g.id !== id);
  save(); notify();
}

function createChallenge(title, difficulty = 'medium') {
  const diff = { easy: 7, medium: 14, hard: 30, extreme: 60 };
  const days = diff[difficulty] || 14;
  const c = { id: uid(), title, difficulty, days, progress: 0, started: today(), completed: false, dailyLog: [] };
  _state.challenges.push(c);
  save(); notify();
  return c;
}

function logChallengeDay(id, note = '') {
  const c = _state.challenges.find(c => c.id === id);
  if (c && !c.completed) {
    c.dailyLog.push({ date: today(), note });
    c.progress = c.dailyLog.length;
    if (c.progress >= c.days) {
      c.completed = true;
      c.completedDate = today();
      addLog(`Challenge complete: ${c.title}`, '🏆', 'challenge');
      addXP(100);
    }
    save(); notify();
  }
}

function deleteChallenge(id) {
  _state.challenges = _state.challenges.filter(c => c.id !== id);
  save(); notify();
}

function recordFocusSession(durationMin, sessionType = 'pomodoro') {
  _state.focusHistory.push({ id: uid(), duration: durationMin, type: sessionType, date: today(), time: new Date().toISOString() });
  addLog(`Focus: ${durationMin}min ${sessionType}`, '⏱️', 'focus');
  addXP(durationMin);
  pushBalance();
  save(); notify();
}

function addTag(name, colour = '#00e5a0') {
  if (!_state.tags) _state.tags = [];
  if (!_state.tags.find(t => t.name === name)) {
    _state.tags.push({ id: uid(), name, colour });
    save(); notify();
  }
}

function createReminder({ title, time, days = [1, 2, 3, 4, 5], enabled = true }) {
  const r = { id: uid(), title, time, days, enabled, created: today() };
  _state.reminders.push(r);
  save(); notify();
  return r;
}

function deleteReminder(id) {
  _state.reminders = _state.reminders.filter(r => r.id !== id);
  save(); notify();
}

function addReadingItem({ title, author, pages, status = 'want_to_read' }) {
  const r = { id: uid(), title, author, pages: parseInt(pages) || 0, status, added: today() };
  _state.readingList.push(r);
  save(); notify();
  return r;
}

function updateReadingStatus(id, status) {
  const r = _state.readingList.find(r => r.id === id);
  if (r) { r.status = status; if (status === 'finished') r.finishedDate = today(); save(); notify(); }
}

function deleteReadingItem(id) {
  _state.readingList = _state.readingList.filter(r => r.id !== id);
  save(); notify();
}

function exportBackup() {
  return Storage.exportJSON(_state);
}

async function importBackup(jsonString) {
  const imported = Storage.importJSON(jsonString);
  _state = mergeDeep(EMPTY_STATE(), imported);
  await save();
  notify();
}

function getStats() {
  const habitsDone = _state.habits.filter(h => h.done).length;
  const bestStreak = Math.max(..._state.habits.map(h => h.streak), 0);
  const totalLogs = _state.logs.length;
  const journalCount = _state.journal.length;
  const totalFocus = _state.focusHistory.reduce((s, f) => s + f.duration, 0);
  const totalXP = _state.xp || 0;
  const level = _state.level || 0;
  const achievementsUnlocked = _state.achievements.length;
  return { habitsDone, bestStreak, totalLogs, journalCount, totalFocus, totalXP, level, achievementsUnlocked };
}

export default {
  get, load, save, subscribe, notify,
  isLoaded, hardReset, dayReset,
  computeBalanceScore, pushBalance,
  addLog, deleteLog,
  createHabit, updateHabit, deleteHabit, toggleHabit, reorderHabits,
  setWater, setWaterGoal, incrementWater,
  logMood,
  createJournalEntry, updateJournalEntry, deleteJournalEntry,
  createVital, deleteVital,
  createSymptom, deleteSymptom,
  createMedication, deleteMedication, markMedicationTaken,
  createCourse, deleteCourse,
  createAssignment, updateAssignment, deleteAssignment,
  createProject, deleteProject,
  createTask, updateTask, deleteTask,
  createAccount, deleteAccount,
  createTransaction, deleteTransaction,
  createBudget, deleteBudget, getSpendingByCategory,
  createGratitude, deleteGratitude,
  recordBleReading,
  logSleep, logExercise, logMeal, logSteps,
  createGoal, updateGoalProgress, deleteGoal,
  createChallenge, logChallengeDay, deleteChallenge,
  recordFocusSession,
  addTag,
  createReminder, deleteReminder,
  addReadingItem, updateReadingStatus, deleteReadingItem,
  updateSettings,
  exportBackup, importBackup,
  getStats,
  addXP,
  uid, today,
};
