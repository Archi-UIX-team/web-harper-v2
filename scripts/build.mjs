import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
// Local sprite uses the official Iconify Lucide icon data, without runtime network requests.
const iconData = JSON.parse(await readFile(new URL('../node_modules/@iconify-json/lucide/icons.json', import.meta.url), 'utf8'));
const journalIcons = ['arrow-up-right', 'arrow-left', 'arrow-right'];
await writeFile(new URL('assets/journal-icons.svg', root), `<svg xmlns="http://www.w3.org/2000/svg">${journalIcons.map(name => `<symbol id="${name}" viewBox="0 0 24 24">${iconData.icons[name].body}</symbol>`).join('')}</svg>`);

const output = new URL('dist/', root);
await build({ entryPoints: [new URL('src/hero/index.jsx', root).pathname], outfile: new URL('hero-carousel.js', root).pathname,
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020', jsx: 'automatic' });
await build({ entryPoints: [new URL('src/offers/index.jsx', root).pathname], outfile: new URL('offers-pixel.js', root).pathname,
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020', jsx: 'automatic' });
await build({ entryPoints: [new URL('src/animated-content/index.js', root).pathname], outfile: new URL('animated-content.js', root).pathname,
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020' });
await build({ entryPoints: [new URL('src/section-motion/index.js', root).pathname], outfile: new URL('section-motion.js', root).pathname,
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020' });
await build({ entryPoints: [new URL('src/entrance/index.js', root).pathname], outfile: new URL('entrance.js', root).pathname,
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020' });
await build({ entryPoints: [new URL('src/header/index.jsx', root).pathname], outfile: new URL('header-nav.js', root).pathname,
  bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020', jsx: 'automatic' });
const assets = ['header-nav.js', 'header-nav.css', 'responsive-refinements.css', 'hero-contour.css', 'mobile-layout.css', 'mobile-layout.js', 'styles.css', 'hero-carousel.css', 'main.js', 'reels.js', 'booking.js', 'hero-carousel.js', 'offers-pixel.js', 'offers-pixel.css', 'scroll-blur.js', 'animated-content.js', 'section-motion.js', 'entrance.js'];
let html = await readFile(new URL('index.html', root), 'utf8');
for (const name of assets) {
  const content = await readFile(new URL(name, root));
  const version = createHash('sha256').update(content).digest('hex').slice(0, 12);
  const escaped = name.replaceAll('.', '\\.');
  html = html.replace(new RegExp(`(\\./${escaped})(?:\\?v=[a-zA-Z0-9_-]+)?`, 'g'), `$1?v=${version}`);
}
// Pages publishes the repository root; keep it and dist on the same asset versions.
await writeFile(new URL('index.html', root), html);
await mkdir(output, { recursive: true });
for (const name of ['index.html', ...assets]) {
  await cp(new URL(name, root), new URL(name, output));
}
await cp(new URL('assets/', root), new URL('assets/', output), { recursive: true });
await cp(new URL('news/', root), new URL('news/', output), { recursive: true });
await cp(new URL('data/', root), new URL('data/', output), { recursive: true });
await writeFile(new URL('.nojekyll', output), '');
console.log('Built static site with content-versioned CSS and JavaScript in dist/');
