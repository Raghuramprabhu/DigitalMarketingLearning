// Chapter 2 · Static vs dynamic advantages.
// Game: Morphy – Duke Karl of Brunswick & Count Isouard, Paris 1858 ("The Opera Game").
// Evaluations quoted are Stockfish 19 (depth 18).
export default {
  id: 'dynamic',
  kicker: 'Imbalances · Chapter 2 of 3',
  short: 'Stone vs Fire',
  title: 'Stone vs Fire',
  sub: 'Some advantages are made of stone: they last. Some are made of fire: they burn bright, then go out. Paul Morphy shows what happens when you use fire before it fades.',
  meta: '♟ Game: Morphy – Duke of Brunswick & Count Isouard, Paris 1858 &nbsp;·&nbsp; 💡 Aha: France, May 1940 &nbsp;·&nbsp; ⏱ about 12 minutes',
  orient: 'w',
  hud: 'meters', hudTitle: '🪨 Stone vs 🔥 Fire · live from the board',
  speakers: { coach: { av: '🧭', name: 'Coach' }, story: { av: '📜', name: 'Story' } },
  praise: ['Morphy\'s move!', 'Keep the fire burning.', 'No halting.', 'That\'s the spirit.'],
  pgn: `1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7 8.Nc3 c6 9.Bg5 b5 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7 14.Rd1 Qe6 15.Bxd7+ Nxd7 16.Qb8+ Nxb8 17.Rd8#`,
  steps: [
    { ply: 0, text: '<p>Last chapter, every coin in Steinitz\'s jar was the same kind of thing. They aren\'t.</p><p>Some advantages are made of <b>stone</b>. Some are made of <b>fire</b>.</p>' },
    {
      big: `<div class="eyebrow">First principle</div><h2>Stone lasts. Fire burns out.</h2>
      <div class="two"><div><h4>🪨 Static (stone)</h4>Extra material, a better pawn structure, a good bishop against a bad one, a permanent outpost. Still there in 20 moves.</div>
      <div><h4>🔥 Dynamic (fire)</h4>A lead in development, the initiative, an enemy king stuck in the centre. Strong now, gone if you play slow moves.</div></div>
      <p>The rule: <span class="hand">use fire fast.</span> If you have to, feed it with stone (sacrifice material) to keep it burning.</p>`
    },
    { ply: 0, text: '<p>Watch the two meters. <b>Stone</b> counts material. <b>Fire</b> counts pieces in play. Both read the board live, every move.</p>' },
    { ply: 0, who: 'story', kicker: 'Paris, 1858', text: '<p>Paul Morphy, 21, from New Orleans, is the strongest player alive. He\'s at the opera, and two noblemen in a private box, the <b>Duke of Brunswick</b> and <b>Count Isouard</b>, insist on playing him together.</p><p>He reportedly wanted to watch the show, so he played fast.</p>' },
    {
      ply: 8, play: true, text: '<p>Black pins the knight, then trades the bishop off for it: <span class="mv">4...Bxf3</span>.</p><p>Black spent a developed piece to keep the material level. A <b>stone</b>-minded choice.</p>',
      anchor: 'f3'
    },
    {
      ply: 10, play: true, text: '<p>Material is level. Now read the Fire meter: White\'s queen is already out. Black has nothing in play.</p>',
      anchor: 'f3'
    },
    {
      ply: 12, play: true, text: '<p><span class="mv">6.Bc4</span> threatens <span class="mv">Qxf7</span> mate. Black blocks with <span class="mv">6...Nf6</span>.</p>',
      anchor: 'f7', arrows: [['f3', 'f7', 'r'], ['c4', 'f7', 'r']]
    },
    {
      ply: 14, play: true, text: '<p><span class="mv">7.Qb3!</span> hits f7 and b7 at the same time. Black defends f7 with the queen: <span class="mv">7...Qe7</span>.</p>',
      anchor: 'e7', arrows: [['b3', 'f7', 'r'], ['b3', 'b7', 'r']]
    },
    {
      text: '<p><span class="mv">...Qe7</span> saves f7. What does it <b>cost</b> Black?</p>', anchor: 'e7', focus: ['f8', 'h8'],
      ask: {
        type: 'mcq', options: [
          { t: 'The queen blocks the f8 bishop, so Black\'s kingside can\'t develop or castle soon.', ok: true, why: 'Yes. The bishop on f8 is buried, the h8 rook is stuck, the king can\'t castle. Black\'s fire meter stays near zero.' },
          { t: 'It loses the b7 pawn by force.', why: 'b7 is attacked, but Black isn\'t forced to lose it. The real cost is on the other side.' },
          { t: 'Nothing. It\'s a perfect move.', why: 'It defends, but look at f8 and h8. Two pieces just lost their way out.' }
        ]
      }
    },
    {
      text: '<p>Why <span class="mv">8.Nc3</span>, and not <span class="mv">8.Qxb7</span>?</p>', anchor: 'b7', focus: ['b1', 'b3'],
      ask: {
        type: 'mcq', options: [
          { t: 'He missed that b7 was hanging.', why: 'Morphy missed very little. This was a choice.' },
          { t: 'After Qxb7, ...Qb4+ offers a queen trade. Without queens, a development lead counts for less.', ok: true, why: 'That\'s the fire mindset. Honest note: Stockfish says 8.Qxb7 is also very strong (about +3.2 vs +2.4). Morphy\'s choice shows how he valued fire over stone.' },
          { t: 'b7 is poisoned: Qxb7 loses the queen.', why: 'It doesn\'t lose the queen. Engines like Qxb7. The question is about style.' }
        ]
      }
    },
    {
      ply: 18, play: true, text: '<p><span class="mv">9.Bg5</span> pins the f6 knight. Black lashes out: <span class="mv">9...b5</span>, hitting the bishop on c4.</p>',
      anchor: 'b5', arrows: [['b5', 'c4', 'r']]
    },
    { ply: 18, text: '<p>Decision point. Retreat the bishop, or keep the fire burning?</p><p>First, a story about a famous pause.</p>', nextLabel: 'Tell me →' },
    { ply: 18, story: 'france1940' },
    {
      ply: 18, kicker: 'Your move', text: '<p>Morphy didn\'t halt. Find his move.</p>',
      ask: { type: 'find', answers: ['c3b5'], hint: 'Don\'t retreat. What can capture on b5?', hintSq: 'c3', wrong: 'That\'s a slow move. Fire needs speed.', alts: { c4b5: 'Close, but Morphy took with the knight first, so the bishop can recapture with check next move.' } },
      after: '<p><span class="mv">10.Nxb5!</span> A whole knight for two pawns.</p><p>Stockfish puts numbers on it: retreat with 10.Be2 and White\'s edge drops to about <b>0</b>. Sacrifice, and it\'s about <b>+4</b>. That gap is the fire.</p>',
      focus: ['b5', 'c4', 'g5', 'b3']
    },
    {
      ply: 22, play: true, text: '<p><span class="mv">11.Bxb5+</span> and Black blocks with the knight. Look at <b>Stone</b>: Black is up material. Now look at <b>Fire</b>.</p>',
      anchor: 'd7', focus: ['b5', 'g5', 'f6', 'e8']
    },
    {
      ply: 22, kicker: 'Your move', text: '<p>White still has pieces asleep. Wake two of them up with one move, and land on the open d-file.</p>',
      ask: { type: 'find', answers: ['e1c1'], castle: 'e1a1', hint: 'Your king and a rook can move in a single turn.', hintSq: 'e1', wrong: 'Useful, but slower. One move can bring two pieces.' },
      after: '<p><span class="mv">12.O-O-O!</span> The king hides on c1 and the rook arrives on d1, aiming straight at the pinned knight on d7.</p>',
      focus: ['d7', 'b5', 'e1']
    },
    { ply: 24, play: true, text: '<p>Black guards d7 one more time: <span class="mv">12...Rd8</span>.</p>', anchor: 'd8' },
    {
      text: '<p>Morphy now plays <span class="mv">13.Rxd7</span>, giving a rook for a knight. Why throw more stone on the fire?</p>', anchor: 'd7', focus: ['d1', 'h1', 'b5', 'g5'],
      ask: {
        type: 'mcq', options: [
          { t: 'To trade down into a quiet endgame.', why: 'Trading down helps the side with more stone, which is Black.' },
          { t: 'To remove a defender and bring his last rook in with tempo.', ok: true, why: 'Yes. After Rxd7 Rxd7, the h1 rook jumps to d1 and pins again. Every White piece joins the attack.' },
          { t: 'It\'s a blunder that happened to work.', why: 'This is still one of the most-taught games in history. The sacrifice was the point.' }
        ]
      }
    },
    { ply: 28, play: true, text: '<p><span class="mv">13.Rxd7 Rxd7 14.Rd1 Qe6</span>. Every White piece is attacking. Black\'s f8 bishop and h8 rook still haven\'t moved.</p>', anchor: 'd1', focus: ['f8', 'h8', 'd7', 'b5', 'g5', 'b3'] },
    { ply: 30, play: true, text: '<p><span class="mv">15.Bxd7+ Nxd7</span>. More stone burned.</p><p>White has a queen, a rook and a bishop left. Look at who\'s guarding d8.</p>', anchor: 'd7' },
    {
      ply: 30, kicker: 'Your move', text: '<p>Mate in two. The most expensive move on the board is the right one.</p>',
      ask: { type: 'find', answers: ['b3b8'], hint: 'A queen sacrifice, with check, that drags the d7 knight away from guarding d8.', hintSq: 'b8', wrong: 'Strong, but there\'s a mate here.' },
      after: '<p><span class="mv">16.Qb8+!!</span> The knight must take: <span class="mv">16...Nxb8</span>. And then...</p>',
      focus: ['d7', 'd1', 'g5', 'e8']
    },
    {
      ply: 33, play: true, text: '<p><span class="mv">17.Rd8#</span>.</p><p>Look at the Stone meter: White is way <b>behind</b> in material. Look at the board: checkmate. Fire beats stone, if you use it before it burns out.</p>',
      anchor: 'd8', burst: true
    },
    {
      big: `<div class="eyebrow">What just happened</div><h2>Morphy fed the fire with stone.</h2>
      <p>Every time Black was about to catch up on development, Morphy threw material in: a knight on b5, a rook on d7, then his queen. Each sacrifice bought <b>time</b>, and time was the only thing his advantage was made of.</p>
      <p><span class="hand">Stone can wait. Fire can't.</span></p>`
    },
    {
      ply: 33, kicker: 'Sort it', text: '<p>Stone or fire? Sort each advantage.</p>', free: true,
      ask: {
        type: 'sort', bins: [['s', '🪨 Stone'], ['d', '🔥 Fire']],
        items: [
          { t: 'An extra pawn', a: 's' },
          { t: 'A lead in development', a: 'd' },
          { t: 'A better pawn structure', a: 's' },
          { t: 'The enemy king stuck in the centre', a: 'd', why: 'He will castle eventually, unless you hurry.' },
          { t: 'The bishop pair', a: 's' },
          { t: 'The initiative: you\'re making the threats', a: 'd' }
        ],
        explain: 'Stone stays. Fire has a timer on it.'
      }
    },
    {
      fen: 'r1bqk2r/pp2bppp/2nppn2/8/2B1P3/2N2N2/PP2QPPP/R1B2RK1 w kq - 4 9', kicker: 'Your scan',
      text: '<p>A real opening: the <b>Morra Gambit</b>. White gave up a pawn on move 3.</p><p>Check the meters: Black has the stone, White has the fire.</p>',
      focus: ['d6', 'e8', 'c4', 'e2', 'f1', 'a1', 'c1']
    },
    {
      fen: 'r1bqk2r/pp2bppp/2nppn2/8/2B1P3/2N2N2/PP2QPPP/R1B2RK1 w kq - 4 9', kicker: 'Your scan',
      text: '<p>White to move. Which plan fits?</p>',
      focus: ['d6', 'e8', 'c4', 'e2', 'f1'],
      ask: {
        type: 'mcq', options: [
          { t: '9.h3: make a safe square for the king first.', why: 'Solid, but slow. Stockfish gives Black the edge after it (about −0.4): Black castles and the extra pawn starts to count.' },
          { t: 'Trade pieces to blunt Black\'s attacking chances.', why: 'Trades help the side with more stone. That\'s Black here.' },
          { t: '9.Rd1: rook to the open file, hitting d6, keeping the momentum.', ok: true, why: 'That\'s also Stockfish\'s top choice. It calls the position about equal: White\'s fire pays for the missing pawn, but only while it keeps moving.' }
        ]
      }
    },
    {
      ply: 33, kicker: 'Recall', text: '<p>In May 1940, why was the three-day halt before Dunkirk so costly?</p>',
      ask: {
        type: 'mcq', options: [
          { t: 'The tanks ran out of fuel for good.', why: 'They were ordered to stop. They could have kept going.' },
          { t: 'A speed advantage leaked away while it waited, and the Allies escaped by sea.', ok: true, why: 'Exactly. Dynamic advantages have a timer.' },
          { t: 'The Maginot Line counter-attacked.', why: 'The forts were bypassed. They never came into it.' }
        ]
      }
    },
    {
      kicker: 'Recall', text: '<p>Which advantage gets <b>weaker</b> the longer you wait?</p>',
      ask: {
        type: 'mcq', options: [
          { t: 'An extra pawn', why: 'That\'s stone. It usually gets stronger as pieces come off.' },
          { t: 'A lead in development', ok: true, why: 'Yes. Your opponent catches up one move at a time.' },
          { t: 'A good bishop against a bad one', why: 'That\'s stone. It lasts as long as the pawns stay where they are.' }
        ]
      }
    }
  ],
  stories: {
    france1940: {
      title: 'France, 1940: concrete vs speed', sub: 'Western Front, 10 May to 4 June 1940',
      frames: [
        { t: '<p>In the 1930s France built the <b>Maginot Line</b>: a chain of forts along the German border. A static advantage, made of concrete, built to last for decades.</p>', show: ['base', 'border', 'maginot'], focus: ['maginot'] },
        { t: '<p>On 10 May 1940 the main German tank force went through the <b>Ardennes</b> forest instead, ground French planners had judged too difficult for a fast armoured attack.</p>', show: ['ardennes'], focus: ['ardennes'] },
        { t: '<p>By 13 May they had crossed the Meuse at <b>Sedan</b>. Then they raced west and reached the Channel coast around 20 May, cutting the Allied armies in two. The forts were never broken. They were <b>bypassed</b>.</p>', show: ['thrust'], focus: ['thrust'] },
        { t: '<p>Then, on 24 May, the tanks were ordered to <b>halt</b> for about three days. In that pause the Allies dug in at <b>Dunkirk</b> and over 330,000 soldiers escaped by sea.</p>', show: ['dunkirk'], focus: ['dunkirk'] },
        { t: '<p>The fire won while it moved. It leaked away the moment it waited.</p>', focus: ['thrust', 'dunkirk', 'maginot'] }
      ],
      link: {
        warHead: 'France, 1940', war: 'Concrete lasts, but it can be bypassed. Speed wins, but it burns out the moment you pause.',
        chess: 'Material is concrete. A development lead is speed. Morphy never paused: Nxb5, Rxd7, Qb8+.',
        punch: 'If you have fire, don\'t halt before Dunkirk.'
      },
      draw(m) {
        m.bg(null);
        const b = m.G('base');
        m.poly(b, [[6, 6], [150, 6], [120, 70], [80, 130], [6, 150]], { fill: m.C.sea, fillStyle: 'hachure', hachureGap: 6, stroke: '#4dabf7' });
        m.text(b, 22, 40, 'Channel', { cls: 'sm', color: '#1864ab', rot: -28 });
        m.ellipse(b, 230, 255, 12, 12, { fill: m.C.ink, fillStyle: 'solid' }); m.text(b, 230, 285, 'Paris', { anchor: 'middle' });
        m.text(b, 520, 60, 'Germany', { anchor: 'middle', cls: 'big', color: '#868e96' }); m.text(b, 330, 40, 'Belgium', { anchor: 'middle', cls: 'sm', color: '#868e96' });
        const bd = m.G('border'); m.curve(bd, [[420, 10], [445, 120], [455, 200], [475, 330]], { stroke: '#868e96', strokeWidth: 2, strokeLineDash: [8, 7] });
        const mg = m.G('maginot');
        for (let k = 0; k < 12; k++) { const t = k / 11, x = 452 + t * 22, y = 180 + t * 145; m.line(mg, x - 12, y, x + 12, y - 4, { stroke: m.C.ink, strokeWidth: 4, roughness: .8 }); }
        m.text(mg, 395, 315, 'Maginot Line', { anchor: 'middle' });
        const ar = m.G('ardennes'); m.trees(ar, 340, 85, 85, 70, 14); m.text(ar, 385, 182, 'Ardennes', { anchor: 'middle' });
        const th = m.G('thrust'); m.arrow(th, [[560, 120], [440, 118], [345, 150], [230, 120], [125, 100]], m.C.red, 6);
        m.ellipse(th, 340, 150, 10, 10, { fill: m.C.red, fillStyle: 'solid', stroke: m.C.red }); m.text(th, 330, 200, 'Sedan, 13 May', { anchor: 'middle', cls: 'sm' });
        m.text(th, 170, 150, 'coast, 20 May', { anchor: 'middle', cls: 'sm' });
        const dk = m.G('dunkirk'); m.ellipse(dk, 168, 38, 12, 12, { fill: m.C.blue, fillStyle: 'solid', stroke: m.C.blue }); m.text(dk, 205, 30, 'Dunkirk', {});
        m.rect(dk, 250, 44, 8, 26, { fill: m.C.amber, fillStyle: 'solid', stroke: m.C.amber }); m.rect(dk, 264, 44, 8, 26, { fill: m.C.amber, fillStyle: 'solid', stroke: m.C.amber });
        m.text(dk, 282, 66, 'halt, 24 May', { cls: 'sm', color: '#a35a00' });
        m.arrow(dk, [[160, 34], [120, 22], [70, 14]], m.C.blue, 3);
      }
    }
  },
  outro: {
    title: 'You can tell stone from fire.',
    points: [
      '🪨 Static edges (material, structure, good bishop, outposts) last. Play slowly and they still count.',
      '🔥 Dynamic edges (development, initiative, a stuck king) have a timer. Use them now.',
      '🔁 To keep fire burning, you may have to feed it stone: Nxb5, Rxd7, Qb8+.',
      '💡 1940: concrete bypassed, speed decisive, and a pause that let the enemy escape.'
    ],
    next: { href: 'imbalances.html', label: 'Chapter 3: Fight With Your Difference →' }
  }
};
