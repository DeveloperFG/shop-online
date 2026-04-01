DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'products'
  ) THEN

    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT null;

  END IF;
END $$;