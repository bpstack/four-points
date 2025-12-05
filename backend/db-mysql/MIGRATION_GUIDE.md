# 🚀 GUÍA DE MIGRACIÓN - HOTEL DB

Esta guía te permite reconstruir completamente la base de datos en cualquier momento.

## 📋 ORDEN DE EJECUCIÓN

Ejecuta los scripts **en este orden exacto**:

### 1. Base de datos
```bash
mysql -u dz -p < 01_create_database.sql
```

### 2. Tablas core (roles, users, departments)
```bash
mysql -u dz -p < 02_core_tables.sql
```

### 3. Sistema de logbook
```bash
mysql -u dz -p < 03_logbook_tables.sql
```

### 4. Tablas de parking
```bash
mysql -u dz -p < 04_parking_tables.sql
```

### 5. Funciones y Triggers
```bash
mysql -u dz -p < 05_parking_functions_triggers.sql
```

### 6. Procedimientos almacenados
```bash
mysql -u dz -p < 06_parking_procedures.sql
```

### 7. Datos iniciales
```bash
mysql -u dz -p < 07_parking_initial_data.sql
```

---

## ✅ VERIFICACIÓN POST-MIGRACIÓN

Después de ejecutar todos los scripts, verifica que todo esté correcto:

```sql
USE hotel_db;

-- Verificar tablas
SHOW TABLES;

-- Verificar plazas
SELECT COUNT(*) AS total_plazas FROM parking_spots;
-- Debe devolver: 20

-- Verificar tarifas
SELECT COUNT(*) AS total_tarifas FROM parking_rates;
-- Debe devolver: 30

-- Verificar disponibilidad
SELECT COUNT(*) AS total_disponibilidad FROM parking_availability;
-- Debe devolver: ~7300 (20 plazas × 365 días)

-- Verificar funciones
SELECT ROUTINE_NAME 
FROM information_schema.ROUTINES 
WHERE ROUTINE_SCHEMA = 'hotel_db' 
  AND ROUTINE_TYPE = 'FUNCTION';
-- Debe mostrar: check_availability, get_total_availability

-- Verificar procedimientos
SELECT ROUTINE_NAME 
FROM information_schema.ROUTINES 
WHERE ROUTINE_SCHEMA = 'hotel_db' 
  AND ROUTINE_TYPE = 'PROCEDURE';
-- Debe mostrar: generate_availability, get_available_spots, 
--                get_pending_checkins, sync_parking_availability, 
--                daily_parking_maintenance

-- Verificar triggers
SELECT TRIGGER_NAME 
FROM information_schema.TRIGGERS 
WHERE TRIGGER_SCHEMA = 'hotel_db';
-- Debe mostrar: 5 triggers (booking_code, availability updates, validation)
```

---

## 🔄 RESET COMPLETO

Si necesitas empezar desde cero (⚠️ CUIDADO: Borra TODO):

```bash
# 1. Hacer backup
mysqldump -u dz -p --no-tablespaces hotel_db > backup_$(date +%Y%m%d).sql

# 2. Ejecutar scripts en orden
mysql -u dz -p < 01_create_database.sql
mysql -u dz -p < 02_core_tables.sql
mysql -u dz -p < 03_logbook_tables.sql
mysql -u dz -p < 04_parking_tables.sql
mysql -u dz -p < 05_parking_functions_triggers.sql
mysql -u dz -p < 06_parking_procedures.sql
mysql -u dz -p < 07_parking_initial_data.sql
```

---

## 🛠️ MANTENIMIENTO

### Sincronización diaria automática

Añade a cron (Linux/Mac):
```bash
crontab -e

# Añade esta línea (ejecutar a las 3:00 AM diariamente)
0 3 * * * mysql -u dz -p'tu_password' hotel_db -e "CALL daily_parking_maintenance();"
```

O crea un evento en MySQL:
```sql
USE hotel_db;

SET GLOBAL event_scheduler = ON;

CREATE EVENT daily_maintenance
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 3 HOUR)
DO
  CALL daily_parking_maintenance();
```

### Sincronización manual

Si necesitas sincronizar manualmente:
```sql
CALL sync_parking_availability();
```

---

## 📦 ESTRUCTURA DE ARCHIVOS

```
/database
├── 01_create_database.sql       # Crea BD con UTF-8
├── 02_core_tables.sql           # Roles, departments, users
├── 03_logbook_tables.sql        # Sistema de bitácora
├── 04_parking_tables.sql        # Tablas de parking
├── 05_parking_functions_triggers.sql  # Lógica automática
├── 06_parking_procedures.sql    # Procedimientos almacenados
└── 07_parking_initial_data.sql  # Plazas, tarifas, disponibilidad
```

---

## 🎯 CARACTERÍSTICAS DEL SISTEMA

### Generación automática de booking_code
- Formato: `PK-YYYYMMDD-0001`
- Se genera automáticamente al insertar una reserva
- Único por día

### Control de disponibilidad
- Los triggers mantienen sincronizada la tabla `parking_availability`
- Al crear/actualizar reservas, se actualizan las fechas bloqueadas
- Al cancelar/completar, se liberan las fechas

### Integridad referencial flexible
- `spot_id`: RESTRICT (no se puede borrar plaza con reservas)
- `vehicle_id`, `operator_id`, `created_by`, `updated_by`: SET NULL (preserva historial)

---

## 🆘 TROUBLESHOOTING

### Error: "Foreign key constraint fails"
- Asegúrate de ejecutar los scripts en orden
- Verifica que la tabla `users` existe antes de crear `parking_bookings`

### Error: "Trigger already exists"
- Los scripts incluyen `DROP TRIGGER IF EXISTS`
- Si persiste, ejecuta manualmente: `DROP TRIGGER nombre_trigger;`

### Error: "Function does not exist"
- Verifica que ejecutaste `05_parking_functions_triggers.sql`
- Si falla, ejecuta manualmente cada función

### Disponibilidad no se actualiza
```sql
-- Sincronizar manualmente
CALL sync_parking_availability();

-- Verificar que los triggers están activos
SHOW TRIGGERS LIKE 'parking_bookings';
```

---

## 📞 NOTAS IMPORTANTES

1. **Backup**: Siempre haz backup antes de cualquier migración
2. **Orden**: Los scripts DEBEN ejecutarse en orden
3. **UTF-8**: Todos los scripts usan `utf8mb4_unicode_ci`
4. **Passwords**: Cambia las contraseñas por defecto
5. **Producción**: Revisa y ajusta las tarifas según tu negocio

---

**Última actualización**: 29 de Octubre 2025  
**Versión**: 1.0  
**Estado**: ✅ Producción
