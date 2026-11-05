# Release kaliti (`aea-release.jks`)

Bu kalitus **shu loyiha uchun generate qilingan** (`keytool`, 2026-11-04) —
tijorat kaliti emas. `app/build.gradle` `signingConfigs.release` shu faylni
ishlatadi; parollar qoida tariqasida ochiq (`build.gradle` da yozilgan), chunki
GitHub repodagi ochiq loyiha kalitidir.

Qayta generate qilish (fayl yo'qolsa yoki yo'qotilsa):

```bash
keytool -genkeypair -v -keystore aea-release.jks -alias aea \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass aienglishacademy -keypass aienglishacademy \
  -dname "CN=AI English Academy, OU=Demo, O=Dadaxon, L=Kokand, C=UZ"
```

Diqqat: yangi kalit oldingi APK'larni "update" qilib bo'lmaydi (imzo farqi) —
fayl ehtiyot saqlansin.
