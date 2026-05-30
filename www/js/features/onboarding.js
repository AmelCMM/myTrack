import State from '../state.js';
import { uid, today, escapeHtml } from '../helpers.js';
import { HABIT_TEMPLATES, DEFAULT_WATER_GOAL, ACCENTS, DEFAULT_POMODORO } from '../constants.js';
import Notifications from './notifications.js';

let _currentStep = 0;
let _onboardingActive = false;
let _wizardData = {};

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to myTrack',
    icon: '👋',
    description: 'Your personal tracking dashboard. Track habits, mood, health, finances, and more — all privately on your device.',
    features: [
      { icon: '⭐', text: 'Track daily habits' },
      { icon: '💧', text: 'Monitor water intake' },
      { icon: '📊', text: 'Log your mood' },
      { icon: '🔒', text: 'AES-GCM encrypted' },
      { icon: '📡', text: 'Offline first' },
      { icon: '🎯', text: 'Set goals & challenges' },
    ],
    action: 'next',
  },
  {
    id: 'habits',
    title: 'Choose Your Habits',
    icon: '⭐',
    description: 'Pick the habits you want to track daily. You can always change these later.',
    templates: HABIT_TEMPLATES,
    multiSelect: true,
    action: 'select_habits',
  },
  {
    id: 'water',
    title: 'Set Water Goal',
    icon: '💧',
    description: 'How many glasses of water do you want to drink each day?',
    defaultValue: DEFAULT_WATER_GOAL,
    min: 1,
    max: 20,
    action: 'set_water',
  },
  {
    id: 'pin',
    title: 'App Security',
    icon: '🔒',
    description: 'Set a PIN to encrypt your data. This is optional but recommended for privacy.',
    action: 'set_pin',
    optional: true,
  },
  {
    id: 'theme',
    title: 'Choose Your Theme',
    icon: '🎨',
    description: 'Pick an accent color and choose between light and dark mode.',
    accents: ACCENTS,
    action: 'set_theme',
  },
  {
    id: 'notifications',
    title: 'Enable Notifications',
    icon: '🔔',
    description: 'Get reminded to track habits, drink water, and check in with your mood.',
    action: 'request_notifications',
    optional: true,
  },
  {
    id: 'tour',
    title: 'Quick Tour',
    icon: '🗺️',
    description: 'Here is a quick overview of what you can do:',
    tourItems: [
      { icon: '🏠', title: 'Dashboard', desc: 'See your daily balance, habits, and quick stats' },
      { icon: '📋', title: 'Timeline', desc: 'Review your activity log by day' },
      { icon: '📊', title: 'Insights', desc: 'View analytics and trends over time' },
      { icon: '✍️', title: 'Journal', desc: 'Write journal entries and track mood' },
      { icon: '⚙️', title: 'Settings', desc: 'Configure themes, security, and data management' },
    ],
    action: 'next',
  },
  {
    id: 'complete',
    title: 'You Are All Set!',
    icon: '🎉',
    description: 'Start tracking your life, one day at a time. Your data stays private on your device.',
    finalMessage: 'Remember: Consistency > Perfection. Start small, stay consistent.',
    action: 'complete',
  },
];

export function isFirstLaunch() {
  const s = State.get();
  return !s.onboardingDone;
}

export function startOnboarding() {
  if (!isFirstLaunch()) return false;
  _currentStep = 0;
  _onboardingActive = true;
  _wizardData = {};
  return true;
}

export function getStep(index) {
  if (index < 0 || index >= STEPS.length) return null;
  return { ...STEPS[index], stepNumber: index + 1, totalSteps: STEPS.length };
}

export function getTotalSteps() {
  return STEPS.length;
}

export function getCurrentStep() {
  return getStep(_currentStep);
}

export function getCurrentStepIndex() {
  return _currentStep;
}

export function nextStep() {
  if (_currentStep < STEPS.length - 1) {
    _currentStep++;
    return true;
  }
  return false;
}

export function prevStep() {
  if (_currentStep > 0) {
    _currentStep--;
    return true;
  }
  return false;
}

export function goToStep(index) {
  if (index >= 0 && index < STEPS.length) {
    _currentStep = index;
    return true;
  }
  return false;
}

export function skipOnboarding() {
  _currentStep = STEPS.length - 1;
  _onboardingActive = false;
  const s = State.get();
  s.onboardingDone = true;
  State.save();
  State.notify();
  State.addLog('Onboarding skipped', '⏭️', 'settings');
  return true;
}

export function completeOnboarding() {
  const s = State.get();
  s.onboardingDone = true;
  if (_wizardData.habits) {
    const selectedIds = new Set(_wizardData.habits);
    s.habits = HABIT_TEMPLATES.filter((_, i) => selectedIds.has(i)).map(h => ({
      id: uid(),
      name: h.name,
      emoji: h.emoji,
      done: false,
      streak: 0,
      lastDate: '',
      created: today(),
    }));
    if (s.habits.length === 0) {
      s.habits = HABIT_TEMPLATES.slice(0, 3).map(h => ({
        id: uid(), name: h.name, emoji: h.emoji, done: false, streak: 0, lastDate: '', created: today(),
      }));
    }
  }
  if (_wizardData.waterGoal) {
    s.water.goal = _wizardData.waterGoal;
    s.water.date = today();
    s.water.count = 0;
  }
  if (_wizardData.themeAccent !== undefined) {
    s.settings.accentIdx = _wizardData.themeAccent;
  }
  if (_wizardData.darkMode !== undefined) {
    s.settings.lightMode = !_wizardData.darkMode;
  }
  if (_wizardData.pin) {
    s.settings.pin = _wizardData.pin;
    s.settings.lockEnabled = true;
  }
  State.save();
  State.notify();
  _onboardingActive = false;
  State.addLog('Onboarding completed', '🎉', 'settings');
  return true;
}

export function setWizardData(key, value) {
  _wizardData[key] = value;
}

export function getWizardData(key) {
  return _wizardData[key];
}

export function handleStepAction(stepIndex, data) {
  const step = STEPS[stepIndex];
  if (!step) return false;
  switch (step.action) {
    case 'select_habits': {
      const selected = data?.selected || [];
      _wizardData.habits = selected;
      return true;
    }
    case 'set_water': {
      const goal = parseInt(data?.goal) || DEFAULT_WATER_GOAL;
      _wizardData.waterGoal = Math.max(1, Math.min(20, goal));
      return true;
    }
    case 'set_pin': {
      const pin = data?.pin || '';
      if (pin) _wizardData.pin = pin;
      return true;
    }
    case 'set_theme': {
      if (data?.accentIdx !== undefined) _wizardData.themeAccent = data.accentIdx;
      if (data?.darkMode !== undefined) _wizardData.darkMode = data.darkMode;
      return true;
    }
    case 'request_notifications': {
      if (data?.enabled) {
        Notifications.requestPermission().then(result => {
          if (result === 'granted') {
            const s = State.get();
            s.settings.notifications = true;
            State.save();
            State.notify();
          }
        });
      }
      return true;
    }
    case 'next':
    case 'complete':
      return true;
    default:
      return false;
  }
}

export function renderStep(index) {
  const step = getStep(index);
  if (!step) return document.createElement('div');
  const container = document.createElement('div');
  container.className = `onboarding-step onboarding-step-${step.id}`;

  const progress = ((index + 1) / STEPS.length) * 100;
  let contentHTML = '';

  if (step.id === 'welcome') {
    contentHTML = `
      <div class="onboarding-welcome">
        <div class="onboarding-icon">${step.icon}</div>
        <h1 class="onboarding-title">${escapeHtml(step.title)}</h1>
        <p class="onboarding-desc">${escapeHtml(step.description)}</p>
        <div class="onboarding-features">
          ${step.features.map(f => `<div class="onboarding-feature"><span>${f.icon}</span><span>${escapeHtml(f.text)}</span></div>`).join('')}
        </div>
      </div>
    `;
  } else if (step.id === 'habits') {
    contentHTML = `
      <div class="onboarding-habits">
        <div class="onboarding-icon">${step.icon}</div>
        <h2 class="onboarding-title">${escapeHtml(step.title)}</h2>
        <p class="onboarding-desc">${escapeHtml(step.description)}</p>
        <div class="onboarding-habit-grid">
          ${step.templates.map((t, i) => `
            <label class="onboarding-habit-item" data-index="${i}">
              <input type="checkbox" class="habit-checkbox" value="${i}" ${i < 3 ? 'checked' : ''}>
              <span class="habit-emoji">${t.emoji}</span>
              <span class="habit-name">${escapeHtml(t.name)}</span>
            </label>
          `).join('')}
        </div>
        <p class="onboarding-hint">Select at least 3 habits to get started</p>
      </div>
    `;
  } else if (step.id === 'water') {
    contentHTML = `
      <div class="onboarding-water">
        <div class="onboarding-icon">${step.icon}</div>
        <h2 class="onboarding-title">${escapeHtml(step.title)}</h2>
        <p class="onboarding-desc">${escapeHtml(step.description)}</p>
        <div class="onboarding-water-slider">
          <div class="water-goal-display">
            <span class="water-goal-value">${step.defaultValue}</span>
            <span class="water-goal-unit">glasses/day</span>
          </div>
          <input type="range" class="water-range" min="${step.min}" max="${step.max}" value="${step.defaultValue}" step="1">
          <div class="water-range-labels">
            <span>${step.min}</span>
            <span>${step.max}</span>
          </div>
        </div>
        <p class="onboarding-hint">The recommended daily intake is 8 glasses</p>
      </div>
    `;
  } else if (step.id === 'pin') {
    contentHTML = `
      <div class="onboarding-pin">
        <div class="onboarding-icon">${step.icon}</div>
        <h2 class="onboarding-title">${escapeHtml(step.title)}</h2>
        <p class="onboarding-desc">${escapeHtml(step.description)}</p>
        <div class="onboarding-pin-input">
          <input type="password" class="pin-input" placeholder="Enter PIN (4-6 digits)" maxlength="6" inputmode="numeric" pattern="[0-9]*">
          <input type="password" class="pin-confirm" placeholder="Confirm PIN" maxlength="6" inputmode="numeric" pattern="[0-9]*">
        </div>
        <label class="onboarding-skip-option">
          <input type="checkbox" class="skip-pin" checked>
          <span>Skip for now</span>
        </label>
      </div>
    `;
  } else if (step.id === 'theme') {
    contentHTML = `
      <div class="onboarding-theme">
        <div class="onboarding-icon">${step.icon}</div>
        <h2 class="onboarding-title">${escapeHtml(step.title)}</h2>
        <p class="onboarding-desc">${escapeHtml(step.description)}</p>
        <div class="onboarding-mode-toggle">
          <label class="mode-option ${window.matchMedia?.('(prefers-color-scheme: dark)').matches ? '' : 'active'}">
            <input type="radio" name="themeMode" value="light" ${!window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'checked' : ''}>
            <span>☀️ Light</span>
          </label>
          <label class="mode-option ${window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'active' : ''}">
            <input type="radio" name="themeMode" value="dark" ${window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'checked' : ''}>
            <span>🌙 Dark</span>
          </label>
        </div>
        <div class="onboarding-accent-grid">
          ${step.accents.map((a, i) => `
            <label class="onboarding-accent-item ${i === 0 ? 'selected' : ''}" data-index="${i}">
              <input type="radio" name="accent" value="${i}" ${i === 0 ? 'checked' : ''} style="display:none">
              <span class="accent-swatch" style="background:${a.c};${i === 0 ? 'border-color: var(--tp)' : ''}"></span>
              <span class="accent-label">${a.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  } else if (step.id === 'notifications') {
    contentHTML = `
      <div class="onboarding-notifications">
        <div class="onboarding-icon">${step.icon}</div>
        <h2 class="onboarding-title">${escapeHtml(step.title)}</h2>
        <p class="onboarding-desc">${escapeHtml(step.description)}</p>
        <label class="onboarding-toggle">
          <input type="checkbox" class="notif-toggle" checked>
          <span class="toggle-slider"></span>
          <span>Enable reminders</span>
        </label>
        <p class="onboarding-hint">You can change this anytime in Settings</p>
      </div>
    `;
  } else if (step.id === 'tour') {
    contentHTML = `
      <div class="onboarding-tour">
        <div class="onboarding-icon">${step.icon}</div>
        <h2 class="onboarding-title">${escapeHtml(step.title)}</h2>
        <p class="onboarding-desc">${escapeHtml(step.description)}</p>
        <div class="onboarding-tour-list">
          ${step.tourItems.map(item => `
            <div class="onboarding-tour-item">
              <span class="tour-item-icon">${item.icon}</span>
              <div class="tour-item-text">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.desc)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (step.id === 'complete') {
    contentHTML = `
      <div class="onboarding-complete">
        <div class="onboarding-icon complete">${step.icon}</div>
        <h1 class="onboarding-title">${escapeHtml(step.title)}</h1>
        <p class="onboarding-desc">${escapeHtml(step.description)}</p>
        <div class="onboarding-final-message">
          <p>💡 ${escapeHtml(step.finalMessage)}</p>
        </div>
        <button class="onboarding-start-btn">Start Tracking →</button>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="onboarding-progress-bar">
      <div class="onboarding-progress-fill" style="width:${progress}%"></div>
    </div>
    <div class="onboarding-content">${contentHTML}</div>
    <div class="onboarding-nav">
      ${index > 0 ? '<button class="onboarding-back-btn">Back</button>' : '<div></div>'}
      <div class="onboarding-step-indicator">
        ${STEPS.map((_, i) => `<span class="step-dot ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}"></span>`).join('')}
      </div>
      ${index < STEPS.length - 1 ? '<button class="onboarding-next-btn">Continue →</button>' : ''}
    </div>
  `;

  return container;
}

export function renderOnboarding() {
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:var(--bg);display:flex;align-items:center;justify-content:center;overflow-y:auto';
  const wizard = document.createElement('div');
  wizard.className = 'onboarding-wizard';
  wizard.style.cssText = 'width:100%;max-width:480px;padding:24px;margin:auto';
  const currentStep = renderStep(_currentStep);
  wizard.appendChild(currentStep);
  overlay.appendChild(wizard);
  document.body.appendChild(overlay);
  return overlay;
}

export function resetOnboarding() {
  _currentStep = 0;
  _onboardingActive = false;
  _wizardData = {};
}

export function getOnboardingProgress() {
  return {
    currentStep: _currentStep,
    totalSteps: STEPS.length,
    progress: Math.round(((_currentStep + 1) / STEPS.length) * 100),
    active: _onboardingActive,
    currentStepId: STEPS[_currentStep]?.id || null,
  };
}

export function isOnboardingActive() {
  return _onboardingActive;
}

const Onboarding = {
  isFirstLaunch,
  startOnboarding,
  getStep,
  getTotalSteps,
  getCurrentStep,
  getCurrentStepIndex,
  nextStep,
  prevStep,
  goToStep,
  skipOnboarding,
  completeOnboarding,
  setWizardData,
  getWizardData,
  handleStepAction,
  renderStep,
  renderOnboarding,
  resetOnboarding,
  getOnboardingProgress,
  isOnboardingActive,
  STEPS,
};

export default Onboarding;
