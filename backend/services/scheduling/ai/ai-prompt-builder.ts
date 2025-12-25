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

# REGLAS DEL SISTEMA

${formatConstraints(context.constraints)}

# TURNOS

| Codigo | Nombre | Modificable |
|--------|--------|-------------|
| M | Mañana (07:00-15:00) | SI |
| T | Tarde (15:00-23:00) | SI |
| N | Noche (23:00-07:00) | SI |
| L | Libre | SI |
| PI | Presencia Intervención | SI |
| V | Vacaciones | NO - SAGRADO |
| B | Festivo empresa | NO - SAGRADO |
| IT | Baja médica | NO - SAGRADO |
| E | Enfermedad | NO - SAGRADO |
| FO | Formación | NO - SAGRADO |

# EMPLEADOS (${context.employees.length} total)

${formatEmployees(context.employees)}

# HORARIO ACTUAL (${context.monthInfo.year}-${String(context.monthInfo.month).padStart(2, '0')})

\`\`\`
${context.matrix}
\`\`\`

# PROBLEMAS A RESOLVER (${context.warnings.length} total)

${formatWarnings(context.warnings)}

# EJEMPLO DE CAMBIO VALIDO

\`\`\`json
{
  "employeeId": "emp-1",
  "day": 15,
  "from": "M",
  "to": "L",
  "reason": "Dar descanso post-noche (48h requeridas)"
}
\`\`\`

# EJEMPLOS INVALIDOS (seran rechazados)

- \`from: "V" -> to: "M"\` - PROHIBIDO, V es vacacion
- Quitar el unico M de un dia - rompe cobertura minima
- Cambiar sin dar razon clara

# TU RESPUESTA

Responde UNICAMENTE con este JSON (sin markdown, sin explicaciones fuera del JSON):

{
  "analysis": "Descripcion breve del problema principal identificado",
  "changes": [
    {
      "employeeId": "id-del-empleado",
      "day": 15,
      "from": "M",
      "to": "L",
      "reason": "Explicacion clara de por que este cambio"
    }
  ],
  "confidence": 0.85,
  "reasoning": "Explicacion de como estos cambios resuelven los problemas"
}

Si NO puedes resolver sin romper reglas, responde:

{
  "analysis": "Descripcion del problema",
  "changes": [],
  "confidence": 0,
  "cannotResolve": true,
  "reasoning": "Explicacion de por que no hay solucion segura"
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
      return `- **${emp.name}** (${emp.id}): ${emp.rules} | Stats: ${stats}`
    })
    .join('\n')
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
