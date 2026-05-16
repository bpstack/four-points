# Test Results

Esta carpeta contiene los resultados de la última ejecución de tests.

## Archivos

- **`latest.txt`**: Resumen rápido de la última ejecución de tests
  - Se actualiza automáticamente cada vez que ejecutas `pnpm test`
  - Incluye resumen de tests pasados/fallados
  - Incluye información de cobertura de código

## Ubicación de Reportes Completos

Para reportes más detallados, consulta:

1. **Reporte Markdown Completo**: `backend/TEST-REPORT.md`
   - Detalle de todos los tests ejecutados
   - Resumen de cobertura
   - Próximos pasos y estructura

2. **Reportes HTML de Cobertura**: `backend/coverage/`
   - `index.html` - Reporte visual de cobertura
   - `lcov-report/index.html` - Reporte LCOV detallado
   - **Nota**: Esta carpeta está en `.gitignore`

## Comandos

```bash
# Ver resumen rápido
cat backend/.test-results/latest.txt

# Ejecutar tests
pnpm test

# Ejecutar tests con cobertura
pnpm test:coverage

# Ver reporte HTML de cobertura
start backend/coverage/index.html
```
