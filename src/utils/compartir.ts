export async function compartirLink(
  url: string,
  titulo: string,
  toast: HTMLElement | null,
): Promise<void> {
  if (typeof navigator === 'undefined') return

  function mostrarToast(mensaje: string) {
    if (!toast) return
    toast.textContent = mensaje
    toast.classList.remove('hidden')
    window.setTimeout(() => toast.classList.add('hidden'), 2500)
  }

  if (typeof navigator.share === 'function') {
    navigator.share({ title: titulo, url }).catch(() => {})
  } else {
    try {
      await navigator.clipboard.writeText(url)
      mostrarToast('🔗 Link copiado al portapapeles')
    } catch {
      mostrarToast('⚠️ No se pudo copiar el link')
    }
  }
}
