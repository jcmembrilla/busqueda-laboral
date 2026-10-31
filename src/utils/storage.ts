// Claves de localStorage. Prefijo "bl_" para que no choquen con claves viejas
// de Comercio Local que pudieran quedar guardadas en el mismo origin.
const KEY_ULTIMA_CIUDAD = 'bl_ultima_ciudad'

export function obtenerUltimaCiudad(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(KEY_ULTIMA_CIUDAD)
  } catch {
    return null
  }
}

// Guarda la ciudad filtro de la cartelera. Cadena vacía = "Todas
// las localidades", así que borra la clave en lugar de guardar ''.
export function guardarUltimaCiudad(ciudad: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (ciudad) {
      localStorage.setItem(KEY_ULTIMA_CIUDAD, ciudad)
    } else {
      localStorage.removeItem(KEY_ULTIMA_CIUDAD)
    }
  } catch {
    // localStorage no disponible (navegador en modo privado, etc.)
  }
}
