/* =====================================================================
   Piano Studio sound engine (shared by the studio and the lessons).
   Every sound is synthesised live with Web Audio. No sample files.
   window.PS = {
     init(), ctx, master, wet, recDest, settings, INSTR,
     voice(instr, midi, vel)      -> {release(t), kill(t)}   (instr = 'piano' | 'harmonium' | …)
     voiceHz(instr, hz, vel)      -> same, for an exact frequency (tuning demos)
     note(midi, dur, opts)        -> play one note for dur seconds
     seq(steps, opts)             -> play [[midi or [chord], beats], …] ; returns {stop()}
     freq(midi), now()
   }
   ===================================================================== */
(function () {
  'use strict';
  var ac = null, master, comp, out, wet, recDest, noiseBuf, waves = {};
  var settings = { instrument: 'piano', volume: 0.8, reverb: true,
    // stops of the 3-reed harmonium: bass = octave below, male = at pitch, male2 = at pitch tuned a little sharp, female = octave above
    reeds: { bass: true, male: true, male2: false, female: true, tremolo: false } };

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

  function init() {
    if (ac) { if (ac.state !== 'running') ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iPhone: treat this page like a music app, so sound still plays when the ring/silent switch is on silent (iOS 17+).
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
    try { ac = new AC({ latencyHint: 0 }); } catch (e) { ac = new AC({ latencyHint: 'interactive' }); } // 0 = smallest buffer the device allows
    master = ac.createGain(); master.gain.value = settings.volume;
    // Soft limiter (tanh curve). Unlike a DynamicsCompressor it has no look-ahead, so it adds zero delay.
    comp = ac.createWaveShaper();
    var curve = new Float32Array(2048);
    for (var ci = 0; ci < curve.length; ci++) { var x = ci / (curve.length - 1) * 2 - 1; curve[ci] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    comp.curve = curve; comp.oversample = 'none';
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
    // Free reed (harmonium): a buzzy, rich spectrum where the overtones barely fade, so it sounds nasal.
    var reed = [0]; for (var hn = 1; hn <= 24; hn++) reed.push((hn === 1 ? 0.75 : 1) / Math.pow(hn, 0.72) * (hn >= 3 && hn <= 6 ? 1.25 : 1));
    waves.reed = periodic(reed);
    // Female reeds are small and thin: fewer strong overtones, a brighter, lighter voice.
    var reedF = [0]; for (var hf = 1; hf <= 14; hf++) reedF.push(1 / Math.pow(hf, 0.95) * (hf === 2 ? 1.2 : 1));
    waves.reedF = periodic(reedF);
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
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 + vel * 0.05, t + 0.05);
      var all = [a, b, c];
      return {
        release: function (r) { holdAndRelease(g.gain, r, 0.32); all.forEach(function (o) { o.stop(r + 2); }); },
        kill: function (r) { holdAndRelease(g.gain, r, 0.01); all.forEach(function (o) { o.stop(r + 0.1); }); }
      };
    },
    harmonium: function (m, f, vel, t) {
      // Two reeds tuned a hair apart (that slow "beating" is the harmonium shimmer) + a bass reed an octave down.
      var env = ac.createGain(), trem = ac.createGain(), lp = ac.createBiquadFilter(), nasal = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = Math.min(f * 7, 5200); lp.Q.value = 0.4;
      nasal.type = 'peaking'; nasal.frequency.value = 1500; nasal.Q.value = 1.1; nasal.gain.value = 5;
      var a = osc(waves.reed, f, t, -4), b = osc(waves.reed, f, t, 5), c = osc(waves.reed, f / 2, t, 1), cg = ac.createGain();
      cg.gain.value = 0.35;
      a.connect(lp); b.connect(lp); c.connect(cg); cg.connect(lp); lp.connect(nasal); nasal.connect(env);
      // air rushing through the reed
      var n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
      var nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = Math.min(f * 4, 6000); nf.Q.value = 0.8;
      var ng = ac.createGain(); ng.gain.value = 0.05; n.connect(nf); nf.connect(ng); ng.connect(env); n.start(t);
      // bellows: pressure rises and falls slightly as the hand pumps
      env.connect(trem); trem.connect(master); trem.gain.value = 1;
      var lfo = osc('sine', 0.45 + Math.random() * 0.3, t), lg = ac.createGain(); lg.gain.value = 0.07; lfo.connect(lg); lg.connect(trem.gain);
      var lvl = 0.068 + vel * 0.025;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(lvl * 0.55, t + 0.025); // a reed takes a moment to "speak"
      env.gain.linearRampToValueAtTime(lvl, t + 0.08);
      var all = [a, b, c, n, lfo];
      return {
        release: function (r) { holdAndRelease(env.gain, r, 0.05); all.forEach(function (o) { o.stop(r + 0.5); }); },
        kill: function (r) { holdAndRelease(env.gain, r, 0.01); all.forEach(function (o) { o.stop(r + 0.1); }); }
      };
    },
    harmonium3: function (m, f, vel, t) {
      // Triple-reed harmonium. Each pulled stop opens one bank of reeds; every bank has its own size, so its own
      // colour and its own speaking speed (big bass reeds take longest to start sounding).
      var R = settings.reeds || {}, on = { bass: !!R.bass, male: !!R.male, male2: !!R.male2, female: !!R.female };
      if (!on.bass && !on.male && !on.male2 && !on.female) on.male = true; // all stops in: a real one would be silent; keep one reed
      var env = ac.createGain(), trem = ac.createGain(), nasal = ac.createBiquadFilter();
      nasal.type = 'peaking'; nasal.frequency.value = 1500; nasal.Q.value = 1.1; nasal.gain.value = 4;
      var all = [], weight = 0;
      function bank(wave, hz, cents, gain, cutoff, speak) {
        var o = osc(wave, hz, t, cents), lp = ac.createBiquadFilter(), g = ac.createGain();
        lp.type = 'lowpass'; lp.frequency.value = Math.min(cutoff, 9000); lp.Q.value = 0.4;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * 0.5, t + speak * 0.4); g.gain.linearRampToValueAtTime(gain, t + speak);
        o.connect(lp); lp.connect(g); g.connect(nasal); all.push(o); weight += gain;
      }
      if (on.bass) bank(waves.reed, f / 2, 1, 0.8, f * 3.5, 0.09);     // 16-foot: an octave down, dark, slowest
      if (on.male) bank(waves.reed, f, -2, 1, f * 7, 0.05);            // 8-foot: the main voice
      if (on.male2) bank(waves.reed, f, 9, 0.85, f * 7, 0.055);        // 8-foot, tuned sharp: beats against Male ("musette")
      if (on.female) bank(waves.reedF, f * 2, 2, 0.55, f * 12, 0.03);  // 4-foot: an octave up, bright, quick
      nasal.connect(env);
      var n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
      var nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = Math.min(f * 4, 6000); nf.Q.value = 0.8;
      var ng = ac.createGain(); ng.gain.value = 0.04; n.connect(nf); nf.connect(ng); ng.connect(env); n.start(t); all.push(n);
      env.connect(trem); trem.connect(master); trem.gain.value = 1;
      var lfo = osc('sine', 0.45 + Math.random() * 0.3, t), lg = ac.createGain(); lg.gain.value = 0.07; lfo.connect(lg); lg.connect(trem.gain); all.push(lfo);
      if (R.tremolo) { // the Tremolo stop: a spinning flap that chops the air about 5–6 times a second
        var tl = osc('sine', 5.6, t), tg = ac.createGain(); tg.gain.value = 0.24; tl.connect(tg); tg.connect(trem.gain); all.push(tl);
      }
      var lvl = (0.068 + vel * 0.025) * 1.15 / Math.sqrt(weight); // more reeds = richer, not much louder
      env.gain.setValueAtTime(lvl, t);
      return {
        release: function (r) { holdAndRelease(env.gain, r, 0.05); all.forEach(function (o) { o.stop(r + 0.5); }); },
        kill: function (r) { holdAndRelease(env.gain, r, 0.01); all.forEach(function (o) { o.stop(r + 0.1); }); }
      };
    },
    tanpura: function (m, f, vel, t) {
      // A plucked drone string. The bridge (jawari) makes the overtones bloom and buzz a moment after the pluck,
      // which a resonant filter sweeping upward imitates.
      var g = ac.createGain(), lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 5;
      lp.frequency.setValueAtTime(f * 2, t);
      lp.frequency.linearRampToValueAtTime(Math.min(f * 14, 9000), t + 0.7);
      lp.frequency.setTargetAtTime(f * 3, t + 0.7, 1.4);
      var a = osc('sawtooth', f, t, -1.5), b = osc('sawtooth', f, t, 1.5);
      a.connect(lp); b.connect(lp); lp.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 * (0.5 + vel * 0.5), t + 0.01);
      g.gain.setTargetAtTime(0, t + 0.05, 1.7);
      a.stop(t + 6.5); b.stop(t + 6.5);
      return {
        release: function () { /* a plucked string rings on */ },
        kill: function (r) { holdAndRelease(g.gain, r, 0.02); a.stop(r + 0.1); b.stop(r + 0.1); }
      };
    },
    click: function (m, f, vel, t) {
      // metronome / tala tick: a short pitched blip
      var g = ac.createGain(), o = osc('sine', f, t);
      o.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35 * vel, t + 0.002);
      g.gain.setTargetAtTime(0, t + 0.004, 0.025);
      o.stop(t + 0.2);
      return { release: function () { }, kill: function (r) { o.stop(r); } };
    },
    pure: function (m, f, vel, t) {
      // a plain sine-ish tone with no overtones, for hearing exact frequencies and beating
      var g = ac.createGain(), o = osc('triangle', f, t);
      o.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16 * (0.5 + vel * 0.5), t + 0.03);
      return {
        release: function (r) { holdAndRelease(g.gain, r, 0.06); o.stop(r + 0.5); },
        kill: function (r) { holdAndRelease(g.gain, r, 0.01); o.stop(r + 0.1); }
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

  function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function voiceHz(instr, hz, vel, t) {
    init(); if (!ac) return null;
    var m = 69 + 12 * Math.log2(hz / 440);
    return (INSTR[instr] || INSTR.piano)(m, hz, vel == null ? 0.8 : vel, t == null ? ac.currentTime : t);
  }
  function voice(instr, m, vel, t) { return voiceHz(instr, freq(m), vel, t); }
  function note(m, dur, opts) {
    opts = opts || {}; init(); if (!ac) return;
    var t = ac.currentTime + (opts.delay || 0);
    var v = opts.hz ? voiceHz(opts.instr || settings.instrument, opts.hz, opts.vel, t) : voice(opts.instr || settings.instrument, m, opts.vel, t);
    if (v) v.release(t + (dur || 0.6));
    return v;
  }
  // steps: [[midi | [midis] | null(rest), beats], …]
  function seq(steps, opts) {
    opts = opts || {}; init(); if (!ac) return { stop: function () { } };
    var bpm = opts.bpm || 100, spb = 60 / bpm, t = ac.currentTime + 0.05, live = [], timers = [];
    steps.forEach(function (s, i) {
      var notes = s[0] === null ? [] : [].concat(s[0]), beats = s[1] || 1, dur = beats * spb;
      var at = t;
      notes.forEach(function (m) {
        var v = voice(opts.instr || settings.instrument, m, opts.vel == null ? 0.75 : opts.vel, at);
        if (v) { v.release(at + dur * (opts.legato || 0.92)); live.push(v); }
      });
      if (opts.onStep) timers.push(setTimeout(function () { opts.onStep(i, notes); }, (at - ac.currentTime) * 1000));
      t += dur;
    });
    if (opts.onEnd) timers.push(setTimeout(opts.onEnd, (t - ac.currentTime) * 1000));
    return { stop: function () { var n = ac.currentTime; live.forEach(function (v) { v.kill(n); }); timers.forEach(clearTimeout); }, endsIn: t - ac.currentTime };
  }

  var PS = {
    init: function () { init(); PS.ctx = ac; PS.master = master; PS.wet = wet; PS.recDest = recDest; return ac; },
    settings: settings, INSTR: INSTR, voice: voice, voiceHz: voiceHz, note: note, seq: seq, freq: freq,
    now: function () { return ac ? ac.currentTime : 0; },
    setVolume: function (v) { settings.volume = v; if (master) master.gain.setTargetAtTime(v, ac.currentTime, 0.02); },
    setReverb: function (on) { settings.reverb = on; if (wet) wet.gain.setTargetAtTime(on ? 0.28 : 0, ac.currentTime, 0.05); }
  };
  window.PS = PS;
})();
