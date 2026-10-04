// services/scheduling/solver-errors.ts

// What the client sees when generating a schedule fails. The solver's own
// message carries internal details (process errors, up to 300 characters of
// daemon output), so it is only logged; the errorCode still tells the cases
// apart
export function solverErrorMessage(errorCode: string | undefined): string {
  if (errorCode === 'TIMEOUT') {
    return 'El solver no encontró un horario en el tiempo límite. Prueba de nuevo o relaja las restricciones'
  }
  return 'Error interno del solver al generar el horario'
}
