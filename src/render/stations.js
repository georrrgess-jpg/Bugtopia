// Procedural art for workshop stations. Drawn in a 100 x 100 unit space
// centred on the tile; the caller scales to the current tile size.
//
// drawStation(ctx, type, x, y, scale, anim)
//   anim: { t, species (occupant species or null), working, progress,
//           active, bump (0..1), fill ({ itemId: 0..1 }), seed }

import { iconImage } from '../ui/icons.js';

const TAU = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
}

export function drawGear(ctx, x, y, r, angle, teeth = 8, color = '#d4a85e', hub = '#7a5426') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * TAU;
    const a1 = ((i + 1) / (teeth * 2)) * TAU;
    const rr = i % 2 === 0 ? r : r * 0.78;
    ctx.arc(0, 0, rr, a0, a1);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(70, 40, 15, 0.55)';
  ctx.lineWidth = Math.max(0.8, r * 0.1);
  ctx.stroke();
  circle(ctx, 0, 0, r * 0.38);
  ctx.fillStyle = hub;
  ctx.fill();
  circle(ctx, 0, 0, r * 0.14);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// Wooden platform shared by the gathering and crafting stations.
function platform(ctx, top = '#c08a55', front = '#8c5a30') {
  ellipse(ctx, 0, 34, 44, 9);
  ctx.fillStyle = 'rgba(25, 14, 6, 0.3)';
  ctx.fill();
  roundRect(ctx, -42, 8, 84, 26, 7);
  ctx.fillStyle = front;
  ctx.fill();
  roundRect(ctx, -42, -4, 84, 28, 7);
  ctx.fillStyle = top;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 52, 24, 0.35)';
  ctx.lineWidth = 1.2;
  for (const py of [5, 14]) {
    ctx.beginPath();
    ctx.moveTo(-38, py);
    ctx.lineTo(38, py);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(70, 40, 18, 0.55)';
  for (const nx of [-35, 35]) {
    circle(ctx, nx, 0, 1.4);
    ctx.fill();
    circle(ctx, nx, 19, 1.4);
    ctx.fill();
  }
}

function progressBar(ctx, progress, color, y = 42) {
  roundRect(ctx, -26, y, 52, 7, 3.5);
  ctx.fillStyle = 'rgba(30, 18, 10, 0.55)';
  ctx.fill();
  if (progress > 0) {
    roundRect(ctx, -25, y + 1, Math.max(5, 50 * Math.min(1, progress)), 5, 2.5);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// ----- Gathering Station -------------------------------------------------

function drawGathering(ctx, a) {
  const t = a.t;
  platform(ctx);

  // Planter box at the back
  roundRect(ctx, -32, -30, 64, 26, 4);
  ctx.fillStyle = '#9a6236';
  ctx.fill();
  ctx.strokeStyle = 'rgba(70, 40, 18, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-32, -17);
  ctx.lineTo(32, -17);
  ctx.stroke();
  roundRect(ctx, -34, -34, 68, 7, 3);
  ctx.fillStyle = '#7a4a26';
  ctx.fill();
  ellipse(ctx, 0, -32, 29, 3.5);
  ctx.fillStyle = '#4e3220';
  ctx.fill();

  if (a.species === 'mosslet') {
    // Moss bed
    const grow = a.working ? 1 + Math.sin(t * 3) * 0.04 : 1;
    const tufts = [
      [-22, -35, 7],
      [-12, -38, 8],
      [0, -39, 8.5],
      [12, -38, 8],
      [22, -35, 7],
    ];
    tufts.forEach(([x, y, r], i) => {
      circle(ctx, x, y, r * grow);
      ctx.fillStyle = i % 2 ? '#5fae3e' : '#78c452';
      ctx.fill();
    });
    ctx.fillStyle = '#a7e07a';
    tufts.forEach(([x, y, r]) => {
      circle(ctx, x - 2, y - r * 0.4, r * 0.35);
      ctx.fill();
    });
  } else if (a.species === 'nectabee') {
    // A big blossom growing from the planter
    const sway = Math.sin(t * 1.3) * 0.06;
    ctx.save();
    ctx.translate(-14, -32);
    ctx.rotate(sway);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5, -18, 0, -36);
    ctx.strokeStyle = '#4a8f34';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1, -14);
    ctx.quadraticCurveTo(-14, -20, -16, -12);
    ctx.quadraticCurveTo(-8, -9, -1, -14);
    ctx.fillStyle = '#5fae3e';
    ctx.fill();
    const open = a.working ? 1 + Math.sin(t * 2.2) * 0.05 : 1;
    ctx.translate(0, -38);
    ctx.scale(open, open);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i / 6) * TAU + t * 0.1);
      ellipse(ctx, 0, -8, 5.5, 8.5);
      ctx.fillStyle = i % 2 ? '#ff9ec4' : '#ffb6d3';
      ctx.fill();
      ctx.restore();
    }
    circle(ctx, 0, 0, 6);
    ctx.fillStyle = '#ffcf3a';
    ctx.fill();
    circle(ctx, -1.5, -1.5, 2);
    ctx.fillStyle = '#fff3b0';
    ctx.fill();
    ctx.restore();
    // Little moss for decoration
    circle(ctx, 16, -35, 5);
    ctx.fillStyle = '#6fbf4a';
    ctx.fill();
  } else {
    // Empty: bare soil with a hopeful sprout
    ctx.save();
    ctx.translate(0, -34);
    ctx.rotate(Math.sin(t * 1.5) * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -8);
    ctx.strokeStyle = '#5a9a3a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.quadraticCurveTo(-7, -12, -8, -6);
    ctx.quadraticCurveTo(-3, -5, 0, -7);
    ctx.moveTo(0, -7);
    ctx.quadraticCurveTo(7, -12, 8, -6);
    ctx.quadraticCurveTo(3, -5, 0, -7);
    ctx.fillStyle = '#8fd16a';
    ctx.fill();
    ctx.restore();
  }

  // Side post with a turning gear
  roundRect(ctx, 33, -24, 6, 30, 2);
  ctx.fillStyle = '#7a4a26';
  ctx.fill();
  drawGear(ctx, 36, -26, 10, a.working ? t * 2.2 : 0.3, 8);
  drawGear(ctx, 26, -14, 6, a.working ? -t * 3.6 : 0.1, 6, '#c99a52');

  // Spool on the left that fills with the current product colour
  if (a.species) {
    const color = a.species === 'nectabee' ? '#ffc63d' : '#7fc95a';
    roundRect(ctx, -41, -20, 10, 3, 1);
    ctx.fillStyle = '#7a4a26';
    ctx.fill();
    roundRect(ctx, -41, -5, 10, 3, 1);
    ctx.fill();
    const wound = 3 + a.progress * 4;
    roundRect(ctx, -36 - wound / 2, -17, wound, 12, 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  if (a.species) progressBar(ctx, a.progress, a.species === 'nectabee' ? '#ffcf4a' : '#8fd16a');
}

// ----- Crafting Station --------------------------------------------------

function drawCrafting(ctx, a) {
  const t = a.t;
  platform(ctx, '#a89f92', '#776f64');
  const heat = a.active ? 0.75 + Math.sin(t * 7) * 0.12 + Math.sin(t * 13) * 0.08 : a.species ? 0.25 : 0.06;

  // Loom frame on the left
  ctx.fillStyle = '#8a5a30';
  roundRect(ctx, -42, -46, 5, 50, 2);
  ctx.fill();
  roundRect(ctx, -22, -46, 5, 50, 2);
  ctx.fill();
  roundRect(ctx, -44, -50, 29, 6, 2);
  ctx.fillStyle = '#a8703c';
  ctx.fill();
  // Cloth growing with crafting progress
  const cloth = a.active ? 6 + a.progress * 30 : 6;
  roundRect(ctx, -37, -44, 15, cloth, 1.5);
  ctx.fillStyle = '#f0a24f';
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(-37, -44, 15, cloth);
  ctx.clip();
  ctx.strokeStyle = '#7cc35a';
  ctx.lineWidth = 1.4;
  for (let y = -41; y < -44 + cloth; y += 4) {
    ctx.beginPath();
    ctx.moveTo(-37, y);
    ctx.lineTo(-22, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 220, 110, 0.9)';
  for (let x = -34; x < -22; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, -44);
    ctx.lineTo(x, -44 + cloth);
    ctx.stroke();
  }
  ctx.restore();

  // Chimney
  roundRect(ctx, 16, -64, 12, 30, 2);
  ctx.fillStyle = '#6e675e';
  ctx.fill();
  roundRect(ctx, 14, -67, 16, 6, 2);
  ctx.fillStyle = '#5a544c';
  ctx.fill();

  // Kiln dome
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.bezierCurveTo(-14, -52, 38, -52, 38, 8);
  ctx.closePath();
  const dome = ctx.createLinearGradient(-14, -40, 38, 8);
  dome.addColorStop(0, '#b9b0a2');
  dome.addColorStop(1, '#7e766a');
  ctx.fillStyle = dome;
  ctx.fill();
  // Stones
  ctx.strokeStyle = 'rgba(70, 62, 52, 0.45)';
  ctx.lineWidth = 1.1;
  [
    [-6, -14, 7, 5],
    [8, -24, 8, 5],
    [24, -18, 7, 5],
    [-8, 0, 6, 4.5],
    [30, -2, 6, 4.5],
    [14, -34, 7, 4],
  ].forEach(([x, y, rx, ry]) => {
    ellipse(ctx, x, y, rx, ry);
    ctx.stroke();
  });
  // Moss cap
  ctx.beginPath();
  ctx.moveTo(-6, -26);
  ctx.bezierCurveTo(0, -42, 26, -44, 32, -28);
  ctx.quadraticCurveTo(26, -32, 24, -25);
  ctx.quadraticCurveTo(18, -33, 12, -28);
  ctx.quadraticCurveTo(6, -33, 2, -24);
  ctx.quadraticCurveTo(-2, -30, -6, -26);
  ctx.fillStyle = '#6fae4a';
  ctx.fill();

  // Furnace mouth with heat glow
  ctx.beginPath();
  ctx.moveTo(1, 8);
  ctx.lineTo(1, -6);
  ctx.arc(12, -6, 11, Math.PI, 0);
  ctx.lineTo(23, 8);
  ctx.closePath();
  ctx.fillStyle = '#2a1a14';
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(12, 2, 0, 12, 2, 22);
  g.addColorStop(0, `rgba(255, 220, 120, ${heat})`);
  g.addColorStop(0.5, `rgba(255, 120, 40, ${heat * 0.6})`);
  g.addColorStop(1, 'rgba(255, 80, 20, 0)');
  ctx.fillStyle = g;
  circle(ctx, 12, 2, 22);
  ctx.fill();
  ctx.restore();
  if (a.active) {
    // Dancing flames inside the mouth
    for (let i = 0; i < 3; i++) {
      const fx = 6 + i * 6;
      const h = 7 + Math.sin(t * 11 + i * 2) * 3;
      ctx.beginPath();
      ctx.moveTo(fx - 3, 8);
      ctx.quadraticCurveTo(fx - 3, 8 - h * 0.6, fx, 8 - h);
      ctx.quadraticCurveTo(fx + 3, 8 - h * 0.6, fx + 3, 8);
      ctx.fillStyle = i === 1 ? '#ffe28a' : '#ff9a3a';
      ctx.fill();
    }
  }

  // Gears on the right
  drawGear(ctx, 38, -36, 9, a.active ? t * 2.5 : 0.2, 8);
  drawGear(ctx, 42, -20, 6, a.active ? -t * 3.8 : 0.4, 6, '#c99a52');

  if (a.active) progressBar(ctx, a.progress, '#ffa94a');
}

// ----- Storage Crate -----------------------------------------------------

function drawStorage(ctx, a) {
  const squash = 1 + Math.sin(a.bump * Math.PI) * 0.08;
  ellipse(ctx, 0, 30, 38, 8);
  ctx.fillStyle = 'rgba(25, 14, 6, 0.3)';
  ctx.fill();

  ctx.save();
  ctx.translate(0, 30);
  ctx.scale(1 / Math.sqrt(squash), squash);
  ctx.translate(0, -30);

  // Items peeking out of the top, more as the crate fills up
  const fills = Object.entries(a.fill || {}).filter(([, f]) => f > 0);
  const spots = [
    [-20, -36],
    [0, -40],
    [20, -36],
    [-10, -42],
    [10, -42],
    [-26, -40],
    [26, -40],
  ];
  let spot = 0;
  for (const [item, f] of fills) {
    const n = Math.ceil(f * 3);
    const img = iconImage(item);
    for (let i = 0; i < n && spot < spots.length; i++, spot++) {
      const [x, y] = spots[spot];
      if (img.complete && img.naturalWidth) ctx.drawImage(img, x - 11, y - 11, 22, 22);
    }
  }

  // Back rim
  roundRect(ctx, -34, -34, 68, 12, 3);
  ctx.fillStyle = '#7a4a24';
  ctx.fill();
  // Front face
  roundRect(ctx, -34, -26, 68, 54, 5);
  const wood = ctx.createLinearGradient(0, -26, 0, 28);
  wood.addColorStop(0, '#c8925a');
  wood.addColorStop(1, '#a06a38');
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 52, 24, 0.5)';
  ctx.lineWidth = 1.3;
  for (const y of [-12, 2, 16]) {
    ctx.beginPath();
    ctx.moveTo(-32, y);
    ctx.lineTo(32, y);
    ctx.stroke();
  }
  // Diagonal brace
  ctx.strokeStyle = '#8a5a2c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-28, 22);
  ctx.lineTo(28, -20);
  ctx.stroke();
  // Iron corners
  ctx.fillStyle = '#5a5048';
  for (const [x, y] of [
    [-34, -26],
    [26, -26],
    [-34, 20],
    [26, 20],
  ]) {
    roundRect(ctx, x, y, 8, 8, 2);
    ctx.fill();
  }
  // Label plate with an acorn
  roundRect(ctx, -12, -4, 24, 16, 3);
  ctx.fillStyle = '#f3e2bf';
  ctx.fill();
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const acorn = iconImage('acorn');
  if (acorn.complete && acorn.naturalWidth) ctx.drawImage(acorn, -7, -3, 14, 14);
  ctx.restore();
}

const DRAWERS = {
  gathering: drawGathering,
  crafting: drawCrafting,
  storage: drawStorage,
};

export function drawStation(ctx, type, x, y, scale, anim = {}) {
  const draw = DRAWERS[type];
  if (!draw) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  draw(ctx, { t: 0, species: null, working: false, progress: 0, active: false, bump: 0, fill: {}, ...anim });
  ctx.restore();
}

// Where a creature stands at each station, in tile units relative to the
// tile centre, and which way it faces.
export function creatureAnchor(stationType, speciesId) {
  if (stationType === 'crafting') return { x: -0.04, y: 0.36, facing: 1 };
  if (speciesId === 'nectabee') return { x: 0.12, y: 0.1, facing: -1 };
  return { x: 0, y: 0.14, facing: 1 };
}

// Where produced items appear from, relative to the tile centre.
export function outputPoint(stationType) {
  return stationType === 'crafting' ? { x: 0.12, y: -0.1 } : { x: 0, y: -0.35 };
}
