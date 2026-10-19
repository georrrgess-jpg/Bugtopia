// Procedural creature art. Each species is drawn with canvas paths so it can
// animate smoothly at any size.
//
// drawCreature(ctx, speciesId, x, y, scale, anim)
//   (x, y) is the point between the creature's feet.
//   anim: { t, phase, working, moving, facing (1 | -1), glow (0..1),
//           pop (0..1), lifted (bool) }

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
}

function radial(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function shadow(ctx, rx, alpha = 0.28) {
  ellipse(ctx, 0, 0, rx, rx * 0.28);
  ctx.fillStyle = `rgba(28, 16, 8, ${alpha})`;
  ctx.fill();
}

// Returns an eye-openness factor with an occasional blink.
function blink(t, phase) {
  const cycle = (t + phase * 7.3) % 4.1;
  if (cycle < 0.09) return 1 - cycle / 0.09;
  if (cycle < 0.18) return (cycle - 0.09) / 0.09;
  return 1;
}

function drawEye(ctx, x, y, r, open, look, happy) {
  if (happy) {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r * 0.8, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = '#2a1e14';
    ctx.lineWidth = r * 0.42;
    ctx.lineCap = 'round';
    ctx.stroke();
    return;
  }
  const ry = r * 1.15 * Math.max(0.08, open);
  ellipse(ctx, x, y, r, ry);
  ctx.fillStyle = '#fffdf6';
  ctx.fill();
  if (open > 0.3) {
    ellipse(ctx, x + look * r * 0.22, y + r * 0.12, r * 0.64, Math.min(ry * 0.78, r * 0.72));
    ctx.fillStyle = '#2a1e14';
    ctx.fill();
    circle(ctx, x + look * r * 0.22 - r * 0.24, y - r * 0.2, r * 0.24);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.strokeStyle = '#2a1e14';
    ctx.lineWidth = r * 0.3;
    ctx.stroke();
  }
}

function smile(ctx, x, y, w, color, open = false) {
  ctx.beginPath();
  if (open) {
    ellipse(ctx, x, y + w * 0.2, w * 0.45, w * 0.5);
    ctx.fillStyle = '#7a2a2a';
    ctx.fill();
    return;
  }
  ctx.arc(x, y - w * 0.3, w * 0.75, Math.PI * 0.2, Math.PI * 0.8);
  ctx.strokeStyle = color;
  ctx.lineWidth = w * 0.32;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function cheeks(ctx, x1, x2, y, r, color = 'rgba(255, 140, 130, 0.5)') {
  ellipse(ctx, x1, y, r, r * 0.62);
  ctx.fillStyle = color;
  ctx.fill();
  ellipse(ctx, x2, y, r, r * 0.62);
  ctx.fill();
}

// ----- Mosslet -----------------------------------------------------------

function drawMosslet(ctx, a) {
  const t = a.t + a.phase * 10;
  const step = a.moving ? Math.sin(t * 15) : 0;
  const hop = a.moving ? -Math.abs(Math.sin(t * 15)) * 2.6 : 0;
  const work = a.working ? Math.max(0, Math.sin(t * 5.5)) : 0;
  const breathe = Math.sin(t * 2.1) * 0.025;
  const sway = a.moving ? step * 0.05 : Math.sin(t * 1.5) * 0.06 + (a.working ? Math.sin(t * 5.5) * 0.04 : 0);
  const stretch = 1 + breathe + work * 0.07 + a.pop * 0.15;
  const open = blink(t, a.phase);

  shadow(ctx, 18);

  // Tiny legs
  ctx.fillStyle = '#356f2b';
  [-11, -4, 4, 11].forEach((lx, i) => {
    const off = (i % 2 === 0 ? step : -step) * 2;
    ellipse(ctx, lx + off, -2.4 + (i % 2 === 0 ? Math.min(0, step) : Math.min(0, -step)) * 1.5, 3.3, 2.6);
    ctx.fill();
  });

  ctx.save();
  ctx.translate(0, hop - 2);
  ctx.rotate(sway);
  ctx.translate(0, -15);
  ctx.scale(1 / Math.sqrt(stretch), stretch);

  // Body
  circle(ctx, 0, 0, 16);
  ctx.fillStyle = radial(ctx, -5, -6, 22, [
    [0, '#c2f08c'],
    [0.5, '#76c24c'],
    [1, '#3c8a2e'],
  ]);
  ctx.fill();
  ellipse(ctx, 0, 9, 10, 5.5);
  ctx.fillStyle = 'rgba(226, 250, 186, 0.75)';
  ctx.fill();

  // Leafy shell: a scalloped leaf hood over the top of the body.
  ctx.save();
  ctx.rotate(Math.sin(t * 1.7) * 0.03);
  ctx.beginPath();
  ctx.moveTo(-17.5, -1);
  ctx.bezierCurveTo(-19, -16, -9, -22, 0, -22);
  ctx.bezierCurveTo(9, -22, 19, -16, 17.5, -1);
  // scalloped lower edge: five leaf tips
  const tips = [17.5, 10.5, 3.5, -3.5, -10.5, -17.5];
  for (let i = 0; i < 5; i++) {
    const x1 = tips[i];
    const x2 = tips[i + 1];
    const mid = (x1 + x2) / 2;
    const depth = i === 2 ? -1 : i === 1 || i === 3 ? -2.5 : -4;
    ctx.quadraticCurveTo(mid + 2, depth + 6, x2, i === 4 ? -1 : depth - 1.5);
  }
  ctx.closePath();
  ctx.fillStyle = radial(ctx, -4, -16, 26, [
    [0, '#6cc04e'],
    [0.6, '#3d9334'],
    [1, '#2a6f26'],
  ]);
  ctx.fill();
  // leaf veins
  ctx.strokeStyle = 'rgba(190, 240, 140, 0.45)';
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  for (const vx of [-14, -7, 0, 7, 14]) {
    ctx.beginPath();
    ctx.moveTo(vx * 0.25, -19);
    ctx.quadraticCurveTo(vx * 0.8, -12, vx, -4);
    ctx.stroke();
  }
  ctx.restore();
  // Two perky leaves on the hood
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 9, -18);
    ctx.rotate(side * (0.9 + Math.sin(t * 2.2 + side) * 0.08));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4.5, -6, 0, -12);
    ctx.quadraticCurveTo(4.5, -6, 0, 0);
    ctx.fillStyle = '#5cb546';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, -10);
    ctx.strokeStyle = 'rgba(30, 80, 25, 0.55)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
  }
  // Soft moss tufts along the shell rim
  ctx.fillStyle = '#a7e07a';
  [
    [-15, -3, 2.4],
    [-9, -18, 2.2],
    [-2, -21, 2.5],
    [8, -19, 2.1],
    [15, -4, 2.3],
  ].forEach(([x, y, r]) => {
    circle(ctx, x, y, r);
    ctx.fill();
  });

  // Sprout on top
  ctx.save();
  ctx.translate(0, -21);
  ctx.rotate(Math.sin(t * 2.4) * 0.18);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(1, -6, 3, -9);
  ctx.strokeStyle = '#3c7a2a';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3, -9);
  ctx.quadraticCurveTo(9, -12, 10, -7);
  ctx.quadraticCurveTo(5, -5, 3, -9);
  ctx.fillStyle = '#a7e07a';
  ctx.fill();
  ctx.restore();

  // Face
  drawEye(ctx, -5.6, 3, 4.2, open, a.facing * 0.6, false);
  drawEye(ctx, 5.6, 3, 4.2, open, a.facing * 0.6, false);
  cheeks(ctx, -10.4, 10.4, 8.4, 2.9);
  smile(ctx, 0, 9.4, 3.4, '#2a4a1e', a.working && work > 0.7);

  ctx.restore();

  // Fiber strands drifting up while working
  if (a.working) {
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.6 + i / 3) % 1;
      const x = (i - 1) * 7 + Math.sin(t * 3 + i * 2) * 3;
      const y = -36 - p * 18;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 4, y - 4, x, y - 8);
      ctx.strokeStyle = `rgba(170, 230, 120, ${(1 - p) * 0.85})`;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
}

// ----- Nectabee ----------------------------------------------------------

function drawNectabee(ctx, a) {
  const t = a.t + a.phase * 10;
  const lift = a.lifted ? 0 : 1;
  const hover = (a.moving ? -26 : -24) + Math.sin(t * 3) * 3 * lift + (a.working ? Math.sin(t * 2.2) * 3.5 : 0);
  const tilt = a.moving ? 0.18 : Math.sin(t * 1.4) * 0.07;
  const open = blink(t, a.phase);
  const flap = 0.35 + 0.65 * Math.abs(Math.sin(t * 34));
  const s = 1 + a.pop * 0.15;

  shadow(ctx, 12, 0.18);

  ctx.save();
  ctx.translate(0, hover);
  ctx.rotate(tilt);
  ctx.scale(s, s);

  // Wings (behind body)
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 7, -4);
    ctx.rotate(side * 0.75);
    ctx.scale(1, flap);
    ellipse(ctx, side * 3, -9, 7, 11);
    ctx.fillStyle = 'rgba(214, 238, 255, 0.62)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ellipse(ctx, side * 3, -7, 3, 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();
    ctx.restore();
  }

  // Dangling legs
  ctx.strokeStyle = '#5a3818';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  [-5, 0, 5].forEach((lx, i) => {
    ctx.beginPath();
    ctx.moveTo(lx, 14);
    ctx.lineTo(lx + Math.sin(t * 4 + i) * 1.5, 19);
    ctx.stroke();
  });

  // Striped abdomen, tucked behind and below the head
  ctx.save();
  ctx.translate(0, 9);
  ctx.rotate(Math.sin(t * 2.6) * 0.06);
  ellipse(ctx, 0, 0, 11.5, 9.5);
  ctx.fillStyle = radial(ctx, -3, -3, 14, [
    [0, '#ffe680'],
    [1, '#e3a019'],
  ]);
  ctx.fill();
  ctx.save();
  ellipse(ctx, 0, 0, 11.5, 9.5);
  ctx.clip();
  ctx.fillStyle = '#6b4220';
  ctx.fillRect(-12, 0.5, 24, 3.4);
  ctx.fillRect(-12, 6.2, 24, 3.4);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-2, 9);
  ctx.lineTo(0, 12.5);
  ctx.lineTo(2, 9);
  ctx.fillStyle = '#6b4220';
  ctx.fill();
  ctx.restore();

  // Fluffy collar
  ctx.fillStyle = '#fff2b8';
  for (let i = 0; i < 5; i++) {
    circle(ctx, -8 + i * 4, 6.5 + Math.abs(i - 2) * -0.6, 2.6);
    ctx.fill();
  }

  // Head
  circle(ctx, 0, -3, 12.5);
  ctx.fillStyle = radial(ctx, -4, -8, 18, [
    [0, '#fff3a6'],
    [0.5, '#ffcc3a'],
    [1, '#e39a18'],
  ]);
  ctx.fill();
  ellipse(ctx, -5.5, -10, 3.6, 2.2, -0.5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();

  // Antennae
  for (const side of [-1, 1]) {
    const wob = Math.sin(t * 3 + side) * 1.5;
    ctx.beginPath();
    ctx.moveTo(side * 4, -14);
    ctx.quadraticCurveTo(side * 5, -21, side * 9 + wob, -24);
    ctx.strokeStyle = '#5a3818';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    circle(ctx, side * 9 + wob, -24, 2.3);
    ctx.fillStyle = '#5a3818';
    ctx.fill();
  }

  // Face
  drawEye(ctx, -4.8, -3.5, 3.9, open, a.facing * 0.6, a.working && Math.sin(t * 2.2) > 0.6);
  drawEye(ctx, 4.8, -3.5, 3.9, open, a.facing * 0.6, a.working && Math.sin(t * 2.2) > 0.6);
  cheeks(ctx, -8.8, 8.8, 1.8, 2.5);
  smile(ctx, 0, 2.6, 2.8, '#5a3818');

  // A nectar drop in hand while working
  if (a.working) {
    const glow = 0.6 + Math.sin(t * 4) * 0.25;
    ctx.beginPath();
    ctx.moveTo(7, 15);
    ctx.quadraticCurveTo(3.5, 20, 7, 22.5);
    ctx.quadraticCurveTo(10.5, 20, 7, 15);
    ctx.fillStyle = `rgba(255, 196, 46, ${glow + 0.2})`;
    ctx.fill();
  }

  ctx.restore();
}

// ----- Emberpup ----------------------------------------------------------

function drawEmberpup(ctx, a) {
  const t = a.t + a.phase * 10;
  const step = a.moving ? Math.sin(t * 13) : 0;
  const breathe = 1 + Math.sin(t * 2) * 0.035;
  const open = blink(t, a.phase);
  const heat = Math.min(1, (a.working ? 0.65 : 0.25) + a.glow);
  const cheekPulse = 0.75 + Math.sin(t * (a.working ? 6 : 2.5)) * 0.25;
  const s = 1 + a.pop * 0.12;

  // Ember burst glow when a crafting cycle completes
  if (a.glow > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    circle(ctx, 0, -14, 34 + a.glow * 14);
    ctx.fillStyle = radial(ctx, 0, -14, 34 + a.glow * 14, [
      [0, `rgba(255, 210, 120, ${0.55 * a.glow})`],
      [1, 'rgba(255, 120, 40, 0)'],
    ]);
    ctx.fill();
    ctx.restore();
  }

  shadow(ctx, 22);

  ctx.save();
  ctx.scale(s, s);

  // Tail with a flickering flame tip
  const sway = Math.sin(t * 2.4) * 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#d94c28';
  ctx.beginPath();
  ctx.moveTo(-12, -11);
  ctx.quadraticCurveTo(-26, -8 + sway * 0.3, -29, -18 + sway);
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-26, -13 + sway * 0.6);
  ctx.quadraticCurveTo(-30, -19 + sway, -28, -25 + sway);
  ctx.lineWidth = 4.5;
  ctx.stroke();
  const fx = -28;
  const fy = -26 + sway;
  const flick = 1 + Math.sin(t * 17) * 0.12 + heat * 0.35;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(flick, flick);
  ctx.globalCompositeOperation = 'lighter';
  circle(ctx, 0, -2, 7);
  ctx.fillStyle = radial(ctx, 0, -2, 7, [
    [0, `rgba(255, 220, 120, ${0.5 * heat + 0.2})`],
    [1, 'rgba(255, 120, 40, 0)'],
  ]);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(-4, -2, 0, -9 - Math.sin(t * 13) * 1.5);
  ctx.quadraticCurveTo(4, -2, 0, 2);
  ctx.fillStyle = '#ffb02e';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.quadraticCurveTo(-2, -1.5, 0, -5);
  ctx.quadraticCurveTo(2, -1.5, 0, 1);
  ctx.fillStyle = '#fff0a0';
  ctx.fill();
  ctx.restore();

  // Stubby legs
  ctx.fillStyle = '#c23e22';
  [
    [-10, 1],
    [-3, -1],
    [7, 1],
    [13, -1],
  ].forEach(([lx, ph], i) => {
    const off = step * ph * 2.2;
    ellipse(ctx, lx + off, -3 + (i % 2 ? Math.min(0, step) : Math.min(0, -step)) * 1.4, 3.6, 3);
    ctx.fill();
  });

  // Body
  ctx.save();
  ctx.translate(-1, -12);
  ctx.scale(breathe, 1 / Math.sqrt(breathe));
  ellipse(ctx, 0, 0, 17, 10.5);
  ctx.fillStyle = radial(ctx, -3, -5, 22, [
    [0, '#ffae6a'],
    [0.55, '#f2683a'],
    [1, '#c93e24'],
  ]);
  ctx.fill();
  ellipse(ctx, 1, 4.5, 12.5, 4.6);
  ctx.fillStyle = 'rgba(255, 210, 150, 0.8)';
  ctx.fill();
  // Back spots and ridge bumps
  ctx.fillStyle = '#c4381f';
  [
    [-8, -6, 2.6],
    [-1, -8, 2.2],
    [6, -6.5, 2],
  ].forEach(([x, y, r]) => {
    ellipse(ctx, x, y, r, r * 0.7);
    ctx.fill();
  });
  ctx.fillStyle = '#ffb36b';
  for (let i = 0; i < 4; i++) {
    circle(ctx, -10 + i * 5.5, -10 + Math.abs(i - 1.5) * 0.6, 2);
    ctx.fill();
  }
  ctx.restore();

  // Head
  ctx.save();
  ctx.translate(14, -19 + Math.sin(t * 2) * 0.6);
  ctx.rotate(a.working ? Math.sin(t * 3) * 0.05 : 0);
  circle(ctx, 0, 0, 11.5);
  ctx.fillStyle = radial(ctx, -3, -4, 15, [
    [0, '#ffb878'],
    [0.6, '#f26a3a'],
    [1, '#cf4426'],
  ]);
  ctx.fill();
  // Little head nubs
  ctx.fillStyle = '#ffb36b';
  circle(ctx, -6, -10, 2.4);
  ctx.fill();
  circle(ctx, 2, -11.2, 2.4);
  ctx.fill();
  // Snout
  ellipse(ctx, 7, 3, 6, 4.6);
  ctx.fillStyle = '#ff9a5a';
  ctx.fill();
  circle(ctx, 9.5, 1.5, 0.9);
  ctx.fillStyle = '#7a2a1a';
  ctx.fill();

  // Glowing cheeks
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [cx, cy] of [
    [-5, 4],
    [8.5, 6],
  ]) {
    const r = 3.5 + heat * 4 * cheekPulse;
    circle(ctx, cx, cy, r);
    ctx.fillStyle = radial(ctx, cx, cy, r, [
      [0, `rgba(255, 240, 150, ${0.55 + heat * 0.4})`],
      [0.5, `rgba(255, 150, 50, ${0.35 + heat * 0.3})`],
      [1, 'rgba(255, 90, 30, 0)'],
    ]);
    ctx.fill();
  }
  ctx.restore();

  const happy = a.working && Math.sin(t * 1.3) > 0.2;
  drawEye(ctx, -2.5, -2.5, 3.7, open, 0.6, happy);
  drawEye(ctx, 5.5, -2.5, 3.5, open, 0.6, happy);
  smile(ctx, 4.5, 5.8, 2.8, '#7a2a1a');
  ctx.restore();

  ctx.restore();
}

const DRAWERS = {
  mosslet: drawMosslet,
  nectabee: drawNectabee,
  emberpup: drawEmberpup,
};

const DEFAULT_ANIM = { t: 0, phase: 0, working: false, moving: false, facing: 1, glow: 0, pop: 0, lifted: false };

export function drawCreature(ctx, speciesId, x, y, scale, anim = {}) {
  const draw = DRAWERS[speciesId];
  if (!draw) return;
  const a = { ...DEFAULT_ANIM, ...anim };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (a.facing < 0 ? -1 : 1), scale);
  draw(ctx, a);
  ctx.restore();
}

// Pre-rendered portraits for the interface (cached as data URLs).
const portraitCache = new Map();

export function creaturePortrait(speciesId, size = 96) {
  const key = `${speciesId}:${size}`;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const scale = size / (speciesId === 'emberpup' ? 72 : 58);
  const footY = size * (speciesId === 'nectabee' ? 0.84 : 0.8);
  drawCreature(ctx, speciesId, size * (speciesId === 'emberpup' ? 0.54 : 0.5), footY, scale, { t: 0.7, phase: 0.1 });
  const url = canvas.toDataURL('image/png');
  portraitCache.set(key, url);
  return url;
}
