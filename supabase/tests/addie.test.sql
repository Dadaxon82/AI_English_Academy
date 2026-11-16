-- ============================================================================
-- 0010_addie.sql — A0 darajasi, ADDIE jadvallari va RLS testlari.
-- Ishga tushirish: `bash scripts/test-sql.sh` (README §5l).
-- Har tekshiruv xato bo'lsa `raise exception` bilan to'xtaydi.
-- ============================================================================

\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000a0d01', 'addie1@test'),
  ('00000000-0000-0000-0000-0000000a0d02', 'addie2@test'),
  ('00000000-0000-0000-0000-0000000a0d03', 'addie3@test');

create or replace function public._addie_fail(p_sql text, p_label text) returns void
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
grant execute on function public._addie_fail(text, text) to authenticated, anon;

create or replace function public._addie_eq(p_got bigint, p_want bigint, p_label text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: kutilgan %, olingan %', p_label, p_want, p_got;
  end if;
end;
$$;
grant execute on function public._addie_eq(bigint, bigint, text) to authenticated, anon;

create table public._addie_ids (k text primary key, v uuid);
grant select, insert on public._addie_ids to authenticated;

-- 1) A0 darajasi sozlamalarda qabul qilinadi (oldin CHECK rad etardi), noto'g'ri daraja — yo'q.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d01';
insert into public.user_settings (user_id, current_level, target_level)
  values ('00000000-0000-0000-0000-0000000a0d01', 'A0', 'B1')
  on conflict (user_id) do update set current_level = 'A0';
select public._addie_eq((select count(*) from public.user_settings where current_level = 'A0'), 1, 'A0 sozlama');
select public._addie_fail($q$update public.user_settings set current_level = 'Z9' where user_id = auth.uid()$q$, 'Z9 daraja');
commit;

-- 2) user_progress / adaptive_plans / ai_chat_logs — faqat egasi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d01';
insert into public.user_progress (level, skills, velocity, error_categories, completed_days)
  values ('A0', '{"grammar": {"accuracy": 70, "count": 10}}', '{"activeDays7": 3}', '[{"key": "grammar:a an", "open": 2}]', 2);
insert into public.adaptive_plans (level, target_difficulty, plan) values ('A0', 2, '{"actions": []}');
insert into public.ai_chat_logs (dialogue_id, level, engine, lines)
  values ('a0-cafe', 'A0', 'script', '[{"speaker": "partner", "text": "Hi!"}, {"speaker": "learner", "text": "Hello!"}]');
select public._addie_fail($q$insert into public.adaptive_plans (level, target_difficulty, plan) values ('A0', 9, '{}')$q$, 'qiyinlik 9');
select public._addie_fail($q$insert into public.ai_chat_logs (dialogue_id, level, engine, lines) values ('x', 'A0', 'script', '[]')$q$, 'bosh suhbat');
select public._addie_fail($q$insert into public.user_progress (user_id, level) values ('00000000-0000-0000-0000-0000000a0d02', 'A1')$q$, 'boshqa odam nomidan');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d02';
select public._addie_eq((select count(*) from public.user_progress), 0, 'begona progress körinmaydi');
select public._addie_eq((select count(*) from public.adaptive_plans), 0, 'begona reja körinmaydi');
select public._addie_eq((select count(*) from public.ai_chat_logs), 0, 'begona suhbat körinmaydi');
commit;

-- 3) Ustoz izohi: o'z yozma ishiga yoziladi, uzunligi cheklangan.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d01';
insert into public.writing_submissions (id, user_id, task_id, text, mentor_note)
  values ('addie-w1', '00000000-0000-0000-0000-0000000a0d01', 'a0-w1-form-name', 'My name is Lola.', 'Yaxşi! Katta harfga e’tibor bering.');
select public._addie_eq((select count(*) from public.writing_submissions where mentor_note is not null), 1, 'mentor izohi');
select public._addie_fail(format($q$update public.writing_submissions set mentor_note = %L where id = 'addie-w1'$q$, repeat('x', 2001)), 'juda uzun izoh');
commit;

-- 4) Guruh mashg'uloti: yaratish, ko'rish, qo'shilish, sig'im.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d01';
with x as (
  insert into public.group_sessions (kind, level, title, topic, starts_at, capacity)
  values ('study', 'A0', 'Alifbo va ismlar', 'Ismni harflab aytiş', now() + interval '1 day', 2)
  returning id
)
insert into public._addie_ids (k, v) select 'g1', id from x;
select public._addie_fail($q$insert into public.group_sessions (kind, level, title, starts_at) values ('study', 'A0', 'Ötgan', now() - interval '1 hour')$q$, 'ötgan vaqt');
select public._addie_fail($q$insert into public.group_sessions (host_id, kind, level, title, starts_at) values ('00000000-0000-0000-0000-0000000a0d02', 'study', 'A0', 'Begona', now() + interval '1 day')$q$, 'begona host');
-- Tashkilotchi o'zi ham qo'shiladi (1/2)
select public.group_join((select v from public._addie_ids where k = 'g1'));
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d02';
select public._addie_eq((select count(*) from public.group_sessions), 1, 'rejalashtirilgan körinadi');
select public.group_join((select v from public._addie_ids where k = 'g1'));
-- Takror qo'shilish xato emas va sanoqni oshirmaydi
select public.group_join((select v from public._addie_ids where k = 'g1'));
select public._addie_eq(public.group_member_count((select v from public._addie_ids where k = 'g1')), 2, 'a’zolar 2');
select public._addie_fail($q$insert into public.group_members (session_id, user_id) select v, '00000000-0000-0000-0000-0000000a0d02' from public._addie_ids where k = 'g1'$q$, 'togri insert');
commit;

-- Begona tashkilotchi mashg'ulotini o'zgartira olmaydi (RLS: 0 qator).
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d02';
update public.group_sessions set capacity = 30;
commit;
select public._addie_eq((select capacity from public.group_sessions limit 1), 2, 'begona sig‘im özgarmadi');

-- Uchinchi foydalanuvchi: joy yo'q.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d03';
select public._addie_fail(format('select public.group_join(%L)', (select v from public._addie_ids where k = 'g1')), 'tola guruh');
-- Ikkinchi foydalanuvchi a'zoligini ko'ra olmaydi (faqat o'zini).
select public._addie_eq((select count(*) from public.group_members), 0, 'begona a’zolik körinmaydi');
commit;

-- Bekor qilingan mashg'ulot boshqalarga ko'rinmaydi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d01';
update public.group_sessions set status = 'cancelled';
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000a0d03';
select public._addie_eq((select count(*) from public.group_sessions), 0, 'bekor qilingan körinmaydi');
commit;

-- 5) Mehmon (anon) — hech narsa.
begin;
set local role anon;
select public._addie_fail($q$select count(*) from public.group_sessions$q$, 'anon guruhlar');
select public._addie_fail($q$select count(*) from public.user_progress$q$, 'anon progress');
select public._addie_fail($q$select public.group_join(gen_random_uuid())$q$, 'anon join');
commit;

-- Boshqa testlar foydalanuvchilarni sanaydi — o'zimiz qo'shganlarni olib tashlaymiz.
delete from public.group_sessions where host_id::text like '00000000-0000-0000-0000-0000000a0d0%';
delete from public.writing_submissions where id = 'addie-w1';
delete from public.profiles where id::text like '00000000-0000-0000-0000-0000000a0d0%';
delete from auth.users where id::text like '00000000-0000-0000-0000-0000000a0d0%';
drop table public._addie_ids;
drop function public._addie_fail(text, text);
drop function public._addie_eq(bigint, bigint, text);
\echo addie: OK
