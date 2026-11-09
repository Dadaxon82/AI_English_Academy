-- ============================================================================
-- 0005 — AI fikr-mulohazasi uchun kunlik limit (`supabase/functions/ai-feedback`).
--
--  * `ai_usage`: foydalanuvchi × kun → so'rovlar soni.
--  * RLS yoqilgan: foydalanuvchi faqat O'Z hisobini O'QIYDI; yozish faqat
--    service role orqali `ai_usage_take()` bilan (mijoz limitni chetlab
--    o'tolmaydi).
--  * `ai_usage_take(p_user, p_limit)` — atomik: limitdan oshmasa +1 va true,
--    aks holda false. Faqat service_role bajara oladi.
-- ============================================================================

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select using (auth.uid() = user_id);

create or replace function public.ai_usage_take(p_user uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.ai_usage (user_id, day, count)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update
    set count = public.ai_usage.count + 1
    where public.ai_usage.count < p_limit
  returning count into v_count;
  return v_count is not null;
end;
$$;

revoke all on function public.ai_usage_take(uuid, integer) from public, anon, authenticated;
grant execute on function public.ai_usage_take(uuid, integer) to service_role;
