/* =====================================================================
   git: the story — interactive layer
   ===================================================================== */
(function () {
  'use strict';
  const G = window.MiniGit;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SVGNS = 'http://www.w3.org/2000/svg';
  const CV = { '#0c0e13': '--bg', '#161a23': '--card', '#1c212c': '--card2', '#353e50': '--line2', '#3a1d1d': '--red', '#56d4dd': '--teal', '#6c7486': '--dim', '#79c0ff': '--blue', '#7ee787': '--green', '#a3abb9': '--soft', '#d2a8ff': '--purple', '#ece8e1': '--ink', '#f05033': '--orange', '#ff7b72': '--red', '#ffb454': '--amber', '#ff9bce': '--pink' };
  const sv = (tag, attrs, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs || {}) {
      const v = String(attrs[k]);
      if ((k === 'fill' || k === 'stroke') && (CV[v] || v.startsWith('var('))) e.style[k] = CV[v] ? `var(${CV[v]})` : v; else e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e); return e;
  };
  const short = G.short;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  // ---------------- theme ----------------
  const LIGHT = () => document.documentElement.getAttribute('data-theme') === 'light';
  const tb = $('#themebtn');
  const paintBtn = () => { tb.innerHTML = LIGHT() ? '🌙<span> Dark</span>' : '☀️<span> Light</span>'; };
  tb.addEventListener('click', () => { const t = LIGHT() ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('dml-theme', t); } catch (e) { } paintBtn(); });
  paintBtn();

  // ---------------- toasts & confetti ----------------
  function toast(msg) { const t = h('div', 'toast', msg); $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3800); }
  const cv = $('#confetti'); const cx = cv.getContext('2d'); let parts = [], confRunning = false;
  function confetti(n) {
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#f05033', '#ffb454', '#7ee787', '#79c0ff', '#d2a8ff', '#ff9bce'];
    for (let i = 0; i < (n || 140); i++) parts.push({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 3, r: Math.random() * 6 + 3, c: cols[i % cols.length], a: Math.random() * 6, life: 0 });
    if (!confRunning) { confRunning = true; requestAnimationFrame(confStep); }
  }
  function confStep() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.a += .2; p.life++; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c; cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); cx.restore(); });
    parts = parts.filter(p => p.y < cv.height + 30 && p.life < 260);
    if (parts.length) requestAnimationFrame(confStep); else { confRunning = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }
  const once = new Set();
  function confettiOnce(k) { if (once.has(k)) return; once.add(k); confetti(); }

  // ---------------- eggs ----------------
  const EGGS = [
    ['first', 'Clicked Git\'s very first commit hash', 'a yellow hash near the top'],
    ['penguin', 'Poked the penguin', 'look down. way down.'],
    ['telnet', 'Re-enacted the telnet incident', 'type what Tridgell typed first, in any terminal'],
    ['gud', 'git gud', 'a gamer\'s advice, as a git command'],
    ['vim', 'Escaped Vim', 'try committing without -m, then follow the tip'],
    ['sudo', 'Tried to sudo your way out', 'administrators know this word'],
    ['blame', 'Asked who to blame', 'blame… nobody in particular'],
    ['rmrf', 'Deleted .git (and history)', 'the most dangerous rm there is'],
    ['force', 'Force-pushed over someone', 'Act VI, the forbidden flag'],
    ['konami', 'Entered the Konami code', '↑ ↑ ↓ ↓ …']
  ];
  let eggs = store.get('gitstory-eggs', []);
  function renderEggs() {
    $('#eggcount').textContent = eggs.length; $('#eggtotal').textContent = EGGS.length;
    $('#egglist').innerHTML = EGGS.map(([id, name, hint]) => eggs.includes(id) ? `<li class="found">✅ ${name}</li>` : `<li>❓ <i>${hint}</i></li>`).join('');
  }
  function foundEgg(id) {
    if (eggs.includes(id) || !EGGS.find(e => e[0] === id)) return;
    eggs.push(id); store.set('gitstory-eggs', eggs); renderEggs();
    const b = $('#eggbtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    toast(`🥚 Secret found: ${EGGS.find(e => e[0] === id)[1]} (${eggs.length}/${EGGS.length})`);
    if (eggs.length === EGGS.length) { confetti(260); toast('🏆 All secrets found. You are a true git.'); }
  }
  $('#eggbtn').addEventListener('click', e => { e.stopPropagation(); $('#eggpanel').classList.toggle('open'); });
  document.addEventListener('click', e => { if (!e.target.closest('#eggpanel')) $('#eggpanel').classList.remove('open'); });
  renderEggs();
  $('#peng').addEventListener('click', () => { foundEgg('penguin'); toast('🐧 Linux says hi. Git exists because Linux needed it.'); });
  const KON = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let kpos = 0;
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    kpos = (e.key === KON[kpos] || e.key.toLowerCase() === KON[kpos]) ? kpos + 1 : (e.key === KON[0] ? 1 : 0);
    if (kpos === KON.length) { kpos = 0; foundEgg('konami'); document.body.classList.add('rainbow'); confetti(); setTimeout(() => document.body.classList.remove('rainbow'), 7000); }
  });

  // ---------------- badges ----------------
  const BADGES = [['init', '📔'], ['add', '🎬'], ['commit', '📸'], ['status', '🚦'], ['diff', '🔎'], ['log', '📜'], ['show', '🖼️'], ['branch', '🌿'], ['switch', '🔀'], ['checkout', '🚪'], ['restore', '🩹'], ['merge', '🌊'], ['rebase', '🪄'], ['tag', '🏷️'], ['reset', '⏪'], ['revert', '↩️'], ['stash', '🗄️'], ['cherry-pick', '🍒'], ['reflog', '🛟'], ['blame', '🏺'], ['cat-file', '🔬'], ['hash-object', '🧪'], ['ls-files', '📋'], ['clone', '🧬'], ['fetch', '📥'], ['pull', '🔄'], ['push', '📤'], ['remote', '🛰️']];
  let badges = store.get('gitstory-badges', []);
  function renderDeck() {
    const d = $('#deck'); if (!d) return;
    d.innerHTML = BADGES.map(([n, i]) => `<div class="badge ${badges.includes(n) ? 'got' : ''}"><span class="bi">${i}</span>${n}</div>`).join('');
    $('#deck-count').textContent = `${badges.filter(b => BADGES.find(x => x[0] === b)).length}/${BADGES.length}`;
  }
  function gotBadge(n) {
    if (badges.includes(n) || !BADGES.find(b => b[0] === n)) return;
    badges.push(n); store.set('gitstory-badges', badges); renderDeck();
    const total = badges.filter(b => BADGES.find(x => x[0] === b)).length;
    if (total === 1 || total % 5 === 0) toast(`${BADGES.find(b => b[0] === n)[1]} Card unlocked: git ${n} (${total}/${BADGES.length})`);
    if (total === BADGES.length) { confetti(260); toast('🏆 Full deck! Every command collected.'); }
  }
  renderDeck();

  // ---------------- reveal, twists, flips, progress ----------------
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(e => io.observe(e));
  $$('[data-twist]').forEach(t => t.addEventListener('click', () => t.classList.add('open')));
  $$('.flip').forEach(f => f.addEventListener('click', () => f.classList.toggle('on')));
  const acts = $$('section.act');
  const prog = $('#progress');
  const dots = acts.map((a, i) => { const d = h('div', 'dot'); d.title = a.querySelector('.num') ? a.querySelector('.num').textContent : ''; d.addEventListener('click', () => a.scrollIntoView()); prog.appendChild(d); return d; });
  const headtag = h('div', 'headtag', 'HEAD'); prog.appendChild(headtag);
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight; const f = max > 0 ? scrollY / max : 0;
    $('.fill', prog).style.width = (f * 100) + '%'; headtag.style.left = (f * 100) + '%';
    acts.forEach((a, i) => { const af = Math.min(1, a.offsetTop / max); dots[i].style.left = (af * 100) + '%'; dots[i].classList.toggle('on', scrollY + innerHeight * .4 >= a.offsetTop); });
  }
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); setTimeout(onScroll, 300);

  // ---------------- hero: drifting commit-graph sky ----------------
  (function stars() {
    const c = $('#stars'); const x = c.getContext('2d'); let W, H, nodes = [], vis = true;
    function size() { W = c.width = c.offsetWidth * devicePixelRatio; H = c.height = c.offsetHeight * devicePixelRatio; }
    size(); addEventListener('resize', size);
    for (let i = 0; i < 55; i++) nodes.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .00025, vy: (Math.random() - .5) * .00018, r: Math.random() * 2.2 + 1, o: Math.random() < .18 });
    new IntersectionObserver(e => { vis = e[0].isIntersecting; if (vis) requestAnimationFrame(draw); }).observe(c);
    let t = 0;
    function draw() {
      if (!vis) return; t++;
      x.clearRect(0, 0, W, H);
      nodes.forEach(n => { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > 1) n.vx *= -1; if (n.y < 0 || n.y > 1) n.vy *= -1; });
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]; const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H; const d = Math.hypot(dx, dy);
        if (d < 150 * devicePixelRatio) { x.strokeStyle = `rgba(${LIGHT() ? '217,72,15' : '240,80,51'},${(LIGHT() ? .22 : .16) * (1 - d / (150 * devicePixelRatio))})`; x.lineWidth = devicePixelRatio; x.beginPath(); x.moveTo(a.x * W, a.y * H); x.lineTo(b.x * W, b.y * H); x.stroke(); }
      }
      nodes.forEach((n, i) => { x.fillStyle = n.o ? `rgba(${LIGHT() ? '181,98,10' : '255,180,84'},${.6 + .4 * Math.sin(t / 30 + i)})` : (LIGHT() ? 'rgba(31,26,22,.28)' : 'rgba(236,232,225,.35)'); x.beginPath(); x.arc(n.x * W, n.y * H, n.r * devicePixelRatio, 0, 7); x.fill(); });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  })();

  // typewriter helper for <pre>
  function typeLines(el, lines, opts) {
    opts = opts || {}; let li = 0, ci = 0; el.innerHTML = '';
    const caret = h('span', 'caret'); let cur = null;
    function step() {
      if (li >= lines.length) { el.appendChild(caret); if (opts.done) opts.done(); return; }
      const L = lines[li];
      if (ci === 0) { cur = h('span', L.c || ''); el.appendChild(cur); if (L.click) cur.addEventListener('click', L.click); }
      if (L.instant) { cur.textContent = L.t; ci = L.t.length; }
      if (ci < L.t.length) { cur.textContent += L.t[ci++]; el.appendChild(caret); setTimeout(step, L.speed || 28); return; }
      el.appendChild(document.createTextNode('\n')); li++; ci = 0; setTimeout(step, L.pause || 160);
    }
    step();
  }
  typeLines($('#hero-term'), [
    { t: '$ cd git && git log --reverse | head -5', c: 'p', speed: 45, pause: 500 },
    { t: 'commit e83c5163316f89bfbde7d9ab23ca2e25604af290', c: 'h', instant: 1, click: () => { foundEgg('first'); toast('🐣 That hash has been the root of Git\'s own history since 7 April 2005.'); } },
    { t: 'Author: Linus Torvalds <torvalds@ppc970.osdl.org>', instant: 1 },
    { t: 'Date:   Thu Apr 7 15:13:13 2005 -0700', instant: 1 },
    { t: '', instant: 1 },
    { t: '    Initial revision of "git", the information manager from hell', instant: 1, pause: 1600 },
    { t: '$ # twenty years later, every clone of git still', c: 'm', speed: 30 },
    { t: '$ # carries this exact commit, byte for byte.', c: 'm', speed: 30, pause: 900 },
    { t: '$ ', c: 'p', instant: 1 }
  ]);
  let telnetDone = false;
  new IntersectionObserver(e => { if (e[0].isIntersecting && !telnetDone) { telnetDone = true; typeLines($('#telnet-term'), [
    { t: '$ telnet bitkeeper-server 5000', c: 'p', speed: 50, pause: 500 },
    { t: 'Connected.', instant: 1, pause: 700 },
    { t: 'help', c: 'y', speed: 120, pause: 600 },
    { t: '?          - print this help\nclone      - clone the current repository\npull       - update from the server\npush       - send changes to the server\n…', instant: 1 },
    { t: '(a dramatization: the real server really did answer "help")', c: 'm', instant: 1 }
  ]); } }, { threshold: .6 }).observe($('#telnet-term'));

  // ---------------- centralized vs distributed ----------------
  (function net() {
    const svg = $('#net-svg'); let mode = 'c', alive = true, server = 3, laps = [3, 3, 3, 3];
    const P = [[90, 62], [550, 62], [90, 238], [550, 238]], S = [320, 150];
    function draw() {
      svg.innerHTML = '';
      P.forEach(p => sv('line', { x1: p[0], y1: p[1], x2: S[0], y2: S[1], stroke: alive ? '#353e50' : '#3a1d1d', 'stroke-width': 2, 'stroke-dasharray': alive ? '' : '5 5' }, svg));
      const sg = sv('g', { class: alive ? '' : 'dead' }, svg);
      sv('rect', { x: S[0] - 70, y: S[1] - 44, width: 140, height: 88, rx: 12, fill: '#1c212c', stroke: alive ? '#f05033' : '#ff7b72', 'stroke-width': 2 }, sg);
      sv('text', { x: S[0], y: S[1] - 20, 'text-anchor': 'middle', fill: '#ece8e1', 'font-size': 14, 'font-weight': 700, 'font-family': 'DM Sans' }, sg).textContent = alive ? '🗄️ Server' : '💥 Server';
      dotsRow(sg, S[0], S[1] + 6, server, alive ? '#ffb454' : '#ff7b72');
      sv('text', { x: S[0], y: S[1] + 32, 'text-anchor': 'middle', fill: '#a3abb9', 'font-size': 11, 'font-family': 'JetBrains Mono' }, sg).textContent = alive ? `history: ${server} commits` : 'gone';
      P.forEach((p, i) => {
        const g = sv('g', {}, svg);
        sv('rect', { x: p[0] - 66, y: p[1] - 38, width: 132, height: 76, rx: 10, fill: '#161a23', stroke: '#353e50' }, g);
        sv('text', { x: p[0], y: p[1] - 16, 'text-anchor': 'middle', fill: '#ece8e1', 'font-size': 13, 'font-family': 'DM Sans', 'font-weight': 700 }, g).textContent = '💻 Dev ' + (i + 1);
        if (mode === 'd') { dotsRow(g, p[0], p[1] + 6, laps[i], '#7ee787'); sv('text', { x: p[0], y: p[1] + 28, 'text-anchor': 'middle', fill: '#a3abb9', 'font-size': 10.5, 'font-family': 'JetBrains Mono' }, g).textContent = `full history: ${laps[i]}`; }
        else { sv('text', { x: p[0], y: p[1] + 10, 'text-anchor': 'middle', fill: alive ? '#a3abb9' : '#ff7b72', 'font-size': 11, 'font-family': 'JetBrains Mono' }, g).textContent = alive ? '📄 latest files only' : '🚫 blocked'; sv('text', { x: p[0], y: p[1] + 26, 'text-anchor': 'middle', fill: '#6c7486', 'font-size': 10, 'font-family': 'JetBrains Mono' }, g).textContent = 'history: on server'; }
      });
    }
    function dotsRow(g, cx, cy, n, col) { const m = Math.min(n, 9); for (let i = 0; i < m; i++) sv('circle', { cx: cx - (m - 1) * 6 + i * 12, cy, r: 4, fill: col }, g); if (n > 9) sv('text', { x: cx + 62, y: cy + 4, fill: col, 'font-size': 10 }, g).textContent = '+'; }
    function packet(from, to, delay) {
      const c = sv('circle', { r: 5, class: 'packet', cx: from[0], cy: from[1] }, svg); const t0 = performance.now() + (delay || 0);
      return new Promise(res => { function f(now) { const k = Math.max(0, Math.min(1, (now - t0) / 650)); c.setAttribute('cx', from[0] + (to[0] - from[0]) * k); c.setAttribute('cy', from[1] + (to[1] - from[1]) * k); if (k < 1) requestAnimationFrame(f); else { c.remove(); res(); } } requestAnimationFrame(f); });
    }
    const msg = t => $('#net-msg').innerHTML = t;
    $('#net-mode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('#net-mode button').forEach(x => x.classList.toggle('on', x === b)); mode = b.dataset.m; reset(); });
    function reset() { alive = true; server = 3; laps = [3, 3, 3, 3]; draw(); msg(mode === 'c' ? 'CVS/SVN: the server holds all history. Laptops hold only the latest files.' : 'Git: every laptop holds the complete history. The server is just another copy everyone agrees to sync with.'); }
    $('#net-reset').addEventListener('click', reset);
    $('#net-commit').addEventListener('click', async () => {
      if (mode === 'c') {
        if (!alive) { msg('❌ Nobody can commit. No server = no history, no log, no blame. Work stops.'); return; }
        await Promise.all(P.map((p, i) => packet(p, S, i * 90))); server += 4; draw(); msg('Every commit had to travel to the server. (No Wi-Fi on the train? No commits for you.)');
      } else {
        laps = laps.map(n => n + 1); draw();
        if (alive) { await Promise.all(P.map((p, i) => packet(p, S, i * 90))); server += 4; await Promise.all(P.map((p, i) => packet(S, p, i * 90))); laps = laps.map(() => server); draw(); msg('Commits happen locally (instant, offline). Then everyone syncs through the server.'); }
        else msg('💪 Server\'s dead, and everyone keeps committing locally. Any laptop can become the new server; nothing was lost.');
      }
    });
    $('#net-kill').addEventListener('click', () => { if (!alive) return; alive = false; draw(); const s = $('#net'); s.classList.add('shake'); setTimeout(() => s.classList.remove('shake'), 500);
      msg(mode === 'c' ? '💀 The server is gone, and with it every past version. Laptops have only current files. Hope someone had a backup.' : '😎 The server is gone. Every laptop still has the entire history. Linus\'s FTP joke, as architecture.'); });
    reset();
  })();

  // ---------------- invent stepper ----------------
  (function invent() {
    const root = $('#invent'); const btns = $$('.steps button', root); const bodies = $$('.step-body', root);
    function go(i) { btns.forEach((b, k) => { b.classList.toggle('on', k === i); if (k < i) b.classList.add('done'); }); bodies.forEach((b, k) => b.classList.toggle('on', k === i)); if (i === 0) copies(); if (i === 1) diffs(false); if (i === 2) fps(); }
    btns.forEach((b, i) => b.addEventListener('click', () => go(i)));
    $$('[data-next]', root).forEach((b, i) => b.addEventListener('click', () => go(i + 1)));
    function copies() {
      const v = $('#copies-vis'); v.innerHTML = '';
      const names = ['novel.zip', 'novel_v2.zip', 'novel_v2_final.zip', 'novel_FINAL.zip', 'novel_FINAL_really.zip', 'novel_FINAL_meera.zip'];
      names.forEach((n, i) => { const d = h('div', 'docfile', `🗜️ ${n}<small>200 MB</small>`); d.style.animationDelay = (i * .25) + 's'; v.appendChild(d); });
      const tot = h('div', 'docfile', `<b style="color:var(--red)">Total: 1.2 GB</b><small>for maybe 2 MB of real changes</small>`); tot.style.animationDelay = '1.6s'; v.appendChild(tot);
    }
    function diffs(bad) {
      const v = $('#diff-vis'); v.innerHTML = '';
      const parts = ['v1 (full)', 'Δ2', 'Δ3', 'Δ4', 'Δ5', 'Δ6', 'Δ7'];
      parts.forEach((p, i) => { if (i) v.appendChild(h('span', 'arrow', '→')); v.appendChild(h('span', 'delta' + (bad && i >= 2 ? ' bad' : ''), bad && i === 2 ? 'Δ3 ☠️' : bad && i > 2 ? p + ' ?' : p)); });
      v.appendChild(h('span', 'arrow', '⇒')); v.appendChild(h('span', 'delta' + (bad ? ' bad' : ''), bad ? 'v7 = garbage, silently' : 'v7 = replay 6 diffs'));
    }
    $('#diff-rot').addEventListener('click', () => diffs(true));
    function fps() {
      const v = $('#fp-vis'); v.innerHTML = '';
      const c1 = 'It was raining in Chennai.\n', c2 = 'Chapter 2, first draft.\n', c2b = 'Chapter 2, rewritten!\n', c3 = 'Chapter 3.\n';
      const hb = s => short(G.blobHash(s));
      const snaps = [
        { n: 'Snapshot 1', f: [['ch1', hb(c1)], ['ch2', hb(c2)]], p: 'none' },
        { n: 'Snapshot 2', f: [['ch1', hb(c1)], ['ch2', hb(c2b)]] },
        { n: 'Snapshot 3', f: [['ch1', hb(c1)], ['ch2', hb(c2b)], ['ch3', hb(c3)]] }
      ];
      let prev = 'none';
      snaps.forEach((s, i) => {
        const id = short(G.sha1(G.enc.encode(s.f.map(x => x.join(':')).join(',') + prev)));
        const d = h('div', 'docfile', `<b style="color:var(--commit)">${s.n}</b><small>id ${id}</small>` + s.f.map(([n, x]) => `<div>${n} → <span style="color:${x === hb(c1) ? 'var(--teal)' : 'var(--blob)'}">${x}</span></div>`).join('') + `<small>parent: ${prev}</small>`);
        d.style.animationDelay = (i * .3) + 's'; v.appendChild(d); if (i < 2) v.appendChild(h('span', 'arrow', '→')); prev = id;
      });
      v.appendChild(h('div', '', '<small style="color:var(--teal);font:12px var(--font-mono);display:block;width:100%;text-align:center">ch1 is stored once, shared by all three snapshots (teal)</small>'));
    }
    copies();
  })();

  // ---------------- hash lab ----------------
  (function hashlab() {
    const inp = $('#hl-in'), nl = $('#hl-nl'); let prev = null;
    function upd() {
      const content = inp.value + (nl.checked ? '\n' : '');
      const body = G.enc.encode(content);
      const hx = G.blobHash(content);
      const B = $('#hl-bytes'); B.innerHTML = '';
      const add = (t, c) => B.appendChild(h('span', 'byte ' + (c || ''), esc(t)));
      'blob '.split('').forEach(ch => add(ch === ' ' ? '␣' : ch, 'hdr'));
      String(body.length).split('').forEach(ch => add(ch, 'hdr'));
      add('\\0', 'nul');
      const chars = Array.from(content); chars.slice(0, 44).forEach(ch => add(ch === '\n' ? '\\n' : ch === ' ' ? '␣' : ch, ch === '\n' ? 'nl' : ''));
      if (chars.length > 44) add('…');
      const out = $('#hl-out'); out.innerHTML = hx.split('').map((c, i) => `<span class="${prev && prev[i] !== c ? 'chg' : ''}">${c}</span>`).join('');
      setTimeout(() => $$('#hl-out span').forEach(s => s.classList.remove('chg')), 700);
      const g = $('#hl-gear'); g.classList.remove('spin'); void g.offsetWidth; g.classList.add('spin');
      if (prev && prev !== hx) { const n = hx.split('').filter((c, i) => c !== prev[i]).length; $('#hl-ava').textContent = `💥 ${n} of 40 characters changed. That's the avalanche effect.`; }
      else if (!prev) $('#hl-ava').textContent = 'Now change a single letter…';
      const id = $('#hl-ident'); id.innerHTML = '';
      for (let i = 0; i < 25; i++) { const v = parseInt(hx.substr(i % 19 * 2, 2), 16); const on = parseInt(hx[(i * 7) % 40], 16) > 5; const cell = h('i'); cell.style.background = on ? `hsl(${(v * 1.41 + i * 3) % 360},70%,${45 + (v % 25)}%)` : 'var(--card2)'; id.appendChild(cell); }
      prev = hx;
    }
    inp.addEventListener('input', upd); nl.addEventListener('change', upd);
    $$('#hashlab [data-try]').forEach(b => b.addEventListener('click', () => { inp.value = b.dataset.try; upd(); }));
    upd();
  })();

  // ---------------- object model ----------------
  (function objmodel() {
    const svg = $('#om-svg'); let pick = 'none';
    const base = { 'README.md': '# Family recipes\n', 'app.js': "console.log('rasam');\n", 'logo.svg': '<svg><circle r="9"/></svg>\n' };
    function draw() {
      const r = new G.Repo({ clock: 1700000000 }); r.inited = true;
      Object.assign(r.files, base); r.run('git add .'); r.run('git commit -m "Snapshot 1"');
      const objs1 = new Set(Object.keys(r.objects));
      if (pick === 'README.md' || pick === 'both') r.files['README.md'] = '# Family recipes (now with payasam!)\n';
      if (pick === 'app.js' || pick === 'both') r.files['app.js'] = "console.log('rasam + payasam');\n";
      r.run('git add .'); r.run('git commit --allow-empty -m "Snapshot 2"');
      const c1 = r.order[0], c2 = r.order[1];
      const t1 = r.objects[c1].tree, t2 = r.objects[c2].tree;
      const blobs = []; [t1, t2].forEach(t => r.objects[t].entries.forEach(e => { if (!blobs.find(b => b.hash === e.hash)) blobs.push({ hash: e.hash, name: e.name }); }));
      svg.innerHTML = '';
      const defs = sv('defs', {}, svg); const m = sv('marker', { id: 'om-ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs); sv('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#6c7486' }, m);
      const bx = i => blobs.length < 2 ? 360 : 90 + i * (540 / (blobs.length - 1));
      const C = { [c1]: [190, 46], [c2]: [530, 46] };
      const T = t1 === t2 ? { [t1]: [360, 150] } : { [t1]: [190, 150], [t2]: [530, 150] };
      const line = (a, b, dash) => sv('path', { d: `M${a[0]},${a[1]} C${a[0]},${(a[1] + b[1]) / 2} ${b[0]},${(a[1] + b[1]) / 2} ${b[0]},${b[1]}`, fill: 'none', stroke: '#353e50', 'stroke-width': 2, 'stroke-dasharray': dash || '', 'marker-end': 'url(#om-ah)' }, svg);
      line([C[c1][0], C[c1][1] + 20], [T[t1][0], T[t1][1] - 22]); line([C[c2][0], C[c2][1] + 20], [T[t2][0], T[t2][1] - 22]);
      sv('path', { d: `M${C[c2][0] - 92},${C[c2][1]} L${C[c1][0] + 92},${C[c1][1]}`, stroke: '#ffb454', 'stroke-width': 2, 'stroke-dasharray': '6 4', 'marker-end': 'url(#om-ah)', fill: 'none' }, svg);
      sv('text', { x: 360, y: 38, 'text-anchor': 'middle', fill: '#ffb454', 'font-size': 11, 'font-family': 'JetBrains Mono' }, svg).textContent = 'parent';
      Object.keys(T).forEach(t => r.objects[t].entries.forEach(e => { const i = blobs.findIndex(b => b.hash === e.hash); line([T[t][0], T[t][1] + 22], [bx(i), 252]); }));
      const box = (x, y, w, col, l1, l2, isNew) => {
        const g = sv('g', {}, svg);
        sv('rect', { x: x - w / 2, y: y - 22, width: w, height: 44, rx: 10, fill: '#161a23', stroke: col, 'stroke-width': isNew ? 3 : 1.5 }, g);
        sv('text', { x, y: y - 3, 'text-anchor': 'middle', fill: col, 'font-size': 12.5, 'font-weight': 700, 'font-family': 'JetBrains Mono' }, g).textContent = l1;
        sv('text', { x, y: y + 13, 'text-anchor': 'middle', fill: '#a3abb9', 'font-size': 10.5, 'font-family': 'JetBrains Mono' }, g).textContent = l2;
        if (isNew !== undefined) sv('text', { x: x + w / 2 - 4, y: y - 26, 'text-anchor': 'end', fill: isNew ? '#ffb454' : '#56d4dd', 'font-size': 10, 'font-weight': 700, 'font-family': 'JetBrains Mono' }, g).textContent = isNew ? 'NEW' : 'reused';
      };
      box(C[c1][0], C[c1][1], 180, '#ffb454', '📸 commit ' + short(c1), 'Snapshot 1');
      box(C[c2][0], C[c2][1], 180, '#ffb454', '📸 commit ' + short(c2), 'Snapshot 2', true);
      Object.keys(T).forEach(t => box(T[t][0], T[t][1], 170, '#79c0ff', '📁 tree ' + short(t), t1 === t2 ? 'shared by both!' : (t === t1 ? 'tree of 1' : 'tree of 2'), t === t2 ? !objs1.has(t) : undefined));
      blobs.forEach((b, i) => box(bx(i), 276, 138, '#7ee787', '📄 ' + short(b.hash), b.name, r.objects[t2].entries.find(e => e.hash === b.hash) ? !objs1.has(b.hash) : undefined));
      const newer = Object.keys(r.objects).filter(k => !objs1.has(k));
      const reused = r.objects[t2].entries.filter(e => objs1.has(e.hash)).length;
      $('#om-note').innerHTML = `Snapshot 2 cost <b style="color:var(--amber)">${newer.length} new object${newer.length > 1 ? 's' : ''}</b> (${newer.map(k => r.objects[k].type).join(', ')}) and reused <b style="color:var(--teal)">${reused} blob${reused === 1 ? '' : 's'}</b>${t1 === t2 ? ', and even the whole tree' : ''}.`;
    }
    $('#om-pick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('#om-pick button').forEach(x => x.classList.toggle('on', x === b)); pick = b.dataset.f; draw(); });
    draw();
  })();

  // ---------------- merkle tamper ----------------
  (function merkle() {
    const ORIG = 'Rasam: tamarind, tomato, pepper';
    const steps = [['Paati\'s rasam', null], ['Add payasam', ['payasam.txt', 'Payasam: milk, vermicelli\n']], ['Add kesari', ['kesari.txt', 'Kesari: rava, ghee\n']], ['Fix payasam', ['payasam.txt', 'Payasam: milk, vermicelli, sugar\n']]];
    function build(text) {
      const r = new G.Repo({ clock: 1112911993, name: 'Paati' }); r.inited = true; r.user = { name: 'Paati', email: 'paati@example.com' };
      return steps.map(([msg, f], i) => {
        if (i === 0) r.files['recipe.txt'] = text + '\n'; else r.files[f[0]] = f[1];
        r.run('git add .'); r.run(`git commit -m "${msg}"`);
        const hsh = r.head(); const c = r.objects[hsh];
        return { msg, tree: c.tree, parent: c.parents[0] || null, id: hsh };
      });
    }
    const truth = build(ORIG);
    function render() {
      const cur = build($('#mk-in').value);
      const ch = $('#mk-chain'); ch.innerHTML = '';
      let broken = 0;
      cur.forEach((c, i) => {
        const t = truth[i]; const bt = c.tree !== t.tree, bp = c.parent !== t.parent, bi = c.id !== t.id; if (bi) broken++;
        if (i) ch.appendChild(h('div', 'mlink', bi ? '⛓️‍💥' : '⛓️'));
        ch.appendChild(h('div', 'mc' + (bi ? ' broken' : ''), `<div class="t">#${i + 1} ${esc(c.msg)}</div><div><span class="f">tree   </span><span class="v ${bt ? 'bad' : ''}">${short(c.tree)}</span></div><div><span class="f">parent </span><span class="v ${bp ? 'bad' : ''}">${c.parent ? short(c.parent) : '(none)'}</span></div><div><span class="f">id     </span><span class="id ${bi ? 'bad' : ''}">${short(c.id)}</span></div>`));
      });
      $('#mk-verdict').innerHTML = broken ? `<span style="color:var(--red)">🔓 ${broken}/4 commit ids changed.</span> You only edited commit #1, but its new id flows into #2's parent line, and onward. Anyone holding the real id of #4 (<code>${short(truth[3].id)}</code>) sees instantly that this history is fake.` : '<span style="color:var(--green)">✅ History matches. Every id verifies. Now change one character above.</span>';
    }
    $('#mk-in').addEventListener('input', render);
    $('#mk-reset').addEventListener('click', () => { $('#mk-in').value = ORIG; render(); });
    render();
  })();

  // ---------------- .git explorer ----------------
  (function gitx() {
    const items = [
      ['HEAD', 0, 'The "you are here" marker.', 'ref: refs/heads/main', 'Usually names a branch. During a "detached HEAD" it holds a raw commit hash instead.'],
      ['config', 0, 'This repository\'s settings.', '[core]\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/family/recipes.git\n[branch "main"]\n\tremote = origin', 'Remotes, branch tracking, per-repo user.name. Plain text: you can open it in any editor.'],
      ['description', 0, 'Trivia: almost useless.', 'Unnamed repository; edit this file to name it for gitweb.', 'Only read by an old web viewer called GitWeb. Every repo has one; nobody reads it.'],
      ['index', 0, 'The staging area (binary).', 'DIRC … recipe.txt ce01362… mtime size inode …', 'A sorted list of path → blob hash, plus file timestamps and sizes so `git status` can skip re-hashing unchanged files. This cache is a big part of why Git is fast.'],
      ['hooks/', 0, 'Scripts Git runs on events.', 'pre-commit.sample\ncommit-msg.sample\npre-push.sample\n…', 'Rename pre-commit.sample → pre-commit and it runs before every commit (lint, tests, secret-scanners). Not copied by clone, for safety.'],
      ['objects/', 0, 'THE database.', 'ce/\n  013625030ba8dba906f756967f9e9ca394464a\n9b/\n  4be01007d427f6401f02bc5111743543d188b4\ninfo/\npack/', 'Every blob, tree, commit and tag, zlib-compressed, filed under the first 2 hex chars of its hash (so no folder holds too many files).'],
      ['objects/pack/', 1, 'Packfiles: objects squeezed together.', 'pack-3f9a….pack\npack-3f9a….idx', 'The .pack holds many objects, similar ones stored as deltas. The .idx is a sorted table of contents for fast binary-search lookups.'],
      ['refs/heads/', 0, 'Branches.', 'main      → 9b4be01…\nspicy     → 7c22427…', 'One small file per branch, containing one commit hash. Creating a branch = writing one of these.'],
      ['refs/tags/', 1, 'Tags.', 'v1.0      → 4a1f…', 'Like branches that never move. Annotated tags point to a tag object.'],
      ['refs/remotes/origin/', 1, 'Bookmarks of the server.', 'main      → 9b4be01…', 'Where the server\'s branches were the last time you talked to it. Moved only by fetch / pull / push.'],
      ['logs/', 0, 'The reflog (flight recorder).', '0000000 afb255f You 1112912030 +0530 commit (initial): first\nafb255f 9b4be01 You 1112912080 +0530 commit: second', 'Every movement of HEAD and of each branch. Your undo history. Local only, never pushed.'],
      ['ORIG_HEAD', 0, 'Where you were before something risky.', '49ab139a7c6656de9565d64f3e8c30d8b19db0c9', 'Saved before merge, rebase and reset, so `git reset --hard ORIG_HEAD` can undo them.'],
      ['MERGE_HEAD', 0, 'Exists only mid-merge.', '7c2242772cd132c0d99892248db4abd8e0607d65', 'The commit you are merging in. Its presence is how Git knows "a merge is in progress" and that the next commit needs two parents.'],
      ['packed-refs', 0, 'Many refs, one file.', '# pack-refs with: peeled fully-peeled sorted\n9b4be01… refs/heads/old-feature\n4a1f… refs/tags/v0.9', 'With thousands of branches/tags, Git packs them into one file instead of thousands of tiny ones.']
    ];
    const ul = $('#gx-list');
    items.forEach((it, i) => { const li = h('li', '', `<span class="ind">${it[1] ? '&nbsp;&nbsp;└ ' : ''}</span>${it[0].endsWith('/') ? '📁' : '📄'} ${esc(it[0])}`); li.addEventListener('click', () => show(i)); ul.appendChild(li); });
    function show(i) { $$('#gx-list li').forEach((l, k) => l.classList.toggle('on', k === i)); const it = items[i]; $('#gx-info').innerHTML = `<h4>.git/${esc(it[0])}</h4><p><b>${esc(it[2])}</b></p><div class="mini-term">${esc(it[3])}</div><p style="margin:0;color:var(--soft)">${esc(it[4])}</p>`; }
    show(5);
  })();

  // ---------------- pack bars ----------------
  (function pack() {
    const rows = [['v1 (oldest)', 30, .5], ['v2', 30, .6], ['v3 (newest)', 30, 30]];
    const wrap = $('#pack-bars'); let packed = false;
    function render() {
      wrap.innerHTML = '';
      rows.forEach(([n, loose, pk]) => { const v = packed ? pk : loose; const r = h('div', 'pb', `<span>${n}</span><div class="track"><div class="seg1" style="width:${(loose / 30) * 100}%;background:${packed && pk < 30 ? 'var(--teal)' : 'var(--blob)'}"></div></div><span>${v} KB</span>`); wrap.appendChild(r); setTimeout(() => { $('.seg1', r).style.width = (v / 30 * 100) + '%'; }, 30); });
      const tot = rows.reduce((s, r) => s + (packed ? r[2] : r[1]), 0);
      wrap.appendChild(h('div', 'pb', `<b>total</b><div></div><b style="color:var(--amber)">${tot.toFixed(1)} KB</b>`));
      $('#pack-msg').innerHTML = packed ? '📦 Packed: the newest version is stored whole, the older two as tiny <span style="color:var(--teal)">deltas</span> against it. ~3× smaller, and every hash is unchanged. It\'s just storage.' : 'Loose objects: each version zlib-compressed on its own. Simple, but repetitive.';
      $('#pack-go').textContent = packed ? '↺ Unpack' : 'Run git gc';
    }
    $('#pack-go').addEventListener('click', () => { packed = !packed; render(); });
    render();
  })();

  // ---------------- studio (three trees) ----------------
  (function studio() {
    const st = { w: 1, i: 1, h: 1, n: 1 }; const root = $('#studio');
    const slot = z => $(`.zone[data-z="${z}"] .slot`, root);
    const tok = v => `<span class="token v${((v - 1) % 3) + 1}">recipe v${v}</span>`;
    function render() { slot('w').innerHTML = tok(st.w); slot('i').innerHTML = tok(st.i); slot('h').innerHTML = tok(st.h); $('#st-chain').innerHTML = '<i></i>'.repeat(Math.min(st.n, 12)); }
    function fly(from, to, v) {
      return new Promise(res => {
        const a = slot(from).getBoundingClientRect(), b = slot(to).getBoundingClientRect();
        const f = h('div', 'flyer', tok(v)); f.style.left = (a.left + a.width / 2 - 50) + 'px'; f.style.top = (a.top + 10) + 'px'; document.body.appendChild(f);
        requestAnimationFrame(() => requestAnimationFrame(() => { f.style.left = (b.left + b.width / 2 - 50) + 'px'; f.style.top = (b.top + 10) + 'px'; }));
        setTimeout(() => { f.remove(); const z = $(`.zone[data-z="${to}"]`, root); z.classList.remove('flash'); void z.offsetWidth; z.classList.add('flash'); res(); }, 680);
      });
    }
    const msg = t => $('#st-msg').innerHTML = t;
    let busy = false;
    $$('[data-st]', root).forEach(b => b.addEventListener('click', async () => {
      if (busy) return; busy = true; const a = b.dataset.st;
      if (a === 'edit') { st.w = Math.max(st.w, st.i, st.h) + 1; const z = $('.zone[data-z="w"]', root); z.classList.remove('flash'); void z.offsetWidth; z.classList.add('flash'); render(); msg(`You edited the file → <b>v${st.w}</b> exists only in your folder. Git hasn't recorded anything. (<code>git status</code> would say "modified, not staged".)`); }
      else if (a === 'add') { if (st.w === st.i) msg('Nothing to stage: the stage already matches your folder.'); else { await fly('w', 'i', st.w); st.i = st.w; render(); msg(`<code>git add</code>: v${st.i} is hashed into a blob, saved in .git/objects, and the index now points at it. It's on stage, not yet photographed.`); } }
      else if (a === 'commit') { if (st.i === st.h) msg('Nothing to commit: the stage matches the last photo. (Did you forget <code>git add</code>?)'); else { await fly('i', 'h', st.i); st.h = st.i; st.n++; render(); msg(`📸 <code>git commit</code>: the stage became a tree + commit. HEAD's branch moved. History now has ${st.n} commits.`); } }
      else if (a === 'unstage') { if (st.i === st.h) msg('Stage already matches HEAD. Nothing to unstage.'); else { await fly('h', 'i', st.h); st.i = st.h; render(); msg(`<code>git restore --staged</code>: copied HEAD's version back onto the stage. Your folder still has v${st.w}. Nothing lost.`); } }
      else if (a === 'discard') { if (st.w === st.i) msg('Folder already matches the stage. Nothing to discard.'); else { const lost = st.w; await fly('i', 'w', st.i); st.w = st.i; render(); msg(`⚠️ <code>git restore</code>: overwrote your folder with the stage's v${st.i}. Your v${lost} edits were never saved in Git, so they're gone.`); } }
      busy = false;
    }));
    render();
  })();

  // ---------------- reset visual ----------------
  (function resetvis() {
    let mode = 'mixed', done = false;
    const cms = $$('#rv-cmts .cm'), ptr = $('#rv-ptr');
    const place = i => { ptr.style.left = (cms[i].offsetLeft + 19 - ptr.offsetWidth / 2) + 'px'; };
    function set(i, w, at) { const e = $('#rv-' + i); if (e.textContent !== w) { e.textContent = w; e.classList.remove('chg'); void e.offsetWidth; e.classList.add('chg'); } }
    function back() { done = false; cms.forEach(c => c.classList.remove('ghost')); place(3); set('i', 'recipe @ D'); set('w', 'recipe @ D'); $('#rv-msg').textContent = 'main → D. Staging and folder both hold D\'s version.'; $('#rv-go').disabled = false; }
    $('#rv-mode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('#rv-mode button').forEach(x => x.classList.toggle('on', x === b)); mode = b.dataset.m; $('#rv-go').textContent = `git reset --${mode} A`; back(); });
    $('#rv-go').addEventListener('click', () => {
      if (done) return; done = true; $('#rv-go').disabled = true; place(0); cms.slice(1).forEach(c => c.classList.add('ghost'));
      setTimeout(() => {
        if (mode !== 'soft') set('i', 'recipe @ A');
        if (mode === 'hard') setTimeout(() => set('w', 'recipe @ A'), 300);
        $('#rv-msg').innerHTML = { soft: '① Only the pointer moved. Stage and folder still have D, so the changes from B, C, D now look <b>staged</b>, ready to squash into one fresh commit.', mixed: '① Pointer moved, ② stage reset to A. Your folder still has D, so B+C+D appear as <b>unstaged edits</b>. Nothing lost.', hard: '① ② ③ Everything rewound to A. Folder overwritten. B, C, D are ghosts: reachable only via <code>git reflog</code>. Uncommitted edits? <b style="color:var(--red)">Gone.</b>' }[mode];
      }, 500);
    });
    $('#rv-back').addEventListener('click', back);
    setTimeout(back, 50); addEventListener('resize', () => { if (!done) place(3); else place(0); });
  })();

  // ---------------- bisect ----------------
  (function bisect() {
    const N = 32; let bad, lo, hi, tests, solved, autoRun = false;
    const row = $('#bs-row');
    const msgs = ['Tamarind ratio tweak', 'Add curry leaves', 'More pepper', 'Tomato prep note', 'Typo fix', 'Rasam powder recipe', 'Hing note', 'Serving temp', 'Ghee tadka', 'Coriander garnish'];
    const culpritMsg = 'Swapped tamarind for ketchup 🍅';
    function newGame() {
      bad = 2 + Math.floor(Math.random() * (N - 2)); lo = 1; hi = N; tests = 0; solved = false; autoRun = false;
      row.innerHTML = '';
      for (let i = 1; i <= N; i++) { const b = h('button', '', i); b.title = i === bad ? '???' : msgs[i % msgs.length]; b.addEventListener('click', () => { if (!autoRun) test(i); }); row.appendChild(b); }
      paint(); $('#bs-msg').innerHTML = 'Somewhere between #2 and #32, one commit broke the rasam. Find the <b>first bad</b> commit.';
      $('#bs-auto').disabled = false;
    }
    function paint(probe) {
      $$('button', row).forEach((b, k) => { const i = k + 1; b.className = ''; if (i <= lo) b.classList.add('good'); if (i >= hi) b.classList.add('bad'); if (!solved && (i < lo || i > hi)) b.classList.add('out'); if (probe === i) b.classList.add('probe'); if (solved && i === hi) b.classList.add('culprit'); });
    }
    function test(i) {
      if (solved || i <= lo || i >= hi) return;
      tests++; if (i < bad) lo = i; else hi = i; paint(i);
      if (hi === lo + 1) { solved = true; paint(); const lin = bad - 1; $('#bs-msg').innerHTML = `🎯 Culprit: <b>#${hi}</b> "${culpritMsg}". Found in <b>${tests}</b> tasting${tests > 1 ? 's' : ''}. Checking one by one from the start would have taken ${lin}. Binary search: at most ⌈log₂ 31⌉ = 5.`; if (tests <= 5) confettiOnce('bisect'); gotBadgeSoft(); }
      else $('#bs-msg').innerHTML = `Tasting #${i}: <b style="color:${i < bad ? 'var(--green)' : 'var(--red)'}">${i < bad ? 'good' : 'bad'}</b>. Suspects left: #${lo + 1}–#${hi} (${hi - lo} commits). Tastings: ${tests}`;
    }
    function gotBadgeSoft() { }
    $('#bs-new').addEventListener('click', newGame);
    $('#bs-auto').addEventListener('click', () => {
      if (solved) newGame(); autoRun = true; $('#bs-auto').disabled = true;
      (function stepA() { if (solved) { autoRun = false; return; } const mid = Math.floor((lo + hi) / 2); paint(mid); $('#bs-msg').innerHTML = `git bisect checks out #${mid}, the middle of #${lo + 1}…#${hi}. Tasting…`; setTimeout(() => { test(mid); setTimeout(stepA, 900); }, 700); })();
    });
    newGame();
  })();

  // =====================================================================
  //  SANDBOX: live terminal + graph + three trees + object store
  // =====================================================================
  const FAM = { Paati: 'git config user.name "Paati"', Amma: 'git config user.name "Amma"', You: 'git config user.name "You"' };
  const BASE = ['git init', FAM.Paati, 'echo "Rasam: tamarind, tomato, pepper" > rasam.txt', 'git add .', 'git commit -m "Paati\'s rasam"'];
  const SCENES = {
    init: { title: '~/recipes · no repository yet', files: { 'rasam.txt': 'Rasam: tamarind, tomato, pepper\n' }, chips: [
      { c: 'ls -a', s: 'Look around. Just a recipe file. No history exists anywhere.' },
      { c: 'git status', s: 'Ask Git about this folder… it has no idea it exists.' },
      { c: 'git init', s: 'Open the diary.' },
      { c: 'ls -a', s: 'A hidden <b>.git</b> folder appeared. That folder IS the repository.' },
      { c: 'ls .git', s: 'Peek inside the diary.' },
      { c: 'cat .git/HEAD', s: 'HEAD already points to <b>main</b>…' },
      { c: 'ls .git/refs/heads', s: '…but main doesn\'t exist yet. An unborn branch, waiting for its first commit.' }] },
    add: { title: '~/recipes · fresh repo', files: { 'rasam.txt': 'Rasam: tamarind, tomato, pepper\n' }, setup: ['git init'], chips: [
      { c: 'git status', s: 'Git sees the file but isn\'t tracking it: <b>untracked</b>.' },
      { c: 'find .git/objects', s: 'The object database is empty. Remember this.' },
      { c: 'git add rasam.txt', s: 'Put the recipe on stage. Watch ⚙️ and the green object that appears.' },
      { c: 'find .git/objects', s: 'An object already exists, and we haven\'t committed!' },
      { c: 'git cat-file -p :rasam.txt', s: 'Open that blob: pure content. No filename, no date.' },
      { c: 'git ls-files -s', s: 'This is the index: filename → blob hash.' },
      { c: 'echo "Rasam: tamarind, tomato, pepper" > copy.txt', s: 'Sneaky test: a second file with <b>identical</b> text…' },
      { c: 'git add copy.txt', s: 'Stage it. Will Git store a second blob?' },
      { c: 'git ls-files -s', s: 'Two names, <b>one</b> hash. Deduplication, for free.' }] },
    commit: { title: '~/recipes · something staged', setup: ['git init', 'echo "Rasam: tamarind, tomato, pepper" > rasam.txt', 'git add rasam.txt'], chips: [
      { c: 'git commit -m "Paati\'s rasam"', s: 'Click the shutter. Three objects-and-pointers things happen (see ⚙️).' },
      { c: 'git cat-file -p HEAD', s: 'Open the commit object. No <b>parent</b> line: it\'s the very first.' },
      { c: 'git cat-file -p HEAD^{tree}', s: 'Open its tree: the folder listing.' },
      { c: 'cat .git/refs/heads/main', s: '<b>main</b> is born: a file holding one hash.' },
      { c: 'echo "Add a pinch of jeera" >> rasam.txt', s: 'Amma adds a secret ingredient.' },
      { c: 'git commit -am "Amma: secret jeera"', s: '<b>-a</b> stages changed tracked files; <b>-m</b> sets the message.' },
      { c: 'git cat-file -p HEAD', s: 'Now there\'s a <b>parent</b> line. That one link is what "history" is.' },
      { c: 'git commit -m "nothing?"', s: 'What happens if nothing changed?' }] },
    diff: { title: '~/recipes · three generations', setup: [...BASE, FAM.Amma, 'echo "Add a pinch of jeera" >> rasam.txt', 'git commit -am "Secret jeera"', FAM.You, 'echo "Payasam: milk, vermicelli, sugar" > payasam.txt', 'git add .', 'git commit -m "Add payasam"'], chips: [
      { c: 'echo "Garnish with coriander" >> rasam.txt', s: 'Make an edit.' },
      { c: 'git status', s: '<b>status</b>: which files differ between the three trees.' },
      { c: 'git diff', s: '<b>diff</b>: which lines (folder ↔ stage).' },
      { c: 'git add rasam.txt', s: 'Stage it…' },
      { c: 'git diff', s: 'Plain diff is now empty! The change moved onto the stage.' },
      { c: 'git diff --staged', s: '<b>--staged</b> compares stage ↔ HEAD.' },
      { c: 'git commit -m "Coriander garnish"', s: 'Commit it.' },
      { c: 'git log', s: 'Read the diary backwards. Three cooks, four commits.' },
      { c: 'git log --oneline', s: 'The compact view.' },
      { c: 'git show HEAD~2', s: 'What exactly did Amma change? (HEAD~2 = two steps back)' },
      { c: 'git checkout HEAD~3', s: 'Time-travel to Paati\'s original! (detached HEAD)' },
      { c: 'cat rasam.txt', s: 'Your folder now holds the 2005… er, the very first version.' },
      { c: 'git switch main', s: 'Back to the present.' }] },
    branch: { title: '~/recipes · on main', setup: [...BASE, FAM.Amma, 'echo "Add a pinch of jeera" >> rasam.txt', 'git commit -am "Secret jeera"', FAM.You], chips: [
      { c: 'git branch spicy', s: 'Create a sticky note called <b>spicy</b>.' },
      { c: 'cat .git/refs/heads/spicy', s: 'The entire branch: one hash.' },
      { c: 'git branch', s: 'The * shows where HEAD is: still main!' },
      { c: 'git switch spicy', s: 'Hop onto it. Watch the amber HEAD label move.' },
      { c: 'cat .git/HEAD', s: 'HEAD now names spicy.' },
      { c: 'echo "Add 4 green chillies" >> rasam.txt', s: 'Experiment!' },
      { c: 'git commit -am "Spicy rasam"', s: 'Only <b>spicy</b> moves forward. main stays put.' },
      { c: 'git switch main', s: 'Switch back…' },
      { c: 'cat rasam.txt', s: 'No chillies! Git rewrote the file to main\'s snapshot.' },
      { c: 'git switch spicy', s: 'And they\'re back.' },
      { c: 'git log --oneline --all', s: 'Every branch at once.' }] },
    ff: { title: 'Fast-forward · main is behind spicy', setup: [...BASE, FAM.You, 'git switch -c spicy', 'echo "Add 4 green chillies" >> rasam.txt', 'git commit -am "Spicy rasam"', 'git switch main'], chips: [
      { c: 'git log --oneline --all', s: 'main sits directly behind spicy. No divergence.' },
      { c: 'git merge spicy', s: 'Merge! Watch main\'s sticky note simply slide.' },
      { c: 'git log --oneline', s: 'No merge commit was created. That\'s a fast-forward.' }] },
    threeway: { title: 'Three-way · both sides moved', setup: [...BASE, FAM.You, 'git switch -c spicy', 'echo "Use 4 green chillies, slit" > spicy-notes.txt', 'git add .', 'git commit -m "Spicy notes"', 'git switch main', FAM.Amma, 'echo "Payasam: milk, vermicelli, sugar" > payasam.txt', 'git add .', 'git commit -m "Amma: payasam"', FAM.You], chips: [
      { c: 'git log --oneline --all', s: 'Both branches moved since they split. They\'ve <b>diverged</b>.' },
      { c: 'git merge spicy', s: 'Three-way merge. Read ⚙️ for the per-file decisions.' },
      { c: 'git cat-file -p HEAD', s: 'A commit with <b>two</b> parent lines.' },
      { c: 'ls', s: 'Both sides\' files are here.' }] },
    conflict: { title: 'Conflict · same line, two cooks', setup: [...BASE, FAM.You, 'git switch -c spicy', 'echo "Rasam: tamarind, tomato, pepper, 4 chillies" > rasam.txt', 'git commit -am "Spicy"', 'git switch main', FAM.Amma, 'echo "Rasam: tamarind, tomato, pepper, drumstick" > rasam.txt', 'git commit -am "Amma: drumstick"', FAM.You], chips: [
      { c: 'git merge spicy', s: 'Merge… 💥' },
      { c: 'cat rasam.txt', s: 'Git wrote BOTH versions into the file, between markers.' },
      { c: 'git status', s: 'Status lists the conflicted file.' },
      { c: 'echo "Rasam: tamarind, tomato, pepper, drumstick, 2 chillies" > rasam.txt', s: 'You decide: a compromise. (Or click the file in 📁 to edit it yourself.)' },
      { c: 'git add rasam.txt', s: '<b>add</b> = "conflict resolved".' },
      { c: 'git commit -m "Merge: medium heat + drumstick"', s: 'Seal the merge: a commit with two parents.' },
      { c: 'git log --oneline --all', s: 'Peace in the family.' }] },
    'vs-merge': { title: 'on feature', compact: true, setup: vsSetup(), chips: [
      { c: 'git merge main', s: 'Join the rivers: a new commit with two parents.' },
      { c: 'git log --oneline', s: 'History shows the parallel work, honestly.' }] },
    'vs-rebase': { title: 'on feature', compact: true, setup: vsSetup(), chips: [
      { c: 'git rebase main', s: 'Replay your 2 commits on top of main. Watch the old ones fade into ghosts.' },
      { c: 'git log --oneline', s: 'A straight line, as if you started later. New hashes!' },
      { c: 'git reflog', s: 'The ghosts are still findable here.' }] },
    tag: { title: '~/recipes · Deepavali edition', setup: [...BASE, FAM.Amma, 'echo "Add a pinch of jeera" >> rasam.txt', 'git commit -am "Secret jeera"', FAM.You, 'echo "Payasam: milk, vermicelli, sugar" > payasam.txt', 'git add .', 'git commit -m "Add payasam"'], chips: [
      { c: 'git tag deepavali-edition', s: 'A <b>lightweight</b> tag: just a name.' },
      { c: 'cat .git/refs/tags/deepavali-edition', s: 'It\'s a file with a hash, like a branch that never moves.' },
      { c: 'git tag -a v1.0 -m "First complete edition"', s: 'An <b>annotated</b> tag: creates a real object.' },
      { c: 'git cat-file -t v1.0', s: 'Its type: tag. The 4th object type!' },
      { c: 'git cat-file -p v1.0', s: 'Who, when, why, and which commit.' },
      { c: 'git log --oneline', s: 'Tags show up as decorations.' }] },
    reset: { title: '~/recipes · commits A B C D', setup: ['git init', 'echo "Rasam base" > rasam.txt', 'git add .', 'git commit -m "A: rasam base"', 'echo "jeera" >> rasam.txt', 'git commit -am "B: jeera"', 'echo "coriander" >> rasam.txt', 'git commit -am "C: coriander"', 'echo "ghee" >> rasam.txt', 'git commit -am "D: ghee"'], chips: [
      { c: 'git log --oneline', s: 'Four commits. Let\'s rewind three different ways.' },
      { c: 'git reset --soft HEAD~1', s: '<b>--soft</b>: main moves back to C; D\'s change stays <b>staged</b>.' },
      { c: 'git status', s: 'See? Ready to re-commit.' },
      { c: 'git commit -m "D: ghee (better message)"', s: 'Re-commit. Old D becomes a ghost.' },
      { c: 'git reset HEAD~1', s: '<b>--mixed</b> (default): the change returns to your folder, unstaged.' },
      { c: 'git status', s: 'Modified, not staged.' },
      { c: 'git reset --hard HEAD~1', s: '<b>--hard</b>: branch, stage AND folder rewind. ⚠️' },
      { c: 'git status', s: 'Spotless. The uncommitted ghee edit is gone for good.' },
      { c: 'git log --oneline', s: 'We\'re back at B.' }] },
    revert: { title: '~/recipes · a salty mistake', setup: [...BASE, 'git config user.name "Cousin Kumar"', 'echo "Add 10 spoons of salt" >> rasam.txt', 'git commit -am "More salt (trust me)"', FAM.Amma, 'echo "Payasam: milk, vermicelli, sugar" > payasam.txt', 'git add .', 'git commit -m "Add payasam"', FAM.You], chips: [
      { c: 'git log --oneline', s: 'Kumar\'s commit is two steps back, and everyone already pulled it.' },
      { c: 'cat rasam.txt', s: '10 spoons. 😬' },
      { c: 'git revert HEAD~1', s: 'Publish the opposite change as a new commit.' },
      { c: 'cat rasam.txt', s: 'Salt gone. Payasam untouched.' },
      { c: 'git log --oneline', s: 'Nothing erased. One commit added.' },
      { c: 'git show HEAD', s: 'The reverse diff.' }] },
    stash: { title: '~/recipes · half-written payasam', setup: [...BASE, FAM.You, 'echo "Payasam: milk, vermicelli, sugar" > payasam.txt', 'git add .', 'git commit -m "Add payasam"', 'echo "Step 2: roast vermicelli in ghee until..." >> payasam.txt'], chips: [
      { c: 'git status', s: 'Payasam is half-written. Then Amma calls: "Fix the rasam salt, guests are coming!"' },
      { c: 'git stash', s: 'Sweep the mess into the drawer. Watch the hidden objects appear.' },
      { c: 'git status', s: 'Clean kitchen.' },
      { c: 'git switch -c salt-fix', s: 'Branch for the fix.' },
      { c: 'echo "Salt: 1 tsp only" >> rasam.txt', s: 'Fix it.' },
      { c: 'git commit -am "Fix rasam salt"', s: 'Commit.' },
      { c: 'git switch main', s: 'Back to main…' },
      { c: 'git merge salt-fix', s: '…and bring the fix in (fast-forward).' },
      { c: 'git stash pop', s: 'Guests fed. Now open the drawer.' },
      { c: 'git status', s: 'Exactly where you left off.' }] },
    cherry: { title: '~/recipes · one good idea in a messy branch', setup: [...BASE, FAM.You, 'git switch -c experiments', 'echo "Fusion dosa: pizza toppings" > fusion.txt', 'git add .', 'git commit -m "Fusion dosa (bad idea)"', 'echo "Temper mustard seeds until they pop, then curry leaves" > tempering.txt', 'git add .', 'git commit -m "Perfect tempering technique"', 'echo "Kesari: burnt" > kesari.txt', 'git add .', 'git commit -m "Burnt kesari"', 'git switch main'], chips: [
      { c: 'git log --oneline --all', s: 'Three experiments. Only the middle one is worth keeping.' },
      { c: 'git cherry-pick experiments~1', s: 'Copy just that one commit onto main.' },
      { c: 'ls', s: 'Only tempering.txt arrived. No pizza dosa.' },
      { c: 'git log --oneline --all', s: 'Same message, same author, <b>new</b> hash.' }] },
    reflog: { title: '~/recipes · 11:58 pm', setup: [...BASE, FAM.You, 'echo "jeera" >> rasam.txt', 'git commit -am "Jeera"', 'echo "Payasam: milk" > payasam.txt', 'git add .', 'git commit -m "Payasam"', 'echo "Kesari: rava" > kesari.txt', 'git add .', 'git commit -m "Kesari"', 'echo "Vada: urad dal" > vada.txt', 'git add .', 'git commit -m "Vada"'], chips: [
      { c: 'git log --oneline', s: 'Five commits of hard work.' },
      { c: 'git reset --hard HEAD~3', s: 'Midnight. Wrong command. 😱' },
      { c: 'git log --oneline', s: 'Three commits… gone? (Notice the ghosts in the graph.)' },
      { c: 'git reflog', s: 'The flight recorder remembers every move of HEAD.' },
      { c: 'git reset --hard HEAD@{1}', s: 'Jump back to where HEAD was one move ago.' },
      { c: 'git log --oneline', s: 'Resurrected. Nothing was ever deleted.' }] },
    blame: { title: '~/recipes · three generations, one file', setup: [...BASE, FAM.Amma, 'echo "A pinch of hing" >> rasam.txt', 'git commit -am "Amma: hing"', FAM.You, 'echo "Garnish with coriander" >> rasam.txt', 'git commit -am "Coriander garnish"', FAM.Amma, 'echo "Serve with hot rice" >> rasam.txt', 'git commit -am "Serving note"', FAM.You], chips: [
      { c: 'cat rasam.txt', s: 'Four lines. Who wrote which?' },
      { c: 'git blame rasam.txt', s: 'Each line, with the commit and cook that introduced it.' },
      { c: 'git log --oneline', s: 'The commits blame pointed to.' }] },
    remote: { title: 'your laptop · nothing cloned yet', server: true, chips: [
      { c: 'git clone https://github.com/family/recipes.git', s: 'Copy the entire family book (every version) to your laptop.' },
      { c: 'git log --oneline --all', s: '<b>origin/main</b> (red, dashed) is your bookmark of the server.' },
      { c: 'echo "Serve with papad" >> rasam.txt', s: 'Cook something.' },
      { c: 'git commit -am "Serve with papad"', s: 'Commit locally. The server knows nothing yet.' },
      { c: 'git status', s: 'main vs the origin/main bookmark: ahead by 1.' },
      { c: 'git push', s: 'Upload the missing objects; the server moves its main.' },
      { a: 'teammate', label: '👩‍💻 Meanwhile, Meera pushes from Bengaluru', s: 'Meera adds a recipe and pushes. Your laptop has no idea.' },
      { c: 'echo "Finish with a ghee tadka" >> rasam.txt', s: 'You keep cooking…' },
      { c: 'git commit -am "Ghee tadka"', s: '…and commit.' },
      { c: 'git push', s: 'Push again… ❌' },
      { c: 'git fetch', s: 'Download Meera\'s work. Your own main does not move.' },
      { c: 'git status', s: 'Diverged: 1 yours, 1 hers.' },
      { c: 'git pull', s: 'pull = fetch + merge. Her file + your edit.' },
      { c: 'git push', s: 'Now it fits on top. Accepted.' },
      { c: 'git log --oneline --all', s: 'One story, two laptops. 🎉' }] },
    free: { title: 'free sandbox · cloned & ready', server: true, setup: ['git clone https://github.com/family/recipes.git'], free: true, chips: [
      { c: 'help' }, { c: 'git log --oneline --all' }, { c: 'git status' }, { c: 'ls .git' }, { c: 'fortune' }, { a: 'teammate', label: '👩‍💻 Meera pushes' }] }
  };
  function vsSetup() { return [...BASE, FAM.You, 'git switch -c feature', 'echo "Kesari: rava, ghee, sugar" > kesari.txt', 'git add .', 'git commit -m "Add kesari"', 'echo "Saffron!" >> kesari.txt', 'git commit -am "Kesari: saffron"', 'git switch main', FAM.Amma, 'echo "Payasam: milk, vermicelli" > payasam.txt', 'git add .', 'git commit -m "Add payasam"', 'echo "Vada: urad dal" > vada.txt', 'git add .', 'git commit -m "Add vada"', FAM.You, 'git switch feature']; }
  function makeServer() {
    const s = new G.Repo({ clock: 1112800000 }); s.url = 'https://github.com/family/recipes.git';
    BASE.forEach(c => s.run(c)); s.run(FAM.Amma); s.run('echo "Payasam: milk, vermicelli, sugar" > payasam.txt'); s.run('git add .'); s.run('git commit -m "Amma: payasam"');
    s.meera = 0; return s;
  }
  const TELNET = ['Connected to bitkeeper-server.', 'help', '?      - print this help', 'clone  - clone the current repository', 'pull   - update from the server', '(…and that\'s how Git was born. 🥚)'];

  class Sandbox {
    constructor(el) {
      this.el = el; this.key = el.dataset.scene; this.sc = SCENES[this.key]; this.hist = []; this.hpos = 0; this.busy = false;
      this.build(); this.reset();
    }
    build() {
      const sc = this.sc; const el = this.el;
      el.innerHTML = `<div class="sbx">
        <div class="sbx-top"><span class="ttl">${esc(sc.title)}</span><button class="rst">↺ reset</button></div>
        <div class="sbx-graph"><svg></svg><div class="empty"></div></div>
        <div class="sbx-trees">
          <div class="tw"><h5>📁 Working folder <button class="nf">+ file</button></h5><div class="list"></div></div>
          <div class="ti"><h5>🎬 Staging (index)</h5><div class="list"></div></div>
          <div class="th"><h5>📸 HEAD <span class="hl" style="text-transform:none;color:var(--amber);font-family:var(--font-mono)"></span></h5><div class="list"></div></div>
        </div>
        <div class="sbx-main">
          <div class="term"><div class="term-out"></div><div class="term-in"><span class="pr">$</span><input type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="terminal input" placeholder="type a command…"></div></div>
          <div class="hood"><h5>⚙️ Under the hood</h5><div class="hb"></div><div class="objs"></div></div>
        </div>
        <div class="sbx-chips"><div class="say"></div><div class="chips"></div></div>
        ${sc.server ? '<div class="server"></div>' : ''}
      </div>`;
      this.$ = s => el.querySelector(s);
      this.svg = this.$('.sbx-graph svg'); this.out = this.$('.term-out'); this.inp = this.$('.term-in input');
      this.$('.rst').addEventListener('click', () => this.reset());
      this.inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { const v = this.inp.value.trim(); this.inp.value = ''; if (v) this.exec(v); }
        else if (e.key === 'ArrowUp') { if (this.hpos > 0) { this.hpos--; this.inp.value = this.hist[this.hpos]; } e.preventDefault(); }
        else if (e.key === 'ArrowDown') { if (this.hpos < this.hist.length) { this.hpos++; this.inp.value = this.hist[this.hpos] || ''; } e.preventDefault(); }
      });
      this.$('.term').addEventListener('click', e => { if (e.target === this.out || e.target.closest('.term-out') && !getSelection().toString()) this.inp.focus({ preventScroll: true }); });
      this.$('.nf').addEventListener('click', () => this.editor(null));
      if (sc.compact) el.querySelector('.sbx').classList.add('compact');
    }
    reset() {
      const sc = this.sc;
      this.server = sc.server ? makeServer() : null;
      this.repo = new G.Repo({ server: this.server });
      if (sc.files) Object.assign(this.repo.files, JSON.parse(JSON.stringify(sc.files)));
      (sc.setup || []).forEach(c => this.repo.run(c));
      this.repo.user = { name: 'You', email: 'you@example.com' };
      this.seen = new Set(this.repo.order); this.seenObj = new Set(Object.keys(this.repo.objects));
      this.out.innerHTML = ''; this.line(sc.free ? 'Everything works here. Type "help". Some commands are… secret.' : 'Click the glowing chip below, or type your own command. Type "help" for the list.', 'welcome');
      this.chipsUsed = new Set(); this.oldLabels = {};
      this.$('.hb').innerHTML = '<div class="idle">Run a command and I\'ll narrate what Git does inside <code>.git</code>.</div>';
      this.renderChips(); this.render(true);
    }
    line(t, c) { const d = h('div', c || '', esc(t)); this.out.appendChild(d); this.out.scrollTop = this.out.scrollHeight; }
    exec(cmd, fromChip) {
      this.hist.push(cmd); this.hpos = this.hist.length;
      this.line(cmd, 'cmd');
      if (/^telnet\b/.test(cmd)) { TELNET.forEach((l, i) => this.line(l, i === 1 ? 'warn' : 'dim')); foundEgg('telnet'); this.markChip(cmd); return; }
      const res = this.repo.run(cmd);
      let cleared = false;
      res.events.forEach(ev => {
        if (ev.type === 'clear') { this.out.innerHTML = ''; cleared = true; }
        if (ev.type === 'egg') foundEgg(ev.id);
        if (ev.type === 'cmd') gotBadge(ev.name);
        if (ev.type === 'shake') { const s = this.$('.sbx'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
        if (ev.type === 'merged') confettiOnce('merge');
        if (ev.type === 'rebased') confettiOnce('rebase');
      });
      res.out.forEach(o => this.line(o.t, o.c));
      const hb = this.$('.hb');
      const notes = res.hood.length ? res.hood : [res.ok ? 'Read-only: this command looked at data but changed nothing inside .git.' : 'Git refused, so nothing changed.'];
      hb.innerHTML = `<div class="lastcmd">$ ${esc(cmd)}</div><ol>${notes.map((n, i) => `<li style="animation-delay:${i * .12}s">${esc(n).replace(/([0-9a-f]{7})(?![0-9a-f])/g, '<b style="color:var(--amber)">$1</b>')}</li>`).join('')}</ol>`;
      this.markChip(cmd);
      this.render();
    }
    markChip(cmd) {
      const ch = this.sc.chips || []; const i = ch.findIndex((c, k) => c.c === cmd && !this.chipsUsed.has(k));
      if (i >= 0) this.chipsUsed.add(i);
      this.renderChips();
    }
    async typeRun(cmd) {
      if (this.busy) return; this.busy = true; this.inp.value = '';
      for (const ch of cmd) { this.inp.value += ch; await new Promise(r => setTimeout(r, cmd.length > 40 ? 6 : 16)); }
      await new Promise(r => setTimeout(r, 120)); this.inp.value = ''; this.exec(cmd, true); this.busy = false;
    }
    teammate() {
      const s = this.server; s.meera++;
      const files = [['bisibelebath.txt', 'Bisibelebath: rice, dal, vegetables, masala\n', 'Meera: Bisibelebath from Bengaluru'], ['mysore-pak.txt', 'Mysore pak: besan, ghee, sugar\n', 'Meera: Mysore pak'], ['akki-roti.txt', 'Akki roti: rice flour, onion\n', 'Meera: Akki roti']];
      const f = files[(s.meera - 1) % files.length]; s.teammateCommit(f[0], f[1] + (s.meera > 3 ? 'v' + s.meera + '\n' : ''), f[2]);
      this.line('(meanwhile in Bengaluru… Meera pushed "' + f[2] + '")', 'warn');
      this.$('.hb').innerHTML = `<div class="lastcmd">☁️ on the server</div><ol><li>Meera's laptop uploaded new objects to the server and moved the <b>server's</b> main.</li><li>Your laptop knows nothing. Your <b>origin/main</b> bookmark still shows the old position, until you <b>fetch</b>.</li></ol>`;
      const ch = this.sc.chips; const i = ch.findIndex((c, k) => c.a === 'teammate' && !this.chipsUsed.has(k)); if (i >= 0) this.chipsUsed.add(i);
      this.renderChips(); this.render();
    }
    renderChips() {
      const ch = this.sc.chips || []; const box = this.$('.chips'); box.innerHTML = '';
      let next = -1; if (!this.sc.free) next = ch.findIndex((c, k) => !this.chipsUsed.has(k));
      ch.forEach((c, k) => {
        const b = h('button', 'chip' + (c.a ? ' action' : '') + (this.chipsUsed.has(k) ? ' used' : '') + (k === next ? ' next' : ''), esc(c.a ? c.label : c.c));
        b.addEventListener('click', () => { if (c.a === 'teammate') this.teammate(); else this.typeRun(c.c); });
        box.appendChild(b);
      });
      const say = this.$('.say');
      if (this.sc.free) say.innerHTML = 'Ideas to try: break things, then fix them with <b>reflog</b>. Force-push over Meera. Delete .git. Rebase. Everything resets with ↺.';
      else if (next >= 0) say.innerHTML = `<b>Step ${next + 1}/${ch.length}.</b> ${ch[next].s || ''}`;
      else say.innerHTML = '✅ <b>Scene complete.</b> Keep experimenting with your own commands, or ↺ reset.';
    }
    render(initial) { this.renderGraph(initial); this.renderTrees(); this.renderObjs(); if (this.server) this.renderServer(); }

    renderGraph(initial) {
      const r = this.repo, svg = this.svg, empty = this.$('.empty');
      // remember label positions (for sliding animation)
      const old = {}; $$('.g-label', svg).forEach(g => old[g.dataset.key] = { x: +g.dataset.x, y: +g.dataset.y });
      svg.innerHTML = '';
      const vis = r.order.filter(x => r.objects[x] && !r.hidden.has(x));
      if (!vis.length) { svg.setAttribute('width', 10); svg.setAttribute('height', 96); empty.style.display = 'flex'; empty.textContent = r.inited ? 'No commits yet. The graph grows with your first commit.' : 'No repository here (no .git folder).'; return; }
      empty.style.display = 'none';
      const reach = r.reachable(); const deco = r.decorations(); const headC = r.head();
      const idx = {}; vis.forEach((x, i) => idx[x] = i);
      const X = i => 40 + i * 72;
      // mainline = first-parent chain of main (or current branch)
      const mainTip = r.refs['refs/heads/main'] || headC; const mainline = new Set(); let m = mainTip; while (m && r.objects[m]) { mainline.add(m); m = r.objects[m].parents[0]; }
      const lane = {}, taken = {}, lastX = [];
      vis.forEach(c => {
        const p = (r.objects[c].parents || []).find(q => idx[q] !== undefined);
        let L;
        if (mainline.has(c)) L = 0;
        else if (p && !taken[p] && lane[p] > 0 && (lastX[lane[p]] === undefined || lastX[lane[p]] <= idx[p])) L = lane[p];
        else { const from = p ? idx[p] : idx[c] - 1; L = 1; while (lastX[L] !== undefined && lastX[L] > from) L++; }
        if (p) taken[p] = true;
        lane[c] = L; lastX[L] = idx[c];
      });
      const nL = Math.max(...Object.values(lane)) + 1;
      const labCount = new Array(nL).fill(0); vis.forEach(c => { labCount[lane[c]] = Math.max(labCount[lane[c]], (deco[c] || []).length); });
      const Y = []; let y = 30; for (let k = 0; k < nL; k++) { Y[k] = y; y += 34 + 18 * Math.max(1, labCount[k]); }
      const W = Math.max(this.$('.sbx-graph').clientWidth, X(vis.length - 1) + 90), H = y - 4;
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const pos = c => [X(idx[c]), Y[lane[c]]];
      const isNew = c => !initial && !this.seen.has(c);
      const newList = vis.filter(isNew);
      // edges
      vis.forEach(c => (r.objects[c].parents || []).forEach(p => {
        if (idx[p] === undefined) return;
        const [x1, y1] = pos(p), [x2, y2] = pos(c);
        const d = y1 === y2 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${x1 + 36},${y1} ${x2 - 36},${y2} ${x2},${y2}`;
        const e = sv('path', { d, class: 'g-edge' + (reach.has(c) ? '' : ' ghost') + (isNew(c) ? ' new' : '') }, svg);
        if (isNew(c)) e.style.animationDelay = (newList.indexOf(c) * .14) + 's';
      }));
      // nodes
      vis.forEach(c => {
        const [x, y] = pos(c); const ob = r.objects[c];
        const g = sv('g', { class: 'g-node' + (reach.has(c) ? '' : ' ghost') + (c === headC ? ' headc' : '') + (ob.parents.length > 1 ? ' merge' : '') + (isNew(c) ? ' pop' : '') }, svg);
        if (isNew(c)) g.style.animationDelay = (newList.indexOf(c) * .14) + 's';
        if (c === headC) sv('circle', { cx: x, cy: y, r: 17, class: 'glow' }, g);
        sv('circle', { cx: x, cy: y, r: 10, class: 'outer core' }, g);
        if (ob.parents.length > 1) sv('circle', { cx: x, cy: y, r: 5, class: 'inner', style: 'fill:var(--commit);stroke:none' }, g);
        sv('text', { x, y: y - 16 }, g).textContent = short(c);
        const tip = $('#gtip');
        g.addEventListener('mouseenter', () => { tip.innerHTML = `<b style="color:var(--amber)">${short(c)}</b> ${esc(ob.msg.split('\n')[0])}<br><span style="color:var(--soft)">${esc(ob.author.name)}${reach.has(c) ? '' : ' · 👻 unreachable'} · click to open</span>`; tip.style.display = 'block'; });
        g.addEventListener('mousemove', e => { tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; tip.style.position = 'fixed'; });
        g.addEventListener('mouseleave', () => tip.style.display = 'none');
        g.addEventListener('click', () => { tip.style.display = 'none'; this.typeRun('git cat-file -p ' + short(c)); });
      });
      // labels
      const fresh = [];
      vis.forEach(c => (deco[c] || []).forEach((lb, j) => {
        const [x, y] = pos(c); const ly = y + 25 + j * 18; const w = lb.label.length * 6.7 + 14;
        const key = lb.kind === 'head' && lb.label.startsWith('HEAD (') ? 'HEAD' : lb.label.replace('HEAD → ', '');
        const g = sv('g', { class: 'g-label ' + lb.kind, 'data-key': key, 'data-x': x, 'data-y': ly }, svg);
        sv('rect', { x: x - w / 2, y: ly - 8.5, width: w, height: 17, rx: 6 }, g);
        sv('text', { x, y: ly + .5 }, g).textContent = lb.label;
        if (old[key] && (old[key].x !== x || old[key].y !== ly)) fresh.push([g, old[key].x - x, old[key].y - ly]);
      }));
      fresh.forEach(([g, dx, dy]) => { g.style.transition = 'none'; g.style.transform = `translate(${dx}px,${dy}px)`; });
      if (fresh.length) requestAnimationFrame(() => requestAnimationFrame(() => fresh.forEach(([g]) => { g.style.transition = ''; g.style.transform = ''; })));
      vis.forEach(c => this.seen.add(c));
      if (newList.length || initial) { const gw = this.$('.sbx-graph'); gw.scrollLeft = gw.scrollWidth; }
    }
    renderTrees() {
      const r = this.repo; const ht = r.headTree(); const conf = r.merging ? r.merging.conflicts : [];
      const W = this.$('.tw .list'), I = this.$('.ti .list'), Hh = this.$('.th .list');
      const wf = Object.keys(r.files).sort();
      W.innerHTML = wf.length ? '' : '<div class="none">(empty)</div>';
      wf.forEach(f => {
        const bh = G.blobHash(r.files[f]); let cls = '';
        if (conf.includes(f)) cls = 'conflict'; else if (r.inited && r.index[f] === undefined) cls = 'untracked'; else if (r.inited && r.index[f] !== bh) cls = 'modified';
        const d = h('div', 'fchip edit ' + cls, `<span class="nm">${esc(f)}</span><span class="bh">${short(bh)}</span>`); d.title = 'Click to edit ' + f;
        d.addEventListener('click', () => this.editor(f)); W.appendChild(d);
      });
      const ix = Object.keys(r.index).sort();
      I.innerHTML = ix.length ? '' : `<div class="none">${r.inited ? '(empty)' : '(no .git)'}</div>`;
      ix.forEach(f => I.appendChild(h('div', 'fchip ' + (r.index[f] !== ht[f] ? 'staged' : ''), `<span class="nm">${esc(f)}</span><span class="bh">${short(r.index[f])}</span>`)));
      const hf = Object.keys(ht).sort();
      Hh.innerHTML = hf.length ? '' : `<div class="none">${r.inited ? '(no commits yet)' : '(no .git)'}</div>`;
      hf.forEach(f => Hh.appendChild(h('div', 'fchip', `<span class="nm">${esc(f)}</span><span class="bh">${short(ht[f])}</span>`)));
      const b = r.branch(); this.$('.th .hl').textContent = r.head() ? (b ? `${b} @ ${short(r.head())}` : `detached @ ${short(r.head())}`) : '';
      if (this.openEditor && !this.el.contains(this.openEditor)) this.openEditor = null;
    }
    editor(f) {
      const col = this.$('.tw'); const ex = col.querySelector('.editor'); if (ex) ex.remove();
      const r = this.repo; const ed = h('div', 'editor');
      ed.innerHTML = `${f === null ? '<input type="text" class="fn" placeholder="new-file.txt" style="font-size:14px;padding:6px 8px;margin-bottom:6px">' : `<div style="font:12px var(--font-mono);color:var(--soft);margin-bottom:4px">editing ${esc(f)}</div>`}<textarea>${esc(f === null ? '' : (r.files[f] || '').replace(/\n$/, ''))}</textarea><div class="row"><button class="btn small sv">Save</button>${f !== null ? '<button class="btn small ghost del">Delete file</button>' : ''}<button class="btn small ghost cc">Cancel</button></div>`;
      col.appendChild(ed); (ed.querySelector('.fn') || ed.querySelector('textarea')).focus({ preventScroll: true });
      ed.querySelector('.cc').addEventListener('click', () => ed.remove());
      ed.querySelector('.sv').addEventListener('click', () => {
        const name = f === null ? (ed.querySelector('.fn').value.trim() || 'new-file.txt').replace(/\s+/g, '-') : f;
        r.files[name] = ed.querySelector('textarea').value.replace(/\n*$/, '') + '\n'; ed.remove();
        this.line(`(edited ${name} in your editor)`, 'dim');
        this.$('.hb').innerHTML = `<div class="lastcmd">✏️ edited ${esc(name)}</div><ol><li>Only your working folder changed. Git hasn't noticed: it never watches files. It compares hashes only when you run a git command.</li><li>Try <b>git status</b> or <b>git diff</b>.</li></ol>`;
        this.render();
      });
      const del = ed.querySelector('.del'); if (del) del.addEventListener('click', () => { delete r.files[f]; ed.remove(); this.line(`(deleted ${f} from the folder)`, 'dim'); this.render(); });
    }
    renderObjs() {
      const r = this.repo; const o = this.$('.objs'); const keys = Object.keys(r.objects);
      const cnt = { blob: 0, tree: 0, commit: 0, tag: 0 }; keys.forEach(k => cnt[r.objects[k].type]++);
      const shown = keys.slice(-36);
      o.innerHTML = `<div class="lbl">.git/objects <span>· ${keys.length} total: ${cnt.blob} blob · ${cnt.tree} tree · ${cnt.commit} commit${cnt.tag ? ' · ' + cnt.tag + ' tag' : ''}</span></div>`;
      if (!keys.length) o.innerHTML += `<div class="idle" style="font-size:12.5px">${r.inited ? '(empty database)' : '(no .git folder)'}</div>`;
      if (keys.length > shown.length) o.appendChild(h('span', 'ochip', `+${keys.length - shown.length} older`));
      shown.forEach(k => {
        const t = r.objects[k].type; const b = h('button', 'ochip ' + t + (this.seenObj.has(k) ? '' : ' new'), short(k));
        b.title = `${t} ${k}${r.hidden.has(k) ? ' (stash)' : ''} · click to open`; b.addEventListener('click', () => this.typeRun('git cat-file -p ' + short(k)));
        o.appendChild(b);
      });
      keys.forEach(k => this.seenObj.add(k));
    }
    renderServer() {
      const s = this.server; const tip = s.refs['refs/heads/main'];
      const list = s.order.filter(x => s.ancestors(tip).has(x)).reverse().slice(0, 4);
      this.$('.server').innerHTML = `<div><div class="sv-h">☁️ origin · github.com/family/recipes</div><ul>${list.map(x => `<li><span>${short(x)}</span> ${esc(s.objects[x].msg.split('\n')[0])} <i style="color:var(--dim)">· ${esc(s.objects[x].author.name)}</i></li>`).join('')}</ul></div><div style="font-size:12.5px;color:var(--soft);max-width:300px">This is the <b>real</b> server state. Compare it with your red <b>origin/main</b> bookmark in the graph: they only agree right after fetch / pull / push.</div>`;
    }
  }
  // lazy-mount sandboxes near the viewport
  const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { sio.unobserve(e.target); try { e.target._sb = new Sandbox(e.target); } catch (err) { console.error(err); e.target.textContent = 'Sandbox failed to load: ' + err.message; } } }), { rootMargin: '600px 0px' });
  $$('.sandbox').forEach(s => sio.observe(s));

  // ---------------- cheat sheet ----------------
  (function cheat() {
    const svg = $('#cheat-svg'); svg.setAttribute('viewBox', '0 0 900 440');
    const cols = [['📁 Working folder', 'your files'], ['🎬 Staging area', '.git/index'], ['💻 Local repo', '.git/objects + refs'], ['☁️ Remote', 'origin (GitHub)']];
    const cx = i => 20 + i * 225 + 92;
    const defs = sv('defs', {}, svg);
    [['a', 'var(--amber)'], ['t', 'var(--teal)'], ['p', 'var(--purple)']].forEach(([id, c]) => { const m = sv('marker', { id: 'ch-' + id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, defs); sv('path', { d: 'M0,0 L10,5 L0,10 z', fill: c }, m); });
    cols.forEach(([t, s], i) => { sv('rect', { x: 20 + i * 225, y: 14, width: 185, height: 416, rx: 14, class: 'lane-box' }, svg); sv('text', { x: cx(i), y: 42, 'text-anchor': 'middle', fill: '#ece8e1', 'font-size': 16, 'font-weight': 700, 'font-family': 'DM Sans' }, svg).textContent = t; sv('text', { x: cx(i), y: 61, 'text-anchor': 'middle', fill: '#6c7486', 'font-size': 12, 'font-family': 'JetBrains Mono' }, svg).textContent = s; });
    const A = [
      [0, 1, 105, 'git add', 'a', 'Hash the file into a blob in .git/objects and point the index at it. Saved now, before any commit.'],
      [1, 2, 105, 'git commit', 'a', 'Turn the index into a tree, wrap it in a commit (tree + parent + author + message), move the branch sticky note.'],
      [2, 3, 105, 'git push', 'p', 'Send the objects the server lacks, then ask it to move its branch. Rejected if that would drop someone else\'s commits.'],
      [3, 2, 160, 'git fetch', 'p', 'Download new objects and move your origin/* bookmarks. Your branches and files don\'t change. Always safe.'],
      [1, 0, 160, 'git restore', 't', 'Copy the index\'s version over your working file, discarding unstaged edits (they were never in Git).'],
      [2, 1, 215, 'git restore --staged / reset', 't', 'Copy HEAD\'s version back into the index (unstage). reset can also move the branch itself, with --soft/--mixed/--hard.'],
      [2, 0, 270, 'git switch / checkout', 't', 'Point HEAD at another branch or commit and rewrite the files that differ. Refuses if it would destroy uncommitted work.'],
      [2, 0, 325, 'git merge / rebase', 't', 'Combine another line of history into yours: a two-parent commit (merge) or replayed commits with new hashes (rebase).'],
      [3, 0, 380, 'git pull', 'p', 'fetch + merge (or --rebase) in one go. This is where your work and teammates\' work meet.'],
      [3, 0, 420, 'git clone', 'p', 'Copy everything: all objects, all history. Sets up origin, origin/main and your own main, then fills your folder.']
    ];
    const col = { a: 'var(--amber)', t: 'var(--teal)', p: 'var(--purple)' };
    A.forEach(([f, t, y, lab, k, why]) => {
      const g = sv('g', { class: 'arr' }, svg);
      const x1 = cx(f) + (t > f ? 40 : -40), x2 = cx(t) + (t > f ? -40 : 40);
      sv('path', { d: `M${x1},${y} L${x2},${y}`, stroke: col[k], 'marker-end': `url(#ch-${k})` }, g);
      const tx = (x1 + x2) / 2; const tw = lab.length * 7.6 + 16;
      sv('rect', { x: tx - tw / 2, y: y - 22, width: tw, height: 18, rx: 6, fill: '#0c0e13' }, g);
      sv('text', { x: tx, y: y - 9, 'text-anchor': 'middle', fill: col[k] }, g).textContent = lab;
      sv('rect', { x: Math.min(x1, x2), y: y - 24, width: Math.abs(x2 - x1), height: 32, fill: 'transparent' }, g);
      const show = () => { $$('.arr', svg).forEach(a => a.classList.toggle('on', a === g)); $('#cheat-msg').innerHTML = `<b style="color:${col[k]}">${esc(lab)}</b>: ${esc(why)}`; };
      g.addEventListener('mouseenter', show); g.addEventListener('click', show);
    });
  })();

  // ---------------- quiz ----------------
  (function quiz() {
    const Q = [
      ['When you commit, what does Git store?', ['A diff of the changed lines', 'A snapshot: a tree of blob hashes', 'Only the filenames', 'A zip of the whole folder'], 1, 'Snapshots. Unchanged files simply reuse existing blobs, so it\'s cheap. Diffs are computed on demand.'],
      ['You run git add. When is the file\'s content first written into .git/objects?', ['At commit time', 'Right now, at add time', 'At push time', 'Never, only diffs are stored'], 1, 'add hashes, compresses and writes the blob immediately. commit only writes the tree and commit objects.'],
      ['What is a branch, physically?', ['A copy of the project folder', 'A small file containing one commit hash', 'A row in a central database', 'A list of diffs'], 1, '41 bytes in .git/refs/heads/. That\'s why branching is instant.'],
      ['Why does rebase give your commits new hashes?', ['Git adds random salt', 'Each commit\'s text includes its parent\'s hash, and the parent changed', 'Rebase renumbers commits', 'It doesn\'t; hashes stay the same'], 1, 'New parent → new commit text → new SHA-1. The chain of trust at work.'],
      ['A bad commit is already on a shared branch. Safest undo?', ['git reset --hard', 'git push --force', 'git revert', 'Delete the branch'], 2, 'revert adds an opposite commit and rewrites nothing, so nobody\'s history breaks.'],
      ['What does git fetch change?', ['Your main branch and your files', 'Only your origin/* bookmarks (plus new objects)', 'The server', 'Nothing at all'], 1, 'fetch is always safe: it never touches your branches or working folder.'],
      ['You hard-reset away 3 commits. Best rescue?', ['They\'re gone forever', 'git reflog, then git reset --hard HEAD@{n}', 'git revert', 'Re-clone from GitHub'], 1, 'The commits still exist as unreachable objects; the reflog remembers where HEAD was.'],
      ['What event in April 2005 pushed Linus to write Git?', ['GitHub went offline', 'BitKeeper\'s free license for kernel developers was withdrawn', 'CVS was discontinued', 'Microsoft bought SVN'], 1, 'After Tridgell\'s reverse-engineering ("telnet… help"), BitMover pulled the free license.']
    ];
    const root = $('#quiz'); let right = 0, answered = 0;
    Q.forEach(([q, opts, ok, why], qi) => {
      const d = h('div', 'q', `<p>${qi + 1}. ${esc(q)}</p><div class="opts"></div><div class="why">${esc(why)}</div>`);
      opts.forEach((o, oi) => { const b = h('button', '', esc(o)); b.addEventListener('click', () => {
        if (d.classList.contains('done')) return; d.classList.add('done'); answered++;
        if (oi === ok) { b.classList.add('right'); right++; } else { b.classList.add('wrong'); $$('button', d)[ok].classList.add('right'); }
        if (answered === Q.length) { $('#quiz-score').textContent = `${right}/${Q.length} ${right === Q.length ? '🏆 Flawless. Linus would grunt approvingly.' : right >= 6 ? '🎉 Solid. You understand the machine.' : '🔁 Scroll back up; the stories will stick on round two.'}`; if (right >= 7) confetti(); }
      }); $('.opts', d).appendChild(b); });
      root.appendChild(d);
    });
  })();

  window.__gitstory = { SCENES, Sandbox };
})();
