// Every player action. Each `check*` function validates without mutating and
// returns { ok, reason }; the matching action re-validates before changing
// anything, so repeated or stale clicks can never corrupt the state.

import { ITEMS } from '../data/items.js';
import { SPECIES } from '../data/species.js';
import { STATIONS } from '../data/stations.js';
import { UPGRADES } from '../data/upgrades.js';
import { ORDER_SWAP_COOLDOWN } from '../config.js';
import { emit } from './events.js';
import { fillOrders, generateOrder } from './orders.js';
import { addCreature, addStation } from './state.js';
import {
  buildPrice,
  canOperate,
  crewLimit,
  freeTiles,
  getCreature,
  getStation,
  hirePrice,
  inBounds,
  isUnlocked,
  occupantOf,
  stationAt,
  upgradeCost,
} from './rules.js';

const OK = { ok: true };
const fail = (reason) => ({ ok: false, reason });

const fmt = (n) => Math.floor(n).toLocaleString('en-US');

function needAcorns(state, price) {
  return state.acorns >= price ? null : `You need ${fmt(price - state.acorns)} more Acorns.`;
}

function spend(state, amount) {
  state.acorns -= amount;
  state.stats.acornsSpent += amount;
  emit('acorns', { delta: -amount });
}

function earn(state, amount) {
  state.acorns += amount;
  state.stats.acornsEarned += amount;
  emit('acorns', { delta: amount });
}

function resetGathering(station) {
  if (station && station.type === 'gathering') station.progress = 0;
}

// ----- Creatures ---------------------------------------------------------

export function checkAssign(state, creatureId, stationId) {
  const creature = getCreature(state, creatureId);
  const station = getStation(state, stationId);
  if (!creature || !station) return fail('That creature or station no longer exists.');
  if (station.type === 'storage') return fail('Storage Crates just hold things — no creature needed.');
  if (!canOperate(creature.species, station.type)) {
    const species = SPECIES[creature.species];
    return fail(`${species.name}s can only work at ${STATIONS[species.station].name}s.`);
  }
  if (creature.stationId === stationId) return fail(`${creature.name} already works here.`);
  return OK;
}

export function assignCreature(state, creatureId, stationId) {
  const check = checkAssign(state, creatureId, stationId);
  if (!check.ok) return check;
  const creature = getCreature(state, creatureId);
  const station = getStation(state, stationId);
  const previousStation = creature.stationId ? getStation(state, creature.stationId) : null;
  const displaced = occupantOf(state, stationId);

  // A station holds one creature. Whoever was there swaps into the newcomer's
  // old station if they can work it, otherwise they take a break.
  if (displaced) {
    displaced.stationId =
      previousStation && canOperate(displaced.species, previousStation.type) ? previousStation.id : null;
  }
  creature.stationId = station.id;
  resetGathering(station);
  resetGathering(previousStation);

  emit('assigned', { creatureId, stationId, displacedId: displaced?.id || null });
  return { ok: true, displaced };
}

export function unassignCreature(state, creatureId) {
  const creature = getCreature(state, creatureId);
  if (!creature) return fail('That creature no longer exists.');
  if (!creature.stationId) return fail(`${creature.name} is already resting.`);
  const station = getStation(state, creature.stationId);
  creature.stationId = null;
  resetGathering(station);
  emit('unassigned', { creatureId, stationId: station?.id || null });
  return OK;
}

export function checkHire(state, speciesId) {
  const species = SPECIES[speciesId];
  if (!species) return fail('Unknown creature.');
  if (!isUnlocked(state, species.unlock)) return fail(species.lockedHint || 'Not unlocked yet.');
  const limit = crewLimit(state);
  if (state.creatures.length >= limit) {
    return fail(`Your workshop has room for ${limit} creatures. Expand it to make room.`);
  }
  const price = hirePrice(state, speciesId);
  const short = needAcorns(state, price);
  return short ? fail(short) : { ok: true, price };
}

export function hireCreature(state, speciesId) {
  const check = checkHire(state, speciesId);
  if (!check.ok) return check;
  spend(state, check.price);
  const creature = addCreature(state, speciesId);

  // Helpful default: start work immediately if a matching station is free.
  const species = SPECIES[speciesId];
  const freeStation = state.stations.find((s) => s.type === species.station && !occupantOf(state, s.id));
  if (freeStation) {
    creature.stationId = freeStation.id;
    resetGathering(freeStation);
  }
  emit('hired', { creatureId: creature.id, stationId: creature.stationId, price: check.price });
  return { ok: true, creature, station: freeStation || null };
}

export function renameCreature(state, creatureId, rawName) {
  const creature = getCreature(state, creatureId);
  if (!creature) return fail('That creature no longer exists.');
  const name = String(rawName ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .trim()
    .slice(0, 16);
  if (!name) return fail('Names need at least one letter.');
  creature.name = name;
  emit('renamed', { creatureId });
  return OK;
}

// ----- Stations ----------------------------------------------------------

export function checkBuild(state, type, x, y) {
  const def = STATIONS[type];
  if (!def) return fail('Unknown station.');
  if (!isUnlocked(state, def.unlock)) return fail(def.lockedHint || 'Not unlocked yet.');
  if (freeTiles(state).length === 0) return fail('No free tiles. Expand your workshop or move things around.');
  if (x !== undefined) {
    if (!inBounds(state, x, y)) return fail("That spot isn't part of your workshop yet.");
    if (stationAt(state, x, y)) return fail('Something is already built there.');
  }
  const price = buildPrice(state, type);
  const short = needAcorns(state, price);
  return short ? fail(short) : { ok: true, price };
}

export function buildStation(state, type, x, y) {
  if (x === undefined || y === undefined) return fail('Choose a tile first.');
  const check = checkBuild(state, type, x, y);
  if (!check.ok) return check;
  spend(state, check.price);
  const station = addStation(state, type, x, y);

  let worker = null;
  if (type !== 'storage') {
    worker = state.creatures.find((c) => !c.stationId && canOperate(c.species, type)) || null;
    if (worker) worker.stationId = station.id;
  }
  emit('built', { stationId: station.id, price: check.price, workerId: worker?.id || null });
  return { ok: true, station, worker };
}

export function checkMove(state, stationId, x, y) {
  const station = getStation(state, stationId);
  if (!station) return fail('That station no longer exists.');
  if (!inBounds(state, x, y)) return fail("That spot isn't part of your workshop yet.");
  const other = stationAt(state, x, y);
  if (other && other.id !== stationId) return fail('Something is already built there.');
  return OK;
}

export function moveStation(state, stationId, x, y) {
  const check = checkMove(state, stationId, x, y);
  if (!check.ok) return check;
  const station = getStation(state, stationId);
  if (station.x === x && station.y === y) return { ok: true, unchanged: true };
  const from = { x: station.x, y: station.y };
  station.x = x;
  station.y = y;
  emit('moved', { stationId, from, to: { x, y } });
  return OK;
}

export function toggleCrafting(state, stationId) {
  const station = getStation(state, stationId);
  if (!station || station.type !== 'crafting') return fail('Only Crafting Stations can be paused.');
  station.enabled = !station.enabled;
  emit('craftToggled', { stationId, enabled: station.enabled });
  return { ok: true, enabled: station.enabled };
}

// ----- Market ------------------------------------------------------------

export function checkSell(state, itemId, qty) {
  const item = ITEMS[itemId];
  if (!item) return fail('Unknown item.');
  if (!Number.isInteger(qty) || qty < 1) return fail('Nothing to sell.');
  const have = state.inventory[itemId] || 0;
  if (have <= 0) return fail(`You don't have any ${item.plural}.`);
  if (have < qty) return fail(`You only have ${have} ${have === 1 ? item.name : item.plural}.`);
  return OK;
}

export function sellItem(state, itemId, qty) {
  const check = checkSell(state, itemId, qty);
  if (!check.ok) return check;
  const value = qty * ITEMS[itemId].value;
  state.inventory[itemId] -= qty;
  state.stats.sold[itemId] += qty;
  earn(state, value);
  emit('sold', { item: itemId, qty, value });
  return { ok: true, value };
}

export function checkDeliver(state, orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return fail('That order is no longer available.');
  const have = state.inventory[order.item] || 0;
  if (have < order.qty) {
    const missing = order.qty - have;
    return fail(`You need ${missing} more ${missing === 1 ? ITEMS[order.item].name : ITEMS[order.item].plural}.`);
  }
  return OK;
}

export function deliverOrder(state, orderId) {
  const check = checkDeliver(state, orderId);
  if (!check.ok) return check;
  const index = state.orders.findIndex((o) => o.id === orderId);
  const order = state.orders[index];
  // Remove the order before paying out, so it can only ever be rewarded once.
  state.orders.splice(index, 1);
  state.inventory[order.item] -= order.qty;
  state.stats.ordersCompleted += 1;
  earn(state, order.reward);
  state.orders.splice(index, 0, generateOrder(state));
  fillOrders(state);
  emit('orderDelivered', { order });
  emit('ordersChanged');
  return { ok: true, order };
}

export function checkSwap(state, orderId) {
  if (!state.orders.some((o) => o.id === orderId)) return fail('That order is no longer available.');
  if (state.market.swapCooldown > 0) {
    return fail(`New clients arrive in ${Math.ceil(state.market.swapCooldown)}s.`);
  }
  return OK;
}

export function swapOrder(state, orderId) {
  const check = checkSwap(state, orderId);
  if (!check.ok) return check;
  const index = state.orders.findIndex((o) => o.id === orderId);
  state.orders.splice(index, 1, generateOrder(state));
  state.market.swapCooldown = ORDER_SWAP_COOLDOWN;
  emit('ordersChanged');
  return OK;
}

// ----- Upgrades ----------------------------------------------------------

export function checkUpgrade(state, upgradeId) {
  if (!UPGRADES[upgradeId]) return fail('Unknown upgrade.');
  const cost = upgradeCost(state, upgradeId);
  if (cost === null) return fail('Already at the maximum level.');
  const short = needAcorns(state, cost);
  return short ? fail(short) : { ok: true, price: cost };
}

export function buyUpgrade(state, upgradeId) {
  const check = checkUpgrade(state, upgradeId);
  if (!check.ok) return check;
  spend(state, check.price);
  state.upgrades[upgradeId] += 1;
  state.stats.upgradesBought += 1;
  emit('upgraded', { upgradeId, level: state.upgrades[upgradeId], price: check.price });
  return { ok: true, level: state.upgrades[upgradeId] };
}
