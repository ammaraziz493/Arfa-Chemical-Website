// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Live production URL — canonical links, OG tags and the sitemap are built from this.
  site: 'https://arfachemicals.dpdns.org',
  output: 'static',
  integrations: [sitemap()],
});
