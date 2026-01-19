/*
  Portfolio interactions
  - Preloader: per-letter flip + sliding window (starts immediately)
  - Greeting typewriter rotate
  - Custom cursor (sphere -> card/pointer bounds, text caret)
  - Nav dots active state (IntersectionObserver + top/bottom fallback)
  - Smooth anchor scroll
  - Footer year + graduation status badge

  Versioning:
  - Update PORTFOLIO_JS_VERSION when you deploy to force yourself to verify cache
*/

(() => {
  'use strict';

  // =========================
  // Version + cache-bust proof
  // =========================
  const PORTFOLIO_JS_VERSION = '2026-01-19.1';
  const BUILD_STAMP = new Date().toISOString();

  // Shows up in DevTools Console so you KNOW what file version is running.
  // (If you don't see this, you're not running the code you think you are.)
  console.log(`[portfolio.js] loaded v${PORTFOLIO_JS_VERSION} @ ${BUILD_STAMP}`);

  // =========================
  // Helpers
  // =========================
  const on = (el, evt, handler, opts) => {
    if (!el) return () => {};
    el.addEventListener(evt, handler, opts);
    return () => el.removeEventListener(evt, handler, opts);
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const canUseFinePointer = () => {
    try {
      return !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    } catch (_) {
      return false;
    }
  };

  const prefersReducedMotion = () => {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      return false;
    }
  };

  const isNearBottom = (thresholdPx = 12) => {
    const scrollY = window.scrollY || window.pageYOffset;
    const viewBottom = scrollY + window.innerHeight;
    const docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight
    );
    return viewBottom >= (docH - thresholdPx);
  };

  const isNearTop = (thresholdPx = 12) => {
    return (window.scrollY || window.pageYOffset) <= thresholdPx;
  };

  // =========================
  // Preloader (START IMMEDIATELY)
  // =========================
  function initPreloaderEarly() {
    const TEXT = 'welcome';
    const COLORS = {
      0: '#00b4d8',
      1: '#f72585',
      2: '#7209b7',
      3: '#2dd4bf',
      4: '#a78bfa',
      5: '#ffffff',
      6: '#ffffff',
    };

    const MIN_MS = 900;
    const STAGGER_MS = 170;
    const END_PAUSE = 350;

    const WINDOW_K = 3;
    const STEP_MS = 220;       // slow/fast window movement
    const WINDOW_FADE_MS = 240;

    const root = document.documentElement;
    const body = document.body;

    // Lock scroll immediately
    root.classList.add('is-loading');
    body.classList.add('is-loading');

    const reduceMotion = prefersReducedMotion();

    // In case DOM isn't ready yet, we will "wait until preloaderText exists"
    // BUT we still keep body locked from the start.
    const startedAt = performance.now();

    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      root.classList.remove('is-loading');
      body.classList.remove('is-loading');
      root.classList.add('is-loaded');
    };

    const buildAndRun = () => {
      const textEl = document.getElementById('preloaderText');

      // If the HTML isn't in the DOM yet, retry shortly.
      if (!textEl) {
        // If user removed preloader markup entirely, don't hang forever:
        // after ~2s, just finish.
        if (performance.now() - startedAt > 2000) {
          finish();
          return;
        }
        setTimeout(buildAndRun, 16);
        return;
      }

      // Clear
      textEl.textContent = '';

      // Sync JS with CSS animation-duration of .preloader-letter
      const temp = document.createElement('span');
      temp.className = 'preloader-letter';
      temp.style.position = 'absolute';
      temp.style.visibility = 'hidden';
      temp.textContent = 'x';
      textEl.appendChild(temp);

      const dur = getComputedStyle(temp).animationDuration || '1.2s';
      const ANIM_MS = dur.includes('ms') ? parseFloat(dur) : parseFloat(dur) * 1000;
      temp.remove();

      // Build letters
      const letters = [];
      for (let i = 0; i < TEXT.length; i++) {
        const span = document.createElement('span');
        span.textContent = TEXT[i];
        span.className = 'preloader-letter';
        span.dataset.axis = (i % 2 === 0) ? 'x' : 'y';
        span.style.color = COLORS[i] || '#ffffff';
        span.style.animationDelay = `${i * STAGGER_MS}ms`;
        textEl.appendChild(span);
        letters.push(span);
      }

      const flipTotal = (TEXT.length - 1) * STAGGER_MS + ANIM_MS;

      const runSlidingWindow = () => new Promise((resolve) => {
        if (reduceMotion) return resolve();

        const steps = Math.max(1, TEXT.length - WINDOW_K + 1);
        const pad = 8;

        const win = document.createElement('div');
        win.className = 'sw-window';
        textEl.appendChild(win);

        const clearActive = () => letters.forEach(l => l.classList.remove('sw-active'));

        const setWindowToRange = (start) => {
          clearActive();
          const end = start + WINDOW_K - 1;

          for (let i = start; i <= end; i++) {
            if (letters[i]) letters[i].classList.add('sw-active');
          }

          const left = letters[start].offsetLeft;
          const right = letters[end].offsetLeft + letters[end].offsetWidth;
          const width = (right - left);

          win.style.opacity = '1';
          win.style.width = `${Math.max(6, width + pad * 2)}px`;
          win.style.transform = `translate3d(${left - pad}px, -50%, 0)`;
        };

        let idx = 0;
        setWindowToRange(0);

        const timer = setInterval(() => {
          idx++;
          if (idx >= steps) {
            clearInterval(timer);
            clearActive();
            win.style.opacity = '0';

            setTimeout(() => {
              win.remove();
              resolve();
            }, WINDOW_FADE_MS);

            return;
          }
          setWindowToRange(idx);
        }, STEP_MS);
      });

      // Ensure the preloader doesn't end too fast
      const elapsed = performance.now() - startedAt;
      const waitForMin = Math.max(0, MIN_MS - elapsed);

      // Wait for (flip animation) AND minimum duration
      const wait = Math.max(flipTotal, waitForMin);

      // If page is already fully loaded, we can start countdown immediately.
      // Otherwise wait for window load so it doesn't disappear before assets are ready.
      const startSequence = () => {
        setTimeout(async () => {
          await runSlidingWindow();
          setTimeout(finish, END_PAUSE);
        }, wait);
      };

      if (document.readyState === 'complete') {
        startSequence();
      } else {
        window.addEventListener('load', startSequence, { once: true });
      }
    };

    buildAndRun();

    return () => { cancelled = true; };
  }

  // Start preloader RIGHT NOW (as soon as this script loads)
  const cleanupPreloader = initPreloaderEarly();

  // =========================
  // Greeting typewriter rotate
  // =========================
  function initGreetingRotate() {
    const el = document.querySelector('.greeting-rotate');
    if (!el) return () => {};

    const greetings = ['bonjour', 'hallo', 'hello', 'namaste'];
    const charDelay = 100;
    const wordPause = 4000;

    let i = 0;
    let typingTimer = null;
    let rotateTimer = null;

    const typeWord = (word) => {
      if (typingTimer) clearInterval(typingTimer);
      el.textContent = '';
      let c = 0;

      typingTimer = setInterval(() => {
        if (c < word.length) el.textContent += word[c++];
        else {
          clearInterval(typingTimer);
          typingTimer = null;
        }
      }, charDelay);
    };

    typeWord(greetings[i]);
    rotateTimer = setInterval(() => {
      i = (i + 1) % greetings.length;
      typeWord(greetings[i]);
    }, wordPause);

    return () => {
      if (typingTimer) clearInterval(typingTimer);
      if (rotateTimer) clearInterval(rotateTimer);
      typingTimer = null;
      rotateTimer = null;
    };
  }

  // =========================
  // Custom cursor
  // =========================
  function initCursor() {
    const cursor = document.querySelector('.cursor');
    if (!cursor) return () => {};
    if (!canUseFinePointer()) return () => {};

    document.body.classList.add('has-cursor');

    const CARD_SEL =
      '.principle-card, .project-card, .timeline-item, .cert-card, .contact-card, .stack-category';

    const TEXT_SEL =
      'p, h1, h2, h3, h4, li, .intro-text, .section-description, .project-description, .timeline-points, .contact-value, .cert-issuer';

    const POINTER_SEL =
      'a, button, .nav-dot, .project-link, .text-link, .btn-primary, .btn-secondary';

    const BASE = { w: 28, h: 28, r: 999 };
    const POINTER = { w: 52, h: 52, r: 999 };
    const TEXT = { w: 4, h: 36, r: 2 };

    const followSpeed = 0.18;
    const morphSpeed = 0.24;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;

    let x = -100;
    let y = -100;

    let targetX = x;
    let targetY = y;

    let w = BASE.w, h = BASE.h, r = BASE.r;
    let targetW = BASE.w, targetH = BASE.h, targetR = BASE.r;

    let lockedCardEl = null;
    let lockedPointerEl = null;
    let mode = 'default';
    let raf = 0;

    const setMode = (next) => {
      if (mode === next) return;
      mode = next;

      cursor.classList.toggle('mode-pointer', next === 'pointer');
      cursor.classList.toggle('mode-pointerlock', next === 'pointerlock');
      cursor.classList.toggle('mode-text', next === 'text');
      cursor.classList.toggle('mode-card', next === 'card');
    };

    const setTargetsForMode = (m) => {
      if (m === 'pointer') {
        targetW = POINTER.w; targetH = POINTER.h; targetR = POINTER.r;
      } else if (m === 'text') {
        targetW = TEXT.w; targetH = TEXT.h; targetR = TEXT.r;
      } else {
        targetW = BASE.w; targetH = BASE.h; targetR = BASE.r;
      }
    };

    const lockToRect = (el, brFallback, nextMode) => {
      const rect = el.getBoundingClientRect();
      targetX = rect.left;
      targetY = rect.top;
      targetW = Math.max(1, rect.width);
      targetH = Math.max(1, rect.height);

      const br = parseFloat(getComputedStyle(el).borderRadius) || brFallback;
      targetR = clamp(br, 0, 999);

      setMode(nextMode);
    };

    const unlockAll = () => {
      lockedCardEl = null;
      lockedPointerEl = null;
    };

    const pickModeFromTarget = (t) => {
      if (!t || typeof t.closest !== 'function') {
        unlockAll();
        setMode('default');
        setTargetsForMode('default');
        return;
      }

      const card = t.closest(CARD_SEL);
      if (card) {
        lockedCardEl = card;
        lockedPointerEl = null;
        lockToRect(card, 24, 'card');
        return;
      }

      const pointerEl = t.closest(POINTER_SEL);
      if (pointerEl) {
        lockedPointerEl = pointerEl;
        lockedCardEl = null;
        lockToRect(pointerEl, 14, 'pointerlock');
        return;
      }

      const isText = (typeof t.matches === 'function' && t.matches(TEXT_SEL)) || !!t.closest(TEXT_SEL);
      if (isText) {
        unlockAll();
        setMode('text');
        setTargetsForMode('text');
        return;
      }

      unlockAll();
      setMode('default');
      setTargetsForMode('default');
    };

    const hideCursor = () => cursor.classList.add('is-hidden');
    const showCursor = () => cursor.classList.remove('is-hidden');

    const onPointerMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;

      showCursor();
      pickModeFromTarget(e.target);

      if (!lockedCardEl && !lockedPointerEl) {
        targetX = mx - targetW / 2;
        targetY = my - targetH / 2;
      }
    };

    const onPointerDownCapture = (e) => {
      const mail = e.target && e.target.closest && e.target.closest('a[href^="mailto:"]');
      if (!mail) return;

      unlockAll();
      setMode('default');
      setTargetsForMode('default');
      targetX = mx - targetW / 2;
      targetY = my - targetH / 2;
    };

    const tick = () => {
      try {
        if (lockedCardEl) {
          lockToRect(lockedCardEl, 24, 'card');
        } else if (lockedPointerEl) {
          lockToRect(lockedPointerEl, 14, 'pointerlock');
        } else {
          targetX = mx - targetW / 2;
          targetY = my - targetH / 2;
        }

        x += (targetX - x) * followSpeed;
        y += (targetY - y) * followSpeed;
        w += (targetW - w) * morphSpeed;
        h += (targetH - h) * morphSpeed;
        r += (targetR - r) * morphSpeed;

        cursor.style.width = `${w}px`;
        cursor.style.height = `${h}px`;
        cursor.style.borderRadius = `${r}px`;
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      } catch (_) {
        unlockAll();
        setMode('default');
        setTargetsForMode('default');
      }

      raf = requestAnimationFrame(tick);
    };

    const off = [];
    off.push(on(document, 'pointermove', onPointerMove, { passive: true }));
    off.push(on(document, 'pointerdown', onPointerDownCapture, true));
    off.push(on(document.documentElement, 'pointerleave', hideCursor, { passive: true }));
    off.push(on(document.documentElement, 'pointerenter', showCursor, { passive: true }));
    off.push(on(window, 'blur', hideCursor));
    off.push(on(window, 'focus', showCursor));
    off.push(on(document, 'visibilitychange', () => { if (document.hidden) hideCursor(); }, { passive: true }));

    tick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      off.forEach(fn => fn());
    };
  }

  // =========================
  // Nav dots
  // =========================
  function initNavDots() {
    const nav = document.querySelector('.nav-dots');
    if (nav && getComputedStyle(nav).display === 'none') return () => {};

    const dots = Array.from(document.querySelectorAll('.nav-dot'));
    if (!dots.length) return () => {};

    const dotToSection = new Map();
    const sections = [];

    dots.forEach((dot) => {
      const href = dot.getAttribute('href');
      if (!href || !href.startsWith('#') || href === '#') return;

      const sec = document.querySelector(href);
      if (!sec) return;

      dotToSection.set(dot, sec);
      sections.push(sec);
    });

    if (!sections.length) return () => {};

    const sectionToDot = new Map();
    for (const [dot, sec] of dotToSection.entries()) sectionToDot.set(sec, dot);

    const setActiveDot = (sec) => {
      dots.forEach(d => d.classList.remove('active'));
      const dot = sectionToDot.get(sec);
      if (dot) dot.classList.add('active');
    };

    const ratios = new Map();

    const chooseActive = () => {
      if (isNearTop(8)) return setActiveDot(sections[0]);
      if (isNearBottom(8)) return setActiveDot(sections[sections.length - 1]);

      let best = null;
      let bestRatio = 0;

      for (const sec of sections) {
        const r = ratios.get(sec) || 0;
        if (r > bestRatio) {
          bestRatio = r;
          best = sec;
        }
      }

      if (!best) {
        const anchorY = window.innerHeight * 0.35;
        let minDist = Infinity;

        for (const sec of sections) {
          const rect = sec.getBoundingClientRect();
          const dist = Math.abs(rect.top - anchorY);
          if (dist < minDist) {
            minDist = dist;
            best = sec;
          }
        }
      }

      if (best) setActiveDot(best);
    };

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
      }
      chooseActive();
    }, {
      root: null,
      threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1],
      rootMargin: '-20% 0px -55% 0px',
    });

    sections.forEach(sec => io.observe(sec));

    const off = [];

    const onDotClick = (e) => {
      const dot = e.currentTarget;
      const href = dot.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveDot(target);
      try { history.pushState(null, '', href); } catch (_) {}
    };

    dots.forEach(dot => off.push(on(dot, 'click', onDotClick, { passive: false })));

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        chooseActive();
        ticking = false;
      });
    };

    off.push(on(window, 'scroll', onScroll, { passive: true }));
    off.push(on(window, 'resize', onScroll, { passive: true }));

    chooseActive();

    return () => {
      try { io.disconnect(); } catch (_) {}
      off.forEach(fn => fn());
      ratios.clear();
    };
  }

  // =========================
  // Smooth anchor scroll (CTAs)
  // =========================
  function initAnchorScroll() {
    const anchors = Array.from(document.querySelectorAll('a[href^="#"]:not(.nav-dot)'));
    if (!anchors.length) return () => {};

    const handler = (e) => {
      const a = e.currentTarget;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try { history.pushState(null, '', href); } catch (_) {}
    };

    const off = anchors.map(a => on(a, 'click', handler, { passive: false }));
    return () => off.forEach(fn => fn());
  }

  // =========================
  // Footer year + status
  // =========================
  function updateYear() {
    const el = document.querySelector('#copyright-year');
    if (!el) return;
    el.textContent = `© ${new Date().getFullYear()} bhavani shankar ajith`;
  }

  function updateStatusBadge() {
    const badge = document.querySelector('.status-badge');
    if (!badge) return;

    const graduationDate = new Date('2026-05-31T23:59:59');
    const graduated = new Date() > graduationDate;

    badge.innerHTML = `
      <span class="status-dot" aria-hidden="true"></span>
      ${graduated ? 'open to opportunities • graduated may 2026' : 'open to opportunities • graduating may 2026'}
    `;
  }

  // =========================
  // Boot (WAIT FOR DOM)
  // =========================
  function boot() {
    const cleanups = [];

    cleanups.push(initGreetingRotate());
    cleanups.push(initCursor());
    cleanups.push(initNavDots());
    cleanups.push(initAnchorScroll());

    updateYear();
    updateStatusBadge();

    on(window, 'pagehide', () => {
      try { cleanupPreloader(); } catch (_) {}
      cleanups.forEach(fn => { try { fn(); } catch (_) {} });
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
