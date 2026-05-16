# 🚀 Guía Completa: MySQL Local → Aiven Cloud

**Proyecto:** Four-Points Hotel PMS  
**Fecha:** 29-30 Octubre 2025  
**MySQL:** 8.0 Local → 8.0.35 Aiven (Alemania)

---

## 📋 ÍNDICE

1. [Preparación Local](#1-preparación-local)
2. [Configuración de Aiven](#2-configuración-de-aiven)
3. [Backup y Limpieza](#3-backup-y-limpieza)
4. [Importación de Datos](#4-importación-de-datos)
5. [Configuración del Backend](#5-configuración-del-backend)
6. [Problema de Colaciones](#6-problema-de-colaciones)
7. [Seguridad y Git](#7-seguridad-y-git)
8. [Testing y Verificación](#8-testing-y-verificación)

---

## 1. PREPARACIÓN LOCAL

### 1.1 Crear Backup

```bash
cd /mnt/c/Users/dz/Desktop/db-backup

mysqldump -u root -p hotel_db \
  --routines \
  --triggers \
  --events \
  --single-transaction \
  > hotel_db_backup_$(date +%Y%m%d).sql
```

### 1.2 Verificar Backup

```bash
head -n 50 hotel_db_backup_20251029.sql
grep -c "CREATE TABLE" hotel_db_backup_20251029.sql
```

---

## 2. CONFIGURACIÓN DE AIVEN

### 2.1 Crear Servicio

1. Ir a [Aiven.io](https://aiven.io)
2. Crear servicio MySQL:
   - **Plan:** Hobbyist (Free)
   - **Versión:** 8.0.35
   - **Región:** Germany (Frankfurt)
   - **Nombre:** hotel-mysql

### 2.2 Credenciales

```
╔════════════════════════════════════════════╗
║           CREDENCIALES AIVEN               ║
╠════════════════════════════════════════════╣
║ Host:     your-service.aivencloud.com║
║ Port:     23225                            ║
║ User:     avnadmin                         ║
║ Password: AVNS_... (del dashboard)         ║
║ Database: defaultdb → hotel_db             ║
║ SSL:      Required                         ║
╚════════════════════════════════════════════╝
```

### 2.3 Descargar CA Certificate

```
Dashboard → Overview → Download CA certificate
Guardar como: ca-certificate.pem
```

---

## 3. BACKUP Y LIMPIEZA

### 3.1 Problema: Privilegios SUPER

```
❌ ERROR 1227: Access denied; need SUPER privilege

Causas:
- DEFINER=`root`@`localhost` en triggers/procedures
- SET @@GLOBAL.GTID_PURGED
- SET @@SESSION.SQL_LOG_BIN
```

### 3.2 Limpieza del Backup

```bash
sed -e 's/DEFINER[ ]*=[ ]*[^ ]*\*/\*/' \
    -e 's/DEFINER[ ]*=[ ]*[^ ]*PROCEDURE/PROCEDURE/' \
    -e 's/DEFINER[ ]*=[ ]*[^ ]*FUNCTION/FUNCTION/' \
    -e '/@@GLOBAL.GTID_PURGED/d' \
    -e '/@@SESSION.SQL_LOG_BIN/d' \
    hotel_db_backup_20251029.sql > hotel_db_clean.sql
```

---

## 4. IMPORTACIÓN DE DATOS

### 4.1 Crear Base de Datos

```bash
/mysql/path/mysql.exe \
  --host=your-service.aivencloud.com \
  --port=23225 \
  --user=avnadmin \
  --password=TU_PASSWORD \
  --ssl-mode=REQUIRED \
  --database=defaultdb
```

```sql
CREATE DATABASE hotel_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

EXIT;
```

### 4.2 Importar Backup

```bash
/mysql/path/mysql.exe \
  --host=your-service.aivencloud.com \
  --port=23225 \
  --user=avnadmin \
  --password=TU_PASSWORD \
  --ssl-mode=REQUIRED \
  hotel_db < hotel_db_clean.sql
```

### 4.3 Verificar

```sql
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM parking_bookings;
SHOW TRIGGERS;
```

---

## 5. CONFIGURACIÓN DEL BACKEND

### 5.1 Scripts package.json

```json
{
  "scripts": {
    "dev:local": "cross-env DB_ENVIRONMENT=local node --watch index.js",
    "dev:aiven": "cross-env DB_ENVIRONMENT=aiven node --watch index.js"
  }
}
```

### 5.2 Configuración Dual BD

Ver `env_bars/database-configuration.md` para configuración completa.

---

## 6. PROBLEMA DE COLACIONES

### 6.1 Diagnóstico

```
❌ ERROR: Illegal mix of collations
utf8mb4_unicode_ci vs utf8mb4_0900_ai_ci
```

### 6.2 Solución

```sql
ALTER DATABASE hotel_db
  CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE departments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE logbook_comments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- ... (todas las tablas)

SET FOREIGN_KEY_CHECKS = 1;
```

### 6.3 Verificar

```sql
SELECT TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hotel_db'
ORDER BY TABLE_NAME;
```

---

## 7. SEGURIDAD Y GIT

### 7.1 .gitignore

```gitignore
.env
.env.local
*.sql
backup*.sql
*.key
*-key.pem
ca-certificate.pem
```

### 7.2 Verificación

```bash
git status | grep "\.env$"  # No debe mostrar nada
git show HEAD:config/db.js | grep -i "password"  # No debe mostrar passwords
```

---

## 8. TESTING Y VERIFICACIÓN

```bash
# Probar local
pnpm run dev:local

# Probar Aiven
pnpm run dev:aiven

# Verificar en ambos:
# ✅ Conexión MySQL exitosa
# ✅ Server running at http://localhost:4000
```

---

## ✅ CHECKLIST

- [ ] Backup local creado
- [ ] Servicio Aiven configurado
- [ ] Backup limpiado (sin DEFINER)
- [ ] Datos importados
- [ ] Colaciones armonizadas
- [ ] .env configurado
- [ ] .env.example actualizado
- [ ] Tests exitosos

---

**Versión:** 1.0  
**Última actualización:** Octubre 2025
