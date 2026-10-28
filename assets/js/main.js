/* Digital Marketing Field Notes — shared behaviour (jQuery) */

// Safe storage: private tabs or blocked storage must never break the page.
var store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

// Apply saved theme before paint where possible.
(function () {
  var saved = store.get("dml-theme");
  if (saved === "light" || saved === "dark") {
    document.documentElement.setAttribute("data-theme", saved);
  }
})();

$(function () {

  /* ---------- Theme toggle ---------- */
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paintToggle() {
    var dark = currentTheme() === "dark";
    $(".theme-toggle").html(dark ? "☀️ <span>Light</span>" : "🌙 <span>Dark</span>")
      .attr("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  paintToggle();
  $(".theme-toggle").on("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    store.set("dml-theme", next);
    paintToggle();
  });

  /* ---------- Reading progress ---------- */
  if ($(".progress-bar").length) {
    $(window).on("scroll resize", function () {
      var h = $(document).height() - $(window).height();
      var pct = h > 0 ? ($(window).scrollTop() / h) * 100 : 0;
      $(".progress-bar").css("width", pct + "%");
    });
  }

  /* ---------- Definition: tap a part to unpack it ---------- */
  $(".definition .part").on("click", function () {
    $(".definition .part").removeClass("active");
    $(this).addClass("active");
    var $box = $(".part-explain");
    $box.hide().html($(this).data("explain")).fadeIn(200);
  });

  /* ---------- Channel cards: tap to expand ---------- */
  $(".channel").on("click", function () {
    $(this).toggleClass("open");
    $(this).find(".hint").text($(this).hasClass("open") ? "tap to close" : "tap to open");
  });

  /* ---------- Funnel calculator ---------- */
  function fmt(n) { return isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"; }
  function calc() {
    var imp = parseFloat($("#c-imp").val()) || 0;
    var clk = parseFloat($("#c-clk").val()) || 0;
    var cnv = parseFloat($("#c-cnv").val()) || 0;
    var ctr = imp > 0 ? (clk / imp) * 100 : NaN;
    var cvr = clk > 0 ? (cnv / clk) * 100 : NaN;
    $("#o-ctr").text(isFinite(ctr) ? fmt(ctr) + "%" : "—");
    $("#o-cvr").text(isFinite(cvr) ? fmt(cvr) + "%" : "—");
    var max = Math.max(imp, 1);
    $("#b-imp").css("width", "100%").text(fmt(imp) + " saw it");
    $("#b-clk").css("width", Math.max((clk / max) * 100, 0) + "%").text(fmt(clk) + " tapped");
    $("#b-cnv").css("width", Math.max((cnv / max) * 100, 0) + "%").text(fmt(cnv) + " bought");
  }
  if ($("#c-imp").length) {
    $(".calc-grid input").on("input", calc);
    calc();
  }

  /* ---------- Quiz ---------- */
  var answered = 0, correct = 0, total = $(".quiz-q").length;
  $(".quiz-q").each(function () {
    var $q = $(this);
    $q.find(".opt").on("click", function () {
      var $o = $(this);
      $q.find(".opt").prop("disabled", true);
      if ($o.data("right")) { $o.addClass("right"); correct++; }
      else { $o.addClass("wrong"); $q.find(".opt[data-right]").addClass("right"); }
      $q.find(".why").slideDown(200);
      answered++;
      if (answered === total) {
        var msg = correct === total ? "Perfect. The definition is yours now." :
                  correct >= total - 1 ? "Strong. Re-read the one you missed tomorrow." :
                  "Good start. Scroll back to the definition, then retry.";
        $(".score").html(correct + " / " + total + " — " + msg).fadeIn(300);
        $("#quiz-retry").show();
        if (correct >= total - 1) store.set("dml-" + $("body").data("chapter") + "-done", "1");
      }
    });
  });
  $("#quiz-retry").on("click", function () {
    answered = 0; correct = 0;
    $(".opt").prop("disabled", false).removeClass("right wrong");
    $(".why").hide(); $(".score").hide(); $(this).hide();
    $("html, body").animate({ scrollTop: $("#quiz").offset().top - 70 }, 300);
  });

  /* ---------- Flashcards ---------- */
  var cards = window.FLASHCARDS || [], idx = 0;
  function showCard() {
    if (!cards.length) return;
    $(".flashcard").removeClass("flipped");
    setTimeout(function () {
      $(".flash-front .txt").text(cards[idx].q);
      $(".flash-back .txt").text(cards[idx].a);
      $("#flash-count").text((idx + 1) + " / " + cards.length);
    }, 150);
  }
  $(".flashcard").on("click", function () { $(this).toggleClass("flipped"); });
  $("#flash-prev").on("click", function () { idx = (idx - 1 + cards.length) % cards.length; showCard(); });
  $("#flash-next").on("click", function () { idx = (idx + 1) % cards.length; showCard(); });
  showCard();

  /* ---------- Home: mark finished chapters ---------- */
  $(".chapter[data-ch]").each(function () {
    if (store.get("dml-" + $(this).data("ch") + "-done") === "1") {
      $(this).find(".status").removeClass("live").addClass("done").text("✓ Done");
    }
  });
});
