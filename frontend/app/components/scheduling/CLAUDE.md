# CLAUDE.md — Scheduling (frontend)

> Contexto específico de la UI del módulo de scheduling. La lógica de negocio (validator, constraints, solver) vive en el backend — leer `backend/services/scheduling/CLAUDE.md` cuando la tarea cruce la frontera, y `backend/scheduling-solver/CLAUDE.md` cuando toque el solver Python.

## Estructura

```
frontend/app/dashboard/scheduling/
   ├── layout.tsx              (auth gate: solo admin / group-admin entran; redirige a /dashboard)
   ├── page.tsx                (entry point — wrappea SchedulingClient en Suspense con skeleton)
   └── config/
       └── page.tsx            (entry point para SchedulingConfigClient)

frontend/app/components/scheduling/
   ├── SchedulingClient.tsx    (877 líneas — main orchestrator del grid + acciones del mes)
   ├── ScheduleGrid.tsx        (535 líneas — tabla interactiva mensual; cell locking visual; sticky columns)
   ├── ShiftSelector.tsx       (popover de selección de turno tras click en celda; modo bulk para selección múltiple)
   ├── ValidationWarnings.tsx  (banner de errors/warnings/info real-time; agrupa por severidad)
   ├── MonthSelector.tsx       (navegación entre meses)
   ├── MonthInfoPanel.tsx      (lateral: approved constraints + employee rules del mes)
   ├── ScheduleStats.tsx       (estadísticas del mes: cobertura, libres, noches, etc.)
   ├── ShiftLegend.tsx         (leyenda inline de códigos de turno)
   ├── EmployeeTotals.tsx      (681 líneas — totales anuales por empleado; usado en tab Totales)
   ├── ManageHolidaysModal.tsx (modal de gestión de festivos del año)
   ├── SchedulingConfigClient.tsx  (134 líneas — tabs container del panel /config)
   └── config/
       ├── EmployeesTab.tsx     (lista de empleados del scheduling + fechas activas)
       ├── TotalsTab.tsx        (wrapper de EmployeeTotals con vista anual)
       ├── GeneralConfigTab.tsx (687 líneas — sliders/inputs de scheduling_config)
       ├── RulesTab.tsx         (608 líneas — reglas por empleado: fixedShift, fixedDays, noWeekends, shiftPriority)
       ├── RequestsTab.tsx      (704 líneas — gestión peticiones: pending → approved/rejected)
       ├── ShiftStatsTab.tsx    (stats por turno del año)
       ├── PresenciasTab.tsx    (gestión específica de empleados P con fixedDays)
       └── utils/

frontend/app/lib/scheduling/
   ├── queries.ts              (645 líneas — schedulingApi: todas las llamadas; schedulingKeys: React Query keys factory)
   ├── types.ts                (553 líneas — todos los DTOs frontend; comparten shape con backend)
   ├── server.ts               (utilidades para Server Components — fetch directo a backend)
   ├── shift-styles.ts         (clases Tailwind por shift code; soporta light + dark mode)
   ├── export-pdf.ts           (271 líneas — generación PDF del mes con jsPDF + autotable)
   └── index.ts                (barrel exports)
```

## Auth gate

`app/dashboard/scheduling/layout.tsx` es **client component** que envuelve toda la subruta `/dashboard/scheduling`. Hace `useAuth()`, valida `isAdminRole(user.role)`, y redirige a `/dashboard` si no. Muestra un spinner mientras `loading=true`. **Recepcionistas y mantenimiento no entran al módulo.**

`useAuth()` viene del `AuthContext` global (montado en `DashboardLayout`). No re-fetcha; lee del contexto.

## Componente principal — `SchedulingClient.tsx`

877 líneas, marcado `'use client'`. Es el orquestador del grid mensual.

**Responsabilidades:**
- Lee `?month=<id>` de query string (URL es la fuente de verdad del mes activo).
- React Query: `schedulingApi.getMonthFull(monthId)`, `getAllShifts`, `validateSchedule(monthId)`, `getHistory`, `getMonthInfo`, etc.
- Gestiona estado local de selección (single cell + bulk selection con `BulkSelection`).
- Mutations: update assignment, bulk update, generate (solver), reset, publish/unpublish, delete month, manage holidays.
- Maneja modales: `ManageHolidaysModal`, `ConfirmDialog` para acciones destructivas.
- Triggerea PDF download (`downloadSchedulePdf` desde `lib/scheduling`).
- Toast notifications con `react-hot-toast` para mutations.

**Cómo funciona la edición:**
1. Click en celda → `onCellClick` setea `selectedCell` o `bulkSelection`.
2. `ShiftSelector` (popover) aparece con los shifts disponibles.
3. Usuario elige shift → mutation a `updateAssignment` o `bulkUpdateAssignments`.
4. Backend responde 409 si la celda está locked → toast de error.
5. Tras éxito, invalida `schedulingKeys.month(id)` → grid se refresca.
6. La validación corre en paralelo: `schedulingKeys.monthValidation(id)` se invalida al mismo tiempo y el banner se actualiza.

**Generación con solver:**
- Botón "Generar horario" → llama a `POST /months/:id/generate`.
- Mientras genera, muestra estado de loading. El timeout efectivo es el del backend (60 s desde Node, 30 s desde Python).
- Si la respuesta es `infeasible`, muestra los `conflictingConstraints` y `suggestedRelaxations` en el banner de warnings (estructurado).
- Si `ok`, invalida el mes → grid se llena de golpe.

## Grid — `ScheduleGrid.tsx`

Tabla mensual de empleados × días. Patrones críticos:

- **Locked cells:** assignments con `source_constraint_id != null` muestran un `<FiLock />` y no son clickables; toast de error si se intenta editar.
- **Sticky columns:** empleado + libres totales son `position: sticky; left: 0`. Permite scroll horizontal sin perder contexto.
- **Overflow horizontal:** wrapper con `overflow-x-auto` + tabla con `min-w-[Xpx]` proporcional al número de días. **Patrón internalizado del módulo de parking** — si añades una nueva tabla wide en el módulo, replica esto.
- **Shift colors:** vienen de `lib/scheduling/shift-styles.ts` — getter `getShiftClasses(code)`. **Soporta light + dark mode con Tailwind** (`dark:bg-{color}-900/30 dark:border-{color}-700 dark:text-{color}-400`).
- **Bulk selection:** click + shift permite seleccionar rango por empleado. `BulkSelection` lleva las `cells` afectadas + `position` del popover para que `ShiftSelector` aparezca donde tocó.
- **Tooltips de festivos:** los días marcados `isHoliday` muestran tooltip con el nombre del festivo.

## Config panel — `SchedulingConfigClient.tsx`

Contenedor de 7 tabs, navegación por `?tab=<tabName>` en query string. Los tabs son client components independientes que cargan sus propios datos:

| Tab | Archivo | Propósito |
|---|---|---|
| `employees` | `EmployeesTab.tsx` | Lista de empleados schedulable + checkbox add/remove + start_date/end_date |
| `totals` | `TotalsTab.tsx` (wrappea `EmployeeTotals.tsx`) | Vista anual de totales (M/T/N/L/V/B/etc.) por empleado |
| `general` | `GeneralConfigTab.tsx` | Editor de `scheduling_config`: min/max staff, rest hours, libre ranges, night block, etc. |
| `rules` | `RulesTab.tsx` | Reglas por empleado: fixedShift, fixedDays, noWeekends, shiftPriority |
| `requests` | `RequestsTab.tsx` | Gestión peticiones (vacaciones/IT/bonificables): approve / reject / edit |
| `shift-stats` | `ShiftStatsTab.tsx` | Estadísticas por turno y año |
| `presencias` | `PresenciasTab.tsx` | Editor específico para empleados con `fixedShift='P'` y `fixedDays` |

`'react-day-picker/style.css'` se importa en `SchedulingConfigClient.tsx` (compartido por varios tabs que usan DayPicker para fechas).

## React Query — `lib/scheduling/queries.ts`

**Keys factory `schedulingKeys`**: convención típica de React Query con hierarchical keys. Patrón clave:

```ts
schedulingKeys.month(id)              // ['scheduling', 'months', id]
schedulingKeys.monthInfo(id)          // ['scheduling', 'months', id, 'info']
schedulingKeys.monthValidation(id)    // ['scheduling', 'months', id, 'validation']
```

Al invalidar `schedulingKeys.month(id)`, **todo lo descendiente** se invalida también (info, validation). Aprovéchalo: en una mutation de assignment basta invalidar el padre.

**`schedulingApi`**: objeto con métodos por recurso. Usa `apiClient` (wrapper de fetch con auth/credentials). Todas las llamadas devuelven el tipo TS correspondiente desde `types.ts`.

Hay un wrapper específico `downloadSchedulePdf(monthId)` que llama a `lib/scheduling/export-pdf.ts` para generar el PDF en el cliente (no hay endpoint backend de PDF).

## Server fetching — `lib/scheduling/server.ts`

Helpers para Server Components o Server Actions que necesiten datos del scheduling. Usa `serverFetch` (no `apiClient`) para incluir cookies del request correctamente. **No usar desde client components.**

En la práctica, el módulo es casi enteramente client-side (Suspense + React Query) — `server.ts` es para casos puntuales tipo SSR de la página inicial o exports server-side.

## PDF export — `lib/scheduling/export-pdf.ts`

271 líneas. Genera el horario del mes en PDF usando `jspdf` + `jspdf-autotable`. Se ejecuta **en el cliente** (no hay endpoint backend). Recibe `SchedulingMonthFull` + `shifts` y produce el blob para descarga.

Si cambias códigos de turno o colores, **también actualiza este archivo** — duplica los mapas de colores localmente para no depender del DOM en runtime.

## Patrones / convenciones del módulo

### Format dates → `formatLocalDate(d: Date)`

`SchedulingConfigClient.tsx` define un helper module-level `formatLocalDate(d: Date)` que usa `getFullYear/getMonth/getDate` directamente (no `toLocaleDateString` con ISO string parsing, **timezone-safe**). Usarlo en lugar de `new Date(isoString).toLocaleDateString()` para evitar el bug clásico de UTC vs local.

### DayPicker dark mode

react-day-picker v9 usa CSS variables (`--rdp-*`). Los overrides para dark mode están en **`frontend/app/ui/global.css`** bajo `.dark .rdp-root` — no los pongas en componentes. Si añades un nuevo DayPicker, simplemente importa `'react-day-picker/style.css'` y heredarás light + dark de un solo sitio.

### Mobile responsive

- Tablas wide → `overflow-x-auto` en wrapper + `min-w-[Xpx]` en `<table>`.
- Headers de página → `flex-wrap` para que el menú colapse en mobile.
- Modales → `overflow-y-auto max-h-[90vh]` en el contenedor interno del modal.

El módulo de **parking** es la referencia interna del proyecto para responsive. Si dudas, replica su patrón.

### Server vs client components

Todo el dashboard del scheduling es **client**: tanto `SchedulingClient` como `SchedulingConfigClient` y todos los tabs llevan `'use client'`. La razón es que prácticamente todo el flujo es interactivo (selección, mutations, modales). La página (`page.tsx`) sí es server component y solo wrappea en Suspense.

No mezcles patrones: no metas `useState` o React Query en `page.tsx`, no hagas componentes async dentro de los clients.

### i18n

`useTranslations()` de `next-intl`. Namespaces principales:

- `scheduling` — la página principal del grid.
- `scheduling.config` — el panel de configuración y sus tabs.

Diccionarios en `frontend/i18n/` (es + en). Cuando añadas una key nueva, **añádela a ambos idiomas** en el mismo commit.

### Shift codes

Definidos exhaustivamente en `app/lib/scheduling/shift-styles.ts` (mapeo a colores Tailwind). La semántica de cada código (M, T, N, P, PI, L, V, B, E, IT, FO, A, LI) está documentada en `backend/services/scheduling/CLAUDE.md` § Shift types — esa es la fuente de verdad. Si añades un código nuevo:

1. Backend: añadirlo a `scheduling_shifts` (DB) y al validador / solver según corresponda.
2. Frontend: añadir el style en `shift-styles.ts` y el código en el PDF export si va a aparecer impreso.

## Bugs conocidos / deuda visible desde la UI

- **`setSchedulableEmployees` borra `start_date`/`end_date`** (TODO.md): al guardar la lista desde `EmployeesTab` se pierden fechas configuradas previamente. Fix está en backend pero afecta UX del tab Empleados. Si lo tocas, ten en cuenta que el bug aún no está corregido.
- **DayPicker en RequestsTab → modal scroll iOS**: edge case conocido en Safari móvil — el overflow del modal interfiere con los gestures del DayPicker. Workaround: `touch-action: pan-y` en el body del modal.

## Referencias cruzadas

- `backend/services/scheduling/CLAUDE.md` — backend TS: validator, constraints, endpoints, shift types semantics, configuration tables, importador histórico.
- `backend/scheduling-solver/CLAUDE.md` — solver Python: daemon, CP-SAT, hard constraints, función objetivo soft.
- `frontend/app/lib/scheduling/types.ts` — DTOs compartidos con backend; mantener sincronizados manualmente cuando cambien.
- `frontend/app/components/dashboard/parking/` — referencia interna de patrones responsive del proyecto.
