// Bottom navigation dock with notification badges.

import { SPECIES_IDS } from '../data/species.js';
import { STATION_IDS } from '../data/stations.js';
import { UPGRADE_IDS } from '../data/upgrades.js';
import * as A from '../core/actions.js';
import { canOperate, occupantOf } from '../core/rules.js';
import { app, subscribe } from '../app.js';
import { h, icon, setText, toggleClass } from './dom.js';
import { openSheet } from './sheets.js';
import { tutorialFocus } from './tutorial.js';

const BUTTONS = [
  { id: 'build', label: 'Build', icon: 'build', key: 'b' },
  { id: 'creatures', label: 'Creatures', icon: 'creatures', key: 'c' },
  { id: 'market', label: 'Market', icon: 'market', key: 'm' },
  { id: 'upgrades', label: 'Upgrades', icon: 'upgrades', key: 'u' },
];

export function createDock() {
  const root = document.getElementById('dock');
  const refs = {};
  for (const b of BUTTONS) {
    const badge = h('span', { class: 'badge', hidden: true });
    const btn = h(
      'button',
      {
        class: 'dock-btn',
        type: 'button',
        title: `${b.label} (${b.key.toUpperCase()})`,
        'aria-keyshortcuts': b.key.toUpperCase(),
        onclick: () => openSheet(b.id),
      },
      icon(b.icon),
      b.label,
      badge,
    );
    refs[b.id] = { btn, badge };
    root.append(btn);
  }

  function badge(id, value) {
    const { badge: el } = refs[id];
    const show = value !== null && value !== 0 && value !== false;
    if (el.hidden === show) el.hidden = !show;
    if (!show) return;
    toggleClass(el, 'dot', value === true);
    setText(el, value === true ? '' : value);
  }

  function update() {
    const s = app.state;
    if (!s) return;
    const focus = tutorialFocus();
    // While the tutorial points somewhere, keep other badges quiet.
    const guided = !!(focus.button || focus.canvas);
    const deliverable = s.orders.filter((o) => A.checkDeliver(s, o.id).ok).length;
    badge('market', deliverable || null);
    const resting = s.creatures.filter(
      (c) => !c.stationId && s.stations.some((st) => canOperate(c.species, st.type) && !occupantOf(s, st.id)),
    ).length;
    const hireable = SPECIES_IDS.some((id) => A.checkHire(s, id).ok);
    badge('creatures', guided ? null : resting || (hireable && s.creatures.length < 3) || null);
    badge('upgrades', guided ? null : UPGRADE_IDS.some((id) => A.checkUpgrade(s, id).ok) || null);
    const restingNeedsStation = s.creatures.some((c) => !c.stationId) && !resting;
    badge('build', guided ? null : (restingNeedsStation && STATION_IDS.some((t) => A.checkBuild(s, t).ok)) || null);

    for (const b of BUTTONS) {
      toggleClass(refs[b.id].btn, 'tutorial-pulse', focus.button === b.id && app.ui.sheet !== b.id);
      toggleClass(refs[b.id].btn, 'active', app.ui.sheet === b.id);
    }
  }

  subscribe(update);
  return { update, keys: Object.fromEntries(BUTTONS.map((b) => [b.key, b.id])) };
}
