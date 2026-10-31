import type { APIRoute } from 'astro'

// Reverse geocoding para el botón "Ubicación": recibe coordenadas y devuelve la
// localidad que las contiene. Usa Nominatim (OpenStreetMap), que no requiere
// clave, pero pide un User-Agent identificable y límites de uso (1 req/s).
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Cache en memoria por round de la ejecución: Netlify Functions es efímero, así
// que cada instancia arranca fría, pero mientras viva evita re-golpear
// Nominatim con consultas repetidas del mismo lugar.
const CACHE = new Map<string, string | null>()
const TTL_MS = 1000 * 60 * 60 // 1 hora
const CACHE_CON_TS = new Map<string, number>()

function arrondirCoordenada(valor: number): number {
  // 3 decimales ≈ 110 m: suficiente para agrupar consultas de la misma cuadra.
  return Math.round(valor * 1000) / 1000
}

function clavarCiudadDeAddress(address: Record<string, unknown>): string | null {
  // De lo más fino a lo más grueso: paraje < pueblo < ciudad < municipio.
  const claves = ['hamlet', 'village', 'town', 'city', 'municipality']
  for (const clave of claves) {
    const valor = address[clave]
    if (typeof valor === 'string' && valor.trim()) return valor.trim()
  }
  return null
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return new Response(JSON.stringify({ error: 'lat y lng son obligatorios' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return new Response(JSON.stringify({ error: 'Coordenadas fuera de rango' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const clave = `${arrondirCoordenada(lat)},${arrondirCoordenada(lng)}`
  const guardadoEn = CACHE_CON_TS.get(clave)
  if (guardadoEn && Date.now() - guardadoEn < TTL_MS) {
    return new Response(JSON.stringify({ ciudad: CACHE.get(clave) }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  }

  const apiUrl = new URL('https://nominatim.openstreetmap.org/reverse')
  apiUrl.searchParams.set('format', 'jsonv2')
  apiUrl.searchParams.set('lat', String(lat))
  apiUrl.searchParams.set('lon', String(lng))
  // zoom=14 es localidad (pueblo/ciudad), no calle ni barrio.
  apiUrl.searchParams.set('zoom', '14')
  apiUrl.searchParams.set('language', 'es')
  apiUrl.searchParams.set('countrycodes', 'ar')

  try {
    const res = await fetch(apiUrl, {
      headers: {
        // Nominatim exige un User-Agent identificable (ver docs de uso).
        'User-Agent': 'busqueda-laboral/0.1 (app PWA de CVs)',
        'Accept-Language': 'es',
      },
    })

    if (!res.ok) {
      console.error('[reverse-geocode] Nominatim respondió', res.status)
      return new Response(JSON.stringify({ error: 'Servicio de geocodificación no disponible' }), {
        status: 502,
        headers: JSON_HEADERS,
      })
    }

    const data = (await res.json()) as {
      address?: Record<string, unknown>
    }
    const ciudad = data.address ? clavarCiudadDeAddress(data.address) : null

    CACHE.set(clave, ciudad)
    CACHE_CON_TS.set(clave, Date.now())
    return new Response(JSON.stringify({ ciudad }), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (err) {
    console.error('[reverse-geocode] Error consultando Nominatim:', err)
    return new Response(
      JSON.stringify({ error: 'Error consultando el servicio de geocodificación' }),
      { status: 502, headers: JSON_HEADERS },
    )
  }
}
