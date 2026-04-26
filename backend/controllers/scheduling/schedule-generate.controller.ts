// controllers/scheduling/schedule-generate.controller.ts
// POST /months/:id/generate — invoca el solver Python y vuelca la matriz resultante.

import type { Request, Response } from 'express'
import * as repo from '../../repositories/scheduling/scheduling-repository.js'
import { buildSolverInput } from '../../services/scheduling/build-solver-input.js'
import { runSolver } from '../../services/scheduling/solver-client.js'
import type { SolverSuccess } from '../../services/scheduling/types/solver.js'

export async function generateSchedule(req: Request, res: Response): Promise<void> {
  const monthId = Number(req.params.id)
  if (isNaN(monthId)) {
    res.status(400).json({ error: 'ID de mes inválido' })
    return
  }

  // 1. Verificar que el mes existe y está en draft
  const month = await repo.getMonthById(monthId)
  if (!month) {
    res.status(404).json({ error: 'Mes no encontrado' })
    return
  }
  if (month.status === 'published') {
    res.status(409).json({ error: 'El mes está publicado y no se puede regenerar' })
    return
  }

  // 2. Verificar que hay días generados
  const days = await repo.getDaysByMonth(monthId)
  if (days.length === 0) {
    res.status(422).json({ error: 'El mes no tiene días generados. Crea el mes completo primero.' })
    return
  }

  // 3. Construir input del solver
  const solverInput = await buildSolverInput(monthId, month.year, month.month)

  if (solverInput.employees.length === 0) {
    res.status(422).json({ error: 'No hay empleados asignados al scheduling. Añade empleados primero.' })
    return
  }

  console.log(
    `[generate] Mes ${monthId} (${month.year}-${month.month}): ` +
    `${solverInput.employees.length} empleados, ${days.length} días, ` +
    `${Object.keys(solverInput.lockedCells).length} empleados con celdas bloqueadas`
  )

  // 4. Invocar solver
  let solverOutput
  try {
    solverOutput = await runSolver(solverInput)
  } catch (err: any) {
    console.error('[generate] Error invocando solver:', err.message)
    res.status(500).json({ error: `Error invocando el solver: ${err.message}` })
    return
  }

  // 5. Manejar resultado
  if (solverOutput.status === 'error') {
    console.error(
      `[generate] Solver error (${solverOutput.errorCode}): ${solverOutput.message}`
    )
    res.status(500).json({ error: solverOutput.message, errorCode: solverOutput.errorCode })
    return
  }

  if (solverOutput.status === 'infeasible') {
    console.warn('[generate] Solver INFEASIBLE')
    res.status(422).json({
      error: 'No existe un horario válido con las reglas actuales',
      conflictingConstraints: solverOutput.conflictingConstraints,
      suggestedRelaxations: solverOutput.suggestedRelaxations,
    })
    return
  }

  // 6. Volcar matriz en BD (respetando celdas bloqueadas)
  const success = solverOutput as SolverSuccess
  const dayMap = new Map(days.map((d) => [d.day_number, d.id]))

  // Borrar solo asignaciones NO bloqueadas (source_constraint_id IS NULL)
  const deleted = await repo.deleteUnlockedAssignmentsByMonth(monthId)
  console.log(`[generate] Eliminadas ${deleted} asignaciones no-bloqueadas`)

  // Insertar las nuevas asignaciones del solver (saltar celdas bloqueadas)
  const lockedSet = new Set<string>()
  for (const [empId, dayDayMap] of Object.entries(solverInput.lockedCells)) {
    for (const dayNum of Object.keys(dayDayMap)) {
      lockedSet.add(`${empId}:${dayNum}`)
    }
  }

  const toInsert: { day_id: number; employee_id: string; shift_code: string; source_constraint_id: null }[] = []

  for (const [empId, dayShifts] of Object.entries(success.matrix)) {
    for (const [dayNumStr, shiftCode] of Object.entries(dayShifts)) {
      if (lockedSet.has(`${empId}:${dayNumStr}`)) continue

      const dayId = dayMap.get(Number(dayNumStr))
      if (!dayId) continue

      toInsert.push({ day_id: dayId, employee_id: empId, shift_code: shiftCode, source_constraint_id: null })
    }
  }

  if (toInsert.length > 0) {
    await repo.createAssignmentsBulk(monthId, toInsert)
  }

  console.log(`[generate] Insertadas ${toInsert.length} asignaciones para mes ${monthId}`)

  // Recalcular libre_number para todos los empleados del mes (L → L1,L1,L2,L2…)
  const empIds = solverInput.employees.map((e) => e.id)
  await Promise.all(empIds.map((id) => repo.recalculateLibreNumbers(id, month.year)))

  console.log(`[generate] Libres numerados para ${empIds.length} empleados`)

  res.json({
    status: 'ok',
    assignmentsCreated: toInsert.length,
    stats: success.stats,
  })
}
