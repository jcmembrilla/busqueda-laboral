export function mostrarError(
  alertaError: HTMLDivElement,
  alertaErrorTexto: HTMLSpanElement,
  mensaje: string,
  alertaSuccess?: HTMLDivElement,
) {
  alertaErrorTexto.textContent = mensaje
  alertaError.classList.remove('hidden')
  if (alertaSuccess) alertaSuccess.classList.add('hidden')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

export function mostrarExito(
  alertaSuccess: HTMLDivElement,
  alertaSuccessTexto: HTMLSpanElement,
  mensaje: string,
  alertaError?: HTMLDivElement,
) {
  alertaSuccessTexto.textContent = mensaje
  alertaSuccess.classList.remove('hidden')
  if (alertaError) alertaError.classList.add('hidden')
  window.scrollTo({ top: 0, behavior: 'smooth' })
  setTimeout(() => alertaSuccess.classList.add('hidden'), 4000)
}
