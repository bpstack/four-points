# TODO — Four-Points

> **Qué responde:** qué queda por hacer. · **Quién lo lee:** quien retome el
> trabajo, al elegir en qué trabajar. · **Cómo se poda:** lo terminado se
> **borra**, no se tacha — `git log` ya registra que se hizo.

🔴 **Lo terminado sale de la lista.** Este fichero no tiene archivo detrás: lo
hecho se borra y queda en `git log`.

📌 **Si un punto necesita que otro se haga antes, se dice en el propio punto.**

⚠️ **Antes de dar algo por pendiente, mira el código.** Un TODO desactualizado
hace que alguien reimplemente lo que ya existe.

**Prioridad:** 🔴 alta · 🟡 media · 🟢 baja

---

## Rama `claude/compassionate-planck-gh6aof`

Última fusión en `main`: 2026-10-05 (PR #4, commit de merge `15a8531`). La
rama sigue siendo donde se arregla este fichero y se prueba en el entorno
preview.

## Después de publicar

> Mejoras sin brecha de seguridad: lógica de negocio, rastro de cambios,
> carreras, operación, interfaz y calidad. Se trabajan en el repositorio
> público, sin plazo (ADR-033).

### 🔴 Alta

- [ ] **Aplicar en Aiven `20261011_keep_group_history_on_delete.sql` antes de
      desplegar el borrado de grupos** — el código escribe una fila de
      historial tras borrar el grupo; con la clave foránea todavía en Aiven
      ese insert falla y el borrado se deshace (500). Preview y producción
      usan Aiven: aplicarla antes de que la rama llegue a compassionate, con
      `scripts/apply-migration.sh aiven <fichero> --dry-run` primero, y
      marcarla en `backend/db-mysql/INDEX.md`. Ya aplicada en local.
- [ ] **Rotar las credenciales de producción** — contraseña de la BD y claves
      de Cloudinary, y revocar las claves de servicios que ningún código usa.
      El historial publicado no las contiene, pero siguen en copias privadas
      (ADR-007). El procedimiento está fuera del repositorio.
      `SECRET_JWT_KEY` ya se cambió el 2026-09-29.
- [ ] **Fnb: ninguna mutación de ingresos deja rastro de quién la hizo** —
      `upsertMany` sobrescribe el importe anterior (`ON DUPLICATE KEY UPDATE`) y
      `deleteDay` borra filas sin dejar ningún registro de usuario, valor
      anterior u origen del cambio, a diferencia de otros módulos del proyecto
      (blacklist, logbook) que sí llevan una auditoría. Un dato financiero
      alterado o borrado no se puede reconstruir ni revertir.
      `backend/repositories/fnb/fnb.repository.ts`. _Comprobado por mí el
      2026-09-28._
- [ ] **Cashier: cambios de dinero sin rastro** — pagos y recuentos no dejan
      historial, las ediciones no guardan valores anteriores y borrar un turno
      borra también su `cashier_history` (_visto en producción el 2026-09-29_).
      _Según la revisión `security` L3 del 2026-09-28; no repasado por mí._ La
      autoría ya no sale del cuerpo (`shift_id` del pago, `created_by` del vale,
      `opened_by` del día; _comprobado en producción el 2026-09-29_).
- [ ] **Parking: cambios del cobro sin historial** — editar `payment_amount`,
      método o referencia no deja rastro del valor anterior. Que se pueda
      editar en cualquier estado es intencionado (ADR-032, 2026-10-04). El
      signo, el `ENUM` del método y las longitudes ya se validan
      (2026-10-02). _Comprobado por mí el 2026-09-28._

### 🟡 Media

- [ ] **Borrar los datos de prueba de Aiven** — la BD de producción solo
      tiene datos de prueba (incluidos usuarios de horarios con nombre de
      pila). Si el borrado se retrasa o se da acceso a gente de fuera, antes
      renombrarlos (`Empleado 01`…).
- [ ] **Render: comprobar qué versión de Node usa** — `engines` pide
      `>=22.16.0` sin tope y, según la documentación de Render, un rango
      abierto se resuelve a la última versión; el log de producción muestra el
      aviso `DEP0205`, que podría ser de una versión posterior. Mirarlo en el
      log de build y, si no es la 22, acotar `engines` (`>=22.16.0 <23`) o
      fijar `NODE_VERSION`.
      _No comprobado._
- [ ] **Maintenance: las fotos no se borran con el parte** — ya son privadas
      (solo la API las sirve), pero el borrado lógico no las toca,
      `auto_delete_on_close` se guarda y nadie lo usa, y subir o borrar fotos
      no queda en el historial. _Comprobado por mí el 2026-09-28._
- [ ] **Scheduling: datos de salud guardados sin plazo** —
      `scheduling_solver_runs` guarda para siempre la entrada completa del
      solver (con las bajas `IT`/`E` de cada usuario) y su matriz. Decidir el
      plazo cuando haya datos reales (RGPD); el dueño lo dejó para después de
      publicar el 2026-10-04. La lectura ya es solo de `admin` y el log de un
      INFEASIBLE ya no las incluye (2026-10-04).

- [ ] **Parking: dos reservas creadas a la vez chocan en `booking_code`** —
      el trigger `trg_generate_booking_code` calcula el siguiente número con
      `MAX()` sobre una lectura sin bloqueo; dos altas simultáneas (aunque sean
      de plazas distintas) sacan el mismo código y una falla con 500. No hay
      doble reserva, solo el error. _Visto en preview el 2026-10-04._
- [ ] **Probar una restauración del backup de Aiven** antes de meter datos
      reales — Aiven hace copias automáticas y existe
      `backend/db-mysql/backup/backup.ps1`, pero no consta que se haya
      probado a restaurar ninguna. Del plan archivado (`Global-Plan.md`, H3-8).
- [ ] **Sentry para los errores** — no está instalado (_comprobado el
      2026-09-28_). Esperaba un DSN. Cuando lo haya: `@sentry/node` en el
      backend (`Sentry.init` al principio de `index.ts` y envolver el manejador
      global de errores) y `@sentry/nextjs` en el frontend. El plan gratuito
      (5000 errores al mes) basta.
- [ ] **Cloudflare Zero Trust Access delante del frontend** — login con Google
      antes de llegar a la app, solo para el equipo (gratis hasta 50 usuarios).
      Hoy `four-points.stackbp.es` apunta directo a Vercel (_comprobado con DNS
      el 2026-09-28_). Pasos: el DNS de `stackbp.es` en Cloudflare; el CNAME del
      frontend con proxy activado (nube naranja); activar Zero Trust; Google
      como proveedor de identidad; una aplicación _self-hosted_ para
      `four-points.stackbp.es` con la lista de correos del equipo; probar en
      incógnito. ⚠️ **No poner `api.four-points.stackbp.es` detrás**: el
      navegador no podría llamar al API.
- [ ] **Comprobar si los cron se ejecutan en Render** — corren dentro del
      proceso del backend; si el plan gratuito lo duerme por inactividad, no se
      disparan. _No comprobado._
- [ ] **Backend: quedan 55 usos de `any`** — `no-explicit-any` está como aviso
      en `backend/eslint.config.js` para que el lint pase. El 2026-10-04 se
      tiparon controllers, services y repositories de los 15 módulos (de 316
      avisos a 55); quedan auth, `config/db.ts`, cron, scripts y tests. Tiparlos
      y volver a poner la regla como error.
- [ ] **Avisar a los usuarios de que un `admin` puede leer sus mensajes** —
      `getConversation` y `getMessages` (`backend/controllers/messages/`) dejan
      leer cualquier conversación al rol `admin`, aunque no participe. Decidir
      si se mantiene y, si es así, decirlo en la interfaz. _Comprobado el
      2026-09-28._
- [ ] **La retención de mensajes borra las conversaciones vacías** — el evento
      MySQL `cleanup_old_messages` borra cada día, además de los mensajes de más
      de 90 días, toda conversación sin mensajes, incluidas las recién creadas y
      aún sin estrenar. _Comprobado el 2026-09-28 en local y Aiven:
      `event_scheduler=ON` y el evento está `ENABLED` (última ejecución en
      Aiven: 2026-09-27)._
- [ ] **Adaptar el harness a repos con varios proyectos e implantarlo** — en el
      repo `harness`, privado y local:
      soportar repos sin `package.json` ni lockfile en la raíz (aquí `frontend/`
      y `backend/` son dos proyectos pnpm independientes) y `AGENTS.md`
      anidados. Después, implantar la capa 1 en este repo. _Comprobado el
      2026-09-28 en `lib/detect.mjs` y `commands/init-project.md` del harness
      (ADR-017)._
- [ ] **Comprobar que Claude Code carga los `AGENTS.md` de las subcarpetas** —
      los `CLAUDE.md` de módulo se borraron en vez de quedar como punteros; si
      Claude Code solo lee `CLAUDE.md` por directorio, ese contexto se pierde.
      _Sin comprobar._
- [ ] **Fechas y «hoy» dependen de la zona horaria de cada pieza** — navegador
      en Madrid, Node en la del proceso (Madrid en local; Render sin comprobar,
      UTC si no tiene `TZ`) y MySQL en la suya (Madrid en local; Aiven en UTC,
      `time_zone=SYSTEM`, comprobado el 2026-09-28). No son relojes
      desincronizados:
      - El pool (`config/db.ts`) no fija `timezone` ni `dateStrings`: una
        columna `DATE` llega como instante a medianoche de Node. Con Node en
        Madrid, el 30/09 viaja como `2026-09-29T22:00:00Z`, y quien lo corta por
        la `T` se queda con el 29. Así, en local, cada edición de una factura le
        resta un día a sus fechas (`InvoiceFormModal.tsx:83-87`). Con Node en
        UTC sale bien.
      - Si Node y MySQL no están en la misma zona, los `DATETIME` se desplazan:
        con Node en UTC contra la MySQL local, `NOW()` sale 2 h movido (p. ej.
        `pnpm dev:aiven` desde un equipo en Madrid).
      - «Hoy» en UTC está mal entre las 00:00 y las 02:00 de Madrid:
        `toISOString()` en 26 sitios del frontend y 6 del backend,
        `CURDATE()`/`NOW()` en Aiven (19 consultas con `CURDATE()`: filtros de
        parking, código `PK-AAAAMMDD` del trigger, `CURRENT_TIMESTAMP`) y el
        identificador `DDMMAA-NNN` de Maintenance (fecha de Node).
      - 15 sitios del frontend cortan por la `T` fechas del servidor (grupos,
        lista negra, parking, horarios, checklist, caja, backoffice).

      Plan: `DATE` como texto `AAAA-MM-DD` (`dateStrings`), «hoy» siempre en
      Madrid (un helper en el frontend, `getTodayMadrid` en el backend) y zona
      fija entre Node y MySQL. Antes: mirar si Render tiene `TZ` y si alguna
      fecha de Aiven se ha movido ya por ediciones. Tarea propia, decidida el
      2026-10-12. _Medido el 2026-10-12 contra la BD local con Node en Madrid y
      en UTC._
- [ ] **Logbook: papelera e historial solo ocultos en la pantalla** — el backend
      da `/trashed`, `include_trashed`, el historial y los comentarios de
      entradas borradas a cualquier rol con acceso. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Logbook: la fecha de una entrada admite cualquier día** — pasado o
      futuro, sin límite. Decidir qué rango tiene sentido. _Comprobado por mí el
      2026-09-28._
- [ ] **Parking: entrada y salida aceptan fechas reales arbitrarias** — el
      cuerpo del `PUT` ya se valida con Zod (2026-10-02), pero las fechas de
      entrada y salida reales no. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Parking: `GET /vehicles` vuelca todos los vehículos** (matrícula y
      titular) sin paginar ni filtrar. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Parking: el origen y la referencia externa se pierden al crear** — el
      frontend (`useBookingWizard.ts`) envía `source`
      y `external_id`; el controlador lee `booking_source` y
      `external_booking_id` y además los pasa a Zod con los nombres cambiados:
      siempre queda `direct`. **Decidir antes de arreglar:** los formularios
      ofrecen `phone`, `email`, `walkin` y `booking` (`DateOnlyStep.tsx`), que el
      `ENUM` de `parking_bookings.booking_source` no admite (`direct`,
      `booking_com`, `expedia`, `airbnb`, `agency_other`); conservar el origen
      sin ampliar el `ENUM` o mapear esos valores haría fallar la reserva.
      _Comprobado por mí el 2026-09-28; detalle del 2026-10-02._
- [ ] **Mensajería: crear una conversación no va en transacción** — el formato
      y los repetidos de `participant_ids` y `user_ids` ya se validan, pero un
      usuario inexistente o inactivo deja la conversación creada a medias.
      _Según la revisión `security` L3 del 2026-09-28 (fichero y línea en el
      informe); no repasado por mí._
- [ ] **Mensajería: avisos urgentes sin límite** — solo el límite global de 300
      peticiones cada 15 min por IP. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Mensajería: la copia del mensaje en la notificación no se borra nunca**
      — ni al borrar o editar el mensaje ni a los 90 días; no hay limpieza de
      notificaciones. El borrado lógico deja el texto íntegro. _Comprobado por
      mí el 2026-09-28._
- [ ] **Mensajería: quien entra en un grupo ve todo el historial**, también lo
      escrito mientras estaba fuera si se le readmite. Decidir si es la regla.
      _Comprobado por mí el 2026-09-28._
- [ ] **Mensajería: el creador de un DM puede borrarlo entero**, mensajes del
      otro incluidos, sin registro. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Los documentos de `backend/db-mysql/` están desactualizados** — citan
      `aiven/aiven-conexion.md` (no existe), «~50 tablas» (Aiven tiene 66 y 3
      vistas), volcados con nombres que no son los actuales y la política «local
      primero» (ADR-015). `MASTER_INSTALL.sql` solo llega al 2026-05-20. Se
      corrigen poco a poco, con `docs/general/database/` como resumen (ADR-016).
      _Comprobado por mí el 2026-09-28._
- [ ] **El pago automático del día 10 no ha funcionado nunca** — el cron escribe
      `updated_by = 'system-cron'`, que es clave foránea a `users`, y ese
      usuario no existe en Aiven (0 facturas pagadas por el cron). Además el
      pago en lote no va en una transacción. _Comprobado por mí el 2026-09-28._
- [ ] **La generación manual de notificaciones crea avisos duplicados** con
      varias peticiones a la vez: no hay clave única. (Desde el 2026-10-02 solo
      la lanzan admin y group-admin.) _Según la revisión `security` L3 del
      2026-09-28; no repasado por mí._
- [ ] **Maintenance: la edición general se salta las reglas** — `PATCH /:id`
      admite `status` (sin fechas de inicio o cierre ni la acción correcta en el
      historial) y `resolution_notes` (reescribe el campo entero, así que se
      pueden inventar o borrar notas con autor). _Comprobado por mí el
      2026-09-28._
- [ ] **Maintenance: sin flujo de estados en el backend** — cualquier estado
      pasa a cualquier otro y un parte cerrado se reabre por la API. Cancelar se
      registra en el historial como «cerrado». _Comprobado por mí el
      2026-09-28._
- [ ] **Maintenance: la asignación no valida al destinatario** — vale un usuario
      inactivo, de cualquier rol o inexistente, y la edición no comprueba que
      tipo interno o externo encaje con el resto de campos. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Groups: las mutaciones no van en transacción con su historial** — el
      historial se escribe en el controlador, fuera de las transacciones del
      repositorio: un fallo entre ambos deja cambios sin registrar. El borrado
      del grupo ya va junto a su fila de historial (2026-10-11). _Comprobado
      el 2026-10-11._
- [ ] **Groups: el historial registra campos que no cambiaron** — editar solo
      el importe de un grupo dejó 7 filas `updated` (`arrival_date`,
      `created_at`, `updated_by`…). La comparación de `logGroupUpdated` trata
      como distintos valores iguales (fechas, nulos). _Visto el 2026-10-11._
- [ ] **Checklist: el reinicio manual no funciona** — `resetRun` cierra el run y
      crea otro del mismo día, pero la clave única
      `uk_run (hotel_id,     checklist_id, hotel_date)` lo impide: 500. Después
      `getOrCreateRun` devuelve el run cerrado y los cambios del día se escriben
      en él. Sin transacción ni test. En Aiven nadie lo ha usado (0 cierres
      manuales) y la pantalla no lo llama: decidido el 2026-10-11 dejar el
      endpoint como está; antes de usarlo, cambiar la clave única. _Comprobado
      el 2026-10-11._
- [ ] **Cashier: los cierres de turno y de día no bloquean** — se comprueban
      antes de escribir, sin bloqueo: un pago o un vale puede entrar en un turno
      que otro usuario está cerrando. El ciclo de los vales y su límite de 5 ya
      van en transacción (2026-10-11). _Según la revisión `security` L3 del
      2026-09-28; no repasado._

### 🟢 Baja

- [ ] **Artículo en el blog del portfolio sobre el motor de horarios** — cómo
      se modelaron los cuadrantes de recepción con OR-Tools (CP-SAT): reglas
      duras y blandas, bloques de noches, continuidad entre meses y el daemon
      de Python. Enlazar la demo y el repo. Es el gancho para promocionar el
      proyecto. Se escribe en el repo `portfolio-bp`, no aquí. _Decidido el
      2026-10-05._
- [ ] **`excludeMantenimiento` es una lista de exclusión** — parking, lista
      negra, caja, partes, conciliación y departamentos dejan pasar cualquier
      rol salvo `mantenimiento`, y `services/auth/module-access.ts` lo replica.
      Hoy solo hay roles conocidos (el rol va en el token firmado y sale de
      `roles`), pero un rol nuevo tendría acceso sin que nadie lo decida. Pasar
      a lista de permitidos. _Comprobado el 2026-10-05 al retirar
      `demo-admin`._
- [ ] **`20260512_disable_demo_user.sql` desactivaría la cuenta demo** si se
      volviera a ejecutar (`UPDATE users SET is_active = 0 WHERE username =
      'demo'`). `setup:local` no la ejecuta (es anterior al baseline); no
      aplicarla a mano. _Comprobado el 2026-10-05._
- [ ] **Configuración: `?tab=` de una pestaña sin permiso deja el contenido en
      blanco** — p. ej. recepción con `?tab=users`; debería caer en la primera
      pestaña disponible. _Visto el 2026-10-05._
- [ ] **Errores del backend sin traducir** — `messages/{es,en}/errors.json`
      tiene ~200 textos en `codes` que nadie usa: la UI muestra el `error` del
      backend, en español. `app/lib/helpers/errorCodeMessage.ts` ya los traduce
      para `STORAGE_NOT_CONFIGURED`; extenderlo a los demás códigos revisando
      que no se pierda detalle del mensaje. _Visto el 2026-10-05._
- [ ] **Scheduling: vista de solo lectura para los demás roles** — hoy
      `/dashboard/scheduling` es solo de `admin` y el resto no ve el cuadrante.
      El dueño quiere que los demás (salvo `mantenimiento`) vean el cuadrante
      publicado, sin edición ni configuración. Funcionalidad nueva, sin prisa
      (2026-10-04). Necesita su propio endpoint sin bajas ni notas: la API de
      scheduling es solo de admin por los datos de salud.
- [ ] **Backoffice: rechazar facturas no tiene UI** — el estado `rejected` y
      `POST /invoices/:id/reject` existen, pero ningún botón los usa y ninguna
      pestaña muestra las rechazadas. Una factura incorrecta hoy se borra. El
      dueño decidió el 2026-10-04 no añadirlo porque casi nunca pasa; si se
      añade, hace falta también reabrir (`rejected` → `pending`).
- [ ] **Conciliation: el cierre mensual no tiene pantalla ni congela los
      días** — `PATCH /monthly-summary/:year/:month/status` solo existe en la
      API (`useUpdateMonthlySummaryStatus` no lo usa ningún componente), y con
      el mes cerrado un admin puede reabrir o borrar cualquiera de sus días. La
      comprobación de que todos los días están cerrados va sin bloqueo. El
      dueño decidió el 2026-10-11 dejarlo así; si se le da pantalla, cerrar el
      mes debe bloquear sus días y comprobar con el mes bloqueado. _Comprobado
      el 2026-10-11._
- [ ] **Maintenance: comprobar si Cloudinary quita los metadatos EXIF/GPS** de
      las fotos. _Sin comprobar._
- [ ] **Parking: salto de precio a partir de 31 días** — las tarifas llegan a 30
      días (250 € en Aiven); a partir de 31 se cobran 15 €/día (465 €).
- [ ] **Mensajería sin tiempo real** — los mensajes nuevos solo aparecen al
      reabrir la conversación. Valorar un sondeo periódico como el de las
      notificaciones. _Comprobado el 2026-09-28: no hay intervalo ni WebSocket._
- [ ] **Zod 3 en el frontend y Zod 4 en el backend** (`^3.25.17` frente a
      `4.0.5`) — unificar si se llegan a compartir esquemas.
- [ ] **Presencias a mano** — la pestaña de presencias de `scheduling` pide
      pegar el texto en un `textarea`; podría leerse de
      `scheduling_assignments`.
- [ ] **Ejecutor de tests en el frontend** — no tiene: sus tests viven en
      `backend/tests/` (10 ficheros: 7 importan funciones del frontend y 3 leen
      su código) y no cubren componentes ni hooks. _Contado el 2026-10-12._
- [ ] **Scheduling: cerrar la fase 3 del solver con uso real** — bloqueado hasta
      que se generen meses de verdad. (1) Con ≥30 generaciones en
      `scheduling_solver_runs`, buscar patrones (estado, penalización, desglose)
      y anotarlos en `docs/scheduling/decisions.md`. (2) Probar el análisis de
      `infeasible` con 3 casos imposibles a propósito (p. ej. 2 rotatorios y
      cobertura mínima 3) y ver si las relajaciones que sugiere sirven. (3)
      Ajustar los pesos: guardar la matriz publicada (falta la columna
      `published_matrix`; hoy solo está `solver_matrix`), compararla con la del
      solver y retocar pesos cada 2-3 meses; método en `decisions.md`, entrada
      2026-05-09.
- [ ] **Checklist: contenido que falta** (lo escribe el manager, no desarrollo)
      — `tasks/housekeeping-daily.json` y las guías `fidelizacion-postcheckin.md` y
      `balancing-opera.md` en `frontend/content/checklist/`.
- [ ] **Seguridad cuando haya datos reales** (ideas del plan antiguo, no fallos)
      — registro de auditoría de seguridad, 2FA opcional para `admin`, log
      estructurado de los eventos de login y errores genéricos que no dejen
      averiguar si un usuario existe.
