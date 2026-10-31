import { supabase } from '../utils/supabase'
import type { Curriculum, FormatoCv } from '../utils/constants'
import { CATEGORIAS, esFormatoCv } from '../utils/constants'
import type { CurriculumRow } from '../utils/database.types'
import { eliminarObjetoStorage } from '../utils/images'
import { normalizarEncuadre } from '../utils/encuadre-imagen'
import { traducirError } from './error.service'
import { normalizarCiudad } from '../utils/formatters'

function validarCategoriaRubro(value: unknown): value is NonNullable<Curriculum['rubro']> {
  return typeof value === 'string' && CATEGORIAS.some((category) => category.value === value)
}

export function mapRowToCurriculum(row: CurriculumRow): Curriculum {
  const rubroValido = validarCategoriaRubro(row.rubro) ? row.rubro : undefined
  if (row.rubro && !rubroValido) {
    console.warn(`Rubro inválido para el curriculum ${row.id}: "${row.rubro}". Ignorando rubro.`)
  }

  const encuadre = normalizarEncuadre(row.foto_pos_x, row.foto_pos_y)

  return {
    id: row.id,
    userId: row.user_id,
    nombre: row.nombre || '',
    ciudad: row.ciudad || '',
    rubro: rubroValido,
    sobreMi: row.sobre_mi || undefined,
    habilidades: row.habilidades || undefined,
    experiencia: row.experiencia || undefined,
    disponibilidad: row.disponibilidad || undefined,
    whatsapp: row.whatsapp || undefined,
    foto: row.foto || undefined,
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    email: row.email || undefined,
    direccion: row.direccion || undefined,
    nivelEstudios: row.nivel_estudios || undefined,
    idiomas: row.idiomas || undefined,
    movilidad: row.movilidad || undefined,
    formato: esFormatoCv(row.formato) ? row.formato : undefined,
    fotoPosX: encuadre.x,
    fotoPosY: encuadre.y,
  }
}

export type ResultadoCurriculums = {
  curriculums: Curriculum[]
  total: number
  paginaActual: number
  totalPaginas: number
}

export type FiltrosCurriculums = {
  ciudad?: string
  rubro?: string
  pagina?: number
  porPagina?: number
}

// Cartelera pública: CVs activos, ordenados por fecha, filtro por rubro/ciudad.
export async function obtenerCurriculumsActivos(
  opciones?: FiltrosCurriculums,
): Promise<ResultadoCurriculums> {
  const { ciudad, rubro, pagina = 1, porPagina = 12 } = opciones ?? {}
  const desde = (pagina - 1) * porPagina
  const hasta = desde + porPagina - 1

  // Solo las columnas que la card de la cartelera lee de verdad (ver
  // utils/cartelera.ts). Se excluyen direccion, nivel_estudios, idiomas,
  // movilidad, formato y la columna muerta edad para no traer JSON de más por
  // página, que es lo que se ve al scrollear en 4G. sobre_mi sí viaja (máx.
  // 300 caracteres) porque la preview lo muestra primero.
  const CAMPOS_CARTELERA =
    'id, user_id, nombre, ciudad, rubro, sobre_mi, habilidades, experiencia, disponibilidad, whatsapp, email, foto, activo, updated_at, foto_pos_x, foto_pos_y'

  let q = supabase
    .from('curriculums')
    .select(CAMPOS_CARTELERA, { count: 'exact' })
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .range(desde, hasta)
  // Excluir los que no(locaron ciudad solo tiene sentido sin filtro: con el
  // filtro puesto, la condición es redundante y solo agrega trabajo al planner.
  if (ciudad) q = q.eq('ciudad', ciudad)
  else q = q.not('ciudad', 'eq', '')
  if (rubro) q = q.eq('rubro', rubro)
  const { data, error, count } = await q

  if (error) {
    console.error('Error obteniendo curriculums:', error)
    return {
      curriculums: [],
      total: 0,
      paginaActual: pagina,
      totalPaginas: 0,
    }
  }

  return {
    curriculums: (data || []).map((row) => mapRowToCurriculum(row as CurriculumRow)),
    total: count ?? 0,
    paginaActual: pagina,
    totalPaginas: count != null ? Math.max(1, Math.ceil(count / porPagina)) : 1,
  }
}

// CV del usuario logueado (activo o inactivo, para el panel del postulante).
export async function obtenerCurriculumPropio(): Promise<Curriculum | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('curriculums')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return mapRowToCurriculum(data)
}

// Devuelve true si el usuario logueado tiene un CV guardado (activo u oculto).
// Select liviano usado por el destino post-login: un usuario con CV debe caer
// en su panel (/busqueda-laboral/mi-cv), no en el dashboard de comercio.
export async function tieneCurriculumGuardado(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('curriculums')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return !!data
}

// CV público por id, para la página del CV completo (/busqueda-laboral/[id]).
// Retorna el CV con su estado: 'activo', 'oculto' (dueño lo desactivó) o 'no_existe'.
export async function obtenerCurriculumPublico(id: string): Promise<{
  cv: Curriculum | null
  estado: 'activo' | 'oculto' | 'no_existe'
}> {
  const { data, error } = await supabase.from('curriculums').select('*').eq('id', id).maybeSingle()

  if (error || !data) return { cv: null, estado: 'no_existe' }

  if (!data.activo) return { cv: mapRowToCurriculum(data), estado: 'oculto' }

  return { cv: mapRowToCurriculum(data), estado: 'activo' }
}

export type DatosCurriculum = {
  nombre: string
  ciudad: string
  rubro?: string
  sobreMi?: string
  habilidades?: string
  experiencia?: string
  disponibilidad?: string
  whatsapp: string
  email?: string
  direccion?: string
  nivelEstudios?: string
  idiomas?: string
  movilidad?: string
  formato?: string
  fotoPosX?: number
  fotoPosY?: number
}

export type ResultadoCurriculum =
  { success: true; message: string; curriculum?: Curriculum } | { success: false; message: string }

function validarDatos(datos: DatosCurriculum): string | null {
  if (!datos.nombre.trim()) {
    return 'Escribí tu nombre completo.'
  }
  if (!datos.ciudad.trim()) {
    return 'Escribí tu ciudad o localidad.'
  }
  // El WhatsApp es obligatorio: es el único canal de contacto que el comercio
  // tiene para avisarle a la persona, y sin él el CV es inútil.
  if (!datos.whatsapp.trim()) {
    return 'Escribí tu WhatsApp de contacto.'
  }
  if (datos.rubro && !validarCategoriaRubro(datos.rubro)) {
    return 'Conocimientos inválidos.'
  }
  return null
}

// Crea o actualiza el CV del usuario logueado (1 CV por cuenta, UNIQUE user_id).
export async function guardarCurriculum(
  datos: DatosCurriculum,
  foto?: string,
): Promise<ResultadoCurriculum> {
  const errorValidacion = validarDatos(datos)
  if (errorValidacion) {
    return { success: false, message: errorValidacion }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Iniciá sesión para publicar tu CV.' }
  }

  const encuadre = normalizarEncuadre(datos.fotoPosX, datos.fotoPosY)

  const valores = {
    user_id: user.id,
    nombre: datos.nombre.trim(),
    ciudad: normalizarCiudad(datos.ciudad),
    rubro: datos.rubro || '',
    sobre_mi: datos.sobreMi?.trim() || '',
    habilidades: datos.habilidades?.trim() || '',
    experiencia: datos.experiencia?.trim() || '',
    disponibilidad: datos.disponibilidad?.trim() || '',
    whatsapp: datos.whatsapp.trim(),
    foto: foto || '',
    updated_at: new Date().toISOString(),
    email: datos.email?.trim() || '',
    direccion: datos.direccion?.trim() || '',
    nivel_estudios: datos.nivelEstudios?.trim() || '',
    idiomas: datos.idiomas?.trim() || '',
    movilidad: datos.movilidad === 'No' ? '' : datos.movilidad?.trim() || '',
    formato: esFormatoCv(datos.formato) ? datos.formato : 'clasico',
    foto_pos_x: encuadre.x,
    foto_pos_y: encuadre.y,
  }

  const { data, error } = await supabase
    .from('curriculums')
    .upsert(valores, { onConflict: 'user_id' })
    .select()
    .maybeSingle()

  if (error) {
    return { success: false, message: traducirError(error) }
  }

  return {
    success: true,
    message: 'Tu CV se guardó correctamente.',
    curriculum: mapRowToCurriculum(data),
  }
}

// Activa/desactiva el CV (clave: al conseguir trabajo sale de la cartelera).
export async function cambiarEstadoCurriculum(activo: boolean): Promise<ResultadoCurriculum> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Iniciá sesión para continuar.' }
  }

  const { data, error } = await supabase
    .from('curriculums')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select()
    .maybeSingle()

  if (error || !data) {
    return { success: false, message: traducirError(error) }
  }

  return {
    success: true,
    message: activo
      ? 'Tu CV está publicado en la cartelera.'
      : 'Tu CV ya no aparece en la cartelera.',
    curriculum: mapRowToCurriculum(data),
  }
}

// Guarda solo el encuadre de la foto (foto_pos_x / foto_pos_y).
//
// Se llama al soltar el arrastre, no en el submit: si el encuadre solo se
// persistiera al guardar el formulario, apretar "Cancelar" lo descartaba en
// silencio y el postulante tenía que volver a hacerlo. Son dos columnas, así que
// el costo es despreciable.
//
// No toca updated_at a propósito: la foto no cambió y la URL tampoco, así que no
// hay nada que invalidar en caché.
export async function guardarEncuadreFoto(
  fotoPosX: number,
  fotoPosY: number,
): Promise<{ success: boolean; message: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Iniciá sesión para continuar.' }
  }

  const encuadre = normalizarEncuadre(fotoPosX, fotoPosY)
  const { error } = await supabase
    .from('curriculums')
    .update({
      foto_pos_x: encuadre.x,
      foto_pos_y: encuadre.y,
    })
    .eq('user_id', user.id)

  if (error) {
    return { success: false, message: traducirError(error) }
  }
  return { success: true, message: 'Encuadre guardado.' }
}

// Cambia solo la plantilla visual del CV (clave: se usa desde el toggle de
// la vista de preview sin pasar por el formulario).
export async function actualizarFormatoCurriculum(
  formato: FormatoCv,
): Promise<ResultadoCurriculum> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Iniciá sesión para continuar.' }
  }

  const { data, error } = await supabase
    .from('curriculums')
    .update({ formato, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select()
    .maybeSingle()

  if (error || !data) {
    return { success: false, message: traducirError(error) }
  }

  return {
    success: true,
    message: 'Plantilla del CV actualizada.',
    curriculum: mapRowToCurriculum(data),
  }
}

export async function eliminarCurriculum(): Promise<{
  success: boolean
  message: string
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'Iniciá sesión para continuar.' }
  }

  const { data: cv } = await supabase
    .from('curriculums')
    .select('foto')
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = await supabase.from('curriculums').delete().eq('user_id', user.id)

  if (error) {
    return { success: false, message: traducirError(error) }
  }

  if (cv?.foto) {
    await eliminarObjetoStorage(cv.foto)
  }

  return { success: true, message: 'Tu CV fue eliminado.' }
}
