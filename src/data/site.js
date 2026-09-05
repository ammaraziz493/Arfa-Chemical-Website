// ============================================================
// SITE CONFIG — edit this file to update contact details
// ============================================================
export const SITE = {
  name: 'Arfa Chemicals',
  shortName: 'ARFA',
  tagline: 'Crop Nutrition & Protection',
  // WhatsApp number in international format, digits only (no +, spaces, dashes)
  whatsapp: '923001234567',
  phoneDisplay: '+92 300 1234567',
  phoneHref: '+923001234567',
  email: 'info@arfachemicals.pk',
  address: 'Main G.T. Road, Faisalabad, Punjab, Pakistan',
  hours: 'Mon – Sat: 9:00 AM – 7:00 PM',
};

// Pre-built WhatsApp order deep link
export function waLink(message) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const WA_ORDER_TEXT = (product) =>
  `Assalam-o-Alaikum! I am interested in *${product.name}* (${product.pack}) — listed at *Rs. ${product.price.toLocaleString('en-PK')}*. Please share availability and details.`;
