-- Structured professional address; existing doctor RLS continues to apply.
alter table public.doctors
  add column if not exists address_line text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text;
alter table public.patients add column if not exists social_name text;
