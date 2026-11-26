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

Última fusión en `main`: 2026-10-14 (PR #31, commit de merge `4c4567a`). La rama
sigue siendo donde se arregla este fichero y se prueba en el entorno preview.

## Después de publicar

> Mejoras sin brecha de seguridad: lógica de negocio, rastro de cambios,
> carreras, operación, interfaz y calidad. Se trabajan en el repositorio
> público, sin plazo (ADR-033).

📦 **Errores conocidos admitidos:** 26 puntos que se aceptan y no se arreglan
ahora están en `docs/_archive/TODO.md`, apartado «Errores conocidos pendientes»
(ADR-045). Se supervisan; si uno vuelve a ser prioritario, se devuelve aquí.
`docs/_archive/` solo está en el PC principal: git lo ignora.

### 🔴 Alta

- [ ] **Rotar las credenciales de producción** — contraseña de la BD y claves de
      Cloudinary, y revocar las claves de servicios que ningún código usa. El
      historial publicado no las contiene, pero siguen en copias privadas
      (ADR-007). El procedimiento está fuera del repositorio. `SECRET_JWT_KEY`
      ya se cambió el 2026-09-29. Además, el historial publicado sí trae la
      contraseña en claro de un usuario de la aplicación (`test-login.js`,
      commit `8595ec0`, con su hash): cambiarla en toda cuenta que la use, en
      Aiven y fuera. Decisión del dueño (2026-10-12): se rota y el historial no
      se reescribe.

### 🟡 Media

- [ ] **Borrar los datos de prueba de la BD remota** — la BD de producción solo
      tiene datos de prueba (incluidos usuarios de horarios con nombre de pila).
      Si el borrado se retrasa o se da acceso a gente de fuera, antes
      renombrarlos (`Empleado 01`…).
- [ ] **Maintenance: las fotos no se borran con el parte** — ya son privadas
      (solo la API las sirve), pero el borrado lógico no las toca,
      `auto_delete_on_close` se guarda y nadie lo usa, y subir o borrar fotos no
      queda en el historial. _Comprobado por mí el 2026-09-28._
- [ ] **Montar copias de la BD remota y probar una restauración** antes de meter
      datos reales — desde el 2026-11-16 no hay copias automáticas (ADR-048);
      existe `backend/db-mysql/backup/backup.ps1`, y el volcado se cargó dos
      veces en la migración, pero no hay copia programada. Del plan archivado
      (`Global-Plan.md`, H3-8).
- [ ] **La retención de mensajes borra las conversaciones vacías** — el evento
      MySQL `cleanup_old_messages` borra cada día, además de los mensajes de más
      de 90 días, toda conversación sin mensajes, incluidas las recién creadas y
      aún sin estrenar. _Comprobado el 2026-09-28 en local y Aiven:
      `event_scheduler=ON` y el evento está `ENABLED` (última ejecución en
      Aiven: 2026-09-27)._
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
- [ ] **La generación manual de notificaciones crea avisos duplicados** con
      varias peticiones a la vez: no hay clave única. (Desde el 2026-10-02 solo
      la lanzan admin y group-admin.) _Según la revisión `security` L3 del
      2026-09-28; no repasado por mí._
- [ ] **Maintenance: la edición general se salta las reglas** — `PATCH /:id`
      admite `status` (sin fechas de inicio o cierre ni la acción correcta en el
      historial) y `resolution_notes` (reescribe el campo entero, así que se
      pueden inventar o borrar notas con autor). _Comprobado por mí el
      2026-09-28._
- [ ] **Checklist: el reinicio manual no funciona** — `resetRun` cierra el run y
      crea otro del mismo día, pero la clave única
      `uk_run (hotel_id, checklist_id, hotel_date)` lo impide: 500. Después
      `getOrCreateRun` devuelve el run cerrado y los cambios del día se escriben
      en él. Sin transacción ni test. En Aiven nadie lo ha usado (0 cierres
      manuales) y la pantalla no lo llama: decidido el 2026-10-11 dejar el
      endpoint como está; antes de usarlo, cambiar la clave única. _Comprobado
      el 2026-10-11._
- [ ] **Una sesión vieja rompe la app tras `setup:local`** — el admin nuevo
      tiene otro `id`, y un token anterior (el JWT no consulta la base) sigue
      leyendo pero falla al escribir (`fk_invoice_updated_by`). Backoffice, con
      datos cargados en el servidor, entra en bucle: 401 → `/login` →
      `/dashboard`. Con sesión nueva carga bien. Idea: admin con `id` fijo en
      `setup-local.ts`, o cerrar sesión tras instalar. _Hallado el 2026-11-26._
- [ ] **Parking: textos, notas y fechas por pulir** — todo hallado el 2026-11-26
      al quitar las tarifas automáticas:
  - `useBookingWizard.ts`: errores y avisos escritos en español a mano, sin
    traducción.
  - Notas: 500 caracteres al crear y 16 000 al editar.
  - «La entrada no puede ser en el pasado» usa el día del servidor (UTC) y no el
    de Madrid (ADR-047).
  - Dos pantallas para editar una reserva: el modal de `BookingsListClient` y
    `EditBookingModal` del detalle.
  - La salida sustituye las notas de la reserva por las «Observaciones» que se
    escriben en ella.
- [ ] **Pasar el portátil (`combo`) y Ubuntu (`stackbp`) a la BD local en Docker
      8.4** — cada equipo, con una sesión abierta allí (ADR-049). Los pasos
      están fuera del repositorio.

### 🟢 Baja

- [ ] **Artículo en el blog del portfolio sobre el motor de horarios** — cómo se
      modelaron los cuadrantes de recepción con OR-Tools (CP-SAT): reglas duras
      y blandas, bloques de noches, continuidad entre meses y el daemon de
      Python. Enlazar la demo y el repo. Es el gancho para promocionar el
      proyecto. Se escribe en el repo `portfolio-bp`, no aquí. _Decidido el
      2026-10-05._
- [ ] **`20260512_disable_demo_user.sql` desactivaría la cuenta demo** si se
      volviera a ejecutar
      (`UPDATE users SET is_active = 0 WHERE username = 'demo'`). `setup:local`
      no la ejecuta (es anterior al baseline); no aplicarla a mano. _Comprobado
      el 2026-10-05._
- [ ] **Conciliation: el cierre mensual no tiene pantalla ni congela los días**
      — `PATCH /monthly-summary/:year/:month/status` solo existe en la API
      (`useUpdateMonthlySummaryStatus` no lo usa ningún componente), y con el
      mes cerrado un admin puede reabrir o borrar cualquiera de sus días. La
      comprobación de que todos los días están cerrados va sin bloqueo. El dueño
      decidió el 2026-10-11 dejarlo así; si se le da pantalla, cerrar el mes
      debe bloquear sus días y comprobar con el mes bloqueado. _Comprobado el
      2026-10-11._
- [ ] **Zod 3 en el frontend y Zod 4 en el backend** (`^3.25.17` frente a
      `4.0.5`) — unificar si se llegan a compartir esquemas.
- [ ] **Ejecutor de tests en el frontend** — no tiene: sus tests viven en
      `backend/tests/` (10 ficheros: 7 importan funciones del frontend y 3 leen
      su código) y no cubren componentes ni hooks. _Contado el 2026-10-12._
- [ ] **Solver: el venv local no coincide con producción** — en el equipo
      principal corre Python 3.13.5 y `.python-version` fija 3.11, y no tiene
      `pytest`, así que la suite de Python no se puede lanzar. Recrearlo con
      3.11 e instalar `requirements.txt` + `pytest` (lo hace el dueño).
      _Comprobado el 2026-10-13._
- [ ] **Rutinas de la base sin uso** — de las 6 que quedan, la aplicación solo
      llama a `generate_availability` (desde `mock-data.sql`). Las otras 5 son
      código muerto en la base; quitarlas pide un script nuevo e idempotente.
      _Comprobado el 2026-11-26._
- [ ] **`mock-data.sql`: la reserva 3 tiene la entrada hoy a las 13:00** — antes
      de esa hora no se le puede hacer la salida (la validación acierta).
- [ ] **Aviso `DEP0123` al arrancar el backend** — Node no admite una IP como
      `ServerName` de TLS, y `REMOTE_DB_HOST` es una IP. No rompe nada y ya
      salía antes; se arregla usando un nombre de host. _Decidido el 2026-11-26
      dejarlo._
