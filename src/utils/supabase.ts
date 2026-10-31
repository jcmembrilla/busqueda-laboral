import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan PUBLIC_SUPABASE_URL y/o PUBLIC_SUPABASE_ANON_KEY en las variables de entorno',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
