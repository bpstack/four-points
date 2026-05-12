"""
main.py — CLI entry point del solver.

Protocolo (SCHEDULING-SOLVER-PLAN.md §3.4):
  stdin  → JSON con SolverInput
  stdout → JSON con SolverOutput
  stderr → logs de debug
  Exit 0 → resultado válido (ok o infeasible)
  Exit 1 → error interno
  Exit 2 → input inválido (JSON malformado o schema incorrecto)
"""

import sys
import json

from pydantic import ValidationError

from schemas import SolverInput
from model import solve


def main() -> None:
    # 1. Leer stdin
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        error = {"status": "error", "errorCode": "INVALID_INPUT", "message": f"JSON invalido: {e}"}
        print(json.dumps(error))
        sys.exit(2)

    # 2. Validar schema
    try:
        solver_input = SolverInput.model_validate(data)
    except ValidationError as e:
        error = {
            "status": "error",
            "errorCode": "INVALID_INPUT",
            "message": "Schema incorrecto",
            "details": e.errors(),
        }
        print(json.dumps(error))
        sys.exit(2)

    # 3. Resolver
    try:
        result = solve(solver_input)
    except Exception as e:
        print(f"[solver] ERROR interno: {e}", file=sys.stderr)
        error = {"status": "error", "errorCode": "INTERNAL", "message": str(e)}
        print(json.dumps(error))
        sys.exit(1)

    # 4. Serializar output
    print(result.model_dump_json())
    sys.exit(0)


if __name__ == "__main__":
    main()
