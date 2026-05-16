# Estado de Ramas del Proyecto

Este documento describe el estado actual de las ramas principales del repositorio Four-Points.

---

## Rama `main`

**Propósito:** Rama de producción con código estable y probado.

**Situación actual:** Rama principal en producción. Contiene todos los features estables del sistema PMS (Property Management System).

### Commits recientes

| Commit | Descripción |
|--------|-------------|
| `49af111` | chore: remove tag.md (already integrated in layout.tsx) |
| `f2b9c46` | chore: add Google Analytics tracking tag |

### Características

- Código en producción
- Incluye: logbooks, parking, cashier, maintenance, groups, backoffice, conciliations
- Sistema de autenticación basado en cookies HttpOnly
- Frontend: Next.js 14 con App Router
- Backend: Express 5.1.0 con MySQL

---

## Rama `schedule`

**Propósito:** Rama de desarrollo para el sistema de scheduling (turnos de personal).

**Situación actual:** Rama completamente funcional y sincronizada con main. El merge de main en schedule se completó exitosamente, trayendo los cambios más recientes de analytics a la rama de scheduling.

### Estado de sincronización

- **Fusionada con main:** Sí (commit `e8ca733 merge: integrate main into schedule`)
- **Commits detrás de main:** 0 (totalmente sincronizada)
- **Commits propios de schedule:** Desarrollo del sistema de scheduling

### Commits recientes

| Commit | Descripción |
|--------|-------------|
| `023ba6e` | merge: synchronize schedule with latest main changes |
| `56fd917` | fix(i18n): correct translation errors and missing keys across modules |
| `56fd917` | fix(i18n): update scheduling page metadata to English |
| `13172f3` | feat(i18n): migrate scheduling module to use next-intl translations |
| `4f76bd4` | docs: add testing progress tracking to README |
| `3174589` | feat(scheduling): add schedule validation service, PDF export, and testing infrastructure |

### Características del sistema de scheduling

- Generador de turnos basado en fases
- Soporte multi-proveedor AI (Claude, Gemini, Groq, Ollama)
- Sistema de scoring inteligente para selección de empleados
- Validación de restricciones de scheduling
- Exportación a PDF
- Optimización AI configurable

---

## Rama `testing`

**Propósito:** Rama de desarrollo con infraestructura de testing integrada.

**Situación actual:** Rama ahead de main por 1 commit. Contiene toda la infraestructura de testing configurada con Vitest.

### Estado de sincronización

- **Commits ahead de main:** 1 (infraestructura de testing)
- **Commits detrás de main:** 2 (analytics tags de main no están en testing)
- **¿Necesita sync?** Sí, recomendable hacer merge de main → testing

### Commits recientes

| Commit | Descripción |
|--------|-------------|
| `f8a5638` | chore: setup testing infrastructure with Vitest |
| `acc1c37` | chore: add CLAUDE.md to gitignore |
| `68a4589` | feat: add demo activity logging to database with API endpoints |
| `5ae5263` | fix: desktop sidebar collapse broken by mobile fix |
| `852a123` | fix: mobile sidebar always shows expanded (icons + text) |
| `992f4e4` | feat(cashier): add PDF export per shift and multi-user shift management |
| `000780f` | feat: add collapsible sidebar and mobile search modal |
| `5156803` | feat: add global search across parking, maintenance, groups, and blacklist |

### Archivos新增 (testing infrastructure)

```
backend/tests/
├── helpers/
│   ├── auth-helpers.ts      # Helper de autenticación para tests
│   ├── db-helpers.ts        # Helper de base de datos
│   └── test-data.ts         # Datos de prueba
├── unit/
│   ├── middlewares/
│   │   ├── authenticateToken.test.ts
│   │   ├── demoRestriction.test.ts
│   │   └── roleCheck.test.ts
│   └── validations/
│       └── logbook-schemas.test.ts
├── setup.ts                 # Configuración global de tests
├── vitest.config.ts         # Configuración de Vitest
backend/.env.test            # Variables de entorno para testing
testing-docs/
├── README.md
├── strategy.md
├── roadmap.md
└── testing.md
```

### Características de testing

- Framework: Vitest
- Tests unitarios para middlewares de autenticación
- Helpers reutilizables para tests
- Integración con React Query hooks
- Configuración lista para CI/CD

---

## Rama `schedule-backup`

**Propósito:** Copia de seguridad del desarrollo original del sistema de scheduling.

**Situación actual:** Backup histórico. No está sincronizada con schedule ni main. Contiene el desarrollo original de scheduling antes de la fusión con main.

### ¿Por qué existe?

Esta rama fue creada para preservar el estado del código de scheduling antes de realizar el merge con main. Fue un punto de respaldo por seguridad antes de integrar los cambios de la rama main en la rama schedule.

### Estado de sincronización

- **Commits detrás de schedule:** 8 commits
- **Commits detrás de main:** Múltiples
- **¿Usar para desarrollo?** No, usar `schedule` en su lugar

### Commits del desarrollo original de scheduling

| Commit | Descripción |
|--------|-------------|
| `4f76bd4` | docs: add testing progress tracking to README |
| `923ff4f` | chore: add CLAUDE.md to gitignore |
| `3174589` | feat(scheduling): add schedule validation service, PDF export, and testing infrastructure |
| `37d3176` | feat: add AI help chat and Groq provider |
| `98549f5` | feat(scheduling): improve AI optimization with JSON matrix and enhanced rules |
| `c0f4c65` | feat(scheduling): add scoring system for intelligent employee selection |
| `b3d042c` | feat(scheduling): add multi-provider AI support (Claude, Gemini, Ollama) |
| `f2069be` | feat(scheduling): add AI optimization with Claude integration |
| `86ea812` | feat(scheduling): complete scheduling system with phase-based generator |

### Contenido histórico

- Sistema completo de scheduling (antes del merge con main)
- PWA support
- Sistema de pagos para parking
- Mejoras de seguridad
- Upload de avatares con Cloudinary

---

## Rama `hotel-id` (PROPUESTA - Por crear)

**Propósito:** Implementar arquitectura multi-hotel para convertir Four-Points de aplicación mono-hotel a plataforma multi-tenant.

**Situación actual:** **Documentada, pendiente de implementación.** La propuesta está completa en `frontend/docs/hotels/`.

### Descripción del proyecto

Convertir Four-Points de una aplicación mono-hotel a una plataforma capaz de servir múltiples hoteles independientes con:

- **Aislamiento total de datos** entre hoteles
- **Usuarios propios** por hotel (recepcionistas, admins)
- **Configuraciones independientes** por hotel (moneda, idioma, timezone)
- **Multi-tenancy** con soporte opcional para subdominios (hotel1.app.com)

### Documentación completa

Ver: `frontend/docs/hotels/`

| Documento | Contenido |
|-----------|-----------|
| [01-OVERVIEW.md](../../docs/hotels/01-OVERVIEW.md) | Visión general, beneficios, casos de uso |
| [02-DATABASE.md](../../docs/hotels/02-DATABASE.md) | Schema de tabla `hoteles`, scripts SQL |
| [03-BACKEND.md](../../docs/hotels/03-BACKEND.md) | Middleware hotel, HotelDB helper |
| [04-FRONTEND.md](../../docs/hotels/04-FRONTEND.md) | HotelContext, API Client, React Query |
| [05-MIGRATION-STRATEGY.md](../../docs/hotels/05-MIGRATION-STRATEGY.md) | Plan de migración gradual (6 fases) |
| [06-ROADMAP.md](../../docs/hotels/06-ROADMAP.md) | Día a día con tareas específicas |

### Arquitectura propuesta

```
Shared Database (Aiven MySQL)
│
├── tabla: hoteles              → Catálogo de hoteles
│
├── tabla: users                → + hotel_id (FK)
│
└── tablas operativas           → + hotel_id (FK)
    ├── logbooks, logbook_comments, logbook_history
    ├── parking_spots, parking_vehicles, parking_bookings
    ├── hotel_groups, group_contacts, group_history
    ├── cashier_shifts, cashier_vouchers, cashier_daily
    ├── maintenance_reports, maintenance_history
    ├── conversations, notifications
    ├── blacklist_entries
    └── bo_invoices, bo_suppliers, bo_assets
```

### Tablas globales (SIN hotel_id)

- `roles`, `departments`, `payment_methods`
- `parking_rates`, `bo_categories`
- `cashier_payments`, `cashier_denominations`
- `group_rooms`, `group_status`

### Componentes clave

#### Backend
- **Middleware `hotel-middleware.ts`**: Extrae `hotel_id` del usuario autenticado
- **Helper `HotelDB.withHotel()`**: Filtra automáticamente queries por `hotel_id`
- **Flujo de request**: Auth → Hotel Middleware → Controller → Repository → DB

#### Frontend
- **HotelContext**: Estado global del hotel activo
- **API Client**: Header `x-hotel-id` en todas las requests
- **React Query Keys**: Incluyen `hotelId` para cache isolation
- **Hotel Selector**: UI para cambiar entre hoteles (usuarios multi-hotel)

### Timeline estimado

| Fase | Duración | Descripción |
|------|----------|-------------|
| Fase 1 | 1 día | Base de datos (tabla hoteles, migraciones) |
| Fase 2 | 1-2 días | Backend Core (middleware, helpers) |
| Fase 3 | 3-4 días | Backend Modules (todos los módulos) |
| Fase 4 | 1 día | Frontend Core (HotelContext, API) |
| Fase 5 | 2-3 días | Frontend Modules (UI por módulo) |
| Fase 6 | 1-2 días | Testing y validación |

**Total: ~2 semanas (10 días laborables)**

### Principios de diseño

1. **Aislamiento Automático**: Ningún developer añade `WHERE hotel_id = ?` manualmente
2. **Compatibilidad hacia Atrás**: Migración gradual, código legacy funciona durante transición
3. **Consistencia**: `hotel_id` inmutable durante un request

### Para crear esta rama

```bash
# Crear desde main (código estable actual)
git checkout main
git checkout -b hotel-id

# O desde schedule si se quiere el sistema de scheduling incluido
git checkout schedule
git checkout -b hotel-id
```

### Notas

- **Reversible**: Scripts de rollback para cada fase
- **Downtime mínimo**: Solo 5-10 minutos durante migración de DB
- **Datos existentes**: Se migran al hotel por defecto (Four Points, id=1)

---

## Resumen de Ramas

| Rama | Propósito | Estado | Ahead | Behind |
|------|-----------|--------|-------|--------|
| `main` | Producción | ✅ Estable | - | - |
| `schedule` | Desarrollo scheduling | ✅ Sincronizada | 0 | 0 |
| `testing` | Testing infrastructure | ⚠️ Necesita sync | 1 | 2 |
| `schedule-backup` | Backup histórico | ❌ Desactualizada | - | 8+ |
| `hotel-id` | Multi-hotel architecture | 📋 Documentada | - | - |

---

## Estrategia de Flujo de Trabajo

### Rama main (producción)
```
main ──────────────────→ [tags de release]
```

### Rama schedule (desarrollo scheduling)
```
schedule ←── merge main ──→ [desarrollo scheduling] ──→ main (cuando esté estable)
```

### Rama testing (desarrollo con testing)
```
testing ←── merge main ──→ [features + tests] ──→ main (cuando esté estable)
```

### Rama hotel-id (multi-hotel architecture)
```
hotel-id ←── merge main ──→ [arquitectura multi-tenant]
                 │
                 ├── db-migration (tabla hoteles, hotel_id en tablas)
                 ├── backend-core (middleware, HotelDB helper)
                 ├── backend-modules (todos los módulos)
                 ├── frontend-core (HotelContext, API)
                 └── frontend-modules (UI selectors)
                                │
                                ▼
                       main (release multi-hotel)
```

---

## Comandos útiles

```bash
# Ver estado de ramas
git branch -a
git branch -vv

# Ver commits entre ramas
git log main..schedule --oneline
git log main..testing --oneline

# Sincronizar ramas
git checkout testing
git merge main
git push origin testing

# Ver diferencias
git diff main..schedule --stat
```

---

## Última actualización

14 de Enero de 2026
