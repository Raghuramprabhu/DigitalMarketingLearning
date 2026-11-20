/* =====================================================================
   Endgame: the story. Lessons, demos and live challenges.
   Demos come precomputed from endgame-data.js (window.ENDGAME).
   Challenges are played live: chess.js for the rules, Stockfish 18
   (WASM, in a Web Worker) as the defender, and the lichess tablebase
   as a perfect judge when it is reachable.
   ===================================================================== */
import { Chess } from './vendor/chess.js';

const D = window.ENDGAME;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LEVEL = {}; D.levels.forEach(l => { LEVEL[l.id] = l; });
const LESSON = {}; D.lessons.forEach(l => { LESSON[l.id] = l; });

/* ---------------- storage + progress ---------------- */
const KEY = 'dml-chess-eg-v1';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } }
};
const P = Object.assign({ solved: {}, forced: {} }, store.get());
function save() { store.set(P); }
function xp() { return Object.values(P.solved).reduce((s, n) => s + (n === 3 ? 100 : n === 2 ? 70 : 40), 0); }
function solvedIn(levelId) { return D.lessons.filter(l => l.level === levelId && P.solved[l.id]).length; }
function lessonsIn(levelId) { return D.lessons.filter(l => l.level === levelId); }
function unlocked(levelId) {
  const i = D.levels.findIndex(l => l.id === levelId);
  if (i <= 0 || P.forced[levelId]) return true;
  return solvedIn(D.levels[i - 1].id) >= D.levels[i].unlock;
}
function markSolved(id, stars) {
  const before = D.levels.map(l => unlocked(l.id));
  if (!P.solved[id] || P.solved[id] < stars) P.solved[id] = stars;
  save(); refreshProgress();
  D.levels.forEach((l, i) => { if (!before[i] && unlocked(l.id)) toast('🔓 Level ' + l.n + ' unlocked: ' + l.name); });
}

/* ---------------- theme ---------------- */
(function () {
  const b = $('#themebtn'); if (!b) return;
  const light = () => document.documentElement.getAttribute('data-theme') === 'light';
  const paint = () => { b.textContent = light() ? '🌙 Dark' : '☀️ Light'; };
  b.addEventListener('click', () => { const t = light() ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('dml-theme', t); } catch (e) { } paint(); });
  paint();
})();

/* ---------------- celebration ---------------- */
function toast(msg) { const t = el('div', 'toast', msg); document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function celebrate(points, anchor) {
  const colors = ['#e9b44c', '#4fd1c5', '#b69cff', '#7ee787', '#f0803c', '#ff7b72'];
  for (let i = 0; i < 46; i++) {
    const c = el('div', 'confetti');
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % colors.length];
    c.style.animationDelay = (Math.random() * .35) + 's'; c.style.animationDuration = (1.2 + Math.random() * .9) + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
  }
  if (points) {
    const r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const f = el('div', 'xpfloat', '+' + points + ' XP');
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = Math.max(60, r.top) + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 1500);
  }
}

/* =================================================================
   ENGINE: Stockfish in a worker, one job at a time
   ================================================================= */
const Engine = {
  w: null, ready: false, failed: false, q: [], cur: null, listeners: [],
  status(s) { this.state = s; this.listeners.forEach(f => f(s)); },
  start() {
    if (this.w || this.failed) return;
    this.status('loading');
    try {
      if (typeof WebAssembly !== 'object') throw new Error('no wasm');
      this.w = new Worker('vendor/stockfish-18-lite-single.js');
    } catch (e) { this.failed = true; this.status('failed'); return; }
    this.w.onmessage = e => this.line(String(e.data));
    this.w.onerror = () => { this.failed = true; this.status('failed'); this.flush(); };
    this.send('uci'); this.send('setoption name Hash value 16'); this.send('isready');
    this.bootTimer = setTimeout(() => { if (!this.ready) { this.failed = true; this.status('failed'); this.flush(); } }, 45000);
  },
  send(c) { this.w && this.w.postMessage(c); },
  line(s) {
    if (s === 'readyok' && !this.ready) { this.ready = true; clearTimeout(this.bootTimer); this.status('ready'); this.pump(); return; }
    const j = this.cur; if (!j) return;
    if (s.startsWith('info') && s.includes(' score ') && !s.includes('bound') && !/ multipv [2-9]/.test(s)) {
      const m = s.match(/ score (cp|mate) (-?\d+)/), pv = s.match(/ pv (.+)$/);
      if (m) { j.score = { type: m[1], v: parseInt(m[2], 10) }; if (pv) j.pv = pv[1].split(' '); }
    } else if (s.startsWith('bestmove')) {
      clearTimeout(j.timer);
      const bm = s.split(' ')[1];
      this.cur = null; this.status('ready');
      j.resolve({ best: bm && bm !== '(none)' ? bm : null, score: j.score || null, pv: j.pv || [] });
      this.pump();
    }
  },
  analyse(fen, ms) {
    return new Promise((resolve, reject) => {
      this.start();
      if (this.failed) { reject(new Error('engine')); return; }
      this.q.push({ fen, ms: ms || 800, resolve, reject }); this.pump();
    });
  },
  pump() {
    if (!this.ready || this.cur || !this.q.length) return;
    const j = this.cur = this.q.shift();
    this.status('busy');
    this.send('position fen ' + j.fen); this.send('go movetime ' + j.ms);
    j.timer = setTimeout(() => this.send('stop'), j.ms + 5000);
  },
  flush() { this.q.splice(0).forEach(j => j.reject(new Error('engine'))); if (this.cur) { this.cur.reject(new Error('engine')); this.cur = null; } }
};

/* =================================================================
   TABLEBASE: lichess, 7 pieces or fewer. Optional: any failure → engine.
   ================================================================= */
const TB = {
  off: false, fails: 0, cache: new Map(),
  pieces(fen) { return fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length; },
  norm(c) {
    if (c === 'win' || c === 'maybe-win') return 'win';
    if (c === 'loss' || c === 'maybe-loss') return 'loss';
    if (c === 'draw' || c === 'cursed-win' || c === 'blessed-loss') return 'draw';
    return null;
  },
  async probe(fen) {
    if (this.off || this.pieces(fen) > 7 || fen.split(' ')[2] !== '-') return null;
    const key = fen.split(' ').slice(0, 4).join(' ');
    if (this.cache.has(key)) return this.cache.get(key);
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 3500);
      const r = await fetch('https://tablebase.lichess.ovh/standard?fen=' + encodeURIComponent(fen), { signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error('tb ' + r.status);
      const j = await r.json();
      const cat = this.norm(j && j.category);
      if (!cat || !Array.isArray(j.moves)) return null;
      const res = { cat, best: j.moves.length ? j.moves[0].uci : null };
      this.cache.set(key, res); this.fails = 0;
      return res;
    } catch (e) { if (++this.fails >= 2) this.off = true; return null; }
  }
};

/* Evaluate a position for the side to move: {cat:'win'|'draw'|'loss', best, src} */
async function judge(fen, ms) {
  const tb = await TB.probe(fen);
  if (tb) return { cat: tb.cat, best: tb.best, src: 'tablebase' };
  const r = await Engine.analyse(fen, ms);
  let cat = 'draw';
  if (r.score) {
    if (r.score.type === 'mate') cat = r.score.v > 0 ? 'win' : 'loss';
    else cat = r.score.v >= 250 ? 'win' : r.score.v <= -250 ? 'loss' : 'draw';
  }
  return { cat, best: r.best, src: 'engine', score: r.score };
}
const flip = c => c === 'win' ? 'loss' : c === 'loss' ? 'win' : 'draw';

/* =================================================================
   DEMO VIEWER
   ================================================================= */
function moveNo(fen) { return parseInt(fen.split(' ')[5], 10) || 1; }
function turnOf(fen) { return fen.split(' ')[1]; }
function sanLabel(fen0, steps, i) {
  let no = moveNo(fen0), t = turnOf(fen0);
  for (let k = 0; k < i; k++) { if (t === 'b') no++; t = t === 'w' ? 'b' : 'w'; }
  return no + (t === 'w' ? '.' : '...') + steps[i].s;
}
function moveListHTML(fen0, steps, cur) {
  let h = '', no = moveNo(fen0), t = turnOf(fen0);
  steps.forEach((s, i) => {
    if (t === 'w') h += '<span class="no">' + no + '.</span>';
    else if (i === 0) h += '<span class="no">' + no + '...</span>';
    h += '<span class="m' + (i + 1 === cur ? ' on' : '') + '" data-i="' + (i + 1) + '">' + s.s + '</span>';
    if (t === 'b') no++;
    t = t === 'w' ? 'b' : 'w';
  });
  return h;
}

function Viewer(root, demos) {
  this.root = root; this.demos = demos; this.d = null; this.i = 0; this.auto = null;
  root.classList.add('viewer'); root.tabIndex = 0;
  root.innerHTML =
    '<div><div class="vb"></div><div class="who"><span class="turn"></span><span>← → keys work too</span></div></div>' +
    '<div class="vt"><div class="title"></div><div class="src"></div><div class="narr"></div>' +
    '<div class="ctrls"><button class="b0" title="Start" type="button">⏮</button><button class="bp" title="Back" type="button">◀</button>' +
    '<button class="main bn" type="button">Next move ▶</button><button class="be" title="End" type="button">⏭</button>' +
    '<button class="auto" title="Auto-play" type="button">⏵ Auto</button><span class="stepno"></span></div>' +
    '<div class="movelist"></div></div>';
  if (demos.length > 1) {
    const tabs = el('div', 'demotabs');
    demos.forEach((d, k) => { const b = el('button', '', d.title); b.type = 'button'; b.onclick = () => this.load(k); tabs.appendChild(b); });
    $('.vt', root).insertBefore(tabs, $('.narr', root));
    this.tabs = tabs;
  }
  this.board = new MiniBoard($('.vb', root), {});
  $('.b0', root).onclick = () => { this.stop(); this.go(0); };
  $('.bp', root).onclick = () => { this.stop(); this.go(this.i - 1); };
  $('.bn', root).onclick = () => { this.stop(); this.go(this.i + 1); };
  $('.be', root).onclick = () => { this.stop(); this.go(this.d.steps.length); };
  $('.auto', root).onclick = () => this.auto ? this.stop() : this.play();
  $('.movelist', root).addEventListener('click', e => { const i = e.target.getAttribute('data-i'); if (i) { this.stop(); this.go(+i); } });
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); this.stop(); this.go(this.i + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.stop(); this.go(this.i - 1); }
  });
  this.load(0);
}
Viewer.prototype.load = function (k) {
  this.stop();
  this.d = this.demos[k];
  if (this.tabs) [...this.tabs.children].forEach((b, j) => b.classList.toggle('on', j === k));
  this.board.setOrientation(this.d.orient || 'w');
  $('.title', this.root).textContent = this.d.title;
  $('.src', this.root).textContent = this.d.src;
  this.i = 0; this.go(0, true);
};
Viewer.prototype.play = function () {
  const b = $('.auto', this.root); b.classList.add('on'); b.textContent = '⏸ Pause';
  if (this.i >= this.d.steps.length) this.go(0, true);
  const tick = () => {
    if (this.i >= this.d.steps.length) { this.stop(); return; }
    this.go(this.i + 1);
    const hasNote = this.d.steps[this.i - 1] && this.d.steps[this.i - 1].n;
    this.auto = setTimeout(tick, hasNote ? 3600 : 1100);
  };
  this.auto = setTimeout(tick, 400);
};
Viewer.prototype.stop = function () {
  clearTimeout(this.auto); this.auto = null;
  const b = $('.auto', this.root); if (b) { b.classList.remove('on'); b.textContent = '⏵ Auto'; }
};
Viewer.prototype.go = function (i, instant) {
  const d = this.d, n = d.steps.length;
  if (i < 0 || i > n) return;
  if (!instant && i === this.i + 1) {
    const s = d.steps[i - 1];
    this.board.setArrows([]); this.board.marks = [];
    this.board.play(s.u, s.f, () => this.decorate());
    this.i = i; this.refresh(); return;
  }
  this.i = i;
  if (i === 0) this.board.setFen(d.fen, null);
  else { const st = d.steps[i - 1]; this.board.setFen(st.f, [st.u.slice(0, 2), st.u.slice(2, 4)]); }
  this.decorate(); this.refresh();
};
Viewer.prototype.decorate = function () {
  const d = this.d, s = this.i ? d.steps[this.i - 1] : null;
  this.board.setMarks(this.i ? (s.m || []) : (d.m0 || []));
  this.board.setArrows(this.i ? (s.a || []) : (d.a0 || []));
};
Viewer.prototype.refresh = function () {
  const d = this.d, i = this.i, n = d.steps.length, r = this.root;
  $('.narr', r).innerHTML = i === 0 ? d.n0 : (d.steps[i - 1].n || '<p><span class="mv">' + sanLabel(d.fen, d.steps, i - 1) + '</span></p>');
  const fen = i ? d.steps[i - 1].f : d.fen;
  $('.turn', r).textContent = (i === n && d.mate) ? 'Checkmate.' : (turnOf(fen) === 'w' ? '○ White to move' : '● Black to move');
  $('.b0', r).disabled = $('.bp', r).disabled = i === 0;
  $('.bn', r).disabled = $('.be', r).disabled = i === n;
  $('.bn', r).textContent = i === 0 ? 'Start ▶' : 'Next move ▶';
  $('.stepno', r).textContent = i + ' / ' + n;
  $('.movelist', r).innerHTML = moveListHTML(d.fen, d.steps, i);
};

/* =================================================================
   CHALLENGE: play a position out against the defender
   ================================================================= */
const GOALTXT = {
  mate: g => '🎯 Checkmate' + (g.limit ? ' · ≤ ' + g.limit + ' moves' : ''),
  promote: () => '🎯 Promote & keep the queen',
  material: () => '🎯 Win the material',
  hold: g => '🛡️ Hold the draw · ' + g.n + ' moves',
  reach: g => '🛡️ Reach ' + g.sq.join('/') + ' (or ' + g.n + ' safe moves)'
};
const isWinGoal = g => ['mate', 'promote', 'material'].includes(g.type);

function countPieces(game, color) {
  const c = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  game.board().forEach(row => row.forEach(sq => { if (sq && sq.color === color) c[sq.type]++; }));
  return c;
}
function kingSquare(game, color) {
  let s = null; game.board().forEach(row => row.forEach(sq => { if (sq && sq.color === color && sq.type === 'k') s = sq.square; })); return s;
}
function uciOf(m) { return m.from + m.to + (m.promotion || ''); }

function Challenge(root, spec, opts) {
  this.root = root; this.spec = spec; this.opts = opts || {};
  this.c = spec.color || 'var(--gold)';
  root.classList.add('viewer', 'chal'); root.style.setProperty('--c', this.c);
  root.innerHTML =
    '<div><div class="vb"></div><div class="who"><span class="turn"></span><span class="engline"><span class="dotx"></span><span class="et">Stockfish sleeps until you move</span></span></div></div>' +
    '<div class="vt"><div class="kick2">' + (this.opts.kicker || 'Your turn · challenge') + '</div><div class="title"></div>' +
    '<div class="goalrow"></div><div class="task"></div><div class="status"></div>' +
    '<div class="coach"><div class="t"></div><div class="bt"><button class="btn small tb" type="button">↶ Take it back</button><button class="btn small ghost po" type="button">Play on anyway</button></div></div>' +
    '<div class="ctrls"><button class="hintb" type="button">💡 Hint</button><button class="showb" type="button">🤖 Show me</button>' +
    '<button class="undob" type="button">↶ Take back</button><button class="resetb" type="button">↺ Restart</button></div>' +
    '<div class="hintbox"></div><div class="movelist"></div>' +
    '<div class="resultcard"><div class="h"></div><div class="rt"></div><div class="starsline"></div><div class="ctas" style="margin-top:10px"></div></div></div>';
  this.board = new MiniBoard($('.vb', root), { onMove: u => this.userMove(u) });
  this.board.setOrientation(spec.orient || 'w');
  $('.hintb', root).onclick = () => this.hint();
  $('.showb', root).onclick = () => this.showMe();
  $('.undob', root).onclick = () => this.takeBack();
  $('.resetb', root).onclick = () => this.reset();
  $('.coach .tb', root).onclick = () => this.coachTakeBack();
  $('.coach .po', root).onclick = () => this.coachPlayOn();
  this.engUI = $('.engline', root);
  $('.vb', root).addEventListener('pointerdown', () => { if (!this.warmed) { this.warmed = true; this.ensureBefore(); } });
  Engine.listeners.push(s => this.paintEngine(s));
  this.paintEngine(Engine.state);
  this.reset();
}
Challenge.prototype.paintEngine = function (s) {
  const e = this.engUI, t = $('.et', e);
  e.classList.remove('ok', 'busy', 'bad');
  if (!s) { t.textContent = 'Stockfish sleeps until you move'; return; }
  if (s === 'loading') { e.classList.add('busy'); t.textContent = 'Loading Stockfish (7 MB, once)…'; }
  else if (s === 'busy') { e.classList.add('busy'); t.textContent = 'Stockfish thinking…'; }
  else if (s === 'ready') { e.classList.add('ok'); t.textContent = 'Stockfish 18 ready' + (TB.off ? '' : ' · tablebase on'); }
  else if (s === 'failed') { e.classList.add('bad'); t.textContent = TB.off ? 'Engine unavailable' : 'Engine unavailable · tablebase only'; }
};
Challenge.prototype.reset = function () {
  const s = this.spec;
  this.game = new Chess(s.fen);
  this.me = this.game.turn();
  this.userMoves = 0; this.hintsUsed = 0; this.assist = 0; this.done = false; this.busy = false; this.pendingPromo = null;
  this.before = null; this.beforeP = null; this.pendingDef = null;
  this.startCounts = countPieces(this.game, this.me);
  $('.title', this.root).textContent = s.title;
  const g = s.goal;
  $('.goalrow', this.root).innerHTML = '<span class="gp goal">' + GOALTXT[g.type](g) + '</span>' +
    '<span class="gp side-' + this.me + '">You play ' + (this.me === 'w' ? 'White' : 'Black') + '</span>' +
    '<span class="gp moves">Moves: <b class="mc">0</b></span>';
  $('.task', this.root).textContent = s.task;
  $('.hintbox', this.root).classList.remove('show'); $('.hintbox', this.root).innerHTML = '';
  $('.coach', this.root).classList.remove('show');
  $('.resultcard', this.root).classList.remove('show', 'fail');
  this.board.setOrientation(s.orient || 'w');
  this.board.setArrows([]); this.board.setMarks([]);
  this.board.setFen(s.fen, null);
  this.setStatus((P.solved[s.id] ? '✅ Already cleared (' + '★'.repeat(P.solved[s.id]) + '). Play it again any time. ' : '') + 'Your move. Tap a piece, then its square.');
  this.refresh(); this.enable();
};
Challenge.prototype.setStatus = function (html, cls) { const st = $('.status', this.root); st.className = 'status' + (cls ? ' ' + cls : ''); st.innerHTML = html; };
Challenge.prototype.refresh = function () {
  const hist = this.game.history();
  const steps = hist.map(s => ({ s }));
  $('.movelist', this.root).innerHTML = moveListHTML(this.spec.fen, steps, steps.length);
  $('.mc', this.root).textContent = this.userMoves;
  const t = this.game.turn();
  $('.turn', this.root).textContent = this.done ? 'Finished.' : (t === 'w' ? '○ White to move' : '● Black to move') + (t === this.me ? ' (you)' : '');
  $('.undob', this.root).disabled = this.done || this.busy || hist.length < 1;
  $('.showb', this.root).disabled = this.done || this.busy || t !== this.me;
  $('.hintb', this.root).disabled = !this.spec.hints || !this.spec.hints.length;
};
Challenge.prototype.enable = function () {
  if (this.done || this.game.turn() !== this.me) { this.board.disable(); return; }
  this.board.enable(this.game.moves({ verbose: true }).map(uciOf));
};
Challenge.prototype.lastMarks = function () {
  const h = this.game.history({ verbose: true }); const m = h[h.length - 1];
  return m ? [m.from, m.to] : null;
};
Challenge.prototype.hint = function () {
  const hs = this.spec.hints || []; if (!hs.length) return;
  const k = Math.min(this.hintsUsed, hs.length - 1);
  if (this.hintsUsed < hs.length) this.hintsUsed++;
  const box = $('.hintbox', this.root);
  box.innerHTML = hs.slice(0, Math.max(1, this.hintsUsed)).map((h, i) => '<p>💡 <b>' + (i + 1) + '.</b> ' + h + '</p>').join('');
  box.classList.add('show');
  if (k >= hs.length - 1) $('.hintb', this.root).textContent = '💡 All hints shown';
};

/* ---- status bookkeeping (for the coach) ---- */
Challenge.prototype.ensureBefore = async function () {
  if (this.spec.coach === false) { Engine.start(); return; }
  if (this.before || this.beforeP) return;
  const fen = this.game.fen(), n = this.game.history().length;
  if (TB.pieces(fen) > 7 || TB.off) Engine.start();
  this.beforeFen = fen;
  this.beforeP = judge(fen, 700).then(j => {
    if (this.game.history().length === n && this.game.fen() === fen) this.before = j.cat;
    return j.cat;
  }, () => null);
};

Challenge.prototype.userMove = async function (u) {
  if (this.busy || this.done) return;
  const fenBefore = this.game.fen();
  let mv;
  try { mv = this.game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { mv = null; }
  if (!mv) { this.enable(); return; }
  this.userMoves++; this.busy = true; this.board.disable();
  this.board.play(u, this.game.fen(), () => { });
  this.refresh();
  if (mv.promotion) this.pendingPromo = mv.promotion;
  // terminal checks after the user's move
  if (this.afterUserMoveTerminal()) { this.busy = false; this.refresh(); return; }
  this.setStatus('<span class="thinking">Stockfish is answering</span>');
  // the defender thinks; the same search tells the coach what changed
  if (Engine.state !== 'ready' && !Engine.failed) Engine.start();
  let j;
  let prevBefore = this.before;
  if (!prevBefore && this.beforeP && this.beforeFen === fenBefore) prevBefore = await this.beforeP;
  this.beforeP = null;
  try { j = await judge(this.game.fen(), 800); }
  catch (e) {
    this.setStatus('The engine could not load, so there is no defender in this browser. Try reloading, or another browser.', 'no');
    this.game.undo(); this.userMoves--; this.busy = false; this.board.setFen(fenBefore, null); this.refresh(); this.enable(); return;
  }
  const afterForMe = flip(j.cat);
  this.pendingDef = j.best;
  const g = this.spec.goal;
  const slip = this.spec.coach !== false && prevBefore && (
    (isWinGoal(g) && prevBefore === 'win' && afterForMe !== 'win') ||
    (!isWinGoal(g) && prevBefore !== 'loss' && afterForMe === 'loss'));
  this.before = afterForMe;
  if (slip) {
    const msg = isWinGoal(g)
      ? '⚠️ Coach: that move lets the win slip' + (j.src === 'tablebase' ? ' (tablebase says it\'s no longer a win).' : '. Stockfish no longer sees a win.')
      : '⚠️ Coach: that move loses' + (j.src === 'tablebase' ? ' (tablebase says so with perfect play).' : '. Stockfish now sees a win for your opponent.');
    $('.coach .t', this.root).innerHTML = msg + ' Want to try again from before it?';
    $('.coach', this.root).classList.add('show');
    this.slipPrev = prevBefore;
    this.setStatus('Take it back, or play on and see why.', 'meh');
    return; // wait for the buttons
  }
  await this.defenderMove();
};
Challenge.prototype.coachTakeBack = function () {
  $('.coach', this.root).classList.remove('show');
  this.game.undo(); this.userMoves--; this.assist++; this.pendingPromo = null;
  this.before = this.slipPrev;
  this.board.setFen(this.game.fen(), this.lastMarks());
  this.busy = false; this.setStatus('Taken back. Look again: what did that move give away?', 'meh');
  this.refresh(); this.enable();
};
Challenge.prototype.coachPlayOn = async function () {
  $('.coach', this.root).classList.remove('show');
  await this.defenderMove();
};
Challenge.prototype.defenderMove = async function () {
  let u = this.pendingDef;
  if (!u) {
    try { const r = await Engine.analyse(this.game.fen(), 800); u = r.best; } catch (e) { u = null; }
  }
  if (!u) { this.busy = false; this.refresh(); return; }
  await sleep(150);
  let mv;
  try { mv = this.game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { mv = null; }
  if (!mv) { this.busy = false; this.refresh(); this.enable(); return; }
  await new Promise(res => this.board.play(u, this.game.fen(), res));
  this.busy = false;
  this.refresh();
  if (this.afterDefenderMoveTerminal()) { this.refresh(); return; }
  this.setStatus('Your move.');
  this.enable();
};

Challenge.prototype.afterUserMoveTerminal = function () {
  const G = this.game, g = this.spec.goal, opp = this.me === 'w' ? 'b' : 'w';
  const mine = countPieces(G, this.me), his = countPieces(G, opp);
  if (G.isCheckmate()) return this.finish(true, 'Checkmate! ' + (g.type === 'mate' ? '' : 'Even better than the goal.'));
  if (G.isStalemate()) return isWinGoal(g) ? this.finish(false, 'Stalemate. He has no legal move and isn\'t in check, so the win became a draw. Check his king\'s squares before every move once the box is small.') : this.finish(true, 'Stalemate: draw. You held.');
  if (G.isInsufficientMaterial()) return isWinGoal(g) ? this.finish(false, 'Not enough material left to mate. Draw.') : this.finish(true, 'Nothing left that can mate you. Draw: you held.');
  if (G.isThreefoldRepetition()) return isWinGoal(g) ? this.finish(false, 'Threefold repetition: draw. A won position needs progress, not shuffling.') : this.finish(true, 'Threefold repetition: draw. You held.');
  if (G.isDrawByFiftyMoves()) return isWinGoal(g) ? this.finish(false, 'Fifty moves without a capture or pawn move: draw.') : this.finish(true, 'Fifty-move rule: draw. You held.');
  if (his.q > 0 && mine.q === 0 && his.q + his.r > mine.r + mine.q) return this.finish(false, 'His pawn became a queen and you have none. That race was lost.');
  if (g.type === 'material' && his.p + his.n + his.b + his.r + his.q === 0 && (mine.q + mine.r) > 0) return this.finish(true, 'His last piece is gone, and you keep a major piece. The rest is a basic mate from Level 1.');
  if (g.type === 'reach' && g.sq.includes(kingSquare(G, this.me))) return this.finish(true, 'Your king is home in the corner. The fortress stands: draw.');
  if (g.type === 'mate' && g.limit && this.userMoves >= g.limit) return this.finish(false, 'Move ' + g.limit + ' and no mate yet. Try again with the method: doors first, king second.');
  if (isWinGoal(g) && mine.p + mine.n + mine.b + mine.r + mine.q === 0) return this.finish(false, 'You have no pieces or pawns left that can win.');
  return false;
};
Challenge.prototype.afterDefenderMoveTerminal = function () {
  const G = this.game, g = this.spec.goal, opp = this.me === 'w' ? 'b' : 'w';
  const mine = countPieces(G, this.me), his = countPieces(G, opp);
  if (G.isCheckmate()) return this.finish(false, 'You were checkmated.');
  if (G.isStalemate()) return isWinGoal(g) ? this.finish(false, 'Stalemate: draw.') : this.finish(true, 'Stalemate: draw. You held.');
  if (G.isInsufficientMaterial()) return isWinGoal(g) ? this.finish(false, 'He took your last winning material. Draw.') : this.finish(true, 'Nothing left that can mate you. Draw: you held.');
  if (G.isThreefoldRepetition()) return isWinGoal(g) ? this.finish(false, 'Threefold repetition: draw.') : this.finish(true, 'Threefold repetition: draw. You held.');
  if (this.pendingPromo) {
    const t = this.pendingPromo, extra = mine[t] - this.startCounts[t];
    this.pendingPromo = null;
    if (g.type === 'promote' && extra > 0) return this.finish(true, 'New ' + ({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' })[t] + ' on the board, and it survived. The rest is Level 1.');
  }
  if (g.type === 'material' && his.p + his.n + his.b + his.r + his.q === 0 && (mine.q + mine.r) > 0) return this.finish(true, 'His last piece is gone. Won.');
  if ((g.type === 'hold' || g.type === 'reach') && this.userMoves >= g.n) return this.finish(true, g.n + ' moves and still standing. Draw secured.');
  return false;
};
Challenge.prototype.finish = function (ok, msg) {
  this.done = true; this.busy = false; this.board.disable();
  const rc = $('.resultcard', this.root);
  rc.classList.add('show'); rc.classList.toggle('fail', !ok);
  let stars = 0;
  if (ok) {
    stars = 3 - (this.hintsUsed ? 1 : 0) - (this.assist ? 1 : 0);
    stars = Math.max(1, stars);
    $('.h', rc).textContent = ['', 'Solved, with help', 'Nicely done', 'Clean solve!'][stars];
    $('.rt', rc).innerHTML = '<p>' + msg + '</p>' + (this.spec.win ? '<p>' + this.spec.win + '</p>' : '');
    $('.starsline', rc).innerHTML = '★'.repeat(stars) + '<span style="opacity:.25">' + '★'.repeat(3 - stars) + '</span>';
    const prev = P.solved[this.spec.id] || 0;
    markSolved(this.spec.id, stars);
    celebrate(stars > prev ? (stars === 3 ? 100 : stars === 2 ? 70 : 40) - (prev ? (prev === 3 ? 100 : prev === 2 ? 70 : 40) : 0) : 0, rc);
    this.setStatus('✅ ' + msg, 'ok');
  } else {
    $('.h', rc).textContent = 'Not this time';
    $('.rt', rc).innerHTML = '<p>' + msg + '</p><p>Restart and try a different plan, or use a hint.</p>';
    $('.starsline', rc).innerHTML = '';
    this.setStatus('❌ ' + msg, 'no');
  }
  const ctas = $('.ctas', rc); ctas.innerHTML = '';
  const again = el('button', 'btn small ghost', '↺ Play again'); again.type = 'button'; again.onclick = () => this.reset(); ctas.appendChild(again);
  if (this.opts.next) { const nx = el('a', 'btn small', this.opts.next.label); nx.href = this.opts.next.href; ctas.appendChild(nx); }
  this.refresh();
  return true;
};
Challenge.prototype.takeBack = function () {
  if (this.busy || this.done) return;
  const h = this.game.history({ verbose: true });
  if (!h.length) return;
  // undo back to the user's last turn
  this.game.undo();
  if (this.game.turn() !== this.me && this.game.history().length) this.game.undo();
  else if (this.game.turn() !== this.me) { this.game = new Chess(this.spec.fen); }
  this.userMoves = Math.max(0, this.userMoves - 1); this.assist++; this.before = null; this.beforeP = null; this.pendingPromo = null;
  this.board.setFen(this.game.fen(), this.lastMarks());
  this.ensureBefore();
  this.setStatus('Taken back. Your move.', 'meh');
  this.refresh(); this.enable();
};
Challenge.prototype.showMe = async function () {
  if (this.busy || this.done || this.game.turn() !== this.me) return;
  this.busy = true; this.board.disable(); this.refresh();
  this.setStatus('<span class="thinking">Asking for the best move</span>');
  let best = null;
  try { const j = await judge(this.game.fen(), 1200); best = j.best; this.before = j.cat; } catch (e) { best = null; }
  this.busy = false;
  if (!best) { this.setStatus('No engine available to show a move.', 'no'); this.refresh(); this.enable(); return; }
  this.assist++;
  this.board.setArrows([{ u: best, k: 'c' }]);
  this.setStatus('🤖 The arrow shows the best move. Play it (or your own idea).', 'meh');
  this.refresh(); this.enable();
};

/* =================================================================
   CHOICE challenge (pick one of three moves)
   ================================================================= */
function Choice(root, spec, opts) {
  this.root = root; this.spec = spec; this.opts = opts || {};
  root.classList.add('viewer', 'chal'); root.style.setProperty('--c', spec.color || 'var(--gold)');
  root.innerHTML = '<div><div class="vb"></div><div class="who"><span class="turn"></span><span>choose a move</span></div></div>' +
    '<div class="vt"><div class="kick2">Your turn · choose the plan</div><div class="title"></div><div class="task"></div>' +
    '<div class="choices"></div><div class="status"></div><div class="movelist"></div>' +
    '<div class="resultcard"><div class="h"></div><div class="rt"></div><div class="starsline"></div><div class="ctas" style="margin-top:10px"></div></div></div>';
  this.board = new MiniBoard($('.vb', root), {});
  this.reset();
}
Choice.prototype.reset = function () {
  const s = this.spec; this.tries = 0; this.done = false;
  this.board.setOrientation(s.orient || 'w'); this.board.setFen(s.fen, null); this.board.setArrows([]);
  $('.title', this.root).textContent = s.title; $('.task', this.root).textContent = s.task;
  $('.turn', this.root).textContent = turnOf(s.fen) === 'w' ? '○ White to move' : '● Black to move';
  $('.resultcard', this.root).classList.remove('show', 'fail'); $('.movelist', this.root).innerHTML = '';
  $('.status', this.root).className = 'status'; $('.status', this.root).textContent = P.solved[s.id] ? '✅ Already cleared. Try it again.' : 'Which move follows the principle?';
  const box = $('.choices', this.root); box.innerHTML = '';
  shuffle(s.options).forEach(o => {
    const b = el('button', 'cand', '<b>?</b>' + o.san); b.type = 'button';
    b.onclick = () => this.pick(o, b); box.appendChild(b);
  });
};
Choice.prototype.pick = async function (o, btn) {
  if (this.done) return;
  const st = $('.status', this.root);
  if (!o.ok) {
    this.tries++; btn.classList.add('wrong'); btn.disabled = true;
    st.className = 'status no'; st.innerHTML = '❌ <b>' + o.san + '?</b> ' + o.why;
    this.board.play(o.u, o.f, () => { setTimeout(() => this.board.setFen(this.spec.fen, null), 1300); });
    return;
  }
  this.done = true; btn.classList.add('right');
  $$('.cand', this.root).forEach(b => b.disabled = true);
  st.className = 'status ok'; st.innerHTML = '✅ <b>' + o.san + '!</b> ' + o.why;
  const steps = this.spec.steps;
  for (let i = 0; i < steps.length; i++) {
    await new Promise(res => this.board.play(steps[i].u, steps[i].f, res));
    $('.movelist', this.root).innerHTML = moveListHTML(this.spec.fen, steps, i + 1);
    await sleep(650);
  }
  const stars = Math.max(1, 3 - this.tries);
  const prev = P.solved[this.spec.id] || 0;
  markSolved(this.spec.id, stars);
  const rc = $('.resultcard', this.root); rc.classList.add('show');
  $('.h', rc).textContent = stars === 3 ? 'Clean solve!' : 'Solved';
  $('.rt', rc).innerHTML = '<p>' + (this.spec.win || '') + '</p>';
  $('.starsline', rc).innerHTML = '★'.repeat(stars) + '<span style="opacity:.25">' + '★'.repeat(3 - stars) + '</span>';
  const ctas = $('.ctas', rc); ctas.innerHTML = '';
  const again = el('button', 'btn small ghost', '↺ Again'); again.type = 'button'; again.onclick = () => this.reset(); ctas.appendChild(again);
  if (this.opts.next) { const nx = el('a', 'btn small', this.opts.next.label); nx.href = this.opts.next.href; ctas.appendChild(nx); }
  celebrate(stars > prev ? [0, 40, 70, 100][stars] - [0, 40, 70, 100][prev] : 0, rc);
};

/* =================================================================
   PAGE
   ================================================================= */
function renderMap() {
  const box = $('#lvmap'); box.innerHTML = '';
  D.levels.forEach(l => {
    const tot = lessonsIn(l.id).length, s = solvedIn(l.id), open = unlocked(l.id);
    const a = el('a', 'lv' + (open ? '' : ' locked') + (s === tot ? ' done' : ''));
    a.href = '#' + l.id; a.style.setProperty('--c', l.c);
    a.innerHTML = '<span class="n">Level ' + l.n + ' · ' + l.tag + '</span><b>' + l.name + '</b><small>' + lessonsIn(l.id).map(x => x.title).join(' · ') + '</small>' +
      '<div class="bar2"><i style="width:' + Math.round(100 * s / tot) + '%"></i></div><span class="st">' + s + ' / ' + tot + ' cleared' + (open ? '' : ' · 🔒 clear ' + l.unlock + ' in Level ' + (l.n - 1)) + '</span>' +
      (open ? '' : '<span class="lockico">🔒</span>');
    box.appendChild(a);
  });
}
function refreshProgress() {
  $('#xpPill').innerHTML = '♚ <b>' + xp() + '</b> XP';
  renderMap();
  D.levels.forEach(l => {
    const body = $('#' + l.id + '-body'), lock = $('#' + l.id + '-lock');
    if (!body) return;
    const open = unlocked(l.id);
    body.classList.toggle('locked', !open); lock.style.display = open ? 'none' : '';
    $$('#' + l.id + ' .chips2 a').forEach(a => a.classList.toggle('ok', !!P.solved[a.dataset.id]));
    const pr = $('#' + l.id + ' .lprog'); if (pr) pr.textContent = solvedIn(l.id) + ' / ' + lessonsIn(l.id).length + ' cleared';
  });
}

const lazy = [];
function onVisible(node, fn) { lazy.push({ node, fn }); }
const io = 'IntersectionObserver' in window ? new IntersectionObserver(ents => {
  ents.forEach(e => { if (e.isIntersecting) { const k = lazy.findIndex(x => x.node === e.target); if (k >= 0) { const x = lazy.splice(k, 1)[0]; io.unobserve(e.target); x.fn(); } } });
}, { rootMargin: '600px 0px' }) : null;

function renderLevels() {
  const root = $('#levels');
  D.levels.forEach((lv, li) => {
    const head = el('section', 'levelhead'); head.id = lv.id; head.style.setProperty('--c', lv.c);
    const ls = lessonsIn(lv.id);
    head.innerHTML = '<div class="wrap"><div class="num">Level ' + lv.n + ' · ' + lv.tag + ' · <span class="lprog"></span></div><h2>' + lv.name + '</h2><div class="lstory">' + lv.story + '</div>' +
      '<div class="chips2">' + ls.map(l => '<a href="#' + l.id + '" data-id="' + l.id + '">' + l.title + '</a>').join('') + '</div>' +
      '<div class="lockcard" id="' + lv.id + '-lock" style="display:none"><div class="big">🔒</div><b>Level ' + lv.n + ' is locked</b><p>Clear ' + lv.unlock + ' challenges in Level ' + (lv.n - 1) + ' to open it, or step in now if you already know the basics.</p><button class="btn small" type="button">I\'m ready, open it</button></div></div>';
    root.appendChild(head);
    $('button', $('#' + lv.id + '-lock', head)).onclick = () => { P.forced[lv.id] = true; save(); refreshProgress(); };
    const body = el('div', 'level-body'); body.id = lv.id + '-body';
    ls.forEach((l, k) => {
      const sec = el('section', 'lesson'); sec.id = l.id; sec.style.setProperty('--c', lv.c);
      const tells = (l.tells || []).map(t => '<div>' + t + '</div>').join('');
      sec.innerHTML = '<div class="wrap"><div class="kick">' + l.kick + '</div><h3>' + l.title + '</h3><div class="metaphor">' + l.metaphor + '</div>' +
        '<div class="story">' + l.story.map(p => '<p>' + p + '</p>').join('') + '</div>' +
        '<div class="principle"><div class="lbl">First principle</div><p>' + l.principle + '</p></div>' +
        (tells ? '<div class="tells">' + tells + '</div>' : '') + '<div class="sublbl">Watch it</div></div>' +
        '<div class="wide"><div class="demo"></div></div>' +
        '<div class="wrap"><div class="sublbl">Now you</div></div><div class="wide"><div class="chalbox"></div></div>' +
        '<div class="wrap"><div class="twist"><div class="q">' + l.twist.q + '</div><div class="tap">tap to reveal</div><div class="a">' + l.twist.a + '</div></div></div>';
      body.appendChild(sec);
      $('.twist', sec).addEventListener('click', e => e.currentTarget.classList.toggle('open'));
      const nextL = ls[k + 1] || (D.levels[li + 1] ? { id: D.levels[li + 1].id, title: 'Level ' + (lv.n + 1) } : { id: 'gauntlet', title: 'the Gauntlet' });
      const next = { label: 'Next: ' + nextL.title + ' →', href: '#' + nextL.id };
      const demoNode = $('.demo', sec), chNode = $('.chalbox', sec);
      const build = () => {
        new Viewer(demoNode, l.demos);
        const spec = Object.assign({ id: l.id, color: lv.c }, l.challenge);
        if (spec.type === 'choice') new Choice(chNode, spec, { next }); else new Challenge(chNode, spec, { next, kicker: 'Your turn · ' + l.kick.split('·')[0].trim() + ' challenge' });
      };
      if (io) { onVisible(sec, build); io.observe(sec); } else build();
    });
    root.appendChild(body);
  });
}

/* ---------------- gauntlet ---------------- */
function renderGauntlet() {
  let order = D.gauntlet.slice(), cur = 0, reveal = false, ch = null;
  const deck = $('#gDeck'), play = $('#gPlay');
  function paintDeck() {
    deck.innerHTML = '';
    order.forEach((g, i) => {
      const b = el('button', (i === cur ? 'on ' : '') + (P.solved[g.id] ? 'done' : ''), String(i + 1)); b.type = 'button';
      b.title = reveal ? LESSON[g.lesson].title : 'Position ' + (i + 1);
      b.onclick = () => { cur = i; load(); }; deck.appendChild(b);
    });
  }
  function load() {
    const g = order[cur], lv = LEVEL[g.level];
    const spec = Object.assign({ color: lv.c, hints: reveal ? ['The idea: ' + LESSON[g.lesson].title + ' (Level ' + lv.n + ').', LESSON[g.lesson].principle.replace(/<[^>]+>/g, '')] : ['Ask the endgame question: who needs to move, and how many moves does each side need?', 'Which lesson does this remind you of? Tap “Show the idea” above for the answer.'] }, g);
    spec.title = reveal ? g.title + ' · idea: ' + LESSON[g.lesson].title : 'Position ' + (cur + 1);
    play.innerHTML = '';
    const node = el('div'); play.appendChild(node);
    const nxt = order[cur + 1] ? { label: 'Next position →', href: '#gauntlet' } : null;
    ch = new Challenge(node, spec, { kicker: 'Gauntlet · position ' + (cur + 1) + ' of ' + order.length + ' · Level ' + lv.n, next: nxt });
    if (nxt) { const orig = ch.finish.bind(ch); ch.finish = (ok, msg) => { const r = orig(ok, msg); const a = $('.ctas a', node); if (a) a.onclick = e => { e.preventDefault(); cur++; load(); }; paintDeck(); return r; }; }
    paintDeck();
  }
  $('#gShuffle').onclick = () => { order = shuffle(order); cur = 0; load(); };
  $('#gReveal').onclick = () => { reveal = !reveal; $('#gReveal').textContent = reveal ? '🙈 Hide the idea' : '🏷️ Show the idea'; load(); };
  order = shuffle(order);
  const g = $('#gauntlet');
  if (io) { onVisible(g, load); io.observe(g); } else load();
}

/* ---------------- hero loop ---------------- */
function heroLoop() {
  const h = D.hero, b = new MiniBoard($('#heroBoard'), {}); let i = 0;
  b.setFen(h.fen, null);
  function tick() {
    if (i >= h.steps.length) { i = 0; setTimeout(() => { b.setFen(h.fen, null); setTimeout(tick, 1400); }, 2200); return; }
    const s = h.steps[i++]; b.play(s.u, s.f, () => { });
    if (i === 5) b.setArrows([{ u: 'e5h2', k: 'c' }, { u: 'e5c6', k: 'c' }]); else b.setArrows([]);
    setTimeout(tick, i === 5 ? 2600 : 1300);
  }
  setTimeout(tick, 1200);
}

renderLevels();
renderGauntlet();
refreshProgress();
heroLoop();
