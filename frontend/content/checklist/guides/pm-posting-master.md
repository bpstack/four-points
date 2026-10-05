---
id: cl-pm-posting-master
type: guide
title: 'PM (Posting Master) en Opera'
category: procedures
department: reception
shift: null
version: '1.0'
author: Salvador Pérez
updated: 2026-05-07
description: 'Reserva técnica contable para gestionar cargos y pagos sin asociarlos a una reserva de huésped activa.'
---

# PM (Posting Master) en Opera

## Qué es

Una PM es una **reserva técnica contable** (reserva ficticia) destinada a almacenar cargos que no deben permanecer en una reserva de cliente. Permite centralizar cargos, gestionar no shows y cancelaciones, mantener la contabilidad limpia y evitar que los importes afecten a ocupación, ADR o estancia real.

## Cuándo se usa

- **Cancelar una reserva** que ya tiene importes cargados (Opera no permite cancelar reservas con pagos)
- **Gestionar no shows** con cobro ya realizado
- **Copiar o modificar reservas** manteniendo la contabilidad
- **Rectificar reservas** sin perder los cargos
- **Reserva main** para transferir cargos
- **Facturación** independiente del huésped
- **Devolución/cancelación fuera de fecha**: transferir el cargo a una PM con fecha futura, cancelar la reserva original y dejar alerta de en qué PM está para gestión futura

## Cómo funciona

- Transfieres el cargo a una PM
- **Automáticamente se da Check-in al crearla** (pero puedes cambiar fechas y modificar la reserva)
- Puedes ponerla con **fecha futura** de salida en el caso de que la gestión que se vaya a realizar no se sepa cuándo se va a resolver, o con fecha de hoy si se quiere gestionar de inmediato.
- Cuando le das CI, puedes modificar el **número de nights** según convenga.
- Es una reserva **totalmente flexible**: puedes modificar la fecha tantas veces como queramos
- La PM conserva toda la información accesible en todo momento, incluida la **tarjeta de crédito**

## Procedimiento para crearla

1. Ir a `FRONT DESK → ACCOUNTS`
2. Rellenar:
   - **NAME:** nombre del cliente
   - **Fecha:** se puede jugar con esto (ver nota abajo)
   - **Room Type:** PM
   - **Room:** 9000+
   - **Rate:** NORATE
   - **Market y Source:** salen automático

## Nota sobre la fecha

- Si es una reserva que **no se sabe qué va a pasar**, mejor poner **fecha futura**
- Si se pone fecha de hoy, en el cierre te obligará a dar CO
- Puedes modificar la fecha **tantas veces como queramos**

## Ejemplo práctico

1. Reserva con cargo que se quiere cancelar/devolver fuera de fecha
2. Transferir el cargo a una PM con **fecha futura**
3. Cancelar la reserva original
4. Dejar **alerta** indicando en qué PM está el cargo
5. En la PM dejar toda la información necesaria (tarjeta de crédito, datos del cliente, motivo)
6. Gestionar la PM cuando se resuelva la situación
