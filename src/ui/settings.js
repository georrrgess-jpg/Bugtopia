// Settings window: audio, motion and goal preferences plus game management.

import { GAME_VERSION } from '../config.js';
import { app, updateSettings, saveNow } from '../app.js';
import { h, icon } from './dom.js';
import { openModal } from './dialogs.js';
import { toast } from './toast.js';

let handlers = { toTitle: () => {}, newGame: () => {} };

export function setSettingsHandlers(h2) {
  handlers = { ...handlers, ...h2 };
}

function slider(label, iconName, key) {
  const id = `set-${key}`;
  const out = h('output', { for: id });
  const input = h('input', { id, type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(app.settings[key] * 100)) });
  const sync = () => {
    out.textContent = `${input.value}%`;
  };
  input.addEventListener('input', () => {
    sync();
    updateSettings({ [key]: Number(input.value) / 100 });
  });
  sync();
  return h('div', { class: 'setting' }, icon(iconName), h('label', { for: id, text: label }), out, h('span'), input);
}

function toggle(label, note, key) {
  const btn = h('button', {
    class: 'switch',
    type: 'button',
    role: 'switch',
    'aria-checked': String(!!app.settings[key]),
    'aria-label': label,
  });
  btn.addEventListener('click', () => {
    const value = !app.settings[key];
    btn.setAttribute('aria-checked', String(value));
    updateSettings({ [key]: value });
  });
  return h('div', { class: 'setting toggle-setting' }, h('label', {}, label, h('small', { text: note })), btn);
}

export function openSettings(inGame) {
  openModal((panel, close) => {
    panel.append(
      h('h2', { text: 'Settings' }),
      slider('Music', 'music', 'musicVolume'),
      slider('Sound effects', 'sound', 'sfxVolume'),
      toggle('Mute all audio', 'Silence music and sound effects.', 'muted'),
      toggle('Reduce motion', 'Fewer particles and calmer animations.', 'reduceMotion'),
      toggle('Show goals', 'Show the goal card and tutorial pointers.', 'showGoals'),
    );
    if (inGame) {
      panel.append(
        h(
          'div',
          { class: 'stack' },
          h(
            'button',
            {
              class: 'btn btn-secondary',
              type: 'button',
              onclick: () => {
                if (saveNow()) toast('Game saved.', 'good', 1800);
              },
            },
            'Save now',
          ),
          h(
            'button',
            {
              class: 'btn btn-secondary',
              type: 'button',
              onclick: () => {
                close(true);
                handlers.toTitle();
              },
            },
            'Save & return to title',
          ),
          h(
            'button',
            {
              class: 'btn btn-danger',
              type: 'button',
              onclick: () => {
                close(true);
                handlers.newGame();
              },
            },
            'Start a new game…',
          ),
        ),
      );
    }
    panel.append(
      h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => close(true) }, 'Done')),
      h('p', { class: 'modal-foot', text: `BUGTOPIA v${GAME_VERSION} · Progress saves automatically in this browser.` }),
    );
  });
}
