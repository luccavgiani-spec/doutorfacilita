-- 025 — prontuario_templates: templates aplicáveis a medical_records.
--
-- Espelha os campos fixos SOAP de medical_records (chief_complaint,
-- history_present_illness, physical_exam, diagnostic_hypothesis, conduct)
-- + extensão via structured_fields (vira structured_data ao aplicar).
--
-- RLS: médico lê templates ativos; admin gere tudo. Idempotente.

CREATE TABLE IF NOT EXISTS public.prontuario_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  especialidade text,
  descricao text,

  -- pré-preenchimentos pros campos fixos de medical_records
  chief_complaint_template text,
  history_present_illness_template text,
  physical_exam_template text,
  diagnostic_hypothesis_template text,
  conduct_template text,
  cid10_suggested text[] DEFAULT '{}',

  -- campos extras → structured_data ao aplicar
  -- formato: [{ key, label, type, options?, required? }]
  structured_fields jsonb NOT NULL DEFAULT '[]'::jsonb,

  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prontuario_templates_ativo
  ON public.prontuario_templates (ativo);

ALTER TABLE public.prontuario_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctors read active templates" ON public.prontuario_templates;
CREATE POLICY "doctors read active templates"
  ON public.prontuario_templates FOR SELECT
  USING (ativo OR has_role('admin'));

DROP POLICY IF EXISTS "admins insert templates" ON public.prontuario_templates;
CREATE POLICY "admins insert templates"
  ON public.prontuario_templates FOR INSERT WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "admins update templates" ON public.prontuario_templates;
CREATE POLICY "admins update templates"
  ON public.prontuario_templates FOR UPDATE
  USING (has_role('admin')) WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "admins delete templates" ON public.prontuario_templates;
CREATE POLICY "admins delete templates"
  ON public.prontuario_templates FOR DELETE USING (has_role('admin'));

DROP TRIGGER IF EXISTS prontuario_templates_set_updated_at ON public.prontuario_templates;
CREATE TRIGGER prontuario_templates_set_updated_at
  BEFORE UPDATE ON public.prontuario_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
