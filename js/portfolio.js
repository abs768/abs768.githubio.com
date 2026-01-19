/*
  Portfolio interactions
  - Typewriter greeting
  - Custom cursor (sphere -> card bounds, text caret, pointer-lock)
  - Nav dots active state (IntersectionObserver + hard bottom/top fallback)
  - Anchor smooth scroll for CTAs
  - Footer year + graduation badge
*/

// =========================
// =========================
// Preloader: per-letter 3D flip + per-letter colors, then reveal page
// =========================
// =========================
// Preloader: per-letter flip (rotation) + colors, then reveal page
// =========================
// =========================
// Preloader: per-letter 3D flip + per-letter colors, then reveal page
// =========================
// =========================
// Preloader: per-letter flip + sliding window highlight, then reveal page
// =========================
(() => {
  const TEXT = "welcome";
  const COLORS = {
    0: "#00b4d8",
    1: "#f72585",
    2: "#7209b7",
    3: "#2dd4bf",
    4: "#a78bfa",
    5: "#ffffff",
    6: "#ffffff"
  };

  const MIN_MS = 900;
  const STAGGER_MS = 170;
  const END_PAUSE = 350;

  // sliding window settings
  const WINDOW_K = 3;
  const STEP_MS = 190;      // slow this to make it calmer (e.g. 230)
  const HOLD_MS = 260;

  const root = document.documentElement;
  root.classList.add("is-loading");
  document.body.classList.add("is-loading");

  const textEl = document.getElementById("preloaderText");
  if (!textEl) {
    root.classList.remove("is-loading");
    document.body.classList.remove("is-loading");
    root.classList.add("is-loaded");
    return;
  }

  textEl.textContent = "";

  // detect reduced motion
  const reduceMotion = (() => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  })();

  // read animation duration from CSS (so it stays in sync with your .preloader-letter)
  const temp = document.createElement("span");
  temp.className = "preloader-letter";
  temp.style.position = "absolute";
  temp.style.visibility = "hidden";
  temp.textContent = "x";
  textEl.appendChild(temp);

  const dur = getComputedStyle(temp).animationDuration || "1.2s";
  const ANIM_MS = dur.includes("ms") ? parseFloat(dur) : parseFloat(dur) * 1000;
  temp.remove();

  // build letters
  const letters = [];
  for (let i = 0; i < TEXT.length; i++) {
    const span = document.createElement("span");
    span.textContent = TEXT[i];
    span.className = "preloader-letter";
    span.dataset.axis = (i % 2 === 0) ? "x" : "y";
    span.style.color = COLORS[i] || "#ffffff";
    span.style.animationDelay = `${i * STAGGER_MS}ms`;
    textEl.appendChild(span);
    letters.push(span);
  }

  const flipTotal = (TEXT.length - 1) * STAGGER_MS + ANIM_MS;

  const finish = () => {
    root.classList.remove("is-loading");
    document.body.classList.remove("is-loading");
    root.classList.add("is-loaded");
  };

  const runSlidingWindow = () => {
    return new Promise((resolve) => {
      if (reduceMotion) return resolve();

      const steps = Math.max(1, TEXT.length - WINDOW_K + 1);
      const pad = 8;

      // create window rect
      const win = document.createElement("div");
      win.className = "sw-window";
      textEl.appendChild(win);

      const clearActive = () => letters.forEach(l => l.classList.remove("sw-active"));

      const setWindowToRange = (start) => {
        clearActive();
        const end = start + WINDOW_K - 1;

        for (let i = start; i <= end; i++) {
          if (letters[i]) letters[i].classList.add("sw-active");
        }

        const left = letters[start].offsetLeft;
        const right = letters[end].offsetLeft + letters[end].offsetWidth;
        const width = (right - left);

        win.style.opacity = "1";
        win.style.width = `${Math.max(6, width + pad * 2)}px`;
        win.style.transform = `translate3d(${left - pad}px, -50%, 0)`;
      };

      let idx = 0;
      setWindowToRange(0);

      const t = setInterval(() => {
        idx++;
        if (idx >= steps) {
          clearInterval(t);
          clearActive();

          // fade out window
          win.style.opacity = "0";

          setTimeout(() => {
            win.remove();
            resolve();
          }, 240);

          return;
        }
        setWindowToRange(idx);
      }, STEP_MS);

      // tiny hold at the end (feels intentional)
      setTimeout(() => {}, HOLD_MS);
    });
  };

  const start = performance.now();

  window.addEventListener("load", async () => {
    const elapsed = performance.now() - start;

    // ensure we don't finish too fast
    const waitForMin = Math.max(0, MIN_MS - elapsed);

    // wait for flip to complete, then run sliding window, then finish
    setTimeout(async () => {
      await runSlidingWindow();
      setTimeout(finish, END_PAUSE);
    }, Math.max(0, flipTotal, waitForMin));
  }, { once: true });
})();


(() => {
  'use strict';

  // ✅ toggle this ON to see the debug box bottom-left, OFF to remove
  const DEBUG_NAV = false;

  // -----------------------------
  // Helpers
  // -----------------------------
  const safeText = (el, text) => {
    if (!el) return;
    el.textContent = String(text ?? '');
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const canUseFinePointer = () => {
    try {
      return !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    } catch (_) {
      return false;
    }
  };

  const on = (el, evt, handler, opts) => {
    if (!el) return () => {};
    el.addEventListener(evt, handler, opts);
    return () => el.removeEventListener(evt, handler, opts);
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

  // -----------------------------
  // Nav debug overlay (bottom-left)
  // -----------------------------
  function enableNavDebug(dotToSection, sectionsInOrder) {
    if (!DEBUG_NAV) return () => {};

    const existing = document.getElementById('nav-debug');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'nav-debug';
    box.style.cssText = `
      position: fixed; left: 16px; bottom: 16px; z-index: 99999;
      background: rgba(0,0,0,0.80); color: #fff;
      border: 1px solid rgba(255,255,255,0.20);
      padding: 10px 12px; border-radius: 10px;
      font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      max-width: 420px;
      pointer-events: none;
    `;
    document.body.appendChild(box);

    const dots = [...dotToSection.keys()];

    const render = () => {
      const activeIdx = dots.findIndex(d => d.classList.contains('active'));
      const activeDotNum = activeIdx >= 0 ? activeIdx + 1 : 'none';
      const activeSectionId = activeIdx >= 0 ? (dotToSection.get(dots[activeIdx])?.id || 'missing') : 'none';

      const ids = sectionsInOrder.map(s => s?.id || 'missing').join(', ');

      box.innerHTML = `
        <div><b>Nav Debug</b></div>
        <div>Dots: ${dots.length}</div>
        <div>Sections: ${sectionsInOrder.length}</div>
        <div>Order: ${ids}</div>
        <div style="margin-top:6px;">Active dot: ${activeDotNum}</div>
        <div>Active section: ${activeSectionId}</div>
        <div style="margin-top:6px; opacity:0.75;">(set DEBUG_NAV=false to remove)</div>
      `;
    };

    render();
    window.addEventListener('scroll', render, { passive: true });
    window.addEventListener('resize', render, { passive: true });

    return () => {
      window.removeEventListener('scroll', render);
      window.removeEventListener('resize', render);
      box.remove();
    };
  }

  // -----------------------------
  // Typewriter greeting
  // -----------------------------
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

    const cleanup = () => {
      if (typingTimer) clearInterval(typingTimer);
      if (rotateTimer) clearInterval(rotateTimer);
      typingTimer = null;
      rotateTimer = null;
    };

    const off1 = on(window, 'pagehide', cleanup, { passive: true });

    return () => {
      off1();
      cleanup();
    };
  }

  // -----------------------------
  // Custom cursor
  // -----------------------------
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

    let x = mx - BASE.w / 2;
    let y = my - BASE.h / 2;

    let targetX = x;
    let targetY = y;

    let w = BASE.w;
    let h = BASE.h;
    let r = BASE.r;

    let targetW = BASE.w;
    let targetH = BASE.h;
    let targetR = BASE.r;

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

    const lockToCard = (el) => {
      lockedCardEl = el;
      lockedPointerEl = null;
      setMode('card');

      const rect = el.getBoundingClientRect();
      targetX = rect.left; targetY = rect.top;
      targetW = Math.max(1, rect.width); targetH = Math.max(1, rect.height);

      const br = parseFloat(getComputedStyle(el).borderRadius) || 24;
      targetR = clamp(br, 0, 999);
    };

    const lockToPointer = (el) => {
      lockedPointerEl = el;
      lockedCardEl = null;
      setMode('pointerlock');

      const rect = el.getBoundingClientRect();
      targetX = rect.left; targetY = rect.top;
      targetW = Math.max(1, rect.width); targetH = Math.max(1, rect.height);

      const br = parseFloat(getComputedStyle(el).borderRadius) || 14;
      targetR = clamp(br, 0, 999);
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
        if (lockedCardEl !== card) lockToCard(card);
        return;
      }

      const pointerEl = t.closest(POINTER_SEL);
      if (pointerEl) {
        if (lockedPointerEl !== pointerEl) lockToPointer(pointerEl);
        return;
      }

      const isText =
        (typeof t.matches === 'function' && t.matches(TEXT_SEL)) || !!t.closest(TEXT_SEL);
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
          const rect = lockedCardEl.getBoundingClientRect();
          targetX = rect.left; targetY = rect.top;
          targetW = Math.max(1, rect.width); targetH = Math.max(1, rect.height);
          const br = parseFloat(getComputedStyle(lockedCardEl).borderRadius) || 24;
          targetR = clamp(br, 0, 999);
        } else if (lockedPointerEl) {
          const rect = lockedPointerEl.getBoundingClientRect();
          targetX = rect.left; targetY = rect.top;
          targetW = Math.max(1, rect.width); targetH = Math.max(1, rect.height);
          const br = parseFloat(getComputedStyle(lockedPointerEl).borderRadius) || 14;
          targetR = clamp(br, 0, 999);
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

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      off.forEach(fn => fn());
    };

    const offHide = on(window, 'pagehide', cleanup, { passive: true });

    return () => {
      offHide();
      cleanup();
    };
  }

  // -----------------------------
  // Nav dots (IO + hard bottom/top fallback)
  // -----------------------------
  function initNavDots() {
    const dots = Array.from(document.querySelectorAll('.nav-dot'));
    if (!dots.length) return () => {};

    // Build sections IN THE SAME ORDER AS DOTS (important)
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

    if (!dotToSection.size) return () => {};

    // ✅ debug overlay should be called like this (sections exists)
    const debugCleanup = enableNavDebug(dotToSection, sections);

    const sectionToDot = new Map();
    for (const [dot, sec] of dotToSection.entries()) sectionToDot.set(sec, dot);

    const setActiveDot = (sec) => {
      dots.forEach(d => d.classList.remove('active'));
      const dot = sectionToDot.get(sec);
      if (dot) dot.classList.add('active');
    };

    // Track visibility ratios
    const ratios = new Map();

    const chooseActive = () => {
      // Hard top/bottom guarantees first/last dot always hit
      if (isNearTop(8)) {
        if (sections[0]) setActiveDot(sections[0]);
        return;
      }
      if (isNearBottom(8)) {
        const last = sections[sections.length - 1];
        if (last) setActiveDot(last);
        return;
      }

      // Otherwise pick the most visible section
      let best = null;
      let bestRatio = 0;

      for (const sec of sections) {
        const r = ratios.get(sec) || 0;
        if (r > bestRatio) {
          bestRatio = r;
          best = sec;
        }
      }

      // Fallback: nearest to viewport anchor if IO gives nothing
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

    const onDotClick = (e) => {
      const dot = e.currentTarget;
      const href = dot.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveDot(target); // immediate feedback
      try { history.pushState(null, '', href); } catch (_) {}
    };

    const off = [];
    dots.forEach(dot => off.push(on(dot, 'click', onDotClick, { passive: false })));

    // Bottom/top fallback requires scroll/resize too
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
      if (debugCleanup) debugCleanup();
    };
  }

  // -----------------------------
  // Anchor scroll (CTAs)
  // -----------------------------
  function initAnchorScroll() {
    const anchors = Array.from(document.querySelectorAll('a[href^="#"]:not(.nav-dot)'));
    if (!anchors.length) return () => {};

    const onAnchorClick = (e) => {
      const a = e.currentTarget;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try { history.pushState(null, '', href); } catch (_) {}
    };

    const off = anchors.map(a => on(a, 'click', onAnchorClick, { passive: false }));
    return () => off.forEach(fn => fn());
  }

  // -----------------------------
  // Footer + status
  // -----------------------------
  function updateYear() {
    const el = document.querySelector('#copyright-year');
    if (!el) return;
    safeText(el, `© ${new Date().getFullYear()} bhavani shankar ajith`);
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

  // -----------------------------
  // Boot
  // -----------------------------
  const boot = () => {
    const cleanups = [];
    cleanups.push(initGreetingRotate());
    cleanups.push(initCursor());
    cleanups.push(initNavDots());
    cleanups.push(initAnchorScroll());
    updateYear();
    updateStatusBadge();

    on(window, 'pagehide', () => {
      cleanups.forEach(fn => { try { fn(); } catch (_) {} });
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
