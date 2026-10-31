import type { APIRoute } from 'astro'
import { supabase } from '../../utils/supabase'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: JSON_HEADERS,
  })
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()

  // Sin búsqueda: muestra localidades con CVs publicados.
  if (!q || q.length < 2) {
    try {
      const { data, error } = await supabase
        .from('curriculums')
        .select('ciudad')
        .eq('activo', true)
        .not('ciudad', 'eq', '')
        .order('ciudad')
        .limit(300)

      if (error) {
        console.error('[ciudades] Error consultando localidades con CVs:', error)
        return json([])
      }

      const ciudades = [...new Set((data || []).map((r) => r.ciudad).filter(Boolean))].sort()
      return json(ciudades)
    } catch (err) {
      console.error('[ciudades] Error inesperado:', err)
      return json([])
    }
  }

  try {
    const { data, error } = await supabase
      .from('ciudades')
      .select('nombre, provincia')
      .ilike('nombre', `%${q}%`)
      .order('nombre')
      .limit(10)

    if (error) {
      console.error('[ciudades] Error en consulta Supabase:', error)
      return json([])
    }

    return json(data || [])
  } catch (err) {
    console.error('[ciudades] Error inesperado:', err)
    return json([])
  }
}
