// Pop-up sheets over the workshop: Market, Creatures, Build and Upgrades.
// Each sheet is built once when opened; `update` keeps numbers and button
// states live without rebuilding buttons under the player's cursor.

import { ITEMS, ITEM_IDS } from '../data/items.js';
import { SPECIES, SPECIES_IDS } from '../data/species.js';
import { STATIONS, STATION_IDS, RECIPES } from '../data/stations.js';
import { UPGRADES, UPGRADE_IDS, maxLevel } from '../data/upgrades.js';
import * as A from '../core/actions.js';
import {
  buildPrice,
  countStations,
  creatureJob,
  crewLimit,
  hirePrice,
  isUnlocked,
  itemVisible,
  productionInterval,
  upgradeCost,
  canOperate,
  occupantOf,
} from '../core/rules.js';
import { app, act, explain, subscribe, refresh, select, setMode } from '../app.js';
import { audio } from '../audio/audio.js';
import { creaturePortrait } from '../render/creatures.js';
import { drawStation } from '../render/stations.js';
import { h, icon, fmt, price, setText, toggleClass, clear, actionButton, confettiAt } from './dom.js';
import { toast } from './toast.js';
import { tutorialFocus } from './tutorial.js';

let current = null;

const SHEETS = {
  market: { title: 'Market', icon: 'market', build: buildMarket },
  creatures: { title: 'Creatures', icon: 'creatures', build: buildCreatures },
  build: { title: 'Build', icon: 'build', build: buildBuild },
  upgrades: { title: 'Upgrades', icon: 'upgrades', build: buildUpgrades },
};

export function openSheet(name) {
  if (!app.state) return;
  if (current && current.name === name) {
    closeSheet();
    return;
  }
  closeSheet(true);
  if (app.ui.mode) setMode(null);
  const def = SHEETS[name];
  const layer = document.getElementById('sheet-layer');
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const body = h('div', { class: 'sheet-body' });
  const closeBtn = h(
    'button',
    { class: 'icon-btn small', type: 'button', 'aria-label': 'Close', title: 'Close (Esc)', onclick: () => closeSheet() },
    icon('close'),
  );
  const sheet = h(
    'section',
    { class: 'sheet panel', role: 'dialog', 'aria-label': def.title },
    h('header', { class: 'sheet-head' }, icon(def.icon), h('h2', { text: def.title }), closeBtn),
    body,
  );
  backdrop.addEventListener('pointerdown', () => closeSheet());
  const content = def.build(body);
  layer.append(backdrop, sheet);
  current = { name, sheet, backdrop, update: content.update };
  app.ui.sheet = name;
  audio.play('open');
  content.update();
  refresh('sheet');
}

export function closeSheet(instant = false) {
  if (!current) return;
  const { sheet, backdrop } = current;
  current = null;
  app.ui.sheet = null;
  if (instant) {
    sheet.remove();
    backdrop.remove();
  } else {
    audio.play('close');
    sheet.classList.add('closing');
    backdrop.classList.add('closing');
    setTimeout(() => {
      sheet.remove();
      backdrop.remove();
    }, 180);
  }
  refresh('sheet');
}

export function isSheetOpen() {
  return !!current;
}

subscribe((reason) => {
  if (current && reason !== 'sheet') current.update();
});

// Wire an actionButton so that unavailable clicks explain themselves.
function wire(btn) {
  btn.addEventListener('unavailable', (e) => explain(e.detail));
  return btn;
}

function sectionTitle(text, aside) {
  return h('div', { class: 'section-title' }, h('h3', { text }), aside || null);
}

// Rebuild a list only when its structure changes; otherwise update in place.
function keyedList(container, getKeys, buildItem) {
  let key = '';
  let items = [];
  return () => {
    const keys = getKeys();
    const next = keys.join('|');
    if (next !== key) {
      const firstBuild = key === '';
      const old = new Set(key.split('|'));
      key = next;
      clear(container);
      items = keys.map((k) => {
        const item = buildItem(k, !firstBuild && !old.has(k));
        container.append(item.el);
        return item;
      });
    }
    items.forEach((it) => it.update());
  };
}

// ----- Market ----------------------------------------------------------------

function buildMarket(body) {
  const sellList = h('div');
  const rows = ITEM_IDS.map((id) => {
    const item = ITEMS[id];
    const sub = h('div', { class: 'sub' });
    const sellOne = wire(
      actionButton({
        label: 'Sell 1',
        kind: 'btn-secondary',
        small: true,
        check: () => A.checkSell(app.state, id, 1),
        onClick: () => act('sellItem', id, 1),
      }),
    );
    const sellTen = wire(
      actionButton({
        label: 'Sell 10',
        kind: 'btn-secondary',
        small: true,
        check: () => A.checkSell(app.state, id, 10),
        onClick: () => act('sellItem', id, 10),
      }),
    );
    const sellAll = wire(
      actionButton({
        label: 'Sell all',
        kind: 'btn-honey',
        small: true,
        check: () => A.checkSell(app.state, id, Math.max(1, app.state.inventory[id])),
        onClick: () => act('sellItem', id, app.state.inventory[id]),
      }),
    );
    const el = h(
      'div',
      { class: 'sell-row' },
      icon(id),
      h('div', {}, h('div', { class: 'name', text: item.plural }), sub),
      h('div', { class: 'sell-buttons' }, sellOne, sellTen, sellAll),
    );
    sellList.append(el);
    let lastAll = -1;
    return {
      id,
      update() {
        const s = app.state;
        const visible = itemVisible(s, id);
        if (el.hidden === visible) el.hidden = !visible;
        if (!visible) return;
        const have = s.inventory[id];
        setText(sub, `You have ${fmt(have)} · ${item.value} Acorns each`);
        sellOne.update();
        sellTen.update();
        sellAll.update();
        if (have !== lastAll) {
          lastAll = have;
          sellAll.setLabel(have > 0 ? ['Sell all', price(have * item.value)] : 'Sell all');
        }
        const focus = tutorialFocus();
        toggleClass(sellAll, 'tutorial-pulse', focus.button === 'market' && id === 'mossFiber' && have > 0 && !s.stats.sold.mossFiber && !s.stats.ordersCompleted);
      },
    };
  });

  const swapNote = h('span', { class: 'muted', style: { fontSize: '13px' } });
  const orderGrid = h('div', { class: 'card-grid' });
  const updateOrders = keyedList(
    orderGrid,
    () => app.state.orders.map((o) => o.id),
    (orderId, isNew) => buildOrderCard(orderId, isNew),
  );

  body.append(
    sectionTitle('Orders', swapNote),
    orderGrid,
    h('div', { class: 'section-gap' }),
    sectionTitle('Quick Sell'),
    sellList,
    h('div', { class: 'tip' }, icon('star'), 'Orders pay much more than Quick Sell. Completed orders are replaced by new requests.'),
  );

  return {
    update() {
      rows.forEach((r) => r.update());
      updateOrders();
      const cd = app.state.market.swapCooldown;
      setText(swapNote, cd > 0 ? `New clients in ${Math.ceil(cd)}s` : 'Tap ↻ to swap an order');
    },
  };
}

function buildOrderCard(orderId, isNew) {
  const order = app.state.orders.find((o) => o.id === orderId);
  const item = ITEMS[order.item];
  const barFill = h('i');
  const have = h('span');
  const deliver = wire(
    actionButton({
      label: ['Deliver', price(order.reward)],
      check: () => A.checkDeliver(app.state, orderId),
      onClick: (e) => {
        const r = act('deliverOrder', orderId);
        if (r.ok) {
          confettiAt(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
          toast(`${order.client} is delighted! +${fmt(order.reward)} Acorns`, 'gold', 2800, 'acorn');
        }
      },
    }),
  );
  const cool = h('span', { class: 'cool', hidden: true });
  const swap = h(
    'button',
    {
      class: 'icon-btn small swap-btn',
      type: 'button',
      title: 'Swap for a different order',
      'aria-label': 'Swap for a different order',
      onclick: (e) => {
        e.stopPropagation();
        act('swapOrder', orderId);
      },
    },
    icon('swap'),
    cool,
  );
  const el = h(
    'div',
    { class: `card order-card${isNew ? ' new' : ''}` },
    h('div', { class: 'order-client', text: order.client }),
    h(
      'div',
      { class: 'order-want' },
      icon(order.item),
      h('div', {}, h('div', { class: 'qty', text: `${order.qty} ${order.qty === 1 ? item.name : item.plural}` }), h('div', { class: 'muted', style: { fontSize: '13px' } }, `Worth ${fmt(order.qty * item.value)} at Quick Sell`)),
    ),
    h('div', { class: 'order-progress' }, h('div', { class: 'bar' }, barFill), have),
    h('div', { class: 'order-actions' }, deliver, swap),
  );
  return {
    el,
    update() {
      const s = app.state;
      const n = s.inventory[order.item];
      barFill.style.width = `${Math.min(100, (n / order.qty) * 100)}%`;
      setText(have, `${fmt(Math.min(n, order.qty))}/${order.qty}`);
      const ready = deliver.update().ok;
      toggleClass(el, 'ready', ready);
      toggleClass(deliver, 'tutorial-pulse', ready && tutorialFocus().button === 'market');
      const cd = s.market.swapCooldown;
      cool.hidden = cd <= 0;
      if (cd > 0) setText(cool, Math.ceil(cd));
      swap.style.opacity = cd > 0 ? '0.55' : '1';
    },
  };
}

// ----- Creatures -------------------------------------------------------------

function portrait(speciesId, cls = 'portrait') {
  return h('img', { class: cls, src: creaturePortrait(speciesId), alt: SPECIES[speciesId].name, draggable: 'false' });
}

function speciesInfo(id) {
  const sp = SPECIES[id];
  if (sp.produces) {
    const secs = app.state ? productionInterval(app.state, id) : sp.produces.interval;
    return `Makes 1 ${ITEMS[sp.produces.item].name} every ${secs.toFixed(1)}s at a ${STATIONS[sp.station].name}.`;
  }
  if (sp.crafts) {
    const r = RECIPES.nectarWeave;
    return `Heats a ${STATIONS[sp.station].name}: ${r.inputs.mossFiber} Moss Fiber + ${r.inputs.nectarDrop} Nectar Drops → ${ITEMS[r.output.item].name}.`;
  }
  return '';
}

function buildCreatures(body) {
  const crewCount = h('span', { class: 'muted', style: { fontSize: '14px' } });
  const crewList = h('div', { class: 'mini-list' });
  const updateCrew = keyedList(
    crewList,
    () => app.state.creatures.map((c) => `${c.id}:${c.name}`),
    (key) => buildCrewRow(key.split(':')[0]),
  );

  const hireGrid = h('div', { class: 'card-grid' });
  const hireCards = SPECIES_IDS.map((id) => {
    const sp = SPECIES[id];
    const info = h('p');
    const lockNote = h('div', { class: 'lock-note' }, icon('lock'), h('span', { text: sp.lockedHint }));
    const btn = wire(
      actionButton({
        label: 'Hire',
        check: () => A.checkHire(app.state, id),
        onClick: () => {
          const r = act('hireCreature', id);
          if (r.ok) {
            const station = STATIONS[sp.station].name;
            toast(
              r.station
                ? `${r.creature.name} the ${sp.name} joined your crew and got to work!`
                : `${r.creature.name} the ${sp.name} joined your crew! Build a ${station} for it.`,
              'good',
              3400,
            );
          }
        },
      }),
    );
    const card = h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-top' },
        portrait(id, 'card-art'),
        h(
          'div',
          {},
          h('h3', { text: sp.name }),
          h('span', { class: `tag ${sp.crafts ? 'ember' : id === 'nectabee' ? 'honey' : 'leaf'}`, text: sp.role }),
        ),
      ),
      h('p', { text: sp.blurb }),
      info,
      lockNote,
      btn,
    );
    hireGrid.append(card);
    let lastPrice = -1;
    return () => {
      const s = app.state;
      const unlocked = isUnlocked(s, sp.unlock);
      toggleClass(card, 'locked', !unlocked);
      lockNote.hidden = unlocked;
      setText(info, speciesInfo(id));
      const p = hirePrice(s, id);
      if (p !== lastPrice) {
        lastPrice = p;
        btn.setLabel(['Hire', price(p)]);
      }
      btn.update();
      const focus = tutorialFocus();
      toggleClass(btn, 'tutorial-pulse', focus.button === 'creatures' && unlocked && !s.creatures.some((c) => c.species === id) && id !== 'mosslet');
    };
  });

  body.append(
    sectionTitle('Your crew', crewCount),
    crewList,
    h('div', { class: 'section-gap' }),
    sectionTitle('Hire creatures'),
    hireGrid,
    h('div', { class: 'tip' }, icon('star'), 'Tip: drag a creature onto a station in your workshop to put it to work.'),
  );

  return {
    update() {
      const s = app.state;
      setText(crewCount, `${s.creatures.length} of ${crewLimit(s)} spaces used`);
      updateCrew();
      hireCards.forEach((u) => u());
    },
  };
}

function buildCrewRow(creatureId) {
  const c = app.state.creatures.find((x) => x.id === creatureId);
  const sp = SPECIES[c.species];
  const job = h('div', { class: 'sub' });
  const find = h(
    'button',
    {
      class: 'btn btn-secondary btn-small',
      type: 'button',
      onclick: () => {
        closeSheet();
        select({ kind: 'creature', id: creatureId });
      },
    },
    'Find',
  );
  const assign = h(
    'button',
    {
      class: 'btn btn-primary btn-small',
      type: 'button',
      onclick: () => {
        const s = app.state;
        const anywhere = s.stations.some((st) => canOperate(c.species, st.type) && st.id !== c.stationId);
        if (!anywhere) {
          toast(`Build a ${STATIONS[sp.station].name} first.`, 'warn');
          audio.play('error');
          return;
        }
        closeSheet();
        select({ kind: 'creature', id: creatureId });
        setMode({ type: 'assign', creatureId });
      },
    },
    'Assign',
  );
  const rest = h(
    'button',
    { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => act('unassignCreature', creatureId) },
    'Rest',
  );
  const el = h(
    'div',
    { class: 'mini-row' },
    portrait(c.species),
    h('div', { class: 'grow' }, h('div', { class: 'name', text: c.name }), h('div', { class: 'sub', text: `${sp.name} · ${sp.role}` }), job),
    find,
    rest,
    assign,
  );
  return {
    el,
    update() {
      const creature = app.state.creatures.find((x) => x.id === creatureId);
      if (!creature) return;
      const j = creatureJob(app.state, creature);
      setText(job, j.label);
      rest.hidden = !j.assigned;
      setText(assign, j.assigned ? 'Move' : 'Assign');
    },
  };
}

// ----- Build -------------------------------------------------------------------

const stationArtCache = new Map();

function stationArt(type) {
  if (!stationArtCache.has(type)) {
    const size = 96;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    drawStation(ctx, type, size / 2, size * 0.54, size / 118, { t: 0.5, fill: type === 'storage' ? { mossFiber: 0.5, nectarDrop: 0.4 } : {} });
    stationArtCache.set(type, canvas.toDataURL('image/png'));
  }
  return stationArtCache.get(type);
}

function buildBuild(body) {
  const grid = h('div', { class: 'card-grid' });
  const cards = STATION_IDS.map((type) => {
    const def = STATIONS[type];
    const owned = h('span', { class: 'tag' });
    const lockNote = h('div', { class: 'lock-note' }, icon('lock'), h('span', { text: def.lockedHint }));
    const btn = wire(
      actionButton({
        label: 'Build',
        check: () => A.checkBuild(app.state, type),
        onClick: () => {
          closeSheet();
          setMode({ type: 'place', stationType: type });
        },
      }),
    );
    const card = h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-top' },
        h('img', { class: 'card-art', src: stationArt(type), alt: '', draggable: 'false' }),
        h('div', {}, h('h3', { text: def.name }), owned),
      ),
      h('p', { text: def.blurb }),
      lockNote,
      btn,
    );
    grid.append(card);
    let lastPrice = -1;
    return () => {
      const s = app.state;
      const unlocked = isUnlocked(s, def.unlock);
      toggleClass(card, 'locked', !unlocked);
      lockNote.hidden = unlocked;
      setText(owned, `You have ${countStations(s, type)}`);
      const p = buildPrice(s, type);
      if (p !== lastPrice) {
        lastPrice = p;
        btn.setLabel(['Build', price(p)]);
      }
      btn.update();
      const focus = tutorialFocus();
      const wanted =
        focus.button === 'build' &&
        ((type === 'gathering' && s.creatures.some((c) => c.species === 'nectabee' && !c.stationId)) ||
          (type === 'crafting' && countStations(s, 'crafting') === 0));
      toggleClass(btn, 'tutorial-pulse', wanted && unlocked);
    };
  });
  body.append(
    grid,
    h('div', { class: 'tip' }, icon('star'), 'Tip: drag any station to rearrange your workshop. Creatures and resources move safely with it.'),
  );
  return { update: () => cards.forEach((u) => u()) };
}

// ----- Upgrades ------------------------------------------------------------------

function buildUpgrades(body) {
  const grid = h('div', { class: 'card-grid' });
  const cards = UPGRADE_IDS.map((id) => {
    const def = UPGRADES[id];
    const pips = h('div', { class: 'pips' });
    for (let i = 0; i < maxLevel(id); i++) pips.append(h('i'));
    const now = h('span', { class: 'now' });
    const next = h('span', { class: 'next' });
    const btn = wire(
      actionButton({
        label: 'Upgrade',
        check: () => A.checkUpgrade(app.state, id),
        onClick: () => {
          const r = act('buyUpgrade', id);
          if (r.ok) toast(`${def.name} is now level ${r.level}! ${def.describe(r.level)}.`, 'good', 3200, def.icon);
        },
      }),
    );
    const card = h(
      'div',
      { class: 'card' },
      h('div', { class: 'card-top' }, h('img', { class: 'card-art', src: iconSrc(def.icon), alt: '', style: { padding: '12px' } }), h('div', {}, h('h3', { text: def.name }), pips)),
      h('p', { text: def.blurb }),
      h('div', { class: 'effect' }, now, next),
      btn,
    );
    grid.append(card);
    let lastLevel = -1;
    return () => {
      const s = app.state;
      const level = s.upgrades[id];
      if (level !== lastLevel) {
        lastLevel = level;
        [...pips.children].forEach((p, i) => toggleClass(p, 'on', i < level));
        setText(now, `Now: ${def.describe(level)}`);
        const cost = upgradeCost(s, id);
        if (cost === null) {
          setText(next, 'Fully upgraded!');
          btn.setLabel('Maxed out');
        } else {
          setText(next, `Next: ${def.describe(level + 1)}`);
          btn.setLabel(['Upgrade', price(cost)]);
        }
      }
      btn.update();
      toggleClass(btn, 'tutorial-pulse', tutorialFocus().button === 'upgrades' && btn.update().ok);
    };
  });
  body.append(grid);
  return { update: () => cards.forEach((u) => u()) };
}

function iconSrc(name) {
  return icon(name).src;
}

// Exposed for the inspector's "assign here" lists.
export { portrait, occupantOf };
