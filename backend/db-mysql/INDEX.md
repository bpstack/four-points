# 📚 Índice General - Sistema Hotel DB

## 📁 Archivos del Proyecto

### Scripts de Instalación (Orden de ejecución)

| # | Archivo | Descripción | Obligatorio |
|---|---------|-------------|-------------|
| 1 | `01_create_database.sql` | Crea la base de datos con UTF-8 | ✅ SÍ |
| 2 | `02_core_tables.sql` | Crea tablas core (users, roles, departments) | ✅ SÍ |
| 3 | `03_logbook_tables.sql` | Crea sistema de bitácora | ✅ SÍ |
| 4 | `04_parking_tables.sql` | Crea tablas del sistema parking | ✅ SÍ |
| 5 | `05_parking_functions_procedures.sql` | Crea funciones y procedimientos | ✅ SÍ |
| 6 | `06_parking_triggers.sql` | Crea triggers automáticos | ✅ SÍ |
| 7 | `07_parking_initial_data.sql` | Inserta plazas, tarifas y disponibilidad | ✅ SÍ |
| 8 | `08_parking_sample_data.sql` | Inserta datos de ejemplo (vehículos, reservas) | ⚠️ OPCIONAL |

### Scripts Auxiliares

| Archivo | Descripción | Cuándo usar |
|---------|-------------|-------------|
| `MASTER_INSTALL.sql` | Ejecuta todos los scripts en orden | Instalación completa automática |
| `RESET_DATABASE.sql` | Elimina toda la base de datos | Empezar desde cero |
| `VERIFY_SYSTEM.sql` | Verifica que todo esté correcto | Después de la instalación |
| `README.md` | Documentación completa | Consulta y referencia |

---

## 🚀 Guías de Uso Rápido

### Instalación Nueva (Opción 1: Manual)

```bash
# Ejecutar en orden
mysql -u TU_USUARIO -p < 01_create_database.sql
mysql -u TU_USUARIO -p < 02_core_tables.sql
mysql -u TU_USUARIO -p < 03_logbook_tables.sql
mysql -u TU_USUARIO -p < 04_parking_tables.sql
mysql -u TU_USUARIO -p < 05_parking_functions_procedures.sql
mysql -u TU_USUARIO -p < 06_parking_triggers.sql
mysql -u TU_USUARIO -p < 07_parking_initial_data.sql

# Opcional: Datos de ejemplo
mysql -u TU_USUARIO -p < 08_parking_sample_data.sql

# Verificar
mysql -u TU_USUARIO -p < VERIFY_SYSTEM.sql
```

### Instalación Nueva (Opción 2: Automática)

```bash
# Un solo comando
mysql -u TU_USUARIO -p < MASTER_INSTALL.sql

# Verificar
mysql -u TU_USUARIO -p < VERIFY_SYSTEM.sql
```

### Reset y Reinstalación

```bash
# 1. Eliminar todo
mysql -u TU_USUARIO -p < RESET_DATABASE.sql

# 2. Reinstalar
mysql -u TU_USUARIO -p < MASTER_INSTALL.sql

# 3. Verificar
mysql -u TU_USUARIO -p < VERIFY_SYSTEM.sql
```

---

## 📊 Estructura de la Base de Datos

### Tablas Core
- `roles` - Roles de usuario
- `departments` - Departamentos
- `users` - Usuarios del sistema

### Tablas Logbook
- `logbooks` - Entradas de bitácora
- `logbook_comments` - Comentarios
- `logbook_reads` - Lecturas
- `logbook_history` - Historial de cambios

### Tablas Parking
- `parking_spots` - Plazas físicas (20 plazas: 10 en -2, 10 en -3)
- `parking_vehicles` - Vehículos registrados
- `parking_rates` - Tarifas (1-30 días)
- `parking_bookings` - Reservas (con booking_code automático)
- `parking_availability` - Disponibilidad diaria

### Funciones
- `check_availability(spot_id, date_from, date_to)` - Verifica disponibilidad
- `get_total_availability(date)` - Cuenta plazas libres

### Procedimientos
- `generate_availability()` - Genera disponibilidad 365 días
- `get_available_spots(date_from, date_to, level_code)` - Lista plazas disponibles
- `get_pending_checkins(date)` - Check-ins pendientes
- `sync_parking_availability()` - Sincroniza disponibilidad

### Triggers
- `trg_generate_booking_code` - Genera código PK-YYYYMMDD-####
- `trg_update_availability_on_booking` - Bloquea disponibilidad al reservar
- `trg_free_availability_on_status_change` - Libera al completar/cancelar
- `trg_validate_booking_insert` - Valida disponibilidad antes de insertar
- `trg_update_availability_on_date_change` - Actualiza al cambiar fechas

---

## ✅ Checklist de Instalación

### Antes de empezar
- [ ] MySQL/MariaDB instalado y funcionando
- [ ] Credenciales de acceso disponibles
- [ ] Todos los archivos .sql descargados
- [ ] Backup de datos existentes (si aplica)

### Durante la instalación
- [ ] Ejecutar scripts en orden correcto
- [ ] Verificar que no hay errores en cada paso
- [ ] Confirmar que las tablas se crean correctamente

### Después de la instalación
- [ ] Ejecutar `VERIFY_SYSTEM.sql`
- [ ] Verificar que todos los componentes están ✅
- [ ] Crear al menos un usuario en la tabla `users`
- [ ] Probar una reserva de ejemplo

---

## 🆘 Resolución de Problemas

### Error: "Access denied"
**Solución**: Verifica usuario y contraseña de MySQL

### Error: "Database already exists"
**Solución**: Ejecuta `RESET_DATABASE.sql` primero

### Error: "Foreign key constraint fails"
**Solución**: Los scripts están en orden incorrecto. Reinicia con `RESET_DATABASE.sql`

### Error: "Trigger already exists"
**Solución**: Ejecuta `RESET_DATABASE.sql` para limpiar triggers anteriores

### Disponibilidad desincronizada
**Solución**:
```sql
CALL sync_parking_availability();
```

---

## 📝 Notas Importantes

1. **Orden crítico**: Los scripts DEBEN ejecutarse en orden (01 → 07)
2. **UTF-8**: Todo usa `utf8mb4_unicode_ci`
3. **Triggers automáticos**: `booking_code` y disponibilidad se gestionan solos
4. **20 plazas**: 10 en planta -2, 10 en planta -3
5. **Tarifas**: 30 tarifas predefinidas (1-30 días)
6. **Disponibilidad**: Se genera automáticamente para 365 días

---

## 📞 Soporte

1. Lee el `README.md` completo
2. Ejecuta `VERIFY_SYSTEM.sql` para diagnóstico
3. Revisa logs de MySQL
4. Ejecuta `sync_parking_availability()` si hay inconsistencias

---

**Versión**: 1.0  
**Fecha**: 28 de octubre de 2025  
**Autor**: Sistema de Gestión Hotel  

---

## 🎯 Quick Commands

```sql
-- Ver plazas disponibles hoy
SELECT COUNT(*) FROM parking_availability 
WHERE date = CURDATE() AND is_available = TRUE;

-- Ver reservas activas
SELECT * FROM parking_bookings 
WHERE status IN ('reserved', 'checked_in');

-- Verificar sistema
SOURCE VERIFY_SYSTEM.sql;

-- Sincronizar disponibilidad
CALL sync_parking_availability();

-- Plazas disponibles para mañana (3 días)
CALL get_available_spots(CURDATE() + INTERVAL 1 DAY, CURDATE() + INTERVAL 4 DAY, NULL);
```
