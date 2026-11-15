/* =====================================================================
   A tiny chessboard renderer. No chess engine inside: every legal move,
   every position and every answer is precomputed (and engine-checked)
   in data.js. The board only draws, animates and listens for taps.
   ===================================================================== */
(function (global) {
  'use strict';
  var FILES = 'abcdefgh';
  var PIECE = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };

  function sqToXY(sq, orient) {
    var f = FILES.indexOf(sq[0]), r = parseInt(sq[1], 10) - 1;
    return orient === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
  }
  function xyToSq(x, y, orient) {
    return orient === 'w' ? FILES[x] + (8 - y) : FILES[7 - x] + (y + 1);
  }
  function parseFen(fen) {
    var rows = fen.split(' ')[0].split('/'), map = {};
    for (var i = 0; i < 8; i++) {
      var f = 0;
      for (var j = 0; j < rows[i].length; j++) {
        var c = rows[i][j];
        if (/\d/.test(c)) { f += +c; continue; }
        map[FILES[f] + (8 - i)] = (c === c.toUpperCase() ? 'w' : 'b') + PIECE[c.toLowerCase()];
        f++;
      }
    }
    return map;
  }

  function Board(el, opts) {
    opts = opts || {};
    this.el = el;
    this.orient = opts.orientation || 'w';
    this.onMove = opts.onMove || null;
    this.base = opts.pieceBase || 'pieces/';
    this.interactive = false;
    this.legal = [];
    this.sel = null;
    this.map = {};
    this.last = null;
    this.marks = [];
    this.arrows = [];
    this.build();
  }

  Board.prototype.build = function () {
    var el = this.el, self = this;
    el.classList.add('cb');
    el.innerHTML = '';
    this.sqLayer = document.createElement('div'); this.sqLayer.className = 'cb-squares';
    this.pcLayer = document.createElement('div'); this.pcLayer.className = 'cb-pieces';
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', '0 0 8 8'); this.svg.setAttribute('class', 'cb-arrows');
    this.promo = document.createElement('div'); this.promo.className = 'cb-promo';
    el.appendChild(this.sqLayer); el.appendChild(this.pcLayer); el.appendChild(this.svg); el.appendChild(this.promo);
    this.squares = {};
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
      var d = document.createElement('div');
      d.className = 'cb-sq ' + (((x + y) % 2) ? 'dk' : 'lt');
      d.style.left = (x * 12.5) + '%'; d.style.top = (y * 12.5) + '%';
      this.sqLayer.appendChild(d);
      d._xy = [x, y];
    }
    this.paintCoords();
    el.addEventListener('click', function (e) { self.handleClick(e); });
  };

  Board.prototype.paintCoords = function () {
    var cells = this.sqLayer.children;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i], x = c._xy[0], y = c._xy[1], sq = xyToSq(x, y, this.orient), h = '';
      if (y === 7) h += '<span class="cf">' + sq[0] + '</span>';
      if (x === 0) h += '<span class="cr">' + sq[1] + '</span>';
      c.innerHTML = h;
      c.dataset.sq = sq;
      this.squares[sq] = c;
    }
  };

  Board.prototype.setOrientation = function (o) {
    if (o === this.orient) return;
    this.orient = o; this.paintCoords(); this.render();
  };

  Board.prototype.setFen = function (fen, last) {
    this.map = parseFen(fen);
    this.last = last || null;
    this.sel = null;
    this.render();
  };

  Board.prototype.render = function () {
    var self = this;
    this.pcLayer.innerHTML = '';
    Object.keys(this.squares).forEach(function (sq) {
      var c = self.squares[sq];
      c.classList.remove('last', 'sel', 'mark', 'dot', 'cap', 'good', 'bad', 'hint');
    });
    if (this.last) { this.last.forEach(function (s) { if (self.squares[s]) self.squares[s].classList.add('last'); }); }
    this.marks.forEach(function (m) {
      var s = m.sq || m, cls = m.cls || 'mark';
      if (self.squares[s]) self.squares[s].classList.add(cls);
    });
    Object.keys(this.map).forEach(function (sq) {
      var p = self.map[sq], xy = sqToXY(sq, self.orient), img = document.createElement('img');
      img.src = self.base + p + '.svg'; img.alt = p; img.draggable = false;
      img.className = 'cb-pc'; img.dataset.sq = sq;
      img.style.left = (xy.x * 12.5) + '%'; img.style.top = (xy.y * 12.5) + '%';
      self.pcLayer.appendChild(img);
    });
    if (this.sel) {
      this.squares[this.sel].classList.add('sel');
      this.legal.forEach(function (u) {
        if (u.slice(0, 2) === self.sel) {
          var t = u.slice(2, 4);
          self.squares[t].classList.add(self.map[t] ? 'cap' : 'dot');
        }
      });
    }
    this.drawArrows();
  };

  Board.prototype.setMarks = function (marks) { this.marks = marks || []; this.render(); };
  Board.prototype.setArrows = function (arrows) { this.arrows = arrows || []; this.drawArrows(); };

  Board.prototype.drawArrows = function () {
    var svg = this.svg, self = this;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var ns = 'http://www.w3.org/2000/svg';
    var defs = document.createElementNS(ns, 'defs');
    ['a', 'b', 'c'].forEach(function (k) {
      var mk = document.createElementNS(ns, 'marker');
      mk.setAttribute('id', 'ah-' + k + '-' + self.uid()); mk.setAttribute('markerWidth', '4'); mk.setAttribute('markerHeight', '4');
      mk.setAttribute('refX', '2.05'); mk.setAttribute('refY', '2'); mk.setAttribute('orient', 'auto');
      var p = document.createElementNS(ns, 'path'); p.setAttribute('d', 'M0,0 L4,2 L0,4 z'); p.setAttribute('class', 'ah ah-' + k);
      mk.appendChild(p); defs.appendChild(mk);
    });
    svg.appendChild(defs);
    (this.arrows || []).forEach(function (a) {
      var u = a.u || a, kind = a.k || 'a';
      var f = sqToXY(u.slice(0, 2), self.orient), t = sqToXY(u.slice(2, 4), self.orient);
      var x1 = f.x + .5, y1 = f.y + .5, x2 = t.x + .5, y2 = t.y + .5;
      var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
      x2 -= dx / len * .32; y2 -= dy / len * .32;
      var ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      ln.setAttribute('class', 'arr arr-' + kind);
      ln.setAttribute('marker-end', 'url(#ah-' + kind + '-' + self.uid() + ')');
      svg.appendChild(ln);
    });
  };
  Board.prototype.uid = function () { if (!this._uid) this._uid = 'b' + Math.random().toString(36).slice(2, 8); return this._uid; };

  /* animate a move, then show the resulting position */
  Board.prototype.play = function (uci, fenAfter, done) {
    var self = this, from = uci.slice(0, 2), to = uci.slice(2, 4);
    var img = this.pcLayer.querySelector('img[data-sq="' + from + '"]');
    this.sel = null;
    if (!img) { this.setFen(fenAfter, [from, to]); if (done) done(); return; }
    var victim = this.pcLayer.querySelector('img[data-sq="' + to + '"]');
    var xy = sqToXY(to, this.orient);
    img.style.zIndex = 5;
    img.classList.add('moving');
    requestAnimationFrame(function () {
      img.style.left = (xy.x * 12.5) + '%'; img.style.top = (xy.y * 12.5) + '%';
      if (victim) victim.classList.add('captured');
    });
    setTimeout(function () { self.setFen(fenAfter, [from, to]); if (done) done(); }, 290);
  };

  /* --------------- interaction --------------- */
  Board.prototype.enable = function (legal) { this.interactive = true; this.legal = legal || []; this.sel = null; this.el.classList.add('live'); this.render(); };
  Board.prototype.disable = function () { this.interactive = false; this.sel = null; this.el.classList.remove('live'); this.hidePromo(); this.render(); };

  Board.prototype.handleClick = function (e) {
    if (!this.interactive) return;
    if (this.promo.classList.contains('open')) return;
    var r = this.el.getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) / r.width * 8), y = Math.floor((e.clientY - r.top) / r.height * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return;
    var sq = xyToSq(x, y, this.orient), self = this;
    if (this.sel) {
      var cands = this.legal.filter(function (u) { return u.slice(0, 2) === self.sel && u.slice(2, 4) === sq; });
      if (cands.length === 1) { var u = cands[0]; this.sel = null; this.render(); this.onMove && this.onMove(u); return; }
      if (cands.length > 1) { this.askPromo(cands); return; }
    }
    var hasMoves = this.legal.some(function (u) { return u.slice(0, 2) === sq; });
    this.sel = hasMoves && this.sel !== sq ? sq : null;
    this.render();
  };

  Board.prototype.askPromo = function (cands) {
    var self = this, side = this.map[this.sel] ? this.map[this.sel][0] : 'w';
    this.promo.innerHTML = '<div class="cb-promo-in"><small>Promote to</small><div class="opts"></div></div>';
    var box = this.promo.querySelector('.opts');
    ['q', 'r', 'b', 'n'].forEach(function (p) {
      var u = cands.filter(function (c) { return c[4] === p; })[0];
      if (!u) return;
      var b = document.createElement('button'); b.type = 'button';
      b.innerHTML = '<img src="' + self.base + side + p.toUpperCase() + '.svg" alt="' + p + '">';
      b.addEventListener('click', function (ev) { ev.stopPropagation(); self.hidePromo(); self.sel = null; self.render(); self.onMove && self.onMove(u); });
      box.appendChild(b);
    });
    this.promo.classList.add('open');
  };
  Board.prototype.hidePromo = function () { this.promo.classList.remove('open'); this.promo.innerHTML = ''; };

  global.MiniBoard = Board;
})(window);
