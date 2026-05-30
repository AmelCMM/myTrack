import State from '../state.js';
import { PRIORITY_LEVELS } from '../constants.js';
import { today, dateStr, escapeHtml, truncate, hapticLight, hapticSuccess, showToast, confirmDialog, promptDialog } from '../helpers.js';

let _container = null;

export function renderProjects(containerId = 'app') {
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

  const projectItems = s.projects.length === 0
    ? `<div class="empty-state">No projects yet</div>`
    : s.projects.map(p => {
        const tasks = s.tasks.filter(t => t.projectId === p.id);
        const doneCount = tasks.filter(t => t.done).length;
        const totalCount = tasks.length;
        const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        return `
          <div class="s-row">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.colour || 'var(--accent)'};flex-shrink:0"></span>
                <span style="font-size:13px;font-weight:600;color:var(--tp)">${escapeHtml(p.name)}</span>
                <span style="font-size:11px;color:var(--ts)">${doneCount}/${totalCount}</span>
              </div>
              <div style="margin-top:6px;height:5px;background:var(--s3);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${p.colour || 'var(--accent)'};border-radius:3px;transition:width .3s"></div>
              </div>
            </div>
            <button class="sm-btn sm-btn-d sm-icon" data-delete-project="${p.id}" style="font-size:11px;margin-left:10px">✕</button>
          </div>`;
      }).join('');

  const projectBlock = `
    <div style="padding:8px 0">${projectItems}</div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-add-project style="width:100%">+ Add Project</button>
    </div>`;
  const projectSec = sec('Projects', 'projects', projectBlock);

  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedTasks = [...s.tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return b.id.localeCompare(a.id);
  });

  function priorityStyle(pri) {
    const map = { low: 'var(--tm)', normal: 'var(--ts)', high: 'var(--warn)', urgent: 'var(--danger)' };
    return map[pri] || 'var(--ts)';
  }

  function priorityLabel(pri) {
    const p = PRIORITY_LEVELS.find(l => l.id === pri);
    return p ? p.label : pri;
  }

  const taskItems = sortedTasks.length === 0
    ? `<div class="empty-state">No tasks</div>`
    : sortedTasks.map(t => {
        const project = s.projects.find(p => p.id === t.projectId);
        const isOverdue = t.due && t.due < today() && !t.done;
        return `
          <div class="s-row" style="${t.done ? 'opacity:0.45' : ''}">
            <label class="chk" style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;min-width:0">
              <input type="checkbox" ${t.done ? 'checked' : ''} data-toggle-task="${t.id}" style="accent-color:var(--accent)">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <span style="font-size:13px;color:var(--tp);${t.done ? 'text-decoration:line-through' : ''}">${escapeHtml(t.title)}</span>
                  <span style="font-size:10px;font-weight:600;color:${priorityStyle(t.priority)};background:var(--s3);padding:1px 6px;border-radius:3px">${priorityLabel(t.priority)}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap">
                  ${project ? `<span style="font-size:10px;color:${project.colour || 'var(--accent)'};background:${project.colour || 'var(--accent)'}1f;padding:1px 6px;border-radius:3px">${escapeHtml(project.name)}</span>` : ''}
                  ${t.due ? `<span style="font-size:10px;color:${isOverdue ? 'var(--danger)' : 'var(--tm)'}">${isOverdue ? 'Overdue: ' : ''}${dateStr(t.due)}</span>` : ''}
                </div>
              </div>
            </label>
            <button class="sm-btn sm-btn-d sm-icon" data-delete-task="${t.id}" style="font-size:11px;flex-shrink:0">✕</button>
          </div>`;
      }).join('');

  const taskBlock = `
    <div style="padding:8px 0">${taskItems}</div>
    <div style="padding:0 16px 12px">
      <button class="sm-btn" data-add-task style="width:100%">+ Add Task</button>
    </div>`;
  const taskSec = sec('Tasks', 'tasks', taskBlock);

  const quickAddBar = `
    <div class="sc">
      <div class="sct">Quick Add Task</div>
      <div style="display:flex;gap:8px;padding:10px 16px 14px">
        <input id="quick-task-input" placeholder="Task title..." style="flex:1;background:var(--s2);border:0.5px solid var(--bmd);border-radius:var(--rsm);padding:9px 12px;font-size:13px;color:var(--tp);outline:none;font-family:var(--font)" autocomplete="off">
        <button class="sm-btn" data-quick-add-task style="background:var(--accent);color:#000;font-weight:600">Add</button>
      </div>
    </div>`;

  const footer = `<div class="ftr">
    <span style="font-size:11px;color:var(--tm)">${s.projects.length} projects · ${s.tasks.filter(t => !t.done).length} pending tasks</span>
  </div>`;

  return createFragment(`
    <div class="scrl">
      ${quickAddBar}
      ${projectSec}${taskSec}
      ${footer}
      <div style="height:80px"></div>
    </div>`);
}

function attachListeners() {
  const c = _container;

  const quickInput = c.querySelector('#quick-task-input');
  c.querySelector('[data-quick-add-task]')?.addEventListener('click', () => {
    if (!quickInput) return;
    const title = quickInput.value.trim();
    if (!title) { showToast('Enter a task title'); return; }
    State.createTask({ title });
    hapticSuccess();
    quickInput.value = '';
    renderProjects();
  });
  quickInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      c.querySelector('[data-quick-add-task]')?.click();
    }
  });

  c.querySelector('[data-add-project]')?.addEventListener('click', async () => {
    const name = await promptDialog('Project name', '');
    if (!name) return;
    const colour = await promptDialog('Colour hex (e.g. #00e5a0)', '#00e5a0');
    State.createProject({ name: name.trim(), colour: colour || '#00e5a0' });
    hapticSuccess();
    renderProjects();
  });

  c.querySelectorAll('[data-delete-project]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteProject;
      const project = State.get().projects.find(p => p.id === id);
      const taskCount = State.get().tasks.filter(t => t.projectId === id).length;
      const msg = taskCount > 0
        ? `Delete "${project?.name || ''}" and its ${taskCount} task(s)?`
        : `Delete "${project?.name || ''}"?`;
      const confirmed = await confirmDialog(msg);
      if (!confirmed) return;
      State.deleteProject(id);
      hapticLight();
      renderProjects();
    });
  });

  c.querySelectorAll('[data-toggle-task]').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = chk.dataset.toggleTask;
      State.updateTask(id, { done: chk.checked });
      hapticLight();
      renderProjects();
    });
  });

  c.querySelector('[data-add-task]')?.addEventListener('click', async () => {
    const title = await promptDialog('Task title', '');
    if (!title) return;
    const priority = await promptDialog('Priority (low/normal/high/urgent)', 'normal');
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const pri = validPriorities.includes(priority?.toLowerCase()) ? priority.toLowerCase() : 'normal';
    const due = await promptDialog('Due date (YYYY-MM-DD, optional)', '');

    const projects = State.get().projects;
    let projectId = null;
    if (projects.length > 0) {
      const list = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
      const sel = await promptDialog(`Assign to project (optional):\n${list}\n\nEnter number or leave blank`, '');
      if (sel) {
        const idx = parseInt(sel) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < projects.length) {
          projectId = projects[idx].id;
        }
      }
    }

    State.createTask({ title: title.trim(), priority: pri, due: due || '', projectId });
    hapticSuccess();
    renderProjects();
  });

  c.querySelectorAll('[data-delete-task]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteTask;
      const task = State.get().tasks.find(t => t.id === id);
      const confirmed = await confirmDialog(`Delete "${task?.title || ''}"?`);
      if (!confirmed) return;
      State.deleteTask(id);
      hapticLight();
      renderProjects();
    });
  });
}

function createFragment(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content;
}
