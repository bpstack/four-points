# Diagnóstico Rama `improve` vs `main`

**Fecha:** 21 de Diciembre 2025  
**Rama analizada:** `improve`  
**Comparada con:** `main`

---

## Resumen Ejecutivo (backup 21-dic-2025)

| Métrica | Valor |
|---------|-------|
| Commits en `improve` (vs main) | 3 |
| Archivos modificados sin commitear | 120+ |
| Archivos nuevos sin trackear | 4 |
| Líneas añadidas (sin commitear) | ~3,800 |
| Líneas eliminadas (sin commitear) | ~2,600 |

**Problema principal:** gran volumen de trabajo sin commitear (más de 120 archivos) que mezcla varias features y refactors. Se necesitan commits atómicos y push a remoto para respaldo.

---

## Estado del Plan Original

### Prioridades del `improve-roadmap.md`

| # | Tarea | Estado Commits | Estado Working Dir |
|---|-------|----------------|-------------------|
| 1 | Unificar variables de entorno (`env.ts`) | Commiteado | Completo |
| 2 | Endurecer Route Handlers de auth | Parcial | **Completo (sin commit)** |
| 3 | Estrategia de tokens (eliminar localStorage) | Parcial | **Completo (sin commit)** |
| 4 | Back Office - React Query/lazy | No commiteado | **En progreso (sin commit)** |
| 5 | Parking - React Query | No commiteado | **Completo (sin commit)** |
| 6 | SSR/Prerender | No iniciado | No iniciado |
| 7 | NextAuth/middleware | No iniciado | No iniciado |

---

## Lo que ESTÁ Bien Hecho

### 1. Helper `env.ts` (Commiteado)
```typescript
// frontend/app/lib/env.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
export const SERVER_API_BASE_URL = process.env.NEXT_SERVER_API_URL || API_BASE_URL
```
- Centraliza URLs de API
- Distingue cliente vs servidor
- Fallback a localhost correcto

### 2. Eliminación de localStorage en `apiClient` (Parcial commit + working dir)
- Eliminadas todas las ramas `if (isDev)` que usaban localStorage
- Ahora solo confía en cookies HttpOnly
- `hasRefreshToken()` ahora verifica `document.cookie` en lugar de localStorage
- Limpieza de cookies consistente en errores de auth

### 3. Route Handlers Endurecidos (Sin commit - en working dir)
Mejoras aplicadas a todos los handlers (`login`, `logout`, `me`, `refresh`, `register`):
- Validación de origen (whitelist)
- Validación de Content-Type
- Validación de cookies requeridas
- Mensajes de error claros y consistentes
- Manejo seguro de respuestas del backend con `.catch(() => null)`

### 4. Migración React Query - Parking (Sin commit)
`frontend/app/dashboard/parking/status/hooks/useParkingStatus.ts`:
- Migrado completamente de `useState/useEffect` a React Query
- Queries separadas: `stats`, `bookings`, `overdue`, `spots`
- Claves por fecha: `['parking', 'stats', date]`
- Mutations con invalidación automática
- Funciones `deriveSpots` y `deriveActiveBookings` para cálculos derivados
- `staleTime` y `gcTime` configurados correctamente

### 5. Componentes Lazy BackOffice (Sin commit - nuevos archivos)
- `PendingInvoicesTabLazy.tsx`
- `PaidInvoicesTabLazy.tsx`
- `SettingsTabLazy.tsx`
- `SuppliersTabLazy.tsx`

Implementan React Query con:
- `initialData` desde SSR
- `staleTime: 5 * 60 * 1000`
- `refetchOnWindowFocus: false`
- Invalidación selectiva por tab

---

## Errores y Problemas Detectados

### Error 1: Validación de método redundante (Menor)
**Ubicación:** Todos los Route Handlers de auth

```typescript
// frontend/app/api/auth/login/route.ts:24
export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {  // <-- NUNCA SE EJECUTA
    return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
  }
```

**Problema:** En Next.js App Router, el método está implícito por el nombre de la función exportada (`POST`, `GET`). Next.js solo enruta al handler correcto, por lo que esta validación es dead code.

**Solución:** Eliminar estas validaciones o, si se desea mantener por seguridad defensiva, documentar que es intencional.

---

### Error 2: Estado `deleteDialogOpen` no declarado (Crítico)
**Ubicación:** `frontend/app/components/bo/tabs/PendingInvoicesTabLazy.tsx:223`

```typescript
setDeleteDialogOpen(false)  // <-- deleteDialogOpen no está declarado
```

**Problema:** Se usa `setDeleteDialogOpen` pero no existe `const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)` en el componente.

**Solución:** Añadir la declaración del estado:
```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
```

---

### Error 3: Handlers declarados pero sin uso visible
**Ubicación:** `PendingInvoicesTabLazy.tsx`

```typescript
const handleBulkValidateAction = handleBulkValidate  // Línea 355
const handleDeleteAction = handleDelete              // Línea 243
```

**Problema:** Variables asignadas pero no usadas en el JSX visible.

**Solución:** Verificar si se usan en algún botón o eliminar si son dead code.

---

### Error 4: Inconsistencia en documentación
**Ubicación:** `improve-roadmap.md:35-38`

```markdown
- [ ] Crear `env.ts` y sustituir referencias...
- [ ] Añadir validaciones en Route Handlers...
```

**Problema:** Las tareas están marcadas como pendientes (`[ ]`) pero el código ya está implementado.

**Solución:** Actualizar el roadmap marcando tareas completadas:
```markdown
- [x] Crear `env.ts` y sustituir referencias...
- [x] Añadir validaciones en Route Handlers...
```

---

### Error 5: Archivos mezclados en working directory
**Problema:** Los 127 archivos modificados mezclan múltiples features:
- Cambios de auth/env (Prioridad 1-3)
- Migración React Query (Prioridad 4-5)
- Refactorizaciones de UI generales
- Mejoras de componentes no relacionadas

**Riesgo:** 
- Difícil hacer rollback de una feature específica
- Code review complejo
- Si algo falla, afecta todo

**Solución recomendada:** Hacer commits atómicos por feature:
1. `feat: unify env variables and harden auth routes`
2. `feat: migrate parking to react query`
3. `feat: migrate backoffice tabs to react query with lazy loading`
4. `refactor: ui improvements and component cleanup`

---

## Archivos Críticos Sin Commitear

### Alta prioridad (core auth/api)
| Archivo | Cambios |
|---------|---------|
| `frontend/app/lib/apiClient.ts` | -211 líneas refactorizadas |
| `frontend/app/lib/auth/authService.ts` | -78 líneas simplificadas |
| `frontend/app/api/auth/*/route.ts` | Validaciones añadidas |

### Media prioridad (React Query)
| Archivo | Cambios |
|---------|---------|
| `frontend/app/dashboard/parking/status/hooks/useParkingStatus.ts` | Migración completa |
| `frontend/app/lib/groups/queries.ts` | +401 líneas (nuevas queries) |
| `frontend/app/components/bo/tabs/*.tsx` | Migración a React Query |

### Archivos nuevos (untracked)
```
AUTH_TOKENS_NOTES.md
frontend/app/components/bo/tabs/PaidInvoicesTabLazy.tsx
frontend/app/components/bo/tabs/PendingInvoicesTabLazy.tsx
frontend/app/components/bo/tabs/SettingsTabLazy.tsx
frontend/app/components/bo/tabs/SuppliersTabLazy.tsx
```

---

## Recomendaciones

### Inmediatas
1. **Corregir el error de `deleteDialogOpen`** antes de cualquier commit
2. **Hacer commits atómicos** separando por feature
3. **Actualizar `improve-roadmap.md`** marcando tareas completadas

### Antes de merge a main
1. Testear flujo completo de login/logout/refresh
2. Verificar que no hay regresiones en BackOffice
3. Probar parking status con diferentes fechas
4. Verificar que las cookies funcionan en dev y prod

### Estructura de commits sugerida
```bash
# Commit 1: Core auth
git add frontend/app/lib/env.ts frontend/app/lib/apiClient.ts \
        frontend/app/lib/auth/*.ts frontend/app/api/auth/**/*.ts \
        AUTH_TOKENS_NOTES.md
git commit -m "feat: unify env vars, harden auth routes, remove localStorage"

# Commit 2: Parking React Query
git add frontend/app/dashboard/parking/status/hooks/useParkingStatus.ts \
        frontend/app/lib/parking/*.ts
git commit -m "feat: migrate parking status to react query"

# Commit 3: BackOffice React Query
git add frontend/app/components/bo/**/*.tsx \
        frontend/app/lib/backoffice/*.ts \
        frontend/app/dashboard/bo/*.tsx
git commit -m "feat: migrate backoffice to react query with lazy tabs"

# Commit 4: Resto de mejoras
git add .
git commit -m "refactor: ui improvements and component cleanup"
```

---

## Conclusión

El trabajo realizado es **sustancial y de buena calidad**, pero está casi todo sin commitear. Los cambios siguen el plan establecido en `improve-roadmap.md` y `improvements.md`, con algunas adiciones extra (refactorizaciones de UI).

**Acción inmediata requerida:** Corregir el bug de `deleteDialogOpen` y hacer commits estructurados para preservar el trabajo y facilitar el review.

---

*Generado automáticamente por análisis de código*
