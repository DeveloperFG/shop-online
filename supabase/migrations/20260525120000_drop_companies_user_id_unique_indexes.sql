-- Remove UNIQUE INDEX em apenas companies.user_id (causa típica de HTTP 409 ao inserir 2ª empresa).
-- Nomes comuns + varredura via catálogo (indnatts = 1 somente nesta empresa).
DROP INDEX IF EXISTS public.companies_user_id_key CASCADE;
DROP INDEX IF EXISTS public.companies_user_id_unique CASCADE;
DROP INDEX IF EXISTS public.idx_companies_user_id CASCADE;
DROP INDEX IF EXISTS public.companies_user_id_idx CASCADE;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch,
           ic.relname AS idx_name,
           tbl.oid AS tbl_oid,
           ix.indkey,
           ix.indnatts,
           ix.indisunique
    FROM pg_class ic
    JOIN pg_index ix ON ix.indexrelid = ic.oid
    JOIN pg_class tbl ON tbl.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = tbl.relnamespace
    WHERE tbl.relname = 'companies'
      AND n.nspname = 'public'
      AND ix.indisunique
      AND ix.indnatts = 1
      AND ix.indnkeyatts = 1
  LOOP
    -- Uma só coluna no índice: resolve o attnum e só remove se for user_id
    IF EXISTS (
      SELECT 1
      FROM pg_attribute a
      WHERE a.attrelid = r.tbl_oid
        AND NOT a.attisdropped
        AND a.attname = 'user_id'
        AND a.attnum = (regexp_split_to_array(trim(BOTH FROM r.indkey::text), E'\\s+'))[1]::int
    )
    THEN
      EXECUTE format('DROP INDEX IF EXISTS %I.%I CASCADE', r.sch, r.idx_name);
    END IF;
  END LOOP;
END $$;
