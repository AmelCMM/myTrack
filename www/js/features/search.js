import State from '../state.js';
import { today, daysAgo, escapeHtml, truncate } from '../helpers.js';

const SEARCH_DOMAINS = [
  'habits', 'journal', 'logs', 'vitals', 'symptoms', 'medications',
  'transactions', 'courses', 'tasks', 'projects', 'exercise', 'meals',
];

function getSearchableText(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const fields = ['title', 'name', 'description', 'text', 'note', 'content', 'category', 'label'];
  for (const f of fields) {
    if (item[f]) return String(item[f]);
  }
  return JSON.stringify(item);
}

function scoreItem(item, query) {
  const text = getSearchableText(item).toLowerCase();
  const q = query.toLowerCase();
  if (text === q) return 100;
  if (text.startsWith(q)) return 80;
  if (text.includes(' ' + q)) return 60;
  if (text.includes(q)) return 40;
  if (q.split(' ').some(part => text.includes(part))) return 20;
  return 0;
}

function searchArray(items, query, maxResults = 50) {
  if (!query || !query.trim() || !items || !items.length) return [];
  const q = query.trim().toLowerCase();
  const scored = items.map(item => {
    const score = scoreItem(item, q);
    const text = getSearchableText(item);
    return { item, score, match: highlightMatch(text, q) };
  }).filter(r => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

function highlightMatch(text, query) {
  const q = query.toLowerCase();
  const t = String(text);
  const idx = t.toLowerCase().indexOf(q);
  if (idx === -1) return escapeHtml(t);
  const before = escapeHtml(t.slice(0, idx));
  const match = escapeHtml(t.slice(idx, idx + q.length));
  const after = escapeHtml(t.slice(idx + q.length));
  return `${before}<strong>${match}</strong>${after}`;
}

export function searchAll(query) {
  const s = State.get();
  const results = [];
  const q = query.trim();
  if (!q) return results;

  const searchable = [
    { domain: 'habits', items: s.habits, labelKey: 'name' },
    { domain: 'journal', items: s.journal, labelKey: 'text' },
    { domain: 'logs', items: s.logs, labelKey: 'title' },
    { domain: 'vitals', items: s.vitals, labelKey: 'type' },
    { domain: 'symptoms', items: s.symptoms, labelKey: 'description' },
    { domain: 'medications', items: s.medications, labelKey: 'name' },
    { domain: 'transactions', items: s.transactions, labelKey: 'note' },
    { domain: 'courses', items: s.courses, labelKey: 'name' },
    { domain: 'tasks', items: s.tasks, labelKey: 'title' },
    { domain: 'projects', items: s.projects, labelKey: 'name' },
    { domain: 'exercise', items: s.exercise, labelKey: 'type' },
    { domain: 'meals', items: s.nutrition?.meals || [], labelKey: 'description' },
    { domain: 'goals', items: s.goals, labelKey: 'title' },
    { domain: 'challenges', items: s.challenges, labelKey: 'title' },
    { domain: 'gratitudes', items: s.gratitudes, labelKey: 'text' },
    { domain: 'readingList', items: s.readingList, labelKey: 'title' },
    { domain: 'assignments', items: s.assignments, labelKey: 'title' },
    { domain: 'budgets', items: s.budgets, labelKey: 'category' },
    { domain: 'accounts', items: s.accounts, labelKey: 'name' },
    { domain: 'focusHistory', items: s.focusHistory, labelKey: 'type' },
    { domain: 'tags', items: s.tags, labelKey: 'name' },
    { domain: 'customFields', items: s.customFields, labelKey: 'name' },
  ];

  searchable.forEach(({ domain, items, labelKey }) => {
    if (!items || !items.length) return;
    const matches = searchArray(items, q, 20);
    matches.forEach(m => {
      results.push({
        domain,
        item: m.item,
        score: m.score,
        match: m.match,
        label: m.item[labelKey] || getSearchableText(m.item),
        date: m.item.date || m.item.created || '',
      });
    });
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 100);
}

export function searchHabits(query) {
  const s = State.get();
  return searchArray(s.habits, query).map(r => r.item);
}

export function searchJournal(query) {
  const s = State.get();
  return searchArray(s.journal, query).map(r => r.item);
}

export function searchLogs(query) {
  const s = State.get();
  return searchArray(s.logs, query).map(r => r.item);
}

export function searchVitals(query) {
  const s = State.get();
  return searchArray(s.vitals, query).map(r => r.item);
}

export function searchSymptoms(query) {
  const s = State.get();
  return searchArray(s.symptoms, query).map(r => r.item);
}

export function searchMedications(query) {
  const s = State.get();
  return searchArray(s.medications, query).map(r => r.item);
}

export function searchTransactions(query) {
  const s = State.get();
  return searchArray(s.transactions, query).map(r => r.item);
}

export function searchCourses(query) {
  const s = State.get();
  return searchArray(s.courses, query).map(r => r.item);
}

export function searchTasks(query) {
  const s = State.get();
  return searchArray(s.tasks, query).map(r => r.item);
}

export function searchProjects(query) {
  const s = State.get();
  return searchArray(s.projects, query).map(r => r.item);
}

export function searchExercises(query) {
  const s = State.get();
  return searchArray(s.exercise, query).map(r => r.item);
}

export function searchMeals(query) {
  const s = State.get();
  if (!s.nutrition?.meals) return [];
  return searchArray(s.nutrition.meals, query).map(r => r.item);
}

export function searchGoals(query) {
  const s = State.get();
  return searchArray(s.goals, query).map(r => r.item);
}

export function searchChallenges(query) {
  const s = State.get();
  return searchArray(s.challenges, query).map(r => r.item);
}

export function searchGratitudes(query) {
  const s = State.get();
  return searchArray(s.gratitudes, query).map(r => r.item);
}

export function searchReadingList(query) {
  const s = State.get();
  return searchArray(s.readingList, query).map(r => r.item);
}

export function filterByDateRange(items, fromDate, toDate) {
  if (!items || !items.length) return [];
  if (!fromDate && !toDate) return [...items];
  const from = fromDate || '1970-01-01';
  const to = toDate || '2099-12-31';
  return items.filter(item => {
    const d = item.date || item.created || item.timestamp?.slice(0, 10) || '';
    return d >= from && d <= to;
  });
}

export function filterByType(items, type) {
  if (!items || !items.length) return [];
  if (!type) return [...items];
  return items.filter(item => {
    if (item.type) return item.type === type;
    if (item.category) return item.category === type;
    return false;
  });
}

export function sortResults(items, sortBy, ascending) {
  if (!items || !items.length) return [];
  const sorted = [...items].sort((a, b) => {
    let va, vb;
    if (sortBy === 'date' || sortBy === 'created') {
      va = a.date || a.created || a.timestamp || '';
      vb = b.date || b.created || b.timestamp || '';
    } else if (sortBy === 'score') {
      va = a.score || 0;
      vb = b.score || 0;
    } else if (sortBy === 'name' || sortBy === 'title') {
      va = (a.name || a.title || '').toLowerCase();
      vb = (b.name || b.title || '').toLowerCase();
    } else if (sortBy === 'amount') {
      va = Math.abs(a.amount || 0);
      vb = Math.abs(b.amount || 0);
    } else if (sortBy === 'severity') {
      va = a.severity || 0;
      vb = b.severity || 0;
    } else {
      va = a[sortBy] || 0;
      vb = b[sortBy] || 0;
    }
    if (typeof va === 'string') {
      return ascending ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return ascending ? va - vb : vb - va;
  });
  return sorted;
}

export function getSearchSuggestions(partialQuery) {
  const s = State.get();
  const q = (partialQuery || '').trim().toLowerCase();
  if (!q || q.length < 2) return [];
  const suggestions = [];
  const seen = new Set();

  const addSuggestion = (text, domain) => {
    const lower = text.toLowerCase();
    if (!lower.includes(q)) return;
    if (seen.has(lower)) return;
    seen.add(lower);
    suggestions.push({ text: truncate(text, 40), domain });
  };

  s.habits.forEach(h => addSuggestion(h.name, 'habits'));
  s.tasks.forEach(t => addSuggestion(t.title, 'tasks'));
  s.projects.forEach(p => addSuggestion(p.name, 'projects'));
  s.courses.forEach(c => addSuggestion(c.name, 'courses'));
  s.goals.forEach(g => addSuggestion(g.title, 'goals'));
  s.challenges.forEach(c => addSuggestion(c.title, 'challenges'));
  (s.tags || []).forEach(t => addSuggestion(t.name, 'tags'));
  s.medications.forEach(m => addSuggestion(m.name, 'medications'));
  s.accounts.forEach(a => addSuggestion(a.name, 'accounts'));
  s.budgets.forEach(b => addSuggestion(b.category, 'budgets'));
  FINANCE_CATEGORIES.forEach(c => addSuggestion(c, 'categories'));
  HABIT_TEMPLATES.forEach(h => addSuggestion(h.name, 'templates'));

  const dateSuggestions = ['today', 'yesterday', 'this week', 'last week', 'this month'];
  dateSuggestions.forEach(ds => {
    if (ds.toLowerCase().includes(q) && !seen.has(ds)) {
      seen.add(ds);
      suggestions.push({ text: ds, domain: 'dates' });
    }
  });

  return suggestions.slice(0, 8);
}

export function getSearchResultIcon(domain) {
  const icons = {
    habits: '⭐',
    journal: '📝',
    logs: '📋',
    vitals: '❤️',
    symptoms: '🩺',
    medications: '💊',
    transactions: '💰',
    courses: '📖',
    tasks: '✅',
    projects: '📁',
    exercise: '🏃',
    meals: '🍽️',
    goals: '🎯',
    challenges: '🏆',
    gratitudes: '🙏',
    readingList: '📚',
    assignments: '📝',
    budgets: '📊',
    accounts: '🏦',
    focusHistory: '⏱️',
    tags: '🏷️',
    customFields: '📌',
  };
  return icons[domain] || '📄';
}

export function groupSearchResults(results) {
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.domain]) grouped[r.domain] = [];
    grouped[r.domain].push(r);
  });
  return Object.entries(grouped).map(([domain, items]) => ({
    domain,
    icon: getSearchResultIcon(domain),
    count: items.length,
    items,
  })).sort((a, b) => b.items.length - a.items.length);
}

export function fuzzySearch(query, items, keys) {
  const q = query.toLowerCase().trim();
  if (!q || !items?.length) return [];
  const scored = items.map(item => {
    let maxScore = 0;
    const searchKeys = keys || Object.keys(item).filter(k => typeof item[k] === 'string');
    searchKeys.forEach(key => {
      const val = String(item[key] || '').toLowerCase();
      let s = 0;
      if (val === q) s = 100;
      else if (val.startsWith(q)) s = 80;
      else if (val.includes(' ' + q)) s = 60;
      else if (val.includes(q)) s = 40;
      const qParts = q.split('');
      let matched = 0;
      let lastIdx = -1;
      for (const ch of qParts) {
        const idx = val.indexOf(ch, lastIdx + 1);
        if (idx > lastIdx) { matched++; lastIdx = idx; }
      }
      const fuzzyScore = qParts.length > 0 ? (matched / qParts.length) * 30 : 0;
      s = Math.max(s, fuzzyScore);
      maxScore = Math.max(maxScore, s);
    });
    return { item, score: maxScore };
  }).filter(r => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map(r => r.item);
}

import { FINANCE_CATEGORIES, HABIT_TEMPLATES } from '../constants.js';

const Search = {
  searchAll,
  searchHabits,
  searchJournal,
  searchLogs,
  searchVitals,
  searchSymptoms,
  searchMedications,
  searchTransactions,
  searchCourses,
  searchTasks,
  searchProjects,
  searchExercises,
  searchMeals,
  searchGoals,
  searchChallenges,
  searchGratitudes,
  searchReadingList,
  filterByDateRange,
  filterByType,
  sortResults,
  getSearchSuggestions,
  getSearchResultIcon,
  groupSearchResults,
  fuzzySearch,
  SEARCH_DOMAINS,
};

export default Search;
