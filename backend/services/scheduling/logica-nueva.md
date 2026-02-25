# Lógica Nueva - Sistema de Scheduling Manual

> Documento de diseño para la reestructuración completa del sistema de horarios.
> El sistema pasa de generación automática a **creación manual con validación en tiempo real**.

---

## 1. Concepto General

El usuario crea el horario manualmente celda a celda en el grid. El sistema **no genera** horarios automáticamente. Su único rol activo es:

- **Pre-cargar** peticiones aprobadas (vacaciones, bajas, etc.)
- **Inicializar** el resto de celdas con turno 'L' (Libre)
- **Validar en tiempo real** cada cambio contra las reglas/constraints
- **Mostrar errores y warnings** para que el usuario corrija

---

## 2. Flujo de Estados del Mes

```
[Crear mes] → draft ↔ published
                ↑         |
                └─────────┘
                (reversible)
```

### `draft`

- Grid editable
- Se precargan peticiones aprobadas y se rellena el resto con 'L'
- Validación en tiempo real tras cada edición de celda
- Botón **Resetear**: vacía todo el grid EXCEPTO peticiones aprobadas (vuelve a poner 'L')
- Botón **Publicar**: cambia estado a `published`

### `published`

- Grid NO editable
- Para hacer correcciones hay que usar **Despublicar** y volver a `draft`
- Al publicar se actualizan los acumulados anuales (tab=totals)
- Botón **Despublicar**: vuelve a `draft`
- Al despublicar se recalculan los acumulados (se publican desde cero al volver a publicar)

---

## 3. Pre-carga e Inicialización del Grid

### 3.1 Inicialización Completa del Grid

Cuando se crea o resetea un mes, el sistema **inicializa todas las celdas** para todos los empleados seleccionados (`scheduling_employees`).

1. Para cada día del mes y cada empleado seleccionado:
   - Se busca si existe una **petición aprobada** (`scheduling_constraints` con `status='approved'`).
   - Si existe, se asigna el turno correspondiente (`V`, `IT`, `E`, etc.).
   - Si **NO** existe petición, se asigna por defecto el turno **`L` (Libre)**.

Esto garantiza que **cada celda tenga un registro** (`scheduling_assignments`) en la base de datos, permitiendo su edición inmediata sin errores de "asignación no encontrada".

### 3.2 Peticiones aprobadas (Mapeo)

Las peticiones aprobadas se mapean automáticamente según esta tabla:

| Tipo constraint   | Se precarga como    | Editable       |
| ----------------- | ------------------- | -------------- |
| `vacation`        | `V`                 | No (bloqueado) |
| `sick_leave` (IT) | `IT`                | No             |
| `sick_day` (E)    | `E`                 | No             |
| `training` (FO)   | `FO`                | No             |
| `holiday` (B)     | `B`                 | No             |
| `request_off`     | `L`                 | No             |
| `request_shift`   | El shift solicitado | No             |

> Las celdas precargadas desde peticiones aprobadas están **bloqueadas** en el frontend y no se pueden editar directamente (congeladas). Para modificarlas hay que cambiar/eliminar la petición.

### 3.3 Bajas sobrevenidas (manual)

- IT, E, B que surgen durante el mes se añaden **manualmente** al grid.
- Se añaden en `draft` (si el mes está `published` primero hay que despublicar).

---

## 4. Validación en Tiempo Real

Cada vez que el usuario edita una celda, se ejecuta la validación automáticamente (sin botón).

### 4.1 Validaciones que se ejecutan (constraints)

| Constraint                 | Severidad     | Descripción                                           |
| -------------------------- | ------------- | ----------------------------------------------------- |
| **Cobertura**              | error/warning | Min/max personal por turno M/T/N cada día             |
| **Bloque noches**          | error         | Noches deben ser consecutivas, mínimo 3               |
| **Descanso consecutivo**   | error         | 2 días libres consecutivos en ventana de 7 días       |
| **Máx. días consecutivos** | error         | No más de 6 días de trabajo seguidos                  |
| **Continuidad rotación**   | error         | T→M al día siguiente = error (solo 8h entre turnos)   |
| **Libre mensual**          | warning       | Entre 8-12 días libres al mes                         |
| **Reglas empleado**        | warning       | Turno fijo, sin fines de semana, max/min turnos, etc. |

### 4.2 Visualización

- **Errores** (rojo): problemas que deben corregirse antes de publicar.
- **Warnings** (amarillo): recomendaciones que se pueden ignorar.
- Se muestran en el panel `ValidationWarnings`.

---

## 5. Acciones del Usuario

### En estado `draft`:

| Acción         | Descripción                                            |
| -------------- | ------------------------------------------------------ |
| Click en celda | Abre selector de turno (M, T, N, P, PI, L, B, V, etc.) |
| Resetear       | Re-inicializa el grid (Peticiones + 'L' por defecto)   |
| Publicar       | Cambia a `published`, actualiza acumulados anuales     |

---

## 6. Tablas de Base de Datos (Evolución)

**`scheduling_months`:**

- ENUM status: `('draft', 'published')`.
- Columnas eliminadas: `generated_at`, `generated_by`.

**`scheduling_history`:**

- ENUM action: quitado `generated`, añadido `reset`, `unpublished`.

**`scheduling_assignments`:**

- Columna eliminada: `is_manual`.

**`scheduling_config`:**

- Eliminada key: `ai_provider` y keys de scoring.

---

## 7. Módulo IA (Deprecado)

- El código de IA ha sido **eliminado** del repositorio activo para evitar errores de compilación y reducir deuda técnica.
- Se mantiene guardado en los logs de la migración si fuera necesario recuperarlo.

---

## 8. Resumen del Cambio

| Antes                                       | Ahora                         |
| ------------------------------------------- | ----------------------------- |
| Generación automática (50 intentos + IA)    | Creación manual celda a celda |
| Celdas vacías por defecto                   | Celdas pre-rellenadas con 'L' |
| Validación post-generación                  | Validación en tiempo real     |
| Estados: draft→generated→published→archived | Estados: draft↔published      |
