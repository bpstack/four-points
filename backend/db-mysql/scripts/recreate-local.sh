#!/bin/bash

# =============================================
# Recreate Local MySQL Database with new collation
# =============================================

DB_NAME="hotel_db"
DB_USER="root"
DB_PASS="***REMOVED***"
SCRIPT_DIR="$(dirname "$0")"
INSTALL_SCRIPT="$SCRIPT_DIR/../MASTER_INSTALL.sql"

echo "⚠️  Esto borrará completamente la base de datos '$DB_NAME' y la recreará"
echo "⏭️  Continuando en 5 segundos... (Ctrl+C para cancelar)"
sleep 5

echo ""
echo "🔴 Eliminando base de datos '$DB_NAME'..."

mysql -u "$DB_USER" -p"$DB_PASS" -e "DROP DATABASE IF EXISTS $DB_NAME;"

if [ $? -eq 0 ]; then
    echo "✅ Base de datos eliminada"
else
    echo "❌ Error al eliminar base de datos"
    exit 1
fi

echo ""
echo "🟢 Creando base de datos con collation utf8mb4_0900_ai_ci..."

mysql -u "$DB_USER" -p"$DB_PASS" -e "
CREATE DATABASE $DB_NAME
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;
"

if [ $? -eq 0 ]; then
    echo "✅ Base de datos creada"
else
    echo "❌ Error al crear base de datos"
    exit 1
fi

echo ""
echo "📥 Importando esquemas desde MASTER_INSTALL.sql..."

mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$INSTALL_SCRIPT"

if [ $? -eq 0 ]; then
    echo "✅ Esquemas importados correctamente"
else
    echo "❌ Error al importar esquemas"
    exit 1
fi

echo ""
echo "✅ Base de datos recreateada con éxito"
echo ""
echo "🔍 Verificando nuevo collation..."

mysql -u "$DB_USER" -p"$DB_PASS" -e "
SELECT 
    DEFAULT_CHARACTER_SET_NAME AS charset,
    DEFAULT_COLLATION_NAME AS collation
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = '$DB_NAME';
"

echo ""
echo "📊 Tablas creadas:"

mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;"
