// services/scheduling/solver-client.ts
// Wrapper que spawnea el solver Python y gestiona stdin/stdout/timeout.

import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SolverInput, SolverOutput } from './types/solver.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Ruta al solver Python (relativa al backend/)
const SOLVER_DIR = join(__dirname, '..', '..', 'scheduling-solver')

// En Windows el ejecutable de la venv está en Scripts/, en Linux/Mac en bin/
const PYTHON_BIN = process.platform === 'win32'
  ? join(SOLVER_DIR, 'venv', 'Scripts', 'python.exe')
  : join(SOLVER_DIR, 'venv', 'bin', 'python')

const MAIN_PY = join(SOLVER_DIR, 'main.py')

// Margen sobre el timeout del solver. Cubre arranque del intérprete Python + carga
// de ortools (cold start puede ser de varios segundos en Windows con antivirus activo).
const PROCESS_TIMEOUT_BUFFER_MS = 60_000

export async function runSolver(input: SolverInput): Promise<SolverOutput> {
  const timeoutMs =
    ((input.options?.timeoutSeconds ?? 30) * 1000) + PROCESS_TIMEOUT_BUFFER_MS

  return new Promise<SolverOutput>((resolve, reject) => {
    const py = spawn(PYTHON_BIN, [MAIN_PY], {
      timeout: timeoutMs,
      cwd: SOLVER_DIR,
    })

    let stdout = ''
    let stderr = ''

    py.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    py.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    py.on('close', (code: number | null) => {
      if (stderr.trim()) {
        console.error('[solver-client] stderr:', stderr.trim())
      }

      if (code === 2) {
        resolve({
          status: 'error',
          errorCode: 'INVALID_INPUT',
          message: `Input inválido: ${stderr.slice(0, 300)}`,
        })
        return
      }

      try {
        const output = JSON.parse(stdout) as SolverOutput
        resolve(output)
      } catch {
        resolve({
          status: 'error',
          errorCode: 'INTERNAL',
          message: `Output del solver no es JSON válido: ${stdout.slice(0, 300)}`,
        })
      }
    })

    py.on('error', (err: Error) => {
      // Python no encontrado u otro error de spawn
      reject(new Error(`No se pudo iniciar el solver Python: ${err.message}`))
    })

    // Enviar input por stdin
    const inputJson = JSON.stringify(input)
    py.stdin.write(inputJson, 'utf-8')
    py.stdin.end()
  })
}
