/* =====================================================================
   Algebra: the story — playgrounds & animations (vanilla JS)
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'style') e.setAttribute('style', attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const fmt = (v, d) => {
    if (!isFinite(v)) return '—';
    const r = Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0);
    return r.toLocaleString('en-IN', { maximumFractionDigits: d || 0 });
  };
  const nice = v => (Math.abs(v - Math.round(v)) < 1e-9 ? fmt(v, 0) : fmt(v, 2));
  const inr = v => '₹' + fmt(v, 0);
  const X = s => '<span class="vx">' + (s || 'x') + '</span>';
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ---------------- theme ---------------- */
  const tb = $('#themebtn');
  const LIGHT = () => document.documentElement.getAttribute('data-theme') === 'light';
  const paintBtn = () => { tb.textContent = LIGHT() ? '🌙 Dark' : '☀️ Light'; };
  paintBtn();
  tb.addEventListener('click', () => {
    const t = LIGHT() ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('fable-theme', t); } catch (e) { }
    paintBtn(); refreshSkyColors();
  });

  /* ---------------- reveal / twist / flip / cases ---------------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(e => io.observe(e));
  } else $$('.reveal').forEach(e => e.classList.add('in'));
  $$('[data-twist]').forEach(t => t.addEventListener('click', () => t.classList.add('open')));
  $$('.flip').forEach(f => f.addEventListener('click', () => f.classList.toggle('on')));
  $$('.case:not(.pz)').forEach(c => c.addEventListener('click', () => c.classList.add('open')));

  /* ---------------- progress bar ---------------- */
  (function progress() {
    const p = $('#progress'); if (!p) return;
    const fill = $('.fill', p);
    const acts = $$('section.act');
    const labels = ['I', 'II', 'III', 'IV', 'V', '🏁', '★'];
    const dots = acts.map((a, i) => {
      const d = document.createElement('span');
      d.className = 'dot'; d.textContent = labels[i] || '•';
      d.addEventListener('click', () => a.scrollIntoView({ behavior: 'smooth' }));
      p.appendChild(d); return d;
    });
    const place = () => {
      const H = document.documentElement.scrollHeight - innerHeight;
      acts.forEach((a, i) => { dots[i].style.left = clamp(a.offsetTop / (H + innerHeight) * 100, 3, 97) + '%'; });
    };
    const onScroll = () => {
      const H = document.documentElement.scrollHeight - innerHeight;
      fill.style.width = (H > 0 ? scrollY / H * 100 : 0) + '%';
      acts.forEach((a, i) => dots[i].classList.toggle('on', scrollY + innerHeight * 0.5 >= a.offsetTop));
    };
    place(); onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { place(); onScroll(); });
    addEventListener('load', place);
  })();

  /* ---------------- hero sky: drifting symbols ---------------- */
  const sky = $('#sky'); let skyCols = [];
  function refreshSkyColors() { skyCols = [cssVar('--x'), cssVar('--n'), cssVar('--eq'), cssVar('--dim')]; }
  refreshSkyColors();
  (function skyAnim() {
    if (!sky) return;
    const ctx = sky.getContext('2d');
    const glyphs = ['x', 'x', 'x', 'y', '=', '+', '−', 'x²', '√', 'π', '∑', '÷', '%', '₹', '∞', 'log', '2ⁿ', 'a²+b²', '(x+5)²', 'mx+c', '=', 'x'];
    let W, H, items = [], visible = true;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = sky.clientWidth; H = sky.clientHeight;
      sky.width = W * dpr; sky.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H / 26000);
      items = Array.from({ length: n }, () => mk(true));
    };
    const mk = init => ({
      g: pick(glyphs), x: Math.random() * W, y: init ? Math.random() * H : H + 30,
      s: 14 + Math.random() * 30, v: 0.15 + Math.random() * 0.45, r: (Math.random() - .5) * .6,
      dr: (Math.random() - .5) * .003, a: .08 + Math.random() * .22, c: Math.floor(Math.random() * 4)
    });
    const draw = () => {
      if (!visible) return;
      ctx.clearRect(0, 0, W, H);
      for (const it of items) {
        it.y -= it.v; it.r += it.dr;
        if (it.y < -40) Object.assign(it, mk(false));
        ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.r);
        ctx.globalAlpha = it.a * (LIGHT() ? 1.3 : 1);
        ctx.fillStyle = it.g === 'x' ? skyCols[0] : skyCols[it.c];
        ctx.font = (it.g === 'x' ? 'italic 700 ' : '600 ') + it.s + 'px Fraunces, Georgia, serif';
        ctx.fillText(it.g, 0, 0); ctx.restore();
      }
      if (!reduceMotion) requestAnimationFrame(draw);
    };
    resize(); addEventListener('resize', resize);
    if ('IntersectionObserver' in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(sky);
    else requestAnimationFrame(draw);
  })();

  /* ---------------- hero chalkboard: problems solving themselves ---------------- */
  (function board() {
    const box = $('#board-lines'); if (!box) return;
    const bx = s => '<span class="bx">' + s + '</span>', bn = s => '<span class="bn">' + s + '</span>', be = '<span class="be">=</span>';
    const scenes = [
      [['story', '🛺 ₹30 to get in, ₹15 a km. You have ₹150. How far can you go?'],
       ['', bn('15') + bx('x') + ' + ' + bn('30') + ' ' + be + ' ' + bn('150')],
       ['note', '↳ take 30 from both sides'],
       ['', bn('15') + bx('x') + ' ' + be + ' ' + bn('120')],
       ['note', '↳ share both sides into 15 groups'],
       ['', bx('x') + ' ' + be + ' ' + bn('8') + '  <span class="done">→ 8 km ✓</span>']],
      [['story', '🏷️ "20% off!" You paid ₹960. What was the original price?'],
       ['', bx('x') + ' − ' + bn('0.2') + bx('x') + ' ' + be + ' ' + bn('960')],
       ['', bn('0.8') + bx('x') + ' ' + be + ' ' + bn('960')],
       ['note', '↳ divide both sides by 0.8'],
       ['', bx('x') + ' ' + be + ' ' + bn('1,200') + '  <span class="done">→ ₹1,200 ✓</span>']],
      [['story', '🚕 Cab: ₹50 + ₹18/km. 🛵 Scooter: ₹250 + ₹3/km. When does the scooter win?'],
       ['', bn('50') + ' + ' + bn('18') + bx('x') + ' ' + be + ' ' + bn('250') + ' + ' + bn('3') + bx('x')],
       ['note', '↳ remove 3x and 50 from both sides'],
       ['', bn('15') + bx('x') + ' ' + be + ' ' + bn('200')],
       ['', bx('x') + ' ≈ ' + bn('13.3') + '  <span class="done">→ beyond 13.3 km ✓</span>']],
      [['story', '🏠 ₹30 lakh loan at 9% for 20 years. What is the EMI?'],
       ['', bx('E') + ' ' + be + ' P·r·(1+r)ⁿ / ((1+r)ⁿ − 1)'],
       ['note', '↳ r = 0.09 ÷ 12,  n = 240 months'],
       ['', bx('E') + ' ≈ ' + bn('26,992') + '  <span class="done">/ month ✓</span>'],
       ['note', '↳ total interest ≈ ₹34.8 lakh. (Act V explains why.)']]
    ];
    let si = 0;
    const play = () => {
      const sc = scenes[si % scenes.length]; si++;
      box.innerHTML = '';
      sc.forEach((l, i) => {
        const d = document.createElement('div');
        d.className = 'line ' + l[0]; d.innerHTML = l[1]; box.appendChild(d);
        setTimeout(() => d.classList.add('in'), 300 + i * (reduceMotion ? 0 : 950));
      });
      setTimeout(() => {
        $$('.line', box).forEach(d => d.classList.remove('in'));
        setTimeout(play, 600);
      }, 300 + sc.length * 950 + 3200);
    };
    play();
  })();

  /* =====================================================================
     ACT I · Balance scale
     ===================================================================== */
  (function scale() {
    const S = $('#scale-svg'); if (!S) return;
    const eqEl = $('#scale-eq'), ops = $('#scale-ops'), msg = $('#scale-msg');
    const PX = 320, PY = 92, ARM = 215;
    let mode = 1, st, secret, broken = null, solved = false;
    let ang = 0, vel = 0, target = 0, raf = null;

    // static stand
    svg('path', { d: 'M320 92 L300 300 L340 300 Z', style: 'fill:var(--line2)' }, S);
    svg('rect', { x: 250, y: 300, width: 140, height: 12, rx: 6, style: 'fill:var(--line2)' }, S);
    const beam = svg('g', {}, S);
    svg('rect', { x: PX - ARM - 6, y: PY - 5, width: ARM * 2 + 12, height: 10, rx: 5, style: 'fill:var(--eq)' }, beam);
    const needle = svg('path', { d: 'M320 92 L314 60 L326 60 Z', style: 'fill:var(--eq)' }, beam);
    svg('circle', { cx: PX, cy: PY, r: 9, style: 'fill:var(--card);stroke:var(--eq);stroke-width:3' }, S);
    const mkPan = () => {
      const g = svg('g', {}, S);
      svg('path', { d: 'M0 0 L-88 118 M0 0 L88 118', style: 'stroke:var(--dim);stroke-width:1.5;fill:none' }, g);
      svg('path', { d: 'M-98 118 Q0 150 98 118 Z', style: 'fill:var(--card2);stroke:var(--line2);stroke-width:2' }, g);
      svg('circle', { cx: 0, cy: 0, r: 4, style: 'fill:var(--dim)' }, g);
      const items = svg('g', {}, g);
      return { g, items };
    };
    const L = mkPan(), R = mkPan();

    const placePans = () => {
      const a = ang * Math.PI / 180;
      beam.setAttribute('transform', 'rotate(' + ang + ' ' + PX + ' ' + PY + ')');
      L.g.setAttribute('transform', 'translate(' + (PX - ARM * Math.cos(a)) + ' ' + (PY - ARM * Math.sin(a)) + ')');
      R.g.setAttribute('transform', 'translate(' + (PX + ARM * Math.cos(a)) + ' ' + (PY + ARM * Math.sin(a)) + ')');
    };
    const animate = () => {
      if (reduceMotion) { ang = target; placePans(); return; }
      cancelAnimationFrame(raf);
      const step = () => {
        vel += (target - ang) * 0.06; vel *= 0.86; ang += vel;
        placePans();
        if (Math.abs(vel) > 0.01 || Math.abs(target - ang) > 0.02) raf = requestAnimationFrame(step);
        else { ang = target; placePans(); }
      };
      raf = requestAnimationFrame(step);
    };

    const drawItems = (pan, side, pop) => {
      pan.items.innerHTML = '';
      // boxes on the bottom row(s), tiles above
      let y = 112;
      const bw = 30, per = 5;
      for (let i = 0; i < side.x; i++) {
        const row = Math.floor(i / per), col = i % per, inRow = Math.min(per, side.x - row * per);
        const x0 = -inRow * (bw + 4) / 2 + col * (bw + 4);
        const yy = y - bw - row * (bw + 4);
        const g = svg('g', { class: 'item box' + (pop ? ' tile' : '') }, pan.items);
        svg('rect', { x: x0, y: yy, width: bw, height: bw, rx: 6, style: 'fill:var(--x-soft);stroke:var(--x);stroke-width:2.5' }, g);
        svg('text', { x: x0 + bw / 2, y: yy + bw / 2 + 7, 'text-anchor': 'middle', text: solved ? String(secret) : 'x', style: 'fill:var(--x);font:italic 700 20px Fraunces,serif' }, g);
      }
      const boxRows = Math.ceil(side.x / per);
      y = y - boxRows * (bw + 4) - 2;
      const tw = 17, tper = 10;
      for (let i = 0; i < side.n; i++) {
        const row = Math.floor(i / tper), col = i % tper, inRow = Math.min(tper, side.n - row * tper);
        const x0 = -inRow * (tw + 2) / 2 + col * (tw + 2);
        const yy = y - tw - row * (tw + 2);
        const g = svg('g', { class: 'item one' + (pop ? ' tile' : '') }, pan.items);
        if (pop) g.style.animationDelay = (i * 12) + 'ms';
        svg('rect', { x: x0, y: yy, width: tw, height: tw, rx: 3, style: 'fill:var(--n-soft);stroke:var(--n);stroke-width:1.5' }, g);
        svg('text', { x: x0 + tw / 2, y: yy + tw / 2 + 4.5, 'text-anchor': 'middle', text: '1', style: 'fill:var(--n);font:700 11px JetBrains Mono,monospace' }, g);
      }
    };
    const fmtSide = s => {
      const parts = [];
      if (s.x) parts.push((s.x > 1 ? '<span class="vn">' + s.x + '</span>' : '') + X());
      if (s.n || !s.x) parts.push('<span class="vn">' + s.n + '</span>');
      return parts.join(' + ');
    };
    const weight = s => s.x * secret + s.n;
    const render = pop => {
      drawItems(L, st.L, pop); drawItems(R, st.R, pop);
      eqEl.innerHTML = fmtSide(st.L) + ' <span class="veq">' + (weight(st.L) === weight(st.R) ? '=' : '≠') + '</span> ' + fmtSide(st.R);
      target = clamp(-(weight(st.L) - weight(st.R)) * 3, -15, 15);
      animate(); buildOps();
    };
    const fly = (pan, kind, count) => {
      const els = $$('.item.' + kind, pan.items).slice(-count);
      els.forEach((e, i) => { e.style.animationDelay = (i * 15) + 'ms'; e.classList.remove('tile'); e.classList.add('fly'); });
      return els.length;
    };
    const doOp = (fn, flies) => {
      ops.querySelectorAll('button').forEach(b => b.disabled = true);
      flies.forEach(f => fly(f[0], f[1], f[2]));
      setTimeout(() => { fn(); check(); render(false); }, flies.length ? 420 : 0);
    };
    const check = () => {
      if (!broken && st.L.x === 1 && st.L.n === 0 && st.R.x === 0) {
        solved = true;
        msg.className = 'msg good';
        msg.innerHTML = '🎉 The box is alone, and the scale is still level. So ' + X() + ' = ' + st.R.n + '. Two moves did it: <b>Restore</b> and <b>Balance</b>.';
      }
    };
    const btn = (label, cls, fn) => {
      const b = document.createElement('button'); b.className = 'btn small ' + (cls || ''); b.innerHTML = label;
      b.addEventListener('click', fn); ops.appendChild(b); return b;
    };
    const buildOps = () => {
      ops.innerHTML = '';
      const Ls = st.L, Rs = st.R;
      if (broken) {
        btn('🦴 Restore the balance', '', () => doOp(() => {
          st[broken].n += 1; broken = null;
          msg.className = 'msg'; msg.innerHTML = 'Balance restored. (Fun fact: the word "algebra" itself means <i>restoring</i>.) Now change <b>both</b> sides together.';
        }, []));
        return;
      }
      if (solved) { btn('New puzzle →', 'teal', newPuzzle); return; }
      const k = Math.min(Ls.n, Rs.n);
      if (k >= 1) btn('− 1 tile from both', 'ghost', () => doOp(() => { Ls.n--; Rs.n--; say('Same change on both sides: still balanced.'); }, [[L, 'one', 1], [R, 'one', 1]]));
      if (k > 1) btn('− ' + k + ' tiles from both', '', () => doOp(() => { Ls.n -= k; Rs.n -= k; say('Balance move: the same ' + k + ' cancelled from both sides.'); }, [[L, 'one', k], [R, 'one', k]]));
      const kb = Math.min(Ls.x, Rs.x);
      if (kb >= 1) btn('− ' + (kb > 1 ? kb + ' boxes' : '1 box') + ' from both', '', () => doOp(() => { Ls.x -= kb; Rs.x -= kb; say('Boxes on both sides cancel, whatever is inside them.'); }, [[L, 'box', kb], [R, 'box', kb]]));
      if (Ls.x > 1 && Ls.n === 0 && Rs.x === 0) {
        const a = Ls.x;
        btn('÷ Split both sides into ' + a + ' equal groups', '', () => doOp(() => { Rs.n = Rs.n / a; Ls.x = 1; say('Keep one group from each side. Equal shares of equal things are equal.'); }, [[L, 'box', a - 1], [R, 'one', Rs.n - Rs.n / a]]));
      }
      const cheatSide = Ls.n > 0 ? 'L' : (Rs.n > 0 ? 'R' : null);
      if (cheatSide) btn('😈 Cheat: remove 1 tile from ' + (cheatSide === 'L' ? 'left' : 'right') + ' only', 'ghost', () => doOp(() => {
        st[cheatSide].n -= 1; broken = cheatSide;
        msg.className = 'msg bad'; msg.innerHTML = 'The scale tipped. The "=" is now a lie. You changed only one side, so the promise broke.';
      }, [[cheatSide === 'L' ? L : R, 'one', 1]]));
      btn('↺ New puzzle', 'ghost', newPuzzle);
    };
    const say = t => { msg.className = 'msg'; msg.innerHTML = t; };
    function newPuzzle() {
      solved = false; broken = null;
      if (mode === 1) {
        const a = rnd(2, 4); secret = rnd(1, 6); const b = rnd(1, 8);
        st = { L: { x: a, n: b }, R: { x: 0, n: a * secret + b } };
      } else {
        const a = rnd(3, 5), d = rnd(1, 2); secret = rnd(1, 5); const b = rnd(0, 6);
        st = { L: { x: a, n: b }, R: { x: d, n: (a - d) * secret + b } };
      }
      say('Goal: one ' + X() + ' box alone on the left, scale level. What\'s inside?');
      render(true);
    }
    $$('#scale-mode button').forEach(b => b.addEventListener('click', () => {
      $$('#scale-mode button').forEach(x => x.classList.toggle('on', x === b)); mode = +b.dataset.m; newPuzzle();
    }));
    newPuzzle();
  })();

  /* =====================================================================
     generic graph helper
     ===================================================================== */
  function makeGraph(el, o) {
    // o: {W,H,pad:{l,r,t,b}, xmax, ymax, xlab, ylab, xticks, yticks, xfmt, yfmt}
    el.innerHTML = '';
    const p = o.pad;
    const sx = v => p.l + v / o.xmax * (o.W - p.l - p.r);
    const sy = v => o.H - p.b - v / o.ymax * (o.H - p.t - p.b);
    const ix = px => (px - p.l) / (o.W - p.l - p.r) * o.xmax;
    const grid = svg('g', {}, el);
    for (let i = 0; i <= o.xticks; i++) {
      const v = o.xmax * i / o.xticks;
      svg('line', { x1: sx(v), x2: sx(v), y1: sy(0), y2: sy(o.ymax), class: 'gridl' }, grid);
      svg('text', { x: sx(v), y: sy(0) + 16, 'text-anchor': 'middle', class: 'tick', text: (o.xfmt || nice)(v) }, grid);
    }
    for (let i = 0; i <= o.yticks; i++) {
      const v = o.ymax * i / o.yticks;
      svg('line', { x1: sx(0), x2: sx(o.xmax), y1: sy(v), y2: sy(v), class: 'gridl' }, grid);
      svg('text', { x: sx(0) - 6, y: sy(v) + 4, 'text-anchor': 'end', class: 'tick', text: (o.yfmt || nice)(v) }, grid);
    }
    svg('line', { x1: sx(0), x2: sx(o.xmax), y1: sy(0), y2: sy(0), class: 'axis' }, grid);
    svg('line', { x1: sx(0), x2: sx(0), y1: sy(0), y2: sy(o.ymax), class: 'axis' }, grid);
    if (o.xlab) svg('text', { x: sx(o.xmax), y: o.H - 4, 'text-anchor': 'end', class: 'tick', text: o.xlab, style: 'font-weight:700' }, grid);
    if (o.ylab) svg('text', { x: sx(0) + 6, y: p.t - 6, class: 'tick', text: o.ylab, style: 'font-weight:700' }, grid);
    const layer = svg('g', {}, el);
    return { sx, sy, ix, layer };
  }
  const pointerX = (el, e) => {
    const r = el.getBoundingClientRect();
    const vb = el.viewBox.baseVal;
    return (e.clientX - r.left) / r.width * vb.width;
  };

  /* =====================================================================
     ACT II · Break-even
     ===================================================================== */
  (function breakEven() {
    const el = $('#be-svg'); if (!el) return;
    const ids = ['cb', 'cr', 'sb', 'sr', 'km'];
    const I = {}; ids.forEach(k => { I[k] = $('#be-' + k); });
    let guess = null, G, dragging = false;
    const W = 640, H = 330, XM = 40;
    const draw = () => {
      const cb = +I.cb.value, cr = +I.cr.value, sb = +I.sb.value, sr = +I.sr.value, km = +I.km.value;
      $('#be-cbo').textContent = '₹' + cb; $('#be-cro').textContent = '₹' + cr; $('#be-sbo').textContent = '₹' + sb; $('#be-sro').textContent = '₹' + sr; $('#be-kmo').textContent = km + ' km';
      const top = Math.max(cb + cr * XM, sb + sr * XM);
      const ymax = Math.ceil(top / 100) * 100;
      G = makeGraph(el, { W, H, pad: { l: 50, r: 20, t: 22, b: 30 }, xmax: XM, ymax, xticks: 8, yticks: 5, xlab: 'km →', ylab: '₹ cost', yfmt: v => '₹' + fmt(v) });
      const g = G.layer;
      const be = cr !== sr ? (sb - cb) / (cr - sr) : NaN;
      // shaded regions
      if (isFinite(be) && be > 0 && be < XM) {
        svg('rect', { x: G.sx(0), y: G.sy(ymax), width: G.sx(be) - G.sx(0), height: G.sy(0) - G.sy(ymax), style: 'fill:var(--n-soft);opacity:.5' }, g);
        svg('rect', { x: G.sx(be), y: G.sy(ymax), width: G.sx(XM) - G.sx(be), height: G.sy(0) - G.sy(ymax), style: 'fill:rgba(255,155,206,.10)' }, g);
      }
      const line = (b, r, col, lab) => {
        svg('line', { x1: G.sx(0), y1: G.sy(b), x2: G.sx(XM), y2: G.sy(b + r * XM), style: 'stroke:' + col + ';stroke-width:3.5;stroke-linecap:round' }, g);
        svg('text', { x: G.sx(XM) - 4, y: G.sy(b + r * XM) - 8, 'text-anchor': 'end', text: lab, style: 'fill:' + col + ';font:700 13px DM Sans,sans-serif' }, g);
      };
      line(cb, cr, 'var(--n)', '🚕 cab');
      line(sb, sr, 'var(--pink)', '🛵 scooter');
      if (guess !== null && guess >= 0 && guess <= XM) {
        svg('line', { x1: G.sx(guess), x2: G.sx(guess), y1: G.sy(0), y2: G.sy(ymax), style: 'stroke:var(--x);stroke-width:2;stroke-dasharray:3 5' }, g);
        svg('text', { x: G.sx(guess) + 4, y: G.sy(ymax) + 12, text: 'your guess', style: 'fill:var(--x);font:600 11px DM Sans' }, g);
      }
      if (isFinite(be) && be > 0 && be < XM) {
        const c = cb + cr * be;
        const ring = svg('circle', { cx: G.sx(be), cy: G.sy(c), r: 9, style: 'fill:var(--eq);stroke:var(--card);stroke-width:3' }, g);
        if (!reduceMotion) { const a = svg('animate', { attributeName: 'r', values: '8;12;8', dur: '1.6s', repeatCount: 'indefinite' }, ring); }
        const tx = G.sx(be) + (be > 28 ? -10 : 12), anc = be > 28 ? 'end' : 'start';
        svg('text', { x: tx, y: G.sy(c) + 24, 'text-anchor': anc, text: 'break-even ' + fmt(be, 1) + ' km · ' + inr(c), style: 'fill:var(--eq);font:700 13px DM Sans' }, g);
      }
      // trip marker
      const yc = cb + cr * km, ys = sb + sr * km;
      svg('line', { x1: G.sx(km), x2: G.sx(km), y1: G.sy(0), y2: G.sy(ymax), style: 'stroke:var(--soft);stroke-width:1.5;stroke-dasharray:6 4' }, g);
      svg('circle', { cx: G.sx(km), cy: G.sy(yc), r: 6, style: 'fill:var(--n)' }, g);
      svg('circle', { cx: G.sx(km), cy: G.sy(ys), r: 6, style: 'fill:var(--pink)' }, g);
      const handle = svg('rect', { x: G.sx(km) - 14, y: G.sy(0) - 14, width: 28, height: 14, rx: 7, style: 'fill:var(--soft);cursor:ew-resize' }, g);
      svg('text', { x: G.sx(km), y: G.sy(0) - 4, 'text-anchor': 'middle', text: '⇔', style: 'fill:var(--bg);font:700 11px sans-serif;pointer-events:none' }, g);

      // equation + message
      const eq = $('#be-eq');
      if (cr === sr) eq.innerHTML = 'Same ₹/km: the lines are parallel and never cross.';
      else {
        const dr = cr - sr, db = sb - cb;
        eq.innerHTML = cb + ' + ' + cr + X() + ' = ' + sb + ' + ' + sr + X() + '  →  ' + dr + X() + ' = ' + db + '  →  ' + X() + ' = ' + fmt(be, 1) + ' km';
      }
      const m = $('#be-msg');
      const cheaper = yc < ys ? '🚕 cab' : (ys < yc ? '🛵 scooter' : 'either');
      let t = 'For a ' + km + ' km day: cab ' + inr(yc) + ', scooter ' + inr(ys) + '. <b>' + cheaper + '</b> wins' + (yc !== ys ? ' by ' + inr(Math.abs(yc - ys)) : '') + '.';
      if (guess !== null && isFinite(be) && be > 0) {
        const off = Math.abs(guess - be);
        t += '<br>Your gut said ' + guess + ' km; algebra says ' + fmt(be, 1) + ' km. ' + (off < 1.5 ? '🎯 Sharp instinct!' : off < 5 ? 'Close. The equation removes the guesswork.' : 'Gut feelings drift on steady-rate problems. That\'s why we write the equation.');
      }
      m.className = 'msg'; m.innerHTML = t;
    };
    ids.forEach(k => I[k].addEventListener('input', draw));
    $('#be-lock').addEventListener('click', () => {
      const v = parseFloat($('#be-guess').value);
      if (!isNaN(v)) { guess = clamp(v, 0, XM); $('#be-predict').style.opacity = .7; draw(); }
    });
    const setKm = e => { if (!G) return; const v = clamp(Math.round(G.ix(pointerX(el, e)) * 2) / 2, 0, XM); I.km.value = v; draw(); };
    el.addEventListener('pointerdown', e => { dragging = true; el.setPointerCapture(e.pointerId); setKm(e); });
    el.addEventListener('pointermove', e => { if (dragging) setKm(e); });
    el.addEventListener('pointerup', () => { dragging = false; });
    draw();
  })();

  /* =====================================================================
     ACT III · Receipts detective
     ===================================================================== */
  (function receipts() {
    const el = $('#rc-svg'); if (!el) return;
    const keys = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2'];
    const I = {}; keys.forEach(k => I[k] = $('#rc-' + k));
    const orig = { a1: 2, b1: 3, c1: 130, a2: 3, b2: 1, c2: 90 };
    const stepsBox = $('#rc-steps'), msg = $('#rc-msg');
    let steps = [], shown = 0;
    const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
    const T = s => '<span class="t">' + s + '</span>', Sa = s => '<span class="s">' + s + '</span>';
    const co = n => (n === 1 ? '' : n);
    const rec = (a, b, c) => (a ? co(a) + T('t') : '') + (a && b ? ' + ' : '') + (b ? co(b) + Sa('s') : '') + ' = ' + nice(c);
    const solve = () => {
      const v = {}; keys.forEach(k => v[k] = Math.max(0, parseFloat(I[k].value) || 0));
      const { a1, b1, c1, a2, b2, c2 } = v;
      const det = a1 * b2 - a2 * b1;
      steps = []; shown = 0; stepsBox.innerHTML = '';
      $('#rc-step').disabled = false;
      let sol = null;
      if ((a1 === 0 && b1 === 0) || (a2 === 0 && b2 === 0)) {
        msg.className = 'msg bad'; msg.textContent = 'A receipt with nothing on it is not a clue.';
      } else if (det === 0) {
        const same = Math.abs(a1 * c2 - a2 * c1) < 1e-9 && Math.abs(b1 * c2 - b2 * c1) < 1e-9;
        msg.className = 'msg bad';
        msg.innerHTML = same
          ? '📄📄 Same line twice. The second receipt is just a scaled copy of the first: <b>no new information</b>, infinitely many possible prices.'
          : '⛔ Parallel lines: they never cross. <b>No prices can satisfy both receipts</b>. Someone made a billing mistake.';
        $('#rc-step').disabled = true;
      } else {
        const t = (c1 * b2 - c2 * b1) / det, s = (a1 * c2 - a2 * c1) / det;
        sol = { t, s };
        msg.className = 'msg ' + (t < 0 || s < 0 ? 'bad' : '');
        msg.innerHTML = t < 0 || s < 0
          ? 'The lines cross, but at a <b>negative price</b> (' + T('t') + ' = ' + nice(t) + ', ' + Sa('s') + ' = ' + nice(s) + '). Mathematically fine, commercially impossible: check the receipts.'
          : 'The lines cross at one point. Hit "solve step by step" to watch the detective work.';
        // build elimination steps
        steps.push(['Write each receipt as an equation (t = tea price, s = samosa price).', rec(a1, b1, c1) + '<br>' + rec(a2, b2, c2)]);
        if (a1 === 0 || a2 === 0) {
          const [aa, bb, cc, ao, bo, co] = a1 === 0 ? [a1, b1, c1, a2, b2, c2] : [a2, b2, c2, a1, b1, c1];
          steps.push(['One receipt has no tea at all. Lucky! Read the samosa price straight off it.', bb + Sa('s') + ' = ' + nice(cc) + '  →  ' + Sa('s') + ' = ' + nice(s)]);
          steps.push(['Put it into the other receipt.', ao + T('t') + ' + ' + bo + '×' + nice(s) + ' = ' + nice(co) + '  →  ' + ao + T('t') + ' = ' + nice(co - bo * s) + '  →  ' + T('t') + ' = ' + nice(t)]);
        } else {
          const Lc = a1 * a2 / gcd(a1, a2), k1 = Lc / a1, k2 = Lc / a2;
          steps.push(['Make the tea counts match: multiply Monday by ' + k1 + ' and Tuesday by ' + k2 + ' (both sides, always).',
            rec(a1 * k1, b1 * k1, c1 * k1) + '<br>' + rec(a2 * k2, b2 * k2, c2 * k2)]);
          const db = b1 * k1 - b2 * k2, dc = c1 * k1 - c2 * k2;
          steps.push(['Subtract one from the other. Tea cancels out: that\'s the Balance move.', '(' + b1 * k1 + ' − ' + b2 * k2 + ')' + Sa('s') + ' = ' + nice(c1 * k1) + ' − ' + nice(c2 * k2) + '  →  ' + db + Sa('s') + ' = ' + nice(dc)]);
          steps.push(['One unknown left. Share both sides.', Sa('s') + ' = ' + nice(dc) + ' ÷ ' + db + ' = ' + nice(s)]);
          steps.push(['Put the samosa price back into Monday\'s receipt.', a1 + T('t') + ' + ' + b1 + '×' + nice(s) + ' = ' + nice(c1) + '  →  ' + a1 + T('t') + ' = ' + nice(c1 - b1 * s) + '  →  ' + T('t') + ' = ' + nice(t)]);
        }
        steps.push(['Always check against the clue you didn\'t use.', a2 + '×' + nice(t) + ' + ' + b2 + '×' + nice(s) + ' = ' + nice(a2 * t + b2 * s) + ' ✓  ·  ☕ ₹' + nice(t) + ', 🥟 ₹' + nice(s)]);
      }
      drawGraph(v, sol);
    };
    const drawGraph = (v, sol) => {
      const ints = [];
      [[v.a1, v.b1, v.c1], [v.a2, v.b2, v.c2]].forEach(([a, b, c]) => { if (a > 0) ints.push(c / a); if (b > 0) ints.push(c / b); });
      let m = Math.max(10, ...ints.filter(isFinite));
      if (sol && sol.t > 0 && sol.s > 0) m = Math.max(m, sol.t * 1.3, sol.s * 1.3);
      m = Math.min(m, 5000) * 1.05;
      const raw = m / 5, mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(v => v >= raw);
      const nt = Math.ceil(m / step), max = nt * step;
      const G = makeGraph(el, { W: 640, H: 300, pad: { l: 50, r: 20, t: 22, b: 30 }, xmax: max, ymax: max, xticks: nt, yticks: nt, xlab: '☕ tea price →', ylab: '🥟 samosa price', xfmt: v => '₹' + nice(v), yfmt: v => '₹' + nice(v) });
      const g = G.layer;
      const drawLine = (a, b, c, col, lab) => {
        if (a === 0 && b === 0) return;
        let pts;
        if (b === 0) pts = [[c / a, 0], [c / a, max]];
        else pts = [[0, c / b], [max, (c - a * max) / b]];
        const ln = svg('line', { x1: G.sx(pts[0][0]), y1: G.sy(pts[0][1]), x2: G.sx(pts[1][0]), y2: G.sy(pts[1][1]), style: 'stroke:' + col + ';stroke-width:3.5;stroke-linecap:round' }, g);
        if (!reduceMotion) { const len = 1200; ln.style.strokeDasharray = len; ln.style.strokeDashoffset = len; ln.getBoundingClientRect(); ln.style.transition = 'stroke-dashoffset .9s ease'; ln.style.strokeDashoffset = 0; }
        const lx = b === 0 ? c / a : Math.min(max * 0.92, a ? (c - b * max * 0.15) / a : max * 0.9);
        const ly = b === 0 ? max * .9 : (c - a * lx) / b;
        if (lx >= 0 && ly >= 0 && ly <= max) svg('text', { x: G.sx(lx) + 6, y: G.sy(ly) - 6, text: lab, style: 'fill:' + col + ';font:700 12px DM Sans' }, g);
      };
      // clip
      const cp = svg('clipPath', { id: 'rc-clip' }, el);
      svg('rect', { x: G.sx(0), y: G.sy(max), width: G.sx(max) - G.sx(0), height: G.sy(0) - G.sy(max) }, cp);
      g.setAttribute('clip-path', 'url(#rc-clip)');
      drawLine(v.a1, v.b1, v.c1, 'var(--n)', 'Monday');
      drawLine(v.a2, v.b2, v.c2, 'var(--pink)', 'Tuesday');
      if (sol && sol.t >= 0 && sol.s >= 0 && sol.t <= max && sol.s <= max) {
        const c = svg('circle', { cx: G.sx(sol.t), cy: G.sy(sol.s), r: 9, style: 'fill:var(--eq);stroke:var(--card);stroke-width:3' }, g);
        if (!reduceMotion) svg('animate', { attributeName: 'r', values: '8;12;8', dur: '1.6s', repeatCount: 'indefinite' }, c);
        svg('text', { x: G.sx(sol.t) + 14, y: G.sy(sol.s) - 10, text: '☕ ₹' + nice(sol.t) + ', 🥟 ₹' + nice(sol.s), style: 'fill:var(--eq);font:700 13px DM Sans' }, g);
      }
    };
    $('#rc-step').addEventListener('click', () => {
      if (shown >= steps.length) return;
      const s = steps[shown++];
      const d = document.createElement('div'); d.className = 'step';
      d.innerHTML = '<span class="why">' + shown + '. ' + s[0] + '</span>' + s[1];
      stepsBox.appendChild(d);
      if (shown >= steps.length) $('#rc-step').disabled = true;
      $('#rc-step').innerHTML = shown >= steps.length ? '✓ Solved' : '▶ Next step';
    });
    $('#rc-reset').addEventListener('click', () => { keys.forEach(k => I[k].value = orig[k]); $('#rc-step').innerHTML = '▶ Solve step by step'; solve(); });
    keys.forEach(k => I[k].addEventListener('input', () => { $('#rc-step').innerHTML = '▶ Solve step by step'; solve(); }));
    solve();
  })();

  /* =====================================================================
     ACT IV · Completing the square (tweened SVG)
     ===================================================================== */
  (function completeSquare() {
    const S = $('#cs-svg'); if (!S) return;
    const u = 36, O = 30, x = 3 * u, f = 5 * u; // x = 3, half of ten = 5
    const E = {};
    const R = (id, style) => { E[id] = { el: svg('rect', { rx: 3, style }, S), kind: 'r', cur: { x: O, y: O, w: 0, h: 0, o: 0 } }; };
    const Tx = (id, style) => { E[id] = { el: svg('text', { 'text-anchor': 'middle', style }, S), kind: 't', cur: { x: O, y: O, o: 0 } }; };
    R('big', 'fill:none;stroke:var(--eq);stroke-width:3;stroke-dasharray:8 6');
    R('corner', 'fill:var(--eq-soft);stroke:var(--eq);stroke-width:2.5');
    R('A', 'fill:var(--n-soft);stroke:var(--n);stroke-width:2.5');
    R('B', 'fill:var(--n-soft);stroke:var(--n);stroke-width:2.5');
    R('sq', 'fill:var(--x-soft);stroke:var(--x);stroke-width:3');
    const lab = 'font:700 20px JetBrains Mono,monospace;';
    Tx('tsq', lab + 'fill:var(--x)'); Tx('tA', lab + 'fill:var(--n)'); Tx('tB', lab + 'fill:var(--n)'); Tx('tC', lab + 'fill:var(--eq)');
    Tx('sx', 'font:italic 700 16px Fraunces,serif;fill:var(--x)'); Tx('s5', 'font:700 15px JetBrains Mono;fill:var(--n)');
    Tx('sy', 'font:italic 700 16px Fraunces,serif;fill:var(--x)'); Tx('s5b', 'font:700 15px JetBrains Mono;fill:var(--n)');
    Tx('side', 'font:700 16px JetBrains Mono;fill:var(--eq)');
    const hide = { o: 0 };
    const sqR = { x: O, y: O, w: x, h: x, o: 1 };
    const steps = [
      { eq: X() + '² + 10' + X() + ' = 39', msg: 'The room is a square. Its side is the unknown ' + X() + ', so its floor area is ' + X() + '².',
        s: { sq: sqR, tsq: { x: O + x / 2, y: O + x / 2 + 7, o: 1, t: 'x²' }, sx: { x: O + x / 2, y: O - 8, o: 1, t: 'x' }, sy: { x: O - 12, y: O + x / 2 + 5, o: 1, t: 'x' } } },
      { eq: X() + '² + <span class="vn">10' + X() + '</span> = 39', msg: 'The verandah: 10 m long and ' + X() + ' wide (same as the room). Its area is 10' + X() + '.',
        s: { A: { x: O, y: O + x + 40, w: 2 * f, h: x, o: 1 }, tA: { x: O + f, y: O + x + 40 + x / 2 + 7, o: 1, t: '10x' } } },
      { eq: X() + '² + <span class="vn">5' + X() + ' + 5' + X() + '</span> = 39', msg: 'Cut it in half: two strips, each 5 by ' + X() + '.',
        s: { A: { x: O, y: O + x + 40, w: f - 4, h: x, o: 1 }, B: { x: O + f + 4, y: O + x + 40, w: f - 4, h: x, o: 1 }, tA: { x: O + f / 2, y: O + x + 40 + x / 2 + 7, o: 1, t: '5x' }, tB: { x: O + f * 1.5, y: O + x + 40 + x / 2 + 7, o: 1, t: '5x' } } },
      { eq: 'L-shape area = 39', msg: 'Stick one strip on the right of the square and one below it. Same pieces, same total area: still 39.',
        s: { A: { x: O + x, y: O, w: f, h: x, o: 1 }, B: { x: O, y: O + x, w: x, h: f, o: 1 }, tA: { x: O + x + f / 2, y: O + x / 2 + 7, o: 1, t: '5x' }, tB: { x: O + x / 2, y: O + x + f / 2 + 7, o: 1, t: '5x' }, s5: { x: O + x + f / 2, y: O - 8, o: 1, t: '5' }, s5b: { x: O - 12, y: O + x + f / 2 + 5, o: 1, t: '5' } } },
      { eq: 'missing corner = 5 × 5 = <span class="veq">25</span>', msg: 'Look at the bottom-right. The shape <i>wants</i> to be a square, but a 5 by 5 corner is missing.',
        s: { corner: { x: O + x, y: O + x, w: f, h: f, o: .35 }, tC: { x: O + x + f / 2, y: O + x + f / 2 + 7, o: .6, t: '25?' } } },
      { eq: X() + '² + 10' + X() + ' <span class="veq">+ 25</span> = 39 <span class="veq">+ 25</span> = 64', msg: '<b>Restore move</b>: add the missing 25 to <i>both</i> sides. Now the shape is a perfect square of area 64.',
        s: { corner: { x: O + x, y: O + x, w: f, h: f, o: 1 }, tC: { x: O + x + f / 2, y: O + x + f / 2 + 7, o: 1, t: '25' }, big: { x: O - 6, y: O - 6, w: x + f + 12, h: x + f + 12, o: 1 } } },
      { eq: '(' + X() + ' + 5)² = 64  →  ' + X() + ' + 5 = 8  →  ' + X() + ' = <span class="vx">3</span>', msg: 'A square of area 64 has side 8. Its side is ' + X() + ' + 5, so ' + X() + ' = 3. The room is <b>3 m × 3 m</b>. Check: 9 + 30 = 39 ✓. <span style="color:var(--soft)">(Strictly, ' + X() + ' + 5 = −8 also works, giving ' + X() + ' = −13. A room can\'t be negative, so the tiler ignores it.)</span>',
        s: { corner: { x: O + x, y: O + x, w: f, h: f, o: 1 }, tC: { x: O + x + f / 2, y: O + x + f / 2 + 7, o: 1, t: '25' }, big: { x: O - 6, y: O - 6, w: x + f + 12, h: x + f + 12, o: 1 }, side: { x: O + x + f + 28, y: O + (x + f) / 2, o: 1, t: '8' }, sx: { x: O + x / 2, y: O - 8, o: 1, t: 'x=3' } } }
    ];
    // carry forward: each step inherits previous state unless overridden
    const full = []; let acc = {};
    steps.forEach((st, i) => {
      acc = Object.assign({}, acc, st.s);
      if (i === 1) acc.sq = sqR;
      full.push(Object.assign({}, acc));
    });
    let cur = 0, anim = null;
    const apply = (e, v) => {
      if (e.kind === 'r') { e.el.setAttribute('x', v.x); e.el.setAttribute('y', v.y); e.el.setAttribute('width', Math.max(0, v.w)); e.el.setAttribute('height', Math.max(0, v.h)); }
      else { e.el.setAttribute('x', v.x); e.el.setAttribute('y', v.y); }
      e.el.style.opacity = v.o;
    };
    const go = i => {
      cur = clamp(i, 0, steps.length - 1);
      $('#cs-eq').innerHTML = steps[cur].eq; $('#cs-msg').innerHTML = steps[cur].msg;
      $('#cs-prev').disabled = cur === 0; $('#cs-next').disabled = cur === steps.length - 1;
      const tgt = full[cur];
      const from = {}; for (const k in E) from[k] = Object.assign({}, E[k].cur);
      const to = {};
      for (const k in E) {
        const t = tgt[k] ? Object.assign({}, E[k].cur, tgt[k]) : Object.assign({}, E[k].cur, hide);
        if (t.t !== undefined) E[k].el.textContent = t.t;
        to[k] = t;
      }
      const dur = reduceMotion ? 1 : 850, t0 = performance.now();
      cancelAnimationFrame(anim);
      const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const tick = now => {
        const p = clamp((now - t0) / dur, 0, 1), q = ease(p);
        for (const k in E) {
          const a = from[k], b = to[k], v = {};
          ['x', 'y', 'w', 'h', 'o'].forEach(f => { if (a[f] !== undefined) v[f] = a[f] + ((b[f] !== undefined ? b[f] : a[f]) - a[f]) * q; });
          // invisible things should not fly from origin: snap geometry when appearing
          if (a.o === 0 && b.o > 0) { ['x', 'y', 'w', 'h'].forEach(f => { if (b[f] !== undefined) v[f] = b[f]; }); }
          apply(E[k], v); E[k].cur = Object.assign({}, E[k].cur, v);
        }
        if (p < 1) anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
    };
    $('#cs-next').addEventListener('click', () => go(cur + 1));
    $('#cs-prev').addEventListener('click', () => go(cur - 1));
    go(0);
  })();

  /* =====================================================================
     ACT IV · Fence / parabola
     ===================================================================== */
  (function fence() {
    const P = $('#fence-plot'), Gr = $('#fence-graph'), wIn = $('#fence-w'); if (!P) return;
    const F = 40;
    const G = makeGraph(Gr, { W: 300, H: 260, pad: { l: 42, r: 10, t: 22, b: 28 }, xmax: 20, ymax: 220, xticks: 4, yticks: 4, xlab: 'width →', ylab: 'area m²' });
    let d = '';
    for (let w = 0; w <= 20.001; w += 0.25) d += (w ? 'L' : 'M') + G.sx(w).toFixed(1) + ' ' + G.sy(w * (F - 2 * w)).toFixed(1) + ' ';
    svg('path', { d, style: 'fill:none;stroke:var(--x);stroke-width:3' }, G.layer);
    svg('line', { x1: G.sx(10), x2: G.sx(10), y1: G.sy(0), y2: G.sy(200), style: 'stroke:var(--eq);stroke-dasharray:3 4;opacity:.6' }, G.layer);
    const dot = svg('circle', { r: 7, style: 'fill:var(--x);stroke:var(--card);stroke-width:2.5' }, G.layer);
    const dlab = svg('text', { style: 'fill:var(--ink);font:700 12px JetBrains Mono', 'text-anchor': 'middle' }, G.layer);
    // plot side
    const s = 6.5, top = 34;
    svg('rect', { x: 8, y: top - 16, width: 284, height: 16, style: 'fill:#8a6a4f' }, P);
    svg('text', { x: 150, y: top - 4, 'text-anchor': 'middle', text: 'compound wall (free side)', style: 'fill:#f6efe6;font:700 11px DM Sans' }, P);
    const garden = svg('rect', { y: top, style: 'fill:rgba(126,231,135,.16);stroke:var(--x);stroke-width:3;stroke-dasharray:7 4' }, P);
    const veg = svg('text', { 'text-anchor': 'middle', style: 'font-size:18px' }, P);
    const aLab = svg('text', { 'text-anchor': 'middle', style: 'fill:var(--ink);font:700 15px JetBrains Mono' }, P);
    const wLab = svg('text', { 'text-anchor': 'end', style: 'fill:var(--x);font:italic 700 14px Fraunces' }, P);
    const lLab = svg('text', { 'text-anchor': 'middle', style: 'fill:var(--n);font:700 13px JetBrains Mono' }, P);
    let grabbed = false;
    const draw = () => {
      const w = +wIn.value, L = F - 2 * w, A = w * L;
      $('#fence-wo').textContent = w + ' m';
      const gw = L * s, gh = w * s, gx = 150 - gw / 2;
      garden.setAttribute('x', gx); garden.setAttribute('width', gw); garden.setAttribute('height', gh);
      const n = Math.max(1, Math.min(8, Math.floor(gw / 30)));
      veg.textContent = gh > 26 ? ['🥬', '🍅', '🌶️', '🥕', '🥒', '🍆', '🧄', '🌽'].slice(0, n).join('') : '';
      veg.setAttribute('x', 150); veg.setAttribute('y', top + gh / 2 + 6);
      aLab.textContent = 'area ' + fmt(A, 1) + ' m²'; aLab.setAttribute('x', 150); aLab.setAttribute('y', Math.min(252, top + gh + 42));
      wLab.textContent = 'w = ' + w; wLab.setAttribute('x', gx - 6); wLab.setAttribute('y', top + gh / 2 + 5);
      lLab.textContent = (40 - 2 * w) + ' m'; lLab.setAttribute('x', 150); lLab.setAttribute('y', top + gh + 18);
      dot.setAttribute('cx', G.sx(w)); dot.setAttribute('cy', G.sy(A));
      dlab.textContent = fmt(A, 0); dlab.setAttribute('x', G.sx(w)); dlab.setAttribute('y', G.sy(A) - 12);
      $('#fence-eq').innerHTML = 'A = ' + X('w') + ' × (40 − 2' + X('w') + ') = ' + w + ' × ' + L + ' = <b>' + fmt(A, 1) + ' m²</b>';
      const m = $('#fence-msg');
      if (w === 10) { m.className = 'msg good'; m.innerHTML = '🏆 The top of the hill: 10 m × 20 m = 200 m². Notice it\'s <b>not</b> a square: twice as long as wide, because the wall is free fencing.'; }
      else { m.className = 'msg'; m.innerHTML = (w < 10 ? 'Too narrow: a long corridor.' : 'Too deep: the side walls eat your fence.') + ' ' + fmt(200 - A, 1) + ' m² short of the best.'; }
    };
    wIn.addEventListener('input', draw);
    const setW = e => { const v = clamp(Math.round(G.ix(pointerX(Gr, e)) * 2) / 2, 0.5, 19.5); wIn.value = v; draw(); };
    Gr.addEventListener('pointerdown', e => { grabbed = true; Gr.setPointerCapture(e.pointerId); setW(e); });
    Gr.addEventListener('pointermove', e => { if (grabbed) setW(e); });
    Gr.addEventListener('pointerup', () => grabbed = false);
    draw();
  })();

  /* =====================================================================
     ACT V · Rice on the chessboard
     ===================================================================== */
  (function rice() {
    const B = $('#rice-board'); if (!B) return;
    const cells = [];
    for (let i = 0; i < 64; i++) {
      // fill order: a1 → h1, then up the board (bottom row first)
      const d = document.createElement('div');
      cells.push(d); B.appendChild(d);
    }
    const order = []; for (let r = 7; r >= 0; r--) for (let c = 0; c < 8; c++) order.push(r * 8 + c);
    let k = 0, timer = null;
    const GRAIN_KG = 2.5e-5, WORLD_KG = 5.2e11;
    const sup = n => String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
    const describe = kg => {
      if (kg < 0.001) return 'a few grains. The king smiles.';
      if (kg < 0.02) return '≈ ' + fmt(kg * 1000, 1) + ' g: about a spoonful.';
      if (kg < 1) return '≈ ' + fmt(kg * 1000, 0) + ' g: a small bowl.';
      if (kg < 60) return '≈ ' + fmt(kg, 1) + ' kg: a sack you could carry home.';
      if (kg < 1000) return '≈ ' + fmt(kg, 0) + ' kg: a corner shop\'s whole stock.';
      if (kg < 1e5) return '≈ ' + fmt(kg / 1000, 1) + ' tonnes: several truckloads. The treasurers start sweating.';
      if (kg < 1e8) return '≈ ' + fmt(kg / 1000, 0) + ' tonnes: a cargo ship\'s hold.';
      if (kg < 1e11) return '≈ ' + fmt(kg / 1e9, 2) + ' million tonnes: a large country\'s yearly harvest.';
      if (kg < WORLD_KG) return '≈ ' + fmt(kg / 1e9, 0) + ' million tonnes: closing in on the entire world\'s yearly rice harvest.';
      return '≈ ' + fmt(kg / 1e12, 0) + ' billion tonnes: about <b>' + fmt(kg / WORLD_KG, 0) + ' years</b> of the entire world\'s rice harvest.';
    };
    const render = () => {
      order.forEach((idx, i) => {
        const c = cells[idx];
        if (i < k) { c.classList.add('f'); c.style.setProperty('--s', (14 + i / 63 * 80) + '%'); c.title = 'square ' + (i + 1) + ': 2' + sup(i) + ' = ' + (2n ** BigInt(i)).toLocaleString('en-IN') + ' grains'; }
        else { c.classList.remove('f'); c.title = 'square ' + (i + 1); }
      });
      const total = (2n ** BigInt(k)) - 1n;
      $('#rice-count').innerHTML = total.toLocaleString('en-IN') + '<small>grains on the board after ' + k + ' square' + (k === 1 ? '' : 's') + (k > 20 ? ' (≈ ' + (Number(total)).toExponential(2).replace(/e\+(\d+)/, (m, d) => ' × 10' + sup(d)) + ')' : '') + '</small>';
      const kg = Number(total) * GRAIN_KG;
      let say = k === 0 ? 'Tap "+1 square", or tap any square to jump there.' :
        'Square ' + k + ' alone holds 2' + sup(k - 1) + ' = ' + (2n ** BigInt(k - 1)).toLocaleString('en-IN') + ' grains. Whole board: ' + describe(kg);
      if (k >= 8 && k < 64) say += '<br><span style="font-size:14px">Notice: each square holds one grain <i>more</i> than all the squares before it combined.</span>';
      if (k === 64) say += '<br><span style="font-size:14px">Total = 2⁶⁴ − 1. (Assumes ~25 mg a grain and ~520 million tonnes of rice harvested a year.) How many squares to pass one lakh grains? log₂(1,00,000) ≈ 16.6, so square 17. <b>That</b> is what a logarithm counts.</span>';
      $('#rice-say').innerHTML = say;
    };
    const stop = () => { clearInterval(timer); timer = null; };
    $('#rice-next').addEventListener('click', () => { stop(); if (k < 64) { k++; render(); } });
    $('#rice-all').addEventListener('click', () => { stop(); timer = setInterval(() => { if (k >= 64) return stop(); k++; render(); }, reduceMotion ? 1 : 55); });
    $('#rice-reset').addEventListener('click', () => { stop(); k = 0; render(); });
    cells.forEach((c, idx) => c.addEventListener('click', () => { stop(); k = order.indexOf(idx) + 1; render(); }));
    render();
  })();

  /* =====================================================================
     ACT V · EMI x-ray
     ===================================================================== */
  (function emi() {
    const el = $('#emi-svg'); if (!el) return;
    const I = { p: $('#emi-p'), r: $('#emi-r'), n: $('#emi-n'), x: $('#emi-x') };
    const lakh = v => v >= 1e7 ? '₹' + fmt(v / 1e7, 2) + ' Cr' : v >= 1e5 ? '₹' + fmt(v / 1e5, 1) + ' L' : inr(v);
    const sim = (P, r, E, extra) => {
      let B = P, m = 0, totI = 0; const years = [];
      while (B > 0.5 && m < 600) {
        const intr = B * r; let pay = Math.min(E + extra, B + intr);
        const prin = pay - intr; B -= prin; totI += intr;
        const y = Math.floor(m / 12); years[y] = years[y] || { i: 0, p: 0 }; years[y].i += intr; years[y].p += prin; m++;
      }
      return { months: m, totI, years };
    };
    const draw = () => {
      const P = +I.p.value * 1e5, ry = +I.r.value, ny = +I.n.value, extra = +I.x.value;
      $('#emi-po').textContent = I.p.value + ' L'; $('#emi-ro').textContent = ry + '%'; $('#emi-no').textContent = ny + ' y'; $('#emi-xo').textContent = inr(extra);
      const r = ry / 1200, n = ny * 12, q = Math.pow(1 + r, n);
      const E = P * r * q / (q - 1);
      const base = sim(P, r, E, 0), run = sim(P, r, E, extra);
      $('#emi-e').textContent = inr(E);
      $('#emi-i').textContent = lakh(run.totI);
      const yy = Math.floor(run.months / 12), mm = run.months % 12;
      $('#emi-t').textContent = yy + 'y' + (mm ? ' ' + mm + 'm' : '');
      // bars
      el.innerHTML = '';
      const W = 640, H = 240, pl = 50, pr = 10, pt = 14, pb = 26;
      const ymax = (E + extra) * 12 * 1.05;
      const nb = ny; const bw = (W - pl - pr) / nb;
      for (let i = 0; i <= 4; i++) {
        const v = ymax * i / 4, y = H - pb - v / ymax * (H - pt - pb);
        svg('line', { x1: pl, x2: W - pr, y1: y, y2: y, class: 'gridl', style: 'stroke:var(--grid2)' }, el);
        svg('text', { x: pl - 6, y: y + 4, 'text-anchor': 'end', text: v >= 1e5 ? lakh(v) : v === 0 ? '₹0' : '₹' + fmt(v / 1000, 0) + 'k', style: 'fill:var(--dim);font:11px JetBrains Mono' }, el);
      }
      for (let i = 0; i < nb; i++) {
        const yr = run.years[i];
        const x = pl + i * bw + bw * 0.12, w = bw * 0.76;
        if (yr) {
          const hp = yr.p / ymax * (H - pt - pb), hi = yr.i / ymax * (H - pt - pb);
          const y0 = H - pb;
          svg('rect', { x, y: y0 - hp, width: w, height: hp, rx: 2, style: 'fill:var(--eq)' }, el);
          svg('rect', { x, y: y0 - hp - hi, width: w, height: hi, rx: 2, style: 'fill:var(--red);opacity:.85' }, el);
        } else {
          svg('rect', { x, y: H - pb - 3, width: w, height: 3, style: 'fill:var(--line2)' }, el);
        }
        if (nb <= 12 || (i + 1) % 5 === 0 || i === 0) svg('text', { x: x + w / 2, y: H - 8, 'text-anchor': 'middle', text: 'Y' + (i + 1), style: 'fill:var(--dim);font:10px JetBrains Mono' }, el);
      }
      const y1 = run.years[0];
      const share = y1 ? y1.i / (y1.i + y1.p) * 100 : 0;
      let t = 'In year 1, <b>₹' + fmt(share, 0) + ' of every ₹100</b> you pay goes to interest. Over the loan you pay back ' + lakh(P + run.totI) + ' for ' + lakh(P) + ' borrowed.';
      if (extra > 0) {
        const saved = base.totI - run.totI, mo = base.months - run.months;
        t += '<br>Paying ' + inr(extra) + ' extra a month saves <b style="color:var(--green)">' + lakh(saved) + '</b> in interest and finishes <b style="color:var(--green)">' + Math.floor(mo / 12) + 'y ' + (mo % 12) + 'm</b> early.';
      }
      $('#emi-msg').className = 'msg'; $('#emi-msg').innerHTML = t;
    };
    Object.values(I).forEach(i => i.addEventListener('input', draw));
    draw();
  })();

  /* =====================================================================
     PUZZLE POPUP · try first, then reveal step by step
     ===================================================================== */
  const Puzzle = (function () {
    const m = document.createElement('div');
    m.className = 'modal'; m.hidden = true;
    m.innerHTML = '<div class="m-card" role="dialog" aria-modal="true">' +
      '<button class="m-x" aria-label="Close">×</button>' +
      '<div class="m-kicker"></div><h3 class="m-title"></h3><div class="m-problem"></div>' +
      '<div class="m-try"><span>🎯 Your answer first:</span><input type="text" inputmode="decimal" autocomplete="off"><span class="m-unit"></span><button class="btn small m-check">Check</button></div>' +
      '<div class="m-msg"></div><div class="m-steps"></div><div class="m-ans"></div>' +
      '<div class="m-foot"><div class="m-dots"></div><div class="row"><span class="m-hint"></span><button class="btn small ghost m-all">Show all</button><button class="btn small m-next">Show step 1 →</button></div></div>' +
      '</div>';
    document.body.appendChild(m);
    const q = sel => m.querySelector(sel);
    let cur = null, shown = 0, lastFocus = null;
    const close = () => { m.hidden = true; document.body.classList.remove('modal-open'); if (lastFocus) lastFocus.focus(); };
    q('.m-x').addEventListener('click', close);
    m.addEventListener('click', e => { if (e.target === m) close(); });
    document.addEventListener('keydown', e => { if (!m.hidden && e.key === 'Escape') close(); });
    const paint = () => {
      const n = cur.steps.length;
      q('.m-dots').innerHTML = cur.steps.map((_, i) => '<i class="' + (i < shown ? 'on' : '') + '"></i>').join('');
      const nx = q('.m-next');
      if (shown < n) { nx.textContent = 'Show step ' + (shown + 1) + ' →'; nx.disabled = false; q('.m-all').style.display = ''; q('.m-hint').textContent = shown === 0 ? 'Stuck? Reveal one step, then try again.' : ''; }
      else { nx.textContent = '✓ Solved'; nx.disabled = true; q('.m-all').style.display = 'none'; q('.m-hint').textContent = ''; }
    };
    const addStep = i => {
      const st = cur.steps[i];
      const d = document.createElement('div'); d.className = 'm-step';
      d.innerHTML = '<span class="n">' + (i + 1) + '</span><div><div class="why">' + st[1] + '</div>' + (st[0] ? '<span class="eqn">' + st[0] + '</span>' : '') + '</div>';
      q('.m-steps').appendChild(d);
      d.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const revealNext = () => {
      if (shown >= cur.steps.length) return;
      addStep(shown++);
      if (shown === cur.steps.length && cur.answer) { const a = q('.m-ans'); a.innerHTML = '💡 ' + cur.answer; a.classList.add('show'); setTimeout(() => a.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50); }
      paint();
    };
    const revealAll = () => { while (shown < cur.steps.length) revealNext(); };
    q('.m-next').addEventListener('click', revealNext);
    q('.m-all').addEventListener('click', revealAll);
    const check = () => {
      const raw = q('.m-try input').value.replace(/[₹,\s]/g, '').replace(/[^0-9.\-]/g, '');
      if (!raw) return;
      const v = parseFloat(raw), tol = cur.tol !== undefined ? cur.tol : Math.max(0.01, Math.abs(cur.num) * 0.005);
      const msg = q('.m-msg');
      if (Math.abs(v - cur.num) <= tol) { msg.className = 'm-msg good'; msg.textContent = '✓ Correct! Here is the full working, to compare with yours.'; revealAll(); if (cur.onRight) cur.onRight(); }
      else { msg.className = 'm-msg bad'; msg.textContent = '✗ Not quite. ' + (shown < cur.steps.length ? 'Reveal one step for a nudge, then try again.' : 'Compare with the steps below.'); if (cur.onWrong) cur.onWrong(); }
    };
    q('.m-check').addEventListener('click', check);
    q('.m-try input').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    const open = cfg => {
      cur = cfg; shown = 0; lastFocus = document.activeElement;
      q('.m-kicker').textContent = cfg.kicker || 'Puzzle';
      q('.m-title').innerHTML = cfg.title || '';
      q('.m-problem').innerHTML = cfg.problem || '';
      q('.m-problem').style.display = cfg.problem ? '' : 'none';
      const hasNum = cfg.num !== undefined && cfg.num !== null && !isNaN(cfg.num);
      q('.m-try').style.display = hasNum ? '' : 'none';
      q('.m-try input').value = ''; q('.m-unit').textContent = cfg.unit || '';
      q('.m-msg').className = 'm-msg'; q('.m-msg').textContent = '';
      q('.m-steps').innerHTML = ''; q('.m-ans').className = 'm-ans'; q('.m-ans').innerHTML = '';
      paint();
      m.hidden = false; document.body.classList.add('modal-open');
      if (cfg.revealAll) revealAll();
      setTimeout(() => (hasNum && !cfg.revealAll ? q('.m-try input') : q('.m-next')).focus(), 60);
    };
    return { open };
  })();

  // wire every .pz element written in the HTML
  $$('.pz').forEach(el => {
    el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
    const go = () => {
      const steps = $$('ol.psrc li', el).map(li => { const e = $('.e', li); const eq = e ? e.innerHTML : ''; const c = li.cloneNode(true); const ce = $('.e', c); if (ce) ce.remove(); return [eq, c.innerHTML]; });
      const title = $('h4', el) ? $('h4', el).innerHTML : ($('.q', el) ? $('.q', el).innerHTML : '');
      const problem = $('h4', el) && $('p', el) ? $('p', el).innerHTML : '';
      const pans = $('.pans', el);
      Puzzle.open({
        kicker: el.classList.contains('twist') ? '🤔 Puzzle' : '🧩 Everyday unknown', title, problem, steps,
        answer: pans ? pans.innerHTML : '',
        num: el.dataset.answer !== undefined ? parseFloat(el.dataset.answer) : undefined,
        unit: el.dataset.unit || '', tol: el.dataset.tol !== undefined ? parseFloat(el.dataset.tol) : undefined
      });
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* =====================================================================
     FREE PRACTICE · Arena (solutions open as step-by-step popups)
     ===================================================================== */
  (function arena() {
    const root = $('#ar'); if (!root) return;
    const store = (() => { try { return JSON.parse(localStorage.getItem('dml-math-alg') || '{}'); } catch (e) { return {}; } })();
    let best = store.best || 0, solvedN = store.solved || 0, streak = 0, lvl = 0, cur = null, done = false;
    const save = () => { try { localStorage.setItem('dml-math-alg', JSON.stringify({ best, solved: solvedN })); } catch (e) { } };
    const x = X();
    const gens = {
      1: [
        () => { const B = pick([25, 30, 35, 40]), R = pick([12, 14, 15, 16, 18, 20]), K = rnd(4, 15), M = B + R * K;
          return { ctx: '🛺 Auto fare', text: 'The meter starts at ₹' + B + ' and adds ₹' + R + ' per km. You have exactly ₹' + M + '. How many km can you ride?', ans: K, unit: 'km',
            hint: 'Let ' + x + ' = km. The fare is ' + R + x + ' + ' + B + '.',
            steps: [[R + x + ' + ' + B + ' = ' + M, 'Fare = ₹' + R + ' per km × km + ₹' + B + ' to start. Call the km ' + x + '.'], [R + x + ' = ' + (M - B), 'Balance: remove ' + B + ' from both sides.'], [x + ' = ' + (M - B) + ' ÷ ' + R + ' = ' + K, 'Split both sides into ' + R + ' equal groups.']], answer: '<b>' + K + ' km.</b>' }; },
        () => { const p = pick([10, 20, 25, 30, 40]), O = rnd(6, 50) * 100, paid = O * (100 - p) / 100, f = (100 - p) / 100;
          return { ctx: '🏷️ Sale', text: 'After a ' + p + '% discount you paid ₹' + fmt(paid) + '. What was the original price?', ans: O, unit: '₹',
            hint: 'You paid ' + (100 - p) + '% of the original: ' + f + x + '.',
            steps: [[x + ' − ' + (p / 100) + x + ' = ' + paid, 'Call the original price ' + x + '. The discount is ' + p + '% of ' + x + '.'], [f + x + ' = ' + paid, x + ' − ' + (p / 100) + x + ' = ' + f + x + '.'], [x + ' = ' + paid + ' ÷ ' + f + ' = ' + O, 'Divide both sides by ' + f + '.']], answer: '<b>₹' + fmt(O) + '.</b>' }; },
        () => { const n = rnd(3, 6), k = rnd(15, 60) * 10, tip = pick([50, 100, 150]), bill = n * k, paid = k + tip;
          return { ctx: '🍽️ Bill split', text: n + ' friends split a dinner bill equally. You also left a ₹' + tip + ' tip yourself, and paid ₹' + paid + ' in total. What was the bill?', ans: bill, unit: '₹',
            hint: 'Your share is ' + x + '/' + n + '. Add the tip.',
            steps: [[x + '/' + n + ' + ' + tip + ' = ' + paid, 'Call the bill ' + x + '. Your share is ' + x + '/' + n + ', plus your tip.'], [x + '/' + n + ' = ' + k, 'Balance: remove ' + tip + ' from both sides.'], [x + ' = ' + k + ' × ' + n + ' = ' + bill, 'Multiply both sides by ' + n + '.']], answer: '<b>₹' + fmt(bill) + '.</b>' }; }
      ],
      2: [
        () => { const cb = pick([40, 50, 60]), cr = rnd(14, 22), sr = rnd(2, 5), K = rnd(6, 20), sb = cb + (cr - sr) * K;
          return { ctx: '🚕 vs 🛵 Break-even', text: 'Cab: ₹' + cb + ' + ₹' + cr + '/km. Scooter rental: ₹' + sb + ' + ₹' + sr + '/km fuel. At how many km do they cost the same?', ans: K, unit: 'km',
            hint: 'Write both costs as lines and set them equal.',
            steps: [[cb + ' + ' + cr + x + ' = ' + sb + ' + ' + sr + x, 'Break-even means both costs are equal. Call the km ' + x + '.'], [cb + ' + ' + (cr - sr) + x + ' = ' + sb, 'Balance: remove ' + sr + x + ' from both sides.'], [(cr - sr) + x + ' = ' + (sb - cb), 'Remove ' + cb + ' from both sides.'], [x + ' = ' + (sb - cb) + ' ÷ ' + (cr - sr) + ' = ' + K, 'Divide both sides by ' + (cr - sr) + '.']], answer: '<b>' + K + ' km.</b> Longer trips: scooter wins.' }; },
        () => { const V = pick([100, 150, 200, 250]), k = rnd(6, 15), M = V * k;
          return { ctx: '🏋️ Gym', text: 'A gym charges ₹' + fmt(M) + ' a month, or ₹' + V + ' per visit. How many visits a month make both cost the same?', ans: k, unit: 'visits',
            hint: 'Per-visit cost is ' + V + x + '. Set it equal to the monthly fee.',
            steps: [[V + x + ' = ' + M, 'Call the visits ' + x + '. Pay-per-visit costs ' + V + x + '; set it equal to the monthly fee.'], [x + ' = ' + M + ' ÷ ' + V + ' = ' + k, 'Divide both sides by ' + V + '.']], answer: '<b>' + k + ' visits.</b> Go more often and the membership wins.' }; },
        () => { const C = rnd(-10, 45), F = Math.round((1.8 * C + 32) * 10) / 10;
          return { ctx: '🌡️ Temperature', text: 'A weather app shows ' + F + ' °F. What is that in °C? (F = 1.8C + 32)', ans: C, tol: 0.15, unit: '°C',
            hint: 'Put F = ' + F + ' and solve for C.',
            steps: [[F + ' = 1.8' + X('C') + ' + 32', 'Put F = ' + F + ' into the formula.'], [fmt(F - 32, 1) + ' = 1.8' + X('C'), 'Remove 32 from both sides.'], [X('C') + ' = ' + fmt(F - 32, 1) + ' ÷ 1.8 = ' + C, 'Divide both sides by 1.8.']], answer: '<b>' + C + ' °C.</b>' }; }
      ],
      3: [
        () => { const items = pick([['tea', 'samosa'], ['coffee', 'vada'], ['juice', 'sandwich'], ['ice cream', 'brownie']]);
          let a1, b1, a2, b2; do { a1 = rnd(1, 4); b1 = rnd(1, 4); a2 = rnd(1, 4); b2 = rnd(1, 4); } while (a1 * b2 - a2 * b1 === 0);
          const t = rnd(2, 8) * 5, s2 = rnd(3, 10) * 5, c1 = a1 * t + b1 * s2, c2 = a2 * t + b2 * s2, askT = Math.random() < .5;
          const db = b1 * a2 - b2 * a1, dc = c1 * a2 - c2 * a1;
          return { ctx: '🧾 Two receipts', text: 'Receipt 1: ' + a1 + ' ' + items[0] + ' + ' + b1 + ' ' + items[1] + ' = ₹' + c1 + '. Receipt 2: ' + a2 + ' ' + items[0] + ' + ' + b2 + ' ' + items[1] + ' = ₹' + c2 + '. What is the price of one ' + (askT ? items[0] : items[1]) + '?', ans: askT ? t : s2, unit: '₹',
            hint: 'Scale the receipts so one item has the same count in both, then subtract.',
            steps: [[a1 + 't + ' + b1 + 's = ' + c1 + '   |   ' + a2 + 't + ' + b2 + 's = ' + c2, 'Each receipt is an equation (t = ' + items[0] + ', s = ' + items[1] + ').'],
              [(a1 * a2) + 't + ' + (b1 * a2) + 's = ' + (c1 * a2) + '   |   ' + (a1 * a2) + 't + ' + (b2 * a1) + 's = ' + (c2 * a1), 'Multiply receipt 1 by ' + a2 + ' and receipt 2 by ' + a1 + ', so both have ' + (a1 * a2) + ' ' + items[0] + '.'],
              [db + 's = ' + dc, 'Subtract receipt 2 from receipt 1: the ' + items[0] + ' cancels.'],
              ['s = ' + dc + ' ÷ ' + db + ' = ' + s2, 'Divide.'],
              [a1 + 't + ' + b1 + ' × ' + s2 + ' = ' + c1 + '  →  t = ' + t, 'Put s back into receipt 1.']],
            answer: items[0] + ' ₹' + t + ', ' + items[1] + ' ₹' + s2 + '. You were asked for the <b>' + (askT ? items[0] : items[1]) + ': ₹' + (askT ? t : s2) + '</b>.' }; },
        () => { const a = rnd(3, 15), b = rnd(3, 15), N = a + b, T = 10 * a + 20 * b;
          return { ctx: '💵 Notes', text: 'Your wallet has ' + N + ' notes, all ₹10s and ₹20s, worth ₹' + T + ' in total. How many ₹20 notes?', ans: b, unit: 'notes',
            hint: 'Two unknowns: tens (a) and twenties (b). a + b = ' + N + ' and 10a + 20b = ' + T + '.',
            steps: [['a + b = ' + N + '   |   10a + 20b = ' + T, 'Two unknowns, two clues: a = ₹10 notes, b = ₹20 notes.'], ['10a + 10b = ' + (10 * N), 'Multiply the first clue by 10, so both have 10a.'], ['10b = ' + T + ' − ' + (10 * N) + ' = ' + (T - 10 * N), 'Subtract it from the second clue: a cancels.'], ['b = ' + b, 'Divide by 10. (And a = ' + N + ' − ' + b + ' = ' + a + '.)']], answer: '<b>' + b + ' twenties</b> and ' + a + ' tens.' }; }
      ],
      4: [
        () => { const F = pick([20, 24, 32, 40, 48, 60, 80]), askArea = Math.random() < .5;
          return { ctx: '🌱 Garden fence', text: 'You have ' + F + ' m of fencing for a rectangular garden against a wall (fence only 3 sides). ' + (askArea ? 'What is the biggest area you can enclose?' : 'What width (the two sides touching the wall) gives the biggest area?'), ans: askArea ? F * F / 8 : F / 4, unit: askArea ? 'm²' : 'm',
            hint: 'Area = w(' + F + ' − 2w). The peak of a parabola sits halfway between its two zeros.',
            steps: [['A = ' + X('w') + '(' + F + ' − 2' + X('w') + ')', 'Two widths and one length use the fence: length = ' + F + ' − 2w.'], ['zeros: ' + X('w') + ' = 0 and ' + X('w') + ' = ' + (F / 2), 'Area is zero with no width, or when the two widths use all the fence.'], [X('w') + ' = ' + (F / 4), 'A parabola peaks exactly halfway between its zeros.'], ['A = ' + (F / 4) + ' × ' + (F / 2) + ' = ' + (F * F / 8), 'Length = ' + F + ' − 2 × ' + (F / 4) + ' = ' + (F / 2) + '.']],
            answer: 'Best width <b>' + (F / 4) + ' m</b>, area <b>' + (F * F / 8) + ' m²</b>.' }; },
        () => { const d = pick([0.5, 1, 2]), P0 = pick([60, 80, 100, 120]), p = rnd(4, 20), S0 = d * (P0 + 2 * p);
          return { ctx: '🍱 Best price', text: 'At ₹' + P0 + ' a tiffin you sell ' + S0 + ' a day. Every ₹1 increase loses ' + d + ' customer' + (d === 1 ? '' : 's') + '. What price earns the most?', ans: P0 + p, unit: '₹',
            hint: 'Raise by p: revenue = (' + P0 + ' + p)(' + S0 + ' − ' + d + 'p). Find where the parabola peaks.',
            steps: [['R = (' + P0 + ' + ' + X('p') + ')(' + S0 + ' − ' + d + X('p') + ')', 'Raise the price by p. Revenue = price × sales.'], ['zeros: ' + X('p') + ' = −' + P0 + ' and ' + X('p') + ' = ' + nice(S0 / d), 'Revenue is zero if tiffins are free, or if nobody buys.'], [X('p') + ' = (−' + P0 + ' + ' + nice(S0 / d) + ') ÷ 2 = ' + p, 'The peak is halfway between the zeros.'], ['price = ₹' + (P0 + p) + ', sales = ' + nice(S0 - d * p), 'Revenue ₹' + fmt((P0 + p) * (S0 - d * p)) + ' a day.']],
            answer: '<b>₹' + (P0 + p) + '.</b>' }; },
        () => { const w = rnd(4, 15), dd = rnd(2, 8), A = w * (w + dd), h = dd / 2;
          return { ctx: '📐 Plot size', text: 'A rectangular plot is ' + dd + ' m longer than it is wide, and its area is ' + A + ' m². How wide is it?', ans: w, unit: 'm',
            hint: X('w') + '(' + X('w') + ' + ' + dd + ') = ' + A + '. Complete the square: add (' + dd + '/2)² to both sides.',
            steps: [[X('w') + '(' + X('w') + ' + ' + dd + ') = ' + A, 'Width w, length w + ' + dd + '.'], [X('w') + '² + ' + dd + X('w') + ' = ' + A, 'Expand: a square plus ' + dd + ' "roots".'], [X('w') + '² + ' + dd + X('w') + ' + ' + nice(h * h) + ' = ' + nice(A + h * h), 'Restore: add the missing corner, (' + dd + '/2)² = ' + nice(h * h) + ', to both sides.'], ['(' + X('w') + ' + ' + nice(h) + ')² = ' + nice(A + h * h), 'The left side is now a perfect square.'], [X('w') + ' + ' + nice(h) + ' = ' + nice(w + h) + '  →  ' + X('w') + ' = ' + w, 'Square root, then remove ' + nice(h) + ' from both sides.']],
            answer: '<b>' + w + ' m</b> wide (and ' + (w + dd) + ' m long).' }; }
      ],
      5: [
        () => { const r = pick([4, 6, 8, 9, 12]), exact = Math.log(2) / Math.log(1 + r / 100), q1 = '1.' + String(r).padStart(2, '0');
          return { ctx: '⏳ Doubling', text: 'Money grows at ' + r + '% a year, compounded. Roughly how many years until it doubles?', ans: exact, tol: Math.max(0.7, exact * 0.06), unit: 'years',
            hint: 'Rule of 72, or exactly: log 2 ÷ log(1 + r).',
            steps: [['(' + q1 + ')<sup>' + X('n') + '</sup> = 2', 'Doubling: start × (1 + r)ⁿ = 2 × start.'], [X('n') + ' = log 2 ÷ log ' + q1 + ' ≈ ' + fmt(exact, 1), 'The unknown is in the exponent: take logarithms.'], ['72 ÷ ' + r + ' = ' + fmt(72 / r, 1), 'Quick check with the rule of 72.']],
            answer: '<b>≈ ' + fmt(exact, 1) + ' years.</b>' }; },
        () => { const target = pick([1000, 10000, 100000, 1000000]), n = Math.ceil(Math.log2(target));
          return { ctx: '📲 Going viral', text: 'A meme starts with 1 share and the shares double every hour. After how many hours does it first pass ' + target.toLocaleString('en-IN') + ' shares?', ans: n, unit: 'hours',
            hint: 'You need 2ⁿ ≥ ' + target.toLocaleString('en-IN') + '. A logarithm counts the doublings.',
            steps: [['2<sup>' + X('n') + '</sup> ≥ ' + target.toLocaleString('en-IN'), 'After n hours there are 2ⁿ shares.'], [X('n') + ' ≥ log₂ ' + target.toLocaleString('en-IN') + ' ≈ ' + fmt(Math.log2(target), 2), 'A logarithm counts how many doublings you need.'], [X('n') + ' = ' + n + '  (2<sup>' + n + '</sup> = ' + (2 ** n).toLocaleString('en-IN') + ')', 'Round up to whole hours.']],
            answer: '<b>' + n + ' hours.</b>' }; },
        () => { const P = pick([2, 5, 10, 15, 20]) * 1e5, ry = pick([8, 8.5, 9, 10, 11, 12]), ny = pick([3, 5, 7, 10, 15]);
          const r = ry / 1200, n = ny * 12, q = Math.pow(1 + r, n), E = P * r * q / (q - 1);
          return { ctx: '🏦 EMI', text: 'A ₹' + fmt(P / 1e5) + ' lakh loan at ' + ry + '% a year for ' + ny + ' years. What is the monthly EMI? (Within 1% is fine.)', ans: E, tol: E * 0.01, unit: '₹',
            hint: 'E = P·r·(1+r)ⁿ / ((1+r)ⁿ − 1) with r = ' + ry + '/1200 and n = ' + n + '.',
            steps: [['r = ' + ry + ' ÷ 1200 = ' + fmt(r, 6) + ',  n = ' + n, 'Monthly rate and number of months.'], ['(1 + r)ⁿ = ' + fmt(q, 4), 'Grow factor over the whole loan.'], [X('E') + ' = P·r·(1+r)ⁿ / ((1+r)ⁿ − 1)', 'The EMI formula from Act V.'], [X('E') + ' = ' + fmt(P) + ' × ' + fmt(r, 6) + ' × ' + fmt(q, 4) + ' ÷ ' + fmt(q - 1, 4) + ' ≈ ' + inr(E), 'Plug in.']],
            answer: '<b>≈ ' + inr(E) + ' a month.</b>' }; }
      ]
    };
    const showHint = on => $('#ar-hintbox').classList.toggle('show', on);
    const next = () => {
      const L = lvl || rnd(1, 5);
      cur = pick(gens[L])(); cur.L = L; done = false;
      $('#ar-ctx').textContent = 'Level ' + L + ' · ' + cur.ctx;
      $('#ar-text').innerHTML = cur.text;
      $('#ar-unit').textContent = cur.unit;
      $('#ar-in').value = ''; $('#ar-msg').innerHTML = ''; $('#ar-msg').className = 'msg';
      $('#ar-hintbox').innerHTML = '💡 ' + cur.hint; showHint(false);
    };
    const paint = () => { $('#ar-streak').textContent = streak; $('#ar-best').textContent = best; $('#ar-solved').textContent = solvedN; };
    const openSol = () => Puzzle.open({ kicker: 'Level ' + cur.L + ' · ' + cur.ctx, title: 'Step-by-step solution', problem: cur.text, steps: cur.steps, answer: cur.answer });
    const check = () => {
      const raw = $('#ar-in').value.replace(/[₹,\s]/g, '').replace(/[^0-9.\-]/g, '');
      if (!raw) return;
      const v = parseFloat(raw), tol = cur.tol !== undefined ? cur.tol : 0.01;
      const m = $('#ar-msg');
      if (Math.abs(v - cur.ans) <= tol) {
        if (!done) { streak++; solvedN++; best = Math.max(best, streak); save(); }
        done = true;
        m.className = 'msg good'; m.innerHTML = pick(['✓ Exactly.', '✓ Nailed it.', '✓ The balance holds.', '✓ Balanced and solved.', '✓ Clean.']) + ' <a href="#" id="ar-cmp">Compare with the step-by-step →</a>';
        $('#ar-cmp').addEventListener('click', e => { e.preventDefault(); openSol(); });
      } else {
        streak = 0;
        m.className = 'msg bad'; m.innerHTML = 'Not quite. Try writing the equation first' + (cur.L >= 5 ? ' (approximations are fine here).' : '.');
      }
      paint();
    };
    $('#ar-check').addEventListener('click', check);
    $('#ar-in').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    $('#ar-hint').addEventListener('click', () => showHint(true));
    $('#ar-show').addEventListener('click', () => { if (!done) { streak = 0; paint(); } done = true; openSol(); });
    $('#ar-new').addEventListener('click', next);
    $$('#ar-lvl button').forEach(b => b.addEventListener('click', () => {
      $$('#ar-lvl button').forEach(y => y.classList.toggle('on', y === b)); lvl = +b.dataset.l; next();
    }));
    paint(); next();
  })();

  /* =====================================================================
     THE QUEST · five option-based playgrounds
     ===================================================================== */
  (function quest() {
    const mapEl = $('#qmap'), stage = $('#stage'), cert = $('#cert'); if (!mapEl || !stage) return;
    const KEY = 'dml-math-quest';
    let best = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })();
    const saveBest = () => { try { localStorage.setItem(KEY, JSON.stringify(best)); } catch (e) { } };
    const M = s => '<span class="mono">' + s + '</span>';
    const uniq = (arr, correct) => { const seen = new Set([String(correct)]); return arr.filter(v => { const k = String(v); if (seen.has(k) || !isFinite(v) || v <= 0) return false; seen.add(k); return true; }); };

    /* ---- mini balance (station 1) ---- */
    const miniBalance = () => {
      const w = document.createElement('div');
      w.innerHTML = '<div class="big-eq qeq"></div>' +
        '<svg viewBox="0 0 320 130" style="width:100%;max-width:420px;display:block;margin:0 auto">' +
        '<path d="M160 30 L148 118 L172 118 Z" style="fill:var(--line2)"/><rect x="120" y="116" width="80" height="8" rx="4" style="fill:var(--line2)"/>' +
        '<g class="qbeam" style="transition:transform .7s cubic-bezier(.34,1.56,.64,1);transform-box:view-box;transform-origin:160px 30px">' +
        '<rect x="34" y="27" width="252" height="6" rx="3" style="fill:var(--eq)"/>' +
        '<path d="M40 30 L14 84 M40 30 L66 84 M280 30 L254 84 M280 30 L306 84" style="stroke:var(--dim);stroke-width:1.2"/>' +
        '<path d="M8 84 Q40 98 72 84 Z M248 84 Q280 98 312 84 Z" style="fill:var(--card2);stroke:var(--line2);stroke-width:1.5"/>' +
        '<text class="ql" x="40" y="78" text-anchor="middle" style="fill:var(--x);font:700 15px JetBrains Mono,monospace"></text>' +
        '<text class="qr" x="280" y="78" text-anchor="middle" style="fill:var(--n);font:700 15px JetBrains Mono,monospace"></text>' +
        '</g><circle cx="160" cy="30" r="6" style="fill:var(--card);stroke:var(--eq);stroke-width:2.5"/></svg>';
      const api = {
        el: w,
        set: (l, r) => { $('.ql', w).textContent = l; $('.qr', w).textContent = r; $('.qeq', w).innerHTML = l.replace(/x/g, X()) + ' <span class="veq">=</span> ' + r; },
        tilt: dir => { const b = $('.qbeam', w); b.style.transform = 'rotate(' + (dir * 13) + 'deg)'; $('.qeq', w).querySelector('.veq').textContent = '≠'; setTimeout(() => { b.style.transform = 'rotate(0deg)'; const e = $('.qeq', w).querySelector('.veq'); if (e) e.textContent = '='; }, 1300); }
      };
      return api;
    };
    /* ---- tiny line chart (stations 2, 5) ---- */
    const chart = (W, H, xmax, ymax, opts) => {
      const o = Object.assign({ pad: { l: 54, r: 12, t: 14, b: 24 }, xt: 5, yt: 4, xlab: '', yfmt: v => '₹' + fmt(v), mini: false }, opts || {});
      if (!o.mini) { const raw = ymax / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), stp = [1, 2, 2.5, 5, 10].map(f => f * mag).find(v => v >= raw); o.yt = Math.ceil(ymax / stp); ymax = o.yt * stp; }
      const el = document.createElementNS(NS, 'svg'); el.setAttribute('viewBox', '0 0 ' + W + ' ' + H); el.classList.add('graph');
      const sx = v => o.pad.l + v / xmax * (W - o.pad.l - o.pad.r), sy = v => H - o.pad.b - v / ymax * (H - o.pad.t - o.pad.b);
      if (!o.mini) {
        for (let i = 0; i <= o.xt; i++) { const v = xmax * i / o.xt; svg('line', { x1: sx(v), x2: sx(v), y1: sy(0), y2: sy(ymax), class: 'gridl' }, el); svg('text', { x: sx(v), y: H - 6, 'text-anchor': 'middle', class: 'tick', text: nice(Math.round(v * 10) / 10) }, el); }
        for (let i = 0; i <= o.yt; i++) { const v = ymax * i / o.yt; svg('line', { x1: sx(0), x2: sx(xmax), y1: sy(v), y2: sy(v), class: 'gridl' }, el); svg('text', { x: sx(0) - 5, y: sy(v) + 4, 'text-anchor': 'end', class: 'tick', text: o.yfmt(v) }, el); }
        if (o.xlab) svg('text', { x: sx(xmax) - 4, y: sy(0) - 6, 'text-anchor': 'end', class: 'tick', text: o.xlab, style: 'font-weight:700' }, el);
      }
      svg('line', { x1: sx(0), x2: sx(xmax), y1: sy(0), y2: sy(0), class: 'axis' }, el);
      svg('line', { x1: sx(0), x2: sx(0), y1: sy(0), y2: sy(ymax), class: 'axis' }, el);
      const lineF = (f, col, lab, w) => {
        let d = ''; for (let i = 0; i <= 60; i++) { const v = xmax * i / 60; d += (i ? 'L' : 'M') + sx(v).toFixed(1) + ' ' + sy(Math.min(f(v), ymax * 1.2)).toFixed(1); }
        const pth = svg('path', { d, style: 'fill:none;stroke:' + col + ';stroke-width:' + (w || 3) + ';stroke-linecap:round' }, el);
        if (!reduceMotion) { const len = 2000; pth.style.strokeDasharray = len; pth.style.strokeDashoffset = len; pth.getBoundingClientRect(); pth.style.transition = 'stroke-dashoffset 1s ease'; pth.style.strokeDashoffset = 0; }
        if (lab) svg('text', { x: sx(xmax) - 4, y: sy(Math.min(f(xmax), ymax)) - 8, 'text-anchor': 'end', text: lab, style: 'fill:' + col + ';font:700 12px DM Sans' }, el);
      };
      const dot = (xv, yv, txt) => {
        const c = svg('circle', { cx: sx(xv), cy: sy(yv), r: 8, style: 'fill:var(--eq);stroke:var(--card);stroke-width:3' }, el);
        if (!reduceMotion) svg('animate', { attributeName: 'r', values: '7;11;7', dur: '1.6s', repeatCount: 'indefinite' }, c);
        if (txt) svg('text', { x: sx(xv) + (xv > xmax * .7 ? -12 : 12), y: sy(yv) + 22, 'text-anchor': xv > xmax * .7 ? 'end' : 'start', text: txt, style: 'fill:var(--eq);font:700 13px DM Sans' }, el);
      };
      return { el, lineF, dot };
    };

    /* ================= STATIONS ================= */
    const stations = [
      { id: 's1', icon: '⚖️', title: 'Next Move', lvl: 1, make() {
        const a = rnd(3, 6), xv = rnd(3, 9), b = rnd(4, 12), c = a * xv + b;
        const ctx = pick([{ one: 'plate of idli', many: 'plates of idli', extra: 'filter coffee' }, { one: 'notebook', many: 'notebooks', extra: 'pen' }, { one: 'packet of milk', many: 'packets of milk', extra: 'loaf of bread' }, { one: 'mango', many: 'mangoes', extra: 'carry bag' }]);
        const bal = miniBalance();
        return {
          story: 'Kavya buys <b>' + a + ' ' + ctx.many + '</b> and a ' + ctx.extra + ' for <b>₹' + b + '</b>. The bill is <b>₹' + c + '</b>. What does one ' + ctx.one + ' cost?',
          init: v => { v.appendChild(bal.el); bal.set('?', String(c)); },
          steps: [
            { q: 'Which equation matches the story? (x = price of one ' + ctx.one + ')', options: [
              { h: M(a + 'x + ' + b + ' = ' + c), ok: true, why: 'Yes: ' + a + ' items at x each, plus ₹' + b + ' for the ' + ctx.extra + ', make ₹' + c + '.', after: () => bal.set(a + 'x + ' + b, String(c)) },
              { h: M('x + ' + b + ' = ' + c), ok: false, why: 'That\'s only one ' + ctx.one + '. Kavya bought ' + a + '.' },
              { h: M(a + '(x + ' + b + ') = ' + c), ok: false, why: 'That adds a ' + ctx.extra + ' to every single ' + ctx.one + '. She bought just one.' },
              { h: M(a + 'x = ' + c + ' + ' + b), ok: false, why: 'The ₹' + b + ' is part of the ₹' + c + ' bill, not added on top of it.' }] },
            { q: 'Now ' + M(a + 'x + ' + b + ' = ' + c) + '. What\'s your first move?', options: [
              { h: 'Subtract ' + b + ' from both sides', ok: true, why: 'Balance move: both pans lose ' + b + '. Now ' + a + 'x = ' + (c - b) + '.', after: () => bal.set(a + 'x', String(c - b)) },
              { h: 'Subtract ' + b + ' from the left side only', ok: false, why: 'Watch the scale tip! Changing only one side breaks the "=" promise.', onPick: () => bal.tilt(1) },
              { h: 'Divide both sides by ' + a, ok: 'warn', why: 'Legal (you changed both sides), but you get x + ' + b + '/' + a + ' = ' + c + '/' + a + ': messy fractions. Legal isn\'t always smart. Try a cleaner move.' },
              { h: 'Subtract ' + a + ' from both sides', ok: false, why: a + 'x − ' + a + ' is not x. You can\'t take loose rupees away from x-boxes: they\'re different things.' }] },
            { q: 'Now ' + M(a + 'x = ' + (c - b)) + '. Next move?', options: [
              { h: 'Divide both sides by ' + a, ok: true, why: 'Split each pan into ' + a + ' equal groups and keep one: x = ' + xv + '.', after: () => bal.set('x', String(xv)) },
              { h: 'Subtract ' + a + ' from both sides', ok: false, why: 'Same trap: ' + a + 'x − ' + a + ' isn\'t x. Multiplied things need dividing.' },
              { h: 'Divide only the left side by ' + a, ok: false, why: 'Tipped again! Whatever you do to one side, do to the other.', onPick: () => bal.tilt(-1) },
              { h: 'Multiply both sides by ' + a, ok: 'warn', why: 'Legal, but now it\'s ' + (a * a) + 'x = ' + ((c - b) * a) + ': further from x alone, not closer.' }] },
            { q: 'Always check. Which line proves x = ' + xv + ' is right?', options: [
              { h: M(a + ' × ' + xv + ' + ' + b + ' = ' + c), ok: true, why: 'Back in the story: ' + a + ' × ₹' + xv + ' + ₹' + b + ' = ₹' + c + '. The bill matches.' },
              { h: M(xv + ' + ' + b + ' = ' + (xv + b)), ok: false, why: 'That checks one ' + ctx.one + ' only, and ₹' + (xv + b) + ' isn\'t the bill.' },
              { h: M(a + ' × ' + xv + ' = ' + (a * xv)), ok: false, why: 'Forgot the ' + ctx.extra + ': ₹' + (a * xv) + ' ≠ ₹' + c + '.' }] }
          ],
          end: 'One ' + ctx.one + ' costs <b>₹' + xv + '</b>. Two moves did it: Balance (remove ' + b + ') and split (÷ ' + a + ').'
        };
      } },

      { id: 's2', icon: '📈', title: 'Line Detective', lvl: 2, make() {
        const C = pick([
          { A: '🚕 Cab', B: '🛵 Scooter rental', u: 'km', one: 'km', g: () => { const cb = pick([40, 50, 60, 80]), cr = rnd(12, 20), sr = rnd(2, 5), K = rnd(8, 18); return { cb, cr, sr, K, sb: cb + (cr - sr) * K }; } },
          { A: '🖨️ Corner shop', B: '🏢 Copy centre', u: 'pages', one: 'page', g: () => { const cb = pick([0, 10, 20]), cr = pick([3, 4, 5]), sr = pick([1, 2]), K = rnd(4, 12) * 5; return { cb, cr, sr, K, sb: cb + (cr - sr) * K }; } },
          { A: '🏊 Pay-per-swim', B: '🎫 Pool membership', u: 'swims', one: 'swim', g: () => { const cb = 0, cr = pick([80, 100, 120, 150]), sr = pick([10, 20, 30]), K = rnd(6, 14); return { cb, cr, sr, K, sb: cb + (cr - sr) * K }; } }
        ]);
        const { cb, cr, sr, K, sb } = C.g();
        const XM = Math.ceil(K * 2 / 5) * 5, YM = Math.ceil(Math.max(cb + cr * XM, sb + sr * XM) / 50) * 50;
        let G;
        const mini = (b, r) => { const c = chart(160, 104, XM, YM, { mini: true, pad: { l: 8, r: 8, t: 8, b: 8 } }); c.lineF(v => b + r * v, 'var(--n)', '', 3); return c.el.outerHTML; };
        return {
          story: 'Kavya\'s friend compares two options. <b>' + C.A + '</b>: ₹' + cb + ' + ₹' + cr + ' per ' + C.one + '. <b>' + C.B + '</b>: ₹' + sb + ' + ₹' + sr + ' per ' + C.one + '. Help her find the break-even, step by step.',
          init: v => { G = chart(640, 250, XM, YM, { xlab: C.u + ' →' }); v.appendChild(G.el); },
          steps: [
            { q: 'Which graph shows <b>' + C.A + '</b> (₹' + cb + ' + ₹' + cr + ' per ' + C.one + ')?', layout: 'graphs', options: [
              { h: mini(cb, cr), ok: true, why: 'Right: it starts at ₹' + cb + ' (the base fee) and climbs ₹' + cr + ' for every ' + C.one + '.', after: () => G.lineF(v => cb + cr * v, 'var(--n)', C.A) },
              { h: mini(cb + (cb ? 0 : 60), Math.max(1, Math.round(cr / 4))), ok: false, why: 'Too gentle a slope: that climbs far less than ₹' + cr + ' per ' + C.one + '.' },
              { h: mini(sb, sr), ok: false, why: 'Big start, gentle climb: that\'s the shape of ' + C.B + ', not ' + C.A + '.' },
              { h: mini(cb + YM * 0.25, cr), ok: false, why: 'Right slope, but it starts too high. ' + C.A + '\'s base fee is only ₹' + cb + '.' }] },
            { q: 'Which equation describes <b>' + C.B + '</b>? (y = cost, x = ' + C.u + ')', options: [
              { h: M('y = ' + sr + 'x + ' + sb), ok: true, why: 'Rate × x plus the one-time base fee.', after: () => G.lineF(v => sb + sr * v, 'var(--pink)', C.B) },
              { h: M('y = ' + sb + 'x + ' + sr), ok: false, why: 'That charges ₹' + sb + ' for every single ' + C.one + '!' },
              { h: M('y = ' + (sb + sr) + 'x'), ok: false, why: 'The base fee is paid once, not for every ' + C.one + '.' }] },
            { q: 'At the break-even point, the two costs are…', options: [
              { h: 'Equal: ' + M(cb + ' + ' + cr + 'x = ' + sb + ' + ' + sr + 'x'), ok: true, why: 'Break-even = the x where both lines are at the same height.' },
              { h: 'Added: ' + M(cb + ' + ' + cr + 'x + ' + sb + ' + ' + sr + 'x = 0'), ok: false, why: 'Adding the bills tells you the total, not where they match.' },
              { h: 'Rates only: ' + M(cr + 'x = ' + sr + 'x'), ok: false, why: 'Ignoring the base fees, they\'d only be equal at x = 0.' }] },
            { q: 'Solve ' + M(cb + ' + ' + cr + 'x = ' + sb + ' + ' + sr + 'x') + '. Which is the correct next line?', options: [
              { h: M((cr - sr) + 'x = ' + (sb - cb)), ok: true, why: 'Remove ' + sr + 'x and ' + cb + ' from both sides.' },
              { h: M((cr + sr) + 'x = ' + (sb + cb)), ok: false, why: 'The Balance move <i>subtracts</i> from both sides; this added.' },
              { h: M((cr - sr) + 'x = ' + (sb + cb)), ok: false, why: 'Removing ' + cb + ' from the right side gives ' + sb + ' − ' + cb + ', not ' + sb + ' + ' + cb + '.' }] },
            { q: 'So the break-even is at…', options: [K].concat(uniq([K + 3, Math.round((sb + cb) / (cr - sr)), Math.round(sb / cr), K * 2, K - 2], K).slice(0, 3)).map((v, i) => ({ h: v + ' ' + C.u, ok: i === 0, why: i === 0 ? (sb - cb) + ' ÷ ' + (cr - sr) + ' = ' + K + '. The lines cross right there.' : 'Recalculate: ' + (sb - cb) + ' ÷ ' + (cr - sr) + '.', after: i === 0 ? () => G.dot(K, cb + cr * K, 'break-even ' + K + ' ' + C.u) : null })) }
          ],
          end: 'Break-even at <b>' + K + ' ' + C.u + '</b>. Fewer than that: ' + C.A + ' wins. More: ' + C.B + ' wins.'
        };
      } },

      { id: 's3', icon: '🧾', title: 'Receipt Detective', lvl: 3, make() {
        const IT = pick([[['☕', 'tea'], ['🥟', 'samosa']], [['🍵', 'coffee'], ['🍩', 'vada']], [['🥤', 'juice'], ['🥪', 'sandwich']], [['🍦', 'ice cream'], ['🍫', 'brownie']]]);
        const e0 = IT[0][0], e1 = IT[1][0], n0 = IT[0][1], n1 = IT[1][1];
        let a1, b1, a2, b2; do { a1 = rnd(1, 4); b1 = rnd(1, 4); a2 = rnd(1, 4); b2 = rnd(1, 4); } while (a1 === a2 || a1 * b2 - a2 * b1 === 0);
        const t = rnd(2, 8) * 5, s = rnd(3, 10) * 5, c1 = a1 * t + b1 * s, c2 = a2 * t + b2 * s;
        let db = b1 * a2 - b2 * a1, dc = c1 * a2 - c2 * a1, order = 'receipt 2 from receipt 1';
        if (db < 0) { db = -db; dc = -dc; order = 'receipt 1 from receipt 2'; }
        let vis;
        const rc = (h, a, b, c, k) => '<div class="receipt"><h5>' + h + (k ? ' <span class="mult">× ' + k + '</span>' : '') + '</h5><div class="it"><span>' + e0 + ' ' + n0 + '</span><b>' + (a * (k || 1)) + '</b></div><div class="it"><span>' + e1 + ' ' + n1 + '</span><b>' + (b * (k || 1)) + '</b></div><div class="it tot"><span>TOTAL</span><b>₹' + (c * (k || 1)) + '</b></div></div>';
        const draw = (k1, k2) => { vis.innerHTML = '<div class="mini-receipts">' + rc('RECEIPT 1', a1, b1, c1, k1) + rc('RECEIPT 2', a2, b2, c2, k2) + '</div>'; };
        const multOpts = [{ h: '× ' + a2 + ' and × ' + a1, ok: true, why: 'Now both receipts have ' + (a1 * a2) + ' ' + e0 + '. Ready to cancel.', after: () => draw(a2, a1) },
          { h: '× ' + a1 + ' and × ' + a2, ok: false, why: 'That gives ' + (a1 * a1) + ' and ' + (a2 * a2) + ' ' + e0 + ': still different. Cross over: multiply each receipt by the <i>other</i> receipt\'s count.' },
          { h: '× 2 and × 2', ok: false, why: 'Doubling both keeps the ' + n0 + ' counts different (' + (2 * a1) + ' vs ' + (2 * a2) + ').' }];
        if (!(b2 === a2 && b1 === a1) && b1 !== b2) multOpts.push({ h: '× ' + b2 + ' and × ' + b1, ok: 'warn', why: 'That would match the ' + e1 + ' instead: a perfectly legal route! But this time, let\'s cancel the ' + e0 + '.' });
        const sOpts = [s].concat(uniq([dc, s + 5, s * 2, s - 5], s).slice(0, 3));
        const tOpts = [t].concat(uniq([Math.round(c1 / a1), Math.round((c1 - s) / a1), t + 5, t * 2], t).slice(0, 3));
        const cOpts = [c2].concat(uniq([c2 + 5, c2 - 10, c2 + 15, c1], c2).slice(0, 3));
        return {
          story: 'The price board is gone again. Two receipts: <b>' + a1 + ' ' + e0 + ' + ' + b1 + ' ' + e1 + ' = ₹' + c1 + '</b> and <b>' + a2 + ' ' + e0 + ' + ' + b2 + ' ' + e1 + ' = ₹' + c2 + '</b>. You\'re the detective.',
          init: v => { vis = v; draw(); },
          steps: [
            { q: 'To cancel the ' + e0 + ' ' + n0 + ', multiply receipt 1 by … and receipt 2 by …', options: multOpts },
            { q: 'Subtract ' + order + '. What\'s left?', options: [
              { h: M(db + ' ' + e1 + ' = ₹' + dc), ok: true, why: 'The ' + e0 + ' cancel out completely. One unknown left!' },
              { h: M((b1 * a2 + b2 * a1) + ' ' + e1 + ' = ₹' + (c1 * a2 + c2 * a1)), ok: false, why: 'That\'s <i>adding</i> the receipts. Adding doubles the ' + e0 + ' instead of cancelling them.' },
              { h: M(db + ' ' + e1 + ' = ₹' + (c1 * a2 + c2 * a1)), ok: false, why: 'You subtracted the items but added the totals. Whatever you do to one side, do to the other.' }] },
            { q: 'So one ' + e1 + ' ' + n1 + ' costs…', options: sOpts.map((v, i) => ({ h: '₹' + v, ok: i === 0, why: i === 0 ? '₹' + dc + ' ÷ ' + db + ' = ₹' + s + '.' : (v === dc ? 'That\'s the price of ' + db + ' of them together. Divide by ' + db + '.' : 'Check: ₹' + dc + ' ÷ ' + db + '.') })) },
            { q: 'Put ₹' + s + ' back into receipt 1. One ' + e0 + ' ' + n0 + ' costs…', options: tOpts.map((v, i) => ({ h: '₹' + v, ok: i === 0, why: i === 0 ? a1 + ' ' + e0 + ' = ₹' + c1 + ' − ' + b1 + ' × ₹' + s + ' = ₹' + (c1 - b1 * s) + ', so one is ₹' + t + '.' : 'Remember receipt 1 has ' + b1 + ' ' + e1 + ' (₹' + (b1 * s) + ') to remove before dividing by ' + a1 + '.' })) },
            { q: 'Final check with receipt 2: ' + a2 + ' × ₹' + t + ' + ' + b2 + ' × ₹' + s + ' = ?', options: cOpts.map((v, i) => ({ h: '₹' + v, ok: i === 0, why: i === 0 ? 'Matches receipt 2 exactly. Case closed. 🕵️' : 'Recalculate: ' + (a2 * t) + ' + ' + (b2 * s) + '.' })) }
          ],
          end: e0 + ' ₹' + t + ', ' + e1 + ' ₹' + s + '. Two clues, two unknowns: <b>scale, subtract, solve, substitute, check.</b>'
        };
      } },

      { id: 's4', icon: '🔍', title: 'Spot the Slip', lvl: 4, make() {
        const d = rnd(2, 6), xv = rnd(2, 8), b = 2 * d, c = xv * xv + b * xv, err = pick(['A', 'B', 'C']);
        const sq = v => Math.sqrt(v);
        const good = ['x² + ' + b + 'x = ' + c, 'x² + ' + b + 'x + ' + (d * d) + ' = ' + c + ' + ' + (d * d), '(x + ' + d + ')² = ' + (c + d * d), 'x + ' + d + ' = ' + (xv + d), 'x = ' + xv];
        let lines, wi, fixOpts, bugX;
        if (err === 'A') {
          bugX = fmt(sq(c) - d, 2); wi = 1;
          lines = [good[0], 'x² + ' + b + 'x + ' + (d * d) + ' = ' + c, '(x + ' + d + ')² = ' + c, 'x + ' + d + ' ≈ ' + fmt(sq(c), 2), 'x ≈ ' + bugX];
          fixOpts = [{ h: M(good[1]), ok: true, why: 'The corner ' + (d * d) + ' must be added to <b>both</b> sides.' }, { h: M('x² + ' + b + 'x + ' + (b * b) + ' = ' + c + ' + ' + (b * b)), ok: false, why: 'The missing corner is (half of ' + b + ')² = ' + (d * d) + ', not ' + b + '² = ' + (b * b) + '.' }, { h: M('x² + ' + b + 'x + ' + d + ' = ' + c + ' + ' + d), ok: false, why: 'Square the half: (' + b + '/2)² = ' + (d * d) + ', not ' + d + '.' }];
        } else if (err === 'B') {
          bugX = fmt(sq(c + b * b) - b, 2); wi = 1;
          lines = [good[0], 'x² + ' + b + 'x + ' + (b * b) + ' = ' + c + ' + ' + (b * b), '(x + ' + b + ')² = ' + (c + b * b), 'x + ' + b + ' ≈ ' + fmt(sq(c + b * b), 2), 'x ≈ ' + bugX];
          fixOpts = [{ h: M(good[1]), ok: true, why: 'The two strips are each ' + d + ' wide, so the missing corner is ' + d + ' × ' + d + ' = ' + (d * d) + '.' }, { h: M('x² + ' + b + 'x + ' + (b * b) + ' = ' + c), ok: false, why: 'Still the wrong corner, and now only one side changed too.' }, { h: M('x² + ' + b + 'x + ' + b + ' = ' + c + ' + ' + b), ok: false, why: 'The corner is (half of ' + b + ')², i.e. ' + (d * d) + '.' }];
        } else {
          bugX = String(xv + 2 * d); wi = 4;
          lines = good.slice(0, 4).concat(['x = ' + (xv + 2 * d)]);
          fixOpts = [{ h: M('x = ' + (xv + d) + ' − ' + d + ' = ' + xv), ok: true, why: 'Remove ' + d + ' from both sides of x + ' + d + ' = ' + (xv + d) + '.' }, { h: M('x = ' + (xv + d) + ' + ' + d + ' = ' + (xv + 2 * d)), ok: false, why: 'That\'s the original slip: it added ' + d + ' instead of removing it.' }, { h: M('x = ' + (xv + d) + ' ÷ ' + d), ok: false, why: 'The ' + d + ' was <i>added</i> to x, so you subtract it. Dividing undoes multiplying, not adding.' }];
        }
        let vis;
        const F = 4 * rnd(5, 15);
        const xOpts = [{ h: xv + ' m', ok: true, why: 'Check: ' + xv + '² + ' + b + ' × ' + xv + ' = ' + (xv * xv) + ' + ' + (b * xv) + ' = ' + c + ' ✓' },
          { h: bugX + ' m', ok: false, why: 'That\'s the cousin\'s buggy answer. It doesn\'t check out.' },
          { h: '−' + (xv + 2 * d) + ' m', ok: 'warn', why: 'That\'s the negative root (x + ' + d + ' = −' + (xv + d) + '): valid algebra, impossible room. Pick the real length.' }];
        return {
          story: 'Kavya\'s cousin solved a tiler\'s puzzle for another house: a square room plus a verandah <b>' + b + ' m</b> long (as wide as the room), <b>' + c + ' m²</b> of tiles in all. But the answer doesn\'t check out. Find the slip.',
          init: v => { vis = v; v.innerHTML = '<div style="font-size:14px;color:var(--soft)">The cousin\'s working is in the options below. Read it top to bottom.</div>'; },
          steps: [
            { q: 'Tap the <b>first</b> wrong line.', layout: 'list', keepOrder: true, options: lines.map((l, i) => ({ h: '<span style="color:var(--dim);font:600 12px var(--font-mono)">line ' + (i + 1) + '</span>&nbsp;&nbsp;' + M(l), ok: i === wi, why: i === wi ? 'Found it! ' + (err === 'C' ? 'The last step added ' + d + ' instead of removing it.' : 'The missing-corner step went wrong.') : (i < wi ? 'This line is fine: it follows correctly from the one above.' : 'This line follows the earlier slip, but it isn\'t the <i>first</i> wrong one. Look higher.') })) },
            { q: 'What should line ' + (wi + 1) + ' be?', options: fixOpts.map(o => Object.assign(o, o.ok === true ? { after: () => { vis.innerHTML = '<div style="font-size:13px;color:var(--eq);font-weight:700;margin-bottom:4px">✓ FIXED WORKING</div>' + good.map(g => '<div class="work">' + g.replace(/x/g, X()) + '</div>').join(''); } } : {})) },
            { q: 'So the room\'s side x is…', options: xOpts },
            { q: 'Bonus round: Dad has <b>' + F + ' m</b> of fence and a free wall. Which width gives the biggest garden?', options: [
              { h: (F / 4) + ' m', ok: true, why: 'Halfway between the zeros (0 and ' + (F / 2) + '): w = ' + (F / 4) + ', area ' + (F * F / 8) + ' m².' },
              { h: nice(F / 3) + ' m', ok: false, why: 'Three equal sides wastes the free wall. Area would be only ' + nice(F / 3 * F / 3) + ' m².' },
              { h: (F / 2) + ' m', ok: false, why: 'Then the two widths use the entire fence and the length is zero: no garden!' }] }
          ],
          end: 'Slip found and fixed: the room is <b>' + xv + ' m</b>. Spotting errors is a superpower: it\'s how you catch a wrong bill, a wrong EMI, or a wrong spreadsheet.'
        };
      } },

      { id: 's5', icon: '🌱', title: 'Grow or Owe', lvl: 5, make() {
        const r = pick([6, 8, 9, 12]), exact = Math.log(2) / Math.log(1 + r / 100);
        let k, rr, Y, A, B; do { k = pick([8000, 10000, 12000, 15000]); rr = pick([6, 8, 10]); Y = pick([10, 15, 20, 25]); A = 1e5 + k * Y; B = 1e5 * Math.pow(1 + rr / 100, Y); } while (Math.abs(A - B) / Math.max(A, B) < 0.05);
        const P = pick([20, 30, 40]) * 1e5, ry = pick([8.5, 9, 10]), mr = ry / 1200, n = 240, qq = Math.pow(1 + mr, n), E = P * mr * qq / (qq - 1), bonus = 2e5;
        const intr = at => { let bal = P, I = 0; for (let m = 0; m < 600 && bal > 0.5; m++) { if (m === at) bal -= bonus; if (bal <= 0) break; const i = bal * mr; I += i; bal -= Math.min(E, bal + i) - i; } return I; };
        const base = intr(-1), s2 = base - intr(12), s15 = base - intr(168);
        const pp = rnd(8, 12), people = 2 ** pp;
        const lakh = v => '₹' + fmt(v / 1e5, v >= 1e6 ? 1 : 2) + ' L';
        let vis;
        return {
          story: 'Last station. Kavya now reads every money decision as growth: <i>is it adding, or multiplying?</i> Four quick calls, each with real rupees at stake.',
          init: v => { vis = v; },
          steps: [
            { kind: 'slider', q: '₹1 lakh grows at <b>' + r + '%</b> a year, compounded. Slide to your guess: how many years until it doubles?', min: 1, max: 30, step: 0.5, start: 15, unit: 'yrs', answer: exact, tol: Math.max(1, exact * 0.15),
              explain: v => 'Rule of 72: 72 ÷ ' + r + ' = ' + fmt(72 / r, 1) + ' years. Exact: log 2 ÷ log ' + (1 + r / 100) + ' ≈ ' + fmt(exact, 1) + '. You guessed ' + v + '.',
              after: () => { vis.innerHTML = ''; const g = chart(640, 220, 30, Math.pow(1 + r / 100, 30) * 1e5 * 1.05, { xlab: 'years →', yfmt: v => lakh(v) }); vis.appendChild(g.el); g.lineF(t => 1e5 * Math.pow(1 + r / 100, t), 'var(--x)', r + '% a year'); g.dot(exact, 2e5, 'doubles ≈ ' + fmt(exact, 1) + ' yrs'); } },
            { q: 'Starting with ₹1 lakh, which is bigger after <b>' + Y + ' years</b>?', options: [
              { h: '<b>A:</b> add ₹' + fmt(k) + ' every year', ok: A > B, why: 'A = ' + lakh(A) + ', B = ' + lakh(B) + '. ' + (A > B ? 'Surprise! Over this time a big fixed addition beats compounding. Exponential growth starts slow; it wins only given enough time.' : 'Compounding wins: it grows on its own growth.'), after: () => drawAB() },
              { h: '<b>B:</b> grow ' + rr + '% a year', ok: B > A, why: 'A = ' + lakh(A) + ', B = ' + lakh(B) + '. ' + (B > A ? 'Compounding wins: it grows on its own growth.' : 'Not this time! Over ' + Y + ' years, the fixed ₹' + fmt(k) + ' a year stays ahead.'), after: () => drawAB() },
              { h: 'About the same', ok: false, why: 'Work it out: A = 1 L + ' + Y + ' × ₹' + fmt(k) + ' = ' + lakh(A) + '. B = 1 L × ' + (1 + rr / 100) + '<sup>' + Y + '</sup> = ' + lakh(B) + '.' }] },
            { q: 'A ₹' + (P / 1e5) + ' lakh home loan at ' + ry + '% for 20 years. Kavya gets a <b>₹2 lakh bonus</b>. Prepay it in year 2, or in year 15?', options: [
              { h: 'Year 2', ok: true, why: 'Prepaying in year 2 saves ≈ <b>' + lakh(s2) + '</b> in interest; in year 15, only ≈ ' + lakh(s15) + '. Early rupees stop interest for many more months.' },
              { h: 'Year 15', ok: false, why: 'By year 15 most of the interest is already paid. Year 15 saves only ≈ ' + lakh(s15) + ' vs ≈ ' + lakh(s2) + ' in year 2.' },
              { h: 'It doesn\'t matter', ok: false, why: 'Timing matters a lot with compounding: ≈ ' + lakh(s2) + ' saved in year 2 vs ≈ ' + lakh(s15) + ' in year 15.' }] },
            { q: 'A rumour doubles every hour, starting from 1 person. After how many hours do ' + people.toLocaleString('en-IN') + ' people know?', options: [
              { h: pp + ' hours', ok: true, why: '2<sup>' + pp + '</sup> = ' + people.toLocaleString('en-IN') + ', so log₂ = ' + pp + '. The logarithm counts the doublings.' },
              { h: (people / 2).toLocaleString('en-IN') + ' hours', ok: false, why: 'That\'s how many people knew one hour earlier, not a number of hours.' },
              { h: (pp + 1) + ' hours', ok: false, why: 'One hour too many: that would be 2<sup>' + (pp + 1) + '</sup> = ' + (people * 2).toLocaleString('en-IN') + ' people.' },
              { h: (pp * 2) + ' hours', ok: false, why: 'Doubling isn\'t "2 per hour". Count the doublings: log₂ ' + people.toLocaleString('en-IN') + ' = ' + pp + '.' }] }
          ],
          end: 'You can now read money like a mathematician: <b>adding or multiplying? early or late? how many doublings?</b>'
        };
        function drawAB() { vis.innerHTML = ''; const top = Math.max(A, B) * 1.08; const g = chart(640, 220, Y, top, { xlab: 'years →', yfmt: v => lakh(v) }); vis.appendChild(g.el); g.lineF(t => 1e5 + k * t, 'var(--n)', 'A: +₹' + fmt(k) + '/yr'); g.lineF(t => 1e5 * Math.pow(1 + rr / 100, t), 'var(--x)', 'B: ' + rr + '%/yr'); }
      } }
    ];

    const starStr = n => '<span class="y">' + '★'.repeat(n) + '</span>' + '☆'.repeat(3 - n);
    let active = 0;
    const renderMap = () => {
      mapEl.innerHTML = stations.map((st, i) => '<button class="qnode' + (i === active ? ' on' : '') + '" data-i="' + i + '"><div class="ic">' + st.icon + '</div><div class="lv">LEVEL ' + st.lvl + '</div><b>' + st.title + '</b><div class="stars">' + starStr(best[st.id] || 0) + '</div></button>').join('');
      $$('.qnode', mapEl).forEach(b => b.addEventListener('click', () => { play(+b.dataset.i); stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }));
      const total = stations.reduce((a, st) => a + (best[st.id] || 0), 0), all = stations.every(st => best[st.id]);
      if (all) { cert.classList.add('show'); cert.innerHTML = '<div style="font-size:46px">🎓</div><h3 style="margin:6px 0">Kavya\'s month: complete</h3><p style="margin:0">All five stations cleared, <b>' + total + ' / 15 ⭐</b>. ' + (total === 15 ? 'A perfect run. Algebra is yours.' : 'Replay any station with fresh numbers to chase the missing stars.') + '</p>'; }
    };
    function play(i) {
      active = i; renderMap();
      const S = stations[i], P = S.make(), N = P.steps.length;
      let k = 0, slips = 0;
      stage.innerHTML = '<div class="stage-top"><h3>' + S.icon + ' ' + S.title + ' <span class="level" style="font:700 11px var(--font-mono);color:var(--eq);border:1px solid var(--eq);border-radius:999px;padding:1px 8px;vertical-align:4px">LEVEL ' + S.lvl + '</span></h3><div class="sdots">' + P.steps.map(() => '<i></i>').join('') + '</div></div>' +
        '<div class="story">' + P.story + '</div><div class="vis"></div><div class="qq"></div><div class="opts"></div><div class="fb"></div><div class="row next"></div>';
      const vis = $('.vis', stage), qq = $('.qq', stage), opts = $('.opts', stage), fb = $('.fb', stage), nx = $('.next', stage);
      if (P.init) P.init(vis);
      const dots = () => $$('.sdots i', stage).forEach((d, j) => { d.className = j < k ? 'done' : j === k ? 'cur' : ''; });
      const feedback = (cls, html) => { fb.className = 'fb show ' + cls; fb.innerHTML = html; };
      const proceed = () => {
        nx.innerHTML = '';
        const b = document.createElement('button'); b.className = 'btn small'; b.textContent = k < N - 1 ? 'Next step →' : 'Finish ⭐';
        b.addEventListener('click', () => { k++; if (k < N) step(); else finish(); });
        nx.appendChild(b); b.focus({ preventScroll: true });
      };
      function step() {
        dots();
        const st = P.steps[k];
        qq.innerHTML = '<span class="stepn">STEP ' + (k + 1) + ' OF ' + N + '</span>' + st.q;
        fb.className = 'fb'; nx.innerHTML = ''; opts.innerHTML = '';
        if (st.kind === 'slider') {
          opts.className = 'opts list';
          opts.innerHTML = '<div class="slider-q"><input type="range" min="' + st.min + '" max="' + st.max + '" step="' + st.step + '" value="' + st.start + '"><output>' + st.start + ' ' + st.unit + '</output></div><div><button class="btn small">Lock in my guess</button></div>';
          const rg = $('input', opts), out = $('output', opts), lk = $('button', opts);
          rg.addEventListener('input', () => { out.textContent = rg.value + ' ' + st.unit; });
          lk.addEventListener('click', () => {
            const v = +rg.value; rg.disabled = true; lk.disabled = true;
            const okv = Math.abs(v - st.answer) <= st.tol;
            if (!okv) slips++;
            feedback(okv ? 'good' : 'bad', (okv ? '🎯 Close enough! ' : '📏 Off by ' + fmt(Math.abs(v - st.answer), 1) + ' ' + st.unit + '. ') + st.explain(v));
            if (st.after) st.after(); proceed();
          });
          return;
        }
        opts.className = 'opts ' + (st.layout || '');
        const list = st.keepOrder ? st.options.slice() : shuffle(st.options.slice());
        list.forEach(o => {
          const b = document.createElement('button'); b.className = 'opt'; b.innerHTML = o.h;
          b.addEventListener('click', () => {
            if (o.ok === true) {
              b.classList.add('right'); $$('.opt', opts).forEach(y => y.disabled = true);
              feedback('good', '✓ ' + (o.why || 'Right.')); if (o.after) o.after(); proceed();
            } else if (o.ok === 'warn') {
              b.classList.add('warn'); b.disabled = true; feedback('warn', '⚠️ ' + o.why);
            } else {
              b.classList.add('wrong'); b.disabled = true; slips++; feedback('bad', '✗ ' + o.why); if (o.onPick) o.onPick();
            }
          });
          opts.appendChild(b);
        });
      }
      function finish() {
        k = N; dots();
        const stars = slips === 0 ? 3 : slips <= 2 ? 2 : 1;
        best[S.id] = Math.max(best[S.id] || 0, stars); saveBest();
        qq.innerHTML = ''; opts.innerHTML = ''; fb.className = 'fb'; nx.innerHTML = '';
        const nextI = (i + 1) % stations.length;
        opts.className = 'opts list';
        opts.innerHTML = '<div class="endcard"><div class="bigstars">' + '⭐'.repeat(stars) + '<span class="n">' + '☆'.repeat(3 - stars) + '</span></div>' +
          '<p style="margin:8px 0">' + (slips === 0 ? 'Flawless. No slips at all.' : slips + ' slip' + (slips > 1 ? 's' : '') + ' along the way, and each one taught you something.') + '</p><p>' + P.end + '</p>' +
          '<div class="row" style="justify-content:center"><button class="btn small ghost" data-a="again">↺ Play again (new numbers)</button><button class="btn small" data-a="next">Next: ' + stations[nextI].icon + ' ' + stations[nextI].title + ' →</button></div></div>';
        $('[data-a=again]', opts).addEventListener('click', () => play(i));
        $('[data-a=next]', opts).addEventListener('click', () => play(nextI));
        renderMap();
      }
      step();
    }
    play(0);
  })();
})();
