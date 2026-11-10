-- ============================================================================
-- 0007_admin.sql — rollar, bloklash, admin RPC'lari testlari.
-- `bash scripts/test-sql.sh` bilan ishga tushadi. Oxirida «admin: OK».
-- Foydalanuvchilar: A1 — admin, U1/U2 — oddiy, M1 — moderator.
-- ============================================================================

\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function public._adm_fail(p_sql text, p_label text) returns void
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
grant execute on function public._adm_fail(text, text) to authenticated, anon;

create or replace function public._adm_eq(p_got text, p_want text, p_label text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: kutilgan %, olingan %', p_label, p_want, p_got;
  end if;
end;
$$;
grant execute on function public._adm_eq(text, text, text) to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test', '{"display_name":"Admin"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'user1@test', '{"display_name":"Ali Valiyev"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'user2@test', '{"display_name":"Zarina"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'mod@test', '{"display_name":"Moderator"}');

-- Yangi foydalanuvchi — rol 'user', status 'active'.
select public._adm_eq((select role || '/' || status from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'),
                      'user/active', 'standart rol');

-- Server (auth.uid() yo'q) birinchi adminni tayinlaydi.
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';

-- O'quv yozuvlari: U1 — 3 kunlik streak (bugun, kecha, o'tgan kun), XP 120.
insert into public.user_settings (user_id, current_level) values
  ('00000000-0000-0000-0000-0000000000b1', 'B1'),
  ('00000000-0000-0000-0000-0000000000b2', 'A1');
insert into public.daily_activity (user_id, day, seconds, attempts) values
  ('00000000-0000-0000-0000-0000000000b1', current_date, 300, 5),
  ('00000000-0000-0000-0000-0000000000b1', current_date - 1, 200, 3),
  ('00000000-0000-0000-0000-0000000000b1', current_date - 2, 100, 2),
  ('00000000-0000-0000-0000-0000000000b1', current_date - 5, 100, 2),
  ('00000000-0000-0000-0000-0000000000b2', current_date - 4, 100, 2);
insert into public.weekly_xp (user_id, week_start, xp) values
  ('00000000-0000-0000-0000-0000000000b1', current_date - 7, 70),
  ('00000000-0000-0000-0000-0000000000b1', current_date, 50);

-- 1) Oddiy foydalanuvchi o'zini admin qila olmaydi, o'zini bloklay/ochmaydi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select public._adm_fail($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'o''zini admin qilish');
select public._adm_fail($$update public.profiles set status = 'blocked' where id = auth.uid()$$, 'o''z statusini o''zgartirish');
-- Ismni o'zgartirish — mumkin.
update public.profiles set display_name = 'Ali V.' where id = auth.uid();
-- Admin funksiyalari yopiq.
select public._adm_fail($$select public.admin_stats()$$, 'admin_stats oddiy foydalanuvchiga');
select public._adm_fail($$select * from public.admin_list_users()$$, 'admin_list_users oddiy foydalanuvchiga');
select public._adm_fail($$select public.admin_delete_user('00000000-0000-0000-0000-0000000000b2')$$, 'admin_delete_user oddiy foydalanuvchiga');
-- Boshqalarning profili ko'rinmaydi.
select public._adm_eq((select count(*)::text from public.profiles), '1', 'oddiy foydalanuvchi faqat o''zini ko''radi');
select public._adm_eq(public.is_admin()::text, 'false', 'is_admin oddiy');
commit;

-- 2) Profilni qayta yaratib rol berish ham ishlamaydi (INSERT → 'user').
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
delete from public.profiles where id = auth.uid();
insert into public.profiles (id, display_name, role, status) values (auth.uid(), 'Zarina', 'admin', 'active');
select public._adm_eq((select role from public.profiles where id = auth.uid()), 'user', 'insert orqali admin');
rollback;

-- 3) Admin: statistika, ro'yxat, qidiruv, filtr, rol va status.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select public._adm_eq(public.is_admin()::text, 'true', 'is_admin admin');
select public._adm_eq((public.admin_stats() ->> 'total_users'), '4', 'jami foydalanuvchi');
select public._adm_eq((public.admin_stats() ->> 'admins'), '1', 'adminlar');
select public._adm_eq((public.admin_stats() ->> 'dau'), '1', 'DAU');
select public._adm_eq((public.admin_stats() ->> 'total_xp'), '120', 'jami XP');
select public._adm_eq((public.admin_stats() ->> 'avg_streak'), '3.0', 'o''rtacha streak');
select public._adm_eq(jsonb_array_length(public.admin_stats() -> 'signups_30d')::text, '30', '30 kunlik qatorlar');
select public._adm_eq((public.admin_stats() -> 'levels' ->> 'B1'), '1', 'darajalar B1');
select public._adm_eq((public.admin_stats() -> 'levels' ->> 'none'), '2', 'darajasi yo''q');

select public._adm_eq((select streak::text || '/' || xp::text || '/' || level from public.admin_list_users('user1'))
                      , '3/120/B1', 'U1 ko''rsatkichlari (emaildan qidiruv)');
select public._adm_eq((select count(*)::text from public.admin_list_users('ali v')), '1', 'ism bo''yicha qidiruv');
select public._adm_eq((select count(*)::text from public.admin_list_users('%')), '0', '% — so''zma-so''z');
select public._adm_eq((select max(total_count)::text from public.admin_list_users('', null, null, 2, 0)), '4', 'total_count sahifada');
select public._adm_eq((select count(*)::text from public.admin_list_users('', null, null, 2, 0)), '2', 'sahifa hajmi');
select public._adm_eq((select count(*)::text from public.admin_list_users('', 'admin')), '1', 'rol filtri');

update public.profiles set role = 'moderator' where id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set status = 'blocked' where id = '00000000-0000-0000-0000-0000000000b2';
select public._adm_eq((select count(*)::text from public.admin_list_users('', null, 'blocked')), '1', 'status filtri');
select public._adm_eq((public.admin_stats() ->> 'moderators'), '1', 'moderatorlar');

-- Oxirgi admin: o'zini tushira olmaydi va bloklay olmaydi.
select public._adm_fail($$update public.profiles set role = 'user' where id = auth.uid()$$, 'oxirgi adminni tushirish');
select public._adm_fail($$update public.profiles set status = 'blocked' where id = auth.uid()$$, 'admin o''zini bloklashi');
select public._adm_fail($$select public.admin_delete_user(auth.uid())$$, 'o''zini o''chirish');
commit;

-- 4) Ikkinchi admin bo'lsa — birinchisi o'zini tushira oladi; adminni o'chirib bo'lmaydi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1';
select public._adm_fail($$select public.admin_delete_user('00000000-0000-0000-0000-0000000000c1')$$, 'adminni o''chirish');
update public.profiles set role = 'user' where id = auth.uid();
select public._adm_eq(public.is_admin()::text, 'false', 'o''zini tushirgandan keyin');
rollback;

-- 5) Moderator admin emas.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select public._adm_fail($$select public.admin_stats()$$, 'moderatorga admin_stats');
-- RLS: moderator boshqaning qatorini ko'rmaydi — UPDATE 0 qatorga tegadi.
update public.profiles set status = 'blocked' where id = '00000000-0000-0000-0000-0000000000b1';
commit;
select public._adm_eq((select status from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 'active', 'moderator bloklay olmadi');

-- 6) Bloklangan foydalanuvchi: hamjamiyat va AI yopiq.
-- Faol U1 javob yubora oladi (cheklov faqat bloklanganga) — bu javob
-- bloklangan U2 uchun «tekshirishga olinadigan» bo'ladi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
insert into public.peer_submissions (kind, task_id, level, prompt, body)
values ('writing', 'a1-w-01', 'A1', 'p', 'My text is here.');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select public._adm_eq(public.is_blocked()::text, 'true', 'is_blocked');
select public._adm_fail($$insert into public.peer_submissions (kind, task_id, level, prompt, body)
                          values ('writing', 'a1-w-01', 'A1', 'p', 'My text.')$$, 'bloklangan javob yuborishi');
select public._adm_fail($$select public.peer_claim()$$, 'bloklangan tekshirishga olishi');
commit;
select public._adm_fail($$select public.ai_usage_take('00000000-0000-0000-0000-0000000000b2', 20)$$, 'bloklangan AI ishlatishi');
select public._adm_eq(public.ai_usage_take('00000000-0000-0000-0000-0000000000b1', 20)::text, 'true', 'faol foydalanuvchi AI');


-- 7) Admin foydalanuvchini o'chiradi (auth.users → kaskad).
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select public.admin_delete_user('00000000-0000-0000-0000-0000000000b2');
select public._adm_eq((select count(*)::text from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), '0', 'profil o''chdi');
commit;
select public._adm_eq((select count(*)::text from auth.users where id = '00000000-0000-0000-0000-0000000000b2'), '0', 'auth.users o''chdi');

-- Tozalash (keyingi test fayllariga ta'sir qilmasin).
delete from auth.users where id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1');
update public.profiles set role = 'user' where id = '00000000-0000-0000-0000-0000000000a1';
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
drop function public._adm_fail(text, text);
drop function public._adm_eq(text, text, text);

\echo 'admin: OK'
