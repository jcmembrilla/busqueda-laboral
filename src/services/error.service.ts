export function traducirError(
  error: {
    message?: string
    name?: string
    status?: number
    code?: string
  } | null,
): string {
  if (!error) return 'Ocurrió un error inesperado.'

  if (error.code) {
    if (error.code === '23505') return 'Este correo electrónico ya está registrado.'
    if (error.code === '42501') return 'No tenés permisos para realizar esta acción.'
  }

  if (!error.message) return 'Ocurrió un error inesperado.'
  const msg = error.message.toLowerCase()

  if (msg.includes('bucket not found'))
    return 'El bucket de almacenamiento no está configurado. Verificá Supabase Storage.'
  if (msg.includes('invalid login credentials'))
    return 'Correo electrónico o contraseña incorrectos.'
  if (msg.includes('duplicate key value') || msg.includes('user already registered'))
    return 'Este correo electrónico ya está registrado.'
  if (msg.includes('email not confirmed')) return 'El correo electrónico no está confirmado.'
  if (msg.includes('rate limit') || msg.includes('too many requests'))
    return 'Demasiados intentos de envío de correos. Supabase limita a 3 correos por hora de prueba. Tenés que esperar unos minutos o usar un proveedor SMTP.'
  if (msg.includes('new row violates row-level security policy'))
    return 'No tenés permisos para realizar esta acción.'
  if (msg.includes('jwt') || msg.includes('token expired'))
    return 'La sesión expiró. Iniciá sesión nuevamente.'
  if (msg.includes('invalid code') || msg.includes('invalid verification'))
    return 'El código de verificación no es válido. Probá reenviar el email.'
  if (msg.includes('code verifier') || msg.includes('verifier not found'))
    return 'No se pudo verificar el código. Asegurate de usar el mismo navegador donde te registraste.'
  if (msg.includes('code already used') || msg.includes('already been used'))
    return 'El link de confirmación ya fue usado.'
  if (msg.includes('user already confirmed'))
    return 'Tu correo electrónico ya está confirmado. Iniciá sesión.'
  if (msg.includes('does not exist') || msg.includes('not found'))
    return 'El recurso solicitado no existe.'

  return error.message
}

export function traducirErrorDescripcion(desc: string): string {
  if (!desc) return 'Ocurrió un error inesperado.'
  const lower = desc.toLowerCase()

  if (
    lower.includes('email link is invalid') ||
    lower.includes('invalid or has expired') ||
    lower.includes('link has expired')
  )
    return 'El link de confirmación ya expiró o es inválido. Si lo acabás de pedir, es probable que tu proveedor de correo lo haya escaneado y consumido el intento. Podés probar iniciar sesión directamente.'
  if (lower.includes('code already used') || lower.includes('already been used'))
    return 'El link de confirmación ya fue usado.'
  if (lower.includes('user already confirmed') || lower.includes('email already confirmed'))
    return 'Tu correo electrónico ya está confirmado. Iniciá sesión.'
  if (lower.includes('invalid code') || lower.includes('invalid verification'))
    return 'El código de verificación no es válido. Solicitá un nuevo enlace.'
  if (lower.includes('invalid token')) return 'El token de confirmación no es válido.'
  if (lower.includes('verifier not found') || lower.includes('code verifier'))
    return 'El link se abrió en un navegador diferente. Usá el mismo navegador donde te registraste o iniciá sesión con tu correo y contraseña.'
  if (lower.includes('user not found')) return 'No se encontró el usuario asociado al enlace.'

  return desc
}
