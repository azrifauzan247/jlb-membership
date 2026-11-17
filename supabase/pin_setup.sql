-- Jalankan di Supabase SQL Editor (SEKALI SAHAJA, sebelum guna kod terbaru)
-- Menambah PIN ahli: pendaftaran melalui fungsi, kemaskini guna telefon + PIN,
-- had percubaan (5 kali salah = kunci 15 minit), dan jana PIN oleh admin.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public."Ahli Lembaga Pengarah JLB"
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

-- Buang fungsi kemaskini lama (isyarat berbeza)
DROP FUNCTION IF EXISTS public.get_my_registration(text, text);
DROP FUNCTION IF EXISTS public.update_my_registration(text, text, text, text, text, text);

-- 1. Pendaftaran (PIN dijana di pelayan, disimpan dalam bentuk hash)
CREATE OR REPLACE FUNCTION public.register_member(
  p_name text, p_phone text, p_email text, p_address text, p_pin text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF coalesce(trim(p_name), '') = '' OR coalesce(trim(p_phone), '') = '' OR coalesce(p_pin, '') !~ '^[0-9]{6}$' THEN
    RETURN 'invalid';
  END IF;

  IF EXISTS (SELECT 1 FROM public."Ahli Lembaga Pengarah JLB" WHERE trim(phone_number) = trim(p_phone)) THEN
    RETURN 'phone_taken';
  END IF;

  INSERT INTO public."Ahli Lembaga Pengarah JLB"
    (full_name, phone_number, email, address, membership_status, pin_hash)
  VALUES (
    trim(p_name), trim(p_phone),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    'pending',
    crypt(p_pin, gen_salt('bf'))
  );
  RETURN 'ok';
EXCEPTION WHEN unique_violation THEN
  RETURN 'phone_taken';
END;
$$;

-- 2. Fungsi dalaman: sahkan telefon + PIN (tidak diberi kepada orang awam)
CREATE OR REPLACE FUNCTION public._verify_member(p_phone text, p_pin text)
RETURNS TABLE (member_id uuid, result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r record;
BEGIN
  SELECT m.id, m.pin_hash, m.failed_attempts, m.locked_until INTO r
  FROM public."Ahli Lembaga Pengarah JLB" m
  WHERE trim(m.phone_number) = trim(p_phone)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'bad'::text; RETURN;
  END IF;

  IF r.locked_until IS NOT NULL AND r.locked_until > now() THEN
    RETURN QUERY SELECT NULL::uuid, 'locked'::text; RETURN;
  END IF;

  IF r.pin_hash IS NULL OR r.pin_hash <> crypt(coalesce(p_pin, ''), r.pin_hash) THEN
    UPDATE public."Ahli Lembaga Pengarah JLB"
    SET failed_attempts = CASE WHEN r.failed_attempts + 1 >= 5 THEN 0 ELSE r.failed_attempts + 1 END,
        locked_until    = CASE WHEN r.failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END
    WHERE id = r.id;
    RETURN QUERY SELECT NULL::uuid, 'bad'::text; RETURN;
  END IF;

  UPDATE public."Ahli Lembaga Pengarah JLB"
  SET failed_attempts = 0, locked_until = NULL
  WHERE id = r.id;
  RETURN QUERY SELECT r.id, 'ok'::text;
END;
$$;
REVOKE ALL ON FUNCTION public._verify_member(text, text) FROM PUBLIC, anon, authenticated;

-- 3. Ambil maklumat sendiri (telefon + PIN)
CREATE OR REPLACE FUNCTION public.get_my_registration(p_phone text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v record;
BEGIN
  SELECT * INTO v FROM public._verify_member(p_phone, p_pin);
  IF v.result <> 'ok' THEN
    RETURN jsonb_build_object('result', v.result);
  END IF;
  RETURN jsonb_build_object(
    'result', 'ok',
    'data', (SELECT to_jsonb(t) FROM (
      SELECT full_name, phone_number, email, address, membership_status
      FROM public."Ahli Lembaga Pengarah JLB" WHERE id = v.member_id
    ) t)
  );
END;
$$;

-- 4. Kemaskini maklumat sendiri (status keahlian TIDAK boleh diubah)
CREATE OR REPLACE FUNCTION public.update_my_registration(
  p_phone text, p_pin text,
  n_name text, n_phone text, n_email text, n_address text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v record;
BEGIN
  SELECT * INTO v FROM public._verify_member(p_phone, p_pin);
  IF v.result <> 'ok' THEN RETURN v.result; END IF;

  IF coalesce(trim(n_name), '') = '' OR coalesce(trim(n_phone), '') = '' THEN
    RETURN 'missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."Ahli Lembaga Pengarah JLB"
    WHERE trim(phone_number) = trim(n_phone) AND id <> v.member_id
  ) THEN
    RETURN 'phone_taken';
  END IF;

  UPDATE public."Ahli Lembaga Pengarah JLB"
  SET full_name = trim(n_name),
      phone_number = trim(n_phone),
      email = nullif(trim(coalesce(n_email, '')), ''),
      address = nullif(trim(coalesce(n_address, '')), '')
  WHERE id = v.member_id;
  RETURN 'ok';
END;
$$;

-- 5. Admin tetapkan PIN baharu untuk ahli (juga membuka kunci)
CREATE OR REPLACE FUNCTION public.admin_set_pin(p_member_id uuid, p_pin text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN 'forbidden'; END IF;
  IF coalesce(p_pin, '') !~ '^[0-9]{6}$' THEN RETURN 'invalid'; END IF;

  UPDATE public."Ahli Lembaga Pengarah JLB"
  SET pin_hash = crypt(p_pin, gen_salt('bf')), failed_attempts = 0, locked_until = NULL
  WHERE id = p_member_id;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  RETURN 'ok';
END;
$$;

-- Sekat kebenaran lalai, kemudian beri hanya yang perlu
REVOKE ALL ON FUNCTION public.register_member(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_registration(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_my_registration(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_pin(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_member(text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_registration(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_my_registration(text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_set_pin(uuid, text) TO authenticated;
