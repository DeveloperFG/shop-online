CREATE TABLE public.parceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  link text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX parceiros_created_at_idx ON public.parceiros (created_at DESC);

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view parceiros"
  ON public.parceiros FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert parceiros"
  ON public.parceiros FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can update parceiros"
  ON public.parceiros FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete parceiros"
  ON public.parceiros FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('parceiros', 'parceiros', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read parceiros images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload parceiros images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update parceiros images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete parceiros images" ON storage.objects;

CREATE POLICY "Public read parceiros images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'parceiros');

CREATE POLICY "Admins can upload parceiros images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'parceiros'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update parceiros images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'parceiros'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete parceiros images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'parceiros'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
