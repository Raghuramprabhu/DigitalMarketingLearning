/* Calm Feed — renders feed/data/items.json as an endless, calm scroll. */
$(function () {
  var TOPICS = {
    all:       { label: "All" },
    ai:        { label: "AI & agents" },
    space:     { label: "Space & science" },
    chess:     { label: "Chess" },
    writing:   { label: "Writing & stories" },
    adhd:      { label: "ADHD" },
    mind:      { label: "Mind & performance" },
    craft:     { label: "Java & system design" },
    history:   { label: "History" },
    computing: { label: "History of computing" },
    wisdom:    { label: "Wisdom" },
    facts:     { label: "Daily facts" }
  };
  var KIND = { news: "News", fact: "Fact", idea: "Idea", poem: "Poem", story: "Story",
               quote: "Wisdom", tip: "Tip", puzzle: "Puzzle", recall: "Recall" };
  var CHUNK = 8;

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  var all = [], list = [], shown = 0;
  var topic = "all", savedOnly = false;
  var saved = store.get("calm-saved", {});
  var lastSeen = store.get("calm-last-edition", "");
  var $cards = $("#cards"), $end = $("#endNote"), $sentinel = $("#sentinel");

  // theme
  $("#themeToggle").on("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", cur);
    try { localStorage.setItem("calm-theme", cur); } catch (e) {}
  });

  // chips
  var $chips = $("#chips");
  $.each(TOPICS, function (key, t) {
    $("<button class='chip' type='button'>").addClass("t-" + key).toggleClass("on", key === "all")
      .attr("data-topic", key).text(t.label).appendTo($chips);
  });
  $chips.on("click", ".chip", function () {
    topic = $(this).data("topic");
    $chips.find(".chip").removeClass("on");
    $(this).addClass("on");
    rebuild();
  });

  $("#savedToggle").on("click", function () {
    savedOnly = !savedOnly;
    $(this).attr("aria-pressed", savedOnly).text(savedOnly ? "★" : "☆");
    rebuild();
  });

  function esc(s) { return $("<div>").text(s == null ? "" : s).html(); }

  function editionLabel(ed) {
    // ed like 2026-11-02-am
    var p = ed.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var day = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    return day + " · " + (p[3] === "pm" ? "evening" : p[3] === "am" ? "morning" : "extra") + " edition";
  }

  function card(it) {
    var $c = $("<article class='card'>").addClass("t-" + it.topic).addClass(it.kind || "fact");
    var top = "<div class='card-top'><span class='tag'>" + esc((TOPICS[it.topic] || {}).label || it.topic) +
      "</span><span class='kind'>· " + esc(KIND[it.kind] || "") + "</span>" +
      (lastSeen && it.edition > lastSeen ? "<span class='new-badge'>new</span>" : "") + "</div>";
    var html = top;
    if (it.title) html += "<h2>" + esc(it.title) + "</h2>";
    html += "<p class='body'>" + esc(it.body) + "</p>";
    if (it.who) html += "<div class='who'>— " + esc(it.who) + "</div>";
    if (it.hook) html += "<div class='hook'><b>Wonder: </b>" + esc(it.hook) + "</div>";
    if (it.q) {
      html += "<div class='hook'><b>Recall: </b>" + esc(it.q) +
        "<br><button class='reveal-btn' type='button'>Reveal</button><div class='answer'>" + esc(it.a) + "</div></div>";
    }
    var src = it.source ? "<a href='" + esc(it.source.url) + "' target='_blank' rel='noopener'>" + esc(it.source.name) + " ↗</a>" : "<span></span>";
    html += "<div class='card-foot'>" + src + "<button class='save' type='button' title='Save'>" + (saved[it.id] ? "★" : "☆") + "</button></div>";
    $c.html(html).attr("data-id", it.id).toggleClass("saved", !!saved[it.id]);
    $c.find(".save").toggleClass("on", !!saved[it.id]);
    return $c;
  }

  $cards.on("click", ".reveal-btn", function () {
    $(this).hide().siblings(".answer").addClass("show");
  });
  $cards.on("click", ".save", function () {
    var id = $(this).closest(".card").data("id");
    if (saved[id]) delete saved[id]; else saved[id] = 1;
    store.set("calm-saved", saved);
    $(this).toggleClass("on", !!saved[id]).text(saved[id] ? "★" : "☆");
  });

  var lastEd = null;
  function renderMore() {
    var end = Math.min(shown + CHUNK, list.length);
    for (var i = shown; i < end; i++) {
      var it = list[i];
      if (it.edition !== lastEd) {
        $cards.append("<div class='divider'>" + esc(editionLabel(it.edition)) + "</div>");
        lastEd = it.edition;
      }
      $cards.append(card(it));
    }
    shown = end;
    var done = shown >= list.length;
    $sentinel.toggle(!done);
    $end.prop("hidden", !done || list.length === 0);
    if (list.length === 0) $cards.html("<div class='empty'>" + (savedOnly ? "Nothing saved yet. Tap ☆ on a card." : "Nothing here yet.") + "</div>");
  }

  function rebuild() {
    list = all.filter(function (it) {
      return (topic === "all" || it.topic === topic) && (!savedOnly || saved[it.id]);
    });
    shown = 0; lastEd = null;
    $cards.empty();
    renderMore();
    window.scrollTo(0, 0);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && shown < list.length) renderMore();
    }, { rootMargin: "600px" }).observe($sentinel[0]);
  } else {
    $(window).on("scroll", function () {
      if ($(window).scrollTop() + $(window).height() > $(document).height() - 600 && shown < list.length) renderMore();
    });
  }

  $.getJSON("data/items.json?v=" + Date.now()).done(function (data) {
    all = (data.items || []).slice().sort(function (a, b) {
      return a.edition < b.edition ? 1 : a.edition > b.edition ? -1 : (a.order || 0) - (b.order || 0);
    });
    if (data.updated) {
      $("#editionNote").text("Updated " + new Date(data.updated).toLocaleString(undefined,
        { weekday: "short", hour: "numeric", minute: "2-digit" }) + " · " + all.length + " items");
    }
    rebuild();
    if (all.length) store.set("calm-last-edition", all[0].edition);
  }).fail(function () {
    $cards.html("<div class='empty'>Couldn't load the feed. Pull to refresh.</div>");
    $sentinel.hide();
  });
});
