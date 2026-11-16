/* =====================================================================
   Tactics: the story. UI for lessons (heroes), case files and arena.
   All positions/answers come from data.js (window.TACTICS).
   ===================================================================== */
(function () {
  'use strict';
  var T = window.TACTICS, P = T.patterns;
  var ITEMS = {}; T.items.forEach(function (it) { ITEMS[it.id] = it; });
  var FAMC = T.famColors || { guard: 'var(--guard)', line: 'var(--linec)', clock: 'var(--clock)' };
  var FAMN = T.famNames || { guard: 'the guard', line: 'the line', clock: 'the clock' };
  var ORDER = T.order || ['deflection', 'decoy', 'overload', 'interference', 'clearance', 'zwischenzug', 'windmill'];
  var NOUN = T.noun || 'pattern';
  var TAIL = T.guessTail || 'Watch for the moment {fam} breaks.';
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function colorOf(p) { return FAMC[P[p].fam]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function turnOf(fen) { return fen.split(' ')[1]; }
  function moveNo(fen) { return parseInt(fen.split(' ')[5], 10) || 1; }
  function stars(n) { return n ? '★★★'.slice(0, n) + '<span style="opacity:.25">' + '★★★'.slice(n) + '</span>' : ''; }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- theme ---------- */
  (function () {
    var b = $('#themebtn'); if (!b) return;
    function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }
    function paint() { b.textContent = light() ? '🌙 Dark' : '☀️ Light'; }
    b.addEventListener('click', function () { var t = light() ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); store.set('fable-theme-raw', t); try { localStorage.setItem('fable-theme', t); } catch (e) { } paint(); });
    paint();
  })();

  /* ---------- move list helper ---------- */
  function moveListHTML(item, cur) {
    var h = '', no = moveNo(item.fen), t = turnOf(item.fen);
    item.steps.forEach(function (s, i) {
      if (t === 'w') h += '<span class="no">' + no + '.</span>';
      else if (i === 0) h += '<span class="no">' + no + '...</span>';
      h += '<span class="m' + (i + 1 === cur ? ' on' : '') + '" data-i="' + (i + 1) + '">' + s.s + '</span>';
      if (t === 'b') no++;
      t = t === 'w' ? 'b' : 'w';
    });
    return h;
  }
  function sanLabel(item, i) {
    var no = moveNo(item.fen), t = turnOf(item.fen);
    for (var k = 0; k < i; k++) { if (t === 'b') no++; t = t === 'w' ? 'b' : 'w'; }
    return no + (t === 'w' ? '.' : '...') + item.steps[i].s;
  }

  /* =================================================================
     VIEWER: step through a narrated line (heroes + case files)
     ================================================================= */
  function Viewer(root, opts) {
    opts = opts || {};
    this.root = root; this.opts = opts;
    root.classList.add('viewer'); root.tabIndex = 0;
    root.innerHTML =
      '<div><div class="vb"></div><div class="who"><span class="turn"></span><span>← → keys work too</span></div></div>' +
      '<div class="vt"><div class="title"></div><div class="src"></div><div class="guesswrap"></div><div class="narr"></div>' +
      '<div class="ctrls"><button class="b0" title="Start">⏮</button><button class="bp" title="Back">◀</button>' +
      '<button class="main bn">Next move ▶</button><button class="be" title="End">⏭</button><span class="stepno"></span></div>' +
      '<div class="movelist"></div><div class="why"><div class="lbl">Why it worked</div><div class="wt"></div></div></div>';
    this.board = new MiniBoard($('.vb', root), {});
    var self = this;
    $('.b0', root).onclick = function () { self.go(0); };
    $('.bp', root).onclick = function () { self.go(self.i - 1); };
    $('.bn', root).onclick = function () { self.go(self.i + 1); };
    $('.be', root).onclick = function () { self.go(self.item.steps.length); };
    $('.movelist', root).addEventListener('click', function (e) { var i = e.target.getAttribute('data-i'); if (i) self.go(+i); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); self.go(self.i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); self.go(self.i - 1); }
    });
    if (opts.item) this.load(opts.item);
  }
  Viewer.prototype.load = function (item) {
    this.item = item; this.i = 0; this.guessed = !this.opts.guess;
    this.root.style.setProperty('--c', colorOf(item.pattern));
    this.board.setOrientation(item.orient);
    $('.title', this.root).innerHTML = item.title + (item.diff ? ' <span class="diff">' + stars(item.diff) + '</span>' : '');
    $('.src', this.root).textContent = item.src;
    var gw = $('.guesswrap', this.root); gw.innerHTML = '';
    if (this.opts.guess) this.buildGuess(gw);
    this.go(0, true);
  };
  Viewer.prototype.buildGuess = function (gw) {
    var self = this, item = this.item;
    var g = el('div', 'guess', '<div class="q">🕵️ Before you step through: which ' + NOUN + ' do you smell?</div><div class="chips"></div><div class="verdict"></div>');
    var chips = $('.chips', g);
    ORDER.forEach(function (p) {
      var c = el('button', 'chip', P[p].name); c.type = 'button';
      c.onclick = function () {
        var ok = p === item.pattern;
        c.classList.add(ok ? 'right' : 'wrong');
        if (ok || self.tries >= 1) {
          [].forEach.call(chips.children, function (x) { x.disabled = true; if (x.textContent === P[item.pattern].name) x.classList.add('right'); });
          $('.verdict', g).innerHTML = ok ? (self.tries ? '✅ Got it on the second look.' : '✅ Sharp eye.') + ' Now watch it unfold.' : '❌ It\'s <b>' + P[item.pattern].name + '</b>. ' + TAIL.replace('{fam}', FAMN[P[item.pattern].fam]);
          self.guessed = true; self.refresh();
          self.opts.onGuess && self.opts.onGuess(item, ok && !self.tries);
        } else { $('.verdict', g).textContent = 'Not quite. One more guess.'; }
        self.tries = (self.tries || 0) + 1;
      };
      chips.appendChild(c);
    });
    var skip = el('button', 'chip', 'Skip →'); skip.type = 'button'; skip.style.opacity = '.7';
    skip.onclick = function () { [].forEach.call(chips.children, function (x) { x.disabled = true; }); self.guessed = true; $('.verdict', g).innerHTML = 'Skipped. (The answer will show up in the story.)'; self.refresh(); };
    chips.appendChild(skip);
    this.tries = 0;
    gw.appendChild(g);
  };
  Viewer.prototype.go = function (i, instant) {
    var it = this.item, n = it.steps.length;
    if (i < 0 || i > n) return;
    if (!this.guessed && i > 0) return;
    var self = this;
    if (!instant && i === this.i + 1) {
      var s = it.steps[i - 1];
      this.board.setArrows([]);
      this.board.marks = [];
      this.board.play(s.u, s.f, function () { self.i = i; self.decorate(); });
      this.i = i; this.refresh(true);
      return;
    }
    this.i = i;
    if (i === 0) this.board.setFen(it.fen, null);
    else { var st = it.steps[i - 1]; this.board.setFen(st.f, [st.u.slice(0, 2), st.u.slice(2, 4)]); }
    this.decorate(); this.refresh();
  };
  Viewer.prototype.decorate = function () {
    var it = this.item, i = this.i, s = i ? it.steps[i - 1] : null;
    this.board.setMarks(i ? (s.m || []) : it.m0);
    this.board.setArrows(i ? (s.a || []) : it.a0);
  };
  Viewer.prototype.refresh = function () {
    var it = this.item, i = this.i, n = it.steps.length, r = this.root;
    var note;
    if (i === 0) note = (it.teaser ? '<p><b>' + it.teaser + '</b></p>' : '') + (this.guessed || !it.teaser ? it.n0 : '');
    else note = it.steps[i - 1].n || '<p><span class="mv">' + sanLabel(it, i - 1) + '</span></p>';
    $('.narr', r).innerHTML = note;
    var fen = i ? it.steps[i - 1].f : it.fen;
    $('.turn', r).textContent = (i === n && it.mate) ? 'Checkmate.' : (turnOf(fen) === 'w' ? '○ White to move' : '● Black to move');
    $('.b0', r).disabled = $('.bp', r).disabled = i === 0;
    $('.bn', r).disabled = $('.be', r).disabled = i === n || !this.guessed;
    $('.bn', r).textContent = !this.guessed ? 'Guess first ↑' : (i === 0 ? 'Start ▶' : 'Next move ▶');
    $('.stepno', r).textContent = i + ' / ' + n;
    $('.movelist', r).innerHTML = moveListHTML(it, i);
    var why = $('.why', r);
    $('.wt', why).innerHTML = it.why;
    why.classList.toggle('show', i === n);
  };

  /* lessons: one hero viewer per pattern */
  [].forEach.call(document.querySelectorAll('[data-hero]'), function (node) {
    new Viewer(node, { item: ITEMS[node.getAttribute('data-hero')] });
  });

  /* ---------- hero animation: Philidor's legacy on loop ---------- */
  (function () {
    var node = $('#heroBoard'); if (!node) return;
    var it = ITEMS[node.getAttribute('data-loop') || 's-philidor'], b = new MiniBoard(node, {}), i = 0;
    if (!it) return;
    b.setOrientation(it.orient);
    b.setFen(it.fen);
    function tick() {
      if (i < it.steps.length) { var s = it.steps[i++]; b.play(s.u, s.f); setTimeout(tick, i === it.steps.length ? 3200 : 1250); }
      else { i = 0; b.setFen(it.fen); setTimeout(tick, 1400); }
    }
    setTimeout(tick, 1500);
  })();

  /* =================================================================
     CASE FILES (solved examples, shuffled)
     ================================================================= */
  var caseIds = T.items.filter(function (x) { return x.kind === 'solved'; }).map(function (x) { return x.id; });
  var caseRoot = $('#cases');
  if (caseRoot) {
    var caseOrder = shuffle(caseIds), caseIdx = 0, caseSeen = {};
    var deck = $('#caseDeck'), cv = new Viewer($('#caseViewer'), { guess: true, onGuess: function () { } });
    function drawDeck() {
      deck.innerHTML = '';
      caseOrder.forEach(function (id, k) {
        var b = el('button', (k === caseIdx ? 'on' : '') + (caseSeen[id] ? ' done' : ''), String(k + 1));
        b.title = 'Case ' + (k + 1); b.onclick = function () { openCase(k); };
        deck.appendChild(b);
      });
    }
    function openCase(k) { caseIdx = k; caseSeen[caseOrder[k]] = 1; cv.load(ITEMS[caseOrder[k]]); drawDeck(); }
    $('#caseNext').onclick = function () { openCase((caseIdx + 1) % caseOrder.length); $('#caseViewer').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    $('#caseShuffle').onclick = function () { caseOrder = shuffle(caseIds); caseSeen = {}; openCase(0); };
    openCase(0);
  }

  /* =================================================================
     ARENA (practice, shuffled, you move)
     ================================================================= */
  var arenaRoot = $('#arena');
  if (arenaRoot) {
    var pIds = T.items.filter(function (x) { return x.kind === 'practice'; }).map(function (x) { return x.id; });
    var KEY = T.storeKey || 'dml-chess-arena';
    var prog = store.get(KEY, {});
    var order = shuffle(pIds), k = 0, cur = null;
    var board = new MiniBoard($('#arenaBoard'), { onMove: function (u) { userMove(u); } });
    var S = { idx: 0, mistakes: 0, hints: 0, busy: false, done: false, revealed: false };
    var aDeck = $('#arenaDeck'), status = $('#arenaStatus'), log = $('#arenaLog'), task = $('#arenaTask');

    function score() {
      var solved = 0, clean = 0;
      pIds.forEach(function (id) { if (prog[id]) { solved++; if (prog[id].clean) clean++; } });
      $('#arenaScore').innerHTML = 'Solved <b>' + solved + '</b> / ' + pIds.length + ' · clean (no hints, no mistakes) <b>' + clean + '</b>';
      var pill = $('#scorePill'); if (pill) pill.innerHTML = '♞ <b>' + solved + '</b>/' + pIds.length;
    }
    function drawDeck() {
      aDeck.innerHTML = '';
      order.forEach(function (id, j) {
        var b = el('button', (j === k ? 'on' : '') + (prog[id] ? ' done' : ''), String(j + 1));
        b.onclick = function () { open(j); };
        aDeck.appendChild(b);
      });
    }
    function setStatus(cls, html) { status.className = 'status ' + (cls || ''); status.innerHTML = html; }
    function addLog(html) { if (!html) return; var d = el('div', '', html); log.appendChild(d); }
    function open(j) {
      k = j; cur = ITEMS[order[k]];
      S = { idx: 0, mistakes: 0, hints: 0, busy: false, done: false, revealed: false };
      arenaRoot.style.setProperty('--c', colorOf(cur.pattern));
      board.setOrientation(cur.orient);
      board.setFen(cur.fen); board.setArrows([]); board.setMarks([]);
      $('#arenaTitle').innerHTML = 'Puzzle ' + (k + 1) + ' · ' + cur.title + ' <span class="diff">' + stars(cur.diff) + '</span>';
      $('#arenaSrc').textContent = cur.src;
      task.innerHTML = cur.task;
      log.innerHTML = ''; $('#arenaWhy').classList.remove('show'); $('#arenaName').innerHTML = '';
      $('#arenaHint').disabled = false; $('#arenaSolve').disabled = false;
      drawDeck();
      clearChoices();
      var firstUser = cur.steps.filter(function (x) { return x.user; })[0] || {};
      setStatus('', (cur.orient === 'w' ? '○ White' : '● Black') + ' to move. ' + (firstUser.choices ? 'Three candidate moves are drawn on the board. Pick the one that follows the principle.' : 'Tap a piece, then tap where it goes.'));
      advance();
    }
    function advance() {
      if (S.idx >= cur.steps.length) return finish();
      var st = cur.steps[S.idx];
      if (st.user && st.choices) { showChoices(st); return; }
      if (st.user) { board.enable(st.legal); return; }
      board.disable(); S.busy = true;
      setTimeout(function () {
        board.play(st.u, st.f, function () {
          S.busy = false; addLog(st.n || '<p><span class="mv">' + sanLabel(cur, S.idx) + '</span></p>');
          S.idx++; advance();
        });
      }, 650);
    }
    function playMain(prefix) {
      var st = cur.steps[S.idx]; board.disable();
      board.setMarks([]); board.setArrows([]);
      board.play(st.u, st.f, function () {
        addLog(st.n || '<p><span class="mv">' + sanLabel(cur, S.idx) + '</span></p>');
        S.idx++;
        if (prefix) setStatus('ok', prefix);
        advance();
      });
    }
    function userMove(u) {
      if (S.busy || S.done) return;
      var st = cur.steps[S.idx];
      if (u === st.u) { setStatus('ok', '✓ ' + st.s + '! ' + (S.idx + 1 < cur.steps.length ? 'Keep going.' : '')); playMain(); return; }
      if ((st.mates || []).indexOf(u) >= 0) {
        board.disable(); setStatus('ok', '✓ That\'s mate too! (The main line was ' + st.s + '.)');
        S.idx = cur.steps.length; addLog('<p>You found a different mate. Both work.</p>');
        board.play(u, mateFen(st, u), function () { finish(); });
        return;
      }
      if ((st.equal || []).indexOf(u) >= 0) { setStatus('ok', '✓ Equally strong! We\'ll follow the main line with ' + st.s + '.'); playMain('✓ Equally strong. Main line: ' + st.s + '.'); return; }
      S.mistakes++;
      flash(u);
      if ((st.also || []).indexOf(u) >= 0) setStatus('meh', '🟡 That keeps an edge, but there is a sharper blow here. The pattern wants more. Try again.');
      else setStatus('no', '✗ Not this one. ' + (S.mistakes >= 2 && !S.hints ? 'Stuck? Try a hint.' : 'Look again: what is each defender\'s job?'));
    }
    function clearChoices() { var c = $('#arenaChoices'); if (c) c.innerHTML = ''; }
    function showChoices(st) {
      var box = $('#arenaChoices'); if (!box) return;
      board.disable(); box.innerHTML = '';
      var opts = shuffle(st.choices), letters = 'ABC';
      var kinds = ['a', 'd', 'e'];
      function drawCands() { board.setArrows(opts.filter(function (c) { return !c.gone; }).map(function (c) { return { u: c.u, k: kinds[opts.indexOf(c)] }; })); }
      opts.forEach(function (c) { c.gone = false; });
      drawCands();
      opts.forEach(function (c, i) {
        var b = el('button', 'cand k-' + kinds[i], '<b>' + letters[i] + '</b> ' + c.s); b.type = 'button'; b._c = c;
        b.onclick = function () {
          if (S.busy || S.done) return;
          if (c.ok) {
            box.innerHTML = ''; board.setArrows([]);
            setStatus('ok', '✓ <b>' + c.s + '</b>. ' + c.why);
            S.busy = true;
            var stp = cur.steps[S.idx];
            board.play(stp.u, stp.f, function () {
              S.busy = false;
              addLog(stp.n || '<p><span class="mv">' + sanLabel(cur, S.idx) + '</span></p>');
              S.idx++; setTimeout(advance, 900);
            });
          } else {
            S.mistakes++; b.disabled = true; b.classList.add('wrong'); c.gone = true; drawCands();
            setStatus('no', '✗ <b>' + c.s + '</b>: ' + c.why + ' Try another.');
          }
        };
        box.appendChild(b);
      });
    }
    function mateFen(st, u) { return (st.mf && st.mf[u]) || st.f; }
    function flash(u) {
      board.setMarks([{ sq: u.slice(2, 4), cls: 'bad' }]);
      setTimeout(function () { if (!S.done) board.setMarks([]); }, 700);
    }
    $('#arenaHint').onclick = function () {
      if (S.done) return;
      var st = cur.steps[S.idx]; if (!st || !st.user) return;
      S.hints++;
      if (st.choices) {
        if (S.hints === 1) { S.revealed = true; setStatus('meh', '💡 ' + NOUN.charAt(0).toUpperCase() + NOUN.slice(1) + ': <b>' + P[cur.pattern].name + '</b>. ' + P[cur.pattern].hint); }
        else if (S.hints === 2) { var w = [].filter.call(document.querySelectorAll('#arenaChoices button'), function (b) { return !b._c.ok && !b.disabled; })[0]; if (w) { w.disabled = true; w.classList.add('wrong'); } setStatus('meh', '💡 One wrong candidate removed.'); }
        else { [].forEach.call(document.querySelectorAll('#arenaChoices button'), function (b) { if (b._c.ok) b.classList.add('glow'); }); board.setArrows([{ u: st.u, k: 'c' }]); setStatus('meh', '💡 Play ' + st.s + '.'); }
        return;
      }
      if (S.hints === 1) { S.revealed = true; setStatus('meh', '💡 ' + NOUN.charAt(0).toUpperCase() + NOUN.slice(1) + ': <b>' + P[cur.pattern].name + '</b>. ' + P[cur.pattern].hint); }
      else if (S.hints === 2) { board.setMarks([{ sq: st.u.slice(0, 2), cls: 'hint' }]); setStatus('meh', '💡 Move the highlighted piece.'); }
      else { board.setArrows([{ u: st.u, k: 'c' }]); setStatus('meh', '💡 Play ' + st.s + '.'); }
    };
    $('#arenaSolve').onclick = function () {
      if (S.done) return;
      S.hints += 3; S.revealed = true; board.disable(); clearChoices(); setStatus('meh', 'Here is the solution…');
      (function step() {
        if (S.idx >= cur.steps.length) return finish();
        var st = cur.steps[S.idx];
        board.play(st.u, st.f, function () { addLog(st.n || '<p><span class="mv">' + sanLabel(cur, S.idx) + '</span></p>'); S.idx++; setTimeout(step, 750); });
      })();
    };
    $('#arenaRetry').onclick = function () { open(k); };
    $('#arenaNext').onclick = function () { open((k + 1) % order.length); arenaRoot.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    $('#arenaShuffle').onclick = function () { order = shuffle(pIds); open(0); };
    function finish() {
      S.done = true; board.disable(); clearChoices();
      var clean = !S.mistakes && !S.hints;
      if (S.hints < 3) {
        var prev = prog[cur.id] || {};
        prog[cur.id] = { ok: true, clean: !!(prev.clean || clean) };
        store.set(KEY, prog);
      }
      var msg = S.hints >= 3 ? '📖 Solution shown. Come back to this one later, and see if you can find it cold.' :
        clean ? '🏆 Solved clean: no hints, no mistakes.' : '✅ Solved' + (S.mistakes ? ' (' + S.mistakes + ' wrong tr' + (S.mistakes > 1 ? 'ies' : 'y') + ')' : '') + (S.hints ? ' with ' + S.hints + ' hint' + (S.hints > 1 ? 's' : '') : '') + '.';
      setStatus('win', msg);
      $('#arenaWhyT').innerHTML = cur.why; $('#arenaWhy').classList.add('show');
      $('#arenaHint').disabled = true; $('#arenaSolve').disabled = true;
      nameIt();
      score(); drawDeck();
    }
    function nameIt() {
      var box = $('#arenaName');
      if (S.revealed) { box.innerHTML = '<span class="tag" style="--c:' + colorOf(cur.pattern) + '">' + P[cur.pattern].name + '</span>'; return; }
      box.innerHTML = '<div class="guess"><div class="q">🧠 Name the ' + NOUN + ' you just used:</div><div class="chips"></div><div class="verdict"></div></div>';
      var chips = $('.chips', box);
      ORDER.forEach(function (p) {
        var c = el('button', 'chip', P[p].name); c.type = 'button';
        c.onclick = function () {
          var ok = p === cur.pattern;
          [].forEach.call(chips.children, function (x) { x.disabled = true; if (x.textContent === P[cur.pattern].name) x.classList.add('right'); });
          if (!ok) c.classList.add('wrong');
          $('.verdict', box).innerHTML = ok ? 'Yes. You found it <i>and</i> named it, and naming it is what makes it stick.' : 'This one was <b>' + P[cur.pattern].name + '</b>. (Real games mix several ideas; this is the main one.)';
        };
        chips.appendChild(c);
      });
    }
    $('#arenaReset').onclick = function () { if (confirm('Forget your arena progress on this device?')) { prog = {}; store.set(KEY, prog); score(); drawDeck(); } };
    score(); open(0);
  }

  /* ---------- twists (tap to reveal) ---------- */
  [].forEach.call(document.querySelectorAll('.twist'), function (t) { t.addEventListener('click', function () { t.classList.add('open'); }); });
})();
