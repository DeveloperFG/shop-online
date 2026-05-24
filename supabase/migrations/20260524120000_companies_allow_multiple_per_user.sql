-- Enterprise users may own more than one company row.
-- Drop any UNIQUE constraint that applies only to companies.user_id (if it exists).
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'companies'
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND c.contype = 'u'
      AND (
        SELECT count(*)::int
        FROM unnest(c.conkey) AS attnum
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = attnum
        WHERE a.attname = 'user_id'
      ) = 1
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;
