// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@astrojs/netlify'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  output: 'server',
  adapter: netlify({ edgeMiddleware: false }),
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['jspdf', 'svg2pdf.js'],
    },
  },
})
