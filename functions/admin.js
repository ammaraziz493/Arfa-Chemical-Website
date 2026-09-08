// Cloudflare Pages Functions adapter (repo root, required location).
// All real logic lives in the admin package: admin/cloudflare/admin.js
import { handler } from '../admin/cloudflare/admin.js';

export const onRequest = handler;
