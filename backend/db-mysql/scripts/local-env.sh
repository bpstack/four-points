#!/bin/bash
# Credenciales de la BD local para los scripts de esta carpeta: salen de
# backend/.env (LOCAL_DB_*), nunca de los scripts. La contraseña va por
# MYSQL_PWD, así no aparece en la línea de comandos.
# Uso: source "$(dirname "$0")/local-env.sh"

LOCAL_ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../.env"
[[ -f "$LOCAL_ENV_FILE" ]] || { echo "❌ Falta backend/.env"; exit 1; }

local_env_get() {
  grep -E "^$1=" "$LOCAL_ENV_FILE" | tail -1 | cut -d= -f2- | sed -E 's/^["'\'']//; s/["'\'']$//' | tr -d '\r'
}

DB_HOST="$(local_env_get LOCAL_DB_HOST)"; DB_HOST="${DB_HOST:-localhost}"
DB_USER="$(local_env_get LOCAL_DB_USER)"; DB_USER="${DB_USER:-root}"
DB_NAME="$(local_env_get LOCAL_DB_NAME)"; DB_NAME="${DB_NAME:-hotel_db}"
export MYSQL_PWD="$(local_env_get LOCAL_DB_PASSWORD)"
