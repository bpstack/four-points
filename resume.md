# Diagnóstico Rama `improve` vs `main`

**Fecha:** 21 de Diciembre 2025  
**Rama analizada:** `improve`  
**Comparada con:** `main`

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Commits en `improve` (vs main) | 7 |
| Archivos modificados | 137 |
| Líneas añadidas | +7,586 |
| Líneas eliminadas | -2,726 |
| **Cambio neto** | **+4,860 líneas** |

**Estado:** Todos los cambios están commiteados correctamente. El trabajo sigue el plan establecido.

---

## Commits Realizados

| # | Hash | Mensaje | Propósito |
|---|------|---------|-----------|
| 1 | `9f57852` | chore: track improvements roadmap docs | Documentación del plan |
| 2 | `3d3c14a` | chore: unify api env and harden auth routes | Helper `env.ts` + URLs unificadas |
| 3 | `22d0437` | fix: wire pending invoice delete dialog and update roadmap | Fix bug `deleteDialogOpen` |
| 4 | `07b32c8` | feat: harden auth flows and move to cookies-only | Eliminar localStorage, validaciones auth |
| 5 | `8d5584b` | feat: migrate parking status to react query | Parking con React Query |
| 6 | `bdede77` | feat: migrate backoffice tabs to react query lazy | BackOffice tabs lazy + React Query |
| 7 | `416892e` | refactor: ui and data layer cleanups across modules | Limpieza general |

**Valoración de commits:** Bien estructurados, atómicos y con mensajes claros. Siguen la convención `type: description`.

---

## Cumplimiento del Plan (`improve-roadmap.md`)

### Prioridades Completadas

| # | Tarea | Estado | Commit |
|---|-------|--------|--------|
| 1 | Unificar variables de entorno | **Completado** | `3d3c14a` |
| 2 | Endurecer Route Handlers de auth | **Completado** | `07b32c8` |
| 3 | Estrategia de tokens (cookies-only) | **Completado** | `07b32c8` |
| 4 | Back Office - React Query/lazy | **Completado** | `bdede77` |
| 5 | Parking - React Query | **Completado** | `8d5584b` |

### Prioridades Pendientes

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 5b | Maintenance - React Query | Pendiente | Seguir patrón de parking |
| 6 | SSR/Prerender | Pendiente | Planear para dashboards críticos |
| 7 | NextAuth/middleware | Pendiente | Decidir si activar o documentar descarte |

---

## Análisis de Calidad

### Lo que está BIEN

1. **Helper `env.ts` correcto**
   - Centraliza URLs
   - Distingue cliente (`API_BASE_URL`) vs servidor (`SERVER_API_BASE_URL`)
   - Fallback a localhost

2. **Eliminación completa de localStorage**
   - `apiClient.ts` reducido de ~439 a ~200 líneas
   - Solo usa cookies HttpOnly
   - `hasRefreshToken()` verifica cookies, no localStorage

3. **Route Handlers robustos**
   - Validación de origen (whitelist)
   - Validación de Content-Type
   - Verificación de cookies requeridas
   - Mensajes de error claros

4. **Migración React Query bien implementada**
   
   **Parking (`useParkingStatus.ts`):**
   - Queries separadas: `stats`, `bookings`, `overdue`, `spots`
   - Claves por fecha: `['parking', 'stats', date]`
   - Mutations con `useMutation` e invalidación automática
   - Funciones puras `deriveSpots()` y `deriveActiveBookings()`
   
   **BackOffice (tabs Lazy):**
   - 4 nuevos componentes: `PendingInvoicesTabLazy`, `PaidInvoicesTabLazy`, `SettingsTabLazy`, `SuppliersTabLazy`
   - `initialData` desde SSR
   - `staleTime: 5 * 60 * 1000` (5 min)
   - `refetchOnWindowFocus: false`

5. **Documentación actualizada**
   - `AUTH_TOKENS_NOTES.md` - Guía rápida de la estrategia de auth
   - `improve-roadmap.md` - Actualizado con estados [completado]/[pendiente]
   - `improvements.md` - Plan detallado original

6. **Bug fix incluido**
   - Commit `22d0437` corrige `deleteDialogOpen` que faltaba declarar

---

### ERRORES DETECTADOS (requieren corrección)

#### 1. **BUG CRÍTICO: `handlePdfEditorSave` con código de otra función** 
   **Archivo:** `frontend/app/components/bo/tabs/PendingInvoicesTabLazy.tsx:316-322`
   
   ```typescript
   // Línea 317 - Console.log incorrecto (dice handleExecuteBatchPayment pero está en handlePdfEditorSave)
   console.error('[handleExecuteBatchPayment] Error:', error)
   
   // Línea 321 - setIsBatchPaying(false) NO debería estar aquí
   setIsBatchPaying(false)
   ```
   
   **Problema:** Parece que se copió código de `handleExecuteBatchPayment` y se pegó en `handlePdfEditorSave`. El `setIsBatchPaying(false)` modifica estado incorrecto cuando hay error al guardar PDF.
   
   **Corrección necesaria:**
   ```typescript
   } catch (error: unknown) {
     console.error('[handlePdfEditorSave] Error:', error)
     const message = error instanceof Error ? error.message : 'Error al guardar PDF validado'
     toast.error(message)
   } finally {
     setPdfEditorOpen(false)
     setEditingPdfInvoice(null)
   }
   ```

#### 2. **ERROR LÓGICO: Logout retorna 401 antes de limpiar cookies**
   **Archivo:** `frontend/app/api/auth/logout/route.ts:35-37`
   
   ```typescript
   if (!accessToken) {
     return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
   }
   ```
   
   **Problema:** Si el usuario tiene refresh_token pero no access_token (expiró), el logout falla con 401 y NO limpia las cookies. El usuario queda en un estado inconsistente.
   
   **Corrección necesaria:**
   ```typescript
   // Siempre limpiar cookies, incluso si no hay access_token
   if (!accessToken) {
     const response = NextResponse.json({ success: true, message: 'Sesión cerrada' })
     response.cookies.delete('access_token')
     response.cookies.delete('refresh_token')
     return response
   }
   ```

#### 3. **MOCK DATA dejado en producción**
   **Archivo:** `frontend/app/components/bo/tabs/PaidInvoicesTabLazy.tsx:29-288`
   
   ```typescript
   // ============================================
   // MOCK DATA - DELETE BEFORE PRODUCTION
   // ============================================
   const MOCK_CATEGORIES = [...]
   const MOCK_INVOICES = [...]
   const MOCK_PAGINATION = { page: 2, total: 250, totalPages: 3 }
   const USE_MOCK_DATA = false // SET TO FALSE FOR PRODUCTION
   ```
   
   **Problema:** ~260 líneas de datos mock que deberían eliminarse. Aunque `USE_MOCK_DATA = false`, este código aumenta el bundle size innecesariamente.
   
   **Corrección:** Eliminar líneas 29-288 completamente.

#### 4. **Dependencia innecesaria en useMemo causa re-renders**
   **Archivo:** `frontend/app/components/bo/tabs/PaidInvoicesTabLazy.tsx:460-468`
   
   ```typescript
   const filteredInvoices = useMemo(
     () => invoices.filter(...),
     [
       invoices,
       searchTerm,
       categoryFilter,
       paymentMethodFilter,
       dateFilter,
       selectedMonth,
       getSpanishMonthName,  // <-- ERROR: función estable, no necesita ser dependencia
     ]
   )
   ```
   
   **Problema:** `getSpanishMonthName` es una función pura definida fuera del componente. Incluirla como dependencia no causa bugs pero es incorrecto y confuso.
   
   **Corrección:** Eliminar `getSpanishMonthName` del array de dependencias.

#### 5. **Variable no usada exportada: `loadParkingData`**
   **Archivo:** `frontend/app/dashboard/parking/status/hooks/useParkingStatus.ts:256-258`
   
   ```typescript
   const loadParkingData = () => {
     invalidateAll()
   }
   ```
   
   **Problema:** Esta función se define pero NO se retorna en el objeto del hook (líneas 332-375). Es código muerto.
   
   **Corrección:** O eliminar la función, o añadirla al return si es necesaria:
   ```typescript
   return {
     // ...existing
     loadParkingData,  // <-- añadir si se necesita, o eliminar la función
   }
   ```

#### 6. **Validación de método redundante en Route Handlers**
   **Archivos:** Todos los `/api/auth/*/route.ts`
   
   ```typescript
   if (req.method !== 'POST') {
     return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
   }
   ```
   
   **Problema:** En Next.js App Router, si exportas `POST`, solo se ejecuta para requests POST. Esta validación NUNCA se ejecutará.
   
   **Corrección:** Eliminar la validación redundante (no es un bug, pero es código muerto).

### Puntos de Atención (no críticos pero recomendados)

1. **Lint pendiente**
   El roadmap menciona "30 errores/99 warnings pendientes en lint". Recomendado ejecutar:
   ```bash
   cd frontend && pnpm lint --fix
   ```

2. **Maintenance sin migrar**
   Es el único módulo que aún usa el patrón antiguo (`useState/useEffect`). Debería migrarse siguiendo el patrón de parking.

3. **Console.logs de debug en producción**
   Múltiples `console.log` en archivos de producción que deberían eliminarse o convertirse a logger condicional:
   - `PendingInvoicesTabLazy.tsx` líneas 189, 264, 294, 306, 310, 312
   - `PaidInvoicesTabLazy.tsx` líneas 518, 706

---

## Archivos Clave Modificados

### Core Auth/API
| Archivo | Cambio |
|---------|--------|
| `frontend/app/lib/env.ts` | **Nuevo** - Helper de URLs |
| `frontend/app/lib/apiClient.ts` | -239 líneas (simplificado) |
| `frontend/app/lib/auth/authService.ts` | -78 líneas |
| `frontend/app/api/auth/*/route.ts` | Validaciones añadidas |

### React Query Migrations
| Archivo | Cambio |
|---------|--------|
| `useParkingStatus.ts` | +438/-200 líneas (migrado) |
| `frontend/app/lib/groups/queries.ts` | +401 líneas (nuevas queries) |
| `*TabLazy.tsx` (4 archivos) | **Nuevos** - ~3,200 líneas total |

### UI Cleanups
| Módulo | Archivos afectados |
|--------|-------------------|
| BackOffice | 15 archivos |
| Parking | 12 archivos |
| Groups | 10 archivos |
| Profile | 8 archivos |
| Maintenance | 3 archivos |

---

## Valoración Final

### Puntuación por Área

| Área | Puntuación | Comentario |
|------|------------|------------|
| Estructura de commits | 9/10 | Atómicos y bien nombrados |
| Cumplimiento del plan | 8/10 | 5 de 7 prioridades completadas |
| Calidad del código | 6/10 | **Revisado a la baja** - errores lógicos encontrados |
| Documentación | 9/10 | Roadmap actualizado, notas de auth claras |
| Testing | ?/10 | No verificado - recomendado probar flujos |

### Resumen de Errores Encontrados

| Severidad | Cantidad | Descripción |
|-----------|----------|-------------|
| **CRÍTICO** | 1 | `handlePdfEditorSave` con código copiado incorrectamente |
| **ERROR** | 1 | Logout retorna 401 sin limpiar cookies |
| **LIMPIEZA** | 1 | ~260 líneas de MOCK_DATA en producción |
| **MENOR** | 3 | Dependencia useMemo, variable no usada, código muerto |

### Acciones Requeridas Antes de Merge

1. **OBLIGATORIO - Corregir errores críticos:**
   - [ ] Fix `handlePdfEditorSave` en `PendingInvoicesTabLazy.tsx`
   - [ ] Fix logout route para limpiar cookies siempre
   - [ ] Eliminar MOCK_DATA de `PaidInvoicesTabLazy.tsx`

2. **Ejecutar lint y corregir errores:**
   ```bash
   cd frontend && pnpm lint
   ```

3. **Probar flujos críticos manualmente:**
   - Login/Logout (especialmente con token expirado)
   - Validar factura con PDF (test de `handlePdfEditorSave`)
   - Parking status con cambio de fechas
   - BackOffice tabs (cambiar entre tabs, filtrar, paginar)

4. **Opcional pero recomendado:**
   - Migrar Maintenance a React Query (commit separado)
   - Eliminar console.logs de debug
   - Planificar SSR para dashboards

---

## Conclusión

**El trabajo tiene buena estructura pero contiene errores que requieren corrección antes del merge.**

Los commits siguen el plan establecido y están bien organizados. Sin embargo, se detectaron errores de copy-paste y lógica que pueden causar bugs en producción:

1. El error en `handlePdfEditorSave` puede causar comportamiento inesperado al validar facturas con PDF
2. El error en logout puede dejar usuarios en estado de autenticación inconsistente
3. El MOCK_DATA aumenta el bundle size innecesariamente

**NO listo para merge** hasta corregir los errores marcados como CRÍTICO y ERROR.

---

*Última actualización: 21 de Diciembre 2025*
