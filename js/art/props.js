// Scenery props: rocks, plants, crops, furniture. Mostly hand-placed pixels,
// with a few procedural painters where repetition helps (fence, barrel, crate).
import { P } from '../palette.js';
import { sprite, swayFrames, Buf } from '../pixel.js';

const STONE = { o: P.stone5, 1: P.stone1, 2: P.stone2, 3: P.stone3, 4: P.stone4, m: P.leaf3, M: P.leaf4 };
const WOOD = { o: P.wood5, 1: P.wood1, 2: P.wood2, 3: P.wood3, 4: P.wood4 };
const PLANT = { g: P.leaf4, G: P.leaf5, l: P.leaf2, L: P.leaf1, m: P.leaf3, o: P.leaf6 };

// -------------------------------------------------------------------- rocks

const ROCK_S = [
  '..ooooo..',
  '.o11122o.',
  'o1112223o',
  'o1122233o',
  'o2223334o',
  '.o33344o.',
  '..ooooo..',
];

const ROCK_M = [
  '....oooooo......',
  '..oo111111oo....',
  '.o1111111122o...',
  '.om11111122233o.',
  'ommM11122223333o',
  'o2MM1222223333o.',
  'o22222223333334o',
  'o32222333333344o',
  'o33333333334444o',
  '.o3333334444444o',
  '..oo444444444oo.',
  '....ooooooooo...',
];

const ROCK_L = [
  '.......oooooooo.........',
  '.....oo11111111oo.......',
  '...oo1111111111122oo....',
  '..o111111111111222223o..',
  '.o1111111111112222233o..',
  '.o11111111112222223333o.',
  'o111111111222222233333o.',
  'o1111112222222223333334o',
  'o2211222222222333333344o',
  'o2222222222233333333444o',
  'o2222222333333333334444o',
  'o3222233333333333344444o',
  'o3333333333333334444444o',
  'o3333333333344444444444o',
  '.o33333344444444444444o.',
  '.o4444444444444444444o..',
  '..oo444444444444444oo...',
  '....ooooooooooooooo.....',
];

// ------------------------------------------------------------------ flowers

const DAISY = [
  '..w.w..',
  '.wwyww.',
  '..yYy..',
  '.WwyWW.',
  '..W.W..',
  '...g...',
  '.l.g...',
  '..lg.l.',
  '...gl..',
  '...g...',
];
const POPPY = [
  '.rr.rr.',
  'rRrrrRr',
  'rrrkrrr',
  '.DrrrD.',
  '..DDD..',
  '...g...',
  '...g.l.',
  '.l.gl..',
  '..lg...',
  '...g...',
];
const TULIP = [
  'p.p.p',
  'pPpPp',
  'pPPPp',
  '.DPD.',
  '..g..',
  '..g..',
  'l.g..',
  '.lg.l',
  '..gl.',
  '..g..',
];
const LUPINE = [
  '..b..',
  '..B..',
  '.bBb.',
  '.BbB.',
  'bBbBb',
  '.DbD.',
  '..g..',
  '.lg..',
  '..gl.',
  '..g..',
];
const BUTTERCUP = [
  '.y...y.',
  'yYy.yYy',
  '.y.y.y.',
  '.g.yYy.',
  '.g..y.g',
  '.lg.g.g',
  '..ggggl',
  '...gg..',
];

const TUFT = [
  '....L........',
  '...Ll...L....',
  '.L.lg..Ll..L.',
  '.Ll.g.lg..ll.',
  '..lgg.lg.lg..',
  '..lgglgg.gg..',
  '.G.gggggggG..',
  '..GgGggGggG..',
  '...GGgGGgG...',
  '....G.GG.....',
];

const MUSHROOM = [
  '..ooo..',
  '.orwro.',
  'orrrrwo',
  'owrrrro',
  'ooocooo',
  '..oco..',
  '..ooo..',
];

// --------------------------------------------------------------------- lamp

const LAMP = [
  '.....oo.....',
  '....oIio....',
  '...oIiiio...',
  '..oIiiiiio..',
  '..oooooooo..',
  '..ogGGGGgo..',
  '..oGGWWGGo..',
  '..oGGWWGGo..',
  '..ogGGGGgo..',
  '..oooooooo..',
  '...oIiio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '....oIio....',
  '...oIiiio...',
  '..oIiiiiio..',
  '..oooooooo..',
];

// --------------------------------------------------------------------- sign

const SIGN = [
  '..oooooooooooooo..',
  '.o11111111111111o.',
  '.o12222222222223o.',
  '.o12442444244223o.',
  '.o12222222222223o.',
  '.o12444244244423o.',
  '.o12222222222223o.',
  '.o33333333333333o.',
  '..oooooo23oooooo..',
  '.......o23o.......',
  '.......o23o.......',
  '.......o23o.......',
  '.......o23o.......',
  '.......o23o.......',
  '.......o23o.......',
  '......oo23oo......',
  '......oooooo......',
];

// ------------------------------------------------------------------ mailbox

const MAILBOX = [
  '..oooooo..',
  '.orrrrrro.',
  'orRRrrrrro',
  'orRrrrrrro',
  'orrddddrfo',
  'orrrrrrrfo',
  'oDDDDDDDDo',
  '.oooooooo.',
  '...o23o...',
  '...o23o...',
  '...o23o...',
  '...o23o...',
  '...o23o...',
  '...o23o...',
  '...o23o...',
  '..oo23oo..',
  '..oooooo..',
];

// -------------------------------------------------------------------- stump

const STUMP = [
  '....oooooooo....',
  '..oo11111111oo..',
  '.o111222222111o.',
  '.o112211112211o.',
  '.o111222222111o.',
  '.o311111111114o.',
  '.o33oooooooo44o.',
  '.o333433343444o.',
  '.o334333434444o.',
  'oo333433344444oo',
  'o33o3334o44o444o',
  '.oo.oooo.oo.ooo.',
];

// -------------------------------------------------------------------- crops

const SPROUT = ['.l...l.', 'lml.lml', '.lm.ml.', '..mgm..', '...g...', '...g...'];

const CABBAGE = [
  '....oooo....',
  '..oolllloo..',
  '.olLllllLmo.',
  'olllLllLmmgo',
  'olmlllllmggo',
  'ommllllmgmgo',
  '.ommmmmgggo.',
  '..oogggggo..',
  '....ooooo...',
];

const TOMATO = [
  '.....w......',
  '....lwl.....',
  '...lmwml....',
  '..lmgwmmlo..',
  '.lmrRwmgmm..',
  '.mgrrwgmrR..',
  '..mggwlmrr..',
  '.lmmlwmmgo..',
  'lmrRmwgmml..',
  'mgrrgwmrRm..',
  '.mggmwgrrg..',
  '..ommwmmgo..',
  '...ogwgo....',
  '.....w......',
  '.....w......',
  '.....w......',
];

const PUMPKIN = [
  '.......gg.....',
  '......oGo.....',
  '..ooooGGoooo..',
  '.o1123122312o.',
  'o112231222312o',
  'o122231222322o',
  'o122232222322o',
  'o222332222332o',
  '.o2233222332o.',
  '..oo333333oo..',
  '....oooooo....',
];

const SUNFLOWER = [
  '...y.y.y...',
  '..yyYyYyy..',
  '.yYybbbyYy.',
  '..ybBbBby..',
  '.yybbBbbyy.',
  '..ybBbBby..',
  '.yYybbbyYy.',
  '..yyYyYyy..',
  '...y.g.y...',
  '.....g.....',
  '.....g.....',
  '..ll.g.....',
  '.lmmlg.....',
  '..lmmg.....',
  '....mg.ll..',
  '.....glmml.',
  '.....gmml..',
  '.....gm....',
  '.....g.....',
  '.....g.....',
  '.....g.....',
  '.....g.....',
];

// ---------------------------------------------------------------- scarecrow

const SCARECROW = [
  '.......oooooo.......',
  '......oyyyyyyo......',
  '......oyYyyyyo......',
  '.....oyyYyyyyyo.....',
  '..ooooRRRRRRRRoooo..',
  '.oYyyyyyyyyyyyyyyYo.',
  '..ooooccccccccoooo..',
  '.....occcccccCo.....',
  '.....ocxccxcCCo.....',
  '.....occccccCCo.....',
  '.....ocxccxcCCo.....',
  '.....oCcxxcCCCo.....',
  '......oCCCCCCo......',
  '.ooooooorrrrooooooo.',
  'oyyorRrrRrrRrrRroyyo',
  'oyYorrRrrRrrRrrroYyo',
  '.ooooDrRrrRrrRDoooo.',
  '.....orrRrrRrrDo....',
  '.....oRrrRrrRrDo....',
  '.....orrRrrRrDDo....',
  '.....oDDDDDDDDDo....',
  '......oyoyyoyoo.....',
  '......oo.23.oo......',
  '.........23.........',
  '.........23.........',
  '.........23.........',
  '.........23.........',
  '.........23.........',
  '........o23o........',
  '........oooo........',
];

// ------------------------------------------------------------- pond plants

const LILY = [
  '..oooooo..',
  '.olllmmGo.',
  'olLllmoGGo',
  'ollmmmGGGo',
  '.ommmGGGo.',
  '..oooooo..',
];
const LILY_FLOWER = [
  '....pp....',
  '..ooPpPo..',
  '.olpPwPGo.',
  'olLlpPmGGo',
  'ollmmmGGGo',
  '.ommmGGGo.',
  '..oooooo..',
];
const REEDS = [
  '..b......',
  '..b...b..',
  '..B...b..',
  '..B...B..',
  '..g...B..',
  '..g.l.g..',
  '.lg.l.g..',
  '.lg.lgg.l',
  '.lg.lgg.l',
  '.lgllgg.l',
  '.lgglgglg',
  '.lgglgglg',
  '..gglgggg',
  '..gggggg.',
];

// ------------------------------------------------------------------ painter

function barrel() {
  const w = 14;
  const h = 18;
  const b = new Buf(w, h);
  const ramp = [P.wood1, P.wood2, P.wood2, P.wood2, P.wood3, P.wood3, P.wood3, P.wood3, P.wood4, P.wood4];
  const metal = [P.stone1, P.stone2, P.stone3, P.stone3, P.stone3, P.stone3, P.stone4, P.stone4, P.stone4, P.stone5];
  for (let y = 3; y < h - 1; y++) {
    // slight bulge in the middle
    const inset = y < 5 || y > h - 4 ? 1 : 0;
    for (let x = 1 + inset; x < w - 1 - inset; x++) {
      const t = Math.floor(((x - 1) / (w - 2)) * 10);
      let col = ramp[Math.min(9, t)];
      if ((x - 1) % 3 === 2) col = t < 5 ? P.wood3 : P.wood4; // stave gaps
      if (y === 5 || y === 6 || y === h - 5 || y === h - 4) col = metal[Math.min(9, t)];
      b.set(x, y, col);
    }
  }
  // lid
  const lid = ['..11111111..', '.1122222211.', '.1222332221.', '..11111111..'];
  b.grid(lid, { 1: P.wood1, 2: P.wood2, 3: P.wood3 }, 1, 1);
  b.hline(3, 10, 4, P.wood4);
  b.outline(P.wood5);
  return b.toCanvas();
}

function crate() {
  const s = 14;
  const b = new Buf(s, s + 3);
  // lid seen from above (3 rows) + front face
  for (let x = 1; x < s - 1; x++) {
    b.set(x, 1, P.wood1);
    b.set(x, 2, x % 4 === 0 ? P.wood3 : P.wood2);
    b.set(x, 3, P.wood2);
  }
  for (let y = 4; y < s + 2; y++) {
    for (let x = 1; x < s - 1; x++) {
      const edge = x <= 2 || x >= s - 3 || y <= 5 || y >= s;
      let col = edge ? P.wood2 : P.wood3;
      if (!edge && (x - 3 === y - 6 || x - 3 === y - 7)) col = P.wood2; // diagonal brace
      if (!edge && (x + y) % 5 === 0 && col === P.wood3) col = P.wood4;
      if (edge && (x === 2 || x === s - 3) && y > 5 && y < s) col = P.wood4;
      if (edge && y === 5 && x > 2 && x < s - 3) col = P.wood4;
      if (y === s + 1) col = P.wood4;
      b.set(x, y, col);
    }
  }
  b.set(2, 5, P.stone2);
  b.set(s - 3, 5, P.stone2);
  b.set(2, s, P.stone3);
  b.set(s - 3, s, P.stone3);
  b.outline(P.wood5);
  return b.toCanvas();
}

/** 16 fence pieces indexed by neighbour mask: 1=N 2=E 4=S 8=W */
function fencePieces() {
  const out = [];
  for (let mask = 0; mask < 16; mask++) {
    const b = new Buf(16, 18);
    const oy = 2; // sprite is 2px taller than a tile so the post cap can poke up
    const rail = (x0, x1, y) => {
      for (let x = x0; x <= x1; x++) {
        b.set(x, oy + y - 1, P.wood5);
        b.set(x, oy + y, P.wood1);
        b.set(x, oy + y + 1, P.wood3);
        b.set(x, oy + y + 2, P.wood5);
      }
    };
    if (mask & 8) {
      rail(0, 6, 4);
      rail(0, 6, 9);
    }
    if (mask & 2) {
      rail(9, 15, 4);
      rail(9, 15, 9);
    }
    if (mask & 1) {
      for (let y = -2; y <= 1; y++) {
        b.set(6, oy + y, P.wood5);
        b.set(7, oy + y, P.wood2);
        b.set(8, oy + y, P.wood4);
        b.set(9, oy + y, P.wood5);
      }
    }
    if (mask & 4) {
      for (let y = 12; y <= 15; y++) {
        b.set(6, oy + y, P.wood5);
        b.set(7, oy + y, P.wood2);
        b.set(8, oy + y, P.wood4);
        b.set(9, oy + y, P.wood5);
      }
    }
    // post
    const post = [
      '.oooo.',
      'o1112o',
      'o1223o',
      'o1223o',
      'o1223o',
      'o1223o',
      'o1223o',
      'o1223o',
      'o1223o',
      'o1223o',
      'o1223o',
      'o1233o',
      'o2334o',
      '.oooo.',
    ];
    b.grid(post, WOOD, 5, oy - 1);
    out.push(b.toCanvas());
  }
  return out;
}

function dockPost() {
  return sprite(
    ['.oooo.', 'o1122o', 'o1223o', 'o1223o', 'o1223o', 'o1233o', 'o2334o', 'o2334o', '.o44o.'],
    WOOD,
    'dock-post',
  );
}

// ------------------------------------------------------------------- export

export function buildProps() {
  const FL = {
    ...PLANT,
    w: P.white,
    W: P.cream2,
    y: P.gold2,
    Y: P.gold3,
    r: P.red2,
    R: P.red1,
    D: P.red3,
    k: P.ink,
    p: P.pink2,
    P: P.pink1,
    b: P.purple2,
    B: P.purple1,
  };
  const tulipPal = { ...FL, D: P.pink3 };
  const lupinePal = { ...FL, D: P.purple3 };

  const lampPal = (lit) => ({
    o: P.ink,
    i: '#4b4f6e',
    I: '#7a8098',
    g: lit ? P.gold3 : '#7f93ab',
    G: lit ? P.gold2 : '#a9bccb',
    W: lit ? P.gold1 : '#d6e3ea',
  });

  const crops = {
    sprout: sprite(SPROUT, PLANT, 'sprout'),
    cabbage: sprite(CABBAGE, PLANT, 'cabbage'),
    tomato: sprite(TOMATO, { ...PLANT, w: P.wood2, r: P.red2, R: P.red1 }, 'tomato'),
    pumpkin: sprite(
      PUMPKIN,
      { 1: P.orange1, 2: P.orange2, 3: P.orange3, o: '#7a3324', g: P.leaf3, G: P.leaf4 },
      'pumpkin',
    ),
    sunflower: sprite(
      SUNFLOWER,
      { ...PLANT, y: P.gold2, Y: P.gold1, b: P.wood4, B: P.wood3 },
      'sunflower',
    ),
  };

  return {
    rocks: [sprite(ROCK_S, STONE, 'rock-s'), sprite(ROCK_M, STONE, 'rock-m'), sprite(ROCK_L, STONE, 'rock-l')],
    flowers: [
      swayFrames(sprite(DAISY, FL, 'daisy'), 6, 1.2, 1.4, 2),
      swayFrames(sprite(POPPY, FL, 'poppy'), 6, 1.2, 1.4, 2),
      swayFrames(sprite(TULIP, tulipPal, 'tulip'), 6, 1.2, 1.4, 2),
      swayFrames(sprite(LUPINE, lupinePal, 'lupine'), 6, 1.2, 1.4, 2),
      swayFrames(sprite(BUTTERCUP, FL, 'buttercup'), 6, 1.2, 1.4, 2),
    ],
    tuft: swayFrames(sprite(TUFT, PLANT, 'tuft'), 6, 1.6, 1.3, 2),
    tuftRustle: swayFrames(sprite(TUFT, PLANT, 'tuft'), 4, 3, 1.1, 3),
    mushroom: sprite(MUSHROOM, { o: P.ink2, r: P.red2, w: P.white, c: P.cream2 }, 'mushroom'),
    lamp: { off: sprite(LAMP, lampPal(false), 'lamp'), on: sprite(LAMP, lampPal(true), 'lamp-on') },
    sign: sprite(SIGN, WOOD, 'sign'),
    mailbox: sprite(
      MAILBOX,
      { o: P.ink2, r: P.red2, R: P.red1, D: P.red3, d: P.red5, f: P.gold2, 2: P.wood2, 3: P.wood4 },
      'mailbox',
    ),
    stump: sprite(STUMP, WOOD, 'stump'),
    barrel: barrel(),
    crate: crate(),
    fence: fencePieces(),
    dockPost: dockPost(),
    crops: {
      sprout: swayFrames(crops.sprout, 6, 0.8, 1.2, 1),
      cabbage: [crops.cabbage],
      tomato: swayFrames(crops.tomato, 6, 1, 1.6, 1),
      pumpkin: [crops.pumpkin],
      sunflower: swayFrames(crops.sunflower, 6, 1.5, 1.5, 2),
    },
    scarecrow: sprite(
      SCARECROW,
      {
        o: P.ink2,
        y: P.gold2,
        Y: P.gold1,
        R: P.red2,
        r: P.red3,
        D: P.red4,
        c: P.cream2,
        C: P.cream3,
        x: P.ink2,
        2: P.wood2,
        3: P.wood4,
      },
      'scarecrow',
    ),
    lily: [
      sprite(LILY, { ...PLANT, o: P.leaf6 }, 'lily'),
      sprite(LILY_FLOWER, { ...PLANT, o: P.leaf6, p: P.pink2, P: P.pink1, w: P.gold2 }, 'lily-flower'),
    ],
    reeds: swayFrames(sprite(REEDS, { ...PLANT, b: P.wood4, B: P.wood3 }, 'reeds'), 6, 1.4, 1.5, 2),
  };
}
