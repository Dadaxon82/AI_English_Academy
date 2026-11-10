-- ============================================================================
-- 0007 — ADMIN PANEL: rollar, holat (bloklash), admin statistikasi va
-- foydalanuvchilarni boshqarish.
--
-- Qoidalar:
--   * `profiles.role` ('user' | 'moderator' | 'admin') va `profiles.status`
--     ('active' | 'blocked') — FAQAT admin o'zgartiradi. Mavjud
--     «profiles: own row» siyosati foydalanuvchiga o'z qatorini yozishga
--     ruxsat beradi, shuning uchun himoya TRIGGER'da (`profiles_guard`):
--     admin bo'lmagan foydalanuvchi o'ziga rol/status bera olmaydi.
--   * Server (auth.uid() yo'q: SQL Editor, service role, auth trigger'i)
--     cheklanmaydi — birinchi adminni shu yo'l bilan tayinlash mumkin.
--   * Oxirgi faol admin rolidan tushirilmaydi va bloklanmaydi; admin
--     o'zini bloklay olmaydi; adminni o'chirib bo'lmaydi (avval rolini
--     tushiring).
--   * Bloklash HAQIQIY: bloklangan foydalanuvchi hamjamiyatga javob/izoh/
--     shikoyat yubora olmaydi, javob tekshirishga ololmaydi va AI xizmatidan
--     foydalana olmaydi. Shaxsiy o'quv ma'lumoti (sinxron) o'chirilmaydi.
--   * XP, streak, daraja — o'quvchining HAQIQIY yozuvlaridan hisoblanadi
--     (`weekly_xp`, `daily_activity`, `user_settings`); admin ularni
--     qo'lda o'zgartirmaydi (dalilsiz ball — loyiha qoidasiga zid).
--   * Email — `auth.users`dan o'qiladi (nusxa saqlanmaydi).
-- ============================================================================

-- ------------------------------------------------------------ ustunlar
alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists status text not null default 'active',
  add column if not exists avatar_url text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('user', 'moderator', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('active', 'blocked'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_url_check') then
    alter table public.profiles add constraint profiles_avatar_url_check
      check (avatar_url is null or (length(avatar_url) <= 500 and avatar_url ~ '^https://'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_len') then
    alter table public.profiles add constraint profiles_display_name_len check (length(display_name) <= 80) not valid;
  end if;
end $$;

-- Supabase'da standart bo'yicha bor; aniq yozamiz (lokal SQL testlari ham).
grant select, insert, update, delete on public.profiles to authenticated;

create index if not exists profiles_role_idx on public.profiles (role) where role <> 'user';
create index if not exists profiles_created_idx on public.profiles (created_at desc);
create index if not exists daily_activity_day_idx on public.daily_activity (day);

comment on column public.profiles.role is 'user | moderator | admin. Faqat admin (yoki server) o''zgartiradi — `profiles_guard` trigger''i.';
comment on column public.profiles.status is 'active | blocked. Bloklangan: hamjamiyat va AI yopiq (0007).';

-- ------------------------------------------------------------ yordamchilar
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  )
$$;

create or replace function public.is_blocked(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = p_user and status = 'blocked')
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_blocked(uuid) from public;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_blocked(uuid) to authenticated, service_role;

-- ------------------------------------------------------------ himoya trigger'i
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Server konteksti (SQL Editor, service role, auth.users trigger'i).
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_admin() then
      new.role := 'user';
      new.status := 'active';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'admin' then
      raise exception 'admin_delete_admin' using errcode = '42501';
    end if;
    return old;
  end if;

  -- UPDATE
  if new.role is distinct from old.role or new.status is distinct from old.status then
    if not public.is_admin() then
      raise exception 'admin_only' using errcode = '42501';
    end if;
    if old.id = auth.uid() and new.status = 'blocked' then
      raise exception 'admin_self_block' using errcode = '42501';
    end if;
    if old.role = 'admin' and old.status = 'active'
       and (new.role <> 'admin' or new.status <> 'active')
       and not exists (
         select 1 from public.profiles
         where role = 'admin' and status = 'active' and id <> old.id
       ) then
      raise exception 'admin_last' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before insert or update or delete on public.profiles
  for each row execute function public.profiles_guard();

-- ------------------------------------------------------------ RLS (admin)
drop policy if exists "profiles: admin reads all" on public.profiles;
create policy "profiles: admin reads all" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles: admin updates all" on public.profiles;
create policy "profiles: admin updates all" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles: admin deletes others" on public.profiles;
create policy "profiles: admin deletes others" on public.profiles
  for delete using (public.is_admin() and id <> auth.uid());

-- ------------------------------------------------------------ bloklash ta'siri
-- RESTRICTIVE: mavjud ruxsat beruvchi siyosatlar USTIGA qo'shimcha shart.
drop policy if exists "peer_submissions: not blocked" on public.peer_submissions;
create policy "peer_submissions: not blocked" on public.peer_submissions
  as restrictive for insert to authenticated with check (not public.is_blocked());

drop policy if exists "peer_reviews: not blocked" on public.peer_reviews;
create policy "peer_reviews: not blocked" on public.peer_reviews
  as restrictive for insert to authenticated with check (not public.is_blocked());

drop policy if exists "peer_reports: not blocked" on public.peer_reports;
create policy "peer_reports: not blocked" on public.peer_reports
  as restrictive for insert to authenticated with check (not public.is_blocked());

-- `peer_claim` va `ai_usage_take` — security definer (RLS chetlab o'tadi),
-- shuning uchun bu yerda trigger.
create or replace function public.reject_blocked_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  -- Har jadval o'z ustuni bilan (yo'q maydonga murojaat — xato).
  if tg_table_name = 'peer_assignments' then
    v_user := new.reviewer_id;
  else
    v_user := new.user_id;
  end if;
  if public.is_blocked(v_user) then
    raise exception 'account_blocked' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists peer_assignments_not_blocked on public.peer_assignments;
create trigger peer_assignments_not_blocked
  before insert on public.peer_assignments
  for each row execute function public.reject_blocked_user();

drop trigger if exists ai_usage_not_blocked on public.ai_usage;
create trigger ai_usage_not_blocked
  before insert or update on public.ai_usage
  for each row execute function public.reject_blocked_user();

-- ------------------------------------------------------------ hisoblangan ko'rsatkichlar
-- Joriy streak: ketma-ket faol kunlar (bugun yoki kecha bilan tugaydigan).
-- Faol kun — `daily_activity`da vaqt yoki urinish bor kun.
create or replace function public.admin_user_metrics()
returns table (user_id uuid, xp bigint, streak integer, last_day date)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select user_id, day,
           day - (row_number() over (partition by user_id order by day))::int as grp
    from public.daily_activity
    where seconds > 0 or attempts > 0
  ),
  islands as (
    select user_id, max(day) as last_day, count(*)::int as len
    from days group by user_id, grp
  ),
  cur as (
    select user_id, max(len) filter (where last_day >= current_date - 1) as streak, max(last_day) as last_day
    from islands group by user_id
  ),
  xp as (
    select user_id, sum(xp)::bigint as xp from public.weekly_xp group by user_id
  )
  select p.id, coalesce(xp.xp, 0), coalesce(cur.streak, 0), cur.last_day
  from public.profiles p
  left join xp on xp.user_id = p.id
  left join cur on cur.user_id = p.id
$$;
revoke all on function public.admin_user_metrics() from public, anon, authenticated;

-- ------------------------------------------------------------ admin: statistika
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;

  with m as (select * from public.admin_user_metrics())
  select jsonb_build_object(
    'total_users',     (select count(*) from public.profiles),
    'new_this_week',   (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'new_prev_week',   (select count(*) from public.profiles
                          where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'),
    'dau',             (select count(distinct user_id) from public.daily_activity
                          where day = current_date and (seconds > 0 or attempts > 0)),
    'avg_streak',      (select coalesce(round(avg(streak) filter (where streak > 0), 1), 0) from m),
    'total_xp',        (select coalesce(sum(xp), 0) from m),
    'admins',          (select count(*) from public.profiles where role = 'admin'),
    'moderators',      (select count(*) from public.profiles where role = 'moderator'),
    'blocked',         (select count(*) from public.profiles where status = 'blocked'),
    'signups_30d',     (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d), '[]'::jsonb)
                          from generate_series(current_date - 29, current_date, interval '1 day') d
                          left join (select created_at::date as day, count(*) as n from public.profiles
                                     where created_at >= current_date - 29 group by 1) c on c.day = d::date),
    'levels',          (select coalesce(jsonb_object_agg(lvl, n), '{}'::jsonb) from (
                          select coalesce(s.current_level, 'none') as lvl, count(*) as n
                          from public.profiles p left join public.user_settings s on s.user_id = p.id
                          group by 1) x)
  ) into v;
  return v;
end;
$$;

-- ------------------------------------------------------------ admin: ro'yxat
create or replace function public.admin_list_users(
  p_search text default '',
  p_role text default null,
  p_status text default null,
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  role text,
  status text,
  xp bigint,
  streak integer,
  level text,
  created_at timestamptz,
  last_active date,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if v_q is not null then
    v_q := '%' || replace(replace(replace(left(v_q, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  with m as (select * from public.admin_user_metrics()),
  lst as (
    select p.id, p.display_name as full_name, u.email::text as email, p.avatar_url, p.role, p.status,
           coalesce(m.xp, 0) as xp, coalesce(m.streak, 0) as streak, s.current_level as level,
           p.created_at, m.last_day as last_active
    from public.profiles p
    left join auth.users u on u.id = p.id
    left join m on m.user_id = p.id
    left join public.user_settings s on s.user_id = p.id
    where (v_q is null or p.display_name ilike v_q or u.email ilike v_q)
      and (p_role is null or p.role = p_role)
      and (p_status is null or p.status = p_status)
  )
  select r.*, count(*) over () as total_count
  from lst r
  order by r.created_at desc, r.id
  limit greatest(1, least(coalesce(p_limit, 10), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- ------------------------------------------------------------ admin: o'chirish
-- Hisob butunlay o'chadi (auth.users → kaskad bilan barcha ma'lumot).
-- Adminni va o'zini o'chirib bo'lmaydi.
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'admin_self_delete' using errcode = '42501';
  end if;
  select role into v_role from public.profiles where id = p_user;
  if not found then
    raise exception 'admin_not_found' using errcode = 'P0002';
  end if;
  if v_role = 'admin' then
    raise exception 'admin_delete_admin' using errcode = '42501';
  end if;
  delete from auth.users where id = p_user;
end;
$$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_list_users(text, text, text, integer, integer) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users(text, text, text, integer, integer) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ------------------------------------------------------------ birinchi admin
-- Server (SQL Editor) orqali, o'z emailingiz bilan:
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'SIZNING@EMAIL');
