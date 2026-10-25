/* Merchexp — site behaviour. No dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Fit wordmarks edge to edge ---------- */
  var fitEls = [].slice.call(document.querySelectorAll('.wordmark.fit'));
  function fit() {
    fitEls.forEach(function (el) {
      var box = el.parentElement.clientWidth;
      var cs = getComputedStyle(el.parentElement);
      box -= parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      var size = parseFloat(getComputedStyle(el).fontSize);
      var w = el.getBoundingClientRect().width;
      if (w > 0 && box > 0) el.style.fontSize = (size * box / w).toFixed(2) + 'px';
    });
  }

  /* ---------- Hero intro once fonts are ready (so the fit doesn't jump) ---------- */
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(function () {
    fit();
    requestAnimationFrame(function () { root.classList.add('is-loaded'); });
  });
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fit, 100);
  });
  // Fonts can finish after the race timeout on slow connections.
  if (document.fonts) fontsReady.then(fit);

  /* ---------- Small dynamic text ---------- */
  var now = new Date();
  var month = now.toLocaleString('en-US', { month: 'long' }) + ' ' + now.getFullYear();
  document.querySelectorAll('[data-month]').forEach(function (el) { el.textContent = month; });
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = now.getFullYear(); });

  /* ---------- Scroll reveals ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Header: hide on scroll down, show on scroll up ---------- */
  var header = document.getElementById('header');
  var lastY = window.scrollY;
  var ticking = false;

  /* ---------- Quote: scroll-linked word fill ---------- */
  var fillEl = document.querySelector('[data-fill]');
  var words = [];
  if (fillEl) {
    var parts = fillEl.textContent.trim().split(/\s+/);
    fillEl.setAttribute('aria-label', fillEl.textContent.trim());
    fillEl.innerHTML = parts.map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
    words = [].slice.call(fillEl.querySelectorAll('.w'));
  }

  /* ---------- Hero parallax ---------- */
  var parallax = document.querySelector('[data-parallax] .well__media');

  function onScroll() {
    var y = window.scrollY;
    var vh = window.innerHeight;

    if (!document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > lastY && y > vh * 0.6);
    }
    lastY = y;

    if (words.length) {
      var r = fillEl.getBoundingClientRect();
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.3);
      var lit = reduceMotion ? words.length : Math.round(Math.max(0, Math.min(1, p)) * words.length);
      words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
    }

    if (parallax && !reduceMotion && y < vh * 1.2) {
      parallax.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0)';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Active nav link ---------- */
  var navLinks = document.querySelectorAll('.site-nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'services', 'work', 'tour', 'expansion', 'contact'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) navIO.observe(s);
    });
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
    header.classList.remove('is-hidden');
    if (open) {
      menu.hidden = false;
      menu.animate && !reduceMotion && menu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      menu.querySelectorAll('.menu__nav a').forEach(function (a, i) {
        a.animate && !reduceMotion && a.animate(
          [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }],
          { duration: 600, delay: 60 + i * 60, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'backwards' }
        );
      });
      menu.querySelector('a').focus();
    } else {
      menu.hidden = true;
    }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- Accordion ---------- */
  document.querySelectorAll('.acc__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.acc');
      var open = !item.classList.contains('is-open');
      document.querySelectorAll('.acc.is-open').forEach(function (other) {
        if (other === item) return;
        other.classList.remove('is-open');
        other.querySelector('.acc__btn').setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Contact form ---------- */
  var form = document.getElementById('brief');
  var dialog = document.getElementById('sent-dialog');
  if (form) {
    var errorEl = form.querySelector('.brief__error');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name, email = form.elements.email;
      var bad = [];
      [name, email].forEach(function (f) {
        var ok = f.value.trim() && f.checkValidity();
        f.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) bad.push(f);
      });
      if (bad.length) {
        errorEl.textContent = bad.length === 2 ? 'We need your name and a valid email.' : bad[0] === name ? 'We need your name.' : 'That email doesn’t look right.';
        bad[0].focus();
        return;
      }
      errorEl.textContent = '';

      var data = new FormData(form);
      var endpoint = form.getAttribute('data-endpoint');
      if (endpoint) {
        var submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error(res.status);
            showDialog('Message received', 'Someone from the studio will reply within two working days.');
            form.reset();
          })
          .catch(function () { errorEl.textContent = 'That didn’t send. Email us at info@merchexp.com instead.'; })
          .then(function () { submit.disabled = false; });
        return;
      }

      var lines = [
        'Name: ' + data.get('name'),
        'Email: ' + data.get('email'),
        'Artist / Brand: ' + (data.get('artist') || '—'),
        'Service: ' + data.get('service'),
        'Tour or launch date: ' + (data.get('date') || '—'),
        '',
        data.get('message') || ''
      ];
      var subject = 'Brief — ' + (data.get('artist') || data.get('name'));
      window.location.href = 'mailto:' + form.getAttribute('data-mailto') +
        '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      showDialog('Almost there', 'Your email app should open with the brief filled in — hit send and someone from the studio will reply within two working days.');
    });
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity() && e.target.value.trim()) {
        e.target.setAttribute('aria-invalid', 'false');
      }
    });
  }

  /* ---------- Hero art: a live show, drawn in code ---------- */
  (function () {
    var canvas = document.querySelector('.hero__art');
    if (!canvas || !canvas.getContext) return;
    var well = canvas.closest('.hero__well');
    var hint = well && well.querySelector('.hero__hint');
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, visible = true, pointer = 0, pointerTarget = 0;
    var rows = [], haze = [], tees = [], flashes = [];
    var stage = {}, screen = {}, booth = {}, masks = {}, nextTee = 3, lastT = 0;
    var BPM = 104;
    var INK = '11,11,11', BONE = '241,239,234';

    // Seeded random so the crowd is the same on every visit; Math.random for the show itself.
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function rand(a, b) { return a + Math.random() * (b - a); }

    function layout() {
      seed = 7; rows = []; haze = [];
      var unit = Math.max(14, Math.min(W, 1400) / 46);
      var portrait = H > W;
      // The merch stand: LED sign on top, a lit wall of merch, staff behind the counter.
      stage = { y: H * 0.6, x0: W * (portrait ? 0.04 : 0.18), x1: W * (portrait ? 0.96 : 0.82), truss: H * 0.07 };
      var bw = stage.x1 - stage.x0, pitch = Math.max(2.6, bw / 120);
      screen = { x: stage.x0, w: bw, pitch: pitch, cols: Math.floor(bw / pitch), rows: 11 };
      screen.h = screen.rows * pitch; screen.y = stage.truss + H * 0.06;
      buildMasks();
      booth = { x0: stage.x0, x1: stage.x1, w: bw, wallTop: screen.y + screen.h + H * 0.015, wallBottom: stage.y };
      var wallH = booth.wallBottom - booth.wallTop;
      var g = Math.min(wallH * 0.36, bw / 10);
      var nRows = Math.max(1, Math.min(3, Math.floor(wallH / (g * 1.12))));
      var capsW = g * 0.9, boardW = portrait ? 0 : g * 1.5;
      var left = booth.x0 + capsW + g * 0.2, right = booth.x1 - boardW - g * 0.2;
      var per = Math.max(1, Math.floor((right - left) / (g * 1.12))), gap = (right - left) / per;
      var FILLS = ['#E6E3DC', '#3E3E3C', '#C4C0B8', '#E6E3DC', '#4A4A48', '#A19D96'];
      var PRINTS = ['circle', 'ring', 'star', 'bars', 'sun', 'none'];
      booth.g = g; booth.items = []; booth.capsX = booth.x0 + g * 0.15; booth.boardX = right + g * 0.2; booth.boardW = boardW;
      booth.rails = [];
      for (var rr = 0; rr < nRows; rr++) {
        var rowY = booth.wallTop + (rr + 0.5) * (wallH / nRows) + g * 0.06;
        booth.rails.push(rowY - g * 0.55);
        for (var k = 0; k < per; k++) {
          booth.items.push({ x: left + gap * (k + 0.5), y: rowY, kind: rr % 2 ? 'hoodie' : 'tee', fill: FILLS[Math.floor(rnd() * FILLS.length)], print: PRINTS[Math.floor(rnd() * PRINTS.length)], sway: rnd() * 6.28 });
        }
      }
      booth.staff = [0.3, 0.55, 0.78].map(function (f) { return { x: booth.x0 + bw * f, s: g * 0.36 * (0.9 + rnd() * 0.2) }; });

      var ROWS = 6;
      for (var r = 0; r < ROWS; r++) {
        var depth = r / (ROWS - 1), size = unit * (0.45 + depth * 0.95), y = H * (0.645 + depth * 0.32);
        var people = [], x = -size * rnd();
        while (x < W + size) {
          var raised = rnd() < 0.3;
          people.push({ x: x, y: y + (rnd() - 0.5) * size * 0.35, s: size * (0.85 + rnd() * 0.3), phase: rnd() * 6.28, raised: raised, side: rnd() < 0.5 ? -1 : 1, phone: raised && rnd() < 0.75, hype: 0.4 + rnd() * 0.6 });
          x += size * (0.95 + rnd() * 0.7);
        }
        rows.push({ depth: depth, people: people, shade: Math.round(34 - depth * 26) });
      }
      for (var i = 0; i < 9; i++) haze.push({ x: rnd() * W, y: H * (0.2 + rnd() * 0.45), r: Math.max(W, H) * (0.18 + rnd() * 0.25), v: (rnd() - 0.5) * 0.012, a: 0.03 + rnd() * 0.035 });
    }

    // Sign text rendered once at LED resolution, kept as on/off masks.
    function buildMask(text) {
      var c = document.createElement('canvas'), cols = screen.cols, rws = screen.rows;
      c.width = cols; c.height = rws;
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      var fs = rws * 0.95, font = function () { return '800 ' + fs + 'px Archivo, "Helvetica Neue", Arial, sans-serif'; };
      x.font = font();
      while (x.measureText(text).width > cols * 0.92 && fs > 4) { fs -= 0.5; x.font = font(); }
      x.fillText(text, cols / 2, rws / 2 + 0.5);
      var d = x.getImageData(0, 0, cols, rws).data, m = new Uint8Array(cols * rws);
      for (var i = 0; i < cols * rws; i++) m[i] = d[i * 4 + 3] > 110 ? 1 : 0;
      return m;
    }
    function buildMasks() { masks = { official: buildMask('OFFICIAL MERCH'), brand: buildMask('MERCHEXP') }; }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      layout();
      draw(performance.now());
    }

    function beam(x0, y0, angle, spread, len, alpha) {
      var g = ctx.createLinearGradient(x0, y0, x0 + Math.sin(angle) * len, y0 + Math.cos(angle) * len);
      g.addColorStop(0, 'rgba(' + BONE + ',' + alpha + ')');
      g.addColorStop(0.55, 'rgba(' + BONE + ',' + (alpha * 0.25).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + BONE + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.sin(angle - spread) * len, y0 + Math.cos(angle - spread) * len);
      ctx.lineTo(x0 + Math.sin(angle + spread) * len, y0 + Math.cos(angle + spread) * len);
      ctx.closePath(); ctx.fill();
    }

    function glow(x, y, r, a) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + BONE + ',' + a + ')'); g.addColorStop(1, 'rgba(' + BONE + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function tee(x, y, size, rot, fill) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(size / 80, size / 80);
      ctx.beginPath();
      ctx.moveTo(-22, -38); ctx.lineTo(-8, -43); ctx.quadraticCurveTo(0, -34, 8, -43); ctx.lineTo(22, -38);
      ctx.lineTo(40, -22); ctx.lineTo(30, -9); ctx.lineTo(22, -15); ctx.lineTo(22, 40); ctx.lineTo(-22, 40);
      ctx.lineTo(-22, -15); ctx.lineTo(-30, -9); ctx.lineTo(-40, -22); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.restore();
    }

    function person(p, t, fill, kick, shift) {
      var s = p.s, sway = Math.sin(t * 1.6 + p.phase) * s * 0.18;
      var bob = Math.sin(t * 2.2 + p.phase) * s * 0.03;
      var hx = p.x + shift, hy = p.y - s * 1.05 + bob;
      ctx.fillStyle = fill; ctx.strokeStyle = fill;
      ctx.beginPath();
      ctx.moveTo(hx - s * 0.85, H + 2);
      ctx.lineTo(hx - s * 0.85, hy + s * 0.95);
      ctx.quadraticCurveTo(hx - s * 0.8, hy + s * 0.55, hx - s * 0.18, hy + s * 0.5);
      ctx.lineTo(hx - s * 0.16, hy + s * 0.2); ctx.lineTo(hx + s * 0.16, hy + s * 0.2); ctx.lineTo(hx + s * 0.18, hy + s * 0.5);
      ctx.quadraticCurveTo(hx + s * 0.8, hy + s * 0.55, hx + s * 0.85, hy + s * 0.95);
      ctx.lineTo(hx + s * 0.85, H + 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy, s * 0.38, 0, 6.283); ctx.fill();
      if (!p.raised) return null;
      var sx = hx + p.side * s * 0.55, sy = hy + s * 0.75;
      var tx = sx + p.side * s * 0.25 + sway, ty = sy - s * 1.75;
      ctx.lineWidth = s * 0.26; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + p.side * s * 0.45, sy - s * 0.9, tx, ty); ctx.stroke();
      return p.phone ? [tx, ty - s * 0.12] : null;
    }

    function drawSign(t, kick, bar) {
      var S = screen, p = S.pitch, dot = Math.max(1.3, p * 0.66);
      glow(S.x + S.w / 2, S.y + S.h / 2, S.w * 0.6, 0.06 + kick * 0.03);
      ctx.fillStyle = '#060606'; ctx.fillRect(S.x - p, S.y - p, S.w + p * 2, S.h + p * 2);
      // Alternate the two messages every two bars, with a sweep of light across the dots.
      var mask = Math.floor(bar / 2) % 2 ? masks.brand : masks.official, sweep = ((t * 0.6) % 1.6) - 0.3;
      for (var c = 0; c < S.cols; c++) {
        var f = c / S.cols, shine = Math.max(0, 1 - Math.abs(f - sweep) * 8);
        for (var r = 0; r < S.rows; r++) {
          var a = mask[r * S.cols + c] ? 0.8 + 0.2 * shine : 0.05 + 0.08 * shine;
          ctx.fillStyle = 'rgba(' + BONE + ',' + a.toFixed(2) + ')';
          ctx.fillRect(S.x + c * p, S.y + r * p, dot, dot);
        }
      }
    }

    function hoodie(x, y, size, fill) {
      ctx.save(); ctx.translate(x, y); ctx.scale(size / 80, size / 80);
      ctx.beginPath();
      ctx.moveTo(-24, -34); ctx.quadraticCurveTo(-14, -50, 0, -50); ctx.quadraticCurveTo(14, -50, 24, -34);
      ctx.lineTo(36, -26); ctx.lineTo(44, 30); ctx.lineTo(32, 32); ctx.lineTo(26, -6); ctx.lineTo(26, 42); ctx.lineTo(-26, 42);
      ctx.lineTo(-26, -6); ctx.lineTo(-32, 32); ctx.lineTo(-44, 30); ctx.lineTo(-36, -26); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, 20); ctx.lineTo(14, 20); ctx.lineTo(17, 34); ctx.lineTo(-17, 34); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }

    function print(kind, x, y, s, light) {
      ctx.fillStyle = ctx.strokeStyle = light ? 'rgba(18,18,18,.75)' : 'rgba(241,239,234,.8)';
      ctx.lineWidth = Math.max(1, s * 0.03);
      var r = s * 0.13;
      ctx.beginPath();
      if (kind === 'circle') { ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
      else if (kind === 'ring') { ctx.arc(x, y, r, 0, 6.283); ctx.stroke(); }
      else if (kind === 'sun') { ctx.arc(x, y + r * 0.3, r, Math.PI, 0); ctx.fill(); ctx.fillRect(x - r, y + r * 0.5, r * 2, r * 0.18); ctx.fillRect(x - r, y + r * 0.85, r * 2, r * 0.18); }
      else if (kind === 'bars') { for (var i = 0; i < 3; i++) ctx.fillRect(x - r, y - r + i * r * 0.75, r * 2, r * 0.35); }
      else if (kind === 'star') { for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r * 0.45 : r * 1.1; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); }
    }

    function drawBooth(t, kick, bi, bar) {
      var B = booth, g = B.g, wallH = B.wallBottom - B.wallTop;
      // Back wall: dark mesh panel lit from above.
      ctx.fillStyle = '#101010'; ctx.fillRect(B.x0, B.wallTop, B.w, wallH);
      var wash = ctx.createLinearGradient(0, B.wallTop, 0, B.wallBottom);
      wash.addColorStop(0, 'rgba(' + BONE + ',' + (0.12 + kick * 0.03).toFixed(3) + ')'); wash.addColorStop(1, 'rgba(' + BONE + ',.02)');
      ctx.fillStyle = wash; ctx.fillRect(B.x0, B.wallTop, B.w, wallH);
      ctx.strokeStyle = 'rgba(' + BONE + ',.05)'; ctx.lineWidth = 1; ctx.beginPath();
      for (var mx = B.x0; mx <= B.x1; mx += g * 0.35) { ctx.moveTo(mx, B.wallTop); ctx.lineTo(mx, B.wallBottom); }
      for (var my = B.wallTop; my <= B.wallBottom; my += g * 0.35) { ctx.moveTo(B.x0, my); ctx.lineTo(B.x1, my); }
      ctx.stroke();
      // Rails and hanging merch, swaying a touch.
      ctx.strokeStyle = 'rgba(' + BONE + ',.35)'; ctx.lineWidth = 1.5;
      B.rails.forEach(function (ry) { ctx.beginPath(); ctx.moveTo(B.x0 + g, ry); ctx.lineTo(B.x1 - B.boardW - g * 0.1, ry); ctx.stroke(); });
      B.items.forEach(function (it) {
        var sw = Math.sin(t * 0.9 + it.sway) * 0.03, top = it.y - g * 0.55;
        ctx.strokeStyle = 'rgba(' + BONE + ',.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(it.x, top - g * 0.02); ctx.lineTo(it.x, top + g * 0.06); ctx.stroke();
        ctx.save(); ctx.translate(it.x, top); ctx.rotate(sw); ctx.translate(-it.x, -top);
        if (it.kind === 'tee') tee(it.x, it.y, g, 0, it.fill); else hoodie(it.x, it.y, g * 0.95, it.fill);
        if (it.print !== 'none') print(it.print, it.x, it.y - g * 0.08, g, it.fill === '#E6E3DC' || it.fill === '#C4C0B8' || it.fill === '#A19D96');
        ctx.restore();
      });
      // Caps on pegs down the left.
      for (var ci = 0; ci < Math.max(1, Math.floor(wallH / (g * 0.5))); ci++) {
        var cy = B.wallTop + g * 0.4 + ci * g * 0.5, cx = B.capsX + g * 0.35;
        if (cy > B.wallBottom - g * 0.2) break;
        ctx.fillStyle = ci % 2 ? '#E6E3DC' : '#4A4A48';
        ctx.beginPath(); ctx.arc(cx, cy, g * 0.22, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillRect(cx - g * 0.22, cy - 1, g * 0.38, g * 0.06);
      }
      // Price board.
      if (B.boardW) {
        var bx = B.boardX, by = B.wallTop + g * 0.25, bwid = B.boardW - g * 0.1, bh = Math.min(wallH - g * 0.5, g * 2.6);
        ctx.fillStyle = '#E6E3DC'; ctx.fillRect(bx, by, bwid, bh);
        ctx.fillStyle = 'rgba(18,18,18,.65)';
        for (var li = 0; li < 7; li++) {
          var ly = by + bh * 0.12 + li * bh * 0.12;
          if (ly > by + bh - bh * 0.1) break;
          ctx.fillRect(bx + bwid * 0.1, ly, bwid * (0.42 + (li % 3) * 0.08), Math.max(1.5, bh * 0.035));
          ctx.fillRect(bx + bwid * 0.72, ly, bwid * 0.18, Math.max(1.5, bh * 0.035));
        }
      }
      // String lights along the top of the wall.
      ctx.globalCompositeOperation = 'lighter';
      for (var sx = B.x0 + g * 0.3; sx < B.x1; sx += g * 0.6) {
        var sy = B.wallTop + 3 + Math.sin((sx - B.x0) / (g * 0.6) * Math.PI) * 2;
        glow(sx, sy, g * 0.35, (0.28 + kick * 0.15).toFixed(3));
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      // Staff behind the counter; one holds up a tee every few bars.
      B.staff.forEach(function (p, i) {
        var s = p.s, hx = p.x + Math.sin(t * 0.5 + i * 2) * g * 0.3, hy = B.wallBottom - s * 1.55;
        ctx.fillStyle = '#080808'; ctx.strokeStyle = '#080808';
        ctx.beginPath(); ctx.arc(hx, hy, s * 0.38, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx - s * 0.85, B.wallBottom + 2); ctx.quadraticCurveTo(hx - s * 0.85, hy + s * 0.55, hx, hy + s * 0.5); ctx.quadraticCurveTo(hx + s * 0.85, hy + s * 0.55, hx + s * 0.85, B.wallBottom + 2); ctx.fill();
        if (i === 1 && bar % 4 === 0) {
          ctx.lineWidth = s * 0.26; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(hx + s * 0.55, hy + s * 0.75); ctx.lineTo(hx + s * 0.7, hy - s * 0.9); ctx.stroke();
          tee(hx + s * 0.7, hy - s * 1.35, g * 0.8, Math.sin(t * 3) * 0.1, '#E6E3DC');
        }
      });
      // Counter with folded stacks.
      var cH = H * 0.06;
      ctx.fillStyle = '#0b0b0b'; ctx.fillRect(B.x0 - g * 0.2, B.wallBottom, B.w + g * 0.4, cH);
      ctx.fillStyle = 'rgba(' + BONE + ',' + (0.3 + kick * 0.2).toFixed(2) + ')'; ctx.fillRect(B.x0 - g * 0.2, B.wallBottom, B.w + g * 0.4, 1.5);
      for (var fx = B.x0 + g * 0.2; fx < B.x1 - g * 0.5; fx += g * 0.7) {
        var tone = Math.floor((fx - B.x0) / (g * 0.7)) % 3;
        ctx.fillStyle = tone === 0 ? '#E6E3DC' : tone === 1 ? '#4A4A48' : '#A19D96';
        for (var st = 0; st < 3; st++) ctx.fillRect(fx, B.wallBottom - (st + 1) * g * 0.07, g * 0.5, g * 0.06);
      }
    }

    function fireTee(tx, ty, scale) {
      var fromLeft = tx < W / 2;
      // Launched from behind the counter.
      tees.push({ x0: fromLeft ? stage.x0 + booth.w * 0.15 : stage.x1 - booth.w * 0.15, y0: stage.y - booth.g * 0.4, x1: tx, y1: ty, u: 0, dur: 1.5, spin: rand(4, 9) * (fromLeft ? 1 : -1), size: Math.max(22, Math.min(W, 1400) / 30) * (scale || 1) });
    }

    function step(dt, t, beatIndex, bar) {
      if (t > nextTee) { fireTee(rand(W * 0.12, W * 0.88), rand(H * 0.68, H * 0.86)); nextTee = t + rand(4, 7); }
      tees = tees.filter(function (o) {
        o.u += dt / o.dur;
        if (o.u >= 1) { flashes.push({ x: o.x1, y: o.y1, a: 1 }); return false; }
        return true;
      });
      flashes = flashes.filter(function (f) { f.a -= dt * 1.6; return f.a > 0; });
    }

    function draw(now) {
      if (!W) return;
      var t = now / 1000, dt = lastT ? Math.min(0.05, t - lastT) : 0.016; lastT = t;
      var beat = t * BPM / 60, bi = Math.floor(beat), ph = beat - bi, kick = Math.exp(-ph * 5), bar = Math.floor(bi / 4);
      if (reduceMotion) { kick = 0.3; }
      else step(dt, t, bi, bar);
      pointer += (pointerTarget - pointer) * 0.05;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0B0B0B'); bg.addColorStop(0.55, '#161616'); bg.addColorStop(1, '#0B0B0B');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'lighter';
      haze.forEach(function (h) {
        h.x += h.v * 16; if (h.x - h.r > W) h.x = -h.r; if (h.x + h.r < 0) h.x = W + h.r;
        glow(h.x, h.y, h.r, h.a + kick * 0.01);
      });

      ctx.globalCompositeOperation = 'source-over';
      drawSign(t, kick, bar);

      // Stage rig: a truss with fixtures, and their beams.
      ctx.globalCompositeOperation = 'lighter';
      var rig = [0.08, 0.27, 0.5, 0.73, 0.92], len = H * 1.25, beamA = 0.13 + kick * 0.07;
      rig.forEach(function (fx, i) {
        var x0 = W * fx, dir = i % 2 ? 1 : -1;
        var angle = Math.sin(t * 0.35 + i * 1.3) * 0.55 * dir + pointer * 0.35;
        beam(x0, stage.truss, angle, 0.06 + 0.02 * Math.sin(t + i), len, beamA);
        beam(x0, stage.truss, angle, 0.018, len, beamA + 0.06);
        glow(x0, stage.truss, 40, 0.5);
      });
      // Lasers fan down from the rig for two bars in every eight.
      if (bar % 8 === 4 || bar % 8 === 5) {
        var lx = W / 2, ly = stage.truss, n = 11, sweep = Math.sin(t * 1.4) * 0.5;
        for (var k = 0; k < n; k++) {
          var ang = Math.PI / 2 + (k / (n - 1) - 0.5) * 2.2 + sweep;
          var ex = lx + Math.cos(ang) * W * 1.2, ey = ly + Math.sin(ang) * W * 1.2;
          ctx.strokeStyle = 'rgba(' + BONE + ',.05)'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ex, ey); ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, stage.truss - 5, W, 7);
      ctx.strokeStyle = 'rgba(' + BONE + ',.1)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var tx = 0; tx < W; tx += 14) { ctx.moveTo(tx, stage.truss - 5); ctx.lineTo(tx + 7, stage.truss + 2); }
      ctx.stroke();
      rig.forEach(function (fx) { ctx.fillStyle = '#111'; ctx.fillRect(W * fx - 7, stage.truss - 2, 14, 10); });

      // Stage glow on the horizon so the crowd reads as silhouettes.
      ctx.globalCompositeOperation = 'lighter';
      var sy = stage.y + H * 0.03, band = ctx.createLinearGradient(0, sy - H * 0.2, 0, sy + H * 0.12);
      band.addColorStop(0, 'rgba(230,227,220,0)'); band.addColorStop(0.7, 'rgba(230,227,220,' + (0.2 + kick * 0.06).toFixed(3) + ')'); band.addColorStop(1, 'rgba(230,227,220,0)');
      ctx.fillStyle = band; ctx.fillRect(0, sy - H * 0.2, W, H * 0.32);
      ctx.globalCompositeOperation = 'source-over';
      drawBooth(t, kick, bi, bar);

      // T-shirts in flight (behind the front rows once they come down).
      function drawTees(front) {
        tees.forEach(function (o) {
          if ((o.u > 0.7) !== front) return;
          var x = o.x0 + (o.x1 - o.x0) * o.u, y = o.y0 + (o.y1 - o.y0) * o.u - Math.sin(Math.PI * o.u) * H * 0.42;
          var sc = o.size * (0.6 + o.u * 0.6);
          tee(x, y, sc, o.u * o.spin, '#E6E3DC');
        });
      }
      drawTees(false);

      var phones = [];
      rows.forEach(function (row, ri) {
        var c = row.shade, shift = pointer * row.depth * 10;
        row.people.forEach(function (p) {
          var ph2 = person(p, t, 'rgb(' + c + ',' + c + ',' + (c - 1) + ')', kick, shift);
          if (ph2) phones.push([ph2[0], ph2[1], p.phase, row.depth]);
        });
        if (ri === 2) drawTees(true);
      });

      ctx.globalCompositeOperation = 'lighter';
      phones.forEach(function (q) {
        var flick = 0.7 + 0.3 * Math.sin(t * 3 + q[2] * 3), core = 1 + q[3] * 2.2;
        glow(q[0], q[1], core * 7, (0.32 * flick).toFixed(3));
        ctx.beginPath(); ctx.arc(q[0], q[1], core, 0, 6.283);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * flick).toFixed(3) + ')'; ctx.fill();
      });
      flashes.forEach(function (f) { glow(f.x, f.y, 60, (0.5 * f.a).toFixed(3)); });

      ctx.globalCompositeOperation = 'source-over';
      // Strobe on the first beat of every other bar.
      if (!reduceMotion && bi % 8 === 0) { ctx.fillStyle = 'rgba(' + BONE + ',' + (kick * 0.1).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }

      var floor = ctx.createLinearGradient(0, H * 0.82, 0, H);
      floor.addColorStop(0, 'rgba(' + INK + ',0)'); floor.addColorStop(1, 'rgba(' + INK + ',.9)');
      ctx.fillStyle = floor; ctx.fillRect(0, H * 0.82, W, H * 0.18);
    }

    function frame(now) {
      if (!visible) { lastT = 0; return; }
      draw(now);
      requestAnimationFrame(frame);
    }
    window.addEventListener('pointermove', function (e) { pointerTarget = (e.clientX / window.innerWidth - 0.5) * 2; }, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    if (!reduceMotion) {
      // Tap or click: fire a bigger tee at that spot.
      canvas.addEventListener('click', function (e) {
        var b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
        fireTee(x, Math.max(y, stage.y + H * 0.05), 1.8);
        if (hint) hint.classList.add('is-hidden');
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (W) buildMasks(); });
    resize();
    if (reduceMotion) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var was = visible; visible = es[0].isIntersecting;
        if (visible && !was) requestAnimationFrame(frame);
      }).observe(canvas);
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- Service art: one live canvas per service ---------- */
  (function () {
    var BONE = '241,239,234';
    function ease(x) { x = Math.max(0, Math.min(1, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function seg(p, a, b) { return Math.max(0, Math.min(1, (p - a) / (b - a))); }
    function teePath(ctx, x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s / 80, s / 80);
      ctx.beginPath();
      ctx.moveTo(-22, -38); ctx.lineTo(-8, -43); ctx.quadraticCurveTo(0, -34, 8, -43); ctx.lineTo(22, -38);
      ctx.lineTo(40, -22); ctx.lineTo(30, -9); ctx.lineTo(22, -15); ctx.lineTo(22, 40); ctx.lineTo(-22, 40);
      ctx.lineTo(-22, -15); ctx.lineTo(-30, -9); ctx.lineTo(-40, -22); ctx.closePath();
      ctx.restore();
    }
    function label(ctx, text, x, y, a, align) {
      ctx.font = '700 9px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.textAlign = align || 'left';
      ctx.fillStyle = 'rgba(' + BONE + ',' + (a == null ? .5 : a) + ')';
      ctx.fillText(text.split('').join(String.fromCharCode(8202)), x, y);
      ctx.textAlign = 'left';
    }
    // The mark that gets designed and printed: a sun over three stripes inside a ring.
    function mark(ctx, cx, cy, r, color, progress) {
      var p = progress == null ? 1 : progress;
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1.2, r * 0.07);
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * seg(p, 0, .45)); ctx.stroke();
      var sun = seg(p, .45, .7);
      if (sun) { ctx.beginPath(); ctx.arc(cx, cy + r * .1, r * .45, Math.PI, Math.PI + Math.PI * sun); ctx.lineTo(cx, cy + r * .1); ctx.closePath(); ctx.fill(); }
      for (var i = 0; i < 3; i++) {
        var w = seg(p, .7 + i * .1, .8 + i * .1);
        if (w) ctx.fillRect(cx - r * .45, cy + r * (.22 + i * .17), r * .9 * w, r * .09);
      }
    }

    var SCENES = {
      // Design on the left, screen printing on the right, looping every 6.5 seconds.
      design: function (ctx, W, H, t, state) {
        var L = 6.5, p = t % L, cycle = Math.floor(t / L);
        ctx.fillStyle = '#1A1A1A'; ctx.fillRect(0, 0, W, H);
        // blueprint grid
        ctx.strokeStyle = 'rgba(' + BONE + ',.045)'; ctx.lineWidth = 1; ctx.beginPath();
        for (var gx = 0; gx < W; gx += 16) { ctx.moveTo(gx + .5, 0); ctx.lineTo(gx + .5, H); }
        for (var gy = 0; gy < H; gy += 16) { ctx.moveTo(0, gy + .5); ctx.lineTo(W, gy + .5); }
        ctx.stroke();

        var narrow = W < 460, split = W * (narrow ? .4 : .46), r = Math.min(H * .26, split * .3);
        // --- 01 Design: an artboard where the mark is drawn with a pen tool
        var ab = { x: W * .05, y: H * .17, w: split - W * .08, h: H * .68 };
        label(ctx, '01  DESIGN', ab.x, H * .1);
        ctx.strokeStyle = 'rgba(' + BONE + ',.18)'; ctx.setLineDash([3, 3]); ctx.strokeRect(ab.x + .5, ab.y + .5, ab.w, ab.h); ctx.setLineDash([]);
        var cx = ab.x + ab.w / 2, cy = ab.y + ab.h / 2, draw = ease(seg(p, .2, 2));
        mark(ctx, cx, cy, r, 'rgba(' + BONE + ',.95)', draw);
        // anchor points and the pen cursor while drawing
        if (draw < 1) {
          var ang = -Math.PI / 2 + Math.PI * 2 * Math.min(1, draw / .45);
          var px = draw < .45 ? cx + Math.cos(ang) * r : cx + r * (.45 - .9 * seg(draw, .45, 1)), py = draw < .45 ? cy + Math.sin(ang) * r : cy + r * (.1 + .5 * seg(draw, .45, 1));
          ctx.fillStyle = '#1A1A1A'; ctx.strokeStyle = 'rgba(' + BONE + ',.9)'; ctx.lineWidth = 1;
          [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]].forEach(function (a) { ctx.fillRect(a[0] - 2.5, a[1] - 2.5, 5, 5); ctx.strokeRect(a[0] - 2.5, a[1] - 2.5, 5, 5); });
          ctx.beginPath(); ctx.moveTo(px - r * .3, py); ctx.lineTo(px + r * .3, py); ctx.stroke();
          ctx.beginPath(); ctx.arc(px - r * .3, py, 2, 0, 6.283); ctx.arc(px + r * .3, py, 2, 0, 6.283); ctx.fill();
          // pen nib cursor
          ctx.save(); ctx.translate(px + 6, py + 6); ctx.rotate(-.6);
          ctx.fillStyle = 'rgba(' + BONE + ',.95)'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(4, 3); ctx.lineTo(0, 7); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        label(ctx, 'ARTWORK_V' + (3 + cycle % 7) + '.AI', ab.x, ab.y + ab.h + 14, .35);

        // --- 02 Production: screen-printing press
        var m = W * .05, px0 = split + W * .04, pw = W - px0 - m;
        label(ctx, '02  PRODUCTION', px0, H * .1);
        var teeS = Math.min(H * .5, pw * (narrow ? .5 : .4)), tx = px0 + pw * (narrow ? .34 : .36), ty = H * .58;
        var stackW = teeS * .5, stackX = W - m - stackW / 2, stackY = ty + teeS * .48;
        // platen
        ctx.fillStyle = '#242424'; ctx.fillRect(tx - teeS * .55, ty + teeS * .52, teeS * 1.1, 6);
        function shirt(x, y, s, prog, alpha) {
          ctx.save(); ctx.globalAlpha = alpha;
          teePath(ctx, x, y, s); ctx.fillStyle = '#E6E3DC'; ctx.fill();
          if (prog > 0) {
            teePath(ctx, x, y, s); ctx.clip();
            ctx.beginPath(); ctx.rect(x - s, 0, s * 2 * prog, H); ctx.clip();
            mark(ctx, x, y - s * .12, s * .2, '#121212', 1);
          }
          ctx.restore();
        }
        var sq = ease(seg(p, 2.6, 3.4)), out = ease(seg(p, 4.9, 5.6)), inn = ease(seg(p, 5.8, 6.4));
        if (p < 4.9) shirt(tx, ty, teeS, p < 2.6 ? 0 : sq, 1);
        else if (p < 5.6) {
          // the printed tee shrinks and folds onto the stack
          shirt(tx + (stackX - tx) * out, ty + (stackY - 12 - ty) * out, teeS * (1 - out * .55), 1, 1 - out * .8);
        } else if (p >= 5.8) shirt(tx, ty - (1 - inn) * H * .08, teeS, 0, inn);
        // the screen frame comes down over the tee, then lifts
        // Like a real press, the screen is hinged at the back: it tilts up out of the way, then down onto the tee.
        var fw = teeS * .9, fhFull = teeS * .62, fyDown = ty - teeS * .5;
        var down = ease(seg(p, 2, 2.5)) - ease(seg(p, 3.6, 4.1));
        var fh = fhFull * (.18 + .82 * down), fy = fyDown - (1 - down) * teeS * .32;
        ctx.strokeStyle = 'rgba(' + BONE + ',.75)'; ctx.lineWidth = 3; ctx.strokeRect(tx - fw / 2, fy, fw, fh);
        ctx.fillStyle = 'rgba(' + BONE + ',.06)'; ctx.fillRect(tx - fw / 2, fy, fw, fh);
        // hinge arm
        ctx.fillStyle = '#2E2E2D'; ctx.fillRect(tx - fw * .08, fy - 10, fw * .16, 10);
        // the burned stencil, visible once the screen is down
        ctx.save(); ctx.globalAlpha = .35 * down; ctx.translate(tx, fy + fh * .55); ctx.scale(1, Math.max(.05, fh / fhFull)); mark(ctx, 0, 0, teeS * .2, 'rgba(' + BONE + ',1)', 1); ctx.restore();
        // artwork flies from the artboard to the screen
        var fly = seg(p, 1.95, 2.35);
        if (fly > 0 && fly < 1) {
          var e = ease(fly), mx = cx + (tx - cx) * e, my = cy + (fyDown + fhFull * .55 - cy) * e - Math.sin(Math.PI * e) * H * .25;
          ctx.save(); ctx.globalAlpha = 1 - e * .4; mark(ctx, mx, my, r * (1 - e * .4), 'rgba(' + BONE + ',.9)', 1); ctx.restore();
        }
        // squeegee sweeping across, with its handle
        if (p > 2.5 && p < 3.6) {
          var sx = tx - fw / 2 + fw * sq;
          ctx.fillStyle = 'rgba(' + BONE + ',.95)'; ctx.fillRect(sx - 3, fy - 10, 6, fh + 14);
          ctx.fillStyle = '#0B0B0B'; ctx.fillRect(sx - 9, fy - 16, 18, 8);
        }
        // the folded stack and its counter
        var landed = p > 5.5, count = 1240 + cycle + (landed ? 1 : 0), layers = 6 + (landed ? 1 : 0);
        for (var k = 0; k < layers; k++) { ctx.fillStyle = k % 2 ? '#C4C0B8' : '#E6E3DC'; ctx.fillRect(stackX - stackW / 2, stackY - k * 6, stackW, 4.5); }
        label(ctx, 'UNITS', W - m, stackY - layers * 6 - 20, .45, 'right');
        label(ctx, String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ','), W - m, stackY - layers * 6 - 8, .8, 'right');
        if (p > 3.3 && p < 4.9) label(ctx, 'PRINTED', tx, ty + teeS * .52 + 22, .6, 'center');
      },
      // A tour route on top; at each stop the merch table opens, the line moves and sizes sell through.
      tour: function (ctx, W, H, t) {
        var CITIES = ['SAN JUAN', 'MIAMI', 'MEXICO CITY', 'BOGOTÁ', 'MADRID', 'LONDON', 'TOKYO'];
        var L = 8, cycle = Math.floor(t / L), p = t % L, ci = cycle % CITIES.length;
        var narrow = W < 460, m = W * .05;
        ctx.fillStyle = '#1A1A1A'; ctx.fillRect(0, 0, W, H);

        // --- route strip
        var ry = H * .15, rx0 = m, rx1 = W - m, n = CITIES.length;
        var stopX = function (i) { return rx0 + (rx1 - rx0) * (i / (n - 1)); };
        ctx.strokeStyle = 'rgba(' + BONE + ',.18)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(rx1, ry); ctx.stroke(); ctx.setLineDash([]);
        var travel = ease(seg(p, 0, 1.2)), from = (ci + n - 1) % n;
        var vanX = ci === 0 ? stopX(0) - (1 - travel) * 30 : stopX(from) + (stopX(ci) - stopX(from)) * travel;
        for (var i = 0; i < n; i++) {
          var done = i < ci || (i === ci && travel === 1);
          ctx.beginPath(); ctx.arc(stopX(i), ry, i === ci ? 4 : 3, 0, 6.283);
          ctx.fillStyle = done ? 'rgba(' + BONE + ',.95)' : '#1A1A1A'; ctx.fill();
          ctx.strokeStyle = 'rgba(' + BONE + ',' + (done ? .95 : .35) + ')'; ctx.stroke();
          if (!narrow || i === ci) label(ctx, CITIES[i], stopX(i), ry - 10, i === ci ? .85 : .3, i === 0 ? 'left' : i === n - 1 ? 'right' : 'center');
        }
        // the van
        ctx.fillStyle = 'rgba(' + BONE + ',.95)';
        ctx.fillRect(vanX - 9, ry + 6, 18, 8); ctx.fillRect(vanX + 5, ry + 8, 6, 6);
        ctx.fillStyle = '#1A1A1A'; ctx.beginPath(); ctx.arc(vanX - 5, ry + 15, 2, 0, 6.283); ctx.arc(vanX + 7, ry + 15, 2, 0, 6.283); ctx.fill();

        // --- sales simulation for this stop
        var SIZES = ['S', 'M', 'L', 'XL', '2XL'], START = [4, 5, 5, 3, 2];
        var open = p > 1.2, STEP = .36, k = open ? Math.floor((p - 1.2) / STEP) : 0, q = open ? ((p - 1.2) % STEP) / STEP : 0;
        if (p > 7.4) { k = Math.floor((7.4 - 1.2) / STEP); q = 1; }
        // Which size each sale takes: mediums go first, as they do.
        var stock = START.slice();
        function sizeFor(j) { var h = Math.abs(Math.sin((j + 1) * 12.9898 + cycle * 78.233) * 43758.5453) % 1; var w = [.18, .32, .26, .15, .09], acc = 0; for (var s = 0; s < 5; s++) { acc += w[s]; if (h < acc) return s; } return 4; }
        var sold = 0;
        for (var j = 0; j < k; j++) { var s0 = sizeFor(j); while (stock[s0] === 0) s0 = (s0 + 1) % 5; stock[s0]--; sold++; }

        // --- merch table with the line
        var split = narrow ? W * .62 : W * .64, groundY = H * .9;
        var tableX = m, tableW = (split - m) * .26, tableY = groundY - H * .24;
        // banner
        ctx.fillStyle = open ? 'rgba(' + BONE + ',.92)' : '#0B0B0B'; ctx.fillRect(tableX, tableY - H * .34, tableW * 1.1, H * .1);
        label(ctx, open ? 'MERCH' : 'DOORS SOON', tableX + tableW * .55, tableY - H * .275, open ? 1 : .4, 'center');
        if (open) { ctx.fillStyle = '#121212'; ctx.font = '700 9px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('M E R C H', tableX + tableW * .55, tableY - H * .275); ctx.textAlign = 'left'; }
        // staff behind the table
        ctx.fillStyle = '#0F0F0F'; ctx.beginPath(); ctx.arc(tableX + tableW * .5, tableY - H * .12, H * .055, 0, 6.283); ctx.fill();
        ctx.fillRect(tableX + tableW * .5 - H * .075, tableY - H * .07, H * .15, H * .08);
        // table
        ctx.fillStyle = '#2B2B2A'; ctx.fillRect(tableX - tableW * .1, tableY, tableW * 1.2, H * .03);
        ctx.fillStyle = '#121212'; ctx.fillRect(tableX - tableW * .05, tableY + H * .03, tableW * 1.1, groundY - tableY - H * .03);
        for (var st = 0; st < 3; st++) { ctx.fillStyle = st % 2 ? '#C4C0B8' : '#E6E3DC'; ctx.fillRect(tableX + tableW * (.05 + st * .32), tableY - 5, tableW * .26, 4); }
        // the line: fans step forward after each sale
        var gap = Math.max(18, (split - tableX - tableW * 1.3) / 6), fanS = Math.min(H * .095, gap * .5), front = tableX + tableW * 1.3;
        var step = open && p <= 7.4 ? ease(Math.min(1, q * 2)) : 0;
        for (var f = -1; f < 8; f++) {
          var x = front + gap * (f + 1 - step), alpha = 1;
          if (f === -1) { if (!open || q > .5 || p > 7.4) continue; alpha = 1 - q * 2; x = front - gap * q * 1.2; }
          if (x > split - fanS) continue;
          var bob = Math.sin(t * 3 + f) * 1.2, hy = groundY - fanS * 2.6 + bob;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = f % 3 === 0 ? '#3A3A38' : f % 3 === 1 ? '#2E2E2D' : '#444442';
          ctx.beginPath(); ctx.arc(x, hy, fanS * .45, 0, 6.283); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x - fanS * .8, groundY); ctx.lineTo(x - fanS * .8, hy + fanS * 1.1); ctx.quadraticCurveTo(x - fanS * .7, hy + fanS * .55, x, hy + fanS * .55); ctx.quadraticCurveTo(x + fanS * .7, hy + fanS * .55, x + fanS * .8, hy + fanS * 1.1); ctx.lineTo(x + fanS * .8, groundY); ctx.fill();
          // the one leaving holds up their new tee
          if (f === -1) { teePath(ctx, x, hy - fanS * 1.5, fanS * 1.9); ctx.fillStyle = 'rgba(230,227,220,' + alpha + ')'; ctx.fill(); }
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = 'rgba(' + BONE + ',.12)'; ctx.fillRect(m, groundY, split - m, 1);

        // --- live stats: units, revenue and stock by size
        var sx0 = split + W * .03, sw = W - m - sx0;
        var perStop = Math.floor((7.4 - 1.2) / STEP), units = 900 + cycle * perStop + sold, revenue = units * 42;
        label(ctx, p > 7.4 ? 'SETTLED ✓' : 'TOUR TO DATE', sx0, H * .34, p > 7.4 ? .9 : .45);
        ctx.font = '700 ' + Math.round(Math.min(H * .1, sw * .2)) + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.fillStyle = 'rgba(' + BONE + ',.95)'; ctx.fillText('$' + revenue.toLocaleString('en-US'), sx0, H * .34 + Math.min(H * .1, sw * .2) + 4);
        label(ctx, units.toLocaleString('en-US') + ' UNITS', sx0, H * .34 + Math.min(H * .1, sw * .2) + 20, .6);
        var bx0 = sx0, bw = sw / 5, bTop = H * .6, bBottom = groundY - 12;
        for (var s = 0; s < 5; s++) {
          var cx = bx0 + bw * s + bw * .5, frac = stock[s] / START[s], hgt = (bBottom - bTop) * frac;
          ctx.fillStyle = 'rgba(' + BONE + ',.1)'; ctx.fillRect(cx - bw * .28, bTop, bw * .56, bBottom - bTop);
          ctx.fillStyle = stock[s] ? 'rgba(' + BONE + ',.9)' : 'rgba(' + BONE + ',0)'; ctx.fillRect(cx - bw * .28, bBottom - hgt, bw * .56, hgt);
          label(ctx, SIZES[s], cx, groundY + 2, stock[s] ? .6 : .9, 'center');
          if (!stock[s]) {
            ctx.save(); ctx.translate(cx, (bTop + bBottom) / 2); ctx.rotate(-Math.PI / 2);
            label(ctx, 'SOLD OUT', 0, 3, .9, 'center'); ctx.restore();
          }
        }
      },
      // Online store → packed box → delivered to the fan's doorstep, looping every 6 seconds.
      ecom: function (ctx, W, H, t) {
        var L = 6, cycle = Math.floor(t / L), p = t % L, narrow = W < 460, m = W * .05;
        var COUNTRIES = ['PR', 'MX', 'US', 'CO', 'ES', 'DO', 'CL', 'AR', 'GB', 'JP'];
        ctx.fillStyle = '#1A1A1A'; ctx.fillRect(0, 0, W, H);
        var zone = (W - 2 * m) / 3, z0 = m, z1 = m + zone, z2 = m + zone * 2, base = H * .86;
        label(ctx, narrow ? '01 SHOP' : '01  ONLINE', z0, H * .1); label(ctx, narrow ? '02 PACK' : '02  FULFILLMENT', z1 + zone * .08, H * .1); label(ctx, narrow ? '03 HOME' : '03  DELIVERY', z2 + zone * .1, H * .1);

        // --- 01 phone storefront
        var ph = Math.min(H * .66, zone * 1.25), pw = ph * .52, px = z0 + Math.min(zone * .12, 10), py = H * .18;
        ctx.fillStyle = '#0B0B0B'; ctx.strokeStyle = 'rgba(' + BONE + ',.4)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, pw * .14); ctx.fill(); ctx.stroke();
        var sx = px + pw * .08, sy = py + ph * .1, sw = pw * .84;
        label(ctx, 'SHOP', sx, sy + 4, .7);
        // cart with badge
        var cartN = 2 + (p > .9 ? 1 : 0), cx = sx + sw - 6, cy = sy;
        ctx.strokeStyle = 'rgba(' + BONE + ',.8)'; ctx.lineWidth = 1.2; ctx.strokeRect(cx - 5, cy - 4, 10, 7);
        var pop = p > .9 && p < 1.3 ? 1 + Math.sin((p - .9) / .4 * Math.PI) * .5 : 1;
        ctx.fillStyle = 'rgba(' + BONE + ',.95)'; ctx.beginPath(); ctx.arc(cx + 6, cy - 6, 4.5 * pop, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#0B0B0B'; ctx.font = '700 7px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(cartN), cx + 6, cy - 3.6); ctx.textAlign = 'left';
        // 2×2 product grid
        var cell = sw / 2, gy = sy + 12;
        for (var i = 0; i < 4; i++) {
          var gx = sx + (i % 2) * cell, gyy = gy + Math.floor(i / 2) * cell * 1.15;
          ctx.fillStyle = '#242424'; ctx.fillRect(gx + 2, gyy, cell - 4, cell - 4);
          teePath(ctx, gx + cell / 2, gyy + (cell - 4) / 2, cell * .62); ctx.fillStyle = ['#E6E3DC', '#4A4A48', '#C4C0B8', '#E6E3DC'][i]; ctx.fill();
          ctx.fillStyle = 'rgba(' + BONE + ',.25)'; ctx.fillRect(gx + 2, gyy + cell - 1, (cell - 4) * .6, 2);
        }
        // add-to-cart button, with a tap
        var by = gy + cell * 2.35, tapped = p > .6 && p < 1.4;
        ctx.fillStyle = tapped ? 'rgba(' + BONE + ',.95)' : 'rgba(' + BONE + ',.15)'; ctx.fillRect(sx, by, sw, 12);
        ctx.font = '700 6.5px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = tapped ? '#0B0B0B' : 'rgba(' + BONE + ',.8)';
        ctx.fillText(tapped ? 'ADDED ✓' : 'ADD TO CART', sx + sw / 2, by + 8.5); ctx.textAlign = 'left';
        var fingerX = sx + sw * .55, fingerY = by + 6 + (1 - ease(seg(p, .2, .6))) * 30;
        if (p < 1.2) {
          if (p > .55 && p < .9) { ctx.strokeStyle = 'rgba(' + BONE + ',' + (1 - seg(p, .55, .9)) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(fingerX, by + 6, 6 + seg(p, .55, .9) * 12, 0, 6.283); ctx.stroke(); }
          ctx.fillStyle = 'rgba(' + BONE + ',.9)'; ctx.beginPath(); ctx.arc(fingerX, fingerY, 5, 0, 6.283); ctx.fill();
        }
        // new-order toast
        var delivered = p > 4.7, toast = delivered ? ease(seg(p, 4.8, 5.1)) - ease(seg(p, 5.8, 6)) : ease(seg(p, 1.1, 1.4)) - ease(seg(p, 2.8, 3.1));
        if (toast > 0) {
          var ty = py + ph - 26 - 8 * (1 - toast);
          ctx.globalAlpha = toast;
          ctx.fillStyle = 'rgba(' + BONE + ',.95)'; ctx.fillRect(sx, ty, sw, 18);
          ctx.fillStyle = '#0B0B0B'; ctx.font = '700 6.5px "Helvetica Neue", Arial, sans-serif';
          ctx.fillText(delivered ? 'DELIVERED ✓' : (narrow ? 'ORDER · ' : 'NEW ORDER · ') + COUNTRIES[cycle % COUNTRIES.length], sx + 4, ty + 7.5);
          ctx.fillStyle = 'rgba(11,11,11,.6)'; ctx.fillText('#' + (10480 + cycle), sx + 4, ty + 15);
          ctx.globalAlpha = 1;
        }

        // --- 02 box being packed
        var bxC = z1 + zone * .5, boxW = Math.min(zone * .55, H * .32), boxH = boxW * .62, boxTop = base - boxH;
        var doorX = z2 + zone * .1 + zone * .9 * .3, travel = ease(seg(p, 3.6, 4.6)), boxX = bxC + (doorX + zone * .16 - bxC) * travel, shrink = 1 - travel * .5;
        // conveyor
        ctx.fillStyle = '#242424'; ctx.fillRect(z1 + zone * .05, base, zone * 1.4, 5);
        for (var r = 0; r < 9; r++) { ctx.fillStyle = '#121212'; ctx.beginPath(); ctx.arc(z1 + zone * .1 + r * zone * .16 - (t * 30 % (zone * .16)) * (p > 3.6 && p < 4.6 ? 1 : 0), base + 2.5, 1.6, 0, 6.283); ctx.fill(); }
        // the tee flies from the phone into the box
        var fly = seg(p, 1.3, 2.1);
        if (fly > 0 && fly < 1) {
          var e = ease(fly), fx = sx + sw * .25 + (bxC - sx - sw * .25) * e, fy = gy + cell * .5 + (boxTop - gy - cell * .5) * e - Math.sin(Math.PI * e) * H * .22;
          teePath(ctx, fx, fy, boxW * (.55 - e * .1)); ctx.fillStyle = '#E6E3DC'; ctx.fill();
        }
        // --- 03 the fan's house: the box lands on the doorstep and the door opens to take it in
        var hX = z2 + zone * .1, hW = zone * .9, wallTop = H * .42, roofTop = H * .2;
        ctx.fillStyle = '#121212'; ctx.fillRect(hX + hW * .04, wallTop, hW * .92, base - wallTop);
        ctx.fillStyle = '#242424'; ctx.beginPath(); ctx.moveTo(hX - hW * .04, wallTop + 2); ctx.lineTo(hX + hW / 2, roofTop); ctx.lineTo(hX + hW * 1.04, wallTop + 2); ctx.closePath(); ctx.fill();
        ctx.fillRect(hX + hW * .72, roofTop + H * .02, hW * .1, H * .1);
        // window glows once the package is home
        var glowOn = .25 + .55 * ease(seg(p, 5.4, 5.8)) * (1 - seg(p, 5.95, 6));
        var wX = hX + hW * .58, wY = wallTop + (base - wallTop) * .18, wW = hW * .28, wH = (base - wallTop) * .32;
        ctx.fillStyle = 'rgba(' + BONE + ',' + glowOn.toFixed(2) + ')'; ctx.fillRect(wX, wY, wW, wH);
        ctx.fillStyle = '#121212'; ctx.fillRect(wX + wW / 2 - 1, wY, 2, wH); ctx.fillRect(wX, wY + wH / 2 - 1, wW, 2);
        // door: swings open, then shut
        var dW = hW * .22, dH = (base - wallTop) * .62, dX = doorX - dW / 2, dY = base - dH;
        var swing = ease(seg(p, 5.1, 5.4)) - ease(seg(p, 5.65, 5.95));
        ctx.fillStyle = 'rgba(' + BONE + ',' + (.08 + swing * .5).toFixed(2) + ')'; ctx.fillRect(dX, dY, dW, dH);
        ctx.fillStyle = '#3A3A38'; ctx.fillRect(dX, dY, dW * (1 - swing * .8), dH);
        ctx.fillStyle = 'rgba(' + BONE + ',.6)'; ctx.beginPath(); ctx.arc(dX + dW * (1 - swing * .8) - 4, dY + dH * .55, 1.6, 0, 6.283); ctx.fill();
        // doorstep and a bush
        ctx.fillStyle = '#2E2E2D'; ctx.fillRect(dX - dW * .25, base - 3, dW * 2.1, 3);
        ctx.fillStyle = '#1E1E1D'; ctx.beginPath(); ctx.arc(hX + hW * .12, base - 6, 8, Math.PI, 0); ctx.arc(hX + hW * .2, base - 7, 9, Math.PI, 0); ctx.fill();
        if (p < 5.7) {
          ctx.save(); ctx.globalAlpha = 1 - seg(p, 5.35, 5.65);
          var bounce = p > 4.6 && p < 4.9 ? Math.sin(seg(p, 4.6, 4.9) * Math.PI) * 6 : 0;
          var bw = boxW * shrink, bh = boxH * shrink, bX = boxX - bw / 2 - (p > 5.35 ? (boxX - doorX) * ease(seg(p, 5.35, 5.65)) : 0), bY = base - bh - bounce;
          ctx.fillStyle = '#8F8A80'; ctx.fillRect(bX, bY, bw, bh);
          ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(bX, bY, bw, bh * .18);
          // flaps fold shut
          var close = ease(seg(p, 2.2, 2.7)), flap = bw * .5;
          ctx.fillStyle = '#A39E94';
          [[-1, bX], [1, bX + bw]].forEach(function (f) {
            ctx.save(); ctx.translate(f[1], bY); ctx.rotate(f[0] * (-Math.PI * .75) * (1 - close));
            ctx.fillRect(f[0] < 0 ? 0 : -flap, -2, flap, 3); ctx.restore();
          });
          // tape and shipping label
          if (close === 1) { ctx.fillStyle = 'rgba(' + BONE + ',.35)'; ctx.fillRect(bX + bw / 2 - 2, bY - 1, 4, bh * .4); }
          var lab = ease(seg(p, 2.8, 3.2));
          if (lab) {
            var lw = bw * .42, lh = bh * .42, lx = bX + bw * .48, ly = bY + bh * .4 + (1 - lab) * -20;
            ctx.globalAlpha = lab; ctx.fillStyle = '#F1EFEA'; ctx.fillRect(lx, ly, lw, lh);
            ctx.fillStyle = '#121212';
            for (var b = 0; b < 9; b++) ctx.fillRect(lx + lw * .1 + b * lw * .09, ly + lh * .45, b % 3 ? 1 : 2, lh * .4);
            ctx.fillRect(lx + lw * .1, ly + lh * .15, lw * .55, 1.5);
            ctx.globalAlpha = 1;
          }
          ctx.restore();
        }

        // counters
        var orders = 3200 + cycle + (p > 4.7 ? 1 : 0);
        label(ctx, 'DELIVERED ' + orders.toLocaleString('en-US'), hX, base + 16, p > 4.7 && p < 5.6 ? 1 : .7);
        if (!narrow) label(ctx, '42 COUNTRIES', z0, base + 16, .4);
        if (!narrow) label(ctx, 'SHIPPED ✓', z1 + zone * .08, base + 16, p > 3.4 ? .8 : .25);
      },
      // The brand on the left gets licensed onto one product after another; each is stamped and shelved.
      licensing: function (ctx, W, H, t) {
        var PD = 2.6, n = Math.floor(t / PD), p = t % PD, narrow = W < 460, m = W * .05;
        var BONEFILL = '#E6E3DC', INKMARK = '#121212';
        ctx.fillStyle = '#1A1A1A'; ctx.fillRect(0, 0, W, H);

        // Each product draws itself around (x, y) at size s and returns where the logo sits on it.
        var PRODUCTS = [
          { name: 'FOOTWEAR', draw: function (x, y, s) {
            ctx.beginPath(); ctx.moveTo(x - s * .55, y + s * .2); ctx.lineTo(x - s * .5, y - s * .12); ctx.quadraticCurveTo(x - s * .35, y - s * .2, x - s * .18, y - s * .14);
            ctx.lineTo(x + s * .05, y - s * .02); ctx.quadraticCurveTo(x + s * .45, y + s * .02, x + s * .55, y + s * .14); ctx.lineTo(x + s * .55, y + s * .2); ctx.closePath();
            ctx.fillStyle = BONEFILL; ctx.fill(); ctx.fillStyle = '#4A4A48'; ctx.fillRect(x - s * .56, y + s * .2, s * 1.12, s * .07);
            return [x - s * .18, y + s * .05, s * .1]; } },
          { name: 'HEADWEAR', draw: function (x, y, s) {
            ctx.fillStyle = BONEFILL; ctx.beginPath(); ctx.arc(x, y + s * .1, s * .36, Math.PI, 0); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(x + s * .3, y + s * .1); ctx.quadraticCurveTo(x + s * .6, y + s * .08, x + s * .66, y + s * .16); ctx.lineTo(x + s * .3, y + s * .16); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.arc(x, y - s * .26, s * .03, 0, 6.283); ctx.fill();
            return [x - s * .05, y - s * .07, s * .12]; } },
          { name: 'HOMEWARE', draw: function (x, y, s) {
            ctx.fillStyle = BONEFILL; ctx.fillRect(x - s * .26, y - s * .3, s * .5, s * .55);
            ctx.strokeStyle = BONEFILL; ctx.lineWidth = s * .07; ctx.beginPath(); ctx.arc(x + s * .26, y - s * .03, s * .13, -Math.PI / 2, Math.PI / 2); ctx.stroke();
            return [x - s * .01, y - s * .03, s * .14]; } },
          { name: 'SKATE', draw: function (x, y, s) {
            ctx.fillStyle = BONEFILL; ctx.beginPath(); ctx.roundRect(x - s * .62, y - s * .1, s * 1.24, s * .2, s * .1); ctx.fill();
            ctx.fillStyle = '#4A4A48'; [-.38, .38].forEach(function (o) { ctx.beginPath(); ctx.arc(x + s * o - s * .08, y + s * .15, s * .045, 0, 6.283); ctx.arc(x + s * o + s * .08, y + s * .15, s * .045, 0, 6.283); ctx.fill(); });
            return [x, y, s * .08]; } },
          { name: 'COLLECTIBLES', draw: function (x, y, s) {
            ctx.fillStyle = BONEFILL;
            [[-.17, -.33], [.17, -.33]].forEach(function (e) { ctx.beginPath(); ctx.arc(x + s * e[0], y + s * e[1], s * .09, 0, 6.283); ctx.fill(); });
            ctx.beginPath(); ctx.arc(x, y - s * .2, s * .19, 0, 6.283); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x, y + s * .12, s * .24, s * .2, 0, 0, 6.283); ctx.fill();
            ctx.fillStyle = INKMARK; ctx.beginPath(); ctx.arc(x - s * .07, y - s * .23, s * .02, 0, 6.283); ctx.arc(x + s * .07, y - s * .23, s * .02, 0, 6.283); ctx.fill();
            return [x, y + s * .12, s * .11]; } },
          { name: 'ACCESSORIES', draw: function (x, y, s) {
            ctx.strokeStyle = BONEFILL; ctx.lineWidth = s * .035; ctx.beginPath(); ctx.arc(x, y - s * .22, s * .14, Math.PI, 0); ctx.stroke();
            ctx.fillStyle = BONEFILL; ctx.beginPath(); ctx.moveTo(x - s * .3, y - s * .22); ctx.lineTo(x + s * .3, y - s * .22); ctx.lineTo(x + s * .26, y + s * .3); ctx.lineTo(x - s * .26, y + s * .3); ctx.closePath(); ctx.fill();
            return [x, y + s * .04, s * .15]; } }
        ];

        // --- the brand
        var split = W * (narrow ? .36 : .34), bx = m + (split - m) / 2, by = H * .42, br = Math.min(H * .2, (split - m) * .3);
        label(ctx, '01  THE BRAND', m, H * .1);
        ctx.strokeStyle = 'rgba(' + BONE + ',.12)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(bx, by, br * 1.45, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
        var pulse = p > .45 && p < .7 ? 1 + Math.sin(seg(p, .45, .7) * Math.PI) * .06 : 1;
        mark(ctx, bx, by, br * pulse, 'rgba(' + BONE + ',.95)', 1);
        label(ctx, '© ARTIST', bx, by + br * 1.45 + 16, .45, 'center');

        // --- the product stage
        var sx0 = split + W * .04, sw = W - m - sx0, cx = sx0 + sw * .4, cy = H * .46, s = Math.min(H * .46, sw * .48);
        label(ctx, narrow ? '02 PRODUCT' : '02  LICENSED PRODUCT', sx0, H * .1);
        var prod = PRODUCTS[n % PRODUCTS.length];
        // a spotlight pool on the pedestal
        var g = ctx.createRadialGradient(cx, cy + s * .4, 0, cx, cy + s * .4, s * .7);
        g.addColorStop(0, 'rgba(' + BONE + ',.1)'); g.addColorStop(1, 'rgba(' + BONE + ',0)');
        ctx.fillStyle = g; ctx.fillRect(cx - s, cy - s * .4, s * 2, s * 1.2);
        ctx.fillStyle = '#242424'; ctx.fillRect(cx - s * .55, cy + s * .38, s * 1.1, 4);
        var inn = ease(seg(p, 0, .4)), out = ease(seg(p, 2.15, 2.55));
        var px = cx + (1 - inn) * sw * .5 - out * sw * .3, alpha = Math.min(inn, 1 - out);
        ctx.save(); ctx.globalAlpha = alpha;
        var spot = prod.draw(px, cy, s);
        if (p > 1.1) mark(ctx, spot[0], spot[1], spot[2], INKMARK, 1);
        ctx.restore();
        label(ctx, prod.name, cx - s * .1, cy + s * .38 + 18, .5 * alpha, 'center');
        // the mark flies from the brand onto the product
        var fly = seg(p, .5, 1.1);
        if (fly > 0 && fly < 1) {
          var e = ease(fly), fx = bx + (spot[0] - bx) * e, fy = by + (spot[1] - by) * e - Math.sin(Math.PI * e) * H * .2;
          mark(ctx, fx, fy, br + (spot[2] - br) * e, 'rgba(' + BONE + ',.9)', 1);
        }
        // LICENSED stamp slams down
        var st = seg(p, 1.3, 1.5);
        if (st > 0 && out < 1) {
          var sc = 1.8 - .8 * ease(st), sxp = px + s * .42, syp = cy + s * .3;
          ctx.save(); ctx.globalAlpha = Math.min(1, st * 2) * (1 - out); ctx.translate(sxp, syp); ctx.rotate(-.18); ctx.scale(sc, sc);
          ctx.strokeStyle = 'rgba(' + BONE + ',.95)'; ctx.lineWidth = 1.5; ctx.strokeRect(-34, -10, 68, 20);
          label(ctx, 'LICENSED ✓', 0, 3.5, .95, 'center');
          ctx.restore();
        }
        // royalties
        var deals = 120 + n + (p > 1.4 ? 1 : 0), roy = deals * 1850;
        label(ctx, 'ROYALTIES', W - m, H * .1, .45, 'right');
        ctx.font = '700 ' + Math.round(Math.min(H * .085, sw * .1)) + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(' + BONE + ',' + (p > 1.4 && p < 1.9 ? 1 : .85) + ')';
        ctx.fillText('$' + roy.toLocaleString('en-US'), W - m, H * .1 + Math.min(H * .085, sw * .1) + 6); ctx.textAlign = 'left';
        label(ctx, deals + ' PRODUCTS', W - m, H * .1 + Math.min(H * .085, sw * .1) + 20, .55, 'right');

        // --- the shelf of licensed products
        var shelfY = H * .9, slots = narrow ? 4 : 6, slotW = (W - 2 * m) / slots, ss = Math.min(slotW * .55, H * .14);
        ctx.fillStyle = 'rgba(' + BONE + ',.18)'; ctx.fillRect(m, shelfY, W - 2 * m, 1.5);
        var done = n + (out > .5 ? 1 : 0);
        for (var k = 0; k < slots; k++) {
          var idx = done - slots + k;
          if (idx < 0) continue;
          var it = PRODUCTS[idx % PRODUCTS.length], sxk = m + slotW * (k + .5);
          ctx.save(); ctx.globalAlpha = k === slots - 1 && out > .5 ? seg(out, .5, 1) : .55;
          var sp = it.draw(sxk, shelfY - ss * .45, ss);
          mark(ctx, sp[0], sp[1], sp[2], INKMARK, 1);
          ctx.restore();
        }
      },
      // A dot-matrix world: arcs leave the Puerto Rico HQ one by one and light up new markets.
      expansion: function (ctx, W, H, t, state) {
        var HQ = { name: 'PUERTO RICO', lon: -66.1, lat: 18.4 };
        var MARKETS = [
          ['MIAMI', -80.2, 25.8, 'STORE OPEN'], ['MEXICO CITY', -99.1, 19.4, 'LOCAL PRODUCTION'], ['BOGOTÁ', -74.1, 4.7, 'RETAIL PARTNER'],
          ['MADRID', -3.7, 40.4, 'STORE OPEN'], ['SÃO PAULO', -46.6, -23.5, 'POP-UP'], ['LONDON', -0.1, 51.5, 'RETAIL PARTNER'],
          ['LOS ANGELES', -118.2, 34.1, 'LICENSING'], ['BUENOS AIRES', -58.4, -34.6, 'STORE OPEN'], ['PARIS', 2.35, 48.9, 'POP-UP'],
          ['TOKYO', 139.7, 35.7, 'LICENSING'], ['BERLIN', 13.4, 52.5, 'LOCAL PRODUCTION'], ['SYDNEY', 151.2, -33.9, 'RETAIL PARTNER']
        ];
        var narrow = W < 460, m = W * .05;
        // Phones zoom in on the Americas and Europe; the far markets would be specks.
        var lonMin = narrow ? -128 : -165, lonMax = narrow ? 42 : 180, latMax = narrow ? 62 : 72, latMin = narrow ? -46 : -48;
        MARKETS = MARKETS.filter(function (mk) { return mk[1] > lonMin && mk[1] < lonMax; });
        var STEP = 1.4, HOLD = 2.4, L = MARKETS.length * STEP + HOLD, p = t % L;
        ctx.fillStyle = '#1A1A1A'; ctx.fillRect(0, 0, W, H);

        // Map frame and a cached dot grid of the land, rebuilt only when the size changes.
        var top = H * .2, bottom = H * .97, key = W + 'x' + H;
        if (state.key !== key) {
          state.key = key; state.dots = null;
          var sx = (W - 2 * m) / (lonMax - lonMin), sy = (bottom - top) / (latMax - latMin), k = Math.min(sx, sy * 1.15);
          var mapW = (lonMax - lonMin) * k, mapH = (latMax - latMin) * k / 1.15, ox = (W - mapW) / 2, oy = top + (bottom - top - mapH) / 2;
          state.proj = function (lon, lat) { return [ox + (lon - lonMin) * k, oy + (latMax - lat) * k / 1.15]; };
          state.box = [ox, oy, mapW, mapH, lonMin, latMax, k];
        }
        if (!state.dots && window.__mxWorld && window.d3 && window.topojson) {
          var b = state.box, off = document.createElement('canvas'), ow = Math.ceil(b[2]), oh = Math.ceil(b[3]);
          off.width = ow; off.height = oh;
          var octx = off.getContext('2d');
          var proj = d3.geoEquirectangular().scale(1).translate([0, 0]);
          // Map lon/lat straight onto the offscreen canvas with the same linear transform as state.proj.
          var land = topojson.feature(window.__mxWorld, window.__mxWorld.objects.countries);
          var path = d3.geoPath(d3.geoTransform({ point: function (lon, lat) { this.stream.point((lon - b[4]) * b[6], (b[5] - lat) * b[6] / 1.15); } }), octx);
          octx.fillStyle = '#fff'; octx.beginPath(); path(land); octx.fill();
          var data = octx.getImageData(0, 0, ow, oh).data, gap = Math.max(4, Math.round(W / 130)), dots = [];
          for (var yy = gap / 2; yy < oh; yy += gap) for (var xx = gap / 2; xx < ow; xx += gap) {
            if (data[(Math.floor(yy) * ow + Math.floor(xx)) * 4 + 3] > 100) dots.push([b[0] + xx, b[1] + yy]);
          }
          state.dots = dots; state.gap = gap;
        } else if (!window.__mxWorld && !state.loading) {
          state.loading = true;
          fetch('assets/data/world.json').then(function (r) { return r.json(); }).then(function (w) { window.__mxWorld = w; });
        }

        var proj2 = state.proj, hq = proj2(HQ.lon, HQ.lat);
        var opened = Math.min(MARKETS.length, Math.floor(p / STEP)), cur = p < MARKETS.length * STEP ? Math.floor(p / STEP) : -1, q = cur >= 0 ? (p % STEP) / STEP : 1;
        var fadeAll = 1 - seg(p, L - .5, L);
        var pts = MARKETS.map(function (mk) { return proj2(mk[1], mk[2]); });

        // land dots, brighter near markets that are open
        if (state.dots) {
          var ds = Math.max(1.4, state.gap * .42);
          for (var i = 0; i < state.dots.length; i++) {
            var d = state.dots[i], a = .13;
            for (var j = 0; j < opened; j++) { var dx = d[0] - pts[j][0], dy = d[1] - pts[j][1]; if (dx * dx + dy * dy < 900) { a = .13 + .3 * fadeAll; break; } }
            ctx.fillStyle = 'rgba(' + BONE + ',' + a.toFixed(2) + ')'; ctx.fillRect(d[0] - ds / 2, d[1] - ds / 2, ds, ds);
          }
        }

        function bez(a, b, u) {
          var cx2 = (a[0] + b[0]) / 2, cy2 = Math.min(a[1], b[1]) - Math.hypot(b[0] - a[0], b[1] - a[1]) * .3;
          var v = 1 - u; return [v * v * a[0] + 2 * v * u * cx2 + u * u * b[0], v * v * a[1] + 2 * v * u * cy2 + u * u * b[1]];
        }
        // arcs: finished ones faint, the current one drawing with a bright head
        for (var a2 = 0; a2 <= Math.min(opened, MARKETS.length - 1); a2++) {
          var isCur = a2 === cur, prog = isCur ? ease(seg(q, 0, .55)) : (a2 < opened ? 1 : 0);
          if (!prog) continue;
          ctx.strokeStyle = 'rgba(' + BONE + ',' + ((isCur ? .7 : .22) * fadeAll).toFixed(2) + ')'; ctx.lineWidth = isCur ? 1.4 : 1;
          ctx.beginPath(); ctx.moveTo(hq[0], hq[1]);
          for (var s2 = 1; s2 <= 40; s2++) { var u = prog * s2 / 40, pt = bez(hq, pts[a2], u); ctx.lineTo(pt[0], pt[1]); }
          ctx.stroke();
          if (isCur && prog < 1) { var hd = bez(hq, pts[a2], prog); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(hd[0], hd[1], 2.6, 0, 6.283); ctx.fill(); }
        }
        // market dots, with a ring burst on arrival
        for (var c = 0; c < MARKETS.length; c++) {
          var arrived = c < opened || (c === cur && q > .55);
          if (!arrived) continue;
          var P = pts[c];
          if (c === cur) { var rb = seg(q, .55, 1); ctx.strokeStyle = 'rgba(' + BONE + ',' + (1 - rb).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P[0], P[1], 3 + rb * 14, 0, 6.283); ctx.stroke(); }
          ctx.fillStyle = 'rgba(' + BONE + ',' + (.95 * fadeAll).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(P[0], P[1], 2.8, 0, 6.283); ctx.fill();
        }
        // HQ pulse
        var hp = (t % 1.6) / 1.6;
        ctx.strokeStyle = 'rgba(' + BONE + ',' + (.8 * (1 - hp)).toFixed(2) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hq[0], hq[1], 4 + hp * 16, 0, 6.283); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hq[0], hq[1], 4.2, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#1A1A1A'; ctx.beginPath(); ctx.arc(hq[0], hq[1], 1.6, 0, 6.283); ctx.fill();
        label(ctx, 'HQ', hq[0] + 9, hq[1] + 14, .7);

        // label card for the market that just opened
        if (cur >= 0 && q > .55) {
          var mk = MARKETS[cur], P2 = pts[cur], ca = ease(seg(q, .55, .75)) * (1 - seg(q, .92, 1));
          ctx.font = '700 9px "Helvetica Neue", Helvetica, Arial, sans-serif';
          var cw = Math.max(ctx.measureText(mk[0]).width, ctx.measureText(mk[3]).width) * 1.15 + 16, ch = 30;
          var lx = P2[0] + cw + 14 > W - 4 ? P2[0] - cw - 10 : P2[0] + 10, ly = Math.max(top, P2[1] - ch - 8);
          ctx.globalAlpha = ca;
          ctx.fillStyle = 'rgba(' + BONE + ',.95)'; ctx.fillRect(lx, ly, cw, ch);
          ctx.fillStyle = '#121212'; ctx.fillText(mk[0].split('').join(String.fromCharCode(8202)), lx + 8, ly + 12);
          ctx.fillStyle = 'rgba(18,18,18,.6)'; ctx.fillText(mk[3].split('').join(String.fromCharCode(8202)), lx + 8, ly + 23);
          ctx.globalAlpha = 1;
        }

        // header: label left, market counter right
        label(ctx, narrow ? 'FROM PUERTO RICO' : 'FROM PUERTO RICO TO THE WORLD', m, H * .1);
        var count = opened + (cur >= 0 && q > .55 ? 1 : 0) - (cur >= 0 && q > .55 && cur < opened ? 1 : 0);
        var fs = Math.round(Math.min(H * .1, W * .06));
        ctx.font = '700 ' + fs + 'px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(' + BONE + ',.95)'; ctx.fillText(String(count + 30), W - m, H * .07 + fs * .8);
        ctx.textAlign = 'left';
        label(ctx, 'MARKETS', W - m - ctx.measureText(String(count + 30)).width - 8, H * .07 + fs * .8, .5, 'right');
      }
    };

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.svc-art').forEach(function (canvas) {
      var scene = SCENES[canvas.getAttribute('data-art')];
      if (!scene) return;
      var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1, visible = false, running = false, t0 = performance.now(), state = {};
      function size() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth; H = canvas.clientHeight;
        if (!W || !H) return;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        render(reduceMotion ? 3.4 : (performance.now() - t0) / 1000);
      }
      function render(t) { if (!W) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); scene(ctx, W, H, t, state); }
      function frame(now) {
        if (!visible || reduceMotion) { running = false; return; }
        render((now - t0) / 1000);
        requestAnimationFrame(frame);
      }
      function start() { if (!running && visible && !reduceMotion) { running = true; requestAnimationFrame(frame); } }
      // Panels open and close, so watch the size as well as visibility.
      if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting && canvas.clientHeight > 0; if (visible) { size(); start(); } }).observe(canvas);
      } else { visible = true; start(); }
      size();
    });
  })();

  /* ---------- Merch carousel ---------- */
  (function () {
    var wrap = document.querySelector('.merch');
    var track = wrap && wrap.querySelector('.merch__track');
    if (!track) return;
    var x = 0, setW = 0, last = 0, hover = false, visible = false, drag = null, vel = 0;
    var SPEED = 0.045; // px per ms
    function measure() { setW = track.scrollWidth / 2; }
    function wrapX() { if (setW) { while (x <= -setW) x += setW; while (x > 0) x -= setW; } }
    function frame(now) {
      if (!visible) { last = 0; return; }
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      if (!drag) {
        // Glide after a flick, then settle back to the steady drift.
        vel *= Math.pow(0.94, dt / 16);
        var drift = reduceMotion || hover ? 0 : -SPEED;
        x += (Math.abs(vel) > 0.01 ? vel : drift) * dt;
      }
      wrapX();
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var was = visible; visible = es[0].isIntersecting;
        if (visible && !was) requestAnimationFrame(frame);
      }).observe(wrap);
    } else { visible = true; requestAnimationFrame(frame); }
    wrap.addEventListener('mouseenter', function () { hover = true; });
    wrap.addEventListener('mouseleave', function () { hover = false; });
    wrap.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, start: x, t: performance.now(), lx: e.clientX, moved: false };
      vel = 0;
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 4) return;
      if (!drag.moved) { drag.moved = true; wrap.classList.add('is-dragging'); try { wrap.setPointerCapture(e.pointerId); } catch (_) {} }
      var now = performance.now();
      vel = (e.clientX - drag.lx) / Math.max(1, now - drag.t);
      drag.lx = e.clientX; drag.t = now;
      x = drag.start + dx;
    });
    function end() { if (!drag) return; drag = null; wrap.classList.remove('is-dragging'); vel = Math.max(-2, Math.min(2, vel)); }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('resize', measure, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  })();

  /* ---------- Tour globe ---------- */
  (function () {
    var root = document.getElementById('tour');
    var dataEl = document.getElementById('tour-data');
    if (!root || !dataEl || !window.d3 || !window.topojson) return;
    var tour = JSON.parse(dataEl.textContent);
    var stops = tour.stops;
    var ids = Object.keys(stops);
    // A city is "upcoming" until its first show; dates live only in the data, never on the page.
    var today = new Date(), todayISO = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
    var played = 0, upcomingShows = 0;
    ids.forEach(function (id) {
      var s = stops[id];
      s.shows = 0; s.upcoming = true;
      s.venues.forEach(function (v) { s.shows += v[1]; if (v[2] > todayISO) upcomingShows += v[1]; else { played += v[1]; s.upcoming = false; } });
    });
    var mapEl = root.querySelector('.tour__map');
    var canvas = root.querySelector('.tour__globe');
    var tip = root.querySelector('.tour__tip');
    var cities = Array.prototype.slice.call(root.querySelectorAll('.tour__city'));
    var groups = Array.prototype.slice.call(root.querySelectorAll('.tour__group'));
    cities.forEach(function (c) { c.classList.toggle('is-upcoming', stops[c.getAttribute('data-id')].upcoming); });
    var statPlayed = root.querySelector('[data-stat="played"]'), statUpcoming = root.querySelector('[data-stat="upcoming"]');
    if (statPlayed) statPlayed.textContent = played;
    if (statUpcoming) { statUpcoming.textContent = '+' + upcomingShows + ' upcoming shows'; statUpcoming.hidden = !upcomingShows; }
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.tour__tab'));
    var ctx = canvas.getContext('2d');
    var compact = window.matchMedia('(max-width: 639px)');

    // Where each region button turns the globe, and how far it zooms in.
    var VIEWS = { all: { rotate: [55, -22], zoom: 1 }, na: { rotate: [94, -38], zoom: 2.3 }, latam: { rotate: [76, 5], zoom: 1.5 }, europe: { rotate: [-6, -48], zoom: 3.2 }, apac: { rotate: [-145, 0], zoom: 1.35 } };
    var projection = d3.geoOrthographic().clipAngle(90).precision(0.4);
    var path = d3.geoPath(projection, ctx);
    var graticule = d3.geoGraticule10();
    var rotate = VIEWS.all.rotate.slice(), zoom = 1, size = 0, dpr = 1;
    var land = null, borders = null;
    var region = 'all', active = null, spinning = !reduceMotion, visible = false, dragging = false, anim = null;

    // Each tour's route in the order it was played, as great-circle arcs (the jump from South America to Sydney is left out).
    var legs = [];
    tour.routes.forEach(function (rt) {
      rt.forEach(function (id, i) {
        var a = stops[rt[i - 1]], b = stops[id];
        if (a && !(a.region === 'latam' && b.region === 'apac')) legs.push([[a.lon, a.lat], [b.lon, b.lat]]);
      });
    });
    var route = { type: 'MultiLineString', coordinates: legs };

    fetch('assets/data/world.json').then(function (r) { return r.json(); }).then(function (world) {
      land = topojson.merge(world, world.objects.countries.geometries);
      borders = topojson.mesh(world, world.objects.countries, function (a, b) { return a !== b; });
      draw();
    });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = canvas.height = Math.round(size * dpr);
      draw();
    }

    function visibleStop(s) {
      if (d3.geoDistance([s.lon, s.lat], [-rotate[0], -rotate[1]]) > Math.PI / 2 - 0.02) return false;
      var p = projection([s.lon, s.lat]);
      return Math.hypot(p[0] - size / 2, p[1] - size / 2) < size / 2 * .92 - 4;
    }

    function draw(now) {
      if (!size) return;
      var r = size / 2 * 0.92;
      projection.translate([size / 2, size / 2]).scale(r * zoom).rotate(rotate);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      // Zooming magnifies inside the ball's outline, so it always reads as a globe.
      ctx.save();
      ctx.beginPath(); ctx.arc(size / 2, size / 2, r, 0, 2 * Math.PI); ctx.clip();

      // Sphere with a soft light from the upper left, so it reads as a ball.
      var R = r * zoom, g = ctx.createRadialGradient(size / 2 - R * .35, size / 2 - R * .4, R * .1, size / 2, size / 2, R);
      g.addColorStop(0, '#232323'); g.addColorStop(1, '#141414');
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); path(graticule); ctx.strokeStyle = 'rgba(230,227,220,.05)'; ctx.lineWidth = 1; ctx.stroke();
      if (land) {
        ctx.beginPath(); path(land); ctx.fillStyle = '#2E2E2D'; ctx.fill();
        ctx.beginPath(); path(borders); ctx.strokeStyle = 'rgba(18,18,18,.9)'; ctx.lineWidth = .6; ctx.stroke();
      }

      ctx.beginPath(); path(route); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(161,157,150,.6)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);

      var t = (now || performance.now()) / 1000;
      ids.forEach(function (id, i) {
        var s = stops[id];
        if (!visibleStop(s)) return;
        var p = projection([s.lon, s.lat]), dim = region !== 'all' && s.region !== region;
        var rad = (compact.matches ? 2.6 : 3) + Math.sqrt(s.shows) * 1.3;
        if (!dim && !reduceMotion && !s.upcoming) {
          var ph = ((t + i * .37) % 2.8) / 2.8;
          ctx.beginPath(); ctx.arc(p[0], p[1], rad * (1 + ph * 1.8), 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255,255,255,' + (.3 * (1 - ph)).toFixed(3) + ')'; ctx.fill();
        }
        if (id === active) { ctx.beginPath(); ctx.arc(p[0], p[1], rad * 2.4, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); }
        ctx.beginPath(); ctx.arc(p[0], p[1], rad, 0, 2 * Math.PI);
        if (s.upcoming) {
          // Hollow ring: not played yet.
          ctx.fillStyle = '#141414'; ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = dim ? '#4A4A48' : '#FFFFFF'; ctx.stroke();
        } else {
          ctx.fillStyle = dim ? '#4A4A48' : '#FFFFFF'; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#141414'; ctx.stroke();
        }
      });
      // Shade the rim for depth, then the outline.
      var rim = ctx.createRadialGradient(size / 2, size / 2, r * .7, size / 2, size / 2, r);
      rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = rim; ctx.fillRect(0, 0, size, size);
      ctx.restore();
      ctx.beginPath(); ctx.arc(size / 2, size / 2, r, 0, 2 * Math.PI); ctx.strokeStyle = 'rgba(230,227,220,.16)'; ctx.lineWidth = 1; ctx.stroke();
      placeTip();
    }

    // One loop drives spin, pulses and transitions, and only while the globe is on screen.
    var last = 0;
    function frame(now) {
      if (!visible) { last = 0; return; }
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      if (anim) {
        var k = Math.min(1, (now - anim.t0) / anim.dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        rotate = [anim.from[0] + anim.dr[0] * e, anim.from[1] + anim.dr[1] * e];
        zoom = anim.z0 + (anim.z1 - anim.z0) * e;
        if (k === 1) { var done = anim.done; anim = null; if (done) done(); }
      } else if (spinning && !dragging) {
        rotate[0] += dt * .006;
      }
      draw(now);
      requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var was = visible; visible = es[0].isIntersecting;
        if (visible && !was) requestAnimationFrame(frame);
      }).observe(canvas);
    } else { visible = true; requestAnimationFrame(frame); }

    function turnTo(rot, z, done) {
      var from = rotate.slice(), d0 = ((rot[0] - from[0]) % 360 + 540) % 360 - 180;
      if (reduceMotion || !visible) { rotate = [from[0] + d0, rot[1]]; zoom = z; draw(); if (done) done(); return; }
      anim = { from: from, dr: [d0, rot[1] - from[1]], z0: zoom, z1: z, t0: performance.now(), dur: 1100, done: done };
    }

    function setRegion(r) {
      region = r;
      spinning = r === 'all' && !reduceMotion;
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-zoom') === r)); });
      groups.forEach(function (g) { g.classList.toggle('is-dim', r !== 'all' && g.getAttribute('data-region') !== r); });
    }

    function focusStop(id) {
      var s = stops[id];
      setRegion(s.region);
      hideTip();
      turnTo([-s.lon, -s.lat], VIEWS[s.region].zoom, function () { show(id); });
    }

    function show(id) {
      active = id;
      cities.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-id') === id); });
      var s = stops[id];
      tip.innerHTML = '<strong></strong><span></span><span><b></b></span>';
      tip.children[0].textContent = s.city;
      tip.children[1].textContent = s.country + ' · ' + s.venues.map(function (v) { return v[0]; }).join(' · ');
      tip.querySelector('b').textContent = (s.upcoming ? 'Upcoming · ' : '') + s.shows + (s.shows > 1 ? ' shows' : ' show');
      tip.hidden = false;
      placeTip();
      if (!anim && !visible) draw();
    }
    function placeTip() {
      if (!active || tip.hidden || compact.matches) return;
      var s = stops[active];
      if (!visibleStop(s)) { tip.style.visibility = 'hidden'; return; }
      tip.style.visibility = '';
      var p = projection([s.lon, s.lat]), half = Math.min(120, tip.offsetWidth / 2);
      tip.style.left = Math.max(half, Math.min(size - half, p[0])) + 'px';
      tip.style.top = p[1] + 'px';
      tip.classList.toggle('is-below', p[1] < tip.offsetHeight + 28);
    }
    function hideTip() { if (!compact.matches) { tip.hidden = true; active = null; } }

    function stopAt(x, y) {
      var best = null, bestD = compact.matches ? 22 : 14;
      ids.forEach(function (id) {
        var s = stops[id];
        if (!visibleStop(s)) return;
        var p = projection([s.lon, s.lat]), d = Math.hypot(p[0] - x, p[1] - y);
        if (d < bestD) { best = id; bestD = d; }
      });
      return best;
    }
    function local(e) { var b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }

    // Drag to spin (mouse, pen, touch). Vertical swipes still scroll the page on phones.
    var start = null, moved = false;
    canvas.addEventListener('pointerdown', function (e) {
      var p = local(e);
      start = { x: p[0], y: p[1], rot: rotate.slice() }; moved = false;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = local(e);
      if (start) {
        var dx = p[0] - start.x, dy = p[1] - start.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true; dragging = true; anim = null;
        canvas.classList.add('is-dragging'); mapEl.classList.add('is-touched');
        var k = 75 / (size / 2 * .92 * zoom) * (180 / Math.PI) / 75;
        rotate = [start.rot[0] + dx * k, Math.max(-75, Math.min(75, start.rot[1] - dy * k))];
        if (!visible) draw();
        return;
      }
      if (e.pointerType !== 'mouse') return;
      var id = stopAt(p[0], p[1]);
      canvas.classList.toggle('is-pointing', !!id);
      if (id && id !== active) show(id);
      else if (!id && active && !compact.matches && region === 'all') hideTip();
    });
    function endDrag(e) {
      if (!start) return;
      var p = local(e), wasDrag = moved;
      start = null; dragging = false; canvas.classList.remove('is-dragging');
      if (wasDrag) { spinning = false; return; }
      mapEl.classList.add('is-touched');
      var id = stopAt(p[0], p[1]);
      if (!id) { hideTip(); return; }
      // On phones a tap on the whole-world view first turns and zooms to that city.
      if (region === 'all' && (compact.matches || e.pointerType !== 'mouse')) focusStop(id); else show(id);
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', function () { start = null; dragging = false; canvas.classList.remove('is-dragging'); });
    canvas.addEventListener('mouseleave', function () { canvas.classList.remove('is-pointing'); if (region === 'all') hideTip(); });

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var r = t.getAttribute('data-zoom');
        setRegion(r); hideTip();
        cities.forEach(function (c) { c.classList.remove('is-active'); });
        turnTo(VIEWS[r].rotate, VIEWS[r].zoom);
      });
    });
    cities.forEach(function (c) {
      c.addEventListener('click', function () {
        // The list sits below the globe, so bring the globe back into view first.
        var box = mapEl.getBoundingClientRect();
        if (box.top < 0 || box.bottom > window.innerHeight) mapEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        focusStop(c.getAttribute('data-id'));
      });
    });

    window.addEventListener('resize', resize, { passive: true });
    resize();
  })();

  function showDialog(eyebrow, body) {
    if (!dialog || !dialog.showModal) { alert(body); return; }
    dialog.querySelector('#sent-eyebrow').textContent = eyebrow;
    dialog.querySelector('#sent-body').textContent = body;
    dialog.showModal();
  }
  if (dialog) {
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });
  }
})();
