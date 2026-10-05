---
id: cl-fidelizacion-canje-puntos
type: guide
title: Canje de puntos del programa de fidelización
category: procedures
department: reception
shift: null
version: '1.0'
author: Salvador Pérez
updated: 2026-05-06
description: Procedimiento completo para gestión de reservas con puntos del programa de fidelización — walk-ins, certificados, routing y casos especiales.
---

## Antes de empezar — ¿cuál es tu situación?

### Caso A

**El huésped ya tiene reserva hecha con su cuenta del programa y su e-certificate aparece en el perfil**

No hay que hacer nada especial. Abre el perfil, **aplica el routing a la empresa del programa de fidelización** en una ventana paralela exactamente igual que en cualquier otra reserva de empresa. El sistema hace el resto automáticamente.

> ⚠️ Si el número de socio ya está en el perfil y el certificado ya es visible, el procedimiento es idéntico al de una reserva de empresa normal.

---

### Caso B

**Walk-in que quiere hacer una reserva con sus puntos del programa**

La opción ideal es convencer al huésped, de forma amable y natural, de que realice él mismo la reserva desde su app o cuenta del programa de fidelización. Es mucho más sencillo para ambas partes y evita errores. Si acepta, perfecto.

**Si insiste en que lo hagas tú desde recepción**, sigue el procedimiento siguiente.

---

## Procedimiento — Walk-in con canje de puntos desde Opera

**Ruta: Front Desk → Awards Redemption**

**Paso 1 — Localizar el perfil de socio**

- Introduce el número de socio del huésped.
- Selecciona **Room Pool** para ver los tipos de habitación disponibles y el total de puntos necesarios.

> ⚠️ El sistema solo permitirá continuar si el saldo de puntos del cliente **es igual o superior** al total requerido para la estancia.

**Paso 2 — Configurar la reserva**

1. Selecciona el número de noches
2. Selecciona la habitación
3. Introduce el nombre del cliente
4. Introduce el rate code: **`%MRYA`** → seleccionar → OK
5. Selecciona la tarifa → OK
6. Verifica el resumen: Member Level (ej. Plata), noches, habitación

**Paso 3 — Routing a la empresa del programa de fidelización**

Como la reserva se paga con puntos del programa (el cliente no paga en efectivo), **es obligatorio routear la factura a la empresa del programa de fidelización**:

1. Ve al perfil del cliente
2. Apartado **Company** → busca **la empresa del programa de fidelización** → OK → Save
3. Verás automáticamente el routing activo en rojo en la parte inferior del perfil, con la cuenta del programa de fidelización adjunta

> El cliente **sí paga los extras** (minibar, room service, etc.) con su método de pago habitual.
> **No se puede entregar la invoice al huésped** — la factura principal va a la empresa del programa de fidelización.

---

## Certificados como método de pago

Los certificados son el mecanismo que permite que los puntos acumulados se conviertan en pago de la estancia.

**Para activar un certificado:**

`Options → Certificates → New → Submit → Seleccionar todos los puntos → OK`

Una vez activo, tendrás dos certificados. Los cargos adicionales del cliente se convierten automáticamente en puntos.

**Modificar el importe:**

- Puedes subir o bajar el total de puntos, lo que modifica también el importe en euros.
- **Importante:** el sistema no acepta céntimos — debe ser un importe en euros completos.

**Cancelar un certificado:**

- Si el huésped prefiere pagar con tarjeta o en efectivo en lugar de puntos, cancela el certificado. El pago se procesará por el método habitual.

---

## Casos críticos — Leer con atención

### No-shows y cancelaciones

> ⚠️ **Si hay un no-show o cancelación y no se cancela el certificado, el cliente PERDERÁ SUS PUNTOS.**

Ante cualquier cancelación o no-show de una reserva de tipo Redemption:

1. Accede a la reserva
2. Cancela el certificado antes de procesar la cancelación
3. Los puntos se devolverán automáticamente al perfil del programa de fidelización del cliente

### Los nombres deben coincidir siempre

La reserva con puntos solo genera puntos si **el nombre de la reserva y el nombre del huésped en la reserva son exactamente iguales**.

> ⚠️ Si un cliente socio hace una reserva con sus puntos para un amigo o familiar, ese amigo **no recibirá los puntos** y el cliente que los cedió tampoco. No está permitido.

---

## Bonus Code y desayuno

Para huéspedes con **PL (Welcome Gift / free breakfast)** como bonus code:

- Comprueba que en el apartado **Packages** no haya ningún elemento relacionado con desayuno.
- Si lo hay, **elimínalo** antes de aplicar el bonus code PL.

---

## Late check-out — Perfiles elite, VIP y Platino

Los perfiles VIP y Platino tienen derecho a late check-out:

- **Hasta las 14:00** — VIP
- **Hasta las 16:00** — Platino y Diamante

Para registrarlo en el sistema: en el perfil del cliente, campo **ETD (Estimated Departure Time)**, introduce la hora de salida estimada. Esto sirve de referencia tanto para pisos como para recepción al gestionar la disponibilidad.

---

## Cómo verificar si un cliente tiene cuenta del programa de fidelización

1. Abre el perfil del cliente
2. Ve a **Rewards**
3. Solicita el correo electrónico del cliente
4. **Search** → elimina el postal code si aparece → el sistema mostrará la información del perfil
5. **Download** para importar los datos al perfil

Si el cliente **no tiene cuenta del programa**, ofrécele el **nuevo enrollment** en ese momento. Pregúntale si quiere unirse al programa — es una oportunidad de fidelización.

---

## Cómo identificar el origen de una reserva por el formato del código

| Formato del código                         | Origen                              |
| ------------------------------------------ | ----------------------------------- |
| Letras mezcladas (mayúsculas y minúsculas) | Reserva vía **CRS**              |
| Todo en mayúsculas                         | Reserva vía **app del programa de fidelización** |
