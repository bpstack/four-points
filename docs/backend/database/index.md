# 📊 Database Index - Estructura Completa

**Rutas:** `backend/db-mysql/local/` y `backend/db-mysql/aiven/`

---

## 📁 Estructura de Archivos

```
db-mysql/
├── local/                    # Desarrollo (utf8mb4_unicode_ci)
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
│   ├── 16_backoffice.sql
│   ├── 17_notifications.sql
│   └── 99_verification.sql
│
├── aiven/                    # Producción (utf8mb4_0900_ai_ci)
│   ├── [mismos archivos]
│   └── aiven-conexion.md
│
├── backup/
│   ├── backup_hotel_db-local.sql
│   └── backup_hotel_db-aiven.sql
│
├── MASTER_INSTALL_LOCAL.sql
├── MASTER_INSTALL_AIVEN.sql
├── INDEX.md
├── README.md
└── MIGRATION_GUIDE.md
```

---

## 📦 Módulos del Sistema

### Core (01-03)

| # | Archivo | Descripción | Tablas |
|---|---------|-------------|--------|
| 01 | `01_create_database.sql` | Crea DB con UTF-8 | - |
| 02 | `02_core_tables.sql` | Usuarios y auth | `roles`, `departments`, `users` |
| 03 | `03_logbook_tables.sql` | Bitácora | `logbooks`, `logbook_comments`, `logbook_reads`, `logbook_history` |

### Parking (04-08)

| # | Archivo | Descripción | Componentes |
|---|---------|-------------|-------------|
| 04 | `04_parking_tables.sql` | Tablas parking | `parking_spots`, `parking_vehicles`, `parking_rates`, `parking_bookings`, `parking_availability` |
| 05 | `05_parking_functions_triggers.sql` | Funciones y triggers | `check_availability()`, `get_total_availability()`, triggers |
| 06 | `06_parking_procedures.sql` | Procedimientos | `generate_availability()`, `get_available_spots()`, etc. |
| 07 | `07_parking_initial_data.sql` | Datos iniciales | 20 plazas, 30 tarifas |
| 08 | `08_parking_sample_data.sql` | Datos de ejemplo | Opcional |

### Módulos Adicionales (09-17)

| # | Archivo | Descripción | Tablas |
|---|---------|-------------|--------|
| 09 | `09_conciliation.sql` | Conciliación bancaria | `conciliation_*` (4 tablas) |
| 10 | `10_group-tracking.sql` | Seguimiento de grupos | `hotel_groups`, `group_*` (6 tablas) |
| 11 | `11_cashier.sql` | Sistema de caja | `payment_methods`, `cashier_*` (9 tablas) |
| 12 | `12_blacklist.sql` | Lista negra | `blacklist_entries` |
| 13 | `13_maintenance.sql` | Mantenimiento | `maintenance_*` (3 tablas) |
| 14 | `14_messages.sql` | Mensajería | `conversations`, `conversation_participants`, `messages` |
| 15 | `15_demo_user.sql` | Usuario demo | Rol `demo-admin` (id=7) |
| 16 | `16_backoffice.sql` | Backoffice | `bo_categories`, `bo_suppliers`, `bo_invoices`, etc. |
| 17 | `17_notifications.sql` | Notificaciones | `notifications`, `notification_recipients` |

### Verificación (99)

| # | Archivo | Descripción |
|---|---------|-------------|
| 99 | `99_verification.sql` | Verifica instalación completa |

---

## 📈 Resumen de Tablas

**Total: 45 tablas + 3 vistas**

| Categoría | Tablas |
|-----------|--------|
| Core | 3 |
| Logbook | 4 |
| Parking | 5 + funciones + triggers + procedimientos |
| Conciliation | 4 |
| Groups | 6 |
| Cashier | 9 |
| Blacklist | 1 |
| Maintenance | 3 |
| Messages | 3 |
| Notifications | 2 |
| Backoffice | 5 + 3 vistas |

---

## 👥 Roles del Sistema

| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | recepcionista | Usuario estándar (default) |
| 2 | admin | Administrador completo |
| 3 | mantenimiento | Personal de mantenimiento |
| 6 | group-admin | Administrador de grupos |
| 7 | demo-admin | Usuario demo (permisos limitados) |

---

## ⚙️ Diferencias entre Entornos

| Aspecto | Local | Aiven |
|---------|-------|-------|
| Collation | `utf8mb4_unicode_ci` | `utf8mb4_0900_ai_ci` |
| SSL | No requerido | Requerido |

---

**Versión:** 2.2  
**Fecha:** Diciembre 2025
