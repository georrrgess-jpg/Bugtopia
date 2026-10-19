// Small seeded PRNG (mulberry32). The seed lives in the saved state so
// order generation stays deterministic across save/load.

export function random(state) {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(state, min, max) {
  return min + Math.floor(random(state) * (max - min + 1));
}

export function pick(state, list) {
  return list[Math.floor(random(state) * list.length)];
}
