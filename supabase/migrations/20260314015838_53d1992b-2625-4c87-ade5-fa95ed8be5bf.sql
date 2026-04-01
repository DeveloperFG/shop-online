DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'reviews'
  ) AND EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_user_reputation'
  ) THEN

    CREATE TRIGGER on_review_created
    AFTER INSERT ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_reputation();

  END IF;
END $$;