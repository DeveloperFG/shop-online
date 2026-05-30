CREATE TABLE public.ganhadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Dados do ganhador (copiados de public.profiles)
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  location text,
  -- Dados do item sorteado (copiados de public.sorteios)
  sorteio_id uuid REFERENCES public.sorteios(id) ON DELETE SET NULL,
  sorteio_name text NOT NULL,
  sponsor_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ganhadores_sorteio_id_idx ON public.ganhadores (sorteio_id);
CREATE INDEX ganhadores_created_at_idx ON public.ganhadores (created_at DESC);

ALTER TABLE public.ganhadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ganhadores"
  ON public.ganhadores FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert ganhadores"
  ON public.ganhadores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete ganhadores"
  ON public.ganhadores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
