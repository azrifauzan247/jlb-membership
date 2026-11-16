-- Jalankan di Supabase SQL Editor

-- 1. Ambil maklumat pendaftaran sendiri (nama + telefon mesti sepadan)
CREATE OR REPLACE FUNCTION public.get_my_registration(p_name text, p_phone text)
RETURNS TABLE (full_name text, phone_number text, email text, address text, membership_status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.full_name, m.phone_number, m.email, m.address, m.membership_status
  FROM public."Ahli Lembaga Pengarah JLB" m
  WHERE lower(trim(m.full_name)) = lower(trim(p_name))
    AND trim(m.phone_number) = trim(p_phone)
  LIMIT 1;
$$;

-- 2. Kemaskini maklumat sendiri (status keahlian TIDAK boleh diubah)
CREATE OR REPLACE FUNCTION public.update_my_registration(
  p_name text, p_phone text,
  n_name text, n_phone text, n_email text, n_address text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched int;
  target uuid;
BEGIN
  IF coalesce(trim(n_name), '') = '' OR coalesce(trim(n_phone), '') = '' THEN
    RETURN 'invalid';
  END IF;

  SELECT count(*) INTO matched
  FROM public."Ahli Lembaga Pengarah JLB"
  WHERE lower(trim(full_name)) = lower(trim(p_name)) AND trim(phone_number) = trim(p_phone);

  IF matched = 0 THEN RETURN 'not_found'; END IF;
  IF matched > 1 THEN RETURN 'multiple'; END IF;

  SELECT id INTO target
  FROM public."Ahli Lembaga Pengarah JLB"
  WHERE lower(trim(full_name)) = lower(trim(p_name)) AND trim(phone_number) = trim(p_phone);

  -- Nombor telefon baru tak boleh dipakai ahli lain
  IF EXISTS (
    SELECT 1 FROM public."Ahli Lembaga Pengarah JLB"
    WHERE trim(phone_number) = trim(n_phone) AND id <> target
  ) THEN
    RETURN 'phone_taken';
  END IF;

  UPDATE public."Ahli Lembaga Pengarah JLB"
  SET full_name = trim(n_name),
      phone_number = trim(n_phone),
      email = nullif(trim(coalesce(n_email, '')), ''),
      address = nullif(trim(coalesce(n_address, '')), '')
  WHERE id = target;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_registration(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_my_registration(text, text, text, text, text, text) TO anon;
