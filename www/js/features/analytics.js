import State from '../state.js';
import { today, daysAgo, daysBetween, groupBy, sumBy, avgBy, sortBy, clamp } from '../helpers.js';
import { MOODS, EXERCISE_TYPES } from '../constants.js';

function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function filterByDateRange(items, from, to) {
  return items.filter(item => {
    const d = item.date || item.timestamp?.slice(0, 10);
    return d >= from && d <= to;
  });
}

export function getBalanceTrend(days = 30) {
  const s = State.get();
  if (!s.balanceHistory || !s.balanceHistory.length) return [];
  const range = getDateRange(days);
  const filtered = filterByDateRange(s.balanceHistory, range.start, range.end);
  return sortBy(filtered, item => item.date);
}

export function getAverageScore(days = 7) {
  const trend = getBalanceTrend(days);
  if (!trend.length) return 0;
  return Math.round(avgBy(trend, item => item.score));
}

export function getHabitCompletionRate(days = 30) {
  const s = State.get();
  const range = getDateRange(days);
  const result = {};
  s.habits.forEach(habit => {
    const logsInRange = s.logs.filter(l =>
      l.type === 'habit' && l.title.includes(habit.name) &&
      l.date >= range.start && l.date <= range.end
    );
    const uniqueDays = new Set(logsInRange.map(l => l.date));
    result[habit.name] = {
      completed: uniqueDays.size,
      total: days,
      rate: Math.round((uniqueDays.size / days) * 100),
      emoji: habit.emoji,
    };
  });
  return result;
}

export function getMoodDistribution(days = 30) {
  const s = State.get();
  const range = getDateRange(days);
  const moodLogs = s.journal.filter(j =>
    j.mood && j.date >= range.start && j.date <= range.end
  );
  const distribution = {};
  MOODS.forEach(m => { distribution[m.emoji] = { count: 0, label: m.label, score: m.score }; });
  moodLogs.forEach(j => {
    if (distribution[j.mood]) distribution[j.mood].count++;
  });
  return distribution;
}

export function getMoodTrend(days = 30) {
  const s = State.get();
  const range = getDateRange(days);
  const moodMap = {};
  MOODS.forEach(m => { moodMap[m.emoji] = m.score; });
  const moodLogs = s.journal.filter(j =>
    j.mood && j.date >= range.start && j.date <= range.end
  );
  const byDate = groupBy(moodLogs, 'date');
  return Object.entries(byDate).map(([date, entries]) => {
    const avgScore = avgBy(entries, e => moodMap[e.mood] || 0);
    return { date, score: Math.round(avgScore * 100) };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function getDomainActivity(days = 30) {
  const s = State.get();
  const range = getDateRange(days);
  const logs = s.logs.filter(l => l.date >= range.start && l.date <= range.end);
  const byType = groupBy(logs, 'type');
  const counts = {};
  Object.entries(byType).forEach(([type, items]) => {
    counts[type] = items.length;
  });
  return counts;
}

export function getWaterConsistency(days = 30) {
  const s = State.get();
  const range = getDateRange(days);
  const goal = s.water.goal || 8;
  let daysHit = 0;
  let totalDays = 0;
  const dailyData = [];
  const d = new Date(range.start);
  const end = new Date(range.end);
  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10);
    const waterLog = s.logs.filter(l =>
      l.type === 'water' && l.date === dateStr
    );
    const count = waterLog.reduce((sum, l) => {
      const match = l.title.match(/(\d+)\/(\d+)/);
      return match ? parseInt(match[1]) : sum;
    }, 0);
    const hitGoal = count >= goal;
    if (waterLog.length > 0) {
      totalDays++;
      if (hitGoal) daysHit++;
    }
    dailyData.push({ date: dateStr, count, goal, hitGoal });
    d.setDate(d.getDate() + 1);
  }
  return {
    consistency: totalDays > 0 ? Math.round((daysHit / totalDays) * 100) : 0,
    daysHit,
    totalDays,
    dailyData,
    goal,
    streak: calculateWaterStreak(),
  };
}

function calculateWaterStreak() {
  const s = State.get();
  const goal = s.water.goal || 8;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    const waterLogs = s.logs.filter(l => l.type === 'water' && l.date === dateStr);
    const count = waterLogs.reduce((sum, l) => {
      const match = l.title.match(/(\d+)\/(\d+)/);
      return match ? parseInt(match[1]) : sum;
    }, 0);
    if (count >= goal) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function getBestTimeForHabit(habitId) {
  const s = State.get();
  const habit = s.habits.find(h => h.id === habitId);
  if (!habit) return null;
  const logs = s.logs.filter(l =>
    l.type === 'habit' && l.title.includes(habit.name)
  );
  if (!logs.length) return null;
  const hourBuckets = {};
  for (let i = 0; i < 24; i++) hourBuckets[i] = 0;
  logs.forEach(l => {
    if (l.time) {
      const match = l.time.match(/(\d+):(\d+)/);
      if (match) {
        let hour = parseInt(match[1]);
        const period = l.time.includes('PM') && hour !== 12 ? hour + 12 : hour;
        const adjusted = l.time.includes('AM') && hour === 12 ? 0 : period;
        if (adjusted >= 0 && adjusted < 24) hourBuckets[adjusted]++;
      }
    }
  });
  let bestHour = 0;
  let bestCount = 0;
  Object.entries(hourBuckets).forEach(([hour, count]) => {
    if (count > bestCount) { bestCount = count; bestHour = parseInt(hour); }
  });
  const period = bestHour < 6 ? 'early morning' : bestHour < 12 ? 'morning' : bestHour < 17 ? 'afternoon' : bestHour < 21 ? 'evening' : 'night';
  return {
    hour: bestHour,
    count: bestCount,
    total: logs.length,
    period,
    distribution: hourBuckets,
    timeLabel: `${bestHour.toString().padStart(2, '0')}:00`,
  };
}

export function getSleepPatterns(days = 30) {
  const s = State.get();
  const range = getDateRange(days);
  const sleepLogs = s.logs.filter(l =>
    l.type === 'health' && l.title.includes('Sleep') &&
    l.date >= range.start && l.date <= range.end
  );
  if (!sleepLogs.length) {
    return {
      avgHours: 0,
      avgQuality: 0,
      trend: [],
      consistency: 0,
      optimalDays: 0,
      totalDays: 0,
      recommendation: 'No sleep data available. Start logging your sleep!',
    };
  }
  const dailyData = [];
  sleepLogs.forEach(l => {
    const match = l.title.match(/Sleep:\s*([\d.]+)h.*quality\s*(\d+)/i);
    if (match) {
      dailyData.push({
        date: l.date,
        hours: parseFloat(match[1]),
        quality: parseInt(match[2]),
      });
    }
  });
  const avgHours = avgBy(dailyData, d => d.hours);
  const avgQuality = avgBy(dailyData, d => d.quality);
  const optimalDays = dailyData.filter(d => d.hours >= 7 && d.hours <= 9 && d.quality >= 7).length;
  const trend = sortBy(dailyData, d => d.date);
  const consistency = dailyData.length > 0 ? Math.round((dailyData.length / Math.min(days, dailyData.length + 30)) * 100) : 0;
  let recommendation = '';
  if (avgHours < 6) recommendation = 'You are sleep deprived. Aim for 7-9 hours.';
  else if (avgHours < 7) recommendation = 'Try to sleep a bit more. 7-9 hours is optimal.';
  else if (avgHours > 9) recommendation = 'You might be oversleeping. 7-9 hours is optimal.';
  else recommendation = 'Great sleep duration! Focus on consistency.';
  return { avgHours: Math.round(avgHours * 10) / 10, avgQuality: Math.round(avgQuality * 10) / 10, trend, consistency, optimalDays, totalDays: dailyData.length, recommendation };
}

export function getCorrelation(factor1, factor2) {
  const s = State.get();
  const range = getDateRange(60);
  const dataPoints = [];
  const d = new Date(range.start);
  const end = new Date(range.end);
  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10);
    dataPoints.push({ date: dateStr });
    d.setDate(d.getDate() + 1);
  }
  const factorMap = {
    sleep: (dateStr) => {
      const log = s.logs.find(l => l.type === 'health' && l.title.includes('Sleep') && l.date === dateStr);
      if (!log) return null;
      const match = log.title.match(/Sleep:\s*([\d.]+)h/);
      return match ? parseFloat(match[1]) : null;
    },
    mood: (dateStr) => {
      const entry = s.journal.find(j => j.mood && j.date === dateStr);
      if (!entry) return null;
      const moodMap = {};
      MOODS.forEach(m => { moodMap[m.emoji] = m.score; });
      return moodMap[entry.mood] || null;
    },
    exercise: (dateStr) => {
      const logs = s.logs.filter(l => l.type === 'health' && l.title.includes('Exercise') && l.date === dateStr);
      const match = logs[logs.length - 1]?.title.match(/(\d+)min/);
      return match ? parseInt(match[1]) : (logs.length > 0 ? 1 : null);
    },
    water: (dateStr) => {
      const logs = s.logs.filter(l => l.type === 'water' && l.date === dateStr);
      const match = logs[logs.length - 1]?.title.match(/(\d+)\/(\d+)/);
      return match ? parseInt(match[1]) : null;
    },
    productivity: (dateStr) => {
      const tasksDone = s.tasks ? s.tasks.filter(t => t.done && t.date === dateStr).length : 0;
      const logCount = s.logs.filter(l => l.date === dateStr && l.type !== 'general').length;
      return tasksDone + logCount * 0.5;
    },
    steps: (dateStr) => {
      const log = s.logs.find(l => l.type === 'health' && l.title.includes('Steps') && l.date === dateStr);
      if (!log) return null;
      const match = log.title.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    },
  };
  const getF1 = typeof factor1 === 'function' ? factor1 : factorMap[factor1];
  const getF2 = typeof factor2 === 'function' ? factor2 : factorMap[factor2];
  if (!getF1 || !getF2) return null;
  const pairs = dataPoints.map(dp => ({
    x: getF1(dp.date),
    y: getF2(dp.date),
  })).filter(p => p.x !== null && p.y !== null);
  if (pairs.length < 3) return { coefficient: 0, strength: 'insufficient data', pairs: pairs.length };
  const n = pairs.length;
  const sumX = pairs.reduce((s, p) => s + p.x, 0);
  const sumY = pairs.reduce((s, p) => s + p.y, 0);
  const sumXY = pairs.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = pairs.reduce((s, p) => s + p.x * p.x, 0);
  const sumY2 = pairs.reduce((s, p) => s + p.y * p.y, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const r = den === 0 ? 0 : num / den;
  const coefficient = clamp(r, -1, 1);
  let strength = 'none';
  const abs = Math.abs(coefficient);
  if (abs > 0.7) strength = 'strong';
  else if (abs > 0.4) strength = 'moderate';
  else if (abs > 0.2) strength = 'weak';
  return { coefficient: Math.round(coefficient * 100) / 100, strength, pairs: n, direction: coefficient > 0 ? 'positive' : 'negative' };
}

export function getExerciseFrequency(days = 30) {
  const s = State.get();
  const range = getDateRange(days);
  const exerciseLogs = s.logs.filter(l =>
    l.type === 'health' && l.title.includes('Exercise') &&
    l.date >= range.start && l.date <= range.end
  );
  const uniqueDays = new Set(exerciseLogs.map(l => l.date));
  const weeks = Math.max(1, days / 7);
  const sessionsPerWeek = Math.round((uniqueDays.size / weeks) * 10) / 10;
  const byType = groupBy(exerciseLogs, l => {
    const match = l.title.match(/Exercise:\s*(\w+)/);
    return match ? match[1] : 'other';
  });
  const typeBreakdown = {};
  Object.entries(byType).forEach(([type, logs]) => {
    typeBreakdown[type] = {
      sessions: logs.length,
      uniqueDays: new Set(logs.map(l => l.date)).size,
    };
  });
  const totalDuration = exerciseLogs.reduce((sum, l) => {
    const match = l.title.match(/(\d+)min/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);
  return {
    sessionsPerWeek,
    totalSessions: uniqueDays.size,
    totalDuration,
    avgDurationPerSession: uniqueDays.size > 0 ? Math.round(totalDuration / uniqueDays.size) : 0,
    typeBreakdown,
    weeks,
  };
}

export function getFinanceTrend(days = 30) {
  const s = State.get();
  if (!s.transactions || !s.transactions.length) return [];
  const range = getDateRange(days);
  const filtered = s.transactions.filter(t => t.date >= range.start && t.date <= range.end);
  const byDate = groupBy(filtered, 'date');
  return Object.entries(byDate).map(([date, txs]) => {
    const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { date, income, expense, net: income - expense, count: txs.length };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function getSpendingForecast() {
  const s = State.get();
  if (!s.transactions || s.transactions.length < 5) return null;
  const byMonth = groupBy(s.transactions.filter(t => t.type === 'expense'), t => t.date.slice(0, 7));
  const monthlyTotals = Object.entries(byMonth).map(([month, txs]) => ({
    month,
    total: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0),
  })).sort((a, b) => a.month.localeCompare(b.month));
  if (monthlyTotals.length < 2) {
    return { forecast: monthlyTotals[0]?.total || 0, confidence: 'low', months: monthlyTotals };
  }
  const recent = monthlyTotals.slice(-3);
  const avg = avgBy(recent, m => m.total);
  let trend = 0;
  if (recent.length >= 2) {
    const first = recent[0].total;
    const last = recent[recent.length - 1].total;
    trend = (last - first) / recent.length;
  }
  const forecast = avg + trend;
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    forecast: Math.round(forecast * 100) / 100,
    trend: Math.round(trend * 100) / 100,
    avgMonthly: Math.round(avg * 100) / 100,
    confidence: monthlyTotals.length >= 6 ? 'high' : monthlyTotals.length >= 3 ? 'medium' : 'low',
    months: monthlyTotals,
    nextMonth: nextMonth.toISOString().slice(0, 7),
  };
}

export function getStreakAnalysis() {
  const s = State.get();
  const habits = s.habits || [];
  const habitStreaks = habits.map(h => ({
    name: h.name,
    emoji: h.emoji,
    currentStreak: h.streak || 0,
    longestStreak: calculateLongestStreak(h),
    done: h.done,
  }));
  const longestHabitStreak = Math.max(...habitStreaks.map(h => h.longestStreak), 0);
  const currentHabitStreak = Math.max(...habitStreaks.map(h => h.currentStreak), 0);
  const bestHabit = habitStreaks.find(h => h.longestStreak === longestHabitStreak);
  const waterStreak = calculateWaterStreak();
  const journalStreak = calculateJournalStreak(s);
  const all = [
    { type: 'habits', label: 'Best Habit', current: currentHabitStreak, longest: longestHabitStreak, detail: bestHabit ? `${bestHabit.emoji} ${bestHabit.name}` : 'N/A' },
    { type: 'water', label: 'Water Goal', current: waterStreak, longest: waterStreak, detail: `${waterStreak} days` },
    { type: 'journal', label: 'Journaling', current: journalStreak, longest: journalStreak, detail: `${journalStreak} days` },
  ];
  return { habits: habitStreaks, all, longestHabitStreak, currentHabitStreak, waterStreak, journalStreak, bestHabit: bestHabit || null };
}

function calculateLongestStreak(habit) {
  const s = State.get();
  let longest = 0;
  let current = 0;
  const logs = s.logs.filter(l => l.type === 'habit' && l.title.includes(habit.name));
  const dates = [...new Set(logs.map(l => l.date))].sort();
  for (let i = 0; i < dates.length; i++) {
    if (i === 0 || daysBetween(dates[i], dates[i - 1]) === 1) {
      current++;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
  }
  return Math.max(longest, current);
}

function calculateJournalStreak(s) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    if (s.journal.some(j => j.date === dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function getWeeklyComparison() {
  const s = State.get();
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
  const thisStart = thisWeekStart.toISOString().slice(0, 10);
  const thisEnd = thisWeekEnd.toISOString().slice(0, 10);
  const lastStart = lastWeekStart.toISOString().slice(0, 10);
  const lastEnd = new Date(thisWeekStart);
  lastEnd.setDate(lastEnd.getDate() - 1);
  const lastEndStr = lastEnd.toISOString().slice(0, 10);

  const countByType = (logs, start, end, type) => {
    return logs.filter(l => l.type === type && l.date >= start && l.date <= end).length;
  };
  const uniqueDaysByType = (logs, start, end, type) => {
    const days = new Set(logs.filter(l => l.type === type && l.date >= start && l.date <= end).map(l => l.date));
    return days.size;
  };

  const thisWeek = {
    habitsDone: uniqueDaysByType(s.logs, thisStart, thisEnd, 'habit'),
    moodLogs: countByType(s.logs, thisStart, thisEnd, 'mood'),
    exerciseLogs: countByType(s.logs, thisStart, thisEnd, 'health'),
    journalEntries: s.journal.filter(j => j.date >= thisStart && j.date <= thisEnd).length,
    waterDays: uniqueDaysByType(s.logs, thisStart, thisEnd, 'water'),
    transactions: s.transactions ? s.transactions.filter(t => t.date >= thisStart && t.date <= thisEnd).length : 0,
  };
  const lastWeek = {
    habitsDone: uniqueDaysByType(s.logs, lastStart, lastEndStr, 'habit'),
    moodLogs: countByType(s.logs, lastStart, lastEndStr, 'mood'),
    exerciseLogs: countByType(s.logs, lastStart, lastEndStr, 'health'),
    journalEntries: s.journal.filter(j => j.date >= lastStart && j.date <= lastEndStr).length,
    waterDays: uniqueDaysByType(s.logs, lastStart, lastEndStr, 'water'),
    transactions: s.transactions ? s.transactions.filter(t => t.date >= lastStart && t.date <= lastEndStr).length : 0,
  };
  const changes = {};
  Object.keys(thisWeek).forEach(key => {
    const diff = thisWeek[key] - lastWeek[key];
    changes[key] = {
      this: thisWeek[key],
      last: lastWeek[key],
      diff,
      pct: lastWeek[key] > 0 ? Math.round((diff / lastWeek[key]) * 100) : (thisWeek[key] > 0 ? 100 : 0),
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    };
  });
  return { thisWeek, lastWeek, changes, weekStart: thisStart, lastWeekStart: lastStart };
}

export function generateMonthlyReport() {
  const s = State.get();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = now.toISOString().slice(0, 10);
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const habitsCompleted = uniqueDaysInRange(s.logs, monthStart, monthEnd, 'habit');
  const totalHabits = s.habits.length;
  const avgBalance = getAverageScore(30);
  const moodDist = getMoodDistribution(30);
  const totalMoods = Object.values(moodDist).reduce((s, m) => s + m.count, 0);
  const dominantMood = Object.entries(moodDist).sort((a, b) => b[1].count - a[1].count)[0];
  const waterConsistency = getWaterConsistency(30);
  const exerciseFreq = getExerciseFrequency(30);
  const sleepPats = getSleepPatterns(30);
  const journalCount = s.journal.filter(j => j.date >= monthStart && j.date <= monthEnd).length;
  const financeTrend = getFinanceTrend(30);
  const totalSpending = financeTrend.reduce((s, d) => s + d.expense, 0);
  const totalIncome = financeTrend.reduce((s, d) => s + d.income, 0);
  const goalsCompleted = s.goals.filter(g => g.completed && g.completedDate >= monthStart).length;
  const achievementsThisMonth = s.achievements.filter(a => a.unlockedAt && a.unlockedAt.slice(0, 7) === now.toISOString().slice(0, 7)).length;
  const bestStreak = Math.max(...s.habits.map(h => h.streak), 0);

  let summary = `Report for ${monthLabel}:\n`;
  summary += `• Balance: ${avgBalance}/100 average\n`;
  summary += `• Habits: ${habitsCompleted}/${totalHabits} done daily avg\n`;
  if (dominantMood) summary += `• Dominant mood: ${dominantMood[0]} (${dominantMood[1].label})\n`;
  summary += `• Water: ${waterConsistency.consistency}% consistency\n`;
  summary += `• Exercise: ${exerciseFreq.sessionsPerWeek}/week\n`;
  summary += `• Sleep: ${sleepPats.avgHours}h avg, ${sleepPats.avgQuality}/10 quality\n`;
  summary += `• Journal: ${journalCount} entries\n`;
  summary += `• Best streak: ${bestStreak} days\n`;
  summary += `• Goals done: ${goalsCompleted}\n`;
  summary += `• Achievements: ${achievementsThisMonth} new\n`;
  if (totalSpending > 0) summary += `• Spending: $${totalSpending.toFixed(2)} (income: $${totalIncome.toFixed(2)})\n`;
  summary += `• Moods logged: ${totalMoods}\n`;
  summary += `• Exercise sessions: ${exerciseFreq.totalSessions}\n`;

  return {
    month: monthLabel,
    monthStart,
    monthEnd,
    avgBalance,
    habitsCompleted,
    totalHabits,
    dominantMood: dominantMood ? { emoji: dominantMood[0], label: dominantMood[1].label } : null,
    waterConsistency: waterConsistency.consistency,
    exerciseSessionsPerWeek: exerciseFreq.sessionsPerWeek,
    avgSleepHours: sleepPats.avgHours,
    avgSleepQuality: sleepPats.avgQuality,
    journalCount,
    totalSpending,
    totalIncome,
    goalsCompleted,
    achievementsThisMonth,
    bestStreak,
    totalMoods,
    summary,
  };
}

function uniqueDaysInRange(logs, start, end, type) {
  return new Set(logs.filter(l => l.type === type && l.date >= start && l.date <= end).map(l => l.date)).size;
}

export function getInsights() {
  const s = State.get();
  const insights = [];
  const sleepPats = getSleepPatterns(30);
  if (sleepPats.avgHours > 0) {
    if (sleepPats.avgHours < 6) {
      insights.push({ type: 'warning', icon: '⚠️', text: 'You are averaging under 6 hours of sleep. This can impact your health and productivity.' });
    } else if (sleepPats.avgHours >= 7 && sleepPats.avgQuality >= 7) {
      insights.push({ type: 'positive', icon: '✅', text: 'Your sleep quality and duration are excellent! Keep it up.' });
    }
  }
  const waterCons = getWaterConsistency(30);
  if (waterCons.consistency > 0) {
    if (waterCons.consistency < 50) {
      insights.push({ type: 'warning', icon: '💧', text: `You hit your water goal only ${waterCons.consistency}% of days. Try setting hourly reminders.` });
    } else if (waterCons.consistency >= 80) {
      insights.push({ type: 'positive', icon: '💧', text: 'Great hydration consistency! Staying hydrated boosts energy and focus.' });
    }
  }
  const exerciseFreq = getExerciseFrequency(30);
  if (exerciseFreq.sessionsPerWeek > 0) {
    if (exerciseFreq.sessionsPerWeek < 2) {
      insights.push({ type: 'suggestion', icon: '🏃', text: `You exercise ${exerciseFreq.sessionsPerWeek}x/week. Aim for at least 3 sessions for optimal health.` });
    } else if (exerciseFreq.sessionsPerWeek >= 4) {
      insights.push({ type: 'positive', icon: '🏃', text: 'You are exercising regularly! This is excellent for your physical and mental health.' });
    }
  }
  const moodKey = getMoodDominant(s);
  if (moodKey) {
    const moodInfo = MOODS.find(m => m.emoji === moodKey);
    if (moodInfo && moodInfo.score < 0.4) {
      insights.push({ type: 'attention', icon: moodKey, text: 'Your recent mood has been low. Consider talking to someone or taking time for self-care.' });
    }
  }
  const corrSleepMood = getCorrelation('sleep', 'mood');
  if (corrSleepMood && corrSleepMood.strength !== 'insufficient data') {
    if (corrSleepMood.coefficient > 0.3) {
      insights.push({ type: 'insight', icon: '🧠', text: `You tend to feel better on days after good sleep (correlation: ${corrSleepMood.coefficient}). Prioritize bedtime!` });
    }
  }
  const corrExerciseMood = getCorrelation('exercise', 'mood');
  if (corrExerciseMood && corrExerciseMood.strength !== 'insufficient data') {
    if (corrExerciseMood.coefficient > 0.3) {
      insights.push({ type: 'insight', icon: '🧠', text: `Exercise boosts your mood (correlation: ${corrExerciseMood.coefficient}). Keep moving!` });
    }
  }
  const streaks = getStreakAnalysis();
  if (streaks.bestHabit && streaks.bestHabit.longestStreak >= 7) {
    insights.push({ type: 'positive', icon: '🔥', text: `Your longest streak is ${streaks.bestHabit.longestStreak} days on "${streaks.bestHabit.name}"!` });
  }
  const habitsDone = s.habits.filter(h => h.done).length;
  const habitsTotal = s.habits.length;
  if (habitsTotal > 0 && habitsDone < habitsTotal * 0.5) {
    insights.push({ type: 'suggestion', icon: '🎯', text: `You completed ${habitsDone}/${habitsTotal} habits today. Try to complete them all!` });
  } else if (habitsTotal > 0 && habitsDone === habitsTotal) {
    insights.push({ type: 'positive', icon: '🌟', text: 'All habits completed! You are on fire today!' });
  }
  const journalGap = s.journal.length > 0 ? daysBetween(today(), s.journal[0]?.date) : null;
  if (journalGap !== null && journalGap > 3) {
    insights.push({ type: 'suggestion', icon: '✍️', text: `It has been ${journalGap} days since your last journal entry. Reflecting helps maintain mental clarity.` });
  }
  if (s.tasks) {
    const pending = s.tasks.filter(t => !t.done && t.due && t.due < today()).length;
    if (pending > 0) {
      insights.push({ type: 'warning', icon: '📋', text: `You have ${pending} overdue tasks. Consider reviewing your priorities.` });
    }
  }
  const totalXP = s.xp || 0;
  const level = s.level || 0;
  const nextXP = getNextLevelXP(totalXP);
  if (nextXP && nextXP !== Infinity && nextXP <= 50) {
    insights.push({ type: 'motivation', icon: '⬆️', text: `You are only ${nextXP} XP away from level ${level + 1}!` });
  }
  if (insights.length === 0) {
    insights.push({ type: 'info', icon: '📊', text: 'Not enough data yet. Keep tracking to get personalized insights!' });
  }
  return insights;
}

function getMoodDominant(s) {
  const recentMoods = s.journal.filter(j => j.mood && j.date >= daysAgo(14));
  if (!recentMoods.length) return null;
  const counts = {};
  recentMoods.forEach(j => { counts[j.mood] = (counts[j.mood] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function getNextLevelXP(xp) {
  const { XP_LEVELS } = require('../constants.js');
  const levels = XP_LEVELS;
  const current = levels.reduce((last, l, i) => xp >= l ? i : last, 0);
  const next = current + 1;
  if (next >= levels.length) return Infinity;
  return levels[next] - xp;
}

export function getXPPacing(days = 30) {
  const s = State.get();
  const range = getDateRange(days);
  const logs = s.logs.filter(l => l.date >= range.start && l.date <= range.end);
  const byDate = groupBy(logs, 'date');
  const dailyXP = Object.entries(byDate).map(([date, dayLogs]) => {
    let xp = 0;
    dayLogs.forEach(l => {
      if (l.type === 'habit') xp += 5;
      else if (l.type === 'mood') xp += 3;
      else if (l.type === 'journal') xp += 10;
      else if (l.type === 'achievement') xp += 50;
      else if (l.type === 'challenge') xp += 5;
      else if (l.type === 'goal') xp += 50;
      else if (l.type === 'gratitude') xp += 3;
      else if (l.type === 'health') xp += 5;
      else if (l.type === 'finance') xp += 2;
    });
    return { date, xp };
  }).sort((a, b) => a.date.localeCompare(b.date));
  const totalXP = dailyXP.reduce((s, d) => s + d.xp, 0);
  const avgDaily = days > 0 ? Math.round(totalXP / days) : 0;
  return { dailyXP, totalXP, avgDaily, days };
}

export function getTopHabitsByStreak(limit = 5) {
  const s = State.get();
  return [...s.habits].sort((a, b) => b.streak - a.streak).slice(0, limit);
}

export function getJournalWordFrequency(limit = 20) {
  const s = State.get();
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'it', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'his', 'her', 'they', 'them', 'their', 'that', 'this', 'these', 'those', 'not', 'no', 'so', 'up', 'out', 'if', 'about', 'just', 'very', 'also', 'more', 'some', 'any', 'each', 'every', 'own', 'than', 'too', 'can', 'get', 'got', 'been', 'being', 'after', 'before', 'between', 'over', 'under', 'again', 'further', 'then', 'once']);
  const words = {};
  s.journal.forEach(j => {
    const text = (j.text || '').toLowerCase().replace(/[^a-z\s]/g, '');
    text.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)).forEach(w => {
      words[w] = (words[w] || 0) + 1;
    });
  });
  return Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word, count]) => ({ word, count }));
}

const Analytics = {
  getBalanceTrend,
  getAverageScore,
  getHabitCompletionRate,
  getMoodDistribution,
  getMoodTrend,
  getDomainActivity,
  getWaterConsistency,
  getBestTimeForHabit,
  getSleepPatterns,
  getCorrelation,
  getExerciseFrequency,
  getFinanceTrend,
  getSpendingForecast,
  getStreakAnalysis,
  getWeeklyComparison,
  generateMonthlyReport,
  getInsights,
  getXPPacing,
  getTopHabitsByStreak,
  getJournalWordFrequency,
};

export default Analytics;
