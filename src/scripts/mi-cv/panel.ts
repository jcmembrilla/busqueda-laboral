// Panel de Mi CV: toda la lógica cliente de /mi-cv (pestañas, formulario, foto
// con encuadre, publicar/ocultar, eliminar, plantillas, PDF y compartir).
// Vive en un módulo aparte para que mi-cv.astro sólo tenga el markup y para
// poder testear y dividir esta lógica sin tocar el HTML.
import { obtenerSesionActiva } from '../../services/auth.service'
import {
  guardarCurriculum,
  cambiarEstadoCurriculum,
  eliminarCurriculum,
  obtenerCurriculumPropio,
  actualizarFormatoCurriculum,
  guardarEncuadreFoto,
} from '../../services/curriculum.service'
import type { Curriculum } from '../../utils/constants'
import { renderCvHtml } from '../../utils/cv-render'
import {
  compressImageToBlob,
  procesarImagen,
  fotoConVersion,
  eliminarObjetoStorage,
} from '../../utils/images'
import { mostrarExito, mostrarError as mostrarErrorUI } from '../../utils/ui'
import {
  ENCUADRE_CENTRADO,
  estiloEncuadre,
  iniciarArrastreEncuadre,
  normalizarEncuadre,
  tieneEncuadreMovible,
} from '../../utils/encuadre-imagen'
import { initPdfDownloadHandler } from '../../utils/pdf-handler'
import { compartirLink } from '../../utils/compartir'

export async function iniciarPanelMiCv() {
  const sesion = await obtenerSesionActiva()
  if (!sesion) {
    window.location.href = '/login?registro=cv'
    return
  }

  document.getElementById('loading-screen')?.classList.add('hidden')
  document.getElementById('contenido-cv')?.classList.remove('hidden')

  const tabMiCv = document.getElementById('tab-micv') as HTMLButtonElement
  const tabEjemplo = document.getElementById('tab-ejemplo') as HTMLButtonElement
  const pestanaMiCv = document.getElementById('pestana-micv') as HTMLDivElement
  const pestanaEjemplo = document.getElementById('pestana-ejemplo') as HTMLDivElement

  function activarPestana(micv: boolean) {
    pestanaMiCv?.classList.toggle('hidden', !micv)
    pestanaEjemplo?.classList.toggle('hidden', micv)
    if (tabMiCv) {
      tabMiCv.style.background = micv ? '#f59e0b' : 'var(--elevated)'
      tabMiCv.style.color = micv ? '#ffffff' : 'var(--tertiary)'
    }
    if (tabEjemplo) {
      tabEjemplo.style.background = micv ? 'var(--elevated)' : '#f59e0b'
      tabEjemplo.style.color = micv ? 'var(--tertiary)' : '#ffffff'
    }
  }

  tabMiCv?.addEventListener('click', () => activarPestana(true))
  tabEjemplo?.addEventListener('click', () => activarPestana(false))

  const alertaSuccess = document.getElementById('alerta-success') as HTMLDivElement
  const alertaSuccessT = document.getElementById('alerta-success-texto') as HTMLSpanElement
  const alertaError = document.getElementById('alerta-error') as HTMLDivElement
  const alertaErrorT = document.getElementById('alerta-error-texto') as HTMLSpanElement

  const cvSinDatos = document.getElementById('cv-sin-datos') as HTMLDivElement
  const cvPreview = document.getElementById('cv-preview') as HTMLDivElement
  const cvPreviewCard = document.getElementById('cv-preview-card') as HTMLDivElement
  const btnCrearCv = document.getElementById('btn-crear-cv') as HTMLButtonElement
  const btnToggleCv = document.getElementById('btn-toggle-cv') as HTMLButtonElement
  const btnEditarCv = document.getElementById('btn-editar-cv') as HTMLButtonElement
  const btnEliminarCv = document.getElementById('btn-eliminar-cv') as HTMLButtonElement
  const formCv = document.getElementById('form-cv') as HTMLFormElement
  const formCvTitulo = document.getElementById('form-cv-titulo') as HTMLParagraphElement
  const inputCvNombre = document.getElementById('cv-nombre') as HTMLInputElement
  const inputCvRubro = document.getElementById('cv-rubro') as HTMLSelectElement
  const inputCvSobreMi = document.getElementById('cv-sobre-mi') as HTMLTextAreaElement
  const cvSobreMiContador = document.getElementById('cv-sobre-mi-contador') as HTMLParagraphElement
  const inputCvHabilidades = document.getElementById('cv-habilidades') as HTMLTextAreaElement
  const inputCvExperiencia = document.getElementById('cv-experiencia') as HTMLTextAreaElement
  const inputCvDisponibilidad = document.getElementById('cv-disponibilidad') as HTMLInputElement
  const inputCvWhatsapp = document.getElementById('cv-whatsapp') as HTMLInputElement
  const inputCvEmail = document.getElementById('cv-email') as HTMLInputElement
  const inputCvDireccion = document.getElementById('cv-direccion') as HTMLInputElement
  const inputCvNivelEstudios = document.getElementById('cv-nivel-estudios') as HTMLSelectElement
  const inputCvMovilidad = document.getElementById('cv-movilidad') as HTMLSelectElement
  const inputCvIdiomas = document.getElementById('cv-idiomas') as HTMLInputElement
  let formatoSeleccionado: Curriculum['formato'] = 'clasico'
  const controlesFormato = Array.from(
    document.querySelectorAll('[data-formato-control]'),
  ) as HTMLElement[]
  const btnCvFoto = document.getElementById('btn-cv-foto') as HTMLButtonElement
  const inputCvFoto = document.getElementById('cv-foto') as HTMLInputElement
  const cvFotoPreview = document.getElementById('cv-foto-preview') as HTMLDivElement
  const cvFotoImg = document.getElementById('cv-foto-img') as HTMLImageElement
  const cvFotoAyuda = document.getElementById('cv-foto-encuadre-ayuda') as HTMLParagraphElement
  const cvFotoAviso = document.getElementById('cv-foto-encuadre-aviso') as HTMLParagraphElement
  const btnCvFotoCentrar = document.getElementById('btn-cv-foto-centrar') as HTMLButtonElement
  const btnCvFotoQuitar = document.getElementById('btn-cv-foto-quitar') as HTMLButtonElement
  const btnCancelarCv = document.getElementById('btn-cancelar-cv') as HTMLButtonElement

  let curriculum: Curriculum | null = null
  let cvFotoBlob: Blob | null = null
  let cvFotoObjectUrl: string | null = null
  const SOBRE_MI_MAX = 300

  function pintarContadorSobreMi() {
    cvSobreMiContador.textContent = `${inputCvSobreMi.value.length}/${SOBRE_MI_MAX}`
    const lleno = inputCvSobreMi.value.length >= SOBRE_MI_MAX
    cvSobreMiContador.style.color = lleno ? '#f59e0b' : 'var(--tertiary)'
  }

  inputCvSobreMi.addEventListener('input', pintarContadorSobreMi)
  pintarContadorSobreMi()
  let cvFotoRemovida = false
  let cvFotoEncuadreActual = { ...ENCUADRE_CENTRADO }
  let detenerDragFoto: (() => void) | null = null

  // El encuadre vive en el <img> con object-position: es exactamente lo mismo
  // que aplica cv-render.ts al mostrar el CV, así que el preview es WYSIWYG.
  function pintarEncuadreFoto() {
    cvFotoImg.style.objectPosition = estiloEncuadre(cvFotoEncuadreActual)
  }

  function anunciarEncuadreFoto() {
    cvFotoAviso.textContent = `Encuadre en ${cvFotoEncuadreActual.x} por ciento horizontal y ${cvFotoEncuadreActual.y} por ciento vertical.`
  }

  // Persiste el encuadre al soltar el arrastre, no al guardar el formulario. Si
  // solo se guardara en el submit, "Cancelar" lo descartaba en silencio y había
  // que repetir el ajuste.
  //
  // Solo si la foto es la que ya está guardada: si el postulante acaba de elegir
  // una foto nueva o la quitó, el encuadre pertenece a otra imagen y recién vale
  // cuando se envíe el formulario.
  async function persistirEncuadreFoto(encuadre: { x: number; y: number }) {
    if (cvFotoBlob || cvFotoRemovida || !curriculum) return
    const res = await guardarEncuadreFoto(encuadre.x, encuadre.y)
    if (!res.success) {
      mostrarErrorUI(
        alertaError,
        alertaErrorT,
        'No se pudo guardar el encuadre. Guardá el CV para reintentarlo.',
        alertaSuccess,
      )
      return
    }
    // Reflejarlo en el objeto en memoria para que Cancelar no lo revierta.
    curriculum = { ...curriculum, fotoPosX: encuadre.x, fotoPosY: encuadre.y }
    renderizarPreviewCv()
  }

  // Las fotos viejas del CV quedaron recortadas al centro, así que no hay nada
  // que reencuadrar: en ese caso se oculta la ayuda y no se activa el arrastre.
  function pintarAyudaEncuadre() {
    const movible = tieneEncuadreMovible(cvFotoImg)
    cvFotoAyuda.textContent = movible
      ? 'Arrastrá la foto para elegir cómo queda el encuadre.'
      : 'Tu foto ya está cuadrada, no necesita encuadre.'
    cvFotoImg.tabIndex = movible ? 0 : -1
    btnCvFotoCentrar.classList.toggle('hidden', !movible)
    return movible
  }

  function activarDragFoto() {
    detenerDragFoto?.()
    detenerDragFoto = null
    if (!pintarAyudaEncuadre()) return

    detenerDragFoto = iniciarArrastreEncuadre({
      objetivo: cvFotoImg,
      encuadreInicial: cvFotoEncuadreActual,
      onCambio: (encuadre) => {
        cvFotoEncuadreActual = encuadre
        pintarEncuadreFoto()
      },
      onFin: (encuadre) => {
        anunciarEncuadreFoto()
        persistirEncuadreFoto(encuadre)
      },
    })
  }

  // El arrastre mide el desborde real de la imagen, así que solo puede
  // activarse cuando el <img> ya cargó y tiene dimensiones naturales.
  function activarDragFotoAlCargar() {
    if (cvFotoImg.complete && cvFotoImg.naturalWidth > 0) {
      activarDragFoto()
    } else {
      cvFotoImg.addEventListener(
        'load',
        () => {
          pintarEncuadreFoto()
          activarDragFoto()
        },
        { once: true },
      )
    }
  }

  function renderizarPreviewCv() {
    if (!curriculum || !cvPreviewCard) return
    cvPreviewCard.innerHTML = renderCvHtml(curriculum, curriculum.formato || 'clasico')

    if (btnToggleCv) {
      const textoToggle = document.getElementById('texto-toggle-cv')
      if (textoToggle) {
        textoToggle.textContent = curriculum.activo
          ? 'Quitar de la cartelera'
          : 'Publicar en la cartelera'
      }
      btnToggleCv.style.background = curriculum.activo ? '#ef4444' : '#f59e0b'
      btnToggleCv.style.color = '#ffffff'
    }

    const avisoOculto = document.getElementById('cv-oculto-aviso')
    if (avisoOculto) {
      avisoOculto.classList.toggle('hidden', curriculum.activo)
    }
  }

  function mostrarEstadoCv() {
    if (!cvSinDatos || !cvPreview) return
    const hayCv = !!curriculum
    cvSinDatos.classList.toggle('hidden', hayCv)
    cvPreview.classList.toggle('hidden', !hayCv)
    if (hayCv) renderizarPreviewCv()
  }

  function abrirFormCv(editar: boolean) {
    if (!formCv) return
    const hiddenCiudad = document.getElementById('cv-ciudad') as HTMLInputElement | null

    if (editar && curriculum) {
      formCvTitulo.textContent = 'Editar mi CV:'
      inputCvNombre.value = curriculum.nombre
      const ciudadVisible = document.getElementById('cv-ciudad-input') as HTMLInputElement
      if (ciudadVisible) {
        ciudadVisible.value = curriculum.ciudad
        if (curriculum.ciudad) ciudadVisible.dataset.validada = '1'
      }
      if (hiddenCiudad) hiddenCiudad.value = curriculum.ciudad
      inputCvRubro.value = curriculum.rubro || ''
      inputCvSobreMi.value = curriculum.sobreMi || ''
      pintarContadorSobreMi()
      inputCvHabilidades.value = curriculum.habilidades || ''
      inputCvExperiencia.value = curriculum.experiencia || ''
      inputCvDisponibilidad.value = curriculum.disponibilidad || ''
      inputCvWhatsapp.value = curriculum.whatsapp || ''
      inputCvEmail.value = curriculum.email || ''
      inputCvDireccion.value = curriculum.direccion || ''
      inputCvNivelEstudios.value = curriculum.nivelEstudios || ''
      inputCvMovilidad.value = curriculum.movilidad || ''
      inputCvIdiomas.value = curriculum.idiomas || ''
      formatoSeleccionado = curriculum.formato || 'clasico'
      pintarControlesFormato()
      cvFotoBlob = null
      cvFotoRemovida = false
      detenerDragFoto?.()
      detenerDragFoto = null
      cvFotoEncuadreActual = normalizarEncuadre(curriculum.fotoPosX, curriculum.fotoPosY)
      if (
        curriculum.foto &&
        (curriculum.foto.startsWith('https://') || curriculum.foto.startsWith('data:image/'))
      ) {
        cvFotoImg.src = fotoConVersion(curriculum.foto, curriculum.updatedAt)
        pintarEncuadreFoto()
        cvFotoPreview.classList.remove('hidden')
        activarDragFotoAlCargar()
      } else {
        cvFotoPreview.classList.add('hidden')
      }
    } else {
      formCvTitulo.textContent = 'Nuevo CV:'
      formCv.reset()
      pintarContadorSobreMi()
      cvFotoBlob = null
      cvFotoRemovida = false
      cvFotoEncuadreActual = { ...ENCUADRE_CENTRADO }
      detenerDragFoto?.()
      detenerDragFoto = null
      cvFotoPreview.classList.add('hidden')
      if (hiddenCiudad) hiddenCiudad.value = ''
    }

    formCv.classList.remove('hidden')
    if (btnCrearCv) btnCrearCv.classList.add('hidden')
    if (cvPreview) cvPreview.classList.add('hidden')
    if (cvSinDatos) cvSinDatos.classList.add('hidden')
    inputCvNombre.focus()
  }

  function cerrarFormCv() {
    formCv?.classList.add('hidden')
    if (curriculum) {
      cvPreview?.classList.remove('hidden')
    } else {
      cvSinDatos?.classList.remove('hidden')
    }
  }

  async function cargarMiCv() {
    curriculum = await obtenerCurriculumPropio()
    mostrarEstadoCv()
  }

  btnCrearCv?.addEventListener('click', () => abrirFormCv(false))
  btnEditarCv?.addEventListener('click', () => abrirFormCv(true))
  btnCancelarCv?.addEventListener('click', cerrarFormCv)

  btnCvFoto?.addEventListener('click', () => inputCvFoto?.click())
  inputCvFoto?.addEventListener('change', async () => {
    const file = inputCvFoto.files?.[0]
    if (!file) return
    try {
      // Perfil 'cv-foto': sin recorte, para que el encuadre se elija después y
      // no quede horneado en el archivo (T-33).
      cvFotoBlob = await compressImageToBlob(file, 'cv-foto')
      cvFotoEncuadreActual = { ...ENCUADRE_CENTRADO }
      pintarEncuadreFoto()
      // Se revoca la anterior: sin esto cada re-selección filtra el blob
      // anterior en memoria hasta que se descarga la página.
      if (cvFotoObjectUrl) URL.revokeObjectURL(cvFotoObjectUrl)
      cvFotoObjectUrl = URL.createObjectURL(cvFotoBlob as Blob)
      cvFotoImg.src = cvFotoObjectUrl
      cvFotoPreview.classList.remove('hidden')
      cvFotoRemovida = false
      activarDragFotoAlCargar()
    } catch (e: unknown) {
      mostrarErrorUI(
        alertaError,
        alertaErrorT,
        e instanceof Error ? e.message : 'Error al procesar la imagen.',
        alertaSuccess,
      )
      inputCvFoto.value = ''
      cvFotoBlob = null
    }
  })
  btnCvFotoQuitar?.addEventListener('click', () => {
    cvFotoBlob = null
    cvFotoRemovida = true
    cvFotoEncuadreActual = { ...ENCUADRE_CENTRADO }
    detenerDragFoto?.()
    detenerDragFoto = null
    cvFotoPreview.classList.add('hidden')
    inputCvFoto.value = ''
  })

  btnCvFotoCentrar?.addEventListener('click', () => {
    cvFotoEncuadreActual = { ...ENCUADRE_CENTRADO }
    pintarEncuadreFoto()
    anunciarEncuadreFoto()
  })

  btnToggleCv?.addEventListener('click', async () => {
    if (!curriculum) return
    const res = await cambiarEstadoCurriculum(!curriculum.activo)
    if (res.success && res.curriculum) {
      curriculum = res.curriculum
      mostrarEstadoCv()
      mostrarExito(alertaSuccess, alertaSuccessT, res.message, alertaError)
    } else {
      mostrarErrorUI(alertaError, alertaErrorT, res.message, alertaSuccess)
    }
  })

  initPdfDownloadHandler({
    btnId: 'btn-descargar-cv',
    spinnerId: 'spinner-pdf',
    textoId: 'texto-pdf',
    getData: () => curriculum,
    onError: () =>
      mostrarErrorUI(
        alertaError,
        alertaErrorT,
        'No se pudo generar el PDF. Probá de nuevo.',
        alertaSuccess,
      ),
  })

  document.getElementById('btn-compartir-cv')?.addEventListener('click', () => {
    if (!curriculum) return
    const toast = document.getElementById('toast-mi-cv')
    const url = `${window.location.origin}/cv/${curriculum.id}`
    void compartirLink(url, `CV de ${curriculum.nombre}`, toast)
  })

  btnEliminarCv?.addEventListener('click', async () => {
    if (!curriculum) return
    if (!window.confirm('¿Eliminás tu CV de la cartelera? Esta acción no se puede deshacer.')) {
      return
    }
    const res = await eliminarCurriculum()
    if (res.success) {
      curriculum = null
      mostrarEstadoCv()
      mostrarExito(alertaSuccess, alertaSuccessT, res.message, alertaError)
    } else {
      mostrarErrorUI(alertaError, alertaErrorT, res.message, alertaSuccess)
    }
  })

  function pintarControlesFormato() {
    for (const control of controlesFormato) {
      const botones = Array.from(
        control.querySelectorAll('button[data-formato]'),
      ) as HTMLButtonElement[]
      for (const boton of botones) {
        const activo = boton.dataset.formato === formatoSeleccionado
        boton.style.background = activo ? '#f59e0b' : 'var(--elevated)'
        boton.style.color = activo ? '#ffffff' : 'var(--tertiary)'
        boton.style.border = `1px solid ${activo ? 'transparent' : 'var(--border-strong)'}`
        boton.style.boxShadow = activo ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
      }
    }
  }

  for (const control of controlesFormato) {
    control.addEventListener('click', async (e) => {
      const boton = (e.target as HTMLElement).closest(
        'button[data-formato]',
      ) as HTMLButtonElement | null
      if (!boton) return
      const formato = boton.dataset.formato as Curriculum['formato']
      if (!formato || formato === formatoSeleccionado) return
      formatoSeleccionado = formato
      pintarControlesFormato()
      if (curriculum && cvPreviewCard) {
        curriculum.formato = formato
        const generando = document.createElement('div')
        generando.className = 'flex flex-col items-center justify-center gap-2 py-10 text-sm'
        generando.style.color = 'var(--tertiary)'
        generando.innerHTML = `<span class="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style="border-color: var(--quaternary)"></span><span>Generando…</span>`
        cvPreviewCard.innerHTML = ''
        cvPreviewCard.appendChild(generando)
        await new Promise((r) => setTimeout(r, 700))
        renderizarPreviewCv()
        const res = await actualizarFormatoCurriculum(formato)
        if (res.success && res.curriculum) {
          curriculum = res.curriculum
        }
      } else {
        renderizarPreviewCv()
      }
    })
  }
  pintarControlesFormato()

  formCv?.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!sesion) return

    const faltante = (mensaje: string) => {
      mostrarErrorUI(alertaError, alertaErrorT, mensaje, alertaSuccess)
    }

    if (!inputCvNombre.value.trim()) {
      faltante('Escribí tu nombre completo.')
      inputCvNombre.focus()
      return
    }

    const ciudadVisible = document.getElementById('cv-ciudad-input') as HTMLInputElement
    const ciudad = ciudadVisible?.value?.trim() || ''
    const ciudadValidada = ciudadVisible?.dataset.validada === '1'
    if (!ciudad) {
      faltante('Escribí tu ciudad o localidad.')
      ciudadVisible?.focus()
      return
    }
    if (!ciudadValidada) {
      faltante('Elegí tu localidad de la lista de sugerencias que aparece mientras escribís.')
      ciudadVisible?.focus()
      return
    }

    if (!inputCvWhatsapp.value.trim()) {
      faltante('Escribí tu WhatsApp de contacto.')
      inputCvWhatsapp.focus()
      return
    }

    const datos = {
      nombre: inputCvNombre.value.trim(),
      ciudad,
      rubro: inputCvRubro.value || undefined,
      sobreMi: inputCvSobreMi.value.trim(),
      habilidades: inputCvHabilidades.value.trim(),
      experiencia: inputCvExperiencia.value.trim(),
      disponibilidad: inputCvDisponibilidad.value.trim(),
      whatsapp: inputCvWhatsapp.value.trim(),
      email: inputCvEmail.value.trim(),
      direccion: inputCvDireccion.value.trim(),
      nivelEstudios: inputCvNivelEstudios.value || undefined,
      movilidad: inputCvMovilidad.value || undefined,
      idiomas: inputCvIdiomas.value.trim(),
      formato: formatoSeleccionado,
      fotoPosX: cvFotoEncuadreActual.x,
      fotoPosY: cvFotoEncuadreActual.y,
    }

    let foto: string | undefined
    const fotoAnterior = curriculum?.foto
    if (cvFotoBlob) {
      try {
        foto = await procesarImagen(cvFotoBlob, sesion.id, 'cv-foto')
      } catch (err: unknown) {
        mostrarErrorUI(
          alertaError,
          alertaErrorT,
          err instanceof Error ? err.message : 'Error al subir la foto.',
          alertaSuccess,
        )
        return
      }
    } else if (!cvFotoRemovida && curriculum?.foto) {
      foto = curriculum.foto
    }

    const res = await guardarCurriculum(datos, foto)
    if (res.success && res.curriculum) {
      if (cvFotoRemovida && fotoAnterior) {
        await eliminarObjetoStorage(fotoAnterior)
      }
      curriculum = res.curriculum
      cerrarFormCv()
      mostrarEstadoCv()
      const mensajeGuardado = res.curriculum.activo
        ? res.message
        : `${res.message} Quedó sin publicar: publicalo cuando quieras aparecer en la cartelera.`
      mostrarExito(alertaSuccess, alertaSuccessT, mensajeGuardado, alertaError)
    } else {
      mostrarErrorUI(alertaError, alertaErrorT, res.message, alertaSuccess)
    }
  })

  void cargarMiCv()
}
