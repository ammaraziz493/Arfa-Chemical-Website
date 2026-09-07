// ============================================================
// Arfa Chemicals — Admin (admin package / Netlify function)
// ------------------------------------------------------------
// GET  /admin-password  → serves admin/netlify/functions/ui.html
// POST /admin-password  → action 'state' (read repo files)
//                       → action 'save'  (commit new JSON → Netlify rebuilds)
//
// Secrets live ONLY as Netlify environment variables (never shipped to the browser):
//   ADMIN_PASSWORD  — password to open the panel
//   GITHUB_TOKEN    — Personal Access Token with Contents read+write on the repo
//   GITHUB_REPO     — "owner/repository"
//   GITHUB_BRANCH   — optional, defaults to "main"
// ============================================================
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const UI_PATH = fileURLToPath(new URL('ui.html', import.meta.url));
const UI_CACHE = readFileSync(UI_PATH, 'utf8');

const FILES = {
  'src/data/content.json': 'content',
  'src/data/products.json': 'products',
  'src/data/site.json': 'site',
};
const GH_API = 'https://api.github.com';

function env(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing Netlify environment variable: ${name}`);
  return v;
}

const sha256 = (s) => createHash('sha256').update(String(s ?? '')).digest('hex');
function passwordOk(given) {
  const expected = env('ADMIN_PASSWORD'); // clear 500 if not configured
  const a = Buffer.from(sha256(given), 'hex');
  const b = Buffer.from(sha256(expected), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// crude in-memory brute-force brake (per warm function instance)
let fails = 0;
let lockUntil = 0;
function gate() {
  if (Date.now() < lockUntil) throw new Error('Too many attempts — try again in 10 minutes.');
}
function noteFail() {
  fails += 1;
  if (fails >= 5) {
    lockUntil = Date.now() + 10 * 60 * 1000;
    fails = 0;
  }
}
function noteOk() {
  fails = 0;
  lockUntil = 0;
}

async function gh(path, token, opts = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'arfa-admin',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data && typeof data === 'object' && data.message ? data.message : `GitHub HTTP ${res.status}`;
    throw new Error(`${msg}${res.status === 401 ? ' (check GITHUB_TOKEN scope: repo Contents read+write)' : ''}`);
  }
  return data;
}

async function readRepoFile(path, token, repo, branch) {
  const data = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURI(branch)}`, token);
  return { sha: data.sha, text: Buffer.from(data.content, 'base64').toString('utf8') };
}

// structural merge: new values win, but anything the new payload lacks keeps its
// current value — a bad admin edit can never delete keys and break the build
function mergeDeep(base, extra) {
  if (extra === null || extra === undefined) return base;
  if (Array.isArray(base) && Array.isArray(extra)) return extra;
  if (typeof base === 'object' && typeof extra === 'object' && !Array.isArray(base) && !Array.isArray(extra)) {
    const out = { ...base };
    for (const k of Object.keys(extra)) out[k] = mergeDeep(base[k], extra[k]);
    return out;
  }
  return extra;
}

function normalizeProducts(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.products)) {
    throw new Error('Products file must look like { "categories": [...], "products": [...] }');
  }
  const cats = Array.isArray(data.categories) && data.categories.length
    ? data.categories
        .map((c) => ({ slug: String(c.slug || '').trim(), name: String(c.name || c.slug || '') }))
        .filter((c) => c.slug)
    : [{ slug: 'general', name: 'General' }];
  const valid = cats.map((c) => c.slug);
  const seen = new Set();
  const slugify = (s) =>
    String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const products = data.products.map((p, i) => {
    let slug = slugify(p.slug) || slugify(p.name) || `product-${i + 1}`;
    if (seen.has(slug)) slug = `${slug}-${i + 1}`;
    seen.add(slug);
    const badge = p.badge === 'Hot' || p.badge === 'Best Seller' ? p.badge : null;
    return {
      slug,
      name: String(p.name || slug),
      category: valid.includes(p.category) ? p.category : valid[0],
      pack: String(p.pack ?? ''),
      price: Number(p.price) || 0,
      badge,
      featured: Boolean(p.featured),
      short: String(p.short ?? ''),
      description: (Array.isArray(p.description) ? p.description : []).map(String),
      crops: (Array.isArray(p.crops) ? p.crops : []).map(String),
    };
  });
  return { categories: cats, products };
}

function normalizeFile(path, parsed) {
  if (path.endsWith('products.json')) return normalizeProducts(parsed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('File content must be a JSON object');
  }
  return parsed;
}

async function handleState(token, repo, branch) {
  const files = {};
  const shas = {};
  for (const [path, key] of Object.entries(FILES)) {
    const { sha, text } = await readRepoFile(path, token, repo, branch);
    shas[path] = sha;
    files[key] = JSON.parse(text);
  }
  return { files, shas };
}

async function handleSave(token, repo, branch, body) {
  const incoming = body && typeof body.files === 'object' ? body.files : {};
  const paths = Object.keys(incoming).filter((p) => FILES[p]);
  if (!paths.length) throw new Error('Nothing to save — supply at least one known file path.');
  const committed = [];
  const newShas = {};
  for (const path of paths) {
    const parsed = normalizeFile(path, incoming[path]);
    let merged;
    if (path.endsWith('products.json')) {
      merged = parsed; // products are normalized wholesale
    } else {
      const current = await readRepoFile(path, token, repo, branch).catch(() => ({ sha: null, text: '{}' }));
      merged = mergeDeep(JSON.parse(current.text || '{}'), parsed);
    }
    const content = Buffer.from(JSON.stringify(merged, null, 2) + '\n', 'utf8').toString('base64');
    const sha = body.shas && body.shas[path] ? body.shas[path] : (await readRepoFile(path, token, repo, branch).catch(() => ({ sha: null }))).sha;
    const put = await gh(`/repos/${repo}/contents/${encodeURI(path)}`, token, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Admin update ${path}`,
        content,
        sha: sha || undefined,
      }),
    });
    if (put && put.content && put.content.sha) newShas[path] = put.content.sha;
    committed.push(path);
  }
  return {
    committed,
    shas: newShas,
    note: 'Committed to GitHub — Netlify is rebuilding the site (~1 minute).',
  };
}

export default async function handler(event) {
  const respond = (status, body, contentType = 'application/json') => ({
    statusCode: status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
    body: contentType.includes('html') ? body : JSON.stringify(body),
  });

  try {
    if (event.httpMethod === 'GET' || event.httpMethod === undefined) {
      return respond(200, UI_CACHE, 'text/html; charset=utf-8');
    }
    if (event.httpMethod !== 'POST') return respond(405, { ok: false, error: 'Method not allowed' });

    const body = JSON.parse(event.body || '{}');
    const action = body.action;
    if (action !== 'state' && action !== 'save') return respond(400, { ok: false, error: 'Unknown action' });

    gate();
    if (!passwordOk(body.password)) {
      noteFail();
      return respond(401, { ok: false, error: 'Wrong password.' });
    }
    noteOk();

    const token = env('GITHUB_TOKEN');
    const repo = env('GITHUB_REPO');
    const branch = env('GITHUB_BRANCH') || 'main';

    if (action === 'state') {
      const { files, shas } = await handleState(token, repo, branch);
      return respond(200, { ok: true, files, shas });
    }
    const out = await handleSave(token, repo, branch, body);
    return respond(200, { ok: true, ...out });
  } catch (err) {
    const msg = err && err.message ? err.message : 'Unexpected error';
    const status = /Missing Netlify environment variable/.test(msg)
      ? 500
      : /Too many attempts/.test(msg)
        ? 429
        : /Wrong password/.test(msg)
          ? 401
          : 400;
    return respond(status, { ok: false, error: msg });
  }
}
