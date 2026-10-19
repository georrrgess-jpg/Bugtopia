// Animated title-screen backdrop: a cosy corner of the workshop with the
// three starting creatures at work.

import { drawCreature } from '../render/creatures.js';
import { drawStation } from '../render/stations.js';
import { drawEarth, drawWall, drawLantern, lanternSpots, drawMushroom, drawVine, drawPlankTile, hash } from '../render/decor.js';

export class TitleScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.t = 0;
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.w = this.canvas.clientWidth || window.innerWidth;
    this.h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.bg.width = this.canvas.width;
    this.bg.height = this.canvas.height;
    this.T = Math.max(70, Math.min(150, Math.min(this.w / 7.5, this.h / 4.6)));
    this.floorY = this.h * 0.74;
    const ctx = this.bg.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const T = this.T;
    drawEarth(ctx, this.w, this.h, this.floorY - T * 0.5, T);
    drawWall(ctx, this.w, this.floorY - T * 0.5, T);
    // A strip of floorboards
    const cols = Math.ceil(this.w / T) + 1;
    for (let i = 0; i < cols; i++) {
      drawPlankTile(ctx, i * T - T * 0.3, this.floorY - T * 0.5, T, i, 0);
      drawPlankTile(ctx, i * T - T * 0.3, this.floorY + T * 0.5, T, i, 1);
    }
    const vg = ctx.createRadialGradient(this.w / 2, this.h * 0.4, Math.min(this.w, this.h) * 0.2, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,5,0,0.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  frame(dt) {
    this.t += dt;
    const { ctx, T, t } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    lanternSpots(this.w, this.floorY - T * 0.5, T).forEach((p, i) => drawLantern(ctx, p.x, p.y, T * 0.55, t, i));

    const cx = this.w / 2;
    const y = this.floorY + T * 0.05;
    const gap = Math.min(T * 1.6, this.w / 3.4);
    drawStation(ctx, 'gathering', cx - gap, y, T / 100, { t, species: 'mosslet', working: true, progress: (t / 4) % 1 });
    drawCreature(ctx, 'mosslet', cx - gap, y + T * 0.14, (T / 100) * 1.12, { t, working: true, phase: 0.1 });
    drawStation(ctx, 'crafting', cx, y, T / 100, { t, species: 'emberpup', active: true, progress: (t / 10) % 1 });
    drawCreature(ctx, 'emberpup', cx - T * 0.04, y + T * 0.36, (T / 100) * 1.12, { t, working: true, phase: 0.4, glow: Math.max(0, Math.sin(t * 0.6)) ** 8 });
    drawStation(ctx, 'gathering', cx + gap, y, T / 100, { t, species: 'nectabee', working: true, progress: (t / 6) % 1 });
    drawCreature(ctx, 'nectabee', cx + gap + T * 0.12, y + T * 0.1, (T / 100) * 1.12, { t, working: true, phase: 0.7, facing: -1 });

    const glow = 0.6 + Math.sin(t * 1.5) * 0.3;
    drawMushroom(ctx, cx - gap * 1.75, y + T * 0.55, T * 0.5, '#e0584a');
    drawMushroom(ctx, cx - gap * 2.0, y + T * 0.45, T * 0.32, '#4ab8d0', glow);
    drawMushroom(ctx, cx + gap * 1.8, y + T * 0.5, T * 0.42, '#4ab8d0', glow);
    drawMushroom(ctx, cx + gap * 2.05, y + T * 0.58, T * 0.3, '#f0a24f');

    const vines = Math.max(4, Math.floor(this.w / 180));
    for (let i = 0; i < vines; i++) {
      drawVine(ctx, ((i + 0.5) / vines) * this.w, T * (0.5 + hash(i, 3) * 0.8), T * 0.7, t, i);
    }
    // Drifting spores
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 30; i++) {
      const sy = (((hash(i, 1) - t * (0.008 + hash(i, 2) * 0.01)) % 1) + 1) % 1;
      const sx = hash(i, 5) + Math.sin(t * 0.5 + i) * 0.02;
      ctx.fillStyle = `rgba(255, 230, 170, ${0.15 + Math.sin(t + i) * 0.08})`;
      ctx.beginPath();
      ctx.arc(sx * this.w, sy * this.h, 1.2 + hash(i, 7) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
