#!/usr/bin/env bash
# Supabase migratsiyalari va RLS testlari — LOKAL Postgres'da (prod bazaga tegmaydi).
#
# Talab: ishlab turgan Postgres 15+ va `psql`. Ulanish odatiy PG* o'zgaruvchilari
# bilan (PGHOST, PGPORT, PGUSER). Har ishga tushirishda vaqtinchalik baza
# yaratiladi va oxirida o'chiriladi.
#
#   PGHOST=/var/run/postgresql PGUSER=postgres bash scripts/test-sql.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="aea_sqltest_$$"
psql -q -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
args=(-q -o /dev/null -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/_supabase_stub.sql)
for f in supabase/migrations/*.sql; do args+=(-f "$f"); done
for t in supabase/tests/*.test.sql; do args+=(-f "$t"); done
PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning" psql "${args[@]}"
