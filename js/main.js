/* =====================================================================
   Burn Foundation — motion layer
   GSAP + ScrollTrigger, ember canvas, flame interactions
   ===================================================================== */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  html.classList.add('js-ready', 'is-loading');

  /* ------------------------------------------------------------------
     Always open at the top. Browsers restore the previous scroll offset
     on refresh, which drops you mid-page and skips the intro. Turning
     restoration off must happen as early as possible; an explicit
     scrollTo covers browsers that have already restored by now.
     A deep link (#programs) is still honoured.
     ------------------------------------------------------------------ */
  const deepLinked = window.location.hash.length > 1;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!deepLinked) window.scrollTo(0, 0);

  /* ------------------------------------------------------------------
     0. Image fallback — hide any <img> whose file isn't in place yet so
        the CSS gradient underneath shows instead of a broken-image icon
     ------------------------------------------------------------------ */
  document.querySelectorAll('img').forEach((img) => {
    const flag = () => img.classList.add('is-missing');
    img.addEventListener('error', flag);
    if (img.complete && img.naturalWidth === 0) flag();
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     1. Text splitter (chars, keeps words intact for wrapping)
     ------------------------------------------------------------------ */
  function splitChars(el) {
    if (el.dataset.splitDone) return Array.from(el.querySelectorAll('.char'));
    const words = el.textContent.split(/(\s+)/);
    el.textContent = '';
    const chars = [];

    words.forEach((word) => {
      if (/^\s+$/.test(word)) {
        el.appendChild(document.createTextNode(' '));
        return;
      }
      const wrap = document.createElement('span');
      wrap.className = 'word';
      wrap.style.display = 'inline-block';
      wrap.style.whiteSpace = 'nowrap';

      for (const ch of word) {
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        wrap.appendChild(s);
        chars.push(s);
      }
      el.appendChild(wrap);
    });

    el.dataset.splitDone = '1';
    return chars;
  }

  document.querySelectorAll('[data-split]').forEach(splitChars);

  /* ------------------------------------------------------------------
     2. Preloader
     ------------------------------------------------------------------ */
  const preloader = document.getElementById('preloader');

  function bootIntro() {
    /* Re-assert both: ScrollTrigger resets scrollRestoration to "auto"
       during its own init, and the browser may restore the offset after
       our first attempt — so pin to the top again before the intro plays. */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!deepLinked) window.scrollTo(0, 0);

    html.classList.remove('is-loading');

    const tl = gsap.timeline();

    tl.to('#preloader .preloader__bar i', { width: '100%', duration: 0.9, ease: 'power2.inOut' })
      .to('#preloader .preloader__inner', { autoAlpha: 0, y: -20, duration: 0.4, ease: 'power2.in' })
      .to(preloader, {
        yPercent: -100,
        duration: 0.9,
        ease: 'expo.inOut',
        onComplete: () => preloader.remove()
      }, '-=0.1');

    /* hero entrance */
    const heroChars = [];
    document.querySelectorAll('.hero__title .split').forEach((s) => {
      heroChars.push(...s.querySelectorAll('.char'));
    });

    tl.from('.hero .eyebrow', { autoAlpha: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.5')
      .from(heroChars, {
        yPercent: 120,
        rotateZ: 6,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: { each: 0.014, from: 'start' }
      }, '-=0.35')
      .from('.hero__lede', { autoAlpha: 0, y: 26, duration: 0.7, ease: 'power3.out' }, '-=0.55')
      .from('.hero__actions .btn', { autoAlpha: 0, y: 24, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, '-=0.45')
      .from('.ticket', { autoAlpha: 0, y: 30, duration: 0.7, ease: 'power3.out' }, '-=0.4')
      .from('.hero__base', { autoAlpha: 0, duration: 1.2, ease: 'power2.out' }, '-=1.2')
      .from('.hero__scroll', { autoAlpha: 0, duration: 0.6 }, '-=0.4');
  }

  window.addEventListener('load', () => setTimeout(bootIntro, 250));
  /* safety net if load never fires (cached CDN edge cases) */
  setTimeout(() => { if (document.body.contains(preloader)) bootIntro(); }, 4000);

  /* ------------------------------------------------------------------
     3. Ember particle canvas (hero)
     ------------------------------------------------------------------ */
  const canvas = document.getElementById('emberCanvas');
  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let embers = [];
    let running = true;

    /* embers are drawn additively on dark; on white they have to subtract,
       so the palette darkens and the composite mode flips */
    const PALETTES = {
      dark:  ['#ffc21f', '#ff8c1a', '#ff5f1f', '#fff0c4'],
      light: ['#e8590c', '#d9430a', '#b52d08', '#ff8c1a']
    };
    const isLight = () => html.getAttribute('data-theme') === 'light';

    function resize() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round(Math.min(150, Math.max(45, w / 11)));
      embers = Array.from({ length: count }, () => spawn(true));
    }

    function spawn(scatter) {
      return {
        x: Math.random() * w,
        y: scatter ? Math.random() * h : h + Math.random() * 60,
        r: Math.random() * 2.2 + 0.5,
        vy: -(Math.random() * 0.75 + 0.22),
        vx: (Math.random() - 0.5) * 0.35,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: Math.random() * 0.02 + 0.005,
        life: 0,
        maxLife: Math.random() * 380 + 220,
        tone: (Math.random() * 4) | 0
      };
    }

    function tick() {
      if (!running) return;
      const light = isLight();
      const palette = light ? PALETTES.light : PALETTES.dark;
      const tail = light ? 'rgba(181,45,8,0)' : 'rgba(255,95,31,0)';

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.life++;
        e.drift += e.driftSpeed;
        e.x += e.vx + Math.sin(e.drift) * 0.4;
        e.y += e.vy;

        const fade = 1 - e.life / e.maxLife;
        if (fade <= 0 || e.y < -20) { embers[i] = spawn(false); continue; }

        const alpha = Math.max(0, Math.min(1, fade)) * (light ? 0.55 : 0.85);
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
        g.addColorStop(0, palette[e.tone]);
        g.addColorStop(1, tail);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener('resize', () => { dpr = Math.min(window.devicePixelRatio || 1, 2); resize(); });

    /* stop burning CPU once the hero is off screen */
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => {
        running = self.isActive;
        if (running) tick();
      }
    });
  }

  /* ------------------------------------------------------------------
     4. Ember cursor
     ------------------------------------------------------------------ */
  const cursor = document.getElementById('cursorEmber');
  if (cursor && window.matchMedia('(pointer:fine)').matches && !reduced) {
    const setX = gsap.quickTo(cursor, 'x', { duration: 0.5, ease: 'power3' });
    const setY = gsap.quickTo(cursor, 'y', { duration: 0.5, ease: 'power3' });

    window.addEventListener('mousemove', (e) => {
      gsap.to(cursor, { autoAlpha: 1, duration: 0.3, overwrite: 'auto' });
      setX(e.clientX);
      setY(e.clientY);
    });
    window.addEventListener('mouseout', () => gsap.to(cursor, { autoAlpha: 0, duration: 0.3 }));

    document.querySelectorAll('a, button, .pcard, .give__card, .event').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hot'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hot'));
    });
  }

  /* ------------------------------------------------------------------
     4b. Theme toggle — dark is the default and is NOT persisted, so every
         page load (and every refresh) starts dark. Light lasts for the
         current view only.
     ------------------------------------------------------------------ */
  const themer = document.getElementById('themeToggle');

  function applyTheme(theme) {
    const light = theme === 'light';

    if (light) html.setAttribute('data-theme', 'light');
    else html.removeAttribute('data-theme');

    themer.setAttribute('aria-pressed', String(light));
    const label = light ? 'Switch to dark mode' : 'Switch to light mode';
    themer.setAttribute('aria-label', label);
    themer.setAttribute('title', label);
  }

  applyTheme('dark');

  themer.addEventListener('click', () => {
    const goingLight = html.getAttribute('data-theme') !== 'light';
    applyTheme(goingLight ? 'light' : 'dark');

    if (!reduced) {
      gsap.fromTo(themer,
        { rotate: goingLight ? -90 : 90, scale: 0.85 },
        { rotate: 0, scale: 1, duration: 0.6, ease: 'back.out(2)' }
      );
    }
  });

  /* ------------------------------------------------------------------
     5. Nav — stuck state, mobile drawer, smooth anchors
     ------------------------------------------------------------------ */
  const nav = document.getElementById('nav');
  const navLinks = document.getElementById('navLinks');
  const burger = document.getElementById('burger');

  ScrollTrigger.create({
    start: 'top -80',
    end: 99999,
    onUpdate: (self) => nav.classList.toggle('is-stuck', self.scroll() > 80)
  });

  function closeMenu() {
    navLinks.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      const y = target.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ------------------------------------------------------------------
     6. Burning fuse — scroll progress
     ------------------------------------------------------------------ */
  const fuseBurn = document.getElementById('fuseBurn');
  const fuseSpark = document.getElementById('fuseSpark');

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const p = self.progress;
      fuseBurn.style.width = (p * 100) + '%';
      fuseSpark.style.left = (p * 100) + '%';
      fuseSpark.style.opacity = p > 0.005 && p < 0.999 ? '1' : '0';
    }
  });

  /* ------------------------------------------------------------------
     7. Hero parallax on scroll (scrubbed)
     ------------------------------------------------------------------ */
  if (!reduced) {
    gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
    })
      .to('.hero__content', { yPercent: 26, autoAlpha: 0.15, ease: 'none' }, 0)
      .to('.hero__glow', { yPercent: -12, ease: 'none' }, 0);
  }

  /* ------------------------------------------------------------------
     8. Generic reveals — headings char-by-char, blocks fade up
     ------------------------------------------------------------------ */
  document.querySelectorAll('.h2').forEach((h) => {
    const chars = h.querySelectorAll('.char');
    if (!chars.length) return;
    gsap.from(chars, {
      scrollTrigger: { trigger: h, start: 'top 85%' },
      yPercent: 110,
      rotateZ: 5,
      autoAlpha: 0,
      duration: 0.85,
      ease: 'expo.out',
      stagger: 0.016
    });
  });

  document.querySelectorAll('.reveal-up').forEach((el) => {
    if (el.closest('.hero')) { gsap.set(el, { autoAlpha: 1 }); return; }
    gsap.fromTo(el,
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      }
    );
  });

  /* ------------------------------------------------------------------
     9. Crest — slow scrub rotation + scale
     ------------------------------------------------------------------ */
  if (!reduced) {
    gsap.fromTo('.crest__img',
      { scale: 0.82, rotate: -8, autoAlpha: 0 },
      {
        scale: 1, rotate: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: '.about', start: 'top 70%' }
      }
    );
    gsap.to('.crest', {
      yPercent: -14, ease: 'none',
      scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: 0.8 }
    });
  }

  /* ------------------------------------------------------------------
     10. Marquee — infinite loop, direction follows scroll
     ------------------------------------------------------------------ */
  const track = document.getElementById('marqueeTrack');
  if (track && !reduced) {
    const loop = gsap.to(track, {
      xPercent: -50,
      duration: 26,
      ease: 'none',
      repeat: -1
    });

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const dir = self.direction;
        gsap.to(loop, { timeScale: dir, duration: 0.4, overwrite: true });
      }
    });
  }

  /* ------------------------------------------------------------------
     11. Stat counters
     ------------------------------------------------------------------ */
  document.querySelectorAll('.stat__num').forEach((el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    /* data-suffix="+" reads as "20+ years" — the tween rewrites textContent
       every frame, so the suffix has to be re-appended each time */
    const suffix = el.dataset.suffix || '';

    /* figures the foundation has not published yet render as an em dash */
    if (target === 0) { el.textContent = '—'; return; }

    el.textContent = '0' + suffix;

    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 2.2,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toLocaleString('en-US') + suffix;
      }
    });
  });

  /* ------------------------------------------------------------------
     12. Programs — pinned horizontal scroll (desktop only)
     ------------------------------------------------------------------ */
  const mm = gsap.matchMedia();

  mm.add('(min-width: 901px)', () => {
    const pin = document.getElementById('programsPin');
    const trackEl = document.getElementById('programsTrack');
    if (!pin || !trackEl) return;

    const getDistance = () => Math.max(0, trackEl.scrollWidth - window.innerWidth + 48);

    const tween = gsap.to(trackEl, {
      x: () => -getDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        pin: true,
        scrub: 0.8,
        start: 'top top',
        end: () => '+=' + (getDistance() + window.innerHeight * 0.4),
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });

    /* each card lights up as it enters the viewport horizontally */
    gsap.utils.toArray('.pcard').forEach((card, i) => {
      gsap.from(card, {
        y: 70,
        autoAlpha: 0,
        rotateY: 8,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: card,
          containerAnimation: tween,
          start: 'left 92%'
        }
      });
      gsap.to(card.querySelector('.pcard__num'), {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          containerAnimation: tween,
          start: 'left right',
          end: 'right left',
          scrub: true
        }
      });
    });

    return () => gsap.set(trackEl, { clearProps: 'all' });
  });

  mm.add('(max-width: 900px)', () => {
    gsap.utils.toArray('.pcard').forEach((card) => {
      gsap.fromTo(card,
        { autoAlpha: 0, y: 50 },
        {
          autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%' }
        }
      );
    });
  });

  /* ------------------------------------------------------------------
     13. Pointer-tracked flame glow on cards
     ------------------------------------------------------------------ */
  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.pcard, .give__card').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });

      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rx(px * 9);
        ry(-py * 7);
      });
      card.addEventListener('mouseleave', () => { rx(0); ry(0); });
      gsap.set(card, { transformPerspective: 900, transformStyle: 'preserve-3d' });
    });
  }

  /* ------------------------------------------------------------------
     14. Events timeline — burning line + row stagger
     ------------------------------------------------------------------ */
  const fill = document.getElementById('timelineFill');
  if (fill) {
    gsap.fromTo(fill, { height: '0%' }, {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.timeline',
        start: 'top 75%',
        end: 'bottom 70%',
        scrub: 0.5
      }
    });
  }

  gsap.utils.toArray('.event').forEach((row) => {
    gsap.from(row.querySelector('.event__spark'), {
      scale: 0,
      autoAlpha: 0,
      duration: 0.6,
      ease: 'back.out(2.4)',
      scrollTrigger: { trigger: row, start: 'top 82%' }
    });
  });

  /* ------------------------------------------------------------------
     15. Donate cards + footer flame reveal
     ------------------------------------------------------------------ */
  gsap.from('.give__card', {
    y: 60,
    autoAlpha: 0,
    duration: 0.85,
    ease: 'power3.out',
    stagger: 0.12,
    scrollTrigger: { trigger: '.give', start: 'top 85%' }
  });

  if (!reduced) {
    gsap.fromTo('.footer__fire',
      { yPercent: 40, autoAlpha: 0 },
      {
        yPercent: 0, autoAlpha: 0.55, ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 }
      }
    );
    gsap.from('.stats__fire', {
      scaleY: 0.3, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'center center', scrub: 0.6 }
    });
  }

  /* ------------------------------------------------------------------
     16. Contact form (front-end only — wire to a real endpoint later)
     ------------------------------------------------------------------ */
  const form = document.getElementById('contactForm');
  const note = document.getElementById('cformNote');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);

    if (!data.get('name') || !data.get('email') || !data.get('message')) {
      note.textContent = 'Please fill in every field so we can reach you.';
      gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.35)' });
      return;
    }

    note.textContent = 'Thank you — your message is ready to send. Connect this form to an email service to deliver it.';
    form.reset();
  });

  /* ------------------------------------------------------------------
     17. Recalculate after fonts settle
     ------------------------------------------------------------------ */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
