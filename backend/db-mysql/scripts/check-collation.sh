#!/bin/bash

# =============================================
# Verificar collation de la base de datos local
# =============================================

DB_NAME="hotel_db"
DB_USER="root"
DB_PASS="***REMOVED***"

echo "🔍 Verificando collation de $DB_NAME..."

mysql -u "$DB_USER" -p"$DB_PASS" -e "
SELECT 
    DEFAULT_CHARACTER_SET_NAME AS charset,
    DEFAULT_COLLATION_NAME AS collation
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = '$DB_NAME';
"

echo ""
echo "🔍 Verificando collation de tablas..."

mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT 
    TABLE_NAME,
    TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = '$DB_NAME'
ORDER BY TABLE_NAME;
"
