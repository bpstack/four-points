# Scheduling Corpus

Test fixtures for the `ScheduleValidator`. Each fixture is a JSON file that describes:

- A scheduling scenario (employees, days, assignments, config)
- Expected validation output (which violations must/must not be present)

Used in two places:

1. **Today**: run against the TypeScript `ScheduleValidator` via Vitest
2. **Fase 2**: run against the Python CP-SAT solver for parity checks (same JSON, different runner)

## Running

```bash
# Run corpus tests only
pnpm test:corpus

# Run all backend tests (includes corpus)
pnpm test
```

## Structure

```
scheduling-corpus/
├── _schema.ts          — TypeScript type contracts for fixtures
├── loader.ts           — Load fixtures from fixtures/ directory
├── factory.ts          — Helper functions to build validator inputs
├── generate-fixtures.mjs — One-shot generator (run to regenerate fixtures/)
├── README.md           — This file
└── fixtures/
    ├── F01-empty-month.json
    ├── F02-perfect-month.json
    └── ... (25 total)
```

## Fixture categories

| Range     | Category              | Count  |
| --------- | --------------------- | ------ |
| F01-F02   | Smoke                 | 2      |
| F03-F06   | Coverage M/T/N/max    | 4      |
| F07-F08   | Rest hours            | 2      |
| F09-F10   | Night blocks          | 2      |
| F11-F13   | Cross-month (todo)    | 3      |
| F14-F15   | Monthly libre limits  | 2      |
| F16-F17   | Consecutive work      | 2      |
| F18-F19   | Weekend off (soft S3) | 2      |
| F20-F21   | Employee rules        | 2      |
| F22-F23   | Locked cells          | 2      |
| F24       | Edge: leap year Feb   | 1      |
| F25       | Edge: fully broken    | 1      |
| **Total** |                       | **25** |

Cross-month fixtures (F11–F13) are marked `"todo": true` — they will pass as `it.todo` until step B.0 wires `PreviousMonthHistory` into the validator.

## Adding a fixture

1. Edit `generate-fixtures.mjs` — add a `write('F##-slug', { ... })` call at the end.
2. Run `node generate-fixtures.mjs` from this directory to regenerate `fixtures/`.
3. Run `pnpm test:corpus` to verify the new fixture passes.

### Fixture format

```jsonc
{
  "id": "F##-kebab-case",
  "description": "Human-readable description",
  "todo": false, // optional — marks test as pending
  "input": {
    "monthId": 1,
    "year": 2026,
    "month": 1,
    "config": {
      /* partial, merged with defaultConfig() */
    },
    "employees": [{ "id": "E0000000-0000-0000-0000-000000000001", "name": "EMP_01", "rules": {} }],
    "days": [{ "dayNumber": 1, "dayOfWeek": "J", "weekNumber": 1, "isHoliday": false }],
    "assignments": {
      "E0000000-0000-0000-0000-000000000001": { "1": "M", "2": "T" },
    },
    "lockedCells": {
      // optional
      "E0000000-0000-0000-0000-000000000001": [3, 4],
    },
    "previousMonthHistory": null, // or { lastShifts, incompleteNightBlocks, ... }
  },
  "expected": {
    "isValid": true,
    "violations": [
      // Each matcher must find ≥1 matching warning in the result
      { "type": "coverage", "severity": "error", "day": 5 },
    ],
    "absentViolations": [
      // Each matcher must find 0 matching warnings
      { "type": "night_block", "employeeId": "E0000000-0000-0000-0000-000000000001" },
    ],
  },
}
```

### Violation matching

Matchers match by **shape**, NOT by message text. Fields:

- `type`: `"coverage" | "night_block" | "rest" | "hours" | "constraint" | "validation"`
- `severity`: `"error" | "warning" | "info"`
- `employeeId`: optional — specific employee UUID or omit for "any"
- `day`: optional — specific day number or omit for "any"

### Employee IDs

Use deterministic IDs: `E0000000-0000-0000-0000-000000000001` (employee 1), `E0000000-0000-0000-0000-000000000002` (employee 2), etc.

### Constraint: don't fix fixtures to match bugs

If a fixture reveals a bug in the validator, document it in `docs/scheduling/decisions.md` and fix the validator in step B. Do NOT adjust the expected output to match wrong validator behavior.

## Config defaults

The `defaultConfig()` function (in `factory.ts`) returns values from `docs/scheduling/constraints.md §4`:

| Key                    | Value |
| ---------------------- | ----- |
| minMorningStaff        | 1     |
| prefMorningStaff       | 2     |
| maxMorningStaff        | 6     |
| minAfternoonStaff      | 1     |
| prefAfternoonStaff     | 2     |
| maxAfternoonStaff      | 6     |
| minNightStaff          | 1     |
| maxNightStaff          | 1     |
| minNightBlock          | 4     |
| maxNightBlock          | 6     |
| minMonthlyLibre        | 9     |
| maxMonthlyLibre        | 11    |
| maxConsecutiveWorkDays | 6     |
| annualVacationDays     | 30    |
| annualHolidays         | 20    |
| annualFreeDays         | 90    |
