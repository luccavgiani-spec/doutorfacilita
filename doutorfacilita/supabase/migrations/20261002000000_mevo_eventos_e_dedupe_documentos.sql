-- Mevo: deduplicação de PDFs + trilha de eventos da integração.
--
-- 1. Cada PDF chegava duas vezes: pelo webhook EMISSION e, segundos depois,
--    pelo postMessage `prescricao` da iframe. As URLs têm assinaturas S3
--    diferentes, mas apontam para o mesmo objeto. `mevo_object_key` é a URL
--    sem query string e vira a chave de idempotência por prescrição.
-- 2. `prescricoes_mevo.webhook_recebido_em` registra quando a Mevo chamou o
--    webhook para a prescrição.
-- 3. `mevo_eventos` guarda cada interação com a Mevo (chamadas à API,
--    webhooks, postMessage, arquivamento). Alimenta o monitor ao vivo do
--    admin e o refresh do prontuário. Nunca guarda token, credencial ou URL
--    assinada: o detalhe é sanitizado na Edge Function antes do insert.

-- ─── 1. Deduplicação ──────────────────────────────────────────────────
alter table public.prescricoes_documentos
  add column if not exists mevo_object_key text,
  add column if not exists origem text
    check (origem is null or origem in ('webhook', 'postmessage'));

update public.prescricoes_documentos
   set mevo_object_key = split_part(mevo_original_url, '?', 1)
 where mevo_object_key is null
   and coalesce(mevo_original_url, '') <> '';

-- Remove cópias já arquivadas do mesmo objeto (mantém a mais antiga). Os
-- arquivos órfãos no bucket só saem pela Storage API.
delete from public.prescricoes_documentos d
 using (
   select id,
          row_number() over (
            partition by prescricao_id, mevo_object_key
            order by download_attempted_at nulls last, created_at
          ) as rn
     from public.prescricoes_documentos
    where download_succeeded_at is not null
      and mevo_object_key is not null
 ) dup
 where d.id = dup.id
   and dup.rn > 1;

create unique index if not exists uq_prescricoes_documentos_objeto
  on public.prescricoes_documentos (prescricao_id, mevo_object_key)
  where download_succeeded_at is not null and mevo_object_key is not null;

-- ─── 2. Recebimento do webhook ────────────────────────────────────────
alter table public.prescricoes_mevo
  add column if not exists webhook_recebido_em timestamptz;

-- ─── 3. Trilha de eventos ─────────────────────────────────────────────
create table if not exists public.mevo_eventos (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  -- backend: nossa Edge Function chamando a API Mevo (ou validando antes dela)
  -- webhook: Mevo chamando o nosso webhook
  -- iframe:  evento postMessage da modal Mevo repassado pelo navegador
  -- storage: PDF baixado e arquivado no prontuário
  origem text not null check (origem in ('backend', 'webhook', 'iframe', 'storage')),
  evento text not null,
  http_status integer,
  duracao_ms integer,
  mevo_id_prescricao text,
  prescricao_id uuid references public.prescricoes_mevo(id) on delete set null,
  consultation_id uuid references public.consultations(id) on delete set null,
  doctor_id uuid references public.doctors(id) on delete set null,
  resumo text,
  detalhe jsonb
);

create index if not exists idx_mevo_eventos_criado_em
  on public.mevo_eventos (criado_em desc);
create index if not exists idx_mevo_eventos_consultation
  on public.mevo_eventos (consultation_id, criado_em desc);

alter table public.mevo_eventos enable row level security;

-- Escrita só pelas Edge Functions (service_role ignora RLS). Leitura: admin
-- vê tudo; médico vê os eventos das próprias prescrições.
drop policy if exists "mevo_eventos admin ou medico dono" on public.mevo_eventos;
create policy "mevo_eventos admin ou medico dono" on public.mevo_eventos
  for select using (
    has_role('admin') or doctor_id = current_doctor_id()
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'mevo_eventos'
  ) then
    alter publication supabase_realtime add table public.mevo_eventos;
  end if;
end $$;
