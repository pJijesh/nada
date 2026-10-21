#!/usr/bin/env bash
# Runs the migrations and the access-rule tests on a throwaway local Postgres.
# Usage: PGPORT=5544 PGHOST=/tmp PGUSER=postgres tests/run_schema_test.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=sur_test
psql -d postgres -qc "drop database if exists $DB" -c "create database $DB"
psql -d $DB -q -v ON_ERROR_STOP=1 -f tests/schema_stub.sql
for f in supabase/migrations/*.sql; do psql -d $DB -q -v ON_ERROR_STOP=1 -f "$f"; done
psql -d $DB -q -v ON_ERROR_STOP=1 -f tests/schema_test.sql
