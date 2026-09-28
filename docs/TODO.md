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

## 🔴 Alta

> Las entradas de **seguridad** describen debilidades explotables: **resolverlas
> o quitarlas de este fichero antes de publicar el repositorio**.

- [ ] **Scheduling: un recepcionista puede aprobarse sus propias solicitudes** —
      `PUT /constraints/:id` no pide `isAdmin` y `updateConstraintSchema` acepta
      `status: 'approved'` (sin `approved_by`). Al reiniciar o crear el mes,
      esas celdas quedan bloqueadas. _Comprobado por mí el 2026-09-28._
- [ ] **Scheduling: cualquier rol edita o borra restricciones ajenas o ya
      aprobadas** — sin comprobar autor ni estado y sin historial; al borrar una
      aprobada, la clave foránea (`SET NULL`, comprobado en Aiven) deja la celda
      con su código pero sin bloqueo. La interfaz es solo de `admin`: estas
      rutas abiertas no tienen uso legítimo. _Comprobado por mí el 2026-09-28._
      (sin historial, según el revisor)
- [ ] **Datos personales del personal en el repo** —
      `backend/scripts/import-planning-2026.ts` (commit `3387826`) tiene
      escritos 13 nombres de personal (2 con apellido) asociados a sus usuarios,
      tal como aparecen en el Excel `PLANNING 2026.xlsx`; en Aiven, 9 de los 10
      usuarios de horarios son nombres de pila. Revisar en la fase 2 junto con
      Clara y los Excel archivados. _Comprobado por mí el 2026-09-28._
- [ ] **Groups: inyección SQL en el orden del listado** — `sort` y `order` pasan
      de la URL a `ORDER BY g.${sortField} ${sortOrder}` sin filtrar
      (`group-repository.ts`). `GET /api/groups` lo alcanza cualquier rol que ve
      grupos, también `mantenimiento`: permite leer toda la BD, hashes de
      contraseñas incluidos. _Comprobado por mí el 2026-09-28._
- [ ] **Groups: inyección SQL por los nombres de campo en las ediciones** — los
      `PUT` de grupo, pago, contacto y habitación construyen `clave = ?` con las
      claves del cuerpo, y el controlador pasa el cuerpo entero. Un
      `group-admin` (o cualquiera que se haga admin) puede leer o escribir
      cualquier columna. _Comprobado por mí el 2026-09-28._ (pago, contacto y
      habitación, según el revisor)
- [ ] **Groups: ninguna ruta valida con Zod** — asignación masiva: por `PUT` se
      puede mover un pago a otro grupo, cambiar `created_by`, `status`,
      `amount_paid` o poner importes negativos. _Comprobado por mí el
      2026-09-28._ (casos concretos, según el revisor)
- [ ] **Maintenance: sin permisos dentro del módulo** — cualquier rol con acceso
      (también `mantenimiento` y `recepcionista`) crea, edita, cambia de estado,
      asigna, borra y restaura cualquier parte: el controlador no mira rol ni
      autoría. _Comprobado por mí el 2026-09-28._
- [ ] **Maintenance: los errores 500 devuelven el mensaje de MySQL** — 15
      respuestas con `message: error.message` en `maintenance-controller.ts`,
      saltándose el manejador global. Filtra tablas, columnas y claves foráneas,
      y sirve para saber si un id de usuario existe. _Comprobado por mí el
      2026-09-28._
- [ ] **Backoffice: el pago en lote paga todos los meses con un objeto** —
      `executeBatchPayment` pasa `year` y `month` del cuerpo sin validar. Si se
      envía un objeto en vez de un número, mysql2 lo convierte en una
      comparación de columna y la condición de fecha deja de filtrar
      (reproducido con `mysql2.format`): se pagan las facturas validadas de
      cualquier mes. `revertBatchPayment` lee el cuerpo igual (no seguido hasta
      el repositorio). _Comprobado por mí el 2026-09-28._
- [ ] **Contraseñas de la BD escritas en 17 ficheros versionados** — casi todos
      en `backend/db-mysql/scripts/` (los 10 de `basics/`,
      `add-libre-number.ts`, `backfill-libre-numbers.ts`,
      `set-holidays-2026.ts`, `backup-aiven.sh`, `backup-local.sh`,
      `check-collation.sh`, `recreate-local.sh`), 14 de ellos con el host de
      Aiven; más `backend/tests/auth/user-repository-login.test.ts` (usuario y
      contraseña de una cuenta de prueba) y dos scripts SQL con contraseñas en
      claro en comentarios (`20260520_insert_user_example.sql`,
      `20260512_add_scheduling_solver_runs_and_requests.sql`). Están en el
      historial desde `f5d47d6` y en el remoto privado. Sacarlos del historial
      en la fase 2 y rotar (ver la entrada de rotación). _Comprobado por mí el
      2026-09-28._
- [ ] **Cualquier usuario puede hacerse `admin`** — `PUT /api/users/:id` pasa
      `isOwnerOrAdmin` para el propio usuario y `updateUser`
      (`backend/controllers/auth/user-controllers.ts`) guarda el `role` del
      cuerpo. Tampoco pide la contraseña actual ni valida `email`. _Comprobado
      por mí el 2026-09-28._
- [ ] **El límite de intentos de login se esquiva** — la clave es
      `login-<ip>-<username tal cual>` (`backend/middlewares/rateLimiter.ts`) y
      `users` usa `utf8mb4_0900_ai_ci`: `admin`, `Admin` y `ádmin` son la misma
      cuenta con 5 intentos cada una. Además no hay límite por IP para probar
      muchas cuentas. _Comprobado por mí el 2026-09-28._
- [ ] **`mantenimiento` lee la lista negra por la búsqueda global** —
      `/api/search` solo exige sesión y devuelve `guest_name` y
      `document_number` de la lista negra, matrículas y grupos; `%` y `_` no se
      escapan (`?q=%%` lista lo último de cada módulo). `/api/activity` tiene el
      mismo hueco con menos datos. _Comprobado por mí el 2026-09-28._
- [ ] **Logbook: un comentario cambia la prioridad o el departamento de una
      entrada ajena** — si el comentario trae esos campos, el controlador
      actualiza la entrada sin comprobar autoría ni registrar el valor anterior.
      _Comprobado por mí el 2026-09-28._
- [ ] **Logbook: el historial no es atómico** — no hay ninguna transacción en el
      módulo: un fallo entre el cambio y su registro deja cambios sin auditar o
      borrados auditados que no ocurrieron. _Comprobado por mí el 2026-09-28._
- [ ] **Parking: doble reserva al cambiar fechas** — `PUT` solo comprueba la
      disponibilidad si cambia la plaza, y el trigger de cambio de fechas marca
      los días sin mirar si ya son de otra reserva; el de cambio de estado
      libera días sin comprobar que sean suyos. _Comprobado por mí el
      2026-09-28._ Lo de los triggers, según el revisor.
- [ ] **Parking: carrera al crear reserva y en la entrada** — las comprobaciones
      de disponibilidad son lecturas sin bloqueo: dos peticiones simultáneas
      pasan las dos. Y sin filas de calendario (tras el 2026-12-26) el control
      deja pasar cualquier reserva. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Parking: importes cobrados editables siempre** — `PUT` acepta
      `payment_amount`, método y referencia en cualquier estado (también
      `completed`), sin validar el signo y sin historial. _Comprobado por mí el
      2026-09-28._
- [ ] **Mensajería: un expulsado sigue editando y borrando sus mensajes** —
      `isSender` no comprueba que siga siendo participante. _Comprobado por mí
      el 2026-09-28._
- [ ] **Mensajería: directorio de emails y roles de toda la plantilla** —
      `GET /api/messages/users` devuelve `email` y rol de todos los usuarios
      activos, sin límite, a cualquier rol; `getParticipants` también devuelve
      emails y `last_read_at` ajenos. _Comprobado por mí el 2026-09-28._
- [ ] **Parking: el calendario de disponibilidad de producción se acaba el
      2026-12-26** — `parking_availability` en Aiven cubre del 2025-12-26 al
      2026-12-26 y nada lo amplía: no hay evento MySQL ni código que llame a
      `generate_availability`. Después de esa fecha no se bloquea ningún día y
      se pueden solapar reservas. _Comprobado el 2026-09-28 en ambas BD._
- [ ] **Rotar todas las credenciales al terminar la preparación** —
      `SECRET_JWT_KEY`, contraseñas de MySQL (local y Aiven), claves de
      Cloudinary, SMTP si se usa, y las claves de IA que siguen en
      `backend/.env` aunque ningún código las lea (`ANTHROPIC_API_KEY`,
      `CLAUDE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `MINIMAX_API_KEY`,
      `OPENAI_COMPAT_API_KEY`). El agente tuvo acceso a `.env`, BD y volcados
      desde el 2026-09-28 (ADR-014), y el repositorio ha contenido volcados de
      la BD (ADR-007).
- [ ] **Logbook: cualquiera puede crear entradas en nombre de otro** —
      `createLogbook` (`backend/controllers/logbook/logbook-controllers.ts`)
      guarda el `author_id` que manda el cliente, no `req.user.id`. Rompe la
      autoría y el historial del módulo. _Comprobado el 2026-09-28: el esquema
      Zod lo exige en el cuerpo y el frontend lo rellena con `user.id`._
- [ ] **Un usuario desactivado o borrado sigue entrando** — ni
      `authenticateToken` (`backend/middlewares/`) ni `refreshToken`
      (`backend/controllers/auth/auth-controllers.ts`) consultan la BD, y cada
      renovación emite otro `refresh_token` de 7 días. _Comprobado el 2026-09-28
      leyendo ambos: ninguno llama al repositorio de usuarios._
- [ ] **Access y refresh token son intercambiables** — mismo secreto y sin campo
      de tipo (`backend/services/auth/tokenService.ts`). Un `refresh_token`
      enviado como `Bearer` pasa `authenticateToken`, y un `access_token` sirve
      para renovar. _Comprobado el 2026-09-28: el payload de ambos es
      `{ id, username, role }`._
- [ ] **Los tokens también viajan en el cuerpo JSON** — `login` y `refresh`
      devuelven `token`, y `updateProfile` además `refreshToken`, lo que anula
      parte de la ventaja de las cookies HttpOnly. _Comprobado el 2026-09-28 en
      `auth-controllers.ts`._
- [ ] **Medir la protección contra timing attacks del login** — `DUMMY_HASH`
      (`backend/repositories/auth/user-repository.ts`) no es un hash bcrypt
      válido; si `bcrypt.compare` falla rápido, se distingue un usuario
      inexistente. _**No comprobado**: hay que medir tiempos de respuesta._

## 🟡 Media

- [ ] **Subir el mínimo de las contraseñas** — hoy son 6 caracteres
      (`backend/validations/auth/user-validation.ts`). _Comprobado el
      2026-09-28._
- [ ] **Corregir el `AGENTS.md` raíz sobre next-intl** — dice `routing.ts` +
      `createNavigation`, pero no existe `routing.ts`: el idioma va por cookie
      `NEXT_LOCALE`, geolocalización de Vercel y `Accept-Language`
      (`frontend/app/i18n/request.ts`). También cita Nodemailer como servicio
      externo y no se usa. _Comprobado el 2026-09-28._
- [ ] **Actualizar los `.env.example`** — backend: faltan `DB_ENVIRONMENT`,
      `LOG_LEVEL` y `FRONTEND_URL`; sobran `AI_ENABLED`, `CLAUDE_*` y
      `GEMINI_*`. Frontend: falta `NEXT_PUBLIC_APP_URL`; sobra
      `NEXT_PUBLIC_APP_NAME`. _Comprobado el 2026-09-28 contra los `process.env`
      del código versionado._
- [ ] **Confirmar `NEXT_PUBLIC_APP_URL` en Vercel** — sin ella, crear usuarios
      desde la UI devuelve `403 Origen no permitido`
      (`frontend/app/api/auth/register/route.ts`). _No se puede comprobar desde
      el repo._
- [ ] **Comprobar si los cron se ejecutan en Render** — corren dentro del
      proceso del backend; si el plan gratuito lo duerme por inactividad, no se
      disparan. _No comprobado._
- [ ] **Decidir la licencia antes de publicar** — solo existe
      `frontend/LICENSE`, «MIT (Modified - Non-Commercial)», que no es open
      source según la OSI, y la raíz no tiene ninguna.
- [ ] **Decidir la analítica antes de publicar** — el frontend carga Google
      Analytics (`G-ZYSZ6THVDW`) y Vercel Analytics (`frontend/app/layout.tsx`).
- [ ] **CI mínimo** — no hay `.github/`: instalar con lockfile congelado, lint,
      formato y tipos en cada push.

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

- [ ] **Corregir `backend/services/logbook/AGENTS.md`** — describe tres tablas
      (`logbook_solved`, `logbook_pending`, `logbook_comments_history`) que
      ningún script SQL crea y ningún código usa: resolver y reabrir escriben en
      columnas de `logbooks` (`is_solved`, `solved_at`, `solved_by`) y el
      historial de comentarios va a `logbook_history` con `type = 'comment'`.
      Además dice `is_deleted` (es `deleted_at`), `/api/logbook` (es
      `/api/logbooks`) y actualizaciones optimistas que `useLogbooks` no hace.
      _Comprobado el 2026-09-28 en el código, los `.sql` versionados, el
      historial de Git (los nombres solo aparecen en los commits de docs
      `568bc98` y `2be5df9`) y en las BD local y Aiven, donde solo existen
      `logbooks`, `logbook_comments`, `logbook_reads` y `logbook_history`._

- [ ] **Adaptar el harness a repos con varios proyectos e implantarlo** — en el
      repo `harness` (`C:\Users\dz\projects\harness` en el PC principal):
      soportar repos sin `package.json` ni lockfile en la raíz (aquí `frontend/`
      y `backend/` son dos proyectos pnpm independientes) y `AGENTS.md`
      anidados. Después, implantar la capa 1 en este repo. _Comprobado el
      2026-09-28 en `lib/detect.mjs` y `commands/init-project.md` del harness
      (ADR-017)._
- [ ] **Corregir los `AGENTS.md` de módulo** — la fusión (commit `4d7528f`) los
      renombró con el contenido intacto, así que siguen diciendo lo que el
      código desmiente (ver las entradas de logbook y parking en esta lista) y
      empiezan con el título `# CLAUDE.md — …`.
- [ ] **Comprobar que Claude Code carga los `AGENTS.md` de las subcarpetas** —
      los `CLAUDE.md` de módulo se borraron en vez de quedar como punteros; si
      Claude Code solo lee `CLAUDE.md` por directorio, ese contexto se pierde.
      _Sin comprobar._

- [ ] **Parking: borrar una reserva no libera sus días** — `DELETE` en
      `bookings.repository.ts` borra la fila, la clave foránea pone `booking_id`
      a `NULL` en `parking_availability`, pero `is_available` sigue a `0` y no
      hay trigger de borrado. Se puede hacer desde el detalle de una reserva
      `reserved`. _Comprobado el 2026-09-28: hoy hay 0 días bloqueados sin
      reserva en ambas BD._
- [ ] **MySQL de Aiven en UTC** — `time_zone=SYSTEM` con el sistema en UTC.
      `CURDATE()` y `NOW()` de la BD (filtros rápidos de parking, código
      `PK-AAAAMMDD` del trigger, `CURRENT_TIMESTAMP` de las tablas) van 1–2 h
      por detrás de Madrid: entre las 00:00 y las 02:00 «hoy» sigue siendo ayer.
      _Comprobado el 2026-09-28._
- [ ] **Parking: el mapa de estado deja de ver reservas a partir de 50** —
      `useParkingStatus` pide `getAllBookings({})` y el backend devuelve 50 por
      defecto, ordenadas por entrada prevista descendente: una estancia larga ya
      `checked_in` puede salir del mapa. _Latente: hoy hay 13 reservas en
      Aiven._
- [ ] **Corregir los `AGENTS.md` de parking** — backend: cita `parking_invoices`
      (no existe), omite `parking_availability` y los triggers, dice que la
      tarifa va por tipo de plaza (va por días), que 23:00→10:00 son 2 días (es
      1), que las acciones son `POST` (son `PUT`), que el código es `BK-0042`
      (es `PK-AAAAMMDD-NNNN`) y no documenta `DELETE /bookings/:code`. Frontend:
      afirma sondeo en el mapa y exportación del listado, que no existen.
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

- [ ] **Los cambios de rol y de contraseña no surten efecto** — el refresco
      copia el rol del token sin mirar la BD: quien pierde un rol lo conserva
      mientras siga renovando; cambiar la contraseña, `logout` o el reseteo por
      un `admin` no revocan nada. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Redirección abierta tras el login** — `useAuth.tsx` hace
      `router.push(callbackUrl)` sin comprobar que sea una ruta interna. _Según
      la revisión `security` L3 del 2026-09-28 (fichero y línea en el informe);
      no repasado por mí._ No probado en ejecución.
- [ ] **CSRF solo depende de `SameSite=Lax`** — sin token ni cabecera
      obligatoria; CORS acepta con credenciales cualquier `*.vercel.app`. No
      verificado si Render tiene `NODE_ENV=production` (sin él, las cookies
      salen sin `Secure`). _Según la revisión `security` L3 del 2026-09-28
      (fichero y línea en el informe); no repasado por mí._
- [ ] **El frontend no tiene Content-Security-Policy** (`frontend/vercel.json`).
      _Según la revisión `security` L3 del 2026-09-28 (fichero y línea en el
      informe); no repasado por mí._
- [ ] **Contraseñas en claro en el registro del modo demo** — `demoRestriction`
      guarda los primeros 500 caracteres del cuerpo, que en un cambio de
      contraseña bloqueado incluyen las contraseñas. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Logbook: papelera e historial solo ocultos en la pantalla** — el backend
      da `/trashed`, `include_trashed`, el historial y los comentarios de
      entradas borradas a cualquier rol con acceso. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Logbook: se pueden resolver, reabrir y marcar como leídas entradas
      borradas** — los `UPDATE` no filtran `deleted_at`. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Logbook: validación incompleta** — un mensaje de solo espacios se guarda
      vacío (verificado ejecutando Zod 4.0.5); la fecha admite cualquier día, y
      una imposible (`2026-02-31`) da 500; parámetros de ruta y un `offset`
      negativo sin validar. _Comprobado por mí el 2026-09-28._
- [ ] **Emails de más en las respuestas de logbook** — `author_email` en todos
      los listados y `editor_email` en el historial, que la pantalla no usa; el
      borrado copia la fila entera al historial. _Según la revisión `security`
      L3 del 2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Parking: rutas de edición sin Zod** — `updateBookingSchema` existe pero
      nadie lo usa; entrada y salida aceptan fechas reales arbitrarias. _Según
      la revisión `security` L3 del 2026-09-28 (fichero y línea en el informe);
      no repasado por mí._
- [ ] **Parking: `GET /vehicles` vuelca todos los vehículos** (matrícula y
      titular) sin paginar ni filtrar. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Parking: el origen y la referencia externa se pierden al crear** — el
      controlador los pasa como `source` y `external_id`, y la validación espera
      `booking_source` y `external_booking_id`: siempre queda `direct`.
      _Comprobado por mí el 2026-09-28._
- [ ] **Mensajería: sin validación de entrada ni transacción al crear** —
      `participant_ids` y `user_ids` sin comprobar (tipos, duplicados, usuarios
      inexistentes o inactivos); un id inválido deja una conversación huérfana.
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
- [ ] **Cualquier rol lanza a mano la generación de notificaciones** — la ruta
      usa `canViewGroups` (incluye `mantenimiento`); sin clave única, varias
      peticiones a la vez crean avisos duplicados. _Según la revisión `security`
      L3 del 2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **`direct_link` de las notificaciones admite cualquier URL** — un `admin`
      puede enviar un aviso que, al pulsarlo, lleva a una web externa. _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Cabeceras del frontend en producción incompletas para L3** — Vercel
      sirve HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` y
      `Permissions-Policy`, pero no CSP ni `Cross-Origin-Opener-Policy`; HSTS
      sin `preload`, Google Analytics sin SRI y anuncia `X-Powered-By: Next.js`.
      _Comprobado con `curl -I` el 2026-09-28._
- [ ] **Comprobar qué IP ve el backend (`trust proxy 1`)** — Render sirve sus
      aplicaciones a través de su propia red de Cloudflare (no es una
      configuración del proyecto: `stackbp.es` usa los DNS de `dns-parking.com`
      y `four-points.onrender.com` responde igual con `Server: cloudflare`). Con
      al menos dos intermediarios y `trust proxy 1` en `backend/index.ts`,
      `req.ip` podría ser la de un intermediario: los límites por IP (login
      incluido) mezclarían a usuarios distintos. _DNS y cabeceras comprobados el
      2026-09-28; el valor real de `req.ip`, no._
- [ ] **Datos de personas reales en el repo** —
      `20260520_insert_user_example.sql` crea a una empleada real con su periodo
      de trabajo (confirmado por el propietario el 2026-09-28): cambiar el
      nombre antes de publicar, en el script, en la BD y en el historial (fase
      2). Revisar si hay más nombres reales de personal en scripts, tests o
      datos de ejemplo.

- [ ] **Maintenance: la edición general se salta las reglas** — `PATCH /:id`
      admite `status` (sin fechas de inicio o cierre ni la acción correcta en el
      historial) y `resolution_notes` (reescribe el campo entero, así que se
      pueden inventar o borrar notas con autor). _Comprobado por mí el
      2026-09-28._
- [ ] **Maintenance: sin flujo de estados en el backend** — cualquier estado
      pasa a cualquier otro y un parte cerrado se reabre por la API. Cancelar se
      registra en el historial como «cerrado». _Comprobado por mí el
      2026-09-28._
- [ ] **Maintenance: partes borrados visibles y modificables** —
      `include_deleted` funciona para cualquier rol (la pantalla lo presenta
      como solo de administración), el detalle, las fotos y el historial de un
      parte borrado se leen, y se le pueden añadir notas y fotos. _Comprobado
      por mí el 2026-09-28._ (escrituras, según el revisor)
- [ ] **Maintenance: fotos públicas y que no se borran** — Cloudinary las sirve
      sin firmar, con un `public_id` predecible; el borrado lógico no las toca,
      `auto_delete_on_close` se guarda pero nadie lo usa, y subir o borrar fotos
      no queda en el historial. _Comprobado por mí el 2026-09-28._
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
- [ ] **Groups: dos rutas de pago no comprueban que el pago sea del grupo de la
      URL** (`updatePaymentStatus`, `updateAmountPaid`). _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Notificaciones manuales: destinatarios y textos sin validar** —
      cualquier id de usuario (inactivos incluidos), prioridad sin comprobar,
      título y mensaje sin límite; los errores devuelven el mensaje de MySQL.
      _Según la revisión `security` L3 del 2026-09-28 (fichero y línea en el
      informe); no repasado por mí._

- [ ] **Scheduling: generar un mes deja vacías las celdas de días fijos y
      solicitudes aprobadas** — el solver las recibe como bloqueadas, la
      generación no las reinserta y el borrado previo se las lleva. En Aiven, en
      los meses 126 y 130 (generados por el solver) el empleado con días fijos
      tiene 0 celdas. _Comprobado por mí el 2026-09-28._
- [ ] **Scheduling: datos de salud expuestos y guardados sin plazo** — bajas
      (`IT`, `E`) y sus notas visibles para todos los roles salvo
      `mantenimiento`; `scheduling_solver_runs` guarda para siempre la entrada
      completa (con las bajas de cada usuario) y un INFEASIBLE las vuelca al
      log. _Según la revisión `security` L3 del 2026-09-28 (fichero y línea en
      el informe); no repasado por mí._
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
- [ ] **Corregir los `AGENTS.md` de scheduling** — `PI` es «Personal
      Intervención» y `FO` «Formación» (no «Internal Support» ni «Day Off»); los
      pesos no están reflejados entre validador y solver (12 claves frente a 4,
      solo coincide `min_work_block_short`). _Comprobado por mí el 2026-09-28._

- [ ] **Checklist: el reinicio manual no funciona** — `resetRun` cierra el run y
      crea otro del mismo día, pero la clave única
      `uk_run (hotel_id,     checklist_id, hotel_date)` lo impide: 500. Después
      `getOrCreateRun` devuelve el run cerrado y los cambios del día se escriben
      en él. Sin transacción ni test. En Aiven nadie lo ha usado (0 cierres
      manuales). _Comprobado por mí el 2026-09-28._
- [ ] **Checklist: subida de imágenes sin límite de tamaño en multer** — el
      fichero entero se carga en memoria antes de comprobar los 5 MB: en el plan
      gratuito de Render puede agotar la memoria. _Comprobado por mí el
      2026-09-28._
- [ ] **Checklist: `:id` sin validar** — el backend lee
      `<carpeta de tareas>/<id>.json` con el id decodificado (path traversal
      limitado a ficheros `.json`, sin devolver su contenido), y cualquier id
      inventado crea una fila en `checklist_runs`. _Según la revisión `security`
      L3 del 2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Checklist: borrar comentarios e imágenes de días cerrados** — el autor
      puede reescribir el histórico, y el evento se registra en el run de hoy y
      como si fuera una alta. _Según la revisión `security` L3 del 2026-09-28
      (fichero y línea en el informe); no repasado por mí._

## 🟢 Baja

- [ ] **Checklist: comentarios e imágenes no comprueban que el paso exista**
      (solo marcar lo hace). _Comprobado por mí el 2026-09-28._
- [ ] **Checklist: `checklist_config` existe pero no se usa.** _Comprobado por
      mí el 2026-09-28._
- [ ] **Checklist: fechas de `/history` sin validar** (un parámetro repetido da
      500), respuestas con campos internos (`user_id`, `public_id`) y
      `checklist-report.ts` imprime los comentarios sin filtrar caracteres de
      control. _Según la revisión `security` L3 del 2026-09-28 (fichero y línea
      en el informe); no repasado por mí._
- [ ] **Corregir el `AGENTS.md` de checklist** — la validación de pasos está al
      revés (se valida al marcar, no en comentarios ni imágenes) y las tablas se
      llaman `checklist_step_comments` y `checklist_step_attachments`.
      _Comprobado por mí el 2026-09-28._
- [ ] **Scheduling: reiniciar un mes no usa transacción** — si falla a mitad, el
      mes queda vacío. _Comprobado por mí el 2026-09-28._
- [ ] **Scheduling: comprobar si `LI` debe contar como descanso en el solver** —
      falta en `REST_SHIFTS` de `rest.py`. _Sin comprobar su efecto._
- [ ] **Scheduling: validación incompleta** — ediciones masivas sin límite de
      tamaño, listas de empleados validadas a mano, `day_id` de otro mes
      aceptado y comprobación de bloqueo fuera de transacción. _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Scheduling: el daemon del solver puede quedar bloqueado** — el semáforo
      se retiene durante el arranque (hasta 30 min) con cola sin límite. _Según
      la revisión `security` L3 del 2026-09-28 (fichero y línea en el informe);
      no repasado por mí._
- [ ] **Scheduling: errores del solver y del arranque devueltos al cliente.**
      _Según la revisión `security` L3 del 2026-09-28 (fichero y línea en el
      informe); no repasado por mí._
- [ ] **Importador del Excel** — borra también las celdas bloqueadas, sin
      transacción ni comprobar si el mes está publicado. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Groups: recordatorios repetidos cada 48 h** — los de pago se buscan en
      un rango de días y se deduplican por título en una ventana de 48 h: el
      mismo pago se vuelve a avisar con «vence en 15 días» aunque falten 2, y
      los vencidos se repiten sin fin. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Groups: `limit` del historial sin cota.** _Según la revisión `security`
      L3 del 2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Groups: contactos (email y teléfono) visibles para todos los roles**,
      también `mantenimiento` (ASVS L3: solo los datos mínimos). _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Maintenance: identificador `DDMMAA-NNN` frágil** — se calcula leyendo el
      último del día (dos altas a la vez chocan y dan 500) con la hora del
      servidor; a partir del parte 1000 del día el id no cumple el formato y el
      parte queda inaccesible. _Comprobado por mí el 2026-09-28._ (el límite de
      1000, según el revisor)
- [ ] **Maintenance: validación incompleta** — textos largos sin `.max()`
      (descripción, notas) que acaban en 500, `deleteImage` sin validar
      parámetros y el límite de 5 fotos se salta subiendo en paralelo. _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Maintenance: `public_id` con el nombre original sin sanear.** _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Informes: la sección de mantenimiento filtra por estados que no
      existen** — `MaintenanceSection.tsx` envía `pending` y `resolved`, que el
      backend rechaza. _Según la revisión `security` L3 del 2026-09-28 (fichero
      y línea en el informe); no repasado por mí._
- [ ] **Maintenance: comprobar si Cloudinary quita los metadatos EXIF/GPS** de
      las fotos. _Sin comprobar._
- [ ] **El API no envía `Cache-Control: no-store`** — afecta a lista negra, caja
      y PDFs de facturas. _Comprobado con `curl` el 2026-09-28._
- [ ] **`apiClient` escribe cada URL en la consola en producción** — la búsqueda
      de lista negra manda el documento (DNI) en la URL, que acaba en consola y
      en logs de acceso. _Según la revisión `security` L3 del 2026-09-28
      (fichero y línea en el informe); no repasado por mí._
- [ ] **`apiClient` intenta borrar desde JS cookies HttpOnly** — no hace nada:
      si el refresco falla, redirige a `/login` con la sesión viva. _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **El controlador de notificaciones devuelve `error.message` de MySQL** al
      cliente. _Según la revisión `security` L3 del 2026-09-28 (fichero y línea
      en el informe); no repasado por mí._
- [ ] **Un preflight CORS rechazado responde 500** y deja un error en el log por
      intento. _Comprobado con `curl` el 2026-09-28._
- [ ] **Ids sin codificar en las URL de `blacklistApi.ts`** (informativo).
      _Según la revisión `security` L3 del 2026-09-28 (fichero y línea en el
      informe); no repasado por mí._
- [ ] **Procedimientos de BD sin uso** — de las 2 funciones y 5 procedimientos
      de parking, el código solo llama a `check_availability`; el resto
      (incluido `generate_availability`, que amplía el calendario) no los usa
      nadie. _Comprobado por mí el 2026-09-28._
- [ ] **Certificado de Aiven duplicado** — en `backend/db-mysql/aiven/` y en
      `backend/config/certs/`. _Comprobado por mí el 2026-09-28._
- [ ] **JWT sin algoritmo fijado** — `jwt.verify` sin `algorithms`, `issuer` ni
      `audience`; hoy no explotable con jsonwebtoken 9. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Configuración débil sin control al arrancar** — no se comprueba la
      longitud de `SECRET_JWT_KEY` ni un mínimo de `SALT_ROUNDS`. _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Comprobación de origen débil en `/api/auth/register`** — usa
      `startsWith` y deja pasar peticiones sin `Origin`. _Según la revisión
      `security` L3 del 2026-09-28 (fichero y línea en el informe); no repasado
      por mí._
- [ ] **Datos sensibles en los logs** — usernames de logins fallidos, `redact`
      de un solo nivel y, probablemente, `err.sql` de mysql2 con los valores
      (textos, matrículas, hashes). _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._ No
      verificado en ejecución.
- [ ] **Parking: `listAvailableSpots` devuelve el mensaje de error de MySQL** al
      cliente. _Según la revisión `security` L3 del 2026-09-28 (fichero y línea
      en el informe); no repasado por mí._
- [ ] **Parking: cambiar solo la planta puede mover la reserva a otra plaza** —
      usa el id de la plaza como número. _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Logbook: comentarios borrados que se pueden editar y volver a borrar**,
      y un historial que registra cada comentario dos veces y cada lectura sin
      límite. _Según la revisión `security` L3 del 2026-09-28 (fichero y línea
      en el informe); no repasado por mí._
- [ ] **Mensajería: `limit` sin validar, `LIKE` sin escapar y fallo de la
      búsqueda FULLTEXT silenciado.** _Según la revisión `security` L3 del
      2026-09-28 (fichero y línea en el informe); no repasado por mí._
- [ ] **Registrar decisiones de autorización** — ni los 403 ni los accesos de un
      `admin` a conversaciones ajenas quedan en el log (ASVS L3). _Según la
      revisión `security` L3 del 2026-09-28 (fichero y línea en el informe); no
      repasado por mí._
- [ ] **Parking: código sin uso** — los 4 endpoints de
      `/api/parking/stats/analytics` no los llama la interfaz; `getOccupancy`
      (`frontend/app/lib/parking/queries.ts`) apunta a `/stats/occupancy`, que
      no existe, y nadie la llama;
      `backend/services/parking/invoicePdfService.ts` está entero comentado.
- [ ] **Parking: salto de precio a partir de 31 días** — las tarifas llegan a 30
      días (250 € en Aiven); a partir de 31 se cobran 15 €/día (465 €).
- [ ] **Parking: el mapa de estado no se refresca solo** — los cambios de otro
      usuario no aparecen hasta recargar.
- [ ] **Logbook: editar una entrada ajena devuelve 500** — el servicio lanza un
      `Error` genérico y el controlador responde `500` en vez de `403`.
- [ ] **Logbook: comprobación de `isAdmin` que nunca se cumple** — los
      controladores de comentarios leen `req.user.isAdmin`, que
      `authenticateToken` no rellena. Quitarla o decidir si el `admin` puede
      editar comentarios ajenos.
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
- [ ] **Notificaciones de mensajes con `module: 'system'`** — el enum de
      notificaciones no incluye `messages` y el controlador lo fuerza con
      `as any` (`backend/controllers/messages/message-controller.ts`).
- [ ] **Quitar código muerto** (en un `chore:` aparte) —
      `backend/services/group/email-service.ts` (nadie lo importa);
      `frontend/app/api/auth/{login,logout,me,refresh}` y
      `_backup_httponly_cookies/`, más `frontend/app/lib/auth/cookieHandler.ts`
      (solo se usa `app/api/auth/register`); `app.set('view engine', 'ejs')` en
      `backend/index.ts`, sin `ejs` instalado. _Comprobado el 2026-09-28 con
      búsqueda de imports._
- [ ] **Proteger o quitar `/design-system` y `/fonts-test`** — son páginas de
      prueba y `proxy.ts` no las protege.
- [ ] **Corregir el comentario de `canAccessFnb`**
      (`backend/middlewares/roleCheck.ts`) — no menciona `group-admin`, que sí
      tiene acceso.
- [ ] **Tests en el frontend** — hoy no hay ninguno.
