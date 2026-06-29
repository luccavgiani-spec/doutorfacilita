-- Backstop de PDF perdido na integração Mevo.
--
-- Hoje prescricoes_documentos só grava no SUCESSO do download/upload. Se o
-- download do PDF (URL S3 que expira em 10 min) falhar, não fica rastro — e
-- a view de monitor apontava pro schema inglês morto (prescription_files /
-- prescriptions). Esta migração:
--   1. torna storage_path opcional (falha = sem arquivo arquivado);
--   2. adiciona colunas de rastreio de tentativa/erro;
--   3. repõe a view de monitor apontando pro schema vivo (PT).

alter table public.prescricoes_documentos
  alter column storage_path drop not null,
  add column if not exists mevo_original_url text,
  add column if not exists download_attempted_at timestamptz not null default now(),
  add column if not exists download_succeeded_at timestamptz,
  add column if not exists download_error text;

drop view if exists public.v_failed_pdf_downloads;
create view public.v_failed_pdf_downloads as
select d.id as documento_id, d.prescricao_id, p.consultation_id, p.patient_id, p.doctor_id,
       d.tipo_documento, d.categoria, d.mevo_original_url,
       d.download_attempted_at, d.download_error,
       extract(epoch from (now() - d.download_attempted_at))::int as seconds_since_attempt,
       case when extract(epoch from (now() - d.download_attempted_at)) > 600
            then 'EXPIRED' else 'RETRY_POSSIBLE' end as recovery_status
from public.prescricoes_documentos d
join public.prescricoes_mevo p on p.id = d.prescricao_id
where d.download_succeeded_at is null
order by d.download_attempted_at desc;
