// Chapter 1 · Steinitz: accumulate small advantages, then strike.
// Game: Steinitz – von Bardeleben, Hastings 1895 (+ the mate Steinitz showed afterwards).
// All moves checked with chess.js; key claims checked with Stockfish 19.
export default {
  id: 'steinitz',
  kicker: 'Imbalances · Chapter 1 of 3',
  short: 'Steinitz: The Miser\'s Jar',
  title: 'The Miser\'s Jar',
  sub: 'Wilhelm Steinitz and the idea that changed chess: don\'t swing first. Collect small advantages. When the jar is full, the combination appears on its own.',
  meta: '♟ Game: Steinitz – von Bardeleben, Hastings 1895 &nbsp;·&nbsp; 📜 Aha: Fabius, Rome, 217 BC &nbsp;·&nbsp; ⏱ about 15 minutes',
  orient: 'w',
  hud: 'ledger', hudTitle: '🫙 Steinitz\'s jar · White\'s small advantages', ledgerGoal: 6,
  speakers: { coach: { av: '🧭', name: 'Coach' }, story: { av: '📜', name: 'Story' } },
  praise: ['Steinitz would nod.', 'Coin in the jar!', 'That\'s the one.', 'Exactly his move.'],
  pgn: `1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+ 7.Nc3 d5 8.exd5 Nxd5 9.O-O Be6 10.Bg5 Be7 11.Bxd5 Bxd5 12.Nxd5 Qxd5 13.Bxe7 Nxe7 14.Re1 f6 15.Qe2 Qd7 16.Rac1 c6 17.d5 cxd5 18.Nd4 Kf7 19.Ne6 Rhc8 20.Qg4 g6 21.Ng5+ Ke8 22.Rxe7+ Kf8 23.Rf7+ Kg8 24.Rg7+ Kh8 25.Rxh7+
        Kg8 26.Rg7+ Kh8 27.Qh4+ Kxg7 28.Qh7+ Kf8 29.Qh8+ Ke7 30.Qg7+ Ke8 31.Qg8+ Ke7 32.Qf7+ Kd8 33.Qf8+ Qe8 34.Nf7+ Kd7 35.Qd6#`,
  steps: [
    { ply: 0, who: 'story', kicker: '1860s', text: '<p>Chess in the 1860s is a knife fight. Players throw pieces at the enemy king on move 8. Whoever swings first usually wins.</p>' },
    { who: 'story', text: '<p>Wilhelm Steinitz, born in Prague and living in London, asked an odd question: <b>why</b> did those attacks work?</p>' },
    { who: 'story', text: '<p>His answer: they only worked when the attacker <b>already had an advantage</b>. Attack from an equal position and you just punch holes in your own camp.</p><p>Defenders back then were weak, so nobody noticed.</p>' },
    {
      big: `<div class="eyebrow">First principle</div><h2>Don't swing first. Fill the jar.</h2>
      <p>A position is made of small, lasting details: a safer king, an open file, a weak pawn, a hole in the enemy camp. Each one is a coin.</p>
      <p>Collect coins quietly. When the jar is full, the winning combination <span class="hand">shows up on its own</span>.</p>
      <ul><li>⚖️ Equal position? Don't attack. Manoeuvre and collect.</li><li>🫙 More coins than your opponent? Now you <b>must</b> attack, or the edge leaks away.</li><li>🛡️ Fewer coins? Defend, and give up only what you have to.</li></ul>`
    },
    { ply: 0, text: '<p><b>Hastings, 1895.</b> Steinitz is 59. He lost his world title to Emanuel Lasker the year before. Across the board: Curt von Bardeleben, a strong German master.</p><p>Watch the <b>jar</b>. Every small lasting edge White collects drops in as a coin.</p>' },
    { ply: 12, play: true, text: '<p>A sharp Italian opening. Black gives a check with the bishop. So far, nothing special.</p>' },
    { ply: 24, play: true, text: '<p>A flurry of trades in the centre. The board looks level. A Romantic player would be bored.</p><p>Steinitz starts <b>counting</b>.</p>', anchor: 'd5' },
    {
      ply: 26, play: true, gain: { icon: '🏰', label: 'Safer king: White castled, Black\'s king is still on e8' },
      text: '<p><b>Coin 1.</b> White\'s king is tucked away on g1. Black\'s king is still in the middle, on e8, behind a knight.</p>',
      anchor: 'e8', circles: [['e8', 'r'], ['g1', 'g']]
    },
    {
      ply: 26, kicker: 'Your move', text: '<p>You are Steinitz. Black\'s king sits on a file with no pawns on it. Which move leans on it?</p>',
      ask: {
        type: 'find', answers: ['f1e1'], hint: 'The e-file is wide open. Which of your pieces loves open files?', hintSq: 'f1',
        wrong: 'Not quite. Think open file.',
        alts: { d1e2: 'Good instinct: Qe2 also lines up on the e-file, and engines rate it about as high. Steinitz used the rook first. Let\'s follow him.' }
      },
      after: '<p><span class="mv">14.Re1!</span> The knight on e7 is now <b>pinned</b>: if it moves, the rook hits the king.</p>',
      focus: ['e7', 'e8']
    },
    {
      text: '<p>Black would love to castle and run away. Why can\'t he?</p>',
      anchor: 'e7', arrows: [['e1', 'e8', 'r']],
      ask: {
        type: 'mcq', options: [
          { t: 'Castling is illegal: the king is in check.', why: 'No check here. Castling is legal. It\'s just bad.' },
          { t: 'Castling unpins the knight, so <span class="mv">Rxe7</span> grabs it for free.', ok: true, why: 'Right. Today the king guards e7. After castling, nobody does. Stockfish gives White about +5.7 after 14...O-O 15.Rxe7.' },
          { t: 'Black\'s king has already moved, so he lost the right.', why: 'The king hasn\'t moved at all. The right is still there. Using it just loses a piece.' }
        ]
      }
    },
    {
      gain: { icon: '📌', label: 'The e-file pin on the e7 knight' },
      text: '<p><b>Coin 2.</b> The pin. Black\'s king is stuck in the centre because the knight in front of it is tied down.</p>',
      anchor: 'e7', arrows: [['e1', 'e7', 'r']]
    },
    {
      ply: 28, play: true, gain: { icon: '🕳️', label: 'A hole on e6 after ...f6' },
      text: '<p>Von Bardeleben plays <span class="mv">14...f6</span> to make room for his king on f7. Sensible.</p><p>But it costs him: <b>e6</b> is now a hole. No Black pawn can ever guard it again. <b>Coin 3.</b></p>',
      anchor: 'e6', tint: { e6: 'y' }, circles: [['e6', 'y']]
    },
    {
      ply: 31, play: true, gain: { icon: '🛣️', label: 'Control of the open c-file' },
      text: '<p><span class="mv">15.Qe2 Qd7 16.Rac1</span>. Quiet moves. The queen joins the e-file, the other rook takes the open c-file. <b>Coin 4.</b></p><p>No threats yet. Just coins.</p>',
      anchor: 'c1', arrows: [['c1', 'c7', 'g']]
    },
    {
      ply: 32, play: true, text: '<p>Black plays <span class="mv">16...c6</span>. Now look at <b>White\'s</b> pawn on d4: no neighbours, can\'t be guarded by a pawn. It\'s an isolated pawn, White\'s one real weakness.</p>',
      anchor: 'd4', circles: [['d4', 'r']]
    },
    {
      ply: 32, kicker: 'Your move', text: '<p>Steinitz has a beautiful idea: get rid of the weakness and <b>win a square</b> for his knight. Find it.</p>',
      ask: { type: 'find', answers: ['d4d5'], hint: 'A pawn you can\'t keep can be given away, for something better. Push it.', hintSq: 'd4', wrong: 'Not this. Look at the lonely pawn.' },
      after: '<p><span class="mv">17.d5!</span> If Black takes, the <b>d4</b> square opens for the knight, and from d4 it can hop into the hole on e6. Stockfish agrees: nothing else comes close.</p>',
      focus: ['d4', 'f3', 'e6']
    },
    {
      ply: 34, play: true, gain: { icon: '🔁', label: 'White\'s weak pawn traded off; Black now owns the lonely d5 pawn' },
      text: '<p>Black took. White\'s weakness is gone, and now <b>Black</b> owns the isolated pawn on d5. <b>Coin 5.</b></p>',
      anchor: 'd5', circles: [['d5', 'r']], arrows: [['f3', 'd4', 'b'], ['d4', 'e6', 'b']]
    },
    {
      ply: 36, play: true, text: '<p><span class="mv">18.Nd4</span>, heading for the hole. Black\'s king steps to f7 to guard e6 itself.</p>',
      anchor: 'd4', arrows: [['d4', 'e6', 'b']], tint: { e6: 'y' }
    },
    {
      ply: 36, kicker: 'Your move', text: '<p>The hole is right there. Put the knight in it.</p>',
      ask: { type: 'find', answers: ['d4e6'], hint: 'The square Black weakened with ...f6.', hintSq: 'e6', wrong: 'Not that one. Where is the hole?' },
      after: '<p><span class="mv">19.Ne6!</span> No Black pawn can ever chase it away. It stares at c7, d8, f8 and g7.</p>',
      focus: ['e6', 'f7']
    },
    {
      ply: 38, play: true, gain: { icon: '🐴', label: 'Knight planted on e6, next to the king' },
      text: '<p><b>Coin 6.</b> The knight sits on e6 like it owns the place. Black plays <span class="mv">19...Rhc8</span> to fight for the c-file.</p><p>The jar is full.</p>',
      anchor: 'e6', circles: [['e6', 'g']]
    },
    { ply: 38, text: '<p>Pause here. Six coins, and Steinitz still hasn\'t sacrificed a thing.</p><p>Before he strikes, a story from 217 BC.</p>', nextLabel: 'Tell me →' },
    { ply: 38, story: 'fabius' },
    {
      ply: 40, play: true, text: '<p><span class="mv">20.Qg4</span> threatens Qxg7. Black covers with <span class="mv">20...g6</span>.</p><p>Fabius is done collecting. Now it\'s Zama.</p>',
      anchor: 'g4', arrows: [['g4', 'g7', 'r']]
    },
    {
      ply: 42, play: true, text: '<p><span class="mv">21.Ng5+</span> and the king is pushed back to e8, right in line with the pinned knight.</p>',
      anchor: 'e8', focus: ['e7', 'g5', 'g4', 'c1', 'c8']
    },
    {
      ply: 42, kicker: 'The strike', text: '<p>You may remember this position from the <b>Tactics</b> page. Find the move that made Hastings famous.</p>',
      ask: { type: 'find', answers: ['e1e7'], hint: 'The pinned knight on e7. What if you don\'t pin it, but take it?', hintSq: 'e7', wrong: 'Not yet the strike.' },
      after: '<p><span class="mv">22.Rxe7+!!</span> The king or the queen can take the rook, and White\'s own queen on g4 is hanging too. None of it works for Black.</p>',
      focus: ['e7', 'g4', 'c1', 'g5']
    },
    {
      text: '<p>Why can\'t Black\'s queen just take the rook?</p>',
      anchor: 'd7', arrows: [['c1', 'c8', 'r']],
      ask: {
        type: 'mcq', options: [
          { t: 'The queen is pinned to the king.', why: 'Not pinned. The issue is what she\'s already guarding.' },
          { t: 'She also guards the c8 rook. After 22...Qxe7, <span class="mv">23.Rxc8+</span> wins it.', ok: true, why: 'Exactly. She can\'t guard both e7 and c8: she\'s overloaded. 23.Rxc8+ Rxc8 24.Qxc8+ and White is a piece up.' },
          { t: 'Capturing would be illegal.', why: 'It\'s legal. Just losing.' }
        ]
      }
    },
    {
      ply: 49, play: true, text: '<p>The rook dances along the 7th rank, check after check, and still can\'t be taken.</p><p>After <span class="mv">25.Rxh7+</span>, von Bardeleben stood up, left the hall, and never came back. He let his clock run out rather than resign.</p>',
      anchor: 'h7'
    },
    { ply: 49, text: '<p>Steinitz then showed the spectators the forced mate he had seen. Watch it.</p>', nextLabel: 'Play the mate →' },
    {
      ply: 69, play: true, text: '<p><span class="mv">35.Qd6#</span>. Checkmate.</p><p>Now look back: without coins, <span class="mv">Rxe7</span> would just have been a rook blunder. The pin, the hole, the c-file and the knight on e6 made it work.</p>',
      anchor: 'd6', burst: true
    },
    {
      big: `<div class="eyebrow">What just happened</div><h2>The combination is the reward, not the plan.</h2>
      <p>Steinitz never went looking for a sacrifice. He collected six small, lasting edges. When there were enough of them, the sacrifice was simply <span class="hand">sitting there.</span></p>
      <p>He became the first official world champion in 1886, and every coach since has taught some version of his jar.</p>`
    },
    {
      fen: 'r3k2r/pp1bnppp/3q4/3p4/3N4/1B3Q2/PP3PPP/2R1R1K1 w - - 0 20', kicker: 'Your scan',
      text: '<p>A new position. Black is a <b>pawn up</b>. His king has already moved, so he can\'t castle. White to move.</p><p>Take a good look first.</p>',
      focus: ['e8', 'e7', 'd5', 'd4', 'c1', 'e1', 'b3', 'f3']
    },
    {
      fen: 'r3k2r/pp1bnppp/3q4/3p4/3N4/1B3Q2/PP3PPP/2R1R1K1 w - - 0 20', kicker: 'Your scan',
      text: '<p>Tap every small advantage <b>White</b> has.</p>',
      focus: ['e8', 'e7', 'd5', 'd4', 'c1', 'e1', 'b3', 'f3'],
      ask: {
        type: 'multi', options: [
          { t: '🏰 Stuck black king', ok: true },
          { t: '📌 e-file pin', ok: true },
          { t: '🛣️ Open c-file', ok: true },
          { t: '♟ Isolated d5 pawn', ok: true },
          { t: '⚖️ Extra material' },
          { t: '♗♗ Bishop pair' }
        ],
        explain: 'White has four coins; Black has one pawn. Stockfish rates it about +5.7 for White. Extra material and the bishop pair don\'t apply: Black has the extra pawn, and each side has one bishop.'
      }
    },
    {
      fen: 'r3k2r/pp1bnppp/3q4/3p4/3N4/1B3Q2/PP3PPP/2R1R1K1 w - - 0 20',
      text: '<p>So, in Steinitz\'s eyes, who has the duty to attack here?</p>', focus: ['e8', 'e7', 'd5', 'd4', 'b3', 'f3'],
      ask: {
        type: 'mcq', options: [
          { t: 'Black. He\'s a pawn up.', why: 'One coin against four. The pawn will matter later, if Black survives.' },
          { t: 'White. More coins means you must act before they leak away.', ok: true, why: 'Right. Steinitz\'s rule: the side with the advantage is obliged to attack. Wait too long and Black castles by hand, untangles, and the pawn starts to count.' },
          { t: 'Nobody. Keep it safe and see what happens.', why: 'That\'s how advantages evaporate. Dynamic edges, like a stuck king, don\'t last.' }
        ]
      }
    },
    {
      ply: 69, kicker: 'Recall', text: '<p>Quick one, from memory.</p><p>Why did <span class="mv">17.d5!</span> work?</p>', anchor: null,
      ask: {
        type: 'mcq', options: [
          { t: 'It traded White\'s weak pawn for a great square (d4, then e6) for the knight.', ok: true, why: 'Yes. A weakness you can\'t keep can be swapped for something better.' },
          { t: 'It won material by force.', why: 'It gave a pawn. What it won was a square.' },
          { t: 'It was a trap that Black fell into.', why: 'Not a trap. A trade of one small thing for a bigger small thing.' }
        ]
      }
    },
    {
      kicker: 'Recall', text: '<p>In Steinitz\'s theory, <b>when</b> should you launch a combination?</p>',
      ask: {
        type: 'mcq', options: [
          { t: 'Whenever you can give a check.', why: 'Checks are tempting. Steinitz wanted reasons, not checks.' },
          { t: 'In the first ten moves, before the opponent develops.', why: 'That\'s the Romantic way he argued against.' },
          { t: 'When enough small advantages have piled up.', ok: true, why: 'Exactly. Fill the jar, then strike.' }
        ]
      }
    }
  ],
  stories: {
    fabius: {
      title: 'Fabius: the Delayer', sub: 'Italy, 217 to 202 BC',
      frames: [
        { t: '<p>Hannibal has crossed the Alps into Italy and smashed two Roman armies. Rome panics and hands emergency command to one man: <b>Quintus Fabius Maximus</b>.</p>', show: ['hills', 'hannibal'] },
        { t: '<p>Fabius refuses to fight a big battle. He shadows Hannibal through the hills, always on high ground, never charging head-on.</p>', show: ['fabius'], focus: ['fabius'] },
        { t: '<p>Instead he collects <b>tiny wins</b>: a foraging party ambushed here, a supply line cut there. No glory. Just coins.</p>', show: ['raids'], focus: ['raids', 'hannibal'] },
        { t: '<p>Rome got impatient. People mocked him as <i>Cunctator</i>, "the Delayer". The next year Rome went for a big battle at <b>Cannae</b>. It became one of the worst defeats in Roman history.</p>', show: ['cannae'], focus: ['cannae'] },
        { t: '<p>So Rome went back to the slow way, and the nickname became an honour. Years later Scipio carried the war to Africa and beat Hannibal at <b>Zama</b> in 202 BC.</p>', show: ['zama'], focus: ['zama'] }
      ],
      link: {
        warHead: 'Fabius', war: 'Collect small wins. Refuse the early, big battle. Strike only when the enemy is worn down.',
        chess: 'Steinitz collected six coins before <b>22.Rxe7+</b>. The sacrifice was his Zama, at the end.',
        punch: 'Cannae is what happens when you strike with an empty jar.'
      },
      draw(m) {
        m.bg(null);
        const h = m.G('hills'); m.hills(h, 30, 128, 540, 9); m.text(h, 300, 42, 'the hills', { anchor: 'middle', cls: 'sm', color: '#8d6e4f' });
        const ha = m.G('hannibal'); m.soldiers(ha, 250, 205, 9, 3, m.C.red); m.text(ha, 300, 262, 'Hannibal\'s army', { anchor: 'middle' });
        const f = m.G('fabius'); m.soldiers(f, 118, 70, 6, 2, m.C.blue); m.text(f, 150, 112, 'Fabius, on high ground', { anchor: 'middle', cls: 'sm' });
        m.curve(f, [[195, 90], [260, 100], [330, 98], [400, 92]], { stroke: m.C.blue, strokeWidth: 2, strokeLineDash: [6, 6] });
        const r = m.G('raids');
        [[440, 230], [470, 270], [200, 280]].forEach(([x, y]) => { m.ellipse(r, x, y, 12, 12, { fill: m.C.red, fillStyle: 'solid', stroke: m.C.red }); m.cross(r, x, y, 10, m.C.blue); });
        m.line(r, 12, 300, 240, 232, { stroke: m.C.red, strokeWidth: 2, strokeLineDash: [8, 6] }); m.cross(r, 120, 268, 12, m.C.blue);
        m.text(r, 470, 312, 'foragers ambushed', { anchor: 'middle', cls: 'sm' }); m.text(r, 60, 255, 'supplies cut', { cls: 'sm' });
        const c = m.G('cannae'); m.cross(c, 540, 220, 22, m.C.red); m.text(c, 540, 182, 'Cannae, 216 BC', { anchor: 'middle' });
        const z = m.G('zama'); m.arrow(z, [[60, 40], [40, 120], [70, 200]], m.C.blue, 4); m.text(z, 95, 196, 'Zama, 202 BC', {}); m.text(z, 95, 220, '(Africa)', { cls: 'sm' });
      }
    }
  },
  outro: {
    title: 'You filled your first jar.',
    points: [
      '🫙 Small, lasting edges are coins: safer king, open files, holes, weak pawns, a planted knight.',
      '⚖️ Equal position? Collect. Ahead on coins? Attack, or it leaks away.',
      '🔁 A weakness you can\'t keep can be traded for something better (17.d5!).',
      '📜 Fabius collected; Zama struck. Steinitz did the same with 22.Rxe7+.'
    ],
    next: { href: 'dynamic.html', label: 'Chapter 2: Stone vs Fire →' }
  }
};
