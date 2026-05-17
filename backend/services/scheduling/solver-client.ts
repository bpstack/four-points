// services/scheduling/solver-client.ts
// Wrapper que gestiona el daemon Python persistente del solver.
//
// Arquitectura daemon (vs spawn por petición):
//   - El proceso Python arranca UNA VEZ al llegar la primera petición.
//   - ortools se importa una sola vez — el coste de startup (~1200s en Windows frío
//     con Windows Defender) se paga una sola vez y jamás se repite.
//   - Cada petición envía una línea JSON por stdin y lee una línea JSON de stdout.
//   - Las peticiones son secuenciales (semáforo): no hay concurrencia de procesos.
//   - Si el daemon muere inesperadamente se reinicia automáticamente.

import { spawn, type ChildProcess } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SolverInput, SolverOutput } from './types/solver.js'
import { logger } from '../../config/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SOLVER_DIR = join(__dirname, '..', '..', 'scheduling-solver')

const PYTHON_BIN = process.platform === 'win32'
  ? join(SOLVER_DIR, 'venv', 'Scripts', 'python.exe')
  : join(SOLVER_DIR, 'venv', 'bin', 'python')

const DAEMON_PY = join(SOLVER_DIR, 'daemon.py')

// Tiempo máximo esperando al daemon (arranque + ortools import).
// En Windows con Windows Defender puede tardar hasta 20 minutos la primera vez.
// En Linux/Mac: 5-10 segundos.
const DAEMON_STARTUP_TIMEOUT_MS = 30 * 60 * 1000  // 30 min

// Tiempo máximo para que el solver responda una vez que el daemon ya está listo.
const SOLVE_TIMEOUT_MS = 60_000  // 60 s (timeout solver 30 s + margen)

// ── Estado del daemon ─────────────────────────────────────────────────────────

type DaemonState =
  | { phase: 'idle' }
  | { phase: 'starting'; promise: Promise<void>; resolve: () => void; reject: (e: Error) => void }
  | { phase: 'ready'; py: ChildProcess; lineBuffer: string }

let _daemon: DaemonState = { phase: 'idle' }

// Callback pendiente: resolve con la línea de respuesta del daemon, o reject si muere
let _pendingResolve: ((line: string) => void) | null = null
let _pendingReject: ((e: Error) => void) | null = null

function startDaemon(): Promise<void> {
  if (_daemon.phase === 'ready') return Promise.resolve()
  if (_daemon.phase === 'starting') return _daemon.promise

  let resolve!: () => void
  let reject!: (e: Error) => void
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej })
  _daemon = { phase: 'starting', promise, resolve, reject }

  const py = spawn(PYTHON_BIN, [DAEMON_PY], { cwd: SOLVER_DIR })

  // Buffer para ir acumulando salida por líneas
  let lineBuf = ''

  py.stdout.on('data', (chunk: Buffer) => {
    lineBuf += chunk.toString()
    const lines = lineBuf.split('\n')
    lineBuf = lines.pop() ?? ''    // último fragmento sin \n → queda en buffer

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      onDaemonLine(trimmed)
    }
  })

  py.stderr.on('data', (chunk: Buffer) => {
    const msg = chunk.toString().trim()
    if (msg) logger.error({ err: msg }, '[solver-daemon] stderr')
  })

  py.on('close', (code, signal) => {
    const reason = signal ? `señal ${signal}` : `código ${code}`
    const err = new Error(`Daemon Python terminó inesperadamente (${reason})`)
    logger.error({ err }, '[solver-daemon]')

    // Si hay una petición en vuelo, rechazarla
    _pendingReject?.(err)
    _pendingResolve = null
    _pendingReject = null

    // Si estaba arrancando, rechazar la promesa de startup
    if (_daemon.phase === 'starting') {
      _daemon.reject(err)
    }

    _daemon = { phase: 'idle' }
  })

  py.on('error', (err) => {
    logger.error({ err }, '[solver-daemon] error al iniciar')
    if (_daemon.phase === 'starting') {
      (_daemon as Extract<DaemonState, { phase: 'starting' }>).reject(err)
    }
    _pendingReject?.(err)
    _pendingResolve = null
    _pendingReject = null
    _daemon = { phase: 'idle' }
  })

  // Timeout de arranque (por si el import tarda demasiado)
  const startupTimer = setTimeout(() => {
    if (_daemon.phase === 'starting') {
      const err = new Error(
        `Timeout esperando al daemon (${DAEMON_STARTUP_TIMEOUT_MS / 1000}s). ` +
        `En Windows la primera vez puede tardar varios minutos (Windows Defender). ` +
        `Añade la carpeta venv a las exclusiones de Windows Defender.`
      )
      ;(_daemon as Extract<DaemonState, { phase: 'starting' }>).reject(err)
      py.kill('SIGKILL')
    }
  }, DAEMON_STARTUP_TIMEOUT_MS)

  // Handler de líneas recibidas del daemon
  function onDaemonLine(line: string) {
    if (_daemon.phase === 'starting') {
      // Primera línea: {"status":"ready"} → daemon listo
      clearTimeout(startupTimer)
      ;(_daemon as Extract<DaemonState, { phase: 'starting' }>).resolve()
      _daemon = { phase: 'ready', py, lineBuffer: '' }
      logger.info('[solver-daemon] listo (ortools cargado)')
      return
    }

    // Respuesta a una petición pendiente
    if (_pendingResolve) {
      const cb = _pendingResolve
      _pendingResolve = null
      _pendingReject = null
      cb(line)
    } else {
      logger.warn({ line: line.slice(0, 100) }, '[solver-daemon] línea recibida sin petición pendiente')
    }
  }

  return promise
}

// ── Semáforo ──────────────────────────────────────────────────────────────────

let _busy = false
const _queue: Array<() => void> = []

function acquire(): Promise<void> {
  return new Promise((resolve) => {
    if (!_busy) { _busy = true; resolve() }
    else _queue.push(resolve)
  })
}

function release(): void {
  const next = _queue.shift()
  if (next) next()
  else _busy = false
}

// ── API pública ───────────────────────────────────────────────────────────────

export async function runSolver(
  input: SolverInput,
  signal?: AbortSignal
): Promise<SolverOutput> {
  await acquire()
  try {
    return await _runWithDaemon(input, signal)
  } finally {
    release()
  }
}

async function _runWithDaemon(
  input: SolverInput,
  signal?: AbortSignal
): Promise<SolverOutput> {
  if (signal?.aborted) {
    return { status: 'error', errorCode: 'INTERNAL', message: 'Petición cancelada antes de iniciar' }
  }

  // Asegurar que el daemon está corriendo (puede tardar mucho la primera vez)
  try {
    await startDaemon()
  } catch (err: any) {
    return { status: 'error', errorCode: 'INTERNAL', message: `No se pudo iniciar el daemon: ${err.message}` }
  }

  if (_daemon.phase !== 'ready') {
    return { status: 'error', errorCode: 'INTERNAL', message: 'Daemon no disponible tras arranque' }
  }

  const py = _daemon.py

  // Enviar petición al daemon (una línea JSON)
  const inputJson = JSON.stringify(input)
  py.stdin!.write(inputJson + '\n', 'utf-8')

  const responsePromise = new Promise<string>((res, rej) => {
    _pendingResolve = res
    _pendingReject = rej
  })

  // Timeout: matar el daemon para reinicio limpio.
  // No podemos "cancelar" la operación en curso sin desincronizar el protocolo
  // stdin/stdout — matar el proceso es la única salida segura. py.on('close')
  // limpiará el estado y el siguiente request reiniciará el daemon.
  const timeoutHandle = setTimeout(() => {
    logger.error({ timeoutSeconds: SOLVE_TIMEOUT_MS / 1000 }, '[solver-daemon] Timeout — reiniciando daemon')
    py.kill('SIGKILL')
  }, SOLVE_TIMEOUT_MS)

  // Abort: solo marcamos flag. NO rechazamos responsePromise.
  // El semáforo permanece bloqueado hasta que el daemon responda,
  // evitando que el siguiente request reciba la respuesta de este.
  let clientAborted = false
  const onAbort = () => { clientAborted = true }
  signal?.addEventListener('abort', onAbort)

  let responseLine: string
  try {
    responseLine = await responsePromise
  } catch (err: any) {
    // Daemon murió (py.on('close') → _pendingReject) o timeout lo mató
    return { status: 'error', errorCode: 'INTERNAL', message: err.message }
  } finally {
    clearTimeout(timeoutHandle)
    signal?.removeEventListener('abort', onAbort)
  }

  if (clientAborted) {
    return { status: 'error', errorCode: 'INTERNAL', message: 'Petición cancelada por el cliente' }
  }

  try {
    return JSON.parse(responseLine) as SolverOutput
  } catch {
    return {
      status: 'error',
      errorCode: 'INTERNAL',
      message: `Output del daemon no es JSON válido: ${responseLine.slice(0, 300)}`,
    }
  }
}

/**
 * Pre-calienta el daemon en el arranque del servidor.
 * Fire-and-forget: lanza el daemon en background para que cuando llegue la primera
 * petición real, ortools ya esté importado.
 */
export function warmupSolver(): void {
  logger.info('[solver-daemon] Pre-calentando daemon en background')
  startDaemon().then(() => {
    logger.info('[solver-daemon] Daemon caliente y listo.')
  }).catch((err) => {
    logger.warn({ err }, '[solver-daemon] Warm-up falló (se reintentará en la primera petición)')
    _daemon = { phase: 'idle' }  // permitir reintento
  })
}
