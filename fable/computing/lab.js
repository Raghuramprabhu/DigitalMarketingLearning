/* Visual Lab 01: simulators. jQuery + plain SVG. */
$(function () {
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, cls, anchor) {
    var t = el("text", { x: x, y: y, "class": cls || "label", "text-anchor": anchor || "middle" }, parent);
    t.textContent = s; return t;
  }
  function tween(ms, fn, done) {
    var t0 = null;
    function f(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / ms), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      fn(e);
      if (p < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function bulb(parent, cx, cy, r) {
    var g = el("g", { "class": "bulb" }, parent);
    el("circle", { cx: cx, cy: cy, r: r * 2.2, "class": "glow" }, g);
    el("circle", { cx: cx, cy: cy, r: r, "class": "bulb-glass" }, g);
    el("path", { d: "M" + (cx - r / 2.5) + " " + (cy + r / 3) + " l" + (r / 5) + " -" + (r / 1.6) + " l" + (r / 5) + " " + (r / 2) + " l" + (r / 5) + " -" + (r / 2) + " l" + (r / 5) + " " + (r / 1.6), fill: "none", stroke: "var(--ink-soft)", "stroke-width": 1.5 }, g);
    return g;
  }
  function battery(parent, x, y, w, h) {
    el("rect", { x: x, y: y, width: w, height: h, rx: 4, "class": "s-bg", stroke: "var(--ink-soft)", "stroke-width": 2 }, parent);
    el("rect", { x: x + w / 2 - 5, y: y - 5, width: 10, height: 5, rx: 1, fill: "var(--ink-soft)" }, parent);
    txt(parent, x + w / 2, y + h / 2 + 5, "+", "label");
  }
  function term(parent, x, y) { return el("circle", { cx: x, cy: y, r: 4.5, fill: "var(--card)", stroke: "var(--ink)", "stroke-width": 2 }, parent); }

  /* =============== 1. Pascaline =============== */
  (function () {
    var svg = document.getElementById("pascal-svg");
    var CX = [70, 180, 290], CY = 118, R = 46;
    var digits = [0, 0, 2], rot = [0, 0, -72], groups = [], levers = [], busy = false;
    CX.forEach(function (cx, i) {
      el("circle", { cx: cx, cy: CY, r: R + 8, "class": "s-bg", stroke: "var(--line)", "stroke-width": 2 }, svg);
      var g = el("g", {}, svg);
      for (var k = 0; k < 10; k++) {
        var a = (k * 36 - 90) * Math.PI / 180;
        el("line", { x1: cx + Math.cos(a) * (R + 2), y1: CY + Math.sin(a) * (R + 2), x2: cx + Math.cos(a) * (R + 8), y2: CY + Math.sin(a) * (R + 8), stroke: "var(--ink-soft)", "stroke-width": 3 }, g);
        var t = txt(g, cx + Math.cos(a) * 31, CY + Math.sin(a) * 31 + 7, String(k), "digit");
        t.setAttribute("transform", "rotate(" + (k * 36) + " " + (cx + Math.cos(a) * 31) + " " + (CY + Math.sin(a) * 31) + ")");
      }
      el("circle", { cx: cx, cy: CY, r: 9, fill: "var(--ink-soft)" }, g);
      groups.push(g);
      el("rect", { x: cx - 17, y: CY - 52, width: 34, height: 32, rx: 7, fill: "none", stroke: "var(--accent)", "stroke-width": 3 }, svg);
      txt(svg, cx, 200, ["hundreds", "tens", "units"][i], "label-soft");
    });
    // carry levers between wheels (index 0: tens→hundreds, 1: units→tens)
    [125, 235].forEach(function (lx) {
      var g = el("g", {}, svg);
      el("line", { x1: lx - 24, y1: 40, x2: lx + 24, y2: 40, "class": "lever" }, g);
      el("circle", { cx: lx - 24, cy: 40, r: 7, fill: "var(--ink)" }, g);
      el("circle", { cx: lx, cy: 40, r: 4, fill: "var(--card)", stroke: "var(--ink)", "stroke-width": 2 }, g);
      levers.push({ g: g, x: lx });
    });
    txt(svg, 180, 16, "carry levers ↓ flip when a wheel passes 9 → 0", "label-soft");
    function paint() { groups.forEach(function (g, i) { g.setAttribute("transform", "rotate(" + rot[i] + " " + CX[i] + " " + CY + ")"); }); }
    function show() {
      $("#pascal-read").html("Shows <span class='big'>" + digits.join("") + "</span>");
    }
    paint();
    function turn(i) {
      return new Promise(function (res) {
        var from = rot[i], to = from - 36;
        tween(260, function (e) { rot[i] = from + (to - from) * e; paint(); }, function () {
          digits[i] = (digits[i] + 1) % 10;
          if (digits[i] === 0) rot[i] = 0; else rot[i] = -36 * digits[i];
          paint(); res();
        });
      });
    }
    function flip(li) {
      var L = levers[li];
      L.g.querySelector(".lever").style.stroke = "var(--accent)";
      return new Promise(function (res) {
        tween(220, function (e) { L.g.setAttribute("transform", "rotate(" + (-28 * e) + " " + L.x + " 40)"); }, function () {
          tween(160, function (e) { L.g.setAttribute("transform", "rotate(" + (-28 * (1 - e)) + " " + L.x + " 40)"); }, function () {
            L.g.querySelector(".lever").style.stroke = ""; res();
          });
        });
      });
    }
    async function addOne() {
      var i = 2;
      while (true) {
        await turn(i);
        if (digits[i] !== 0) break;
        if (i === 0) { $("#pascal-read").html("Overflow! The last carry fell off the end: <span class='big'>000</span>"); return false; }
        $("#pascal-read").html("Carry! " + ["", "tens", "units"][i] + " wheel passed 9 → lever flips → next wheel moves");
        await flip(i - 1);
        i--;
      }
      return true;
    }
    $("[data-padd]").on("click", async function () {
      if (busy) return; busy = true;
      var n = +$(this).data("padd"), start = +digits.join("");
      for (var k = 0; k < n; k++) { if (!(await addOne())) { busy = false; return; } await wait(80); }
      $("#pascal-read").html(start + " + " + n + " = " + (start + n) + " · dials show <span class='big'>" + digits.join("") + "</span>");
      busy = false;
    });
    $("[data-pset]").on("click", function () {
      if (busy) return;
      var v = +$(this).data("pset");
      digits = [Math.floor(v / 100), Math.floor(v / 10) % 10, v % 10];
      rot = digits.map(function (d) { return -36 * d; }); paint(); show();
    });
  })();

  /* =============== 2. Babbage =============== */
  (function () {
    var n, step, MAXN = 10, busy = false;
    function drawDots() {
      var $d = $("#dots").empty().css("grid-template-columns", "repeat(" + n + ", 14px)");
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        var isNew = (r === n - 1 || c === n - 1);
        $("<span class='dot'>").addClass(isNew ? "new" : "old").appendTo($d);
      }
      $("#dots-read").html(n + " × " + n + " = <span class='big'>" + (n * n) + "</span> tiles" + (n > 1 ? " · the orange L added <b>" + (2 * n - 1) + "</b>" : ""));
    }
    function reset() {
      n = 1; step = 3;
      $("#e-ans").text(1); $("#e-step").text(3); $("#e-grow").text(2);
      $("#tape").html("<span>1</span>");
      $("#engine-read").text("Turn the crank ↓");
      $("#crank").prop("disabled", false);
      drawDots();
    }
    $("#crank").on("click", async function () {
      if (busy) return; busy = true;
      $(".wheelbox").removeClass("pulse");
      $("#e-ans, #e-step").addClass("pulse");
      var ans = n * n;
      $("#engine-read").html(ans + " + " + step + " = <b>" + (ans + step) + "</b>");
      await wait(600);
      n++; $("#e-ans").text(n * n); drawDots();
      $("#tape span").removeClass("fresh"); $("<span class='fresh'>").text(n * n).appendTo("#tape");
      await wait(500);
      $(".wheelbox").removeClass("pulse"); $("#e-step, #e-grow").addClass("pulse");
      $("#engine-read").html("next L: " + step + " + 2 = <b>" + (step + 2) + "</b>");
      await wait(600);
      step += 2; $("#e-step").text(step);
      await wait(300);
      $(".wheelbox").removeClass("pulse");
      if (n >= MAXN) { $("#crank").prop("disabled", true); $("#engine-read").text("Babbage's engine would keep going forever. Reset to replay."); }
      busy = false;
    });
    $("#crank-reset").on("click", function () { if (!busy) reset(); });
    reset();
  })();

  /* =============== 3a. Relay =============== */
  (function () {
    var svg = document.getElementById("relay-svg"), on = false;
    battery(svg, 14, 120, 24, 44);
    var c1 = el("path", { d: "M26 120 V100 H60", "class": "wire" }, svg);
    var c2 = el("path", { d: "M90 100 H100 V145", "class": "wire" }, svg);
    var c3 = el("path", { d: "M170 145 H180 V186 H26 V164", "class": "wire" }, svg);
    term(svg, 60, 100); term(svg, 90, 100);
    var cap = el("line", { x1: 55, y1: 88, x2: 95, y2: 88, "class": "lever" }, svg);
    el("line", { x1: 75, y1: 88, x2: 75, y2: 76, stroke: "var(--ink)", "stroke-width": 4 }, svg);
    txt(svg, 75, 68, "button", "label-soft");
    el("rect", { x: 100, y: 132, width: 70, height: 26, rx: 6, "class": "s-bg", stroke: "var(--ink-soft)", "stroke-width": 2 }, svg);
    el("path", { d: "M106 145 q5 -10 10 0 q5 10 10 0 q5 -10 10 0 q5 10 10 0 q5 -10 10 0 q5 10 10 0", fill: "none", stroke: "var(--accent)", "stroke-width": 2 }, svg);
    txt(svg, 135, 176, "electromagnet", "label-soft");
    // output circuit
    var o1 = el("path", { d: "M120 118 V40 H320 V71", "class": "wire" }, svg);
    var o2 = el("path", { d: "M320 99 V140", "class": "wire" }, svg);
    var o3 = el("path", { d: "M320 176 V196 H238 V131", "class": "wire" }, svg);
    battery(svg, 308, 140, 24, 36);
    var b = bulb(svg, 320, 85, 14);
    term(svg, 238, 131);
    el("rect", { x: 114, y: 112, width: 12, height: 14, rx: 2, fill: "var(--ink-soft)" }, svg);
    var arm = el("line", { x1: 120, y1: 118, x2: 240, y2: 118, "class": "lever" }, svg);
    txt(svg, 180, 108, "iron arm", "label-soft");
    txt(svg, 280, 30, "circuit 2", "label-soft");
    txt(svg, 50, 150, "circuit 1", "label-soft", "start");
    function set(v) {
      on = v;
      [c1, c2, c3].forEach(function (w) { w.classList.toggle("live", on); });
      cap.setAttribute("transform", on ? "translate(0 8)" : "");
      var from = on ? 0 : 6, to = on ? 6 : 0;
      tween(200, function (e) { arm.setAttribute("transform", "rotate(" + (from + (to - from) * e) + " 120 118)"); }, function () {
        [o1, o2, o3].forEach(function (w) { w.classList.toggle("live", on); });
        b.classList.toggle("on", on);
        arm.style.stroke = on ? "var(--accent)" : "";
      });
      $("#relay-btn").text(on ? "Release the button" : "Press the button");
    }
    $("#relay-btn").on("click", function () { set(!on); });
  })();

  /* helper for simple SPST switches */
  function spst(svg, x1, y, x2, name, onTap) {
    term(svg, x1, y); term(svg, x2, y);
    var lev = el("line", { x1: x1, y1: y, x2: x2, y2: y, "class": "lever knob" }, svg);
    var lab = txt(svg, (x1 + x2) / 2, y + 30, name + " = 0", "label");
    var hit = el("rect", { x: x1 - 12, y: y - 40, width: x2 - x1 + 24, height: 80, fill: "transparent", "class": "tap" }, svg);
    hit.addEventListener("click", onTap);
    return {
      set: function (v) {
        lev.setAttribute("transform", v ? "" : "rotate(-35 " + x1 + " " + y + ")");
        lab.textContent = name + " = " + (v ? 1 : 0);
      }
    };
  }

  /* =============== 3b. AND =============== */
  (function () {
    var svg = document.getElementById("and-svg"), A = 0, B = 0;
    battery(svg, 18, 55, 24, 40);
    var w = [
      el("path", { d: "M30 55 V30 H100", "class": "wire" }, svg),
      el("path", { d: "M150 30 H200", "class": "wire" }, svg),
      el("path", { d: "M250 30 H320 V61", "class": "wire" }, svg),
      el("path", { d: "M320 89 V125 H30 V95", "class": "wire" }, svg)
    ];
    var b = bulb(svg, 320, 75, 14);
    var sa = spst(svg, 100, 30, 150, "A", function () { A ^= 1; paint(); });
    var sb = spst(svg, 200, 30, 250, "B", function () { B ^= 1; paint(); });
    txt(svg, 175, 112, "tap a switch", "label-soft");
    function paint() {
      sa.set(A); sb.set(B);
      var lit = A && B;
      w.forEach(function (x) { x.classList.toggle("live", !!lit); });
      b.classList.toggle("on", !!lit);
      $("#and-read").html(A + " AND " + B + " = <span class='big'>" + (lit ? 1 : 0) + "</span>");
    }
    paint();
  })();

  /* =============== 3c. XOR staircase =============== */
  (function () {
    var svg = document.getElementById("xor-svg"), A = 0, B = 0;
    battery(svg, 18, 100, 24, 40);
    var w1 = el("path", { d: "M30 100 V85 H100", "class": "wire" }, svg);
    var t1 = el("path", { d: "M140 60 C180 60 180 110 220 110", "class": "wire" }, svg);
    var t2 = el("path", { d: "M140 110 C180 110 180 60 220 60", "class": "wire" }, svg);
    var w2 = el("path", { d: "M260 85 H316", "class": "wire" }, svg);
    var w3 = el("path", { d: "M330 99 V152 H30 V140", "class": "wire" }, svg);
    var b = bulb(svg, 330, 85, 14);
    [[100, 85], [140, 60], [140, 110], [260, 85], [220, 60], [220, 110]].forEach(function (p) { term(svg, p[0], p[1]); });
    var la = el("line", { x1: 100, y1: 85, x2: 140, y2: 110, "class": "lever" }, svg);
    var lb = el("line", { x1: 260, y1: 85, x2: 220, y2: 110, "class": "lever" }, svg);
    txt(svg, 150, 54, "1", "label-soft"); txt(svg, 150, 128, "0", "label-soft");
    txt(svg, 210, 54, "1", "label-soft"); txt(svg, 210, 128, "0", "label-soft");
    txt(svg, 180, 20, "crossed wires ✕", "label-soft");
    var labA = txt(svg, 95, 140, "A = 0", "label"), labB = txt(svg, 265, 140, "B = 0", "label");
    var ha = el("rect", { x: 80, y: 40, width: 80, height: 90, fill: "transparent", "class": "tap" }, svg);
    var hb = el("rect", { x: 200, y: 40, width: 80, height: 90, fill: "transparent", "class": "tap" }, svg);
    ha.addEventListener("click", function () { A ^= 1; paint(); });
    hb.addEventListener("click", function () { B ^= 1; paint(); });
    function paint() {
      la.setAttribute("y2", A ? 60 : 110);
      lb.setAttribute("y2", B ? 60 : 110);
      labA.textContent = "A = " + A; labB.textContent = "B = " + B;
      var lit = A ^ B;
      [w1, w2, w3].forEach(function (x) { x.classList.toggle("live", !!lit); });
      t1.classList.toggle("live", !!(lit && A)); t2.classList.toggle("live", !!(lit && !A));
      b.classList.toggle("on", !!lit);
      $("#xor-read").html(A + " XOR " + B + " = <span class='big'>" + lit + "</span>" + (lit ? " · switches disagree" : " · switches agree"));
    }
    paint();
  })();

  /* =============== 3d. Half adder =============== */
  (function () {
    var svg = document.getElementById("ha-svg"), A = 0, B = 0;
    var bc = bulb(svg, 120, 45, 20), bs = bulb(svg, 240, 45, 20);
    var dc = txt(svg, 120, 104, "0", "digit"), ds = txt(svg, 240, 104, "0", "digit");
    txt(svg, 120, 82, "carry · AND", "label-soft"); txt(svg, 240, 82, "answer · XOR", "label-soft");
    function paint() {
      $("#ha-a").text("A = " + A); $("#ha-b").text("B = " + B);
      var c = A & B, s = A ^ B;
      bc.classList.toggle("on", !!c); bs.classList.toggle("on", !!s);
      dc.textContent = c; ds.textContent = s;
      $("#ha-read").html(A + " + " + B + " = " + (A + B) + " → bulbs read <span class='big'>" + c + s + "</span>" + (c ? " (binary for 2)" : ""));
    }
    $("#ha-a").on("click", function () { A ^= 1; paint(); });
    $("#ha-b").on("click", function () { B ^= 1; paint(); });
    paint();
  })();

  /* =============== 4. Ripple vs lookahead =============== */
  (function () {
    var A = [0, 0, 1, 0], B = [0, 0, 1, 1], busy = false; // index 0 = 8s … 3 = 1s
    var $row = $("#fa-row"), $out = $("#fa-out");
    [8, 4, 2, 1].forEach(function (w, i) {
      $("<div class='fa'>").append(
        $("<div class='weight'>").text(w + "s"),
        $("<div class='in'>").append(
          $("<button class='bitbtn' type='button'>").attr({ "data-r": "a", "data-i": i }),
          $("<button class='bitbtn' type='button'>").attr({ "data-r": "b", "data-i": i })
        ),
        $("<div class='box'>").attr("data-i", i).text("+")
      ).appendTo($row);
      $("<div class='fa'>").append($("<div class='out'>").attr("data-i", i).text("·")).appendTo($out);
    });
    function val(x) { return x[0] * 8 + x[1] * 4 + x[2] * 2 + x[3]; }
    function paintIn() {
      $(".bitbtn").each(function () {
        var arr = $(this).data("r") === "a" ? A : B, i = $(this).data("i");
        $(this).toggleClass("on", !!arr[i]).text(arr[i]);
      });
      $("#fa-read").html("A = " + val(A) + " (left square of each pair) · B = " + val(B) + " (right square). Tap to change.");
    }
    function clearOut() { $(".fa .box").removeClass("busy done").text("+"); $(".fa .out").removeClass("on").text("·"); $("#carry-dot").css("opacity", 0); $("#la-bar").removeClass("show"); }
    function colX(i) { var w = $("#carry-lane").width(); return (i + 0.5) * w / 4 - 10; }
    $row.on("click", ".bitbtn", function () {
      if (busy) return;
      var arr = $(this).data("r") === "a" ? A : B, i = $(this).data("i");
      arr[i] ^= 1; clearOut(); paintIn();
    });
    $("[data-fa]").on("click", function () {
      if (busy) return;
      var p = String($(this).data("fa")).split(",").map(Number);
      A = [8, 4, 2, 1].map(function (w) { return (p[0] & w) ? 1 : 0; });
      B = [8, 4, 2, 1].map(function (w) { return (p[1] & w) ? 1 : 0; });
      clearOut(); paintIn();
    });
    function lock(v) { busy = v; $("#go-ripple, #go-look").prop("disabled", v); }
    function finish(carry) {
      var sum = val(A) + val(B);
      $("#fa-read").html(val(A) + " + " + val(B) + " = <span class='big'>" + sum + "</span>" + (carry ? " (the final carry spilled into the 16s)" : ""));
    }
    $("#go-ripple").on("click", async function () {
      if (busy) return; lock(true); clearOut();
      var carry = 0, steps = 0;
      for (var i = 3; i >= 0; i--) {
        var $b = $(".fa .box[data-i='" + i + "']").addClass("busy").text("waiting…");
        if (i < 3) await wait(150);
        $b.text("adding");
        await wait(520);
        var s = A[i] ^ B[i] ^ carry, c = (A[i] & B[i]) | (carry & (A[i] ^ B[i]));
        steps++; $("#t-ripple").text(steps);
        $b.removeClass("busy").addClass("done").text(c ? "carry 1" : "done");
        $(".fa .out[data-i='" + i + "']").toggleClass("on", !!s).text(s);
        var $dot = $("#carry-dot");
        if (c) {
          $dot.css({ transition: "none", left: colX(i), opacity: 1 });
          await wait(30);
          $dot.css({ transition: "left .45s ease", left: i > 0 ? colX(i - 1) : -10 });
          await wait(480);
          if (i === 0) $dot.css("opacity", 0);
        } else { $dot.css("opacity", 0); }
        carry = c;
      }
      finish(carry); lock(false);
    });
    $("#go-look").on("click", async function () {
      if (busy) return; lock(true); clearOut();
      $("#la-bar").addClass("show");
      $(".fa .box").addClass("busy").text("…");
      await wait(650);
      // generate/propagate → all carries known at once
      var carries = [0, 0, 0, 0, 0], c = 0;
      for (var i = 3; i >= 0; i--) { carries[i] = c; c = (A[i] & B[i]) | (c & (A[i] ^ B[i])); }
      $("#t-look").text(1);
      await wait(250);
      for (var j = 0; j < 4; j++) {
        var s = A[j] ^ B[j] ^ carries[j];
        $(".fa .box[data-i='" + j + "']").removeClass("busy").addClass("done").text(carries[j] ? "got carry" : "done");
        $(".fa .out[data-i='" + j + "']").toggleClass("on", !!s).text(s);
      }
      $("#t-look").text(2);
      finish(c); lock(false);
    });
    paintIn();
  })();

  /* =============== 5. Shrinking switch =============== */
  (function () {
    var F = [
      { n: "Relay · 1937–1941", s: 3e-2, d: "≈ 3 cm, thumb-sized. Clicks open and shut. Zuse's Z3 used ~2,600; one addition took 0.8 s.",
        svg: '<svg width="150" height="120" viewBox="0 0 150 120"><rect x="20" y="60" width="110" height="40" rx="8" fill="var(--bg)" stroke="var(--ink-soft)" stroke-width="3"/><path d="M35 80 q6-12 12 0 q6 12 12 0 q6-12 12 0 q6 12 12 0 q6-12 12 0 q6 12 12 0" fill="none" stroke="var(--accent)" stroke-width="3"/><line x1="25" y1="45" x2="125" y2="38" stroke="var(--ink)" stroke-width="6" stroke-linecap="round"/><circle cx="25" cy="45" r="6" fill="var(--ink)"/></svg>' },
      { n: "Vacuum tube · 1945", s: 6e-2, d: "≈ 6 cm, like a small bulb, and as hot. No moving parts: about a thousand times faster. ENIAC used ~18,000.",
        svg: '<svg width="110" height="170" viewBox="0 0 110 170"><path d="M25 120 V55 a30 30 0 0 1 60 0 V120 Z" fill="var(--bg)" stroke="var(--ink-soft)" stroke-width="3"/><path d="M45 110 V70 h20 V110" fill="none" stroke="#f08c00" stroke-width="3"/><rect x="20" y="118" width="70" height="20" rx="4" fill="var(--ink-soft)"/><line x1="35" y1="138" x2="35" y2="160" stroke="var(--ink-soft)" stroke-width="4"/><line x1="55" y1="138" x2="55" y2="160" stroke="var(--ink-soft)" stroke-width="4"/><line x1="75" y1="138" x2="75" y2="160" stroke="var(--ink-soft)" stroke-width="4"/></svg>' },
      { n: "Transistor · 1947 → 1950s", s: 5e-3, d: "≈ 5 mm by the 1950s, pea-sized. A switch made of solid crystal: nothing moves, nothing burns out.",
        svg: '<svg width="80" height="120" viewBox="0 0 80 120"><path d="M15 50 V20 a25 20 0 0 1 50 0 V50 Z" fill="var(--ink)"/><line x1="25" y1="50" x2="20" y2="110" stroke="var(--ink-soft)" stroke-width="4"/><line x1="40" y1="50" x2="40" y2="110" stroke="var(--ink-soft)" stroke-width="4"/><line x1="55" y1="50" x2="60" y2="110" stroke="var(--ink-soft)" stroke-width="4"/></svg>' },
      { n: "Intel 4004 · 1971", s: 1e-5, d: "Each transistor ≈ 10 µm, about ⅛ of a hair's width. 2,300 of them on one tiny chip.",
        svg: '<svg width="150" height="150" viewBox="0 0 150 150"><rect x="30" y="30" width="90" height="90" rx="6" fill="var(--ink)"/>' + (function () { var s = ""; for (var i = 0; i < 6; i++) { s += '<rect x="' + (38 + i * 14) + '" y="18" width="6" height="12" fill="var(--ink-soft)"/><rect x="' + (38 + i * 14) + '" y="120" width="6" height="12" fill="var(--ink-soft)"/>'; } for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) s += '<rect x="' + (42 + c * 14) + '" y="' + (42 + r * 14) + '" width="9" height="9" fill="var(--accent)" opacity=".8"/>'; return s; })() + '</svg>' },
      { n: "Today's transistor · 2020s", s: 5e-8, d: "Tens of nanometres. Over a thousand side by side would fit across one human hair. A phone chip holds billions.",
        svg: '<svg width="200" height="150" viewBox="0 0 200 150"><rect x="10" y="40" width="180" height="70" rx="35" fill="var(--bg)" stroke="var(--ink-soft)" stroke-width="2" stroke-dasharray="5 5"/>' + (function () { var s = ""; for (var r = 0; r < 6; r++) for (var c = 0; c < 26; c++) s += '<circle cx="' + (24 + c * 6) + '" cy="' + (60 + r * 6) + '" r="2" fill="var(--accent)"/>'; return s; })() + '<text x="100" y="135" text-anchor="middle" class="label-soft">a slice of one hair, packed with transistors</text></svg>' }
    ];
    var i = 0, LO = Math.log10(0.1), HI = Math.log10(1e-8);
    function pos(m) { return (Math.log10(m) - LO) / (HI - LO) * 100; }
    var $ends = $(".scale-ends").css({ position: "relative", height: "18px" }).empty();
    [["10 cm", 0.1], ["1 mm", 1e-3], ["10 µm", 1e-5], ["10 nm", 1e-8]].forEach(function (p, k) {
      $("<span>").text(p[0]).css({ position: "absolute", left: pos(p[1]) + "%", transform: k === 0 ? "none" : k === 3 ? "translateX(-100%)" : "translateX(-50%)" }).appendTo($ends);
    });
    function show() {
      var f = F[i];
      $("#size-stage").html("<div class='obj'>" + f.svg + "</div>");
      $("#size-pin").css("left", pos(f.s) + "%");
      $("#size-name").text(f.n); $("#size-desc").text(f.d);
      $("#size-prev").prop("disabled", i === 0); $("#size-next").prop("disabled", i === F.length - 1);
    }
    $("#size-prev").text("← Earlier").on("click", function () { if (i > 0) { i--; show(); } });
    $("#size-next").text("Later →").on("click", function () { if (i < F.length - 1) { i++; show(); } });
    show();
  })();

  /* =============== 6. Java pipeline =============== */
  (function () {
    var runs = 0, compiled = false, jit = false, busy = false, HOT = 5000;
    function light(st) { $(".stage-box").removeClass("lit"); if (st !== null) $(".stage-box[data-st='" + st + "']").addClass("lit"); }
    function paintHot() {
      $("#hot-count").text(runs.toLocaleString("en-US"));
      $("#hotbar").css("width", Math.min(100, runs / HOT * 100) + "%");
    }
    async function runOnce() {
      var path = [];
      if (!compiled) { path = [0, 1]; compiled = true; }
      path = path.concat(jit ? [4, 5] : [2, 3, 5]);
      for (var k = 0; k < path.length; k++) { light(path[k]); await wait(380); }
      light(null);
      runs++; paintHot(); checkHot();
      if (!jit) $("#pipe-read").html("Run #" + runs + ": the interpreter translated the bytecode again 🗣️");
    }
    function checkHot() {
      if (!jit && runs >= HOT) {
        jit = true;
        $("#lane-jit").removeClass("off"); $("#lane-int").addClass("off");
        $("#pipe-read").html("🔥 <b>Hot!</b> The JIT compiled this code into native machine code. From now on it goes straight to the adder.");
      } else if (jit) {
        $("#pipe-read").html("Run #" + runs.toLocaleString("en-US") + ": native code, no translation needed ⚡");
      }
    }
    $("#run-once").on("click", async function () { if (busy) return; busy = true; await runOnce(); busy = false; });
    $("#run-many").on("click", async function () {
      if (busy) return; busy = true;
      if (!compiled) { compiled = true; light(0); await wait(250); light(1); await wait(250); }
      var target = runs + 1000;
      $(jit ? "#lane-jit" : "#lane-int").addClass("lit");
      while (runs < target) { runs += 50; paintHot(); if (!jit && runs >= HOT) { light(null); checkHot(); $("#lane-jit").addClass("lit"); } await wait(25); }
      light(null); checkHot();
      if (!jit) $("#pipe-read").html("Interpreted " + runs.toLocaleString("en-US") + " times. Getting warm… keep going.");
      busy = false;
    });
    $("#run-reset").on("click", function () {
      if (busy) return;
      runs = 0; compiled = false; jit = false; light(null); paintHot();
      $("#lane-jit").addClass("off"); $("#lane-int").removeClass("off");
      $("#pipe-read").text("Tap \"Run once\".");
    });
    paintHot();
  })();

  /* =============== 7. JVM plates =============== */
  (function () {
    var OPS = [
      { op: "iconst_2", say: "Put a plate with <b>2</b> on the stack." },
      { op: "istore_1", say: "Take the top plate and put it in drawer <b>a</b>." },
      { op: "iconst_3", say: "Put a plate with <b>3</b> on the stack." },
      { op: "istore_2", say: "Take it off and file it in drawer <b>b</b>. The stack is empty again." },
      { op: "iload_1", say: "Copy what's in drawer <b>a</b> onto the stack." },
      { op: "iload_2", say: "Copy drawer <b>b</b> on top. Now 3 sits on 2." },
      { op: "iadd", say: "<b>iadd</b>: grab the top two plates, add them, put back one plate. No need to say <em>which</em> numbers; it's always the top two." },
      { op: "istore_3", say: "File the result in drawer <b>c</b>. Done: <code class='pill'>c = 5</code>." }
    ];
    var pc = 0, stack = [], locals = ["…", "", "", ""], busy = false, playing = false;
    var $k = $("#kitchen"), $tray = $("#tray");
    OPS.forEach(function (o) { $("<span>").text(o.op).appendTo("#oplist"); });
    function rel(node) {
      var a = node.getBoundingClientRect(), b = $k[0].getBoundingClientRect();
      return { left: a.left - b.left, top: a.top - b.top, width: a.width, height: a.height };
    }
    function plate(v) { return $("<div class='plate'>").text(v); }
    function fly(fromRect, toRect, v) {
      return new Promise(function (res) {
        var $f = plate(v).addClass("flyer").css({ left: fromRect.left, top: fromRect.top, width: fromRect.width, height: 30 }).appendTo($k);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            $f.css({ left: toRect.left + (toRect.width - fromRect.width) / 2, top: toRect.top + (toRect.height - 30) / 2 });
          });
        });
        setTimeout(function () { $f.remove(); res(); }, 500);
      });
    }
    function drawer(i) { return $(".drawer[data-slot='" + i + "']"); }
    function paintOps() {
      $("#oplist span").each(function (i) { $(this).toggleClass("done", i < pc).toggleClass("now", i === pc - 1); });
    }
    async function step() {
      if (pc >= OPS.length || busy) return;
      busy = true;
      var o = OPS[pc].op;
      $(".drawer").removeClass("hit");
      pc++; paintOps();
      $("#say").html(OPS[pc - 1].say);
      if (o.indexOf("iconst_") === 0) {
        var v = +o.split("_")[1]; stack.push(v);
        plate(v).css({ animation: "plateIn .3s ease" }).appendTo($tray);
        await wait(320);
      } else if (o.indexOf("istore_") === 0) {
        var slot = +o.split("_")[1], $top = $tray.children().last(), v2 = stack.pop();
        var from = rel($top[0]); $top.remove();
        await fly(from, rel(drawer(slot)[0]), v2);
        locals[slot] = v2; drawer(slot).addClass("hit").find("b").text(v2);
      } else if (o.indexOf("iload_") === 0) {
        var s2 = +o.split("_")[1], v3 = locals[s2];
        var $p = plate(v3).css("visibility", "hidden").appendTo($tray);
        drawer(s2).addClass("hit");
        var dr = rel(drawer(s2)[0]);
        await fly({ left: dr.left + 6, top: dr.top + 15, width: dr.width - 12, height: 30 }, rel($p[0]), v3);
        $p.css("visibility", "visible"); stack.push(v3);
      } else if (o === "iadd") {
        var $two = $tray.children().slice(-2);
        $two.css({ transition: "transform .3s, opacity .3s", transform: "scale(.6)", opacity: .3 });
        await wait(320);
        $two.remove();
        var y = stack.pop(), x = stack.pop(); stack.push(x + y);
        plate(x + y).css({ animation: "plateIn .35s ease", background: "var(--accent)" }).appendTo($tray);
        $("#say").html(OPS[pc - 1].say + "<br><b>" + x + " + " + y + " = " + (x + y) + "</b>");
        await wait(350);
      }
      if (pc >= OPS.length) $("#k-step").prop("disabled", true).text("Done ✓");
      busy = false;
    }
    function reset() {
      pc = 0; stack = []; locals = ["…", "", "", ""]; playing = false;
      $tray.empty(); $(".drawer").removeClass("hit");
      $(".drawer").each(function (i) { $(this).find("b").text(locals[i]); });
      $("#k-step").prop("disabled", false).text("Step ▶");
      $("#say").html("Tap Step to start cooking <code class='pill'>int a = 2, b = 3; int c = a + b;</code>");
      paintOps();
    }
    $("#k-step").on("click", step);
    $("#k-play").on("click", async function () {
      if (playing) return; playing = true;
      if (pc >= OPS.length) reset(), playing = true;
      while (playing && pc < OPS.length) { await step(); await wait(900); }
      playing = false;
    });
    $("#k-reset").on("click", function () { if (!busy) reset(); });
    reset();
  })();

  /* =============== 8. LLM =============== */
  (function () {
    var svg = document.getElementById("net"), nodes = [], LX = [40, 133, 226, 319], busy = false;
    LX.forEach(function (x, L) {
      nodes.push([]);
      for (var r = 0; r < 5; r++) {
        var y = 20 + r * 25;
        if (L > 0) nodes[L - 1].forEach(function (p) { el("line", { x1: p.x, y1: p.y, x2: x, y2: y, "class": "edge" }, svg); });
        nodes[L].push({ x: x, y: y });
      }
    });
    nodes.forEach(function (layer) { layer.forEach(function (p) { p.c = el("circle", { cx: p.x, cy: p.y, r: 8, "class": "node" }, svg); }); });
    var TOK = ["What", "·is", "·2", "·+", "·3", "?"];
    var PROBS = [["5", 97], ["The", 1.5], ["2", 0.8], ["6", 0.7]];
    var $pr = $("#probrows");
    PROBS.forEach(function (p) {
      $("<div class='probrow'>").append($("<span class='t'>").text(p[0]), $("<div>").append($("<div class='bar'>")), $("<span class='v'>").text(p[1] + "%")).appendTo($pr);
    });
    function resetLLM() {
      $("#toks").empty(); $("#mac").text("0"); $("#answer").removeClass("show");
      $("#probrows .bar").css("width", 0);
      nodes.forEach(function (l) { l.forEach(function (p) { p.c.classList.remove("fire"); }); });
    }
    $("#ask").on("click", async function () {
      if (busy) return; busy = true; resetLLM();
      for (var i = 0; i < TOK.length; i++) { var $t = $("<span class='tok'>").text(TOK[i]).appendTo("#toks"); await wait(30); $t.addClass("in"); await wait(170); }
      var TOTAL = 140e9, t0 = performance.now(), DUR = 2600;
      var counting = true;
      (function count() {
        var p = Math.min(1, (performance.now() - t0) / DUR);
        $("#mac").text(Math.round(TOTAL * p).toLocaleString("en-US") + (p === 1 ? "  (~140 billion)" : ""));
        if (p < 1 && counting) requestAnimationFrame(count);
      })();
      for (var w = 0; w < 3; w++) {
        for (var L = 0; L < 4; L++) {
          nodes[L].forEach(function (p) { p.c.classList.toggle("fire", Math.random() > 0.35); });
          await wait(200);
          nodes[L].forEach(function (p) { p.c.classList.remove("fire"); });
        }
      }
      await wait(200);
      $("#probrows .probrow").each(function (k) { $(this).find(".bar").css("width", Math.max(2, PROBS[k][1]) + "%"); });
      await wait(900);
      $("#answer").addClass("show");
      busy = false;
    });
    $("#ask-hard").on("click", async function () {
      if (busy) return; busy = true;
      $("#toolchain div").removeClass("on");
      var steps = ["🤖 \"Prediction might slip a digit here. I'll calculate.\"", "📝 writes: <code class='pill'>48317 * 9206</code>", "💻 the CPU runs it", ""];
      for (var k = 0; k < 4; k++) {
        $("#toolchain div[data-k='" + k + "']").addClass("on");
        if (k < 3) $("#tool-read").html(steps[k]);
        await wait(800);
      }
      $("#tool-read").html("48,317 × 9,206 = <span class='big'>" + (48317 * 9206).toLocaleString("en-US") + "</span><br><small style='color:var(--ink-soft)'>exact, carries and all</small>");
      busy = false;
    });
  })();
});
