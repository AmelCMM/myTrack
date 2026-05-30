/* ═══════════════════════════════════════════════════════════════════
   Navigation module for myTrack
   Handles screen switching, nav highlighting, URL hash routing,
   history tracking, lazy screen registration, transition management
   ═══════════════════════════════════════════════════════════════════ */

import Bridge from './bridge.js';

const Navigation = (() => {
  let _current = 'home';
  let _previous = null;
  let _history = [];
  let _screens = {};
  let _beforeHooks = {};
  let _afterHooks = {};
  let _initialized = false;
  let _transitioning = false;
  let _scrollPositions = {};
  let _lastNavTime = 0;
  const NAV_COOLDOWN = 200;

  function init() {
    if (_initialized) return;
    _initialized = true;

    const hash = window.location.hash.replace('#', '');
    const validHash = hash && document.getElementById('scr-' + hash);
    if (validHash) {
      _current = hash;
    }

    const start = document.getElementById('scr-' + _current);
    const startNav = document.getElementById('nav-' + _current);
    if (start) start.classList.add('on');
    if (startNav) startNav.classList.add('on');

    window.addEventListener('hashchange', _onHashChange);

    window.addEventListener('popstate', (e) => {
      const h = window.location.hash.replace('#', '');
      if (h && h !== _current && document.getElementById('scr-' + h)) {
        nav(h, { skipHistory: true });
      } else if (!h && _history.length > 0) {
        back();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const sov = document.getElementById('sov');
        if (sov && sov.classList.contains('on')) return;
        if (_history.length > 0) {
          back();
          Bridge.Haptics.tick();
        }
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        _scrollPositions[_current] = _getScrollTop();
      }
    });

    const sov = document.getElementById('sov');
    if (sov) {
      sov.addEventListener('click', (e) => {
        if (e.target === sov) {
          sov.classList.remove('on');
        }
      });
    }
  }

  function _getScrollTop() {
    const el = document.getElementById('scr-' + _current);
    if (!el) return 0;
    const scroll = el.querySelector('.scroll');
    return scroll ? scroll.scrollTop : 0;
  }

  function _onHashChange() {
    const h = window.location.hash.replace('#', '');
    if (h && h !== _current && document.getElementById('scr-' + h)) {
      nav(h, { skipHistory: true });
    }
  }

  function nav(id, opts = {}) {
    const now = Date.now();
    if (now - _lastNavTime < NAV_COOLDOWN) return;
    if (_transitioning) return;
    if (id === _current) return;

    const targetEl = document.getElementById('scr-' + id);
    const targetNav = document.getElementById('nav-' + id);
    if (!targetEl) {
      console.warn('Navigation: screen "' + id + '" not found');
      return;
    }

    const prevId = _current;
    const prevEl = document.getElementById('scr-' + prevId);
    const prevNav = document.getElementById('nav-' + prevId);

    const hooks = _beforeHooks[id];
    if (hooks) {
      for (const fn of hooks) {
        const result = fn(prevId, id);
        if (result === false) return;
      }
    }

    _lastNavTime = now;
    _transitioning = true;

    _scrollPositions[prevId] = _getScrollTop();

    if (!opts.skipHistory) {
      _previous = prevId;
      _history.push(prevId);
      if (_history.length > 50) _history.shift();
    }

    if (prevEl) prevEl.classList.remove('on');
    if (prevNav) prevNav.classList.remove('on');

    _current = id;

    targetEl.classList.add('on');
    if (targetNav) targetNav.classList.add('on');

    const scr = _screens[id];
    if (typeof scr === 'function') {
      scr();
    }

    const scrollEl = targetEl.querySelector('.scroll');
    if (scrollEl) {
      const savedScroll = _scrollPositions[id];
      if (savedScroll != null) {
        requestAnimationFrame(() => {
          scrollEl.scrollTop = savedScroll;
        });
      } else {
        scrollEl.scrollTop = 0;
      }
    }

    try {
      if (window.location.hash !== '#' + id) {
        window.history.replaceState(null, '', '#' + id);
      }
    } catch {}

    requestAnimationFrame(() => {
      _transitioning = false;
    });

    const afterFns = _afterHooks[id];
    if (afterFns) {
      afterFns.forEach((fn) => {
        try { fn(prevId, id); } catch (e) { console.error('Nav after hook error', e); }
      });
    }
  }

  function back() {
    if (_history.length === 0) return;
    if (_transitioning) return;

    const prev = _history.pop();
    _previous = _current;

    const prevId = _current;
    const prevEl = document.getElementById('scr-' + prevId);
    const prevNav = document.getElementById('nav-' + prevId);

    if (prevEl) prevEl.classList.remove('on');
    if (prevNav) prevNav.classList.remove('on');

    _current = prev;

    const nextEl = document.getElementById('scr-' + prev);
    const nextNav = document.getElementById('nav-' + prev);
    if (nextEl) nextEl.classList.add('on');
    if (nextNav) nextNav.classList.add('on');

    const scr = _screens[prev];
    if (typeof scr === 'function') scr();

    const scrollEl = nextEl?.querySelector('.scroll');
    if (scrollEl) {
      const saved = _scrollPositions[prev];
      if (saved != null) {
        requestAnimationFrame(() => { scrollEl.scrollTop = saved; });
      }
    }

    try {
      if (window.location.hash !== '#' + prev) {
        window.history.replaceState(null, '', '#' + prev);
      }
    } catch {}
  }

  function registerScreen(id, renderFn) {
    if (typeof renderFn === 'function') {
      _screens[id] = renderFn;
    }
  }

  function unregisterScreen(id) {
    delete _screens[id];
    delete _beforeHooks[id];
    delete _afterHooks[id];
    delete _scrollPositions[id];
  }

  function addBeforeHook(id, fn) {
    if (!_beforeHooks[id]) _beforeHooks[id] = [];
    _beforeHooks[id].push(fn);
    return () => {
      const arr = _beforeHooks[id];
      if (arr) {
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }

  function addAfterHook(id, fn) {
    if (!_afterHooks[id]) _afterHooks[id] = [];
    _afterHooks[id].push(fn);
    return () => {
      const arr = _afterHooks[id];
      if (arr) {
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }

  function reload() {
    const scr = _screens[_current];
    if (typeof scr === 'function') scr();
  }

  function reloadAll() {
    for (const [id, fn] of Object.entries(_screens)) {
      try { fn(); } catch (e) { console.error('Reload error for', id, e); }
    }
  }

  function getCurrent() {
    return _current;
  }

  function getPrevious() {
    return _previous;
  }

  function canGoBack() {
    return _history.length > 0;
  }

  function getHistory() {
    return [..._history];
  }

  function clearHistory() {
    _history = [];
  }

  function navigateTo(id, replace) {
    if (replace) {
      if (_history.length > 0) {
        _history[_history.length - 1] = id;
      }
    }
    nav(id);
  }

  function isRegistered(id) {
    return id in _screens;
  }

  function getRegisteredScreens() {
    return Object.keys(_screens);
  }

  function getScrollPosition(id) {
    return _scrollPositions[id] || 0;
  }

  function saveScrollPosition(id, position) {
    _scrollPositions[id || _current] = position;
  }

  function isTransitioning() {
    return _transitioning;
  }

  return {
    init,
    nav,
    back,
    reload,
    reloadAll,
    getCurrent,
    getPrevious,
    registerScreen,
    unregisterScreen,
    addBeforeHook,
    addAfterHook,
    canGoBack,
    getHistory,
    clearHistory,
    navigateTo,
    isRegistered,
    getRegisteredScreens,
    getScrollPosition,
    saveScrollPosition,
    isTransitioning,
  };
})();

export default Navigation;
