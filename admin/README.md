# Arfa Chemicals — Admin panel (admin/ package)

Everything admin-related lives in this folder so the website source stays clean:

```
admin/
├── package.json                 ← the admin "package" (no external deps)
├── README.md                    ← this file
└── netlify/functions/
    ├── admin.mjs                ← Netlify serverless function (password gate + GitHub commits)
    └── ui.html                  ← the admin interface (served by the function, embedded UI)
```

The website only knows about it through **two small lines at the repo root**:
`netlify.toml` (points Netlify at this function folder) and a redirect that maps
`/admin` → the function.

## How it works
1. You open **`https://arfachemicals.dpdns.org/admin`**
2. Type the admin password → the function checks it **on the server** (never in the browser)
3. The panel loads the live content from your GitHub repo (`src/data/*.json`)
4. You edit any text or manage products → **Save** commits the JSON back to GitHub
5. Netlify auto-rebuilds → the site updates in ~1 minute

## One-time setup (Netlify environment variables)
Netlify → your site → **Site configuration → Environment variables** — add:

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | The password you type at `/admin` (use something strong) |
| `GITHUB_TOKEN` | GitHub Personal Access Token — see below |
| `GITHUB_REPO` | `yourusername/arfa-chemicals` (owner + repo name) |
| `GITHUB_BRANCH` | *(optional — defaults to `main`)* |

> Changing the password later = just update `ADMIN_PASSWORD` in Netlify. No redeploy needed
> (Netlify restarts functions with the new env value automatically).

### Creating the GitHub token (GITHUB_TOKEN)
1. GitHub → Settings → **Developer settings → Personal access tokens → Fine-grained tokens** → *Generate new token*
2. Repository access: **Only select repositories** → your site repo
3. Permissions → **Contents: Read and write**
4. Create → copy the token (shown once) → paste into Netlify as `GITHUB_TOKEN`

## Files the admin can edit
| File | What it controls |
|---|---|
| `src/data/content.json` | All website text: homepage, about, product pages, footer, nav, buttons |
| `src/data/products.json` | Product catalog: categories, products (add / edit / delete) |
| `src/data/site.json` | Contact details: WhatsApp, phone, email, address, hours, tagline |

## Security notes (be honest about limits)
- The password and GitHub token are **never sent to the browser** — password goes to the
  function; the token never leaves the server. Wrong-password attempts are rate-limited
  (5 tries → 10-minute lockout per warm instance).
- This is a **single-password admin** suited to a small business site. If you later need
  per-user accounts, audit trails, or an image uploader, the natural upgrade is Supabase
  auth + storage (or Decap CMS) — say the word and I'll migrate.
- The panel is excluded from search: `robots.txt` disallows `/admin`, the page is
  `noindex`, and the function replies with `X-Robots-Tag: noindex`.

## Local testing
```bash
node --check netlify/functions/admin.mjs        # syntax check
node -e "import('./netlify/functions/admin.mjs').then(m=>m.default({httpMethod:'GET'}))"
# prints the UI HTML — proves the function boots
```
Full save/load testing needs the real GitHub token + a repo (they live only in Netlify env).
