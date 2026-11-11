// Everything that moves: the player, the villager and the animals.
import { clamp } from './pixel.js';
import { CHAR_H } from './art/character.js';

const HOP_TIME = 0.34;

const DIRS = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

function boxBlocked(world, x, y, hw = 4, hh = 5) {
  const { blocked, W, H } = world;
  for (let py = Math.round(y) - hh; py <= Math.round(y); py += 1) {
    for (let px = Math.round(x) - hw; px <= Math.round(x) + hw; px += 2) {
      if (px < 0 || py < 0 || px >= W || py >= H) return true;
      if (blocked[py * W + px]) return true;
    }
    const ex = Math.round(x) + hw;
    if (ex >= W || blocked[py * W + ex]) return true;
  }
  return false;
}

/** Slide-along-walls movement shared by the walkers. Returns true if it moved. */
function tryMove(world, e, dx, dy, hw, hh) {
  let moved = false;
  if (dx) {
    if (!boxBlocked(world, e.x + dx, e.y, hw, hh)) {
      e.x += dx;
      moved = true;
    } else if (!dy) {
      // nudge around rounded corners
      if (!boxBlocked(world, e.x + dx, e.y - 1.5, hw, hh)) {
        e.x += dx;
        e.y -= 1;
        moved = true;
      } else if (!boxBlocked(world, e.x + dx, e.y + 1.5, hw, hh)) {
        e.x += dx;
        e.y += 1;
        moved = true;
      }
    }
  }
  if (dy) {
    if (!boxBlocked(world, e.x, e.y + dy, hw, hh)) {
      e.y += dy;
      moved = true;
    } else if (!dx) {
      if (!boxBlocked(world, e.x - 1.5, e.y + dy, hw, hh)) {
        e.y += dy;
        e.x -= 1;
        moved = true;
      } else if (!boxBlocked(world, e.x + 1.5, e.y + dy, hw, hh)) {
        e.y += dy;
        e.x += 1;
        moved = true;
      }
    }
  }
  return moved;
}

// -------------------------------------------------------------------- walker

class Walker {
  constructor(sprites, x, y) {
    this.sprites = sprites;
    this.x = x;
    this.y = y;
    this.dir = 'down';
    this.moving = false;
    this.running = false;
    this.animT = 0;
    this.idleT = Math.random() * 3;
    this.blink = 0;
    this.nextBlink = 2 + Math.random() * 3;
    this.shadow = [6, 2, 0];
    this.lastFrame = -1;
    this.hopT = 0;
    this.landT = 0;
  }
  get sortY() {
    return this.y;
  }
  /** height above the ground while hopping, in whole pixels */
  get lift() {
    if (this.hopT <= 0) return 0;
    return Math.round(Math.sin((1 - this.hopT / HOP_TIME) * Math.PI) * 9);
  }
  tickAnim(dt) {
    if (this.moving) {
      this.animT += dt * (this.running ? 11.5 : 7.5);
      this.idleT = 0;
    } else {
      this.animT = 0;
      this.idleT += dt;
    }
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blink = 0.13;
      this.nextBlink = 2.2 + Math.random() * 3.5;
    }
    if (this.blink > 0) this.blink -= dt;
  }
  currentFrame() {
    const set = this.sprites[this.dir];
    if (this.moving) {
      const i = Math.floor(this.animT) % 4;
      return [(this.running && set.run ? set.run : set.walk)[i], i];
    }
    const i = Math.floor(this.idleT * 1.5) % 2;
    return [(this.blink > 0 ? set.blink : set.idle)[i], -1];
  }
  draw(g) {
    let [f] = this.currentFrame();
    const lift = this.lift;
    const set = this.sprites[this.dir];
    if (lift > 0) f = set.walk[0]; // tucked legs in the air
    else if (this.landT > 0 && !this.moving) f = set.idle[1]; // 1px squash on landing
    this.shadow[0] = lift > 5 ? 4 : lift > 1 ? 5 : 6;
    g.drawImage(f, Math.round(this.x) - 8, Math.round(this.y) - (CHAR_H - 1) - lift);
  }
}

// -------------------------------------------------------------------- player

export class Player extends Walker {
  constructor(sprites, x, y) {
    super(sprites, x, y);
    this.kind = 'player';
    this.lastIx = 0;
    this.lastIy = 0;
    this.dustT = 0;
  }
  update(dt, game) {
    const { input, world, fx } = game;
    let ix = input.x;
    let iy = input.y;
    if (game.dialog) {
      ix = 0;
      iy = 0;
    }
    const sx = Math.sign(Math.abs(ix) > 0.3 ? ix : 0);
    const sy = Math.sign(Math.abs(iy) > 0.3 ? iy : 0);
    // Snap to whole pixels whenever the heading changes so both axes cross
    // pixel boundaries together and diagonals do not shimmer.
    if (sx !== this.lastIx || sy !== this.lastIy) {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      this.lastIx = sx;
      this.lastIy = sy;
    }
    const len = Math.hypot(ix, iy);
    this.running = input.run && len > 0;
    if (len > 0.3) {
      const speed = this.running ? 96 : 56;
      const nx = (ix / len) * Math.min(1, len);
      const ny = (iy / len) * Math.min(1, len);
      // facing: keep the current facing on diagonals if it still agrees
      const [fx0, fy0] = DIRS[this.dir];
      const agrees = (fx0 && Math.sign(fx0) === sx) || (fy0 && Math.sign(fy0) === sy);
      if (!agrees || (sx && !sy) || (sy && !sx)) {
        if (sx && !sy) this.dir = sx > 0 ? 'right' : 'left';
        else if (sy && !sx) this.dir = sy > 0 ? 'down' : 'up';
        else if (!agrees) this.dir = sx > 0 ? 'right' : 'left';
      }
      const moved = tryMove(world, this, nx * speed * dt, ny * speed * dt, 4, 4);
      this.moving = true;
      if (moved && this.running) {
        this.dustT -= dt;
        if (this.dustT <= 0) {
          this.dustT = 0.11;
          fx.dust(this.x - nx * 3, this.y - 1);
        }
      }
      // rustle any tall grass underfoot
      for (const t of world.tufts) {
        if (Math.abs(t.x - this.x) < 8 && Math.abs(t.y - this.y) < 5) {
          if (t.rustle <= 0 && moved) fx.blades(t.x, t.y - 4);
          t.rustle = 0.35;
        }
      }
    } else {
      this.moving = false;
    }
    this.tickAnim(dt);
    if (this.landT > 0) this.landT -= dt;
    if (this.hopT > 0) {
      this.hopT -= dt;
      if (this.hopT <= 0) {
        this.landT = 0.12;
        fx.dust(this.x - 3, this.y);
        fx.dust(this.x + 3, this.y);
      }
    }
    // a little puff each time a foot lands
    const [, step] = this.currentFrame();
    if (step !== this.lastFrame) {
      if ((step === 0 || step === 2) && !this.running && this.hopT <= 0) fx.step(this.x, this.y);
      this.lastFrame = step;
    }
  }
  hop() {
    if (this.hopT <= 0) this.hopT = HOP_TIME;
  }
  facingPoint(d = 12) {
    const [dx, dy] = DIRS[this.dir];
    return [this.x + dx * d, this.y - 3 + dy * d];
  }
}

// ------------------------------------------------------------------ villager

export class Villager extends Walker {
  constructor(sprites, route) {
    super(sprites, route[0][0], route[0][1]);
    this.kind = 'villager';
    this.route = route;
    this.target = 1;
    this.wait = 1.5;
    this.say = [
      'Morning! The hens have been restless today.',
      'If you stay until dusk the fireflies come out by the pond.',
      'Every pixel here was placed by hand. Well... by code.',
    ];
    this.line = 0;
  }
  update(dt, game) {
    const p = game.player;
    const near = Math.hypot(p.x - this.x, p.y - this.y) < 22;
    if (near || game.dialog?.who === this) {
      // stop and turn toward the player
      this.moving = false;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      this.tickAnim(dt);
      return;
    }
    if (this.wait > 0) {
      this.wait -= dt;
      this.moving = false;
      if (this.wait < 1.2) this.dir = 'down';
      this.tickAnim(dt);
      return;
    }
    const [tx, ty] = this.route[this.target];
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.5) {
      // a truthy third value marks a waypoint where the villager lingers
      this.wait = this.route[this.target][2] ? 2.5 + Math.random() * 2 : 0;
      this.target = (this.target + 1) % this.route.length;
    } else {
      const sp = 30 * dt;
      this.x += (dx / d) * Math.min(sp, d);
      this.y += (dy / d) * Math.min(sp, d);
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      this.moving = true;
    }
    this.tickAnim(dt);
  }
}

// ----------------------------------------------------------------------- hen

export class Hen {
  constructor(frames, flipped, x, y) {
    this.kind = 'hen';
    this.frames = frames;
    this.flipped = flipped;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.state = 'idle';
    this.t = Math.random() * 2;
    this.animT = 0;
    this.tx = x;
    this.ty = y;
    this.shadow = [5, 2, 0];
    this.hop = 0;
  }
  get sortY() {
    return this.y;
  }
  pick() {
    const r = Math.random();
    if (r < 0.4) {
      this.state = 'peck';
      this.t = 0.9 + Math.random() * 0.9;
    } else if (r < 0.85) {
      this.state = 'walk';
      const a = Math.random() * Math.PI * 2;
      const d = 10 + Math.random() * 26;
      this.tx = clamp(this.homeX + Math.cos(a) * d * 1.4, this.homeX - 44, this.homeX + 44);
      this.ty = clamp(this.homeY + Math.sin(a) * d, this.homeY - 26, this.homeY + 26);
      this.t = 3;
    } else {
      this.state = 'idle';
      this.t = 0.6 + Math.random() * 1.6;
    }
    this.animT = 0;
  }
  update(dt, game) {
    const { player, world, fx } = game;
    this.animT += dt;
    this.t -= dt;
    if (this.hop > 0) this.hop -= dt;
    const pdx = this.x - player.x;
    const pdy = this.y - player.y;
    const pd = Math.hypot(pdx, pdy);
    if (pd < (player.running ? 30 : 15) && this.state !== 'flee' && player.moving) {
      this.state = 'flee';
      this.t = 0.55;
      const a = Math.atan2(pdy, pdx) + (Math.random() - 0.5) * 0.9;
      this.tx = Math.cos(a);
      this.ty = Math.sin(a);
      this.hop = 0.3;
      fx.feather(this.x, this.y - 8);
    }
    if (this.state === 'flee') {
      const sp = 78 * dt;
      const before = this.x;
      tryMove(world, this, this.tx * sp, this.ty * sp, 4, 3);
      if (this.x !== before) this.face = this.tx > 0 ? 1 : -1;
      if (this.t <= 0) {
        this.state = 'idle';
        this.t = 0.5 + Math.random();
        this.homeX = clamp(this.x, this.homeX - 30, this.homeX + 30);
        this.homeY = clamp(this.y, this.homeY - 20, this.homeY + 20);
      }
    } else if (this.state === 'walk') {
      const dx = this.tx - this.x;
      const dy = this.ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5 || this.t <= 0) {
        this.pick();
      } else {
        const sp = 17 * dt;
        if (!tryMove(world, this, (dx / d) * sp, (dy / d) * sp, 4, 3)) this.pick();
        if (Math.abs(dx) > 0.5) this.face = dx > 0 ? 1 : -1;
      }
    } else if (this.t <= 0) {
      this.pick();
    }
  }
  draw(g) {
    const set = this.face > 0 ? this.frames : this.flipped;
    let f;
    if (this.state === 'walk') f = set.walk[Math.floor(this.animT * 7) % 4];
    else if (this.state === 'flee') f = set.walk[Math.floor(this.animT * 16) % 4];
    else if (this.state === 'peck') f = set.peck[Math.floor(this.animT * 5) % 4];
    else f = set.idle[0];
    const lift = this.hop > 0 ? Math.round(Math.sin((this.hop / 0.3) * Math.PI) * 4) : 0;
    g.drawImage(f, Math.round(this.x) - 8, Math.round(this.y) - 15 - lift);
  }
}

// --------------------------------------------------------------------- chick

export class Chick {
  constructor(frames, flipped, mother, i) {
    this.kind = 'chick';
    this.frames = frames;
    this.flipped = flipped;
    this.mother = mother;
    this.ox = (i % 2 ? -1 : 1) * (9 + i * 3);
    this.oy = 5 + (i % 3) * 3;
    this.x = mother.x + this.ox;
    this.y = mother.y + this.oy;
    this.face = 1;
    this.animT = Math.random();
    this.moving = false;
    this.shadow = [3, 1, 0];
  }
  get sortY() {
    return this.y;
  }
  update(dt, game) {
    const tx = this.mother.x + this.ox * -this.mother.face;
    const ty = this.mother.y + this.oy;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    this.moving = d > 5;
    if (this.moving) {
      const sp = (d > 30 ? 70 : 26) * dt;
      tryMove(game.world, this, (dx / d) * sp, (dy / d) * sp, 2, 2);
      if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1;
      this.animT += dt * 9;
    } else {
      this.animT += dt * 1.2;
    }
  }
  draw(g) {
    const set = this.face > 0 ? this.frames : this.flipped;
    const f = set[Math.floor(this.animT) % 2];
    g.drawImage(f, Math.round(this.x) - 4, Math.round(this.y) - 7);
  }
}

// ---------------------------------------------------------------------- duck

export class Duck {
  constructor(frames, flipped, pond) {
    this.kind = 'duck';
    this.frames = frames;
    this.flipped = flipped;
    this.pond = pond;
    this.a = 1;
    this.x = 0;
    this.y = 0;
    this.face = 1;
    this.rip = 0;
    this.place();
  }
  place() {
    const p = this.pond;
    this.x = p.cx + Math.cos(this.a) * p.rx;
    this.y = p.cy + Math.sin(this.a * 2) * p.ry * 0.5 + Math.sin(this.a) * p.ry * 0.6;
  }
  get sortY() {
    return this.y;
  }
  update(dt, game) {
    const px = this.x;
    this.a += dt * 0.16;
    this.place();
    const dx = this.x - px;
    if (Math.abs(dx) > 0.001) this.face = dx > 0 ? 1 : -1;
    this.rip -= dt;
    if (this.rip <= 0) {
      this.rip = 1.1;
      game.fx.ripple(this.x - this.face * 5, this.y - 1);
    }
  }
  draw(g, t) {
    const set = this.face > 0 ? this.frames : this.flipped;
    const f = set[Math.floor(t * 1.6) % 2];
    g.drawImage(f, Math.round(this.x) - 8, Math.round(this.y) - 11);
  }
}

// ----------------------------------------------------------------------- cat

export class Cat {
  constructor(sprites, x, y) {
    this.kind = 'cat';
    this.sprites = sprites;
    this.x = x;
    this.y = y;
    this.shadow = [7, 2, 0];
  }
  get sortY() {
    return this.y;
  }
  update() {}
  draw(g, t) {
    let f = this.sprites.sit[0];
    const tail = t % 3.4;
    if (tail < 0.18 || (tail > 0.36 && tail < 0.54)) f = this.sprites.sit[1];
    if (t % 5.3 < 0.16) f = this.sprites.blink;
    g.drawImage(f, Math.round(this.x) - 6, Math.round(this.y) - 15);
  }
}

// ----------------------------------------------------------------- butterfly

export class Butterfly {
  constructor(frames, x, y) {
    this.kind = 'butterfly';
    this.frames = frames;
    this.hx = x;
    this.hy = y;
    this.x = x;
    this.y = y;
    this.p = Math.random() * 10;
    this.s = 0.5 + Math.random() * 0.5;
    this.shadow = [2, 1, 0];
    this.alt = 10;
  }
  get sortY() {
    return this.y + 30; // flies above most things
  }
  update(dt) {
    this.p += dt * this.s;
    const p = this.p;
    this.x = this.hx + Math.sin(p * 0.9) * 26 + Math.sin(p * 2.3) * 9;
    this.y = this.hy + Math.sin(p * 1.3 + 1) * 14 + Math.cos(p * 2.9) * 5;
    this.alt = 9 + Math.sin(p * 3.1) * 3;
  }
  draw(g, t) {
    const f = this.frames[Math.floor(t * 11 + this.p * 3) % 4];
    g.drawImage(f, Math.round(this.x) - 3, Math.round(this.y - this.alt) - 3);
  }
}
