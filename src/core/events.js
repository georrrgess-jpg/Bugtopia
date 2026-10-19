// Tiny event bus. Core logic emits gameplay events (production, sales,
// purchases...) and the renderer, audio and UI react to them.

const listeners = new Set();

export function on(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(type, data = {}) {
  const event = { type, ...data };
  for (const fn of listeners) fn(event);
}
