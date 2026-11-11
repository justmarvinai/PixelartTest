// Ground painter. Instead of stamping square tiles, the whole map is rasterised
// per pixel from the tile layout: borders are smoothed and wobbled so paths and
// shorelines look hand-drawn, then each surface gets its own texture rules.
import { P } from './palette.js';
import { makeCanvas, ctxOf, hexRgb, hash2, vnoise, mix } from './pixel.js';

export const TILE = 16;
export const T = { GRASS: 0, PATH: 1, WATER: 2 };

const GRASS = 0;
const PATH = 1;
const WATER = 2;

function distanceTo(mask, W, H) {
  // two-pass chamfer distance to the nearest set pixel
  const d = new Float32Array(W * H);
  const INF = 1e6;
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;
  const D = 1.4142;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let m = d[i];
      if (m === 0) continue;
      if (x > 0) m = Math.min(m, d[i - 1] + 1);
      if (y > 0) {
        m = Math.min(m, d[i - W] + 1);
        if (x > 0) m = Math.min(m, d[i - W - 1] + D);
        if (x < W - 1) m = Math.min(m, d[i - W + 1] + D);
      }
      d[i] = m;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      let m = d[i];
      if (m === 0) continue;
      if (x < W - 1) m = Math.min(m, d[i + 1] + 1);
      if (y < H - 1) {
        m = Math.min(m, d[i + W] + 1);
        if (x < W - 1) m = Math.min(m, d[i + W + 1] + D);
        if (x > 0) m = Math.min(m, d[i + W - 1] + D);
      }
      d[i] = m;
    }
  }
  return d;
}

/**
 * @param tiles  Uint8Array of T.* per tile
 * @param soil   Uint8Array, 1 where a tile is tilled soil
 * @param deck   Uint8Array, 1 where a tile carries dock planks
 */
export function buildTerrain(tiles, soil, deck, mw, mh) {
  const W = mw * TILE;
  const H = mh * TILE;
  const cls = new Uint8Array(W * H);
  const tAt = (tx, ty) => {
    if (tx < 0) tx = 0;
    else if (tx >= mw) tx = mw - 1;
    if (ty < 0) ty = 0;
    else if (ty >= mh) ty = mh - 1;
    return tiles[ty * mw + tx];
  };

  // ---------------------------------------------------- classify each pixel
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = (px + 0.5) / TILE - 0.5;
      const v = (py + 0.5) / TILE - 0.5;
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const fx = u - x0;
      const fy = v - y0;
      const a = tAt(x0, y0);
      const b = tAt(x0 + 1, y0);
      const c = tAt(x0, y0 + 1);
      const d = tAt(x0 + 1, y0 + 1);
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const fw =
        (a === WATER ? w00 : 0) + (b === WATER ? w10 : 0) + (c === WATER ? w01 : 0) + (d === WATER ? w11 : 0);
      const fp =
        (a === PATH ? w00 : 0) + (b === PATH ? w10 : 0) + (c === PATH ? w01 : 0) + (d === PATH ? w11 : 0);
      const wob =
        (vnoise(px * 0.085, py * 0.085, 11) - 0.5) * 0.3 + (vnoise(px * 0.26, py * 0.26, 12) - 0.5) * 0.13;
      let k = GRASS;
      if (fw > 0.5 + wob * 0.55) k = WATER;
      else if (fp > 0.5 + wob) k = PATH;
      cls[py * W + px] = k;
    }
  }
  // drop single-pixel spikes so edges stay clean
  for (let pass = 0; pass < 2; pass++) {
    const src = cls.slice();
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const k = src[i];
        let same = 0;
        const cnt = [0, 0, 0];
        for (let j = -1; j <= 1; j++) {
          for (let ii = -1; ii <= 1; ii++) {
            if (!ii && !j) continue;
            const o = src[i + j * W + ii];
            cnt[o]++;
            if (o === k) same++;
          }
        }
        if (same <= 2) cls[i] = cnt[0] >= cnt[1] && cnt[0] >= cnt[2] ? 0 : cnt[1] >= cnt[2] ? 1 : 2;
      }
    }
  }

  const notGrass = new Uint8Array(W * H);
  const notPath = new Uint8Array(W * H);
  const notWater = new Uint8Array(W * H);
  for (let i = 0; i < cls.length; i++) {
    notGrass[i] = cls[i] !== GRASS ? 1 : 0;
    notPath[i] = cls[i] !== PATH ? 1 : 0;
    notWater[i] = cls[i] !== WATER ? 1 : 0;
  }
  const dGrassEdge = distanceTo(notGrass, W, H); // for grass pixels
  const dPathEdge = distanceTo(notPath, W, H); // for path pixels
  const dShore = distanceTo(notWater, W, H); // for water pixels

  // ------------------------------------------------------------ grass detail
  // 0 none, 1 dark blade, 2 light blade, 3 white petal, 4 yellow, 5 pink
  const detail = new Uint8Array(W * H);
  const stamp = (x, y, k) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    detail[y * W + x] = k;
  };
  const motifs = [
    [[0, 0, 1], [1, 1, 1], [2, 0, 1]],
    [[0, 1, 2], [1, 0, 2], [2, 1, 2]],
    [[0, 1, 1], [1, 0, 1]],
    [[0, 0, 2], [1, 1, 2]],
    [[0, 0, 2], [0, 1, 1], [2, 0, 2], [2, 1, 1], [1, 1, 1]],
    [[0, 0, 1], [2, 1, 2]],
    [[1, 0, 2], [0, 1, 2], [1, 2, 1]],
    [[0, 0, 1]],
  ];
  const CELL = 6;
  for (let gy = 0; gy < H; gy += CELL) {
    for (let gx = 0; gx < W; gx += CELL) {
      const r = hash2(gx, gy, 41);
      if (r > 0.6) continue;
      const ox = gx + Math.floor(hash2(gx, gy, 42) * CELL);
      const oy = gy + Math.floor(hash2(gx, gy, 43) * CELL);
      const m = motifs[Math.floor(hash2(gx, gy, 44) * motifs.length)];
      for (const [dx, dy, k] of m) stamp(ox + dx, oy + dy, k);
    }
  }
  // tiny meadow flowers baked into the turf
  for (let gy = 0; gy < H; gy += 14) {
    for (let gx = 0; gx < W; gx += 14) {
      if (hash2(gx, gy, 51) > 0.2) continue;
      // flowers gather in loose drifts
      if (vnoise(gx * 0.012, gy * 0.012, 52) < 0.52) continue;
      const ox = gx + Math.floor(hash2(gx, gy, 53) * 12);
      const oy = gy + Math.floor(hash2(gx, gy, 54) * 12);
      const kind = hash2(gx, gy, 55);
      const petal = kind < 0.5 ? 3 : kind < 0.8 ? 4 : 5;
      stamp(ox, oy - 1, petal);
      stamp(ox - 1, oy, petal);
      stamp(ox + 1, oy, petal);
      stamp(ox, oy + 1, petal);
      stamp(ox, oy, petal === 4 ? 3 : 4);
    }
  }

  // ------------------------------------------------------------------ paint
  const canvas = makeCanvas(W, H);
  const g = ctxOf(canvas);
  const img = g.createImageData(W, H);
  const data = img.data;
  const put = (i, hex) => {
    const c = hexRgb(hex);
    data[i * 4] = c[0];
    data[i * 4 + 1] = c[1];
    data[i * 4 + 2] = c[2];
    data[i * 4 + 3] = 255;
  };

  const G_BASE = P.grass3;
  const G_LIGHT = mix(P.grass3, P.grass2, 0.22);
  const G_DARK = mix(P.grass3, P.grass4, 0.28);
  const BLADE_D = P.grass4;
  const BLADE_DD = mix(P.grass4, P.grass5, 0.5);
  const BLADE_L = mix(P.grass2, P.grass3, 0.25);
  const BLADE_LL = mix(P.grass2, P.grass1, 0.35);

  const D_BASE = P.dirt2;
  const D_PATCH = mix(P.dirt2, P.dirt3, 0.5);

  const landAbove = (x, y, n) => {
    for (let k = 1; k <= n; k++) {
      if (y - k < 0) return 0;
      if (cls[(y - k) * W + x] !== WATER) return k;
    }
    return 0;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const k = cls[i];
      if (k === GRASS) {
        const n = vnoise(x * 0.042, y * 0.042, 31) * 0.65 + vnoise(x * 0.13, y * 0.13, 32) * 0.35;
        const patch = n > 0.585 ? 1 : n < 0.41 ? -1 : 0;
        let col = patch === 1 ? G_LIGHT : patch === -1 ? G_DARK : G_BASE;
        const dt = detail[i];
        if (dt === 1) col = patch === -1 ? BLADE_DD : BLADE_D;
        else if (dt === 2) col = patch === 1 ? BLADE_LL : BLADE_L;
        else if (dt === 3) col = P.white;
        else if (dt === 4) col = P.gold2;
        else if (dt === 5) col = P.pink2;
        const de = dGrassEdge[i];
        if (de <= 1.05) col = P.grass5;
        else if (de <= 2.1) col = hash2(x, y, 61) < 0.55 ? P.grass4 : col === P.white ? G_BASE : col;
        else if (de <= 3.2 && hash2(x, y, 62) < 0.22) col = P.grass4;
        put(i, col);
      } else if (k === PATH) {
        const n = vnoise(x * 0.07, y * 0.07, 71);
        let col = n > 0.6 ? D_PATCH : D_BASE;
        const h = hash2(x, y, 72);
        if (h < 0.035) col = P.dirt3;
        else if (h > 0.975) col = P.dirt1;
        const de = dPathEdge[i];
        if (de <= 1.05) col = P.dirt4;
        else if (de <= 2.3) col = h < 0.75 ? P.dirt3 : D_PATCH;
        else if (de <= 3.4 && h < 0.3) col = P.dirt3;
        // grass overhang drops a shadow on the dirt below it
        if (y > 1 && cls[i - W] === GRASS) col = P.dirt5;
        else if (y > 2 && cls[i - 2 * W] === GRASS) col = P.dirt4;
        put(i, col);
      } else {
        // water: banded by distance from shore, with an earth bank on the north side
        const up = landAbove(x, y, 5);
        const ds = dShore[i];
        let col;
        if (up >= 1 && up <= 3) {
          const h = hash2(x, y, 81);
          col = up === 1 ? P.dirt4 : up === 2 ? (h < 0.3 ? P.dirt4 : P.dirt5) : h < 0.2 ? P.dirt5 : P.dirt6;
        } else if (up === 4) {
          col = P.water7;
        } else if (up === 5) {
          col = P.water6;
        } else if (ds <= 1.5) {
          col = P.water3;
        } else if (ds <= 3.2) {
          col = (x + y) % 2 === 0 && ds > 2.4 ? P.water5 : P.water4;
        } else if (ds <= 9) {
          col = P.water5;
        } else if (ds <= 10.5) {
          col = (x + y) % 2 === 0 ? P.water5 : P.water6;
        } else {
          col = P.water6;
        }
        put(i, col);
      }
    }
  }

  // pebbles on the paths
  const pebble = (x, y, big) => {
    const pts = big
      ? [[0, 0, P.dirt1], [1, 0, P.dirt1], [0, 1, P.dirt3], [1, 1, P.dirt4], [2, 1, P.dirt4], [2, 0, P.dirt3]]
      : [[0, 0, P.dirt1], [1, 0, P.dirt3], [0, 1, P.dirt4], [1, 1, P.dirt4]];
    for (const [dx, dy, col] of pts) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const i = py * W + px;
      if (cls[i] === PATH && dPathEdge[i] > 2.5) put(i, col);
    }
  };
  for (let gy = 0; gy < H; gy += 9) {
    for (let gx = 0; gx < W; gx += 9) {
      const r = hash2(gx, gy, 91);
      if (r > 0.3) continue;
      pebble(gx + Math.floor(hash2(gx, gy, 92) * 8), gy + Math.floor(hash2(gx, gy, 93) * 8), r < 0.1);
    }
  }

  g.putImageData(img, 0, 0);

  // ------------------------------------------------------------ tilled soil
  const sAt = (tx, ty) => tx >= 0 && ty >= 0 && tx < mw && ty < mh && soil[ty * mw + tx];
  for (let ty = 0; ty < mh; ty++) {
    for (let tx = 0; tx < mw; tx++) {
      if (!sAt(tx, ty)) continue;
      const n = sAt(tx, ty - 1);
      const s = sAt(tx, ty + 1);
      const w = sAt(tx - 1, ty);
      const e = sAt(tx + 1, ty);
      for (let j = 0; j < TILE; j++) {
        for (let i = 0; i < TILE; i++) {
          const px = tx * TILE + i;
          const py = ty * TILE + j;
          // rounded outer corners
          if (!n && !w && i + j < 2) continue;
          if (!n && !e && TILE - 1 - i + j < 2) continue;
          if (!s && !w && i + (TILE - 1 - j) < 2) continue;
          if (!s && !e && TILE - 1 - i + (TILE - 1 - j) < 2) continue;
          let col = P.soil2;
          const f = (j + 1) % 4;
          const h = hash2(px, py, 101);
          if (f === 0) col = P.soil3; // furrow
          else if (f === 1) col = h < 0.85 ? P.soil1 : P.soil2; // lit ridge
          else if (h < 0.08) col = P.soil3;
          else if (h > 0.95) col = P.soil1;
          const edge = (!n && j === 0) || (!w && i === 0) || (!e && i === TILE - 1);
          if (edge) col = P.soil3;
          if (!s && j === TILE - 1) col = P.soil4;
          if (!n && j === 1 && f !== 0) col = P.soil1;
          g.fillStyle = col;
          g.fillRect(px, py, 1, 1);
        }
      }
    }
  }

  // ------------------------------------------------------------------- dock
  const dAt = (tx, ty) => tx >= 0 && ty >= 0 && tx < mw && ty < mh && deck[ty * mw + tx];
  for (let ty = 0; ty < mh; ty++) {
    for (let tx = 0; tx < mw; tx++) {
      if (!dAt(tx, ty)) continue;
      const x0 = tx * TILE;
      const y0 = ty * TILE;
      const first = !dAt(tx - 1, ty);
      const last = !dAt(tx + 1, ty);
      // shadow on the water under the deck
      g.fillStyle = P.water7;
      for (let i = 0; i < TILE; i++) {
        for (let j = 14; j < 17; j++) {
          const px = x0 + i;
          const py = y0 + j;
          if (px < W && py < H && cls[py * W + px] === WATER) g.fillRect(px, py, 1, 1);
        }
      }
      for (let j = 1; j < 14; j++) {
        for (let i = 0; i < TILE; i++) {
          const px = x0 + i;
          const py = y0 + j;
          const plank = Math.floor(px / 4);
          const u = px % 4;
          let col = hash2(plank, ty, 111) < 0.35 ? P.wood3 : P.wood2;
          if (j === 1) col = P.wood1;
          if (u === 3) col = P.wood4;
          if (j === 2 && u !== 3) col = hash2(plank, ty, 112) < 0.5 ? P.wood1 : col;
          if (j >= 12) col = u === 3 ? P.wood5 : P.wood4;
          if (j === 13) col = P.wood5;
          if ((j === 3 || j === 10) && u === 1) col = P.wood5; // nails
          if (hash2(px, py, 113) < 0.03 && j > 2 && j < 12 && u !== 3) col = P.wood3;
          if (first && i === 0) col = P.wood5;
          if (last && i === TILE - 1) col = P.wood5;
          g.fillStyle = col;
          g.fillRect(px, py, 1, 1);
        }
      }
      g.fillStyle = P.wood5;
      g.fillRect(x0, y0, TILE, 1);
    }
  }

  // --------------------------------------------- data the game needs later
  // shoreline pixels for the animated foam, and a walk-blocking mask
  const shore = [];
  const blocked = new Uint8Array(W * H);
  let wx0 = W;
  let wy0 = H;
  let wx1 = 0;
  let wy1 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (cls[i] !== WATER) continue;
      const onDeck = dAt(Math.floor(x / TILE), Math.floor(y / TILE)) && y % TILE >= 1 && y % TILE < 14;
      if (!onDeck) blocked[i] = 1;
      if (x < wx0) wx0 = x;
      if (y < wy0) wy0 = y;
      if (x > wx1) wx1 = x;
      if (y > wy1) wy1 = y;
      const up = landAbove(x, y, 5);
      if (onDeck) continue;
      if (up === 4 || up === 5) shore.push({ x, y, d: up - 4, bank: true });
      else if (up === 0 && dShore[i] <= 3.2) shore.push({ x, y, d: dShore[i], bank: false });
    }
  }
  const waterMask = new Uint8Array(W * H);
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] !== WATER) continue;
    const x = i % W;
    const y = (i / W) | 0;
    const onDeck = dAt(Math.floor(x / TILE), Math.floor(y / TILE)) && y % TILE >= 1 && y % TILE < 16;
    // open water only: clear of the bank, the shallows and the dock
    if (!onDeck && dShore[i] > 4 && landAbove(x, y, 7) === 0) waterMask[i] = dShore[i] > 10.5 ? 2 : 1;
  }

  return {
    canvas,
    W,
    H,
    cls,
    blocked,
    shore,
    waterMask,
    waterBox: wx1 >= wx0 ? { x: wx0, y: wy0, w: wx1 - wx0 + 1, h: wy1 - wy0 + 1 } : null,
  };
}
