#!/bin/bash

# =============================================
# Sacar la foto de la instalación: schema.sql y catalogs.sql
# =============================================
# Uso:
#   backend/db-mysql/scripts/snapshot-schema.sh <base_estructura> <base_catalogos>
#
# Ejemplo, con las dos bases en el servidor local:
#   snapshot-schema.sh cmp_prod cmp_repo
#   - cmp_prod: un volcado de la BD remota cargado sin DEFINER (producción).
#   - cmp_repo: una instalación del repositorio sin datos ficticios.
#
# - schema.sql: solo estructura de <base_estructura> (tablas, vistas, triggers,
#   rutinas y eventos), sin filas, sin DEFINER, sin contadores AUTO_INCREMENT y
#   sin las tablas demo_snapshot_* que crea la demo en ejecución.
# - catalogs.sql: las filas de los catálogos de <base_catalogos>, que ya son
#   públicas en el repositorio, nunca de producción. Termina generando la
#   disponibilidad de parking con generate_availability().
# - Solo lee las dos bases. Credenciales de backend/.env (local-env.sh).
# - Antes de commitear, revisar el resultado (docs: «El repositorio es público»).

set -euo pipefail

source "$(dirname "$0")/local-env.sh"
DB_PORT="$(local_env_get LOCAL_DB_PORT)"; DB_PORT="${DB_PORT:-3306}"

[[ $# -eq 2 ]] || { echo "Uso: $0 <base_estructura> <base_catalogos>"; exit 2; }
SRC="$1"
CAT="$2"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Tables whose rows a fresh install needs before any fictitious data
CATALOGS=(roles payment_methods parking_spots fnb_category bo_categories checklist_config scheduling_shifts scheduling_config)

CONN=(-h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --default-character-set=utf8mb4)
DUMP=(mysqldump "${CONN[@]}" --skip-comments --no-tablespaces --set-gtid-purged=OFF)

for db in "$SRC" "$CAT"; do
  mysql "${CONN[@]}" -N -e "SELECT 1 FROM information_schema.schemata WHERE schema_name = '$db'" | grep -q 1 \
    || { echo "❌ No existe la base '$db'"; exit 2; }
done

IGNORE=()
while read -r t; do
  [[ -n "$t" ]] && IGNORE+=("--ignore-table=$SRC.$t")
done < <(mysql "${CONN[@]}" -N -e "SELECT table_name FROM information_schema.tables
  WHERE table_schema = '$SRC' AND table_name LIKE 'demo\\_snapshot\\_%'" | tr -d '\r')

header() {
  cat <<EOF
-- =============================================================================
-- $1
-- Generado con scripts/snapshot-schema.sh: no se edita a mano.
-- $2
-- =============================================================================

EOF
}

{
  header "schema.sql: estructura de la BD tal como está en producción" \
    "Lo carga setup-local.ts sobre una base vacía; luego van los scripts posteriores."
  "${DUMP[@]}" --no-data --routines --triggers --events "${IGNORE[@]}" "$SRC" \
    | sed -E \
      -e 's/DEFINER=(`[^`]+`|"[^"]+")@(`[^`]+`|"[^"]+")//g' \
      -e 's/ AUTO_INCREMENT=[0-9]+//' \
      -e "s/\`$SRC\`\\.//g"
} > "$OUT_DIR/schema.sql"

{
  header "catalogs.sql: filas de los catálogos que necesita una instalación nueva" \
    "Salen de una instalación del repositorio, nunca de producción."
  "${DUMP[@]}" --no-create-info --skip-triggers --complete-insert --skip-extended-insert \
    --insert-ignore --skip-add-locks --skip-disable-keys "$CAT" "${CATALOGS[@]}"
  # Internal user of the cron jobs (scripts/20261014_cron_catch_up.sql)
  "${DUMP[@]}" --no-create-info --skip-triggers --complete-insert --skip-extended-insert \
    --insert-ignore --skip-add-locks --skip-disable-keys --where="id = 'system-cron'" "$CAT" users
  echo "CALL generate_availability();"
} > "$OUT_DIR/catalogs.sql"

echo "✅ schema.sql y catalogs.sql escritos en $(basename "$OUT_DIR")/"
grep -c '^CREATE TABLE' "$OUT_DIR/schema.sql" | sed 's/^/   tablas: /'
grep -c '^INSERT' "$OUT_DIR/catalogs.sql" | sed 's/^/   filas de catálogo: /'
