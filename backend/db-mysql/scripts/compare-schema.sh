#!/bin/bash

# =============================================
# Comparar el esquema de dos bases del servidor local
# =============================================
# Uso:
#   backend/db-mysql/scripts/compare-schema.sh <base_a> <base_b> [--exclude <patrón LIKE>]
#
# Ejemplo: cargar un volcado de la BD remota en una base aparte (cmp_prod) y
# compararla con la que instala el repositorio:
#   compare-schema.sh cmp_prod hotel_db
#
# - Solo lee information_schema; no toca ninguna de las dos bases.
# - Las dos bases tienen que estar en el mismo servidor: el local, con las
#   credenciales de backend/.env (local-env.sh). Ninguna contraseña aquí.
# - Lista solo las diferencias, por categoría: tablas, columnas, índices, claves
#   ajenas, CHECK, vistas, triggers, rutinas, eventos, y el sql_mode y el juego
#   de caracteres con que se crearon.
# - Los cuerpos (vistas, triggers, rutinas, eventos) se comparan con los
#   espacios normalizados y sin el nombre de la base delante de cada tabla.
# - Por defecto excluye las tablas demo_snapshot_* que crea la demo en
#   ejecución; --exclude cambia el patrón (sintaxis LIKE, '' = ninguna).
# - Salida: 0 sin diferencias, 1 con diferencias, 2 si hay un error.

set -euo pipefail

source "$(dirname "$0")/local-env.sh"
DB_PORT="$(local_env_get LOCAL_DB_PORT)"; DB_PORT="${DB_PORT:-3306}"

usage() {
  echo "Uso: $0 <base_a> <base_b> [--exclude <patrón LIKE>]" >&2
  exit 2
}

[[ $# -ge 2 ]] || usage
A="$1"; B="$2"; shift 2
EXCLUDE='demo\_snapshot\_%'
if [[ $# -gt 0 ]]; then
  [[ "$1" == "--exclude" && $# -eq 2 ]] || usage
  EXCLUDE="$2"
fi

# Los nombres van dentro del SQL: solo letras, números y guion bajo
for name in "$A" "$B"; do
  [[ "$name" =~ ^[A-Za-z0-9_]+$ ]] || { echo "❌ Nombre de base no válido: $name" >&2; exit 2; }
done
[[ "$EXCLUDE" != *"'"* && "$EXCLUDE" != *'"'* ]] || { echo "❌ El patrón no puede llevar comillas" >&2; exit 2; }

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --default-character-set=utf8mb4 -N -B)

for name in "$A" "$B"; do
  found="$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$name'")"
  [[ "$found" == "1" ]] || { echo "❌ No existe la base: $name" >&2; exit 2; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Espacios normalizados y sin `base`. delante de los nombres
norm() {
  echo "TRIM(REGEXP_REPLACE(REPLACE($1, CONCAT('\`', @s, '\`.'), ''), '[[:space:]]+', ' '))"
}

# Filtro de tablas excluidas para la columna indicada
excl() {
  if [[ -z "$EXCLUDE" ]]; then echo "1 = 1"; else echo "$1 NOT LIKE '$EXCLUDE'"; fi
}

declare -A QUERY
CATEGORIES=(tables columns indexes foreign_keys checks views triggers routines events sql_mode charset)

QUERY[tables]="
SELECT TABLE_NAME, TABLE_TYPE, IFNULL(ENGINE, ''), IFNULL(TABLE_COLLATION, ''),
       IFNULL(CREATE_OPTIONS, ''), TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @s AND $(excl TABLE_NAME)"

QUERY[columns]="
SELECT TABLE_NAME, ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE,
       IFNULL(COLUMN_DEFAULT, '<NULL>'), EXTRA, IFNULL(CHARACTER_SET_NAME, ''),
       IFNULL(COLLATION_NAME, ''), COLUMN_COMMENT, GENERATION_EXPRESSION
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @s AND $(excl TABLE_NAME)"

QUERY[indexes]="
SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX,
       IFNULL(COLUMN_NAME, EXPRESSION), IFNULL(SUB_PART, ''), INDEX_TYPE,
       IFNULL(COLLATION, ''), IS_VISIBLE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @s AND $(excl TABLE_NAME)"

QUERY[foreign_keys]="
SELECT rc.TABLE_NAME, rc.CONSTRAINT_NAME, k.ORDINAL_POSITION, k.COLUMN_NAME,
       rc.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, rc.UPDATE_RULE, rc.DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS rc
JOIN information_schema.KEY_COLUMN_USAGE k
  ON k.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
 AND k.TABLE_NAME = rc.TABLE_NAME
 AND k.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
WHERE rc.CONSTRAINT_SCHEMA = @s AND $(excl rc.TABLE_NAME)"

QUERY[checks]="
SELECT tc.TABLE_NAME, cc.CONSTRAINT_NAME, tc.ENFORCED, $(norm cc.CHECK_CLAUSE)
FROM information_schema.CHECK_CONSTRAINTS cc
JOIN information_schema.TABLE_CONSTRAINTS tc
  ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
 AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
 AND tc.CONSTRAINT_TYPE = 'CHECK'
WHERE cc.CONSTRAINT_SCHEMA = @s AND $(excl tc.TABLE_NAME)"

QUERY[views]="
SELECT TABLE_NAME, CHECK_OPTION, IS_UPDATABLE, SECURITY_TYPE, $(norm VIEW_DEFINITION)
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = @s"

QUERY[triggers]="
SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION,
       ACTION_ORDER, $(norm ACTION_STATEMENT)
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = @s"

QUERY[routines]="
SELECT r.ROUTINE_TYPE, r.ROUTINE_NAME, IFNULL(r.DTD_IDENTIFIER, ''), r.SECURITY_TYPE,
       r.IS_DETERMINISTIC, r.SQL_DATA_ACCESS,
       IFNULL((SELECT GROUP_CONCAT(CONCAT_WS(' ', p.PARAMETER_MODE, p.PARAMETER_NAME, p.DTD_IDENTIFIER)
                                   ORDER BY p.ORDINAL_POSITION SEPARATOR ', ')
               FROM information_schema.PARAMETERS p
               WHERE p.SPECIFIC_SCHEMA = r.ROUTINE_SCHEMA AND p.SPECIFIC_NAME = r.SPECIFIC_NAME
                 AND p.ORDINAL_POSITION > 0), ''),
       $(norm r.ROUTINE_DEFINITION)
FROM information_schema.ROUTINES r
WHERE r.ROUTINE_SCHEMA = @s"

QUERY[events]="
SELECT EVENT_NAME, EVENT_TYPE, IFNULL(INTERVAL_VALUE, ''), IFNULL(INTERVAL_FIELD, ''),
       STATUS, ON_COMPLETION, TIME_ZONE, $(norm EVENT_DEFINITION)
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = @s"

QUERY[sql_mode]="
SELECT 'TRIGGER', TRIGGER_NAME, SQL_MODE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = @s
UNION ALL
SELECT ROUTINE_TYPE, ROUTINE_NAME, SQL_MODE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = @s
UNION ALL
SELECT 'EVENT', EVENT_NAME, SQL_MODE FROM information_schema.EVENTS WHERE EVENT_SCHEMA = @s"

# Juego de caracteres de la conexión que creó cada objeto: decide el de sus
# literales (una vista creada desde una consola cp850 da columnas cp850)
QUERY[charset]="
SELECT 'VIEW', TABLE_NAME, CHARACTER_SET_CLIENT, COLLATION_CONNECTION, '' FROM information_schema.VIEWS WHERE TABLE_SCHEMA = @s
UNION ALL
SELECT 'TRIGGER', TRIGGER_NAME, CHARACTER_SET_CLIENT, COLLATION_CONNECTION, DATABASE_COLLATION FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = @s
UNION ALL
SELECT ROUTINE_TYPE, ROUTINE_NAME, CHARACTER_SET_CLIENT, COLLATION_CONNECTION, DATABASE_COLLATION FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = @s
UNION ALL
SELECT 'EVENT', EVENT_NAME, CHARACTER_SET_CLIENT, COLLATION_CONNECTION, DATABASE_COLLATION FROM information_schema.EVENTS WHERE EVENT_SCHEMA = @s"

dump_category() {
  local schema="$1" category="$2" out="$3"
  "${MYSQL[@]}" -e "SET @s = '$schema'; ${QUERY[$category]}" | LC_ALL=C sort > "$out"
}

echo "🔍 Esquema de '$A' frente a '$B' (servidor $DB_HOST:$DB_PORT)"
[[ -n "$EXCLUDE" ]] && echo "   Tablas excluidas: LIKE '$EXCLUDE'"
echo "   «- $A» solo está en $A · «+ $B» solo está en $B"
echo

TOTAL=0
for category in "${CATEGORIES[@]}"; do
  dump_category "$A" "$category" "$TMP/a"
  dump_category "$B" "$category" "$TMP/b"
  only_a="$(LC_ALL=C comm -23 "$TMP/a" "$TMP/b")"
  only_b="$(LC_ALL=C comm -13 "$TMP/a" "$TMP/b")"
  count_a="$(printf '%s' "$only_a" | grep -c '' || true)"
  count_b="$(printf '%s' "$only_b" | grep -c '' || true)"
  rows="$(grep -c '' "$TMP/a" || true)"

  if [[ "$count_a" -eq 0 && "$count_b" -eq 0 ]]; then
    echo "✅ $category: igual ($rows filas)"
    continue
  fi

  TOTAL=$((TOTAL + count_a + count_b))
  echo "❌ $category: $count_a solo en $A, $count_b solo en $B"
  [[ -n "$only_a" ]] && printf '%s\n' "$only_a" | sed "s/^/   - $A	/"
  [[ -n "$only_b" ]] && printf '%s\n' "$only_b" | sed "s/^/   + $B	/"
  echo
done

echo
if [[ "$TOTAL" -eq 0 ]]; then
  echo "✅ Sin diferencias"
  exit 0
fi
echo "❌ $TOTAL filas distintas"
exit 1
