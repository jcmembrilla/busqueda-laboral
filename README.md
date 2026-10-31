# Búsqueda Laboral

Aplicación independiente para buscar empleo y crear, publicar y gestionar CVs.
Este proyecto usa Astro, Tailwind CSS y un proyecto Supabase propio. Empieza
vacío: las cuentas y los CVs de Comercio Local no se importan.

## Requisitos

- Node.js 22.12 o posterior
- pnpm
- Un proyecto Supabase nuevo para esta aplicación

## Desarrollo local

1. Copiá `.env.example` a `.env` y completá la URL y la clave pública de la
   instancia Supabase **nueva**.
2. Ejecutá el SQL de `scripts/migrations/001-empleo-inicial.sql` en el editor
   SQL de ese proyecto.
3. En Supabase Auth, configurá `http://localhost:4321/auth/confirm` como URL de
   redirección permitida. Para recuperar contraseña, permití también
   `http://localhost:4321/auth/actualizar-contrasena`.
4. Instalá dependencias y arrancá:

   ```sh
   pnpm install
   pnpm dev
   ```

La app anterior mantiene temporalmente la cartelera laboral y sus cuentas. La
nueva instancia está separada; no apuntes este proyecto a la base de Comercio
Local.

## Rutas

- `/`: cartelera pública de CVs
- `/cv/ejemplo`: ejemplo de CV y plantillas
- `/cv/:id`: CV público
- `/mi-cv`: creación y gestión del CV
- `/login`: registro e inicio de sesión
- `/recuperar`: recuperación de contraseña
- `/api/ciudades`: localidades para el autocompletado
- `/api/reverse-geocode`: localidad desde coordenadas (botón "Ubicación")

## Despliegue

El proyecto está configurado para Netlify (`netlify.toml` incluido). Antes de
publicar, definí `PUBLIC_SITE_URL`, agregá las URLs de confirmación y
recuperación al allowlist de Supabase Auth y establecé el dominio final. No
reutilices claves del proyecto Supabase de Comercio Local.

## Calidad

```sh
pnpm typecheck      # astro check
pnpm format         # prettier (configración en .prettierrc.json)
pnpm build          # build completo para Netlify
```

El CI (GitHub Actions) corre typecheck y build en cada push a `main`.
