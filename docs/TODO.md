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

Última fusión en `main`: 2026-10-14 (PR #29, commit de merge `47f77b9`). La rama
sigue siendo donde se arregla este fichero y se prueba en el entorno preview.

## Después de publicar

> Mejoras sin brecha de seguridad: lógica de negocio, rastro de cambios,
> carreras, operación, interfaz y calidad. Se trabajan en el repositorio
> público, sin plazo (ADR-033).

📦 **Errores conocidos admitidos:** 25 puntos que se aceptan y no se arreglan
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

- [ ] **Borrar los datos de prueba de Aiven** — la BD de producción solo tiene
      datos de prueba (incluidos usuarios de horarios con nombre de pila). Si el
      borrado se retrasa o se da acceso a gente de fuera, antes renombrarlos
      (`Empleado 01`…).
- [ ] **Maintenance: las fotos no se borran con el parte** — ya son privadas
      (solo la API las sirve), pero el borrado lógico no las toca,
      `auto_delete_on_close` se guarda y nadie lo usa, y subir o borrar fotos no
      queda en el historial. _Comprobado por mí el 2026-09-28._
- [ ] **Probar una restauración del backup de Aiven** antes de meter datos
      reales — Aiven hace copias automáticas y existe
      `backend/db-mysql/backup/backup.ps1`, pero no consta que se haya probado a
      restaurar ninguna. Del plan archivado (`Global-Plan.md`, H3-8).
- [ ] **Comprobar si los cron se ejecutan en Render** — corren dentro del
      proceso del backend; si el plan gratuito lo duerme por inactividad, no se
      disparan. _No comprobado._
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
      desincronizados: - El pool (`config/db.ts`) no fija `timezone` ni
      `dateStrings`: una columna `DATE` llega como instante a medianoche de
      Node. Con Node en Madrid, el 30/09 viaja como `2026-09-29T22:00:00Z`, y
      quien lo corta por la `T` se queda con el 29. Así, en local, cada edición
      de una factura le resta un día a sus fechas
      (`InvoiceFormModal.tsx:83-87`). Con Node en UTC sale bien. - Si Node y
      MySQL no están en la misma zona, los `DATETIME` se desplazan: con Node en
      UTC contra la MySQL local, `NOW()` sale 2 h movido (p. ej.
      `pnpm dev:aiven` desde un equipo en Madrid). - «Hoy» en UTC está mal entre
      las 00:00 y las 02:00 de Madrid: `toISOString()` en 26 sitios del frontend
      y 6 del backend, `CURDATE()`/`NOW()` en Aiven (19 consultas con
      `CURDATE()`: filtros de parking, código `PK-AAAAMMDD` del trigger,
      `CURRENT_TIMESTAMP`) y el identificador `DDMMAA-NNN` de Maintenance (fecha
      de Node). - 15 sitios del frontend cortan por la `T` fechas del servidor
      (grupos, lista negra, parking, horarios, checklist, caja, backoffice).

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
- [ ] **Checklist: el reinicio manual no funciona** — `resetRun` cierra el run y
      crea otro del mismo día, pero la clave única
      `uk_run (hotel_id, checklist_id, hotel_date)` lo impide: 500. Después
      `getOrCreateRun` devuelve el run cerrado y los cambios del día se escriben
      en él. Sin transacción ni test. En Aiven nadie lo ha usado (0 cierres
      manuales) y la pantalla no lo llama: decidido el 2026-10-11 dejar el
      endpoint como está; antes de usarlo, cambiar la clave única. _Comprobado
      el 2026-10-11._

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
- [ ] **Errores que aún llegan sin traducir** — los códigos del backend ya se
      traducen en el cliente (`app/lib/helpers/errorCodeMessage.ts`; un test
      exige texto en es y en para cada `ERROR_CODES.X` y cada `code: 'X'`).
      Quedan: las server actions de blacklist, groups y parking
      (`app/dashboard/*/actions/`, `app/lib/parking/actions.ts`) lanzan
      `errorData.error`, que es el código en crudo, y en el servidor no hay
      `document` para leer el idioma; unas 330 respuestas 4xx/5xx del backend
      llevan un texto fijo (casi siempre en español) y ningún `code`, así que en
      inglés se ven en español: scheduling ~135, maintenance ~56, parking ~59
      (`parking.controller.ts`, `stats.controller.ts` y los 400 de check-out,
      cancelar y no-show), cashier ~39, checklist ~20 y algunas de fnb, demo y
      search; el 409 del reinicio de la demo y el subtítulo del login
      (`login/page.tsx`) también van fijos en español. Ir módulo a módulo
      (B5.n). _Medido el 2026-10-12._
- [ ] **Conciliation: el cierre mensual no tiene pantalla ni congela los días**
      — `PATCH /monthly-summary/:year/:month/status` solo existe en la API
      (`useUpdateMonthlySummaryStatus` no lo usa ningún componente), y con el
      mes cerrado un admin puede reabrir o borrar cualquiera de sus días. La
      comprobación de que todos los días están cerrados va sin bloqueo. El dueño
      decidió el 2026-10-11 dejarlo así; si se le da pantalla, cerrar el mes
      debe bloquear sus días y comprobar con el mes bloqueado. _Comprobado el
      2026-10-11._
- [ ] **Parking: salto de precio a partir de 31 días** — las tarifas llegan a 30
      días (250 € en Aiven); a partir de 31 se cobran 15 €/día (465 €).
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
