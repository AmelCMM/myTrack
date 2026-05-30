import State from '../state.js';
import { today, daysAgo, dateStr, dateStrShort, monthName, weekStart, monthStart, formatTime, formatCurrency, escapeHtml, sumBy, avgBy, sortBy, groupBy } from '../helpers.js';
import { MOODS } from '../constants.js';
import Analytics from './analytics.js';

function generateDateRange(dateFrom, dateTo) {
  const dates = [];
  const d = new Date(dateFrom);
  const end = new Date(dateTo);
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function getReportDateRange(report) {
  if (!report) return { from: '', to: '', label: '' };
  return { from: report.fromDate, to: report.toDate, label: report.periodLabel };
}

export function generateDailyReport(date) {
  const s = State.get();
  const reportDate = date || today();
  const dateLabel = dateStr(reportDate);
  const dayLogs = s.logs.filter(l => l.date === reportDate);
  const habitsOnDay = s.habits.map(h => {
    const done = dayLogs.some(l => l.type === 'habit' && l.title.includes(h.name));
    return { ...h, done };
  });
  const moodEntry = s.journal.find(j => j.date === reportDate && j.mood);
  const journalEntries = s.journal.filter(j => j.date === reportDate);
  const waterLog = dayLogs.find(l => l.type === 'water');
  const waterMatch = waterLog ? waterLog.title.match(/(\d+)\/(\d+)/) : null;
  const water = waterMatch ? { count: parseInt(waterMatch[1]), goal: parseInt(waterMatch[2]) } : null;
  const sleepEntry = dayLogs.find(l => l.type === 'health' && l.title.includes('Sleep'));
  const sleepMatch = sleepEntry ? sleepEntry.title.match(/Sleep:\s*([\d.]+)h.*quality\s*(\d+)/i) : null;
  const sleep = sleepMatch ? { hours: parseFloat(sleepMatch[1]), quality: parseInt(sleepMatch[2]) } : null;
  const exerciseEntries = dayLogs.filter(l => l.type === 'health' && l.title.includes('Exercise'));
  const dayTransactions = s.transactions ? s.transactions.filter(t => t.date === reportDate) : [];
  const totalSpent = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalEarned = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const focusSessions = s.focusHistory ? s.focusHistory.filter(f => f.date === reportDate) : [];
  const totalFocusMin = sumBy(focusSessions, f => f.duration);
  const tasksDone = s.tasks ? s.tasks.filter(t => t.done && t.date === reportDate).length : 0;
  const steps = s.steps && s.steps.date === reportDate ? s.steps.count : 0;
  const balanceEntry = s.balanceHistory ? s.balanceHistory.find(b => b.date === reportDate) : null;
  const balance = balanceEntry ? balanceEntry.score : null;
  const habitsDone = habitsOnDay.filter(h => h.done).length;
  const habitsTotal = habitsOnDay.length;
  const completionRate = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0;

  const sections = [];
  sections.push({ type: 'summary', title: 'Summary', data: { date: reportDate, dateLabel, balance, habitsDone, habitsTotal, completionRate, steps, totalFocusMin, tasksDone, mood: moodEntry ? moodEntry.mood : null } });
  if (habitsOnDay.length > 0) sections.push({ type: 'habits', title: 'Habits', data: habitsOnDay });
  if (moodEntry) sections.push({ type: 'mood', title: 'Mood', data: moodEntry });
  if (water) sections.push({ type: 'water', title: 'Water', data: water });
  if (sleep) sections.push({ type: 'sleep', title: 'Sleep', data: sleep });
  if (exerciseEntries.length > 0) sections.push({ type: 'exercise', title: 'Exercise', data: exerciseEntries });
  if (journalEntries.length > 0) sections.push({ type: 'journal', title: 'Journal', data: journalEntries });
  if (dayTransactions.length > 0) sections.push({ type: 'finance', title: 'Finance', data: { transactions: dayTransactions, totalSpent, totalEarned } });
  if (focusSessions.length > 0) sections.push({ type: 'focus', title: 'Focus', data: focusSessions });

  return {
    type: 'daily',
    fromDate: reportDate,
    toDate: reportDate,
    periodLabel: dateLabel,
    generatedAt: new Date().toISOString(),
    sections,
    raw: { habitsOnDay, moodEntry, journalEntries, water, sleep, exerciseEntries, dayTransactions, focusSessions, balance, steps, tasksDone },
  };
}

export function generateWeeklyReport(weekStartDate) {
  const ws = weekStartDate || weekStart(today());
  const start = new Date(ws);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fromDate = start.toISOString().slice(0, 10);
  const toDate = end.toISOString().slice(0, 10);
  const periodLabel = `${dateStrShort(fromDate)} - ${dateStrShort(toDate)}`;
  const days = generateDateRange(fromDate, toDate);
  const s = State.get();

  const dailyReports = days.map(d => generateDailyReport(d));
  const habitsSummary = {};
  s.habits.forEach(h => {
    const doneDays = days.filter(d => {
      return s.logs.some(l => l.type === 'habit' && l.title.includes(h.name) && l.date === d);
    });
    habitsSummary[h.name] = { done: doneDays.length, total: days.length, pct: Math.round((doneDays.length / days.length) * 100), emoji: h.emoji };
  });
  const totalMoods = s.journal.filter(j => j.mood && j.date >= fromDate && j.date <= toDate);
  const avgMoodScore = totalMoods.length > 0 ? avgBy(totalMoods, j => {
    const m = MOODS.find(m => m.emoji === j.mood);
    return m ? m.score : 0;
  }) : 0;
  const totalSpent = s.transactions ? s.transactions.filter(t => t.type === 'expense' && t.date >= fromDate && t.date <= toDate).reduce((sum, t) => sum + Math.abs(t.amount), 0) : 0;
  const totalEarned = s.transactions ? s.transactions.filter(t => t.type === 'income' && t.date >= fromDate && t.date <= toDate).reduce((sum, t) => sum + Math.abs(t.amount), 0) : 0;
  const avgBalance = days.reduce((sum, d) => {
    const be = s.balanceHistory ? s.balanceHistory.find(b => b.date === d) : null;
    return sum + (be ? be.score : 0);
  }, 0) / days.length;
  const waterDays = days.filter(d => {
    return s.logs.some(l => l.type === 'water' && l.date === d);
  }).length;
  const exerciseDays = days.filter(d => {
    return s.logs.some(l => l.type === 'health' && l.title.includes('Exercise') && l.date === d);
  }).length;
  const journalCount = s.journal.filter(j => j.date >= fromDate && j.date <= toDate).length;
  const focusMinutes = s.focusHistory ? s.focusHistory.filter(f => f.date >= fromDate && f.date <= toDate).reduce((sum, f) => sum + f.duration, 0) : 0;

  return {
    type: 'weekly',
    fromDate,
    toDate,
    periodLabel,
    generatedAt: new Date().toISOString(),
    days,
    dailyReports,
    summary: {
      avgBalance: Math.round(avgBalance),
      habitsSummary,
      totalMoods: totalMoods.length,
      avgMoodScore: Math.round(avgMoodScore * 100),
      totalSpent,
      totalEarned,
      netFinance: totalEarned - totalSpent,
      waterDays,
      exerciseDays,
      journalCount,
      focusMinutes,
    },
  };
}

export function generateMonthlyReport(month) {
  const s = State.get();
  const now = month ? new Date(month + '-01T12:00:00') : new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const fromDate = monthStr + '-01';
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const toDate = new Date(nextMonth.getTime() - 86400000).toISOString().slice(0, 10);
  const periodLabel = monthName(fromDate);
  const days = generateDateRange(fromDate, toDate);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const weekDays = days.slice(i, i + 7);
    if (weekDays.length > 0) {
      weeks.push(generateWeeklyReport(weekDays[0]));
    }
  }

  const analyticsReport = Analytics.generateMonthlyReport();
  const goalsCompleted = s.goals.filter(g => g.completed && g.completedDate >= fromDate && g.completedDate <= toDate);
  const achievementsUnlocked = s.achievements.filter(a => a.unlockedAt && a.unlockedAt.slice(0, 7) === monthStr);
  const exercises = s.logs.filter(l => l.type === 'health' && l.title.includes('Exercise') && l.date >= fromDate && l.date <= toDate);
  const totalExerciseMinutes = exercises.reduce((sum, l) => {
    const m = l.title.match(/(\d+)min/);
    return sum + (m ? parseInt(m[1]) : 0);
  }, 0);
  const transactionCount = s.transactions ? s.transactions.filter(t => t.date >= fromDate && t.date <= toDate).length : 0;
  const daysTracked = new Set(s.logs.filter(l => l.date >= fromDate && l.date <= toDate).map(l => l.date)).size;

  return {
    type: 'monthly',
    fromDate,
    toDate,
    periodLabel,
    generatedAt: new Date().toISOString(),
    days,
    weeks,
    summary: {
      ...analyticsReport,
      goalsCompleted: goalsCompleted.length,
      goalsCompletedList: goalsCompleted,
      achievementsUnlocked: achievementsUnlocked.length,
      achievementsList: achievementsUnlocked,
      totalExerciseMinutes,
      transactionCount,
      daysTracked,
      totalDays: days.length,
      trackingRate: Math.round((daysTracked / days.length) * 100),
    },
  };
}

export function generateYearlyReport(year) {
  const s = State.get();
  const yearStr = year || new Date().getFullYear().toString();
  const fromDate = `${yearStr}-01-01`;
  const toDate = `${yearStr}-12-31`;
  const periodLabel = `Year ${yearStr}`;
  const months = [];
  for (let m = 0; m < 12; m++) {
    const monthStr2 = `${yearStr}-${(m + 1).toString().padStart(2, '0')}`;
    months.push(generateMonthlyReport(monthStr2));
  }
  const allTransactions = s.transactions ? s.transactions.filter(t => t.date >= fromDate && t.date <= toDate) : [];
  const totalSpent = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalEarned = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const goalsCompleted = s.goals.filter(g => g.completed && g.completedDate >= fromDate && g.completedDate <= toDate);
  const achievementsUnlocked = s.achievements.filter(a => a.unlockedAt && a.unlockedAt.slice(0, 4) === yearStr);
  const totalJournalEntries = s.journal.filter(j => j.date >= fromDate && j.date <= toDate).length;
  const totalExercises = s.logs.filter(l => l.type === 'health' && l.title.includes('Exercise') && l.date >= fromDate && l.date <= toDate).length;
  const totalFocusHours = s.focusHistory ? Math.round(s.focusHistory.filter(f => f.date >= fromDate && f.date <= toDate).reduce((sum, f) => sum + f.duration, 0) / 60 * 10) / 10 : 0;
  const avgBalance = s.balanceHistory ? avgBy(s.balanceHistory.filter(b => b.date >= fromDate && b.date <= toDate).map(b => b.score), b => b) : 0;

  return {
    type: 'yearly',
    fromDate,
    toDate,
    periodLabel,
    generatedAt: new Date().toISOString(),
    months,
    summary: {
      totalSpent,
      totalEarned,
      netFinance: totalEarned - totalSpent,
      goalsCompleted: goalsCompleted.length,
      achievementsUnlocked: achievementsUnlocked.length,
      totalJournalEntries,
      totalExercises,
      totalFocusHours,
      avgBalance: Math.round(avgBalance),
      monthCount: months.filter(m => m.summary.daysTracked > 0).length,
    },
  };
}

export function generateHabitReport(habitId, days = 30) {
  const s = State.get();
  const habit = s.habits.find(h => h.id === habitId);
  if (!habit) return null;
  const range = { start: daysAgo(days), end: today() };
  const logs = s.logs.filter(l => l.type === 'habit' && l.title.includes(habit.name) && l.date >= range.start && l.date <= range.end);
  const datesWithData = new Set(logs.map(l => l.date));
  const completionDates = [];
  const d = new Date(range.start);
  const end = new Date(range.end);
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    completionDates.push({ date: ds, done: datesWithData.has(ds) });
    d.setDate(d.getDate() + 1);
  }
  const doneCount = completionDates.filter(c => c.done).length;
  const completionRate = days > 0 ? Math.round((doneCount / days) * 100) : 0;
  let longestStreak = 0;
  let currentStreak = 0;
  completionDates.forEach(c => {
    if (c.done) { currentStreak++; longestStreak = Math.max(longestStreak, currentStreak); }
    else currentStreak = 0;
  });
  const timeAnalysis = Analytics.getBestTimeForHabit(habitId);

  return {
    habit: { ...habit },
    period: `${days} days`,
    fromDate: range.start,
    toDate: range.end,
    completionDates,
    completionRate,
    doneCount,
    totalDays: days,
    skippedDays: days - doneCount,
    longestStreak,
    currentStreak: currentStreak,
    bestTime: timeAnalysis,
    generatedAt: new Date().toISOString(),
  };
}

export function generateFinanceReport(month) {
  const s = State.get();
  const now = month ? new Date(month + '-01T12:00:00') : new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const fromDate = monthStr + '-01';
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const toDate = new Date(nextMonth.getTime() - 86400000).toISOString().slice(0, 10);
  const periodLabel = monthName(fromDate);
  const transactions = s.transactions ? s.transactions.filter(t => t.date >= fromDate && t.date <= toDate) : [];
  const expenses = transactions.filter(t => t.type === 'expense');
  const income = transactions.filter(t => t.type === 'income');
  const totalExpense = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const byCategory = groupBy(expenses, 'category');
  const categoryBreakdown = Object.entries(byCategory).map(([cat, txs]) => ({
    category: cat,
    amount: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    count: txs.length,
    pct: totalExpense > 0 ? Math.round((txs.reduce((sum, t) => sum + Math.abs(t.amount), 0) / totalExpense) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);
  const budgets = s.budgets || [];
  const budgetStatus = budgets.map(b => {
    const spent = expenses.filter(t => t.category === b.category).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { ...b, spent, remaining: b.limit - spent, pct: b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0, onTrack: spent <= b.limit };
  });
  const dailySpend = [];
  const d = new Date(fromDate);
  const e = new Date(toDate);
  while (d <= e) {
    const ds = d.toISOString().slice(0, 10);
    const dayTxs = expenses.filter(t => t.date === ds);
    dailySpend.push({ date: ds, amount: dayTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0), count: dayTxs.length });
    d.setDate(d.getDate() + 1);
  }
  const avgDaily = avgBy(dailySpend.filter(ds => ds.amount > 0), ds => ds.amount);

  return {
    type: 'finance',
    period: 'monthly',
    fromDate,
    toDate,
    periodLabel,
    generatedAt: new Date().toISOString(),
    summary: {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
      transactionCount: transactions.length,
      avgDailyExpense: Math.round(avgDaily * 100) / 100,
      categoryBreakdown,
      budgetStatus,
      dailySpend,
      topCategory: categoryBreakdown[0] || null,
    },
  };
}

export function generateHealthReport(month) {
  const s = State.get();
  const now = month ? new Date(month + '-01T12:00:00') : new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const fromDate = monthStr + '-01';
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const toDate = new Date(nextMonth.getTime() - 86400000).toISOString().slice(0, 10);
  const periodLabel = monthName(fromDate);

  const sleepLogs = s.logs.filter(l => l.type === 'health' && l.title.includes('Sleep') && l.date >= fromDate && l.date <= toDate);
  const sleepData = sleepLogs.map(l => {
    const m = l.title.match(/Sleep:\s*([\d.]+)h.*quality\s*(\d+)/i);
    return m ? { date: l.date, hours: parseFloat(m[1]), quality: parseInt(m[2]) } : null;
  }).filter(Boolean);
  const avgSleepHours = avgBy(sleepData, s => s.hours);
  const avgSleepQuality = avgBy(sleepData, s => s.quality);
  const exerciseLogs = s.logs.filter(l => l.type === 'health' && l.title.includes('Exercise') && l.date >= fromDate && l.date <= toDate);
  const exerciseDays = new Set(exerciseLogs.map(l => l.date)).size;
  const totalExerciseMin = exerciseLogs.reduce((sum, l) => {
    const m = l.title.match(/(\d+)min/);
    return sum + (m ? parseInt(m[1]) : 0);
  }, 0);
  const waterDays = new Set(s.logs.filter(l => l.type === 'water' && l.date >= fromDate && l.date <= toDate).map(l => l.date)).size;
  const totalDays = new Date(nextMonth.getTime() - 86400000).getDate();
  const waterRate = Math.round((waterDays / totalDays) * 100);
  const steps = s.steps && s.steps.date >= fromDate ? s.steps.count : 0;
  const vitalsLogs = s.vitals ? s.vitals.filter(v => v.date >= fromDate && v.date <= toDate) : [];
  const symptomLogs = s.symptoms ? s.symptoms.filter(sy => sy.date >= fromDate && sy.date <= toDate) : [];
  const avgSeverity = avgBy(symptomLogs, s => s.severity);
  const meds = s.medications || [];
  const medTakenCount = s.logs.filter(l => l.type === 'medication' && l.date >= fromDate && l.date <= toDate).length;

  return {
    type: 'health',
    period: 'monthly',
    fromDate,
    toDate,
    periodLabel,
    generatedAt: new Date().toISOString(),
    summary: {
      avgSleepHours: Math.round(avgSleepHours * 10) / 10,
      avgSleepQuality: Math.round(avgSleepQuality * 10) / 10,
      sleepDays: sleepData.length,
      exerciseDays,
      totalExerciseMinutes: totalExerciseMin,
      avgExerciseMinutesPerSession: exerciseDays > 0 ? Math.round(totalExerciseMin / exerciseDays) : 0,
      waterDays,
      waterRate,
      steps,
      vitalsCount: vitalsLogs.length,
      symptomsCount: symptomLogs.length,
      avgSymptomSeverity: Math.round(avgSeverity * 10) / 10,
      medicationsCount: meds.length,
      medsTakenCount: medTakenCount,
    },
  };
}

export function exportReportAsPDF(reportData) {
  const content = renderReportView(reportData);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    const blob = new Blob([renderHTMLReport(reportData)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mytrack-report-${reportData.type}-${reportData.fromDate}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, method: 'download' };
  }
  printWindow.document.write(renderHTMLReport(reportData));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
  return { success: true, method: 'print' };
}

function renderHTMLReport(report) {
  const title = `myTrack Report - ${report.periodLabel}`;
  const sections = report.sections || [];
  let bodyHTML = '';

  if (report.type === 'daily' && sections.length > 0) {
    sections.forEach(sec => {
      bodyHTML += `<div class="report-section"><h2>${sec.title}</h2>`;
      if (sec.type === 'summary') {
        const d = sec.data;
        bodyHTML += `<div class="summary-grid">
          <div class="summary-item"><label>Date</label><span>${d.dateLabel}</span></div>
          ${d.balance !== null ? `<div class="summary-item"><label>Balance</label><span>${d.balance}/100</span></div>` : ''}
          <div class="summary-item"><label>Habits</label><span>${d.habitsDone}/${d.habitsTotal} (${d.completionRate}%)</span></div>
          ${d.steps > 0 ? `<div class="summary-item"><label>Steps</label><span>${d.steps}</span></div>` : ''}
          ${d.totalFocusMin > 0 ? `<div class="summary-item"><label>Focus</label><span>${d.totalFocusMin}min</span></div>` : ''}
          ${d.tasksDone > 0 ? `<div class="summary-item"><label>Tasks Done</label><span>${d.tasksDone}</span></div>` : ''}
        </div>`;
      } else if (sec.type === 'habits') {
        bodyHTML += `<ul>${sec.data.map(h => `<li>${h.emoji} ${h.name}: ${h.done ? '✅' : '❌'} (streak: ${h.streak})</li>`).join('')}</ul>`;
      } else if (sec.type === 'water') {
        bodyHTML += `<p>💧 ${sec.data.count}/${sec.data.goal} glasses</p>`;
      } else if (sec.type === 'sleep') {
        bodyHTML += `<p>🌙 ${sec.data.hours}h (quality: ${sec.data.quality}/10)</p>`;
      } else if (sec.type === 'journal') {
        bodyHTML += `<div class="journal-entries">${sec.data.map(j => `<div class="journal-entry"><p>${escapeHtml(j.text)}</p></div>`).join('')}</div>`;
      } else if (sec.type === 'finance') {
        bodyHTML += `<p>💰 Spent: $${sec.data.totalSpent.toFixed(2)} | Earned: $${sec.data.totalEarned.toFixed(2)}</p>`;
      } else if (sec.type === 'focus') {
        bodyHTML += `<p>⏱️ Total focus: ${sec.data.reduce((s, f) => s + f.duration, 0)}min</p>`;
      } else if (sec.type === 'exercise') {
        bodyHTML += `<ul>${sec.data.map(e => {
          const m = e.title.match(/Exercise:\s*(\w+)\s*(\d+)min/);
          return `<li>🏃 ${m ? m[1] : 'Exercise'}: ${m ? m[2] + 'min' : ''}</li>`;
        }).join('')}</ul>`;
      }
      bodyHTML += `</div>`;
    });
  } else if (report.summary) {
    const s = report.summary;
    bodyHTML += `<div class="report-section"><h2>Summary</h2><div class="summary-grid">`;
    Object.entries(s).forEach(([key, val]) => {
      if (typeof val !== 'object' && val !== null && val !== undefined && val !== 0) {
        bodyHTML += `<div class="summary-item"><label>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label><span>${typeof val === 'number' ? val.toLocaleString() : val}</span></div>`;
      }
    });
    bodyHTML += `</div></div>`;
  }

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
      .report-section { background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
      .report-section h2 { font-size: 16px; margin: 0 0 12px; }
      .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .summary-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ddd; font-size: 13px; }
      .summary-item label { color: #666; }
      ul { margin: 0; padding-left: 16px; font-size: 13px; }
      li { margin-bottom: 4px; }
      .journal-entry { background: #fff; border-radius: 4px; padding: 8px; margin-bottom: 6px; font-size: 13px; }
      @media print { body { padding: 0; } .report-section { break-inside: avoid; } }
    </style>
  </head><body>
    <h1>${title}</h1>
    <div class="subtitle">Generated ${new Date(report.generatedAt).toLocaleString()} · myTrack Report</div>
    ${bodyHTML}
  </body></html>`;
}

export function exportReportAsCSV(reportData) {
  const rows = [];
  if (reportData.type === 'daily') {
    (reportData.sections || []).forEach(sec => {
      if (sec.type === 'summary') {
        const d = sec.data;
        rows.push({ Date: d.date, Type: 'Summary', Metric: 'Balance', Value: d.balance ?? '' });
        rows.push({ Date: d.date, Type: 'Summary', Metric: 'Habits Done', Value: `${d.habitsDone}/${d.habitsTotal}` });
        rows.push({ Date: d.date, Type: 'Summary', Metric: 'Steps', Value: d.steps });
        rows.push({ Date: d.date, Type: 'Summary', Metric: 'Focus Minutes', Value: d.totalFocusMin });
      } else if (sec.type === 'water') {
        rows.push({ Date: reportData.fromDate, Type: 'Water', Metric: 'Glasses', Value: `${sec.data.count}/${sec.data.goal}` });
      } else if (sec.type === 'sleep') {
        rows.push({ Date: reportData.fromDate, Type: 'Sleep', Metric: 'Hours', Value: sec.data.hours });
        rows.push({ Date: reportData.fromDate, Type: 'Sleep', Metric: 'Quality', Value: sec.data.quality });
      } else if (sec.type === 'mood') {
        rows.push({ Date: reportData.fromDate, Type: 'Mood', Metric: 'Emoji', Value: sec.data.mood });
      } else if (sec.type === 'finance') {
        rows.push({ Date: reportData.fromDate, Type: 'Finance', Metric: 'Spent', Value: sec.data.totalSpent.toFixed(2) });
        rows.push({ Date: reportData.fromDate, Type: 'Finance', Metric: 'Earned', Value: sec.data.totalEarned.toFixed(2) });
      }
    });
  } else if (reportData.summary) {
    Object.entries(reportData.summary).forEach(([key, val]) => {
      if (typeof val === 'number' || typeof val === 'string') {
        rows.push({ Period: reportData.periodLabel, Type: reportData.type, Metric: key, Value: val });
      }
    });
  }
  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];
  rows.forEach(row => {
    csvLines.push(headers.map(h => {
      const v = String(row[h] ?? '').replace(/"/g, '""');
      return v.includes(',') ? `"${v}"` : v;
    }).join(','));
  });
  const csv = csvLines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mytrack-report-${reportData.type}-${reportData.fromDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, format: 'csv', rows: rows.length };
}

export function exportReportAsJSON(reportData) {
  const json = JSON.stringify(reportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mytrack-report-${reportData.type}-${reportData.fromDate}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, format: 'json', size: json.length };
}

export function renderReportView(reportData) {
  const container = document.createElement('div');
  container.className = 'report-view';
  container.innerHTML = `
    <div class="report-header">
      <h2 class="report-title">${escapeHtml(reportData.periodLabel)}</h2>
      <span class="report-type">${reportData.type.charAt(0).toUpperCase() + reportData.type.slice(1)} Report</span>
      <span class="report-date">Generated ${new Date(reportData.generatedAt).toLocaleDateString()}</span>
    </div>
    <div class="report-body"></div>
  `;
  const body = container.querySelector('.report-body');
  if (reportData.type === 'daily' && reportData.sections) {
    reportData.sections.forEach(sec => {
      const secEl = document.createElement('div');
      secEl.className = `report-section report-section-${sec.type}`;
      secEl.innerHTML = `<h3 class="report-section-title">${sec.title}</h3>`;
      if (sec.type === 'summary') {
        const grid = document.createElement('div');
        grid.className = 'report-summary-grid';
        const d = sec.data;
        const items = [
          { label: 'Balance', value: d.balance !== null ? `${d.balance}/100` : '—' },
          { label: 'Habits', value: `${d.habitsDone}/${d.habitsTotal} (${d.completionRate}%)` },
          { label: 'Steps', value: d.steps || '—' },
          { label: 'Focus', value: d.totalFocusMin ? `${d.totalFocusMin}min` : '—' },
          { label: 'Tasks Done', value: d.tasksDone || '—' },
        ];
        items.forEach(item => {
          grid.innerHTML += `<div class="rs-item"><span class="rs-label">${item.label}</span><span class="rs-value">${item.value}</span></div>`;
        });
        secEl.appendChild(grid);
      } else if (sec.type === 'habits') {
        const list = document.createElement('div');
        list.className = 'report-habit-list';
        sec.data.forEach(h => {
          list.innerHTML += `<div class="report-habit ${h.done ? 'done' : ''}">${h.emoji} ${h.name} ${h.done ? '✅' : '❌'}</div>`;
        });
        secEl.appendChild(list);
      } else if (sec.type === 'water') {
        secEl.innerHTML += `<div class="report-metric">💧 ${sec.data.count}/${sec.data.goal} glasses</div>`;
      } else if (sec.type === 'sleep') {
        secEl.innerHTML += `<div class="report-metric">🌙 ${sec.data.hours}h · Quality ${sec.data.quality}/10</div>`;
      } else if (sec.type === 'exercise') {
        const list = document.createElement('div');
        sec.data.forEach(e => {
          const m = e.title.match(/Exercise:\s*(\w+)\s*(\d+)min/);
          list.innerHTML += `<div class="report-metric">🏃 ${m ? `${m[1]} ${m[2]}min` : e.title}</div>`;
        });
        secEl.appendChild(list);
      } else if (sec.type === 'journal') {
        sec.data.forEach(j => {
          secEl.innerHTML += `<div class="report-journal-entry">${escapeHtml(j.text)}</div>`;
        });
      } else if (sec.type === 'finance') {
        secEl.innerHTML += `<div class="report-metric">💰 Spent: $${sec.data.totalSpent.toFixed(2)}</div>`;
        secEl.innerHTML += `<div class="report-metric">📈 Earned: $${sec.data.totalEarned.toFixed(2)}</div>`;
      } else if (sec.type === 'focus') {
        const total = sec.data.reduce((s, f) => s + f.duration, 0);
        secEl.innerHTML += `<div class="report-metric">⏱️ ${total} minutes of focused work</div>`;
      }
      body.appendChild(secEl);
    });
  } else if (reportData.summary) {
    const s = reportData.summary;
    const grid = document.createElement('div');
    grid.className = 'report-summary-grid';
    Object.entries(s).forEach(([key, val]) => {
      if (typeof val !== 'object' || val === null) {
        grid.innerHTML += `<div class="rs-item"><span class="rs-label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span><span class="rs-value">${typeof val === 'number' ? val.toLocaleString() : val}</span></div>`;
      }
    });
    body.appendChild(grid);
  }
  return container;
}

export function shareReport(reportData) {
  const text = [
    `📊 myTrack Report: ${reportData.periodLabel}`,
    `Type: ${reportData.type.charAt(0).toUpperCase() + reportData.type.slice(1)}`,
    `Generated: ${new Date(reportData.generatedAt).toLocaleDateString()}`,
    '',
  ];
  if (reportData.summary) {
    Object.entries(reportData.summary).forEach(([key, val]) => {
      if (typeof val !== 'object' && val !== null) {
        text.push(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${val}`);
      }
    });
  }
  const shareText = text.join('\n');
  if (navigator.share) {
    navigator.share({ title: `myTrack Report: ${reportData.periodLabel}`, text: shareText }).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareText).catch(() => {});
  }
  return { success: true, method: navigator.share ? 'share' : 'clipboard' };
}

const Reports = {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  generateYearlyReport,
  generateHabitReport,
  generateFinanceReport,
  generateHealthReport,
  exportReportAsPDF,
  exportReportAsCSV,
  exportReportAsJSON,
  renderReportView,
  shareReport,
  getReportDateRange,
};

export default Reports;
