// The farmer: 16x28 frames, pixelled by hand as a head layer and a body layer.
// Head and body are separate so the head can bob, blink and keep its lighting
// while body frames are mirrored for the second half of a walk cycle.
import { P } from '../palette.js';
import { sprite, flipH, stack, makeCanvas, ctxOf } from '../pixel.js';

export const CHAR_W = 16;
export const CHAR_H = 28;

// --------------------------------------------------------------------- heads

const HEAD_DOWN = [
  '.....oooooo.....',
  '...oohhhhhhoo...',
  '..ohhHHHHhhhho..',
  '.ohhHHHHhhhhhho.',
  '.ohHHhhhhhhhhdo.',
  '.ohHhhhhhhhhhdo.',
  '.ohhhhhhhhhhddo.',
  '.ohhShhSShhShdo.',
  '.odssessssessdo.',
  '.odssessssessdo.',
  '..osksssssskso..',
  '..ossssmmsssso..',
  '...oossssssoo...',
  '.....mmmmmm.....',
];

const HEAD_DOWN_BLINK = HEAD_DOWN.map((r, i) =>
  i === 8 ? '.odssssssssssdo.' : i === 9 ? '.odsEEssssEEsdo.' : r,
);

const HEAD_UP = [
  '.....oooooo.....',
  '...oohhhhhhoo...',
  '..ohhHHHHhhhho..',
  '.ohhHHHHhhhhhho.',
  '.ohHHhhhhhhhhdo.',
  '.ohHhhhhhhhhhdo.',
  '.ohhhhhhhhhhddo.',
  '.ohhhhhhhhhhddo.',
  '.ohhhdhhhhdhddo.',
  '.odhhdhhhhdhddo.',
  '.oddhhdhhdhhddo.',
  '..oddhhddhhddo..',
  '...ooddddddoo...',
  '.....oooooo.....',
];

const HEAD_SIDE = [
  '.....oooooo.....',
  '...oohHHHHhoo...',
  '..ohhHHHhhhhho..',
  '.ohhHHhhhhhhhho.',
  '.ohHHhhhhhhhhho.',
  '.ohHhhhhhhhhhho.',
  '.ohhhhhhhhhhhho.',
  '.odhhhhhhShhSho.',
  '.odhhhhdsssseso.',
  '.odhhhhdSssseso.',
  '..odhhdssssskso.',
  '..oddddssssssso.',
  '...ooddosssssoo.',
  '.....oommmoooo..',
];

const HEAD_SIDE_BLINK = HEAD_SIDE.map((r, i) =>
  i === 8 ? '.odhhhhdsssssso.' : i === 9 ? '.odhhhhdSssEEso.' : r,
);

// -------------------------------------------------------------------- bodies

const BODY_DOWN_IDLE = [
  '...oooooooooo...',
  '..occbccccbcco..',
  '..ocCbbbbbbCco..',
  '..ocCblbbbbCco..',
  '..osCbbbbbbCso..',
  '..osobbbbbboso..',
  '...oobBbbBboo...',
  '....obbBBbbo....',
  '....obbnnbbo....',
  '....obboobbo....',
  '....obboobbo....',
  '....ottootto....',
  '...otttoottto...',
  '...oooooooooo...',
];

// contact pose: body sinks 1px, viewer-left leg reaches forward
const BODY_DOWN_STEP = [
  '................',
  '...oooooooooo...',
  '..occbccccbcco..',
  '..ocCbbbbbbCco..',
  '..osCblbbbbCco..',
  '..osobbbbbbCso..',
  '...oobBbbBboso..',
  '....obbBBbboo...',
  '....obbnnbbo....',
  '....obboobbo....',
  '....obbootto....',
  '....ottootTo....',
  '...otttooooo....',
  '...ooooo........',
];

const BODY_UP_IDLE = [
  '...oooooooooo...',
  '..occbccccbcco..',
  '..ocCcbccbcCco..',
  '..ocCccbbccCco..',
  '..osCbbbbbbCso..',
  '..osobbbbbboso..',
  '...oobbbbbboo...',
  '....obbBBbbo....',
  '....obbnnbbo....',
  '....obboobbo....',
  '....obboobbo....',
  '....oTTooTTo....',
  '....oTTooTTo....',
  '....oooooooo....',
];

const BODY_UP_STEP = [
  '................',
  '...oooooooooo...',
  '..occbccccbcco..',
  '..ocCcbccbcCco..',
  '..osCccbbccCco..',
  '..osobbbbbbCso..',
  '...oobbbbbboso..',
  '....obbBBbboo...',
  '....obbnnbbo....',
  '....obboobbo....',
  '....oTToobbo....',
  '....oTTooTTo....',
  '....oooooTTo....',
  '........oooo....',
];

const BODY_SIDE_IDLE = [
  '....oooooooo....',
  '....occccbco....',
  '....ocCccbbo....',
  '....obBccbbo....',
  '....obBsSbbo....',
  '....obBsSbbo....',
  '....obboobbo....',
  '....obbbbbbo....',
  '.....obbbBo.....',
  '.....obbbBo.....',
  '.....obbbBo.....',
  '.....otttTo.....',
  '.....ottttTo....',
  '.....ooooooo....',
];

// contact: near leg forward, near arm back, far hand peeks out in front
const BODY_SIDE_W0 = [
  '................',
  '....oooooooo....',
  '....occccbco....',
  '....occccbbo....',
  '....obccBbboCo..',
  '....osSBbbboSo..',
  '....osSBbbboo...',
  '....ooobbbbo....',
  '....obbbbbbo....',
  '....oBbbbbbo....',
  '...oBBoobbbo....',
  '...oTTo.ottto...',
  '..oTTTo.otttto..',
  '..ooooo.oooooo..',
];

// passing: near leg carries the weight, far foot lifts behind
const BODY_SIDE_W1 = [
  '....oooooooo....',
  '....occccbco....',
  '....ocCccbbo....',
  '....obBccbbo....',
  '....obBsSbbo....',
  '....obBsSbbo....',
  '....obboobbo....',
  '....obbbbbbo....',
  '.....obbbbo.....',
  '....oBBbbbo.....',
  '...oTTobbbo.....',
  '...oTTottto.....',
  '....oootttto....',
  '......oooooo....',
];

// contact: far leg forward, near arm forward, far hand peeks out behind
const BODY_SIDE_W2 = [
  '................',
  '....oooooooo....',
  '....occccbco....',
  '....occccbbo....',
  '..oCobbbccbo....',
  '..oSobbbbsSo....',
  '...oobbbbsSo....',
  '....obbbbooo....',
  '....obbbbbbo....',
  '....obbbbBBo....',
  '...obbooBBBo....',
  '...otto.oTTTo...',
  '..ottto.oTTTTo..',
  '..ooooo.oooooo..',
];

// passing: far leg carries the weight, near foot lifts behind
const BODY_SIDE_W3 = [
  '....oooooooo....',
  '....occccbco....',
  '....ocCccbbo....',
  '....obBccbbo....',
  '....obBsSbbo....',
  '....obBsSbbo....',
  '....obboobbo....',
  '....obbbbbbo....',
  '.....obbBBo.....',
  '....obbbBBo.....',
  '...ottoBBBo.....',
  '...ottoTTTo.....',
  '....oooTTTTo....',
  '......oooooo....',
];

// ------------------------------------------------------------------ palettes

export const FARMER = {
  o: P.ink2,
  H: P.hair1,
  h: P.hair2,
  d: P.hair3,
  s: P.skin1,
  S: P.skin2,
  k: P.blush,
  m: P.skin3,
  e: P.ink,
  E: P.skin4,
  c: P.cream1,
  C: P.cream2,
  b: P.denim2,
  l: P.denim1,
  B: P.denim3,
  n: P.denim4,
  t: P.leather1,
  T: P.leather2,
};

export const VILLAGER = {
  ...FARMER,
  H: '#8e7fd6',
  h: '#5d4fa8',
  d: '#3f3478',
  s: '#f6c79a',
  S: '#dc9c74',
  m: '#b87058',
  c: P.gold1,
  C: P.gold3,
  b: P.red2,
  l: P.red1,
  B: P.red3,
  n: P.red4,
  t: P.cream3,
  T: P.cream4,
};

// ----------------------------------------------------------------- assembly

function frame(body, head, headDy = 0, headDx = 0) {
  // head grid sits on frame rows 1..14, body grid on rows 14..27
  return stack(CHAR_W, CHAR_H, [
    [body, 0, 14],
    [head, headDx, 1 + headDy],
  ]);
}

/** Tip the torso 1px forward over the legs: the running lean. */
function lean(body) {
  const c = makeCanvas(body.width, body.height);
  const g = ctxOf(c);
  g.drawImage(body, 0, 0, body.width, 8, 1, 0, body.width, 8);
  g.drawImage(body, 0, 8, body.width, body.height - 8, 0, 8, body.width, body.height - 8);
  return c;
}

export function buildCharacter(pal, name = 'char') {
  const S = (rows, n) => sprite(rows, pal, `${name}:${n}`);

  const hd = S(HEAD_DOWN, 'head-down');
  const hdB = S(HEAD_DOWN_BLINK, 'head-down-blink');
  const hu = S(HEAD_UP, 'head-up');
  const hs = S(HEAD_SIDE, 'head-side');
  const hsB = S(HEAD_SIDE_BLINK, 'head-side-blink');

  const bdI = S(BODY_DOWN_IDLE, 'body-down');
  const bdS = S(BODY_DOWN_STEP, 'body-down-step');
  const buI = S(BODY_UP_IDLE, 'body-up');
  const buS = S(BODY_UP_STEP, 'body-up-step');
  const bsI = S(BODY_SIDE_IDLE, 'body-side');
  const bs = [BODY_SIDE_W0, BODY_SIDE_W1, BODY_SIDE_W2, BODY_SIDE_W3].map((r, i) =>
    S(r, 'body-side-w' + i),
  );

  const right = {
    idle: [frame(bsI, hs, 0), frame(bsI, hs, 1)],
    blink: [frame(bsI, hsB, 0), frame(bsI, hsB, 1)],
    walk: [frame(bs[0], hs, 1), frame(bs[1], hs, 0), frame(bs[2], hs, 1), frame(bs[3], hs, 0)],
    run: [
      frame(lean(bs[0]), hs, 1, 1),
      frame(lean(bs[1]), hs, 0, 1),
      frame(lean(bs[2]), hs, 1, 1),
      frame(lean(bs[3]), hs, 0, 1),
    ],
  };
  const left = {
    idle: right.idle.map(flipH),
    blink: right.blink.map(flipH),
    walk: right.walk.map(flipH),
    run: right.run.map(flipH),
  };
  const down = {
    idle: [frame(bdI, hd, 0), frame(bdI, hd, 1)],
    blink: [frame(bdI, hdB, 0), frame(bdI, hdB, 1)],
    walk: [
      frame(bdS, hd, 1),
      frame(bdI, hd, 0),
      frame(flipH(bdS), hd, 1),
      frame(bdI, hd, 0),
    ],
  };
  const up = {
    idle: [frame(buI, hu, 0), frame(buI, hu, 1)],
    blink: [frame(buI, hu, 0), frame(buI, hu, 1)],
    walk: [
      frame(buS, hu, 1),
      frame(buI, hu, 0),
      frame(flipH(buS), hu, 1),
      frame(buI, hu, 0),
    ],
  };
  return { down, up, left, right };
}
