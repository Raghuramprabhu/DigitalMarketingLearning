/* Chapter 01 widgets: Pascaline, difference engine, binary adder, code ladder, JVM stepper, speed ladder, LLM probs */
$(function () {

  /* ---------- Recall reveal ---------- */
  $("#recall-reveal").on("click", function () { $("#recall-answer").slideToggle(200); });

  /* ---------- Pascaline ---------- */
  var digits = [2, 0, 0]; // units, tens, hundreds
  var busy = false;
  function paintWheels() {
    $("#pascaline .wheel").each(function () {
      $(this).find(".d").text(digits[$(this).data("i")]);
    });
  }
  function wheel(i) { return $("#pascaline .wheel[data-i='" + i + "']"); }
  function tick(steps, done) {
    // advance units wheel one tooth at a time; carries ripple with a visible delay
    if (steps === 0) { done(); return; }
    bump(0, function () { setTimeout(function () { tick(steps - 1, done); }, 140); });
  }
  function bump(i, done) {
    if (i > 2) { $("#pascal-log").text("Overflow! The last carry fell off the end. Pascal's machine would wrap to 000."); done(); return; }
    digits[i] = (digits[i] + 1) % 10;
    paintWheels();
    if (digits[i] === 0) {
      var $w = wheel(i).addClass("carry");
      setTimeout(function () {
        $w.removeClass("carry");
        $("#pascal-log").text("Carry! The " + ["units", "tens", "hundreds"][i] + " dial passed 9 → its lever drops and kicks the next dial.");
        bump(i + 1, done);
      }, 380);
    } else { done(); }
  }
  $("#pascaline").siblings(".btn-row").on("click", "button", function () {
    if (busy) return;
    var add = $(this).data("add"), set = $(this).data("set");
    if (set !== undefined) {
      digits = [set % 10, Math.floor(set / 10) % 10, Math.floor(set / 100) % 10];
      paintWheels();
      $("#pascal-log").text("Dials set to " + digits[2] + digits[1] + digits[0] + ".");
      return;
    }
    busy = true;
    var before = digits[2] * 100 + digits[1] * 10 + digits[0];
    $("#pascal-log").text("Turning the units dial " + add + " teeth…");
    tick(add, function () {
      busy = false;
      var after = digits[2] * 100 + digits[1] * 10 + digits[0];
      if (before + add < 1000) $("#pascal-log").text(before + " + " + add + " = " + after + (before === 2 && add === 3 ? ". Your first mechanical sum." : ""));
    });
  });
  paintWheels();

  /* ---------- Difference engine (squares) ---------- */
  var de;
  function deReset() {
    de = { n: 1, val: 1, d1: 3, d2: 2 };
    $("#diff tbody").empty();
    deRow(true);
    $("#diff-log").text("Rule: answer + 1st diff → next answer. 1st diff + 2 → next 1st diff.");
  }
  function deRow(first) {
    $("#diff tbody tr").removeClass("fresh");
    $("<tr>").toggleClass("fresh", !first).append(
      $("<td>").text(de.n), $("<td>").text(de.val), $("<td>").text(de.d1), $("<td>").text(de.d2)
    ).appendTo("#diff tbody");
  }
  $("#diff-next").on("click", function () {
    var oldVal = de.val, oldD1 = de.d1;
    de.n += 1; de.val = oldVal + oldD1; de.d1 = oldD1 + de.d2;
    deRow(false);
    $("#diff-log").html(oldVal + " + " + oldD1 + " = <strong>" + de.val + "</strong> &nbsp;·&nbsp; " + oldD1 + " + 2 = " + de.d1 + " &nbsp;(no multiplication anywhere)");
    if ($("#diff tbody tr").length > 9) $("#diff tbody tr").first().remove();
  });
  $("#diff-reset").on("click", deReset);
  deReset();

  /* ---------- Binary adder ---------- */
  var A = [0, 0, 1, 0], B = [0, 0, 1, 1]; // MSB first: 8 4 2 1
  function buildBits() {
    $(".bits[data-row='a'], .bits[data-row='b']").each(function () {
      var row = $(this).data("row");
      $("<span>").appendTo(this); // empty 16s column
      for (var i = 0; i < 4; i++) $("<button class='bit' type='button'>").attr({ "data-row": row, "data-i": i }).appendTo(this);
      $("<span class='dec'>").appendTo(this);
    });
    var $s = $(".bits[data-row='s']");
    $("<button class='bit out' type='button' disabled>").attr("data-i", "c").appendTo($s);
    for (var i = 0; i < 4; i++) $("<button class='bit out' type='button' disabled>").attr("data-i", i).appendTo($s);
    $("<span class='dec'>").appendTo($s);
  }
  function val(arr) { return arr[0] * 8 + arr[1] * 4 + arr[2] * 2 + arr[3]; }
  function paintBits() {
    $(".bit[data-row='a']").each(function () { var i = $(this).data("i"); $(this).toggleClass("on", !!A[i]).text(A[i]); });
    $(".bit[data-row='b']").each(function () { var i = $(this).data("i"); $(this).toggleClass("on", !!B[i]).text(B[i]); });
    // ripple-carry add, LSB (index 3) to MSB (index 0)
    var carry = 0, S = [0, 0, 0, 0], carries = ["", "", "", ""], ripples = 0;
    for (var i = 3; i >= 0; i--) {
      var s = A[i] ^ B[i] ^ carry;
      var c = (A[i] & B[i]) | (carry & (A[i] ^ B[i]));
      S[i] = s;
      if (c && i > 0) { carries[i - 1] = "1↩"; ripples++; }
      if (c && i === 0) ripples++;
      carry = c;
    }
    var $s = $(".bits[data-row='s']");
    $s.find(".bit[data-i='c']").toggleClass("on", !!carry).text(carry);
    for (var j = 0; j < 4; j++) $s.find(".bit[data-i='" + j + "']").toggleClass("on", !!S[j]).text(S[j]);
    $(".bits[data-row='a'] .dec").text("= " + val(A));
    $(".bits[data-row='b'] .dec").text("= " + val(B));
    $s.find(".dec").text("= " + (val(S) + carry * 16));
    var $cr = $("#carry-row span");
    // columns: [label, 16s, 8, 4, 2, 1, dec] → carries sit above the column they land in
    $cr.eq(1).text(carry ? "1↩" : "");
    for (var k = 0; k < 4; k++) $cr.eq(k + 2).text(carries[k]);
    $("#bit-log").text(val(A) + " + " + val(B) + " = " + (val(A) + val(B)) +
      (ripples ? " · " + ripples + " carr" + (ripples > 1 ? "ies" : "y") + " rippled left" : " · no carries needed"));
  }
  buildBits();
  $(document).on("click", ".bit:not(.out)", function () {
    var arr = $(this).data("row") === "a" ? A : B, i = $(this).data("i");
    arr[i] = arr[i] ? 0 : 1; paintBits();
  });
  $("#bits-23").on("click", function () { A = [0, 0, 1, 0]; B = [0, 0, 1, 1]; paintBits(); });
  $("#bits-77").on("click", function () { A = [0, 1, 1, 1]; B = [0, 1, 1, 1]; paintBits(); });
  paintBits();

  /* ---------- Code ladder tabs ---------- */
  $("#ladder-tabs").on("click", ".tab", function () {
    var t = $(this).data("t");
    $("#ladder-tabs .tab").removeClass("on"); $(this).addClass("on");
    $(".tab-pane").attr("hidden", true).filter("[data-t='" + t + "']").removeAttr("hidden");
  });

  /* ---------- JVM stepper ---------- */
  var PROGRAM = [
    { op: "iconst_2", run: function (m) { m.stack.push(2); }, say: "<code>iconst_2</code>: push the constant 2 onto the stack. (Small constants -1 to 5 get their own one-byte instructions.)" },
    { op: "istore_1", run: function (m) { m.locals[1] = m.stack.pop(); m.hit = 1; }, say: "<code>istore_1</code>: pop the top int and store it in local slot 1. That's <code>a</code>. Slot 0 holds <code>args</code>, because this code lives in <code>main</code>." },
    { op: "iconst_3", run: function (m) { m.stack.push(3); }, say: "<code>iconst_3</code>: push 3." },
    { op: "istore_2", run: function (m) { m.locals[2] = m.stack.pop(); m.hit = 2; }, say: "<code>istore_2</code>: pop it into slot 2, <code>b</code>. Both lines of declarations done; the stack is empty again." },
    { op: "iload_1", run: function (m) { m.stack.push(m.locals[1]); m.hit = 1; }, say: "<code>iload_1</code>: copy <code>a</code> from slot 1 onto the stack." },
    { op: "iload_2", run: function (m) { m.stack.push(m.locals[2]); m.hit = 2; }, say: "<code>iload_2</code>: copy <code>b</code> onto the stack. Now 3 is on top of 2." },
    { op: "iadd", run: function (m) { var y = m.stack.pop(), x = m.stack.pop(); m.stack.push(x + y); }, say: "<code>iadd</code>: pop two ints, add, push the result. No addresses, no registers. This is the moment: somewhere below, a real CPU's XOR and AND gates fire." },
    { op: "istore_3", run: function (m) { m.locals[3] = m.stack.pop(); m.hit = 3; }, say: "<code>istore_3</code>: pop 5 into slot 3, <code>c</code>. Done. Eight tiny instructions; the stack never got deeper than 2." }
  ];
  var m, pc;
  function jvmReset() {
    m = { stack: [], locals: ["…", "–", "–", "–"], hit: -1 }; pc = 0;
    jvmPaint();
    $("#op-explain").html("<strong>Ready.</strong> Tap Step to run the first instruction.");
    $("#jvm-step").prop("disabled", false).text("Step ▶");
  }
  function jvmPaint() {
    $("#ops li").each(function (i) { $(this).toggleClass("done", i < pc - 1).toggleClass("now", i === pc - 1); });
    var $st = $("#stack").empty();
    m.stack.forEach(function (v) { $("<div class='slot'>").text(v).appendTo($st); });
    $("#locals .local").each(function (i) { $(this).toggleClass("hit", i === m.hit).find("b").text(m.locals[i]); });
  }
  $("#jvm-step").on("click", function () {
    if (pc >= PROGRAM.length) return;
    m.hit = -1;
    PROGRAM[pc].run(m);
    $("#op-explain").html(PROGRAM[pc].say);
    pc++;
    jvmPaint();
    if (pc >= PROGRAM.length) $(this).prop("disabled", true).text("Done ✓");
  });
  $("#jvm-reset").on("click", jvmReset);
  jvmReset();

  /* ---------- Speed ladder (log scale, animate on view) ---------- */
  function paintLadder() {
    var lo = -1, hi = 14; // 10^-1 … 10^14
    $("#speed-ladder .rung").each(function () {
      var v = parseFloat($(this).data("v"));
      var pct = ((Math.log10(v) - lo) / (hi - lo)) * 100;
      $(this).find(".bar").css("width", Math.max(3, Math.min(100, pct)) + "%");
    });
  }
  /* ---------- LLM probability bars ---------- */
  function paintProbs() {
    $("#probs .prob").each(function () { $(this).find(".pb").css("width", Math.max(2, $(this).data("p")) + "%"); });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.id === "speed-ladder") paintLadder(); else paintProbs();
        io.unobserve(e.target);
      });
    }, { threshold: 0.3 });
    io.observe(document.getElementById("speed-ladder"));
    io.observe(document.getElementById("probs"));
  } else { paintLadder(); paintProbs(); }
});
