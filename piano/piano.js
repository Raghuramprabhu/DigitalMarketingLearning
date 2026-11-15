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
  var ac = null, master, comp, out, wet, recDest, noiseBuf, waves = {};
  var settings = {
    instrument: store.get('instrument', 'piano'),
    volume: parseFloat(store.get('volume', '0.8')),
    reverb: store.get('reverb', '1') === '1'
  };

  function makeImpulse(sec, decay) {
    var len = Math.floor(ac.sampleRate * sec), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function periodic(amps) {
    var real = new Float32Array(amps.length), imag = new Float32Array(amps.length);
    for (var i = 1; i < amps.length; i++) imag[i] = amps[i];
    return ac.createPeriodicWave(real, imag);
  }

  function initAudio() {
    if (ac) { if (ac.state !== 'running') ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { showMsg('This browser has no Web Audio support, so it cannot make sound.'); return; }
    ac = new AC({ latencyHint: 'interactive' });
    master = ac.createGain(); master.gain.value = settings.volume;
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    out = ac.createGain();
    var conv = ac.createConvolver(); conv.buffer = makeImpulse(2.4, 2.8);
    wet = ac.createGain(); wet.gain.value = settings.reverb ? 0.28 : 0;
    master.connect(comp); comp.connect(out); comp.connect(conv); conv.connect(wet); wet.connect(out);
    out.connect(ac.destination);
    if (ac.createMediaStreamDestination) { recDest = ac.createMediaStreamDestination(); out.connect(recDest); }

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
    var nd = noiseBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // Overtone recipes: index = harmonic number, value = loudness.
    waves.piano = periodic([0, 1, 0.55, 0.32, 0.24, 0.16, 0.1, 0.07, 0.05, 0.035, 0.02]);
    waves.organ = periodic([0, 1, 0.9, 0.45, 0.55, 0, 0.32, 0, 0.3, 0, 0, 0, 0.15]);
    waves.box = periodic([0, 1, 0, 0.12, 0, 0.05]);
    $('#tapToStart').classList.add('gone');
  }

  function holdAndRelease(param, t, tc) {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else { var v = param.value; param.cancelScheduledValues(t); param.setValueAtTime(v, t); }
    param.setTargetAtTime(0, t, tc);
  }
  function osc(type, f, t, detune) {
    var o = ac.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = f; if (detune) o.detune.value = detune; o.start(t); return o;
  }

  // Each instrument returns { release(t), kill(t) }.
  var INSTR = {
    piano: function (m, f, vel, t) {
      var g = ac.createGain(), lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 0.6;
      lp.frequency.setValueAtTime(Math.min(f * 12, 14000), t);
      lp.frequency.setTargetAtTime(Math.min(f * 3, 6000), t, 0.35 + vel * 0.3);
      var a = osc(waves.piano, f, t, -2.5), b = osc(waves.piano, f, t, 2.5);
      a.connect(lp); b.connect(lp); lp.connect(g); g.connect(master);
      var peak = 0.22 * (0.35 + vel * 0.9);
      var ring = Math.max(1.2, Math.min(7, 8 - (m - 33) * 0.09)); // low notes ring longer
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.004);
      g.gain.setTargetAtTime(peak * 0.42, t + 0.005, 0.12);
      g.gain.setTargetAtTime(0, t + 0.3, ring / 3.2);
      // hammer thump
      var n = ac.createBufferSource(); n.buffer = noiseBuf;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(f * 2.5, 5000); bp.Q.value = 1.2;
      var ng = ac.createGain(); ng.gain.setValueAtTime(0.05 * vel, t); ng.gain.setTargetAtTime(0, t, 0.012);
      n.connect(bp); bp.connect(ng); ng.connect(master); n.start(t); n.stop(t + 0.1);
      var end = t + ring * 2.2; a.stop(end); b.stop(end);
      return {
        release: function (r) { holdAndRelease(g.gain, r, 0.09); a.stop(r + 0.8); b.stop(r + 0.8); },
        kill: function (r) { holdAndRelease(g.gain, r, 0.01); a.stop(r + 0.1); b.stop(r + 0.1); }
      };
    },
    epiano: function (m, f, vel, t) {
      var g = ac.createGain();
      var car = osc('sine', f, t), mod = osc('sine', f, t), bell = osc('sine', f * 14, t);
      var mg = ac.createGain(), bg = ac.createGain();
      mg.gain.setValueAtTime(f * (0.8 + vel * 2.2), t); mg.gain.setTargetAtTime(f * 0.25, t, 0.35);
      bg.gain.setValueAtTime(f * 0.9 * vel, t); bg.gain.setTargetAtTime(0, t, 0.05);
      mod.connect(mg); mg.connect(car.frequency); bell.connect(bg); bg.connect(car.frequency);
      car.connect(g); g.connect(master);
      var peak = 0.26 * (0.35 + vel * 0.8);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.003);
      g.gain.setTargetAtTime(0, t + 0.01, 1.4);
      var all = [car, mod, bell], end = t + 6;
      all.forEach(function (o) { o.stop(end); });
      return {
        release: function (r) { holdAndRelease(g.gain, r, 0.12); all.forEach(function (o) { o.stop(r + 1); }); },
        kill: function (r) { holdAndRelease(g.gain, r, 0.01); all.forEach(function (o) { o.stop(r + 0.1); }); }
      };
    },
    organ: function (m, f, vel, t) {
      var g = ac.createGain(), a = osc(waves.organ, f, t);
      var lfo = osc('sine', 5.6, t), lg = ac.createGain(); lg.gain.value = 3; lfo.connect(lg); lg.connect(a.detune);
      a.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 + vel * 0.05, t + 0.012);
      return {
        release: function (r) { holdAndRelease(g.gain, r, 0.03); a.stop(r + 0.3); lfo.stop(r + 0.3); },
        kill: function (r) { holdAndRelease(g.gain, r, 0.01); a.stop(r + 0.1); lfo.stop(r + 0.1); }
      };
    },
    strings: function (m, f, vel, t) {
      var g = ac.createGain(), lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = Math.min(f * 5, 3200); lp.Q.value = 0.5;
      var a = osc('sawtooth', f, t, -8), b = osc('sawtooth', f, t, 7), c = osc('sawtooth', f / 2, t, 0);
      var cg = ac.createGain(); cg.gain.value = 0.3;
      a.connect(lp); b.connect(lp); c.connect(cg); cg.connect(lp); lp.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 + vel * 0.05, t + 0.18);
      var all = [a, b, c];
      return {
        release: function (r) { holdAndRelease(g.gain, r, 0.32); all.forEach(function (o) { o.stop(r + 2); }); },
        kill: function (r) { holdAndRelease(g.gain, r, 0.01); all.forEach(function (o) { o.stop(r + 0.1); }); }
      };
    },
    musicbox: function (m, f, vel, t) {
      var g = ac.createGain(), a = osc(waves.box, f * 2, t), b = osc('sine', f * 2 * 4.2, t), bg = ac.createGain();
      bg.gain.value = 0.18; a.connect(g); b.connect(bg); bg.connect(g); g.connect(master);
      var peak = 0.2 * (0.4 + vel * 0.7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.002);
      g.gain.setTargetAtTime(0, t + 0.003, 0.55);
      a.stop(t + 4); b.stop(t + 4);
      return {
        release: function () { /* a music box tine rings on its own */ },
        kill: function (r) { holdAndRelease(g.gain, r, 0.01); a.stop(r + 0.1); b.stop(r + 0.1); }
      };
    }
  };

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
  var cv = $('#stage'), g2 = cv.getContext('2d');
  var view = {
    octSetting: store.get('octaves', 'auto'),
    startC: parseInt(store.get('startC', '48'), 10), // MIDI number of the leftmost C
    labels: store.get('labels', 'letters'),
    hints: store.get('hints', (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? '0' : '1') === '1'
  };
  var L = { W: 0, H: 0, dpr: 1, keys: [], byMidi: {}, kbTop: 0, kbH: 0, ww: 0, lo: 48, hi: 84 };

  function octavesFor(cssW) {
    if (view.octSetting !== 'auto') return parseInt(view.octSetting, 10);
    return Math.max(1, Math.min(4, Math.floor(cssW / 50 / 7)));
  }

  // keepSize: re-lay the keys (new range) but keep the canvas pixel size, so a
  // recording in progress never changes resolution.
  function layout(keepSize) {
    if (recorder.isLive() && !keepSize) return;
    var r = cv.getBoundingClientRect();
    if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W, H;
    if (keepSize && cv.width) { W = cv.width; H = cv.height; dpr = W / r.width; }
    else {
      W = Math.round(r.width * dpr / 2) * 2; H = Math.round(r.height * dpr / 2) * 2; // even dims for video encoders
      cv.width = W; cv.height = H;
    }
    var oct = octavesFor(r.width);
    view.startC = Math.max(12, Math.min(108 - 12 * oct, view.startC));
    var lo = view.startC, hi = lo + 12 * oct;
    var whites = 0; for (var m = lo; m <= hi; m++) if (!IS_BLACK[m % 12]) whites++;
    var ww = W / whites;
    var kbH = Math.min(H * 0.46, ww * 5.4, 260 * dpr);
    var kbTop = H - kbH;
    var keys = [], byMidi = {}, wi = 0;
    for (m = lo; m <= hi; m++) {
      var k = { m: m, black: !!IS_BLACK[m % 12] };
      if (!k.black) { k.x = wi * ww; k.w = ww; k.h = kbH; wi++; }
      else {
        var bw = ww * 0.58, nudge = { 1: -0.12, 3: 0.12, 6: -0.14, 8: 0, 10: 0.14 }[m % 12] * bw;
        k.x = wi * ww - bw / 2 + nudge; k.w = bw; k.h = kbH * 0.62;
      }
      k.y = kbTop; keys.push(k); byMidi[m] = k;
    }
    L = { W: W, H: H, dpr: dpr, keys: keys, byMidi: byMidi, kbTop: kbTop, kbH: kbH, ww: ww, lo: lo, hi: hi };
    $('#octLabel').textContent = noteName(lo);
  }

  function keyAt(x, y) {
    if (y < L.kbTop) return null;
    var i, k;
    for (i = 0; i < L.keys.length; i++) { k = L.keys[i]; if (k.black && x >= k.x && x < k.x + k.w && y < k.y + k.h) return k; }
    for (i = 0; i < L.keys.length; i++) { k = L.keys[i]; if (!k.black && x >= k.x && x < k.x + k.w) return k; }
    return null;
  }

  // Rising note bars: a bar is born when a key goes down and its top travels upward.
  var bars = {
    list: [], open: new Map(),
    start: function (m) { var b = { m: m, t0: now(), t1: null }; this.list.push(b); this.open.set(m, b); },
    end: function (m) { var b = this.open.get(m); if (b) { b.t1 = now(); this.open.delete(m); } }
  };
  function now() { return performance.now() / 1000; }

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g2.beginPath(); g2.moveTo(x + r, y); g2.arcTo(x + w, y, x + w, y + h, r); g2.arcTo(x + w, y + h, x, y + h, r);
    g2.arcTo(x, y + h, x, y, r); g2.arcTo(x, y, x + w, y, r); g2.closePath();
  }

  var KEY_HINT = {}; // midi -> computer key label (rebuilt when octave moves)

  function draw() {
    var W = L.W, H = L.H, d = L.dpr, t = now();
    if (!W) return;
    // background
    var bg = g2.createLinearGradient(0, 0, 0, L.kbTop);
    bg.addColorStop(0, '#07060a'); bg.addColorStop(1, '#171320');
    g2.fillStyle = bg; g2.fillRect(0, 0, W, H);

    // faint octave lines at every C
    g2.strokeStyle = 'rgba(255,255,255,0.05)'; g2.lineWidth = 1 * d;
    L.keys.forEach(function (k) { if (k.m % 12 === 0) { g2.beginPath(); g2.moveTo(k.x + 0.5, 0); g2.lineTo(k.x + 0.5, L.kbTop); g2.stroke(); } });

    // rising bars
    var speed = L.kbTop * 0.32; // px per second
    var keep = [];
    g2.save();
    for (var i = 0; i < bars.list.length; i++) {
      var b = bars.list[i], k = L.byMidi[b.m];
      var top = L.kbTop - (t - b.t0) * speed;
      var bottom = b.t1 === null ? L.kbTop : L.kbTop - (t - b.t1) * speed;
      if (bottom < 0) continue;
      keep.push(b);
      if (!k) continue;
      var bw = k.black ? k.w * 0.9 : k.w * 0.72, bx = k.x + (k.w - bw) / 2;
      var h = Math.max(bottom - top, 3 * d);
      var hh = hue(b.m);
      g2.shadowColor = 'hsla(' + hh + ',95%,60%,0.85)'; g2.shadowBlur = 14 * d;
      var gr = g2.createLinearGradient(0, top, 0, bottom);
      gr.addColorStop(0, 'hsla(' + hh + ',90%,72%,0.95)'); gr.addColorStop(1, 'hsla(' + hh + ',90%,55%,0.85)');
      g2.fillStyle = gr; rr(bx, Math.max(top, -10), bw, h, Math.min(6 * d, bw / 2)); g2.fill();
    }
    g2.restore();
    bars.list = keep;

    // felt strip
    g2.fillStyle = '#5a1420'; g2.fillRect(0, L.kbTop - 4 * d, W, 4 * d);

    // white keys
    L.keys.forEach(function (k) {
      if (k.black) return;
      var down = holders.has(k.m), ring = !down && (sustained.has(k.m));
      var gr = g2.createLinearGradient(0, k.y, 0, k.y + k.h);
      if (down) { gr.addColorStop(0, 'hsl(' + hue(k.m) + ',80%,78%)'); gr.addColorStop(1, 'hsl(' + hue(k.m) + ',70%,64%)'); }
      else { gr.addColorStop(0, '#f4f1ea'); gr.addColorStop(0.85, '#fffefb'); gr.addColorStop(1, ring ? 'hsl(' + hue(k.m) + ',60%,85%)' : '#ddd8cd'); }
      g2.fillStyle = gr;
      rr(k.x + 0.75 * d, k.y + (down ? 2 * d : 0), k.w - 1.5 * d, k.h - (down ? 2 * d : 0), 5 * d); g2.fill();
    });
    // black keys
    L.keys.forEach(function (k) {
      if (!k.black) return;
      var down = holders.has(k.m);
      var gr = g2.createLinearGradient(0, k.y, 0, k.y + k.h);
      if (down) { gr.addColorStop(0, 'hsl(' + hue(k.m) + ',75%,45%)'); gr.addColorStop(1, 'hsl(' + hue(k.m) + ',80%,58%)'); }
      else { gr.addColorStop(0, '#1b1a1f'); gr.addColorStop(0.9, '#34323a'); gr.addColorStop(1, '#141318'); }
      g2.fillStyle = gr; rr(k.x, k.y - 2 * d, k.w, k.h + (down ? 0 : -2 * d), 4 * d); g2.fill();
      if (!down) { g2.fillStyle = 'rgba(255,255,255,0.08)'; g2.fillRect(k.x + k.w * 0.18, k.y, k.w * 0.64, k.h * 0.85); }
    });

    // labels
    var fs = Math.max(9 * d, Math.min(L.ww * 0.3, 15 * d));
    g2.textAlign = 'center'; g2.textBaseline = 'alphabetic';
    L.keys.forEach(function (k) {
      var cx = k.x + k.w / 2, lbl = null;
      if (view.labels === 'letters') lbl = k.black ? null : (k.m % 12 === 0 ? noteName(k.m) : NAMES[k.m % 12]);
      if (view.labels === 'sargam') lbl = k.black ? null : SARGAM[k.m % 12];
      if (lbl) {
        g2.font = '700 ' + fs + 'px "DM Sans", system-ui, sans-serif';
        g2.fillStyle = k.m % 12 === 0 ? '#b5452b' : 'rgba(40,34,30,0.55)';
        g2.fillText(lbl, cx, k.y + k.h - 8 * d);
      }
      if (view.hints && KEY_HINT[k.m]) {
        var hs = Math.max(8 * d, fs * 0.8);
        g2.font = '600 ' + hs + 'px "JetBrains Mono", ui-monospace, monospace';
        g2.fillStyle = k.black ? 'rgba(255,255,255,0.55)' : 'rgba(40,34,30,0.38)';
        g2.fillText(KEY_HINT[k.m], cx, k.black ? k.y + k.h - 8 * d : k.y + k.h - 8 * d - fs * 1.35);
      }
    });

    // chord + frequency readout (top-left; appears in recordings too)
    var held = []; holders.forEach(function (_, m) { held.push(m); }); sustained.forEach(function (m) { if (held.indexOf(m) < 0) held.push(m); });
    var pad = 16 * d;
    g2.textAlign = 'left'; g2.textBaseline = 'top';
    var ch = nameChord(held);
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
  function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * L.W / r.width, y: (e.clientY - r.top) * L.H / r.height }; }
  function velFrom(k, y) { var f = Math.max(0, Math.min(1, (y - k.y) / k.h)); return 0.45 + f * 0.55; }

  cv.addEventListener('pointerdown', function (e) {
    e.preventDefault(); initAudio();
    try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    var p = pt(e), k = keyAt(p.x, p.y); if (!k) return;
    pointers.set(e.pointerId, k.m); noteOn(k.m, velFrom(k, p.y), 'p' + e.pointerId);
  });
  cv.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    var p = pt(e), k = keyAt(p.x, p.y), cur = pointers.get(e.pointerId);
    var nm = k ? k.m : null; if (nm === cur) return;
    if (cur !== null) noteOff(cur, 'p' + e.pointerId);
    pointers.set(e.pointerId, nm);
    if (k) noteOn(k.m, velFrom(k, p.y), 'p' + e.pointerId); // glissando
  });
  function pointerEnd(e) {
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
  var codeMap = {};
  function rebuildKeyMap() {
    codeMap = {}; KEY_HINT = {};
    var oct = (L.hi - L.lo) / 12;
    var lowerBase = L.lo, upperBase = L.lo + 12;
    if (oct >= 3) { lowerBase = L.lo + 12; upperBase = L.lo + 24; } // keep the two rows centred on wide keyboards
    if (oct <= 1) { lowerBase = L.lo - 12; upperBase = L.lo; }        // 1-octave view: upper row = what you see
    function add(list, base) {
      list.forEach(function (p) {
        var m = base + p[1]; codeMap[p[0]] = m;
        if (KEY_HINT[m] === undefined) KEY_HINT[m] = CODE_LABEL[p[0]] || p[0].replace('Key', '').replace('Digit', '');
      });
    }
    add(UPPER, upperBase); add(LOWER, lowerBase);
  }
  function typing(e) { var t = e.target; return t && (t.tagName === 'INPUT' && t.type === 'text' || t.tagName === 'TEXTAREA' || t.isContentEditable); }

  window.addEventListener('keydown', function (e) {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) { initAudio(); setSustain(true); } return; }
    if (e.code === 'ArrowLeft') { e.preventDefault(); shiftOct(-1); return; }
    if (e.code === 'ArrowRight') { e.preventDefault(); shiftOct(1); return; }
    if (e.code === 'Escape') { silenceAll(); return; }
    var m = codeMap[e.code]; if (m === undefined) return;
    e.preventDefault(); if (e.repeat) return;
    if (document.activeElement && document.activeElement.tagName === 'SELECT') document.activeElement.blur();
    initAudio(); noteOn(m, 0.78, 'k' + e.code);
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'Space') { if (!latchSustain) setSustain(false); return; }
    var m = codeMap[e.code]; if (m === undefined) return;
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
    store.set('startC', view.startC); rebuildKeyMap();
  }
  $('#octDown').addEventListener('click', function () { shiftOct(-1); });
  $('#octUp').addEventListener('click', function () { shiftOct(1); });

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

  sel.instrument.addEventListener('change', function () { settings.instrument = this.value; store.set('instrument', this.value); this.blur(); });
  sel.octaves.addEventListener('change', function () {
    view.octSetting = this.value; store.set('octaves', this.value); this.blur();
    layout(recorder.isLive()); rebuildKeyMap();
  });
  sel.labels.addEventListener('change', function () { view.labels = this.value; store.set('labels', this.value); this.blur(); });
  sel.volume.addEventListener('input', function () { settings.volume = parseFloat(this.value); store.set('volume', this.value); if (master) master.gain.setTargetAtTime(settings.volume, ac.currentTime, 0.02); });
  sel.reverb.addEventListener('change', function () { settings.reverb = this.checked; store.set('reverb', this.checked ? '1' : '0'); if (wet) wet.gain.setTargetAtTime(this.checked ? 0.28 : 0, ac.currentTime, 0.05); });
  sel.hints.addEventListener('change', function () { view.hints = this.checked; store.set('hints', this.checked ? '1' : '0'); });
  $('#sustainBtn').addEventListener('click', function () { initAudio(); latchSustain = !sustainOn; setSustain(!sustainOn); });

  /* ---------------- under-the-hood demos ---------------- */
  document.querySelectorAll('[data-demo]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      initAudio(); if (!ac) return;
      var demo = btn.getAttribute('data-demo'), keep = settings.instrument;
      var seq = demo === 'octave'
        ? [[57, 'piano'], [69, 'piano'], [81, 'piano']]
        : [[60, 'piano'], [60, 'epiano'], [60, 'organ'], [60, 'strings'], [60, 'musicbox']];
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
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { /* labels redraw next frame */ });
  requestAnimationFrame(loop);
})();
