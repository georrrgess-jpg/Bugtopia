// Decides what the introductory goals point at: an arrow on the canvas
// and/or a pulsing button in the interface.

import { countStations, occupantOf } from '../core/rules.js';
import { currentMilestone } from '../core/sim.js';
import { app } from '../app.js';

function freeStation(state, type) {
  return state.stations.find((s) => s.type === type && !occupantOf(state, s.id)) || null;
}

function restingCreature(state, species) {
  return state.creatures.find((c) => c.species === species && !c.stationId) || null;
}

// Returns { canvas: focus | null, button: dock id | null, hint: override text | null }
export function tutorialFocus() {
  const state = app.state;
  const none = { canvas: null, button: null, hint: null };
  if (!state || !app.settings.showGoals) return none;
  const m = currentMilestone(state);
  if (!m || !m.intro) return none;
  const sel = app.ui.selection;

  switch (m.id) {
    case 'assign-mosslet': {
      const mosslet = restingCreature(state, 'mosslet');
      const station = freeStation(state, 'gathering');
      if (!mosslet || !station) return none;
      if (sel && sel.kind === 'creature' && sel.id === mosslet.id) {
        return { canvas: { kind: 'station', id: station.id }, button: null, hint: 'Now tap the Gathering Station.' };
      }
      return { canvas: { kind: 'creature', id: mosslet.id }, button: null, hint: null };
    }
    case 'first-sale':
      return { canvas: null, button: 'market', hint: null };
    case 'hire-nectabee':
      return { canvas: null, button: 'creatures', hint: null };
    case 'collect-nectar': {
      const bee = restingCreature(state, 'nectabee');
      if (!bee) return none;
      const station = freeStation(state, 'gathering');
      if (station) {
        if (sel && sel.kind === 'creature' && sel.id === bee.id) {
          return { canvas: { kind: 'station', id: station.id }, button: null, hint: 'Now tap the empty Gathering Station.' };
        }
        return { canvas: { kind: 'creature', id: bee.id }, button: null, hint: 'Tap your Nectabee, then tap an empty Gathering Station.' };
      }
      return { canvas: null, button: 'build', hint: 'Build a Gathering Station for your Nectabee.' };
    }
    case 'setup-crafting': {
      const hasPup = state.creatures.some((c) => c.species === 'emberpup');
      if (!hasPup) return { canvas: null, button: 'creatures', hint: null };
      if (countStations(state, 'crafting') === 0) {
        return { canvas: null, button: 'build', hint: 'Now build a Crafting Station.' };
      }
      return none;
    }
    case 'first-weave': {
      const pup = restingCreature(state, 'emberpup');
      const station = freeStation(state, 'crafting');
      if (pup && station) {
        if (sel && sel.kind === 'creature' && sel.id === pup.id) {
          return { canvas: { kind: 'station', id: station.id }, button: null, hint: 'Now tap the Crafting Station.' };
        }
        return { canvas: { kind: 'creature', id: pup.id }, button: null, hint: null };
      }
      return none;
    }
    case 'first-order':
      return { canvas: null, button: 'market', hint: null };
    case 'first-upgrade':
      return { canvas: null, button: 'upgrades', hint: null };
    default:
      return none;
  }
}
