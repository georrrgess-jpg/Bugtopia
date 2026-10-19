// Workshop upgrades. `costs[i]` is the price to go from level i to level i + 1,
// so maxLevel === costs.length.

export const EFFICIENCY_PER_LEVEL = 0.15;

// Capacity of a single Storage Crate (per resource) at each Storage Capacity level.
export const CRATE_CAPACITY = [25, 40, 60, 85, 115, 150];

// Workshop bounds (inclusive tile coordinates) for each expansion level.
// The workshop grows outward around the original 5x5 floor, so station
// coordinates never need to shift.
export const WORKSHOP_BOUNDS = [
  { minX: 0, minY: 0, maxX: 4, maxY: 4 },
  { minX: 0, minY: 0, maxX: 5, maxY: 4 },
  { minX: 0, minY: 0, maxX: 5, maxY: 5 },
  { minX: -1, minY: 0, maxX: 5, maxY: 5 },
  { minX: -1, minY: -1, maxX: 5, maxY: 5 },
  { minX: -1, minY: -1, maxX: 6, maxY: 5 },
  { minX: -1, minY: -1, maxX: 6, maxY: 6 },
];

export const BASE_CREW_LIMIT = 4;
export const CREW_PER_EXPANSION = 2;

export const UPGRADES = {
  efficiency: {
    id: 'efficiency',
    name: 'Production Efficiency',
    icon: 'gear',
    blurb: 'Gatherers work faster.',
    costs: [80, 180, 360, 650, 1100],
    describe(level) {
      return level === 0 ? 'Normal gathering speed' : `+${Math.round(level * EFFICIENCY_PER_LEVEL * 100)}% gathering speed`;
    },
  },
  storage: {
    id: 'storage',
    name: 'Storage Capacity',
    icon: 'crate',
    blurb: 'Every Storage Crate holds more.',
    costs: [60, 150, 320, 600, 1000],
    describe(level) {
      return `${CRATE_CAPACITY[level]} of each resource per crate`;
    },
  },
  expansion: {
    id: 'expansion',
    name: 'Workshop Expansion',
    icon: 'expand',
    blurb: 'Dig out new floor tiles and make room for more creatures.',
    costs: [150, 300, 550, 900, 1400, 2100],
    describe(level) {
      const b = WORKSHOP_BOUNDS[level];
      const w = b.maxX - b.minX + 1;
      const h = b.maxY - b.minY + 1;
      return `${w}×${h} floor · room for ${BASE_CREW_LIMIT + level * CREW_PER_EXPANSION} creatures`;
    },
  },
};

export const UPGRADE_IDS = Object.keys(UPGRADES);

export function maxLevel(upgradeId) {
  return UPGRADES[upgradeId].costs.length;
}
