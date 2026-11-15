-- Jalankan di Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.check_membership_status(p_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN count(*) = 0 THEN 'not_found'
    WHEN count(*) > 1 THEN 'multiple'
    ELSE max(membership_status)
  END
  FROM public."Ahli Lembaga Pengarah JLB"
  WHERE lower(trim(full_name)) = lower(trim(p_name));
$$;

GRANT EXECUTE ON FUNCTION public.check_membership_status(text) TO anon;
