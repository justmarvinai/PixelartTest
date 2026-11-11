// HUD: wooden panels, time-of-day badge, dialog box and the touch stick.
import { P } from './palette.js';
import { sprite } from './pixel.js';
import { drawText, drawTextCentered, textWidth, LINE_H } from './font.js';

const SUN = sprite(
  [
    '....y....',
    '.y.....y.',
    '...yyy...',
    '..yYYYy..',
    'y.yYWYy.y',
    '..yYYYy..',
    '...yyy...',
    '.y.....y.',
    '....y....',
  ],
  { y: P.gold3, Y: P.gold2, W: P.gold1 },
  'sun',
);
const MOON = sprite(
  [
    '..mmmm...',
    '.mMMMm...',
    'mMMMm....',
    'mMMm.....',
    'mMMm.....',
    'mMMMm...m',
    '.mMMMmmmm',
    '..mMMMMm.',
    '...mmmm..',
  ],
  { m: '#8894c4', M: '#eef2ff' },
  'moon',
);
const DUSK = sprite(
  [
    '.........',
    '....y....',
    '.y.....y.',
    '...yyy...',
    '..yYYYy..',
    'y.yYWYy.y',
    'ooooooooo',
    '.o.ooo.o.',
    '...o.o...',
  ],
  { y: P.orange2, Y: P.orange1, W: P.gold1, o: P.red3 },
  'dusk',
);

export function panel(g, x, y, w, h, paper = true) {
  g.fillStyle = P.ink2;
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle = P.wood3;
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = P.wood1;
  g.fillRect(x + 2, y + 1, w - 4, 1);
  g.fillRect(x + 1, y + 2, 1, h - 4);
  g.fillStyle = P.wood4;
  g.fillRect(x + 2, y + h - 2, w - 4, 1);
  g.fillRect(x + w - 2, y + 2, 1, h - 4);
  if (paper) {
    g.fillStyle = P.wood5;
    g.fillRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle = '#f7e9c8';
    g.fillRect(x + 4, y + 4, w - 8, h - 8);
    g.fillStyle = '#e6d3ab';
    g.fillRect(x + 4, y + h - 5, w - 8, 1);
    g.fillRect(x + w - 5, y + 4, 1, h - 8);
  }
}

export function wrap(text, maxW) {
  const lines = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (textWidth(test) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function drawHud(g, vw, vh, game) {
  const { tod, phase, dark, time } = game.sky;
  // time-of-day badge
  const label = phase;
  const bw = textWidth(label) + 24;
  panel(g, vw - bw - 4, 4, bw, 15, false);
  const icon = dark > 0.6 ? MOON : dark > 0.12 ? DUSK : SUN;
  g.drawImage(icon, vw - bw - 1, 7);
  drawText(g, label, vw - bw + 11, 8, P.cream1, P.wood5);
  void tod;

  // controls hint
  const a = game.hintT;
  if (a > 0 && !game.dialog) {
    const lines = game.touch
      ? ['Left thumb: move', 'Right thumb: hold to run, tap to talk']
      : ['WASD / Arrows: move     Shift: run     Space: talk', 'G: sprite gallery     T: skip time'];
    const blink = a < 1.5 && Math.floor(time * 8) % 2 === 0;
    if (!blink) {
      let y = vh - 8 - lines.length * LINE_H;
      for (const l of lines) {
        if (textWidth(l) > vw - 8) continue;
        drawTextCentered(g, l, vw / 2, y, P.white, P.ink);
        y += LINE_H;
      }
    }
  }

  // prompt above whatever can be talked to
  if (game.prompt && !game.dialog) {
    const p = game.prompt;
    const w = textWidth(p.label) + 8;
    const x = Math.round(p.sx - w / 2);
    const y = Math.round(p.sy - 12 + Math.sin(time * 5) * 1.2);
    g.fillStyle = P.ink2;
    g.fillRect(x, y, w, 11);
    g.fillRect(x + 1, y - 1, w - 2, 13);
    g.fillStyle = P.cream1;
    g.fillRect(x + 1, y, w - 2, 11);
    g.fillStyle = P.ink2;
    g.fillRect(p.sx - 1, y + 12, 3, 1);
    g.fillRect(p.sx, y + 13, 1, 1);
    drawText(g, p.label, x + 4, y + 2, P.ink2);
  }

  // dialog
  if (game.dialog) {
    const d = game.dialog;
    const w = Math.min(vw - 12, 260);
    const lines = wrap(d.text, w - 20);
    const h = Math.max(34, 14 + lines.length * LINE_H + (d.name ? 4 : 0));
    const x = Math.round((vw - w) / 2);
    const y = vh - h - 6;
    panel(g, x, y, w, h);
    if (d.name) {
      const nw = textWidth(d.name) + 10;
      panel(g, x + 6, y - 8, nw, 13, false);
      drawText(g, d.name, x + 11, y - 5, P.cream1, P.wood5);
    }
    let shown = Math.floor(d.t * 46);
    let ty = y + 8 + (d.name ? 3 : 0);
    let done = true;
    for (const l of lines) {
      const part = l.slice(0, Math.max(0, shown));
      if (part.length < l.length) done = false;
      drawText(g, part, x + 10, ty, P.ink2);
      shown -= l.length;
      ty += LINE_H;
    }
    d.done = done;
    if (done && Math.floor(time * 3) % 2 === 0) {
      g.fillStyle = P.red3;
      g.fillRect(x + w - 14, y + h - 10, 5, 1);
      g.fillRect(x + w - 13, y + h - 9, 3, 1);
      g.fillRect(x + w - 12, y + h - 8, 1, 1);
    }
  }

  // touch stick
  if (game.stick) {
    const s = game.stick;
    ring(g, s.bx, s.by, 15, 'rgba(255,250,240,0.55)');
    ring(g, s.bx, s.by, 14, 'rgba(42,34,56,0.45)');
    disc(g, Math.round(s.bx + s.dx), Math.round(s.by + s.dy), 6, 'rgba(255,250,240,0.8)');
    ring(g, Math.round(s.bx + s.dx), Math.round(s.by + s.dy), 6, 'rgba(42,34,56,0.7)');
  }
}

function ring(g, cx, cy, r, col) {
  g.fillStyle = col;
  const n = Math.ceil(r * 7);
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    const k = x + ',' + y;
    if (seen.has(k)) continue;
    seen.add(k);
    g.fillRect(x, y, 1, 1);
  }
}

function disc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const half = Math.round(Math.sqrt(r * r - y * y));
    g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}
