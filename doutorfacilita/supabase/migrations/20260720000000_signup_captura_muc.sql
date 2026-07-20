-- 20260720000000 — Captura de MUC (medicamentos de uso contínuo) no cadastro
--
-- CONTEXTO: o /cadastrar (aba "Dados Pessoais") passa a coletar dois campos de
-- saúde do paciente — alergias (já existente) e medicamentos de uso contínuo
-- (MUC). A coluna patients.current_medications já existe (migration 035, usada
-- pela anamnese rápida do cockpit), mas o trigger handle_new_user() nunca a
-- populava: novos pacientes sempre começavam com '{}' até um médico editar.
--
-- Esta migration atualiza handle_new_user() para ler meta->'current_medications'
-- do signUp e materializar em patients.current_medications. Nenhuma coluna nova.
-- Baseada na versão vigente da função (20260701000000, com address_number).
--
-- Idempotente (CREATE OR REPLACE FUNCTION).

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
  v_current_meds text[] := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(meta->'current_medications')),
    '{}'::text[]
  );
  v_em_name text := NULLIF(meta->>'emergency_contact_name','');
  v_em_phone text := NULLIF(meta->>'emergency_contact_phone','');
  v_accepts bool := COALESCE((meta->>'accepts_communications')::boolean, false);
  v_terms timestamptz := NULLIF(meta->>'terms_accepted_at','')::timestamptz;
  v_addr_line text := NULLIF(meta->>'address_line','');
  v_addr_number text := NULLIF(meta->>'address_number','');
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
    celular, endereco_completo, alergias, allergies, current_medications,
    address_line, address_number, address_complement, neighborhood, city, state, postal_code,
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
    v_current_meds,
    v_addr_line, v_addr_number, v_addr_compl, v_neighbor, v_city, v_state, v_postal,
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
