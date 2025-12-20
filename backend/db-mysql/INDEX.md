# Índice General - Sistema Hotel DB

## Estructura de Carpetas

```
db-mysql/
├── local/                    # Scripts para desarrollo local (utf8mb4_unicode_ci)
│   ├── 01_create_database.sql
│   ├── 02_core_tables.sql
│   ├── 03_logbook_tables.sql
│   ├── 04_parking_tables.sql
│   ├── 05_parking_functions_triggers.sql
│   ├── 06_parking_procedures.sql
│   ├── 07_parking_initial_data.sql
│   ├── 08_parking_sample_data.sql
│   ├── 09_conciliation.sql
│   ├── 10_group-tracking.sql
│   ├── 11_cashier.sql
│   ├── 12_blacklist.sql
│   ├── 13_maintenance.sql
│   ├── 14_messages.sql
│   ├── 15_demo_user.sql
│   ├── 17_notifications.sql
│   └── 99_verification.sql
│
├── aiven/                    # Scripts para Aiven/Prod (utf8mb4_0900_ai_ci)
│   ├── 01_create_database.sql
│   ├── 02_core_tables.sql
│   ├── 03_logbook_tables.sql
│   ├── 04_parking_tables.sql
│   ├── 05_parking_functions_triggers.sql
│   ├── 06_parking_procedures.sql
│   ├── 07_parking_initial_data.sql
│   ├── 08_parking_sample_data.sql
│   ├── 09_conciliation.sql
│   ├── 10_group-tracking.sql
│   ├── 11_cashier.sql
│   ├── 12_blacklist.sql
│   ├── 13_maintenance.sql
│   ├── 14_messages.sql
│   ├── 15_demo_user.sql
│   ├── 17_notifications.sql
│   ├── 99_verification.sql
│   ├── aiven-conexion.md
│   └── ca-certificate.pem
│
├── backup/
│   ├── backup_hotel_db-local.sql
│   └── backup_hotel_db-aiven.sql
│
├── MASTER_INSTALL_LOCAL.sql  # Instalación completa local
├── MASTER_INSTALL_AIVEN.sql  # Instalación completa Aiven
├── MASTER_INSTALL.sql        # (legacy)
├── INDEX.md
├── README.md
└── MIGRATION_GUIDE.md
```

---

## Módulos del Sistema

### Core (01-03) - Ambos entornos

| # | Archivo | Descripción | Tablas |
|---|---------|-------------|--------|
| 01 | `01_create_database.sql` | Crea DB con UTF-8 | - |
| 02 | `02_core_tables.sql` | Sistema de usuarios | `roles`, `departments`, `users` |
| 03 | `03_logbook_tables.sql` | Bitácora | `logbooks`, `logbook_comments`, `logbook_reads`, `logbook_history` |

### Parking (04-08) - Ambos entornos

| # | Archivo | Descripción | Componentes |
|---|---------|-------------|-------------|
| 04 | `04_parking_tables.sql` | Tablas parking | `parking_spots`, `parking_vehicles`, `parking_rates`, `parking_bookings`, `parking_availability` |
| 05 | `05_parking_functions_triggers.sql` | Funciones y triggers | `check_availability()`, `get_total_availability()`, triggers automáticos |
| 06 | `06_parking_procedures.sql` | Procedimientos | `generate_availability()`, `get_available_spots()`, etc. |
| 07 | `07_parking_initial_data.sql` | Datos iniciales | 20 plazas, 30 tarifas |
| 08 | `08_parking_sample_data.sql` | Datos de ejemplo | Opcional |

### Módulos Adicionales (09-17) - Ambos entornos

| # | Archivo | Descripción | Tablas |
|---|---------|-------------|--------|
| 09 | `09_conciliation.sql` | Conciliación bancaria | `conciliation_*` (4 tablas) |
| 10 | `10_group-tracking.sql` | Seguimiento de grupos | `hotel_groups`, `group_*` (6 tablas) |
| 11 | `11_cashier.sql` | Sistema de caja | `payment_methods`, `cashier_*` (9 tablas) |
| 12 | `12_blacklist.sql` | Lista negra | `blacklist_entries` |
| 13 | `13_maintenance.sql` | Mantenimiento | `maintenance_*` (3 tablas) |
| 14 | `14_messages.sql` | Mensajería | `conversations`, `conversation_participants`, `messages` |
| 15 | `15_demo_user.sql` | Usuario demo | Rol `demo-admin` (id=7) + usuario `demo` |
| 17 | `17_notifications.sql` | Notificaciones | `notifications`, `notification_recipients` |

### Verificación (99)

| # | Archivo | Descripción |
|---|---------|-------------|
| 99 | `99_verification.sql` | Verifica instalación completa |

---

## Instalación

### Local (Desarrollo)

```bash
# Opción 1: Master install
mysql -u root -p < MASTER_INSTALL_LOCAL.sql

# Opción 2: Manual, script por script
cd local/
mysql -u root -p < 01_create_database.sql
mysql -u root -p < 02_core_tables.sql
# ... etc
```

### Aiven (Producción)

```bash
# Ver aiven/aiven-conexion.md para detalles de conexión
mysql -h HOST -P PORT -u USER -p --ssl-ca=aiven/ca-certificate.pem < MASTER_INSTALL_AIVEN.sql
```

---

## Diferencias entre Entornos

| Aspecto | Local | Aiven |
|---------|-------|-------|
| Collation | `utf8mb4_unicode_ci` | `utf8mb4_0900_ai_ci` |
| SSL | No requerido | Requerido (ca-certificate.pem) |

---

## Roles del Sistema

| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | recepcionista | Usuario estándar (default) |
| 2 | admin | Administrador completo |
| 3 | mantenimiento | Personal de mantenimiento |
| 6 | group-admin | Administrador de grupos |
| 7 | demo-admin | Usuario demo (permisos limitados) |

---

## Resumen de Tablas

### Total: 45 tablas + 3 vistas

- **Core**: 3 tablas (roles, departments, users)
- **Logbook**: 4 tablas
- **Parking**: 5 tablas + funciones + triggers + procedimientos
- **Conciliation**: 4 tablas
- **Groups**: 6 tablas
- **Cashier**: 9 tablas
- **Blacklist**: 1 tabla
- **Maintenance**: 3 tablas
- **Messages**: 3 tablas
- **Notifications**: 2 tablas
- **Backoffice**: 5 tablas + 3 vistas

---

**Versión**: 2.1  
**Fecha**: Diciembre 2025
