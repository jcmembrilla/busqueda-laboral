import { normalizarCiudad } from './formatters'

async function obtenerCiudadPorCoordenadas(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`)
    if (!res.ok) return null
    const data = (await res.json()) as { ciudad?: string | null }
    return data.ciudad || null
  } catch (err) {
    console.warn('[geolocation] Error al consultar /api/reverse-geocode:', err)
    return null
  }
}

export async function detectarLocalidad(ciudadesValidas: string[]): Promise<string | null> {
  if (typeof navigator === 'undefined') return null

  const coords = await obtenerCoordenadas()
  if (!coords) return null

  const ciudad = await obtenerCiudadPorCoordenadas(coords.latitude, coords.longitude)
  if (!ciudad) return null

  const ciudadNorm = normalizarCiudad(ciudad)

  const matchDb = ciudadesValidas.find((c) => normalizarCiudad(c) === ciudadNorm)
  if (matchDb) return matchDb

  console.warn(
    `[geolocation] Ciudad "${ciudad}" (normalizada: "${ciudadNorm}") no coincide con ninguna ciudad activa`,
  )
  return null
}

export async function detectarLocalidadDesdeApi(): Promise<string | null> {
  if (typeof navigator === 'undefined') return null

  // La lista de ciudades activas sale de la API (CVs publicados): así la
  // detección sólo acepta localidades donde ya hay CVs, igual que el
  // autocompletado. Antes acá se consultaba la tabla `profiles` de Comercio
  // Local, que en este proyecto nuevo no existe.
  try {
    const res = await fetch('/api/ciudades')
    if (!res.ok) return null
    const ciudades = (await res.json()) as string[]
    if (!Array.isArray(ciudades) || ciudades.length === 0) return null

    return detectarLocalidad(ciudades)
  } catch {
    console.warn('[geolocation] Error al consultar /api/ciudades')
    return null
  }
}

async function obtenerCoordenadas(): Promise<{
  latitude: number
  longitude: number
} | null> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('timeout'))
      }, 15000)
      navigator.geolocation.getCurrentPosition(
        (p) => {
          clearTimeout(timeout)
          resolve(p)
        },
        (err) => {
          clearTimeout(timeout)
          reject(err)
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 1800000 },
      )
    })
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
  } catch (err) {
    console.warn('[geolocation] Error al obtener coordenadas:', err)
    return null
  }
}
