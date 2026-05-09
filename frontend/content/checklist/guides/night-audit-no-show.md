---
id: cl-night-audit-no-show
type: guide
title: 'Gestión de No Show'
category: procedures
department: reception
shift: night
version: '2.0'
author: Salvador Pérez
updated: 2026-05-07
description: 'Procedimiento completo de No Show: reinstate, facturación por tipo de tarifa, consigna y Excel.'
---

# Gestión de No Show

## Tarifas — Regla de facturación

| Tipo de tarifa  | Noches        | Qué se factura                                |
| --------------- | ------------- | --------------------------------------------- |
| **Flex**        | 1 noche       | Cargo completo                                |
| **Flex**        | +1 noche      | Solo la primera noche (el resto se reembolsa) |
| **No flexible** | 1 noche o más | Total de la facturación                       |

## Antes del cierre (pre-cierre)

1. Revisar las **reservas pendientes de llegada** de la noche
2. Si alguna está **sin cobrar**, cancelarla inmediatamente
3. Asegurarse de que **todas contienen un pago** antes de proceder al cierre

## Después del cierre — Reinstate

Después del End of Date, las reservas sin check-in se marcan automáticamente como No Show.

### Reservas de +1 noche

1. Buscar la reserva en **llegadas del día anterior**
2. Comprobar que está **pagada**
3. **REVISAR LOS RATES ANTES DE HACER REINSTATE** para mantener el mismo precio (tanto flex como no flex)
4. Mirar en **Rate Info** cuánto costaba la primera noche → **apuntar el precio**
5. Pulsar **Reinstate** → la reserva se acortará un día
6. Buscar la reserva en **arrivals del día actual**
7. Postear como **room charge** el precio de la primera noche (se pierde al hacer reinstate)
8. Añadir el **pago** con el mismo método que las demás noches
9. Proceder a hacer **check-in normal**

### Reservas de 1 noche (cliente llega de madrugada)

1. Hacer **reinstate** correspondiente
2. **Revisar la tarifa** para evitar descuadres de balance en la salida del huésped

## Facturación de No Shows de 1 noche

Las reservas de una sola noche se facturan **la misma noche** una vez pasan a no show.

### Pasos en Opera

1. Ir a `Opera → Billing → Post`
2. Dar a **Settlement**
3. Postear código **16191** para cuadrar el balance a **0**
4. **Sacar número de factura** y ponerlo en el Excel

## Registrar en consigna

- Dejar **nota en consigna** de los no shows de la noche

## Excel No Show

- Reflejar cada no show en el **Excel No Show**
- Completar **todas las celdas**

## Facturación final antes de fin de turno

Antes del final del turno, facturar las reservas en las que no se haya obtenido respuesta del cliente y marcar en la OTA correspondiente (Booking, Expedia, Hotelbeds, etc.) cuando se tenga acceso.

**Recordar:**

- **Flexibles:** solo primera noche (reembolsar el resto)
- **No flexibles:** todo el importe

---

## Referenciado por

- [Cierre nocturno (Night Audit)](/dashboard/checklist/cl-night-audit) — pasos 2.3, 3.11, 3.12: gestión de No Shows
