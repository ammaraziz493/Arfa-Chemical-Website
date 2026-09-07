// ============================================================
// SITE CONFIG — editable from the admin panel (src/data/site.json)
// This file only wires the JSON data + helper functions.
// ============================================================
import siteJson from './site.json';

export const SITE = siteJson;

// Pre-built WhatsApp order deep link
export function waLink(message) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const WA_ORDER_TEXT = (product) =>
  `Assalam-o-Alaikum! I am interested in *${product.name}* (${product.pack}) — listed at *Rs. ${product.price.toLocaleString('en-PK')}*. Please share availability and details.`;
