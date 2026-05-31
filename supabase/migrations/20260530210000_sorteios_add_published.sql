-- Adiciona controle de publicação aos sorteios.
-- Um sorteio cadastrado só aparece publicamente após ser publicado pelo admin.
ALTER TABLE public.sorteios
  ADD COLUMN published boolean NOT NULL DEFAULT false;

CREATE INDEX sorteios_published_idx ON public.sorteios (published);

-- Substitui a política de leitura: o público só enxerga sorteios publicados,
-- enquanto administradores continuam vendo todos (inclusive os não publicados).
DROP POLICY IF EXISTS "Anyone can view sorteios" ON public.sorteios;

CREATE POLICY "View published sorteios"
  ON public.sorteios FOR SELECT
  TO anon, authenticated
  USING (
    published = true
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
