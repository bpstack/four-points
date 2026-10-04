#!/bin/bash

# =============================================
# Backup Local MySQL
# =============================================

# Configuración
source "$(dirname "$0")/local-env.sh"
BACKUP_DIR="$(dirname "$0")/../backup"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Nombre del archivo
FILENAME="backup_${DB_NAME}_local_${DATE}.sql"

echo "📦 Creando backup local de $DB_NAME..."

# Ejecutar backup
mysqldump -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
    echo "✅ Backup creado: $FILENAME"
    echo "📁 Ubicación: $BACKUP_DIR/$FILENAME"
    ls -lh "$BACKUP_DIR/$FILENAME"
else
    echo "❌ Error al crear backup"
    exit 1
fi
