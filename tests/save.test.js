import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame } from '../src/core/state.js';
import { serialize, deserialize } from '../src/core/save.js';
import * as A from '../src/core/actions.js';
import { run, assertInvariants } from './helpers.js';

function playedGame() {
  const s = createNewGame(99);
  s.acorns = 5000;
  A.assignCreature(s, s.creatures[0].id, s.stations[0].id);
  run(s, 60);
  A.sellItem(s, 'mossFiber', 3);
  run(s, 1);
  A.hireCreature(s, 'nectabee');
  A.buildStation(s, 'gathering', 0, 0);
  A.buyUpgrade(s, 'expansion');
  A.moveStation(s, s.stations[1].id, 5, 4);
  run(s, 30);
  return s;
}

test('save round-trips every part of the game', () => {
  const s = playedGame();
  const loaded = deserialize(serialize(s));
  assert.ok(loaded.ok);
  assert.deepEqual(loaded.state, s);
});

test('loading does not grant offline production', () => {
  const s = playedGame();
  const json = serialize(s);
  const loaded = deserialize(json).state;
  assert.deepEqual(loaded.inventory, s.inventory);
  assert.equal(loaded.acorns, s.acorns);
});

test('rejects garbage and foreign data', () => {
  assert.equal(deserialize('not json').ok, false);
  assert.equal(deserialize('{"hello":1}').ok, false);
  assert.equal(deserialize(JSON.stringify({ format: 'bugtopia-save', version: 999, state: {} })).ok, false);
});

test('repairs corrupted or tampered saves', () => {
  const s = playedGame();
  const data = JSON.parse(serialize(s));
  const st = data.state;
  st.acorns = -50;
  st.inventory.mossFiber = -3;
  st.inventory.nectarDrop = 'lots';
  st.stations.push({ id: 'sX', type: 'laser', x: 0, y: 1 });
  st.stations.push({ id: 'sY', type: 'storage', x: st.stations[0].x, y: st.stations[0].y });
  st.stations.push({ id: 'sZ', type: 'storage', x: 40, y: 40 });
  // Two creatures claiming the same station, plus one on an incompatible station.
  st.creatures.push({ id: 'cA', species: 'mosslet', name: 'Dupe', stationId: st.stations[0].id });
  st.creatures.push({ id: 'cB', species: 'mosslet', name: 'Lost', stationId: 'nope' });
  st.creatures.push({ id: 'cC', species: 'dragon', name: 'Nope', stationId: null });
  st.orders.push({ id: 'oX', item: 'gold', qty: 1, reward: 1 });
  st.upgrades.efficiency = 99;
  st.milestones.push('bogus');

  const loaded = deserialize(JSON.stringify(data));
  assert.ok(loaded.ok);
  const r = loaded.state;
  assert.equal(r.acorns, 0);
  assert.equal(r.inventory.mossFiber, 0);
  assert.equal(r.inventory.nectarDrop, 0);
  assert.ok(!r.stations.some((x) => x.type === 'laser'));
  assert.ok(r.stations.some((x) => x.id === 'sY'), 'overlapping station re-homed, not lost');
  assert.ok(r.stations.some((x) => x.id === 'sZ'), 'off-grid station re-homed, not lost');
  assert.ok(!r.creatures.some((c) => c.species === 'dragon'));
  assert.equal(r.creatures.find((c) => c.id === 'cB').stationId, null);
  assert.ok(!r.orders.some((o) => o.item === 'gold'));
  assert.equal(r.upgrades.efficiency, 5);
  assert.ok(!r.milestones.includes('bogus'));
  assert.ok(r.nextId > 0);
  assertInvariants(assert, r);

  // New ids never collide with loaded ones.
  r.acorns = 1000;
  const fresh = A.hireCreature(r, 'mosslet');
  if (fresh.ok) assert.ok(!r.creatures.some((c) => c !== fresh.creature && c.id === fresh.creature.id));
});

test('missing fields are filled from defaults', () => {
  const loaded = deserialize(JSON.stringify({ format: 'bugtopia-save', version: 1, state: { acorns: 42 } }));
  assert.ok(loaded.ok);
  assert.equal(loaded.state.acorns, 42);
  assert.equal(loaded.state.upgrades.storage, 0);
  assert.ok(loaded.state.orders.length > 0);
});
