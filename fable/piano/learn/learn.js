/* =====================================================================
   Music: the story · lesson toolkit
   ---------------------------------------------------------------------
   Lessons are mostly plain HTML. This file brings the HTML to life:
     .kbd[data-from][data-to]      mini keyboard (click to play, labels, highlights)
     button.play[data-seq]         play a sequence, lighting a linked keyboard
     button.drone[data-sa]         tanpura drone on Sa
     .quiz                         multiple-choice check with explanation
     .done-btn[data-lesson]        mark lesson complete (progress on syllabus)
   And a JS API (window.LK) for lesson-specific widgets and ear games.
   ===================================================================== */
(function () {
  'use strict';
  var PS = window.PS;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('music-' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('music-' + k, v); } catch (e) { } }
  };

  /* ---------------- theme (shared with whole site) ---------------- */
  (function () {
    var b = $('#themebtn'); if (!b) return;
    function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }
    function paint() { b.textContent = light() ? '🌙 Dark' : '☀️ Light'; }
    b.addEventListener('click', function () {
      var t = light() ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('fable-theme', t); } catch (e) { }
      paint();
    });
    paint();
  })();

  /* ---------------- names ---------------- */
  var NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  var SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  // Hindustani: lowercase = komal (flat), M = tivra (sharp) Ma
  var HIND = ['S', 'r', 'R', 'g', 'G', 'm', 'M', 'P', 'd', 'D', 'n', 'N'];
  var HIND_LONG = ['Sa', 'komal Re', 'Re', 'komal Ga', 'Ga', 'Ma', 'tivra Ma', 'Pa', 'komal Dha', 'Dha', 'komal Ni', 'Ni'];
  // Carnatic: the most common name for each of the 12 positions
  var CARN = ['S', 'R1', 'R2', 'G2', 'G3', 'M1', 'M2', 'P', 'D1', 'D2', 'N2', 'N3'];
  var IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

  function noteName(m) { return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function parseNote(tok) {
    if (/^-?\d+$/.test(tok)) return parseInt(tok, 10);
    var r = /^([A-Ga-g])([#b♯♭]?)(-?\d)$/.exec(tok); if (!r) return null;
    var pc = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[r[1].toLowerCase()];
    if (r[2] === '#' || r[2] === '♯') pc++; if (r[2] === 'b' || r[2] === '♭') pc--;
    return (parseInt(r[3], 10) + 1) * 12 + pc;
  }
  // "C4 D4 E4:2 C4+E4+G4:2 r:1"  ->  [[60,1],[62,1],[64,2],[[60,64,67],2],[null,1]]
  function parseSeq(str, transpose) {
    transpose = transpose || 0;
    return str.trim().split(/\s+/).filter(function (t) { return t && t !== '|'; }).map(function (t) {
      var parts = t.split(':'), beats = parts[1] ? parseFloat(parts[1]) : 1;
      if (parts[0] === 'r' || parts[0] === '-') return [null, beats];
      var notes = parts[0].split('+').map(parseNote).filter(function (x) { return x !== null; }).map(function (m) { return m + transpose; });
      return [notes.length === 1 ? notes[0] : notes, beats];
    });
  }
  // swara label for midi m when Sa = sa. Returns {txt, oct} where oct -1 = mandra, +1 = taar
  function swara(m, sa, sys) {
    var rel = m - sa, pc = ((rel % 12) + 12) % 12, oct = Math.floor(rel / 12);
    return { txt: (sys === 'carn' ? CARN : HIND)[pc], oct: oct };
  }
  function swaraHTML(m, sa, sys) {
    var s = swara(m, sa, sys);
    var up = s.oct > 0 ? '•'.repeat(Math.min(s.oct, 2)) : '', dn = s.oct < 0 ? '•'.repeat(Math.min(-s.oct, 2)) : '';
    // dots live in their own rows (above = taar, below = mandra) so they never collide with the letter name
    return '<span class="sw"><i class="dot">' + up + '</i>' + s.txt + '<i class="dot">' + dn + '</i></span>';
  }

  /* ---------------- sound ---------------- */
  var instr = store.get('instr', 'piano');
  function ensureAudio() { PS.init(); if (PS.ctx && PS.ctx.state !== 'running') PS.ctx.resume(); return PS.ctx; }
  function note(m, dur, opts) { ensureAudio(); opts = opts || {}; opts.instr = opts.instr || instr; return PS.note(m, dur, opts); }

  // instrument picker in the header
  (function () {
    var sel = $('#instrPick'); if (!sel) return;
    sel.value = instr;
    sel.addEventListener('change', function () { instr = this.value; store.set('instr', instr); note(60, 0.6); });
  })();

  /* ---------------- tanpura drone ---------------- */
  var drone = { on: false, sa: 60, timer: null, btns: [] };
  function droneCycle(next) {
    if (!drone.on) return;
    var ac = PS.ctx, sa = drone.sa;
    // classic tuning: Pa (lower), Sa, Sa, Sa (lowest)
    [sa - 5, sa, sa, sa - 12].forEach(function (m, i) { PS.voice('tanpura', m, i === 3 ? 0.9 : 0.7, next + i * 0.62); });
    var cycle = 2.9;
    drone.timer = setTimeout(function () { droneCycle(next + cycle); }, Math.max(50, (next + cycle - ac.currentTime - 0.35) * 1000));
  }
  function droneSet(on, sa) {
    if (sa !== undefined) drone.sa = sa;
    if (on && !drone.on) { ensureAudio(); drone.on = true; droneCycle(PS.ctx.currentTime + 0.05); }
    if (!on) { drone.on = false; clearTimeout(drone.timer); }
    $$('button.drone').forEach(function (b) { b.classList.toggle('on', drone.on); b.setAttribute('aria-pressed', drone.on); });
  }
  $$('button.drone').forEach(function (b) {
    b.addEventListener('click', function () {
      var sa = b.dataset.sa ? parseNote(b.dataset.sa) : drone.sa;
      droneSet(!drone.on, sa);
    });
  });

  /* ---------------- mini keyboard ---------------- */
  var kbds = {};
  function Kbd(el) {
    var self = this;
    this.el = el;
    this.from = parseNote(el.dataset.from || 'C4');
    this.to = parseNote(el.dataset.to || 'C5');
    this.sa = parseNote(el.dataset.sa || 'C4');
    this.labels = el.dataset.labels || 'both'; // letters | hind | carn | both | bothc | none
    this.listeners = [];
    this.keys = {};
    this.silent = el.hasAttribute('data-silent');
    this.render();
    if (el.dataset.mark) this.mark(parseSeq(el.dataset.mark).map(function (s) { return s[0]; }), 'mark');
    el.addEventListener('pointerdown', function (e) {
      var k = e.target.closest('.k'); if (!k) return;
      e.preventDefault();
      var m = +k.dataset.m;
      if (!self.silent) note(m, 0.9);
      self.flash(m);
      self.listeners.forEach(function (fn) { fn(m); });
    });
  }
  Kbd.prototype.render = function () {
    var whites = [], m, html = '', self = this;
    for (m = this.from; m <= this.to; m++) if (!IS_BLACK[((m % 12) + 12) % 12]) whites.push(m);
    var ww = 100 / whites.length;
    this.el.style.setProperty('--whites', whites.length);
    var wi = 0;
    for (m = this.from; m <= this.to; m++) {
      var black = IS_BLACK[((m % 12) + 12) % 12], lab = this.labelHTML(m, black);
      if (!black) {
        html += '<div class="k w" data-m="' + m + '" style="left:' + (wi * ww) + '%;width:' + ww + '%">' + lab + '</div>';
        wi++;
      } else {
        html += '<div class="k b" data-m="' + m + '" style="left:' + (wi * ww - ww * 0.31) + '%;width:' + (ww * 0.62) + '%">' + lab + '</div>';
      }
    }
    this.el.innerHTML = '<div class="kbd-in">' + html + '</div>';
    this.keys = {};
    $$('.k', this.el).forEach(function (k) { self.keys[k.dataset.m] = k; });
  };
  Kbd.prototype.labelHTML = function (m, black) {
    var L = this.labels, top = '', bot = '';
    var letter = noteName(m).replace(/-?\d+$/, '');
    if (m % 12 === 0) letter = noteName(m);
    if (L === 'letters' || L === 'both' || L === 'bothc') top = '<b class="lt">' + letter + '</b>';
    if (L === 'hind' || L === 'both') bot = swaraHTML(m, this.sa, 'hind');
    if (L === 'carn' || L === 'bothc') bot = swaraHTML(m, this.sa, 'carn');
    return '<span class="lab">' + bot + top + '</span>';
  };
  Kbd.prototype.setSa = function (sa) { this.sa = sa; this.render(); return this; };
  Kbd.prototype.setLabels = function (l) { this.labels = l; this.render(); return this; };
  Kbd.prototype.on = function (fn) { this.listeners.push(fn); return this; };
  Kbd.prototype.flash = function (m, ms) {
    var k = this.keys[m]; if (!k) return;
    k.style.setProperty('--h', ((m % 12) * 30));
    k.classList.add('hit'); clearTimeout(k._t);
    k._t = setTimeout(function () { k.classList.remove('hit'); }, ms || 380);
  };
  Kbd.prototype.mark = function (list, cls) {
    cls = cls || 'mark'; var self = this;
    $$('.' + cls, this.el).forEach(function (k) { k.classList.remove(cls); });
    (list || []).forEach(function (m) { var k = self.keys[m]; if (k) { k.style.setProperty('--h', ((m % 12) * 30)); k.classList.add(cls); } });
    return this;
  };
  Kbd.prototype.tag = function (m, text) { // little badge above a key (e.g. "W" / "H")
    var k = this.keys[m]; if (!k) return;
    var t = k.querySelector('.tag'); if (!t) { t = document.createElement('span'); t.className = 'tag'; k.appendChild(t); }
    t.textContent = text; if (!text) t.remove();
  };
  Kbd.prototype.clearTags = function () { $$('.tag', this.el).forEach(function (t) { t.remove(); }); };
  $$('.kbd').forEach(function (el, i) { var k = new Kbd(el); kbds[el.id || ('kbd' + i)] = k; });

  /* ---------------- play buttons ---------------- */
  function playSeq(steps, opts) {
    ensureAudio(); opts = opts || {};
    var kb = opts.kbd;
    return PS.seq(steps, {
      bpm: opts.bpm || 96, instr: opts.instr || instr, legato: opts.legato,
      onStep: function (i, notes) { if (kb) notes.forEach(function (m) { kb.flash(m, Math.max(250, 60000 / (opts.bpm || 96) * steps[i][1] * 0.9)); }); if (opts.onStep) opts.onStep(i, notes); },
      onEnd: opts.onEnd
    });
  }
  $$('button.play[data-seq]').forEach(function (b) {
    var label = b.innerHTML, playing = null;
    b.addEventListener('click', function () {
      if (playing) { playing.stop(); playing = null; b.innerHTML = label; b.classList.remove('on'); return; }
      var kb = b.dataset.kbd ? kbds[b.dataset.kbd] : null;
      var tr = 0;
      if (b.dataset.relsa && kb) tr = kb.sa - parseNote(b.dataset.relsa); // sequences written for Sa=C can follow a moved Sa
      playing = playSeq(parseSeq(b.dataset.seq, tr), {
        bpm: +b.dataset.bpm || 96, instr: b.dataset.instr, kbd: kb,
        onEnd: function () { playing = null; b.innerHTML = label; b.classList.remove('on'); }
      });
      b.innerHTML = '■ Stop'; b.classList.add('on');
    });
  });
  $$('button.hz[data-hz]').forEach(function (b) { // play exact frequencies, e.g. data-hz="220 330" (together) or "220,440" (one after another)
    b.addEventListener('click', function () {
      ensureAudio();
      var dur = +(b.dataset.dur || 1.6), t0 = 0;
      b.dataset.hz.split(',').forEach(function (grp) {
        grp.trim().split(/\s+/).forEach(function (hz) { PS.note(0, dur, { hz: +hz, instr: b.dataset.instr || 'pure', delay: t0 }); });
        t0 += dur + 0.15;
      });
    });
  });

  /* ---------------- quizzes ---------------- */
  var lessonId = document.body.dataset.lesson || '';
  function progress() { try { return JSON.parse(store.get('progress', '{}')) || {}; } catch (e) { return {}; } }
  function saveProgress(p) { store.set('progress', JSON.stringify(p)); }
  function recordScore(key, ok) {
    if (!lessonId) return;
    var p = progress(); p[lessonId] = p[lessonId] || {}; p[lessonId].q = p[lessonId].q || {};
    if (p[lessonId].q[key] === undefined) p[lessonId].q[key] = ok ? 1 : 0; // first attempt counts
    saveProgress(p);
  }
  $$('.quiz').forEach(function (q, qi) {
    var opts = $$('.opt', q), why = $('.why', q), key = q.dataset.key || ('q' + qi);
    // shuffle options so position isn't a clue
    var box = opts[0] && opts[0].parentNode;
    opts.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (o) { box.appendChild(o); });
    if (why) box.appendChild(why);
    opts.forEach(function (o) {
      o.addEventListener('click', function () {
        if (q.classList.contains('answered')) return;
        var ok = o.hasAttribute('data-correct');
        q.classList.add('answered'); o.classList.add(ok ? 'right' : 'wrong');
        if (!ok) opts.forEach(function (x) { if (x.hasAttribute('data-correct')) x.classList.add('right'); });
        if (why) why.hidden = false;
        recordScore(key, ok);
      });
    });
    if (why) why.hidden = true;
  });

  /* ---------------- ear / practice game ---------------- */
  // LK.game(el, { rounds, title, make: () => ({ prompt, play?, options:[{label,value}], answer, explain? }) })
  function game(el, cfg) {
    var rounds = cfg.rounds || 6, r = 0, score = 0, cur = null;
    el.classList.add('game');
    el.innerHTML = '<div class="g-top"><b class="g-title"></b><span class="g-score"></span></div>' +
      '<p class="g-prompt"></p><div class="g-ctl"></div><div class="g-opts"></div><p class="g-fb"></p>' +
      '<div class="g-end" hidden><p class="g-final"></p><button type="button" class="btn small g-again">↻ Play again</button></div>';
    var title = $('.g-title', el), sc = $('.g-score', el), pr = $('.g-prompt', el), ctl = $('.g-ctl', el), op = $('.g-opts', el), fb = $('.g-fb', el), end = $('.g-end', el);
    title.textContent = cfg.title || 'Practice';
    function next() {
      if (r >= rounds) return finish();
      r++; cur = cfg.make(r); fb.textContent = ''; fb.className = 'g-fb';
      sc.textContent = 'Round ' + r + ' / ' + rounds + ' · ' + score + ' right';
      pr.innerHTML = cur.prompt || '';
      ctl.innerHTML = '';
      if (cur.play) {
        var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'btn small'; pb.textContent = '▶ Play';
        pb.addEventListener('click', function () { cur.play(); }); ctl.appendChild(pb);
        var rb = document.createElement('span'); rb.className = 'g-hint'; rb.textContent = 'You can replay as often as you like.'; ctl.appendChild(rb);
        setTimeout(function () { cur.play(); }, 250);
      }
      op.innerHTML = '';
      cur.options.forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.innerHTML = o.label;
        b.addEventListener('click', function () { answer(o.value, b); }); op.appendChild(b);
      });
    }
    function answer(v, b) {
      if (op.classList.contains('locked')) return;
      op.classList.add('locked');
      var ok = (typeof cur.answer === 'function') ? cur.answer(v) : v === cur.answer;
      if (ok) score++;
      b.classList.add(ok ? 'right' : 'wrong');
      $$('.opt', op).forEach(function (x, i) { if (cur.options[i].value === cur.answer) x.classList.add('right'); });
      fb.className = 'g-fb ' + (ok ? 'good' : 'bad');
      fb.innerHTML = (ok ? '✓ Yes. ' : '✗ Not this time. ') + (cur.explain || '');
      sc.textContent = 'Round ' + r + ' / ' + rounds + ' · ' + score + ' right';
      var nb = document.createElement('button'); nb.type = 'button'; nb.className = 'btn small ghost'; nb.textContent = r >= rounds ? 'See score →' : 'Next →';
      nb.addEventListener('click', function () { op.classList.remove('locked'); next(); });
      ctl.appendChild(nb);
    }
    function finish() {
      pr.innerHTML = ''; ctl.innerHTML = ''; op.innerHTML = ''; fb.textContent = '';
      end.hidden = false;
      var pct = Math.round(score / rounds * 100);
      $('.g-final', el).innerHTML = '<b>' + score + ' / ' + rounds + '</b> · ' + (pct >= 85 ? 'Your ear has this. 🎯' : pct >= 60 ? 'Nearly there. Another round will lock it in.' : 'Normal for a first try. Ears train fast: go again.');
      recordScore('game-' + (el.id || 'g'), pct >= 60);
    }
    $('.g-again', el).addEventListener('click', function () { r = 0; score = 0; end.hidden = true; next(); });
    // don't auto-start sound before a click: show a start button
    pr.innerHTML = cfg.intro || '';
    var sb = document.createElement('button'); sb.type = 'button'; sb.className = 'btn'; sb.textContent = '▶ Start';
    sb.addEventListener('click', function () { ensureAudio(); next(); }); ctl.appendChild(sb);
  }

  /* ---------------- lesson complete ---------------- */
  $$('.done-btn').forEach(function (b) {
    var id = b.dataset.lesson || lessonId;
    function paint() { var p = progress(); var d = p[id] && p[id].done; b.classList.toggle('is-done', !!d); b.textContent = d ? '✓ Lesson complete' : 'Mark this lesson complete'; }
    b.addEventListener('click', function () { var p = progress(); p[id] = p[id] || {}; p[id].done = !p[id].done; p[id].when = Date.now(); saveProgress(p); paint(); });
    paint();
  });

  /* ---------------- reading progress bar ---------------- */
  (function () {
    var bar = $('.readbar'); if (!bar) return;
    function upd() { var h = document.documentElement; var p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight); bar.style.width = (p * 100).toFixed(1) + '%'; }
    window.addEventListener('scroll', upd, { passive: true }); upd();
  })();

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  window.LK = {
    $: $, $$: $$, kbd: function (id) { return kbds[id]; }, Kbd: Kbd,
    note: note, playSeq: playSeq, parseSeq: parseSeq, parseNote: parseNote, noteName: noteName,
    swara: swara, swaraHTML: swaraHTML, NAMES: NAMES, SHARPS: SHARPS, HIND: HIND, HIND_LONG: HIND_LONG, CARN: CARN, IS_BLACK: IS_BLACK,
    drone: droneSet, droneState: drone, game: game, ensureAudio: ensureAudio, progress: progress,
    shuffle: shuffle, pick: pick, store: store,
    get instr() { return instr; }
  };
})();
