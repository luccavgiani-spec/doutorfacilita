-- 017 — Merge medico_profiles → doctors (fonte única do médico)
--
-- Decisão de arquitetura (kickoff Mevo): NÃO manter tabelas paralelas.
-- `public.doctors` já é a fonte usada pelas Edge Functions de LiveKit, pelo
-- seed e por getUserRole(). `medico_profiles` (migration 016) era uma 2ª
-- representação só usada por /area-do-medico/perfil e /cockpit (display).
--
-- Esta migration:
--   1. adiciona em doctors as colunas que faltavam (endereco, bio);
--   2. copia os dados PENDENTES de medico_profiles → doctors
--      (só preenche onde doctors está NULL/vazio — nunca sobrescreve dado real);
--   3. dropa medico_profiles.
--
-- Mapeamento de colunas:
--   medico_profiles.nome_completo  → doctors.full_name
--   medico_profiles.crm            → doctors.council_number
--   medico_profiles.crm_estado     → doctors.council_state
--   medico_profiles.especialidade  → doctors.primary_specialty
--   medico_profiles.cpf            → doctors.cpf
--   medico_profiles.telefone       → doctors.phone        (já existe; sem coluna nova)
--   medico_profiles.endereco       → doctors.endereco     (coluna nova)
--   medico_profiles.bio            → doctors.bio          (coluna nova)
--
-- Vínculo: medico_profiles.id == auth.users.id == doctors.user_id.
-- Idempotente (safe re-run).

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS bio text;

-- Garante que council tenha default 'CRM' (Mevo: Profissional.RegistroProfissional.Conselho)
ALTER TABLE public.doctors
  ALTER COLUMN council SET DEFAULT 'CRM';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'medico_profiles'
  ) THEN
    -- Copia só o que está faltando em doctors (NULLIF trata string vazia como vazio).
    UPDATE public.doctors d
    SET
      full_name         = COALESCE(NULLIF(d.full_name, ''),        NULLIF(mp.nome_completo, '')),
      council_number    = COALESCE(NULLIF(d.council_number, ''),   NULLIF(mp.crm, '')),
      council_state     = COALESCE(NULLIF(d.council_state, ''),    NULLIF(mp.crm_estado, '')),
      primary_specialty = COALESCE(NULLIF(d.primary_specialty, ''),NULLIF(mp.especialidade, '')),
      cpf               = COALESCE(NULLIF(d.cpf, ''),              NULLIF(mp.cpf, '')),
      phone             = COALESCE(NULLIF(d.phone, ''),            NULLIF(mp.telefone, '')),
      endereco          = COALESCE(NULLIF(d.endereco, ''),         NULLIF(mp.endereco, '')),
      bio               = COALESCE(NULLIF(d.bio, ''),              NULLIF(mp.bio, '')),
      updated_at        = now()
    FROM public.medico_profiles mp
    WHERE d.user_id = mp.id;

    -- NOTA: perfis órfãos (medico_profiles sem doctors correspondente) são
    -- cenário só de dev — o seed canônico cria a linha em doctors. Não há
    -- INSERT aqui porque doctors tem colunas NOT NULL fora do escopo Mevo.

    DROP TABLE public.medico_profiles;
  END IF;
END$$;
