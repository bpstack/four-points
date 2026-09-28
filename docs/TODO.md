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

> Seguridad. **Resolver o quitar de este fichero antes de publicar el
> repositorio**: describen debilidades explotables.

- [ ] **Rotar todas las credenciales al terminar la preparación** —
      `SECRET_JWT_KEY`, contraseñas de MySQL (local y Aiven), claves de
      Cloudinary, SMTP si se usa, y las claves de IA que siguen en
      `backend/.env` aunque ningún código las lea (`ANTHROPIC_API_KEY`,
      `CLAUDE_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `MINIMAX_API_KEY`,
      `OPENAI_COMPAT_API_KEY`). El agente tuvo acceso a `.env`, BD y
      volcados desde el 2026-09-28 (ADR-014), y el repositorio ha contenido
      volcados de la BD (ADR-007).
- [ ] **Logbook: cualquiera puede crear entradas en nombre de otro** —
      `createLogbook` (`backend/controllers/logbook/logbook-controllers.ts`)
      guarda el `author_id` que manda el cliente, no `req.user.id`. Rompe la
      autoría y el historial del módulo. _Comprobado el 2026-09-28: el esquema
      Zod lo exige en el cuerpo y el frontend lo rellena con `user.id`._
- [ ] **Un usuario desactivado o borrado sigue entrando** — ni
      `authenticateToken` (`backend/middlewares/`) ni `refreshToken`
      (`backend/controllers/auth/auth-controllers.ts`) consultan la BD, y cada
      renovación emite otro `refresh_token` de 7 días. _Comprobado el
      2026-09-28 leyendo ambos: ninguno llama al repositorio de usuarios._
- [ ] **Access y refresh token son intercambiables** — mismo secreto y sin campo
      de tipo (`backend/services/auth/tokenService.ts`). Un `refresh_token`
      enviado como `Bearer` pasa `authenticateToken`, y un `access_token` sirve
      para renovar. _Comprobado el 2026-09-28: el payload de ambos es
      `{ id, username, role }`._
- [ ] **Los tokens también viajan en el cuerpo JSON** — `login` y `refresh`
      devuelven `token`, y `updateProfile` además `refreshToken`, lo que anula
      parte de la ventaja de las cookies HttpOnly. _Comprobado el 2026-09-28
      en `auth-controllers.ts`._
- [ ] **Medir la protección contra timing attacks del login** — `DUMMY_HASH`
      (`backend/repositories/auth/user-repository.ts`) no es un hash bcrypt
      válido; si `bcrypt.compare` falla rápido, se distingue un usuario
      inexistente. _**No comprobado**: hay que medir tiempos de respuesta._

## 🟡 Media

- [ ] **Subir el mínimo de las contraseñas** — hoy son 6 caracteres
      (`backend/validations/auth/user-validation.ts`). _Comprobado el
      2026-09-28._
- [ ] **Corregir el `CLAUDE.md` raíz sobre next-intl** — dice `routing.ts` +
      `createNavigation`, pero no existe `routing.ts`: el idioma va por cookie
      `NEXT_LOCALE`, geolocalización de Vercel y `Accept-Language`
      (`frontend/app/i18n/request.ts`). También cita Nodemailer como servicio
      externo y no se usa. _Comprobado el 2026-09-28._
- [ ] **Actualizar los `.env.example`** — backend: faltan `DB_ENVIRONMENT`,
      `LOG_LEVEL` y `FRONTEND_URL`; sobran `AI_ENABLED`, `CLAUDE_*` y
      `GEMINI_*`. Frontend: falta `NEXT_PUBLIC_APP_URL`; sobra
      `NEXT_PUBLIC_APP_NAME`. _Comprobado el 2026-09-28 contra los
      `process.env` del código versionado._
- [ ] **Confirmar `NEXT_PUBLIC_APP_URL` en Vercel** — sin ella, crear usuarios
      desde la UI devuelve `403 Origen no permitido`
      (`frontend/app/api/auth/register/route.ts`). _No se puede comprobar
      desde el repo._
- [ ] **Comprobar si los cron se ejecutan en Render** — corren dentro del
      proceso del backend; si el plan gratuito lo duerme por inactividad, no se
      disparan. _No comprobado._
- [ ] **Decidir la licencia antes de publicar** — solo existe `frontend/LICENSE`,
      «MIT (Modified - Non-Commercial)», que no es open source según la OSI, y
      la raíz no tiene ninguna.
- [ ] **Decidir la analítica antes de publicar** — el frontend carga Google
      Analytics (`G-ZYSZ6THVDW`) y Vercel Analytics
      (`frontend/app/layout.tsx`).
- [ ] **CI mínimo** — no hay `.github/`: instalar con lockfile congelado, lint,
      formato y tipos en cada push.

- [ ] **Avisar a los usuarios de que un `admin` puede leer sus mensajes** —
      `getConversation` y `getMessages`
      (`backend/controllers/messages/`) dejan leer cualquier conversación al
      rol `admin`, aunque no participe. Decidir si se mantiene y, si es así,
      decirlo en la interfaz. _Comprobado el 2026-09-28._
- [ ] **La retención de mensajes borra las conversaciones vacías** — el evento
      MySQL `cleanup_old_messages` borra cada día, además de los mensajes de más
      de 90 días, toda conversación sin mensajes, incluidas las recién creadas y
      aún sin estrenar. _Comprobado el 2026-09-28 en local y Aiven:
      `event_scheduler=ON` y el evento está `ENABLED` (última ejecución en
      Aiven: 2026-09-27)._

- [ ] **Corregir `backend/services/logbook/CLAUDE.md`** — describe tres tablas
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

## 🟢 Baja

- [ ] **Logbook: editar una entrada ajena devuelve 500** — el servicio lanza un
      `Error` genérico y el controlador responde `500` en vez de `403`.
- [ ] **Logbook: comprobación de `isAdmin` que nunca se cumple** — los
      controladores de comentarios leen `req.user.isAdmin`, que
      `authenticateToken` no rellena. Quitarla o decidir si el `admin` puede
      editar comentarios ajenos.
- [ ] **Logbook: papelera y filtros sin interfaz** — `/trashed`, `/author`,
      `/department` y `/priority` existen en el backend y en
      `queries.ts`, pero la pantalla del módulo no los usa (Informes usa
      `/all` con filtros). Tampoco hay forma de restaurar lo borrado.
- [ ] **Panel de inicio: una petición por día** — con el periodo _mes_ lanza
      hasta 31 peticiones a `/api/logbooks/day/` (`frontend/app/dashboard/page.tsx`);
      `/all?date_from=&date_to=` lo haría en una.
- [ ] **Mensajería: exponer en la interfaz lo que el backend ya ofrece** —
      renombrar grupo, añadir y quitar participantes, buscar en mensajes,
      contador global de no leídos y vista de todas las conversaciones para
      `admin`. Las funciones existen en `frontend/app/lib/messaging/queries.ts`
      pero nadie las llama. _Comprobado el 2026-09-28 con búsqueda de usos._
- [ ] **Mensajería sin tiempo real** — los mensajes nuevos solo aparecen al
      reabrir la conversación. Valorar un sondeo periódico como el de las
      notificaciones. _Comprobado el 2026-09-28: no hay intervalo ni
      WebSocket._
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
