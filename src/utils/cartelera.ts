import type { Curriculum } from './constants'
import { escapeHtml, construirLinkWhatsApp, calcularIniciales } from './formatters'
import { fotoConVersion } from './images'
import { estiloEncuadre, normalizarEncuadre } from './encuadre-imagen'

const ICONO_WA = `<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`

const ICONO_PIN = `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`

const ICONO_MAIL = `<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><polyline points="22,6 12,13 2,6"></polyline></svg>`

// Header centrado compartido por la card real y la de ejemplo: foto centrada
// arriba, nombre centrado debajo y chips de ciudad/email debajo. Así las
// previews se ven iguales en todos los viewports.
function headerCentradoFeed(avatar: string, nombreEsc: string, extra?: string): string {
  return `
    <div class="flex flex-col items-center text-center">
      <div class="rounded-full p-0.5 shrink-0" style="border:2px solid #f59e0b">${avatar}</div>
      <h3 class="mt-2 text-base font-bold truncate w-full" style="color: var(--primary)">${nombreEsc}</h3>
      ${extra ? `<div class="mt-1 flex items-center justify-center gap-1.5 flex-wrap">${extra}</div>` : ''}
    </div>`
}

function chipFeed(icono: string, valor: string): string {
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium max-w-full" style="background:var(--surface);color:var(--secondary)">${icono}<span class="truncate min-w-0">${escapeHtml(valor)}</span></span>`
}

function chipsFeed(ciudad?: string, email?: string): string {
  const chips: string[] = []
  if (ciudad) chips.push(chipFeed(ICONO_PIN, ciudad))
  if (email) chips.push(chipFeed(ICONO_MAIL, email))
  if (chips.length === 0) return ''
  return `<div class="mt-2.5 flex flex-wrap justify-center gap-1.5">${chips.join('')}</div>`
}

function bloqueModernoFeed(label: string, valor: string): string {
  if (!valor) return ''
  return `<div class="mt-2 rounded-xl overflow-hidden" style="background:var(--surface)"><p class="px-3 py-1 text-[10px] uppercase font-bold tracking-wider truncate" style="color:#92400e;background:#f59e0b1a">${label}</p><p class="px-3 py-2 text-sm leading-relaxed line-clamp-3" style="color:var(--secondary)">${escapeHtml(valor)}</p></div>`
}

// Card de ejemplo: una referencia amable de cómo podés armar tu CV, sin
// necesidad de cuenta. Se renderiza siempre como primera card de la cartelera.
// También lo usa /busqueda-laboral/ejemplo, que antes tenía su propia copia con
// otros datos: el usuario comparaba "el ejemplo" con "mi CV" y veía dos CVs
// distintos según por dónde entrara.
export const CV_EJEMPLO: {
  nombre: string
  rubro: Curriculum['rubro']
  ciudad: string
  sobreMi: string
  habilidades: string
  experiencia: string
  disponibilidad: string
  email: string
} = {
  nombre: 'Juan López',
  rubro: 'gastronomia',
  ciudad: 'Córdoba Capital',
  sobreMi:
    'Soy una persona proactiva, con buena predisposición y ganas de aprender. Busco crecer en gastronomía.',
  habilidades:
    'Cocina regional y pastelería casera. Manejo de caja, atención al cliente y trabajo en equipo en cocina.',
  experiencia:
    'Más de 5 años cocinando para eventos y en un local gastronómico, entre salón y cocina.',
  disponibilidad: 'Lunes a viernes por la mañana. Fines de semana para eventos.',
  email: 'juan.lopez@email.com',
}

export function crearCardCurriculum(cur: Curriculum, miUserId: string | null): HTMLDivElement {
  const nombre = escapeHtml(cur.nombre)
  // calcularIniciales sobre el nombre crudo, no sobre el escapado: antes se
  // calculaba sobre `nombre` (ya escapado), así que un nombre con "&" sacaba
  // iniciales basura tipo "J&".
  const iniciales = calcularIniciales(cur.nombre)

  const fotoValida =
    typeof cur.foto === 'string' &&
    (cur.foto.startsWith('https://') || cur.foto.startsWith('data:image/'))
  const avatar = fotoValida
    ? `<img src="${escapeHtml(fotoConVersion(cur.foto as string, cur.updatedAt))}" alt="Foto de ${nombre}" loading="lazy" decoding="async" width="56" height="56" class="w-14 h-14 rounded-full object-cover" style="${estiloEncuadre(normalizarEncuadre(cur.fotoPosX, cur.fotoPosY))}" />`
    : `<div class="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold" style="background: #f59e0b; color: #1f2937">${escapeHtml(iniciales)}</div>`

  const esMio = cur.userId === miUserId
  const badgeMio = esMio
    ? `<span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style="background: #f59e0b20; color: #f59e0b">Tu CV</span>`
    : ''

  const linkWa = cur.whatsapp
    ? `<a href="${construirLinkWhatsApp(cur.whatsapp, cur.nombre)}" target="_blank" rel="noopener" class="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer touch-manipulation" style="background: #25d366; color: #ffffff">${ICONO_WA} Contactar por WhatsApp</a>`
    : ''

  const linkVerCv = esMio
    ? `<a href="/mi-cv" class="mt-3 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold transition-opacity hover:opacity-80 cursor-pointer touch-manipulation" style="color: #f59e0b">Gestionar mi CV →</a>`
    : `<a href="/cv/${cur.id}" class="mt-3 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold transition-opacity hover:opacity-80 cursor-pointer touch-manipulation" style="color: #f59e0b">Ver CV completo →</a>`

  const card = document.createElement('div')
  card.className = 'cv-card reveal'
  card.setAttribute('data-id', cur.id)
  card.innerHTML = `
    ${headerCentradoFeed(avatar, nombre, badgeMio)}
    ${chipsFeed(cur.ciudad, cur.email)}
    ${bloqueModernoFeed('Sobre mí', cur.sobreMi || '')}
    ${bloqueModernoFeed('Habilidades', cur.habilidades || '')}
    ${bloqueModernoFeed('Experiencia', cur.experiencia || '')}
    ${bloqueModernoFeed('Disponibilidad', cur.disponibilidad || '')}
    ${linkWa}
    ${linkVerCv}
  `
  return card
}

export function crearCardEjemplo(ctaId: string): HTMLDivElement {
  const card = document.createElement('div')
  card.className = 'cv-card reveal'
  card.setAttribute('data-ejemplo', '1')
  card.innerHTML = `
    <div class="flex items-start justify-between gap-2 mb-3">
      <span class="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full" style="background: rgba(245,158,11,0.16); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4)">Ejemplo</span>
    </div>
    ${headerCentradoFeed(
      `<div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style="background: #f59e0b; color: #1f2937">👨‍🍳</div>`,
      escapeHtml(CV_EJEMPLO.nombre),
    )}
    ${chipsFeed(CV_EJEMPLO.ciudad, CV_EJEMPLO.email)}
    ${bloqueModernoFeed('Sobre mí', CV_EJEMPLO.sobreMi)}
    ${bloqueModernoFeed('Habilidades', CV_EJEMPLO.habilidades)}
    ${bloqueModernoFeed('Experiencia', CV_EJEMPLO.experiencia)}
    ${bloqueModernoFeed('Disponibilidad', CV_EJEMPLO.disponibilidad)}
    <a
      href="/cv/ejemplo"
      class="mt-3 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold transition-opacity hover:opacity-80 cursor-pointer touch-manipulation"
      style="color: #f59e0b"
    >Ver CV completo →</a>
    <a
      id="${ctaId}"
      href="/login?registro=cv"
      class="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
      style="background: #f59e0b; color: #ffffff"
    >Creá tu CV</a>
  `
  return card
}
