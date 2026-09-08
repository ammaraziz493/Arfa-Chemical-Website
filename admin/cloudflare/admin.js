// ============================================================
// Arfa Chemicals — Admin handler for Cloudflare Pages Functions
// (lives in the admin/ package; functions/admin.js at the repo
//  root is only a one-line adapter pointing here)
// ------------------------------------------------------------
// GET  /admin  → serves the admin UI (fetched from the static
//                asset /admin.html, published by the build)
// POST /admin  → action 'state' | 'save' | 'image'
//                (reads/writes the GitHub repo → Pages rebuilds)
//
// Cloudflare Pages environment variables (Settings → Variables):
//   ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (default main)
// ============================================================

const GH_API = 'https://api.github.com';
const FILES = {
  'src/data/content.json': 'content',
  'src/data/products.json': 'products',
  'src/data/site.json': 'site',
};

// ---------- small runtime utils (no Node built-ins needed) ----------
function requireEnv(name, env) {
  const v = env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing environment variable: ${name}`);
  return String(v).trim();
}
function b64Encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function b64Decode(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text ?? '')));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
async function passwordOk(given, expected) {
  const [a, b] = [await sha256Hex(given), await sha256Hex(expected)];
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// crude in-memory brute-force brake (per isolate)
let fails = 0;
let lockUntil = 0;
function gate() {
  if (Date.now() < lockUntil) throw new Error('Too many attempts — try again in 10 minutes.');
}

const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });

// ---------- GitHub ----------
async function gh(path, token, opts = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'arfa-admin-cloudflare',
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
    throw new Error(`${msg}${res.status === 401 ? ' (check GITHUB_TOKEN permission: Contents read+write)' : ''}`);
  }
  return data;
}
async function readRepoFile(path, token, repo, branch) {
  const data = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURI(branch)}`, token);
  return { sha: data.sha, text: b64Decode(data.content) };
}

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
    ? data.categories.map((c) => ({ slug: String(c.slug || '').trim(), name: String(c.name || c.slug || '') })).filter((c) => c.slug)
    : [{ slug: 'general', name: 'General' }];
  const valid = cats.map((c) => c.slug);
  const seen = new Set();
  const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const validImage = (p) =>
    typeof p === 'string' && /^\/images\/products\/[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$/i.test(p) ? p : null;
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
      image: validImage(p.image),
    };
  });
  return { categories: cats, products };
}
function normalizeFile(path, parsed) {
  if (path.endsWith('products.json')) return normalizeProducts(parsed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('File content must be a JSON object');
  return parsed;
}

// ---------- admin UI (static asset /admin.html) ----------
const UI_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};
async function serveUi(request, env) {
  let res = null;
  try {
    res = await env.ASSETS.fetch(new URL('/admin.html', request.url));
  } catch {
    res = null;
  }
  if (res && res.status === 200) {
    return new Response(await res.text(), { status: 200, headers: UI_HEADERS });
  }
  const fallback =
    '<!doctype html><meta charset="utf-8"><title>Admin</title><body style="font-family:sans-serif;padding:40px">' +
    '<h2>Admin UI not found</h2><p>Run <code>npm run build</code> (it copies the admin UI to <code>public/admin.html</code>) and redeploy.</p></body>';
  return new Response(fallback, { status: 200, headers: UI_HEADERS });
}

// ---------- actions ----------
async function handleState(env, token, repo, branch) {
  const files = {};
  const shas = {};
  for (const [path, key] of Object.entries(FILES)) {
    const { sha, text } = await readRepoFile(path, token, repo, branch);
    shas[path] = sha;
    files[key] = JSON.parse(text);
  }
  return { files, shas };
}

async function handleSave(env, token, repo, branch, body) {
  const incoming = body && typeof body.files === 'object' ? body.files : {};
  const paths = Object.keys(incoming).filter((p) => FILES[p]);
  if (!paths.length) throw new Error('Nothing to save — supply at least one known file path.');
  const committed = [];
  const newShas = {};
  for (const path of paths) {
    const parsed = normalizeFile(path, incoming[path]);
    let merged;
    if (path.endsWith('products.json')) {
      merged = parsed;
    } else {
      const current = await readRepoFile(path, token, repo, branch).catch(() => ({ sha: null, text: '{}' }));
      merged = mergeDeep(JSON.parse(current.text || '{}'), parsed);
    }
    const content = b64Encode(JSON.stringify(merged, null, 2) + '\n');
    const current = await readRepoFile(path, token, repo, branch).catch(() => ({ sha: null, text: '' }));
    const sha = (body.shas && body.shas[path]) || current.sha;
    const put = await gh(`/repos/${repo}/contents/${encodeURI(path)}`, token, {
      method: 'PUT',
      body: JSON.stringify({ message: `Admin update ${path}`, content, sha: sha || undefined }),
    });
    if (put && put.content && put.content.sha) newShas[path] = put.content.sha;
    committed.push(path);
  }
  return { committed, shas: newShas };
}

async function handleImage(body, env, token, repo, branch) {
  const IMAGE_DIR = 'public/images/products/';
  const URL_DIR = '/images/products/';
  const validName = /^[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$/i;
  const name = String(body.name || '');
  if (!validName.test(name)) throw new Error('Image name must be lowercase letters/numbers/hyphens with .png/.jpg/.jpeg/.webp');
  const repoPath = IMAGE_DIR + name;
  const filePath = `/repos/${repo}/contents/${encodeURI(repoPath)}`;
  const existing = await gh(filePath, token).catch((e) => {
    if (/Not Found/.test(e.message)) return null;
    throw e;
  });
  if (body.remove) {
    if (existing) {
      await gh(filePath, token, {
        method: 'DELETE',
        body: JSON.stringify({ message: `Admin delete image ${repoPath}`, sha: existing.sha }),
      });
    }
    return { removed: true };
  }
  const data = String(body.data || '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error('Image data is not valid base64');
  const size = Math.floor((data.length * 3) / 4);
  if (size > 3 * 1024 * 1024) throw new Error('Image too large after compression (max 3 MB) — try a smaller photo');
  if (size < 100) throw new Error('Image appears empty');
  await gh(filePath, token, {
    method: 'PUT',
    body: JSON.stringify({ message: `Admin image ${repoPath}`, content: data, sha: existing ? existing.sha : undefined }),
  });
  return { path: URL_DIR + name };
}

// ---------- main handler ----------
export async function handler(request, env) {
  try {
    if (request.method === 'GET') return serveUi(request, env);
    if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const action = body.action;
    if (!['state', 'save', 'image'].includes(action)) return json(400, { ok: false, error: 'Unknown action' });

    gate();
    const expected = requireEnv('ADMIN_PASSWORD', env);
    if (!(await passwordOk(body.password, expected))) {
      fails += 1;
      if (fails >= 5) {
        lockUntil = Date.now() + 10 * 60 * 1000;
        fails = 0;
      }
      return json(401, { ok: false, error: 'Wrong password.' });
    }
    fails = 0;
    lockUntil = 0;

    const token = requireEnv('GITHUB_TOKEN', env);
    const repo = requireEnv('GITHUB_REPO', env);
    const branch = requireEnv('GITHUB_BRANCH', env) || 'main';

    if (action === 'state') {
      const { files, shas } = await handleState(env, token, repo, branch);
      return json(200, { ok: true, files, shas });
    }
    if (action === 'image') {
      const out = await handleImage(body, env, token, repo, branch);
      return json(200, { ok: true, ...out });
    }
    const out = await handleSave(env, token, repo, branch, body);
    return json(200, { ok: true, ...out });
  } catch (err) {
    const msg = err && err.message ? err.message : 'Unexpected error';
    const status = /Missing environment variable/.test(msg)
      ? 500
      : /Too many attempts/.test(msg)
        ? 429
        : /Wrong password/.test(msg)
          ? 401
          : 400;
    return json(status, { ok: false, error: msg });
  }
}
