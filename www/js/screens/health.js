import State from '../state.js';
import { MEAL_TYPES, EXERCISE_TYPES, SEVERITY_LEVELS, DEFAULT_CALORIE_GOAL, DEFAULT_SLEEP_GOAL, DEFAULT_STEPS_GOAL } from '../constants.js';
import { today, dateStr, escapeHtml, truncate, hapticLight, hapticSuccess, showToast, confirmDialog, promptDialog, timeSince, formatTime } from '../helpers.js';

let _container = null;

export function renderHealth(containerId = 'app') {
  _container = document.getElementById(containerId);
  if (!_container) return;
  State.dayReset();
  _container.innerHTML = '';
  _container.appendChild(createHTML());
  attachListeners();
}

function createHTML() {
  const s = State.get();
  const todayDate = today();

  const sleep = s.sleep.date === todayDate ? s.sleep : { hours: 0, quality: 0, bedtime: '', wake: '' };
  const steps = s.steps.date === todayDate ? s.steps : { count: 0, goal: DEFAULT_STEPS_GOAL };
  const nutrit = s.nutrition.date === todayDate ? s.nutrition : { meals: [], calories: 0, goal: DEFAULT_CALORIE_GOAL };
  const exercises = s.exercise.filter(e => e.date === todayDate);

  const sec = (title, id, content) => `
    <div class="sc" data-section="${id}">
      <div class="sct">${title}</div>
      ${content}
    </div>`;

  const sleepBlock = `
    <div class="s-row">
      <span>Sleep Hours</span>
      <span style="font-size:15px;font-weight:600;color:var(--tp)">${sleep.hours}h</span>
    </div>
    <div class="s-row" style="border-top:none;padding-top:0">
      <span>Sleep Quality</span>
      <span style="font-size:15px;color:var(--tp)">${sleep.quality}/10</span>
    </div>
    <div style="padding:8px 16px 12px">
      <button class="sm-btn" data-log-sleep style="width:100%">${sleep.hours > 0 ? 'Update Sleep' : 'Log Sleep'}</button>
    </div>`;

  const stepBlock = `
    <div class="s-row">
      <span>Steps</span>
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px;font-weight:700;color:var(--tp)">${steps.count.toLocaleString()}</span>
        <span style="font-size:12px;color:var(--ts)">/ ${steps.goal.toLocaleString()}</span>
      </div>
    </div>
    <div style="padding:0 16px 12px">
      <div style="height:6px;background:var(--s3);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${Math.min(100, (steps.count / steps.goal) * 100)}%;background:var(--accent);border-radius:4px;transition:width .3s"></div>
      </div>
    </div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-log-steps style="width:100%">Set Steps</button>
    </div>`;

  const exerciseItems = exercises.length === 0
    ? `<div style="padding:16px;text-align:center;color:var(--tm);font-size:13px">No exercise logged today</div>`
    : exercises.map(ex => {
        const exType = EXERCISE_TYPES.find(t => t.id === ex.type);
        return `
          <div class="s-row">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
              <span>${exType ? exType.emoji : '🏃'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;color:var(--tp)">${escapeHtml(exType ? exType.label : ex.type)}</div>
                <div style="font-size:11px;color:var(--ts)">${ex.durationMin}min · ${ex.intensity} ${ex.note ? '· ' + escapeHtml(truncate(ex.note, 30)) : ''}</div>
              </div>
            </div>
            <button class="sm-btn sm-btn-d sm-icon" data-delete-exercise="${ex.id}" style="font-size:11px">✕</button>
          </div>`;
      }).join('');

  const exerciseBlock = `
    <div style="padding:8px 0 4px;border-top:0.5px solid var(--border)">
      <div style="padding:4px 16px 8px;font-size:12px;font-weight:600;color:var(--ts)">Today's Exercise</div>
      ${exerciseItems}
    </div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-add-exercise style="width:100%">+ Log Exercise</button>
    </div>`;

  const overviewContent = `${sleepBlock}${stepBlock}${exerciseBlock}`;
  const overviewSec = sec('Health Overview', 'overview', overviewContent);

  const vitalItems = s.vitals.length === 0
    ? `<div class="empty-state">No vitals logged yet</div>`
    : s.vitals.map(v => `
      <div class="s-row">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--tp)">${escapeHtml(v.type)}</div>
          <div style="font-size:12px;color:var(--ts)">
            <strong>${escapeHtml(v.value)}</strong> ${escapeHtml(v.unit)}
            ${v.note ? '· ' + escapeHtml(truncate(v.note, 30)) : ''}
          </div>
          <div style="font-size:10px;color:var(--tm);margin-top:2px">${dateStr(v.date)}</div>
        </div>
        <button class="sm-btn sm-btn-d sm-icon" data-delete-vital="${v.id}" style="font-size:11px">✕</button>
      </div>`).join('');

  const vitalBlock = `
    <div style="padding:8px 0">${vitalItems}</div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-add-vital style="width:100%">+ Add Vital</button>
    </div>`;
  const vitalSec = sec('Vitals', 'vitals', vitalBlock);

  const symptomItems = s.symptoms.length === 0
    ? `<div class="empty-state">No symptoms logged</div>`
    : s.symptoms.map(sym => {
        const sev = SEVERITY_LEVELS.slice().sort((a, b) => a.value - b.value);
        const sevColor = sym.severity >= 7 ? 'var(--danger)' : sym.severity >= 5 ? 'var(--warn)' : 'var(--accent)';
        return `
          <div class="s-row">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--tp)">${escapeHtml(sym.description)}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
                <span style="font-size:10px;color:var(--ts)">Severity:</span>
                <div style="flex:1;max-width:100px;height:6px;background:var(--s3);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${(sym.severity / 10) * 100}%;background:${sevColor};border-radius:3px"></div>
                </div>
                <span style="font-size:11px;color:${sevColor};font-weight:600">${sym.severity}/10</span>
              </div>
              <div style="font-size:10px;color:var(--tm);margin-top:2px">${dateStr(sym.date)}</div>
            </div>
            <button class="sm-btn sm-btn-d sm-icon" data-delete-symptom="${sym.id}" style="font-size:11px">✕</button>
          </div>`;
      }).join('');

  const symptomBlock = `
    <div style="padding:8px 0">${symptomItems}</div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-add-symptom style="width:100%">+ Add Symptom</button>
    </div>`;
  const symptomSec = sec('Symptoms', 'symptoms', symptomBlock);

  const medItems = s.medications.length === 0
    ? `<div class="empty-state">No medications</div>`
    : s.medications.map(m => `
      <div class="s-row">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--tp)">${escapeHtml(m.name)}</div>
          <div style="font-size:12px;color:var(--ts)">
            ${m.dosage} · ${m.frequency}
            ${m.lastTaken ? '· Last: ' + timeSince(m.lastTaken) : '· Not taken yet'}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="sm-btn" data-take-med="${m.id}" style="font-size:11px">Take</button>
          <button class="sm-btn sm-btn-d sm-icon" data-delete-med="${m.id}" style="font-size:11px">✕</button>
        </div>
      </div>`).join('');

  const medBlock = `
    <div style="padding:8px 0">${medItems}</div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-add-medication style="width:100%">+ Add Medication</button>
    </div>`;
  const medSec = sec('Medications', 'medications', medBlock);

  const mealItems = nutrit.meals.length === 0
    ? `<div class="empty-state">No meals logged today</div>`
    : nutrit.meals.map(m => {
        const mt = MEAL_TYPES.find(t => t.id === m.type);
        return `
          <div class="s-row">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
              <span>${mt ? mt.emoji : '🍽️'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;color:var(--tp)">${escapeHtml(m.description)}</div>
                <div style="font-size:11px;color:var(--ts)">${mt ? mt.label : m.type}</div>
              </div>
            </div>
            <span style="font-size:14px;font-weight:600;color:var(--tp)">${m.calories}</span>
          </div>`;
      }).join('');

  const calPct = nutrit.goal > 0 ? Math.min(100, (nutrit.calories / nutrit.goal) * 100) : 0;
  const calGoalLabel = nutrit.goal > 0 ? `/ ${nutrit.goal}` : '';

  const nutritBlock = `
    <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:24px;font-weight:700;color:var(--tp)">${nutrit.calories}</div>
        <div style="font-size:11px;color:var(--ts)">calories${calGoalLabel}</div>
      </div>
      <div style="width:56px;height:56px;position:relative">
        <svg viewBox="0 0 36 36" width="56" height="56">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--s3)" stroke-width="3"/>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="${calPct}, 100" stroke-linecap="round"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--tp)">${Math.round(calPct)}%</div>
      </div>
    </div>
    <div style="padding:0 16px">${mealItems}</div>
    <div style="padding:8px 16px 12px">
      <button class="sm-btn" data-add-meal style="width:100%">+ Add Meal</button>
    </div>`;
  const nutritSec = sec('Nutrition', 'nutrition', nutritBlock);

  const footer = `<div class="ftr">
    <span style="font-size:11px;color:var(--tm)">${s.vitals.length} vitals · ${s.symptoms.length} symptoms · ${s.medications.length} meds</span>
  </div>`;

  return createFragment(`
    <div class="scrl">
      ${overviewSec}${vitalSec}${symptomSec}${medSec}${nutritSec}
      ${footer}
      <div style="height:80px"></div>
    </div>`);
}

function attachListeners() {
  const c = _container;

  c.querySelector('[data-log-sleep]')?.addEventListener('click', async () => {
    const s = State.get();
    const current = s.sleep.date === today() ? s.sleep : { hours: 0, quality: 5 };
    const hoursStr = await promptDialog('Sleep hours (e.g. 7.5)', String(current.hours));
    if (hoursStr === null) return;
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours < 0 || hours > 24) { showToast('Invalid hours'); return; }
    const qualStr = await promptDialog('Quality (1-10)', String(current.quality || 5));
    if (qualStr === null) return;
    const quality = parseInt(qualStr);
    if (isNaN(quality) || quality < 1 || quality > 10) { showToast('Quality must be 1-10'); return; }
    const bedtime = await promptDialog('Bedtime (e.g. 23:00)', current.bedtime || '');
    const wake = await promptDialog('Wake time (e.g. 07:00)', current.wake || '');
    State.logSleep(hours, quality, bedtime || '', wake || '');
    hapticSuccess();
    renderHealth();
  });

  c.querySelector('[data-log-steps]')?.addEventListener('click', async () => {
    const current = State.get().steps.count || 0;
    const str = await promptDialog('Steps today', String(current));
    if (str === null) return;
    const count = parseInt(str);
    if (isNaN(count) || count < 0) { showToast('Invalid step count'); return; }
    State.logSteps(count);
    hapticSuccess();
    renderHealth();
  });

  c.querySelector('[data-add-exercise]')?.addEventListener('click', async () => {
    const typeLabels = EXERCISE_TYPES.map(t => `${t.emoji} ${t.label}`).join('\n');
    const typeStr = await promptDialog(`Exercise type:\n${typeLabels}\n\nEnter ID:`, 'running');
    if (!typeStr) return;
    const type = typeStr.trim().toLowerCase();
    if (!EXERCISE_TYPES.find(t => t.id === type)) { showToast('Invalid type'); return; }
    const durationStr = await promptDialog('Duration (minutes)', '30');
    if (durationStr === null) return;
    const durationMin = parseInt(durationStr);
    if (isNaN(durationMin) || durationMin <= 0) { showToast('Invalid duration'); return; }
    const intensity = await promptDialog('Intensity (light/moderate/vigorous)', 'moderate');
    const note = await promptDialog('Note (optional)', '');
    State.logExercise({ type, durationMin, intensity: intensity || 'moderate', note: note || '' });
    hapticSuccess();
    renderHealth();
  });

  c.querySelectorAll('[data-delete-exercise]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteExercise;
      const confirmed = await confirmDialog('Delete this exercise?');
      if (!confirmed) return;
      const s = State.get();
      s.exercise = s.exercise.filter(e => e.id !== id);
      State.save();
      State.notify();
      hapticLight();
      renderHealth();
    });
  });

  c.querySelector('[data-add-vital]')?.addEventListener('click', async () => {
    const type = await promptDialog('Vital type (e.g. Heart Rate, Blood Pressure, Glucose)', '');
    if (!type) return;
    const value = await promptDialog('Value', '');
    if (value === null || value === '') return;
    const unit = await promptDialog('Unit (e.g. bpm, mmHg, mg/dL)', '');
    const note = await promptDialog('Note (optional)', '');
    State.createVital({ type: type.trim(), value, unit: unit || '', note: note || '' });
    hapticSuccess();
    renderHealth();
  });

  c.querySelectorAll('[data-delete-vital]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteVital;
      const confirmed = await confirmDialog('Delete this vital?');
      if (!confirmed) return;
      State.deleteVital(id);
      hapticLight();
      renderHealth();
    });
  });

  c.querySelector('[data-add-symptom]')?.addEventListener('click', async () => {
    const desc = await promptDialog('Symptom description', '');
    if (!desc) return;
    const sevStr = await promptDialog('Severity (1-10)', '5');
    if (sevStr === null) return;
    const sev = parseInt(sevStr);
    if (isNaN(sev) || sev < 1 || sev > 10) { showToast('Severity must be 1-10'); return; }
    State.createSymptom({ description: desc.trim(), severity: sev });
    hapticSuccess();
    renderHealth();
  });

  c.querySelectorAll('[data-delete-symptom]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteSymptom;
      const confirmed = await confirmDialog('Delete this symptom?');
      if (!confirmed) return;
      State.deleteSymptom(id);
      hapticLight();
      renderHealth();
    });
  });

  c.querySelector('[data-add-medication]')?.addEventListener('click', async () => {
    const name = await promptDialog('Medication name', '');
    if (!name) return;
    const dosage = await promptDialog('Dosage (e.g. 10mg, 1 tablet)', '');
    if (!dosage) return;
    const freq = await promptDialog('Frequency (Daily, Twice daily, Weekly, etc.)', 'Daily');
    State.createMedication({ name: name.trim(), dosage: dosage.trim(), frequency: (freq || 'Daily').trim() });
    hapticSuccess();
    renderHealth();
  });

  c.querySelectorAll('[data-take-med]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.markMedicationTaken(btn.dataset.takeMed);
      hapticSuccess();
      showToast('Logged as taken');
      renderHealth();
    });
  });

  c.querySelectorAll('[data-delete-med]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteMed;
      const confirmed = await confirmDialog('Delete this medication?');
      if (!confirmed) return;
      State.deleteMedication(id);
      hapticLight();
      renderHealth();
    });
  });

  c.querySelector('[data-add-meal]')?.addEventListener('click', async () => {
    const typeLabels = MEAL_TYPES.map(t => `${t.emoji} ${t.label}`).join('\n');
    const typeStr = await promptDialog(`Meal type:\n${typeLabels}\n\nEnter ID:`, 'lunch');
    if (!typeStr) return;
    const type = typeStr.trim().toLowerCase();
    if (!MEAL_TYPES.find(t => t.id === type)) { showToast('Invalid meal type'); return; }
    const desc = await promptDialog('Description', '');
    if (!desc) return;
    const calStr = await promptDialog('Calories', '');
    if (calStr === null) return;
    const calories = parseInt(calStr);
    if (isNaN(calories) || calories <= 0) { showToast('Invalid calories'); return; }
    State.logMeal({ type, description: desc.trim(), calories });
    hapticSuccess();
    renderHealth();
  });
}

function createFragment(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content;
}
