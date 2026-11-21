/* London attacks: replay viewer with story beats and pause-and-predict stops.
   All positions and answers are precomputed in attacks-data.js. */
(function () {
  'use strict';
  var G = window.ATTACKS, $ = function (id) { return document.getElementById(id); };
  var KEY = 'dml-chess-attacks';
  var store = { get: function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } },
                set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } } };
  var saved = store.get(); saved.solved = saved.solved || {}; saved.seen = saved.seen || {};
  var gi = 0, ply = 0, timer = null, busy = false;
  var answered = {};   // per session: "game:ply" -> true once answered or revealed
  var tries = {};      // "game:ply" -> wrong attempts
  var order = {};      // "game:ply" -> shuffled option order
  var board = new MiniBoard($('board'), { orientation: 'w', pieceBase: 'pieces/' });
  var TOTAL = G.reduce(function (n, g) { return n + Object.keys(g.quiz).length; }, 0);

  function g() { return G[gi]; }
  function fenAt(p) { return p === 0 ? g().start : g().plies[p - 1].fen; }
  function lastAt(p) { if (p === 0) return null; var u = g().plies[p - 1].uci; return [u.slice(0, 2), u.slice(2, 4)]; }
  function label(p) { if (p === 0) return 'Start'; var n = Math.ceil(p / 2); return n + (p % 2 ? '.' : '...') + ' ' + g().plies[p - 1].san; }
  function qkey(p) { return g().id + ':' + p; }
  function pendingQuiz(p) { return g().quiz[p] && !answered[qkey(p)]; }

  /* ---------- theme ---------- */
  (function () {
    var b = $('themebtn');
    function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }
    function paint() { b.textContent = light() ? '🌙 Dark' : '☀️ Light'; }
    b.addEventListener('click', function () { var t = light() ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('dml-theme', t); } catch (e) { } paint(); });
    paint();
  })();

  function score() {
    var n = Object.keys(saved.solved).length;
    $('scorePill').textContent = '🎯 ' + n + '/' + TOTAL;
  }

  /* ---------- tabs ---------- */
  function tabs() {
    $('gtabs').innerHTML = G.map(function (x, i) {
      var qs = Object.keys(x.quiz), done = qs.filter(function (p) { return saved.solved[x.id + ':' + p]; }).length;
      return '<button class="gtab' + (i === gi ? ' on' : '') + '" style="--c:' + x.c + '" data-i="' + i + '" type="button">' +
        (saved.seen[x.id] ? '<span class="done">' + done + '/' + qs.length + ' 🎯</span>' : '') +
        '<span class="n">Battle ' + (i + 1) + '</span><b>' + x.title + '</b><small>' + x.players + '</small><div class="war">🎖️ ' + x.war + '</div></button>';
    }).join('');
    [].forEach.call($('gtabs').children, function (b) { b.onclick = function () { load(+b.dataset.i, true); }; });
  }

  /* ---------- load a game ---------- */
  function load(i, scroll) {
    stop(); gi = i; ply = 0;
    var x = g();
    $('game').style.setProperty('--c', x.c);
    $('gKick').textContent = 'Battle ' + (i + 1) + ' of 3 · ' + x.result;
    $('gTitle').textContent = x.title;
    $('gSrc').textContent = x.players + ' · ' + x.event;
    $('bWar').textContent = x.war;
    $('bText').innerHTML = x.brief;
    $('brief').classList.remove('folded'); $('foldBtn').textContent = 'Hide';
    $('whoW').textContent = x.players;
    $('debrief').innerHTML = x.debrief.map(function (d, k) {
      return '<div class="d"><div class="k">LESSON ' + (k + 1) + '</div><b>' + d[0] + '</b><p>' + d[1] + '</p></div>';
    }).join('');
    $('linkline').innerHTML = x.link;
    $('nextGame').textContent = i < G.length - 1 ? 'Next battle: ' + G[i + 1].title + ' ▶' : 'Back to battle 1 ↺';
    moveList();
    saved.seen[x.id] = 1; store.set(saved);
    tabs(); render();
    if (location.hash !== '#' + x.id) history.replaceState(null, '', '#' + x.id);
    if (scroll) $('game').scrollIntoView({ behavior: 'smooth' });
  }

  function moveList() {
    var h = '', P = g().plies;
    for (var k = 0; k < P.length; k++) {
      if (k % 2 === 0) h += '<span class="no">' + (k / 2 + 1) + '.</span>';
      h += '<span class="m' + (g().beats[k + 1] ? ' key' : '') + '" data-p="' + (k + 1) + '">' + P[k].san + '</span>';
    }
    $('moves').innerHTML = h;
    [].forEach.call($('moves').querySelectorAll('.m'), function (m) { m.onclick = function () { stop(); go(+m.dataset.p); }; });
  }

  /* ---------- render ---------- */
  function render() {
    var x = g(), beat = x.beats[ply];
    board.setMarks(beat ? (beat.marks || []) : []);
    board.setFen(fenAt(ply), lastAt(ply));
    board.setArrows(beat ? beat.arrows : []);
    var src = ply, b = beat;
    while (!b && src > 0) { src--; b = x.beats[src]; }
    $('narr').classList.toggle('stale', !beat);
    $('narr').innerHTML = b ? ((beat ? '' : '<div class="since">story so far · from ' + label(src) + '</div>') + '<div class="beat-t">' + b.t + '</div>' + b.h) : '';
    $('nowMove').textContent = ply ? 'Now: ' + label(ply) : 'Starting position';
    $('turn').textContent = ply % 2 ? 'Black to move' : 'White to move';
    $('stepNo').textContent = ply + ' / ' + x.plies.length;
    $('bPrev').disabled = $('bStart').disabled = ply === 0;
    $('bNext').disabled = $('bEnd').disabled = ply === x.plies.length;
    [].forEach.call($('moves').querySelectorAll('.m'), function (m) { m.classList.toggle('on', +m.dataset.p === ply); });
    quiz();
  }

  /* ---------- pause-and-predict ---------- */
  function quiz() {
    var q = g().quiz[ply], box = $('quiz');
    if (!q || answered[qkey(ply)] === 'gone') { box.classList.remove('show'); return; }
    box.classList.add('show');
    $('qWho').textContent = q.who;
    $('qText').innerHTML = q.q;
    var done = !!answered[qkey(ply)], key = qkey(ply);
    if (!order[key]) { order[key] = q.opts.map(function (o, k) { return k; }); for (var i = order[key].length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[key][i]; order[key][i] = order[key][j]; order[key][j] = t; } }
    $('qOpts').innerHTML = order[key].map(function (k, pos) {
      return '<button class="cand" type="button" data-k="' + k + '"' + (done ? ' disabled' : '') + '><b>' + String.fromCharCode(65 + pos) + '</b>' + q.opts[k][0] + '</button>';
    }).join('');
    $('qStatus').style.display = 'none'; $('qWhy').innerHTML = '';
    $('qReveal').style.display = done ? 'none' : '';
    if (done) reveal(false);
    [].forEach.call($('qOpts').children, function (btn) { btn.onclick = function () { pick(+btn.dataset.k, btn); }; });
  }

  function pick(k, btn) {
    var q = g().quiz[ply], o = q.opts[k], key = qkey(ply), st = $('qStatus');
    st.style.display = 'block';
    if (o[1]) {
      if (!tries[key] && !answered[key]) { saved.solved[key] = 1; store.set(saved); score(); tabs(); }
      answered[key] = true;
      st.className = 'status ok';
      st.innerHTML = (tries[key] ? '✅ Got it.' : '🎯 First try!') + ' Press <b>Next ▶</b> to see what happened in the game.';
      reveal(true);
    } else {
      tries[key] = (tries[key] || 0) + 1;
      btn.classList.add('wrong'); btn.disabled = true;
      st.className = 'status no';
      st.innerHTML = '<b>' + o[0] + '?</b> ' + o[2];
    }
  }

  function reveal(withStatus) {
    var q = g().quiz[ply], key = qkey(ply);
    answered[key] = answered[key] || true;
    var right = q.opts.filter(function (o) { return o[1]; })[0];
    [].forEach.call($('qOpts').children, function (b) { b.disabled = true; if (q.opts[+b.dataset.k][1]) b.classList.add('glow'); });
    $('qWhy').innerHTML = '<div class="lbl">Why ' + right[0] + '</div><p>' + right[2] + '</p>';
    $('qReveal').style.display = 'none';
    board.setArrows(q.arrows || []);
    if (!withStatus) { /* revisiting: keep quiet */ }
  }

  /* ---------- movement ---------- */
  function go(p) { ply = Math.max(0, Math.min(g().plies.length, p)); render(); }

  function next() {
    if (busy) return;
    if (pendingQuiz(ply)) { stop(); nudge(); return; }
    if (ply >= g().plies.length) { stop(); return; }
    var mv = g().plies[ply]; busy = true;
    board.setArrows([]); board.setMarks([]);
    board.play(mv.uci, mv.fen, function () { busy = false; ply++; render(); if (pendingQuiz(ply)) stop(); });
  }
  function nudge() {
    var box = $('quiz'); box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    var st = $('qStatus'); st.style.display = 'block'; st.className = 'status meh';
    st.innerHTML = 'Pick a move first, or press <b>Show the answer</b>.';
  }
  function play() {
    if (timer) { stop(); return; }
    $('bPlay').textContent = '⏸ Pause';
    timer = setInterval(function () { if (ply >= g().plies.length || pendingQuiz(ply)) { stop(); if (pendingQuiz(ply)) nudge(); return; } next(); }, 1100);
    next();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; $('bPlay').textContent = '⏵ Play'; }

  $('bNext').onclick = function () { stop(); next(); };
  $('bPrev').onclick = function () { stop(); go(ply - 1); };
  $('bStart').onclick = function () { stop(); go(0); };
  $('bEnd').onclick = function () { stop(); go(g().plies.length); };
  $('bPlay').onclick = play;
  $('qReveal').onclick = function () { var st = $('qStatus'); st.style.display = 'block'; st.className = 'status meh'; st.innerHTML = 'Here is the answer. Press <b>Next ▶</b> to continue.'; reveal(true); };
  $('foldBtn').onclick = function () { var f = $('brief').classList.toggle('folded'); this.textContent = f ? 'Show briefing' : 'Hide'; };
  $('nextGame').onclick = function () { load((gi + 1) % G.length, true); };
  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { stop(); next(); } else if (e.key === 'ArrowLeft') { stop(); go(ply - 1); }
  });

  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1);
    G.forEach(function (x, i) { if (x.id === id && i !== gi) load(i, true); });
  });
  var start = 0, h = location.hash.slice(1);
  G.forEach(function (x, i) { if (x.id === h) start = i; });
  score(); load(start, false);
})();
