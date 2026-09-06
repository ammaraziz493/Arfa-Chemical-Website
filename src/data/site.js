// ============================================================
// SITE CONFIG — edit this file to update contact details
// ============================================================
export const SITE = {
  name: 'Arfa Chemicals',
  shortName: 'ARFA',
  tagline: 'Crop Protection & Seeds',
  // WhatsApp number in international format, digits only (no +, spaces, dashes)
  // Call & WhatsApp: 0324 5764838
  whatsapp: '923245764838',
  phoneDisplay: '+92 324 5764838',
  phoneHref: '+923245764838',
  email: 'info@arfachemicals.pk', // PLACEHOLDER — confirm real email
  address: 'China Chowk Industrial Estate, Multan, Punjab, Pakistan',
  hours: 'Mon – Sat: 9:00 AM – 7:00 PM',
};

// Pre-built WhatsApp order deep link
export function waLink(message) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const WA_ORDER_TEXT = (product) =>
  `Assalam-o-Alaikum! I am interested in *${product.name}* (${product.pack}) — listed at *Rs. ${product.price.toLocaleString('en-PK')}*. Please share availability and details.`;
