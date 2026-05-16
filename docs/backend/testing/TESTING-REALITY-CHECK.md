# Testing Reality Check - ¿Qué testear realmente?

## TL;DR

- **Archivos totales backend**: ~131
- **Archivos a testear**: ~40-50 (30-40%)
- **Tests a escribir**: ~150-200 tests
- **Objetivo cobertura**: 70% (NO 100%)
- **Tiempo estimado**: 4-6 semanas

---

## ❌ Lo que NO necesitas testear

### 1. Models/Types (no hay lógica)

```
models/
├── auth/index.ts          ❌ Solo interfaces TypeScript
├── logbook/index.ts       ❌ Solo tipos
├── cashier/index.ts       ❌ Solo tipos
└── group/index.ts         ❌ Solo tipos
```

**Razón**: Son definiciones de tipos, no tienen lógica ejecutable.

### 2. Routes (mapean URLs, sin lógica)

```
routes/
├── auth.routes.ts         ❌ Solo mapeo app.get('/login', controller)
├── logbook.routes.ts      ❌ Solo mapeo
└── cashier.routes.ts      ❌ Solo mapeo
```

**Razón**: Se testean indirectamente cuando testeas los controllers con supertest.

### 3. Config/Constants (valores estáticos)

```
config/
├── constants.ts           ❌ Solo exports const X = 'value'
├── cors-config.ts         ❌ Configuración estática
└── rate-limit-config.ts   ❌ Configuración estática
```

**Razón**: No hay lógica que testear.

### 4. Utilities simples (muy bajo riesgo)

```
utils/
├── date-formatter.ts      ⚪ Opcional (bajo riesgo)
├── string-helpers.ts      ⚪ Opcional
└── validators.ts          ⚪ Opcional
```

**Razón**: Si fallan, el impacto es mínimo. Si tienes tiempo extra, adelante.

### 5. Index.ts (solo exports)

```
services/logbook/index.ts  ❌ Solo export { service }
repositories/auth/index.ts ❌ Solo export { repo }
```

**Razón**: No hay lógica, solo re-exportan.

---

## ✅ Lo que SÍ necesitas testear

### P0 - CRÍTICO (Semana 1-2)

#### Middlewares (4 archivos, ~25 tests)
- ✅ `authenticateToken.ts` - **DONE** (13 tests)
- ✅ `roleCheck.ts` - **DONE** (30 tests)
- ⏳ `authenticateSession.ts` - TODO (~8 tests)
- ⏳ `demoRestriction.ts` - TODO (~5 tests)

#### Validaciones (3 archivos, ~30 tests)
- ✅ `logbook/logbook-schemas.ts` - **DONE** (31 tests)
- ⏳ `auth/auth-validation.ts` - TODO (~15 tests)
- ⏳ `cashier/cashier-validation.ts` - TODO (~20 tests)

#### Auth Module (5 archivos, ~20 tests)
- ⏳ `controllers/auth/login-controller.ts` - Integration tests
- ⏳ `controllers/auth/logout-controller.ts` - Integration tests
- ⏳ `services/auth/tokenService.ts` - Unit tests
- ⏳ `repositories/auth/user-repository.ts` - Unit tests (mock DB)
- ⏳ `repositories/auth/session-repository.ts` - Unit tests

**Total P0**: 12 archivos, ~105 tests

---

### P1 - ALTA (Semana 3-4)

#### Cashier Module (6 archivos, ~35 tests)
- ⏳ `controllers/cashier/shift-controller.ts` - Integration
- ⏳ `controllers/cashier/payment-controller.ts` - Integration
- ⏳ `services/cashier/shift-service.ts` - Unit
- ⏳ `repositories/cashier/shift-repository.ts` - Unit
- ⏳ `repositories/cashier/payment-repository.ts` - Unit
- ⏳ `repositories/cashier/voucher-repository.ts` - Unit

#### Groups Module (6 archivos, ~30 tests)
- ⏳ `controllers/group/group-controller.ts` - Integration
- ⏳ `controllers/group/payment-controller.ts` - Integration
- ⏳ `services/group/group-service.ts` - Unit
- ⏳ `repositories/group/group-repository.ts` - Unit
- ⏳ `repositories/group/payment-repository.ts` - Unit
- ⏳ `repositories/group/contact-repository.ts` - Unit

**Total P1**: 12 archivos, ~65 tests

---

### P2 - MEDIA (Semana 5)

#### Logbook Module (4 archivos, ~20 tests)
- ⏳ `controllers/logbook/logbook-controller.ts` - Integration
- ⏳ `services/logbook/history-service.ts` - Unit
- ⏳ `repositories/logbook/logbook-repository.ts` - Unit
- ⏳ `repositories/logbook/comment-repository.ts` - Unit

#### Parking Module (4 archivos, ~15 tests)
- ⏳ `controllers/parking/booking-controller.ts` - Integration
- ⏳ `services/parking/booking-service.ts` - Unit
- ⏳ `repositories/parking/booking-repository.ts` - Unit
- ⏳ `repositories/parking/vehicle-repository.ts` - Unit

**Total P2**: 8 archivos, ~35 tests

---

### P3 - BAJA (Semana 6)

#### Otros Módulos (6 archivos, ~15 tests)
- ⏳ `controllers/maintenance/maintenance-controller.ts` - Integration
- ⏳ `controllers/blacklist/blacklist-controller.ts` - Integration
- ⏳ `services/notifications/notification-service.ts` - Unit
- ⏳ `services/cron/cron-service.ts` - Unit (crítico pero bajo)
- ⏳ `repositories/maintenance/maintenance-repository.ts` - Unit
- ⏳ `repositories/blacklist/blacklist-repository.ts` - Unit

**Total P3**: 6 archivos, ~15 tests

---

## 📊 Resumen Total

| Prioridad | Archivos | Tests | Semanas | Estado |
|-----------|----------|-------|---------|--------|
| **P0 (Crítico)** | 12 | ~105 | 1-2 | 3/12 ✅ |
| **P1 (Alta)** | 12 | ~65 | 3-4 | 0/12 ⏳ |
| **P2 (Media)** | 8 | ~35 | 5 | 0/8 ⏳ |
| **P3 (Baja)** | 6 | ~15 | 6 | 0/6 ⏳ |
| **TOTAL** | **38** | **~220** | **6** | **3/38** |

---

## 🎯 Objetivo de Cobertura: 70%

### ¿Por qué 70% y no 100%?

**100% coverage es imposible y contraproducente**:
- ❌ Perderías tiempo testeando tipos/configs
- ❌ Tests de bajo valor (diminishing returns)
- ❌ Mantenimiento excesivo

**70% coverage es excelente porque**:
- ✅ Cubre toda la lógica crítica
- ✅ Equilibrio costo/beneficio óptimo
- ✅ Estándar de la industria

### Distribución esperada:

| Tipo de Archivo | Coverage Objetivo |
|-----------------|-------------------|
| Middlewares | 95-100% ✅ |
| Controllers | 80-90% |
| Services | 75-85% |
| Repositories | 70-80% |
| Validations | 90-100% |
| Utils | 50-60% (opcional) |
| Models/Types | 0% (no testeable) |
| Routes | 0% (testeo indirecto) |

---

## 📈 Progreso Actual

```
✅ Fase 0: Setup Inicial
├─ Vitest configurado
├─ Estructura de carpetas creada
├─ Helpers de test creados
└─ CI/CD: No configurado aún

⏳ Fase 1: Tests Críticos (25% completo)
├─ ✅ authenticateToken.test.ts (13 tests)
├─ ✅ roleCheck.test.ts (30 tests)
├─ ✅ logbook-schemas.test.ts (31 tests)
├─ ⏳ authenticateSession.test.ts (pendiente)
├─ ⏳ demoRestriction.test.ts (pendiente)
├─ ⏳ auth-validation.test.ts (pendiente)
└─ ⏳ Auth integration tests (pendiente)

Cobertura actual: ~5% backend (solo 3 archivos)
Tests escritos: 74/220 (34% del objetivo total)
```

---

## 🚀 Próximos Pasos Inmediatos

### Esta Semana (Completar P0)

1. **authenticateSession.test.ts** (~8 tests)
   - Session válida pasa
   - Session expirada rechaza
   - Sin session rechaza
   - req.user se setea

2. **demoRestriction.test.ts** (~5 tests)
   - Demo-admin bloqueado en POST/PUT/DELETE
   - Demo-admin permite GET
   - Admin permite todo

3. **auth-validation.test.ts** (~15 tests)
   - loginSchema valida username/password
   - registerSchema valida campos
   - Mensajes de error en español

4. **Integration: auth/login.test.ts** (~10 tests)
   - POST /login con supertest
   - Credenciales válidas → 200 + cookie
   - Credenciales inválidas → 401
   - Rate limiting

**Total esta semana**: 4 archivos, ~38 tests
**Cobertura esperada**: 15-20% backend

---

## 💡 Consejos Prácticos

### 1. No persigas el 100%

Si llegas a 70% en archivos críticos, **PARA**. Más tests = más mantenimiento.

### 2. Testea por impacto

```
Auth (login/logout) = 🔴 CRÍTICO
Cashier (dinero) = 🔴 CRÍTICO
Utilities (formateo) = 🟢 OPCIONAL
```

### 3. Usa el reporte HTML para priorizar

Cuando veas rojo en el coverage:
1. ¿Es lógica crítica? → Testear
2. ¿Es config/types? → Ignorar
3. ¿Es utility simple? → Decidir según tiempo

### 4. Tests de integración > Unit tests

Para controllers:
- ✅ 1 integration test (supertest) > 3 unit tests mockeados
- ✅ Testea el flujo real HTTP → DB

### 5. Refactoring después de tests

Si encuentras código difícil de testear:
1. Escribe el test (aunque sea feo)
2. Luego refactoriza el código
3. Nunca al revés

---

## 🎓 Reglas de Oro

1. **Tests primero para bugs críticos**: Si encuentras un bug en producción, escribe un test que lo reproduzca ANTES de arreglarlo

2. **No testees implementación, testea comportamiento**:
   - ❌ `expect(service.internalMethod).toHaveBeenCalled()`
   - ✅ `expect(result).toBe(expectedOutput)`

3. **Un test por concepto**: No pruebes 5 cosas en un solo test

4. **Nombres descriptivos**:
   - ❌ `it('should work')`
   - ✅ `it('debe RECHAZAR login con password incorrecto')`

5. **Tests independientes**: Cada test debe poder correr solo

---

## ❓ FAQ

**P: ¿Tengo que testear TODOS los repositorios?**
R: No. Solo los de módulos P0-P2. Maintenance/Blacklist son P3 (opcional).

**P: ¿Y los archivos de AI (services/ai/)?**
R: No. Son dependencias externas. Mockealos en tests.

**P: ¿Los archivos de scheduling (super complejos)?**
R: Prioridad P3. Si llegas, genial. Si no, con 70% global estás bien.

**P: ¿Y el frontend?**
R: Mismo enfoque. Testea componentes críticos (forms, auth), no todos los 200+ componentes.

**P: ¿Cuánto tiempo REALMENTE tomará?**
R:
- Si trabajas solo: 6-8 semanas
- Si trabajas con alguien: 4-5 semanas
- Si solo haces P0-P1: 3-4 semanas

---

**Última actualización**: 2026-01-04
**Archivos testeados**: 3/38 (8%)
**Cobertura actual**: ~5%
**Objetivo final**: 70%
