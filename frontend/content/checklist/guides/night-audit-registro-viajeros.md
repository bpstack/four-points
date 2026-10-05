---
id: cl-night-audit-registro-viajeros
type: guide
title: 'Partes de policía (registro de viajeros)'
category: procedures
department: reception
shift: night
version: '1.0'
author: Salvador Pérez
updated: 2026-05-07
description: 'Generación y descarga de los partes de hospedaje para policía a través de la plataforma de registro de viajeros.'
---

# Partes de policía — registro de viajeros

## Cuándo

Después del cierre (End of Day), generalmente sobre las **04:00 AM**.

---

## Generar el archivo en Opera

**Ruta: Miscellaneous → File Export → Country**

1. Ir al final de la lista
2. Seleccionar **ES_HOSPEDAJES_<CÓDIGO DEL HOTEL>** (hospedaje manual)
3. Pulsar **GENERATE**
4. Pulsar **GENERATE** de nuevo
5. Pulsar **START**
6. Pulsar **YES** (aparecerán los records del día)
7. Pulsar **GEN.FILE**
8. Pulsar **OK**

---

## Descargar el archivo

**Ruta: Miscellaneous → File Download**

1. En **File Name** poner: `2026 SEARCH`
2. Aparecerá el archivo creado del día
3. Pulsar **DOWNLOAD**
4. Pulsar **SAVE**
5. Guardar en **Mi Equipo → POLICIA**

---

## Post-proceso

- Entrar en **la plataforma de registro diariamente** para comprobar los registros
- Corregir cualquier error que aparezca
- Los partes de viajeros en papel se escanean, guardan en **Night Auditor → Partes Viajeros** y se trituran

---

## Referenciado por

- [Cierre nocturno (Night Audit)](/dashboard/checklist/cl-night-audit) — paso 3.2: generar partes de policía
