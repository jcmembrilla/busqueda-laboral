// Control de encuadre (punto focal) de imágenes, compartido por el dashboard de
// comercio y el CV del postulante (T-33 / T-36).
//
// El encuadre se persiste como dos porcentajes (0-100) que después se aplican
// con `object-position` al renderizar. Arrastrar mueve el contenido en la
// dirección natural: al arrastrar a la derecha se revela más del lado izquierdo,
// como en cualquier editor de fotos.
//
// Este módulo es puro DOM (no toca Supabase ni el servidor), así que puede
// importarse tanto desde el script de una página .astro como desde un listener.

export type Encuadre = { x: number; y: number }

export const ENCUADRE_CENTRADO: Encuadre = { x: 50, y: 50 }

function acotarPorcentaje(valor: unknown): number {
  const n = Number(valor)
  if (!Number.isFinite(n)) return 50
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function normalizarEncuadre(x: unknown, y: unknown): Encuadre {
  return { x: acotarPorcentaje(x), y: acotarPorcentaje(y) }
}

// Style listo para aplicar al <img> que muestra la foto.
export function estiloEncuadre(encuadre: Encuadre): string {
  return `object-position: ${encuadre.x}% ${encuadre.y}%`
}

// Cuánto de la imagen sobra por fuera de la caja con `object-fit: cover`. Si es 0
// la imagen ya encaja exacta (caso de las fotos viejas del CV, recortadas al
// centro) y no hay nada que reencuadrar.
function desbordePx(img: HTMLImageElement, eje: 'x' | 'y'): { total: number; caja: number } {
  const cajaX = img.clientWidth
  const cajaY = img.clientHeight
  if (!cajaX || !cajaY) return { total: 0, caja: 0 }
  const natX = img.naturalWidth || cajaX
  const natY = img.naturalHeight || cajaY
  const escala = Math.max(cajaX / natX, cajaY / natY)
  const total = eje === 'x' ? natX * escala - cajaX : natY * escala - cajaY
  return { total, caja: eje === 'x' ? cajaX : cajaY }
}

// Ganancia exacta: mover el puntero una caja completa recorre todo el rango
// disponible de `object-position`. Con esto el preview es WYSIWYG respecto de
// cómo se va a ver el recorte final.
function gananciaExacta(img: HTMLImageElement, eje: 'x' | 'y'): number {
  const { total, caja } = desbordePx(img, eje)
  if (total <= 0.5 || !caja) return 0
  return (100 * caja) / total
}

// El preview solo vale la pena ofrecerlo si la imagen tiene algo que revelar.
export function tieneEncuadreMovible(img: HTMLImageElement): boolean {
  return desbordePx(img, 'x').total > 0.5 || desbordePx(img, 'y').total > 0.5
}

export type OpcionesArrastreEncuadre = {
  objetivo: HTMLImageElement
  encuadreInicial: Encuadre
  onCambio: (encuadre: Encuadre) => void
  // Se dispara al terminar el gesto, para persistir contra el servidor.
  onFin?: (encuadre: Encuadre) => void
  // Puntos de encuadre por caja de contenedor. Por defecto se calcula del
  // desborde real de la imagen; el dashboard lo fuerza porque su preview
  // encuadra con `transform: scale()` sobre una imagen ya recortada.
  ganancia?: { x: number; y: number }
  // Paso del ajuste con teclado (en puntos de encuadre).
  pasoTeclado?: number
}

export function iniciarArrastreEncuadre(opciones: OpcionesArrastreEncuadre): () => void {
  const { objetivo, onCambio, onFin } = opciones
  const paso = opciones.pasoTeclado ?? 5

  let encuadre = normalizarEncuadre(opciones.encuadreInicial.x, opciones.encuadreInicial.y)
  let arrastrando = false
  let movido = false
  let ultimoX = 0
  let ultimoY = 0

  function coordenada(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 }
    }
    return { x: e.clientX, y: e.clientY }
  }

  function aplicar(deltaX: number, deltaY: number) {
    encuadre = normalizarEncuadre(encuadre.x + deltaX, encuadre.y + deltaY)
    onCambio(encuadre)
  }

  function alBajar(e: MouseEvent | TouchEvent) {
    if (e.cancelable) e.preventDefault()
    arrastrando = true
    movido = false
    const p = coordenada(e)
    ultimoX = p.x
    ultimoY = p.y
    objetivo.style.cursor = 'grabbing'
  }

  function alMover(e: MouseEvent | TouchEvent) {
    if (!arrastrando) return
    if (e.cancelable) e.preventDefault()
    movido = true
    const p = coordenada(e)
    const rect = objetivo.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const ganX = opciones.ganancia?.x ?? gananciaExacta(objetivo, 'x')
    const ganY = opciones.ganancia?.y ?? gananciaExacta(objetivo, 'y')

    const fraccionX = (p.x - ultimoX) / rect.width
    const fraccionY = (p.y - ultimoY) / rect.height
    ultimoX = p.x
    ultimoY = p.y

    // Arrastrar a la derecha baja el porcentaje de `object-position`: el
    // contenido se mueve a la derecha y se revela más del lado izquierdo.
    aplicar(-fraccionX * ganX, -fraccionY * ganY)
  }

  function alSoltar() {
    if (!arrastrando) return
    arrastrando = false
    objetivo.style.cursor = 'grab'
    if (movido) onFin?.(encuadre)
  }

  function alTeclado(e: KeyboardEvent) {
    const salto = e.shiftKey ? 1 : paso
    switch (e.key) {
      case 'ArrowLeft':
        aplicar(-salto, 0)
        break
      case 'ArrowRight':
        aplicar(salto, 0)
        break
      case 'ArrowUp':
        aplicar(0, -salto)
        break
      case 'ArrowDown':
        aplicar(0, salto)
        break
      default:
        return
    }
    e.preventDefault()
    onFin?.(encuadre)
  }

  objetivo.style.cursor = 'grab'
  objetivo.style.touchAction = 'none'
  objetivo.addEventListener('mousedown', alBajar)
  objetivo.addEventListener('touchstart', alBajar, { passive: false })
  document.addEventListener('mousemove', alMover)
  document.addEventListener('mouseup', alSoltar)
  document.addEventListener('touchmove', alMover, { passive: false })
  document.addEventListener('touchend', alSoltar)
  document.addEventListener('touchcancel', alSoltar)
  objetivo.addEventListener('keydown', alTeclado)

  return function detener() {
    objetivo.removeEventListener('mousedown', alBajar)
    objetivo.removeEventListener('touchstart', alBajar)
    document.removeEventListener('mousemove', alMover)
    document.removeEventListener('mouseup', alSoltar)
    document.removeEventListener('touchmove', alMover)
    document.removeEventListener('touchend', alSoltar)
    document.removeEventListener('touchcancel', alSoltar)
    objetivo.removeEventListener('keydown', alTeclado)
    objetivo.style.cursor = ''
    objetivo.style.touchAction = ''
  }
}
