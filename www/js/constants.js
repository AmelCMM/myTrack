import { uid, today } from './helpers.js';

export const APP_NAME = 'myTrack';
export const APP_VERSION = '2.0.0';
export const APP_AUTHOR = 'Neura Lumina';
export const APP_GITHUB = 'https://github.com/AmelCMM';

export const STORAGE_KEY = 'mt_state_v3';
export const SALT_KEY = '__mt_salt__';
export const MAX_LOGS = 1000;
export const MAX_BLE_READINGS = 500;
export const MAX_BALANCE_HISTORY = 730;
export const MAX_EXERCISES_PER_DAY = 50;
export const MAX_MEALS_PER_DAY = 10;

export const DEFAULT_WATER_GOAL = 8;
export const DEFAULT_POMODORO = 25;
export const DEFAULT_SLEEP_GOAL = 8;
export const DEFAULT_CALORIE_GOAL = 2000;
export const DEFAULT_STEPS_GOAL = 10000;

export const ACCENTS = [
  { name: 'Emerald', c: '#00e5a0' },
  { name: 'Gold', c: '#f5c842' },
  { name: 'Ice', c: '#6bc5ff' },
  { name: 'Rose', c: '#ff6b9d' },
  { name: 'Lavender', c: '#b599ff' },
  { name: 'Coral', c: '#ff7f6b' },
  { name: 'Mint', c: '#4cd9b0' },
  { name: 'Sunset', c: '#ff9a56' },
];

export const MOODS = [
  { emoji: '😔', label: 'Low', score: 0.1 },
  { emoji: '😐', label: 'Neutral', score: 0.4 },
  { emoji: '🙂', label: 'Good', score: 0.65 },
  { emoji: '😊', label: 'Happy', score: 0.85 },
  { emoji: '🚀', label: 'Amazing', score: 1.0 },
];

export const MOOD_EMOJIS = MOODS.map(m => m.emoji);

export const HABIT_TEMPLATES = [
  { name: 'Meditate', emoji: '🧘' },
  { name: 'Hydrate', emoji: '💧' },
  { name: 'Read', emoji: '📚' },
  { name: 'Exercise', emoji: '🏃' },
  { name: 'No sugar', emoji: '🌿' },
  { name: 'Journal', emoji: '✍️' },
  { name: 'Stretch', emoji: '🤸' },
  { name: 'Walk', emoji: '🚶' },
  { name: 'Gratitude', emoji: '🙏' },
  { name: 'Early rise', emoji: '🌅' },
];

export const DEFAULT_HABITS = HABIT_TEMPLATES.slice(0, 6);

export const SEVERITY_LEVELS = [
  { value: 1, label: 'Minimal' },
  { value: 3, label: 'Mild' },
  { value: 5, label: 'Moderate' },
  { value: 7, label: 'Severe' },
  { value: 9, label: 'Extreme' },
];

export const EXERCISE_TYPES = [
  { id: 'running', label: 'Running', emoji: '🏃', calPerMin: 10 },
  { id: 'walking', label: 'Walking', emoji: '🚶', calPerMin: 4 },
  { id: 'cycling', label: 'Cycling', emoji: '🚴', calPerMin: 8 },
  { id: 'swimming', label: 'Swimming', emoji: '🏊', calPerMin: 9 },
  { id: 'yoga', label: 'Yoga', emoji: '🧘', calPerMin: 3 },
  { id: 'weights', label: 'Weights', emoji: '🏋️', calPerMin: 7 },
  { id: 'cardio', label: 'Cardio', emoji: '💪', calPerMin: 9 },
  { id: 'sports', label: 'Sports', emoji: '⚽', calPerMin: 8 },
  { id: 'dance', label: 'Dance', emoji: '💃', calPerMin: 7 },
  { id: 'hike', label: 'Hiking', emoji: '🥾', calPerMin: 6 },
  { id: 'pilates', label: 'Pilates', emoji: '🤸', calPerMin: 4 },
  { id: 'other', label: 'Other', emoji: '🏃', calPerMin: 5 },
];

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  { id: 'snack', label: 'Snack', emoji: '🍿' },
];

export const FINANCE_CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Utilities', 'Entertainment',
  'Shopping', 'Healthcare', 'Education', 'Savings', 'Investment',
  'Salary', 'Freelance', 'Gift', 'Other',
];

export const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low', color: 'var(--tm)' },
  { id: 'normal', label: 'Normal', color: 'var(--ts)' },
  { id: 'high', label: 'High', color: 'var(--warn)' },
  { id: 'urgent', label: 'Urgent', color: 'var(--danger)' },
];

export const CHALLENGE_DIFFICULTY = [
  { id: 'easy', label: 'Easy', days: 7, xp: 50 },
  { id: 'medium', label: 'Medium', days: 14, xp: 150 },
  { id: 'hard', label: 'Hard', days: 30, xp: 400 },
  { id: 'extreme', label: 'Extreme', days: 60, xp: 1000 },
];

export const ACHIEVEMENTS = [
  { id: 'first_habit', title: 'First Step', desc: 'Complete your first habit', icon: '🌱', xp: 10 },
  { id: 'week_streak', title: 'Week Warrior', desc: '7-day habit streak', icon: '🔥', xp: 50 },
  { id: 'month_streak', title: 'Monthly Master', desc: '30-day habit streak', icon: '💪', xp: 200 },
  { id: 'journal_10', title: 'Diarist', desc: 'Write 10 journal entries', icon: '📖', xp: 30 },
  { id: 'journal_50', title: 'Chronicler', desc: 'Write 50 journal entries', icon: '📚', xp: 150 },
  { id: 'mood_30', title: 'Mood Analyst', desc: 'Log mood for 30 days', icon: '📊', xp: 80 },
  { id: 'water_7', title: 'Hydrated', desc: 'Hit water goal 7 days straight', icon: '💧', xp: 40 },
  { id: 'finance_first', title: 'Money Minded', desc: 'Log your first transaction', icon: '💰', xp: 10 },
  { id: 'challenge_done', title: 'Challenger', desc: 'Complete a challenge', icon: '🏆', xp: 100 },
  { id: 'habit_100', title: 'Centurion', desc: 'Complete 100 habit checks', icon: '🎯', xp: 300 },
  { id: 'meditation_30', title: 'Zen Master', desc: 'Meditate 30 times', icon: '🧘', xp: 150 },
  { id: 'early_bird', title: 'Early Bird', desc: 'Wake up early 14 days', icon: '🌅', xp: 100 },
  { id: 'balance_90', title: 'Peak Balance', desc: 'Reach 90+ balance score', icon: '⭐', xp: 250 },
  { id: 'focus_10h', title: 'Deep Focus', desc: '10 hours of focus sessions', icon: '⏱️', xp: 200 },
  { id: 'social', title: 'Social Butterfly', desc: 'Connect via BLE', icon: '📡', xp: 50 },
  { id: 'backup', title: 'Data Guardian', desc: 'Export your first backup', icon: '🔒', xp: 20 },
];

export const XP_LEVELS = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500,
  10000, 13000, 17000, 22000, 28000, 35000, 43000, 52000, 63000, 76000,
];

export const WEEKDAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const EMPTY_STATE = () => ({
  settings: {
    accentIdx: 0, lightMode: false, pin: '', lockEnabled: false,
    notifications: false, notificationTime: '08:00', biometrics: false,
    themeVariant: 'default', blockScreenshots: false,
    domainToggles: { health: true, study: true, work: true, mood: true, finance: true },
  },
  habits: DEFAULT_HABITS.map(h => ({ ...h, id: uid(), done: false, streak: 0, lastDate: '', created: today() })),
  water: { date: '', count: 0, goal: DEFAULT_WATER_GOAL },
  mood: { date: '', emoji: '', label: '' },
  journal: [],
  logs: [],
  balanceHistory: [],
  vitals: [], symptoms: [], medications: [],
  courses: [], assignments: [], studySessions: [],
  projects: [], tasks: [],
  accounts: [], transactions: [], budgets: [],
  gratitudes: [],
  bleReadings: [],
  sleep: { date: '', hours: 0, quality: 0, bedtime: '', wake: '' },
  exercise: [],
  nutrition: { date: '', meals: [], calories: 0, goal: DEFAULT_CALORIE_GOAL },
  steps: { date: '', count: 0, goal: DEFAULT_STEPS_GOAL },
  goals: [],
  challenges: [],
  achievements: [],
  xp: 0, level: 0,
  focusHistory: [],
  tags: [],
  onboardingDone: false,
  lastBackup: null,
  syncEnabled: false,
  customFields: [],
  readingList: [],
  reminders: [],
  wellbeingChecks: [],
  locationLogs: [],
});
