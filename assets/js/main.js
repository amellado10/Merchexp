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
