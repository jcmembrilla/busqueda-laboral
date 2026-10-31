CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.ciudades (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  provincia TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ciudades_nombre ON public.ciudades (nombre);
CREATE INDEX IF NOT EXISTS idx_ciudades_nombre_trgm
  ON public.ciudades USING gin (nombre gin_trgm_ops);

ALTER TABLE public.ciudades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ciudades visibles para todos"
  ON public.ciudades FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.curriculums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  ciudad TEXT NOT NULL DEFAULT '',
  rubro TEXT NOT NULL DEFAULT '',
  sobre_mi TEXT NOT NULL DEFAULT '',
  habilidades TEXT NOT NULL DEFAULT '',
  experiencia TEXT NOT NULL DEFAULT '',
  disponibilidad TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  foto TEXT NOT NULL DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  nivel_estudios TEXT NOT NULL DEFAULT '',
  idiomas TEXT NOT NULL DEFAULT '',
  movilidad TEXT NOT NULL DEFAULT '',
  formato TEXT NOT NULL DEFAULT 'clasico',
  foto_pos_x DOUBLE PRECISION NOT NULL DEFAULT 50,
  foto_pos_y DOUBLE PRECISION NOT NULL DEFAULT 50
);

CREATE INDEX IF NOT EXISTS idx_curriculums_ciudad ON public.curriculums (ciudad);
CREATE INDEX IF NOT EXISTS idx_curriculums_rubro ON public.curriculums (rubro);
CREATE INDEX IF NOT EXISTS idx_curriculums_activo ON public.curriculums (activo);

ALTER TABLE public.curriculums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CVs activos visibles para todos"
  ON public.curriculums FOR SELECT
  USING (activo = true OR auth.uid() = user_id);

CREATE POLICY "Crear CV propio"
  ON public.curriculums FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Actualizar CV propio"
  ON public.curriculums FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Eliminar CV propio"
  ON public.curriculums FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-fotos',
  'cv-fotos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Fotos de CV visibles para todos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cv-fotos');

CREATE POLICY "Cada usuario gestiona sus fotos de CV"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cv-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Cada usuario actualiza sus fotos de CV"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cv-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'cv-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Cada usuario elimina sus fotos de CV"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cv-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
