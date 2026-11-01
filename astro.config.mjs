import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const adapter = process.env.CF_PAGES === '1'
  ? cloudflare({ imageService: 'compile' })
  : node({ mode: 'standalone' });

export default defineConfig({
  output: 'server',
  adapter,
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  site: process.env.SITE_URL || 'https://links.naufalrf.net',
  server: { port: 3002 },
});
