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

## 🟢 Baja

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
