-- ============================================================================
-- AI English Academy — boshlang'ich sxema (Supabase / Postgres)
--
-- 13 ta jadval (loyiha talabiga muvofiq):
--   profiles, learning_plans, lessons, exercises, exercise_attempts,
--   vocabulary_items, user_vocabulary, writing_submissions, speaking_sessions,
--   daily_activity, mock_exams, mock_exam_attempts, user_settings
--
-- Qoidalar:
--   * Har bir jadvalda id (uuid), created_at bor.
--   * Foydalanuvchi ma'lumotlari RLS orqali FAQAT o'ziga ochiladi.
--   * Kontent jadvallari (lessons, exercises, vocabulary_items, mock_exams)
--     o'qish uchun ochiq, yozish faqat service role (server) uchun.
--   * Service role key FAQAT serverda — bu fayl anon bilan ishlaydigan
--     siyosatlarni belgilaydi.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  native_language text not null default 'uz',
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Har bir auth foydalanuvchisi uchun profil qatori';

-- auth.usersga yangi qo'shilganda profil avtomatik yaratiladi
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ user_settings
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_minutes integer not null default 90 check (daily_minutes between 30 and 240),
  current_level text not null default 'A1' check (current_level in ('A1','A2','B1','B2','C1')),
  target_level text not null default 'C1' check (target_level in ('A1','A2','B1','B2','C1')),
  exam_date date,
  allocation jsonb not null default '{}'::jsonb,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  ai_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------- learning_plans
create table if not exists public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  current_level text not null check (current_level in ('A1','A2','B1','B2','C1')),
  target_level text not null check (target_level in ('A1','A2','B1','B2','C1')),
  diagnostic_level text check (diagnostic_level in ('A1','A2','B1','B2','C1')),
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists learning_plans_user_idx on public.learning_plans (user_id, updated_at desc);

-- ------------------------------------------------------------------ lessons
-- "lesson" = kundalik dars kuni (a1-day-1 ...). Kontent — o'qish uchun ochiq.
create table if not exists public.lessons (
  id text primary key,                       -- masalan 'a1-day-1'
  level text not null check (level in ('A1','A2','B1','B2','C1')),
  day_number integer not null,
  title_uz text not null,
  goal_uz text,
  sections jsonb not null default '[]'::jsonb, -- [{skill,minutes,itemIds,titleUz}]
  created_at timestamptz not null default now(),
  unique (level, day_number)
);

-- ---------------------------------------------------------------- exercises
-- Mashq kontenti (shartnomadagi Exercise birligi JSONB sifatida saqlanadi).
create table if not exists public.exercises (
  id text primary key,                        -- masalan 'a1-ex-g1-01'
  lesson_id text references public.lessons (id) on delete set null,
  kind text not null check (kind in
    ('multiple-choice','true-false-notgiven','matching','gap-fill','word-order','translation')),
  skill text not null check (skill in
    ('reading','listening','writing','speaking','vocabulary','grammar')),
  level text not null check (level in ('A1','A2','B1','B2','C1')),
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  data jsonb not null,                        -- to'liq Exercise obyekti
  created_at timestamptz not null default now()
);
create index if not exists exercises_skill_level_idx on public.exercises (skill, level);
create index if not exists exercises_lesson_idx on public.exercises (lesson_id);

-- --------------------------------------------------------- vocabulary_items
create table if not exists public.vocabulary_items (
  id text primary key,                        -- masalan 'a1-v1-01'
  word text not null,
  translation_uz text not null,
  explanation_en text,
  ipa text,
  pos text,
  topic text,
  level text not null check (level in ('A1','A2','B1','B2','C1')),
  example_en text,
  example_uz text,
  data jsonb not null,                        -- to'liq VocabularyItem obyekti
  created_at timestamptz not null default now()
);
create index if not exists vocabulary_items_level_topic_idx on public.vocabulary_items (level, topic);

-- ---------------------------------------------------------- user_vocabulary
-- SRS holati. Takrorlangan so'z IKKI marta hisoblanmaydi: learned_at NULL
-- bo'lmagan holatda qayta o'rnatilmaydi (ilova shu qoidani bajaradi).
create table if not exists public.user_vocabulary (
  user_id uuid not null references public.profiles (id) on delete cascade,
  vocabulary_id text not null references public.vocabulary_items (id) on delete cascade,
  learned_at timestamptz,
  due_at timestamptz not null default now(),
  interval_days integer not null default 0,
  ease numeric(4,2) not null default 2.5,
  reps integer not null default 0,
  lapses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, vocabulary_id)
);
create index if not exists user_vocabulary_due_idx on public.user_vocabulary (user_id, due_at);

-- -------------------------------------------------------- exercise_attempts
create table if not exists public.exercise_attempts (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id text references public.exercises (id) on delete set null,
  skill text not null,
  level text not null,
  correct boolean not null,
  partial_score numeric(4,3) not null default 0,
  difficulty integer not null default 1,
  seconds_spent integer not null default 0,
  source text not null check (source in ('practice','section_test','mock_exam','diagnostic')),
  answer_text text,
  created_at timestamptz not null default now()
);
create index if not exists exercise_attempts_user_time_idx on public.exercise_attempts (user_id, created_at desc);
create index if not exists exercise_attempts_skill_idx on public.exercise_attempts (user_id, skill, created_at desc);

-- --------------------------------------------------------- writing_submissions
create table if not exists public.writing_submissions (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_id text not null,
  text text not null,
  word_count integer not null default 0,
  seconds_spent integer not null default 0,
  analysis jsonb,                              -- engine: 'rule-based' | 'ai'
  supersedes_id text references public.writing_submissions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists writing_user_task_idx on public.writing_submissions (user_id, task_id, created_at desc);

-- --------------------------------------------------------- speaking_sessions
-- AUDIO SERVERDA SAQLANMAYDI — foydalanuvchi roziligi bo'lmasa.
-- audio_stored=false bo'lsa serverda hech qanday audio yo'qligi tasdiqlanadi.
create table if not exists public.speaking_sessions (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_id text not null,
  duration_sec integer not null default 0,
  audio_stored boolean not null default false,
  transcript text,
  transcription_engine text not null default 'none'
    check (transcription_engine in ('browser-speech','ai','none')),
  analysis jsonb,
  text_answer text,
  created_at timestamptz not null default now()
);
create index if not exists speaking_user_idx on public.speaking_sessions (user_id, created_at desc);

-- ------------------------------------------------------------ daily_activity
create table if not exists public.daily_activity (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  seconds integer not null default 0,
  attempts integer not null default 0,
  correct integer not null default 0,
  new_words integer not null default 0,
  reviewed_words integer not null default 0,
  skills jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ----------------------------------------------------------------- mock_exams
-- Mock imtihon SPYEKARI. Har doim "mashq uchun yaratilgan namuna" —
-- format_verified=false bo'lsa rasmiy format tasdiqlanmagan degani.
create table if not exists public.mock_exams (
  id text primary key,                        -- 'a1-mock-1'
  level text not null check (level in ('A1','A2','B1','B2','C1')),
  title_uz text not null,
  disclaimer_uz text not null,                -- "rasmiy imtihon emas" matni
  format_verified boolean not null default false,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------- mock_exam_attempts
create table if not exists public.mock_exam_attempts (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_id text references public.mock_exams (id) on delete set null,
  sections jsonb not null default '[]'::jsonb,
  total_score integer check (total_score between 0 and 100),
  speaking_advisory text,
  completed_at timestamptz not null default now()
);
create index if not exists mock_attempts_user_idx on public.mock_exam_attempts (user_id, completed_at desc);

-- ============================================================================
--                            ROW LEVEL SECURITY
--   Foydalanuvchi FAQAT o'z qatorlarini ko'radi va o'zgartiradi.
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.user_settings       enable row level security;
alter table public.learning_plans      enable row level security;
alter table public.lessons             enable row level security;
alter table public.exercises           enable row level security;
alter table public.vocabulary_items    enable row level security;
alter table public.user_vocabulary     enable row level security;
alter table public.exercise_attempts   enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.speaking_sessions   enable row level security;
alter table public.daily_activity      enable row level security;
alter table public.mock_exams          enable row level security;
alter table public.mock_exam_attempts  enable row level security;

--- Shahsiy jadvallar: user_id = auth.uid() ---

create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "settings: own row" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plans: own rows" on public.learning_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_vocabulary: own rows" on public.user_vocabulary
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "attempts: own rows" on public.exercise_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "writing: own rows" on public.writing_submissions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "speaking: own rows" on public.speaking_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activity: own rows" on public.daily_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mock attempts: own rows" on public.mock_exam_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--- Kontent jadvallari: hamma o'qiydi, yozish faqat service role (RLS orqali) ---

create policy "lessons: read all" on public.lessons
  for select using (true);

create policy "exercises: read all" on public.exercises
  for select using (true);

create policy "vocabulary: read all" on public.vocabulary_items
  for select using (true);

create policy "mock exams: read all" on public.mock_exams
  for select using (true);

-- ============================================================================
-- updated_at avtomatik yangilanadi
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_settings on public.user_settings;
create trigger touch_settings before update on public.user_settings
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_plans on public.learning_plans;
create trigger touch_plans before update on public.learning_plans
  for each row execute function public.touch_updated_at();
