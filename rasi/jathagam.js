/* Jathagam viewer — plain JS, no AI, no server.
   Everything the reader does (seen / liked / hidden / notes / text size / gothram) lives in localStorage on his phone. */
(function () {
  'use strict';

  var KEY = 'jathagam-state-v1';
  var SIZES = [18, 21, 24, 27, 30];          // root font size in px for the அ− / அ+ buttons
  var DEFAULT_SIZE = 1;

  var RASIS = ['மேஷம்', 'ரிஷபம்', 'மிதுனம்', 'கடகம்', 'சிம்மம்', 'கன்னி', 'துலாம்', 'விருச்சிகம்', 'தனுசு', 'மகரம்', 'கும்பம்', 'மீனம்'];
  var RASI_SHORT = ['மேஷ', 'ரிஷ', 'மிது', 'கட', 'சிம்', 'கன்', 'துலா', 'விரு', 'தனு', 'மகர', 'கும்', 'மீன'];
  var PLANETS = { La: 'லக்', Su: 'சூரி', Mo: 'சந்', Ma: 'செவ்', Me: 'புத', Ju: 'குரு', Ve: 'சுக்', Sa: 'சனி', Ra: 'ராகு', Ke: 'கேது' };
  var PLANET_ORDER = ['La', 'Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];
  // South Indian chart: each rasi has a fixed box. [row, column]
  var KATTAM_POS = { 12: [1, 1], 1: [1, 2], 2: [1, 3], 3: [1, 4], 4: [2, 4], 5: [3, 4], 6: [4, 4], 7: [4, 3], 8: [4, 2], 9: [4, 1], 10: [3, 1], 11: [2, 1] };
  var MONTHS = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
  var WEEKDAYS = ['ஞாயிற்றுக்கிழமை', 'திங்கட்கிழமை', 'செவ்வாய்க்கிழமை', 'புதன்கிழமை', 'வியாழக்கிழமை', 'வெள்ளிக்கிழமை', 'சனிக்கிழமை'];
  var COMMON_GOTHRAMS = ['ஆத்ரேய', 'ஆங்கீரச', 'அகஸ்திய', 'பாரத்வாஜ', 'பார்கவ', 'ஹரித', 'ஜாமதக்னி', 'காசியப', 'கௌண்டின்ய', 'கௌசிக', 'கௌதம', 'மௌத்கல்ய', 'நைத்ருவ காசியப', 'ஷடமர்ஷண', 'சாண்டில்ய', 'ஸ்ரீவத்ஸ', 'வாதூல', 'வசிஷ்ட', 'விஸ்வாமித்ர'];

  var app = document.getElementById('app');
  var titleEl = document.getElementById('title');
  var backBtn = document.getElementById('backBtn');
  var smallerBtn = document.getElementById('smaller');
  var biggerBtn = document.getElementById('bigger');
  var toastEl = document.getElementById('toast');
  var toastMsg = document.getElementById('toastMsg');
  var toastUndo = document.getElementById('toastUndo');

  var data = null;
  var byId = {};
  var current = null;
  var homeScroll = 0;
  var lastViewedId = null;
  var toastTimer = null;
  var noteTimer = null;
  var taVoice = null;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------------- saved state ---------------- */
  var state = load();

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = {};
    if (!s.marks || typeof s.marks !== 'object') s.marks = {};
    if (typeof s.size !== 'number' || !SIZES[s.size]) s.size = DEFAULT_SIZE;
    if (typeof s.gothram !== 'string') s.gothram = '';
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep working in memory */ } }
  function peek(id) { return state.marks[id] || {}; }
  function mark(id) { return state.marks[id] || (state.marks[id] = {}); }

  function statusOf(id) {
    var m = peek(id);
    if (m.status === 'rejected') return 'rejected';
    if (m.status === 'liked') return 'liked';
    return m.seen ? 'seen' : 'new';
  }
  function setStatus(id, status) {
    var m = mark(id);
    if (status) { m.status = status; m.statusAt = Date.now(); }
    else { delete m.status; delete m.statusAt; }
    save();
  }

  /* ---------------- small helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ymd(s) { var p = String(s || '').split('-').map(Number); return p.length === 3 && p[0] ? p : null; }
  function ageOf(dob) {
    var p = ymd(dob); if (!p) return null;
    var t = new Date(), a = t.getFullYear() - p[0];
    if (t.getMonth() + 1 < p[1] || (t.getMonth() + 1 === p[1] && t.getDate() < p[2])) a--;
    return a;
  }
  function formatDate(dob) { var p = ymd(dob); return p ? p[2] + ' ' + MONTHS[p[1] - 1] + ' ' + p[0] : esc(dob); }
  function weekdayOf(dob) { var p = ymd(dob); return p ? WEEKDAYS[new Date(p[0], p[1] - 1, p[2]).getDay()] : ''; }
  function formatTime(tob) {
    var p = String(tob || '').split(':').map(Number);
    if (p.length < 2 || isNaN(p[0])) return esc(tob);
    var h = p[0], mm = String(p[1]).padStart(2, '0');
    var period = h < 4 ? 'இரவு' : h < 6 ? 'அதிகாலை' : h < 12 ? 'காலை' : h < 16 ? 'மதியம்' : h < 19 ? 'மாலை' : 'இரவு';
    return period + ' ' + (h % 12 || 12) + ':' + mm;
  }
  function relDay(ts) {
    var a = new Date(); a.setHours(0, 0, 0, 0);
    var b = new Date(ts); b.setHours(0, 0, 0, 0);
    var diff = Math.round((a - b) / 86400000);
    if (diff <= 0) return 'இன்று';
    if (diff === 1) return 'நேற்று';
    return diff + ' நாட்களுக்கு முன்';
  }
  function normGothram(s) { return String(s || '').replace(/கோத்திரம்/g, '').replace(/\s+/g, '').trim(); }
  function sameGothram(it) { return state.gothram && it.gothram && normGothram(it.gothram) === normGothram(state.gothram); }
  function hasValue(v) { return v != null && String(v).trim() !== ''; }
  function byAddedDesc(a, b) { return String(b.added || '').localeCompare(String(a.added || '')); }

  function nextNew(excludeId) {
    var list = (data.items || []).filter(function (it) { return it.id !== excludeId && statusOf(it.id) === 'new'; }).sort(byAddedDesc);
    return list.length ? { id: list[0].id, count: list.length } : null;
  }

  /* ---------------- text size ---------------- */
  function applySize() {
    document.documentElement.style.fontSize = SIZES[state.size] + 'px';
    smallerBtn.disabled = state.size <= 0;
    biggerBtn.disabled = state.size >= SIZES.length - 1;
  }
  smallerBtn.addEventListener('click', function () { if (state.size > 0) { state.size--; save(); applySize(); } });
  biggerBtn.addEventListener('click', function () { if (state.size < SIZES.length - 1) { state.size++; save(); applySize(); } });
  applySize();

  /* ---------------- read aloud (only if the phone has a Tamil voice) ---------------- */
  function findVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = window.speechSynthesis.getVoices() || [];
    taVoice = vs.filter(function (v) { return /^ta([-_]|$)/i.test(v.lang); })[0] || null;
    var btn = document.getElementById('speakBtn');
    if (btn) btn.hidden = !taVoice;
  }
  if ('speechSynthesis' in window) {
    findVoice();
    if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', findVoice);
    else window.speechSynthesis.onvoiceschanged = findVoice;
  }
  function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    var btn = document.getElementById('speakBtn');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.textContent = '🔊 படித்துக் காட்டு'; }
  }
  function speechText(it) {
    var p = [it.name];
    if (hasValue(it.rasi)) p.push(it.rasi + ' ராசி');
    if (hasValue(it.nakshatram)) p.push(it.nakshatram + ' நட்சத்திரம்' + (it.padam ? ', ' + it.padam + ' ஆம் பாதம்' : ''));
    if (hasValue(it.lagnam)) p.push(it.lagnam + ' லக்னம்');
    if (hasValue(it.gothram)) p.push(it.gothram + ' கோத்திரம்');
    if (hasValue(it.dob)) p.push('பிறந்த தேதி ' + formatDate(it.dob) + ', ' + weekdayOf(it.dob));
    if (hasValue(it.tob)) p.push('பிறந்த நேரம் ' + formatTime(it.tob));
    if (hasValue(it.pob)) p.push('பிறந்த ஊர் ' + it.pob);
    if (ageOf(it.dob) != null) p.push('வயது ' + ageOf(it.dob));
    if (hasValue(it.dosham)) p.push('தோஷம் ' + it.dosham);
    if (hasValue(it.education)) p.push('படிப்பு ' + it.education);
    if (hasValue(it.job)) p.push('வேலை ' + it.job);
    if (hasValue(it.height)) p.push('உயரம் ' + it.height);
    return p.join('. ') + '.';
  }
  function toggleSpeech(it, btn) {
    if (!taVoice) return;
    if (btn.getAttribute('aria-pressed') === 'true') { stopSpeech(); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(speechText(it));
    u.lang = taVoice.lang; u.voice = taVoice; u.rate = 0.85;
    u.onend = u.onerror = function () { btn.setAttribute('aria-pressed', 'false'); btn.textContent = '🔊 படித்துக் காட்டு'; };
    btn.setAttribute('aria-pressed', 'true'); btn.textContent = '■ நிறுத்து';
    window.speechSynthesis.speak(u);
  }

  /* ---------------- toast with undo ---------------- */
  function toast(msg, undoFn) {
    toastMsg.textContent = msg;
    toastUndo.hidden = !undoFn;
    toastUndo.onclick = undoFn ? function () { hideToast(); undoFn(); } : null;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undoFn ? 10000 : 4000);
  }
  function hideToast() { toastEl.hidden = true; clearTimeout(toastTimer); }

  /* ---------------- navigation (works with the phone's own back button) ---------------- */
  function parseRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    if (h.indexOf('j/') === 0) return { view: 'detail', id: decodeURIComponent(h.slice(2)) };
    if (h === 'hidden') return { view: 'hidden' };
    return { view: 'home' };
  }
  function routeKey(r) { return r ? r.view + ':' + (r.id || '') : ''; }
  function go(hash) {
    if (current && current.view === 'home') homeScroll = window.scrollY;
    history.pushState({ inApp: true }, '', hash);
    render();
  }
  function goBack() {
    if (history.state && history.state.inApp) history.back();
    else { history.replaceState(null, '', '#/'); render(); }
  }
  window.addEventListener('popstate', function () { render(); });
  window.addEventListener('hashchange', function () { if (routeKey(parseRoute()) !== routeKey(current)) render(); });
  backBtn.addEventListener('click', goBack);

  function setChrome(view, title) {
    var home = view === 'home';
    backBtn.hidden = home;
    titleEl.hidden = !home;
    document.title = title || 'ஜாதகங்கள்';
    toastEl.classList.toggle('low', view !== 'detail');
  }

  function render(opts) {
    opts = opts || {};
    if (!data) return;
    stopSpeech();
    var prev = current;
    current = parseRoute();
    if (current.view === 'detail') renderDetail(current.id, opts);
    else if (current.view === 'hidden') renderHidden(opts);
    else renderHome(prev, opts);
    if (!opts.keepScroll) app.focus({ preventScroll: true });
  }

  /* ---------------- home: three piles, like papers on a table ---------------- */
  function cardHtml(it) {
    var st = statusOf(it.id);
    var badge = {
      'new': '<span class="badge new">புதிது</span>',
      seen: '<span class="badge seen">பார்த்தது</span>',
      liked: '<span class="badge liked">★ பிடித்தது</span>',
      rejected: '<span class="badge rejected">மறைத்தது</span>'
    }[st];
    var age = ageOf(it.dob);
    var line2 = [hasValue(it.rasi) ? '<b>' + esc(it.rasi) + '</b> ராசி' : '', esc(it.nakshatram)].filter(Boolean).join(' · ');
    var line3 = [age != null ? age + ' வயது' : '', esc(it.job || it.pob)].filter(Boolean).join(' · ');
    var html = '<li><a class="card is-' + st + (it.id === lastViewedId ? ' just-seen' : '') + '" href="#/j/' + encodeURIComponent(it.id) + '" data-go>' +
      badge +
      '<span class="card-name">' + esc(it.name) + '</span>' +
      (line2 ? '<span class="card-line">' + line2 + '</span>' : '') +
      (line3 ? '<span class="card-line">' + line3 + '</span>' : '');
    if (sameGothram(it)) html += '<span class="flag">⚠ ஒரே கோத்திரம் (' + esc(it.gothram) + ')</span>';
    if (peek(it.id).note) html += '<span class="has-note">📝 உங்கள் குறிப்பு உள்ளது</span>';
    return html + '</a></li>';
  }

  function section(icon, label, sub, list) {
    if (!list.length) return '';
    return '<h2 class="section-head">' + icon + ' ' + label + ' <span class="count">(' + list.length + ')' + (sub ? ' · ' + sub : '') + '</span></h2>' +
      '<ul class="cards">' + list.map(cardHtml).join('') + '</ul>';
  }

  function gothramOptions() {
    var set = {};
    COMMON_GOTHRAMS.concat((data.items || []).map(function (it) { return it.gothram; })).forEach(function (g) {
      if (hasValue(g)) set[normGothram(g)] = String(g).replace(/கோத்திரம்/g, '').trim();
    });
    var names = Object.keys(set).map(function (k) { return set[k]; }).sort(function (a, b) { return a.localeCompare(b, 'ta'); });
    var chosen = normGothram(state.gothram);
    return '<option value="">— தேர்ந்தெடுக்கவில்லை —</option>' + names.map(function (g) {
      return '<option value="' + esc(g) + '"' + (normGothram(g) === chosen && chosen ? ' selected' : '') + '>' + esc(g) + '</option>';
    }).join('');
  }

  function renderHome(prev, opts) {
    setChrome('home');
    var items = data.items || [];
    var g = { liked: [], 'new': [], seen: [], rejected: [] };
    items.forEach(function (it) { g[statusOf(it.id)].push(it); });
    g.liked.sort(function (a, b) { return (peek(b.id).statusAt || 0) - (peek(a.id).statusAt || 0); });
    g['new'].sort(byAddedDesc);
    g.seen.sort(function (a, b) { return (peek(b.id).seen || 0) - (peek(a.id).seen || 0); });
    var visible = items.length - g.rejected.length;

    var html = '';
    if (data.sample) html += '<p class="sample-note">இவை மாதிரி (சோதனை) தகவல்கள் மட்டுமே. உண்மையான ஜாதகங்கள் விரைவில் சேர்க்கப்படும்.</p>';

    if (!items.length) {
      html += '<p class="empty">ஜாதகங்கள் இன்னும் சேர்க்கப்படவில்லை.</p>';
    } else {
      html += '<p class="summary">மொத்தம் <b>' + visible + '</b> · புதியவை <b>' + g['new'].length + '</b> · பிடித்தவை <b>' + g.liked.length + '</b></p>';
      var first = nextNew(null);
      if (first) {
        html += '<a class="big-btn primary start-btn" href="#/j/' + encodeURIComponent(first.id) + '" data-go>புதியவற்றைப் பார்க்கத் தொடங்கு (' + first.count + ') →</a>';
      } else if (visible) {
        html += '<p class="sample-note" style="border-style:solid">✓ புதிய ஜாதகம் எதுவும் இல்லை. எல்லாவற்றையும் பார்த்துவிட்டீர்கள்.</p>';
      }
      html += section('★', 'பிடித்தவை', '', g.liked);
      html += section('●', 'புதியவை', 'இன்னும் பார்க்கவில்லை', g['new']);
      html += section('✓', 'பார்த்தவை', '', g.seen);
      if (!visible) html += '<p class="empty">எல்லா ஜாதகங்களையும் மறைத்துவிட்டீர்கள்.</p>';
      if (g.rejected.length) {
        html += '<a class="big-btn plain hidden-link" href="#/hidden" data-go>வேண்டாம் என்று மறைத்தவை (' + g.rejected.length + ') →</a>';
      }
    }

    html += '<section class="settings"><h2>அமைப்பு</h2>' +
      '<label for="gothramSel">நம் கோத்திரம்<span class="hint">தேர்ந்தெடுத்தால், அதே கோத்திரம் உள்ள ஜாதகங்களில் ⚠ குறிப்பு தெரியும்.</span></label>' +
      '<select id="gothramSel">' + gothramOptions() + '</select></section>';
    html += '<p class="local-note">உங்கள் குறிகள் இந்த ஃபோனில் மட்டுமே சேமிக்கப்படும்.</p>';

    app.innerHTML = html;
    var returning = prev && prev.view !== 'home';
    if (opts.keepScroll) return;
    window.scrollTo(0, returning ? homeScroll : 0);
  }

  /* ---------------- hidden (rejected) pile ---------------- */
  function renderHidden(opts) {
    setChrome('hidden', 'மறைத்தவை — ஜாதகங்கள்');
    var list = (data.items || []).filter(function (it) { return statusOf(it.id) === 'rejected'; })
      .sort(function (a, b) { return (peek(b.id).statusAt || 0) - (peek(a.id).statusAt || 0); });
    var html = '<h2 class="d-name">வேண்டாம் என்று மறைத்தவை</h2>' +
      '<p class="summary">தவறுதலாக மறைத்திருந்தால், “மீண்டும் சேர்” அழுத்தவும்.</p>';
    if (!list.length) html += '<p class="empty">மறைத்த ஜாதகம் எதுவும் இல்லை.</p>';
    else {
      html += '<ul class="cards">' + list.map(function (it) {
        return cardHtml(it).replace('</a></li>', '</a><button type="button" class="big-btn plain" style="margin-top:.4rem" data-act="restore" data-id="' + esc(it.id) + '">↺ மீண்டும் சேர்</button></li>');
      }).join('') + '</ul>';
    }
    app.innerHTML = html;
    if (!opts.keepScroll) window.scrollTo(0, 0);
  }

  /* ---------------- detail: one jathagam ---------------- */
  function fact(label, value, sub, cls) {
    if (!hasValue(value)) return '';
    return '<div class="fact' + (cls ? ' ' + cls : '') + '"><dt>' + label + '</dt><dd>' + value + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</dd></div>';
  }

  function kattamHtml(it) {
    var k = it.kattam;
    if (!k || typeof k !== 'object') return '';
    var rasiNo = RASIS.indexOf(it.rasi) + 1;
    var cells = '';
    var lagnaNo = 0;
    for (var r = 1; r <= 12; r++) {
      var ps = (k[r] || []).slice().sort(function (a, b) { return PLANET_ORDER.indexOf(a) - PLANET_ORDER.indexOf(b); });
      if (ps.indexOf('La') !== -1) lagnaNo = r;
      var pos = KATTAM_POS[r];
      var planets = ps.map(function (p) {
        var cls = p === 'La' ? ' class="lagna"' : p === 'Mo' ? ' class="moon"' : '';
        return '<span' + cls + '>' + (PLANETS[p] || esc(p)) + '</span>';
      }).join('');
      cells += '<div class="k-cell' + (r === rasiNo ? ' is-rasi' : '') + (ps.indexOf('La') !== -1 ? ' is-lagna' : '') +
        '" style="grid-row:' + pos[0] + ';grid-column:' + pos[1] + '"><span class="k-sign" title="' + RASIS[r - 1] + '">' + RASI_SHORT[r - 1] + '</span><span class="k-planets">' + planets + '</span></div>';
    }
    cells += '<div class="k-center">ராசி<small>' + esc(it.name) + '</small></div>';
    return '<section class="block"><h2>ராசிக் கட்டம்</h2>' +
      '<div class="kattam" role="img" aria-label="ராசிக் கட்டம்">' + cells + '</div>' +
      '<p class="k-legend"><span><b class="lagna" style="color:var(--maroon)">லக்</b> = லக்னம்</span><span><b style="color:var(--green)">சந்</b> = சந்திரன் (ராசி)</span></p></section>';
  }

  function renderDetail(id, opts) {
    var it = byId[id];
    if (!it) {
      setChrome('detail', 'ஜாதகம்');
      app.innerHTML = '<p class="empty">இந்த ஜாதகம் கிடைக்கவில்லை.</p>';
      return;
    }
    var m = mark(id);
    var firstView = !m.seen;
    if (!m.seen) { m.seen = Date.now(); save(); }
    lastViewedId = id;
    setChrome('detail', it.name + ' — ஜாதகம்');

    var st = m.status;
    var badge = st === 'liked' ? '<span class="badge liked">★ பிடித்தது</span>'
      : st === 'rejected' ? '<span class="badge rejected">வேண்டாம் என்று மறைத்தது</span>'
      : firstView ? '<span class="badge new">புதிது — முதல் முறை பார்க்கிறீர்கள்</span>'
      : '<span class="badge seen">முன்பே பார்த்தது</span>';

    var age = ageOf(it.dob);
    var dosham = hasValue(it.dosham) ? esc(it.dosham) : '';
    var doshamWarn = dosham && it.dosham.trim() !== 'இல்லை';

    var html = '<h2 class="d-name">' + esc(it.name) + '</h2><div class="d-status">' + badge + '</div>';
    html += '<button type="button" class="big-btn plain speak-btn" id="speakBtn" data-act="speak" aria-pressed="false"' + (taVoice ? '' : ' hidden') + '>🔊 படித்துக் காட்டு</button>';

    if (sameGothram(it)) html += '<p class="flag" style="margin:0 0 1rem">⚠ இது நம் கோத்திரமே (' + esc(it.gothram) + ')</p>';

    html += '<section class="block"><h2>ஜாதக விவரம்</h2><dl class="facts">' +
      fact('ராசி', esc(it.rasi)) +
      fact('நட்சத்திரம்', esc(it.nakshatram) + (it.padam ? ', ' + esc(it.padam) + '-ஆம் பாதம்' : '')) +
      fact('லக்னம்', esc(it.lagnam)) +
      fact('கோத்திரம்', esc(it.gothram)) +
      fact('பிறந்த தேதி', hasValue(it.dob) ? formatDate(it.dob) : '', weekdayOf(it.dob)) +
      fact('பிறந்த நேரம்', hasValue(it.tob) ? formatTime(it.tob) : '') +
      fact('பிறந்த ஊர்', esc(it.pob)) +
      fact('வயது', age != null ? age + ' வயது' : '') +
      fact('தோஷம்', dosham, '', doshamWarn ? 'warn' : '') +
      '</dl></section>';

    var fam = fact('படிப்பு', esc(it.education)) + fact('வேலை', esc(it.job)) + fact('உயரம்', esc(it.height)) +
      fact('தந்தை', esc(it.father)) + fact('தாய்', esc(it.mother)) + fact('உடன்பிறந்தோர்', esc(it.siblings));
    if (fam) html += '<section class="block"><h2>படிப்பு, வேலை, குடும்பம்</h2><dl class="facts">' + fam + '</dl></section>';

    html += kattamHtml(it);

    if (hasValue(it.notes)) html += '<section class="block"><h2>மேலும் விவரம்</h2><p style="margin:.3rem 0 .4rem">' + esc(it.notes) + '</p></section>';

    html += '<section class="block note-box"><h2><label for="myNote">📝 என் குறிப்பு</label></h2>' +
      '<textarea id="myNote" data-id="' + esc(id) + '" placeholder="இங்கே எழுதலாம். உதா: தொலைபேசியில் பேசினோம்.">' + esc(m.note || '') + '</textarea>' +
      '<p class="note-saved" id="noteSaved" aria-live="polite"></p></section>';

    html += '<p class="seen-info">முதலில் பார்த்தது: ' + relDay(m.seen) + '</p>';

    var nx = nextNew(id);
    if (nx && st !== 'rejected') {
      html += '<button type="button" class="big-btn primary next-btn" data-act="next" data-id="' + esc(nx.id) + '">அடுத்த புதிய ஜாதகம் → (இன்னும் ' + nx.count + ')</button>';
    }

    html += '<div class="actions"><div class="actions-inner">' + (st === 'rejected'
      ? '<button type="button" class="act restore" data-act="restore" data-id="' + esc(id) + '">↺ மீண்டும் பட்டியலில் சேர்</button>'
      : '<button type="button" class="act like" data-act="like" data-id="' + esc(id) + '" aria-pressed="' + (st === 'liked') + '">' + (st === 'liked' ? '★ பிடித்தது ✓' : '☆ பிடித்தது') + '</button>' +
        '<button type="button" class="act reject" data-act="reject" data-id="' + esc(id) + '">✕ வேண்டாம்</button>') +
      '</div></div>';

    app.innerHTML = html;
    if (!opts.keepScroll) window.scrollTo(0, 0);
  }

  /* ---------------- clicks ---------------- */
  app.addEventListener('click', function (e) {
    var link = e.target.closest('[data-go]');
    if (link) { e.preventDefault(); go(link.getAttribute('href')); return; }

    var b = e.target.closest('[data-act]');
    if (!b) return;
    var id = b.getAttribute('data-id');
    var it = id ? byId[id] : null;
    var act = b.getAttribute('data-act');

    if (act === 'like' && it) {
      if (peek(id).status === 'liked') {
        setStatus(id, null);
        toast('பிடித்தவையிலிருந்து நீக்கப்பட்டது', function () { setStatus(id, 'liked'); render({ keepScroll: true }); });
      } else {
        setStatus(id, 'liked');
        toast('★ பிடித்தவையில் சேர்க்கப்பட்டது');
      }
      render({ keepScroll: true });
    } else if (act === 'reject' && it) {
      var prevStatus = peek(id).status || null;
      setStatus(id, 'rejected');
      goBack();
      toast('“' + it.name + '” மறைக்கப்பட்டது', function () {
        setStatus(id, prevStatus);
        render({ keepScroll: true });
        toast('மீண்டும் பட்டியலில் சேர்க்கப்பட்டது');
      });
    } else if (act === 'restore' && it) {
      setStatus(id, null);
      render({ keepScroll: true });
      toast('“' + it.name + '” மீண்டும் பட்டியலில் சேர்க்கப்பட்டது');
    } else if (act === 'next' && it) {
      // replace, so the phone's back button still returns to the list
      history.replaceState(history.state, '', '#/j/' + encodeURIComponent(id));
      render();
    } else if (act === 'speak') {
      var cur = current && byId[current.id];
      if (cur) toggleSpeech(cur, b);
    } else if (act === 'retry') {
      loadData();
    }
  });

  app.addEventListener('input', function (e) {
    if (e.target.id !== 'myNote') return;
    var id = e.target.getAttribute('data-id');
    var v = e.target.value;
    var m = mark(id);
    if (v.trim()) m.note = v; else delete m.note;
    save();
    var saved = document.getElementById('noteSaved');
    if (saved) saved.textContent = '';
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { if (saved) saved.textContent = '✓ சேமிக்கப்பட்டது'; }, 700);
  });

  app.addEventListener('change', function (e) {
    if (e.target.id !== 'gothramSel') return;
    state.gothram = e.target.value;
    save();
    render({ keepScroll: true });
    toast(state.gothram ? 'நம் கோத்திரம்: ' + state.gothram : 'கோத்திரம் நீக்கப்பட்டது');
  });

  /* ---------------- load ---------------- */
  function loadData() {
    app.innerHTML = '<p class="loading">ஏற்றுகிறது…</p>';
    fetch('data/jathagams.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        data = d && typeof d === 'object' ? d : { items: [] };
        if (!Array.isArray(data.items)) data.items = [];
        byId = {};
        data.items.forEach(function (it) { if (it && it.id) byId[it.id] = it; });
        render();
      })
      .catch(function () {
        app.innerHTML = '<p class="empty">தகவல்களை ஏற்ற முடியவில்லை.<br>இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.</p>' +
          '<button type="button" class="big-btn primary" data-act="retry">மீண்டும் முயற்சி</button>';
      });
  }
  loadData();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline install is a bonus, never a blocker */ });
  }
})();
