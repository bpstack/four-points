// services/scheduling/ai/ai-context-builder.ts
// Build context for AI from generator context

import type { GeneratorContext, Employee, EmployeeRules, GenerationWarning } from '../types/index.js'
import type { AIContext, AIEmployee, AIWarning, AIConstraints, AIEmployeeStats } from './types.js'

/**
 * Build AI context from generator context
 */
export function buildAIContext(context: GeneratorContext): AIContext {
  return {
    constraints: buildConstraints(context),
    employees: context.employees.map((emp) => buildEmployeeContext(emp, context)),
    matrix: formatMatrix(context),
    warnings: context.warnings.map(buildWarningContext),
    monthInfo: {
      year: context.year,
      month: context.month,
      totalDays: context.days.length,
    },
  }
}

/**
 * Build constraints from config
 */
function buildConstraints(context: GeneratorContext): AIConstraints {
  const { config } = context
  return {
    minMorningStaff: config.minMorningStaff,
    minAfternoonStaff: config.minAfternoonStaff,
    minNightStaff: config.minNightStaff,
    minNightBlock: config.minNightBlock,
    maxNightBlock: config.maxNightBlock,
    minRestHours: config.minRestHours,
    maxConsecutiveWorkDays: config.maxConsecutiveWorkDays || 6,
    minMonthlyLibre: config.minMonthlyLibre || 8,
    maxMonthlyLibre: config.maxMonthlyLibre || 12,
  }
}

/**
 * Build employee context with stats
 */
function buildEmployeeContext(emp: Employee, context: GeneratorContext): AIEmployee {
  const shifts = context.matrix[emp.id] || {}
  const stats: AIEmployeeStats = { M: 0, T: 0, N: 0, L: 0, presencias: 0 }

  for (const day of context.days) {
    const shift = shifts[day.dayNumber]
    if (!shift) continue

    if (shift === 'M') stats.M++
    else if (shift === 'T') stats.T++
    else if (shift === 'N') stats.N++
    else if (shift.startsWith('L')) stats.L++
  }
  stats.presencias = stats.M + stats.T + stats.N

  return {
    id: emp.id,
    name: emp.name,
    rules: formatEmployeeRules(emp.rules),
    stats,
  }
}

/**
 * Format employee rules as readable string
 */
function formatEmployeeRules(rules: EmployeeRules): string {
  const parts: string[] = []

  if (rules.shiftPriority) {
    parts.push(`Preferencia: ${rules.shiftPriority}`)
  }
  if (rules.fixedShift) {
    parts.push(`Turno fijo: ${rules.fixedShift}`)
  }
  if (rules.fixedDays && rules.fixedDays.length > 0) {
    parts.push(`Dias fijos: ${rules.fixedDays.join(',')}`)
  }
  if (rules.noWeekends) {
    parts.push('No fines de semana')
  }
  if (rules.maxShiftPerMonth) {
    const maxParts = Object.entries(rules.maxShiftPerMonth)
      .map(([shift, max]) => `${shift}<=${max}`)
      .join(', ')
    parts.push(`Max: ${maxParts}`)
  }

  return parts.length > 0 ? parts.join('; ') : 'Sin reglas especiales'
}

/**
 * Format schedule matrix as readable table
 */
function formatMatrix(context: GeneratorContext): string {
  const days = [...context.days].sort((a, b) => a.dayNumber - b.dayNumber)
  const maxNameLen = 10

  // Header row
  let result = 'Empleado'.padEnd(maxNameLen) + ' | '
  result += days.map((d) => String(d.dayNumber).padStart(2)).join(' ')
  result += '\n'

  // Separator
  result += '-'.repeat(maxNameLen) + '-+-' + '-'.repeat(days.length * 3 - 1) + '\n'

  // Employee rows
  for (const emp of context.employees) {
    const name = emp.name.length > maxNameLen ? emp.name.substring(0, maxNameLen - 1) + '.' : emp.name.padEnd(maxNameLen)
    result += name + ' | '

    for (const day of days) {
      const shift = context.matrix[emp.id]?.[day.dayNumber] || '-'
      // Normalize L1, L2, etc to L for display
      const displayShift = shift.startsWith('L') && shift.length > 1 ? 'L' : shift
      result += displayShift.padStart(2) + ' '
    }
    result += '\n'
  }

  return result
}

/**
 * Build warning context for AI
 */
function buildWarningContext(w: GenerationWarning): AIWarning {
  return {
    type: w.type,
    severity: w.severity,
    day: w.day,
    employeeId: w.employeeId,
    message: w.message,
  }
}
