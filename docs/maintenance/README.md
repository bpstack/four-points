# Mantenimiento (maintenance)

Partes de averías e incidencias técnicas del hotel. Pantallas bajo
`/dashboard/maintenance`. Visión general del proyecto en
[`../general/README.md`](../general/README.md).

## Qué problema resuelve

Una avería (una ducha que gotea, un aire acondicionado que no enfría, una
puerta rota) tiene que llegar a quien la arregla y no perderse por el camino.
El módulo registra cada incidencia como un **parte**, con dónde está, qué
urgencia tiene y quién se encarga, y la sigue hasta cerrarla, con fotos y un
historial de todo lo que le ha pasado. También indica qué habitaciones están
fuera de servicio por una avería abierta.

## Quién lo usa

**Todos los roles**, y es el módulo principal del rol `mantenimiento`, que no
tiene acceso a casi ningún otro. Dentro del módulo **no hay diferencias entre
roles**: cualquiera con acceso crea, edita, cambia de estado, asigna, borra y
restaura cualquier parte.

## Qué puede hacer

- **Listado** con filtros (estado, prioridad, tipo de ubicación, asignado,
  creador, habitación, texto, rango de fechas e incluir borrados), paginación
  y estadísticas.
- **Crear un parte**: título, descripción, ubicación, prioridad y, si se sabe,
  a quién se asigna. Si la ubicación es una habitación, el número es
  obligatorio y se puede marcar como **fuera de servicio**.
- **Detalle** en dos pestañas: la ficha (con acciones rápidas para cambiar
  estado, prioridad y asignación, y añadir notas de resolución) y el historial.
- **Asignar** a un usuario de la aplicación (**interno**) o a una empresa
  externa, con su nombre y contacto.
- **Fotos**: subir imágenes (JPEG, PNG, WebP o GIF, hasta 5 MB) y borrarlas.
- **Borrar y restaurar** partes: el borrado es lógico.

## Qué datos maneja

Tres tablas (`backend/db-mysql/aiven/13_maintenance.sql`):

- **`maintenance_reports`**: el parte — título, descripción, ubicación
  (habitación, zona común, exterior, instalaciones u otra), prioridad, estado,
  asignación, fechas de inicio, resolución y cierre, notas de resolución,
  habitación fuera de servicio y borrado lógico.
- **`maintenance_images`**: las fotos, guardadas en **Cloudinary**; aquí solo
  queda su referencia.
- **`maintenance_history`**: cada cambio, con quién lo hizo, qué campo cambió y
  el valor anterior y el nuevo.

El **identificador** de un parte es `DDMMAA-NNN`: fecha de creación y número del
día (por ejemplo, `280926-001`).

## Qué reglas cumple

**Estados**

```
reported ─► assigned ─► in_progress ─► completed ─► closed
                             │
                          waiting            (canceled desde cualquiera)
```

- Siete estados: reportado, asignado, en curso, en espera, completado, cerrado y
  cancelado. Cuatro prioridades: baja, media, alta y urgente.
- **El backend no obliga a seguir el orden**: cualquier estado puede pasar a
  cualquier otro. Al pasar a en curso, completado o cerrado se guarda la fecha
  correspondiente. **Cancelar guarda la fecha de cierre y se registra en el
  historial como «cerrado»**: ahí no se distingue un parte cancelado de uno
  cerrado.
- **La interfaz no ofrece reabrir un parte cerrado**, pero la API lo permite.

**Validación e historial**

- Todas las rutas que escriben validan los datos con Zod, incluida la regla de
  que una habitación necesita número.
- Crear, editar, cambiar estado, prioridad o asignación, añadir notas, borrar y
  restaurar quedan en `maintenance_history`. **Subir o borrar fotos, no.**
- El cambio y su registro en el historial no van en una transacción.

**Otros**

- Las fotos se aceptan según el tipo que declara el navegador, con un máximo de
  5 MB, y Cloudinary las procesa como imagen.
- Cada foto guarda un «borrar al cerrar» (`auto_delete_on_close`) que **nadie
  usa**: al cerrar un parte, sus fotos se quedan.
- El número del día del identificador se calcula buscando el último parte de
  esa fecha, con la hora del servidor.

## Cómo viaja la información

```
page.tsx (servidor) ─► getMaintenance ─► GET /api/maintenance
MaintenanceListClient ─► useMaintenanceList (React Query) ─┐
ReportDetailClient · DetailTab · HistoryTab ───────────────┼─► maintenanceApi ─► apiClient
                                                           │
                                   /api/maintenance/* (Express)
                                                           │
             authenticateToken ─► canAccessMaintenance ─► MaintenanceController
                                                           │
                          MaintenanceRepository ─► MySQL + historial
                          CloudinaryService ─► fotos
```

1. El listado se carga en el servidor y llega ya pintado; en cuanto se filtra,
   React Query pide los datos de nuevo.
2. Cada acción llama a su ruta (estado, prioridad, notas…) o a la edición
   general; asignar se hace desde la edición general, no desde la ruta
   `/assign`, que la interfaz no usa.
3. El repositorio escribe el cambio y después su entrada de historial.
4. Las fotos se suben a Cloudinary desde el backend y su referencia se guarda en
   `maintenance_images`.
