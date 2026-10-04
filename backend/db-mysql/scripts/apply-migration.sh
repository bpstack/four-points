#!/bin/bash

# =============================================
# Aplicar una migración incremental (scripts/YYYYMMDD_*.sql)
# =============================================
# Uso (desde cualquier carpeta):
#   backend/db-mysql/scripts/apply-migration.sh local|aiven <fichero.sql> [--dry-run]
#
# - Las credenciales salen de backend/.env (LOCAL_DB_* o AIVEN_DB_* y
#   AIVEN_PASSWORD), nunca de este fichero.
# - La contraseña va por MYSQL_PWD: no aparece en la línea de comandos.
# - --dry-run: muestra destino y fichero y comprueba la conexión con un
#   SELECT; no ejecuta la migración.
# - Solo acepta ficheros de scripts/ con nombre YYYYMMDD_*.sql.
# - Después: actualizar el estado de la fila en INDEX.md.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"
SSL_CA="$SCRIPT_DIR/../../config/certs/ca-certificate.pem"

TARGET="${1:-}"
SQL_FILE="${2:-}"
DRY_RUN="${3:-}"

if [[ "$TARGET" != "local" && "$TARGET" != "aiven" ]] || [[ -z "$SQL_FILE" ]]; then
  echo "Uso: $0 local|aiven <scripts/YYYYMMDD_descripcion.sql> [--dry-run]"
  exit 1
fi

SQL_PATH="$(cd "$(dirname "$SQL_FILE")" && pwd)/$(basename "$SQL_FILE")"
if [[ "$(dirname "$SQL_PATH")" != "$SCRIPT_DIR" ]] || [[ ! "$(basename "$SQL_PATH")" =~ ^[0-9]{8}_.+\.sql$ ]]; then
  echo "❌ Solo se aplican migraciones de scripts/ con nombre YYYYMMDD_*.sql"
  exit 1
fi
[[ -f "$SQL_PATH" ]] || { echo "❌ No existe: $SQL_PATH"; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "❌ Falta backend/.env"; exit 1; }

# Lee una variable de backend/.env sin ejecutar el fichero
env_get() {
  grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -E 's/^["'\'']//; s/["'\'']$//' | tr -d '\r'
}

if [[ "$TARGET" == "local" ]]; then
  DB_HOST="$(env_get LOCAL_DB_HOST)";  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="$(env_get LOCAL_DB_PORT)";  DB_PORT="${DB_PORT:-3306}"
  DB_USER="$(env_get LOCAL_DB_USER)";  DB_USER="${DB_USER:-root}"
  DB_NAME="$(env_get LOCAL_DB_NAME)";  DB_NAME="${DB_NAME:-hotel_db}"
  export MYSQL_PWD="$(env_get LOCAL_DB_PASSWORD)"
  SSL_ARGS=()
else
  DB_HOST="$(env_get AIVEN_DB_HOST)"
  DB_PORT="$(env_get AIVEN_DB_PORT)";  DB_PORT="${DB_PORT:-23225}"
  DB_USER="$(env_get AIVEN_DB_USER)";  DB_USER="${DB_USER:-avnadmin}"
  DB_NAME="$(env_get AIVEN_DB_NAME)";  DB_NAME="${DB_NAME:-hotel_db}"
  export MYSQL_PWD="$(env_get AIVEN_PASSWORD)"
  SSL_ARGS=(--ssl-ca="$SSL_CA" --ssl-mode=VERIFY_CA)
fi
[[ -n "$DB_HOST" && -n "$MYSQL_PWD" ]] || { echo "❌ Faltan credenciales de $TARGET en backend/.env"; exit 1; }

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "${SSL_ARGS[@]}" --default-character-set=utf8mb4 "$DB_NAME")

echo "🎯 Destino:   $TARGET ($DB_USER@$DB_HOST:$DB_PORT/$DB_NAME)"
echo "📄 Migración: $(basename "$SQL_PATH")"

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  "${MYSQL[@]}" -e "SELECT DATABASE() AS db, VERSION() AS version, NOW() AS now;"
  echo "🧪 --dry-run: conexión correcta, migración NO ejecutada"
  exit 0
fi

"${MYSQL[@]}" < "$SQL_PATH"
echo "✅ Aplicada. Actualiza su estado en INDEX.md ($TARGET)."
