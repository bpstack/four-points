// services/scheduling/generated-rows.ts
// Rows to insert after a generation. applyGeneratedSchedule deletes every
// assignment of the month without source_constraint_id, so only the cells
// stored with one survive. The other locked cells (approved requests and
// fixed days) live only in lockedCells and are inserted with their locked
// value; skipping them, as before 2026-10-11, left those cells empty.

export interface GeneratedRow {
  day_id: number
  employee_id: string
  shift_code: string
  source_constraint_id: null
}

export function generatedRows(
  matrix: Record<string, Record<string, string>>,
  lockedCells: Record<string, Record<string, string>>,
  dayIdByNumber: ReadonlyMap<number, number>,
  persisted: ReadonlySet<string> // `${employee_id}:${day_id}` stored with source_constraint_id
): GeneratedRow[] {
  const cells: Record<string, Record<string, string>> = {}
  for (const source of [matrix, lockedCells]) {
    for (const [empId, dayShifts] of Object.entries(source)) {
      cells[empId] = { ...cells[empId], ...dayShifts }
    }
  }

  const rows: GeneratedRow[] = []
  for (const [empId, dayShifts] of Object.entries(cells)) {
    for (const [dayNum, shiftCode] of Object.entries(dayShifts)) {
      // Negative keys are the solver's virtual days of the previous month
      const dayId = dayIdByNumber.get(Number(dayNum))
      if (!dayId || persisted.has(`${empId}:${dayId}`)) continue
      rows.push({
        day_id: dayId,
        employee_id: empId,
        shift_code: shiftCode,
        source_constraint_id: null,
      })
    }
  }
  return rows
}
