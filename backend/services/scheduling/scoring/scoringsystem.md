# Sistema de Scoring para Scheduling - Diseno Profesional

## Estado Actual del Algoritmo

### Como funciona ahora (Nivel 1 - Greedy)

```
Para cada turno a asignar:
  1. Filtrar empleados disponibles (hard constraints)
  2. Shuffle aleatorio
  3. Tomar el primero que pase los filtros
  4. Si falla -> siguiente intento (hasta 50)
  5. Si todo falla -> AI para "parchar"
```

### Problemas identificados

| Problema | Causa | Impacto |
|----------|-------|---------|
| Bloques pequenos (<3 dias) | Se asigna sin considerar impacto futuro | ALTO |
| Noches no consecutivas | No hay penalizacion por romper bloque | ALTO |
| Distribucion desigual | Shuffle aleatorio, no balance | MEDIO |
| Muchos intentos necesarios | Decisiones suboptimas se propagan | MEDIO |

---

## Sistema de Scoring Propuesto (Nivel 2)

### Filosofia

> "No elegir el primer empleado disponible, sino el MEJOR empleado para cada asignacion"

Cada candidato recibe un **score numerico**. Se elige el de mayor score.
El score combina multiples factores con pesos configurables.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SCORING ENGINE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   FATIGUE   │    │  BALANCE    │    │ PREFERENCE  │     │
│  │   SCORER    │    │  SCORER     │    │   SCORER    │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └────────┬─────────┴─────────┬───────┘             │
│                  │                   │                      │
│           ┌──────▼──────┐     ┌──────▼──────┐              │
│           │  COVERAGE   │     │   BLOCK     │              │
│           │   SCORER    │     │   SCORER    │              │
│           └──────┬──────┘     └──────┬──────┘              │
│                  │                   │                      │
│                  └─────────┬─────────┘                      │
│                            │                                │
│                     ┌──────▼──────┐                         │
│                     │   TOTAL     │                         │
│                     │   SCORE     │                         │
│                     └─────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Factores de Scoring

### 1. FATIGUE SCORER (Fatiga del empleado)

Penaliza empleados que han trabajado mucho recientemente.

| Factor | Calculo | Peso | Rango |
|--------|---------|------|-------|
| Dias consecutivos trabajados | -10 por dia | -10 a -60 | Penalizacion |
| Trabajo ayer | Si trabajo ayer | -15 | Penalizacion |
| Horas en la semana | -2 por turno esta semana | -12 a 0 | Penalizacion |
| Dias desde ultimo descanso | -5 si > 4 dias | -5 a 0 | Penalizacion |

```typescript
function calculateFatigueScore(employee, day, context): number {
  let score = 0
  
  // Dias consecutivos trabajados antes de este dia
  const consecutive = countConsecutiveWorkBefore(context.matrix, employee.id, day)
  score -= consecutive * 10  // -10 por cada dia consecutivo
  
  // Trabajo ayer?
  if (workedYesterday(context.matrix, employee.id, day)) {
    score -= 15
  }
  
  // Turnos esta semana
  const weekShifts = countWeekWorkDays(context.matrix, employee.id, day.weekNumber)
  score -= weekShifts * 2
  
  return score  // Rango tipico: -60 a 0
}
```

### 2. BALANCE SCORER (Equilibrio de turnos)

Favorece distribucion equitativa entre empleados.

| Factor | Calculo | Peso | Rango |
|--------|---------|------|-------|
| Turnos totales del mes | Comparar con promedio | +20 a -20 | Balance |
| Turnos M vs T | Diferencia con objetivo | +10 a -10 | Balance |
| Noches asignadas | Comparar con promedio | +15 a -15 | Balance |
| Fines de semana trabajados | Comparar con otros | +10 a -10 | Balance |

```typescript
function calculateBalanceScore(employee, shiftType, context): number {
  let score = 0
  
  // Comparar con el promedio del equipo
  const empShifts = countTotalShifts(employee.id)
  const avgShifts = calculateTeamAverage(context.employees)
  const diff = avgShifts - empShifts
  
  // Bonus si tiene menos turnos que el promedio
  score += Math.min(20, diff * 5)
  
  // Balance M/T para este empleado
  if (shiftType === 'M' || shiftType === 'T') {
    const mCount = countShiftType(employee.id, 'M')
    const tCount = countShiftType(employee.id, 'T')
    const imbalance = Math.abs(mCount - tCount)
    
    // Bonus si este turno mejora el balance
    if ((shiftType === 'M' && tCount > mCount) || 
        (shiftType === 'T' && mCount > tCount)) {
      score += 10
    } else if (imbalance > 3) {
      score -= 10  // Penalizar si empeora un desbalance existente
    }
  }
  
  return score  // Rango tipico: -20 a +30
}
```

### 3. PREFERENCE SCORER (Preferencias del empleado)

Respeta las preferencias configuradas.

| Factor | Calculo | Peso | Rango |
|--------|---------|------|-------|
| shiftPriority match | Si coincide con preferencia | +25 | Bonus |
| fixedDays match | Si es uno de sus dias fijos | +20 | Bonus |
| noWeekends | Si es fin de semana | -30 | Penalizacion |
| Request off | Si pidio ese dia libre | -100 | Hard constraint |

```typescript
function calculatePreferenceScore(employee, day, shiftType, context): number {
  let score = 0
  const rules = employee.rules
  
  // Preferencia de turno
  if (rules.shiftPriority === shiftType) {
    score += 25
  } else if (rules.shiftPriority && rules.shiftPriority !== shiftType) {
    score -= 15  // Penalizar turno no preferido
  }
  
  // Dias fijos
  if (rules.fixedDays?.includes(day.dayOfWeek)) {
    score += 20
  }
  
  // No fines de semana
  if (rules.noWeekends && isWeekend(day)) {
    score -= 30
  }
  
  // Solicitud de dia libre (casi hard constraint)
  if (hasRequestOff(employee.id, day.dayNumber)) {
    score -= 100
  }
  
  return score  // Rango tipico: -100 a +45
}
```

### 4. COVERAGE SCORER (Impacto en cobertura)

Evalua como afecta la asignacion a la cobertura del equipo.

| Factor | Calculo | Peso | Rango |
|--------|---------|------|-------|
| Cobertura actual | Si el turno necesita gente | +30 | Bonus |
| Exceso de cobertura | Si ya hay suficientes | -20 | Penalizacion |
| Unico disponible | Si es el unico candidato | +50 | Bonus critico |

```typescript
function calculateCoverageScore(employee, day, shiftType, context): number {
  let score = 0
  
  const currentCoverage = countShiftOnDay(context.matrix, day.dayNumber, shiftType)
  const minRequired = getMinRequired(shiftType, context.config)
  
  // Necesidad critica
  if (currentCoverage < minRequired) {
    score += 30
    
    // Bonus extra si es el unico disponible
    const availableCount = countAvailableForShift(day, shiftType)
    if (availableCount === 1) {
      score += 50  // Unico candidato = prioridad maxima
    }
  }
  
  // Penalizar si ya hay exceso
  if (currentCoverage >= minRequired + 1) {
    score -= 20
  }
  
  return score  // Rango tipico: -20 a +80
}
```

### 5. BLOCK SCORER (Calidad de bloques de trabajo)

Evalua si la asignacion crea bloques de trabajo saludables.

| Factor | Calculo | Peso | Rango |
|--------|---------|------|-------|
| Crea bloque pequeno | Si resulta en 1-2 dias aislados | -40 | Penalizacion fuerte |
| Extiende bloque existente | Si agranda un bloque 3+ | +15 | Bonus |
| Rompe descanso | Si interrumpe 2 libres consecutivos | -50 | Penalizacion fuerte |
| Noches consecutivas | Si mantiene bloque de noches | +20 | Bonus |

```typescript
function calculateBlockScore(employee, day, shiftType, context): number {
  let score = 0
  
  // Verificar si crea bloque pequeno
  if (wouldCreateSmallWorkBlock(context.matrix, employee.id, day.dayNumber, shiftType)) {
    score -= 40
  }
  
  // Bonus por extender bloque existente
  const currentBlockSize = getCurrentWorkBlockSize(context.matrix, employee.id, day.dayNumber)
  if (currentBlockSize >= 2) {
    score += 15  // Extiende un bloque saludable
  }
  
  // Penalizar si rompe descanso consecutivo
  if (wouldBreakConsecutiveLibre(context.matrix, employee.id, day)) {
    score -= 50
  }
  
  // Para noches: bonus por mantener consecutividad
  if (shiftType === 'N') {
    if (isAdjacentToExistingNights(context.matrix, employee.id, day.dayNumber)) {
      score += 20
    } else {
      score -= 30  // Penalizar noches no consecutivas
    }
  }
  
  return score  // Rango tipico: -50 a +35
}
```

---

## Calculo del Score Total

```typescript
interface ScoringWeights {
  fatigue: number      // Default: 1.0
  balance: number      // Default: 1.0
  preference: number   // Default: 1.2 (preferencias importan mas)
  coverage: number     // Default: 1.5 (cobertura es critica)
  block: number        // Default: 1.3 (bloques saludables)
}

function calculateTotalScore(
  employee: Employee,
  day: DayInfo,
  shiftType: ShiftCode,
  context: GeneratorContext,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  const fatigue = calculateFatigueScore(employee, day, context) * weights.fatigue
  const balance = calculateBalanceScore(employee, shiftType, context) * weights.balance
  const preference = calculatePreferenceScore(employee, day, shiftType, context) * weights.preference
  const coverage = calculateCoverageScore(employee, day, shiftType, context) * weights.coverage
  const block = calculateBlockScore(employee, day, shiftType, context) * weights.block
  
  return fatigue + balance + preference + coverage + block
}
```

### Ejemplo de Calculo

Escenario: Asignar turno M al Empleado A el dia 15

| Factor | Valor | Peso | Resultado |
|--------|-------|------|-----------|
| Fatigue | -25 (3 dias consecutivos) | 1.0 | -25 |
| Balance | +15 (menos turnos que promedio) | 1.0 | +15 |
| Preference | +25 (prefiere M) | 1.2 | +30 |
| Coverage | +30 (falta gente en M) | 1.5 | +45 |
| Block | +15 (extiende bloque) | 1.3 | +19.5 |
| **TOTAL** | | | **+84.5** |

vs Empleado B:

| Factor | Valor | Peso | Resultado |
|--------|-------|------|-----------|
| Fatigue | -45 (5 dias consecutivos) | 1.0 | -45 |
| Balance | -10 (mas turnos que promedio) | 1.0 | -10 |
| Preference | -15 (prefiere T, no M) | 1.2 | -18 |
| Coverage | +30 (falta gente en M) | 1.5 | +45 |
| Block | -40 (crea bloque de 2 dias) | 1.3 | -52 |
| **TOTAL** | | | **-80** |

**Resultado: Se elige Empleado A (score +84.5 vs -80)**

---

## Integracion con Fases Existentes

### Cambios por Fase

| Fase | Cambio Necesario |
|------|------------------|
| AssignNightBlocks | Usar scoring en vez de shuffle + first |
| AssignRotatingShifts | Usar scoring para elegir M vs T |
| ValidateFixCoverage | Usar scoring para elegir quien cambia |
| AssignWeeklyOffs | Ya tiene scoring basico - expandir |
| AssignPISupport | Usar scoring para PI |

### Nueva Funcion Central

```typescript
// services/scheduling/scoring/employee-scorer.ts

export function selectBestCandidate(
  candidates: Employee[],
  day: DayInfo,
  shiftType: ShiftCode,
  context: GeneratorContext
): Employee | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]
  
  // Calcular score para cada candidato
  const scored = candidates.map(emp => ({
    employee: emp,
    score: calculateTotalScore(emp, day, shiftType, context)
  }))
  
  // Ordenar por score (mayor primero)
  scored.sort((a, b) => b.score - a.score)
  
  // Logging para debug
  if (context.debug) {
    console.log(`[SCORING] Day ${day.dayNumber} Shift ${shiftType}:`)
    scored.slice(0, 3).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.employee.name}: ${s.score.toFixed(1)}`)
    })
  }
  
  // Retornar el mejor
  return scored[0].employee
}
```

---

## Configuracion de Pesos

Los pesos deben ser configurables desde la BD para ajustar sin cambiar codigo:

```sql
-- Nueva tabla o agregar a scheduling_config
INSERT INTO scheduling_config (config_key, config_value, description) VALUES
('scoring_weight_fatigue', '1.0', 'Peso del factor fatiga en scoring'),
('scoring_weight_balance', '1.0', 'Peso del factor balance en scoring'),
('scoring_weight_preference', '1.2', 'Peso del factor preferencias en scoring'),
('scoring_weight_coverage', '1.5', 'Peso del factor cobertura en scoring'),
('scoring_weight_block', '1.3', 'Peso del factor bloques en scoring');
```

---

## Plan de Implementacion

### Fase 1: Core del Sistema (Prioridad ALTA)
1. Crear `services/scheduling/scoring/` directory
2. Implementar `employee-scorer.ts` con los 5 scorers
3. Implementar `scoring-types.ts` con interfaces
4. Tests unitarios para cada scorer

### Fase 2: Integracion (Prioridad ALTA)
1. Modificar `assign-night-blocks.phase.ts` para usar scoring
2. Modificar `assign-rotating-shifts.phase.ts`
3. Modificar `validate-fix-coverage.phase.ts`

### Fase 3: Configuracion (Prioridad MEDIA)
1. Agregar pesos a `scheduling_config`
2. UI en frontend para ajustar pesos
3. Documentacion de como tunear

### Fase 4: Optimizacion (Prioridad BAJA)
1. Cache de scores calculados
2. Logging detallado de decisiones
3. Metricas de calidad del schedule

---

## Beneficios Esperados

| Metrica | Antes | Despues (Esperado) |
|---------|-------|-------------------|
| Intentos necesarios | 30-50 | 5-15 |
| Errores finales | 5-15 | 0-3 |
| Bloques pequenos | 3-8 | 0-1 |
| Uso de AI | Siempre | Solo edge cases |
| Tiempo de generacion | 10-30s | 3-10s |

---

## Siguientes Pasos

1. **Revisar este diseno** - Confirmar que los factores y pesos tienen sentido
2. **Crear estructura de archivos** - scoring directory con tipos
3. **Implementar scorer por scorer** - Con tests
4. **Integrar en una fase** - Probar con AssignNightBlocks primero
5. **Iterar** - Ajustar pesos segun resultados reales
