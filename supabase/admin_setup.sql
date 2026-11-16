-- Jalankan di Supabase SQL Editor
-- GANTI emel@anda.com dengan emel admin anda

-- 1. Senarai admin
CREATE TABLE IF NOT EXISTS public.admins (email text PRIMARY KEY);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;  -- tiada polisi = tiada siapa boleh baca terus

INSERT INTO public.admins (email) VALUES ('emel@anda.com')
ON CONFLICT DO NOTHING;

-- 2. Fungsi semak admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE email = (auth.jwt() ->> 'email')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. Kebenaran untuk admin (pengguna log masuk) pada jadual ahli
GRANT SELECT, UPDATE ON TABLE public."Ahli Lembaga Pengarah JLB" TO authenticated;

CREATE POLICY "Admin can read members"
ON public."Ahli Lembaga Pengarah JLB"
FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin can update members"
ON public."Ahli Lembaga Pengarah JLB"
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
