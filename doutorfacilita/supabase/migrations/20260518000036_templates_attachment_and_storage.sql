-- 036 — Anexo opcional pros templates de prontuário.
--
-- Admin pode anexar um Word/PDF como base/referência do template (a edição
-- ativa do texto continua sendo os campos chief_complaint_template etc).
-- Variáveis substituíveis seguem sintaxe {{nome_paciente}} dentro dos campos
-- de texto — substituição acontece no cockpit ao aplicar o template.
--
-- 1) Coluna attachment_path (storage path no bucket template-attachments).
-- 2) Bucket privado template-attachments.
-- 3) RLS de storage: admin gere; doctor lê.
--
-- Idempotente.

ALTER TABLE public.prontuario_templates
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('template-attachments', 'template-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS template_attachments_admin_all ON storage.objects;
CREATE POLICY template_attachments_admin_all
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'template-attachments' AND has_role('admin'))
  WITH CHECK (bucket_id = 'template-attachments' AND has_role('admin'));

DROP POLICY IF EXISTS template_attachments_doctor_read ON storage.objects;
CREATE POLICY template_attachments_doctor_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'template-attachments' AND current_doctor_id() IS NOT NULL);
