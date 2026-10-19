// Saving and loading. The (de)serialisation functions are pure so they can be
// tested in Node; the storage helpers wrap localStorage.
//
// Loading never trusts the stored data: it migrates old versions, fills in
// missing fields from a fresh state, and repairs anything inconsistent
// (unknown ids, negative numbers, overlapping stations, double assignments).

import { GAME_ID, SAVE_FORMAT, SAVE_KEY, SAVE_VERSION, SETTINGS_KEY } from '../config.js';
import { ITEM_IDS } from '../data/items.js';
import { SPECIES } from '../data/species.js';
import { STATIONS, RECIPES, DEFAULT_RECIPE } from '../data/stations.js';
import { UPGRADE_IDS, maxLevel } from '../data/upgrades.js';
import { MILESTONES, MILESTONE_IDS } from '../data/milestones.js';
import { createEmptyState } from './state.js';
import { canOperate, freeTiles, getStation, inBounds, itemObtainable } from './rules.js';
import { fillOrders, STORY_ORDERS } from './orders.js';
import { ORDER_SWAP_COOLDOWN } from '../config.js';

// Migrations from version N to N + 1. Add entries here as the format evolves.
const MIGRATIONS = {
  // 1: (data) => { ...; return data; },
};

export function serialize(state) {
  return JSON.stringify({
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state,
  });
}

export function deserialize(json) {
  let wrapper;
  try {
    wrapper = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Save data is not valid JSON.' };
  }
  if (!wrapper || wrapper.format !== SAVE_FORMAT || typeof wrapper.state !== 'object' || !wrapper.state) {
    return { ok: false, error: 'This is not a BUGTOPIA save.' };
  }
  let version = Number(wrapper.version) || 1;
  if (version > SAVE_VERSION) {
    return { ok: false, error: 'This save was made by a newer version of BUGTOPIA.' };
  }
  let data = wrapper.state;
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (migrate) data = migrate(data);
    version++;
  }
  return { ok: true, state: sanitize(data), savedAt: Number(wrapper.savedAt) || 0 };
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const count = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const amount = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
const clamp01 = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

function itemMap(source) {
  const src = isObj(source) ? source : {};
  return Object.fromEntries(ITEM_IDS.map((id) => [id, count(src[id])]));
}

export function sanitize(raw) {
  const base = createEmptyState(Number(raw?.rng) || Date.now());
  const s = base;
  const r = isObj(raw) ? raw : {};

  s.gameId = GAME_ID;
  s.version = SAVE_VERSION;
  s.createdAt = Number.isFinite(r.createdAt) ? r.createdAt : s.createdAt;
  s.acorns = count(r.acorns);
  s.inventory = itemMap(r.inventory);
  s.rng = Number.isFinite(r.rng) ? r.rng >>> 0 : s.rng;

  const rStats = isObj(r.stats) ? r.stats : {};
  s.stats = {
    produced: itemMap(rStats.produced),
    crafted: itemMap(rStats.crafted),
    sold: itemMap(rStats.sold),
    acornsEarned: amount(rStats.acornsEarned),
    acornsSpent: amount(rStats.acornsSpent),
    ordersCompleted: count(rStats.ordersCompleted),
    upgradesBought: count(rStats.upgradesBought),
    playTime: amount(rStats.playTime),
  };

  const rUp = isObj(r.upgrades) ? r.upgrades : {};
  for (const id of UPGRADE_IDS) s.upgrades[id] = Math.min(maxLevel(id), count(rUp[id]));

  const rUnlocks = isObj(r.unlocks) ? r.unlocks : {};
  for (const key of Object.keys(s.unlocks)) s.unlocks[key] = rUnlocks[key] === true;

  s.milestones = Array.isArray(r.milestones)
    ? [...new Set(r.milestones.filter((id) => MILESTONE_IDS.includes(id)))]
    : [];
  // Unlocks granted by completed milestones are always restored.
  for (const m of MILESTONES) {
    if (s.milestones.includes(m.id)) for (const key of m.unlocks || []) s.unlocks[key] = true;
  }

  // ---- Stations: known types, inside the workshop, one per tile.
  const usedIds = new Set();
  let maxId = 0;
  const trackId = (id) => {
    const n = parseInt(String(id).slice(1), 10);
    if (Number.isFinite(n)) maxId = Math.max(maxId, n);
  };
  s.stations = [];
  const misplaced = [];
  for (const st of Array.isArray(r.stations) ? r.stations : []) {
    if (!isObj(st) || !STATIONS[st.type] || typeof st.id !== 'string' || usedIds.has(st.id)) continue;
    usedIds.add(st.id);
    trackId(st.id);
    const station = { id: st.id, type: st.type, x: st.x, y: st.y };
    if (st.type === 'gathering') station.progress = clamp01(st.progress);
    if (st.type === 'crafting') {
      station.recipe = RECIPES[st.recipe] ? st.recipe : DEFAULT_RECIPE;
      station.active = st.active === true;
      station.progress = station.active ? clamp01(st.progress) : 0;
      station.enabled = st.enabled !== false;
    }
    const clash = s.stations.some((o) => o.x === station.x && o.y === station.y);
    if (!inBounds(s, station.x, station.y) || clash) misplaced.push(station);
    else s.stations.push(station);
  }
  // Re-home anything that ended up off-grid or overlapping rather than losing it.
  for (const station of misplaced) {
    const tile = freeTiles(s)[0];
    if (!tile) continue;
    station.x = tile.x;
    station.y = tile.y;
    s.stations.push(station);
  }

  // ---- Creatures: known species, unique assignments to compatible stations.
  s.creatures = [];
  const taken = new Set();
  for (const c of Array.isArray(r.creatures) ? r.creatures : []) {
    if (!isObj(c) || !SPECIES[c.species] || typeof c.id !== 'string' || usedIds.has(c.id)) continue;
    usedIds.add(c.id);
    trackId(c.id);
    const name = typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 16) : SPECIES[c.species].name;
    let stationId = typeof c.stationId === 'string' ? c.stationId : null;
    const station = stationId ? getStation(s, stationId) : null;
    if (!station || taken.has(stationId) || !canOperate(c.species, station.type)) stationId = null;
    if (stationId) taken.add(stationId);
    s.creatures.push({ id: c.id, species: c.species, name, stationId });
  }

  // ---- Market.
  const rMarket = isObj(r.market) ? r.market : {};
  const storyIds = STORY_ORDERS.map((o) => o.story);
  s.market = {
    swapCooldown: Math.min(ORDER_SWAP_COOLDOWN, amount(rMarket.swapCooldown)),
    storyIssued: Array.isArray(rMarket.storyIssued) ? rMarket.storyIssued.filter((id) => storyIds.includes(id)) : [],
  };
  s.orders = [];
  for (const o of Array.isArray(r.orders) ? r.orders : []) {
    if (!isObj(o) || typeof o.id !== 'string' || usedIds.has(o.id)) continue;
    if (!ITEM_IDS.includes(o.item) || !itemObtainable(s, o.item)) continue;
    const qty = count(o.qty);
    const reward = count(o.reward);
    if (!qty || !reward) continue;
    usedIds.add(o.id);
    trackId(o.id);
    s.orders.push({ id: o.id, item: o.item, qty, reward, client: typeof o.client === 'string' ? o.client : 'A neighbour' });
  }

  s.nextId = Math.max(count(r.nextId), maxId + 1, 1);
  fillOrders(s);
  return s;
}

// ----- Browser storage ---------------------------------------------------

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function hasSave() {
  return !!storage()?.getItem(SAVE_KEY);
}

export function writeSave(state) {
  const store = storage();
  if (!store) return { ok: false, error: 'Saving is unavailable in this browser.' };
  try {
    store.setItem(SAVE_KEY, serialize(state));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save — browser storage may be full or blocked.' };
  }
}

export function readSave() {
  const store = storage();
  const json = store?.getItem(SAVE_KEY);
  if (!json) return { ok: false, error: 'No save found.', missing: true };
  const result = deserialize(json);
  if (!result.ok) {
    // Keep the unreadable save around instead of silently destroying it.
    try {
      store.setItem(`${SAVE_KEY}.unreadable`, json);
    } catch {
      /* ignore */
    }
  }
  return result;
}

export function peekSave() {
  const result = readSave();
  if (!result.ok) return null;
  return { acorns: result.state.acorns, creatures: result.state.creatures.length, savedAt: result.savedAt };
}

export function deleteSave() {
  try {
    storage()?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

// ----- Settings ----------------------------------------------------------

export const DEFAULT_SETTINGS = {
  musicVolume: 0.35,
  sfxVolume: 0.6,
  muted: false,
  reduceMotion: false,
  showGoals: true,
};

export function loadSettings() {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const raw = JSON.parse(storage()?.getItem(SETTINGS_KEY) || '{}');
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof raw[key] === typeof DEFAULT_SETTINGS[key]) settings[key] = raw[key];
    }
    settings.musicVolume = Math.min(1, Math.max(0, settings.musicVolume));
    settings.sfxVolume = Math.min(1, Math.max(0, settings.sfxVolume));
  } catch {
    /* fall back to defaults */
  }
  return settings;
}

export function saveSettings(settings) {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
