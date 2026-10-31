import { descargarPdfCv } from './pdf'
import type { Curriculum } from './constants'

export function initPdfDownloadHandler(opts: {
  btnId: string
  spinnerId: string
  textoId: string
  getData: () => Curriculum | null
  onError?: (err: unknown, ctx: { textoOriginal: string; texto: HTMLElement | null }) => void
}): void {
  const btn = document.getElementById(opts.btnId)
  const spinner = document.getElementById(opts.spinnerId)
  const texto = document.getElementById(opts.textoId)

  btn?.addEventListener('click', async () => {
    const data = opts.getData()
    if (!data) return
    const textoOriginal = texto?.textContent || ''
    if (texto) texto.textContent = 'Generando PDF…'
    spinner?.classList.remove('hidden')
    ;(btn as HTMLButtonElement).disabled = true
    try {
      const inicio = Date.now()
      await descargarPdfCv(data)
      const transcurrido = Date.now() - inicio
      const restante = 800 - transcurrido
      if (restante > 0) {
        await new Promise((r) => setTimeout(r, restante))
      }
    } catch (err) {
      console.error('Error generando PDF:', err)
      if (opts.onError) {
        opts.onError(err, { textoOriginal, texto })
        return
      }
    } finally {
      spinner?.classList.add('hidden')
      if (texto) texto.textContent = textoOriginal
      ;(btn as HTMLButtonElement).disabled = false
    }
  })
}
