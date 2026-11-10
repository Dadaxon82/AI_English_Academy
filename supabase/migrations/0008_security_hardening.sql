-- ============================================================================
-- 0008 — XAVFSIZLIKNI KUCHAYTIRISH (2026-11-10 audit; Supabase Security
-- Advisor ogohlantirishlari asosida).
--
--  1) Trigger / event-trigger funksiyalari RPC orqali chaqirilmasin
--     (`/rest/v1/rpc/handle_new_user` va h.k.) — EXECUTE olib tashlanadi.
--     Trigger'lar baribir ishlaydi (trigger EXECUTE huquqini tekshirmaydi).
--  2) Mehmon (`anon`) rolidan yordamchi va peer funksiyalari olinadi.
--  3) `is_blocked(p_user)` — faqat O'ZINI (yoki admin / server) tekshiradi:
--     boshqa foydalanuvchi bloklanganini bilib bo'lmaydi.
--  4) `touch_updated_at` — qat'iy `search_path`.
--  5) `anon` — foydalanuvchi jadvallariga hech qanday huquq yo'q (RLS'dan
--     tashqari ikkinchi qatlam); kontent jadvallari — faqat o'qish.
--  6) `weekly_xp` — faqat o'z hafta+ligasidagi qatorlar o'qiladi (oldin
--     istalgan kirgan foydalanuvchi barcha ism va XP'larni o'qiy olardi).
-- ============================================================================

-- 1) Trigger funksiyalari ----------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.handle_new_user()',
    'public.touch_updated_at()',
    'public.profiles_guard()',
    'public.reject_blocked_user()',
    'public.peer_moderate()',
    'public.peer_submission_limit()',
    'public.rls_auto_enable()'
  ] loop
    if to_regprocedure(fn) is not null then
      begin
        execute format('revoke all on function %s from public, anon, authenticated', fn);
      exception when insufficient_privilege then
        raise notice 'huquq yo''q: %', fn; -- (masalan Supabase o'zining funksiyasi)
      end;
    end if;
  end loop;
end $$;

-- 4) search_path
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- 2) Yordamchi va peer funksiyalari: faqat kirgan foydalanuvchi ----------------
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

revoke all on function public.peer_claim(text) from public, anon;
grant execute on function public.peer_claim(text) to authenticated;
revoke all on function public.peer_is_assigned(uuid) from public, anon;
grant execute on function public.peer_is_assigned(uuid) to authenticated;
revoke all on function public.peer_is_author(uuid) from public, anon;
grant execute on function public.peer_is_author(uuid) to authenticated;

-- 3) is_blocked — faqat o'zini (server va admin — istalganini)
create or replace function public.is_blocked(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null or p_user = auth.uid() or public.is_admin()
      then exists (select 1 from public.profiles where id = p_user and status = 'blocked')
    else false
  end
$$;
revoke all on function public.is_blocked(uuid) from public, anon;
grant execute on function public.is_blocked(uuid) to authenticated, service_role;

-- 5) anon — foydalanuvchi jadvallariga huquq yo'q ------------------------------
do $$
declare
  t text;
begin
  for t in
    select c.relname from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
  loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', t);
    if t not in ('lessons', 'exercises', 'vocabulary_items', 'mock_exams') then
      execute format('revoke select on public.%I from anon', t);
    end if;
  end loop;
end $$;
-- Keyin yaratiladigan jadvallar uchun ham (migratsiyalarni bajaruvchi rol nomidan)
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon;

-- 6) weekly_xp — faqat o'z liga tablasi ----------------------------------------
create or replace function public.weekly_league_of(p_week date)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select league_id from public.weekly_xp where user_id = auth.uid() and week_start = p_week
$$;
revoke all on function public.weekly_league_of(date) from public, anon;
grant execute on function public.weekly_league_of(date) to authenticated;

drop policy if exists "weekly_xp: read league mates" on public.weekly_xp;
drop policy if exists "weekly_xp: read own league" on public.weekly_xp;
create policy "weekly_xp: read own league" on public.weekly_xp
  for select to authenticated
  using (user_id = auth.uid() or league_id = public.weekly_league_of(week_start));

-- 7) Kirgan foydalanuvchi: siyosati yo'q amallar huquqi ham olinadi
--    (RLS baribir to'xtatadi — bu ikkinchi qatlam; Supabase standarti ALL beradi).
revoke update, truncate, references, trigger on public.peer_submissions from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.peer_assignments from authenticated;
revoke update, delete, truncate, references, trigger on public.peer_reviews from authenticated;
revoke update, delete, truncate, references, trigger on public.peer_reports from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.ai_usage from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.lessons, public.exercises, public.vocabulary_items, public.mock_exams from authenticated;
