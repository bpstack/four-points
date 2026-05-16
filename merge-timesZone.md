# Timezone Refactor — Plan de Arreglo

> Documento ejecutable. Vive hasta que las 4 fases estén cerradas; después queda como histórico.
> El audit que originó este plan se mantiene en §6 (apéndice).

---

## 1. Arquitectura canon

```
UTC          → timestamps de auditoría: created_at, updated_at, reset_at, done_at
Europe/Madrid → lógica de negocio: hotel_date, cierres diarios, turnos, cajas
```

**Fuente única backend:** `backend/config/date-utils.ts` (`getTodayMadrid`, `getNowMadrid`, `toMadridTime`, `formatDateMadrid`, etc.).
**Fuente única frontend:** `frontend/app/lib/helpers/date.ts` (`getMadridDate`, `formatMadridDate`, etc.).

Cualquier `new Date().toISOString()` para campo "fecha de negocio" es un bug.

---

## 2. Estado actual (resumen)

| # | Categoría | Severidad | Archivos |
|---|---|---|---|
| 1 | Crons sin `timezone` Madrid | 🔴 Bug real producción | `cron-service.ts:38,57` |
| 2 | Fallback UTC para `hotel_date` en logbook | 🔴 Bug real producción | `logbook-repository.ts:44` |
| 3 | Render free-tier duerme, cron 06:30 no dispara | 🔴 Funcional checklist | `cron-service.ts:78-86` (workaround Fase 2) |
| 4 | Función `getHotelDate()` duplicada del helper central | 🟡 Inconsistencia | `checklist-repository.ts:7-9` |
| 5 | Hack inline Madrid date en cashier controller | 🟡 Inconsistencia | `cashier-report-controller.ts:13` |
| 6 | Fallbacks UTC en parking / backoffice / scheduling / cashier | 🟡 Bugs latentes | varios (Fase 3) |
| 7 | `formatDate` reinventado inline en ~8 componentes frontend | ✅ Fase 4 cerrada | varios (Fase 4) |
| 8 | `formatDateForInput` / `formatDateLocal` sin timeZone Madrid | ✅ Fase 4 cerrada | `helpers/date.ts` |

---

## 3. Plan de arreglo

### Fase 1 — Bugs reales y centralización ✅ 2026-05-15

**Branch:** sin rama, aplicado directo en working tree (sin usuarios reales aún).
**Tiempo real:** 15 min.

- [x] Añadir `{ timezone: 'Europe/Madrid' }` al cron de notificaciones (`cron-service.ts:49`)
- [x] Añadir `{ timezone: 'Europe/Madrid' }` al cron de batch payment (`cron-service.ts:73`)
- [x] Cambiar fallback UTC en `logbook-repository.ts:45` por `getTodayMadrid()` importado de `config/date-utils.js`
- [x] Eliminar `getHotelDate()` duplicado en `checklist-repository.ts:7-9`; importar `getTodayMadrid` y renombrar usos internos en repo + service
- [x] Eliminar hack inline en `cashier-report-controller.ts:10-15`; reemplazar por import `getTodayMadrid` de `date-utils.ts`

**Verificación realizada:**
- `pnpm typecheck` verde, sin errores.
- `grep getHotelDate` en backend → 0 resultados, sin referencias colgantes.

**Pendiente de verificar tras próximo deploy:**
- Logs muestran cron de notificaciones disparando a 07:00 Madrid (no UTC).
- Crear logbook sin pasar `date` entre 00:00–02:00 Madrid → row con `date` del día Madrid.

### Fase 2 — Workaround cron-sleep (auto-close lazy) ✅ 2026-05-15

**Branch:** sin rama, aplicado directo en working tree.
**Tiempo real:** 2 min (un import ya estaba, una línea añadida).

Decisión: **opción A — auto-close lazy invisible**. Encaja con la decisión #10 del módulo checklist (no botón reset manual). Cero UI.

**Implementación aplicada en `services/checklist/checklist.service.ts::getRunState`:**

```ts
export async function getRunState(checklistId: string): Promise<ChecklistRunWithSteps> {
  // Auto-close lazy: si el cron 06:30 Madrid no disparó (Render free tier dormido),
  // cerrar aquí los runs con hotel_date < today. UPDATE indexed, noop tras la primera del día.
  await repo.closeStaleRuns()
  const run = await repo.getOrCreateRun(checklistId)
  return buildRunState(run)
}
```

**Coste por petición:** 1 UPDATE indexado sobre `(hotel_id, hotel_date, reset_at)` filtrando `hotel_date < today AND reset_at IS NULL`. Tras la primera petición del día, `affectedRows = 0` → noop.

**Verificación realizada:** `pnpm typecheck` verde.

**Pendiente smoke test local antes de commit — ver `TODO.md §Verificación pre-commit Lote D`.**

**Cron mantenido:** `cron.schedule('30 6 * * *', ..., { timezone: 'Europe/Madrid' })` sigue activo. Cuando Render no duerma, volverá a ser el camino primario. El lazy es defensa en profundidad.

### Fase 3 — UTC fallbacks restantes en lógica de negocio ✅ 2026-05-15

**Branch:** sin rama, aplicado directo en working tree.
**Tiempo real:** 25 min (incluye auditoría de callers).

**Cambios aplicados (14 sitios en 9 archivos):**

- [x] **`parking/parking.repository.ts:180`** — `getAvailableSpots` fallback → `getTodayMadrid()` (import añadido).
- [x] **`parking/stats.repository.ts`** — auditoría completa de los 5 sitios con el patrón frágil `Date | string`:
  - Línea 48 (`getDailyStats`), 152 (`getOccupancyByLevel`, **era realmente bug** — ignoraba el Date param y usaba NOW UTC), 266 (`getCheckinsByDate`), 385 (`getCheckoutsByDate`), 469 (`getAvailabilityByLevel`).
  - Todos unificados a `formatDateMadrid(date)` que normaliza Date|string a YYYY-MM-DD Madrid.
- [x] **`backoffice-repository.ts:893`** — `currentMonth` → `getNowMadrid().format('YYYY-MM')`.
- [x] **`backoffice-repository.ts:939`** — `getMonthlySummary` year fallback → `getNowMadrid().year()`.
- [x] **`scripts/checklist-report.ts:19`** — CLI default → `getTodayMadrid()`.
- [x] **`scheduling/employee-requests-repository.ts:18`** — `findByMonth` lastDay → `getLastDayOfMonth(year, month)` (helper nuevo en `date-utils.ts`).
- [x] **`cashier/cashier-daily-repository.ts:272`** — `getMonthlySummary` endDate → `getLastDayOfMonth(year, month)`.
- [x] **`scheduling-controller.ts:1852`** — `getShiftStats` year fallback → `getNowMadrid().year()`.
- [x] **`group-controller.ts:316`** — `getDashboardTimeline` year fallback → `getNowMadrid().year()`.

**Hallazgo extra durante auditoría (no en plan original):**

- [x] **`conciliation/conciliation-monthly.repository.ts:95-100`** — mismo patrón `new Date(year, month, 0)` + `.toISOString()` que causaba shift UTC al último día del mes. Arreglado con `getLastDayOfMonth` + construcción manual del primer día. Bonus pillado durante la auditoría.

**Sitios NO tocados** (también encontrados durante auditoría):

- `db-mysql/scripts/set-holidays-2026.ts:77`
- `repositories/scheduling/scheduling-repository.ts:925, 1890`
- `repositories/conciliation/conciliation-monthly.repository.ts:42`
- `repositories/cashier/cashier-daily-repository.ts:438`

Todos usan `new Date(year, month, 0).getDate()` que devuelve solo el número del día (28-31) — el resultado es **independiente del timezone** (la misma fecha calendar tiene el mismo getDate en cualquier TZ). Sin bug, sin acción.

**Nuevo helper expuesto en `config/date-utils.ts`:**
```ts
export const getLastDayOfMonth = (year: number, month: number): string => {
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD')
}
```

**Verificación realizada:** `pnpm typecheck` verde con los 14 cambios.

**Pendiente smoke test local antes de commit — ver `TODO.md §Verificación pre-commit Lote E`.**

### Fase 4 — Frontend ✅ 2026-05-16

**Branch:** `refactor/timezone-fase-4-frontend`
**Tiempo estimado:** 1h | **Real:** ~45 min

- [x] `helpers/date.ts` — `formatDateForInput()` y `formatDateLocal()` ahora usan `timeZone: 'Europe/Madrid'`. También `formatDateDisplayShort` y todos los helpers `formatMadridXxx` tienen el tz explícito.
- [x] `parseInputDate` ahora acepta ISO datetime (`...T...`) y datetime naive (`YYYY-MM-DD HH:mm:ss`), no solo `YYYY-MM-DD`. Antes producía `Invalid Date` en backoffice cuando la API devolvía ISO completo.
- [x] Migrados a thin wrapper que delega a `formatDateDisplayShort`:
  - `app/components/bo/tabs/SuppliersTab.tsx`
  - `app/components/bo/tabs/SuppliersTabLazy.tsx`
  - `app/components/bo/tabs/PendingInvoicesTab.tsx`
  - `app/components/bo/tabs/PendingInvoicesTabLazy.tsx`
  - `app/components/bo/tabs/PaidInvoicesTab.tsx`
  - `app/components/bo/tabs/PaidInvoicesTabLazy.tsx`
  - `app/components/parking/VehicleSearchModal.tsx`
- [x] `app/lib/blacklist/blacklistUtils.ts` — `formatDate` y `formatDateTime` con `timeZone: 'Europe/Madrid'` explícito. Mantienen implementación propia (no se migran a helpers globales) porque tienen el formato específico del módulo. Decisión consciente: la consolidación pierde valor frente al ruido de tocar 5 componentes consumidores.
- [x] `app/lib/backoffice/export-utils.ts` — `formatDate` con `timeZone: 'Europe/Madrid'` explícito. Misma decisión que blacklist.
- [x] `app/components/checklist/ChecklistHeader.tsx` — `toLocaleDateString` con `timeZone: 'Europe/Madrid'` añadido (formato original conservado: "DD de mes de YYYY HH:mm" para print).
- [x] `app/components/logbooks/LogbooksList.tsx` — desktop+mobile con `timeZone: 'Europe/Madrid'` añadido.
- [x] **Bonus**: helper nuevo `formatTimestampSmart` — devuelve `HH:mm` si es hoy Madrid, `DD/MM/YYYY HH:mm` si no. Aplicado a comentarios de checklist (`StepDetailsPanel.tsx`), donde la mayoría son del día actual pero ocasionalmente se ven de días anteriores.

**Verificación:** `pnpm exec tsc --noEmit` verde. Test runtime con `process.env.TZ='America/Los_Angeles'` simulando proceso en LA: todos los helpers devuelven fecha Madrid correcta.

**Decisión no realizada:** unificación a formato `DD-MM-YY`. Se descartó porque los formatos legibles en producción (`21 dic 2025`, `28/10/2025`, etc.) ya están consolidados y son los que el usuario quiere ver. La fuente de bugs era el TZ, no el formato.

**Pendiente smoke test local antes de commit — ver `TODO.md §Verificación pre-commit Lote F`.**

---

## 4. Decisión cron-sleep en Render free tier

**Contexto:** Render free tier suspende el servicio tras 15 min sin tráfico. `node-cron` solo dispara con proceso vivo; no hay backfill al despertar.

**Diagnóstico (2026-05-15):**
- Comportamiento del free tier (suspensión por inactividad) está documentado por Render.
- Logs históricos no se conservan en free tier (al despertar solo se ven los del arranque actual).
- Síntoma observado: runs huérfanos persisten en DB con `reset_at IS NULL` y `hotel_date` del día anterior, hasta que el usuario abre la siguiente checklist o se reinicia el servicio.
- Inferencia: con probabilidad alta el cron de las 06:30 no dispara en franjas de baja actividad nocturna (el reset coincide con la hora de menor tráfico). No es demostrable empíricamente sin logs persistentes, pero es la única explicación consistente con el comportamiento observado y la documentación de Render.

**Decisión:** implementar **auto-close lazy** (Fase 2). Cero coste, cero UI, cero dependencia externa.

**Alternativas descartadas:**
- Botón reset manual en UI → contradice decisión #10 del módulo checklist.
- Pinger externo (UptimeRobot) → válido pero se evaluará en otro momento.
- Plan pagado Render → fuera de scope actual.

**Reabrir esta decisión si:** se contrata plan pagado (cron primario suficiente, el lazy puede mantenerse como defensa en profundidad) o si la operativa pide otra ventana de reset (entonces el cron principal deja de cubrir el caso y hay que repensar).

---

## 5. Fuera de scope (apuntado para otro refactor)

Durante el análisis aparecieron problemas reales no-timezone que conviene anotar:

- **`X-Forwarded-For` sin `trust proxy`** — Render pone el backend detrás de su proxy; `express-rate-limit` no puede identificar IPs reales sin `app.set('trust proxy', 1)`. Hoy `loginLimiter`/`apiLimiter`/`refreshLimiter` limitan **por la IP del proxy**, no del usuario. Bug funcional de seguridad. Fix de una línea en `backend/index.ts`. Va a su propio PR.

---

## 6. Apéndice — Audit detallado (referencia)

> Mantenido como justificación de las decisiones de arriba. No es plan, es histórico del análisis.

### 6.1 Backend — sitios correctos (usan Europe/Madrid)

| Archivo | Línea | Función |
|---|---|---|
| `repositories/checklist/checklist-repository.ts` | 7-9 | `getHotelDate()` — correcto pero **duplica** `date-utils.ts` (Fase 1) |
| `services/cron/cron-service.ts` | 78-86 | Checklist reset con `{ timezone: 'Europe/Madrid' }` |
| `repositories/checklist/checklist-repository.ts` | 65-73 | `closeStaleRuns()` con `getHotelDate()` |
| `config/date-utils.ts` | — | Módulo dedicado dayjs + timezone |
| `controllers/cashier/cashier-report-controller.ts` | 12-14 | Conversión UTC→Madrid correcta, pero **inline** (Fase 1) |
| `controllers/scheduling/scheduling-controller.ts` | 751 | Fix dates en scheduling_days aplicado |

### 6.2 Backend — sitios problemáticos verificados

| Archivo | Línea | Patrón | Estado |
|---|---|---|---|
| `repositories/logbook/logbook-repository.ts` | 44 | `new Date().toISOString().split('T')[0]` fallback UTC | 🔴 Fase 1 |
| `services/cron/cron-service.ts` | 38, 57 | `cron.schedule(...)` sin `{ timezone }` | 🔴 Fase 1 |
| `repositories/parking/parking.repository.ts` | 180 | Fallback UTC | 🟡 Fase 3 |
| `repositories/parking/stats.repository.ts` | 48, 152, 266, 385, 469 | `new Date(date).toISOString()` puede doblar conversión | 🟡 Fase 3 |
| `repositories/backoffice/backoffice-repository.ts` | 893 | `new Date().toISOString().slice(0,7)` UTC | 🟡 Fase 3 |
| `repositories/backoffice/backoffice-repository.ts` | 939 | `new Date().getFullYear()` UTC | 🟡 Fase 3 |
| `repositories/scheduling/employee-requests-repository.ts` | 18 | `new Date(year, month, 0).toISOString().slice(0,10)` | 🟡 Fase 3 |
| `repositories/cashier/cashier-daily-repository.ts` | 272 | Mismo patrón | 🟡 Fase 3 |
| `controllers/scheduling/scheduling-controller.ts` | 1852 | `new Date().getFullYear()` UTC | 🟡 Fase 3 |
| `controllers/group/group-controller.ts` | 316 | `new Date().getFullYear()` UTC | 🟡 Fase 3 |
| `scripts/checklist-report.ts` | 19 | Default UTC en CLI | 🟡 Fase 3 |

### 6.3 Backend — sitios OK (timestamps puros)

| Archivo | Línea | Patrón | Por qué OK |
|---|---|---|---|
| `repositories/auth/user-repository.ts` | 45 | `new Date().toISOString().slice(0,19).replace('T',' ')` | Timestamp `created_at` para SQL |
| `repositories/maintenance/maintenance-repository.ts` | 130-218 | `new Date(row.xxx).toISOString()` | Conversión DB → ISO |
| `repositories/activity/activity-repository.ts` | 113, 206, 294, 396, 479 | `new Date(row.timestamp).toISOString()` | Lectura timestamp DB |
| `repositories/demo/demo-activity-repository.ts` | 166 | Similar | Lectura timestamp DB |
| `repositories/blacklist/blacklist-repository.ts` | 229, 381, 419, 464 | `new Date().toISOString()` | Timestamps logs |
| `index.ts` | 108 | `timestamp: new Date().toISOString()` | Timestamp respuesta |
| `controllers/backoffice/backoffice-controller.ts` | 1274 | Filename timestamp | Utility, no business |

### 6.4 Frontend — duplicación detectada

`formatDate` redefinido inline en componentes ignorando `helpers/date.ts`:

| Archivo | Línea |
|---|---|
| `app/components/bo/tabs/SuppliersTab.tsx` | 87 |
| `app/components/bo/tabs/SuppliersTabLazy.tsx` | 114 |
| `app/components/bo/tabs/PendingInvoicesTab.tsx` | 106 |
| `app/components/bo/tabs/PendingInvoicesTabLazy.tsx` | 145 |
| `app/components/bo/tabs/PaidInvoicesTab.tsx` | 436 |
| `app/components/bo/tabs/PaidInvoicesTabLazy.tsx` | 208 |
| `app/components/parking/VehicleSearchModal.tsx` | 108 |
| `app/lib/blacklist/blacklistUtils.ts` | 59 |
| `app/lib/backoffice/export-utils.ts` | 15 |

### 6.5 Frontend — helpers correctos

`frontend/app/lib/helpers/date.ts`:

| Función | Líneas | Comportamiento |
|---|---|---|
| `getMadridDate()` | 20-28 | `Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' })` ✅ |
| `formatMadridDate()` | 39-52 | `toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })` ✅ |
| `getDateWithOffset()` | 82-86 | Construye fecha al mediodía Madrid ✅ |
| `getCurrentWeekRange()` | 93-108 | Idem ✅ |
| `getCurrentMonthRange()` | 114-127 | Conversión UTC→Madrid ✅ |
| `isSameDay()` | 246-258 | `Intl.DateTimeFormat` con tz Madrid ✅ |
| `formatDateForInput()` | 295-310 | ❌ Lee TZ browser, no Madrid (Fase 4) |
| `formatDateLocal()` | 295-300 | ❌ Mismo problema (Fase 4) |

### 6.6 Preguntas que el análisis dejó abiertas y sus respuestas (2026-05-15)

| Pregunta | Respuesta |
|---|---|
| ¿Servidor Render en qué timezone? | UTC (confirmado en logs). Por eso los crons sin `timezone` se disparan en hora UTC. |
| ¿Cron Render configurado fuera del código? | No. Todo viene de `node-cron` en proceso Node. |
| ¿`new Date(year, month, 0)` en repositorios? | Construye con TZ del runtime (UTC en Render). Funciona por accidente; cambia si server cambia TZ. Fix Fase 3. |
| ¿Por qué runs huérfanos en checklist? | Server dormido en Render free tier no dispara el cron. Fix Fase 2. |
| ¿LogbooksList timestamps de "última edición" UTC ok? | Sí — son timestamps de acción, no hotel_date. |
