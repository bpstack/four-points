# Coverage - Sistema de Cobertura de Código

## Herramienta

El backend usa **Vitest** con proveedor `v8`. La configuración está en `backend/vitest.config.ts`.

---

## Ejecutar Cobertura

```bash
cd backend

# Cobertura completa (genera backend/coverage/)
pnpm test:coverage

# Abrir reporte HTML (Windows)
start coverage/index.html
```

El reporte se genera en `backend/coverage/` y se sobreescribe con cada ejecución. Los números que aparezcan ahí son siempre actuales.

---

## Estado Actual de Tests

Los tests están en `backend/tests/`:

| Suite | Archivo | Descripción |
|-------|---------|-------------|
| Unit middlewares | `tests/unit/middlewares/*.test.ts` | `authenticateToken`, `demoRestriction`, `roleCheck` |
| Unit validations | `tests/unit/validations/logbook-schemas.test.ts` | Schemas Zod de logbook |
| Scheduling corpus | `tests/scheduling/corpus.test.ts` | Validador TS vs fixtures JSON |
| Scheduling parity | `tests/scheduling/solver-parity.test.ts` | Solver Python → validador TS |

Para métricas actualizadas ejecutar `pnpm test:coverage` y revisar el reporte HTML.

---

## Módulos con Cobertura Alta

Los middlewares de autenticación tienen cobertura completa:

| Archivo | Estado |
|---------|--------|
| `middlewares/authenticateToken.ts` | Tests completos |
| `middlewares/demoRestriction.ts` | Tests completos |
| `middlewares/roleCheck.ts` | Tests completos |
| `middlewares/rateLimiter.ts` | Sin tests |

El módulo de scheduling tiene su propio corpus de fixtures en `tests/scheduling-corpus/fixtures/`.

---

## Módulos sin Cobertura

| Categoría | Cobertura |
|-----------|-----------|
| controllers/ | Sin tests de integración |
| repositories/ | Sin tests |
| services/ (excepto scheduling) | Sin tests |
| routes/ | Sin tests |

Ver `docs/backend/testing/TESTING-REALITY-CHECK.md` para priorización.

---

## Configuración

```typescript
// backend/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
```

---

## Nota

El archivo `docs/coverage/info.md` contiene información estática de referencia. Para números reales siempre ejecutar `pnpm test:coverage`.
