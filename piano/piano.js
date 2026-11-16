/* =====================================================================
   Piano Studio
   ---------------------------------------------------------------------
   1. Theme toggle (shared with the rest of the site)
   2. Music maths: MIDI number -> frequency, names, chords
   3. Sound engine: Web Audio synth voices (no sample files)
   4. Stage: one <canvas> = rising note bars + keyboard. Drawn every frame.
   5. Input: pointer/touch (multi-touch + glide), computer keys, Web MIDI
   6. Recorder: canvas.captureStream() + audio stream -> MediaRecorder
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('piano-' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('piano-' + k, v); } catch (e) { } }
  };

  /* ---------------- 1. theme ---------------- */
  (function () {
    var b = $('#themebtn'); if (!b) return;
    function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }
    function paint() { b.textContent = light() ? '🌙 Dark' : '☀️ Light'; }
    b.addEventListener('click', function () {
      var t = light() ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('dml-theme', t); } catch (e) { }
      paint();
    });
    paint();
  })();

  /* ---------------- 2. music maths ---------------- */
  var NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  var SARGAM = ['Sa', 're', 'Re', 'ga', 'Ga', 'ma', 'Ma′', 'Pa', 'dha', 'Dha', 'ni', 'Ni'];
  var IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function noteName(m) { return NAMES[m % 12] + (Math.floor(m / 12) - 1); }
  function hue(m) { return (m % 12) * 30; }

  var CHORDS = [
    ['', [0, 4, 7], 'major'], ['m', [0, 3, 7], 'minor'], ['dim', [0, 3, 6], 'diminished'],
    ['aug', [0, 4, 8], 'augmented'], ['sus2', [0, 2, 7], 'sus2'], ['sus4', [0, 5, 7], 'sus4'],
    ['7', [0, 4, 7, 10], 'dominant 7th'], ['maj7', [0, 4, 7, 11], 'major 7th'], ['m7', [0, 3, 7, 10], 'minor 7th'],
    ['m7♭5', [0, 3, 6, 10], 'half-diminished'], ['dim7', [0, 3, 6, 9], 'diminished 7th'],
    ['6', [0, 4, 7, 9], 'major 6th'], ['m6', [0, 3, 7, 9], 'minor 6th'], ['add9', [0, 2, 4, 7], 'add 9'],
    ['mMaj7', [0, 3, 7, 11], 'minor-major 7th'], ['7sus4', [0, 5, 7, 10], '7 sus4'],
    ['5', [0, 7], 'power chord']
  ];
  var INTERVALS = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone',
    'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th'];

  function nameChord(midis) {
    if (!midis.length) return null;
    var sorted = midis.slice().sort(function (a, b) { return a - b; });
    var bass = sorted[0] % 12;
    var pcs = []; sorted.forEach(function (m) { if (pcs.indexOf(m % 12) < 0) pcs.push(m % 12); });
    if (pcs.length === 1) {
      return sorted.length > 1 ? { big: NAMES[bass], small: 'octaves of ' + NAMES[bass] } : null;
    }
    var best = null;
    for (var r = 0; r < pcs.length; r++) {
      var root = pcs[r];
      var rel = pcs.map(function (p) { return (p - root + 12) % 12; }).sort(function (a, b) { return a - b; });
      for (var c = 0; c < CHORDS.length; c++) {
        var t = CHORDS[c][1];
        if (t.length === rel.length && t.every(function (v, i) { return v === rel[i]; })) {
          var score = (root === bass ? 2 : 0) + (CHORDS[c][1].length);
          if (!best || score > best.score) best = { root: root, c: CHORDS[c], score: score };
        }
      }
    }
    if (best) {
      var big = NAMES[best.root] + best.c[0];
      if (best.root !== bass) big += ' / ' + NAMES[bass];
      return { big: big, small: NAMES[best.root] + ' ' + best.c[2] + (best.root !== bass ? ' (bass ' + NAMES[bass] + ')' : '') };
    }
    if (pcs.length === 2 && sorted.length === 2) {
      var iv = (sorted[1] - sorted[0]) % 12;
      return { big: NAMES[sorted[0] % 12] + ' + ' + NAMES[sorted[1] % 12], small: INTERVALS[iv] };
    }
    return { big: pcs.map(function (p) { return NAMES[p]; }).join(' · '), small: pcs.length + ' different notes' };
  }

  /* ---------------- 3. sound engine ---------------- */
  /* ---------------- 3. sound engine (lives in engine.js, shared with the lessons) ---------------- */
  var PS = window.PS;
  var ac = null, master, wet, recDest;
  var settings = PS.settings;
  settings.instrument = store.get('instrument', 'piano');
  settings.volume = parseFloat(store.get('volume', '0.8'));
  settings.reverb = store.get('reverb', '1') === '1';
  try { var savedReeds = JSON.parse(store.get('reeds', 'null')); if (savedReeds) for (var rk in savedReeds) settings.reeds[rk] = !!savedReeds[rk]; } catch (x) { }
  var INSTR = PS.INSTR;
  function initAudio() {
    var first = !ac;
    PS.init();
    if (!PS.ctx) { showMsg('This browser has no Web Audio support, so it cannot make sound.'); return; }
    if (PS.ctx.state !== 'running') PS.ctx.resume();
    ac = PS.ctx; master = PS.master; wet = PS.wet; recDest = PS.recDest;
    if (first) { setTimeout(reportLatency, 1500); $('#tapToStart').classList.add('gone'); }
  }

  // How long between "note starts" and "sound leaves the speaker"? The browser can tell us.
  function reportLatency() {
    if (!ac) return;
    var ms = Math.round(((ac.baseLatency || 0) + (ac.outputLatency || 0)) * 1000);
    if (!ms) return;
    var el = $('#latency'); el.hidden = false;
    el.textContent = 'Sound delay ≈ ' + ms + ' ms';
    el.className = 'latency ' + (ms > 60 ? 'bad' : ms > 30 ? 'ok' : 'good');
    el.title = ms > 60 ? 'High delay. Bluetooth headphones/speakers usually add 150–300 ms that no web page can remove; try the device speaker or wired earphones.' : 'Low enough to feel instant.';
    if (ms > 60) showMsg('Sound delay is about ' + ms + ' ms. If you are on Bluetooth headphones or a Bluetooth speaker, that link alone adds 150–300 ms, and no web page can remove it. The phone/laptop speaker or wired earphones will feel instant.');
  }


  var voices = new Map();   // midi -> voice
  var lastNote = null;      // for the Hz readout

  function startVoice(m, vel) {
    initAudio(); if (!ac) return;
    var t = ac.currentTime;
    if (voices.has(m)) voices.get(m).kill(t);
    if (voices.size > 40) { var oldest = voices.keys().next().value; voices.get(oldest).kill(t); voices.delete(oldest); }
    var make = INSTR[settings.instrument] || INSTR.piano;
    voices.set(m, make(m, freq(m), vel, t));
    lastNote = m;
  }
  function stopVoice(m) {
    var v = voices.get(m); if (!v || !ac) return;
    v.release(ac.currentTime); voices.delete(m);
  }
  function silenceAll() {
    if (!ac) return; var t = ac.currentTime;
    voices.forEach(function (v) { v.kill(t); }); voices.clear();
    holders.clear(); sustained.clear(); bars.open.clear();
  }

  /* ---------------- note bookkeeping (shared by all inputs) ---------------- */
  var holders = new Map();   // midi -> Set(source ids) physically holding it
  var sustained = new Set(); // released keys still ringing because pedal is down
  var sustainOn = false, latchSustain = false;

  function noteOn(m, vel, src) {
    if (m < 0 || m > 127) return;
    var set = holders.get(m);
    if (!set) { set = new Set(); holders.set(m, set); }
    var wasHeld = set.size > 0;
    set.add(src);
    if (wasHeld) return;
    sustained.delete(m);
    startVoice(m, vel);
    bars.start(m);
    recorder.onFirstNote();
  }
  function noteOff(m, src) {
    var set = holders.get(m); if (!set || !set.has(src)) return;
    set.delete(src);
    if (set.size) return;
    holders.delete(m);
    bars.end(m);
    if (sustainOn) sustained.add(m); else stopVoice(m);
  }
  function setSustain(on) {
    sustainOn = on;
    $('#sustainBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on) { sustained.forEach(function (m) { if (!holders.has(m)) stopVoice(m); }); sustained.clear(); }
  }

  /* ---------------- 4. stage ---------------- */
  var cv = $('#stage');
  // desynchronized = draw straight to screen, skipping a compositor frame of delay (Chrome/Edge)
  var g2 = cv.getContext('2d', { alpha: false, desynchronized: true }) || cv.getContext('2d');
  var view = {
    octSetting: store.get('octaves', 'auto'),
    // MIDI number of the leftmost key: always a C on the desktop page; any white key on the phone page (◀ ▶ slide it)
    startC: parseInt(store.get(cv.dataset.zoom ? 'mstart' : 'startC', '48'), 10),
    labels: store.get('labels', 'letters'),
    keyLayout: store.get('keyLayout', 'rows'),
    hints: store.get('hints', (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? '0' : '1') === '1',
    // Stacked keyboard rows (the phone page uses 2 in portrait). Pages without data-rows stay at 1 row.
    rows: cv.dataset.rows ? store.get('rows', cv.dataset.rows) : '1',
    // Key-size zoom (phone page): white keys per row, remembered separately upright and sideways. 'auto' = use octaves.
    zoom: { up: store.get('zoom-up', 'auto'), side: store.get('zoom-side', 'auto') },
    // Black-key guard: '0' off, '1' only the strips between black keys, '2' the whole top band (phone default). See hit().
    guard: store.get('guard', cv.dataset.guard || '0')
  };
  var ZOOM = !!cv.dataset.zoom, MIN_ZOOM = 5, MIN_KEY_PX = 22, START_KEY = ZOOM ? 'mstart' : 'startC';
  var LOWEST = 21, HIGHEST = 108; // A0 and C8, the ends of a real 88-key piano
  var KB_FRAC = parseFloat(cv.dataset.kbFrac) || 0.46; // share of each row's height given to the keys
  // Optional (phone page): spans that "Auto" may pick for a single row, e.g. 2.6 = C up to the G 2 octaves higher,
  // and the narrowest white key (CSS px) Auto will accept.
  var SPANS = cv.dataset.spans ? cv.dataset.spans.split(',').map(parseFloat) : null;
  var MIN_WHITE = parseFloat(cv.dataset.minWhite) || 50;
  function spanSemis(per) { var n = Math.round(per * 12); while (IS_BLACK[n % 12]) n++; return n; } // always end on a white key
  function whitesFor(per) { var n = spanSemis(per), w = 0; for (var i = 0; i <= n; i++) if (!IS_BLACK[i % 12]) w++; return w; }
  // The phone page can turn the whole page 90° (for iPhones with rotation lock on). The canvas then sits on its side.
  function whiteAfter(m, k) { while (k > 0) { m++; if (!IS_BLACK[m % 12]) k--; } return m; } // k-th white key from white key m
  function whiteBefore(m) { do { m--; } while (IS_BLACK[m % 12]); return m; }
  function rot() { return +(document.body.getAttribute('data-rot') || 0); }
  var L = { W: 0, H: 0, dpr: 1, keys: [], byMidi: {}, kbTop: 0, kbH: 0, ww: 0, lo: 48, hi: 84, rows: [] };

  function rowsFor(r) {
    if (view.keyLayout === 'full') return 1; // 61 keys in one line, matching letter song-sheets
    if (view.rows === 'auto') return r.height > r.width ? 2 : 1;
    return view.rows === '2' ? 2 : 1;
  }
  // octaves PER ROW (stacked rows always use whole octaves)
  function octavesFor(cssW, nRows) {
    if (view.octSetting !== 'auto') { var v = parseFloat(view.octSetting) || 2; return nRows > 1 ? Math.max(1, Math.floor(v)) : v; }
    if (view.keyLayout === 'full') return 5; // all 61 keys the layout can reach
    if (SPANS && nRows === 1) {
      var best = SPANS[0];
      SPANS.forEach(function (sp) { if (sp > best && cssW / whitesFor(sp) >= MIN_WHITE) best = sp; });
      return best;
    }
    return Math.max(1, Math.min(4, Math.floor(cssW / 50 / 7)));
  }

  // keepSize: re-lay the keys (new range) but keep the canvas pixel size, so a
  // recording in progress never changes resolution.
  function layout(keepSize) {
    if (recorder.isLive() && !keepSize) return;
    var br = cv.getBoundingClientRect();
    if (!br.width) return;
    var r = rot() ? { width: br.height, height: br.width } : { width: br.width, height: br.height }; // size before any page turn
    var dpr = Math.min(2, window.devicePixelRatio || 1), W, H;
    if (keepSize && cv.width) { W = cv.width; H = cv.height; dpr = W / r.width; }
    else {
      W = Math.round(r.width * dpr / 2) * 2; H = Math.round(r.height * dpr / 2) * 2; // even dims for video encoders
      cv.width = W; cv.height = H;
    }
    var nRows = rowsFor(r), orient = r.width > r.height ? 'side' : 'up';
    var zmax = Math.max(MIN_ZOOM, Math.min(Math.floor(r.width / MIN_KEY_PX), Math.floor(52 / nRows)));
    var zw = ZOOM && view.keyLayout !== 'full' ? parseInt(view.zoom[orient], 10) : NaN;
    var ranges = [], lo, hi; // [first midi, last midi] per row, top row first
    if (zw > 0) {
      // Zoomed: every row shows exactly zw white keys, and each row starts on the white key after the row below it.
      zw = Math.max(MIN_ZOOM, Math.min(zmax, zw));
      if (IS_BLACK[view.startC % 12]) view.startC--;
      view.startC = Math.max(LOWEST, view.startC);
      while (view.startC > LOWEST && whiteAfter(view.startC, zw * nRows - 1) > HIGHEST) view.startC = whiteBefore(view.startC);
      lo = view.startC;
      for (var b = 0; b < nRows; b++) {
        var e = whiteAfter(lo, (b + 1) * zw - 1);
        if (IS_BLACK[(e + 1) % 12]) e++; // the black key just past the right edge stays playable (half shown)
        ranges.unshift([whiteAfter(lo, b * zw), e]);
      }
      hi = ranges[0][1];
    } else {
      view.startC = Math.floor(view.startC / 12) * 12; // octave views start on a C (no-op on the desktop page)
      var per = octavesFor(r.width, nRows), oct = per * nRows;
      var semis = nRows === 1 ? spanSemis(per) : 12 * oct;
      view.startC = Math.max(12, Math.min(Math.floor((108 - semis) / 12) * 12, view.startC));
      lo = view.startC;
      // One row: C up to a white key (C..C for whole octaves, C..G for x.6). Several rows: each row is C..B,
      // and row 0 (the top one) holds the highest notes.
      hi = nRows === 1 ? lo + semis : lo + 12 * oct - 1;
      for (var q = 0; q < nRows; q++) {
        var qlo = lo + 12 * per * (nRows - 1 - q);
        ranges.push([qlo, nRows === 1 ? hi : qlo + 12 * per - 1]);
      }
    }
    var keys = [], byMidi = {}, rows = [];
    for (var ri = 0; ri < nRows; ri++) {
      var rlo = ranges[ri][0], rhi = ranges[ri][1];
      var top = Math.round(H * ri / nRows), bottom = ri === nRows - 1 ? H : Math.round(H * (ri + 1) / nRows);
      var whites = 0, m; for (m = rlo; m <= rhi; m++) if (!IS_BLACK[m % 12]) whites++;
      var ww = W / whites;
      var kbH = Math.min((bottom - top) * KB_FRAC, ww * 5.4, 260 * dpr);
      var kbTop = bottom - kbH, wi = 0;
      for (m = rlo; m <= rhi; m++) {
        var k = { m: m, black: !!IS_BLACK[m % 12], row: ri };
        if (!k.black) { k.x = wi * ww; k.w = ww; k.h = kbH; wi++; }
        else {
          var bw = ww * 0.58, nudge = { 1: -0.12, 3: 0.12, 6: -0.14, 8: 0, 10: 0.14 }[m % 12] * bw;
          k.x = wi * ww - bw / 2 + nudge; k.w = bw; k.h = kbH * 0.62;
        }
        k.y = kbTop; keys.push(k); byMidi[m] = k;
      }
      rows.push({ top: top, bottom: bottom, kbTop: kbTop, kbH: kbH, ww: ww, whites: whites });
    }
    L = { W: W, H: H, dpr: dpr, keys: keys, byMidi: byMidi, kbTop: rows[0].kbTop, kbH: rows[0].kbH, ww: rows[0].ww, lo: lo, hi: hi, rows: rows,
      orient: orient, perRow: rows[nRows - 1].whites, zmax: zmax };
    $('#octLabel').textContent = noteName(lo);
    syncZoomBtns();
    buildLayers();
    cv.dispatchEvent(new CustomEvent('keyview', { detail: { lo: L.lo, hi: L.hi, whites: L.perRow * L.rows.length, slidable: ZOOM && view.keyLayout !== 'full' } }));
  }

  /* --- key size (+ = fewer, wider keys; − = more, narrower keys) --- */
  function syncZoomBtns() {
    var zi = $('#zoomIn'), zo = $('#zoomOut'); if (!zi || !zo) return;
    var fixed = view.keyLayout === 'full';
    zi.disabled = fixed || L.perRow <= MIN_ZOOM;
    zo.disabled = fixed || L.perRow >= L.zmax;
    var pl = $('#panLeft'), pr = $('#panRight');
    if (pl && pr) { pl.disabled = fixed || L.lo <= LOWEST; pr.disabled = fixed || lastWhiteKey() >= HIGHEST; }
  }
  function lastWhiteKey() { var m = L.hi; while (IS_BLACK[m % 12]) m--; return m; }
  function announce(kind) {
    cv.dispatchEvent(new CustomEvent('keysize', { detail: {
      kind: kind, whites: L.perRow, rows: L.rows.length, keyPx: Math.round(L.ww / L.dpr), from: noteName(L.lo), to: noteName(lastWhiteKey()), fixed: view.keyLayout === 'full'
    } }));
  }
  // Put the leftmost key on any white key (keeping the key width). Returns false if nothing moved.
  function setStart(m, quiet) {
    if (!ZOOM || !L.W || view.keyLayout === 'full') { if (!quiet) announce('pan'); return false; }
    if (!(parseInt(view.zoom[L.orient], 10) > 0)) { view.zoom[L.orient] = String(L.perRow); store.set('zoom-' + L.orient, L.perRow); } // freeze today's width
    if (IS_BLACK[m % 12]) m--;
    var shown = L.perRow * L.rows.length, maxStart = LOWEST;
    while (whiteAfter(maxStart, shown - 1) < HIGHEST) maxStart = whiteAfter(maxStart, 1);
    m = Math.max(LOWEST, Math.min(maxStart, m));
    if (m === view.startC) return false;
    view.startC = m; store.set(START_KEY, m);
    layout(recorder.isLive()); rebuildKeyMap();
    if (!quiet) announce('pan');
    return true;
  }
  // ◀ ▶ : slide one white key
  function panBy(d) {
    if (!L.W) return false;
    return setStart(d > 0 ? whiteAfter(view.startC, 1) : view.startC > LOWEST ? whiteBefore(view.startC) : view.startC);
  }
  // other code (the phone page's whole-piano strip) can ask for a new leftmost key
  cv.addEventListener('setstart', function (e) { setStart(e.detail.midi, e.detail.quiet); });
  // tap = one key; hold = keep sliding, faster the longer you hold
  function holdRepeat(btn, d) {
    if (!btn) return;
    var t = null, n = 0;
    function stop() { clearTimeout(t); t = null; }
    function step() { if (!panBy(d)) return stop(); n++; t = setTimeout(step, n < 4 ? 160 : n < 10 ? 100 : 60); }
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); n = 0; panBy(d); t = setTimeout(step, 380); });
    ['pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { btn.addEventListener(ev, stop); });
    btn.addEventListener('click', function (e) { if (e.detail === 0) panBy(d); }); // keyboard / screen reader activation
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function zoomBy(d) {
    if (!ZOOM || !L.W) return;
    if (view.keyLayout !== 'full') {
      var next = Math.max(MIN_ZOOM, Math.min(L.zmax, L.perRow + d));
      view.zoom[L.orient] = String(next); store.set('zoom-' + L.orient, next);
      layout(recorder.isLive()); rebuildKeyMap();
    }
    announce('size');
  }

  function keyAt(x, y) {
    var i, k, last = L.rows.length - 1;
    for (i = 0; i < L.keys.length; i++) { k = L.keys[i]; if (k.black && x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h) return k; }
    // (a finger dragged off the bottom edge still counts as on the bottom row's white keys)
    for (i = 0; i < L.keys.length; i++) { k = L.keys[i]; if (!k.black && x >= k.x && x < k.x + k.w && y >= k.y && (y < k.y + k.h || k.row === last)) return k; }
    return null;
  }

  // Rising note bars: a bar is born when a key goes down and its top travels upward.
  var bars = {
    list: [], open: new Map(),
    start: function (m) { var b = { m: m, t0: now(), t1: null }; this.list.push(b); this.open.set(m, b); },
    end: function (m) { var b = this.open.get(m); if (b) { b.t1 = now(); this.open.delete(m); } }
  };
  function now() { return performance.now() / 1000; }

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  var KEY_HINT = {}; // midi -> computer key label (rebuilt when octave moves)
  var GAP = '#171320';

  /* --- key painters, shared by the cached layer and the "pressed" overlay --- */
  function paintWhite(c, k, state) { // state: 0 up, 1 down, 2 ringing (sustain)
    var d = L.dpr, down = state === 1;
    var gr = c.createLinearGradient(0, k.y, 0, k.y + k.h);
    if (down) { gr.addColorStop(0, 'hsl(' + hue(k.m) + ',80%,78%)'); gr.addColorStop(1, 'hsl(' + hue(k.m) + ',70%,64%)'); }
    else { gr.addColorStop(0, '#f4f1ea'); gr.addColorStop(0.85, '#fffefb'); gr.addColorStop(1, state === 2 ? 'hsl(' + hue(k.m) + ',60%,85%)' : '#ddd8cd'); }
    c.fillStyle = gr;
    rr(c, k.x + 0.75 * d, k.y + (down ? 2 * d : 0), k.w - 1.5 * d, k.h - (down ? 2 * d : 0), 5 * d); c.fill();
  }
  function paintBlack(c, k, down) {
    var d = L.dpr, gr = c.createLinearGradient(0, k.y, 0, k.y + k.h);
    if (down) { gr.addColorStop(0, 'hsl(' + hue(k.m) + ',75%,45%)'); gr.addColorStop(1, 'hsl(' + hue(k.m) + ',80%,58%)'); }
    else { gr.addColorStop(0, '#1b1a1f'); gr.addColorStop(0.9, '#34323a'); gr.addColorStop(1, '#141318'); }
    c.fillStyle = gr; rr(c, k.x, k.y - 2 * d, k.w, k.h + (down ? 0 : -2 * d), 4 * d); c.fill();
    if (!down) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(k.x + k.w * 0.18, k.y, k.w * 0.64, k.h * 0.85); }
  }
  function paintLabel(c, k) {
    var d = L.dpr, cx = k.x + k.w / 2, lbl = null;
    var fs = Math.max(9 * d, Math.min(L.ww * 0.3, 15 * d));
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    if (view.labels === 'letters') lbl = k.black ? null : (k.m % 12 === 0 ? noteName(k.m) : NAMES[k.m % 12]);
    if (view.labels === 'sargam') lbl = k.black ? null : SARGAM[k.m % 12];
    if (lbl) {
      c.font = '700 ' + fs + 'px "DM Sans", system-ui, sans-serif';
      c.fillStyle = k.m % 12 === 0 ? '#b5452b' : 'rgba(40,34,30,0.55)';
      c.fillText(lbl, cx, k.y + k.h - 8 * d);
    }
    if (view.hints && KEY_HINT[k.m]) {
      var full = view.keyLayout === 'full'; // in full mode the letters ARE the sheet music, so make them readable
      c.font = (full ? '700 ' : '600 ') + (full ? Math.max(10 * d, Math.min(L.ww * 0.42, 16 * d)) : Math.max(8 * d, fs * 0.8)) + 'px "JetBrains Mono", ui-monospace, monospace';
      c.fillStyle = k.black ? (full ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)') : (full ? 'rgba(40,34,30,0.75)' : 'rgba(40,34,30,0.38)');
      c.fillText(KEY_HINT[k.m], cx, k.black ? k.y + k.h - 8 * d : k.y + k.h - 8 * d - fs * 1.35);
    }
  }

  /* --- the static parts are painted ONCE into off-screen layers, then just copied each frame --- */
  var layers = { rows: null }; // per keyboard row: { bg, top, kb, kbY }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  function buildLayers() {
    if (!L.W) return;
    var d = L.dpr, W = L.W, out = [];
    L.rows.forEach(function (R, ri) {
      var rk = L.keys.filter(function (k) { return k.row === ri; });
      var bandH = R.kbTop - R.top;
      var bg = mkCanvas(W, Math.ceil(bandH)), b = bg.getContext('2d');
      var grd = b.createLinearGradient(0, 0, 0, bandH);
      grd.addColorStop(0, '#07060a'); grd.addColorStop(1, GAP);
      b.fillStyle = grd; b.fillRect(0, 0, W, bg.height);
      b.strokeStyle = 'rgba(255,255,255,0.05)'; b.lineWidth = d;
      rk.forEach(function (k) { if (k.m % 12 === 0) { b.beginPath(); b.moveTo(k.x + 0.5, 0); b.lineTo(k.x + 0.5, bandH); b.stroke(); } });

      var kbY = Math.floor(R.kbTop - 4 * d);
      var kb = mkCanvas(W, R.bottom - kbY), c = kb.getContext('2d');
      c.translate(0, -kbY); // draw in stage coordinates
      c.fillStyle = GAP; c.fillRect(0, kbY, W, R.bottom - kbY);
      c.fillStyle = '#5a1420'; c.fillRect(0, R.kbTop - 4 * d, W, 4 * d); // felt strip
      rk.forEach(function (k) { if (!k.black) paintWhite(c, k, 0); });
      rk.forEach(function (k) { if (k.black) paintBlack(c, k, false); });
      rk.forEach(function (k) { paintLabel(c, k); });
      out.push({ bg: bg, top: R.top, kb: kb, kbY: kbY });
    });
    layers = { rows: out };
  }
  var lastChordKey = '', lastChord = null;
  function draw() {
    var W = L.W, d = L.dpr, t = now();
    if (!W || !layers.rows || layers.rows.length !== L.rows.length) return;
    layers.rows.forEach(function (lr) { g2.drawImage(lr.bg, 0, lr.top); });

    // rising bars: plain fills with a soft halo (no shadowBlur, which is the slow part).
    // Each row's bars rise through that row's own band; anything that strays is covered by the keyboard layers below.
    var keep = [];
    for (var i = 0; i < bars.list.length; i++) {
      var b = bars.list[i], k = L.byMidi[b.m], R = L.rows[k ? k.row : 0];
      var speed = (R.kbTop - R.top) * 0.32; // px per second
      var top = R.kbTop - (t - b.t0) * speed;
      var bottom = b.t1 === null ? R.kbTop : R.kbTop - (t - b.t1) * speed;
      if (bottom < R.top) continue;
      keep.push(b);
      if (!k) continue;
      var bw = k.black ? k.w * 0.9 : k.w * 0.72, bx = k.x + (k.w - bw) / 2;
      var y = Math.max(top, R.top - 10), h = Math.max(bottom - y, 3 * d), hh = hue(b.m), rad = Math.min(6 * d, bw / 2);
      g2.fillStyle = 'hsla(' + hh + ',95%,60%,0.22)'; rr(g2, bx - 4 * d, y - 4 * d, bw + 8 * d, h + 8 * d, rad + 4 * d); g2.fill();
      g2.fillStyle = 'hsl(' + hh + ',90%,63%)'; rr(g2, bx, y, bw, h, rad); g2.fill();
      g2.fillStyle = 'rgba(255,255,255,0.35)'; g2.fillRect(bx + bw * 0.2, y + 2 * d, bw * 0.6, Math.min(3 * d, h / 3));
    }
    bars.list = keep;

    // keyboard: copy the cached layer, then repaint only keys that are down or ringing
    layers.rows.forEach(function (lr) { g2.drawImage(lr.kb, 0, lr.kbY); });
    var anyDown = holders.size || sustained.size;
    if (anyDown) {
      var blacksToFix = {};
      L.keys.forEach(function (k) {
        if (k.black) return;
        var st = holders.has(k.m) ? 1 : sustained.has(k.m) ? 2 : 0;
        if (!st) return;
        g2.fillStyle = GAP; g2.fillRect(k.x, k.y, k.w, k.h);
        paintWhite(g2, k, st); paintLabel(g2, k);
        if (L.byMidi[k.m - 1] && L.byMidi[k.m - 1].black) blacksToFix[k.m - 1] = 1;
        if (L.byMidi[k.m + 1] && L.byMidi[k.m + 1].black) blacksToFix[k.m + 1] = 1;
      });
      Object.keys(blacksToFix).forEach(function (m) {
        var k = L.byMidi[m]; if (!holders.has(+m)) { paintBlack(g2, k, false); paintLabel(g2, k); }
      });
      L.keys.forEach(function (k) {
        if (!k.black || !holders.has(k.m)) return;
        paintBlack(g2, k, true); paintLabel(g2, k);
      });
    }

    // chord + frequency readout (top-left; appears in recordings too). Recomputed only when notes change.
    var key = ''; holders.forEach(function (_, m) { key += m + ','; }); sustained.forEach(function (m) { key += m + ','; });
    if (key !== lastChordKey) {
      lastChordKey = key;
      var held = []; holders.forEach(function (_, m) { held.push(m); }); sustained.forEach(function (m) { if (held.indexOf(m) < 0) held.push(m); });
      lastChord = nameChord(held);
    }
    var ch = lastChord, pad = 16 * d;
    g2.textAlign = 'left'; g2.textBaseline = 'top';
    if (ch) {
      g2.font = '700 ' + Math.round(30 * d) + 'px "Fraunces", Georgia, serif';
      g2.fillStyle = 'rgba(255,255,255,0.92)'; g2.fillText(ch.big, pad, pad);
      g2.font = '500 ' + Math.round(13 * d) + 'px "DM Sans", system-ui, sans-serif';
      g2.fillStyle = 'rgba(255,255,255,0.55)'; g2.fillText(ch.small, pad, pad + 38 * d);
    }
    if (lastNote !== null) {
      g2.font = '600 ' + Math.round(12 * d) + 'px "JetBrains Mono", ui-monospace, monospace';
      g2.fillStyle = 'hsla(' + hue(lastNote) + ',90%,70%,0.85)';
      g2.fillText(noteName(lastNote) + ' · ' + freq(lastNote).toFixed(2) + ' Hz', pad, ch ? pad + 60 * d : pad);
    }
  }

  function loop() { draw(); recorder.tick(); requestAnimationFrame(loop); }

  /* ---------------- 5a. pointer / touch ---------------- */
  var pointers = new Map(); // pointerId -> midi currently under it
  function pt(e) {
    var r = cv.getBoundingClientRect(), a = rot(), u, v, w = r.width, h = r.height;
    if (a === 90) { u = e.clientY - r.top; v = r.right - e.clientX; w = r.height; h = r.width; }        // page turned clockwise
    else if (a === -90) { u = r.bottom - e.clientY; v = e.clientX - r.left; w = r.height; h = r.width; } // anticlockwise
    else { u = e.clientX - r.left; v = e.clientY - r.top; }
    return { x: u * L.W / w, y: v * L.H / h };
  }
  // Touch hit-testing with the black-key guard. In the upper part of the keyboard (the height of the black keys):
  //  - a touch just beside a black key counts as that black key (fingers are wider than the drawn key);
  //  - guard '1': a touch on a thin white strip right next to a black key plays nothing;
  //    whites still start up top where no black key is near (the E–F and B–C seams);
  //  - guard '2': no white key starts anywhere in the top band, seams included; whites start only from their lower part.
  //  A white note already sounding is never cut when the finger drifts up (see pointermove).
  var GUARD = { guard: true };
  var NEAR_BLACK = 0.12, GUARD_ZONE = 0.36; // in white-key widths
  function hit(x, y) {
    var k = keyAt(x, y);
    if (view.guard !== '1' && view.guard !== '2' || !L.rows.length) return k;
    var ri = -1, R = null;
    for (var i = 0; i < L.rows.length; i++) { if (y >= L.rows[i].kbTop && y < L.rows[i].bottom) { ri = i; R = L.rows[i]; break; } }
    if (!R) return k;
    if (y >= R.kbTop + R.kbH * 0.62) return k; // below the black keys: whites only
    if (k && k.black) return k;
    var best = null, bd = Infinity;
    L.keys.forEach(function (b) {
      if (!b.black || b.row !== ri) return;
      var d = x < b.x ? b.x - x : x > b.x + b.w ? x - (b.x + b.w) : 0;
      if (d < bd) { bd = d; best = b; }
    });
    if (best && bd <= R.ww * NEAR_BLACK) return best;
    if (view.guard === '2' || (best && bd <= R.ww * GUARD_ZONE)) return GUARD;
    return k;
  }
  function velFrom(k, y) { var f = Math.max(0, Math.min(1, (y - k.y) / k.h)); return 0.45 + f * 0.55; }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault(); initAudio();
    try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    var p = pt(e), k = hit(p.x, p.y);
    if (k === GUARD) return; // guarded strip: play nothing
    if (!k) { // the dark area above the keys: drag sideways to slide the keyboard (phone page)
      if (ZOOM && view.keyLayout !== 'full') drags.set(e.pointerId, { x0: p.x, start: view.startC, ww: L.ww });
      return;
    }
    pointers.set(e.pointerId, k.m); noteOn(k.m, velFrom(k, p.y), 'p' + e.pointerId);
  });
  var drags = new Map(); // pointerId -> {x0, start, ww}
  cv.addEventListener('pointermove', function (e) {
    var dg = drags.get(e.pointerId);
    if (dg) { // finger moves right -> the keys follow it right -> lower notes come in from the left
      var steps = Math.round((pt(e).x - dg.x0) / dg.ww), m = dg.start;
      for (var i = 0; i < Math.abs(steps); i++) m = steps > 0 ? (m > LOWEST ? whiteBefore(m) : m) : whiteAfter(m, 1);
      setStart(m, true);
      return;
    }
    if (!pointers.has(e.pointerId)) return;
    var p = pt(e), k = hit(p.x, p.y), cur = pointers.get(e.pointerId);
    if (k === GUARD) { // passing between black keys: never start a white here, and don't cut a note already sounding
      if (cur !== null && L.byMidi[cur] && L.byMidi[cur].black) { noteOff(cur, 'p' + e.pointerId); pointers.set(e.pointerId, null); }
      return;
    }
    var nm = k ? k.m : null; if (nm === cur) return;
    if (cur !== null) noteOff(cur, 'p' + e.pointerId);
    pointers.set(e.pointerId, nm);
    if (k) noteOn(k.m, velFrom(k, p.y), 'p' + e.pointerId); // glissando
  });
  function pointerEnd(e) {
    if (drags.has(e.pointerId)) { var dg = drags.get(e.pointerId); drags.delete(e.pointerId); if (view.startC !== dg.start) announce('pan'); return; }
    if (!pointers.has(e.pointerId)) return;
    var cur = pointers.get(e.pointerId); pointers.delete(e.pointerId);
    if (cur !== null) noteOff(cur, 'p' + e.pointerId);
  }
  cv.addEventListener('pointerup', pointerEnd);
  cv.addEventListener('pointercancel', pointerEnd);
  cv.addEventListener('lostpointercapture', pointerEnd);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------------- 5b. computer keyboard ---------------- */
  // Uses physical key positions (e.code), so it works on any keyboard layout.
  var LOWER = [['KeyZ', 0], ['KeyS', 1], ['KeyX', 2], ['KeyD', 3], ['KeyC', 4], ['KeyV', 5], ['KeyG', 6], ['KeyB', 7], ['KeyH', 8], ['KeyN', 9], ['KeyJ', 10], ['KeyM', 11],
    ['Comma', 12], ['KeyL', 13], ['Period', 14], ['Semicolon', 15], ['Slash', 16]];
  var UPPER = [['KeyQ', 0], ['Digit2', 1], ['KeyW', 2], ['Digit3', 3], ['KeyE', 4], ['KeyR', 5], ['Digit5', 6], ['KeyT', 7], ['Digit6', 8], ['KeyY', 9], ['Digit7', 10], ['KeyU', 11],
    ['KeyI', 12], ['Digit9', 13], ['KeyO', 14], ['Digit0', 15], ['KeyP', 16], ['BracketLeft', 17], ['Equal', 18], ['BracketRight', 19]];
  var CODE_LABEL = { Comma: ',', Period: '.', Semicolon: ';', Slash: '/', BracketLeft: '[', BracketRight: ']', Equal: '=' };
  // "Full" layout (OnlinePianist / VirtualPiano style): 36 white keys across four rows of the keyboard,
  // and Shift + the same key plays the black key just above it. '1' = C, '8' = C, 't' = C, 's' = C, 'l' = C, 'm' = C.
  var FULL_WHITE = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0',
    'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP',
    'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL',
    'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'];
  var SHIFTED_DIGIT = { Digit1: '!', Digit2: '@', Digit3: '#', Digit4: '$', Digit5: '%', Digit6: '^', Digit7: '&', Digit8: '*', Digit9: '(', Digit0: ')' };
  var WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
  var codeMap = {};
  function rebuildKeyMap() {
    codeMap = {}; KEY_HINT = {};
    if (view.keyLayout === 'full') {
      FULL_WHITE.forEach(function (code, i) {
        var m = L.lo + Math.floor(i / 7) * 12 + WHITE_STEPS[i % 7];
        var plain = code.replace('Key', '').replace('Digit', '').toLowerCase();
        codeMap[code] = m; KEY_HINT[m] = plain;
        if (IS_BLACK[(m + 1) % 12]) {
          codeMap['S+' + code] = m + 1;
          KEY_HINT[m + 1] = SHIFTED_DIGIT[code] || plain.toUpperCase();
        }
      });
      buildLayers();
      return;
    }
    var oct = (L.hi - L.lo) / 12;
    var c0 = Math.floor(L.lo / 12) * 12; // computer-key rows are piano-shaped, so anchor them on a C (= L.lo on the desktop page)
    var lowerBase = c0, upperBase = c0 + 12;
    if (oct >= 3) { lowerBase = c0 + 12; upperBase = c0 + 24; } // keep the two rows centred on wide keyboards
    if (oct <= 1) { lowerBase = c0 - 12; upperBase = c0; }        // 1-octave view: upper row = what you see
    function add(list, base) {
      list.forEach(function (p) {
        var m = base + p[1]; codeMap[p[0]] = m;
        if (KEY_HINT[m] === undefined) KEY_HINT[m] = CODE_LABEL[p[0]] || p[0].replace('Key', '').replace('Digit', '');
      });
    }
    add(UPPER, upperBase); add(LOWER, lowerBase);
    buildLayers();
  }
  function typing(e) { var t = e.target; return t && (t.tagName === 'INPUT' && t.type === 'text' || t.tagName === 'TEXTAREA' || t.isContentEditable); }

  window.addEventListener('keydown', function (e) {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) { initAudio(); setSustain(true); } return; }
    if (e.code === 'ArrowLeft') { e.preventDefault(); shiftOct(-1); return; }
    if (e.code === 'ArrowRight') { e.preventDefault(); shiftOct(1); return; }
    if (e.code === 'Escape') { silenceAll(); return; }
    var m = (e.shiftKey && codeMap['S+' + e.code] !== undefined) ? codeMap['S+' + e.code] : codeMap[e.code];
    if (m === undefined) return;
    e.preventDefault(); if (e.repeat) return;
    if (document.activeElement && document.activeElement.tagName === 'SELECT') document.activeElement.blur();
    initAudio(); noteOn(m, 0.78, 'k' + e.code);
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'Space') { if (!latchSustain) setSustain(false); return; }
    // the key->note map may have shifted since keydown, so release whatever this key holds
    holders.forEach(function (set, mm) { if (set.has('k' + e.code)) noteOff(mm, 'k' + e.code); });
  });
  window.addEventListener('blur', function () { holders.forEach(function (set, m) { set.forEach(function (s) { if (s[0] === 'k' || s[0] === 'p') noteOff(m, s); }); }); });

  /* ---------------- 5c. Web MIDI ---------------- */
  if (navigator.requestMIDIAccess) {
    var mb = $('#midiBtn'); mb.hidden = false;
    mb.addEventListener('click', function () {
      initAudio();
      navigator.requestMIDIAccess().then(function (access) {
        function hook() {
          var n = 0;
          access.inputs.forEach(function (inp) { n++; inp.onmidimessage = onMidi; });
          mb.textContent = n ? '🎛 MIDI · ' + n + ' connected' : '🎛 MIDI · plug one in';
          mb.setAttribute('aria-pressed', n ? 'true' : 'false');
        }
        hook(); access.onstatechange = hook;
      }).catch(function () { showMsg('MIDI access was blocked. Allow it in the browser’s site settings to use a MIDI keyboard.'); });
    });
  }
  function onMidi(ev) {
    var s = ev.data[0] & 0xf0, a = ev.data[1], b = ev.data[2];
    if (s === 0x90 && b > 0) noteOn(a, b / 127, 'midi');
    else if (s === 0x80 || (s === 0x90 && b === 0)) noteOff(a, 'midi');
    else if (s === 0xb0 && a === 64) setSustain(b >= 64 || latchSustain);
  }

  /* ---------------- toolbar wiring ---------------- */
  function shiftOct(dir) {
    view.startC += 12 * dir;
    layout(recorder.isLive());
    store.set(START_KEY, view.startC); rebuildKeyMap();
  }
  if ($('#octDown')) $('#octDown').addEventListener('click', function () { shiftOct(-1); });
  holdRepeat($('#panLeft'), -1); holdRepeat($('#panRight'), 1);
  if ($('#zoomIn')) {
    $('#zoomIn').addEventListener('click', function () { zoomBy(-1); });
    $('#zoomOut').addEventListener('click', function () { zoomBy(1); });
  }
  if ($('#octUp')) $('#octUp').addEventListener('click', function () { shiftOct(1); });

  var sel = {
    instrument: $('#instrument'), octaves: $('#octaves'), labels: $('#labels'),
    volume: $('#volume'), reverb: $('#reverb'), hints: $('#kbHints')
  };
  sel.instrument.value = settings.instrument;
  sel.octaves.value = view.octSetting;
  sel.labels.value = view.labels;
  sel.volume.value = settings.volume;
  sel.reverb.checked = settings.reverb;
  sel.hints.checked = view.hints;
  var layoutSel = $('#keyLayout'); layoutSel.value = view.keyLayout;
  function showKeymapHelp() {
    document.querySelectorAll('[data-layout]').forEach(function (el) { el.hidden = el.getAttribute('data-layout') !== view.keyLayout; });
  }
  showKeymapHelp();
  layoutSel.addEventListener('change', function () {
    view.keyLayout = this.value; store.set('keyLayout', this.value); this.blur();
    if (this.value === 'full') view.startC = 36; // C2..C7, the standard 61-key range
    else view.startC = 48;
    store.set(START_KEY, view.startC);
    layout(recorder.isLive()); rebuildKeyMap(); showKeymapHelp();
  });

  sel.instrument.addEventListener('change', function () { settings.instrument = this.value; store.set('instrument', this.value); this.blur(); syncStops(); });
  // Harmonium reed stops (checkboxes with data-reed). Pulling a stop while another sound is chosen switches to the 3-reed harmonium.
  var reedBoxes = document.querySelectorAll('[data-reed]');
  function syncStops() {
    reedBoxes.forEach(function (b) { b.checked = !!settings.reeds[b.getAttribute('data-reed')]; });
    var box = $('#reedStops'); if (box && box.hasAttribute('data-auto-hide')) box.hidden = settings.instrument !== 'harmonium3';
  }
  reedBoxes.forEach(function (b) {
    b.addEventListener('change', function () {
      settings.reeds[b.getAttribute('data-reed')] = b.checked;
      store.set('reeds', JSON.stringify(settings.reeds));
      if (settings.instrument !== 'harmonium3') { settings.instrument = 'harmonium3'; sel.instrument.value = 'harmonium3'; store.set('instrument', 'harmonium3'); }
      syncStops();
    });
  });
  syncStops();
  sel.octaves.addEventListener('change', function () {
    view.octSetting = this.value; store.set('octaves', this.value); this.blur();
    if (ZOOM) { view.zoom = { up: 'auto', side: 'auto' }; store.set('zoom-up', 'auto'); store.set('zoom-side', 'auto'); } // octaves win
    layout(recorder.isLive()); rebuildKeyMap();
  });
  sel.labels.addEventListener('change', function () { view.labels = this.value; store.set('labels', this.value); this.blur(); buildLayers(); });
  sel.volume.addEventListener('input', function () { settings.volume = parseFloat(this.value); store.set('volume', this.value); if (master) master.gain.setTargetAtTime(settings.volume, ac.currentTime, 0.02); });
  sel.reverb.addEventListener('change', function () { settings.reverb = this.checked; store.set('reverb', this.checked ? '1' : '0'); if (wet) wet.gain.setTargetAtTime(this.checked ? 0.28 : 0, ac.currentTime, 0.05); });
  var guardBox = $('#blackGuard'); // only on pages that offer it
  if (guardBox) {
    guardBox.value = view.guard;
    if (guardBox.value !== view.guard) { view.guard = guardBox.value = '2'; } // unknown saved value -> the phone default
    guardBox.addEventListener('change', function () { view.guard = this.value; store.set('guard', this.value); this.blur(); });
  }
  var rowsSel = $('#rows'); // only on pages that offer stacked rows
  if (rowsSel) {
    rowsSel.value = view.rows;
    rowsSel.addEventListener('change', function () {
      view.rows = this.value; store.set('rows', this.value); this.blur();
      layout(recorder.isLive()); rebuildKeyMap();
    });
  }
  sel.hints.addEventListener('change', function () { view.hints = this.checked; store.set('hints', this.checked ? '1' : '0'); buildLayers(); });
  $('#sustainBtn').addEventListener('click', function () { initAudio(); latchSustain = !sustainOn; setSustain(!sustainOn); });

  /* ---------------- under-the-hood demos ---------------- */
  document.querySelectorAll('[data-demo]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      initAudio(); if (!ac) return;
      var demo = btn.getAttribute('data-demo'), keep = settings.instrument;
      var seq = demo === 'octave'
        ? [[57, 'piano'], [69, 'piano'], [81, 'piano']]
        : [[60, 'piano'], [60, 'epiano'], [60, 'organ'], [60, 'strings'], [60, 'harmonium'], [60, 'musicbox']];
      $('#studio').scrollIntoView({ behavior: 'smooth', block: 'center' });
      seq.forEach(function (s, i) {
        setTimeout(function () {
          settings.instrument = s[1]; noteOn(s[0], 0.8, 'demo');
          setTimeout(function () { noteOff(s[0], 'demo'); }, 750);
          if (i === seq.length - 1) setTimeout(function () { settings.instrument = keep; }, 50);
        }, 400 + i * 950);
      });
    });
  });

  /* ---------------- 6. recorder ---------------- */
  function showMsg(t) { var el = $('#recMsg'); el.textContent = t; el.hidden = !t; }
  function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }

  var MIME_CANDIDATES = [
    // H.264 MP4 first: plays everywhere (WhatsApp, Instagram, iPhone). Then WebM. Plain MP4 last (Safari).
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1.4D401F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'
  ];
  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    for (var i = 0; i < MIME_CANDIDATES.length; i++) if (MediaRecorder.isTypeSupported(MIME_CANDIDATES[i])) return MIME_CANDIDATES[i];
    return '';
  }

  var recorder = (function () {
    var state = 'idle', mr = null, chunks = [], t0 = 0, elapsed = 0, mime = '', takeNo = 0;
    var btn = $('#recBtn'), label = $('#recLabel'), timeEl = $('#recTime');
    var supported = !!(window.MediaRecorder && cv.captureStream);
    mime = pickMime();
    $('#recInfo').textContent = supported
      ? 'Saves as ' + (mime.indexOf('mp4') >= 0 ? 'MP4' : 'WebM') + ' · keyboard video + sound'
      : '';
    if (!supported) {
      showMsg('This browser can’t record video from the page. Recent Chrome, Edge, Firefox or Safari (iOS 15+) can. You can still play.');
      btn.disabled = true; btn.style.opacity = .4;
    }

    function paint() {
      btn.classList.toggle('armed', state === 'armed');
      btn.classList.toggle('live', state === 'live');
      label.textContent = state === 'idle' ? 'Record' : state === 'armed' ? 'Waiting for first note… (tap to cancel)' : 'Stop';
      timeEl.classList.toggle('live', state === 'live');
    }

    function begin() {
      initAudio();
      if (!ac || !recDest) { showMsg('Audio recording isn’t available in this browser.'); state = 'idle'; paint(); return; }
      var vs = cv.captureStream(30);
      var stream = new MediaStream(vs.getVideoTracks().concat(recDest.stream.getAudioTracks()));
      var opts = { videoBitsPerSecond: 6000000, audioBitsPerSecond: 160000 };
      if (mime) opts.mimeType = mime;
      try { mr = new MediaRecorder(stream, opts); }
      catch (e) { try { mr = new MediaRecorder(stream); } catch (e2) { showMsg('Could not start the recorder: ' + e2.message); state = 'idle'; paint(); return; } }
      chunks = [];
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        vs.getTracks().forEach(function (tr) { tr.stop(); });
        finish(new Blob(chunks, { type: mr.mimeType || mime || 'video/webm' }), elapsed);
      };
      mr.start(1000);
      t0 = performance.now(); elapsed = 0; state = 'live'; paint(); showMsg('');
    }

    function finish(blob, secs) {
      takeNo++;
      var ext = blob.type.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
      var d = new Date(), stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') +
        '_' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
      var url = URL.createObjectURL(blob);
      var card = document.createElement('div'); card.className = 'take';
      card.innerHTML =
        '<video controls playsinline preload="metadata"></video>' +
        '<div class="meta"><input type="text" aria-label="Take name"><small></small></div>' +
        '<div class="acts"><a class="btn small">⬇ Download</a><button type="button" class="btn small ghost share" hidden>↗ Share</button><button type="button" class="btn small danger del">🗑 Delete</button></div>';
      var video = card.querySelector('video'), nameIn = card.querySelector('input'), a = card.querySelector('a');
      video.src = url;
      // WebM files from MediaRecorder have no duration header; this nudge makes the preview seekable.
      video.addEventListener('loadedmetadata', function fix() {
        if (video.duration === Infinity) { video.currentTime = 1e7; video.addEventListener('timeupdate', function once() { video.removeEventListener('timeupdate', once); video.currentTime = 0; }); }
      }, { once: true });
      nameIn.value = 'piano-take-' + takeNo + '_' + stamp;
      card.querySelector('small').textContent = fmtTime(secs) + ' · ' + fmtSize(blob.size) + ' · ' + ext.toUpperCase();
      function fileName() { return (nameIn.value.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'piano-take') + '.' + ext; }
      a.href = url; a.download = fileName();
      nameIn.addEventListener('input', function () { a.download = fileName(); });
      a.addEventListener('click', function () { card.classList.add('saved'); card.dataset.saved = '1'; });
      var sh = card.querySelector('.share');
      try {
        var probe = new File([blob], fileName(), { type: blob.type.split(';')[0] });
        if (navigator.canShare && navigator.canShare({ files: [probe] })) {
          sh.hidden = false;
          sh.addEventListener('click', function () {
            var f = new File([blob], fileName(), { type: blob.type.split(';')[0] });
            navigator.share({ files: [f], title: nameIn.value }).then(function () { card.classList.add('saved'); card.dataset.saved = '1'; }).catch(function () { });
          });
        }
      } catch (e) { }
      card.querySelector('.del').addEventListener('click', function () {
        if (!card.dataset.saved && !confirm('Delete this take? It hasn’t been downloaded.')) return;
        URL.revokeObjectURL(url); card.remove();
      });
      var list = $('#takes'); list.insertBefore(card, list.firstChild);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      state = 'idle'; paint(); layout(); rebuildKeyMap();
    }

    btn.addEventListener('click', function () {
      if (!supported) return;
      initAudio();
      if (state === 'idle') {
        if ($('#waitFirst').checked) { state = 'armed'; paint(); }
        else begin();
      } else if (state === 'armed') { state = 'idle'; paint(); }
      else if (state === 'live') { state = 'stopping'; paint(); if (mr && mr.state !== 'inactive') mr.stop(); }
    });

    window.addEventListener('beforeunload', function (e) {
      var unsaved = Array.prototype.some.call(document.querySelectorAll('.take'), function (c) { return !c.dataset.saved; });
      if (unsaved || state === 'live') { e.preventDefault(); e.returnValue = ''; }
    });

    return {
      isLive: function () { return state === 'live' || state === 'stopping'; },
      onFirstNote: function () { if (state === 'armed') begin(); },
      tick: function () {
        if (state === 'live') { elapsed = (performance.now() - t0) / 1000; timeEl.textContent = fmtTime(elapsed); }
      }
    };
  })();

  /* ---------------- boot ---------------- */
  var resizeT;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { layout(); rebuildKeyMap(); }, 120); });
  layout(); rebuildKeyMap();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildLayers); // repaint labels in the real fonts
  requestAnimationFrame(loop);
})();
