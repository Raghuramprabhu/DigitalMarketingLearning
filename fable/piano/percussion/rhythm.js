/* =====================================================================
   Bhajan Rhythm Studio · instruments, thekas, and the tala tutor
   ===================================================================== */
(function () {
  'use strict';
  var PS = window.PS, D = window.DRUMS, LK = window.LK;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------------- instruments & strokes ---------------- */
  var DRUM_PADS = [
    { id: 'dha', key: 'H', label: 'Dha', sub: 'both hands' },
    { id: 'dhin', key: 'U', label: 'Dhin', sub: 'both, open' },
    { id: 'ge', key: 'A', label: 'Ge', sub: 'bass, open' },
    { id: 'ka', key: 'S', label: 'Ka', sub: 'bass, closed' },
    { id: 'na', key: 'J', label: 'Na / Ta', sub: 'treble rim' },
    { id: 'tin', key: 'K', label: 'Tin', sub: 'treble, softer' },
    { id: 'ti', key: 'L', label: 'Ti / Te', sub: 'treble, closed' },
    { id: 'tu', key: 'I', label: 'Tu', sub: 'treble, deep' }
  ];
  var INST = {
    tambourine: {
      name: 'Tambourine', icon: '🔔', pads: [
        { id: 'hit', key: 'J', label: 'Hit', sub: 'against palm' },
        { id: 'tap', key: 'F', label: 'Tap', sub: 'fingertips' },
        { id: 'shake', key: 'D', label: 'Shake', sub: 'wrist twist' },
        { id: 'roll', key: 'K', label: 'Roll', sub: 'thumb on rim' }
      ]
    },
    dholak: { name: 'Dholak', icon: '🥁', pads: DRUM_PADS },
    dholki: { name: 'Dholki', icon: '🥁', pads: DRUM_PADS },
    tabla: { name: 'Tabla', icon: '🪘', pads: DRUM_PADS }
  };

  /* ---------------- talas ---------------- */
  // theka notation: beats separated by spaces, "|" between sections, [a b] = several strokes inside one beat, "-" = silence
  var TALAS = [
    { id: 'keherwa', name: '8 beat · Keherwa', short: 'Keherwa', beats: 8, groups: [4, 4], tali: [0], khali: [4], marks: { 0: 'X', 4: '0' }, bpm: 92,
      theka: 'Dha Ge Na Ti | Na Ka Dhi Na' },
    { id: 'bhajani', name: '8 beat · Bhajani', short: 'Bhajani', beats: 8, groups: [4, 4], tali: [0], khali: [4], marks: { 0: 'X', 4: '0' }, bpm: 72,
      theka: 'Dhin [Na Dhin] [- Dhin] Na | Dhin [Na Tin] [- Tin] Na' },
    { id: 'dadra', name: '6 beat · Dadra', short: 'Dadra', beats: 6, groups: [3, 3], tali: [0], khali: [3], marks: { 0: 'X', 3: '0' }, bpm: 104,
      theka: 'Dha Dhin Na | Dha Tin Na' },
    { id: 'rupak', name: '7 beat · Rupak', short: 'Rupak', beats: 7, groups: [3, 2, 2], tali: [3, 5], khali: [0], marks: { 0: 'X/0', 3: '1', 5: '2' }, bpm: 96,
      theka: 'Tin Tin Na | Dhi Na | Dhi Na' },
    { id: 'deepchandi', name: '14 beat · Deepchandi', short: 'Deepchandi', beats: 14, groups: [3, 4, 3, 4], tali: [0, 3, 10], khali: [7], marks: { 0: 'X', 3: '2', 7: '0', 10: '3' }, bpm: 76,
      theka: 'Dha Dhin - | Dha Dha Tin - | Ta Tin - | Dha Dha Dhin -' },
    { id: 'teental', name: '16 beat · Teental', short: 'Teental', beats: 16, groups: [4, 4, 4, 4], tali: [0, 4, 12], khali: [8], marks: { 0: 'X', 4: '2', 8: '0', 12: '3' }, bpm: 84,
      theka: 'Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Dha Tin Tin Ta | Ta Dhin Dhin Dha' }
  ];
  var BOL = { dha: 'dha', dhin: 'dhin', dhi: 'dhin', na: 'na', ta: 'na', tin: 'tin', tun: 'tu', tu: 'tu', ti: 'ti', te: 'ti', ra: 'ti', ki: 'ka', ge: 'ge', ghe: 'ge', ga: 'ge', ka: 'ka', ke: 'ka', kat: 'ka' };

  // -> [ [ {bol, s} , … ] per beat ]
  function parseTheka(str) {
    var beats = [], toks = str.replace(/\|/g, ' ').match(/\[[^\]]*\]|\S+/g) || [];
    toks.forEach(function (tk) {
      var parts = tk[0] === '[' ? tk.slice(1, -1).trim().split(/\s+/) : [tk];
      beats.push(parts.map(function (p) { return p === '-' ? { bol: '–', s: null } : { bol: p, s: BOL[p.toLowerCase()] || 'na' }; }));
    });
    return beats;
  }
  // double time (dugun): two original beats squeezed into one, each keeping its own inner timing
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function dugun(beats) {
    var n = beats.length, out = [];
    for (var i = 0; i < n; i++) {
      var h1 = beats[(2 * i) % n], h2 = beats[(2 * i + 1) % n], m = h1.length * h2.length / gcd(h1.length, h2.length);
      var beat = [];
      [h1, h2].forEach(function (h) {
        for (var j = 0; j < m; j++) beat.push(j % (m / h.length) === 0 ? h[j / (m / h.length)] : { bol: '·', s: null });
      });
      out.push(beat);
    }
    return out;
  }
  // tambourine parts derived from the drum theka (the tambourine echoes the drum's weight)
  function tambParts(tala, level) {
    var beats = parseTheka(tala.theka), out = [];
    beats.forEach(function (b, i) {
      var heavy = i === 0 || tala.tali.indexOf(i) >= 0;
      if (level === 1) out.push([{ bol: heavy ? 'Hit' : 'tap', s: heavy ? 'hit' : 'tap', v: heavy ? 1 : .7 }]);
      else if (level === 2) out.push([{ bol: heavy ? 'Hit' : 'tap', s: heavy ? 'hit' : 'tap', v: heavy ? 1 : .75 }, { bol: 'sh', s: 'shake', v: .7 }]);
      else out.push(b.map(function (x) {
        if (!x.s) return { bol: '–', s: null };
        if (x.s === 'dha' || x.s === 'dhin') return { bol: 'Hit', s: 'hit', v: 1 };
        if (x.s === 'ge' || x.s === 'ka') return { bol: 'tap', s: 'tap', v: .8 };
        return { bol: 'sh', s: 'shake', v: .75 };
      }));
    });
    return out;
  }
  var VARIANTS = {
    drum: [{ id: 'theka', label: 'Theka' }, { id: 'dugun', label: 'Double time (dugun)' }],
    tambourine: [{ id: 't1', label: '1 · Steady' }, { id: 't2', label: '2 · Hit-shake' }, { id: 't3', label: '3 · Follow the drum' }]
  };
  function pattern(tala, inst, variant) {
    if (inst === 'tambourine') return tambParts(tala, variant === 't1' ? 1 : variant === 't2' ? 2 : 3);
    var b = parseTheka(tala.theka);
    return variant === 'dugun' ? dugun(b) : b;
  }

  /* ---------------- state ---------------- */
  var st = {
    inst: 'tambourine', tala: TALAS[0], variant: 't1', mode: 'listen', bpm: TALAS[0].bpm, startBpm: TALAS[0].bpm,
    claps: true, speedUp: false, playing: false, sa: 61
  };
  try { var saved = JSON.parse(localStorage.getItem('percussion-state') || '{}'); if (saved.inst && INST[saved.inst]) st.inst = saved.inst; if (saved.sa) st.sa = saved.sa; } catch (e) { }
  st.variant = st.inst === 'tambourine' ? 't1' : 'theka';
  function save() { try { localStorage.setItem('percussion-state', JSON.stringify({ inst: st.inst, sa: st.sa })); } catch (e) { } }
  D.setSa(st.sa);

  /* ---------------- instrument picture ---------------- */
  function svgFor(inst) {
    if (inst === 'tambourine') return '<svg viewBox="0 0 220 220" class="inst-svg">' +
      '<circle cx="110" cy="110" r="92" fill="#c98a3f" stroke="#6b4319" stroke-width="10"/>' +
      '<circle cx="110" cy="110" r="78" fill="#f1dfbf"/>' +
      (function () { var h = ''; for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2, x = 110 + 92 * Math.cos(a), y = 110 + 92 * Math.sin(a); h += '<ellipse class="z z-shake z-roll z-tap" cx="' + x + '" cy="' + y + '" rx="11" ry="7" transform="rotate(' + (a * 180 / Math.PI + 90) + ' ' + x + ' ' + y + ')" fill="#d9d9d9" stroke="#888"/>'; } return h; })() +
      '<circle class="z z-hit" cx="110" cy="110" r="40" fill="transparent"/>' +
      '<text x="110" y="115" text-anchor="middle" font-family="DM Sans" font-weight="700" font-size="13" fill="#6b4319">hit here</text></svg>';
    if (inst === 'tabla') return '<svg viewBox="0 0 300 200" class="inst-svg">' +
      '<text x="80" y="20" text-anchor="middle" font-family="DM Sans" font-size="12" fill="var(--soft)">bayan (left, bass)</text>' +
      '<text x="222" y="20" text-anchor="middle" font-family="DM Sans" font-size="12" fill="var(--soft)">dayan (right, tuned to Sa)</text>' +
      '<circle class="z z-ge z-dha z-dhin" cx="80" cy="110" r="72" fill="#d8c7a6" stroke="#6b4a2a" stroke-width="7"/>' +
      '<circle class="z z-ka" cx="62" cy="122" r="22" fill="#1d1a1a"/>' +
      '<circle class="z z-na z-dha" cx="222" cy="110" r="58" fill="#ead9b8" stroke="#6b4a2a" stroke-width="7"/>' +
      '<circle class="z z-tin z-dhin" cx="222" cy="110" r="44" fill="#e3cfa9"/>' +
      '<circle class="z z-ti z-tu" cx="222" cy="110" r="24" fill="#1d1a1a"/>' +
      '</svg>';
    var small = inst === 'dholki';
    return '<svg viewBox="0 0 300 170" class="inst-svg">' +
      '<text x="' + (small ? 70 : 52) + '" y="18" text-anchor="middle" font-family="DM Sans" font-size="12" fill="var(--soft)">bass head</text>' +
      '<text x="' + (small ? 230 : 248) + '" y="18" text-anchor="middle" font-family="DM Sans" font-size="12" fill="var(--soft)">treble head</text>' +
      '<path d="M' + (small ? 70 : 52) + ' ' + (small ? 50 : 35) + ' Q150 ' + (small ? 38 : 18) + ' ' + (small ? 230 : 248) + ' ' + (small ? 58 : 48) + ' L' + (small ? 230 : 248) + ' ' + (small ? 122 : 132) + ' Q150 ' + (small ? 140 : 160) + ' ' + (small ? 70 : 52) + ' ' + (small ? 130 : 145) + ' Z" fill="#9c5a2b" stroke="#5a3214" stroke-width="3"/>' +
      (function () { var h = ''; for (var i = 0; i < 9; i++) { var x = (small ? 80 : 62) + i * (small ? 17.5 : 21.5); h += '<line x1="' + x + '" y1="' + (small ? 50 : 35) + '" x2="' + (x + 6) + '" y2="' + (small ? 130 : 145) + '" stroke="#e7c28e" stroke-width="2" opacity=".7"/>'; } return h; })() +
      '<ellipse class="z z-ge z-ka z-dha z-dhin" cx="' + (small ? 70 : 52) + '" cy="' + (small ? 90 : 90) + '" rx="' + (small ? 16 : 22) + '" ry="' + (small ? 40 : 55) + '" fill="#e8d6b4" stroke="#5a3214" stroke-width="4"/>' +
      '<ellipse class="z z-na z-tin z-ti z-tu z-dha z-dhin" cx="' + (small ? 230 : 248) + '" cy="90" rx="' + (small ? 12 : 17) + '" ry="' + (small ? 32 : 42) + '" fill="#f1e2c4" stroke="#5a3214" stroke-width="4"/>' +
      '</svg>';
  }
  function glow(stroke) {
    $$('#instPic .z-' + stroke).forEach(function (z) { z.classList.add('lit'); clearTimeout(z._t); z._t = setTimeout(function () { z.classList.remove('lit'); }, 140); });
    var p = $('#pads .pad[data-s="' + stroke + '"]'); if (p) { p.classList.add('lit'); clearTimeout(p._t); p._t = setTimeout(function () { p.classList.remove('lit'); }, 120); }
  }

  /* ---------------- render: instrument tabs, pads ---------------- */
  function renderInst() {
    $('#instTabs').innerHTML = Object.keys(INST).map(function (k) { return '<button type="button" data-i="' + k + '"' + (k === st.inst ? ' class="on"' : '') + '>' + INST[k].icon + ' ' + INST[k].name + '</button>'; }).join('');
    $$('#instTabs button').forEach(function (b) { b.addEventListener('click', function () { setInst(b.dataset.i); }); });
    $('#instPic').innerHTML = svgFor(st.inst);
    $('#pads').innerHTML = INST[st.inst].pads.map(function (p) {
      return '<button type="button" class="pad" data-s="' + p.id + '"><b>' + p.label + '</b><small>' + p.sub + '</small><kbd>' + p.key + '</kbd></button>';
    }).join('');
    $$('#pads .pad').forEach(function (b) { b.addEventListener('pointerdown', function (e) { e.preventDefault(); userStroke(b.dataset.s); }); });
    $$('.inst-help').forEach(function (h) { h.hidden = h.dataset.inst !== st.inst; });
    $('#saRow').style.display = st.inst === 'tabla' ? '' : 'none';
    renderVariants();
  }
  function setInst(k) {
    st.inst = k; st.variant = k === 'tambourine' ? 't1' : 'theka'; save(); renderInst(); renderGrid();
  }
  function renderVariants() {
    var list = st.inst === 'tambourine' ? VARIANTS.tambourine : VARIANTS.drum;
    $('#variant').innerHTML = list.map(function (v) { return '<button type="button" data-v="' + v.id + '"' + (v.id === st.variant ? ' class="on"' : '') + '>' + v.label + '</button>'; }).join('');
    $$('#variant button').forEach(function (b) { b.addEventListener('click', function () { st.variant = b.dataset.v; renderVariants(); renderGrid(); }); });
  }

  /* ---------------- render: tala picker & grid ---------------- */
  function renderTalas() {
    $('#talaTabs').innerHTML = TALAS.map(function (t) { return '<button type="button" data-t="' + t.id + '"' + (t === st.tala ? ' class="on"' : '') + '>' + t.name + '</button>'; }).join('');
    $$('#talaTabs button').forEach(function (b) { b.addEventListener('click', function () { setTala(b.dataset.t); }); });
  }
  function setTala(id) {
    st.tala = TALAS.filter(function (t) { return t.id === id; })[0];
    st.bpm = st.startBpm = st.tala.bpm; $('#bpm').value = st.bpm; $('#bpmR').textContent = st.bpm;
    renderTalas(); renderGrid();
  }
  var pat = [];
  function renderGrid() {
    pat = pattern(st.tala, st.inst, st.variant);
    var h = '', n = 0;
    st.tala.groups.forEach(function (g) {
      h += '<div class="vib">';
      for (var j = 0; j < g; j++, n++) {
        var mark = st.tala.marks[n] || '';
        h += '<div class="bt' + (n === 0 ? ' sam' : '') + (st.tala.khali.indexOf(n) >= 0 ? ' khali' : '') + '" data-b="' + n + '"><span class="n">' + (n + 1) + '</span><span class="mk">' + mark + '</span><span class="bols">' +
          pat[n].map(function (x, k) { return '<i data-k="' + k + '" class="' + (x.s ? '' : 'rest') + '">' + x.bol + '</i>'; }).join('') + '</span></div>';
      }
      h += '</div>';
    });
    $('#grid').innerHTML = h;
    $('#thekaLine').innerHTML = '<b>' + st.tala.short + '</b> · ' + st.tala.beats + ' beats (' + st.tala.groups.join('+') + ') · tabla theka: <span class="mono">' + st.tala.theka + '</span>';
  }

  /* ---------------- scheduler ---------------- */
  var timer = null, beatIdx = 0, nextT = 0, cycleNo = 0, expected = [], cycleStats = null, allStats = { ok: 0, part: 0, total: 0, err: [] };
  function latency() { var c = PS.ctx; return (c.outputLatency || 0) + (c.baseLatency || 0); }
  function schedule() {
    var c = PS.ctx, spb = 60 / st.bpm;
    while (nextT < c.currentTime + 0.12) {
      var b = beatIdx % st.tala.beats;
      if (b === 0) startCycle();
      var strokes = pat[b], sub = spb / strokes.length;
      strokes.forEach(function (x, k) {
        if (!x.s) return;
        var t = nextT + k * sub;
        if (st.mode !== 'turn') D.play(st.inst, x.s, (x.v || (b === 0 && k === 0 ? 1 : .82)) * (st.mode === 'along' ? 0.4 : 1), t);
        if (st.mode !== 'listen') expected.push({ t: t, s: x.s, b: b, k: k, cyc: cycleNo, win: Math.min(0.13, sub * 0.5), res: null });
        (function (b, k, t) { setTimeout(function () { lightSub(b, k); if (st.mode === 'listen') glow(x.s); }, Math.max(0, (t - c.currentTime) * 1000)); })(b, k, t);
      });
      if (st.claps && st.tala.tali.indexOf(b) >= 0) D.clap(nextT, b === 0 ? 1 : .75); // claps on tali beats; khali is a silent wave
      if (st.mode === 'turn') D.tick(nextT, b === 0 ? 1 : .6, b === 0);
      (function (b, t) { setTimeout(function () { lightBeat(b); }, Math.max(0, (t - c.currentTime) * 1000)); })(b, nextT);
      beatIdx++; nextT += spb;
    }
    // close out expected strokes whose window has passed
    var now = c.currentTime - latency();
    expected.forEach(function (e) { if (!e.res && now > e.t + e.win) { e.res = 'miss'; markCell(e, 'miss'); if (st.mode !== 'listen') tally(e); } });
    expected = expected.filter(function (e) { return now < e.t + 2; });
  }
  function startCycle() {
    if (cycleStats && st.mode !== 'listen' && cycleStats.total) showCycle(cycleStats);
    cycleNo++; cycleStats = { ok: 0, part: 0, total: 0, err: [] };
    setTimeout(function () { $$('#grid .bols i').forEach(function (i) { i.classList.remove('ok', 'part', 'miss', 'wrong'); }); }, Math.max(0, (nextT - PS.ctx.currentTime) * 1000 - 30));
    if (st.speedUp && cycleNo > 1 && (cycleNo - 1) % 4 === 0 && st.bpm < st.startBpm * 1.8) {
      st.bpm = Math.round(st.bpm * 1.15); $('#bpm').value = st.bpm; $('#bpmR').textContent = st.bpm + ' ↑';
    }
    $('#cycleR').textContent = 'Cycle ' + cycleNo;
  }
  function lightBeat(b) { $$('#grid .bt.now').forEach(function (e) { e.classList.remove('now'); }); var e = $('#grid .bt[data-b="' + b + '"]'); if (e && st.playing) e.classList.add('now'); }
  function lightSub(b, k) { var e = $('#grid .bt[data-b="' + b + '"] i[data-k="' + k + '"]'); if (!e) return; e.classList.add('hitnow'); setTimeout(function () { e.classList.remove('hitnow'); }, 130); }
  function markCell(e, cls) { var el = $('#grid .bt[data-b="' + e.b + '"] i[data-k="' + e.k + '"]'); if (el && e.cyc === cycleNo) el.classList.add(cls); }
  function tally(e) {
    if (!cycleStats) return;
    cycleStats.total++; allStats.total++;
    if (e.res === 'ok') { cycleStats.ok++; allStats.ok++; }
    if (e.res === 'part') { cycleStats.part++; allStats.part++; }
    if (e.err !== undefined && (e.res === 'ok' || e.res === 'part')) { cycleStats.err.push(e.err); allStats.err.push(e.err); if (allStats.err.length > 64) allStats.err.shift(); }
  }
  function showCycle(cs) {
    var avg = cs.err.length ? Math.round(cs.err.reduce(function (a, b) { return a + b; }, 0) / cs.err.length) : 0;
    var abs = cs.err.length ? Math.round(cs.err.reduce(function (a, b) { return a + Math.abs(b); }, 0) / cs.err.length) : 0;
    var pct = Math.round((cs.ok + cs.part * 0.5) / cs.total * 100);
    $('#score').innerHTML = 'Last cycle: <b>' + cs.ok + '/' + cs.total + '</b> right' + (cs.part ? ' (+' + cs.part + ' half)' : '') + ' · timing ±' + abs + ' ms' + (cs.err.length ? (avg < -15 ? ' · <span class="bad">rushing</span>' : avg > 15 ? ' · <span class="bad">dragging</span>' : ' · <span class="good">in the pocket</span>') : '') +
      ' · ' + (pct >= 90 ? '🎯' : pct >= 60 ? '👍' : '🔁');
  }

  /* ---------------- player input ---------------- */
  var COMBO = { 'na+ge': 'dha', 'ge+na': 'dha', 'tin+ge': 'dhin', 'ge+tin': 'dhin' };
  var lastUser = null;
  function userStroke(s) {
    LK.ensureAudio();
    D.play(st.inst, s, s === 'shake' ? .8 : .9);
    glow(s);
    if (!st.playing || st.mode === 'listen') return;
    var c = PS.ctx, tu = c.currentTime - latency();
    // two strokes within 60 ms can combine (Na + Ge = Dha)
    var combo = lastUser && tu - lastUser.t < 0.06 ? COMBO[lastUser.s + '+' + s] : null;
    if (combo && cycleStats && lastUser.e && lastUser.e.s === combo && lastUser.e.res === 'part') {
      lastUser.e.res = 'ok'; markCell(lastUser.e, 'ok'); cycleStats.part--; cycleStats.ok++; allStats.part--; allStats.ok++; lastUser = null; return;
    }
    var best = null;
    expected.forEach(function (e) { if (e.res) return; var d = tu - e.t; if (Math.abs(d) <= e.win && (!best || Math.abs(d) < Math.abs(best.d))) best = { e: e, d: d }; });
    if (!best) { lastUser = { s: s, t: tu }; return; }
    var e = best.e, exp = e.s, res;
    if (s === exp) res = 'ok';
    else if ((exp === 'dha' && (s === 'na' || s === 'ge')) || (exp === 'dhin' && (s === 'tin' || s === 'ge')) || (exp === 'hit' && s === 'tap') || (exp === 'tap' && s === 'hit')) res = 'part';
    else res = 'wrong';
    e.res = res; e.err = Math.round(best.d * 1000);
    markCell(e, res === 'wrong' ? 'wrong' : res); tally(e);
    lastUser = { s: s, t: tu, e: e };
  }
  var KEYMAP = {};
  function keymap() { KEYMAP = {}; INST[st.inst].pads.forEach(function (p) { KEYMAP['Key' + p.key] = p.id; }); }
  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    var t = e.target; if (t && (t.tagName === 'INPUT' && t.type !== 'range' || t.tagName === 'TEXTAREA')) return;
    keymap();
    if (e.code === 'Space' && t === document.body) { e.preventDefault(); toggle(); return; }
    var s = KEYMAP[e.code]; if (!s) return;
    e.preventDefault(); userStroke(s);
  });

  /* ---------------- transport ---------------- */
  function start() {
    LK.ensureAudio(); st.playing = true; beatIdx = 0; cycleNo = 0; expected = []; cycleStats = null;
    allStats = { ok: 0, part: 0, total: 0, err: [] }; st.bpm = st.startBpm = +$('#bpm').value;
    nextT = PS.ctx.currentTime + 0.15; timer = setInterval(schedule, 25); schedule();
    $('#go').textContent = '■ Stop'; $('#go').classList.add('on');
    $('#score').textContent = st.mode === 'listen' ? 'Listening. Read the bols as they light up, and say them aloud.' : 'Play on the pads or keys. Each cycle is scored.';
  }
  function stop() {
    st.playing = false; clearInterval(timer); lightBeat(-1);
    $('#go').textContent = '▶ Start'; $('#go').classList.remove('on');
    if (st.mode !== 'listen' && allStats.total) {
      var pct = Math.round((allStats.ok + allStats.part * .5) / allStats.total * 100);
      var abs = allStats.err.length ? Math.round(allStats.err.reduce(function (a, b) { return a + Math.abs(b); }, 0) / allStats.err.length) : 0;
      $('#score').innerHTML = 'Session: <b>' + pct + '%</b> of strokes right · average timing ±' + abs + ' ms over ' + cycleNo + ' cycles.';
    }
    $('#bpmR').textContent = st.bpm;
  }
  function toggle() { st.playing ? stop() : start(); }
  $('#go').addEventListener('click', toggle);
  $('#bpm').addEventListener('input', function () { st.bpm = st.startBpm = +this.value; $('#bpmR').textContent = st.bpm; });
  $$('#modeSeg button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.m); }); });
  function setMode(m) { st.mode = m; $$('#modeSeg button').forEach(function (x) { x.classList.toggle('on', x.dataset.m === m); }); $('#modeHelp').innerHTML = MODE_HELP[m]; }
  var MODE_HELP = {
    listen: '<b>Listen.</b> The pattern plays by itself. Say the bols aloud with it ("padhant"): if you can say it, you can play it.',
    along: '<b>Play along.</b> The pattern plays quietly underneath. You play over it, and every stroke is scored green (right), amber (half right) or red.',
    turn: '<b>Your turn.</b> Only the beat clicks (and claps, if on). You play the whole pattern from memory.'
  };
  $('#claps').addEventListener('change', function () { st.claps = this.checked; });
  $('#speedUp').addEventListener('change', function () { st.speedUp = this.checked; });

  // Sa (pitch) for the tabla and the drone
  var KATTAI = ['1', '1½', '2', '2½', '3', '4', '4½', '5', '5½', '6', '6½', '7'];
  $('#saSel').innerHTML = LK.SHARPS.map(function (n, i) { return '<option value="' + (60 + i) + '">' + KATTAI[i] + ' · ' + n + '</option>'; }).join('');
  $('#saSel').value = st.sa;
  $('#saSel').addEventListener('change', function () { st.sa = +this.value; D.setSa(st.sa); save(); D.play('tabla', 'na', .9); if (LK.droneState.on) LK.drone(true, st.sa); });
  $('#droneBtn').addEventListener('click', function () { LK.drone(!LK.droneState.on, st.sa); this.classList.toggle('on', LK.droneState.on); });

  /* ---------------- tutorial "set it up" buttons ---------------- */
  $$('[data-setup]').forEach(function (b) {
    b.addEventListener('click', function () {
      var o = JSON.parse(b.dataset.setup);
      if (st.playing) stop();
      if (o.inst) setInst(o.inst);
      if (o.tala) setTala(o.tala);
      if (o.variant) { st.variant = o.variant; renderVariants(); renderGrid(); }
      if (o.mode) setMode(o.mode);
      if (o.claps !== undefined) { st.claps = o.claps; $('#claps').checked = o.claps; }
      if (o.bpm) { st.bpm = st.startBpm = o.bpm; $('#bpm').value = o.bpm; $('#bpmR').textContent = o.bpm; }
      $('#tutor').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(start, 600);
    });
  });
  // compare buttons (first-principles demo)
  $$('[data-demo]').forEach(function (b) {
    b.addEventListener('click', function () { LK.ensureAudio(); var p = b.dataset.demo.split(':'); D.play(p[0], p[1], .9); });
  });

  /* ---------------- boot ---------------- */
  renderInst(); renderTalas(); renderGrid(); setMode('listen');
  $('#bpm').value = st.bpm; $('#bpmR').textContent = st.bpm;
  window.RHYTHM = { st: st, start: start, stop: stop, userStroke: userStroke, TALAS: TALAS, parseTheka: parseTheka };
})();
