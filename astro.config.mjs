import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://canoatours.com',
  trailingSlash: 'never',
  vite: {
    plugins: [tailwindcss()]
  }
});
