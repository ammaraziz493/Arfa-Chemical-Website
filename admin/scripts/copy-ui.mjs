// Admin package helper: publishes the admin UI as a static asset of the site.
// Astro copies public/ into the built output, so the UI becomes /admin.html and
// the Cloudflare Pages Function serves it at /admin via env.ASSETS.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'netlify', 'functions', 'ui.html');
const dst = join(here, '..', '..', 'public', 'admin.html');

mkdirSync(dirname(dst), { recursive: true });
writeFileSync(dst, readFileSync(src, 'utf8'));
console.log('admin UI copied -> public/admin.html');
