# Análisis de Timezone — Four Points PMS

> Recopilatorio de todas las ubicaciones donde se maneja fecha/hora, clasificadas por rol (UTC timestamp vs hotel_date).

---

## ARQUITECTURA DECIDIDA

### REGLA FUNDAMENTAL

```
UTC SOLO para timestamps → created_at, updated_at, reset_at, etc.
Europe/Madrid para lógica de negocio → hotel_date, cierres diarios, turnos, cajas
```

El sistema opera en horario hotelero (España, Europe/Madrid). Between 00:00–01:59 UTC (02:00–03:59 Madrid during winter, 03:00–04:59 during DST), using `new Date().toISOString()` produces a "hotel date" that is one day behind the actual hotel day. This is the root cause of orphaned checklist runs.

---

## BACKEND

### ✅ YA CORRECTO (usan Europe/Madrid)

| Archivo | Línea | Función | Notas |
|---------|-------|---------|-------|
| `repositories/checklist/checklist-repository.ts` | 7-9 | `getHotelDate()` | `Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' })` — correcto |
| `services/cron/cron-service.ts` | 78-86 | `cron.schedule(..., { timezone: 'Europe/Madrid' })` | Checklist reset a las 06:30 Madrid — correcto |
| `repositories/checklist/checklist-repository.ts` | 65-73 | `closeStaleRuns()` | Compara `hotel_date < today` usando getHotelDate() — correcto |
| `config/date-utils.ts` | — | `getTodayMadrid()`, `getNowMadrid()`, etc. | Módulo dedicado con dayjs + timezone — correcto y completo |
| `controllers/cashier/cashier-report-controller.ts` | 12-14 | `madridTime.toISOString().split('T')[0]` | Convierte UTC→Madrid primero, luego extrae YYYY-MM-DD — correcto |
| `controllers/scheduling/scheduling-controller.ts` | 751 | Fix dates in scheduling_days | Timezone fix ya aplicado |

### ⚠️ POSIBLEMENTE PROBLEMÁTICO

| Archivo | Línea | Código | Problema potencial |
|---------|-------|--------|--------------------|
| `repositories/logbook/logbook-repository.ts` | 44 | `new Date().toISOString().split('T')[0]` | **USA UTC** para fallback en `createLogbook`. Si `date` param es null, usa UTC en vez de Madrid. debería usar `getHotelDate()` de `date-utils.ts`. |
| `repositories/logbook/logbook-repository.ts` | 59-60 | `created_at: new Date()`, `updated_at: new Date()` | Timestamps UTC — esto está **bien** para timestamps puros, pero inconsistente con la lógica de negocio (debería usar el helper de date-utils) |
| `repositories/auth/user-repository.ts` | 45 | `new Date().toISOString().slice(0, 19).replace('T', ' ')` | Timestamp UTC formateado para SQL — **OK para timestamps** |
| `controllers/cashier/cashier-report-controller.ts` | 12 | `new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))` | **Correcto** — convierte UTC→Madrid antes de formatear |
| `services/cron/cron-service.ts` | 152, 224, 252, 255, 262 | `new Date()` | Solo para calcular scheduling futuro (nextNotificationRun, etc.) — **OK para timestamps** |
| `repositories/maintenance/maintenance-repository.ts` | 130, 146, 151, 156, 163, 168, 173, 203, 218 | `new Date(row.xxx).toISOString()` | Conversión de fecha de DB a ISO string — depende del timezone en que se almacenó. Si se almacenó como UTC, esto convierte correctamente. **Pero hay inconsistency** — algunos usan `typeof row.xxx === 'string' ? row.xxx : new Date(row.xxx).toISOString()` (línea 168, 173) y otros siempre convierten. |
| `repositories/activity/activity-repository.ts` | 113, 206, 294, 396, 479 | `new Date(row.timestamp).toISOString()` | Conversión de timestamp de DB — **OK** |
| `repositories/demo/demo-activity-repository.ts` | 166 | `new Date(row.timestamp).toISOString()` | Conversión de timestamp de DB — **OK** |
| `repositories/blacklist/blacklist-repository.ts` | 229, 381, 419, 464 | `new Date().toISOString()` | Timestamps UTC para logs — **OK** |
| `index.ts` | 108 | `timestamp: new Date().toISOString()` | Timestamp UTC — **OK** |
| `scripts/checklist-report.ts` | 19, 21 | `new Date().toISOString().slice(...)` | Script standalone que recibe fecha por argv — si no se pasa fecha usa UTC — podría ser problemático si se llama sin argumentos |
| `repositories/scheduling/employee-requests-repository.ts` | 18 | `new Date(year, month, 0).toISOString().slice(0, 10)` | Crea fecha local del servidor (UTC) para calcular último día del mes — podría no ser Madrid si el servidor está en otra TZ. **Sospechoso**. |
| `repositories/cashier/cashier-daily-repository.ts` | 272 | `new Date(year, month, 0).toISOString().split('T')[0]` | Mismo problema — fecha construida en UTC del servidor, no en Madrid |
| `repositories/parking/stats.repository.ts` | 48, 152, 266, 385, 469 | `new Date(date).toISOString().split('T')[0]` | Parámetro `date` puede ser string o Date. Si es string YYYY-MM-DD, `new Date(string)` se interpreta como UTC midnight → luego `.toISOString().split('T')[0]` da la fecha correcta solo si el string era UTC midnight. Si el string es YYYY-MM-DD en hora local, esto puede romper. |
| `repositories/parking/parking.repository.ts` | 180 | `date || new Date().toISOString().split('T')[0]` | Fallback UTC — debería usar `getTodayMadrid()` |
| `repositories/backoffice/backoffice-repository.ts` | 893 | `new Date().toISOString().slice(0, 7)` | `YYYY-MM` para mes actual — UTC — puede dar mes equivocado cerca de medianoche |
| `repositories/backoffice/backoffice-repository.ts` | 939 | `new Date().getFullYear()` | Año UTC — puede dar año equivocado |
| `controllers/backoffice/backoffice-controller.ts` | 1274 | `new Date().toISOString().slice(0, 10).replace(/-/g, '')` | Formatea fecha UTC para nombre de archivo — **OK** (es para utilidad, no lógica de negocio) |
| `controllers/scheduling/scheduling-controller.ts` | 1852 | `new Date().getFullYear()` | Año UTC — problema potencial en janvier |
| `controllers/group/group-controller.ts` | 316 | `new Date().getFullYear()` | Año UTC — problema potencial en janvier |

### 🔴 CRÍTICO — necesita fix urgente

#### `repositories/logbook/logbook-repository.ts:44`

```typescript
const today = new Date().toISOString().split('T')[0] // yyyy-mm-dd
```

Este es UTC. Cuando alguien crea un logbook sin pasar `date`, usa la fecha UTC en vez de la hotelera. Si son las 02:00 Madrid (00:00 UTC), el logbook queda con fecha del día anterior.

**Fix**: importar y usar `getTodayMadrid()` de `config/date-utils.ts`.

---

## FRONTEND

### Contexto importante

El frontend solo **muestra** fechas. La regla establecida es: "These functions are ONLY for displaying dates to users. All date calculations should be done in the backend."

No obstante, hay sitios donde el frontend envía fechas al backend (parámetros de query, body de POST). Hay que asegurar que cuando el frontend envía una fecha YYYY-MM-DD, esa fecha sea calculada en Madrid.

### ✅ Funciones helper correctas en `frontend/app/lib/helpers/date.ts`

| Función | Líneas | Cómo funciona |
|---------|--------|---------------|
| `getMadridDate()` | 20-28 | `Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' })` — **correcto** |
| `formatMadridDate()` | 39-52 | `toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })` — **correcto** |
| `getDateWithOffset()` | 82-86 | Construye `new Date(getMadridDate() + 'T12:00:00')` — al mediodía evita el efecto de medianoche, luego extrae ISO string — **correcto** |
| `getCurrentWeekRange()` | 93-108 | Similar — usa `getMadridDate() + 'T12:00:00'` — **correcto** |
| `getCurrentMonthRange()` | 114-127 | Convierte UTC a Madrid via `toLocaleString('en-US', { timeZone: 'Europe/Madrid' })` — **correcto** |
| `isSameDay()` | 246-258 | `Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' })` — **correcto** |

### ⚠️ Usos dispersos de `new Date()` en frontend

El frontend tiene ~103 matches de `new Date()` / `toISOString()` dispersos por toda la UI. La mayoría son para:

1. **Inicializar estado de calendario/selector de fecha** — `useState(new Date())`
2. **Comparar "hoy"** para decidir si mostrar something — `new Date()` puro
3. **Formatear para display** — `new Date().toLocaleDateString('es-ES', ...)`
4. **Enviar timestamps al backend** — `new Date().toISOString()`

Para los **casos 1 y 2**: si el componente es para seleccionar/mostrar fechas del calendario de Madrid (como `SimpleCalendar`, `HorizontalDatePicker`, `ParkingNavigator`), usar `new Date()` sin conversión puede causar que el día seleccionado sea incorrecto cerca de medianoche.

Para el **caso 3**: `toLocaleDateString` sin `timeZone` usa la TZ del browser del usuario — que理论上 debería ser Madrid porque el servidor está en España, pero no se puede asumir.

Para el **caso 4**: timestamps UTC — **correcto** para enviar al backend.

### Casos específicos值得关注

| Archivo | Línea | Código | Problema |
|---------|-------|--------|----------|
| `app/ui/calendar/HorizontalDatePicker.tsx` | 130 | `const today = new Date()` | Inicializa la fecha del date picker — si el browser está en Madrid TZ, OK. Si no, podría mostrar fecha equivocada |
| `app/ui/calendar/SimpleCalendarCompact.tsx` | 19 | `useState(selectedDate \|\| new Date())` | Mismo problema |
| `app/ui/calendar/simplecalendar.tsx` | 16 | `useState(selectedDate \|\| new Date())` | Mismo problema |
| `app/dashboard/parking/status/page.tsx` | 21 | `formatDateForInput(new Date())` | `formatDateForInput` usa `date.getFullYear()/getMonth()+1/getDate()` — esto es la fecha LOCAL del browser — correcto solo si el browser está en Madrid TZ |
| `app/components/checklist/ChecklistHeader.tsx` | 61 | `new Date().toLocaleDateString('es-ES', { ... })` | Sin `timeZone: 'Europe/Madrid'` — usa la TZ local del browser — podría ser incorrecto si el browser no está en Madrid |
| `app/components/logbooks/LogbooksList.tsx` | 618, 746 | `formatEditTimestamp(comment.created_at \|\| new Date().toISOString())` | Fallback UTC — **NO es hotel_date**, es un timestamp. Está bien para ese uso. |

---

## LO QUE SÍ ESTÁ BIEN HECHO

1. **Checklist** — El sistema de checklist está bien diseñado:
   - `getHotelDate()` usa `Intl.DateTimeFormat` con Europe/Madrid
   - `closeStaleRuns()` compara `hotel_date < today` (Madrid)
   - El cron corre con `{ timezone: 'Europe/Madrid' }`

2. **date-utils.ts** — El módulo en backend es completo y correcto:
   - `getTodayMadrid()`, `getNowMadrid()`, `toMadridTime()`, `formatDateMadrid()`, etc.
   - Ya existe un punto central de verdad

3. **frontend date.ts** — Las funciones helper usan correctamente Europe/Madrid para display

---

## LO QUE HAY QUE ARREGLAR

### Prioridad 1 — Fix inmediato

**`repositories/logbook/logbook-repository.ts:44`** — cambiar el fallback UTC por `getTodayMadrid()`.

### Prioridad 2 — Inconsistencia en fecha de negocio

Hay varios sitios donde `new Date()` se usa para calcular `hotel_date` o lógica de día hotelero. Deberían unificarse a usar `getTodayMadrid()` de `date-utils.ts`:

- `repositories/scheduling/employee-requests-repository.ts:18`
- `repositories/cashier/cashier-daily-repository.ts:272`
- `repositories/parking/parking.repository.ts:180`
- `repositories/backoffice/backoffice-repository.ts:893, 939`

### Prioridad 3 — Unificar date-utils

Crear un archivo `backend/utils/date-utils.ts` o asegurar que `config/date-utils.ts` se importe consistentemente en todos los repos y controllers que manejen fechas de negocio.

### Sobre los parking stats repository

Las funciones `getDailyStats`, `getOccupancyByLevel` reciben `date: Date | string` y hacen `new Date(date).toISOString().split('T')[0]`. Si el caller ya pasa una string YYYY-MM-DD en Madrid, esto puede doblar la conversión. Necesitan auditoría para ver quién las llama y con qué.

---

## PREGUNTAS ABIERTAS / NO ESTOY SEGURO

1. **¿El servidor de producción (Render) está en qué timezone?** Si está en UTC, los `new Date()` puros dan diferente resultado que en local (España). Esto explicaría el problema de Render ejecutando a las 03:00 UTC cuando el código dice 06:30 Madrid.

2. **`employee-requests-repository.ts:18`** — `new Date(year, month, 0).toISOString().slice(0, 10)` — este patrón construye una fecha local (no UTC). En JS, `new Date(2025, 11, 0)` significa "el día 0 del mes 12" = último día del mes 11. Esto se interpreta como UTC midnight. Si el servidor está en Madrid TZ, `new Date(2025, 11, 0)` a las 23:00 del 30 podría producir un resultado diferente. **Necesita verificarse**.

3. **`cashier-daily-repository.ts:272`** — mismo problema.

4. **¿El cron de Render está configurado fuera del código?** Si Render tiene un scheduled job propio con cron expression `0 3 * * *`, ese ignora completamente el `cron.schedule()` del código. Esto explicaría por qué el reset corre a las 03:00 UTC en vez de las 06:30 Madrid.

5. **Las funciones de parking stats** (`getDailyStats`, etc.) reciben `Date | string` y siempre convierten con `new Date(date).toISOString().split('T')[0]`. Si alguien llama con una fecha Madrid ya correcta (YYYY-MM-DD), la conversión UTC la puede alterar. Necesito ver cómo se llaman desde los controllers.

6. **`backoffice-repository.ts:939`** — `new Date().getFullYear()` para obtener el año actual. Cerca de medianoche del 31 diciembre, esto podría dar el año equivocado si el servidor es UTC y estamos en Madrid. Pero el impacto real es bajo.

7. **¿El LogbooksList usa UTC o Madrid para los timestamps de "última edición"?** En las líneas 618 y 746 se usa `formatEditTimestamp(comment.created_at || new Date().toISOString())` — el fallback es UTC, pero no es hotel_date, es un timestamp de acción. Probablemente está bien pero habría que confirmarlo.

## Lógica actual

La lógica principal de fechas está centralizada en los siguientes archivos:

### Backend — `backend/config/date-utils.ts`

Módulo central con **dayjs + timezone plugin**. Es el **punto central de verdad** del proyecto backend.

| Función | Retorno | Uso |
|---------|---------|-----|
| `getTodayMadrid()` | `YYYY-MM-DD` | Hotel date actual |
| `getNowMadrid()` | `Dayjs` | Fecha/hora actual Madrid |
| `toMadridTime(date)` | `Dayjs` | Conversión a Madrid |
| `formatDateMadrid(date)` | `YYYY-MM-DD` | Formateo simple |
| `formatDateTimeMadrid(date)` | `YYYY-MM-DD HH:mm:ss` | Formateo con hora |
| `getStartOfDayMadrid(date)` | `Dayjs 00:00:00` | Inicio del día |
| `getEndOfDayMadrid(date)` | `Dayjs 23:59:59` | Fin del día |

> **⚠️ Problema identificado**: este módulo ya existe y es correcto, pero **no se usa consistentemente** en todos los archivos. Muchos repositorios hacen `new Date().toISOString().split('T')[0]` directamente en vez de importar `getTodayMadrid()`.

### Backend — `backend/repositories/checklist/checklist-repository.ts:7-9`

```typescript
export function getHotelDate(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date())
}
```

- Función que usa el **checklist** para obtener `hotel_date`
- **✅ Correcta** — usa `Europe/Madrid` explícitamente
- **⚠️ Duplicada** — no importa de `date-utils.ts`, está replicada inline

### Frontend — `frontend/app/lib/helpers/date.ts`

Helper centralizado para **display de fechas**. Todas las funciones usan `Europe/Madrid`:

| Función | Uso |
|---------|-----|
| `getMadridDate()` | Obtener fecha actual YYYY-MM-DD (Madrid) |
| `formatMadridDate(date)` | Formatear para display DD/MM/YYYY |
| `formatMadridDateLong(date)` | Formatear con mes completo (lunes 28 de octubre de 2025) |
| `getDateWithOffset(days)` | Fecha con desplazamiento ±días |
| `getCurrentWeekRange()` | Inicio/fin de semana actual |
| `getCurrentMonthRange()` | Inicio/fin de mes actual |
| `isSameDay(d1, d2)` | ¿Son el mismo día en Madrid? |
| `formatMadridDateTime(dt)` | Fecha + hora DD/MM/YYYY HH:MM |

---

## Resumen de problemas encontrados

### 🔴 Críticos (arreglar urgente)

| Archivo | Línea | Problema |
|---------|-------|----------|
| `repositories/logbook/logbook-repository.ts` | 44 | Fallback UTC en `createLogbook` — debería usar `getTodayMadrid()` |

### 🟡 Inconsistencias (unificar uso de date-utils)

| Archivo | Línea | Problema |
|---------|-------|----------|
| `repositories/scheduling/employee-requests-repository.ts` | 18 | `new Date(year, month, 0).toISOString().slice(0,10)` — UTC, no Madrid |
| `repositories/cashier/cashier-daily-repository.ts` | 272 | Mismo problema |
| `repositories/parking/parking.repository.ts` | 180 | Fallback UTC en vez de `getTodayMadrid()` |
| `repositories/backoffice/backoffice-repository.ts` | 893, 939 | Año UTC — bajo impacto pero inconsistente |
| `repositories/checklist/checklist-repository.ts` | 7-9 | Función duplicada que no usa `date-utils.ts` |

### 🟢 Correctos (ya funcionan bien)

- **Checklist** — `getHotelDate()` + `closeStaleRuns()` + cron con `{ timezone: 'Europe/Madrid' }`
- **Cron service** — schedule con timezone explícito
- **Frontend helpers** — todas las funciones de `date.ts` usan Madrid correctamente

---

## RECOMENDACIONES

### El problema real

El patrón perfecto diario del cron prácticamente descarta que Render se duerma. El verdadero problema es:

> Tu backend usa **UTC** para decidir el "día hotel", pero el hotel opera en **hora Madrid**. Entre las 00:00 y las 01:59 UTC (02:00–03:59 Madrid según DST), se generan fechas incorrectas o el cron compara fechas distintas.

#### Ejemplo concreto

```
Hora real en Ciudad: 14 mayo 00:30 Madrid
En UTC: 13 mayo 22:30 UTC

❌ MAL — new Date().toISOString().split('T')[0] → "2025-05-13" (UTC)
✅ BIEN — getHotelDate() → "2025-05-14" (Madrid)
```

**Ahí nacen las filas "fantasma".**

### Arquitectura correcta

| Tipo | Timezone | Usar para |
|------|----------|-----------|
| **UTC** | `new Date().toISOString()` | `created_at`, `updated_at`, `reset_at`, timestamps de auditoría |
| **Europe/Madrid** | `getTodayMadrid()` / `getHotelDate()` | `hotel_date`, cierres diarios, turnos, cajas, auditorías de negocio |

### Implementación recomendada

#### 1. Crear helper centralizado (si no existiera)

El módulo `backend/config/date-utils.ts` ya existe y es correcto. Asegurar que todo lo importa en vez de replicar lógica.

#### 2. Reemplazar todos los usos de UTC para lógica de negocio

```
❌ MAL
const today = new Date().toISOString().split('T')[0]
const year = new Date().getFullYear()
const lastDay = new Date(year, month, 0).toISOString().slice(0, 10)

✅ BIEN
import { getTodayMadrid } from '../config/date-utils.js'
const today = getTodayMadrid()
```

#### 3. El cron también debe usar Madrid

```typescript
cron.schedule('30 6 * * *', resetChecklists, {
  timezone: 'Europe/Madrid'  // ✅ Ya está correcto en el código
})
```

#### 4. Proteger contra runs huérfanos

Cuando alguien abre una checklist:

```typescript
if (hotel_date < getHotelDate()) {
  // Auto-cerrar inmediatamente — jamás quedan huérfanas
  await closeRun(runId, userId, 'late-auto-close')
}
```

### Resultado esperado

Con estos cambios se arreglan:

- ✅ Runs huérfanos en checklist
- ✅ Fechas incorrectas cerca de medianoche
- ✅ Problemas tras cambio de horario (DST)
- ✅ Inconsistencias entre cron y lógica de negocio
- ✅ Diferencias UTC/Madrid en Edge cases nocturnos
- ✅ Archivos que no usaban el módulo centralizado

El sistema queda **significativamente más sólido** para operación hotelera con turnos nocturnos.