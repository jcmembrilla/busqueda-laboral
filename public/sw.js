const CACHE_VERSION = 'busqueda-laboral-v2'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`
const IMAGE_CACHE = `images-${CACHE_VERSION}`

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/apple-touch-icon.png',
  '/offline.html',
]

const MAX_DYNAMIC_CACHE_ITEMS = 50
// Antes eran 50 y rotaba entre sí: con 12 fotos de CV por página más 2 portadas
// y 1 logo de cada emprendimiento, el cache giraba solo y trimCache borraba justo
// lo que se estaba por ver.
const MAX_IMAGE_CACHE_ITEMS = 150

// --- Install: pre-cache app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

// --- Activate: clean old caches, claim clients ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== IMAGE_CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  )
  self.clients.claim()
})

// --- Fetch: route-based caching strategies ---
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip API and auth routes (always network)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return
  }

  // Strategy: Supabase Storage images (cache-first)
  // Evaluar ANTES de ignorar auth/API para que las fotos se cacheen.
  //
  // Cache-first y no stale-while-revalidate: un objeto de Storage es inmutable
  // por URL, y cuando el comercio cambia su foto la URL cambia porque
  // fotoConVersion le agrega ?t=<updatedAt>. Revalidar siempre no ahorraba ancho
  // de banda, solo latido: cada visita a la cartelera volvía a bajar las 12 fotos
  // de los CV, que es el 95% del peso de esa página.
  if (url.hostname.includes('supabase') && url.pathname.includes('/storage/')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  // Skip Supabase auth/API calls (siempre red, sin caché)
  if (url.hostname.includes('supabase')) return

  // Skip Chrome extension and dev tools
  if (url.protocol === 'chrome-extension:') return

  // Strategy: Astro bundled assets (immutable)
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Strategy: Static icons and images from our domain
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  // Strategy: HTML navigation (network-first with offline fallback)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // Default: stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
})

// --- Caching strategies ---

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone())
        trimCache(
          cacheName,
          cacheName === IMAGE_CACHE ? MAX_IMAGE_CACHE_ITEMS : MAX_DYNAMIC_CACHE_ITEMS,
        )
      }
      return response
    })
    .catch(() => cached)

  return cached || fetchPromise
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // Fallback: show offline page for navigation requests
    const offlinePage = await caches.match('/offline.html')
    if (offlinePage) return offlinePage

    return new Response('Sin conexión', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

// --- Cache management ---

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  const excess = keys.length - maxItems
  if (excess > 0) {
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i])
    }
  }
}

// --- Notify clients about updates ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
