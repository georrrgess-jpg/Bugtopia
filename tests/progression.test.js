// Plays through the whole intended Phase 1 loop with a simple scripted
// player, checking invariants along the way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame } from '../src/core/state.js';
import * as A from '../src/core/actions.js';
import { freeTiles, occupantOf } from '../src/core/rules.js';
import { currentMilestone } from '../src/core/sim.js';
import { MILESTONES } from '../src/data/milestones.js';
import { run, assertInvariants } from './helpers.js';

function build(s, type) {
  const t = freeTiles(s)[0];
  return A.buildStation(s, type, t.x, t.y);
}

// One "decision" per in-game second, roughly how a sensible player behaves.
function think(s) {
  for (const o of s.orders) if (A.checkDeliver(s, o.id).ok) A.deliverOrder(s, o.id);
  const reserve = s.unlocks.crafting ? { mossFiber: 6, nectarDrop: 4 } : { mossFiber: 0, nectarDrop: 0 };
  for (const item of ['mossFiber', 'nectarDrop', 'nectarWeave']) {
    const extra = s.inventory[item] - (reserve[item] || 0) - 12;
    if (extra > 0) A.sellItem(s, item, extra);
  }
  if (s.stats.produced.mossFiber >= 5 && s.stats.sold.mossFiber === 0 && s.inventory.mossFiber > 0) {
    A.sellItem(s, 'mossFiber', s.inventory.mossFiber);
  }
  const has = (sp) => s.creatures.some((c) => c.species === sp);
  if (s.unlocks.nectabee && !has('nectabee')) {
    if (!s.stations.some((st) => st.type === 'gathering' && !occupantOf(s, st.id))) build(s, 'gathering');
    A.hireCreature(s, 'nectabee');
  }
  if (s.unlocks.crafting && !has('emberpup')) A.hireCreature(s, 'emberpup');
  if (s.unlocks.crafting && !s.stations.some((st) => st.type === 'crafting')) build(s, 'crafting');
  if (has('emberpup') && s.stations.some((st) => st.type === 'crafting')) {
    for (const up of ['efficiency', 'storage', 'expansion']) A.buyUpgrade(s, up);
  }
}

test('the full Phase 1 loop can be played from start to finish', () => {
  const s = createNewGame(7);
  assert.equal(currentMilestone(s).id, 'assign-mosslet');
  A.assignCreature(s, s.creatures[0].id, s.stations.find((st) => st.type === 'gathering').id);

  const reached = {};
  for (let second = 0; second < 60 * 40; second++) {
    run(s, 1);
    think(s);
    assertInvariants(assert, s);
    for (const id of s.milestones) reached[id] ??= second;
  }
  const intro = MILESTONES.filter((m) => m.intro).map((m) => m.id);
  for (const id of intro) assert.ok(id in reached, `reached ${id}`);
  assert.ok(reached['first-weave'] < 15 * 60, `first weave within 15 minutes (took ${reached['first-weave']}s)`);
  assert.ok(s.stats.crafted.nectarWeave > 10);
  assert.ok(s.unlocks.nectabee && s.unlocks.emberpup && s.unlocks.crafting);
});
