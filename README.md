# BUGTOPIA

**Tiny Creatures. Big Ambitions.**

BUGTOPIA is a cosy, creature-powered workshop game. Beneath the roots of a giant
tree, you hire adorable bugs, give them jobs at little wooden stations, gather
resources, craft products and grow a tiny workshop into a busy factory.

This is **Phase 1**: the foundation — three creatures, three station types, a
small crafting economy, a market with orders, upgrades, and reliable saving.

## Playing

**Easiest:** open [`dist/bugtopia.html`](dist/bugtopia.html) — the whole game in
one file. Download it and double-click it; no server or install needed.

To rebuild that file after changing the code: `npm install && npm run build`.

For development, the game runs straight from the source files (no build step),
but browsers only load ES modules over HTTP, so serve the folder with any
static server:

```sh
npm start            # serves on http://localhost:8080 (uses `npx serve`)
# or
python3 -m http.server 8080
```

Then open <http://localhost:8080>. Progress saves automatically in the browser
(`localStorage`).

### The Phase 1 loop

1. Tap your **Mosslet**, then tap the empty **Gathering Station** — it starts
   growing **Moss Fiber** (1 every 4 s).
2. Open the **Market** and sell Moss Fiber for **Acorns**, or fill an order.
3. Your first sale unlocks the **Nectabee**. Hire one and give it a Gathering
   Station — it collects **Nectar Drops** (1 every 6 s).
4. Your first Nectar Drop unlocks the **Emberpup** and the **Crafting Station**.
   An Emberpup heats the station to craft **Nectar Weave**
   (3 Moss Fiber + 2 Nectar Drops → 1 Nectar Weave, 10 s).
5. Complete orders, buy **upgrades**, expand and rearrange your workshop.

A goal card guides new players through these steps and then sets longer-term
goals. It can be hidden in Settings.

### Controls

| Action | How |
|---|---|
| Inspect | Tap a creature or station |
| Give a creature a job | Tap the creature, then an empty station — or drag it onto a station |
| Rearrange | Drag a station to a free tile (or use **Move station** in the inspector) |
| Build | **Build** → choose a station → tap a glowing tile |
| Menus | **B** Build · **C** Creatures · **M** Market · **U** Upgrades · **Esc** close / cancel |

## Project layout

```
index.html            Page shell (title screen + game screen)
styles/main.css       All interface styling
src/
  config.js           Global constants (save keys, tick rate, ...)
  data/               Game content as plain data — the place to add things
    items.js            Resources, products and sale values
    species.js          Creature species
    stations.js         Station types and crafting recipes
    upgrades.js         Upgrade paths, storage and workshop sizes
    milestones.js       Tutorial and long-term goals
  core/               Pure game logic (no DOM; runs in Node for tests)
    rules.js            Read-only lookups, prices, capacities, station status
    actions.js          Every player action, each with a validating check*
    sim.js              Fixed-step simulation: production, crafting, milestones
    orders.js           Market order generation
    state.js            New-game creation
    save.js             Versioned save/load with migration and repair
  render/             Canvas art, all procedurally drawn
    workshop.js         The workshop view, effects and hit-testing
    creatures.js        Mosslet, Nectabee and Emberpup
    stations.js         Gathering Station, Crafting Station, Storage Crate
    decor.js            Walls, lanterns, vines, mushrooms, floor tiles
  ui/                 DOM interface (HUD, goal card, inspector, sheets, input)
  audio/audio.js      Synthesised sound effects and music (Web Audio)
  app.js              Controller: routes actions, saving, UI refresh
  main.js             Boot, screens and game loop
tests/                Node tests for the economy, saves and a full playthrough
dev/gallery.html      Art gallery of every creature and station (dev aid)
scripts/              build-single.mjs bundles the game into dist/bugtopia.html
dist/bugtopia.html    The single-file build — open it directly in a browser
```

### Design notes

- **Logic is separate from presentation.** `src/core` never touches the DOM.
  Every action validates first and returns `{ ok, reason }`, so the interface
  can always explain why something is unavailable.
- **One source of truth for assignments.** A creature stores its `stationId`;
  station occupancy is derived from that, so a creature can never be in two
  places and moving a station can't lose its worker.
- **Fixed-step simulation.** The game advances in 0.1 s steps from real elapsed
  time, so production is frame-rate independent and keeps going in a
  background tab. There is no offline production: a loaded save resumes
  exactly as it was left.
- **Defensive saves.** Saves are versioned (`SAVE_VERSION` in `config.js`) with
  a migration table in `core/save.js`. Loading repairs anything inconsistent
  (unknown ids, negative numbers, overlapping stations, double assignments)
  rather than crashing; an unreadable save is kept aside, not deleted.

### Extending the game

- **New creature:** add an entry to `data/species.js` (station, output or
  crafting role, cost, unlock key) and a drawing function in
  `render/creatures.js`.
- **New resource or product:** add it to `data/items.js`, an icon in
  `ui/icons.js`, and (for products) a recipe in `data/stations.js`.
- **New goals:** append to `data/milestones.js`.
- **Changing the save shape:** bump `SAVE_VERSION` and add a migration.

## Testing

```sh
npm test
```

The suite covers production timing, storage caps, selling, purchases, crafting
(including pausing and missing ingredients), station moves, order payouts,
upgrade caps, save round-trips and repair of corrupted saves, plus a scripted
playthrough of the full Phase 1 loop that checks the core invariants every
second.
