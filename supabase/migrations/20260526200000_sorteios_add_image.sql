ALTER TABLE public.sorteios
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sorteios', 'sorteios', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read sorteios images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload sorteios images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update sorteios images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete sorteios images" ON storage.objects;

CREATE POLICY "Public read sorteios images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sorteios');

CREATE POLICY "Admins can upload sorteios images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sorteios'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update sorteios images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sorteios'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete sorteios images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sorteios'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
