# Despliegue en Netlify

El repositorio ya tiene todo configurado (`netlify.toml`, build con pnpm,
Node 22). Faltan sólo los pasos que requieren tu cuenta:

## 1. Conectar el repo

1. Entrá a <https://app.netlify.com> y elegí **Add new site → Import an existing
   project → GitHub**.
2. Autorizá Netlify y elegí `jcmembrilla/busqueda-laboral`.
3. Netlify lee `netlify.toml`: build `pnpm build`, publish `dist`. No cambiés
   nada ahí.

## 2. Variables de entorno

En **Site configuration → Environment variables**, agrega:

| Variable                   | Valor                                                  |
| -------------------------- | ------------------------------------------------------ |
| `PUBLIC_SITE_URL`          | la URL final del sitio (ej. `https://xxx.netlify.app`) |
| `PUBLIC_SUPABASE_URL`      | URL del proyecto Supabase nuevo                        |
| `PUBLIC_SUPABASE_ANON_KEY` | clave `anon` pública de ese proyecto                   |

> `PUBLIC_SITE_URL` aparece en `robots.txt`, sitemap, OG y los redirects de
> confirmación de email. Actualizala si el dominio cambia.

## 3. Supabase Auth

En el dashboard de Supabase (Auth → URL Configuration):

- **Site URL**: la URL final del sitio.
- **Redirect URLs** (allowlist):
  - `https://<tu-dominio>/auth/confirm`
  - `https://<tu-dominio>/auth/actualizar-contrasena`

## 4. Deploy

- Con "Deploy site" Netlify hace el primer build. A partir de ahí cada push a
  `main` despliega automáticamente (mismo flujo que el CI de GitHub).
- Guardá el dominio resultante y, si es definitivo, dejalo en
  `PUBLIC_SITE_URL` (y en la descripción/dominios referenciados) para que
  `robots.txt` y el sitemap apunten bien.
