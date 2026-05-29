-- 020 — prescricoes_documentos: PDFs baixados da Mevo e salvos no Storage
--
-- A Mevo devolve URLs S3 assinadas que EXPIRAM EM 10 MIN. A Edge Function
-- mevo-salvar-documentos baixa e persiste no bucket privado prescricoes-pdfs;
-- cada arquivo vira uma linha aqui. Compliance de prontuário (CFM 1.821/2007).
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.prescricoes_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescricao_id uuid REFERENCES public.prescricoes_mevo(id) ON DELETE CASCADE NOT NULL,
  tipo_documento text NOT NULL,   -- RECEITA, EXAME, ATESTADO, LME, ENCAMINHAMENTO, RELATORIO, INSTRUCAO, MANIPULADOS
  categoria text,                 -- ex: RECEITA SIMPLES, CONTROLE ESPECIAL
  storage_path text NOT NULL,     -- caminho no bucket prescricoes-pdfs
  assinado boolean DEFAULT false,
  content_type text DEFAULT 'application/pdf',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescricoes_documentos_prescricao
  ON public.prescricoes_documentos (prescricao_id);

ALTER TABLE public.prescricoes_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medico le proprios documentos" ON public.prescricoes_documentos;
CREATE POLICY "medico le proprios documentos" ON public.prescricoes_documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.prescricoes_mevo p
      JOIN public.doctors d ON d.id = p.doctor_id
      WHERE p.id = prescricao_id AND d.user_id = auth.uid()
    )
  );
