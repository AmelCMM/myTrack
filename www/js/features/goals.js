import State from '../state.js';
import { uid, today, daysAgo, daysFromNow, dateStr, truncate, escapeHtml, sortBy } from '../helpers.js';
import { HABIT_TEMPLATES } from '../constants.js';

export const GOAL_CATEGORIES = [
  { id: 'habit', label: 'Habit', icon: '🎯' },
  { id: 'water', label: 'Water', icon: '💧' },
  { id: 'sleep', label: 'Sleep', icon: '🌙' },
  { id: 'exercise', label: 'Exercise', icon: '🏃' },
  { id: 'weight', label: 'Weight', icon: '⚖️' },
  { id: 'custom', label: 'Custom', icon: '📌' },
];

export const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  ARCHIVED: 'archived',
};

export function createGoal({ title, description, targetDate, category, targetValue, unit, subgoals, tags, priority, trackedHabitId }) {
  const s = State.get();
  const goal = {
    id: uid(),
    title: title.trim(),
    description: (description || '').trim(),
    targetDate: targetDate || daysFromNow(30),
    category: category && GOAL_CATEGORIES.find(c => c.id === category) ? category : 'custom',
    targetValue: Math.max(1, parseFloat(targetValue) || 1),
    unit: unit || 'times',
    progress: 0,
    created: today(),
    completed: false,
    completedDate: null,
    status: GOAL_STATUS.ACTIVE,
    subgoals: subgoals || [],
    tags: tags || [],
    priority: priority || 'normal',
    trackedHabitId: trackedHabitId || null,
    history: [],
  };
  s.goals.push(goal);
  State.addLog(`Goal created: ${goal.title}`, '🎯', 'goal');
  State.addXP(10);
  State.save();
  State.notify();
  return goal;
}

export function updateGoalProgress(id, newProgress) {
  const s = State.get();
  const g = s.goals.find(g => g.id === id);
  if (!g) return null;
  const clamped = Math.max(0, Math.min(g.targetValue, parseFloat(newProgress) || 0));
  g.history.push({ date: today(), previous: g.progress, new: clamped, timestamp: new Date().toISOString() });
  g.progress = clamped;
  if (g.progress >= g.targetValue && !g.completed) {
    g.completed = true;
    g.completedDate = today();
    g.status = GOAL_STATUS.COMPLETED;
    State.addLog(`Goal completed: ${g.title}`, '🏆', 'goal');
    State.addXP(50);
  } else if (g.progress >= g.targetValue && g.completed) {
  } else if (g.completed && g.progress < g.targetValue) {
    g.completed = false;
    g.completedDate = null;
    g.status = GOAL_STATUS.ACTIVE;
  }
  State.save();
  State.notify();
  return g;
}

export function archiveGoal(id) {
  const s = State.get();
  const g = s.goals.find(g => g.id === id);
  if (!g) return null;
  g.status = GOAL_STATUS.ARCHIVED;
  State.save();
  State.notify();
  return g;
}

export function unarchiveGoal(id) {
  const s = State.get();
  const g = s.goals.find(g => g.id === id);
  if (!g) return null;
  g.status = g.completed ? GOAL_STATUS.COMPLETED : GOAL_STATUS.ACTIVE;
  State.save();
  State.notify();
  return g;
}

export function deleteGoal(id) {
  const s = State.get();
  s.goals = s.goals.filter(g => g.id !== id);
  State.addLog('Goal deleted', '🗑️', 'goal');
  State.save();
  State.notify();
}

export function getGoal(id) {
  const s = State.get();
  return s.goals.find(g => g.id === id) || null;
}

export function getGoalsByCategory(category) {
  const s = State.get();
  if (!category || category === 'all') return [...s.goals];
  return s.goals.filter(g => g.category === category);
}

export function getActiveGoals() {
  const s = State.get();
  const now = today();
  return s.goals.filter(g => {
    if (g.completed || g.status === GOAL_STATUS.COMPLETED || g.status === GOAL_STATUS.ARCHIVED) return false;
    if (g.targetDate && g.targetDate < now) return false;
    return true;
  });
}

export function getOverdueGoals() {
  const s = State.get();
  const now = today();
  return s.goals.filter(g => {
    if (g.completed || g.status === GOAL_STATUS.COMPLETED || g.status === GOAL_STATUS.ARCHIVED) return false;
    if (!g.targetDate) return false;
    return g.targetDate < now;
  });
}

export function getCompletedGoals() {
  const s = State.get();
  return s.goals.filter(g => g.completed || g.status === GOAL_STATUS.COMPLETED)
    .sort((a, b) => {
      const da = a.completedDate || a.created;
      const db = b.completedDate || b.created;
      return db.localeCompare(da);
    });
}

export function getGoalsProgress() {
  const s = State.get();
  const total = s.goals.length;
  const completed = s.goals.filter(g => g.completed).length;
  const active = getActiveGoals().length;
  const overdue = getOverdueGoals().length;
  const archived = s.goals.filter(g => g.status === GOAL_STATUS.ARCHIVED).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalProgress = s.goals.reduce((sum, g) => {
    return sum + (g.targetValue > 0 ? g.progress / g.targetValue : 0);
  }, 0);
  const avgProgress = total > 0 ? Math.round((totalProgress / total) * 100) : 0;
  return { total, completed, active, overdue, archived, pct, avgProgress };
}

export function getGoalsByPriority(priority) {
  const s = State.get();
  return s.goals.filter(g => g.priority === priority);
}

export function getGoalsByTag(tag) {
  const s = State.get();
  return s.goals.filter(g => g.tags.includes(tag));
}

export function updateGoal(id, changes) {
  const s = State.get();
  const g = s.goals.find(g => g.id === id);
  if (!g) return null;
  const allowed = ['title', 'description', 'targetDate', 'targetValue', 'unit', 'priority', 'tags', 'subgoals', 'trackedHabitId'];
  for (const key of Object.keys(changes)) {
    if (allowed.includes(key)) {
      if (key === 'title') g[key] = changes[key].trim();
      else g[key] = changes[key];
    }
  }
  State.addLog(`Goal updated: ${g.title}`, '✏️', 'goal');
  State.save();
  State.notify();
  return g;
}

export function addSubgoal(goalId, title) {
  const s = State.get();
  const g = s.goals.find(g => g.id === goalId);
  if (!g) return null;
  const sg = { id: uid(), title: title.trim(), done: false };
  g.subgoals.push(sg);
  State.save();
  State.notify();
  return sg;
}

export function toggleSubgoal(goalId, subgoalId) {
  const s = State.get();
  const g = s.goals.find(g => g.id === goalId);
  if (!g) return null;
  const sg = g.subgoals.find(s => s.id === subgoalId);
  if (!sg) return null;
  sg.done = !sg.done;
  const allDone = g.subgoals.length > 0 && g.subgoals.every(s => s.done);
  if (allDone && g.subgoals.length > 0 && !g.completed) {
    updateGoalProgress(goalId, g.targetValue);
  }
  State.save();
  State.notify();
  return sg;
}

export function removeSubgoal(goalId, subgoalId) {
  const s = State.get();
  const g = s.goals.find(g => g.id === goalId);
  if (!g) return null;
  g.subgoals = g.subgoals.filter(s => s.id !== subgoalId);
  State.save();
  State.notify();
}

export function generateGoalSuggestions() {
  const s = State.get();
  const suggestions = [];
  if (s.habits.length > 0) {
    const weak = s.habits.filter(h => h.streak < 3);
    if (weak.length > 0) {
      weak.forEach(h => {
        suggestions.push({
          title: `Build ${h.name} consistency`,
          description: `Complete ${h.name} for 7 days straight to build a habit`,
          category: 'habit',
          targetValue: 7,
          unit: 'days',
          targetDate: daysFromNow(14),
          reason: `You've completed ${h.name} ${h.streak} days in a row`,
          trackedHabitId: h.id,
        });
      });
    }
  }
  const habits = s.habits.filter(h => h.done);
  if (habits.length >= 5) {
    suggestions.push({
      title: 'Complete 100 habits',
      description: 'Reach the Centurion milestone by completing 100 habit checks',
      category: 'habit',
      targetValue: 100,
      unit: 'habits',
      targetDate: daysFromNow(90),
      reason: `You've completed ${habits.length} so far!`,
    });
  }
  const waterTrend = s.water;
  if (waterTrend.count < waterTrend.goal) {
    suggestions.push({
      title: 'Hit water goal consistently',
      description: `Drink ${waterTrend.goal} glasses daily for 7 days`,
      category: 'water',
      targetValue: 7,
      unit: 'days',
      targetDate: daysFromNow(14),
      reason: 'Staying hydrated improves energy and focus',
    });
  }
  const sleepAvg = s.sleep.hours || 0;
  if (sleepAvg < 7 && sleepAvg > 0) {
    suggestions.push({
      title: 'Improve sleep duration',
      description: 'Get at least 7 hours of sleep for 5 nights this week',
      category: 'sleep',
      targetValue: 5,
      unit: 'nights',
      targetDate: daysFromNow(7),
      reason: `You're averaging ${sleepAvg}h — optimal is 7-9h`,
    });
  }
  const exerciseCount = s.exercise ? s.exercise.filter(e => {
    const d = new Date(e.date);
    const w = new Date();
    return d >= new Date(w.getTime() - 7 * 86400000);
  }).length : 0;
  if (exerciseCount < 3) {
    suggestions.push({
      title: 'Exercise more regularly',
      description: 'Complete 3 workout sessions per week',
      category: 'exercise',
      targetValue: 12,
      unit: 'sessions',
      targetDate: daysFromNow(28),
      reason: `You did ${exerciseCount} sessions this week`,
    });
  }
  const journalCount = s.journal.length;
  if (journalCount < 5) {
    suggestions.push({
      title: 'Journal 10 entries',
      description: 'Write 10 journal entries to build a reflection habit',
      category: 'custom',
      targetValue: 10,
      unit: 'entries',
      targetDate: daysFromNow(30),
      reason: 'Journaling helps track your mental wellbeing',
    });
  }
  if (s.focusHistory) {
    const totalFocus = s.focusHistory.reduce((sum, f) => sum + f.duration, 0);
    if (totalFocus < 300) {
      suggestions.push({
        title: 'Focus for 10 hours',
        description: 'Accumulate 10 hours of focused work sessions',
        category: 'custom',
        targetValue: 600,
        unit: 'minutes',
        targetDate: daysFromNow(60),
        reason: `You've focused ${totalFocus}min total`,
      });
    }
  }
  if (s.transactions && s.transactions.length > 0) {
    const hasBudget = s.budgets && s.budgets.length > 0;
    if (!hasBudget) {
      suggestions.push({
        title: 'Track monthly spending',
        description: 'Log all transactions for a full month to understand spending habits',
        category: 'custom',
        targetValue: 1,
        unit: 'month',
        targetDate: daysFromNow(30),
        reason: 'Understanding your finances is key to financial health',
      });
    }
  }
  const stepCount = s.steps ? s.steps.count : 0;
  if (stepCount > 0 && stepCount < 5000) {
    suggestions.push({
      title: 'Reach 10k daily steps',
      description: 'Walk 10,000 steps every day for a week',
      category: 'exercise',
      targetValue: 7,
      unit: 'days',
      targetDate: daysFromNow(14),
      reason: 'Walking boosts cardiovascular health',
    });
  }
  suggestions.push({
    title: 'Read 12 books this year',
    description: 'One book per month to expand your knowledge',
    category: 'custom',
    targetValue: 12,
    unit: 'books',
    targetDate: daysFromNow(365),
    reason: 'Reading regularly improves cognitive function',
  });
  const existingTitles = new Set(s.goals.map(g => g.title.toLowerCase()));
  return suggestions.filter(s => !existingTitles.has(s.title.toLowerCase()));
}

export function updateGoalFromTrackedHabit(habitId) {
  const s = State.get();
  s.goals.forEach(g => {
    if (g.trackedHabitId === habitId && !g.completed) {
      const habit = s.habits.find(h => h.id === habitId);
      if (habit) {
        updateGoalProgress(g.id, g.progress + 1);
      }
    }
  });
}

export function getTimeline(goalId) {
  const s = State.get();
  const g = s.goals.find(g => g.id === goalId);
  if (!g) return [];
  return [...g.history].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function duplicateGoal(id) {
  const s = State.get();
  const g = s.goals.find(g => g.id === id);
  if (!g) return null;
  return createGoal({
    title: `${g.title} (copy)`,
    description: g.description,
    targetDate: g.targetDate,
    category: g.category,
    targetValue: g.targetValue,
    unit: g.unit,
    tags: [...g.tags],
    priority: g.priority,
    trackedHabitId: null,
  });
}

export function batchUpdateProgress(updates) {
  const results = [];
  for (const { id, progress } of updates) {
    results.push(updateGoalProgress(id, progress));
  }
  return results;
}

export function getGoalsByDateRange(from, to) {
  const s = State.get();
  return s.goals.filter(g => {
    const created = g.created;
    return created >= from && created <= to;
  });
}

export function searchGoals(query) {
  const s = State.get();
  const q = query.toLowerCase();
  return s.goals.filter(g => {
    return g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.tags.some(t => t.toLowerCase().includes(q));
  });
}

export function getGoalStatsByCategory() {
  const s = State.get();
  const stats = {};
  GOAL_CATEGORIES.forEach(c => {
    const goals = s.goals.filter(g => g.category === c.id);
    stats[c.id] = {
      total: goals.length,
      completed: goals.filter(g => g.completed).length,
      active: goals.filter(g => !g.completed && g.status === GOAL_STATUS.ACTIVE).length,
      label: c.label,
      icon: c.icon,
    };
  });
  return stats;
}

export function renderGoalCard(goal) {
  const card = document.createElement('div');
  card.className = 'goal-card';
  card.dataset.id = goal.id;
  const pct = goal.targetValue > 0 ? Math.min(100, Math.round((goal.progress / goal.targetValue) * 100)) : 0;
  const cat = GOAL_CATEGORIES.find(c => c.id === goal.category) || GOAL_CATEGORIES[5];
  const remaining = goal.targetValue - goal.progress;
  const daysLeft = goal.targetDate ? Math.ceil((new Date(goal.targetDate) - new Date()) / 86400000) : null;
  const statusClass = goal.completed ? 'completed' : (daysLeft !== null && daysLeft < 0 ? 'overdue' : 'active');
  const bars = [];
  for (let i = 0; i < 5; i++) {
    const filled = i < Math.round(pct / 20);
    bars.push(`<span class="bar-seg ${filled ? 'fill' : ''}"></span>`);
  }
  card.innerHTML = `
    <div class="goal-header">
      <span class="goal-icon">${cat.icon}</span>
      <span class="goal-cat">${cat.label}</span>
      <span class="goal-status ${statusClass}">${statusClass}</span>
    </div>
    <div class="goal-body">
      <h3 class="goal-title">${escapeHtml(truncate(goal.title, 40))}</h3>
      ${goal.description ? `<p class="goal-desc">${escapeHtml(truncate(goal.description, 80))}</p>` : ''}
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="goal-stats">
        <span class="goal-stat">${goal.progress} / ${goal.targetValue} ${goal.unit}</span>
        <span class="goal-stat">${pct}%</span>
      </div>
      ${daysLeft !== null ? `<div class="goal-days ${daysLeft < 0 ? 'overdue' : ''}">
        ${daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
      </div>` : ''}
      ${goal.subgoals && goal.subgoals.length > 0 ? `<div class="goal-subgoals">
        ${goal.subgoals.map(sg => `<label class="subgoal-item ${sg.done ? 'done' : ''}">
          <input type="checkbox" ${sg.done ? 'checked' : ''} data-subgoal-id="${sg.id}">
          <span>${escapeHtml(truncate(sg.title, 30))}</span>
        </label>`).join('')}
      </div>` : ''}
    </div>
    <div class="goal-actions">
      <button class="goal-btn update-progress" data-id="${goal.id}">+ Add</button>
      <button class="goal-btn goal-edit" data-id="${goal.id}">Edit</button>
      <button class="goal-btn goal-delete danger" data-id="${goal.id}">Delete</button>
    </div>
  `;
  card.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      toggleSubgoal(goal.id, cb.dataset.subgoalId);
    });
  });
  return card;
}

export function renderGoalListView(goals) {
  const container = document.createElement('div');
  container.className = 'goal-list';
  if (!goals.length) {
    container.innerHTML = '<div class="empty-state">No goals found. Create one to get started!</div>';
    return container;
  }
  goals.forEach(g => container.appendChild(renderGoalCard(g)));
  return container;
}

const Goals = {
  createGoal,
  updateGoalProgress,
  archiveGoal,
  unarchiveGoal,
  deleteGoal,
  getGoal,
  getGoalsByCategory,
  getActiveGoals,
  getOverdueGoals,
  getCompletedGoals,
  getGoalsProgress,
  getGoalsByPriority,
  getGoalsByTag,
  updateGoal,
  addSubgoal,
  toggleSubgoal,
  removeSubgoal,
  generateGoalSuggestions,
  updateGoalFromTrackedHabit,
  getTimeline,
  duplicateGoal,
  batchUpdateProgress,
  getGoalsByDateRange,
  searchGoals,
  getGoalStatsByCategory,
  renderGoalCard,
  renderGoalListView,
  GOAL_CATEGORIES,
  GOAL_STATUS,
};

export default Goals;
