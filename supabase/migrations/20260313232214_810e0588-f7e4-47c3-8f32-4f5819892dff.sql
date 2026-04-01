DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'products'
  ) THEN

    DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

    CREATE POLICY "Anyone can view active products"
      ON public.products FOR SELECT
      TO authenticated
      USING (status = 'active');

    CREATE POLICY "Users can view own products"
      ON public.products FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

  END IF;
END $$;