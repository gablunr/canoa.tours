import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { legacyRedirects } from './src/data/redirects.ts';
import { builtPageReader } from './src/lib/sitemap.ts';

const builtPage = builtPageReader(new URL('./dist/', import.meta.url));

export default defineConfig({
  site: 'https://canoatours.com',
  trailingSlash: 'never',
  adapter: vercel(),
  integrations: [
    sitemap({
      filter: (pageUrl) => builtPage(pageUrl).isIndexable,
      serialize: (item) => ({ ...item, lastmod: builtPage(item.url).lastModified ?? item.lastmod }),
    }),
  ],
  redirects: legacyRedirects,
  vite: {
    plugins: [tailwindcss()]
  }
});
