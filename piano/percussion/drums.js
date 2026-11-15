/* =====================================================================
   Bhajan Rhythm Studio · percussion synthesis
   ---------------------------------------------------------------------
   No samples. Every stroke is built from first principles:
     - A plain drum skin vibrates in INHARMONIC modes (1, 1.59, 2.14, 2.30, 2.65 × f).
       That's why a dholak or a tambourine skin "thuds" rather than sings.
     - The tabla's black syahi patch loads the skin so its modes line up as
       HARMONICS (1, 2, 3, 4, 5 × f). That's why a tabla has a pitch you can tune to Sa.
       (C. V. Raman studied this in Indian drums in the 1920s.)
     - Tambourine jingles are little metal discs: lots of high, inharmonic ringing.
   window.DRUMS = { play(inst, stroke, vel, t), STROKES, setSa(midi) }
   ===================================================================== */
(function () {
  'use strict';
  var PS = window.PS;
  var saMidi = 61; // C#4: a common tabla/bhajan pitch
  var noise = null;

  function ac() { PS.init(); return PS.ctx; }
  function noiseBuf() {
    if (noise) return noise;
    var c = ac(), n = c.createBuffer(1, c.sampleRate * 1, c.sampleRate), d = n.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (noise = n);
  }
  function outGain(t, v) { var g = ac().createGain(); g.gain.value = v; g.connect(PS.master); return g; }

  // sum of decaying sine partials. ratios × f, each with its own amplitude and decay (seconds to ~1/e^3)
  function modes(dest, t, f, ratios, amps, decays, glide) {
    var c = ac();
    ratios.forEach(function (r, i) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * r, t);
      if (glide) o.frequency.linearRampToValueAtTime(f * r * glide.to, t + glide.time);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amps[i], t + 0.002);
      g.gain.setTargetAtTime(0, t + 0.003, decays[i] / 3);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + decays[i] * 2.2 + 0.05);
    });
  }
  function burst(dest, t, dur, type, freq, q, amp, attack) {
    var c = ac(), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf(); s.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + (attack || 0.001));
    g.gain.setTargetAtTime(0, t + (attack || 0.001), dur / 3);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur * 2 + 0.05);
  }

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var MEMBRANE = [1, 1.59, 2.14, 2.30, 2.65]; // ideal circular membrane (Bessel-function zeros)
  var HARMONIC = [1, 2, 3, 4, 5];

  /* ---------------- tabla ---------------- */
  var tabla = {
    na: function (o, t, v) { var f = hz(saMidi); modes(o, t, f, HARMONIC, [.55 * v, .35 * v, .28 * v, .16 * v, .08 * v], [.45, .3, .2, .14, .09]); burst(o, t, .02, 'bandpass', 3500, 1, .25 * v); },
    tin: function (o, t, v) { var f = hz(saMidi); modes(o, t, f, HARMONIC, [.6 * v, .25 * v, .12 * v, .05 * v, .02 * v], [.75, .4, .22, .12, .08]); burst(o, t, .015, 'bandpass', 2500, 1, .12 * v); },
    tu: function (o, t, v) { var f = hz(saMidi); modes(o, t, f, HARMONIC, [.7 * v, .2 * v, .06 * v, 0, 0], [1.1, .5, .2, .1, .1]); },
    ti: function (o, t, v) { var f = hz(saMidi); modes(o, t, f, [1, 3], [.25 * v, .1 * v], [.05, .03]); burst(o, t, .035, 'bandpass', 1800, .8, .35 * v); },
    ge: function (o, t, v) { modes(o, t, 98, [1, 1.5, 2], [.75 * v, .15 * v, .1 * v], [.9, .35, .25], { to: 1.22, time: .25 }); burst(o, t, .02, 'lowpass', 500, .7, .25 * v); },
    ka: function (o, t, v) { modes(o, t, 160, [1, 1.7], [.3 * v, .1 * v], [.05, .03]); burst(o, t, .045, 'lowpass', 900, .8, .45 * v); }
  };
  tabla.dha = function (o, t, v) { tabla.na(o, t, v * .9); tabla.ge(o, t, v * .9); };
  tabla.dhin = function (o, t, v) { tabla.tin(o, t, v * .9); tabla.ge(o, t, v * .9); };

  /* ---------------- dholak (plain skins, bass head with inner paste) ---------------- */
  var dholak = {
    na: function (o, t, v) { modes(o, t, 330, MEMBRANE, [.5 * v, .3 * v, .22 * v, .18 * v, .1 * v], [.22, .14, .1, .08, .06]); burst(o, t, .03, 'bandpass', 2800, .9, .35 * v); },
    tin: function (o, t, v) { modes(o, t, 300, MEMBRANE, [.55 * v, .25 * v, .15 * v, .1 * v, .05 * v], [.35, .2, .12, .09, .06]); burst(o, t, .02, 'bandpass', 2000, .9, .15 * v); },
    tu: function (o, t, v) { modes(o, t, 280, MEMBRANE, [.6 * v, .15 * v, .08 * v, .05 * v, .02 * v], [.45, .2, .1, .08, .05]); },
    ti: function (o, t, v) { burst(o, t, .04, 'bandpass', 2200, .7, .45 * v); modes(o, t, 330, [1, 2.14], [.15 * v, .08 * v], [.04, .03]); },
    ge: function (o, t, v) { modes(o, t, 78, [1, 1.59, 2.14], [.85 * v, .2 * v, .1 * v], [.8, .3, .2], { to: 1.35, time: .3 }); burst(o, t, .03, 'lowpass', 400, .7, .3 * v); },
    ka: function (o, t, v) { burst(o, t, .06, 'lowpass', 700, .8, .55 * v); modes(o, t, 120, [1, 1.59], [.3 * v, .12 * v], [.06, .04]); }
  };
  dholak.dha = function (o, t, v) { dholak.na(o, t, v * .9); dholak.ge(o, t, v * .9); };
  dholak.dhin = function (o, t, v) { dholak.tin(o, t, v * .9); dholak.ge(o, t, v * .9); };

  /* ---------------- dholki (smaller, tighter, sharper "crack") ---------------- */
  var dholki = {
    na: function (o, t, v) { modes(o, t, 520, MEMBRANE, [.45 * v, .3 * v, .22 * v, .16 * v, .1 * v], [.14, .1, .07, .05, .04]); burst(o, t, .035, 'highpass', 2500, .7, .5 * v); },
    tin: function (o, t, v) { modes(o, t, 470, MEMBRANE, [.5 * v, .25 * v, .14 * v, .08 * v, .04 * v], [.25, .14, .09, .06, .04]); burst(o, t, .02, 'bandpass', 3000, .9, .2 * v); },
    tu: function (o, t, v) { modes(o, t, 430, MEMBRANE, [.55 * v, .15 * v, .07 * v, .04 * v, .02 * v], [.32, .15, .08, .05, .04]); },
    ti: function (o, t, v) { burst(o, t, .03, 'highpass', 3000, .7, .5 * v); },
    ge: function (o, t, v) { modes(o, t, 118, [1, 1.59, 2.14], [.75 * v, .2 * v, .1 * v], [.45, .2, .12], { to: 1.25, time: .15 }); burst(o, t, .02, 'lowpass', 600, .7, .3 * v); },
    ka: function (o, t, v) { burst(o, t, .045, 'bandpass', 900, 1, .6 * v); }
  };
  dholki.dha = function (o, t, v) { dholki.na(o, t, v * .9); dholki.ge(o, t, v * .9); };
  dholki.dhin = function (o, t, v) { dholki.tin(o, t, v * .9); dholki.ge(o, t, v * .9); };

  /* ---------------- tambourine (jingles + a light skin) ---------------- */
  var JING = [3120, 4230, 5380, 6950, 8170, 9620];
  function jingles(o, t, v, dur) {
    modes(o, t, 1, JING.map(function (f) { return f * (0.985 + Math.random() * 0.03); }), JING.map(function (_, i) { return v * (.12 - i * .012); }), JING.map(function () { return dur * (0.7 + Math.random() * 0.6); }));
    burst(o, t, dur * .8, 'highpass', 5500, .7, .35 * v);
  }
  var tamb = {
    hit: function (o, t, v) { jingles(o, t, v, .38); modes(o, t, 190, MEMBRANE, [.35 * v, .12 * v, .06 * v, .03 * v, .02 * v], [.09, .06, .04, .03, .03]); burst(o, t, .03, 'lowpass', 800, .7, .25 * v); },
    tap: function (o, t, v) { jingles(o, t, v * .5, .2); },
    shake: function (o, t, v) { burst(o, t, .13, 'highpass', 5000, .7, .45 * v, .025); jingles(o, t + .01, v * .25, .14); },
    roll: function (o, t, v) { for (var i = 0; i < 10; i++) jingles(o, t + i * 0.032, v * (0.25 + 0.05 * Math.sin(i)), .12); }
  };

  var KITS = { tabla: tabla, dholak: dholak, dholki: dholki, tambourine: tamb };

  // claps for showing the tala, and a soft beat tick for "your turn"
  function clap(t, v) { var o = outGain(t, 1); burst(o, t, .05, 'bandpass', 1400, .8, .5 * v); burst(o, t + .008, .06, 'bandpass', 1100, .8, .4 * v); }
  function tick(t, v, hi) { var o = outGain(t, 1); modes(o, t, hi ? 1600 : 1100, [1], [.25 * v], [.03]); }

  window.DRUMS = {
    play: function (inst, stroke, vel, t) {
      var kit = KITS[inst]; if (!kit || !kit[stroke]) return;
      var c = ac(); if (t == null) t = c.currentTime;
      var o = outGain(t, 0.9);
      kit[stroke](o, t, vel == null ? 0.85 : vel);
    },
    clap: clap, tick: tick,
    setSa: function (m) { saMidi = m; }, getSa: function () { return saMidi; },
    has: function (inst, stroke) { return !!(KITS[inst] && KITS[inst][stroke]); }
  };
})();
