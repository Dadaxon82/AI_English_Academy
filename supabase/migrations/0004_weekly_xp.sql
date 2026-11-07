-- ============================================================================
-- 0004 — haftalik XP jadvali: REAL ligalar (Duolingo mexanikasi)
--
-- NIMA UCHUN: o'yin qatlami (`src/lib/game.ts` + `gameConfig.ts`) ligani
-- HAQIQIY qilishni talab qiladi — Duolingo'da haftalik tabloda 30 kishi
-- bo'ladi va ular bir-birining natijasini KO'RIADI. Bitta foydalanuvchining
-- own-row jadvali buning uchun yetarli EMAS: rakiblarning qatorlarini ham
-- o'qish kerak. Shuning uchun alohida jadval va alohida SELECT siyosati.
--
-- NEGA ALOHIDA JADVAL (learning_plans.plan ichiga solinmagan):
--   * `plan` jsonbda butun holat yoziladi — liga uchun uni O'QISH boshqa
--     foydalanuvchilarning qatorini ham o'qishni talab qilardi (RLSda
--     "o'z qatorim" siyosati buni taqiqlaydi).
--   * Haftalik XP urinishlardan hisoblanadigan QISQARTIRILGAN son — qator
--     kichik, indeks bo'yicha tez o'qiladi.
--
-- `display_name` BU JADVALDA SAQLANADI (profiles'ga join qilinmaydi):
--   * sabab: bitta so'rovda butun tabla o'qilsin (9-so'rov kerak emas);
--   * halollik: bu son EMAS, foydalanuvchi o'zi yozgan ko'rsatish nomi, u
--     allaqachon `profiles.display_name`da ochiq (`0001_init.sql`da profil
--     qatori auth bilan bog'langan). Liga a'zolari bitta tabloda ko'rinadi —
--     bu Duolingo modellining o'zi.
--
-- HALOLLIK: XP FAQAT urinishlardan hisoblanadi (`weeklyXp()`), ya'ni ikkala
-- mijoz BIR XIL son yuboradi. XP byusti va dars bonuslari qurilmada alohida
-- yuriladi va liga yig'indisiga KIRMAYDI — bu jadvalga tushadigan sonning
-- qurilmaga bog'liq bo'lmasligi uchun.
--
-- `xp >= 0` CHECK: salbiy yig'indi mantiqan imkonsiz; chetdan kelgan son
-- tabladagi boshqa o'yinchilarning o'rnini buzadi.
-- ============================================================================

create table if not exists public.weekly_xp (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Hafta boshi — PONESHANBA (`weekStartOf()`). Butun hafta bitta qator.
  week_start date not null,
  xp integer not null default 0 check (xp >= 0),
  -- Liga id'si — `gameConfig.ts`dag LEAGUES ro'yxati (bronze…diamond).
  league_id text not null default 'bronze'
    check (league_id in ('bronze','silver','gold','sapphire','ruby','emerald','amethyst','pearl','obsidian','diamond')),
  display_name text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- Liga tablasini o'qish: "shu hafta + shu liga" bo'yicha saralab olish.
create index if not exists weekly_xp_league_idx
  on public.weekly_xp (week_start, league_id, xp desc);

comment on table public.weekly_xp is
  'Haftalik XP ligasi: har foydalanuvchiga hafta boshiga bitta qator. Tabloda o''z ligamizdagi boshqa qatorlar ham o''qiladi (pastdagi select siyosati).';
comment on column public.weekly_xp.week_start is
  'Hafta boshi (poneshanba). Veb `weekStartOf()` va mobil `GameLogic.kt` bitta qoida — ikkala mijoz bir xil qatorni yangilaydi.';
comment on column public.weekly_xp.xp is
  'Urinishlardan hisoblangan haftalik XP (XP byusti va dars bonuslari KIRMAYDI — qurilmaga bog''liq sonlar liga jadvaliga tushmaydi).';
comment on column public.weekly_xp.display_name is
  'Ko''rsatish nomi (`profiles.display_name`dan nusxa). Liga a''zolariga ko''rinadi — bitta so''rovda tabla o''qilishi uchu shu yerda saqlanadi.';

alter table public.weekly_xp enable row level security;

-- Yozish: FAQAT o'z qatorimiz (boshqa o'yinchining XP'sini o'zgartirib bo'lmaydi).
create policy "weekly_xp: own rows" on public.weekly_xp
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "weekly_xp: update own" on public.weekly_xp
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- O'qish: liga tablasining MOHIYATI — boshqa o'yinchilarning haftalik XP'sini
-- ham ko'rish. Lekin faqat BIR LIGA/Hafta doirasida: shu jadvalni istalgan
-- vaqt butunligicha o'qib bo'lmaydi (faqat o'zi ishtirok etadigan hafta +
-- liga; query'da week_start va league_id shart qilinadi — mijoz shunday
-- so'rov yuboradi).
--
-- EHTIYOT: RLSda "faqat o'z ligamizdagi qatorlar" chegarasi jadval ichida
-- aniq EMAS (ligalar bir xil jadvalda). Mijoz har so'rovda week_start +
-- league_id beradi; xohlovchi boshqa ligani ham o'qiy oladi — bu ochiq
-- ma'lumot (XP va ko'rsatish nomi), shuning uchun siyosat `to authenticated`
-- bilan qoldirildi. Xususiylash kerak bo'lsa, bo'lak (partition) yoki
-- liga-bo'yicha function-based policy qo'shiladi.
create policy "weekly_xp: read league mates" on public.weekly_xp
  for select to authenticated
  using (true);

create policy "weekly_xp: delete own" on public.weekly_xp
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---- Kunlik XP (o'yin qatlami) — user_settings ustunlari ------------------
-- `xp_goal_xp` FAQAT `XP_GOAL_TIERS` bosqichlaridan biri (veb/mobil
-- `nearestXpGoal()`). CHECK bosqichlarni sanaydi — bosqich ro'yxati
-- o'zgartirilsa bu jadval ham yangilanishi kerak (izohda eslatilgan).
alter table public.user_settings
  add column if not exists xp_goal_xp integer not null default 200
    check (xp_goal_xp in (50, 100, 200, 300, 500));

alter table public.user_settings
  add column if not exists hearts_enabled boolean not null default true;

comment on column public.user_settings.xp_goal_xp is
  'Kunlik XP maqsadi (Duolingo 5 bosqichi, bizning XP masshtabimizga mos — gameConfig.ts XP_GOAL_TIERS).';
comment on column public.user_settings.hearts_enabled is
  'Yuraklar tizimi yoqilganmi. Ikkala mijozda bir xil bo''lishi kerak: veb `sync.ts` va mobil `SyncProtocol.kt` bitta payload yuboradi.';

-- ---- Tekshiruv: SQL Editor'da bajarilganda natija ko'rinadi -----------------
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'weekly_xp')      as jadval_bor,      -- 1
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'weekly_xp'
       and column_name in ('user_id','week_start','xp','league_id','display_name','updated_at'))
                                                                      as ustunlar,        -- 6
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'weekly_xp')         as politsiyalar,    -- 4
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'user_settings'
       and column_name in ('xp_goal_xp','hearts_enabled'))           as sozlama_ustunlari; -- 2
