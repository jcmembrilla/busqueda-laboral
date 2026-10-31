import type { Curriculum, FormatoCv } from './constants'
import { calcularIniciales } from './formatters'
import { fotoConVersion } from './images'
import { normalizarEncuadre } from './encuadre-imagen'
import type { Encuadre } from './encuadre-imagen'
import type { jsPDF } from 'jspdf'
import { createElement, MapPin, Mail, Phone } from 'lucide'
import type { IconNode } from 'lucide'

let JsPDFClase: (typeof import('jspdf'))['jsPDF'] | null = null

async function getJsPDF() {
  if (!JsPDFClase) {
    const [jsPDFMod] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
    JsPDFClase = jsPDFMod.jsPDF
  }
  return JsPDFClase
}

async function dibujarIconoSvg(
  doc: jsPDF,
  iconNode: IconNode,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  const svgEl = createElement(iconNode, {
    width: size,
    height: size,
    stroke: color,
  })
  await doc.svg(svgEl, { x, y, width: size, height: size })
}

const AMBAR = '#d97706'
const AMBAR_RGB = [217, 119, 6] as const
const TINTA = '#1f2937'
const GRIS = '#6b7280'

const MARGEN_X = 18
const MARGEN_Y = 20
const ANCHO_PAGINA = 210
const ANCHO_CONTENIDO = ANCHO_PAGINA - MARGEN_X * 2
const PIE_PAGINA = 287

type FormatoImagen = 'JPEG' | 'PNG' | 'WEBP'

function formatoImagen(dataUrl: string): FormatoImagen {
  if (dataUrl.includes('image/png')) return 'PNG'
  if (dataUrl.includes('image/webp')) return 'WEBP'
  return 'JPEG'
}

async function cargarImagenDataUrl(foto: string): Promise<string | null> {
  try {
    if (foto.startsWith('data:image/')) return foto
    if (!foto.startsWith('https://')) return null
    const res = await fetch(foto)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('img'))
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function nombreArchivo(nombre: string): string {
  const limpio = nombre
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60)
  return limpio || 'CV'
}

function dibujarIniciales(doc: jsPDF, iniciales: string, cx: number, cy: number, radio: number) {
  doc.setFillColor(245, 158, 11)
  doc.circle(cx, cy, radio, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(31, 41, 55)
  doc.text(iniciales, cx, cy + 2.2, { align: 'center' })
}

function chequearPagina(doc: jsPDF, y: number, espacio: number): number {
  if (y > PIE_PAGINA - espacio) {
    doc.addPage()
    return MARGEN_Y
  }
  return y
}

const ICONO_CHIP = 3.5
const GAP_ICONO_TEXTO = 1.5

interface Ctx {
  doc: jsPDF
  cv: Curriculum
  nombre: string
  iniciales: string
  fotoData: string | null
  fotoEncuadre: Encuadre
  chips: Array<{ tipo: string; valor: string }>
  complementarios: Array<[string, string]>
  secciones: Array<[string, string | undefined]>
}

// Dibuja la foto del CV dentro de un clip circular respetando el encuadre
// elegido por el postulante (T-33).
// jsPDF no entiende CSS, así que se calculan a mano los dos efectos que en la
// web resuelve `object-fit: cover` + `object-position`:
//   - cover: se escala para cubrir la caja cuadrada sin deformar la imagen
//     (antes se estiraba, lo que deformaba cualquier foto no cuadrada).
//   - position: el porcentaje reparte el desborde que queda fuera de la caja,
//     50/50 equivale al recorte al centro de siempre.
function dibujarFotoEncuadre(ctx: Ctx, cx: number, cy: number, radio: number): void {
  const { doc } = ctx
  if (!ctx.fotoData) {
    dibujarIniciales(doc, ctx.iniciales, cx, cy, radio)
    return
  }

  const lado = radio * 2 + 2
  const cajaX = cx - lado / 2
  const cajaY = cy - lado / 2

  try {
    const props = doc.getImageProperties(ctx.fotoData)
    const natX = props.width || lado
    const natY = props.height || lado

    const escala = Math.max(lado / natX, lado / natY)
    const ancho = natX * escala
    const alto = natY * escala

    const x = cajaX + (lado - ancho) * (ctx.fotoEncuadre.x / 100)
    const y = cajaY + (lado - alto) * (ctx.fotoEncuadre.y / 100)

    doc.saveGraphicsState()
    doc.circle(cx, cy, radio, 'S')
    doc.clip()
    doc.addImage(ctx.fotoData, formatoImagen(ctx.fotoData), x, y, ancho, alto)
    doc.restoreGraphicsState()
  } catch {
    dibujarIniciales(doc, ctx.iniciales, cx, cy, radio)
  }
}

function construirCtx(doc: jsPDF, cv: Curriculum): Ctx {
  const chips: Ctx['chips'] = []
  if (cv.ciudad) chips.push({ tipo: 'ciudad', valor: cv.ciudad })
  if (cv.email) chips.push({ tipo: 'email', valor: cv.email })
  if (cv.whatsapp) chips.push({ tipo: 'whatsapp', valor: cv.whatsapp })

  const complementarios: Ctx['complementarios'] = []
  if (cv.nivelEstudios) complementarios.push(['Estudios', cv.nivelEstudios])
  if (cv.movilidad && cv.movilidad !== 'No') complementarios.push(['Movilidad', cv.movilidad])
  if (cv.idiomas) complementarios.push(['Idiomas', cv.idiomas])
  if (cv.direccion) complementarios.push(['Dirección', cv.direccion])

  return {
    doc,
    cv,
    nombre: cv.nombre || 'CV',
    iniciales: calcularIniciales(cv.nombre || 'CV'),
    fotoData: null,
    fotoEncuadre: normalizarEncuadre(cv.fotoPosX, cv.fotoPosY),
    chips,
    complementarios,
    secciones: [
      ['SOBRE MI', cv.sobreMi],
      ['HABILIDADES', cv.habilidades],
      ['EXPERIENCIA', cv.experiencia],
      ['DISPONIBILIDAD', cv.disponibilidad],
    ],
  }
}

const ICONOS_LUCIDE: Record<string, IconNode> = {
  ciudad: MapPin,
  email: Mail,
  whatsapp: Phone,
}

async function dibujarChipsClasico(ctx: Ctx, y: number): Promise<number> {
  const { doc, chips } = ctx
  if (chips.length === 0) return y

  const chipAlto = 8
  const chipPaddingX = 2.5
  const chipGap = 2.5

  let chipX = MARGEN_X
  let chipY = y

  for (const chip of chips) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    const valorAncho = doc.getTextWidth(chip.valor)
    const chipAncho = chipPaddingX + ICONO_CHIP + GAP_ICONO_TEXTO + valorAncho + chipPaddingX

    if (chipX + chipAncho > ANCHO_PAGINA - MARGEN_X) {
      chipX = MARGEN_X
      chipY += chipAlto + 2
    }

    const iconoX = chipX + chipPaddingX
    const iconoY = chipY + (chipAlto - ICONO_CHIP) / 2

    await dibujarIconoSvg(doc, ICONOS_LUCIDE[chip.tipo], iconoX, iconoY, ICONO_CHIP, GRIS)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(TINTA)
    doc.text(chip.valor, iconoX + ICONO_CHIP + GAP_ICONO_TEXTO, chipY + chipAlto / 2 + 0.9)

    chipX += chipAncho + chipGap
  }

  return chipY + chipAlto + 8
}

async function dibujarChipsModerno(ctx: Ctx, y: number): Promise<number> {
  const { doc, chips } = ctx
  if (chips.length === 0) return y

  const chipAlto = 8
  const chipPaddingX = 2.5
  const chipGap = 2.5

  let chipX = MARGEN_X
  let chipY = y

  for (const chip of chips) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    const valorAncho = doc.getTextWidth(chip.valor)
    const chipAncho = chipPaddingX + ICONO_CHIP + GAP_ICONO_TEXTO + valorAncho + chipPaddingX

    if (chipX + chipAncho > ANCHO_PAGINA - MARGEN_X) {
      chipX = MARGEN_X
      chipY += chipAlto + 2
    }

    const iconoX = chipX + chipPaddingX
    const iconoY = chipY + (chipAlto - ICONO_CHIP) / 2

    await dibujarIconoSvg(doc, ICONOS_LUCIDE[chip.tipo], iconoX, iconoY, ICONO_CHIP, GRIS)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(TINTA)
    doc.text(chip.valor, iconoX + ICONO_CHIP + GAP_ICONO_TEXTO, chipY + chipAlto / 2 + 0.9)

    chipX += chipAncho + chipGap
  }

  return chipY + chipAlto + 8
}

function dibujarSeccionLateral(
  ctx: Ctx,
  y: number,
  titulo: string,
  contenido: string,
  espacio: number,
): number {
  const { doc } = ctx
  y = chequearPagina(doc, y, 25)

  doc.setDrawColor(AMBAR)
  doc.setLineWidth(0.8)
  doc.line(MARGEN_X, y, MARGEN_X, y + 14)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(AMBAR)
  doc.text(titulo, MARGEN_X + 5, y + 4)

  y += 8

  const lh = 10 * 0.3528 * 1.6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(TINTA)
  const lineas = doc.splitTextToSize(contenido, ANCHO_CONTENIDO - 5) as string[]
  for (const l of lineas) {
    y = chequearPagina(doc, y, 10)
    doc.text(l, MARGEN_X + 5, y)
    y += lh
  }
  y += espacio
  return y
}

function dibujarSeccionTinted(
  ctx: Ctx,
  y: number,
  titulo: string,
  contenido: string,
  espacio: number,
): number {
  const { doc } = ctx
  y = chequearPagina(doc, y, 25)

  doc.setFillColor(AMBAR_RGB[0], AMBAR_RGB[1], AMBAR_RGB[2])
  doc.setDrawColor(AMBAR_RGB[0], AMBAR_RGB[1], AMBAR_RGB[2])
  doc.roundedRect(MARGEN_X, y, ANCHO_CONTENIDO, 6, 1, 1, 'DF')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(titulo, MARGEN_X + 4, y + 4)

  y += 10

  const lh = 10 * 0.3528 * 1.6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(TINTA)
  const lineas = doc.splitTextToSize(contenido, ANCHO_CONTENIDO - 4) as string[]
  for (const l of lineas) {
    y = chequearPagina(doc, y, 10)
    doc.text(l, MARGEN_X + 4, y)
    y += lh
  }
  y += espacio
  return y
}

function dibujarComplementarios(ctx: Ctx, y: number): number {
  const { doc, complementarios } = ctx
  if (complementarios.length === 0) return y

  y = chequearPagina(doc, y, 20)
  doc.setFillColor(249, 250, 251)
  const colAncho = ANCHO_CONTENIDO / 2 - 2
  const filaAlto = 11
  const bloquesNecesarios = Math.ceil(complementarios.length / 2)
  const bloqueAlto = bloquesNecesarios * filaAlto + 6

  doc.roundedRect(MARGEN_X, y, ANCHO_CONTENIDO, bloqueAlto, 2, 2, 'F')
  y += 5

  for (let i = 0; i < complementarios.length; i++) {
    const [etiqueta, valor] = complementarios[i]
    const col = i % 2
    const fila = Math.floor(i / 2)
    const x = MARGEN_X + 4 + col * (colAncho + 4)
    const fy = y + fila * filaAlto

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(GRIS)
    doc.text(etiqueta.toUpperCase(), x, fy)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(TINTA)
    const valorLineas = doc.splitTextToSize(valor, colAncho - 2) as string[]
    doc.text(valorLineas, x, fy + 4)
  }

  return y + bloqueAlto - 5
}

async function dibujarCvClasico(ctx: Ctx): Promise<void> {
  let y = MARGEN_Y
  const { doc } = ctx

  const cx = ANCHO_PAGINA / 2
  const radio = 14
  const cy = y + radio + 2

  dibujarFotoEncuadre(ctx, cx, cy, radio)

  y = cy + radio + 8

  const lineasNombre = doc.splitTextToSize(ctx.nombre, ANCHO_CONTENIDO) as string[]
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(AMBAR)
  doc.text(lineasNombre, ANCHO_PAGINA / 2, y, {
    align: 'center',
    lineHeightFactor: 1.2,
  })
  y += lineasNombre.length * 22 * 0.3528 * 1.2 + 2

  doc.setDrawColor(AMBAR)
  doc.setLineWidth(0.5)
  doc.line(MARGEN_X, y, ANCHO_PAGINA - MARGEN_X, y)
  y += 8

  y = await dibujarChipsClasico(ctx, y)

  for (const [titulo, contenido] of ctx.secciones) {
    if (!contenido) continue
    y = dibujarSeccionLateral(ctx, y, titulo, contenido, 6)
  }

  dibujarComplementarios(ctx, y)
}

async function dibujarCvModerno(ctx: Ctx): Promise<void> {
  let y = 34
  const { doc } = ctx

  // Banda de color superior
  doc.setFillColor(AMBAR_RGB[0], AMBAR_RGB[1], AMBAR_RGB[2])
  doc.rect(0, 0, ANCHO_PAGINA, 26, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  const lineasNombre = doc.splitTextToSize(ctx.nombre, ANCHO_CONTENIDO) as string[]
  doc.text(lineasNombre, ANCHO_PAGINA / 2, 14, { align: 'center' })

  const cx = ANCHO_PAGINA / 2
  const radio = 12
  const cy = y + radio + 2

  dibujarFotoEncuadre(ctx, cx, cy, radio)

  y = cy + radio + 8

  y = await dibujarChipsModerno(ctx, y)

  for (const [titulo, contenido] of ctx.secciones) {
    if (!contenido) continue
    y = dibujarSeccionTinted(ctx, y, titulo, contenido, 6)
  }

  dibujarComplementarios(ctx, y)
}

async function dibujarCvCompacto(ctx: Ctx): Promise<void> {
  let y = MARGEN_Y
  const { doc, cv } = ctx

  const cx = ANCHO_PAGINA / 2
  const radio = 12
  const cy = y + radio + 2

  dibujarFotoEncuadre(ctx, cx, cy, radio)

  y = cy + radio + 6

  const lineasNombre = doc.splitTextToSize(ctx.nombre, ANCHO_CONTENIDO) as string[]
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(AMBAR)
  doc.text(lineasNombre, ANCHO_PAGINA / 2, y, { align: 'center' })

  if (cv.ciudad || cv.email) {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(GRIS)
    const detalle = [cv.ciudad, cv.email].filter(Boolean).join('  ·  ')
    doc.text(detalle, ANCHO_PAGINA / 2, y, { align: 'center' })
    y += 3
  }

  for (const [titulo, contenido] of ctx.secciones) {
    if (!contenido) continue
    y += 4
    y = dibujarSeccionLateral(ctx, y, titulo, contenido, 4)
  }

  dibujarComplementarios(ctx, y)
}

const RENDERIZADORES: Record<FormatoCv, (ctx: Ctx) => Promise<void>> = {
  clasico: dibujarCvClasico,
  moderno: dibujarCvModerno,
  compacto: dibujarCvCompacto,
}

export async function descargarPdfCv(curriculum: Curriculum): Promise<void> {
  const ClaseJsPDF = await getJsPDF()
  const doc = new ClaseJsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  })

  const formato: FormatoCv =
    curriculum.formato && curriculum.formato in RENDERIZADORES
      ? (curriculum.formato as FormatoCv)
      : 'clasico'

  const ctx = construirCtx(doc, curriculum)

  const fotoData = curriculum.foto
    ? await cargarImagenDataUrl(fotoConVersion(curriculum.foto, curriculum.updatedAt))
    : null
  ctx.fotoData = fotoData

  await RENDERIZADORES[formato](ctx)

  doc.save(`CV-${nombreArchivo(ctx.nombre)}.pdf`)
}
