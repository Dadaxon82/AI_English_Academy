-- ============================================================================
-- 0009 — ADMINGA MUROJAAT (support tickets) + rasm/PDF ilovalar.
--
--  * support_tickets — foydalanuvchi murojaati (mavzu, holat).
--  * support_messages — yozishma: foydalanuvchi va admin xabarlari, ixtiyoriy
--    bitta ilova (PNG/JPEG/WebP rasm yoki PDF, ≤ 5 MB).
--  * Fayllar — YOPIQ (private) `support` bucket'i, yo'l:
--        <ticket egasi id>/<ticket id>/<uuid>.<png|jpg|webp|pdf>
--    Har kim faqat o'z murojaati fayllarini ko'radi; admin — barchasini.
--    Fayl faqat qisqa muddatli imzolangan havola (signed URL) orqali ochiladi.
--
-- Xavfsizlik SERVERDA: muallif / admin belgisi trigger'da `auth.uid()` va
-- `is_admin()` dan qo'yiladi (mijoz soxtalashtira olmaydi); holat faqat
-- trigger yoki `support_set_status` orqali o'zgaradi; bloklangan foydalanuvchi
-- yoza olmaydi; spamga qarshi limitlar (ochiq murojaat, soatlik xabar va fayl).
-- ============================================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, last_message_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  from_admin boolean not null default false,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  attachment_path text,
  attachment_name text check (attachment_name is null or char_length(attachment_name) between 1 and 120),
  attachment_type text check (attachment_type is null or attachment_type in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
  attachment_size integer check (attachment_size is null or attachment_size between 1 and 5242880),
  created_at timestamptz not null default now(),
  check ((attachment_path is null) = (attachment_type is null) and (attachment_path is null) = (attachment_size is null)
         and (attachment_path is null) = (attachment_name is null))
);
create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);
create index if not exists support_messages_author_idx on public.support_messages (author_id, created_at desc);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- Huquqlar: faqat kerakli amallar (RLS — asosiy himoya, bu ikkinchi qatlam).
revoke all on public.support_tickets, public.support_messages from anon;
revoke update, delete, truncate, references, trigger on public.support_tickets from authenticated;
revoke update, delete, truncate, references, trigger on public.support_messages from authenticated;
grant select, insert on public.support_tickets, public.support_messages to authenticated;
grant delete on public.support_tickets to authenticated; -- faqat admin (siyosat)

-- ------------------------------------------------------------------ siyosatlar
drop policy if exists "support_tickets: read own or admin" on public.support_tickets;
create policy "support_tickets: read own or admin" on public.support_tickets
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "support_tickets: create own" on public.support_tickets;
create policy "support_tickets: create own" on public.support_tickets
  for insert to authenticated with check (user_id = auth.uid() and status = 'open');

drop policy if exists "support_tickets: not blocked" on public.support_tickets;
create policy "support_tickets: not blocked" on public.support_tickets
  as restrictive for insert to authenticated with check (not public.is_blocked());

drop policy if exists "support_tickets: admin deletes" on public.support_tickets;
create policy "support_tickets: admin deletes" on public.support_tickets
  for delete to authenticated using (public.is_admin());

drop policy if exists "support_messages: read own or admin" on public.support_messages;
create policy "support_messages: read own or admin" on public.support_messages
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

drop policy if exists "support_messages: write own ticket or admin" on public.support_messages;
create policy "support_messages: write own ticket or admin" on public.support_messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
    )
  );

drop policy if exists "support_messages: not blocked" on public.support_messages;
create policy "support_messages: not blocked" on public.support_messages
  as restrictive for insert to authenticated with check (not public.is_blocked());

-- ------------------------------------------------------------------ trigger'lar
-- Ochiq murojaatlar limiti (spamga qarshi).
create or replace function public.support_ticket_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.subject := btrim(new.subject);
  new.status := 'open';
  new.created_at := now();
  new.updated_at := now();
  new.last_message_at := now();
  if (select count(*) from public.support_tickets where user_id = new.user_id and status <> 'closed') >= 5 then
    raise exception 'support_too_many' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.support_ticket_guard() from public, anon, authenticated;

drop trigger if exists support_ticket_guard on public.support_tickets;
create trigger support_ticket_guard
  before insert on public.support_tickets
  for each row execute function public.support_ticket_guard();

-- Xabar: muallif va admin belgisi serverda, yopiq murojaat, ilova yo'li, limit.
create or replace function public.support_message_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_status text;
begin
  select user_id, status into v_owner, v_status from public.support_tickets where id = new.ticket_id;
  if v_owner is null then
    raise exception 'support_not_found' using errcode = '23503';
  end if;
  new.author_id := auth.uid();
  new.from_admin := coalesce(public.is_admin(), false);
  new.body := btrim(new.body);
  new.created_at := now();
  if not new.from_admin and v_owner is distinct from auth.uid() then
    raise exception 'support_forbidden' using errcode = '42501';
  end if;
  if not new.from_admin and v_status = 'closed' then
    raise exception 'support_closed' using errcode = '23514';
  end if;
  if new.attachment_path is not null then
    if new.attachment_path !~ ('^' || v_owner::text || '/' || new.ticket_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|pdf)$') then
      raise exception 'support_bad_path' using errcode = '23514';
    end if;
    new.attachment_name := left(btrim(new.attachment_name), 120);
  end if;
  if not new.from_admin and (
    select count(*) from public.support_messages
    where author_id = auth.uid() and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'support_rate' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.support_message_guard() from public, anon, authenticated;

drop trigger if exists support_message_guard on public.support_messages;
create trigger support_message_guard
  before insert on public.support_messages
  for each row execute function public.support_message_guard();

-- Yangi xabar → murojaat holati: admin javob berdi = 'answered', foydalanuvchi yozdi = 'open'.
create or replace function public.support_message_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets
     set status = case when new.from_admin then 'answered' else 'open' end,
         last_message_at = new.created_at,
         updated_at = now()
   where id = new.ticket_id;
  return null;
end;
$$;
revoke all on function public.support_message_after() from public, anon, authenticated;

drop trigger if exists support_message_after on public.support_messages;
create trigger support_message_after
  after insert on public.support_messages
  for each row execute function public.support_message_after();

-- ------------------------------------------------------------------ RPC'lar
-- Murojaat + birinchi xabar BIR tranzaksiyada (RLS amal qiladi — invoker).
create or replace function public.support_open(
  p_ticket uuid,
  p_subject text,
  p_body text,
  p_attachment_path text default null,
  p_attachment_name text default null,
  p_attachment_type text default null,
  p_attachment_size integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.support_tickets (id, user_id, subject) values (coalesce(p_ticket, gen_random_uuid()), auth.uid(), p_subject)
  returning id into p_ticket;
  insert into public.support_messages (ticket_id, author_id, body, attachment_path, attachment_name, attachment_type, attachment_size)
  values (p_ticket, auth.uid(), p_body, p_attachment_path, p_attachment_name, p_attachment_type, p_attachment_size);
  return p_ticket;
end;
$$;
revoke all on function public.support_open(uuid, text, text, text, text, text, integer) from public, anon;
grant execute on function public.support_open(uuid, text, text, text, text, text, integer) to authenticated;

-- Holat: egasi faqat yopadi; admin — istalgan holat.
create or replace function public.support_set_status(p_ticket uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if p_status not in ('open', 'answered', 'closed') then
    raise exception 'support_bad_status' using errcode = '23514';
  end if;
  select user_id into v_owner from public.support_tickets where id = p_ticket;
  if v_owner is null then
    raise exception 'support_not_found' using errcode = '23503';
  end if;
  if not public.is_admin() and not (v_owner = auth.uid() and p_status = 'closed') then
    raise exception 'support_forbidden' using errcode = '42501';
  end if;
  update public.support_tickets set status = p_status, updated_at = now() where id = p_ticket;
end;
$$;
revoke all on function public.support_set_status(uuid, text) from public, anon;
grant execute on function public.support_set_status(uuid, text) to authenticated;

-- Admin ro'yxati: email, ism, xabarlar soni, oxirgi xabar parchasi.
create or replace function public.admin_support_tickets(p_status text default null)
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  subject text,
  status text,
  created_at timestamptz,
  last_message_at timestamptz,
  messages bigint,
  last_preview text,
  last_from_admin boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  return query
  select t.id, t.user_id, u.email::text, coalesce(p.display_name, ''), t.subject, t.status, t.created_at, t.last_message_at,
         (select count(*) from public.support_messages m where m.ticket_id = t.id),
         lm.body_preview, lm.from_admin
  from public.support_tickets t
  left join auth.users u on u.id = t.user_id
  left join public.profiles p on p.id = t.user_id
  left join lateral (
    select left(m.body, 140) as body_preview, m.from_admin
    from public.support_messages m where m.ticket_id = t.id
    order by m.created_at desc limit 1
  ) lm on true
  where p_status is null or t.status = p_status
  order by (t.status = 'open') desc, t.last_message_at desc
  limit 200;
end;
$$;
revoke all on function public.admin_support_tickets(text) from public, anon;
grant execute on function public.admin_support_tickets(text) to authenticated;

-- ------------------------------------------------------------------ fayllar
-- Fayl yuklash ruxsati: to'g'ri yo'l, o'z papkasi (yoki admin — murojaat
-- egasining papkasi), yopiq murojaatga emas, bloklanmagan, soatiga ≤ 10 fayl.
create or replace function public.support_upload_ok(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[] := string_to_array(p_name, '/');
  v_owner uuid;
  v_status text;
begin
  if auth.uid() is null or public.is_blocked() then
    return false;
  end if;
  if p_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|pdf)$' then
    return false;
  end if;
  select user_id, status into v_owner, v_status from public.support_tickets where id = parts[2]::uuid;
  if public.is_admin() then
    return v_owner is not null and v_owner::text = parts[1];
  end if;
  if parts[1] <> auth.uid()::text then
    return false;
  end if;
  -- yangi murojaat (hali yaratilmagan) yoki o'zining ochiq murojaati
  if v_owner is not null and (v_owner <> auth.uid() or v_status = 'closed') then
    return false;
  end if;
  return (
    select count(*) from storage.objects o
    where o.bucket_id = 'support' and o.name like auth.uid()::text || '/%'
      and o.created_at > now() - interval '1 hour'
  ) < 10;
end;
$$;
revoke all on function public.support_upload_ok(text) from public, anon;
grant execute on function public.support_upload_ok(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support', 'support', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "support files: read own or admin" on storage.objects;
create policy "support files: read own or admin" on storage.objects
  for select to authenticated using (
    bucket_id = 'support' and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin())
  );

drop policy if exists "support files: upload" on storage.objects;
create policy "support files: upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'support' and public.support_upload_ok(name));

drop policy if exists "support files: admin deletes" on storage.objects;
create policy "support files: admin deletes" on storage.objects
  for delete to authenticated using (bucket_id = 'support' and public.is_admin());
