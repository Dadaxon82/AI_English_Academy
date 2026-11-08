#!/usr/bin/env python3
"""Supabase bazasining SXEMASINI faqat O'QIB tekshirish.

Nima uchun: 2026-11-08 kuni o'lchandi — jonli bazada `0003_motion.sql` va
`0004_weekly_xp.sql` hali qo'llanmagan edi. Oqibati jimgina ko'rinardi:
`user_settings` yozuvi har safar rad etilar (PGRST204), `weekly_xp` esa
butunlay yo'q edi (PGRST205). Biz xato tuzatishini (migratsiyani) kod
bajara olmaymiz — uni SQL Editor'da foydalanuvchi bajaradi. Shu skript
eso "qaysi migratsiya yetishmayapti" ni aniq aytadi.

Qat'iy QOIDALAR:
 - FAQAT O'QISH. So'rovlar: HEAD (jadval bormi) va GET ustunlar bilan
   (`limit=0` — 1 qator ham o'qilmaydi, javob hajmi kichik). Hech qanday
   POST / PATCH / DELETE YO'Q — ma'lumot o'zgarmaydi.
 - Anon/publishable kalit ishlatiladi (maxfiy emas, ilovadagi bilan bir xil).
   Service-role kalit TALAB QILINMAYDI va o'qilmaydi.
 - Xato kodlari JADVALDA yozilgan holda chiqadi — ixtira qilinmaydi.

Ishlatish (repa ildizidan):
    python -I scripts/check_supabase_schema.py                       # .env / konstantadan oladi
    python -I scripts/check_supabase_schema.py --url https://x.supabase.co --key <anon>
    python -I scripts/check_supabase_schema.py --json                | ma'lumot JSON (skriptlar uchun)

Kalit manbalari (ustuvorlik tartibi): --key > AEA_SUPABASE_ANON_KEY >
VITE_SUPABASE_ANON_KEY > `.env` > `mobile/app/build.gradle` (ikkalasida ham
ochiq e'lon qilingan publishable kalit).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Repo ildizi — skript `scripts/` ichida, shuning uchun bitta yuqoriga.
ROOT = Path(__file__).resolve().parent.parent

# ---- Bizning migratsiyalar kutilayotgan obyektlar (manba: supabase/migrations) ----
# Kalit = migratsiya fayli, qiymat = tekshiriladigan jadval va ustunlar.
EXPECTED: list[dict] = [
    {
        "migration": "0003_motion.sql",
        "table": "user_settings",
        "columns": ["motion_enabled"],
    },
    {
        "migration": "0004_weekly_xp.sql",
        "table": "weekly_xp",
        "columns": ["user_id", "week_start", "xp", "league_id", "display_name", "updated_at"],
        "settings_columns": ["xp_goal_xp", "hearts_enabled"],
    },
]

# PostgREST/Postgres kodlari — 2026-11-08 JonLI o'lchovdan (ixtira emas):
#   404 PGRST205 -> "Could not find the table ... in the schema cache"
#   400 PGRST204 -> ro'yxatdagi (select/upsert) ustun topilmadi
#   400 42703    -> Postgres: column ... does not exist
CODE_MEANING = {
    "PGRST205": "jadval topilmadi (schema cache’da yo‘q)",
    "PGRST204": "so'rovda yo'q ustun ko'rsatildi",
    "42703": "ustun bazada yo'q",
    "42P01": "jadval bazada yo'q",
}


def read_env_file(path: Path) -> dict[str, str]:
    """.env faylidan KEY=VALUE juftliklari (izohlar va qo'shtirnoqlar bilan)."""
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, _, value = s.partition("=")
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def resolve_env(args: argparse.Namespace) -> tuple[str | None, str | None, list[str]]:
    """URL va kalitni manbalardan izlash. Topilmagan sababi ochiq qaytadi."""
    notes: list[str] = []
    url = args.url or os.environ.get("AEA_SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = args.key or os.environ.get("AEA_SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

    if not url or not key:
        env = read_env_file(ROOT / ".env")
        url = url or env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL")
        key = key or env.get("VITE_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY")

    if not url or not key:
        # Mobil konfiq — ochiq publishable kalit shu yerda yozilgan.
        gradle = ROOT / "mobile" / "app" / "build.gradle"
        if gradle.is_file():
            text = gradle.read_text(encoding="utf-8", errors="replace")
            # buildConfigField "String", "SUPABASE_URL", '"https://…"' — qo'shtirnoq
            # ichidagi qo'shtirnoq, shuning uchun `'` ixtiyoriy.
            m_url = re.search(r'SUPABASE_URL",\s*.\s*"(https://[^"]+)"', text)
            m_key = re.search(r'SUPABASE_ANON_KEY",\s*.\s*"([^"]+)"', text)
            url = url or (m_url.group(1) if m_url else None)
            key = key or (m_key.group(1) if m_key else None)
            if url and key:
                notes.append("URL va kalit `mobile/app/build.gradle`dan olindi (ochiq publishable kalit).")

    if url:
        url = url.rstrip("/")
    return url, key, notes


def request(url: str, key: str, method: str, path: str, timeout: float) -> tuple[int, str, str | None, str | None]:
    """Bitta PostgREST so'rovi. Qayradi: (status, body, xato_kodi, xato_matni)."""
    req = urllib.request.Request(
        url.rstrip("/") + "/rest/v1/" + path,
        method=method,
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Accept": "application/json",
            "Range": "0-0",
            "Range-Unit": "items",
        },
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace"), None, None
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        code, message = None, None
        try:
            payload = json.loads(body)
            code = payload.get("code")
            message = payload.get("message")
        except Exception:  # JSON bo'lmasa — xato kodi yo'q, matni saqlanadi
            pass
        return err.code, body, code, message
    except Exception as err:  # tarmoq/DNS/TLS — kod yo'q, sababi matnda
        return 0, "", None, f"{type(err).__name__}: {err}"


def probe_table(url: str, key: str, table: str, timeout: float) -> dict:
    """Jadval mavjudmi — `limit=0` GET so'rovi bilan (404 = yo'q).

    HEAD emas, GET: HEAD javobida jism yo'qligi uchun PostgREST xato KODI
    (`PGRST205`) ko'rinmasdi — Halol hisobotda kod va server xabari bo'lishi
    kerak. `limit=0` hech qanday qator o'qimaydi (javob `[]`).
    """
    status, body, code, message = request(url, key, "GET", f"{table}?select=*&limit=0", timeout)
    return {
        "table": table,
        "exists": status != 404,
        "status": status,
        "code": code,
        "message": message or (body[:120] if body else None),
    }


def probe_columns(url: str, key: str, table: str, columns: list[str], timeout: float) -> list[dict]:
    """Har ustun alohida so'rovda: yo'q bo'lsa 400 42703 / PGRST204 qaytadi."""
    out = []
    for col in columns:
        status, body, code, message = request(url, key, "GET", f"{table}?select={col}&limit=0", timeout)
        missing = status in (400, 404) and code in ("42703", "PGRST204", "PGRST205", "42P01")
        out.append(
            {
                "column": col,
                "exists": not missing,
                "status": status,
                "code": code,
                "message": message or (body[:120] if body else None),
            }
        )
    return out


def main() -> int:
    # Windows konsoli cp1251 bo'lsa o'zbekcha belgilar "?" bo'lib qolardi
    # (2026-11-08 kuzatildi) — UTF-8 ga o'tkazamiz, almashtirib bo'lmasa "?"
    # o'zi ham halol.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Supabase sxemasini o'qib tekshirish (yozish YO'Q)")
    ap.add_argument("--url", help="Supabase manzili")
    ap.add_argument("--key", help="anon / publishable kalit")
    ap.add_argument("--timeout", type=float, default=15.0, help="bir so'rov kutish vaqti (sekund)")
    ap.add_argument("--json", action="store_true", help="natijani JSON qilib chiqarish")
    args = ap.parse_args()

    url, key, notes = resolve_env(args)
    if not url or not key:
        print("Baza manzili yoki kalit topilmadi (--url / --key bering yoki .env to'ldiring).")
        return 2
    if not url.startswith("https://"):
        print("Manzil https:// bilan boshlanishi kerak.")
        return 2

    checks: list[dict] = []
    for spec in EXPECTED:
        table = probe_table(url, key, spec["table"], args.timeout)
        columns_probe = (
            probe_columns(url, key, spec["table"], spec["columns"], args.timeout)
            if table["exists"]
            else [{"column": c, "exists": False, "status": 0, "code": None, "message": "jadval yo'q"} for c in spec["columns"]]
        )
        settings_probe = probe_columns(url, key, "user_settings", spec.get("settings_columns", []), args.timeout)
        checks.append({"migration": spec["migration"], "table": table, "columns": columns_probe, "settings_columns": settings_probe})

    missing_migrations = [
        c["migration"]
        for c in checks
        if (not c["table"]["exists"])
        or any(not c_["exists"] for c_ in c["columns"])
        or any(not c_["exists"] for c_ in c["settings_columns"])
    ]

    if args.json:
        print(json.dumps({"url": url, "checks": checks, "missing_migrations": missing_migrations, "notes": notes}, ensure_ascii=False, indent=2))
    else:
        print(f"Baza: {url}")
        for note in notes:
            print(f"Izoh: {note}")
        print()
        for check in checks:
            table = check["table"]
            mark = "BOR" if table["exists"] else "YO'Q"
            code_meaning = CODE_MEANING.get(table["code"] or "", "")
            print(f"[{check['migration']}] jadval {table['table']}: {mark} (HTTP {table['status']}, kod {table['code']}) {code_meaning}")
            if table["message"]:
                print(f"    server xabari: {table['message']}")
            for col in check["columns"]:
                flag = "bor" if col["exists"] else "YO'Q"
                tail = f"HTTP {col['status']}, kod {col['code']}" if not col["exists"] else ""
                print(f"    ustun {col['column']}: {flag} {tail}")
            for col in check["settings_columns"]:
                flag = "bor" if col["exists"] else "YO'Q"
                tail = f"HTTP {col['status']}, kod {col['code']}" if not col["exists"] else ""
                print(f"    ustun user_settings.{col['column']}: {flag} {tail}")
            print()
        if missing_migrations:
            print("XULOSA: baza eski sxemada. Quyidagi skriptlar SQL Editor’da bajarilmagan:")
            for m in missing_migrations:
                print(f"  - supabase/migrations/{m}")
            print("Bajarilgandan keyin skriptni qayta ishga tushiring — hamma qator BOR bo'lishi kerak.")
        else:
            print("XULOSA: barcha migratsiyalar qo'llanilgan (jadval va ustunlar BOR).")
        print()
        print("Skript faqat o'qidi — bazada hech narsa o'zgartirilmadi.")
    return 1 if missing_migrations else 0


if __name__ == "__main__":
    sys.exit(main())
