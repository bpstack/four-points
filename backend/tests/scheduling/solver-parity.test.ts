// tests/scheduling/solver-parity.test.ts
// Parity test: solver output must pass ScheduleValidator with 0 hard errors.
//
// SCHEDULING-SOLVER-PLAN.md Fase 1 criterion:
//   "Output del solver pasa ScheduleValidator.validate() con 0 hard errors."
//
// Each test case: build SolverInput from a corpus fixture → run solver → validate matrix.

import { describe, it, expect } from 'vitest'
import { runSolver } from '../../services/scheduling/solver-client.js'
import { ScheduleValidator } from '../../services/scheduling/schedule-validator.js'
import {
  buildDaysFromFixture,
  buildShifts,
  buildEmployees,
  buildAssignments,
  mergeConfig,
  buildPreviousMonthHistory,
} from '../scheduling-corpus/factory.js'
import { loadFixture } from '../scheduling-corpus/loader.js'
import type { CorpusFixture } from '../scheduling-corpus/_schema.js'
import type { SolverInput } from '../../services/scheduling/types/solver.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert corpus fixture input to SolverInput.
 * lockedCells: {empId: [dayNums]} + assignments → {empId: {dayNum_str: shiftCode}}
 */
function fixtureToSolverInput(fixture: CorpusFixture): SolverInput {
  const inp = fixture.input

  // Convert lockedCells
  const lockedCells: Record<string, Record<string, string>> = {}
  for (const [empId, dayNums] of Object.entries(inp.lockedCells ?? {})) {
    lockedCells[empId] = {}
    for (const dayNum of dayNums) {
      const shift = inp.assignments[empId]?.[dayNum]
      if (shift) lockedCells[empId][String(dayNum)] = shift
    }
  }

  // Convert previousMonthHistory.lastShifts → previousMonthTail
  // Fallback: if lastShifts is empty but lastShiftType is known, pass at least
  // the last shift type so the solver can apply cross-month transition constraints.
  const previousMonthTail: Record<string, string[]> = {}
  if (inp.previousMonthHistory) {
    const { lastShifts, lastShiftType } = inp.previousMonthHistory
    for (const [empId, shifts] of Object.entries(lastShifts)) {
      if (shifts.length > 0) {
        previousMonthTail[empId] = shifts.map((s) => s.shiftCode)
      } else if (lastShiftType?.[empId]) {
        previousMonthTail[empId] = [lastShiftType[empId]]
      }
    }
  }

  return {
    monthId: inp.monthId,
    year: inp.year,
    month: inp.month,
    employees: inp.employees.map((e) => ({
      id: e.id,
      name: e.name,
      rules: e.rules ?? {},
    })),
    days: inp.days.map((d) => ({
      dayNumber: d.dayNumber,
      dayOfWeek: d.dayOfWeek,
      weekNumber: d.weekNumber,
      isHoliday: d.isHoliday ?? false,
    })),
    lockedCells,
    previousMonthTail,
    config: {
      minMorningStaff: inp.config.minMorningStaff,
      prefMorningStaff: inp.config.prefMorningStaff,
      maxMorningStaff: inp.config.maxMorningStaff,
      minAfternoonStaff: inp.config.minAfternoonStaff,
      prefAfternoonStaff: inp.config.prefAfternoonStaff,
      maxAfternoonStaff: inp.config.maxAfternoonStaff,
      minNightStaff: inp.config.minNightStaff,
      maxNightStaff: inp.config.maxNightStaff,
      maxWeeklyShifts: inp.config.maxWeeklyShifts,
      prefWeeklyShifts: inp.config.prefWeeklyShifts,
      minRestHours: inp.config.minRestHours,
      minNightBlock: inp.config.minNightBlock,
      maxNightBlock: inp.config.maxNightBlock,
      prefNightBlock: inp.config.prefNightBlock,
      minMonthlyLibre: inp.config.minMonthlyLibre,
      maxMonthlyLibre: inp.config.maxMonthlyLibre,
      maxConsecutiveWorkDays: inp.config.maxConsecutiveWorkDays,
    },
    nightsHistory: {},  // no histórico en tests — S1 usa balanceo solo dentro del mes
    options: { timeoutSeconds: 30, optimizationLevel: 'fast', seed: 42 },  // 'fast' intencional en tests (vs 'balanced' en prod)
  }
}

/**
 * Convert solver matrix to FixtureAssignments format (positive days only).
 */
function matrixToFixtureAssignments(
  matrix: Record<string, Record<string, string>>
): Record<string, Record<number, string>> {
  const result: Record<string, Record<number, string>> = {}
  for (const [empId, dayMap] of Object.entries(matrix)) {
    result[empId] = {}
    for (const [dayNumStr, shift] of Object.entries(dayMap)) {
      const dayNum = Number(dayNumStr)
      if (dayNum > 0) result[empId][dayNum] = shift  // skip virtual days (negative keys)
    }
  }
  return result
}

// ── Test cases ────────────────────────────────────────────────────────────────

// Fixtures where the solver must find a solution (coverage disabled, manageable config).
const PARITY_FIXTURES = [
  'F02-perfect-month',
  'F10-night-block-correct',
  'F11-cross-month-night-block-completed',
  'F22-locked-vacation-respected',
  // F26-F51 resolubles
  'F26-vacation-at-start',
  'F27-vacation-at-end',
  'F28-holiday-mid-month',
  'F29-simultaneous-vacations',
  'F30-trailing-n-incomplete-with-vacation',
  'F33-short-month-28days',
  'F34-short-month-29feb-leap',
  'F35-night-block-min-3',
  'F39-locked-bonificable-counts',
  'F40-mixed-rest-days-boundary',
  'F41-prev-month-draft-no-tail',
  'F42-consecutive-unpublished-months',
  'F45-completed-block-new-allowed',
  'F46-no-weekends-with-vacation-saturday',
  'F47-fixed-shift-presencia-only',
  'F48-fixed-shift-with-fixed-days',
  'F49-presencia-only-no-fixed-days',
  'F50-multiple-employees-with-rules',
]

// Fixtures that are provably infeasible for the solver (coverage or hard constraints)
const INFEASIBLE_FIXTURES = [
  'F31-trailing-n-at-max',
  'F51-coverage-minimums-active',
]

describe(
  'Solver → validator parity (0 hard errors)',
  () => {
    for (const fixtureId of PARITY_FIXTURES) {
      it(
        `[${fixtureId}] solver output has 0 hard errors`,
        async () => {
          const fixture = loadFixture(fixtureId)
          const solverInput = fixtureToSolverInput(fixture)

          const output = await runSolver(solverInput)

          expect(output.status).toBe('ok')
          if (output.status !== 'ok') return

          // Build validator inputs from solver matrix
          const days = buildDaysFromFixture(fixture.input.days)
          const shifts = buildShifts()
          const employees = buildEmployees(fixture.input.employees)
          const assignments = buildAssignments(
            matrixToFixtureAssignments(output.matrix),
            days,
            employees
          )
          const configMap = mergeConfig(fixture.input.config)
          const previousMonthHistory = fixture.input.previousMonthHistory
            ? buildPreviousMonthHistory(fixture.input.previousMonthHistory)
            : null

          const validator = new ScheduleValidator(
            fixture.input.monthId,
            fixture.input.year,
            fixture.input.month,
            configMap,
            shifts,
            days,
            employees,
            assignments,
            previousMonthHistory
          )

          const result = validator.validate()

          const errorMessages = result.errors
            .map((e) => `[${e.type}/${e.severity}] emp=${e.employeeId} day=${e.day}: ${e.message}`)
            .join('\n')

          expect(result.errors, `Hard errors found:\n${errorMessages}`).toHaveLength(0)
        },
        60_000  // 60s timeout — Python startup + solve time
      )
    }
  }
)

describe(
  'Solver infeasibility (fixtures with unsolvable constraints)',
  () => {
    for (const fixtureId of INFEASIBLE_FIXTURES) {
      it(
        `[${fixtureId}] solver returns infeasible`,
        async () => {
          const fixture = loadFixture(fixtureId)
          const solverInput = fixtureToSolverInput(fixture)

          const output = await runSolver(solverInput)

          expect(output.status).toBe('infeasible')
        },
        60_000
      )
    }
  }
)
