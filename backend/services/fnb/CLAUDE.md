# CLAUDE.md — F&B / Restaurant

> Módulo de Food & Beverage del hotel. Reciente (2026-05) y en evolución. Tab principal en producción: **Daily Revenue** (parseo de PDFs de Opera + entrada manual). Los tabs Inventory / Orders / Stats están **mockeados** como placeholders. **Un único archivo** porque el módulo aún es chico y la complejidad real está concentrada en el parser PDF backend.

## Propósito (alcance actual)

**Implementado:** ingestión de facturación F&B diaria. El recepcionista sube el PDF diario de Opera (Calendar/Month to Date), el backend lo parsea, extrae los códigos de categoría y los montos, y los persiste en `fnb_daily_revenue`. El frontend pinta vistas mensuales agregadas + diarias con charts.

**Mock / placeholder:** los tabs Inventory, Orders, Stats. Tienen UI pero **no backend real** — son scaffolding para una segunda fase del módulo (inventario de productos, órdenes a proveedores, agregados anuales). Las stats mostradas en la cabecera (`summaryStats` en `page.tsx`) son datos hardcoded para maquetar.

## Estructura

```
backend/services/fnb/
   ├── pdf-parser.service.ts            (89 líneas — parseOperaPdf: extrae fecha,
   │                                      entries por código, grand total)
   └── fnb-categories.cache.ts          (39 líneas — caché de `trackedCodesSet`,
                                          códigos activos por los que filtrar el PDF)

backend/controllers/fnb/
   ├── fnb-upload.controller.ts         (42 líneas — POST /upload: orquesta parser +
   │                                      validación + persistencia)
   ├── fnb-revenue.controller.ts        (40 líneas — GET /monthly, /daily; DELETE /day/:date)
   └── fnb-manual.controller.ts         (39 líneas — POST /entries — entrada manual cuando
                                          no hay PDF disponible)

backend/repositories/fnb/
   └── fnb.repository.ts                (155 líneas — pivot mensual con CASE WHEN por
                                          code, totals computados en SQL)

backend/routes/fnb/
   └── fnb-routes.ts                    (34 líneas)

frontend/app/dashboard/restaurant/
   ├── page.tsx                         (184 líneas — tab switcher + summary stats mock)
   ├── loading.tsx
   └── error.tsx

frontend/app/components/restaurant/tabs/
   ├── DailyRevenueTab.tsx              (1113 líneas — el tab real: upload PDF, edit
   │                                      manual, charts mensual/diario)
   ├── InventoryTab.tsx                 (413 líneas — MOCK)
   ├── OrdersTab.tsx                    (416 líneas — MOCK)
   └── StatsTab.tsx                     (294 líneas — MOCK)
```

## Códigos de categoría — sync rule

El sistema asume **códigos fijos de Opera** mapeados a 7 columnas estables. Definidos como `CATEGORY_CODES` en `repositories/fnb/fnb.repository.ts`:

| Columna | Código Opera | Significado |
|---|---|---|
| `breakfast_included` | `21110` | Desayuno incluido (tarifa con BB) |
| `breakfast_excluded` | `21124` | Desayuno extra (cliente sin BB que lo pide) |
| `breakfast_directo` | `21120` | Desayuno directo (no asociado a reserva) |
| `lunch_food` | `21111` | Comida — comida |
| `lunch_bev` | `21267` | Comida — bebidas |
| `dinner_food` | `21112` | Cena — comida |
| `dinner_bev` | `21307` | Cena — bebidas |

**Si Opera renombra un código o añades una categoría nueva:**

1. Actualiza `CATEGORY_CODES` en `fnb.repository.ts`.
2. Añade el campo en `FnbMonthlyRow` (`backend/models/fnb/fnb.models.ts`) y en el `interface MonthlyRow` del frontend (`DailyRevenueTab.tsx`).
3. Actualiza `buildEmptyRow()` para incluir el nuevo campo a 0.
4. Si el código nuevo debe afectar el filtro del parser, añádelo a `fnb_category` (tabla) — `fnb-categories.cache.ts` lo recoge dinámicamente.

**Cache de códigos `trackedCodesSet`**: lectura de `fnb_category` cacheada en memoria del proceso. Se refresca cada N segundos (TTL definido en `fnb-categories.cache.ts`). Si añades un código nuevo por SQL directo, el parser tarda hasta ese TTL en empezar a verlo — alternativa: reiniciar el backend.

## PDF parser — `parseOperaPdf(buffer)`

Entrada: `Buffer` del PDF subido (multer in-memory). Salida: `{ date, entries[], grandTotal }`.

**Algoritmo:**

1. `pdf-parse` extrae el texto plano del PDF.
2. **Extracción de fecha (`extractDate`):** busca el patrón `Date DD/MM/YY` que aparece en la línea de filtro de Opera (`Calendar/Month to Date`). Devuelve `YYYY-MM-DD`. **Si no hay match, devuelve null** y el controller responde 422 — **no hay fallback** porque la fecha del header del PDF es +1 día respecto a la hotel date y corrompería los registros silenciosamente.
3. **Extracción de entries (`extractEntries`):** state machine con 3 fases:
   - `codes` — recolecta líneas que matchean `/^\d{5}$/`.
   - `descriptions` — saltadas (texto descriptivo entre códigos y valores).
   - `values` — recolecta los amounts, parea con los códigos por índice.
   Filtra solo los códigos en `trackedCodesSet`.
4. **Grand total (`extractGrandTotal`):** matching numérico para validación.

**Limitaciones conocidas:**
- El parser asume el layout exacto del PDF de Opera. Si Opera cambia el formato, hay que ajustar las heurísticas. No es brittle, pero tampoco es robusto a refactor de Opera.
- 10 MB hardcap en multer. Si un PDF supera eso, falla en upload — Opera nunca produce PDFs tan grandes en condiciones normales, así que el cap es defensivo no funcional.

## Performance — pdf-parse v1

**Importante (commit `954043c`):** `pdf-parse` está pinneado en **v1** porque v2 hace OOM en Render free tier. v2 carga PDF.js completo en memoria; v1 es ligero. Si en algún momento se actualiza Node o se cambia de host, **probar v2 antes de upgradear** — quizás vuelva a ser viable. No upgradear sin medir.

## Endpoints

| Método y ruta | Propósito |
|---|---|
| `GET /api/fnb/categories` | Lista de categorías activas (driver de `trackedCodesSet`) |
| `GET /api/fnb/monthly?year=YYYY&month=MM` | Pivot mensual: una fila por día del mes |
| `GET /api/fnb/daily?date=YYYY-MM-DD` | Detalle de un día concreto |
| `POST /api/fnb/upload` | Subida del PDF (`multipart/form-data`, campo `pdf`, 10 MB máx) |
| `POST /api/fnb/entries` | Entrada manual (cuando no hay PDF disponible) |
| `DELETE /api/fnb/day/:date` | Borrar todos los registros de un día |

Toda la subruta tras `authenticateToken` + `canAccessFnb`. Roles permitidos: `admin`, `recepcionista`, `demo-admin`, **`group-admin`** (este último añadido en `00bab83`).

**Sobre `/entries` (manual):** el flujo manual existe para cuando Opera no genera el PDF o el día tiene revenue F&B sin tener registro Opera (eventos privados, La Caseta, etc.). Usa los mismos `CATEGORY_CODES` que el parser para coherencia.

## Pivot mensual — patrón SQL

`getMonthlyData(year, month)` usa `MAX(CASE WHEN ...)` para pivotar el long-form (`date, category_code, amount`) a una fila por día con columna por categoría. Es eficiente para meses (max 31 filas) y mantiene tipado fuerte en TS.

**Totales computados en SQL** (`breakfast_total`, `lunch_total`, `dinner_total`, `la_caseta_total`, `fnb_total`) usando `r2()` en JS para redondear a 2 decimales **fuera del SQL**. Razón: evitar drift de floats (0.1 + 0.2 = 0.30000000000000004 produce sumas con decimales fantasma). Cualquier total nuevo replica este patrón.

**Días faltantes:** si la BD no tiene una fila para un día del mes, `getMonthlyData` añade un `buildEmptyRow(date)` con todos los ceros. La UI espera filas para todos los días del mes — si decides no rellenar, ajusta también la UI o tendrás huecos visuales.

## Frontend — Daily Revenue tab

`DailyRevenueTab.tsx` (1113 líneas) es el único tab real. Estructura interna:

- **Sección Upload PDF**: drag & drop + apiClient call al `/upload` endpoint. Toast con resultado.
- **Sección Calendario mensual**: navegación por mes, fetch de `/monthly`, render de tabla con totals.
- **Sección Edit manual**: si una fila tiene revenue cargado, permite editarlo. Calls al `/entries` endpoint.
- **Charts (recharts)**: BarChart, LineChart, PieChart — distribución por tipo de servicio (breakfast / lunch / dinner) a lo largo del mes.
- **Sección Diario**: drill-down a un día con todos los detalles.

El tamaño (1113 líneas) es alto. Si se va a tocar UI no trivial, considera split por sección. No urgente.

## Tabs mock (Inventory / Orders / Stats)

Los tabs `InventoryTab.tsx`, `OrdersTab.tsx`, `StatsTab.tsx` tienen **UI pero no datos reales**. Hardcoded mocks. Funcionan como **placeholder para la fase 2** del módulo (inventario interno y pedidos a proveedores).

**No hay backend para estos tabs.** Si alguien pide implementar uno:

1. Diseñar el schema en BD (probablemente `fnb_products`, `fnb_orders`, `fnb_suppliers`).
2. Crear el controller + repo correspondiente.
3. Conectar el tab existente reemplazando los mocks por React Query calls.
4. Documentar aquí.

`summaryStats` en `page.tsx` (totalProducts, lowStock, pendingOrders, monthlyExpenses) también son hardcoded — pertenecen a la fase mockeada.

## Auth

`canAccessFnb` permite: `admin`, `group-admin`, `demo-admin`, `recepcionista`. **Mantenimiento bloqueado.** Sin permiso admin-only en endpoints — recepción puede subir PDFs y editar manualmente.

## Gotchas conocidos

1. **pdf-parse v1 pinneado.** No upgradear sin probar OOM en Render. Documentado en commit `954043c`.
2. **Fecha del PDF: filtro line vs header.** El parser usa el filtro (`Date DD/MM/YY`) **no el header**. El header es +1 día y corrompería datos.
3. **Cache de `trackedCodesSet` con TTL.** Cambios en `fnb_category` tardan hasta el TTL en propagarse al parser. Reinicia el server para forzar.
4. **`CATEGORY_CODES` está hardcoded** en el repo — codes específicos de Opera del hotel. Si cambias de hotel o Opera renumera, tocar aquí.
5. **Floats: usar `r2()`.** Cualquier suma de amounts debe pasar por `r2()` antes de devolverla al frontend.
6. **Tabs mock no son features.** Si te piden "arreglar el inventario", confirma alcance — la UI existe pero no hay datos reales detrás.
7. **`DailyRevenueTab.tsx` con 1113 líneas.** Vigilar si crece más; considerar split por sección.

## Referencias cruzadas

- `backend/middlewares/roleCheck.ts → canAccessFnb` — roles permitidos.
- `backend/models/fnb/fnb.models.ts` — tipos del módulo.
- `backend/scripts/import-fnb-2026.ts` — script one-off para importar histórico (si existe — usado en setup inicial).
