// Scene layout: where the paths, pond, cottage, farm plot and every prop sit.
import { TILE, T, buildTerrain } from './terrain.js';
import { HOUSE } from './art/house.js';
import { mulberry32, hash2 } from './pixel.js';

export const MAP_W = 48;
export const MAP_H = 32;

/** A static or frame-animated sprite standing in the world, anchored at its foot. */
export class Thing {
  constructor(frames, x, y, o = {}) {
    this.frames = Array.isArray(frames) ? frames : [frames];
    const f = this.frames[0];
    this.x = x;
    this.y = y;
    this.w = f.width;
    this.h = f.height;
    this.ax = o.ax ?? Math.floor(f.width / 2);
    this.ay = o.ay ?? f.height;
    this.fps = o.fps || 0;
    this.phase = o.phase || 0;
    this.sortY = y + (o.bias || 0);
    this.shadow = o.shadow || null; // [rx, ry, dy]
    this.kind = o.kind || 'prop';
    this.flat = !!o.flat; // drawn under everything (lily pads)
  }
  frame(t) {
    if (!this.fps) return this.frames[0];
    const n = this.frames.length;
    return this.frames[Math.floor(t * this.fps + this.phase) % n];
  }
  draw(g, t) {
    g.drawImage(this.frame(t), Math.round(this.x - this.ax), Math.round(this.y - this.ay));
  }
}

/** Tall grass that shivers when something walks through it. */
class Tuft extends Thing {
  constructor(frames, rustle, x, y, phase) {
    super(frames, x, y, { fps: 5, phase, kind: 'tuft' });
    this.rustleFrames = rustle;
    this.rustle = 0;
  }
  frame(t) {
    if (this.rustle > 0) {
      const n = this.rustleFrames.length;
      return this.rustleFrames[Math.floor(t * 14) % n];
    }
    return super.frame(t);
  }
  draw(g, t) {
    const f = this.frame(t);
    g.drawImage(f, Math.round(this.x - f.width / 2), Math.round(this.y - f.height));
  }
}

export function buildWorld(art) {
  const tiles = new Uint8Array(MAP_W * MAP_H);
  const soil = new Uint8Array(MAP_W * MAP_H);
  const deck = new Uint8Array(MAP_W * MAP_H);
  const idx = (x, y) => y * MAP_W + x;
  const rect = (x0, y0, x1, y1, t, arr = tiles) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) arr[idx(x, y)] = t;
  };
  const ellipse = (cx, cy, rx, ry, t) => {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) tiles[idx(x, y)] = t;
      }
    }
  };

  // ------------------------------------------------------------- the layout
  rect(15, 11, 15, 16, T.PATH); // front walk
  rect(0, 17, 29, 18, T.PATH); // main road
  rect(21, 19, 22, 31, T.PATH); // south road
  rect(9, 19, 10, 19, T.PATH); // spur to the farm gate
  ellipse(37, 16.5, 6.6, 4.6, T.WATER);
  ellipse(40.5, 13.4, 3.1, 2.5, T.WATER);
  ellipse(34.2, 20, 3.1, 1.9, T.WATER);
  rect(30, 17, 33, 17, 1, deck);
  rect(7, 22, 12, 24, 1, soil);

  const terrain = buildTerrain(tiles, soil, deck, MAP_W, MAP_H);
  const { W, H, blocked, cls } = terrain;

  const things = [];
  const lights = [];
  const reserved = []; // rects kept clear of random scatter
  const solid = (x0, y0, x1, y1) => {
    for (let y = Math.max(0, y0 | 0); y <= Math.min(H - 1, y1 | 0); y++) {
      for (let x = Math.max(0, x0 | 0); x <= Math.min(W - 1, x1 | 0); x++) blocked[y * W + x] = 1;
    }
  };
  const reserve = (x0, y0, x1, y1) => reserved.push([x0, y0, x1, y1]);
  const isReserved = (x, y) => reserved.some((r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
  const add = (frames, x, y, o) => {
    const th = new Thing(frames, x, y, o);
    things.push(th);
    return th;
  };
  const tx = (t) => t * TILE;

  // map border is impassable
  solid(0, 0, W - 1, 5);
  solid(0, H - 6, W - 1, H - 1);
  solid(0, 0, 5, H - 1);
  solid(W - 6, 0, W - 1, H - 1);

  // ------------------------------------------------------------- the cottage
  const hx = tx(13);
  const hy = tx(11);
  const house = add(art.house.day, hx, hy, { ax: 0, ay: HOUSE.baseY, kind: 'house' });
  house.lit = art.house.lit;
  solid(hx + 8, hy - 30, hx + 92, hy - 1);
  reserve(hx - 6, hy - 96, hx + 106, hy + 10);
  for (const l of HOUSE.lights) {
    lights.push({ x: hx + l.x, y: hy - HOUSE.baseY + l.y, r: l.r, warm: true });
  }
  const chimney = { x: hx + HOUSE.chimney.x, y: hy - HOUSE.baseY + HOUSE.chimney.y };

  // ------------------------------------------------------------------ trees
  const tree = (frames, x, y, o = {}) => {
    const th = add(frames, x, y, {
      fps: 5,
      phase: hash2(x, y, 5) * 8,
      shadow: o.shadow || [15, 5, -1],
      kind: 'tree',
      ...o,
    });
    solid(x - 4, y - 6, x + 4, y - 1);
    reserve(x - 10, y - 10, x + 10, y + 6);
    return th;
  };
  const T_ = art.trees;
  tree(T_.apple, tx(23.5), tx(11.4));
  tree(T_.oak, tx(8.5), tx(10.5));
  tree(T_.oak2, tx(27.5), tx(7.5));
  tree(T_.oak, tx(27), tx(25));
  tree(T_.oak2, tx(16.5), tx(27));
  tree(T_.blossom, tx(31.5), tx(11.6)).petals = true;
  tree(T_.maple, tx(43.4), tx(23.5)).leaves = true;
  tree(T_.oak, tx(36.5), tx(26));
  tree(T_.oak, tx(42), tx(8.5));
  tree(T_.pine, tx(5.5), tx(14.5), { shadow: [11, 4, -1] });
  tree(T_.pine2, tx(19.5), tx(6.2), { shadow: [11, 4, -1] });
  tree(T_.pine, tx(35), tx(7), { shadow: [11, 4, -1] });

  // ----------------------------------------------------------------- bushes
  const bush = (frames, x, y) => {
    add(frames, x, y, { fps: 4, phase: hash2(x, y, 6) * 8, shadow: [11, 3, -1], kind: 'bush' });
    solid(x - 9, y - 6, x + 9, y - 1);
    reserve(x - 14, y - 12, x + 14, y + 4);
  };
  bush(T_.bush, tx(11.6), tx(11.3));
  bush(T_.berryBush, tx(20.4), tx(11.2));
  bush(T_.bush, tx(25.5), tx(19.9));
  bush(T_.berryBush, tx(15.2), tx(21.4));
  bush(T_.bush, tx(33.5), tx(23.4));
  bush(T_.bush, tx(18), tx(24.2));
  bush(T_.berryBush, tx(40.5), tx(26.5));
  bush(T_.bush, tx(4.6), tx(20.4));

  // ------------------------------------------------------------------ rocks
  const rock = (i, x, y) => {
    const f = art.props.rocks[i];
    add(f, x, y, { shadow: [f.width / 2, 2, -1], kind: 'rock' });
    solid(x - f.width / 2 + 1, y - (i === 0 ? 4 : 7), x + f.width / 2 - 1, y - 1);
    reserve(x - f.width / 2 - 2, y - f.height, x + f.width / 2 + 2, y + 2);
  };
  rock(2, tx(44.6), tx(18.6));
  rock(1, tx(31.4), tx(21.6));
  rock(1, tx(39.5), tx(22.2));
  rock(0, tx(29.4), tx(19.9));
  rock(0, tx(24.6), tx(21.2));
  rock(1, tx(3.8), tx(15.8));
  rock(0, tx(18.2), tx(27.2));
  rock(0, tx(10.2), tx(15.2));
  rock(1, tx(29.6), tx(8.4));

  // ------------------------------------------------------- lamps, sign, etc
  const lamp = (x, y) => {
    const th = add(art.props.lamp.off, x, y, { shadow: [5, 2, -1], kind: 'lamp' });
    th.on = art.props.lamp.on;
    solid(x - 3, y - 4, x + 3, y - 1);
    reserve(x - 8, y - 34, x + 8, y + 4);
    lights.push({ x, y: y - 23, r: 46, warm: true, lamp: true });
  };
  lamp(tx(17.1), tx(16.6));
  lamp(tx(28.9), tx(16.5));
  lamp(tx(20.2), tx(20.4));
  lamp(tx(8.3), tx(19.7));

  const sign = add(art.props.sign, tx(13.9), tx(16.7), { shadow: [7, 2, -1], kind: 'sign' });
  solid(sign.x - 4, sign.y - 4, sign.x + 4, sign.y - 1);
  reserve(sign.x - 12, sign.y - 20, sign.x + 12, sign.y + 4);

  const mailbox = add(art.props.mailbox, tx(17.4), tx(12.1), { shadow: [5, 2, -1], kind: 'mailbox' });
  solid(mailbox.x - 3, mailbox.y - 4, mailbox.x + 3, mailbox.y - 1);

  const barrel = add(art.props.barrel, hx - 4, hy + 2, { shadow: [8, 3, -1] });
  solid(barrel.x - 7, barrel.y - 7, barrel.x + 7, barrel.y - 1);
  const crate = add(art.props.crate, hx - 15, hy + 9, { shadow: [8, 3, -1] });
  solid(crate.x - 7, crate.y - 8, crate.x + 7, crate.y - 1);
  reserve(hx - 30, hy - 20, hx + 6, hy + 14);

  const stump = (x, y) => {
    add(art.props.stump, x, y, { shadow: [9, 3, -1] });
    solid(x - 7, y - 7, x + 7, y - 1);
    reserve(x - 12, y - 14, x + 12, y + 4);
  };
  stump(tx(5.2), tx(16.2));
  stump(tx(39.2), tx(27.6));
  stump(tx(24.4), tx(27.3));

  // ------------------------------------------------------------------- farm
  const F = { x0: 6, y0: 20, x1: 13, y1: 25 };
  const isFence = (x, y) => {
    if (x < F.x0 || x > F.x1 || y < F.y0 || y > F.y1) return false;
    const border = x === F.x0 || x === F.x1 || y === F.y0 || y === F.y1;
    if (!border) return false;
    if (y === F.y0 && (x === 9 || x === 10)) return false; // gate
    return true;
  };
  for (let y = F.y0; y <= F.y1; y++) {
    for (let x = F.x0; x <= F.x1; x++) {
      if (!isFence(x, y)) continue;
      const mask =
        (isFence(x, y - 1) ? 1 : 0) | (isFence(x + 1, y) ? 2 : 0) | (isFence(x, y + 1) ? 4 : 0) | (isFence(x - 1, y) ? 8 : 0);
      add(art.props.fence[mask], tx(x), tx(y) + 16, { ax: 0, ay: 18, bias: -3, kind: 'fence' });
      solid(tx(x) + 5, tx(y) + 6, tx(x) + 10, tx(y) + 13);
      if (mask & 2) solid(tx(x) + 10, tx(y) + 8, tx(x) + 15, tx(y) + 13);
      if (mask & 8) solid(tx(x), tx(y) + 8, tx(x) + 5, tx(y) + 13);
      if (mask & 1) solid(tx(x) + 6, tx(y), tx(x) + 9, tx(y) + 6);
      if (mask & 4) solid(tx(x) + 6, tx(y) + 13, tx(x) + 9, tx(y) + 15);
    }
  }
  reserve(tx(F.x0) - 4, tx(F.y0) - 8, tx(F.x1 + 1) + 4, tx(F.y1 + 1) + 4);
  const crop = (frames, cx, cy, o = {}) =>
    add(frames, tx(cx) + 8, tx(cy) + 13, { fps: frames.length > 1 ? 4 : 0, phase: cx * 1.7 + cy, kind: 'crop', ...o });
  const C = art.props.crops;
  for (const x of [7, 8, 11, 12]) crop(C.sunflower, x, 21, { ay: 20 });
  for (let x = 7; x <= 12; x++) crop(C.tomato, x, 22);
  for (let x = 7; x <= 12; x++) {
    const sprout = x === 9 || x === 10;
    crop(sprout ? C.sprout : C.cabbage, x, 23, { ay: sprout ? 8 : 11 });
  }
  for (let x = 7; x <= 12; x++) crop(x % 2 ? C.pumpkin : C.sprout, x, 24, { ay: x % 2 ? 12 : 8 });
  const scare = add(art.props.scarecrow, tx(10), tx(23.6), { shadow: [6, 2, -1], kind: 'scarecrow' });
  solid(scare.x - 3, scare.y - 4, scare.x + 3, scare.y - 1);
  for (let x = 7; x <= 12; x++) {
    for (let y = 22; y <= 24; y++) solid(tx(x) + 3, tx(y) + 5, tx(x) + 12, tx(y) + 12);
  }

  // ------------------------------------------------------------------- pond
  const nearestShore = (x, y) => {
    let best = null;
    let bd = 1e9;
    for (const s of terrain.shore) {
      if (s.bank) continue;
      const d = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  };
  for (const [rx, ry] of [
    [31.4, 19.4],
    [43.2, 18.6],
    [36.2, 21.4],
    [41.4, 20.4],
    [30.8, 15.4],
  ]) {
    const s = nearestShore(tx(rx), tx(ry));
    if (!s) continue;
    add(art.props.reeds, s.x, s.y + 3, { fps: 4, phase: rx * 3, kind: 'reeds' });
    add(art.props.reeds, s.x + 6, s.y + 5, { fps: 4, phase: rx * 3 + 2, kind: 'reeds' });
  }
  const pads = [
    [36.2, 15.6, 1],
    [38.9, 17.9, 0],
    [35.1, 18.5, 0],
    [40.6, 14.3, 1],
    [37.4, 19.4, 0],
    [41.5, 16.2, 0],
    [34.4, 15.1, 0],
  ];
  for (const [px, py, k] of pads) {
    add(art.props.lily[k], tx(px), tx(py), { flat: true, kind: 'lily', phase: px });
  }
  // dock posts
  for (const [px, py] of [
    [tx(34) - 3, tx(17) + 5],
    [tx(34) - 3, tx(17) + 20],
    [tx(32) - 2, tx(17) + 20],
  ]) {
    add(art.props.dockPost, px, py, { kind: 'post' });
  }
  solid(tx(34) - 6, tx(17), tx(34), tx(18));
  reserve(tx(29), tx(16), tx(34), tx(19));

  // forest wall around the clearing
  const rnd = mulberry32(1234);
  const kinds = [T_.oak, T_.oak2, T_.pine, T_.pine2, T_.oak, T_.pine];
  for (let ty = 0; ty < MAP_H; ty += 2) {
    for (let txx = 0; txx < MAP_W; txx += 2) {
      const edge = Math.min(txx, ty, MAP_W - 1 - txx, MAP_H - 2 - ty);
      const p = edge < 3 ? 0.95 : edge < 5 ? 0.3 : 0;
      const r = rnd();
      const jx = (rnd() - 0.5) * 12;
      const jy = (rnd() - 0.5) * 10;
      const k = Math.floor(rnd() * kinds.length);
      if (r > p) continue;
      const x = tx(txx + 1) + jx;
      const y = tx(ty + 1.6) + jy;
      // keep the road exits and anything already placed clear
      let clear = true;
      for (let oy = -1; oy <= 1 && clear; oy++) {
        for (let ox = -1; ox <= 1 && clear; ox++) {
          const cx = Math.floor(x / TILE) + ox;
          const cy = Math.floor((y - 4) / TILE) + oy;
          if (cx < 0 || cy < 0 || cx >= MAP_W || cy >= MAP_H) continue;
          if (tiles[idx(cx, cy)] !== T.GRASS) clear = false;
        }
      }
      if (!clear || isReserved(x, y)) continue;
      const pineLike = k === 2 || k === 3 || k === 5;
      tree(kinds[k], x, y, pineLike ? { shadow: [11, 4, -1] } : {});
    }
  }


  // ------------------------------------------------------- flowers & tufts
  const isGrass = (x, y, m = 5) => {
    for (const [ox, oy] of [
      [0, 0],
      [-m, 0],
      [m, 0],
      [0, -m],
      [0, m],
    ]) {
      const px = Math.round(x + ox);
      const py = Math.round(y + oy);
      if (px < 8 || py < 8 || px >= W - 8 || py >= H - 8) return false;
      if (cls[py * W + px] !== 0) return false;
    }
    const tX = Math.floor(x / TILE);
    const tY = Math.floor(y / TILE);
    if (soil[idx(tX, tY)]) return false;
    return !isReserved(x, y);
  };
  const FLW = art.props.flowers;
  const drifts = [
    [19, 21.5, [0, 1, 4]],
    [26, 21.5, [2, 0]],
    [10.5, 13.8, [1, 3]],
    [39, 24, [3, 0, 2]],
    [25, 5.8, [4, 0]],
    [33.5, 12.6, [2, 2, 0]],
    [16.5, 21.5, [3, 4]],
    [24.5, 14.6, [0, 4]],
    [12, 29, [1, 2]],
    [44, 13, [1, 0]],
  ];
  for (const [cx, cy, kindsF] of drifts) {
    const n = 7 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * 26;
      const x = Math.round(tx(cx) + Math.cos(a) * d * 1.3);
      const y = Math.round(tx(cy) + Math.sin(a) * d * 0.8);
      if (!isGrass(x, y, 4)) continue;
      const kf = kindsF[Math.floor(rnd() * kindsF.length)];
      add(FLW[kf], x, y, { fps: 4, phase: x * 0.13 + y * 0.07, kind: 'flower' });
    }
  }
  const tufts = [];
  for (let i = 0; i < 300; i++) {
    const x = Math.round(24 + rnd() * (W - 48));
    const y = Math.round(24 + rnd() * (H - 48));
    // tufts grow in patches rather than evenly
    if (hash2(Math.floor(x / 40), Math.floor(y / 40), 77) < 0.5) continue;
    if (!isGrass(x, y, 7)) continue;
    const t = new Tuft(art.props.tuft, art.props.tuftRustle, x, y, x * 0.11 + y * 0.05);
    things.push(t);
    tufts.push(t);
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.round(40 + rnd() * (W - 80));
    const y = Math.round(40 + rnd() * (H - 80));
    const edge = Math.min(x, y, W - x, H - y);
    if (edge > 110 || !isGrass(x, y, 4)) continue;
    add(art.props.mushroom, x, y, { kind: 'mushroom' });
  }

  return {
    terrain,
    tiles,
    things,
    tufts,
    lights,
    chimney,
    blocked,
    W,
    H,
    house,
    sign,
    spawn: { x: tx(15.5), y: tx(12.6) },
    pond: { cx: tx(37.6), cy: tx(16.6), rx: tx(3.4), ry: tx(1.6) },
  };
}
