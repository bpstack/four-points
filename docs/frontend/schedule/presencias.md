# Módulo de Presencias — Documentación

## Contexto

El módulo de Presencias es un sistema de control horario integrado en Four-Points que permite convertir el horario mensual de los empleados (códigos de turno M/T/N/L/V...) en el formato requerido por el documento oficial de presencias del hotel ("Presencias").

El objetivo es automatizar la parte más tediosa del proceso: la conversión de códigos de turno a códigos de presencia y el cálculo de horas nocturnas. El resto del documento Excel (cabeceras, fórmulas de horas, firmas) ya está montado y solo requiere pegar los datos calculados.

---

## Estado actual (Mayo 2026)

### Implementado

**Ubicación UI:** `http://localhost:3000/dashboard/scheduling/config?tab=presencias`

Nueva pestaña "Presencias" en la página de configuración de scheduling. Funcionalidad completamente frontend, sin llamadas a backend.

**Flujo de uso:**
1. Copiar el horario mensual desde `PLANNING 2026.xlsx` (seleccionar filas de empleados con días)
2. Pegar en el textarea de la pestaña Presencias
3. Pulsar "Calcular"
4. Copiar cada bloque de output y pegarlo en el Excel correspondiente

**Bloque 1 — Pestaña "Presencias" del Excel:**
- Una fila por empleado, valores separados por tabulador
- 28/30/31 códigos convertidos + total de presencias al final
- Los nombres de empleado NO se incluyen (ya están en el Excel)
- Pegar a partir de la columna del día 1

**Bloque 2 — Pestaña "Variables" del Excel:**
- Un número por línea, en el mismo orden de empleados
- Total de horas nocturnas del mes por empleado
- Pegar en la columna "Nº HORAS NOCTUR."

**Botones:**
- "Calcular" — procesa el input y muestra los dos bloques
- "Limpiar" — resetea input y resultado (aparece cuando hay datos)
- "Copiar" en cada bloque — copia al portapapeles con feedback visual

---

## Lógica de conversión

### Códigos de turno → Código de presencia

| Código original | Código presencia |
|-----------------|-----------------|
| M, T, N, PI, P | P (Presencia) |
| L, L1-L20 (cualquier número) | L (Libre) |
| V | V (Vacaciones) |
| B | B (Abonable/Festivo) |
| E | E (Baja enfermedad) |
| IT | IT (Incapacidad Temporal) |
| FO | FO (Formación) |
| LI | LI (Licencia) |
| A | A (Ausencia injustificada) |
| F | F (Festivo disfrutado) |
| H | H (Huelga) |

### Cálculo de horas nocturnas

Franja nocturna oficial: 22:00 – 6:00

| Turno | Horas nocturnas |
|-------|----------------|
| M (7:00-15:00) | 0h |
| T (15:00-23:00) | 1h (22:00-23:00) |
| N (23:00-7:00) | 7h (23:00-6:00) |
| PI, P y resto | 0h (horario variable, sin nocturnidad fija) |

El cálculo se hace sobre el código **original** antes de convertir a P.

---

## Formato de input

El horario se copia directamente desde `PLANNING 2026.xlsx`. Excel usa tabuladores entre celdas y saltos de línea entre filas.

Formato esperado: primera columna = nombre del empleado, siguientes columnas = código de cada día.

```
EMP_06	P	B	B	L14	L14	P	P	P	...
EMP_01 R	P	B	B	L14	L14	P	P	P	...
EMP_02	M	B	B	T	T	T	L12	L12	...
```

El parser también admite separación por 2+ espacios como fallback (por si se copia desde otro contexto).

---

## Archivos relevantes

- **Componente UI:** `frontend/app/components/scheduling/SchedulingConfigClient.tsx` — función `PresenciasTab()` y helpers `processInput()`, `convertCode()`, `nightHours()`, `OutputBlock`, `CopyButton` (al final del archivo)
- **Excel de referencia:** `z.schedule-docs/PLANNING 2026.xlsx` — origen del horario mensual
- **Excel de destino:** `z.schedule-docs/Presencias.xlsx` (pestaña "Presencias" + pestaña "Variables")

---

## Roadmap

### Próximo paso — Integración directa con scheduling

Cuando el módulo de scheduling esté terminado y estable, el módulo de presencias se integrará directamente con los datos de la base de datos en lugar de requerir el pegado manual del horario.

**Cambio previsto:**
- Selector de mes/año en la pestaña Presencias
- El sistema leerá `scheduling_assignments` para el mes seleccionado
- Se eliminará el textarea de input manual
- Los dos bloques de output se generarán automáticamente

Endpoint a crear: `GET /api/scheduling/presencias/:monthId`
```json
{
  "employees": [
    {
      "name": "EMP_06",
      "days": ["P", "B", "B", "L", ...],
      "totalPresencias": 21,
      "totalNocturnas": 0
    }
  ]
}
```

### Escalado futuro — Exportación a Excel

Una vez integrado con el scheduling, se añadirá exportación directa a Excel (.xlsx) que genere el documento de presencias completo sin necesidad de copy-paste:

- Exportar con formato del documento oficial (cabeceras, leyenda, firma)
- Incluir ambas pestañas ("Presencias" y "Variables") en un solo archivo
- Posible exportación a PDF para firma digital

### Escalado futuro — Vista en tabla

Visualización de los datos de presencias en tabla dentro de la propia UI de Four-Points:
- Grid empleado × día con los códigos convertidos
- Totales por empleado y totales generales
- Filtrado por mes y sección

---

## Prompt de conversión manual (referencia)

Para uso en Claude chat cuando no se tenga acceso a la UI o para verificación manual:

```
Tengo el horario mensual de empleados copiado desde Excel (filas separadas por salto de línea, columnas por tabulador). Primera columna es el nombre, las siguientes son los días del mes.

## CONVERSIÓN DE CÓDIGOS:
- M, T, N, PI, P → P
- L, L1-L20 (L con cualquier número) → L
- V, B, E, IT, FO, LI, A, F, H → sin cambio (dejar igual)

## HORAS NOCTURNAS (calcular desde el input ORIGINAL antes de convertir):
- M → 0h
- T → 1h (22:00-23:00)
- N → 7h (23:00-6:00)
- Todo lo demás (P, PI, L, V, B...) → 0h

## OUTPUT:

### BLOQUE 1 — Pestaña "Presencias" (pegar a partir de columna del día 1):
Una fila por empleado. Valores separados por tabulador.
Formato: [día1]\t[día2]\t...\t[díaN]\t[TOTAL PRESENCIAS]
(total = conteo de P en los días ya convertidos)
SIN nombres de empleado.

### BLOQUE 2 — Pestaña "Variables" (pegar en columna horas nocturnas):
Un número por línea, en el mismo orden de empleados que el BLOQUE 1.
SIN nombres de empleado.

## INPUT:
[PEGAR AQUÍ LA TABLA DE HORARIOS]
```
