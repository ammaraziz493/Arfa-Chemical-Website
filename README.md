# Arfa Chemicals — Website

Static product-catalog website for **Arfa Chemicals** (agro inputs: fertilizers, insecticides,
fungicides, seed treatment, biologicals). Built with **Astro** — output is pure HTML/CSS/JS with
**no backend, no database, no server** — deployable on any free static host.

**Logo:** the original `logo ac.jpeg` from this folder is used in the header, footer and favicon
(white-trimmed copy at `public/images/logo.png`). Brand palette (blue `#0a4a8f` wordmark +
green accents) is derived from the logo.

---

## ⚠️ Sample data — replace before going live

- **Products** in `src/data/products.js` are realistic **placeholders** (names, packs, prices,
  descriptions). The real business is **crop protection (insecticides / fungicides / herbicides)
  + seeds** — replace the sample catalog with the actual product range, adding a Herbicides and
  Seeds category in `CATEGORIES` as needed.
- **Email** (`info@arfachemicals.pk`) is a placeholder — confirm the real address or the site
  shows a dead inbox link.
- Homepage marketing copy is drafted copy to review.

### Real details already set (verified)
- Call & WhatsApp: **0324 5764838** (`+92 324 5764838`)
- Address: **China Chowk Industrial Estate, Multan**
- About page: built from the company profile (incorporated 2025, unlisted public company,
  import & sale of agricultural products, crop protection + seeds distribution).

## Admin panel (edit text & products from the browser)

The site ships with a password-protected admin panel — **all its code lives in the
`admin/` package** (`admin/netlify/functions/admin.mjs` + `ui.html`), routed by
`netlify.toml` to **`/admin`**.

Edits commit JSON to the GitHub repo → Netlify rebuilds (~1 min). Needs 3 environment
variables on Netlify: `ADMIN_PASSWORD`, `GITHUB_TOKEN` (fine-grained, Contents read+write),
`GITHUB_REPO` (`owner/repo`). **Full setup: read `admin/README.md` first.**

Editable data files (this is why pages read from JSON now):
- `src/data/content.json` — every piece of site text
- `src/data/products.json` — catalog + categories
- `src/data/site.json` — WhatsApp, phone, email, address, hours

## Project structure

```
src/
├── data/
│   ├── site.json      ← phone, WhatsApp, email, address, hours (admin-editable)
│   ├── products.json  ← product catalog + categories (admin-editable)
│   ├── content.json   ← all site text (admin-editable)
│   ├── site.js        ← thin loader for site.json + waLink helpers
│   ├── products.js    ← thin loader for products.json + catalog helpers
│   └── content.js     ← exports the content object
├── components/        ← Header, Footer, ProductCard, ProductArt (SVG placeholder art), Icon
├── layouts/Layout.astro
├── pages/…
└── styles/global.css
admin/                 ← admin panel package (see admin/README.md)
public/… · netlify.toml · robots.txt · sitemap
```

## Adding / editing a product

Open `src/data/products.js` and add one object to `PRODUCTS`:

```js
{
  slug: 'arfa-my-product',        // unique, lowercase, hyphens
  name: 'Arfa My Product',        // shown on card (the "Arfa" prefix is dropped from the artwork)
  category: 'fertilizers',        // must exist in CATEGORIES
  pack: '5 kg pouch',
  price: 2500,                    // PKR
  badge: 'Hot',                   // 'Hot' | 'Best Seller' | null
  featured: true,                 // true → appears in homepage "Best sellers"
  short: 'One-line description for SEO and detail page.',
  description: ['Benefit one', 'Benefit two', 'Benefit three'],
  crops: ['Wheat', 'Rice'],
}
```

Then rebuild (below). The detail page, related products, category counts and best-seller grid
update automatically.

**Product photos later:** when you have real packaging photos, drop them in `public/images/products/`
and replace the `<ProductArt />` usage in `ProductCard.astro` / `[slug].astro` with an `<img>`.
Until then the SVG pouch artwork keeps cards looking finished.

## Commands

```bash
npm install       # first time only
npm run dev       # local preview at http://localhost:4321
npm run build     # static output → dist/
```

## Deploy (free, no backend)

**Cloudflare Pages (recommended):**
1. Push this folder to a GitHub/GitLab repo.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → connect repo.
3. Build command: `npm run build` · Output directory: `dist`
4. Done — site at `https://<project>.pages.dev`; add a custom domain later (free).

**Netlify:** same steps — Build command `npm run build`, publish directory `dist`.
Netlify's free **Forms** can replace the WhatsApp form if you prefer email delivery.

**Or without git:** `npm run build`, then drag-and-drop the `dist/` folder onto
dash.cloudflare.com → Pages → Create → Direct Upload (or netlify.com/drop).

## Cloudflare Pages (dev branch — Cloudflare support)

Cloudflare support lives **only in the `dev` branch** (main stays on Netlify until cutover).
It works alongside the Netlify version — one codebase, two hosts.

- **Static site**: unchanged Astro build → `dist/`
- **Admin UI**: build step copies `admin/netlify/functions/ui.html` → `public/admin.html`
  (`admin/scripts/copy-ui.mjs`, wired into `package.json` `prebuild`) — served by Pages
  Functions at **`/admin`** via `env.ASSETS`
- **Admin backend**: `functions/admin/index.js` at the repo root is a one-line adapter →
  `admin/cloudflare/admin.js` (full handler: password gate, GitHub commits, product images)
- **Env vars on Cloudflare Pages**: `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_REPO`,
  `GITHUB_BRANCH` — identical names to Netlify
- Production URL is set in `astro.config.mjs` (`https://arfachemicals.me`) — canonical links,
  sitemap and robots all follow it

### Files that are Cloudflare/dev-only (do not merge to main before cutover)
| File | Why |
|---|---|
| `functions/admin/index.js` | new — Cloudflare adapter (doesn't exist on main) |
| `admin/cloudflare/admin.js` | new — Cloudflare handler (doesn't exist on main) |
| `admin/scripts/copy-ui.mjs` | new — UI copy step (doesn't exist on main) |
| `package.json` | `prebuild` copies the admin UI |
| `astro.config.mjs` | `site:` → `arfachemicals.me` (main still points at dpdns) |
| `public/robots.txt` | sitemap URL → `arfachemicals.me` |
| `admin/netlify/functions/ui.html` | admin UI now calls `/admin` (works on both hosts) |


## Notes

- The contact form and every "Order" button compose a pre-filled **WhatsApp message** — no
  backend needed. To change the target number, edit `whatsapp` in `src/data/site.js` only
  (the contact page script reads it automatically).
- Fonts: Manrope (headings) + Inter (body) via Google Fonts; the site still looks correct
  offline with system-font fallbacks.
- Prices/claims: keep the "indicative prices" footer line and the dosage disclaimer on product
  pages — both are honest and already rendered.
