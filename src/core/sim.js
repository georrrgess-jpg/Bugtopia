// The workshop simulation. `step` advances the game by a small, fixed amount
// of time; the main loop calls it repeatedly to keep up with real time.

import { RECIPES } from '../data/stations.js';
import { MILESTONES } from '../data/milestones.js';
import { emit } from './events.js';
import { fillOrders } from './orders.js';
import {
  canOperate,
  freeSpace,
  missingInputs,
  occupantOf,
  productionInterval,
  stationStatus,
} from './rules.js';

export function step(state, dt) {
  state.stats.playTime += dt;
  if (state.market.swapCooldown > 0) {
    state.market.swapCooldown = Math.max(0, state.market.swapCooldown - dt);
  }

  for (const station of state.stations) {
    if (station.type === 'gathering') stepGathering(state, station, dt);
    else if (station.type === 'crafting') stepCrafting(state, station, dt);
  }

  updateMilestones(state);
  if (fillOrders(state) > 0) emit('ordersChanged');
}

function stepGathering(state, station, dt) {
  const status = stationStatus(state, station);
  if (status.code !== 'working' && status.code !== 'full') return;
  const creature = occupantOf(state, station.id);
  const item = status.item;
  station.progress += dt / productionInterval(state, creature.species);
  while (station.progress >= 1) {
    // With storage full, the finished item is held "in hand" until there is room.
    if (freeSpace(state, item) <= 0) {
      station.progress = 1;
      break;
    }
    station.progress -= 1;
    state.inventory[item] += 1;
    state.stats.produced[item] += 1;
    emit('produced', { stationId: station.id, creatureId: creature.id, item, qty: 1 });
  }
}

function stepCrafting(state, station, dt) {
  const recipe = RECIPES[station.recipe];
  if (!recipe) return;
  const creature = occupantOf(state, station.id);
  const hasCrafter = !!creature && canOperate(creature.species, 'crafting');

  if (station.active) {
    // Ingredients were already paid for; without a crafter the cycle simply pauses.
    if (!hasCrafter) return;
    station.progress = Math.min(1, station.progress + dt / recipe.time);
    if (station.progress >= 1) {
      const { item, qty } = recipe.output;
      if (freeSpace(state, item) >= qty) {
        state.inventory[item] += qty;
        state.stats.crafted[item] += qty;
        station.active = false;
        station.progress = 0;
        emit('crafted', { stationId: station.id, creatureId: creature.id, item, qty });
      }
    }
    return;
  }

  if (!hasCrafter || !station.enabled) return;
  if (freeSpace(state, recipe.output.item) < recipe.output.qty) return;
  if (missingInputs(state, recipe).length) return;

  for (const [item, need] of Object.entries(recipe.inputs)) state.inventory[item] -= need;
  station.active = true;
  station.progress = 0;
  emit('craftStarted', { stationId: station.id, creatureId: creature.id, inputs: { ...recipe.inputs } });
}

export function currentMilestone(state) {
  return MILESTONES.find((m) => !state.milestones.includes(m.id)) || null;
}

// Milestones complete strictly in order, so rewards and unlocks always arrive
// in the intended sequence.
export function updateMilestones(state) {
  for (const m of MILESTONES) {
    if (state.milestones.includes(m.id)) continue;
    if (!m.check(state)) break;
    state.milestones.push(m.id);
    if (m.reward) {
      state.acorns += m.reward;
      state.stats.acornsEarned += m.reward;
    }
    const unlocked = [];
    for (const key of m.unlocks || []) {
      if (!state.unlocks[key]) {
        state.unlocks[key] = true;
        unlocked.push(key);
      }
    }
    emit('milestone', { id: m.id, reward: m.reward, unlocked });
  }
}
