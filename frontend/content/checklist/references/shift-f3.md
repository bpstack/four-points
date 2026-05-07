---
id: cl-shift-f3
type: reference
title: 'SHIFT+F3 — Consulta ocupación'
category: reference
department: reception
shift: null
version: '1.0'
author: Salvador Pérez
updated: 2026-02-18
description: Atajo para consultar ocupación instantánea en Opera.
---

## Procedimiento

SHIFT+F3 es el atajo en Opera para consultar el **House Status**, que contiene la información que pisos solicita durante el turno de tarde.

### Contenido del reporte

| Campo                     | Descripción                                         |
| ------------------------- | --------------------------------------------------- |
| **Occupancy %**           | Ocupación actual del día                            |
| **Stay Overs**            | Huéspedes que ya están alojados y NO se marchan hoy |
| **Check-outs realizados** | Salidas ya completadas                              |
| **Check-outs pendientes** | Salidas que aún no se han hecho                     |
| **Check-ins realizados**  | Llegadas ya completadas                             |
| **Check-ins pendientes**  | Llegadas que aún no se han hecho                    |
| **In-house guests**       | Total de huéspedes actualmente en el hotel          |

### Información para pisos (WhatsApp)

Cuando pisos pregunta por salidas del día siguiente, enviar:

- **Salidas pendientes de MAÑANA** (fecha actual +1): pisos necesita saber cuántas habitaciones hay que preparar como salida al día siguiente
- **Stay overs**: para que pisos sepa cuántas habitaciones no son ni salida ni llegada, es decir, cuántas habitaciones siguen ocupadas - clientes.
  Para calcular los **stay overs** (clientes que permanecen):

```
Stay Overs = Total in-house - Check-outs pendientes hoy - No shows
```

Son las habitaciones que NO son salida ni llegada, es decir, huéspedes que siguen alojados.
