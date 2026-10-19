// The app controller: owns the current game state, routes player actions
// through validation, and coordinates saving and UI refreshes.

import * as Actions from './core/actions.js';
import { createNewGame } from './core/state.js';
import { readSave, writeSave, deleteSave, loadSettings, saveSettings } from './core/save.js';
import { audio } from './audio/audio.js';
import { toast } from './ui/toast.js';

const subscribers = new Set();

export const app = {
  screen: 'title',
  state: null,
  settings: loadSettings(),
  view: null,
  ui: {
    selection: null, // { kind: 'creature' | 'station', id }
    mode: null, // { type: 'place', stationType } | { type: 'move', stationId } | { type: 'assign', creatureId }
    hover: null, // hovered tile
    drag: null, // { kind, id, px, py, tile, active }
    focus: null, // tutorial focus for the canvas arrow
    sheet: null, // open sheet name
    safe: { top: 80, right: 16, bottom: 100, left: 16 },
  },
  lastSave: 0,
  saveDirty: false,
};

// UI components subscribe to be told when something changed.
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function refresh(reason = 'change') {
  for (const fn of subscribers) fn(reason);
}

const SOUNDS = {
  hireCreature: 'purchase',
  buildStation: 'place',
  moveStation: 'place',
  assignCreature: 'assign',
  unassignCreature: 'click',
  sellItem: 'coin',
  deliverOrder: 'order',
  swapOrder: 'click',
  buyUpgrade: 'purchase',
  renameCreature: 'click',
  toggleCrafting: 'click',
};

// Run a player action. Failures are explained to the player instead of
// silently ignored.
export function act(name, ...args) {
  if (!app.state) return { ok: false, reason: 'No game in progress.' };
  const fn = Actions[name];
  const result = fn(app.state, ...args);
  if (!result.ok) {
    toast(result.reason, 'warn');
    audio.play('error');
  } else {
    if (!result.unchanged && SOUNDS[name]) audio.play(SOUNDS[name]);
    app.saveDirty = true;
    // Spending or earning is worth saving promptly.
    if (['hireCreature', 'buildStation', 'buyUpgrade', 'deliverOrder', 'sellItem', 'moveStation'].includes(name)) {
      scheduleSave(800);
    }
  }
  refresh(name);
  return result;
}

// Explain why an action is unavailable (used by "unavailable" buttons).
export function explain(check) {
  if (check && !check.ok) {
    toast(check.reason, 'warn');
    audio.play('error');
  }
}

// ----- Selection & modes ---------------------------------------------------

export function select(selection) {
  const same =
    selection && app.ui.selection && selection.kind === app.ui.selection.kind && selection.id === app.ui.selection.id;
  app.ui.selection = selection;
  if (selection && !same) audio.play('select');
  refresh('selection');
}

export function setMode(mode) {
  app.ui.mode = mode;
  refresh('mode');
}

export function cancel() {
  if (app.ui.mode) setMode(null);
  else if (app.ui.selection) select(null);
}

// ----- Games ------------------------------------------------------------------

export function startNewGame() {
  deleteSave();
  app.state = createNewGame(Date.now());
  resetUi();
  saveNow();
}

export function loadGame() {
  const result = readSave();
  if (!result.ok) return result;
  app.state = result.state;
  resetUi();
  return result;
}

function resetUi() {
  app.ui.selection = null;
  app.ui.mode = null;
  app.ui.drag = null;
  app.ui.focus = null;
  app.ui.sheet = null;
  app.view?.reset();
}

// ----- Saving -----------------------------------------------------------------

let saveTimer = null;
let warnedSaveFailure = false;

export function scheduleSave(delay = 1000) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, delay);
}

export function saveNow() {
  clearTimeout(saveTimer);
  if (!app.state) return false;
  const result = writeSave(app.state);
  if (result.ok) {
    app.lastSave = performance.now();
    app.saveDirty = false;
    refresh('saved');
    return true;
  }
  if (!warnedSaveFailure) {
    warnedSaveFailure = true;
    toast(result.error, 'warn', 5000);
  }
  return false;
}

// ----- Settings ---------------------------------------------------------------

export function updateSettings(patch) {
  Object.assign(app.settings, patch);
  saveSettings(app.settings);
  audio.applySettings(app.settings);
  document.body.classList.toggle('reduce-motion', app.settings.reduceMotion);
  refresh('settings');
}
