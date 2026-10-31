import type { APIRoute } from 'astro'

// Al prerenderizar, robots.txt sale como archivo estático en dist.
export const prerender = true

// robots.txt dinámico: Astro toma el site de PUBLIC_SITE_URL en build, así que
// el sitemap no queda apuntando al dominio de la app anterior. Sin dominio definido
// cae a localhost, igual que `site` en astro.config.
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('http://localhost:4321')
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /auth/

Sitemap: ${base.origin}/sitemap-index.xml
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
