import State from '../state.js';
import { uid, today, timeStr } from '../helpers.js';

const REMINDER_TYPES = {
  HABIT: 'habit',
  WATER: 'water',
  MOOD: 'mood',
  MEDICATION: 'medication',
  GOAL: 'goal',
  CUSTOM: 'custom',
};

const PERMISSION_STATES = {
  GRANTED: 'granted',
  DENIED: 'denied',
  DEFAULT: 'default',
};

let _permissionState = PERMISSION_STATES.DEFAULT;
let _reminderTimers = new Map();
let _tickInterval = null;

export function requestPermission() {
  return new Promise(resolve => {
    if (!('Notification' in window)) {
      _permissionState = PERMISSION_STATES.DENIED;
      resolve(_permissionState);
      return;
    }
    if (Notification.permission === 'granted') {
      _permissionState = PERMISSION_STATES.GRANTED;
      resolve(_permissionState);
      return;
    }
    if (Notification.permission === 'denied') {
      _permissionState = PERMISSION_STATES.DENIED;
      resolve(_permissionState);
      return;
    }
    Notification.requestPermission().then(permission => {
      _permissionState = permission === 'granted' ? PERMISSION_STATES.GRANTED : PERMISSION_STATES.DENIED;
      resolve(_permissionState);
    });
  });
}

export function getPermissionState() {
  if ('Notification' in window) {
    _permissionState = Notification.permission === 'granted' ? PERMISSION_STATES.GRANTED :
      Notification.permission === 'denied' ? PERMISSION_STATES.DENIED : PERMISSION_STATES.DEFAULT;
  }
  return _permissionState;
}

export function sendLocalNotification(title, body) {
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }
  try {
    const notif = new Notification(title, {
      body: body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'mytrack-' + Date.now(),
      requireInteraction: false,
      silent: false,
    });
    setTimeout(() => notif.close(), 10000);
    return true;
  } catch (e) {
    console.error('Notification error:', e);
    return false;
  }
}

function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

function timeToMinutes(timeStr) {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function getMinutesUntil(targetTime) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = timeToMinutes(targetTime);
  let diff = targetMinutes - currentMinutes;
  if (diff < 0) diff += 1440;
  return diff;
}

function shouldFireOnToday(days) {
  if (!days || days.length === 0) return true;
  const todayNum = new Date().getDay();
  const adjustedDay = todayNum === 0 ? 7 : todayNum;
  return days.includes(adjustedDay);
}

function addReminderToState(reminder) {
  const s = State.get();
  if (!s.reminders) s.reminders = [];
  s.reminders.push(reminder);
  State.save();
  State.notify();
}

function updateReminderInState(id, changes) {
  const s = State.get();
  const idx = s.reminders.findIndex(r => r.id === id);
  if (idx >= 0) {
    s.reminders[idx] = { ...s.reminders[idx], ...changes };
    State.save();
    State.notify();
  }
}

function removeReminderFromState(id) {
  const s = State.get();
  s.reminders = s.reminders.filter(r => r.id !== id);
  State.save();
  State.notify();
}

function createReminderId() {
  return 'rem_' + uid();
}

function scheduleTimer(reminderId, timeStr, callback) {
  cancelTimer(reminderId);
  const ms = getMinutesUntil(timeStr) * 60 * 1000;
  if (ms <= 0) return;
  const timerId = setTimeout(() => {
    callback();
    _reminderTimers.delete(reminderId);
  }, ms);
  _reminderTimers.set(reminderId, timerId);
}

function cancelTimer(id) {
  if (_reminderTimers.has(id)) {
    clearTimeout(_reminderTimers.get(id));
    _reminderTimers.delete(id);
  }
}

export function scheduleHabitReminder(habitName, time) {
  const rid = createReminderId();
  const reminder = {
    id: rid,
    type: REMINDER_TYPES.HABIT,
    title: `Habit Reminder: ${habitName}`,
    body: `Time to complete "${habitName}"!`,
    time: time || '09:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    habitName,
    created: today(),
    lastFired: null,
  };
  addReminderToState(reminder);
  scheduleTimer(rid, reminder.time, () => {
    if (reminder.enabled && shouldFireOnToday(reminder.days)) {
      sendLocalNotification(reminder.title, reminder.body);
      updateReminderInState(rid, { lastFired: new Date().toISOString() });
      const s = State.get();
      State.addLog(`Reminder: ${reminder.title}`, '⏰', 'reminder');
    }
    scheduleTimer(rid, reminder.time, arguments.callee);
  });
  return reminder;
}

export function scheduleWaterReminder(interval, timeRange) {
  const rid = createReminderId();
  const start = timeRange?.start || '09:00';
  const end = timeRange?.end || '21:00';
  const reminder = {
    id: rid,
    type: REMINDER_TYPES.WATER,
    title: '💧 Drink Water!',
    body: `Time to hydrate! Stay on track with your water goal.`,
    time: start,
    interval: interval || 60,
    timeRange: { start, end },
    days: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    created: today(),
    lastFired: null,
    intervalTimers: [],
  };
  addReminderToState(reminder);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (isNaN(startMinutes) || isNaN(endMinutes)) return reminder;
  const totalMinutes = endMinutes - startMinutes;
  if (totalMinutes <= 0) return reminder;
  const numReminders = Math.floor(totalMinutes / interval);
  for (let i = 0; i < numReminders; i++) {
    const reminderTimeMinutes = startMinutes + i * interval;
    const h = Math.floor(reminderTimeMinutes / 60);
    const m = reminderTimeMinutes % 60;
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const innerId = rid + '_' + i;
    scheduleTimer(innerId, timeStr, () => {
      if (reminder.enabled && shouldFireOnToday(reminder.days)) {
        sendLocalNotification(reminder.title, reminder.body);
        updateReminderInState(rid, { lastFired: new Date().toISOString() });
      }
      scheduleTimer(innerId, timeStr, arguments.callee);
    });
    reminder.intervalTimers.push(innerId);
  }
  return reminder;
}

export function scheduleMoodCheckin(time) {
  const rid = createReminderId();
  const reminder = {
    id: rid,
    type: REMINDER_TYPES.MOOD,
    title: '📊 Mood Check-in',
    body: 'How are you feeling right now? Take a moment to log your mood.',
    time: time || '20:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    created: today(),
    lastFired: null,
  };
  addReminderToState(reminder);
  scheduleTimer(rid, reminder.time, () => {
    if (reminder.enabled && shouldFireOnToday(reminder.days)) {
      sendLocalNotification(reminder.title, reminder.body);
      updateReminderInState(rid, { lastFired: new Date().toISOString() });
    }
    scheduleTimer(rid, reminder.time, arguments.callee);
  });
  return reminder;
}

export function scheduleMedicationReminder(medName, time) {
  const rid = createReminderId();
  const reminder = {
    id: rid,
    type: REMINDER_TYPES.MEDICATION,
    title: `💊 Medication: ${medName}`,
    body: `Time to take your medication: ${medName}`,
    time: time || '08:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    medicationName: medName,
    created: today(),
    lastFired: null,
  };
  addReminderToState(reminder);
  scheduleTimer(rid, reminder.time, () => {
    if (reminder.enabled && shouldFireOnToday(reminder.days)) {
      sendLocalNotification(reminder.title, reminder.body);
      updateReminderInState(rid, { lastFired: new Date().toISOString() });
      const s = State.get();
      const med = s.medications.find(m => m.name === medName);
      if (med) {
        med.lastTaken = new Date().toISOString();
        State.save();
        State.notify();
      }
    }
    scheduleTimer(rid, reminder.time, arguments.callee);
  });
  return reminder;
}

export function scheduleGoalReminder(goalTitle, time) {
  const rid = createReminderId();
  const frequency = 'daily';
  const reminder = {
    id: rid,
    type: REMINDER_TYPES.GOAL,
    title: `🎯 Goal: ${goalTitle}`,
    body: `You have an active goal: "${goalTitle}". Make some progress today!`,
    time: time || '12:00',
    days: [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    goalTitle,
    frequency,
    created: today(),
    lastFired: null,
  };
  addReminderToState(reminder);
  scheduleTimer(rid, reminder.time, () => {
    if (reminder.enabled && shouldFireOnToday(reminder.days)) {
      const s = State.get();
      const goal = s.goals.find(g => g.title === goalTitle);
      if (goal && !goal.completed) {
        sendLocalNotification(reminder.title, reminder.body);
        updateReminderInState(rid, { lastFired: new Date().toISOString() });
      }
    }
    scheduleTimer(rid, reminder.time, arguments.callee);
  });
  return reminder;
}

export function scheduleCustomReminder({ title, body, time, days, repeatDaily }) {
  const rid = createReminderId();
  const reminder = {
    id: rid,
    type: REMINDER_TYPES.CUSTOM,
    title: title || 'Reminder',
    body: body || '',
    time: time || '12:00',
    days: days || [1, 2, 3, 4, 5, 6, 7],
    enabled: true,
    repeatDaily: repeatDaily !== false,
    created: today(),
    lastFired: null,
  };
  addReminderToState(reminder);
  scheduleTimer(rid, reminder.time, () => {
    if (reminder.enabled && shouldFireOnToday(reminder.days)) {
      sendLocalNotification(reminder.title, reminder.body || '');
      updateReminderInState(rid, { lastFired: new Date().toISOString() });
    }
    scheduleTimer(rid, reminder.time, arguments.callee);
  });
  return reminder;
}

export function cancelAllReminders() {
  for (const [id, timerId] of _reminderTimers.entries()) {
    clearTimeout(timerId);
    _reminderTimers.delete(id);
  }
  const s = State.get();
  s.reminders = s.reminders.map(r => ({ ...r, enabled: false }));
  State.save();
  State.notify();
  if (_tickInterval) {
    clearInterval(_tickInterval);
    _tickInterval = null;
  }
}

export function cancelReminder(id) {
  cancelTimer(id);
  const s = State.get();
  const reminder = s.reminders.find(r => r.id === id);
  if (reminder) {
    if (reminder.intervalTimers) {
      reminder.intervalTimers.forEach(tid => cancelTimer(tid));
    }
    reminder.enabled = false;
    updateReminderInState(id, { enabled: false });
  }
}

export function deleteReminder(id) {
  cancelTimer(id);
  const s = State.get();
  const reminder = s.reminders.find(r => r.id === id);
  if (reminder && reminder.intervalTimers) {
    reminder.intervalTimers.forEach(tid => cancelTimer(tid));
  }
  removeReminderFromState(id);
}

export function enableReminder(id) {
  const s = State.get();
  const reminder = s.reminders.find(r => r.id === id);
  if (!reminder) return null;
  reminder.enabled = true;
  updateReminderInState(id, { enabled: true });
  if (reminder.type === REMINDER_TYPES.WATER && reminder.interval) {
    scheduleWaterReminder(reminder.interval, reminder.timeRange);
  } else {
    scheduleTimer(id, reminder.time, () => {
      if (reminder.enabled && shouldFireOnToday(reminder.days)) {
        sendLocalNotification(reminder.title, reminder.body);
        updateReminderInState(id, { lastFired: new Date().toISOString() });
      }
      scheduleTimer(id, reminder.time, arguments.callee);
    });
  }
  return reminder;
}

export function getPendingReminders() {
  const s = State.get();
  if (!s.reminders) return [];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return s.reminders.filter(r => {
    if (!r.enabled) return false;
    if (!shouldFireOnToday(r.days)) return false;
    const reminderMinutes = timeToMinutes(r.time);
    if (isNaN(reminderMinutes)) return false;
    if (r.lastFired) {
      const lastFiredDate = new Date(r.lastFired).toISOString().slice(0, 10);
      if (lastFiredDate === today()) return false;
    }
    return reminderMinutes <= currentMinutes + 5 && reminderMinutes >= currentMinutes - 5;
  });
}

export function getAllReminders() {
  const s = State.get();
  return (s.reminders || []).sort((a, b) => {
    return a.time.localeCompare(b.time);
  });
}

export function getRemindersByType(type) {
  const s = State.get();
  return (s.reminders || []).filter(r => r.type === type);
}

export function checkAndNotify() {
  const pending = getPendingReminders();
  pending.forEach(r => {
    sendLocalNotification(r.title, r.body);
    updateReminderInState(r.id, { lastFired: new Date().toISOString() });
    if (r.type === REMINDER_TYPES.MEDICATION && r.medicationName) {
      const s = State.get();
      const med = s.medications.find(m => m.name === r.medicationName);
      if (med) {
        med.lastTaken = new Date().toISOString();
        State.save();
        State.notify();
      }
    }
  });
  return pending;
}

export function startBackgroundCheck(intervalMinutes = 1) {
  if (_tickInterval) clearInterval(_tickInterval);
  _tickInterval = setInterval(() => {
    checkAndNotify();
  }, intervalMinutes * 60 * 1000);
  return _tickInterval;
}

export function stopBackgroundCheck() {
  if (_tickInterval) {
    clearInterval(_tickInterval);
    _tickInterval = null;
  }
}

export function getReminderStats() {
  const s = State.get();
  const reminders = s.reminders || [];
  const total = reminders.length;
  const enabled = reminders.filter(r => r.enabled).length;
  const disabled = total - enabled;
  const byType = {};
  reminders.forEach(r => {
    byType[r.type] = (byType[r.type] || 0) + 1;
  });
  return { total, enabled, disabled, byType };
}

export function onPermissionChange(callback) {
  if ('Notification' in window && Notification.permission === 'default') {
    const checkInterval = setInterval(() => {
      if (Notification.permission !== 'default') {
        clearInterval(checkInterval);
        _permissionState = Notification.permission === 'granted' ? PERMISSION_STATES.GRANTED : PERMISSION_STATES.DENIED;
        callback(_permissionState);
      }
    }, 500);
    return () => clearInterval(checkInterval);
  }
  return () => {};
}

const Notifications = {
  requestPermission,
  getPermissionState,
  sendLocalNotification,
  scheduleHabitReminder,
  scheduleWaterReminder,
  scheduleMoodCheckin,
  scheduleMedicationReminder,
  scheduleGoalReminder,
  scheduleCustomReminder,
  cancelAllReminders,
  cancelReminder,
  deleteReminder,
  enableReminder,
  getPendingReminders,
  getAllReminders,
  getRemindersByType,
  checkAndNotify,
  startBackgroundCheck,
  stopBackgroundCheck,
  getReminderStats,
  onPermissionChange,
  REMINDER_TYPES,
};

export default Notifications;
