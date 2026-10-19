// Hand-drawn SVG icons. They are used as <img> data URLs in the interface
// and as images on the workshop canvas, so items look identical everywhere.

const svg = (body, vb = '0 0 32 32') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

export const ICONS = {
  acorn: svg(`
    <path d="M16 29.5c-6.2 0-9.8-5.2-9.8-10.8V15h19.6v3.7c0 5.6-3.6 10.8-9.8 10.8z" fill="#d98b3a"/>
    <path d="M12.2 22.5c.4 2.8 1.9 4.6 3.8 5" stroke="#f7c27a" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M4.3 15.6C4.3 10.2 9.4 7 16 7s11.7 3.2 11.7 8.6c0 1-.9 1.6-2 1.6H6.3c-1.1 0-2-.6-2-1.6z" fill="#7a4a24"/>
    <path d="M8 12.6l2.6 2.6M12 10.4l3.6 3.6M17 9.8l3.6 3.6M22 11.2l2.6 2.6" stroke="#5a3418" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M16 7.2c0-2.2 1.1-3.7 3.2-4.7" stroke="#5a3418" stroke-width="2.3" fill="none" stroke-linecap="round"/>`),

  mossFiber: svg(`
    <g fill="none" stroke-linecap="round" stroke-width="3.2">
      <path d="M9.5 27.5C8.4 20.5 12.4 15 10.2 6.5" stroke="#4f9b34"/>
      <path d="M16 28.5c0-8 3.2-12.5 1-22" stroke="#86cc5c"/>
      <path d="M22.5 27.5c1-7.2-2.2-12.2 2-20" stroke="#64b544"/>
    </g>
    <rect x="6.5" y="16.5" width="19" height="5" rx="2.4" fill="#b07a3e"/>
    <rect x="6.5" y="16.5" width="19" height="2" rx="1" fill="#cf9a5a"/>
    <circle cx="10.2" cy="6.4" r="2.8" fill="#a7e07a"/>
    <circle cx="17" cy="6.2" r="2.8" fill="#c6f19a"/>
    <circle cx="24.4" cy="7.4" r="2.8" fill="#a7e07a"/>`),

  nectarDrop: svg(`
    <defs><radialGradient id="n" cx=".38" cy=".55" r=".7"><stop offset="0" stop-color="#ffe98a"/><stop offset=".55" stop-color="#ffbf2e"/><stop offset="1" stop-color="#e08a12"/></radialGradient></defs>
    <path d="M16 2.8S6.3 13.8 6.3 20.2a9.7 9.7 0 0 0 19.4 0C25.7 13.8 16 2.8 16 2.8z" fill="url(#n)" stroke="#c4740c" stroke-width="1.2"/>
    <ellipse cx="12.2" cy="19.2" rx="2.2" ry="3.6" fill="#fff8d8" opacity=".85" transform="rotate(20 12.2 19.2)"/>
    <circle cx="13.6" cy="25" r="1.1" fill="#fff8d8" opacity=".6"/>`),

  nectarWeave: svg(`
    <rect x="4.5" y="8" width="21" height="17.5" rx="3" fill="#f0a24f"/>
    <path d="M4.5 12.4h21M4.5 16.8h21M4.5 21.2h21" stroke="#79c257" stroke-width="2.1"/>
    <path d="M9.6 8v17.5M15 8v17.5M20.4 8v17.5" stroke="#ffd768" stroke-width="2.1" opacity=".9"/>
    <rect x="4.5" y="8" width="21" height="17.5" rx="3" fill="none" stroke="#9c5a24" stroke-width="2"/>
    <path d="M25.5 10.5c3.4.6 3.4 13.4 0 14" fill="#d98236" stroke="#9c5a24" stroke-width="1.6"/>
    <path d="M24 2.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="#fff4b8"/>`),

  build: svg(`
    <rect x="12.5" y="12" width="5" height="18" rx="2" fill="#b07a3e" transform="rotate(-38 15 21)"/>
    <path d="M6 9.5l7.5-6.2c1.2-1 3-.9 4.1.2l7.6 7.6-4.2 4.2-4.6-3.4-6 6z" fill="#8d9aa6" stroke="#566370" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M17.6 3.5l7.6 7.6" stroke="#c4ced8" stroke-width="1.6" stroke-linecap="round"/>`),

  creatures: svg(`
    <ellipse cx="16" cy="28" rx="10" ry="2.4" fill="#000" opacity=".2"/>
    <circle cx="16" cy="18" r="10.5" fill="#7fc95a"/>
    <path d="M6 15c1.5-6.5 6.3-9.5 10-9.5s8.5 3 10 9.5c-3-2.2-6.3-3.2-10-3.2S9 12.8 6 15z" fill="#3f8f35"/>
    <circle cx="12.3" cy="18.6" r="2.8" fill="#fff"/><circle cx="19.7" cy="18.6" r="2.8" fill="#fff"/>
    <circle cx="12.8" cy="19" r="1.6" fill="#2a1e14"/><circle cx="20.2" cy="19" r="1.6" fill="#2a1e14"/>
    <path d="M13.5 23.2c1.6 1.3 3.4 1.3 5 0" stroke="#2a4a1e" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M16 6c.5-2.4 2.4-3.6 4.6-3.4-.4 2.4-2.2 3.6-4.6 3.4z" fill="#a7e07a"/>`),

  market: svg(`
    <rect x="6" y="15" width="20" height="13" rx="1.5" fill="#b07a3e"/>
    <rect x="9" y="19" width="6" height="9" fill="#7a4a24"/>
    <rect x="17.5" y="19" width="6" height="5" rx="1" fill="#ffe9a8"/>
    <path d="M3.5 9.5L7 4h18l3.5 5.5z" fill="#e05a4a"/>
    <path d="M3.5 9.5h25v3.2a3.1 3.1 0 0 1-6.2 0 3.1 3.1 0 0 1-6.3 0 3.1 3.1 0 0 1-6.3 0 3.1 3.1 0 0 1-6.2 0z" fill="#fff4dc"/>
    <path d="M9.7 9.5v3.2a3.1 3.1 0 0 1-6.2 0V9.5zM22.3 9.5v3.2a3.1 3.1 0 0 0 6.2 0V9.5zM16 9.5v3.2a3.1 3.1 0 0 1-6.3 0V9.5z" fill="#e05a4a"/>
    <path d="M10 4l-.5 5.5M16 4v5.5M22 4l.5 5.5" stroke="#fff4dc" stroke-width="2.2"/>`),

  upgrades: svg(`
    <circle cx="16" cy="17" r="11" fill="#8a5a32"/>
    <circle cx="16" cy="17" r="8.4" fill="#f2c14e"/>
    <path d="M16 10.5l5.5 6.2h-3.4V23h-4.2v-6.3h-3.4z" fill="#fff8e0" stroke="#b07a1e" stroke-width="1" stroke-linejoin="round"/>
    <path d="M16 3.6v2.6M16 27.8v2.6M2.6 17h2.6M26.8 17h2.6M6.5 7.5l1.9 1.9M23.6 24.6l1.9 1.9M6.5 26.5l1.9-1.9M23.6 9.4l1.9-1.9" stroke="#8a5a32" stroke-width="2.6" stroke-linecap="round"/>`),

  settings: svg(`
    <path d="M16 4.5l2.2.3.7 3a8.7 8.7 0 0 1 2.4 1.4l2.9-1 1.6 1.6-1 2.9c.6.7 1.1 1.5 1.4 2.4l3 .7.3 2.2-.3 2.2-3 .7c-.3.9-.8 1.7-1.4 2.4l1 2.9-1.6 1.6-2.9-1c-.7.6-1.5 1.1-2.4 1.4l-.7 3-2.2.3-2.2-.3-.7-3a8.7 8.7 0 0 1-2.4-1.4l-2.9 1-1.6-1.6 1-2.9a8.7 8.7 0 0 1-1.4-2.4l-3-.7L4.5 18l.3-2.2 3-.7c.3-.9.8-1.7 1.4-2.4l-1-2.9 1.6-1.6 2.9 1c.7-.6 1.5-1.1 2.4-1.4l.7-3z" fill="#d8c3a0" stroke="#7a5a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="16" cy="18" r="4.2" fill="#7a5a3a"/>`),

  close: svg(`<path d="M9 9l14 14M23 9L9 23" stroke="#7a4a24" stroke-width="3.4" stroke-linecap="round"/>`),

  lock: svg(`
    <path d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14" fill="none" stroke="#8a7a68" stroke-width="3"/>
    <rect x="7" y="13.5" width="18" height="14" rx="3" fill="#b8a48a" stroke="#7a6a58" stroke-width="1.4"/>
    <circle cx="16" cy="19.6" r="2" fill="#5a4a3a"/><rect x="15.1" y="20" width="1.8" height="4" rx=".9" fill="#5a4a3a"/>`),

  swap: svg(`
    <path d="M7 12.5a9.5 9.5 0 0 1 16.5-4.2" fill="none" stroke="#7a5a3a" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M25 3.5v6.2h-6.2" fill="none" stroke="#7a5a3a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M25 19.5a9.5 9.5 0 0 1-16.5 4.2" fill="none" stroke="#7a5a3a" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M7 28.5v-6.2h6.2" fill="none" stroke="#7a5a3a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`),

  check: svg(`<circle cx="16" cy="16" r="13" fill="#6cbf4a"/><path d="M9.5 16.5l4.4 4.4 8.6-9" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`),

  star: svg(`<path d="M16 3.5l3.7 7.6 8.3 1.2-6 5.9 1.4 8.3-7.4-3.9-7.4 3.9 1.4-8.3-6-5.9 8.3-1.2z" fill="#ffd34a" stroke="#d08a1a" stroke-width="1.4" stroke-linejoin="round"/>`),

  gear: svg(`
    <path d="M16 3l2.4.6.5 3.1c1 .3 1.9.8 2.7 1.5l2.9-1.2 1.7 1.7-1.2 2.9c.7.8 1.2 1.7 1.5 2.7l3.1.5.6 2.4-.6 2.4-3.1.5c-.3 1-.8 1.9-1.5 2.7l1.2 2.9-1.7 1.7-2.9-1.2c-.8.7-1.7 1.2-2.7 1.5l-.5 3.1L16 29l-2.4-.6-.5-3.1c-1-.3-1.9-.8-2.7-1.5l-2.9 1.2-1.7-1.7 1.2-2.9c-.7-.8-1.2-1.7-1.5-2.7l-3.1-.5L3 16l.6-2.4 3.1-.5c.3-1 .8-1.9 1.5-2.7L7 7.5l1.7-1.7 2.9 1.2c.8-.7 1.7-1.2 2.7-1.5l.5-3.1z" fill="#e0b25a" stroke="#8a5a1e" stroke-width="1.3" stroke-linejoin="round"/>
    <circle cx="16" cy="16" r="4.4" fill="#8a5a1e"/>
    <path d="M12 23.5l7.5-12" stroke="#fff3c4" stroke-width="2.4" stroke-linecap="round"/><path d="M16.5 10.8l3 .7-.7 3" fill="none" stroke="#fff3c4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`),

  crate: svg(`
    <path d="M5 11l11-5 11 5-11 5z" fill="#d6a064"/>
    <path d="M5 11v12l11 5V16z" fill="#a8703a"/>
    <path d="M27 11v12l-11 5V16z" fill="#8a5a2c"/>
    <path d="M5 15.5l11 5M5 19.5l11 5M27 15.5l-11 5M27 19.5l-11 5" stroke="#6e4422" stroke-width="1" opacity=".6"/>
    <path d="M5 11l11 5 11-5M16 16v12" stroke="#5a3418" stroke-width="1.3" fill="none"/>`),

  expand: svg(`
    <rect x="9" y="9" width="14" height="14" rx="1.5" fill="#c08a55" stroke="#7a4a24" stroke-width="1.4"/>
    <path d="M9 13.7h14M9 18.3h14" stroke="#9a6838" stroke-width="1"/>
    <path d="M3.5 9V3.5H9M23 3.5h5.5V9M28.5 23v5.5H23M9 28.5H3.5V23" fill="none" stroke="#5aa43a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`),

  music: svg(`<path d="M12 24V8.5l13-3V21" fill="none" stroke="#7a5a3a" stroke-width="2.6" stroke-linejoin="round"/><ellipse cx="9" cy="24.5" rx="4" ry="3.2" fill="#7a5a3a"/><ellipse cx="22" cy="21.5" rx="4" ry="3.2" fill="#7a5a3a"/>`),

  sound: svg(`<path d="M5 12.5h5l6.5-5.5v18L10 19.5H5z" fill="#7a5a3a"/><path d="M20.5 11.5a6.5 6.5 0 0 1 0 9M24 8a11 11 0 0 1 0 16" fill="none" stroke="#7a5a3a" stroke-width="2.4" stroke-linecap="round"/>`),

  clock: svg(`<circle cx="16" cy="16" r="12" fill="#fff4dc" stroke="#7a5a3a" stroke-width="2.4"/><path d="M16 9v7.5l5 3" fill="none" stroke="#7a5a3a" stroke-width="2.4" stroke-linecap="round"/>`),

  flame: svg(`<path d="M16 3c1 5 7 7.5 7 15a7 7 0 0 1-14 0c0-4 2-6 3.5-7.5 0 3 1.5 4.5 3 4.5C14 11 14.5 7 16 3z" fill="#ff8a3a"/><path d="M16 15c.5 2.5 3.5 3.5 3.5 7a3.5 3.5 0 0 1-7 0c0-2.5 2-3.5 3.5-7z" fill="#ffd25a"/>`),
};

const urlCache = new Map();

export function iconUrl(name) {
  if (!urlCache.has(name)) {
    urlCache.set(name, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ICONS[name].trim())}`);
  }
  return urlCache.get(name);
}

export function iconImg(name, className = 'icon', alt = '') {
  const img = document.createElement('img');
  img.src = iconUrl(name);
  img.className = className;
  img.alt = alt;
  img.draggable = false;
  return img;
}

const imageCache = new Map();

// Image objects for drawing icons on the canvas.
export function iconImage(name) {
  if (!imageCache.has(name)) {
    const img = new Image();
    img.src = iconUrl(name);
    imageCache.set(name, img);
  }
  return imageCache.get(name);
}
