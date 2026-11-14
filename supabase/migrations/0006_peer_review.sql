-- ============================================================================
-- 0006 — Hamjamiyat tekshiruvi (g'oya: Busuu; qoidalar bizniki).
--
-- O'quvchi yozma javobini yoki nutq TRANSKRIPTINI (audio EMAS) boshqa
-- o'quvchiga tekshiruvga yuboradi. Tekshiruvchi uni o'zi tanlamaydi:
-- `peer_claim()` unga bittasini TAYINLAYDI va u faqat tayinlanganini ko'radi.
--
--  * peer_submissions — yuborilgan matn (muallif o'zinikini ko'radi/o'chiradi;
--    tekshiruvchi faqat o'ziga tayinlangan va yashirilmaganini ko'radi).
--  * peer_assignments — kim qaysi javobni tekshiradi (faqat `peer_claim()`
--    yozadi).
--  * peer_reviews — baho (1–5) va izoh (10–1000 belgi). Faqat tayinlangan
--    tekshiruvchi, bir javobga bir marta. Muallif o'z javobiga kelgan
--    yashirilmagan izohlarni ko'radi.
--  * peer_reports — shikoyat: tekshiruvchi javob ustidan, muallif izoh
--    ustidan. MODERATSIYA: javobga 2 ta shikoyat → `hidden`; izohga muallif
--    shikoyati → `hidden`.
--  * Cheklovlar: kuniga 5 ta yuborish; har javobga ko'pi bilan 2 ta izoh;
--    bir vaqtda bitta ochiq (izohsiz) tayinlov.
--
-- Hech bir jadvalga UPDATE siyosati yo'q — mijoz holatni o'zgartira olmaydi
-- (yashirish faqat trigger orqali).
-- ============================================================================

create table if not exists public.peer_submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('writing', 'speaking')),
  task_id text not null check (char_length(task_id) between 1 and 120),
  level text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  prompt text not null default '' check (char_length(prompt) <= 1000),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists peer_submissions_open_idx on public.peer_submissions (status, created_at);
create index if not exists peer_submissions_author_idx on public.peer_submissions (author_id, created_at desc);

create table if not exists public.peer_assignments (
  submission_id uuid not null references public.peer_submissions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (submission_id, reviewer_id)
);
create index if not exists peer_assignments_reviewer_idx on public.peer_assignments (reviewer_id);

create table if not exists public.peer_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.peer_submissions (id) on delete cascade,
  reviewer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 10 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (submission_id, reviewer_id)
);
create index if not exists peer_reviews_submission_idx on public.peer_reviews (submission_id);

create table if not exists public.peer_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  submission_id uuid references public.peer_submissions (id) on delete cascade,
  review_id uuid references public.peer_reviews (id) on delete cascade,
  reason text not null check (reason in ('offensive', 'spam', 'personal', 'other')),
  created_at timestamptz not null default now(),
  check ((submission_id is null) <> (review_id is null)),
  unique (reporter_id, submission_id),
  unique (reporter_id, review_id)
);

alter table public.peer_submissions enable row level security;
alter table public.peer_assignments enable row level security;
alter table public.peer_reviews enable row level security;
alter table public.peer_reports enable row level security;

-- Yordamchi: joriy foydalanuvchi shu javobga tayinlanganmi (RLS ichida
-- rekursiyasiz tekshirish uchun security definer).
create or replace function public.peer_is_assigned(p_submission uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.peer_assignments a
    where a.submission_id = p_submission and a.reviewer_id = auth.uid()
  );
$$;

create or replace function public.peer_is_author(p_submission uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.peer_submissions s
    where s.id = p_submission and s.author_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------ submissions
drop policy if exists "peer_submissions: author reads own" on public.peer_submissions;
create policy "peer_submissions: author reads own" on public.peer_submissions
  for select using (author_id = auth.uid());

drop policy if exists "peer_submissions: assigned reviewer reads open" on public.peer_submissions;
create policy "peer_submissions: assigned reviewer reads open" on public.peer_submissions
  for select using (status = 'open' and public.peer_is_assigned(id));

drop policy if exists "peer_submissions: author inserts own" on public.peer_submissions;
create policy "peer_submissions: author inserts own" on public.peer_submissions
  for insert with check (author_id = auth.uid() and status = 'open');

drop policy if exists "peer_submissions: author deletes own" on public.peer_submissions;
create policy "peer_submissions: author deletes own" on public.peer_submissions
  for delete using (author_id = auth.uid());

-- ------------------------------------------------------------ assignments
drop policy if exists "peer_assignments: reviewer reads own" on public.peer_assignments;
create policy "peer_assignments: reviewer reads own" on public.peer_assignments
  for select using (reviewer_id = auth.uid());

-- ---------------------------------------------------------------- reviews
drop policy if exists "peer_reviews: reviewer reads own" on public.peer_reviews;
create policy "peer_reviews: reviewer reads own" on public.peer_reviews
  for select using (reviewer_id = auth.uid());

drop policy if exists "peer_reviews: author reads visible" on public.peer_reviews;
create policy "peer_reviews: author reads visible" on public.peer_reviews
  for select using (not hidden and public.peer_is_author(submission_id));

drop policy if exists "peer_reviews: assigned reviewer inserts" on public.peer_reviews;
create policy "peer_reviews: assigned reviewer inserts" on public.peer_reviews
  for insert with check (
    reviewer_id = auth.uid()
    and hidden = false
    and public.peer_is_assigned(submission_id)
    and exists (select 1 from public.peer_submissions s where s.id = submission_id and s.status = 'open')
  );

-- ---------------------------------------------------------------- reports
drop policy if exists "peer_reports: reporter reads own" on public.peer_reports;
create policy "peer_reports: reporter reads own" on public.peer_reports
  for select using (reporter_id = auth.uid());

drop policy if exists "peer_reports: reviewer or author inserts" on public.peer_reports;
create policy "peer_reports: reviewer or author inserts" on public.peer_reports
  for insert with check (
    reporter_id = auth.uid()
    and (
      (submission_id is not null and public.peer_is_assigned(submission_id))
      or (review_id is not null and exists (
        select 1 from public.peer_reviews r
        where r.id = review_id and public.peer_is_author(r.submission_id)
      ))
    )
  );

-- -------------------------------------------------- cheklov va moderatsiya
create or replace function public.peer_submission_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.peer_submissions
      where author_id = new.author_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'peer_daily_limit' using errcode = 'P0001',
      hint = 'Kuniga ko‘pi bilan 5 ta javob tekshiruvga yuboriladi.';
  end if;
  return new;
end;
$$;

drop trigger if exists peer_submission_limit on public.peer_submissions;
create trigger peer_submission_limit before insert on public.peer_submissions
  for each row execute function public.peer_submission_limit();

create or replace function public.peer_moderate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.submission_id is not null then
    if (select count(*) from public.peer_reports where submission_id = new.submission_id) >= 2 then
      update public.peer_submissions set status = 'hidden' where id = new.submission_id;
    end if;
  else
    update public.peer_reviews set hidden = true where id = new.review_id;
  end if;
  return new;
end;
$$;

drop trigger if exists peer_moderate on public.peer_reports;
create trigger peer_moderate after insert on public.peer_reports
  for each row execute function public.peer_moderate();

-- ------------------------------------------------------- tayinlash (RPC)
-- Tekshiruvchiga bitta javob tayinlaydi va uni qaytaradi:
--  * izohi (yoki shikoyati) hali yozilmagan ochiq tayinlov bo'lsa — o'sha
--    (yig'ib olish yo'q);
--  * aks holda: o'ziniki emas, ochiq, unga tayinlanmagan, izohlari 2 tadan
--    kam, tayinlovlari 3 tadan kam — eng eskisi (bir vaqtdagi so'rovlar
--    bir qatorni olmasligi uchun `skip locked`);
--  * hech narsa bo'lmasa — bo'sh natija.
create or replace function public.peer_claim(p_kind text default null)
returns setof public.peer_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select s.id into v_id
  from public.peer_assignments a
  join public.peer_submissions s on s.id = a.submission_id
  where a.reviewer_id = v_uid
    and s.status = 'open'
    and not exists (select 1 from public.peer_reviews r where r.submission_id = s.id and r.reviewer_id = v_uid)
    -- Shikoyat qilgan tekshiruvchiga o'sha javob qayta berilmaydi (aks holda u halqada qolardi).
    and not exists (select 1 from public.peer_reports p where p.submission_id = s.id and p.reporter_id = v_uid)
  order by a.created_at
  limit 1;

  if v_id is null then
    select s.id into v_id
    from public.peer_submissions s
    where s.status = 'open'
      and s.author_id <> v_uid
      and (p_kind is null or s.kind = p_kind)
      and not exists (select 1 from public.peer_assignments a where a.submission_id = s.id and a.reviewer_id = v_uid)
      and (select count(*) from public.peer_reviews r where r.submission_id = s.id) < 2
      and (select count(*) from public.peer_assignments a where a.submission_id = s.id) < 3
    order by s.created_at
    limit 1
    for update skip locked;

    if v_id is null then
      return;
    end if;
    insert into public.peer_assignments (submission_id, reviewer_id) values (v_id, v_uid);
  end if;

  return query select * from public.peer_submissions where id = v_id;
end;
$$;

revoke all on function public.peer_claim(text) from public, anon;
grant execute on function public.peer_claim(text) to authenticated;
revoke all on function public.peer_is_assigned(uuid) from public, anon;
grant execute on function public.peer_is_assigned(uuid) to authenticated;
revoke all on function public.peer_is_author(uuid) from public, anon;
grant execute on function public.peer_is_author(uuid) to authenticated;

grant select, insert, delete on public.peer_submissions to authenticated;
grant select on public.peer_assignments to authenticated;
grant select, insert on public.peer_reviews to authenticated;
grant select, insert on public.peer_reports to authenticated;
