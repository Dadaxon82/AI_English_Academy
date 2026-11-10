# Release imzo kaliti — repoda SAQLANMAYDI

2026-11-10 xavfsizlik auditi: oldin `aea-release.jks` va uning paroli ochiq repoda
edi — bu kalit **buzilgan (kompromat)** hisoblanadi va endi ishlatilmaydi.

## Yangi kalit (bir marta, o'z kompyuteringizda)

```bash
keytool -genkeypair -v -keystore aea-release-2026.jks -alias aea \
  -keyalg RSA -keysize 4096 -validity 10000
```

Parolni o'zingiz o'ylab toping (kamida 16 belgi) va xavfsiz joyda saqlang.
Faylni `mobile/keystores/` ga qo'ying (u `.gitignore` da — repoga tushmaydi).

## Gradle'ga ulash

`mobile/keystore.properties` (ham `.gitignore` da):

```properties
storeFile=keystores/aea-release-2026.jks
storePassword=...
keyAlias=aea
keyPassword=...
```

Yoki CI uchun muhit o'zgaruvchilari: `AEA_KEYSTORE_FILE`, `AEA_KEYSTORE_PASSWORD`,
`AEA_KEY_ALIAS`, `AEA_KEY_PASSWORD` (GitHub Secrets'dan).

Kalit sozlanmagan bo'lsa `assembleRelease` imzosiz APK beradi.

Diqqat: yangi kalit bilan imzolangan APK eski kalitdagi o'rnatilgan ilovani
«yangilay» olmaydi — bir marta o'chirib, qayta o'rnatish kerak.
