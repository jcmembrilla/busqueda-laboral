import type { Curriculum, FormatoCv } from './constants'
import { CATEGORIAS, COLORES_CATEGORIAS } from './constants'
import { escapeHtml, calcularIniciales, construirLinkWhatsApp } from './formatters'
import { fotoConVersion } from './images'
import { estiloEncuadre, normalizarEncuadre } from './encuadre-imagen'

// Renderer único del CV completo (Búsqueda Laboral, T-25).
// Produce el HTML de la tarjeta del CV, sin el wrapper ni las acciones de
// cada página, para que la vista pública ([id].astro), el ejemplo
// (ejemplo.astro) y el preview del postulante (mi-cv.astro) compartan el
// mismo markup y sea fácil agregar plantillas nuevas.
// Es puro (no toca el DOM): SSR-safe y usable desde JS.

const ICONOS = {
  pin: `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
  mail: `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  phone: `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"></path></svg>`,
  maleta: `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
} as const

// Etiqueta y color del rubro. Uso interno (filtro de cartelera / match futuro):
// no se muestra en el CV visible.
export function etiquetaRubro(rubro: Curriculum['rubro']): string {
  if (!rubro) return ''
  return CATEGORIAS.find((cat) => cat.value === rubro)?.label || 'Otros'
}

export function colorRubro(rubro: Curriculum['rubro']) {
  return COLORES_CATEGORIAS[rubro as keyof typeof COLORES_CATEGORIAS] || COLORES_CATEGORIAS.otros
}

// Tamaño en px del avatar, para el width/height del <img>. Reservar la caja evita
// el salto al cargar; las clases Tailwind ya fijan el tamaño final.
const TAMANOS_AVATAR = { compacto: 44, normal: 96 }

function avatarHtml(cv: Curriculum, compacto: boolean, lazy: boolean): string {
  const clases = compacto
    ? 'w-11 h-11 shrink-0 rounded-full object-cover ring-2 ring-amber-500/30'
    : 'w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-amber-500/30'
  // Mismo criterio que la cartelera: acepta URLs públicas y data URLs legacy.
  // Antes acá solo se aceptaba https://, así que un CV con foto en data URL
  // mostraba iniciales en el detalle y el avatar en la cartelera.
  const tieneFoto =
    typeof cv.foto === 'string' &&
    (cv.foto.startsWith('https://') || cv.foto.startsWith('data:image/'))
  if (tieneFoto) {
    const ancho = compacto ? TAMANOS_AVATAR.compacto : TAMANOS_AVATAR.normal
    // El avatar del CV público es el elemento LCP de esa página: diferir la carga
    // de la imagen que define el LCP lo retrasa a propósito. La cartelera sí la
    // difiere, porque ahí hay 12 fotos y solo un par queda en pantalla.
    const carga = lazy
      ? 'loading="lazy" decoding="async"'
      : 'loading="eager" fetchpriority="high" decoding="async"'
    return `<img src="${escapeHtml(fotoConVersion(cv.foto as string, cv.updatedAt))}" alt="Foto de ${escapeHtml(cv.nombre)}" class="${clases}" style="${estiloEncuadre(normalizarEncuadre(cv.fotoPosX, cv.fotoPosY))}" ${carga} width="${ancho}" height="${ancho}" />`
  }
  const iniciales = calcularIniciales(cv.nombre || 'CV')
  const clasesInit = compacto
    ? 'w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-amber-500/30'
    : 'w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold ring-4 ring-amber-500/30'
  return `<div class="${clasesInit}" style="background:#f59e0b;color:#1f2937">${escapeHtml(iniciales)}</div>`
}

function chip(icono: string, valor: string): string {
  return `<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style="background:var(--surface);color:var(--secondary)">${icono}${escapeHtml(valor)}</span>`
}

function bloqueClasico(titulo: string, contenido: string): string {
  return `<div class="border-l-2 border-amber-500 pl-4 py-1 rounded-r-xl" style="background:var(--surface)"><p class="text-[10px] uppercase font-bold tracking-wider mb-1" style="color:#f59e0b">${titulo}</p><p class="text-sm leading-relaxed whitespace-pre-line" style="color:var(--secondary)">${escapeHtml(contenido)}</p></div>`
}

function bloqueModerno(titulo: string, contenido: string): string {
  return `<div class="rounded-xl overflow-hidden" style="background:var(--surface)"><p class="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider" style="color:#92400e;background:#f59e0b1a">${titulo}</p><p class="px-3 py-2.5 text-sm leading-relaxed whitespace-pre-line" style="color:var(--secondary)">${escapeHtml(contenido)}</p></div>`
}

function bloqueCompacto(titulo: string, contenido: string): string {
  return `<div class="flex items-start gap-2.5"><span class="w-[88px] shrink-0 pt-0.5 text-[9px] uppercase font-bold tracking-wider" style="color:#f59e0b">${titulo}</span><p class="text-xs leading-relaxed whitespace-pre-line" style="color:var(--secondary)">${escapeHtml(contenido)}</p></div>`
}

function bloques(cv: Curriculum, formato: FormatoCv): string {
  const secciones: Array<[string, string]> = []
  // "Sobre mí" va primero: es la presentación de la persona, antes de entrar en
  // lo que sabe hacer (T-34).
  if (cv.sobreMi) secciones.push(['Sobre mí', cv.sobreMi])
  if (cv.habilidades) secciones.push(['Habilidades', cv.habilidades])
  if (cv.experiencia) secciones.push(['Experiencia', cv.experiencia])
  if (cv.disponibilidad) secciones.push(['Disponibilidad', cv.disponibilidad])
  if (secciones.length === 0) return ''
  if (formato === 'compacto') {
    return `<div class="px-5 pb-5 space-y-2.5">${secciones
      .map(([t, c]) => bloqueCompacto(t, c))
      .join('')}</div>`
  }
  const render = formato === 'moderno' ? bloqueModerno : bloqueClasico
  return `<div class="px-6 sm:px-8 pb-6 space-y-4">${secciones
    .map(([t, c]) => render(t, c))
    .join('')}</div>`
}

function datoComp(label: string, valor: string): string {
  return `<div><p class="text-[10px] uppercase font-bold tracking-wider" style="color:var(--tertiary)">${label}</p><p class="text-sm font-medium mt-0.5" style="color:var(--secondary)">${escapeHtml(valor)}</p></div>`
}

function datosComplementarios(cv: Curriculum, formato: FormatoCv): string {
  const pad = formato === 'compacto' ? 'px-5 pb-5' : 'px-6 sm:px-8 pb-6'
  const datos: Array<[string, string]> = []
  if (cv.nivelEstudios) datos.push(['Estudios', cv.nivelEstudios])
  if (cv.movilidad && cv.movilidad !== 'No') datos.push(['Movilidad', cv.movilidad])
  if (cv.idiomas) datos.push(['Idiomas', cv.idiomas])
  if (cv.direccion) datos.push(['Dirección', cv.direccion])
  if (datos.length === 0) return ''
  return `<div class="${pad}"><div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-4 rounded-xl" style="background:var(--surface)">${datos
    .map(([l, v]) => datoComp(l, v))
    .join('')}</div></div>`
}

function chipsHtml(cv: Curriculum, formato: FormatoCv): string {
  if (formato === 'compacto') return ''
  const chips: string[] = []
  if (cv.ciudad) chips.push(chip(ICONOS.pin, cv.ciudad))
  if (cv.email) chips.push(chip(ICONOS.mail, cv.email))
  if (chips.length === 0) return ''
  return `<div class="px-6 sm:px-8 pb-5"><div class="flex flex-wrap justify-center gap-2">${chips.join(
    '',
  )}</div></div>`
}

function encabezado(cv: Curriculum, formato: FormatoCv, lazy: boolean): string {
  // El rubro se guarda como dato interno (filtro / match futuro) pero no se
  // muestra en el CV visible.
  const nombre = `<h1 class="${formato === 'compacto' ? '' : 'mt-4'} text-2xl font-bold break-words" style="color:var(--primary)">${escapeHtml(cv.nombre)}</h1>`

  if (formato === 'compacto') {
    const detalle = [cv.ciudad, cv.email].filter(Boolean).join(' · ')
    return `<div class="px-5 pt-5"><div class="flex items-center gap-4">${avatarHtml(
      cv,
      true,
      lazy,
    )}<div class="min-w-0 text-left"><h1 class="text-lg font-bold break-words" style="color:var(--primary)">${escapeHtml(
      cv.nombre,
    )}</h1>${detalle ? `<p class="text-xs mt-0.5" style="color:var(--tertiary)">${escapeHtml(detalle)}</p>` : ''}</div></div></div>`
  }

  if (formato === 'moderno') {
    return `<div class="px-6 sm:px-8 pt-8" style="background:linear-gradient(180deg,#f59e0b1a,transparent)"><div class="flex flex-col items-center text-center"><div class="rounded-full p-1" style="border:2px solid #f59e0b">${avatarHtml(cv, false, lazy)}</div>${nombre}</div></div>`
  }

  // clasico: header centrado simple
  return `<div class="p-6 sm:p-8 flex flex-col items-center text-center">${avatarHtml(
    cv,
    false,
    lazy,
  )}${nombre}</div>`
}

function contactoWa(cv: Curriculum): string {
  if (!cv.whatsapp) return ''
  const href = construirLinkWhatsApp(cv.whatsapp, cv.nombre)
  return `<a href="${href}" target="_blank" rel="noopener" class="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer touch-manipulation" style="background:#25d366;color:#ffffff">${ICONOS.phone} Contactar por WhatsApp</a>`
}

export function renderCvHtml(
  cv: Curriculum,
  formato: FormatoCv = 'clasico',
  opciones: { lazy?: boolean } = {},
): string {
  // Por defecto diferido: es lo correcto para las listas. La vista pública del CV
  // pasa lazy:false porque ahí el avatar es el LCP.
  const lazy = opciones.lazy !== false
  return `${encabezado(cv, formato, lazy)}${chipsHtml(cv, formato)}${bloques(
    cv,
    formato,
  )}${datosComplementarios(cv, formato)}${
    cv.whatsapp
      ? `<div class="${formato === 'compacto' ? 'px-5 pb-5' : 'px-6 sm:px-8 pb-6'}">${contactoWa(cv)}</div>`
      : ''
  }`
}
