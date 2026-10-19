// Short, friendly notifications above the dock.

import { iconImg } from './icons.js';

const MAX_TOASTS = 3;

export function toast(message, kind = 'info', duration = 2600, iconName = null) {
  const layer = document.getElementById('toasts');
  if (!layer || !message) return;
  // Avoid stacking identical messages (e.g. repeated invalid clicks).
  for (const el of layer.children) {
    if (el.dataset.msg === message && !el.classList.contains('out')) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
      clearTimeout(el._timer);
      el._timer = setTimeout(() => dismiss(el), duration);
      return;
    }
  }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.dataset.msg = message;
  el.setAttribute('role', kind === 'warn' ? 'alert' : 'status');
  if (iconName) el.appendChild(iconImg(iconName));
  el.appendChild(document.createTextNode(message));
  layer.prepend(el);
  while (layer.children.length > MAX_TOASTS) layer.lastElementChild.remove();
  el._timer = setTimeout(() => dismiss(el), duration);
}

function dismiss(el) {
  el.classList.add('out');
  setTimeout(() => el.remove(), 300);
}
