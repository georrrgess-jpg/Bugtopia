// BUGTOPIA — entry point. Boots the interface, runs the game loop and
// switches between the title screen and the workshop.

import { GAME_VERSION, TICK_STEP, MAX_CATCH_UP, AUTOSAVE_INTERVAL } from './config.js';
import { ITEM_IDS } from './data/items.js';
import { STATIONS } from './data/stations.js';
import { SPECIES } from './data/species.js';
import { step } from './core/sim.js';
import { on } from './core/events.js';
import { hasSave, peekSave } from './core/save.js';
import { app, subscribe, refresh, saveNow, startNewGame, loadGame, cancel, setMode, updateSettings } from './app.js';
import { audio } from './audio/audio.js';
import { WorkshopView } from './render/workshop.js';
import { iconImage } from './ui/icons.js';
import { h, fmt } from './ui/dom.js';
import { toast } from './ui/toast.js';
import { createHud } from './ui/hud.js';
import { createGoalCard } from './ui/goals.js';
import { createInspector } from './ui/inspector.js';
import { createDock } from './ui/dock.js';
import { openSheet, closeSheet, isSheetOpen } from './ui/sheets.js';
import { openSettings, setSettingsHandlers } from './ui/settings.js';
import { confirmDialog, isModalOpen } from './ui/dialogs.js';
import { attachInput } from './ui/input.js';
import { TitleScene } from './ui/title.js';
import { tutorialFocus } from './ui/tutorial.js';

const $ = (id) => document.getElementById(id);

const titleScreen = $('title-screen');
const gameScreen = $('game-screen');
const workshopCanvas = $('workshop');

// Warm the icon cache so canvas drawings have their images ready.
['acorn', ...ITEM_IDS].forEach((name) => iconImage(name));

$('version').textContent = GAME_VERSION;
updateSettings({});
audio.applySettings(app.settings);

const view = new WorkshopView(workshopCanvas, app);
app.view = view;
const title = new TitleScene($('title-canvas'));
createHud();
createGoalCard();
createInspector();
const dock = createDock();
attachInput(workshopCanvas, view);

// ----- Screens --------------------------------------------------------------

function showTitle() {
  app.screen = 'title';
  closeSheet(true);
  gameScreen.hidden = true;
  titleScreen.hidden = false;
  const info = peekSave();
  const cont = $('btn-continue');
  const contInfo = $('continue-info');
  cont.hidden = !info;
  contInfo.hidden = !info;
  $('btn-new').textContent = info ? 'New Game' : 'Play';
  $('btn-new').className = info ? 'btn btn-secondary btn-big' : 'btn btn-primary btn-big';
  if (info) {
    const when = info.savedAt ? new Date(info.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
    contInfo.textContent = `${fmt(info.acorns)} Acorns · ${info.creatures} creature${info.creatures === 1 ? '' : 's'}${when ? ` · ${when}` : ''}`;
  }
  title.resize();
  audio.setMusic(true);
  (info ? cont : $('btn-new')).focus({ preventScroll: true });
}

function enterGame() {
  closeSheet(true);
  app.screen = 'game';
  titleScreen.hidden = true;
  gameScreen.hidden = false;
  view.resize();
  lastTime = performance.now();
  accumulator = 0;
  refresh('enter');
  updateSafeArea();
  audio.setMusic(true);
}

async function newGameFlow() {
  if (hasSave()) {
    const ok = await confirmDialog({
      title: 'Start a new game?',
      text: ['Your current workshop, creatures and Acorns will be replaced by a fresh start.', 'This cannot be undone.'],
      confirmText: 'Start fresh',
      danger: true,
    });
    if (!ok) return;
  }
  startNewGame();
  enterGame();
}

function continueFlow() {
  const result = loadGame();
  if (!result.ok) {
    toast(`Couldn't load your save: ${result.error}`, 'warn', 5000);
    showTitle();

// Handy for debugging from the browser console.
window.bugtopia = {
  app,
  view,
  advance(seconds) {
    for (let t = 0; t < seconds; t += TICK_STEP) step(app.state, TICK_STEP);
    refresh('tick');
  },
};
    return;
  }
  enterGame();
  toast('Welcome back to your workshop!', 'good', 2600);
}

function toTitleFlow() {
  saveNow();
  showTitle();

// Handy for debugging from the browser console.
window.bugtopia = {
  app,
  view,
  advance(seconds) {
    for (let t = 0; t < seconds; t += TICK_STEP) step(app.state, TICK_STEP);
    refresh('tick');
  },
};
}

setSettingsHandlers({ toTitle: toTitleFlow, newGame: newGameFlow });

$('btn-continue').addEventListener('click', () => {
  audio.unlock();
  audio.play('click');
  continueFlow();
});
$('btn-new').addEventListener('click', () => {
  audio.unlock();
  audio.play('click');
  newGameFlow();
});
$('btn-title-settings').addEventListener('click', () => {
  audio.unlock();
  openSettings(false);
});
// Any first interaction may start audio.
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

// ----- Mode banner ------------------------------------------------------------

const banner = $('mode-banner');
function updateBanner() {
  const mode = app.ui.mode;
  if (!mode || app.screen !== 'game') {
    banner.hidden = true;
    banner.dataset.key = '';
    return;
  }
  const key = JSON.stringify(mode);
  if (banner.dataset.key === key) return;
  banner.dataset.key = key;
  let text = '';
  if (mode.type === 'place') text = `Tap a glowing tile to place your ${STATIONS[mode.stationType].name}.`;
  if (mode.type === 'move') text = 'Tap a glowing tile to move this station.';
  if (mode.type === 'assign') {
    const c = app.state.creatures.find((x) => x.id === mode.creatureId);
    text = c ? `Tap a ${STATIONS[SPECIES[c.species].station].name} for ${c.name}.` : '';
  }
  banner.replaceChildren(
    h('span', { text }),
    h('button', { class: 'btn btn-secondary btn-small', type: 'button', onclick: () => setMode(null) }, 'Cancel'),
  );
  banner.hidden = false;
}

// ----- Layout: keep the workshop clear of the panels ------------------------------

const hudEl = $('hud');
const dockEl = $('dock');
const goalEl = $('goal-card');
const inspectorEl = $('inspector');
// Must match the bottom-sheet media query in styles/main.css.
const sheetInspector = window.matchMedia('(max-width: 899px), (max-width: 1099px) and (max-aspect-ratio: 5/4)');

// Pick the workshop area that leaves the largest tiles, given which panels
// are on screen.
function updateSafeArea() {
  if (app.screen !== 'game') return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const side = !sheetInspector.matches;
  gameScreen.classList.toggle('narrow-selected', !side && !!app.ui.selection);
  const hud = hudEl.getBoundingClientRect();
  const dockR = dockEl.getBoundingClientRect();
  const base = { top: hud.bottom + 4, bottom: H - dockR.top + 10, left: 12, right: 12 };
  const inspVisible = getComputedStyle(inspectorEl).display !== 'none';
  if (inspVisible) {
    const r = inspectorEl.getBoundingClientRect();
    if (side) base.right = W - r.left + 12;
    else if (app.ui.selection) base.bottom = Math.max(base.bottom, H - r.top + 8);
  }
  const candidates = [base];
  const goalVisible = !goalEl.hidden && getComputedStyle(goalEl).display !== 'none';
  if (goalVisible) {
    const g = goalEl.getBoundingClientRect();
    candidates.length = 0;
    candidates.push({ ...base, top: Math.max(base.top, g.bottom + 6) });
    candidates.push({ ...base, left: Math.max(base.left, g.right + 12) });
  }
  const L = view.layout;
  const cols = L ? L.cols : 6;
  const rows = L ? L.rows : 6;
  const score = (r) => Math.min((W - r.left - r.right) / (cols + 0.5), (H - r.top - r.bottom) / (rows + 1.1));
  const safe = candidates.reduce((best, c) => (score(c) > score(best) ? c : best));
  const prev = app.ui.safe;
  if (prev.top !== safe.top || prev.bottom !== safe.bottom || prev.left !== safe.left || prev.right !== safe.right) {
    app.ui.safe = safe;
  }
}

subscribe((reason) => {
  updateBanner();
  if (reason === 'layout' || reason === 'selection' || reason === 'settings' || reason === 'enter') {
    requestAnimationFrame(updateSafeArea);
  }
});

window.addEventListener('resize', () => {
  view.resize();
  title.resize();
  updateSafeArea();
});

// ----- Keyboard -------------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (isModalOpen() || app.screen !== 'game') return;
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === 'Escape') {
    if (isSheetOpen()) closeSheet();
    else cancel();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const sheet = dock.keys[e.key.toLowerCase()];
  if (sheet) openSheet(sheet);
});

// ----- Sound for production events --------------------------------------------------

on((e) => {
  if (app.screen !== 'game' || document.hidden) return;
  if (e.type === 'produced') audio.play('produce');
  else if (e.type === 'craftStarted') audio.play('craftStart');
  else if (e.type === 'crafted') audio.play('crafted');
});

// ----- Saving on exit ---------------------------------------------------------------

function saveIfPlaying() {
  if (app.screen === 'game' && app.state) saveNow();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveIfPlaying();
});
window.addEventListener('pagehide', saveIfPlaying);
window.addEventListener('beforeunload', saveIfPlaying);

// ----- Game loop ---------------------------------------------------------------------

let lastTime = performance.now();
let accumulator = 0;
let lastFrame = performance.now();
let uiTimer = 0;
let saveTimer = 0;

// Advance the simulation by however much real time has passed. Called every
// animation frame and from a timer, so production continues in background tabs.
function pump(now) {
  if (app.screen !== 'game' || !app.state) {
    lastTime = now;
    return;
  }
  const elapsed = Math.min(MAX_CATCH_UP, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  accumulator += elapsed;
  while (accumulator >= TICK_STEP) {
    step(app.state, TICK_STEP);
    accumulator -= TICK_STEP;
  }
  saveTimer += elapsed;
  if (saveTimer >= AUTOSAVE_INTERVAL) {
    saveTimer = 0;
    saveNow();
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  pump(now);
  if (app.screen === 'game' && app.state) {
    app.ui.focus = tutorialFocus().canvas;
    view.update(dt);
    view.draw();
    uiTimer += dt;
    if (uiTimer > 0.15) {
      uiTimer = 0;
      refresh('tick');
      updateSafeArea();
    }
  } else if (app.screen === 'title') {
    title.frame(dt);
  }
  requestAnimationFrame(frame);
}

setInterval(() => pump(performance.now()), 250);
requestAnimationFrame(frame);

showTitle();

// Handy for debugging from the browser console.
window.bugtopia = {
  app,
  view,
  advance(seconds) {
    for (let t = 0; t < seconds; t += TICK_STEP) step(app.state, TICK_STEP);
    refresh('tick');
  },
};
