# ROADMAP - SISTEMA DE GENERACIÓN DE HORARIOS

> Plan detallado de implementación con fases, tareas y estimaciones.

---

## HISTORIAL DE TRABAJO REALIZADO

### Fecha: Diciembre 2024

---

## RESUMEN DE IMPLEMENTACIÓN COMPLETADA

### 1. BASE DE DATOS (100% Completado)

**Tablas creadas en `backend/db-mysql/`:**
- `scheduling_config` - Configuración global del sistema
- `scheduling_shifts` - Tipos de turnos (M, T, N, PI, L, V, B, E, IT, P, FO, A)
- `scheduling_months` - Meses/plannings con estados (draft, generated, published)
- `scheduling_days` - Días del mes con festivos y ocupación
- `scheduling_assignments` - Asignaciones turno-empleado-día
- `scheduling_constraints` - Restricciones (vacaciones, bajas, peticiones)
- `scheduling_employee_rules` - Reglas por empleado (Salvador, Andrés, Ana R)
- `scheduling_schedulable_employees` - Empleados incluidos en generación
- `scheduling_history` - Historial de cambios

**Scripts SQL:**
- `backend/db-mysql/local/` y `backend/db-mysql/aiven/` - Versiones para desarrollo y producción

---

### 2. BACKEND - ESTRUCTURA COMPLETA (100% Completado)

**Arquitectura de carpetas implementada:**

```
backend/
├── controllers/scheduling/
│   └── scheduling-controller.ts       # Controladores REST
├── repositories/scheduling/
│   └── scheduling-repository.ts       # Queries a BD
├── routes/scheduling/
│   └── scheduling-routes.ts           # Rutas Express
├── services/scheduling/
│   ├── schedule-generator.service.ts  # Orquestador principal
│   ├── types/
│   │   └── index.ts                   # Types e interfaces
│   ├── utils/
│   │   └── index.ts                   # Utilidades (countShiftOnDay, isWorkShift, etc)
│   ├── constraints/
│   │   └── rotation-continuity.constraint.ts  # Continuidad de rotación
│   └── phases/                        # Sistema de fases modular
│       ├── index.ts                   # Registry y exports
│       ├── base-phase.ts              # Clase base abstracta
│       ├── registry.ts                # Registro de fases
│       ├── initialize-matrix.phase.ts # Fase 10: Crear matriz
│       ├── apply-constraints.phase.ts # Fase 20: Aplicar restricciones
│       ├── apply-employee-rules.phase.ts # Fase 30: Reglas empleados
│       ├── assign-night-blocks.phase.ts  # Fase 40: Bloques nocturnos
│       ├── enforce-post-night-rest.phase.ts # Fase 45: Descanso post-noche
│       ├── assign-rotating-shifts.phase.ts  # Fase 50: Turnos M/T
│       ├── assign-weekly-offs.phase.ts      # Fase 60: Libres semanales
│       ├── repair-small-blocks.phase.ts     # Fase 85: Reparar bloques <3 días
│       ├── validate-fix-coverage.phase.ts   # Fase 70: Validar cobertura
│       ├── assign-pi-support.phase.ts       # Fase 80: Asignar PI
│       └── final-validation.phase.ts        # Fase 90: Validación final
├── validations/scheduling/
│   └── scheduling-validation.ts       # Validaciones Zod
└── API REST/scheduling/
    └── scheduling.http                # Tests de endpoints
```

**Endpoints implementados:**
- `GET/POST /api/scheduling/months` - CRUD de meses
- `GET/PUT/DELETE /api/scheduling/months/:id` - Operaciones por mes
- `POST /api/scheduling/months/:id/generate` - Generar horario
- `POST /api/scheduling/months/:id/validate` - Validar horario
- `PUT /api/scheduling/months/:id/unpublish` - Despublicar mes
- `GET/POST/PUT/DELETE /api/scheduling/constraints` - Restricciones
- `GET/POST/DELETE /api/scheduling/employees` - Empleados programables
- `GET/POST/PUT/DELETE /api/scheduling/rules` - Reglas de empleados
- `GET /api/scheduling/config` - Configuración
- `GET /api/scheduling/shifts` - Tipos de turno

---

### 3. MOTOR DE GENERACIÓN - SISTEMA DE FASES (100% Implementado)

**Arquitectura modular por fases:**

| Orden | Fase | Archivo | Descripción |
|-------|------|---------|-------------|
| 10 | InitializeMatrix | `initialize-matrix.phase.ts` | Crea matriz vacía [empleado][día] |
| 20 | ApplyConstraints | `apply-constraints.phase.ts` | Aplica vacaciones, bajas, festivos |
| 30 | ApplyEmployeeRules | `apply-employee-rules.phase.ts` | Ana R (L-V, P), Salvador (pref M), Andrés (pref T) |
| 40 | AssignNightBlocks | `assign-night-blocks.phase.ts` | 4-6 noches consecutivas por empleado |
| 45 | EnforcePostNightRest | `enforce-post-night-rest.phase.ts` | 48h descanso tras bloque nocturno |
| 50 | AssignRotatingShifts | `assign-rotating-shifts.phase.ts` | Asigna M/T respetando cobertura |
| 60 | AssignWeeklyOffs | `assign-weekly-offs.phase.ts` | 2 días libres consecutivos por semana |
| 70 | ValidateFixCoverage | `validate-fix-coverage.phase.ts` | Valida y ajusta cobertura mín/máx |
| 80 | AssignPISupport | `assign-pi-support.phase.ts` | Asigna PI cuando hay solo 1 en M/T |
| 85 | RepairSmallBlocks | `repair-small-blocks.phase.ts` | Repara bloques de trabajo <3 días |
| 90 | FinalValidation | `final-validation.phase.ts` | Genera warnings finales |

**Características del sistema de fases:**
- Cada fase es independiente y testeable
- Orden de ejecución configurable
- Logs detallados por fase
- Warnings acumulativos
- Fácil de extender con nuevas fases

---

### 4. CONSTRAINTS IMPLEMENTADOS

**Continuidad de Rotación** (`rotation-continuity.constraint.ts`):
- Solo considera meses **PUBLISHED** para continuidad
- Obtiene último turno del mes anterior publicado
- Mantiene rotación M→T→N entre meses
- Si no hay mes anterior publicado, usa rotación libre

**Tipos de restricciones soportados:**
- `vacation` - Vacaciones (prioridad 2)
- `sick_leave` - Baja médica IT (prioridad 1)
- `holiday` - Festivo empresa (prioridad 3)
- `training` - Formación FO (prioridad 4)
- `request_off` - Petición día libre (prioridad 5)
- `request_shift` - Petición turno específico (prioridad 6)
- `request_no_shift` - Evitar turno (prioridad 6)
- `sick_day` - Enfermedad puntual (prioridad 7)

---

### 5. FRONTEND (100% Completado)

**Estructura implementada:**

```
frontend/app/
├── dashboard/scheduling/
│   ├── page.tsx                    # Lista de meses
│   ├── [monthId]/
│   │   └── page.tsx                # Vista detalle del mes
│   ├── components/
│   │   ├── ScheduleTable.tsx       # Tabla principal
│   │   ├── ShiftCell.tsx           # Celda de turno (editable)
│   │   ├── EmployeeRow.tsx         # Fila de empleado
│   │   ├── DayHeader.tsx           # Cabecera de días
│   │   ├── DailyStatsRow.tsx       # Estadísticas diarias
│   │   ├── StatsPanel.tsx          # Panel lateral de stats
│   │   ├── ShiftLegend.tsx         # Leyenda de turnos
│   │   ├── GenerateModal.tsx       # Modal de generación
│   │   ├── ConstraintModal.tsx     # Modal de restricciones
│   │   └── ConstraintsPanel.tsx    # Panel de restricciones
│   ├── hooks/
│   │   └── useScheduling.ts        # Hook principal
│   └── stores/
│       └── scheduling-store.ts     # Estado Zustand
└── lib/scheduling/
    ├── queries.ts                  # React Query hooks
    └── types.ts                    # Types frontend
```

**Funcionalidades UI:**
- Vista de tabla tipo Excel con días en columnas
- Celdas editables con dropdown de turnos
- Colores por tipo de turno
- Panel de estadísticas por empleado
- Estadísticas diarias (cobertura M/T/N/PI)
- Modal de generación con opciones
- Gestión de restricciones
- Publicar/Despublicar mes
- Responsive design

---

### 6. REGLAS DE NEGOCIO IMPLEMENTADAS

**Reglas de días consecutivos:**
- **Mínimo 3 días** de trabajo consecutivos
- **Máximo 6 días** de trabajo consecutivos
- Fase de reparación intenta corregir bloques pequeños

**Descanso semanal:**
- 2 días libres consecutivos por semana (48h)
- Post-noche: mínimo día libre después del bloque nocturno

**Cobertura diaria:**
- Mañana (M): mínimo 1, preferido 2, máximo 3
- Tarde (T): mínimo 1, preferido 2, máximo 3
- Noche (N): siempre 1
- PI: cuando solo hay 1 persona en M o T

**Noches:**
- Cada empleado: 4-6 noches consecutivas por mes
- Distribuidas para no solapar bloques

**Empleados especiales:**
- Ana R: Solo L-V, turno P (Presencia)
- Salvador: Prioridad mañanas, máx 4-5 tardes/mes
- Andrés: Prioridad tardes, máx 4-5 mañanas/mes

---

### 7. TRABAJO EN SESIÓN ACTUAL (24 Diciembre 2024)

#### Problema identificado: Bloques de trabajo pequeños

El sistema generaba muchos bloques de 1-2 días de trabajo, violando la regla de mínimo 3 días consecutivos.

#### Cambios realizados:

**1. `assign-weekly-offs.phase.ts` (líneas 104-226)**

Mejorada la función `findBestConsecutivePairForLibre()`:
- Añadido flag `createsSmallBlock` para evaluar cada par de días libres
- Nueva prioridad de selección:
  1. Pares viables que NO crean bloques pequeños
  2. Cualquier par que no crea bloques pequeños (aunque cobertura sea ajustada)
  3. Pares viables (último recurso)

```typescript
// Análisis de cada par potencial de días libres
for (const pair of potentialPairs) {
  const createsSmallBlock = checkIfCreatesSmallBlock(context, employeeId, pair);
  if (!createsSmallBlock && isViable) {
    viablePairsNoSmallBlock.push(pair);
  }
  // ... más lógica de priorización
}
```

**2. NUEVO: `repair-small-blocks.phase.ts`**

Nueva fase (orden 85) que repara bloques pequeños post-generación:

```typescript
export class RepairSmallBlocksPhase extends BasePhase {
  readonly name = 'RepairSmallBlocks'
  readonly order = 85  // Después de PI (80), antes de validación final (90)

  execute(context: GeneratorContext): PhaseResult {
    // 1. Encontrar todos los bloques < 3 días
    const smallBlocks = this.findSmallWorkBlocks(context, employeeId);
    
    // 2. Intentar reparar cada uno:
    //    a) Extender antes: convertir L adyacentes a trabajo
    //    b) Extender después: convertir L adyacentes a trabajo
    //    c) Último recurso: convertir bloque entero a L
    
    // 3. Respetar límites de cobertura al extender
  }
}
```

**3. `assign-pi-support.phase.ts` (líneas 104-117)**

Añadida verificación para no asignar PI en días libres aislados:

```typescript
// Solo asignar PI si el día tiene trabajo adyacente
const hasAdjacentWork = hasWorkBefore || hasWorkAfter;
if (!hasAdjacentWork) {
  continue; // No asignar PI en día libre aislado
}
```

**4. `phases/index.ts`**

- Registrada `RepairSmallBlocksPhase` en el registry
- Actualizado orden de fases documentado

#### Resultados:

| Métrica | Antes | Después |
|---------|-------|---------|
| Empleados | 8 | 7 (quitaste uno) |
| Violaciones bloques pequeños | 25-27 | 15 |
| Empleados sin violaciones | 0 | 1 (Sara) |

**Estado actual por empleado (7 empleados):**

| Empleado | Bloques | Libres | Violaciones |
|----------|---------|--------|-------------|
| adriana | 6,4,3,2,3,1,2 | 10 | 3 (bloques de 2,1,2 días) |
| Andrés | 1,3,3,1,3,4,1,2 | 13 | 4 (bloques de 1,1,1,2 días) |
| MartaR | 2,4,5,5,3,1 | 11 | 2 (bloques de 2,1 días) |
| **Sara** | 5,4,3,4,3 | 12 | **0 - OK** |
| Hugo | 3,2,4,6,3,3 | 10 | 1 (bloque de 2 días) |
| Elena | 2,6,6,3,3 | 11 | 1 (bloque de 2 días) |
| PaulaMarmol | 3,1,3,1,3,2,5,1 | 12 | 4 (bloques de 1,1,2,1 días) |

---

### 8. ARCHIVOS MODIFICADOS EN ESTA SESIÓN

```
backend/services/scheduling/phases/
├── assign-weekly-offs.phase.ts      # Mejorado algoritmo de selección de libres
├── assign-pi-support.phase.ts       # Evitar PI en días aislados
├── repair-small-blocks.phase.ts     # NUEVO - Fase de reparación
└── index.ts                         # Registrar nueva fase

Herramientas creadas:
├── analyze-blocks.js                # Script Node.js para analizar bloques
```

---

### 9. WARNINGS ACTUALES DEL SISTEMA

El sistema genera warnings para:
- Bloques de noches menores a 4 (Hugo: 3 noches)
- Semanas sin 2 días libres consecutivos (varios empleados)
- Empleados con más de 12 días libres (Andrés: 13)
- Bloques de trabajo < 3 días (detectados en validación final)

---

### 10. PRÓXIMOS PASOS RECOMENDADOS

1. **Mejorar fase de reparación** - Ser más agresivo fusionando bloques adyacentes
2. **Modificar `assign-rotating-shifts.phase.ts`** - Crear bloques más largos desde el inicio
3. **Ajustar `assign-weekly-offs.phase.ts`** - No fragmentar bloques existentes
4. **Balancear días libres** - Algunos empleados tienen 13, otros 10
5. **Optimizar distribución de noches** - Evitar que alguien tenga solo 3

---

## RESUMEN EJECUTIVO ORIGINAL

| Métrica | Valor |
|---------|-------|
| **Duración total estimada** | 12-16 días |
| **Fases** | 6 |
| **Prioridad** | Alta |
| **Dependencias externas** | Ninguna |

---

## CONTEXTO: CONDICIONES DEL SISTEMA

### Condiciones FIJAS (Reglas inmutables del negocio)

| Regla | Descripción |
|-------|-------------|
| Rotación semanal | Mismo turno toda la semana (M, T o N) |
| Jornada semanal | Máximo 6 turnos, preferido 5 |
| Descanso 48h | 2 días completos, post-noche mínimo T |
| Cobertura | M: mín 1/pref 2, T: mín 1/pref 2, N: siempre 1 |
| Noches obligatorias | Todos hacen 4-6 noches/mes en bloque |
| PI (refuerzo) | Todos pueden, se usa cuando hay solo 1 en M/T |
| Libres semanales | L1,L1,L2,L2... (95 anuales) |
| Salvador | Prioridad M, máx 4-5 T/mes |
| Andrés | Prioridad T, máx 4-5 M/mes |
| Ana R | Solo L-V con turno P |

### Condiciones VARIABLES (Se ingresan ANTES de generar cada mes)

| Tipo | Código | Descripción | Prioridad |
|------|--------|-------------|-----------|
| Baja médica | `sick_leave` | IT obligatorio por ley | 1 (Máxima) |
| Vacaciones | `vacation` | Días aprobados previamente | 2 |
| Festivos | `holiday` | B para todos | 3 |
| Formación | `training` | FO programada | 4 |
| **Petición libre** | `request_off` | Día libre solicitado por trabajador | 5 |
| **Petición turno** | `request_shift` | Turno específico solicitado | 6 |
| **Petición NO turno** | `request_no_shift` | Evitar turno específico | 6 |
| Enfermedad puntual | `sick_day` | E de 1-2 días | 7 |

### Flujo de Peticiones de Trabajadores

```
1. ANTES del mes → Trabajadores envían peticiones al gerente
2. GERENTE → Registra peticiones en el sistema (constraints)
3. AL GENERAR → Sistema aplica peticiones como días bloqueados
4. SI CONFLICTO → Sistema genera warning, gerente decide
```

**Ejemplos de peticiones:**
- "EMP_09: necesita libre el día 15"
- "EMP_02: no puede trabajar tarde el día 20"
- "EMP_03: solicita L el 10 y 11"

---

## ESTADO DE FASES DE DESARROLLO

### FASE 0: PREPARACIÓN ✅ COMPLETADO

- [x] Crear rama `schedule`
- [x] Revisar documentación
- [x] Instalar dependencias backend
- [x] Instalar dependencias frontend

### FASE 1: BASE DE DATOS ✅ COMPLETADO

- [x] Crear archivo SQL `scheduling_tables.sql`
- [x] Tabla `scheduling_config` + datos iniciales
- [x] Tabla `scheduling_shifts` + datos iniciales
- [x] Tabla `scheduling_months`
- [x] Tabla `scheduling_days`
- [x] Tabla `scheduling_assignments`
- [x] Tabla `scheduling_constraints`
- [x] Tabla `scheduling_employee_rules` + datos
- [x] Crear índices y foreign keys
- [x] Ejecutar script en BD local y Aiven

### FASE 2: BACKEND - ESTRUCTURA BASE ✅ COMPLETADO

- [x] Crear types/interfaces TypeScript
- [x] Crear validaciones Zod
- [x] Crear repository con queries
- [x] Crear controller con CRUD
- [x] Crear rutas Express
- [x] Probar endpoints con REST Client

### FASE 3: MOTOR DE GENERACIÓN ✅ COMPLETADO

- [x] Crear `schedule-generator.service.ts`
- [x] Sistema modular de fases
- [x] 11 fases implementadas
- [x] Validadores
- [x] Calculador de estadísticas
- [x] Constraint de continuidad de rotación

### FASE 4: FRONTEND - UI ✅ COMPLETADO

- [x] Página de listado de plannings
- [x] Página de detalle con tabla
- [x] Componentes base (ScheduleTable, ShiftCell, etc.)
- [x] Integración con API
- [x] Edición de celdas
- [x] Panel de estadísticas

### FASE 5: FUNCIONALIDADES AVANZADAS ✅ COMPLETADO

- [x] Modal de generación
- [x] Modal de restricciones
- [x] Publicar/Despublicar mes
- [x] Validación visual con warnings

### FASE 6: OPTIMIZACIÓN 🔄 EN PROGRESO

- [x] Constraint de continuidad (solo meses PUBLISHED)
- [x] Fase de reparación de bloques pequeños
- [x] Mejora en selección de días libres
- [ ] Reducir violaciones restantes (15 → objetivo: 0)
- [ ] Balancear días libres entre empleados
- [ ] Optimizar distribución de noches

---

## MÉTRICAS DE ÉXITO

### MVP ✅ COMPLETADO
- [x] Crear planning para un mes
- [x] Generar horarios automáticamente
- [x] Ver tabla con todos los empleados y días
- [x] Editar turnos individuales
- [x] Ver estadísticas básicas

### Versión Completa 🔄 EN PROGRESO
- [x] Todo lo del MVP
- [x] Gestión de restricciones
- [x] Gestión de peticiones de trabajadores
- [x] Validación visual con warnings
- [x] Múltiples meses
- [x] Publicar/Despublicar
- [ ] Exportación Excel
- [ ] 0 violaciones de reglas

---

## NOTAS TÉCNICAS

### Scripts útiles

```bash
# Generar horario via API
curl -X POST "http://localhost:4000/api/scheduling/months/1/generate" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"forceRegenerate":true}'

# Analizar bloques de trabajo (Node.js)
node analyze-blocks.js
```

### Logs del generador

El generador produce logs detallados:
```
[InitializeMatrix] Creating matrix for 7 employees, 31 days
[ApplyConstraints] Applied 0 constraints
[AssignNightBlocks] Assigned 6 nights to adriana (days 1-6)
[AssignWeeklyOffs] Week 1: adriana gets L on days 7,8
[RepairSmallBlocks] Repairs: 3/5 successful
[FinalValidation] 12 warnings generated
```

---

## ÚLTIMA ACTUALIZACIÓN

**Fecha:** 24 de Diciembre 2024
**Sesión:** Optimización de bloques de trabajo pequeños
**Resultado:** Reducción de 27 a 15 violaciones con 7 empleados
**Próxima sesión:** Continuar reduciendo violaciones hasta llegar a 0

---

## AUDITORÍA TÉCNICA - Diciembre 2024

### 11. PROBLEMAS DE RENDIMIENTO IDENTIFICADOS

#### 11.1 Queries N+1 (CRÍTICO)

| Prioridad | Problema | Ubicación | Impacto |
|-----------|----------|-----------|---------|
| **CRÍTICO** | N+1 en `calculateAnnualTotals` - loop de queries por empleado/mes | `scheduling-repository.ts:1278-1360` | 120+ queries con 10 empleados × 12 meses |
| **ALTO** | `bulkUpdateAssignments` llama `upsertAssignment` en loop | `scheduling-controller.ts:526-534` | N queries por operación bulk |
| **ALTO** | `initializeContractsForYear` consulta contrato por cada empleado | `scheduling-repository.ts:1217-1234` | N queries innecesarios |
| **MEDIO** | `upsertAssignment` hace SELECT antes de INSERT/UPDATE | `scheduling-repository.ts:565-579` | Query extra por cada asignación |
| **MEDIO** | Frontend `EmployeeTotals` hace 3 queries que podrían ser 1 | `EmployeeTotals.tsx:39-63` | 3 llamadas API redundantes |
| **MEDIO** | `getAnnualTotals` consulta `publishedMonths` dos veces | `scheduling-controller.ts:1432` | Query duplicada |

#### 11.2 Código Duplicado

| Ubicación | Duplicación |
|-----------|-------------|
| Controller + Repository | Lógica de conteo de turnos (switch/case para M, T, N, V, etc.) |
| Backend + Frontend | Tipos: `EmployeeStats`, `EmployeeAnnualTotals`, `DailyStats`, `SchedulingConfigMap` |
| Controller línea 220-221 | Fórmula `presencias * 8` asume 8h, pero turnos tienen horas variables |

#### 11.3 Índices de BD Recomendados

| Tabla | Índice Sugerido |
|-------|-----------------|
| `scheduling_months` | `(year, month)` |
| `scheduling_assignments` | `(month_id, employee_id)` |
| `scheduling_employee_contracts` | `(employee_id, year)` |

---

### 12. EDGE CASES Y BUGS POTENCIALES

#### 12.1 Integridad de Datos (REVISAR LÓGICA DE NEGOCIO)

- [ ] **CASCADE DELETE** en empleados/turnos borra historial al eliminar
- [ ] Sin soft-delete para preservar datos históricos  
- [ ] Contratos se pueden borrar perdiendo referencia en meses publicados

#### 12.2 Concurrencia (REVISAR LÓGICA DE NEGOCIO)

- [ ] **Sin bloqueo optimista** - dos admins editando el mismo mes se sobrescriben
- [ ] Publicar mientras otro edita no da advertencia

#### 12.3 Cálculos (REVISAR LÓGICA DE NEGOCIO)

- [ ] **División por cero** si `dias_trabajo = 0` en contrato
- [ ] Valores negativos en "pendiente" no generan alertas
- [ ] Fórmula de horas usa 8h fijo en vez de `shift.hours`

#### 12.4 Fechas/Timezone (REVISAR LÓGICA DE NEGOCIO)

- [ ] Ajuste de 12 horas puede fallar en límites de año
- [ ] Año nuevo sin contratos definidos muestra errores

#### 12.5 Negocio (REVISAR LÓGICA DE NEGOCIO)

- [ ] Empleado que empieza el 31 de diciembre tiene contrato irrealizable
- [ ] Todos los empleados pueden pedir el mismo día libre (sin mínimo de personal)
- [ ] Sin integración con sistema de vacaciones/HR

---

### 13. MEJORAS DE RENDIMIENTO IMPLEMENTADAS ✅

#### 13.1 Optimización de lookups O(n) → O(1)
- [x] Usar `Map` en lugar de `array.find()` en controller `getMonthById`

#### 13.2 Optimización de upserts
- [x] Usar `INSERT ... ON DUPLICATE KEY UPDATE` en `upsertAssignment`
- [x] Usar `INSERT ... ON DUPLICATE KEY UPDATE` en `upsertContract`

#### 13.3 Código limpio
- [x] Corregir `AddRuleModal` que usaba `fetch` directo en vez de `apiClient`

---

### 14. MEJORAS PENDIENTES (LÓGICA DE NEGOCIO - Análisis requerido)

#### Prioridad Alta
- [ ] Validar `dias_trabajo > 0` en contratos
- [ ] Proteger contra división por cero en cálculos
- [ ] Validar formato de códigos de turno (solo alfanuméricos)

#### Prioridad Media
- [ ] Cambiar CASCADE a RESTRICT en FK de turnos/empleados
- [ ] Implementar soft delete para empleados/turnos
- [ ] Agregar bloqueo optimista para edición concurrente
- [ ] Consolidar queries en `calculateAnnualTotals` con JOINs

#### Prioridad Baja
- [ ] Unificar endpoint `getAnnualTotals` para devolver todo
- [ ] Agregar auditoría de cambios en horarios
- [ ] Virtualización para grids con 50+ empleados

---

### 15. CHECKLIST DE PRUEBAS RECOMENDADAS

#### Critical Path
- [ ] Crear schedule para mes con 28, 29, 30, 31 días
- [ ] Agregar empleado mid-month y verificar cálculos prorrateados
- [ ] Remover empleado y verificar preservación de datos
- [ ] Dos usuarios editan mismo schedule simultáneamente
- [ ] Publicar mientras otro usuario está editando
- [ ] Generar schedule para grupo con 50+ empleados
- [ ] Year rollover (asignaciones Diciembre → Enero)

#### Edge Cases
- [ ] Empleado con contrato de 0 días
- [ ] Todos los empleados piden el mismo día libre
- [ ] Código de turno con caracteres especiales
- [ ] Observaciones con 5000+ caracteres
- [ ] Mes vacío (sin empleados asignados)
- [ ] Febrero año bisiesto
- [ ] Casos de timezone (server UTC, client local)
