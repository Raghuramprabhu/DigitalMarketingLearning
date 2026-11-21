/* Two fingers & a window — playground engine, examples, fence challenge, pattern quiz.
   Plain JS, no dependencies. Every playground is a pre-computed list of steps
   produced by actually running the algorithm, so what you see is what the code does. */
(function () {
  'use strict';

  /* ================= utilities ================= */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var KW = /\b(int|void|boolean|char|for|while|if|else|return|new|true|false)\b/g;
  var TY = /\b(String|Set|HashSet|List|ArrayList|Arrays|Math|Integer)\b/g;
  function javaLine(line) {
    var ci = line.indexOf('//'), code = ci >= 0 ? line.slice(0, ci) : line, cm = ci >= 0 ? line.slice(ci) : '';
    var out = esc(code).replace(/\b(\d+)\b/g, '<span class="num">$1</span>').replace(KW, '<span class="kw">$1</span>').replace(TY, '<span class="kw">$1</span>');
    if (cm) out += '<span class="cm">' + esc(cm) + '</span>';
    return out || ' ';
  }

  // Code lines carry /*#label*/ markers so each step can say which line(s) it is on.
  function parseCode(src) {
    var lines = src.replace(/^\n+/, '').replace(/\s+$/, '').split('\n'), map = {};
    var clean = lines.map(function (ln, i) {
      var m = ln.match(/\s*\/\*#(\w+)\*\/\s*$/);
      if (m) { (map[m[1]] = map[m[1]] || []).push(i); return ln.slice(0, m.index); }
      return ln;
    });
    return { lines: clean, map: map };
  }

  function Tracer(code) {
    var P = parseCode(code), steps = [];
    return {
      P: P, steps: steps,
      step: function (label, s) {
        if (label && !P.map[label]) throw new Error('Unknown code label: ' + label);
        steps.push({
          lines: label ? P.map[label] : [],
          arr: s.arr ? s.arr.slice() : null,
          ptrs: Object.assign({}, s.ptrs || {}),
          win: s.win ? s.win.slice() : null,
          marks: Object.assign({}, s.marks || {}),
          vars: clone(s.vars || {}),
          msg: s.msg || '',
          water: s.water ? clone(s.water) : null
        });
      }
    };
  }

  var PCOL = { left: 'p-teal', slow: 'p-teal', low: 'p-teal', i: 'p-plum', mid: 'p-plum', right: 'p-accent', fast: 'p-accent', high: 'p-accent' };

  /* ================= playground ================= */
  function Playground(host, spec) {
    var T = Tracer(spec.code);
    spec.build(T);
    this.steps = T.steps; this.lines = T.P.lines; this.spec = spec; this.i = 0; this.timer = null;
    var self = this;

    var root = h('div', 'pg');
    var viz = h('div', 'pg-viz');
    if (spec.mode === 'bars') { this.svgHost = h('div'); viz.appendChild(this.svgHost); }
    else { this.cells = h('div', 'cells'); viz.appendChild(this.cells); }
    root.appendChild(viz);
    this.msg = h('div', 'pg-msg'); root.appendChild(this.msg);

    var ctr = h('div', 'pg-controls');
    this.bReset = h('button', 'btn ghost', '⏮'); this.bReset.title = 'Back to the start';
    this.bBack = h('button', 'btn ghost', '◀ Back');
    this.bStep = h('button', 'btn', 'Step ▶');
    this.bPlay = h('button', 'btn ghost', '▶ Auto-run');
    this.count = h('span', 'pg-count');
    this.speed = h('select', null, '<option value="2400">Slow</option><option value="1500" selected>Normal</option><option value="800">Fast</option>');
    this.speed.setAttribute('aria-label', 'Auto-run speed');
    [this.bReset, this.bBack, this.bStep, this.bPlay, this.count, this.speed].forEach(function (b) { if (b.tagName === 'BUTTON') b.type = 'button'; ctr.appendChild(b); });
    root.appendChild(ctr);

    var split = h('div', 'pg-split');
    this.codeEl = h('pre', 'code');
    this.lines.forEach(function (ln, n) { var s = h('span', 'ln', javaLine(ln)); s.setAttribute('data-n', n + 1); self.codeEl.appendChild(s); });
    this.varsEl = h('div', 'vars');
    split.appendChild(this.codeEl); split.appendChild(this.varsEl);
    root.appendChild(split);
    host.appendChild(root);

    this.bStep.onclick = function () { self.stop(); self.go(self.i + 1); };
    this.bBack.onclick = function () { self.stop(); self.go(self.i - 1); };
    this.bReset.onclick = function () { self.stop(); self.go(0); };
    this.bPlay.onclick = function () { self.timer ? self.stop() : self.play(); };
    this.speed.onchange = function () { if (self.timer) { self.stop(); self.play(); } };
    this.go(0);
  }
  Playground.prototype.play = function () {
    var self = this;
    if (this.i >= this.steps.length - 1) this.go(0);
    this.bPlay.innerHTML = '⏸ Pause';
    this.timer = setInterval(function () {
      if (self.i >= self.steps.length - 1) { self.stop(); return; }
      self.go(self.i + 1);
    }, +this.speed.value);
  };
  Playground.prototype.stop = function () { clearInterval(this.timer); this.timer = null; this.bPlay.innerHTML = '▶ Auto-run'; };
  Playground.prototype.go = function (i) {
    i = Math.max(0, Math.min(this.steps.length - 1, i));
    this.i = i;
    var st = this.steps[i], prev = i > 0 ? this.steps[i - 1] : null;
    if (this.spec.mode === 'bars') this.renderBars(st); else this.renderCells(st);
    this.msg.innerHTML = st.msg;
    this.count.textContent = 'Step ' + (i + 1) + ' / ' + this.steps.length;
    this.bBack.disabled = i === 0; this.bStep.disabled = i === this.steps.length - 1;
    var on = {}; st.lines.forEach(function (n) { on[n] = 1; });
    Array.prototype.forEach.call(this.codeEl.children, function (s, n) { s.classList.toggle('on', !!on[n]); });
    var firstOn = this.codeEl.children[st.lines[0]];
    if (firstOn) { var c = this.codeEl; var top = firstOn.offsetTop - c.offsetTop; if (top < c.scrollTop || top > c.scrollTop + c.clientHeight - 24) c.scrollTop = top - 20; }
    var v = '<h5>Variables</h5>', keys = Object.keys(st.vars);
    if (!keys.length) v += '<div class="var"><span>—</span><span></span></div>';
    keys.forEach(function (k) {
      var changed = prev && JSON.stringify(prev.vars[k]) !== JSON.stringify(st.vars[k]);
      v += '<div class="var' + (changed ? ' changed' : '') + '"><span>' + esc(k) + '</span><span>' + esc(st.vars[k]) + '</span></div>';
    });
    this.varsEl.innerHTML = v;
  };
  Playground.prototype.renderCells = function (st) {
    var spec = this.spec, box = this.cells;
    box.innerHTML = '';
    st.arr.forEach(function (val, idx) {
      var col = h('div', 'col');
      var cls = 'cell' + (spec.small ? ' small' : '') + (spec.cellClass ? ' ' + spec.cellClass(val, idx) : '');
      if (st.win && idx >= st.win[0] && idx <= st.win[1]) cls += ' win';
      if (st.marks[idx]) cls += ' ' + st.marks[idx];
      col.appendChild(h('div', cls, esc(spec.fmt ? spec.fmt(val, idx) : val)));
      col.appendChild(h('div', 'idx', idx));
      var p = h('div', 'ptrs');
      Object.keys(st.ptrs).forEach(function (name) { if (st.ptrs[name] === idx) p.appendChild(h('span', 'ptr ' + (PCOL[name] || 'p-ink'), name)); });
      col.appendChild(p);
      box.appendChild(col);
    });
  };
  Playground.prototype.renderBars = function (st) { this.svgHost.innerHTML = barsSVG(st.arr, st.ptrs, st.water, st.marks, null); };

  // Shared bar drawing for the fence posts (playground + challenge).
  function barsSVG(hs, ptrs, water, marks, picked) {
    var n = hs.length, gap = 40, W = n * gap + 20, base = 176, scale = 17, max = Math.max.apply(null, hs);
    var s = '<svg class="bars-svg" viewBox="0 0 ' + W + ' 232" role="img" aria-label="Fence posts of different heights">';
    s += '<line x1="6" y1="' + base + '" x2="' + (W - 6) + '" y2="' + base + '" stroke="#c9bfb2" stroke-width="2"/>';
    if (water) {
      var x1 = 20 + water.l * gap + 11, x2 = 20 + water.r * gap + 11, lv = water.level * scale;
      s += '<rect x="' + x1 + '" y="' + (base - lv) + '" width="' + (x2 - x1) + '" height="' + lv + '" fill="#74c0fc" opacity=".45"/>';
      s += '<line x1="' + x1 + '" y1="' + (base - lv) + '" x2="' + x2 + '" y2="' + (base - lv) + '" stroke="#1c7ed6" stroke-width="2" stroke-dasharray="5 4"/>';
    }
    for (var i = 0; i < n; i++) {
      var x = 20 + i * gap, bh = hs[i] * scale;
      var fill = '#a68a64';
      if (marks && marks[i] === 'hot') fill = '#d9480f';
      if (marks && marks[i] === 'dim') fill = '#d8cfc2';
      if (picked && picked.indexOf(i) >= 0) fill = '#0b7285';
      s += '<g class="post-hit" data-post="' + i + '">';
      s += '<rect x="' + (x - 9) + '" y="0" width="40" height="232" fill="transparent"/>';
      s += '<rect x="' + x + '" y="' + (base - bh) + '" width="22" height="' + bh + '" rx="3" fill="' + fill + '"/>';
      s += '<text x="' + (x + 11) + '" y="' + (base - bh - 5) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#5c524a">' + hs[i] + 'm</text>';
      s += '<text x="' + (x + 11) + '" y="' + (base + 15) + '" text-anchor="middle" font-size="11" fill="#5c524a">#' + (i + 1) + '</text>';
      s += '</g>';
    }
    if (ptrs) {
      var row = {};
      Object.keys(ptrs).forEach(function (k) {
        var p = ptrs[k]; if (p < 0 || p >= n) return;
        var yy = 196 + (row[p] || 0) * 18; row[p] = (row[p] || 0) + 1;
        var col = PCOL[k] === 'p-teal' ? '#0b7285' : PCOL[k] === 'p-accent' ? '#d9480f' : '#495057';
        var cx = 20 + p * gap + 11;
        s += '<rect x="' + (cx - 20) + '" y="' + (yy + 2) + '" width="40" height="15" rx="5" fill="' + col + '"/>';
        s += '<text x="' + cx + '" y="' + (yy + 13) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">' + k + '</text>';
      });
    }
    void max;
    return s + '</svg>';
  }

  /* ================= examples ================= */
  var EX = {};

  /* ---------- TWO POINTERS ---------- */
  EX.reverse = {
    fmt: function (v) { return v; },
    code: `
void reverse(char[] word) {
    int left = 0, right = word.length - 1;    /*#init*/
    while (left < right) {                     /*#loop*/
        char temp = word[left];                /*#swap*/
        word[left] = word[right];              /*#swap*/
        word[right] = temp;                    /*#swap*/
        left++;                                /*#move*/
        right--;                               /*#move*/
    }
}`,
    build: function (T) {
      var a = 'STRESSED'.split(''), l = 0, r = a.length - 1;
      T.step('init', { arr: a, ptrs: { left: l, right: r }, vars: { left: l, right: r }, msg: 'Left finger on the first letter, right finger on the last. Watch what <b>STRESSED</b> turns into.' });
      for (;;) {
        var go = l < r;
        T.step('loop', { arr: a, ptrs: { left: l, right: r }, vars: { left: l, right: r, 'left < right': go }, msg: go ? 'Is left (' + l + ') still before right (' + r + ')? <b>Yes</b>, the fingers haven\'t met, so keep going.' : 'left (' + l + ') is no longer before right (' + r + '). The fingers have met in the middle, so <b>stop</b>. STRESSED is now <b>' + a.join('') + '</b>. 🍰' });
        if (!go) break;
        var t = a[l]; a[l] = a[r]; a[r] = t;
        T.step('swap', { arr: a, ptrs: { left: l, right: r }, marks: { [l]: 'hot', [r]: 'hot' }, vars: { left: l, right: r, temp: t }, msg: 'Swap the two letters under the fingers: <b>' + a[r] + '</b> goes right, <b>' + a[l] + '</b> comes left. <i>temp</i> is just a hand to hold one letter during the swap.' });
        l++; r--;
        T.step('move', { arr: a, ptrs: { left: l, right: r }, vars: { left: l, right: r }, msg: 'Both fingers step one place inward. The outer letters are finished for good.' });
      }
    }
  };

  EX.voucher = {
    fmt: function (v) { return '₹' + v; },
    code: `
boolean hasPair(int[] prices, int budget) {
    int left = 0, right = prices.length - 1;      /*#init*/
    while (left < right) {                          /*#loop*/
        int total = prices[left] + prices[right];   /*#total*/
        if (total == budget) return true;           /*#found*/
        if (total > budget) right--;                /*#over*/
        else left++;                                /*#under*/
    }
    return false;                                   /*#none*/
}`,
    build: function (T) {
      var a = [150, 250, 300, 450, 700, 950], B = 1000, l = 0, r = a.length - 1;
      T.step('init', { arr: a, ptrs: { left: l, right: r }, vars: { budget: B, left: l, right: r }, msg: 'You stand at the cheapest item, your friend at the dearest. The shelf is <b>sorted</b>, and that is what makes every move obvious.' });
      while (l < r) {
        T.step('loop', { arr: a, ptrs: { left: l, right: r }, vars: { budget: B, left: l, right: r }, msg: 'Fingers haven\'t met yet, so try this pair.' });
        var tot = a[l] + a[r];
        T.step('total', { arr: a, ptrs: { left: l, right: r }, marks: { [l]: 'hot', [r]: 'hot' }, vars: { budget: B, left: l, right: r, total: tot }, msg: '₹' + a[l] + ' + ₹' + a[r] + ' = <b>₹' + tot + '</b>.' });
        if (tot === B) { T.step('found', { arr: a, ptrs: { left: l, right: r }, marks: { [l]: 'good', [r]: 'good' }, vars: { budget: B, left: l, right: r, total: tot }, msg: 'Exactly ₹' + B + '! <b>Return true.</b> Found in a handful of steps instead of trying all 15 pairs.' }); return; }
        if (tot > B) { r--; T.step('over', { arr: a, ptrs: { left: l, right: r }, marks: { [r + 1]: 'dim' }, vars: { budget: B, left: l, right: r, total: tot }, msg: 'Too much. Moving <i>your</i> finger right would only add more, so your <b>friend steps left</b> to something cheaper.' }); }
        else { l++; T.step('under', { arr: a, ptrs: { left: l, right: r }, marks: { [l - 1]: 'dim' }, vars: { budget: B, left: l, right: r, total: tot }, msg: 'Too little. Your friend moving left would only cut more, so <b>you step right</b> to something dearer.' }); }
      }
      T.step('none', { arr: a, ptrs: { left: l, right: r }, vars: { budget: B }, msg: 'Fingers met: no pair exists.' });
    }
  };

  EX.zeros = {
    fmt: function (v) { return v === 0 ? '0' : v; },
    cellClass: function (v) { return v === 0 ? 'gap' : ''; },
    code: `
void moveZeros(int[] shelf) {
    int slow = 0;                                     /*#init*/
    for (int fast = 0; fast < shelf.length; fast++) { /*#loop*/
        if (shelf[fast] != 0) {                       /*#check*/
            int temp = shelf[slow];                   /*#swap*/
            shelf[slow] = shelf[fast];                /*#swap*/
            shelf[fast] = temp;                       /*#swap*/
            slow++;                                   /*#slow*/
        }
    }
}`,
    build: function (T) {
      var a = [0, 5, 0, 7, 0, 3], s = 0;
      T.step('init', { arr: a, ptrs: { slow: s }, vars: { slow: s }, msg: 'Zeros are empty gaps, numbers are books. <b>slow</b> stands where the next book should go. Everything left of slow is already tidy (nothing yet).' });
      for (var f = 0; f < a.length; f++) {
        T.step('loop', { arr: a, ptrs: { slow: s, fast: f }, vars: { slow: s, fast: f }, msg: 'The scout <b>fast</b> looks at spot ' + f + '.' });
        var book = a[f] !== 0;
        T.step('check', { arr: a, ptrs: { slow: s, fast: f }, marks: { [f]: book ? 'hot' : 'dim' }, vars: { slow: s, fast: f, 'shelf[fast]': a[f] }, msg: book ? 'A book (<b>' + a[f] + '</b>)! Hand it back to the boundary.' : 'Just a gap. Ignore it; slow stays put because its spot still needs a book.' });
        if (book) {
          var t = a[s]; a[s] = a[f]; a[f] = t;
          T.step('swap', { arr: a, ptrs: { slow: s, fast: f }, marks: { [s]: 'good' }, vars: { slow: s, fast: f, temp: t }, msg: s === f ? 'slow and fast are on the same spot, so the swap changes nothing. Fine.' : 'Swap: the book jumps to spot ' + s + ', the gap goes where the book was.' });
          s++;
          T.step('slow', { arr: a, ptrs: { slow: s, fast: f }, vars: { slow: s, fast: f }, msg: 'Spot ' + (s - 1) + ' is filled, so the boundary <b>slow</b> moves forward to ' + s + '.' });
        }
      }
      T.step('loop', { arr: a, ptrs: { slow: s }, vars: { slow: s }, msg: 'fast has reached the end. Books on the left, <b>still in their original order</b>, gaps on the right. One pass.' });
    }
  };

  EX.flag = {
    fmt: function (v) { return ['S', 'W', 'G'][v]; },
    cellClass: function (v) { return ['c-saffron', 'c-white', 'c-green'][v]; },
    code: `
void sortFlag(int[] a) {               // 0 saffron, 1 white, 2 green
    int low = 0, mid = 0, high = a.length - 1;    /*#init*/
    while (mid <= high) {                          /*#loop*/
        if (a[mid] == 0) {                         /*#is0*/
            swap(a, low, mid);                     /*#sw0*/
            low++; mid++;                          /*#sw0*/
        } else if (a[mid] == 1) {                  /*#is1*/
            mid++;                                 /*#w1*/
        } else {                                   /*#is2*/
            swap(a, mid, high);                    /*#sw2*/
            high--;                                /*#sw2*/
        }
    }
}`,
    build: function (T) {
      var a = [1, 2, 0, 2, 1, 0, 1, 0], lo = 0, md = 0, hi = a.length - 1;
      var N = ['saffron', 'white', 'green'];
      function P() { return { low: lo, mid: md, high: hi }; }
      function V() { return { low: lo, mid: md, high: hi }; }
      T.step('init', { arr: a, ptrs: P(), vars: V(), msg: 'Three fingers make four zones: left of <b>low</b> is saffron, low…mid is white, mid…high is <b>unknown</b>, right of <b>high</b> is green. The job: shrink the unknown zone to nothing.' });
      while (md <= hi) {
        T.step('loop', { arr: a, ptrs: P(), win: [md, hi], vars: V(), msg: 'Unknown zone (purple) is spots ' + md + '…' + hi + '. Look at the strip under <b>mid</b>: ' + N[a[md]] + '.' });
        if (a[md] === 0) {
          T.step('is0', { arr: a, ptrs: P(), win: [md, hi], marks: { [md]: 'hot' }, vars: V(), msg: 'Saffron belongs at the far left.' });
          var t = a[lo]; a[lo] = a[md]; a[md] = t; lo++; md++;
          T.step('sw0', { arr: a, ptrs: P(), win: md <= hi ? [md, hi] : null, vars: V(), msg: 'Swap it to the <b>low</b> spot, then low and mid both step right. The saffron zone grew by one.' });
        } else if (a[md] === 1) {
          T.step('is1', { arr: a, ptrs: P(), win: [md, hi], marks: { [md]: 'hot' }, vars: V(), msg: 'White is already in the right zone.' });
          md++;
          T.step('w1', { arr: a, ptrs: P(), win: md <= hi ? [md, hi] : null, vars: V(), msg: 'Leave it there and just move <b>mid</b> on.' });
        } else {
          T.step('is2', { arr: a, ptrs: P(), win: [md, hi], marks: { [md]: 'hot' }, vars: V(), msg: 'Green belongs at the far right.' });
          var t2 = a[hi]; a[hi] = a[md]; a[md] = t2; hi--;
          T.step('sw2', { arr: a, ptrs: P(), win: md <= hi ? [md, hi] : null, vars: V(), msg: 'Swap it to the <b>high</b> spot and move high left. Notice mid does <b>not</b> move: the strip that came back from the right is still unknown, so we must look at it.' });
        }
      }
      T.step('loop', { arr: a, ptrs: P(), vars: V(), msg: 'mid has passed high: the unknown zone is empty. Saffron, white, green, in <b>one pass</b>, with no counting and no second array. 🇮🇳' });
    }
  };

  EX.fence = {
    mode: 'bars',
    code: `
int maxWater(int[] h) {
    int left = 0, right = h.length - 1, best = 0;      /*#init*/
    while (left < right) {                               /*#loop*/
        int width = right - left;                        /*#calc*/
        int water = Math.min(h[left], h[right]) * width; /*#calc*/
        best = Math.max(best, water);                    /*#best*/
        if (h[left] < h[right]) left++;                  /*#moveL*/
        else right--;                                    /*#moveR*/
    }
    return best;                                         /*#end*/
}`,
    build: function (T) {
      var a = FENCE, l = 0, r = a.length - 1, best = 0, bl = -1, br = -1;
      T.step('init', { arr: a, ptrs: { left: l, right: r }, vars: { left: l, right: r, best: 0 }, msg: 'Start with the <b>widest</b> pair: the two end posts.' });
      while (l < r) {
        var w = r - l, lv = Math.min(a[l], a[r]), water = lv * w;
        T.step('calc', { arr: a, ptrs: { left: l, right: r }, water: { l: l, r: r, level: lv }, vars: { left: l, right: r, width: w, level: lv, water: water, best: best }, msg: 'Posts #' + (l + 1) + ' (' + a[l] + 'm) and #' + (r + 1) + ' (' + a[r] + 'm). Water can only rise to the <b>shorter</b> one, ' + lv + 'm, across a width of ' + w + ': <b>' + water + '</b>.' });
        var better = water > best;
        if (better) { best = water; bl = l; br = r; }
        T.step('best', { arr: a, ptrs: { left: l, right: r }, water: { l: l, r: r, level: lv }, vars: { left: l, right: r, water: water, best: best, 'best pair': '#' + (bl + 1) + ' & #' + (br + 1) }, msg: better ? 'New record! Best is now <b>' + best + '</b>.' : 'Not better than the record (' + best + '). Keep the record.' });
        if (a[l] < a[r]) { l++; T.step('moveL', { arr: a, ptrs: { left: l, right: r }, marks: { [l - 1]: 'dim' }, vars: { left: l, right: r, best: best }, msg: 'The <b>left</b> post is shorter, so it\'s the one capping the water. It has already had its widest chance, so drop it: left steps in.' }); }
        else { r--; T.step('moveR', { arr: a, ptrs: { left: l, right: r }, marks: { [r + 1]: 'dim' }, vars: { left: l, right: r, best: best }, msg: (a[l] === a[r + 1] ? 'Both posts are equal, so dropping either is safe. ' : 'The <b>right</b> post is shorter, so it\'s the one capping the water. ') + 'Right steps in.' }); }
      }
      T.step('end', { arr: a, ptrs: {}, water: { l: bl, r: br, level: Math.min(a[bl], a[br]) }, vars: { best: best, 'best pair': '#' + (bl + 1) + ' & #' + (br + 1) }, msg: 'Fingers met. The winner is posts <b>#' + (bl + 1) + ' and #' + (br + 1) + '</b> holding <b>' + best + '</b>. ' + (a.length - 1) + ' steps instead of checking all ' + (a.length * (a.length - 1) / 2) + ' pairs.' });
    }
  };

  /* ---------- SLIDING WINDOW (fixed size) ---------- */
  EX.meteors = {
    code: `
int bestWatch(int[] meteors, int k) {
    int windowSum = 0;                          /*#init*/
    for (int i = 0; i < k; i++)                 /*#first*/
        windowSum += meteors[i];                /*#first*/
    int best = windowSum;                       /*#best0*/
    for (int i = k; i < meteors.length; i++) {  /*#loop*/
        windowSum += meteors[i];                /*#in*/
        windowSum -= meteors[i - k];            /*#out*/
        best = Math.max(best, windowSum);       /*#best*/
    }
    return best;                                /*#end*/
}`,
    build: function (T) {
      var a = [4, 2, 7, 3, 8, 1, 5], k = 3, sum = 0, best, bs = 0;
      T.step('init', { arr: a, vars: { k: k, windowSum: 0 }, msg: 'Meteors spotted each hour of the night. Your eyes can handle a <b>' + k + '-hour</b> watch. Which ' + k + ' hours should you pick?' });
      for (var i = 0; i < k; i++) {
        sum += a[i];
        T.step('first', { arr: a, win: [0, i], ptrs: { i: i }, vars: { k: k, i: i, windowSum: sum }, msg: 'Building the first window: add hour ' + i + ' (' + a[i] + ').' });
      }
      best = sum;
      T.step('best0', { arr: a, win: [0, k - 1], vars: { k: k, windowSum: sum, best: best }, msg: 'First window (hours 0–' + (k - 1) + ') totals <b>' + sum + '</b>. That\'s the record so far.' });
      for (i = k; i < a.length; i++) {
        T.step('loop', { arr: a, win: [i - k, i - 1], ptrs: { i: i }, vars: { k: k, i: i, windowSum: sum, best: best }, msg: 'Slide one hour later.' });
        sum += a[i];
        T.step('in', { arr: a, win: [i - k, i], ptrs: { i: i }, marks: { [i]: 'good' }, vars: { k: k, i: i, windowSum: sum, best: best }, msg: 'Hour ' + i + ' slides <b>in</b>: +' + a[i] + '.' });
        sum -= a[i - k];
        T.step('out', { arr: a, win: [i - k + 1, i], ptrs: { i: i }, marks: { [i - k]: 'bad' }, vars: { k: k, i: i, windowSum: sum, best: best }, msg: 'Hour ' + (i - k) + ' slides <b>out</b>: −' + a[i - k] + '. The middle hours were never re-added.' });
        if (sum > best) { best = sum; bs = i - k + 1; }
        T.step('best', { arr: a, win: [i - k + 1, i], ptrs: { i: i }, vars: { k: k, i: i, windowSum: sum, best: best }, msg: sum === best && bs === i - k + 1 ? 'New best: <b>' + best + '</b>!' : 'Window total ' + sum + '. Record stays ' + best + '.' });
      }
      T.step('end', { arr: a, win: [bs, bs + k - 1], vars: { best: best }, msg: 'Watch hours <b>' + bs + '–' + (bs + k - 1) + '</b> for <b>' + best + '</b> meteors. Each hour was added once and removed once.' });
    }
  };

  EX.repeat = {
    small: true,
    code: `
boolean repeatsWithin(String[] songs, int k) {
    Set<String> window = new HashSet<>();             /*#init*/
    for (int i = 0; i < songs.length; i++) {          /*#loop*/
        if (window.contains(songs[i])) return true;   /*#check*/
        window.add(songs[i]);                         /*#add*/
        if (window.size() > k)                        /*#trim*/
            window.remove(songs[i - k]);              /*#trim*/
    }
    return false;                                     /*#none*/
}`,
    build: function (T) {
      var a = ['Kalyani', 'Mohanam', 'Todi', 'Kalyani', 'Bhairavi', 'Kalyani'], k = 2, set = [];
      function S() { return '{' + set.join(', ') + '}'; }
      T.step('init', { arr: a, vars: { k: k, window: S() }, msg: 'A radio playlist. Rule: the same raga must not play again within <b>' + k + '</b> songs. The window remembers only the last ' + k + ' songs.' });
      for (var i = 0; i < a.length; i++) {
        var w0 = Math.max(0, i - k);
        T.step('loop', { arr: a, ptrs: { i: i }, win: i > 0 ? [w0, i - 1] : null, vars: { k: k, i: i, window: S() }, msg: 'Now playing: <b>' + a[i] + '</b>.' });
        var hit = set.indexOf(a[i]) >= 0;
        T.step('check', { arr: a, ptrs: { i: i }, win: i > 0 ? [w0, i - 1] : null, marks: { [i]: hit ? 'bad' : 'hot' }, vars: { k: k, i: i, window: S() }, msg: hit ? '<b>' + a[i] + '</b> is in the window: it played within the last ' + k + ' songs. <b>Return true.</b>' : (i === 3 ? 'Kalyani played at spot 0, but that\'s ' + (i - 0) + ' songs back, already outside the window. So it\'s <b>not</b> a violation.' : 'Not in the window. Fine.') });
        if (hit) return;
        set.push(a[i]);
        T.step('add', { arr: a, ptrs: { i: i }, win: [w0, i], vars: { k: k, i: i, window: S() }, msg: 'Remember <b>' + a[i] + '</b>.' });
        if (set.length > k) {
          var gone = a[i - k]; set.splice(set.indexOf(gone), 1);
          T.step('trim', { arr: a, ptrs: { i: i }, win: [i - k + 1, i], marks: { [i - k]: 'dim' }, vars: { k: k, i: i, window: S() }, msg: 'Window too big, so forget the oldest song, <b>' + gone + '</b>. The frame always holds just ' + k + '.' });
        }
      }
    }
  };

  EX.walk = {
    code: `
int goodStretches(int[] km, int k, int avg) {
    int target = k * avg, sum = 0, count = 0;      /*#init*/
    for (int i = 0; i < km.length; i++) {          /*#loop*/
        sum += km[i];                              /*#in*/
        if (i >= k) sum -= km[i - k];              /*#out*/
        if (i >= k - 1 && sum >= target) count++;  /*#check*/
    }
    return count;                                  /*#end*/
}`,
    build: function (T) {
      var a = [3, 6, 5, 2, 7, 6, 4], k = 3, avg = 5, target = k * avg, sum = 0, count = 0;
      T.step('init', { arr: a, vars: { k: k, avg: avg, target: target, sum: 0, count: 0 }, msg: 'Kilometres walked each day. How many <b>' + k + '-day</b> stretches averaged at least ' + avg + ' km? Trick: average ≥ ' + avg + ' is the same as total ≥ ' + target + ', so no dividing needed.' });
      for (var i = 0; i < a.length; i++) {
        var lo = Math.max(0, i - k);
        sum += a[i];
        T.step('in', { arr: a, ptrs: { i: i }, win: [lo, i], marks: { [i]: 'good' }, vars: { k: k, target: target, i: i, sum: sum, count: count }, msg: 'Day ' + i + ' walks in: +' + a[i] + ' km.' });
        if (i >= k) { sum -= a[i - k]; T.step('out', { arr: a, ptrs: { i: i }, win: [i - k + 1, i], marks: { [i - k]: 'bad' }, vars: { k: k, target: target, i: i, sum: sum, count: count }, msg: 'Day ' + (i - k) + ' walks out: −' + a[i - k] + ' km.' }); }
        var full = i >= k - 1, ok = full && sum >= target;
        if (ok) count++;
        T.step('check', { arr: a, ptrs: { i: i }, win: [Math.max(0, i - k + 1), i], vars: { k: k, target: target, i: i, sum: sum, count: count }, msg: !full ? 'The window isn\'t ' + k + ' days long yet, so don\'t judge it.' : ok ? 'Total ' + sum + ' ≥ ' + target + ': a good stretch! <b>count = ' + count + '</b>.' : 'Total ' + sum + ' is under ' + target + '. Not this one.' });
      }
      T.step('end', { arr: a, vars: { count: count }, msg: '<b>' + count + '</b> good stretches. Same single pass, just one if-statement asking "is it full and good?"' });
    }
  };

  EX.anagram = {
    code: `
List<Integer> findShuffles(String s, String p) {
    int[] need = new int[26], have = new int[26];   /*#init*/
    for (char c : p.toCharArray()) need[c - 'A']++; /*#init*/
    List<Integer> found = new ArrayList<>();        /*#init*/
    int k = p.length();                             /*#init*/
    for (int i = 0; i < s.length(); i++) {          /*#loop*/
        have[s.charAt(i) - 'A']++;                  /*#in*/
        if (i >= k) have[s.charAt(i - k) - 'A']--;  /*#out*/
        if (Arrays.equals(need, have))              /*#cmp*/
            found.add(i - k + 1);                   /*#found*/
    }
    return found;                                   /*#end*/
}`,
    build: function (T) {
      var s = 'EATBTEAXAET', p = 'TEA', k = 3, have = {}, found = [];
      var need = { A: 1, E: 1, T: 1 };
      function H() { return Object.keys(have).filter(function (c) { return have[c]; }).sort().map(function (c) { return c + ':' + have[c]; }).join(' ') || '—'; }
      function same() { var ks = {}; Object.keys(have).concat(Object.keys(need)).forEach(function (c) { ks[c] = 1; }); return Object.keys(ks).every(function (c) { return (have[c] || 0) === (need[c] || 0); }); }
      var arr = s.split('');
      T.step('init', { arr: arr, vars: { need: 'A:1 E:1 T:1', have: '—', found: '[]' }, msg: 'Find every spot where <b>TEA</b> appears with its letters shuffled (EAT, ATE, AET…). Don\'t compare words. Compare <b>letter counts</b>: a window of ' + k + ' keeps a tally.' });
      for (var i = 0; i < s.length; i++) {
        have[s[i]] = (have[s[i]] || 0) + 1;
        T.step('in', { arr: arr, ptrs: { i: i }, win: [Math.max(0, i - k), i], marks: { [i]: 'good' }, vars: { need: 'A:1 E:1 T:1', have: H(), found: '[' + found.join(', ') + ']' }, msg: '<b>' + s[i] + '</b> enters: tally it.' });
        if (i >= k) { have[s[i - k]]--; T.step('out', { arr: arr, ptrs: { i: i }, win: [i - k + 1, i], marks: { [i - k]: 'bad' }, vars: { need: 'A:1 E:1 T:1', have: H(), found: '[' + found.join(', ') + ']' }, msg: '<b>' + s[i - k] + '</b> leaves: untally it.' }); }
        var eq = same();
        T.step('cmp', { arr: arr, ptrs: { i: i }, win: [Math.max(0, i - k + 1), i], vars: { need: 'A:1 E:1 T:1', have: H(), found: '[' + found.join(', ') + ']' }, msg: eq ? 'Tallies match exactly!' : 'Tallies differ' + (i < k - 1 ? ' (window not full yet).' : '. Not a shuffle of TEA.') });
        if (eq) {
          found.push(i - k + 1);
          var m = {}; for (var j = i - k + 1; j <= i; j++) m[j] = 'good';
          T.step('found', { arr: arr, ptrs: { i: i }, win: [i - k + 1, i], marks: m, vars: { need: 'A:1 E:1 T:1', have: H(), found: '[' + found.join(', ') + ']' }, msg: '<b>' + s.substr(i - k + 1, k) + '</b> at position ' + (i - k + 1) + ' is a shuffled TEA. Note it.' });
        }
      }
      T.step('end', { arr: arr, vars: { found: '[' + found.join(', ') + ']' }, msg: 'Found at <b>' + found.join(', ') + '</b>. Each step changed just two tallies: one letter in, one out.' });
    }
  };

  /* ---------- CATERPILLAR (stretchy window = two pointers + window) ---------- */
  EX.run = {
    code: `
int longestRun(String notes) {
    int left = 0, best = 0;                                /*#init*/
    for (int right = 0; right < notes.length(); right++) { /*#loop*/
        if (notes.charAt(right) != notes.charAt(left))     /*#cmp*/
            left = right;                                  /*#jump*/
        best = Math.max(best, right - left + 1);           /*#best*/
    }
    return best;                                           /*#end*/
}`,
    build: function (T) {
      var a = 'SRRGGGMMMMP'.split(''), l = 0, best = 0;
      T.step('init', { arr: a, vars: { left: 0, best: 0 }, msg: 'A harmonium student plays sargam. What\'s the longest run of the <b>same note</b> held back to back?' });
      for (var r = 0; r < a.length; r++) {
        var diff = a[r] !== a[l];
        T.step('cmp', { arr: a, ptrs: { left: l, right: r }, win: [l, r], marks: { [r]: diff ? 'bad' : 'hot' }, vars: { left: l, right: r, best: best }, msg: 'Front reaches <b>' + a[r] + '</b>. ' + (diff ? 'Different from the run\'s note (' + a[l] + '). The run is broken.' : 'Same note as the run. The caterpillar stretches.') });
        if (diff) { l = r; T.step('jump', { arr: a, ptrs: { left: l, right: r }, win: [l, r], vars: { left: l, right: r, best: best }, msg: 'The back end jumps straight to the front: a new run starts at ' + l + '.' }); }
        var len = r - l + 1, nb = len > best; best = Math.max(best, len);
        T.step('best', { arr: a, ptrs: { left: l, right: r }, win: [l, r], vars: { left: l, right: r, length: len, best: best }, msg: 'Current run length ' + len + '. ' + (nb ? 'New best: <b>' + best + '</b>.' : 'Best stays ' + best + '.') });
      }
      T.step('end', { arr: a, vars: { best: best }, msg: 'Longest held run: <b>' + best + '</b> (the four Ma\'s). Both ends only ever moved forward.' });
    }
  };

  EX.budget = {
    fmt: function (v) { return '₹' + v + 'k'; },
    code: `
int longestWithinBudget(int[] costs, int budget) {
    int left = 0, sum = 0, best = 0;                      /*#init*/
    for (int right = 0; right < costs.length; right++) {  /*#loop*/
        sum += costs[right];                              /*#in*/
        while (sum > budget) {                            /*#while*/
            sum -= costs[left];                           /*#shrink*/
            left++;                                       /*#shrink*/
        }
        best = Math.max(best, right - left + 1);          /*#best*/
    }
    return best;                                          /*#end*/
}`,
    build: function (T) {
      var a = [3, 1, 2, 1, 6, 1, 1, 2, 1, 1], B = 7, l = 0, sum = 0, best = 0, bl = 0, br = 0;
      T.step('init', { arr: a, vars: { budget: '₹' + B + 'k', left: 0, sum: 0, best: 0 }, msg: 'Each day of a trip costs this much (thousands). Budget ₹' + B + 'k. Longest run of <b>consecutive</b> days you can afford?' });
      for (var r = 0; r < a.length; r++) {
        sum += a[r];
        T.step('in', { arr: a, ptrs: { left: l, right: r }, win: [l, r], marks: { [r]: 'good' }, vars: { budget: B, left: l, right: r, sum: sum, best: best }, msg: 'Front grabs day ' + r + ': +' + a[r] + ' → total <b>' + sum + '</b>.' });
        while (sum > B) {
          T.step('while', { arr: a, ptrs: { left: l, right: r }, win: [l, r], vars: { budget: B, left: l, right: r, sum: sum, best: best }, msg: sum + ' &gt; ' + B + ': over budget! The back end must catch up.' });
          sum -= a[l]; l++;
          T.step('shrink', { arr: a, ptrs: { left: l, right: r }, win: [l, r], marks: { [l - 1]: 'bad' }, vars: { budget: B, left: l, right: r, sum: sum, best: best }, msg: 'Drop day ' + (l - 1) + ' (−' + a[l - 1] + ') → total ' + sum + '.' });
        }
        var len = r - l + 1, nb = len > best; if (nb) { best = len; bl = l; br = r; }
        T.step('best', { arr: a, ptrs: { left: l, right: r }, win: [l, r], vars: { budget: B, left: l, right: r, sum: sum, best: best }, msg: 'Within budget. Window is ' + len + ' days. ' + (nb ? 'New best: <b>' + best + '</b>.' : 'Best stays ' + best + '.') });
      }
      T.step('end', { arr: a, win: [bl, br], vars: { best: best }, msg: 'Best: <b>' + best + ' days</b> (days ' + bl + '–' + br + '). Notice the comeback: the winner was found near the very end, after the ₹6k day was shed.' });
    }
  };

  EX.streak = {
    fmt: function (v) { return v ? '✓' : '✗'; },
    cellClass: function (v) { return v ? '' : 'gap'; },
    code: `
int longestStreak(int[] walked) {
    int left = 0, misses = 0, best = 0;                   /*#init*/
    for (int right = 0; right < walked.length; right++) { /*#loop*/
        if (walked[right] == 0) misses++;                 /*#in*/
        while (misses > 1) {                              /*#while*/
            if (walked[left] == 0) misses--;              /*#shrink*/
            left++;                                       /*#shrink*/
        }
        best = Math.max(best, right - left + 1);          /*#best*/
    }
    return best;                                          /*#end*/
}`,
    build: function (T) {
      var a = [1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1], l = 0, miss = 0, best = 0, bl = 0, br = 0;
      T.step('init', { arr: a, vars: { left: 0, misses: 0, best: 0 }, msg: '✓ = walked, ✗ = missed. You forgive yourself <b>one</b> missed day per streak. What\'s the longest streak?' });
      for (var r = 0; r < a.length; r++) {
        if (!a[r]) miss++;
        T.step('in', { arr: a, ptrs: { left: l, right: r }, win: [l, r], marks: { [r]: a[r] ? 'good' : 'hot' }, vars: { left: l, right: r, misses: miss, best: best }, msg: a[r] ? 'Day ' + r + ': walked.' : 'Day ' + r + ': missed. Misses in the window: <b>' + miss + '</b>.' });
        while (miss > 1) {
          T.step('while', { arr: a, ptrs: { left: l, right: r }, win: [l, r], vars: { left: l, right: r, misses: miss, best: best }, msg: 'Two misses in the window: rule broken. Shrink from the back until one miss leaves.' });
          if (!a[l]) miss--; l++;
          T.step('shrink', { arr: a, ptrs: { left: l, right: r }, win: [l, r], marks: { [l - 1]: 'dim' }, vars: { left: l, right: r, misses: miss, best: best }, msg: 'Drop day ' + (l - 1) + (a[l - 1] ? ' (a walked day, still need to go further).' : ' (the old miss, rule healed).') });
        }
        var len = r - l + 1, nb = len > best; if (nb) { best = len; bl = l; br = r; }
        T.step('best', { arr: a, ptrs: { left: l, right: r }, win: [l, r], vars: { left: l, right: r, misses: miss, best: best }, msg: 'Streak length ' + len + '. ' + (nb ? 'New best: <b>' + best + '</b>.' : 'Best stays ' + best + '.') });
      }
      T.step('end', { arr: a, win: [bl, br], vars: { best: best }, msg: 'Longest forgiving streak: <b>' + best + ' days</b>.' });
    }
  };

  EX.norepeat = {
    small: true,
    code: `
int longestNoRepeat(String[] songs) {
    Set<String> inWindow = new HashSet<>();               /*#init*/
    int left = 0, best = 0;                               /*#init*/
    for (int right = 0; right < songs.length; right++) {  /*#loop*/
        while (inWindow.contains(songs[right])) {         /*#while*/
            inWindow.remove(songs[left]);                 /*#shrink*/
            left++;                                       /*#shrink*/
        }
        inWindow.add(songs[right]);                       /*#add*/
        best = Math.max(best, right - left + 1);          /*#best*/
    }
    return best;                                          /*#end*/
}`,
    build: function (T) {
      var a = ['Desh', 'Kapi', 'Todi', 'Kapi', 'Yaman', 'Desh', 'Behag', 'Todi'], l = 0, best = 0, set = [], bl = 0, br = 0;
      function S() { return '{' + set.join(', ') + '}'; }
      T.step('init', { arr: a, vars: { inWindow: '{}', left: 0, best: 0 }, msg: 'A playlist in fixed order. Longest back-to-back stretch where <b>no raga repeats</b>?' });
      for (var r = 0; r < a.length; r++) {
        T.step('loop', { arr: a, ptrs: { left: l, right: r }, win: r > l ? [l, r - 1] : null, marks: { [r]: 'hot' }, vars: { inWindow: S(), left: l, right: r, best: best }, msg: 'Front reaches <b>' + a[r] + '</b>.' + (set.indexOf(a[r]) >= 0 ? ' It\'s already in the window!' : ' Not in the window.') });
        while (set.indexOf(a[r]) >= 0) {
          T.step('while', { arr: a, ptrs: { left: l, right: r }, win: [l, r - 1], marks: { [r]: 'bad' }, vars: { inWindow: S(), left: l, right: r, best: best }, msg: a[r] + ' would repeat. Shrink from the back until the old ' + a[r] + ' is gone.' });
          set.splice(set.indexOf(a[l]), 1); l++;
          T.step('shrink', { arr: a, ptrs: { left: l, right: r }, win: r > l ? [l, r - 1] : null, marks: { [l - 1]: 'dim', [r]: 'hot' }, vars: { inWindow: S(), left: l, right: r, best: best }, msg: 'Drop <b>' + a[l - 1] + '</b>.' });
        }
        set.push(a[r]);
        T.step('add', { arr: a, ptrs: { left: l, right: r }, win: [l, r], vars: { inWindow: S(), left: l, right: r, best: best }, msg: 'Add ' + a[r] + ' to the window.' });
        var len = r - l + 1, nb = len > best; if (nb) { best = len; bl = l; br = r; }
        T.step('best', { arr: a, ptrs: { left: l, right: r }, win: [l, r], vars: { inWindow: S(), left: l, right: r, best: best }, msg: 'Window holds ' + len + ' different ragas. ' + (nb ? 'New best: <b>' + best + '</b>.' : 'Best stays ' + best + '.') });
      }
      T.step('end', { arr: a, win: [bl, br], vars: { best: best }, msg: 'Longest stretch: <b>' + best + '</b> songs (' + a.slice(bl, br + 1).join(', ') + '). Every song entered once and left at most once.' });
    }
  };

  var FENCE = [1, 8, 6, 2, 5, 4, 8, 3, 7];

  /* ================= fence challenge ================= */
  function fenceChallenge() {
    var host = $('#fence-svg'), read = $('#fence-read'), picked = [];
    function paint() {
      var water = null, txt = 'Tap any two posts to stretch a tarpaulin between them.';
      if (picked.length === 2) {
        var l = Math.min(picked[0], picked[1]), r = Math.max(picked[0], picked[1]), lv = Math.min(FENCE[l], FENCE[r]);
        water = { l: l, r: r, level: lv };
        txt = 'Posts #' + (l + 1) + ' & #' + (r + 1) + ': level ' + lv + 'm × width ' + (r - l) + ' = <b>' + lv * (r - l) + '</b>';
      } else if (picked.length === 1) txt = 'Post #' + (picked[0] + 1) + ' picked. Now tap another.';
      host.innerHTML = barsSVG(FENCE, null, water, null, picked);
      read.innerHTML = txt;
      Array.prototype.forEach.call(host.querySelectorAll('.post-hit'), function (g) {
        g.addEventListener('click', function () {
          var i = +g.getAttribute('data-post');
          if (picked.length === 2) picked = [];
          if (picked.indexOf(i) < 0) picked.push(i);
          paint();
        });
      });
    }
    paint();
  }

  // Simple pick-one MCQs with a single reveal button.
  function mcqGroup(rootSel, btnSel, after) {
    var root = $(rootSel);
    root.querySelectorAll('.mcq').forEach(function (q) {
      q.querySelectorAll('.opt').forEach(function (o) {
        o.addEventListener('click', function () {
          if (q.dataset.locked) return;
          q.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('picked'); });
          o.classList.add('picked');
        });
      });
    });
    $(btnSel).addEventListener('click', function () {
      root.querySelectorAll('.mcq').forEach(function (q) {
        q.dataset.locked = '1';
        q.querySelectorAll('.opt').forEach(function (o) {
          o.disabled = true;
          if (o.hasAttribute('data-right')) o.classList.add('right');
          else if (o.classList.contains('picked')) o.classList.add('wrong');
        });
        var rb = q.querySelector('.reveal-box'); if (rb) rb.classList.add('show');
      });
      this.disabled = true;
      if (after) after();
    });
  }

  /* ================= pattern quiz ================= */
  var OPTS = [['tp', '👉👈 Two pointers'], ['sw', '🪟 Sliding window'], ['cat', '🐛 Caterpillar']];
  var NAME = { tp: 'Two pointers', sw: 'Sliding window (fixed size)', cat: 'Caterpillar (stretchy window)' };
  var LEVELS = [
    { t: 'Level 1 · Warm-up', sub: 'Straight from the lessons.', qs: [
      ['Check whether a phone number reads the same forwards and backwards, like 98766789.', 'tp', 'Fingers at both ends compare and close in: the MALAYALAM check.'],
      ['A weather station logs rainfall every day for a year. Find the 7 consecutive days with the most rain.', 'sw', 'The stretch is always exactly 7 days: a fixed window. Add the newcomer, drop the leaver.'],
      ['In a playlist, find the longest run of back-to-back songs where no song repeats.', 'cat', 'You don\'t know the length; you\'re hunting it. Grow while all songs are unique; the back end catches up when a repeat appears.'],
      ['Given the text of a speech, find which word is used most often.', null, 'No pairs, no stretches, and order doesn\'t even matter. It\'s plain counting with a HashMap (word → count) in one pass.'],
      ['Reverse the order of songs in a playlist without using a second list.', 'tp', 'Swap the two ends, step both fingers in, repeat until they meet: STRESSED → DESSERTS.']
    ] },
    { t: 'Level 2 · In disguise', sub: 'Same patterns, wearing everyday clothes.', qs: [
      ['Train ticket prices are listed from cheapest to costliest. Find two tickets that together cost exactly ₹2,000.', 'tp', 'Sorted + a pair + an exact target = the gift voucher. Too much: right finger in. Too little: left finger in.'],
      ['A CCTV camera counts movement every minute. Find the quietest 10-minute stretch of the night.', 'sw', 'Fixed length of 10. "Quietest" just means you track the smallest total instead of the biggest.'],
      ['Your daily savings are never negative. Find the fewest consecutive days whose savings add up to at least ₹5,000.', 'cat', 'The window\'s length is the answer. Grow until you reach ₹5,000, then pull the back end in to see how short it can get. It works because savings are never negative, so shrinking always lowers the total.'],
      ['A formula like ((a+b)*(c-d)) must have every opening bracket matched by a closing one, in the right order.', null, 'Last opened, first closed: that\'s a stack. Push on "(", pop on ")". The plates from the recursion talk.'],
      ['Two guest lists, each already sorted alphabetically, must be merged into one sorted list.', 'tp', 'One finger on each list. Compare the two names, copy the smaller, move that finger. Two pointers can live on two different rows.'],
      ['In a long DNA string, find every position where 4 consecutive letters are a shuffle of "ACGT".', 'sw', 'A window of exactly 4 slides along, with letter tallies updated as one letter enters and one leaves: the TEA trick.'],
      ['Find whether any product code appears twice anywhere in an unsorted list of 10,000 codes.', null, '"Anywhere" means no window and no useful order. Walk once with a HashSet: if a code is already in the set, it\'s a duplicate. (Compare the raga rule, where "within 2 songs" made it a window.)']
    ] },
    { t: 'Level 3 · Mixed bag', sub: 'Shuffled, trickier, and a few genuine traps.', qs: [
      ['Rearrange an array so all even numbers come before all odd numbers, in place.', 'tp', 'Left finger hunts for an odd number, right finger hunts for an even one, swap, close in. (A slow & fast pair works too: it\'s move-zeros in disguise.)'],
      ['A playlist mixes ragas. Find the longest back-to-back stretch that uses at most 2 different ragas.', 'cat', 'Grow the window; when a third raga sneaks in, shrink from the back until only two remain.'],
      ['Count every product under "Electronics", where categories hold subcategories nested to any depth.', null, 'That\'s a tree, not a row. Recursion: my total = my own products + what each child reports.'],
      ['A heart-rate monitor gives a reading every second. Show the average of every 5 consecutive readings as it moves along.', 'sw', 'A moving average is a fixed window of 5. Add the new reading, drop the oldest, divide by 5.'],
      ['Remove duplicates from a sorted list in place, keeping one copy of each.', 'tp', 'Slow finger marks the end of the clean part, fast finger scouts. A new value found? Copy it to slow\'s spot. Same shape as move-zeros.'],
      ['You\'ll be asked 10,000 different questions like "total visitors between day a and day b", each with different days.', null, 'Different ranges every time, thousands of times. Precompute running totals once (prefix sums), then each answer is one subtraction. That\'s the next chapter.'],
      ['A sorted list contains negatives, like −7, −3, 2, 5. Return all the squares, also sorted.', 'tp', 'The biggest squares sit at the two ends (big negatives and big positives). Fingers at both ends, take the larger square, fill the answer from the back.'],
      ['Daily profits include loss days (negative numbers). Find the consecutive stretch with the largest total profit.', null, 'Looks like a caterpillar, but negatives break it: shrinking doesn\'t reliably lower the total, and growing doesn\'t reliably raise it, so the back end never knows when to move. This is Kadane\'s algorithm: keep a running total and restart whenever it drops below zero.'],
      ['Spending is never negative. Count how many stretches of consecutive days stay within budget.', 'cat', 'For each new front, shrink until within budget. Then every stretch ending at the front and starting anywhere from the back end onwards also fits, so add (right − left + 1).']
    ] }
  ];

  function buildQuiz() {
    var host = $('#quiz-host'), n = 0, totals = [];
    LEVELS.forEach(function (L, li) {
      var sec = h('div', 'qlevel');
      sec.appendChild(h('h3', null, esc(L.t)));
      sec.appendChild(h('p', 'sub', esc(L.sub)));
      var cards = [];
      L.qs.forEach(function (q) {
        n++;
        var c = h('div', 'pq');
        c.appendChild(h('div', 'qn', 'PROBLEM ' + n));
        c.appendChild(h('p', 'qt', esc(q[0])));
        var opts = h('div', 'pq-opts');
        OPTS.forEach(function (o) {
          var b = h('button', 'pq-opt', o[1]); b.type = 'button'; b.dataset.k = o[0];
          b.addEventListener('click', function () {
            if (c.dataset.locked) return;
            var was = b.classList.contains('picked');
            opts.querySelectorAll('.pq-opt').forEach(function (x) { x.classList.remove('picked'); });
            if (!was) b.classList.add('picked');
          });
          opts.appendChild(b);
        });
        c.appendChild(opts);
        var v = h('div', 'verdict'); c.appendChild(v);
        sec.appendChild(c);
        cards.push({ el: c, opts: opts, v: v, ans: q[1], why: q[2] });
      });
      var row = h('div', 'lock-row');
      var btn = h('button', 'btn', 'Lock in ' + L.t.split(' · ')[0]); btn.type = 'button';
      var sc = h('span', 'lock-score');
      row.appendChild(btn); row.appendChild(sc); sec.appendChild(row);
      btn.addEventListener('click', function () {
        var ok = 0;
        cards.forEach(function (c) {
          c.el.dataset.locked = '1';
          var pickedEl = c.opts.querySelector('.picked'), pick = pickedEl ? pickedEl.dataset.k : null;
          var right = pick === c.ans; if (right) ok++;
          c.opts.querySelectorAll('.pq-opt').forEach(function (b) {
            b.disabled = true;
            if (b.dataset.k === c.ans) b.classList.add('right');
            else if (b.dataset.k === pick) b.classList.add('wrong');
          });
          var head;
          if (c.ans === null) head = right ? '✓ Right to leave it blank. It fits none of the three.' : '✗ This one fits none of the three; blank was the answer.';
          else head = right ? '✓ ' + NAME[c.ans] + '.' : (pick ? '✗ It\'s ' : '✗ You left it blank, but it fits: ') + NAME[c.ans] + '.';
          c.v.className = 'verdict ' + (right ? 'ok' : 'no');
          c.v.innerHTML = '<b>' + head + '</b>' + esc(c.why);
        });
        sc.textContent = ok + ' / ' + cards.length;
        btn.disabled = true;
        totals[li] = [ok, cards.length];
        if (totals.filter(Boolean).length === LEVELS.length) {
          var got = 0, all = 0; totals.forEach(function (t) { got += t[0]; all += t[1]; });
          var f = $('#final-score');
          f.innerHTML = '<b>' + got + ' / ' + all + '</b>' + (got === all ? 'Flawless. You can see the shape of a problem through its costume.' : got >= all - 3 ? 'Strong. Re-read the ones you missed: the "why" is where the learning lives.' : 'Good start. Run a couple of playgrounds again, then retake it tomorrow (retrieval beats re-reading).');
          f.classList.add('show');
        }
      });
      host.appendChild(sec);
    });
    $('#quiz-reset').addEventListener('click', function () { host.innerHTML = ''; $('#final-score').classList.remove('show'); buildQuiz(); });
  }

  /* ================= why slider ================= */
  function whySlider() {
    var s = $('#why-n');
    function fmtNum(x) { return x >= 1e9 ? (x / 1e9).toFixed(1) + ' billion' : x >= 1e6 ? (x / 1e6).toFixed(1) + ' million' : Math.round(x).toLocaleString('en-IN'); }
    function fmtTime(us) { var s2 = us / 1e6; return s2 < 1 ? 'instant' : s2 < 120 ? Math.round(s2) + ' seconds' : s2 < 7200 ? Math.round(s2 / 60) + ' minutes' : s2 < 172800 ? Math.round(s2 / 3600) + ' hours' : Math.round(s2 / 86400) + ' days'; }
    function upd() {
      var n = Math.round(Math.pow(10, +s.value));
      var pairs = n * (n - 1) / 2;
      $('#why-label').textContent = n.toLocaleString('en-IN') + ' items';
      $('#why-slow').innerHTML = '<b>' + fmtNum(pairs) + '</b><small>checks · ' + fmtTime(pairs) + ' at a million checks/sec</small>';
      $('#why-fast').innerHTML = '<b>' + fmtNum(n) + '</b><small>steps · ' + fmtTime(n) + '</small>';
    }
    s.addEventListener('input', upd); upd();
  }

  /* ================= reading progress ================= */
  function progress() {
    var bar = $('.progress-bar'); if (!bar) return;
    function u() { var d = document.documentElement, m = d.scrollHeight - d.clientHeight; bar.style.width = (m > 0 ? d.scrollTop / m * 100 : 0) + '%'; }
    window.addEventListener('scroll', u, { passive: true }); u();
  }

  /* ================= boot ================= */
  function boot() {
    document.querySelectorAll('[data-pg]').forEach(function (el) {
      var k = el.getAttribute('data-pg');
      if (k === 'fence') return; // built after the reveal
      new Playground(el, EX[k]);
    });
    fenceChallenge();
    mcqGroup('#fence-mcq', '#fence-reveal', function () {
      var host = $('[data-pg="fence"]'); host.parentNode.style.display = 'block';
      new Playground(host, EX.fence);
    });
    buildQuiz();
    whySlider();
    progress();
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { EX: EX, Tracer: Tracer, LEVELS: LEVELS }; }
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
