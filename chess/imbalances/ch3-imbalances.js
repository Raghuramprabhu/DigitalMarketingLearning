// Chapter 3 · Silman's imbalances: fight with your difference.
// Game: Karpov – Kasparov, World Championship (game 16), Moscow, 15 October 1985.
// Evaluations quoted are Stockfish 19 (depth 18).
export default {
  id: 'silman',
  kicker: 'Imbalances · Chapter 3 of 3',
  short: 'Fight With Your Difference',
  title: 'Fight With Your Difference',
  sub: 'Jeremy Silman\'s big idea: no position is truly equal. Find what\'s different, decide which differences are yours, and build the whole plan around them. Kasparov does it a pawn down, with a knight Karpov can\'t get rid of.',
  meta: '♟ Game: Karpov – Kasparov, World Championship game 16, Moscow 1985 &nbsp;·&nbsp; 💡 Aha: Agincourt, 1415 &nbsp;·&nbsp; ⏱ about 15 minutes',
  orient: 'b',
  hud: 'scanner', hudTitle: '🔎 Imbalance scanner',
  imbalances: [
    { k: 'material', t: 'Material', i: '⚖️' }, { k: 'minor', t: 'Minor pieces', i: '♞' }, { k: 'pawns', t: 'Pawn structure', i: '♟' },
    { k: 'space', t: 'Space', i: '📐' }, { k: 'files', t: 'Open files', i: '🛣️' }, { k: 'squares', t: 'Weak squares', i: '🕳️' },
    { k: 'dev', t: 'Development', i: '🚀' }, { k: 'init', t: 'Initiative', i: '⚡' }, { k: 'king', t: 'King safety', i: '🛡️' }
  ],
  speakers: { coach: { av: '🧭', name: 'Coach' }, story: { av: '📜', name: 'Story' } },
  praise: ['The octopus lives!', 'Kasparov\'s move.', 'You found the difference.', 'Tentacles everywhere.'],
  pgn: `1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nb5 d6 6.c4 Nf6 7.N1c3 a6 8.Na3 d5 9.cxd5 exd5 10.exd5 Nb4 11.Be2 Bc5 12.O-O O-O 13.Bf3 Bf5 14.Bg5 Re8 15.Qd2 b5 16.Rad1 Nd3 17.Nab1 h6 18.Bh4 b4 19.Na4 Bd6 20.Bg3 Rc8 21.b3 g5 22.Bxd6 Qxd6 23.g3 Nd7 24.Bg2 Qf6 25.a3 a5 26.axb4 axb4 27.Qa2 Bg6 28.d6 g4 29.Qd2 Kg7 30.f3 Qxd6 31.fxg4 Qd4+ 32.Kh1 Nf6 33.Rf4 Ne4 34.Qxd3 Nf2+ 35.Rxf2 Bxd3 36.Rfd2 Qe3 37.Rxd3 Rc1 38.Nb2 Qf2 39.Nd2 Rxd1+ 40.Nxd1 Re1+`,
  steps: [
    { ply: 0, text: '<p>Almost every club player has this habit: stare at the board and ask, <b>"What\'s the best move?"</b></p>' },
    { who: 'story', text: '<p><b>Jeremy Silman</b>, an American International Master and chess teacher, noticed that question freezes people. In <i>How to Reassess Your Chess</i> he gave them a different first question.</p>' },
    {
      big: `<div class="eyebrow">First principle</div><h2>Ask "what's different?" before "what's best?"</h2>
      <p>No position is truly equal. There is always an <b>imbalance</b>: a difference between the two sides.</p>
      <ul><li>1️⃣ List the differences: material, minor pieces, pawns, space, files, weak squares, development, initiative, king safety.</li>
      <li>2️⃣ Decide which ones are <b>yours</b>.</li>
      <li>3️⃣ Build your plan to make your differences count, and to make your opponent's differences stop mattering.</li></ul>
      <p>Steinitz gave us the coins. Stone vs fire told us how long each one lasts. Silman tells us <span class="hand">which ones to fight with.</span></p>`
    },
    { ply: 0, text: '<p>The <b>scanner</b> holds Silman\'s checklist. As the game unfolds it lights up: white tiles for Karpov, black tiles for Kasparov.</p>' },
    { ply: 0, who: 'story', kicker: 'Moscow, 15 Oct 1985', text: '<p>World Championship, game 16. Champion <b>Anatoly Karpov</b> has White. Challenger <b>Garry Kasparov</b>, 22, has Black. The match is tied 7½–7½.</p><p>We sit on Kasparov\'s side of the board.</p>' },
    {
      ply: 16, play: true, text: '<p>A Sicilian. Then Kasparov plays <span class="mv">8...d5!?</span>, a prepared pawn sacrifice. He had sprung it once already, in game 12.</p>',
      anchor: 'd5'
    },
    {
      text: '<p>Kasparov is about to give up a pawn. What is he buying? Look at White\'s knight on a3.</p>', anchor: 'a3', focus: ['d5', 'c4', 'e4'],
      ask: {
        type: 'mcq', options: [
          { t: 'A quick checkmate.', why: 'No mate in sight. Think longer-term.' },
          { t: 'Time and activity: the a3 knight is far from the centre, and Black\'s pieces will come out fast.', ok: true, why: 'Yes. Kasparov trades a pawn (stone) for activity (fire), and he bets that the a3 knight will struggle to get back into the game.' },
          { t: 'Nothing. It\'s a blunder.', why: 'Kasparov himself later marked 8...d5 as dubious, but it was deep home preparation, not an accident.' }
        ]
      }
    },
    {
      ply: 20, play: true, imb: { material: 'w', pawns: 'w' },
      text: '<p>Karpov takes and keeps the pawn. White is a pawn up, with a passed pawn on d5. Two tiles go white.</p><p><span class="mv">10...Nb4</span> eyes d5, and something deeper: the square d3.</p>',
      anchor: 'b4', arrows: [['b4', 'd3', 'b']]
    },
    {
      ply: 30, play: true, text: '<p>Both sides develop. Then <span class="mv">15...b5!</span>: a small pawn move with a big idea.</p>',
      anchor: 'b5', focus: ['a3', 'c4']
    },
    {
      text: '<p>What does <span class="mv">...b5</span> do to the knight on a3?</p>', anchor: 'a3', focus: ['b5', 'c4'],
      ask: {
        type: 'mcq', options: [
          { t: 'Attacks it directly.', why: 'Pawns attack diagonally. b5 hits a4 and c4, not a3.' },
          { t: 'Takes away c4, the knight\'s best way back into the game.', ok: true, why: 'Exactly. With c4 covered, the knight stays stuck on the rim. Silman\'s "minor pieces" imbalance just tipped toward Black.' },
          { t: 'Nothing; it\'s just space.', why: 'It does gain space, but the main point is the a3 knight.' }
        ]
      }
    },
    {
      ply: 31, play: true, imb: { minor: 'b', dev: 'b' },
      text: '<p><span class="mv">16.Rad1</span>. Your move, and there\'s a hole in White\'s camp.</p>', anchor: 'd3', tint: { d3: 'y' }
    },
    {
      ply: 31, kicker: 'Your move', text: '<p>Find the hole. Jump into it.</p>',
      ask: { type: 'find', answers: ['b4d3'], hint: 'A square in White\'s half that no White pawn can ever attack. Your b4 knight is one jump away.', hintSq: 'b4', wrong: 'Not this. Find the hole.', alts: { d8d6: 'Stockfish likes that too, but Kasparov had a bigger idea: plant the knight.' } },
      after: '<p><span class="mv">16...Nd3!</span> Kasparov later called it an <b>octopus</b>. Its tentacles reach b2, c1, e1, f2, f4, e5, c5 and b4.</p>',
      afterMarks: { tint: { b2: 'y', c1: 'y', e1: 'y', f2: 'y', f4: 'y', e5: 'y', c5: 'y', b4: 'y' }, circles: [['d3', 'g']] },
      focus: ['d3', 'b4']
    },
    {
      imb: { squares: 'b' },
      text: '<p>Karpov must decide. Give the pawn back with <span class="mv">17.d6</span> to free his pieces, or keep it?</p><p>What would you tell him?</p>',
      anchor: 'd5', focus: ['d3', 'a3', 'd6'],
      ask: {
        type: 'mcq', options: [
          { t: 'Keep the pawn. Material is permanent.', why: 'Material is stone, yes. But his pieces are suffocating, and the octopus isn\'t going anywhere.' },
          { t: 'Give it back with 17.d6. Activity matters more right now.', ok: true, why: 'Stockfish agrees: 17.d6 keeps the game about equal. Karpov kept the pawn with 17.Nab1, and the evaluation drops to about −1.7 for White.' }
        ]
      }
    },
    {
      ply: 33, play: true, imb: { init: 'b' },
      text: '<p>Karpov kept it: <span class="mv">17.Nab1</span>, a knight going <b>backwards</b> to the first rank. Both White knights are now on the edge.</p>',
      anchor: 'b1', circles: [['b1', 'r'], ['c3', 'r']]
    },
    { ply: 33, text: '<p>Kasparov is a pawn down, and he\'s the one pressing. How?</p><p>A story from a muddy field in 1415.</p>', nextLabel: 'Tell me →' },
    { ply: 33, story: 'agincourt' },
    {
      ply: 38, play: true, text: '<p><span class="mv">17...h6 18.Bh4 b4!</span> The c3 knight is kicked to the rim too: <span class="mv">19.Na4</span>. Two White knights on a4 and b1. Stuck in the mud.</p>',
      anchor: 'a4', circles: [['a4', 'r'], ['b1', 'r']]
    },
    {
      ply: 44, play: true, imb: { files: 'b' },
      text: '<p>A rook lands on the open c-file, and the dark-squared bishops come off. Black controls the c-file now.</p>',
      anchor: 'c8', arrows: [['c8', 'c1', 'b']]
    },
    {
      ply: 56, play: true, imb: { space: 'b' },
      text: '<p>Karpov finally pushes <span class="mv">28.d6</span>, trying to give the pawn back on his own terms. Kasparov answers <span class="mv">28...g4!</span>, grabbing kingside space.</p>',
      anchor: 'g4', focus: ['d6', 'd3']
    },
    {
      ply: 60, play: true, imb: { material: '=', pawns: '=' },
      text: '<p><span class="mv">30...Qxd6</span>. The pawn comes back. Material is level, and now almost every tile is black.</p>', anchor: 'd6'
    },
    {
      ply: 66, play: true, imb: { king: 'b' },
      text: '<p>White\'s king is exposed after <span class="mv">31.fxg4 Qd4+ 32.Kh1</span>. Black\'s second knight joins: <span class="mv">33...Ne4</span>.</p>', anchor: 'e4', focus: ['d3', 'd4', 'h1']
    },
    {
      ply: 67, play: true, text: '<p><span class="mv">34.Qxd3</span>. Karpov finally removes the octopus. But it costs him.</p>', anchor: 'd3', focus: ['e4', 'h1']
    },
    {
      ply: 67, kicker: 'Your move', text: '<p>Find the fork.</p>',
      ask: { type: 'find', answers: ['e4f2'], hint: 'A knight check that also hits the queen on d3.', hintSq: 'e4', wrong: 'There\'s something with check.' },
      after: '<p><span class="mv">34...Nf2+!</span> forks king and queen.</p>',
      focus: ['e4', 'd3', 'h1']
    },
    {
      ply: 72, play: true, text: '<p><span class="mv">35.Rxf2 Bxd3 36.Rfd2 Qe3</span>. Black gave up a knight and won White\'s queen.</p>', anchor: 'e3'
    },
    {
      ply: 75, play: true, text: '<p><span class="mv">37.Rxd3</span> grabs the bishop, so material is roughly level again. But look at the activity: <span class="mv">37...Rc1!</span> hits the b1 knight and the d1 rook at once. White\'s knights are still in the mud.</p>', anchor: 'c1', arrows: [['c1', 'd1', 'r']]
    },
    {
      ply: 75, kicker: 'Your move', text: '<p>Tighten the noose.</p>',
      ask: { type: 'find', answers: ['e3f2'], hint: 'Your queen wants to sit right next to White\'s king, on a square no White piece covers.', hintSq: 'f2', wrong: 'Good, but there\'s a crushing quiet move.' },
      after: '<p><span class="mv">38...Qf2!</span> Stockfish sees mate in 7. Every White piece is tied up.</p>',
      focus: ['e3', 'h1', 'g2']
    },
    {
      ply: 80, play: true, text: '<p><span class="mv">40...Re1+</span> and Karpov resigned. It\'s mate in two: <span class="mv">41.Nf1 Rxf1+ 42.Bxf1 Qxf1#</span>.</p><p>Kasparov won the match and, on 9 November 1985, became the youngest world champion up to that time.</p>',
      anchor: 'e1', burst: true
    },
    {
      big: `<div class="eyebrow">What just happened</div><h2>Fewer pawns. A better difference.</h2>
      <p>Karpov held on to his stone, the extra pawn. Kasparov built everything around <b>his</b> differences: the octopus on d3, the rim knights, the c-file. When the pawn came back, every other imbalance was already black.</p>
      <p><span class="hand">Don't count only material. Count differences.</span></p>`
    },
    {
      fen: '2r2k2/4bppp/p2p4/1p1Np3/4P3/8/PPP2PPP/3R2K1 w - - 0 25', orient: 'w', kicker: 'Your scan',
      text: '<p>A fresh position. Material is level. White to move.</p><p>Look at the two minor pieces, and at the pawns on d6 and e5.</p>',
      focus: ['d5', 'e7', 'd6', 'c8', 'd1', 'c2']
    },
    {
      fen: '2r2k2/4bppp/p2p4/1p1Np3/4P3/8/PPP2PPP/3R2K1 w - - 0 25', orient: 'w', kicker: 'Your scan',
      text: '<p>Run Silman\'s scan. Who owns each one?</p>',
      focus: ['d5', 'e7', 'd6'],
      ask: {
        type: 'scan',
        items: [
          { t: '⚖️ Material', a: '=', why: 'Rook and minor piece each, seven pawns each.' },
          { t: '♞ Minor pieces', a: 'w', why: 'The d5 knight can never be kicked. Black\'s bishop is boxed in by its own d6 and e5 pawns.' },
          { t: '♟ Pawn structure', a: 'w', why: 'd6 is backward, on a half-open file, and d5 is a permanent hole.' },
          { t: '🛣️ Open files', a: '=', why: 'Each side has one half-open file: White the d-file, Black the c-file.' }
        ],
        explain: 'Two differences for White, none for Black.'
      }
    },
    {
      fen: '2r2k2/4bppp/p2p4/1p1Np3/4P3/8/PPP2PPP/3R2K1 w - - 0 25', orient: 'w',
      text: '<p>So what\'s White\'s plan?</p>', focus: ['d5', 'e7', 'd6', 'c2', 'c8'],
      ask: {
        type: 'mcq', options: [
          { t: 'Trade the knight for the bishop with 25.Nxe7 to simplify.', why: 'That throws away White\'s best difference. Stockfish: after 25.Nxe7 Kxe7, the edge is gone (about −0.4).' },
          { t: 'Keep the knight, play c3 to blunt the c-file, then bring the king up.', ok: true, why: 'Stockfish\'s top choice (about +0.7). A small edge, but made of stone: it will still be there in 30 moves.' },
          { t: 'Throw the kingside pawns forward to attack.', why: 'There\'s nothing to attack, and it creates new weaknesses. Fight with your difference instead.' }
        ]
      }
    },
    {
      ply: 80, kicker: 'Recall', text: '<p>What did <span class="mv">17.Nab1</span> teach us?</p>',
      ask: {
        type: 'mcq', options: [
          { t: 'Knights belong on the back rank.', why: 'The opposite. That knight was out of play for the rest of the game.' },
          { t: 'Clinging to extra material while your pieces suffer can lose the game.', ok: true, why: 'Yes. Karpov kept the stone and lost the imbalances that mattered.' },
          { t: 'You should never sacrifice a pawn.', why: 'Kasparov sacrificed one and won.' }
        ]
      }
    },
    {
      kicker: 'Recall', text: '<p>What\'s Silman\'s first question in any position?</p>',
      ask: {
        type: 'mcq', options: [
          { t: 'Can I give check?', why: 'That\'s a tactical check, useful but not first.' },
          { t: 'What\'s different here, and which differences are mine?', ok: true, why: 'That\'s it. The plan comes out of the answer.' },
          { t: 'Which move wins material?', why: 'Material is just one imbalance out of nine.' }
        ]
      }
    }
  ],
  stories: {
    agincourt: {
      title: 'Agincourt: fight with your difference', sub: 'Northern France, 25 October 1415',
      frames: [
        { t: '<p>Henry V\'s English army is tired, sick and short of food. It is <b>outnumbered</b> by the French (historians still argue by how much). On paper, it looks hopeless.</p>', show: ['english', 'french'], focus: ['french'] },
        { t: '<p>But Henry fights on ground that suits him: a narrow, freshly ploughed field squeezed between two woods. Heavy rain has turned it into deep <b>mud</b>.</p>', show: ['field', 'woods'], focus: ['field', 'woods'] },
        { t: '<p>His difference is the <b>longbow</b>. Most of his army are archers. They hammer sharpened stakes into the ground and stand behind them.</p>', show: ['archers'], focus: ['archers'] },
        { t: '<p>The heavily armoured French knights advance into the funnel, crowd together and flounder in the mud under a storm of arrows. They can\'t use their numbers.</p>', show: ['advance'], focus: ['advance', 'field'] },
        { t: '<p>Fewer men. A better difference. And ground chosen so the difference counts.</p>', focus: ['archers', 'field', 'french'] }
      ],
      link: {
        warHead: 'Agincourt', war: 'Henry: fewer men, but the right weapon on ground that made the enemy\'s numbers useless.',
        chess: 'Kasparov: a pawn down, but the octopus on d3, and White\'s knights stuck in the mud on a3, b1 and a4.',
        punch: 'Don\'t fight their difference. Fight with yours.'
      },
      draw(m) {
        m.bg(null);
        const f = m.G('field'); m.poly(f, [[110, 120], [575, 60], [575, 285], [110, 220]], { fill: '#a07a55', fillStyle: 'cross-hatch', hachureGap: 9, stroke: m.C.mud, strokeWidth: 1 });
        m.text(f, 345, 250, 'mud', { anchor: 'middle', color: '#6b4f33' });
        const w = m.G('woods'); m.trees(w, 120, 30, 450, 60, 22); m.trees(w, 120, 255, 450, 60, 22);
        m.text(w, 345, 24, 'wood', { anchor: 'middle', cls: 'sm', color: '#2b8a3e' }); m.text(w, 345, 334, 'wood', { anchor: 'middle', cls: 'sm', color: '#2b8a3e' });
        const e = m.G('english'); m.soldiers(e, 70, 140, 2, 6, m.C.blue); m.text(e, 30, 120, 'Henry V', { cls: 'sm' });
        const fr = m.G('french'); m.soldiers(fr, 430, 105, 5, 4, m.C.red); m.soldiers(fr, 430, 165, 5, 3, m.C.red); m.soldiers(fr, 500, 125, 5, 6, m.C.red); m.text(fr, 500, 212, 'the French', { anchor: 'middle' });
        const a = m.G('archers');
        [[95, 112], [95, 232]].forEach(([x, y]) => { for (let k = 0; k < 5; k++) m.poly(a, [[x + k * 10, y], [x + k * 10 + 5, y - 10], [x + k * 10 + 10, y]], { fill: m.C.blue, fillStyle: 'solid', stroke: m.C.blue, strokeWidth: 1 }); });
        for (let k = 0; k < 9; k++) m.line(a, 100, 132 + k * 9, 116, 126 + k * 9, { stroke: '#5c3d1e', strokeWidth: 2.5 });
        m.text(a, 70, 262, 'archers + stakes', { cls: 'sm' });
        const ad = m.G('advance');
        m.arrow(ad, [[430, 120], [330, 140], [230, 160]], m.C.red, 4); m.arrow(ad, [[430, 190], [330, 182], [230, 172]], m.C.red, 4);
        for (let k = 0; k < 8; k++) m.line(ad, 120 + k * 4, 110 + (k % 2) * 140, 230 + k * 14, 150 + (k % 3) * 10, { stroke: m.C.blue, strokeWidth: 1.2, strokeLineDash: [4, 5] });
        m.text(ad, 250, 145, 'stuck', { anchor: 'middle', cls: 'sm', color: '#c92a2a' });
      }
    }
  },
  outro: {
    title: 'You read the differences.',
    points: [
      '🔎 First question: what\'s different here? Then: which differences are mine?',
      '🐙 A knight on a hole no pawn can reach can be worth more than a pawn.',
      '🪨 Holding on to extra material while your pieces die is a trap (17.Nab1).',
      '🏹 Agincourt: fewer men, better weapon, chosen ground.',
      '🎯 Next: bring one of your own games, and we\'ll scan it together.'
    ],
    next: null
  }
};
