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

- [ ] **Rotar las credenciales de producción** — contraseña de la BD y claves
      de Cloudinary, y revocar las claves de servicios que ningún código usa.
      El historial publicado no las contiene, pero siguen en copias privadas
      (ADR-007). El procedimiento está fuera del repositorio.
      `SECRET_JWT_KEY` ya se cambió el 2026-09-29. Además, el historial
      publicado sí trae la contraseña en claro de un usuario de la aplicación
      (`test-login.js`, commit `8595ec0`, con su hash): cambiarla en toda
      cuenta que la use, en Aiven y fuera. Decisión del dueño (2026-10-12):
      se rota y el historial no se reescribe.
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

- [ ] **Grupos: el detalle del grupo da los contactos a `mantenimiento`** —
      `GET /api/groups/:id` (`controllers/group/group-controller.ts`, detalle)
      devuelve `contacts` con email y teléfono a cualquier rol de
      `canViewGroups`. El commit `e7a5443` (decisión del 2026-10-12) protegió
      `/contacts`, `/contacts/primary` y el historial con
      `canViewGroupContacts`, pero este endpoint se quedó fuera; el frontend
      oculta la pestaña, pero `useGroup` recibe los datos igual. Quitar los
      contactos del detalle para esos roles y añadir el test. _Comprobado por
      mí el 2026-10-13 leyendo el código._

### 🟡 Media

- [ ] **Borrar los datos de prueba de Aiven** — la BD de producción solo
      tiene datos de prueba (incluidos usuarios de horarios con nombre de
      pila). Si el borrado se retrasa o se da acceso a gente de fuera, antes
      renombrarlos (`Empleado 01`…).
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
- [ ] **Parking: `GET /vehicles` vuelca todos los vehículos** (matrícula y
      titular) sin paginar ni filtrar. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
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

- [ ] **Scheduling: las reglas H2, H4, H5 y libres están duplicadas y no
      coinciden** — `validate()` solo registra `CoverageConstraint` y
      `EmployeeRulesConstraint`; H2, H4, H5 y los libres se aplican en línea
      en `runFinalValidation()`. Las clases `night-block`,
      `max-consecutive-work`, `consecutive-rest` y `monthly-libre` solo las usa
      `tests/scheduling/constraints.test.ts` y se comportan distinto (H4 suma
      la racha del mes anterior; H5 es error, en línea es aviso).
      `docs/scheduling/constraints.md` y los `@emitter` de `soft-weights.ts`
      apuntan a esas clases. Decidir cuál es la buena, dejar una sola y
      alinear la especificación. _Comprobado por mí el 2026-10-13._
- [ ] **Scheduling: tras generar, las celdas de peticiones aprobadas y de
      `fixedDays` quedan editables** — `applyGeneratedSchedule()` las inserta
      desde `generatedRows()` sin `source_constraint_id`, así que no salen
      bloqueadas en la parrilla ni devuelven 409 al editarlas. Decidir si es
      lo querido o si deben bloquearse como las de restricciones aprobadas.
      _Comprobado por mí el 2026-10-13 leyendo el código._

### 🟢 Baja

- [ ] **Artículo en el blog del portfolio sobre el motor de horarios** — cómo
      se modelaron los cuadrantes de recepción con OR-Tools (CP-SAT): reglas
      duras y blandas, bloques de noches, continuidad entre meses y el daemon
      de Python. Enlazar la demo y el repo. Es el gancho para promocionar el
      proyecto. Se escribe en el repo `portfolio-bp`, no aquí. _Decidido el
      2026-10-05._
- [ ] **`20260512_disable_demo_user.sql` desactivaría la cuenta demo** si se
      volviera a ejecutar (`UPDATE users SET is_active = 0 WHERE username =
      'demo'`). `setup:local` no la ejecuta (es anterior al baseline); no
      aplicarla a mano. _Comprobado el 2026-10-05._
- [ ] **Errores que aún llegan sin traducir** — los códigos del backend ya se
      traducen en el cliente (`app/lib/helpers/errorCodeMessage.ts`; un test
      exige texto en es y en para cada `ERROR_CODES.X` y cada `code: 'X'`).
      Quedan: las server actions de blacklist, groups y parking
      (`app/dashboard/*/actions/`, `app/lib/parking/actions.ts`) lanzan
      `errorData.error`, que es el código en crudo, y en el servidor no hay
      `document` para leer el idioma; unas 380 respuestas 4xx/5xx del backend
      llevan un texto fijo (casi siempre en español) y ningún `code`, así que
      en inglés se ven en español: scheduling ~135, maintenance ~56, parking
      ~59 (`parking.controller.ts`, `stats.controller.ts` y los 400 de
      check-out, cancelar y no-show), middlewares ~39 (`roleCheck.ts`,
      `rateLimiter.ts`…), cashier ~39, checklist ~20, auth ~13 y algunas de
      fnb, demo y search; el 409 del reinicio de la demo y el subtítulo del
      login (`login/page.tsx`) también van fijos en español. Ir módulo a
      módulo (B5.n). _Medido el 2026-10-12._
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
- [ ] **Subir el backend a Node 24** — producción va en 22 (Render, 22.23.3) y
      el frontend ya en 24 (Vercel). Desde f934b4d Render lee `backend/.nvmrc`,
      no el `.nvmrc` raíz, que ya no usan ni Render ni CI. Cambiar
      `backend/.nvmrc` y `engines` a `24.x`, y probarlo antes en preview
      (pdf-parse v1, solver, cron). _Comprobado en los logs de Render y Vercel
      el 2026-10-12, y en el deploy preview de 72b5d3c el 2026-10-13._
- [ ] **Parking: `SpotType` no coincide con la BD** — en
      `backend/models/parking/index.ts` es `standard | large | handicapped |
      electric`; el `ENUM` de `parking_spots.spot_type` es `normal | ancha |
      mas_ancha | esquina | accesible | estrecha_bicis`. El tipo no protege
      nada hoy. _Comprobado por mí el 2026-10-13._
- [ ] **Solver: el venv local no coincide con producción** — en el equipo
      principal corre Python 3.13.5 y `.python-version` fija 3.11, y no tiene
      `pytest`, así que la suite de Python no se puede lanzar. Recrearlo con
      3.11 e instalar `requirements.txt` + `pytest` (lo hace el dueño).
      _Comprobado el 2026-10-13._
