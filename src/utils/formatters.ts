export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function mezclarArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function calcularIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function construirLinkWhatsApp(whatsapp: string, nombre: string, producto?: string): string {
  const base = `https://wa.me/${whatsapp}?text=Hola%20${encodeURIComponent(nombre)},%20vi%20tu%20CV%20en%20Empleo%20Local`
  if (producto) {
    return `${base}%20y%20me%20interesa%20'${encodeURIComponent(producto)}'`
  }
  return `${base}%20y%20me%20interesa%20tu%20experiencia.`
}

export function normalizarCiudad(ciudad: string): string {
  return ciudad
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
