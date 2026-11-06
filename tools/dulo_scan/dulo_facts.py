#!/usr/bin/env python3
"""
DULO_mod.apk — O'LCHANGAN FAKTLAR (bitta skript, qayta ishga tushirib bo'ladi).

Nima uchun repoda: matn dagi har bir son shu skriptdan olinadi — "ko'rib chiqdim"
emas, "o'lchadim". APK repoga kiritilmagan (168 MB — GitHub chegarasidan yuqori),
shuning uchun skript yo'lni ARQUMENT oladi:

    python -I tools/dulo_scan/dulo_facts.py S:/Agent-2026/New_loixa/DULO_mod.apk \
        > tools/dulo_scan/DULO_FAKTLAR.json

Skript faqat O'QIDI (zip arxivini ochadi); APK ichidan hech qanday kod
bajarilmaydi. `-I` (izolyatsiya) talab qilinadi — tashqi arxiv papkasidagi
planted modul import qilimasligi uchun.

Natijalar `mobile/UI_KONTRAKTI.md` va `MOBIL_ARXITEKTURA.md`dagi raqamlar bilan
solishtiriladi; bikrlashsa — hujjat eskirgan, deb bilinsin.
"""
import json
import statistics
import struct
import sys
import zipfile
from collections import Counter

MAX_DOC_MS = 1500  # bizning byudjet chegarasi (MotionManifest / motionManifest.ts)


def lottie_durations(z):
    """`res/raw/*.json` — Lottie: (op-ip)/fr*1000 ms."""
    out = []
    for n in z.namelist():
        if not (n.startswith("res/raw/") and n.endswith(".json")):
            continue
        try:
            d = json.loads(z.read(n))
        except Exception:
            continue
        if isinstance(d, dict) and all(k in d for k in ("op", "ip", "fr")) and d.get("fr"):
            try:
                out.append((d["op"] - d["ip"]) / float(d["fr"]) * 1000.0)
            except Exception:
                continue
    return sorted(out)


def hla_tracks(z):
    """`.hla` — tebranish (haptik) traektoriyasi: Duration (ms), Timings, Amplitudes."""
    durs, amp_counts = [], []
    parsed = 0
    for n in z.namelist():
        if not n.endswith(".hla"):
            continue
        try:
            d = json.loads(z.read(n))
        except Exception:
            continue
        parsed += 1
        if isinstance(d.get("Duration"), (int, float)):
            durs.append(float(d["Duration"]))
        if isinstance(d.get("Amplitudes"), list):
            amp_counts.append(len(d["Amplitudes"]))
    durs.sort()
    return parsed, durs, amp_counts


def session_order(z):
    """`assets/hardcoded_sessions/**/*.json` — `challenges` massivi = o'quv tartibi."""
    names = sorted(n for n in z.namelist() if n.startswith("assets/hardcoded_sessions/") and n.endswith(".json"))
    per = []
    for n in names:
        try:
            data = json.loads(z.read(n))
        except Exception:
            continue
        found = []

        def walk(o):
            if isinstance(o, dict):
                for k, v in o.items():
                    if k == "challenges" and isinstance(v, list):
                        found.append(v)
                    walk(v)
            elif isinstance(o, list):
                for x in o:
                    walk(x)

        walk(data)
        ch = max(found, key=len) if found else []
        kinds = [(c.get("type") or c.get("kind") or c.get("skillId")) if isinstance(c, dict) else None for c in ch]
        known = [k for k in kinds if k]
        same = sum(1 for i in range(1, len(kinds)) if kinds[i] is not None and kinds[i] == kinds[i - 1])
        last, min_gap = {}, None
        for i, k in enumerate(kinds):
            if k is None:
                continue
            if k in last:
                g = i - last[k]
                min_gap = g if min_gap is None else min(min_gap, g)
            last[k] = i
        per.append(
            {
                "file": n.split("/")[-1],
                "turns": len(kinds),
                "distinct_kinds": len(set(known)),
                "same_neighbours": same,
                "same_neighbour_pct": round(100.0 * same / (len(kinds) - 1), 1) if len(kinds) > 1 else None,
                "min_repeat_gap": min_gap,
                "kind_counts": dict(Counter(known).most_common()),
            }
        )
    mixed = [p for p in per if p["distinct_kinds"] >= 3]
    pairs = sum(p["turns"] - 1 for p in mixed)
    same = sum(p["same_neighbours"] for p in mixed)
    return per, {
        "mixed_sessions_kinds_ge_3": len(mixed),
        "mixed_turns": sum(p["turns"] for p in mixed),
        "mixed_neighbour_pairs": pairs,
        "mixed_same_neighbours": same,
        "mixed_same_neighbour_pct": round(100.0 * same / pairs, 1) if pairs else None,
    }


def main(apk_path):
    z = zipfile.ZipFile(apk_path)
    names = z.namelist()
    ext = Counter()
    size = Counter()
    for n in names:
        if not n.startswith("res/raw/"):
            continue
        base = n.rsplit("/", 1)[-1]
        e = base.rsplit(".", 1)[-1].lower() if "." in base else "(kengaytmasiz)"
        ext[e] += 1
        size[e] += z.getinfo(n).file_size
    lot = lottie_durations(z)
    hla_n, hla_dur, hla_amp = hla_tracks(z)
    per, mixed = session_order(z)
    facts = {
        "_manba": {
            "fayl": apk_path,
            "uskuna": "tools/dulo_scan/dulo_facts.py (faqat o'qish; `-I` bilan yurgizing)",
            "sana": "2026-11-05",
        },
        "konteyner": {
            "kirishlar_soni": len(names),
            "oz_hajmi_bayt": sum(z.getinfo(n).file_size for n in names),
        },
        "res_raw": {
            "fayllar_soni": sum(ext.values()),
            "hajmi_mb": round(sum(size.values()) / 1e6, 1),
            "kengaytmalar": {e: {"fayl": ext[e], "mb": round(size[e] / 1e6, 1)} for e, _ in ext.most_common()},
        },
        "lottie": {
            "tavsif": "res/raw JSONLari (op-ip)/fr*1000",
            "soni": len(lot),
            "min_ms": round(lot[0]) if lot else None,
            "median_ms": round(statistics.median(lot)) if lot else None,
            "max_ms": round(lot[-1]) if lot else None,
            "bizning_byudjet_ms": MAX_DOC_MS,
        },
        "hla_haptik": {
            "tavsif": "JSON: Duration(ms), Timings[], Amplitudes[]",
            "soni": hla_n,
            "duration_min_ms": min(hla_dur) if hla_dur else None,
            "duration_median_ms": round(statistics.median(hla_dur)) if hla_dur else None,
            "duration_max_ms": max(hla_dur) if hla_dur else None,
            "amplitudalar_orqacha_soni": round(statistics.mean(hla_amp), 2) if hla_amp else None,
        },
        "dars_sessionlari": {"soni": len(per), "har_biri": per, "aralash_xulosa": mixed},
        "muhim_eslatma": {
            "challengeTransitionMs": "APK ichida BU NOM YO'Q (qidiruv: scan10.py) — "
            "animatsiya davomiyligi fayllar ichida, kalit sifatida emas.",
            "dulo_ozi": "DULO `math_lesson.json`da ham BIR XIL TUR QO'SHNI keladi "
            "(3 qo'shni, eng qisqa masofa 1) — ya'ni 31.1% aralashlik DULO qoidasi. "
            "Bizning MIN_KIND_GAP=2 QASDDAN kuchliroq talab (bizning ixtiyoriy "
            "yaxshilanishimiz), DULO klonida esa DULO soni emas, SHU mexanizm "
            "(tartib ro'yxati + tur almashinuvi + takrorlash) nusxalanadi.",
        },
    }
    # Windows konsolining kodlashiga bog'lanmasligi uchun baytlar bilan yozamiz
    # (matnda o'zbekcha belgilar va uzun tirik — cp1252 da buziladi).
    sys.stdout.buffer.write((json.dumps(facts, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ishlatish: python -I tools/dulo_scan/dulo_facts.py <DULO_mod.apk>", file=sys.stderr)
        raise SystemExit(2)
    # struct importi ba'zi eski skriptlarda qolib ketgan; bu yilda kerak emas.
    _ = struct
    main(sys.argv[1])
