/* ==========================================================
   FLOW engine — renders a chapter (window.FLOW_CHAPTER) as a
   sequence of one-idea beats, with sudden timed questions,
   confidence capture, layered deep-dives, adaptive timing,
   spaced resurfacing of misses, and saved state.
   Vanilla JS, no dependencies.
   ========================================================== */
(function () {
  "use strict";
  const C = window.FLOW_CHAPTER;
  if (!C) return;
  const KEY = "flow-" + C.id;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------------- state ---------------- */
  const fresh = () => ({ i: 0, streak: 0, best: 0, answered: {}, layers: 0, hcMiss: 0, tBase: 28, retryQ: [], bonusPending: false, bonusUsed: [], sound: true, done: false });
  let S = fresh();
  try { const saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved && typeof saved.i === "number") S = Object.assign(fresh(), saved); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  /* ---------------- sound (tiny WebAudio) ---------------- */
  let AC = null;
  function tone(freq, dur, type = "sine", vol = 0.06, delay = 0, slideTo) {
    if (!S.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const sfx = {
    pop() { tone(300, 0.18, "triangle", 0.09, 0, 180); tone(900, 0.08, "sine", 0.03, 0.02); },
    good() { tone(660, 0.14, "sine", 0.07); tone(880, 0.22, "sine", 0.07, 0.1); tone(1320, 0.3, "sine", 0.03, 0.2); },
    bad() { tone(220, 0.28, "triangle", 0.07, 0, 170); },
    tick() { tone(1400, 0.03, "square", 0.012); },
    deep() { tone(392, 0.25, "sine", 0.05, 0, 262); },
    step() { tone(520, 0.06, "sine", 0.04); }
  };

  /* ---------------- tiny java highlighter ---------------- */
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const KW = new Set("public private protected static void class new return if else int long boolean final import package for while".split(" "));
  const TY = new Set("String System Object Integer Greeter Hello App Rare Apple IO".split(" "));
  function hl(src) {
    const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|([A-Za-z_][A-Za-z0-9_]*)|(\d[\d_]*)/g;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index)); last = re.lastIndex;
      if (m[1]) out += `<span class="cm">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="st">${esc(m[2])}</span>`;
      else if (m[3]) out += KW.has(m[3]) ? `<span class="kw">${m[3]}</span>` : TY.has(m[3]) ? `<span class="ty">${m[3]}</span>` : m[3];
      else out += `<span class="nu">${m[4]}</span>`;
    }
    return out + esc(src.slice(last));
  }
  const codeBlock = (c) => (c.file ? `<span class="file-tab">${esc(c.file)}</span>` : "") + `<pre class="code">${hl(c.src)}</pre>`;

  /* ---------------- DOM shell ---------------- */
  const stage = $("#stage"), actEl = $("#act"), streakEl = $("#streak"), soundBtn = $("#sound");
  const goBtn = $("#go"), backBtn = $("#back");
  const rail = $("#rail");
  const N = C.beats.length;

  function buildRail() {
    rail.innerHTML = '<div class="fill"></div><div class="dot"></div>';
    C.acts.forEach((a) => {
      const m = el("div", "mark", a.name);
      m.style.top = (a.from / (N - 1)) * 100 + "%";
      m.dataset.from = a.from;
      rail.appendChild(m);
    });
  }
  function updateRail() {
    const f = S.i / (N - 1);
    $(".fill", rail).style.height = f * 100 + "%";
    rail.style.setProperty("--w", f * 100 + "%");
    $(".dot", rail).style.top = `calc(${f * 100}% - 4px)`;
    rail.querySelectorAll(".mark").forEach((m) => m.classList.toggle("on", +m.dataset.from <= S.i));
  }
  function actOf(i) { let a = C.acts[0]; C.acts.forEach((x) => { if (x.from <= i) a = x; }); return a; }
  function updateBar() {
    actEl.style.opacity = 0;
    setTimeout(() => { actEl.textContent = actOf(S.i).name; actEl.style.opacity = 1; }, 200);
    streakEl.querySelector(".n").textContent = S.streak;
    streakEl.classList.toggle("hot", S.streak >= 2);
    soundBtn.textContent = S.sound ? "🔊" : "🔇";
  }

  /* ---------------- widgets ---------------- */
  function widgetPipeline(w) {
    const box = el("div");
    const grid = el("div", "pipe");
    w.nodes.forEach((n) => grid.appendChild(el("div", "pnode", `<span class="i">${n.i}</span><div class="t">${n.t}</div><div class="s">${n.s}</div>`)));
    const btn = el("button", "mini-btn amber", "▶ Play the journey");
    let running = false;
    btn.onclick = () => {
      if (running) return; running = true;
      const nodes = grid.querySelectorAll(".pnode");
      nodes.forEach((n) => n.classList.remove("lit"));
      nodes.forEach((n, k) => setTimeout(() => { n.classList.add("lit"); sfx.step(); if (k === nodes.length - 1) { running = false; btn.textContent = "↻ Replay"; } }, 450 * (k + 1)));
    };
    box.append(grid, btn);
    return box;
  }
  function widgetHex(w) {
    const box = el("div");
    const hex = el("div", "hex");
    const lab = el("div", "hexlabel", w.prompt);
    w.groups.forEach((g, k) => {
      const b = el("button", "hgrp", g.b);
      b.onclick = () => {
        hex.querySelectorAll(".hgrp").forEach((x, j) => { x.classList.toggle("on", j === k); x.classList.toggle("faded", j !== k); });
        lab.innerHTML = g.l; sfx.step();
      };
      hex.appendChild(b);
    });
    box.append(hex, lab);
    return box;
  }
  function widgetStepper(w) {
    const box = el("div");
    const vm = el("div", "vm");
    const insBox = el("div", "vmbox", "<h4>Bytecode</h4>");
    const stBox = el("div", "vmbox", "<h4>Operand stack</h4>");
    const loBox = el("div", "vmbox", "<h4>Local variables</h4>");
    const stack = el("div", "stack"); stBox.appendChild(stack);
    const locals = el("div", "locals"); loBox.appendChild(locals);
    w.code.forEach((c) => insBox.appendChild(el("div", "ins", c.op)));
    vm.append(insBox, stBox, loBox);
    const note = el("div", "vmnote", w.intro);
    const row = el("div", "row-btns");
    const stepB = el("button", "mini-btn amber", "Step ▸");
    const resetB = el("button", "mini-btn", "Reset");
    row.append(stepB, resetB);
    let pc, st, lv;
    const names = w.slots;
    function drawLocals(flash) {
      locals.innerHTML = "";
      names.forEach((n, k) => {
        locals.appendChild(el("div", "k", `${k} · ${n}`));
        locals.appendChild(el("div", "v" + (flash === k ? " flash" : ""), lv[k] === undefined ? "—" : String(lv[k])));
      });
    }
    function drawStack() { stack.innerHTML = ""; st.forEach((v) => stack.appendChild(el("div", "slot", v))); }
    function reset() { pc = 0; st = []; lv = [names[0] === "args" ? "String[]" : undefined]; drawStack(); drawLocals(); insBox.querySelectorAll(".ins").forEach((x) => (x.className = "ins")); note.innerHTML = w.intro; stepB.disabled = false; }
    stepB.onclick = () => {
      if (pc >= w.code.length) return;
      const c = w.code[pc], [op, arg] = c.op.split("_");
      let flash;
      if (op === "iconst") st.push(+arg);
      else if (op === "iload") st.push(lv[+arg]);
      else if (op === "istore") { lv[+arg] = st.pop(); flash = +arg; }
      else if (op === "iadd") { const b = st.pop(), a = st.pop(); st.push(a + b); }
      insBox.querySelectorAll(".ins").forEach((x, k) => (x.className = "ins" + (k < pc ? " done" : k === pc ? " cur" : "")));
      drawStack(); drawLocals(flash); note.innerHTML = c.note; sfx.step();
      pc++;
      if (pc >= w.code.length) { stepB.disabled = true; setTimeout(() => (note.innerHTML += " " + w.outro), 400); }
    };
    resetB.onclick = reset;
    reset();
    box.append(vm, note, row);
    return box;
  }

  /* ---------------- beat rendering ---------------- */
  function renderBeat(dir = 1) {
    const b = C.beats[S.i];
    const old = $(".beat", stage);
    const draw = () => {
      stage.innerHTML = "";
      const node = b.type === "landing" ? renderLanding(b) : renderStory(b);
      stage.appendChild(node);
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      updateRail(); updateBar();
      goBtn.textContent = b.type === "title" ? (S.i === 0 && Object.keys(S.answered).length ? "Continue" : "Begin") : b.type === "landing" ? "Back to FLOW" : "Continue";
      backBtn.style.visibility = S.i > 0 ? "visible" : "hidden";
      onEnterBeat();
    };
    if (old) { old.classList.add("out"); setTimeout(draw, 300); } else draw();
    save();
  }

  function renderStory(b) {
    const n = el("div", "beat");
    if (b.kicker) n.appendChild(el("div", "kicker", b.kicker));
    if (b.h1) n.appendChild(el("h1", "", b.h1));
    if (b.h) n.appendChild(el("h2", "", b.h));
    if (b.sub) n.appendChild(el("p", "sub", b.sub));
    (b.p || []).forEach((p) => n.appendChild(el("p", "", p)));
    if (b.code) { const w = el("div", "", codeBlock(b.code)); n.appendChild(w); }
    (b.after || []).forEach((p) => n.appendChild(el("p", "", p)));
    if (b.widget) {
      const w = b.widget.type === "pipeline" ? widgetPipeline(b.widget) : b.widget.type === "hex" ? widgetHex(b.widget) : widgetStepper(b.widget);
      n.appendChild(w);
    }
    if (b.aside) n.appendChild(el("div", "aside", b.aside));
    if (b.reveal) {
      const r = el("button", "reveal", `<span class="q">${b.reveal.q}</span><span class="hint">tap to find out</span>`);
      r.onclick = () => {
        if (r.classList.contains("open")) return;
        r.classList.add("open"); r.querySelector(".hint").remove();
        r.appendChild(el("span", "ans", b.reveal.a)); sfx.step();
      };
      n.appendChild(r);
    }
    if (b.whisper) n.appendChild(el("p", "whisper", b.whisper));
    return n;
  }

  /* ---------------- question queue ---------------- */
  let queue = [], fireT = null, popupOpen = false;
  function onEnterBeat() {
    clearTimeout(fireT); queue = [];
    const b = C.beats[S.i];
    if (b.type === "landing") {
      S.done = true; try { localStorage.setItem(KEY + "-done", "1"); } catch (e) {}
      // last chance: everything still waiting to resurface comes back now
      S.retryQ.forEach((r) => queue.push({ id: r.id, kind: "retry" }));
      S.retryQ = []; save();
      if (queue.length) schedule(rand(2500, 4000));
      return;
    }
    if (b.q && !S.answered[b.q]) queue.push({ id: b.q, kind: C.questions[b.q].pre ? "pre" : "main" });
    // one extra per beat: a due retry beats a bonus
    const due = S.retryQ.findIndex((r) => r.due <= S.i);
    if (due >= 0) { queue.push({ id: S.retryQ[due].id, kind: "retry" }); S.retryQ.splice(due, 1); }
    else if (S.bonusPending) {
      const left = C.bonus.filter((id) => !S.bonusUsed.includes(id));
      if (left.length) { const id = pick(left); queue.push({ id, kind: "bonus" }); S.bonusUsed.push(id); }
      S.bonusPending = false;
    }
    save();
    if (queue.length) schedule(b.q && C.questions[b.q].fast ? rand(1500, 3000) : rand(3500, 7500));
  }
  function schedule(ms) { clearTimeout(fireT); fireT = setTimeout(fireNext, ms); }
  function fireNext() { if (popupOpen || !queue.length) return; openQuestion(queue.shift()); }

  function toast(msg) { const t = el("div", "toast", msg); document.body.appendChild(t); setTimeout(() => t.remove(), 1700); }

  /* ---------------- hourglass ---------------- */
  function hourglass() {
    const g = el("div", "glass");
    g.innerHTML = `
      <svg viewBox="0 0 44 66" aria-hidden="true">
        <defs>
          <clipPath id="topBulb"><path d="M6 6 H38 C38 20 26 26 23 33 H21 C18 26 6 20 6 6Z"/></clipPath>
          <clipPath id="botBulb"><path d="M21 33 H23 C26 40 38 46 38 60 H6 C6 46 18 40 21 33Z"/></clipPath>
        </defs>
        <rect class="sand top" x="0" y="6" width="44" height="27" clip-path="url(#topBulb)"/>
        <rect class="sand bot" x="0" y="60" width="44" height="0" clip-path="url(#botBulb)"/>
        <line class="stream" x1="22" y1="33" x2="22" y2="60"/>
        <path class="frame" d="M6 6 H38 C38 20 26 26 23 33 C26 40 38 46 38 60 H6 C6 46 18 40 21 33 C18 26 6 20 6 6Z"/>
        <rect class="cap" x="3" y="2" width="38" height="4" rx="2"/>
        <rect class="cap" x="3" y="60" width="38" height="4" rx="2"/>
      </svg><div class="secs">--</div>`;
    const top = g.querySelector(".top"), bot = g.querySelector(".bot"), secs = g.querySelector(".secs");
    let dur = 30000, elapsed = 0, startAt = 0, raf = 0, running = false, lastSec = -1, onEnd = null;
    function paint() {
      const f = Math.min(1, elapsed / dur);
      const th = Math.max(0, 27 * (1 - f) * (1 - f * 0.15)); // top drains (slightly nonlinear: bulb narrows)
      top.setAttribute("y", 33 - th); top.setAttribute("height", th);
      const bh = 27 * f; bot.setAttribute("y", 60 - bh); bot.setAttribute("height", bh);
      const left = Math.max(0, Math.ceil((dur - elapsed) / 1000));
      secs.textContent = left + "s";
      g.classList.toggle("low", left <= 5 && f < 1);
      if (left <= 5 && left !== lastSec && left > 0 && running) sfx.tick();
      lastSec = left;
    }
    function loop(now) {
      if (!running) return;
      elapsed = now - startAt;
      paint();
      if (elapsed >= dur) { running = false; g.classList.add("stopped"); g.classList.remove("low"); onEnd && onEnd(); return; }
      raf = requestAnimationFrame(loop);
    }
    return {
      node: g,
      start(ms, cb) { dur = ms; elapsed = 0; onEnd = cb; running = true; startAt = performance.now(); raf = requestAnimationFrame(loop); },
      stop() { running = false; cancelAnimationFrame(raf); g.classList.add("stopped"); g.classList.remove("low"); return elapsed; },
      pause() { if (!running) return; running = false; cancelAnimationFrame(raf); g.classList.add("paused"); },
      resume() { if (running || elapsed >= dur || g.classList.contains("stopped")) return; g.classList.remove("paused"); running = true; startAt = performance.now() - elapsed; raf = requestAnimationFrame(loop); },
      elapsed: () => elapsed
    };
  }

  /* ---------------- the popup ---------------- */
  let current = null; // {q, item, glass, phase, picked, conf, late, layer, card}
  const TAGS = {
    pre: ["Guess first", "You haven't learned this yet. Guess anyway."],
    main: ["Pop quiz", "No warning. That's the point."],
    bonus: ["Bonus · harder", "You're on a streak, so here's a harder one."],
    retry: ["It's back", "You missed this earlier. Can you pull it back now?"]
  };

  function openQuestion(item) {
    const q = C.questions[item.id];
    popupOpen = true;
    const layer = el("div", "qlayer");
    const card = el("div", "qcard");
    const [tag, sub] = TAGS[item.kind];
    const top = el("div", "qtop", `<div class="qtag">${tag}<span class="sub2">${sub}</span></div>`);
    const glass = hourglass();
    top.appendChild(glass.node);
    card.appendChild(top);
    card.appendChild(el("div", "qstem", q.stem));
    if (q.code) card.appendChild(el("div", "", codeBlock(q.code)));
    const opts = el("div", "opts");
    // shuffle every time: answer position never leaks, and retries can't be passed on position memory
    const order = q.opts.map((_, k) => k);
    for (let a = order.length - 1; a > 0; a--) { const b = Math.floor(Math.random() * (a + 1)); [order[a], order[b]] = [order[b], order[a]]; }
    order.forEach((k, pos) => {
      const b = el("button", "opt", `<span class="k">${pos + 1}</span><span>${q.opts[k]}</span>`);
      b.dataset.k = k;
      b.onclick = () => choose(k, b);
      opts.appendChild(b);
    });
    card.appendChild(opts);
    layer.appendChild(card);
    document.body.appendChild(layer);
    document.body.style.overflow = "hidden";
    sfx.pop();

    let ms = S.tBase * 1000;
    if (q.code) ms += 10000;
    if (item.kind === "pre") ms += 6000;
    if (q.warm) ms = 40000;
    if (item.kind === "retry") ms = Math.max(15000, ms - 5000);
    current = { q, item, glass, card, opts, phase: "ask", late: false, layer: 0, root: layer, t0: performance.now() };
    glass.start(ms, () => {
      current.late = true;
      const note = el("div", "brain", "The sand ran out, but the question didn't. Answer anyway. It won't count against you.");
      note.style.marginTop = "12px"; card.insertBefore(note, opts.nextSibling);
    });
  }

  function choose(k, btn) {
    if (!current || current.phase !== "ask") return;
    current.phase = "conf";
    current.picked = k;
    current.time = current.glass.stop();
    current.opts.querySelectorAll(".opt").forEach((b) => { b.disabled = true; if (b !== btn) b.classList.add("dim"); });
    btn.classList.add("picked");
    const conf = el("div", "conf", `<div class="lbl">Before you see it, how sure are you?</div>`);
    const row = el("div", "row");
    [["Guess", "coin flip"], ["Fairly sure", "leaning"], ["Certain", "bet on it"]].forEach(([a, s], c) => {
      const b = el("button", "", `${a}<small>${s}</small>`);
      b.onclick = () => reveal(c);
      row.appendChild(b);
    });
    conf.appendChild(row);
    current.card.appendChild(conf);
    current.confEl = conf;
  }

  function sparks(from, colors) {
    const r = from.getBoundingClientRect();
    const cx = r.left + r.width * 0.15, cy = r.top + r.height / 2;
    for (let i = 0; i < 22; i++) {
      const s = el("div", "spark");
      const a = Math.random() * Math.PI * 2, d = rand(40, 130);
      s.style.left = cx + "px"; s.style.top = cy + "px";
      s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d - 30 + "px");
      s.style.setProperty("--c", pick(colors));
      document.body.appendChild(s); setTimeout(() => s.remove(), 950);
    }
  }

  function brainNote(ok, conf, kind, late, fast) {
    if (late) return "Late answers still count for your brain. The search you just ran is what strengthens the memory.";
    if (kind === "retry" && ok) return "Spaced retrieval: pulling something back after a gap is what moves it into long-term memory.";
    if (!ok && conf === 2) return "Hypercorrection effect: confident mistakes get corrected hardest. You'll likely remember this one for years.";
    if (!ok && kind === "pre") return "Pretesting effect: a wrong guess before learning makes the real answer stick better than reading it cold.";
    if (!ok) return "Error, then instant feedback, is one of the fastest learning loops there is. Your brain is rewiring right now.";
    if (ok && conf === 0) return "Right, but you weren't sure. Say why it's right out loud. Explaining it is what locks it in.";
    if (ok && fast) return "Prediction confirmed, fast. That small hit of satisfaction is dopamine tagging this path as worth keeping.";
    return "Correct. Read layer 1 anyway: knowing why is what lets you transfer it to new problems.";
  }

  function reveal(conf) {
    const cur = current; if (!cur || cur.phase !== "conf") return;
    cur.phase = "reveal"; cur.conf = conf;
    cur.confEl.remove();
    const q = cur.q, ok = cur.picked === q.ans;
    const fast = cur.time < (S.tBase * 1000) / 2;
    cur.opts.querySelectorAll(".opt").forEach((b) => {
      const k = +b.dataset.k;
      b.classList.remove("picked", "dim");
      if (k === q.ans) b.classList.add("right");
      else if (k === cur.picked) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    // scoring + adaptation (challenge rides the edge)
    const counts = !cur.late;
    if (ok && counts) {
      S.streak++; S.best = Math.max(S.best, S.streak);
      if (fast) S.tBase = Math.max(14, S.tBase - 3);
      if (S.streak >= 2 && S.streak % 2 === 0) S.bonusPending = true;
    } else {
      S.streak = 0;
      if (!ok) S.tBase = Math.min(45, S.tBase + 5);
    }
    if (!ok && conf === 2) S.hcMiss++;
    if (!ok && cur.item.kind !== "retry") S.retryQ.push({ id: q.id, due: S.i + 3 });
    if (cur.item.kind !== "retry" && cur.item.kind !== "bonus") S.answered[q.id] = { ok, conf, late: cur.late };
    else if (cur.item.kind === "bonus") S.answered[q.id] = { ok, conf, late: cur.late, bonus: true };
    else if (S.answered[q.id]) S.answered[q.id].retryOk = ok;
    save(); updateBar();

    if (ok) { sfx.good(); sparks(cur.opts.querySelector(".right"), ["#f2a541", "#6fd6a8", "#ffd59a"]); }
    else { sfx.bad(); cur.card.classList.remove("shake"); void cur.card.offsetWidth; cur.card.classList.add("shake"); }

    const v = el("div", "verdict " + (cur.late && ok ? "late" : ok ? "ok" : "no"));
    const big = cur.late && ok ? "Right, just after the sand ran out."
      : ok ? pick(q.okLine ? [q.okLine] : ["Nailed it.", "Exactly right.", "Yes. You saw through it.", "Correct. This one fools a lot of people."])
      : pick(["Not quite. Here's what's really going on.", "That's the trap. Let's open it up.", "Good instinct, wrong layer. Let's go down."]);
    v.innerHTML = `<div class="big">${big}</div><div class="brain">${brainNote(ok, conf, cur.item.kind, cur.late, fast)}</div>`;
    cur.card.appendChild(v);

    cur.layersEl = el("div", "layers");
    cur.card.appendChild(cur.layersEl);
    cur.nav = el("div", "qnav");
    cur.dots = el("div", "depthdots", "Depth " + q.layers.map(() => "<i></i>").join(""));
    const btns = el("div", "btns");
    cur.deeper = el("button", "deeper", "Go deeper ↓");
    cur.deeper.onclick = deeper;
    const back = el("button", "resume", "Back to the story →");
    back.onclick = closeQuestion;
    btns.append(cur.deeper, back);
    cur.nav.append(cur.dots, btns);
    cur.card.appendChild(cur.nav);
    deeper(true);
  }

  function deeper(first) {
    const cur = current; if (!cur || cur.phase !== "reveal") return;
    const q = cur.q; if (cur.layer >= q.layers.length) return;
    const L = q.layers[cur.layer];
    const names = ["Layer 1", "Layer 2", "Layer 3"];
    const node = el("div", "layer", `<div class="lh"><span class="ln">${names[cur.layer]}</span><span class="lt">${L.t}</span></div>${L.h}`);
    cur.layersEl.appendChild(node);
    cur.layer++;
    S.layers++; save();
    cur.dots.querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k < cur.layer));
    if (cur.layer >= q.layers.length) { cur.deeper.remove(); cur.nav.querySelector(".resume").classList.remove("ghost"); }
    else if (cur.layer === 1) cur.deeper.textContent = "Go deeper ↓";
    else cur.deeper.textContent = "The rabbit hole ↓";
    if (first !== true) {
      sfx.deep();
      setTimeout(() => node.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    }
  }

  function closeQuestion() {
    const cur = current; if (!cur) return;
    cur.root.classList.add("closing");
    setTimeout(() => { cur.root.remove(); document.body.style.overflow = ""; }, 280);
    current = null; popupOpen = false;
    if (queue.length) schedule(rand(2500, 5500));
  }

  document.addEventListener("visibilitychange", () => {
    if (!current || current.phase !== "ask") return;
    document.hidden ? current.glass.pause() : current.glass.resume();
  });

  /* ---------------- navigation ---------------- */
  function next() {
    if (popupOpen) return;
    const b = C.beats[S.i];
    if (b.type === "landing") { location.href = C.home || "../"; return; }
    if (queue.length) { clearTimeout(fireT); toast("Not so fast…"); setTimeout(fireNext, 450); return; }
    if (S.i < N - 1) { S.i++; renderBeat(1); }
  }
  function prev() { if (popupOpen || S.i === 0) return; clearTimeout(fireT); queue = []; S.i--; renderBeat(-1); }
  goBtn.onclick = next; backBtn.onclick = prev;
  soundBtn.onclick = () => { S.sound = !S.sound; save(); updateBar(); };

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (current) {
      if (current.phase === "ask" && /^[1-9]$/.test(e.key)) { const b = current.opts.querySelectorAll(".opt")[+e.key - 1]; if (b) b.click(); }
      else if (current.phase === "conf" && /^[1-3]$/.test(e.key)) reveal(+e.key - 1);
      else if (current.phase === "reveal") {
        if (e.key === "ArrowDown" || e.key === "d") { e.preventDefault(); deeper(); }
        else if (e.key === "Enter" || e.key === "Escape" || e.key === "ArrowRight") { e.preventDefault(); closeQuestion(); }
      }
      return;
    }
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { if (e.target.tagName === "BUTTON" && e.key !== "ArrowRight") return; e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") prev();
  });

  /* ---------------- landing ---------------- */
  function renderLanding(b) {
    const L = C.landing;
    const n = el("div", "beat");
    n.appendChild(el("div", "kicker", "Landing · consolidate"));
    n.appendChild(el("h2", "", L.h));
    n.appendChild(el("p", "", L.p));
    const ans = Object.values(S.answered).filter((a) => !a.bonus);
    const okN = ans.filter((a) => a.ok).length;
    const stats = el("div", "stats");
    [[`${okN}/${ans.length}`, "first-try correct"], [S.best, "best streak"], [S.layers, "layers descended"], [S.hcMiss, "confident misses (the sticky ones)"]]
      .forEach(([v, l]) => stats.appendChild(el("div", "stat", `<div class="v">${v}</div><div class="l">${l}</div>`)));
    n.appendChild(stats);

    const rec = el("div", "panel");
    rec.innerHTML = `<h4>Retrieve it · one sentence</h4><p style="margin:0 0 10px;color:var(--ink)">${L.recall}</p>`;
    const ta = el("textarea", "recall"); ta.placeholder = "Type from memory. Don't scroll back.";
    try { ta.value = localStorage.getItem(KEY + "-recall") || ""; } catch (e) {}
    ta.oninput = () => { try { localStorage.setItem(KEY + "-recall", ta.value); } catch (e) {} };
    const cmp = el("button", "mini-btn", "Compare with mine");
    cmp.style.marginTop = "10px";
    cmp.onclick = () => { if (cmp.nextSibling) return; const m = el("div", "aside", L.model); cmp.after(m); sfx.step(); };
    rec.append(ta, cmp);
    n.appendChild(rec);

    const kp = el("div", "panel", `<h4>The chapter in ${L.points.length} lines</h4><ul>${L.points.map((p) => `<li>${p}</li>`).join("")}</ul>`);
    n.appendChild(kp);

    const missed = Object.entries(S.answered).filter(([, a]) => !a.ok).map(([id]) => id);
    const left = C.bonus.filter((id) => !S.bonusUsed.includes(id));
    const btns = el("div", "row-btns");
    if (left.length) {
      const bb = el("button", "mini-btn amber", `Bonus round · ${left.length} hard question${left.length > 1 ? "s" : ""}`);
      bb.onclick = () => { left.forEach((id) => { queue.push({ id, kind: "bonus" }); S.bonusUsed.push(id); }); save(); bb.remove(); fireNext(); };
      btns.appendChild(bb);
    }
    if (missed.length) {
      const mb = el("button", "mini-btn", `Re-fight my ${missed.length} miss${missed.length > 1 ? "es" : ""}`);
      mb.onclick = () => { missed.forEach((id) => queue.push({ id, kind: "retry" })); fireNext(); };
      btns.appendChild(mb);
    }
    const rs = el("button", "mini-btn", "Start over");
    rs.onclick = () => { if (!confirmReset()) return; };
    btns.appendChild(rs);
    n.appendChild(btns);

    const bn = el("details", "panel brainnotes", `<summary>How this page works on your brain</summary><dl>${L.brain.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl>`);
    n.appendChild(bn);

    n.appendChild(el("div", "teaser", `<div class="kicker">Next · Chapter 2</div><p>${L.teaser}</p>`));
    return n;
  }
  let resetArmed = false;
  function confirmReset() {
    if (!resetArmed) { resetArmed = true; toast("Tap again to wipe progress"); setTimeout(() => (resetArmed = false), 2500); return false; }
    const snd = S.sound; S = fresh(); S.sound = snd; save();
    try { localStorage.removeItem(KEY + "-recall"); } catch (e) {}
    renderBeat(); return true;
  }

  /* ---------------- boot ---------------- */
  buildRail();
  if (S.i > 0 && !S.done) setTimeout(() => toast("Welcome back. Picking up where you left off."), 600);
  renderBeat();
})();
