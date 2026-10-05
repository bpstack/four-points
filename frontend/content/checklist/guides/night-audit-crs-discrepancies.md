---
id: cl-night-audit-crs-discrepancies
type: guide
title: 'Discrepancias CRS vs Opera'
category: procedures
department: reception
shift: night
version: '1.0'
author: Salvador Pérez
updated: 2026-05-07
description: 'Cómo resolver discrepancias de tipología de habitación entre CRS y Opera.'
---

# Discrepancias CRS vs Opera

## Puntos críticos

- Los **upgrades de TWW a DBW** o cambios de tipología son **MUY PELIGROSOS**
- Siempre revisar **Conciliation en CRS** una por una
- Si se cambia una TWW a DBW en una reserva de varias noches, **CRS NO se actualiza** → riesgo de **OVERBOOKING**

## Mostrar la realidad en CRS

1. Ir a **Miscellaneous / Inventory Reconciliation / Reservation Reconciliation**
2. Esto muestra la realidad del hotel en CRS

## Resolver discrepancias

### CRS muestra TWW / Opera muestra DBW

- **Si la habitación asignada es TWW** → hacer **UPLOAD**
- **Si la habitación asignada es DBW** → hacer **DOWNLOAD**

## Prevención

- Revisar Conciliation en CRS **siempre**, una por una
- No hacer cambios de tipología sin verificar el impacto en CRS
- Documentar cualquier cambio para seguimiento → [Logbook](/dashboard/logbooks)

---

## Referenciado por

- [Cierre nocturno (Night Audit)](/dashboard/checklist/cl-night-audit) — paso 8.1: upgrades peligrosos

## Ver también

- [Reconciliación CRS](/dashboard/checklist/cl-crs-reconciliation) — reglas y tabla de acciones
