// Tiny pixel-art toolkit.
// Every sprite in this project is authored in code (character grids or small
// procedural painters) and rasterised into offscreen canvases at boot.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctxOf(canvas) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  return g;
}

const rgbCache = new Map();
export function hexRgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}

export function mix(hexA, hexB, t) {
  const a = hexRgb(hexA);
  const b = hexRgb(hexB);
  const c = [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Build a sprite from rows of characters and a char -> colour map. */
export function sprite(rows, map, name = 'sprite') {
  const h = rows.length;
  const w = rows[0].length;
  const c = makeCanvas(w, h);
  const g = ctxOf(c);
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    if (row.length !== w) {
      console.error(`[sprite:${name}] row ${y} is ${row.length} wide, expected ${w}`);
    }
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === undefined) continue;
      const col = map[ch];
      if (!col) {
        console.error(`[sprite:${name}] unknown key "${ch}" at ${x},${y}`);
        continue;
      }
      const [r, gg, b] = hexRgb(col);
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = gg;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const g = ctxOf(c);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

/** Layer several canvases into a new one. parts: [canvas, x, y][] */
export function stack(w, h, parts) {
  const c = makeCanvas(w, h);
  const g = ctxOf(c);
  for (const [img, x, y] of parts) g.drawImage(img, x, y);
  return c;
}

/**
 * Wind sway for small plants: shear the sprite row by row, the way you would
 * hand-animate it (roots stay planted, tips travel furthest).
 */
export function swayFrames(src, n, amp = 1, pow = 1.6, pad = 2) {
  const frames = [];
  const w = src.width + pad * 2;
  const h = src.height;
  for (let k = 0; k < n; k++) {
    const c = makeCanvas(w, h);
    const g = ctxOf(c);
    const s = Math.sin((k / n) * Math.PI * 2);
    for (let y = 0; y < h; y++) {
      const t = h > 1 ? 1 - y / (h - 1) : 0;
      const dx = Math.round(amp * Math.pow(t, pow) * s);
      g.drawImage(src, 0, y, src.width, 1, pad + dx, y, src.width, 1);
    }
    frames.push(c);
  }
  return frames;
}

/** Integer pixel buffer for procedural painters. */
export class Buf {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);
  }
  set(x, y, col) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = col;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  }
  rect(x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col);
  }
  hline(x0, x1, y, col) {
    for (let x = x0; x <= x1; x++) this.set(x, y, col);
  }
  vline(x, y0, y1, col) {
    for (let y = y0; y <= y1; y++) this.set(x, y, col);
  }
  /** Stamp a char grid at x,y. */
  grid(rows, map, ox, oy) {
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        this.set(ox + x, oy + y, map[ch]);
      }
    }
  }
  /** Add a 1px outline around everything that is opaque. */
  outline(col, diagonal = false) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        let hit =
          this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1);
        if (!hit && diagonal) {
          hit =
            this.get(x - 1, y - 1) ||
            this.get(x + 1, y - 1) ||
            this.get(x - 1, y + 1) ||
            this.get(x + 1, y + 1);
        }
        if (hit) add.push(y * this.w + x);
      }
    }
    for (const i of add) this.px[i] = col;
  }
  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    const g = ctxOf(c);
    const img = g.createImageData(this.w, this.h);
    const d = img.data;
    for (let i = 0; i < this.px.length; i++) {
      const col = this.px[i];
      if (!col) continue;
      const [r, gg, b] = hexRgb(col);
      d[i * 4] = r;
      d[i * 4 + 1] = gg;
      d[i * 4 + 2] = b;
      d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
}

// ---------------------------------------------------------------- randomness

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in 0..1 */
export function vnoise(x, y, s = 0) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, s);
  const b = hash2(x0 + 1, y0, s);
  const c = hash2(x0, y0 + 1, s);
  const d = hash2(x0 + 1, y0 + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Hard-edged ellipse made of pixel rows (no anti-aliasing). */
export function fillEllipse(g, cx, cy, rx, ry) {
  for (let y = -ry; y <= ry; y++) {
    const t = ry === 0 ? 0 : y / (ry + 0.5);
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    if (half <= 0) continue;
    g.fillRect(Math.round(cx) - half, Math.round(cy) + y, half * 2, 1);
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
