import State from '../state.js';
import { uid, today, timeStr } from '../helpers.js';

const TIMER_STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};

const TIMER_TYPES = {
  POMODORO: 'pomodoro',
  MEDITATION: 'meditation',
  STUDY: 'study',
  WORKOUT: 'workout',
  CUSTOM: 'custom',
};

const DEFAULT_DURATIONS = {
  [TIMER_TYPES.POMODORO]: 25,
  [TIMER_TYPES.MEDITATION]: 10,
  [TIMER_TYPES.STUDY]: 45,
  [TIMER_TYPES.WORKOUT]: 30,
  [TIMER_TYPES.CUSTOM]: 25,
};

let _state = TIMER_STATE.IDLE;
let _duration = 0;
let _remaining = 0;
let _type = TIMER_TYPES.CUSTOM;
let _label = '';
let _interval = null;
let _startedAt = null;
let _pausedAt = null;
let _totalPausedTime = 0;
let _tickCallbacks = [];
let _completeCallbacks = [];
let _sessionId = null;

export function getState() {
  return _state;
}

export function getType() {
  return _type;
}

export function getRemaining() {
  const totalSeconds = _remaining;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const total = _duration;
  const progress = total > 0 ? 1 - (_remaining / total) : 0;
  return { minutes, seconds, totalSeconds, progress: Math.max(0, Math.min(1, progress)) };
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function start(durationMinutes, type, onComplete) {
  if (_state === TIMER_STATE.RUNNING) return false;
  if (onComplete) _completeCallbacks.push(onComplete);
  _duration = (durationMinutes || DEFAULT_DURATIONS[type] || DEFAULT_DURATIONS.custom) * 60;
  _remaining = _duration;
  _type = type || TIMER_TYPES.CUSTOM;
  _label = getTypeLabel(_type);
  _startedAt = new Date().toISOString();
  _pausedAt = null;
  _totalPausedTime = 0;
  _sessionId = uid();
  _state = TIMER_STATE.RUNNING;
  clearTickInterval();
  _interval = setInterval(tick, 1000);
  notifyTick();
  State.addLog(`Timer started: ${_label} (${durationMinutes}min)`, '⏱️', 'focus');
  return true;
}

export function startPomodoro(durationMinutes) {
  return start(durationMinutes || getDefaultDuration(TIMER_TYPES.POMODORO), TIMER_TYPES.POMODORO);
}

export function startMeditation(durationMinutes) {
  return start(durationMinutes || getDefaultDuration(TIMER_TYPES.MEDITATION), TIMER_TYPES.MEDITATION);
}

export function startStudy(durationMinutes) {
  return start(durationMinutes || getDefaultDuration(TIMER_TYPES.STUDY), TIMER_TYPES.STUDY);
}

export function startWorkout(durationMinutes) {
  return start(durationMinutes || getDefaultDuration(TIMER_TYPES.WORKOUT), TIMER_TYPES.WORKOUT);
}

export function pause() {
  if (_state !== TIMER_STATE.RUNNING) return false;
  _state = TIMER_STATE.PAUSED;
  _pausedAt = Date.now();
  clearTickInterval();
  notifyTick();
  return true;
}

export function resume() {
  if (_state !== TIMER_STATE.PAUSED) return false;
  if (_pausedAt) {
    _totalPausedTime += Date.now() - _pausedAt;
    _pausedAt = null;
  }
  _state = TIMER_STATE.RUNNING;
  _interval = setInterval(tick, 1000);
  notifyTick();
  return true;
}

export function stop() {
  if (_state === TIMER_STATE.IDLE) return false;
  const wasRunning = _state === TIMER_STATE.RUNNING || _state === TIMER_STATE.PAUSED;
  clearTickInterval();
  _state = TIMER_STATE.IDLE;
  _remaining = 0;
  _pausedAt = null;
  if (wasRunning) {
    State.addLog('Timer stopped', '⏱️', 'focus');
  }
  notifyTick();
  return true;
}

export function reset() {
  clearTickInterval();
  _state = TIMER_STATE.IDLE;
  _remaining = _duration;
  _pausedAt = null;
  _totalPausedTime = 0;
  notifyTick();
}

function tick() {
  if (_state !== TIMER_STATE.RUNNING) return;
  _remaining--;
  if (_remaining <= 0) {
    _remaining = 0;
    complete();
    return;
  }
  notifyTick();
}

function complete() {
  clearTickInterval();
  _state = TIMER_STATE.COMPLETED;
  saveSession();
  State.addLog(`Timer complete: ${_label}`, '✅', 'focus');
  State.addXP(Math.floor(_duration / 60));
  notifyTick();
  const callbacks = [..._completeCallbacks];
  _completeCallbacks = [];
  callbacks.forEach(fn => { try { fn(getSessionData()); } catch (e) { console.error('Timer onComplete error:', e); } });
}

export function onTick(callback) {
  _tickCallbacks.push(callback);
  return () => {
    const idx = _tickCallbacks.indexOf(callback);
    if (idx >= 0) _tickCallbacks.splice(idx, 1);
  };
}

export function onComplete(callback) {
  _completeCallbacks.push(callback);
  return () => {
    const idx = _completeCallbacks.indexOf(callback);
    if (idx >= 0) _completeCallbacks.splice(idx, 1);
  };
}

function notifyTick() {
  const data = getSessionData();
  _tickCallbacks.forEach(fn => { try { fn(data); } catch (e) { console.error('Timer tick error:', e); } });
}

function getSessionData() {
  const remaining = getRemaining();
  return {
    state: _state,
    type: _type,
    label: _label,
    duration: _duration,
    remaining,
    formatted: formatTime(remaining.totalSeconds),
    progress: remaining.progress,
    startedAt: _startedAt,
    sessionId: _sessionId,
  };
}

function clearTickInterval() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}

function saveSession() {
  if (!_sessionId) return;
  const elapsed = _duration - _remaining;
  const finished = _remaining <= 0;
  const session = {
    id: _sessionId,
    type: _type,
    label: _label,
    duration: Math.round(_duration / 60),
    elapsed: Math.round(elapsed / 60),
    completed: finished,
    startedAt: _startedAt,
    completedAt: new Date().toISOString(),
    date: today(),
    time: timeStr(),
    pausedDuration: Math.round(_totalPausedTime / 1000),
  };
  const s = State.get();
  if (!s.focusHistory) s.focusHistory = [];
  s.focusHistory.push(session);
  if (s.focusHistory.length > 500) s.focusHistory = s.focusHistory.slice(-500);
  State.save();
  State.notify();
  _sessionId = null;
  return session;
}

export function getSessionHistory(limit = 50) {
  const s = State.get();
  if (!s.focusHistory) return [];
  return [...s.focusHistory].sort((a, b) => {
    return (b.startedAt || b.date).localeCompare(a.startedAt || a.date);
  }).slice(0, limit);
}

export function getSessionStats() {
  const s = State.get();
  const history = s.focusHistory || [];
  const total = history.length;
  const totalMinutes = history.reduce((sum, h) => sum + (h.elapsed || h.duration || 0), 0);
  const completed = history.filter(h => h.completed).length;
  const byType = {};
  history.forEach(h => {
    byType[h.type] = byType[h.type] || { count: 0, minutes: 0 };
    byType[h.type].count++;
    byType[h.type].minutes += h.elapsed || h.duration || 0;
  });
  const todaySessions = history.filter(h => h.date === today());
  const todayMinutes = todaySessions.reduce((sum, h) => sum + (h.elapsed || h.duration || 0), 0);
  const avgSessionLength = total > 0 ? Math.round(totalMinutes / total) : 0;
  const longestSession = history.length > 0 ? Math.max(...history.map(h => h.elapsed || h.duration || 0)) : 0;
  return { total, totalMinutes, completed, byType, todaySessions: todaySessions.length, todayMinutes, avgSessionLength, longestSession, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export function getDefaultDuration(type) {
  return DEFAULT_DURATIONS[type] || DEFAULT_DURATIONS.custom;
}

export function getTimerTypes() {
  return Object.values(TIMER_TYPES);
}

function getTypeLabel(type) {
  const labels = {
    [TIMER_TYPES.POMODORO]: 'Pomodoro',
    [TIMER_TYPES.MEDITATION]: 'Meditation',
    [TIMER_TYPES.STUDY]: 'Study Session',
    [TIMER_TYPES.WORKOUT]: 'Workout Interval',
    [TIMER_TYPES.CUSTOM]: 'Custom Timer',
  };
  return labels[type] || 'Custom Timer';
}

export function setDuration(minutes) {
  if (_state === TIMER_STATE.RUNNING) return false;
  _duration = Math.max(1, minutes) * 60;
  _remaining = _duration;
  notifyTick();
  return true;
}

export function addTime(minutes) {
  if (_state !== TIMER_STATE.RUNNING && _state !== TIMER_STATE.PAUSED) return false;
  _remaining += minutes * 60;
  _duration += minutes * 60;
  notifyTick();
  return true;
}

export function skipBreak() {
  if (_type !== TIMER_TYPES.POMODORO) return false;
  stop();
  State.addLog('Pomodoro break skipped', '⏭️', 'focus');
  return true;
}

export function getPomodoroStats() {
  const s = State.get();
  const pomodoros = (s.focusHistory || []).filter(h => h.type === TIMER_TYPES.POMODORO);
  const completed = pomodoros.filter(h => h.completed).length;
  const totalDuration = pomodoros.reduce((sum, h) => sum + (h.elapsed || 0), 0);
  const todayPomodoros = pomodoros.filter(h => h.date === today()).length;
  const streak = calculatePomodoroStreak(pomodoros);
  return { total: pomodoros.length, completed, totalDuration, todayPomodoros, streak, avgDuration: pomodoros.length > 0 ? Math.round(totalDuration / pomodoros.length) : 0 };
}

function calculatePomodoroStreak(pomodoros) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (pomodoros.some(p => p.date === ds && p.completed)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function deleteSession(id) {
  const s = State.get();
  if (!s.focusHistory) return false;
  s.focusHistory = s.focusHistory.filter(h => h.id !== id);
  State.save();
  State.notify();
  return true;
}

export function clearHistory() {
  const s = State.get();
  s.focusHistory = [];
  State.save();
  State.notify();
  State.addLog('Timer history cleared', '🗑️', 'focus');
}

const Timer = {
  start,
  startPomodoro,
  startMeditation,
  startStudy,
  startWorkout,
  pause,
  resume,
  stop,
  reset,
  getState,
  getType,
  getRemaining,
  formatTime,
  onTick,
  onComplete,
  getSessionHistory,
  getSessionStats,
  getDefaultDuration,
  getTimerTypes,
  setDuration,
  addTime,
  skipBreak,
  getPomodoroStats,
  deleteSession,
  clearHistory,
  saveSession,
  TIMER_STATE,
  TIMER_TYPES,
};

export default Timer;
