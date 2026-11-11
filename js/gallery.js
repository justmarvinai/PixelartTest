// Sprite gallery (press G): every asset laid out on one scrolling sheet,
// with all animations playing, so the pixel work can be inspected up close.
import { P } from './palette.js';
import { drawText, textWidth } from './font.js';

function item(frames, fps = 0, scale = 1) {
  return { frames: Array.isArray(frames) ? frames : [frames], fps, scale };
}

export function gallerySections(art) {
  const f = art.farmer;
  const v = art.villager;
  const c = art.creatures;
  const p = art.props;
  const t = art.trees;
  const idle = (ch, dir) => [ch[dir].idle[0], ch[dir].idle[0], ch[dir].idle[1], ch[dir].idle[1], ch[dir].blink[0], ch[dir].idle[0], ch[dir].idle[1], ch[dir].idle[1]];
  const catLoop = [c.cat.sit[0], c.cat.sit[0], c.cat.sit[0], c.cat.sit[1], c.cat.sit[0], c.cat.sit[1], c.cat.sit[0], c.cat.blink];
  return [
    {
      title: 'Farmer: 4-direction walk cycle, idle and blink',
      items: [
        item(f.down.walk, 7.5, 2),
        item(f.left.walk, 7.5, 2),
        item(f.right.walk, 7.5, 2),
        item(f.up.walk, 7.5, 2),
        item(idle(f, 'down'), 3, 2),
        item(idle(f, 'right'), 3, 2),
      ],
    },
    {
      title: 'Villager: same rig, swapped palette',
      items: [item(v.down.walk, 7.5, 2), item(v.right.walk, 7.5, 2), item(v.up.walk, 7.5, 2), item(idle(v, 'down'), 3, 2)],
    },
    {
      title: 'Animals',
      items: [
        item(c.hen.walk, 7, 2),
        item(c.hen.peck, 5, 2),
        item(c.henBrown.walk, 7, 2),
        item(c.chick, 6, 2),
        item(c.duck, 1.6, 2),
        item(catLoop, 3, 2),
        ...c.butterflies.map((b) => item(b, 11, 2)),
      ],
    },
    {
      title: 'Trees: 8-frame wind sway, re-rasterised per frame',
      items: [t.oak, t.oak2, t.apple, t.blossom, t.maple, t.pine, t.pine2, t.bush, t.berryBush].map((x) => item(x, 5, 1)),
    },
    {
      title: 'Plants and crops',
      items: [
        ...p.flowers.map((x) => item(x, 4, 2)),
        item(p.tuft, 5, 2),
        item(p.reeds, 4, 2),
        item(p.lily[0], 0, 2),
        item(p.lily[1], 0, 2),
        item(p.mushroom, 0, 2),
        item(p.crops.sprout, 4, 2),
        item(p.crops.cabbage, 0, 2),
        item(p.crops.tomato, 4, 2),
        item(p.crops.pumpkin, 0, 2),
        item(p.crops.sunflower, 4, 2),
      ],
    },
    {
      title: 'Props',
      items: [
        ...p.rocks.map((x) => item(x, 0, 2)),
        item(p.lamp.off, 0, 2),
        item(p.lamp.on, 0, 2),
        item(p.sign, 0, 2),
        item(p.mailbox, 0, 2),
        item(p.barrel, 0, 2),
        item(p.crate, 0, 2),
        item(p.stump, 0, 2),
        item(p.fence[10], 0, 2),
        item(p.fence[6], 0, 2),
        item(p.scarecrow, 0, 2),
      ],
    },
    {
      title: 'Cottage: day, and with the window-glow layer',
      items: [item(art.house.day, 0, 1), item(art.houseNight, 0, 1)],
    },
  ];
}

/** Draws the gallery and returns its total content height. */
export function drawGallery(g, vw, vh, sections, t, scroll) {
  g.fillStyle = '#232d42';
  g.fillRect(0, 0, vw, vh);
  g.fillStyle = '#27324a';
  for (let y = -(scroll % 16); y < vh; y += 8) {
    for (let x = ((Math.floor((y + scroll) / 8) % 2) + 2) % 2 ? 8 : 0; x < vw; x += 16) g.fillRect(x, y, 8, 8);
  }
  const M = 8;
  let y = M - scroll;
  drawText(g, 'SPRITE GALLERY', M, y, P.gold2, P.ink);
  const hint = 'G: back   W/S: scroll';
  if (textWidth(hint) + textWidth('SPRITE GALLERY') + 30 < vw) drawText(g, hint, vw - M - textWidth(hint), y, P.stone2, P.ink);
  y += 14;
  for (const s of sections) {
    drawText(g, s.title, M, y, P.cream1, P.ink);
    y += 11;
    let x = M;
    let rowH = 0;
    for (const it of s.items) {
      const f0 = it.frames[0];
      const w = f0.width * it.scale + 8;
      const h = f0.height * it.scale + 8;
      if (x + w > vw - M && x > M) {
        x = M;
        y += rowH + 4;
        rowH = 0;
      }
      rowH = Math.max(rowH, h);
      it._x = x;
      it._w = w;
      it._h = h;
      it._y = y;
      x += w + 4;
    }
    // second pass so plates in a row share a baseline
    let rowY = -1;
    let rowMax = 0;
    const rows = [];
    for (const it of s.items) {
      if (it._y !== rowY) {
        rowY = it._y;
        rows.push([]);
      }
      rows[rows.length - 1].push(it);
    }
    for (const row of rows) {
      rowMax = Math.max(...row.map((i) => i._h));
      for (const it of row) {
        if (it._y + rowMax < 0 || it._y > vh) continue;
        const px = it._x;
        const py = it._y;
        g.fillStyle = P.ink;
        g.fillRect(px + 1, py, it._w - 2, rowMax);
        g.fillRect(px, py + 1, it._w, rowMax - 2);
        g.fillStyle = P.grass3;
        g.fillRect(px + 1, py + 1, it._w - 2, rowMax - 2);
        g.fillStyle = P.grass4;
        g.fillRect(px + 1, py + rowMax - 4, it._w - 2, 3);
        const fr = it.frames[it.fps ? Math.floor(t * it.fps) % it.frames.length : 0];
        g.drawImage(fr, px + 4, py + rowMax - 4 - fr.height * it.scale, fr.width * it.scale, fr.height * it.scale);
      }
    }
    y += rowH + 10;
  }
  // palette strip
  drawText(g, 'Palette', M, y, P.cream1, P.ink);
  y += 11;
  let x = M;
  for (const col of Object.values(P)) {
    if (x + 7 > vw - M) {
      x = M;
      y += 8;
    }
    g.fillStyle = P.ink;
    g.fillRect(x, y, 7, 7);
    g.fillStyle = col;
    g.fillRect(x + 1, y + 1, 5, 5);
    x += 7;
  }
  y += 16;
  return y + scroll;
}
