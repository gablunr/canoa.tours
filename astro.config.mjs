import { defineConfig, envField } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { legacyRedirects } from './src/data/site/redirects.ts';
import { builtPageReader, latestReviewDateReader } from './src/lib/seo/sitemap.ts';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
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

const buildStartedAt = new Date().toISOString();

const localEnvFile = new URL('./.env.local', import.meta.url);
const env = { ...(existsSync(localEnvFile) ? parseEnv(readFileSync(localEnvFile, 'utf8')) : {}), ...process.env };

const serverRenderedPageLastModified = {
  'https://canoa.tours/opiniones': latestReviewDateReader(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY),
};

const serverRenderedIndexablePages = Object.keys(serverRenderedPageLastModified);

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
      customPages: serverRenderedIndexablePages,
      filter: (pageUrl) => serverRenderedIndexablePages.includes(pageUrl) || builtPage(pageUrl).isIndexable,
      serialize: async (item) => ({
        ...item,
        lastmod: builtPage(item.url).lastModified ?? (await serverRenderedPageLastModified[item.url]?.()) ?? item.lastmod,
      }),
    }),
  ],
  redirects: legacyRedirects,
  security: {
    actionBodySizeLimit: 4.5 * 1000 * 1000,
  },
  image: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' }],
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
    plugins: [tailwindcss()],
    define: {
      __BUILD_STARTED_AT__: JSON.stringify(buildStartedAt),
    },
    optimizeDeps: {
      include: ['@stripe/stripe-js'],
    },
  }
});
