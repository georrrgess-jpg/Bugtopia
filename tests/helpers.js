import { step } from '../src/core/sim.js';
import { TICK_STEP } from '../src/config.js';

export function run(state, seconds) {
  const steps = Math.round(seconds / TICK_STEP);
  for (let i = 0; i < steps; i++) step(state, TICK_STEP);
}

export function assertInvariants(assert, state) {
  for (const [item, qty] of Object.entries(state.inventory)) {
    assert.ok(Number.isInteger(qty) && qty >= 0, `inventory ${item} = ${qty}`);
  }
  assert.ok(state.acorns >= 0, 'acorns never negative');
  const assigned = state.creatures.filter((c) => c.stationId).map((c) => c.stationId);
  assert.equal(new Set(assigned).size, assigned.length, 'one creature per station');
  const tiles = state.stations.map((s) => `${s.x},${s.y}`);
  assert.equal(new Set(tiles).size, tiles.length, 'no overlapping stations');
}
