-- ============================================================================
-- 0006_peer_review.sql — RLS, tayinlash va moderatsiya testlari.
--
-- Ishga tushirish (lokal Postgres, bo'sh baza):
--   psql -v ON_ERROR_STOP=1 -d <baza> \
--     -f supabase/tests/_supabase_stub.sql \
--     -f supabase/migrations/0001_init.sql … -f supabase/migrations/0006_peer_review.sql \
--     -f supabase/tests/peer_review.test.sql
-- Yoki: `bash scripts/test-sql.sh` (README §5l).
-- Har tekshiruv xato bo'lsa `raise exception` bilan to'xtaydi; oxirida
-- «peer_review: OK» chiqadi.
-- ============================================================================

\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- Foydalanuvchilar: A — muallif, B/C/D — tekshiruvchilar.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test'),
  ('00000000-0000-0000-0000-00000000000d', 'd@test');

-- Xato KUTILADIGAN so'rov: xato bo'lmasa test yiqiladi.
create or replace function public._expect_fail(p_sql text, p_label text) returns void
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
grant execute on function public._expect_fail(text, text) to authenticated, anon;

create or replace function public._eq(p_got bigint, p_want bigint, p_label text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: kutilgan %, olingan %', p_label, p_want, p_got;
  end if;
end;
$$;
grant execute on function public._eq(bigint, bigint, text) to authenticated, anon;

create table public._ids (k text primary key, v uuid);
grant select, insert, update on public._ids to authenticated;

-- 1) A javob yuboradi va uni ko'radi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
with x as (
  insert into public.peer_submissions (kind, task_id, level, prompt, body)
  values ('writing', 'a1-w-01', 'A1', 'Write about your family.', 'My family is big. I have two brothers.')
  returning id
)
insert into public._ids (k, v) select 's1', id from x;
select public._eq((select count(*) from public.peer_submissions), 1, 'A o''z javobini ko''radi');
select public._expect_fail(
  $$insert into public.peer_submissions (author_id, kind, task_id, level, body)
    values ('00000000-0000-0000-0000-00000000000b', 'writing', 't', 'A1', 'boshqa nomidan')$$,
  'boshqa foydalanuvchi nomidan yuborish');
select public._expect_fail($$update public.peer_submissions set status = 'hidden'$$, 'mijoz holatni o''zgartira olmaydi');
commit;

-- 2) B tayinlanmaguncha ko'rmaydi va izoh yoza olmaydi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public._eq((select count(*) from public.peer_submissions), 0, 'B tayinlanmagan javobni ko''rmaydi');
select public._expect_fail(
  format($$insert into public.peer_reviews (submission_id, score, comment) values (%L, 4, 'Juda yaxshi yozilgan matn')$$,
    (select v from public._ids where k = 's1')),
  'tayinlanmagan izoh');
commit;

-- 3) B tayinlov oladi; ikkinchi chaqiruv O'SHA javobni qaytaradi (yig'ib olish yo'q).
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public._eq((select count(*) from public.peer_claim()), 1, 'B tayinlov oldi');
select public._eq((select count(*) from public.peer_claim() c where c.id = (select v from public._ids where k = 's1')), 1, 'qayta chaqiruv o''sha javob');
select public._eq((select count(*) from public.peer_assignments), 1, 'B da bitta tayinlov');
select public._eq((select count(*) from public.peer_submissions), 1, 'B endi javobni ko''radi');
select public._expect_fail(
  format($$insert into public.peer_reviews (submission_id, score, comment) values (%L, 4, 'qisqa')$$, (select v from public._ids where k = 's1')),
  'juda qisqa izoh');
select public._expect_fail(
  format($$insert into public.peer_reviews (submission_id, score, comment) values (%L, 9, 'Juda yaxshi yozilgan matn')$$, (select v from public._ids where k = 's1')),
  'baho 1–5 dan tashqari');
insert into public.peer_reviews (submission_id, score, comment)
  values ((select v from public._ids where k = 's1'), 4, 'Yaxshi. "brothers" to''g''ri, lekin gaplarni bog''lang.');
select public._expect_fail(
  format($$insert into public.peer_reviews (submission_id, score, comment) values (%L, 5, 'Ikkinchi marta izoh yozish')$$, (select v from public._ids where k = 's1')),
  'bir javobga ikki izoh');
commit;

-- 4) A o'z javobini o'zi tekshira olmaydi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public._eq((select count(*) from public.peer_claim()), 0, 'o''z javobi tayinlanmaydi');
select public._eq((select count(*) from public.peer_reviews), 1, 'A kelgan izohni ko''radi');
commit;

-- 5) C ham izoh yozadi; D ga endi tayinlanmaydi (2 ta izoh to'lgan).
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public._eq((select count(*) from public.peer_claim()), 1, 'C tayinlov oldi');
select public._eq((select count(*) from public.peer_reviews), 0, 'C boshqa izohni ko''rmaydi');
insert into public.peer_reviews (submission_id, score, comment)
  values ((select v from public._ids where k = 's1'), 3, 'Grammatika yaxshi, lekin matn juda qisqa.');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select public._eq((select count(*) from public.peer_claim()), 0, '2 ta izohli javob tayinlanmaydi');
commit;

-- Izoh id'lari (superuser sifatida — testning o'zi uchun).
insert into public._ids (k, v) select 'r_b', id from public.peer_reviews where score = 4;
insert into public._ids (k, v) select 'r_c', id from public.peer_reviews where score = 3;

-- 6) Muallif izohga shikoyat qiladi → izoh yashiriladi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public._eq((select count(*) from public.peer_reviews), 2, 'A ikkala izohni ko''radi');
insert into public.peer_reports (review_id, reason)
  select id, 'offensive' from public.peer_reviews where score = 3;
select public._eq((select count(*) from public.peer_reviews), 1, 'shikoyat qilingan izoh yashirildi');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
-- Id aniq beriladi: D izohni ko'rmaydi, shuning uchun `select … from peer_reviews`
-- bo'sh bo'lardi va 0 qator jimgina "muvaffaqiyatli" yozilardi.
select public._expect_fail(
  format($$insert into public.peer_reports (review_id, reason) values (%L, 'spam')$$, (select v from public._ids where k = 'r_b')),
  'begona izohga shikoyat');
select public._expect_fail(
  format($$insert into public.peer_reports (submission_id, reason) values (%L, 'spam')$$, (select v from public._ids where k = 's1')),
  'tayinlanmagan javobga shikoyat');
commit;

-- 7) Javobga 2 ta shikoyat → yashiriladi; tekshiruvchilar ko'rmaydi, muallif ko'radi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
with x as (
  insert into public.peer_submissions (kind, task_id, level, body)
  values ('speaking', 'a1-s-01', 'A1', 'hello my name is aziz') returning id
)
insert into public._ids (k, v) select 's2', id from x;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public._eq((select count(*) from public.peer_claim() c where c.id = (select v from public._ids where k = 's2')), 1, 'B s2 ni oldi');
insert into public.peer_reports (submission_id, reason) values ((select v from public._ids where k = 's2'), 'spam');
select public._eq((select count(*) from public.peer_submissions where id = (select v from public._ids where k = 's2')), 1, '1 shikoyatdan keyin hali ochiq');
-- Shikoyat qilingan javob o'sha tekshiruvchiga QAYTA berilmaydi (halqa yo'q).
select public._eq((select count(*) from public.peer_claim() c where c.id = (select v from public._ids where k = 's2')), 0, 'shikoyat qilingan javob qayta tayinlanmaydi');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select public._eq((select count(*) from public.peer_claim() c where c.id = (select v from public._ids where k = 's2')), 1, 'C s2 ni oldi');
insert into public.peer_reports (submission_id, reason) values ((select v from public._ids where k = 's2'), 'offensive');
select public._eq((select count(*) from public.peer_submissions where id = (select v from public._ids where k = 's2')), 0, '2 shikoyatdan keyin C ko''rmaydi');
select public._expect_fail(
  format($$insert into public.peer_reviews (submission_id, score, comment) values (%L, 4, 'Yashirilgan javobga izoh')$$, (select v from public._ids where k = 's2')),
  'yashirilgan javobga izoh');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select public._eq((select count(*) from public.peer_claim()), 0, 'yashirilgan javob tayinlanmaydi');
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public._eq((select count(*) from public.peer_submissions where status = 'hidden'), 1, 'muallif yashirilganini ko''radi');
commit;

-- 8) Kunlik chegara: 5 tadan keyin rad etiladi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.peer_submissions (kind, task_id, level, body) values ('writing', 't3', 'A1', 'uch');
insert into public.peer_submissions (kind, task_id, level, body) values ('writing', 't4', 'A1', 'to''rt');
insert into public.peer_submissions (kind, task_id, level, body) values ('writing', 't5', 'A1', 'besh');
select public._expect_fail($$insert into public.peer_submissions (kind, task_id, level, body) values ('writing', 't6', 'A1', 'olti')$$, 'kunlik chegara');
commit;

-- 9) Anon foydalanuvchi tayinlov ololmaydi va jadvallarni o'qiy olmaydi.
begin;
set local role anon;
select public._expect_fail($$select * from public.peer_claim()$$, 'anon peer_claim');
select public._expect_fail($$select * from public.peer_submissions$$, 'anon select');
commit;

-- 10) Muallif o'z javobini o'chiradi — izoh va tayinlovlar ham o'chadi.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
delete from public.peer_submissions where id = (select v from public._ids where k = 's1');
commit;
select public._eq((select count(*) from public.peer_reviews), 0, 'o''chirishda izohlar ham o''chdi');
select public._eq((select count(*) from public.peer_assignments where submission_id = (select v from public._ids where k = 's1')), 0, 'tayinlovlar ham o''chdi');

\echo 'peer_review: OK'
