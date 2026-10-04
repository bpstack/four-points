// controllers/scheduling/schedule-generate.controller.ts
// POST /months/:id/generate — invoca el solver Python y vuelca la matriz resultante.

import type { Request, Response } from 'express'
import * as repo from '../../repositories/scheduling/scheduling-repository.js'
import type { SolverRunRecord } from '../../repositories/scheduling/scheduling-repository.js'
import { logger } from '../../config/logger.js'
import { buildSolverInput } from '../../services/scheduling/build-solver-input.js'
import { runSolver } from '../../services/scheduling/solver-client.js'
import type { SolverSuccess, SolverOutput } from '../../services/scheduling/types/solver.js'
import { solverErrorMessage } from '../../services/scheduling/solver-errors.js'

/** Persiste el registro del run; nunca lanza — error de log no debe romper la respuesta. */
async function recordSolverRun(data: SolverRunRecord): Promise<void> {
  try {
    await repo.insertSolverRun(data)
  } catch (err) {
    logger.error({ err }, '[generate] Fallo persistiendo scheduling_solver_runs')
  }
}

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
    res
      .status(422)
      .json({ error: 'No hay empleados asignados al scheduling. Añade empleados primero.' })
    return
  }

  logger.info(
    {
      monthId,
      year: month.year,
      month: month.month,
      employeesCount: solverInput.employees.length,
      daysCount: days.length,
      lockedEmployeesCount: Object.keys(solverInput.lockedCells).length,
    },
    '[generate] solver input built'
  )

  const generatedBy = req.user?.id ?? null

  // 4. Invocar solver (abort si el cliente se desconecta)
  const abortController = new AbortController()
  req.on('close', () => abortController.abort())

  const startMs = Date.now()
  let solverOutput: SolverOutput
  try {
    solverOutput = await runSolver(solverInput, abortController.signal)
  } catch (err) {
    const elapsed = Date.now() - startMs
    logger.error({ err, elapsed }, '[generate] Error invocando solver')
    await recordSolverRun({
      monthId,
      generatedBy,
      status: 'error',
      solveTimeMs: elapsed,
      cpStatus: null,
      softPenalty: null,
      softPenaltyBreakdown: null,
      solverInput,
      solverMatrix: null,
      conflictingConstraints: null,
    })
    res.status(500).json({ error: solverErrorMessage('INTERNAL'), errorCode: 'INTERNAL' })
    return
  }
  const elapsedMs = Date.now() - startMs

  // 5. Manejar resultado
  if (solverOutput.status === 'error') {
    logger.error(
      { errorCode: solverOutput.errorCode, message: solverOutput.message },
      '[generate] Solver error'
    )
    await recordSolverRun({
      monthId,
      generatedBy,
      status: 'error',
      solveTimeMs: elapsedMs,
      cpStatus: solverOutput.errorCode,
      softPenalty: null,
      softPenaltyBreakdown: null,
      solverInput,
      solverMatrix: null,
      conflictingConstraints: null,
    })
    res.status(500).json({
      error: solverErrorMessage(solverOutput.errorCode),
      errorCode: solverOutput.errorCode,
    })
    return
  }

  if (solverOutput.status === 'infeasible') {
    const tail = solverInput.previousMonthTail ?? {}
    logger.warn(
      {
        employeesSummary: solverInput.employees.map((e) => ({
          id: e.id,
          fixedShift: e.rules?.fixedShift,
          lockedDays: Object.keys(solverInput.lockedCells[e.id] ?? {}).length,
          lockedCells: solverInput.lockedCells[e.id] ?? {},
          tail: tail[e.id] ?? [],
        })),
        config: solverInput.config,
      },
      '[generate] Solver INFEASIBLE — input summary'
    )
    await recordSolverRun({
      monthId,
      generatedBy,
      status: 'infeasible',
      solveTimeMs: elapsedMs,
      cpStatus: 'INFEASIBLE',
      softPenalty: null,
      softPenaltyBreakdown: null,
      solverInput,
      solverMatrix: null,
      conflictingConstraints: {
        conflictingConstraints: solverOutput.conflictingConstraints,
        suggestedRelaxations: solverOutput.suggestedRelaxations,
      },
    })
    res.status(422).json({
      error: 'No existe un horario válido con las reglas actuales',
      conflictingConstraints: solverOutput.conflictingConstraints,
      suggestedRelaxations: solverOutput.suggestedRelaxations,
    })
    return
  }

  // 6. Volcar matriz en BD dentro de una sola transacción (delete + insert atómicos)
  const success = solverOutput as SolverSuccess
  const dayMap = new Map(days.map((d) => [d.day_number, d.id]))

  const lockedSet = new Set<string>()
  for (const [empId, dayDayMap] of Object.entries(solverInput.lockedCells)) {
    for (const dayNum of Object.keys(dayDayMap)) {
      lockedSet.add(`${empId}:${dayNum}`)
    }
  }

  const toInsert: {
    day_id: number
    employee_id: string
    shift_code: string
    source_constraint_id: null
  }[] = []
  for (const [empId, dayShifts] of Object.entries(success.matrix)) {
    for (const [dayNumStr, shiftCode] of Object.entries(dayShifts)) {
      if (lockedSet.has(`${empId}:${dayNumStr}`)) continue
      const dayId = dayMap.get(Number(dayNumStr))
      if (!dayId) continue
      toInsert.push({
        day_id: dayId,
        employee_id: empId,
        shift_code: shiftCode,
        source_constraint_id: null,
      })
    }
  }

  const { deleted, inserted } = await repo.applyGeneratedSchedule(monthId, toInsert)
  logger.info({ monthId, deleted, inserted }, '[generate] transacción completada')

  // Persistir run exitoso. La matriz original (pre-edición) sirve para el bucle de feedback futuro.
  await recordSolverRun({
    monthId,
    generatedBy,
    status: 'ok',
    solveTimeMs: success.stats.solveTimeMs ?? elapsedMs,
    cpStatus: success.stats.status ?? null,
    softPenalty: success.stats.softPenalty ?? null,
    softPenaltyBreakdown: success.stats.softPenaltyBreakdown ?? null,
    solverInput,
    solverMatrix: success.matrix,
    conflictingConstraints: null,
  })

  // Recalcular libre_number para todos los empleados del mes (L → L1,L1,L2,L2…)
  // Usamos allSettled: la matriz ya está committeada. Si una recalculación falla,
  // logueamos el error pero no rompemos la respuesta — el horario es válido aunque
  // la numeración de libres quede inconsistente para ese empleado.
  const empIds = solverInput.employees.map((e) => e.id)
  const results = await Promise.allSettled(
    empIds.map((id) => repo.recalculateLibreNumbers(id, month.year))
  )
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? { empId: empIds[i], reason: r.reason } : null))
    .filter((x): x is { empId: string; reason: unknown } => x !== null)
  if (failed.length > 0) {
    logger.error(
      { monthId, failedCount: failed.length, totalCount: empIds.length, failed },
      '[generate] recálculos de libre_number fallaron'
    )
  }
  logger.info(
    { successCount: empIds.length - failed.length, totalCount: empIds.length },
    '[generate] libres numerados'
  )

  res.json({
    status: 'ok',
    assignmentsCreated: toInsert.length,
    stats: success.stats,
  })
}
