#!/usr/bin/env python3
"""Rebuild the Fable edition's section copies from the classic pages.

Run from the repo root:  python3 fable/tools/sync.py

It never writes outside fable/. It re-copies every section (except
Deepavali and Rasi), then gives each page a Fable shell: fonts, boot
script, core stylesheet + engine, and the data-fb-* config the engine
reads. fable/index.html, fable/core/ and this script are hand-written
and are left alone.
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'fable'
SECTIONS = ['assets', 'chapters', 'chess', 'computing', 'git', 'math', 'piano', 'feed']
SKIP = {'feed/data', 'feed/tools', 'feed/UPDATING.md'}

J_BLOCK = 'main > section.hero, main > section.block'
PAGES = {
    'chapters/01-what-is-digital-marketing.html': ('marketing', 'journey', J_BLOCK, '', 'What is digital marketing?'),
    'chapters/02-the-customer-journey.html': ('marketing', 'journey', J_BLOCK, '', "The customer's journey"),
    'computing/index.html': ('machines', 'glide', '', '', 'How Machines Think'),
    'computing/01-the-life-of-2-plus-3.html': ('machines', 'journey', J_BLOCK, '', 'The life of 2 + 3'),
    'computing/lab-01.html': ('machines', 'journey', 'main > section.hero, main > section.station, main > section.block', '', 'Visual Lab'),
    'git/index.html': ('git', 'journey', 'section.hero, section.act', '', 'git: the story'),
    'chess/index.html': ('chess', 'journey', 'section.hero, section.block, section.lesson', '', 'Tactics'),
    'chess/middlegame.html': ('chess', 'journey', 'section.hero, section.block, section.lesson', '', 'Strategy'),
    'chess/london.html': ('chess', 'journey', 'section.hero, section.block, section.lesson', '', 'The London'),
    'math/index.html': ('math', 'glide', '', '', 'Math: the story'),
    'math/algebra.html': ('math', 'journey', 'section.hero, section.act', '', 'Algebra: the story'),
    'math/algebra-history.html': ('math', 'journey', 'section.hsec', '', 'Algebra: the history corner'),
    'piano/index.html': ('music', 'tool', '', '', 'Piano Studio'),
    'piano/mobile/index.html': ('music', 'bare', '', '', 'Piano'),
    'piano/percussion/index.html': ('music', 'tool', '', '', 'Bhajan Rhythm Studio'),
    'piano/learn/index.html': ('music', 'glide', '', '', 'Music: the story'),
    'piano/learn/1-1-sound.html': ('music', 'journey', '', 'main.wrap', 'What is a note?'),
    'piano/learn/1-2-names.html': ('music', 'journey', '', 'main.wrap', 'C D E meets Sa Re Ga'),
    'piano/learn/1-3-rhythm.html': ('music', 'journey', '', 'main.wrap', 'Beat, tala and time signature'),
    'piano/learn/2-1-major.html': ('music', 'journey', '', 'main.wrap', 'One scale, three names'),
    'feed/index.html': ('calm', 'calm', '', '', 'Calm Feed'),
}

FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700'
         '&family=JetBrains+Mono:wght@400;600;700&family=Playfair+Display:ital,wght@0,400..800;1,400..800&display=swap" rel="stylesheet">')
BOOT = ('<script>try{localStorage.setItem("fable-theme","dark");localStorage.setItem("fable-calm-theme","dark")}catch(e){}'
        'document.documentElement.setAttribute("data-theme","dark");document.documentElement.classList.add("fb-boot");</script>')


def attr(s):
    return s.replace('&', '&amp;').replace('"', '&quot;')


def shell(rel, html):
    world, mode, scenes, split, title = PAGES[rel]
    root = '../' * rel.count('/')
    data = ' data-fb-world="%s" data-fb-mode="%s" data-fb-key="%s" data-fb-root="%s" data-fb-title="%s"' % (world, mode, rel, root, attr(title))
    if scenes: data += ' data-fb-scenes="%s"' % attr(scenes)
    if split: data += ' data-fb-split="%s"' % attr(split)
    html, n = re.subn(r'<html\b([^>]*)>', lambda m: '<html' + m.group(1) + data + '>', html, count=1)
    assert n == 1, rel
    # boot script replaces the classic light/dark script
    html, n = re.subn(r'<script>[^<]*(?:fable-theme|fable-calm-theme)[^<]*</script>', lambda m: BOOT, html, count=1)
    if n == 0: html = html.replace('</head>', '  ' + BOOT + '\n</head>', 1)
    html, n = re.subn(r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">', lambda m: FONTS, html, count=1)
    assert n == 1, 'fonts ' + rel
    html = html.replace('</head>', '  <link rel="stylesheet" href="%score/fable.css">\n</head>' % root, 1)
    i = html.rfind('</body>'); assert i > 0, rel
    html = html[:i] + '<script src="%score/fable.js" defer></script>\n' % root + html[i:]
    html = re.sub(r'<title>([^<]*)</title>', lambda m: '<title>' + m.group(1) + ' · Fable</title>', html, count=1)
    html = html.replace('<span>Field Notes</span>', '<span>Fable</span>').replace('</span>Field Notes</a>', '</span>Fable</a>')
    html = re.sub(r'(<meta name="theme-color" content=")[^"]*(")', r'\g<1>#07060f\2', html)
    return html


def main():
    for s in SECTIONS:
        dst = OUT / s
        if dst.exists(): shutil.rmtree(dst)
        shutil.copytree(ROOT / s, dst, ignore=lambda d, names: [n for n in names if str((Path(d) / n).relative_to(ROOT)) in SKIP])
    seen = set()
    for p in sorted(OUT.rglob('*')):
        if not p.is_file() or p.suffix not in ('.html', '.js', '.css', '.webmanifest'): continue
        rel = str(p.relative_to(OUT))
        if rel.startswith(('core/', 'tools/')) or rel == 'index.html': continue
        t = p.read_text(encoding='utf-8')
        t = t.replace('dml-theme', 'fable-theme').replace('calm-theme', 'fable-calm-theme')
        if p.suffix == '.html':
            if rel not in PAGES: sys.exit('No Fable config for new page: ' + rel + ' (add it to PAGES)')
            t = shell(rel, t); seen.add(rel)
        if rel == 'feed/feed.js':
            # the feed is refreshed twice a day in the classic folder: read that live data, not a frozen copy
            assert '"data/items.json' in t
            t = t.replace('"data/items.json', '"../../feed/data/items.json')
        if rel == 'piano/mobile/sw.js':
            t = t.replace("'piano-mobile-v1'", "'fable-piano-mobile-v1'").replace("k.indexOf('piano-mobile-')", "k.indexOf('fable-piano-mobile-')")
            t = t.replace("'../engine.js', '../piano.js', '../piano.css',", "'../engine.js', '../piano.js', '../piano.css', '../../core/fable.css', '../../core/fable.js',")
            assert 'fable-piano-mobile-v1' in t and 'core/fable.js' in t
        if rel == 'piano/mobile/manifest.webmanifest':
            t = t.replace('"name": "Piano Studio"', '"name": "Fable Piano"').replace('"short_name": "Piano"', '"short_name": "Fable Piano"').replace('#0e0d0b', '#07060f')
        p.write_text(t, encoding='utf-8')
    missing = set(PAGES) - seen
    if missing: sys.exit('Configured pages not found: ' + ', '.join(sorted(missing)))
    print('Fable sections rebuilt:', len(seen), 'pages')


if __name__ == '__main__':
    main()
