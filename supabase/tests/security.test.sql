-- ============================================================================
-- 0008_security_hardening.sql — xavfsizlik testlari. Oxirida «security: OK».
-- ============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function public._sec_fail(p_sql text, p_label text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    return;
  end;
  raise exception 'KUTILMAGAN MUVAFFAQIYAT: %', p_label;
end;
$$;
grant execute on function public._sec_fail(text, text) to anon, authenticated;

create or replace function public._sec_eq(p_got text, p_want text, p_label text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: kutilgan %, olingan %', p_label, p_want, p_got;
  end if;
end;
$$;
grant execute on function public._sec_eq(text, text, text) to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'sa@test'),
  ('00000000-0000-0000-0000-0000000000d2', 'sb@test'),
  ('00000000-0000-0000-0000-0000000000d3', 'sc@test');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d3';
update public.profiles set status = 'blocked' where id = '00000000-0000-0000-0000-0000000000d2';
insert into public.weekly_xp (user_id, week_start, xp, league_id) values
  ('00000000-0000-0000-0000-0000000000d1', '2026-11-09', 50, 'bronze'),
  ('00000000-0000-0000-0000-0000000000d2', '2026-11-09', 70, 'bronze'),
  ('00000000-0000-0000-0000-0000000000d3', '2026-11-09', 90, 'silver');

-- 1) Mehmon (anon): foydalanuvchi jadvallari yopiq, kontent — faqat o'qish
begin;
set local role anon;
select public._sec_fail($$select count(*) from public.profiles$$, 'anon profiles o''qishi');
select public._sec_fail($$select count(*) from public.exercise_attempts$$, 'anon urinishlarni o''qishi');
select public._sec_fail($$insert into public.lessons (id, level, day_number, title_uz) values ('x', 'A1', 99, 'x')$$, 'anon kontent yozishi');
select count(*) from public.lessons;
select public._sec_fail($$select public.is_admin()$$, 'anon is_admin');
select public._sec_fail($$select public.peer_claim(null)$$, 'anon peer_claim');
commit;

-- 2) Trigger funksiyalarini RPC orqali chaqirib bo'lmaydi
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select public._sec_fail($$select public.handle_new_user()$$, 'handle_new_user RPC');
select public._sec_fail($$select public.profiles_guard()$$, 'profiles_guard RPC');
-- 3) is_blocked — boshqani tekshirib bo'lmaydi
select public._sec_eq(public.is_blocked('00000000-0000-0000-0000-0000000000d2')::text, 'false', 'boshqaning bloki yashirin');
select public._sec_eq(public.is_blocked()::text, 'false', 'o''zi bloklanmagan');
-- 6) weekly_xp — faqat o'z ligasi (bronze), silver ko'rinmaydi
select public._sec_eq((select count(*)::text from public.weekly_xp), '2', 'o''z ligasi: 2 qator');
select public._sec_eq((select count(*)::text from public.weekly_xp where league_id = 'silver'), '0', 'boshqa liga yopiq');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
select public._sec_eq(public.is_blocked()::text, 'true', 'o''zining bloki ko''rinadi');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d3';
select public._sec_eq(public.is_blocked('00000000-0000-0000-0000-0000000000d2')::text, 'true', 'admin ko''radi');
commit;

-- Server (auth.uid() yo'q) — istalganini
select public._sec_eq(public.is_blocked('00000000-0000-0000-0000-0000000000d2')::text, 'true', 'server ko''radi');

-- Tozalash
update public.profiles set role = 'user' where id = '00000000-0000-0000-0000-0000000000d3';
delete from auth.users where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3');
drop function public._sec_fail(text, text);
drop function public._sec_eq(text, text, text);

\echo 'security: OK'
