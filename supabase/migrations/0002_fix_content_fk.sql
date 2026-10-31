-- ============================================================================
-- 0002 — ikkita jiddiy sxema xatosini tuzatish
--
-- (1) SINKRONLASHNI TO'SIB QO'YGAN TASHQI KALITLAR (bo'sh kontent jadvallari)
--     Kontent (`lessons, exercises, vocabulary_items, mock_exams`) jadvallari
--     bo'sh — butun o'quv materiali kod ichida (`src/content/`) va ilova uni
--     brauzerda o'qiydi. Bo'sh jadvallarga qo'yilgan FK sababli foydalanuvchi
--     yozuvlari serverga UMUMAN yozilmaydi:
--       user_vocabulary.vocabulary_id  → vocabulary_items  (har bir SRS yozuvi)
--       exercise_attempts.exercise_id  → exercises         (har bir urinish)
--       mock_exam_attempts.exam_id     → mock_exams        (har bir mock)
--     PostgREST "violates foreign key constraint" qaytardi, navbat abadiy
--     tozalanmas edi. IDs'lar kontent paketida barqaror (`a1-v1-hello`),
--     shuning uchun FK olib tashlanadi, tezkorlik indekslari qoldiriladi.
--
-- (2) KONTENT JADVALLARIGA YOZISH MUMKIN EMAS EDI
--     "read all" policies faqat SELECT uchun. RLS yoqilgan jadvalda boshqa
--     amallar uchun policy bo'lmasa — service role ham (bypassrls Yo'q)
--     INSERT/UPDATE/DELETE qila olmaydi: ya'ni kontent bazasini keyin
--     to'ldirib bo'lmass edi.
-- ============================================================================

-- ---- (1) FK'larni olib tashlash --------------------------------------------
alter table public.user_vocabulary
  drop constraint if exists user_vocabulary_vocabulary_id_fkey;

alter table public.exercise_attempts
  drop constraint if exists exercise_attempts_exercise_id_fkey;

alter table public.mock_exam_attempts
  drop constraint if exists mock_exam_attempts_exam_id_fkey;

create index if not exists user_vocabulary_vocab_idx      on public.user_vocabulary (vocabulary_id);
create index if not exists exercise_attempts_exercise_idx on public.exercise_attempts (exercise_id);
create index if not exists mock_attempts_exam_idx         on public.mock_exam_attempts (exam_id);

-- ---- (2) Kontent yozuvi: FAQAT service role --------------------------------
-- Supabase'da service role RLS'ni aylanib o'tadi (BYPASSRLS), ammo bu policylar
-- kafolat beradi: bypass o'chirilsa yoki boshqa rol ishlatsa ham kontent
-- bazasini yuklab bo'ladi. Anon/publishable kalit bilan esa yozib bo'lmaydi —
-- policy faqat service_role ro'liga berilgan.
create policy "lessons: write (service role)" on public.lessons
  for insert to service_role with check (true);
create policy "lessons: update (service role)" on public.lessons
  for update to service_role using (true) with check (true);

create policy "exercises: write (service role)" on public.exercises
  for insert to service_role with check (true);
create policy "exercises: update (service role)" on public.exercises
  for update to service_role using (true) with check (true);

create policy "vocabulary: write (service role)" on public.vocabulary_items
  for insert to service_role with check (true);
create policy "vocabulary: update (service role)" on public.vocabulary_items
  for update to service_role using (true) with check (true);

create policy "mock exams: write (service role)" on public.mock_exams
  for insert to service_role with check (true);
create policy "mock exams: update (service role)" on public.mock_exams
  for update to service_role using (true) with check (true);

comment on table public.user_vocabulary is
  'SRS holati. vocabulary_id src/content paketidagi ID (FK yo''q: DB kontenti ixtiyoriy).';

-- ---- Tekshiruv: natijalar SQL Editor'da ko'rinadi --------------------------
select
  (select count(*) from pg_constraint
    where conname in ('user_vocabulary_vocabulary_id_fkey',
                      'exercise_attempts_exercise_id_fkey',
                      'mock_exam_attempts_exam_id_fkey')) as fk_qoldi,        -- 0 bo'lishi kerak
  (select count(*) from pg_policies where schemaname='public') as policies_soni; -- 21 bo'lishi kerak
