#!/usr/bin/env python3
"""Supabase migratsiyalarini **bajarish** uchun yordamchi (SQL Editor o'rniga).

Nima uchun: `scripts/check_supabase_schema.py` faqat O'QIDI va qaysi migratsiya
yetishmayapti deb aytadi. DDL (`alter table`, `create table`) esa anon/publishable
kalit bilan BajARILMAYDI — PostgREST arbitrary SQL qabul qilmaydi. Bizda service-role
kaliti yo'q (repoda `.env` yo'q, Credential Manager'da Supabase yozuvi yo'q),
shuning uchun DDL yo'lakay Supabase **Management API** orqali bajariladi.

Talab: SUPABASE_ACCESS_TOKEN — shaxsiy access token (PAT). Olish:
   https://supabase.com/dashboard/account/tokens  → "New token"
U MAXFIY: qatorga/bajarilgan buyruqqa YOZILMAYDI (fayldan yoki so'rovdan olinadi).

Islatish (repa ildizidan):
    python -I scripts/apply_migrations.py --dry-run        # reja, tarmoq YO'Q
    setx + keyin: SUPABASE_ACCESS_TOKEN ni faylga qo'yib:
        python -I scripts/apply_migrations.py --token-file ..\\_work_aea\\pat.txt
    Keyin avtomatik qayta tekshiriladi (`check_supabase_schema.py` chaqiriladi).

Qoidalar:
  - Migratsiyalar TARTIBIY bajariladi (0001 → 0004), har biri alohida so'rovda;
    fayllar tartibi `supabase/migrations/` nomlanishidagi raqam bo'yicha.
  - Bajarilgan har bir faylning O'XSHASH LEXIK (o'qilgan) matni yuboriladi —
    qisman/uzatilgan SQL yuborilmaydi.
  - Token matni hech qaysi xabar/console/JSON ga chiqmaydi.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIGR_DIR = ROOT / "supabase" / "migrations"
API = "https://api.supabase.com/v1"


def read_token(args: argparse.Namespace) -> tuple[str | None, str]:
    """Token manbalari (ustuvorlik): --token-file > SUPABASE_ACCESS_TOKEN."""
    if args.token_file:
        p = Path(args.token_file)
        if not p.is_file():
            return None, f"--token-file o'qilmadi: {p}"
        val = p.read_text(encoding="utf-8", errors="replace").strip()
        return (val or None), "fayl"
    val = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    return (val or None), "muhit o'zgaruvchisi"


def project_ref(url: str) -> str:
    """`https://igrzbfnsunedgyivmqlz.supabase.co` → `igrzbfnsunedgyivmqlz`."""
    m = re.match(r"https://([a-z0-9]+)\.supabase\.co", url)
    if not m:
        raise SystemExit(f"Loyiha ref'i chiqarilmadi: {url}")
    return m.group(1)


def repo_url_and_key() -> tuple[str, str | None]:
    """Baza manzili — `mobile/app/build.gradle` yoki muhit o'zgaruvchisidan."""
    url = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    if not url:
        gradle = ROOT / "mobile" / "app" / "build.gradle"
        text = gradle.read_text(encoding="utf-8", errors="replace")
        m = re.search(r'SUPABASE_URL",\s*.\s*"(https://[^"]+)"', text)
        url = m.group(1) if m else None
    if not url:
        raise SystemExit("Baza manzili topilmadi (VITE_SUPABASE_URL yoki build.gradle).")
    gradle = ROOT / "mobile" / "app" / "build.gradle"
    m = re.search(r'SUPABASE_ANON_KEY",\s*.\s*"([^"]+)"', gradle.read_text(encoding="utf-8", errors="replace")) if gradle.is_file() else None
    return url.rstrip("/"), (m.group(1) if m else None)


def migration_files() -> list[Path]:
    files = sorted(MIGR_DIR.glob("*.sql"), key=lambda p: p.name)
    return files


def run_sql(token: str, ref: str, sql: str, timeout: float) -> tuple[bool, str]:
    """Bitta so'rov: Management API > database/query. Javob matni qaytadi."""
    req = urllib.request.Request(
        f"{API}/projects/{ref}/database/query",
        method="POST",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "aea-migrations",
        },
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return True, body[:400]
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        return False, f"HTTP {err.code}: {body[:400]}"
    except Exception as err:  # noqa: BLE001 — tarmoq/DNS/TLS sababi ochiq ko'rsatiladi
        return False, f"{type(err).__name__}: {err}"


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Supabase migratsiyalarini Management API orqali bajarish")
    ap.add_argument("--token-file", help="PAT fayli (birinchi qator) — maxfiy")
    ap.add_argument("--dry-run", action="store_true", help="reja: nima yuboriladi (tarmoq YO'Q)")
    ap.add_argument("--from", dest="from_num", type=int, default=1, help="shu raqamdan boshlab (0001…)")
    ap.add_argument("--timeout", type=float, default=60.0)
    ap.add_argument("--no-recheck", action="store_true", help="bajarib, qayta tekshirmaslik")
    args = ap.parse_args()

    url, anon = repo_url_and_key()
    ref = project_ref(url)
    files = [f for f in migration_files() if int(re.match(r"(\d+)", f.name).group(1)) >= args.from_num]

    print(f"Loyiha: {url}  (ref {ref})")
    print("Migratsiyalar:")
    for f in files:
        print(f"  {f.name} — {f.stat().st_size} B")

    if args.dry_run:
        print("\nDRY RUN — hech qanday so'rov yuborilmadi.")
        print("Bajarish uchun: SUPABASE_ACCESS_TOKEN bering (https://supabase.com/dashboard/account/tokens)")
        return 0

    token, source = read_token(args)
    if not token:
        print(f"\nToken topilmadi (manba sinandi: {source}).")
        print("Bering: --token-file <fayl> yoki SUPABASE_ACCESS_TOKEN muhit o'zgaruvchisi.")
        print("Token matni o'qilmaydi-yu chiqarilmaydi.")
        return 2

    failed: list[str] = []
    for f in files:
        sql = f.read_text(encoding="utf-8")  # butun fayl — uzilgan SQL yuborilmaydi
        ok, detail = run_sql(token, ref, sql, args.timeout)
        mark = "OK" if ok else "XATO"
        print(f"[{mark}] {f.name}  ({len(sql)} belgi yuborildi)")
        if ok and detail.strip() and detail.strip() != "[]":
            # Migratsiyadagi tekshiruv SELECT natijasi shu yerda ko'rinadi.
            print(f"       javob: {detail}")
        if not ok:
            print(f"       {detail}")
            failed.append(f.name)
            break

    if failed:
        print(f"\nTo'xtatildi: {failed[0]} bajarilmadi. Keyingi fayllar yuborilmadi.")
        return 1

    if args.no_recheck:
        print("\nBajarildi (qayta tekshiruv o'tkazib yuborildi).")
        return 0

    print("\nQayta tekshirish (faqat o'qish):")
    cmd = [sys.executable, "-I", str(ROOT / "scripts" / "check_supabase_schema.py")]
    if anon:
        cmd += ["--url", url, "--key", anon]
    return subprocess.call(cmd)


if __name__ == "__main__":
    sys.exit(main())
