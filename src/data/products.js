// ============================================================
// PRODUCT CATALOG — data lives in src/data/products.json
// (editable from the admin panel). This module only adds helpers.
// ============================================================
import raw from './products.json';

export const CATEGORIES = raw.categories;
export const PRODUCTS = raw.products;

export function getProduct(slug) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function productsByCategory(categorySlug) {
  return PRODUCTS.filter((p) => p.category === categorySlug);
}

export function relatedProducts(product, limit = 3) {
  const same = PRODUCTS.filter((p) => p.slug !== product.slug && p.category === product.category);
  const rest = PRODUCTS.filter((p) => p.slug !== product.slug && p.category !== product.category);
  return [...same, ...rest].slice(0, limit);
}

// display helpers used across pages
import { C } from './content.js';
export const fmtPrice = (n) => `${C.ui.currency} ${n.toLocaleString('en-PK')}`;
export const catLabel = (slug) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
