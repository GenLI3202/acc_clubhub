// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: vercel(),

  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'de'],
    routing: {
      prefixDefaultLocale: true,  // /zh/media, /en/media, /de/media
    },
  },

  integrations: [preact()],
});