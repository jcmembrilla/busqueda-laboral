import type { Curriculum } from './constants'

// Compositor Open Graph propio de la sección CV (Búsqueda Laboral).
//
// Cada sección arma su formato de compartir; este es el del CV y no tiene nada
// que ver con el de comercios (`perfil/[slug].astro`): título "CV · {nombre}"
// y descripción con datos del CV. Nunca manda la foto de la persona: la tarjeta
// usa el logo de la app (fallback del Layout) para que todos los CV se vean
// igual y la foto personal no circule en previews. Puro y SSR-safe: los
// crawlers (WhatsApp/Telegram) no ejecutan JS, así que se usa en el frontmatter
// de `busqueda-laboral/[id].astro`.

export interface OgCv {
  titulo: string
  descripcion: string
}

// WhatsApp muestra ~200 caracteres de la descripción.
const MAX_DESCRIPCION = 200

export function componerOgCv(cv: Curriculum): OgCv {
  const titulo = `CV · ${cv.nombre} · Búsqueda Laboral`

  const partes = [cv.ciudad, cv.disponibilidad, cv.habilidades].filter(
    (p): p is string => !!p && p.trim().length > 0,
  )
  let descripcion = partes.join(' · ').trim()
  if (!descripcion) descripcion = 'CV en la bolsa de trabajo de Búsqueda Laboral'
  if (descripcion.length > MAX_DESCRIPCION) {
    descripcion = `${descripcion.slice(0, MAX_DESCRIPCION - 1).trimEnd()}…`
  }

  return { titulo, descripcion }
}
