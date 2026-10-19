// Modal dialogs (confirmations and the settings window).

import { h, icon } from './dom.js';
import { audio } from '../audio/audio.js';

let openCount = 0;

export function isModalOpen() {
  return openCount > 0;
}

export function openModal(build, { onClose } = {}) {
  const layer = document.getElementById('modal-layer');
  const panel = h('div', { class: 'modal panel', role: 'dialog', 'aria-modal': 'true' });
  const backdrop = h('div', { class: 'modal-backdrop' }, panel);
  let closed = false;
  const close = (value) => {
    if (closed) return;
    closed = true;
    openCount--;
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    audio.play('close');
    onClose?.(value);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close(false);
    }
  };
  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop) close(false);
  });
  document.addEventListener('keydown', onKey, true);
  build(panel, close);
  layer.appendChild(backdrop);
  openCount++;
  audio.play('open');
  panel.querySelector('button:not(.switch), input')?.focus({ preventScroll: true });
  return close;
}

export function confirmDialog({ title, text, confirmText = 'OK', cancelText = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    openModal(
      (panel, close) => {
        panel.append(
          h('h2', { text: title }),
          ...[].concat(text).map((t) => h('p', { text: t })),
          h(
            'div',
            { class: 'btn-row' },
            h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => close(false) }, cancelText),
            h(
              'button',
              { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button', onclick: () => close(true) },
              confirmText,
            ),
          ),
        );
      },
      { onClose: (v) => resolve(v === true) },
    );
  });
}

export { icon };
