export type PlataformaInstalacion = 'android' | 'ios' | 'desktop' | 'otro'

export type Navegador = 'safari' | 'chrome' | 'firefox' | 'edge' | 'otro'

export const REGEX_NAVEGADOR_INTEGRADO = /FBAN|FBAV|FB_IAB|FBSN|Instagram|TikTok|Line\/|WhatsApp/i

type DeferredPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

const INSTALADA_KEY = 'bl_app_instalada'
const DISMISS_KEY = 'bl_install_dismissed'
const DISMISS_COOLDOWN = 24 * 60 * 60 * 1000

let deferredPrompt: DeferredPrompt | null = null
let listenerRegistrado = false

export function detectarPlataforma(): PlataformaInstalacion {
  if (typeof navigator === 'undefined') return 'otro'
  const ua = navigator.userAgent.toLowerCase()
  const isIpad =
    /ipad/.test(ua) ||
    // iPad con "modo escritorio" (Safari iPadOS) se detecta por macOS + touch
    (/macintosh/.test(ua) && 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 1)
  if (/iphone|ipod/.test(ua) || isIpad) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/edg|chrome|chromium|crios/.test(ua)) return 'desktop'
  return 'otro'
}

export function esStandalone(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) ||
    matchMedia('(display-mode: standalone)').matches
  )
}

export function detectarNavegador(): Navegador {
  if (typeof navigator === 'undefined') return 'otro'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('crios')) return 'chrome'
  if (ua.includes('edgios')) return 'edge'
  if (ua.includes('fxios')) return 'firefox'
  if (ua.includes('chrome') || ua.includes('chromium')) return 'chrome'
  if (ua.includes('edg')) return 'edge'
  if (ua.includes('firefox')) return 'firefox'
  if (ua.includes('safari')) return 'safari'
  return 'otro'
}

export function esNavegadorIntegrado(): boolean {
  if (typeof navigator === 'undefined') return false
  return REGEX_NAVEGADOR_INTEGRADO.test(navigator.userAgent)
}

export function estaInstalada(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(INSTALADA_KEY) === '1'
  } catch {
    return false
  }
}

export function puedeInstalar(): boolean {
  if (typeof window === 'undefined') return false
  if (esStandalone()) {
    try {
      localStorage.setItem(INSTALADA_KEY, '1')
    } catch {
      // localStorage no disponible
    }
    return false
  }
  if (estaInstalada() || esNavegadorIntegrado()) return false
  const plataforma = detectarPlataforma()
  return plataforma === 'android' || plataforma === 'ios' || plataforma === 'desktop'
}

export function textoPaso1Instalacion(navegador: Navegador = detectarNavegador()): string {
  const fuerte = (texto: string) => `<strong style="color: var(--primary)">${texto}</strong>`
  switch (navegador) {
    case 'chrome':
      return `Tocá el botón ${fuerte(
        'Compartir',
      )} en Chrome (el ícono con la flecha hacia arriba en la barra inferior).`
    case 'edge':
      return `Tocá el botón ${fuerte('Compartir')} en Edge (el ícono con la flecha hacia arriba).`
    case 'firefox':
      return `Tocá el botón ${fuerte(
        'Compartir',
      )} en Firefox (el ícono con la flecha hacia arriba).`
    case 'safari':
      return `Tocá el botón ${fuerte(
        'Compartir',
      )} en Safari (el cuadrado con la flecha hacia arriba).`
    default:
      return `Tocá el botón ${fuerte('Compartir')} de tu navegador.`
  }
}

export function puedeAutoMostrar(): boolean {
  if (!puedeInstalar()) return false
  try {
    const descartado = localStorage.getItem(DISMISS_KEY)
    return !descartado || Date.now() - parseInt(descartado, 10) > DISMISS_COOLDOWN
  } catch {
    return true
  }
}

export function registrarPromptInstalacion() {
  if (listenerRegistrado || typeof window === 'undefined') return
  listenerRegistrado = true

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as DeferredPrompt
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    try {
      localStorage.setItem(INSTALADA_KEY, '1')
    } catch {
      // localStorage no disponible
    }
    window.dispatchEvent(new Event('app-instalada'))
  })
}

export async function pedirInstalacion(): Promise<'accepted' | 'dismissed' | 'modal'> {
  if (deferredPrompt) {
    const prompt = deferredPrompt
    deferredPrompt = null
    prompt.prompt()
    try {
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        try {
          localStorage.setItem(INSTALADA_KEY, '1')
        } catch {
          // localStorage no disponible
        }
        window.dispatchEvent(new Event('app-instalada'))
      }
      return outcome === 'accepted' ? 'accepted' : 'dismissed'
    } catch {
      return 'dismissed'
    }
  }

  window.dispatchEvent(new Event('mostrar-install'))
  return 'modal'
}

export function recordarDescartado() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  } catch {
    // localStorage no disponible
  }
}
