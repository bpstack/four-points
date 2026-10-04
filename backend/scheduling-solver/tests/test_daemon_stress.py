"""
test_daemon_stress.py — Stress test del daemon Python persistente.

Verifica que daemon.py:
  - Arranca y emite {"status":"ready"} en la primera línea
  - Procesa requests válidas correctamente
  - Aguanta requests inválidas (JSON mal formado, schema incorrecto) sin morir
  - Se recupera y sigue respondiendo correctamente tras errores
  - Ignora líneas vacías
  - Mantiene sincronía tras múltiples requests secuenciales

Ejecución:
  cd backend/scheduling-solver
  venv/Scripts/python -m pytest tests/test_daemon_stress.py -v

Nota: el daemon importa ortools al arrancar. En Windows con Windows Defender
puede tardar varios minutos la primera vez (DLL scan). El timeout de startup
está configurado en 20 minutos para cubrir este caso.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

import pytest

DAEMON_PY = Path(__file__).parent.parent / "daemon.py"
PYTHON_BIN = sys.executable

STARTUP_TIMEOUT = 20 * 60   # 20 min (Windows Defender cold-start)
SOLVE_TIMEOUT = 60          # 60 s por request

# ── Fixture mínimo (2 empleados, 7 días, sin restricciones de cobertura) ──────

MINIMAL_INPUT = {
    "monthId": 1,
    "year": 2026,
    "month": 1,
    "employees": [
        {"id": "A", "name": "EMP_01"},
        {"id": "B", "name": "Bob"},
    ],
    "days": [
        {"dayNumber": 1, "dayOfWeek": "J", "weekNumber": 1},
        {"dayNumber": 2, "dayOfWeek": "V", "weekNumber": 1},
        {"dayNumber": 3, "dayOfWeek": "S", "weekNumber": 1},
        {"dayNumber": 4, "dayOfWeek": "D", "weekNumber": 1},
        {"dayNumber": 5, "dayOfWeek": "L", "weekNumber": 2},
        {"dayNumber": 6, "dayOfWeek": "M", "weekNumber": 2},
        {"dayNumber": 7, "dayOfWeek": "X", "weekNumber": 2},
    ],
    "lockedCells": {},
    "previousMonthTail": {},
    "nightsHistory": {},
    "employeeRules": [],
    "config": {
        "minMorningStaff": 0,
        "minAfternoonStaff": 0,
        "minNightStaff": 0,
        "maxNightStaff": 99,
        "minMonthlyLibre": 2,
        "maxMonthlyLibre": 4,
        "maxConsecutiveWorkDays": 6,
        "minNightBlock": 2,
        "maxNightBlock": 3,
        "prefNightBlock": 2,
        "minRestHours": 8,
    },
    "options": {"timeoutSeconds": 5, "seed": 42},
}


# ── Helper: proceso daemon ─────────────────────────────────────────────────────

class DaemonProcess:
    """Wrapper síncrono sobre daemon.py para tests."""

    def __init__(self):
        self.proc = subprocess.Popen(
            [PYTHON_BIN, str(DAEMON_PY)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(DAEMON_PY.parent),
            text=True,
            bufsize=1,  # line-buffered
        )

    def wait_ready(self, timeout: float = STARTUP_TIMEOUT) -> dict:
        """Lee la primera línea (debe ser {"status":"ready"})."""
        self.proc.stdout.readline  # ensure readable
        line = _readline_timeout(self.proc, timeout)
        return json.loads(line)

    def send(self, payload: dict | str) -> dict:
        """Envía un payload (dict → JSON, str → literal) y lee la respuesta."""
        raw = json.dumps(payload) if isinstance(payload, dict) else payload
        self.proc.stdin.write(raw + "\n")
        self.proc.stdin.flush()
        line = _readline_timeout(self.proc, SOLVE_TIMEOUT)
        return json.loads(line)

    def send_raw(self, raw: str) -> dict:
        """Envía una línea literal (para tests de error)."""
        self.proc.stdin.write(raw + "\n")
        self.proc.stdin.flush()
        line = _readline_timeout(self.proc, 10)
        return json.loads(line)

    def is_alive(self) -> bool:
        return self.proc.poll() is None

    def close(self):
        try:
            self.proc.stdin.close()
            self.proc.wait(timeout=5)
        except Exception:
            self.proc.kill()


def _readline_timeout(proc: subprocess.Popen, timeout: float) -> str:
    """Lee una línea de stdout con timeout usando select/threading."""
    import threading

    result = []
    exc = []

    def reader():
        try:
            result.append(proc.stdout.readline())
        except Exception as e:
            exc.append(e)

    t = threading.Thread(target=reader, daemon=True)
    t.start()
    t.join(timeout)
    if t.is_alive():
        raise TimeoutError(f"Daemon no respondió en {timeout}s")
    if exc:
        raise exc[0]
    line = result[0].strip()
    if not line:
        raise RuntimeError("Daemon cerró stdout sin responder")
    return line


# ── Fixture pytest: daemon compartido por todos los tests ─────────────────────

@pytest.fixture(scope="module")
def daemon():
    d = DaemonProcess()
    ready = d.wait_ready()
    assert ready.get("status") == "ready", f"Daemon no emitió ready: {ready}"
    yield d
    d.close()


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_daemon_starts_and_emits_ready():
    """Daemon arranca y emite {"status":"ready"} como primera línea."""
    d = DaemonProcess()
    try:
        ready = d.wait_ready(timeout=STARTUP_TIMEOUT)
        assert ready.get("status") == "ready"
    finally:
        d.close()


def test_single_valid_request(daemon: DaemonProcess):
    """Request válida mínima → status ok."""
    result = daemon.send(MINIMAL_INPUT)
    assert result["status"] == "ok", f"Esperado ok, got: {result}"
    assert "matrix" in result
    # Verificar que todos los empleados tienen asignación en todos los días
    for emp_id in ["A", "B"]:
        assert emp_id in result["matrix"]
        assert len(result["matrix"][emp_id]) == 7


def test_three_sequential_requests(daemon: DaemonProcess):
    """3 requests válidas seguidas → todas responden correctamente."""
    for i in range(3):
        result = daemon.send(MINIMAL_INPUT)
        assert result["status"] == "ok", f"Request {i+1} falló: {result}"
        assert daemon.is_alive(), f"Daemon murió tras request {i+1}"


def test_invalid_json_returns_error_without_dying(daemon: DaemonProcess):
    """JSON malformado → error INVALID_INPUT, daemon sigue vivo."""
    result = daemon.send_raw("{ esto no es json válido !!!")
    assert result["status"] == "error"
    assert result["errorCode"] == "INVALID_INPUT"
    assert daemon.is_alive()


def test_invalid_schema_returns_error_without_dying(daemon: DaemonProcess):
    """JSON válido pero schema incorrecto → error INVALID_INPUT, daemon sigue vivo."""
    bad_payload = {"monthId": "no_soy_un_numero", "completamente": "incorrecto"}
    result = daemon.send(bad_payload)
    assert result["status"] == "error"
    assert result["errorCode"] == "INVALID_INPUT"
    assert daemon.is_alive()


def test_empty_lines_ignored(daemon: DaemonProcess):
    """Líneas vacías no cuelgan el daemon ni producen output extra."""
    # Enviar varias líneas vacías y luego una request válida
    for _ in range(3):
        daemon.proc.stdin.write("\n")
    daemon.proc.stdin.flush()

    # La siguiente request válida debe responder normalmente
    result = daemon.send(MINIMAL_INPUT)
    assert result["status"] == "ok"


def test_recovery_after_errors(daemon: DaemonProcess):
    """Tras varios errores consecutivos, una request válida sigue funcionando."""
    # Provocar 2 errores
    daemon.send_raw("not json")
    daemon.send({"garbage": True})

    # Ahora una request válida debe funcionar
    result = daemon.send(MINIMAL_INPUT)
    assert result["status"] == "ok", f"Daemon no se recuperó: {result}"
    assert daemon.is_alive()


def test_locked_cells_respected(daemon: DaemonProcess):
    """Celdas bloqueadas deben aparecer exactamente en el resultado."""
    payload = {**MINIMAL_INPUT, "lockedCells": {"A": {"3": "V", "4": "V"}}}
    result = daemon.send(payload)
    assert result["status"] == "ok"
    assert result["matrix"]["A"]["3"] == "V"
    assert result["matrix"]["A"]["4"] == "V"
