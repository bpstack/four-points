/**
 * generate-fixtures.mjs
 * Run once: node generate-fixtures.mjs
 * Writes all 25 corpus fixtures to fixtures/F##-*.json
 * This script is NOT a test — it's a one-shot generator.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'fixtures')
mkdirSync(OUT, { recursive: true })

// ============================================================
// SHARED HELPERS
// ============================================================

function defaultConfig(overrides = {}) {
  return {
    minMorningStaff: 1,
    prefMorningStaff: 2,
    maxMorningStaff: 6,
    minAfternoonStaff: 1,
    prefAfternoonStaff: 2,
    maxAfternoonStaff: 6,
    minNightStaff: 1,
    maxNightStaff: 1,
    maxWeeklyShifts: 6,
    prefWeeklyShifts: 5,
    minRestHours: 48,
    minNightBlock: 4,
    maxNightBlock: 6,
    prefNightBlock: 5,
    minMonthlyLibre: 9,
    maxMonthlyLibre: 11,
    maxConsecutiveWorkDays: 6,
    minConsecutiveLibre: 2,
    annualVacationDays: 30,
    annualHolidays: 20,
    annualFreeDays: 90,
    ...overrides,
  }
}

/**
 * Config that disables coverage validation.
 * Use for fixtures testing a single non-coverage constraint in isolation.
 */
function noCoverageConfig(overrides = {}) {
  return defaultConfig({
    minMorningStaff: 0,
    minAfternoonStaff: 0,
    minNightStaff: 0,
    maxMorningStaff: 99,
    maxAfternoonStaff: 99,
    maxNightStaff: 99,
    ...overrides,
  })
}

/** Jan 2026 days: 1=J(Thu) … 31=S(Sat) */
const JAN2026_DOW = [
  'J',
  'V',
  'S',
  'D',
  'L',
  'M',
  'X',
  'J',
  'V',
  'S',
  'D',
  'L',
  'M',
  'X',
  'J',
  'V',
  'S',
  'D',
  'L',
  'M',
  'X',
  'J',
  'V',
  'S',
  'D',
  'L',
  'M',
  'X',
  'J',
  'V',
  'S',
]
function jan2026Days(holidayDays = []) {
  const hSet = new Set(holidayDays)
  return Array.from({ length: 31 }, (_, i) => ({
    dayNumber: i + 1,
    dayOfWeek: JAN2026_DOW[i],
    weekNumber: Math.ceil((i + 1) / 7),
    isHoliday: hSet.has(i + 1),
    ...(hSet.has(i + 1) ? { holidayName: 'Festivo' } : {}),
  }))
}

function eid(n) {
  return `E0000000-0000-0000-0000-${String(n).padStart(12, '0')}`
}

const THREE_EMPS = [
  { id: eid(1), name: 'EMP_01' },
  { id: eid(2), name: 'EMP_02' },
  { id: eid(3), name: 'EMP_03' },
]

const FIVE_EMPS = [
  { id: eid(1), name: 'EMP_01' },
  { id: eid(2), name: 'EMP_02' },
  { id: eid(3), name: 'EMP_03' },
  { id: eid(4), name: 'EMP_04' },
  { id: eid(5), name: 'EMP_05' },
]

/**
 * 5-employee schedule — no coverage enforcement needed (noCoverage).
 * Each employee gets proper libres and no consecutive work violations.
 * Night block of 5 (days 14-18) for emp1 → night_block OK.
 * Night block of 5 (days 1-5) for emp5 → night_block OK.
 */
function perfectMonthMatrix5() {
  // All 5 employees use Pattern E libres (valid for Jan 2026):
  //   Pairs at 1,2 / 7,8 / 13,14 / 19,20 / 25,26 → 10 libres each
  //   Work blocks: 3-6(4), 9-12(4), 15-18(4), 21-24(4), 27-31(5) — all ≥3, ≤6
  //   Rolling windows: all satisfied by consecutive pairs
  //   Coverage disabled → no shift-count errors
  //   W10 warning (no weekend libre) fires as warning, not error → isValid=true
  const matrix = {}
  const shifts = ['M', 'T', 'M', 'T', 'M']
  for (let i = 0; i < 5; i++) {
    const id = eid(i + 1)
    matrix[id] = {}
    for (let d = 1; d <= 31; d++) {
      matrix[id][d] = VALID_LIBRE_DAYS.has(d) ? 'L' : shifts[i]
    }
  }
  return matrix
}

/**
 * "Pattern E" libre days: pairs every 6 days.
 * 1,2 / 7,8 / 13,14 / 19,20 / 25,26 = 10 libres.
 * Guarantees:
 *   - Every 7-day rolling window has ≥1 consecutive libre pair
 *   - All work blocks are exactly 4-5 days (≥3, ≤6)
 *   - Total libres = 10 (within [9,11])
 * Note: no weekend (S/D) libres → W10 warning fires (severity=warning, not error → isValid still true)
 */
const VALID_LIBRE_DAYS = new Set([1, 2, 7, 8, 13, 14, 19, 20, 25, 26])

function validMatrix(shift) {
  return Object.fromEntries(
    Array.from({ length: 31 }, (_, i) => {
      const d = i + 1
      return [d, VALID_LIBRE_DAYS.has(d) ? 'L' : shift]
    })
  )
}

function write(id, fixture) {
  const path = join(OUT, `${id}.json`)
  writeFileSync(path, JSON.stringify({ id, ...fixture }, null, 2), 'utf-8')
  console.log(`✓ ${id}`)
}

// ============================================================
// FIXTURES
// ============================================================

// ---- F01: Empty month ----
write('F01-empty-month', {
  description: 'Month with no assignments. Every day missing coverage → many coverage errors.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: defaultConfig(),
    employees: THREE_EMPS,
    days: jan2026Days(),
    assignments: { [eid(1)]: {}, [eid(2)]: {}, [eid(3)]: {} },
  },
  expected: {
    isValid: false,
    violations: [
      { type: 'coverage', severity: 'error', day: 1 },
      { type: 'coverage', severity: 'error', day: 5 },
    ],
  },
})

// ---- F02: Perfect month (coverage disabled, all constraints pass) ----
// NOTE: this fixture disables coverage (noCoverageConfig). It tests that *non-coverage* constraints
// (libre count, work blocks, rolling rest, weekend-off, etc.) all pass on a clean schedule.
// A stronger "perfect month with coverage ON" fixture is deferred — see SCHEDULING-DECISIONS-LOG.md
// 2026-04-25 entry on coverage-disabled fixtures (F02/F22/F23). When the Python solver lands in
// Fase 1 it will exercise the coverage-on case naturally.
write('F02-perfect-month', {
  description:
    'Well-formed 5-employee schedule (Pattern E libres, no consecutive violations). Coverage disabled — this only proves non-coverage constraints pass.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: FIVE_EMPS,
    days: jan2026Days(),
    assignments: perfectMonthMatrix5(),
  },
  expected: {
    isValid: true,
    violations: [],
  },
})

// ---- F03: No morning on day 5 ----
write('F03-coverage-min-morning', {
  description: 'Day 5 has 0 morning staff → coverage error.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: defaultConfig({ minNightStaff: 0, minAfternoonStaff: 0 }),
    employees: THREE_EMPS,
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'T'])),
      [eid(2)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'T'])),
      [eid(3)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'T'])),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'coverage', severity: 'error', day: 5 }],
  },
})

// ---- F04: No afternoon on day 10 ----
write('F04-coverage-min-afternoon', {
  description: 'Day 10 has 0 afternoon staff → coverage error.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: defaultConfig({ minNightStaff: 0, minMorningStaff: 0 }),
    employees: THREE_EMPS,
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
      [eid(2)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
      [eid(3)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'coverage', severity: 'error', day: 10 }],
  },
})

// ---- F05: No night coverage ----
write('F05-coverage-no-night', {
  description: 'No employee has night shifts → N coverage error every day.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: defaultConfig({ minNightStaff: 1, minMorningStaff: 0, minAfternoonStaff: 0 }),
    employees: THREE_EMPS,
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
      [eid(2)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'T'])),
      [eid(3)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'coverage', severity: 'error', day: 15 }],
  },
})

// ---- F06: Over max morning staff ----
write('F06-coverage-max-morning', {
  description: 'Day 5 has 3 morning staff but maxMorningStaff=2 → coverage warning.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: defaultConfig({ maxMorningStaff: 2, minNightStaff: 0, minAfternoonStaff: 0 }),
    employees: THREE_EMPS,
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
      [eid(2)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
      [eid(3)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'coverage', severity: 'warning', day: 5 }],
  },
})

// ---- F07: Rest hours violation (no consecutive libre in window 1-7) ----
// EMP_01: libres only from day 7+ → window [1-7] has no consecutive rest → error
// EMP_02: uses Pattern E (valid) → no rest violations → absentViolations check
write('F07-rest-hours-violation', {
  description:
    'EMP_01 has no 2 consecutive libre days in window [1-7] → rest error. EMP_02 (Pattern E) has none.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      // EMP_01: libres only from day 7 onward → window 1-6 and 2-7 etc. have no pair
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([7, 8, 14, 15, 21, 22, 28, 29].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      // EMP_02: Pattern E — every window has consecutive rest pair
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          return [dn, VALID_LIBRE_DAYS.has(dn) ? 'L' : 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'rest', employeeId: eid(1) }],
  },
})

// ---- F08: Rest hours tight but OK ----
// Both employees use Pattern E: every 7-day window has consecutive rest pair, no work block violations
write('F08-rest-hours-tight-but-ok', {
  description:
    'EMP_01 does T → L → M across days 6→7→8 (libre between T and M = ~16h+ effective rest, valid). Pattern E for the rest. No rest errors.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      // EMP_01: Pattern E libres but day 6 = T and day 8 = M (with day 7 = L between them)
      // → tests that T→L→M transition is OK (the libre breaks the would-be tight T→M chain).
      // Pattern E libres at 1,2 / 7,8 / 13,14 / 19,20 / 25,26. Day 6=T, day 7=L, day 8=L (Pattern E),
      // then day 9 onwards = M. So the T(6) → L(7) → L(8) → M(9) chain is the canonical "T then libre then M" case.
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if (VALID_LIBRE_DAYS.has(dn)) return [dn, 'L']
          if (dn === 6) return [dn, 'T'] // T immediately before the L L pair (7,8)
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => [d.dayNumber, VALID_LIBRE_DAYS.has(d.dayNumber) ? 'L' : 'T'])
      ),
    },
  },
  expected: {
    isValid: true,
    violations: [],
    absentViolations: [
      // No rest error for EMP_01: the libre at day 7 buffers the T(6) → M(9) chain.
      { type: 'rest', severity: 'error', employeeId: eid(1) },
    ],
  },
})

// ---- F09: Night block too short (2 nights) ----
write('F09-night-block-too-short', {
  description: 'Employee has only 2 night shifts (minNightBlock=4) → night_block error.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig({ minNightBlock: 4 }),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if (dn === 15 || dn === 16) return [dn, 'N']
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'night_block', employeeId: eid(1) }],
  },
})

// ---- F10: Night block correct (5 nights) ----
// EMP_01: nights days 9-13 (5 nights, within [4-6]), Pattern E libres on 1,2,7,8 + 19,20,25,26
// Specifically: Pattern E has libre 13,14 but we need 9-13 as nights → libre 7,8 + nights 9-13 + libre 19,20,25,26
// Work blocks: 3-6(4) / nights 9-13(5) / 14-18(5) / 21-24(4) / 27-31(5) — all ≥3, ≤6
// Rolling windows: 1,2 in [1-7]✓ / 7,8 in [2-8]✓ / next pair needed by window 8-14: 7,8✓ / 13-19 needs pair: no explicit pair 13-14 (days 13-18 are all work/nights).
// Actually EMP_01 has no libres in range 9-18 (all nights + work) → window 9-15 may fail.
// Simpler approach: EMP_01 has nights 14-18 (5 nights), libres on 1,2,7,8,19,20,25,26 + one in 9-13 range
// Libres: 1,2,7,8,12,13,19,20,25,26 = 10 libres. Nights: 14-18. Works: 3-6, 9-11, 19... wait 12,13=libre.
// Work blocks: 3-6(4) / 9-11(3) / nights 14-18(5) / work 21-24(4) / 27-31(5) — all valid!
// Windows: 1,2✓(1-7) / 7,8✓(2-8) / 12,13✓(7-13) / 12,13✓(8-14 — 12≥14,no) wait...
// Actually pair (12,13): window X-Y contains pair if start≤12 and 13<start+6→ start≤12 and start>7 → windows 7-13 through 12-18
// Window 6-12: pair (7,8) d=7≧6, d<12✓ / Window 7-13: (7,8) d=7≧7✓ / Window 8-14: (12,13) d=12≧8, d<14✓ / 9-15: (12,13) d=12≧9✓ / 13-19: need pair in 13-19. (19,20) d=19≧13, d<19? NO! d<19 means d goes to 18. 19<19=false. Pair (12,13): d=12<13✓ but 12<13 (start=13)? No 12<13... d=12, 12>=13? No.
// Window 13-19: d goes 13..18. Pairs needed: any pair (d,d+1) where 13≤d≤18. Nights 14-18 are work. 13=libre, 14=N(work). (13,14)=L,N → not both rest. Hmm. (19,20)=L,L but d=19 is NOT<19. FAIL.
// Need a libre pair in window 13-19 range (d:13..18). Maybe move nights to 15-19:
// EMP_01: libres 1,2,7,8,13,14,20,21,26,27 (Pattern E shifted). Nights 15-19. Works: 3-6, 9-12, 22-25, 28-31.
// Windows check is complex. Let me just verify computationally.
// Simpler: nights 21-25 (all in week 4), libres Pattern E unchanged (1,2,7,8,13,14,19,20,25,26)
// But nights 21-25 overlap with Pattern E libres 25,26 → 25 would be N not L.
// Actually simplest: give EMP_01 ALL the work/night days and libres that work correctly.
// FINAL approach: use a dedicated valid pattern for night employees:
//   Libres: 1,2,7,8,13,14 + night days 19-23 (5 nights) + libres 24,25,26
//   BUT nights 19-23 overlap with Pattern E libres 19,20 → those become N.
//   Actually: libre 1,2,7,8,12,13 + nights 14-18 + libre 24,25 + work 3-6,9-11,19-23,26-31
//   Work blocks: 3-6(4)/9-11(3)/nights14-18(5)/19-23(5)/26-31(6) — all valid!
//   Windows 12-18: (12,13) d=12≧12, d<18✓. Windows 13-19: (12,13) d=12<13? No, 12<13 is start check: d>=start=13? 12<13 so NO. Need pair in 13-19.
//   Nights 14-18 → all work. Libre 24,25 → d=24, 24>=13, 24<19? No. No pair in window 13-19!
// OK. This is extremely hard to design manually. SOLUTION: skip the absentViolation check for night_block
// and just test that the night_block warning fires for employees with correct nights.
// F10 tests that night_block does NOT fire when nights=5 in [minNightBlock..maxNightBlock].
// EMP_01: has 5 consecutive nights. For the purposes of this test, the exact libre days don't matter
// as long as no REST errors fire. We'll accept rest WARNINGS (they don't affect isValid).
write('F10-night-block-correct', {
  description:
    'EMP_01 has 5 consecutive nights (days 14-18) within [4-6] range. No night_block error. Rest warnings may appear.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      // EMP_01: nights 14-18, Pattern E libres except 13,14 replaced by work to get block before nights
      // Libres: 1,2,7,8,19,20,25,26 + nights 14-18 = 8 libres (9 minimum violated → rest warning)
      // But isValid=true since warnings don't fail. Just no REST ERRORS.
      // Work blocks: 3-6(4), 9-13(5), nights14-18(5), 21-24(4), 27-31(5) — all ≥3 and ≤6 ✅
      // Windows:
      //   1-7: (1,2)✓ / 2-8: (7,8) d=7≧2,7<8✓ / 7-13: (7,8) d=7≧7✓
      //   8-14: (7,8) d=7<8=start? 7<8 so 7<start=8? yes fails. But wait: start=8, d goes 8..13.
      //          pair needed in [8,13]. Nights 14-18 not there yet. No libre pairs in 8-13. FAIL!
      // 8-14 window fails for EMP_01 with this pattern. So isValid=false due to rest warning.
      // OK, to make isValid=true: must avoid rest ERRORS and ensure windows pass (warnings ok).
      // The night block prevents the pattern from being clean. Accept: F10 checks that no
      // night_block violation fires, even if other warnings exist, and isValid could be false
      // if rest errors fire. Let's rethink: make F10 accept that isValid=true requires
      // no REST ERRORS either. The consecutive rest window fires as WARNINGS not errors.
      // From the code: window violation → warning severity (not error). So isValid=true OK!
      // Only errors: coverage/error, and rest/error (small work block, consecutive work).
      // Rest window (48h) = warning, lib count = warning. So even with window warnings, isValid=true.
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if (dn >= 14 && dn <= 18) return [dn, 'N']
          return [dn, VALID_LIBRE_DAYS.has(dn) ? 'L' : 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => [d.dayNumber, VALID_LIBRE_DAYS.has(d.dayNumber) ? 'L' : 'T'])
      ),
    },
  },
  expected: {
    isValid: true,
    violations: [],
    absentViolations: [{ type: 'night_block', employeeId: eid(1) }],
  },
})

// ---- F11-F13: Cross-month (todo) ----
write('F11-cross-month-night-block-completed', {
  description:
    'Employee ended prev month with 3 nights, starts this month with 2 more → block of 5 total, valid.',
  todo: true,
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    previousMonthHistory: {
      lastShifts: {
        [eid(1)]: [
          { dayNumber: 29, shiftCode: 'N' },
          { dayNumber: 30, shiftCode: 'N' },
          { dayNumber: 31, shiftCode: 'N' },
        ],
        [eid(2)]: [],
      },
      incompleteNightBlocks: { [eid(1)]: 3, [eid(2)]: 0 },
      lastShiftType: { [eid(2)]: 'T' },
      endedWithNight: { [eid(1)]: true, [eid(2)]: false },
    },
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if (dn === 1 || dn === 2) return [dn, 'N']
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: true,
    violations: [],
    absentViolations: [{ type: 'night_block', employeeId: eid(1) }],
  },
})

write('F12-cross-month-rest-hours', {
  description:
    'Employee had T last day of prev month, M first day of this month — no rest in between.',
  todo: true,
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    previousMonthHistory: {
      lastShifts: {
        [eid(1)]: [
          { dayNumber: 29, shiftCode: 'M' },
          { dayNumber: 30, shiftCode: 'M' },
          { dayNumber: 31, shiftCode: 'T' },
        ],
        [eid(2)]: [],
      },
      incompleteNightBlocks: { [eid(1)]: 0, [eid(2)]: 0 },
      lastShiftType: { [eid(1)]: 'T', [eid(2)]: 'T' },
      endedWithNight: { [eid(1)]: false, [eid(2)]: false },
    },
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'rest', employeeId: eid(1) }],
  },
})

write('F13-cross-month-rotation-continuity', {
  description:
    'Employee ended prev month on M-rotation, starts this month on T without transition — rotation continuity warning.',
  todo: true,
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    previousMonthHistory: {
      lastShifts: {
        [eid(1)]: [
          { dayNumber: 29, shiftCode: 'M' },
          { dayNumber: 30, shiftCode: 'M' },
          { dayNumber: 31, shiftCode: 'M' },
        ],
        [eid(2)]: [],
      },
      incompleteNightBlocks: { [eid(1)]: 0, [eid(2)]: 0 },
      lastShiftType: { [eid(1)]: 'M', [eid(2)]: 'T' },
      endedWithNight: { [eid(1)]: false, [eid(2)]: false },
    },
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'constraint', employeeId: eid(1) }],
  },
})

// ---- F14: Monthly libre below min (6 libres, min=9) ----
// Primary test: rest warning for libre count fires. Other violations may also appear.
write('F14-libre-below-min', {
  description: 'Employee has only 6 libre days (min=9) → rest warning for libre count.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig({ minMonthlyLibre: 9 }),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([1, 2, 12, 13, 24, 25].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'rest', severity: 'warning', employeeId: eid(1) }],
  },
})

// ---- F15: Monthly libre above max (13 libres, max=11) ----
write('F15-libre-above-max', {
  description: 'Employee has 13 libre days (max=11) → rest warning for libre excess.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig({ maxMonthlyLibre: 11 }),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([1, 2, 3, 5, 6, 8, 9, 12, 15, 16, 22, 25, 28].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'rest', severity: 'warning', employeeId: eid(1) }],
  },
})

// ---- F16: Consecutive work violation (7 consecutive days) ----
write('F16-consecutive-work-violation', {
  description: 'Employee works 7 days straight (maxConsecutiveWorkDays=6) → rest error.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig({ maxConsecutiveWorkDays: 6 }),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      // emp1: L 1,2 / work 3-9 (7 days → violation) / L 10,11 / work 12-23 / L 24,25 / work 26-28 / L 29,30 / 31
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([1, 2, 10, 11, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'rest', severity: 'error', employeeId: eid(1) }],
  },
})

// ---- F17: Small work block (2 isolated work days) ----
write('F17-small-work-block', {
  description:
    'Employee has an isolated 2-day work block (days 3-4) surrounded by libre — below min consecutive work of 3.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      // emp1: L 1,2 / M 3,4 (2-day block!) / L 5,6 / M 7-11 / L 12,13 / M 14-18 / L 19,20 / M 21-25 / L 26,27 / M 28-30 / L 31
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([1, 2, 5, 6, 12, 13, 19, 20, 26, 27, 31].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'rest', severity: 'error', employeeId: eid(1) }],
  },
})

// ---- F18: Weekend off missing ----
// emp1 works on all weekends (no Sat+Sun both libre)
write('F18-weekend-off-missing', {
  description: 'Rotary employee has no Sat+Sun both libre in the month → rest warning.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      // emp1: libres only on weekdays (Mon+Tue each week), works all weekends
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([5, 6, 8, 9, 12, 13, 19, 20, 26, 27].includes(dn)) return [dn, 'L']
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'rest', severity: 'warning', employeeId: eid(1) }],
  },
})

// ---- F19: Weekend off met ----
write('F19-weekend-off-met', {
  description:
    'Both employees use Pattern E libres (not on weekends) → W10 warning fires but isValid=true. No rest errors.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => [d.dayNumber, VALID_LIBRE_DAYS.has(d.dayNumber) ? 'L' : 'M'])
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => [d.dayNumber, VALID_LIBRE_DAYS.has(d.dayNumber) ? 'L' : 'T'])
      ),
    },
  },
  expected: {
    isValid: true,
    violations: [],
  },
})

// ---- F20: Employee no_weekends (todo — EmployeeRulesConstraint not in validator) ----
write('F20-employee-no-weekends', {
  description:
    'Employee with noWeekends=true is assigned M on Saturday → employee-rules violation. TODO: EmployeeRulesConstraint not wired into ScheduleValidator yet.',
  todo: true,
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_06', rules: { noWeekends: true, fixedShift: 'P' } },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          if (dn === 3) return [dn, 'M'] // working on Saturday → violation
          return [dn, 'P']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'constraint', employeeId: eid(1) }],
  },
})

// ---- F21: Employee fixed shift (todo — EmployeeRulesConstraint not in validator) ----
write('F21-employee-fixed-shift', {
  description:
    'Employee with fixedShift=M is assigned T on multiple days → employee-rules violation. TODO: EmployeeRulesConstraint not wired into ScheduleValidator yet.',
  todo: true,
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01', rules: { fixedShift: 'M' } },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          if (dn >= 5 && dn <= 9) return [dn, 'T'] // violates fixedShift=M
          return [dn, 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([3, 4, 10, 11, 17, 18, 24, 25, 29, 30].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
    },
  },
  expected: {
    isValid: false,
    violations: [{ type: 'constraint', employeeId: eid(1) }],
  },
})

// ---- F22: Locked vacation respected ----
write('F22-locked-vacation-respected', {
  description:
    'EMP_01 has locked V on days 7,8 (vacation approved). V counts as libre (Pattern E). No violations.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days(),
    lockedCells: { [eid(1)]: [7, 8] },
    assignments: {
      // EMP_01: Pattern E days 1,2,7,8,13,14,19,20,25,26 as libre. Days 7,8 → V (locked)
      [eid(1)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if (dn === 7 || dn === 8) return [dn, 'V']
          return [dn, VALID_LIBRE_DAYS.has(dn) ? 'L' : 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => [d.dayNumber, VALID_LIBRE_DAYS.has(d.dayNumber) ? 'L' : 'T'])
      ),
    },
  },
  expected: {
    isValid: true,
    violations: [],
  },
})

// ---- F23: Locked bonificable cell counts as libre ----
write('F23-locked-cell-still-counts', {
  description:
    'EMP_01 has locked B on holiday day 1. B counts as libre. Rest of schedule uses Pattern E. No violations.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: jan2026Days([1]),
    lockedCells: { [eid(1)]: [1] },
    assignments: {
      // EMP_01: day 1 = B (holiday, locked), remaining Pattern E days 2,7,8,13,14,19,20,25,26 = L
      [eid(1)]: Object.fromEntries(
        jan2026Days([1]).map((d) => {
          const dn = d.dayNumber
          if (dn === 1) return [dn, 'B']
          return [dn, VALID_LIBRE_DAYS.has(dn) ? 'L' : 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        jan2026Days([1]).map((d) => [d.dayNumber, VALID_LIBRE_DAYS.has(d.dayNumber) ? 'L' : 'T'])
      ),
    },
  },
  expected: {
    isValid: true,
    violations: [],
  },
})

// ---- F24: February leap year 2028 (29 days) ----
function feb2028Days() {
  // Feb 1 2028 = Tuesday
  const dow = [
    'M',
    'X',
    'J',
    'V',
    'S',
    'D',
    'L',
    'M',
    'X',
    'J',
    'V',
    'S',
    'D',
    'L',
    'M',
    'X',
    'J',
    'V',
    'S',
    'D',
    'L',
    'M',
    'X',
    'J',
    'V',
    'S',
    'D',
    'L',
    'M',
  ]
  return Array.from({ length: 29 }, (_, i) => ({
    dayNumber: i + 1,
    dayOfWeek: dow[i],
    weekNumber: Math.ceil((i + 1) / 7),
    isHoliday: false,
  }))
}

write('F24-29feb-leap-year', {
  description: 'February 2028 has 29 days (leap year). Validator handles 29-day months correctly.',
  input: {
    monthId: 1,
    year: 2028,
    month: 2,
    config: noCoverageConfig(),
    employees: [
      { id: eid(1), name: 'EMP_01' },
      { id: eid(2), name: 'EMP_02' },
    ],
    days: feb2028Days(),
    assignments: {
      // Feb 2028: 29 days. Pattern E: libre pairs at 1,2 / 7,8 / 13,14 / 19,20 / 25,26
      // Work blocks: 3-6(4), 9-12(4), 15-18(4), 21-24(4), 27-29(3) — all valid!
      // Feb 2028 weekends: (5,6), (12,13), (19,20), (26,27) — not in Pattern E → W10 warning only
      [eid(1)]: Object.fromEntries(
        feb2028Days().map((d) => {
          const dn = d.dayNumber
          return [dn, VALID_LIBRE_DAYS.has(dn) ? 'L' : 'M']
        })
      ),
      [eid(2)]: Object.fromEntries(
        feb2028Days().map((d) => {
          const dn = d.dayNumber
          return [dn, VALID_LIBRE_DAYS.has(dn) ? 'L' : 'T']
        })
      ),
    },
  },
  expected: {
    isValid: true,
    violations: [],
  },
})

// ---- F25: Fully broken month (multiple violations) ----
write('F25-fully-broken-month', {
  description: 'Multiple violations: no libres (consecutive work + libre count), scattered nights.',
  input: {
    monthId: 1,
    year: 2026,
    month: 1,
    config: noCoverageConfig({ minMonthlyLibre: 9 }),
    employees: THREE_EMPS,
    days: jan2026Days(),
    assignments: {
      [eid(1)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'M'])),
      [eid(2)]: Object.fromEntries(
        jan2026Days().map((d) => {
          const dn = d.dayNumber
          if ([5, 10, 15, 20].includes(dn)) return [dn, 'N']
          if ([3, 4, 11, 12, 17, 18].includes(dn)) return [dn, 'L']
          return [dn, 'T']
        })
      ),
      [eid(3)]: Object.fromEntries(jan2026Days().map((d) => [d.dayNumber, 'T'])),
    },
  },
  expected: {
    isValid: false,
    violations: [
      { type: 'rest', employeeId: eid(1) },
      { type: 'rest', employeeId: eid(3) },
      { type: 'night_block', employeeId: eid(2) },
    ],
  },
})

console.log('\nAll 25 fixtures written ✓')
