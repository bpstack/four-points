#!/bin/bash

# =============================================
# Verificar collation de la base de datos local
# =============================================

source "$(dirname "$0")/local-env.sh"

echo "🔍 Verificando collation de $DB_NAME..."

mysql -h "$DB_HOST" -u "$DB_USER" -e "
SELECT 
    DEFAULT_CHARACTER_SET_NAME AS charset,
    DEFAULT_COLLATION_NAME AS collation
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = '$DB_NAME';
"

echo ""
echo "🔍 Verificando collation de tablas..."

mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -e "
SELECT 
    TABLE_NAME,
    TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = '$DB_NAME'
ORDER BY TABLE_NAME;
"
