// Rubros que un CV puede declarar. Reutilizados de la versión comercial:
// RUBROS_FOTO_OPCIONAL / SUBCATEGORIAS de Comercio Local no aplican acá.
export type CategoriaRubro =
  | 'gastronomia'
  | 'oficios'
  | 'artesanias'
  | 'jardineria'
  | 'estetica'
  | 'peluqueria-barberia'
  | 'educacion'
  | 'tecnologia'
  | 'indumentaria'
  | 'mascotas'
  | 'veterinaria'
  | 'salud-bienestar'
  | 'transporte'
  | 'eventos'
  | 'construccion'
  | 'legales'
  | 'arte-corporal'
  | 'agro-ganaderia'
  | 'hospedajes'
  | 'alquiler-herramientas'
  | 'equipos-musica'
  | 'gestoria-administracion'
  | 'cuidado-personas'
  | 'autos-motos'
  | 'deportes-gimnasios'
  | 'otros'

// Plantillas de visualización del CV (T-25).
export type FormatoCv = 'clasico' | 'moderno' | 'compacto'

// Las tres plantillas del selector del CV. Antes nunca se importaba: los tres
// lugares que arman el selector (mi-cv.astro, dos veces, y ejemplo.astro) tenían
// las etiquetas y descripciones hardcodeadas, que era la forma de que se
// desincronizaran de acá.
export const FORMATOS_CV: {
  value: FormatoCv
  label: string
  descripcion: string
}[] = [
  {
    value: 'clasico',
    label: 'Clásico',
    descripcion: 'Claro y ordenado, todo en columnas',
  },
  {
    value: 'moderno',
    label: 'Moderno',
    descripcion: 'Con una banda de color, más destacado',
  },
  {
    value: 'compacto',
    label: 'Compacto',
    descripcion: 'Una sola página, al grano',
  },
]

export function esFormatoCv(valor: string | undefined): valor is FormatoCv {
  return valor === 'clasico' || valor === 'moderno' || valor === 'compacto'
}

export interface Curriculum {
  id: string
  userId: string
  nombre: string
  ciudad: string
  rubro?: CategoriaRubro
  sobreMi?: string
  habilidades?: string
  experiencia?: string
  disponibilidad?: string
  whatsapp?: string
  foto?: string
  activo: boolean
  createdAt?: string
  updatedAt?: string
  email?: string
  direccion?: string
  nivelEstudios?: string
  idiomas?: string
  movilidad?: string
  formato?: FormatoCv
  // Punto focal de la foto del CV, en porcentajes 0-100 (T-33). Se aplica con
  // `object-position` al renderizar. 50/50 equivale al recorte al centro.
  fotoPosX?: number
  fotoPosY?: number
}

// Tamaño máximo de imagen subida (2MB)
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

export const CATEGORIAS: { value: CategoriaRubro; label: string }[] = [
  { value: 'gastronomia', label: 'Gastronomía' },
  { value: 'artesanias', label: 'Artesanías y Deco' },
  { value: 'indumentaria', label: 'Indumentaria y Accesorios' },
  { value: 'estetica', label: 'Belleza y Estética' },
  { value: 'peluqueria-barberia', label: 'Peluquería y Barbería' },
  { value: 'salud-bienestar', label: 'Salud y Bienestar' },
  { value: 'deportes-gimnasios', label: 'Deportes y Gimnasios' },
  { value: 'mascotas', label: 'Mascotas' },
  { value: 'veterinaria', label: 'Veterinaria' },
  { value: 'legales', label: 'Servicios Legales' },
  { value: 'oficios', label: 'Oficios del Hogar' },
  { value: 'construccion', label: 'Construcción y Refacciones' },
  { value: 'jardineria', label: 'Jardinería y Pileta' },
  { value: 'transporte', label: 'Transporte y Mudanzas' },
  { value: 'eventos', label: 'Eventos y Fotografía' },
  { value: 'educacion', label: 'Clases y Cursos' },
  { value: 'tecnologia', label: 'Servicio Técnico y Tech' },
  { value: 'arte-corporal', label: 'Arte Corporal' },
  { value: 'agro-ganaderia', label: 'Agro y Ganadería' },
  { value: 'hospedajes', label: 'Hospedajes y Turismo' },
  {
    value: 'alquiler-herramientas',
    label: 'Alquiler de herramientas y equipos',
  },
  { value: 'equipos-musica', label: 'Equipos de música y grabación' },
  { value: 'gestoria-administracion', label: 'Gestoría y administración' },
  { value: 'cuidado-personas', label: 'Cuidado de personas' },
  { value: 'autos-motos', label: 'Autos y Motos' },
  { value: 'otros', label: 'Otros' },
]

// Colores por rubro para los anillos/chips del CV renderizado (ver cv-render).
export const COLORES_CATEGORIAS: Record<
  CategoriaRubro,
  { bg: string; border: string; text: string; fullClass: string; rgb: string }
> = {
  gastronomia: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500',
    text: 'text-emerald-400 light:text-emerald-700',
    fullClass:
      'bg-emerald-950/40 light:bg-emerald-100 border-emerald-500/50 text-emerald-400 light:text-emerald-700',
    rgb: '5, 150, 105',
  },
  artesanias: {
    bg: 'bg-amber-950/30',
    border: 'border-amber-600',
    text: 'text-amber-400 light:text-amber-700',
    fullClass:
      'bg-amber-950/30 light:bg-amber-100 border-amber-600/50 text-amber-400 light:text-amber-700',
    rgb: '217, 119, 6',
  },
  indumentaria: {
    bg: 'bg-sky-950/30',
    border: 'border-sky-500',
    text: 'text-sky-400 light:text-sky-700',
    fullClass: 'bg-sky-950/30 light:bg-sky-100 border-sky-500/50 text-sky-400 light:text-sky-700',
    rgb: '14, 165, 233',
  },
  estetica: {
    bg: 'bg-rose-950/30',
    border: 'border-rose-500',
    text: 'text-rose-400 light:text-rose-700',
    fullClass:
      'bg-rose-950/30 light:bg-rose-100 border-rose-500/50 text-rose-400 light:text-rose-700',
    rgb: '244, 63, 94',
  },
  'peluqueria-barberia': {
    bg: 'bg-fuchsia-950/30',
    border: 'border-fuchsia-500',
    text: 'text-fuchsia-400 light:text-fuchsia-700',
    fullClass:
      'bg-fuchsia-950/30 light:bg-fuchsia-100 border-fuchsia-500/50 text-fuchsia-400 light:text-fuchsia-700',
    rgb: '217, 70, 239',
  },
  'salud-bienestar': {
    bg: 'bg-teal-950/40',
    border: 'border-teal-500',
    text: 'text-teal-400 light:text-teal-700',
    fullClass:
      'bg-teal-950/40 light:bg-teal-100 border-teal-500/50 text-teal-400 light:text-teal-700',
    rgb: '20, 184, 166',
  },
  'deportes-gimnasios': {
    bg: 'bg-purple-950/30',
    border: 'border-purple-500',
    text: 'text-purple-400 light:text-purple-700',
    fullClass:
      'bg-purple-950/30 light:bg-purple-100 border-purple-500/50 text-purple-400 light:text-purple-700',
    rgb: '168, 85, 247',
  },
  mascotas: {
    bg: 'bg-orange-950/30',
    border: 'border-orange-500',
    text: 'text-orange-400 light:text-orange-700',
    fullClass:
      'bg-orange-950/30 light:bg-orange-100 border-orange-500/50 text-orange-400 light:text-orange-700',
    rgb: '249, 115, 22',
  },
  veterinaria: {
    bg: 'bg-red-950/30',
    border: 'border-red-500',
    text: 'text-red-400 light:text-red-700',
    fullClass: 'bg-red-950/30 light:bg-red-100 border-red-500/50 text-red-400 light:text-red-700',
    rgb: '239, 68, 68',
  },
  legales: {
    bg: 'bg-blue-950/30',
    border: 'border-blue-600',
    text: 'text-blue-400 light:text-blue-700',
    fullClass:
      'bg-blue-950/30 light:bg-blue-100 border-blue-600/50 text-blue-400 light:text-blue-700',
    rgb: '37, 99, 235',
  },
  oficios: {
    bg: 'bg-slate-900/60',
    border: 'border-slate-500',
    text: 'text-slate-300 light:text-slate-700',
    fullClass:
      'bg-slate-900/60 light:bg-slate-200 border-slate-500/50 text-slate-300 light:text-slate-700',
    rgb: '100, 116, 139',
  },
  construccion: {
    bg: 'bg-yellow-950/30',
    border: 'border-yellow-600',
    text: 'text-yellow-400 light:text-yellow-700',
    fullClass:
      'bg-yellow-950/30 light:bg-yellow-100 border-yellow-600/50 text-yellow-400 light:text-yellow-700',
    rgb: '202, 138, 4',
  },
  jardineria: {
    bg: 'bg-lime-950/30',
    border: 'border-lime-500',
    text: 'text-lime-400 light:text-lime-700',
    fullClass:
      'bg-lime-950/30 light:bg-lime-100 border-lime-500/50 text-lime-400 light:text-lime-700',
    rgb: '101, 163, 13',
  },
  transporte: {
    bg: 'bg-stone-900/50',
    border: 'border-stone-500',
    text: 'text-stone-400 light:text-stone-700',
    fullClass:
      'bg-stone-900/50 light:bg-stone-200 border-stone-500/50 text-stone-400 light:text-stone-700',
    rgb: '120, 113, 108',
  },
  eventos: {
    bg: 'bg-violet-950/30',
    border: 'border-violet-500',
    text: 'text-violet-400 light:text-violet-700',
    fullClass:
      'bg-violet-950/30 light:bg-violet-100 border-violet-500/50 text-violet-400 light:text-violet-700',
    rgb: '139, 92, 246',
  },
  educacion: {
    bg: 'bg-indigo-950/30',
    border: 'border-indigo-500',
    text: 'text-indigo-400 light:text-indigo-700',
    fullClass:
      'bg-indigo-950/30 light:bg-indigo-100 border-indigo-500/50 text-indigo-400 light:text-indigo-700',
    rgb: '99, 102, 241',
  },
  tecnologia: {
    bg: 'bg-cyan-950/30',
    border: 'border-cyan-500',
    text: 'text-cyan-400 light:text-cyan-700',
    fullClass:
      'bg-cyan-950/30 light:bg-cyan-100 border-cyan-500/50 text-cyan-400 light:text-cyan-700',
    rgb: '6, 182, 212',
  },
  'arte-corporal': {
    bg: 'bg-red-950/30',
    border: 'border-red-600',
    text: 'text-red-400 light:text-red-700',
    fullClass: 'bg-red-950/30 light:bg-red-100 border-red-600/50 text-red-400 light:text-red-700',
    rgb: '220, 38, 38',
  },
  'agro-ganaderia': {
    bg: 'bg-lime-950/30',
    border: 'border-lime-500',
    text: 'text-lime-400 light:text-lime-700',
    fullClass:
      'bg-lime-950/30 light:bg-lime-100 border-lime-500/50 text-lime-400 light:text-lime-700',
    rgb: '101, 163, 13',
  },
  hospedajes: {
    bg: 'bg-sky-950/30',
    border: 'border-sky-500',
    text: 'text-sky-400 light:text-sky-700',
    fullClass: 'bg-sky-950/30 light:bg-sky-100 border-sky-500/50 text-sky-400 light:text-sky-700',
    rgb: '14, 165, 233',
  },
  'alquiler-herramientas': {
    bg: 'bg-stone-900/50',
    border: 'border-stone-500',
    text: 'text-stone-400 light:text-stone-700',
    fullClass:
      'bg-stone-900/50 light:bg-stone-200 border-stone-500/50 text-stone-400 light:text-stone-700',
    rgb: '120, 113, 108',
  },
  'equipos-musica': {
    bg: 'bg-fuchsia-950/30',
    border: 'border-fuchsia-500',
    text: 'text-fuchsia-400 light:text-fuchsia-700',
    fullClass:
      'bg-fuchsia-950/30 light:bg-fuchsia-100 border-fuchsia-500/50 text-fuchsia-400 light:text-fuchsia-700',
    rgb: '217, 70, 239',
  },
  'gestoria-administracion': {
    bg: 'bg-blue-950/30',
    border: 'border-blue-600',
    text: 'text-blue-400 light:text-blue-700',
    fullClass:
      'bg-blue-950/30 light:bg-blue-100 border-blue-600/50 text-blue-400 light:text-blue-700',
    rgb: '37, 99, 235',
  },
  'cuidado-personas': {
    bg: 'bg-rose-950/30',
    border: 'border-rose-500',
    text: 'text-rose-400 light:text-rose-700',
    fullClass:
      'bg-rose-950/30 light:bg-rose-100 border-rose-500/50 text-rose-400 light:text-rose-700',
    rgb: '244, 63, 94',
  },
  'autos-motos': {
    bg: 'bg-zinc-800/40',
    border: 'border-zinc-500',
    text: 'text-zinc-300 light:text-zinc-700',
    fullClass:
      'bg-zinc-800/40 light:bg-zinc-200 border-zinc-500/50 text-zinc-300 light:text-zinc-700',
    rgb: '113, 113, 122',
  },
  otros: {
    bg: 'bg-zinc-900',
    border: 'border-zinc-600',
    text: 'text-zinc-400 light:text-zinc-700',
    fullClass: 'bg-zinc-900 light:bg-zinc-200 border-zinc-600 text-zinc-400 light:text-zinc-700',
    rgb: '82, 82, 91',
  },
}
