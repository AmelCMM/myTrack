/* ═══════════════════════════════════════════════════════════════════
   All Form Sheets for myTrack
   Each method creates a form sheet overlay, wires handlers, cleans up
   ═══════════════════════════════════════════════════════════════════ */

import State from './state.js';
import Bridge from './bridge.js';
import { uid, today, escapeHtml } from './helpers.js';
import {
  MOODS, EXERCISE_TYPES, MEAL_TYPES, FINANCE_CATEGORIES,
  SEVERITY_LEVELS, CHALLENGE_DIFFICULTY, PRIORITY_LEVELS,
} from './constants.js';

let _sheetState = {};

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  let err = el.parentElement.querySelector('.error');
  if (!err) {
    err = document.createElement('div');
    err.className = 'error';
    el.parentElement.appendChild(err);
  }
  err.textContent = msg;
}

function clearErrors(container) {
  container.querySelectorAll('.error').forEach((e) => e.remove());
}

const Sheets = (() => {
  function openSheet(html) {
    const content = document.getElementById('sht-content');
    const sov = document.getElementById('sov');
    if (content) content.innerHTML = html;
    if (sov) sov.classList.add('on');
    _sheetState = {};
  }

  function closeSheet() {
    const sov = document.getElementById('sov');
    if (sov) sov.classList.remove('on');
    _sheetState = {};
  }

  function html(strings, ...values) {
    return strings.reduce((acc, str, i) => {
      const v = values[i] != null ? values[i] : '';
      return acc + str + escapeHtml(String(v));
    }, '');
  }

  function formField(label, id, type, placeholder, extra) {
    const baseType = type || 'text';
    let input = '';
    if (baseType === 'textarea') {
      input = `<textarea id="${id}" placeholder="${escapeHtml(placeholder || '')}" ${extra || ''}></textarea>`;
    } else if (baseType === 'select') {
      input = `<select id="${id}" ${extra || ''}>${placeholder || ''}</select>`;
    } else if (baseType === 'number' || baseType === 'date' || baseType === 'time' || baseType === 'email' || baseType === 'password' || baseType === 'tel') {
      input = `<input type="${baseType}" id="${id}" placeholder="${escapeHtml(placeholder || '')}" ${extra || ''}>`;
    } else {
      input = `<input type="text" id="${id}" placeholder="${escapeHtml(placeholder || '')}" ${extra || ''}>`;
    }
    return `<div class="form-field"><label>${escapeHtml(label)}</label>${input}</div>`;
  }

  /* ── Quick Log ───────────────────────────────────────────────── */
  function quickLog() {
    openSheet(`
      <div class="shtt">Quick Log</div>
      <div class="qlg">
        <div class="qlb" data-action="vital">
          <div class="qlic" style="background:rgba(255,77,106,.12)">❤️</div>
          <div><div class="qlt">Vital</div><div class="qls">HR, temp, O2</div></div>
        </div>
        <div class="qlb" data-action="journal">
          <div class="qlic" style="background:rgba(0,229,160,.12)">✍️</div>
          <div><div class="qlt">Journal</div><div class="qls">Write entry</div></div>
        </div>
        <div class="qlb" data-action="mood">
          <div class="qlic" style="background:rgba(245,166,35,.12)">😊</div>
          <div><div class="qlt">Mood</div><div class="qls">Check in</div></div>
        </div>
        <div class="qlb" data-action="water">
          <div class="qlic" style="background:rgba(77,159,255,.12)">💧</div>
          <div><div class="qlt">Water</div><div class="qls">+1 glass</div></div>
        </div>
        <div class="qlb" data-action="exercise">
          <div class="qlic" style="background:rgba(0,229,160,.12)">🏃</div>
          <div><div class="qlt">Exercise</div><div class="qls">Log workout</div></div>
        </div>
        <div class="qlb" data-action="symptom">
          <div class="qlic" style="background:rgba(245,166,35,.12)">🩺</div>
          <div><div class="qlt">Symptom</div><div class="qls">Check symptom</div></div>
        </div>
        <div class="qlb" data-action="meal">
          <div class="qlic" style="background:rgba(255,77,106,.12)">🍽️</div>
          <div><div class="qlt">Meal</div><div class="qls">Log food</div></div>
        </div>
        <div class="qlb" data-action="task">
          <div class="qlic" style="background:rgba(170,100,255,.12)">✅</div>
          <div><div class="qlt">Task</div><div class="qls">Quick add</div></div>
        </div>
        <div class="qlb" data-action="medication">
          <div class="qlic" style="background:rgba(77,159,255,.12)">💊</div>
          <div><div class="qlt">Medication</div><div class="qls">Log taken</div></div>
        </div>
        <div class="qlb" data-action="sleep">
          <div class="qlic" style="background:rgba(170,100,255,.12)">🌙</div>
          <div><div class="qlt">Sleep</div><div class="qls">Log sleep</div></div>
        </div>
      </div>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;
    content.querySelectorAll('.qlb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const mapping = {
          vital: 'vital',
          journal: 'journal',
          mood: 'wellbeingCheck',
          water: 'water',
          exercise: 'exercise',
          symptom: 'symptom',
          meal: 'meal',
          task: 'task',
          medication: 'medication',
          sleep: 'sleep',
        };
        const sheetFn = mapping[action];
        if (sheetFn && typeof Sheets[sheetFn] === 'function') {
          Sheets[sheetFn]();
        }
      });
    });
  }

  /* ── Habit ───────────────────────────────────────────────────── */
  function habit() {
    openSheet(`
      <div class="shtt">New Habit</div>
      ${formField('Name', 'h-name', 'text', 'e.g. Meditate, Read, Exercise')}
      <div class="form-field"><label>Emoji</label><div style="display:flex;gap:6px;flex-wrap:wrap" id="h-emoji-picker">
        ${['🧘', '💧', '📚', '🏃', '🌿', '✍️', '🤸', '🚶', '🙏', '🌅', '🎯', '💪', '🧠', '🎨', '🎵', '☕'].map(e => `<span class="mem" data-emoji="${e}" style="font-size:22px;padding:4px 6px;cursor:pointer">${e}</span>`).join('')}
      </div><input id="h-emoji" placeholder="⭐" maxlength="2" style="margin-top:4px;background:var(--s2);border:.5px solid var(--bmd);border-radius:var(--rsm);padding:6px 10px;font-size:13px;color:var(--tp);outline:none;width:60px;text-align:center"></div>
      ${formField('Remind at (optional)', 'h-remind', 'time', '')}
      <button class="form-submit" id="h-submit">Add Habit</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    content.querySelectorAll('#h-emoji-picker .mem').forEach((el) => {
      el.addEventListener('click', () => {
        content.querySelectorAll('#h-emoji-picker .mem').forEach((m) => m.classList.remove('sel'));
        el.classList.add('sel');
        document.getElementById('h-emoji').value = el.dataset.emoji;
      });
    });

    document.getElementById('h-submit').addEventListener('click', () => {
      const name = getVal('h-name').trim();
      const emoji = getVal('h-emoji').trim() || '⭐';
      if (!name) {
        showError('h-name', 'Name is required');
        Bridge.Haptics.warning();
        return;
      }
      if (name.length > 50) {
        showError('h-name', 'Name too long (max 50)');
        Bridge.Haptics.warning();
        return;
      }
      State.createHabit({ name, emoji });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Vital ───────────────────────────────────────────────────── */
  function vital() {
    const vitalTypes = [
      { label: 'Heart Rate', unit: 'bpm' },
      { label: 'Blood Pressure', unit: 'mmHg' },
      { label: 'Temperature', unit: '°C' },
      { label: 'Blood Oxygen', unit: '%' },
      { label: 'Weight', unit: 'kg' },
      { label: 'Glucose', unit: 'mg/dL' },
      { label: 'Respiratory Rate', unit: 'breaths/min' },
      { label: 'Waist Circumference', unit: 'cm' },
      { label: 'BMI', unit: '' },
      { label: 'Cholesterol', unit: 'mg/dL' },
    ];
    const options = vitalTypes.map(v => `<option value="${v.label}" data-unit="${v.unit}">${v.label}</option>`).join('');

    openSheet(`
      <div class="shtt">Log Vital</div>
      <div class="form-field"><label>Type</label><select id="v-type">${options}</select></div>
      <div class="form-field"><label>Value</label><input type="number" id="v-value" placeholder="72" step="any" inputmode="decimal"></div>
      <div class="form-field"><label>Unit</label><input id="v-unit" placeholder="bpm"></div>
      <div class="form-field"><label>Note (optional)</label><input id="v-note" placeholder="After exercise, fasting, etc."></div>
      <button class="form-submit" id="v-submit">Log Vital</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    document.getElementById('v-type').addEventListener('change', () => {
      const sel = document.getElementById('v-type');
      const opt = sel.options[sel.selectedIndex];
      const unit = opt ? opt.dataset.unit : '';
      if (unit) setVal('v-unit', unit);
    });

    document.getElementById('v-submit').addEventListener('click', () => {
      const type = getVal('v-type');
      const value = getVal('v-value');
      const unit = getVal('v-unit');
      const note = getVal('v-note');
      if (!value || isNaN(parseFloat(value))) {
        showError('v-value', 'Valid value required');
        Bridge.Haptics.warning();
        return;
      }
      State.createVital({ type, value: parseFloat(value), unit, note });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Symptom ─────────────────────────────────────────────────── */
  function symptom() {
    const sevOptions = SEVERITY_LEVELS.map(s =>
      `<option value="${s.value}">${s.label} (${s.value}/10)</option>`
    ).join('');

    openSheet(`
      <div class="shtt">Log Symptom</div>
      ${formField('Description', 's-desc', 'text', 'e.g. Headache, fatigue, nausea')}
      <div class="form-field"><label>Severity</label><select id="s-sev">${sevOptions}</select></div>
      ${formField('Duration (optional)', 's-dur', 'text', 'e.g. 2 hours, ongoing')}
      ${formField('Note (optional)', 's-note', 'text', 'Any additional context')}
      <button class="form-submit" id="s-submit">Log Symptom</button>
    `);

    document.getElementById('s-submit')?.addEventListener('click', () => {
      const desc = getVal('s-desc').trim();
      const severity = parseInt(getVal('s-sev')) || 5;
      if (!desc) {
        showError('s-desc', 'Description required');
        Bridge.Haptics.warning();
        return;
      }
      State.createSymptom({ description: desc, severity });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Medication ──────────────────────────────────────────────── */
  function medication() {
    openSheet(`
      <div class="shtt">Add Medication</div>
      ${formField('Medication name', 'm-name', 'text', 'e.g. Vitamin D, Metformin')}
      ${formField('Dosage', 'm-dose', 'text', 'e.g. 1000 IU, 500 mg')}
      <div class="form-field"><label>Frequency</label><select id="m-freq">
        <option value="Daily">Daily</option>
        <option value="Twice daily">Twice daily</option>
        <option value="Three times daily">Three times daily</option>
        <option value="Weekly">Weekly</option>
        <option value="As needed">As needed</option>
        <option value="Every other day">Every other day</option>
        <option value="Monthly">Monthly</option>
      </select></div>
      ${formField('Time taken (optional)', 'm-time', 'time', '')}
      ${formField('Notes (optional)', 'm-notes', 'text', 'Food interaction, side effects')}
      <button class="form-submit" id="m-submit">Add Medication</button>
    `);

    document.getElementById('m-submit')?.addEventListener('click', () => {
      const name = getVal('m-name').trim();
      const dosage = getVal('m-dose').trim();
      const frequency = getVal('m-freq');
      if (!name) {
        showError('m-name', 'Medication name required');
        Bridge.Haptics.warning();
        return;
      }
      State.createMedication({ name, dosage, frequency });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Course ──────────────────────────────────────────────────── */
  function course() {
    openSheet(`
      <div class="shtt">Add Course</div>
      ${formField('Course name', 'c-name', 'text', 'e.g. Data Structures')}
      ${formField('Instructor', 'c-inst', 'text', 'Prof. Smith')}
      ${formField('Credits', 'c-cred', 'number', '3')}
      ${formField('Location (optional)', 'c-loc', 'text', 'Room 301, Online')}
      ${formField('Schedule (optional)', 'c-sched', 'text', 'Mon/Wed 10:00')}
      <button class="form-submit" id="c-submit">Add Course</button>
    `);

    document.getElementById('c-submit')?.addEventListener('click', () => {
      const name = getVal('c-name').trim();
      if (!name) {
        showError('c-name', 'Course name required');
        Bridge.Haptics.warning();
        return;
      }
      State.createCourse({
        name,
        instructor: getVal('c-inst'),
        credits: parseInt(getVal('c-cred')) || 3,
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Assignment ──────────────────────────────────────────────── */
  function assignment() {
    const courses = State.get().courses;
    const opts = courses.length
      ? courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')
      : '<option value="">No courses — add one first</option>';

    openSheet(`
      <div class="shtt">Add Assignment</div>
      <div class="form-field"><label>Course</label><select id="a-course">${opts}</select></div>
      ${formField('Assignment title', 'a-title', 'text', 'e.g. Problem Set 3')}
      ${formField('Due date', 'a-due', 'date', '', `value="${today()}"`)}
      ${formField('Weight (%)', 'a-weight', 'number', '10')}
      ${formField('Description (optional)', 'a-desc', 'textarea', 'Details about the assignment')}
      <button class="form-submit" id="a-submit">Add Assignment</button>
    `);

    document.getElementById('a-submit')?.addEventListener('click', () => {
      const title = getVal('a-title').trim();
      if (!title) {
        showError('a-title', 'Title required');
        Bridge.Haptics.warning();
        return;
      }
      const courseId = getVal('a-course');
      if (!courseId) {
        showError('a-course', 'Select a course');
        Bridge.Haptics.warning();
        return;
      }
      State.createAssignment({
        courseId,
        title,
        dueDate: getVal('a-due'),
        weight: parseFloat(getVal('a-weight')) || 0,
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Project ─────────────────────────────────────────────────── */
  function project() {
    const colors = ['#00e5a0', '#4d9fff', '#ff6b9d', '#f5c842', '#b599ff', '#ff7f6b', '#4cd9b0', '#ff9a56'];
    const colorSwatches = colors.map(c =>
      `<span class="mem" data-color="${c}" style="width:24px;height:24px;border-radius:50%;background:${c};display:inline-block;cursor:pointer;border:2px solid transparent"></span>`
    ).join('');

    openSheet(`
      <div class="shtt">New Project</div>
      ${formField('Project name', 'p-name', 'text', 'e.g. Website Redesign')}
      <div class="form-field"><label>Colour</label><div style="display:flex;gap:6px;flex-wrap:wrap" id="p-colors">${colorSwatches}</div><input type="hidden" id="p-color" value="#00e5a0"></div>
      ${formField('Description (optional)', 'p-desc', 'textarea', 'Project overview')}
      <button class="form-submit" id="p-submit">Create Project</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    content.querySelectorAll('#p-colors .mem').forEach((el) => {
      el.addEventListener('click', () => {
        content.querySelectorAll('#p-colors .mem').forEach((m) => m.style.borderColor = 'transparent');
        el.style.borderColor = 'var(--accent)';
        setVal('p-color', el.dataset.color);
      });
    });

    document.getElementById('p-submit')?.addEventListener('click', () => {
      const name = getVal('p-name').trim();
      if (!name) {
        showError('p-name', 'Project name required');
        Bridge.Haptics.warning();
        return;
      }
      State.createProject({ name, colour: getVal('p-color') });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Task ────────────────────────────────────────────────────── */
  function task() {
    const projects = State.get().projects;
    const projOpts = projects.length
      ? projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')
      : '<option value="">No projects</option>';

    const priOpts = PRIORITY_LEVELS.map(p =>
      `<option value="${p.id}">${p.label}</option>`
    ).join('');

    openSheet(`
      <div class="shtt">Add Task</div>
      <div class="form-field"><label>Project</label><select id="t-project">${projOpts}</select></div>
      ${formField('Task title', 't-title', 'text', 'e.g. Write unit tests')}
      ${formField('Due date (optional)', 't-due', 'date', '')}
      <div class="form-field"><label>Priority</label><select id="t-priority">${priOpts}</select></div>
      ${formField('Notes (optional)', 't-notes', 'textarea', 'Additional details')}
      <button class="form-submit" id="t-submit">Add Task</button>
    `);

    document.getElementById('t-submit')?.addEventListener('click', () => {
      const title = getVal('t-title').trim();
      if (!title) {
        showError('t-title', 'Task title required');
        Bridge.Haptics.warning();
        return;
      }
      State.createTask({
        projectId: getVal('t-project') || null,
        title,
        due: getVal('t-due'),
        priority: getVal('t-priority'),
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Account ─────────────────────────────────────────────────── */
  function account() {
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];
    const curOpts = currencies.map(c => `<option value="${c}" ${c === 'USD' ? 'selected' : ''}>${c}</option>`).join('');

    openSheet(`
      <div class="shtt">Add Account</div>
      ${formField('Account name', 'a-name', 'text', 'e.g. Checking, Savings, Cash')}
      ${formField('Opening balance', 'a-balance', 'number', '0', 'step="0.01"')}
      <div class="form-field"><label>Currency</label><select id="a-currency">${curOpts}</select></div>
      ${formField('Account type (optional)', 'a-type', 'text', 'Checking, Savings, Credit Card')}
      ${formField('Notes (optional)', 'a-notes', 'text', 'Bank name, account number')}
      <button class="form-submit" id="a-submit">Add Account</button>
    `);

    document.getElementById('a-submit')?.addEventListener('click', () => {
      const name = getVal('a-name').trim();
      if (!name) {
        showError('a-name', 'Account name required');
        Bridge.Haptics.warning();
        return;
      }
      State.createAccount({
        name,
        balance: parseFloat(getVal('a-balance')) || 0,
        currency: getVal('a-currency'),
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Transaction ─────────────────────────────────────────────── */
  function transaction() {
    const accounts = State.get().accounts;
    const acOpts = accounts.length
      ? accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${a.currency} ${a.balance.toFixed(2)})</option>`).join('')
      : '<option value="">Add an account first</option>';

    const catOpts = FINANCE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');

    openSheet(`
      <div class="shtt">Log Transaction</div>
      <div class="form-field"><label>Account</label><select id="tx-account">${acOpts}</select></div>
      <div class="form-field"><label>Type</label><div style="display:flex;gap:8px">
        <label class="radio-option" style="padding:6px 10px;flex:1;justify-content:center;border:.5px solid var(--border);border-radius:var(--rsm);cursor:pointer" data-tx-type="expense">
          <span class="radio-dot" style="width:14px;height:14px"><span class="radio-dot" style="width:6px;height:6px;background:var(--danger);opacity:1"></span></span>
          <span style="font-size:13px;color:var(--tp)">Expense</span>
        </label>
        <label class="radio-option" style="padding:6px 10px;flex:1;justify-content:center;border:.5px solid var(--border);border-radius:var(--rsm);cursor:pointer" data-tx-type="income">
          <span class="radio-dot" style="width:14px;height:14px"><span class="radio-dot" style="width:6px;height:6px;background:var(--accent);opacity:0"></span></span>
          <span style="font-size:13px;color:var(--tp)">Income</span>
        </label>
      </div><input type="hidden" id="tx-type" value="expense"></div>
      ${formField('Amount', 'tx-amount', 'number', '0', 'step="0.01"')}
      <div class="form-field"><label>Category</label><select id="tx-category">${catOpts}</select></div>
      ${formField('Note (optional)', 'tx-note', 'text', 'What was this for?')}
      ${formField('Date', 'tx-date', 'date', '', `value="${today()}"`)}
      <button class="form-submit" id="tx-submit">Log Transaction</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    const typeRadios = content.querySelectorAll('[data-tx-type]');
    typeRadios.forEach((r) => {
      r.addEventListener('click', () => {
        typeRadios.forEach((rr) => {
          rr.style.borderColor = 'var(--border)';
          rr.querySelector('.radio-dot > .radio-dot').style.opacity = '0';
        });
        r.style.borderColor = 'var(--accent)';
        r.querySelector('.radio-dot > .radio-dot').style.opacity = '1';
        setVal('tx-type', r.dataset.txType);
      });
    });
    typeRadios[0].style.borderColor = 'var(--accent)';
    typeRadios[0].querySelector('.radio-dot > .radio-dot').style.opacity = '1';

    document.getElementById('tx-submit')?.addEventListener('click', () => {
      const accountId = getVal('tx-account');
      if (!accountId) {
        showError('tx-account', 'Select an account');
        Bridge.Haptics.warning();
        return;
      }
      const amount = parseFloat(getVal('tx-amount'));
      if (isNaN(amount) || amount <= 0) {
        showError('tx-amount', 'Valid amount required');
        Bridge.Haptics.warning();
        return;
      }
      State.createTransaction({
        accountId,
        amount,
        category: getVal('tx-category'),
        note: getVal('tx-note'),
        type: getVal('tx-type'),
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Journal ─────────────────────────────────────────────────── */
  function journal() {
    const moodOpts = MOODS.map(m =>
      `<span class="mem" data-emoji="${m.emoji}" style="font-size:28px;padding:5px 7px;cursor:pointer">${m.emoji}</span>`
    ).join('');

    openSheet(`
      <div class="shtt">Journal Entry</div>
      ${formField('What happened today?', 'j-text', 'textarea', 'Write your thoughts, feelings, and experiences…', 'rows="6"')}
      <div class="form-field"><label>Mood (optional)</label><div class="mgrid" style="justify-content:flex-start" id="j-moods">${moodOpts}</div>
      <input type="hidden" id="j-mood" value=""></div>
      ${formField('Tags (comma separated, optional)', 'j-tags', 'text', 'grateful, anxious, productive')}
      <button class="form-submit" id="j-submit">Save Entry</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    content.querySelectorAll('#j-moods .mem').forEach((el) => {
      el.addEventListener('click', () => {
        content.querySelectorAll('#j-moods .mem').forEach((m) => m.classList.remove('sel'));
        el.classList.add('sel');
        setVal('j-mood', el.dataset.emoji);
      });
    });

    document.getElementById('j-submit')?.addEventListener('click', () => {
      const text = getVal('j-text').trim();
      if (!text) {
        showError('j-text', 'Entry text required');
        Bridge.Haptics.warning();
        return;
      }
      if (text.length < 3) {
        showError('j-text', 'Entry too short');
        Bridge.Haptics.warning();
        return;
      }
      const mood = getVal('j-mood');
      const tags = getVal('j-tags').split(',').map(t => t.trim()).filter(Boolean);
      State.createJournalEntry({ text, mood, tags });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Gratitude ───────────────────────────────────────────────── */
  function gratitude() {
    openSheet(`
      <div class="shtt">Gratitude</div>
      ${formField("I'm grateful for…", 'g-text', 'textarea', 'Today I appreciated…', 'rows="3"')}
      ${formField('Category (optional)', 'g-cat', 'text', 'people, health, growth, nature')}
      <button class="form-submit" id="g-submit">Save Gratitude</button>
    `);

    document.getElementById('g-submit')?.addEventListener('click', () => {
      const text = getVal('g-text').trim();
      if (!text) {
        showError('g-text', 'Write something you are grateful for');
        Bridge.Haptics.warning();
        return;
      }
      State.createGratitude({ text });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Water ───────────────────────────────────────────────────── */
  function water() {
    const goal = State.get().water.goal || 8;

    openSheet(`
      <div class="shtt">Water Goal</div>
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:48px;margin-bottom:8px">💧</div>
        <div style="font-size:13px;color:var(--ts);margin-bottom:12px">How many glasses per day?</div>
      </div>
      ${formField('Daily glasses goal', 'w-goal', 'number', '8', `min="1" max="30" value="${goal}"`)}
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <span class="tbtn" data-w="4" style="flex:1;text-align:center">4</span>
        <span class="tbtn" data-w="6" style="flex:1;text-align:center">6</span>
        <span class="tbtn" data-w="8" style="flex:1;text-align:center">8</span>
        <span class="tbtn" data-w="10" style="flex:1;text-align:center">10</span>
        <span class="tbtn" data-w="12" style="flex:1;text-align:center">12</span>
      </div>
      <button class="form-submit" id="w-submit">Set Goal</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    content.querySelectorAll('[data-w]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setVal('w-goal', btn.dataset.w);
      });
    });

    document.getElementById('w-submit')?.addEventListener('click', () => {
      const goal = parseInt(getVal('w-goal'));
      if (isNaN(goal) || goal < 1) {
        showError('w-goal', 'Minimum 1 glass');
        Bridge.Haptics.warning();
        return;
      }
      State.setWaterGoal(goal);
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Sleep ───────────────────────────────────────────────────── */
  function sleep() {
    openSheet(`
      <div class="shtt">Log Sleep</div>
      <div class="form-field"><label>Hours slept</label>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="tbtn" data-s-h="4" style="flex:1;text-align:center">4</span>
          <span class="tbtn" data-s-h="5" style="flex:1;text-align:center">5</span>
          <span class="tbtn" data-s-h="6" style="flex:1;text-align:center">6</span>
          <span class="tbtn" data-s-h="7" style="flex:1;text-align:center">7</span>
          <span class="tbtn" data-s-h="8" style="flex:1;text-align:center">8</span>
          <span class="tbtn" data-s-h="9" style="flex:1;text-align:center">9</span>
        </div>
      </div>
      <input type="hidden" id="s-hours" value="7">
      <div class="form-field"><label>Quality (1–10)</label>
        <div style="display:flex;gap:4px;flex-wrap:wrap" id="s-quality-picker">
          ${Array.from({ length: 10 }, (_, i) =>
            `<span class="mem" data-s-q="${i + 1}" style="font-size:14px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;padding:0">${i + 1}</span>`
          ).join('')}
        </div>
      </div>
      <input type="hidden" id="s-quality" value="7">
      ${formField('Bedtime', 's-bed', 'time', '23:00')}
      ${formField('Wake time', 's-wake', 'time', '07:00')}
      ${formField('Notes (optional)', 's-notes', 'text', 'Dreams, interruptions, etc.')}
      <button class="form-submit" id="s-submit">Log Sleep</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    content.querySelectorAll('[data-s-h]').forEach((btn) => {
      btn.addEventListener('click', () => {
        content.querySelectorAll('[data-s-h]').forEach((b) => b.style.borderColor = 'var(--bmd)');
        btn.style.borderColor = 'var(--accent)';
        setVal('s-hours', btn.dataset.sH);
      });
    });

    content.querySelectorAll('#s-quality-picker .mem').forEach((el) => {
      el.addEventListener('click', () => {
        content.querySelectorAll('#s-quality-picker .mem').forEach((m) => m.classList.remove('sel'));
        el.classList.add('sel');
        setVal('s-quality', el.dataset.sQ);
      });
    });

    document.getElementById('s-submit')?.addEventListener('click', () => {
      const hours = parseFloat(getVal('s-hours'));
      const quality = parseInt(getVal('s-quality')) || 7;
      const bedtime = getVal('s-bed');
      const wake = getVal('s-wake');
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        showError('s-hours', 'Valid hours required (0-24)');
        Bridge.Haptics.warning();
        return;
      }
      State.logSleep(hours, quality, bedtime, wake);
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Exercise ────────────────────────────────────────────────── */
  function exercise() {
    const typeOpts = EXERCISE_TYPES.map(e =>
      `<div class="qlb" data-ex-type="${e.id}" style="cursor:pointer">
        <div class="qlic" style="background:var(--adim)">${e.emoji}</div>
        <div><div class="qlt">${e.label}</div><div class="qls">~${e.calPerMin} cal/min</div></div>
      </div>`
    ).join('');

    openSheet(`
      <div class="shtt">Log Exercise</div>
      <div class="form-field"><label>Type</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" id="ex-types">${typeOpts}</div>
      <input type="hidden" id="ex-type" value="running"></div>
      ${formField('Duration (minutes)', 'ex-dur', 'number', '30', 'min="1" max="600"')}
      <div class="form-field"><label>Intensity</label><select id="ex-intensity">
        <option value="light">Light</option>
        <option value="moderate" selected>Moderate</option>
        <option value="vigorous">Vigorous</option>
      </select></div>
      ${formField('Calories (optional)', 'ex-cal', 'number', '', 'step="1"')}
      ${formField('Note (optional)', 'ex-note', 'text', 'How did it feel?')}
      <button class="form-submit" id="ex-submit">Log Exercise</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    content.querySelectorAll('[data-ex-type]').forEach((el) => {
      el.addEventListener('click', () => {
        content.querySelectorAll('[data-ex-type]').forEach((e) => e.style.borderColor = 'var(--border)');
        el.style.borderColor = 'var(--accent)';
        setVal('ex-type', el.dataset.exType);
      });
    });

    document.getElementById('ex-submit')?.addEventListener('click', () => {
      const type = getVal('ex-type');
      const durationMin = parseInt(getVal('ex-dur'));
      if (isNaN(durationMin) || durationMin < 1) {
        showError('ex-dur', 'Valid duration required (min 1)');
        Bridge.Haptics.warning();
        return;
      }
      State.logExercise({
        type,
        durationMin,
        intensity: getVal('ex-intensity'),
        note: getVal('ex-note'),
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Meal ────────────────────────────────────────────────────── */
  function meal() {
    const mealOpts = MEAL_TYPES.map(m =>
      `<option value="${m.id}">${m.emoji} ${m.label}</option>`
    ).join('');

    openSheet(`
      <div class="shtt">Log Meal</div>
      <div class="form-field"><label>Meal type</label><select id="ml-type">${mealOpts}</select></div>
      ${formField('Description', 'ml-desc', 'text', 'What did you eat?', 'placeholder="Oatmeal with berries"')}
      ${formField('Calories', 'ml-cal', 'number', '0', 'step="1" min="0"')}
      ${formField('Protein (g, optional)', 'ml-protein', 'number', '', 'step="0.1" min="0"')}
      ${formField('Carbs (g, optional)', 'ml-carbs', 'number', '', 'step="0.1" min="0"')}
      ${formField('Fat (g, optional)', 'ml-fat', 'number', '', 'step="0.1" min="0"')}
      ${formField('Note (optional)', 'ml-note', 'text', 'Ingredients, portion size')}
      <button class="form-submit" id="ml-submit">Log Meal</button>
    `);

    document.getElementById('ml-submit')?.addEventListener('click', () => {
      const desc = getVal('ml-desc').trim();
      const calories = parseInt(getVal('ml-cal')) || 0;
      if (!desc) {
        showError('ml-desc', 'Description required');
        Bridge.Haptics.warning();
        return;
      }
      if (calories < 0) {
        showError('ml-cal', 'Calories cannot be negative');
        Bridge.Haptics.warning();
        return;
      }
      State.logMeal({
        type: getVal('ml-type'),
        description: desc,
        calories,
        protein: getVal('ml-protein'),
        carbs: getVal('ml-carbs'),
        fat: getVal('ml-fat'),
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Goal ────────────────────────────────────────────────────── */
  function goal() {
    openSheet(`
      <div class="shtt">Set Goal</div>
      ${formField('Goal title', 'g-title', 'text', 'e.g. Read 12 books this year')}
      ${formField('Description (optional)', 'g-desc', 'textarea', 'Why this goal matters to you')}
      ${formField('Target date', 'g-date', 'date', '', `value="${today()}"`)}
      <div class="form-field"><label>Category</label><select id="g-cat">
        <option value="health">Health</option>
        <option value="fitness">Fitness</option>
        <option value="learning">Learning</option>
        <option value="career">Career</option>
        <option value="finance">Finance</option>
        <option value="social">Social</option>
        <option value="creative">Creative</option>
        <option value="travel">Travel</option>
        <option value="mindfulness">Mindfulness</option>
        <option value="other">Other</option>
      </select></div>
      ${formField('Target value', 'g-target', 'number', '100', 'step="1" min="1"')}
      ${formField('Unit', 'g-unit', 'text', 'books, kg, days, $')}
      <button class="form-submit" id="g-submit">Set Goal</button>
    `);

    document.getElementById('g-submit')?.addEventListener('click', () => {
      const title = getVal('g-title').trim();
      if (!title) {
        showError('g-title', 'Goal title required');
        Bridge.Haptics.warning();
        return;
      }
      const targetValue = parseFloat(getVal('g-target'));
      if (isNaN(targetValue) || targetValue <= 0) {
        showError('g-target', 'Valid target value required');
        Bridge.Haptics.warning();
        return;
      }
      State.createGoal({
        title,
        description: getVal('g-desc'),
        targetDate: getVal('g-date'),
        category: getVal('g-cat'),
        targetValue,
        unit: getVal('g-unit'),
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Challenge ───────────────────────────────────────────────── */
  function challenge() {
    const diffOpts = CHALLENGE_DIFFICULTY.map(d =>
      `<option value="${d.id}">${d.label} (${d.days} days, ${d.xp} XP)</option>`
    ).join('');

    openSheet(`
      <div class="shtt">Start Challenge</div>
      ${formField('Challenge name', 'ch-title', 'text', 'e.g. 30 Days of Yoga')}
      <div class="form-field"><label>Difficulty</label><select id="ch-diff">${diffOpts}</select></div>
      ${formField('Description (optional)', 'ch-desc', 'textarea', 'What does this challenge involve?')}
      ${formField('Start date', 'ch-start', 'date', '', `value="${today()}"`)}
      <button class="form-submit" id="ch-submit">Start Challenge</button>
    `);

    document.getElementById('ch-submit')?.addEventListener('click', () => {
      const title = getVal('ch-title').trim();
      if (!title) {
        showError('ch-title', 'Challenge name required');
        Bridge.Haptics.warning();
        return;
      }
      State.createChallenge(title, getVal('ch-diff'));
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Reading ─────────────────────────────────────────────────── */
  function reading() {
    openSheet(`
      <div class="shtt">Add Reading</div>
      ${formField('Book title', 'r-title', 'text', 'e.g. Atomic Habits')}
      ${formField('Author', 'r-author', 'text', 'James Clear')}
      ${formField('Pages', 'r-pages', 'number', '0', 'min="0"')}
      <div class="form-field"><label>Status</label><select id="r-status">
        <option value="want_to_read">Want to Read</option>
        <option value="reading">Currently Reading</option>
        <option value="finished">Finished</option>
        <option value="dnf">Did Not Finish</option>
      </select></div>
      ${formField('Genre (optional)', 'r-genre', 'text', 'self-help, fiction, science')}
      ${formField('Notes (optional)', 'r-notes', 'textarea', 'Why this book?')}
      <button class="form-submit" id="r-submit">Add Book</button>
    `);

    document.getElementById('r-submit')?.addEventListener('click', () => {
      const title = getVal('r-title').trim();
      if (!title) {
        showError('r-title', 'Book title required');
        Bridge.Haptics.warning();
        return;
      }
      State.addReadingItem({
        title,
        author: getVal('r-author'),
        pages: getVal('r-pages'),
        status: getVal('r-status'),
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Reminder ────────────────────────────────────────────────── */
  function reminder() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayCheckboxes = days.map((d, i) =>
      `<label class="checkbox-wrap" style="display:inline-flex;margin-right:6px">
        <span class="checkbox-box checked" data-rem-day="${i}" style="width:16px;height:16px;background:var(--accent);border-color:var(--accent);border-radius:3px">
          <svg viewBox="0 0 12 12" style="width:8px;height:8px"><polyline points="2 6 5 9 10 3" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span style="font-size:11px;color:var(--tp)">${d}</span>
      </label>`
    ).join('');

    openSheet(`
      <div class="shtt">Create Reminder</div>
      ${formField('Reminder title', 'rem-title', 'text', 'e.g. Take vitamins')}
      ${formField('Time', 'rem-time', 'time', '08:00')}
      <div class="form-field"><label>Repeat on</label><div style="display:flex;flex-wrap:wrap;gap:2px" id="rem-days">${dayCheckboxes}</div>
      <input type="hidden" id="rem-days-val" value="0,1,2,3,4,5,6"></div>
      <button class="form-submit" id="rem-submit">Create Reminder</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    function updateRemDays() {
      const active = [];
      content.querySelectorAll('[data-rem-day]').forEach((box) => {
        if (box.classList.contains('checked')) active.push(box.dataset.remDay);
      });
      setVal('rem-days-val', active.join(','));
    }

    content.querySelectorAll('[data-rem-day]').forEach((box) => {
      box.addEventListener('click', () => {
        box.classList.toggle('checked');
        const isChecked = box.classList.contains('checked');
        box.style.background = isChecked ? 'var(--accent)' : 'transparent';
        box.style.borderColor = isChecked ? 'var(--accent)' : 'var(--bmd)';
        updateRemDays();
      });
    });

    document.getElementById('rem-submit')?.addEventListener('click', () => {
      const title = getVal('rem-title').trim();
      if (!title) {
        showError('rem-title', 'Title required');
        Bridge.Haptics.warning();
        return;
      }
      const daysStr = getVal('rem-days-val');
      const days = daysStr ? daysStr.split(',').map(Number) : [1, 2, 3, 4, 5];
      State.createReminder({
        title,
        time: getVal('rem-time') || '08:00',
        days,
      });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Custom Field ────────────────────────────────────────────── */
  function customField() {
    openSheet(`
      <div class="shtt">Add Custom Field</div>
      ${formField('Field name', 'cf-name', 'text', 'e.g. Caffeine intake')}
      <div class="form-field"><label>Field type</label><select id="cf-type">
        <option value="number">Number</option>
        <option value="text">Text</option>
        <option value="boolean">Yes/No</option>
        <option value="rating">Rating (1-5)</option>
        <option value="time">Time</option>
      </select></div>
      ${formField('Unit (for numbers, optional)', 'cf-unit', 'text', 'mg, cups, hours')}
      ${formField('Description (optional)', 'cf-desc', 'text', 'What does this track?')}
      <button class="form-submit" id="cf-submit">Add Field</button>
    `);

    document.getElementById('cf-submit')?.addEventListener('click', () => {
      const name = getVal('cf-name').trim();
      if (!name) {
        showError('cf-name', 'Field name required');
        Bridge.Haptics.warning();
        return;
      }
      const s = State.get();
      const fields = s.customFields || [];
      if (fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
        showError('cf-name', 'Field already exists');
        Bridge.Haptics.warning();
        return;
      }
      fields.push({
        id: uid(),
        name,
        type: getVal('cf-type'),
        unit: getVal('cf-unit'),
        description: getVal('cf-desc'),
      });
      s.customFields = fields;
      State.save();
      State.notify();
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Wellbeing Check ─────────────────────────────────────────── */
  function wellbeingCheck() {
    openSheet(`
      <div class="shtt">Wellbeing Check-in</div>
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:32px;margin-bottom:4px">🧠</div>
        <div style="font-size:13px;color:var(--ts)">How are you doing right now?</div>
      </div>
      <div class="form-field"><label>Energy (1–10)</label>
        <div style="display:flex;gap:4px" id="wb-energy">
          ${Array.from({ length: 10 }, (_, i) =>
            `<span class="mem" data-wb-e="${i + 1}" style="font-size:13px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;padding:0;border-radius:50%">${i + 1}</span>`
          ).join('')}
        </div>
      </div>
      <div class="form-field"><label>Stress (1–10)</label>
        <div style="display:flex;gap:4px" id="wb-stress">
          ${Array.from({ length: 10 }, (_, i) =>
            `<span class="mem" data-wb-s="${i + 1}" style="font-size:13px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;padding:0;border-radius:50%">${i + 1}</span>`
          ).join('')}
        </div>
      </div>
      <div class="form-field"><label>Mood</label><div class="mgrid" style="justify-content:flex-start" id="wb-mood">
        ${MOODS.map(m => `<span class="mem" data-wb-m="${m.emoji}" style="font-size:24px;padding:4px;cursor:pointer">${m.emoji}</span>`).join('')}
      </div></div>
      ${formField('Notes (optional)', 'wb-notes', 'textarea', 'What is on your mind?', 'rows="2"')}
      <button class="form-submit" id="wb-submit">Save Check-in</button>
    `);

    const content = document.getElementById('sht-content');
    if (!content) return;

    ['#wb-energy', '#wb-stress', '#wb-mood'].forEach((sel) => {
      content.querySelectorAll(`${sel} .mem`).forEach((el) => {
        el.addEventListener('click', () => {
          content.querySelectorAll(`${sel} .mem`).forEach((m) => m.classList.remove('sel'));
          el.classList.add('sel');
        });
      });
    });

    document.getElementById('wb-submit')?.addEventListener('click', () => {
      const energyEl = content.querySelector('#wb-energy .mem.sel');
      const stressEl = content.querySelector('#wb-stress .mem.sel');
      const moodEl = content.querySelector('#wb-mood .mem.sel');

      const energy = energyEl ? parseInt(energyEl.dataset.wbE) : 5;
      const stress = stressEl ? parseInt(energyEl ? stressEl.dataset.wbS : '5') : 5;
      const mood = moodEl ? moodEl.dataset.wbM : '';

      const s = State.get();
      const checks = s.wellbeingChecks || [];
      checks.push({
        id: uid(),
        date: today(),
        time: new Date().toISOString(),
        energy,
        stress,
        mood,
        notes: getVal('wb-notes'),
      });
      s.wellbeingChecks = checks;
      State.save();
      State.notify();
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Set PIN ─────────────────────────────────────────────────── */
  function setPin() {
    const currentPin = State.get().settings.pin || '';

    openSheet(`
      <div class="shtt">Encryption PIN</div>
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:36px;margin-bottom:6px">🔐</div>
        <div style="font-size:12px;color:var(--ts);margin-bottom:2px">AES-256-GCM encryption</div>
        <div style="font-size:11px;color:var(--tm)">Set a 4–6 digit PIN to encrypt all data</div>
      </div>
      ${formField(currentPin ? 'New PIN (leave blank to disable)' : 'Set PIN', 'pin-code', 'password', 'Enter PIN', 'maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="off"')}
      ${formField('Confirm PIN', 'pin-confirm', 'password', 'Re-enter PIN', 'maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="off"')}
      <button class="form-submit" id="pin-submit">${currentPin ? 'Update PIN' : 'Set PIN'}</button>
      ${currentPin ? '<button class="form-submit secondary" id="pin-remove" style="margin-top:6px">Remove PIN</button>' : ''}
    `);

    const pinInput = document.getElementById('pin-code');
    const confirmInput = document.getElementById('pin-confirm');
    if (pinInput) pinInput.focus();

    document.getElementById('pin-submit')?.addEventListener('click', async () => {
      const pin = getVal('pin-code');
      const confirm = getVal('pin-confirm');
      if (!pin) {
        showError('pin-code', 'PIN is required');
        Bridge.Haptics.warning();
        return;
      }
      if (pin.length < 4) {
        showError('pin-code', 'PIN must be at least 4 digits');
        Bridge.Haptics.warning();
        return;
      }
      if (!/^\d+$/.test(pin)) {
        showError('pin-code', 'PIN must be digits only');
        Bridge.Haptics.warning();
        return;
      }
      if (pin !== confirm) {
        showError('pin-confirm', 'PINs do not match');
        Bridge.Haptics.warning();
        return;
      }
      const { updateSettings } = State;
      updateSettings({ pin, lockEnabled: true });
      Bridge.Haptics.success();
      closeSheet();
    });

    document.getElementById('pin-remove')?.addEventListener('click', async () => {
      const { updateSettings } = State;
      updateSettings({ pin: '', lockEnabled: false });
      Bridge.Haptics.success();
      closeSheet();
    });
  }

  /* ── Filter Logs ─────────────────────────────────────────────── */
  function filterLogs() {
    openSheet(`
      <div class="shtt">Filter & Sort Logs</div>
      <div class="form-field"><label>Filter by type</label><select id="fl-type">
        <option value="all">All types</option>
        <option value="habit">Habits</option>
        <option value="mood">Mood</option>
        <option value="water">Water</option>
        <option value="vital">Vitals</option>
        <option value="symptom">Symptoms</option>
        <option value="medication">Medications</option>
        <option value="study">Study</option>
        <option value="task">Tasks</option>
        <option value="finance">Finance</option>
        <option value="journal">Journal</option>
        <option value="health">Health</option>
        <option value="nutrition">Nutrition</option>
        <option value="achievement">Achievements</option>
      </select></div>
      <div class="form-field"><label>Sort by</label><select id="fl-sort">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select></div>
      <div class="form-field"><label>Date range</label><select id="fl-date">
        <option value="all">All time</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
        <option value="3months">Last 3 months</option>
      </select></div>
      <button class="form-submit" id="fl-apply">Apply Filters</button>
    `);

    const content = document.getElementById('sht-content');
    document.getElementById('fl-apply')?.addEventListener('click', () => {
      const filters = {
        type: getVal('fl-type'),
        sort: getVal('fl-sort'),
        dateRange: getVal('fl-date'),
      };
      _sheetState._logFilters = filters;
      Bridge.Haptics.tick();
      closeSheet();
    });
  }

  /* ── Share Report ────────────────────────────────────────────── */
  function shareReport() {
    const stats = State.getStats();
    const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const reportText = [
      `📊 myTrack Report — ${dateStr}`,
      '',
      `⭐ Balance Score: ${State.computeBalanceScore()}/100`,
      `🎯 Habits done: ${stats.habitsDone}`,
      `🔥 Best streak: ${stats.bestStreak} days`,
      `📝 Journal entries: ${stats.journalCount}`,
      `⏱️ Total focus: ${stats.totalFocus} min`,
      `🏆 Level ${stats.level} — ${stats.totalXP} XP`,
      `🎖️ Achievements: ${stats.achievementsUnlocked}`,
      '',
      'Built by Neura Lumina · myTrack',
      'All data stored locally · AES-GCM encrypted',
    ].join('\n');

    openSheet(`
      <div class="shtt">Share Report</div>
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:36px;margin-bottom:8px">📊</div>
      </div>
      <div class="form-field"><label>Report preview</label>
        <textarea readonly style="background:var(--s3);font-family:var(--mono);font-size:11px;line-height:1.6;resize:none;min-height:160px">${escapeHtml(reportText)}</textarea>
      </div>
      <div style="display:flex;gap:8px">
        <button class="form-submit" id="sr-copy" style="flex:1">Copy to Clipboard</button>
        <button class="form-submit" id="sr-share" style="flex:1">Share</button>
      </div>
      <button class="form-submit secondary" id="sr-close" style="margin-top:6px">Close</button>
    `);

    document.getElementById('sr-copy')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(reportText);
        Bridge.Haptics.success();
        closeSheet();
      } catch {
        Bridge.Haptics.warning();
      }
    });

    document.getElementById('sr-share')?.addEventListener('click', async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: 'myTrack Report', text: reportText });
        } else {
          await navigator.clipboard.writeText(reportText);
        }
        Bridge.Haptics.success();
        closeSheet();
      } catch {
        Bridge.Haptics.warning();
      }
    });

    document.getElementById('sr-close')?.addEventListener('click', closeSheet);
  }

  return {
    openSheet,
    closeSheet,
    quickLog,
    habit,
    vital,
    symptom,
    medication,
    course,
    assignment,
    project,
    task,
    account,
    transaction,
    journal,
    gratitude,
    water,
    sleep,
    exercise,
    meal,
    goal,
    challenge,
    reading,
    reminder,
    customField,
    wellbeingCheck,
    setPin,
    filterLogs,
    shareReport,
  };
})();

export default Sheets;
