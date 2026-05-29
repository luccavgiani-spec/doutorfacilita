-- 028 — Cadastro de paciente via auth.signUp
--
-- Cria public.handle_new_user(): trigger AFTER INSERT em auth.users que
-- materializa public.patients + public.user_roles somente quando
-- raw_user_meta_data.role = 'patient'.
--
-- Ajustada ao schema vivo (descoberto via list_tables em 2026-05-29):
--   * patients já tem campos estruturados de endereço (address_line,
--     address_complement, neighborhood, city, state, postal_code) E os
--     campos celular/endereco_completo/alergias adicionados na mig.018.
--     A trigger popula o que vier no metadata.
--   * patients.user_id já é UNIQUE — sem criar constraint nova.
--   * patients tem NOT NULL em full_name, cpf, birth_date, phone, email — a
--     trigger preenche todos.
--   * Insere também em user_roles (role='patient') seguindo o RBAC do projeto.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.

-- ─── 1. Campos extras coletados no /cadastrar ─────────────────────────
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS accepts_communications boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- ─── 2. Trigger function ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta->>'role';
  v_full_name text := NULLIF(meta->>'full_name','');
  v_cpf text := NULLIF(meta->>'cpf','');
  v_birth date := NULLIF(meta->>'birth_date','')::date;
  v_gender text := NULLIF(meta->>'gender','');
  v_phone text := NULLIF(meta->>'celular','');
  v_endereco text := NULLIF(meta->>'endereco_completo','');
  v_alergias text[] := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(meta->'alergias')),
    '{}'::text[]
  );
  v_em_name text := NULLIF(meta->>'emergency_contact_name','');
  v_em_phone text := NULLIF(meta->>'emergency_contact_phone','');
  v_accepts bool := COALESCE((meta->>'accepts_communications')::boolean, false);
  v_terms timestamptz := NULLIF(meta->>'terms_accepted_at','')::timestamptz;
  v_addr_line text := NULLIF(meta->>'address_line','');
  v_addr_compl text := NULLIF(meta->>'address_complement','');
  v_neighbor text := NULLIF(meta->>'neighborhood','');
  v_city text := NULLIF(meta->>'city','');
  v_state text := NULLIF(meta->>'state','');
  v_postal text := NULLIF(meta->>'postal_code','');
BEGIN
  IF v_role IS DISTINCT FROM 'patient' THEN
    RETURN new;
  END IF;

  INSERT INTO public.patients (
    user_id, full_name, cpf, birth_date, gender, phone, email,
    celular, endereco_completo, alergias, allergies,
    address_line, address_complement, neighborhood, city, state, postal_code,
    emergency_contact_name, emergency_contact_phone,
    accepts_communications, terms_accepted_at
  ) VALUES (
    new.id,
    COALESCE(v_full_name, new.email),
    v_cpf,
    v_birth,
    v_gender,
    v_phone,
    new.email,
    v_phone,
    v_endereco,
    v_alergias,
    v_alergias,
    v_addr_line, v_addr_compl, v_neighbor, v_city, v_state, v_postal,
    v_em_name, v_em_phone,
    v_accepts, v_terms
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- RBAC: registra papel patient (idempotente)
  INSERT INTO public.user_roles (user_id, role)
  SELECT new.id, 'patient'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = new.id AND role = 'patient' AND revoked_at IS NULL
  );

  RETURN new;
END;
$$;

-- ─── 3. Trigger ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
