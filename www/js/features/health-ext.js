import State from '../state.js';
import { uid, today, daysAgo, daysBetween, weekStart, monthStart, dateStr, escapeHtml, avgBy, sumBy, sortBy, groupBy, clamp } from '../helpers.js';
import { EXERCISE_TYPES, MEAL_TYPES, DEFAULT_SLEEP_GOAL, DEFAULT_CALORIE_GOAL, DEFAULT_STEPS_GOAL } from '../constants.js';

export function logSleep({ hours, quality, bedtime, wake, notes }) {
  const s = State.get();
  const entry = {
    id: uid(),
    date: today(),
    hours: Math.max(0, Math.min(24, parseFloat(hours) || 0)),
    quality: Math.max(0, Math.min(10, parseInt(quality) || 0)),
    bedtime: bedtime || '',
    wake: wake || '',
    notes: notes || '',
    timestamp: new Date().toISOString(),
  };
  if (!s.sleep) s.sleep = { date: today(), hours: 0, quality: 0, bedtime: '', wake: '' };
  if (s.sleep.date !== today()) {
    s.sleep = { ...entry, history: [s.sleep].filter(e => e.date) };
  } else {
    s.sleep = { ...s.sleep, ...entry };
  }
  State.addLog(`Sleep logged: ${entry.hours}h (quality ${entry.quality}/10)`, '🌙', 'health');
  State.pushBalance();
  State.addXP(3);
  State.save();
  State.notify();
  return entry;
}

export function logSleepHistory(entries) {
  const results = [];
  entries.forEach(e => {
    results.push(logSleep(e));
  });
  return results;
}

export function getSleepTrend(days = 30) {
  const s = State.get();
  const rangeStart = daysAgo(days);
  const sleepLogs = s.logs.filter(l =>
    l.type === 'health' && l.title.includes('Sleep') && l.date >= rangeStart
  );
  const trend = [];
  const d = new Date(rangeStart);
  const end = new Date();
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    const log = sleepLogs.find(l => l.date === ds);
    if (log) {
      const match = log.title.match(/Sleep:\s*([\d.]+)h.*quality\s*(\d+)/i);
      if (match) {
        trend.push({ date: ds, hours: parseFloat(match[1]), quality: parseInt(match[2]) });
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return trend;
}

export function calculateSleepScore(sleepData) {
  if (!sleepData || !sleepData.hours) return 0;
  const hours = sleepData.hours;
  const quality = sleepData.quality || 5;
  let durationScore = 0;
  if (hours >= 7 && hours <= 9) durationScore = 100;
  else if (hours >= 6 && hours < 7) durationScore = 70;
  else if (hours > 9 && hours <= 10) durationScore = 70;
  else if (hours >= 5 && hours < 6) durationScore = 40;
  else if (hours > 10) durationScore = 40;
  else durationScore = 20;
  const qualityScore = (quality / 10) * 100;
  const consistencyBonus = sleepData.consistency ? Math.min(20, sleepData.consistency / 5) : 0;
  return Math.round(durationScore * 0.5 + qualityScore * 0.3 + consistencyBonus);
}

export function getSleepScoreTrend(days = 30) {
  const trend = getSleepTrend(days);
  return trend.map(t => ({
    date: t.date,
    score: calculateSleepScore({ hours: t.hours, quality: t.quality }),
    hours: t.hours,
    quality: t.quality,
  }));
}

export function getSleepStats(days = 30) {
  const trend = getSleepTrend(days);
  if (!trend.length) return { avgHours: 0, avgQuality: 0, consistency: 0, optimalDays: 0, totalDays: 0, avgScore: 0 };
  const avgHours = avgBy(trend, t => t.hours);
  const avgQuality = avgBy(trend, t => t.quality);
  const optimalDays = trend.filter(t => t.hours >= 7 && t.hours <= 9 && t.quality >= 7).length;
  const scores = trend.map(t => calculateSleepScore(t));
  const avgScore = avgBy(scores, s => s);
  const consistency = Math.round((trend.length / Math.min(days, trend.length + 14)) * 100);
  return {
    avgHours: Math.round(avgHours * 10) / 10,
    avgQuality: Math.round(avgQuality * 10) / 10,
    consistency,
    optimalDays,
    totalDays: trend.length,
    avgScore: Math.round(avgScore),
    bestHours: Math.round(Math.max(...trend.map(t => t.hours)) * 10) / 10,
    worstHours: Math.round(Math.min(...trend.map(t => t.hours)) * 10) / 10,
  };
}

export function logExercise({ type, durationMin, intensity, calories, notes }) {
  const s = State.get();
  const exerciseType = EXERCISE_TYPES.find(e => e.id === type) || EXERCISE_TYPES[EXERCISE_TYPES.length - 1];
  const duration = Math.max(1, parseInt(durationMin) || 0);
  const estCalories = calories || Math.round(duration * (exerciseType.calPerMin || 5));
  const entry = {
    id: uid(),
    date: today(),
    type,
    typeLabel: exerciseType.label,
    typeEmoji: exerciseType.emoji,
    durationMin: duration,
    intensity: intensity || 'moderate',
    calories: estCalories,
    notes: notes || '',
    timestamp: new Date().toISOString(),
  };
  if (!s.exercise) s.exercise = [];
  s.exercise.unshift(entry);
  if (s.exercise.length > 500) s.exercise = s.exercise.slice(0, 500);
  State.addLog(`Exercise: ${exerciseType.label} ${duration}min (${estCalories} cal)`, '🏃', 'health');
  State.pushBalance();
  State.addXP(5);
  State.save();
  State.notify();
  return entry;
}

export function getExerciseStats(days = 30) {
  const s = State.get();
  if (!s.exercise || !s.exercise.length) return { total: 0, totalMinutes: 0, totalCalories: 0, sessionsPerWeek: 0, byType: {}, avgDuration: 0 };
  const rangeStart = daysAgo(days);
  const filtered = s.exercise.filter(e => e.date >= rangeStart);
  const total = filtered.length;
  const totalMinutes = sumBy(filtered, e => e.durationMin);
  const totalCalories = sumBy(filtered, e => e.calories);
  const weeks = Math.max(1, days / 7);
  const sessionsPerWeek = Math.round((total / weeks) * 10) / 10;
  const uniqueDays = new Set(filtered.map(e => e.date)).size;
  const byType = groupBy(filtered, 'type');
  const typeBreakdown = {};
  Object.entries(byType).forEach(([type, entries]) => {
    const exType = EXERCISE_TYPES.find(e => e.id === type);
    typeBreakdown[type] = {
      label: exType?.label || type,
      emoji: exType?.emoji || '🏃',
      count: entries.length,
      totalMinutes: sumBy(entries, e => e.durationMin),
      totalCalories: sumBy(entries, e => e.calories),
    };
  });
  return {
    total,
    totalMinutes,
    totalCalories,
    sessionsPerWeek,
    uniqueDays,
    avgDuration: total > 0 ? Math.round(totalMinutes / total) : 0,
    avgCaloriesPerSession: total > 0 ? Math.round(totalCalories / total) : 0,
    byType: typeBreakdown,
    longestSession: filtered.length > 0 ? Math.max(...filtered.map(e => e.durationMin)) : 0,
  };
}

export function calculateCalories(exerciseType, durationMin, intensity) {
  const exType = EXERCISE_TYPES.find(e => e.id === exerciseType) || EXERCISE_TYPES[EXERCISE_TYPES.length - 1];
  const baseCalPerMin = exType.calPerMin || 5;
  const intensityMultiplier = intensity === 'high' ? 1.5 : intensity === 'low' ? 0.7 : 1;
  return Math.round(baseCalPerMin * durationMin * intensityMultiplier);
}

export function logMeal({ type, description, calories, protein, carbs, fat, notes }) {
  const s = State.get();
  const mealType = MEAL_TYPES.find(m => m.id === type) || MEAL_TYPES[0];
  const meal = {
    id: uid(),
    date: today(),
    type,
    typeLabel: mealType.label,
    typeEmoji: mealType.emoji,
    description: description || '',
    calories: parseInt(calories) || 0,
    protein: parseFloat(protein) || 0,
    carbs: parseFloat(carbs) || 0,
    fat: parseFloat(fat) || 0,
    notes: notes || '',
    timestamp: new Date().toISOString(),
  };
  if (!s.nutrition) s.nutrition = { date: today(), meals: [], calories: 0, goal: DEFAULT_CALORIE_GOAL };
  if (s.nutrition.date !== today()) {
    s.nutrition = { date: today(), meals: [meal], calories: meal.calories, goal: s.nutrition.goal || DEFAULT_CALORIE_GOAL };
  } else {
    s.nutrition.meals.push(meal);
    s.nutrition.calories = (s.nutrition.calories || 0) + meal.calories;
  }
  if (s.nutrition.meals.length > 50) s.nutrition.meals = s.nutrition.meals.slice(-50);
  State.addLog(`Meal: ${meal.description || mealType.label} (${meal.calories} cal)`, '🍽️', 'nutrition');
  State.addXP(2);
  State.save();
  State.notify();
  return meal;
}

export function getNutritionSummary(days = 30) {
  const s = State.get();
  const rangeStart = daysAgo(days);
  const mealLogs = s.logs.filter(l => l.type === 'nutrition' && l.date >= rangeStart);
  const meals = [];
  mealLogs.forEach(l => {
    const match = l.title.match(/Meal:\s*(.*?)\s*\((\d+)\s*cal\)/);
    if (match) meals.push({ date: l.date, description: match[1], calories: parseInt(match[2]) });
  });
  const totalCalories = sumBy(meals, m => m.calories);
  const avgDailyCalories = meals.length > 0 ? Math.round(totalCalories / Math.max(1, new Set(meals.map(m => m.date)).size)) : 0;
  const byType = groupBy(meals, m => {
    const mealType = MEAL_TYPES.find(mt => meals.some(m2 => m2.description.includes(mt.label)));
    return 'meals';
  });
  const daysTracked = new Set(meals.map(m => m.date)).size;
  const goal = s.nutrition?.goal || DEFAULT_CALORIE_GOAL;
  const daysOnTarget = meals.length > 0 ? new Set(meals.filter(m => m.calories <= goal * 1.1).map(m => m.date)).size : 0;
  return {
    totalMeals: meals.length,
    totalCalories,
    avgDailyCalories,
    daysTracked,
    daysOnTarget,
    goal,
    onTargetRate: daysTracked > 0 ? Math.round((daysOnTarget / Math.max(1, daysTracked)) * 100) : 0,
    avgCalPerMeal: meals.length > 0 ? Math.round(totalCalories / meals.length) : 0,
  };
}

export function calculateCalorieBalance() {
  const s = State.get();
  const consumed = s.nutrition?.calories || 0;
  const goal = s.nutrition?.goal || DEFAULT_CALORIE_GOAL;
  const exerciseCalories = (s.exercise || []).filter(e => e.date === today()).reduce((sum, e) => sum + (e.calories || 0), 0);
  return {
    consumed,
    goal,
    burned: exerciseCalories,
    net: consumed - exerciseCalories,
    remaining: Math.max(0, goal - consumed),
    deficit: consumed - goal,
    onTrack: consumed <= goal,
  };
}

export function logSteps(count) {
  const s = State.get();
  const steps = Math.max(0, parseInt(count) || 0);
  if (!s.steps) s.steps = { date: today(), count: 0, goal: DEFAULT_STEPS_GOAL };
  if (s.steps.date !== today()) {
    s.steps = { date: today(), count: steps, goal: s.steps.goal || DEFAULT_STEPS_GOAL };
  } else {
    s.steps.count = steps;
  }
  State.addLog(`Steps: ${steps}`, '👣', 'health');
  State.pushBalance();
  State.save();
  State.notify();
  return s.steps;
}

export function getStepHistory(days = 30) {
  const s = State.get();
  const rangeStart = daysAgo(days);
  const stepLogs = s.logs.filter(l => l.type === 'health' && l.title.includes('Steps') && l.date >= rangeStart);
  const history = [];
  const d = new Date(rangeStart);
  const end = new Date();
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    const log = stepLogs.find(l => l.date === ds);
    history.push({
      date: ds,
      count: log ? parseInt(log.title.match(/(\d+)/)?.[1] || '0') : 0,
      goal: s.steps?.goal || DEFAULT_STEPS_GOAL,
    });
    d.setDate(d.getDate() + 1);
  }
  return history;
}

export function getAverageSteps(days = 30) {
  const history = getStepHistory(days);
  const withData = history.filter(h => h.count > 0);
  if (!withData.length) return 0;
  return Math.round(avgBy(withData, h => h.count));
}

export function getStepStats(days = 30) {
  const history = getStepHistory(days);
  const withData = history.filter(h => h.count > 0);
  if (!withData.length) return { avgSteps: 0, totalSteps: 0, daysTracked: 0, goal: DEFAULT_STEPS_GOAL, daysHitGoal: 0, bestDay: null };
  const goal = history[0]?.goal || DEFAULT_STEPS_GOAL;
  const daysHitGoal = withData.filter(h => h.count >= goal).length;
  const bestDay = withData.reduce((best, h) => h.count > (best?.count || 0) ? h : best, null);
  return {
    avgSteps: Math.round(avgBy(withData, h => h.count)),
    totalSteps: sumBy(withData, h => h.count),
    daysTracked: withData.length,
    goal,
    daysHitGoal,
    hitRate: Math.round((daysHitGoal / withData.length) * 100),
    bestDay,
    totalDays: history.length,
  };
}

export function calculateHealthScore() {
  const sleepStats = getSleepStats(7);
  const exerciseStats = getExerciseStats(7);
  const stepStats = getStepStats(7);
  const nutrition = getNutritionSummary(7);
  let score = 0;
  score += Math.min(25, Math.round((sleepStats.avgScore || 0) * 0.25));
  const exerciseDays = exerciseStats.uniqueDays || 0;
  score += Math.min(20, Math.round((exerciseDays / 7) * 20));
  const stepAvg = stepStats.avgSteps || 0;
  const stepGoal = stepStats.goal || DEFAULT_STEPS_GOAL;
  score += Math.min(15, Math.round((stepAvg / stepGoal) * 15));
  if (nutrition.avgDailyCalories > 0 && nutrition.goal > 0) {
    const ratio = Math.min(nutrition.avgDailyCalories / nutrition.goal, 1.5);
    score += Math.min(20, ratio <= 1.1 ? 20 : Math.max(0, 20 - (ratio - 1.1) * 40));
  }
  const waterConsistency = Math.min(s.water?.count / (s.water?.goal || 8), 1);
  score += Math.min(20, Math.round(waterConsistency * 20));
  return Math.min(100, Math.max(0, score));
}

export function generateHealthWeekSummary() {
  const s = State.get();
  const weekLabel = `${dateStr(weekStart(today()))} - ${dateStr(today())}`;
  const sleepStats = getSleepStats(7);
  const exerciseStats = getExerciseStats(7);
  const stepStats = getStepStats(7);
  const nutritionSummary = getNutritionSummary(7);
  const healthScore = calculateHealthScore();
  const sleepTrend = getSleepTrend(7);
  const sleepScore = avgBy(sleepTrend, t => calculateSleepScore(t));
  const waterConsistency = s.water?.count >= (s.water?.goal || 8) ? 'Hit goal' : `${s.water?.count || 0}/${s.water?.goal || 8}`;
  const sections = [
    { title: 'Health Score', value: `${healthScore}/100`, trend: healthScore > 70 ? 'good' : healthScore > 40 ? 'fair' : 'needs_attention' },
    { title: 'Sleep', value: `${sleepStats.avgHours}h avg`, detail: `Quality: ${sleepStats.avgQuality}/10 · Score: ${Math.round(sleepScore)}` },
    { title: 'Exercise', value: `${exerciseStats.total} sessions`, detail: `${exerciseStats.totalMinutes} min · ${exerciseStats.totalCalories} cal` },
    { title: 'Steps', value: `${stepStats.avgSteps}/day`, detail: `${stepStats.totalSteps} total · ${stepStats.daysHitGoal}/${stepStats.daysTracked} days hit goal` },
    { title: 'Nutrition', value: `${nutritionSummary.avgDailyCalories} cal/day`, detail: `${nutritionSummary.totalMeals} meals tracked` },
    { title: 'Water', value: waterConsistency, detail: `Goal: ${s.water?.goal || 8} glasses/day` },
  ];
  const recommendations = [];
  if (sleepStats.avgHours < 7) recommendations.push('Try to get more sleep. Aim for 7-9 hours nightly.');
  if (exerciseStats.sessionsPerWeek < 3) recommendations.push('Increase exercise to at least 3 sessions per week.');
  if (stepStats.avgSteps < 7000) recommendations.push('Walk more! Aim for 10,000 steps daily.');
  if (nutritionSummary.avgDailyCalories > nutritionSummary.goal * 1.1) recommendations.push('Watch your calorie intake. Try to stay near your daily goal.');
  if (healthScore < 50) recommendations.push('Focus on the basics: sleep, exercise, and nutrition are the foundation of health.');

  return { weekLabel, healthScore, sleepStats, exerciseStats, stepStats, nutritionSummary, waterConsistency, sections, recommendations, generatedAt: new Date().toISOString() };
}

export function getWaterHistory(days = 30) {
  const s = State.get();
  const rangeStart = daysAgo(days);
  const waterLogs = s.logs.filter(l => l.type === 'water' && l.date >= rangeStart);
  const history = [];
  const d = new Date(rangeStart);
  const end = new Date();
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    const log = waterLogs.find(l => l.date === ds);
    if (log) {
      const match = log.title.match(/Water:\s*(\d+)\/(\d+)/);
      if (match) history.push({ date: ds, count: parseInt(match[1]), goal: parseInt(match[2]) });
    } else {
      history.push({ date: ds, count: 0, goal: s.water?.goal || 8 });
    }
    d.setDate(d.getDate() + 1);
  }
  return history;
}

export function getWaterStreak() {
  const s = State.get();
  const goal = s.water?.goal || 8;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    const log = s.logs.find(l => l.type === 'water' && l.date === ds);
    if (log) {
      const match = log.title.match(/Water:\s*(\d+)\/(\d+)/);
      if (match && parseInt(match[1]) >= goal) streak++;
      else break;
    } else break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getWaterStats(days = 30) {
  const history = getWaterHistory(days);
  const withData = history.filter(h => h.count > 0);
  if (!withData.length) return { avgDaily: 0, consistency: 0, streak: 0, daysHitGoal: 0 };
  const goal = withData[0]?.goal || 8;
  const avgDaily = avgBy(withData, h => h.count);
  const daysHitGoal = withData.filter(h => h.count >= goal).length;
  return {
    avgDaily: Math.round(avgDaily * 10) / 10,
    consistency: Math.round((withData.length / history.length) * 100),
    streak: getWaterStreak(),
    daysHitGoal,
    totalDays: withData.length,
    goal,
    hitRate: Math.round((daysHitGoal / withData.length) * 100),
  };
}

export function getExerciseByMonth(month) {
  const s = State.get();
  if (!s.exercise) return [];
  const monthStr = (month || today()).slice(0, 7);
  return s.exercise.filter(e => e.date && e.date.slice(0, 7) === monthStr);
}

export function getMealFrequency(days = 30) {
  const s = State.get();
  const rangeStart = daysAgo(days);
  const mealLogs = s.logs.filter(l => l.type === 'nutrition' && l.date >= rangeStart);
  const byType = {};
  MEAL_TYPES.forEach(mt => { byType[mt.id] = 0; });
  mealLogs.forEach(l => {
    const match = l.title.match(/Meal:\s*(.*?)\s*\(/);
    if (match) {
      const desc = match[1].toLowerCase();
      MEAL_TYPES.forEach(mt => {
        if (desc.includes(mt.label.toLowerCase())) byType[mt.id]++;
      });
    }
  });
  return byType;
}

const HealthExt = {
  logSleep,
  logSleepHistory,
  getSleepTrend,
  calculateSleepScore,
  getSleepScoreTrend,
  getSleepStats,
  logExercise,
  getExerciseStats,
  calculateCalories,
  logMeal,
  getNutritionSummary,
  calculateCalorieBalance,
  logSteps,
  getStepHistory,
  getAverageSteps,
  getStepStats,
  calculateHealthScore,
  generateHealthWeekSummary,
  getWaterHistory,
  getWaterStreak,
  getWaterStats,
  getExerciseByMonth,
  getMealFrequency,
};

export default HealthExt;
