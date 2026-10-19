// Small DOM helpers.

import { iconImg } from './icons.js';

// h('div', { class: 'x', onclick: fn, text: 'hi' }, child, ...)
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'style') Object.assign(el.style, value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

// Only touch the DOM when a value actually changes.
export function setText(el, value) {
  const s = String(value);
  if (el.textContent !== s) el.textContent = s;
}

export function toggleClass(el, cls, on) {
  if (el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on);
}

export const fmt = (n) => Math.floor(n).toLocaleString('en-US');

export const icon = (name, cls = 'icon') => iconImg(name, cls);

// A price tag: "🌰 120"
export function price(amount) {
  return h('span', { class: 'price' }, icon('acorn'), fmt(amount));
}

// Restart a CSS animation class on an element.
export function replay(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// A button for an action that may be unavailable. When unavailable it stays
// clickable and explains why instead of doing nothing.
export function actionButton({ label, kind = 'btn-primary', small = false, check, onClick, title }) {
  const btn = h('button', { class: `btn ${kind}${small ? ' btn-small' : ''}`, type: 'button', title });
  btn.dataset.kind = kind;
  const setLabel = (content) => {
    clear(btn);
    append(btn, Array.isArray(content) ? content : [content]);
  };
  setLabel(label);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const result = check ? check() : { ok: true };
    if (result.ok) onClick(e);
    else btn.dispatchEvent(new CustomEvent('unavailable', { detail: result }));
  });
  btn.update = () => {
    const result = check ? check() : { ok: true };
    toggleClass(btn, 'is-unavailable', !result.ok);
    btn.setAttribute('aria-disabled', result.ok ? 'false' : 'true');
    btn.title = result.ok ? title || '' : result.reason || '';
    return result;
  };
  btn.setLabel = setLabel;
  return btn;
}

export function confettiAt(x, y, count = 26) {
  if (document.body.classList.contains('reduce-motion')) return;
  const colors = ['#ffd34a', '#8fd16a', '#ff9ec4', '#f2683a', '#9ad8e8', '#fff4dc'];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    const a = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 110;
    c.style.left = `${x}px`;
    c.style.top = `${y}px`;
    c.style.background = colors[i % colors.length];
    c.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    c.style.setProperty('--dy', `${Math.sin(a) * d + 60}px`);
    c.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    c.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1600);
  }
}
