// Effects: particles, animated water, cloud shadows and the day/night lightmap.
import { P } from './palette.js';
import { makeCanvas, ctxOf, sprite, hash2, fillEllipse, lerp } from './pixel.js';

const HEART = sprite(['.r.r.', 'rRrrr', 'rrrrr', '.rrr.', '..r..'], { r: P.red2, R: P.pink1 }, 'heart');

// ----------------------------------------------------------------- particles

export class Fx {
  constructor() {
    this.parts = [];
    this.ripples = [];
  }
  add(p) {
    p.age = 0;
    this.parts.push(p);
  }
  dust(x, y) {
    for (let i = 0; i < 2; i++) {
      this.add({
        type: 'dust',
        x: x + (Math.random() - 0.5) * 5,
        y: y + (Math.random() - 0.5) * 2,
        vx: (Math.random() - 0.5) * 10,
        vy: -6 - Math.random() * 8,
        life: 0.38 + Math.random() * 0.15,
      });
    }
  }
  step(x, y) {
    this.add({ type: 'dust', x, y: y - 1, vx: (Math.random() - 0.5) * 6, vy: -5, life: 0.22, small: true });
  }
  blades(x, y) {
    for (let i = 0; i < 3; i++) {
      this.add({
        type: 'leaf',
        x: x + (Math.random() - 0.5) * 8,
        y,
        vx: (Math.random() - 0.5) * 26,
        vy: -22 - Math.random() * 16,
        g: 90,
        life: 0.45,
        cols: [P.grass2, P.grass4],
        sway: 0,
      });
    }
  }
  feather(x, y) {
    for (let i = 0; i < 3; i++) {
      this.add({
        type: 'leaf',
        x: x + (Math.random() - 0.5) * 6,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: -18 - Math.random() * 10,
        g: 40,
        life: 0.8,
        cols: [P.white, P.cream2],
        sway: 6,
      });
    }
  }
  leaf(x, y, cols) {
    this.add({
      type: 'leaf',
      x,
      y,
      vx: 5 + Math.random() * 7,
      vy: 9 + Math.random() * 5,
      g: 0,
      life: 3 + Math.random() * 1.5,
      cols,
      sway: 9,
      ph: Math.random() * 6,
    });
  }
  smoke(x, y) {
    this.add({
      type: 'smoke',
      x,
      y,
      vx: 3 + Math.random() * 3,
      vy: -9 - Math.random() * 3,
      life: 2.6 + Math.random() * 0.6,
      ph: Math.random() * 6,
    });
  }
  heart(x, y) {
    this.add({ type: 'heart', x, y, vx: 0, vy: -14, life: 0.9 });
  }
  ripple(x, y) {
    this.ripples.push({ x, y, age: 0, life: 1.3 });
  }
  update(dt) {
    for (const p of this.parts) {
      p.age += dt;
      if (p.g) p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter((r) => r.age < r.life);
  }
  draw(g, t) {
    for (const p of this.parts) {
      const k = p.age / p.life;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (p.type === 'dust') {
        g.fillStyle = k < 0.5 ? P.dirt1 : P.dirt3;
        if (p.small) g.fillRect(x, y, 1, 1);
        else if (k < 0.35) g.fillRect(x - 1, y - 1, 2, 2);
        else if (k < 0.7) g.fillRect(x - 1, y, 2, 1);
        else g.fillRect(x, y, 1, 1);
      } else if (p.type === 'leaf') {
        const sx = p.sway ? Math.round(Math.sin(p.age * 4 + (p.ph || 0)) * p.sway * 0.4) : 0;
        const flip = Math.floor(p.age * 6 + (p.ph || 0)) % 2;
        g.fillStyle = p.cols[0];
        g.fillRect(x + sx, y, 1, 1);
        g.fillStyle = p.cols[1];
        g.fillRect(x + sx + (flip ? 1 : -1), y + (flip ? 0 : 1), 1, 1);
      } else if (p.type === 'smoke') {
        const wob = Math.round(Math.sin(p.age * 2 + p.ph) * 2);
        const r = k < 0.15 ? 1 : k < 0.45 ? 2 : k < 0.8 ? 3 : 2;
        g.fillStyle = k < 0.3 ? P.stone1 : k < 0.65 ? P.stone2 : P.stone3;
        if (k > 0.82) {
          // break up into a dither as it thins out
          for (let j = -r; j <= r; j++) {
            for (let i = -r; i <= r; i++) {
              if (i * i + j * j <= r * r && (i + j) % 2 === 0) g.fillRect(x + wob + i, y + j, 1, 1);
            }
          }
        } else {
          fillEllipse(g, x + wob, y, r, r);
          g.fillStyle = P.white;
          if (r >= 2 && k < 0.5) g.fillRect(x + wob - 1, y - 1, 1, 1);
        }
      } else if (p.type === 'heart') {
        g.drawImage(HEART, x - 2, y - 2);
      }
    }
  }
}

// --------------------------------------------------------------------- water

/** Animated overlay for the pond: lapping foam, drifting glints and ripples. */
export class WaterFx {
  constructor(terrain) {
    this.t = terrain;
    this.box = terrain.waterBox;
    this.canvas = makeCanvas(this.box ? this.box.w : 1, this.box ? this.box.h : 1);
    this.g = ctxOf(this.canvas);
    this.acc = 1;
    this.sparks = [];
    if (this.box) {
      let tries = 0;
      while (this.sparks.length < 22 && tries++ < 4000) {
        const x = this.box.x + Math.floor(hash2(tries, 1, 7) * this.box.w);
        const y = this.box.y + Math.floor(hash2(tries, 2, 7) * this.box.h);
        if (terrain.waterMask[y * terrain.W + x]) this.sparks.push({ x, y, ph: hash2(tries, 3, 7) * 40 });
      }
    }
  }
  update(dt, time, ripples) {
    if (!this.box) return;
    this.acc += dt;
    if (this.acc < 1 / 9) return; // water animates on its own slow clock
    this.acc = 0;
    const { g, box } = this;
    const { waterMask, W, shore } = this.t;
    g.clearRect(0, 0, box.w, box.h);
    const px = (x, y, col) => {
      g.fillStyle = col;
      g.fillRect(x - box.x, y - box.y, 1, 1);
    };
    // foam breathing in and out along the shoreline
    for (const s of shore) {
      if (s.bank) {
        const v = Math.sin(time * 1.9 + s.x * 0.33);
        if (s.d === 0) {
          if (v > 0.7) px(s.x, s.y, P.water2);
          else if (v > 0.25) px(s.x, s.y, P.water4);
        } else if (v > 0.88) px(s.x, s.y, P.water3);
      } else {
        const wave = 1.25 + 0.95 * Math.sin(time * 1.5 + s.x * 0.17 + s.y * 0.21);
        if (s.d <= wave * 0.72) px(s.x, s.y, P.water1);
        else if (s.d <= wave * 1.25) px(s.x, s.y, P.water2);
      }
    }
    // glints: short dashes sliding along gently waving lanes
    for (let ly = box.y; ly < box.y + box.h; ly += 5) {
      const lane = Math.floor(ly / 5);
      const dir = lane % 2 ? 1 : -1;
      const off = time * 5 * dir + lane * 37;
      for (let x = box.x; x < box.x + box.w; x++) {
        const xs = x + off;
        const seg = Math.floor(xs / 15);
        if (hash2(seg, lane, 3) > 0.46) continue;
        const pos = xs - seg * 15;
        const len = 3 + hash2(seg, lane, 4) * 6 + Math.sin(time * 2 + seg) * 1.5;
        if (pos > len) continue;
        const y = ly + Math.round(Math.sin(x * 0.12 + time * 1.2 + lane) * 1.3);
        const m = waterMask[y * W + x];
        if (!m) continue;
        const core = pos > 1 && pos < len - 1.5;
        px(x, y, m === 2 ? (core ? P.water4 : P.water5) : core ? P.water3 : P.water4);
      }
    }
    // twinkles
    for (const s of this.sparks) {
      const v = Math.sin(time * 2.4 + s.ph);
      if (v > 0.93) {
        px(s.x, s.y, P.water1);
        px(s.x - 1, s.y, P.water2);
        px(s.x + 1, s.y, P.water2);
        px(s.x, s.y - 1, P.water2);
        px(s.x, s.y + 1, P.water2);
      } else if (v > 0.82) px(s.x, s.y, P.water2);
    }
    // expanding ripple rings
    for (const r of ripples) {
      const k = r.age / r.life;
      const rx = 2 + k * 9;
      const ry = rx * 0.5;
      const n = Math.ceil(rx * 5);
      for (let i = 0; i < n; i++) {
        if (k > 0.55 && i % 2) continue;
        const a = (i / n) * Math.PI * 2;
        const x = Math.round(r.x + Math.cos(a) * rx);
        const y = Math.round(r.y + Math.sin(a) * ry);
        if (x < box.x || y < box.y || x >= box.x + box.w || y >= box.y + box.h) continue;
        if (!waterMask[y * W + x]) continue;
        px(x, y, k < 0.4 ? P.water2 : P.water3);
      }
    }
  }
  draw(g) {
    if (this.box) g.drawImage(this.canvas, this.box.x, this.box.y);
  }
}

// -------------------------------------------------------------------- clouds

export function makeCloudShadow(seed) {
  const w = 150;
  const h = 80;
  const c = makeCanvas(w, h);
  const g = ctxOf(c);
  g.fillStyle = '#16304a';
  const blobs = [
    [45, 42, 40, 22],
    [85, 36, 46, 26],
    [112, 48, 32, 18],
    [62, 54, 38, 16],
  ];
  for (const [x, y, rx, ry] of blobs) fillEllipse(g, x + (hash2(seed, x, 1) - 0.5) * 10, y, rx, ry);
  return c;
}

// ------------------------------------------------------------------ lighting

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const lightCache = new Map();
/** Radial light as stepped, dithered bands (keeps the glow looking pixelled). */
function lightSprite(r, rgb) {
  const key = r + '|' + rgb.join(',');
  let c = lightCache.get(key);
  if (c) return c;
  const s = r * 2;
  c = makeCanvas(s, s);
  const g = ctxOf(c);
  const img = g.createImageData(s, s);
  const LEVELS = 6;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      if (d >= 1) continue;
      const v = Math.pow(1 - d, 1.5) * LEVELS;
      const lvl = Math.min(LEVELS, Math.floor(v + BAYER[(y & 3) * 4 + (x & 3)] / 16));
      if (lvl <= 0) continue;
      const k = lvl / LEVELS;
      const i = (y * s + x) * 4;
      img.data[i] = rgb[0] * k;
      img.data[i + 1] = rgb[1] * k;
      img.data[i + 2] = rgb[2] * k;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  lightCache.set(key, c);
  return c;
}

const WARM = [255, 196, 120];
const FIREFLY = [190, 235, 120];

// time-of-day keyframes: [t, r, g, b]
const SKY = [
  [0.0, 255, 255, 255],
  [0.46, 255, 255, 255],
  [0.56, 255, 222, 178],
  [0.64, 232, 150, 150],
  [0.72, 84, 92, 170],
  [0.9, 78, 86, 164],
  [0.96, 214, 160, 176],
  [1.0, 255, 255, 255],
];

export function skyAt(t) {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < SKY.length - 1; i++) {
    const a = SKY[i];
    const b = SKY[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const k = (t - a[0]) / (b[0] - a[0] || 1);
      return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)];
    }
  }
  return [255, 255, 255];
}

export function darknessAt(t) {
  const [r, g] = skyAt(t);
  return Math.min(1, Math.max(0, (255 - Math.min(r, g)) / 170));
}

export function phaseName(t) {
  t = ((t % 1) + 1) % 1;
  if (t < 0.12) return 'Morning';
  if (t < 0.46) return 'Day';
  if (t < 0.6) return 'Afternoon';
  if (t < 0.7) return 'Dusk';
  if (t < 0.92) return 'Night';
  return 'Dawn';
}

export class Lighting {
  constructor() {
    this.canvas = makeCanvas(1, 1);
    this.g = ctxOf(this.canvas);
  }
  /** lights: [{x,y,r,kind}] in screen space */
  draw(target, vw, vh, tod, lights) {
    const dark = darknessAt(tod);
    if (dark <= 0.01) return;
    if (this.canvas.width !== vw || this.canvas.height !== vh) {
      this.canvas.width = vw;
      this.canvas.height = vh;
      this.g = ctxOf(this.canvas);
    }
    const g = this.g;
    const [r, gg, b] = skyAt(tod);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
    g.fillRect(0, 0, vw, vh);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = Math.min(1, dark * 1.25);
    for (const l of lights) {
      const s = lightSprite(l.r, l.kind === 'fly' ? FIREFLY : WARM);
      g.drawImage(s, Math.round(l.x - l.r), Math.round(l.y - l.r));
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    target.globalCompositeOperation = 'multiply';
    target.drawImage(this.canvas, 0, 0);
    target.globalCompositeOperation = 'source-over';
  }
}

// ----------------------------------------------------------------- fireflies

export class Fireflies {
  constructor(n, W, H, seed = 5) {
    this.list = [];
    for (let i = 0; i < n; i++) {
      this.list.push({
        hx: 60 + hash2(i, 1, seed) * (W - 120),
        hy: 60 + hash2(i, 2, seed) * (H - 120),
        p: hash2(i, 3, seed) * 20,
        s: 0.4 + hash2(i, 4, seed) * 0.5,
        x: 0,
        y: 0,
        on: false,
      });
    }
  }
  update(dt) {
    for (const f of this.list) {
      f.p += dt * f.s;
      f.x = f.hx + Math.sin(f.p * 0.8) * 22 + Math.sin(f.p * 1.9) * 8;
      f.y = f.hy + Math.cos(f.p * 1.1) * 12 + Math.sin(f.p * 2.7) * 4 - 10;
      f.on = Math.sin(f.p * 2.2) > -0.2;
    }
  }
  draw(g, amount) {
    if (amount < 0.35) return;
    for (const f of this.list) {
      if (!f.on) continue;
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      g.fillStyle = P.gold1;
      g.fillRect(x, y, 1, 1);
      g.fillStyle = '#c8f070';
      g.fillRect(x - 1, y, 1, 1);
      g.fillRect(x + 1, y, 1, 1);
      g.fillRect(x, y - 1, 1, 1);
      g.fillRect(x, y + 1, 1, 1);
    }
  }
}
