import State from '../state.js';
import { uid, today, daysAgo, daysBetween, monthStart, dateStr, monthName, escapeHtml, avgBy, sumBy, sortBy, groupBy, formatCurrency } from '../helpers.js';
import { FINANCE_CATEGORIES } from '../constants.js';

export function createBudget({ category, limit, period, startDate, description }) {
  const s = State.get();
  if (!FINANCE_CATEGORIES.includes(category)) return null;
  const budget = {
    id: uid(),
    category,
    limit: Math.max(0, parseFloat(limit) || 0),
    period: period || 'monthly',
    startDate: startDate || monthStart(today()),
    description: description || '',
    created: today(),
    spent: 0,
    rollover: false,
    notifications: true,
  };
  if (!s.budgets) s.budgets = [];
  s.budgets.push(budget);
  State.save();
  State.notify();
  State.addLog(`Budget created: ${category} (${formatCurrency(budget.limit)})`, '📊', 'finance');
  return budget;
}

export function updateBudget(id, changes) {
  const s = State.get();
  const budget = (s.budgets || []).find(b => b.id === id);
  if (!budget) return null;
  const allowed = ['limit', 'period', 'description', 'rollover', 'notifications'];
  Object.keys(changes).forEach(key => {
    if (allowed.includes(key)) budget[key] = changes[key];
  });
  if (changes.category && FINANCE_CATEGORIES.includes(changes.category)) {
    budget.category = changes.category;
  }
  State.save();
  State.notify();
  return budget;
}

export function deleteBudget(id) {
  const s = State.get();
  if (!s.budgets) return false;
  s.budgets = s.budgets.filter(b => b.id !== id);
  State.save();
  State.notify();
  return true;
}

export function getBudgetStatus(period) {
  const s = State.get();
  if (!s.budgets || !s.budgets.length) return [];
  const p = period || today().slice(0, 7);
  const expenses = (s.transactions || []).filter(t =>
    t.type === 'expense' && t.date.slice(0, 7) === p
  );
  return s.budgets.map(b => {
    const spent = expenses.filter(t => t.category === b.category).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const remaining = b.limit - spent;
    const pct = b.limit > 0 ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0;
    return {
      ...b,
      spent,
      remaining: Math.max(0, remaining),
      overspent: remaining < 0,
      pct,
      status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : pct >= 50 ? 'moderate' : 'good',
    };
  });
}

export function getAllBudgetStatuses() {
  const s = State.get();
  if (!s.budgets || !s.budgets.length) return [];
  const periods = [...new Set((s.transactions || []).filter(t => t.type === 'expense').map(t => t.date.slice(0, 7)))].sort();
  return periods.map(p => ({ period: p, budgets: getBudgetStatus(p) }));
}

export function getCategoryBreakdown(period) {
  const s = State.get();
  const p = period || today().slice(0, 7);
  const expenses = (s.transactions || []).filter(t => t.type === 'expense' && t.date.slice(0, 7) === p);
  const total = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const byCategory = groupBy(expenses, 'category');
  const breakdown = FINANCE_CATEGORIES.map(cat => {
    const items = byCategory[cat] || [];
    const amount = items.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      category: cat,
      amount,
      count: items.length,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      avgAmount: items.length > 0 ? amount / items.length : 0,
    };
  }).filter(b => b.count > 0).sort((a, b) => b.amount - a.amount);
  return { period: p, total, breakdown, topCategory: breakdown[0] || null };
}

export function getMonthlyTrend(months = 12) {
  const s = State.get();
  if (!s.transactions || !s.transactions.length) return [];
  const now = new Date();
  const trends = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthEnd = new Date(nextMonth.getTime() - 86400000).toISOString().slice(0, 10);
    const txs = s.transactions.filter(t => t.date >= monthStr + '-01' && t.date <= monthEnd);
    const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    trends.push({
      month: monthStr,
      label: monthName(monthStr + '-01'),
      income,
      expense,
      net: income - expense,
      count: txs.length,
    });
  }
  return trends;
}

export function createRecurring({ category, amount, type, frequency, startDate, endDate, description }) {
  const s = State.get();
  if (!FINANCE_CATEGORIES.includes(category)) return null;
  const recurring = {
    id: uid(),
    category,
    amount: Math.abs(parseFloat(amount) || 0),
    type: type || 'expense',
    frequency: frequency || 'monthly',
    startDate: startDate || today(),
    endDate: endDate || null,
    description: description || '',
    active: true,
    lastProcessed: null,
    nextDate: startDate || today(),
    created: today(),
  };
  if (!s.recurringTransactions) s.recurringTransactions = [];
  s.recurringTransactions.push(recurring);
  State.save();
  State.notify();
  State.addLog(`Recurring ${type}: ${category} ${formatCurrency(recurring.amount)} (${frequency})`, '🔄', 'finance');
  return recurring;
}

export function getRecurringTransactions(activeOnly) {
  const s = State.get();
  if (!s.recurringTransactions) return [];
  let items = [...s.recurringTransactions];
  if (activeOnly) items = items.filter(r => r.active);
  return items.sort((a, b) => (b.nextDate || '').localeCompare(a.nextDate || ''));
}

export function toggleRecurring(id) {
  const s = State.get();
  const r = (s.recurringTransactions || []).find(r => r.id === id);
  if (!r) return null;
  r.active = !r.active;
  State.save();
  State.notify();
  return r;
}

export function deleteRecurring(id) {
  const s = State.get();
  if (!s.recurringTransactions) return false;
  s.recurringTransactions = s.recurringTransactions.filter(r => r.id !== id);
  State.save();
  State.notify();
  return true;
}

export function processRecurringTransactions() {
  const s = State.get();
  if (!s.recurringTransactions) return [];
  const processed = [];
  const todayStr = today();
  (s.recurringTransactions || []).filter(r => r.active).forEach(r => {
    if (!r.nextDate || r.nextDate > todayStr) return;
    if (r.endDate && r.endDate < todayStr) { r.active = false; return; }
    const tx = {
      accountId: s.accounts?.[0]?.id || null,
      amount: r.amount,
      category: r.category,
      note: `${r.description} (auto: ${r.frequency})`,
      type: r.type,
    };
    State.createTransaction(tx);
    r.lastProcessed = todayStr;
    const freqMap = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 91, yearly: 365 };
    const days = freqMap[r.frequency] || 30;
    const next = new Date();
    next.setDate(next.getDate() + days);
    r.nextDate = next.toISOString().slice(0, 10);
    processed.push(r);
  });
  if (processed.length > 0) {
    State.save();
    State.notify();
  }
  return processed;
}

export function createSavingsGoal({ title, targetAmount, currentAmount, targetDate, category, notes }) {
  const s = State.get();
  const goal = {
    id: uid(),
    title: title.trim(),
    targetAmount: Math.max(0, parseFloat(targetAmount) || 0),
    currentAmount: Math.max(0, parseFloat(currentAmount) || 0),
    targetDate: targetDate || '',
    category: category || 'general',
    notes: notes || '',
    created: today(),
    completed: false,
    completedDate: null,
    contributions: [],
  };
  if (!s.savingsGoals) s.savingsGoals = [];
  s.savingsGoals.push(goal);
  State.save();
  State.notify();
  State.addLog(`Savings goal: ${goal.title} (${formatCurrency(goal.targetAmount)})`, '💰', 'finance');
  return goal;
}

export function updateSavingsProgress(id, amount, note) {
  const s = State.get();
  if (!s.savingsGoals) return null;
  const goal = s.savingsGoals.find(g => g.id === id);
  if (!goal) return null;
  const contribution = {
    id: uid(),
    amount: parseFloat(amount) || 0,
    date: today(),
    note: note || '',
    timestamp: new Date().toISOString(),
  };
  goal.contributions.push(contribution);
  goal.currentAmount += contribution.amount;
  if (goal.currentAmount >= goal.targetAmount && !goal.completed) {
    goal.completed = true;
    goal.completedDate = today();
    State.addLog(`Savings goal complete: ${goal.title}`, '🎯', 'finance');
    State.addXP(30);
  }
  State.save();
  State.notify();
  State.addLog(`Savings contribution: ${formatCurrency(contribution.amount)} to "${goal.title}"`, '💰', 'finance');
  return goal;
}

export function deleteSavingsGoal(id) {
  const s = State.get();
  if (!s.savingsGoals) return false;
  s.savingsGoals = s.savingsGoals.filter(g => g.id !== id);
  State.save();
  State.notify();
  return true;
}

export function getSavingsGoals() {
  const s = State.get();
  return (s.savingsGoals || []).map(g => {
    const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
    return { ...g, progress: pct, remaining: Math.max(0, g.targetAmount - g.currentAmount) };
  });
}

export function calculateNetWorth() {
  const s = State.get();
  const accounts = s.accounts || [];
  const totalAssets = accounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  const totalLiabilities = accounts.reduce((sum, a) => sum + Math.min(0, a.balance), 0);
  const investments = s.transactions ? s.transactions.filter(t => t.category === 'Investment' && t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0) : 0;
  const debts = s.transactions ? s.transactions.filter(t => t.category === 'Loan' || t.category === 'Debt').reduce((sum, t) => sum + Math.abs(t.amount), 0) : 0;
  return {
    totalAssets,
    totalLiabilities: Math.abs(totalLiabilities),
    netWorth: totalAssets + totalLiabilities + investments - debts,
    investments,
    debts,
    accounts: accounts.map(a => ({ name: a.name, balance: a.balance, currency: a.currency })),
  };
}

export function generateFinanceMonthSummary(currentMonth) {
  const month = currentMonth || today().slice(0, 7);
  const label = monthName(month + '-01');
  const trend = getMonthlyTrend(1);
  const monthData = trend[0] || { income: 0, expense: 0, net: 0, count: 0 };
  const categoryBreakdown = getCategoryBreakdown(month);
  const budgets = getBudgetStatus(month);
  const recurring = getRecurringTransactions(true);
  const savingsGoals = getSavingsGoals();
  const netWorth = calculateNetWorth();
  const overspentBudgets = budgets.filter(b => b.status === 'exceeded');
  const topExpenseCategory = categoryBreakdown.breakdown[0];
  const savingsRate = monthData.income > 0 ? Math.round((monthData.net / monthData.income) * 100) : 0;
  const dailyAvg = monthData.expense > 0 ? monthData.expense / 30 : 0;

  let summary = `Finance Summary for ${label}:\n`;
  summary += `Income: ${formatCurrency(monthData.income)}\n`;
  summary += `Expenses: ${formatCurrency(monthData.expense)}\n`;
  summary += `Net: ${formatCurrency(monthData.net)}\n`;
  summary += `Savings rate: ${savingsRate}%\n`;
  if (topExpenseCategory) summary += `Top category: ${topExpenseCategory.category} (${formatCurrency(topExpenseCategory.amount)})\n`;
  if (overspentBudgets.length > 0) summary += `⚠️ ${overspentBudgets.length} budget(s) exceeded\n`;
  summary += `Net worth: ${formatCurrency(netWorth.netWorth)}\n`;
  summary += `Transactions: ${monthData.count}\n`;

  return {
    month,
    label,
    income: monthData.income,
    expense: monthData.expense,
    net: monthData.net,
    savingsRate,
    dailyAvg: Math.round(dailyAvg * 100) / 100,
    categoryBreakdown: categoryBreakdown.breakdown,
    budgets,
    overspentBudgets,
    recurring,
    savingsGoals,
    netWorth,
    transactionCount: monthData.count,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

export function forecastNextMonth() {
  const trend = getMonthlyTrend(6);
  if (trend.length < 2) return { income: 0, expense: 0, net: 0, confidence: 'low' };
  const recentIncome = trend.slice(-3).map(t => t.income);
  const recentExpense = trend.slice(-3).map(t => t.expense);
  const avgIncome = avgBy(recentIncome, i => i);
  const avgExpense = avgBy(recentExpense, e => e);
  let incomeTrend = 0;
  let expenseTrend = 0;
  if (recentIncome.length >= 2) {
    incomeTrend = (recentIncome[recentIncome.length - 1] - recentIncome[0]) / recentIncome.length;
    expenseTrend = (recentExpense[recentExpense.length - 1] - recentExpense[0]) / recentExpense.length;
  }
  const projectedIncome = Math.max(0, avgIncome + incomeTrend);
  const projectedExpense = Math.max(0, avgExpense + expenseTrend);
  const s = State.get();
  const recurring = (s.recurringTransactions || []).filter(r => r.active);
  const recurringTotal = recurring.reduce((sum, r) => sum + r.amount, 0);
  return {
    income: Math.round(projectedIncome * 100) / 100,
    expense: Math.round((projectedExpense + recurringTotal) * 100) / 100,
    net: Math.round((projectedIncome - projectedExpense - recurringTotal) * 100) / 100,
    confidence: trend.length >= 6 ? 'high' : trend.length >= 3 ? 'medium' : 'low',
    recurringTotal,
    activeRecurring: recurring.length,
    basedOnMonths: trend.length,
  };
}

export function comparePeriods(period1, period2) {
  const p1Data = getCategoryBreakdown(period1);
  const p2Data = getCategoryBreakdown(period2);
  if (!p1Data || !p2Data) return null;
  const allCategories = [...new Set([...p1Data.breakdown.map(b => b.category), ...p2Data.breakdown.map(b => b.category)])];
  const comparison = allCategories.map(cat => {
    const b1 = p1Data.breakdown.find(b => b.category === cat);
    const b2 = p2Data.breakdown.find(b => b.category === cat);
    const a1 = b1?.amount || 0;
    const a2 = b2?.amount || 0;
    const diff = a2 - a1;
    const pctChange = a1 > 0 ? Math.round((diff / a1) * 100) : (a2 > 0 ? 100 : 0);
    return { category: cat, period1: a1, period2: a2, diff, pctChange, trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return {
    period1: p1Data.period,
    period2: p2Data.period,
    total1: p1Data.total,
    total2: p2Data.total,
    totalDiff: p2Data.total - p1Data.total,
    totalPctChange: p1Data.total > 0 ? Math.round(((p2Data.total - p1Data.total) / p1Data.total) * 100) : 0,
    comparison,
    topIncrease: comparison.find(c => c.trend === 'up'),
    topDecrease: comparison.find(c => c.trend === 'down'),
  };
}

export function getExpenseFrequency(period) {
  const s = State.get();
  const p = period || today().slice(0, 7);
  const expenses = (s.transactions || []).filter(t => t.type === 'expense' && t.date.slice(0, 7) === p);
  const byDay = groupBy(expenses, 'date');
  const daily = Object.entries(byDay).map(([date, txs]) => ({
    date,
    amount: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    count: txs.length,
  })).sort((a, b) => a.date.localeCompare(b.date));
  return { period: p, total: expenses.length, daily, avgPerDay: daily.length > 0 ? Math.round(avgBy(daily, d => d.amount) * 100) / 100 : 0 };
}

export function getIncomeExpenseRatio(period) {
  const s = State.get();
  const p = period || today().slice(0, 7);
  const txs = (s.transactions || []).filter(t => t.date.slice(0, 7) === p);
  const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return { period: p, income, expense, ratio: expense > 0 ? Math.round((income / expense) * 100) / 100 : 0, healthy: income >= expense };
}

const FinanceExt = {
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetStatus,
  getAllBudgetStatuses,
  getCategoryBreakdown,
  getMonthlyTrend,
  createRecurring,
  getRecurringTransactions,
  toggleRecurring,
  deleteRecurring,
  processRecurringTransactions,
  createSavingsGoal,
  updateSavingsProgress,
  deleteSavingsGoal,
  getSavingsGoals,
  calculateNetWorth,
  generateFinanceMonthSummary,
  forecastNextMonth,
  comparePeriods,
  getExpenseFrequency,
  getIncomeExpenseRatio,
};

export default FinanceExt;
