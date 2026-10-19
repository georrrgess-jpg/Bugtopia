// Workshop stations. All Phase 1 stations occupy a single tile.
//
// starting: how many the player begins with (these do not raise later prices).
// unlock:   key in state.unlocks required before building (null = always).

export const STATIONS = {
  gathering: {
    id: 'gathering',
    name: 'Gathering Station',
    blurb: 'A planter where a Mosslet or Nectabee gathers raw resources.',
    cost: { base: 50, growth: 1.5 },
    starting: 1,
    unlock: null,
    lockedHint: '',
  },
  crafting: {
    id: 'crafting',
    name: 'Crafting Station',
    blurb: 'A cosy kiln-loom. An Emberpup heats it to turn raw resources into products.',
    cost: { base: 120, growth: 1.6 },
    starting: 0,
    unlock: 'crafting',
    lockedHint: 'Collect your first Nectar Drop to unlock.',
  },
  storage: {
    id: 'storage',
    name: 'Storage Crate',
    blurb: 'Every crate adds room for more of each resource.',
    cost: { base: 60, growth: 1.6 },
    starting: 1,
    unlock: null,
    lockedHint: '',
  },
};

export const STATION_IDS = Object.keys(STATIONS);

// Crafting recipes. Phase 1 has a single recipe, but stations reference
// recipes by id so more can be added later.
export const RECIPES = {
  nectarWeave: {
    id: 'nectarWeave',
    station: 'crafting',
    inputs: { mossFiber: 3, nectarDrop: 2 },
    output: { item: 'nectarWeave', qty: 1 },
    time: 10,
  },
};

export const DEFAULT_RECIPE = 'nectarWeave';
