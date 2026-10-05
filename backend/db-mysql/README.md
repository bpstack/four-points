# 🏨 Hotel DB - Sistema de Gestión

Base de datos completa para gestión hotelera con múltiples módulos: parking, logbook, scheduling, messaging, etc.

> ⚠️ **Política de migraciones (desde 2026-05-20):** sólo incrementales. Archivos `aiven/NN_*.sql` **congelados** como snapshot del install base. Todo cambio nuevo va a `scripts/AAAAMMDD_*.sql`. Ver [`MIGRATIONS_POLICY.md`](./MIGRATIONS_POLICY.md).

## 📁 Estructura de Archivos

```
db-mysql/
├── aiven/                          # ⚠️ FROZEN snapshot (no editar — ver scripts/)
│   ├── 01_create_database.sql      # Crea BD con UTF-8
│   ├── 02_core_tables.sql          # Usuarios, roles, departamentos
│   ├── 03_logbook_tables.sql       # Sistema de bitácora
│   ├── 04_parking_tables.sql       # Tablas de parking
│   ├── 05_parking_functions_triggers.sql
│   ├── 06_parking_procedures.sql
│   ├── 07_parking_initial_data.sql
│   ├── 08_parking_sample_data.sql
│   ├── 09_conciliation.sql         # Conciliación bancaria
│   ├── 10_group-tracking.sql      # Seguimiento de grupos
│   ├── 11_cashier.sql             # Sistema de caja
│   ├── 12_blacklist.sql           # Lista negra
│   ├── 13_maintenance.sql         # Mantenimiento
│   ├── 14_messages.sql            # Mensajería
│   ├── 15_demo_user.sql           # Usuario demo
│   ├── 16_backoffice.sql          # Backoffice
│   ├── 17_notifications.sql       # Notificaciones
│   ├── 18_user_avatar.sql         # Avatares
│   ├── 19_scheduling.sql          # Programación de turnos
│   ├── 20_checklist.sql           # Checklists operativos
│   └── 99_verification.sql        # Verificación
├── scripts/                        # Incrementales — única fuente de verdad post-2026-05-20
│   ├── AAAAMMDD_*.sql              # Idempotentes, registrados en INDEX.md
│   └── apply-migration.sh          # Aplica una migración a local o Aiven (credenciales de backend/.env)
├── MASTER_INSTALL.sql              # Snapshot 2026-05-20 (base congelada)
├── INDEX.md                        # Índice general + tabla de incrementales
├── MIGRATIONS_POLICY.md            # Política vigente
└── README.md                       # Este archivo
```

## 🚀 Inicio Rápido

### Instalación completa

```bash
# Desde backend/: tablas, migraciones, admin local y datos ficticios
pnpm setup:local
```

No ejecutes `MASTER_INSTALL.sql` a mano: borra `hotel_db`, no aplica las
migraciones de `scripts/` y tiene dos fallos del baseline que solo
`setup:local` corrige (ADR-039).

### Verificación

```bash
mysql -u root -p < aiven/99_verification.sql
```

---

## 📊 Módulos del Sistema

### Core (01-03)

- **Usuarios**: Roles, departamentos, usuarios
- **Logbook**: Bitácora con comentarios e historial de lecturas

### Parking (04-08)

- **Gestión automática de disponibilidad** (triggers)
- **Códigos de reserva únicos**: `PK-YYYYMMDD-0001`
- **Control de solapamientos** (validación por trigger)
- **Auditoría completa**: created_by, updated_by

### Scheduling (19)

- **Programación mensual de turnos**
- **Estados**: `draft` (editable) / `published` (bloqueado)
- **Constraints**: Validación de reglas de negocio
- **Bloqueo de celdas**: Assignments con source_constraint_id

### Otros módulos

- **Conciliation**: Conciliación bancaria
- **Group Tracking**: Seguimiento de grupos hoteleros
- **Cashier**: Sistema de caja
- **Maintenance**: Gestión de mantenimiento
- **Messages**: Mensajería interna
- **Notifications**: Sistema de notificaciones
- **Backoffice**: Facturación y proveedores

---

## 🛡️ Seguridad

### Integridad referencial

- **spot_id**: `ON DELETE RESTRICT` - No se puede borrar plaza con reservas activas
- **vehicle_id**: `ON DELETE SET NULL` - Preserva reserva si se borra vehículo
- **operator_id, created_by, updated_by**: `ON DELETE SET NULL` - Preserva historial

### Validaciones automáticas (Parking)

✅ No permite reservas en fechas ocupadas  
✅ Genera booking_code único automáticamente  
✅ Actualiza disponibilidad al crear/modificar reservas  
✅ Libera disponibilidad al cancelar/completar

---

## 📈 Estadísticas (Parking)

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

---

## 🆘 Troubleshooting

Una instalación que falla: vuelve a lanzar `pnpm setup:local -- --force` (ver «Instalación completa»).

---

## 📝 Notas

- **Codificación**: UTF-8 (`utf8mb4_0900_ai_ci`)
- **Motor**: InnoDB (transaccional)
- **MySQL**: Requiere 8.0+ (para utf8mb4_0900_ai_ci)

---

## 🔗 Enlaces Útiles

- [Política de migraciones](MIGRATIONS_POLICY.md)
- [Índice de Tablas](INDEX.md)
- [Script de Verificación](aiven/99_verification.sql)

---

**Versión**: 2.0  
**Última actualización**: Febrero 2026  
**Estado**: ✅ Producción
