# Testing - Backend Four Points PMS

## Estado Actual

**74 tests pasando** en 3 archivos de test:

| Archivo | Tests | Descripción |
|---------|-------|-------------|
| `ai-validator.test.ts` | 24 | Validación de propuestas de IA |
| `constraints.test.ts` | 37 | Restricciones del scheduling |
| `scoring.test.ts` | 13 | Sistema de puntuación |

---

## Instalación

Se instaló **Vitest** como framework de testing:

```bash
pnpm add -D vitest
```

### Dependencia añadida en `package.json`:

```json
{
  "devDependencies": {
    "vitest": "^4.0.16"
  }
}
```

---

## Configuración

### Archivo: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### Scripts en `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Comandos

### Ejecutar todos los tests (una vez)
```bash
pnpm test
```

### Ejecutar tests en modo watch (re-ejecuta al guardar)
```bash
pnpm test:watch
```

### Ejecutar tests con reporte de cobertura
```bash
pnpm test:coverage
```

### Ejecutar un archivo específico
```bash
pnpm test tests/scheduling/constraints.test.ts
```

### Ejecutar tests que coincidan con un patrón
```bash
pnpm test -t "should pass when"
```

---

## Estructura de Tests

```
backend/
├── tests/
│   └── scheduling/
│       ├── ai-validator.test.ts   # Tests del validador de propuestas AI
│       ├── constraints.test.ts    # Tests de restricciones
│       └── scoring.test.ts        # Tests del sistema de puntuación
├── vitest.config.ts               # Configuración de Vitest
└── package.json                   # Scripts de test
```

---

## Cómo Funciona Vitest

### 1. Sintaxis Básica

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('NombreDelModulo', () => {
  let variable: TipoVariable

  beforeEach(() => {
    // Se ejecuta antes de cada test
    variable = crearInstancia()
  })

  it('should do something specific', () => {
    const result = variable.metodo()
    expect(result).toBe(valorEsperado)
  })
})
```

### 2. Assertions Comunes

```typescript
expect(valor).toBe(exacto)           // Igualdad estricta (===)
expect(valor).toEqual(objeto)        // Igualdad profunda
expect(valor).toBeTruthy()           // Truthy
expect(valor).toBeFalsy()            // Falsy
expect(valor).toBeNull()             // null
expect(valor).toBeDefined()          // No undefined
expect(valor).toBeGreaterThan(n)     // Mayor que
expect(valor).toBeLessThan(n)        // Menor que
expect(array).toHaveLength(n)        // Longitud de array
expect(array).toContain(item)        // Contiene elemento
expect(string).toContain('texto')    // Contiene substring
expect(fn).toThrow()                 // Lanza error
expect(obj).toHaveProperty('key')    // Tiene propiedad
```

### 3. Ejemplo Real del Proyecto

```typescript
// tests/scheduling/constraints.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { MaxConsecutiveWorkConstraint } from '../../services/scheduling/constraints/max-consecutive-work.constraint.js'

describe('MaxConsecutiveWorkConstraint', () => {
  let constraint: MaxConsecutiveWorkConstraint

  beforeEach(() => {
    constraint = new MaxConsecutiveWorkConstraint()
  })

  it('should fail when employee works 7 consecutive days', () => {
    const matrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M', ... }
    }
    const context = createMockContext(matrix, [employee], days)
    
    const result = constraint.check(context)
    
    expect(result.satisfied).toBe(false)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].severity).toBe('error')
  })
})
```

---

## Tests Implementados

### 1. AI Validator (`ai-validator.test.ts`)

Tests para `validateProposalStructure` y `validateAndApplyChanges`:

- Validación de estructura de propuestas JSON
- Rechazo de empleados/días inexistentes
- Protección de turnos especiales (V, B, IT)
- Validación de cobertura mínima
- Días consecutivos de trabajo
- Bloques de trabajo pequeños
- Noches aisladas
- Descanso post-noche (48h)
- Normalización de códigos (L1, L2 → L)

### 2. Constraints (`constraints.test.ts`)

**MaxConsecutiveWorkConstraint:**
- Máximo 6 días consecutivos de trabajo
- Cuenta N, P, PI como trabajo
- No cuenta V como trabajo

**ConsecutiveRestConstraint:**
- 2 días libres consecutivos por semana
- Cuenta V, B, IT como descanso
- Excepciones para empleados con turnos fijos

**NightBlockConstraint:**
- Bloques de noche de 4-6 días
- Penaliza noches dispersas
- Excepciones para turnos fijos

**CoverageConstraint:**
- Cobertura mínima por turno (M, T, N)
- Alerta de sobre-cobertura
- Excluye días festivos

**MonthlyLibreConstraint:**
- 8-12 días libres por mes
- Cuenta V, IT, B como descanso
- Excepciones para turnos fijos

### 3. Scoring (`scoring.test.ts`)

**FatigueScorer:**
- Penaliza días consecutivos de trabajo
- Penaliza trabajo reciente
- Reset después de descanso

**BalanceScorer:**
- Favorece empleados con menos carga

**BlockScorer:**
- Favorece continuación de bloques
- Penaliza trabajo aislado

**selectBestCandidate:**
- Selección con múltiples candidatos
- Respeta preferencias de turno
- Maneja casos sin candidatos

---

## Crear Nuevos Tests

### 1. Crear archivo en `tests/scheduling/`

```typescript
// tests/scheduling/nuevo-modulo.test.ts
import { describe, it, expect } from 'vitest'
import { MiModulo } from '../../services/scheduling/mi-modulo.js'

describe('MiModulo', () => {
  it('should work correctly', () => {
    // ...
  })
})
```

### 2. Ejecutar

```bash
pnpm test
```

---

## Tips

1. **Usa `test:watch` durante desarrollo** - re-ejecuta automáticamente
2. **Tests atómicos** - cada test debe ser independiente
3. **Nombres descriptivos** - `should reject when X happens`
4. **Mock data helpers** - reutiliza funciones como `createMockContext()`
5. **Un assert por test** (idealmente) - facilita debugging

---

## Próximos Pasos (Pendiente)

- [ ] Tests para las 13 fases del generador
- [ ] Tests de integración end-to-end
- [ ] Tests para API endpoints
