// =====================================================================
// Imbalances series — lesson engine
// Full-screen board (Chessground), smart dialogue clouds that avoid the
// important squares (Floating UI + a square-overlap scorer), coach's
// marker ink (Rough.js), cinematic history overlays (GSAP), confetti.
// =====================================================================
import { Chessground, rough, computePosition, offset, shift, confetti, gsap } from './vendor/imb-vendor.js';
import { Chess } from '../vendor/chess.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const INK = { g: '#2b8a3e', r: '#c92a2a', b: '#1c7ed6', y: '#d98c00', k: '#2a2420' };
const FILES = 'abcdefgh';
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};

// ---------------------------------------------------------------- game
function buildPlies(pgnText) {
  const c = new Chess();
  const plies = [{ fen: c.fen(), san: null, lastMove: null, check: false, num: '' }];
  const toks = pgnText.replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);
  for (const t of toks) {
    const moveNo = c.moveNumber(), white = c.turn() === 'w';
    const m = c.move(t);
    plies.push({ fen: c.fen(), san: m.san, lastMove: [m.from, m.to], check: c.inCheck(), num: white ? `${moveNo}.` : `${moveNo}...`, color: m.color });
  }
  return plies;
}
const turnOf = fen => (fen.split(' ')[1] === 'w' ? 'white' : 'black');
function destsFor(fen) {
  const c = new Chess(fen), d = new Map();
  for (const m of c.moves({ verbose: true })) { if (!d.has(m.from)) d.set(m.from, []); d.get(m.from).push(m.to); }
  return d;
}
function inCheck(fen) { try { return new Chess(fen).inCheck(); } catch (e) { return false; } }

// ---------------------------------------------------------------- layout
function safeInsets() {
  const p = el('div'); p.style.cssText = 'position:fixed;inset:0;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(p); const cs = getComputedStyle(p);
  const r = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  p.remove(); return r;
}
function computeLayout() {
  const vw = window.innerWidth, vh = window.innerHeight, ins = safeInsets();
  const landscape = vw >= vh * 1.15 && vw >= 640;
  const L = { vw, vh, landscape, ins };
  if (landscape) {
    const pad = 8;
    const side = Math.max(200, Math.min(380, vw * 0.22));
    const s = Math.floor(Math.min(vh - 2 * pad - ins.t - ins.b, vw - 2 * side));
    L.board = { x: Math.round((vw - s) / 2), y: Math.round(ins.t + (vh - ins.t - ins.b - s) / 2), s };
    const lw = L.board.x - 24 - ins.l;
    L.hud = { x: 12 + ins.l, y: 60 + ins.t, w: Math.max(150, lw), h: vh - 72 - ins.t - ins.b };
    L.top = { x: 12 + ins.l, y: 10 + ins.t, w: Math.max(150, lw) };
    L.panels = [
      { x: 10 + ins.l, y: 10, w: L.board.x - 20 - ins.l, h: vh - 20 },
      { x: L.board.x + s + 10, y: 10, w: vw - (L.board.x + s) - 20 - ins.r, h: vh - 20 }
    ];
    if (vh < 520) { // phone on its side: board hugs the left edge, one wide panel on the right
      L.board.x = 8 + ins.l;
      const px = L.board.x + s + 12, pw = vw - px - 10 - ins.r;
      L.top = { x: px, y: 8 + ins.t, w: pw };
      L.panels = [{ x: px, y: 56, w: pw, h: vh - 64 - ins.b }];
    }
  } else {
    const head = 52 + ins.t;
    const s = Math.floor(Math.min(vw - ins.l - ins.r, vh - head - 150));
    L.board = { x: Math.round((vw - s) / 2), y: head, s };
    L.top = { x: 0, y: 0, w: vw, h: head };
    L.below = { x: 8 + ins.l, y: head + s + 8, w: vw - 16 - ins.l - ins.r, h: vh - head - s - 16 - ins.b };
  }
  L.sq = L.board.s / 8;
  L.compactHud = !landscape || vh < 520;
  return L;
}
const rectsOverlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// =====================================================================
export function runLesson(CH) {
  document.title = `${CH.title} · Imbalances`;
  const plies = buildPlies(CH.pgn);
  const KEY = `imb-${CH.id}`;
  const steps = CH.steps;
  // resolve inherited plies: each step has ply (entry) and exitPly
  let p = 0;
  steps.forEach(s => {
    if (s.fen) { s._fen = s.fen; s._ply = null; }
    else { if (s.ply == null) s.ply = p; s._ply = s.ply; }
    p = (s.ask && s.ask.type === 'find' && !s.fen) ? s._ply + 1 : (s._ply ?? p);
    s._exit = p;
  });

  // ------------------------------------------------------------ DOM
  document.body.classList.add('imb', CH.hud ? `hud-${CH.hud}` : 'hud-none');
  const stage = el('div', 'stage'); document.body.appendChild(stage);
  const boardWrap = el('div', 'board-wrap'); const cgEl = el('div', 'cg-wrap'); boardWrap.appendChild(cgEl);
  const ink = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ink.setAttribute('class', 'ink'); boardWrap.appendChild(ink);
  stage.appendChild(boardWrap);
  const tail = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); tail.setAttribute('class', 'tail'); stage.appendChild(tail);
  const hud = el('div', 'hud'); stage.appendChild(hud);
  const top = el('div', 'topbar', `
    <a class="tb-home" href="./" title="Back to the series">←</a>
    <div class="tb-title"><small>${CH.kicker}</small><b>${CH.short}</b></div>
    <button class="tb-hud" type="button" title="Show the tracker"></button>`);
  stage.appendChild(top);
  const prog = el('div', 'progress', '<i></i>'); stage.appendChild(prog);
  const ticker = el('div', 'ticker'); stage.appendChild(ticker);
  const cloud = el('div', 'cloud'); stage.appendChild(cloud);
  const big = el('div', 'bigcard hidden'); stage.appendChild(big);
  const story = el('div', 'story hidden'); stage.appendChild(story);
  const sheet = el('div', 'sheet hidden'); stage.appendChild(sheet);
  const intro = el('div', 'intro'); stage.appendChild(intro);
  const toast = el('div', 'toast'); stage.appendChild(toast);

  let L = computeLayout();
  let cur = -1, token = 0, orient = CH.orient === 'b' ? 'black' : 'white';
  let curFen = plies[0].fen, curLast = null, curAnn = null;
  let solved = false, wrongs = 0;

  const cg = Chessground(cgEl, {
    fen: curFen, orientation: orient, coordinates: true, viewOnly: false,
    animation: { enabled: true, duration: 300 },
    highlight: { lastMove: true, check: true },
    movable: { free: false, color: undefined, showDests: true },
    draggable: { enabled: true, showGhost: true }, selectable: { enabled: true },
    drawable: { enabled: false, visible: true }, premovable: { enabled: false },
    blockTouchScroll: true, disableContextMenu: true, autoCastle: true,
  });

  // board squares background, generated once
  (function boardBg() {
    let d = ''; for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if ((r + f) % 2) d += `M${f} ${r}h1v1h-1z`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' shape-rendering='crispEdges'><rect width='8' height='8' fill='#f0dfc0'/><path fill='#b98b62' d='${d}'/></svg>`;
    const css = el('style'); css.textContent = `.cg-wrap cg-board{background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")}`;
    document.head.appendChild(css);
  })();

  function applyBoardGeometry() {
    const b = view();
    Object.assign(boardWrap.style, { left: b.x + 'px', top: b.y + 'px', width: b.s + 'px', height: b.s + 'px' });
    Object.assign(cgEl.style, { width: b.s + 'px', height: b.s + 'px' });
    ink.setAttribute('width', b.s); ink.setAttribute('height', b.s); ink.setAttribute('viewBox', `0 0 ${b.s} ${b.s}`);
    document.documentElement.style.setProperty('--sq', b.sq + 'px');
    if (!L.landscape) Object.assign(ticker.style, { left: (L.vw / 2) + 'px', top: (b.y + b.s + 6) + 'px' });
    cg.redrawAll();
    drawInk(curAnn, false);
  }
  function place() {
    L = computeLayout(); K = 1;
    const b = L.board;
    applyBoardGeometry();
    tail.setAttribute('width', L.vw); tail.setAttribute('height', L.vh);
    document.body.classList.toggle('landscape', L.landscape);
    document.body.classList.toggle('portrait', !L.landscape);
    document.body.classList.toggle('compact-hud', L.compactHud);
    if (L.landscape) {
      Object.assign(top.style, { left: L.top.x + 'px', top: L.top.y + 'px', width: L.top.w + 'px', height: '' });
      Object.assign(hud.style, { left: L.hud.x + 'px', top: L.hud.y + 'px', width: L.hud.w + 'px', maxHeight: L.hud.h + 'px', display: L.compactHud ? 'none' : '' });
      Object.assign(ticker.style, { left: (b.x + b.s / 2) + 'px', top: (b.y + 6) + 'px' });
    } else {
      Object.assign(top.style, { left: '0px', top: '0px', width: L.vw + 'px', height: L.top.h + 'px', paddingTop: L.ins.t + 'px' });
      hud.style.display = 'none';
    }
    renderHud();
    if (cloud.classList.contains('show')) positionCloud(false);
  }

  // ------------------------------------------------------------ geometry
  function sqRect(sq) { // relative to viewport
    const V = view(), f = FILES.indexOf(sq[0]), r = +sq[1] - 1, s = V.sq;
    const col = orient === 'white' ? f : 7 - f, row = orient === 'white' ? 7 - r : r;
    return { x: V.x + col * s, y: V.y + row * s, w: s, h: s };
  }
  function sqCenterLocal(sq) {
    const f = FILES.indexOf(sq[0]), r = +sq[1] - 1, s = view().sq;
    const col = orient === 'white' ? f : 7 - f, row = orient === 'white' ? 7 - r : r;
    return [col * s + s / 2, row * s + s / 2];
  }
  function occupied(fen) {
    const out = []; const rows = fen.split(' ')[0].split('/');
    rows.forEach((row, i) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { out.push(FILES[f] + (8 - i)); f++; } } });
    return out;
  }

  // ------------------------------------------------------------ ink (Rough.js marker)
  function drawInk(ann, animate = true) {
    while (ink.firstChild) ink.firstChild.remove();
    if (!ann) return;
    const rc = rough.svg(ink), s = view().sq, nodes = [];
    (ann.circles || []).forEach(([sq, c]) => {
      const [x, y] = sqCenterLocal(sq);
      const n = rc.ellipse(x, y, s * 0.92, s * 0.92, { stroke: INK[c] || c, strokeWidth: Math.max(2, s * 0.06), roughness: 1.3, bowing: 1.2 });
      n.classList.add('ink-c'); ink.appendChild(n); nodes.push(n);
    });
    (ann.arrows || []).forEach(([a, b, c]) => {
      const [x1, y1] = sqCenterLocal(a), [x2, y2] = sqCenterLocal(b);
      const ang = Math.atan2(y2 - y1, x2 - x1), head = s * 0.34, back = s * 0.18;
      const ex = x2 - Math.cos(ang) * back, ey = y2 - Math.sin(ang) * back;
      const col = INK[c] || c;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.classList.add('ink-a');
      g.appendChild(rc.line(x1 + Math.cos(ang) * s * 0.18, y1 + Math.sin(ang) * s * 0.18, ex - Math.cos(ang) * head * 0.6, ey - Math.sin(ang) * head * 0.6,
        { stroke: col, strokeWidth: Math.max(3, s * 0.085), roughness: 1.1, bowing: 2 }));
      const p1 = [ex, ey], p2 = [ex - Math.cos(ang - 0.5) * head, ey - Math.sin(ang - 0.5) * head], p3 = [ex - Math.cos(ang + 0.5) * head, ey - Math.sin(ang + 0.5) * head];
      g.appendChild(rc.polygon([p1, p2, p3], { stroke: col, fill: col, fillStyle: 'solid', strokeWidth: 2, roughness: 0.8 }));
      ink.appendChild(g); nodes.push(g);
    });
    if (animate) {
      nodes.forEach((n, i) => {
        n.querySelectorAll('path').forEach(pth => {
          const fillOnly = pth.getAttribute('stroke') === 'none';
          if (fillOnly) { gsap.fromTo(pth, { opacity: 0 }, { opacity: 1, duration: .25, delay: .35 + i * .18 }); return; }
          let len = 0; try { len = pth.getTotalLength(); } catch (e) { }
          if (!len) return;
          pth.style.strokeDasharray = len; pth.style.strokeDashoffset = len;
          gsap.to(pth, { strokeDashoffset: 0, duration: .5, delay: i * .18, ease: 'power2.out' });
        });
      });
    }
  }
  function applyBoardMarks(ann) {
    const custom = new Map();
    if (ann && ann.tint) Object.entries(ann.tint).forEach(([sq, c]) => custom.set(sq, 'tint-' + c));
    cg.set({ highlight: { lastMove: true, check: true, custom } });
  }

  // ------------------------------------------------------------ board state
  function setBoard(fen, lastMove, { movable = false } = {}) {
    curFen = fen; curLast = lastMove || null;
    const turn = turnOf(fen);
    cg.set({
      fen, lastMove: lastMove || undefined, turnColor: turn, check: inCheck(fen) ? turn : false,
      movable: movable ? { color: turn, dests: destsFor(fen), free: false, showDests: true, events: { after: onUserMove } } : { color: undefined, dests: new Map() },
      selected: undefined,
    });
    cgEl.classList.toggle('playable', movable);
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function playTo(from, to, myTok) {
    for (let k = from + 1; k <= to; k++) {
      if (myTok !== token) return false;
      const pl = plies[k];
      setBoard(pl.fen, pl.lastMove);
      showTicker(pl);
      renderHud();
      await sleep(to - from > 8 ? 430 : 680);
    }
    return myTok === token;
  }
  function showTicker(pl) {
    if (!pl || !pl.san) { ticker.classList.remove('show'); return; }
    ticker.innerHTML = `<span>${pl.num}</span> ${pl.san}`;
    ticker.classList.add('show');
    clearTimeout(showTicker._t); showTicker._t = setTimeout(() => ticker.classList.remove('show'), 1400);
  }

  // ------------------------------------------------------------ HUD
  function gainsUpTo(i) { const g = []; for (let k = 0; k <= i && k < steps.length; k++) if (steps[k].gain) g.push(steps[k].gain); return g; }
  function imbUpTo(i) { const m = {}; for (let k = 0; k <= i && k < steps.length; k++) if (steps[k].imb) Object.assign(m, steps[k].imb); return m; }
  function meters(fen) {
    const val = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }; const mat = { w: 0, b: 0 };
    const board = new Chess(fen).board();
    const home = { w: { n: ['b1', 'g1'], b: ['c1', 'f1'], q: ['d1'] }, b: { n: ['b8', 'g8'], b: ['c8', 'f8'], q: ['d8'] } };
    const dev = { w: 0, b: 0 };
    board.flat().filter(Boolean).forEach(pc => {
      mat[pc.color] += val[pc.type];
      if (['n', 'b', 'q'].includes(pc.type) && !home[pc.color][pc.type].includes(pc.square)) dev[pc.color]++;
      if (pc.type === 'r' && !['a1', 'h1', 'a8', 'h8'].includes(pc.square)) dev[pc.color]++;
      if (pc.type === 'k' && ((pc.color === 'w' && ['g1', 'c1', 'b1', 'h1'].includes(pc.square)) || (pc.color === 'b' && ['g8', 'c8', 'b8', 'h8'].includes(pc.square)))) dev[pc.color]++;
    });
    return { mat, dev };
  }
  function hudHTML(compact) {
    if (CH.hud === 'ledger') {
      const g = gainsUpTo(cur), goal = CH.ledgerGoal || 6, full = g.length >= goal;
      if (compact) return `🪙 <b>${g.length}</b>/${goal}${full ? ' ⚡' : ''}`;
      return `<div class="hud-h">${CH.hudTitle}</div>
        <div class="jar ${full ? 'full' : ''}">${Array.from({ length: goal }, (_, k) => `<i class="${k < g.length ? 'on' : ''}"></i>`).join('')}</div>
        <div class="jar-cap">${full ? '⚡ Jar full. Look for the strike.' : `${g.length} of ${goal} coins`}</div>
        <ol class="coins">${g.map(c => `<li><span>${c.icon || '🪙'}</span>${c.label}</li>`).join('') || '<li class="muted">No coins yet. Watch for small, lasting edges.</li>'}</ol>`;
    }
    if (CH.hud === 'meters') {
      const { mat, dev } = meters(curFen);
      const md = mat.w - mat.b, dd = dev.w - dev.b;
      if (compact) return `🪨 ${md > 0 ? '+' : ''}${md} &nbsp;🔥 ${dd > 0 ? '+' : ''}${dd}`;
      const bar = (w, b, max) => { const t = Math.max(1, w + b); return `<div class="duel"><i class="w" style="width:${(w / t) * 100}%"></i><i class="b" style="width:${(b / t) * 100}%"></i></div>`; };
      return `<div class="hud-h">${CH.hudTitle}</div>
        <div class="meter"><div class="m-h"><span>🪨 Stone</span><small>material</small></div>${bar(mat.w, mat.b)}<div class="m-n"><span>White ${mat.w}</span><span>Black ${mat.b}</span></div><div class="m-d ${md > 0 ? 'w' : md < 0 ? 'b' : ''}">${md === 0 ? 'Level' : (md > 0 ? 'White' : 'Black') + ' +' + Math.abs(md)}</div></div>
        <div class="meter fire"><div class="m-h"><span>🔥 Fire</span><small>pieces in play</small></div>${bar(dev.w, dev.b)}<div class="m-n"><span>White ${dev.w}</span><span>Black ${dev.b}</span></div><div class="m-d ${dd > 0 ? 'w' : dd < 0 ? 'b' : ''}">${dd === 0 ? 'Level' : (dd > 0 ? 'White' : 'Black') + ' +' + Math.abs(dd)}</div></div>
        <p class="hud-note">Both meters read the board live. Fire = minor pieces and queen off their home squares, rooks off the corners, plus a castled king.</p>`;
    }
    if (CH.hud === 'scanner') {
      const m = imbUpTo(cur);
      if (compact) return `<span class="dots">${CH.imbalances.map(x => `<i class="${m[x.k] || ''}"></i>`).join('')}</span>`;
      const lab = { w: 'White', b: 'Black', '=': 'Equal' };
      return `<div class="hud-h">${CH.hudTitle}</div><div class="scan">${CH.imbalances.map(x => `
        <div class="sc ${m[x.k] ? 'lit ' + (m[x.k] === '=' ? 'eq' : m[x.k]) : ''}"><span class="ic">${x.i}</span><b>${x.t}</b><em>${m[x.k] ? lab[m[x.k]] : '·'}</em></div>`).join('')}</div>
        <p class="hud-note">Lights up as the game reveals each difference.</p>`;
    }
    return '';
  }
  let lastHud = '';
  function renderHud() {
    const tb = $('.tb-hud', top);
    if (!CH.hud) { tb.style.display = 'none'; return; }
    tb.innerHTML = hudHTML(true);
    if (!L.compactHud) {
      const h = hudHTML(false);
      if (h !== lastHud) { hud.innerHTML = h; lastHud = h; hud.querySelectorAll('.coins li:last-child, .sc.lit').forEach(() => { }); }
    }
    if (!sheet.classList.contains('hidden')) $('.sheet-body', sheet).innerHTML = hudHTML(false);
  }
  $('.tb-hud', top).addEventListener('click', () => {
    if (!L.compactHud) { gsap.fromTo(hud, { scale: 1.03 }, { scale: 1, duration: .4 }); return; }
    sheet.innerHTML = `<div class="sheet-card"><button class="x" type="button">×</button><div class="sheet-body">${hudHTML(false)}</div></div>`;
    sheet.classList.remove('hidden');
    gsap.fromTo($('.sheet-card', sheet), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: .35, ease: 'power3.out' });
    sheet.onclick = e => { if (e.target === sheet || e.target.classList.contains('x')) sheet.classList.add('hidden'); };
  });
  function hudPulse() {
    if (!L.compactHud) { const last = hud.querySelector('.coins li:last-child, .jar i.on:last-of-type'); gsap.fromTo(hud, { boxShadow: '0 0 0 0 rgba(217,140,0,.0)' }, { boxShadow: '0 0 0 6px rgba(217,140,0,.25)', yoyo: true, repeat: 1, duration: .35 }); if (last) gsap.from(last, { scale: 1.6, duration: .5, ease: 'back.out(3)' }); }
    else gsap.fromTo($('.tb-hud', top), { scale: 1.35 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
  }

  // ------------------------------------------------------------ cloud
  function cloudHTML(s) {
    const who = CH.speakers[s.who || 'coach'] || CH.speakers.coach;
    return `<div class="c-head"><span class="av">${who.av}</span><span class="nm">${who.name}</span>${s.kicker ? `<span class="kick">${s.kicker}</span>` : ''}<span class="peek" title="Tap the cloud to see through it">👁</span></div>
      <div class="c-scroll"><div class="c-body">${s.text || ''}</div>
      <div class="c-ask"></div></div>
      <div class="c-foot"><button class="c-back" type="button" aria-label="Back">←</button><span class="c-step">${cur + 1} / ${steps.length}</span><button class="c-next" type="button">${s.nextLabel || 'Next →'}</button></div>`;
  }
  function measure(w) {
    cloud.style.width = w + 'px'; cloud.style.maxHeight = 'none';
    return cloud.offsetHeight;
  }
  // board "squeeze" (portrait only): shrink the board up to 18% when a cloud needs the room
  let K = 1;
  function view() { const b = L.board, s = b.s * K; return { x: b.x + (b.s - s) / 2, y: b.y, s, sq: s / 8 }; }
  function setSqueeze(k, animate = true) {
    k = Math.max(0.82, Math.min(1, k));
    if (Math.abs(k - K) < 0.01) return;
    K = k; applyBoardGeometry();
    if (animate) gsap.fromTo(boardWrap, { opacity: .55 }, { opacity: 1, duration: .35 });
  }
  function evaluate(s, focus, anchor) {
    const occ = new Set(occupied(curFen));
    const all = []; for (const f of FILES) for (let r = 1; r <= 8; r++) all.push(f + r);
    const vw = L.vw, vh = L.vh, B = view(), M = 8;
    const hudR = !L.compactHud && CH.hud ? { x: L.hud.x, y: L.hud.y, w: L.hud.w, h: Math.min(hud.offsetHeight, L.hud.h) } : null;
    const topR = L.landscape ? { x: L.top.x, y: L.top.y, w: L.top.w, h: 46 } : { x: 0, y: 0, w: vw, h: L.top.h };
    const anc = anchor ? sqRect(anchor) : null;
    const ancC = anc ? { x: anc.x + anc.w / 2, y: anc.y + anc.h / 2 } : { x: B.x + B.s / 2, y: B.y + B.s / 2 };
    const below = L.landscape ? null : { x: 8 + L.ins.l, y: B.y + B.s + 8, w: vw - 16 - L.ins.l - L.ins.r, h: vh - B.y - B.s - 16 - L.ins.b };
    const widths = L.landscape
      ? [...new Set([Math.min(400, Math.max(...L.panels.map(p => p.w))), Math.min(360, L.panels[L.panels.length - 1].w), Math.min(340, L.panels[0].w), 320, 280].map(Math.floor))].filter(w => w >= 180)
      : [Math.min(below.w, 560)];
    const cands = [];
    const jobs = [];
    for (const w of widths) {
      const h = measure(w);
      const add = (x, y, tag, maxH) => cands.push({ x, y, w, h: maxH ? Math.min(h, maxH) : h, clipped: maxH && h > maxH ? h - maxH : 0, tag, full: h });
      if (L.landscape) {
        for (const pn of L.panels) {
          if (w > pn.w + 4) continue;
          const x = pn.x + (pn.w - w) / 2;
          for (const y of [ancC.y - h / 2, ancC.y - h - 20, ancC.y + 20, pn.y, pn.y + 50, pn.y + pn.h - h, (vh - h) / 2]) add(x, Math.max(pn.y, Math.min(pn.y + pn.h - h, y)), 'panel');
          if (h > pn.h) add(x, pn.y, 'panel', pn.h);
        }
      } else {
        add(below.x + (below.w - w) / 2, below.y, 'below', below.h);
        add(below.x + (below.w - w) / 2, Math.max(B.y + 4, vh - h - M - L.ins.b), 'below-up');
      }
      if (anc) {
        const ref = { getBoundingClientRect: () => ({ x: anc.x, y: anc.y, left: anc.x, top: anc.y, right: anc.x + anc.w, bottom: anc.y + anc.h, width: anc.w, height: anc.h }) };
        for (const placement of ['right', 'left', 'top', 'bottom', 'right-start', 'right-end', 'left-start', 'left-end', 'top-start', 'top-end', 'bottom-start', 'bottom-end'])
          jobs.push(computePosition(ref, cloud, { strategy: 'fixed', placement, middleware: [offset(B.sq * 0.35), shift({ padding: M })] }).then(r => add(r.x, r.y, 'float')).catch(() => { }));
      }
      const step = B.sq / 2;
      for (let y = B.y; y <= B.y + B.s - Math.min(h, B.s); y += step) for (let x = Math.max(M, B.x - w / 2); x <= Math.min(vw - w - M, B.x + B.s - w / 2); x += step) add(x, y, 'grid');
    }
    return Promise.all(jobs).then(() => {
      let best = null, bestScore = Infinity;
      for (const c of cands) {
        if (c.x < M - 1 || c.y < M - 1 || c.x + c.w > vw - M + 1 || c.y + c.h > vh - M + 1) continue;
        let score = 0;
        for (const sq of all) {
          const r = sqRect(sq), ov = rectsOverlap(c, r); if (!ov) continue;
          const fr = ov / (r.w * r.h);
          score += fr * (focus.has(sq) ? 1200 : occ.has(sq) ? (s.free ? 2 : 22) : (s.free ? 0 : 3));
        }
        if (hudR) score += rectsOverlap(c, hudR) * 0.5;
        score += rectsOverlap(c, topR) * 0.8;
        if (c.clipped) score += 30 + c.clipped * 2.2;
        if (anc) { const dx = Math.max(c.x - ancC.x, 0, ancC.x - (c.x + c.w)), dy = Math.max(c.y - ancC.y, 0, ancC.y - (c.y + c.h)); score += Math.hypot(dx, dy) * 0.04; }
        if (score < bestScore) { bestScore = score; best = c; }
      }
      return { best, score: bestScore, below };
    });
  }
  async function positionCloud(animate = true) {
    const s = steps[cur]; if (!s) return;
    const focus = new Set(s.focus || []);
    const anchor = s.anchor;
    if (anchor) focus.add(anchor);
    (s.arrows || []).forEach(([a, b]) => { focus.add(a); focus.add(b); });
    (s.circles || []).forEach(([a]) => focus.add(a));
    const vw = L.vw, vh = L.vh, M = 8;
    if (!L.landscape && K !== 1) setSqueeze(1, false);
    let { best, score, below } = await evaluate(s, focus, anchor);
    if (!L.landscape && best && (best.clipped || score > 120)) {
      const need = best.full + 16 + L.ins.b + 8;
      const k = (vh - L.board.y - need) / L.board.s;
      if (k < 1) { setSqueeze(k, animate); ({ best, score, below } = await evaluate(s, focus, anchor)); }
    }
    void below;
    if (!best) best = { x: M, y: vh - Math.min(measure(Math.min(vw - 16, 380)), vh * .6) - M, w: Math.min(vw - 16, 380), h: vh * .6, clipped: 1 };
    cloud.style.width = best.w + 'px';
    cloud.style.maxHeight = best.clipped ? best.h + 'px' : 'none';
    cloud.classList.toggle('scrolls', !!best.clipped);
    if (animate) {
      gsap.killTweensOf(cloud);
      gsap.fromTo(cloud, { left: best.x, top: best.y + 14, opacity: 0, scale: .96 }, { left: best.x, top: best.y, opacity: 1, scale: 1, duration: .38, ease: 'power3.out', onUpdate: () => drawTail(anchor), onComplete: () => drawTail(anchor) });
    } else { Object.assign(cloud.style, { left: best.x + 'px', top: best.y + 'px', opacity: 1 }); drawTail(anchor); }
  }
  function drawTail(anchor) {
    while (tail.firstChild) tail.firstChild.remove();
    if (!anchor || !cloud.classList.contains('show') || cloud.classList.contains('peeking')) return;
    const r = cloud.getBoundingClientRect(), a = sqRect(anchor);
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
    if (ax > r.left && ax < r.right && ay > r.top && ay < r.bottom) return;
    const px = Math.max(r.left + 18, Math.min(r.right - 18, ax)), py = Math.max(r.top + 18, Math.min(r.bottom - 18, ay));
    let sx = px, sy = py;
    const dl = Math.abs(px - r.left), dr = Math.abs(r.right - px), dt = Math.abs(py - r.top), db = Math.abs(r.bottom - py);
    if (ax < r.left) sx = r.left; else if (ax > r.right) sx = r.right; else if (ay < r.top) sy = r.top; else sy = r.bottom;
    void dl; void dr; void dt; void db;
    const ang = Math.atan2(ay - sy, ax - sx), dist = Math.hypot(ax - sx, ay - sy);
    const ex = ax - Math.cos(ang) * a.w * 0.5, ey = ay - Math.sin(ang) * a.w * 0.5;
    if (dist < a.w * 0.6) return;
    const rc = rough.svg(tail);
    const mx = (sx + ex) / 2 + Math.sin(ang) * 18, my = (sy + ey) / 2 - Math.cos(ang) * 18;
    tail.appendChild(rc.curve([[sx, sy], [mx, my], [ex, ey]], { stroke: '#2a2420', strokeWidth: 1.6, roughness: 0.9 }));
    tail.appendChild(rc.circle(ax, ay, a.w * 0.98, { stroke: '#2a2420', strokeWidth: 1.4, roughness: 1.4, strokeLineDash: [5, 5] }));
  }
  cloud.addEventListener('click', e => {
    if (e.target.closest('button, a, input, label, .opt, .chip')) return;
    cloud.classList.toggle('peeking');
    drawTail(cloud.classList.contains('peeking') ? null : steps[cur]?.anchor);
  });

  function setNext(enabled, label) {
    const n = $('.c-next', cloud); if (!n) return;
    n.disabled = !enabled; if (label) n.textContent = label;
    n.classList.toggle('pulse', enabled && !!label);
  }
  function burst(fromEl, opts = {}) {
    const r = fromEl ? fromEl.getBoundingClientRect() : { left: L.vw / 2, top: L.vh / 2, width: 0, height: 0 };
    confetti({ particleCount: opts.n || 70, spread: opts.spread || 70, startVelocity: 32, origin: { x: (r.left + r.width / 2) / L.vw, y: (r.top + r.height / 2) / L.vh }, colors: ['#d98c00', '#2b8a3e', '#1c7ed6', '#c92a2a', '#f0dfc0'], disableForReducedMotion: true, zIndex: 9999 });
  }
  function say(html, kind) {
    const fb = $('.c-fb', cloud) || $('.c-ask', cloud).appendChild(el('div', 'c-fb'));
    fb.className = 'c-fb ' + (kind || ''); fb.innerHTML = html;
    if (kind === 'bad') gsap.fromTo(cloud, { x: -6 }, { x: 0, duration: .4, ease: 'elastic.out(1.2,.3)' });
    positionCloud(false);
  }

  // ------------------------------------------------------------ asks
  function renderAsk(s) {
    const box = $('.c-ask', cloud), a = s.ask; box.innerHTML = '';
    solved = !a; wrongs = 0;
    if (!a) return;
    if (a.type === 'mcq') {
      const wrap = el('div', 'opts');
      a.options.forEach((o, k) => {
        const b = el('button', 'opt', `<span class="l">${'ABCD'[k]}</span><span>${o.t}</span>`); b.type = 'button';
        b.onclick = () => {
          if (solved) return;
          if (o.ok) {
            solved = true; b.classList.add('ok'); wrap.classList.add('done'); burst(b); say(o.why || 'Right.', 'good'); setNext(true, 'Next →');
          } else {
            wrongs++; b.classList.add('no'); b.disabled = true; say(o.why || 'Not quite. Try another.', 'bad');
            if (wrongs >= 2) { const okI = a.options.findIndex(x => x.ok); const okB = wrap.children[okI]; okB.classList.add('ok'); solved = true; wrap.classList.add('done'); say(`${o.why ? o.why + '<br>' : ''}<b>The answer:</b> ${a.options[okI].why || a.options[okI].t}`, 'bad'); setNext(true, 'Next →'); }
          }
        };
        wrap.appendChild(b);
      });
      box.appendChild(wrap); setNext(false);
    }
    if (a.type === 'multi') {
      const wrap = el('div', 'chips');
      a.options.forEach(o => { const c = el('button', 'chip', o.t); c.type = 'button'; c.onclick = () => { if (!solved) c.classList.toggle('sel'); }; c._o = o; wrap.appendChild(c); });
      const go = el('button', 'c-check', 'Check'); go.type = 'button';
      go.onclick = () => {
        if (solved) return; solved = true; let right = 0, total = 0;
        [...wrap.children].forEach(c => { const sel = c.classList.contains('sel'); if (c._o.ok) total++; if (c._o.ok && sel) right++; c.classList.add(c._o.ok ? (sel ? 'ok' : 'miss') : (sel ? 'no' : 'dim')); });
        const wrongSel = [...wrap.children].filter(c => !c._o.ok && c.classList.contains('sel')).length;
        if (right === total && !wrongSel) burst(go);
        say(`<b>${right}/${total}</b> found${wrongSel ? `, ${wrongSel} extra` : ''}. ${a.explain || ''}`, right === total && !wrongSel ? 'good' : '');
        go.remove(); setNext(true, 'Next →');
      };
      box.appendChild(wrap); box.appendChild(go); setNext(false);
    }
    if (a.type === 'sort' || a.type === 'scan') {
      const bins = a.type === 'sort' ? a.bins : [['w', 'White'], ['b', 'Black'], ['=', 'Equal']];
      const wrap = el('div', 'rows ask-' + a.type);
      a.items.forEach(it => {
        const row = el('div', 'row', `<span class="rt">${it.t}</span><span class="rb">${bins.map(([k, n]) => `<button type="button" class="bin" data-k="${k}">${n}</button>`).join('')}</span>`);
        row._it = it; row.querySelectorAll('.bin').forEach(b => b.onclick = () => { if (solved) return; row.querySelectorAll('.bin').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); row._v = b.dataset.k; });
        wrap.appendChild(row);
      });
      const go = el('button', 'c-check', 'Check'); go.type = 'button';
      go.onclick = () => {
        const rows = [...wrap.children]; if (rows.some(r => !r._v)) { say('Pick an answer on every row first.', ''); return; }
        solved = true; let right = 0;
        rows.forEach(r => { const ok = r._v === r._it.a; if (ok) right++; r.classList.add(ok ? 'ok' : 'no'); if (!ok) { r.querySelector(`.bin[data-k="${CSS.escape(r._it.a)}"]`).classList.add('want'); } if (r._it.why) r.appendChild(el('div', 'rw', r._it.why)); });
        if (right === rows.length) burst(go);
        say(`<b>${right}/${rows.length}</b> right. ${a.explain || ''}`, right === rows.length ? 'good' : '');
        go.remove(); setNext(true, 'Next →');
      };
      box.appendChild(wrap); box.appendChild(go); setNext(false);
    }
    if (a.type === 'find') {
      const tools = el('div', 'find-tools', `<span class="your">${a.prompt || (turnOf(curFen) === 'white' ? 'White' : 'Black') + ' to move. Drag or tap a piece.'}</span><button type="button" class="hint">💡 Hint</button><button type="button" class="show">Show me</button>`);
      box.appendChild(tools);
      $('.hint', tools).onclick = () => { say(a.hint, ''); if (a.hintSq) { curAnn = { ...(curAnn || {}), circles: [...((curAnn && curAnn.circles) || []), [a.hintSq, 'y']] }; drawInk(curAnn); } };
      $('.show', tools).onclick = () => resolveFind(false);
      setBoard(curFen, curLast, { movable: true });
      setNext(false);
    }
  }
  function onUserMove(orig, dest) {
    const s = steps[cur]; if (!s || !s.ask || s.ask.type !== 'find' || solved) return;
    const a = s.ask, uci = orig + dest;
    const answers = a.answers.map(x => x.slice(0, 4));
    if (answers.includes(uci) || (a.castle && uci === a.castle)) { resolveFind(true); return; }
    if (a.alts && a.alts[uci]) { say(a.alts[uci], ''); setTimeout(() => resolveFind(true, true), 900); return; }
    wrongs++;
    say(wrongs >= 2 ? `${a.wrong || 'Not this one.'} ${a.hint}` : (a.wrong || 'Not the move. Look again.'), 'bad');
    setTimeout(() => { if (steps[cur] === s && !solved) setBoard(curFen, curLast, { movable: true }); }, 420);
    if (wrongs >= 2) $('.show', cloud)?.classList.add('pulse');
  }
  function resolveFind(byUser, viaAlt) {
    const s = steps[cur]; if (solved) return; solved = true;
    const target = plies[s._ply + 1];
    setBoard(target.fen, target.lastMove);
    showTicker(target);
    const tools = $('.find-tools', cloud); if (tools) tools.remove();
    $('.c-body', cloud).innerHTML = s.after || '';
    $('.c-fb', cloud)?.remove();
    if (byUser) { burst(cloud, { n: 110, spread: 90 }); if (!viaAlt) toastMsg(CH.praise[Math.floor(Math.random() * CH.praise.length)]); }
    curAnn = s.afterMarks || null; applyBoardMarks(curAnn); drawInk(curAnn);
    if (s.afterGain) { s.gain = s.afterGain; renderHud(); hudPulse(); }
    renderHud();
    setNext(true, 'Next →');
    positionCloud(true);
  }
  function toastMsg(t) { toast.textContent = t; gsap.fromTo(toast, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .3, onComplete: () => gsap.to(toast, { opacity: 0, delay: 1.1, duration: .4 }) }); }

  // ------------------------------------------------------------ big card & story
  function showBig(s) {
    big.innerHTML = `<div class="bc">${s.big}<button type="button" class="bc-next">${s.nextLabel || 'Got it →'}</button><button type="button" class="bc-back">← Back</button></div>`;
    big.classList.remove('hidden');
    gsap.to(boardWrap, { opacity: .25, filter: 'blur(2px)', duration: .4 });
    gsap.fromTo($('.bc', big), { y: 30, opacity: 0, scale: .97 }, { y: 0, opacity: 1, scale: 1, duration: .5, ease: 'power3.out' });
    gsap.from(big.querySelectorAll('.bc > *'), { opacity: 0, y: 10, stagger: .07, duration: .4, delay: .15 });
    $('.bc-next', big).onclick = () => go(cur + 1, 1);
    $('.bc-back', big).onclick = () => go(cur - 1, -1);
  }
  function hideOverlays() {
    big.classList.add('hidden'); story.classList.add('hidden');
    gsap.to(boardWrap, { opacity: 1, filter: 'blur(0px)', duration: .4 });
  }
  function openStory(id, onDone, onBack) {
    const S = CH.stories[id]; let f = 0;
    story.innerHTML = `<div class="st-card">
      <div class="st-kick">💡 The aha moment</div><h2>${S.title}</h2><div class="st-sub">${S.sub}</div>
      <div class="st-map"><svg viewBox="0 0 600 340" preserveAspectRatio="xMidYMid meet"></svg></div>
      <div class="st-text"></div>
      <div class="st-nav"><button type="button" class="st-back">←</button><span class="st-dots">${S.frames.map(() => '<i></i>').join('')}<i class="lk"></i></span><button type="button" class="st-next">Next →</button></div>
    </div>`;
    story.classList.remove('hidden');
    gsap.to(boardWrap, { opacity: .12, filter: 'blur(4px) saturate(.4)', duration: .6 });
    gsap.fromTo($('.st-card', story), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' });
    const svg = $('.st-map svg', story);
    const kit = mapKit(svg); S.draw(kit);
    const groups = {}; svg.querySelectorAll('g[data-id]').forEach(g => { groups[g.dataset.id] = g; g.style.opacity = 0; });
    const shown = new Set();
    function frame() {
      const total = S.frames.length; const dots = story.querySelectorAll('.st-dots i');
      dots.forEach((d, k) => d.classList.toggle('on', k === f));
      const text = $('.st-text', story);
      if (f < total) {
        const fr = S.frames[f];
        text.innerHTML = fr.t;
        (fr.show || []).forEach(id => { const g = groups[id]; if (!g) return; if (!shown.has(id)) { shown.add(id); revealGroup(g); } });
        Object.entries(groups).forEach(([id, g]) => { if (shown.has(id)) gsap.to(g, { opacity: (fr.focus || fr.show || []).includes(id) || !(fr.focus) ? 1 : .35, duration: .4 }); });
        (fr.focus || []).forEach(id => { const g = groups[id]; if (g) gsap.fromTo(g, { scale: 1 }, { scale: 1.05, transformOrigin: 'center', yoyo: true, repeat: 1, duration: .35 }); });
        $('.st-next', story).textContent = 'Next →';
        $('.st-map', story).style.display = '';
      } else {
        $('.st-map', story).style.display = L.landscape ? '' : 'none';
        text.innerHTML = `<div class="link"><div><small>${S.link.warHead}</small><p>${S.link.war}</p></div><div class="arrow">⇄</div><div><small>On the board</small><p>${S.link.chess}</p></div></div>${S.link.punch ? `<p class="punch">${S.link.punch}</p>` : ''}`;
        gsap.from(text.querySelectorAll('.link > div, .punch'), { opacity: 0, y: 14, stagger: .12, duration: .45 });
        $('.st-next', story).textContent = 'Back to the board →';
      }
      gsap.fromTo(text, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .35 });
    }
    $('.st-next', story).onclick = () => { if (f >= S.frames.length) { onDone(); return; } f++; frame(); };
    $('.st-back', story).onclick = () => { if (f === 0) { onBack(); return; } f--; frame(); };
    frame();
  }
  function revealGroup(g) {
    gsap.set(g, { opacity: 1 });
    g.querySelectorAll('path').forEach((pth, i) => {
      if (pth.getAttribute('stroke') === 'none') { gsap.fromTo(pth, { opacity: 0 }, { opacity: 1, duration: .5, delay: .2 }); return; }
      let len = 0; try { len = pth.getTotalLength(); } catch (e) { }
      if (!len || len > 4000) return;
      pth.style.strokeDasharray = len; pth.style.strokeDashoffset = len;
      gsap.to(pth, { strokeDashoffset: 0, duration: .8, delay: Math.min(i * .015, .5), ease: 'power1.inOut' });
    });
    g.querySelectorAll('text').forEach(t => gsap.fromTo(t, { opacity: 0 }, { opacity: 1, duration: .5, delay: .4 }));
  }

  // ------------------------------------------------------------ navigation
  async function go(i, dir = 1) {
    if (i < 0) return;
    if (i >= steps.length) { finish(); return; }
    const myTok = ++token;
    const prev = cur; cur = i;
    store.set(KEY, { at: i, done: store.get(KEY, {}).done || false });
    $('i', prog).style.width = `${((i + 1) / steps.length) * 100}%`;
    const s = steps[i];
    cloud.classList.remove('show', 'peeking'); gsap.set(cloud, { opacity: 0 }); while (tail.firstChild) tail.firstChild.remove();
    sheet.classList.add('hidden');
    const newOrient = s.orient ? (s.orient === 'b' ? 'black' : 'white') : (CH.orient === 'b' ? 'black' : 'white');
    if (newOrient !== orient) { orient = newOrient; cg.set({ orientation: orient }); }
    if (s.story) {
      big.classList.add('hidden');
      if (s._ply != null) setBoard(plies[s._ply].fen, plies[s._ply].lastMove);
      drawInk(null); applyBoardMarks(null); renderHud();
      openStory(s.story, () => { hideOverlays(); go(i + 1, 1); }, () => { hideOverlays(); go(i - 1, -1); });
      return;
    }
    if (s.big) {
      story.classList.add('hidden');
      if (s._ply != null) setBoard(plies[s._ply].fen, plies[s._ply].lastMove); else if (s._fen) setBoard(s._fen, null);
      drawInk(null); applyBoardMarks(null); renderHud(); showBig(s); return;
    }
    hideOverlays();
    drawInk(null); applyBoardMarks(null);
    // board
    if (s._fen) { setBoard(s._fen, s.lastMove || null); }
    else {
      const prevStep = steps[prev];
      const fromPly = dir > 0 && prevStep && !prevStep._fen ? (prevStep._exit ?? prevStep._ply) : null;
      if (s.play && dir > 0 && fromPly != null && fromPly < s._ply) {
        setBoard(plies[fromPly].fen, plies[fromPly].lastMove);
        const ok = await playTo(fromPly, s._ply, myTok); if (!ok) return;
      } else setBoard(plies[s._ply].fen, plies[s._ply].lastMove);
    }
    if (myTok !== token) return;
    renderHud(); if (s.gain || s.imb) hudPulse();
    curAnn = { arrows: s.arrows, circles: s.circles, tint: s.tint };
    applyBoardMarks(curAnn);
    drawInk(curAnn);
    cloud.innerHTML = cloudHTML(s);
    $('.c-back', cloud).onclick = () => go(cur - 1, -1);
    $('.c-back', cloud).disabled = i === 0;
    $('.c-next', cloud).onclick = () => { if (!$('.c-next', cloud).disabled) go(cur + 1, 1); };
    renderAsk(s);
    cloud.classList.add('show');
    await positionCloud(true);
    if (s.burst) burst(cloud, { n: 140, spread: 100 });
  }

  function finish() {
    const st = store.get(KEY, {}); store.set(KEY, { at: 0, done: true });
    cloud.classList.remove('show'); gsap.set(cloud, { opacity: 0 }); while (tail.firstChild) tail.firstChild.remove();
    intro.innerHTML = `<div class="in-card done">
      <div class="in-kick">Chapter complete</div><h1>${CH.outro.title}</h1>
      <ul class="takeaways">${CH.outro.points.map(p => `<li>${p}</li>`).join('')}</ul>
      <div class="in-btns">${CH.outro.next ? `<a class="btn" href="${CH.outro.next.href}">${CH.outro.next.label}</a>` : ''}<a class="btn ghost" href="./">Back to the series</a><button class="btn ghost" type="button" id="again">Replay</button></div>
    </div>`;
    intro.classList.remove('hidden');
    gsap.to(boardWrap, { opacity: .2, filter: 'blur(3px)', duration: .6 });
    gsap.fromTo($('.in-card', intro), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power3.out' });
    setTimeout(() => { burst(null, { n: 180, spread: 120 }); setTimeout(() => burst(null, { n: 120, spread: 160 }), 350); }, 300);
    $('#again', intro).onclick = () => { intro.classList.add('hidden'); hideOverlays(); go(0, 1); };
    void st;
  }

  function start() {
    const st = store.get(KEY, {});
    intro.innerHTML = `<div class="in-card">
      <div class="in-kick">${CH.kicker}</div><h1>${CH.title}</h1><p class="in-sub">${CH.sub}</p>
      <div class="in-meta">${CH.meta}</div>
      <div class="in-btns"><button class="btn" type="button" id="begin">${st.at > 0 ? 'Start over' : 'Begin'}</button>${st.at > 0 ? `<button class="btn ghost" type="button" id="resume">Resume at step ${st.at + 1}</button>` : ''}</div>
      <p class="in-tip">${L.landscape ? 'Keyboard: → next · ← back. ' : ''}Tap any cloud to see through it.</p>
    </div>`;
    gsap.set(boardWrap, { opacity: .35, filter: 'blur(2px)' });
    gsap.fromTo($('.in-card', intro), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'power3.out' });
    gsap.from(intro.querySelectorAll('.in-card > *'), { opacity: 0, y: 12, stagger: .08, duration: .5, delay: .2 });
    const begin = k => { gsap.to($('.in-card', intro), { opacity: 0, y: -20, duration: .35, onComplete: () => { intro.classList.add('hidden'); gsap.to(boardWrap, { opacity: 1, filter: 'blur(0px)', duration: .5 }); go(k, k ? 0 : 1); } }); };
    $('#begin', intro).onclick = () => begin(0);
    const r = $('#resume', intro); if (r) r.onclick = () => begin(st.at);
  }

  document.addEventListener('keydown', e => {
    if (!intro.classList.contains('hidden')) { if (e.key === 'Enter') $('#begin', intro)?.click(); return; }
    if (!story.classList.contains('hidden')) { if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('.st-next', story).click(); } if (e.key === 'ArrowLeft') $('.st-back', story).click(); return; }
    if (!big.classList.contains('hidden')) { if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('.bc-next', big).click(); } if (e.key === 'ArrowLeft') $('.bc-back', big).click(); return; }
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { const n = $('.c-next', cloud); if (n && !n.disabled && e.target.tagName !== 'BUTTON') { e.preventDefault(); n.click(); } }
    if (e.key === 'ArrowLeft') go(cur - 1, -1);
    if (e.key === 'Escape') sheet.classList.add('hidden');
  });
  let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(place, 80); };
  window.addEventListener('resize', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(place, 250));

  place(); renderHud(); start();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place());
  window.__imb = { go: (i) => go(i, 0), steps, plies, get cur() { return cur; }, place, cg, finish };
}

// =====================================================================
// Hand-drawn map kit for the history overlays (600 x 340 canvas)
// =====================================================================
export function mapKit(svg) {
  const rc = rough.svg(svg), NS = 'http://www.w3.org/2000/svg';
  let seed = 7;
  const o = (x = {}) => ({ roughness: 1.4, bowing: 1.2, strokeWidth: 1.8, seed: seed++, ...x });
  const G = id => { const g = document.createElementNS(NS, 'g'); if (id) g.dataset.id = id; svg.appendChild(g); return g; };
  const text = (g, x, y, s, opt = {}) => {
    const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('class', 'mk ' + (opt.cls || '')); if (opt.anchor) t.setAttribute('text-anchor', opt.anchor);
    if (opt.size) t.style.fontSize = opt.size + 'px'; if (opt.color) t.style.fill = opt.color; if (opt.rot) t.setAttribute('transform', `rotate(${opt.rot} ${x} ${y})`);
    t.textContent = s; g.appendChild(t); return t;
  };
  const C = { red: '#c92a2a', blue: '#1c7ed6', ink: '#2a2420', green: '#2b8a3e', amber: '#d98c00', sea: '#a5d8ff', land: '#f4ead5', mud: '#8d6e4f', grey: '#868e96' };
  return {
    C, G, text,
    bg(id, fill = C.land) { const g = G(id); g.appendChild(rc.rectangle(6, 6, 588, 328, o({ fill, fillStyle: 'solid', stroke: C.ink, strokeWidth: 1.2, roughness: 2 }))); g.style.opacity = 1; return g; },
    poly(id, pts, opt = {}) { const g = typeof id === 'string' || id == null ? G(id) : id; g.appendChild(rc.polygon(pts, o(opt))); return g; },
    rect(id, x, y, w, h, opt = {}) { const g = typeof id === 'string' || id == null ? G(id) : id; g.appendChild(rc.rectangle(x, y, w, h, o(opt))); return g; },
    ellipse(id, x, y, w, h, opt = {}) { const g = typeof id === 'string' || id == null ? G(id) : id; g.appendChild(rc.ellipse(x, y, w, h, o(opt))); return g; },
    line(id, x1, y1, x2, y2, opt = {}) { const g = typeof id === 'string' || id == null ? G(id) : id; g.appendChild(rc.line(x1, y1, x2, y2, o(opt))); return g; },
    curve(id, pts, opt = {}) { const g = typeof id === 'string' || id == null ? G(id) : id; g.appendChild(rc.curve(pts, o(opt))); return g; },
    arrow(id, pts, color = C.red, w = 5) {
      const g = typeof id === 'string' || id == null ? G(id) : id;
      g.appendChild(rc.curve(pts, o({ stroke: color, strokeWidth: w, roughness: 1 })));
      const [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1], a = Math.atan2(y2 - y1, x2 - x1), hd = 8 + w * 2;
      g.appendChild(rc.polygon([[x2 + Math.cos(a) * 6, y2 + Math.sin(a) * 6], [x2 - Math.cos(a - .55) * hd, y2 - Math.sin(a - .55) * hd], [x2 - Math.cos(a + .55) * hd, y2 - Math.sin(a + .55) * hd]], o({ fill: color, fillStyle: 'solid', stroke: color, roughness: .6 })));
      return g;
    },
    trees(id, x, y, w, h, n = 12, color = C.green) {
      const g = typeof id === 'string' || id == null ? G(id) : id;
      for (let k = 0; k < n; k++) { const tx = x + ((k * 37) % 100) / 100 * w, ty = y + ((k * 61) % 100) / 100 * h; g.appendChild(rc.circle(tx, ty, 16 + (k % 3) * 4, o({ fill: color, fillStyle: 'hachure', hachureGap: 3, stroke: color, strokeWidth: 1.2 }))); }
      return g;
    },
    hills(id, x, y, w, n = 5) {
      const g = typeof id === 'string' || id == null ? G(id) : id;
      for (let k = 0; k < n; k++) { const hx = x + k * (w / n); g.appendChild(rc.polygon([[hx, y], [hx + w / n / 2, y - 34 - (k % 2) * 12], [hx + w / n, y]], o({ fill: '#c9b48a', fillStyle: 'hachure', hachureGap: 5, stroke: C.mud }))); }
      return g;
    },
    soldiers(id, x, y, cols, rows, color, gap = 11) {
      const g = typeof id === 'string' || id == null ? G(id) : id;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.appendChild(rc.rectangle(x + c * gap, y + r * gap, gap - 3, gap - 3, o({ fill: color, fillStyle: 'solid', stroke: color, strokeWidth: 1, roughness: .8 })));
      return g;
    },
    cross(id, x, y, s = 14, color = C.red) { const g = typeof id === 'string' || id == null ? G(id) : id; g.appendChild(rc.line(x - s, y - s, x + s, y + s, o({ stroke: color, strokeWidth: 4 }))); g.appendChild(rc.line(x + s, y - s, x - s, y + s, o({ stroke: color, strokeWidth: 4 }))); return g; },
  };
}
