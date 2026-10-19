// The workshop view: draws the floor, stations, creatures and effects on a
// canvas, and translates pointer positions back into tiles and objects.

import { SPECIES } from '../data/species.js';
import { ITEMS } from '../data/items.js';
import { WORKSHOP_BOUNDS } from '../data/upgrades.js';
import { on } from '../core/events.js';
import { capacityPerItem, getBounds, getStation, occupantOf, stationAt, stationStatus } from '../core/rules.js';
import { drawCreature } from './creatures.js';
import { drawStation, creatureAnchor, outputPoint, drawGear } from './stations.js';
import {
  hash,
  drawEarth,
  drawWall,
  drawLantern,
  lanternSpots,
  drawMushroom,
  drawStone,
  drawVine,
  drawPlankTile,
  drawDirtTile,
  drawGrassTuft,
} from './decor.js';
import { iconImage } from '../ui/icons.js';

const TAU = Math.PI * 2;
const FONT = '"Fredoka", "Trebuchet MS", "Segoe UI", sans-serif';
const CREATURE_SCALE = 1.12;

const lerp = (a, b, k) => a + (b - a) * k;

export class WorkshopView {
  constructor(canvas, app) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.app = app;
    this.bg = document.createElement('canvas');
    this.bgKey = '';
    this.t = 0;
    this.creatureFx = new Map(); // creature id -> visual state
    this.stationFx = new Map(); // station id -> visual state
    this.particles = [];
    this.flyers = [];
    this.spores = Array.from({ length: 34 }, (_, i) => ({
      x: hash(i, 1, 9),
      y: hash(i, 2, 9),
      r: 1 + hash(i, 3, 9) * 2.2,
      speed: 0.006 + hash(i, 4, 9) * 0.012,
      phase: hash(i, 5, 9) * TAU,
      firefly: i % 6 === 0,
    }));
    this.layout = null;
    this.resize();
    on((e) => this.onEvent(e));
  }

  get state() {
    return this.app.state;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    this.bgKey = '';
  }

  // Reset per-game visuals (used when starting or loading a game).
  reset() {
    this.creatureFx.clear();
    this.stationFx.clear();
    this.particles = [];
    this.flyers = [];
    this.bgKey = '';
  }

  // ----- Layout & coordinates --------------------------------------------

  computeLayout() {
    const state = this.state;
    const level = state.upgrades.expansion;
    const bounds = getBounds(state);
    const next = WORKSHOP_BOUNDS[level + 1] || null;
    const view = next
      ? {
          minX: Math.min(bounds.minX, next.minX),
          minY: Math.min(bounds.minY, next.minY),
          maxX: Math.max(bounds.maxX, next.maxX),
          maxY: Math.max(bounds.maxY, next.maxY),
        }
      : { ...bounds };
    const cols = view.maxX - view.minX + 1;
    const rows = view.maxY - view.minY + 1;
    const safe = this.app.ui.safe || { top: 70, right: 16, bottom: 90, left: 16 };
    const availW = Math.max(100, this.w - safe.left - safe.right);
    const availH = Math.max(100, this.h - safe.top - safe.bottom);
    const T = Math.max(34, Math.min(124, Math.min(availW / (cols + 0.5), availH / (rows + 1.1))));
    const gridW = cols * T;
    const gridH = rows * T;
    const ox = Math.round(safe.left + (availW - gridW) / 2);
    const oy = Math.round(safe.top + (availH - gridH) / 2 + T * 0.5);
    this.layout = { T, ox, oy, view, bounds, next, cols, rows };
    return this.layout;
  }

  tileCenter(tx, ty) {
    const L = this.layout;
    return { x: L.ox + (tx - L.view.minX + 0.5) * L.T, y: L.oy + (ty - L.view.minY + 0.5) * L.T };
  }

  // World coordinates are tile units where (0, 0) is the centre of tile 0,0.
  worldToScreen(wx, wy) {
    const L = this.layout;
    return { x: L.ox + (wx - L.view.minX + 0.5) * L.T, y: L.oy + (wy - L.view.minY + 0.5) * L.T };
  }

  screenToWorld(sx, sy) {
    const L = this.layout;
    return { x: (sx - L.ox) / L.T + L.view.minX - 0.5, y: (sy - L.oy) / L.T + L.view.minY - 0.5 };
  }

  tileAt(sx, sy) {
    if (!this.layout) return null;
    const L = this.layout;
    const tx = Math.floor((sx - L.ox) / L.T) + L.view.minX;
    const ty = Math.floor((sy - L.oy) / L.T) + L.view.minY;
    if (tx < L.view.minX || tx > L.view.maxX || ty < L.view.minY || ty > L.view.maxY) return null;
    return { x: tx, y: ty };
  }

  // What is under the pointer: a creature, a station, a tile or nothing.
  hitTest(sx, sy) {
    if (!this.layout) return null;
    const T = this.layout.T;
    const candidates = [];
    for (const c of this.state.creatures) {
      const fx = this.creatureFx.get(c.id);
      if (!fx) continue;
      const p = this.worldToScreen(fx.x, fx.y);
      const lift = c.species === 'nectabee' ? 0.38 : 0.2;
      const dx = sx - p.x;
      const dy = sy - (p.y - lift * T);
      const r = T * 0.27;
      if (dx * dx + dy * dy < r * r) candidates.push({ c, y: fx.y });
    }
    if (candidates.length) {
      candidates.sort((a, b) => b.y - a.y);
      return { kind: 'creature', id: candidates[0].c.id };
    }
    const tile = this.tileAt(sx, sy);
    if (!tile) return null;
    const station = stationAt(this.state, tile.x, tile.y);
    if (station) return { kind: 'station', id: station.id, tile };
    return { kind: 'tile', tile };
  }

  // Screen position (CSS px) of an entity, for anchoring UI elements.
  screenPosOf(kind, id) {
    if (!this.layout) return null;
    if (kind === 'station') {
      const s = getStation(this.state, id);
      return s ? this.tileCenter(s.x, s.y) : null;
    }
    const fx = this.creatureFx.get(id);
    return fx ? this.worldToScreen(fx.x, fx.y) : null;
  }

  // ----- Events → effects -------------------------------------------------

  onEvent(e) {
    if (!this.layout || !this.state) return;
    const reduced = this.app.settings.reduceMotion;
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (hidden) return;
    switch (e.type) {
      case 'produced': {
        const st = getStation(this.state, e.stationId);
        if (!st) break;
        const out = outputPoint(st.type);
        const from = { x: st.x + out.x, y: st.y + out.y };
        this.flyItem(e.item, from, this.nearestStorage(st));
        this.floatText(from.x, from.y - 0.1, '+1', '#eaffd0');
        const fx = this.creatureFx.get(e.creatureId);
        if (fx) fx.pop = 1;
        break;
      }
      case 'craftStarted': {
        const st = getStation(this.state, e.stationId);
        if (!st) break;
        const from = this.nearestStorage(st);
        let delay = 0;
        for (const [item, n] of Object.entries(e.inputs)) {
          for (let i = 0; i < Math.min(n, 3); i++) {
            this.flyItem(item, from, { x: st.x + 0.12, y: st.y - 0.05 }, delay, 0.55);
            delay += 0.09;
          }
        }
        break;
      }
      case 'crafted': {
        const st = getStation(this.state, e.stationId);
        if (!st) break;
        const fx = this.creatureFx.get(e.creatureId);
        if (fx) {
          fx.glow = 1;
          fx.pop = 1;
        }
        this.burst(st.x + 0.12, st.y - 0.05, reduced ? 8 : 22, ['#ffd25a', '#ff9a3a', '#fff0a0', '#ff6a2a']);
        const out = outputPoint(st.type);
        this.flyItem(e.item, { x: st.x + out.x, y: st.y + out.y }, this.nearestStorage(st), 0.15, 0.85);
        this.floatText(st.x, st.y - 0.6, `+${e.qty} ${ITEMS[e.item].name}`, '#ffe7a8');
        break;
      }
      case 'built': {
        const st = getStation(this.state, e.stationId);
        if (!st) break;
        this.puff(st.x, st.y + 0.3);
        this.burst(st.x, st.y - 0.1, reduced ? 6 : 16, ['#fff3c4', '#ffd25a', '#8fd16a']);
        this.stationFx.set(st.id, { x: st.x, y: st.y, bump: 1, pop: 1 });
        break;
      }
      case 'moved': {
        this.puff(e.to.x, e.to.y + 0.3);
        break;
      }
      case 'hired': {
        const c = this.state.creatures.find((x) => x.id === e.creatureId);
        if (!c) break;
        const fx = this.ensureCreatureFx(c, true);
        fx.pop = 1;
        this.burst(fx.x, fx.y - 0.25, reduced ? 6 : 18, ['#fff3c4', '#ffd25a', '#ff9ec4', '#8fd16a']);
        break;
      }
      case 'assigned': {
        const fx = this.creatureFx.get(e.creatureId);
        if (fx) fx.pop = 1;
        break;
      }
      case 'upgraded': {
        if (e.upgradeId === 'expansion') this.bgKey = '';
        break;
      }
      default:
        break;
    }
  }

  nearestStorage(from) {
    let best = null;
    let bestD = Infinity;
    for (const s of this.state.stations) {
      if (s.type !== 'storage') continue;
      const d = (s.x - from.x) ** 2 + (s.y - from.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best ? { x: best.x, y: best.y - 0.3, stationId: best.id } : { x: from.x, y: from.y - 1 };
  }

  flyItem(item, from, to, delay = 0, dur = 0.75) {
    this.flyers.push({ item, from: { ...from }, to: { ...to }, t: -delay, dur });
  }

  floatText(x, y, text, color) {
    this.particles.push({ kind: 'text', x, y, vx: 0, vy: -0.55, life: 1.1, max: 1.1, text, color });
  }

  burst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = 0.6 + Math.random() * 1.6;
      this.particles.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.8,
        ay: 2.2,
        life: 0.6 + Math.random() * 0.5,
        max: 1.1,
        size: 0.02 + Math.random() * 0.03,
        color: colors[i % colors.length],
      });
    }
  }

  puff(x, y) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      this.particles.push({
        kind: 'smoke',
        x: x + Math.cos(a) * 0.15,
        y: y + Math.sin(a) * 0.05,
        vx: Math.cos(a) * 0.5,
        vy: -0.15 + Math.sin(a) * 0.1,
        life: 0.7,
        max: 0.7,
        size: 0.09,
        color: '230, 210, 180',
      });
    }
  }

  // ----- Simulation of visuals ---------------------------------------------

  // atDoor: newly hired creatures stroll in from the front of the workshop.
  ensureCreatureFx(c, atDoor = false) {
    let fx = this.creatureFx.get(c.id);
    if (!fx) {
      const st = c.stationId ? getStation(this.state, c.stationId) : null;
      let x;
      let y;
      if (st && !atDoor) {
        const an = creatureAnchor(st.type, c.species);
        x = st.x + an.x;
        y = st.y + an.y;
      } else {
        const b = getBounds(this.state);
        x = (b.minX + b.maxX) / 2 + (Math.random() - 0.5);
        y = b.maxY + (atDoor ? 0.55 : 0.1);
      }
      fx = {
        x,
        y,
        tx: x,
        ty: y,
        facing: 1,
        moving: false,
        wait: Math.random() * 2,
        phase: hash(parseInt(c.id.slice(1), 10) || 0, 3),
        glow: 0,
        pop: 0,
      };
      this.creatureFx.set(c.id, fx);
    }
    return fx;
  }

  pickWanderTarget(fx) {
    const b = getBounds(this.state);
    for (let i = 0; i < 12; i++) {
      const tx = b.minX + Math.floor(Math.random() * (b.maxX - b.minX + 1));
      const ty = b.minY + Math.floor(Math.random() * (b.maxY - b.minY + 1));
      if (stationAt(this.state, tx, ty)) continue;
      // Prefer short strolls
      if (Math.abs(tx - fx.x) + Math.abs(ty - fx.y) > 3.5 && i < 8) continue;
      return { x: tx + (Math.random() - 0.5) * 0.4, y: ty + 0.15 + (Math.random() - 0.5) * 0.3 };
    }
    return { x: fx.x, y: fx.y };
  }

  update(dt) {
    this.t += dt;
    const state = this.state;
    const drag = this.app.ui.drag;

    // Creatures
    const alive = new Set();
    for (const c of state.creatures) {
      alive.add(c.id);
      const fx = this.ensureCreatureFx(c);
      fx.glow = Math.max(0, fx.glow - dt * 1.6);
      fx.pop = Math.max(0, fx.pop - dt * 3);
      if (drag && drag.active && drag.kind === 'creature' && drag.id === c.id) {
        const w = this.screenToWorld(drag.px, drag.py + this.layout.T * 0.25);
        fx.x = w.x;
        fx.y = w.y;
        fx.moving = false;
        fx.atStation = false;
        continue;
      }
      const st = c.stationId ? getStation(state, c.stationId) : null;
      if (st) {
        const sfx = this.stationFx.get(st.id);
        const sx = sfx ? sfx.x : st.x;
        const sy = sfx ? sfx.y : st.y;
        const an = creatureAnchor(st.type, c.species);
        fx.tx = sx + an.x;
        fx.ty = sy + an.y;
        fx.homeFacing = an.facing;
        fx.wait = 0;
      } else {
        fx.homeFacing = null;
        const onStation = stationAt(state, Math.round(fx.tx), Math.round(fx.ty - 0.15));
        if (fx.atStation || onStation) {
          // Just left a station (or a station landed on the target): walk off.
          const t = this.pickWanderTarget(fx);
          fx.tx = t.x;
          fx.ty = t.y;
          fx.atStation = false;
        }
      }
      const dx = fx.tx - fx.x;
      const dy = fx.ty - fx.y;
      const dist = Math.hypot(dx, dy);
      const speed = c.species === 'nectabee' ? 2.4 : c.species === 'emberpup' ? 1.6 : 1.4;
      if (dist > 0.02) {
        const stepLen = Math.min(dist, speed * dt);
        fx.x += (dx / dist) * stepLen;
        fx.y += (dy / dist) * stepLen;
        fx.moving = dist > 0.05;
        if (Math.abs(dx) > 0.02) fx.facing = dx > 0 ? 1 : -1;
      } else {
        fx.moving = false;
        if (st) {
          fx.atStation = true;
          fx.facing = fx.homeFacing ?? fx.facing;
        } else {
          fx.wait -= dt;
          if (fx.wait <= 0) {
            const t = this.pickWanderTarget(fx);
            fx.tx = t.x;
            fx.ty = t.y;
            fx.wait = 1.5 + Math.random() * 3.5;
          }
        }
      }
    }
    for (const id of this.creatureFx.keys()) if (!alive.has(id)) this.creatureFx.delete(id);

    // Stations: smooth slide when moved, bump decay
    const stationIds = new Set();
    for (const s of state.stations) {
      stationIds.add(s.id);
      let sfx = this.stationFx.get(s.id);
      if (!sfx) {
        sfx = { x: s.x, y: s.y, bump: 0, pop: 0 };
        this.stationFx.set(s.id, sfx);
      }
      const k = Math.min(1, dt * 14);
      sfx.x = lerp(sfx.x, s.x, k);
      sfx.y = lerp(sfx.y, s.y, k);
      if (Math.abs(sfx.x - s.x) < 0.002) sfx.x = s.x;
      if (Math.abs(sfx.y - s.y) < 0.002) sfx.y = s.y;
      sfx.bump = Math.max(0, sfx.bump - dt * 3.5);
      sfx.pop = Math.max(0, sfx.pop - dt * 2.5);
    }
    for (const id of this.stationFx.keys()) if (!stationIds.has(id)) this.stationFx.delete(id);

    // Flying items
    for (const f of this.flyers) {
      f.t += dt;
      if (f.t >= f.dur && !f.done) {
        f.done = true;
        if (f.to.stationId) {
          const sfx = this.stationFx.get(f.to.stationId);
          if (sfx) sfx.bump = 1;
        }
      }
    }
    this.flyers = this.flyers.filter((f) => !f.done);

    // Ambient particles: embers from active kilns
    if (!this.app.settings.reduceMotion) {
      for (const s of state.stations) {
        if (s.type === 'crafting' && s.active && occupantOf(state, s.id) && Math.random() < dt * 6) {
          this.particles.push({
            kind: 'spark',
            x: s.x + 0.12 + (Math.random() - 0.5) * 0.2,
            y: s.y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.6 - Math.random() * 0.5,
            ay: 0,
            life: 0.9,
            max: 0.9,
            size: 0.015 + Math.random() * 0.015,
            color: Math.random() > 0.5 ? '#ffb347' : '#ffe08a',
          });
          if (Math.random() < 0.35) {
            this.particles.push({
              kind: 'smoke',
              x: s.x + 0.22,
              y: s.y - 0.66,
              vx: 0.08 + Math.random() * 0.1,
              vy: -0.35,
              life: 1.6,
              max: 1.6,
              size: 0.07,
              color: '200, 190, 180',
            });
          }
        }
      }
    }

    for (const p of this.particles) {
      p.life -= dt;
      p.vy += (p.ay || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  // ----- Drawing ----------------------------------------------------------

  ensureBackground() {
    const L = this.layout;
    const s = this.state;
    const key = [this.w, this.h, L.T, L.ox, L.oy, s.upgrades.expansion].join('|');
    if (key === this.bgKey) return;
    this.bgKey = key;
    const ctx = this.bg.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const T = L.T;
    const wallBottom = L.oy - T * 0.12;
    drawEarth(ctx, this.w, this.h, wallBottom, T);
    drawWall(ctx, this.w, wallBottom, T);

    // Floor shadow and rim
    const fx0 = L.ox + (L.bounds.minX - L.view.minX) * T;
    const fy0 = L.oy + (L.bounds.minY - L.view.minY) * T;
    const fw = (L.bounds.maxX - L.bounds.minX + 1) * T;
    const fh = (L.bounds.maxY - L.bounds.minY + 1) * T;
    ctx.fillStyle = 'rgba(20, 10, 4, 0.4)';
    ctx.beginPath();
    ctx.roundRect(fx0 - T * 0.06, fy0 - T * 0.02, fw + T * 0.12, fh + T * 0.16, T * 0.12);
    ctx.fill();
    ctx.fillStyle = '#6e4424';
    ctx.beginPath();
    ctx.roundRect(fx0 - T * 0.05, fy0 - T * 0.05, fw + T * 0.1, fh + T * 0.12, T * 0.1);
    ctx.fill();

    // Next expansion's tiles
    if (L.next) {
      for (let ty = L.next.minY; ty <= L.next.maxY; ty++) {
        for (let tx = L.next.minX; tx <= L.next.maxX; tx++) {
          if (tx >= L.bounds.minX && tx <= L.bounds.maxX && ty >= L.bounds.minY && ty <= L.bounds.maxY) continue;
          const c = this.tileCenter(tx, ty);
          drawDirtTile(ctx, c.x - T / 2, c.y - T / 2, T, tx, ty);
        }
      }
    }
    // Floor tiles
    for (let ty = L.bounds.minY; ty <= L.bounds.maxY; ty++) {
      for (let tx = L.bounds.minX; tx <= L.bounds.maxX; tx++) {
        const c = this.tileCenter(tx, ty);
        drawPlankTile(ctx, c.x - T / 2, c.y - T / 2, T, tx, ty);
      }
    }

    // Decorations around the floor
    const left = L.ox - T * 0.15;
    const right = L.ox + L.cols * T + T * 0.15;
    const bottom = L.oy + L.rows * T;
    const deco = [
      [left - T * 0.35, bottom - T * 0.2, 'stone', 0.7],
      [left - T * 0.6, bottom - T * 1.4, 'tuft', 0.4],
      [right + T * 0.45, bottom - T * 2.4, 'stone', 0.5],
      [right + T * 0.3, wallBottom + T * 0.5, 'tuft', 0.35],
      [left - T * 0.2, wallBottom + T * 0.6, 'stone', 0.45],
    ];
    for (const [x, y, kind, s] of deco) {
      if (kind === 'stone') drawStone(ctx, x, y, T * s);
      else drawGrassTuft(ctx, x, y, T * s);
    }
    for (const spot of lanternSpots(this.w, wallBottom, T)) {
      // lantern hook bracket
      ctx.fillStyle = '#3a2516';
      ctx.fillRect(spot.x - T * 0.12, spot.y - T * 0.6, T * 0.24, T * 0.05);
    }
    // Vignette
    const vg = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(10, 5, 0, 0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  draw() {
    const state = this.state;
    if (!state) return;
    const L = this.computeLayout();
    this.ensureBackground();
    const ctx = this.ctx;
    const T = L.T;
    const t = this.t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const wallBottom = L.oy - T * 0.12;
    const reduced = this.app.settings.reduceMotion;
    const ui = this.app.ui;

    // Animated wall details: lanterns and a pair of big turning gears
    lanternSpots(this.w, wallBottom, T).forEach((p, i) => drawLantern(ctx, p.x, p.y, T * 0.55, reduced ? 0 : t, i));
    if (wallBottom > T * 1.2) {
      const gx = L.ox + L.cols * T - T * 0.4;
      const gy = wallBottom - T * 0.55;
      drawGear(ctx, gx, gy, T * 0.36, t * 0.4, 10, '#8a6a42', '#4a3424');
      drawGear(ctx, gx - T * 0.52, gy + T * 0.12, T * 0.22, -t * 0.65 + 0.2, 8, '#9a7a4a', '#4a3424');
    }

    // Glowing mushrooms around the floor
    const left = L.ox - T * 0.2;
    const right = L.ox + L.cols * T + T * 0.2;
    const bottom = L.oy + L.rows * T;
    const glow = 0.6 + Math.sin(t * 1.5) * 0.3;
    drawMushroom(ctx, left - T * 0.15, bottom + T * 0.05, T * 0.42, '#e0584a');
    drawMushroom(ctx, left - T * 0.45, bottom - T * 0.05, T * 0.28, '#4ab8d0', glow);
    drawMushroom(ctx, right + T * 0.2, bottom - T * 0.6, T * 0.36, '#4ab8d0', glow);
    drawMushroom(ctx, right + T * 0.45, bottom - T * 0.45, T * 0.24, '#e0584a');
    drawMushroom(ctx, left - T * 0.3, wallBottom + T * 1.3, T * 0.26, '#f0a24f');

    // Placement highlights
    this.drawPlacement(ctx);

    // Depth-sorted stations and creatures
    const items = [];
    for (const s of state.stations) {
      const sfx = this.stationFx.get(s.id) || { x: s.x, y: s.y, bump: 0, pop: 0 };
      items.push({ y: sfx.y, draw: () => this.drawStationAt(ctx, s, sfx) });
    }
    for (const c of state.creatures) {
      const fx = this.creatureFx.get(c.id);
      if (!fx) continue;
      const dragging = ui.drag && ui.drag.active && ui.drag.kind === 'creature' && ui.drag.id === c.id;
      const sortY = dragging ? 999 : c.stationId && fx.atStation ? fx.y - 0.05 : fx.y - 0.1;
      items.push({ y: sortY, draw: () => this.drawCreatureAt(ctx, c, fx, dragging) });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    this.drawStationBubbles(ctx);
    this.drawSelection(ctx);
    this.drawEffects(ctx);
    this.drawTutorialArrow(ctx);

    // Vines and drifting spores in front of everything
    if (!reduced) {
      const vineCount = Math.max(3, Math.floor(this.w / 220));
      for (let i = 0; i < vineCount; i++) {
        const x = ((i + 0.5) / vineCount) * this.w + (hash(i, 40) - 0.5) * 80;
        drawVine(ctx, x, T * (0.6 + hash(i, 41) * 0.9), T * 0.7, t, i);
      }
      this.drawSpores(ctx);
    }
  }

  drawStationAt(ctx, s, sfx) {
    const T = this.layout.T;
    const p = this.worldToScreen(sfx.x, sfx.y);
    const creature = occupantOf(this.state, s.id);
    const status = stationStatus(this.state, s);
    const ui = this.app.ui;
    const draggingThis = ui.drag && ui.drag.active && ui.drag.kind === 'station' && ui.drag.id === s.id;
    const moving = ui.mode && ui.mode.type === 'move' && ui.mode.stationId === s.id;
    const fill = {};
    if (s.type === 'storage') {
      const cap = capacityPerItem(this.state);
      for (const [item, qty] of Object.entries(this.state.inventory)) if (qty > 0) fill[item] = qty / cap;
    }
    const pop = 1 + Math.sin(sfx.pop * Math.PI) * 0.12;
    ctx.save();
    if (draggingThis || moving) ctx.globalAlpha = 0.45;
    ctx.translate(p.x, p.y + T * 0.35);
    ctx.scale(pop, pop);
    ctx.translate(-p.x, -(p.y + T * 0.35));
    drawStation(ctx, s.type, p.x, p.y, T / 100, {
      t: this.t,
      species: creature?.species || null,
      working: status.code === 'working' || status.code === 'crafting',
      progress: s.type === 'crafting' ? s.progress : s.progress || 0,
      active: s.type === 'crafting' && s.active && status.code === 'crafting',
      bump: sfx.bump,
      fill,
    });
    ctx.restore();
  }

  drawCreatureAt(ctx, c, fx, dragging) {
    const T = this.layout.T;
    const p = this.worldToScreen(fx.x, fx.y);
    const st = c.stationId ? getStation(this.state, c.stationId) : null;
    let working = false;
    if (st && fx.atStation) {
      const status = stationStatus(this.state, st);
      working = status.code === 'working' || status.code === 'crafting';
    }
    if (dragging) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + T * 0.2, T * 0.22, T * 0.06, 0, 0, TAU);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();
    }
    drawCreature(ctx, c.species, p.x, p.y, (T / 100) * CREATURE_SCALE, {
      t: this.t,
      phase: fx.phase,
      working,
      moving: fx.moving || dragging,
      facing: fx.facing,
      glow: fx.glow,
      pop: fx.pop,
      lifted: dragging,
    });
  }

  drawStationBubbles(ctx) {
    const T = this.layout.T;
    for (const s of this.state.stations) {
      if (s.type === 'storage') continue;
      const status = stationStatus(this.state, s);
      let icon = null;
      let mark = null;
      if (status.code === 'empty') mark = 'zz';
      else if (status.code === 'full') {
        icon = status.item || (s.type === 'crafting' ? 'nectarWeave' : null);
        mark = '!';
      } else if (status.code === 'waiting') {
        icon = status.missing[0].item;
        mark = '?';
      } else if (status.code === 'stalled') mark = '!';
      else if (status.code === 'paused') mark = '||';
      if (!mark) continue;
      const sfx = this.stationFx.get(s.id) || s;
      const p = this.worldToScreen(sfx.x, sfx.y);
      const bob = Math.sin(this.t * 2.5 + s.x) * T * 0.02;
      const bx = p.x + T * 0.3;
      const by = p.y - T * 0.62 + bob;
      const r = T * 0.17;
      ctx.save();
      ctx.fillStyle = status.tone === 'warn' ? '#fff1d6' : 'rgba(255, 250, 240, 0.9)';
      ctx.strokeStyle = status.tone === 'warn' ? '#d9822b' : '#9a7a5a';
      ctx.lineWidth = Math.max(1.5, T * 0.02);
      ctx.beginPath();
      ctx.roundRect(bx - r * (icon ? 1.5 : 1.05), by - r, r * (icon ? 3 : 2.1), r * 2, r);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.5, by + r * 0.9);
      ctx.lineTo(bx - r * 0.7, by + r * 1.5);
      ctx.lineTo(bx - r * 0.05, by + r * 0.95);
      ctx.fill();
      if (icon) {
        const img = iconImage(icon);
        if (img.complete) ctx.drawImage(img, bx - r * 1.3, by - r * 0.75, r * 1.5, r * 1.5);
      }
      ctx.fillStyle = status.tone === 'warn' ? '#c45a1a' : '#7a6a5a';
      ctx.font = `700 ${Math.round(r * 1.25)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mark, icon ? bx + r * 0.75 : bx, by + r * 0.08);
      ctx.restore();
    }
  }

  drawPlacement(ctx) {
    const ui = this.app.ui;
    const L = this.layout;
    const T = L.T;
    const mode = ui.mode;
    const dragStation = ui.drag && ui.drag.active && ui.drag.kind === 'station' ? ui.drag.id : null;
    const placing = mode && (mode.type === 'place' || mode.type === 'move');
    if (!placing && !dragStation) return;
    const ignore = dragStation || (mode.type === 'move' ? mode.stationId : null);
    const pulse = 0.5 + Math.sin(this.t * 4) * 0.2;
    const b = L.bounds;
    for (let ty = b.minY; ty <= b.maxY; ty++) {
      for (let tx = b.minX; tx <= b.maxX; tx++) {
        const occupant = stationAt(this.state, tx, ty);
        if (occupant && occupant.id !== ignore) continue;
        const c = this.tileCenter(tx, ty);
        ctx.fillStyle = `rgba(150, 240, 120, ${0.12 + pulse * 0.12})`;
        ctx.strokeStyle = `rgba(200, 255, 170, ${0.4 + pulse * 0.3})`;
        ctx.lineWidth = Math.max(1.5, T * 0.025);
        ctx.beginPath();
        ctx.roundRect(c.x - T * 0.44, c.y - T * 0.44, T * 0.88, T * 0.88, T * 0.1);
        ctx.fill();
        ctx.stroke();
      }
    }
    // Ghost preview at the hovered tile
    const hover = dragStation ? ui.drag.tile : ui.hover;
    if (!hover) return;
    const type = mode && mode.type === 'place' ? mode.stationType : getStation(this.state, ignore)?.type;
    if (!type) return;
    const occupant = stationAt(this.state, hover.x, hover.y);
    const inside = hover.x >= b.minX && hover.x <= b.maxX && hover.y >= b.minY && hover.y <= b.maxY;
    const valid = inside && (!occupant || occupant.id === ignore);
    const c = this.tileCenter(hover.x, hover.y);
    ctx.save();
    ctx.fillStyle = valid ? 'rgba(170, 255, 140, 0.35)' : 'rgba(255, 90, 70, 0.35)';
    ctx.beginPath();
    ctx.roundRect(c.x - T * 0.48, c.y - T * 0.48, T * 0.96, T * 0.96, T * 0.1);
    ctx.fill();
    ctx.globalAlpha = valid ? 0.8 : 0.4;
    const st = ignore ? getStation(this.state, ignore) : null;
    const occ = st ? occupantOf(this.state, st.id) : null;
    drawStation(ctx, type, c.x, c.y, T / 100, { t: this.t, species: occ?.species || null });
    ctx.restore();
  }

  drawSelection(ctx) {
    const ui = this.app.ui;
    const T = this.layout.T;
    const pulse = 0.6 + Math.sin(this.t * 5) * 0.25;

    // Highlight stations a creature could be assigned to
    const assigning =
      (ui.mode && ui.mode.type === 'assign' && ui.mode.creatureId) ||
      (ui.drag && ui.drag.active && ui.drag.kind === 'creature' && ui.drag.id) ||
      (ui.selection && ui.selection.kind === 'creature' && ui.selection.id);
    if (assigning) {
      const c = this.state.creatures.find((x) => x.id === assigning);
      if (c) {
        const strong = (ui.mode && ui.mode.type === 'assign') || (ui.drag && ui.drag.active);
        for (const s of this.state.stations) {
          if (s.type !== SPECIES[c.species].station || s.id === c.stationId) continue;
          const occupied = !!occupantOf(this.state, s.id);
          if (occupied && !strong) continue;
          const p = this.tileCenter(s.x, s.y);
          ctx.save();
          ctx.strokeStyle = `rgba(160, 255, 130, ${(strong ? 0.6 : 0.35) + pulse * 0.3})`;
          ctx.lineWidth = Math.max(2, T * 0.035);
          ctx.setLineDash([T * 0.1, T * 0.06]);
          ctx.lineDashOffset = -this.t * T * 0.3;
          ctx.beginPath();
          ctx.roundRect(p.x - T * 0.47, p.y - T * 0.47, T * 0.94, T * 0.94, T * 0.12);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    if (!ui.selection) return;
    if (ui.selection.kind === 'station') {
      const s = getStation(this.state, ui.selection.id);
      if (!s) return;
      const sfx = this.stationFx.get(s.id) || s;
      const p = this.worldToScreen(sfx.x, sfx.y);
      ctx.save();
      ctx.shadowColor = 'rgba(255, 230, 150, 0.9)';
      ctx.shadowBlur = T * 0.15;
      ctx.strokeStyle = `rgba(255, 236, 170, ${pulse})`;
      ctx.lineWidth = Math.max(2, T * 0.04);
      ctx.beginPath();
      ctx.roundRect(p.x - T * 0.48, p.y - T * 0.48, T * 0.96, T * 0.96, T * 0.12);
      ctx.stroke();
      ctx.restore();
    } else if (ui.selection.kind === 'creature') {
      const fx = this.creatureFx.get(ui.selection.id);
      if (!fx) return;
      const p = this.worldToScreen(fx.x, fx.y);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 236, 170, ${pulse})`;
      ctx.lineWidth = Math.max(2, T * 0.035);
      ctx.shadowColor = 'rgba(255, 230, 150, 0.9)';
      ctx.shadowBlur = T * 0.12;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + T * 0.01, T * 0.27, T * 0.09, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEffects(ctx) {
    const T = this.layout.T;
    // Items flying into storage
    for (const f of this.flyers) {
      if (f.t < 0) continue;
      const k = Math.min(1, f.t / f.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const x = lerp(f.from.x, f.to.x, e);
      const y = lerp(f.from.y, f.to.y, e) - Math.sin(k * Math.PI) * 0.6;
      const p = this.worldToScreen(x, y);
      const img = iconImage(f.item);
      const size = T * (0.26 + Math.sin(k * Math.PI) * 0.08);
      if (img.complete) ctx.drawImage(img, p.x - size / 2, p.y - size / 2, size, size);
    }
    for (const p of this.particles) {
      const s = this.worldToScreen(p.x, p.y);
      const a = Math.max(0, p.life / p.max);
      if (p.kind === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(1, p.size * T), 0, TAU);
        ctx.fill();
      } else if (p.kind === 'smoke') {
        const r = p.size * T * (1 + (1 - a) * 1.6);
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(${p.color}, ${a * 0.45})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'text') {
        ctx.globalAlpha = Math.min(1, a * 1.8);
        ctx.font = `700 ${Math.round(Math.max(13, T * 0.2))}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(40, 18, 4, 0.95)';
        ctx.shadowBlur = Math.max(2, T * 0.03);
        ctx.shadowOffsetY = Math.max(1, T * 0.015);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, s.x, s.y);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTutorialArrow(ctx) {
    const focus = this.app.ui.focus;
    if (!focus) return;
    const T = this.layout.T;
    let p = null;
    if (focus.kind === 'creature') {
      const fx = this.creatureFx.get(focus.id);
      if (fx) {
        const c = this.state.creatures.find((x) => x.id === focus.id);
        p = this.worldToScreen(fx.x, fx.y - (c?.species === 'nectabee' ? 0.75 : 0.55));
      }
    } else if (focus.kind === 'station') {
      const s = getStation(this.state, focus.id);
      if (s) p = this.tileCenter(s.x, s.y - 0.75);
    } else if (focus.kind === 'tile') {
      p = this.tileCenter(focus.x, focus.y - 0.4);
    }
    if (!p) return;
    const bob = Math.sin(this.t * 5) * T * 0.07;
    const s = T * 0.2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 1.3);
    ctx.lineTo(s * 0.45, -s * 1.3);
    ctx.lineTo(s * 0.45, -s * 0.2);
    ctx.lineTo(s, -s * 0.2);
    ctx.lineTo(0, s * 0.8);
    ctx.lineTo(-s, -s * 0.2);
    ctx.lineTo(-s * 0.45, -s * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#ffe28a';
    ctx.strokeStyle = '#8a4a1a';
    ctx.lineWidth = Math.max(2, T * 0.03);
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 220, 120, 0.9)';
    ctx.shadowBlur = T * 0.2;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }

  drawSpores(ctx) {
    const t = this.t;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.spores) {
      const y = (((s.y - t * s.speed) % 1) + 1) % 1;
      const x = s.x + Math.sin(t * 0.5 + s.phase) * 0.02;
      const px = x * this.w;
      const py = y * this.h;
      if (s.firefly) {
        const a = 0.35 + Math.sin(t * 2 + s.phase) * 0.3;
        const g = ctx.createRadialGradient(px, py, 0, px, py, s.r * 6);
        g.addColorStop(0, `rgba(220, 255, 140, ${a})`);
        g.addColorStop(1, 'rgba(220, 255, 140, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 6, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 230, 180, ${0.12 + Math.sin(t + s.phase) * 0.06})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
