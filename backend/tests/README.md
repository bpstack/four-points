# Testing - Backend Four Points PMS

## Estado Actual

**188 tests pasando** + 5 skipped en 6 archivos de test:

| Archivo | Tests | Estado | Descripción |
|---------|-------|--------|-------------|
| `phases.test.ts` | 85 | ✅ | Sistema de fases del generador |
| `constraints.test.ts` | 37 | ✅ | Restricciones del scheduling |
| `ai-validator.test.ts` | 24 | ✅ | Validación de propuestas de IA |
| `edge-cases.test.ts` | 17 | ✅ | Casos extremos y validaciones |
| `phases-objective.test.ts` | 17 (5 skip) | ✅ | Objetivos específicos de fases |
| `scoring.test.ts` | 13 | ✅ | Sistema de puntuación |

**Total: 193 tests** (188 passing, 5 skipped)

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
│       ├── phases.test.ts             # Tests del sistema de fases (85 tests)
│       ├── constraints.test.ts        # Tests de restricciones (37 tests)
│       ├── ai-validator.test.ts       # Tests del validador de propuestas AI (24 tests)
│       ├── edge-cases.test.ts         # Tests de casos extremos (17 tests)
│       ├── phases-objective.test.ts   # Tests de objetivos de fases (17 tests)
│       ├── scoring.test.ts            # Tests del sistema de puntuación (13 tests)
│       └── validation-helpers.ts      # Helpers para tests de validación
├── vitest.config.ts                   # Configuración de Vitest
└── package.json                       # Scripts de test
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

### 1. Sistema de Fases (`phases.test.ts`) - 85 tests

**PhaseRegistry:**
- Registro y obtención de fases
- Inicialización del registro
- Manejo de errores en ejecución de fases

**Fases del Generador:**
- Fase 1: Inicialización de matriz
- Fase 2: Aplicación de reglas de empleados
- Fase 3: Asignación de días libres (FO)
- Fase 4: Asignación de turnos rotativos (M/T)
- Fase 5: Asignación de bloques de noche (N)
- Fase 6: Aplicación de restricciones
- Fase 7: Validación final
- Fase 8 (Opcional): Optimización con IA

**Cobertura:**
- Todas las fases del generador V2
- Manejo de errores y excepciones
- Validaciones intermedias

### 2. Constraints (`constraints.test.ts`) - 37 tests

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

### 3. AI Validator (`ai-validator.test.ts`) - 24 tests

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

### 4. Edge Cases (`edge-cases.test.ts`) - 17 tests

**Casos Extremos del Generador:**
- Meses con pocos empleados
- Configuraciones restrictivas
- Casos límite de cobertura
- Respuestas inválidas de IA
- Validación de cambios AI con turnos incorrectos
- Manejo de errores de parsing JSON

### 5. Phase Objectives (`phases-objective.test.ts`) - 17 tests (5 skipped)

**Objetivos Específicos de Cada Fase:**
- Objetivos de inicialización
- Objetivos de aplicación de reglas
- Objetivos de asignación de FO
- Objetivos de asignación M/T
- Objetivos de bloques de noche
- Tests de validación de objetivos alcanzados

### 6. Scoring (`scoring.test.ts`) - 13 tests

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

---

## 📊 Resultados y Análisis

### ✅ Estado General

- **Total de tests:** 193 (188 pasando, 5 skipped)
- **Tiempo de ejecución:** ~145ms
- **Cobertura:** Lógica de negocio del módulo scheduling

### 🎯 Áreas Bien Cubiertas

| Área | Cobertura | Nivel |
|------|-----------|-------|
| Sistema de Fases | 85 tests | ⭐⭐⭐⭐⭐ Excelente |
| Constraints | 37 tests | ⭐⭐⭐⭐⭐ Excelente |
| AI Validator | 24 tests | ⭐⭐⭐⭐⭐ Excelente |
| Edge Cases | 17 tests | ⭐⭐⭐⭐ Muy Bueno |
| Phase Objectives | 17 tests | ⭐⭐⭐⭐ Muy Bueno |
| Scoring | 13 tests | ⭐⭐⭐⭐ Muy Bueno |

### ⚠️ Áreas Sin Cobertura

1. **Tests de Integración E2E**
   - ❌ No hay tests que ejecuten el flujo completo desde HTTP request hasta DB
   - ❌ Falta simulación de generación completa con datos reales
   - ❌ No se prueba la interacción entre todos los componentes

2. **Tests de API Endpoints**
   - ❌ `POST /scheduling/generate` - Generar schedule
   - ❌ `GET /scheduling/months/:id` - Obtener schedule
   - ❌ `PUT /scheduling/config/:key` - Actualizar configuración
   - ❌ `POST /scheduling/ai/test` - Test de conexión AI
   - ❌ `GET /scheduling/ai/status` - Estado de AI

3. **Tests de Proveedores AI**
   - ❌ Tests unitarios para ClaudeProvider
   - ❌ Tests unitarios para GeminiProvider
   - ❌ Tests unitarios para GroqProvider
   - ❌ Tests unitarios para MinimaxProvider
   - ❌ Tests unitarios para OllamaProvider
   - ❌ Mocking de respuestas AI
   - ❌ Manejo de errores (timeout, rate limits, insufficient balance)

4. **Tests de Services**
   - ⚠️ `schedule-validation.service.ts` - Parcialmente cubierto
   - ❌ `schedule-pdf-export.service.ts` - Sin cobertura
   - ❌ Otros services del módulo

5. **Tests de Repositories**
   - ❌ `scheduling-repository.ts` - Queries a base de datos
   - ❌ Validación de datos guardados/recuperados

### 💡 Posibles Mejoras

#### Corto Plazo
1. **Aumentar cobertura de edge cases**
   - Más escenarios extremos (0 empleados, 100 empleados)
   - Configuraciones conflictivas
   - Datos corruptos o malformados

2. **Tests de AI Providers**
   - Mockear respuestas de cada proveedor
   - Validar manejo de errores específicos
   - Tests de timeout y retry logic

3. **Mejorar tests skipped**
   - Investigar por qué hay 5 tests skipped en `phases-objective.test.ts`
   - Completarlos o documentar por qué están skip

#### Medio Plazo
4. **Coverage report**
   - Ejecutar `pnpm test:coverage` regularmente
   - Objetivo: >80% de cobertura en archivos críticos

5. **Tests de regresión**
   - Documentar bugs encontrados en producción
   - Crear test específico para cada bug corregido

6. **Performance benchmarks**
   - Medir tiempo de generación con diferentes tamaños
   - Alertar si el rendimiento degrada

---

## 🗺️ Roadmap: Próximo Nivel

### Fase 1: Tests de API Endpoints (Prioridad Alta)

**Objetivo:** Probar todos los endpoints HTTP del módulo scheduling

**Archivos a crear:**
```
tests/
└── api/
    ├── scheduling-endpoints.test.ts    # Tests de endpoints principales
    ├── config-endpoints.test.ts        # Tests de configuración
    └── ai-endpoints.test.ts            # Tests de endpoints AI
```

**Herramientas necesarias:**
- `supertest` - Para hacer requests HTTP
- Mock de base de datos (o usar base de datos de test)

**Ejemplo de implementación:**
```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../index.js'

describe('POST /scheduling/generate', () => {
  it('should generate schedule for valid month', async () => {
    const response = await request(app)
      .post('/scheduling/generate')
      .send({ monthId: 1, userId: 'test-user' })
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('assignmentsCount')
  })

  it('should return 404 for non-existent month', async () => {
    await request(app)
      .post('/scheduling/generate')
      .send({ monthId: 99999, userId: 'test-user' })
      .expect(404)
  })
})
```

**Tests a implementar:**
- ✅ GET endpoints (obtener datos)
- ✅ POST endpoints (crear/generar)
- ✅ PUT endpoints (actualizar)
- ✅ DELETE endpoints (eliminar)
- ✅ Validación de parámetros
- ✅ Códigos de error correctos (400, 404, 500)
- ✅ Autenticación/autorización (si aplica)

**Estimación:** ~50-80 tests adicionales

---

### Fase 2: Tests End-to-End (Prioridad Alta)

**Objetivo:** Probar el flujo completo de generación de schedules

**Archivos a crear:**
```
tests/
└── e2e/
    ├── schedule-generation-flow.test.ts     # Flujo completo de generación
    ├── ai-optimization-flow.test.ts         # Flujo con optimización AI
    ├── config-update-flow.test.ts           # Actualización de configuración
    └── multi-user-scenarios.test.ts         # Escenarios con múltiples usuarios
```

**Ejemplo de test E2E:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestDB, teardownTestDB, seedTestData } from '../helpers/db-helpers.js'
import request from 'supertest'
import app from '../../index.js'

describe('E2E: Complete Schedule Generation Flow', () => {
  beforeAll(async () => {
    await setupTestDB()
    await seedTestData()
  })

  afterAll(async () => {
    await teardownTestDB()
  })

  it('should complete full schedule generation workflow', async () => {
    // 1. Crear mes
    const createResponse = await request(app)
      .post('/scheduling/months')
      .send({ year: 2026, month: 2 })
      .expect(201)

    const monthId = createResponse.body.id

    // 2. Configurar parámetros
    await request(app)
      .put(`/scheduling/config/min_morning_staff`)
      .send({ config_value: '2' })
      .expect(200)

    // 3. Generar schedule
    const generateResponse = await request(app)
      .post('/scheduling/generate')
      .send({ monthId, userId: 'test-user' })
      .expect(200)

    expect(generateResponse.body.success).toBe(true)
    expect(generateResponse.body.assignmentsCount).toBeGreaterThan(0)

    // 4. Verificar en base de datos
    const getResponse = await request(app)
      .get(`/scheduling/months/${monthId}`)
      .expect(200)

    expect(getResponse.body.status).toBe('generated')
    expect(getResponse.body.assignments).toHaveLength(generateResponse.body.assignmentsCount)

    // 5. Validar restricciones
    const validateResponse = await request(app)
      .post(`/scheduling/months/${monthId}/validate`)
      .expect(200)

    expect(validateResponse.body.errors.length).toBeLessThanOrEqual(12)
  })

  it('should handle AI optimization in full flow', async () => {
    // Similar pero con AI habilitado
  })

  it('should handle concurrent schedule generation', async () => {
    // Test de múltiples generaciones simultáneas
  })
})
```

**Tests a implementar:**
- ✅ Flujo completo: crear mes → configurar → generar → validar → exportar
- ✅ Flujo con AI: generar → optimizar con IA → validar mejora
- ✅ Flujo de actualización: generar → modificar asignación → re-validar
- ✅ Escenarios de fallo: manejar errores, rollbacks, recuperación
- ✅ Performance: generación con diferentes tamaños (5, 20, 50 empleados)
- ✅ Concurrencia: múltiples usuarios generando simultáneamente

**Estimación:** ~30-50 tests adicionales

---

### Fase 3: Tests de AI Providers (Prioridad Media)

**Objetivo:** Cubrir todos los proveedores de IA con tests unitarios

**Archivos a crear:**
```
tests/
└── ai/
    ├── claude-provider.test.ts
    ├── gemini-provider.test.ts
    ├── groq-provider.test.ts
    ├── minimax-provider.test.ts
    ├── ollama-provider.test.ts
    └── ai-client.test.ts
```

**Ejemplo de test de provider:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { ClaudeProvider } from '../../services/scheduling/ai/providers/claude-provider.js'
import Anthropic from '@anthropic-ai/sdk'

// Mock del SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn()
}))

describe('ClaudeProvider', () => {
  it('should send prompt and return response', async () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'AI response here' }]
    }

    const mockCreate = vi.fn().mockResolvedValue(mockResponse)
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: mockCreate }
    }))

    const provider = new ClaudeProvider({
      provider: 'claude',
      apiKey: 'test-key',
      model: 'claude-sonnet-4',
      temperature: 0.1,
      maxTokens: 2000,
      timeout: 30000,
      maxRetries: 3
    })

    const result = await provider.sendPrompt('test prompt')

    expect(result).toBe('AI response here')
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'claude-sonnet-4',
      max_tokens: 2000,
      temperature: 0.1,
      messages: [{ role: 'user', content: 'test prompt' }]
    })
  })

  it('should handle timeout errors', async () => {
    // Mock timeout
    const provider = new ClaudeProvider({ /* config */ })

    await expect(provider.sendPrompt('test')).rejects.toThrow('timeout')
  })

  it('should handle insufficient balance error', async () => {
    // Mock error 1008
    const mockCreate = vi.fn().mockRejectedValue({
      status: 500,
      error: { type: 'api_error', message: 'insufficient balance (1008)' }
    })

    // ...test error handling
  })
})
```

**Tests a implementar:**
- ✅ Envío de prompts y recepción de respuestas
- ✅ Manejo de timeouts
- ✅ Manejo de rate limits
- ✅ Manejo de errores de API (401, 500, etc.)
- ✅ Manejo de saldo insuficiente (MiniMax)
- ✅ Retry logic
- ✅ Validación de configuración

**Estimación:** ~40-60 tests adicionales

---

### Fase 4: Tests de Coverage y Optimización (Prioridad Baja)

**Objetivo:** Alcanzar >80% de cobertura en módulos críticos

**Acciones:**
1. Ejecutar `pnpm test:coverage` y analizar reporte HTML
2. Identificar archivos con baja cobertura
3. Crear tests específicos para líneas no cubiertas
4. Configurar umbral mínimo de coverage en CI/CD

**Ejemplo de configuración en `vitest.config.ts`:**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,        // Mínimo 80% de líneas
      functions: 80,    // Mínimo 80% de funciones
      branches: 75,     // Mínimo 75% de branches
      statements: 80,   // Mínimo 80% de statements
      include: [
        'services/scheduling/**/*.ts',
        'controllers/scheduling/**/*.ts'
      ],
      exclude: [
        'tests/**',
        '**/*.test.ts'
      ]
    }
  }
})
```

---

### Resumen del Roadmap

| Fase | Prioridad | Tests Estimados | Impacto |
|------|-----------|-----------------|---------|
| 1. API Endpoints | 🔴 Alta | ~50-80 | Validación de contratos HTTP |
| 2. End-to-End | 🔴 Alta | ~30-50 | Confianza en flujo completo |
| 3. AI Providers | 🟡 Media | ~40-60 | Robustez de integración AI |
| 4. Coverage | 🟢 Baja | Variable | Calidad del código |

**Total estimado:** ~150-250 tests adicionales

**Objetivo final:** ~340-440 tests totales con cobertura >80%

---

## 📋 Tracking de Progreso

### Progreso General

```
████████████████░░░░░░░░░░░░░░░░░░░░ 40%
```

| Categoría | Completado | Pendiente | Estado |
|-----------|------------|-----------|--------|
| **Unit Tests** | 193 | 0 | ✅ 100% |
| **API Endpoints** | 0 | ~60 | ⬜ 0% |
| **End-to-End** | 0 | ~40 | ⬜ 0% |
| **AI Providers** | 0 | ~50 | ⬜ 0% |
| **Coverage** | - | >80% | ⬜ 0% |

**Total:** 193/443 tests (~44%)

---

### Fase 0: Tests Unitarios ✅ COMPLETADO

#### ✅ Sistema de Fases (85 tests)
- [x] PhaseRegistry - registro y obtención
- [x] Manejo de errores en ejecución
- [x] Fase 1: Inicialización de matriz
- [x] Fase 2: Reglas de empleados
- [x] Fase 3: Asignación FO
- [x] Fase 4: Turnos rotativos M/T
- [x] Fase 5: Bloques de noche N
- [x] Fase 6: Aplicación restricciones
- [x] Fase 7: Validación final
- [x] Fase 8: Optimización IA (opcional)

#### ✅ Constraints (37 tests)
- [x] MaxConsecutiveWorkConstraint
- [x] ConsecutiveRestConstraint
- [x] NightBlockConstraint
- [x] CoverageConstraint
- [x] MonthlyLibreConstraint

#### ✅ AI Validator (24 tests)
- [x] Validación estructura JSON
- [x] Aplicación de cambios
- [x] Protección turnos especiales
- [x] Validación cobertura
- [x] Normalización códigos

#### ✅ Edge Cases (17 tests)
- [x] Pocos empleados
- [x] Configuraciones restrictivas
- [x] Respuestas inválidas IA
- [x] Errores parsing JSON

#### ✅ Phase Objectives (17 tests)
- [x] 12 tests completados
- [ ] 5 tests skipped (investigar)

#### ✅ Scoring (13 tests)
- [x] FatigueScorer
- [x] BalanceScorer
- [x] BlockScorer
- [x] selectBestCandidate

---

### Fase 1: API Endpoints ⬜ PENDIENTE (0/60)

#### POST /scheduling/generate (0/8)
- [ ] Generar schedule mes válido
- [ ] Error 404 mes inexistente
- [ ] Error 400 parámetros inválidos
- [ ] Error 401 sin autenticación
- [ ] Validar userId requerido
- [ ] Validar monthId válido
- [ ] Con AI habilitado
- [ ] Sin AI (algoritmo base)

#### GET /scheduling/months (0/5)
- [ ] Listar todos
- [ ] Filtrar por año
- [ ] Filtrar por status
- [ ] Paginación
- [ ] Auth requerida

#### GET /scheduling/months/:id (0/4)
- [ ] Obtener con assignments
- [ ] Error 404 inexistente
- [ ] Estructura válida
- [ ] Incluir días y empleados

#### POST /scheduling/months (0/5)
- [ ] Crear nuevo mes
- [ ] Validar año/mes
- [ ] Prevenir duplicados
- [ ] Error 409 si existe
- [ ] Generar días automáticamente

#### PUT /scheduling/months/:id (0/3)
- [ ] Actualizar status
- [ ] Validar transiciones
- [ ] Error 400 status inválido

#### DELETE /scheduling/months/:id (0/3)
- [ ] Eliminar mes + assignments
- [ ] Error 404 inexistente
- [ ] Solo draft

#### Config Endpoints (0/12)
- [ ] GET /scheduling/config
- [ ] PUT /scheduling/config/:key
- [ ] Validar ai_provider
- [ ] Validar min_staff
- [ ] Prevenir Ollama en prod
- [ ] Validar API keys

#### AI Endpoints (0/10)
- [ ] GET /scheduling/ai/status
- [ ] POST /scheduling/ai/test (Claude)
- [ ] POST /scheduling/ai/test (Gemini)
- [ ] POST /scheduling/ai/test (Groq)
- [ ] POST /scheduling/ai/test (MiniMax)
- [ ] Manejar timeout
- [ ] Manejar errores API

#### Otros (0/10)
- [ ] POST /months/:id/validate
- [ ] GET /months/:id/stats
- [ ] GET /months/:id/export/pdf

---

### Fase 2: End-to-End ⬜ PENDIENTE (0/40)

#### Flujo Base (0/5)
- [ ] Crear → Config → Generar → Validar
- [ ] Verificar DB
- [ ] Todos días asignados
- [ ] Status "generated"
- [ ] Export PDF

#### Flujo con AI (0/6)
- [ ] Generar con Claude
- [ ] Generar con Gemini
- [ ] Generar con Groq
- [ ] Generar con MiniMax
- [ ] Verificar reducción errores
- [ ] Medir tiempo optimización

#### Escenarios Error (0/5)
- [ ] Sin empleados activos
- [ ] Config imposible
- [ ] Timeout AI
- [ ] Rollback en fallo
- [ ] Mantener assignments previos

#### Actualización (0/5)
- [ ] Modificar manual → Re-validar
- [ ] Guardar modificaciones
- [ ] Validar restricciones
- [ ] Detectar nuevos errores
- [ ] Override AI

#### Configuración (0/5)
- [ ] Cambiar min_staff → Regenerar
- [ ] Cambiar ai_provider
- [ ] Múltiples configs
- [ ] Ollama en dev
- [ ] Provider sin API key

#### Performance (0/5)
- [ ] 5 empleados (<5s)
- [ ] 20 empleados (<15s)
- [ ] 50 empleados (<30s)
- [ ] Validación (<1s)
- [ ] Export PDF (<3s)

#### Concurrencia (0/9)
- [ ] 2 usuarios paralelos
- [ ] Modificar mismo schedule
- [ ] Validaciones concurrentes
- [ ] Race conditions

---

### Fase 3: AI Providers ⬜ PENDIENTE (0/50)

#### ClaudeProvider (0/10)
- [ ] Prompt → respuesta válida
- [ ] Formato request Anthropic
- [ ] Timeout >30s
- [ ] Error 401 (key inválida)
- [ ] Error 429 (rate limit)
- [ ] Error 500
- [ ] Retry logic
- [ ] Modelo configurado
- [ ] Parámetros (temp, tokens)
- [ ] isAvailable() check

#### GeminiProvider (0/10)
- [ ] Prompt → respuesta
- [ ] Formato request Gemini
- [ ] Timeout
- [ ] Auth error
- [ ] Rate limiting
- [ ] Retry
- [ ] Modelo/parámetros
- [ ] isAvailable()
- [ ] Respuestas malformadas
- [ ] Parse JSON

#### GroqProvider (0/10)
- [ ] OpenAI-compatible API
- [ ] BaseURL correcta
- [ ] Timeout
- [ ] Auth error
- [ ] Rate limiting
- [ ] Retry
- [ ] Modelo llama-3.3
- [ ] isAvailable()
- [ ] Streaming
- [ ] Performance

#### OllamaProvider (0/5)
- [ ] localhost:11434
- [ ] Modelo local
- [ ] Servidor no disponible
- [ ] Timeout 180s
- [ ] isAvailable() (sin key)

#### AIClient (0/5)
- [ ] Crear con provider
- [ ] Switch providers
- [ ] Fallback chain
- [ ] PROVIDER_ENABLED
- [ ] Cache (opcional)

---

### Fase 4: Coverage ⬜ PENDIENTE

#### Métricas (0/8)
- [ ] Ejecutar coverage
- [ ] Analizar HTML
- [ ] Archivos <50%
- [ ] Tests líneas faltantes
- [ ] >80% services/
- [ ] >80% controllers/
- [ ] Config vitest umbral
- [ ] Integrar CI/CD

#### Services (0/4)
- [ ] schedule-validation.service.ts
- [ ] schedule-pdf-export.service.ts
- [ ] schedule-generator-v2.ts
- [ ] ai-prompt-builder.ts

#### Repositories (0/4)
- [ ] scheduling-repository.ts
- [ ] Mock MySQL
- [ ] Validar datos DB
- [ ] Tests transacciones

#### Performance (0/4)
- [ ] Benchmark generación
- [ ] Benchmark validación
- [ ] Memory profiling
- [ ] Alertas regresión

---

### 📝 Acciones Pendientes

#### Inmediato
- [ ] Investigar 5 tests skipped en `phases-objective.test.ts`
- [ ] Instalar `supertest` para tests API
- [ ] Configurar base de datos de test
- [ ] Crear helpers setup/teardown DB

#### Esta Semana
- [ ] Implementar primeros 10 tests API endpoints
- [ ] Documentar bugs conocidos

#### Este Mes
- [ ] Completar Fase 1 (API Endpoints)
- [ ] Iniciar Fase 2 (E2E básico)
- [ ] Alcanzar 300+ tests totales

---

### 🎯 Objetivos

| Métrica | Meta | Actual | Estado |
|---------|------|--------|--------|
| Tests Unitarios | 200+ | 193 | ✅ 96% |
| Tests API | 60+ | 0 | ⬜ 0% |
| Tests E2E | 40+ | 0 | ⬜ 0% |
| Tests Providers | 50+ | 0 | ⬜ 0% |
| Coverage | >80% | ? | ⬜ ? |
| Tiempo | <5s | 145ms | ✅ |

**Objetivo Final:** 440+ tests, >80% coverage

---

**Última actualización:** 2026-01-05
