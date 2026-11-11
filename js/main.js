// Pixel Meadow: boot, input, camera and the frame loop.
import { P } from './palette.js';
import { makeCanvas, ctxOf, flipH, fillEllipse, clamp, stack } from './pixel.js';
import { buildCharacter, FARMER, VILLAGER } from './art/character.js';
import { buildCreatures } from './art/creatures.js';
import { buildProps } from './art/props.js';
import { buildTrees } from './art/trees.js';
import { buildHouse } from './art/house.js';
import { buildWorld } from './world.js';
import { Player, Villager, Hen, Chick, Duck, Cat, Butterfly } from './entities.js';
import { Fx, WaterFx, Lighting, Fireflies, makeCloudShadow, darknessAt, phaseName } from './fx.js';
import { drawHud } from './ui.js';
import { drawGallery, gallerySections } from './gallery.js';
import { TILE } from './terrain.js';

const canvas = document.getElementById('game');
let g = canvas.getContext('2d');
const params = new URLSearchParams(location.search);

// ----------------------------------------------------------------------- art
const house = buildHouse();
const art = {
  farmer: buildCharacter(FARMER, 'farmer'),
  villager: buildCharacter(VILLAGER, 'villager'),
  creatures: buildCreatures(),
  props: buildProps(),
  trees: buildTrees(),
  house,
  houseNight: stack(house.day.width, house.day.height, [
    [house.day, 0, 0],
    [house.lit, 0, 0],
  ]),
};
const flipSet = (set) => Object.fromEntries(Object.entries(set).map(([k, v]) => [k, v.map(flipH)]));

// --------------------------------------------------------------------- world
const world = buildWorld(art);
const fx = new Fx();
const water = new WaterFx(world.terrain);
const lighting = new Lighting();
const fireflies = new Fireflies(26, world.W, world.H);
const clouds = [0, 1, 2].map((i) => ({
  img: makeCloudShadow(i * 7 + 1),
  x: i * 330 - 100,
  y: 40 + i * 170,
  v: 5 + i * 1.5,
}));

const player = new Player(art.farmer, world.spawn.x, world.spawn.y);
const C = art.creatures;
const hens = [
  new Hen(C.hen, flipSet(C.hen), TILE * 21.5, TILE * 14),
  new Hen(C.henBrown, flipSet(C.henBrown), TILE * 25, TILE * 13.2),
  new Hen(C.hen, flipSet(C.hen), TILE * 19.5, TILE * 15.4),
];
const chickFlip = C.chick.map(flipH);
const villager = new Villager(art.villager, [
  [TILE * 3, TILE * 18.2, 1],
  [TILE * 14.5, TILE * 18.3],
  [TILE * 21.8, TILE * 18.4],
  [TILE * 21.8, TILE * 27, 1],
  [TILE * 21.8, TILE * 18.4],
  [TILE * 27.5, TILE * 18.1, 1],
  [TILE * 14.5, TILE * 18.3],
]);
const cat = new Cat(C.cat, world.house.x + 60, world.house.y + 5);
const actors = [
  player,
  villager,
  ...hens,
  new Chick(C.chick, chickFlip, hens[0], 0),
  new Chick(C.chick, chickFlip, hens[0], 1),
  new Chick(C.chick, chickFlip, hens[0], 2),
  new Duck(C.duck, C.duck.map(flipH), world.pond),
  cat,
  ...[
    [19, 21.5],
    [26, 21.5],
    [10.5, 13.8],
    [39, 24],
    [33.5, 12.6],
    [24.5, 14.6],
    [16.5, 21.5],
  ].map(([x, y], i) => new Butterfly(C.butterflies[i % C.butterflies.length], x * TILE, y * TILE)),
];

const game = {
  world,
  fx,
  player,
  input: { x: 0, y: 0, run: false },
  sky: { tod: 0.2, phase: 'Day', dark: 0, time: 0 },
  dialog: null,
  prompt: null,
  hintT: 14,
  touch: false,
  stick: null,
  gallery: params.has('gallery'),
  galleryScroll: 0,
  galleryH: 0,
  paused: false,
};
if (params.has('t')) game.sky.tod = +params.get('t');
if (params.has('x')) player.x = +params.get('x');
if (params.has('y')) player.y = +params.get('y');
const freezeTime = params.has('freeze');
const DAY_LENGTH = 180; // seconds for a full day/night cycle
const sections = gallerySections(art);

// ---------------------------------------------------------------- view setup
let vw = 320;
let vh = 180;
let scale = 4;
let shadowCanvas = makeCanvas(1, 1);
let shadowG = ctxOf(shadowCanvas);

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const dw = Math.max(1, Math.floor(window.innerWidth * dpr));
  const dh = Math.max(1, Math.floor(window.innerHeight * dpr));
  // integer scale: aim for roughly 340x200 art pixels on screen, never showing past the map
  scale = params.has('scale') ? +params.get('scale') : Math.max(1, Math.round(Math.sqrt((dw * dh) / (340 * 200))));
  while (Math.ceil(dw / scale) > world.W || Math.ceil(dh / scale) > world.H) scale++;
  vw = Math.ceil(dw / scale);
  vh = Math.ceil(dh / scale);
  canvas.width = vw;
  canvas.height = vh;
  canvas.style.width = (vw * scale) / dpr + 'px';
  canvas.style.height = (vh * scale) / dpr + 'px';
  g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  shadowCanvas = makeCanvas(vw, vh);
  shadowG = ctxOf(shadowCanvas);
}
window.addEventListener('resize', resize);
resize();

// --------------------------------------------------------------------- input
const keys = new Set();
const KEYMAP = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
  ShiftLeft: 'run',
  ShiftRight: 'run',
};
window.addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (k) {
    keys.add(k);
    e.preventDefault();
  }
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
    e.preventDefault();
    act();
  } else if (e.code === 'KeyG') {
    game.gallery = !game.gallery;
  } else if (e.code === 'KeyT' || e.code === 'KeyN') {
    skipTime();
  } else if (e.code === 'KeyH') {
    game.hintT = game.hintT > 0 ? 0 : 10;
  } else if (e.code === 'Escape') {
    game.gallery = false;
    game.dialog = null;
  }
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) keys.delete(k);
});
window.addEventListener('blur', () => keys.clear());
window.addEventListener(
  'wheel',
  (e) => {
    if (game.gallery) game.galleryScroll += Math.sign(e.deltaY) * 24;
  },
  { passive: true },
);

// touch: left half is a floating stick, right half = hold to run / tap to talk
const toView = (e) => {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * vw, ((e.clientY - r.top) / r.height) * vh];
};
let stickId = null;
let actionId = null;
let actionDown = 0;
let dragY = null;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  e.preventDefault();
  game.touch = true;
  const [x, y] = toView(e);
  if (game.gallery) {
    dragY = y;
    actionDown = performance.now();
    return;
  }
  if (x < vw * 0.5 && stickId === null) {
    stickId = e.pointerId;
    game.stick = { bx: Math.round(x), by: Math.round(y), dx: 0, dy: 0 };
  } else if (actionId === null) {
    actionId = e.pointerId;
    actionDown = performance.now();
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') return;
  const [x, y] = toView(e);
  if (game.gallery && dragY !== null) {
    game.galleryScroll -= y - dragY;
    dragY = y;
    return;
  }
  if (e.pointerId === stickId && game.stick) {
    let dx = x - game.stick.bx;
    let dy = y - game.stick.by;
    const d = Math.hypot(dx, dy);
    if (d > 14) {
      dx = (dx / d) * 14;
      dy = (dy / d) * 14;
    }
    game.stick.dx = dx;
    game.stick.dy = dy;
  }
});
const pointerEnd = (e) => {
  if (e.pointerType === 'mouse') return;
  if (game.gallery) {
    dragY = null;
    const [x, y] = toView(e);
    if (performance.now() - actionDown < 220 && x > vw - 60 && y < 24) game.gallery = false;
    return;
  }
  if (e.pointerId === stickId) {
    stickId = null;
    game.stick = null;
  }
  if (e.pointerId === actionId) {
    actionId = null;
    if (performance.now() - actionDown < 240) {
      const [x, y] = toView(e);
      if (x > vw - 80 && y < 22) skipTime();
      else act();
    }
  }
};
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);

function readInput() {
  let x = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  let y = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
  let run = keys.has('run');
  if (game.stick) {
    const s = game.stick;
    const d = Math.hypot(s.dx, s.dy);
    if (d > 4) {
      // snap the stick to 8 directions so movement stays pixel-clean
      const a = Math.round(Math.atan2(s.dy, s.dx) / (Math.PI / 4)) * (Math.PI / 4);
      x = Math.round(Math.cos(a));
      y = Math.round(Math.sin(a));
    }
  }
  if (actionId !== null && performance.now() - actionDown > 240) run = true;
  game.input.x = x;
  game.input.y = y;
  game.input.run = run;
  if (x || y) game.hintT = Math.min(game.hintT, 4);
}

function skipTime() {
  const t = game.sky.tod % 1;
  game.sky.tod = t < 0.5 ? 0.6 : t < 0.7 ? 0.78 : t < 0.93 ? 0.965 : 0.1;
}

// --------------------------------------------------------------- interaction
function interactables() {
  return [
    {
      x: world.sign.x,
      y: world.sign.y - 6,
      r: 20,
      top: 20,
      run: () => say(null, 'PIXEL MEADOW\nCottage north. Pond and dock east. Farm plot west.'),
    },
    {
      x: villager.x,
      y: villager.y - 6,
      r: 24,
      top: 30,
      run: () => {
        say('Villager', villager.say[villager.line % villager.say.length], villager);
        villager.line++;
      },
    },
    {
      x: cat.x,
      y: cat.y - 4,
      r: 18,
      top: 18,
      run: () => {
        fx.heart(cat.x, cat.y - 18);
        say('Cat', 'Mrrp. *purrs*');
      },
    },
    ...hens.map((h) => ({
      x: h.x,
      y: h.y - 4,
      r: 15,
      top: 18,
      run: () => {
        fx.heart(h.x, h.y - 18);
        h.state = 'idle';
        h.t = 1.2;
      },
    })),
  ];
}

function nearestInteractable() {
  const [fx0, fy0] = player.facingPoint(8);
  let best = null;
  let bd = 1e9;
  for (const it of interactables()) {
    const d = Math.hypot(it.x - fx0, it.y - fy0);
    if (d < it.r && d < bd) {
      bd = d;
      best = it;
    }
  }
  return best;
}

function say(name, text, who = null) {
  game.dialog = { name, text, t: 0, done: false, who };
}

function act() {
  if (game.gallery) return;
  if (game.dialog) {
    if (!game.dialog.done) game.dialog.t = 999;
    else game.dialog = null;
    return;
  }
  const it = nearestInteractable();
  if (it) it.run();
}

// -------------------------------------------------------------------- update
let smokeT = 0;
let leafT = 0;
function update(dt) {
  const sky = game.sky;
  sky.time += dt;
  if (!freezeTime) sky.tod = (sky.tod + dt / DAY_LENGTH) % 1;
  sky.dark = darknessAt(sky.tod);
  sky.phase = phaseName(sky.tod);
  if (game.hintT > 0) game.hintT -= dt;

  if (game.gallery) {
    const sy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    game.galleryScroll += sy * 160 * dt;
    game.galleryScroll = clamp(game.galleryScroll, 0, Math.max(0, game.galleryH - vh));
    return;
  }

  readInput();
  if (game.dialog) game.dialog.t += dt;
  for (const a of actors) a.update(dt, game);
  for (const t of world.tufts) if (t.rustle > 0) t.rustle -= dt;
  fireflies.update(dt);
  fx.update(dt);
  water.update(dt, sky.time, fx.ripples);

  smokeT -= dt;
  if (smokeT <= 0) {
    smokeT = 0.42;
    fx.smoke(world.chimney.x, world.chimney.y);
  }
  leafT -= dt;
  if (leafT <= 0) {
    leafT = 0.3;
    const trees = world.things.filter(
      (t) => t.kind === 'tree' && Math.abs(t.x - player.x) < vw && Math.abs(t.y - player.y) < vh,
    );
    if (trees.length) {
      const t = trees[Math.floor(Math.random() * trees.length)];
      const special = t.petals || t.leaves;
      if (special || Math.random() < 0.12) {
        const cols = t.petals ? [P.pink1, P.pink2] : t.leaves ? [P.orange1, P.orange2] : [P.leaf2, P.leaf3];
        fx.leaf(t.x + (Math.random() - 0.5) * 30, t.y - 24 - Math.random() * 18, cols);
      }
    }
  }
  for (const c of clouds) {
    c.x += c.v * dt;
    if (c.x > world.W + 40) c.x = -190;
  }

  const it = nearestInteractable();
  game.prompt = it ? { label: game.touch ? 'Tap' : 'Space', wx: it.x, wy: it.y - it.top } : null;
}

// -------------------------------------------------------------------- render
let camX = 0;
let camY = 0;

function render() {
  const sky = game.sky;
  const t = sky.time;
  if (game.gallery) {
    game.galleryH = drawGallery(g, vw, vh, sections, t, Math.round(game.galleryScroll));
    return;
  }

  camX = world.W <= vw ? Math.round((world.W - vw) / 2) : clamp(Math.round(player.x - vw / 2), 0, world.W - vw);
  camY = world.H <= vh ? Math.round((world.H - vh) / 2) : clamp(Math.round(player.y - 12 - vh / 2), 0, world.H - vh);

  g.fillStyle = P.grass5;
  g.fillRect(0, 0, vw, vh);
  g.save();
  g.translate(-camX, -camY);
  g.drawImage(world.terrain.canvas, 0, 0);
  water.draw(g);

  // gather what is on screen
  const vis = [];
  const x0 = camX - 8;
  const x1 = camX + vw + 8;
  const y0 = camY - 8;
  const y1 = camY + vh + 8;
  for (const th of world.things) {
    if (th.x + th.w < x0 || th.x - th.w > x1 || th.y < y0 || th.y - th.h > y1) continue;
    if (th.flat) {
      const bob = Math.round(Math.sin(t * 1.3 + th.phase * 2) * 0.6);
      g.drawImage(th.frames[0], Math.round(th.x - th.ax), Math.round(th.y - th.ay) + bob);
      continue;
    }
    vis.push(th);
  }
  for (const a of actors) {
    if (a.x < x0 - 20 || a.x > x1 + 20 || a.y < y0 - 20 || a.y > y1 + 40) continue;
    vis.push(a);
  }
  vis.sort((a, b) => a.sortY - b.sortY);

  // soft contact shadows, merged so overlaps do not double-darken
  shadowG.clearRect(0, 0, vw, vh);
  shadowG.fillStyle = '#1b2440';
  for (const v of vis) {
    if (!v.shadow) continue;
    const [rx, ry, dy] = v.shadow;
    fillEllipse(shadowG, v.x - camX, v.y + dy - camY, rx, ry);
  }
  g.globalAlpha = 0.24;
  g.drawImage(shadowCanvas, camX, camY);
  g.globalAlpha = 1;

  const lit = clamp((sky.dark - 0.12) * 2.2, 0, 1);
  for (const v of vis) {
    if (v.kind === 'lamp' && lit > 0.25) {
      g.drawImage(v.on, Math.round(v.x - v.ax), Math.round(v.y - v.ay));
    } else {
      v.draw(g, t);
    }
    if (v.kind === 'house' && lit > 0) {
      g.globalAlpha = lit;
      g.drawImage(v.lit, Math.round(v.x - v.ax), Math.round(v.y - v.ay));
      g.globalAlpha = 1;
    }
  }
  fx.draw(g, t);
  g.restore();

  // drifting cloud shadows by day
  const cloudA = 0.1 * (1 - clamp(sky.dark * 1.6, 0, 1));
  if (cloudA > 0.005) {
    g.globalAlpha = cloudA;
    for (const c of clouds) g.drawImage(c.img, Math.round(c.x - camX), Math.round(c.y - camY));
    g.globalAlpha = 1;
  }

  // night lightmap
  if (sky.dark > 0.01) {
    const lights = [];
    for (const l of world.lights) {
      if (l.x < x0 - l.r || l.x > x1 + l.r || l.y < y0 - l.r || l.y > y1 + l.r) continue;
      lights.push({ x: l.x - camX, y: l.y - camY, r: l.r, kind: 'warm' });
    }
    if (sky.dark > 0.35) {
      for (const f of fireflies.list) {
        if (!f.on || f.x < x0 || f.x > x1 || f.y < y0 || f.y > y1) continue;
        lights.push({ x: f.x - camX, y: f.y - camY, r: 9, kind: 'fly' });
      }
    }
    lighting.draw(g, vw, vh, sky.tod, lights);
    g.save();
    g.translate(-camX, -camY);
    fireflies.draw(g, sky.dark);
    g.restore();
  }

  if (game.prompt) {
    game.prompt.sx = Math.round(game.prompt.wx - camX);
    game.prompt.sy = Math.round(game.prompt.wy - camY);
  }
  drawHud(g, vw, vh, game);
}

// ---------------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  // rAF timestamps can predate module start, so never let time run backwards
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// favicon straight from the sprite sheet
try {
  const icon = makeCanvas(32, 32);
  const ig = ctxOf(icon);
  ig.drawImage(C.hen.idle[0], 0, 0, 32, 32);
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = icon.toDataURL();
  document.head.appendChild(link);
} catch {
  /* cosmetic only */
}

// handy for poking at the scene from the console
window.__game = { game, world, art, actors, player };
