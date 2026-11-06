-- ============================================================================
-- 0003 — harakat (animatsiya) sozlamasi: ikki tomonlama sinxron uchun ustun
--
-- NIMA UCHUN: mobil ilova (`mobile/`) va veb bir xil hisobdan foydalanadi.
-- Foydalanuvchi telefon Sozlamalarida harakatni o'chirdi-yu, ustun bo'lmasa,
-- bu holat serverga YUBORILA OLMASTI (payload'da `motion_enabled` bor, lekin
-- PostgREST "column not found" PGRST204 bilan butun user_settings yozuvini
-- rad etar edi — ya'ni eski bug: sinxron navbati abadiy qolardi).
--
-- DULO_mod.apk dalili (o'lchangan, 2026-11-05): namunaviy ilova harakat va
-- ovoz fayllarini ilova ichida saqlaydi (`res/raw` — 1212 fayl / 75,5 MB:
-- 290 `.riv`, 198 Lottie `.json`, 278 `.hla` tebranish+hana jufti, 297 `.mp3`,
-- 135 `.ogg`). Biz binarylarni ko'chirmaymiz (75 MB + tashqi formatlar),
-- lekin TANLOV (qaysi harakat, qancha millisekund) foydalanuvchi sozlamasiga
-- bog'langan va qurilmalar orasida bir xil bo'lishi kerak.
--
-- `not null default true` — eski qatorlar ham "harakat yoqilgan" holatida
-- qoladi (standartimiz shu); ilova tomonda `MotionSpec` byudjetlari
-- `mobile/app/src/main/res/raw/motion_manifest.json` va
-- `src/lib/motionManifest.ts`da bir xil sonlar bilan yozilgan.
-- ============================================================================

alter table public.user_settings
  add column if not exists motion_enabled boolean not null default true;

comment on column public.user_settings.motion_enabled is
  'Harakat (animatsiya) yoqilganmi. Ikkala mijozda ham bir xil bo''lishi kerak: mobil `SyncProtocol.kt` va veb `sync.ts` bitta payload yuboradi.';

-- ---- Tekshiruv: SQL Editor'da bajarilganda natija ko'rinadi -----------------
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'user_settings'
       and column_name = 'motion_enabled')                    as ustun_bor,   -- 1 bo'lishi kerak
  (select is_nullable from information_schema.columns
     where table_schema = 'public' and table_name = 'user_settings'
       and column_name = 'motion_enabled')                    as null_bo_ladi, -- 'NO'
  (select column_default from information_schema.columns
     where table_schema = 'public' and table_name = 'user_settings'
       and column_name = 'motion_enabled');                                       -- true
