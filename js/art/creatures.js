// Small animals. All authored facing right; the engine mirrors them.
import { P } from '../palette.js';
import { sprite } from '../pixel.js';

// ------------------------------------------------------------------ chicken

const HEN = {
  o: '#4a3346',
  w: P.white,
  g: '#e3d6c0',
  G: '#c4b3a2',
  r: P.red2,
  R: P.red3,
  y: P.gold3,
  Y: P.gold4,
  e: P.ink,
};

const HEN_BROWN = {
  ...HEN,
  w: '#d9925a',
  g: '#b86c40',
  G: '#8f4c34',
};

const HEN_STAND = [
  '..........or....',
  '.........orrro..',
  '.........owwwo..',
  '.oo.....owwwwo..',
  'owwo....owwewyy.',
  'owwwo...owwwwyo.',
  '.owwwo.oowwwro..',
  '.owwwwowwwwwro..',
  '.owwwwwwwwwwo...',
  '..owwgwwwwwwo...',
  '..owwwggggwgo...',
  '..ogwwwwwwggo...',
  '...oGggggGoo....',
  '....ooyooyo.....',
  '......y..y......',
  '.....yy.yy......',
];

const HEN_PECK = [
  '................',
  '................',
  '................',
  '..oo............',
  '.owwo...........',
  '.owwwo..........',
  '..owwwooooo.....',
  '..owwwwwwwwoo...',
  '..owwwwwwwwwwo..',
  '..owwgwwwwwwwo..',
  '..owwwggggwwwror',
  '..ogwwwwwwgwwwro',
  '...oGggggGowewo.',
  '....ooyooyoowyo.',
  '......y..y..yyo.',
  '.....yy.yy...o..',
];

function henFrames(pal, name) {
  const legsA = ['....ooyooyo.....', '......y..y......', '.....yy.yy......'];
  const legsB = ['....ooyooyo.....', '.....y....y.....', '....yy....yy....'];
  const legsC = ['....ooyooyo.....', '......y.y.......', '.....yy.yy......'];
  // chickens lead with the head: nudge it 1px forward on the stride frame
  const bob = (rows) => rows.map((r, i) => (i <= 5 ? r.slice(0, 7) + '.' + r.slice(7, 15) : r));
  const withLegs = (rows, legs) => [...rows.slice(0, 13), ...legs];
  const S = (rows, n) => sprite(rows, pal, `${name}:${n}`);
  const stand = S(withLegs(HEN_STAND, legsA), 'stand');
  return {
    idle: [stand],
    walk: [
      S(withLegs(bob(HEN_STAND), legsB), 'walk0'),
      S(withLegs(HEN_STAND, legsC), 'walk1'),
      S(withLegs(bob(HEN_STAND), legsB), 'walk2'),
      stand,
    ],
    peck: [stand, S(HEN_PECK, 'peck'), S(HEN_PECK, 'peck'), stand],
  };
}

// -------------------------------------------------------------------- chick

const CHICK = { o: '#8a5a2b', y: P.gold1, Y: P.gold2, p: P.orange2, e: P.ink };
const CHICK_A = [
  '........',
  '..ooo...',
  '.oyyyo..',
  '.oyyeypp',
  'oyyyyyo.',
  'oyYYyyo.',
  '.oyyyo..',
  '..p.p...',
];
const CHICK_B = [
  '..ooo...',
  '.oyyyo..',
  '.oyyeypp',
  'oyyyyyo.',
  'oyYYyyo.',
  '.oyyyo..',
  '.p...p..',
  '........',
];

// --------------------------------------------------------------------- duck

const DUCK = {
  o: P.ink2,
  G: '#2f9a68',
  g: '#57c47c',
  D: '#1f6b58',
  y: P.gold2,
  Y: P.gold3,
  w: P.white,
  b: '#a8683f',
  B: '#d8c9b0',
  W: '#b3a18f',
  t: '#5c4a55',
  e: P.ink,
};
const DUCK_A = [
  '................',
  '.........oooo...',
  '........ogGGGo..',
  '........oGGeGyy.',
  '........oDGGGYo.',
  '.........owwo...',
  '.oo.....obbbo...',
  'otBooooobbbbbo..',
  'otBBBBBBBbbbbo..',
  '.oBBWWWWBBbbo...',
  '..oWWWWWBBbo....',
  '...oooooooo.....',
];
const DUCK_B = [
  '................',
  '................',
  '.........oooo...',
  '........ogGGGo..',
  '........oGGeGyy.',
  '........oDGGGYo.',
  '.oo......owwo...',
  'otBoooooobbbbo..',
  'otBBBBBBBbbbbo..',
  '.oBBWWWWBBbbo...',
  '..oWWWWWBBbo....',
  '...oooooooo.....',
];

// ---------------------------------------------------------------------- cat

const CAT = {
  o: P.ink2,
  a: '#f0a04a',
  A: '#cc6f33',
  d: '#9c4a2c',
  w: P.white,
  W: '#e6d5c0',
  p: P.pink2,
  e: '#3b5a2a',
  E: P.ink,
};
// sitting three-quarter, head toward the viewer, tail resting to the right
const CAT_SIT = [
  '.oo.....oo......',
  'oaao...oaao.....',
  'oapaoooapao.....',
  'oaaaaaaaaao.....',
  'oaaAaaaAaao.....',
  'oaEaaaaaEao.....',
  'oaEawpwaEao.....',
  '.oaawwwaao......',
  '..oaaaaaoooo....',
  '.oaaawwaaaaao...',
  '.oaaawwaaaAao...',
  'oaaaawwaaaaAao..',
  'oaaaawwaaaaaaoo.',
  'oawwaawwaaaaoaao',
  'oowwoowwoooooaao',
  '..oo..oo....ooo.',
];
// tail-tip flick
const CAT_TAIL_ROWS = { 11: 'oaaaawwaaaaAaoo.', 12: 'oaaaawwaaaaaaoao' };
const CAT_BLINK_ROWS = { 5: 'oaaaaaaaaao.....', 6: 'oaAawpwaAao.....' };

// ---------------------------------------------------------------- butterfly

const FLY_OPEN = ['aa...aa', 'aAa.aAa', '.aaoaa.', '.aAoAa.', '..a.a..'];
const FLY_HALF = ['.a...a.', '.aA.Aa.', '..aoa..', '..aoa..', '.......'];
const FLY_SHUT = ['...a...', '..aAa..', '...o...', '...o...', '.......'];

function butterfly(light, dark, name) {
  const pal = { a: light, A: dark, o: P.ink };
  const f = [FLY_OPEN, FLY_HALF, FLY_SHUT, FLY_HALF].map((r, i) => sprite(r, pal, name + i));
  return f;
}

// ------------------------------------------------------------------- export

export function buildCreatures() {
  const hen = henFrames(HEN, 'hen');
  const henBrown = henFrames(HEN_BROWN, 'hen-brown');
  const chick = [sprite(CHICK_A, CHICK, 'chick-a'), sprite(CHICK_B, CHICK, 'chick-b')];
  const duck = [sprite(DUCK_A, DUCK, 'duck-a'), sprite(DUCK_B, DUCK, 'duck-b')];

  const swap = (map) => CAT_SIT.map((r, i) => map[i] || r);
  const catA = sprite(CAT_SIT, CAT, 'cat');
  const catTail = sprite(swap(CAT_TAIL_ROWS), CAT, 'cat-tail');
  const catBlink = sprite(swap(CAT_BLINK_ROWS), CAT, 'cat-blink');

  return {
    hen,
    henBrown,
    chick,
    duck,
    cat: { sit: [catA, catTail], blink: catBlink },
    butterflies: [
      butterfly(P.gold2, P.orange2, 'fly-y'),
      butterfly(P.pink1, P.pink2, 'fly-p'),
      butterfly(P.water2, P.water4, 'fly-b'),
      butterfly(P.white, P.cream2, 'fly-w'),
    ],
  };
}
