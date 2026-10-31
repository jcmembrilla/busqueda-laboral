// Tipos crudos de las tablas de Supabase que usa este proyecto. Las filas de
// Comercio Local (profiles/products/reports/solicitudes de publicidad) no
// existen acá: sólo la tabla `curriculums` de la migración 001.
export interface CurriculumRow {
  id: string
  user_id: string
  nombre: string
  ciudad: string
  rubro?: string
  sobre_mi?: string
  habilidades?: string
  experiencia?: string
  disponibilidad?: string
  whatsapp?: string
  foto?: string
  activo: boolean
  created_at?: string
  updated_at?: string
  email?: string
  direccion?: string
  nivel_estudios?: string
  idiomas?: string
  movilidad?: string
  formato?: string
  foto_pos_x?: number
  foto_pos_y?: number
}
