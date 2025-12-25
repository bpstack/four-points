// services/scheduling/ai/ai-proposal-validator.ts
// Validate and apply AI proposals

import type { GeneratorContext, DayInfo } from '../types/index.js'
import type { AIProposal, AIChange, AIValidationResult, AIRejectedChange } from './types.js'
import {
  countShiftOnDay,
  isWorkShift,
  isLibreShift,
  countConsecutiveWorkDays,
  hasConsecutiveLibreDays,
} from '../utils/matrix.js'

/** Shifts that cannot be modified by AI */
const PROTECTED_SHIFTS = ['V', 'B', 'IT', 'E', 'FO']

/** Maximum consecutive work days allowed */
const MAX_CONSECUTIVE_WORK_DAYS = 6

/** Minimum work block size (no 1-2 day blocks) */
const MIN_WORK_BLOCK_SIZE = 3

/** Minimum consecutive libre days per week */
const MIN_CONSECUTIVE_LIBRE_DAYS = 2

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
  const normalizedCurrent = normalizeShiftCode(current)
  const normalizedFrom = normalizeShiftCode(change.from)
  const normalizedTo = normalizeShiftCode(change.to)

  if (normalizedCurrent !== normalizedFrom) {
    return { valid: false, reason: `Current shift is ${current}, not ${change.from}` }
  }

  // 4. Cannot modify protected shifts
  if (PROTECTED_SHIFTS.includes(normalizedCurrent)) {
    return { valid: false, reason: `Cannot modify protected shift: ${current}` }
  }

  // 5. Target shift is valid?
  const validCodes = context.shifts.map((s) => s.code)
  if (!validCodes.includes(normalizedTo)) {
    return { valid: false, reason: `Invalid target shift code: ${change.to}` }
  }

  // 6. Check coverage after change
  const coverageCheck = checkCoverageAfterChange(context, change)
  if (!coverageCheck.valid) {
    return { valid: false, reason: coverageCheck.reason }
  }

  // 7. Check consecutive work days limit
  const consecutiveCheck = checkConsecutiveWorkDays(context, change)
  if (!consecutiveCheck.valid) {
    return { valid: false, reason: consecutiveCheck.reason }
  }

  // 8. Check small work blocks
  const smallBlockCheck = checkSmallWorkBlocks(context, change)
  if (!smallBlockCheck.valid) {
    return { valid: false, reason: smallBlockCheck.reason }
  }

  // 9. Check weekly rest (2 consecutive libre days)
  const weeklyRestCheck = checkWeeklyRest(context, change, day)
  if (!weeklyRestCheck.valid) {
    return { valid: false, reason: weeklyRestCheck.reason }
  }

  // 10. Check night block rules
  const nightBlockCheck = checkNightBlockRules(context, change)
  if (!nightBlockCheck.valid) {
    return { valid: false, reason: nightBlockCheck.reason }
  }

  // 11. Check 48h post-night rest
  const postNightCheck = checkPostNightRest(context, change)
  if (!postNightCheck.valid) {
    return { valid: false, reason: postNightCheck.reason }
  }

  return { valid: true }
}

/**
 * Normalize shift code (L1, L2, L3 -> L)
 */
function normalizeShiftCode(code: string): string {
  if (code.startsWith('L') && code.length > 1) {
    return 'L'
  }
  return code
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
  const fromShift = normalizeShiftCode(change.from)
  const toShift = normalizeShiftCode(change.to)

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

/**
 * Check if change would exceed max consecutive work days
 */
function checkConsecutiveWorkDays(
  context: GeneratorContext,
  change: AIChange
): { valid: boolean; reason?: string } {
  const toShift = normalizeShiftCode(change.to)

  // Only check if we're adding a work shift
  if (!isWorkShift(toShift)) {
    return { valid: true }
  }

  // Simulate the change
  const originalShift = context.matrix[change.employeeId][change.day]
  context.matrix[change.employeeId][change.day] = change.to

  const { total } = countConsecutiveWorkDays(context.matrix, context.days, change.employeeId, change.day)

  // Restore original
  context.matrix[change.employeeId][change.day] = originalShift

  const maxConsecutive = context.config.maxConsecutiveWorkDays || MAX_CONSECUTIVE_WORK_DAYS

  if (total > maxConsecutive) {
    return {
      valid: false,
      reason: `Would create ${total} consecutive work days (max: ${maxConsecutive})`,
    }
  }

  return { valid: true }
}

/**
 * Check if change would create small work blocks (1-2 days)
 */
function checkSmallWorkBlocks(
  context: GeneratorContext,
  change: AIChange
): { valid: boolean; reason?: string } {
  const fromShift = normalizeShiftCode(change.from)
  const toShift = normalizeShiftCode(change.to)

  // Only check if we're converting work to libre (could isolate a work block)
  const isConvertingToLibre = isWorkShift(fromShift) && (isLibreShift(toShift) || toShift === 'L')

  // Also check if converting libre to work (could create a small block)
  const isConvertingToWork = (isLibreShift(fromShift) || fromShift === 'L') && isWorkShift(toShift)

  if (!isConvertingToLibre && !isConvertingToWork) {
    return { valid: true }
  }

  // Simulate the change and find work blocks
  const sortedDays = [...context.days].sort((a, b) => a.dayNumber - b.dayNumber)
  const originalShift = context.matrix[change.employeeId][change.day]

  // Apply simulated change
  context.matrix[change.employeeId][change.day] = change.to

  // Find all work blocks for this employee
  const workBlocks = findWorkBlocks(context, change.employeeId, sortedDays)

  // Restore original
  context.matrix[change.employeeId][change.day] = originalShift

  // Check for small blocks
  for (const block of workBlocks) {
    if (block.size > 0 && block.size < MIN_WORK_BLOCK_SIZE) {
      return {
        valid: false,
        reason: `Would create a work block of ${block.size} days (days ${block.start}-${block.end}, min: ${MIN_WORK_BLOCK_SIZE})`,
      }
    }
  }

  return { valid: true }
}

/**
 * Find all work blocks for an employee
 */
function findWorkBlocks(
  context: GeneratorContext,
  employeeId: string,
  sortedDays: DayInfo[]
): Array<{ start: number; end: number; size: number }> {
  const blocks: Array<{ start: number; end: number; size: number }> = []
  let currentBlock: { start: number; end: number; size: number } | null = null

  for (const day of sortedDays) {
    const shift = context.matrix[employeeId][day.dayNumber]
    const isWork = isWorkShift(shift)

    if (isWork) {
      if (currentBlock === null) {
        currentBlock = { start: day.dayNumber, end: day.dayNumber, size: 1 }
      } else {
        currentBlock.end = day.dayNumber
        currentBlock.size++
      }
    } else {
      if (currentBlock !== null) {
        blocks.push(currentBlock)
        currentBlock = null
      }
    }
  }

  // Don't forget the last block
  if (currentBlock !== null) {
    blocks.push(currentBlock)
  }

  return blocks
}

/**
 * Check if change would break weekly rest (2 consecutive libre days per week)
 */
function checkWeeklyRest(
  context: GeneratorContext,
  change: AIChange,
  dayInfo: DayInfo
): { valid: boolean; reason?: string } {
  const fromShift = normalizeShiftCode(change.from)
  const toShift = normalizeShiftCode(change.to)

  // Only check if we're converting libre to work
  const isConvertingLibreToWork = (isLibreShift(fromShift) || fromShift === 'L') && isWorkShift(toShift)

  if (!isConvertingLibreToWork) {
    return { valid: true }
  }

  const weekNumber = dayInfo.weekNumber
  const weekDays = context.days.filter((d) => d.weekNumber === weekNumber)

  // Simulate the change
  const originalShift = context.matrix[change.employeeId][change.day]
  context.matrix[change.employeeId][change.day] = change.to

  const hasEnoughRest = hasConsecutiveLibreDays(
    context.matrix,
    weekDays,
    change.employeeId,
    MIN_CONSECUTIVE_LIBRE_DAYS
  )

  // Restore original
  context.matrix[change.employeeId][change.day] = originalShift

  if (!hasEnoughRest) {
    return {
      valid: false,
      reason: `Would leave week ${weekNumber} without ${MIN_CONSECUTIVE_LIBRE_DAYS} consecutive libre days`,
    }
  }

  return { valid: true }
}

/**
 * Check night block rules:
 * - If adding N, must be adjacent to existing night block
 * - Cannot create isolated nights
 */
function checkNightBlockRules(
  context: GeneratorContext,
  change: AIChange
): { valid: boolean; reason?: string } {
  const toShift = normalizeShiftCode(change.to)

  // Only check if changing TO night shift
  if (toShift !== 'N') {
    return { valid: true }
  }

  const employeeId = change.employeeId
  const dayNum = change.day

  // Check if there's an adjacent night (day before or after)
  const dayBefore = dayNum - 1
  const dayAfter = dayNum + 1

  const shiftBefore = context.matrix[employeeId]?.[dayBefore]
  const shiftAfter = context.matrix[employeeId]?.[dayAfter]

  const hasAdjacentNight = shiftBefore === 'N' || shiftAfter === 'N'

  if (!hasAdjacentNight) {
    return {
      valid: false,
      reason: `Night shift must be adjacent to existing night block (day ${dayNum} is isolated)`,
    }
  }

  // Check employee hasn't completed their night block for the month
  if (context.employeesWithCompletedNightBlock?.has(employeeId)) {
    return {
      valid: false,
      reason: `Employee ${employeeId} has already completed their night block this month`,
    }
  }

  return { valid: true }
}

/**
 * Check 48h post-night rest rule:
 * - Day after last night must be L (libre)
 * - Day after that cannot be M (morning starts at 7am, only 24h rest)
 */
function checkPostNightRest(
  context: GeneratorContext,
  change: AIChange
): { valid: boolean; reason?: string } {
  const fromShift = normalizeShiftCode(change.from)
  const toShift = normalizeShiftCode(change.to)
  const employeeId = change.employeeId
  const dayNum = change.day

  // Case 1: Changing TO a work shift - check if previous day was end of night block
  if (isWorkShift(toShift)) {
    const dayBefore = dayNum - 1
    const twoDaysBefore = dayNum - 2

    const shiftBefore = context.matrix[employeeId]?.[dayBefore]
    const shiftTwoDaysBefore = context.matrix[employeeId]?.[twoDaysBefore]

    // If day before was N, this day MUST be L (48h rest start)
    if (shiftBefore === 'N') {
      return {
        valid: false,
        reason: `Day ${dayNum} must be libre (L) - 48h rest required after night shift`,
      }
    }

    // If two days before was N and day before was L, this day cannot be M
    if (shiftTwoDaysBefore === 'N' && isLibreShift(shiftBefore) && toShift === 'M') {
      return {
        valid: false,
        reason: `Cannot assign morning (M) on day ${dayNum} - only 32h after night block (need 48h for M)`,
      }
    }
  }

  // Case 2: Converting L to work after a night block
  if ((isLibreShift(fromShift) || fromShift === 'L') && isWorkShift(toShift)) {
    const dayBefore = dayNum - 1
    const shiftBefore = context.matrix[employeeId]?.[dayBefore]

    // Check if this libre is the mandatory rest day after nights
    if (shiftBefore === 'N') {
      return {
        valid: false,
        reason: `Cannot convert libre on day ${dayNum} to work - it's the mandatory 48h rest after night shift`,
      }
    }
  }

  // Case 3: Removing night shift - check if next days are properly set for rest
  if (fromShift === 'N' && toShift !== 'N') {
    // If we're removing the last night of a block, we might need to update rest days
    // But this is complex - for now, just allow it and let other phases handle cleanup
    // The important thing is we don't CREATE violations
  }

  return { valid: true }
}
