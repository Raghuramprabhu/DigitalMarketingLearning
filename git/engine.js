/* =====================================================================
   MiniGit — a tiny, honest Git engine that runs in your browser.
   Every blob, tree and commit is hashed EXACTLY the way real Git does it
   ("<type> <size>\0<body>" → SHA-1), so the ids you see are real.
   ===================================================================== */
(function (root) {
  'use strict';

  // ---------- SHA-1 (synchronous, from scratch) ----------
  function sha1(bytes) {
    const ml = bytes.length;
    const total = Math.ceil((ml + 9) / 64) * 64;
    const buf = new Uint8Array(total);
    buf.set(bytes); buf[ml] = 0x80;
    const dv = new DataView(buf.buffer);
    const bitLen = ml * 8;
    dv.setUint32(total - 4, bitLen >>> 0);
    dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
    let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    const w = new Uint32Array(80);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 80; i++) { const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]; w[i] = (x << 1) | (x >>> 31); }
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let i = 0; i < 80; i++) {
        let f, k;
        if (i < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
        else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else { f = b ^ c ^ d; k = 0xCA62C1D6; }
        const t = ((((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0);
        e = d; d = c; c = ((b << 30) | (b >>> 2)) >>> 0; b = a; a = t;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    return [h0, h1, h2, h3, h4].map(x => x.toString(16).padStart(8, '0')).join('');
  }
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  function concat(arrs) {
    let n = 0; arrs.forEach(a => n += a.length);
    const out = new Uint8Array(n); let o = 0;
    arrs.forEach(a => { out.set(a, o); o += a.length; });
    return out;
  }
  function hexToBytes(h) { const b = new Uint8Array(h.length / 2); for (let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return b; }
  function hashRaw(type, body) {
    const head = enc.encode(type + ' ' + body.length + '\0');
    return sha1(concat([head, body]));
  }
  const blobCache = new Map();
  function blobHash(content) {
    if (blobCache.has(content)) return blobCache.get(content);
    const h = hashRaw('blob', enc.encode(content));
    blobCache.set(content, h); return h;
  }
  function treeBody(map) {
    const names = Object.keys(map).sort();
    return concat(names.flatMap(n => [enc.encode('100644 ' + n + '\0'), hexToBytes(map[n])]));
  }
  function fmtDate(ts) {
    const d = new Date((ts + 19800) * 1000); // +0530
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const p = n => String(n).padStart(2, '0');
    return `${days[d.getUTCDay()]} ${mons[d.getUTCMonth()]} ${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${d.getUTCFullYear()} +0530`;
  }
  function short(h) { return h ? h.slice(0, 7) : '0000000'; }

  // ---------- tokenizer ----------
  function splitChain(line) {
    const parts = []; let cur = '', q = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === q) q = null; cur += ch; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === '&' && line[i + 1] === '&') { parts.push(cur); cur = ''; i++; continue; }
      cur += ch;
    }
    parts.push(cur);
    return parts.map(s => s.trim()).filter(Boolean);
  }
  function tokenize(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '"' || ch === "'") {
        let j = i + 1, buf = '';
        while (j < s.length && s[j] !== ch) {
          if (s[j] === '\\' && ch === '"' && j + 1 < s.length) { const n = s[j + 1]; buf += n === 'n' ? '\n' : n; j += 2; continue; }
          buf += s[j++];
        }
        t.push(buf); i = j + 1; continue;
      }
      if (ch === '>') { if (s[i + 1] === '>') { t.push({ op: '>>' }); i += 2; } else { t.push({ op: '>' }); i++; } continue; }
      let j = i, buf = '';
      while (j < s.length && !/\s/.test(s[j]) && s[j] !== '>' && s[j] !== '"' && s[j] !== "'") buf += s[j++];
      t.push(buf); i = j;
    }
    return t;
  }

  // ---------- line diff (LCS) ----------
  function lineDiff(a, b) {
    const A = a ? a.replace(/\n$/, '').split('\n') : [];
    const B = b ? b.replace(/\n$/, '').split('\n') : [];
    const n = A.length, m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push([' ', A[i]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) out.push(['-', A[i++]]);
      else out.push(['+', B[j++]]);
    }
    while (i < n) out.push(['-', A[i++]]);
    while (j < m) out.push(['+', B[j++]]);
    return out;
  }

  // =====================================================================
  class Repo {
    constructor(opts) {
      opts = opts || {};
      this.user = { name: opts.name || 'You', email: opts.email || 'you@example.com' };
      this.clock = opts.clock || 1112911993; // 7 April 2005 — git's birthday week
      this.files = {};
      this.server = opts.server || null; // a Repo that `git clone` can copy
      this.wipe();
    }
    wipe() {
      this.inited = false; this.objects = {}; this.index = {}; this.refs = {};
      this.HEAD = 'ref: refs/heads/main'; this.reflog = []; this.order = [];
      this.hidden = new Set(); this.merging = null; this.remotes = {}; this.stashes = [];
      this.upstream = {};
    }
    tick() { this.clock += 37 + Math.floor((this.order.length * 13) % 41); return this.clock; }

    // ----- object store -----
    store(type, body, extra) {
      const h = hashRaw(type, body);
      const isNew = !this.objects[h];
      if (isNew) this.objects[h] = Object.assign({ type, size: body.length }, extra);
      return { hash: h, isNew };
    }
    writeBlob(content) { return this.store('blob', enc.encode(content), { content }); }
    writeTree(map) {
      const names = Object.keys(map).sort();
      return this.store('tree', treeBody(map), { entries: names.map(n => ({ name: n, hash: map[n] })) });
    }
    writeCommit(o) {
      const ts = o.ts || this.tick();
      const author = Object.assign({}, o.author || this.user);
      const ats = o.authorTs || ts;
      let txt = 'tree ' + o.tree + '\n';
      o.parents.forEach(p => txt += 'parent ' + p + '\n');
      txt += `author ${author.name} <${author.email}> ${ats} +0530\n`;
      txt += `committer ${this.user.name} <${this.user.email}> ${ts} +0530\n\n${o.msg}\n`;
      const r = this.store('commit', enc.encode(txt), { tree: o.tree, parents: o.parents.slice(), msg: o.msg, author, ts: ats, cts: ts, text: txt });
      if (r.isNew) this.order.push(r.hash);
      if (o.hidden) this.hidden.add(r.hash);
      return r.hash;
    }
    importObject(h, obj) {
      if (this.objects[h]) return false;
      this.objects[h] = JSON.parse(JSON.stringify(obj));
      if (obj.type === 'commit') this.order.push(h);
      return true;
    }
    raw(h) {
      const o = this.objects[h]; if (!o) return '';
      if (o.type === 'blob') return o.content;
      if (o.type === 'commit' || o.type === 'tag') return o.text;
      return o.entries.map(e => `100644 blob ${e.hash}\t${e.name}`).join('\n') + '\n';
    }
    treeMap(commit) {
      if (!commit) return {};
      const c = this.objects[commit]; if (!c) return {};
      const t = this.objects[c.tree]; const m = {};
      t.entries.forEach(e => m[e.name] = e.hash);
      return m;
    }
    content(h) { return h && this.objects[h] ? this.objects[h].content : undefined; }

    // ----- refs & HEAD -----
    branch() { return this.HEAD.startsWith('ref: ') ? this.HEAD.slice(16) : null; }
    head() { return this.HEAD.startsWith('ref: ') ? (this.refs[this.HEAD.slice(5)] || null) : this.HEAD; }
    headTree() { return this.treeMap(this.head()); }
    moveHead(h, why) {
      if (this.HEAD.startsWith('ref: ')) this.refs[this.HEAD.slice(5)] = h; else this.HEAD = h;
      this.reflog.unshift({ hash: h, msg: why });
    }
    peel(h) { let o = this.objects[h]; while (o && o.type === 'tag') { h = o.object; o = this.objects[h]; } return h; }
    resolve(rev) {
      if (!rev) return null;
      const m = rev.match(/^(.*?)((?:[~^]\d*)*)$/);
      let base = m[1], ops = m[2];
      let h = null;
      const at = base.match(/^(?:HEAD|@)@\{(\d+)\}$/);
      if (base === 'HEAD' || base === '@') h = this.head();
      else if (at) { const e = this.reflog[+at[1]]; h = e ? e.hash : null; }
      else if (this.refs['refs/heads/' + base]) h = this.refs['refs/heads/' + base];
      else if (this.refs['refs/tags/' + base]) h = this.peel(this.refs['refs/tags/' + base]);
      else if (this.refs['refs/remotes/' + base]) h = this.refs['refs/remotes/' + base];
      else if (base === 'stash' && this.stashes[0]) h = this.stashes[0].hash;
      else if (/^[0-9a-f]{4,40}$/.test(base)) {
        const hits = Object.keys(this.objects).filter(k => k.startsWith(base) && this.objects[k].type !== 'blob' && this.objects[k].type !== 'tree');
        if (hits.length === 1) h = this.peel(hits[0]);
      }
      if (!h) return null;
      const re = /([~^])(\d*)/g; let x;
      while ((x = re.exec(ops))) {
        const n = x[2] === '' ? 1 : +x[2];
        if (x[1] === '~') { for (let i = 0; i < n && h; i++) h = (this.objects[h].parents || [])[0] || null; }
        else { h = n === 0 ? h : ((this.objects[h].parents || [])[n - 1] || null); }
        if (!h) return null;
      }
      return h;
    }
    resolveObject(spec) {
      if (spec.includes(':')) {
        const [rev, path] = spec.split(':');
        if (!rev) return this.index[path] || null;
        const c = this.resolve(rev); if (!c) return null;
        if (!path) return this.objects[c].tree;
        return this.treeMap(c)[path] || null;
      }
      const t = spec.match(/^(.*)\^\{tree\}$/);
      if (t) { const c = this.resolve(t[1]); return c ? this.objects[c].tree : null; }
      if (/^[0-9a-f]{4,40}$/.test(spec)) {
        const hits = Object.keys(this.objects).filter(k => k.startsWith(spec));
        if (hits.length === 1) return hits[0];
      }
      if (this.refs['refs/tags/' + spec]) return this.refs['refs/tags/' + spec];
      return this.resolve(spec);
    }
    ancestors(h) {
      const seen = new Set(); const st = h ? [h] : [];
      while (st.length) { const x = st.pop(); if (seen.has(x) || !this.objects[x]) continue; seen.add(x); (this.objects[x].parents || []).forEach(p => st.push(p)); }
      return seen;
    }
    isAncestor(a, b) { return !!a && this.ancestors(b).has(a); }
    mergeBase(a, b) {
      const A = this.ancestors(a);
      const q = [b]; const seen = new Set();
      while (q.length) { const x = q.shift(); if (seen.has(x)) continue; seen.add(x); if (A.has(x)) return x; (this.objects[x].parents || []).forEach(p => q.push(p)); }
      return null;
    }
    reachable() {
      const set = new Set();
      const tips = Object.keys(this.refs).filter(r => !r.startsWith('refs/stash')).map(r => this.peel(this.refs[r]));
      const h = this.head(); if (h) tips.push(h);
      tips.forEach(t => this.ancestors(t).forEach(x => set.add(x)));
      return set;
    }
    decorations() {
      const d = {};
      const add = (h, label, kind) => { if (!h) return; (d[h] = d[h] || []).push({ label, kind }); };
      const br = this.branch();
      Object.keys(this.refs).sort().forEach(r => {
        if (r.startsWith('refs/heads/')) { const n = r.slice(11); add(this.refs[r], br === n ? 'HEAD → ' + n : n, br === n ? 'head' : 'branch'); }
        else if (r.startsWith('refs/tags/')) add(this.peel(this.refs[r]), '🏷 ' + r.slice(10), 'tag');
        else if (r.startsWith('refs/remotes/')) add(this.refs[r], r.slice(13), 'remote');
      });
      if (!br && this.head()) add(this.head(), 'HEAD (detached)', 'head');
      Object.keys(d).forEach(h => d[h].sort((a, b) => (a.kind === 'head' ? -1 : 0) - (b.kind === 'head' ? -1 : 0)));
      return d;
    }

    // ----- working-dir comparisons -----
    isDirty(f, base) {
      const w = this.files[f] !== undefined ? blobHash(this.files[f]) : undefined;
      return this.index[f] !== base[f] || w !== this.index[f];
    }
    status() {
      const head = this.headTree();
      const names = new Set([...Object.keys(head), ...Object.keys(this.index), ...Object.keys(this.files)]);
      const st = { staged: [], unstaged: [], untracked: [], conflicts: [] };
      [...names].sort().forEach(f => {
        if (this.merging && this.merging.conflicts.includes(f)) { st.conflicts.push(f); return; }
        const h = head[f], i = this.index[f], w = this.files[f] !== undefined ? blobHash(this.files[f]) : undefined;
        if (i !== h) st.staged.push([i === undefined ? 'deleted' : h === undefined ? 'new file' : 'modified', f]);
        if (i === undefined && w !== undefined) st.untracked.push(f);
        else if (i !== undefined && w !== i) st.unstaged.push([w === undefined ? 'deleted' : 'modified', f]);
      });
      return st;
    }
    fileState(f) {
      const h = this.headTree()[f], i = this.index[f];
      const w = this.files[f] !== undefined ? blobHash(this.files[f]) : undefined;
      return { w, i, h };
    }
    switchCheck(fromTree, toTree) {
      const bad = [];
      new Set([...Object.keys(fromTree), ...Object.keys(toTree), ...Object.keys(this.files)]).forEach(f => {
        if (fromTree[f] === toTree[f]) return;
        if (fromTree[f] === undefined && this.index[f] === undefined) {
          if (this.files[f] !== undefined && toTree[f] !== undefined && blobHash(this.files[f]) !== toTree[f]) bad.push(f);
          return;
        }
        if (this.isDirty(f, fromTree)) bad.push(f);
      });
      return bad;
    }
    applyTree(fromTree, toTree) {
      const changed = [];
      new Set([...Object.keys(fromTree), ...Object.keys(toTree)]).forEach(f => {
        if (fromTree[f] === toTree[f]) return;
        changed.push(f);
        if (toTree[f] === undefined) { delete this.files[f]; delete this.index[f]; }
        else { this.files[f] = this.content(toTree[f]); this.index[f] = toTree[f]; }
      });
      return changed;
    }
    merge3(base, ours, theirs, labels) {
      const out = {}; const conflicts = []; const notes = []; const markers = {};
      new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)]).forEach(f => {
        const b = base[f], o = ours[f], t = theirs[f];
        if (o === t) { if (o) out[f] = o; return; }
        if (b === o) { if (t) out[f] = t; notes.push(`${f}: only "theirs" changed it → take theirs`); return; }
        if (b === t) { if (o) out[f] = o; notes.push(`${f}: only "ours" changed it → keep ours`); return; }
        conflicts.push(f);
        notes.push(`${f}: BOTH sides changed it differently → conflict`);
        markers[f] = `<<<<<<< ${labels ? labels[0] : 'HEAD'}\n${(this.content(o) || '').replace(/\n$/, '')}\n=======\n${(this.content(t) || '').replace(/\n$/, '')}\n>>>>>>> ${labels ? labels[1] : 'theirs'}\n`;
        if (o) out[f] = o;
      });
      return { tree: out, conflicts, notes, markers };
    }

    // =================================================================
    run(line) {
      const res = { out: [], hood: [], events: [], ok: true };
      const parts = splitChain(line);
      for (const p of parts) {
        const r = this.run1(p);
        res.out.push(...r.out); res.hood.push(...r.hood); res.events.push(...r.events);
        if (!r.ok) { res.ok = false; break; }
      }
      return res;
    }
    run1(line) {
      const R = { out: [], hood: [], events: [], ok: true };
      const o = (t, c) => R.out.push({ t, c: c || '' });
      const hood = t => R.hood.push(t);
      const fail = (t, tip) => { o(t, 'err'); if (tip) hood(tip); R.ok = false; return R; };
      let tk;
      try { tk = tokenize(line); } catch (e) { return fail('parse error'); }
      if (!tk.length) return R;
      const cmd = tk[0];

      // ---- easter eggs ----
      if (cmd === 'sudo') { o('Nice try. Git does not care how powerful you are. 😄', 'warn'); R.events.push({ type: 'egg', id: 'sudo' }); return R; }
      if (cmd === ':q' || cmd === ':wq' || cmd === ':q!') { o('🎉 You escaped Vim. Few ever do.', 'ok'); R.events.push({ type: 'egg', id: 'vim' }); return R; }
      if (cmd === 'fortune') { o(FACTS[Math.floor(Math.random() * FACTS.length)], 'info'); return R; }
      if (cmd === 'clear') { R.events.push({ type: 'clear' }); return R; }
      if (cmd === 'help' || (cmd === 'git' && (tk[1] === 'help' || tk[1] === '--help' || !tk[1]))) { HELP.forEach(l => o(l, l.startsWith(' ') ? '' : 'info')); return R; }
      if (cmd === 'whoami') { o(this.user.name); return R; }
      if (cmd === 'pwd') { o('/home/you/project'); return R; }

      // ---- tiny shell ----
      if (cmd === 'ls') {
        if (tk[1] === '-a' || tk[1] === '-la') { o(['.', '..', this.inited ? '.git' : null, ...Object.keys(this.files).sort()].filter(Boolean).join('  ')); return R; }
        if (tk[1] && tk[1].startsWith('.git')) return this.lsGit(tk[1], R, o);
        const fs = Object.keys(this.files).sort(); o(fs.length ? fs.join('  ') : '(empty folder)', fs.length ? '' : 'dim'); return R;
      }
      if (cmd === 'find' && tk[1] && tk[1].startsWith('.git')) return this.lsGit('.git/objects -type f', R, o);
      if (cmd === 'cat') {
        const f = tk[1]; if (!f) return fail('cat: missing file');
        if (f.startsWith('.git')) return this.catGit(f, R, o, fail);
        if (this.files[f] === undefined) return fail(`cat: ${f}: No such file or directory`);
        this.files[f].replace(/\n$/, '').split('\n').forEach(l => o(l)); return R;
      }
      if (cmd === 'echo') {
        const opi = tk.findIndex(x => typeof x === 'object');
        const words = tk.slice(1, opi < 0 ? undefined : opi).join(' ');
        if (opi < 0) { o(words); return R; }
        const f = tk[opi + 1]; if (!f || typeof f !== 'string') return fail('echo: missing file name');
        if (f.startsWith('.git')) { R.events.push({ type: 'egg', id: 'hackgit' }); return fail('Whoa — editing .git by hand? Legal, but let\'s use git commands here. 😉'); }
        const isNew = this.files[f] === undefined;
        this.files[f] = (tk[opi].op === '>>' ? (this.files[f] || '') : '') + words + '\n';
        hood(`Changed ${f} in your working folder only. Git hasn't noticed anything yet. It only looks when you run a git command.`);
        R.events.push({ type: 'fs', file: f, isNew }); return R;
      }
      if (cmd === 'touch') { const f = tk[1]; if (!f) return fail('touch: missing file'); if (this.files[f] === undefined) this.files[f] = ''; R.events.push({ type: 'fs', file: f }); return R; }
      if (cmd === 'rm') {
        if (tk[1] === '-rf' && (tk[2] === '.git' || tk[2] === '.git/')) {
          const had = this.order.length; this.wipe();
          o('💀 .git is gone.', 'err');
          o(`Your files are still here... but ${had} commits of history just evaporated.`, 'warn');
          hood('The whole of history lives in that one hidden folder. Delete it and your project folder is just ordinary files again. (Run git init to start over.)');
          R.events.push({ type: 'shake' }, { type: 'egg', id: 'rmrf' }); return R;
        }
        const f = tk[tk.length - 1]; if (this.files[f] === undefined) return fail(`rm: cannot remove '${f}': No such file`);
        delete this.files[f]; R.events.push({ type: 'fs', file: f }); return R;
      }
      if (cmd !== 'git') return fail(`${cmd}: command not found (try "help")`);

      const sub = tk[1]; const args = tk.slice(2).filter(x => typeof x === 'string');
      if (sub === 'gud') { o("git: 'gud' is not a git command... but you're getting there. 💪", 'warn'); R.events.push({ type: 'egg', id: 'gud' }); return R; }
      if (sub === 'blame' && !args.length) { o('It was you. It is always you. 🫵', 'warn'); R.events.push({ type: 'egg', id: 'blame' }); return R; }
      if (sub === 'clone') return this.cmdClone(args, R, o, hood, fail);
      if (sub === 'init') return this.cmdInit(R, o, hood);
      if (sub === 'config') {
        if (args[0] === 'user.name' && args[1]) { this.user.name = args[1]; hood('Saved to .git/config. It will be stamped into every commit you make.'); return R; }
        if (args[0] === 'user.email' && args[1]) { this.user.email = args[1]; return R; }
        o(`user.name=${this.user.name}`); o(`user.email=${this.user.email}`); return R;
      }
      if (sub === 'hash-object') {
        const f = args.find(a => !a.startsWith('-'));
        if (f === undefined || this.files[f] === undefined) return fail('fatal: could not open file');
        const h = args.includes('-w') ? this.writeBlob(this.files[f]).hash : blobHash(this.files[f]);
        o(h, 'hash');
        hood(`Git computed SHA-1( "blob ${enc.encode(this.files[f]).length}\\0" + contents of ${f} ). Same content → same id, on every computer on Earth.`);
        R.events.push({ type: 'cmd', name: 'hash-object' }); return R;
      }
      if (!this.inited) return fail('fatal: not a git repository (or any of the parent directories): .git', 'There is no .git folder here yet. Run "git init" to create one.');
      const fn = this['cmd_' + (sub || '').replace(/-/g, '_')];
      if (!fn) return fail(`git: '${sub}' is not a git command. See 'git help'.`);
      const r = fn.call(this, args, R, o, hood, fail, tk.slice(2));
      if (R.ok) R.events.push({ type: 'cmd', name: sub });
      return r || R;
    }

    // ---------- .git peeking ----------
    lsGit(path, R, o) {
      if (!this.inited) { o('ls: cannot access \'.git\': No such file or directory', 'err'); R.ok = false; return R; }
      const p = path.replace(/\/$/, '');
      if (p === '.git') { o('HEAD  config  index  logs/  objects/  refs/'); return R; }
      if (p.startsWith('.git/objects')) {
        const all = Object.keys(this.objects).sort();
        if (path.includes('-type')) { all.forEach(h => o(`.git/objects/${h.slice(0, 2)}/${h.slice(2)}`, 'hash')); if (!all.length) o('(no objects yet)', 'dim'); return R; }
        const dirs = [...new Set(all.map(h => h.slice(0, 2)))];
        o(dirs.length ? dirs.join('  ') + '  info/  pack/' : 'info/  pack/'); return R;
      }
      if (p === '.git/refs') { o('heads/  remotes/  tags/'); return R; }
      if (p === '.git/refs/heads') { o(Object.keys(this.refs).filter(r => r.startsWith('refs/heads/')).map(r => r.slice(11)).join('  ') || '(empty — no commits yet)'); return R; }
      if (p === '.git/refs/tags') { o(Object.keys(this.refs).filter(r => r.startsWith('refs/tags/')).map(r => r.slice(10)).join('  ') || '(empty)'); return R; }
      o('(nothing interesting here)', 'dim'); return R;
    }
    catGit(path, R, o, fail) {
      if (!this.inited) return fail(`cat: ${path}: No such file or directory`);
      if (path === '.git/HEAD') { o(this.HEAD.startsWith('ref:') ? this.HEAD : this.HEAD); R.hood.push(this.HEAD.startsWith('ref:') ? 'HEAD is a pointer to a pointer: it names the current branch, and the branch names a commit.' : 'Detached: HEAD holds a commit hash directly, not a branch name.'); return R; }
      if (path === '.git/config') { ['[core]', '\trepositoryformatversion = 0', '\tbare = false', '[user]', `\tname = ${this.user.name}`, `\temail = ${this.user.email}`].forEach(l => o(l)); Object.keys(this.remotes).forEach(r => { o(`[remote "${r}"]`); o(`\turl = ${this.remotes[r].url}`); }); return R; }
      if (path.startsWith('.git/refs/')) {
        const r = path.slice(5); if (!this.refs[r]) return fail(`cat: ${path}: No such file or directory`);
        o(this.refs[r], 'hash'); R.hood.push(`A branch is literally this: a tiny text file holding one 40-character hash (plus a newline = 41 bytes).`); return R;
      }
      if (path === '.git/index') { o('(binary file) — try "git ls-files -s" to read it', 'dim'); return R; }
      if (path.startsWith('.git/objects/')) {
        const h = path.slice(13).replace('/', '');
        if (!this.objects[h]) return fail(`cat: ${path}: No such file`);
        o('x\x01+)JMU0...(zlib-compressed bytes)', 'dim'); R.hood.push('Objects are zlib-compressed on disk. Use "git cat-file -p ' + short(h) + '" to read one.'); return R;
      }
      return fail(`cat: ${path}: No such file or directory`);
    }

    // ---------- commands ----------
    cmdInit(R, o, hood) {
      if (this.inited) { o('Reinitialized existing Git repository in /home/you/project/.git/'); return R; }
      this.inited = true;
      o('Initialized empty Git repository in /home/you/project/.git/', 'ok');
      hood('Created a hidden .git/ folder: that folder IS the repository.');
      hood('Wrote .git/HEAD containing "ref: refs/heads/main". It points at a branch that does not exist yet (an "unborn" branch).');
      hood('objects/ and refs/ are empty. Zero commits, zero history.');
      R.events.push({ type: 'cmd', name: 'init' });
      return R;
    }
    cmdClone(args, R, o, hood, fail) {
      if (!this.server) return fail('fatal: repository not found (this playground has no server to clone from)');
      if (this.inited) return fail("fatal: destination path 'project' already exists and is not an empty directory.");
      const s = this.server;
      this.inited = true; let n = 0;
      s.order.forEach(h => { });
      Object.keys(s.objects).forEach(h => { if (this.importObject(h, s.objects[h])) n++; });
      this.order = s.order.slice();
      this.remotes.origin = { url: args[0] || s.url || 'https://github.com/team/project.git', repo: s };
      Object.keys(s.refs).forEach(r => { if (r.startsWith('refs/heads/')) this.refs['refs/remotes/origin/' + r.slice(11)] = s.refs[r]; });
      const main = s.refs['refs/heads/main'];
      this.refs['refs/heads/main'] = main; this.HEAD = 'ref: refs/heads/main';
      this.upstream.main = 'origin/main';
      this.reflog.unshift({ hash: main, msg: 'clone: from ' + this.remotes.origin.url });
      this.files = {}; this.index = {};
      this.applyTree({}, this.treeMap(main));
      o("Cloning into 'project'..."); o(`Receiving objects: 100% (${n}/${n}), done.`); o('Resolving deltas: 100%, done.', 'ok');
      hood(`Downloaded ALL ${n} objects: every version of every file, the entire history. Your laptop now holds a complete, standalone copy.`);
      hood('Created origin/main (a bookmark of where the server was) and your own main at the same commit.');
      R.events.push({ type: 'cmd', name: 'clone' });
      return R;
    }
    cmd_status(args, R, o, hood) {
      const b = this.branch();
      o(b ? `On branch ${b}` : `HEAD detached at ${short(this.head())}`);
      if (b && this.upstream[b] && this.refs['refs/remotes/' + this.upstream[b]]) {
        const up = this.refs['refs/remotes/' + this.upstream[b]], me = this.head();
        const A = this.ancestors(me), U = this.ancestors(up);
        const ahead = [...A].filter(x => !U.has(x)).length, behind = [...U].filter(x => !A.has(x)).length;
        if (!ahead && !behind) o(`Your branch is up to date with '${this.upstream[b]}'.`);
        else if (ahead && !behind) o(`Your branch is ahead of '${this.upstream[b]}' by ${ahead} commit${ahead > 1 ? 's' : ''}.`, 'warn');
        else if (behind && !ahead) o(`Your branch is behind '${this.upstream[b]}' by ${behind} commit${behind > 1 ? 's' : ''}.`, 'warn');
        else o(`Your branch and '${this.upstream[b]}' have diverged (${ahead} vs ${behind} different commits).`, 'warn');
      }
      if (!this.head()) o('\nNo commits yet');
      const s = this.status();
      if (s.conflicts.length) { o('You have unmerged paths.', 'warn'); o('  (fix conflicts and run "git commit")', 'dim'); s.conflicts.forEach(f => o('\tboth modified:   ' + f, 'err')); }
      if (s.staged.length) { o('Changes to be committed:'); s.staged.forEach(([k, f]) => o(`\t${(k + ':').padEnd(12)} ${f}`, 'ok')); }
      if (s.unstaged.length) { o('Changes not staged for commit:'); s.unstaged.forEach(([k, f]) => o(`\t${(k + ':').padEnd(12)} ${f}`, 'err')); }
      if (s.untracked.length) { o('Untracked files:'); s.untracked.forEach(f => o('\t' + f, 'err')); }
      if (!s.staged.length && !s.unstaged.length && !s.untracked.length && !s.conflicts.length) o('nothing to commit, working tree clean', 'ok');
      hood('Status compares three snapshots by hash: HEAD (last commit) ↔ index (staging) ↔ your working files. Equal hashes = no change. That is why it is instant.');
    }
    cmd_add(args, R, o, hood, fail) {
      if (!args.length) return fail('Nothing specified, nothing added. (try: git add <file> or git add .)');
      let targets = [];
      const all = args.includes('.') || args.includes('-A') || args.includes('--all');
      if (all) targets = [...new Set([...Object.keys(this.files), ...Object.keys(this.index)])];
      else targets = args;
      let did = 0;
      for (const f of targets.sort()) {
        if (this.files[f] === undefined) {
          if (this.index[f] !== undefined) { delete this.index[f]; hood(`Staged the deletion of ${f} (removed its line from the index).`); did++; continue; }
          return fail(`fatal: pathspec '${f}' did not match any files`);
        }
        const before = this.index[f];
        const r = this.writeBlob(this.files[f]);
        if (before === r.hash && !(this.merging && this.merging.conflicts.includes(f))) continue;
        this.index[f] = r.hash; did++;
        if (this.merging) this.merging.conflicts = this.merging.conflicts.filter(x => x !== f);
        hood(r.isNew
          ? `${f} → hashed to blob ${short(r.hash)}. Compressed and written to .git/objects/${r.hash.slice(0, 2)}/${r.hash.slice(2, 8)}… (yes: the object is saved NOW, before any commit).`
          : `${f} → blob ${short(r.hash)} already exists in the store. Same content, same hash, so Git stores nothing new. Free deduplication.`);
        hood(`Index updated: "${f}" now points to ${short(r.hash)}.`);
        R.events.push({ type: 'obj', hash: r.hash });
      }
      if (!did) hood('Nothing changed: the index already matched your files.');
    }
    cmd_rm(args, R, o, hood, fail) {
      const f = args.find(a => !a.startsWith('-'));
      if (!f || this.index[f] === undefined) return fail(`fatal: pathspec '${f}' did not match any files`);
      delete this.index[f]; if (!args.includes('--cached')) delete this.files[f];
      o(`rm '${f}'`); hood(`Removed ${f} from the index, so the next commit's tree won't list it. Old commits still have it, forever.`);
    }
    cmd_commit(args, R, o, hood, fail, raw) {
      const mi = raw.findIndex(x => x === '-m' || x === '-am' || x === '-ma');
      if (raw.includes('-a') || raw.includes('-am') || raw.includes('-ma')) {
        Object.keys(this.index).forEach(f => { if (this.files[f] === undefined) delete this.index[f]; else this.index[f] = this.writeBlob(this.files[f]).hash; });
        hood('-a: auto-staged every tracked file that changed (new untracked files are NOT included).');
      }
      const amend = raw.includes('--amend');
      let msg = mi >= 0 ? raw[mi + 1] : null;
      const head = this.head();
      if (amend && !head) return fail('fatal: You have nothing to amend.');
      if (!msg && amend) msg = this.objects[head].msg;
      if (!msg && this.merging) msg = this.merging.msg;
      if (!msg) { R.events.push({ type: 'egg', id: 'vimtrap' }); return fail('Real Git would now open a text editor (often Vim 😱). Here, add a message: git commit -m "your message"', 'Tip: if you ever get stuck in Vim, type :q and press Enter. Try it here too.'); }
      if (this.merging && this.merging.conflicts.length) return fail('error: Committing is not possible because you have unmerged files.', 'Edit the conflicted file, then git add it to mark it resolved.');
      const tree = this.writeTree(this.index);
      const parents = amend ? (this.objects[head].parents || []) : head ? [head] : [];
      if (this.merging) parents.push(this.merging.head);
      const headTreeHash = head ? this.objects[head].tree : null;
      if (!amend && !this.merging && tree.hash === headTreeHash && !raw.includes('--allow-empty')) {
        const s = this.status();
        o(`On branch ${this.branch() || 'HEAD'}`);
        if (s.unstaged.length || s.untracked.length) return fail('no changes added to commit (use "git add")', 'The index (staging area) is identical to the last commit, so there is nothing new to snapshot. git add first.');
        return fail('nothing to commit, working tree clean');
      }
      if (!head && !Object.keys(this.index).length) return fail('nothing to commit (create/copy files and use "git add" to track)');
      const h = this.writeCommit({ tree: tree.hash, parents, msg });
      const kind = amend ? ' (amend)' : !head ? ' (initial)' : this.merging ? ' (merge)' : '';
      const b = this.branch();
      this.moveHead(h, `commit${kind}: ${msg.split('\n')[0]}`);
      const wasMerge = !!this.merging; this.merging = null;
      const prevTree = amend ? this.treeMap((this.objects[head].parents || [])[0]) : this.treeMap(head);
      const nChanged = new Set([...Object.keys(prevTree), ...Object.keys(this.index)].filter(f => prevTree[f] !== this.index[f])).size;
      o(`[${b || 'detached HEAD'}${!head ? ' (root-commit)' : ''} ${short(h)}] ${msg.split('\n')[0]}`, 'ok');
      o(` ${nChanged} file${nChanged === 1 ? '' : 's'} changed`, 'dim');
      hood(`Wrote tree ${short(tree.hash)}: a list of (name → blob hash) built straight from the index${tree.isNew ? '' : ' (identical tree already existed!)'}.`);
      hood(`Wrote commit ${short(h)} = tree + ${parents.length ? parents.length + ' parent' + (parents.length > 1 ? 's' : '') : 'no parent (the very first)'} + author + time + message.`);
      hood(b ? `Moved the "${b}" sticky note: it now holds ${short(h)}. (Overwrote a 41-byte file. That is all a commit "on a branch" means.)` : 'HEAD is detached, so only HEAD itself moved. No branch remembers this commit!');
      if (amend) hood(`--amend didn't edit ${short(head)}; commits are immutable. It made a NEW commit and moved the branch. The old one is now an unreachable ghost.`);
      R.events.push({ type: 'commit', hash: h }); if (wasMerge) R.events.push({ type: 'merged' });
    }
    cmd_log(args, R, o, hood) {
      const one = args.includes('--oneline');
      const nIdx = args.findIndex(a => /^-n$|^-\d+$/.test(a));
      let limit = Infinity; if (nIdx >= 0) limit = args[nIdx] === '-n' ? +args[nIdx + 1] : +args[nIdx].slice(1);
      const tips = args.includes('--all') ? Object.values(this.refs).map(h => this.peel(h)) : [];
      const rev = args.find(a => !a.startsWith('-') && this.resolve(a));
      tips.push(rev ? this.resolve(rev) : this.head());
      if (!tips.filter(Boolean).length) { R.ok = false; o(`fatal: your current branch '${this.branch()}' does not have any commits yet`, 'err'); return; }
      const set = new Set(); tips.filter(Boolean).forEach(t => this.ancestors(t).forEach(x => set.add(x)));
      const list = this.order.filter(h => set.has(h)).reverse().slice(0, limit);
      const deco = this.decorations();
      list.forEach(h => {
        const c = this.objects[h]; const d = deco[h] ? ' (' + deco[h].map(x => x.label.replace('🏷 ', 'tag: ').replace('→', '->')).join(', ') + ')' : '';
        if (one) { o(`${short(h)}${d} ${c.msg.split('\n')[0]}`, 'hash'); return; }
        o(`commit ${h}${d}`, 'hash');
        if (c.parents.length > 1) o(`Merge: ${c.parents.map(short).join(' ')}`);
        o(`Author: ${c.author.name} <${c.author.email}>`); o(`Date:   ${fmtDate(c.ts)}`); o('');
        c.msg.split('\n').forEach(l => o('    ' + l)); o('');
      });
      hood('Log starts at HEAD and walks backwards through the parent pointers inside each commit. History is a chain you can only follow backwards, like footprints.');
    }
    cmd_branch(args, R, o, hood, fail) {
      const del = args.find(a => a === '-d' || a === '-D');
      const names = args.filter(a => !a.startsWith('-'));
      if (del) {
        const n = names[0]; if (!this.refs['refs/heads/' + n]) return fail(`error: branch '${n}' not found.`);
        if (this.branch() === n) return fail(`error: Cannot delete branch '${n}' checked out.`);
        if (del === '-d' && !this.isAncestor(this.refs['refs/heads/' + n], this.head())) return fail(`error: The branch '${n}' is not fully merged.`, 'Its commits are not part of your current branch. Use -D to force (they would become unreachable).');
        const h = this.refs['refs/heads/' + n]; delete this.refs['refs/heads/' + n];
        o(`Deleted branch ${n} (was ${short(h)}).`); hood(`Deleted the 41-byte file refs/heads/${n}. The commits themselves are untouched.`); return;
      }
      if (!names.length) {
        const bs = Object.keys(this.refs).filter(r => r.startsWith('refs/heads/')).map(r => r.slice(11)).sort();
        if (!bs.length) o('(no branches yet: make a first commit)', 'dim');
        bs.forEach(b => o((b === this.branch() ? '* ' : '  ') + b, b === this.branch() ? 'ok' : ''));
        if (args.includes('-a') || args.includes('-r')) Object.keys(this.refs).filter(r => r.startsWith('refs/remotes/')).forEach(r => o('  remotes/' + r.slice(13), 'err'));
        return;
      }
      const n = names[0];
      if (this.refs['refs/heads/' + n]) return fail(`fatal: A branch named '${n}' already exists.`);
      const at = this.resolve(names[1] || 'HEAD'); if (!at) return fail('fatal: Not a valid object name: \'' + (names[1] || 'HEAD') + '\'.', 'You need at least one commit before you can branch.');
      this.refs['refs/heads/' + n] = at;
      hood(`Created .git/refs/heads/${n} containing ${short(at)}. That is the ENTIRE cost of a branch: one 41-byte file. No files copied.`);
      hood(`Note: you are still on "${this.branch() || 'detached HEAD'}". Creating a branch doesn't move you onto it.`);
      R.events.push({ type: 'branch', name: n });
    }
    goTo(target, branchName, R, o, hood, fail, why) {
      const from = this.headTree(), to = this.treeMap(target);
      const bad = this.switchCheck(from, to);
      if (bad.length) { fail('error: Your local changes to the following files would be overwritten by checkout:'); bad.forEach(f => o('\t' + f, 'err')); o('Please commit your changes or stash them before you switch branches.', 'err'); hood('Git refuses to silently destroy uncommitted work. Commit or stash first.'); return false; }
      const prevB = this.branch() || short(this.head());
      const changed = this.applyTree(from, to);
      if (branchName) this.HEAD = 'ref: refs/heads/' + branchName; else this.HEAD = target;
      if (target) this.reflog.unshift({ hash: target, msg: why || `checkout: moving from ${prevB} to ${branchName || short(target)}` });
      hood(branchName ? `Rewrote .git/HEAD → "ref: refs/heads/${branchName}".` : `Rewrote .git/HEAD → ${short(target)} (a raw hash: "detached HEAD").`);
      hood(changed.length ? `Rewrote ${changed.length} file${changed.length > 1 ? 's' : ''} in your folder to match that snapshot: ${changed.join(', ')}. Unchanged files weren't touched (same hash = skip).` : 'Both snapshots are identical, so no files had to change.');
      return true;
    }
    cmd_checkout(args, R, o, hood, fail) {
      if (args[0] === '-b' || args[0] === '-B') {
        const n = args[1]; if (!n) return fail('fatal: missing branch name');
        if (this.refs['refs/heads/' + n] && args[0] === '-b') return fail(`fatal: A branch named '${n}' already exists.`);
        const at = args[2] ? this.resolve(args[2]) : this.head();
        if (!at) { this.HEAD = 'ref: refs/heads/' + n; o(`Switched to a new branch '${n}'`, 'ok'); return; }
        this.refs['refs/heads/' + n] = this.head();
        if (!this.goTo(at, n, R, o, hood, fail)) { delete this.refs['refs/heads/' + n]; return; }
        this.refs['refs/heads/' + n] = at;
        o(`Switched to a new branch '${n}'`, 'ok'); hood(`Two steps in one: created refs/heads/${n}, then pointed HEAD at it.`); R.events.push({ type: 'branch', name: n }); return;
      }
      const dd = args.indexOf('--');
      if (dd >= 0 || (args[0] && this.index[args[0]] !== undefined && !this.refs['refs/heads/' + args[0]])) {
        const f = dd >= 0 ? args[dd + 1] : args[0];
        if (this.index[f] === undefined) return fail(`error: pathspec '${f}' did not match any file(s) known to git`);
        this.files[f] = this.content(this.index[f]); o(`Updated 1 path from the index`, 'ok');
        hood(`Copied blob ${short(this.index[f])} from the index back over ${f}. Your unsaved edits to it are gone (they were never in Git).`); return;
      }
      const n = args[0]; if (!n) return fail('fatal: you must specify a branch');
      if (this.refs['refs/heads/' + n]) {
        if (this.branch() === n) { o(`Already on '${n}'`); return; }
        if (this.goTo(this.refs['refs/heads/' + n], n, R, o, hood, fail)) o(`Switched to branch '${n}'`, 'ok'); return;
      }
      if (this.refs['refs/remotes/origin/' + n]) {
        const at = this.refs['refs/remotes/origin/' + n];
        if (this.goTo(at, n, R, o, hood, fail)) { this.refs['refs/heads/' + n] = at; this.upstream[n] = 'origin/' + n; o(`branch '${n}' set up to track 'origin/${n}'.`); o(`Switched to a new branch '${n}'`, 'ok'); } return;
      }
      const at = this.resolve(n); if (!at) return fail(`error: pathspec '${n}' did not match any file(s) known to git`);
      if (this.goTo(at, null, R, o, hood, fail)) {
        o(`Note: switching to '${n}'.`, 'warn');
        o("You are in 'detached HEAD' state. You can look around and experiment;", 'warn');
        o('commits made here belong to no branch. Create one with git switch -c <name>.', 'warn');
        o(`HEAD is now at ${short(at)} ${this.objects[at].msg.split('\n')[0]}`);
        R.events.push({ type: 'detached' });
      }
    }
    cmd_switch(args, R, o, hood, fail) {
      if (args[0] === '-c' || args[0] === '-C') return this.cmd_checkout(['-b', ...args.slice(1)], R, o, hood, fail);
      if (args[0] === '--detach') return this.cmd_checkout([args[1]], R, o, hood, fail);
      if (args[0] && !this.refs['refs/heads/' + args[0]] && !this.refs['refs/remotes/origin/' + args[0]]) return fail(`fatal: invalid reference: ${args[0]}`, 'switch only moves between branches. To visit an old commit use: git switch --detach <hash>');
      return this.cmd_checkout(args, R, o, hood, fail);
    }
    cmd_restore(args, R, o, hood, fail) {
      const staged = args.includes('--staged'); const f = args.find(a => !a.startsWith('-'));
      if (!f) return fail('fatal: you must specify path(s) to restore');
      if (staged) { const h = this.headTree()[f]; if (h) this.index[f] = h; else delete this.index[f]; hood(`Unstaged ${f}: the index entry now matches HEAD again. Your working file is untouched.`); return; }
      if (this.index[f] === undefined) return fail(`error: pathspec '${f}' did not match any file(s) known to git`);
      this.files[f] = this.content(this.index[f]); hood(`Overwrote ${f} with the version in the index. Unstaged edits are gone for good.`);
    }
    cmd_merge(args, R, o, hood, fail) {
      if (args[0] === '--abort') {
        if (!this.merging) return fail('fatal: There is no merge to abort (MERGE_HEAD missing).');
        const t = this.headTree(); this.index = Object.assign({}, t); this.files = {}; Object.keys(t).forEach(f => this.files[f] = this.content(t[f]));
        this.merging = null; o('Merge aborted.', 'ok'); hood('Threw away the half-finished merge and restored files from HEAD.'); return;
      }
      const name = args.find(a => !a.startsWith('-')); if (!name) return fail('fatal: No remote for the current branch.');
      const theirs = this.resolve(name); if (!theirs) return fail(`merge: ${name} - not something we can merge`);
      const ours = this.head(); if (!ours) return fail('fatal: no commits yet on this branch');
      if (this.merging) return fail('error: You have not concluded your merge (MERGE_HEAD exists).');
      const st = this.status(); if (st.staged.length || st.unstaged.length) return fail('error: Your local changes would be overwritten by merge. Commit or stash them first.');
      if (this.isAncestor(theirs, ours)) { o('Already up to date.'); hood(`Every commit in ${name} is already inside your history. Nothing to do.`); return; }
      if (this.isAncestor(ours, theirs) && !args.includes('--no-ff')) {
        const from = this.headTree(); this.applyTree(from, this.treeMap(theirs));
        this.moveHead(theirs, `merge ${name}: Fast-forward`);
        o(`Updating ${short(ours)}..${short(theirs)}`); o('Fast-forward', 'ok');
        hood(`Your branch was a direct ancestor of ${name}: no divergence. So Git just slid the "${this.branch()}" sticky note forward to ${short(theirs)}.`);
        hood('No new commit was created. This is a "fast-forward": the cheapest merge there is.');
        R.events.push({ type: 'ff' }); return;
      }
      const base = this.mergeBase(ours, theirs);
      const m = this.merge3(this.treeMap(base), this.headTree(), this.treeMap(theirs), ['HEAD', name]);
      hood(`Found the merge base (latest common ancestor): ${short(base)}.`);
      hood('Three-way merge: for each file, compare base ↔ ours ↔ theirs. Whoever changed it from base wins. If both did, that is a conflict.');
      m.notes.forEach(n => hood('• ' + n));
      const from = this.headTree();
      Object.keys(m.tree).forEach(f => { if (from[f] !== m.tree[f]) { this.files[f] = this.content(m.tree[f]); this.index[f] = m.tree[f]; } });
      Object.keys(from).forEach(f => { if (!m.tree[f]) { delete this.files[f]; delete this.index[f]; } });
      const msg = (name.includes('/') ? `Merge remote-tracking branch '${name}'` : `Merge branch '${name}'`) + (this.branch() && this.branch() !== 'main' ? ` into ${this.branch()}` : '');
      if (m.conflicts.length) {
        m.conflicts.forEach(f => { this.files[f] = m.markers[f]; o(`Auto-merging ${f}`); o(`CONFLICT (content): Merge conflict in ${f}`, 'err'); });
        o('Automatic merge failed; fix conflicts and then commit the result.', 'err');
        this.merging = { head: theirs, msg, conflicts: m.conflicts.slice() };
        hood('Git wrote both versions into the file between <<<<<<< ======= >>>>>>> markers and saved MERGE_HEAD. Edit the file, git add it, then git commit.');
        hood('(Real Git merges line by line, so it only conflicts when the SAME lines changed. This playground compares whole files.)');
        R.events.push({ type: 'conflict' }); return;
      }
      const tree = this.writeTree(this.index);
      const h = this.writeCommit({ tree: tree.hash, parents: [ours, theirs], msg });
      this.moveHead(h, `merge ${name}: Merge made by the 'ort' strategy.`);
      o("Merge made by the 'ort' strategy.", 'ok');
      hood(`Wrote merge commit ${short(h)} with TWO parents (${short(ours)} and ${short(theirs)}). That double link is what a merge IS.`);
      R.events.push({ type: 'merged' });
    }
    replay(list, onto, R, hood) {
      let cur = onto; const map = [];
      for (const c of list) {
        const co = this.objects[c];
        const m = this.merge3(this.treeMap(co.parents[0]), this.treeMap(cur), this.treeMap(c));
        if (m.conflicts.length) return { conflict: m.conflicts, commit: c };
        const t = this.writeTree(m.tree).hash;
        const n = this.writeCommit({ tree: t, parents: [cur], msg: co.msg, author: co.author, authorTs: co.ts });
        map.push([c, n]); cur = n;
      }
      return { tip: cur, map };
    }
    cmd_rebase(args, R, o, hood, fail) {
      const name = args.find(a => !a.startsWith('-')); if (!name) return fail('fatal: no upstream configured. Usage: git rebase <branch>');
      const up = this.resolve(name); if (!up) return fail(`fatal: invalid upstream '${name}'`);
      const head = this.head();
      const st = this.status(); if (st.staged.length || st.unstaged.length) return fail('error: cannot rebase: You have unstaged changes. Commit or stash them.');
      if (this.isAncestor(up, head)) { o(`Current branch ${this.branch()} is up to date.`); return; }
      if (this.isAncestor(head, up)) { const from = this.headTree(); this.applyTree(from, this.treeMap(up)); this.moveHead(up, `rebase (finish): fast-forward to ${name}`); o(`Successfully rebased and updated refs/heads/${this.branch()}.`, 'ok'); hood('Nothing to replay; Git simply fast-forwarded.'); return; }
      const U = this.ancestors(up); const list = []; let x = head;
      while (x && !U.has(x)) { if (this.objects[x].parents.length < 2) list.push(x); x = this.objects[x].parents[0]; }
      list.reverse();
      hood(`Found ${list.length} commit${list.length > 1 ? 's' : ''} on your branch that ${name} doesn't have: ${list.map(short).join(', ')}.`);
      hood(`Lifting them off and replaying them, one by one, on top of ${name} (${short(up)}).`);
      const r = this.replay(list, up, R, hood);
      if (r.conflict) return fail(`CONFLICT while replaying ${short(r.commit)} (${r.conflict.join(', ')}). Rebase aborted.`, 'This playground keeps rebases conflict-free. Try git merge for this one; it handles conflicts step by step.');
      const from = this.headTree(); const b = this.branch();
      this.reflog.unshift({ hash: up, msg: `rebase (start): checkout ${name}` });
      r.map.forEach(([a, n]) => this.reflog.unshift({ hash: n, msg: `rebase (pick): ${this.objects[a].msg.split('\n')[0]}` }));
      if (b) this.refs['refs/heads/' + b] = r.tip; else this.HEAD = r.tip;
      this.reflog.unshift({ hash: r.tip, msg: `rebase (finish): returning to refs/heads/${b}` });
      this.applyTree(from, this.treeMap(r.tip));
      o(`Successfully rebased and updated refs/heads/${b}.`, 'ok');
      r.map.forEach(([a, n]) => hood(`${short(a)} → replayed as ${short(n)}. NEW hash, because its parent changed, and the parent is part of the fingerprint.`));
      hood('The old commits were NOT deleted. They are now unreachable ghosts (faded in the graph). git reflog can still find them.');
      R.events.push({ type: 'rebased', map: r.map });
    }
    cmd_cherry_pick(args, R, o, hood, fail) {
      const c = this.resolve(args[0]); if (!c) return fail(`fatal: bad revision '${args[0]}'`);
      const head = this.head(); const st = this.status(); if (st.staged.length || st.unstaged.length) return fail('error: your local changes would be overwritten by cherry-pick.');
      const r = this.replay([c], head, R, hood); if (r.conflict) return fail(`error: could not apply ${short(c)} (conflict). Cherry-pick aborted in this playground.`);
      const from = this.headTree(); this.refs['refs/heads/' + this.branch()] = r.tip; this.reflog.unshift({ hash: r.tip, msg: 'cherry-pick: ' + this.objects[c].msg.split('\n')[0] });
      this.applyTree(from, this.treeMap(r.tip));
      o(`[${this.branch()} ${short(r.tip)}] ${this.objects[c].msg.split('\n')[0]}`, 'ok');
      hood(`Computed what ${short(c)} changed relative to its own parent, applied that change here, and wrote a brand-new commit ${short(r.tip)}. Same message, same author, different hash.`);
    }
    cmd_revert(args, R, o, hood, fail) {
      const c = this.resolve(args[0]); if (!c) return fail(`fatal: bad revision '${args[0]}'`);
      const co = this.objects[c]; if (co.parents.length > 1) return fail('error: commit is a merge (this playground can\'t revert merges)');
      const st = this.status(); if (st.staged.length || st.unstaged.length) return fail('error: your local changes would be overwritten by revert.');
      const m = this.merge3(this.treeMap(c), this.headTree(), this.treeMap(co.parents[0]));
      if (m.conflicts.length) return fail('error: could not revert (later commits changed the same files). Aborted in this playground.');
      const from = this.headTree(); const t = this.writeTree(m.tree).hash;
      const msg = `Revert "${co.msg.split('\n')[0]}"\n\nThis reverts commit ${c}.`;
      const h = this.writeCommit({ tree: t, parents: [this.head()], msg });
      this.moveHead(h, `revert: ${msg.split('\n')[0]}`); this.applyTree(from, this.treeMap(h));
      o(`[${this.branch()} ${short(h)}] ${msg.split('\n')[0]}`, 'ok');
      hood(`Computed the opposite of ${short(c)}'s change and recorded it as a NEW commit. History only grows. Nothing was erased, so it's safe on shared branches.`);
    }
    cmd_reset(args, R, o, hood, fail) {
      const mode = args.includes('--hard') ? 'hard' : args.includes('--soft') ? 'soft' : 'mixed';
      const rest = args.filter(a => !a.startsWith('--'));
      if (rest[0] && !this.resolve(rest[0]) && (this.index[rest[0]] !== undefined || this.headTree()[rest[0]] !== undefined)) {
        const f = rest[0]; const h = this.headTree()[f]; if (h) this.index[f] = h; else delete this.index[f];
        o(`Unstaged changes after reset:\nM\t${f}`); hood(`Index entry for ${f} copied back from HEAD (unstaged it). Working file untouched.`); return;
      }
      const spec = rest[0] || 'HEAD'; const t = this.resolve(spec); if (!t) return fail(`fatal: ambiguous argument '${spec}': unknown revision`);
      const old = this.head(); const oldTree = this.headTree(); const oldIndex = Object.assign({}, this.index);
      this.moveHead(t, `reset: moving to ${spec}`);
      const tt = this.treeMap(t);
      hood(`① Moved ${this.branch() ? 'the "' + this.branch() + '" branch' : 'HEAD'}: ${short(old)} → ${short(t)}.`);
      if (mode !== 'soft') { this.index = Object.assign({}, tt); hood('② Reset the index (staging area) to match that commit.'); }
      else hood('② (--soft) Index left alone, so your changes look staged and ready to re-commit.');
      if (mode === 'hard') {
        new Set([...Object.keys(oldIndex), ...Object.keys(oldTree), ...Object.keys(tt)]).forEach(f => { if (tt[f]) this.files[f] = this.content(tt[f]); else if (oldIndex[f] !== undefined || oldTree[f]) delete this.files[f]; });
        this.merging = null; hood('③ (--hard) Overwrote your working files too. Uncommitted edits are GONE. Committed ones are still in the object store (see reflog).');
        o(`HEAD is now at ${short(t)} ${this.objects[t].msg.split('\n')[0]}`, 'warn'); R.events.push({ type: 'shake' });
      } else if (mode === 'mixed') { hood('③ Working files untouched. Your changes are still there, just unstaged.'); const s = this.status(); if (s.unstaged.length) { o('Unstaged changes after reset:'); s.unstaged.forEach(([k, f]) => o('M\t' + f)); } }
      if (old && !this.isAncestor(old, t) && !this.reachable().has(old)) hood(`Commits after ${short(t)} are now unreachable ghosts, not deleted. Undo with: git reset --hard HEAD@{1}`);
    }
    cmd_stash(args, R, o, hood, fail) {
      const sub = args[0] || 'push';
      if (sub === 'list') { if (!this.stashes.length) o('(no stashes)', 'dim'); this.stashes.forEach((s, i) => o(`stash@{${i}}: ${s.msg}`)); return; }
      if (sub === 'push' || sub === 'save') {
        const head = this.head(); if (!head) return fail('You do not have the initial commit yet');
        const s = this.status(); if (!s.staged.length && !s.unstaged.length) { o('No local changes to save'); return; }
        const b = this.branch() || '(no branch)'; const hm = this.objects[head].msg.split('\n')[0];
        const iTree = this.writeTree(this.index).hash;
        const ic = this.writeCommit({ tree: iTree, parents: [head], msg: `index on ${b}: ${short(head)} ${hm}`, hidden: true });
        const wmap = {}; Object.keys(this.index).forEach(f => { if (this.files[f] !== undefined) wmap[f] = this.writeBlob(this.files[f]).hash; });
        const wTree = this.writeTree(wmap).hash;
        const wc = this.writeCommit({ tree: wTree, parents: [head, ic], msg: `WIP on ${b}: ${short(head)} ${hm}`, hidden: true });
        this.stashes.unshift({ hash: wc, base: head, msg: `WIP on ${b}: ${short(head)} ${hm}`, idx: Object.assign({}, this.index) });
        this.refs['refs/stash'] = wc;
        const ht = this.treeMap(head); const curIdx = Object.assign({}, this.index);
        new Set([...Object.keys(curIdx), ...Object.keys(ht)]).forEach(f => { if (ht[f]) this.files[f] = this.content(ht[f]); else delete this.files[f]; });
        this.index = Object.assign({}, ht);
        o(`Saved working directory and index state WIP on ${b}: ${short(head)} ${hm}`, 'ok');
        hood(`Secretly made TWO commits: ${short(ic)} (your staged state) and ${short(wc)} (your working files). They hang off refs/stash, not any branch.`);
        hood('Then reset your folder to HEAD. Clean desk, nothing lost.');
        return;
      }
      if (sub === 'pop' || sub === 'apply') {
        const s = this.stashes[0]; if (!s) return fail('error: No stash entries found.');
        const st = this.status(); if (st.staged.length || st.unstaged.length) return fail('error: Your local changes would be overwritten. Commit or stash them.');
        const m = this.merge3(this.treeMap(s.base), this.headTree(), this.treeMap(s.hash));
        if (m.conflicts.length) return fail('CONFLICT applying stash. (This playground aborts; the stash is kept.)');
        const ht = this.headTree();
        Object.keys(m.tree).forEach(f => { if (ht[f] !== m.tree[f]) { this.files[f] = this.content(m.tree[f]); if (!ht[f]) this.index[f] = m.tree[f]; } });
        Object.keys(ht).forEach(f => { if (!m.tree[f]) delete this.files[f]; });
        hood(`Three-way merged the stashed snapshot back into your working folder (base ${short(s.base)} → stash ${short(s.hash)} → current HEAD).`);
        if (sub === 'pop') { this.stashes.shift(); if (this.stashes[0]) this.refs['refs/stash'] = this.stashes[0].hash; else delete this.refs['refs/stash']; o(`Dropped refs/stash@{0} (${short(s.hash)})`, 'ok'); hood('pop = apply + drop. The stash commits are now unreferenced.'); }
        else o('Applied stash@{0}. (still saved in the stash list)', 'ok');
        return;
      }
      if (sub === 'drop') { const s = this.stashes.shift(); if (!s) return fail('error: No stash entries found.'); if (this.stashes[0]) this.refs['refs/stash'] = this.stashes[0].hash; else delete this.refs['refs/stash']; o(`Dropped refs/stash@{0} (${short(s.hash)})`); return; }
      return fail(`error: unknown subcommand: ${sub}`);
    }
    cmd_tag(args, R, o, hood, fail, raw) {
      if (args[0] === '-d') { if (!this.refs['refs/tags/' + args[1]]) return fail(`error: tag '${args[1]}' not found.`); delete this.refs['refs/tags/' + args[1]]; o(`Deleted tag '${args[1]}'`); return; }
      const names = args.filter((a, i) => !a.startsWith('-') && args[i - 1] !== '-m');
      if (!names.length) { const ts = Object.keys(this.refs).filter(r => r.startsWith('refs/tags/')).map(r => r.slice(10)).sort(); ts.forEach(t => o(t)); if (!ts.length) o('(no tags)', 'dim'); return; }
      const n = names[0]; if (this.refs['refs/tags/' + n]) return fail(`fatal: tag '${n}' already exists`);
      const at = this.resolve(names[1] || 'HEAD'); if (!at) return fail('fatal: Failed to resolve \'' + (names[1] || 'HEAD') + '\' as a valid ref.');
      const mi = args.indexOf('-m');
      if (args.includes('-a') || mi >= 0) {
        const msg = mi >= 0 ? args[mi + 1] : n; const ts = this.tick();
        const txt = `object ${at}\ntype commit\ntag ${n}\ntagger ${this.user.name} <${this.user.email}> ${ts} +0530\n\n${msg}\n`;
        const r = this.store('tag', enc.encode(txt), { object: at, text: txt, tagName: n });
        this.refs['refs/tags/' + n] = r.hash;
        hood(`Annotated tag: wrote a TAG object ${short(r.hash)} (the 4th object type!) holding who, when, why, and which commit. refs/tags/${n} points to it.`);
      } else { this.refs['refs/tags/' + n] = at; hood(`Lightweight tag: just a file refs/tags/${n} containing ${short(at)}. Like a branch that never moves.`); }
    }
    cmd_reflog(args, R, o, hood) {
      if (!this.reflog.length) { o('(empty)', 'dim'); return; }
      this.reflog.slice(0, 30).forEach((e, i) => o(`${short(e.hash)} HEAD@{${i}}: ${e.msg}`, i === 0 ? 'hash' : ''));
      hood('The reflog is a private diary of every place HEAD has pointed, kept only on your machine (~90 days). It\'s how "lost" commits get found: git reset --hard HEAD@{n}.');
      R.events.push({ type: 'egg', id: 'reflog' });
    }
    cmd_cat_file(args, R, o, hood, fail) {
      const flag = args.find(a => a.startsWith('-')) || '-p'; const spec = args.find(a => !a.startsWith('-'));
      if (!spec) return fail('usage: git cat-file (-t | -s | -p) <object>');
      const h = this.resolveObject(spec); if (!h || !this.objects[h]) return fail(`fatal: Not a valid object name ${spec}`);
      const ob = this.objects[h];
      if (flag === '-t') { o(ob.type, 'info'); return; }
      if (flag === '-s') { o(String(ob.size)); return; }
      this.raw(h).replace(/\n$/, '').split('\n').forEach(l => o(l, /^(tree|parent|object) /.test(l) || /^100644/.test(l) ? 'hash' : ''));
      hood(`On disk this object is zlib( "${ob.type} ${ob.size}\\0" + the text above ), stored at .git/objects/${h.slice(0, 2)}/${h.slice(2)}. Its name is the SHA-1 of exactly those bytes.`);
      R.events.push({ type: 'inspect', hash: h });
    }
    cmd_show(args, R, o, hood, fail) {
      const spec = args[0] || 'HEAD'; const h = this.resolve(spec); if (!h) return fail(`fatal: bad revision '${spec}'`);
      const c = this.objects[h]; o(`commit ${h}`, 'hash'); o(`Author: ${c.author.name} <${c.author.email}>`); o(`Date:   ${fmtDate(c.ts)}`); o(''); c.msg.split('\n').forEach(l => o('    ' + l)); o('');
      this.diffTrees(this.treeMap(c.parents[0]), this.treeMap(h), o);
      hood('Commits store full snapshots, not diffs. "show" computes this diff on the fly by comparing the commit\'s tree with its parent\'s.');
    }
    diffTrees(a, b, o, aw) {
      let any = false;
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach(f => {
        if (a[f] === b[f]) return; any = true;
        o(`diff --git a/${f} b/${f}`, 'info');
        const ca = a[f] ? this.content(a[f]) : '', cb = b[f] ? (aw && aw[f] !== undefined ? aw[f] : this.content(b[f])) : '';
        lineDiff(ca, cb).forEach(([k, l]) => o(k + l, k === '+' ? 'add' : k === '-' ? 'del' : 'dim'));
      });
      return any;
    }
    cmd_diff(args, R, o, hood) {
      const staged = args.includes('--staged') || args.includes('--cached');
      const revs = args.filter(a => !a.startsWith('-'));
      let any;
      if (revs.length === 2) { any = this.diffTrees(this.treeMap(this.resolve(revs[0])), this.treeMap(this.resolve(revs[1])), o); hood('Compared two commit snapshots file by file. Blobs with equal hashes are skipped without even being read.'); }
      else if (staged) { any = this.diffTrees(this.headTree(), this.index, o); hood('--staged: what the NEXT commit would change (index vs HEAD).'); }
      else {
        const w = {}; Object.keys(this.index).forEach(f => { if (this.files[f] !== undefined) w[f] = blobHash(this.files[f]); });
        const aw = {}; Object.keys(w).forEach(f => aw[f] = this.files[f]);
        any = false;
        Object.keys(this.index).forEach(f => {
          if (w[f] === this.index[f]) return; any = true;
          o(`diff --git a/${f} b/${f}`, 'info');
          lineDiff(this.content(this.index[f]), this.files[f] || '').forEach(([k, l]) => o(k + l, k === '+' ? 'add' : k === '-' ? 'del' : 'dim'));
        });
        hood('Plain diff = working files vs the index: changes you have NOT staged yet. (Untracked files never appear here.)');
      }
      if (!any) o('(no differences)', 'dim');
    }
    cmd_rev_parse(args, R, o, hood, fail) { const h = this.resolve(args[0] || 'HEAD'); if (!h) return fail(`fatal: ambiguous argument '${args[0]}'`); o(h, 'hash'); hood('Translated a human name into the 40-char hash it currently stands for.'); }
    cmd_ls_files(args, R, o) { Object.keys(this.index).sort().forEach(f => o(args.includes('-s') ? `100644 ${this.index[f]} 0\t${f}` : f, args.includes('-s') ? 'hash' : '')); if (!Object.keys(this.index).length) o('(index is empty)', 'dim'); R.hood.push('This is the index (the staging area): a sorted list of filename → blob hash. It is the draft of your next commit\'s tree.'); }
    cmd_ls_tree(args, R, o, hood, fail) { const h = this.resolve(args.find(a => !a.startsWith('-')) || 'HEAD'); if (!h) return fail('fatal: not a tree object'); this.raw(this.objects[h].tree).replace(/\n$/, '').split('\n').forEach(l => o(l, 'hash')); }
    cmd_blame(args, R, o, hood, fail) {
      const f = args[0]; const chain = []; let x = this.head(); while (x) { chain.unshift(x); x = this.objects[x].parents[0]; }
      let lines = null;
      chain.forEach(c => {
        const b = this.treeMap(c)[f]; if (!b) { lines = null; return; }
        const now = this.content(b).replace(/\n$/, '').split('\n'); const prev = (lines || []).slice();
        lines = now.map(t => { const k = prev.findIndex(p => p.t === t); if (k >= 0) return prev.splice(k, 1)[0]; return { t, c }; });
      });
      if (!lines) return fail(`fatal: no such path '${f}' in HEAD`);
      lines.forEach((l, i) => { const c = this.objects[l.c]; o(`${short(l.c)} (${c.author.name.padEnd(6)} ${fmtDate(c.ts).slice(4, 10)}) ${String(i + 1).padStart(2)}) ${l.t}`); });
      hood('Blame walks history and, for each line, finds the oldest commit where that exact line appeared. Archaeology, one line at a time.');
    }
    cmd_remote(args, R, o, hood, fail) {
      if (args[0] === 'add') { this.remotes[args[1]] = { url: args[2], repo: this.server || new Repo({ name: 'server' }) }; this.remotes[args[1]].repo.inited = true; hood(`Saved a nickname: "${args[1]}" = ${args[2]} (written into .git/config). No network call yet.`); return; }
      Object.keys(this.remotes).forEach(r => { o(args.includes('-v') ? `${r}\t${this.remotes[r].url} (fetch)` : r); if (args.includes('-v')) o(`${r}\t${this.remotes[r].url} (push)`); });
      if (!Object.keys(this.remotes).length) o('(no remotes)', 'dim');
    }
    sendObjects(from, to, tip) {
      // collect everything the receiver lacks, then import parents before children
      const need = new Set(); const st = [tip];
      while (st.length) {
        const h = st.pop(); if (!h || to.objects[h] || need.has(h) || !from.objects[h]) continue;
        need.add(h); const ob = from.objects[h];
        if (ob.type === 'commit') { st.push(ob.tree); ob.parents.forEach(p => st.push(p)); }
        else if (ob.type === 'tree') ob.entries.forEach(e => st.push(e.hash));
        else if (ob.type === 'tag') st.push(ob.object);
      }
      const done = new Set();
      const visit = h => { if (done.has(h)) return; done.add(h); const ob = from.objects[h]; if (ob.type === 'commit') ob.parents.forEach(p => { if (need.has(p)) visit(p); }); to.importObject(h, ob); };
      [...need].filter(h => from.objects[h].type !== 'commit').forEach(h => { done.add(h); to.importObject(h, from.objects[h]); });
      from.order.filter(h => need.has(h)).forEach(visit);
      [...need].forEach(visit);
      return need.size;
    }
    cmd_push(args, R, o, hood, fail) {
      const force = args.includes('--force') || args.includes('-f');
      const pos = args.filter(a => !a.startsWith('-')); const rn = pos[0] || 'origin'; const rem = this.remotes[rn];
      if (!rem) return fail(`fatal: '${rn}' does not appear to be a git repository`);
      const b = pos[1] || this.branch(); const mine = this.refs['refs/heads/' + b]; if (!mine) return fail(`error: src refspec ${b} does not match any`);
      const theirs = rem.repo.refs['refs/heads/' + b];
      if (theirs && !this.isAncestor(theirs, mine) && !force) {
        o(`To ${rem.url}`); o(` ! [rejected]        ${b} -> ${b} (fetch first)`, 'err');
        o("error: failed to push some refs. The remote contains work that you do not have locally.", 'err');
        hood(`The server's ${b} (${short(theirs)}) is not in your history. Accepting your push would erase someone's work, so the server says no.`);
        hood('Fix: git pull (fetch + merge), then push again.'); R.ok = false; R.events.push({ type: 'rejected' }); return;
      }
      const n = this.sendObjects(this, rem.repo, mine);
      rem.repo.refs['refs/heads/' + b] = mine; this.refs['refs/remotes/' + rn + '/' + b] = mine;
      if (args.includes('-u') || args.includes('--set-upstream')) this.upstream[b] = rn + '/' + b;
      o(`Writing objects: 100% (${n}/${n}), done.`); o(`To ${rem.url}`);
      o(force && theirs && !this.isAncestor(theirs, mine) ? ` + ${short(theirs)}...${short(mine)} ${b} -> ${b} (forced update)` : `   ${theirs ? short(theirs) + '..' + short(mine) : '* [new branch]'}      ${b} -> ${b}`, force ? 'warn' : 'ok');
      hood(`Uploaded only the ${n} object${n === 1 ? '' : 's'} the server was missing (hashes make that easy to work out), then asked it to move its "${b}" to ${short(mine)}.`);
      hood(`Updated your local bookmark ${rn}/${b} to match.`);
      if (force && theirs && !this.isAncestor(theirs, mine)) { hood('⚠️ FORCE: the server\'s old commits were thrown away. If a teammate pushed them, their work just vanished from the server.'); R.events.push({ type: 'shake' }, { type: 'egg', id: 'force' }); }
      R.events.push({ type: 'pushed' });
    }
    cmd_fetch(args, R, o, hood, fail) {
      const rn = args.find(a => !a.startsWith('-')) || 'origin'; const rem = this.remotes[rn]; if (!rem) return fail(`fatal: '${rn}' does not appear to be a git repository`);
      let n = 0; const lines = [];
      Object.keys(rem.repo.refs).filter(r => r.startsWith('refs/heads/')).forEach(r => {
        const b = r.slice(11), tip = rem.repo.refs[r]; const old = this.refs['refs/remotes/' + rn + '/' + b];
        rem.repo.order.forEach(h => { if (this.objects[h] === undefined && rem.repo.ancestors(tip).has(h)) n += this.sendObjects(rem.repo, this, h); });
        n += this.sendObjects(rem.repo, this, tip);
        if (old !== tip) { lines.push(`   ${old ? short(old) + '..' + short(tip) : '* [new branch]'}  ${b} -> ${rn}/${b}`); this.refs['refs/remotes/' + rn + '/' + b] = tip; }
      });
      if (!lines.length) { o('(already up to date with ' + rn + ')', 'dim'); hood('Asked the server what it has. You already have all of it.'); return; }
      o(`From ${rem.url}`); lines.forEach(l => o(l, 'ok'));
      hood(`Downloaded ${n} new object${n === 1 ? '' : 's'} and moved your ${rn}/* bookmarks. Your own branches did NOT move and your files are untouched. fetch is always safe.`);
      R.events.push({ type: 'fetched' });
    }
    cmd_pull(args, R, o, hood, fail) {
      const rn = 'origin'; if (!this.remotes[rn]) return fail('fatal: no remote "origin"');
      const b = this.branch();
      this.cmd_fetch([rn], R, o, hood, fail); if (!R.ok) return;
      hood(`pull = fetch + ${args.includes('--rebase') ? 'rebase' : 'merge'} ${rn}/${b}.`);
      if (args.includes('--rebase')) return this.cmd_rebase([rn + '/' + b], R, o, hood, fail);
      return this.cmd_merge([rn + '/' + b], R, o, hood, fail);
    }

    // ---------- helpers for scripted setups ----------
    script(lines) { lines.forEach(l => this.run(l)); return this; }
    teammateCommit(file, content, msg, who) {
      const t = Object.assign({}, this.treeMap(this.refs['refs/heads/main']));
      t[file] = this.writeBlob(content).hash;
      const tree = this.writeTree(t).hash;
      const h = this.writeCommit({ tree, parents: this.refs['refs/heads/main'] ? [this.refs['refs/heads/main']] : [], msg, author: who || { name: 'Meera', email: 'meera@example.com' } });
      this.refs['refs/heads/main'] = h; return h;
    }
  }

  const HELP = [
    'Shell:  ls   cat <file>   echo "text" > <file>   echo "more" >> <file>   rm <file>   clear',
    'Peek inside:  ls .git   cat .git/HEAD   cat .git/refs/heads/main   find .git/objects',
    'Git:',
    '  init  status  add  commit -m  log [--oneline] [--all]  diff [--staged]  show',
    '  branch [-d]  checkout [-b]  switch [-c]  restore [--staged]  merge [--abort]  rebase',
    '  reset [--soft|--mixed|--hard]  revert  cherry-pick  stash [pop|list]  tag [-a -m]',
    '  reflog  blame  cat-file -p|-t  hash-object  ls-files -s  ls-tree  rev-parse',
    '  remote -v  fetch  pull [--rebase]  push [--force]  clone',
    'Revisions: HEAD  HEAD~2  HEAD^  main  abc1234  HEAD@{1}  HEAD:file.txt',
    'Chain commands with &&. And yes, there are secrets. 🥚'
  ];
  const FACTS = [
    '🐧 Git was self-hosting (tracking its own source) within about 4 days of the first line of code.',
    '🔑 Every commit id is a SHA-1 of the commit\'s exact bytes, so ids double as tamper-evident seals.',
    '📦 A branch costs 41 bytes. Forty hex characters plus a newline.',
    '🧳 Git stores snapshots, not diffs. Diffs are computed when you ask. (Packfiles add deltas later, just for disk space.)',
    '🇬🇧 "git" is British slang for an unpleasant person. Linus joked he names all his projects after himself.',
    '👻 "Deleted" commits usually live ~30–90 days more, reachable via the reflog, before garbage collection.',
    '🤝 Junio Hamano has maintained Git since July 2005, three months after Linus wrote it.'
  ];

  const api = { Repo, sha1, blobHash, hashRaw, enc, short, lineDiff, fmtDate, FACTS, treeBody, hexToBytes, concat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MiniGit = api;
})(typeof window !== 'undefined' ? window : globalThis);
