// Creating a fresh game and adding entities to it.

import { GAME_ID, SAVE_VERSION } from '../config.js';
import { ITEM_IDS } from '../data/items.js';
import { SPECIES } from '../data/species.js';
import { DEFAULT_RECIPE } from '../data/stations.js';
import { UPGRADE_IDS } from '../data/upgrades.js';
import { fillOrders } from './orders.js';
import { random } from './rng.js';

export const STARTING_ACORNS = 100;

function emptyItemMap() {
  return Object.fromEntries(ITEM_IDS.map((id) => [id, 0]));
}

export function createEmptyState(seed = Date.now()) {
  return {
    gameId: GAME_ID,
    version: SAVE_VERSION,
    createdAt: Date.now(),
    acorns: STARTING_ACORNS,
    inventory: emptyItemMap(),
    creatures: [],
    stations: [],
    upgrades: Object.fromEntries(UPGRADE_IDS.map((id) => [id, 0])),
    unlocks: { nectabee: false, emberpup: false, crafting: false },
    milestones: [],
    orders: [],
    market: { swapCooldown: 0, storyIssued: [] },
    stats: {
      produced: emptyItemMap(),
      crafted: emptyItemMap(),
      sold: emptyItemMap(),
      acornsEarned: 0,
      acornsSpent: 0,
      ordersCompleted: 0,
      upgradesBought: 0,
      playTime: 0,
    },
    nextId: 1,
    rng: seed >>> 0,
  };
}

export function createNewGame(seed = Date.now()) {
  const state = createEmptyState(seed);
  addStation(state, 'gathering', 1, 2);
  addStation(state, 'storage', 3, 1);
  // The starting Mosslet begins unassigned: placing it is the first tutorial step.
  addCreature(state, 'mosslet');
  fillOrders(state);
  return state;
}

export function addStation(state, type, x, y) {
  const station = { id: `s${state.nextId++}`, type, x, y };
  if (type === 'gathering') station.progress = 0;
  if (type === 'crafting') {
    station.recipe = DEFAULT_RECIPE;
    station.progress = 0;
    station.active = false;
    station.enabled = true;
  }
  state.stations.push(station);
  return station;
}

export function pickCreatureName(state, speciesId) {
  const names = SPECIES[speciesId].names;
  const used = new Set(state.creatures.map((c) => c.name));
  const free = names.filter((n) => !used.has(n));
  if (free.length) return free[Math.floor(random(state) * free.length)];
  // Every name taken: add a numeric suffix.
  let n = 2;
  while (used.has(`${names[0]} ${n}`)) n++;
  return `${names[0]} ${n}`;
}

export function addCreature(state, speciesId) {
  const creature = {
    id: `c${state.nextId++}`,
    species: speciesId,
    name: pickCreatureName(state, speciesId),
    stationId: null,
  };
  state.creatures.push(creature);
  return creature;
}
