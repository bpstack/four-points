"""
daemon.py — Daemon Python persistente para el solver.

Protocolo (una petición por vez, sincrónico):
  stdin  → una línea JSON con SolverInput  (newline-delimited)
  stdout → una línea JSON con SolverOutput (newline-delimited)
  stderr → logs de debug

El daemon corre indefinidamente. Si recibe EOF en stdin, termina limpiamente.
Node.js lo spawnea UNA vez al arrancar y lo reutiliza para todas las peticiones,
eliminando el coste de arranque de Python + ortools en cada generación.
"""

import sys
import json

# Importar en el arranque para que el coste de carga se pague una sola vez.
from pydantic import ValidationError
from schemas import SolverInput
from model import solve


def main() -> None:
    # Señalizar que el daemon está listo
    print(json.dumps({"status": "ready"}), flush=True)

    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue

        # Validar JSON
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            out = {"status": "error", "errorCode": "INVALID_INPUT", "message": f"JSON invalido: {e}"}
            print(json.dumps(out), flush=True)
            continue

        # Validar schema
        try:
            solver_input = SolverInput.model_validate(data)
        except ValidationError as e:
            out = {"status": "error", "errorCode": "INVALID_INPUT",
                   "message": "Schema incorrecto", "details": e.errors()}
            print(json.dumps(out), flush=True)
            continue

        # Resolver
        try:
            result = solve(solver_input)
            print(result.model_dump_json(), flush=True)
        except Exception as e:
            print(f"[daemon] ERROR interno: {e}", file=sys.stderr, flush=True)
            out = {"status": "error", "errorCode": "INTERNAL", "message": str(e)}
            print(json.dumps(out), flush=True)


if __name__ == "__main__":
    main()
