---
id: cl-crs-reconciliation
type: reference
title: 'Reconciliación CRS'
category: reference
department: reception
shift: night
version: '1.0'
author: Salvador Pérez
updated: 2026-05-07
description: 'Pasos para reconciliar la información entre CRS y Opera PMS.'
---

# Reconciliación CRS

## Acceso

**Miscellaneous / Inventory Reconciliation / Reservation Reconciliation**

---

## Reglas

| CRS | Opera                  | Acción       |
| ------ | ---------------------- | ------------ |
| TWW    | TWW                    | OK           |
| DBW    | DBW                    | OK           |
| TWW    | DBW (hab asignada TWW) | **UPLOAD**   |
| TWW    | DBW (hab asignada DBW) | **DOWNLOAD** |

---

## Riesgos

> ⚠️ Cambiar TWW a DBW en reserva de varias noches → CRS **no se actualiza** → riesgo de **OVERBOOKING**

- Siempre revisar **Conciliation en CRS** una por una

---

## Referenciado por

- [Cierre nocturno (Night Audit)](/dashboard/checklist/cl-night-audit) — sección 8: Puntos críticos
- [Discrepancias CRS vs Opera](/dashboard/checklist/cl-night-audit-crs-discrepancies) — procedimiento detallado
