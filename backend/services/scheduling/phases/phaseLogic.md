# Sistema de Fases del Generador de Horarios

## Resumen

El generador crea horarios en **3 pasos**:

1. **50 intentos** ejecutando las fases 10-90 (algoritmo determinístico)
2. **1 intento con IA** (fase 95) para corregir errores del mejor resultado
3. **Re-validación** para confirmar que los cambios de la IA son válidos

---

## Orden de Ejecución

Las fases se ejecutan de menor a mayor número. Se usan incrementos de 10 para poder insertar fases intermedias.

| Orden | Fase | Archivo | Función |
|-------|------|---------|---------|
| 10 | InitializeMatrix | `initialize-matrix.phase.ts` | Crear matriz vacía |
| 20 | ApplyConstraints | `apply-constraints.phase.ts` | Aplicar ausencias (vacaciones, bajas, festivos) |
| 30 | ApplyEmployeeRules | `apply-employee-rules.phase.ts` | Aplicar reglas por empleado |
| 40 | AssignNightBlocks | `assign-night-blocks.phase.ts` | Asignar bloques de noches consecutivas |
| 45 | EnforcePostNightRest | `enforce-post-night-rest.phase.ts` | Forzar descanso post-noche |
| 50 | AssignRotatingShifts | `assign-rotating-shifts.phase.ts` | Asignar turnos M/T |
| 60 | AssignWeeklyOffs | `assign-weekly-offs.phase.ts` | Garantizar 2 días libres consecutivos/semana |
| 70 | ValidateFixCoverage | `validate-fix-coverage.phase.ts` | Corregir cobertura mínima/máxima |
| 80 | AssignPISupport | `assign-pi-support.phase.ts` | Asignar refuerzos PI |
| 85 | RepairSmallBlocks | `repair-small-blocks.phase.ts` | Eliminar bloques de trabajo < 3 días |
| 90 | FinalValidation | `final-validation.phase.ts` | Generar lista de errores y warnings |
| **95** | AIOptimization | `ai-optimization.phase.ts` | Optimización con IA (se ejecuta aparte) |

> **Nota**: La fase 95 NO se ejecuta en el loop de 50 intentos. Se ejecuta una sola vez al final sobre el mejor resultado.

---

## Flujo del Generador

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. LOOP: 50 INTENTOS (sin IA)                                      │
│     ├── Crear contexto limpio                                       │
│     ├── Ejecutar fases 10 → 90                                      │
│     ├── Contar errores                                              │
│     ├── Guardar si es el mejor resultado                            │
│     └── Salir si hay 0 errores                                      │
├─────────────────────────────────────────────────────────────────────┤
│  2. IA (si hay errores y está activada)                             │
│     ├── Construir contexto para la IA                               │
│     ├── Enviar a Claude/Gemini                                      │
│     ├── Validar cada cambio propuesto (11 validaciones)             │
│     └── Aplicar solo los cambios válidos                            │
├─────────────────────────────────────────────────────────────────────┤
│  3. RE-VALIDACIÓN                                                   │
│     ├── Ejecutar FinalValidationPhase                               │
│     ├── Ejecutar constraints                                        │
│     └── Contar errores finales                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Descripción de Cada Fase

### Fase 10: InitializeMatrix

Crea una matriz vacía `matrix[employeeId][dayNumber]` para todos los empleados y días del mes.

---

### Fase 20: ApplyConstraints

Aplica restricciones que no se pueden modificar:

| Tipo | Código | Descripción |
|------|--------|-------------|
| Vacaciones | V | Días de vacaciones aprobadas |
| Festivo | B | Festivos de empresa |
| Baja médica | IT | Incapacidad temporal |
| Enfermedad | E | Días de enfermedad |
| Formación | FO | Días de formación |

También valida cobertura crítica: si hay menos de 3 personas disponibles, cancela peticiones de día libre.

---

### Fase 30: ApplyEmployeeRules

Aplica reglas específicas por empleado:
- Turnos fijos (ej: siempre mañana)
- Días fijos de trabajo (ej: lunes a viernes)
- Sin fines de semana

---

### Fase 40: AssignNightBlocks

Asigna bloques de noches. Reglas:
- Deben ser consecutivas (no dispersas)
- Mínimo 3 noches, recomendado 4-6
- Solo 1 persona por noche
- Si el empleado terminó el mes anterior con noches incompletas, continúa desde el día 1

---

### Fase 45: EnforcePostNightRest

Aplica el descanso obligatorio de 48h después de noches:
- Día siguiente al último N → L (libre obligatorio)
- Día +2 → puede ser T pero no M (la mañana empieza a las 7am, solo 24h después)

---

### Fase 50: AssignRotatingShifts

Asigna turnos M (mañana) o T (tarde) a los días vacíos.
- Mantiene consistencia semanal (mismo tipo de turno por semana)
- Respeta marcadores PREFER_T del descanso post-noche
- No permite volver de T a M (rotación hacia adelante)

---

### Fase 60: AssignWeeklyOffs

Garantiza 2 días libres consecutivos por semana (descanso semanal legal).
- Preferencia por fines de semana
- No convierte noches a libre
- Si no puede garantizar 2 consecutivos, genera error

---

### Fase 70: ValidateFixCoverage

Valida y corrige cobertura por turno:
- M: mínimo 1, máximo configurable
- T: mínimo 1, máximo configurable
- N: exactamente 1

Si falta cobertura, intenta redistribuir o convertir libres a trabajo.

---

### Fase 80: AssignPISupport

Asigna turnos PI (refuerzo) en días con cobertura ajustada (3-4 personas disponibles).

---

### Fase 85: RepairSmallBlocks

Detecta y repara bloques de trabajo menores a 3 días:
1. Intenta extender el bloque (convertir libres adyacentes a trabajo)
2. Si no es posible, convierte el bloque a libre

---

### Fase 90: FinalValidation

Genera warnings y errores finales:
- Días libres mensuales (8-12)
- Máximo días consecutivos trabajando (6)
- Mínimo bloque de trabajo (3)
- Descanso semanal (2 consecutivos)
- Noches consecutivas

---

### Fase 95: AIOptimization

Se ejecuta UNA vez después del loop, solo si:
1. `AI_ENABLED=true` en `.env`
2. `aiProvider !== 'none'` en la configuración
3. El mejor resultado tiene errores

Flujo:
1. Construye contexto simplificado para la IA
2. Envía prompt a Claude o Gemini
3. Valida cada cambio propuesto (11 validaciones)
4. Aplica solo los cambios que pasan todas las validaciones

---

## Logs en Terminal

```
[Schedule] Starting generation (50 max attempts)
[Schedule] Attempt 1: 5 errors (234ms)
[Schedule] Attempt 2: 3 errors (198ms)
[Schedule] AI config: provider="claude", env_enabled=true
[Schedule] Running AI optimization on best result (3 errors)...

[AI] ════════════════════════════════════════
[AI] Starting optimization
[AI] Provider: Claude (claude-sonnet-4-20250514)
[AI] Errors to resolve: 3
[AI] Sending request to Claude...
[AI] Response received (1234ms)
[AI] Proposed 2 changes (confidence: 0.85)
[AI] Applied 1 changes
[AI] Rejected 1 changes
[AI] Result: 3 errors → 2 errors
[AI] ════════════════════════════════════════

[Schedule] After AI: 2 errors (was 3) +1 fixed
```

---

## Códigos de Turno

| Código | Nombre | Modificable por IA |
|--------|--------|-------------------|
| M | Mañana | Sí |
| T | Tarde | Sí |
| N | Noche | Sí |
| L | Libre | Sí |
| P | Presencia | Sí |
| PI | Presencia Intervención | Sí |
| V | Vacaciones | **No** |
| B | Festivo | **No** |
| IT | Incapacidad Temporal | **No** |
| E | Enfermedad | **No** |
| FO | Formación | **No** |

---

## Crear una Nueva Fase

```typescript
import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult } from '../types/index.js'

export class MiNuevaFase extends BasePhase {
  readonly name = 'MiNuevaFase'
  readonly order = 55 // Entre 50 y 60
  
  async execute(context: GeneratorContext): Promise<PhaseResult> {
    // Acceso a la matriz: context.matrix[employeeId][dayNumber]
    // Acceso a config: context.config.minMorningStaff
    
    return this.success('Completado')
  }
}
```

Registrar en `createDefaultPhaseRegistry()` en `index.ts`.
