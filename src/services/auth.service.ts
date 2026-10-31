import { supabase } from '../utils/supabase'
import { traducirError } from './error.service'

export async function obtenerSesionActiva() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error && error.status !== 401) throw error
  return user ? { id: user.id, email: user.email ?? '' } : null
}

export async function iniciarSesionOAuth(
  provider: 'google' | 'facebook' | 'azure',
): Promise<{ success: boolean; message: string }> {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? window.location.origin
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${siteUrl}/auth/confirm` },
  })

  return error
    ? { success: false, message: error.message }
    : { success: true, message: 'Redirigiendo...' }
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export type ResultadoAuth =
  { success: true; confirmacionPendiente?: boolean } | { success: false; mensaje: string }

// La política de contraseñas vive acá y no en la página: es la misma para
// registro (signUp) y entraría a jugar si algún día se acepta cambio de
// contraseña en /auth/actualizar-contrasena.
function validarContrasena(password: string): string | null {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres e incluir letras y números.'
  }
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe incluir letras y números.'
  }
  return null
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function registrarCuenta(email: string, password: string): Promise<ResultadoAuth> {
  const contrasenaInvalida = validarContrasena(password)
  if (contrasenaInvalida) return { success: false, mensaje: contrasenaInvalida }

  const emailNormalizado = normalizarEmail(email)
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? window.location.origin
  const { data, error } = await supabase.auth.signUp({
    email: emailNormalizado,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm` },
  })

  if (error) return { success: false, mensaje: traducirError(error) }
  // Si Supabase confirma por email antes de iniciar sesión, data.session viene
  // null y hay que avisarle al usuario que revise su casilla.
  return { success: true, confirmacionPendiente: !data.session }
}

export async function iniciarSesion(email: string, password: string): Promise<ResultadoAuth> {
  if (!email.trim() || !password) {
    return { success: false, mensaje: 'Completá tu correo y contraseña.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizarEmail(email),
    password,
  })

  if (error) {
    return { success: false, mensaje: traducirError(error) }
  }
  return { success: true }
}
