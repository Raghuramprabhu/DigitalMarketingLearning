/* =====================================================================
   FABLE — experience engine
   - sky backdrop, iris page transitions
   - journey mode: one scene on stage at a time, title cards between
   - sparks (rewards), Ember (companion), finale
   - focus beam, calm motion, chimes
   Reads its config from data-fb-* attributes on <html>.
   ===================================================================== */
(function () {
  'use strict';
  var D = document, H = D.documentElement, W = window;
  var ds = H.dataset;
  var cfg = {
    world: ds.fbWorld || 'home', mode: ds.fbMode || 'glide', scenes: ds.fbScenes || '',
    split: ds.fbSplit || '', key: ds.fbKey || '', root: ds.fbRoot || './', title: ds.fbTitle || D.title
  };

  /* ---------- the seven worlds (the home page and the veil both read this) ---------- */
  var SVG_GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/><circle cx="12" cy="12" r="7"/></svg>';
  var SVG_BRANCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M6 7.2v9.6M18 10.2c0 4-6 3.4-11.2 6"/></svg>';
  var WORLDS = [
    { id: 'marketing', name: 'The Bet', sub: 'Digital marketing', hue: 48, glyph: '✺',
      hook: 'Every ad you have ever ignored was a bet someone lost. Learn how the bet gets won.',
      doors: [
        { k: 'chapters/01-what-is-digital-marketing.html', t: 'What is digital marketing?', b: 'The definition, built from scratch.' },
        { k: 'chapters/02-the-customer-journey.html', t: "The customer's journey", b: 'Why nobody buys on first sight.' }
      ] },
    { id: 'machines', name: 'How Machines Think', sub: 'Computing', hue: 235, glyph: SVG_GEAR,
      hook: 'Every program you have ever run is, underneath, just adding.',
      doors: [
        { k: 'computing/01-the-life-of-2-plus-3.html', t: 'The life of 2 + 3', b: 'Gears, switches, chips, C, the JVM, LLMs. One sum, four centuries.' },
        { k: 'computing/lab-01.html', t: 'Visual Lab', b: 'Eight machines you can poke until 2 + 3 makes sense.' }
      ] },
    { id: 'git', name: 'git', sub: 'The story', hue: 150, glyph: SVG_BRANCH,
      hook: 'A 2005 feud, ten days of fury, and the tool every engineer now lives inside.',
      doors: [
        { k: 'git/index.html', t: 'git: the story', b: 'How it works underneath, and every key command with a live playground.' }
      ] },
    { id: 'chess', name: 'The Board', sub: 'Chess', hue: 88, glyph: '♞︎',
      hook: 'Tactics decide what happens. Strategy decides where.',
      doors: [
        { k: 'chess/index.html', t: 'Tactics', b: 'Seven patterns through famous games, then an arena where you move.' },
        { k: 'chess/middlegame.html', t: 'Strategy', b: 'Seven middlegame principles and a choose-the-plan arena.' },
        { k: 'chess/london.html', t: 'The London', b: 'Setup, key lines, two Carlsen masterpieces, fresh puzzles.' }
      ] },
    { id: 'math', name: 'The Unknown', sub: 'Algebra', hue: 190, glyph: '<i>x</i>',
      hook: 'Every formula was once somebody’s real problem.',
      doors: [
        { k: 'math/algebra.html', t: 'Algebra: the story', b: 'One ordinary month, five unknowns, a playground for each.' },
        { k: 'math/algebra-history.html', t: 'The history corner', b: 'The people and the dates, kept apart from the story.' }
      ] },
    { id: 'music', name: 'Sound', sub: 'Piano, rhythm, theory', hue: 335, glyph: '♪',
      hook: 'Two traditions, thousands of kilometres apart, both named one note “the fifth”.',
      doors: [
        { k: 'piano/index.html', t: 'Piano Studio', b: 'Play, see the notes rise, record video with sound.', tool: 1 },
        { k: 'piano/mobile/index.html', t: 'Phone piano', b: 'The studio, shaped for your thumbs.', tool: 1 },
        { k: 'piano/percussion/index.html', t: 'Bhajan Rhythm Studio', b: 'Tambourine, dholak, dholki, tabla and a tala tutor.', tool: 1 },
        { k: 'piano/learn/index.html', t: 'Music: the syllabus', b: 'Every level, Western and Indian side by side.', tool: 1 },
        { k: 'piano/learn/1-1-sound.html', t: '1·1 What is a note?', b: 'Frequency, the octave, the fifth, why twelve.' },
        { k: 'piano/learn/1-2-names.html', t: '1·2 C D E meets Sa Re Ga', b: 'Two naming systems, one keyboard.' },
        { k: 'piano/learn/1-3-rhythm.html', t: '1·3 Beat, tala and time signature', b: 'How time gets counted.' },
        { k: 'piano/learn/2-1-major.html', t: '2·1 One scale, three names', b: 'Major, Bilawal, Shankarabharanam.' }
      ] },
    { id: 'calm', name: 'Calm Feed', sub: 'A quiet scroll', hue: 275, glyph: '☾',
      hook: 'Nothing here will raise your pulse. Fresh every morning and night.',
      doors: [
        { k: 'feed/index.html', t: 'Open the feed', b: 'Curated, stress-free, endless enough.', tool: 1 }
      ] }
  ];
  function worldOf(id) { for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return WORLDS[i]; return null; }

  /* ---------- small helpers ---------- */
  function el(tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('fable:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('fable:' + k, JSON.stringify(v)); } catch (e) { } }
  };
  var prefs = store.get('prefs', {});
  var reduce = W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function calm() { return !!prefs.calm || reduce; }
  function savePrefs() { store.set('prefs', prefs); }
  if (calm()) H.classList.add('fb-calm');

  /* nights visited: a count that only ever grows, never a streak to break */
  (function () {
    var d = new Date(), t = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    var days = store.get('days', []); if (days.indexOf(t) < 0) { days.push(t); store.set('days', days); }
  })();

  /* ---------- sky ---------- */
  function buildSky() {
    var s = el('div', 'fb-sky', '<i></i><i></i><i></i><canvas class="fb-stars"></canvas>');
    s.setAttribute('aria-hidden', 'true'); D.body.appendChild(s);
    var c = s.querySelector('canvas'), timer = 0, lastW = 0;
    function draw() {
      var w = innerWidth, h = innerHeight; if (Math.abs(w - lastW) < 2 && c.width) return; lastW = w;
      var dpr = Math.min(2, W.devicePixelRatio || 1); c.width = w * dpr; c.height = h * dpr;
      var x = c.getContext('2d'), seed = 7, n = Math.round(Math.min(220, w * h / 6500));
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (var i = 0; i < n; i++) {
        var r = (rnd() * 1.1 + .25) * dpr, a = rnd() * .7 + .15;
        x.fillStyle = 'rgba(255,' + Math.round(235 + rnd() * 20) + ',' + Math.round(210 + rnd() * 45) + ',' + a + ')';
        x.beginPath(); x.arc(rnd() * c.width, rnd() * c.height, r, 0, 6.3); x.fill();
      }
    }
    draw(); W.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(draw, 200); });
  }

  /* ---------- particles ---------- */
  var FX = (function () {
    var c, x, parts = [], raf = 0, dpr = 1;
    function size() { dpr = Math.min(2, W.devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
    function ensure() { if (c) return; c = el('canvas', 'fb-fx'); c.setAttribute('aria-hidden', 'true'); D.body.appendChild(c); x = c.getContext('2d'); size(); W.addEventListener('resize', size); }
    function tick() {
      x.clearRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'lighter';
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i]; p.vx *= .985; p.vy = p.vy * .985 + p.g; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        x.globalAlpha = Math.min(1, p.life * 1.4); x.fillStyle = p.c;
        x.beginPath(); x.arc(p.x * dpr, p.y * dpr, p.r * dpr * (.4 + p.life * .6), 0, 6.3); x.fill();
      }
      x.globalAlpha = 1;
      if (parts.length) raf = requestAnimationFrame(tick); else { raf = 0; x.clearRect(0, 0, c.width, c.height); }
    }
    function burst(px, py, n, hue, power) {
      if (calm()) return; ensure(); power = power || 1; if (hue == null) hue = +getComputedStyle(H).getPropertyValue('--fb-h') || 60;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * 6.283, v = (Math.random() * 6 + 2) * power, hh = hue + (Math.random() * 70 - 35);
        parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5 * power, g: .09, life: 1, decay: .012 + Math.random() * .02,
          r: Math.random() * 3 + 1.2, c: Math.random() < .25 ? '#fff6dc' : 'oklch(0.86 0.16 ' + hh + ')' });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function fireworks(ms) {
      if (calm()) return; var end = Date.now() + (ms || 2600);
      (function go() {
        burst(innerWidth * (.15 + Math.random() * .7), innerHeight * (.12 + Math.random() * .45), 46, Math.random() * 360, 1.25);
        if (Date.now() < end) setTimeout(go, 260 + Math.random() * 240);
      })();
    }
    return { burst: burst, fireworks: fireworks };
  })();

  /* ---------- chimes (off until switched on) ---------- */
  var ac = null;
  function chime(big) {
    if (!prefs.chime) return;
    try {
      ac = ac || new (W.AudioContext || W.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      var notes = big ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [783.99, 1174.66], t0 = ac.currentTime + .01;
      notes.forEach(function (f, i) {
        var o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * (big ? .11 : .08);
        o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .02);
        g.gain.exponentialRampToValueAtTime(.0001, t + .7); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .75);
      });
    } catch (e) { }
  }

  /* ---------- veil: arriving and leaving ---------- */
  function glyphHTML() { var w = worldOf(cfg.world); return w ? w.glyph : '✦'; }
  function arrive() {
    var v = el('div', 'fb-veil', cfg.mode === 'hub' ? '' :
      '<div class="fb-veil-in"><div class="fb-veil-g">' + glyphHTML() + '</div><div class="fb-veil-t">' + esc(cfg.title) + '</div></div>');
    v.setAttribute('aria-hidden', 'true'); D.body.appendChild(v); H.classList.remove('fb-boot');
    function gone() { if (v.parentNode) v.parentNode.removeChild(v); }
    if (calm()) { requestAnimationFrame(function () { v.classList.add('fb-fade'); }); setTimeout(gone, 300); return; }
    var hold = cfg.mode === 'hub' ? 60 : (cfg.mode === 'journey' ? 620 : 380);
    v.addEventListener('click', function () { v.classList.add('fb-open'); });
    setTimeout(function () { v.classList.add('fb-open'); setTimeout(gone, 900); }, hold);
  }
  var leaving = false;
  function leave(url, cx, cy) {
    if (leaving) return; if (calm()) { location.href = url; return; }
    leaving = true;
    var v = el('div', 'fb-veil fb-close'); v.id = 'fb-leave';
    v.style.setProperty('--fb-x', (cx == null ? innerWidth / 2 : cx) + 'px'); v.style.setProperty('--fb-y', (cy == null ? innerHeight / 2 : cy) + 'px');
    D.body.appendChild(v); setTimeout(function () { location.href = url; }, 440);
  }
  W.addEventListener('pageshow', function (e) {
    if (e.persisted) { leaving = false; var v = D.getElementById('fb-leave'); if (v) v.remove(); }
  });
  D.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href'); if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:|blob:|data:)/i.test(href)) return;
    var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    e.preventDefault(); leave(u.href, e.clientX, e.clientY);
  });

  /* ---------- Ember speaks ---------- */
  var emberBtn = null, sayTimer = 0;
  function say(text, ms) {
    if (!emberBtn) return; var old = emberBtn.parentNode.querySelector('.fb-say'); if (old) old.remove();
    var b = el('div', 'fb-say'); b.textContent = text; b.setAttribute('role', 'status'); emberBtn.parentNode.appendChild(b);
    emberBtn.classList.remove('fb-joy'); void emberBtn.offsetWidth; emberBtn.classList.add('fb-joy');
    clearTimeout(sayTimer); sayTimer = setTimeout(function () { b.classList.add('fb-out'); setTimeout(function () { b.remove(); }, 320); }, ms || 3600);
  }
  var LINES = {
    first: ['One down. That is how all of it starts.', 'First spark. The hardest one is behind you.', 'There it is. You began.'],
    half: ['Halfway. You are still here, and that is the skill.', 'Half the sky is lit. Keep the pace that feels good.', 'Midpoint. No rush from here.'],
    near: ['One more after this. I am staying for it.', 'Nearly there. Finish it for the you of tomorrow.'],
    back: ['Picked up right where you left off.', 'Welcome back. I kept your place.'],
    done: ['You finished something today. That counts.', 'Start to end. I saw the whole thing.', 'That one is yours now.']
  };

  /* ---------- sparks ---------- */
  var sparkEl = null;
  function sparks() { return store.get('sparks', 0); }
  function addSpark(fromEl) {
    var n = sparks() + 1; store.set('sparks', n); chime(false);
    var r = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var sx = r.left + r.width / 2, sy = r.top + r.height / 2; FX.burst(sx, sy, 34, null, 1);
    if (sparkEl) {
      var t = sparkEl.getBoundingClientRect(), tx = t.left + t.width / 2, ty = t.top + t.height / 2;
      if (!calm() && t.width && fromEl && fromEl.animate) {
        var f = el('div', 'fb-fly', '✦'); D.body.appendChild(f);
        f.animate([{ transform: 'translate(' + sx + 'px,' + sy + 'px) scale(1.6)', opacity: 1 },
          { transform: 'translate(' + ((sx + tx) / 2) + 'px,' + (Math.min(sy, ty) - 90) + 'px) scale(1.2)', opacity: 1, offset: .5 },
          { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.5)', opacity: .2 }], { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' })
          .onfinish = function () { f.remove(); bump(); };
      } else bump();
    }
    function bump() { sparkEl.textContent = '✦ ' + n; sparkEl.classList.remove('fb-bump'); void sparkEl.offsetWidth; sparkEl.classList.add('fb-bump'); }
  }

  /* ---------- menu ---------- */
  var menu = null, journey = null;
  function toggleRow(label, hint, on, fn) {
    var b = el('button', 'fb-tog', '<span>' + label + '<small>' + hint + '</small></span><i></i>'); b.type = 'button';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.onclick = function () { var v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v ? 'true' : 'false'); fn(v); };
    return b;
  }
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function openMenu(top) {
    if (menu) { closeMenu(); return; }
    menu = el('div', 'fb-menu' + (top ? ' fb-top' : '')); menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Fable settings');
    menu.appendChild(el('h5', '', 'How do you want to read tonight?'));
    if (journey) menu.appendChild(toggleRow('One scene at a time', 'Off = the whole page as one long scroll', !prefs.scroll, function (v) { prefs.scroll = !v; savePrefs(); journey.setMode(v); }));
    menu.appendChild(toggleRow('Calm motion', 'Quiet the sky, the sweeps and the sparks', !!prefs.calm, function (v) { prefs.calm = v; savePrefs(); H.classList.toggle('fb-calm', calm()); }));
    if (journey) menu.appendChild(toggleRow('Focus beam', 'Dim everything except the lines you are on', !!prefs.beam, function (v) { prefs.beam = v; savePrefs(); journey.beam(v); }));
    menu.appendChild(toggleRow('Chimes', 'A soft note when you earn a spark', !!prefs.chime, function (v) { prefs.chime = v; savePrefs(); if (v) chime(false); }));
    if (journey) {
      menu.appendChild(el('h6', '', 'Scenes'));
      var map = el('div', 'fb-map'); journey.fillMap(map); menu.appendChild(map);
    }
    var links = el('div', 'fb-links');
    links.innerHTML = '<a href="' + cfg.root + 'index.html">✦ The sky</a>' + (cfg.key ? '<a href="' + cfg.root + '../' + cfg.key + '">Classic page</a>' : '');
    menu.appendChild(links); D.body.appendChild(menu);
  }
  D.addEventListener('pointerdown', function (e) {
    if (menu && !menu.contains(e.target) && !(emberBtn && emberBtn.contains(e.target))) closeMenu();
  });

  /* ---------- hero words ---------- */
  function splitWords(h) {
    if (!h || h.dataset.fbW || calm()) return; h.dataset.fbW = 1; var i = 0;
    (function walk(n) {
      [].slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          if (!c.nodeValue.trim()) return;
          var f = D.createDocumentFragment();
          c.nodeValue.split(/(\s+)/).forEach(function (p) {
            if (!p) return; if (/^\s+$/.test(p)) { f.appendChild(D.createTextNode(p)); return; }
            var s = el('span', 'fb-w'); s.textContent = p; s.style.setProperty('--fb-i', i++); f.appendChild(s);
          });
          n.replaceChild(f, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR' && c.tagName !== 'SVG' && c.tagName !== 'CANVAS') walk(c);
      });
    })(h);
    setTimeout(function () { [].forEach.call(h.querySelectorAll('.fb-w'), function (s) { s.style.animation = 'none'; }); }, 2600 + i * 60);
  }

  /* ---------- journey ---------- */
  function initJourney() {
    var scenes = [];
    if (cfg.split) {
      var host = D.querySelector(cfg.split);
      if (host) {
        var cur0 = null;
        [].slice.call(host.children).forEach(function (k) {
          if (/^(SCRIPT|STYLE)$/.test(k.tagName)) return;
          if (!cur0 || k.tagName === 'H2') { cur0 = el('div', 'fb-scene'); host.insertBefore(cur0, k); scenes.push(cur0); }
          cur0.appendChild(k);
        });
      }
    } else if (cfg.scenes) {
      scenes = [].slice.call(D.querySelectorAll(cfg.scenes)).filter(function (s, i, all) {
        return !all.some(function (o) { return o !== s && o.contains(s); });
      });
      scenes.forEach(function (s) { s.classList.add('fb-scene'); });
    }
    if (scenes.length < 2) return null;
    var n = scenes.length, cur = -1, followers = [];

    /* anything sitting between scenes travels with the scene before it */
    var parents = []; scenes.forEach(function (s) { if (parents.indexOf(s.parentElement) < 0) parents.push(s.parentElement); });
    parents.forEach(function (p) {
      var first = -1, idx = -1, pend = [];
      [].forEach.call(p.children, function (k) {
        var si = scenes.indexOf(k);
        if (si >= 0) { idx = si; if (first < 0) { first = si; pend.forEach(function (f) { f._fbi = si; }); } return; }
        if (/^(SCRIPT|STYLE|LINK|TEMPLATE|DIALOG)$/.test(k.tagName) || /(^|\s)fb-/.test(k.className || '') || k.hidden) return;
        if (k.matches('header, .bar, .topbar')) return;
        var cs = getComputedStyle(k); if (cs.position === 'fixed' || cs.position === 'sticky' || cs.position === 'absolute' || cs.display === 'none') return;
        if (k.tagName === 'FOOTER' && p === D.body) return;
        k.classList.add('fb-follow'); k._fbi = idx; followers.push(k); if (idx < 0) pend.push(k);
      });
    });

    function titleOf(i) {
      var s = scenes[i], h = s.querySelector('h1, h2, h3'), t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
      if (!t) t = 'Part ' + (i + 1); return t.length > 64 ? t.slice(0, 61) + '…' : t;
    }
    function sceneOf(node) {
      for (var i = 0; i < n; i++) if (scenes[i].contains(node)) return i;
      for (var j = 0; j < followers.length; j++) if (followers[j].contains(node)) return followers[j]._fbi;
      return -1;
    }

    var P = store.get('p:' + cfg.key, null) || { seen: [], last: 0, done: false };
    function save() { P.n = n; P.last = cur; P.t = Date.now(); P.title = cfg.title; P.world = cfg.world; store.set('p:' + cfg.key, P); store.set('last', cfg.key); }

    /* dock */
    H.classList.add('fb-dock');
    var dock = el('div', 'fb-dockbar'); dock.setAttribute('role', 'navigation'); dock.setAttribute('aria-label', 'Scenes');
    emberBtn = el('button', 'fb-ember'); emberBtn.type = 'button'; emberBtn.title = 'Ember · settings and scene map'; emberBtn.setAttribute('aria-label', 'Open Fable settings and scene map');
    var prev = el('button', 'fb-prev', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', 'Previous scene');
    var mid = el('div', 'fb-mid'), track = el('div', 'fb-track'), where = el('div', 'fb-where'); mid.appendChild(track); mid.appendChild(where);
    sparkEl = el('span', 'fb-sparks', '✦ ' + sparks()); sparkEl.title = 'Sparks: one for every scene you finish, anywhere in Fable';
    var next = el('button', 'fb-next'); next.type = 'button';
    [emberBtn, prev, mid, sparkEl, next].forEach(function (x) { dock.appendChild(x); });
    scenes.forEach(function (s, i) { var seg = el('i'); seg.title = titleOf(i); seg.onclick = function () { show(i); }; track.appendChild(seg); });
    D.body.appendChild(dock);
    emberBtn.onclick = function () { openMenu(false); };
    prev.onclick = function () { if (cur > 0) show(cur - 1); };
    next.onclick = function () { advance(); };

    function paint() {
      [].forEach.call(track.children, function (seg, i) { seg.classList.toggle('fb-seen', P.seen.indexOf(i) >= 0); seg.classList.toggle('fb-cur', i === cur); });
      where.innerHTML = '<b>' + (cur + 1) + '/' + n + '</b>' + esc(titleOf(cur));
      prev.disabled = cur <= 0;
      next.textContent = cur === n - 1 ? 'Finish ✦' : (cur === 0 && !P.seen.length ? 'Begin →' : 'Continue →');
    }

    function stage(i) {
      scenes.forEach(function (s, k) { s.classList.toggle('fb-on', k === i); });
      followers.forEach(function (f) { f.classList.toggle('fb-on', f._fbi === i); });
      H.classList.toggle('fb-last', i === n - 1);
    }
    function enter(i) {
      var s = scenes[i]; s.classList.add('fb-enter');
      var k = s; while (k.children.length === 1 && !/^(CANVAS|SVG|P|H1|H2|H3|UL|OL|TABLE)$/i.test(k.children[0].tagName)) k = k.children[0];
      var kids = [].slice.call(k.children).filter(function (c) { return c.tagName !== 'CANVAS'; }).slice(0, 12);
      kids.forEach(function (c, j) { c.style.setProperty('--fb-i', j); c.classList.add('fb-rise'); });
      setTimeout(function () { s.classList.remove('fb-enter'); kids.forEach(function (c) { c.classList.remove('fb-rise'); }); }, 2100);
    }
    function titleCard(i, back, mid) {
      var c = el('div', 'fb-card' + (back ? ' fb-back' : ''),
        '<div class="fb-card-n">' + (i + 1) + '</div><div><div class="fb-card-k">Scene ' + (i + 1) + ' of ' + n + '</div><div class="fb-card-t">' + esc(titleOf(i)) + '</div></div>');
      c.setAttribute('aria-hidden', 'true'); D.body.appendChild(c);
      setTimeout(mid, 340); setTimeout(function () { c.remove(); }, 800);
    }
    var busy = false;
    function show(i, opts) {
      opts = opts || {}; i = Math.max(0, Math.min(n - 1, i)); if (i === cur && !opts.force) { if (opts.then) opts.then(); return; }
      if (busy) return; var from = cur; cur = i; if (!opts.force) closeMenu();
      function swap() {
        busy = false; stage(i);
        if (!opts.keep) W.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (!opts.quiet) enter(i);
        paint(); save();
        try { W.dispatchEvent(new Event('resize')); W.dispatchEvent(new Event('scroll')); } catch (e) { }
        if (opts.then) opts.then();
      }
      if (H.classList.contains('fb-journey') && from >= 0 && !opts.instant && !calm()) { busy = true; titleCard(i, i < from, swap); }
      else swap();
    }
    function advance() {
      var fresh = P.seen.indexOf(cur) < 0;
      if (fresh) {
        P.seen.push(cur); addSpark(next);
        var c = P.seen.length;
        if (c === 1) say(pick(LINES.first)); else if (c === Math.ceil(n / 2) && n > 3) say(pick(LINES.half)); else if (c === n - 1 && n > 4) say(pick(LINES.near));
      }
      if (cur < n - 1) show(cur + 1); else { save(); paint(); finale(fresh); }
    }
    function finale() {
      P.done = true; save(); chime(true); FX.fireworks(2800);
      var f = el('div', 'fb-finale',
        '<div class="fb-finale-in"><div class="fb-k">Story complete</div><h2>' + esc(cfg.title) + '</h2>' +
        '<p>' + pick(LINES.done) + '</p>' +
        '<div class="fb-tally">✦ ' + P.seen.length + ' sparks here · ' + sparks() + ' across the sky</div>' +
        '<div class="fb-acts"><a href="' + cfg.root + 'index.html">Back to the sky</a><button type="button">Stay a while</button></div></div>');
      f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', 'Story complete'); D.body.appendChild(f);
      f.querySelector('button').onclick = function () { f.remove(); };
      f.querySelector('a').focus();
    }

    /* links and scripts that point at something on another scene */
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || !H.classList.contains('fb-journey')) return;
      var id = a.getAttribute('href').slice(1); if (!id) return; var t = D.getElementById(id); if (!t) return;
      var si = sceneOf(t); if (si < 0 || si === cur) return;
      e.preventDefault(); show(si, { keep: true, then: function () { setTimeout(function () { nativeSIV.call(t, { behavior: 'instant', block: 'start' }); }, 30); } });
    }, true);
    W.addEventListener('hashchange', function () {
      if (!H.classList.contains('fb-journey')) return; var t = location.hash ? D.getElementById(location.hash.slice(1)) : null; if (!t) return;
      var si = sceneOf(t); if (si >= 0 && si !== cur) show(si, { keep: true, then: function () { setTimeout(function () { nativeSIV.call(t, { behavior: 'instant', block: 'start' }); }, 30); } });
    });
    var nativeSIV = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (arg) {
      if (H.classList.contains('fb-journey')) { var si = sceneOf(this); if (si >= 0 && si !== cur) show(si, { instant: true, keep: true, quiet: true }); }
      return nativeSIV.call(this, arg);
    };
    D.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.target !== D.body && e.target !== H) return; if (!H.classList.contains('fb-journey')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); advance(); } else if (e.key === 'ArrowLeft' && cur > 0) { e.preventDefault(); show(cur - 1); }
    });

    /* focus beam */
    var beamIO = null;
    function beam(on) {
      H.classList.toggle('fb-beam', !!on);
      if (on && !beamIO && 'IntersectionObserver' in W) {
        beamIO = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('fb-lit', e.isIntersecting); }); }, { rootMargin: '-28% 0px -28% 0px' });
        scenes.forEach(function (s) { [].forEach.call(s.querySelectorAll('p, li, h2, h3, h4, blockquote'), function (x) { beamIO.observe(x); }); });
      }
    }
    function setMode(on) {
      H.classList.toggle('fb-journey', on); H.classList.toggle('fb-quiet', !on);
      if (on) show(cur < 0 ? 0 : cur, { force: true, instant: true }); else { try { W.dispatchEvent(new Event('resize')); } catch (e) { } }
    }
    function fillMap(box) {
      scenes.forEach(function (s, i) {
        var b = el('button', (P.seen.indexOf(i) >= 0 ? 'fb-seen ' : '') + (i === cur ? 'fb-cur' : ''), '<b>' + (P.seen.indexOf(i) >= 0 ? '✦' : i + 1) + '</b><span>' + esc(titleOf(i)) + '</span>');
        b.type = 'button'; b.onclick = function () { if (!H.classList.contains('fb-journey')) { closeMenu(); nativeSIV.call(s, { behavior: 'smooth' }); } else show(i); }; box.appendChild(b);
      });
    }

    /* where to open */
    var start = 0, resumed = false, hashT = location.hash ? D.getElementById(location.hash.slice(1)) : null;
    if (hashT && sceneOf(hashT) >= 0) start = sceneOf(hashT);
    else if (!P.done && P.last > 0 && P.last < n) { start = P.last; resumed = true; }
    H.classList.toggle('fb-journey', !prefs.scroll); H.classList.toggle('fb-quiet', !!prefs.scroll);
    cur = -1; show(start, { instant: true, keep: !!hashT });
    if (hashT && start === sceneOf(hashT) && hashT !== scenes[start]) setTimeout(function () { nativeSIV.call(hashT, { behavior: 'instant', block: 'start' }); }, 60);
    if (prefs.beam) beam(true);
    if (resumed) setTimeout(function () { say(pick(LINES.back)); }, 1900);
    splitWords(scenes[0].querySelector('h1'));
    return { setMode: setMode, beam: beam, fillMap: fillMap, show: show };
  }

  /* ---------- right answers get a little light ---------- */
  function watchWins() {
    if (!('MutationObserver' in W)) return; var last = 0, WIN = /(^|\s)(right|good|correct|solved)(\s|$)/;
    function pop(t) {
      var now = Date.now(); if (now - last < 400 || !t.getBoundingClientRect) return; var r = t.getBoundingClientRect(); if (!r.width || r.top > innerHeight || r.bottom < 0) return;
      last = now; FX.burst(r.left + r.width / 2, r.top + r.height / 2, 22, 150, .75); chime(false);
      if (emberBtn) { emberBtn.classList.remove('fb-joy'); void emberBtn.offsetWidth; emberBtn.classList.add('fb-joy'); }
    }
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'attributes') { var c = m.target.getAttribute('class') || ''; if (WIN.test(c) && !WIN.test(m.oldValue || '')) pop(m.target); }
        else [].forEach.call(m.addedNodes, function (nd) { if (nd.nodeType === 1 && WIN.test(nd.getAttribute('class') || '')) pop(nd); });
      });
    }).observe(D.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }

  /* ---------- index + tool pages: gentle reveals, ember in the bar ---------- */
  function initGlide() {
    var bar = D.querySelector('.bar-in, .topbar-inner, .bar-inner .bar-actions');
    if (bar) {
      emberBtn = el('button', 'fb-ember fb-inbar'); emberBtn.type = 'button'; emberBtn.title = 'Ember · Fable settings'; emberBtn.setAttribute('aria-label', 'Open Fable settings');
      var holder = el('span'); holder.style.cssText = 'position:relative;display:inline-flex;flex:none'; holder.appendChild(emberBtn); bar.appendChild(holder);
      emberBtn.onclick = function () { openMenu(true); };
    }
    if (cfg.mode === 'glide' || cfg.mode === 'tool') splitWords(D.querySelector('.hero h1, .l-hero h1, .syl-hero h1, main h1'));
    if (cfg.mode !== 'glide' || calm() || !('IntersectionObserver' in W)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('fb-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    [].forEach.call(D.querySelectorAll('.card, .lesson, .level > h2, .how > *, main > h2, .hero > *'), function (x, i) {
      x.classList.add('fb-reveal'); x.style.setProperty('--fb-i', i % 6); io.observe(x);
    });
  }

  /* ---------- go ---------- */
  function boot() {
    buildSky(); arrive();
    if (cfg.mode === 'journey') { journey = initJourney(); watchWins(); if (!journey) initGlide(); }
    else if (cfg.mode === 'glide') { initGlide(); watchWins(); }
    else if (cfg.mode === 'tool' || cfg.mode === 'calm') initGlide();
    try { D.dispatchEvent(new Event('fable:ready')); } catch (e) { }
  }
  W.Fable = { worlds: WORLDS, worldOf: worldOf, store: store, FX: FX, chime: chime, leave: leave, calm: calm, sparks: sparks, say: say, el: el, esc: esc, pick: pick };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
