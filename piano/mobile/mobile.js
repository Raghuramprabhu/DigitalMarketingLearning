/* =====================================================================
   Piano Studio · phone extras. The instrument, stage and recorder all come
   from ../piano.js; this file only adds what a phone needs:
   bottom sheets, the takes badge, recording flags, screen wake lock,
   and a few iOS Safari fixes.
   ===================================================================== */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var body = document.body;

  /* ---------- bottom sheets ---------- */
  function openSheet(el) {
    if (!el.hidden) return;
    el.hidden = false;
    void el.offsetWidth; // let the closed position paint, so it slides in
    el.classList.add('open');
  }
  function closeSheet(el) {
    if (el.hidden) return;
    el.classList.remove('open');
    setTimeout(function () { if (!el.classList.contains('open')) el.hidden = true; }, 260);
  }
  var settings = $('#settingsSheet'), takesSheet = $('#takesSheet');
  $('#openSettings').addEventListener('click', function () { openSheet(settings); });
  $('#openTakes').addEventListener('click', function () { openSheet(takesSheet); });
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { closeSheet(b.closest('.m-sheet')); });
  });
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Escape') { closeSheet(settings); closeSheet(takesSheet); }
  });
  // the "hear it" demos play on the stage, so get the sheet out of the way
  document.querySelectorAll('[data-demo]').forEach(function (b) {
    b.addEventListener('click', function () { closeSheet(settings); });
  });

  /* ---------- the whole-piano strip: see where you are, tap or drag to jump ---------- */
  var IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0], LOW = 21, HIGH = 108; // A0..C8
  var WHITES = []; for (var mm = LOW; mm <= HIGH; mm++) if (!IS_BLACK[mm % 12]) WHITES.push(mm); // 52
  var map = $('#miniMap'), mapWrap = $('#miniMapWrap'), mctx = map.getContext('2d'), stageCv = $('#stage');
  var kv = { lo: 48, hi: 79, whites: 19, slidable: true };
  function drawMap() {
    var r = map.getBoundingClientRect(); if (!r.width) return;
    var turned = body.hasAttribute('data-rot');
    var cssW = turned ? r.height : r.width, cssH = turned ? r.width : r.height;
    var d = Math.min(3, window.devicePixelRatio || 1), W = Math.round(cssW * d), H = Math.round(cssH * d);
    if (map.width !== W || map.height !== H) { map.width = W; map.height = H; }
    var c = mctx, ww = W / WHITES.length;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#16131c'; c.fillRect(0, 0, W, H);
    WHITES.forEach(function (m, i) {
      c.fillStyle = m === 60 ? '#f2c9cf' : '#d9d3c7'; c.fillRect(i * ww + d * 0.5, 0, ww - d, H);
    });
    WHITES.forEach(function (m, i) {
      if (IS_BLACK[(m + 1) % 12] && m + 1 <= HIGH) { c.fillStyle = '#26232b'; c.fillRect((i + 1) * ww - ww * 0.3, 0, ww * 0.6, H * 0.58); }
    });
    // C labels when there is room
    if (ww > 9 * d) {
      c.fillStyle = '#7a6f62'; c.font = '600 ' + Math.round(8 * d) + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'bottom';
      WHITES.forEach(function (m, i) { if (m % 12 === 0) c.fillText('C' + (m / 12 - 1), i * ww + ww / 2, H - d); });
    }
    // the visible window
    var a = WHITES.indexOf(kv.lo), last = kv.hi; while (IS_BLACK[last % 12]) last--;
    var b = WHITES.indexOf(last);
    if (a < 0 || b < 0) return;
    c.fillStyle = 'rgba(10,8,14,.55)'; c.fillRect(0, 0, a * ww, H); c.fillRect((b + 1) * ww, 0, W - (b + 1) * ww, H);
    c.strokeStyle = '#e9b44c'; c.lineWidth = 2 * d; c.strokeRect(a * ww + d, d, (b - a + 1) * ww - 2 * d, H - 2 * d);
  }
  stageCv.addEventListener('keyview', function (e) { kv = e.detail; mapWrap.classList.toggle('off', !kv.slidable); drawMap(); });
  window.addEventListener('resize', function () { setTimeout(drawMap, 160); });
  function mapPick(e) {
    var r = map.getBoundingClientRect(), a = +(body.getAttribute('data-rot') || 0), f;
    if (a === 90) f = (e.clientY - r.top) / r.height; else if (a === -90) f = (r.bottom - e.clientY) / r.height;
    else f = (e.clientX - r.left) / r.width;
    var centre = Math.floor(Math.max(0, Math.min(0.9999, f)) * WHITES.length);
    var i = Math.max(0, Math.min(WHITES.length - kv.whites, centre - Math.floor(kv.whites / 2)));
    stageCv.dispatchEvent(new CustomEvent('setstart', { detail: { midi: WHITES[i], quiet: false } }));
  }
  var mapDown = false;
  mapWrap.addEventListener('pointerdown', function (e) { e.preventDefault(); mapDown = true; try { mapWrap.setPointerCapture(e.pointerId); } catch (x) { } mapPick(e); });
  mapWrap.addEventListener('pointermove', function (e) { if (mapDown) mapPick(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { mapWrap.addEventListener(t, function () { mapDown = false; }); });
  drawMap();

  /* ---------- MIDI: Safari on iPhone has no Web MIDI ---------- */
  if (navigator.requestMIDIAccess) $('#noMidi').hidden = true;

  /* ---------- takes: badge, empty note, open the sheet when a take lands ---------- */
  var takes = $('#takes'), badge = $('#takeCount'), empty = $('#takesEmpty'), lastCount = 0;
  function syncTakes() {
    var n = takes.children.length;
    badge.hidden = !n; badge.textContent = n;
    empty.hidden = !!n;
    if (n > lastCount) openSheet(takesSheet);
    lastCount = n;
  }
  new MutationObserver(syncTakes).observe(takes, { childList: true });
  syncTakes();

  /* ---------- recording state -> flags on the stage (not part of the video) ---------- */
  var recBtn = $('#recBtn');
  function syncRec() {
    body.classList.toggle('rec-armed', recBtn.classList.contains('armed'));
    body.classList.toggle('rec-live', recBtn.classList.contains('live'));
    recBtn.setAttribute('aria-label', recBtn.classList.contains('live') ? 'Stop recording'
      : recBtn.classList.contains('armed') ? 'Cancel: recording waits for your first note' : 'Record');
  }
  new MutationObserver(syncRec).observe(recBtn, { attributes: true, attributeFilter: ['class'] });
  syncRec();

  // running time inside the REC flag (the dock has no room for it)
  var recTime = $('#recTime'), flagTime = $('#recFlagTime');
  new MutationObserver(function () { flagTime.textContent = 'REC ' + recTime.textContent; })
    .observe(recTime, { childList: true, characterData: true, subtree: true });

  /* ---------- key size: show the new size for a moment ---------- */
  var zf = $('#zoomFlag'), zfT;
  $('#stage').addEventListener('keysize', function (e) {
    var d = e.detail;
    zf.innerHTML = d.fixed ? 'Fixed in the 61-key<br>typing layout (⚙︎ → Bluetooth keyboard)'
      : d.kind === 'pan' ? '<b>' + d.from + ' – ' + d.to + '</b>' + d.whites + ' white keys' + (d.rows > 1 ? ' × ' + d.rows + ' rows' : '')
      : '<b>' + d.whites + ' white keys' + (d.rows > 1 ? ' × ' + d.rows + ' rows' : '') + '</b>' + d.from + ' – ' + d.to + ' · each ' + d.keyPx + ' px wide';
    zf.classList.add('show'); clearTimeout(zfT);
    zfT = setTimeout(function () { zf.classList.remove('show'); }, 1400);
  });

  /* ---------- messages: tap to dismiss, fade on their own ---------- */
  var msg = $('#recMsg'), msgT;
  msg.addEventListener('click', function () { msg.hidden = true; });
  new MutationObserver(function () {
    clearTimeout(msgT);
    if (!msg.hidden) msgT = setTimeout(function () { msg.hidden = true; }, 9000);
  }).observe(msg, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true });

  /* ---------- keep the screen awake while you play (iOS 16.4+) ---------- */
  var lock = null, wantLock = false;
  function grabLock() {
    if (!('wakeLock' in navigator) || lock) return;
    navigator.wakeLock.request('screen').then(function (l) {
      lock = l; l.addEventListener('release', function () { lock = null; });
    }).catch(function () { });
  }
  $('#stage').addEventListener('pointerdown', function () { wantLock = true; grabLock(); });

  /* ---------- app switching, calls, Control Centre ---------- */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) window.dispatchEvent(new Event('blur')); // lets piano.js lift every held key
    else if (wantLock) grabLock();
  });

  /* ---------- sideways: real rotation, or the ⟳ page turn when rotation lock is on ---------- */
  var mq = window.matchMedia('(orientation: landscape) and (max-height: 520px)');
  var turn = 0; try { turn = +(localStorage.getItem('piano-mturn') || 0); } catch (e) { }
  var rotBtn = $('#rotBtn'), msgEl = $('#recMsg');
  function sizeVars() {
    document.documentElement.style.setProperty('--vw', window.innerWidth + 'px');
    document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
  }
  function syncLand() {
    var real = mq.matches, t = real ? 0 : turn; // phone really turned: no need to fake it
    sizeVars();
    if (t) body.setAttribute('data-rot', t); else body.removeAttribute('data-rot');
    body.classList.toggle('rot90', t === 90);
    body.classList.toggle('rot-90', t === -90);
    body.classList.toggle('land', real || !!t);
    body.classList.toggle('real-land', real);
    rotBtn.setAttribute('aria-pressed', t ? 'true' : 'false');
    window.dispatchEvent(new Event('resize')); // piano.js re-lays the keys
  }
  rotBtn.addEventListener('click', function () {
    if (body.classList.contains('rec-live')) { msgEl.textContent = 'Stop the recording first, then turn the page.'; msgEl.hidden = false; return; }
    turn = turn === 0 ? 90 : turn === 90 ? -90 : 0;
    try { localStorage.setItem('piano-mturn', turn); } catch (e) { }
    syncLand();
    msgEl.textContent = turn === 90 ? 'Sideways: hold the phone with the notch on the left. Tap ⟳ again to flip.'
      : turn === -90 ? 'Flipped: notch on the right. Tap ⟳ once more to go back upright.' : 'Back upright.';
    msgEl.hidden = false;
  });
  if (mq.addEventListener) mq.addEventListener('change', syncLand); else if (mq.addListener) mq.addListener(syncLand);
  window.addEventListener('resize', function (e) { if (e.isTrusted) sizeVars(); });
  syncLand();

  /* ---------- rotation: iOS reports the new size a beat late ---------- */
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 350);
  });

  /* ---------- no pinch-zoom while playing (double-tap zoom is off via touch-action in the CSS) ---------- */
  ['gesturestart', 'gesturechange'].forEach(function (t) { document.addEventListener(t, function (e) { e.preventDefault(); }); });

  /* ---------- already installed to the Home Screen? hide the tip ---------- */
  if (navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) $('#a2hs').hidden = true;
})();
