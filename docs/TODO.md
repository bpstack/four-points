# TODO — Four-Points

> **Qué responde:** qué queda por hacer. · **Quién lo lee:** quien retome el
> trabajo, al elegir en qué trabajar. · **Cómo se poda:** lo terminado se
> **borra**, no se tacha — `git log` ya registra que se hizo.

🔴 **Lo terminado sale de la lista.** Este fichero no tiene archivo detrás: lo
hecho se borra y queda en `git log`.

📌 **Si un punto necesita que otro se haga antes, va en `ROADMAP.md`**, no aquí.

⚠️ **Antes de dar algo por pendiente, mira el código.** Un TODO desactualizado
hace que alguien reimplemente lo que ya existe.

**Prioridad:** 🔴 alta · 🟡 media · 🟢 baja

---

## Rama `claude/compassionate-planck-gh6aof`

Fusionada en `main` el 2026-10-05 (PR #10, commit de merge `0953e94`). La rama
sigue siendo donde se arregla este fichero y se prueba en el entorno preview.

## Después de publicar

> Mejoras sin brecha de seguridad: lógica de negocio, rastro de cambios,
> carreras, operación, interfaz y calidad. Se trabajan en el repositorio
> público, sin plazo (ADR-033).

### 🔴 Alta

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
- [ ] **MySQL de Aiven en UTC** — `time_zone=SYSTEM` con el sistema en UTC.
      `CURDATE()` y `NOW()` de la BD (filtros rápidos de parking, código
      `PK-AAAAMMDD` del trigger, `CURRENT_TIMESTAMP` de las tablas) van 1–2 h
      por detrás de Madrid: entre las 00:00 y las 02:00 «hoy» sigue siendo ayer.
      _Comprobado el 2026-09-28._
- [ ] **Quitar el soporte de BD local del código** (ADR-015) — `DB_ENVIRONMENT`
      y el preset `local` de `backend/config/db.ts`, el script `dev:local`, las
      variables `LOCAL_DB_*` y las menciones a «local primero» en
      `backend/db-mysql/`.
- [ ] **Comprobar que los scripts del repo reproducen Aiven** — hoy Aiven es la
      única BD y `backend/db-mysql/` la fuente de verdad (ADR-016), pero nadie
      ha verificado que coincidan. Pista: la BD local, instalada desde esos
      scripts, difería de Aiven en `demo_activity_log`, `notifications.module`,
      `roles.name` y 7 claves foráneas (comparación del 2026-09-28).
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
- [ ] **Maintenance: cambio e historial sin transacción** — un fallo entre ambos
      deja cambios sin registrar. _Comprobado por mí el 2026-09-28._
- [ ] **Groups: lógica de pagos incoherente** — se acepta un `amount_paid` mayor
      que el importe, `paid` sin haber pagado nada, recálculos que no tocan el
      estado y porcentajes que suman más de 100. _Según la revisión `security`
      L3 del 2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Groups: borrar un grupo borra su historial** — no se registra el borrado
      y `group_history` tiene `ON DELETE CASCADE`; ninguna mutación va en
      transacción con su registro. _Comprobado por mí el 2026-09-28._
      (transacciones, según el revisor)
- [ ] **Notificaciones manuales: se pueden enviar a usuarios inactivos** — el
      formato, los repetidos, la prioridad y los textos ya se validan; que el
      usuario exista y esté activo, no. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Scheduling: generar un mes deja vacías las celdas de días fijos y
      solicitudes aprobadas** — el solver las recibe como bloqueadas, la
      generación no las reinserta y el borrado previo se las lleva. En Aiven, en
      los meses 126 y 130 (generados por el solver) el empleado con días fijos
      tiene 0 celdas. _Comprobado por mí el 2026-09-28._
- [ ] **Scheduling: un mes publicado se puede modificar** — editar celdas y
      aprobar restricciones no miran el estado del mes, y `PUT /months/:id`
      vuelve a borrador sin pasar por `unpublish`. _Según la revisión `security`
      L3 del 2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Scheduling: `setSchedulableEmployees` pierde las fechas de alta y baja**
      — borra la tabla entera y la vuelve a llenar. _Comprobado por mí el
      2026-09-28._
- [ ] **Scheduling: el solver no es determinista** — no recibe semilla y CP-SAT
      busca en paralelo: dos ejecuciones del mismo mes pueden dar horarios
      distintos. Decidir si se fija semilla y un solo hilo. _Comprobado por mí
      el 2026-09-28._
- [ ] **Checklist: el reinicio manual no funciona** — `resetRun` cierra el run y
      crea otro del mismo día, pero la clave única
      `uk_run (hotel_id,     checklist_id, hotel_date)` lo impide: 500. Después
      `getOrCreateRun` devuelve el run cerrado y los cambios del día se escriben
      en él. Sin transacción ni test. En Aiven nadie lo ha usado (0 cierres
      manuales). _Comprobado por mí el 2026-09-28._
- [ ] **Checklist: borrar comentarios e imágenes de días cerrados** — el autor
      puede reescribir el histórico, y el evento se registra en el run de hoy y
      como si fuera una alta. _Según la revisión `security` L3 del 2026-09-28
      (fichero y línea en el informe); no repasado por mí._
- [ ] **Cashier: ciclo de vida de los vales y cierres sin bloqueo** — se puede
      justificar un vale cancelado y cambiar el importe de uno justificado; el
      límite de 5 vales y los cierres de turno y día se comprueban antes de
      escribir, sin bloqueo. _Según la revisión `security` L3 del 2026-09-28
      (fichero y línea en el informe); no repasado por mí._
- [ ] **Cashier: el historial y los totales se ven sin `canViewReports`** —
      `GET /shifts/:id/history`, `/daily` y `/vouchers/stats`. _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Backoffice: borrar una factura borra también su historial** — borrado
      definitivo, con las columnas de borrado lógico sin usar. _Comprobado por
      mí el 2026-09-28._
- [ ] **Backoffice: integridad del PDF validado** — se puede validar sin PDF o
      con cualquier PDF, sin enlace entre el original y la copia sellada. _Según
      la revisión `security` L3 del 2026-09-28 (fichero y línea en el informe);
      no repasado por mí._
- [ ] **Backoffice: sin validación de importes ni fechas** — importes negativos,
      facturas duplicadas (sin UNIQUE por proveedor y número) y `paid_date`
      libre. _Según la revisión `security` L3 del 2026-09-28 (fichero y línea en
      el informe); no repasado por mí._
- [ ] **Backoffice: subidas y descargas sin comprobar contenido ni tamaño** —
      solo el tipo declarado por el navegador; las descargas del ZIP no tienen
      límite de tamaño y siguen redirecciones. _Según la revisión `security` L3
      del 2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Conciliation: el cierre mensual tiene una carrera** — la validación
      (lectura) y el cambio de estado (escritura) no comparten transacción ni
      bloqueo; dos administradores cerrando días distintos del mismo mes a la
      vez pueden dejarlo inconsistente. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._

### 🟢 Baja

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
- [ ] **Demo pública en la propia web** (fase 5 de `ROADMAP.md`) — la web es
      solo un escaparate (decidido por el dueño el 2026-10-05), así que la demo
      va en `four-points.stackbp.es` con su BD, sin subdominio ni BD aparte
      como proponía el plan del 2026-10-04. Si algún día se usa de verdad, la
      demo se separa entonces.
      - **Usuarios demo públicos por rol** (admin, recepción, mantenimiento y
        grupos), con la contraseña a la vista en el login. Las cuentas del
        dueño (`admin`, `qa_*`) siguen aparte, con contraseñas solo suyas.
      - **Acceso:** ven toda la app y pueden crear, editar y borrar, porque se
        reinicia. Bloqueado: la configuración (crear, editar o borrar usuarios
        y roles, y cambiar contraseñas), subir ficheros a Cloudinary (o carpeta
        `demo/` vaciada cada noche) y límites de peticiones más estrictos.
      - **Generar horarios:** abrir el solver al rol demo (hoy toda la ruta de
        horarios es solo `admin`). Con un límite por usuario o IP y un tiempo
        máximo: el solver carga OR-Tools en el plan gratuito de Render (512 MB)
        y el semáforo solo lo hace secuencial.
      - **Reinicio diario:** un cron vuelve a cargar `mock-data.sql` y también
        horarios, que el mock no toca: borrar los meses creados por la demo y
        restaurar una base fija de meses y asignaciones. Esa base se genera
        con el solver; no se saca de los meses actuales, que vienen de bajas
        reales.
      - **Arranque en local:** documentar cómo crear el primer admin y los
        departamentos antes del mock; `MASTER_INSTALL.sql` no crea ninguno.
      - **Al hacerlo:** ADR que revisa la propuesta del subdominio y la fase 5
        de `ROADMAP.md`. El repositorio se hace público cuando la demo esté.
- [ ] **Reutilizar el rol `demo-admin` para la demo pública** (antes «retirarlo»;
      ver «Demo pública» y la fase 5 de `ROADMAP.md`) — el único usuario con
      ese rol, `demo`, está desactivado (`is_active = 0`, comprobado en Aiven el
      2026-10-04). El rol sigue en los middlewares de `roleCheck.ts`, en
      `demoRestriction` (lista blanca de escrituras y registro de intentos
      bloqueados), en las rutas `/demo` y en el frontend (`isAdminRole`). Las
      reglas añadidas el 2026-10-02 ya no lo incluyen. En producción, mientras
      exista, `demo-admin` entra en backoffice y lee los PDFs de facturas por
      `/pdf-url`, `/pdf-download` y el ZIP (antes un punto 🔴 aparte; se movió
      aquí el 2026-10-04 porque no hay ninguna cuenta activa): en la demo vale,
      en producción no debe haber cuentas con ese rol.
- [ ] **Conciliation: `GET /api/conciliations` sin paginar ni filtrar** —
      devuelve todo el histórico a cualquier rol con acceso. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Backoffice: `demo-admin` ve IBAN, CIF y datos de contacto completos** de
      los proveedores. _Según la revisión `security` L3 del 2026-09-28 (fichero
      y línea en el informe); no repasado por mí._
- [ ] **Checklist: `checklist_config` existe pero no se usa.** _Comprobado por
      mí el 2026-09-28._
- [ ] **Scheduling: reiniciar un mes no usa transacción** — si falla a mitad, el
      mes queda vacío. _Comprobado por mí el 2026-09-28._
- [ ] **Scheduling: comprobar si `LI` debe contar como descanso en el solver** —
      falta en `REST_SHIFTS` de `rest.py`. _Sin comprobar su efecto._
- [ ] **Scheduling: `day_id` de otro mes aceptado** y comprobación de bloqueo
      fuera de transacción en las ediciones masivas. El tamaño de las listas y
      los ids de empleado ya se validan (2026-10-02). _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Scheduling: el daemon del solver puede quedar bloqueado** — el semáforo
      se retiene durante el arranque (hasta 30 min) con cola sin límite. _Según
      la revisión `security` L3 del 2026-09-28 (fichero y línea en el informe);
      no repasado por mí._
- [ ] **Importador del Excel** — borra también las celdas bloqueadas, sin
      transacción ni comprobar si el mes está publicado. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Groups: recordatorios repetidos cada 48 h** — los de pago se buscan en
      un rango de días y se deduplican por título en una ventana de 48 h: el
      mismo pago se vuelve a avisar con «vence en 15 días» aunque falten 2, y
      los vencidos se repiten sin fin. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Groups: la ficha no se refresca tras editar el grupo** — después de
      «Grupo actualizado correctamente» el balance sigue mostrando el importe
      anterior (y el panel de pagos calcula los porcentajes sobre él) hasta que
      otra acción recarga los datos; el backend sí guarda el valor nuevo.
      _Comprobado en producción el 2026-09-29._
- [ ] **Groups: contactos (email y teléfono) visibles para todos los roles**,
      también `mantenimiento` (ASVS L3: solo los datos mínimos). _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Maintenance: identificador `DDMMAA-NNN` frágil** — se calcula leyendo el
      último del día (dos altas a la vez chocan y dan 500) con la hora del
      servidor; a partir del parte 1000 del día el id no cumple el formato y el
      parte queda inaccesible. _Comprobado por mí el 2026-09-28._ (el límite de
      1000, según el revisor)
- [ ] **Maintenance: el límite de 5 fotos se salta subiendo en paralelo** —
      se cuenta antes de subir, sin bloqueo. _Según la revisión `security` L3
      del 2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Maintenance: comprobar si Cloudinary quita los metadatos EXIF/GPS** de
      las fotos. _Sin comprobar._
- [ ] **Procedimientos de BD sin uso** — de las 2 funciones y 5 procedimientos
      de parking, el código solo llama a `check_availability`; el resto
      (incluido `generate_availability`, que amplía el calendario) no los usa
      nadie. _Comprobado por mí el 2026-09-28._
- [ ] **Datos sensibles en los logs** — usernames de logins fallidos, `redact`
      de un solo nivel y, probablemente, `err.sql` de mysql2 con los valores
      (textos, matrículas, hashes). _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._ No
      verificado en ejecución.
- [ ] **Logbook: el historial registra cada comentario dos veces y cada
      lectura sin límite.** (Editar o volver a borrar un comentario borrado ya
      no es posible desde el 2026-10-02.) _Según la revisión `security` L3 del
      2026-09-28; no repasado por mí._
- [ ] **Registrar decisiones de autorización** — ni los 403 ni los accesos de un
      `admin` a conversaciones ajenas quedan en el log (ASVS L3). _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Parking: salto de precio a partir de 31 días** — las tarifas llegan a 30
      días (250 € en Aiven); a partir de 31 se cobran 15 €/día (465 €).
- [ ] **Parking: el mapa de estado no se refresca solo** — los cambios de otro
      usuario no aparecen hasta recargar.
- [ ] **Logbook: papelera y filtros sin interfaz** — `/trashed`, `/author`,
      `/department` y `/priority` existen en el backend y en `queries.ts`, pero
      la pantalla del módulo no los usa (Informes usa `/all` con filtros).
      Tampoco hay forma de restaurar lo borrado.
- [ ] **Panel de inicio: una petición por día** — con el periodo _mes_ lanza
      hasta 31 peticiones a `/api/logbooks/day/`
      (`frontend/app/dashboard/page.tsx`); `/all?date_from=&date_to=` lo haría
      en una.
- [ ] **Mensajería: exponer en la interfaz lo que el backend ya ofrece** —
      renombrar grupo, añadir y quitar participantes, buscar en mensajes,
      contador global de no leídos y vista de todas las conversaciones para
      `admin`. Las funciones existen en `frontend/app/lib/messaging/queries.ts`
      pero nadie las llama. _Comprobado el 2026-09-28 con búsqueda de usos._
- [ ] **Mensajería sin tiempo real** — los mensajes nuevos solo aparecen al
      reabrir la conversación. Valorar un sondeo periódico como el de las
      notificaciones. _Comprobado el 2026-09-28: no hay intervalo ni WebSocket._
- [ ] **Zod 3 en el frontend y Zod 4 en el backend** (`^3.25.17` frente a
      `4.0.5`) — unificar si se llegan a compartir esquemas.
- [ ] **Presencias a mano** — la pestaña de presencias de `scheduling` pide
      pegar el texto en un `textarea`; podría leerse de
      `scheduling_assignments`.
- [ ] **Tests en el frontend** — hoy no hay ninguno.
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
