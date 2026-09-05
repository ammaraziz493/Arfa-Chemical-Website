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
  descriptions). Replace with Arfa Chemicals' real range.
- **Contact details** (WhatsApp number, phone, email, address, hours) in `src/data/site.js`
  are placeholders — set `whatsapp` to the real number (international digits only).
- **About page copy** and homepage marketing text are drafts to be reviewed.
- Prices shown as "indicative" — keep that disclaimer unless you guarantee rates.

## Project structure

```
src/
├── data/
│   ├── site.js        ← phone, WhatsApp, email, address, hours
│   └── products.js    ← product catalog + categories (edit to add products)
├── components/        ← Header, Footer, ProductCard, ProductArt (SVG placeholder art), Icon
├── layouts/Layout.astro
├── pages/
│   ├── index.astro            (home)
│   ├── products/index.astro   (catalog with live category filter + search)
│   ├── products/[slug].astro  (one page per product — auto-generated)
│   ├── about.astro  ·  contact.astro  ·  404.astro
└── styles/global.css  (design tokens + all styles)
public/images/logo.png · favicon.png
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

## Notes

- The contact form and every "Order" button compose a pre-filled **WhatsApp message** — no
  backend needed. To change the target number, edit `whatsapp` in `src/data/site.js` only
  (the contact page script reads it automatically).
- Fonts: Manrope (headings) + Inter (body) via Google Fonts; the site still looks correct
  offline with system-font fallbacks.
- Prices/claims: keep the "indicative prices" footer line and the dosage disclaimer on product
  pages — both are honest and already rendered.
