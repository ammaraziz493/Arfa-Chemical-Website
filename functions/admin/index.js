// Cloudflare Pages Functions adapter (repo root, required location).
// Pages calls onRequest(context) — context.request + context.env.
// All real logic lives in the admin package: admin/cloudflare/admin.js
import { handler } from '../../admin/cloudflare/admin.js';

export async function onRequest(context) {
  return handler(context.request, context.env);
}
