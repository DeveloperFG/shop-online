ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS services_provided text;
