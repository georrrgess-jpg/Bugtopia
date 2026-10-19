// Top bar: Acorn balance, stored resources and the settings button.

import { ITEMS, ITEM_IDS } from '../data/items.js';
import { on } from '../core/events.js';
import { capacityPerItem, itemVisible } from '../core/rules.js';
import { app, subscribe } from '../app.js';
import { h, icon, fmt, setText, toggleClass, replay } from './dom.js';
import { openSheet } from './sheets.js';
import { openSettings } from './settings.js';

export function createHud() {
  const root = document.getElementById('hud');
  const acornVal = h('span', { class: 'val' }, '0');
  const acorns = h('div', { class: 'hud-pill acorns', title: 'Acorns', role: 'status' }, icon('acorn'), acornVal);
  const chips = {};
  const items = h('div', { class: 'hud-items' });
  for (const id of ITEM_IDS) {
    const val = h('span', { class: 'val' }, '0');
    const cap = h('span', { class: 'cap' }, '/0');
    const chip = h(
      'button',
      {
        class: 'hud-pill hud-chip',
        type: 'button',
        title: `${ITEMS[id].plural} — open the Market`,
        onclick: () => openSheet('market'),
      },
      icon(id),
      val,
      cap,
    );
    chips[id] = { chip, val, cap };
    items.append(chip);
  }
  const saveInd = h('span', { class: 'save-indicator' }, 'Saved ✓');
  const settingsBtn = h(
    'button',
    { class: 'icon-btn', type: 'button', title: 'Settings', 'aria-label': 'Settings', onclick: () => openSettings(true) },
    icon('settings'),
  );
  root.append(h('div', { class: 'hud-brand' }, 'BUGTOPIA'), acorns, items, h('div', { class: 'hud-spacer' }), saveInd, settingsBtn);

  function update() {
    const s = app.state;
    if (!s) return;
    setText(acornVal, fmt(s.acorns));
    const cap = capacityPerItem(s);
    for (const id of ITEM_IDS) {
      const c = chips[id];
      const visible = itemVisible(s, id);
      if (c.chip.hidden === visible) c.chip.hidden = !visible;
      setText(c.val, fmt(s.inventory[id]));
      setText(c.cap, `/${cap}`);
      toggleClass(c.chip, 'full', s.inventory[id] >= cap);
    }
  }

  subscribe((reason) => {
    if (reason === 'saved') {
      saveInd.classList.add('show');
      clearTimeout(saveInd._t);
      saveInd._t = setTimeout(() => saveInd.classList.remove('show'), 1500);
    }
    update();
  });

  on((e) => {
    if (!app.state || app.screen !== 'game') return;
    if (e.type === 'produced' || e.type === 'crafted') {
      // Bump once the flying item lands in storage.
      const c = chips[e.item];
      if (c) setTimeout(() => replay(c.chip, 'bump'), e.type === 'crafted' ? 900 : 700);
    }
    if (e.type === 'acorns' && e.delta) {
      replay(acorns, 'bump');
      const d = h('span', { class: `delta ${e.delta > 0 ? 'plus' : 'minus'}` }, `${e.delta > 0 ? '+' : '−'}${fmt(Math.abs(e.delta))}`);
      acorns.append(d);
      setTimeout(() => d.remove(), 1200);
    }
  });

  return { update };
}
