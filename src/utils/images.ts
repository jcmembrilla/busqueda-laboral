import { MAX_IMAGE_SIZE_BYTES } from './constants'
import { isBlob, isFile } from './typeGuards'
import { supabase } from './supabase'

export type ImageType = 'logo' | 'cover' | 'product' | 'cv-foto'

type ImageProfile = {
  targetWidth: number
  targetHeight: number
  aspectRatio: number
  quality: number
  // false = no recorta: respeta la proporción original y solo reduce el tamaño
  // (el recorte lo decide el encuadre guardado, no el compresor). true = recorta
  // al centro a `aspectRatio`, como antes.
  recortar: boolean
}

const IMAGE_PROFILES: Record<ImageType, ImageProfile> = {
  // Logo: sin recorte. Antes se recortaba a un cuadrado de 512x512, lo que
  // destruía los wordmarks anchos: un logo 3:1 perdía los tercios izquierdo y
  // derecho de forma irreversible, porque el recorte queda horneado en el
  // archivo guardado. Ahora se respeta la proporción de origen, igual que la
  // foto del CV (T-33). Se sigue limitando el lado más largo a 512px para no
  // guardar de más.
  //
  // Ojo: esto solo aplica a las subidas nuevas. Los logos ya guardados siguen
  // recortados y no hay forma de recuperar lo que se descartó.
  logo: {
    targetWidth: 512,
    targetHeight: 512,
    aspectRatio: 1,
    quality: 0.82,
    recortar: false,
  },
  cover: {
    targetWidth: 1200,
    targetHeight: 444,
    aspectRatio: 1200 / 444,
    quality: 0.8,
    recortar: true,
  },
  product: {
    targetWidth: 800,
    targetHeight: 800,
    aspectRatio: 1,
    quality: 0.78,
    recortar: true,
  },
  // Foto del CV (T-33): sin recorte, para que el encuadre sea recuperable
  // después (027).
  //
  // El lado más largo es 400px y no 1000 porque esta imagen se pinta a 56x56px en
  // la cartelera y a 96px en el detalle: guardarla a 1000px la hacía ser la
  // imagen más pesada de la app (3-5x más que una portada) para mostrar un
  // cuadrado de 56px. Medido: la cartelera bajaba de ~2,0 MB a ~480 KB.
  // Para el PDF alcanza igual: el avatar impreso mide 28mm, unos 330px a 300dpi.
  'cv-foto': {
    targetWidth: 400,
    targetHeight: 400,
    aspectRatio: 1,
    quality: 0.9,
    recortar: false,
  },
}

// Dimensiones reales con las que se guardó una imagen de este tipo. Sirve para
// poner width/height en el <img> y reservar la caja antes de que descargue, que
// es lo que evita el salto de layout. Solo es exacto para los tipos con `recortar:
// true`; en los que no recortan (cv-foto) el alto real depende del archivo.
export function dimensionesImagen(tipo: ImageType): {
  width: number
  height: number
} {
  const profile = IMAGE_PROFILES[tipo]
  return { width: profile.targetWidth, height: profile.targetHeight }
}

// Lado del cuadrado chiquito que se guarda como LQIP. 24px es el mínimo que se
// ve sin quedar demasiado chiquitito al estirar; a esa escala cualquier imagen
// real sale borrosa por interpolación, así que el placeholder no necesita ningún
// filtro de blur encima.
const LADO_LQIP = 24

// Recorta el mismo recuadro que va a salida a un cuadrado chiquito. Se dibuja
// desde el <img> original (no desde el canvas grande) para no arrastrar dos veces
// el resize en cada compresión.
function generarLqip(
  img: HTMLImageElement,
  sourceX: number,
  sourceY: number,
  sourceW: number,
  sourceH: number,
): string {
  try {
    const mini = document.createElement('canvas')
    mini.width = LADO_LQIP
    mini.height = LADO_LQIP
    const ctx = mini.getContext('2d')
    if (!ctx) return ''

    // Se recorta al centro en cuadrado porque a 24px da igual la proporción: lo
    // que importa es que se vea la parte central del negocio.
    const lado = Math.min(sourceW, sourceH)
    ctx.drawImage(
      img,
      sourceX + (sourceW - lado) / 2,
      sourceY + (sourceH - lado) / 2,
      lado,
      lado,
      0,
      0,
      LADO_LQIP,
      LADO_LQIP,
    )

    return mini.toDataURL('image/webp', 0.5)
  } catch {
    // El LQIP es una mejora opcional: si el navegador no lo deja generar (por
    // ejemplo si el canvas queda manchado por una imagen de origen sucia), la
    // card se sigue viendo bien sin él.
    return ''
  }
}

// Tamaño con el que se guarda la imagen, a partir de la del archivo que sube el
// usuario. Es pura a propósito: el recorte real necesita canvas, pero esta parte
// —que es donde se decide si se pierde contenido— se puede testear sola.
//
// Con `recortar: true` el resultado siempre es el cuadrado exacto del perfil, y
// lo que sobra de una imagen más ancha o más alta se descarta. Con
// `recortar: false` se respeta la proporción de origen y solo se achica, nunca
// se amplía: un wordmark 3:1 guardado en una caja de 512 queda 512x171 entero.
export function dimensionesSalida(
  anchoOrigen: number,
  altoOrigen: number,
  tipo: ImageType,
): { width: number; height: number } {
  const profile = IMAGE_PROFILES[tipo]
  if (profile.recortar) {
    return { width: profile.targetWidth, height: profile.targetHeight }
  }

  const ladoMaximo = Math.max(profile.targetWidth, profile.targetHeight)
  const escala = Math.min(1, ladoMaximo / Math.max(anchoOrigen, altoOrigen))
  return {
    width: Math.max(1, Math.round(anchoOrigen * escala)),
    height: Math.max(1, Math.round(altoOrigen * escala)),
  }
}

export async function comprimirImagen(
  file: File,
  tipo: ImageType = 'product',
): Promise<{ blob: Blob; lqip: string }> {
  const profile = IMAGE_PROFILES[tipo]

  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Error al leer el archivo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Error al procesar la imagen.'))
      img.onload = () => {
        let sourceX = 0
        let sourceY = 0
        let sourceW = img.width
        let sourceH = img.height

        const targetRatio = profile.aspectRatio
        const sourceRatio = img.width / img.height

        if (profile.recortar && sourceRatio > targetRatio) {
          sourceW = Math.round(img.height * targetRatio)
          sourceX = Math.round((img.width - sourceW) / 2)
        } else if (profile.recortar) {
          sourceH = Math.round(img.width / targetRatio)
          sourceY = Math.round((img.height - sourceH) / 2)
        }

        const lqip = generarLqip(img, sourceX, sourceY, sourceW, sourceH)

        const canvas = document.createElement('canvas')
        const { width: destinoAncho, height: destinoAlto } = dimensionesSalida(
          img.width,
          img.height,
          tipo,
        )

        canvas.width = destinoAncho
        canvas.height = destinoAlto
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, destinoAncho, destinoAlto)

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('No se pudo generar el blob.'))
            resolve({ blob, lqip })
          },
          'image/webp',
          profile.quality,
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Versión que solo devuelve el blob. Se mantiene para los llamadores que no
// necesitan el LQIP (fotos de producto, foto del CV): antes esta era la única
// firma y no se quiere obligar a todos a desempaquetar un objeto.
export async function compressImageToBlob(file: File, tipo: ImageType = 'product'): Promise<Blob> {
  const { blob } = await comprimirImagen(file, tipo)
  return blob
}

function dataURLToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

async function subirArchivoStorage(
  fileOrBlob: File | Blob | string,
  userId: string,
  nombre: string,
): Promise<string> {
  let fileBlob: Blob

  if (typeof fileOrBlob === 'string') {
    // data url
    fileBlob = dataURLToBlob(fileOrBlob)
  } else {
    fileBlob = fileOrBlob
  }

  // Validar tamaño (2MB)
  if (fileBlob.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('La imagen supera los 2MB permitidos')
  }

  const ext = fileBlob.type.split('/')[1] || 'webp'
  const path = `${userId}/${nombre}.${ext}`
  const BUCKET_NAME = 'cv-fotos'

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, fileBlob, { upsert: true, contentType: fileBlob.type })

  if (uploadError) {
    throw new Error(uploadError.message || 'Error al subir la imagen')
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)

  return data.publicUrl
}

export async function procesarImagen(
  imagen: string | File | Blob | undefined,
  userId: string,
  nombre: string,
): Promise<string> {
  if (!imagen) return ''

  // Si ya es URL (pública), devolverla
  if (typeof imagen === 'string' && (imagen.startsWith('http') || imagen.startsWith('/'))) {
    return imagen
  }

  // Si viene como data URL (base64), convertir a blob y subir
  if (typeof imagen === 'string' && imagen.startsWith('data:image/')) {
    return subirArchivoStorage(imagen, userId, nombre)
  }

  // Si es File o Blob, subir directamente usando type-guards
  if (isFile(imagen) || isBlob(imagen)) {
    return subirArchivoStorage(imagen, userId, nombre)
  }

  // Fallback: devolver string vacío
  return ''
}

// Cache-buster: agrega ?t=<updatedAt> a URLs públicas de Storage para que el
// navegador no muestre la versión vieja de una foto reemplazada (la URL es
// estable, pero el cache del navegador la asocia a esa URL exacta).
// Pura y SSR-safe: data URLs y URLs locales se devuelven sin cambios.
export function fotoConVersion(url: string | undefined, updatedAt?: string): string {
  if (!url || !url.startsWith('https://') || !updatedAt) return url || ''
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}t=${encodeURIComponent(updatedAt)}`
}

// Elimina un objeto de Storage usando su URL pública (best-effort).
export async function eliminarObjetoStorage(url: string): Promise<void> {
  if (!url || !url.startsWith('https://')) return
  try {
    const publicUrl = url.split('?')[0]
    const marker = '/cv-fotos/'
    const idx = publicUrl.indexOf(marker)
    if (idx === -1) return
    const path = publicUrl.slice(idx + marker.length)
    await supabase.storage.from('cv-fotos').remove([path])
  } catch {
    // Best-effort: si el objeto no existe o el borrado falla, no bloquear.
  }
}
