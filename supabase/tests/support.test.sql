-- ============================================================================
-- 0009_support.sql — murojaatlar: kim nimani ko'radi/yozadi, fayl ruxsati.
-- Oxirida «support: OK».
-- ============================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function public._sup_fail(p_sql text, p_label text) returns void
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
grant execute on function public._sup_fail(text, text) to anon, authenticated;
create or replace function public._sup_eq(p_got text, p_want text, p_label text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: kutilgan %, olingan %', p_label, p_want, p_got;
  end if;
end;
$$;
grant execute on function public._sup_eq(text, text, text) to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'ua@test'),
  ('00000000-0000-0000-0000-0000000000e2', 'ub@test'),
  ('00000000-0000-0000-0000-0000000000e3', 'adm@test'),
  ('00000000-0000-0000-0000-0000000000e4', 'blk@test');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e3';
update public.profiles set status = 'blocked' where id = '00000000-0000-0000-0000-0000000000e4';

-- 1) Foydalanuvchi A: murojaat ochadi (fayl bilan), soxta admin belgisi o'tmaydi
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select public._sup_eq(public.support_upload_ok(
  '00000000-0000-0000-0000-0000000000e1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png')::text,
  'true', 'yangi murojaatga fayl');
insert into storage.objects (bucket_id, name) values
  ('support', '00000000-0000-0000-0000-0000000000e1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png');
select public._sup_fail($$insert into storage.objects (bucket_id, name) values
  ('support', '00000000-0000-0000-0000-0000000000e2/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.pdf')$$,
  'boshqaning papkasiga fayl');
select public._sup_fail($$insert into storage.objects (bucket_id, name) values
  ('support', '00000000-0000-0000-0000-0000000000e1/11111111-1111-4111-8111-111111111111/../x.html')$$,
  'noto''g''ri fayl nomi');
select public.support_open('11111111-1111-4111-8111-111111111111', '  Darsda xato  ', 'Rasmda körsatdim',
  '00000000-0000-0000-0000-0000000000e1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png',
  'screen.png', 'image/png', 1200);
select public._sup_eq((select subject from public.support_tickets), 'Darsda xato', 'mavzu tozalandi');
insert into public.support_messages (ticket_id, body, from_admin) values ('11111111-1111-4111-8111-111111111111', 'Men adminman', true);
select public._sup_eq((select from_admin::text from public.support_messages where body = 'Men adminman'), 'false', 'soxta admin belgisi');
select public._sup_eq((select status from public.support_tickets), 'open', 'soxta admin holatni o''zgartirmadi');
select public._sup_fail($$insert into public.support_messages (ticket_id, body, attachment_path, attachment_name, attachment_type, attachment_size)
  values ('11111111-1111-4111-8111-111111111111', 'x', '00000000-0000-0000-0000-0000000000e2/a.png', 'a.png', 'image/png', 10)$$, 'begona yo''l');
select public._sup_fail($$insert into public.support_messages (ticket_id, body, attachment_path, attachment_name, attachment_type, attachment_size)
  values ('11111111-1111-4111-8111-111111111111', 'x',
  '00000000-0000-0000-0000-0000000000e1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png', 'a.exe', 'application/x-msdownload', 10)$$, 'ruxsatsiz tur');
select public._sup_fail($$update public.support_tickets set status = 'answered'$$, 'holatni o''zi o''zgartirishi');
select public._sup_fail($$select public.admin_support_tickets(null)$$, 'admin ro''yxati oddiy foydalanuvchiga');
select public._sup_fail($$select public.support_set_status('11111111-1111-4111-8111-111111111111', 'answered')$$, 'egasi faqat yopadi');
commit;

-- 2) Foydalanuvchi B: A'ning murojaati va fayli ko'rinmaydi, yoza olmaydi
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select public._sup_eq((select count(*) from public.support_tickets)::text, '0', 'B murojaatni ko''rmaydi');
select public._sup_eq((select count(*) from public.support_messages)::text, '0', 'B xabarni ko''rmaydi');
select public._sup_eq((select count(*) from storage.objects)::text, '0', 'B faylni ko''rmaydi');
select public._sup_fail($$insert into public.support_messages (ticket_id, body) values ('11111111-1111-4111-8111-111111111111', 'salom')$$, 'B begona murojaatga');
select public._sup_fail($$insert into storage.objects (bucket_id, name) values
  ('support', '00000000-0000-0000-0000-0000000000e2/11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.pdf')$$,
  'B begona murojaat id bilan fayl');
commit;

-- 3) Admin: ko'radi, ilova bilan javob beradi → 'answered'
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
select public._sup_eq((select count(*) from public.admin_support_tickets(null))::text, '1', 'admin ro''yxati');
select public._sup_eq((select email from public.admin_support_tickets('open')), 'ua@test', 'admin emailni ko''radi');
select public._sup_eq((select count(*) from storage.objects)::text, '1', 'admin faylni ko''radi');
insert into storage.objects (bucket_id, name) values
  ('support', '00000000-0000-0000-0000-0000000000e1/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555.pdf');
insert into public.support_messages (ticket_id, body, attachment_path, attachment_name, attachment_type, attachment_size)
values ('11111111-1111-4111-8111-111111111111', 'Tuzatdik, rahmat!',
  '00000000-0000-0000-0000-0000000000e1/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555.pdf', 'javob.pdf', 'application/pdf', 5000);
select public._sup_eq((select status from public.support_tickets), 'answered', 'admin javobidan keyin');
select public._sup_eq((select from_admin::text from public.support_messages where body like 'Tuzatdik%'), 'true', 'admin belgisi serverda');
commit;

-- 4) A: javobni ko'radi, yozadi (→ open), yopadi; yopiqqa yoza olmaydi
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select public._sup_eq((select count(*) from public.support_messages)::text, '3', 'A javobni ko''radi');
select public._sup_eq((select count(*) from storage.objects)::text, '2', 'A admin faylini ko''radi');
insert into public.support_messages (ticket_id, body) values ('11111111-1111-4111-8111-111111111111', 'Yana bir savol');
select public._sup_eq((select status from public.support_tickets), 'open', 'foydalanuvchi yozdi');
select public.support_set_status('11111111-1111-4111-8111-111111111111', 'closed');
select public._sup_fail($$insert into public.support_messages (ticket_id, body) values ('11111111-1111-4111-8111-111111111111', 'x')$$, 'yopiq murojaatga');
select public._sup_eq(public.support_upload_ok(
  '00000000-0000-0000-0000-0000000000e1/11111111-1111-4111-8111-111111111111/66666666-6666-4666-8666-666666666666.png')::text,
  'false', 'yopiq murojaatga fayl');
delete from public.support_tickets;
select public._sup_eq((select count(*) from public.support_tickets)::text, '1', 'foydalanuvchi o''chira olmaydi');
commit;

-- 5) Limit: 5 dan ortiq ochiq murojaat yo'q
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select public.support_open(null, 'Savol ' || g, 'matn') from generate_series(1, 5) g;
select public._sup_fail($$select public.support_open(null, 'Oltinchi', 'matn')$$, '6-ochiq murojaat');
rollback;

-- 6) Bloklangan va mehmon
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e4';
select public._sup_fail($$select public.support_open(null, 'Blokdan', 'matn')$$, 'bloklangan murojaati');
commit;
begin;
set local role anon;
select public._sup_fail($$select count(*) from public.support_tickets$$, 'anon murojaatlar');
select public._sup_fail($$select public.support_open(null, 'Mehmon', 'matn')$$, 'anon support_open');
commit;

drop function public._sup_fail(text, text);
drop function public._sup_eq(text, text, text);
\echo 'support: OK'
