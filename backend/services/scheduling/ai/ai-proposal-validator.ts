// services/scheduling/ai/ai-proposal-validator.ts
// Validate and apply AI proposals

import type { GeneratorContext } from '../types/index.js'
import type { AIProposal, AIChange, AIValidationResult, AIRejectedChange } from './types.js'
import { countShiftOnDay } from '../utils/matrix.js'

/** Shifts that cannot be modified by AI */
const PROTECTED_SHIFTS = ['V', 'B', 'IT', 'E', 'FO']

/**
 * Validate the structure of an AI proposal
 */
export function validateProposalStructure(proposal: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check if object
  if (!proposal || typeof proposal !== 'object') {
    return { valid: false, errors: ['Response is not a valid JSON object'] }
  }

  const p = proposal as Record<string, unknown>

  // Required fields
  if (typeof p.analysis !== 'string' || p.analysis.length === 0) {
    errors.push('Missing or empty: analysis')
  }

  if (!Array.isArray(p.changes)) {
    errors.push('Missing or invalid: changes (must be array)')
  }

  if (typeof p.confidence !== 'number') {
    errors.push('Missing or invalid: confidence (must be number)')
  }

  // Confidence range
  if (typeof p.confidence === 'number' && (p.confidence < 0 || p.confidence > 1)) {
    errors.push('Confidence must be between 0 and 1')
  }

  // Validate each change
  if (Array.isArray(p.changes)) {
    p.changes.forEach((change, idx) => {
      const c = change as Record<string, unknown>
      if (!c.employeeId || typeof c.employeeId !== 'string') {
        errors.push(`Change ${idx}: missing or invalid employeeId`)
      }
      if (typeof c.day !== 'number' || c.day < 1 || c.day > 31) {
        errors.push(`Change ${idx}: missing or invalid day`)
      }
      if (!c.from || typeof c.from !== 'string') {
        errors.push(`Change ${idx}: missing or invalid from`)
      }
      if (!c.to || typeof c.to !== 'string') {
        errors.push(`Change ${idx}: missing or invalid to`)
      }
      if (!c.reason || typeof c.reason !== 'string' || (c.reason as string).length < 5) {
        errors.push(`Change ${idx}: missing or too short reason (min 5 chars)`)
      }
    })
  }

  // Low confidence with many changes is suspicious
  if (
    typeof p.confidence === 'number' &&
    p.confidence < 0.5 &&
    Array.isArray(p.changes) &&
    p.changes.length > 3
  ) {
    errors.push('Too many changes with low confidence (max 3 changes when confidence < 0.5)')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate and apply AI changes to context
 */
export function validateAndApplyChanges(
  context: GeneratorContext,
  proposal: AIProposal
): AIValidationResult {
  const appliedChanges: AIChange[] = []
  const rejectedChanges: AIRejectedChange[] = []

  for (const change of proposal.changes) {
    const validation = validateSingleChange(context, change)

    if (validation.valid) {
      // Apply the change
      context.matrix[change.employeeId][change.day] = change.to
      appliedChanges.push(change)
    } else {
      rejectedChanges.push({ change, reason: validation.reason! })
    }
  }

  return {
    valid: rejectedChanges.length === 0,
    appliedChanges,
    rejectedChanges,
  }
}

/**
 * Validate a single change
 */
function validateSingleChange(
  context: GeneratorContext,
  change: AIChange
): { valid: boolean; reason?: string } {
  // 1. Employee exists?
  const employee = context.employees.find((e) => e.id === change.employeeId)
  if (!employee) {
    return { valid: false, reason: `Employee not found: ${change.employeeId}` }
  }

  // 2. Day exists?
  const day = context.days.find((d) => d.dayNumber === change.day)
  if (!day) {
    return { valid: false, reason: `Day not found: ${change.day}` }
  }

  // 3. Current shift matches?
  const current = context.matrix[change.employeeId]?.[change.day]
  if (!current) {
    return { valid: false, reason: `No shift assigned for day ${change.day}` }
  }

  // Normalize for comparison (L1, L2 -> L)
  const normalizedCurrent = current.startsWith('L') ? 'L' : current
  const normalizedFrom = change.from.startsWith('L') ? 'L' : change.from

  if (normalizedCurrent !== normalizedFrom) {
    return { valid: false, reason: `Current shift is ${current}, not ${change.from}` }
  }

  // 4. Cannot modify protected shifts
  if (PROTECTED_SHIFTS.includes(current)) {
    return { valid: false, reason: `Cannot modify protected shift: ${current}` }
  }

  // 5. Target shift is valid?
  const validCodes = context.shifts.map((s) => s.code)
  const targetCode = change.to.startsWith('L') ? 'L' : change.to
  if (!validCodes.includes(targetCode)) {
    return { valid: false, reason: `Invalid target shift code: ${change.to}` }
  }

  // 6. Check coverage after change
  const coverageCheck = checkCoverageAfterChange(context, change)
  if (!coverageCheck.valid) {
    return { valid: false, reason: coverageCheck.reason }
  }

  return { valid: true }
}

/**
 * Check if coverage requirements are still met after a change
 */
function checkCoverageAfterChange(
  context: GeneratorContext,
  change: AIChange
): { valid: boolean; reason?: string } {
  const { config } = context
  const dayNum = change.day

  // Count current coverage
  let mCount = countShiftOnDay(context.matrix, dayNum, 'M')
  let tCount = countShiftOnDay(context.matrix, dayNum, 'T')
  let nCount = countShiftOnDay(context.matrix, dayNum, 'N')

  // Adjust based on change
  const fromShift = change.from.startsWith('L') ? 'L' : change.from
  const toShift = change.to.startsWith('L') ? 'L' : change.to

  if (fromShift === 'M') mCount--
  if (fromShift === 'T') tCount--
  if (fromShift === 'N') nCount--

  if (toShift === 'M') mCount++
  if (toShift === 'T') tCount++
  if (toShift === 'N') nCount++

  // Check minimums
  if (mCount < config.minMorningStaff) {
    return { valid: false, reason: `Would leave only ${mCount} morning staff (min: ${config.minMorningStaff})` }
  }
  if (tCount < config.minAfternoonStaff) {
    return { valid: false, reason: `Would leave only ${tCount} afternoon staff (min: ${config.minAfternoonStaff})` }
  }
  if (nCount < config.minNightStaff) {
    return { valid: false, reason: `Would leave only ${nCount} night staff (min: ${config.minNightStaff})` }
  }

  return { valid: true }
}
