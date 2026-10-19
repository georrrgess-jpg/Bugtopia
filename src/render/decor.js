// Environment art: the underground room beneath the great tree. Shared by the
// workshop view and the title screen.

const TAU = Math.PI * 2;

// Deterministic pseudo-random number in [0, 1) for a pair of integers.
export function hash(x, y = 0, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

// Packed-earth ground below the wall.
export function drawEarth(ctx, w, h, top, unit) {
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, '#4a3322');
  g.addColorStop(1, '#2c1e14');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, h - top);
  // Speckles and pebbles
  const n = Math.floor((w * (h - top)) / (unit * unit * 0.35));
  for (let i = 0; i < n; i++) {
    const x = hash(i, 1) * w;
    const y = top + hash(i, 2) * (h - top);
    const r = (0.02 + hash(i, 3) * 0.05) * unit;
    ellipse(ctx, x, y, r * 1.4, r);
    ctx.fillStyle = hash(i, 4) > 0.5 ? 'rgba(110, 80, 55, 0.35)' : 'rgba(20, 12, 6, 0.3)';
    ctx.fill();
  }
  // Grass tufts
  for (let i = 0; i < n / 6; i++) {
    const x = hash(i, 7) * w;
    const y = top + unit * 0.2 + hash(i, 8) * (h - top);
    drawGrassTuft(ctx, x, y, unit * (0.12 + hash(i, 9) * 0.1));
  }
}

export function drawGrassTuft(ctx, x, y, s) {
  ctx.strokeStyle = '#5c8a3a';
  ctx.lineWidth = Math.max(1, s * 0.14);
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * s * 0.12, y);
    ctx.quadraticCurveTo(x + i * s * 0.3, y - s * 0.6, x + i * s * 0.5, y - s * (0.8 + Math.abs(i) * -0.1));
    ctx.stroke();
  }
}

// The back wall of the workshop: earth, timber beams, roots and moss.
export function drawWall(ctx, w, bottom, unit) {
  if (bottom <= 0) return;
  const g = ctx.createLinearGradient(0, 0, 0, bottom);
  g.addColorStop(0, '#2a1b12');
  g.addColorStop(0.55, '#4a3020');
  g.addColorStop(1, '#5e3e28');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, bottom);

  // Layered soil bands
  for (let i = 0; i < 5; i++) {
    const y = bottom - unit * (0.3 + i * 0.55);
    if (y < 0) break;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += unit * 0.5) {
      ctx.lineTo(x, y + Math.sin(x / unit + i * 2) * unit * 0.06);
    }
    ctx.strokeStyle = 'rgba(30, 18, 10, 0.25)';
    ctx.lineWidth = unit * 0.05;
    ctx.stroke();
  }

  // Thick roots creeping down from above
  const roots = Math.ceil(w / (unit * 1.6));
  for (let i = 0; i < roots; i++) {
    const x = (i + hash(i, 11)) * unit * 1.6;
    const len = bottom * (0.25 + hash(i, 12) * 0.5);
    const thick = unit * (0.06 + hash(i, 13) * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, -5);
    ctx.bezierCurveTo(x + unit * 0.4, len * 0.3, x - unit * 0.3, len * 0.6, x + unit * 0.1 * (hash(i, 14) - 0.5), len);
    ctx.strokeStyle = '#6b4a2e';
    ctx.lineWidth = thick;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160, 120, 80, 0.25)';
    ctx.lineWidth = thick * 0.35;
    ctx.stroke();
  }

  // Timber frame: a top beam and posts
  const beamY = bottom - unit * 1.35;
  if (beamY > unit * 0.2) {
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(0, beamY, w, unit * 0.2);
    ctx.fillStyle = 'rgba(255, 220, 160, 0.12)';
    ctx.fillRect(0, beamY, w, unit * 0.05);
  }
  const postGap = unit * 2.6;
  for (let x = postGap * 0.5; x < w; x += postGap) {
    const pw = unit * 0.2;
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(x - pw / 2, Math.max(0, beamY), pw, bottom - Math.max(0, beamY));
    ctx.fillStyle = 'rgba(255, 220, 160, 0.1)';
    ctx.fillRect(x - pw / 2, Math.max(0, beamY), pw * 0.25, bottom - Math.max(0, beamY));
  }

  // Moss creeping along the beam, with the odd drip hanging below
  for (let i = 0, x = 0; x < w; i++, x += unit * 0.37) {
    const k = hash(i, 21);
    if (k < 0.55 || beamY < 0) continue;
    for (let j = 0; j < 3; j++) {
      circle(ctx, x + (j - 1) * unit * 0.05, beamY + (j % 2 ? -1 : 1) * unit * 0.012, unit * (0.022 + hash(i, j) * 0.02));
      ctx.fillStyle = j === 1 ? '#7fbf4a' : '#5a9a3a';
      ctx.fill();
    }
    if (k > 0.85) {
      ctx.strokeStyle = '#5a9a3a';
      ctx.lineWidth = Math.max(1, unit * 0.012);
      ctx.beginPath();
      ctx.moveTo(x, beamY);
      ctx.lineTo(x, beamY + unit * (0.08 + k * 0.1));
      ctx.stroke();
    }
  }

  // Shelves with jars between the posts
  for (let x = postGap, i = 0; x < w - unit; x += postGap, i++) {
    if (i % 2) continue;
    const sy = beamY + unit * 0.75;
    if (sy + unit * 0.1 > bottom) continue;
    ctx.fillStyle = '#7a4e2a';
    ctx.fillRect(x - unit * 0.5, sy, unit * 1.0, unit * 0.07);
    const jarColors = ['#8fd16a', '#ffc63d', '#f0a24f', '#9ad8e8'];
    for (let j = 0; j < 3; j++) {
      const jx = x - unit * 0.32 + j * unit * 0.32;
      const jh = unit * (0.2 + hash(i, j) * 0.1);
      ctx.fillStyle = 'rgba(220, 235, 240, 0.35)';
      ctx.beginPath();
      ctx.roundRect(jx - unit * 0.09, sy - jh, unit * 0.18, jh, unit * 0.04);
      ctx.fill();
      ctx.fillStyle = jarColors[(i + j) % jarColors.length];
      ctx.beginPath();
      ctx.roundRect(jx - unit * 0.07, sy - jh * 0.6, unit * 0.14, jh * 0.55, unit * 0.03);
      ctx.fill();
      ctx.fillStyle = '#8a5a30';
      ctx.fillRect(jx - unit * 0.06, sy - jh - unit * 0.04, unit * 0.12, unit * 0.05);
    }
  }

  // Baseboard where the wall meets the floor
  ctx.fillStyle = '#3a2516';
  ctx.fillRect(0, bottom - unit * 0.08, w, unit * 0.08);
}

// Lantern positions along the wall (shared so the static and animated
// layers line up).
export function lanternSpots(w, bottom, unit) {
  const spots = [];
  const postGap = unit * 2.6;
  const y = bottom - unit * 1.05;
  if (y < unit * 0.4) return spots;
  for (let x = postGap * 0.5; x < w; x += postGap) spots.push({ x, y });
  return spots;
}

export function drawLantern(ctx, x, y, s, t, i = 0) {
  const flicker = 0.85 + Math.sin(t * 7 + i * 1.7) * 0.06 + Math.sin(t * 13.3 + i) * 0.05;
  // Warm glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const r = s * 2.4 * flicker;
  const g = ctx.createRadialGradient(x, y + s * 0.2, 0, x, y + s * 0.2, r);
  g.addColorStop(0, 'rgba(255, 200, 110, 0.38)');
  g.addColorStop(0.4, 'rgba(255, 160, 70, 0.14)');
  g.addColorStop(1, 'rgba(255, 140, 60, 0)');
  ctx.fillStyle = g;
  circle(ctx, x, y + s * 0.2, r);
  ctx.fill();
  ctx.restore();

  // Hook and chain
  ctx.strokeStyle = '#3a2a1e';
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.55);
  ctx.lineTo(x, y - s * 0.3);
  ctx.stroke();
  // Cap
  ctx.fillStyle = '#4a3424';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.22, y - s * 0.18);
  ctx.lineTo(x, y - s * 0.34);
  ctx.lineTo(x + s * 0.22, y - s * 0.18);
  ctx.closePath();
  ctx.fill();
  // Glass
  ctx.fillStyle = `rgba(255, ${190 + flicker * 30}, 110, 0.95)`;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.16, y - s * 0.18, s * 0.32, s * 0.4, s * 0.08);
  ctx.fill();
  // Flame
  ctx.fillStyle = '#fff6c8';
  ellipse(ctx, x, y + s * 0.04, s * 0.05, s * 0.09 * flicker);
  ctx.fill();
  // Frame
  ctx.strokeStyle = '#4a3424';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath();
  ctx.roundRect(x - s * 0.16, y - s * 0.18, s * 0.32, s * 0.4, s * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#4a3424';
  ctx.fillRect(x - s * 0.18, y + s * 0.2, s * 0.36, s * 0.06);
}

export function drawMushroom(ctx, x, y, s, cap = '#e0584a', glow = 0) {
  // Stem
  ctx.fillStyle = '#f3e6cf';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, y);
  ctx.quadraticCurveTo(x - s * 0.16, y - s * 0.45, x - s * 0.08, y - s * 0.6);
  ctx.lineTo(x + s * 0.08, y - s * 0.6);
  ctx.quadraticCurveTo(x + s * 0.16, y - s * 0.45, x + s * 0.12, y);
  ctx.closePath();
  ctx.fill();
  if (glow > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - s * 0.6, 0, x, y - s * 0.6, s * 1.1);
    g.addColorStop(0, `rgba(120, 230, 255, ${0.35 * glow})`);
    g.addColorStop(1, 'rgba(120, 230, 255, 0)');
    ctx.fillStyle = g;
    circle(ctx, x, y - s * 0.6, s * 1.1);
    ctx.fill();
    ctx.restore();
  }
  // Cap
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y - s * 0.55);
  ctx.quadraticCurveTo(x - s * 0.42, y - s * 1.05, x, y - s * 1.05);
  ctx.quadraticCurveTo(x + s * 0.42, y - s * 1.05, x + s * 0.45, y - s * 0.55);
  ctx.quadraticCurveTo(x, y - s * 0.45, x - s * 0.45, y - s * 0.55);
  ctx.fill();
  // Spots
  ctx.fillStyle = 'rgba(255, 250, 235, 0.9)';
  circle(ctx, x - s * 0.18, y - s * 0.8, s * 0.07);
  ctx.fill();
  circle(ctx, x + s * 0.12, y - s * 0.9, s * 0.06);
  ctx.fill();
  circle(ctx, x + s * 0.26, y - s * 0.68, s * 0.05);
  ctx.fill();
}

export function drawStone(ctx, x, y, s) {
  ellipse(ctx, x, y, s * 0.5, s * 0.3);
  ctx.fillStyle = '#7a7268';
  ctx.fill();
  ellipse(ctx, x - s * 0.12, y - s * 0.08, s * 0.22, s * 0.12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fill();
}

// A leafy vine hanging from the top of the screen.
export function drawVine(ctx, x, length, s, t, i = 0) {
  const segs = Math.max(3, Math.floor(length / (s * 0.35)));
  let px = x;
  let py = -4;
  ctx.strokeStyle = '#3f7a2e';
  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.lineCap = 'round';
  const pts = [];
  for (let k = 1; k <= segs; k++) {
    const f = k / segs;
    const nx = x + Math.sin(t * 0.9 + i + f * 2.5) * s * 0.18 * f;
    const ny = (length * k) / segs;
    pts.push([px, py, nx, ny]);
    px = nx;
    py = ny;
  }
  ctx.beginPath();
  ctx.moveTo(x, -4);
  for (const [, , nx, ny] of pts) ctx.lineTo(nx, ny);
  ctx.stroke();
  pts.forEach(([, , nx, ny], k) => {
    const side = k % 2 ? 1 : -1;
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(side * 0.9 + Math.sin(t * 1.3 + k) * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.1, s * 0.08, 0, s * 0.22);
    ctx.quadraticCurveTo(-s * 0.1, s * 0.08, 0, 0);
    ctx.fillStyle = k % 3 ? '#5aa43a' : '#7fc95a';
    ctx.fill();
    ctx.restore();
  });
}

// Wooden floor tile.
export function drawPlankTile(ctx, x, y, T, tx, ty) {
  const inset = T * 0.02;
  const base = (tx + ty) % 2 === 0 ? '#c79260' : '#bd8756';
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, T - inset * 2, T - inset * 2, T * 0.06);
  ctx.fill();
  // Three planks per tile
  for (let p = 0; p < 3; p++) {
    const py = y + inset + ((T - inset * 2) / 3) * p;
    const ph = (T - inset * 2) / 3;
    const k = hash(tx * 3 + p, ty, 5);
    ctx.fillStyle = k > 0.5 ? 'rgba(255, 230, 190, 0.07)' : 'rgba(80, 45, 20, 0.07)';
    ctx.fillRect(x + inset, py, T - inset * 2, ph);
    ctx.fillStyle = 'rgba(90, 52, 24, 0.28)';
    ctx.fillRect(x + inset, py + ph - T * 0.012, T - inset * 2, T * 0.012);
    // Knot
    if (k > 0.82) {
      ellipse(ctx, x + T * (0.2 + k * 0.5), py + ph * 0.5, T * 0.035, T * 0.02);
      ctx.fillStyle = 'rgba(90, 52, 24, 0.4)';
      ctx.fill();
    }
    // Plank seam
    const seam = x + T * (0.25 + hash(tx, ty * 3 + p, 9) * 0.5);
    ctx.fillStyle = 'rgba(90, 52, 24, 0.25)';
    ctx.fillRect(seam, py, T * 0.01, ph);
  }
  // Edge shading
  ctx.strokeStyle = 'rgba(70, 40, 18, 0.35)';
  ctx.lineWidth = Math.max(1, T * 0.02);
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, T - inset * 2, T - inset * 2, T * 0.06);
  ctx.stroke();
  // Occasional moss patch in a corner
  const m = hash(tx, ty, 77);
  if (m > 0.72) {
    const cx = x + (m > 0.86 ? T * 0.12 : T * 0.88);
    const cy = y + (m > 0.79 ? T * 0.88 : T * 0.12);
    for (let i = 0; i < 4; i++) {
      circle(ctx, cx + (hash(i, tx) - 0.5) * T * 0.14, cy + (hash(i, ty) - 0.5) * T * 0.1, T * (0.03 + hash(i, m * 100) * 0.03));
      ctx.fillStyle = i % 2 ? 'rgba(110, 175, 70, 0.75)' : 'rgba(140, 200, 90, 0.7)';
      ctx.fill();
    }
  }
}

// Unexcavated soil shown where the next Workshop Expansion will dig.
export function drawDirtTile(ctx, x, y, T, tx, ty) {
  const inset = T * 0.03;
  ctx.fillStyle = 'rgba(95, 66, 44, 0.85)';
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, T - inset * 2, T - inset * 2, T * 0.08);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const k = hash(tx * 7 + i, ty * 5 + i, 3);
    ellipse(ctx, x + T * (0.15 + hash(i, tx, ty) * 0.7), y + T * (0.15 + k * 0.7), T * 0.05, T * 0.035);
    ctx.fillStyle = k > 0.5 ? 'rgba(130, 110, 90, 0.7)' : 'rgba(50, 32, 20, 0.5)';
    ctx.fill();
  }
  ctx.setLineDash([T * 0.06, T * 0.05]);
  ctx.strokeStyle = 'rgba(230, 200, 150, 0.35)';
  ctx.lineWidth = Math.max(1, T * 0.018);
  ctx.beginPath();
  ctx.roundRect(x + inset * 2, y + inset * 2, T - inset * 4, T - inset * 4, T * 0.07);
  ctx.stroke();
  ctx.setLineDash([]);
}
