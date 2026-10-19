// Builds dist/bugtopia.html: the whole game in one self-contained file that
// opens directly from disk (double-click) with no server needed.
//
//   npm install && npm run build

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const bundle = await build({
  entryPoints: [new URL('src/main.js', root).pathname],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
  legalComments: 'none',
});
// Keep the inline script from closing early if any string contains "</script".
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const css = await read('styles/main.css');
const favicon = await read('assets/favicon.svg');
let html = await read('index.html');

const replaceOnce = (needle, replacement) => {
  if (!html.includes(needle)) throw new Error(`build-single: could not find ${needle}`);
  html = html.replace(needle, () => replacement);
};
replaceOnce('<link rel="stylesheet" href="styles/main.css" />', `<style>\n${css}\n</style>`);
replaceOnce(
  'href="assets/favicon.svg"',
  `href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(favicon.trim())}"`,
);
replaceOnce('<script type="module" src="src/main.js"></script>', `<script>\n${js}\n</script>`);

await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/bugtopia.html', root), html);
console.log(`Built dist/bugtopia.html (${Math.round(html.length / 1024)} KB)`);
