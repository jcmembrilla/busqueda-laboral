const STORAGE_KEY = 'bl_tema'
const THEME_COLOR_META = 'meta[name="theme-color"]'
const COLOR_LIGHT = '#f59e0b'
const COLOR_DARK = '#0f1411'

export function obtenerTema(): 'light' | 'dark' {
  if (typeof localStorage === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'light'
}

function actualizarThemeColor(tema: 'light' | 'dark') {
  const meta = document.querySelector<HTMLMetaElement>(THEME_COLOR_META)
  if (meta) meta.content = tema === 'light' ? COLOR_LIGHT : COLOR_DARK
}

export function aplicarTema(tema: 'light' | 'dark') {
  document.documentElement.classList.toggle('light', tema === 'light')
  actualizarThemeColor(tema)
}

export function cambiarTema(tema: 'light' | 'dark') {
  localStorage.setItem(STORAGE_KEY, tema)
  aplicarTema(tema)
}

export function initTheme() {
  const tema = obtenerTema()
  aplicarTema(tema)
}

export function initThemeToggle() {
  document.querySelectorAll<HTMLElement>('[data-tema-toggle]').forEach((btn) => {
    const iconoSol = btn.querySelector<HTMLElement>('[data-icono-sol]')
    const iconoLuna = btn.querySelector<HTMLElement>('[data-icono-luna]')

    const sincronizarIconos = (tema: 'light' | 'dark') => {
      iconoSol?.classList.toggle('hidden', tema === 'light')
      iconoLuna?.classList.toggle('hidden', tema === 'dark')
    }

    btn.addEventListener('click', () => {
      const nuevo = obtenerTema() === 'dark' ? 'light' : 'dark'
      cambiarTema(nuevo)
      sincronizarIconos(nuevo)
    })

    sincronizarIconos(obtenerTema())
  })
}
