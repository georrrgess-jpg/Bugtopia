// Pointer and keyboard controls for the workshop canvas: tap to select,
// tap again to assign or place, drag to move stations and creatures.

import { SPECIES } from '../data/species.js';
import { STATIONS } from '../data/stations.js';
import { canOperate, getCreature, getStation, occupantOf, stationAt } from '../core/rules.js';
import { app, act, select, setMode } from '../app.js';
import { audio } from '../audio/audio.js';
import { toast } from './toast.js';

const DRAG_THRESHOLD = 8;

export function attachInput(canvas, view) {
  let down = null;

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock();
    if (e.button === 2) return;
    if (e.button !== 0 || !app.state) return;
    const p = pos(e);
    down = { ...p, hit: view.hitTest(p.x, p.y), pointerId: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!app.state) return;
    const p = pos(e);
    app.ui.hover = view.tileAt(p.x, p.y);
    const drag = app.ui.drag;
    if (down && !drag && Math.hypot(p.x - down.x, p.y - down.y) > DRAG_THRESHOLD) {
      const hit = down.hit;
      const placing = app.ui.mode && app.ui.mode.type === 'place';
      if (!placing && hit && (hit.kind === 'station' || hit.kind === 'creature')) {
        app.ui.drag = { kind: hit.kind, id: hit.id, px: p.x, py: p.y, tile: app.ui.hover, active: true };
        if (app.ui.mode) setMode(null);
        select({ kind: hit.kind, id: hit.id });
        canvas.classList.add('dragging');
      }
    }
    if (app.ui.drag) {
      app.ui.drag.px = p.x;
      app.ui.drag.py = p.y;
      app.ui.drag.tile = app.ui.hover;
    } else {
      const hit = view.hitTest(p.x, p.y);
      const pickable = (hit && hit.kind !== 'tile') || (app.ui.mode && app.ui.mode.type !== 'assign');
      canvas.classList.toggle('can-pick', !!pickable);
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const p = pos(e);
    const drag = app.ui.drag;
    if (drag) drop(drag, view.tileAt(p.x, p.y));
    else handleTap(view, p);
    down = null;
    app.ui.drag = null;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('pointercancel', () => {
    down = null;
    app.ui.drag = null;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('pointerleave', () => {
    if (!down) app.ui.hover = null;
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (app.ui.mode) setMode(null);
    else select(null);
  });
}

function drop(drag, tile) {
  const state = app.state;
  if (drag.kind === 'station') {
    if (!tile) return;
    const st = getStation(state, drag.id);
    if (!st || (st.x === tile.x && st.y === tile.y)) return;
    act('moveStation', drag.id, tile.x, tile.y);
    return;
  }
  if (drag.kind === 'creature') {
    if (!tile) return;
    const station = stationAt(state, tile.x, tile.y);
    if (!station) return;
    const creature = getCreature(state, drag.id);
    if (creature && creature.stationId === station.id) return;
    const r = act('assignCreature', drag.id, station.id);
    if (r.ok) announceAssignment(drag.id, station.id, r.displaced);
  }
}

function announceAssignment(creatureId, stationId, displaced) {
  const c = getCreature(app.state, creatureId);
  const st = getStation(app.state, stationId);
  if (!c || !st) return;
  if (displaced) {
    toast(
      displaced.stationId
        ? `${c.name} and ${displaced.name} swapped places.`
        : `${c.name} took over. ${displaced.name} is taking a break.`,
      'info',
    );
  }
}

function handleTap(view, p) {
  const state = app.state;
  const mode = app.ui.mode;
  const tile = view.tileAt(p.x, p.y);

  if (mode && mode.type === 'place') {
    if (!tile) return;
    const r = act('buildStation', mode.stationType, tile.x, tile.y);
    if (r.ok) {
      setMode(null);
      select({ kind: 'station', id: r.station.id });
      const def = STATIONS[mode.stationType];
      toast(r.worker ? `${def.name} built — ${r.worker.name} got straight to work!` : `${def.name} built!`, 'good');
    }
    return;
  }

  if (mode && mode.type === 'move') {
    if (!tile) return;
    const st = getStation(state, mode.stationId);
    if (st && st.x === tile.x && st.y === tile.y) {
      setMode(null);
      return;
    }
    const r = act('moveStation', mode.stationId, tile.x, tile.y);
    if (r.ok) setMode(null);
    return;
  }

  const hit = view.hitTest(p.x, p.y);

  if (mode && mode.type === 'assign') {
    if (hit && hit.kind === 'station') {
      const r = act('assignCreature', mode.creatureId, hit.id);
      if (r.ok) {
        setMode(null);
        announceAssignment(mode.creatureId, hit.id, r.displaced);
      }
      return;
    }
    setMode(null);
    if (hit && hit.kind === 'creature') select({ kind: 'creature', id: hit.id });
    return;
  }

  if (!hit || hit.kind === 'tile') {
    select(null);
    return;
  }
  if (hit.kind === 'creature') {
    select({ kind: 'creature', id: hit.id });
    return;
  }
  // Station tapped while a creature is selected: put it to work there if the
  // station is free and suitable. Otherwise just inspect the station.
  const sel = app.ui.selection;
  if (sel && sel.kind === 'creature') {
    const c = getCreature(state, sel.id);
    const st = getStation(state, hit.id);
    if (c && st && c.stationId !== st.id && st.type !== 'storage' && !occupantOf(state, st.id)) {
      if (canOperate(c.species, st.type)) {
        act('assignCreature', c.id, st.id);
        return;
      }
      toast(`${SPECIES[c.species].name}s work at ${STATIONS[SPECIES[c.species].station].name}s.`, 'warn');
      audio.play('error');
    }
  }
  select({ kind: 'station', id: hit.id });
}
