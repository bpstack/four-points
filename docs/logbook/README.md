# Libro de consigna (logbook)

Registro diario de avisos e incidencias entre turnos. Pantalla:
`/dashboard/logbooks`. Visión general del proyecto en
[`../general/README.md`](../general/README.md).

## Qué problema resuelve

Lo que pasa en un turno tiene que llegar al siguiente: una reclamación, una
avería, un encargo pendiente. De palabra o en papel se pierde, y no se sabe
quién lo ha visto ni si alguien se ha ocupado. El libro de consigna guarda cada
aviso con su autor, su fecha y su importancia; deja ver quién lo ha leído, si
está resuelto, y conserva el historial de todo lo que le ha pasado.

## Quién lo usa

Todos los roles **menos `mantenimiento`**, que no tiene acceso al módulo.

- **Cualquier usuario con acceso** crea entradas, las lee, comenta, las marca
  como leídas y las resuelve o reabre, sean suyas o no.
- **Solo el autor** edita o borra su entrada, y lo mismo con cada comentario.
  Un `admin` no tiene excepción.
- **Los administradores** ven además, en _Perfil → Ajustes → Informes_, las
  entradas por rango de fechas, las borradas y el historial de cada una.

## Qué puede hacer

- **Ver las entradas de un día**, elegido en una tira de días del mes.
- **Crear una entrada**: texto (3–5000 caracteres), importancia, departamento y
  fecha. La fecha es la de hoy en Madrid por defecto, pero se puede elegir otra.
- **Importancia** en cuatro niveles: baja, media, alta y urgente. Las altas y
  urgentes se destacan en color y aparecen también en el panel de inicio.
- **Marcar como leída** (y deshacerlo) y ver **quién la ha leído**.
- **Resolver** una entrada y **reabrirla** como pendiente.
- **Comentar**, y editar o borrar los comentarios propios.
- **Editar y borrar** las entradas propias. Borrar no elimina: la entrada pasa
  a la papelera.

## Qué datos maneja

Cuatro tablas (`backend/db-mysql/aiven/03_logbook_tables.sql`):

- **`logbooks`**: la entrada — texto, autor, departamento, importancia, fecha
  del hotel (`date`), si está resuelta y quién la resolvió, y `deleted_at` si
  está en la papelera.
- **`logbook_comments`**: los comentarios, también con borrado lógico.
- **`logbook_reads`**: quién ha leído cada entrada y cuándo.
- **`logbook_history`**: el historial de entradas y comentarios — quién hizo
  qué (crear, editar, borrar, leer, desmarcar, resolver, reabrir), con el
  contenido anterior y el nuevo.

Los departamentos son los generales de la aplicación (tabla `departments`).

## Qué reglas cumple

- **Todo queda en el historial**: crear, editar y borrar entradas y
  comentarios, y también leer, desmarcar, resolver y reabrir.
- **Nada se borra de verdad**: entradas y comentarios solo se marcan con
  `deleted_at`. No hay forma de restaurarlos desde la interfaz.
- **Solo el autor edita o borra** su entrada o comentario.
- **Una entrada resuelta tiene un único responsable**: al reabrirla se borra
  quién la resolvió; el rastro queda en el historial.
- **La importancia se guarda en español** (`baja`, `media`, `alta`,
  `urgente`); el frontend usa `low`, `medium`, `high` y `critical` y las
  traduce al enviar.
- **El día de una entrada es su fecha de hotel**; en entradas antiguas sin
  `date`, se usa el día en que se crearon.
- Los listados devuelven 100 entradas por defecto y 500 como máximo, de la más
  reciente a la más antigua.

## Cómo viaja la información

```
LogbooksContainer ─► useLogbooks(date) ─► logbooksApi (queries.ts) ─► apiClient
                                                                        │
                                                    /api/logbooks/* (Express)
                                                                        │
      logbook-controllers · logbookComments-controllers · logbookReads-controllers
                                                                        │
                    logbookHistory-service (solo editar y borrar) · repositorios
                                                                        │
                                            logbooks · comments · reads · history
```

1. Al elegir un día, `useLogbooks` pide `GET /api/logbooks/day/<fecha>` y, para
   cada entrada, sus comentarios y lectores.
2. Cada acción (crear, editar, leer, resolver, comentar…) es una mutación de
   React Query: llama al backend y, cuando responde, vuelve a pedir los datos
   del día y muestra un aviso de éxito o error.
3. En el backend, el controlador valida con Zod, comprueba la autoría cuando
   toca y escribe en la tabla y en `logbook_history`.
4. El panel de inicio pide los días del periodo elegido (hoy, semana o mes) y
   muestra solo las entradas altas y urgentes.
