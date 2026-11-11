-- ============================================================================
-- Lokal Postgres'da migratsiyalarni sinash uchun Supabase'ning MINIMAL
-- taqlidi (faqat testlar uchun, prod bazaga QO'LLANMAYDI):
--   * rollar: anon, authenticated, service_role;
--   * auth.users jadvali va auth.uid() — `request.jwt.claim.sub` sozlamasidan
--     (Supabase'dagi kabi; testda `set local` bilan beriladi).
-- ============================================================================
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase standarti: public sxemada yaratilgan har jadvalga anon/authenticated
-- ga barcha huquqlar beriladi (himoya — RLS va 0008 dagi revoke'lar). Testlar
-- real muhitdagidek bo'lishi uchun shu yerda ham.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Storage taqlidi (0009 murojaat fayllari): bucket'lar va obyektlar, RLS yoqilgan.
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default auth.uid(),
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
