// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// GitHub Pages serves the site under /<repo>/; other hosts (Cloudflare) serve from the root.
const pages = process.env.GITHUB_PAGES === 'true';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  ...(pages && { site: 'https://silverhawkq.github.io', base: '/Cafe-con-leche' }),
});
