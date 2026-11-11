// The cottage: painted procedurally (shingles, plaster, stonework) with
// hand-placed details. A second "lit" layer holds only the window glass so the
// windows can fade to a warm glow at dusk.
import { P } from '../palette.js';
import { Buf, hash2 } from '../pixel.js';

export const HOUSE = {
  W: 100,
  H: 94,
  baseY: 90, // y of the wall's foot inside the sprite
  doorX: 40, // door centre
  chimney: { x: 73, y: 1 },
  lights: [
    { x: 20, y: 68, r: 34 },
    { x: 70, y: 68, r: 40 },
    { x: 40, y: 67, r: 16 },
    { x: 52, y: 67, r: 30 },
  ],
};

const PLASTER = '#f7e9c8';
const PLASTER_D = '#ead8b2';
const PLASTER_S = '#d2bb95';
const PLASTER_SS = '#bfa685';

export function buildHouse() {
  const { W, H } = HOUSE;
  const b = new Buf(W, H);
  const lit = new Buf(W, H);

  // ------------------------------------------------------------------ wall
  for (let y = 50; y <= 82; y++) {
    for (let x = 8; x <= 91; x++) {
      let col = PLASTER;
      const n = hash2(x >> 1, y >> 1, 3);
      if (n < 0.07) col = PLASTER_D;
      if (hash2(x, y, 4) < 0.012) col = PLASTER_S;
      if (y <= 55) col = PLASTER_SS; // deep shade under the eave
      else if (y <= 57) col = PLASTER_S;
      else if (y === 58 && (x + y) % 2 === 0) col = PLASTER_S;
      b.set(x, y, col);
    }
  }
  // timber frame
  const beamV = (x) => {
    for (let y = 50; y <= 82; y++) {
      b.set(x, y, y <= 56 ? P.wood4 : P.wood2);
      b.set(x + 1, y, y <= 56 ? P.wood4 : P.wood3);
      b.set(x + 2, y, P.wood4);
    }
  };
  beamV(8);
  beamV(89);
  for (let x = 8; x <= 91; x++) {
    b.set(x, 80, P.wood2);
    b.set(x, 81, P.wood3);
    b.set(x, 82, P.wood4);
  }

  // ------------------------------------------------------------ foundation
  for (let y = 83; y <= 89; y++) {
    const row = y <= 85 ? 0 : 1;
    const top = row === 0 ? 83 : 86;
    const bot = row === 0 ? 85 : 89;
    for (let x = 8; x <= 91; x++) {
      const u = (x + row * 5) % 10;
      const id = Math.floor((x + row * 5) / 10);
      const tint = hash2(id, row, 8);
      let col = tint < 0.3 ? P.stone3 : P.stone2;
      if (y === top) col = tint < 0.3 ? P.stone2 : P.stone1;
      if (u === 9 || y === bot) col = P.stone4;
      if (y === 89) col = P.stone5;
      b.set(x, y, col);
    }
  }

  // ------------------------------------------------------------------ door
  b.rect(31, 57, 19, 33, P.wood5);
  b.rect(32, 58, 17, 2, P.wood2); // lintel
  b.hline(32, 48, 58, P.wood1);
  b.rect(32, 60, 17, 30, P.wood4);
  b.vline(32, 60, 89, P.wood2);
  b.vline(48, 60, 89, P.wood3);
  for (let y = 61; y <= 89; y++) {
    for (let x = 34; x <= 46; x++) {
      let col = P.wood3;
      if (x === 34) col = P.wood2;
      if (x === 38 || x === 42) col = P.wood4;
      if (x === 39 || x === 43 || x === 35) col = P.wood2;
      if (y >= 87) col = x === 38 || x === 42 ? P.wood5 : P.wood4;
      if (y === 61) col = P.wood4;
      b.set(x, y, col);
    }
  }
  b.vline(33, 60, 89, P.wood5);
  b.vline(47, 60, 89, P.wood5);
  // little door window
  b.rect(37, 64, 7, 7, P.wood5);
  glass(b, lit, 38, 65, 5, 5, 1);
  b.vline(40, 65, 69, P.wood4);
  lit.vline(40, 65, 69, P.gold4);
  // knob + hinges
  b.set(45, 77, P.gold1);
  b.set(45, 78, P.gold3);
  b.set(34, 66, P.stone4);
  b.set(34, 82, P.stone4);
  // doorstep
  b.rect(29, 90, 23, 1, P.stone1);
  b.rect(29, 91, 23, 1, P.stone2);
  b.rect(29, 92, 23, 1, P.stone4);
  b.set(29, 90, P.stone2);
  b.set(51, 90, P.stone2);

  // --------------------------------------------------------------- windows
  windowAt(b, lit, 13, 61, 2, 6, 2, 6);
  windowAt(b, lit, 57, 61, 3, 7, 2, 6);
  flowerBox(b, 12, 28, 77, 21);
  flowerBox(b, 56, 82, 77, 22);

  // wall lantern
  b.rect(51, 62, 4, 1, P.ink);
  b.rect(51, 63, 4, 6, P.ink);
  b.rect(52, 64, 2, 4, '#a9bccb');
  b.set(52, 64, '#d6e3ea');
  b.set(52, 69, P.ink);
  b.set(53, 69, P.ink);
  lit.rect(52, 64, 2, 4, P.gold2);
  lit.set(52, 64, P.gold1);
  lit.set(52, 65, P.gold1);

  // ivy creeping up the right corner
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const x = 87 + Math.round(Math.sin(i * 1.3) * 2.2) + (hash2(i, 1, 9) < 0.5 ? 1 : 0);
    const y = 81 - Math.round(t * 24);
    const light = hash2(i, 2, 9);
    b.set(x, y, light < 0.35 ? P.leaf2 : P.leaf3);
    b.set(x + 1, y, P.leaf4);
    b.set(x, y + 1, P.leaf5);
    if (light > 0.7) b.set(x - 1, y, P.leaf3);
  }

  // ------------------------------------------------------------------ roof
  const RIDGE = 9;
  const EAVE = 53;
  for (let y = RIDGE; y <= EAVE; y++) {
    const t = (EAVE - y) / (EAVE - RIDGE);
    const xl = Math.round(1 + 11 * t);
    const xr = 98 - Math.round(11 * t);
    for (let x = xl; x <= xr; x++) {
      let col;
      if (y <= RIDGE + 2) {
        col = y === RIDGE ? P.red1 : y === RIDGE + 1 ? P.red2 : P.red4;
      } else if (y >= EAVE - 3) {
        col = y === EAVE - 3 ? P.wood1 : y === EAVE - 2 ? P.wood2 : y === EAVE - 1 ? P.wood3 : P.wood5;
      } else {
        const ry = y - (RIDGE + 3);
        const row = Math.floor(ry / 5);
        const v = ry % 5;
        const off = (row % 2) * 4;
        const u = (x + off) % 8;
        const tint = hash2(Math.floor((x + off) / 8), row, 5);
        let body = P.red2;
        let hi = P.red1;
        if (tint < 0.2) {
          body = P.red3;
          hi = P.red2;
        } else if (tint > 0.88) {
          body = '#e9705a';
        }
        if (v === 4) col = P.red4;
        else if (u === 0) col = v === 0 ? P.red3 : P.red4;
        else if (v === 0) col = hi;
        else if (v === 3 && (u === 1 || u === 7)) col = P.red3;
        else col = body;
        // right-hand slope falls into shade
        if (x > xr - 7 && col !== P.red4) col = col === P.red1 ? P.red2 : P.red3;
      }
      b.set(x, y, col);
    }
    // rake boards down both edges
    if (y > RIDGE && y < EAVE - 3) {
      b.set(xl, y, P.wood1);
      b.set(xl + 1, y, P.wood2);
      b.set(xl + 2, y, P.red4);
      b.set(xr, y, P.wood4);
      b.set(xr - 1, y, P.wood3);
      b.set(xr - 2, y, P.red4);
    }
  }

  // --------------------------------------------------------------- chimney
  const BR = ['#d08a66', '#b56a55', '#8f4a45', '#693641'];
  for (let y = 4; y <= 24; y++) {
    for (let x = 67; x <= 79; x++) {
      const row = Math.floor((y - 4) / 3);
      const v = (y - 4) % 3;
      const u = (x + (row % 2) * 3) % 6;
      let col = BR[1];
      if (hash2(Math.floor((x + (row % 2) * 3) / 6), row, 7) < 0.3) col = BR[0];
      if (v === 2 || u === 5) col = BR[2];
      if (x >= 77) col = col === BR[2] ? BR[3] : BR[2];
      if (x === 67) col = BR[0];
      b.set(x, y, col);
    }
  }
  b.rect(66, 1, 15, 1, P.stone1);
  b.rect(66, 2, 15, 1, P.stone2);
  b.rect(66, 3, 15, 1, P.stone4);
  b.rect(78, 1, 3, 2, P.stone3);
  // shadow the chimney throws on the shingles
  for (let y = 22; y <= 29; y++) {
    for (let x = 80; x <= 84; x++) {
      if (x - 80 <= y - 21 && x - 80 >= y - 27) {
        const c = b.get(x, y);
        if (c === P.red1 || c === P.red2 || c === '#e9705a') b.set(x, y, P.red3);
        else if (c === P.red3) b.set(x, y, P.red4);
      }
    }
  }

  b.outline(P.ink2);

  return { day: b.toCanvas(), lit: lit.toCanvas() };
}

function glass(b, lit, x, y, w, h, seed) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let col = '#5a86bd';
      if (j >= h - 2) col = '#456aa3';
      if (i + j === 2 || i + j === 3) col = '#a9d4ee';
      if (i + j === w + 1) col = '#7fb0dc';
      b.set(x + i, y + j, col);
      let g = P.gold2;
      if (i > 0 && i < w - 1 && j > 0 && j < h - 2) g = P.gold1;
      if (j >= h - 1) g = P.gold3;
      if (hash2(i, j, seed) < 0.08) g = P.gold3;
      lit.set(x + i, y + j, g);
    }
  }
}

function windowAt(b, lit, x, y, nx, pw, ny, ph) {
  const w = nx * pw + (nx - 1) + 2;
  const h = ny * ph + (ny - 1) + 2;
  b.rect(x - 1, y - 1, w + 2, h + 2, P.wood5);
  b.rect(x, y, w, h, P.wood2);
  b.hline(x, x + w - 1, y, P.wood1);
  b.vline(x, y, y + h - 1, P.wood1);
  lit.rect(x + 1, y + 1, w - 2, h - 2, P.gold4);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const gx = x + 1 + i * (pw + 1);
      const gy = y + 1 + j * (ph + 1);
      glass(b, lit, gx, gy, pw, ph, i * 7 + j);
      // curtains gathered in the top corners
      if (j === 0 && i === 0) {
        b.rect(gx, gy, 2, 3, P.cream1);
        b.set(gx + 2, gy, P.cream1);
        b.set(gx, gy + 3, P.cream2);
        b.set(gx + 1, gy + 2, P.cream2);
      }
      if (j === 0 && i === nx - 1) {
        b.rect(gx + pw - 2, gy, 2, 3, P.cream1);
        b.set(gx + pw - 3, gy, P.cream1);
        b.set(gx + pw - 1, gy + 3, P.cream2);
        b.set(gx + pw - 2, gy + 2, P.cream2);
      }
    }
  }
  // sill
  b.rect(x - 2, y + h, w + 4, 1, P.wood1);
  b.rect(x - 2, y + h + 1, w + 4, 1, P.wood5);
}

function flowerBox(b, x0, x1, y, seed) {
  b.rect(x0, y, x1 - x0 + 1, 1, P.wood5);
  b.rect(x0, y + 1, x1 - x0 + 1, 1, P.wood2);
  b.rect(x0, y + 2, x1 - x0 + 1, 2, P.wood3);
  b.rect(x0, y + 4, x1 - x0 + 1, 1, P.wood5);
  b.vline(x0, y, y + 4, P.wood5);
  b.vline(x1, y, y + 4, P.wood5);
  const blooms = [P.red2, P.pink2, P.gold2, P.white, P.red1];
  for (let x = x0 + 1; x < x1; x++) {
    const n = hash2(x, seed, 1);
    b.set(x, y, n < 0.5 ? P.leaf4 : P.leaf3);
    b.set(x, y - 1, n < 0.3 ? P.leaf2 : P.leaf3);
    if ((x + seed) % 3 === 0) {
      const col = blooms[Math.floor(hash2(x, seed, 2) * blooms.length)];
      b.set(x, y - 2, col);
      b.set(x, y - 1, col);
      b.set(x + 1, y - 2, col);
      if (n > 0.5) b.set(x, y - 3, col);
    } else if (n > 0.6) {
      b.set(x, y - 2, P.leaf2);
    }
  }
}
