import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame } from '../src/core/state.js';
import * as A from '../src/core/actions.js';
import { capacityPerItem, productionInterval, hirePrice, buildPrice, freeTiles } from '../src/core/rules.js';
import { run, assertInvariants } from './helpers.js';

const newGame = () => createNewGame(1234);
const mosslet = (s) => s.creatures.find((c) => c.species === 'mosslet');
const stationOf = (s, type) => s.stations.find((st) => st.type === type);

test('new game matches the Phase 1 starting kit', () => {
  const s = newGame();
  assert.equal(s.acorns, 100);
  assert.equal(s.creatures.length, 1);
  assert.equal(s.creatures[0].species, 'mosslet');
  assert.equal(s.stations.filter((st) => st.type === 'gathering').length, 1);
  assert.equal(s.stations.filter((st) => st.type === 'storage').length, 1);
  assert.equal(freeTiles(s).length, 23);
  assert.ok(s.orders.length > 0);
});

test('unassigned creatures produce nothing', () => {
  const s = newGame();
  run(s, 30);
  assert.equal(s.inventory.mossFiber, 0);
});

test('a Mosslet produces 1 Moss Fiber every 4 seconds', () => {
  const s = newGame();
  assert.ok(A.assignCreature(s, mosslet(s).id, stationOf(s, 'gathering').id).ok);
  run(s, 3.9);
  assert.equal(s.inventory.mossFiber, 0);
  run(s, 0.2);
  assert.equal(s.inventory.mossFiber, 1);
  run(s, 36);
  assert.equal(s.inventory.mossFiber, 10);
});

test('production stops at storage capacity and resumes when space frees up', () => {
  const s = newGame();
  A.assignCreature(s, mosslet(s).id, stationOf(s, 'gathering').id);
  run(s, 400);
  const cap = capacityPerItem(s);
  assert.equal(s.inventory.mossFiber, cap);
  assert.ok(A.sellItem(s, 'mossFiber', 1).ok);
  run(s, 0.1);
  assert.equal(s.inventory.mossFiber, cap, 'held item drops in as soon as there is room');
});

test('selling pays the right amount and rejects overselling', () => {
  const s = newGame();
  s.inventory.mossFiber = 5;
  assert.equal(A.sellItem(s, 'mossFiber', 6).ok, false);
  assert.equal(A.sellItem(s, 'mossFiber', 0).ok, false);
  assert.equal(A.sellItem(s, 'mossFiber', 2.5).ok, false);
  const before = s.acorns;
  assert.ok(A.sellItem(s, 'mossFiber', 5).ok);
  assert.equal(s.acorns, before + 15);
  assert.equal(s.inventory.mossFiber, 0);
  assert.equal(A.sellItem(s, 'mossFiber', 1).ok, false);
  assertInvariants(assert, s);
});

test('purchases require enough Acorns', () => {
  const s = newGame();
  s.acorns = 10;
  assert.equal(A.hireCreature(s, 'mosslet').ok, false);
  assert.equal(A.buildStation(s, 'gathering', 0, 0).ok, false);
  assert.equal(A.buyUpgrade(s, 'efficiency').ok, false);
  assert.equal(s.acorns, 10);
  assert.equal(s.creatures.length, 1);
});

test('locked species and stations cannot be bought', () => {
  const s = newGame();
  s.acorns = 10000;
  assert.equal(A.hireCreature(s, 'nectabee').ok, false);
  assert.equal(A.hireCreature(s, 'emberpup').ok, false);
  assert.equal(A.buildStation(s, 'crafting', 0, 0).ok, false);
});

test('creatures can only work at compatible stations, one per station', () => {
  const s = newGame();
  s.acorns = 10000;
  s.unlocks.emberpup = true;
  const m1 = mosslet(s);
  const gather = stationOf(s, 'gathering');
  const storage = stationOf(s, 'storage');
  assert.equal(A.assignCreature(s, m1.id, storage.id).ok, false);
  assert.ok(A.assignCreature(s, m1.id, gather.id).ok);
  const pup = A.hireCreature(s, 'emberpup').creature;
  assert.equal(A.assignCreature(s, pup.id, gather.id).ok, false);

  // A second Mosslet takes over; the first one rests (it had no previous station).
  const m2 = A.hireCreature(s, 'mosslet').creature;
  assert.equal(m2.stationId, null, 'no free gathering station to auto-assign');
  assert.ok(A.assignCreature(s, m2.id, gather.id).ok);
  assert.equal(m1.stationId, null);
  assertInvariants(assert, s);

  // Swap: m1 at a new station, then m2 moves onto m1's station -> m1 swaps back.
  const g2 = A.buildStation(s, 'gathering', 0, 0).station;
  assert.equal(m1.stationId, g2.id, 'resting Mosslet auto-assigned to the new station');
  assert.ok(A.assignCreature(s, m2.id, g2.id).ok);
  assert.equal(m1.stationId, gather.id);
  assert.equal(m2.stationId, g2.id);
  assertInvariants(assert, s);
});

test('building validates tiles and auto-assigns idle creatures', () => {
  const s = newGame();
  s.acorns = 1000;
  const occupied = stationOf(s, 'storage');
  assert.equal(A.buildStation(s, 'gathering', occupied.x, occupied.y).ok, false);
  assert.equal(A.buildStation(s, 'gathering', 5, 0).ok, false, 'outside the 5x5 floor');
  assert.equal(A.buildStation(s, 'gathering', -1, 2).ok, false);
  const before = s.acorns;
  const price = buildPrice(s, 'gathering');
  const res = A.buildStation(s, 'gathering', 0, 0);
  assert.ok(res.ok);
  assert.equal(s.acorns, before - price);
  assert.equal(res.worker.id, mosslet(s).id);
  assertInvariants(assert, s);
});

test('moving a station keeps its creature, progress and the inventory', () => {
  const s = newGame();
  const g = stationOf(s, 'gathering');
  A.assignCreature(s, mosslet(s).id, g.id);
  run(s, 10);
  const inv = { ...s.inventory };
  const progress = g.progress;
  assert.equal(A.moveStation(s, g.id, 3, 1).ok, false, 'occupied');
  assert.equal(A.moveStation(s, g.id, 9, 9).ok, false, 'out of bounds');
  assert.ok(A.moveStation(s, g.id, 4, 4).ok);
  assert.deepEqual(s.inventory, inv);
  assert.equal(g.progress, progress);
  assert.equal(mosslet(s).stationId, g.id);
  assert.equal(s.creatures.length, 1);
  run(s, 4);
  assert.ok(s.inventory.mossFiber > inv.mossFiber, 'still producing after the move');
});

test('crafting deducts inputs on start, needs an Emberpup and stops without materials', () => {
  const s = newGame();
  s.acorns = 10000;
  Object.assign(s.unlocks, { nectabee: true, emberpup: true, crafting: true });
  const craft = A.buildStation(s, 'crafting', 0, 0).station;
  s.inventory.mossFiber = 7;
  s.inventory.nectarDrop = 4;
  run(s, 20);
  assert.equal(s.inventory.mossFiber, 7, 'no crafting without an Emberpup');
  assert.equal(craft.active, false);

  const pup = A.hireCreature(s, 'emberpup').creature;
  assert.equal(pup.stationId, craft.id, 'auto-assigned to the free crafting station');
  run(s, 0.1);
  assert.equal(craft.active, true);
  assert.equal(s.inventory.mossFiber, 4);
  assert.equal(s.inventory.nectarDrop, 2);

  // Removing the crafter pauses the cycle without losing ingredients.
  A.unassignCreature(s, pup.id);
  run(s, 30);
  assert.equal(s.inventory.nectarWeave, 0);
  assert.equal(craft.active, true);
  A.assignCreature(s, pup.id, craft.id);
  run(s, 10.05);
  assert.equal(s.inventory.nectarWeave, 1);

  // Second cycle uses the rest; a third can't start (only 1 fiber, 0 nectar left).
  run(s, 10.2);
  assert.equal(s.inventory.nectarWeave, 2);
  assert.equal(s.inventory.mossFiber, 1);
  assert.equal(s.inventory.nectarDrop, 0);
  run(s, 30);
  assert.equal(s.inventory.nectarWeave, 2);
  assert.equal(craft.active, false);
  assertInvariants(assert, s);
});

test('paused crafting stations do not consume materials', () => {
  const s = newGame();
  s.acorns = 10000;
  Object.assign(s.unlocks, { emberpup: true, crafting: true });
  const craft = A.buildStation(s, 'crafting', 0, 0).station;
  A.toggleCrafting(s, craft.id);
  A.hireCreature(s, 'emberpup');
  s.inventory.mossFiber = 3;
  s.inventory.nectarDrop = 2;
  run(s, 15);
  assert.equal(s.inventory.mossFiber, 3);
  assert.equal(s.inventory.nectarWeave, 0);
});

test('orders pay out exactly once', () => {
  const s = newGame();
  const order = s.orders[0];
  s.inventory[order.item] = order.qty * 2;
  const before = s.acorns;
  assert.ok(A.deliverOrder(s, order.id).ok);
  assert.equal(A.deliverOrder(s, order.id).ok, false);
  assert.equal(s.acorns, before + order.reward);
  assert.equal(s.inventory[order.item], order.qty);
  assert.equal(s.stats.ordersCompleted, 1);
  assert.ok(!s.orders.some((o) => o.id === order.id));
});

test('orders cannot be delivered without enough items', () => {
  const s = newGame();
  const order = s.orders[0];
  s.inventory[order.item] = order.qty - 1;
  assert.equal(A.deliverOrder(s, order.id).ok, false);
  assert.equal(s.inventory[order.item], order.qty - 1);
});

test('swapping orders has a cooldown', () => {
  const s = newGame();
  assert.ok(A.swapOrder(s, s.orders[0].id).ok);
  assert.equal(A.swapOrder(s, s.orders[0].id).ok, false);
  run(s, 46);
  assert.ok(A.swapOrder(s, s.orders[0].id).ok);
});

test('orders are always achievable', () => {
  for (let seed = 1; seed < 40; seed++) {
    const s = createNewGame(seed);
    s.acorns = 1e6;
    for (let i = 0; i < 60; i++) {
      if (i === 10) Object.assign(s.unlocks, { nectabee: true });
      if (i === 20) Object.assign(s.unlocks, { emberpup: true, crafting: true });
      for (const o of s.orders) {
        assert.ok(o.qty <= capacityPerItem(s), 'fits in storage');
        if (o.item === 'nectarDrop') assert.ok(s.unlocks.nectabee);
        if (o.item === 'nectarWeave') assert.ok(s.unlocks.crafting);
      }
      const o = s.orders[0];
      s.inventory[o.item] = o.qty;
      assert.ok(A.deliverOrder(s, o.id).ok);
      run(s, 0.1);
    }
  }
});

test('upgrades apply, scale in price and cap out', () => {
  const s = newGame();
  s.acorns = 1e6;
  const base = productionInterval(s, 'mosslet');
  let lastPrice = 0;
  let bought = 0;
  while (A.checkUpgrade(s, 'efficiency').ok) {
    const price = A.checkUpgrade(s, 'efficiency').price;
    assert.ok(price > lastPrice);
    lastPrice = price;
    A.buyUpgrade(s, 'efficiency');
    bought++;
  }
  assert.equal(bought, 5);
  assert.equal(A.buyUpgrade(s, 'efficiency').ok, false);
  assert.ok(productionInterval(s, 'mosslet') < base);
  assert.ok(productionInterval(s, 'mosslet') >= base / 2, 'capped speed boost');

  const cap = capacityPerItem(s);
  A.buyUpgrade(s, 'storage');
  assert.ok(capacityPerItem(s) > cap);

  const tiles = freeTiles(s).length;
  A.buyUpgrade(s, 'expansion');
  assert.ok(freeTiles(s).length > tiles);
});

test('crew size is limited by workshop size', () => {
  const s = newGame();
  s.acorns = 1e6;
  while (A.checkHire(s, 'mosslet').ok) A.hireCreature(s, 'mosslet');
  assert.equal(s.creatures.length, 4);
  assert.match(A.checkHire(s, 'mosslet').reason, /Expand/);
  A.buyUpgrade(s, 'expansion');
  assert.ok(A.hireCreature(s, 'mosslet').ok);
});

test('hire prices rise with each creature of a species', () => {
  const s = newGame();
  s.acorns = 1e6;
  const p1 = hirePrice(s, 'mosslet');
  A.hireCreature(s, 'mosslet');
  assert.ok(hirePrice(s, 'mosslet') > p1);
});
