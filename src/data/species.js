// Creature species. Adding a new species should only require a new entry here
// plus a drawing function in render/creatures.js.
//
// station:  which station type the species can operate.
// produces: raw resource output for gathering species (interval in seconds).
// crafts:   true for species that power crafting stations.
// unlock:   key in state.unlocks that must be true before hiring (null = always).

export const SPECIES = {
  mosslet: {
    id: 'mosslet',
    name: 'Mosslet',
    role: 'Gatherer',
    blurb: 'A round, leafy little bug that grows soft Moss Fiber on its shell.',
    station: 'gathering',
    produces: { item: 'mossFiber', interval: 4 },
    cost: { base: 50, growth: 1.6 },
    unlock: null,
    lockedHint: '',
    names: ['Mossy', 'Sprout', 'Clover', 'Fern', 'Pip', 'Lichen', 'Tuft', 'Sorrel', 'Basil', 'Bramble'],
  },
  nectabee: {
    id: 'nectabee',
    name: 'Nectabee',
    role: 'Gatherer',
    blurb: 'A cheerful golden flutterer that collects sweet Nectar Drops.',
    station: 'gathering',
    produces: { item: 'nectarDrop', interval: 6 },
    cost: { base: 150, growth: 1.6 },
    unlock: 'nectabee',
    lockedHint: 'Make your first sale at the Market to unlock.',
    names: ['Honey', 'Buzzby', 'Goldie', 'Dandy', 'Saffron', 'Bumble', 'Marigold', 'Zuzu', 'Clementine', 'Poppy'],
  },
  emberpup: {
    id: 'emberpup',
    name: 'Emberpup',
    role: 'Crafter',
    blurb: 'A warm little salamander whose glowing cheeks power crafting stations.',
    station: 'crafting',
    crafts: true,
    cost: { base: 200, growth: 1.7 },
    unlock: 'emberpup',
    lockedHint: 'Collect your first Nectar Drop to unlock.',
    names: ['Cinder', 'Ember', 'Sparky', 'Toasty', 'Blaze', 'Kindle', 'Flicker', 'Ash', 'Coal', 'Paprika'],
  },
};

export const SPECIES_IDS = Object.keys(SPECIES);
