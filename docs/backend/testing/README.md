# Backend Testing - Notas Internas

Esta carpeta contiene notas internas y análisis de trabajo para el testing del backend.

---

## Contenido

### Notas de Planificación

- **`TESTING-REALITY-CHECK.md`**: Análisis realista de qué testear
  - Qué archivos SÍ necesitan tests
  - Qué archivos NO necesitan tests
  - Estimaciones reales de tiempo
  - Priorización por impacto

### Análisis de Seguridad

- **`SECURITY-FINDINGS.md`**: Vulnerabilidades encontradas en revisión de tests críticos
  - Vulnerabilidades detectadas y su severidad
  - Soluciones propuestas para cada vulnerabilidad
  - Plan de acción priorizado

---

## Ejecutar Tests

```bash
cd backend

# Todos los tests
pnpm test

# Con cobertura (genera backend/coverage/)
pnpm test:coverage

# Modo watch
pnpm test:watch

# Suite específica
pnpm vitest run tests/scheduling/corpus.test.ts
pnpm vitest run tests/scheduling/solver-parity.test.ts
```

El framework es **Vitest**. Los tests están en `backend/tests/`.

---

## Estructura Actual de Tests

```
backend/tests/
├── scheduling/
│   ├── corpus.test.ts           # TS validator vs fixtures JSON
│   └── solver-parity.test.ts   # Solver Python → TS validator
├── scheduling-corpus/
│   ├── fixtures/                # Corpus de fixtures JSON (F01…Fnn)
│   └── _schema.ts               # Tipos del corpus
├── helpers/
│   ├── auth-helpers.ts
│   ├── db-helpers.ts
│   └── test-data.ts
└── unit/
    ├── middlewares/
    │   ├── authenticateToken.test.ts
    │   ├── demoRestriction.test.ts
    │   └── roleCheck.test.ts
    └── validations/
        └── logbook-schemas.test.ts
```

---

**Propósito**: Documentación interna de trabajo de testing
