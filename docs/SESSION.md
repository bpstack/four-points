# SESSION — por dónde vamos

> **Qué responde:** dónde lo dejamos y qué toca después. · **Quién lo lee:**
> quien retome el trabajo. · **Cómo se poda:** se **sobrescribe** — git guarda
> la historia (`git log -p docs/SESSION.md`).

Lo que no encaje aquí es una decisión (a `DECISIONS.md`), un hallazgo (a su
propio fichero) o ruido (se borra).

**Última actualización:** 2026-09-28 · PC principal (`dz`)

---

## Estado

Preparación del repositorio para publicarlo como open source. Plan en
`OPEN-SOURCE.md` (raíz, sin versionar); orden de fases en `ROADMAP.md`;
decisiones en `DECISIONS.md` (ADR-001 a ADR-011).

Fase actual: **1 — Documentación nueva**. La documentación antigua ya está
archivada en `docs/_archive/` (ADR-010); lo hecho se registra en
`docs/_archive/roadmap-history.md` (local).

## ⚠️ Empieza por aquí

1. **Revisión de `docs/general/README.md` por el propietario.** Escrito el
   2026-09-28 tras leer el código de arranque, config, middlewares, auth, cron,
   notificaciones, mensajería, perfil, `proxy.ts`, i18n y proveedores del
   frontend. Tras el OK, sale del `ROADMAP.md`.
2. **Decidir qué hacer con los hallazgos** de la sección siguiente.
3. **Siguiente módulo** de la fase 1 en `ROADMAP.md`.
4. **Material de consulta:** `docs/_archive/` refleja las rutas originales
   (`docs/_archive/docs/backend/…`, `docs/_archive/frontend/docs/…`,
   `docs/_archive/Global-Plan.md`…).

## Hallazgos al escribir `docs/general/` (2026-09-28)

🔴 **Seguridad — resolver o sacar de aquí antes de publicar** (no están en la
documentación pública):

- **Un usuario desactivado o borrado sigue entrando**: ni `authenticateToken`
  ni `refreshToken` (`backend/controllers/auth/auth-controllers.ts`) consultan
  la BD, y cada renovación emite otro `refresh_token` de 7 días.
- **Access y refresh token son intercambiables**: mismo secreto y sin campo de
  tipo (`backend/services/auth/tokenService.ts`). Un `refresh_token` enviado
  como `Bearer` pasa `authenticateToken`, y un `access_token` sirve para
  renovar.
- **Los tokens también viajan en el cuerpo JSON**: `login` y `refresh`
  devuelven `token`, y `updateProfile` además `refreshToken`. Anula parte de la
  ventaja de las cookies HttpOnly.
- **La protección contra timing attacks del login puede no funcionar**:
  `DUMMY_HASH` (`backend/repositories/auth/user-repository.ts`) no es un hash
  bcrypt válido; si `bcrypt.compare` falla rápido, se puede distinguir un
  usuario inexistente. **No comprobado**: hay que medirlo.
- **Contraseñas de 6 caracteres mínimo** (`validations/auth/user-validation.ts`).

**Documentación y código desalineados:**

- **`CLAUDE.md` raíz dice que next-intl usa `routing.ts` + `createNavigation`**:
  no existe `routing.ts`; el idioma va por cookie `NEXT_LOCALE`, geolocalización
  de Vercel y `Accept-Language` (`frontend/app/i18n/request.ts`). También cita
  Nodemailer como externo, y no se usa (ver abajo).
- **`.env.example` desactualizados.** Backend: faltan `DB_ENVIRONMENT`,
  `LOG_LEVEL` y `FRONTEND_URL`; sobran `AI_ENABLED`, `CLAUDE_*` y `GEMINI_*`,
  que ningún código lee. Frontend: falta `NEXT_PUBLIC_APP_URL` y sobra
  `NEXT_PUBLIC_APP_NAME`, que no se usa.
- **`NEXT_PUBLIC_APP_URL` en producción**: si no está definida en Vercel, crear
  usuarios desde la UI devolvería `403 Origen no permitido`. No se puede
  comprobar desde aquí.
- **Comentario incorrecto** en `canAccessFnb` (`middlewares/roleCheck.ts`): no
  menciona `group-admin`, que sí tiene acceso.

**Código muerto** (candidato a un `chore:` aparte):

- `backend/services/group/email-service.ts` (Nodemailer): nadie lo importa.
- `frontend/app/api/auth/{login,logout,me,refresh}` y
  `_backup_httponly_cookies/`, más `app/lib/auth/cookieHandler.ts`: solo se usa
  `app/api/auth/register`.
- `app.set('view engine', 'ejs')` en `backend/index.ts`, sin `ejs` instalado.

**Para decidir antes de publicar:**

- **Licencia**: solo existe `frontend/LICENSE`, «MIT (Modified -
  Non-Commercial)». Una licencia no comercial no es open source según la OSI, y
  la raíz no tiene ninguna.
- **Analítica**: el frontend carga Google Analytics (`G-ZYSZ6THVDW`) y Vercel
  Analytics (`frontend/app/layout.tsx`).
- **Páginas de prueba públicas**: `/design-system` y `/fonts-test` no están
  protegidas por `proxy.ts`.
- **Mensajería interna** (~4 k líneas entre backend y frontend) está documentada
  dentro de `general/`. ¿Merece carpeta propia (`docs/messages/`)?
- **Cron en el plan gratuito de Render**: los trabajos corren dentro del proceso
  del backend; si Render lo duerme por inactividad, no se ejecutan. **No
  comprobado** en este repo.
- **Sin CI** (no hay `.github/`) y **sin tests en el frontend**.

## Esperando decisión

- **Volcados de BD en `main`: se deja para más adelante** (decisión del
  propietario, 2026-09-28). Cuatro ficheros versionados en `HEAD` y subidos al
  remoto privado:
  - `backend/db-mysql/backup/backup_hotel_db_aiven_20260226_010814.sql`
  - `backend/db-mysql/backup/backup_hotel_db_aiven_20260512_112814.sql`
  - `backend/db-mysql/backup/backup_hotel_db_local_20260226_011428.sql`
  - `backend/db-mysql/backup/backup_hotel_db_local_20260512_112901.sql`

  En el historial hay además `backup_hotel_db-aiven.sql` y
  `backup_hotel_db-local.sql`, ya borrados. Entraron en `dad3cdc`, `f5d47d6` y
  `7ac45e7`. **No se han abierto.** Se eliminan del historial en la fase 2.

- **ADR-006 (repo nuevo desde clon limpio)** sigue 🔶 propuesta.
- **¿Se publican los `CLAUDE.md` / `AGENTS.md`**, o se quitan antes de publicar?
- **Qué ramas se publican** además de `main`: `chore/audit-prep-sprint-0`,
  `feature/ai-schedule-generator`, `feature/auth-hardening`,
  `feature/observability-pino`. Sin tags. Se decide más adelante.

## Cuidado con esto

- **Nada de `docs/_archive/` se publica**, tampoco `roadmap-history.md`
  (ADR-009). Si algo de ahí debe ser público, se copia fuera.
- **El antiguo `TODO.md` de la raíz (ahora en `docs/_archive/TODO.md`) tiene
  una entrada local del PC `dz`** (_Mantenimiento local_: borrar los `.bak` de
  la limpieza de permisos): no debe pasar al `docs/TODO.md` público.
- **Enlaces rotos conocidos** tras archivar: `backend/README.md` (enlaces a
  `docs/backend/…`) y comentarios que citan `Global-Plan.md` o
  `SCHEDULING-SOLVER-PLAN.md`. Se arreglan al escribir cada módulo (ADR-010).
- **Candidatos a privados para la fase 2**, además de los volcados: los dos
  Excel archivados (`PLANNING 2026.xlsx`, `Presencias - Marzo.xlsx`),
  que siguen en el historial, y los 18 `.http` de `backend/API REST/`
  (peticiones de prueba; suelen llevar tokens o contraseñas). Ninguno abierto.
