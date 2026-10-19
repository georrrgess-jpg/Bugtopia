// The inspector panel: details and actions for the selected creature or
// station, or a workshop overview when nothing is selected (wide screens).

import { ITEMS, ITEM_IDS } from '../data/items.js';
import { SPECIES } from '../data/species.js';
import { STATIONS, RECIPES } from '../data/stations.js';
import { WORKSHOP_BOUNDS } from '../data/upgrades.js';
import {
  canOperate,
  capacityPerItem,
  creatureJob,
  crewLimit,
  getCreature,
  getStation,
  itemVisible,
  occupantOf,
  productionInterval,
  stationStatus,
} from '../core/rules.js';
import { app, act, subscribe, refresh, select, setMode } from '../app.js';
import { creaturePortrait } from '../render/creatures.js';
import { drawStation } from '../render/stations.js';
import { h, icon, fmt, setText, toggleClass, clear } from './dom.js';
import { toast } from './toast.js';

const stationArtCache = new Map();
function stationArt(type, species) {
  const key = `${type}:${species || ''}`;
  if (!stationArtCache.has(key)) {
    const size = 76;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    drawStation(ctx, type, size / 2, size * 0.55, size / 118, { t: 0.5, species });
    stationArtCache.set(key, canvas.toDataURL('image/png'));
  }
  return stationArtCache.get(key);
}

function portraitImg(speciesId, cls = 'portrait') {
  return h('img', { class: cls, src: creaturePortrait(speciesId), alt: '', draggable: 'false' });
}

function statusLine() {
  const dot = h('span', { class: 'status-dot' });
  const label = h('span');
  const el = h('div', { class: 'status-line' }, dot, label);
  return {
    el,
    set(text, tone) {
      setText(label, text);
      toggleClass(el, 'ok', tone === 'ok');
      toggleClass(el, 'warn', tone === 'warn');
    },
  };
}

export function createInspector() {
  const root = document.getElementById('inspector');
  root.classList.add('panel');
  const body = h('div', { class: 'inspector-body' });
  root.append(body);
  let view = null;
  let viewKey = '';

  function keyFor() {
    const s = app.state;
    const sel = app.ui.selection;
    const mode = app.ui.mode ? `${app.ui.mode.type}` : '';
    if (!sel) return 'overview';
    if (sel.kind === 'creature') {
      const c = getCreature(s, sel.id);
      return c ? `c:${c.id}:${c.name}:${c.stationId}:${mode}` : 'gone';
    }
    const st = getStation(s, sel.id);
    if (!st) return 'gone';
    const occ = occupantOf(s, st.id);
    const eligible = s.creatures.filter((c) => canOperate(c.species, st.type)).map((c) => `${c.id}${c.stationId}`);
    return `s:${st.id}:${occ?.id}:${eligible.join(',')}:${mode}`;
  }

  function update() {
    const s = app.state;
    if (!s) return;
    const key = keyFor();
    if (key === 'gone') {
      select(null);
      return;
    }
    if (key !== viewKey) {
      viewKey = key;
      clear(body);
      const sel = app.ui.selection;
      view = !sel ? overview(body) : sel.kind === 'creature' ? creatureView(body, sel.id) : stationView(body, sel.id);
      root.classList.toggle('overview', !sel);
      if (sel) root.style.animation = 'none';
      void root.offsetWidth;
      root.style.animation = '';
      refresh('layout');
    }
    view?.update();
  }

  subscribe((reason) => {
    if (reason !== 'layout') update();
  });
  return { update };
}

function closeButton() {
  return h(
    'button',
    { class: 'icon-btn small insp-close', type: 'button', 'aria-label': 'Close', title: 'Close (Esc)', onclick: () => select(null) },
    icon('close'),
  );
}

// ----- Overview --------------------------------------------------------------

function overview(body) {
  const stats = h('div', { class: 'stat-grid' });
  const rateEls = {};
  for (const id of ITEM_IDS) {
    const value = h('span');
    const el = h('div', { class: 'stat' }, h('div', { class: 'label', text: `${ITEMS[id].plural} / min` }), h('div', { class: 'value' }, icon(id), value));
    rateEls[id] = { el, value };
    stats.append(el);
  }
  const crew = h('span');
  const floor = h('span');
  const storage = h('span');
  stats.append(
    h('div', { class: 'stat' }, h('div', { class: 'label', text: 'Crew' }), h('div', { class: 'value' }, icon('creatures'), crew)),
    h('div', { class: 'stat' }, h('div', { class: 'label', text: 'Floor' }), h('div', { class: 'value' }, icon('expand'), floor)),
    h('div', { class: 'stat' }, h('div', { class: 'label', text: 'Storage each' }), h('div', { class: 'value' }, icon('crate'), storage)),
  );
  body.append(
    h('span', { class: 'kicker' }, 'Overview'),
    h('h2', { text: 'Your Workshop', style: { fontSize: '22px', margin: '2px 0 12px' } }),
    stats,
    h(
      'div',
      { class: 'insp-section' },
      h('span', { class: 'kicker' }, 'How it works'),
      h(
        'ul',
        { class: 'insp-text', style: { paddingLeft: '18px', margin: '4px 0 0' } },
        h('li', { text: 'Tap a creature or station to inspect it.' }),
        h('li', { text: 'Drag creatures onto stations to give them a job.' }),
        h('li', { text: 'Drag stations to rearrange your workshop.' }),
        h('li', { text: 'Sell goods and fill orders at the Market.' }),
      ),
    ),
  );
  return {
    update() {
      const s = app.state;
      const rates = Object.fromEntries(ITEM_IDS.map((id) => [id, 0]));
      for (const st of s.stations) {
        const c = occupantOf(s, st.id);
        if (!c) continue;
        const sp = SPECIES[c.species];
        if (st.type === 'gathering' && sp.produces) rates[sp.produces.item] += 60 / productionInterval(s, c.species);
        if (st.type === 'crafting' && sp.crafts) {
          const r = RECIPES[st.recipe];
          rates[r.output.item] += (60 / r.time) * r.output.qty;
        }
      }
      for (const id of ITEM_IDS) {
        const visible = itemVisible(s, id);
        if (rateEls[id].el.hidden === visible) rateEls[id].el.hidden = !visible;
        setText(rateEls[id].value, rates[id] ? rates[id].toFixed(1).replace(/\.0$/, '') : '0');
      }
      setText(crew, `${s.creatures.length}/${crewLimit(s)}`);
      const b = WORKSHOP_BOUNDS[s.upgrades.expansion];
      setText(floor, `${b.maxX - b.minX + 1}×${b.maxY - b.minY + 1}`);
      setText(storage, fmt(capacityPerItem(s)));
    },
  };
}

// ----- Creature ----------------------------------------------------------------

function creatureView(body, creatureId) {
  const s = app.state;
  const c = getCreature(s, creatureId);
  const sp = SPECIES[c.species];
  const status = statusLine();
  const barFill = h('i');
  const bar = h('div', { class: `bar ${c.species === 'nectabee' ? 'honey' : sp.crafts ? 'ember' : ''}` }, barFill);
  const nameEl = h('h2', { text: c.name });
  const titleBox = h(
    'div',
    { class: 'insp-title' },
    nameEl,
    h('div', { class: 'tags' }, h('span', { class: `tag ${sp.crafts ? 'ember' : c.species === 'nectabee' ? 'honey' : 'leaf'}`, text: sp.name }), h('span', { class: 'tag', text: sp.role })),
  );

  const startRename = () => {
    const input = h('input', { class: 'rename-input', value: c.name, maxlength: '16', 'aria-label': 'Creature name' });
    let done = false;
    const finish = (commit) => {
      if (done) return;
      done = true;
      if (commit && input.value.trim() !== c.name) act('renameCreature', creatureId, input.value);
      else refresh('rename');
      input.replaceWith(nameEl);
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
    nameEl.replaceWith(input);
    input.focus();
    input.select();
  };

  const inAssign = app.ui.mode && app.ui.mode.type === 'assign';
  const buttons = h('div', { class: 'btn-row' });
  if (inAssign) {
    buttons.append(h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => setMode(null) }, 'Cancel'));
  } else {
    buttons.append(
      h(
        'button',
        {
          class: 'btn btn-primary',
          type: 'button',
          onclick: () => {
            const anywhere = app.state.stations.some((st) => canOperate(c.species, st.type) && st.id !== c.stationId);
            if (!anywhere) {
              toast(`There's no other ${STATIONS[sp.station].name}. Build one from the Build menu.`, 'warn');
              return;
            }
            setMode({ type: 'assign', creatureId });
          },
        },
        c.stationId ? 'Move to…' : 'Assign to…',
      ),
    );
    if (c.stationId) {
      buttons.append(h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => act('unassignCreature', creatureId) }, 'Rest'));
    }
    buttons.append(h('button', { class: 'btn btn-secondary', type: 'button', onclick: startRename }, 'Rename'));
  }

  const hint = h('p', { class: 'insp-text' });
  body.append(
    h('div', { class: 'insp-head' }, portraitImg(c.species), titleBox, closeButton()),
    h('div', { class: 'insp-section' }, status.el, bar),
    hint,
    buttons,
    h('p', { class: 'insp-text', text: sp.blurb }),
  );

  return {
    update() {
      const st = app.state;
      const creature = getCreature(st, creatureId);
      if (!creature) return;
      const station = creature.stationId ? getStation(st, creature.stationId) : null;
      if (station) {
        const ss = stationStatus(st, station);
        const job = creatureJob(st, creature);
        status.set(ss.tone === 'ok' ? job.label : ss.label, ss.tone);
        bar.hidden = false;
        barFill.style.width = `${Math.round((station.progress || 0) * 100)}%`;
      } else {
        status.set('Resting — no job yet', 'idle');
        bar.hidden = true;
      }
      if (app.ui.mode && app.ui.mode.type === 'assign') {
        setText(hint, `Tap a glowing ${STATIONS[sp.station].name} to put ${creature.name} to work there.`);
      } else if (!station) {
        setText(hint, `Tap an empty ${STATIONS[sp.station].name} (or drag ${creature.name} onto one) to give it a job.`);
      } else {
        setText(hint, '');
      }
      hint.hidden = !hint.textContent;
    },
  };
}

// ----- Station -------------------------------------------------------------------

function stationView(body, stationId) {
  const s = app.state;
  const st = getStation(s, stationId);
  const def = STATIONS[st.type];
  const occ = occupantOf(s, st.id);
  const status = statusLine();
  const barFill = h('i');
  const bar = h('div', { class: `bar ${st.type === 'crafting' ? 'ember' : occ?.species === 'nectabee' ? 'honey' : ''}` }, barFill);

  body.append(
    h(
      'div',
      { class: 'insp-head' },
      h('img', { class: 'portrait', src: stationArt(st.type, occ?.species), alt: '' }),
      h('div', { class: 'insp-title' }, h('h2', { text: def.name }), h('div', { class: 'tags' }, h('span', { class: 'tag', text: st.type === 'storage' ? 'Storage' : st.type === 'crafting' ? 'Crafting' : 'Gathering' }))),
      closeButton(),
    ),
    h('div', { class: 'insp-section' }, status.el, bar),
  );

  const updaters = [];

  // Worker
  if (st.type !== 'storage') {
    const section = h('div', { class: 'insp-section' }, h('span', { class: 'kicker' }, 'Worker'));
    const list = h('div', { class: 'mini-list' });
    if (occ) {
      list.append(
        h(
          'div',
          { class: 'mini-row' },
          portraitImg(occ.species),
          h('div', { class: 'grow' }, h('div', { class: 'name', text: occ.name }), h('div', { class: 'sub', text: SPECIES[occ.species].name })),
          h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => select({ kind: 'creature', id: occ.id }) }, 'View'),
          h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => act('unassignCreature', occ.id) }, 'Rest'),
        ),
      );
    }
    const candidates = s.creatures
      .filter((c) => canOperate(c.species, st.type) && c.id !== occ?.id)
      .sort((a, b) => (a.stationId ? 1 : 0) - (b.stationId ? 1 : 0));
    if (!occ && !candidates.length) {
      const need = Object.values(SPECIES)
        .filter((sp) => sp.station === st.type)
        .map((sp) => sp.name)
        .join(' or ');
      list.append(h('p', { class: 'insp-text', text: `No one can work here yet. Hire a ${need} from Creatures.` }));
    }
    if (candidates.length) {
      list.append(h('span', { class: 'kicker', style: { marginTop: '6px' } }, occ ? 'Swap in' : 'Available'));
    }
    for (const c of candidates.slice(0, 6)) {
      list.append(
        h(
          'div',
          { class: 'mini-row' },
          portraitImg(c.species),
          h('div', { class: 'grow' }, h('div', { class: 'name', text: c.name }), h('div', { class: 'sub', text: c.stationId ? 'Working elsewhere' : 'Resting' })),
          h(
            'button',
            { class: 'btn btn-primary btn-small', type: 'button', onclick: () => act('assignCreature', c.id, stationId) },
            c.stationId ? 'Move here' : 'Assign',
          ),
        ),
      );
    }
    section.append(list);
    body.append(section);
  }

  // Recipe
  if (st.type === 'crafting') {
    const recipe = RECIPES[st.recipe];
    const ingEls = Object.entries(recipe.inputs).map(([item, need]) => {
      const count = h('span');
      const el = h('span', { class: 'ing' }, count, icon(item));
      return { item, need, el, count };
    });
    const recipeRow = h(
      'div',
      { class: 'recipe' },
      ...ingEls.flatMap((e, i) => (i ? [h('span', { class: 'arrow' }, '+'), e.el] : [e.el])),
      h('span', { class: 'arrow' }, '→'),
      h('span', { class: 'ing' }, `${recipe.output.qty}`, icon(recipe.output.item)),
      h('span', { class: 'arrow' }, `${recipe.time}s`),
    );
    const toggleBtn = h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => act('toggleCrafting', stationId) });
    body.append(
      h(
        'div',
        { class: 'insp-section' },
        h('span', { class: 'kicker' }, 'Recipe'),
        recipeRow,
        h('p', { class: 'insp-text', text: 'Crafting starts automatically whenever the ingredients are in storage. Ingredients are used up when a cycle begins.' }),
        h('div', { class: 'btn-row' }, toggleBtn),
      ),
    );
    updaters.push(() => {
      const state = app.state;
      for (const e of ingEls) {
        const have = state.inventory[e.item];
        setText(e.count, `${Math.min(have, 99)}/${e.need}`);
        toggleClass(e.el, 'short', have < e.need);
      }
      const station = getStation(state, stationId);
      setText(toggleBtn, station.enabled ? 'Pause auto-crafting' : 'Resume auto-crafting');
    });
  }

  // Storage contents
  if (st.type === 'storage') {
    const list = h('div', { class: 'mini-list' });
    const rows = ITEM_IDS.map((id) => {
      const fill = h('i');
      const qty = h('span', { class: 'sub' });
      const el = h(
        'div',
        { class: 'mini-row' },
        icon(id),
        h('div', { class: 'grow' }, h('div', { class: 'name', text: ITEMS[id].plural }), h('div', { class: 'bar', style: { height: '7px', marginTop: '3px' } }, fill)),
        qty,
      );
      list.append(el);
      return { id, el, fill, qty };
    });
    body.append(
      h(
        'div',
        { class: 'insp-section' },
        h('span', { class: 'kicker' }, 'Workshop stock'),
        list,
        h('p', { class: 'insp-text', text: 'All crates share one stock. Each crate adds more room — build more, or buy Storage Capacity.' }),
      ),
    );
    updaters.push(() => {
      const state = app.state;
      const cap = capacityPerItem(state);
      for (const r of rows) {
        const visible = itemVisible(state, r.id);
        if (r.el.hidden === visible) r.el.hidden = !visible;
        r.fill.style.width = `${Math.round((state.inventory[r.id] / cap) * 100)}%`;
        setText(r.qty, `${fmt(state.inventory[r.id])}/${fmt(cap)}`);
      }
    });
  }

  const moving = app.ui.mode && app.ui.mode.type === 'move';
  body.append(
    h(
      'div',
      { class: 'btn-row' },
      moving
        ? h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => setMode(null) }, 'Cancel move')
        : h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => setMode({ type: 'move', stationId }) }, 'Move station'),
    ),
    h('p', { class: 'insp-text', text: def.blurb }),
  );

  return {
    update() {
      const state = app.state;
      const station = getStation(state, stationId);
      if (!station) return;
      const ss = stationStatus(state, station);
      status.set(ss.label, ss.tone);
      const showBar = station.type === 'gathering' ? !!occupantOf(state, stationId) : station.type === 'crafting' && station.active;
      bar.hidden = !showBar;
      if (showBar) barFill.style.width = `${Math.round((station.progress || 0) * 100)}%`;
      updaters.forEach((u) => u());
    },
  };
}
