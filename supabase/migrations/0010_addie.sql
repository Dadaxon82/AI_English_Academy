-- ============================================================================
-- 0010 — ADDIE qatlami (A0 → C1 moslashuvchan o'qitish).
--
--  1) A0 (Pre-A1, «noldan») darajasi: daraja CHECK'lari A0 ni ham qabul qiladi
--     (oldin A0 tanlagan o'quvchining sozlamalari serverga yozilmasdi).
--  2) writing_submissions.mentor_note — yozma ishga ustoz / shaxsiy mentor izohi.
--  3) user_progress — kunlik o'zlashtirish surati (ko'nikmalar aniqligi,
--     o'qish tezligi, xato toifalari). Bir foydalanuvchiga kuniga bitta qator.
--  4) adaptive_plans — moslashuvchan reja tarixi (zaif ko'nikmalar, diqqat
--     mavzulari, maqsadli qiyinlik, tavsiyalar).
--  5) ai_chat_logs — suhbatdosh (AI yoki stsenariy) suhbatlari: replikalar va
--     tuzatishlar. Faqat egasi o'qiydi/o'chiradi.
--  6) group_sessions + group_members — guruh mashg'ulotlari / musobaqalar /
--     ustoz bilan uchrashuvlar (rejalashtirilgan vaqt, sig'im). Qo'shilish
--     faqat `group_join()` orqali — sig'im atomik tekshiriladi.
--
-- Barcha yangi jadvallar RLS bilan yopiq; mehmon (`anon`) hech narsa qila olmaydi;
-- bloklangan foydalanuvchi guruh yarata / qo'shila olmaydi.
-- ============================================================================

-- 1) A0 darajasi --------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('user_settings', 'current_level', false),
      ('user_settings', 'target_level', false),
      ('learning_plans', 'current_level', false),
      ('learning_plans', 'target_level', false),
      ('learning_plans', 'diagnostic_level', true),
      ('lessons', 'level', false),
      ('exercises', 'level', false),
      ('vocabulary_items', 'level', false),
      ('mock_exams', 'level', false),
      ('peer_submissions', 'level', false)
    ) as t(tbl, col, nullable)
  loop
    if to_regclass('public.' || r.tbl) is null then
      continue;
    end if;
    execute format('alter table public.%I drop constraint if exists %I', r.tbl, r.tbl || '_' || r.col || '_check');
    execute format(
      'alter table public.%I add constraint %I check (%I in (''A0'',''A1'',''A2'',''B1'',''B2'',''C1''))',
      r.tbl, r.tbl || '_' || r.col || '_check', r.col
    );
  end loop;
end $$;

-- 2) Ustoz izohi ---------------------------------------------------------------
alter table public.writing_submissions
  add column if not exists mentor_note text check (mentor_note is null or char_length(mentor_note) <= 2000);

-- 3) user_progress ----------------------------------------------------------------
create table if not exists public.user_progress (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null default current_date,
  level text not null check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1')),
  -- {"vocabulary": {"accuracy": 82, "count": 40}, ...} — ixtiro emas, mijozdagi urinishlardan
  skills jsonb not null default '{}'::jsonb check (jsonb_typeof(skills) = 'object'),
  -- velocityReport natijasi (faol kunlar, aniqlik tendensiyasi, sur'at)
  velocity jsonb not null default '{}'::jsonb check (jsonb_typeof(velocity) = 'object'),
  -- eng muhim xato toifalari: [{"key": "grammar:a an", "open": 3}, ...]
  error_categories jsonb not null default '[]'::jsonb check (jsonb_typeof(error_categories) = 'array'),
  completed_days integer not null default 0 check (completed_days >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day),
  check (octet_length(skills::text) + octet_length(velocity::text) + octet_length(error_categories::text) <= 20000)
);

-- 4) adaptive_plans -------------------------------------------------------------
create table if not exists public.adaptive_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  level text not null check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1')),
  target_difficulty smallint not null check (target_difficulty between 1 and 5),
  plan jsonb not null check (jsonb_typeof(plan) = 'object' and octet_length(plan::text) <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists adaptive_plans_user_idx on public.adaptive_plans (user_id, created_at desc);

-- 5) ai_chat_logs ----------------------------------------------------------------
create table if not exists public.ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  dialogue_id text not null check (char_length(dialogue_id) between 1 and 120),
  level text not null check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1')),
  engine text not null check (engine in ('ai', 'script')),
  -- [{"speaker": "partner" | "learner", "text": "..."}]
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 60),
  -- [{"excerpt": "...", "correction": "...", "whyUz": "..."}]
  corrections jsonb not null default '[]'::jsonb check (jsonb_typeof(corrections) = 'array'),
  created_at timestamptz not null default now(),
  check (octet_length(lines::text) + octet_length(corrections::text) <= 60000)
);
create index if not exists ai_chat_logs_user_idx on public.ai_chat_logs (user_id, created_at desc);

-- 6) group_sessions / group_members --------------------------------------------
create table if not exists public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('study', 'challenge', 'mentor')),
  level text not null check (level in ('A0', 'A1', 'A2', 'B1', 'B2', 'C1')),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  topic text not null default '' check (char_length(topic) <= 500),
  starts_at timestamptz not null,
  duration_min smallint not null default 45 check (duration_min between 10 and 180),
  capacity smallint not null default 6 check (capacity between 2 and 30),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists group_sessions_upcoming_idx on public.group_sessions (status, starts_at);
create index if not exists group_sessions_host_idx on public.group_sessions (host_id, starts_at desc);

create table if not exists public.group_members (
  session_id uuid not null references public.group_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

alter table public.user_progress enable row level security;
alter table public.adaptive_plans enable row level security;
alter table public.ai_chat_logs enable row level security;
alter table public.group_sessions enable row level security;
alter table public.group_members enable row level security;

-- Egasining o'z qatorlari ------------------------------------------------------
drop policy if exists "user_progress: own rows" on public.user_progress;
create policy "user_progress: own rows" on public.user_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "adaptive_plans: own read" on public.adaptive_plans;
create policy "adaptive_plans: own read" on public.adaptive_plans
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "adaptive_plans: own insert" on public.adaptive_plans;
create policy "adaptive_plans: own insert" on public.adaptive_plans
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "adaptive_plans: own delete" on public.adaptive_plans;
create policy "adaptive_plans: own delete" on public.adaptive_plans
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "ai_chat_logs: own read" on public.ai_chat_logs;
create policy "ai_chat_logs: own read" on public.ai_chat_logs
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "ai_chat_logs: own insert" on public.ai_chat_logs;
create policy "ai_chat_logs: own insert" on public.ai_chat_logs
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "ai_chat_logs: own delete" on public.ai_chat_logs;
create policy "ai_chat_logs: own delete" on public.ai_chat_logs
  for delete to authenticated using (user_id = auth.uid());

-- Guruh mashg'ulotlari -----------------------------------------------------------
-- Rejalashtirilgan (bekor qilinmagan) mashg'ulotlarni har kirgan foydalanuvchi ko'radi;
-- tashkilotchi o'zinikini (bekor qilinganini ham) ko'radi.
drop policy if exists "group_sessions: read scheduled" on public.group_sessions;
create policy "group_sessions: read scheduled" on public.group_sessions
  for select to authenticated using (status = 'scheduled' or host_id = auth.uid());

drop policy if exists "group_sessions: host inserts" on public.group_sessions;
create policy "group_sessions: host inserts" on public.group_sessions
  for insert to authenticated with check (host_id = auth.uid() and status = 'scheduled' and starts_at > now());

drop policy if exists "group_sessions: host updates" on public.group_sessions;
create policy "group_sessions: host updates" on public.group_sessions
  for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());

drop policy if exists "group_sessions: host deletes" on public.group_sessions;
create policy "group_sessions: host deletes" on public.group_sessions
  for delete to authenticated using (host_id = auth.uid());

drop policy if exists "group_sessions: not blocked" on public.group_sessions;
create policy "group_sessions: not blocked" on public.group_sessions
  as restrictive for insert to authenticated with check (not public.is_blocked());

-- A'zolik: o'z qatorini ko'radi va o'chiradi (chiqish); tashkilotchi a'zolarni ko'radi.
-- Qo'shish faqat `group_join()` orqali (INSERT siyosati yo'q).
create or replace function public.group_is_host(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.group_sessions s where s.id = p_session and s.host_id = auth.uid());
$$;

drop policy if exists "group_members: own or host read" on public.group_members;
create policy "group_members: own or host read" on public.group_members
  for select to authenticated using (user_id = auth.uid() or public.group_is_host(session_id));

drop policy if exists "group_members: leave" on public.group_members;
create policy "group_members: leave" on public.group_members
  for delete to authenticated using (user_id = auth.uid());

-- A'zolar soni (ism-familiyasiz) — ro'yxat kartasida ko'rsatish uchun.
create or replace function public.group_member_count(p_session uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.group_members m
  where m.session_id = p_session
    and exists (select 1 from public.group_sessions s where s.id = p_session and (s.status = 'scheduled' or s.host_id = auth.uid()));
$$;

-- Qo'shilish: sessiya rejalashtirilgan, hali boshlanmagan, joy bor; bloklangan emas.
-- Sessiya qatori qulflanadi (FOR UPDATE) — bir vaqtdagi so'rovlar sig'imdan oshirmaydi.
create or replace function public.group_join(p_session uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cap smallint;
  v_status text;
  v_starts timestamptz;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if public.is_blocked(v_uid) then
    raise exception 'account_blocked' using errcode = '42501';
  end if;
  select capacity, status, starts_at into v_cap, v_status, v_starts
    from public.group_sessions where id = p_session for update;
  if not found or v_status <> 'scheduled' then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if v_starts <= now() then
    raise exception 'session_started' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.group_members where session_id = p_session and user_id = v_uid) then
    return;
  end if;
  select count(*) into v_count from public.group_members where session_id = p_session;
  if v_count >= v_cap then
    raise exception 'session_full' using errcode = 'P0001';
  end if;
  insert into public.group_members (session_id, user_id) values (p_session, v_uid);
end;
$$;

-- Tashkilotchi kuniga ko'pi bilan 5 ta mashg'ulot yaratadi (spam cheklovi).
create or replace function public.group_session_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.group_sessions
      where host_id = new.host_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'group_daily_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists group_sessions_limit on public.group_sessions;
create trigger group_sessions_limit
  before insert on public.group_sessions
  for each row execute function public.group_session_limit();

-- Huquqlar: mehmon hech narsa qilmaydi; yordamchi funksiyalar faqat kirganlarga.
revoke all on public.user_progress, public.adaptive_plans, public.ai_chat_logs, public.group_sessions, public.group_members from anon;
revoke all on function public.group_join(uuid) from public, anon;
revoke all on function public.group_member_count(uuid) from public, anon;
revoke all on function public.group_is_host(uuid) from public, anon;
revoke all on function public.group_session_limit() from public, anon, authenticated;
grant execute on function public.group_join(uuid) to authenticated;
grant execute on function public.group_member_count(uuid) to authenticated;
grant execute on function public.group_is_host(uuid) to authenticated;
