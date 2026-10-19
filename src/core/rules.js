// Pure, read-only game rules: lookups, prices, capacities and station status.
// Nothing in this file mutates state.

import { ITEMS } from '../data/items.js';
import { SPECIES } from '../data/species.js';
import { STATIONS, RECIPES } from '../data/stations.js';
import {
  UPGRADES,
  CRATE_CAPACITY,
  WORKSHOP_BOUNDS,
  EFFICIENCY_PER_LEVEL,
  BASE_CREW_LIMIT,
  CREW_PER_EXPANSION,
} from '../data/upgrades.js';

export const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);

// ----- Lookups -----------------------------------------------------------

export function getStation(state, id) {
  return state.stations.find((s) => s.id === id) || null;
}

export function getCreature(state, id) {
  return state.creatures.find((c) => c.id === id) || null;
}

export function stationAt(state, x, y) {
  return state.stations.find((s) => s.x === x && s.y === y) || null;
}

export function occupantOf(state, stationId) {
  return state.creatures.find((c) => c.stationId === stationId) || null;
}

export function canOperate(speciesId, stationType) {
  const species = SPECIES[speciesId];
  return !!species && species.station === stationType;
}

export function countSpecies(state, speciesId) {
  return state.creatures.filter((c) => c.species === speciesId).length;
}

export function countStations(state, type) {
  return state.stations.filter((s) => s.type === type).length;
}

export function isUnlocked(state, key) {
  return key == null || !!state.unlocks[key];
}

// ----- Workshop layout ---------------------------------------------------

export function getBounds(state) {
  return WORKSHOP_BOUNDS[Math.min(state.upgrades.expansion, WORKSHOP_BOUNDS.length - 1)];
}

export function inBounds(state, x, y) {
  const b = getBounds(state);
  return Number.isInteger(x) && Number.isInteger(y) && x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

export function isTileFree(state, x, y, ignoreStationId = null) {
  if (!inBounds(state, x, y)) return false;
  const s = stationAt(state, x, y);
  return !s || s.id === ignoreStationId;
}

export function freeTiles(state) {
  const b = getBounds(state);
  const tiles = [];
  for (let y = b.minY; y <= b.maxY; y++) {
    for (let x = b.minX; x <= b.maxX; x++) {
      if (!stationAt(state, x, y)) tiles.push({ x, y });
    }
  }
  return tiles;
}

export function crewLimit(state) {
  return BASE_CREW_LIMIT + state.upgrades.expansion * CREW_PER_EXPANSION;
}

// ----- Economy -----------------------------------------------------------

export function capacityPerItem(state) {
  const crates = Math.max(1, countStations(state, 'storage'));
  return CRATE_CAPACITY[Math.min(state.upgrades.storage, CRATE_CAPACITY.length - 1)] * crates;
}

export function freeSpace(state, itemId) {
  return Math.max(0, capacityPerItem(state) - (state.inventory[itemId] || 0));
}

export function efficiencyMultiplier(state) {
  return 1 + state.upgrades.efficiency * EFFICIENCY_PER_LEVEL;
}

export function productionInterval(state, speciesId) {
  const produces = SPECIES[speciesId]?.produces;
  if (!produces) return null;
  return produces.interval / efficiencyMultiplier(state);
}

export function hirePrice(state, speciesId) {
  const { base, growth } = SPECIES[speciesId].cost;
  return round5(base * Math.pow(growth, countSpecies(state, speciesId)));
}

export function buildPrice(state, type) {
  const def = STATIONS[type];
  const bought = Math.max(0, countStations(state, type) - def.starting);
  return round5(def.cost.base * Math.pow(def.cost.growth, bought));
}

export function upgradeCost(state, upgradeId) {
  const level = state.upgrades[upgradeId];
  const costs = UPGRADES[upgradeId].costs;
  return level < costs.length ? costs[level] : null;
}

// An item is "obtainable" when the player owns, or could hire, a creature
// able to produce it. Orders only ever request obtainable items.
export function itemObtainable(state, itemId) {
  if (itemId === 'mossFiber') return true;
  if (itemId === 'nectarDrop') return isUnlocked(state, 'nectabee');
  if (itemId === 'nectarWeave') return isUnlocked(state, 'crafting') && isUnlocked(state, 'emberpup');
  return false;
}

// Items the player has encountered, used to decide what to show in the HUD.
export function itemVisible(state, itemId) {
  return itemObtainable(state, itemId) || (state.inventory[itemId] || 0) > 0;
}

// ----- Station status ----------------------------------------------------

// Returns a description of what a station is doing right now, used by both
// the simulation (to decide whether to progress) and the UI.
//   code:  machine-readable state
//   label: short player-facing text
//   tone:  'ok' | 'warn' | 'idle'
export function stationStatus(state, station) {
  const creature = occupantOf(state, station.id);

  if (station.type === 'storage') {
    return { code: 'storage', label: `Holds ${capacityPerItem(state) / Math.max(1, countStations(state, 'storage'))} of each resource`, tone: 'ok' };
  }

  if (station.type === 'gathering') {
    if (!creature) return { code: 'empty', label: 'Needs a gatherer', tone: 'idle' };
    const species = SPECIES[creature.species];
    if (!canOperate(creature.species, 'gathering') || !species.produces) {
      return { code: 'invalid', label: `${species?.name || 'This creature'} can't gather`, tone: 'warn' };
    }
    const item = species.produces.item;
    if (freeSpace(state, item) <= 0) {
      return { code: 'full', label: `Storage full of ${ITEMS[item].plural}`, tone: 'warn', item };
    }
    return { code: 'working', label: `Gathering ${ITEMS[item].plural}`, tone: 'ok', item };
  }

  if (station.type === 'crafting') {
    const recipe = RECIPES[station.recipe];
    const crafter = creature && canOperate(creature.species, 'crafting') ? creature : null;
    if (station.active) {
      if (!crafter) return { code: 'stalled', label: 'Needs an Emberpup to finish', tone: 'warn' };
      if (station.progress >= 1 && freeSpace(state, recipe.output.item) <= 0) {
        return { code: 'full', label: `Storage full of ${ITEMS[recipe.output.item].plural}`, tone: 'warn' };
      }
      return { code: 'crafting', label: `Crafting ${ITEMS[recipe.output.item].name}`, tone: 'ok' };
    }
    if (!crafter) return { code: 'empty', label: 'Needs an Emberpup', tone: 'idle' };
    if (!station.enabled) return { code: 'paused', label: 'Paused', tone: 'idle' };
    if (freeSpace(state, recipe.output.item) <= 0) {
      return { code: 'full', label: `Storage full of ${ITEMS[recipe.output.item].plural}`, tone: 'warn' };
    }
    const missing = missingInputs(state, recipe);
    if (missing.length) {
      const m = missing[0];
      return {
        code: 'waiting',
        label: `Waiting for ${m.need - m.have} more ${m.need - m.have === 1 ? ITEMS[m.item].name : ITEMS[m.item].plural}`,
        tone: 'warn',
        missing,
      };
    }
    return { code: 'ready', label: 'Ready to craft', tone: 'ok' };
  }

  return { code: 'unknown', label: '', tone: 'idle' };
}

export function missingInputs(state, recipe) {
  const missing = [];
  for (const [item, need] of Object.entries(recipe.inputs)) {
    const have = state.inventory[item] || 0;
    if (have < need) missing.push({ item, need, have });
  }
  return missing;
}

// Short summary of a creature's job for lists and panels.
export function creatureJob(state, creature) {
  const species = SPECIES[creature.species];
  const station = creature.stationId ? getStation(state, creature.stationId) : null;
  if (!station) return { assigned: false, label: 'Resting — no station' };
  if (species.produces) {
    const secs = productionInterval(state, creature.species);
    return {
      assigned: true,
      label: `1 ${ITEMS[species.produces.item].name} every ${secs.toFixed(1)}s`,
    };
  }
  if (species.crafts) {
    const recipe = RECIPES[station.recipe];
    return { assigned: true, label: `Heats the ${STATIONS[station.type].name} (${recipe.time}s per ${ITEMS[recipe.output.item].name})` };
  }
  return { assigned: true, label: STATIONS[station.type].name };
}
