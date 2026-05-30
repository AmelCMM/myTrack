import State from '../state.js';
import { today, dateStr, escapeHtml, truncate, hapticLight, hapticSuccess, showToast, confirmDialog, promptDialog, formatTime } from '../helpers.js';

let _container = null;
let _timerInterval = null;
let _timerSeconds = 0;
let _timerRunning = false;
let _timerType = 'pomodoro';
let _timerInitialSeconds = 0;

export function renderStudy(containerId = 'app') {
  _container = document.getElementById(containerId);
  if (!_container) return;
  State.dayReset();
  _container.innerHTML = '';
  _container.appendChild(createHTML());
  attachListeners();
}

function createHTML() {
  const s = State.get();

  const sec = (title, id, content) => `
    <div class="sc" data-section="${id}">
      <div class="sct">${title}</div>
      ${content}
    </div>`;

  function computeGrade(course) {
    const assignments = s.assignments.filter(a => a.courseId === course.id);
    if (!assignments.length || assignments.every(a => a.score === null)) return null;
    const totalWeight = assignments.reduce((sum, a) => sum + a.weight, 0);
    if (totalWeight <= 0) return null;
    const weightedSum = assignments.reduce((sum, a) => {
      if (a.score === null) return sum;
      return sum + (a.score / 100) * a.weight;
    }, 0);
    return Math.round((weightedSum / totalWeight) * 100);
  }

  function gradeColor(pct) {
    if (pct === null) return 'var(--tm)';
    if (pct >= 90) return 'var(--accent)';
    if (pct >= 70) return 'var(--warn)';
    return 'var(--danger)';
  }

  const courseItems = s.courses.length === 0
    ? `<div class="empty-state">No courses yet</div>`
    : s.courses.map(c => {
        const grade = computeGrade(c);
        const gradeStr = grade !== null ? `${grade}%` : '—';
        const assignCount = s.assignments.filter(a => a.courseId === c.id).length;
        return `
          <div class="s-row">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c.colour || 'var(--accent)'};flex-shrink:0"></span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--tp)">${escapeHtml(c.name)}</div>
                <div style="font-size:11px;color:var(--ts)">
                  ${c.instructor ? escapeHtml(c.instructor) + ' · ' : ''}${c.credits} credits · ${assignCount} assignments
                </div>
              </div>
              <span style="font-size:16px;font-weight:700;color:${gradeColor(grade)}">${gradeStr}</span>
            </div>
            <button class="sm-btn sm-btn-d sm-icon" data-delete-course="${c.id}" style="font-size:11px">✕</button>
          </div>`;
      }).join('');

  const courseBlock = `
    <div style="padding:8px 0">${courseItems}</div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-add-course style="width:100%">+ Add Course</button>
    </div>`;
  const courseSec = sec('Courses', 'courses', courseBlock);

  const sortedAssignments = [...s.assignments].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const assignItems = sortedAssignments.length === 0
    ? `<div class="empty-state">No assignments</div>`
    : sortedAssignments.map(a => {
        const course = s.courses.find(c => c.id === a.courseId);
        const passed = a.score !== null && a.score >= 60;
        const isPastDue = a.dueDate && a.dueDate < today() && !a.done;
        return `
          <div class="s-row" style="${a.done ? 'opacity:0.5' : ''}">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isPastDue ? 'var(--danger)' : course ? course.colour : 'var(--tm)'};flex-shrink:0"></span>
                <span style="font-size:13px;font-weight:600;color:var(--tp);${a.done ? 'text-decoration:line-through' : ''}">${escapeHtml(a.title)}</span>
                ${a.score !== null ? `<span style="font-size:11px;font-weight:600;color:${passed ? 'var(--accent)' : 'var(--danger)'}">${a.score}%</span>` : ''}
                ${a.done ? '<span style="font-size:10px;color:var(--accent)">✓ Done</span>' : ''}
              </div>
              <div style="font-size:11px;color:var(--ts);margin-top:2px">
                ${course ? escapeHtml(course.name) + ' · ' : ''}
                Weight: ${a.weight}%
                ${a.dueDate ? ' · Due: ' + dateStr(a.dueDate) : ''}
              </div>
            </div>
            <div style="display:flex;gap:4px;align-items:center">
              ${!a.done ? `<button class="sm-btn" data-score-assign="${a.id}" style="font-size:10px">Score</button>` : ''}
              <button class="sm-btn sm-btn-d sm-icon" data-delete-assign="${a.id}" style="font-size:11px">✕</button>
            </div>
          </div>`;
      }).join('');

  const assignBlock = `
    <div style="padding:8px 0">${assignItems}</div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-add-assignment style="width:100%">+ Add Assignment</button>
    </div>`;
  const assignSec = sec('Assignments', 'assignments', assignBlock);

  const timerMins = Math.floor(_timerSeconds / 60);
  const timerSecs = _timerSeconds % 60;
  const timerDisplay = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;

  const todayFocusMin = s.focusHistory
    .filter(f => f.date === today())
    .reduce((sum, f) => sum + f.duration, 0);

  const timerBlock = `
    <div style="padding:20px 16px;text-align:center">
      <div style="font-size:48px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--tp);letter-spacing:2px;font-family:monospace" data-timer-display>${timerDisplay}</div>
      <div style="font-size:12px;color:var(--ts);margin-top:4px" data-timer-label>${_timerType === 'pomodoro' ? 'Pomodoro' : _timerType === 'deep' ? 'Deep Focus' : 'Custom'} session</div>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;padding:0 16px 12px;flex-wrap:wrap">
      <button class="sm-btn" data-timer-preset="25" style="min-width:60px">25 min</button>
      <button class="sm-btn" data-timer-preset="50" style="min-width:60px">50 min</button>
      <button class="sm-btn" data-timer-custom style="min-width:60px">Custom</button>
    </div>
    <div style="display:flex;gap:8px;justify-content:center;padding:0 16px 16px">
      ${!_timerRunning
        ? `<button class="sm-btn" data-timer-start style="min-width:80px;background:var(--accent);color:#000;font-weight:600">${_timerSeconds > 0 ? 'Resume' : 'Start'}</button>`
        : `<button class="sm-btn" data-timer-pause style="min-width:80px">Pause</button>`
      }
      <button class="sm-btn sm-btn-d" data-timer-stop style="min-width:80px">Stop</button>
    </div>
    <div style="padding:0 16px 12px;text-align:center">
      <span style="font-size:11px;color:var(--ts)">Today's focus: ${formatTime(todayFocusMin)}</span>
    </div>`;
  const timerSec = sec('Focus Timer', 'timer', timerBlock);

  const footer = `<div class="ftr">
    <span style="font-size:11px;color:var(--tm)">${s.courses.length} courses · ${s.assignments.length} assignments</span>
  </div>`;

  return createFragment(`
    <div class="scrl">
      ${courseSec}${assignSec}${timerSec}
      ${footer}
      <div style="height:80px"></div>
    </div>`);
}

function attachListeners() {
  const c = _container;

  c.querySelector('[data-add-course]')?.addEventListener('click', async () => {
    const name = await promptDialog('Course name', '');
    if (!name) return;
    const instructor = await promptDialog('Instructor (optional)', '');
    const creditsStr = await promptDialog('Credits', '3');
    const credits = parseInt(creditsStr) || 3;
    const colour = await promptDialog('Colour hex (e.g. #4d9fff)', '#4d9fff');
    State.createCourse({ name: name.trim(), instructor: (instructor || '').trim(), credits, colour: colour || '#4d9fff' });
    hapticSuccess();
    renderStudy();
  });

  c.querySelectorAll('[data-delete-course]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteCourse;
      const course = State.get().courses.find(c => c.id === id);
      const count = State.get().assignments.filter(a => a.courseId === id).length;
      const msg = count > 0
        ? `Delete "${course?.name || ''}" and its ${count} assignment(s)?`
        : `Delete "${course?.name || ''}"?`;
      const confirmed = await confirmDialog(msg);
      if (!confirmed) return;
      State.deleteCourse(id);
      hapticLight();
      renderStudy();
    });
  });

  c.querySelector('[data-add-assignment]')?.addEventListener('click', async () => {
    const courses = State.get().courses;
    if (courses.length === 0) {
      showToast('Add a course first');
      return;
    }
    const courseList = courses.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
    const courseIdxStr = await promptDialog(`Select course:\n${courseList}\n\nEnter number:`, '1');
    if (!courseIdxStr) return;
    const idx = parseInt(courseIdxStr) - 1;
    if (isNaN(idx) || idx < 0 || idx >= courses.length) { showToast('Invalid selection'); return; }
    const title = await promptDialog('Assignment title', '');
    if (!title) return;
    const dueDate = await promptDialog('Due date (YYYY-MM-DD)', '');
    const weightStr = await promptDialog('Weight (%)', '10');
    const weight = parseFloat(weightStr) || 0;
    State.createAssignment({ courseId: courses[idx].id, title: title.trim(), dueDate: dueDate || '', weight });
    hapticSuccess();
    renderStudy();
  });

  c.querySelectorAll('[data-score-assign]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.scoreAssign;
      const assign = State.get().assignments.find(a => a.id === id);
      if (!assign) return;
      const scoreStr = await promptDialog(`Score for "${assign.title}" (0-100)`, assign.score !== null ? String(assign.score) : '');
      if (scoreStr === null) return;
      const score = parseFloat(scoreStr);
      if (isNaN(score) || score < 0 || score > 100) { showToast('Score must be 0-100'); return; }
      State.updateAssignment(id, { score, done: true });
      hapticSuccess();
      renderStudy();
    });
  });

  c.querySelectorAll('[data-delete-assign]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteAssign;
      const assign = State.get().assignments.find(a => a.id === id);
      const confirmed = await confirmDialog(`Delete "${assign?.title || ''}"?`);
      if (!confirmed) return;
      State.deleteAssignment(id);
      hapticLight();
      renderStudy();
    });
  });

  c.querySelectorAll('[data-timer-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.timerPreset);
      _timerSeconds = mins * 60;
      _timerInitialSeconds = _timerSeconds;
      _timerType = mins === 25 ? 'pomodoro' : 'deep';
      _timerRunning = false;
      clearInterval(_timerInterval);
      _timerInterval = null;
      updateTimerDisplay();
    });
  });

  c.querySelector('[data-timer-custom]')?.addEventListener('click', async () => {
    const minsStr = await promptDialog('Minutes for custom timer', '10');
    if (minsStr === null) return;
    const mins = parseInt(minsStr);
    if (isNaN(mins) || mins < 1 || mins > 180) { showToast('Enter 1-180 minutes'); return; }
    _timerSeconds = mins * 60;
    _timerInitialSeconds = _timerSeconds;
    _timerType = 'custom';
    _timerRunning = false;
    clearInterval(_timerInterval);
    _timerInterval = null;
    updateTimerDisplay();
  });

  c.querySelector('[data-timer-start]')?.addEventListener('click', () => {
    if (_timerSeconds <= 0) {
      showToast('Set a timer duration first');
      return;
    }
    _timerRunning = true;
    _timerInterval = setInterval(() => {
      _timerSeconds--;
      updateTimerDisplay();
      if (_timerSeconds <= 0) {
        clearInterval(_timerInterval);
        _timerInterval = null;
        _timerRunning = false;
        const sessionMin = Math.max(1, Math.round(_timerInitialSeconds / 60));
        State.recordFocusSession(sessionMin, _timerType);
        hapticSuccess();
        showToast('Session complete!');
        renderStudy();
      }
    }, 1000);
    hapticLight();
    updateTimerDisplay();
  });

  c.querySelector('[data-timer-pause]')?.addEventListener('click', () => {
    _timerRunning = false;
    clearInterval(_timerInterval);
    _timerInterval = null;
    updateTimerDisplay();
  });

  c.querySelector('[data-timer-stop]')?.addEventListener('click', async () => {
    if (_timerRunning || _timerSeconds > 0) {
      const elapsedMin = Math.max(1, Math.round((_timerInitialSeconds - Math.max(0, _timerSeconds)) / 60));
      const confirmed = await confirmDialog(`Log ${Math.max(1, elapsedMin)} min session?`);
      if (confirmed && elapsedMin > 0) {
        State.recordFocusSession(Math.max(1, elapsedMin), _timerType);
        hapticSuccess();
        showToast('Session logged');
      }
    }
    _timerRunning = false;
    clearInterval(_timerInterval);
    _timerInterval = null;
    _timerSeconds = 0;
    _timerInitialSeconds = 0;
    updateTimerDisplay();
    renderStudy();
  });
}

function updateTimerDisplay() {
  const c = _container;
  if (!c) return;
  const el = c.querySelector('[data-timer-display]');
  if (!el) return;
  const mins = Math.floor(Math.max(0, _timerSeconds) / 60);
  const secs = Math.max(0, _timerSeconds) % 60;
  el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const labelEl = c.querySelector('[data-timer-label]');
  if (labelEl) {
    labelEl.textContent = _timerType === 'pomodoro' ? 'Pomodoro' : _timerType === 'deep' ? 'Deep Focus' : 'Custom';
  }
}

function createFragment(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content;
}
