---
id: cl-night-audit-exchange-rate
type: guide
title: 'Exchange Rate — Fidelización / Frequent Flyer (PF/FF)'
category: procedures
department: reception
shift: night
version: '2.0'
author: Salvador Pérez
updated: 2026-05-07
description: 'Actualización diaria de la tasa de cambio PF/FF en Opera PMS. Impacta en puntos del programa y cargos a la propiedad.'
---

# Exchange Rate — Programa de fidelización / Frequent Flyer (PF/FF)

## Tarea

Actualizar la tasa de cambio del programa de fidelización / Frequent Flyer (PF/FF) **diariamente en el turno de noche**.

## Cuándo

A las **00:01** (puede variar según carga de trabajo). Se introduce una vez al día al cambiar de fecha.

## Por qué es importante

Para las propiedades participantes que no operan en USD, los puntos ganados se calculan en función de los cargos calificables convertidos a USD utilizando la tasa de cambio seleccionada por MI.

La propiedad es responsable de configurar las tasas de cambio extranjeras correctas en el sistema PMS. En caso de que la propiedad utilice una tasa incorrecta, **el Programa de Lealtad no realizará ajustes retroactivos** a los cargos facturados a la propiedad.

La tasa de cambio PF/FF debe actualizarse diariamente ya que impacta directamente en:

- Los **puntos o millas** que gana el socio
- El **importe que se le cobra a la propiedad** por los puntos o millas
- El **importe que se reembolsa a la propiedad** por estancias con redención de premios

## Pasos en Opera PMS

1. Ir a `Cashiering → Cashier Functions → Exchange Rates`
2. Pulsar **NEW** (nunca Edit, ver nota abajo)
3. Rellenar:
   - **Currency:** USD
   - **Code:** PF/FF
   - **Fecha:** día que comienza (el nuevo)
4. Buscar en Google: **"Currency Exchange buy rate"**
5. El valor que aparezca se pone en **Buy Rate**
6. Pulsar en el cuadro vacío de al lado → se autocompleta un número
7. Pulsar **OK**

## Errores comunes

- **NO darle a CLOSE** en lugar de OK. CLOSE cierra sin guardar.
- **NO usar el botón Edit** para actualizar tasas de cambio existentes → provoca la **pérdida de datos históricos**. Siempre crear una tasa nueva con **NEW**.

## Advertencia crítica

→ Este código **NO debe eliminarse**, ya que la información del programa de fidelización no será procesada si el código no existe.

---

## Referenciado por

- [Cierre nocturno (Night Audit)](/dashboard/checklist/cl-night-audit) — paso 2.1: Exchange Rate PF/FF
