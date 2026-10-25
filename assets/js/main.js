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
    ['top', 'services', 'work', 'upcycling', 'contact'].forEach(function (id) {
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
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
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
        'Upcycling: ' + (data.get('upcycle') ? 'Yes' : 'No'),
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
