// Trees and bushes. Canopies are built from dozens of small leaf clumps, each
// shaded as a tiny sphere under one global light. Re-rasterising the clumps at
// slightly shifted positions gives a real pixel-level wind animation instead
// of a sliding bitmap.
import { P } from '../palette.js';
import { Buf, mulberry32, clamp } from '../pixel.js';

const TRUNK_PAL = { o: P.wood5, 1: P.wood2, 2: P.wood3, 3: P.wood4, 4: '#5d3530' };

const TRUNK = [
  '....o433344o....',
  '....o433344o....',
  '....o233344o....',
  '....o123334o....',
  '....o122334o....',
  '....o122334o....',
  '....o122334o....',
  '....o123334o....',
  '....o122334o....',
  '....o122334o....',
  '....o122334o....',
  '....o123334o....',
  '....o122334o....',
  '...oo1223344o...',
  '..o1122233344o..',
  '.o11o1223o3344o.',
  '.ooo.oooo.ooooo.',
];

const TRUNK_THIN = [
  '.....o4334o.....',
  '.....o4334o.....',
  '.....o2334o.....',
  '.....o1234o.....',
  '.....o1234o.....',
  '.....o1234o.....',
  '.....o1234o.....',
  '.....o1234o.....',
  '.....o1234o.....',
  '.....o1234o.....',
  '....oo12344o....',
  '...o11223344o...',
  '...oo.oooo.oo...',
];

const FRAMES = 8;

/**
 * @param {object} o
 *   W,H        sprite size
 *   blobs      [{x,y,rx,ry}] silhouette as a union of ellipses
 *   ramp       5 colours dark -> light
 *   edge       outline colour
 *   trunk      {rows, x, y} or null
 *   fruit      {n, col, hi} optional
 */
function canopy(o) {
  const rnd = mulberry32(o.seed);
  let minX = 1e9;
  let maxX = -1e9;
  let minY = 1e9;
  let maxY = -1e9;
  for (const b of o.blobs) {
    minX = Math.min(minX, b.x - b.rx);
    maxX = Math.max(maxX, b.x + b.rx);
    minY = Math.min(minY, b.y - b.ry);
    maxY = Math.max(maxY, b.y + b.ry);
  }
  const CX = (minX + maxX) / 2;
  const CY = (minY + maxY) / 2;
  const RX = (maxX - minX) / 2;
  const RY = (maxY - minY) / 2;

  const step = o.step || 6;
  const clumps = [];
  const inside = (px, py, r, k) => {
    for (const b of o.blobs) {
      const ax = b.rx - r * k;
      const ay = b.ry - r * k;
      if (ax <= 0 || ay <= 0) continue;
      const dx = (px - b.x) / ax;
      const dy = (py - b.y) / ay;
      if (dx * dx + dy * dy <= 1) return true;
    }
    return false;
  };
  // big puffs give the canopy its volumes
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const px = x + (rnd() - 0.5) * step * 0.9;
      const py = y + (rnd() - 0.5) * step * 0.9;
      const r = (o.rMin || 5) + rnd() * (o.rVar || 3);
      if (!inside(px, py, r, 0.85)) continue;
      const ticks = [];
      const nt = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < nt; i++) {
        const a = rnd() * Math.PI * 2;
        const d = rnd() * r * 0.7;
        ticks.push([Math.cos(a) * d, Math.sin(a) * d, rnd() < 0.5 ? 1 : -1]);
      }
      clumps.push({ x: px, y: py, r, ph: rnd() * Math.PI * 2, ticks });
    }
  }
  // small sprigs break up the silhouette so the edge reads as leaves
  const sprigStep = step * 0.55;
  for (let y = minY; y <= maxY; y += sprigStep) {
    for (let x = minX; x <= maxX; x += sprigStep) {
      const px = x + (rnd() - 0.5) * sprigStep;
      const py = y + (rnd() - 0.5) * sprigStep;
      const r = 2 + rnd() * 1.4;
      if (!inside(px, py, r, 0.6) || inside(px, py, r, 2.6)) continue;
      clumps.push({ x: px, y: py, r, ph: rnd() * Math.PI * 2, ticks: [] });
    }
  }
  // painter's order: upper clumps first so lower ones overlap them like shingles
  clumps.sort((a, b) => a.y - b.y);

  // choose a few front-facing clumps to carry fruit / blossoms
  const fruits = [];
  if (o.fruit) {
    const cand = clumps.filter(
      (c) => c.ticks.length && (c.y - CY) / RY > -0.55 && (c.y - CY) / RY < 0.7,
    );
    for (let i = 0; i < o.fruit.n && cand.length; i++) {
      const c = cand.splice(Math.floor(rnd() * cand.length), 1)[0];
      fruits.push(c);
    }
  }

  const frames = [];
  const n = o.frames || FRAMES;
  for (let k = 0; k < n; k++) {
    const th = (k / n) * Math.PI * 2;
    const leaf = new Buf(o.W, o.H);
    const tone = new Int8Array(o.W * o.H).fill(-1);
    const pos = new Map();
    // solid backing so no ground shows through gaps between puffs
    for (let py = 0; py < o.H; py++) {
      for (let px = 0; px < o.W; px++) {
        if (inside(px + 0.5, py + 0.5, 3, 1)) {
          leaf.set(px, py, o.ramp[0]);
          tone[py * o.W + px] = 0;
        }
      }
    }
    for (const c of clumps) {
      const hgt = clamp((maxY - c.y) / (maxY - minY), 0, 1);
      const amp = (o.sway ?? 1) * (0.3 + 0.95 * hgt);
      const ox = amp * Math.sin(th + c.x * 0.07 + c.y * 0.045);
      const oy = amp * 0.4 * Math.cos(th + c.ph);
      const cx = c.x + ox;
      const cy = c.y + oy;
      pos.set(c, [cx, cy]);
      const u = (c.x - CX) / RX;
      const v = (c.y - CY) / RY;
      const gl = 0.5 - 0.5 * (0.45 * u + 0.9 * v);
      const base = gl > 0.64 ? 3 : gl > 0.36 ? 2 : 1;
      const r = c.r;
      for (let py = Math.floor(cy - r); py <= Math.ceil(cy + r); py++) {
        for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px++) {
          if (px < 0 || py < 0 || px >= o.W || py >= o.H) continue;
          const dx = px + 0.5 - cx;
          const dy = py + 0.5 - cy;
          if (dx * dx + dy * dy > r * r) continue;
          const ll = 0.5 - 0.5 * ((0.6 * dx) / r + (0.8 * dy) / r);
          const local = ll > 0.8 ? 1 : ll > 0.4 ? 0 : ll > 0.19 ? -1 : -2;
          const idx = clamp(base + local, 0, 4);
          tone[py * o.W + px] = idx;
          leaf.set(px, py, o.ramp[idx]);
        }
      }
      // leaf ticks: tiny two-pixel strokes one tone up or down
      for (const [tx, ty, sgn] of c.ticks) {
        const x0 = Math.round(cx + tx);
        const y0 = Math.round(cy + ty);
        for (const [ax, ay] of [
          [0, 0],
          [1, -1],
        ]) {
          const qx = x0 + ax;
          const qy = y0 + ay;
          if (qx < 0 || qy < 0 || qx >= o.W || qy >= o.H) continue;
          const t0 = tone[qy * o.W + qx];
          if (t0 < 0) continue;
          const t1 = clamp(t0 + sgn, 0, 4);
          tone[qy * o.W + qx] = t1;
          leaf.set(qx, qy, o.ramp[t1]);
        }
      }
    }
    for (const c of fruits) {
      const [cx, cy] = pos.get(c);
      const fx = Math.round(cx);
      const fy = Math.round(cy);
      if (o.fruit.big) {
        leaf.rect(fx - 1, fy - 1, 3, 3, o.fruit.col);
        leaf.set(fx - 1, fy - 1, o.fruit.hi);
        leaf.set(fx + 1, fy + 1, o.fruit.lo);
        leaf.set(fx, fy - 2, o.edge);
      } else {
        leaf.set(fx, fy, o.fruit.col);
        leaf.set(fx + 1, fy, o.fruit.col);
        leaf.set(fx, fy - 1, o.fruit.hi);
        leaf.set(fx + 1, fy + 1, o.fruit.lo);
      }
    }
    leaf.outline(o.edge);

    const out = new Buf(o.W, o.H);
    if (o.trunk) out.grid(o.trunk.rows, TRUNK_PAL, o.trunk.x, o.trunk.y);
    for (let i = 0; i < leaf.px.length; i++) if (leaf.px[i]) out.px[i] = leaf.px[i];
    frames.push(out.toCanvas());
  }
  return frames;
}

// ---------------------------------------------------------------------- pine

function pine(seed) {
  const W = 34;
  const H = 62;
  const rnd = mulberry32(seed);
  const cx = 17;
  const ramp = [P.pine5, P.pine4, P.pine3, P.pine2, P.pine1];
  // tiers from top to bottom: apex y, base y, half width
  const tiers = [
    { a: 2, b: 15, w: 7 },
    { a: 9, b: 26, w: 10.5 },
    { a: 18, b: 38, w: 13.5 },
    { a: 29, b: 50, w: 16 },
  ];
  const jag = tiers.map(() => Array.from({ length: W }, () => rnd()));
  const frames = [];
  for (let k = 0; k < FRAMES; k++) {
    const th = (k / FRAMES) * Math.PI * 2;
    const leaf = new Buf(W, H);
    for (let ti = tiers.length - 1; ti >= 0; ti--) {
      const t = tiers[ti];
      // the tip sways, the skirt barely moves
      const sway = Math.round((1 - ti / tiers.length) * 1.3 * Math.sin(th + ti * 0.7));
      const h = t.b - t.a;
      for (let y = t.a; y <= t.b + 2; y++) {
        for (let x = 0; x < W; x++) {
          const rel = clamp((y - t.a) / h, 0, 1);
          const half = 1.2 + rel * t.w;
          const lx = x - sway;
          const dx = lx + 0.5 - cx;
          if (Math.abs(dx) > half) continue;
          // jagged hem: needles hang in little teeth
          const tooth = ((lx + ti * 2) % 4 === 0 ? 2 : (lx + ti * 2) % 4 === 2 ? 0 : 1) + (jag[ti][lx] > 0.7 ? 1 : 0);
          if (y > t.b - 2 + tooth) continue;
          const s = dx / half; // -1 left .. 1 right
          let idx = s < -0.45 ? 3 : s < 0.2 ? 2 : s < 0.62 ? 1 : 0;
          // snowy-looking highlights along the lit edge
          if (s < -0.72 && jag[ti][(y * 3) % W] > 0.45) idx = 4;
          // shadow cast by the tier above
          if (ti > 0 && y < tiers[ti - 1].b + 3) idx = Math.max(0, idx - 1);
          // darker hem
          if (y > t.b - 3) idx = Math.max(0, idx - 1);
          // needle texture
          const tx = jag[ti][(lx * 7 + y * 3) % W];
          if (tx > 0.9 && idx < 3) idx += 1;
          else if (tx < 0.08 && idx > 0) idx -= 1;
          leaf.set(x, y, ramp[idx]);
        }
      }
    }
    leaf.outline('#122f3a');
    const out = new Buf(W, H);
    out.grid(TRUNK_THIN, TRUNK_PAL, 9, 48);
    for (let i = 0; i < leaf.px.length; i++) if (leaf.px[i]) out.px[i] = leaf.px[i];
    frames.push(out.toCanvas());
  }
  return frames;
}

// -------------------------------------------------------------------- export

const GREEN = [P.leaf5, P.leaf4, P.leaf3, P.leaf2, P.leaf1];
const DEEP = ['#22594a', '#2f7a4c', '#4a9a4c', '#7fbf52', '#b7de68'];
const BLOSSOM = [P.pink4, P.pink3, P.pink2, '#fbb9d3', P.pink1];
const AUTUMN = ['#8a3b2e', '#b9542f', '#de7c34', '#f3a640', '#fbd26a'];

export function buildTrees() {
  const oakBlobs = [
    { x: 24, y: 23, rx: 21, ry: 17 },
    { x: 14, y: 30, rx: 12, ry: 10 },
    { x: 35, y: 30, rx: 11, ry: 10 },
    { x: 23, y: 13, rx: 14, ry: 10 },
  ];
  const roundBlobs = [
    { x: 24, y: 22, rx: 19, ry: 18 },
    { x: 24, y: 30, rx: 21, ry: 11 },
  ];
  const trunk = { rows: TRUNK, x: 16, y: 37 };

  const oak = canopy({ seed: 11, W: 48, H: 54, blobs: oakBlobs, ramp: GREEN, edge: P.leaf6, trunk });
  const oak2 = canopy({ seed: 29, W: 48, H: 54, blobs: roundBlobs, ramp: DEEP, edge: '#173d3f', trunk });
  const apple = canopy({
    seed: 47,
    W: 48,
    H: 54,
    blobs: roundBlobs,
    ramp: GREEN,
    edge: P.leaf6,
    trunk,
    fruit: { n: 9, big: true, col: P.red2, hi: P.red1, lo: P.red3 },
  });
  const blossom = canopy({
    seed: 71,
    W: 48,
    H: 54,
    blobs: oakBlobs,
    ramp: BLOSSOM,
    edge: '#6b2f66',
    trunk,
  });
  const maple = canopy({
    seed: 83,
    W: 48,
    H: 54,
    blobs: roundBlobs,
    ramp: AUTUMN,
    edge: '#5a2530',
    trunk,
  });

  const bushBlobs = [
    { x: 13, y: 10, rx: 12, ry: 8 },
    { x: 8, y: 12, rx: 7, ry: 6 },
    { x: 19, y: 12, rx: 6, ry: 6 },
  ];
  const bush = canopy({
    seed: 5,
    W: 26,
    H: 20,
    blobs: bushBlobs,
    ramp: GREEN,
    edge: P.leaf6,
    trunk: null,
    step: 4.2,
    rMin: 3.2,
    rVar: 1.8,
    sway: 0.6,
  });
  const berryBush = canopy({
    seed: 9,
    W: 26,
    H: 20,
    blobs: bushBlobs,
    ramp: DEEP,
    edge: '#173d3f',
    trunk: null,
    step: 4.2,
    rMin: 3.2,
    rVar: 1.8,
    sway: 0.6,
    fruit: { n: 7, col: P.red2, hi: P.red1, lo: P.red4 },
  });

  return { oak, oak2, apple, blossom, maple, pine: pine(3), pine2: pine(17), bush, berryBush };
}
