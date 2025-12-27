// services/scheduling/ai/ai-prompt-builder.ts
// Build prompt for Claude AI

import type { AIContext } from './types.js'

/**
 * Build the complete prompt for Claude
 */
export function buildPrompt(context: AIContext): string {
  return `# ROL

Eres un OPTIMIZADOR de horarios de hotel. Tu UNICO trabajo es SUGERIR cambios puntuales para resolver problemas especificos.

# INSTRUCCIONES CRITICAS

1. NUNCA generes un horario nuevo desde cero
2. NUNCA toques turnos de ausencia: V, B, IT, E, FO (son SAGRADOS)
3. NUNCA rompas cobertura minima (sera RECHAZADO automaticamente)
4. NUNCA hagas cambios sin razon clara y especifica
5. Responde SOLO en JSON valido, sin texto adicional

# REGLAS DEL SISTEMA (TODAS se validan automaticamente)

${formatConstraints(context.constraints)}

# REGLAS ADICIONALES CRITICAS (causan rechazo si se violan)

1. **BLOQUE MINIMO DE TRABAJO: 3 dias**
   - NO puedes crear bloques de trabajo aislados de 1-2 dias
   - Si cambias un turno de trabajo a L, verifica que no dejes un bloque de 1-2 dias aislado
   - Ejemplo: Si el empleado tiene M-M-M-L-M-M, cambiar dia 3 a L crearia bloque de 2 dias (rechazado)

2. **NOCHES DEBEN SER ADYACENTES**
   - NO puedes asignar N aislada - debe estar al lado de otra N
   - Si el empleado no tiene noches los dias anterior o posterior, no puedes poner N

3. **DESCANSO POST-NOCHE OBLIGATORIO (48h)**
   - Despues de N, los siguientes 2 dias DEBEN ser L (libre)
   - NUNCA puedes poner M, T, PI ni ningun turno de trabajo despues de N
   - Patron obligatorio: N-N-N-L-L (minimo 2 L despues del bloque de noches)
   - Si el dia anterior es N, ese dia DEBE ser L - no hay excepciones

4. **VERIFICA COBERTURA FINAL**
   - Antes de proponer, cuenta cuantos M, T, N quedan en ese dia DESPUES de tu cambio
   - Si tu cambio deja 0 personas en un turno, sera rechazado

5. **TRANSICION T->M PROHIBIDA**
   - Dia despues de T no puede ser M (minimo 8h descanso)
   - Si necesitas cambiar algo a M, verifica que el dia anterior no sea T

6. **2 DIAS LIBRES CONSECUTIVOS POR SEMANA**
   - Cada empleado DEBE tener al menos 2 dias L consecutivos en cada semana
   - Si cambias un L a trabajo, verifica que la semana aun tenga 2 L consecutivos
   - Semanas: 1-7, 8-14, 15-21, 22-28, 29-31

7. **MAXIMO 6 DIAS CONSECUTIVOS DE TRABAJO**
   - Si cambias un L a trabajo, cuenta cuantos dias consecutivos de trabajo quedan
   - Si serian mas de 6, el cambio sera rechazado

# TURNOS

| Codigo | Nombre | Modificable |
|--------|--------|-------------|
| M | Mañana (07:00-15:00) | SI |
| T | Tarde (15:00-23:00) | SI |
| N | Noche (23:00-07:00) | SI - solo adyacente a otras N |
| L | Libre | SI |
| PI | Presencia Intervención | SI |
| V | Vacaciones | NO - SAGRADO |
| B | Festivo empresa | NO - SAGRADO |
| IT | Baja médica | NO - SAGRADO |
| E | Enfermedad | NO - SAGRADO |
| FO | Formación | NO - SAGRADO |

# EMPLEADOS (${context.employees.length} total)

${formatEmployees(context.employees)}

# BALANCE DE CARGA

${formatBalance(context.balance)}

# COBERTURA DIARIA

${formatCoverage(context.coverage)}

${context.holidays.length > 0 ? `# FESTIVOS\n\nDias festivos este mes: ${context.holidays.join(', ')}\n` : ''}

# HORARIO ACTUAL (${context.monthInfo.year}-${String(context.monthInfo.month).padStart(2, '0')})

**Formato JSON:** { "empleado (id)": { "dia": "turno" } }

\`\`\`json
${JSON.stringify(context.matrix, null, 2)}
\`\`\`

# PROBLEMAS A RESOLVER (${context.warnings.length} total)

${formatWarnings(context.warnings)}

# ESTRATEGIA RECOMENDADA

Para resolver problemas sin crear otros nuevos:

1. **Falta cobertura en dia X?**
   - Busca empleado con L en ese dia
   - Verifica que tenga bloque de trabajo antes/despues (min 3 dias total con el nuevo)
   - Verifica que la semana aun tenga 2 L consecutivos despues del cambio
   - Verifica que no cree mas de 6 dias consecutivos de trabajo

2. **Demasiados dias consecutivos?**
   - Cambia un dia del MEDIO del bloque a L
   - Verifica que los dos bloques resultantes tengan min 3 dias cada uno
   - Verifica que el dia tenga cobertura suficiente (>1 persona en ese turno)

3. **Transicion T->M prohibida?**
   - Cambia el M a T (si hay cobertura) o a L
   - NO cambies el T a otra cosa (podria crear otros problemas)

4. **Falta descanso semanal (2 L consecutivos)?**
   - Busca dias de esa semana con exceso de cobertura (>1 persona en el turno)
   - Cambia 2 dias consecutivos a L
   - Asegurate de no romper bloques de trabajo

# EJEMPLO DE CAMBIO VALIDO

\`\`\`json
{
  "employeeId": "mock-user-0002-0000-000000000001",
  "day": 15,
  "from": "M",
  "to": "L",
  "reason": "Romper secuencia de 8 dias consecutivos. Verificado: quedan 2M en dia 15, semana 3 tiene L dias 13-14"
}
\`\`\`

# EJEMPLOS INVALIDOS (seran rechazados)

- Cambiar unico M/T/N de un dia a L -> rompe cobertura
- Crear bloque de 1-2 dias de trabajo -> bloque minimo es 3
- Poner N sin otra N adyacente -> noches deben ser consecutivas
- Poner M despues de T -> transicion prohibida
- **Poner CUALQUIER turno de trabajo despues de N -> requiere 2 dias L despues de noches**
- Cambiar L a trabajo si la semana queda sin 2 L consecutivos
- Cambiar L a trabajo si crea mas de 6 dias consecutivos

# TU RESPUESTA

Responde UNICAMENTE con este JSON (sin markdown, sin texto fuera):

{
  "analysis": "Descripcion breve del problema principal",
  "changes": [
    {
      "employeeId": "id-completo-del-empleado",
      "day": 15,
      "from": "M",
      "to": "L",
      "reason": "Explicacion clara incluyendo verificacion de cobertura"
    }
  ],
  "confidence": 0.85,
  "reasoning": "Como estos cambios resuelven los problemas sin crear nuevos"
}

Si NO puedes resolver sin romper reglas:

{
  "analysis": "Descripcion del problema",
  "changes": [],
  "confidence": 0,
  "cannotResolve": true,
  "reasoning": "Por que no hay solucion segura"
}`
}

/**
 * Format constraints for prompt
 */
function formatConstraints(constraints: AIContext['constraints']): string {
  return `- Cobertura mínima diaria: ${constraints.minMorningStaff}M + ${constraints.minAfternoonStaff}T + ${constraints.minNightStaff}N
- Bloques de noche: ${constraints.minNightBlock}-${constraints.maxNightBlock} noches consecutivas obligatorias
- Descanso post-noche: ${constraints.minRestHours}h mínimo (2 días libres después de noches)
- Máximo días consecutivos trabajo: ${constraints.maxConsecutiveWorkDays}
- Días libres mensuales: ${constraints.minMonthlyLibre}-${constraints.maxMonthlyLibre}`
}

/**
 * Format employees for prompt
 */
function formatEmployees(employees: AIContext['employees']): string {
  return employees
    .map((emp) => {
      const stats = `M:${emp.stats.M} T:${emp.stats.T} N:${emp.stats.N} L:${emp.stats.L} Total:${emp.stats.presencias}`
      const flags: string[] = []
      if (emp.overworked) flags.push('SOBRECARGADO')
      if (emp.underworked) flags.push('INFRAUTILIZADO')
      const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : ''
      return `- **${emp.name}** (${emp.id}): ${emp.rules} | Stats: ${stats}${flagStr}`
    })
    .join('\n')
}

/**
 * Format balance info for prompt
 */
function formatBalance(balance: AIContext['balance']): string {
  const lines = [
    `- Media de presencias: ${balance.avgPresencias} dias`,
    `- Desviacion estandar: ${balance.stdDevPresencias}`,
    `- Puntuacion de equilibrio: ${Math.round(balance.balanceScore * 100)}%`,
  ]
  
  if (balance.mostOverworked) {
    lines.push(`- Empleado mas sobrecargado: ${balance.mostOverworked}`)
  }
  if (balance.mostUnderworked) {
    lines.push(`- Empleado menos utilizado: ${balance.mostUnderworked}`)
  }
  
  if (balance.balanceScore < 0.7) {
    lines.push('\n**ATENCION:** El horario esta desbalanceado. Considera redistribuir turnos.')
  }
  
  return lines.join('\n')
}

/**
 * Format coverage info for prompt
 */
function formatCoverage(coverage: AIContext['coverage']): string {
  const issues: string[] = []
  
  if (coverage.underCoveredMorning.length > 0) {
    issues.push(`- Falta cobertura MAÑANA en dias: ${coverage.underCoveredMorning.join(', ')}`)
  }
  if (coverage.underCoveredAfternoon.length > 0) {
    issues.push(`- Falta cobertura TARDE en dias: ${coverage.underCoveredAfternoon.join(', ')}`)
  }
  if (coverage.underCoveredNight.length > 0) {
    issues.push(`- Falta cobertura NOCHE en dias: ${coverage.underCoveredNight.join(', ')}`)
  }
  if (coverage.overCovered.length > 0) {
    issues.push(`- Exceso de personal en dias: ${coverage.overCovered.join(', ')} (oportunidad de optimizar)`)
  }
  
  if (issues.length === 0) {
    return '_Cobertura correcta en todos los turnos_'
  }
  
  return issues.join('\n')
}

/**
 * Format warnings for prompt
 */
function formatWarnings(warnings: AIContext['warnings']): string {
  if (warnings.length === 0) {
    return '_No hay problemas detectados_'
  }

  // Group by severity
  const errors = warnings.filter((w) => w.severity === 'error')
  const warns = warnings.filter((w) => w.severity === 'warning')

  let result = ''

  if (errors.length > 0) {
    result += `## ERRORES (${errors.length}) - DEBEN resolverse\n\n`
    result += errors.map((w) => formatSingleWarning(w)).join('\n')
    result += '\n\n'
  }

  if (warns.length > 0) {
    result += `## ADVERTENCIAS (${warns.length}) - Deberían mejorarse\n\n`
    result += warns.map((w) => formatSingleWarning(w)).join('\n')
  }

  return result
}

/**
 * Format a single warning
 */
function formatSingleWarning(w: AIContext['warnings'][0]): string {
  const parts = [`- [${w.type}]`]
  if (w.day) parts.push(`Día ${w.day}`)
  if (w.employeeId) parts.push(`Emp: ${w.employeeId}`)
  parts.push(`- ${w.message}`)
  return parts.join(' ')
}
