import { defineConfig, envField } from 'astro/config';

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

const builtPage = builtPageReader(
  new URL('./dist/client/', import.meta.url),
  new URL('./.vercel/output/static/', import.meta.url),
  new URL('./dist/', import.meta.url),
);

export default defineConfig({
  site: 'https://canoa.tours',
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
  image: {
    service: {
      config: {
        avif: { quality: 60 },
        webp: { quality: 78 },
        jpeg: { quality: 80, mozjpeg: true },
      },
    },
  },
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'client', access: 'public' }),
      SUPABASE_PUBLISHABLE_KEY: envField.string({ context: 'client', access: 'public' }),
      SUPABASE_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
      STRIPE_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
      STRIPE_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret' }),
      PUBLIC_STRIPE_KEY: envField.string({ context: 'client', access: 'public' }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret' }),
      EMAIL_FROM: envField.string({ context: 'server', access: 'public', default: 'Canoa Tours <reservas@canoa.tours>' }),
      TEAM_EMAIL: envField.string({ context: 'server', access: 'public', default: 'hola@canoa.tours' }),
      CRON_SECRET: envField.string({ context: 'server', access: 'secret' }),
      TICKET_SIGNING_SECRET: envField.string({ context: 'server', access: 'secret' }),
      VERCEL_DEPLOY_HOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  markdown: {
    processor: satteri({ mdastPlugins: [contentTokensPlugin] }),
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
