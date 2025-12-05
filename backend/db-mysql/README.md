# 🏨 Hotel DB - Sistema de Gestión

Base de datos completa para gestión hotelera con sistema de parking integrado.

## 📁 Estructura de Archivos

```
database/
├── 01_create_database.sql              # Crea BD con UTF-8
├── 02_core_tables.sql                  # Usuarios, roles, departamentos
├── 03_logbook_tables.sql               # Sistema de bitácora
├── 04_parking_tables.sql               # Tablas de parking
├── 05_parking_functions_triggers.sql   # Funciones y triggers
├── 06_parking_procedures.sql           # Procedimientos almacenados
├── 07_parking_initial_data.sql         # Datos iniciales (plazas + tarifas)
├── 99_verification.sql                 # Script de verificación
├── MIGRATION_GUIDE.md                  # Guía de migración completa
└── README.md                           # Este archivo
```

## 🚀 Inicio Rápido

### Instalación completa

```bash
# 1. Ejecutar scripts en orden
mysql -u dz -p < 01_create_database.sql
mysql -u dz -p < 02_core_tables.sql
mysql -u dz -p < 03_logbook_tables.sql
mysql -u dz -p < 04_parking_tables.sql
mysql -u dz -p < 05_parking_functions_triggers.sql
mysql -u dz -p < 06_parking_procedures.sql
mysql -u dz -p < 07_parking_initial_data.sql

# 2. Verificar instalación
mysql -u dz -p < 99_verification.sql
```

### Instalación con un solo comando

```bash
cat 01_*.sql 02_*.sql 03_*.sql 04_*.sql 05_*.sql 06_*.sql 07_*.sql | mysql -u dz -p
```

## 📊 Sistema de Parking

### Características principales

✅ **Gestión automática de disponibilidad**
- Los triggers mantienen sincronizada la disponibilidad
- Bloqueo/liberación automático de fechas

✅ **Códigos de reserva únicos**
- Formato: `PK-YYYYMMDD-0001`
- Generación automática vía trigger

✅ **Control de solapamientos**
- Validación antes de insertar reservas
- Imposible hacer doble reserva

✅ **Auditoría completa**
- `created_by`, `updated_by` en cada reserva
- Historial de cambios

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `parking_spots` | 20 plazas (10 en planta -2, 10 en planta -3) |
| `parking_vehicles` | Vehículos registrados |
| `parking_rates` | Tarifas por día (1-30 días) |
| `parking_bookings` | Reservas con booking_code |
| `parking_availability` | Disponibilidad diaria (365 días) |

### Funciones disponibles

```sql
-- Verificar si una plaza está disponible
SELECT check_availability(spot_id, fecha_desde, fecha_hasta);

-- Obtener total de plazas disponibles en una fecha
SELECT get_total_availability('2025-11-01');
```

### Procedimientos disponibles

```sql
-- Generar disponibilidad para 365 días
CALL generate_availability();

-- Obtener plazas disponibles en un rango
CALL get_available_spots('2025-11-01', '2025-11-05', '-2');

-- Ver check-ins pendientes para hoy
CALL get_pending_checkins(CURDATE());

-- Sincronizar disponibilidad manualmente
CALL sync_parking_availability();

-- Mantenimiento diario (marcar no_show + sincronizar)
CALL daily_parking_maintenance();
```

## 📋 Uso Básico

### Crear una reserva

```sql
INSERT INTO parking_bookings (
    spot_id,
    vehicle_id,
    operator_id,
    expected_checkin,
    expected_checkout,
    status,
    total_amount,
    created_by
) VALUES (
    1,  -- Plaza 1
    1,  -- Vehículo 1
    (SELECT id FROM users LIMIT 1),
    '2025-11-01 14:00:00',
    '2025-11-05 10:00:00',
    'reserved',
    51.00,
    (SELECT id FROM users LIMIT 1)
);
```

### Ver plazas disponibles

```sql
CALL get_available_spots('2025-11-01', '2025-11-05', NULL);
```

### Hacer check-in

```sql
UPDATE parking_bookings
SET status = 'checked_in',
    actual_checkin = NOW()
WHERE id = 1;
```

### Hacer check-out

```sql
UPDATE parking_bookings
SET status = 'completed',
    actual_checkout = NOW()
WHERE id = 1;
```

## 🔄 Mantenimiento

### Sincronización diaria automática

**Opción 1: Evento MySQL**
```sql
SET GLOBAL event_scheduler = ON;

CREATE EVENT daily_maintenance
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 3 HOUR)
DO
  CALL daily_parking_maintenance();
```

**Opción 2: Cron (Linux/Mac)**
```bash
# Ejecutar a las 3:00 AM diariamente
0 3 * * * mysql -u dz -p'password' hotel_db -e "CALL daily_parking_maintenance();"
```

### Verificación de integridad

```bash
mysql -u dz -p < 99_verification.sql
```

## 🛡️ Seguridad

### Integridad referencial

- **spot_id**: `ON DELETE RESTRICT` - No se puede borrar plaza con reservas activas
- **vehicle_id**: `ON DELETE SET NULL` - Preserva reserva si se borra vehículo
- **operator_id, created_by, updated_by**: `ON DELETE SET NULL` - Preserva historial

### Validaciones automáticas

✅ No permite reservas en fechas ocupadas (trigger)  
✅ Genera booking_code único automáticamente (trigger)  
✅ Actualiza disponibilidad al crear/modificar reservas (trigger)  
✅ Libera disponibilidad al cancelar/completar (trigger)  

## 📈 Estadísticas

### Ocupación actual

```sql
SELECT 
    COUNT(CASE WHEN is_available = TRUE THEN 1 END) AS disponibles,
    COUNT(CASE WHEN is_available = FALSE THEN 1 END) AS ocupadas,
    CONCAT(ROUND(COUNT(CASE WHEN is_available = FALSE THEN 1 END) * 100.0 / COUNT(*), 2), '%') AS ocupacion
FROM parking_availability
WHERE date = CURDATE();
```

### Ingresos del mes

```sql
SELECT 
    SUM(total_amount) AS ingresos_totales,
    COUNT(*) AS total_reservas,
    AVG(total_amount) AS precio_promedio
FROM parking_bookings
WHERE status = 'completed'
  AND MONTH(created_at) = MONTH(CURDATE())
  AND YEAR(created_at) = YEAR(CURDATE());
```

## 🆘 Troubleshooting

Ver [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) para solución de problemas comunes.

## 📝 Notas

- **Codificación**: UTF-8 (`utf8mb4_unicode_ci`)
- **Motor**: InnoDB (transaccional)
- **Plazas**: 20 (10 en planta -2, 10 en planta -3)
- **Disponibilidad**: 365 días desde la fecha actual
- **Tarifas**: Configurables (1-30 días)

## 🔗 Enlaces Útiles

- [Guía de Migración](MIGRATION_GUIDE.md)
- [Script de Verificación](99_verification.sql)

## 📞 Soporte

Para dudas o problemas, consulta la [Guía de Migración](MIGRATION_GUIDE.md) sección "Troubleshooting".

---

**Versión**: 1.0  
**Última actualización**: 29 de Octubre 2025  
**Estado**: ✅ Producción
