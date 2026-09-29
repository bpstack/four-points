// tests/scheduling/corpus.test.ts
// Runs all scheduling corpus fixtures against ScheduleValidator.
// Each fixture describes expected violations that MUST be present (or absent) in the result.
//
// Cross-month fixtures (F11, F12, F13) are marked todo until B.0 constraint logic is complete.
// B.0 parameter wiring (previousMonthHistory) is done — constraints need to consume it.

import { describe, it, expect } from 'vitest'
import { ScheduleValidator } from '../../services/scheduling/schedule-validator.js'
import type { GenerationWarning } from '../../services/scheduling/types/index.js'
import { loadAllFixtures } from '../scheduling-corpus/loader.js'
import {
  buildDaysFromFixture,
  buildShifts,
  buildEmployees,
  buildAssignments,
  mergeConfig,
  buildPreviousMonthHistory,
} from '../scheduling-corpus/factory.js'
import type { CorpusFixture, ViolationMatcher } from '../scheduling-corpus/_schema.js'

// ============================================================
// HELPERS
// ============================================================

/**
 * Check if a GenerationWarning matches a ViolationMatcher.
 * All provided matcher fields must match.
 */
function matches(warning: GenerationWarning, matcher: ViolationMatcher): boolean {
  if (warning.type !== matcher.type) return false
  if (matcher.severity !== undefined && warning.severity !== matcher.severity) return false
  if (matcher.employeeId !== undefined && warning.employeeId !== matcher.employeeId) return false
  if (matcher.day !== undefined && warning.day !== matcher.day) return false
  return true
}

/**
 * Find at least one warning in the list matching the given matcher.
 */
function findMatch(
  warnings: GenerationWarning[],
  matcher: ViolationMatcher
): GenerationWarning | undefined {
  return warnings.find((w) => matches(w, matcher))
}

/**
 * Build and run ScheduleValidator from a CorpusFixture.
 */
function runFixture(fixture: CorpusFixture) {
  const { input } = fixture

  const days = buildDaysFromFixture(input.days)
  const shifts = buildShifts()
  const employees = buildEmployees(input.employees)
  const assignments = buildAssignments(input.assignments, days, employees, input.lockedCells)

  // Build the SchedulingConfigMap expected by the validator constructor
  const configMap = mergeConfig(input.config)

  // Wire previous month history if provided by the fixture
  const previousMonthHistory = input.previousMonthHistory
    ? buildPreviousMonthHistory(input.previousMonthHistory)
    : null

  const validator = new ScheduleValidator(
    input.monthId,
    input.year,
    input.month,
    configMap,
    shifts,
    days,
    employees,
    assignments,
    previousMonthHistory
  )

  return validator.validate()
}

// ============================================================
// CORPUS TEST SUITE
// ============================================================

const fixtures = loadAllFixtures()

describe('Scheduling corpus — validator parity', () => {
  for (const fixture of fixtures) {

    if (fixture.todo) {
      // it.todo only takes a string — register the pending test
      it.todo(`[${fixture.id}] ${fixture.description}`)
      continue
    }

    it(`[${fixture.id}] ${fixture.description}`, () => {
      const result = runFixture(fixture)
      const allWarnings = [...result.errors, ...result.warnings]

      // 1. Check overall isValid
      expect(
        result.isValid,
        `Expected isValid=${fixture.expected.isValid} but got ${result.isValid}\n` +
          `Errors: ${result.errors.map((e) => `[${e.type}/${e.severity}] ${e.message}`).join('\n')}\n` +
          `Warnings: ${result.warnings.map((w) => `[${w.type}/${w.severity}] ${w.message}`).join('\n')}`
      ).toBe(fixture.expected.isValid)

      // 2. Each required violation must be found
      for (const matcher of fixture.expected.violations) {
        const found = findMatch(allWarnings, matcher)
        expect(
          found,
          `Expected violation not found: type=${matcher.type} severity=${matcher.severity}` +
            (matcher.employeeId ? ` employeeId=${matcher.employeeId}` : '') +
            (matcher.day ? ` day=${matcher.day}` : '') +
            `\nActual warnings:\n${allWarnings.map((w) => `  [${w.type}/${w.severity}] emp=${w.employeeId} day=${w.day} msg="${w.message}"`).join('\n')}`
        ).toBeDefined()
      }

      // 3. Each absent violation must NOT be found
      for (const matcher of fixture.expected.absentViolations ?? []) {
        const found = findMatch(allWarnings, matcher)
        expect(
          found,
          `Violation that should be absent was found: type=${matcher.type} severity=${matcher.severity}` +
            (matcher.employeeId ? ` employeeId=${matcher.employeeId}` : '') +
            (matcher.day ? ` day=${matcher.day}` : '') +
            `\nFound: [${found?.type}/${found?.severity}] emp=${found?.employeeId} day=${found?.day} msg="${found?.message}"`
        ).toBeUndefined()
      }

      // 4. Check soft penalty total (only if fixture specifies it)
      if (fixture.expected.softPenalty !== undefined) {
        expect(
          result.softPenalty,
          `Expected softPenalty=${fixture.expected.softPenalty} but got ${result.softPenalty}`
        ).toBe(fixture.expected.softPenalty)
      }

      // 5. Check soft penalty breakdown (only if fixture specifies it)
      if (fixture.expected.softPenaltyBreakdown !== undefined) {
        expect(result.softPenaltyBreakdown).toEqual(fixture.expected.softPenaltyBreakdown)
      }
    })
  }
})
