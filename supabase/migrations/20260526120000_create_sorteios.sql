CREATE TABLE public.sorteios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sponsor_name text NOT NULL,
  validity_period text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT sorteios_end_after_start CHECK (end_date >= start_date)
);

CREATE INDEX sorteios_created_at_idx ON public.sorteios (created_at DESC);
CREATE INDEX sorteios_end_date_idx ON public.sorteios (end_date DESC);

ALTER TABLE public.sorteios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sorteios"
  ON public.sorteios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert sorteios"
  ON public.sorteios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can update sorteios"
  ON public.sorteios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete sorteios"
  ON public.sorteios FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
