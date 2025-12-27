// services/scheduling/ai/ai-context-builder.ts
// Build context for AI from generator context

import type { GeneratorContext, Employee, EmployeeRules, GenerationWarning } from '../types/index.js'
import type { AIContext, AIEmployee, AIWarning, AIConstraints, AIEmployeeStats, AICoverage, AIBalance, AIEmployeeRulesRaw, AIMatrix } from './types.js'

/**
 * Build AI context from generator context
 */
export function buildAIContext(context: GeneratorContext): AIContext {
  // Handle empty employees case
  if (!context.employees || context.employees.length === 0) {
    return {
      constraints: buildConstraints(context),
      employees: [],
      matrix: {},
      warnings: context.warnings?.map(buildWarningContext) || [],
      monthInfo: {
        year: context.year,
        month: context.month,
        totalDays: context.days?.length || 0,
      },
      coverage: { underCoveredMorning: [], underCoveredAfternoon: [], underCoveredNight: [], overCovered: [] },
      balance: { avgPresencias: 0, stdDevPresencias: 0, balanceScore: 1 },
      holidays: [],
    }
  }

  // Ensure matrix is initialized for all employees
  if (!context.matrix) {
    context.matrix = {}
  }
  for (const emp of context.employees) {
    if (!context.matrix[emp.id]) {
      context.matrix[emp.id] = {}
    }
  }

  // First calculate all employee stats to get average
  const employeeStats = context.employees.map((emp) => calculateEmployeeStats(emp, context))
  const avgPresencias = employeeStats.length > 0 
    ? employeeStats.reduce((sum, s) => sum + s.presencias, 0) / employeeStats.length
    : 0
  
  // Build employees with overworked/underworked flags
  const employees = context.employees.map((emp, idx) => 
    buildEmployeeContext(emp, context, employeeStats[idx], avgPresencias)
  )
  
  // Calculate coverage and balance
  const coverage = analyzeCoverage(context)
  const balance = analyzeBalance(employeeStats, employees)
  
  // Extract holidays
  const holidays = (context.days || [])
    .filter(d => d.isHoliday)
    .map(d => d.dayNumber)

  return {
    constraints: buildConstraints(context),
    employees,
    matrix: buildMatrixJSON(context),
    warnings: (context.warnings || []).map(buildWarningContext),
    monthInfo: {
      year: context.year,
      month: context.month,
      totalDays: context.days?.length || 0,
    },
    coverage,
    balance,
    holidays,
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
 * Calculate employee stats without overworked/underworked (need average first)
 */
function calculateEmployeeStats(emp: Employee, context: GeneratorContext): AIEmployeeStats {
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

  return stats
}

/**
 * Build employee context with stats and workload flags
 */
function buildEmployeeContext(
  emp: Employee, 
  _context: GeneratorContext, 
  stats: AIEmployeeStats,
  avgPresencias: number
): AIEmployee {
  // Threshold: +/- 2 from average is considered imbalanced
  const threshold = 2
  const overworked = stats.presencias > avgPresencias + threshold
  const underworked = stats.presencias < avgPresencias - threshold

  return {
    id: emp.id,
    name: emp.name,
    rules: formatEmployeeRules(emp.rules),
    rulesRaw: buildRulesRaw(emp.rules),
    stats,
    overworked,
    underworked,
  }
}

/**
 * Build raw rules object for AI
 */
function buildRulesRaw(rules: EmployeeRules): AIEmployeeRulesRaw {
  return {
    shiftPriority: rules.shiftPriority,
    fixedShift: rules.fixedShift,
    fixedDays: rules.fixedDays,
    noWeekends: rules.noWeekends,
    maxShiftPerMonth: rules.maxShiftPerMonth,
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
 * Build schedule matrix as JSON (more reliable than string format)
 * Format: { "employeeName (employeeId)": { "1": "M", "2": "T", ... } }
 * This avoids parsing issues with 2-char shifts like PI, IT, FO
 */
function buildMatrixJSON(context: GeneratorContext): AIMatrix {
  const matrix: AIMatrix = {}
  
  for (const emp of context.employees) {
    // Use "name (id)" as key for readability + uniqueness
    const key = `${emp.name} (${emp.id})`
    matrix[key] = {}
    const shifts = context.matrix[emp.id] || {}
    
    for (const day of context.days) {
      const shift = shifts[day.dayNumber]
      if (shift) {
        // Normalize L1, L2, etc to L for simplicity
        const normalizedShift = shift.startsWith('L') && shift.length > 1 ? 'L' : shift
        matrix[key][String(day.dayNumber)] = normalizedShift
      }
    }
  }
  
  return matrix
}

/**
 * Format schedule matrix as readable table (for debug logging only)
 * IMPORTANT: Uses fixed 3-char column width to prevent alignment issues with 2-char shifts (PI, IT, FO, etc.)
 */
export function formatMatrixForDebug(context: GeneratorContext): string {
  const days = [...context.days].sort((a, b) => a.dayNumber - b.dayNumber)
  const maxNameLen = 10
  const COL_WIDTH = 3 // Fixed column width: 2 chars for shift + 1 space

  // Header row
  let result = 'Empleado'.padEnd(maxNameLen) + ' | '
  result += days.map((d) => String(d.dayNumber).padStart(2)).join(' ')
  result += '\n'

  // Separator
  result += '-'.repeat(maxNameLen) + '-+-' + '-'.repeat(days.length * COL_WIDTH - 1) + '\n'

  // Employee rows
  for (const emp of context.employees) {
    const name = emp.name.length > maxNameLen ? emp.name.substring(0, maxNameLen - 1) + '.' : emp.name.padEnd(maxNameLen)
    result += name + ' | '

    for (const day of days) {
      const shift = context.matrix[emp.id]?.[day.dayNumber] || '-'
      // Normalize L1, L2, etc to L for display
      let displayShift = shift.startsWith('L') && shift.length > 1 ? 'L' : shift
      // Ensure exactly 2 characters: pad left if 1 char, truncate if >2 chars
      if (displayShift.length === 1) {
        displayShift = ' ' + displayShift
      } else if (displayShift.length > 2) {
        displayShift = displayShift.substring(0, 2)
      }
      result += displayShift + ' '
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

/**
 * Analyze daily coverage to find under/over staffed days
 */
function analyzeCoverage(context: GeneratorContext): AICoverage {
  const { config } = context
  const underCoveredMorning: number[] = []
  const underCoveredAfternoon: number[] = []
  const underCoveredNight: number[] = []
  const overCovered: number[] = []

  for (const day of context.days) {
    let morningCount = 0
    let afternoonCount = 0
    let nightCount = 0

    for (const emp of context.employees) {
      const shift = context.matrix[emp.id]?.[day.dayNumber]
      if (shift === 'M') morningCount++
      else if (shift === 'T') afternoonCount++
      else if (shift === 'N') nightCount++
    }

    // Check under-coverage
    if (morningCount < config.minMorningStaff) {
      underCoveredMorning.push(day.dayNumber)
    }
    if (afternoonCount < config.minAfternoonStaff) {
      underCoveredAfternoon.push(day.dayNumber)
    }
    if (nightCount < config.minNightStaff) {
      underCoveredNight.push(day.dayNumber)
    }

    // Check over-coverage (more than double the minimum)
    const totalStaff = morningCount + afternoonCount + nightCount
    const minRequired = config.minMorningStaff + config.minAfternoonStaff + config.minNightStaff
    if (totalStaff > minRequired * 2) {
      overCovered.push(day.dayNumber)
    }
  }

  return {
    underCoveredMorning,
    underCoveredAfternoon,
    underCoveredNight,
    overCovered,
  }
}

/**
 * Analyze workload balance across employees
 */
function analyzeBalance(stats: AIEmployeeStats[], employees: AIEmployee[]): AIBalance {
  if (stats.length === 0) {
    return {
      avgPresencias: 0,
      stdDevPresencias: 0,
      balanceScore: 1,
    }
  }

  // Calculate average
  const avgPresencias = stats.reduce((sum, s) => sum + s.presencias, 0) / stats.length

  // Calculate standard deviation
  const squaredDiffs = stats.map(s => Math.pow(s.presencias - avgPresencias, 2))
  const avgSquaredDiff = squaredDiffs.reduce((sum, d) => sum + d, 0) / stats.length
  const stdDevPresencias = Math.sqrt(avgSquaredDiff)

  // Find most over/underworked
  let mostOverworked: string | undefined
  let mostUnderworked: string | undefined
  let maxPresencias = -Infinity
  let minPresencias = Infinity

  for (let i = 0; i < employees.length; i++) {
    const presencias = stats[i].presencias
    if (presencias > maxPresencias) {
      maxPresencias = presencias
      mostOverworked = employees[i].id
    }
    if (presencias < minPresencias) {
      minPresencias = presencias
      mostUnderworked = employees[i].id
    }
  }

  // Balance score: 1 = perfect, 0 = terrible
  // Based on coefficient of variation (CV = stdDev / mean)
  const cv = avgPresencias > 0 ? stdDevPresencias / avgPresencias : 0
  const balanceScore = Math.max(0, Math.min(1, 1 - cv))

  return {
    avgPresencias: Math.round(avgPresencias * 10) / 10,
    stdDevPresencias: Math.round(stdDevPresencias * 10) / 10,
    mostOverworked,
    mostUnderworked,
    balanceScore: Math.round(balanceScore * 100) / 100,
  }
}
