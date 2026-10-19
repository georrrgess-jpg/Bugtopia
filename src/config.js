// Global constants for BUGTOPIA.

export const GAME_ID = 'bugtopia';
export const GAME_TITLE = 'BUGTOPIA';
export const GAME_TAGLINE = 'Tiny Creatures. Big Ambitions.';
export const GAME_VERSION = '0.1.0';

// Save data identifiers. Bump SAVE_VERSION and add a migration in core/save.js
// whenever the shape of the saved state changes.
export const SAVE_KEY = 'bugtopia.save';
export const SETTINGS_KEY = 'bugtopia.settings';
export const SAVE_FORMAT = 'bugtopia-save';
export const SAVE_VERSION = 1;

// Simulation runs in fixed steps (seconds) so production is frame-rate independent.
export const TICK_STEP = 0.1;
// Longest stretch of real time the simulation will catch up in one go
// (e.g. after the browser throttled a background tab).
export const MAX_CATCH_UP = 300;
export const AUTOSAVE_INTERVAL = 10;

export const ORDER_SLOTS = 3;
export const ORDER_SWAP_COOLDOWN = 45;
