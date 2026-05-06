-- LiveKit MVP test seed.
--
-- Creates 2 auth.users (doctor + patient) with deterministic UUIDs and known
-- passwords, plus matching rows in public.doctors / public.patients and a
-- consultations row in status 'in_queue' (paid, waiting in line).
--
-- Fixed UUIDs (so URLs and login flows are stable across reseeds):
--
--   DOCTOR_USER_ID   = aaaaaaaa-0000-4000-8000-000000000001
--   PATIENT_USER_ID  = bbbbbbbb-0000-4000-8000-000000000001
--   DOCTOR_ID        = cccccccc-0000-4000-8000-000000000001
--   PATIENT_ID       = dddddddd-0000-4000-8000-000000000001
--   CONSULTATION_ID  = eeeeeeee-0000-4000-8000-000000000001
--
-- Login credentials (DEV ONLY — never use in prod):
--   Doctor   email = medico-teste@doutorfacilita.test   senha = Test1234!
--   Patient  email = paciente-teste@doutorfacilita.test senha = Test1234!
--
-- Idempotent: safe to re-run; uses ON CONFLICT DO NOTHING / DO UPDATE.
-- pgcrypto must be installed (it is, via migration 001).

-- ─── 1. Auth users ────────────────────────────────────────────────
-- IMPORTANTE: GoTrue (auth API) não tolera NULL nas colunas *_token quando
-- o usuário é inserido manualmente — gera "Database error querying schema"
-- no signin. Por isso preenchemos com '' explicitamente.
INSERT INTO auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  phone_change, phone_change_token,
  email_change_token_current, reauthentication_token
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'medico-teste@doutorfacilita.test',
  crypt('Test1234!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. Carlos Mendes","role":"doctor"}',
  false, false, false,
  '', '', '', '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'bbbbbbbb-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'paciente-teste@doutorfacilita.test',
  crypt('Test1234!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Maria Almeida","role":"patient"}',
  false, false, false,
  '', '', '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  phone_change = '',
  phone_change_token = '',
  email_change_token_current = '',
  reauthentication_token = '',
  updated_at = now();

-- ─── 2. Auth identities (needed for password sign-in to work) ─────
INSERT INTO auth.identities (
  user_id, provider, provider_id,
  identity_data, last_sign_in_at, created_at, updated_at
) VALUES
(
  'aaaaaaaa-0000-4000-8000-000000000001',
  'email',
  'aaaaaaaa-0000-4000-8000-000000000001',
  jsonb_build_object(
    'sub', 'aaaaaaaa-0000-4000-8000-000000000001',
    'email', 'medico-teste@doutorfacilita.test',
    'email_verified', true,
    'phone_verified', false
  ),
  now(), now(), now()
),
(
  'bbbbbbbb-0000-4000-8000-000000000001',
  'email',
  'bbbbbbbb-0000-4000-8000-000000000001',
  jsonb_build_object(
    'sub', 'bbbbbbbb-0000-4000-8000-000000000001',
    'email', 'paciente-teste@doutorfacilita.test',
    'email_verified', true,
    'phone_verified', false
  ),
  now(), now(), now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ─── 3. Doctor (linked to medico-teste auth user) ─────────────────
INSERT INTO public.doctors (
  id, user_id, full_name, cpf, email, phone,
  council, council_state, council_number, council_active,
  primary_specialty, specialties,
  is_active, accepts_new_consultations
) VALUES (
  'cccccccc-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'Dr. Carlos Mendes',
  '123.456.789-00',
  'medico-teste@doutorfacilita.test',
  '11999990001',
  'CRM', 'SP', '345678', true,
  'Clínica Geral', ARRAY['Clínica Geral']::text[],
  true, true
)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  council_active = EXCLUDED.council_active,
  is_active = EXCLUDED.is_active,
  accepts_new_consultations = EXCLUDED.accepts_new_consultations,
  updated_at = now();

-- ─── 4. Patient (linked to paciente-teste auth user) ──────────────
INSERT INTO public.patients (
  id, user_id, full_name, cpf, birth_date, gender,
  phone, email
) VALUES (
  'dddddddd-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  'Maria Almeida',
  '987.654.321-00',
  '1992-03-15',
  'F',
  '11999990002',
  'paciente-teste@doutorfacilita.test'
)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = now();

-- ─── 5. Consultation in queue (no doctor assigned yet) ────────────
-- NOTE: status 'in_queue' (the enum has no 'aguardando'); paid_at set
-- so the seed mirrors the production "patient already paid, waiting" state.
INSERT INTO public.consultations (
  id, patient_id, doctor_id, status,
  service_code, service_name, amount_cents,
  paid_at, queued_at,
  chief_complaint
) VALUES (
  'eeeeeeee-0000-4000-8000-000000000001',
  'dddddddd-0000-4000-8000-000000000001',
  NULL,
  'in_queue',
  'AVULSA', 'Consulta avulsa', 5900,
  now(), now(),
  'Dor de cabeça há 3 dias'
)
ON CONFLICT (id) DO UPDATE SET
  status = 'in_queue',
  doctor_id = NULL,
  livekit_room_name = NULL,
  livekit_room_created_at = NULL,
  doctor_called_at = NULL,
  updated_at = now();
