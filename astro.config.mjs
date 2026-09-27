import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { legacyRedirects } from './src/data/site/redirects.ts';
import { builtPageReader } from './src/lib/seo/sitemap.ts';
import { satteri } from '@astrojs/markdown-satteri';
import { contentTokensPlugin } from './src/lib/markdown-content-tokens.ts';

const contentTokenSources = ['booking/booking-policy.ts', 'site/company.ts', 'guides/content-tokens.ts', 'tours/departure-ports.ts', 'site/routes.ts'];

const watchContentTokenSources = {
  name: 'watch-content-token-sources',
  hooks: {
    'astro:config:setup': ({ addWatchFile }) => {
      contentTokenSources.forEach((file) => addWatchFile(new URL(`./src/data/${file}`, import.meta.url)));
      ['format.ts', 'markdown-content-tokens.ts'].forEach((file) => addWatchFile(new URL(`./src/lib/${file}`, import.meta.url)));
    },
  },
};

const builtPage = builtPageReader(new URL('./dist/', import.meta.url));

export default defineConfig({
  site: 'https://canoatours.com',
  trailingSlash: 'never',
  adapter: vercel(),
  integrations: [
    watchContentTokenSources,
    sitemap({
      filter: (pageUrl) => builtPage(pageUrl).isIndexable,
      serialize: (item) => ({ ...item, lastmod: builtPage(item.url).lastModified ?? item.lastmod }),
    }),
  ],
  redirects: legacyRedirects,
  markdown: {
    processor: satteri({ mdastPlugins: [contentTokensPlugin] }),
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
