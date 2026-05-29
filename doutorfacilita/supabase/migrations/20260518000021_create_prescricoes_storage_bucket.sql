-- 021 — Bucket privado prescricoes-pdfs + policy de leitura
--
-- PRIVADO (public=false): PDFs de prontuário nunca são acessíveis por URL
-- pública. O frontend lê via signed URL gerada server-side.
--
-- Caminho dos objetos: {doctor_id}/{prescricao_id}/{tipo}-{uuid}.pdf
-- (a Edge Function mevo-salvar-documentos faz upload com service_role).
--
-- A policy abaixo cobre leitura via JWT do médico (signed URL respeita RLS
-- de storage.objects). Upload é feito por service_role, que ignora RLS.
-- Idempotente.

INSERT INTO storage.buckets (id, name, public)
VALUES ('prescricoes-pdfs', 'prescricoes-pdfs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "medico le proprios pdfs" ON storage.objects;
CREATE POLICY "medico le proprios pdfs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'prescricoes-pdfs'
    AND EXISTS (
      SELECT 1
      FROM public.prescricoes_documentos d
      JOIN public.prescricoes_mevo p ON p.id = d.prescricao_id
      JOIN public.doctors doc ON doc.id = p.doctor_id
      WHERE d.storage_path = storage.objects.name
        AND doc.user_id = auth.uid()
    )
  );
