"""conftest.py — añade el directorio padre al path para importar model, schemas, etc."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
