/* ═══════════════════════════════════════════════════════════════════
   Reusable UI Components for myTrack
   Each factory returns a DOM element with proper classes
   ═══════════════════════════════════════════════════════════════════ */

import { escapeHtml } from './helpers.js';

const Components = (() => {
  function createCard(title, content, actionLabel, actionFn) {
    const card = document.createElement('div');
    card.className = 'card';

    if (title) {
      const ch = document.createElement('div');
      ch.className = 'ch';
      const ct = document.createElement('span');
      ct.className = 'ct';
      ct.textContent = title;
      ch.appendChild(ct);

      if (actionLabel) {
        const ca = document.createElement('span');
        ca.className = 'ca';
        ca.textContent = actionLabel;
        if (typeof actionFn === 'function') {
          ca.addEventListener('click', (e) => {
            e.stopPropagation();
            actionFn();
          });
        }
        ch.appendChild(ca);
      }
      card.appendChild(ch);
    }

    if (typeof content === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = content;
      card.appendChild(wrapper);
    } else if (content instanceof Node) {
      card.appendChild(content);
    }

    return card;
  }

  function createListItem(icon, title, subtitle, value, onClick) {
    const li = document.createElement('div');
    li.className = 'li';

    if (icon) {
      const lic = document.createElement('div');
      lic.className = 'lic';
      if (icon.startsWith('<svg') || icon.startsWith('<')) {
        lic.innerHTML = icon;
      } else {
        lic.textContent = icon;
      }
      li.appendChild(lic);
    }

    const info = document.createElement('div');
    info.className = 'linfo';
    if (title) {
      const tit = document.createElement('div');
      tit.className = 'ltit';
      tit.textContent = title;
      info.appendChild(tit);
    }
    if (subtitle) {
      const sub = document.createElement('div');
      sub.className = 'lsub';
      sub.textContent = subtitle;
      info.appendChild(sub);
    }
    li.appendChild(info);

    if (value !== undefined && value !== null) {
      const val = document.createElement('span');
      val.className = 'lval';
      val.textContent = value;
      li.appendChild(val);
    }

    if (typeof onClick === 'function') {
      li.addEventListener('click', onClick);
      li.style.cursor = 'pointer';
    }

    return li;
  }

  function createDomainRow(icon, name, subtitle, value, deleteFn) {
    const dri = document.createElement('div');
    dri.className = 'dri';

    const left = document.createElement('div');
    left.className = 'dri-l';

    if (icon) {
      const ic = document.createElement('div');
      ic.className = 'dri-ic';
      if (icon.startsWith('<svg') || icon.startsWith('<')) {
        ic.innerHTML = icon;
      } else {
        ic.textContent = icon;
      }
      left.appendChild(ic);
    }

    const infoWrap = document.createElement('div');
    const nm = document.createElement('div');
    nm.className = 'dri-name';
    nm.textContent = name || '';
    infoWrap.appendChild(nm);
    if (subtitle) {
      const sub = document.createElement('div');
      sub.className = 'dri-sub';
      sub.textContent = subtitle;
      infoWrap.appendChild(sub);
    }
    left.appendChild(infoWrap);
    dri.appendChild(left);

    const right = document.createElement('div');
    right.className = 'dri-r';

    if (value !== undefined && value !== null) {
      const val = document.createElement('span');
      val.className = 'dri-val';
      val.textContent = value;
      right.appendChild(val);
    }

    if (typeof deleteFn === 'function') {
      const del = document.createElement('span');
      del.className = 'del-btn';
      del.textContent = 'Delete';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFn();
      });
      right.appendChild(del);
    }

    dri.appendChild(right);
    return dri;
  }

  function createButton(label, onClick, variant) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'form-submit';
    if (variant === 'danger') {
      btn.classList.add('danger');
    } else if (variant === 'secondary') {
      btn.classList.add('secondary');
    }
    if (typeof onClick === 'function') {
      btn.addEventListener('click', onClick);
    }
    return btn;
  }

  function createBadge(text, color) {
    const bdg = document.createElement('span');
    bdg.className = 'bdg';
    bdg.textContent = text;
    if (color) {
      bdg.style.background = color;
    }
    return bdg;
  }

  function createProgressBar(value, max, color) {
    const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

    const pb = document.createElement('div');
    pb.className = 'pb';

    const pbf = document.createElement('div');
    pbf.className = 'pbf';
    pbf.style.width = '0%';

    if (color) {
      pbf.style.background = color;
    }

    pb.appendChild(pbf);

    requestAnimationFrame(() => {
      pbf.style.width = pct + '%';
    });

    pb.setProgress = (newVal, newMax) => {
      const npct = newMax > 0 ? Math.min(100, Math.max(0, (newVal / newMax) * 100)) : 0;
      pbf.style.width = npct + '%';
    };

    return pb;
  }

  function createStatCard(value, label) {
    const sti = document.createElement('div');
    sti.className = 'sti';

    const stn = document.createElement('div');
    stn.className = 'stn';
    stn.textContent = value != null ? value : '--';
    sti.appendChild(stn);

    const stl = document.createElement('div');
    stl.className = 'stl';
    stl.textContent = label || '';
    sti.appendChild(stl);

    return sti;
  }

  function createSectionHeader(title) {
    const lbl = document.createElement('div');
    lbl.className = 'slbl';
    lbl.textContent = title || '';
    return lbl;
  }

  function createToggle(onChange, initialState) {
    const tog = document.createElement('div');
    tog.className = 'tog';
    tog.setAttribute('role', 'switch');
    tog.setAttribute('tabindex', '0');
    if (initialState) {
      tog.classList.add('on');
      tog.setAttribute('aria-checked', 'true');
    } else {
      tog.setAttribute('aria-checked', 'false');
    }

    function toggle() {
      tog.classList.toggle('on');
      const now = tog.classList.contains('on');
      tog.setAttribute('aria-checked', now ? 'true' : 'false');
      if (typeof onChange === 'function') {
        onChange(now);
      }
    }

    tog.addEventListener('click', toggle);
    tog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    return tog;
  }

  function createSelect(options, onChange, selected) {
    const select = document.createElement('select');
    let hasSelection = false;

    if (Array.isArray(options)) {
      options.forEach((opt) => {
        const o = document.createElement('option');
        if (typeof opt === 'object') {
          o.value = opt.value != null ? opt.value : opt.label || '';
          o.textContent = opt.label || opt.value || '';
        } else {
          o.value = opt;
          o.textContent = opt;
        }
        if (selected !== undefined && selected !== null && o.value === selected) {
          o.selected = true;
          hasSelection = true;
        }
        select.appendChild(o);
      });
    }

    if (!hasSelection && selected && select.options.length > 0) {
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === selected) {
          select.selectedIndex = i;
          break;
        }
      }
    }

    if (typeof onChange === 'function') {
      select.addEventListener('change', () => {
        onChange(select.value, select);
      });
    }

    return select;
  }

  function createInput(placeholder, type, value, onChange) {
    const input = document.createElement('input');
    input.type = type || 'text';
    if (placeholder) input.placeholder = placeholder;
    if (value !== undefined && value !== null) input.value = value;

    if (typeof onChange === 'function') {
      input.addEventListener('input', () => {
        onChange(input.value, input);
      });
    }

    return input;
  }

  function createEmptyState(message) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = message || 'Nothing here yet';
    return empty;
  }

  function createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    return spinner;
  }

  function createAvatar(initials, size) {
    const av = document.createElement('div');
    av.className = 'av';
    av.textContent = (initials || '?').slice(0, 2).toUpperCase();
    if (size) {
      av.style.width = size + 'px';
      av.style.height = size + 'px';
      av.style.fontSize = Math.round(size * 0.35) + 'px';
    }
    return av;
  }

  function createTag(label, color, onRemove) {
    const tag = document.createElement('span');
    tag.className = 'tag-chip';

    const lbl = document.createElement('span');
    lbl.textContent = label;
    tag.appendChild(lbl);

    if (color) {
      tag.style.borderColor = color;
      lbl.style.color = color;
    }

    if (typeof onRemove === 'function') {
      const rm = document.createElement('span');
      rm.className = 'tag-remove';
      rm.textContent = '×';
      rm.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(label);
      });
      tag.appendChild(rm);
    }

    return tag;
  }

  function createModal(title, content, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.opacity = '0';

    const box = document.createElement('div');
    box.className = 'modal-box';

    if (title) {
      const t = document.createElement('div');
      t.className = 'modal-title';
      t.textContent = title;
      box.appendChild(t);
    }

    if (typeof content === 'string') {
      const body = document.createElement('div');
      body.className = 'modal-body';
      body.innerHTML = content;
      box.appendChild(body);
    } else if (content instanceof Node) {
      box.appendChild(content);
    }

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-btn secondary';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      close();
    });
    actions.appendChild(closeBtn);
    box.appendChild(actions);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close() {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        if (typeof onClose === 'function') onClose();
      }, 200);
    }

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.close = close;

    return overlay;
  }

  function createStepper(value, onChange, min, max) {
    const wrap = document.createElement('div');
    wrap.className = 'stepper';

    let current = value != null ? value : 0;
    const mmin = min != null ? min : 0;
    const mmax = max != null ? max : 999;

    const decBtn = document.createElement('button');
    decBtn.className = 'stepper-btn';
    decBtn.textContent = '−';
    decBtn.addEventListener('click', () => {
      if (current > mmin) {
        current--;
        valDisplay.textContent = current;
        if (typeof onChange === 'function') onChange(current);
      }
    });
    wrap.appendChild(decBtn);

    const valDisplay = document.createElement('span');
    valDisplay.className = 'stepper-val';
    valDisplay.textContent = current;
    wrap.appendChild(valDisplay);

    const incBtn = document.createElement('button');
    incBtn.className = 'stepper-btn';
    incBtn.textContent = '+';
    incBtn.addEventListener('click', () => {
      if (current < mmax) {
        current++;
        valDisplay.textContent = current;
        if (typeof onChange === 'function') onChange(current);
      }
    });
    wrap.appendChild(incBtn);

    wrap.getValue = () => current;
    wrap.setValue = (v) => {
      current = Math.max(mmin, Math.min(mmax, v));
      valDisplay.textContent = current;
    };

    return wrap;
  }

  function createRadioGroup(options, onChange, selected) {
    const group = document.createElement('div');
    group.className = 'radio-group';

    const buttons = [];

    options.forEach((opt) => {
      const label = typeof opt === 'object' ? opt.label : opt;
      const val = typeof opt === 'object' ? opt.value : opt;

      const option = document.createElement('div');
      option.className = 'radio-option';
      if (selected !== undefined && val === selected) {
        option.classList.add('sel');
      }

      const dot = document.createElement('div');
      dot.className = 'radio-dot';
      option.appendChild(dot);

      const lbl = document.createElement('span');
      lbl.className = 'radio-label';
      lbl.textContent = label;
      option.appendChild(lbl);

      option.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('sel'));
        option.classList.add('sel');
        if (typeof onChange === 'function') onChange(val, label);
      });

      group.appendChild(option);
      buttons.push(option);
    });

    group.getSelected = () => {
      const sel = buttons.find((b) => b.classList.contains('sel'));
      if (!sel) return null;
      const idx = buttons.indexOf(sel);
      return typeof options[idx] === 'object' ? options[idx].value : options[idx];
    };

    return group;
  }

  function createCheckbox(label, checked, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'checkbox-wrap';

    const box = document.createElement('div');
    box.className = 'checkbox-box';
    if (checked) box.classList.add('checked');

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 12 12');
    const polyline = document.createElementNS(svgNS, 'polyline');
    polyline.setAttribute('points', '2 6 5 9 10 3');
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#000');
    polyline.setAttribute('stroke-width', '2.5');
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(polyline);
    box.appendChild(svg);

    wrap.appendChild(box);

    if (label) {
      const lbl = document.createElement('span');
      lbl.className = 'checkbox-label';
      lbl.textContent = label;
      wrap.appendChild(lbl);
    }

    function toggle() {
      box.classList.toggle('checked');
      const now = box.classList.contains('checked');
      if (typeof onChange === 'function') onChange(now);
    }

    wrap.addEventListener('click', toggle);

    wrap.checked = () => box.classList.contains('checked');
    wrap.setChecked = (val) => {
      box.classList.toggle('checked', val);
    };

    return wrap;
  }

  function createDatePicker(value, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'date-picker-wrap';

    const input = document.createElement('input');
    input.type = 'date';
    if (value) input.value = value;

    if (typeof onChange === 'function') {
      input.addEventListener('change', () => {
        onChange(input.value, input);
      });
    }

    wrap.appendChild(input);
    return wrap;
  }

  function createTimePicker(value, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'date-picker-wrap';

    const input = document.createElement('input');
    input.type = 'time';
    if (value) input.value = value;

    if (typeof onChange === 'function') {
      input.addEventListener('change', () => {
        onChange(input.value, input);
      });
    }

    wrap.appendChild(input);
    return wrap;
  }

  function createEl(type, className, children) {
    const el = document.createElement(type);
    if (className) el.className = className;
    if (children) {
      if (typeof children === 'string') {
        el.textContent = children;
      } else if (Array.isArray(children)) {
        children.forEach((c) => {
          if (c instanceof Node) el.appendChild(c);
          else if (c != null) el.appendChild(document.createTextNode(String(c)));
        });
      }
    }
    return el;
  }

  function createSvgIcon(viewBox, paths) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', viewBox || '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    if (paths) {
      (Array.isArray(paths) ? paths : [paths]).forEach((p) => {
        svg.innerHTML += p;
      });
    }
    return svg;
  }

  return {
    createCard,
    createListItem,
    createDomainRow,
    createButton,
    createBadge,
    createProgressBar,
    createStatCard,
    createSectionHeader,
    createToggle,
    createSelect,
    createInput,
    createEmptyState,
    createLoadingSpinner,
    createAvatar,
    createTag,
    createModal,
    createStepper,
    createRadioGroup,
    createCheckbox,
    createDatePicker,
    createTimePicker,
    createEl,
    createSvgIcon,
  };
})();

export default Components;
