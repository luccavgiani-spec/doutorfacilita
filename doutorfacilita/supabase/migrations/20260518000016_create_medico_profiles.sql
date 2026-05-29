-- Perfil do médico, vinculado 1:1 ao usuário do Supabase Auth.
-- Usado pela página /area-do-medico/perfil.

create table if not exists public.medico_profiles (
  id uuid references auth.users(id) primary key,
  nome_completo text,
  crm text,
  crm_estado text,
  especialidade text,
  cpf text,
  telefone text,
  endereco text,
  bio text,
  updated_at timestamptz default now()
);

alter table public.medico_profiles enable row level security;

create policy "medico le proprio perfil" on public.medico_profiles
  for select using (auth.uid() = id);

create policy "medico atualiza proprio perfil" on public.medico_profiles
  for update using (auth.uid() = id);

create policy "medico insere proprio perfil" on public.medico_profiles
  for insert with check (auth.uid() = id);
