# Documentación de Multi-Hotel Architecture (Aiven)

Esta carpeta contiene toda la documentación necesaria para implementar la arquitectura multi-hotel en Four-Points.

**Importante**: Esta documentación está basada en la estructura de base de datos de **Aiven MySQL 8.0** con:
- Collation: `utf8mb4_0900_ai_ci`
- Tabla `users` con `id` tipo `CHAR(36)`
- Todas las tablas referencian a `users` mediante `CHAR(36)`

---

## Índice de Documentos

### 1. [Visión General](./01-OVERVIEW.md)
- Objetivos del proyecto
- Beneficios de la arquitectura
- Tablas que son/son multi-hotel
- Casos de uso
- Cambios en la arquitectura

### 2. [Arquitectura de Base de Datos](./02-DATABASE.md)
- Schema de la tabla `hoteles`
- Modificación de tabla `users`
- Añadir `hotel_id` a todas las tablas operativas
- Script de migración completo para Aiven
- Resumen de cambios por tabla

### 3. [Cambios en el Backend](./03-BACKEND.md)
- Arquitectura del flujo de requests
- Middleware de hotel (`hotel-middleware.ts`)
- HotelDB helper con filtro automático
- Ejemplos de repositories actualizados
- Cambios por módulo

### 4. [Cambios en el Frontend](./04-FRONTEND.md)
- Hotel Context y estado global
- API Client actualizado con `x-hotel-id`
- React Query con aislamiento por hotel
- Selector de hotel

### 5. [Estrategia de Migración](./05-MIGRATION-STRATEGY.md)
- Enfoque de migración gradual (6 fases)
- Scripts de migración y rollback
- Plan de contingencia
- Timeline estimado

### 6. [Roadmap de Implementación](./06-ROADMAP.md)
- Resumen del proyecto (duración, riesgos)
- Día a día con tareas específicas
- Criterios de éxito
- Checklist de deployment
- Métricas y recursos

### 7. [Operaciones](./OPERATIONS.md)
- Añadir nuevos hoteles
- Gestión de usuarios
- Monitoreo y troubleshooting
- Queries de verificación

### 8. [Cheatsheet](./CHEATSHEET.md)
- Referencia rápida
- Nombres de tablas (Aiven)
- Errores comunes
- Comandos SQL

---

## Inicio Rápido

### ¿Nuevo en el proyecto?
1. Leer **[01-OVERVIEW.md](./01-OVERVIEW.md)** para entender el contexto
2. Revisar **[06-ROADMAP.md](./06-ROADMAP.md)** para ver el plan general

### ¿Implementando cambios?
1. Consultar **[02-DATABASE.md](./02-DATABASE.md)** para la DB
2. Ver **[03-BACKEND.md](./03-BACKEND.md)** para backend
3. Ver **[04-FRONTEND.md](./04-FRONTEND.md)** para frontend

### ¿Ejecutando la migración?
1. Seguir **[05-MIGRATION-STRATEGY.md](./05-MIGRATION-STRATEGY.md)**
2. Usar checklist en **[06-ROADMAP.md](./06-ROADMAP.md)**

---

## Archivos de Referencia

### Scripts de Base de Datos (Aiven)
- `backend/db-mysql/aiven/99_multi_hotel_migration.sql` - Script de migración
- `backend/db-mysql/aiven/99_multi_hotel_rollback.sql` - Script de rollback

### Código Backend
- `backend/middlewares/hotel-middleware.ts` - Middleware principal
- `backend/config/db-hotel.ts` - Helper de queries
- `backend/models/hotel.ts` - Tipos TypeScript

### Código Frontend
- `frontend/stores/hotel-context.tsx` - Contexto de hotel
- `frontend/lib/api-client.ts` - API Client actualizado
- `frontend/lib/query-keys.ts` - Keys de React Query
- `frontend/components/hotel-selector.tsx` - Selector de hotel

---

## Nombres de Tablas (Aiven)

| Módulo | Tabla | hotel_id |
|--------|-------|----------|
| Core | `users` | SÍ |
| Logbook | `logbooks`, `logbook_comments`, `logbook_history` | SÍ |
| Parking | `parking_spots`, `parking_vehicles`, `parking_bookings`, `parking_availability` | SÍ |
| Groups | `hotel_groups`, `group_contacts`, `group_history` | SÍ |
| Cashier | `cashier_shifts`, `cashier_vouchers`, `cashier_history`, `cashier_daily` | SÍ |
| Maintenance | `maintenance_reports`, `maintenance_history` | SÍ |
| Messages | `conversations` | SÍ |
| Notifications | `notifications` | SÍ |
| Blacklist | `blacklist_entries` | SÍ |
| Backoffice | `bo_invoices`, `bo_suppliers`, `bo_assets`, `bo_invoice_history` | SÍ |

**Tablas globales (SIN hotel_id):** `roles`, `departments`, `payment_methods`, `parking_rates`, `bo_categories`, etc.

---

## Preguntas Frecuentes

### ¿Cuánto tiempo toma?
Aproximadamente **2 semanas** (10 días laborables) siguiendo el roadmap.

### ¿Podemos hacer rollback?
Sí. Hay scripts de rollback para cada fase. Tiempo estimado de rollback: < 1 hora.

### ¿Qué pasa con los datos existentes?
Todos los datos existentes se migrarán al hotel por defecto (Four Points, id=1).

### ¿Necesitamos parar la aplicación?
Solo durante la migración de base de datos (~5-10 minutos).

### ¿Soporta subdominios?
Sí, pero es opcional. Se puede implementar después de la migración base.

---

## Timeline

| Fase | Duración |
|------|----------|
| Fase 1: DB | 1 día |
| Fase 2: Backend Core | 1-2 días |
| Fase 3: Backend Modules | 3-4 días |
| Fase 4: Frontend Core | 1 día |
| Fase 5: Frontend Modules | 2-3 días |
| Fase 6: Testing | 1-2 días |

**Total: ~2 semanas**

---

## Links Relacionados

- [README principal del proyecto](../../README.md)
- [Documentación de la API](../API/)
- [Guía de contribución](../../CONTRIBUTING.md)
